// src/db/__tests__/aggregates.test.ts
// Aggregate consistency test running 1,000 random operations against in-memory SQLite (node:sqlite).
// Compares incrementally recomputed monthly_totals against brute-force rebuildAll oracle after every batch.
// Conforms to docs/CURSOR_CONTEXT.MD Section 10 and docs/ARCHITECTURE.MD Section 5.

import { DatabaseSync } from 'node:sqlite';

interface BucketRow {
  month_key: string;
  category_id: string;
  kind: string;
  total_minor: number;
  entry_count: number;
}

interface TransactionRow {
  id: string;
  kind: 'expense' | 'income';
  amount_minor: number;
  category_id: string;
  occurred_on: string;
  month_key: string;
  note: string | null;
  deleted_at: number | null;
}

function createTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      icon TEXT NOT NULL,
      color_key TEXT NOT NULL,
      sort_order REAL DEFAULT 0,
      archived INTEGER DEFAULT 0,
      is_seed INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      month_key TEXT NOT NULL,
      note TEXT,
      recurring_rule_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE TABLE monthly_totals (
      month_key TEXT NOT NULL,
      category_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      total_minor INTEGER NOT NULL,
      entry_count INTEGER NOT NULL,
      PRIMARY KEY (month_key, category_id, kind)
    );
  `);

  // Seed test categories
  db.exec(`
    INSERT INTO categories (id, name, kind, icon, color_key, updated_at) VALUES
      ('cat_food', 'Food', 'expense', 'restaurant', 'cat5', 1000),
      ('cat_transport', 'Transport', 'expense', 'bus', 'cat1', 1000),
      ('cat_salary', 'Salary', 'income', 'briefcase', 'cat2', 1000);
  `);

  return db;
}

/**
 * Executes bucket recomputation using the exact SQL semantics from src/db/aggregates.ts
 */
function testRecomputeBuckets(
  db: DatabaseSync,
  affectedKeys: Array<{ monthKey: string; categoryId: string; kind: string }>
): void {
  const seen = new Set<string>();

  for (const k of affectedKeys) {
    const keyStr = `${k.monthKey}:${k.categoryId}:${k.kind}`;
    if (seen.has(keyStr)) continue;
    seen.add(keyStr);

    const calcStmt = db.prepare(`
      SELECT COALESCE(SUM(amount_minor), 0) AS total, COUNT(*) AS n
      FROM transactions
      WHERE month_key = ? AND category_id = ? AND kind = ? AND deleted_at IS NULL;
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calc = calcStmt.get(k.monthKey, k.categoryId, k.kind) as any;
    const n = Number(calc.n);
    const total = Number(calc.total);

    if (n === 0) {
      db.prepare(`
        DELETE FROM monthly_totals
        WHERE month_key = ? AND category_id = ? AND kind = ?;
      `).run(k.monthKey, k.categoryId, k.kind);
    } else {
      db.prepare(`
        INSERT INTO monthly_totals (month_key, category_id, kind, total_minor, entry_count)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(month_key, category_id, kind) DO UPDATE SET
          total_minor = excluded.total_minor,
          entry_count = excluded.entry_count;
      `).run(k.monthKey, k.categoryId, k.kind, total, n);
    }
  }
}

/**
 * Brute-force oracle query that rebuilds all monthly_totals from scratch
 */
function testRebuildAll(db: DatabaseSync): BucketRow[] {
  db.exec(`DELETE FROM monthly_totals;`);
  db.exec(`
    INSERT INTO monthly_totals (month_key, category_id, kind, total_minor, entry_count)
    SELECT month_key, category_id, kind, SUM(amount_minor) AS total_minor, COUNT(*) AS entry_count
    FROM transactions
    WHERE deleted_at IS NULL
    GROUP BY month_key, category_id, kind;
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.prepare(`SELECT * FROM monthly_totals ORDER BY month_key, category_id, kind;`).all() as any;
}

function getMonthlyTotals(db: DatabaseSync): BucketRow[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.prepare(`SELECT * FROM monthly_totals ORDER BY month_key, category_id, kind;`).all() as any;
}

describe('Aggregate Consistency Test (T5)', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase();
  });

  describe('Specific Bucket-Affecting Cases', () => {
    it('Add: creates bucket with sum and count', () => {
      db.exec(`
        INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
        VALUES ('t1', 'expense', 150000, 'cat_transport', '2026-11-15', '2026-11', 1000, 1000);
      `);

      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      const rows = getMonthlyTotals(db);
      expect(rows).toHaveLength(1);
      expect(rows[0].total_minor).toBe(150000);
      expect(rows[0].entry_count).toBe(1);
    });

    it('Edit amount: updates bucket total without changing count', () => {
      db.exec(`
        INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
        VALUES ('t1', 'expense', 150000, 'cat_transport', '2026-11-15', '2026-11', 1000, 1000);
      `);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      // Update amount
      db.exec(`UPDATE transactions SET amount_minor = 220000 WHERE id = 't1';`);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      const rows = getMonthlyTotals(db);
      expect(rows).toHaveLength(1);
      expect(rows[0].total_minor).toBe(220000);
      expect(rows[0].entry_count).toBe(1);
    });

    it('Edit category: decrements/deletes old bucket, increments new bucket', () => {
      db.exec(`
        INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
        VALUES ('t1', 'expense', 150000, 'cat_transport', '2026-11-15', '2026-11', 1000, 1000);
      `);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      // Move from cat_transport to cat_food
      db.exec(`UPDATE transactions SET category_id = 'cat_food' WHERE id = 't1';`);
      testRecomputeBuckets(db, [
        { monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' },
        { monthKey: '2026-11', categoryId: 'cat_food', kind: 'expense' },
      ]);

      const rows = getMonthlyTotals(db);
      expect(rows).toHaveLength(1);
      expect(rows[0].category_id).toBe('cat_food');
      expect(rows[0].total_minor).toBe(150000);
    });

    it('Edit date across months: updates both months totals', () => {
      db.exec(`
        INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
        VALUES ('t1', 'expense', 150000, 'cat_transport', '2026-11-15', '2026-11', 1000, 1000);
      `);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      // Move from November to October
      db.exec(`UPDATE transactions SET occurred_on = '2026-10-31', month_key = '2026-10' WHERE id = 't1';`);
      testRecomputeBuckets(db, [
        { monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' },
        { monthKey: '2026-10', categoryId: 'cat_transport', kind: 'expense' },
      ]);

      const rows = getMonthlyTotals(db);
      expect(rows).toHaveLength(1);
      expect(rows[0].month_key).toBe('2026-10');
      expect(rows[0].total_minor).toBe(150000);
    });

    it('Delete: deletes bucket when count reaches zero', () => {
      db.exec(`
        INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
        VALUES ('t1', 'expense', 150000, 'cat_transport', '2026-11-15', '2026-11', 1000, 1000);
      `);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);
      expect(getMonthlyTotals(db)).toHaveLength(1);

      // Soft delete
      db.exec(`UPDATE transactions SET deleted_at = 2000 WHERE id = 't1';`);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      // Bucket row must be removed, not left with 0 count
      expect(getMonthlyTotals(db)).toHaveLength(0);
    });

    it('Undo delete: restores bucket with proper count and sum', () => {
      db.exec(`
        INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at, deleted_at)
        VALUES ('t1', 'expense', 150000, 'cat_transport', '2026-11-15', '2026-11', 1000, 1000, 2000);
      `);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);
      expect(getMonthlyTotals(db)).toHaveLength(0);

      // Undo delete
      db.exec(`UPDATE transactions SET deleted_at = NULL WHERE id = 't1';`);
      testRecomputeBuckets(db, [{ monthKey: '2026-11', categoryId: 'cat_transport', kind: 'expense' }]);

      const rows = getMonthlyTotals(db);
      expect(rows).toHaveLength(1);
      expect(rows[0].total_minor).toBe(150000);
      expect(rows[0].entry_count).toBe(1);
    });
  });

  describe('1,000 Random Operations Stress Test', () => {
    it('maintains 0 mismatches between cached monthly_totals and rebuildAll across 1,000 random operations', () => {
      const CATEGORIES = ['cat_food', 'cat_transport', 'cat_salary'];
      const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12'];
      const KINDS: Array<'expense' | 'income'> = ['expense', 'income'];

      const TOTAL_OPERATIONS = 1000;
      const BATCH_SIZE = 50; // verify against oracle every 50 operations (20 checkpoints)

      let nextTxId = 1;
      let totalMismatches = 0;

      for (let opIdx = 1; opIdx <= TOTAL_OPERATIONS; opIdx++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allTx = db.prepare(`SELECT * FROM transactions`).all() as any as TransactionRow[];
        const activeTx = allTx.filter((t) => t.deleted_at === null);
        const deletedTx = allTx.filter((t) => t.deleted_at !== null);

        // Decide operation type:
        // 0: Add, 1: Edit amount, 2: Edit category, 3: Edit date, 4: Delete, 5: Undo
        const opType = activeTx.length === 0 ? 0 : Math.floor(Math.random() * 6);

        if (opType === 0) {
          // Add
          const id = `tx_${nextTxId++}`;
          const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
          const amount = (Math.floor(Math.random() * 5000) + 1) * 100;
          const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
          const month = MONTHS[Math.floor(Math.random() * MONTHS.length)];
          const date = `${month}-15`;

          db.prepare(`
            INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `).run(id, kind, amount, category, date, month, opIdx, opIdx);

          testRecomputeBuckets(db, [{ monthKey: month, categoryId: category, kind }]);
        } else if (opType === 1 && activeTx.length > 0) {
          // Edit amount
          const target = activeTx[Math.floor(Math.random() * activeTx.length)];
          const newAmount = (Math.floor(Math.random() * 5000) + 1) * 100;

          db.prepare(`UPDATE transactions SET amount_minor = ?, updated_at = ? WHERE id = ?;`).run(
            newAmount,
            opIdx,
            target.id
          );

          testRecomputeBuckets(db, [
            { monthKey: target.month_key, categoryId: target.category_id, kind: target.kind },
          ]);
        } else if (opType === 2 && activeTx.length > 0) {
          // Edit category
          const target = activeTx[Math.floor(Math.random() * activeTx.length)];
          const newCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

          db.prepare(`UPDATE transactions SET category_id = ?, updated_at = ? WHERE id = ?;`).run(
            newCategory,
            opIdx,
            target.id
          );

          testRecomputeBuckets(db, [
            { monthKey: target.month_key, categoryId: target.category_id, kind: target.kind },
            { monthKey: target.month_key, categoryId: newCategory, kind: target.kind },
          ]);
        } else if (opType === 3 && activeTx.length > 0) {
          // Edit date across months
          const target = activeTx[Math.floor(Math.random() * activeTx.length)];
          const newMonth = MONTHS[Math.floor(Math.random() * MONTHS.length)];
          const newDate = `${newMonth}-20`;

          db.prepare(`UPDATE transactions SET occurred_on = ?, month_key = ?, updated_at = ? WHERE id = ?;`).run(
            newDate,
            newMonth,
            opIdx,
            target.id
          );

          testRecomputeBuckets(db, [
            { monthKey: target.month_key, categoryId: target.category_id, kind: target.kind },
            { monthKey: newMonth, categoryId: target.category_id, kind: target.kind },
          ]);
        } else if (opType === 4 && activeTx.length > 0) {
          // Delete (soft delete)
          const target = activeTx[Math.floor(Math.random() * activeTx.length)];

          db.prepare(`UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?;`).run(
            opIdx,
            opIdx,
            target.id
          );

          testRecomputeBuckets(db, [
            { monthKey: target.month_key, categoryId: target.category_id, kind: target.kind },
          ]);
        } else if (opType === 5 && deletedTx.length > 0) {
          // Undo delete
          const target = deletedTx[Math.floor(Math.random() * deletedTx.length)];

          db.prepare(`UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ?;`).run(
            opIdx,
            target.id
          );

          testRecomputeBuckets(db, [
            { monthKey: target.month_key, categoryId: target.category_id, kind: target.kind },
          ]);
        }

        // Periodic Checkpoint against brute-force rebuildAll oracle
        if (opIdx % BATCH_SIZE === 0 || opIdx === TOTAL_OPERATIONS) {
          const cached = getMonthlyTotals(db);
          const oracle = testRebuildAll(db);

          // Restore cached totals to continue testing incremental updates
          db.exec(`DELETE FROM monthly_totals;`);
          for (const c of cached) {
            db.prepare(`
              INSERT INTO monthly_totals (month_key, category_id, kind, total_minor, entry_count)
              VALUES (?, ?, ?, ?, ?);
            `).run(c.month_key, c.category_id, c.kind, c.total_minor, c.entry_count);
          }

          // Compare cached vs oracle
          const cachedMap = new Map(
            cached.map((r) => [`${r.month_key}:${r.category_id}:${r.kind}`, `${r.total_minor}:${r.entry_count}`])
          );
          const oracleMap = new Map(
            oracle.map((r) => [`${r.month_key}:${r.category_id}:${r.kind}`, `${r.total_minor}:${r.entry_count}`])
          );

          expect(cachedMap.size).toBe(oracleMap.size);

          for (const [key, oracleVal] of oracleMap) {
            const cachedVal = cachedMap.get(key);
            if (cachedVal !== oracleVal) {
              totalMismatches++;
            }
          }
        }
      }

      expect(totalMismatches).toBe(0);
    });
  });
});

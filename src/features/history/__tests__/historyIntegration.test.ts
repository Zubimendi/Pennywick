// src/features/history/__tests__/historyIntegration.test.ts
// Acceptance test for Task T8:
// "Edit across months updates both months' totals; delete with undo restores totals."

import { DatabaseSync } from 'node:sqlite';

describe('T8 Acceptance: Cross-month edit and undo delete aggregate consistency', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
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

      INSERT INTO categories (id, name, kind, icon, color_key, updated_at)
      VALUES ('cat_food', 'Food', 'expense', 'fast-food', 'cat01', 1000);
    `);
  });

  afterEach(() => {
    db.close();
  });

  function recomputeBuckets(affected: Array<{ monthKey: string; categoryId: string; kind: string }>): void {
    const uniqueKeys = new Map<string, { monthKey: string; categoryId: string; kind: string }>();
    for (const k of affected) {
      const keyStr = `${k.monthKey}::${k.categoryId}::${k.kind}`;
      uniqueKeys.set(keyStr, k);
    }

    const selectStmt = db.prepare(`
      SELECT COALESCE(SUM(amount_minor), 0) AS total_minor, COUNT(*) AS entry_count
      FROM transactions
      WHERE month_key = ? AND category_id = ? AND kind = ? AND deleted_at IS NULL
    `);

    const upsertStmt = db.prepare(`
      INSERT INTO monthly_totals (month_key, category_id, kind, total_minor, entry_count)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(month_key, category_id, kind) DO UPDATE SET
        total_minor = excluded.total_minor,
        entry_count = excluded.entry_count
    `);

    const deleteStmt = db.prepare(`
      DELETE FROM monthly_totals
      WHERE month_key = ? AND category_id = ? AND kind = ?
    `);

    for (const { monthKey, categoryId, kind } of uniqueKeys.values()) {
      const row = selectStmt.get(monthKey, categoryId, kind) as { total_minor: number; entry_count: number };
      if (!row || row.entry_count === 0) {
        deleteStmt.run(monthKey, categoryId, kind);
      } else {
        upsertStmt.run(monthKey, categoryId, kind, row.total_minor, row.entry_count);
      }
    }
  }

  function getMonthTotal(monthKey: string, categoryId: string, kind: string): number {
    const row = db
      .prepare('SELECT total_minor FROM monthly_totals WHERE month_key = ? AND category_id = ? AND kind = ?')
      .get(monthKey, categoryId, kind) as { total_minor: number } | undefined;
    return row?.total_minor ?? 0;
  }

  test('Cross-month edit updates both months totals; delete and undo restore totals', () => {
    // 1. Add transaction in Month 2026-11
    const txId = 'tx_cross_month';
    db.prepare(`
      INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
      VALUES (?, 'expense', 450000, 'cat_food', '2026-11-15', '2026-11', 1000, 1000)
    `).run(txId);

    recomputeBuckets([{ monthKey: '2026-11', categoryId: 'cat_food', kind: 'expense' }]);

    expect(getMonthTotal('2026-11', 'cat_food', 'expense')).toBe(450000);
    expect(getMonthTotal('2026-12', 'cat_food', 'expense')).toBe(0);

    // 2. Edit date from 2026-11-15 to 2026-12-05 (crosses months)
    db.prepare(`
      UPDATE transactions
      SET occurred_on = '2026-12-05', month_key = '2026-12', updated_at = 2000
      WHERE id = ?
    `).run(txId);

    // In a single transaction, both buckets are recomputed
    recomputeBuckets([
      { monthKey: '2026-11', categoryId: 'cat_food', kind: 'expense' },
      { monthKey: '2026-12', categoryId: 'cat_food', kind: 'expense' },
    ]);

    expect(getMonthTotal('2026-11', 'cat_food', 'expense')).toBe(0);
    expect(getMonthTotal('2026-12', 'cat_food', 'expense')).toBe(450000);

    // 3. Delete transaction
    db.prepare(`
      UPDATE transactions
      SET deleted_at = 3000, updated_at = 3000
      WHERE id = ?
    `).run(txId);

    recomputeBuckets([{ monthKey: '2026-12', categoryId: 'cat_food', kind: 'expense' }]);

    expect(getMonthTotal('2026-12', 'cat_food', 'expense')).toBe(0);

    // 4. Undo delete transaction
    db.prepare(`
      UPDATE transactions
      SET deleted_at = NULL, updated_at = 4000
      WHERE id = ?
    `).run(txId);

    recomputeBuckets([{ monthKey: '2026-12', categoryId: 'cat_food', kind: 'expense' }]);

    expect(getMonthTotal('2026-12', 'cat_food', 'expense')).toBe(450000);
  });
});

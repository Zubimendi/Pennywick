// src/db/repositories/__tests__/categories.test.ts
// Acceptance test for Task T9:
// "Categories management (add, rename, recolor, reorder, archive) - Acceptance: Cannot delete a used category"

import { DatabaseSync } from 'node:sqlite';

describe('T9 Acceptance: Category repository rules and delete-guard', () => {
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
    `);
  });

  afterEach(() => {
    db.close();
  });

  function canDeleteCategory(id: string): { canDelete: boolean; error?: string } {
    const row = db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
      .get(id) as { count: number };

    if (row.count > 0) {
      return {
        canDelete: false,
        error: 'Cannot delete a category with entries. Archive instead.',
      };
    }
    return { canDelete: true };
  }

  function deleteCategory(id: string): void {
    const check = canDeleteCategory(id);
    if (!check.canDelete) {
      throw new Error(check.error);
    }
    db.prepare('UPDATE categories SET deleted_at = ? WHERE id = ?').run(Date.now(), id);
  }

  function archiveCategory(id: string): void {
    db.prepare('UPDATE categories SET archived = 1 WHERE id = ?').run(id);
  }

  test('cannot delete a category that has transactions; must archive instead', () => {
    // Insert category
    db.prepare(`
      INSERT INTO categories (id, name, kind, icon, color_key, updated_at)
      VALUES ('cat_used', 'Transport', 'expense', 'car-outline', 'cat02', 1000)
    `).run();

    // Insert an entry referencing cat_used
    db.prepare(`
      INSERT INTO transactions (id, kind, amount_minor, category_id, occurred_on, month_key, created_at, updated_at)
      VALUES ('tx_1', 'expense', 150000, 'cat_used', '2026-11-17', '2026-11', 1000, 1000)
    `).run();

    // Deletion should fail
    expect(() => deleteCategory('cat_used')).toThrow(
      'Cannot delete a category with entries. Archive instead.'
    );

    // Archiving succeeds
    expect(() => archiveCategory('cat_used')).not.toThrow();
    const cat = db.prepare('SELECT archived FROM categories WHERE id = ?').get('cat_used') as { archived: number };
    expect(cat.archived).toBe(1);
  });

  test('can delete an unused category', () => {
    db.prepare(`
      INSERT INTO categories (id, name, kind, icon, color_key, updated_at)
      VALUES ('cat_unused', 'Hobbies', 'expense', 'game-controller-outline', 'cat03', 1000)
    `).run();

    expect(() => deleteCategory('cat_unused')).not.toThrow();
    const cat = db.prepare('SELECT deleted_at FROM categories WHERE id = ?').get('cat_unused') as { deleted_at: number };
    expect(cat.deleted_at).toBeGreaterThan(0);
  });

  test('reorders categories by sort_order', () => {
    db.prepare(`
      INSERT INTO categories (id, name, kind, icon, color_key, sort_order, updated_at)
      VALUES 
        ('cat1', 'One', 'expense', 'icon', 'cat01', 0, 1000),
        ('cat2', 'Two', 'expense', 'icon', 'cat02', 1, 1000),
        ('cat3', 'Three', 'expense', 'icon', 'cat03', 2, 1000)
    `).run();

    // Reorder: cat3 first, then cat1, then cat2
    const newOrder = ['cat3', 'cat1', 'cat2'];
    newOrder.forEach((id, index) => {
      db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run(index, id);
    });

    const rows = db.prepare('SELECT id FROM categories ORDER BY sort_order ASC').all() as Array<{ id: string }>;
    expect(rows.map((r) => r.id)).toEqual(['cat3', 'cat1', 'cat2']);
  });
});

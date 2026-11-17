// src/features/insights/__tests__/insightsIntegration.test.ts
// Acceptance test for Task T11:
// "Insights: month picker, donut, daily bars, comparison. Acceptance: Matches monthly_totals; empty month handled."

import { DatabaseSync } from 'node:sqlite';
import {
  computeCategoryShares,
  computeMonthComparison,
} from '../../../domain/insights';

describe('T11 Acceptance: Insights matches monthly_totals and handles empty months', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE monthly_totals (
        month_key TEXT NOT NULL,
        category_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        total_minor INTEGER NOT NULL,
        entry_count INTEGER NOT NULL,
        PRIMARY KEY (month_key, category_id, kind)
      );

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

      INSERT INTO categories (id, name, kind, icon, color_key, updated_at)
      VALUES 
        ('cat1', 'Food', 'expense', 'fast-food', 'cat01', 1000),
        ('cat2', 'Transport', 'expense', 'car', 'cat02', 1000);
    `);
  });

  afterEach(() => {
    db.close();
  });

  test('insights aggregates match monthly_totals cache exactly', () => {
    // Populate monthly_totals for 2026-11
    db.prepare(`
      INSERT INTO monthly_totals (month_key, category_id, kind, total_minor, entry_count)
      VALUES 
        ('2026-11', 'cat1', 'expense', 600000, 4),
        ('2026-11', 'cat2', 'expense', 400000, 2),
        ('2026-10', 'cat1', 'expense', 800000, 5);
    `).run();

    // Query 2026-11 totals from monthly_totals
    const rows = db.prepare(`
      SELECT category_id, total_minor
      FROM monthly_totals
      WHERE month_key = '2026-11' AND kind = 'expense'
    `).all() as Array<{ category_id: string; total_minor: number }>;

    const totalExpenseMinor = rows.reduce((s, r) => s + r.total_minor, 0);
    expect(totalExpenseMinor).toBe(1000000);

    // Compute category shares
    const items = rows.map((r) => ({
      id: r.category_id,
      name: r.category_id === 'cat1' ? 'Food' : 'Transport',
      icon: 'icon',
      colorHex: '#000',
      totalMinor: r.total_minor,
    }));

    const shares = computeCategoryShares(items, totalExpenseMinor);
    expect(shares).toHaveLength(2);
    // Sum of slice totals equals totalExpenseMinor from monthly_totals
    const sumSlices = shares.reduce((s, slice) => s + slice.totalMinor, 0);
    expect(sumSlices).toBe(totalExpenseMinor);

    // Compare with 2026-10
    const prevRows = db.prepare(`
      SELECT SUM(total_minor) as prev_total
      FROM monthly_totals
      WHERE month_key = '2026-10' AND kind = 'expense'
    `).get() as { prev_total: number };

    const comparison = computeMonthComparison(totalExpenseMinor, prevRows.prev_total);
    // 1,000,000 vs 800,000 -> 25% increase
    expect(comparison.percentageChange).toBe(25);
    expect(comparison.isIncrease).toBe(true);
    expect(comparison.label).toBe('25% more than last month');
  });

  test('empty month handled gracefully without crashing or invalid ratios', () => {
    // Query empty month 2026-09
    const rows = db.prepare(`
      SELECT category_id, total_minor
      FROM monthly_totals
      WHERE month_key = '2026-09' AND kind = 'expense'
    `).all() as Array<{ category_id: string; total_minor: number }>;

    const totalExpenseMinor = rows.reduce((s, r) => s + r.total_minor, 0);
    expect(totalExpenseMinor).toBe(0);

    const shares = computeCategoryShares([], totalExpenseMinor);
    expect(shares).toEqual([]);

    const comparison = computeMonthComparison(totalExpenseMinor, 0);
    expect(comparison.label).toBe('No spending in either month');
  });
});

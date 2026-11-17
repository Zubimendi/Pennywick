// src/domain/__tests__/insights.test.ts
// Unit tests for Insights domain calculations (T11 Acceptance).

import {
  computeMonthComparison,
  computeCategoryShares,
  computeDailySpendingBars,
} from '../insights';

describe('insights domain calculations (T11 Acceptance)', () => {
  describe('computeMonthComparison', () => {
    test('handles zero previous month spending', () => {
      const res = computeMonthComparison(100000, 0);
      expect(res.label).toBe('No spending last month');
      expect(res.isIncrease).toBe(true);

      const resZeroBoth = computeMonthComparison(0, 0);
      expect(resZeroBoth.label).toBe('No spending in either month');
    });

    test('calculates percentage decrease', () => {
      // 88,000 vs 100,000 -> 12% less
      const res = computeMonthComparison(88000, 100000);
      expect(res.label).toBe('12% less than last month');
      expect(res.percentageChange).toBe(12);
      expect(res.isIncrease).toBe(false);
    });

    test('calculates percentage increase', () => {
      // 125,000 vs 100,000 -> 25% more
      const res = computeMonthComparison(125000, 100000);
      expect(res.label).toBe('25% more than last month');
      expect(res.percentageChange).toBe(25);
      expect(res.isIncrease).toBe(true);
    });

    test('handles identical spending', () => {
      const res = computeMonthComparison(50000, 50000);
      expect(res.label).toBe('Same spending as last month');
    });
  });

  describe('computeCategoryShares', () => {
    test('handles empty data', () => {
      const res = computeCategoryShares([], 0);
      expect(res).toEqual([]);
    });

    test('groups categories into Top 8 + Other when > 8 categories', () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        id: `cat_${i}`,
        name: `Category ${i}`,
        icon: 'icon',
        colorHex: '#000000',
        totalMinor: 1000 * (12 - i),
      }));

      const grandTotal = items.reduce((s, c) => s + c.totalMinor, 0);
      const shares = computeCategoryShares(items, grandTotal);

      // Top 8 + 1 Other = 9 slices
      expect(shares).toHaveLength(9);
      expect(shares[8].name).toBe('Other');
      expect(shares[8].id).toBe('other');

      // Total angles sum to 360
      const totalSweep = shares.reduce((s, c) => s + c.sweepAngle, 0);
      expect(Math.round(totalSweep)).toBe(360);
    });
  });

  describe('computeDailySpendingBars', () => {
    test('computes daily bars for 30 days', () => {
      const map = new Map<string, number>();
      map.set('2026-11-05', 50000);
      map.set('2026-11-15', 100000); // peak

      const res = computeDailySpendingBars('2026-11', 30, map);
      expect(res.bars).toHaveLength(30);
      expect(res.maxDailyMinor).toBe(100000);

      // Day 15 should have ratio 1.0
      expect(res.bars[14].heightRatio).toBe(1.0);
      expect(res.bars[14].totalMinor).toBe(100000);

      // Day 5 should have ratio 0.5
      expect(res.bars[4].heightRatio).toBe(0.5);
      expect(res.bars[4].totalMinor).toBe(50000);

      // Day 1 should have ratio 0
      expect(res.bars[0].heightRatio).toBe(0);
    });
  });
});

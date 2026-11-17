// src/domain/__tests__/budgets.test.ts
// Unit tests for budget domain calculations and the three status states (onTrack, watch, over).

import {
  calculateBudgetStatus,
  calculateMonthBudgetSummary,
} from '../budgets';

describe('budgets domain logic (T10 Acceptance)', () => {
  test('returns onTrack when spent is below 80%', () => {
    // 50% spent: 50,000 / 100,000
    const res = calculateBudgetStatus(5000000, 10000000);
    expect(res.status).toBe('onTrack');
    expect(res.percentageUsed).toBe(0.5);
    expect(res.remainingMinor).toBe(5000000);
    expect(res.isOver).toBe(false);
    expect(res.statusLabel).toBe('On track');
  });

  test('returns watch when spent is between 80% and 100%', () => {
    // 85% spent: 85,000 / 100,000
    const res = calculateBudgetStatus(8500000, 10000000);
    expect(res.status).toBe('watch');
    expect(res.percentageUsed).toBe(0.85);
    expect(res.remainingMinor).toBe(1500000);
    expect(res.isOver).toBe(false);
    expect(res.statusLabel).toBe('Watch • 85% used');

    // Exactly 80%
    const res80 = calculateBudgetStatus(8000000, 10000000);
    expect(res80.status).toBe('watch');

    // Exactly 100%
    const res100 = calculateBudgetStatus(10000000, 10000000);
    expect(res100.status).toBe('watch');
    expect(res100.remainingMinor).toBe(0);
    expect(res100.isOver).toBe(false);
  });

  test('returns over when spent is above 100%', () => {
    // 120% spent: 120,000 / 100,000
    const res = calculateBudgetStatus(12000000, 10000000);
    expect(res.status).toBe('over');
    expect(res.percentageUsed).toBe(1.2);
    expect(res.remainingMinor).toBe(-2000000);
    expect(res.isOver).toBe(true);
    expect(res.statusLabel).toBe('Over budget');
  });

  test('handles zero limit safely', () => {
    const res = calculateBudgetStatus(5000, 0);
    expect(res.status).toBe('over');
    expect(res.isOver).toBe(true);
  });

  test('calculateMonthBudgetSummary computes aggregate totals correctly', () => {
    const summary = calculateMonthBudgetSummary([
      { limitMinor: 10000000, spentMinor: 5000000 },
      { limitMinor: 5000000, spentMinor: 4500000 },
      { limitMinor: 2000000, spentMinor: 2500000 },
    ]);

    expect(summary.totalBudgetedMinor).toBe(17000000);
    expect(summary.totalSpentMinor).toBe(12000000);
    expect(summary.totalRemainingMinor).toBe(5000000);
    expect(summary.overallPercentage).toBe(71); // 12 / 17 * 100 ≈ 70.58 -> 71%
  });
});

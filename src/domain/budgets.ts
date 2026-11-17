// src/domain/budgets.ts
// Pure domain logic for category budgets and status thresholds.
// Conforms to docs/CURSOR_CONTEXT.MD Section 9 and docs/DESIGN.MD Section 7.

export type BudgetStatus = 'onTrack' | 'watch' | 'over';

export interface BudgetCalculation {
  status: BudgetStatus;
  percentageUsed: number;
  remainingMinor: number;
  isOver: boolean;
  statusLabel: string;
}

/**
 * Compute budget progress, remaining amount, and status tier:
 * - spent / limit < 0.8 -> 'onTrack' (Primary bar, "N left")
 * - 0.8 <= spent / limit <= 1.0 -> 'watch' (Warning bar, "N left, X% used")
 * - spent / limit > 1.0 -> 'over' (Danger bar, "N over")
 */
export function calculateBudgetStatus(spentMinor: number, limitMinor: number): BudgetCalculation {
  if (limitMinor <= 0) {
    return {
      status: 'over',
      percentageUsed: 1,
      remainingMinor: 0,
      isOver: true,
      statusLabel: 'No limit set',
    };
  }

  const ratio = spentMinor / limitMinor;
  const remainingMinor = limitMinor - spentMinor;

  let status: BudgetStatus = 'onTrack';
  let statusLabel = 'On track';

  if (ratio > 1.0) {
    status = 'over';
    statusLabel = 'Over budget';
  } else if (ratio >= 0.8) {
    status = 'watch';
    const percentInt = Math.round(ratio * 100);
    statusLabel = `Watch • ${percentInt}% used`;
  }

  return {
    status,
    percentageUsed: ratio,
    remainingMinor,
    isOver: remainingMinor < 0,
    statusLabel,
  };
}

/**
 * Calculate month-level aggregate for all active budgets.
 */
export function calculateMonthBudgetSummary(
  budgetsWithSpending: Array<{ limitMinor: number; spentMinor: number }>
): {
  totalBudgetedMinor: number;
  totalSpentMinor: number;
  totalRemainingMinor: number;
  overallPercentage: number;
} {
  let totalBudgetedMinor = 0;
  let totalSpentMinor = 0;

  for (const b of budgetsWithSpending) {
    totalBudgetedMinor += b.limitMinor;
    totalSpentMinor += b.spentMinor;
  }

  const totalRemainingMinor = totalBudgetedMinor - totalSpentMinor;
  const overallPercentage =
    totalBudgetedMinor > 0 ? (totalSpentMinor / totalBudgetedMinor) * 100 : 0;

  return {
    totalBudgetedMinor,
    totalSpentMinor,
    totalRemainingMinor,
    overallPercentage: Math.round(overallPercentage),
  };
}

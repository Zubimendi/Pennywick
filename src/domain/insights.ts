// src/domain/insights.ts
// Pure calculations for Insights: month comparison, category shares (top 8 + other), and daily bar heights.

export interface MonthComparisonResult {
  deltaMinor: number;
  percentageChange: number;
  isIncrease: boolean;
  label: string;
}

/**
 * Compare current month spending with previous month spending.
 * "Month comparison: percent change versus previous month; if previous is zero show 'No spending last month'."
 */
export function computeMonthComparison(
  currentTotalMinor: number,
  previousTotalMinor: number
): MonthComparisonResult {
  const deltaMinor = currentTotalMinor - previousTotalMinor;

  if (previousTotalMinor === 0) {
    if (currentTotalMinor === 0) {
      return {
        deltaMinor: 0,
        percentageChange: 0,
        isIncrease: false,
        label: 'No spending in either month',
      };
    }
    return {
      deltaMinor: currentTotalMinor,
      percentageChange: 100,
      isIncrease: true,
      label: 'No spending last month',
    };
  }

  const percentageChange = Math.round((Math.abs(deltaMinor) / previousTotalMinor) * 100);

  if (deltaMinor > 0) {
    return {
      deltaMinor,
      percentageChange,
      isIncrease: true,
      label: `${percentageChange}% more than last month`,
    };
  }

  if (deltaMinor < 0) {
    return {
      deltaMinor,
      percentageChange,
      isIncrease: false,
      label: `${percentageChange}% less than last month`,
    };
  }

  return {
    deltaMinor: 0,
    percentageChange: 0,
    isIncrease: false,
    label: 'Same spending as last month',
  };
}

export interface CategoryShareItem {
  id: string;
  name: string;
  icon: string;
  colorHex: string;
  totalMinor: number;
  percentage: number;
  startAngle: number;
  sweepAngle: number;
  endAngle: number;
}

/**
 * Group categories into Top 8 + "Other" and compute donut angles.
 */
export function computeCategoryShares(
  items: Array<{
    id: string;
    name: string;
    icon: string;
    colorHex: string;
    totalMinor: number;
  }>,
  grandTotalMinor: number
): CategoryShareItem[] {
  if (grandTotalMinor <= 0 || items.length === 0) {
    return [];
  }

  // Sort descending by totalMinor
  const sorted = [...items].sort((a, b) => b.totalMinor - a.totalMinor);

  const top8 = sorted.slice(0, 8);
  const remaining = sorted.slice(8);

  const resultItems: Array<{
    id: string;
    name: string;
    icon: string;
    colorHex: string;
    totalMinor: number;
  }> = [...top8];

  if (remaining.length > 0) {
    const otherTotal = remaining.reduce((sum, item) => sum + item.totalMinor, 0);
    resultItems.push({
      id: 'other',
      name: 'Other',
      icon: 'ellipsis-horizontal-outline',
      colorHex: '#64748B',
      totalMinor: otherTotal,
    });
  }

  let currentAngle = 0;
  return resultItems.map((item) => {
    const ratio = item.totalMinor / grandTotalMinor;
    const sweepAngle = ratio * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    currentAngle = endAngle;

    return {
      ...item,
      percentage: Math.round(ratio * 100),
      startAngle,
      sweepAngle,
      endAngle,
    };
  });
}

export interface DailyBarItem {
  dayNumber: number;
  dateStr: string;
  totalMinor: number;
  heightRatio: number; // 0 to 1
}

/**
 * Generate daily spending points for all days in month.
 */
export function computeDailySpendingBars(
  monthKey: string,
  daysInMonth: number,
  dailyTotalsMap: Map<string, number>
): { bars: DailyBarItem[]; maxDailyMinor: number } {
  let maxDailyMinor = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthKey}-${day.toString().padStart(2, '0')}`;
    const total = dailyTotalsMap.get(dateStr) ?? 0;
    if (total > maxDailyMinor) {
      maxDailyMinor = total;
    }
  }

  const bars: DailyBarItem[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthKey}-${day.toString().padStart(2, '0')}`;
    const total = dailyTotalsMap.get(dateStr) ?? 0;
    const heightRatio = maxDailyMinor > 0 ? total / maxDailyMinor : 0;

    bars.push({
      dayNumber: day,
      dateStr,
      totalMinor: total,
      heightRatio,
    });
  }

  return { bars, maxDailyMinor };
}

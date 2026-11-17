// src/domain/recurrence.ts
// Pure occurrence generator and catch-up calculation for recurring transactions.
// Conforms to docs/CURSOR_CONTEXT.MD Section 5 & 9 and docs/DESIGN.MD Section 4.

import {
  parseLocalDate,
  formatLocalDate,
  getDayOfWeek,
  clampDayToMonth,
  toMonthKey,
} from './dates';

export interface RecurrenceRuleDef {
  id: string;
  frequency: 'weekly' | 'monthly';
  day: number; // 1..7 for weekly (1 = Monday, 7 = Sunday), 1..31 for monthly
  startOn: string; // YYYY-MM-DD
  lastGeneratedOn: string | null;
}

/**
 * Compute all missing occurrence dates for a rule up to `upToDate` (inclusive).
 * Capped at `maxLimit` occurrences per run (default 366).
 */
export function getNextOccurrenceDates(
  rule: RecurrenceRuleDef,
  upToDate: string,
  maxLimit = 366
): string[] {
  // Determine start scanning date
  let startScanDateStr: string;
  if (rule.lastGeneratedOn) {
    // Start from the day after lastGeneratedOn
    const nextDate = parseLocalDate(rule.lastGeneratedOn);
    nextDate.setDate(nextDate.getDate() + 1);
    startScanDateStr = formatLocalDate(nextDate);
  } else {
    startScanDateStr = rule.startOn;
  }

  // If scan start is already after target date, no occurrences are due
  if (startScanDateStr > upToDate) {
    return [];
  }

  const occurrences: string[] = [];

  if (rule.frequency === 'weekly') {
    // Scan day by day from startScanDateStr up through upToDate
    const current = parseLocalDate(startScanDateStr);
    const target = parseLocalDate(upToDate);

    while (current <= target && occurrences.length < maxLimit) {
      const dateStr = formatLocalDate(current);
      if (getDayOfWeek(dateStr) === rule.day) {
        occurrences.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (rule.frequency === 'monthly') {
    // Scan month by month from start month to target month
    const startMonth = toMonthKey(startScanDateStr);
    const endMonth = toMonthKey(upToDate);

    const [startYearStr, startMStr] = startMonth.split('-');
    const [endYearStr, endMStr] = endMonth.split('-');

    let year = parseInt(startYearStr, 10);
    let month = parseInt(startMStr, 10);

    const endYear = parseInt(endYearStr, 10);
    const endM = parseInt(endMStr, 10);

    while ((year < endYear || (year === endYear && month <= endM)) && occurrences.length < maxLimit) {
      // Clamp target day to end of this month (e.g. Day 31 in Feb -> 28 or 29)
      const clampedDay = clampDayToMonth(year, month, rule.day);
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${clampedDay.toString().padStart(2, '0')}`;

      if (dateStr >= startScanDateStr && dateStr <= upToDate) {
        occurrences.push(dateStr);
      }

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  return occurrences;
}

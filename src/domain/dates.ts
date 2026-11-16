// src/domain/dates.ts
// Local calendar date logic. All dates are local calendar strings (YYYY-MM-DD).
// Never derive entry dates from UTC. Weeks start on Monday (1 = Monday, 7 = Sunday).

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Format a Date object to local YYYY-MM-DD string
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract YYYY-MM from YYYY-MM-DD or Date
 */
export function toMonthKey(dateOrStr: string | Date): string {
  if (typeof dateOrStr === 'string') {
    return dateOrStr.slice(0, 7);
  }
  const year = dateOrStr.getFullYear();
  const month = (dateOrStr.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get today's local date string (YYYY-MM-DD)
 */
export function getToday(): string {
  return formatLocalDate(new Date());
}

/**
 * Get yesterday's local date string (YYYY-MM-DD)
 */
export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Parse YYYY-MM-DD into a local Date object (midnight local time)
 */
export function parseLocalDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Check if a date string is valid YYYY-MM-DD
 */
export function isValidLocalDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Get number of days in a given month (year, 1-based month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Clamp a target day to the last day of the target month.
 * e.g. Day 31 in February 2024 (leap year) -> 29, in February 2023 -> 28.
 */
export function clampDayToMonth(year: number, month: number, targetDay: number): number {
  const maxDays = getDaysInMonth(year, month);
  return Math.min(Math.max(1, targetDay), maxDays);
}

/**
 * Get month boundaries for a month_key (e.g. '2026-11')
 */
export function getMonthBoundaries(monthKey: string): {
  startOn: string;
  endOn: string;
  daysInMonth: number;
} {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = getDaysInMonth(year, month);

  return {
    startOn: `${monthKey}-01`,
    endOn: `${monthKey}-${daysInMonth.toString().padStart(2, '0')}`,
    daysInMonth,
  };
}

/**
 * Get previous month_key (e.g. '2026-11' -> '2026-10', '2026-01' -> '2025-12')
 */
export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Get next month_key (e.g. '2026-11' -> '2026-12', '2026-12' -> '2027-01')
 */
export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Format month label for UI (e.g. '2026-11' -> 'November 2026')
 */
export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = yearStr;
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] ?? monthStr;
  return `${monthName} ${year}`;
}

/**
 * Day of week index (Monday = 1, Sunday = 7)
 */
export function getDayOfWeek(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0 is Sunday in JS
  return day === 0 ? 7 : day;
}

/**
 * Format relative or short day label (e.g. 'Today, Nov 16' or 'Yesterday' or 'Fri, Nov 14')
 */
export function formatDayLabel(dateStr: string): string {
  const today = getToday();
  const yesterday = getYesterday();

  const d = parseLocalDate(dateStr);
  const monthName = MONTH_SHORT[d.getMonth()];
  const day = d.getDate();
  const weekdayName = WEEKDAY_SHORT[getDayOfWeek(dateStr) - 1];

  if (dateStr === today) {
    return `Today, ${monthName} ${day}`;
  }
  if (dateStr === yesterday) {
    return `Yesterday, ${monthName} ${day}`;
  }
  return `${weekdayName}, ${monthName} ${day}`;
}

import {
  formatLocalDate,
  toMonthKey,
  getToday,
  getYesterday,
  parseLocalDate,
  isValidLocalDate,
  getDaysInMonth,
  clampDayToMonth,
  getMonthBoundaries,
  getPreviousMonthKey,
  getNextMonthKey,
  formatMonthLabel,
  getDayOfWeek,
  formatDayLabel,
} from '../dates';

describe('Domain: Dates (T4)', () => {
  describe('formatLocalDate and toMonthKey', () => {
    it('formats date object to local YYYY-MM-DD', () => {
      const d = new Date(2026, 10, 16); // Month 10 is November in 0-indexed JS
      expect(formatLocalDate(d)).toBe('2026-11-16');
    });

    it('extracts YYYY-MM month key accurately', () => {
      expect(toMonthKey('2026-11-16')).toBe('2026-11');
      expect(toMonthKey(new Date(2026, 10, 16))).toBe('2026-11');
    });

    it('returns valid today and yesterday strings', () => {
      const today = getToday();
      const yesterday = getYesterday();
      expect(isValidLocalDate(today)).toBe(true);
      expect(isValidLocalDate(yesterday)).toBe(true);
    });
  });

  describe('Validation and parsing', () => {
    it('validates correct and incorrect dates', () => {
      expect(isValidLocalDate('2026-11-16')).toBe(true);
      expect(isValidLocalDate('2024-02-29')).toBe(true); // leap year
      expect(isValidLocalDate('2023-02-29')).toBe(false); // not leap year
      expect(isValidLocalDate('invalid-date')).toBe(false);
      expect(isValidLocalDate('2026-13-01')).toBe(false);
    });

    it('parses local date to midnight local Date object', () => {
      const d = parseLocalDate('2026-11-16');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(10); // Nov
      expect(d.getDate()).toBe(16);
      expect(d.getHours()).toBe(0);
    });
  });

  describe('Month boundaries and clamping', () => {
    it('calculates days in month correctly including leap years', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29); // leap year Feb
      expect(getDaysInMonth(2023, 2)).toBe(28); // normal Feb
      expect(getDaysInMonth(2026, 11)).toBe(30); // Nov
      expect(getDaysInMonth(2026, 12)).toBe(31); // Dec
    });

    it('clamps day 31 in short months and February', () => {
      expect(clampDayToMonth(2024, 2, 31)).toBe(29);
      expect(clampDayToMonth(2023, 2, 31)).toBe(28);
      expect(clampDayToMonth(2026, 11, 31)).toBe(30);
      expect(clampDayToMonth(2026, 12, 31)).toBe(31);
    });

    it('computes month boundaries', () => {
      const b = getMonthBoundaries('2026-11');
      expect(b.startOn).toBe('2026-11-01');
      expect(b.endOn).toBe('2026-11-30');
      expect(b.daysInMonth).toBe(30);
    });

    it('traverses previous and next month keys across year boundaries', () => {
      expect(getPreviousMonthKey('2026-11')).toBe('2026-10');
      expect(getPreviousMonthKey('2026-01')).toBe('2025-12');
      expect(getNextMonthKey('2026-11')).toBe('2026-12');
      expect(getNextMonthKey('2026-12')).toBe('2027-01');
    });
  });

  describe('Labels and Weekdays', () => {
    it('formats month labels for UI', () => {
      expect(formatMonthLabel('2026-11')).toBe('November 2026');
      expect(formatMonthLabel('2025-01')).toBe('January 2025');
    });

    it('returns day of week with Monday = 1 and Sunday = 7', () => {
      // 2026-11-16 is Monday
      expect(getDayOfWeek('2026-11-16')).toBe(1);
      // 2026-11-22 is Sunday
      expect(getDayOfWeek('2026-11-22')).toBe(7);
    });

    it('formats friendly day labels', () => {
      const today = getToday();
      expect(formatDayLabel(today)).toContain('Today');
      const yesterday = getYesterday();
      expect(formatDayLabel(yesterday)).toContain('Yesterday');
    });
  });
});

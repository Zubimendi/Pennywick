// src/domain/__tests__/recurrence.test.ts
// Acceptance tests for recurrence engine (T12 Acceptance).

import { getNextOccurrenceDates, RecurrenceRuleDef } from '../recurrence';
import { generateRecurringId } from '../../lib/id';

describe('Recurrence engine (T12 Acceptance)', () => {
  test('catch-up after 40 days for a weekly rule', () => {
    // Rule: runs on Friday (day 5), startOn: 2026-10-01
    // Target date: 2026-11-10 (40 days later)
    const rule: RecurrenceRuleDef = {
      id: 'rule_weekly_gym',
      frequency: 'weekly',
      day: 5, // Friday
      startOn: '2026-10-01',
      lastGeneratedOn: null,
    };

    const dates = getNextOccurrenceDates(rule, '2026-11-10');

    // Expected Fridays in Oct 1 - Nov 10, 2026:
    // Oct 2, Oct 9, Oct 16, Oct 23, Oct 30, Nov 6
    expect(dates).toEqual([
      '2026-10-02',
      '2026-10-09',
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
      '2026-11-06',
    ]);
  });

  test('monthly rule day 31 clamps correctly in February (non-leap and leap year)', () => {
    // 2023 is non-leap (Feb has 28 days)
    const ruleNonLeap: RecurrenceRuleDef = {
      id: 'rule_rent',
      frequency: 'monthly',
      day: 31,
      startOn: '2023-01-01',
      lastGeneratedOn: null,
    };

    const datesNonLeap = getNextOccurrenceDates(ruleNonLeap, '2023-03-31');
    expect(datesNonLeap).toEqual([
      '2023-01-31',
      '2023-02-28', // Clamped to 28
      '2023-03-31',
    ]);

    // 2024 is leap year (Feb has 29 days)
    const ruleLeap: RecurrenceRuleDef = {
      id: 'rule_rent_leap',
      frequency: 'monthly',
      day: 31,
      startOn: '2024-01-01',
      lastGeneratedOn: null,
    };

    const datesLeap = getNextOccurrenceDates(ruleLeap, '2024-03-31');
    expect(datesLeap).toEqual([
      '2024-01-31',
      '2024-02-29', // Clamped to 29
      '2024-03-31',
    ]);
  });

  test('repeated generation with lastGeneratedOn set is a no-op', () => {
    const rule: RecurrenceRuleDef = {
      id: 'rule_salary',
      frequency: 'monthly',
      day: 25,
      startOn: '2026-01-01',
      lastGeneratedOn: '2026-11-17', // Already caught up to today
    };

    const dates = getNextOccurrenceDates(rule, '2026-11-17');
    expect(dates).toEqual([]);
  });

  test('deterministic recurrence ID stability and format', () => {
    const id1 = generateRecurringId('rule_sub_123', '2026-11-17');
    const id2 = generateRecurringId('rule_sub_123', '2026-11-17');

    // Deterministic: multiple calls produce identical ID
    expect(id1).toBe(id2);
    // Starts with 'rc'
    expect(id1.startsWith('rc')).toBe(true);
    // Exactly 15 characters
    expect(id1).toHaveLength(15);
    // Valid alphanumeric
    expect(/^[a-z0-9]{15}$/.test(id1)).toBe(true);

    // Different date yields different ID
    const id3 = generateRecurringId('rule_sub_123', '2026-11-18');
    expect(id1).not.toBe(id3);
  });
});

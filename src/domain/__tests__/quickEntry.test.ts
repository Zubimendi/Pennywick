// src/domain/__tests__/quickEntry.test.ts
// Unit tests for frequent-entry chips (T14 Acceptance).

import { findFrequentEntries, FrequentEntryCandidate } from '../quickEntry';

describe('quickEntry frequent suggestions (T14 Acceptance)', () => {
  const mockEntries: FrequentEntryCandidate[] = [
    { categoryId: 'cat_transport', amountMinor: 150000, note: 'Bolt ride' },
    { categoryId: 'cat_transport', amountMinor: 150000, note: 'Bolt ride' },
    { categoryId: 'cat_transport', amountMinor: 150000, note: 'Bolt ride' },
    { categoryId: 'cat_transport', amountMinor: 300000, note: 'Uber ride' },
    { categoryId: 'cat_transport', amountMinor: 300000, note: 'Uber ride' },
    { categoryId: 'cat_transport', amountMinor: 50000, note: 'Bus fare' },
    { categoryId: 'cat_food', amountMinor: 250000, note: 'Lunch' },
    { categoryId: 'cat_transport', amountMinor: 200000, note: '' }, // empty note skipped
    { categoryId: 'cat_transport', amountMinor: 0, note: 'Free ride' }, // 0 amount skipped
  ];

  test('returns top 3 frequent entries for transport category', () => {
    const suggestions = findFrequentEntries(mockEntries, 'cat_transport', 'NGN', 3);

    expect(suggestions).toHaveLength(3);

    // Most frequent: Bolt ride 1,500 (3 times)
    expect(suggestions[0].note).toBe('Bolt ride');
    expect(suggestions[0].amountMinor).toBe(150000);
    expect(suggestions[0].label).toContain('Bolt ride');
    expect(suggestions[0].label).toContain('1,500');

    // Second: Uber ride 3,000 (2 times)
    expect(suggestions[1].note).toBe('Uber ride');
    expect(suggestions[1].amountMinor).toBe(300000);

    // Third: Bus fare 500 (1 time)
    expect(suggestions[2].note).toBe('Bus fare');
    expect(suggestions[2].amountMinor).toBe(50000);
  });

  test('returns empty array if category has no entries or no notes', () => {
    const emptyCat = findFrequentEntries(mockEntries, 'cat_unknown', 'NGN');
    expect(emptyCat).toEqual([]);

    const noNotes: FrequentEntryCandidate[] = [
      { categoryId: 'cat_food', amountMinor: 1000, note: null },
      { categoryId: 'cat_food', amountMinor: 2000, note: '   ' },
    ];
    const emptyNotes = findFrequentEntries(noNotes, 'cat_food', 'NGN');
    expect(emptyNotes).toEqual([]);
  });
});

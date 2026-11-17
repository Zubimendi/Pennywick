// src/domain/quickEntry.ts
// Frequent-entry suggestions generator based on historical category spending.
// Conforms to docs/CURSOR_CONTEXT.MD Section 9 and docs/DESIGN.MD Section 2 & 4.

import { formatMoney } from './money';

export interface FrequentEntryCandidate {
  categoryId: string;
  amountMinor: number;
  note: string | null;
}

export interface FrequentEntrySuggestion {
  id: string;
  note: string;
  amountMinor: number;
  label: string;
}

/**
 * Identify up to `limit` most frequent (note, amount) pairs for a given category.
 */
export function findFrequentEntries(
  entries: FrequentEntryCandidate[],
  categoryId: string,
  currency = 'NGN',
  limit = 3
): FrequentEntrySuggestion[] {
  // Filter matching category with non-empty notes
  const matching = entries.filter(
    (e) => e.categoryId === categoryId && e.note && e.note.trim().length > 0 && e.amountMinor > 0
  );

  if (matching.length === 0) {
    return [];
  }

  // Count frequency of unique (note, amount)
  const frequencyMap = new Map<
    string,
    { note: string; amountMinor: number; count: number; firstSeenIndex: number }
  >();

  matching.forEach((entry, idx) => {
    const cleanNote = entry.note!.trim();
    const key = `${cleanNote.toLowerCase()}::${entry.amountMinor}`;

    const existing = frequencyMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      frequencyMap.set(key, {
        note: cleanNote,
        amountMinor: entry.amountMinor,
        count: 1,
        firstSeenIndex: idx,
      });
    }
  });

  const suggestions = Array.from(frequencyMap.values());

  // Sort descending by frequency count, then by recency (lower firstSeenIndex = more recent)
  suggestions.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.firstSeenIndex - b.firstSeenIndex;
  });

  return suggestions.slice(0, limit).map((s) => ({
    id: `${s.note}_${s.amountMinor}`,
    note: s.note,
    amountMinor: s.amountMinor,
    label: `${s.note} ${formatMoney(s.amountMinor, currency, { showDecimals: false })}`,
  }));
}

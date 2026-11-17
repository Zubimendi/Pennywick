// src/features/history/historyUtils.ts
// Pure utility functions for filtering and grouping transactions into day-grouped lists.

import {
  TransactionWithCategory,
  HistoryFilterState,
  HistoryListItem,
} from './historyTypes';
import {
  getToday,
  toMonthKey,
  getPreviousMonthKey,
  formatDayLabel,
  parseLocalDate,
  formatLocalDate,
} from '../../domain/dates';

/**
 * Filter transactions based on search query, kind, category, and date filter.
 */
export function filterTransactions(
  transactions: TransactionWithCategory[],
  filters: HistoryFilterState,
  referenceDateStr?: string
): TransactionWithCategory[] {
  const refDateStr = referenceDateStr ?? getToday();
  const currentMonthKey = toMonthKey(refDateStr);
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);

  // Compute 90 days ago cutoff
  const refDate = parseLocalDate(refDateStr);
  const cutoff90 = new Date(refDate);
  cutoff90.setDate(cutoff90.getDate() - 90);
  const cutoff90Str = formatLocalDate(cutoff90);

  const cleanQuery = filters.searchQuery.trim().toLowerCase();

  return transactions.filter((tx) => {
    // 1. Search Query (note or category name)
    if (cleanQuery.length > 0) {
      const matchNote = tx.note?.toLowerCase().includes(cleanQuery) ?? false;
      const matchCategory = tx.categoryName.toLowerCase().includes(cleanQuery);
      if (!matchNote && !matchCategory) {
        return false;
      }
    }

    // 2. Kind
    if (filters.kind !== 'all' && tx.kind !== filters.kind) {
      return false;
    }

    // 3. Category
    if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) {
      return false;
    }

    // 4. Date filter
    if (filters.dateFilter === 'this_month') {
      if (tx.monthKey !== currentMonthKey) {
        return false;
      }
    } else if (filters.dateFilter === 'last_month') {
      if (tx.monthKey !== previousMonthKey) {
        return false;
      }
    } else if (filters.dateFilter === 'last_90_days') {
      if (tx.occurredOn < cutoff90Str || tx.occurredOn > refDateStr) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Build flat list of day headers and transaction rows for FlashList.
 */
export function buildHistoryList(
  transactions: TransactionWithCategory[]
): HistoryListItem[] {
  if (transactions.length === 0) {
    return [];
  }

  // Sort descending by date, then createdAt
  const sorted = [...transactions].sort((a, b) => {
    if (a.occurredOn !== b.occurredOn) {
      return b.occurredOn.localeCompare(a.occurredOn);
    }
    return b.createdAt - a.createdAt;
  });

  const list: HistoryListItem[] = [];
  let currentDay: string | null = null;
  let dayExpense = 0;
  let dayIncome = 0;
  let dayItems: TransactionWithCategory[] = [];

  const flushDay = (): void => {
    if (!currentDay || dayItems.length === 0) {
      return;
    }

    // Header subtotal: Net total (income - expense), or expense total if income is 0
    const netTotal = dayIncome - dayExpense;

    list.push({
      id: `header_${currentDay}`,
      type: 'header',
      date: currentDay,
      displayDate: formatDayLabel(currentDay),
      subtotalMinor: netTotal,
      expenseMinor: dayExpense,
      incomeMinor: dayIncome,
    });

    for (const item of dayItems) {
      list.push({
        id: `item_${item.id}`,
        type: 'item',
        transaction: item,
      });
    }

    dayExpense = 0;
    dayIncome = 0;
    dayItems = [];
  };

  for (const tx of sorted) {
    if (tx.occurredOn !== currentDay) {
      flushDay();
      currentDay = tx.occurredOn;
    }

    dayItems.push(tx);
    if (tx.kind === 'expense') {
      dayExpense += tx.amountMinor;
    } else {
      dayIncome += tx.amountMinor;
    }
  }

  flushDay();

  return list;
}

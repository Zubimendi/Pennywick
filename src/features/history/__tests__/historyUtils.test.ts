// src/features/history/__tests__/historyUtils.test.ts

import {
  filterTransactions,
  buildHistoryList,
} from '../historyUtils';
import {
  TransactionWithCategory,
  HistoryFilterState,
  HistoryHeaderItem,
  HistoryRowItem,
} from '../historyTypes';

const mockTransactions: TransactionWithCategory[] = [
  {
    id: 'tx1',
    kind: 'expense',
    amountMinor: 150000,
    categoryId: 'cat_food',
    occurredOn: '2026-11-16',
    monthKey: '2026-11',
    note: 'Groceries at Shoprite',
    recurringRuleId: null,
    createdAt: 1000,
    updatedAt: 1000,
    deletedAt: null,
    categoryName: 'Food & Dining',
    categoryIcon: 'fast-food-outline',
    categoryColorKey: 'cat01',
  },
  {
    id: 'tx2',
    kind: 'income',
    amountMinor: 5000000,
    categoryId: 'cat_salary',
    occurredOn: '2026-11-16',
    monthKey: '2026-11',
    note: 'Consulting payment',
    recurringRuleId: null,
    createdAt: 2000,
    updatedAt: 2000,
    deletedAt: null,
    categoryName: 'Income',
    categoryIcon: 'wallet-outline',
    categoryColorKey: 'cat08',
  },
  {
    id: 'tx3',
    kind: 'expense',
    amountMinor: 300000,
    categoryId: 'cat_transit',
    occurredOn: '2026-11-15',
    monthKey: '2026-11',
    note: 'Uber ride',
    recurringRuleId: 'rule_123',
    createdAt: 3000,
    updatedAt: 3000,
    deletedAt: null,
    categoryName: 'Transportation',
    categoryIcon: 'car-outline',
    categoryColorKey: 'cat02',
  },
  {
    id: 'tx4',
    kind: 'expense',
    amountMinor: 80000,
    categoryId: 'cat_food',
    occurredOn: '2026-10-30',
    monthKey: '2026-10',
    note: 'Coffee',
    recurringRuleId: null,
    createdAt: 4000,
    updatedAt: 4000,
    deletedAt: null,
    categoryName: 'Food & Dining',
    categoryIcon: 'fast-food-outline',
    categoryColorKey: 'cat01',
  },
];

describe('historyUtils', () => {
  const baseFilter: HistoryFilterState = {
    searchQuery: '',
    kind: 'all',
    categoryId: 'all',
    dateFilter: 'all',
  };

  test('filters by search query matching note or category name', () => {
    const resNote = filterTransactions(
      mockTransactions,
      { ...baseFilter, searchQuery: 'shoprite' },
      '2026-11-16'
    );
    expect(resNote).toHaveLength(1);
    expect(resNote[0].id).toBe('tx1');

    const resCat = filterTransactions(
      mockTransactions,
      { ...baseFilter, searchQuery: 'transportation' },
      '2026-11-16'
    );
    expect(resCat).toHaveLength(1);
    expect(resCat[0].id).toBe('tx3');
  });

  test('filters by kind', () => {
    const expenses = filterTransactions(
      mockTransactions,
      { ...baseFilter, kind: 'expense' },
      '2026-11-16'
    );
    expect(expenses).toHaveLength(3);
    expect(expenses.every((t) => t.kind === 'expense')).toBe(true);

    const incomes = filterTransactions(
      mockTransactions,
      { ...baseFilter, kind: 'income' },
      '2026-11-16'
    );
    expect(incomes).toHaveLength(1);
    expect(incomes[0].id).toBe('tx2');
  });

  test('filters by category', () => {
    const food = filterTransactions(
      mockTransactions,
      { ...baseFilter, categoryId: 'cat_food' },
      '2026-11-16'
    );
    expect(food).toHaveLength(2);
    expect(food.map((t) => t.id)).toEqual(['tx1', 'tx4']);
  });

  test('filters by date: this_month, last_month', () => {
    const thisMonth = filterTransactions(
      mockTransactions,
      { ...baseFilter, dateFilter: 'this_month' },
      '2026-11-16'
    );
    expect(thisMonth).toHaveLength(3);
    expect(thisMonth.map((t) => t.id)).toEqual(['tx1', 'tx2', 'tx3']);

    const lastMonth = filterTransactions(
      mockTransactions,
      { ...baseFilter, dateFilter: 'last_month' },
      '2026-11-16'
    );
    expect(lastMonth).toHaveLength(1);
    expect(lastMonth[0].id).toBe('tx4');
  });

  test('buildHistoryList groups by day and computes subtotals correctly', () => {
    const list = buildHistoryList(mockTransactions);
    // 3 unique days: 2026-11-16, 2026-11-15, 2026-10-30 -> 3 headers + 4 items = 7 rows
    expect(list).toHaveLength(7);

    // Day 1: 2026-11-16
    const h1 = list[0] as HistoryHeaderItem;
    expect(h1.type).toBe('header');
    expect(h1.date).toBe('2026-11-16');
    // Day 1 has income 5000000 and expense 150000 -> subtotal net is 4850000
    expect(h1.subtotalMinor).toBe(5000000 - 150000);
    expect(h1.expenseMinor).toBe(150000);
    expect(h1.incomeMinor).toBe(5000000);

    const item1 = list[1] as HistoryRowItem;
    const item2 = list[2] as HistoryRowItem;
    expect(item1.type).toBe('item');
    expect(item2.type).toBe('item');
    expect(item1.transaction.id).toBe('tx2'); // Higher createdAt
    expect(item2.transaction.id).toBe('tx1');

    // Day 2: 2026-11-15
    const h2 = list[3] as HistoryHeaderItem;
    expect(h2.date).toBe('2026-11-15');
    expect(h2.subtotalMinor).toBe(-300000);

    const item3 = list[4] as HistoryRowItem;
    expect(item3.transaction.id).toBe('tx3');

    // Day 3: 2026-10-30
    const h3 = list[5] as HistoryHeaderItem;
    expect(h3.date).toBe('2026-10-30');
    expect(h3.subtotalMinor).toBe(-80000);
  });
});

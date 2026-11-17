// src/features/history/historyTypes.ts
// Types for History list, day grouping, and filtering.

import { Transaction } from '../../db/schema';

export type HistoryKindFilter = 'all' | 'expense' | 'income';
export type HistoryDateFilter = 'all' | 'this_month' | 'last_month' | 'last_90_days';

export interface TransactionWithCategory extends Transaction {
  categoryName: string;
  categoryIcon: string;
  categoryColorKey: string;
}

export interface HistoryHeaderItem {
  id: string;
  type: 'header';
  date: string; // YYYY-MM-DD
  displayDate: string;
  subtotalMinor: number;
  expenseMinor: number;
  incomeMinor: number;
}

export interface HistoryRowItem {
  id: string;
  type: 'item';
  transaction: TransactionWithCategory;
}

export type HistoryListItem = HistoryHeaderItem | HistoryRowItem;

export interface HistoryFilterState {
  searchQuery: string;
  kind: HistoryKindFilter;
  categoryId: string; // 'all' or category UUID
  dateFilter: HistoryDateFilter;
}

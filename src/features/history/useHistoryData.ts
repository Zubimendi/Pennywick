// src/features/history/useHistoryData.ts
// Hook managing History state, transactions, filtering, and mutations (delete, undo, update).

import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { isNull, desc } from 'drizzle-orm';
import { db } from '../../db/client';
import { transactions, categories, Category } from '../../db/schema';
import {
  deleteTransaction,
  undoDeleteTransaction,
  updateTransaction,
  UpdateTransactionInput,
} from '../../db/repositories/transactions';
import { getSetting, SETTINGS_KEYS } from '../../db/repositories/settings';
import { DEFAULT_CURRENCY } from '../../data/currencies';
import { useUiStore } from '../../ui/theme/uiStore';
import {
  TransactionWithCategory,
  HistoryFilterState,
  HistoryListItem,
} from './historyTypes';
import { filterTransactions, buildHistoryList } from './historyUtils';

export interface UseHistoryDataResult {
  isLoading: boolean;
  error: Error | null;
  currency: string;
  allCategories: Category[];
  filters: HistoryFilterState;
  setSearchQuery: (query: string) => void;
  setKindFilter: (kind: HistoryFilterState['kind']) => void;
  setCategoryFilter: (categoryId: string) => void;
  setDateFilter: (dateFilter: HistoryFilterState['dateFilter']) => void;
  resetFilters: () => void;
  filteredItems: HistoryListItem[];
  totalRawCount: number;
  totalFilteredCount: number;
  deleteEntry: (id: string) => Promise<void>;
  undoDelete: (id: string) => Promise<void>;
  updateEntry: (id: string, updates: UpdateTransactionInput) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const initialFilters: HistoryFilterState = {
  searchQuery: '',
  kind: 'all',
  categoryId: 'all',
  dateFilter: 'all',
};

export function useHistoryData(): UseHistoryDataResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionWithCategory[]>([]);
  const [filters, setFilters] = useState<HistoryFilterState>(initialFilters);

  const showToast = useUiStore((state) => state.showToast);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Currency
      const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
      if (savedCurrency) {
        setCurrency(savedCurrency);
      }

      // Categories
      const catRows = await db
        .select()
        .from(categories)
        .where(isNull(categories.deletedAt));
      setAllCategories(catRows);

      const catMap = new Map<string, Category>();
      for (const cat of catRows) {
        catMap.set(cat.id, cat);
      }

      // Transactions
      const txRows = await db
        .select()
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

      const enriched: TransactionWithCategory[] = txRows.map((tx) => {
        const cat = catMap.get(tx.categoryId);
        return {
          ...tx,
          categoryName: cat?.name ?? 'General',
          categoryIcon: cat?.icon ?? 'card-outline',
          categoryColorKey: cat?.colorKey ?? 'cat10',
        };
      });

      setAllTransactions(enriched);
    } catch (err) {
      console.error('Failed to load history data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load history'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setKindFilter = useCallback((kind: HistoryFilterState['kind']) => {
    setFilters((prev) => ({ ...prev, kind }));
  }, []);

  const setCategoryFilter = useCallback((categoryId: string) => {
    setFilters((prev) => ({ ...prev, categoryId }));
  }, []);

  const setDateFilter = useCallback((dateFilter: HistoryFilterState['dateFilter']) => {
    setFilters((prev) => ({ ...prev, dateFilter }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const undoDelete = useCallback(
    async (id: string): Promise<void> => {
      await undoDeleteTransaction(id);
      await loadData();
    },
    [loadData]
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      const result = await deleteTransaction(id);
      if (result.ok) {
        showToast({
          message: 'Entry removed.',
          actionLabel: 'Undo',
          durationMs: 5000,
          onAction: () => {
            void undoDelete(id);
          },
        });
        await loadData();
      }
    },
    [loadData, showToast, undoDelete]
  );

  const updateEntry = useCallback(
    async (id: string, updates: UpdateTransactionInput): Promise<boolean> => {
      const result = await updateTransaction(id, updates);
      if (result.ok) {
        await loadData();
        return true;
      }
      return false;
    },
    [loadData]
  );

  const filteredTransactions = useMemo(() => {
    return filterTransactions(allTransactions, filters);
  }, [allTransactions, filters]);

  const filteredItems = useMemo(() => {
    return buildHistoryList(filteredTransactions);
  }, [filteredTransactions]);

  return {
    isLoading,
    error,
    currency,
    allCategories,
    filters,
    setSearchQuery,
    setKindFilter,
    setCategoryFilter,
    setDateFilter,
    resetFilters,
    filteredItems,
    totalRawCount: allTransactions.length,
    totalFilteredCount: filteredTransactions.length,
    deleteEntry,
    undoDelete,
    updateEntry,
    refetch: loadData,
  };
}

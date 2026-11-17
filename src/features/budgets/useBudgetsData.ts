// src/features/budgets/useBudgetsData.ts
// Hook to load budgets with spending data, status calculations, and categories.

import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { categories, Category } from '../../db/schema';
import {
  listBudgets,
  setBudget,
  deleteBudget,
  BudgetWithSpending,
} from '../../db/repositories/budgets';
import { getSetting, SETTINGS_KEYS } from '../../db/repositories/settings';
import { DEFAULT_CURRENCY } from '../../data/currencies';
import { toMonthKey, getToday } from '../../domain/dates';
import { calculateMonthBudgetSummary } from '../../domain/budgets';
import { useUiStore } from '../../ui/theme/uiStore';

export interface EnrichedBudget extends BudgetWithSpending {
  categoryName: string;
  categoryIcon: string;
  categoryColorKey: string;
}

export interface UseBudgetsDataResult {
  isLoading: boolean;
  error: Error | null;
  currency: string;
  monthKey: string;
  budgets: EnrichedBudget[];
  unbudgetedCategories: Category[];
  monthSummary: {
    totalBudgetedMinor: number;
    totalSpentMinor: number;
    totalRemainingMinor: number;
    overallPercentage: number;
  };
  saveBudget: (categoryId: string, limitMinor: number) => Promise<boolean>;
  removeBudget: (budgetId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useBudgetsData(): UseBudgetsDataResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [monthKey] = useState(() => toMonthKey(getToday()));
  const [budgets, setBudgets] = useState<EnrichedBudget[]>([]);
  const [unbudgetedCategories, setUnbudgetedCategories] = useState<Category[]>([]);

  const showToast = useUiStore((state) => state.showToast);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Currency
      const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
      if (savedCurrency) setCurrency(savedCurrency);

      // Load all expense categories
      const allCats = await db
        .select()
        .from(categories)
        .where(isNull(categories.deletedAt));

      const expenseCats = allCats.filter((c) => c.kind === 'expense' && !c.archived);
      const catMap = new Map<string, Category>();
      for (const cat of allCats) {
        catMap.set(cat.id, cat);
      }

      // Load budgets with spending
      const rawBudgets = await listBudgets(monthKey);

      const budgetedCategoryIds = new Set<string>();
      const enriched: EnrichedBudget[] = rawBudgets.map((b) => {
        budgetedCategoryIds.add(b.categoryId);
        const cat = catMap.get(b.categoryId);
        return {
          ...b,
          categoryName: cat?.name ?? 'Category',
          categoryIcon: cat?.icon ?? 'card-outline',
          categoryColorKey: cat?.colorKey ?? 'cat10',
        };
      });

      // Unbudgeted active expense categories
      const unbudgeted = expenseCats.filter((c) => !budgetedCategoryIds.has(c.id));

      setBudgets(enriched);
      setUnbudgetedCategories(unbudgeted);
    } catch (err) {
      console.error('Failed to load budgets:', err);
      setError(err instanceof Error ? err : new Error('Failed to load budgets'));
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const saveBudget = useCallback(
    async (categoryId: string, limitMinor: number): Promise<boolean> => {
      const res = await setBudget({ categoryId, limitMinor });
      if (res.ok) {
        showToast({ message: 'Budget updated' });
        await loadData();
        return true;
      }
      return false;
    },
    [loadData, showToast]
  );

  const removeBudget = useCallback(
    async (budgetId: string): Promise<boolean> => {
      const res = await deleteBudget(budgetId);
      if (res.ok) {
        showToast({ message: 'Budget removed' });
        await loadData();
        return true;
      }
      return false;
    },
    [loadData, showToast]
  );

  const monthSummary = useMemo(() => {
    return calculateMonthBudgetSummary(budgets);
  }, [budgets]);

  return {
    isLoading,
    error,
    currency,
    monthKey,
    budgets,
    unbudgetedCategories,
    monthSummary,
    saveBudget,
    removeBudget,
    refetch: loadData,
  };
}

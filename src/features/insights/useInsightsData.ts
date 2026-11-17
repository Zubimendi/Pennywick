// src/features/insights/useInsightsData.ts
// Hook to query data for Insights screen: monthly aggregates, previous month comparison, categories, and daily bars.

import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { db } from '../../db/client';
import { monthlyTotals, categories, transactions, Category } from '../../db/schema';
import { getSetting, SETTINGS_KEYS } from '../../db/repositories/settings';
import { DEFAULT_CURRENCY } from '../../data/currencies';
import {
  toMonthKey,
  getToday,
  getPreviousMonthKey,
  getNextMonthKey,
  getMonthBoundaries,
} from '../../domain/dates';
import {
  computeMonthComparison,
  computeCategoryShares,
  computeDailySpendingBars,
  CategoryShareItem,
  DailyBarItem,
  MonthComparisonResult,
} from '../../domain/insights';
import { lightColors } from '../../ui/theme/colors';

export interface UseInsightsDataResult {
  isLoading: boolean;
  error: Error | null;
  currency: string;
  monthKey: string;
  totalExpenseMinor: number;
  totalIncomeMinor: number;
  comparison: MonthComparisonResult;
  categoryShares: CategoryShareItem[];
  dailyBars: DailyBarItem[];
  maxDailyMinor: number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  setMonth: (monthKey: string) => void;
  refetch: () => Promise<void>;
}

export function useInsightsData(): UseInsightsDataResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [monthKey, setMonthKey] = useState(() => toMonthKey(getToday()));
  const [totalExpenseMinor, setTotalExpenseMinor] = useState(0);
  const [totalIncomeMinor, setTotalIncomeMinor] = useState(0);
  const [previousExpenseMinor, setPreviousExpenseMinor] = useState(0);
  const [categoryItems, setCategoryItems] = useState<
    Array<{
      id: string;
      name: string;
      icon: string;
      colorHex: string;
      totalMinor: number;
    }>
  >([]);
  const [dailyTotalsMap, setDailyTotalsMap] = useState<Map<string, number>>(new Map());

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Currency
      const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
      if (savedCurrency) setCurrency(savedCurrency);

      // 2. Categories
      const catRows = await db.select().from(categories);
      const catMap = new Map<string, Category>();
      for (const cat of catRows) {
        catMap.set(cat.id, cat);
      }

      // 3. Current month totals from monthly_totals cache
      const currentTotals = await db
        .select()
        .from(monthlyTotals)
        .where(eq(monthlyTotals.monthKey, monthKey));

      let expenseSum = 0;
      let incomeSum = 0;
      const catSpendings: Array<{
        id: string;
        name: string;
        icon: string;
        colorHex: string;
        totalMinor: number;
      }> = [];

      for (const row of currentTotals) {
        if (row.kind === 'expense') {
          expenseSum += row.totalMinor;
          const cat = catMap.get(row.categoryId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hex = (lightColors.categories as any)[cat?.colorKey ?? 'cat10'] ?? lightColors.primary;
          catSpendings.push({
            id: row.categoryId,
            name: cat?.name ?? 'Other',
            icon: cat?.icon ?? 'card-outline',
            colorHex: hex,
            totalMinor: row.totalMinor,
          });
        } else if (row.kind === 'income') {
          incomeSum += row.totalMinor;
        }
      }

      setTotalExpenseMinor(expenseSum);
      setTotalIncomeMinor(incomeSum);
      setCategoryItems(catSpendings);

      // 4. Previous month totals for comparison
      const prevMonthKey = getPreviousMonthKey(monthKey);
      const prevTotals = await db
        .select()
        .from(monthlyTotals)
        .where(and(eq(monthlyTotals.monthKey, prevMonthKey), eq(monthlyTotals.kind, 'expense')));

      const prevExpenseSum = prevTotals.reduce((sum, r) => sum + r.totalMinor, 0);
      setPreviousExpenseMinor(prevExpenseSum);

      // 5. Daily transactions in current month
      const boundaries = getMonthBoundaries(monthKey);
      const txRows = await db
        .select()
        .from(transactions)
        .where(
          and(
            gte(transactions.occurredOn, boundaries.startOn),
            lte(transactions.occurredOn, boundaries.endOn),
            eq(transactions.kind, 'expense'),
            isNull(transactions.deletedAt)
          )
        );

      const dailyMap = new Map<string, number>();
      for (const tx of txRows) {
        const cur = dailyMap.get(tx.occurredOn) ?? 0;
        dailyMap.set(tx.occurredOn, cur + tx.amountMinor);
      }
      setDailyTotalsMap(dailyMap);
    } catch (err) {
      console.error('Failed to load insights data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load insights'));
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const goToPreviousMonth = useCallback(() => {
    setMonthKey((prev) => getPreviousMonthKey(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonthKey((prev) => getNextMonthKey(prev));
  }, []);

  const comparison = useMemo(() => {
    return computeMonthComparison(totalExpenseMinor, previousExpenseMinor);
  }, [totalExpenseMinor, previousExpenseMinor]);

  const categoryShares = useMemo(() => {
    return computeCategoryShares(categoryItems, totalExpenseMinor);
  }, [categoryItems, totalExpenseMinor]);

  const { bars: dailyBars, maxDailyMinor } = useMemo(() => {
    const boundaries = getMonthBoundaries(monthKey);
    return computeDailySpendingBars(monthKey, boundaries.daysInMonth, dailyTotalsMap);
  }, [monthKey, dailyTotalsMap]);

  return {
    isLoading,
    error,
    currency,
    monthKey,
    totalExpenseMinor,
    totalIncomeMinor,
    comparison,
    categoryShares,
    dailyBars,
    maxDailyMinor,
    goToPreviousMonth,
    goToNextMonth,
    setMonth: setMonthKey,
    refetch: loadData,
  };
}

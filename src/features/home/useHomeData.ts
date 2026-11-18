// src/features/home/useHomeData.ts
// Hook to query data for the Home screen.
// Reads from local SQLite via cached aggregates and repositories.

import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../../db/client';
import { monthlyTotals, categories, transactions, budgets, Category, Transaction } from '../../db/schema';
import { getSetting, SETTINGS_KEYS } from '../../db/repositories/settings';
import { toMonthKey, getToday } from '../../domain/dates';
import { DEFAULT_CURRENCY } from '../../data/currencies';
import { computeBudgetStatus, BudgetStatus } from '../../db/repositories/budgets';
import { SplinePoint } from '../../ui/charts/CurvedSplineChart';

export interface TopCategoryItem {
  id: string;
  name: string;
  icon: string;
  colorKey: string;
  totalMinor: number;
  sharePercentage: number;
}

export interface HomeBudgetItem {
  id: string;
  categoryId: string;
  categoryName: string;
  limitMinor: number;
  spentMinor: number;
  remainingMinor: number;
  percentageUsed: number;
  status: BudgetStatus;
}

export interface HomeData {
  isLoading: boolean;
  error: Error | null;
  currency: string;
  monthKey: string;
  spentThisMonthMinor: number;
  incomeThisMonthMinor: number;
  leftMinor: number;
  isEmpty: boolean;
  topCategories: TopCategoryItem[];
  urgentBudgets: HomeBudgetItem[];
  recentEntries: Array<Transaction & { categoryName: string; categoryIcon: string; categoryColorKey: string }>;
  trendPoints: SplinePoint[];
  refetch: () => Promise<void>;
}

export function useHomeData(): HomeData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [monthKey] = useState(() => toMonthKey(getToday()));
  const [spentThisMonthMinor, setSpentThisMonthMinor] = useState(0);
  const [incomeThisMonthMinor, setIncomeThisMonthMinor] = useState(0);
  const [topCategories, setTopCategories] = useState<TopCategoryItem[]>([]);
  const [urgentBudgets, setUrgentBudgets] = useState<HomeBudgetItem[]>([]);
  const [trendPoints, setTrendPoints] = useState<SplinePoint[]>([]);
  const [recentEntries, setRecentEntries] = useState<
    Array<Transaction & { categoryName: string; categoryIcon: string; categoryColorKey: string }>
  >([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      if (isFirstLoad.current) {
        setIsLoading(true);
      }
      setError(null);

      // 1. Get Currency Setting
      const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
      if (savedCurrency) {
        setCurrency(savedCurrency);
      }

      // 2. Load Categories map
      const allCategories = await db.select().from(categories);
      const categoryMap = new Map<string, Category>();
      for (const cat of allCategories) {
        categoryMap.set(cat.id, cat);
      }

      // 3. Load Monthly Totals for current month
      const currentMonthTotals = await db
        .select()
        .from(monthlyTotals)
        .where(eq(monthlyTotals.monthKey, monthKey));

      let totalExpense = 0;
      let totalIncome = 0;
      const expenseByCategory: Array<{ categoryId: string; totalMinor: number }> = [];

      for (const t of currentMonthTotals) {
        if (t.kind === 'expense') {
          totalExpense += t.totalMinor;
          expenseByCategory.push({ categoryId: t.categoryId, totalMinor: t.totalMinor });
        } else if (t.kind === 'income') {
          totalIncome += t.totalMinor;
        }
      }

      setSpentThisMonthMinor(totalExpense);
      setIncomeThisMonthMinor(totalIncome);

      // 4. Calculate Top 3 Categories
      expenseByCategory.sort((a, b) => b.totalMinor - a.totalMinor);
      const top3 = expenseByCategory.slice(0, 3).map((item) => {
        const cat = categoryMap.get(item.categoryId);
        const share = totalExpense > 0 ? (item.totalMinor / totalExpense) * 100 : 0;
        return {
          id: item.categoryId,
          name: cat?.name ?? 'Other',
          icon: cat?.icon ?? 'ellipse',
          colorKey: cat?.colorKey ?? 'cat10',
          totalMinor: item.totalMinor,
          sharePercentage: Math.round(share),
        };
      });
      setTopCategories(top3);

      // 5. Load Budgets closest to limit (up to 3)
      const activeBudgets = await db
        .select()
        .from(budgets)
        .where(isNull(budgets.deletedAt));

      const budgetsWithProgress: HomeBudgetItem[] = [];
      const spendingMap = new Map<string, number>();
      for (const t of currentMonthTotals) {
        if (t.kind === 'expense') {
          spendingMap.set(t.categoryId, t.totalMinor);
        }
      }

      for (const b of activeBudgets) {
        const cat = categoryMap.get(b.categoryId);
        const spent = spendingMap.get(b.categoryId) ?? 0;
        const status = computeBudgetStatus(spent, b.limitMinor);

        budgetsWithProgress.push({
          id: b.id,
          categoryId: b.categoryId,
          categoryName: cat?.name ?? 'Category',
          limitMinor: b.limitMinor,
          spentMinor: spent,
          remainingMinor: status.remainingMinor,
          percentageUsed: status.percentageUsed,
          status: status.status,
        });
      }

      // Sort by percentage used descending (most critical first)
      budgetsWithProgress.sort((a, b) => b.percentageUsed - a.percentageUsed);
      setUrgentBudgets(budgetsWithProgress.slice(0, 3));

      // 6. Load Recent 5 Transactions
      const recent = await db
        .select()
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
        .limit(5);

      const recentWithCategory = recent.map((tx) => {
        const cat = categoryMap.get(tx.categoryId);
        return {
          ...tx,
          categoryName: cat?.name ?? 'General',
          categoryIcon: cat?.icon ?? 'card-outline',
          categoryColorKey: cat?.colorKey ?? 'cat10',
        };
      });
      setRecentEntries(recentWithCategory);

      // 7. Compute trend points for the month (W1, W2, W3, W4, W5)
      const monthTx = await db
        .select({
          amountMinor: transactions.amountMinor,
          occurredOn: transactions.occurredOn,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.monthKey, monthKey),
            eq(transactions.kind, 'expense'),
            isNull(transactions.deletedAt)
          )
        );

      const daySpendMap = new Map<number, number>();
      for (const tx of monthTx) {
        const dayNum = parseInt(tx.occurredOn.slice(8, 10), 10);
        daySpendMap.set(dayNum, (daySpendMap.get(dayNum) ?? 0) + tx.amountMinor);
      }

      const milestones = [
        { label: 'W1', endDay: 7 },
        { label: 'W2', endDay: 14 },
        { label: 'W3', endDay: 21 },
        { label: 'W4', endDay: 28 },
        { label: 'W5', endDay: 31 },
      ];

      let runningTotal = 0;
      let curDay = 1;
      const points: SplinePoint[] = [];

      for (const m of milestones) {
        while (curDay <= m.endDay) {
          runningTotal += daySpendMap.get(curDay) ?? 0;
          curDay++;
        }
        points.push({ xLabel: m.label, value: runningTotal });
      }

      setTrendPoints(points);

      // Check if there are zero non-deleted transactions across the app
      const totalCount = await db
        .select()
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .limit(1);

      setIsEmpty(totalCount.length === 0);
    } catch (err) {
      console.error('Failed to load home screen data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load home data'));
    } finally {
      setIsLoading(false);
      isFirstLoad.current = false;
    }
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  return {
    isLoading,
    error,
    currency,
    monthKey,
    spentThisMonthMinor,
    incomeThisMonthMinor,
    leftMinor: incomeThisMonthMinor - spentThisMonthMinor,
    isEmpty,
    topCategories,
    urgentBudgets,
    recentEntries,
    trendPoints,
    refetch: fetchData,
  };
}

// src/db/repositories/budgets.ts
// Repository for category budgets.
// Enforces one active budget per category.

import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { budgets, Budget, NewBudget, monthlyTotals } from '../schema';
import { maybeEnqueueOutbox } from './outbox';
import { newId } from '../../lib/id';
import { now } from '../../lib/clock';
import { toMonthKey, getToday } from '../../domain/dates';
import { Result, err, tryCatch } from '../../api/errors';

export type BudgetStatus = 'onTrack' | 'watch' | 'over';

export interface BudgetWithSpending extends Budget {
  spentMinor: number;
  remainingMinor: number;
  percentageUsed: number;
  status: BudgetStatus;
}

export function computeBudgetStatus(spentMinor: number, limitMinor: number): {
  status: BudgetStatus;
  percentageUsed: number;
  remainingMinor: number;
} {
  if (limitMinor <= 0) {
    return { status: 'over', percentageUsed: 1, remainingMinor: 0 };
  }

  const ratio = spentMinor / limitMinor;
  const remainingMinor = limitMinor - spentMinor;

  let status: BudgetStatus = 'onTrack';
  if (ratio > 1.0) {
    status = 'over';
  } else if (ratio >= 0.8) {
    status = 'watch';
  }

  return {
    status,
    percentageUsed: ratio,
    remainingMinor,
  };
}

export async function setBudget(input: {
  categoryId: string;
  limitMinor: number;
}): Promise<Result<Budget>> {
  if (input.limitMinor <= 0) {
    return err('validation', 'Budget limit must be greater than zero');
  }

  return tryCatch(async () => {
    const timestamp = now();

    // Check for existing active budget for this category
    const existing = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.categoryId, input.categoryId), isNull(budgets.deletedAt)))
      .limit(1);

    const oldRow = existing[0];
    if (oldRow) {
      // Update existing budget
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        await tx
          .update(budgets)
          .set({
            limitMinor: input.limitMinor,
            updatedAt: timestamp,
          })
          .where(eq(budgets.id, oldRow.id));

        await maybeEnqueueOutbox(tx, 'budget', oldRow.id, 'update', {
          limit_minor: input.limitMinor,
          updated_at: timestamp,
        });
      });

      return {
        ...oldRow,
        limitMinor: input.limitMinor,
        updatedAt: timestamp,
      };
    } else {
      // Insert new budget
      const id = newId();
      const newRow: NewBudget = {
        id,
        categoryId: input.categoryId,
        limitMinor: input.limitMinor,
        updatedAt: timestamp,
        deletedAt: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        await tx.insert(budgets).values(newRow);
        await maybeEnqueueOutbox(tx, 'budget', id, 'create', { ...newRow });
      });

      return newRow as Budget;
    }
  });
}

export async function deleteBudget(id: string): Promise<Result<void>> {
  return tryCatch(async () => {
    const timestamp = now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(budgets)
        .set({
          deletedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(budgets.id, id));

      await maybeEnqueueOutbox(tx, 'budget', id, 'delete', {
        id,
        deleted_at: timestamp,
      });
    });
  });
}

export async function getBudgetByCategory(categoryId: string): Promise<Budget | null> {
  const rows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.categoryId, categoryId), isNull(budgets.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listBudgets(monthKey: string = toMonthKey(getToday())): Promise<BudgetWithSpending[]> {
  const activeBudgets = await db
    .select()
    .from(budgets)
    .where(isNull(budgets.deletedAt));

  // Get current monthly totals for expense categories in this month
  const totals = await db
    .select()
    .from(monthlyTotals)
    .where(and(eq(monthlyTotals.monthKey, monthKey), eq(monthlyTotals.kind, 'expense')));

  const spendingMap = new Map<string, number>();
  for (const t of totals) {
    spendingMap.set(t.categoryId, t.totalMinor);
  }

  return activeBudgets.map((b) => {
    const spentMinor = spendingMap.get(b.categoryId) ?? 0;
    const { status, percentageUsed, remainingMinor } = computeBudgetStatus(
      spentMinor,
      b.limitMinor
    );

    return {
      ...b,
      spentMinor,
      remainingMinor,
      percentageUsed,
      status,
    };
  });
}

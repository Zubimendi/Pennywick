// src/db/repositories/recurring.ts
// Repository for recurring rules.

import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { recurringRules, RecurringRule, NewRecurringRule } from '../schema';
import { maybeEnqueueOutbox } from './outbox';
import { newId } from '../../lib/id';
import { now } from '../../lib/clock';
import { Result, err, tryCatch } from '../../api/errors';

export interface CreateRecurringRuleInput {
  kind: 'expense' | 'income';
  amountMinor: number;
  categoryId: string;
  note?: string | null;
  frequency: 'weekly' | 'monthly';
  day: number; // 1..7 for weekly (Mon=1), 1..31 for monthly
  startOn: string; // YYYY-MM-DD
  active?: boolean;
}

export interface UpdateRecurringRuleInput {
  kind?: 'expense' | 'income';
  amountMinor?: number;
  categoryId?: string;
  note?: string | null;
  frequency?: 'weekly' | 'monthly';
  day?: number;
  active?: boolean;
  lastGeneratedOn?: string | null;
}

export async function createRecurringRule(
  input: CreateRecurringRuleInput
): Promise<Result<RecurringRule>> {
  if (input.amountMinor <= 0) {
    return err('validation', 'Amount must be greater than zero');
  }

  if (input.frequency === 'weekly' && (input.day < 1 || input.day > 7)) {
    return err('validation', 'Weekly frequency day must be between 1 and 7');
  }

  if (input.frequency === 'monthly' && (input.day < 1 || input.day > 31)) {
    return err('validation', 'Monthly frequency day must be between 1 and 31');
  }

  return tryCatch(async () => {
    const id = newId();
    const timestamp = now();

    const newRow: NewRecurringRule = {
      id,
      kind: input.kind,
      amountMinor: input.amountMinor,
      categoryId: input.categoryId,
      note: input.note ?? null,
      frequency: input.frequency,
      day: input.day,
      startOn: input.startOn,
      lastGeneratedOn: null,
      active: input.active ?? true,
      updatedAt: timestamp,
      deletedAt: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx.insert(recurringRules).values(newRow);
      await maybeEnqueueOutbox(tx, 'recurring_rule', id, 'create', {
        ...newRow,
      });
    });

    return newRow as RecurringRule;
  });
}

export async function updateRecurringRule(
  id: string,
  updates: UpdateRecurringRuleInput
): Promise<Result<RecurringRule>> {
  if (updates.amountMinor !== undefined && updates.amountMinor <= 0) {
    return err('validation', 'Amount must be greater than zero');
  }

  return tryCatch(async () => {
    const existing = await db
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.id, id))
      .limit(1);

    const oldRow = existing[0];
    if (!oldRow) {
      throw new Error(`Recurring rule ${id} not found`);
    }

    const timestamp = now();
    const updatedFields = {
      kind: updates.kind ?? oldRow.kind,
      amountMinor: updates.amountMinor ?? oldRow.amountMinor,
      categoryId: updates.categoryId ?? oldRow.categoryId,
      note: updates.note !== undefined ? updates.note : oldRow.note,
      frequency: updates.frequency ?? oldRow.frequency,
      day: updates.day ?? oldRow.day,
      active: updates.active !== undefined ? updates.active : oldRow.active,
      lastGeneratedOn:
        updates.lastGeneratedOn !== undefined
          ? updates.lastGeneratedOn
          : oldRow.lastGeneratedOn,
      updatedAt: timestamp,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(recurringRules)
        .set(updatedFields)
        .where(eq(recurringRules.id, id));

      await maybeEnqueueOutbox(tx, 'recurring_rule', id, 'update', {
        ...updatedFields,
      });
    });

    return {
      ...oldRow,
      ...updatedFields,
    };
  });
}

export async function deleteRecurringRule(id: string): Promise<Result<void>> {
  return tryCatch(async () => {
    const timestamp = now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(recurringRules)
        .set({
          deletedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(recurringRules.id, id));

      await maybeEnqueueOutbox(tx, 'recurring_rule', id, 'delete', {
        id,
        deleted_at: timestamp,
      });
    });
  });
}

export async function getRecurringRuleById(id: string): Promise<RecurringRule | null> {
  const rows = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, id), isNull(recurringRules.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listRecurringRules(activeOnly = false): Promise<RecurringRule[]> {
  const conditions = [isNull(recurringRules.deletedAt)];
  if (activeOnly) {
    conditions.push(eq(recurringRules.active, true));
  }

  return db
    .select()
    .from(recurringRules)
    .where(and(...conditions));
}

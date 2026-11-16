// src/db/repositories/transactions.ts
// Repository for transactions.
// Every write runs in ONE database transaction: entity change, recompute affected monthly_totals, and optional outbox.

import { eq, desc, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { transactions, Transaction, NewTransaction } from '../schema';
import { recomputeBuckets, BucketKey } from '../aggregates';
import { maybeEnqueueOutbox } from './outbox';
import { toMonthKey } from '../../domain/dates';
import { newId } from '../../lib/id';
import { now } from '../../lib/clock';
import { Result, err, tryCatch } from '../../api/errors';

export interface CreateTransactionInput {
  id?: string;
  kind: 'expense' | 'income';
  amountMinor: number;
  categoryId: string;
  occurredOn: string; // YYYY-MM-DD
  note?: string | null;
  recurringRuleId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface UpdateTransactionInput {
  kind?: 'expense' | 'income';
  amountMinor?: number;
  categoryId?: string;
  occurredOn?: string;
  note?: string | null;
  recurringRuleId?: string | null;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Result<Transaction>> {
  if (input.amountMinor <= 0) {
    return err('validation', 'Amount must be greater than zero');
  }

  return tryCatch(async () => {
    const id = input.id ?? newId();
    const monthKey = toMonthKey(input.occurredOn);
    const timestamp = input.createdAt ?? now();
    const updated = input.updatedAt ?? timestamp;

    const newRow: NewTransaction = {
      id,
      kind: input.kind,
      amountMinor: input.amountMinor,
      categoryId: input.categoryId,
      occurredOn: input.occurredOn,
      monthKey,
      note: input.note ?? null,
      recurringRuleId: input.recurringRuleId ?? null,
      createdAt: timestamp,
      updatedAt: updated,
      deletedAt: null,
    };

    const bucketKey: BucketKey = {
      monthKey,
      categoryId: input.categoryId,
      kind: input.kind,
    };

    // Execute in one transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx.insert(transactions).values(newRow);
      await recomputeBuckets(tx, [bucketKey]);
      await maybeEnqueueOutbox(tx, 'transaction', id, 'create', {
        ...newRow,
      });
    });

    return newRow as Transaction;
  });
}

export async function updateTransaction(
  id: string,
  updates: UpdateTransactionInput
): Promise<Result<Transaction>> {
  if (updates.amountMinor !== undefined && updates.amountMinor <= 0) {
    return err('validation', 'Amount must be greater than zero');
  }

  return tryCatch(async () => {
    const existingRows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    const oldRow = existingRows[0];
    if (!oldRow) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const newKind = updates.kind ?? oldRow.kind;
    const newAmount = updates.amountMinor ?? oldRow.amountMinor;
    const newCategory = updates.categoryId ?? oldRow.categoryId;
    const newDate = updates.occurredOn ?? oldRow.occurredOn;
    const newMonthKey = toMonthKey(newDate);
    const newNote = updates.note !== undefined ? updates.note : oldRow.note;
    const updatedTimestamp = now();

    const oldBucketKey: BucketKey = {
      monthKey: oldRow.monthKey,
      categoryId: oldRow.categoryId,
      kind: oldRow.kind,
    };

    const newBucketKey: BucketKey = {
      monthKey: newMonthKey,
      categoryId: newCategory,
      kind: newKind,
    };

    const updatedFields = {
      kind: newKind,
      amountMinor: newAmount,
      categoryId: newCategory,
      occurredOn: newDate,
      monthKey: newMonthKey,
      note: newNote,
      updatedAt: updatedTimestamp,
    };

    // Execute in one transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(transactions)
        .set(updatedFields)
        .where(eq(transactions.id, id));

      await recomputeBuckets(tx, [oldBucketKey, newBucketKey]);
      await maybeEnqueueOutbox(tx, 'transaction', id, 'update', {
        ...updatedFields,
      });
    });

    return {
      ...oldRow,
      ...updatedFields,
    };
  });
}

export async function deleteTransaction(id: string): Promise<Result<void>> {
  return tryCatch(async () => {
    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return;
    }

    const timestamp = now();
    const bucketKey: BucketKey = {
      monthKey: row.monthKey,
      categoryId: row.categoryId,
      kind: row.kind,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(transactions)
        .set({
          deletedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(transactions.id, id));

      await recomputeBuckets(tx, [bucketKey]);
      await maybeEnqueueOutbox(tx, 'transaction', id, 'delete', {
        id,
        deleted_at: timestamp,
      });
    });
  });
}

export async function undoDeleteTransaction(id: string): Promise<Result<void>> {
  return tryCatch(async () => {
    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return;
    }

    const timestamp = now();
    const bucketKey: BucketKey = {
      monthKey: row.monthKey,
      categoryId: row.categoryId,
      kind: row.kind,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(transactions)
        .set({
          deletedAt: null,
          updatedAt: timestamp,
        })
        .where(eq(transactions.id, id));

      await recomputeBuckets(tx, [bucketKey]);
      await maybeEnqueueOutbox(tx, 'transaction', id, 'update', {
        id,
        deleted_at: null,
      });
    });
  });
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTransactions(filter?: {
  monthKey?: string;
  categoryId?: string;
  kind?: 'expense' | 'income';
  limit?: number;
}): Promise<Transaction[]> {
  const conditions = [isNull(transactions.deletedAt)];

  if (filter?.monthKey) {
    conditions.push(eq(transactions.monthKey, filter.monthKey));
  }
  if (filter?.categoryId) {
    conditions.push(eq(transactions.categoryId, filter.categoryId));
  }
  if (filter?.kind) {
    conditions.push(eq(transactions.kind, filter.kind));
  }

  let query = db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

  if (filter?.limit) {
    query = query.limit(filter.limit) as typeof query;
  }

  return query;
}

// src/db/repositories/categories.ts
// Repository for categories.
// Non-negotiable rule: Cannot delete a used category; archive instead.

import { eq, asc, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { categories, transactions, Category, NewCategory } from '../schema';
import { maybeEnqueueOutbox } from './outbox';
import { newId } from '../../lib/id';
import { now } from '../../lib/clock';
import { Result, err, tryCatch } from '../../api/errors';

export interface CreateCategoryInput {
  name: string;
  kind: 'expense' | 'income';
  icon: string;
  colorKey: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  kind?: 'expense' | 'income';
  icon?: string;
  colorKey?: string;
  sortOrder?: number;
}

export async function createCategory(input: CreateCategoryInput): Promise<Result<Category>> {
  if (!input.name.trim()) {
    return err('validation', 'Category name cannot be empty');
  }

  return tryCatch(async () => {
    const id = newId();
    const timestamp = now();

    const newRow: NewCategory = {
      id,
      name: input.name.trim(),
      kind: input.kind,
      icon: input.icon,
      colorKey: input.colorKey,
      sortOrder: input.sortOrder ?? 0,
      archived: false,
      isSeed: false,
      updatedAt: timestamp,
      deletedAt: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx.insert(categories).values(newRow);
      await maybeEnqueueOutbox(tx, 'category', id, 'create', { ...newRow });
    });

    return newRow as Category;
  });
}

export async function updateCategory(
  id: string,
  updates: UpdateCategoryInput
): Promise<Result<Category>> {
  return tryCatch(async () => {
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    const oldRow = existing[0];
    if (!oldRow) {
      throw new Error(`Category ${id} not found`);
    }

    const timestamp = now();
    const updatedFields = {
      name: updates.name ? updates.name.trim() : oldRow.name,
      kind: updates.kind ?? oldRow.kind,
      icon: updates.icon ?? oldRow.icon,
      colorKey: updates.colorKey ?? oldRow.colorKey,
      sortOrder: updates.sortOrder ?? oldRow.sortOrder,
      updatedAt: timestamp,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(categories)
        .set(updatedFields)
        .where(eq(categories.id, id));
      await maybeEnqueueOutbox(tx, 'category', id, 'update', { ...updatedFields });
    });

    return {
      ...oldRow,
      ...updatedFields,
    };
  });
}

export async function archiveCategory(id: string): Promise<Result<void>> {
  return tryCatch(async () => {
    const timestamp = now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(categories)
        .set({
          archived: true,
          updatedAt: timestamp,
        })
        .where(eq(categories.id, id));
      await maybeEnqueueOutbox(tx, 'category', id, 'update', {
        id,
        archived: true,
      });
    });
  });
}

export async function deleteCategory(id: string): Promise<Result<void>> {
  // Check if any transactions (including soft-deleted) reference this category
  const usedCount = await db
    .select()
    .from(transactions)
    .where(eq(transactions.categoryId, id))
    .limit(1);

  if (usedCount.length > 0) {
    return err(
      'validation',
      'Cannot delete a category with entries. Archive instead.'
    );
  }

  return tryCatch(async () => {
    const timestamp = now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .update(categories)
        .set({
          deletedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(categories.id, id));
      await maybeEnqueueOutbox(tx, 'category', id, 'delete', {
        id,
        deleted_at: timestamp,
      });
    });
  });
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCategories(options?: {
  kind?: 'expense' | 'income';
  includeArchived?: boolean;
}): Promise<Category[]> {
  const conditions = [isNull(categories.deletedAt)];

  if (options?.kind) {
    conditions.push(eq(categories.kind, options.kind));
  }
  if (!options?.includeArchived) {
    conditions.push(eq(categories.archived, false));
  }

  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.sortOrder));
}

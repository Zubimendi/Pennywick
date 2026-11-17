// src/sync/pull.ts
// Cursor-based pull sync from PocketBase to local SQLite with bucket recompute.

import { pb } from '../api/pb';
import { db } from '../db/client';
import { categories, transactions, budgets, recurringRules, syncState, outbox } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  shouldMergeServerRecord,
  mapServerCategoryToLocal,
  mapServerTransactionToLocal,
  mapServerBudgetToLocal,
  mapServerRecurringRuleToLocal,
} from './merge';
import { recomputeBuckets, BucketKey } from '../db/aggregates';
import { logger } from '../lib/logger';

const PAGE_SIZE = 200;

export interface PullStats {
  categoriesUpdated: number;
  rulesUpdated: number;
  budgetsUpdated: number;
  transactionsUpdated: number;
}

export async function pullChanges(): Promise<PullStats> {
  const stats: PullStats = {
    categoriesUpdated: 0,
    rulesUpdated: 0,
    budgetsUpdated: 0,
    transactionsUpdated: 0,
  };

  try {
    // 1. Categories first (parents before children)
    stats.categoriesUpdated = await pullCollection('categories', async (record, hasPending) => {
      const recordId = String(record.id);
      if (!shouldMergeServerRecord({ entityId: recordId, hasPendingOutbox: hasPending })) {
        return;
      }
      const local = mapServerCategoryToLocal(record);
      await db
        .insert(categories)
        .values({
          id: local.id as string,
          name: local.name as string,
          kind: local.kind as 'expense' | 'income',
          icon: local.icon as string,
          colorKey: local.colorKey as string,
          sortOrder: local.sortOrder as number,
          archived: Boolean(local.archived),
          isSeed: Boolean(local.isSeed),
          updatedAt: local.updatedAt as number,
          deletedAt: (local.deletedAt as number) || null,
        })
        .onConflictDoUpdate({
          target: categories.id,
          set: {
            name: local.name as string,
            kind: local.kind as 'expense' | 'income',
            icon: local.icon as string,
            colorKey: local.colorKey as string,
            sortOrder: local.sortOrder as number,
            archived: Boolean(local.archived),
            isSeed: Boolean(local.isSeed),
            updatedAt: local.updatedAt as number,
            deletedAt: (local.deletedAt as number) || null,
          },
        });
    });

    // 2. Recurring rules
    stats.rulesUpdated = await pullCollection('recurring_rules', async (record, hasPending) => {
      const recordId = String(record.id);
      if (!shouldMergeServerRecord({ entityId: recordId, hasPendingOutbox: hasPending })) {
        return;
      }
      const local = mapServerRecurringRuleToLocal(record);
      await db
        .insert(recurringRules)
        .values({
          id: local.id as string,
          kind: local.kind as 'expense' | 'income',
          amountMinor: local.amountMinor as number,
          categoryId: local.categoryId as string,
          note: (local.note as string) || null,
          frequency: local.frequency as 'weekly' | 'monthly',
          day: local.day as number,
          startOn: local.startOn as string,
          lastGeneratedOn: (local.lastGeneratedOn as string) || null,
          active: Boolean(local.active),
          updatedAt: local.updatedAt as number,
          deletedAt: (local.deletedAt as number) || null,
        })
        .onConflictDoUpdate({
          target: recurringRules.id,
          set: {
            kind: local.kind as 'expense' | 'income',
            amountMinor: local.amountMinor as number,
            categoryId: local.categoryId as string,
            note: (local.note as string) || null,
            frequency: local.frequency as 'weekly' | 'monthly',
            day: local.day as number,
            startOn: local.startOn as string,
            lastGeneratedOn: (local.lastGeneratedOn as string) || null,
            active: Boolean(local.active),
            updatedAt: local.updatedAt as number,
            deletedAt: (local.deletedAt as number) || null,
          },
        });
    });

    // 3. Budgets
    stats.budgetsUpdated = await pullCollection('budgets', async (record, hasPending) => {
      const recordId = String(record.id);
      if (!shouldMergeServerRecord({ entityId: recordId, hasPendingOutbox: hasPending })) {
        return;
      }
      const local = mapServerBudgetToLocal(record);
      await db
        .insert(budgets)
        .values({
          id: local.id as string,
          categoryId: local.categoryId as string,
          limitMinor: local.limitMinor as number,
          updatedAt: local.updatedAt as number,
          deletedAt: (local.deletedAt as number) || null,
        })
        .onConflictDoUpdate({
          target: budgets.id,
          set: {
            categoryId: local.categoryId as string,
            limitMinor: local.limitMinor as number,
            updatedAt: local.updatedAt as number,
            deletedAt: (local.deletedAt as number) || null,
          },
        });
    });

    // 4. Transactions with bucket recompute
    const affectedKeys: BucketKey[] = [];
    stats.transactionsUpdated = await pullCollection('transactions', async (record, hasPending) => {
      const recordId = String(record.id);
      if (!shouldMergeServerRecord({ entityId: recordId, hasPendingOutbox: hasPending })) {
        return;
      }
      const local = mapServerTransactionToLocal(record);
      const existing = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, local.id as string))
        .limit(1);

      if (existing[0]) {
        affectedKeys.push({
          monthKey: existing[0].monthKey,
          categoryId: existing[0].categoryId,
          kind: existing[0].kind,
        });
      }

      affectedKeys.push({
        monthKey: local.monthKey as string,
        categoryId: local.categoryId as string,
        kind: local.kind as 'expense' | 'income',
      });

      await db
        .insert(transactions)
        .values({
          id: local.id as string,
          kind: local.kind as 'expense' | 'income',
          amountMinor: local.amountMinor as number,
          categoryId: local.categoryId as string,
          occurredOn: local.occurredOn as string,
          monthKey: local.monthKey as string,
          note: (local.note as string) || null,
          recurringRuleId: (local.recurringRuleId as string) || null,
          createdAt: local.createdAt as number,
          updatedAt: local.updatedAt as number,
          deletedAt: (local.deletedAt as number) || null,
        })
        .onConflictDoUpdate({
          target: transactions.id,
          set: {
            kind: local.kind as 'expense' | 'income',
            amountMinor: local.amountMinor as number,
            categoryId: local.categoryId as string,
            occurredOn: local.occurredOn as string,
            monthKey: local.monthKey as string,
            note: (local.note as string) || null,
            recurringRuleId: (local.recurringRuleId as string) || null,
            updatedAt: local.updatedAt as number,
            deletedAt: (local.deletedAt as number) || null,
          },
        });
    });

    // Recompute affected buckets in SQLite after transactions are pulled
    if (affectedKeys.length > 0) {
      await recomputeBuckets(db, affectedKeys);
    }

    logger.debug('pullChanges:completed', {
      count: stats.transactionsUpdated + stats.categoriesUpdated,
    });
  } catch (err) {
    logger.warn('pullChanges:failed', { error: String(err) });
  }

  return stats;
}

async function pullCollection(
  collectionName: 'categories' | 'transactions' | 'budgets' | 'recurring_rules',
  applyFn: (record: Record<string, unknown>, hasPending: boolean) => Promise<void>
): Promise<number> {
  const cursorKey = `cursor:${collectionName}`;
  const cursorRows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.key, cursorKey))
    .limit(1);
  const cursor = cursorRows[0] ? Number(cursorRows[0].value) : 0;

  let page = 1;
  let totalProcessed = 0;
  let latestTimestamp = cursor;

  while (true) {
    const queryOptions: Record<string, string | number> = {
      sort: 'client_updated_at,id',
    };

    if (cursor > 0) {
      queryOptions.filter = `client_updated_at >= ${cursor}`;
    }

    const result = await pb.collection(collectionName).getList(page, PAGE_SIZE, queryOptions);

    if (result.items.length === 0) break;

    const pendingOps = await db
      .select()
      .from(outbox)
      .where(eq(outbox.status, 'pending'));
    const pendingEntityIds = new Set(pendingOps.map((o) => o.entityId));

    for (const item of result.items) {
      const raw = item as unknown as Record<string, unknown>;
      const hasPending = pendingEntityIds.has(item.id);
      await applyFn(raw, hasPending);

      const recTime = Number(raw.client_updated_at || raw.updatedAt || 0);
      if (recTime > latestTimestamp) {
        latestTimestamp = recTime;
      }
    }

    if (latestTimestamp > 0) {
      await db
        .insert(syncState)
        .values({ key: cursorKey, value: String(latestTimestamp) })
        .onConflictDoUpdate({
          target: syncState.key,
          set: { value: String(latestTimestamp) },
        });
    }

    totalProcessed += result.items.length;
    if (page >= result.totalPages) break;
    page++;
  }

  return totalProcessed;
}

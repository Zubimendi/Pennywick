// src/sync/push.ts
// Outbox push / drain execution with error classification and idempotency.

import { pb } from '../api/pb';
import { db } from '../db/client';
import { categories, transactions, budgets, recurringRules } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  getPendingOps,
  markOpSuccess,
  markOpRetryableFailure,
  markOpParked,
  parkDependentChildOps,
} from '../db/repositories/outbox';
import { coalesceOutbox, type CoalescedOp, type SyncEntity } from './outbox';
import { computeBackoffDelay } from './backoff';
import {
  mapServerCategoryToLocal,
  mapServerTransactionToLocal,
  mapServerBudgetToLocal,
  mapServerRecurringRuleToLocal,
} from './merge';
import { recomputeBuckets, BucketKey } from '../db/aggregates';
import { mapError } from '../api/errors';
import { logger } from '../lib/logger';
import { now } from '../lib/clock';
import { getSetting, SETTINGS_KEYS } from '../db/repositories/settings';

export interface DrainResult {
  processed: number;
  succeeded: number;
  parked: number;
  stoppedOnRetryable: boolean;
}

export async function drainOutbox(): Promise<DrainResult> {
  const result: DrainResult = {
    processed: 0,
    succeeded: 0,
    parked: 0,
    stoppedOnRetryable: false,
  };

  const pendingRows = await getPendingOps(now());
  if (pendingRows.length === 0) {
    return result;
  }

  const coalesced = coalesceOutbox(pendingRows);
  logger.debug('drainOutbox:starting', { count: coalesced.length });

  const ownerId = (await getSetting(SETTINGS_KEYS.SYNC_OWNER_ID)) || (pb.authStore.record?.id ?? '');

  for (const op of coalesced) {
    if (op.status === 'parked') {
      continue;
    }

    result.processed++;
    const outcome = await executeOp(op, ownerId);

    if (outcome.status === 'success') {
      result.succeeded++;
      await markOpSuccess(op.originalSeqs);
    } else if (outcome.status === 'retryable') {
      result.stoppedOnRetryable = true;
      const nextDelay = computeBackoffDelay(op.attempts + 1);
      const nextAttemptAt = now() + nextDelay;

      // Update all originalSeqs with retry backoff
      for (const seq of op.originalSeqs) {
        await markOpRetryableFailure(
          seq,
          op.attempts + 1,
          nextAttemptAt,
          outcome.error.message
        );
      }

      logger.warn('drainOutbox:stopped_on_retryable', {
        entity: op.entity,
        id: op.entityId,
        delayMs: nextDelay,
      });

      // Stop the drain on retryable error to preserve dependency ordering
      break;
    } else if (outcome.status === 'parked') {
      result.parked++;
      for (const seq of op.originalSeqs) {
        await markOpParked(seq, outcome.error.message);
      }
      if (op.entity === 'category') {
        await parkDependentChildOps(op.entityId);
        for (const other of coalesced) {
          if (other.entity !== 'category') {
            const catId =
              (other.payload as { category?: string; categoryId?: string })?.category ??
              (other.payload as { category?: string; categoryId?: string })?.categoryId;
            if (catId === op.entityId) {
              other.status = 'parked';
            }
          }
        }
      }
      logger.error('drainOutbox:parked_op', {
        entity: op.entity,
        id: op.entityId,
        error: outcome.error.message,
      });
      // Continue with next op
    }
  }

  logger.debug('drainOutbox:completed', {
    processed: result.processed,
    succeeded: result.succeeded,
    parked: result.parked,
    stoppedOnRetryable: result.stoppedOnRetryable,
  });

  return result;
}

type OpOutcome =
  | { status: 'success' }
  | { status: 'retryable'; error: { message: string } }
  | { status: 'parked'; error: { message: string } };

function getCollectionName(entity: SyncEntity): string {
  switch (entity) {
    case 'category':
      return 'categories';
    case 'transaction':
      return 'transactions';
    case 'budget':
      return 'budgets';
    case 'recurring_rule':
      return 'recurring_rules';
  }
}

async function executeOp(op: CoalescedOp, ownerId: string): Promise<OpOutcome> {
  const collectionName = getCollectionName(op.entity);

  try {
    if (op.op === 'create') {
      try {
        const body = {
          ...op.payload,
          id: op.entityId,
          owner: ownerId,
          client_updated_at: op.payload.client_updated_at ?? now(),
        };
        const created = await pb.collection(collectionName).create(body);
        await applyServerRecordLocally(op.entity, created as unknown as Record<string, unknown>);
      } catch (err: unknown) {
        const appErr = mapError(err);
        // Duplicate create (record already exists): fetch with GET and treat as success
        const isDuplicate =
          appErr.class === 'validation' &&
          (String((err as { message?: string })?.message || '').toLowerCase().includes('already exists') ||
            (err as { status?: number })?.status === 400);

        if (isDuplicate) {
          try {
            const existing = await pb.collection(collectionName).getOne(op.entityId);
            await applyServerRecordLocally(op.entity, existing as unknown as Record<string, unknown>);
            return { status: 'success' };
          } catch {
            return classifyError(err);
          }
        }
        return classifyError(err);
      }
    } else if (op.op === 'update') {
      try {
        const body = {
          ...op.payload,
          client_updated_at: op.payload.client_updated_at ?? now(),
        };
        const updated = await pb.collection(collectionName).update(op.entityId, body);
        await applyServerRecordLocally(op.entity, updated as unknown as Record<string, unknown>);
      } catch (err: unknown) {
        const appErr = mapError(err);
        // Conflict 409 stale write: GET record, apply locally, treat op as done
        if (appErr.class === 'conflict') {
          try {
            const serverRecord = await pb.collection(collectionName).getOne(op.entityId);
            await applyServerRecordLocally(op.entity, serverRecord as unknown as Record<string, unknown>);
            return { status: 'success' };
          } catch {
            return classifyError(err);
          }
        }
        return classifyError(err);
      }
    } else if (op.op === 'delete') {
      try {
        // Soft delete via update on PocketBase
        const deleted = await pb.collection(collectionName).update(op.entityId, {
          deleted_at: now(),
          client_updated_at: now(),
        });
        await applyServerRecordLocally(op.entity, deleted as unknown as Record<string, unknown>);
      } catch (err: unknown) {
        const appErr = mapError(err);
        // Delete 404: treat as success
        if (appErr.class === 'notFound') {
          return { status: 'success' };
        }
        return classifyError(err);
      }
    }

    return { status: 'success' };
  } catch (unexpected) {
    return classifyError(unexpected);
  }
}

function classifyError(raw: unknown): OpOutcome {
  const err = mapError(raw);
  if (err.class === 'network' || err.class === 'transient') {
    return { status: 'retryable', error: err };
  }
  return { status: 'parked', error: err };
}

export async function applyServerRecordLocally(
  entity: SyncEntity,
  record: Record<string, unknown>
): Promise<void> {
  try {
    if (entity === 'category') {
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
    } else if (entity === 'transaction') {
      const local = mapServerTransactionToLocal(record);
      const existing = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, local.id as string))
        .limit(1);

      const affectedKeys: BucketKey[] = [
        {
          monthKey: local.monthKey as string,
          categoryId: local.categoryId as string,
          kind: local.kind as 'expense' | 'income',
        },
      ];

      if (existing[0]) {
        affectedKeys.push({
          monthKey: existing[0].monthKey,
          categoryId: existing[0].categoryId,
          kind: existing[0].kind,
        });
      }

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

      await recomputeBuckets(db, affectedKeys);
    } else if (entity === 'budget') {
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
    } else if (entity === 'recurring_rule') {
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
    }
  } catch (e) {
    logger.warn('Failed to apply server record locally', { entity, error: String(e) });
  }
}

// src/db/repositories/outbox.ts
// Outbox repository for pending sync operations.
// Only written when the user is signed in (sync_owner_id is set).

import { sql, eq, asc, and, lte, inArray } from 'drizzle-orm';
import { db } from '../client';
import { outbox, OutboxItem, NewOutboxItem } from '../schema';
import { isUserSignedIn } from './settings';
import { now } from '../../lib/clock';

type SyncNotifier = () => void;
let syncNotifier: SyncNotifier | null = null;

export function setSyncNotifier(fn: SyncNotifier | null): void {
  syncNotifier = fn;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function maybeEnqueueOutbox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txOrDb: any = db,
  entity: 'category' | 'transaction' | 'budget' | 'recurring_rule',
  entityId: string,
  op: 'create' | 'update' | 'delete',
  payload: Record<string, unknown>
): Promise<void> {
  const signedIn = await isUserSignedIn();
  if (!signedIn) {
    // If not signed in, outbox rows are never written per spec
    return;
  }

  const timestamp = now();
  const item: NewOutboxItem = {
    entity,
    entityId,
    op,
    payload: JSON.stringify(payload),
    attempts: 0,
    nextAttemptAt: 0,
    status: 'pending',
    lastError: null,
    createdAt: timestamp,
  };

  await txOrDb.insert(outbox).values(item);

  // Debounced push request to sync engine
  syncNotifier?.();
}

export async function listPendingOutbox(): Promise<OutboxItem[]> {
  return db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'pending'))
    .orderBy(asc(outbox.seq));
}

export async function getPendingOps(currentTime: number): Promise<OutboxItem[]> {
  return db
    .select()
    .from(outbox)
    .where(
      and(
        eq(outbox.status, 'pending'),
        lte(outbox.nextAttemptAt, currentTime)
      )
    )
    .orderBy(asc(outbox.seq));
}

export async function markOpSuccess(seqs: number[]): Promise<void> {
  if (seqs.length === 0) return;
  await db.delete(outbox).where(inArray(outbox.seq, seqs));
}

export async function markOpRetryableFailure(
  seq: number,
  attempts: number,
  nextAttemptAt: number,
  lastError: string
): Promise<void> {
  await db
    .update(outbox)
    .set({
      attempts,
      nextAttemptAt,
      lastError,
    })
    .where(eq(outbox.seq, seq));
}

export async function markOpParked(seq: number, lastError: string): Promise<void> {
  await db
    .update(outbox)
    .set({
      status: 'parked',
      lastError,
    })
    .where(eq(outbox.seq, seq));
}

export async function parkDependentChildOps(categoryId: string): Promise<void> {
  // If a category fails permanently, park pending transactions, budgets, or recurring_rules referencing it
  const allPending = await listPendingOutbox();
  for (const item of allPending) {
    if (item.entity === 'category') continue;
    try {
      const parsed = JSON.parse(item.payload) as { category?: string; categoryId?: string };
      if (parsed.category === categoryId || parsed.categoryId === categoryId) {
        await markOpParked(item.seq, `Dependency on parked category ${categoryId}`);
      }
    } catch {
      // ignore JSON parse error
    }
  }
}

export async function getAllPendingCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(outbox)
    .where(eq(outbox.status, 'pending'));
  return Number(rows[0]?.count ?? 0);
}

export async function getParkedCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(outbox)
    .where(eq(outbox.status, 'parked'));
  return Number(rows[0]?.count ?? 0);
}

export async function getParkedOps(): Promise<OutboxItem[]> {
  return db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'parked'))
    .orderBy(asc(outbox.seq));
}

export async function retryOp(seq: number): Promise<void> {
  await db
    .update(outbox)
    .set({
      status: 'pending',
      attempts: 0,
      nextAttemptAt: 0,
      lastError: null,
    })
    .where(eq(outbox.seq, seq));
}

export async function discardOp(seq: number): Promise<void> {
  await db.delete(outbox).where(eq(outbox.seq, seq));
}

export async function deleteOutboxItem(seq: number): Promise<void> {
  await db.delete(outbox).where(eq(outbox.seq, seq));
}

export async function parkOutboxItem(seq: number, errorMsg: string): Promise<void> {
  await markOpParked(seq, errorMsg);
}

export async function clearAllOutbox(): Promise<void> {
  await db.run(sql`DELETE FROM ${outbox};`);
}

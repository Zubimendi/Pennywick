// src/db/repositories/outbox.ts
// Outbox repository for pending sync operations.
// Only written when the user is signed in (sync_owner_id is set).

import { sql, eq, asc } from 'drizzle-orm';
import { db } from '../client';
import { outbox, OutboxItem, NewOutboxItem } from '../schema';
import { isUserSignedIn } from './settings';
import { now } from '../../lib/clock';

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
}

export async function listPendingOutbox(): Promise<OutboxItem[]> {
  return db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'pending'))
    .orderBy(asc(outbox.seq));
}

export async function deleteOutboxItem(seq: number): Promise<void> {
  await db.delete(outbox).where(eq(outbox.seq, seq));
}

export async function parkOutboxItem(seq: number, errorMsg: string): Promise<void> {
  await db
    .update(outbox)
    .set({
      status: 'parked',
      lastError: errorMsg,
    })
    .where(eq(outbox.seq, seq));
}

export async function clearAllOutbox(): Promise<void> {
  await db.run(sql`DELETE FROM ${outbox};`);
}

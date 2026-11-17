// src/features/recurring/recurrenceEngine.ts
// Background engine that executes recurrence catch-up on launch and app foregrounding.
// Enforces single-transaction bucket consistency and deterministic ID idempotence.

import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { transactions, recurringRules, NewTransaction } from '../../db/schema';
import { listRecurringRules } from '../../db/repositories/recurring';
import { recomputeBuckets, BucketKey } from '../../db/aggregates';
import { maybeEnqueueOutbox } from '../../db/repositories/outbox';
import { getToday, toMonthKey } from '../../domain/dates';
import { getNextOccurrenceDates } from '../../domain/recurrence';
import { generateRecurringId } from '../../lib/id';
import { now } from '../../lib/clock';

export interface CatchUpSummary {
  rulesProcessed: number;
  transactionsCreated: number;
}

/**
 * Execute recurrence catch-up for all active rules through `targetDateStr` (default today).
 */
export async function runRecurrenceCatchUp(
  targetDateStr: string = getToday()
): Promise<CatchUpSummary> {
  const activeRules = await listRecurringRules(true);
  if (activeRules.length === 0) {
    return { rulesProcessed: 0, transactionsCreated: 0 };
  }

  let totalCreated = 0;

  for (const rule of activeRules) {
    const dueDates = getNextOccurrenceDates(
      {
        id: rule.id,
        frequency: rule.frequency,
        day: rule.day,
        startOn: rule.startOn,
        lastGeneratedOn: rule.lastGeneratedOn,
      },
      targetDateStr,
      366
    );

    if (dueDates.length === 0) {
      continue;
    }

    const timestamp = now();
    const affectedBucketKeys: BucketKey[] = [];
    const newTransactionsToInsert: NewTransaction[] = [];

    // Check each due date for existing deterministic ID
    for (const date of dueDates) {
      const deterministicId = generateRecurringId(rule.id, date);

      // Check if transaction with this id already exists (even if deleted)
      const existing = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.id, deterministicId))
        .limit(1);

      if (existing.length > 0) {
        // Occurrence already exists; do not duplicate
        continue;
      }

      const monthKey = toMonthKey(date);
      const newTx: NewTransaction = {
        id: deterministicId,
        kind: rule.kind,
        amountMinor: rule.amountMinor,
        categoryId: rule.categoryId,
        occurredOn: date,
        monthKey,
        note: rule.note,
        recurringRuleId: rule.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      };

      newTransactionsToInsert.push(newTx);
      affectedBucketKeys.push({
        monthKey,
        categoryId: rule.categoryId,
        kind: rule.kind,
      });
    }

    // Apply writes in ONE transaction per rule
    if (newTransactionsToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        for (const row of newTransactionsToInsert) {
          await tx.insert(transactions).values(row);
          await maybeEnqueueOutbox(tx, 'transaction', row.id, 'create', { ...row });
        }

        // Recompute aggregate buckets
        await recomputeBuckets(tx, affectedBucketKeys);

        // Update rule lastGeneratedOn
        await tx
          .update(recurringRules)
          .set({
            lastGeneratedOn: targetDateStr,
            updatedAt: timestamp,
          })
          .where(eq(recurringRules.id, rule.id));

        await maybeEnqueueOutbox(tx, 'recurring_rule', rule.id, 'update', {
          last_generated_on: targetDateStr,
          updated_at: timestamp,
        });
      });

      totalCreated += newTransactionsToInsert.length;
    } else {
      // If all due dates were already accounted for, just update lastGeneratedOn
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        await tx
          .update(recurringRules)
          .set({
            lastGeneratedOn: targetDateStr,
            updatedAt: timestamp,
          })
          .where(eq(recurringRules.id, rule.id));
      });
    }
  }

  return {
    rulesProcessed: activeRules.length,
    transactionsCreated: totalCreated,
  };
}

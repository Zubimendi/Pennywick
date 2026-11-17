// src/sync/enqueueInitial.ts
// Enqueues creates for all local records on first sign-in.
// Seeds unchanged since install are skipped so they merge seamlessly across devices.

import { db } from '../db/client';
import { categories, transactions, budgets, recurringRules, outbox } from '../db/schema';
import { isNull } from 'drizzle-orm';
import { now } from '../lib/clock';
import { DEFAULT_SEED_CATEGORIES } from '../data/defaultCategories';

export async function enqueueInitialSync(): Promise<number> {
  const timestamp = now();
  let count = 0;

  // 1. Categories: non-seed or modified seed
  const allCategories = await db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt));

  for (const cat of allCategories) {
    const defaultSeed = DEFAULT_SEED_CATEGORIES.find((s) => s.id === cat.id);
    const isUnmodifiedSeed =
      cat.isSeed &&
      defaultSeed &&
      cat.name === defaultSeed.name &&
      cat.icon === defaultSeed.icon &&
      cat.colorKey === defaultSeed.colorKey &&
      cat.sortOrder === defaultSeed.sortOrder &&
      !cat.archived;

    if (isUnmodifiedSeed) {
      continue;
    }

    await db.insert(outbox).values({
      entity: 'category',
      entityId: cat.id,
      op: 'create',
      payload: JSON.stringify({
        id: cat.id,
        name: cat.name,
        kind: cat.kind,
        icon: cat.icon,
        color_key: cat.colorKey,
        sort_order: cat.sortOrder,
        archived: Boolean(cat.archived),
        is_seed: Boolean(cat.isSeed),
        client_updated_at: cat.updatedAt,
      }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: timestamp,
    });
    count++;
  }

  // 2. Budgets
  const allBudgets = await db
    .select()
    .from(budgets)
    .where(isNull(budgets.deletedAt));

  for (const b of allBudgets) {
    await db.insert(outbox).values({
      entity: 'budget',
      entityId: b.id,
      op: 'create',
      payload: JSON.stringify({
        id: b.id,
        category: b.categoryId,
        limit_minor: b.limitMinor,
        client_updated_at: b.updatedAt,
      }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: timestamp,
    });
    count++;
  }

  // 3. Recurring rules
  const allRules = await db
    .select()
    .from(recurringRules)
    .where(isNull(recurringRules.deletedAt));

  for (const r of allRules) {
    await db.insert(outbox).values({
      entity: 'recurring_rule',
      entityId: r.id,
      op: 'create',
      payload: JSON.stringify({
        id: r.id,
        kind: r.kind,
        amount_minor: r.amountMinor,
        category: r.categoryId,
        note: r.note ?? '',
        frequency: r.frequency,
        day: r.day,
        start_on: r.startOn,
        last_generated_on: r.lastGeneratedOn ?? '',
        active: Boolean(r.active),
        client_updated_at: r.updatedAt,
      }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: timestamp,
    });
    count++;
  }

  // 4. Transactions
  const allTransactions = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt));

  for (const tx of allTransactions) {
    await db.insert(outbox).values({
      entity: 'transaction',
      entityId: tx.id,
      op: 'create',
      payload: JSON.stringify({
        id: tx.id,
        kind: tx.kind,
        amount_minor: tx.amountMinor,
        category: tx.categoryId,
        occurred_on: tx.occurredOn,
        month_key: tx.monthKey,
        note: tx.note ?? '',
        recurring_rule_id: tx.recurringRuleId ?? '',
        created_at: tx.createdAt,
        client_updated_at: tx.updatedAt,
      }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: timestamp,
    });
    count++;
  }

  return count;
}

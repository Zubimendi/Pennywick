// src/db/schema.ts
// Drizzle ORM schema for Pennywick SQLite database.
// Conforms exactly to docs/ARCHITECTURE.MD Section 4.
// All monetary amounts are integer minor units (kobo). All timestamps are integer milliseconds.

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

// -----------------------------------------------------------------------------
// categories
// -----------------------------------------------------------------------------
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  icon: text('icon').notNull(),
  colorKey: text('color_key').notNull(),
  sortOrder: real('sort_order').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  isSeed: integer('is_seed', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

// -----------------------------------------------------------------------------
// transactions
// -----------------------------------------------------------------------------
export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    occurredOn: text('occurred_on').notNull(), // local date YYYY-MM-DD
    monthKey: text('month_key').notNull(), // YYYY-MM
    note: text('note'),
    recurringRuleId: text('recurring_rule_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    txDateIdx: index('idx_tx_date').on(table.deletedAt, table.occurredOn),
    txMonthCatIdx: index('idx_tx_month_cat').on(
      table.monthKey,
      table.categoryId,
      table.kind,
      table.deletedAt
    ),
  })
);

// -----------------------------------------------------------------------------
// budgets
// -----------------------------------------------------------------------------
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  limitMinor: integer('limit_minor').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

// -----------------------------------------------------------------------------
// recurring_rules
// -----------------------------------------------------------------------------
export const recurringRules = sqliteTable('recurring_rules', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  note: text('note'),
  frequency: text('frequency', { enum: ['weekly', 'monthly'] }).notNull(),
  day: integer('day').notNull(), // 1..7 for weekly, 1..31 for monthly
  startOn: text('start_on').notNull(),
  lastGeneratedOn: text('last_generated_on'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

// -----------------------------------------------------------------------------
// monthly_totals (Local-only derived cache, never synced)
// -----------------------------------------------------------------------------
export const monthlyTotals = sqliteTable(
  'monthly_totals',
  {
    monthKey: text('month_key').notNull(),
    categoryId: text('category_id').notNull(),
    kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
    totalMinor: integer('total_minor').notNull(),
    entryCount: integer('entry_count').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.monthKey, table.categoryId, table.kind] }),
  })
);

// -----------------------------------------------------------------------------
// settings
// -----------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(), // currency, theme, privacy, sync_owner_id, last_recurring_run
  value: text('value').notNull(),
});

// -----------------------------------------------------------------------------
// outbox (Pending sync operations when signed in)
// -----------------------------------------------------------------------------
export const outbox = sqliteTable('outbox', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  entity: text('entity', {
    enum: ['category', 'transaction', 'budget', 'recurring_rule'],
  }).notNull(),
  entityId: text('entity_id').notNull(),
  op: text('op', { enum: ['create', 'update', 'delete'] }).notNull(),
  payload: text('payload').notNull(),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: integer('next_attempt_at').notNull().default(0),
  status: text('status', { enum: ['pending', 'parked'] })
    .notNull()
    .default('pending'),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
});

// -----------------------------------------------------------------------------
// sync_state (Cursor per collection)
// -----------------------------------------------------------------------------
export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(), // cursor:categories, cursor:transactions, etc.
  value: text('value').notNull(),
});

// -----------------------------------------------------------------------------
// Model Types
// -----------------------------------------------------------------------------
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;

export type MonthlyTotal = typeof monthlyTotals.$inferSelect;
export type NewMonthlyTotal = typeof monthlyTotals.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type OutboxItem = typeof outbox.$inferSelect;
export type NewOutboxItem = typeof outbox.$inferInsert;

export type SyncStateItem = typeof syncState.$inferSelect;
export type NewSyncStateItem = typeof syncState.$inferInsert;

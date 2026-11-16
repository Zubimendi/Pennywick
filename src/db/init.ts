// src/db/init.ts
// Database schema initialization and deterministic category seeding.

import { sql } from 'drizzle-orm';
import { db, Database } from './client';
import { categories } from './schema';
import { DEFAULT_SEED_CATEGORIES } from '../data/defaultCategories';
import { now } from '../lib/clock';

export const SCHEMA_SQL = [
  // 1. categories
  sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
      icon TEXT NOT NULL,
      color_key TEXT NOT NULL,
      sort_order REAL NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      is_seed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );
  `,

  // 2. transactions
  sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      category_id TEXT NOT NULL REFERENCES categories(id),
      occurred_on TEXT NOT NULL,
      month_key TEXT NOT NULL,
      note TEXT,
      recurring_rule_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );
  `,
  sql`CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(deleted_at, occurred_on DESC);`,
  sql`CREATE INDEX IF NOT EXISTS idx_tx_month_cat ON transactions(month_key, category_id, kind, deleted_at);`,

  // 3. budgets
  sql`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );
  `,

  // 4. recurring_rules
  sql`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      category_id TEXT NOT NULL REFERENCES categories(id),
      note TEXT,
      frequency TEXT NOT NULL CHECK (frequency IN ('weekly','monthly')),
      day INTEGER NOT NULL,
      start_on TEXT NOT NULL,
      last_generated_on TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );
  `,

  // 5. monthly_totals (Local-only cache)
  sql`
    CREATE TABLE IF NOT EXISTS monthly_totals (
      month_key TEXT NOT NULL,
      category_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      total_minor INTEGER NOT NULL,
      entry_count INTEGER NOT NULL,
      PRIMARY KEY (month_key, category_id, kind)
    );
  `,

  // 6. settings
  sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `,

  // 7. outbox
  sql`
    CREATE TABLE IF NOT EXISTS outbox (
      seq INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ('category','transaction','budget','recurring_rule')),
      entity_id TEXT NOT NULL,
      op TEXT NOT NULL CHECK (op IN ('create','update','delete')),
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','parked')),
      last_error TEXT,
      created_at INTEGER NOT NULL
    );
  `,

  // 8. sync_state
  sql`
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `,
];

/**
 * Seed default categories with fixed deterministic IDs if not already seeded.
 * All devices seed identical rows.
 */
export async function seedCategoriesIfEmpty(database: Database = db): Promise<void> {
  const existing = await database.select().from(categories).limit(1);
  if (existing.length > 0) {
    return;
  }

  const timestamp = now();
  for (const seed of DEFAULT_SEED_CATEGORIES) {
    await database.insert(categories).values({
      id: seed.id,
      name: seed.name,
      kind: seed.kind,
      icon: seed.icon,
      colorKey: seed.colorKey,
      sortOrder: seed.sortOrder,
      archived: false,
      isSeed: true,
      updatedAt: timestamp,
      deletedAt: null,
    });
  }
}

/**
 * Initialize all database tables, indexes, and seeded data.
 */
export async function initDatabase(database: Database = db): Promise<void> {
  for (const statement of SCHEMA_SQL) {
    await database.run(statement);
  }
  await seedCategoriesIfEmpty(database);
}

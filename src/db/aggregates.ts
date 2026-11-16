// src/db/aggregates.ts
// Cached derived data (monthly_totals) consistency oracle and same-transaction recompute.
// Conforms to docs/CURSOR_CONTEXT.MD Section 5 and docs/ARCHITECTURE.MD Section 5.

import { sql } from 'drizzle-orm';
import { db } from './client';
import { monthlyTotals, transactions } from './schema';

export interface BucketKey {
  monthKey: string;
  categoryId: string;
  kind: 'expense' | 'income';
}

/**
 * Serialize a bucket key to a deduplication string
 */
export function bucketKeyToString(key: BucketKey): string {
  return `${key.monthKey}:${key.categoryId}:${key.kind}`;
}

/**
 * Deserialize string back to BucketKey
 */
export function stringToBucketKey(str: string): BucketKey {
  const [monthKey, categoryId, kind] = str.split(':');
  return {
    monthKey,
    categoryId,
    kind: kind as 'expense' | 'income',
  };
}

/**
 * Deduplicate an array of bucket keys
 */
export function deduplicateBucketKeys(keys: BucketKey[]): BucketKey[] {
  const seen = new Set<string>();
  const result: BucketKey[] = [];

  for (const k of keys) {
    const serialized = bucketKeyToString(k);
    if (!seen.has(serialized)) {
      seen.add(serialized);
      result.push(k);
    }
  }

  return result;
}

// Minimal interface covering both drizzle Database and SQLite transaction
export interface Queryable {
  run: (query: ReturnType<typeof sql>) => Promise<unknown> | unknown;
  all?: (query: ReturnType<typeof sql>) => Promise<unknown[]> | unknown[];
}

/**
 * Recomputes specified affected monthly_totals buckets from source transactions.
 * If entry count is 0, the bucket row is deleted.
 * Must be executed in the SAME transaction as the transaction change.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recomputeBuckets(txOrDb: any = db, affectedKeys: BucketKey[]): Promise<void> {
  const uniqueKeys = deduplicateBucketKeys(affectedKeys);
  if (uniqueKeys.length === 0) {
    return;
  }

  for (const k of uniqueKeys) {
    // 1. Calculate sum and count for this exact bucket from non-deleted rows
    const query = sql`
      SELECT
        COALESCE(SUM(${transactions.amountMinor}), 0) AS total,
        COUNT(*) AS n
      FROM ${transactions}
      WHERE ${transactions.monthKey} = ${k.monthKey}
        AND ${transactions.categoryId} = ${k.categoryId}
        AND ${transactions.kind} = ${k.kind}
        AND ${transactions.deletedAt} IS NULL;
    `;

    // Execute query
    let rows: Array<{ total: number; n: number }> = [];
    if (typeof txOrDb.all === 'function') {
      rows = await txOrDb.all(query);
    } else if (typeof txOrDb.execute === 'function') {
      const res = await txOrDb.execute(query);
      rows = (res.rows ?? res) as Array<{ total: number; n: number }>;
    } else {
      // Direct raw query fallback
      rows = (await txOrDb.run(query)) as Array<{ total: number; n: number }>;
    }

    const n = rows && rows[0] ? Number(rows[0].n) : 0;
    const total = rows && rows[0] ? Number(rows[0].total) : 0;

    if (n === 0) {
      // If no entries remain in this bucket, delete the cached row
      await txOrDb.run(sql`
        DELETE FROM ${monthlyTotals}
        WHERE ${monthlyTotals.monthKey} = ${k.monthKey}
          AND ${monthlyTotals.categoryId} = ${k.categoryId}
          AND ${monthlyTotals.kind} = ${k.kind};
      `);
    } else {
      // Upsert into monthly_totals
      await txOrDb.run(sql`
        INSERT INTO ${monthlyTotals} (
          month_key, category_id, kind, total_minor, entry_count
        ) VALUES (
          ${k.monthKey}, ${k.categoryId}, ${k.kind}, ${total}, ${n}
        )
        ON CONFLICT(month_key, category_id, kind) DO UPDATE SET
          total_minor = ${total},
          entry_count = ${n};
      `);
    }
  }
}

/**
 * Complete brute-force recomputation of all monthly_totals buckets.
 * Serves as:
 * 1. Test oracle in the aggregate consistency test.
 * 2. Recovery repair action after migration or sync import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rebuildAll(txOrDb: any = db): Promise<void> {
  // Clear all cached totals
  await txOrDb.run(sql`DELETE FROM ${monthlyTotals};`);

  // Repopulate from non-deleted transactions
  await txOrDb.run(sql`
    INSERT INTO ${monthlyTotals} (month_key, category_id, kind, total_minor, entry_count)
    SELECT
      ${transactions.monthKey},
      ${transactions.categoryId},
      ${transactions.kind},
      SUM(${transactions.amountMinor}) AS total_minor,
      COUNT(*) AS entry_count
    FROM ${transactions}
    WHERE ${transactions.deletedAt} IS NULL
    GROUP BY ${transactions.monthKey}, ${transactions.categoryId}, ${transactions.kind};
  `);
}

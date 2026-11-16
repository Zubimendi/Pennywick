// src/db/repositories/settings.ts
// Local key-value settings repository.

import { eq } from 'drizzle-orm';
import { db } from '../client';
import { settings, Setting } from '../schema';
import { Result, tryCatch } from '../../api/errors';

export const SETTINGS_KEYS = {
  CURRENCY: 'currency',
  THEME: 'theme',
  PRIVACY: 'privacy',
  SYNC_OWNER_ID: 'sync_owner_id',
  LAST_RECURRING_RUN: 'last_recurring_run',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<Result<Setting>> {
  return tryCatch(async () => {
    const existing = await getSetting(key);
    if (existing !== null) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
    return { key, value };
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

export async function isUserSignedIn(): Promise<boolean> {
  const syncOwnerId = await getSetting(SETTINGS_KEYS.SYNC_OWNER_ID);
  return !!syncOwnerId && syncOwnerId.length > 0;
}

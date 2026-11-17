// src/api/auth.ts
// Authentication operations against PocketBase with secure-store session persistence
// and account guard to prevent silent cross-account merges (T16 Acceptance).

import { pb } from './pb';
import { tryCatch, err, Result } from './errors';
import { getSetting, setSetting, SETTINGS_KEYS } from '../db/repositories/settings';
import { db } from '../db/client';
import { transactions, budgets, recurringRules, categories, outbox } from '../db/schema';
import { rebuildAll } from '../db/aggregates';
import { DEFAULT_SEED_CATEGORIES } from '../data/defaultCategories';
import { eq } from 'drizzle-orm';
import { now } from '../lib/clock';

export interface UserProfile {
  id: string;
  email: string;
}

export interface SignInResult {
  user: UserProfile;
  accountMismatch?: boolean;
}

export interface AuthMismatchDetails {
  previousOwnerId: string;
  newOwnerId: string;
}

/**
 * Check if the signing-in user matches the local sync owner.
 */
export async function checkAccountGuard(newUserId: string): Promise<{
  mismatch: boolean;
  previousOwnerId: string | null;
}> {
  const previousOwnerId = await getSetting(SETTINGS_KEYS.SYNC_OWNER_ID);
  if (previousOwnerId && previousOwnerId !== newUserId) {
    return { mismatch: true, previousOwnerId };
  }
  return { mismatch: false, previousOwnerId };
}

/**
 * Reset local state when user chooses "Replace local data" on account switch.
 */
export async function replaceLocalDataForNewOwner(newOwnerId: string): Promise<void> {
  const timestamp = now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.transaction(async (tx: any) => {
    // Delete non-seed categories and all transactions, budgets, recurring rules, outbox
    await tx.delete(transactions);
    await tx.delete(budgets);
    await tx.delete(recurringRules);
    await tx.delete(outbox);
    await tx.delete(categories).where(eq(categories.isSeed, false));

    // Restore seed categories
    for (const seed of DEFAULT_SEED_CATEGORIES) {
      await tx
        .insert(categories)
        .values({
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
        })
        .onConflictDoNothing();
    }

    await rebuildAll(tx);
  });

  await setSetting(SETTINGS_KEYS.SYNC_OWNER_ID, newOwnerId);
}

/**
 * Sign in with email and password.
 * If signing in as a different user than sync_owner_id, triggers account mismatch prompt unless forceReplace is true.
 */
export async function signIn(
  email: string,
  pass: string,
  options?: { forceReplace?: boolean }
): Promise<Result<SignInResult>> {
  try {
    const authData = await pb
      .collection('users')
      .authWithPassword(email.trim(), pass);

    const user: UserProfile = {
      id: authData.record.id,
      email: authData.record.getString('email') || email.trim(),
    };

    // Account guard check
    const guard = await checkAccountGuard(user.id);
    if (guard.mismatch && !options?.forceReplace) {
      // Clear session from authStore so unconfirmed user is not persisted
      pb.authStore.clear();

      return err(
        'conflict',
        'Account mismatch: Local data belongs to a different account. Replace local data or cancel.',
        {
          code: 'account_mismatch',
          previousOwnerId: guard.previousOwnerId,
          newOwnerId: user.id,
        }
      );
    }

    if (options?.forceReplace && guard.mismatch) {
      await replaceLocalDataForNewOwner(user.id);
    } else {
      await setSetting(SETTINGS_KEYS.SYNC_OWNER_ID, user.id);
    }

    return {
      ok: true,
      value: { user },
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Sign in failed';
    return err('auth', message, caught);
  }
}

/**
 * Sign up a new user account.
 */
export async function signUp(
  email: string,
  pass: string,
  passConfirm: string
): Promise<Result<UserProfile>> {
  if (pass !== passConfirm) {
    return err('validation', 'Passwords do not match');
  }

  return tryCatch(async () => {
    const cleanEmail = email.trim();
    await pb.collection('users').create({
      email: cleanEmail,
      password: pass,
      passwordConfirm: passConfirm,
    });

    const authData = await pb.collection('users').authWithPassword(cleanEmail, pass);
    const user: UserProfile = {
      id: authData.record.id,
      email: authData.record.getString('email') || cleanEmail,
    };

    await setSetting(SETTINGS_KEYS.SYNC_OWNER_ID, user.id);
    return user;
  });
}

/**
 * Sign out and clear stored session tokens.
 */
export async function signOut(): Promise<Result<void>> {
  return tryCatch(async () => {
    pb.authStore.clear();
  });
}

/**
 * Refresh authentication session.
 */
export async function refreshAuth(): Promise<Result<UserProfile>> {
  return tryCatch(async () => {
    const authData = await pb.collection('users').authRefresh();
    return {
      id: authData.record.id,
      email: authData.record.getString('email'),
    };
  });
}

export function getCurrentUser(): UserProfile | null {
  const model = pb.authStore.record;
  if (!model) return null;
  return {
    id: model.id,
    email: model.getString('email'),
  };
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid && !!pb.authStore.record;
}

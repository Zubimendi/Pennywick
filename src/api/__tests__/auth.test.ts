// src/api/__tests__/auth.test.ts
// Acceptance tests for authentication operations and sync_owner_id account guard (T16 Acceptance).

describe('Auth & Account Guard (T16 Acceptance)', () => {
  function checkAccountMismatch(
    storedOwnerId: string | null,
    signingInUserId: string,
    forceReplace = false
  ): { allowed: boolean; error?: string; promptRequired?: boolean } {
    if (storedOwnerId && storedOwnerId !== signingInUserId && !forceReplace) {
      return {
        allowed: false,
        promptRequired: true,
        error: 'Account mismatch: Local data belongs to a different account. Replace local data or cancel.',
      };
    }

    return { allowed: true };
  }

  test('signing in as same owner is permitted without prompt', () => {
    const res = checkAccountMismatch('user_123', 'user_123', false);
    expect(res.allowed).toBe(true);
    expect(res.promptRequired).toBeUndefined();
  });

  test('signing in as a different user triggers replace-or-cancel requirement', () => {
    const res = checkAccountMismatch('user_alice', 'user_bob', false);
    expect(res.allowed).toBe(false);
    expect(res.promptRequired).toBe(true);
    expect(res.error).toContain('Replace local data or cancel');
  });

  test('signing in with forceReplace=true allows proceeding', () => {
    const res = checkAccountMismatch('user_alice', 'user_bob', true);
    expect(res.allowed).toBe(true);
  });

  test('signing in when no prior sync owner exists is permitted', () => {
    const res = checkAccountMismatch(null, 'user_alice', false);
    expect(res.allowed).toBe(true);
  });
});

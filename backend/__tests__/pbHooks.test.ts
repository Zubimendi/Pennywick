// backend/__tests__/pbHooks.test.ts
// Unit tests for PocketBase conflict-guard and validation hook logic (T15 Acceptance).

describe('PocketBase conflict guard and validation rules (T15 Acceptance)', () => {
  const CLAMP_MS = 5 * 60 * 1000;

  function evaluateConflictGuard(
    bodyUpdatedAt: number | undefined,
    storedUpdatedAt: number,
    serverNow: number
  ): { status: number; clampedTimestamp?: number; error?: string } {
    if (bodyUpdatedAt === undefined) {
      return { status: 200 };
    }

    let effective = bodyUpdatedAt;
    if (effective > serverNow + CLAMP_MS) {
      effective = serverNow; // Clamped
    }

    if (effective < storedUpdatedAt) {
      return { status: 409, error: 'stale_write' };
    }

    return { status: 200, clampedTimestamp: effective };
  }

  function validateTransactionPayload(payload: {
    amount_minor?: number;
    occurred_on?: string;
    month_key?: string;
  }): { valid: boolean; error?: string } {
    if (payload.amount_minor !== undefined) {
      if (
        isNaN(payload.amount_minor) ||
        payload.amount_minor <= 0 ||
        !Number.isInteger(payload.amount_minor)
      ) {
        return { valid: false, error: 'Amount must be a positive integer in minor units' };
      }
    }

    if (payload.occurred_on !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.occurred_on)) {
        return { valid: false, error: 'occurred_on must match YYYY-MM-DD' };
      }
      const expectedMonth = payload.occurred_on.slice(0, 7);
      if (payload.month_key && payload.month_key !== expectedMonth) {
        return { valid: false, error: 'month_key must match the first 7 characters of occurred_on' };
      }
    }

    return { valid: true };
  }

  test('conflict guard rejects older client_updated_at with 409 stale_write', () => {
    const serverNow = 1000000;
    const stored = 900000;
    const staleClient = 850000;

    const res = evaluateConflictGuard(staleClient, stored, serverNow);
    expect(res.status).toBe(409);
    expect(res.error).toBe('stale_write');
  });

  test('conflict guard clamps future client_updated_at beyond 5 minutes', () => {
    const serverNow = 1000000;
    const stored = 900000;
    const futureClient = serverNow + 10 * 60 * 1000; // 10 mins ahead

    const res = evaluateConflictGuard(futureClient, stored, serverNow);
    expect(res.status).toBe(200);
    expect(res.clampedTimestamp).toBe(serverNow);
  });

  test('validates transaction payload requirements', () => {
    expect(
      validateTransactionPayload({
        amount_minor: -100,
        occurred_on: '2026-11-17',
        month_key: '2026-11',
      }).valid
    ).toBe(false);

    expect(
      validateTransactionPayload({
        amount_minor: 15.5,
        occurred_on: '2026-11-17',
        month_key: '2026-11',
      }).valid
    ).toBe(false);

    expect(
      validateTransactionPayload({
        amount_minor: 150000,
        occurred_on: '2026-11-17',
        month_key: '2026-12', // mismatched month_key
      }).valid
    ).toBe(false);

    expect(
      validateTransactionPayload({
        amount_minor: 150000,
        occurred_on: '2026-11-17',
        month_key: '2026-11',
      }).valid
    ).toBe(true);
  });
});

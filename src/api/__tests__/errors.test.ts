import { ok, err, mapError, getFriendlyErrorMessage, tryCatch } from '../errors';

describe('API: Errors and Result (T4)', () => {
  it('constructs ok and err results correctly', () => {
    const success = ok({ id: '123' });
    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.value.id).toBe('123');
    }

    const failure = err('validation', 'Amount must be positive');
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error.class).toBe('validation');
      expect(failure.error.message).toBe('Amount must be positive');
    }
  });

  it('maps network errors correctly', () => {
    const netErr = new Error('Network request failed');
    const mapped = mapError(netErr);
    expect(mapped.class).toBe('network');
  });

  it('maps HTTP status codes from API responses', () => {
    expect(mapError({ status: 401 }).class).toBe('auth');
    expect(mapError({ status: 403 }).class).toBe('forbidden');
    expect(mapError({ status: 404 }).class).toBe('notFound');
    expect(mapError({ status: 409, data: { code: 'stale_write' } }).class).toBe('conflict');
    expect(mapError({ status: 422 }).class).toBe('validation');
    expect(mapError({ status: 500 }).class).toBe('transient');
    expect(mapError({ status: 429 }).class).toBe('transient');
  });

  it('provides calm user microcopy instead of raw stack traces', () => {
    expect(getFriendlyErrorMessage({ class: 'network', message: 'raw' })).toBe(
      "You're offline. Changes are saved on this phone."
    );
    expect(getFriendlyErrorMessage({ class: 'auth', message: 'raw' })).toBe(
      'Sign in again to resume backup.'
    );
  });

  it('tryCatch executes async functions safely returning Result', async () => {
    const resSuccess = await tryCatch(async () => 'hello');
    expect(resSuccess.ok).toBe(true);
    if (resSuccess.ok) {
      expect(resSuccess.value).toBe('hello');
    }

    const resFailure = await tryCatch(async () => {
      throw new Error('SQLite database is locked');
    });
    expect(resFailure.ok).toBe(false);
    if (!resFailure.ok) {
      expect(resFailure.error.class).toBe('local');
    }
  });
});

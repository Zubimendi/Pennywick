import { sanitizeMetadata } from '../logger';

describe('Lib: Privacy Logger (T4)', () => {
  it('redacts sensitive fields: amount, note, email, password, token', () => {
    const rawMeta = {
      id: 'tx_123',
      amount_minor: 150000,
      amount: 1500,
      note: 'Bought secret groceries',
      email: 'user@example.com',
      token: 'jwt-token-secret',
      count: 5,
      operation: 'push',
    };

    const sanitized = sanitizeMetadata(rawMeta);

    expect(sanitized?.id).toBe('tx_123');
    expect(sanitized?.count).toBe(5);
    expect(sanitized?.operation).toBe('push');

    // Redacted
    expect(sanitized?.amount_minor).toBe('[REDACTED]');
    expect(sanitized?.amount).toBe('[REDACTED]');
    expect(sanitized?.note).toBe('[REDACTED]');
    expect(sanitized?.email).toBe('[REDACTED]');
    expect(sanitized?.token).toBe('[REDACTED]');
  });

  it('handles undefined metadata gracefully', () => {
    expect(sanitizeMetadata(undefined)).toBeUndefined();
  });
});

// src/sync/__tests__/backoff.test.ts
import { computeBackoffDelay } from '../backoff';

describe('computeBackoffDelay', () => {
  it('computes exponential delay without jitter when randomFn returns 0.5', () => {
    // With randomFn returning 0.5, jitter is 0%
    const midRandom = (): number => 0.5;

    // attempts = 0: 2000 * 2^0 = 2000
    expect(computeBackoffDelay(0, {}, midRandom)).toBe(2000);

    // attempts = 1: 2000 * 2^1 = 4000
    expect(computeBackoffDelay(1, {}, midRandom)).toBe(4000);

    // attempts = 2: 2000 * 2^2 = 8000
    expect(computeBackoffDelay(2, {}, midRandom)).toBe(8000);

    // attempts = 3: 2000 * 2^3 = 16000
    expect(computeBackoffDelay(3, {}, midRandom)).toBe(16000);
  });

  it('caps delay at maxDelayMs (300,000 ms)', () => {
    const midRandom = (): number => 0.5;
    // 2000 * 2^10 = 2,048,000 -> capped at 300,000
    expect(computeBackoffDelay(10, {}, midRandom)).toBe(300000);
  });

  it('applies +/- 20% jitter bounds correctly', () => {
    const minRandom = (): number => 0.0; // multiplier: 1 - 0.20 = 0.80
    const maxRandom = (): number => 1.0; // multiplier: 1 + 0.20 = 1.20

    expect(computeBackoffDelay(0, {}, minRandom)).toBe(1600); // 2000 * 0.8
    expect(computeBackoffDelay(0, {}, maxRandom)).toBe(2400); // 2000 * 1.2
  });
});

// src/sync/backoff.ts
// Pure backoff calculation for sync engine
// delay = min(300 s, 2 s * 2^(attempts)) with plus or minus 20% jitter

export interface BackoffConfig {
  baseMs?: number; // default 2000 ms (2 s)
  factor?: number; // default 2
  maxDelayMs?: number; // default 300,000 ms (5 min)
  jitterFraction?: number; // default 0.20 (+/- 20%)
}

export function computeBackoffDelay(
  attempts: number,
  config: BackoffConfig = {},
  randomFn: () => number = Math.random
): number {
  const baseMs = config.baseMs ?? 2000;
  const factor = config.factor ?? 2;
  const maxDelayMs = config.maxDelayMs ?? 300000;
  const jitterFraction = config.jitterFraction ?? 0.2;

  // 2s * 2^attempts
  const exponentialDelay = baseMs * Math.pow(factor, Math.max(0, attempts));
  const cappedDelay = Math.min(maxDelayMs, exponentialDelay);

  // jitter: +/- jitterFraction
  // random in range [-jitterFraction, +jitterFraction]
  const jitterMultiplier = 1 + (randomFn() * 2 - 1) * jitterFraction;
  const delayed = Math.round(cappedDelay * jitterMultiplier);

  return Math.max(0, delayed);
}

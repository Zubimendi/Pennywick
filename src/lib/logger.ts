// src/lib/logger.ts
// Privacy-preserving logger.
// Non-negotiable rule: Never log amounts, notes, or emails. Log IDs, counts, and error classes only.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  id?: string;
  entityId?: string;
  errorClass?: string;
  count?: number;
  durationMs?: number;
  operation?: string;
  status?: string | number;
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, meta?: LogMetadata) => void;
  info: (message: string, meta?: LogMetadata) => void;
  warn: (message: string, meta?: LogMetadata) => void;
  error: (message: string, meta?: LogMetadata) => void;
}

// Keys strictly forbidden from being logged
const FORBIDDEN_KEYS = new Set([
  'amount',
  'amount_minor',
  'amountminor',
  'note',
  'email',
  'password',
  'token',
  'authtoken',
  'description',
]);

/**
 * Filter out sensitive PII and financial fields from metadata
 */
export function sanitizeMetadata(meta?: LogMetadata): LogMetadata | undefined {
  if (!meta) {
    return undefined;
  }

  const clean: LogMetadata = {};
  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

class ConsoleLogger implements Logger {
  debug(message: string, meta?: LogMetadata): void {
    if (__DEV__) {
      const clean = sanitizeMetadata(meta);
      console.debug(`[DEBUG] ${message}`, clean ? JSON.stringify(clean) : '');
    }
  }

  info(message: string, meta?: LogMetadata): void {
    const clean = sanitizeMetadata(meta);
    console.info(`[INFO] ${message}`, clean ? JSON.stringify(clean) : '');
  }

  warn(message: string, meta?: LogMetadata): void {
    const clean = sanitizeMetadata(meta);
    console.warn(`[WARN] ${message}`, clean ? JSON.stringify(clean) : '');
  }

  error(message: string, meta?: LogMetadata): void {
    const clean = sanitizeMetadata(meta);
    console.error(`[ERROR] ${message}`, clean ? JSON.stringify(clean) : '');
  }
}

export const logger: Logger = new ConsoleLogger();

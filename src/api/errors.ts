// src/api/errors.ts
// Standard Result<T, AppError> and error taxonomy mapping.
// Conforms to docs/CURSOR_CONTEXT.MD Section 7 and ARCHITECTURE.MD Section 9.

export type ErrorClass =
  | 'network'    // fetch failed, timeout, offline
  | 'transient'  // 5xx, 429 — retry with backoff
  | 'auth'       // 401 — refresh once, then park
  | 'forbidden'  // 403 — park permanently
  | 'validation' // 400, 422 — park permanently
  | 'conflict'   // 409 stale_write — apply server record
  | 'notFound'   // 404 on delete — treat as success
  | 'local'      // SQLite failure
  | 'unknown';   // JS exceptions

export interface AppError {
  class: ErrorClass;
  message: string;
  raw?: unknown;
}

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err(cls: ErrorClass, message: string, raw?: unknown): Result<never, AppError> {
  return { ok: false, error: { class: cls, message, raw } };
}

/**
 * Friendly user-facing message mapping (UI microcopy from docs/DESIGN.MD Section 11)
 */
export function getFriendlyErrorMessage(error: AppError): string {
  switch (error.class) {
    case 'network':
      return "You're offline. Changes are saved on this phone.";
    case 'transient':
      return 'Server is busy. We will retry automatically.';
    case 'auth':
      return 'Sign in again to resume backup.';
    case 'forbidden':
      return 'Access denied for this record.';
    case 'validation':
      return 'Please check the entered values.';
    case 'conflict':
      return 'Updated with latest server version.';
    case 'local':
      return 'Unable to save to local database.';
    case 'notFound':
    case 'unknown':
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Map unknown / thrown errors to a typed AppError
 */
export function mapError(raw: unknown): AppError {
  if (raw instanceof Error) {
    const msg = raw.message.toLowerCase();
    if (
      msg.includes('network request failed') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('offline')
    ) {
      return { class: 'network', message: 'Network connection error', raw };
    }
    if (msg.includes('sqlite') || msg.includes('database') || msg.includes('constraint')) {
      return { class: 'local', message: raw.message, raw };
    }
  }

  if (typeof raw === 'object' && raw !== null && 'status' in raw) {
    const status = (raw as { status: number }).status;
    const data = 'data' in raw ? (raw as { data?: Record<string, unknown> }).data : undefined;
    const code = data && 'code' in data ? String(data.code) : '';

    if (status === 401) {
      return { class: 'auth', message: 'Unauthorized', raw };
    }
    if (status === 403) {
      return { class: 'forbidden', message: 'Forbidden', raw };
    }
    if (status === 404) {
      return { class: 'notFound', message: 'Not found', raw };
    }
    if (status === 409 || code === 'stale_write') {
      return { class: 'conflict', message: 'Stale write', raw };
    }
    if (status === 422 || status === 400) {
      return { class: 'validation', message: 'Validation error', raw };
    }
    if (status === 429 || status >= 500) {
      return { class: 'transient', message: 'Server transient error', raw };
    }
  }

  return { class: 'unknown', message: raw instanceof Error ? raw.message : String(raw), raw };
}

/**
 * Convenience wrapper for safe async operations returning Result<T, AppError>
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, AppError>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

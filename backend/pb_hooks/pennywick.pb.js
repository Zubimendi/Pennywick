/// <reference path="../types.d.ts" />

// ===========================================================
// Pennywick PocketBase Hooks
// - Validation: amounts, date formats, month keys
// - Conflict Guard: LWW clamp and 409 stale_write rejection
// Conforms to docs/ARCHITECTURE.MD Section 8.3
// ===========================================================

const CLAMP_MS = 5 * 60 * 1000; // 5 minutes

// Shared conflict-guard for all client-synced collections
function handleConflictGuard(e) {
  const info = e.requestInfo();
  const bodyData = info.body || {};
  const record = e.record;
  const serverNow = Date.now();

  if (bodyData["client_updated_at"] !== undefined) {
    const clientTimestamp = Number(bodyData["client_updated_at"]);
    if (clientTimestamp > serverNow + CLAMP_MS) {
      bodyData["client_updated_at"] = serverNow;
      record.set("client_updated_at", serverNow);
    }

    const storedTimestamp = record.getInt("client_updated_at");
    if (clientTimestamp < storedTimestamp) {
      throw new ApiError(409, "stale_write", {
        code: "stale_write",
        currentRecord: record,
      });
    }
  }

  e.next();
}

// Bind conflict guard to all collections
onRecordUpdateRequest((e) => handleConflictGuard(e), "categories");
onRecordUpdateRequest((e) => handleConflictGuard(e), "transactions");
onRecordUpdateRequest((e) => handleConflictGuard(e), "budgets");
onRecordUpdateRequest((e) => handleConflictGuard(e), "recurring_rules");

// Validation on create & update for transactions
function validateTransaction(e) {
  const info = e.requestInfo();
  const bodyData = info.body || {};

  if (bodyData["amount_minor"] !== undefined) {
    const amt = Number(bodyData["amount_minor"]);
    if (isNaN(amt) || amt <= 0 || !Number.isInteger(amt)) {
      throw new ApiError(422, "Amount must be a positive integer in minor units");
    }
  }

  if (bodyData["occurred_on"] !== undefined) {
    const dateStr = String(bodyData["occurred_on"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new ApiError(422, "occurred_on must match YYYY-MM-DD");
    }
    const expectedMonth = dateStr.slice(0, 7);
    if (bodyData["month_key"] && bodyData["month_key"] !== expectedMonth) {
      throw new ApiError(422, "month_key must match the first 7 characters of occurred_on");
    }
  }

  e.next();
}

onRecordCreateRequest((e) => validateTransaction(e), "transactions");
onRecordUpdateRequest((e) => validateTransaction(e), "transactions");

// Validation on create & update for budgets
function validateBudget(e) {
  const info = e.requestInfo();
  const bodyData = info.body || {};

  if (bodyData["limit_minor"] !== undefined) {
    const limit = Number(bodyData["limit_minor"]);
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) {
      throw new ApiError(422, "limit_minor must be a positive integer");
    }
  }

  e.next();
}

onRecordCreateRequest((e) => validateBudget(e), "budgets");
onRecordUpdateRequest((e) => validateBudget(e), "budgets");

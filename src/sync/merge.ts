// src/sync/merge.ts
// Pure merge logic and converters between PocketBase and SQLite schemas

export interface MergeCheckParams {
  entityId: string;
  hasPendingOutbox: boolean;
}

/**
 * Determines whether a server record should be merged into local state.
 * Rule: If the entity has ANY pending outbox op, skip it — local write wins until pushed.
 */
export function shouldMergeServerRecord(params: MergeCheckParams): boolean {
  if (params.hasPendingOutbox) {
    return false;
  }
  return true;
}

export function mapServerCategoryToLocal(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(record.id),
    name: String(record.name ?? ''),
    kind: String(record.kind ?? 'expense'),
    icon: String(record.icon ?? 'folder'),
    colorKey: String(record.color_key ?? record.colorKey ?? 'cat1'),
    sortOrder: Number(record.sort_order ?? record.sortOrder ?? 0),
    archived: Boolean(record.archived),
    isSeed: Boolean(record.is_seed ?? record.isSeed),
    updatedAt: Number(record.client_updated_at ?? record.updatedAt ?? Date.now()),
    deletedAt: record.deleted_at ? Number(record.deleted_at) : null,
  };
}

export function mapServerTransactionToLocal(record: Record<string, unknown>): Record<string, unknown> {
  const occurredOn = String(record.occurred_on ?? record.occurredOn ?? '');
  const monthKey = String(record.month_key ?? record.monthKey ?? occurredOn.slice(0, 7));

  return {
    id: String(record.id),
    kind: String(record.kind ?? 'expense'),
    amountMinor: Number(record.amount_minor ?? record.amountMinor ?? 0),
    categoryId: String(record.category ?? record.categoryId ?? ''),
    occurredOn,
    monthKey,
    note: record.note ? String(record.note) : null,
    recurringRuleId: record.recurring_rule_id
      ? String(record.recurring_rule_id)
      : record.recurringRuleId
        ? String(record.recurringRuleId)
        : null,
    createdAt: Number(record.created_at ?? record.createdAt ?? Date.now()),
    updatedAt: Number(record.client_updated_at ?? record.updatedAt ?? Date.now()),
    deletedAt: record.deleted_at ? Number(record.deleted_at) : null,
  };
}

export function mapServerBudgetToLocal(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(record.id),
    categoryId: String(record.category ?? record.categoryId ?? ''),
    limitMinor: Number(record.limit_minor ?? record.limitMinor ?? 0),
    updatedAt: Number(record.client_updated_at ?? record.updatedAt ?? Date.now()),
    deletedAt: record.deleted_at ? Number(record.deleted_at) : null,
  };
}

export function mapServerRecurringRuleToLocal(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(record.id),
    kind: String(record.kind ?? 'expense'),
    amountMinor: Number(record.amount_minor ?? record.amountMinor ?? 0),
    categoryId: String(record.category ?? record.categoryId ?? ''),
    note: record.note ? String(record.note) : null,
    frequency: String(record.frequency ?? 'monthly'),
    day: Number(record.day ?? 1),
    startOn: String(record.start_on ?? record.startOn ?? ''),
    lastGeneratedOn: record.last_generated_on
      ? String(record.last_generated_on)
      : record.lastGeneratedOn
        ? String(record.lastGeneratedOn)
        : null,
    active: record.active !== undefined ? Boolean(record.active) : true,
    updatedAt: Number(record.client_updated_at ?? record.updatedAt ?? Date.now()),
    deletedAt: record.deleted_at ? Number(record.deleted_at) : null,
  };
}

export function mapLocalCategoryToServer(local: Record<string, unknown>, ownerId: string): Record<string, unknown> {
  return {
    id: local.id,
    owner: ownerId,
    name: local.name,
    kind: local.kind,
    icon: local.icon,
    color_key: local.colorKey ?? local.color_key,
    sort_order: local.sortOrder ?? local.sort_order ?? 0,
    archived: Boolean(local.archived),
    is_seed: Boolean(local.isSeed ?? local.is_seed),
    client_updated_at: Number(local.updatedAt ?? local.client_updated_at ?? Date.now()),
    deleted_at: local.deletedAt ? Number(local.deletedAt) : null,
  };
}

export function mapLocalTransactionToServer(local: Record<string, unknown>, ownerId: string): Record<string, unknown> {
  return {
    id: local.id,
    owner: ownerId,
    kind: local.kind,
    amount_minor: Number(local.amountMinor ?? local.amount_minor),
    category: String(local.categoryId ?? local.category),
    occurred_on: String(local.occurredOn ?? local.occurred_on),
    month_key: String(local.monthKey ?? local.month_key),
    note: local.note ? String(local.note) : '',
    recurring_rule_id: local.recurringRuleId
      ? String(local.recurringRuleId)
      : local.recurring_rule_id
        ? String(local.recurring_rule_id)
        : '',
    created_at: Number(local.createdAt ?? local.created_at ?? Date.now()),
    client_updated_at: Number(local.updatedAt ?? local.client_updated_at ?? Date.now()),
    deleted_at: local.deletedAt ? Number(local.deletedAt) : null,
  };
}

export function mapLocalBudgetToServer(local: Record<string, unknown>, ownerId: string): Record<string, unknown> {
  return {
    id: local.id,
    owner: ownerId,
    category: String(local.categoryId ?? local.category),
    limit_minor: Number(local.limitMinor ?? local.limit_minor),
    client_updated_at: Number(local.updatedAt ?? local.client_updated_at ?? Date.now()),
    deleted_at: local.deletedAt ? Number(local.deletedAt) : null,
  };
}

export function mapLocalRecurringRuleToServer(local: Record<string, unknown>, ownerId: string): Record<string, unknown> {
  return {
    id: local.id,
    owner: ownerId,
    kind: local.kind,
    amount_minor: Number(local.amountMinor ?? local.amount_minor),
    category: String(local.categoryId ?? local.category),
    note: local.note ? String(local.note) : '',
    frequency: String(local.frequency),
    day: Number(local.day),
    start_on: String(local.startOn ?? local.start_on),
    last_generated_on: local.lastGeneratedOn
      ? String(local.lastGeneratedOn)
      : local.last_generated_on
        ? String(local.last_generated_on)
        : '',
    active: Boolean(local.active),
    client_updated_at: Number(local.updatedAt ?? local.client_updated_at ?? Date.now()),
    deleted_at: local.deletedAt ? Number(local.deletedAt) : null,
  };
}

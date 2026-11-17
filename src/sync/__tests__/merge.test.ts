// src/sync/__tests__/merge.test.ts
import {
  shouldMergeServerRecord,
  mapServerCategoryToLocal,
  mapServerTransactionToLocal,
  mapServerBudgetToLocal,
  mapServerRecurringRuleToLocal,
} from '../merge';

describe('sync merge', () => {
  it('skips server record if there is a pending local outbox op', () => {
    expect(shouldMergeServerRecord({ entityId: 'item_1', hasPendingOutbox: true })).toBe(false);
    expect(shouldMergeServerRecord({ entityId: 'item_1', hasPendingOutbox: false })).toBe(true);
  });

  it('maps server category to local SQLite format', () => {
    const server = {
      id: 'cat_abc',
      name: 'Transport',
      kind: 'expense',
      icon: 'car',
      color_key: 'cat2',
      sort_order: 3,
      archived: false,
      is_seed: true,
      client_updated_at: 2000,
      deleted_at: null,
    };

    const local = mapServerCategoryToLocal(server);
    expect(local.id).toBe('cat_abc');
    expect(local.name).toBe('Transport');
    expect(local.colorKey).toBe('cat2');
    expect(local.sortOrder).toBe(3);
    expect(local.archived).toBe(false);
    expect(local.isSeed).toBe(true);
    expect(local.updatedAt).toBe(2000);
  });

  it('maps server transaction to local SQLite format', () => {
    const server = {
      id: 'tx_abc',
      kind: 'expense',
      amount_minor: 4250,
      category: 'cat_food',
      occurred_on: '2026-03-15',
      month_key: '2026-03',
      note: 'Groceries',
      recurring_rule_id: null,
      created_at: 1000,
      client_updated_at: 2000,
      deleted_at: null,
    };

    const local = mapServerTransactionToLocal(server);
    expect(local.id).toBe('tx_abc');
    expect(local.amountMinor).toBe(4250);
    expect(local.categoryId).toBe('cat_food');
    expect(local.occurredOn).toBe('2026-03-15');
    expect(local.monthKey).toBe('2026-03');
    expect(local.note).toBe('Groceries');
    expect(local.createdAt).toBe(1000);
  });

  it('maps server budget to local format', () => {
    const server = {
      id: 'b_abc',
      category: 'cat_food',
      limit_minor: 60000,
      client_updated_at: 2000,
    };

    const local = mapServerBudgetToLocal(server);
    expect(local.id).toBe('b_abc');
    expect(local.categoryId).toBe('cat_food');
    expect(local.limitMinor).toBe(60000);
  });

  it('maps server recurring rule to local format', () => {
    const server = {
      id: 'rr_abc',
      kind: 'expense',
      amount_minor: 1500,
      category: 'cat_subs',
      frequency: 'monthly',
      day: 1,
      start_on: '2026-01-01',
      active: true,
      client_updated_at: 2000,
    };

    const local = mapServerRecurringRuleToLocal(server);
    expect(local.id).toBe('rr_abc');
    expect(local.frequency).toBe('monthly');
    expect(local.day).toBe(1);
    expect(local.active).toBe(true);
  });
});

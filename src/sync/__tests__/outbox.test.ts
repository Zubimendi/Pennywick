// src/sync/__tests__/outbox.test.ts
import { coalesceOutbox } from '../outbox';
import type { OutboxItem } from '../../db/schema';

describe('coalesceOutbox', () => {
  function makeItem(partial: Partial<OutboxItem> & { seq: number; entity: OutboxItem['entity']; entityId: string; op: OutboxItem['op'] }): OutboxItem {
    return {
      payload: '{}',
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: 1000,
      ...partial,
    };
  }

  it('coalesces create then updates into single create with merged payload', () => {
    const rows: OutboxItem[] = [
      makeItem({
        seq: 1,
        entity: 'category',
        entityId: 'cat_1',
        op: 'create',
        payload: JSON.stringify({ name: 'Groceries', color: 'blue' }),
      }),
      makeItem({
        seq: 2,
        entity: 'category',
        entityId: 'cat_1',
        op: 'update',
        payload: JSON.stringify({ name: 'Food & Groceries' }),
      }),
    ];

    const coalesced = coalesceOutbox(rows);
    expect(coalesced).toHaveLength(1);
    expect(coalesced[0].op).toBe('create');
    expect(coalesced[0].payload).toEqual({ name: 'Food & Groceries', color: 'blue' });
    expect(coalesced[0].originalSeqs).toEqual([1, 2]);
  });

  it('coalesces consecutive updates into single update with latest fields', () => {
    const rows: OutboxItem[] = [
      makeItem({
        seq: 1,
        entity: 'transaction',
        entityId: 'tx_1',
        op: 'update',
        payload: JSON.stringify({ amount_minor: 1000 }),
      }),
      makeItem({
        seq: 2,
        entity: 'transaction',
        entityId: 'tx_1',
        op: 'update',
        payload: JSON.stringify({ note: 'Lunch' }),
      }),
    ];

    const coalesced = coalesceOutbox(rows);
    expect(coalesced).toHaveLength(1);
    expect(coalesced[0].op).toBe('update');
    expect(coalesced[0].payload).toEqual({ amount_minor: 1000, note: 'Lunch' });
    expect(coalesced[0].originalSeqs).toEqual([1, 2]);
  });

  it('drops both when create is followed by delete for an unsynced entity', () => {
    const rows: OutboxItem[] = [
      makeItem({
        seq: 1,
        entity: 'budget',
        entityId: 'b_1',
        op: 'create',
        payload: JSON.stringify({ limit_minor: 50000 }),
      }),
      makeItem({
        seq: 2,
        entity: 'budget',
        entityId: 'b_1',
        op: 'delete',
        payload: JSON.stringify({}),
      }),
    ];

    const coalesced = coalesceOutbox(rows);
    expect(coalesced).toHaveLength(0);
  });

  it('coalesces updates then delete into a single delete', () => {
    const rows: OutboxItem[] = [
      makeItem({
        seq: 1,
        entity: 'recurring_rule',
        entityId: 'rr_1',
        op: 'update',
        payload: JSON.stringify({ active: false }),
      }),
      makeItem({
        seq: 2,
        entity: 'recurring_rule',
        entityId: 'rr_1',
        op: 'delete',
        payload: JSON.stringify({ deleted_at: 2000 }),
      }),
    ];

    const coalesced = coalesceOutbox(rows);
    expect(coalesced).toHaveLength(1);
    expect(coalesced[0].op).toBe('delete');
    expect(coalesced[0].payload).toEqual({ deleted_at: 2000 });
    expect(coalesced[0].originalSeqs).toEqual([1, 2]);
  });

  it('orders by entity priority: categories -> rules & budgets -> transactions', () => {
    const rows: OutboxItem[] = [
      makeItem({ seq: 1, entity: 'transaction', entityId: 'tx_1', op: 'create', payload: '{}' }),
      makeItem({ seq: 2, entity: 'budget', entityId: 'b_1', op: 'create', payload: '{}' }),
      makeItem({ seq: 3, entity: 'category', entityId: 'cat_1', op: 'create', payload: '{}' }),
      makeItem({ seq: 4, entity: 'recurring_rule', entityId: 'rr_1', op: 'create', payload: '{}' }),
    ];

    const coalesced = coalesceOutbox(rows);
    expect(coalesced.map((c) => c.entity)).toEqual([
      'category',
      'budget',
      'recurring_rule',
      'transaction',
    ]);
  });
});

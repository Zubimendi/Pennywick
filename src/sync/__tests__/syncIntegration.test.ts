// src/sync/__tests__/syncIntegration.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { drainOutbox } from '../push';
import { pullChanges } from '../pull';
import { pb } from '../../api/pb';
import * as outboxRepo from '../../db/repositories/outbox';
import * as aggregates from '../../db/aggregates';
import type { OutboxItem } from '../../db/schema';

// In-memory data store for tables
let mockOutbox: OutboxItem[] = [];
let mockCategories: Record<string, any>[] = [];
let mockTransactions: Record<string, any>[] = [];
let mockBudgets: Record<string, any>[] = [];
let mockRecurringRules: Record<string, any>[] = [];
let mockSyncState: Record<string, any>[] = [];
let mockRecomputeBucketsCalls: aggregates.BucketKey[][] = [];

jest.mock('../../api/pb', () => ({
  pb: {
    authStore: {
      record: { id: 'test_user_id' },
    },
    collection: jest.fn(),
  },
}));

jest.mock('../../db/repositories/settings', () => ({
  SETTINGS_KEYS: {
    SYNC_OWNER_ID: 'sync_owner_id',
  },
  getSetting: jest.fn().mockResolvedValue('test_user_id'),
  isUserSignedIn: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../db/aggregates', () => ({
  recomputeBuckets: jest.fn().mockImplementation(async (_db: any, keys: aggregates.BucketKey[]) => {
    mockRecomputeBucketsCalls.push(keys);
  }),
}));

jest.mock('../../db/repositories/outbox', () => {
  return {
    getPendingOps: jest.fn().mockImplementation(async (currentTime: number) => {
      return mockOutbox.filter((o) => o.status === 'pending' && o.nextAttemptAt <= currentTime);
    }),
    markOpSuccess: jest.fn().mockImplementation(async (seqs: number[]) => {
      mockOutbox = mockOutbox.filter((o) => !seqs.includes(o.seq));
    }),
    markOpRetryableFailure: jest.fn().mockImplementation(
      async (seq: number, attempts: number, nextAttemptAt: number, lastError: string) => {
        const item = mockOutbox.find((o) => o.seq === seq);
        if (item) {
          item.attempts = attempts;
          item.nextAttemptAt = nextAttemptAt;
          item.lastError = lastError;
        }
      }
    ),
    markOpParked: jest.fn().mockImplementation(async (seq: number, lastError: string) => {
      const item = mockOutbox.find((o) => o.seq === seq);
      if (item) {
        item.status = 'parked';
        item.lastError = lastError;
      }
    }),
    parkDependentChildOps: jest.fn().mockImplementation(async (categoryId: string) => {
      for (const item of mockOutbox) {
        if (item.entity === 'category') continue;
        try {
          const parsed = JSON.parse(item.payload);
          if (parsed.category === categoryId || parsed.categoryId === categoryId) {
            item.status = 'parked';
            item.lastError = `Dependency on parked category ${categoryId}`;
          }
        } catch {
          // ignore
        }
      }
    }),
  };
});

jest.mock('../../db/client', () => {
  const getTableData = (tableObj: any): Record<string, any>[] => {
    const tableName = tableObj?._?.name ?? tableObj?.[Symbol.for('drizzle:Name')] ?? '';
    if (tableName.includes('category') || tableName === 'categories') return mockCategories;
    if (tableName.includes('transaction') || tableName === 'transactions') return mockTransactions;
    if (tableName.includes('budget') || tableName === 'budgets') return mockBudgets;
    if (tableName.includes('recurring') || tableName === 'recurring_rules') return mockRecurringRules;
    if (tableName.includes('sync_state') || tableName === 'syncState') return mockSyncState;
    if (tableName.includes('outbox') || tableName === 'outbox') return mockOutbox;
    return [];
  };

  return {
    db: {
      select: () => ({
        from: (table: any) => {
          const rows = getTableData(table);
          const builder = {
            where: (cond: any) => ({
              limit: (n: number) => Promise.resolve(rows.slice(0, n)),
              all: () => Promise.resolve([...rows]),
              then: (resolve: any) => resolve([...rows]),
            }),
            limit: (n: number) => Promise.resolve(rows.slice(0, n)),
            all: () => Promise.resolve([...rows]),
            then: (resolve: any) => resolve([...rows]),
          };
          return builder;
        },
      }),
      insert: (table: any) => ({
        values: (val: any) => ({
          onConflictDoUpdate: ({ target, set }: any) => {
            const rows = getTableData(table);
            const idKey = val.id !== undefined ? 'id' : 'key';
            const existingIndex = rows.findIndex((r) => r[idKey] === val[idKey]);
            if (existingIndex >= 0) {
              rows[existingIndex] = { ...rows[existingIndex], ...set };
            } else {
              rows.push({ ...val });
            }
            return Promise.resolve();
          },
          then: (resolve: any) => {
            const rows = getTableData(table);
            rows.push({ ...val });
            resolve();
          },
        }),
      }),
    },
  };
});

describe('Sync Integration', () => {
  beforeEach(() => {
    mockOutbox = [];
    mockCategories = [];
    mockTransactions = [];
    mockBudgets = [];
    mockRecurringRules = [];
    mockSyncState = [];
    mockRecomputeBucketsCalls = [];
    jest.clearAllMocks();
  });

  it('drains outbox successfully and deletes ops upon success', async () => {
    mockOutbox.push({
      seq: 1,
      entity: 'category',
      entityId: 'cat_test_1',
      op: 'create',
      payload: JSON.stringify({ name: 'Coffee', kind: 'expense', icon: 'cafe', color_key: 'cat1' }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: 1000,
    });

    const mockCreate = jest.fn().mockResolvedValue({ id: 'cat_test_1', name: 'Coffee' });
    jest.spyOn(pb, 'collection').mockReturnValue({
      create: mockCreate,
    } as any);

    const result = await drainOutbox();
    expect(result.succeeded).toBe(1);
    expect(result.stoppedOnRetryable).toBe(false);

    // Outbox item deleted on success
    expect(mockOutbox).toHaveLength(0);
    expect(outboxRepo.markOpSuccess).toHaveBeenCalledWith([1]);
  });

  it('stops drain and applies exponential backoff on network/transient failure (500)', async () => {
    mockOutbox.push(
      {
        seq: 1,
        entity: 'category',
        entityId: 'cat_1',
        op: 'create',
        payload: JSON.stringify({ name: 'First' }),
        attempts: 0,
        nextAttemptAt: 0,
        status: 'pending',
        lastError: null,
        createdAt: 1000,
      },
      {
        seq: 2,
        entity: 'transaction',
        entityId: 'tx_1',
        op: 'create',
        payload: JSON.stringify({ amount_minor: 500 }),
        attempts: 0,
        nextAttemptAt: 0,
        status: 'pending',
        lastError: null,
        createdAt: 1001,
      }
    );

    const serverError = new Error('Server Unavailable');
    (serverError as any).status = 500;
    jest.spyOn(pb, 'collection').mockReturnValue({
      create: jest.fn().mockRejectedValue(serverError),
    } as any);

    const result = await drainOutbox();
    expect(result.stoppedOnRetryable).toBe(true);
    expect(result.processed).toBe(1); // Stopped immediately at first item to preserve dependency order!

    // First op should now have attempts=1 and nextAttemptAt > 0
    expect(mockOutbox[0].attempts).toBe(1);
    expect(mockOutbox[0].nextAttemptAt).toBeGreaterThan(0);
    // Second op untouched
    expect(mockOutbox[1].attempts).toBe(0);
  });

  it('parks operation on validation failure (422) and parks dependent children', async () => {
    mockOutbox.push(
      {
        seq: 1,
        entity: 'category',
        entityId: 'cat_invalid',
        op: 'create',
        payload: JSON.stringify({ name: '' }),
        attempts: 0,
        nextAttemptAt: 0,
        status: 'pending',
        lastError: null,
        createdAt: 1000,
      },
      {
        seq: 2,
        entity: 'transaction',
        entityId: 'tx_dependent',
        op: 'create',
        payload: JSON.stringify({ category: 'cat_invalid', amount_minor: 1000 }),
        attempts: 0,
        nextAttemptAt: 0,
        status: 'pending',
        lastError: null,
        createdAt: 1001,
      }
    );

    const valError = new Error('Validation failed');
    (valError as any).status = 422;
    jest.spyOn(pb, 'collection').mockReturnValue({
      create: jest.fn().mockRejectedValue(valError),
    } as any);

    const result = await drainOutbox();
    expect(result.parked).toBe(1);

    expect(mockOutbox[0].status).toBe('parked');
    expect(mockOutbox[1].status).toBe('parked'); // Child op parked automatically!
  });

  it('handles 409 stale_write by fetching server record and applying locally', async () => {
    mockOutbox.push({
      seq: 1,
      entity: 'category',
      entityId: 'cat_conflict',
      op: 'update',
      payload: JSON.stringify({ name: 'Local Name', client_updated_at: 1000 }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: 1000,
    });

    const conflictErr = new Error('stale_write');
    (conflictErr as any).status = 409;

    const mockUpdate = jest.fn().mockRejectedValue(conflictErr);
    const mockGetOne = jest.fn().mockResolvedValue({
      id: 'cat_conflict',
      name: 'Server Wins Name',
      kind: 'expense',
      icon: 'star',
      color_key: 'cat1',
      sort_order: 1,
      client_updated_at: 2000,
    });

    jest.spyOn(pb, 'collection').mockReturnValue({
      update: mockUpdate,
      getOne: mockGetOne,
    } as any);

    const result = await drainOutbox();
    expect(result.succeeded).toBe(1);

    // Local DB should reflect server record
    const cat = mockCategories.find((c) => c.id === 'cat_conflict');
    expect(cat?.name).toBe('Server Wins Name');
    expect(mockOutbox).toHaveLength(0);
  });

  it('handles duplicate create (400) by fetching record and treating as success', async () => {
    mockOutbox.push({
      seq: 1,
      entity: 'category',
      entityId: 'cat_dup',
      op: 'create',
      payload: JSON.stringify({ name: 'Dup Category' }),
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      createdAt: 1000,
    });

    const dupError = new Error('The record already exists.');
    (dupError as any).status = 400;

    const mockCreate = jest.fn().mockRejectedValue(dupError);
    const mockGetOne = jest.fn().mockResolvedValue({
      id: 'cat_dup',
      name: 'Existing Dup',
      kind: 'expense',
      icon: 'bookmark',
      color_key: 'cat2',
      sort_order: 2,
      client_updated_at: 1500,
    });

    jest.spyOn(pb, 'collection').mockReturnValue({
      create: mockCreate,
      getOne: mockGetOne,
    } as any);

    const result = await drainOutbox();
    expect(result.succeeded).toBe(1);

    const cat = mockCategories.find((c) => c.id === 'cat_dup');
    expect(cat?.name).toBe('Existing Dup');
    expect(mockOutbox).toHaveLength(0);
  });

  it('pulls server changes and recomputes monthly totals buckets', async () => {
    const mockGetList = jest.fn().mockImplementation((page: number, perPage: number, options: any) => {
      return Promise.resolve({
        items: [
          {
            id: 'tx_pull_1',
            kind: 'expense',
            amount_minor: 3500,
            category: 'cat_food',
            occurred_on: '2026-05-10',
            month_key: '2026-05',
            note: 'Lunch at cafe',
            client_updated_at: 5000,
          },
        ],
        totalPages: 1,
      });
    });

    jest.spyOn(pb, 'collection').mockReturnValue({
      getList: mockGetList,
    } as any);

    const stats = await pullChanges();
    expect(stats.transactionsUpdated).toBe(1);

    // Verify transaction exists locally
    const tx = mockTransactions.find((t) => t.id === 'tx_pull_1');
    expect(tx?.amountMinor).toBe(3500);

    // Verify recomputeBuckets was called with affected keys!
    expect(mockRecomputeBucketsCalls.length).toBeGreaterThan(0);
    expect(mockRecomputeBucketsCalls[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          monthKey: '2026-05',
          categoryId: 'cat_food',
          kind: 'expense',
        }),
      ])
    );

    // Verify cursor updated
    const cursor = mockSyncState.find((s) => s.key === 'cursor:transactions');
    expect(cursor?.value).toBe('5000');
  });
});

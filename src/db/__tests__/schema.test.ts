import { DEFAULT_SEED_CATEGORIES, generateSeedId } from '../../data/defaultCategories';
import { now, resetClockForTest } from '../../lib/clock';
import {
  categories,
  transactions,
  budgets,
  recurringRules,
  monthlyTotals,
  settings,
  outbox,
  syncState,
} from '../schema';

describe('Schema Definitions & Deterministic Seeds (T3)', () => {
  describe('Seed Categories and Deterministic IDs', () => {
    it('generates deterministic 15-char IDs starting with seed', () => {
      const foodId = generateSeedId('food');
      expect(foodId).toBe('seedfood0000000');
      expect(foodId).toHaveLength(15);
      expect(foodId).toMatch(/^seed[a-z0-9]{11}$/);

      const transportId = generateSeedId('transport');
      expect(transportId).toBe('seedtransport00');
      expect(transportId).toHaveLength(15);
    });

    it('ensures all default seed categories have valid and unique 15-char IDs', () => {
      const ids = new Set<string>();

      for (const cat of DEFAULT_SEED_CATEGORIES) {
        expect(cat.id).toHaveLength(15);
        expect(cat.id.startsWith('seed')).toBe(true);
        expect(ids.has(cat.id)).toBe(false);
        ids.add(cat.id);

        expect(['expense', 'income']).toContain(cat.kind);
        expect(cat.name).toBeTruthy();
        expect(cat.icon).toBeTruthy();
        expect(cat.colorKey).toMatch(/^cat(10|[1-9])$/);
      }
    });

    it('contains both expense and income seed categories', () => {
      const expenses = DEFAULT_SEED_CATEGORIES.filter((c) => c.kind === 'expense');
      const incomes = DEFAULT_SEED_CATEGORIES.filter((c) => c.kind === 'income');

      expect(expenses.length).toBeGreaterThanOrEqual(8);
      expect(incomes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Monotonic Clock', () => {
    beforeEach(() => {
      resetClockForTest(1700000000000);
    });

    it('produces strictly monotonic integer timestamps', () => {
      const t1 = now();
      const t2 = now();
      const t3 = now();

      expect(Number.isInteger(t1)).toBe(true);
      expect(t2).toBeGreaterThanOrEqual(t1 + 1);
      expect(t3).toBeGreaterThanOrEqual(t2 + 1);
    });
  });

  describe('Schema Table Definitions', () => {
    it('defines all required tables with expected column keys', () => {
      expect(categories).toBeDefined();
      expect(transactions).toBeDefined();
      expect(budgets).toBeDefined();
      expect(recurringRules).toBeDefined();
      expect(monthlyTotals).toBeDefined();
      expect(settings).toBeDefined();
      expect(outbox).toBeDefined();
      expect(syncState).toBeDefined();
    });
  });
});

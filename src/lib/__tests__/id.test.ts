import { newId, generateRecurringId, generateSeedId } from '../id';

describe('Lib: ID Generator (T4)', () => {
  it('generates 15-character lowercase alphanumeric IDs', () => {
    const id = newId();
    expect(id).toHaveLength(15);
    expect(id).toMatch(/^[a-z0-9]{15}$/);
  });

  it('generates unique random IDs across consecutive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = newId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });

  it('generates deterministic recurrence IDs with rc prefix and 15 total characters', () => {
    const ruleId = 'testrule12345';
    const date = '2026-11-16';

    const id1 = generateRecurringId(ruleId, date);
    const id2 = generateRecurringId(ruleId, date);

    expect(id1).toBe(id2); // must be 100% deterministic
    expect(id1).toHaveLength(15);
    expect(id1.startsWith('rc')).toBe(true);
    expect(id1).toMatch(/^rc[a-f0-9]{13}$/);
  });

  it('produces different recurring IDs for different dates or rules', () => {
    const ruleId = 'rule1';
    const idA = generateRecurringId(ruleId, '2026-11-01');
    const idB = generateRecurringId(ruleId, '2026-11-02');
    const idC = generateRecurringId('rule2', '2026-11-01');

    expect(idA).not.toBe(idB);
    expect(idA).not.toBe(idC);
  });

  it('generates fixed 15-char seed IDs', () => {
    expect(generateSeedId('food')).toBe('seedfood0000000');
    expect(generateSeedId('transport')).toBe('seedtransport00');
    expect(generateSeedId('food')).toHaveLength(15);
  });
});

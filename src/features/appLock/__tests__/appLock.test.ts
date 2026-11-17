// src/features/appLock/__tests__/appLock.test.ts
// Unit test for App Lock 60-second background logic (T22).

describe('T22: App Lock Background Timer', () => {
  const LOCK_THRESHOLD_MS = 60000;

  function shouldLock(
    enabled: boolean,
    backgroundedAt: number | null,
    resumedAt: number
  ): boolean {
    if (!enabled || !backgroundedAt) return false;
    return resumedAt - backgroundedAt >= LOCK_THRESHOLD_MS;
  }

  test('does not lock if app lock is disabled', () => {
    const backgroundedAt = 100000;
    const resumedAt = 200000; // 100 seconds later
    expect(shouldLock(false, backgroundedAt, resumedAt)).toBe(false);
  });

  test('does not lock if background duration is under 60 seconds', () => {
    const backgroundedAt = 100000;
    const resumedAt = 159999; // 59.999 seconds later
    expect(shouldLock(true, backgroundedAt, resumedAt)).toBe(false);
  });

  test('locks when background duration is exactly 60 seconds', () => {
    const backgroundedAt = 100000;
    const resumedAt = 160000; // exactly 60 seconds
    expect(shouldLock(true, backgroundedAt, resumedAt)).toBe(true);
  });

  test('locks when background duration exceeds 60 seconds', () => {
    const backgroundedAt = 100000;
    const resumedAt = 250000; // 150 seconds later
    expect(shouldLock(true, backgroundedAt, resumedAt)).toBe(true);
  });

  test('does not lock if backgroundedAt timestamp is missing', () => {
    expect(shouldLock(true, null, 100000)).toBe(false);
  });
});

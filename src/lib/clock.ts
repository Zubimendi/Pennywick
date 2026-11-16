// src/lib/clock.ts
// Monotonic clock for LWW timestamps (integer milliseconds since epoch).
// Ensures timestamps never move backwards on the same device, even across clock adjustments.

let lastTime = 0;

export function now(): number {
  const current = Date.now();
  if (current <= lastTime) {
    lastTime += 1;
  } else {
    lastTime = current;
  }
  return lastTime;
}

export function resetClockForTest(initialTime = 0): void {
  lastTime = initialTime;
}

// src/lib/id.ts
// PocketBase compatible 15-character lowercase alphanumeric IDs [a-z0-9],
// plus deterministic recurrence ID generation ('rc' + 13 hex chars of sha256).

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 15;

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);

  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.crypto &&
      typeof globalThis.crypto.getRandomValues === 'function'
    ) {
      globalThis.crypto.getRandomValues(bytes);
      return bytes;
    }
  } catch {
    // Fall back to node crypto or math.random
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.randomFillSync === 'function') {
      nodeCrypto.randomFillSync(bytes);
      return bytes;
    }
  } catch {
    // Fall back to pseudo-random
  }

  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * Generate standard 15-character lowercase alphanumeric client ID
 */
export function newId(): string {
  const bytes = getRandomBytes(ID_LENGTH);
  let result = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

/**
 * Pure synchronous SHA-256 implementation for deterministic IDs
 * (works identically across Hermes, V8, Node, and Web without async delays)
 */
function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];

  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * candidate; i < 312; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] ?? 0) | (j << ((3 - (i % 4)) * 8));
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = [...hash];

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? (w[i] ?? 0) : ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sTemp1 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sTemp2 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const temp1 = hash[7] + sTemp2 + ch + k[i] + w[i];
      const temp2 = sTemp1 + maj;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Generate deterministic recurrence entry ID:
 * 'rc' + first 13 hex characters of SHA-256(ruleId:occurrenceDate).
 * Total length = exactly 15 characters.
 */
export function generateRecurringId(ruleId: string, occurrenceDate: string): string {
  const input = `${ruleId}:${occurrenceDate}`;
  const hex = sha256Hex(input);
  return `rc${hex.slice(0, 13)}`;
}

/**
 * Generate deterministic seed category ID:
 * 'seed' + slug padded with '0' to exactly 15 characters.
 */
export function generateSeedId(slug: string): string {
  const sanitized = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `seed${sanitized}`.padEnd(15, '0').slice(0, 15);
}

// src/domain/money.ts
// Strict integer minor unit (kobo/cents) arithmetic and formatting.
// Floating point values are strictly forbidden for stored amounts.

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_NAMES: Record<string, string> = {
  NGN: 'naira',
  USD: 'dollars',
  EUR: 'euros',
  GBP: 'pounds',
};

/**
 * Format integer minor units (e.g. 150000 kobo -> ₦1,500.00)
 */
export function formatMoney(
  amountMinor: number,
  currency = 'NGN',
  options: { showDecimals?: boolean; showSymbol?: boolean } = {}
): string {
  const { showDecimals = true, showSymbol = true } = options;
  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(amountMinor);
  const major = Math.floor(absMinor / 100);
  const cents = absMinor % 100;

  // Group thousands with commas
  const majorFormatted = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = showSymbol ? (CURRENCY_SYMBOLS[currency] ?? `${currency} `) : '';
  const decimalsFormatted = showDecimals ? `.${cents.toString().padStart(2, '0')}` : '';

  const formatted = `${symbol}${majorFormatted}${decimalsFormatted}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format major decimal string for CSV export (e.g. 150000 -> "1500.00")
 */
export function formatDecimalAmount(amountMinor: number): string {
  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(amountMinor);
  const major = Math.floor(absMinor / 100);
  const cents = absMinor % 100;
  const formatted = `${major}.${cents.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Convert small integer amounts to readable words for accessibility screen readers
 */
export function amountToWords(amountMinor: number, currency = 'NGN'): string {
  const absMinor = Math.abs(amountMinor);
  const major = Math.floor(absMinor / 100);
  const cents = absMinor % 100;
  const currencyName = CURRENCY_NAMES[currency] ?? currency;

  let words = `${major} ${currencyName}`;
  if (cents > 0) {
    words += ` and ${cents} kobo`;
  }
  if (amountMinor < 0) {
    words = `minus ${words}`;
  }
  return words;
}

/**
 * Parse input string to integer minor units (kobo).
 * Max 2 decimal places, max 12 integer digits. Empty equals zero.
 */
export function parseAmount(input: string): number {
  const trimmed = input.trim().replace(/,/g, '');
  if (!trimmed) {
    return 0;
  }

  const parts = trimmed.split('.');
  if (parts.length > 2) {
    throw new Error('Invalid amount: multiple decimal points');
  }

  const integerPart = parts[0] === '' ? '0' : parts[0];
  const decimalPart = parts[1] ?? '';

  if (integerPart.length > 12) {
    throw new Error('Amount exceeds maximum length (12 digits)');
  }
  if (decimalPart.length > 2) {
    throw new Error('Amount cannot have more than 2 decimal places');
  }

  const major = parseInt(integerPart, 10);
  if (isNaN(major)) {
    throw new Error('Invalid amount: integer part is not a number');
  }

  const minorFraction = decimalPart.padEnd(2, '0');
  const minor = parseInt(minorFraction, 10);

  return major * 100 + (isNaN(minor) ? 0 : minor);
}

/**
 * Apply keypad keystroke to an existing input string:
 * - '0'..'9': append if within limits (max 12 integer digits, max 2 decimals)
 * - '.': append if none exists yet
 * - 'backspace': delete last character
 * - 'clear': clear to empty
 */
export function applyKeypadInput(current: string, key: string): string {
  if (key === 'clear') {
    return '';
  }

  if (key === 'backspace') {
    return current.slice(0, -1);
  }

  if (key === '.') {
    if (current.includes('.')) {
      return current; // already has decimal point
    }
    return current === '' ? '0.' : `${current}.`;
  }

  if (/^[0-9]$/.test(key)) {
    const parts = current.split('.');
    if (parts.length === 1) {
      // In integer part
      if (current === '0') {
        return key; // replace leading zero
      }
      if (parts[0].length >= 12) {
        return current; // max 12 digits
      }
      return `${current}${key}`;
    } else {
      // In decimal part
      if (parts[1].length >= 2) {
        return current; // max 2 decimals
      }
      return `${current}${key}`;
    }
  }

  return current;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const CURRENCY_NAMES: Record<string, string> = {
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
 * Convert small integer amounts to readable words for screen readers
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

  const integerPart = parts[0] ?? '0';
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

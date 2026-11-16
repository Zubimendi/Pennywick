import { formatMoney, amountToWords, parseAmount } from '../../../domain/money';

describe('formatMoney', () => {
  it('formats minor units to major units with commas and symbol', () => {
    expect(formatMoney(150000, 'NGN')).toBe('₦1,500.00');
    expect(formatMoney(70000, 'NGN')).toBe('₦700.00');
    expect(formatMoney(35000000, 'NGN')).toBe('₦350,000.00');
    expect(formatMoney(0, 'NGN')).toBe('₦0.00');
  });

  it('handles negative amounts correctly', () => {
    expect(formatMoney(-250000, 'NGN')).toBe('-₦2,500.00');
  });

  it('formats USD and other currencies', () => {
    expect(formatMoney(1050, 'USD')).toBe('$10.50');
  });
});

describe('parseAmount', () => {
  it('parses formatted input string into integer minor units', () => {
    expect(parseAmount('1500')).toBe(150000);
    expect(parseAmount('700.50')).toBe(70050);
    expect(parseAmount('1,250.75')).toBe(125075);
    expect(parseAmount('0')).toBe(0);
  });
});

describe('amountToWords (accessibility)', () => {
  it('translates minor units into readable words for screen readers', () => {
    expect(amountToWords(150000, 'NGN')).toBe('1500 naira');
    expect(amountToWords(75050, 'NGN')).toBe('750 naira and 50 kobo');
  });
});

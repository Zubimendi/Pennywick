import {
  formatMoney,
  formatDecimalAmount,
  amountToWords,
  parseAmount,
  applyKeypadInput,
} from '../money';

describe('Domain: Money (T4)', () => {
  describe('formatMoney', () => {
    it('formats kobo to formatted Naira with grouping', () => {
      expect(formatMoney(150000, 'NGN')).toBe('₦1,500.00');
      expect(formatMoney(35000000, 'NGN')).toBe('₦350,000.00');
      expect(formatMoney(70, 'NGN')).toBe('₦0.70');
      expect(formatMoney(0, 'NGN')).toBe('₦0.00');
    });

    it('handles negative amounts and decimals toggle', () => {
      expect(formatMoney(-50000, 'NGN')).toBe('-₦500.00');
      expect(formatMoney(120000, 'NGN', { showDecimals: false })).toBe('₦1,200');
      expect(formatMoney(120000, 'NGN', { showSymbol: false })).toBe('1,200.00');
    });
  });

  describe('formatDecimalAmount', () => {
    it('formats minor units to decimal string without currency symbols', () => {
      expect(formatDecimalAmount(150000)).toBe('1500.00');
      expect(formatDecimalAmount(75050)).toBe('750.50');
      expect(formatDecimalAmount(0)).toBe('0.00');
      expect(formatDecimalAmount(-2500)).toBe('-25.00');
    });
  });

  describe('amountToWords', () => {
    it('converts minor units to spoken words for screen readers', () => {
      expect(amountToWords(150000, 'NGN')).toBe('1500 naira');
      expect(amountToWords(150050, 'NGN')).toBe('1500 naira and 50 kobo');
      expect(amountToWords(-20000, 'NGN')).toBe('minus 200 naira');
    });
  });

  describe('parseAmount', () => {
    it('parses valid input numbers into integer minor units', () => {
      expect(parseAmount('1500')).toBe(150000);
      expect(parseAmount('1500.5')).toBe(150050);
      expect(parseAmount('1500.50')).toBe(150050);
      expect(parseAmount('0.75')).toBe(75);
      expect(parseAmount('.75')).toBe(75);
      expect(parseAmount('')).toBe(0);
      expect(parseAmount('   ')).toBe(0);
      expect(parseAmount('2,500,000.00')).toBe(250000000);
    });

    it('rejects invalid inputs exceeding limits or multiple decimals', () => {
      expect(() => parseAmount('1.2.3')).toThrow('multiple decimal points');
      expect(() => parseAmount('1.234')).toThrow('more than 2 decimal places');
      expect(() => parseAmount('1234567890123.00')).toThrow('exceeds maximum length');
    });
  });

  describe('applyKeypadInput', () => {
    it('appends digits properly', () => {
      let val = '';
      val = applyKeypadInput(val, '1');
      expect(val).toBe('1');
      val = applyKeypadInput(val, '5');
      expect(val).toBe('15');
      val = applyKeypadInput(val, '0');
      expect(val).toBe('150');
      val = applyKeypadInput(val, '0');
      expect(val).toBe('1500');
    });

    it('handles decimal separator and decimal limit', () => {
      let val = '150';
      val = applyKeypadInput(val, '.');
      expect(val).toBe('150.');
      val = applyKeypadInput(val, '.'); // ignore duplicate
      expect(val).toBe('150.');
      val = applyKeypadInput(val, '5');
      expect(val).toBe('150.5');
      val = applyKeypadInput(val, '9');
      expect(val).toBe('150.59');
      val = applyKeypadInput(val, '9'); // cannot exceed 2 decimal places
      expect(val).toBe('150.59');
    });

    it('handles backspace and clear', () => {
      let val = '150.50';
      val = applyKeypadInput(val, 'backspace');
      expect(val).toBe('150.5');
      val = applyKeypadInput(val, 'clear');
      expect(val).toBe('');
    });
  });
});

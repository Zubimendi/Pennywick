import { generateTransactionsCsv, sanitizeCellText } from '../csv';

describe('Lib: CSV Exporter (T4)', () => {
  it('neutralizes formula injection characters (=, +, -, @)', () => {
    expect(sanitizeCellText('=1+1')).toBe(`"'=1+1"`);
    expect(sanitizeCellText('+cmd|calc')).toBe(`"'+cmd|calc"`);
    expect(sanitizeCellText('-20% discount')).toBe(`"'-20% discount"`);
    expect(sanitizeCellText('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
  });

  it('escapes inner double quotes properly', () => {
    expect(sanitizeCellText('Bought "fresh" pepper')).toBe(`"Bought ""fresh"" pepper"`);
  });

  it('formats entire CSV with header, CRLF line endings, and decimal amounts', () => {
    const rows = [
      {
        date: '2026-11-15',
        kind: 'expense' as const,
        category: 'Transport',
        amountMinor: 150000,
        note: 'Uber ride',
      },
      {
        date: '2026-11-01',
        kind: 'income' as const,
        category: 'Salary',
        amountMinor: 35000000,
        note: '=PAYMENT_FORMULA',
      },
    ];

    const csv = generateTransactionsCsv(rows);

    expect(csv).toContain('"date","kind","category","amount","note"\r\n');
    expect(csv).toContain('"2026-11-15","expense","Transport",1500.00,"Uber ride"\r\n');
    expect(csv).toContain('"2026-11-01","income","Salary",350000.00,"\'=PAYMENT_FORMULA"\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});

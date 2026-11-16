// src/lib/csv.ts
// Spreadsheet-safe CSV export generator.
// Conforms to docs/CURSOR_CONTEXT.MD Section 9:
// - Header: date,kind,category,amount,note
// - Amounts as decimal strings (e.g. 15.00)
// - Quote every text field and double inner quotes
// - Prefix with ' for any text starting with =, +, -, @ to mitigate formula injection
// - Use \r\n line endings

import { formatDecimalAmount } from '../domain/money';

export interface CsvTransactionRow {
  date: string;
  kind: 'expense' | 'income';
  category: string;
  amountMinor: number;
  note?: string | null;
}

const FORMULA_INJECTION_CHARS = ['=', '+', '-', '@'];

/**
 * Neutralize formula injection risk by prefixing dangerous leading characters with '
 */
export function sanitizeCellText(value: string): string {
  let text = value;
  if (text.length > 0 && FORMULA_INJECTION_CHARS.includes(text[0])) {
    text = `'${text}`;
  }
  // Double inner quotes
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generate CSV string from transaction records
 */
export function generateTransactionsCsv(rows: CsvTransactionRow[]): string {
  const header = ['"date"', '"kind"', '"category"', '"amount"', '"note"'].join(',');

  const lines = [header];

  for (const row of rows) {
    const dateCell = `"${row.date}"`;
    const kindCell = `"${row.kind}"`;
    const categoryCell = sanitizeCellText(row.category);
    const amountCell = formatDecimalAmount(row.amountMinor);
    const noteCell = row.note ? sanitizeCellText(row.note) : '""';

    lines.push([dateCell, kindCell, categoryCell, amountCell, noteCell].join(','));
  }

  // Join lines with CRLF (\r\n) per spec
  return `${lines.join('\r\n')}\r\n`;
}

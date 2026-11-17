// src/features/settings/exportCsv.ts
// Export transactions to spreadsheet-safe CSV and open native share sheet.
// Conforms to docs/CURSOR_CONTEXT.MD Section 9 & 10.

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { isNull, desc } from 'drizzle-orm';
import { db } from '../../db/client';
import { transactions, categories } from '../../db/schema';
import { generateTransactionsCsv, CsvTransactionRow } from '../../lib/csv';
import { getToday } from '../../domain/dates';
import { Result, tryCatch } from '../../api/errors';

export async function exportAndShareTransactionsCsv(): Promise<Result<void>> {
  return tryCatch(async () => {
    // 1. Fetch categories
    const catRows = await db.select().from(categories);
    const catMap = new Map<string, string>();
    for (const c of catRows) {
      catMap.set(c.id, c.name);
    }

    // 2. Fetch all active transactions
    const txRows = await db
      .select()
      .from(transactions)
      .where(isNull(transactions.deletedAt))
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

    const csvRows: CsvTransactionRow[] = txRows.map((tx) => ({
      date: tx.occurredOn,
      kind: tx.kind,
      category: catMap.get(tx.categoryId) ?? 'General',
      amountMinor: tx.amountMinor,
      note: tx.note,
    }));

    // 3. Generate sanitized CSV string
    const csvContent = generateTransactionsCsv(csvRows);

    // 4. Write to cache directory using modern Expo SDK 58 File API
    const fileName = `pennywick_transactions_${getToday()}.csv`;
    const file = new File(Paths.cache, fileName);
    await file.write(csvContent);

    // 5. Open native share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Pennywick Transactions',
        UTI: 'public.comma-separated-values-text',
      });
    }
  });
}

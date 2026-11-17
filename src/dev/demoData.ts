// src/dev/demoData.ts
// Development-only demo data generator (T21).
// Generates ~3 months of realistic entries, budgets, and recurring rules for demo/performance evaluation.

import { db } from '../db/client';
import { transactions, budgets, recurringRules } from '../db/schema';
import { DEFAULT_SEED_CATEGORIES } from '../data/defaultCategories';
import { newId } from '../lib/id';
import { rebuildAll } from '../db/aggregates';
import { now } from '../lib/clock';
import { getToday, toMonthKey } from '../domain/dates';

export async function loadDemoData(): Promise<{ transactionsCreated: number; budgetsCreated: number; rulesCreated: number }> {
  const currentTime = now();
  const today = getToday();
  const [year, month, day] = today.split('-').map(Number);

  // Pick category IDs
  const foodCat = DEFAULT_SEED_CATEGORIES.find((c) => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dining'))?.id ?? DEFAULT_SEED_CATEGORIES[0].id;
  const transportCat = DEFAULT_SEED_CATEGORIES.find((c) => c.name.toLowerCase().includes('transport'))?.id ?? DEFAULT_SEED_CATEGORIES[1].id;
  const billsCat = DEFAULT_SEED_CATEGORIES.find((c) => c.name.toLowerCase().includes('bill') || c.name.toLowerCase().includes('utilities'))?.id ?? DEFAULT_SEED_CATEGORIES[2].id;
  const shoppingCat = DEFAULT_SEED_CATEGORIES.find((c) => c.name.toLowerCase().includes('shopping') || c.name.toLowerCase().includes('groceries'))?.id ?? DEFAULT_SEED_CATEGORIES[3].id;
  const salaryCat = DEFAULT_SEED_CATEGORIES.find((c) => c.kind === 'income')?.id ?? DEFAULT_SEED_CATEGORIES[DEFAULT_SEED_CATEGORIES.length - 1].id;

  // 1. Create Budgets
  const demoBudgets = [
    { id: newId(), categoryId: foodCat, limitMinor: 80000, updatedAt: currentTime, deletedAt: null },
    { id: newId(), categoryId: transportCat, limitMinor: 35000, updatedAt: currentTime, deletedAt: null },
    { id: newId(), categoryId: shoppingCat, limitMinor: 50000, updatedAt: currentTime, deletedAt: null },
  ];

  for (const b of demoBudgets) {
    await db
      .insert(budgets)
      .values(b)
      .onConflictDoUpdate({
        target: budgets.id,
        set: { limitMinor: b.limitMinor, updatedAt: currentTime },
      });
  }

  // 2. Create Recurring Rules
  const demoRules = [
    {
      id: newId(),
      kind: 'expense' as const,
      amountMinor: 150000,
      categoryId: billsCat,
      note: 'Apartment Rent',
      frequency: 'monthly' as const,
      day: 1,
      startOn: `${year}-01-01`,
      lastGeneratedOn: today,
      active: true,
      updatedAt: currentTime,
      deletedAt: null,
    },
    {
      id: newId(),
      kind: 'expense' as const,
      amountMinor: 15000,
      categoryId: billsCat,
      note: 'Fibre Internet',
      frequency: 'monthly' as const,
      day: 5,
      startOn: `${year}-01-01`,
      lastGeneratedOn: today,
      active: true,
      updatedAt: currentTime,
      deletedAt: null,
    },
  ];

  for (const r of demoRules) {
    await db
      .insert(recurringRules)
      .values(r)
      .onConflictDoUpdate({
        target: recurringRules.id,
        set: { amountMinor: r.amountMinor, updatedAt: currentTime },
      });
  }

  // 3. Create ~3 months of transactions
  const entries: Array<{
    id: string;
    kind: 'expense' | 'income';
    amountMinor: number;
    categoryId: string;
    occurredOn: string;
    monthKey: string;
    note: string;
    createdAt: number;
    updatedAt: number;
    deletedAt: null;
  }> = [];

  const sampleExpenses = [
    { cat: foodCat, note: 'Supermarket Groceries', min: 4500, max: 18000 },
    { cat: foodCat, note: 'Lunch at Cafe', min: 1800, max: 4200 },
    { cat: foodCat, note: 'Coffee and Pastry', min: 1200, max: 2500 },
    { cat: transportCat, note: 'Bolt ride to town', min: 1500, max: 3800 },
    { cat: transportCat, note: 'Fuel refill', min: 8000, max: 15000 },
    { cat: shoppingCat, note: 'Household supplies', min: 2500, max: 9500 },
    { cat: billsCat, note: 'Electricity units', min: 5000, max: 10000 },
  ];

  // Past 75 days
  for (let offset = 75; offset >= 0; offset--) {
    const d = new Date(year, month - 1, day - offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const mKey = toMonthKey(dateStr);

    // Monthly salary on the 25th
    if (d.getDate() === 25) {
      entries.push({
        id: newId(),
        kind: 'income',
        amountMinor: 450000,
        categoryId: salaryCat,
        occurredOn: dateStr,
        monthKey: mKey,
        note: 'Monthly Salary',
        createdAt: currentTime - offset * 86400000,
        updatedAt: currentTime - offset * 86400000,
        deletedAt: null,
      });
    }

    // 1-3 random transactions per day
    const countToday = (offset % 3) + 1;
    for (let i = 0; i < countToday; i++) {
      const template = sampleExpenses[(offset + i * 3) % sampleExpenses.length];
      const amount = Math.floor(template.min + Math.random() * (template.max - template.min));

      entries.push({
        id: newId(),
        kind: 'expense',
        amountMinor: amount,
        categoryId: template.cat,
        occurredOn: dateStr,
        monthKey: mKey,
        note: template.note,
        createdAt: currentTime - offset * 86400000 + i * 3600000,
        updatedAt: currentTime - offset * 86400000 + i * 3600000,
        deletedAt: null,
      });
    }
  }

  // Insert in batches
  for (const entry of entries) {
    await db.insert(transactions).values(entry);
  }

  // Rebuild all monthly totals so cache is 100% consistent
  await rebuildAll(db);

  return {
    transactionsCreated: entries.length,
    budgetsCreated: demoBudgets.length,
    rulesCreated: demoRules.length,
  };
}

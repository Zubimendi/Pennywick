// src/data/defaultCategories.ts
// Fixed seeded categories with deterministic 15-character IDs.
// Rule: 'seed' + slug padded with '0' to exactly 15 lowercase alphanumeric characters.

export interface SeedCategory {
  id: string;
  name: string;
  kind: 'expense' | 'income';
  icon: string;
  colorKey: string;
  sortOrder: number;
}

export function generateSeedId(slug: string): string {
  const sanitized = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `seed${sanitized}`.padEnd(15, '0').slice(0, 15);
}

export const DEFAULT_SEED_CATEGORIES: SeedCategory[] = [
  // Expense categories
  {
    id: generateSeedId('food'), // seedfood0000000
    name: 'Food & Groceries',
    kind: 'expense',
    icon: 'restaurant-outline',
    colorKey: 'cat5',
    sortOrder: 1,
  },
  {
    id: generateSeedId('transport'), // seedtransport00
    name: 'Transport & Fuel',
    kind: 'expense',
    icon: 'bus-outline',
    colorKey: 'cat1',
    sortOrder: 2,
  },
  {
    id: generateSeedId('airtime'), // seedairtime0000
    name: 'Airtime & Data',
    kind: 'expense',
    icon: 'wifi-outline',
    colorKey: 'cat2',
    sortOrder: 3,
  },
  {
    id: generateSeedId('power'), // seedpower000000
    name: 'Power & Utilities',
    kind: 'expense',
    icon: 'flash-outline',
    colorKey: 'cat6',
    sortOrder: 4,
  },
  {
    id: generateSeedId('housing'), // seedhousing0000
    name: 'Housing & Rent',
    kind: 'expense',
    icon: 'home-outline',
    colorKey: 'cat3',
    sortOrder: 5,
  },
  {
    id: generateSeedId('family'), // seedfamily00000
    name: 'Family Support',
    kind: 'expense',
    icon: 'people-outline',
    colorKey: 'cat4',
    sortOrder: 6,
  },
  {
    id: generateSeedId('shopping'), // seedshopping000
    name: 'Shopping',
    kind: 'expense',
    icon: 'cart-outline',
    colorKey: 'cat8',
    sortOrder: 7,
  },
  {
    id: generateSeedId('health'), // seedhealth00000
    name: 'Health & Pharmacy',
    kind: 'expense',
    icon: 'medkit-outline',
    colorKey: 'cat7',
    sortOrder: 8,
  },
  {
    id: generateSeedId('leisure'), // seedleisure0000
    name: 'Leisure & Drinks',
    kind: 'expense',
    icon: 'game-controller-outline',
    colorKey: 'cat9',
    sortOrder: 9,
  },
  {
    id: generateSeedId('other'), // seedother000000
    name: 'Other',
    kind: 'expense',
    icon: 'ellipsis-horizontal-outline',
    colorKey: 'cat10',
    sortOrder: 10,
  },

  // Income categories
  {
    id: generateSeedId('salary'), // seedsalary00000
    name: 'Salary',
    kind: 'income',
    icon: 'briefcase-outline',
    colorKey: 'cat1',
    sortOrder: 11,
  },
  {
    id: generateSeedId('business'), // seedbusiness000
    name: 'Business & Freelance',
    kind: 'income',
    icon: 'cash-outline',
    colorKey: 'cat7',
    sortOrder: 12,
  },
  {
    id: generateSeedId('gifts'), // seedgifts000000
    name: 'Gifts & Support',
    kind: 'income',
    icon: 'gift-outline',
    colorKey: 'cat4',
    sortOrder: 13,
  },
];

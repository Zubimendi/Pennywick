// src/data/currencies.ts
// Supported currencies for Pennywick. Default is NGN.

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const DEFAULT_CURRENCY = 'NGN';

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
];

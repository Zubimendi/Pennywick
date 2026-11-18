export interface ColorPalette {
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  expense: string;
  income: string;
  warning: string;
  danger: string;
  border: string;
  hairline: string;
  scrim: string;
  categories: {
    cat1: string;
    cat2: string;
    cat3: string;
    cat4: string;
    cat5: string;
    cat6: string;
    cat7: string;
    cat8: string;
    cat9: string;
    cat10: string;
  };
}

export const lightColors: ColorPalette = {
  bg: '#F6F8F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EAEFEA',
  text: '#14201D',
  textSecondary: '#52625D',
  textFaint: '#879893',
  primary: '#0F766E',
  primaryPressed: '#0B5C56',
  onPrimary: '#FFFFFF',
  expense: '#9F1239',
  income: '#0F766E',
  warning: '#B45309',
  danger: '#B91C1C',
  border: '#E1E8E5',
  hairline: 'rgba(20, 32, 29, 0.08)',
  scrim: 'rgba(0, 0, 0, 0.45)',
  categories: {
    cat1: '#0F766E',
    cat2: '#0284C7',
    cat3: '#7C3AED',
    cat4: '#C026D3',
    cat5: '#E11D48',
    cat6: '#D97706',
    cat7: '#16A34A',
    cat8: '#4F46E5',
    cat9: '#9333EA',
    cat10: '#475569',
  },
};

export const darkColors: ColorPalette = {
  bg: '#0E1513',
  surface: '#18211E',
  surfaceMuted: '#242F2B',
  text: '#EAF2EF',
  textSecondary: '#A6B7B1',
  textFaint: '#6E807A',
  primary: '#2DD4BF',
  primaryPressed: '#14B8A6',
  onPrimary: '#0E1513',
  expense: '#FB7185',
  income: '#2DD4BF',
  warning: '#FBBF24',
  danger: '#F87171',
  border: '#2A3733',
  hairline: 'rgba(234, 242, 239, 0.10)',
  scrim: 'rgba(0, 0, 0, 0.65)',
  categories: {
    cat1: '#2DD4BF',
    cat2: '#38BDF8',
    cat3: '#A78BFA',
    cat4: '#E879F9',
    cat5: '#FB7185',
    cat6: '#FBBF24',
    cat7: '#4ADE80',
    cat8: '#818CF8',
    cat9: '#C084FC',
    cat10: '#94A3B8',
  },
};

export interface PastelCardTheme {
  bg: string;
  border: string;
  accent: string;
  iconBg: string;
}

export const PASTEL_CARD_THEMES: PastelCardTheme[] = [
  // 0: Warm Peach / Sand (Croissant & Coffee)
  { bg: '#FFF7ED', border: '#FED7AA', accent: '#EA580C', iconBg: '#FFFFFF' },
  // 1: Soft Lavender (Online Education)
  { bg: '#F5F3FF', border: '#DDD6FE', accent: '#7C3AED', iconBg: '#FFFFFF' },
  // 2: Soft Sky / Cyan (Transport & Travel)
  { bg: '#F0F9FF', border: '#BAE6FD', accent: '#0284C7', iconBg: '#FFFFFF' },
  // 3: Soft Mint / Emerald (Groceries & Shopping)
  { bg: '#ECFDF5', border: '#A7F3D0', accent: '#059669', iconBg: '#FFFFFF' },
  // 4: Soft Rose / Pink (Dining & Leisure)
  { bg: '#FFF1F2', border: '#FECDD3', accent: '#E11D48', iconBg: '#FFFFFF' },
  // 5: Soft Amber / Lemon (Power & Utilities)
  { bg: '#FEFCE8', border: '#FEF08A', accent: '#CA8A04', iconBg: '#FFFFFF' },
  // 6: Soft Orchid / Violet (Personal Care)
  { bg: '#FDF4FF', border: '#F5D0FE', accent: '#C026D3', iconBg: '#FFFFFF' },
];

export const DARK_PASTEL_CARD_THEMES: PastelCardTheme[] = [
  { bg: '#2A1C16', border: '#43281C', accent: '#FB923C', iconBg: '#382319' },
  { bg: '#221C35', border: '#3B2E5C', accent: '#A78BFA', iconBg: '#2E244A' },
  { bg: '#162534', border: '#1E3A5F', accent: '#38BDF8', iconBg: '#1B314B' },
  { bg: '#142921', border: '#1C4436', accent: '#34D399', iconBg: '#18382C' },
  { bg: '#2B171E', border: '#4C2432', accent: '#FB7185', iconBg: '#3C1B27' },
  { bg: '#292514', border: '#48401C', accent: '#FBBF24', iconBg: '#3A3319' },
  { bg: '#29182E', border: '#492654', accent: '#E879F9', iconBg: '#391F40' },
];

export function getPastelTheme(index: number, isDark = false): PastelCardTheme {
  const list = isDark ? DARK_PASTEL_CARD_THEMES : PASTEL_CARD_THEMES;
  return list[Math.abs(index) % list.length];
}

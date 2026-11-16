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

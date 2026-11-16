import { useColorScheme } from 'react-native';
import { ColorPalette, darkColors, lightColors } from './colors';
import { space, radius, hit } from './spacing';
import { type } from './typography';
import { useUiStore } from './uiStore';

export interface Theme {
  colors: ColorPalette;
  isDark: boolean;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  hit: typeof hit;
}

export function useTheme(): Theme {
  const systemColorScheme = useColorScheme();
  const themeMode = useUiStore((state) => state.themeMode);

  const isDark =
    themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    space,
    radius,
    type,
    hit,
  };
}

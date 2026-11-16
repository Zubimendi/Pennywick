export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export type SpaceKey = keyof typeof space;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;

export const hit = {
  min: 48,
  keypadWidth: 64,
  keypadHeight: 56,
} as const;

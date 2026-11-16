import type { TextStyle } from 'react-native';

const monoFont = 'monospace';

export const type = {
  hero: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  } as TextStyle,
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  } as TextStyle,
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  } as TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  } as TextStyle,
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.2,
  } as TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  } as TextStyle,
  figure: {
    fontFamily: monoFont,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;

export type TypographyRole = keyof typeof type;

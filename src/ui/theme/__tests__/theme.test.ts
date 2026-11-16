import { lightColors, darkColors } from '../colors';
import { space, radius, hit } from '../spacing';
import { type } from '../typography';

describe('Theme Tokens (T2)', () => {
  it('defines valid hex colors for light and dark palettes', () => {
    expect(lightColors.bg).toBe('#F6F8F7');
    expect(darkColors.bg).toBe('#0E1513');
    expect(lightColors.primary).toBe('#0F766E');
    expect(darkColors.primary).toBe('#2DD4BF');
  });

  it('defines 10 distinct category colors for both themes', () => {
    const lightKeys = Object.keys(lightColors.categories);
    const darkKeys = Object.keys(darkColors.categories);
    expect(lightKeys).toHaveLength(10);
    expect(darkKeys).toHaveLength(10);
  });

  it('defines valid corner radii tokens', () => {
    expect(radius.sm).toBe(8);
    expect(radius.md).toBe(12);
    expect(radius.lg).toBe(16);
    expect(radius.pill).toBe(999);
  });

  it('provides a strict 4-point spacing rhythm', () => {
    expect(space.xs).toBe(4);
    expect(space.sm).toBe(8);
    expect(space.md).toBe(12);
    expect(space.lg).toBe(16);
    expect(space.xl).toBe(24);
    expect(space.xxl).toBe(32);
    expect(space.huge).toBe(48);
  });

  it('enforces min touch targets', () => {
    expect(hit.min).toBeGreaterThanOrEqual(44);
    expect(hit.keypadWidth).toBeGreaterThanOrEqual(64);
    expect(hit.keypadHeight).toBeGreaterThanOrEqual(56);
  });

  it('provides named typography roles', () => {
    expect(type.hero.fontSize).toBe(40);
    expect(type.title.fontSize).toBe(28);
    expect(type.heading.fontSize).toBe(20);
    expect(type.body.fontSize).toBe(16);
  });
});

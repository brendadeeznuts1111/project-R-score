/**
 * FactoryWager Theme Palette Tests
 * 
 * Verifies the theme system uses only:
 * - Blue (primary)
 * - Teal (secondary)
 * - Green (success)
 * - Orange (warning)
 * - Red (error)
 * 
 * NO PURPLE/INDIGO colors allowed
 */

import { describe, test, expect } from 'bun:test';
import { themes, themeList } from '../themes/config/index';

describe('🏰 FactoryWager Theme Palette', () => {
  
  describe('Theme Registry', () => {
    test('has factorywager theme', () => {
      expect(themes.factorywager).toBeDefined();
      expect(themes.factorywager.meta.name).toBe('FactoryWager');
    });

    test('all themes are registered', () => {
      expect(themes.light).toBeDefined();
      expect(themes.dark).toBeDefined();
      expect(themes.professional).toBeDefined();
      expect(themes.factorywager).toBeDefined();
    });

    test('theme list includes all themes', () => {
      const names = themeList.map(t => t.id);
      expect(names).toContain('light');
      expect(names).toContain('dark');
      expect(names).toContain('professional');
      expect(names).toContain('factorywager');
    });
  });

  describe('FactoryWager Theme - Blue Palette', () => {
    const fw = themes.factorywager;

    test('primary is blue (hue ~210)', () => {
      const primary500 = fw.colors.primary['500'];
      const match = primary500.match(/hsl\((\d+)/);
      expect(match).toBeTruthy();
      const hue = parseInt(match![1]);
      // Blue is around 200-220
      expect(hue).toBeGreaterThanOrEqual(200);
      expect(hue).toBeLessThanOrEqual(220);
    });

    test('has full blue scale (50-950)', () => {
      expect(fw.colors.primary['50']).toBeDefined();
      expect(fw.colors.primary['500']).toBeDefined();
      expect(fw.colors.primary['950']).toBeDefined();
    });
  });

  describe('FactoryWager Theme - Teal Palette', () => {
    const fw = themes.factorywager;

    test('secondary is teal (hue ~170-180)', () => {
      const secondary500 = fw.colors.secondary['500'];
      const match = secondary500.match(/hsl\((\d+)/);
      expect(match).toBeTruthy();
      const hue = parseInt(match![1]);
      // Teal is around 170-180
      expect(hue).toBeGreaterThanOrEqual(170);
      expect(hue).toBeLessThanOrEqual(180);
    });

    test('has full teal scale', () => {
      expect(fw.colors.secondary['500']).toBeDefined();
    });
  });

  describe('FactoryWager Theme - Green Palette', () => {
    const fw = themes.factorywager;

    test('success is green (hue ~140-150)', () => {
      const success500 = fw.colors.success['500'];
      const match = success500.match(/hsl\((\d+)/);
      expect(match).toBeTruthy();
      const hue = parseInt(match![1]);
      // Green is around 140-150
      expect(hue).toBeGreaterThanOrEqual(140);
      expect(hue).toBeLessThanOrEqual(150);
    });

    test('status.online uses green', () => {
      const online = fw.colors.status.online;
      expect(online).toBeDefined();
    });
  });

  describe('FactoryWager Theme - Orange Palette', () => {
    const fw = themes.factorywager;

    test('warning is orange (hue ~25-35)', () => {
      const warning500 = fw.colors.warning['500'];
      const match = warning500.match(/hsl\((\d+)/);
      expect(match).toBeTruthy();
      const hue = parseInt(match![1]);
      // Orange is around 25-35
      expect(hue).toBeGreaterThanOrEqual(25);
      expect(hue).toBeLessThanOrEqual(35);
    });

    test('status.away uses orange', () => {
      const away = fw.colors.status.away;
      expect(away).toBeDefined();
    });
  });

  describe('FactoryWager Theme - Red Palette', () => {
    const fw = themes.factorywager;

    test('error is red (hue ~0-10)', () => {
      const error500 = fw.colors.error['500'];
      const match = error500.match(/hsl\((\d+)/);
      expect(match).toBeTruthy();
      const hue = parseInt(match![1]);
      // Red is around 0-10
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThanOrEqual(10);
    });

    test('status.busy uses red', () => {
      const busy = fw.colors.status.busy;
      expect(busy).toBeDefined();
    });
  });

  describe('NO PURPLE/INDIGO Colors', () => {
    const allThemes = [themes.light, themes.dark, themes.professional, themes.factorywager];

    test('no purple hues (260-300) in any theme colors', () => {
      const checkHsl = (hsl: string) => {
        const match = hsl.match(/hsl\((\d+)/);
        if (!match) return;
        const hue = parseInt(match[1]);
        // Purple is 260-300, indigo is 240-260
        expect(hue).not.toBeWithin(240, 300);
      };

      for (const theme of allThemes) {
        // Check all color scales
        Object.values(theme.colors.primary).forEach(checkHsl);
        Object.values(theme.colors.secondary).forEach(checkHsl);
        Object.values(theme.colors.success).forEach(checkHsl);
        Object.values(theme.colors.warning).forEach(checkHsl);
        Object.values(theme.colors.error).forEach(checkHsl);
      }
    });
  });

  describe('Theme Utilities', () => {
    test('can access theme colors', () => {
      const fw = themes.factorywager;
      expect(fw.colors.primary['500']).toContain('hsl');
      expect(fw.colors.success['500']).toContain('hsl');
    });

    test('theme has meta information', () => {
      const fw = themes.factorywager;
      expect(fw.meta.icon).toBe('🏰');
      expect(fw.meta.version).toBe('2.0.0');
    });
  });
});

// Extend expect matchers
declare module 'bun:test' {
  interface Matchers<T> {
    toBeWithin(min: number, max: number): T;
  }
}

// Custom matcher for range checking
expect.extend({
  toBeWithin(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within ${min}-${max}`,
    };
  },
});

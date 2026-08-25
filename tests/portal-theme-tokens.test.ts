// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/color
import { describe, expect, test } from 'bun:test';
import {
  ThemeTokenResolveError,
  formatThemeToken,
  normalizeThemeTokenPath,
  resolveThemeTokenColor,
} from '../lib/portal/theme-token-resolve.ts';

describe('portal theme token resolve', () => {
  test('sportsbook resolves to dark.green #3fb950', () => {
    const color = resolveThemeTokenColor('semantic.vertical.sportsbook');
    expect(color.toLowerCase()).toBe('#3fb950');
    expect(formatThemeToken('semantic.vertical.sportsbook', 'hex').toLowerCase()).toBe(
      '#3fb950'
    );
  });

  test('tier.sharp resolves to dark.red #f85149', () => {
    const color = resolveThemeTokenColor('semantic.tier.sharp');
    expect(color.toLowerCase()).toBe('#f85149');
    expect(formatThemeToken('semantic.tier.sharp', 'hex').toLowerCase()).toBe('#f85149');
  });

  test('tiers.sharp alias maps to tier.sharp', () => {
    expect(normalizeThemeTokenPath('semantic.tiers.sharp')).toBe('semantic.tier.sharp');
    expect(resolveThemeTokenColor('semantic.tiers.sharp').toLowerCase()).toBe('#f85149');
    expect(formatThemeToken('semantic.tiers.sharp', 'hex').toLowerCase()).toBe('#f85149');
  });

  test('channels.telegram fails closed with nearest paths', () => {
    expect(() => resolveThemeTokenColor('semantic.channels.telegram')).toThrow(
      ThemeTokenResolveError
    );
    try {
      resolveThemeTokenColor('semantic.channels.telegram');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ThemeTokenResolveError);
      const e = err as ThemeTokenResolveError;
      expect(e.code).toBe('unknown-token');
      expect(e.message).toContain('Unknown theme token path');
      expect(e.message).toContain('Nearest paths:');
      expect(e.nearest.length).toBeGreaterThan(0);
    }
  });

  test('number format is integer', () => {
    const out = formatThemeToken('dark.green', 'number');
    expect(out).toMatch(/^\d+$/);
    expect(Number.parseInt(out, 10)).toBe(4176208);
  });

  test('[rgba] is 4-length array', () => {
    const out = formatThemeToken('dark.green', '[rgba]');
    const parsed = JSON.parse(out) as unknown;
    expect(Array.isArray(parsed)).toBe(true);
    expect((parsed as number[]).length).toBe(4);
    expect(parsed).toEqual([63, 185, 80, 255]);
  });

  test('hsl format matches Bun.color for #3fb950', () => {
    const expected = Bun.color('#3fb950', 'hsl');
    expect(typeof expected).toBe('string');
    expect(formatThemeToken('semantic.vertical.sportsbook', 'hsl')).toBe(expected);
  });

  test('--scheme light resolves palette vars to light scheme', () => {
    expect(resolveThemeTokenColor('semantic.vertical.sportsbook', { scheme: 'light' })).toBe(
      '#1a7f37'
    );
  });

  test('Bun 1.4 namespace resolves through shared dark and light kernels', () => {
    expect(resolveThemeTokenColor('namespaces.bun14.accent')).toBe('#58a6ff');
    expect(resolveThemeTokenColor('namespaces.bun14.accent', { scheme: 'light' })).toBe(
      '#0969da'
    );
    expect(resolveThemeTokenColor('namespaces.bun14.surfaceHover')).toBe('#1c2333');
    expect(resolveThemeTokenColor('namespaces.bun14.danger')).toBe('#f85149');
  });
});

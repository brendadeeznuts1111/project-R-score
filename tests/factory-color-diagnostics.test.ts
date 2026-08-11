// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
import { beforeEach, describe, expect, test } from 'bun:test';
import {
  COLOR_FORMATS,
  cachedColor,
  clearColorCache,
  colorCacheStats,
  diagnoseColor,
  diagnoseColorCapabilities,
  generateColorPalette,
  mixColor,
  parseColorTones,
  parseColor,
} from '../lib/factory/color-diagnostics.ts';

beforeEach(clearColorCache);

describe('factory Bun.color diagnostics', () => {
  test('covers every format in the current Bun declaration surface', () => {
    expect(COLOR_FORMATS).toEqual([
      'ansi',
      'ansi-16',
      'ansi-256',
      'ansi-16m',
      'css',
      'rgb',
      'rgba',
      'hsl',
      'lab',
      'hex',
      'HEX',
      '{rgb}',
      '{rgba}',
      '[rgb]',
      '[rgba]',
      'number',
    ]);
    expect(diagnoseColor('rgba(224 108 117 / 0.5)').formats).toHaveLength(16);
  });

  test('reports alpha-preserving and alpha-dropping formats truthfully', () => {
    const byFormat = new Map(
      diagnoseColor('rgba(224 108 117 / 0.5)').formats.map(row => [row.format, row.value])
    );
    expect(byFormat.get('css')).toBe('#e06c7580');
    expect(byFormat.get('hex')).toBe('#e06c75');
    expect(byFormat.get('rgba')).toContain('0.5019608');
    expect(byFormat.get('{rgba}')).toMatchObject({ r: 224, g: 108, b: 117 });
    expect(byFormat.get('[rgba]')).toEqual([224, 108, 117, 128]);
  });

  test('distinguishes concrete, symbolic, and invalid inputs', () => {
    expect(parseColor('transparent')).toEqual({
      kind: 'concrete',
      rgba: { r: 0, g: 0, b: 0, a: 0 },
    });
    expect(parseColor('currentcolor')).toEqual({ kind: 'symbolic', value: 'currentColor' });
    expect(parseColor('color(display-p3 0 1 0)')).toEqual({
      kind: 'symbolic',
      value: 'color(display-p3 0 1 0)',
    });
    expect(parseColor('definitely-not-a-color')).toEqual({ kind: 'invalid' });
  });

  test('probes modern syntax, CSS units, symbolic values, and runtime clamping', () => {
    const cases = new Map(diagnoseColorCapabilities().map(row => [row.feature, row]));
    expect(cases.get('space-separated rgb()')?.result).toBe('#ff0000');
    expect(cases.get('slash alpha')?.result).toBe('#ff000080');
    expect(cases.get('radian angle')?.result).toBe('#00ffff');
    expect(cases.get('context keyword')?.status).toBe('symbolic');
    expect(cases.get('display-p3 preservation')?.status).toBe('symbolic');
    expect(cases.get('rgb clamping')?.result).toBe('#ff0000');
    expect(cases.get('object clamping')?.result).toBe('#ff0064');
    expect(cases.get('invalid input')?.status).toBe('unsupported');
  });

  test('memoizes repeated conversions with a bounded cache', () => {
    expect(cachedColor('#e06c75', 'hex')).toBe('#e06c75');
    expect(cachedColor('#e06c75', 'hex')).toBe('#e06c75');
    expect(colorCacheStats()).toEqual({ size: 1, hits: 1, misses: 1 });
  });
});

describe('factory color palette', () => {
  test('builds a centered 15-step palette', () => {
    const palette = generateColorPalette('#e06c75');
    expect(palette).toHaveLength(15);
    expect(palette?.[7]).toEqual({ step: 8, amount: 0, color: '#e06c75' });
    expect(palette?.every(entry => /^#[0-9a-f]{6}$/.test(entry.color))).toBe(true);
  });

  test('linear-light mode differs from encoded sRGB mixing', () => {
    expect(mixColor('#202020', 0.5)).toBe('#909090');
    expect(mixColor('#202020', 0.5, { perceptual: true })).toBe('#bdbdbd');
  });

  test('preserves alpha and rejects symbolic or invalid palette bases', () => {
    expect(mixColor('rgba(224 108 117 / 0.5)', 0)).toBe('#e06c7580');
    expect(generateColorPalette('currentcolor')).toBeNull();
    expect(generateColorPalette('not-a-color')).toBeNull();
  });

  test('accepts explicit validated tone positions', () => {
    expect(parseColorTones('0,0.1,0.3,0.6,1')).toEqual([0, 0.1, 0.3, 0.6, 1]);
    expect(parseColorTones('0,wat,1')).toBeNull();
    expect(parseColorTones('-1.1,0,1')).toBeNull();
    expect(generateColorPalette('#e06c75', { amounts: [0, 0.1, 0.3, 0.6, 1] })).toEqual([
      { step: 1, amount: 0, color: '#e06c75' },
      { step: 2, amount: 0.1, color: '#e37b83' },
      { step: 3, amount: 0.3, color: '#e9989e' },
      { step: 4, amount: 0.6, color: '#f3c4c8' },
      { step: 5, amount: 1, color: '#ffffff' },
    ]);
  });
});

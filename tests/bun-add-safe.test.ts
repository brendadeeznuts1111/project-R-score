import { describe, expect, test } from 'bun:test';
import { withExactDefault, wantsOpenRange } from '../scripts/bun-add-safe.ts';

describe('wantsOpenRange', () => {
  test('detects open ranges after last @', () => {
    expect(wantsOpenRange('zod@^3.0.0')).toBe(true);
    expect(wantsOpenRange('zod@~3.0.0')).toBe(true);
    expect(wantsOpenRange('zod@*')).toBe(true);
    expect(wantsOpenRange('zod@>=3.0.0')).toBe(true);
    expect(wantsOpenRange('zod@<4')).toBe(true);
    expect(wantsOpenRange('pkg@1.0.0 - 2.0.0')).toBe(true);
    expect(wantsOpenRange('zod@3.x')).toBe(true);
  });

  test('pins and scoped names are not open ranges', () => {
    expect(wantsOpenRange('zod')).toBe(false);
    expect(wantsOpenRange('zod@3.20.0')).toBe(false);
    expect(wantsOpenRange('zod@latest')).toBe(false);
    expect(wantsOpenRange('@types/bun')).toBe(false);
    expect(wantsOpenRange('@types/bun@latest')).toBe(false);
    expect(wantsOpenRange('--dev')).toBe(false);
  });
});

describe('withExactDefault', () => {
  test('bare package gets --exact', () => {
    expect(withExactDefault(['zod'])).toEqual(['zod', '--exact']);
  });

  test('open range skips inject', () => {
    expect(withExactDefault(['zod@^3.0.0'])).toEqual(['zod@^3.0.0']);
  });

  test('global skips inject', () => {
    expect(withExactDefault(['-g', 'cowsay'])).toEqual(['-g', 'cowsay']);
    expect(withExactDefault(['--global', 'cowsay'])).toEqual(['--global', 'cowsay']);
  });

  test('scoped package still gets --exact', () => {
    expect(withExactDefault(['@types/bun'])).toEqual(['@types/bun', '--exact']);
  });

  test('already -E or --exact unchanged', () => {
    expect(withExactDefault(['zod', '-E'])).toEqual(['zod', '-E']);
    expect(withExactDefault(['zod', '--exact'])).toEqual(['zod', '--exact']);
  });

  test('pass-through other flags', () => {
    expect(withExactDefault(['--dev', '@types/react'])).toEqual([
      '--dev',
      '@types/react',
      '--exact',
    ]);
  });
});

import { describe, expect, test } from 'bun:test';
import { publicTreeIsClean } from '../scripts/assert-public-clean.ts';

describe('public artifact clean assertion', () => {
  test('accepts empty git porcelain output only', () => {
    expect(publicTreeIsClean('')).toBe(true);
    expect(publicTreeIsClean('\n')).toBe(true);
    expect(publicTreeIsClean(' M public/registry/example.json\n')).toBe(false);
  });
});

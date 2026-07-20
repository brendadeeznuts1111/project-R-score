// @see https://bun.com/docs/cli/test — bun:test
import { describe, expect, test } from 'bun:test';
import { BrandValidationError } from '../core/core-errors.ts';
import {
  asAccessKeyId,
  asAccountId,
  asZoneId,
  parseAccessKeyId,
  parseAccountId,
  parseZoneId,
  tryAccessKeyId,
  tryAccountId,
  tryZoneId,
} from './branded.ts';

describe('brand empty policy', () => {
  test('as* rejects empty and non-string', () => {
    expect(() => asAccountId('')).toThrow(BrandValidationError);
    expect(() => asAccessKeyId('')).toThrow(BrandValidationError);
    expect(() => asZoneId('')).toThrow(BrandValidationError);
  });

  test('try* returns undefined for missing/blank — never forges empty brand', () => {
    expect(tryAccountId(undefined)).toBeUndefined();
    expect(tryAccountId(null)).toBeUndefined();
    expect(tryAccountId('')).toBeUndefined();
    expect(tryAccountId('   ')).toBeUndefined();
    expect(tryAccessKeyId('')).toBeUndefined();
    expect(tryZoneId('')).toBeUndefined();
  });

  test('try* brands non-empty values', () => {
    expect(tryAccountId('acct123')).toBe(asAccountId('acct123'));
    expect(tryAccessKeyId('AKIA')).toBe(asAccessKeyId('AKIA'));
    expect(tryZoneId('zone-1')).toBe(asZoneId('zone-1'));
  });

  test('parse* fail closed on wire garbage', () => {
    expect(() => parseZoneId(undefined)).toThrow(BrandValidationError);
    expect(() => parseZoneId(42)).toThrow(BrandValidationError);
    expect(() => parseZoneId('')).toThrow(BrandValidationError);
    expect(parseZoneId(' z1 ')).toBe(asZoneId('z1'));
    expect(parseAccountId('a1')).toBe(asAccountId('a1'));
    expect(parseAccessKeyId('k1')).toBe(asAccessKeyId('k1'));
  });
});

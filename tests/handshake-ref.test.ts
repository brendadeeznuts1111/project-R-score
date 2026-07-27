import { describe, expect, test } from 'bun:test';
import {
  assertCallSignArg,
  assertPartnerCodeArg,
  partnerCodeFromCallSign,
  tryPartnerCodeArg,
} from '../lib/telegram/handshake-ref.ts';

describe('handshake ref rules', () => {
  test('assertPartnerCodeArg accepts CODE only', () => {
    expect(assertPartnerCodeArg('bil')).toBe('BIL');
    expect(assertPartnerCodeArg('NOV')).toBe('NOV');
  });

  test('assertPartnerCodeArg rejects seat call-sign', () => {
    expect(() => assertPartnerCodeArg('BIL-001')).toThrow(/CODE only \(BIL\)/);
  });

  test('assertCallSignArg accepts seat only', () => {
    expect(assertCallSignArg('BIL-001')).toBe('BIL-001');
  });

  test('assertCallSignArg rejects bare CODE', () => {
    expect(() => assertCallSignArg('BIL')).toThrow(/seat call-sign \(BIL-001\)/);
  });

  test('partnerCodeFromCallSign derives CODE internally', () => {
    expect(partnerCodeFromCallSign('ASH-001')).toBe('ASH');
    expect(tryPartnerCodeArg('BIL-001')).toBeNull();
  });
});

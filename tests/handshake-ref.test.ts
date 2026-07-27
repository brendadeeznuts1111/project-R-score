import { describe, expect, test } from 'bun:test';
import {
  coerceHandshakePartnerCode,
  tryHandshakePartnerCode,
} from '../lib/telegram/handshake-ref.ts';

describe('coerceHandshakePartnerCode', () => {
  test('accepts partner CODE', () => {
    expect(coerceHandshakePartnerCode('bil')).toBe('BIL');
    expect(coerceHandshakePartnerCode('NOV')).toBe('NOV');
  });

  test('accepts seat call-sign', () => {
    expect(coerceHandshakePartnerCode('BIL-001')).toBe('BIL');
    expect(coerceHandshakePartnerCode('ASH-001-SUB01')).toBe('ASH');
  });

  test('tryHandshakePartnerCode returns null on invalid', () => {
    expect(tryHandshakePartnerCode('XX')).toBeNull();
    expect(tryHandshakePartnerCode('BIL-001')).toBe('BIL');
  });
});

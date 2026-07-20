import { describe, expect, test } from 'bun:test';
import { asAccessKeyId, asAccountId } from '../types/branded.ts';
import {
  hasR2Credentials,
  normalizeR2Credentials,
  requireR2Credentials,
  r2CredentialsFromEnv,
} from './r2-credentials.ts';

describe('normalizeR2Credentials empty policy', () => {
  test('empty strings become undefined brands, not forged empty brands', () => {
    const n = normalizeR2Credentials({
      accountId: '',
      accessKeyId: '   ',
      secretAccessKey: '',
    });
    expect(n.accountId).toBeUndefined();
    expect(n.accessKeyId).toBeUndefined();
    expect(n.secretAccessKey).toBe('');
    expect(hasR2Credentials(n)).toBe(false);
  });

  test('non-empty values brand', () => {
    const n = normalizeR2Credentials({
      accountId: 'acct',
      accessKeyId: 'key',
      secretAccessKey: 'sec',
    });
    expect(n.accountId).toBe(asAccountId('acct'));
    expect(n.accessKeyId).toBe(asAccessKeyId('key'));
    expect(hasR2Credentials(n)).toBe(true);
  });

  test('requireR2Credentials throws listing missing env names', () => {
    expect(() => requireR2Credentials({})).toThrow(/R2_ACCOUNT_ID/);
    expect(() =>
      requireR2Credentials({ accountId: 'a', accessKeyId: 'k', secretAccessKey: 's' })
    ).not.toThrow();
  });

  test('r2CredentialsFromEnv reads overrides over empty env map', () => {
    const n = r2CredentialsFromEnv(
      { accountId: 'from-override', accessKeyId: 'k', secretAccessKey: 's' },
      {}
    );
    expect(n.accountId).toBe(asAccountId('from-override'));
  });
});

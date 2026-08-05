// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import {
  PASS_PAT_VAULT_MATRIX,
  defaultSshVaultForPat,
  isPassSessionReady,
  parsePassInfoJson,
  templateToRunEnv,
  vaultNamesFromListJson,
} from '../lib/security/pass-session.ts';

describe('pass-session (TS)', () => {
  test('templateToRunEnv strips handlebars', () => {
    const out = templateToRunEnv(
      'A={{ pass://factorywager/X/password }}\nB=plain\nC={{  pass://v/i/f  }}\n'
    );
    expect(out).toContain('A=pass://factorywager/X/password');
    expect(out).toContain('C=pass://v/i/f');
    expect(out).toContain('B=plain');
    expect(out).not.toMatch(/A=\{\{/);
  });

  test('isPassSessionReady / parsePassInfoJson', () => {
    expect(isPassSessionReady(null)).toBe(false);
    expect(isPassSessionReady({ personal_access_token_name: 'N/A' })).toBe(false);
    expect(isPassSessionReady({ personal_access_token_name: 'factorywager-bot' })).toBe(true);
    const info = parsePassInfoJson(
      JSON.stringify({
        release_track: 'stable',
        personal_access_token_name: 'factorywager-bot',
        session_has_lock: false,
      })
    );
    expect(info?.personal_access_token_name).toBe('factorywager-bot');
    expect(parsePassInfoJson('not-json')).toBeNull();
  });

  test('vaultNamesFromListJson', () => {
    expect(
      vaultNamesFromListJson(JSON.stringify({ vaults: [{ name: 'factorywager' }, { name: 'a' }] }))
    ).toEqual(['a', 'factorywager']);
    expect(vaultNamesFromListJson('[]')).toEqual([]);
  });

  test('PAT vault matrix lists factorywager-only for factorywager-bot', () => {
    expect([...PASS_PAT_VAULT_MATRIX.factorywager.vaults]).toEqual(['factorywager']);
    expect(PASS_PAT_VAULT_MATRIX.factorywager.notes).toMatch(/Personal/i);
  });

  test('defaultSshVaultForPat prefers factorywager for agent bots', () => {
    expect(defaultSshVaultForPat('factorywager-bot')).toBe('factorywager');
    expect(defaultSshVaultForPat(null)).toBe('factorywager');
    expect(defaultSshVaultForPat('agent-work')).toBe('Personal');
  });
});

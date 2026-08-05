// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import {
  PASS_PAT_VAULT_MATRIX,
  checkPatVaultMatrix,
  defaultSshVaultForPat,
  expectedVaultsForPatName,
  isPassSessionReady,
  parsePassInfoJson,
  templateToRunEnv,
  vaultNamesFromListJson,
  writeRunEnvTemp,
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

  test('defaultSshVaultForPat maps each agent PAT to its vault', () => {
    expect(defaultSshVaultForPat('factorywager-bot')).toBe('factorywager');
    expect(defaultSshVaultForPat(null)).toBe('factorywager');
    expect(defaultSshVaultForPat('bet-ticker-bot')).toBe('bet-ticker');
    expect(defaultSshVaultForPat('cascade-bot')).toBe('cascade-mover');
    expect(defaultSshVaultForPat('kalshi-bot')).toBe('kalshi-bot');
    expect(defaultSshVaultForPat('partners-bot')).toBe('partners');
    expect(defaultSshVaultForPat('agent-work')).toBe('Personal');
  });

  test('expectedVaultsForPatName + checkPatVaultMatrix', () => {
    expect([...expectedVaultsForPatName('factorywager-bot')]).toEqual(['factorywager']);
    expect([...expectedVaultsForPatName('cloudflare-bot')].sort()).toEqual([
      'cloudflare',
      'factorywager',
    ]);
    const ok = checkPatVaultMatrix('factorywager-bot', ['factorywager']);
    expect(ok.ok).toBe(true);
    expect(ok.missing).toEqual([]);
    const bad = checkPatVaultMatrix('factorywager-bot', []);
    expect(bad.ok).toBe(false);
    expect(bad.missing).toEqual(['factorywager']);
    // Extra visible vaults do not fail (unexpected is informational)
    const extra = checkPatVaultMatrix('factorywager-bot', ['factorywager', 'Personal']);
    expect(extra.ok).toBe(true);
    expect(extra.unexpected).toEqual(['Personal']);
    // Unknown PAT → no expected vaults → ok
    expect(checkPatVaultMatrix('mystery-pat', ['x']).ok).toBe(true);
  });

  test('writeRunEnvTemp materializes + chmod; caller deletes', async () => {
    const dir = `${Bun.env.TMPDIR ?? '/tmp'}`;
    const path = await writeRunEnvTemp('K={{ pass://factorywager/X/password }}\n', {
      dir,
      pid: 424242,
    });
    expect(path.endsWith('fw-pass-run-424242.env')).toBe(true);
    const text = await Bun.file(path).text();
    expect(text).toContain('K=pass://factorywager/X/password');
    expect(text).not.toMatch(/\{\{/);
    unlinkSync(path);
    expect(await Bun.file(path).exists()).toBe(false);
  });
});

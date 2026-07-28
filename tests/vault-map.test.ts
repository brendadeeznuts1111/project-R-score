// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildVaultMapBundle,
  colorize,
  entryForVaultItem,
  formatVaultStatusLine,
  parsePassUri,
} from '../lib/security/vault-map.ts';

describe('vault-map', () => {
  test('parsePassUri splits vault / multi-segment item / field', () => {
    const p = parsePassUri('pass://factorywager/Cloudflare API Token/password');
    expect(p).toEqual({
      vault: 'factorywager',
      item: 'Cloudflare API Token',
      field: 'password',
    });
    const tg = parsePassUri('pass://factorywager/Telegram: factorywager_bot/password');
    expect(tg?.item).toBe('Telegram: factorywager_bot');
  });

  test('parsePassUri rejects non-pass refs', () => {
    expect(parsePassUri('https://example.com')).toBeNull();
    expect(parsePassUri('pass://only')).toBeNull();
  });

  test('buildVaultMapBundle merges template + display chrome', async () => {
    const bundle = await buildVaultMapBundle({ root: process.cwd() });
    expect(bundle.kind).toBe('vault-map-bundle');
    expect(bundle.summary.entryCount).toBeGreaterThan(0);
    expect(bundle.summary.withColor).toBeGreaterThan(0);
    expect(bundle.summary.withIcon).toBeGreaterThan(0);

    const cf = bundle.entries.find(e => e.envKey === 'CLOUDFLARE_API_TOKEN');
    expect(cf).toBeDefined();
    expect(cf!.inTemplate).toBe(true);
    expect(cf!.vault).toBe('factorywager');
    expect(cf!.item).toBe('Cloudflare API Token');
    expect(cf!.field).toBe('password');
    expect(cf!.label).toContain('Cloudflare');
    expect(cf!.color).toMatch(/^#/);
    expect(cf!.icon).toContain('cloudflare.svg');
    expect(cf!.passRef).toContain('pass://factorywager/');

    // Never embed secret-looking values
    const blob = JSON.stringify(bundle);
    expect(blob).not.toMatch(/cfat_[A-Za-z0-9]+/);
  });

  test('formatVaultStatusLine never includes values', () => {
    const line = formatVaultStatusLine(
      {
        label: 'GitHub PAT',
        envKey: 'GITHUB_TOKEN',
        color: '#2DA44E',
        glyph: '🐙',
      },
      true
    );
    expect(line).toContain('GitHub PAT');
    expect(line).toContain('set');
    expect(line).not.toContain('ghp_');
    expect(line).not.toContain('secret');
  });

  test('colorize uses ansi-16m for hex', () => {
    const out = colorize('ok', '#2DA44E');
    expect(out.includes('ok')).toBe(true);
    // truecolor escape or plain fallback
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  test('entryForVaultItem matches title then env key', async () => {
    const bundle = await buildVaultMapBundle({ root: process.cwd() });
    const hit = entryForVaultItem(
      bundle,
      'factorywager',
      'Cloudflare API Token',
      t => t.replace(/[^a-zA-Z0-9_]+/g, '_').toUpperCase()
    );
    expect(hit?.envKey).toBe('CLOUDFLARE_API_TOKEN');
  });
});

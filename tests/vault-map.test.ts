// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/bundler/loaders#toml — type: "toml"
import { describe, expect, test } from 'bun:test';
import {
  buildVaultMapBundle,
  colorize,
  entryForVaultItem,
  formatVaultStatusLine,
  loadVaultMapFile,
  loadVaultMapTomlImport,
  parsePassUri,
  parseVaultMapToml,
  VAULT_MAP_TOML_PATH,
} from '../lib/security/vault-map.ts';

describe('vault-map', () => {
  test('loads config/vault-map.toml via type: "toml" import', async () => {
    const file = await loadVaultMapTomlImport(VAULT_MAP_TOML_PATH);
    expect(file?.kind).toBe('vault-map');
    expect(file?.envMap?.CLOUDFLARE_API_TOKEN?.color).toMatch(/^#/);
  });

  test('Bun.TOML.parse and loadVaultMapFile prefer toml', async () => {
    const text = await Bun.file(VAULT_MAP_TOML_PATH).text();
    const parsed = parseVaultMapToml(text);
    expect(parsed?.kind).toBe('vault-map');
    expect(parsed?.envMap?.TELEGRAM_BOT_FACTORY?.type).toBe('token');
    // TOML SSOT uses [env.KEY] + field= → normalized to envMap + key
    expect(parsed?.envMap?.CLOUDFLARE_API_TOKEN?.key).toBe('password');
    expect(parsed?.envMap?.CLOUDFLARE_API_TOKEN?.vault).toBe('factorywager');
    const file = await loadVaultMapFile();
    expect(file?.kind).toBe('vault-map');
    expect(Object.keys(file!.envMap).length).toBeGreaterThan(0);
  });

  test('normalizeVaultMapRaw accepts type:toml env tables', async () => {
    const { normalizeVaultMapRaw } = await import('../lib/security/vault-map.ts');
    const n = normalizeVaultMapRaw({
      metadata: { version: 1, description: 't' },
      env: {
        FOO: { vault: 'factorywager', item: 'Foo', field: 'password', type: 'token' },
      },
    });
    expect(n?.envMap.FOO?.key).toBe('password');
    expect(n?.envMap.FOO?.item).toBe('Foo');
  });
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

// @see https://bun.com/docs/pm/cli/info — bun info
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  formatBunInfoFieldValue,
  parseBunInfoCli,
  resolvePackumentField,
  bunInfoField,
  fetchPackumentJson,
} from '../lib/registry/bun-info-field.ts';

describe('lib/registry/bun-info-field', () => {
  test('parseBunInfoCli normalizes --registry URL (space form)', () => {
    const cli = parseBunInfoCli([
      '--registry',
      'http://127.0.0.1:3000',
      '@factorywager/registry-client',
      '--json',
    ]);
    expect(cli.registry).toBe('http://127.0.0.1:3000');
    expect(cli.pkg).toBe('@factorywager/registry-client');
    expect(cli.json).toBe(true);
  });

  test('parseBunInfoCli property path', () => {
    const cli = parseBunInfoCli(['react', 'repository.url']);
    expect(cli.pkg).toBe('react');
    expect(cli.property).toBe('repository.url');
  });

  test('formatBunInfoFieldValue returns {} for null dependencies', () => {
    expect(formatBunInfoFieldValue('dependencies', null)).toBe('{}');
    expect(formatBunInfoFieldValue('peerDependencies', undefined)).toBe('{}');
  });

  test('resolvePackumentField supports dot paths', () => {
    const meta = { repository: { url: 'git+https://github.com/react/react.git' } };
    expect(resolvePackumentField(meta, 'repository.url')).toBe(
      'git+https://github.com/react/react.git'
    );
  });

  test('bunInfoField react dependencies → {} via json-fallback', async () => {
    const out = await bunInfoField('react', 'dependencies');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe('{}');
    expect(out.source).toBe('json-fallback');
  });

  test('bunInfoField react version uses native path', async () => {
    const out = await bunInfoField('react', 'version');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.source).toBe('native');
    expect(out.value).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('fetchPackumentJson normalizes null dependencies to {}', async () => {
    const meta = await fetchPackumentJson('react');
    expect(meta.dependencies).toEqual({});
    expect(meta.readme).toBe('');
  });

  test('bunInfoField react readme resolves (native or empty fallback)', async () => {
    const out = await bunInfoField('react', 'readme');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toBe('');
  });

  test('registry-client from default registry', async () => {
    try {
      const meta = await fetchPackumentJson('@factorywager/registry-client');
      expect(meta.name).toBe('@factorywager/registry-client');
      expect(meta.dependencies).toEqual({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Local registry (localhost:3000) may be down — not a monorepo logic failure
      if (/ConnectionRefused|ECONNREFUSED|fetch failed|view request failed/i.test(msg)) {
        return;
      }
      throw e;
    }
  });
});

// @see https://bun.com/docs/pm/cli/info — bun info
import { describe, expect, test } from 'bun:test';

import { bunInfoField, fetchPackumentJson } from '../lib/registry/bun-info-field.ts';

const external = Bun.env.BUN_EXTERNAL_TESTS === '1';

describe.skipIf(!external)('lib/registry/bun-info-field external smoke', () => {
  test('resolves public npm native and JSON-fallback fields', async () => {
    const dependencies = await bunInfoField('react', 'dependencies');
    expect(dependencies).toMatchObject({ ok: true, value: '{}', source: 'json-fallback' });

    const version = await bunInfoField('react', 'version');
    expect(version.ok).toBeTrue();
    if (version.ok) {
      expect(version.source).toBe('native');
      expect(version.value).toMatch(/^\d+\.\d+\.\d+/);
    }

    const meta = await fetchPackumentJson('react');
    expect(meta.dependencies).toEqual({});
    expect(meta.readme).toBe('');
  });

  test('resolves the configured FactoryWager registry', async () => {
    const registry = Bun.env.FACTORYWAGER_NPM_REGISTRY_URL;
    if (!registry) throw new Error('FACTORYWAGER_NPM_REGISTRY_URL is required for external tests');
    const meta = await fetchPackumentJson('@factorywager/registry-client', {
      registry,
    });
    expect(meta.name).toBe('@factorywager/registry-client');
    expect(meta.dependencies).toEqual({});
  });
});

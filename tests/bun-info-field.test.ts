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

/** Public npm / registry reachable — skip live packument probes when offline. */
async function publicNpmReachable(): Promise<boolean> {
  try {
    const r = await fetch('https://registry.npmjs.org/react', {
      method: 'HEAD',
      signal: AbortSignal.timeout(1500),
    });
    return r.status > 0;
  } catch {
    return false;
  }
}

const npmOnline = await publicNpmReachable();

function isNetworkFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /ConnectionRefused|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|view request failed|Unable to connect|network/i.test(
    msg
  );
}

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

  test.skipIf(!npmOnline)('bunInfoField react dependencies → {} via json-fallback', async () => {
    try {
      const out = await bunInfoField('react', 'dependencies');
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.value).toBe('{}');
      expect(out.source).toBe('json-fallback');
    } catch (e) {
      if (isNetworkFailure(e)) return; // soft-fail when public npm flaky mid-run
      throw e;
    }
  });

  test.skipIf(!npmOnline)('bunInfoField react version uses native path', async () => {
    try {
      const out = await bunInfoField('react', 'version');
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.source).toBe('native');
      expect(out.value).toMatch(/^\d+\.\d+\.\d+/);
    } catch (e) {
      if (isNetworkFailure(e)) return;
      throw e;
    }
  });

  test.skipIf(!npmOnline)('fetchPackumentJson normalizes null dependencies to {}', async () => {
    try {
      const meta = await fetchPackumentJson('react');
      expect(meta.dependencies).toEqual({});
      expect(meta.readme).toBe('');
    } catch (e) {
      if (isNetworkFailure(e)) return;
      throw e;
    }
  });

  test.skipIf(!npmOnline)('bunInfoField react readme resolves (native or empty fallback)', async () => {
    try {
      const out = await bunInfoField('react', 'readme');
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.value).toBe('');
    } catch (e) {
      if (isNetworkFailure(e)) return;
      throw e;
    }
  });

  test('registry-client from default registry', async () => {
    try {
      const meta = await fetchPackumentJson('@factorywager/registry-client');
      expect(meta.name).toBe('@factorywager/registry-client');
      expect(meta.dependencies).toEqual({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Local registry (localhost:3000) may be down — not a monorepo logic failure
      if (/ConnectionRefused|ECONNREFUSED|fetch failed|view request failed|ENOTFOUND|ETIMEDOUT|Unable to connect/i.test(msg)) {
        return;
      }
      throw e;
    }
  });
});

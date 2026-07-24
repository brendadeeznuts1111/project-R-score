// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/bundler/loaders#css
import { describe, expect, test } from 'bun:test';
import { runBundlerLoaderVerification } from '../lib/verification/bundler-loader-probes.ts';

describe('lib/verification/bundler-loader-probes', () => {
  test('css/jsonc/text/ts/file loader probes pass on current runtime', async () => {
    const { ok, results } = await runBundlerLoaderVerification();
    expect(results.length).toBe(6);
    expect(results.every(r => r.subsystem === 'bundler')).toBe(true);
    expect(results.every(r => r.name.startsWith('bundler:'))).toBe(true);
    const loaders = new Set(results.map(r => r.loader));
    expect(loaders.has('css')).toBe(true);
    expect(loaders.has('jsonc')).toBe(true);
    expect(loaders.has('text')).toBe(true);
    expect(loaders.has('ts')).toBe(true);
    expect(loaders.has('file')).toBe(true);
    for (const r of results) {
      expect(r.canonical).toContain('bun.com/docs/bundler');
      expect(r.introducedIn === 'all' || r.introducedIn === undefined || typeof r.introducedIn === 'string').toBe(
        true
      );
    }
    expect(ok).toBe(true);
    expect(results.every(r => r.passed)).toBe(true);
  });
});

// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUNDLER_CANONICAL_KEYS,
  getAllCanonicalUrls,
  getCanonicalEntry,
  getCanonicalUrl,
  REGISTRY_CLIENT_CANONICAL_KEYS,
  resolveCanonicalForProbe,
  RUNTIME_NITS_CANONICAL_KEYS,
  validateCanonicalKeys,
} from '../tools/canonical-helpers.ts';

describe('canonical-helpers', () => {
  test('getCanonicalEntry returns full metadata for registry client tokens', () => {
    const entry = getCanonicalEntry('registry-client resolve');
    expect(entry).not.toBeNull();
    expect(entry!.url).toContain('registry-client.md#resolve');
    expect(entry!.kind).toBe('SDK');
    expect(entry!.stability).toBe('stable');
    expect(entry!.description).toContain('resolve()');
  });

  test('getCanonicalEntry returns metadata for runtime nits tokens', () => {
    const entry = getCanonicalEntry('Bun.inspect.sorted');
    expect(entry?.kind).toBe('API');
    expect(entry?.url).toContain('bun-inspect');
  });

  test('getCanonicalEntry returns package-manager subsystem for install tokens', () => {
    const entry = getCanonicalEntry('bun install --cpu');
    expect(entry?.subsystem).toBe('package-manager');
    expect(entry?.introducedIn).toBe('all');
  });

  test('getCanonicalEntry returns runtime subsystem for Bun.stringWidth', () => {
    const entry = getCanonicalEntry('Bun.stringWidth');
    expect(entry?.subsystem).toBe('runtime');
  });

  test('getCanonicalEntry returns bundler subsystem for loader tokens', () => {
    const ts = getCanonicalEntry('loader:ts');
    expect(ts?.subsystem).toBe('bundler');
    expect(ts?.introducedIn).toBe('all');
    expect(ts?.url).toContain('loaders#ts');
    const alias = getCanonicalEntry('bundler.loader.ts');
    expect(alias?.url).toBe(ts?.url);
  });

  test('getCanonicalEntry returns bundler subsystem for loader tokens', () => {
    const css = getCanonicalEntry('loader:css');
    expect(css?.subsystem).toBe('bundler');
    expect(css?.url).toContain('loaders#css');
    expect(getCanonicalEntry('Asset Processing')?.subsystem).toBe('bundler');
  });

  test('getCanonicalEntry returns runtime subsystem for nits tokens', () => {
    expect(getCanonicalEntry('Bun.inspect.sorted')?.subsystem).toBe('runtime');
  });

  test('getCanonicalEntry returns Documentation kind for Bun Guides token map', () => {
    const entry = getCanonicalEntry('Bun Guides');
    expect(entry?.kind).toBe('Documentation');
    expect(entry?.description).toContain('official guides');
  });

  test('resolveCanonicalForProbe attaches subsystem and introducedIn', () => {
    const resolved = resolveCanonicalForProbe('bun-image', {
      reportPath: '/registry/release-features.json',
      sourcePath: 'tools/verify-bun-release.ts',
    });
    expect(resolved.subsystem).toBe('runtime');
    expect(resolved.introducedIn).toBe('1.3.14');
  });

  test('getCanonicalEntry resolves plain CANONICAL_REFS keys', () => {
    const entry = getCanonicalEntry('BunInspectOptions');
    expect(entry?.url).toContain('BunInspectOptions');
    expect(entry?.kind).toBe('Global');
  });

  test('getCanonicalUrl falls back when key is missing', () => {
    expect(getCanonicalUrl('__missing__', 'https://example.test/fallback')).toBe(
      'https://example.test/fallback'
    );
  });

  test('validateCanonicalKeys passes for registry, nits, and bundler key lists', () => {
    expect(() => validateCanonicalKeys(REGISTRY_CLIENT_CANONICAL_KEYS)).not.toThrow();
    expect(() => validateCanonicalKeys(RUNTIME_NITS_CANONICAL_KEYS)).not.toThrow();
    expect(() => validateCanonicalKeys(BUNDLER_CANONICAL_KEYS)).not.toThrow();
  });

  test('validateCanonicalKeys throws for unknown keys', () => {
    expect(() => validateCanonicalKeys(['not-a-real-canonical-key'])).toThrow(
      /Missing canonical entries/
    );
  });

  test('resolveCanonicalForProbe attaches kind, stability, and _links', () => {
    const resolved = resolveCanonicalForProbe('registry-client download', {
      reportPath: '/registry/registry-client-proof.json',
      sourcePath: 'tools/verify-registry-client.ts',
    });
    expect(resolved.canonical).toContain('#download');
    expect(resolved.canonicalKind).toBe('SDK');
    expect(resolved.canonicalStability).toBe('stable');
    expect(resolved.canonicalDescription).toContain('download()');
    expect(resolved._links.docs).toBe(resolved.canonical);
    expect(resolved._links.report).toBe('/registry/registry-client-proof.json');
  });

  test('getAllCanonicalUrls includes token map URLs', () => {
    const urls = getAllCanonicalUrls();
    expect(urls.has(getCanonicalUrl('registry-client publish'))).toBe(true);
    expect(urls.has(getCanonicalUrl('CompressionStream'))).toBe(true);
  });
});

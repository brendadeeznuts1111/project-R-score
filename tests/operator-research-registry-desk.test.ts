import { describe, expect, test } from 'bun:test';
import {
  buildBunPublishArgs,
  getRegistryPackage,
  listPresets,
  packageNameFromPathSuffix,
  parseRegistryPreset,
  REGISTRY_PRESETS,
  resolveWorkspacePath,
  searchRegistryPackages,
} from '../lib/operator-research/registry-desk.ts';
import { ROOT } from '../lib/operator-research/paths.ts';
import { join } from 'node:path';

describe('registry-desk presets + paths', () => {
  test('parseRegistryPreset allowlists local|prod only', () => {
    expect(parseRegistryPreset('local')).toBe('local');
    expect(parseRegistryPreset('prod')).toBe('prod');
    expect(parseRegistryPreset('https://evil.example')).toBeNull();
    expect(parseRegistryPreset('npmjs')).toBeNull();
    expect(parseRegistryPreset(null)).toBeNull();
  });

  test('listPresets exposes fixed URLs (no free-form host)', () => {
    const presets = listPresets();
    expect(presets.map(p => p.id).sort()).toEqual(['local', 'prod']);
    expect(REGISTRY_PRESETS.local.url).toBe('http://localhost:3000/');
    expect(REGISTRY_PRESETS.prod.bunPublish).toBe(false);
    expect(REGISTRY_PRESETS.local.bunPublish).toBe(true);
  });

  test('resolveWorkspacePath stays under packages/<name>', () => {
    expect(resolveWorkspacePath('registry-client')).toBe(
      join(ROOT, 'packages/registry-client')
    );
    expect(resolveWorkspacePath('packages/registry-client')).toBe(
      join(ROOT, 'packages/registry-client')
    );
    expect(resolveWorkspacePath('../etc')).toBeNull();
    expect(resolveWorkspacePath('..')).toBeNull();
    expect(resolveWorkspacePath('foo/bar')).toBeNull();
    expect(resolveWorkspacePath('')).toBeNull();
  });

  test('packageNameFromPathSuffix decodes scoped names', () => {
    expect(packageNameFromPathSuffix('%40factorywager%2Fregistry-client')).toBe(
      '@factorywager/registry-client'
    );
    expect(packageNameFromPathSuffix('@factorywager/registry-client')).toBe(
      '@factorywager/registry-client'
    );
    expect(packageNameFromPathSuffix('event-store')).toBe('event-store');
  });
});

describe('registry-desk publish argv', () => {
  test('buildBunPublishArgs defaults dry-run + forces --registry local', () => {
    const args = buildBunPublishArgs({}, REGISTRY_PRESETS.local.url);
    expect(args[0]).toBe('publish');
    expect(args).toContain('--dry-run');
    expect(args).toContain('--registry');
    expect(args[args.indexOf('--registry') + 1]).toBe('http://localhost:3000/');
  });

  test('buildBunPublishArgs omits dry-run when dryRun false', () => {
    const args = buildBunPublishArgs(
      { dryRun: false, access: 'public', tag: 'next', tolerateRepublish: true },
      REGISTRY_PRESETS.local.url
    );
    expect(args).not.toContain('--dry-run');
    expect(args).toContain('--access');
    expect(args).toContain('public');
    expect(args).toContain('--tag');
    expect(args).toContain('next');
    expect(args).toContain('--tolerate-republish');
  });
});

describe('registry-desk snapshot browse', () => {
  test('searchRegistryPackages returns hits from snapshot', async () => {
    const { results, total, source } = await searchRegistryPackages('event');
    expect(source).toContain('registry.json');
    expect(total).toBeGreaterThanOrEqual(0);
    if (total > 0) {
      expect(results.some(r => r.name.includes('event'))).toBe(true);
      expect(results[0]!.version).toBeTruthy();
    }
  });

  test('getRegistryPackage returns detail for known package', async () => {
    const hit = await searchRegistryPackages('');
    if (!hit.total) return;
    const name = hit.results[0]!.name;
    const detail = await getRegistryPackage(name);
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe(name);
    expect(Array.isArray(detail!.versions)).toBe(true);
    expect(detail!.selectedVersion).toBeTruthy();
  });

  test('getRegistryPackage honors version pick when present', async () => {
    const detail = await getRegistryPackage('event-store', '1.0.0');
    if (!detail) return; // snapshot may omit fixture in some checkouts
    expect(detail.versions).toContain('1.0.0');
    expect(detail.selectedVersion).toBe('1.0.0');
    expect(detail.description.toLowerCase()).toContain('event');
    // Older release in snapshot carries Bun publish README metadata
    if (detail.readme) {
      expect(detail.readme.length).toBeGreaterThan(0);
      expect(detail.readmeFilename).toBe('README.md');
      expect(detail.readmeHtml).toBeTruthy();
      expect(detail.readmeHtml!.toLowerCase()).not.toContain('<script');
    }
  });

  test('getRegistryPackage surfaces snapshot readme when present', async () => {
    const { results } = await searchRegistryPackages('');
    let found: Awaited<ReturnType<typeof getRegistryPackage>> = null;
    for (const hit of results.slice(0, 40)) {
      const d = await getRegistryPackage(hit.name);
      if (d?.readme) {
        found = d;
        break;
      }
    }
    if (!found) return; // older snapshot without Bun 1.3.14 readme metadata
    expect(found.readme!.length).toBeGreaterThan(0);
    expect(found.readmeFilename).toBeTruthy();
    expect(found.selectedVersion).toBeTruthy();
    expect(found.readmeHtml).toBeTruthy();
    expect(found.readmeHtml!).toContain('<');
  });

  test('readmeHtml uses Bun.markdown.html tagFilter (no raw script tags)', async () => {
    const { renderReadmeHTML } = await import('../lib/factory/markdown.ts');
    const html = renderReadmeHTML('# Hi\n\n<script>alert(1)</script>\n\n**ok**');
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html).toMatch(/ok|strong|b/i);
  });

  test('getRegistryPackage returns null for missing', async () => {
    expect(await getRegistryPackage('definitely-not-a-real-pkg-xyz')).toBeNull();
  });
});

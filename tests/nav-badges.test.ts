// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  pickFailuresBadge,
  pickHealthBadge,
  pickPackagesBadge,
  pickVaultBadge,
  toneFailuresBadge,
  toneHealthBadge,
  tonePackagesBadge,
  toneVaultBadge,
} from '../public/portal/nav-badges.js';
import { normalizeCapabilityRows } from '../public/portal/tools/tools-hub.js';

const ROOT = resolvePath(import.meta.dir, '..');

describe('nav-badges pure pickers', () => {
  test('failures pick + tone', () => {
    expect(pickFailuresBadge({ totals: { failures: 0 } })).toBe(0);
    expect(toneFailuresBadge(0)).toBe('ok');
    expect(pickFailuresBadge({ totals: { failures: 3 } })).toBe(3);
    expect(toneFailuresBadge(3)).toBe('bad');
    expect(pickFailuresBadge({ failures: [{}, {}] })).toBe(2);
  });

  test('vault pick + tone from summary.activeItems', () => {
    expect(pickVaultBadge({ summary: { activeItems: 28 } })).toBe(28);
    expect(toneVaultBadge(28)).toBe('ok');
    expect(toneVaultBadge(0)).toBe('warn');
    expect(pickVaultBadge({ vaults: [{ active: 10 }, { active: 5 }] })).toBe(15);
  });

  test('packages pick + neutral tone', () => {
    expect(pickPackagesBadge({ packages: [1, 2, 3, 4, 5, 6] })).toBe(6);
    expect(pickPackagesBadge({ map: { packages: ['a', 'b'] } })).toBe(2);
    expect(tonePackagesBadge(6)).toBe('neutral');
  });

  test('health score pick + bands', () => {
    expect(pickHealthBadge({ score: 100 })).toBe(100);
    expect(toneHealthBadge(100)).toBe('ok');
    expect(toneHealthBadge(70)).toBe('warn');
    expect(toneHealthBadge(40)).toBe('bad');
  });
});

describe('capability-map-subset normalize', () => {
  test('loads registry bake shape', async () => {
    const data = await Bun.file(
      resolvePath(ROOT, 'public/registry/capability-map-subset.json')
    ).json();
    const rows = normalizeCapabilityRows(data);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.some(r => r[0].includes('Secret view') || r[0].includes('Secret'))).toBe(true);
    // [capability, type, protocol, version, api, status, usedIn, sourceUrl]
    expect(rows.every(r => r.length === 8)).toBe(true);
    expect(rows.some(r => r[1] === 'secrets' || r[1] === 'pkg' || r[1] === 'runtime')).toBe(true);
    expect(rows.some(r => r[2] === 'Bun' || r[2] === 'pass-cli')).toBe(true);
    expect(rows.every(r => String(r[4]).length > 0)).toBe(true); // api
    // schema v3: optional source URLs on many Bun rows
    expect(rows.some(r => String(r[7]).startsWith('https://'))).toBe(true);
    expect(data.schemaVersion).toBe(3);
    expect(data.summary?.protocolCounts).toBeDefined();
  });

  test('fallback when empty', () => {
    const rows = normalizeCapabilityRows(null);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every(r => r.length === 8)).toBe(true);
  });
});

describe('nav-badges + tools-hub static modules', () => {
  test('nav-badges.js maps failures vault packages health to registry paths', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/nav-badges.js')).text();
    expect(src).toContain('/registry/failures.json');
    expect(src).toContain('/registry/vault-health.json');
    expect(src).toContain('/registry/packages-graph-map.json');
    expect(src).toContain('/registry/monorepo-health.json');
    expect(src).toContain('applyNavBadges');
    expect(src).not.toContain('password');
    expect(src).toContain('activeItems');
  });

  test('tools-hub.js uses copy-cli not browser spawn', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/tools/tools-hub.js')).text();
    const copyCli = await Bun.file(resolvePath(ROOT, 'public/portal/copy-cli.js')).text();
    expect(src).toContain('copy-cli');
    expect(src).toContain("from '../copy-cli.js'");
    expect(copyCli).toContain('navigator.clipboard');
    expect(src).not.toMatch(/Bun\.spawn\s*\(/);
    expect(src).toContain('capability-map-subset.json');
  });

  test('topbar imports nav-badges', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/topbar.js')).text();
    expect(src).toContain("from './nav-badges.js'");
    expect(src).toContain('bootstrapNavBadges');
  });
});

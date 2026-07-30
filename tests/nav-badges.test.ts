// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  pickBrandsBadge,
  pickDoctorBadge,
  pickFailuresBadge,
  pickHealthBadge,
  pickInstallHygieneBadge,
  pickPackagesBadge,
  pickVaultBadge,
  toneBrandsBadge,
  toneDoctorBadge,
  toneFailuresBadge,
  toneHealthBadge,
  toneInstallHygieneBadge,
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

  test('brands pick + attention tone', () => {
    expect(pickBrandsBadge({ kind: 'bun-brand-map', summary: { attention: 0 } })).toBe(0);
    expect(pickBrandsBadge({ kind: 'bun-brand-map', summary: { attention: 4 } })).toBe(4);
    expect(pickBrandsBadge({ kind: 'brand-keymap', summary: { attention: 4 } })).toBeNull();
    expect(toneBrandsBadge(0)).toBe('ok');
    expect(toneBrandsBadge(4)).toBe('warn');
  });

  test('health score pick + bands', () => {
    expect(pickHealthBadge({ score: 100 })).toBe(100);
    expect(toneHealthBadge(100)).toBe('ok');
    expect(toneHealthBadge(70)).toBe('warn');
    expect(toneHealthBadge(40)).toBe('bad');
  });

  test('doctor tone pick + badge tones', () => {
    expect(pickDoctorBadge({ kind: 'portal-doctor-state', tone: 'green', ok: true })).toBe('green');
    expect(pickDoctorBadge({ kind: 'portal-doctor-state', tone: 'yellow' })).toBe('yellow');
    expect(pickDoctorBadge({ kind: 'portal-doctor-state', tone: 'red' })).toBe('red');
    expect(pickDoctorBadge({ kind: 'other' })).toBeNull();
    expect(toneDoctorBadge('green')).toBe('ok');
    expect(toneDoctorBadge('yellow')).toBe('warn');
    expect(toneDoctorBadge('red')).toBe('bad');
  });

  test('install-hygiene pick + badge tones', () => {
    expect(
      pickInstallHygieneBadge({
        kind: 'install-hygiene',
        ok: true,
        installCache: { wouldPrune: false },
        npmInstall: { ok: true },
        installVerify: { ok: true },
      })
    ).toBe('passed');
    expect(
      pickInstallHygieneBadge({
        kind: 'install-hygiene',
        ok: false,
        installCache: { wouldPrune: true },
        npmInstall: { ok: true },
        installVerify: { ok: true },
      })
    ).toBe('cleanup');
    expect(
      pickInstallHygieneBadge({
        kind: 'install-hygiene',
        ok: false,
        installCache: { wouldPrune: true },
        npmInstall: { ok: false },
        installVerify: { ok: true },
      })
    ).toBe('blocked');
    expect(pickInstallHygieneBadge({ kind: 'other' })).toBeNull();
    expect(toneInstallHygieneBadge('passed')).toBe('ok');
    expect(toneInstallHygieneBadge('cleanup')).toBe('warn');
    expect(toneInstallHygieneBadge('blocked')).toBe('bad');
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
    // [capability, type, protocol, version, api, status, usedIn, sourceUrl, minBun, minPassCli]
    expect(rows.every(r => r.length === 10)).toBe(true);
    expect(rows.some(r => r[1] === 'secrets' || r[1] === 'pkg' || r[1] === 'runtime')).toBe(true);
    expect(rows.some(r => r[2] === 'Bun' || r[2] === 'pass-cli')).toBe(true);
    expect(rows.every(r => String(r[4]).length > 0)).toBe(true); // api
    // schema v3: optional source URLs on many Bun rows
    expect(rows.some(r => String(r[7]).startsWith('https://'))).toBe(true);
    // No wire-field change has shipped since v3; keep the assertion aligned
    // with CAPABILITY_MAP_SUBSET_SCHEMA instead of versioning test-only drift.
    expect(data.schemaVersion).toBe(3);
    expect(data.summary?.protocolCounts).toBeDefined();
  });

  test('fallback when empty', () => {
    const rows = normalizeCapabilityRows(null);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every(r => r.length === 10)).toBe(true);
  });
});

describe('nav-badges + tools-hub static modules', () => {
  test('nav-badges.js maps failures vault packages brands health doctor to registry paths', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/nav-badges.js')).text();
    expect(src).toContain('/registry/failures.json');
    expect(src).toContain('/registry/vault-health.json');
    expect(src).toContain('/registry/packages-graph-map.json');
    expect(src).toContain('/registry/bun-brand-map.json');
    expect(src).toContain('/portal/brands/');
    expect(src).toContain('/registry/monorepo-health.json');
    expect(src).toContain('/registry/doctor-state.json');
    expect(src).toContain('/portal/doctor/');
    expect(src).toContain('/registry/install-hygiene-report.json');
    expect(src).toContain('/portal/install-hygiene/');
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

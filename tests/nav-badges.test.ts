// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('nav-badges + tools-hub static modules', () => {
  test('nav-badges.js maps failures vault packages health to registry paths', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/nav-badges.js')).text();
    expect(src).toContain('/registry/failures.json');
    expect(src).toContain('/registry/vault-health.json');
    expect(src).toContain('/registry/packages-graph-map.json');
    expect(src).toContain('/registry/monorepo-health.json');
    expect(src).toContain('applyNavBadges');
    // Baked JSON only — no secret field extraction
    expect(src).not.toContain('password');
    expect(src).toContain('activeItems');
  });

  test('tools-hub.js uses copy-cli not browser spawn', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/tools/tools-hub.js')).text();
    expect(src).toContain('copy-cli');
    expect(src).toContain('navigator.clipboard');
    // Documented as capability row / comment only — no live spawn API
    expect(src).not.toMatch(/Bun\.spawn\s*\(/);
    expect(src).toContain('CAPABILITY_ROWS');
  });

  test('topbar imports nav-badges', async () => {
    const src = await Bun.file(resolvePath(ROOT, 'public/portal/topbar.js')).text();
    expect(src).toContain("from './nav-badges.js'");
    expect(src).toContain('bootstrapNavBadges');
  });
});

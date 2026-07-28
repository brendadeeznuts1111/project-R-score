// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import { buildEnvInventoryCompact } from '../scripts/lib/env-inventory-compact.ts';

describe('env-inventory-compact', () => {
  test('includes packages root, owners, and root/product runtime', async () => {
    const inv = await buildEnvInventoryCompact(process.cwd());
    expect(inv.kind).toBe('env-inventory');
    expect(inv.schemaVersion).toBe(4);
    expect(inv.scannedRoots).toContain('packages');
    expect(inv.uniqueVars).toBeGreaterThan(0);
    expect(inv.packagesPlane.summary.envKeyCount).toBeGreaterThan(0);
    expect(inv.topConfig.some(c => c.var === 'REDIS_URL')).toBe(true);
    expect(inv.owners.length).toBeGreaterThan(0);
    expect(inv.owners.some(o => o.envKey === 'REDIS_URL' && o.packages.length > 0)).toBe(true);
    expect(inv.runtime.root).toBeDefined();
    expect(inv.runtime.products).toBeDefined();
    expect(typeof inv.runtime.templateKeysPresent).toBe('number');
    expect(inv.defaultsIssues.total).toBeGreaterThanOrEqual(0);
    expect(inv.summary.ownerCount).toBe(inv.owners.length);
    // REDIS_URL ships a localhost default — unset Bun.env is covered, not needsInject
    if (!Bun.env.REDIS_URL?.trim()) {
      expect(inv.runtime.root.coveredByTemplateDefault).toContain('REDIS_URL');
      expect(inv.runtime.root.missingNeedsInject).not.toContain('REDIS_URL');
    }
    expect(inv.summary.rootRuntimeNeedsInject).toBe(inv.runtime.root.missingNeedsInject.length);
    // TOML constants plane (schema v4) — config TOML files, leaf keys, TS importers
    expect(inv.toml.totalFiles).toBeGreaterThan(0);
    expect(inv.toml.totalKeys).toBeGreaterThan(0);
    expect(inv.toml.files.some(f => f.path === 'config/vault-map.toml')).toBe(true);
    const vaultMap = inv.toml.files.find(f => f.path === 'config/vault-map.toml');
    expect(vaultMap!.keyCount).toBeGreaterThan(0);
    expect(vaultMap!.importers.length).toBeGreaterThan(0);
    expect(inv.toml.files.some(f => f.path === 'config/surfaces.toml')).toBe(true);
    expect(inv.toml.parseErrors).toEqual([]);
    // bunfig.toml is consumed by Bun itself — never an orphan
    expect(inv.toml.orphanFiles.some(p => p.endsWith('bunfig.toml'))).toBe(false);
    // boolean presence only — no secret payloads
    expect(JSON.stringify(inv)).not.toMatch(/cfat_[A-Za-z0-9]+/);
  });
});

// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import { buildEnvInventoryCompact } from '../scripts/lib/env-inventory-compact.ts';

describe('env-inventory-compact', () => {
  test('includes packages root and packages plane', async () => {
    const inv = await buildEnvInventoryCompact(process.cwd());
    expect(inv.kind).toBe('env-inventory');
    expect(inv.scannedRoots).toContain('packages');
    expect(inv.uniqueVars).toBeGreaterThan(0);
    expect(inv.packagesPlane.summary.envKeyCount).toBeGreaterThan(0);
    expect(inv.topConfig.some(c => c.var === 'REDIS_URL')).toBe(true);
    // boolean presence only — no secret payloads
    expect(typeof inv.runtime.templateKeysPresent).toBe('number');
    expect(JSON.stringify(inv)).not.toMatch(/cfat_[A-Za-z0-9]+/);
  });
});

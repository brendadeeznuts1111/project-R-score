// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import { buildPackageVaultMap } from '../lib/harness/packages-vault-map.ts';

describe('packages-vault-map', () => {
  test('maps package Bun.env to env.template without printing secrets', async () => {
    const map = await buildPackageVaultMap(process.cwd(), [
      'p2p',
      'business',
      'docs-tools',
      'rip',
    ]);
    expect(map.summary.packagesWithEnv).toBeGreaterThan(0);
    expect(map.envHits.some(h => h.envKey === 'REDIS_URL')).toBe(true);
    // REDIS_URL is now in env.template (non-pass local default)
    const redis = map.byPackage.find(p => p.envKeys.includes('REDIS_URL'));
    expect(redis).toBeDefined();
    expect(redis!.missingTemplateKeys.includes('REDIS_URL')).toBe(false);
    const redisHit = map.envHits.find(h => h.envKey === 'REDIS_URL');
    expect(redisHit?.inTemplate).toBe(true);
    // Never embed secret-looking values
    const blob = JSON.stringify(map);
    expect(blob.includes('pass://')).toBe(true); // refs OK
    expect(blob).not.toMatch(/cfat_[A-Za-z0-9]+/);

    // Display chrome from config/vault-map.json (additive)
    expect(map.displayMap?.length).toBeGreaterThan(0);
    expect(map.summary.displayMapped).toBeGreaterThan(0);
    const cf = map.vaultRefs.find(r => r.key === 'CLOUDFLARE_API_TOKEN');
    expect(cf?.label).toBeDefined();
    expect(cf?.color).toMatch(/^#/);
  });
});

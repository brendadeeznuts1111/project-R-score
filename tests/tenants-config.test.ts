/**
 * Tenant SSOT tests.
 */

import { describe, expect, test } from 'bun:test';
import { TENANTS, getTenant, isTenantSlug, tenantManifestForBrowser } from '../config/tenants.ts';

describe('config/tenants', () => {
  test('lists three tenants', () => {
    expect(TENANTS.length).toBe(3);
  });

  test('getTenant and slug guard', () => {
    expect(getTenant('factory')?.name).toBe('Factory Registry');
    expect(isTenantSlug('tennis')).toBe(true);
    expect(isTenantSlug('unknown')).toBe(false);
  });

  test('browser manifest shape', () => {
    const manifest = tenantManifestForBrowser();
    expect(manifest[0]?.staticRegistryPath).toContain('/registry/');
  });
});

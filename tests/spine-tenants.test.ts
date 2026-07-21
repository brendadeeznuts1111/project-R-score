/**
 * Spine multi-tenant registry ratchet.
 * @see docs/harness/cron.md
 * @see spine/tenants.ts
 */
import { describe, expect, test } from 'bun:test';
import { SPINE_TENANTS, tenantById } from '../spine/tenants';

describe('spine multi-tenant', () => {
  test('registry has ≥2 tenants including docs-integrity and install-verify', () => {
    expect(SPINE_TENANTS.length).toBeGreaterThanOrEqual(2);
    expect(tenantById('docs-integrity')).toBeDefined();
    expect(tenantById('install-verify')).toBeDefined();
  });

  test('each tenant has a UTC schedule and a run handler', () => {
    for (const t of SPINE_TENANTS) {
      expect(t.schedule.trim().length).toBeGreaterThan(0);
      expect(typeof t.run).toBe('function');
    }
  });
});

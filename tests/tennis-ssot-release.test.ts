// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import type { RegistryIndex } from '../lib/factory/artifact.ts';
import {
  loadTennisSsotReleaseParity,
  verifyTennisSsotReleaseParity,
} from '../lib/verification/tennis-ssot-release.ts';

describe('Tennis SSOT release parity', () => {
  test('committed root, tenant, proof, and runbook describe one release', async () => {
    const parity = await loadTennisSsotReleaseParity(`${import.meta.dir}/..`);
    expect(parity.ok).toBeTrue();
    expect(parity.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(parity.size).toBeGreaterThan(0);
    expect(parity.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test('tenant checksum drift fails without a producer checkout', async () => {
    const root = (await Bun.file('public/registry/registry.json').json()) as RegistryIndex;
    const tenant = await Bun.file('public/registry/tennis/registry.json').json();
    const proof = await Bun.file('public/registry/ssot-flow-soft.json').json();
    const runbook = await Bun.file('docs/harness/tenants/tennis-hq-registry.md').text();
    const latest = String(root.packages['@tennis-hq/ssot']?.['dist-tags']?.latest ?? '');
    const driftedTenant = structuredClone(tenant);
    driftedTenant.packages['@tennis-hq/ssot'].releases[latest].storage.checksum = '0'.repeat(64);

    const parity = verifyTennisSsotReleaseParity({
      root,
      tenant: driftedTenant,
      proof,
      runbook,
    });
    expect(parity.ok).toBeFalse();
    expect(parity.checks.find(row => row.name === 'tenant-release')?.ok).toBeFalse();
  });
});

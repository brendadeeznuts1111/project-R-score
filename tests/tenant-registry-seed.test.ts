// @see https://bun.com/docs/test/index#run-tests
import { afterEach, describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import { seedTenantRegistries } from '../lib/operations/tenant-registry-seed.ts';

const SCRATCH = joinPath(import.meta.dir, '../.tmp/tenant-registry-seed-test');
const ROOT = joinPath(import.meta.dir, '..');

afterEach(async () => {
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

describe('tenant registry seed', () => {
  test('writes thickened tenant slices from root index', async () => {
    await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}/public/registry/factory ${SCRATCH}/public/registry/science ${SCRATCH}/public/registry/tennis`.quiet();
    await Bun.$`cp ${ROOT}/public/registry/registry.json ${SCRATCH}/public/registry/registry.json`.quiet();
    // Thin existing tenant
    await Bun.write(
      `${SCRATCH}/public/registry/factory/registry.json`,
      JSON.stringify({ schemaVersion: 1, packages: { 'event-store': {} } })
    );

    const result = await seedTenantRegistries({ rootDir: SCRATCH, force: true });
    expect(result.seeded).toBe(true);
    expect(result.tenants?.factory).toBeGreaterThanOrEqual(4);
    expect(result.tenants?.science).toBeGreaterThanOrEqual(4);
    expect(result.tenants?.tennis).toBeGreaterThanOrEqual(4);

    const factory = await Bun.file(`${SCRATCH}/public/registry/factory/registry.json`).json();
    expect(factory.tenantId).toBe('factory');
    expect(factory.packages['@factorywager/registry-client'] || factory.packages['event-store']).toBeTruthy();

    const skip = await seedTenantRegistries({ rootDir: SCRATCH, force: false, minPackages: 4 });
    expect(skip.seeded).toBe(false);
  });
});

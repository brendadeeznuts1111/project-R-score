// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/shell#getting-started
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7
// @see https://bun.com/docs/test/index#run-tests
import { afterEach, describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import { seedTenantRegistries } from '../lib/operations/tenant-registry-seed.ts';

const ROOT = joinPath(import.meta.dir, '..');

describe('tenant registry seed', () => {
  test('writes thickened tenant slices from root index', async () => {
    const SCRATCH = joinPath(import.meta.dir, `../.tmp/tenant-registry-seed-test-${Bun.randomUUIDv7()}`);
    await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}/public/registry/factory ${SCRATCH}/public/registry/science ${SCRATCH}/public/registry/tennis`.quiet();
    try {
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
      expect(
        factory.packages['@factorywager/registry-client'] || factory.packages['event-store']
      ).toBeTruthy();

      const tennis = await Bun.file(`${SCRATCH}/public/registry/tennis/registry.json`).json();
      expect(tennis.meta.agentAuth).toMatchObject({
        status: 'configured',
        artifact: '/registry/tennis/agent-auth.json',
        envKey: 'FACTORY_WAGER_TOKEN',
      });
      expect(tennis.packages['@tennis-hq/ssot']).toBeTruthy();

      const skip = await seedTenantRegistries({ rootDir: SCRATCH, force: false, minPackages: 4 });
      expect(skip.seeded).toBe(false);

      const rootPath = `${SCRATCH}/public/registry/registry.json`;
      const root = await Bun.file(rootPath).json();
      root.lastUpdated = '2026-07-28T18:30:00.000Z';
      await Bun.write(rootPath, `${JSON.stringify(root, null, 2)}\n`);

      const refreshed = await seedTenantRegistries({
        rootDir: SCRATCH,
        force: false,
        minPackages: 4,
      });
      expect(refreshed.seeded).toBe(true);
      const refreshedFactory = await Bun.file(
        `${SCRATCH}/public/registry/factory/registry.json`
      ).json();
      expect(refreshedFactory.meta.rootLastUpdated).toBe(root.lastUpdated);
    } finally {
      await Bun.$`rm -rf ${SCRATCH}`.quiet();
    }
  });
});

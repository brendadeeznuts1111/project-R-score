// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Journey: sandboxed tenant heal loop.
 *
 * break → signal (check ≠ 0) → intervention (fix) → proof (check = 0)
 *
 *   bun run test:tenant-heal
 *
 * @see lib/harness/heal-fixture.ts
 * @see docs/harness/spine-tenants.md
 */
import { describe, expect, test } from 'bun:test';
import { HEAL_FIXTURE_TENANT, runHealLoop } from '../../lib/harness/heal-fixture';
import { joinPath } from '../../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '../..');
const FIXTURE = joinPath(ROOT, 'tests/fixtures/tenant-heal');
const WORKSPACE = joinPath(ROOT, '.cache/journey-tenant-heal');

async function materializeWorkspace(): Promise<void> {
  expect(Bun.spawnSync(['mkdir', '-p', WORKSPACE]).exitCode).toBe(0);
  const src = joinPath(FIXTURE, 'health.json');
  const dest = joinPath(WORKSPACE, 'health.json');
  await Bun.write(dest, await Bun.file(src).arrayBuffer());
}

describe('tenant heal journey', () => {
  test(
    `${HEAL_FIXTURE_TENANT}: break → signal → intervene → recover`,
    async () => {
      await materializeWorkspace();
      const { ok, steps } = await runHealLoop(ROOT, WORKSPACE);
      expect(ok, steps.join(' · ')).toBe(true);
      expect(steps.some(s => s.startsWith('signal-detected exit') && s !== 'signal-detected exit 0')).toBe(
        true
      );
      expect(steps.at(-1)).toBe('recovery check exit 0');
    },
    { timeout: 15_000 }
  );
});

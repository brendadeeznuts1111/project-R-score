// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-level (primary)
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Journey: portal-snapshot OS-persistent Bun.cron path.
 *
 * Uses dry-run capture (no network) + marker file — same pattern as
 * tests/journey/cron-os-persistent.test.ts but exercises the real worker.
 *
 *   bun run test:portal-snapshot:cron-os
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { registerOsCron, removeOsCron } from '../../lib/harness/cron.ts';
import { joinPath } from '../../lib/path-bun.ts';
import { PORTAL_SNAPSHOT_CRON_WORKER } from '../../tools/portal-snapshot-cron-constants.ts';
import { assertOsCronRegistration } from './assert-os-cron-registration.ts';

const ROOT = joinPath(import.meta.dir, '../..');
const OUT = joinPath(ROOT, '.cache/journey-portal-snapshot-cron');
const TITLE = `fw_portal_snap_${process.pid}_${Date.now()}`;
const MARKER = joinPath(OUT, `${TITLE}.json`);
const SCHEDULE = '@hourly';

let registered = false;

async function fireWorker(): Promise<void> {
  const proc = Bun.spawn(
    ['bun', 'run', `--cron-title=${TITLE}`, `--cron-period=${SCHEDULE}`, PORTAL_SNAPSHOT_CRON_WORKER],
    {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...Bun.env,
        PORTAL_SNAPSHOT_CRON_MARKER: MARKER,
        PORTAL_SNAPSHOT_CRON_DRY_RUN: '1',
      },
    }
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`portal snapshot worker failed (${code}): ${stderr || stdout}`);
  }
}

afterAll(async () => {
  if (registered) await removeOsCron(TITLE);
});

describe('portal-snapshot OS cron journey', () => {
  test(
    'register → fire scheduled(dry-run) → marker → remove',
    async () => {
      Bun.spawnSync(['mkdir', '-p', OUT]);
      Bun.spawnSync(['rm', '-f', MARKER]);

      await registerOsCron(PORTAL_SNAPSHOT_CRON_WORKER, SCHEDULE, TITLE);
      registered = true;
      await assertOsCronRegistration(TITLE);

      await fireWorker();

      expect(await Bun.file(MARKER).exists()).toBe(true);
      const body = (await Bun.file(MARKER).json()) as {
        ok?: boolean;
        dryRun?: boolean;
        scopes?: string[];
        type?: string;
      };
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.type).toBe('scheduled');
      expect(body.scopes).toContain('prediction');

      await removeOsCron(TITLE);
      registered = false;
    },
    { timeout: 45_000 }
  );
});

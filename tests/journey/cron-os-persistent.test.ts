// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-level (primary)
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Journey: Bun.cron(path, schedule, title) primary path.
 *
 * 1. Register an OS-persistent job (launchd / crontab / Task Scheduler)
 * 2. Assert the OS entry exists
 * 3. Fire the worker the same way Bun’s scheduler would (--cron-title)
 * 4. Assert the marker file under .cache/
 * 5. Always remove the job
 *
 * Waiting for a real minute boundary is too slow/flaky for CI; registration +
 * cron-execution-mode fire still exercises the primary API end-to-end.
 *
 *   bun run test:cron-os
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { registerOsCron, removeOsCron } from '../../lib/harness/cron';
import { joinPath } from '../../lib/path-bun';
import { assertOsCronRegistration } from './assert-os-cron-registration.ts';

const ROOT = joinPath(import.meta.dir, '../..');
const WORKER = joinPath(ROOT, 'tests/fixtures/cron-os-persistent-worker.ts');
const OUT = joinPath(ROOT, '.cache/journey-cron-os');
const TITLE = `fw_cron_os_${process.pid}_${Date.now()}`;
const MARKER = joinPath(OUT, `${TITLE}.json`);
const SCHEDULE = '@hourly';

let registered = false;

async function fireCronWorker(): Promise<void> {
  const proc = Bun.spawn(
    ['bun', 'run', `--cron-title=${TITLE}`, `--cron-period=${SCHEDULE}`, WORKER],
    {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...Bun.env,
        FW_CRON_OS_MARKER: MARKER,
      },
    }
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`cron worker fire failed (${code}): ${stderr || stdout}`);
  }
}

afterAll(async () => {
  if (registered) {
    await removeOsCron(TITLE);
  }
});

describe('cron OS-persistent journey (primary)', () => {
  test(
    'register → OS entry → fire scheduled() → marker → remove',
    async () => {
      expect(Bun.spawnSync(['mkdir', '-p', OUT]).exitCode).toBe(0);
      Bun.spawnSync(['rm', '-f', MARKER]);

      await registerOsCron(WORKER, SCHEDULE, TITLE);
      registered = true;

      await assertOsCronRegistration(TITLE);

      await fireCronWorker();

      expect(await Bun.file(MARKER).exists()).toBe(true);
      const body = (await Bun.file(MARKER).json()) as {
        ok?: boolean;
        cron?: string;
        type?: string;
      };
      expect(body.ok).toBe(true);
      expect(body.type).toBe('scheduled');
      expect(body.cron).toBe(SCHEDULE);

      await removeOsCron(TITLE);
      registered = false;

      if (process.platform === 'darwin') {
        const plist = joinPath(
          Bun.env.HOME || '',
          'Library/LaunchAgents',
          `bun.cron.${TITLE}.plist`
        );
        expect(await Bun.file(plist).exists()).toBe(false);
      }
    },
    { timeout: 30_000 }
  );
});

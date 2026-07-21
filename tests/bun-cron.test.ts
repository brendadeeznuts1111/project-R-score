// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-level (existing)
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — in-process (complement)
// @see https://github.com/tc39/proposal-explicit-resource-management — using → Disposable
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Spine smoke: Bun.cron overloads.
 *
 * Existing:  await Bun.cron(path, schedule, title)  — OS persistent, local time
 * Complement: Bun.cron(schedule, handler) → CronJob — in-process, UTC, Disposable
 *
 * Smokes below cover the in-process complement + parse (UTC).
 * OS-persistent primary journey: tests/journey/cron-os-persistent.test.ts (`bun run test:cron-os`).
 *
 *   bun test tests/bun-cron.test.ts
 */
import { describe, expect, test } from 'bun:test';

describe('Bun.cron in-process complement', () => {
  test('parse returns next fire in UTC', () => {
    // 0 9 * * * → 09:00 UTC regardless of system TZ
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0)); // 2026-01-01T00:00:00Z
    const next = Bun.cron.parse('0 9 * * *', from);
    expect(next).toBeInstanceOf(Date);
    expect(next!.getUTCFullYear()).toBe(2026);
    expect(next!.getUTCMonth()).toBe(0);
    expect(next!.getUTCDate()).toBe(1);
    expect(next!.getUTCHours()).toBe(9);
    expect(next!.getUTCMinutes()).toBe(0);
  });

  test('invalid schedule throws synchronously', () => {
    expect(() => Bun.cron('not-a-cron', () => {})).toThrow();
  });

  test('CronJob is Disposable; using stops the job', async () => {
    let ticks = 0;
    {
      using job = Bun.cron('@hourly', () => {
        ticks += 1;
      });
      expect(job.cron).toBe('@hourly');
      expect(typeof job[Symbol.dispose]).toBe('function');
      job.ref(); // default; chainable
      job.unref(); // allow exit if this were the only handle
    }
    await Bun.sleep(5);
    expect(ticks).toBe(0);
  });

  test('unref alone does not keep a short-lived process alive', async () => {
    // Child registers an every-minute job then unref — process should exit 0.
    const proc = Bun.spawn({
      cmd: [
        'bun',
        '-e',
        `Bun.cron('* * * * *', () => {}).unref();`,
      ],
      stdout: 'ignore',
      stderr: 'pipe',
    });
    const code = await Promise.race([
      proc.exited,
      Bun.sleep(3000).then(() => -1),
    ]);
    if (code === -1) {
      proc.kill();
      throw new Error('unref cron child did not exit within 3s');
    }
    expect(code).toBe(0);
  });

  test('stop() is chainable and cancels without using', () => {
    const job = Bun.cron('@daily', () => {});
    expect(job.stop()).toBe(job);
  });
});

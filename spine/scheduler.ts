#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — in-process complement
// @see https://github.com/tc39/proposal-explicit-resource-management — using → Disposable
/**
 * Spine daemon scheduler.
 *
 * Deliberately uses the **in-process** Bun.cron complement via lib/harness/cron:
 * the spine is a long-lived process that owns its lifetime and must not depend
 * on system crontab / launchd / Task Scheduler (no machine-level mutation,
 * testable without OS drift).
 *
 * OS-persistent Bun.cron(path, schedule, title) remains the primary form for
 * standalone scripts — see docs/harness/cron.md.
 *
 *   bun spine/scheduler.ts --once          # one integrity pass (delegates)
 *   bun tools/bun-doc-refs.ts schedule     # uses runInProcessUntilSignal
 */
import { scheduleInProcess } from '../lib/harness/cron';

export type DaemonHandler = () => unknown | Promise<unknown>;

/**
 * Run `handler` on an in-process cron until SIGINT/SIGTERM, then dispose.
 * Optionally fires once immediately before waiting on the schedule.
 */
export async function runInProcessUntilSignal(
  schedule: string,
  handler: DaemonHandler,
  opts: { runImmediately?: boolean; label?: string } = {}
): Promise<void> {
  const { runImmediately = true, label = 'spine scheduler' } = opts;
  {
    using _job = scheduleInProcess(schedule, handler);
    console.info(
      `⏰ ${label} · in-process complement · pattern "${schedule}" (UTC)`
    );
    console.info('   using → Symbol.dispose → stop() on signal / scope exit');
    if (runImmediately) await handler();
    await new Promise<void>(resolve => {
      process.once('SIGINT', () => resolve());
      process.once('SIGTERM', () => resolve());
    });
    console.info(`\n👋 ${label} stopping (dispose cron)`);
  }
}

/** CLI: delegate --once / schedule to bun-doc-refs integrity (keeps regen logic there). */
if (import.meta.main) {
  const once = Bun.argv.includes('--once');
  const args = ['tools/bun-doc-refs.ts', 'schedule', ...(once ? ['--once'] : [])];
  const proc = Bun.spawn(['bun', ...args], {
    cwd: `${import.meta.dir}/..`,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  process.exit(await proc.exited);
}

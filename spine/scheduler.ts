#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — in-process complement
// @see https://github.com/tc39/proposal-explicit-resource-management — using → Disposable
/**
 * Spine daemon scheduler (multi-tenant).
 *
 * Deliberately uses the **in-process** Bun.cron complement via lib/harness/cron:
 * the spine is a long-lived process that owns its lifetime and must not depend
 * on system crontab / launchd / Task Scheduler (no machine-level mutation,
 * testable without OS drift).
 *
 * OS-persistent Bun.cron(path, schedule, title) remains the primary form for
 * standalone scripts — see docs/harness/cron.md.
 *
 * Tenants: spine/tenants.ts (docs-integrity + install-verify, …).
 *
 *   bun spine/scheduler.ts --once                 # all tenants once
 *   bun spine/scheduler.ts --once --tenant=install-verify
 *   bun spine/scheduler.ts                        # daemon: each tenant on its schedule
 */
import { scheduleInProcess } from '../lib/harness/cron';
import { resolveTenants, type SpineTenant } from './tenants';

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
    console.info(`⏰ ${label} · in-process complement · pattern "${schedule}" (UTC)`);
    console.info('   using → Symbol.dispose → stop() on signal / scope exit');
    if (runImmediately) await handler();
    await new Promise<void>(resolve => {
      process.once('SIGINT', () => resolve());
      process.once('SIGTERM', () => resolve());
    });
    console.info(`\n👋 ${label} stopping (dispose cron)`);
  }
}

async function runTenantsOnce(tenants: SpineTenant[]): Promise<number> {
  let worst = 0;
  for (const t of tenants) {
    const code = await t.run();
    if (code !== 0) worst = code;
  }
  return worst;
}

async function runTenantsDaemon(tenants: SpineTenant[]): Promise<void> {
  const jobs = tenants.map(t =>
    scheduleInProcess(t.schedule, async () => {
      await t.run();
    })
  );
  console.info(
    `⏰ spine multi-tenant · ${tenants.length} tenant(s) · in-process complement (UTC)`
  );
  for (const t of tenants) {
    console.info(`   · ${t.id} @ "${t.schedule}"`);
  }
  console.info('   dispose all on SIGINT/SIGTERM');

  // Immediate pass so --once-equivalent smoke happens on daemon start
  await runTenantsOnce(tenants);

  await new Promise<void>(resolve => {
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
  });

  for (const job of jobs) {
    job[Symbol.dispose]();
  }
  console.info('\n👋 spine multi-tenant stopping (dispose crons)');
}

function parseTenantFlag(argv: string[]): string | undefined {
  const eq = argv.find(a => a.startsWith('--tenant='));
  if (eq) return eq.slice('--tenant='.length);
  const i = argv.indexOf('--tenant');
  if (i !== -1) return argv[i + 1];
  return undefined;
}

/** CLI */
if (import.meta.main) {
  const once = Bun.argv.includes('--once');
  const tenantFilter = parseTenantFlag(Bun.argv);
  const tenants = resolveTenants(tenantFilter);

  if (once) {
    process.exit(await runTenantsOnce(tenants));
  }

  await runTenantsDaemon(tenants);
}

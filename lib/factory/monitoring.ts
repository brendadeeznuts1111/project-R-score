// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Registry monitoring — integrity cron + alert hooks.
 *
 * Run daemon: `bun lib/factory/monitoring.ts`
 * One-shot:   `bun lib/factory/monitoring.ts --once`
 */

import { joinPath } from '../path-bun';
import { recordIntegrityCheck } from '../monitoring/collect.ts';
import { openOperationsDb } from '../operations/db.ts';
import { sendRegistryAlert } from './alerts';
import { runIntegrityCheck, type IntegrityReport } from './integrity';
import { registry } from './registry';

const INTEGRITY_REPORT = joinPath(import.meta.dir, '../../reports/registry-integrity.json');
export const REGISTRY_INTEGRITY_SCHEDULE = '0 3 * * *';
export const REGISTRY_INTEGRITY_CRON_TITLE = 'registry-integrity';

export type RegistryCronScheduler = (
  schedule: string,
  handler: () => void | Promise<void>,
  title?: string
) => unknown;

export async function persistIntegrityReport(report: IntegrityReport): Promise<void> {
  await Bun.write(INTEGRITY_REPORT, `${JSON.stringify(report, null, 2)}\n`);
}

/** Run integrity check, persist report, alert on failures. */
export async function runIntegrityCycle(): Promise<IntegrityReport> {
  const report = await runIntegrityCheck(registry);
  await persistIntegrityReport(report);

  try {
    const db = openOperationsDb();
    try {
      recordIntegrityCheck(db, {
        status: report.failures.length > 0 ? 'failed' : 'ok',
        failures: report.failures.length,
        details: JSON.stringify({ total: report.total, checkedAt: report.checkedAt }),
      });
    } finally {
      db.close();
    }
  } catch {
    /* ops DB optional on registry-only hosts */
  }

  if (report.failures.length > 0) {
    const sample = report.failures
      .slice(0, 3)
      .map(f => `${f.name}@${f.version} (${f.reason})`)
      .join(', ');
    const suffix = report.failures.length > 3 ? ` +${report.failures.length - 3} more` : '';
    await sendRegistryAlert(
      `Integrity check: ${report.failures.length}/${report.total} failures — ${sample}${suffix}`,
      'critical'
    );
  } else {
    console.info(`Registry integrity OK (${report.total} releases)`);
  }

  return report;
}

/** Register in-process cron jobs (VM / long-running Bun host). */
export function registerRegistryCrons(
  scheduler: RegistryCronScheduler = Bun.cron as RegistryCronScheduler
): void {
  scheduler(
    REGISTRY_INTEGRITY_SCHEDULE,
    async () => {
      try {
        await runIntegrityCycle();
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        console.error(`Registry integrity cycle failed: ${message}`);
        await sendRegistryAlert(`Integrity cycle failed: ${message}`, 'critical');
      }
    },
    REGISTRY_INTEGRITY_CRON_TITLE
  );
}

if (import.meta.main) {
  if (Bun.argv.includes('--once')) {
    const report = await runIntegrityCycle();
    console.info(Bun.inspect(report, { depth: 4 }));
    process.exit(report.failures.length > 0 ? 1 : 0);
  }

  registerRegistryCrons();
  console.info('Registry monitoring running (Bun.cron registry-integrity @ 03:00 UTC)...');
}

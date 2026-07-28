// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron in-process
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Portal scope-aware snapshot cron — in-process complement + one-shot cycle.
 *
 *   bun lib/operations/portal-snapshot-cron.ts --once
 *   bun lib/operations/portal-snapshot-cron.ts --once --dry-run
 *   PORTAL_SNAPSHOT_CRON=1 bun scripts/serve-public.ts
 *
 * OS-persistent primary: tools/portal-snapshot-cron.ts register
 */
import { scheduleInProcess, type InProcessCronJob } from '../harness/cron.ts';
import {
  ensureSnapshotDir,
  runSnapshot,
  type SnapshotManifest,
} from '../../tools/snapshot-core.ts';
import {
  PORTAL_SNAPSHOT_CRON_TITLE,
  resolvePortalSnapshotBaseUrl,
  resolvePortalSnapshotInprocessSchedule,
  resolvePortalSnapshotScopes,
} from '../../tools/portal-snapshot-cron-constants.ts';
import type { SnapshotScopeName } from '../../tools/snapshot-scopes.ts';

export { PORTAL_SNAPSHOT_CRON_TITLE } from '../../tools/portal-snapshot-cron-constants.ts';
export {
  PORTAL_SNAPSHOT_INPROCESS_SCHEDULE,
  PORTAL_SNAPSHOT_OS_SCHEDULE,
} from '../../tools/portal-snapshot-cron-constants.ts';

export type PortalSnapshotScopeResult = {
  scope: SnapshotScopeName;
  ok: boolean;
  id?: string; // brand-ok — opaque snapshot result primary key from scope runner
  error?: string;
};

export type PortalSnapshotCycleResult = {
  code: number;
  scopes: PortalSnapshotScopeResult[];
  error?: string;
};

export type PortalSnapshotCronOpts = {
  dryRun?: boolean;
  debug?: boolean;
  scopes?: SnapshotScopeName[];
  baseUrl?: string;
};

/** Capture one or more portal snapshot scopes (prediction, portal, gaps, limits). */
export async function runPortalSnapshotCycle(
  opts: PortalSnapshotCronOpts = {}
): Promise<PortalSnapshotCycleResult> {
  const scopes = opts.scopes ?? resolvePortalSnapshotScopes();
  if (scopes.length === 0) {
    return {
      code: 1,
      scopes: [],
      error: 'No valid scopes — set PORTAL_SNAPSHOT_SCOPES or PORTAL_SCOPE',
    };
  }

  const baseUrl = opts.baseUrl ?? resolvePortalSnapshotBaseUrl();
  const dryRun = opts.dryRun ?? false;
  const debug = opts.debug ?? false;

  if (!dryRun) {
    await ensureSnapshotDir();
  }

  const results: PortalSnapshotScopeResult[] = [];

  for (const scope of scopes) {
    try {
      const manifest: SnapshotManifest | null = await runSnapshot({
        scope,
        baseUrl,
        dryRun,
        debug,
      });
      results.push({
        scope,
        ok: dryRun || manifest != null,
        id: manifest?.id,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.warn(`[${PORTAL_SNAPSHOT_CRON_TITLE}] scope=${scope} failed:`, error);
      results.push({ scope, ok: false, error });
    }
  }

  const code = results.every(r => r.ok) ? 0 : 1;
  if (code === 0) {
    console.info(
      `[${PORTAL_SNAPSHOT_CRON_TITLE}] ok scopes=${results.map(r => r.scope).join(',')}`
    );
  } else {
    const failed = results.filter(r => !r.ok).map(r => r.scope);
    console.warn(`[${PORTAL_SNAPSHOT_CRON_TITLE}] partial failure: ${failed.join(', ')}`);
  }

  return { code, scopes: results };
}

export type PortalSnapshotCronScheduler = (
  schedule: string,
  handler: () => void | Promise<void>
) => InProcessCronJob | unknown;

/** In-process complement — UTC, no-overlap. Injectable for tests. */
export function registerPortalSnapshotCron(
  scheduler: PortalSnapshotCronScheduler = scheduleInProcess,
  opts: PortalSnapshotCronOpts = {}
): InProcessCronJob | unknown {
  const schedule = resolvePortalSnapshotInprocessSchedule();
  return scheduler(schedule, async () => {
    await runPortalSnapshotCycle(opts);
  });
}

if (import.meta.main) {
  const dryRun = Bun.argv.includes('--dry-run');
  const debug = Bun.argv.includes('--debug');
  const { code } = await runPortalSnapshotCycle({ dryRun, debug });
  if (Bun.argv.includes('--once')) {
    process.exit(code);
  }
  if (Bun.env.PORTAL_SNAPSHOT_CRON === '1') {
    registerPortalSnapshotCron();
    console.info(
      `⏰ ${PORTAL_SNAPSHOT_CRON_TITLE} · in-process @ "${resolvePortalSnapshotInprocessSchedule()}" UTC`
    );
  }
}

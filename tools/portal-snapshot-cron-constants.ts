// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/cron — Bun.cron
/**
 * Portal scope-aware snapshot cron constants — OS-persistent + in-process schedules.
 * @see docs/harness/cron.md
 * @see docs/harness/tenants/prediction-report.md
 */
import {
  DEFAULT_SNAPSHOT_BASE,
  isSnapshotScope,
  type SnapshotScopeName,
} from './snapshot-scopes.ts';
import { joinPath } from '../lib/path-bun.ts';

/** OS Bun.cron title (launchd / crontab / Task Scheduler). */
export const PORTAL_SNAPSHOT_CRON_TITLE = 'portal-snapshot';

/** Worker script registered with the OS scheduler (absolute — Bun.cron resolves no relatives). */
export const PORTAL_SNAPSHOT_CRON_WORKER = joinPath(
  import.meta.dir,
  'portal-snapshot-cron-worker.ts'
);

/** OS-level schedule — system local time (primary, reboot-surviving). */
export const PORTAL_SNAPSHOT_OS_SCHEDULE =
  (typeof Bun !== 'undefined' ? Bun.env.PORTAL_SNAPSHOT_OS_SCHEDULE : undefined)?.trim() ||
  '0 8 * * *';

/** In-process complement — UTC, no-overlap while serve-public / daemon runs. */
export const PORTAL_SNAPSHOT_INPROCESS_SCHEDULE =
  (typeof Bun !== 'undefined' ? Bun.env.PORTAL_SNAPSHOT_INPROCESS_SCHEDULE : undefined)?.trim() ||
  '0 */6 * * *';

export function resolvePortalSnapshotCronTitle(): string {
  const fromEnv = Bun.env.PORTAL_SNAPSHOT_CRON_TITLE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : PORTAL_SNAPSHOT_CRON_TITLE;
}

export function resolvePortalSnapshotOsSchedule(): string {
  const fromEnv = Bun.env.PORTAL_SNAPSHOT_OS_SCHEDULE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : PORTAL_SNAPSHOT_OS_SCHEDULE;
}

export function resolvePortalSnapshotInprocessSchedule(): string {
  const fromEnv = Bun.env.PORTAL_SNAPSHOT_INPROCESS_SCHEDULE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : PORTAL_SNAPSHOT_INPROCESS_SCHEDULE;
}

/** Comma-separated scopes; falls back to PORTAL_SCOPE then prediction. */
export function resolvePortalSnapshotScopes(): SnapshotScopeName[] {
  const raw =
    Bun.env.PORTAL_SNAPSHOT_SCOPES?.trim() || Bun.env.PORTAL_SCOPE?.trim() || 'prediction';
  const scopes: SnapshotScopeName[] = [];
  for (const part of raw.split(',')) {
    const name = part.trim();
    if (name && isSnapshotScope(name) && !scopes.includes(name)) {
      scopes.push(name);
    }
  }
  return scopes;
}

export function resolvePortalSnapshotBaseUrl(): string {
  const fromEnv = Bun.env.SNAPSHOT_BASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_SNAPSHOT_BASE;
}

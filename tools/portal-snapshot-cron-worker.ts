// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
/**
 * OS-persistent portal snapshot worker — fires via Bun.cron(path, schedule, title).
 *
 *   bun run portal:snapshot:cron:register
 *   bun run --cron-title=portal-snapshot tools/portal-snapshot-cron-worker.ts
 */
import { runPortalSnapshotCycle } from '../lib/operations/portal-snapshot-cron.ts';

export default {
  async scheduled(_controller: Bun.CronController) {
    const result = await runPortalSnapshotCycle();
    if (result.code !== 0) {
      const failed = result.scopes.filter(s => !s.ok).map(s => s.scope);
      throw new Error(
        result.error ?? `portal snapshot cycle failed for: ${failed.join(', ') || 'unknown'}`
      );
    }
  },
};

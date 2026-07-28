// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
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
    const dryRun = Bun.env.PORTAL_SNAPSHOT_CRON_DRY_RUN === '1';
    const result = await runPortalSnapshotCycle({ dryRun });

    // Journey/diagnostic hook: write a marker file when the harness asks for one.
    const marker = Bun.env.PORTAL_SNAPSHOT_CRON_MARKER;
    if (marker) {
      await Bun.write(
        marker,
        JSON.stringify({
          type: 'scheduled',
          ok: result.code === 0,
          dryRun,
          scopes: result.scopes.map(s => s.scope),
          firedAt: new Date().toISOString(),
        })
      );
    }

    if (result.code !== 0) {
      const failed = result.scopes.filter(s => !s.ok).map(s => s.scope);
      throw new Error(
        result.error ?? `portal snapshot cycle failed for: ${failed.join(', ') || 'unknown'}`
      );
    }
  },
};

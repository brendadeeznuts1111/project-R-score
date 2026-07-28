// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
/**
 * OS-persistent vault-health worker — daily drift check (Proton Pass item
 * states vs env references). Replaces the session-bound reminder cron.
 *
 *   bun run vault:health:cron:register   # register OS cron (daily 09:23)
 *   bun run vault:health:cron:remove     # remove
 *
 * Environment: needs the pass-cli agent session; loads ~/.reasonix/.env for
 * PATH context but the pass-cli session dirs are machine-level already.
 * Exits non-zero on unhealthy (referenced item missing/trashed) so the fire
 * is recorded as failed in OS logs.
 */
import { joinPath } from '../path-bun.ts';

// OS cron fires with no working directory — anchor to the repo root.
process.chdir(joinPath(import.meta.dir, '..', '..'));

export default {
  async scheduled(_controller: Bun.CronController) {
    // Same invocation as `bun run vault:health:bake` (sources the pass-cli
    // agent session from .env.pass-tokens inside agent-env.sh).
    const proc = Bun.spawn(
      [
        'bash',
        '-c',
        'source scripts/agent-env.sh factorywager >/dev/null && bun tools/vault-health-bake.ts',
      ],
      {
        stdout: 'inherit',
        stderr: 'inherit',
        env: {
          ...Bun.env,
          PROTON_PASS_AGENT_REASON: 'vault-health cron: daily drift check (titles/states only)',
        },
      }
    );
    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`vault-health cron: bake exited ${code} (referenced items missing/trashed)`);
    }
  },
};

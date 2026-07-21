// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — in-process complement
/**
 * Spine multi-tenant registry — each tenant is an in-process cron job
 * the daemon owns. Docs integrity remains tenant zero; product journeys
 * (fresh-rerun commands) are additional continuous-maintenance tenants.
 *
 *   bun run spine:schedule:once
 *   bun run spine:schedule:once -- --tenant=install-verify
 */
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');

export type SpineTenantId = 'docs-integrity' | 'install-verify';

export type SpineTenant = {
  id: SpineTenantId;
  /** Human label for logs */
  label: string;
  /** UTC cron expression (in-process complement) */
  schedule: string;
  /** One-shot / cron handler — return process exit code */
  run: () => Promise<number>;
};

async function spawnTenant(cmd: string[], label: string): Promise<number> {
  console.info(`▶ spine tenant · ${label}`);
  const proc = Bun.spawn(cmd, {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  console.info(`${code === 0 ? '✅' : '❌'} spine tenant · ${label} · exit ${code}`);
  return code;
}

/** Ordered tenant list — ≥2 required for multi-tenant claim. */
export const SPINE_TENANTS: readonly SpineTenant[] = [
  {
    id: 'docs-integrity',
    label: 'docs-integrity (bun-doc-refs schedule --once)',
    // Match tools/bun-doc-refs.ts schedule default
    schedule: '0 6 * * *',
    run: () =>
      spawnTenant(['bun', 'tools/bun-doc-refs.ts', 'schedule', '--once'], 'docs-integrity'),
  },
  {
    id: 'install-verify',
    label: 'install-verify journey (fresh-rerun)',
    // Offset from docs-integrity so the daemon does not stampede
    schedule: '30 6 * * *',
    run: () => spawnTenant(['bun', 'run', 'test:install-verify'], 'install-verify'),
  },
] as const;

export function tenantById(
  id: string // brand-ok — opaque spine tenant catalog key (not a domain *Id)
): SpineTenant | undefined {
  return SPINE_TENANTS.find(t => t.id === id);
}

export function resolveTenants(
  filterId?: string // brand-ok — opaque spine tenant catalog key (CLI --tenant)
): SpineTenant[] {
  if (!filterId) return [...SPINE_TENANTS];
  const t = tenantById(filterId);
  if (!t) {
    throw new Error(
      `Unknown spine tenant "${filterId}". Known: ${SPINE_TENANTS.map(x => x.id).join(', ')}`
    );
  }
  return [t];
}

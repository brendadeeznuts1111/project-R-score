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

export type SpineTenantId = 'docs-integrity' | 'install-verify' | 'registry-integrity';

export type SpineTenant = {
  id: SpineTenantId;
  /** Human label for logs */
  label: string;
  /** UTC cron expression (in-process complement) */
  schedule: string;
  /** One-shot / cron handler — return process exit code */
  run: () => Promise<number>;
};

async function recordTenantTick(tenant: string, code: number): Promise<void> {
  const path = joinPath(ROOT, 'reports/spine-tenant-ticks.jsonl');
  const line = `${JSON.stringify({ ts: new Date().toISOString(), tenant, code })}\n`;
  const prev = (await Bun.file(path).exists()) ? await Bun.file(path).text() : '';
  await Bun.write(path, prev + line);
}

async function spawnTenant(
  cmd: string[],
  label: string,
  tenantId: string // brand-ok — opaque spine tenant catalog key
): Promise<number> {
  console.info(`▶ spine tenant · ${label}`);
  const proc = Bun.spawn(cmd, {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  console.info(`${code === 0 ? '✅' : '❌'} spine tenant · ${label} · exit ${code}`);
  try {
    await recordTenantTick(tenantId, code);
  } catch (err) {
    console.warn(`⚠️ spine tenant tick log failed · ${tenantId}`, err);
  }
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
      spawnTenant(
        ['bun', 'tools/bun-doc-refs.ts', 'schedule', '--once'],
        'docs-integrity',
        'docs-integrity'
      ),
  },
  {
    id: 'install-verify',
    label: 'install-verify journey (fresh-rerun)',
    // Offset from docs-integrity so the daemon does not stampede
    schedule: '30 6 * * *',
    run: () =>
      spawnTenant(['bun', 'run', 'test:install-verify'], 'install-verify', 'install-verify'),
  },
  {
    id: 'registry-integrity',
    label: 'registry-integrity (factory R2 checksum audit)',
    schedule: '0 3 * * *',
    run: () =>
      spawnTenant(
        ['bun', 'lib/factory/monitoring.ts', '--once'],
        'registry-integrity',
        'registry-integrity'
      ),
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

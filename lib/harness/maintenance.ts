/**
 * Continuous-maintenance runbooks for spine tenants.
 *
 * A ProofPath is a one-shot claim (true/false). A TenantRunbook is the
 * response loop when that claim is re-evaluated on a schedule.
 *
 * @see ../../docs/harness/spine-tenants.md
 * @see ../../docs/harness/tenants/
 * @see ../spine/tenants.ts
 */
import { CRITICAL_PROOF_PATHS } from './proof';

export type TenantRunbook = {
  /** Spine tenant id — must match spine/tenants.ts */
  tenant: string; // brand-ok — opaque spine tenant catalog key
  /** Observable symptom that the tenant is unhealthy */
  signal: string;
  /** Exact repair command (or first step) */
  intervention: string;
  /** ProofPath.id that proves the tenant’s work still holds */
  proofId: string; // brand-ok — opaque proof-path catalog key
  /** Condition under which this tenant/runbook may be removed */
  retirement: string;
  /** UTC crontab (reference; enforcement is spine/tenants.ts) */
  schedule?: string;
  /** Command that validates the runbook doc / catalog entry */
  freshRerun: string;
  /** Repo-relative markdown owner */
  docPath: string;
};

/**
 * SSOT catalog — every SPINE_TENANTS id must appear here.
 * Doc files under docs/harness/tenants/<tenant>.md must exist.
 */
export const MAINTENANCE_RUNBOOKS: readonly TenantRunbook[] = [
  {
    tenant: 'docs-integrity',
    signal:
      '`bun run spine:schedule:once -- --tenant=docs-integrity` exits non-zero (integrity FAIL)',
    intervention: 'bun tools/bun-doc-refs.ts schedule --once',
    proofId: 'docs-integrity',
    retirement:
      'Remove when docs integrity is solely owned by a required CI / operate schedule that does not need the spine daemon',
    schedule: '0 6 * * *',
    freshRerun: 'bun run docs:tenant-docs-integrity',
    docPath: 'docs/harness/tenants/docs-integrity.md',
  },
  {
    tenant: 'install-verify',
    signal:
      '`bun run spine:schedule:once -- --tenant=install-verify` exits non-zero (journey smoke fail)',
    intervention: 'bun run test:install-verify',
    proofId: 'install-verify-journey',
    retirement:
      'Remove when install-verify journey proof is enforced by a pre-deploy / required CI gate on a schedule and spine is no longer the only periodic re-proof',
    schedule: '30 6 * * *',
    freshRerun: 'bun run docs:tenant-install-verify',
    docPath: 'docs/harness/tenants/install-verify.md',
  },
] as const;

export function runbookByTenant(tenant: string): TenantRunbook | undefined {
  // brand-ok — opaque spine tenant catalog key
  return MAINTENANCE_RUNBOOKS.find(r => r.tenant === tenant);
}

/** Fail closed: every proofId must resolve in CRITICAL_PROOF_PATHS. */
export function assertRunbookProofLinks(): string[] {
  const ids = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  const missing: string[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    if (!ids.has(r.proofId)) missing.push(`${r.tenant} → proofId ${r.proofId}`);
  }
  return missing;
}

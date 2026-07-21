// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
/**
 * CI / deploy runbooks — signal → intervention → proof → retirement.
 *
 * Not spine cron tenants. Covers the required CI envelope and deploy scripts
 * discovered by discover-ci.ts.
 *
 * @see ./discover-ci.ts
 * @see ../../docs/harness/ci-deploy.md
 */
import { CRITICAL_PROOF_PATHS } from './proof';
import type { RetirementCheck } from './maintenance';

export type CiRunbook = {
  id: string; // brand-ok — opaque CI runbook catalog key
  signal: string;
  intervention: string;
  proofId: string; // brand-ok — opaque proof-path catalog key
  retirement: string;
  retirementVerified: boolean;
  retirementCheck?: RetirementCheck;
  /** Cheap catalog / docs fresh-rerun (not a full prod deploy) */
  freshRerun: string;
  docPath: string;
};

/**
 * SSOT CI/deploy runbooks. Keep out of SPINE_TENANTS.
 * Live deploy is never the freshRerun — use docs or preflight-safe probes.
 */
export const CI_RUNBOOKS: readonly CiRunbook[] = [
  {
    id: 'ci-core',
    signal: '`bun run ci:core` exits non-zero (install verify · hygiene · ci:harness)',
    intervention: 'bun run ci:core',
    proofId: 'ci-core-envelope',
    retirement:
      'Remove when a single required GHA job owns the full envelope without a cataloged runbook',
    retirementVerified: false,
    retirementCheck: {
      description: 'harness-gates.yml still runs bun run ci:core',
      command: 'bun run docs:ci-deploy',
    },
    freshRerun: 'bun run docs:ci-deploy',
    docPath: 'docs/harness/tenants/ci-core.md',
  },
  {
    id: 'typescript-ci',
    signal: '`bun run type-check:ci` exits non-zero (typescript-checks workflow)',
    intervention: 'bun run type-check:ci',
    proofId: 'typescript-ci-gate',
    retirement:
      'Remove when type-check:ci is solely owned by typescript-checks.yml without a CI runbook',
    retirementVerified: false,
    retirementCheck: {
      description: 'typescript-checks workflow still required',
      proofId: 'typescript-ci-gate',
    },
    freshRerun: 'bun run docs:ci-deploy',
    docPath: 'docs/harness/tenants/typescript-ci.md',
  },
  {
    id: 'deploy-production',
    signal:
      '`bun run deploy:production` exits non-zero (R2/Bun.secrets preflight) or post-deploy health fails',
    intervention: 'bun run deploy:production',
    proofId: 'deploy-production-preflight',
    retirement:
      'Remove when production deploy is owned by an external CD system with its own runbook',
    retirementVerified: false,
    retirementCheck: {
      description: 'deploy:production script still the documented production path',
      command: 'bun run docs:ci-deploy',
    },
    freshRerun: 'bun run docs:ci-deploy',
    docPath: 'docs/harness/tenants/deploy-production.md',
  },
  {
    id: 'deploy-staging',
    signal: '`bun run deploy:staging` exits non-zero',
    intervention: 'bun run deploy:staging',
    proofId: 'deploy-staging-script',
    retirement: 'Remove when staging deploy is retired or folded into deploy-production',
    retirementVerified: false,
    retirementCheck: {
      description: 'deploy:staging script still present',
      command: 'bun run docs:ci-deploy',
    },
    freshRerun: 'bun run docs:ci-deploy',
    docPath: 'docs/harness/tenants/deploy-staging.md',
  },
  {
    id: 'bun-migrate',
    signal: '`bun run migrate:status` exits non-zero (Bun migration inventory drift)',
    intervention: 'bun run migrate:status',
    proofId: 'bun-migrate-status',
    retirement: 'Remove when bun-migrate inventory is owned by a different operate gate',
    retirementVerified: false,
    retirementCheck: {
      description: 'migrate:* scripts still the Bun migration path',
      command: 'bun run docs:ci-deploy',
    },
    freshRerun: 'bun run docs:ci-deploy',
    docPath: 'docs/harness/tenants/bun-migrate.md',
  },
] as const;

export function ciRunbookById(id: string): CiRunbook | undefined {
  // brand-ok — opaque CI runbook catalog key
  return CI_RUNBOOKS.find(r => r.id === id);
}

export function assertCiRunbookProofLinks(): string[] {
  const ids = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  const missing: string[] = [];
  for (const r of CI_RUNBOOKS) {
    if (!ids.has(r.proofId)) missing.push(`${r.id} → proofId ${r.proofId}`);
  }
  return missing;
}

export function assertCiRunbookFields(): string[] {
  const missing: string[] = [];
  for (const r of CI_RUNBOOKS) {
    if (!r.signal.trim()) missing.push(`${r.id}.signal empty`);
    if (!r.intervention.trim()) missing.push(`${r.id}.intervention empty`);
    if (!r.retirement.trim()) missing.push(`${r.id}.retirement empty`);
    if (!r.freshRerun.trim()) missing.push(`${r.id}.freshRerun empty`);
    if (r.retirementVerified) {
      missing.push(`${r.id}: retirementVerified must be false while active`);
    }
    if (!r.retirementCheck) missing.push(`${r.id}: must declare retirementCheck`);
  }
  return missing;
}

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
import { CRITICAL_PROOF_PATHS, type FreshRerunKind } from './proof';
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
  /** CI runbooks always catalog-doc style (same paste as ProofPath catalog children). */
  freshRerunKind: FreshRerunKind;
  docPath: string;
};

/** Shared catalog paste for CI/deploy children (`freshRerunKind: 'catalog'`). */
export const CI_CATALOG_FRESH_RERUN = 'bun run docs:ci-deploy';

/**
 * ProofPath ids owned by parent claim `ci-deploy-runbooks` (catalog children).
 * Must stay bijective with `CI_RUNBOOKS[].proofId`.
 */
export const CI_CHILD_PROOF_IDS = [
  'ci-core-envelope',
  'typescript-ci-gate',
  'deploy-production-preflight',
  'deploy-staging-script',
  'bun-migrate-status',
] as const;

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
    retirement: 'Remove when ci:core is retired or replaced by another local proof envelope',
    retirementVerified: false,
    retirementCheck: {
      description: 'ci:core remains the local merge-readiness envelope',
      command: 'bun run docs:ci-deploy',
    },
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
    docPath: 'docs/harness/tenants/ci-core.md',
  },
  {
    id: 'typescript-ci',
    signal: '`bun run type-check:ci` exits non-zero (local TypeScript proof)',
    intervention: 'bun run type-check:ci',
    proofId: 'typescript-ci-gate',
    retirement: 'Remove when type-check:ci is retired or folded into another local proof envelope',
    retirementVerified: false,
    retirementCheck: {
      description: 'type-check:ci remains a documented local merge-readiness proof',
      proofId: 'typescript-ci-gate',
    },
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
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
    freshRerunKind: 'catalog',
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
    freshRerunKind: 'catalog',
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
    freshRerunKind: 'catalog',
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

/** Parent claim `ci-deploy-runbooks`.childIds ↔ CI_CHILD_PROOF_IDS. */
export function assertCiDeployParentChildIds(): string[] {
  const missing: string[] = [];
  const parent = CRITICAL_PROOF_PATHS.find(p => p.id === 'ci-deploy-runbooks');
  if (!parent?.childIds) {
    missing.push('ci-deploy-runbooks missing childIds');
    return missing;
  }
  const a = [...parent.childIds].sort();
  const b = [...CI_CHILD_PROOF_IDS].sort();
  if (a.length !== b.length || a.some((id, i) => id !== b[i])) {
    missing.push(
      `ci-deploy-runbooks.childIds [${a.join(', ')}] ≠ CI_CHILD_PROOF_IDS [${b.join(', ')}]`
    );
  }
  return missing;
}

/** Bijection: CI_RUNBOOKS.proofId ↔ CI_CHILD_PROOF_IDS ↔ catalog ProofPaths. */
export function assertCiChildProofBijection(): string[] {
  const missing: string[] = [];
  const runbookProofs = CI_RUNBOOKS.map(r => r.proofId).sort();
  const childIds = [...CI_CHILD_PROOF_IDS].sort();
  if (
    runbookProofs.length !== childIds.length ||
    runbookProofs.some((id, i) => id !== childIds[i])
  ) {
    missing.push(
      `CI_RUNBOOKS.proofId [${runbookProofs.join(', ')}] ≠ CI_CHILD_PROOF_IDS [${childIds.join(', ')}]`
    );
  }
  const catalogPaths = CRITICAL_PROOF_PATHS.filter(p => p.freshRerunKind === 'catalog').map(
    p => p.id
  );
  const catalogSorted = [...catalogPaths].sort();
  if (
    catalogSorted.length !== childIds.length ||
    catalogSorted.some((id, i) => id !== childIds[i])
  ) {
    missing.push(
      `freshRerunKind=catalog [${catalogSorted.join(', ')}] ≠ CI_CHILD_PROOF_IDS [${childIds.join(', ')}]`
    );
  }
  for (const r of CI_RUNBOOKS) {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === r.proofId);
    if (!p) continue;
    if (p.freshRerunKind !== 'catalog') {
      missing.push(`${r.id}: linked proof ${r.proofId} must have freshRerunKind catalog`);
    }
    if (r.freshRerunKind !== 'catalog') {
      missing.push(`${r.id}: CiRunbook.freshRerunKind must be catalog`);
    }
    if (r.freshRerun !== CI_CATALOG_FRESH_RERUN || p.freshRerun !== CI_CATALOG_FRESH_RERUN) {
      missing.push(`${r.id}: freshRerun must be ${CI_CATALOG_FRESH_RERUN}`);
    }
  }
  return missing;
}

/**
 * CI catalog policy (opposite of spine): intervention is the live gate and must
 * not equal / be a substring-only paste of the catalog freshRerun.
 */
export function assertCiInterventionNotCatalogFreshRerun(): string[] {
  const missing: string[] = [];
  for (const r of CI_RUNBOOKS) {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === r.proofId);
    if (!p) continue;
    if (r.intervention.trim() === p.freshRerun.trim()) {
      missing.push(`${r.id}: intervention must not equal proof freshRerun (catalog paste)`);
    }
    if (r.intervention.includes('docs:ci-deploy')) {
      missing.push(`${r.id}: intervention must be the live gate, not docs:ci-deploy`);
    }
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

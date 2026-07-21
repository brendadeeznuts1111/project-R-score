/**
 * Code-quality tenants — same signal → intervention → proof → retirement shape
 * as spine maintenance, but not scheduled by the spine daemon.
 *
 * Scope: harness / day-loop surfaces (types · coverage · orphans · complexity).
 *
 * @see ./coverage-ratchet.ts
 * @see ./complexity.ts
 * @see ../../docs/harness/code-quality.md
 */
import { CRITICAL_PROOF_PATHS } from './proof';
import type { RetirementCheck } from './maintenance';

export type CodeQualityTenant = {
  /** Stable tenant id */
  id: string; // brand-ok — opaque code-quality catalog key
  signal: string;
  intervention: string;
  proofId: string; // brand-ok — opaque proof-path catalog key
  retirement: string;
  retirementVerified: boolean;
  retirementCheck?: RetirementCheck;
  freshRerun: string;
  docPath: string;
};

/**
 * SSOT — every code-quality tenant has a runbook doc + proof.
 * Keep out of SPINE_TENANTS (coverage/type-check are CI / day-loop, not cron).
 *
 * Types link: only `lib-docs-typecheck` is CQ-linked (`types-covered`). Sibling
 * islands (`lib-utils|core|security-typecheck`, `day-loop-typecheck`) share
 * `bun run type-check` by design but are not CODE_QUALITY_TENANTS members.
 */
export const CODE_QUALITY_TENANTS: readonly CodeQualityTenant[] = [
  {
    id: 'types-covered',
    signal: '`bun run type-check` exits non-zero (day-loop type debt)',
    intervention: 'bun run type-check',
    proofId: 'lib-docs-typecheck',
    retirement:
      'Remove when type-check is solely enforced by a required pre-merge gate that covers the same surfaces without a code-quality tenant',
    retirementVerified: false,
    retirementCheck: {
      description: 'type-check proof still green under CI ownership',
      proofId: 'lib-docs-typecheck',
    },
    freshRerun: 'bun run type-check',
    docPath: 'docs/harness/tenants/types-covered.md',
  },
  {
    id: 'coverage-floor',
    signal:
      '`bun run test:harness-coverage` reports lib/harness lines/funcs below coverage-baseline.json',
    intervention: 'bun run test:harness-coverage',
    proofId: 'harness-coverage-ratchet',
    retirement:
      'Remove when Bun coverageThreshold in bunfig (or CI) enforces the same harness floor without this tenant',
    retirementVerified: false,
    retirementCheck: {
      description: 'harness coverage floor still enforced by CI/bunfig',
      proofId: 'harness-coverage-ratchet',
    },
    freshRerun: 'bun run test:harness-coverage',
    docPath: 'docs/harness/tenants/coverage-floor.md',
  },
  {
    id: 'orphan-modules',
    signal: '`bun run check:harness-orphans` lists lib/harness modules with no importers',
    intervention: 'bun run check:harness-orphans',
    proofId: 'harness-orphan-modules',
    retirement: 'Remove when orphan detection is owned by a repo-wide unused-export gate',
    retirementVerified: false,
    retirementCheck: {
      description: 'orphan-module check owned by a broader unused-export gate',
      command: 'bun run check:harness-orphans',
    },
    freshRerun: 'bun run check:harness-orphans',
    docPath: 'docs/harness/tenants/orphan-modules.md',
  },
  {
    id: 'complexity-floor',
    signal: '`bun run check:harness-complexity` exits non-zero',
    intervention: 'bun run check:harness-complexity -- --update-baseline --yes',
    proofId: 'harness-complexity-floor',
    retirement:
      'Remove when complexity is enforced by pre-commit (or ESLint complexity) for the same lib/harness floor without this tenant',
    retirementVerified: false,
    retirementCheck: {
      description: 'complexity floor still enforced by pre-commit/ESLint or this probe',
      command: 'bun run check:harness-complexity',
    },
    freshRerun: 'bun run check:harness-complexity',
    docPath: 'docs/harness/tenants/complexity-floor.md',
  },
] as const;

export function codeQualityById(id: string): CodeQualityTenant | undefined {
  // brand-ok — opaque code-quality catalog key
  return CODE_QUALITY_TENANTS.find(t => t.id === id);
}

/** Fail closed: every proofId resolves. */
export function assertCodeQualityProofLinks(): string[] {
  const ids = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  const missing: string[] = [];
  for (const t of CODE_QUALITY_TENANTS) {
    if (!ids.has(t.proofId)) missing.push(`${t.id} → proofId ${t.proofId}`);
  }
  return missing;
}

/** Closed set: every CQ proofId is a real ProofPath (reverse membership). */
export function assertCodeQualityProofClosedSet(): string[] {
  const ids = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  const missing: string[] = [];
  const linked = new Set<string>();
  for (const t of CODE_QUALITY_TENANTS) {
    if (!ids.has(t.proofId)) missing.push(`${t.id} → proofId ${t.proofId}`);
    if (linked.has(t.proofId)) missing.push(`duplicate CQ proofId ${t.proofId}`);
    linked.add(t.proofId);
  }
  // Intentional: only lib-docs-typecheck is CQ-linked among typecheck islands.
  if (!linked.has('lib-docs-typecheck')) {
    missing.push('types-covered must link lib-docs-typecheck');
  }
  return missing;
}

/** Fail closed: fields non-empty; active tenants unverified. */
export function assertCodeQualityFields(): string[] {
  const missing: string[] = [];
  for (const t of CODE_QUALITY_TENANTS) {
    if (!t.signal.trim()) missing.push(`${t.id}.signal empty`);
    if (!t.intervention.trim()) missing.push(`${t.id}.intervention empty`);
    if (!t.retirement.trim()) missing.push(`${t.id}.retirement empty`);
    if (!t.freshRerun.trim()) missing.push(`${t.id}.freshRerun empty`);
    if (t.retirementVerified) {
      missing.push(`${t.id}: retirementVerified must be false while active`);
    }
    if (!t.retirementCheck) {
      missing.push(`${t.id}: must declare retirementCheck`);
    }
  }
  return missing;
}

// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
/**
 * Side-effect-free contracts for the Bun capability × FactoryWager brand map.
 *
 * The declaration manifest uses branded DocTokenId values. Wire artifacts expose
 * those tokens as strings only after this validator has joined them to the Bun
 * documentation catalog.
 */

import type { DocTokenId } from '../types/branded/documents.ts';

export const BUN_BRAND_SCOPES = ['production', 'tooling', 'test', 'config'] as const;
export type BunBrandScope = (typeof BUN_BRAND_SCOPES)[number];

export const BUN_BRAND_POLICIES = [
  'production-approved',
  'optional',
  'lab-only',
  'blocked',
] as const;
export type BunBrandPolicy = (typeof BUN_BRAND_POLICIES)[number];

export const BUN_BRAND_DIRECTIONS = ['input', 'output', 'control', 'evidence', 'none'] as const;
export type BunBrandDirection = (typeof BUN_BRAND_DIRECTIONS)[number];

export const BUN_BRAND_EVIDENCE_STATES = [
  'verified',
  'declared-unproven',
  'observed-undeclared',
  'failed',
  'stale',
] as const;
export type BunBrandEvidenceState = (typeof BUN_BRAND_EVIDENCE_STATES)[number];

/** Proof aggregation is order-independent: failure outranks stale, missing, then pass. */
export const BUN_BRAND_PROOF_STATE_SEVERITY = {
  verified: 0,
  'declared-unproven': 1,
  stale: 2,
  failed: 3,
} as const satisfies Record<Exclude<BunBrandEvidenceState, 'observed-undeclared'>, number>;
export type BunBrandProofState = keyof typeof BUN_BRAND_PROOF_STATE_SEVERITY;

export function mostSevereBunBrandProofState(
  states: readonly BunBrandProofState[]
): BunBrandProofState {
  return states.reduce<BunBrandProofState>(
    (highest, state) =>
      BUN_BRAND_PROOF_STATE_SEVERITY[state] > BUN_BRAND_PROOF_STATE_SEVERITY[highest]
        ? state
        : highest,
    'verified'
  );
}

export type BunBrandSourceRef = {
  path: string;
  symbol: string;
};

export type BunBrandRelationshipDeclaration =
  | {
      direction: Exclude<BunBrandDirection, 'none'>;
      brand: string;
      rationale: string;
    }
  | {
      direction: 'none';
      brand: null;
      rationale: string;
    };

export type BunBrandProofDeclaration = {
  source: string;
  key: string;
  maxAgeDays?: number;
};

export type BunBrandExperimentalApproval = {
  owner: string;
  rationale: string;
  fallback: string;
  expiresOn: string;
};

export type BunBrandUsageDeclaration = {
  key: string;
  token: DocTokenId;
  variant: string | null;
  scope: BunBrandScope;
  policy: BunBrandPolicy;
  ownerLane: string;
  implementations: readonly BunBrandSourceRef[];
  consumers: readonly BunBrandSourceRef[];
  relationships: readonly BunBrandRelationshipDeclaration[];
  proofs: readonly BunBrandProofDeclaration[];
  experimentalApproval?: BunBrandExperimentalApproval;
};

export type BunBrandCatalogToken = {
  name: string;
  type: string;
  stability: 'stable' | 'experimental' | 'deprecated';
  releasedIn?: string;
  docsUrl?: string;
};

export type BunBrandValidationContext = {
  catalogTokens: ReadonlyMap<string, BunBrandCatalogToken>;
  brandNames: ReadonlySet<string>;
  ownerLanes: ReadonlySet<string>;
  trackedPaths: ReadonlySet<string>;
  today?: string;
};

export type BunBrandValidationIssue = {
  declaration: string;
  field: string;
  message: string;
};

const VARIANT_REQUIRED = new Set(['Bun.cron', '--parallel', '--isolate', '--shard', '--changed']);

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

export function defineBunBrandUsages<const T extends readonly BunBrandUsageDeclaration[]>(
  declarations: T
): T {
  return declarations;
}

export function validateBunBrandUsages(
  declarations: readonly BunBrandUsageDeclaration[],
  context: BunBrandValidationContext
): BunBrandValidationIssue[] {
  const issues: BunBrandValidationIssue[] = [];
  const keys = new Set<string>();
  const today = context.today ?? new Date().toISOString().slice(0, 10);

  const issue = (declaration: string, field: string, message: string) => {
    issues.push({ declaration, field, message });
  };

  for (const declaration of declarations) {
    if (!declaration.key.trim()) issue(declaration.key, 'key', 'must be nonblank');
    if (keys.has(declaration.key)) issue(declaration.key, 'key', 'must be unique');
    keys.add(declaration.key);

    const token = context.catalogTokens.get(declaration.token);
    if (!token) issue(declaration.key, 'token', `unknown Bun catalog token ${declaration.token}`);
    if (!(BUN_BRAND_SCOPES as readonly string[]).includes(declaration.scope)) {
      issue(declaration.key, 'scope', `invalid scope ${declaration.scope}`);
    }
    if (!(BUN_BRAND_POLICIES as readonly string[]).includes(declaration.policy)) {
      issue(declaration.key, 'policy', `invalid policy ${declaration.policy}`);
    }
    if (VARIANT_REQUIRED.has(declaration.token) && !declaration.variant?.trim()) {
      issue(declaration.key, 'variant', `${declaration.token} requires a contextual variant`);
    }
    if (!context.ownerLanes.has(declaration.ownerLane)) {
      issue(declaration.key, 'ownerLane', `unknown owner lane ${declaration.ownerLane}`);
    }
    if (declaration.implementations.length === 0) {
      issue(declaration.key, 'implementations', 'at least one implementation is required');
    }
    for (const ref of [...declaration.implementations, ...declaration.consumers]) {
      if (!context.trackedPaths.has(ref.path)) {
        issue(declaration.key, 'path', `untracked owner path ${ref.path}`);
      }
      if (!ref.symbol.trim()) issue(declaration.key, 'symbol', `blank symbol for ${ref.path}`);
    }

    if (declaration.relationships.length === 0) {
      issue(
        declaration.key,
        'relationships',
        'must classify a brand relationship or explicit none'
      );
    }
    const none = declaration.relationships.filter(row => row.direction === 'none');
    if (none.length > 0 && declaration.relationships.length !== 1) {
      issue(declaration.key, 'relationships', 'none must be the only relationship');
    }
    for (const relationship of declaration.relationships) {
      if (!(BUN_BRAND_DIRECTIONS as readonly string[]).includes(relationship.direction)) {
        issue(
          declaration.key,
          'relationships',
          `invalid relationship direction ${relationship.direction}`
        );
        continue;
      }
      if (!relationship.rationale.trim()) {
        issue(declaration.key, 'relationships', 'every relationship requires a rationale');
      }
      if (relationship.direction === 'none') {
        if (relationship.brand !== null) {
          issue(declaration.key, 'relationships', 'none relationship must use brand: null');
        }
      } else if (!context.brandNames.has(relationship.brand)) {
        issue(declaration.key, 'relationships', `unknown brand ${relationship.brand}`);
      }
    }

    if (token?.stability === 'experimental' && declaration.policy === 'production-approved') {
      const approval = declaration.experimentalApproval;
      if (!approval) {
        issue(
          declaration.key,
          'experimentalApproval',
          'experimental production use requires approval'
        );
      } else {
        if (!approval.owner.trim() || !approval.rationale.trim() || !approval.fallback.trim()) {
          issue(
            declaration.key,
            'experimentalApproval',
            'owner, rationale, and fallback are required'
          );
        }
        if (!isIsoDate(approval.expiresOn) || approval.expiresOn < today) {
          issue(declaration.key, 'experimentalApproval', 'approval expiry is invalid or expired');
        }
      }
    }
  }

  return issues;
}

export function assertBunBrandUsages(
  declarations: readonly BunBrandUsageDeclaration[],
  context: BunBrandValidationContext
): void {
  const issues = validateBunBrandUsages(declarations, context);
  if (issues.length === 0) return;
  throw new Error(
    `Invalid Bun brand usage declarations:\n${issues
      .map(row => `- ${row.declaration || '<blank>'}.${row.field}: ${row.message}`)
      .join('\n')}`
  );
}

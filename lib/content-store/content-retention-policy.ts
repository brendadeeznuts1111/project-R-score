import wirePolicy from '../../config/content-retention-policy.json' with { type: 'json' };
import type { ContentDigest } from '../types/branded.ts';
import {
  parseContentRef,
  type ContentAuthorityRef,
  type ContentRef,
  type ContentRightsLifecycleState,
} from './content-contract.ts';

export const CONTENT_RETENTION_POLICY_SCHEMA = 'factorywager.content-retention-policy' as const;
export const CONTENT_RETENTION_POLICY_VERSION = 1 as const;

export type ContentRetentionPolicy = {
  readonly schema: typeof CONTENT_RETENTION_POLICY_SCHEMA;
  readonly version: typeof CONTENT_RETENTION_POLICY_VERSION;
  readonly owner: string;
  readonly defaultDecision: 'deny';
  readonly byteDeletion: {
    readonly enabled: boolean;
    readonly grant: string | null;
    readonly minimumRetentionDays: number;
    readonly eligibleRightsStates: readonly ('denied' | 'expired-or-revoked')[];
    readonly requireNoActiveAliases: true;
    readonly requireNoInboundRelations: true;
    readonly requireNoLegalHold: true;
  };
  readonly immutableRecords: readonly ['content-identity', 'rights-history', 'source-provenance'];
};

export type ContentByteDeletionInput = {
  readonly target: ContentRef;
  readonly expectedDigest: ContentDigest;
  readonly actor: ContentAuthorityRef;
  readonly storedAt: string;
  readonly now: string;
  readonly activeAliasCount: number;
  readonly inboundRelationCount: number;
  readonly legalHold: boolean;
};

export type ContentByteDeletionReason =
  | 'policy-disabled'
  | 'digest-substitution'
  | 'authority-mismatch'
  | 'invalid-clock'
  | 'minimum-retention-active'
  | 'rights-state-ineligible'
  | 'active-alias'
  | 'inbound-relation'
  | 'legal-hold'
  | 'explicit-policy-grant';

export type ContentByteDeletionDecision = {
  readonly allowed: boolean;
  readonly reason: ContentByteDeletionReason;
  readonly grant?: string;
};

function parseRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid content retention policy ${field}`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], field: string): void {
  if (Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new TypeError(`Invalid content retention policy ${field} keys`);
  }
}

export function parseContentRetentionPolicy(value: unknown): ContentRetentionPolicy {
  const root = parseRecord(value, 'root');
  exactKeys(
    root,
    ['schema', 'version', 'owner', 'defaultDecision', 'byteDeletion', 'immutableRecords'],
    'root'
  );
  if (
    root.schema !== CONTENT_RETENTION_POLICY_SCHEMA ||
    root.version !== CONTENT_RETENTION_POLICY_VERSION ||
    root.defaultDecision !== 'deny' ||
    typeof root.owner !== 'string' ||
    root.owner.length === 0
  )
    throw new TypeError('Invalid content retention policy identity');
  const deletion = parseRecord(root.byteDeletion, 'byteDeletion');
  exactKeys(
    deletion,
    [
      'enabled',
      'grant',
      'minimumRetentionDays',
      'eligibleRightsStates',
      'requireNoActiveAliases',
      'requireNoInboundRelations',
      'requireNoLegalHold',
    ],
    'byteDeletion'
  );
  if (
    typeof deletion.enabled !== 'boolean' ||
    (deletion.grant !== null &&
      (typeof deletion.grant !== 'string' || deletion.grant.length === 0)) ||
    (deletion.enabled && deletion.grant === null) ||
    !Number.isSafeInteger(deletion.minimumRetentionDays) ||
    Number(deletion.minimumRetentionDays) < 1 ||
    deletion.requireNoActiveAliases !== true ||
    deletion.requireNoInboundRelations !== true ||
    deletion.requireNoLegalHold !== true
  )
    throw new TypeError('Invalid content retention policy deletion grant');
  const states = deletion.eligibleRightsStates;
  if (!Array.isArray(states) || states.join('\0') !== 'denied\0expired-or-revoked') {
    throw new TypeError('Invalid content retention policy rights states');
  }
  const immutable = root.immutableRecords;
  if (
    !Array.isArray(immutable) ||
    immutable.join('\0') !== 'content-identity\0rights-history\0source-provenance'
  ) {
    throw new TypeError('Invalid content retention policy immutable records');
  }
  return root as ContentRetentionPolicy;
}

export const CONTENT_RETENTION_POLICY = parseContentRetentionPolicy(wirePolicy);

function authorityKey(value: ContentAuthorityRef): string {
  return value.kind === 'identity'
    ? `identity:${value.identityId}`
    : `source-system:${value.sourceSystemId}`;
}

function count(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new TypeError(`${field} must be nonnegative`);
  return value;
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) return Number.NaN;
  return parsed;
}

/** Authorize immutable-byte deletion only; identity, rights history, and provenance are never targets. */
export function decideContentByteDeletion(
  input: ContentByteDeletionInput,
  policy: ContentRetentionPolicy = CONTENT_RETENTION_POLICY
): ContentByteDeletionDecision {
  const exactPolicy = parseContentRetentionPolicy(policy);
  const target = parseContentRef(input.target);
  if (!exactPolicy.byteDeletion.enabled) return { allowed: false, reason: 'policy-disabled' };
  if (input.expectedDigest !== target.digest)
    return { allowed: false, reason: 'digest-substitution' };
  if (authorityKey(input.actor) !== authorityKey(target.authorities.storageSteward)) {
    return { allowed: false, reason: 'authority-mismatch' };
  }
  const storedAt = timestamp(input.storedAt);
  const now = timestamp(input.now);
  if (!Number.isFinite(storedAt) || !Number.isFinite(now) || now < storedAt) {
    return { allowed: false, reason: 'invalid-clock' };
  }
  if (now - storedAt < exactPolicy.byteDeletion.minimumRetentionDays * 86_400_000) {
    return { allowed: false, reason: 'minimum-retention-active' };
  }
  const rightsState = target.rights.state as ContentRightsLifecycleState;
  if (
    !exactPolicy.byteDeletion.eligibleRightsStates.includes(
      rightsState as 'denied' | 'expired-or-revoked'
    )
  ) {
    return { allowed: false, reason: 'rights-state-ineligible' };
  }
  if (count(input.activeAliasCount, 'activeAliasCount') > 0)
    return { allowed: false, reason: 'active-alias' };
  if (count(input.inboundRelationCount, 'inboundRelationCount') > 0)
    return { allowed: false, reason: 'inbound-relation' };
  if (input.legalHold) return { allowed: false, reason: 'legal-hold' };
  return { allowed: true, reason: 'explicit-policy-grant', grant: exactPolicy.byteDeletion.grant! };
}

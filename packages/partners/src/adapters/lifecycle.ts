/**
 * Canonical partner lifecycle adapter.
 *
 * Profile coverage is identity-only and must never author lifecycle.
 * Lifecycle facts come from the canonical partner-profile surface (private TOML
 * or its redacted public bake) with full FactProvenance including originalValue.
 *
 * External system mappings (e.g. Sports Terminal `frozen` → `suspended`) are
 * explicit declared mappings, never silent renames.
 */
import { parseAdapterId, parsePartnerCode, parseSourceSystemId } from '../core/identifiers.ts';
import {
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  PARTNER_LIFECYCLE_STATES,
  PARTNER_OPERATIONAL_PHASES,
  type FactProvenance,
  type LifecycleStateFact,
  type PartnerCode,
  type PartnerLifecycleState,
  type PartnerOperationalPhase,
} from '../core/types.ts';
import { wireRecord, wireText, wireTimestamp } from './wire.ts';

export const PARTNER_LIFECYCLE_ADAPTER_ID = parseAdapterId('canonical-lifecycle-v1');
export const PARTNER_LIFECYCLE_ADAPTER_VERSION = '1' as const;

/** Private profile status values that map 1:1 to PartnerLifecycleState. */
export const PARTNER_LIFECYCLE_STATUS_ALIASES = PARTNER_LIFECYCLE_STATES;

export type ExternalLifecycleMapping = {
  sourceSystemId: string;
  adapterId: string;
  adapterVersion: string;
  externalState: string;
  canonicalState: PartnerLifecycleState;
  mappingMethod: FactProvenance['mappingMethod'];
  confidence: FactProvenance['confidence'];
};

/** Declared external lifecycle mappings from the dashboard MVP plan. */
export const EXTERNAL_LIFECYCLE_MAPPINGS: readonly ExternalLifecycleMapping[] = [
  {
    sourceSystemId: 'sports-terminal',
    adapterId: 'sports-terminal',
    adapterVersion: '2',
    externalState: 'frozen',
    canonicalState: 'suspended',
    mappingMethod: 'declared',
    confidence: 'exact',
  },
] as const;

export type PartnerLifecycleObservation = {
  partnerCode: PartnerCode;
  lifecycle: LifecycleStateFact;
  /** Derived operator phase — never lifecycle authority. */
  operationalPhase: PartnerOperationalPhase;
};

function isLifecycleState(value: string): value is PartnerLifecycleState {
  return (PARTNER_LIFECYCLE_STATES as readonly string[]).includes(value);
}

function isOperationalPhase(value: string): value is PartnerOperationalPhase {
  return (PARTNER_OPERATIONAL_PHASES as readonly string[]).includes(value);
}

/**
 * Map a private-profile / legacy status string to PartnerLifecycleState.
 * Identity mapping for the eight plan states; rejects unknown labels.
 */
export function mapPartnerLifecycleStatusToState(status: string): PartnerLifecycleState {
  const trimmed = status.trim();
  if (!isLifecycleState(trimmed)) {
    throw new TypeError(
      `unknown partner lifecycle status ${JSON.stringify(status)}; expected one of ${PARTNER_LIFECYCLE_STATES.join('|')}`
    );
  }
  return trimmed;
}

/**
 * Map an external system state through the declared mapping table.
 * Throws when the (sourceSystem, externalState) pair is not declared.
 */
export function mapExternalLifecycleState(
  sourceSystemId: string,
  externalState: string
): {
  state: PartnerLifecycleState;
  mappingMethod: FactProvenance['mappingMethod'];
  confidence: FactProvenance['confidence'];
  adapterId: string;
  adapterVersion: string;
} {
  const hit = EXTERNAL_LIFECYCLE_MAPPINGS.find(
    row =>
      row.sourceSystemId === sourceSystemId &&
      row.externalState === externalState.trim().toLowerCase()
  );
  if (!hit) {
    throw new TypeError(
      `no declared lifecycle mapping for ${sourceSystemId}:${JSON.stringify(externalState)}`
    );
  }
  return {
    state: hit.canonicalState,
    mappingMethod: hit.mappingMethod,
    confidence: hit.confidence,
    adapterId: hit.adapterId,
    adapterVersion: hit.adapterVersion,
  };
}

/**
 * Derive operator phase from lifecycle + completeness signals.
 * Mirrors lib/partner-profile derivePhase without importing private schema.
 */
export function deriveOperationalPhase(
  state: PartnerLifecycleState,
  completeness: { telegramLinked: boolean; hasBooks: boolean }
): PartnerOperationalPhase {
  if (state === 'suspended' || state === 'terminated') return 'paused';
  if (state === 'signup' || state === 'materialized' || state === 'kyc_pending') {
    return 'onboarding';
  }
  if (state === 'active' || state === 'cultivating' || state === 'graduated') {
    if (!completeness.telegramLinked || !completeness.hasBooks) return 'incomplete';
    return 'operator_ready';
  }
  return 'incomplete';
}

function buildLifecycleFact(input: {
  partnerCode: PartnerCode;
  state: PartnerLifecycleState;
  originalValue: string;
  effectiveAt: string;
  observedAt: string;
  mappingMethod: FactProvenance['mappingMethod'];
  confidence: FactProvenance['confidence'];
  sourceRecordRef: string;
  sourceSystemId?: ReturnType<typeof parseSourceSystemId>;
  adapterId?: ReturnType<typeof parseAdapterId>;
  adapterVersion?: string;
}): LifecycleStateFact {
  return {
    state: input.state,
    effectiveAt: input.effectiveAt,
    provenance: {
      sourceSystemId: input.sourceSystemId ?? CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
      sourceRecordRef: input.sourceRecordRef,
      adapterId: input.adapterId ?? PARTNER_LIFECYCLE_ADAPTER_ID,
      adapterVersion: input.adapterVersion ?? PARTNER_LIFECYCLE_ADAPTER_VERSION,
      observedAt: input.observedAt,
      originalValue: input.originalValue,
      mappingMethod: input.mappingMethod,
      confidence: input.confidence,
    },
  };
}

/**
 * Adapt lifecycle from the public redacted partner-profiles bake (or private
 * profile objects that expose identity/lifecycle/meta). Never reads profile-coverage.
 */
export function adaptLifecycleFromCanonicalProfiles(
  // eslint-disable-next-line harness/no-unknown-function-param -- wire/bake edge
  profilesRoot: unknown,
  options?: {
    observedAt?: string;
    completenessByCode?: Readonly<Record<string, { telegramLinked: boolean; hasBooks: boolean }>>;
  }
): PartnerLifecycleObservation[] {
  const root = wireRecord(profilesRoot, 'partnerProfiles');
  // Public bake shape: { schema, profiles } or bare Record<code, profile>
  const profilesNode =
    root.profiles !== undefined ? wireRecord(root.profiles, 'partnerProfiles.profiles') : root;
  const observedAt =
    options?.observedAt ??
    (typeof root.generatedAt === 'string'
      ? wireTimestamp(root.generatedAt, 'partnerProfiles.generatedAt')
      : new Date().toISOString());

  const observations: PartnerLifecycleObservation[] = [];
  for (const rawCode of Object.keys(profilesNode).sort()) {
    // Skip non-partner top-level keys if bare object was the full bake root
    if (rawCode === 'schema' || rawCode === 'schemaVersion' || rawCode === 'generatedAt') {
      continue;
    }
    if (rawCode === 'summary') continue;

    const partnerCode = parsePartnerCode(rawCode);
    const path = `partnerProfiles.profiles.${partnerCode}`;
    const profile = wireRecord(profilesNode[rawCode], path);
    const identity = wireRecord(profile.identity, `${path}.identity`);
    const identityCode = parsePartnerCode(identity.code);
    if (identityCode !== partnerCode) {
      throw new TypeError(`${path}.identity.code must match record key`);
    }
    const lifecycle = wireRecord(profile.lifecycle, `${path}.lifecycle`);
    const originalStatus = wireText(lifecycle.status, `${path}.lifecycle.status`);
    const state = mapPartnerLifecycleStatusToState(originalStatus);

    // Prefer document-declared effective time when present; else observation time.
    const effectiveAt =
      lifecycle.effectiveAt !== undefined
        ? wireTimestamp(lifecycle.effectiveAt, `${path}.lifecycle.effectiveAt`)
        : observedAt;

    const completeness = options?.completenessByCode?.[partnerCode] ?? {
      telegramLinked: true,
      hasBooks: true,
    };
    // If profile carries a phase string, ignore it for authority — re-derive.
    if (lifecycle.phase !== undefined) {
      const phaseHint = wireText(lifecycle.phase, `${path}.lifecycle.phase`);
      if (!isOperationalPhase(phaseHint)) {
        throw new TypeError(`${path}.lifecycle.phase is not a PartnerOperationalPhase`);
      }
    }

    const fact = buildLifecycleFact({
      partnerCode,
      state,
      originalValue: originalStatus,
      effectiveAt,
      observedAt,
      mappingMethod: 'identity',
      confidence: 'exact',
      sourceRecordRef: `/registry/partner-profiles.json#/profiles/${partnerCode}`,
    });

    observations.push({
      partnerCode,
      lifecycle: fact,
      operationalPhase: deriveOperationalPhase(state, completeness),
    });
  }

  const codes = observations.map(row => row.partnerCode);
  if (new Set(codes).size !== codes.length) {
    throw new TypeError('canonical lifecycle observations contain duplicate PartnerCode');
  }
  return observations;
}

/**
 * Map a Sports Terminal (or other external) raw state into a LifecycleStateFact.
 */
export function adaptExternalLifecycleObservation(input: {
  partnerCode: PartnerCode;
  sourceSystemId: string;
  externalState: string;
  observedAt: string;
  effectiveAt?: string;
  sourceRecordRef: string;
}): LifecycleStateFact {
  const mapped = mapExternalLifecycleState(input.sourceSystemId, input.externalState);
  return buildLifecycleFact({
    partnerCode: input.partnerCode,
    state: mapped.state,
    originalValue: input.externalState,
    effectiveAt: input.effectiveAt ?? input.observedAt,
    observedAt: input.observedAt,
    mappingMethod: mapped.mappingMethod,
    confidence: mapped.confidence,
    sourceRecordRef: input.sourceRecordRef,
    sourceSystemId: parseSourceSystemId(input.sourceSystemId),
    adapterId: parseAdapterId(mapped.adapterId),
    adapterVersion: mapped.adapterVersion,
  });
}

/**
 * PartnerProfileReadPort — private policy surface parse + public projection.
 *
 * Private TOML may carry jurisdiction, SOR rules, Telegram contact, book
 * credentials, cultivation, settlement, and balance. The public registry
 * projection must never contain those classes.
 *
 * This adapter:
 *   1. Parses private profile wire for identity/lifecycle + policy *presence*
 *      (boolean flags only — never copies secret values).
 *   2. Projects the public-safe identity/lifecycle surface.
 *   3. Refuses leaks when a candidate public payload still carries policy keys
 *      or known secret markers.
 *
 * Does **not** implement risk/SOR product evaluation logic.
 *
 * @see docs/design/partner-dashboard-mvp.toml connector canonical-profile-config
 * @see docs/design/partner-dashboard-field-lineage.md P0 policy redaction
 * @see lib/partner-profile/bake.ts PublicPartnerProfile (host bake consumer)
 */
import {
  parseAdapterId,
  parsePartnerCallSign,
  parsePartnerCode,
  parseProfileDocumentVersion,
  parseTreeNodeId,
} from '../core/identifiers.ts';
import {
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  PARTNER_LIFECYCLE_STATES,
  PARTNER_OPERATIONAL_PHASES,
  type AdapterId,
  type PartnerCallSign,
  type PartnerCode,
  type PartnerLifecycleState,
  type PartnerOperationalPhase,
  type ProfileDocumentVersion,
  type SourceSystemId,
  type TreeNodeId,
} from '../core/types.ts';
import { wireRecord, wireText } from './wire.ts';

export const PARTNER_PROFILE_ADAPTER_ID = parseAdapterId('canonical-profile-config');
export const PARTNER_PROFILE_ADAPTER_VERSION = '1' as const;
export const PARTNER_PROFILE_PUBLIC_SCHEMA = 'factorywager.partner-profile-public.v2' as const;
export const PARTNER_PROFILE_PUBLIC_INPUT_REF = '/registry/partner-profiles.json' as const;

/**
 * Top-level private keys that constitute the policy / secrets surface.
 * Presence may be reported; values must never appear on the public wire.
 */
export const PRIVATE_POLICY_SURFACE_TOP_LEVEL_KEYS = [
  'jurisdiction',
  'rules',
  'telegram',
  'books',
  'outs',
  'cultivation',
  'settlement',
  'balance',
  'compliance',
  'accounting',
  'contact',
  'credentials',
  'secrets',
  'lineage',
] as const;

/** Nested key names that must never appear anywhere under a public projection. */
export const PRIVATE_POLICY_FORBIDDEN_NESTED_KEYS = [
  'password',
  'vaultKey',
  'apiKey',
  'apiKeyEnv',
  'chatId',
  'username',
  'allowedStates',
  'allowedCountries',
  'maxExposurePerSignal',
  'maxDailyExposure',
  'maxSingleBet',
  'bookWhitelist',
  'bookBlacklist',
  'eligibleTiers',
  'signalGates',
  'opsecScoreMax',
  'requireOpsecGreen',
  'taxForm',
  'geoFenceEnabled',
  'kycTier',
  'initialCapitalRequirement',
  'commissionPct',
  'depositAmounts',
  'funding',
  'target',
] as const;

export type PrivatePolicySurfacePresence = {
  hasJurisdiction: boolean;
  hasSorRules: boolean;
  hasTelegramContact: boolean;
  hasBooks: boolean;
  hasCultivation: boolean;
  hasSettlement: boolean;
  hasBalance: boolean;
  hasLineage: boolean;
  /** True when any private policy/secret top-level key is present. */
  hasAnyPrivatePolicy: boolean;
};

export type PrivatePartnerProfileSurface = {
  partnerCode: PartnerCode;
  callSign: PartnerCallSign;
  treeNodeId?: TreeNodeId;
  profileDocumentVersion: ProfileDocumentVersion;
  lifecycleState: PartnerLifecycleState;
  operationalPhase: PartnerOperationalPhase;
  policy: PrivatePolicySurfacePresence;
  source: {
    sourceSystemId: SourceSystemId;
    adapterId: AdapterId;
    adapterVersion: typeof PARTNER_PROFILE_ADAPTER_VERSION;
    sourceRecordRef: string;
  };
};

export type PublicPartnerProfileProjection = {
  meta: { templateId: string; version: ProfileDocumentVersion };
  identity: {
    code: PartnerCode;
    callSign: PartnerCallSign;
    treeNodeId?: TreeNodeId;
  };
  lifecycle: { status: PartnerLifecycleState; phase: PartnerOperationalPhase };
};

export type PublicPartnerProfilesArtifact = {
  schema: typeof PARTNER_PROFILE_PUBLIC_SCHEMA;
  schemaVersion: 2;
  generatedAt: string;
  profiles: Record<string, PublicPartnerProfileProjection>;
  summary: {
    count: number;
    byLifecycle: Record<string, number>;
    byPhase: Record<string, number>;
  };
};

function isLifecycleState(value: string): value is PartnerLifecycleState {
  return (PARTNER_LIFECYCLE_STATES as readonly string[]).includes(value);
}

function isOperationalPhase(value: string): value is PartnerOperationalPhase {
  return (PARTNER_OPERATIONAL_PHASES as readonly string[]).includes(value);
}

// eslint-disable-next-line harness/no-unknown-function-param -- private profile wire presence probe
function hasNonEmptyObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>).length > 0
    : false;
}

/**
 * Detect private policy surface presence without copying secret values.
 * Pure — no I/O, no SOR evaluation.
 */
export function detectPrivatePolicySurfacePresence(
  // eslint-disable-next-line harness/no-unknown-function-param -- private profile wire edge
  profile: unknown,
  path = 'privateProfile'
): PrivatePolicySurfacePresence {
  const root = wireRecord(profile, path);
  const rules = root.rules !== undefined ? wireRecord(root.rules, `${path}.rules`) : undefined;
  const telegram =
    root.telegram !== undefined ? wireRecord(root.telegram, `${path}.telegram`) : undefined;
  const hasJurisdiction = hasNonEmptyObject(root.jurisdiction);
  const hasSorRules = rules !== undefined && hasNonEmptyObject(rules.sor);
  const hasTelegramContact =
    telegram !== undefined &&
    (typeof telegram.chatId === 'string' || hasNonEmptyObject(telegram.topics));
  const hasBooks = hasNonEmptyObject(root.books) || hasNonEmptyObject(root.outs);
  const hasCultivation = hasNonEmptyObject(root.cultivation);
  const hasSettlement = hasNonEmptyObject(root.settlement);
  const hasBalance = hasNonEmptyObject(root.balance);
  const hasLineage = hasNonEmptyObject(root.lineage);
  const hasAnyPrivatePolicy =
    hasJurisdiction ||
    hasSorRules ||
    hasTelegramContact ||
    hasBooks ||
    hasCultivation ||
    hasSettlement ||
    hasBalance ||
    hasLineage ||
    PRIVATE_POLICY_SURFACE_TOP_LEVEL_KEYS.some(key => {
      if (
        key === 'jurisdiction' ||
        key === 'rules' ||
        key === 'telegram' ||
        key === 'books' ||
        key === 'outs'
      ) {
        return false; // already counted via has* flags (outs fold into hasBooks)
      }
      if (key === 'cultivation' || key === 'settlement' || key === 'balance' || key === 'lineage') {
        return false;
      }
      return root[key] !== undefined;
    });

  return {
    hasJurisdiction,
    hasSorRules,
    hasTelegramContact,
    hasBooks,
    hasCultivation,
    hasSettlement,
    hasBalance,
    hasLineage,
    hasAnyPrivatePolicy:
      hasAnyPrivatePolicy ||
      hasJurisdiction ||
      hasSorRules ||
      hasTelegramContact ||
      hasBooks ||
      hasCultivation ||
      hasSettlement ||
      hasBalance ||
      hasLineage,
  };
}

/**
 * Parse one private partner profile for PartnerProfileReadPort.
 * Returns identity/lifecycle facts plus policy presence flags only.
 */
export function parsePrivatePartnerProfileSurface(
  profile: unknown,
  options?: { recordKey?: string; sourceRecordRef?: string }
): PrivatePartnerProfileSurface {
  const path = options?.recordKey ? `privateProfiles.${options.recordKey}` : 'privateProfile';
  const root = wireRecord(profile, path);
  const identity = wireRecord(root.identity, `${path}.identity`);
  const meta = wireRecord(root.meta, `${path}.meta`);
  const lifecycle = wireRecord(root.lifecycle, `${path}.lifecycle`);

  const partnerCode = parsePartnerCode(identity.code);
  if (options?.recordKey !== undefined) {
    const keyCode = parsePartnerCode(options.recordKey);
    if (keyCode !== partnerCode) {
      throw new TypeError(`${path}.identity.code must match record key ${keyCode}`);
    }
  }
  const callSign = parsePartnerCallSign(identity.callSign, partnerCode);
  const treeNodeId =
    identity.treeNodeId === undefined || identity.treeNodeId === null
      ? undefined
      : parseTreeNodeId(wireText(identity.treeNodeId, `${path}.identity.treeNodeId`));

  const statusText = wireText(lifecycle.status, `${path}.lifecycle.status`);
  if (!isLifecycleState(statusText)) {
    throw new TypeError(
      `${path}.lifecycle.status must be one of ${PARTNER_LIFECYCLE_STATES.join('|')}`
    );
  }
  const phaseText = wireText(lifecycle.phase, `${path}.lifecycle.phase`);
  if (!isOperationalPhase(phaseText)) {
    throw new TypeError(
      `${path}.lifecycle.phase must be one of ${PARTNER_OPERATIONAL_PHASES.join('|')}`
    );
  }

  const policy = detectPrivatePolicySurfacePresence(root, path);
  const sourceRecordRef = options?.sourceRecordRef ?? `config/partner-profiles/${partnerCode}.toml`;

  return {
    partnerCode,
    callSign,
    ...(treeNodeId !== undefined ? { treeNodeId } : {}),
    profileDocumentVersion: parseProfileDocumentVersion(meta.version),
    lifecycleState: statusText,
    operationalPhase: phaseText,
    policy,
    source: {
      sourceSystemId: CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
      adapterId: PARTNER_PROFILE_ADAPTER_ID,
      adapterVersion: PARTNER_PROFILE_ADAPTER_VERSION,
      sourceRecordRef,
    },
  };
}

/**
 * Project only public-safe identity/lifecycle facts from a private profile.
 * Deliberately ignores jurisdiction, SOR, contact, books, and money classes.
 */
export function projectPublicPartnerProfile(
  // eslint-disable-next-line harness/no-unknown-function-param -- private profile wire edge
  profile: unknown,
  options?: { recordKey?: string }
): PublicPartnerProfileProjection {
  const path = options?.recordKey ? `privateProfiles.${options.recordKey}` : 'privateProfile';
  const root = wireRecord(profile, path);
  const identity = wireRecord(root.identity, `${path}.identity`);
  const meta = wireRecord(root.meta, `${path}.meta`);
  const lifecycle = wireRecord(root.lifecycle, `${path}.lifecycle`);

  const partnerCode = parsePartnerCode(identity.code);
  if (options?.recordKey !== undefined) {
    const keyCode = parsePartnerCode(options.recordKey);
    if (keyCode !== partnerCode) {
      throw new TypeError(`${path}.identity.code must match record key ${keyCode}`);
    }
  }
  const callSign = parsePartnerCallSign(identity.callSign, partnerCode);
  const treeNodeId =
    identity.treeNodeId === undefined || identity.treeNodeId === null
      ? undefined
      : parseTreeNodeId(wireText(identity.treeNodeId, `${path}.identity.treeNodeId`));

  const statusText = wireText(lifecycle.status, `${path}.lifecycle.status`);
  if (!isLifecycleState(statusText)) {
    throw new TypeError(`${path}.lifecycle.status is not a PartnerLifecycleState`);
  }
  const phaseText = wireText(lifecycle.phase, `${path}.lifecycle.phase`);
  if (!isOperationalPhase(phaseText)) {
    throw new TypeError(`${path}.lifecycle.phase is not a PartnerOperationalPhase`);
  }

  const templateId = wireText(meta.templateId, `${path}.meta.templateId`);
  const version = parseProfileDocumentVersion(meta.version);

  return {
    meta: { templateId, version },
    identity: {
      code: partnerCode,
      callSign,
      ...(treeNodeId !== undefined ? { treeNodeId } : {}),
    },
    lifecycle: { status: statusText, phase: phaseText },
  };
}

// eslint-disable-next-line harness/no-unknown-function-param -- public projection leak walk
function walkForbiddenKeys(value: unknown, path: string, hits: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForbiddenKeys(item, `${path}[${index}]`, hits));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if ((PRIVATE_POLICY_SURFACE_TOP_LEVEL_KEYS as readonly string[]).includes(key)) {
      hits.push(`${path}.${key}`);
    }
    if ((PRIVATE_POLICY_FORBIDDEN_NESTED_KEYS as readonly string[]).includes(key)) {
      hits.push(`${path}.${key}`);
    }
    walkForbiddenKeys(child, `${path}.${key}`, hits);
  }
}

/**
 * Fail-closed leak check for any candidate public projection (object or JSON string).
 * Rejects private policy top-level keys and nested secret markers anywhere in the tree.
 */
export function assertPublicPartnerProfileLeakFree(
  candidate: unknown,
  path = 'publicProfile'
): void {
  const value =
    typeof candidate === 'string'
      ? (() => {
          try {
            return JSON.parse(candidate) as unknown;
          } catch {
            throw new TypeError(`${path} JSON is not parseable for leak check`);
          }
        })()
      : candidate;

  const hits: string[] = [];
  walkForbiddenKeys(value, path, hits);
  if (hits.length > 0) {
    throw new TypeError(
      `public partner profile projection leaks private policy/secret keys: ${hits.slice(0, 12).join(', ')}${hits.length > 12 ? ` (+${hits.length - 12} more)` : ''}`
    );
  }

  // String-level refusal for common secret markers even if key names were renamed.
  const json = JSON.stringify(value);
  const stringMarkers = [
    'vault:',
    'partner:',
    '"password"',
    '"vaultKey"',
    '"chatId"',
    '"allowedStates"',
    '"maxExposurePerSignal"',
    '"signalGates"',
  ] as const;
  for (const marker of stringMarkers) {
    if (json.includes(marker)) {
      throw new TypeError(
        `public partner profile projection contains forbidden secret marker ${marker}`
      );
    }
  }
}

/**
 * Build the redacted public partner-profiles artifact from private profile records.
 * Pure — host bake owns I/O; this is the PartnerProfileReadPort projection.
 */
export function buildPublicPartnerProfilesArtifact(
  // eslint-disable-next-line harness/no-unknown-function-param -- private profiles map wire edge
  privateProfiles: unknown,
  generatedAt: string
): PublicPartnerProfilesArtifact {
  const root = wireRecord(privateProfiles, 'privateProfiles');
  const profiles: Record<string, PublicPartnerProfileProjection> = {};
  const byLifecycle: Record<string, number> = {};
  const byPhase: Record<string, number> = {};

  for (const rawCode of Object.keys(root).sort()) {
    const partnerCode = parsePartnerCode(rawCode);
    const projected = projectPublicPartnerProfile(root[rawCode], { recordKey: partnerCode });
    profiles[partnerCode] = projected;
    byLifecycle[projected.lifecycle.status] = (byLifecycle[projected.lifecycle.status] ?? 0) + 1;
    byPhase[projected.lifecycle.phase] = (byPhase[projected.lifecycle.phase] ?? 0) + 1;
  }

  const artifact: PublicPartnerProfilesArtifact = {
    schema: PARTNER_PROFILE_PUBLIC_SCHEMA,
    schemaVersion: 2,
    generatedAt,
    profiles,
    summary: {
      count: Object.keys(profiles).length,
      byLifecycle,
      byPhase,
    },
  };
  assertPublicPartnerProfileLeakFree(artifact, 'publicProfilesArtifact');
  return artifact;
}

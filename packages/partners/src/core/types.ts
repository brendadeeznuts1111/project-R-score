import type {
  AdapterId,
  AttentionReasonCode,
  CurrencyCode,
  ExternalAccountId,
  ExternalPartnerId,
  LedgerEntryId,
  OutId,
  PartnerCallSignCode,
  PartnerCode,
  PartnerProfileVersionCode,
  RailId,
  SourceSystemId,
  SportsbookId,
  TreeNodeId,
} from '../../../../lib/types/branded.ts';
import { asAttentionReasonCode, asSourceSystemId } from '../../../../lib/types/branded.ts';

export type {
  AdapterId,
  AttentionReasonCode,
  CurrencyCode,
  ExternalAccountId,
  ExternalPartnerId,
  LedgerEntryId,
  OutId,
  PartnerCode,
  RailId,
  SourceSystemId,
  SportsbookId,
  TreeNodeId,
};
export type PartnerCallSign = PartnerCallSignCode;
export type ProfileDocumentVersion = PartnerProfileVersionCode;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const CANONICAL_PROFILE_SOURCE_SYSTEM_ID = asSourceSystemId('factorywager-partner-profile');
/** Pre-retirement schema (legacy-ops connector era). */
export const PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1 = 'factorywager.partners-dashboard.v1';
/** Active schema after legacy-ops connector retirement. */
export const PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2 = 'factorywager.partners-dashboard.v2';
/** Active partners-dashboard schema id. */
export const PARTNER_DASHBOARD_ARTIFACT_SCHEMA = PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2;

export const PARTNER_LIFECYCLE_STATES = [
  'signup',
  'materialized',
  'kyc_pending',
  'active',
  'cultivating',
  'graduated',
  'suspended',
  'terminated',
] as const;
export type PartnerLifecycleState = (typeof PARTNER_LIFECYCLE_STATES)[number];

export const PARTNER_OPERATIONAL_PHASES = [
  'operator_ready',
  'onboarding',
  'incomplete',
  'paused',
] as const;
export type PartnerOperationalPhase = (typeof PARTNER_OPERATIONAL_PHASES)[number];

export const OUT_OPERATIONAL_STATUSES = [
  'unknown',
  'ready',
  'deferred',
  'paused',
  'blocked',
] as const;
export type OutOperationalStatus = (typeof OUT_OPERATIONAL_STATUSES)[number];

export const OUT_FUNDING_STATUSES = ['unknown', 'unfunded', 'partial', 'funded'] as const;
export type OutFundingStatus = (typeof OUT_FUNDING_STATUSES)[number];

export const PROVIDER_CONNECTION_STATUSES = ['unknown', 'active', 'inactive', 'pending'] as const;
export type ProviderConnectionStatus = (typeof PROVIDER_CONNECTION_STATUSES)[number];

export const CONNECTOR_DATA_STATUSES = ['ok', 'stale', 'unavailable'] as const;
export type ConnectorDataStatus = (typeof CONNECTOR_DATA_STATUSES)[number];

export const CONNECTOR_SOURCE_MODES = ['current', 'last_known_good', 'none'] as const;
export type ConnectorSourceMode = (typeof CONNECTOR_SOURCE_MODES)[number];

export const CONNECTOR_SNAPSHOT_REASON_CODES = [
  'current_fresh',
  'current_stale',
  'last_known_good',
  'optional_source_unavailable',
] as const;
export type ConnectorSnapshotReasonCode = (typeof CONNECTOR_SNAPSHOT_REASON_CODES)[number];

export const ATTENTION_SEVERITIES = ['info', 'warn', 'block'] as const;
export type AttentionSeverity = (typeof ATTENTION_SEVERITIES)[number];

export const PROVENANCE_MAPPING_METHODS = ['identity', 'declared', 'derived', 'heuristic'] as const;
export type ProvenanceMappingMethod = (typeof PROVENANCE_MAPPING_METHODS)[number];

export const PROVENANCE_CONFIDENCE_VALUES = ['exact', 'approximate', 'unknown'] as const;
export type ProvenanceConfidence = (typeof PROVENANCE_CONFIDENCE_VALUES)[number];

export const PARTNER_CONNECTOR_SNAPSHOT_KEYS = [
  'profiles',
  'accounting',
  'telegram',
  'limits',
  'bookmakers',
  'tennis',
  'sportsTerminal',
] as const;
export type PartnerConnectorSnapshotKey = (typeof PARTNER_CONNECTOR_SNAPSHOT_KEYS)[number];

export type FactProvenance = {
  sourceSystemId: SourceSystemId;
  sourceRecordRef?: string;
  adapterId: AdapterId;
  adapterVersion: string;
  observedAt: string;
  originalValue: string;
  mappingMethod: ProvenanceMappingMethod;
  confidence: ProvenanceConfidence;
};

export type LifecycleStateFact = {
  state: PartnerLifecycleState;
  effectiveAt: string;
  provenance: FactProvenance;
};

export type ExternalPartnerRef = {
  sourceSystemId: SourceSystemId;
  externalId: ExternalPartnerId;
};

export type ExternalAccountRef = {
  sourceSystemId: SourceSystemId;
  externalId: ExternalAccountId;
};

export type MoneyAmount = {
  currency: CurrencyCode;
  minorUnits: number;
};

export type ObservedMoneyAmount = {
  amount: MoneyAmount;
  provenance: FactProvenance;
};

export type AccountScope =
  | { kind: 'partner'; partnerCode: PartnerCode }
  | { kind: 'out'; outId: OutId }
  | { kind: 'rail'; railId: RailId };

export type BalancePosition = {
  accountScope: AccountScope;
  amount: MoneyAmount;
  effectiveAt: string;
};

export type ConnectorSnapshot = {
  dataStatus: ConnectorDataStatus;
  sourceMode: ConnectorSourceMode;
  reasonCode: ConnectorSnapshotReasonCode;
  observedAt?: string;
  ageSeconds?: number;
  inputRef: string;
  snapshotRef?: string;
};

export type PartnerDashboardOut = {
  outId: OutId;
  sportsbookId: SportsbookId;
  operationalStatus: OutOperationalStatus;
  fundingStatus: OutFundingStatus;
  providerConnectionStatus?: ProviderConnectionStatus;
  externalAccountRefs: ExternalAccountRef[];
  /** Global observed max-stake ceiling; scoped execution limits stay in out capabilities. */
  observedMaxStake?: ObservedMoneyAmount;
  limitCoverageRatio?: number;
};

export type PartnerDashboardLedgerEntry = {
  id: LedgerEntryId;
  entryType: string;
  amount: MoneyAmount;
  balanceAfter?: MoneyAmount;
  accountScope: AccountScope;
  postedAt: string;
  proofRef?: string;
};

export type PartnerAttentionItem = {
  reasonCode: AttentionReasonCode;
  severity: AttentionSeverity;
  label: string;
  actionHref?: string;
  actionCommand?: string;
};

export type PartnerDashboardRecord = {
  partnerCode: PartnerCode;
  callSign: PartnerCallSign;
  lifecycle: LifecycleStateFact;
  operationalPhase: PartnerOperationalPhase;
  identity: {
    treeNodeId?: TreeNodeId;
    profileSourceSystemId: SourceSystemId;
    externalPartnerRefs: ExternalPartnerRef[];
  };
  outs: PartnerDashboardOut[];
  accounting: {
    balancePositions: BalancePosition[];
    recentEntries: PartnerDashboardLedgerEntry[];
  };
  communication: {
    chatLinked: boolean;
    handshakeStatus: string;
    membershipCount?: number;
    configuredTopicKeys: string[];
  };
  limits: {
    tracked: number;
    missing: number;
    coverageRatio: number;
  };
  integrations: {
    tennis?: { dataStatus: ConnectorDataStatus; observedAt?: string };
    sportsTerminal?: { dataStatus: ConnectorDataStatus; observedAt?: string };
  };
  attention: PartnerAttentionItem[];
};

export const PARTNER_SOURCE_CONFLICT_FIELD_PATHS = [
  'partners[].lifecycle.state',
  'partners[].outs[].sportsbookId',
  'partners[].outs[].operationalStatus',
  'partners[].outs[].fundingStatus',
  'partners[].outs[].providerConnectionStatus',
  'partners[].outs[].observedMaxStake.amount.currency',
  'partners[].outs[].observedMaxStake.amount.minorUnits',
  'partners[].outs[].limitCoverageRatio',
] as const;
export type PartnerSourceConflictFieldPath = (typeof PARTNER_SOURCE_CONFLICT_FIELD_PATHS)[number];

export type PartnerSourceConflict = {
  partnerCode: PartnerCode;
  fieldPath: PartnerSourceConflictFieldPath;
  adapterIds: AdapterId[];
  values: JsonPrimitive[];
};

export type PartnerDashboardArtifact = {
  schema: typeof PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2;
  generatedAt: string;
  connectorSnapshots: Record<PartnerConnectorSnapshotKey, ConnectorSnapshot>;
  activeOutIds: OutId[];
  summary: {
    partnerCount: number;
    canonicalProfileCount: number;
    operatorReadyPartnerCount: number;
    attentionPartnerCount: number;
    registeredOutCount: number;
    activeOutCount: number;
    balancePositions: BalancePosition[];
  };
  conflicts: PartnerSourceConflict[];
  partners: PartnerDashboardRecord[];
};

export type PartnerDashboardBuildInput = {
  generatedAt: string;
  connectorSnapshots: Record<PartnerConnectorSnapshotKey, ConnectorSnapshot>;
  canonicalProfileCodes: PartnerCode[];
  activeOutIds: OutId[];
  conflicts?: PartnerSourceConflict[];
  partners: PartnerDashboardRecord[];
};

export const PROFILE_MIGRATION_REQUIRED_REASON = asAttentionReasonCode(
  'partner.profile.migration_required'
);

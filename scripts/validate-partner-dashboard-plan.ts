#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file

import { CONCEPT_DOMAINS, inferDomain } from '../lib/portal/concept-domains.ts';
import { PARTNER_LIFECYCLE_STATUSES, PARTNER_PHASES } from '../lib/partner-profile/schema.ts';
import { portalTheme, renderThemeTokensCss } from '../lib/portal/theme.ts';
import { PARTNER_HASH_PATTERN_INITS } from '../lib/portal/url-planes.ts';
import { resolvePath } from '../lib/path-bun.ts';
import {
  CANONICAL_OUT_ID_PATTERN,
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  INGRESS_TRANSLATION_COUNTER,
  LEGACY_OUT_ID_WARNING_CODE,
  LEGACY_SEAT_OUT_TOKEN_PATTERN,
  BET_STRUCTURES,
  BOOKMAKER_CATALOG_ARTIFACT_NAME,
  BOOKMAKER_CATALOG_SCHEMA_VERSION,
  CAPABILITY_SUPPORT_VALUES,
  CREDENTIAL_READINESS_VALUES,
  EXECUTION_AUTHORIZATION_STATUSES,
  EXECUTION_CONSTRAINT_OUTCOMES,
  EXECUTION_CRITICAL_LIMIT_KINDS,
  MARKET_PHASES,
  LIMIT_CHANGES_SCHEMA_VERSION,
  OUT_LIMIT_KINDS,
  OUT_LIMIT_STATUSES,
  PARTNER_OUT_CAPABILITY_SCHEMA_V1,
  SPORTSBOOK_RESOLUTION_METHODS,
  TELEGRAM_HANDSHAKE_SCHEMA_V1,
  TENNIS_CAPACITY_ARTIFACT_KIND,
  TENNIS_CAPACITY_ARTIFACT_VERSION,
  TENNIS_CAPACITY_RUNTIME,
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS,
  PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS,
  PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS,
  PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT,
  PARTNER_PROFILE_COVERAGE_INPUT_REF,
  PARTNER_PROFILE_COVERAGE_SCHEMA_V1,
  PARTNER_DASHBOARD_SEMANTIC_GAPS,
  PARTNER_CODE_PATTERN,
  PARTNERS_PACKAGE_TARGET,
  derivePartnerProfileCoverage,
  parseLegacyPartnersOpsProjection,
  parsePartnerCode,
  parsePartnerProfileCoverageArtifact,
  type PartnerDashboardConceptGapId,
} from '../packages/partners/src/index.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');
export const DEFAULT_PARTNER_DASHBOARD_PLAN = resolvePath(
  REPO_ROOT,
  'docs/design/partner-dashboard-mvp.toml'
);
const DOMAIN_GLOSSARY = resolvePath(REPO_ROOT, 'public/registry/domain-glossary.json');
const PARTNERS_BOARD_HTML = resolvePath(REPO_ROOT, 'public/portal/partners/index.html');
const GENERATED_THEME_CSS = resolvePath(REPO_ROOT, 'public/portal/theme-tokens.css');
const PARTNER_PROFILE_COVERAGE_REGISTRY = resolvePath(
  REPO_ROOT,
  'public',
  PARTNER_PROFILE_COVERAGE_INPUT_REF.replace(/^\//, '')
);
const PARTNERS_OPS_REGISTRY = resolvePath(REPO_ROOT, 'public/registry/partners-ops.json');
const PARTNERS_PACKAGE_JSON = resolvePath(REPO_ROOT, 'packages/partners/package.json');
const SPORTS_TERMINAL_REQUIRED_BLOCKERS = [
  'exact parsed input',
  'external-ID resolution',
  'authenticated route integration',
  'integer-minor-unit money wire',
] as const;

type AnyRecord = Record<string, any>;

export type PartnerDashboardPlanValidation = {
  errors: string[];
  summary: {
    bindings: number;
    gaps: number;
    connectors: number;
    regions: number;
    sectionMounts: number;
    hashRoutes: number;
    portalInputs: number;
    portalRequiredInputs: number;
    portalOptionalInputs: number;
    presentationStates: number;
    profileCoverageEntries: number;
    missingProfileCoverage: number;
  };
};

export type UnregisteredPartnerConcept = {
  key: string;
  candidate_concept_id: PartnerDashboardConceptGapId;
  business_domain: string;
  blocking: boolean;
};

type ConnectorContract = {
  snapshotKey: string;
  required: boolean;
  sourceSystemId: string; // brand-ok -- external system key parsed from the planning artifact
  port: string;
  inputKind: string;
  inputRef: string;
  implementationStatus: 'implemented' | 'partial' | 'planned' | 'blocked' | 'current-compatibility';
  authoritativeFactPaths: readonly string[];
};

const CONNECTOR_CONTRACTS: Readonly<Record<string, ConnectorContract>> = {
  'canonical-profile-config': {
    snapshotKey: 'profiles',
    required: true,
    sourceSystemId: CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
    port: 'PartnerProfileReadPort',
    inputKind: 'private-toml-glob',
    inputRef: 'config/partner-profiles/*.toml',
    implementationStatus: 'planned',
    authoritativeFactPaths:
      PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['canonical-profile-config'],
  },
  'accounting-ledger': {
    snapshotKey: 'accounting',
    required: false,
    sourceSystemId: 'root-operations-db',
    port: 'AccountingReadPort',
    inputKind: 'sqlite-table',
    inputRef: 'partner_ledger',
    implementationStatus: 'planned',
    authoritativeFactPaths:
      PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['accounting-ledger'],
  },
  'telegram-handshake': {
    snapshotKey: 'telegram',
    required: false,
    sourceSystemId: 'factorywager-telegram',
    port: 'CommunicationReadPort',
    inputKind: 'registry-artifact',
    inputRef: '/registry/telegram-handshake.json',
    implementationStatus: 'partial',
    authoritativeFactPaths:
      PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['telegram-handshake'],
  },
  'limits-registry': {
    snapshotKey: 'limits',
    required: false,
    sourceSystemId: 'factorywager-limits',
    port: 'LimitChangeObservationPort',
    inputKind: 'registry-artifact',
    inputRef: '/registry/limit-raises.json',
    implementationStatus: 'partial',
    authoritativeFactPaths: PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['limits-registry'],
  },
  'bookmakers-registry': {
    snapshotKey: 'bookmakers',
    required: false,
    sourceSystemId: 'factorywager-bookmakers',
    port: 'BookmakerCatalogPort',
    inputKind: 'registry-artifact',
    inputRef: '/registry/bookmakers.json',
    implementationStatus: 'partial',
    authoritativeFactPaths:
      PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['bookmakers-registry'],
  },
  'tennis-contract': {
    snapshotKey: 'tennis',
    required: false,
    sourceSystemId: 'tennis-hq',
    port: 'CapacityReadPort',
    inputKind: 'registry-artifact',
    inputRef: '/registry/tennis/partner-contracts.json',
    implementationStatus: 'partial',
    authoritativeFactPaths: PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['tennis-contract'],
  },
  'sports-terminal': {
    snapshotKey: 'sportsTerminal',
    required: false,
    sourceSystemId: 'sports-terminal',
    port: 'IntegrationHealthReadPort',
    inputKind: 'unresolved',
    inputRef: '',
    implementationStatus: 'blocked',
    authoritativeFactPaths: PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['sports-terminal'],
  },
  'legacy-ops-registry': {
    snapshotKey: 'legacyOps',
    required: false,
    sourceSystemId: 'factorywager-partners-ops',
    port: 'LegacyPartnerProjectionPort',
    inputKind: 'registry-artifact',
    inputRef: '/registry/partners-ops.json',
    implementationStatus: 'current-compatibility',
    authoritativeFactPaths:
      PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS['legacy-ops-registry'],
  },
};

const EXPECTED_NOMENCLATURE: Readonly<
  Record<string, { ownerDomain: string; wirePath?: string; wireShape?: string }>
> = {
  PartnerCode: { ownerDomain: 'partners', wirePath: 'partners[].partnerCode' },
  ProfileDocumentVersion: {
    ownerDomain: 'partners',
    wirePath: 'evidenceByPartnerCode.*.profileDocumentVersion',
  },
  PartnerLifecycleState: {
    ownerDomain: 'partners',
    wirePath: 'partners[].lifecycle.state',
  },
  PartnerOperationalPhase: {
    ownerDomain: 'partners',
    wirePath: 'partners[].operationalPhase',
  },
  OutId: { ownerDomain: 'partners', wirePath: 'partners[].outs[].outId' },
  ExternalPartnerRef: {
    ownerDomain: 'partners',
    wirePath: 'partners[].identity.externalPartnerRefs[]',
  },
  ExternalAccountRef: {
    ownerDomain: 'trading',
    wirePath: 'partners[].outs[].externalAccountRefs[]',
  },
  OutOperationalStatus: {
    ownerDomain: 'partners',
    wirePath: 'partners[].outs[].operationalStatus',
  },
  OutFundingStatus: {
    ownerDomain: 'accounting',
    wirePath: 'partners[].outs[].fundingStatus',
  },
  ProviderConnectionStatus: {
    ownerDomain: 'trading',
    wirePath: 'partners[].outs[].providerConnectionStatus',
  },
  ConnectorDataStatus: {
    ownerDomain: 'operations',
    wirePath: 'connectorSnapshots.*.dataStatus',
  },
  MoneyAmount: { ownerDomain: 'accounting', wireShape: '{ currency, minorUnits }' },
  AccountScope: {
    ownerDomain: 'accounting',
    wirePath: 'partners[].accounting.*.accountScope',
  },
  AttentionReasonCode: {
    ownerDomain: 'partners',
    wirePath: 'partners[].attention[].reasonCode',
  },
  SportsbookResolution: { ownerDomain: 'trading', wirePath: 'capability.sportsbook' },
  BetStructureCapability: { ownerDomain: 'trading', wirePath: 'capability.betStructures[]' },
  WagerOfferCatalog: { ownerDomain: 'trading', wirePath: 'capability.wagerOfferCatalog' },
  PromotionOfferCatalog: { ownerDomain: 'trading', wirePath: 'capability.promotionOfferCatalog' },
  OutLimitFact: { ownerDomain: 'compliance', wirePath: 'capability.limits[]' },
  ExecutionConstraintDecision: { ownerDomain: 'trading', wirePath: 'executionConstraintDecision' },
  TennisOutCapacityObservation: {
    ownerDomain: 'trading',
    wirePath: 'adapters.tennisCapacity.observations[]',
  },
  PartnerCommunicationObservation: {
    ownerDomain: 'telegram',
    wirePath: 'adapters.telegramHandshake.observations[]',
  },
  PartnerLimitChangeObservation: {
    ownerDomain: 'compliance',
    wirePath: 'adapters.limitChanges.observations[]',
  },
};

const EXPECTED_HASH_ROUTES = [
  {
    routeType: 'out',
    pattern: PARTNER_HASH_PATTERN_INITS.out.hash,
    anchorKind: 'template',
    anchorTemplate: 'out-card-{outId}',
    conceptId: 'section.partnersOuts',
  },
  {
    routeType: 'accounting',
    pattern: PARTNER_HASH_PATTERN_INITS.accounting.hash,
    anchorKind: 'static',
    anchorTemplate: 'accounting-ledger',
    conceptId: 'section.partnersAccounting',
  },
  {
    routeType: 'telegram',
    pattern: PARTNER_HASH_PATTERN_INITS.telegram.hash,
    anchorKind: 'static',
    anchorTemplate: 'telegram-thread',
    conceptId: 'section.partnersTelegram',
  },
  {
    routeType: 'partner',
    pattern: PARTNER_HASH_PATTERN_INITS.partner.hash,
    anchorKind: 'template',
    anchorTemplate: 'partner-detail-{code}',
    conceptId: 'page.partners',
  },
  {
    routeType: 'book',
    pattern: PARTNER_HASH_PATTERN_INITS.book.hash,
    anchorKind: 'template',
    anchorTemplate: 'book-card-{bookId}',
    conceptId: 'section.partnersBookDetail',
  },
  {
    routeType: 'partners',
    pattern: PARTNER_HASH_PATTERN_INITS.partners.hash,
    anchorKind: 'static',
    anchorTemplate: 'partner-panel',
    conceptId: 'page.partners',
  },
] as const;

const EXPECTED_AXES = {
  partnerLifecycleState: [...PARTNER_LIFECYCLE_STATUSES],
  partnerOperationalPhase: [...PARTNER_PHASES],
  outOperationalStatus: ['unknown', 'ready', 'deferred', 'paused', 'blocked'],
  outFundingStatus: ['unknown', 'unfunded', 'partial', 'funded'],
  providerConnectionStatus: ['unknown', 'active', 'inactive', 'pending'],
  connectorDataStatus: ['ok', 'stale', 'unavailable'],
  attentionSeverity: ['info', 'warn', 'block'],
} as const satisfies Record<string, readonly string[]>;

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function sameMembers(actual: string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every(value => actual.includes(value));
}

function sameSequence(actual: readonly string[] | undefined, expected: readonly string[]): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value)
  );
}

function resolveThemeToken(ref: string): unknown {
  if (ref.startsWith('scheme.')) {
    const key = ref.slice('scheme.'.length);
    const dark = (portalTheme.dark as AnyRecord)[key];
    const light = (portalTheme.light as AnyRecord)[key];
    return typeof dark === 'string' && typeof light === 'string' ? dark : undefined;
  }
  return ref.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as AnyRecord)[key];
  }, portalTheme);
}

function expectedThemePrefixes(role: string): string[] {
  if (role === 'page_canvas' || role.startsWith('panel_')) return ['layers.'];
  if (role.startsWith('text_')) return ['scheme.'];
  if (role.startsWith('link_')) return ['semantic.link.'];
  if (role.startsWith('interactive_')) return ['semantic.badge.'];
  if (role.startsWith('status_')) return ['tones.'];
  if (role.startsWith('freshness_')) return ['semantic.status.'];
  if (role.startsWith('group_')) return ['semantic.group.'];
  return [];
}

// eslint-disable-next-line harness/no-unknown-function-param -- recursive TOML validator boundary
function collectStrings(value: unknown, path = 'theme'): Array<{ path: string; value: string }> {
  if (typeof value === 'string') return [{ path, value }];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as AnyRecord).flatMap(([key, item]) =>
    collectStrings(item, `${path}.${key}`)
  );
}

function checkExactAxis(
  errors: string[],
  states: AnyRecord[],
  axis: keyof typeof EXPECTED_AXES
): void {
  const expected = EXPECTED_AXES[axis];
  const actual = states.filter(state => state.axis === axis).map(state => String(state.value));
  if (!unique(actual)) errors.push(`presentation axis ${axis} contains duplicate values`);
  const missing = expected.filter(value => !actual.includes(value));
  const extra = actual.filter(value => !expected.includes(value));
  if (missing.length || extra.length) {
    errors.push(
      `presentation axis ${axis} mismatch (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`
    );
  }
}

function htmlHasId(html: string, domAnchor: string): boolean {
  return html.includes(`id="${domAnchor}"`) || html.includes(`id='${domAnchor}'`);
}

function portalRegistryInputs(html: string): { required: string[]; optional: string[] } {
  const required = new Set<string>();
  const optional = new Set<string>();
  for (const match of html.matchAll(
    /\b(?:loadJson|fetch)\(\s*(['"])(\/registry\/[^'"]+)\1\s*\)(\s*\.catch\s*\()?/g
  )) {
    const inputRef = match[2];
    if (match[3]) optional.add(inputRef);
    else required.add(inputRef);
  }
  return { required: [...required].sort(), optional: [...optional].sort() };
}

export async function loadPartnerDashboardPlan(
  path = DEFAULT_PARTNER_DASHBOARD_PLAN
): Promise<AnyRecord> {
  return Bun.TOML.parse(await Bun.file(path).text()) as AnyRecord;
}

export async function validatePartnerDashboardPlan(
  plan: AnyRecord,
  options: {
    glossary?: AnyRecord;
    now?: Date;
    boardHtml?: string;
    themeCss?: string;
    partnerProfileCoverage?: AnyRecord;
    partnersOps?: AnyRecord;
    requiredPartnerCodes?: unknown[];
  } = {}
): Promise<PartnerDashboardPlanValidation> {
  const errors: string[] = [];
  const [glossary, boardHtml, themeCss, partnerProfileCoverage, partnersOps, partnersPackage] =
    await Promise.all([
      options.glossary
        ? Promise.resolve(options.glossary)
        : (Bun.file(DOMAIN_GLOSSARY).json() as Promise<AnyRecord>),
      options.boardHtml ?? Bun.file(PARTNERS_BOARD_HTML).text(),
      options.themeCss ?? Bun.file(GENERATED_THEME_CSS).text(),
      options.partnerProfileCoverage
        ? Promise.resolve(options.partnerProfileCoverage)
        : (Bun.file(PARTNER_PROFILE_COVERAGE_REGISTRY).json() as Promise<AnyRecord>),
      options.partnersOps
        ? Promise.resolve(options.partnersOps)
        : (Bun.file(PARTNERS_OPS_REGISTRY).json() as Promise<AnyRecord>),
      Bun.file(PARTNERS_PACKAGE_JSON).json() as Promise<AnyRecord>,
    ]);
  const concepts = new Map<string, AnyRecord>(
    (glossary.concepts ?? []).map((concept: AnyRecord) => [String(concept.id), concept])
  );
  const terms = (plan.nomenclature?.term ?? []) as AnyRecord[];
  const bindings = (plan.concepts?.binding ?? []) as AnyRecord[];
  const gaps = (plan.concepts?.gap ?? []) as AnyRecord[];
  const connectors = (plan.connectors ?? []) as AnyRecord[];
  const regions = (plan.surfaces?.portal?.regions ?? []) as AnyRecord[];
  const sectionMounts = (plan.surfaces?.portal?.section_mount_compatibility ?? []) as AnyRecord[];
  const hashRoutes = (plan.surfaces?.portal?.partner_hash_route_compatibility ?? []) as AnyRecord[];
  const portalConsumerContract = plan.surfaces?.portal?.consumer_contract as AnyRecord | undefined;
  const states = (plan.presentation?.state ?? []) as AnyRecord[];
  const themeRoles = (plan.theme?.roles ?? {}) as Record<string, string>;
  const legacyCalendar = plan.deprecation_calendar?.legacy_ops as AnyRecord | undefined;
  const legacyStatus = legacyCalendar?.status;

  if (plan.plan?.schema !== 'factorywager.partner-dashboard-plan.v2') {
    errors.push('plan.schema must be factorywager.partner-dashboard-plan.v2');
  }
  if (!['proposal', 'implementation-ready'].includes(plan.plan?.status)) {
    errors.push('plan.status must be proposal or implementation-ready');
  }
  if (plan.domain?.id !== 'partners') errors.push('domain.id must be partners');
  for (const [field, expected] of Object.entries(PARTNERS_PACKAGE_TARGET)) {
    if (plan.package?.[field] !== expected) {
      errors.push(`package.${field} must be ${expected}`);
    }
  }
  if (
    partnersPackage.name !== PARTNERS_PACKAGE_TARGET.target_name ||
    partnersPackage.private !== true ||
    partnersPackage.exports?.['./dashboard-plan'] !== './src/dashboard-plan.ts' ||
    partnersPackage.exports?.['./core'] !== './src/core/index.ts' ||
    partnersPackage.exports?.['./core/out-capabilities'] !== './src/core/out-capabilities.ts' ||
    partnersPackage.exports?.['./boundary'] !== './src/boundary/index.ts' ||
    partnersPackage.exports?.['./adapters'] !== './src/adapters/index.ts' ||
    partnersPackage.exports?.['./adapters/bookmaker-account'] !==
      './src/adapters/bookmaker-account.ts' ||
    partnersPackage.exports?.['./adapters/bookmakers'] !== './src/adapters/bookmakers.ts' ||
    partnersPackage.exports?.['./adapters/limit-changes'] !== './src/adapters/limit-changes.ts' ||
    partnersPackage.exports?.['./adapters/profile-coverage'] !==
      './src/adapters/profile-coverage.ts' ||
    partnersPackage.exports?.['./adapters/telegram-handshake'] !==
      './src/adapters/telegram-handshake.ts' ||
    partnersPackage.exports?.['./adapters/tennis-capacity'] !==
      './src/adapters/tennis-capacity.ts' ||
    partnersPackage.exports?.['./compatibility'] !== './src/compatibility/index.ts' ||
    partnersPackage.exports?.['./compatibility/legacy-partners-ops'] !==
      './src/compatibility/legacy-partners-ops.ts' ||
    partnersPackage.exports?.['./portal'] !== './src/portal/index.ts'
  ) {
    errors.push(
      'packages/partners must remain private and export adapters, dashboard-plan, core, boundary, compatibility, and portal'
    );
  }
  if (
    plan.package?.components?.identifiers !== 'implemented' ||
    plan.package?.components?.artifact_boundary !== 'implemented' ||
    plan.package?.components?.artifact_assembler !== 'implemented' ||
    plan.package?.components?.ingress_translator !== 'implemented' ||
    plan.package?.components?.legacy_ops_adapter !== 'implemented' ||
    plan.package?.components?.portal_consumer_contract !== 'implemented' ||
    plan.package?.components?.profile_coverage_adapter !== 'implemented' ||
    plan.package?.components?.out_capability_contract !== 'implemented' ||
    plan.package?.components?.execution_constraint_evaluator !== 'implemented' ||
    plan.package?.components?.bookmaker_account_resolver !== 'implemented' ||
    plan.package?.components?.tennis_capacity_adapter !== 'implemented' ||
    plan.package?.components?.telegram_handshake_adapter !== 'implemented' ||
    plan.package?.components?.limit_change_adapter !== 'implemented' ||
    plan.package?.components?.current_compatibility_fetch_transport !== 'implemented' ||
    plan.package?.components?.canonical_dashboard_browser_loader !== 'planned' ||
    'browser_loader' in (plan.package?.components ?? {}) ||
    plan.package?.components?.connector_ports !== 'partial' ||
    plan.package?.components?.source_adapters !== 'partial' ||
    plan.package?.components?.reconciliation !== 'planned'
  ) {
    errors.push(
      'package component statuses must distinguish implemented artifact core from planned adapters'
    );
  }
  if (
    plan.adapters?.tennis_capacity?.export !== './adapters/tennis-capacity' ||
    plan.adapters?.tennis_capacity?.implementation_status !== 'implemented' ||
    plan.adapters?.tennis_capacity?.schema_version !== TENNIS_CAPACITY_ARTIFACT_VERSION ||
    plan.adapters?.tennis_capacity?.kind !== TENNIS_CAPACITY_ARTIFACT_KIND ||
    plan.adapters?.tennis_capacity?.runtime !== TENNIS_CAPACITY_RUNTIME ||
    plan.adapters?.tennis_capacity?.execution_evidence_policy !== 'live-source-only' ||
    plan.adapters?.tennis_capacity?.offline_policy !== 'visibility-only-no-max-stake-promotion' ||
    plan.adapters?.telegram_handshake?.export !== './adapters/telegram-handshake' ||
    plan.adapters?.telegram_handshake?.implementation_status !== 'implemented' ||
    plan.adapters?.telegram_handshake?.schema !== TELEGRAM_HANDSHAKE_SCHEMA_V1 ||
    plan.adapters?.telegram_handshake?.invite_url_policy !== 'drop-at-partner-boundary' ||
    plan.adapters?.telegram_handshake?.membership_policy !== 'not-exposed-by-current-artifact' ||
    plan.adapters?.telegram_handshake?.topic_policy !== 'not-exposed-by-current-artifact' ||
    plan.adapters?.limit_changes?.export !== './adapters/limit-changes' ||
    plan.adapters?.limit_changes?.implementation_status !== 'implemented' ||
    plan.adapters?.limit_changes?.schema_version !== LIMIT_CHANGES_SCHEMA_VERSION ||
    plan.adapters?.limit_changes?.execution_ceiling_policy !==
      'never-current-ceiling-change-event-only'
  ) {
    errors.push('integration observation adapters must preserve source authority and redaction');
  }
  if (
    plan.shapes?.out_capability_snapshot?.type !== 'PartnerOutCapabilitySnapshot' ||
    plan.shapes?.out_capability_snapshot?.schema !== PARTNER_OUT_CAPABILITY_SCHEMA_V1 ||
    plan.shapes?.out_capability_snapshot?.implementation_status !== 'implemented' ||
    plan.shapes?.out_capability_snapshot?.parser !== 'parsePartnerOutCapabilitySnapshot' ||
    plan.shapes?.out_capability_snapshot?.evaluator !== 'evaluateExecutionConstraints' ||
    plan.shapes?.out_capability_snapshot?.missing_constraint_policy !==
      'manual-review-never-assume-unlimited' ||
    !sameMembers(
      plan.shapes?.out_capability_snapshot?.required_limit_kinds ?? [],
      EXECUTION_CRITICAL_LIMIT_KINDS
    )
  ) {
    errors.push('out capability snapshot must match the implemented private preflight contract');
  }
  if (
    plan.adapters?.bookmaker_account_resolver?.export !== './adapters/bookmaker-account' ||
    plan.adapters?.bookmaker_account_resolver?.implementation_status !== 'implemented' ||
    plan.adapters?.bookmaker_account_resolver?.exact_match_policy !==
      'exact-host-with-www-normalization' ||
    plan.adapters?.bookmaker_account_resolver?.alternate_host_policy !==
      'explicit-host-alias-only' ||
    plan.adapters?.bookmaker_account_resolver?.unknown_host_policy !==
      'manual-review-no-parent-domain-or-substring-guess' ||
    plan.adapters?.bookmaker_account_resolver?.manual_resolution_policy !==
      'operator-selected-registered-sportsbook-id' ||
    plan.adapters?.bookmaker_account_resolver?.registry_input_status !==
      'implemented-public-catalog-parser' ||
    plan.adapters?.bookmaker_account_resolver?.registry_io_status !==
      'planned-owned-by-bookmakers-registry-connector'
  ) {
    errors.push(
      'bookmaker account resolver must remain fail-closed and separate from registry I/O'
    );
  }
  if (
    plan.adapters?.bookmakers_catalog?.export !== './adapters/bookmakers' ||
    plan.adapters?.bookmakers_catalog?.implementation_status !== 'implemented' ||
    plan.adapters?.bookmakers_catalog?.schema_version !== BOOKMAKER_CATALOG_SCHEMA_VERSION ||
    plan.adapters?.bookmakers_catalog?.artifact_name !== BOOKMAKER_CATALOG_ARTIFACT_NAME ||
    plan.adapters?.bookmakers_catalog?.identity_policy !== 'object-key-equals-id-equals-slug' ||
    plan.adapters?.bookmakers_catalog?.host_policy !== 'unique-normalized-host' ||
    plan.adapters?.bookmakers_catalog?.projection_policy !==
      'id-slug-label-skin-brand-group-web-url-only' ||
    plan.adapters?.bookmakers_catalog?.ops_only_field_policy !== 'reject'
  ) {
    errors.push('bookmaker catalog adapter must preserve public identity and redaction policy');
  }
  if (
    plan.out_capabilities?.schema !== PARTNER_OUT_CAPABILITY_SCHEMA_V1 ||
    !sameMembers(plan.out_capabilities?.resolution_methods ?? [], SPORTSBOOK_RESOLUTION_METHODS) ||
    !sameMembers(plan.out_capabilities?.bet_structures ?? [], BET_STRUCTURES) ||
    !sameMembers(plan.out_capabilities?.capability_support ?? [], CAPABILITY_SUPPORT_VALUES) ||
    !sameMembers(plan.out_capabilities?.market_phases ?? [], MARKET_PHASES) ||
    !sameMembers(plan.out_capabilities?.limit_kinds ?? [], OUT_LIMIT_KINDS) ||
    !sameMembers(
      plan.out_capabilities?.critical_limit_kinds ?? [],
      EXECUTION_CRITICAL_LIMIT_KINDS
    ) ||
    !sameMembers(plan.out_capabilities?.limit_statuses ?? [], OUT_LIMIT_STATUSES) ||
    !sameMembers(plan.out_capabilities?.credential_readiness ?? [], CREDENTIAL_READINESS_VALUES) ||
    !sameMembers(
      plan.out_capabilities?.execution_authorization ?? [],
      EXECUTION_AUTHORIZATION_STATUSES
    ) ||
    !sameMembers(plan.out_capabilities?.constraint_outcomes ?? [], EXECUTION_CONSTRAINT_OUTCOMES) ||
    !sameMembers(plan.out_capabilities?.decision_values ?? [], [
      'allow',
      'deny',
      'manual_review',
    ]) ||
    plan.out_capabilities?.global_critical_limit_facts_required !== true ||
    plan.out_capabilities?.equal_specificity_policy !== 'reject-ambiguous-match' ||
    plan.out_capabilities?.cross_currency_policy !== 'reject-no-implicit-conversion' ||
    plan.out_capabilities?.promotions_gate_execution !== false
  ) {
    errors.push('out_capabilities must match the package-owned execution constraint axes');
  }
  if (
    plan.shapes?.profile_coverage_artifact?.type !== 'PartnerProfileCoverageArtifact' ||
    plan.shapes?.profile_coverage_artifact?.schema !== PARTNER_PROFILE_COVERAGE_SCHEMA_V1 ||
    plan.shapes?.profile_coverage_artifact?.path !== PARTNER_PROFILE_COVERAGE_INPUT_REF ||
    plan.shapes?.profile_coverage_artifact?.implementation_status !== 'implemented' ||
    plan.shapes?.profile_coverage_artifact?.role !== 'implementation-readiness-input' ||
    plan.shapes?.profile_coverage_artifact?.dashboard_connector !== false ||
    plan.shapes?.profile_coverage_artifact?.lifecycle_authority !== false ||
    !sameMembers(plan.shapes?.profile_coverage_artifact?.public_fact_paths ?? [], [
      'generatedAt',
      'evidenceByPartnerCode.*.callSign',
      'evidenceByPartnerCode.*.profileDocumentVersion',
    ]) ||
    !sameMembers(plan.shapes?.profile_coverage_artifact?.forbidden_fact_classes ?? [], [
      'lifecycle',
      'phase',
      'credentials',
      'funding',
      'telegram',
      'accounting',
      'money',
      'policy',
    ])
  ) {
    errors.push('profile coverage artifact must remain redacted identity evidence only');
  }
  if (
    plan.shapes?.dashboard_artifact?.active_out_identity_field !== 'activeOutIds' ||
    plan.shapes?.dashboard_artifact?.conflict_value_policy !== 'redacted-json-scalars-only' ||
    (legacyStatus !== 'retired' &&
      plan.shapes?.dashboard_artifact?.schema !== PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1)
  ) {
    errors.push('dashboard artifact must expose active OutIds and scalar-only conflict evidence');
  }
  if (
    plan.identity?.partner_code?.pattern !== PARTNER_CODE_PATTERN ||
    plan.identity?.partner_code?.type !== 'PartnerCode'
  ) {
    errors.push('identity.partner_code must match the package-owned PartnerCode parser');
  }
  if (
    plan.identity?.out_id?.pattern !== CANONICAL_OUT_ID_PATTERN ||
    plan.identity?.out_id?.type !== 'OutId' ||
    plan.identity?.out_id?.target_parser !== 'parseCanonicalOutId' ||
    plan.identity?.out_id?.implementation_status !== 'implemented'
  ) {
    errors.push('identity.out_id must match the implemented canonical OutId parser');
  }
  if (
    plan.ingress?.translator !== 'IngressTranslator' ||
    plan.ingress?.implementation_status !== 'translator-implemented' ||
    plan.ingress?.caller_integration_status !== 'unwired' ||
    plan.ingress?.telemetry_emission_status !== 'unwired' ||
    plan.ingress?.stage !== 'before-core-parse' ||
    plan.ingress?.unknown_mapping !== 'reject' ||
    plan.ingress?.telemetry_counter !== INGRESS_TRANSLATION_COUNTER
  ) {
    errors.push('ingress must declare the implemented pre-core rejecting translator');
  }
  if (
    plan.ingress?.http?.route_status !== 'no-canonical-route' ||
    plan.ingress?.http?.auth_integration_status !== 'unwired' ||
    !Array.isArray(plan.ingress?.http?.accepted_media_types) ||
    plan.ingress.http.accepted_media_types.length !== 0 ||
    plan.ingress?.http?.multipart_status !== 'unsupported-not-required'
  ) {
    errors.push('ingress HTTP status must not claim an unwired canonical API contract');
  }
  const legacyOutMapping = plan.ingress?.mappings?.legacy_seat_out_token;
  if (
    legacyOutMapping?.from_pattern !== LEGACY_SEAT_OUT_TOKEN_PATTERN ||
    legacyOutMapping?.canonical_pattern !== CANONICAL_OUT_ID_PATTERN ||
    legacyOutMapping?.to_template !== 'out-{code}-{sequence}' ||
    legacyOutMapping?.canonical_parser !== 'parseCanonicalOutId' ||
    legacyOutMapping?.canonical_parser_implementation_status !== 'implemented' ||
    legacyOutMapping?.emit_deprecation_warning !== true ||
    legacyOutMapping?.warning_emission_owner !== 'future-ingress-caller' ||
    legacyOutMapping?.deprecation_warning_code !== LEGACY_OUT_ID_WARNING_CODE ||
    legacyOutMapping?.preserve_original_as_provenance !== true
  ) {
    errors.push('legacy seat OutId mapping must match the package ingress translator');
  }
  if (plan.shapes?.dashboard_artifact?.canonical_join_type !== 'PartnerCode') {
    errors.push('dashboard artifact canonical_join_type must be PartnerCode');
  }
  if (plan.shapes?.dashboard_artifact?.canonical_wire_key !== 'partnerCode') {
    errors.push('dashboard artifact canonical_wire_key must be partnerCode');
  }
  if (plan.shapes?.dashboard_artifact?.artifact_embeds_colors !== false) {
    errors.push('dashboard artifact must not embed presentation colors');
  }

  const dashboardArtifactRef = String(plan.shapes?.dashboard_artifact?.path ?? '');
  const dashboardArtifactPath = resolvePath(
    REPO_ROOT,
    'public',
    dashboardArtifactRef.replace(/^\//, '')
  );
  if (dashboardArtifactRef !== PARTNER_DASHBOARD_ARTIFACT_REF) {
    errors.push('dashboard artifact path must match the package portal contract');
  }
  if (
    plan.plan?.status === 'implementation-ready' &&
    (!dashboardArtifactRef.startsWith('/registry/') ||
      !(await Bun.file(dashboardArtifactPath).exists()))
  ) {
    errors.push('implementation-ready plans require the canonical dashboard artifact to exist');
  }

  if (plan.surfaces?.portal?.target_consumer !== plan.shapes?.dashboard_artifact?.type) {
    errors.push('surfaces.portal.target_consumer must match the dashboard artifact type');
  }
  if ('consumer' in (plan.surfaces?.portal ?? {})) {
    errors.push('surfaces.portal.consumer is ambiguous; use target_consumer');
  }
  if (!portalConsumerContract) {
    errors.push('surfaces.portal.consumer_contract is required');
  } else {
    const requiredInputs = (portalConsumerContract.required_input_refs ?? []).map(String);
    const optionalInputs = (portalConsumerContract.optional_input_refs ?? []).map(String);
    const declaredInputs = [...requiredInputs, ...optionalInputs];
    const observedInputs = portalRegistryInputs(boardHtml);
    const observedCombined = [...observedInputs.required, ...observedInputs.optional];
    const consumerStatus = portalConsumerContract.implementation_status;
    const inputMode = portalConsumerContract.active_input_mode;
    if (
      portalConsumerContract.entrypoint_path !==
      PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.entrypointPath
    ) {
      errors.push('portal consumer contract entrypoint must be the partners board HTML');
    } else if (
      !(await Bun.file(resolvePath(REPO_ROOT, portalConsumerContract.entrypoint_path)).exists())
    ) {
      errors.push('portal consumer contract entrypoint does not exist');
    }
    if (!unique(declaredInputs)) {
      errors.push('portal consumer input refs must be unique and disjoint');
    }
    if (declaredInputs.some(inputRef => !inputRef.startsWith('/registry/'))) {
      errors.push('portal consumer input refs must use /registry/ paths');
    }
    if (portalConsumerContract.target_shape_ref !== 'shapes.dashboard_artifact') {
      errors.push('portal consumer target_shape_ref must be shapes.dashboard_artifact');
    }
    if (
      portalConsumerContract.target_input_mode !==
        PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.target.inputMode ||
      portalConsumerContract.retirement_condition !==
        PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.target.retirementCondition
    ) {
      errors.push(
        'portal consumer contract must declare the canonical one-artifact retirement shape'
      );
    }
    const transitionContract = PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.transition;
    const targetContract = PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.target;
    const currentCompatibilityContract =
      PARTNER_DASHBOARD_PORTAL_CONSUMER_CONTRACT.currentCompatibility;
    const currentFetchTransport = portalConsumerContract.current_fetch_transport as
      AnyRecord | undefined;
    const legacyComparison = portalConsumerContract.legacy_comparison as AnyRecord | undefined;
    const legacyComparisonRequired = (legacyComparison?.required_input_refs ?? []).map(String);
    const legacyComparisonOptional = (legacyComparison?.optional_input_refs ?? []).map(String);
    const legacyComparisonInputs = [...legacyComparisonRequired, ...legacyComparisonOptional];
    if (
      consumerStatus === currentCompatibilityContract.implementationStatus &&
      (portalConsumerContract.transition_implementation_status !==
        transitionContract.implementationStatus ||
        portalConsumerContract.transition_input_mode !== transitionContract.inputMode ||
        portalConsumerContract.canonical_input_ref !== transitionContract.canonicalInputRef ||
        portalConsumerContract.canonical_failure_policy !==
          transitionContract.canonicalFailurePolicy ||
        portalConsumerContract.automatic_legacy_fallback !==
          transitionContract.automaticLegacyFallback ||
        legacyComparison?.implementation_status !==
          transitionContract.legacyComparison.implementationStatus ||
        legacyComparison?.activation !== transitionContract.legacyComparison.activation ||
        legacyComparison?.search_param !== transitionContract.legacyComparison.searchParam ||
        legacyComparison?.search_value !== transitionContract.legacyComparison.searchValue ||
        legacyComparison?.load_order !== transitionContract.legacyComparison.loadOrder ||
        legacyComparison?.result_role !== transitionContract.legacyComparison.resultRole ||
        legacyComparison?.failure_policy !== transitionContract.legacyComparison.failurePolicy ||
        !sameMembers(
          legacyComparisonRequired,
          transitionContract.legacyComparison.requiredInputRefs
        ) ||
        !sameMembers(
          legacyComparisonOptional,
          transitionContract.legacyComparison.optionalInputRefs
        ) ||
        !unique(legacyComparisonInputs) ||
        legacyComparisonInputs.some(inputRef => !/^\/registry\/[^/].*\.json$/.test(inputRef)))
    ) {
      errors.push(
        'portal transition contract must require canonical input and explicit query-only legacy comparison'
      );
    }
    if (consumerStatus === currentCompatibilityContract.implementationStatus) {
      if (
        currentFetchTransport?.module_ref !==
          currentCompatibilityContract.fetchTransport.moduleRef ||
        currentFetchTransport?.export_name !==
          currentCompatibilityContract.fetchTransport.exportName ||
        currentFetchTransport?.default_timeout_ms !==
          currentCompatibilityContract.fetchTransport.defaultTimeoutMs ||
        currentFetchTransport?.content_type_diagnostic_policy !==
          currentCompatibilityContract.fetchTransport.contentTypeDiagnosticPolicy ||
        currentFetchTransport?.required_failure_policy !==
          currentCompatibilityContract.fetchTransport.requiredFailurePolicy ||
        currentFetchTransport?.optional_failure_policy !==
          currentCompatibilityContract.fetchTransport.optionalFailurePolicy ||
        !boardHtml.includes(
          `import { ${currentCompatibilityContract.fetchTransport.exportName} } from '${currentCompatibilityContract.fetchTransport.moduleRef}'`
        )
      ) {
        errors.push(
          'current-compatibility portal must use the shared structured JSON fetch transport'
        );
      }
      if (
        !sameMembers(observedInputs.required, requiredInputs) ||
        !sameMembers(observedInputs.optional, optionalInputs)
      ) {
        errors.push(
          `portal registry input map does not match HTML (required: ${observedInputs.required.join(', ')}; optional: ${observedInputs.optional.join(', ')})`
        );
      }
      if (
        !sameMembers(requiredInputs, PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_REQUIRED_INPUT_REFS) ||
        !sameMembers(optionalInputs, PARTNER_DASHBOARD_CURRENT_COMPATIBILITY_OPTIONAL_INPUT_REFS)
      ) {
        errors.push('portal current input refs must match the package consumer contract');
      }
      if (inputMode !== currentCompatibilityContract.inputMode) {
        errors.push('current-compatibility portal consumer must use legacy-multi-artifact mode');
      }
      if (observedCombined.includes(dashboardArtifactRef)) {
        errors.push('current-compatibility portal consumer must not claim the target artifact');
      }
    } else if (consumerStatus === 'implemented') {
      if (
        inputMode !== 'canonical-single-artifact' ||
        !sameMembers(requiredInputs, [dashboardArtifactRef]) ||
        optionalInputs.length > 0
      ) {
        errors.push('implemented portal consumer must load only the canonical dashboard artifact');
      }
      if (!(await Bun.file(dashboardArtifactPath).exists())) {
        errors.push(
          'implemented portal consumer requires the canonical dashboard artifact to exist'
        );
      }
      if (
        portalConsumerContract.transition_implementation_status !==
          targetContract.transitionPolicyStatus ||
        legacyComparison !== undefined
      ) {
        errors.push(
          'implemented portal consumer must retire transition policy and remove legacy comparison'
        );
      }
    } else {
      errors.push('portal consumer contract has invalid implementation_status');
    }
    if (plan.plan?.status === 'implementation-ready' && consumerStatus !== 'implemented') {
      errors.push('implementation-ready plans require the portal consumer to be implemented');
    }
  }

  if (!legacyCalendar) {
    errors.push('deprecation_calendar.legacy_ops is required');
  } else {
    const cutoffText = String(legacyCalendar.cutoff_date ?? '');
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(cutoffText);
    const cutoff = validDate ? Date.parse(`${cutoffText}T00:00:00Z`) : Number.NaN;
    if (!validDate || !Number.isFinite(cutoff)) {
      errors.push('deprecation_calendar.legacy_ops.cutoff_date must be YYYY-MM-DD');
    } else if (legacyStatus !== 'retired' && (options.now ?? new Date()).getTime() >= cutoff) {
      errors.push(
        `legacy-ops cutoff ${cutoffText} has passed; remove the adapter and update the artifact contract`
      );
    }
    if (!['active', 'retired'].includes(legacyStatus)) {
      errors.push('deprecation_calendar.legacy_ops.status must be active or retired');
    }
    if (legacyCalendar.check_cadence !== 'weekly') {
      errors.push('deprecation_calendar.legacy_ops.check_cadence must be weekly');
    }
    if (legacyCalendar.scheduled_enforcement_status !== 'required-not-yet-wired') {
      errors.push('legacy-ops scheduled enforcement must remain honest until a scheduler is wired');
    }
  }

  const expectedArtifactSchema =
    legacyStatus === 'retired'
      ? plan.shapes?.dashboard_artifact?.retired_legacy_schema
      : plan.shapes?.dashboard_artifact?.active_legacy_schema;
  if (plan.shapes?.dashboard_artifact?.schema !== expectedArtifactSchema) {
    errors.push(
      `dashboard artifact schema must be ${expectedArtifactSchema} for legacy status ${legacyStatus}`
    );
  }

  const termNames = terms.map(term => String(term.canonical));
  if (!unique(termNames)) errors.push('nomenclature canonical names must be unique');
  if (!sameMembers(termNames, Object.keys(EXPECTED_NOMENCLATURE))) {
    errors.push('nomenclature canonical term set does not match the MVP contract');
  }
  for (const term of terms) {
    const expected = EXPECTED_NOMENCLATURE[term.canonical];
    if (!expected) continue;
    if (!CONCEPT_DOMAINS.includes(term.owner_domain)) {
      errors.push(`nomenclature ${term.canonical} has invalid owner_domain ${term.owner_domain}`);
    }
    if (term.owner_domain !== expected.ownerDomain) {
      errors.push(`nomenclature ${term.canonical} owner_domain must be ${expected.ownerDomain}`);
    }
    if (expected.wirePath && term.wire_path !== expected.wirePath) {
      errors.push(`nomenclature ${term.canonical} wire_path must be ${expected.wirePath}`);
    }
    if (expected.wireShape && term.wire_shape !== expected.wireShape) {
      errors.push(`nomenclature ${term.canonical} wire_shape must be ${expected.wireShape}`);
    }
  }

  if (plan.theme?.source !== 'public/portal/theme.jsonc') {
    errors.push('theme.source must reference public/portal/theme.jsonc');
  }
  if (plan.theme?.resolver !== 'lib/portal/theme.ts') {
    errors.push('theme.resolver must reference lib/portal/theme.ts');
  }
  if (plan.theme?.generated_css !== 'public/portal/theme-tokens.css') {
    errors.push('theme.generated_css must reference public/portal/theme-tokens.css');
  }
  if (plan.theme?.version !== portalTheme.version) {
    errors.push(`theme.version must match portal theme ${portalTheme.version}`);
  }
  if (plan.theme?.default_scheme !== portalTheme.colorSchemeDefault) {
    errors.push(`theme.default_scheme must be ${portalTheme.colorSchemeDefault}`);
  }
  if (!sameMembers(plan.theme?.supported_schemes ?? [], ['dark', 'light'])) {
    errors.push('theme.supported_schemes must contain dark and light');
  }
  if (
    plan.theme?.allow_raw_color_literals !== false ||
    plan.theme?.color_is_not_status !== true ||
    plan.theme?.color_only_signal !== false
  ) {
    errors.push('theme policy booleans must preserve semantic, labeled, color-neutral facts');
  }
  for (const item of collectStrings(plan.theme)) {
    if (/#[0-9a-f]{3,8}|rgba?\(|hsla?\(/i.test(item.value)) {
      errors.push(`${item.path} contains a raw color literal`);
    }
  }
  for (const [role, token] of Object.entries(themeRoles)) {
    const prefixes = expectedThemePrefixes(role);
    if (!prefixes.length) {
      errors.push(`theme role ${role} has no declared role kind`);
    } else if (!prefixes.some(prefix => token.startsWith(prefix))) {
      errors.push(`theme role ${role} must resolve through ${prefixes.join(' or ')}`);
    }
    if (typeof resolveThemeToken(token) !== 'string') {
      errors.push(`theme role ${role} does not resolve: ${token}`);
    }
  }
  for (const item of collectStrings(plan.theme?.components ?? {}, 'theme.components')) {
    if (typeof resolveThemeToken(item.value) !== 'string') {
      errors.push(`${item.path} does not resolve: ${item.value}`);
    }
  }
  if (themeCss.trim() !== renderThemeTokensCss().trim()) {
    errors.push('public/portal/theme-tokens.css is stale versus theme.jsonc');
  }

  const bindingKeys = bindings.map(binding => String(binding.key));
  if (!unique(bindingKeys)) errors.push('concept binding keys must be unique');
  const bindingThemeByConcept = new Map<string, string>();
  for (const binding of bindings) {
    const id = String(binding.concept_id ?? '');
    const concept = concepts.get(id);
    if (!concept) {
      errors.push(`concept binding ${binding.key} references unknown concept ${id}`);
      continue;
    }
    if (concept.status !== 'active') {
      errors.push(`concept binding ${binding.key} references non-active concept ${id}`);
    }
    const actualDomain = String(concept.domain ?? inferDomain(id));
    if (binding.business_domain !== actualDomain) {
      errors.push(
        `concept binding ${binding.key} domain ${binding.business_domain} != ${actualDomain} for ${id}`
      );
    }
    if (binding.theme_role) {
      if (!themeRoles[binding.theme_role]) {
        errors.push(
          `concept binding ${binding.key} references unknown theme role ${binding.theme_role}`
        );
      }
      bindingThemeByConcept.set(id, binding.theme_role);
    }
  }

  const gapKeys = gaps.map(gap => String(gap.key));
  const gapCandidates = gaps.map(gap => String(gap.candidate_concept_id));
  if (!unique(gapKeys)) errors.push('concept gap keys must be unique');
  if (!unique(gapCandidates)) errors.push('concept gap candidate ids must be unique');
  if (
    !sameMembers(
      gapCandidates,
      PARTNER_DASHBOARD_SEMANTIC_GAPS.map(gap => gap.candidate_concept_id)
    )
  ) {
    errors.push('concept gaps must match the @factorywager/partners semantic-gap contract');
  }
  for (const gap of gaps) {
    const candidate = String(gap.candidate_concept_id ?? '');
    const expected = PARTNER_DASHBOARD_SEMANTIC_GAPS.find(
      item => item.candidate_concept_id === candidate
    );
    if (
      expected &&
      (gap.key !== expected.key || gap.business_domain !== expected.business_domain)
    ) {
      errors.push(`concept gap ${candidate} does not match its package key/domain mapping`);
    }
    if (concepts.has(candidate)) {
      errors.push(`concept gap ${gap.key} is stale because ${candidate} already exists`);
    }
    if (!CONCEPT_DOMAINS.includes(gap.business_domain)) {
      errors.push(`concept gap ${gap.key} has invalid business domain ${gap.business_domain}`);
    }
  }
  if (plan.plan?.status === 'implementation-ready' && gaps.length) {
    errors.push('implementation-ready plans cannot contain unresolved concept gaps');
  }
  const gapCandidateSet = new Set(gapCandidates);

  let profileCoverageEntries = 0;
  let missingProfileCoverage = 0;
  try {
    const coverage = parsePartnerProfileCoverageArtifact(partnerProfileCoverage);
    profileCoverageEntries = Object.keys(coverage.evidenceByPartnerCode).length;
    const requiredPartnerCodes = options.requiredPartnerCodes
      ? options.requiredPartnerCodes.map(parsePartnerCode)
      : parseLegacyPartnersOpsProjection(partnersOps).partners.map(partner => partner.partnerCode);
    const coverageResult = derivePartnerProfileCoverage(coverage, requiredPartnerCodes);
    missingProfileCoverage = coverageResult.missingCodes.length;
    if (plan.plan?.status === 'implementation-ready' && !coverageResult.complete) {
      errors.push(
        `implementation-ready plans require complete partner profile coverage; missing ${coverageResult.missingCodes.join(', ')}`
      );
    }
  } catch (error) {
    errors.push(
      `partner profile coverage artifact is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const allowedAxes = new Set(Object.keys(EXPECTED_AXES));
  for (const state of states) {
    if (!allowedAxes.has(state.axis)) {
      errors.push(`presentation references unknown axis ${state.axis}`);
    }
    if (!themeRoles[state.theme_role]) {
      errors.push(
        `presentation ${state.axis}.${state.value} references unknown theme role ${state.theme_role}`
      );
    }
    if (state.label_required !== true) {
      errors.push(`presentation ${state.axis}.${state.value} must require a text label`);
    }
    if (state.concept_id) {
      const concept = concepts.get(state.concept_id);
      if (!concept || concept.status !== 'active') {
        errors.push(
          `presentation ${state.axis}.${state.value} references unknown or non-active concept ${state.concept_id}`
        );
      } else if (Array.isArray(concept.values) && !concept.values.includes(state.value)) {
        errors.push(
          `presentation value ${state.value} is not declared by concept ${state.concept_id}`
        );
      }
      const bindingRole = bindingThemeByConcept.get(state.concept_id);
      if (bindingRole && bindingRole !== state.theme_role) {
        errors.push(
          `presentation ${state.axis}.${state.value} theme role ${state.theme_role} conflicts with concept binding ${bindingRole}`
        );
      }
    }
    if (state.proposed_concept_id && !gapCandidateSet.has(state.proposed_concept_id)) {
      errors.push(
        `presentation ${state.axis}.${state.value} references undeclared concept gap ${state.proposed_concept_id}`
      );
    }
  }
  for (const axis of Object.keys(EXPECTED_AXES) as Array<keyof typeof EXPECTED_AXES>) {
    checkExactAxis(errors, states, axis);
  }

  const expectedConnectorContracts = Object.entries(CONNECTOR_CONTRACTS).filter(
    ([id]) => legacyStatus !== 'retired' || id !== 'legacy-ops-registry'
  );
  const connectorIds = connectors.map(connector => String(connector.id));
  const snapshotKeys = connectors.map(connector => String(connector.snapshot_key));
  if (!unique(connectorIds)) errors.push('connector ids must be unique');
  if (!unique(snapshotKeys)) errors.push('connector snapshot keys must be unique');
  if (
    !sameMembers(
      connectorIds,
      expectedConnectorContracts.map(([id]) => id)
    )
  ) {
    errors.push(`connector ids do not match the ${legacyStatus} legacy contract`);
  }
  if (
    !sameMembers(
      snapshotKeys,
      expectedConnectorContracts.map(([, contract]) => contract.snapshotKey)
    )
  ) {
    errors.push(`connector snapshot keys do not match the ${legacyStatus} legacy contract`);
  }
  if (
    !sameSequence(plan.reconciliation?.profile_precedence, ['canonical-profile-config']) ||
    plan.reconciliation?.profile_coverage !==
      'all-four-current-codes-required-for-implementation-ready'
  ) {
    errors.push('reconciliation must separate canonical profile authority from coverage readiness');
  }
  for (const [field, expectedPrecedence] of [
    ['capacity_precedence', ['tennis-contract', 'sports-terminal']],
    ['communication_precedence', ['telegram-handshake']],
    ['finance_precedence', ['accounting-ledger']],
  ] as const) {
    if (!sameSequence(plan.reconciliation?.[field], expectedPrecedence)) {
      errors.push(`reconciliation ${field} must match executable connector authority in order`);
    }
  }
  for (const [key, precedence] of Object.entries(plan.reconciliation ?? {})) {
    if (!key.endsWith('_precedence') || !Array.isArray(precedence)) continue;
    if (!unique(precedence)) errors.push(`reconciliation ${key} contains duplicate connectors`);
    for (const connectorId of precedence) {
      if (!connectorIds.includes(connectorId)) {
        errors.push(`reconciliation ${key} references unknown connector ${connectorId}`);
      }
    }
  }

  const regionIds = regions.map(region => String(region.region_id));
  if (!unique(regionIds)) errors.push('portal region ids must be unique');
  for (const connector of connectors) {
    const expected = CONNECTOR_CONTRACTS[connector.id];
    if (!expected) continue;
    for (const [field, expectedValue] of [
      ['snapshot_key', expected.snapshotKey],
      ['required', expected.required],
      ['source_system_id', expected.sourceSystemId],
      ['port', expected.port],
      ['input_kind', expected.inputKind],
      ['input_ref', expected.inputRef],
      ['implementation_status', expected.implementationStatus],
    ] as const) {
      if (connector[field] !== expectedValue) {
        errors.push(`connector ${connector.id} ${field} must be ${String(expectedValue)}`);
      }
    }
    if (!CONCEPT_DOMAINS.includes(connector.source_owner_domain)) {
      errors.push(
        `connector ${connector.id} has invalid source_owner_domain ${connector.source_owner_domain}`
      );
    }
    if (!connector.adapter_id || !connector.adapter_version) {
      errors.push(`connector ${connector.id} requires separate adapter_id and adapter_version`);
    }
    if (
      connector.target_owner_package !== '@factorywager/partners' ||
      !String(connector.target_adapter_export ?? '').startsWith('./')
    ) {
      errors.push(
        `connector ${connector.id} must declare an honest partners target adapter export`
      );
    }
    if (!themeRoles[`group_${connector.visual_group}`]) {
      errors.push(`connector ${connector.id} has unmapped visual_group ${connector.visual_group}`);
    }
    if (!Array.isArray(connector.provides) || connector.provides.length === 0) {
      errors.push(`connector ${connector.id} must provide at least one fact kind`);
    }
    if (
      !Array.isArray(connector.authoritative_fact_paths) ||
      !sameMembers(connector.authoritative_fact_paths, expected.authoritativeFactPaths)
    ) {
      errors.push(
        `connector ${connector.id} authoritative_fact_paths must match the implemented v1 artifact contract`
      );
    }
    if (
      connector.id === 'canonical-profile-config' &&
      (connector.adapter_id !== 'canonical-profile-config' ||
        connector.target_adapter_export !== './adapters/profile' ||
        !sameMembers(connector.provides ?? [], ['identity', 'lifecycle', 'policy']))
    ) {
      errors.push('canonical-profile-config must remain the planned profile authority');
    }
    const observationTarget = {
      'telegram-handshake': './adapters/telegram-handshake',
      'limits-registry': './adapters/limit-changes',
      'tennis-contract': './adapters/tennis-capacity',
    }[String(connector.id)];
    if (
      observationTarget &&
      (connector.target_adapter_export !== observationTarget ||
        connector.target_adapter_implementation_status !== 'implemented')
    ) {
      errors.push(`connector ${connector.id} must target its implemented observation adapter`);
    }
    for (const regionId of connector.region_ids ?? []) {
      if (!regionIds.includes(regionId)) {
        errors.push(`connector ${connector.id} references unknown region ${regionId}`);
      }
    }
    if (connector.implementation_status === 'blocked') {
      if (connector.enabled !== false || !connector.blocking_reason) {
        errors.push(`blocked connector ${connector.id} must be disabled with a blocking reason`);
      }
      if (
        connector.id === 'sports-terminal' &&
        !SPORTS_TERMINAL_REQUIRED_BLOCKERS.every(blocker =>
          connector.blocking_reason.includes(blocker)
        )
      ) {
        errors.push('sports-terminal blocking reason must name every unresolved boundary');
      }
    } else if (connector.input_kind === 'registry-artifact') {
      const sourcePath = resolvePath(REPO_ROOT, 'public', connector.input_ref.replace(/^\//, ''));
      if (!(await Bun.file(sourcePath).exists())) {
        errors.push(
          `connector ${connector.id} registry input does not exist: ${connector.input_ref}`
        );
      }
    }
    if (connector.implementation_status === 'current-compatibility') {
      const modulePath = resolvePath(REPO_ROOT, connector.current_owner_module ?? '');
      if (!connector.current_owner_module || !(await Bun.file(modulePath).exists())) {
        errors.push(`connector ${connector.id} current_owner_module does not exist`);
      }
      if (connector.target_adapter_implementation_status !== 'implemented') {
        errors.push(`connector ${connector.id} target compatibility adapter must be implemented`);
      }
    }
  }
  if (
    plan.plan?.status === 'implementation-ready' &&
    connectors.some(connector => connector.implementation_status !== 'implemented')
  ) {
    errors.push('implementation-ready plans require every connector to be implemented');
  }

  const regionDomains = regions.flatMap(region => region.business_domains ?? []);
  for (const domain of regionDomains) {
    if (!CONCEPT_DOMAINS.includes(domain))
      errors.push(`region has invalid business domain ${domain}`);
  }
  const regionDomIds = regions.map(region => String(region.dom_id));
  if (!unique(regionDomIds)) errors.push('portal region DOM ids must be unique');
  for (const region of regions) {
    if (!themeRoles[region.theme_role]) {
      errors.push(`region ${region.region_id} references unknown theme role ${region.theme_role}`);
    }
    for (const id of region.concept_refs ?? []) {
      const concept = concepts.get(id);
      if (!concept || concept.status !== 'active') {
        errors.push(`region ${region.region_id} references unknown or non-active concept ${id}`);
      }
    }
    if (region.concept_status === 'proposed') {
      if (!region.proposed_concept_id || !gapCandidateSet.has(region.proposed_concept_id)) {
        errors.push(`proposed region ${region.region_id} must reference a declared concept gap`);
      }
    } else if (region.concept_status !== 'existing') {
      errors.push(`region ${region.region_id} has invalid concept_status ${region.concept_status}`);
    }
    for (const connectorId of region.connectors ?? []) {
      if (!connectorIds.includes(connectorId)) {
        errors.push(`region ${region.region_id} references unknown connector ${connectorId}`);
      }
      const connector = connectors.find(item => item.id === connectorId);
      if (connector && !connector.region_ids?.includes(region.region_id)) {
        errors.push(`region ${region.region_id} and connector ${connectorId} are not reciprocal`);
      }
    }
    if (region.implementation_status === 'current' && !htmlHasId(boardHtml, region.dom_id)) {
      errors.push(`current region ${region.region_id} DOM id does not exist: ${region.dom_id}`);
    }
    if (!['current', 'planned'].includes(region.implementation_status)) {
      errors.push(`region ${region.region_id} has invalid implementation_status`);
    }
    if (region.surface_kind === 'registered-section') {
      const matchingMount = sectionMounts.find(
        mount =>
          mount.anchor === region.route_anchor &&
          mount.dom_id === region.route_dom_id &&
          mount.target_region_id === region.region_id
      );
      if (!region.route_anchor || region.route_dom_id !== region.dom_id || !matchingMount) {
        errors.push(
          `registered region ${region.region_id} must map its route anchor and DOM id to a compatibility mount`
        );
      }
    }
  }
  for (const connector of connectors) {
    for (const regionId of connector.region_ids ?? []) {
      const region = regions.find(item => item.region_id === regionId);
      if (region && !region.connectors?.includes(connector.id)) {
        errors.push(`connector ${connector.id} and region ${regionId} are not reciprocal`);
      }
    }
  }

  const partnerSurface = (glossary.surfaces ?? []).find(
    (surface: AnyRecord) => surface.path === '/portal/partners/'
  );
  const expectedMounts = new Set(
    (partnerSurface?.sections ?? []).map(
      (mount: AnyRecord) => `${mount.hash}|${mount.domId}|${mount.conceptId}`
    )
  );
  const actualMounts = new Set(
    sectionMounts.map(mount => `${mount.anchor}|${mount.dom_id}|${mount.concept_id}`)
  );
  if (!unique(sectionMounts.map(mount => String(mount.anchor)))) {
    errors.push('section mount compatibility anchors must be unique');
  }
  for (const mount of expectedMounts) {
    if (!actualMounts.has(mount))
      errors.push(`missing section mount compatibility mapping ${mount}`);
  }
  for (const mount of actualMounts) {
    if (!expectedMounts.has(mount))
      errors.push(`unexpected section mount compatibility mapping ${mount}`);
  }
  for (const mount of sectionMounts) {
    if (!regionIds.includes(mount.target_region_id)) {
      errors.push(`section mount ${mount.anchor} targets unknown region ${mount.target_region_id}`);
    }
    if (!['preserve-render', 'alias-scroll', 'redirect'].includes(mount.compatibility_mode)) {
      errors.push(`section mount ${mount.anchor} has invalid compatibility_mode`);
    }
    if (!htmlHasId(boardHtml, mount.dom_id)) {
      errors.push(`section mount ${mount.anchor} DOM id does not exist: ${mount.dom_id}`);
    }
  }

  const expectedHashes = new Set(
    EXPECTED_HASH_ROUTES.map(
      route =>
        `${route.routeType}|${route.pattern}|${route.anchorKind}|${route.anchorTemplate}|${route.conceptId}`
    )
  );
  const actualHashes = new Set(
    hashRoutes.map(
      route =>
        `${route.route_type}|${route.pattern}|${route.anchor_kind}|${route.anchor_template}|${route.concept_id}`
    )
  );
  if (!unique(hashRoutes.map(route => String(route.route_type)))) {
    errors.push('partner hash route types must be unique');
  }
  if (!unique(hashRoutes.map(route => String(route.pattern)))) {
    errors.push('partner hash route patterns must be unique');
  }
  for (const route of expectedHashes) {
    if (!actualHashes.has(route))
      errors.push(`missing partner hash route compatibility mapping ${route}`);
  }
  for (const route of actualHashes) {
    if (!expectedHashes.has(route))
      errors.push(`unexpected partner hash route compatibility mapping ${route}`);
  }
  for (const route of hashRoutes) {
    const anchorTemplate = String(route.anchor_template ?? '');
    const anchorPrefix = anchorTemplate.split('{', 1)[0];
    if (route.anchor_kind === 'static') {
      if (!htmlHasId(boardHtml, anchorTemplate)) {
        errors.push(`static partner hash route anchor does not exist: ${anchorTemplate}`);
      }
    } else if (route.anchor_kind === 'template') {
      const rendersTemplateAnchor =
        boardHtml.includes(`id="${anchorPrefix}`) || boardHtml.includes(`id: \`${anchorPrefix}\${`);
      if (!anchorTemplate.includes('{') || !rendersTemplateAnchor) {
        errors.push(`template partner hash route anchor is not rendered: ${anchorTemplate}`);
      }
    } else {
      errors.push(`partner hash route ${route.route_type} has invalid anchor_kind`);
    }
  }

  if (legacyStatus === 'retired') {
    if (connectors.some(connector => connector.id === 'legacy-ops-registry')) {
      errors.push('retired legacy-ops contract must not retain the connector');
    }
    if (
      regions.some(region =>
        (region.connectors ?? []).some(
          (connectorKey: string) => connectorKey === 'legacy-ops-registry'
        )
      )
    ) {
      errors.push('retired legacy-ops contract must not retain region references');
    }
  }

  const consumedThemeRoles = new Set<string>([
    ...bindings.map(binding => binding.theme_role).filter(Boolean),
    ...states.map(state => state.theme_role).filter(Boolean),
    ...regions.map(region => region.theme_role).filter(Boolean),
    ...connectors.map(connector => `group_${connector.visual_group}`),
    ...(plan.theme?.foundational_roles ?? []),
  ]);
  for (const role of Object.keys(themeRoles)) {
    if (!consumedThemeRoles.has(role)) errors.push(`theme role ${role} is orphaned`);
  }

  return {
    errors,
    summary: {
      bindings: bindings.length,
      gaps: gaps.length,
      connectors: connectors.length,
      regions: regions.length,
      sectionMounts: sectionMounts.length,
      hashRoutes: hashRoutes.length,
      portalInputs:
        (portalConsumerContract?.required_input_refs ?? []).length +
        (portalConsumerContract?.optional_input_refs ?? []).length,
      portalRequiredInputs: (portalConsumerContract?.required_input_refs ?? []).length,
      portalOptionalInputs: (portalConsumerContract?.optional_input_refs ?? []).length,
      presentationStates: states.length,
      profileCoverageEntries,
      missingProfileCoverage,
    },
  };
}

export function listUnregisteredPartnerConcepts(plan: AnyRecord): UnregisteredPartnerConcept[] {
  const gaps = (plan.concepts?.gap ?? []) as AnyRecord[];
  return gaps
    .filter(gap =>
      PARTNER_DASHBOARD_SEMANTIC_GAPS.some(
        expected => expected.candidate_concept_id === gap.candidate_concept_id
      )
    )
    .map(gap => ({
      key: String(gap.key),
      candidate_concept_id: gap.candidate_concept_id as PartnerDashboardConceptGapId,
      business_domain: String(gap.business_domain),
      blocking: gap.blocking === true,
    }))
    .sort((left, right) => left.candidate_concept_id.localeCompare(right.candidate_concept_id));
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const showUnregistered = args.includes('--unregistered');
  const pathArg = args.find(arg => !arg.startsWith('--'));
  const path = pathArg ? resolvePath(process.cwd(), pathArg) : DEFAULT_PARTNER_DASHBOARD_PLAN;
  try {
    const plan = await loadPartnerDashboardPlan(path);
    const result = await validatePartnerDashboardPlan(plan);
    if (result.errors.length) {
      console.error(`❌ partner dashboard plan invalid (${result.errors.length} error(s))`);
      for (const error of result.errors) console.error(`  - ${error}`);
      process.exit(1);
    }
    if (showUnregistered) {
      const gaps = listUnregisteredPartnerConcepts(plan);
      console.info(`Unregistered partner concepts (${gaps.length}):`);
      for (const gap of gaps) {
        console.info(
          `${gap.candidate_concept_id}\t${gap.business_domain}\t${gap.key}\t${gap.blocking ? 'blocking' : 'non-blocking'}`
        );
      }
      process.exit(0);
    }
    const summary = result.summary;
    console.info(
      `✅ partner dashboard plan valid · ${summary.bindings} bindings · ${summary.gaps} gaps · ${summary.connectors} connectors · ${summary.regions} regions · ${summary.sectionMounts} section mounts · ${summary.hashRoutes} hash routes · ${summary.portalRequiredInputs} required + ${summary.portalOptionalInputs} optional portal inputs · ${summary.presentationStates} presentation states · ${summary.profileCoverageEntries} profile coverage entries · ${summary.missingProfileCoverage} missing`
    );
  } catch (error) {
    console.error(`❌ unable to validate partner dashboard plan: ${String(error)}`);
    process.exit(1);
  }
}

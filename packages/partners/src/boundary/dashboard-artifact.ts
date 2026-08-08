import {
  parseAttentionReasonCode,
  parseAdapterId,
  parseCanonicalOutIdentity,
  parseCurrencyCode,
  parseExternalAccountId,
  parseExternalPartnerId,
  parseLedgerEntryId,
  parsePartnerCallSign,
  parsePartnerCode,
  parseRailId,
  parseSportsbookId,
  parseSourceSystemId,
  parseTreeNodeId,
} from '../core/identifiers.ts';
import { evaluateConnectorFreshness } from '../core/connector-freshness.ts';
import {
  ATTENTION_SEVERITIES,
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  CONNECTOR_DATA_STATUSES,
  CONNECTOR_SNAPSHOT_REASON_CODES,
  CONNECTOR_SOURCE_MODES,
  OUT_FUNDING_STATUSES,
  OUT_OPERATIONAL_STATUSES,
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2,
  PARTNER_LIFECYCLE_STATES,
  PARTNER_OPERATIONAL_PHASES,
  PARTNER_SOURCE_CONFLICT_FIELD_PATHS,
  PROVENANCE_CONFIDENCE_VALUES,
  PROVENANCE_MAPPING_METHODS,
  PROVIDER_CONNECTION_STATUSES,
  type AccountScope,
  type BalancePosition,
  type ConnectorSnapshot,
  type FactProvenance,
  type MoneyAmount,
  type PartnerDashboardArtifact,
  type PartnerDashboardRecord,
} from '../core/types.ts';
import {
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  PARTNER_DASHBOARD_REQUIRED_CONNECTOR_KEYS,
} from '../dashboard-plan.ts';

type WireRecord = Record<string, unknown>;

function isRecord(value: unknown): value is WireRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonValue(value: unknown, path: string, ancestors = new WeakSet<object>()): void {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${path} must be JSON-safe`);
  if (ancestors.has(value)) throw new TypeError(`${path} must not contain a circular reference`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, ancestors));
  } else {
    if (!isRecord(value)) throw new TypeError(`${path} must be a plain JSON object`);
    for (const [key, item] of Object.entries(value)) {
      assertJsonValue(item, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

function assertRecord(value: unknown, path: string): asserts value is WireRecord {
  if (!isRecord(value)) throw new TypeError(`${path} must be an object`);
}

function assertExactKeys(value: WireRecord, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(value).filter(key => !allowedKeys.has(key));
  if (unexpected.length > 0) {
    throw new TypeError(`${path} contains unexpected field(s): ${unexpected.sort().join(', ')}`);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
}

function assertString(value: unknown, path: string, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${path} must be ${allowEmpty ? 'a' : 'a non-empty'} string`);
  }
}

function assertIsoTime(value: unknown, path: string): asserts value is string {
  assertString(value, path);
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${path} must be a canonical UTC ISO timestamp`);
  }
}

function assertEnum<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
  path: string
): asserts value is Values[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new TypeError(`${path} must be one of ${values.join('|')}`);
  }
}

function assertNonnegativeInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new TypeError(`${path} must be a non-negative safe integer`);
  }
}

function assertRatio(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${path} must be a finite ratio in [0,1]`);
  }
}

function assertMoneyAmount(value: unknown, path: string): asserts value is MoneyAmount {
  assertRecord(value, path);
  assertExactKeys(value, ['currency', 'minorUnits'], path);
  parseCurrencyCode(value.currency);
  if (!Number.isSafeInteger(value.minorUnits)) {
    throw new TypeError(`${path}.minorUnits must be a safe integer`);
  }
}

function assertFactProvenance(value: unknown, path: string): asserts value is FactProvenance {
  assertRecord(value, path);
  assertExactKeys(
    value,
    [
      'sourceSystemId',
      'sourceRecordRef',
      'adapterId',
      'adapterVersion',
      'observedAt',
      'originalValue',
      'mappingMethod',
      'confidence',
    ],
    path
  );
  parseSourceSystemId(value.sourceSystemId);
  parseAdapterId(value.adapterId);
  for (const field of ['adapterVersion', 'originalValue'] as const) {
    assertString(value[field], `${path}.${field}`);
  }
  if (value.sourceRecordRef !== undefined) {
    assertString(value.sourceRecordRef, `${path}.sourceRecordRef`);
  }
  assertIsoTime(value.observedAt, `${path}.observedAt`);
  assertEnum(value.mappingMethod, PROVENANCE_MAPPING_METHODS, `${path}.mappingMethod`);
  assertEnum(value.confidence, PROVENANCE_CONFIDENCE_VALUES, `${path}.confidence`);
}

function assertAccountScope(value: unknown, path: string): asserts value is AccountScope {
  assertRecord(value, path);
  if (value.kind === 'partner') {
    assertExactKeys(value, ['kind', 'partnerCode'], path);
    parsePartnerCode(value.partnerCode);
  } else if (value.kind === 'out') {
    assertExactKeys(value, ['kind', 'outId'], path);
    parseCanonicalOutIdentity(value.outId);
  } else if (value.kind === 'rail') {
    assertExactKeys(value, ['kind', 'railId'], path);
    parseRailId(value.railId);
  } else throw new TypeError(`${path}.kind must be partner|out|rail`);
}

function assertBalancePosition(value: unknown, path: string): asserts value is BalancePosition {
  assertRecord(value, path);
  assertExactKeys(value, ['accountScope', 'amount', 'effectiveAt'], path);
  assertAccountScope(value.accountScope, `${path}.accountScope`);
  assertMoneyAmount(value.amount, `${path}.amount`);
  assertIsoTime(value.effectiveAt, `${path}.effectiveAt`);
}

function assertPartnerAccountScope(
  scope: AccountScope,
  partnerCode: string,
  outIds: ReadonlySet<string>,
  path: string
): void {
  if (scope.kind === 'partner' && scope.partnerCode !== partnerCode) {
    throw new TypeError(`${path} must belong to partner ${partnerCode}`);
  }
  if (scope.kind === 'out') {
    const outIdentity = parseCanonicalOutIdentity(scope.outId);
    if (outIdentity.partnerCode !== partnerCode || !outIds.has(outIdentity.outId)) {
      throw new TypeError(`${path} must reference a registered out for partner ${partnerCode}`);
    }
  }
}

function assertConnectorSnapshot(
  value: unknown,
  key: (typeof PARTNER_CONNECTOR_SNAPSHOT_KEYS)[number],
  generatedAt: string,
  path: string
): asserts value is ConnectorSnapshot {
  assertRecord(value, path);
  assertExactKeys(
    value,
    [
      'dataStatus',
      'sourceMode',
      'reasonCode',
      'observedAt',
      'ageSeconds',
      'inputRef',
      'snapshotRef',
    ],
    path
  );
  assertEnum(value.dataStatus, CONNECTOR_DATA_STATUSES, `${path}.dataStatus`);
  assertEnum(value.sourceMode, CONNECTOR_SOURCE_MODES, `${path}.sourceMode`);
  assertEnum(value.reasonCode, CONNECTOR_SNAPSHOT_REASON_CODES, `${path}.reasonCode`);
  assertString(value.inputRef, `${path}.inputRef`, value.dataStatus === 'unavailable');
  if (value.sourceMode !== 'none' && value.observedAt === undefined) {
    throw new TypeError(`${path}.observedAt is required for ${value.sourceMode} data`);
  }
  if (value.observedAt !== undefined) assertIsoTime(value.observedAt, `${path}.observedAt`);
  if (value.ageSeconds !== undefined) {
    assertNonnegativeInteger(value.ageSeconds, `${path}.ageSeconds`);
  }
  if (value.snapshotRef !== undefined) assertString(value.snapshotRef, `${path}.snapshotRef`);

  const sourceMode = value.sourceMode;
  const observation =
    sourceMode === 'none' || value.observedAt === undefined
      ? undefined
      : {
          observedAt: value.observedAt,
          inputRef: value.inputRef,
          ...(value.snapshotRef === undefined ? {} : { snapshotRef: value.snapshotRef }),
        };
  const decision = evaluateConnectorFreshness({
    asOf: generatedAt,
    expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
    required: (PARTNER_DASHBOARD_REQUIRED_CONNECTOR_KEYS as readonly string[]).includes(key),
    ...(sourceMode === 'current' ? { current: observation } : {}),
    ...(sourceMode === 'last_known_good' ? { lastKnownGood: observation } : {}),
  });
  if (decision.disposition === 'fail_bake') {
    throw new TypeError(`${path} cannot represent ${decision.reasonCode}`);
  }
  for (const field of [
    'dataStatus',
    'sourceMode',
    'reasonCode',
    'observedAt',
    'ageSeconds',
    'inputRef',
    'snapshotRef',
  ] as const) {
    if (value[field] !== decision.snapshot[field]) {
      throw new TypeError(`${path}.${field} does not match computed connector freshness`);
    }
  }
}

function assertConflictValue(value: unknown, fieldPath: string, path: string): void {
  if (fieldPath === 'partners[].lifecycle.state') {
    assertEnum(value, PARTNER_LIFECYCLE_STATES, path);
  } else if (fieldPath === 'partners[].outs[].sportsbookId') {
    parseSportsbookId(value);
  } else if (fieldPath === 'partners[].outs[].operationalStatus') {
    assertEnum(value, OUT_OPERATIONAL_STATUSES, path);
  } else if (fieldPath === 'partners[].outs[].fundingStatus') {
    assertEnum(value, OUT_FUNDING_STATUSES, path);
  } else if (fieldPath === 'partners[].outs[].providerConnectionStatus') {
    assertEnum(value, PROVIDER_CONNECTION_STATUSES, path);
  } else if (fieldPath === 'partners[].outs[].observedMaxStake.amount.currency') {
    parseCurrencyCode(value);
  } else if (fieldPath === 'partners[].outs[].observedMaxStake.amount.minorUnits') {
    assertNonnegativeInteger(value, path);
  } else if (fieldPath === 'partners[].outs[].limitCoverageRatio') {
    assertRatio(value, path);
  } else {
    throw new TypeError(`${path} has an unregistered conflict field path`);
  }
}

function assertStringArray(value: unknown, path: string): asserts value is string[] {
  assertArray(value, path);
  const seen = new Set<string>();
  for (const [index, item] of value.entries()) {
    assertString(item, `${path}[${index}]`);
    if (seen.has(item)) throw new TypeError(`${path} must not contain duplicates`);
    seen.add(item);
  }
}

function assertPartnerRecord(
  value: unknown,
  path: string
): asserts value is PartnerDashboardRecord {
  assertRecord(value, path);
  assertExactKeys(
    value,
    [
      'partnerCode',
      'callSign',
      'lifecycle',
      'operationalPhase',
      'identity',
      'outs',
      'accounting',
      'communication',
      'limits',
      'integrations',
      'attention',
    ],
    path
  );
  const partnerCode = parsePartnerCode(value.partnerCode);
  parsePartnerCallSign(value.callSign, partnerCode);
  assertRecord(value.lifecycle, `${path}.lifecycle`);
  assertExactKeys(value.lifecycle, ['state', 'effectiveAt', 'provenance'], `${path}.lifecycle`);
  assertEnum(value.lifecycle.state, PARTNER_LIFECYCLE_STATES, `${path}.lifecycle.state`);
  assertIsoTime(value.lifecycle.effectiveAt, `${path}.lifecycle.effectiveAt`);
  assertFactProvenance(value.lifecycle.provenance, `${path}.lifecycle.provenance`);
  assertEnum(value.operationalPhase, PARTNER_OPERATIONAL_PHASES, `${path}.operationalPhase`);

  assertRecord(value.identity, `${path}.identity`);
  assertExactKeys(
    value.identity,
    ['treeNodeId', 'profileSourceSystemId', 'externalPartnerRefs'],
    `${path}.identity`
  );
  parseSourceSystemId(value.identity.profileSourceSystemId);
  if (value.identity.treeNodeId !== undefined) parseTreeNodeId(value.identity.treeNodeId);
  assertArray(value.identity.externalPartnerRefs, `${path}.identity.externalPartnerRefs`);
  for (const [index, ref] of value.identity.externalPartnerRefs.entries()) {
    assertRecord(ref, `${path}.identity.externalPartnerRefs[${index}]`);
    assertExactKeys(
      ref,
      ['sourceSystemId', 'externalId'],
      `${path}.identity.externalPartnerRefs[${index}]`
    );
    parseSourceSystemId(ref.sourceSystemId);
    parseExternalPartnerId(ref.externalId);
  }

  assertArray(value.outs, `${path}.outs`);
  const outIds = new Set<string>();
  for (const [index, out] of value.outs.entries()) {
    const outPath = `${path}.outs[${index}]`;
    assertRecord(out, outPath);
    assertExactKeys(
      out,
      [
        'outId',
        'sportsbookId',
        'operationalStatus',
        'fundingStatus',
        'providerConnectionStatus',
        'externalAccountRefs',
        'observedMaxStake',
        'limitCoverageRatio',
      ],
      outPath
    );
    const identity = parseCanonicalOutIdentity(out.outId);
    if (identity.partnerCode !== partnerCode) {
      throw new TypeError(`${outPath}.outId must belong to ${partnerCode}`);
    }
    if (outIds.has(identity.outId)) throw new TypeError(`${path}.outs contains duplicate OutId`);
    outIds.add(identity.outId);
    parseSportsbookId(out.sportsbookId);
    assertEnum(out.operationalStatus, OUT_OPERATIONAL_STATUSES, `${outPath}.operationalStatus`);
    assertEnum(out.fundingStatus, OUT_FUNDING_STATUSES, `${outPath}.fundingStatus`);
    if (out.providerConnectionStatus !== undefined) {
      assertEnum(
        out.providerConnectionStatus,
        PROVIDER_CONNECTION_STATUSES,
        `${outPath}.providerConnectionStatus`
      );
    }
    assertArray(out.externalAccountRefs, `${outPath}.externalAccountRefs`);
    for (const [refIndex, ref] of out.externalAccountRefs.entries()) {
      assertRecord(ref, `${outPath}.externalAccountRefs[${refIndex}]`);
      assertExactKeys(
        ref,
        ['sourceSystemId', 'externalId'],
        `${outPath}.externalAccountRefs[${refIndex}]`
      );
      parseSourceSystemId(ref.sourceSystemId);
      parseExternalAccountId(ref.externalId);
    }
    if (out.observedMaxStake !== undefined) {
      assertRecord(out.observedMaxStake, `${outPath}.observedMaxStake`);
      assertExactKeys(
        out.observedMaxStake,
        ['amount', 'provenance'],
        `${outPath}.observedMaxStake`
      );
      assertMoneyAmount(out.observedMaxStake.amount, `${outPath}.observedMaxStake.amount`);
      assertFactProvenance(
        out.observedMaxStake.provenance,
        `${outPath}.observedMaxStake.provenance`
      );
    }
    if (out.limitCoverageRatio !== undefined) {
      assertRatio(out.limitCoverageRatio, `${outPath}.limitCoverageRatio`);
    }
  }

  assertRecord(value.accounting, `${path}.accounting`);
  assertExactKeys(value.accounting, ['balancePositions', 'recentEntries'], `${path}.accounting`);
  assertArray(value.accounting.balancePositions, `${path}.accounting.balancePositions`);
  value.accounting.balancePositions.forEach((position, index) => {
    const positionPath = `${path}.accounting.balancePositions[${index}]`;
    assertBalancePosition(position, positionPath);
    assertPartnerAccountScope(
      position.accountScope,
      partnerCode,
      outIds,
      `${positionPath}.accountScope`
    );
  });
  assertArray(value.accounting.recentEntries, `${path}.accounting.recentEntries`);
  for (const [index, entry] of value.accounting.recentEntries.entries()) {
    const entryPath = `${path}.accounting.recentEntries[${index}]`;
    assertRecord(entry, entryPath);
    assertExactKeys(
      entry,
      ['id', 'entryType', 'amount', 'balanceAfter', 'accountScope', 'postedAt', 'proofRef'],
      entryPath
    );
    parseLedgerEntryId(entry.id);
    assertString(entry.entryType, `${entryPath}.entryType`);
    assertMoneyAmount(entry.amount, `${entryPath}.amount`);
    if (entry.balanceAfter !== undefined) {
      assertMoneyAmount(entry.balanceAfter, `${entryPath}.balanceAfter`);
    }
    assertAccountScope(entry.accountScope, `${entryPath}.accountScope`);
    assertPartnerAccountScope(entry.accountScope, partnerCode, outIds, `${entryPath}.accountScope`);
    assertIsoTime(entry.postedAt, `${entryPath}.postedAt`);
    if (entry.proofRef !== undefined) assertString(entry.proofRef, `${entryPath}.proofRef`);
  }

  assertRecord(value.communication, `${path}.communication`);
  assertExactKeys(
    value.communication,
    ['chatLinked', 'handshakeStatus', 'membershipCount', 'configuredTopicKeys'],
    `${path}.communication`
  );
  if (typeof value.communication.chatLinked !== 'boolean') {
    throw new TypeError(`${path}.communication.chatLinked must be boolean`);
  }
  assertString(value.communication.handshakeStatus, `${path}.communication.handshakeStatus`);
  if (value.communication.membershipCount !== undefined) {
    assertNonnegativeInteger(
      value.communication.membershipCount,
      `${path}.communication.membershipCount`
    );
  }
  assertStringArray(
    value.communication.configuredTopicKeys,
    `${path}.communication.configuredTopicKeys`
  );

  assertRecord(value.limits, `${path}.limits`);
  assertExactKeys(value.limits, ['tracked', 'missing', 'coverageRatio'], `${path}.limits`);
  assertNonnegativeInteger(value.limits.tracked, `${path}.limits.tracked`);
  assertNonnegativeInteger(value.limits.missing, `${path}.limits.missing`);
  assertRatio(value.limits.coverageRatio, `${path}.limits.coverageRatio`);
  const totalLimits = value.limits.tracked + value.limits.missing;
  const expectedCoverage = totalLimits === 0 ? 0 : value.limits.tracked / totalLimits;
  if (Math.abs(value.limits.coverageRatio - expectedCoverage) > Number.EPSILON) {
    throw new TypeError(`${path}.limits.coverageRatio does not match tracked and missing counts`);
  }

  assertRecord(value.integrations, `${path}.integrations`);
  assertExactKeys(value.integrations, ['tennis', 'sportsTerminal'], `${path}.integrations`);
  for (const integration of ['tennis', 'sportsTerminal'] as const) {
    const integrationStatus: unknown = value.integrations[integration];
    if (integrationStatus === undefined) continue;
    assertRecord(integrationStatus, `${path}.integrations.${integration}`);
    assertExactKeys(
      integrationStatus,
      ['dataStatus', 'observedAt'],
      `${path}.integrations.${integration}`
    );
    assertEnum(
      integrationStatus.dataStatus,
      CONNECTOR_DATA_STATUSES,
      `${path}.integrations.${integration}.dataStatus`
    );
    if (
      integrationStatus.dataStatus !== 'unavailable' &&
      integrationStatus.observedAt === undefined
    ) {
      throw new TypeError(
        `${path}.integrations.${integration}.observedAt is required for ${integrationStatus.dataStatus} data`
      );
    }
    if (integrationStatus.observedAt !== undefined) {
      assertIsoTime(integrationStatus.observedAt, `${path}.integrations.${integration}.observedAt`);
    }
  }

  assertArray(value.attention, `${path}.attention`);
  for (const [index, item] of value.attention.entries()) {
    const itemPath = `${path}.attention[${index}]`;
    assertRecord(item, itemPath);
    assertExactKeys(
      item,
      ['reasonCode', 'severity', 'label', 'actionHref', 'actionCommand'],
      itemPath
    );
    parseAttentionReasonCode(item.reasonCode);
    assertEnum(item.severity, ATTENTION_SEVERITIES, `${itemPath}.severity`);
    assertString(item.label, `${itemPath}.label`);
    if (item.actionHref !== undefined) assertString(item.actionHref, `${itemPath}.actionHref`);
    if (item.actionCommand !== undefined) {
      assertString(item.actionCommand, `${itemPath}.actionCommand`);
    }
  }
}

function rejectPresentationKeys(value: unknown, path = 'artifact'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectPresentationKeys(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (['color', 'colors', 'theme', 'themeRole', 'theme_role'].includes(key)) {
      throw new TypeError(`${path}.${key} is presentation data and is forbidden in the artifact`);
    }
    rejectPresentationKeys(item, `${path}.${key}`);
  }
}

export function parsePartnerDashboardArtifact(value: unknown): PartnerDashboardArtifact {
  assertJsonValue(value, 'artifact');
  rejectPresentationKeys(value);
  assertRecord(value, 'artifact');
  assertExactKeys(
    value,
    [
      'schema',
      'generatedAt',
      'connectorSnapshots',
      'activeOutIds',
      'summary',
      'conflicts',
      'partners',
    ],
    'artifact'
  );
  if (value.schema !== PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2) {
    throw new TypeError(`artifact.schema must be ${PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2}`);
  }
  assertIsoTime(value.generatedAt, 'artifact.generatedAt');
  assertRecord(value.connectorSnapshots, 'artifact.connectorSnapshots');
  const snapshotKeys = Object.keys(value.connectorSnapshots).sort();
  const expectedSnapshotKeys = [...PARTNER_CONNECTOR_SNAPSHOT_KEYS].sort();
  if (JSON.stringify(snapshotKeys) !== JSON.stringify(expectedSnapshotKeys)) {
    throw new TypeError('artifact.connectorSnapshots must contain the exact v1 connector key set');
  }
  for (const key of PARTNER_CONNECTOR_SNAPSHOT_KEYS) {
    assertConnectorSnapshot(
      value.connectorSnapshots[key],
      key,
      value.generatedAt,
      `artifact.connectorSnapshots.${key}`
    );
  }

  assertArray(value.partners, 'artifact.partners');
  const partnerCodes = new Set<string>();
  const outIds = new Set<string>();
  const outOperationalStatuses = new Map<string, string>();
  value.partners.forEach((partner, index) => {
    assertPartnerRecord(partner, `artifact.partners[${index}]`);
    if (partnerCodes.has(partner.partnerCode)) {
      throw new TypeError('artifact.partners contains duplicate PartnerCode');
    }
    partnerCodes.add(partner.partnerCode);
    for (const out of partner.outs) {
      if (outIds.has(out.outId)) throw new TypeError('artifact contains duplicate OutId');
      outIds.add(out.outId);
      outOperationalStatuses.set(out.outId, out.operationalStatus);
    }
  });
  const partners = value.partners as PartnerDashboardRecord[];

  assertArray(value.activeOutIds, 'artifact.activeOutIds');
  const activeOutIds = new Set<string>();
  for (const [index, rawOutId] of value.activeOutIds.entries()) {
    const outId = parseCanonicalOutIdentity(rawOutId).outId;
    if (activeOutIds.has(outId)) {
      throw new TypeError('artifact.activeOutIds must not contain duplicates');
    }
    if (!outIds.has(outId)) {
      throw new TypeError(`artifact.activeOutIds[${index}] is not a registered OutId`);
    }
    if (outOperationalStatuses.get(outId) !== 'ready') {
      throw new TypeError(`artifact.activeOutIds[${index}] must reference a ready OutId`);
    }
    activeOutIds.add(outId);
  }

  const externalPartnerRefs = new Set<string>();
  const externalAccountRefs = new Set<string>();
  const ledgerEntryIds = new Set<string>();
  const treeNodeIds = new Set<string>();
  for (const partner of partners) {
    const hasCanonicalProfile =
      partner.identity.profileSourceSystemId === CANONICAL_PROFILE_SOURCE_SYSTEM_ID;
    if (
      !hasCanonicalProfile &&
      !partner.attention.some(item => item.reasonCode === 'partner.profile.migration_required')
    ) {
      throw new TypeError(
        `artifact partner ${partner.partnerCode} requires partner.profile.migration_required attention`
      );
    }
    if (partner.identity.treeNodeId !== undefined) {
      if (treeNodeIds.has(partner.identity.treeNodeId)) {
        throw new TypeError('artifact contains duplicate TreeNodeId');
      }
      treeNodeIds.add(partner.identity.treeNodeId);
    }
    for (const ref of partner.identity.externalPartnerRefs) {
      const key = `${ref.sourceSystemId}\u0000${ref.externalId}`;
      if (externalPartnerRefs.has(key)) {
        throw new TypeError('artifact contains duplicate ExternalPartnerRef');
      }
      externalPartnerRefs.add(key);
    }
    for (const out of partner.outs) {
      for (const ref of out.externalAccountRefs) {
        const key = `${ref.sourceSystemId}\u0000${ref.externalId}`;
        if (externalAccountRefs.has(key)) {
          throw new TypeError('artifact contains duplicate ExternalAccountRef');
        }
        externalAccountRefs.add(key);
      }
    }
    for (const entry of partner.accounting.recentEntries) {
      if (ledgerEntryIds.has(entry.id))
        throw new TypeError('artifact contains duplicate LedgerEntryId');
      ledgerEntryIds.add(entry.id);
    }
  }

  assertArray(value.conflicts, 'artifact.conflicts');
  for (const [index, conflict] of value.conflicts.entries()) {
    const conflictPath = `artifact.conflicts[${index}]`;
    assertRecord(conflict, conflictPath);
    assertExactKeys(conflict, ['partnerCode', 'fieldPath', 'adapterIds', 'values'], conflictPath);
    const code = parsePartnerCode(conflict.partnerCode);
    if (!partnerCodes.has(code)) throw new TypeError(`${conflictPath}.partnerCode is not present`);
    assertEnum(
      conflict.fieldPath,
      PARTNER_SOURCE_CONFLICT_FIELD_PATHS,
      `${conflictPath}.fieldPath`
    );
    assertStringArray(conflict.adapterIds, `${conflictPath}.adapterIds`);
    conflict.adapterIds.forEach(adapterId => parseAdapterId(adapterId));
    assertArray(conflict.values, `${conflictPath}.values`);
    for (const [valueIndex, conflictValue] of conflict.values.entries()) {
      if (
        conflictValue !== null &&
        typeof conflictValue !== 'string' &&
        typeof conflictValue !== 'number' &&
        typeof conflictValue !== 'boolean'
      ) {
        throw new TypeError(`${conflictPath}.values[${valueIndex}] must be a JSON scalar`);
      }
      assertConflictValue(
        conflictValue,
        conflict.fieldPath,
        `${conflictPath}.values[${valueIndex}]`
      );
    }
    if (conflict.adapterIds.length < 2 || conflict.values.length !== conflict.adapterIds.length) {
      throw new TypeError(`${conflictPath} must describe two or more aligned source values`);
    }
    const distinctValues = new Set(
      conflict.values.map(item => `${item === null ? 'null' : typeof item}:${String(item)}`)
    );
    if (distinctValues.size < 2) {
      throw new TypeError(`${conflictPath} must contain two or more distinct normalized values`);
    }
  }

  assertRecord(value.summary, 'artifact.summary');
  assertExactKeys(
    value.summary,
    [
      'partnerCount',
      'canonicalProfileCount',
      'operatorReadyPartnerCount',
      'attentionPartnerCount',
      'registeredOutCount',
      'activeOutCount',
      'balancePositions',
    ],
    'artifact.summary'
  );
  for (const field of [
    'partnerCount',
    'canonicalProfileCount',
    'operatorReadyPartnerCount',
    'attentionPartnerCount',
    'registeredOutCount',
    'activeOutCount',
  ] as const) {
    assertNonnegativeInteger(value.summary[field], `artifact.summary.${field}`);
  }
  assertArray(value.summary.balancePositions, 'artifact.summary.balancePositions');
  value.summary.balancePositions.forEach((position, index) =>
    assertBalancePosition(position, `artifact.summary.balancePositions[${index}]`)
  );
  const summary = value.summary as PartnerDashboardArtifact['summary'];

  const expectedBalancePositions = partners.flatMap(partner => partner.accounting.balancePositions);
  const expectedCounts = {
    partnerCount: partners.length,
    canonicalProfileCount: partners.filter(
      partner => partner.identity.profileSourceSystemId === CANONICAL_PROFILE_SOURCE_SYSTEM_ID
    ).length,
    operatorReadyPartnerCount: partners.filter(
      partner => partner.operationalPhase === 'operator_ready'
    ).length,
    attentionPartnerCount: partners.filter(partner => partner.attention.length > 0).length,
    registeredOutCount: partners.reduce((count, partner) => count + partner.outs.length, 0),
    activeOutCount: activeOutIds.size,
  };
  for (const [field, expected] of Object.entries(expectedCounts)) {
    if (summary[field as keyof typeof expectedCounts] !== expected) {
      throw new TypeError(`artifact.summary.${field} does not match partner records`);
    }
  }
  if (JSON.stringify(summary.balancePositions) !== JSON.stringify(expectedBalancePositions)) {
    throw new TypeError('artifact.summary.balancePositions must match partner balance positions');
  }
  return value as PartnerDashboardArtifact;
}

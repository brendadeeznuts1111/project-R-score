/**
 * Sports Terminal integration-health adapter (IntegrationHealthReadPort).
 *
 * Exact public/redacted input only — no ST producer imports, no float money.
 * Resolves ST external partner IDs to PartnerCode via explicit map + per-row
 * ExternalPartnerRef. Dashboard authority is integration health status, never
 * a second profile store or floating-point balances.
 *
 * @see docs/design/partner-dashboard-mvp.toml connector sports-terminal
 * @see docs/design/partner-type-reference-map.md Sports Terminal cutover
 */
import {
  parseAdapterId,
  parseExternalPartnerId,
  parsePartnerCallSign,
  parsePartnerCode,
  parseSourceSystemId,
} from '../core/identifiers.ts';
import type {
  ConnectorDataStatus,
  ExternalPartnerId,
  ExternalPartnerRef,
  FactProvenance,
  PartnerCallSign,
  PartnerCode,
} from '../core/types.ts';
import { wireArray, wireNonnegativeInteger, wireRecord, wireText, wireTimestamp } from './wire.ts';

export const SPORTS_TERMINAL_HEALTH_SCHEMA =
  'factorywager.sports-terminal-integration-health.v1' as const;
export const SPORTS_TERMINAL_HEALTH_KIND = 'sports-terminal-integration-health' as const;
export const SPORTS_TERMINAL_HEALTH_SCHEMA_VERSION = 1 as const;
export const SPORTS_TERMINAL_SOURCE_SYSTEM_ID = parseSourceSystemId('sports-terminal');
export const SPORTS_TERMINAL_ADAPTER_ID = parseAdapterId('sports-terminal');
export const SPORTS_TERMINAL_ADAPTER_VERSION = '2' as const;
export const SPORTS_TERMINAL_RUNTIME = 'https://sports-terminal.factory-wager.com' as const;
export const SPORTS_TERMINAL_HEALTH_CONTRACT_PATH =
  `${SPORTS_TERMINAL_RUNTIME}/api/v1/partners/integration-health` as const;
export const SPORTS_TERMINAL_INPUT_REF =
  '/registry/sports-terminal/partner-integration-health.json' as const;
export const SPORTS_TERMINAL_MONEY_POLICY = 'integer-minor-units-only' as const;

export const SPORTS_TERMINAL_OVERALL_STATUSES = [
  'healthy',
  'degraded',
  'unhealthy',
  'unknown',
] as const;
export type SportsTerminalOverallStatus = (typeof SPORTS_TERMINAL_OVERALL_STATUSES)[number];

export const SPORTS_TERMINAL_SOURCE_MODES = ['live', 'offline-join', 'fixture', 'empty'] as const;
export type SportsTerminalSourceMode = (typeof SPORTS_TERMINAL_SOURCE_MODES)[number];

export type SportsTerminalIntegrationObservation = {
  partnerCode: PartnerCode;
  callSign: PartnerCallSign;
  externalPartnerRef: ExternalPartnerRef;
  overall: SportsTerminalOverallStatus;
  sourceCount: number;
  healthyCount: number;
  /** Optional integer minor-unit stake ceiling when the wire carries money. */
  maxStakeMinorUnits?: number;
  observedAt: string;
  provenance: FactProvenance;
};

export type SportsTerminalIntegrationProjection = {
  source: SportsTerminalSourceMode;
  moneyPolicy: typeof SPORTS_TERMINAL_MONEY_POLICY;
  observations: SportsTerminalIntegrationObservation[];
  /** External IDs present on the wire that could not resolve to a PartnerCode. */
  unresolvedExternalIds: string[];
};

function isOverall(value: string): value is SportsTerminalOverallStatus {
  return (SPORTS_TERMINAL_OVERALL_STATUSES as readonly string[]).includes(value);
}

function isSourceMode(value: string): value is SportsTerminalSourceMode {
  return (SPORTS_TERMINAL_SOURCE_MODES as readonly string[]).includes(value);
}

function dataStatusFromOverall(overall: SportsTerminalOverallStatus): ConnectorDataStatus {
  if (overall === 'healthy') return 'ok';
  if (overall === 'degraded') return 'stale';
  if (overall === 'unhealthy') return 'error';
  return 'unavailable';
}

/** Map observation overall status → connector dataStatus for integrations.sportsTerminal. */
export function sportsTerminalDataStatus(
  overall: SportsTerminalOverallStatus
): ConnectorDataStatus {
  return dataStatusFromOverall(overall);
}

function proof(
  observedAt: string,
  externalId: ExternalPartnerId,
  originalValue: string
): FactProvenance {
  return {
    sourceSystemId: SPORTS_TERMINAL_SOURCE_SYSTEM_ID,
    sourceRecordRef: `integration-health:${externalId}`,
    adapterId: SPORTS_TERMINAL_ADAPTER_ID,
    adapterVersion: SPORTS_TERMINAL_ADAPTER_VERSION,
    observedAt,
    originalValue,
    mappingMethod: 'identity',
    confidence: 'exact',
  };
}

/**
 * Reject known float-money keys so the dashboard never inherits ST's
 * currentBalance / maxStake / dailyLimit dollar floats.
 */
function assertNoFloatMoney(record: Record<string, unknown>, path: string): void {
  const banned = [
    'currentBalance',
    'currentLimit',
    'dailyUsed',
    'totalDeposited',
    'totalWithdrawn',
    'totalSettledPnl',
    'maxStake',
    'dailyLimit',
    'suggestedStake',
    'adjustedStake',
    'amount',
    'balance',
  ] as const;
  for (const key of banned) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value === 'number' && !Number.isInteger(value)) {
      throw new TypeError(
        `${path}.${key} must not be a floating-point money amount (integer minor units only)`
      );
    }
    // Bare float-looking major-unit money keys are forbidden even when integer-valued
    // (e.g. maxStake: 100 dollars) — use maxStakeMinorUnits instead.
    if (
      key === 'maxStake' ||
      key === 'dailyLimit' ||
      key === 'currentBalance' ||
      key === 'currentLimit' ||
      key === 'dailyUsed' ||
      key === 'totalDeposited' ||
      key === 'totalWithdrawn' ||
      key === 'totalSettledPnl' ||
      key === 'suggestedStake' ||
      key === 'adjustedStake'
    ) {
      throw new TypeError(
        `${path}.${key} is not allowed on the integration-health wire; use integer minor-unit fields or omit money`
      );
    }
  }
}

/**
 * Parse the public Sports Terminal integration-health artifact.
 * Pure — no I/O, no ST package imports.
 */
export function parseSportsTerminalIntegrationHealth(
  value: unknown
): SportsTerminalIntegrationProjection {
  const root = wireRecord(value, 'sportsTerminal');
  if (root.schema !== SPORTS_TERMINAL_HEALTH_SCHEMA) {
    throw new TypeError(`sportsTerminal.schema must be ${SPORTS_TERMINAL_HEALTH_SCHEMA}`);
  }
  if (root.kind !== SPORTS_TERMINAL_HEALTH_KIND) {
    throw new TypeError(`sportsTerminal.kind must be ${SPORTS_TERMINAL_HEALTH_KIND}`);
  }
  if (root.schemaVersion !== SPORTS_TERMINAL_HEALTH_SCHEMA_VERSION) {
    throw new TypeError('sportsTerminal.schemaVersion must be 1');
  }
  if (root.runtimeUrl !== SPORTS_TERMINAL_RUNTIME) {
    throw new TypeError(`sportsTerminal.runtimeUrl must be ${SPORTS_TERMINAL_RUNTIME}`);
  }
  if (root.moneyPolicy !== SPORTS_TERMINAL_MONEY_POLICY) {
    throw new TypeError(`sportsTerminal.moneyPolicy must be ${SPORTS_TERMINAL_MONEY_POLICY}`);
  }
  const observedAt = wireTimestamp(root.generatedAt, 'sportsTerminal.generatedAt');
  const source = wireText(root.source, 'sportsTerminal.source');
  if (!isSourceMode(source)) {
    throw new TypeError('sportsTerminal.source must be live|offline-join|fixture|empty');
  }
  const contracts = wireRecord(root.contractPaths, 'sportsTerminal.contractPaths');
  if (contracts.integrationHealth !== SPORTS_TERMINAL_HEALTH_CONTRACT_PATH) {
    throw new TypeError(
      'sportsTerminal.contractPaths.integrationHealth must target authenticated v1 integration-health'
    );
  }

  // Explicit external-ID → PartnerCode resolution map (required when partners present).
  const externalIdMapRaw = wireRecord(root.externalIdMap ?? {}, 'sportsTerminal.externalIdMap');
  const externalIdMap = new Map<string, PartnerCode>();
  for (const [externalId, codeRaw] of Object.entries(externalIdMapRaw)) {
    if (!externalId.length || externalId.trim() !== externalId) {
      throw new TypeError('sportsTerminal.externalIdMap keys must be exact non-empty strings');
    }
    parseExternalPartnerId(externalId);
    externalIdMap.set(externalId, parsePartnerCode(codeRaw));
  }

  const observations: SportsTerminalIntegrationObservation[] = [];
  const unresolved = new Set<string>();
  const seenCodes = new Set<string>();
  const seenExternal = new Set<string>();

  for (const [index, raw] of wireArray(root.partners, 'sportsTerminal.partners').entries()) {
    const path = `sportsTerminal.partners[${index}]`;
    const row = wireRecord(raw, path);
    assertNoFloatMoney(row, path);

    const partnerCode = parsePartnerCode(row.partnerCode);
    const callSign = parsePartnerCallSign(row.callSign, partnerCode);
    const externalId = parseExternalPartnerId(
      wireText(row.externalPartnerId, `${path}.externalPartnerId`)
    );
    const mappedCode = externalIdMap.get(String(externalId));
    if (mappedCode === undefined) {
      unresolved.add(String(externalId));
      throw new TypeError(
        `${path}.externalPartnerId ${externalId} is missing from sportsTerminal.externalIdMap`
      );
    }
    if (mappedCode !== partnerCode) {
      throw new TypeError(
        `${path}.partnerCode ${partnerCode} does not match externalIdMap[${externalId}]=${mappedCode}`
      );
    }
    if (seenCodes.has(partnerCode)) {
      throw new TypeError(`sportsTerminal.partners contains duplicate PartnerCode ${partnerCode}`);
    }
    if (seenExternal.has(String(externalId))) {
      throw new TypeError(
        `sportsTerminal.partners contains duplicate externalPartnerId ${externalId}`
      );
    }
    seenCodes.add(partnerCode);
    seenExternal.add(String(externalId));

    const overallText = wireText(row.overall, `${path}.overall`);
    if (!isOverall(overallText)) {
      throw new TypeError(`${path}.overall must be healthy|degraded|unhealthy|unknown`);
    }
    const sourceCount = wireNonnegativeInteger(row.sourceCount, `${path}.sourceCount`);
    const healthyCount = wireNonnegativeInteger(row.healthyCount, `${path}.healthyCount`);
    if (healthyCount > sourceCount) {
      throw new TypeError(`${path}.healthyCount cannot exceed sourceCount`);
    }

    let maxStakeMinorUnits: number | undefined;
    if (row.maxStakeMinorUnits !== undefined && row.maxStakeMinorUnits !== null) {
      maxStakeMinorUnits = wireNonnegativeInteger(
        row.maxStakeMinorUnits,
        `${path}.maxStakeMinorUnits`
      );
    }

    const rowObservedAt =
      row.checkedAt === undefined || row.checkedAt === null
        ? observedAt
        : wireTimestamp(row.checkedAt, `${path}.checkedAt`);

    observations.push({
      partnerCode,
      callSign,
      externalPartnerRef: {
        sourceSystemId: SPORTS_TERMINAL_SOURCE_SYSTEM_ID,
        externalId,
      },
      overall: overallText,
      sourceCount,
      healthyCount,
      ...(maxStakeMinorUnits !== undefined ? { maxStakeMinorUnits } : {}),
      observedAt: rowObservedAt,
      provenance: proof(rowObservedAt, String(externalId), overallText),
    });
  }

  // Map entries without partner rows are allowed (pre-declared IDs); reverse is not.
  observations.sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));

  return {
    source,
    moneyPolicy: SPORTS_TERMINAL_MONEY_POLICY,
    observations,
    unresolvedExternalIds: [...unresolved].sort(),
  };
}

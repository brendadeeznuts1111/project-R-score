import {
  parseAdapterId,
  parseCurrencyCode,
  parsePartnerCode,
  parseSourceSystemId,
  parseSportsbookId,
  parseTreeNodeId,
} from '../core/identifiers.ts';
import type { BetStructure } from '../core/out-capabilities.ts';
import type {
  FactProvenance,
  MoneyAmount,
  PartnerCode,
  SportsbookId,
  TreeNodeId,
} from '../core/types.ts';
import {
  usdMajorToMinor,
  wireArray,
  wireNonnegativeInteger,
  wireRecord,
  wireText,
  wireTimestamp,
} from './wire.ts';

export const LIMIT_CHANGES_SCHEMA_VERSION = 3 as const;

export type PartnerLimitChangeObservation = {
  partnerCode: PartnerCode;
  treeNodeId: TreeNodeId;
  sportsbookId: SportsbookId;
  sport: string;
  market: string;
  betStructure: BetStructure;
  previousReportedMaxStake: MoneyAmount;
  reportedMaxStakeAfterChange: MoneyAmount;
  direction: 'up' | 'down' | 'unchanged';
  changedAt: string;
  currentExecutionCeiling: false;
  provenance: FactProvenance;
};

export type LimitChangeProjection = {
  observations: PartnerLimitChangeObservation[];
  unresolvedTreeNodeIds: TreeNodeId[];
  unresolvedSportsbookRefs: string[];
};

export type ParseLimitChangesOptions = {
  treeNodePartnerCodes: Readonly<Record<string, unknown>>;
  registeredSportsbookIds: readonly unknown[];
  sportsbookAliases?: Readonly<Record<string, unknown>>;
};

/**
 * Derive TreeNodeId → PartnerCode from the limit-raises nested
 * `accountProfiles.profiles[]` rows (callSign ASH / ASH-001 → ASH).
 * Pure wire parse; skips demo/incomplete rows that lack a CODE-shaped callSign.
 */
export function parseTreeNodePartnerCodesFromLimitRaises(value: unknown): Record<string, string> {
  const root = wireRecord(value, 'limits');
  const accountProfiles = root.accountProfiles;
  if (accountProfiles === undefined || accountProfiles === null) return {};
  const bag = wireRecord(accountProfiles, 'limits.accountProfiles');
  const profiles = bag.profiles;
  if (!Array.isArray(profiles)) return {};
  const map: Record<string, string> = {};
  for (const [index, raw] of profiles.entries()) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = wireRecord(raw, `limits.accountProfiles.profiles[${index}]`);
    const treeNodeId =
      row.treeNodeId === undefined || row.treeNodeId === null
        ? undefined
        : wireText(row.treeNodeId, `limits.accountProfiles.profiles[${index}].treeNodeId`);
    if (!treeNodeId) continue;
    const callSignRaw = row.callSign;
    if (typeof callSignRaw !== 'string' || !callSignRaw.length) continue;
    const match = /^([A-Z]{3,6})(?:-\d{3})?$/.exec(callSignRaw);
    if (!match) continue;
    try {
      const code = parsePartnerCode(match[1]);
      map[treeNodeId] = code;
    } catch {
      // skip non-canonical CODE labels
    }
  }
  return map;
}

/** Ops-facing sportsbook labels seen on limit-raises → canonical SportsbookId. */
export const LIMIT_RAISE_SPORTSBOOK_ALIASES: Readonly<Record<string, string>> = {
  hardrock: 'hard-rock-florida',
  'hard-rock': 'hard-rock-florida',
  hard_rock: 'hard-rock-florida',
  fanduel: 'fanduel',
  draftkings: 'draftkings',
  caesars: 'caesars',
  betmgm: 'betmgm',
  pinnacle: 'pinnacle',
};

function parseBetStructure(value: unknown, path: string): BetStructure {
  const raw = wireText(value, path);
  if (raw === 'straight' || raw === 'parlay' || raw === 'same_game_parlay') return raw;
  throw new TypeError(`${path} must be straight|parlay|same_game_parlay`);
}

function parseSecondsToTimestamp(value: unknown, path: string): string {
  const seconds = wireNonnegativeInteger(value, path);
  const timestamp = new Date(seconds * 1000).toISOString();
  return wireTimestamp(timestamp, path);
}

/**
 * Projects limit-change evidence. A raise event is never promoted to the current
 * executable ceiling; execution still requires a fresh capability observation.
 */
export function parseLimitChangesArtifact(
  value: unknown,
  options: ParseLimitChangesOptions
): LimitChangeProjection {
  const root = wireRecord(value, 'limits');
  if (root.schemaVersion !== LIMIT_CHANGES_SCHEMA_VERSION) {
    throw new TypeError('limits.schemaVersion must be 3');
  }
  const artifactObservedAt = wireTimestamp(root.generatedAt, 'limits.generatedAt');
  const byNode = wireRecord(root.byNode, 'limits.byNode');
  const registered = new Set(options.registeredSportsbookIds.map(parseSportsbookId));
  const observations: PartnerLimitChangeObservation[] = [];
  const unresolvedNodes = new Set<TreeNodeId>();
  const unresolvedBooks = new Set<string>();

  for (const [nodeRef, nodeRaw] of Object.entries(byNode)) {
    const treeNodeId = parseTreeNodeId(nodeRef);
    const mappedCode = options.treeNodePartnerCodes[nodeRef];
    if (mappedCode === undefined) {
      unresolvedNodes.add(treeNodeId);
      continue;
    }
    const partnerCode = parsePartnerCode(mappedCode);
    const node = wireRecord(nodeRaw, `limits.byNode.${nodeRef}`);
    for (const [index, raiseRaw] of wireArray(
      node.raises,
      `limits.byNode.${nodeRef}.raises`
    ).entries()) {
      const path = `limits.byNode.${nodeRef}.raises[${index}]`;
      const raise = wireRecord(raiseRaw, path);
      const externalSportsbookRef = wireText(raise.sportsbook, `${path}.sportsbook`);
      const alias = options.sportsbookAliases?.[externalSportsbookRef];
      const candidate =
        alias === undefined ? parseSportsbookId(externalSportsbookRef) : parseSportsbookId(alias);
      if (!registered.has(candidate)) {
        unresolvedBooks.add(externalSportsbookRef);
        continue;
      }
      const previous: MoneyAmount = {
        currency: parseCurrencyCode('USD'),
        minorUnits: usdMajorToMinor(raise.previous_max, `${path}.previous_max`),
      };
      const next: MoneyAmount = {
        currency: parseCurrencyCode('USD'),
        minorUnits: usdMajorToMinor(raise.new_limit, `${path}.new_limit`),
      };
      const changedAt = parseSecondsToTimestamp(raise.increased_at, `${path}.increased_at`);
      const limitRef = wireNonnegativeInteger(raise.limit_id, `${path}.limit_id`);
      const provenance: FactProvenance = {
        sourceSystemId: parseSourceSystemId('factorywager-limits'),
        sourceRecordRef: `limit-change:${limitRef}`,
        adapterId: parseAdapterId('limit-changes-v3'),
        adapterVersion: '3',
        observedAt: artifactObservedAt,
        originalValue: `${raise.previous_max}->${raise.new_limit}`,
        mappingMethod: alias === undefined ? 'identity' : 'declared',
        confidence: 'exact',
      };
      observations.push({
        partnerCode,
        treeNodeId,
        sportsbookId: candidate,
        sport: wireText(raise.sport_id, `${path}.sport_id`),
        market: wireText(raise.market_id, `${path}.market_id`),
        betStructure: parseBetStructure(raise.bet_type, `${path}.bet_type`),
        previousReportedMaxStake: previous,
        reportedMaxStakeAfterChange: next,
        direction:
          next.minorUnits > previous.minorUnits
            ? 'up'
            : next.minorUnits < previous.minorUnits
              ? 'down'
              : 'unchanged',
        changedAt,
        currentExecutionCeiling: false,
        provenance,
      });
    }
  }
  return {
    observations: observations.sort((left, right) => left.changedAt.localeCompare(right.changedAt)),
    unresolvedTreeNodeIds: [...unresolvedNodes].sort(),
    unresolvedSportsbookRefs: [...unresolvedBooks].sort(),
  };
}

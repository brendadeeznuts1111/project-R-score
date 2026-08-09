/**
 * Pure capacity reconciliation for partner dashboard records.
 *
 * Runs AFTER `buildPartnerDashboardRecords`. Applies tennis-first capacity
 * precedence to produce `activeOutIds`, optional out status / observed max-stake
 * upgrades, partner-keyed `integrations.tennis`, Sports Terminal
 * `integrations.sportsTerminal` + externalPartnerRefs, limit-raise attention,
 * bookmaker sportsbook validation, out-level limit-coverage metrics, and
 * explicit `conflicts[]`.
 *
 * Limit coverage is evidence presence only: an out is tracked when it has a
 * tennis integer observedMaxStake and/or a limit-raise observation for that
 * sportsbook. Raise events never become executable max-stake ceilings.
 *
 * Does not invent lifecycle, funding, accounting money, or unregistered outs.
 * Sports Terminal integration-health is optional; when absent, tennis is the
 * sole capacity author (precedence still declares tennis-contract >
 * sports-terminal for future multi-source conflict rows).
 */
import type { BookmakerCatalogProjection } from '../adapters/bookmakers.ts';
import type { LimitChangeProjection } from '../adapters/limit-changes.ts';
import type { SportsTerminalIntegrationProjection } from '../adapters/sports-terminal.ts';
import {
  SPORTS_TERMINAL_ADAPTER_ID,
  sportsTerminalDataStatus,
} from '../adapters/sports-terminal.ts';
import type {
  TennisCapacityProjection,
  TennisOutCapacityObservation,
} from '../adapters/tennis-capacity.ts';
import { parseAdapterId, parseAttentionReasonCode, parseTreeNodeId } from '../core/identifiers.ts';
import {
  OUT_OPERATIONAL_STATUSES,
  type ConnectorDataStatus,
  type JsonPrimitive,
  type OutId,
  type OutOperationalStatus,
  type PartnerAttentionItem,
  type PartnerDashboardOut,
  type PartnerDashboardRecord,
  type PartnerSourceConflict,
  type ProviderConnectionStatus,
  type SportsbookId,
} from '../core/types.ts';

/** Connector adapter id from partner-dashboard plan (capacity_precedence head). */
export const TENNIS_CONTRACT_ADAPTER_ID = parseAdapterId('tennis-contract');
/** Prior out status/book observations on built records come from legacy-ops. */
export const LEGACY_PARTNERS_OPS_ADAPTER_ID = parseAdapterId('legacy-partners-ops');
/** Re-export for capacity-precedence consumers (canonical definition lives on the adapter). */
export { SPORTS_TERMINAL_ADAPTER_ID };

export const CAPACITY_PRECEDENCE = ['tennis-contract', 'sports-terminal'] as const;

export type ReconcilePartnerDashboardFactsInput = {
  partners: readonly PartnerDashboardRecord[];
  /** Parsed tennis capacity projection; omit when tennis connector is unavailable. */
  tennis?: TennisCapacityProjection;
  /** Parsed Sports Terminal integration-health; omit when connector unavailable. */
  sportsTerminal?: SportsTerminalIntegrationProjection;
  /**
   * Limit-change observations (raise events only — never current max stake).
   * Authors attention evidence; does not fill limits.tracked coverage.
   */
  limits?: LimitChangeProjection;
  /** Public bookmaker catalog — validates out sportsbookIds (no invent). */
  bookmakers?: BookmakerCatalogProjection;
};

export type ReconcilePartnerDashboardFactsResult = {
  partners: PartnerDashboardRecord[];
  activeOutIds: OutId[];
  conflicts: PartnerSourceConflict[];
};

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clonePartners(partners: readonly PartnerDashboardRecord[]): PartnerDashboardRecord[] {
  return partners.map(partner => structuredClone(partner));
}

function tennisDataStatus(source: TennisCapacityProjection['source']): ConnectorDataStatus {
  if (source === 'live') return 'ok';
  if (source === 'offline-join') return 'stale';
  return 'unavailable';
}

function credentialsToProviderStatus(
  credentials: TennisOutCapacityObservation['credentials']
): ProviderConnectionStatus {
  if (credentials === 'configured') return 'active';
  if (credentials === 'missing') return 'inactive';
  return 'unknown';
}

/**
 * Map a live tennis source status onto OutOperationalStatus when possible.
 * `active` capacity always projects to operational `ready` (activeOutIds rule).
 * Offline joins never author operational status.
 */
function tennisOperationalStatus(
  observation: TennisOutCapacityObservation,
  tennisSource: TennisCapacityProjection['source']
): OutOperationalStatus | undefined {
  if (tennisSource !== 'live') return undefined;
  if (observation.active || observation.sourceStatus === 'active') return 'ready';
  if ((OUT_OPERATIONAL_STATUSES as readonly string[]).includes(observation.sourceStatus)) {
    return observation.sourceStatus as OutOperationalStatus;
  }
  return undefined;
}

function pushConflict(conflicts: PartnerSourceConflict[], conflict: PartnerSourceConflict): void {
  // Guard: boundary requires ≥2 adapters, aligned values, distinct normalized scalars.
  if (conflict.adapterIds.length < 2) return;
  if (conflict.values.length !== conflict.adapterIds.length) return;
  const distinct = new Set(
    conflict.values.map(item => `${item === null ? 'null' : typeof item}:${String(item)}`)
  );
  if (distinct.size < 2) return;
  conflicts.push(conflict);
}

function applyTennisObservationToOut(options: {
  partner: PartnerDashboardRecord;
  out: PartnerDashboardOut;
  observation: TennisOutCapacityObservation;
  tennisSource: TennisCapacityProjection['source'];
  conflicts: PartnerSourceConflict[];
}): void {
  const { partner, out, observation, tennisSource, conflicts } = options;
  const partnerCode = partner.partnerCode;

  const nextOperational = tennisOperationalStatus(observation, tennisSource);
  if (nextOperational !== undefined && nextOperational !== out.operationalStatus) {
    pushConflict(conflicts, {
      partnerCode,
      fieldPath: 'partners[].outs[].operationalStatus',
      adapterIds: [TENNIS_CONTRACT_ADAPTER_ID, LEGACY_PARTNERS_OPS_ADAPTER_ID],
      values: [nextOperational, out.operationalStatus],
    });
    out.operationalStatus = nextOperational;
  }

  if (observation.sportsbookId !== undefined && observation.sportsbookId !== out.sportsbookId) {
    pushConflict(conflicts, {
      partnerCode,
      fieldPath: 'partners[].outs[].sportsbookId',
      adapterIds: [TENNIS_CONTRACT_ADAPTER_ID, LEGACY_PARTNERS_OPS_ADAPTER_ID],
      values: [observation.sportsbookId, out.sportsbookId],
    });
    // Capacity path may surface a mapped book ref; tennis wins when it resolves.
    out.sportsbookId = observation.sportsbookId;
  }

  if (observation.maxStake !== undefined && observation.provenance) {
    const priorMinor = out.observedMaxStake?.amount.minorUnits;
    const priorCurrency = out.observedMaxStake?.amount.currency;
    if (
      priorMinor !== undefined &&
      priorCurrency !== undefined &&
      (priorMinor !== observation.maxStake.minorUnits ||
        priorCurrency !== observation.maxStake.currency)
    ) {
      pushConflict(conflicts, {
        partnerCode,
        fieldPath: 'partners[].outs[].observedMaxStake.amount.minorUnits',
        adapterIds: [TENNIS_CONTRACT_ADAPTER_ID, LEGACY_PARTNERS_OPS_ADAPTER_ID],
        values: [observation.maxStake.minorUnits, priorMinor],
      });
      if (priorCurrency !== observation.maxStake.currency) {
        pushConflict(conflicts, {
          partnerCode,
          fieldPath: 'partners[].outs[].observedMaxStake.amount.currency',
          adapterIds: [TENNIS_CONTRACT_ADAPTER_ID, LEGACY_PARTNERS_OPS_ADAPTER_ID],
          values: [observation.maxStake.currency, priorCurrency],
        });
      }
    }
    out.observedMaxStake = {
      amount: {
        currency: observation.maxStake.currency,
        minorUnits: observation.maxStake.minorUnits,
      },
      provenance: structuredClone(observation.provenance),
    };
  }

  // Optional provider connection upgrade from tennis credential readiness (live only).
  if (tennisSource === 'live') {
    const nextProvider = credentialsToProviderStatus(observation.credentials);
    if (
      out.providerConnectionStatus !== undefined &&
      out.providerConnectionStatus !== nextProvider
    ) {
      pushConflict(conflicts, {
        partnerCode,
        fieldPath: 'partners[].outs[].providerConnectionStatus',
        adapterIds: [TENNIS_CONTRACT_ADAPTER_ID, LEGACY_PARTNERS_OPS_ADAPTER_ID],
        values: [nextProvider, out.providerConnectionStatus] as JsonPrimitive[],
      });
    }
    out.providerConnectionStatus = nextProvider;
  }
}

/**
 * Apply tennis-first capacity precedence to built partner dashboard records.
 *
 * `activeOutIds` is the tennis live-active set ∩ registered outs that are
 * operationally `ready` after upgrades. Unregistered tennis outs are ignored
 * (never invented). Finance / lifecycle / funding are not authored here.
 */
function applyLimitChangeAttention(
  partners: PartnerDashboardRecord[],
  limits: LimitChangeProjection
): void {
  const raiseCount = new Map<string, number>();
  const latestUp = new Map<
    string,
    { at: string; sportsbookId: SportsbookId; minorUnits: number }
  >();
  const treeNodes = new Map<string, string>();

  for (const observation of limits.observations) {
    raiseCount.set(observation.partnerCode, (raiseCount.get(observation.partnerCode) ?? 0) + 1);
    if (observation.direction === 'up') {
      const prior = latestUp.get(observation.partnerCode);
      if (!prior || observation.changedAt >= prior.at) {
        latestUp.set(observation.partnerCode, {
          at: observation.changedAt,
          sportsbookId: observation.sportsbookId,
          minorUnits: observation.reportedMaxStakeAfterChange.minorUnits,
        });
      }
    }
    if (!treeNodes.has(observation.partnerCode)) {
      treeNodes.set(observation.partnerCode, observation.treeNodeId);
    }
  }

  for (const partner of partners) {
    const node = treeNodes.get(partner.partnerCode);
    if (node && partner.identity.treeNodeId === undefined) {
      partner.identity.treeNodeId = parseTreeNodeId(node);
    }
    const count = raiseCount.get(partner.partnerCode) ?? 0;
    if (count === 0) continue;
    const up = latestUp.get(partner.partnerCode);
    const item: PartnerAttentionItem = {
      reasonCode: parseAttentionReasonCode('partner.limits.raise_observed'),
      severity: 'info',
      label: up
        ? `${count} limit-change event(s); latest raise → ${up.sportsbookId} @ ${up.minorUnits}¢`
        : `${count} limit-change event(s) observed (not execution ceiling)`,
      actionHref: '/portal/limits/',
    };
    if (!partner.attention.some(row => row.reasonCode === item.reasonCode)) {
      partner.attention = [...partner.attention, item].sort((a, b) =>
        compareAscii(a.reasonCode, b.reasonCode)
      );
    }
  }
}

/**
 * Validate out sportsbookIds against the public catalog.
 * Does not invent IDs; emits sportsbookId conflicts only when a catalog-backed
 * tennis observation already rewrote the id (handled in tennis path).
 * Catalog membership alone never mutates outs.
 */
function noteUnregisteredSportsbooks(
  partners: PartnerDashboardRecord[],
  bookmakers: BookmakerCatalogProjection
): void {
  const registered = new Set(Object.keys(bookmakers.registry));
  for (const partner of partners) {
    for (const out of partner.outs) {
      if (registered.has(out.sportsbookId)) continue;
      // Attention only — legacy/out-of-catalog ids remain visible.
      const reason = parseAttentionReasonCode('partner.bookmakers.unregistered_sportsbook');
      if (partner.attention.some(item => item.reasonCode === reason)) continue;
      partner.attention.push({
        reasonCode: reason,
        severity: 'info',
        label: `Out sportsbook not in public catalog: ${out.sportsbookId}`,
        actionHref: '/portal/bookmakers/',
      });
      partner.attention.sort((a, b) => compareAscii(a.reasonCode, b.reasonCode));
      break;
    }
  }
}

/**
 * Per-out + partner limit evidence coverage.
 *
 * tracked = outs with at least one evidence signal:
 *   - observedMaxStake (tennis live integer minor units), or
 *   - a limit-raise observation keyed by partnerCode + sportsbookId
 * missing = registered outs with neither signal
 * coverageRatio = tracked / (tracked + missing), or 0 when no outs
 *
 * Never invents max stake or treats raises as current execution ceilings.
 */
export function applyLimitCoverageMetrics(
  partners: PartnerDashboardRecord[],
  limits?: LimitChangeProjection
): void {
  const raiseBooks = new Map<string, Set<string>>();
  if (limits) {
    for (const observation of limits.observations) {
      const key = observation.partnerCode;
      let set = raiseBooks.get(key);
      if (!set) {
        set = new Set();
        raiseBooks.set(key, set);
      }
      set.add(observation.sportsbookId);
    }
  }

  for (const partner of partners) {
    const books = raiseBooks.get(partner.partnerCode);
    let tracked = 0;
    let missing = 0;
    for (const out of partner.outs) {
      const hasExecutionEvidence = out.observedMaxStake !== undefined;
      const hasRaiseEvidence = books?.has(out.sportsbookId) === true;
      if (hasExecutionEvidence || hasRaiseEvidence) {
        tracked += 1;
        out.limitCoverageRatio = 1;
      } else {
        missing += 1;
        out.limitCoverageRatio = 0;
      }
    }
    const denom = tracked + missing;
    partner.limits = {
      tracked,
      missing,
      coverageRatio: denom === 0 ? 0 : tracked / denom,
    };
  }
}

function applySportsTerminalIntegration(
  partners: PartnerDashboardRecord[],
  sportsTerminal: SportsTerminalIntegrationProjection
): void {
  const byCode = new Map(partners.map(partner => [partner.partnerCode, partner]));
  for (const observation of sportsTerminal.observations) {
    const partner = byCode.get(observation.partnerCode);
    if (!partner) continue;

    const dataStatus = sportsTerminalDataStatus(observation.overall);
    partner.integrations = {
      ...partner.integrations,
      sportsTerminal: {
        dataStatus,
        observedAt: observation.observedAt,
      },
    };

    const refKey = `${observation.externalPartnerRef.sourceSystemId}:${observation.externalPartnerRef.externalId}`;
    const already = partner.identity.externalPartnerRefs.some(
      ref => `${ref.sourceSystemId}:${ref.externalId}` === refKey
    );
    if (!already) {
      partner.identity.externalPartnerRefs = [
        ...partner.identity.externalPartnerRefs,
        {
          sourceSystemId: observation.externalPartnerRef.sourceSystemId,
          externalId: observation.externalPartnerRef.externalId,
        },
      ].sort(
        (left, right) =>
          compareAscii(left.sourceSystemId, right.sourceSystemId) ||
          compareAscii(left.externalId, right.externalId)
      );
    }
  }
}

export function reconcilePartnerDashboardFacts(
  input: ReconcilePartnerDashboardFactsInput
): ReconcilePartnerDashboardFactsResult {
  const partners = clonePartners(input.partners);
  const conflicts: PartnerSourceConflict[] = [];
  const activeOutIds: OutId[] = [];

  if (input.sportsTerminal) {
    applySportsTerminalIntegration(partners, input.sportsTerminal);
  }
  if (input.limits) {
    applyLimitChangeAttention(partners, input.limits);
  }
  if (input.bookmakers) {
    noteUnregisteredSportsbooks(partners, input.bookmakers);
  }

  if (!input.tennis) {
    // Coverage still runs from raise evidence alone when tennis is offline.
    applyLimitCoverageMetrics(partners, input.limits);
    partners.sort((a, b) => compareAscii(a.partnerCode, b.partnerCode));
    for (const partner of partners) {
      partner.outs.sort((a, b) => compareAscii(a.outId, b.outId));
    }
    return {
      partners,
      activeOutIds: [],
      conflicts: [],
    };
  }

  const tennis = input.tennis;
  const dataStatus = tennisDataStatus(tennis.source);

  // Index registered outs: outId → { partner, out }
  const registered = new Map<
    string,
    { partner: PartnerDashboardRecord; out: PartnerDashboardOut }
  >();
  for (const partner of partners) {
    for (const out of partner.outs) {
      registered.set(out.outId, { partner, out });
    }
  }

  // Partner codes that appear in tennis observations (for integrations.tennis).
  const partnersSeenInTennis = new Set<string>();
  const partnerObservedAt = new Map<string, string>();

  for (const observation of tennis.observations) {
    partnersSeenInTennis.add(observation.partnerCode);
    const prevAt = partnerObservedAt.get(observation.partnerCode);
    if (!prevAt || observation.observedAt > prevAt) {
      partnerObservedAt.set(observation.partnerCode, observation.observedAt);
    }

    const hit = registered.get(observation.outId);
    if (!hit) {
      // Unregistered tennis capacity — never invent outs or active ids.
      continue;
    }
    if (hit.partner.partnerCode !== observation.partnerCode) {
      // Defensive: outId namespace must match partner code.
      continue;
    }

    applyTennisObservationToOut({
      partner: hit.partner,
      out: hit.out,
      observation,
      tennisSource: tennis.source,
      conflicts,
    });

    // activeOutIds ⊆ registered ∧ tennis.active ∧ operationalStatus === ready
    if (observation.active && hit.out.operationalStatus === 'ready') {
      activeOutIds.push(hit.out.outId);
    }
  }

  for (const partner of partners) {
    if (!partnersSeenInTennis.has(partner.partnerCode)) continue;
    const observedAt = partnerObservedAt.get(partner.partnerCode);
    partner.integrations = {
      ...partner.integrations,
      tennis: {
        dataStatus,
        ...(observedAt ? { observedAt } : {}),
      },
    };
  }

  // After tennis max-stake upgrades, score limit evidence coverage.
  applyLimitCoverageMetrics(partners, input.limits);

  // Deduplicate + sort activeOutIds deterministically
  const uniqueActive = [...new Set(activeOutIds.map(String))].sort(compareAscii) as OutId[];

  conflicts.sort(
    (left, right) =>
      compareAscii(left.partnerCode, right.partnerCode) ||
      compareAscii(left.fieldPath, right.fieldPath) ||
      compareAscii(left.adapterIds.join('\u0000'), right.adapterIds.join('\u0000'))
  );

  partners.sort((a, b) => compareAscii(a.partnerCode, b.partnerCode));
  for (const partner of partners) {
    partner.outs.sort((a, b) => compareAscii(a.outId, b.outId));
  }

  return {
    partners,
    activeOutIds: uniqueActive,
    conflicts,
  };
}

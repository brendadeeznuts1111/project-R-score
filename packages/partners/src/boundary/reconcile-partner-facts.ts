/**
 * Pure capacity reconciliation for partner dashboard records.
 *
 * Runs AFTER `buildPartnerDashboardRecords`. Applies tennis-first capacity
 * precedence to produce `activeOutIds`, optional out status / observed max-stake
 * upgrades, partner-keyed `integrations.tennis`, and explicit `conflicts[]`.
 *
 * Does not invent lifecycle, funding, accounting money, or unregistered outs.
 * Sports Terminal is capacity-secondary and optional; when absent, tennis is the
 * sole capacity author (precedence still declares tennis-contract >
 * sports-terminal for future multi-source conflict rows).
 */
import type {
  TennisCapacityProjection,
  TennisOutCapacityObservation,
} from '../adapters/tennis-capacity.ts';
import { parseAdapterId } from '../core/identifiers.ts';
import {
  OUT_OPERATIONAL_STATUSES,
  type ConnectorDataStatus,
  type JsonPrimitive,
  type OutId,
  type OutOperationalStatus,
  type PartnerDashboardOut,
  type PartnerDashboardRecord,
  type PartnerSourceConflict,
  type ProviderConnectionStatus,
} from '../core/types.ts';

/** Connector adapter id from partner-dashboard plan (capacity_precedence head). */
export const TENNIS_CONTRACT_ADAPTER_ID = parseAdapterId('tennis-contract');
/** Prior out status/book observations on built records come from legacy-ops. */
export const LEGACY_PARTNERS_OPS_ADAPTER_ID = parseAdapterId('legacy-partners-ops');
/** Capacity secondary — reserved for future Sports Terminal capacity input. */
export const SPORTS_TERMINAL_ADAPTER_ID = parseAdapterId('sports-terminal');

export const CAPACITY_PRECEDENCE = ['tennis-contract', 'sports-terminal'] as const;

export type ReconcilePartnerDashboardFactsInput = {
  partners: readonly PartnerDashboardRecord[];
  /** Parsed tennis capacity projection; omit when tennis connector is unavailable. */
  tennis?: TennisCapacityProjection;
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
export function reconcilePartnerDashboardFacts(
  input: ReconcilePartnerDashboardFactsInput
): ReconcilePartnerDashboardFactsResult {
  const partners = clonePartners(input.partners);
  const conflicts: PartnerSourceConflict[] = [];
  const activeOutIds: OutId[] = [];

  if (!input.tennis) {
    return {
      partners: partners.sort((a, b) => compareAscii(a.partnerCode, b.partnerCode)),
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

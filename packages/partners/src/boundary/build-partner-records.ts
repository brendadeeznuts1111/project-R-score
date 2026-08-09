/**
 * Thin pure builder: join adapter observations into PartnerDashboardRecord[].
 *
 * Sources (current):
 *   - canonical partner-profiles bake → lifecycle + call sign
 *   - partner-profile-coverage → which CODEs are implementation-ready
 *   - optional telegram-handshake → communication block
 *   - optional legacy partners-ops → out skeleton (visibility only; status is
 *     mapped with heuristic confidence until tennis/bookmakers reconcile)
 *   - optional accounting-ledger observations → balances, recent entries,
 *     out-scoped fundingStatus (never OutOperationalStatus)
 *
 * Capacity (`activeOutIds`, tennis integrations) is applied *after* this builder
 * via `reconcilePartnerDashboardFacts` (tennis, sports-terminal, limits coverage).
 * Callers pass already-parsed adapter outputs — this module does no I/O.
 */
import type { PartnerAccountingObservation } from '../adapters/accounting-ledger.ts';
import {
  adaptLifecycleFromCanonicalProfiles,
  type PartnerLifecycleObservation,
} from '../adapters/lifecycle.ts';
import {
  derivePartnerProfileCoverage,
  type PartnerProfileCoverageArtifact,
  type PartnerProfileCoverageEvidence,
  adaptPartnerProfileCoverageArtifact,
} from '../adapters/profile-coverage.ts';
import type { PartnerCommunicationObservation } from '../adapters/telegram-handshake.ts';
import type { LegacyPartnerProjection } from '../compatibility/legacy-partners-ops.ts';
import { parseAttentionReasonCode, parseSportsbookId } from '../core/identifiers.ts';
import { parseSourceSystemId } from '../core/identifiers.ts';
import {
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  PROFILE_MIGRATION_REQUIRED_REASON,
  type OutFundingStatus,
  type OutId,
  type OutOperationalStatus,
  type PartnerCode,
  type PartnerDashboardOut,
  type PartnerDashboardRecord,
  type PartnerAttentionItem,
} from '../core/types.ts';

const LEGACY_OPS_SOURCE_SYSTEM_ID = parseSourceSystemId('legacy-ops');

export type BuildPartnerRecordsInput = {
  /** Bake clock / observation time for connector-facing fields. */
  generatedAt: string;
  /** Public partner-profiles bake (or private profile map with lifecycle). */
  partnerProfiles: unknown;
  /** Redacted coverage artifact (identity readiness). */
  profileCoverage: PartnerProfileCoverageArtifact;
  /** Optional legacy visibility for out skeletons. */
  legacyOps?: LegacyPartnerProjection;
  /** Optional telegram handshake observations. */
  telegram?: readonly PartnerCommunicationObservation[];
  /**
   * Optional accounting-ledger observations (from adaptAccountingFromLedger*).
   * Partners without a row keep empty accounting; unknown CODEs are ignored.
   */
  accounting?: readonly PartnerAccountingObservation[];
};

export type BuildPartnerRecordsResult = {
  partners: PartnerDashboardRecord[];
  canonicalProfileCodes: PartnerCode[];
  /** Always empty here — tennis capacity runs in reconcilePartnerDashboardFacts. */
  activeOutIds: [];
  coverageEvidence: PartnerProfileCoverageEvidence[];
  lifecycle: PartnerLifecycleObservation[];
  /** Accounting observations that were applied (subset of input). */
  accounting: PartnerAccountingObservation[];
};

const LEGACY_OUT_STATUS_MAP: Record<
  string,
  { operational: OutOperationalStatus; funding: OutFundingStatus }
> = {
  ready: { operational: 'ready', funding: 'unknown' },
  funded: { operational: 'ready', funding: 'funded' },
  partial: { operational: 'deferred', funding: 'partial' },
  deferred: { operational: 'deferred', funding: 'unknown' },
  paused: { operational: 'paused', funding: 'unknown' },
  blocked: { operational: 'blocked', funding: 'unknown' },
};

function mapLegacyOutStatus(status: string): {
  operational: OutOperationalStatus;
  funding: OutFundingStatus;
} {
  return LEGACY_OUT_STATUS_MAP[status] ?? { operational: 'unknown', funding: 'unknown' };
}

function emptyAccounting(): PartnerDashboardRecord['accounting'] {
  return { balancePositions: [], recentEntries: [] };
}

function emptyLimits(): PartnerDashboardRecord['limits'] {
  return { tracked: 0, missing: 0, coverageRatio: 0 };
}

function emptyIntegrations(): PartnerDashboardRecord['integrations'] {
  return {};
}

function accountingFor(
  obs: PartnerAccountingObservation | undefined
): PartnerDashboardRecord['accounting'] {
  if (!obs) return emptyAccounting();
  return {
    balancePositions: obs.balancePositions.map(position => structuredClone(position)),
    recentEntries: obs.recentEntries.map(entry => structuredClone(entry)),
  };
}

/** Accounting-ledger owns out funding; legacy heuristic remains when no observation. */
function applyOutFunding(
  outs: PartnerDashboardOut[],
  funding: PartnerAccountingObservation['outFunding'] | undefined
): PartnerDashboardOut[] {
  if (!funding?.length) return outs;
  const byOut = new Map<OutId, OutFundingStatus>(
    funding.map(row => [row.outId, row.fundingStatus])
  );
  return outs.map(out => {
    const next = byOut.get(out.outId);
    if (next === undefined) return out;
    return { ...out, fundingStatus: next };
  });
}

function telegramCommunication(
  row: PartnerCommunicationObservation | undefined
): PartnerDashboardRecord['communication'] {
  if (!row) {
    return {
      chatLinked: false,
      handshakeStatus: 'unknown',
      configuredTopicKeys: [],
    };
  }
  return {
    chatLinked: row.dmLinkage === 'linked',
    handshakeStatus: row.phase,
    configuredTopicKeys: [],
  };
}

function migrationAttention(partnerCode: PartnerCode): PartnerAttentionItem {
  return {
    reasonCode: PROFILE_MIGRATION_REQUIRED_REASON,
    severity: 'warn',
    label: `Canonical profile coverage missing for ${partnerCode}`,
    actionCommand: 'bun run partner-profile:coverage:bake',
  };
}

function telegramGapAttention(
  partnerCode: PartnerCode,
  row: PartnerCommunicationObservation
): PartnerAttentionItem | undefined {
  if (row.gapCount <= 0 && row.handshakeOk) return undefined;
  return {
    reasonCode: parseAttentionReasonCode('partner.telegram.handshake_gap'),
    severity: row.handshakeOk ? 'info' : 'warn',
    label: row.topGap ?? `Telegram handshake gaps for ${partnerCode}`,
  };
}

function outsFromLegacy(
  legacy: LegacyPartnerProjection['partners'][number] | undefined
): PartnerDashboardOut[] {
  if (!legacy) return [];
  return legacy.outs.map(out => {
    const mapped = mapLegacyOutStatus(out.observedStatus);
    return {
      outId: out.outId,
      sportsbookId: parseSportsbookId(out.observedBookSlug),
      operationalStatus: mapped.operational,
      fundingStatus: mapped.funding,
      externalAccountRefs: [],
    };
  });
}

/**
 * Join pure adapter outputs into dashboard partner records.
 * Does not assemble the full artifact (no connector snapshots).
 */
export function buildPartnerDashboardRecords(
  input: BuildPartnerRecordsInput
): BuildPartnerRecordsResult {
  const coverageEvidence = adaptPartnerProfileCoverageArtifact(input.profileCoverage);
  const coverageCodes = coverageEvidence.map(row => row.partnerCode);
  const coverageByCode = new Map(coverageEvidence.map(row => [row.partnerCode, row]));

  const legacyPartners = input.legacyOps?.partners ?? [];
  const legacyByCode = new Map(legacyPartners.map(row => [row.partnerCode, row]));

  const telegramByCode = new Map(
    (input.telegram ?? []).map(row => [row.partnerCode, row] as const)
  );

  const accountingByCode = new Map(
    (input.accounting ?? []).map(row => [row.partnerCode, row] as const)
  );
  // Accounting observations never invent partners — only fill partners already in universe.
  const appliedAccounting: PartnerAccountingObservation[] = [];

  // Completeness for operational phase derivation
  const completenessByCode: Record<string, { telegramLinked: boolean; hasBooks: boolean }> = {};
  const codeUniverse = new Set<string>([
    ...coverageCodes,
    ...legacyPartners.map(p => p.partnerCode),
  ]);

  for (const code of codeUniverse) {
    const telegram = telegramByCode.get(code as PartnerCode);
    const legacy = legacyByCode.get(code as PartnerCode);
    completenessByCode[code] = {
      telegramLinked: telegram?.dmLinkage === 'linked' || telegram?.handshakeOk === true,
      hasBooks: (legacy?.outs.length ?? 0) > 0,
    };
  }

  const lifecycle = adaptLifecycleFromCanonicalProfiles(input.partnerProfiles, {
    observedAt: input.generatedAt,
    completenessByCode,
  });
  const lifecycleByCode = new Map(lifecycle.map(row => [row.partnerCode, row]));

  // Every lifecycle code must be considered
  for (const row of lifecycle) codeUniverse.add(row.partnerCode);

  const partners: PartnerDashboardRecord[] = [];
  for (const rawCode of [...codeUniverse].sort()) {
    const partnerCode = rawCode as PartnerCode;
    const life = lifecycleByCode.get(partnerCode);
    if (!life) {
      throw new TypeError(
        `partner ${partnerCode} is visible but has no canonical lifecycle (add partner-profiles bake entry)`
      );
    }
    const coverage = coverageByCode.get(partnerCode);
    const telegram = telegramByCode.get(partnerCode);
    const legacy = legacyByCode.get(partnerCode);
    const accounting = accountingByCode.get(partnerCode);
    if (accounting) appliedAccounting.push(accounting);

    const callSign = coverage?.callSign ?? life.callSign ?? legacy?.baseCallSign;
    if (!callSign) {
      throw new TypeError(
        `partner ${partnerCode} has no call sign from coverage, lifecycle, or legacy ops`
      );
    }

    const attention: PartnerAttentionItem[] = [];
    if (!coverage) attention.push(migrationAttention(partnerCode));
    if (telegram) {
      const gap = telegramGapAttention(partnerCode, telegram);
      if (gap) attention.push(gap);
    }

    const outs = applyOutFunding(outsFromLegacy(legacy), accounting?.outFunding);

    partners.push({
      partnerCode,
      callSign,
      lifecycle: life.lifecycle,
      operationalPhase: life.operationalPhase,
      identity: {
        // Assemble requires profileSourceSystemId === canonical iff CODE ∈ coverage set.
        profileSourceSystemId: coverage
          ? CANONICAL_PROFILE_SOURCE_SYSTEM_ID
          : LEGACY_OPS_SOURCE_SYSTEM_ID,
        externalPartnerRefs: [],
      },
      outs,
      accounting: accountingFor(accounting),
      communication: telegramCommunication(telegram),
      limits: emptyLimits(),
      integrations: emptyIntegrations(),
      attention,
    });
  }

  // Re-derive completeness against coverage for the assemble canonical set
  const visibleCodes = partners.map(p => p.partnerCode);
  const coverageResult = derivePartnerProfileCoverage(input.profileCoverage, visibleCodes);

  return {
    partners,
    canonicalProfileCodes: coverageResult.presentCodes,
    activeOutIds: [],
    coverageEvidence,
    lifecycle,
    accounting: appliedAccounting.sort((a, b) => a.partnerCode.localeCompare(b.partnerCode)),
  };
}

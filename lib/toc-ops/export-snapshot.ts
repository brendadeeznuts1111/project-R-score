// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io — Bun.mmap (sync path read)
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Bake TOC Ops fixture → public/registry/toc-ops.json (+ optional portal embed).
 *
 * @see lib/toc-ops/fixture.ts
 * @see tools/ops-seed-toc.ts
 */
import { withTocEnforcement } from './enforcement.ts';
import { buildDemoTocOpsFixture } from './fixture.ts';
import { getTioeSnapshot } from './return-efficiency.ts';
import type { TocOpsSnapshot, TocOpsSummarySlice } from './types.ts';

export const TOC_OPS_REGISTRY_REL = 'public/registry/toc-ops.json';
export const TOC_OPS_REGISTRY_PATH = '/registry/toc-ops.json' as const;

function tocOpsAbsPath(root = process.cwd()): string {
  return root.endsWith('/') ? `${root}${TOC_OPS_REGISTRY_REL}` : `${root}/${TOC_OPS_REGISTRY_REL}`;
}

export function emptyTocOpsSummarySlice(): TocOpsSummarySlice {
  return {
    available: false,
    path: TOC_OPS_REGISTRY_PATH,
    generatedAt: null,
    partners: 0,
    warmed: 0,
    warming: 0,
    onboarding: 0,
    confirmedRails: 0,
    openTasks: 0,
    openOnb: 0,
    openLimit: 0,
    openBottlenecks: 0,
    criticalBottlenecks: 0,
    principalOutstandingTotal: 0,
    throttleOnboarding: false,
    primedDrums: 0,
    playableDrums: 0,
    playsPending: 0,
    playsSettled: 0,
    activeExperiments: 0,
    plane: 'demo-readonly',
    identityLinked: false,
    identityPartners: 0,
    enforcementFocus: null,
    enforcementFailed: 0,
    enforcementCritical: 0,
    throughputT: null,
    throughputI: null,
    throughputOE: null,
    topRankedProcess: null,
    avgRP: null,
    settlementFloatRatio: null,
    presencePartners: 0,
    presenceIpv6: 0,
    presenceUniqueZips: 0,
    presenceUniqueAsns: 0,
    presenceDnsResolved: 0,
    presenceAvgDistanceKm: null,
    venueKinds: 0,
    venueExchanges: 0,
    venueCrypto: 0,
    venueCreditLines: 0,
    venueLegalStates: 0,
    profilePhones: 0,
    profileTelegramLanes: 0,
    expertLiquidityAvailable: 0,
    avgAgentClvBps: null,
    openDeals: 0,
    messageLogEntries: 0,
    messageLogSlaBreaches: 0,
    experimentOutcomes: 0,
    avgExperimentLiftPct: null,
    rotorSamples: 0,
    capitalMoves: 0,
    warmCyclesOpen: 0,
    gate12Events: 0,
    bufferHistoryDays: 0,
    balanceSheetsOk: 0,
    limitRefreshes: 0,
    railConfirmEvents: 0,
    switchbackWindows: 0,
    releaseCards: 0,
    deferredPlays: 0,
    pendingExposureTotal: 0,
    recycleCyclesOpen: 0,
    complianceOpen: 0,
    auditTrailRows: 0,
    slaBreaches7d: 0,
    wdQueuedTotal: 0,
    wdBlockedTotal: 0,
    exposureAging72hPlus: 0,
    onbChecklistPending: 0,
    settlementSlots7d: 0,
    constraintRopeCount: 0,
    playSettlementPending: 0,
    exceptionResolutionOpen: 0,
    botCommands24h: 0,
    bicHandoffsTotal: 0,
    warmPlaybookPending: 0,
    phoneLogEvents: 0,
    avgLiquidityUtilPct: null,
    fundCorridorsBlocked: 0,
    railUtilHighCount: 0,
    accountGatesFailed: 0,
    capitalLocationMoves: 0,
    pendingDeployItems: 0,
    playInstructionsStale: 0,
    dealSplitDrift: 0,
  };
}

export function tocOpsToSummarySlice(snap: TocOpsSnapshot): TocOpsSummarySlice {
  const enf = snap.enforcement;
  const top = snap.rankedActions?.[0];
  return {
    available: true,
    path: TOC_OPS_REGISTRY_PATH,
    generatedAt: snap.generatedAt,
    partners: snap.summary.partners,
    warmed: snap.summary.warmed,
    warming: snap.summary.warming,
    onboarding: snap.summary.onboarding,
    confirmedRails: snap.summary.confirmedRails,
    openTasks: snap.summary.openTasks,
    openOnb: snap.summary.openOnb,
    openLimit: snap.summary.openLimit,
    openBottlenecks: snap.summary.openBottlenecks,
    criticalBottlenecks: snap.summary.criticalBottlenecks,
    principalOutstandingTotal: snap.summary.principalOutstandingTotal,
    throttleOnboarding: snap.buffer.throttleOnboarding,
    primedDrums: snap.buffer.primedDrums,
    playableDrums: snap.buffer.playableDrums,
    playsPending: snap.summary.playsPending,
    playsSettled: snap.summary.playsSettled,
    activeExperiments: snap.summary.activeExperiments,
    plane: 'demo-readonly',
    identityLinked: snap.identity?.linked ?? false,
    identityPartners: snap.identity?.linkedPartners ?? 0,
    enforcementFocus: enf?.diagnosis.focus ?? null,
    enforcementFailed: enf?.failed ?? 0,
    enforcementCritical: enf?.criticalFailed ?? 0,
    throughputT: enf?.throughput.T ?? null,
    throughputI: enf?.throughput.I ?? null,
    throughputOE: enf?.throughput.OE ?? null,
    topRankedProcess: top?.process ?? null,
    avgRP: snap.returnEfficiency?.avgRP ?? null,
    settlementFloatRatio: snap.buffer.settlementFloatRatio ?? null,
    presencePartners: snap.presence?.partnersWithGeo ?? snap.summary.presencePartners ?? 0,
    presenceIpv6: snap.presence?.ipv6Count ?? snap.summary.presenceIpv6 ?? 0,
    presenceUniqueZips: snap.presence?.uniqueZips ?? snap.summary.presenceUniqueZips ?? 0,
    presenceUniqueAsns: snap.presence?.uniqueAsns ?? snap.summary.presenceUniqueAsns ?? 0,
    presenceDnsResolved: snap.presence?.dnsResolved ?? snap.summary.presenceDnsResolved ?? 0,
    presenceAvgDistanceKm: snap.presence?.avgDistanceKmFromHouse ?? null,
    venueKinds:
      snap.venues != null
        ? Object.keys(snap.venues.byVenueKind).length
        : (snap.summary.venueKinds ?? 0),
    venueExchanges: snap.venues?.exchangeAccounts ?? snap.summary.venueExchanges ?? 0,
    venueCrypto: snap.venues?.cryptoAccounts ?? snap.summary.venueCrypto ?? 0,
    venueCreditLines: snap.venues?.creditLines ?? snap.summary.venueCreditLines ?? 0,
    venueLegalStates: snap.venues?.legalStatesCovered ?? snap.summary.venueLegalStates ?? 0,
    profilePhones: snap.profiles?.phonesActive ?? snap.summary.profilePhones ?? 0,
    profileTelegramLanes: snap.profiles?.telegramLanes ?? snap.summary.profileTelegramLanes ?? 0,
    expertLiquidityAvailable:
      snap.profiles?.expertLiquidityAvailable ?? snap.summary.expertLiquidityAvailable ?? 0,
    avgAgentClvBps: snap.profiles?.avgAgentClvBps ?? snap.summary.avgAgentClvBps ?? null,
    openDeals: snap.profiles?.openDeals ?? snap.summary.openDeals ?? 0,
    messageLogEntries: snap.summary.messageLogEntries ?? 0,
    messageLogSlaBreaches: snap.summary.messageLogSlaBreaches ?? 0,
    experimentOutcomes: snap.summary.experimentOutcomes ?? 0,
    avgExperimentLiftPct: snap.summary.avgExperimentLiftPct ?? null,
    rotorSamples: snap.summary.rotorSamples ?? 0,
    capitalMoves: snap.summary.capitalMoves ?? 0,
    warmCyclesOpen: snap.summary.warmCyclesOpen ?? 0,
    gate12Events: snap.summary.gate12Events ?? 0,
    bufferHistoryDays: snap.summary.bufferHistoryDays ?? snap.buffer.history?.length ?? 0,
    balanceSheetsOk: snap.summary.balanceSheetsOk ?? 0,
    limitRefreshes: snap.summary.limitRefreshes ?? 0,
    railConfirmEvents: snap.summary.railConfirmEvents ?? 0,
    switchbackWindows: snap.summary.switchbackWindows ?? 0,
    releaseCards: snap.summary.releaseCards ?? 0,
    deferredPlays: snap.summary.deferredPlays ?? 0,
    pendingExposureTotal: snap.summary.pendingExposureTotal ?? 0,
    recycleCyclesOpen: snap.summary.recycleCyclesOpen ?? 0,
    complianceOpen: snap.summary.complianceOpen ?? 0,
    auditTrailRows: snap.summary.auditTrailRows ?? 0,
    slaBreaches7d: snap.summary.slaBreaches7d ?? 0,
    wdQueuedTotal: snap.summary.wdQueuedTotal ?? 0,
    wdBlockedTotal: snap.summary.wdBlockedTotal ?? 0,
    exposureAging72hPlus: snap.summary.exposureAging72hPlus ?? 0,
    onbChecklistPending: snap.summary.onbChecklistPending ?? 0,
    settlementSlots7d: snap.summary.settlementSlots7d ?? 0,
    constraintRopeCount: snap.summary.constraintRopeCount ?? 0,
    playSettlementPending: snap.summary.playSettlementPending ?? 0,
    exceptionResolutionOpen: snap.summary.exceptionResolutionOpen ?? 0,
    botCommands24h: snap.summary.botCommands24h ?? 0,
    bicHandoffsTotal: snap.summary.bicHandoffsTotal ?? 0,
    warmPlaybookPending: snap.summary.warmPlaybookPending ?? 0,
    phoneLogEvents: snap.summary.phoneLogEvents ?? 0,
    avgLiquidityUtilPct: snap.summary.avgLiquidityUtilPct ?? null,
    fundCorridorsBlocked: snap.summary.fundCorridorsBlocked ?? 0,
    railUtilHighCount: snap.summary.railUtilHighCount ?? 0,
    accountGatesFailed: snap.summary.accountGatesFailed ?? 0,
    capitalLocationMoves: snap.summary.capitalLocationMoves ?? 0,
    pendingDeployItems: snap.summary.pendingDeployItems ?? 0,
    playInstructionsStale: snap.summary.playInstructionsStale ?? 0,
    dealSplitDrift: snap.summary.dealSplitDrift ?? 0,
  };
}

/** Apply return-efficiency metrics then operate-lite enforcement. */
export function withTocMetrics(snap: TocOpsSnapshot): TocOpsSnapshot {
  const now = Date.parse(snap.generatedAt);
  const tioe = getTioeSnapshot(snap, Number.isFinite(now) ? now : Date.now());
  const enriched: TocOpsSnapshot = {
    ...snap,
    catalog: {
      ...snap.catalog,
      returnEfficiency: {
        ...snap.catalog.returnEfficiency,
        daysCover: snap.catalog.returnEfficiency?.daysCover ?? 14,
        staticFloatFloor: snap.catalog.returnEfficiency?.staticFloatFloor ?? 50_000,
        settlementThrottleRatio: snap.catalog.returnEfficiency?.settlementThrottleRatio ?? 0.6,
        tVelocityWindowDays: snap.catalog.returnEfficiency?.tVelocityWindowDays ?? 30,
        defaultExpectedPlayT: snap.catalog.returnEfficiency?.defaultExpectedPlayT ?? 840,
        // WD (Gate 12 principal) before profit PLAY
        processRank:
          snap.catalog.returnEfficiency?.processRank ??
          (['LIMIT', 'ONB', 'WD', 'PLAY', 'WARM', 'FUND'] as const),
      },
    },
    buffer: {
      ...tioe.buffer,
      // Preserve demo buffer history densification (return-efficiency rebuilds scalars only)
      history: snap.buffer.history ?? tioe.buffer.history,
    },
    partners: tioe.partners,
    returnEfficiency: tioe.returnEfficiency,
    rankedActions: tioe.rankedActions,
  };
  return withTocEnforcement(enriched);
}

export function loadTocOpsSnapshotSync(root = process.cwd()): TocOpsSnapshot | null {
  const path = tocOpsAbsPath(root);
  try {
    const file = Bun.file(path);
    if (file.size === 0) return null;
    const mapped = Bun.mmap(path);
    return JSON.parse(new TextDecoder().decode(mapped)) as TocOpsSnapshot;
  } catch {
    return null;
  }
}

/** Prefer filesystem snapshot; else build demo in-memory. */
export function resolveTocOpsSnapshot(root = process.cwd()): TocOpsSnapshot {
  return loadTocOpsSnapshotSync(root) ?? buildDemoTocOpsFixture();
}

export function loadTocOpsSummarySlice(root = process.cwd()): TocOpsSummarySlice {
  const snap = loadTocOpsSnapshotSync(root);
  return snap ? tocOpsToSummarySlice(snap) : emptyTocOpsSummarySlice();
}

export type ExportTocOpsSnapshotResult = {
  path: string;
  partners: number;
  warmed: number;
  openTasks: number;
  openBottlenecks: number;
  generatedAt: string;
};

export async function exportTocOpsSnapshot(opts?: {
  root?: string;
  fixture?: TocOpsSnapshot;
  bakeEmbed?: boolean;
  /** Re-evaluate operate-lite gates (default true). */
  enforce?: boolean;
}): Promise<ExportTocOpsSnapshotResult> {
  const root = opts?.root ?? process.cwd();
  const base = opts?.fixture ?? buildDemoTocOpsFixture();
  const snap = opts?.enforce === false ? base : withTocMetrics(base);
  const outPath = tocOpsAbsPath(root);
  await Bun.write(outPath, `${JSON.stringify(snap, null, 2)}\n`);

  try {
    const { writeTocOpsBakeProof } = await import('./bake-proof.ts');
    await writeTocOpsBakeProof(snap, root);
  } catch {
    // Proof write is best-effort during first bake
  }

  if (opts?.bakeEmbed !== false) {
    try {
      const { bakeJsonEmbed } = await import('../http/portal-embed-bake.ts');
      const htmlPath = root.endsWith('/')
        ? `${root}public/portal/toc/index.html`
        : `${root}/public/portal/toc/index.html`;
      await bakeJsonEmbed(htmlPath, 'toc-embed', snap);
    } catch {
      // Portal page may not exist yet during first bake
    }
  }

  return {
    path: outPath,
    partners: snap.summary.partners,
    warmed: snap.summary.warmed,
    openTasks: snap.summary.openTasks,
    openBottlenecks: snap.summary.openBottlenecks,
    generatedAt: snap.generatedAt,
  };
}

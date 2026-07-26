/**
 * Demo seed densification — Soft/play calendar, desk scorecards, MessageLog,
 * rotor, experiment outcomes, capital/warm/Gate12 ledgers, expert ROI.
 *
 * @see lib/toc-ops/profiles.ts
 * @see lib/toc-ops/fixture.ts
 */
import { demoPlacementFromPresence } from './presence.ts';
import { summarizeProfiles } from './profiles.ts';
import type {
  TocAccount,
  TocAuditTrailRow,
  TocBicHandoff,
  TocBotCommandEntry,
  TocBottleneck,
  TocBufferHistoryPoint,
  TocCapitalMove,
  TocComplianceFlag,
  TocDealSplitAudit,
  TocExceptionResolution,
  TocExceptionEvent,
  TocExperiment,
  TocExpert,
  TocExposureAging,
  TocExposureEvent,
  TocFundCorridor,
  TocGate12Event,
  TocGateId,
  TocLimitRefresh,
  TocLiquidityUtilPoint,
  TocMessageLogEntry,
  TocNetCapitalPosition,
  TocOnbChecklistItem,
  TocPartner,
  TocPendingDeploymentItem,
  TocPhoneLogEntry,
  TocPlay,
  TocPlaySettlementSlot,
  TocReadinessTrendPoint,
  TocRailConfirmEvent,
  TocRecycleCycle,
  TocReleaseCard,
  TocRotorPoint,
  TocSlaBoard,
  TocSettlementSlot,
  TocSoftBalanceSheet,
  TocSoftEntry,
  TocTaskTimelineEntry,
  TocSwitchbackWindow,
  TocAccountConstraint,
  TocWarmCycle,
  TocWarmPlaybookStep,
  TocWdPipelineItem,
} from './types.ts';

function withPlacement(partner: TocPartner, plays: TocPlay[]): TocPlay[] {
  const bySign = new Map(partner.accounts.map(a => [a.callSign, a.presence]));
  const now = Date.parse('2026-07-24T00:00:00.000Z');
  return plays.map(play => {
    let next = play;
    if (play.status !== 'blocked' && !play.placement) {
      const pr = bySign.get(play.callSign);
      if (pr) next = { ...next, placement: demoPlacementFromPresence(pr, play.placedAt) };
    }
    if (play.status === 'instruction') {
      const placed = Date.parse(play.placedAt);
      const ageMin = Math.max(0, Math.round((now - placed) / 60_000));
      next = {
        ...next,
        instructionAgeMin: ageMin,
        ackDueAt: new Date(placed + 60 * 60_000).toISOString(),
      };
    }
    return next;
  });
}

function dayIso(offsetFromJul10: number, hour = 16): string {
  const d = 10 + offsetFromJul10;
  const dd = d > 31 ? d - 21 : d; // keep in July demo window roughly
  const day = Math.min(23, Math.max(10, dd));
  return `2026-07-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

function profitSplitTriple(
  callSign: string, // brand-ok
  taskId: string, // brand-ok
  total: number,
  at: string,
  split: { p: number; e: number; h: number } = { p: 0.7, e: 0.2, h: 0.1 }
): TocSoftEntry[] {
  const partner = Math.round(total * split.p);
  const expert = Math.round(total * split.e);
  const house = total - partner - expert;
  return [
    {
      entryType: 'ProfitSplit',
      stakeholder: 'Partner',
      amount: partner,
      callSign,
      taskId,
      timestamp: at,
    },
    {
      entryType: 'ProfitSplit',
      stakeholder: 'Expert',
      amount: expert,
      callSign,
      taskId,
      timestamp: at,
    },
    {
      entryType: 'ProfitSplit',
      stakeholder: 'House',
      amount: house,
      callSign,
      taskId,
      timestamp: at,
    },
  ];
}

function recomputeSoftTotals(entries: TocSoftEntry[]): {
  Partner: number;
  Expert: number;
  House: number;
} {
  const out = { Partner: 0, Expert: 0, House: 0 };
  for (const e of entries) {
    if (e.entryType === 'ProfitSplit') {
      out[e.stakeholder] += e.amount;
    }
  }
  // Keep House float narrative elevated with deployments net of returns — demo floor
  const deploys = entries
    .filter(e => e.entryType === 'CapitalDeployment')
    .reduce((n, e) => n + e.amount, 0);
  const returns = entries
    .filter(e => e.entryType === 'CapitalReturn')
    .reduce((n, e) => n + e.amount, 0);
  out.House = Math.max(out.House, deploys - returns + out.House);
  return out;
}

function softDailyFromEntries(
  entries: TocSoftEntry[]
): Array<{ day: string; t: number; oe: number }> {
  const byDay = new Map<string, { t: number; oe: number }>();
  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    const cur = byDay.get(day) ?? { t: 0, oe: 0 };
    if (e.entryType === 'ProfitSplit') cur.t += e.amount;
    if (e.entryType === 'Loss' || e.entryType === 'CostOfPriming') cur.oe += e.amount;
    byDay.set(day, cur);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, t: v.t, oe: v.oe }));
}

function ashExtraPlays(): TocPlay[] {
  return [
    {
      playId: 'play-ash-001-nba-deep-001',
      taskId: 'PLAY-ASH-001-20260718-200000-001',
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      expertId: 'marcus',
      market: 'NBA',
      event: 'DEN @ MIN',
      selection: 'DEN -2.5',
      odds: -108,
      stake: 1000,
      confidence: 0.6,
      status: 'settled',
      result: 'win',
      pnl: 420,
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'static',
      placedAt: '2026-07-18T20:05:00.000Z',
      settledAt: '2026-07-18T23:20:00.000Z',
    },
    {
      playId: 'play-ash-001-nfl-deep-002',
      taskId: 'PLAY-ASH-001-20260713-170000-001',
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      expertId: 'elena',
      market: 'NFL',
      event: 'SF @ SEA',
      selection: 'SF ML',
      odds: -130,
      stake: 800,
      confidence: 0.57,
      status: 'settled',
      result: 'loss',
      pnl: -800,
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'static',
      placedAt: '2026-07-13T17:10:00.000Z',
      settledAt: '2026-07-13T21:00:00.000Z',
    },
    {
      playId: 'play-ash-001-pending-deep',
      taskId: 'PLAY-ASH-001-20260723-190000-001',
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      expertId: 'marcus',
      market: 'MLB',
      event: 'HOU @ TEX',
      selection: 'HOU -1.5',
      odds: +135,
      stake: 700,
      confidence: 0.53,
      status: 'instruction',
      result: 'pending',
      pnl: null,
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'static',
      placedAt: '2026-07-23T19:00:00.000Z',
    },
  ];
}

function patExtraPlays(): TocPlay[] {
  return [
    {
      playId: 'play-pat-001-tennis-deep-001',
      taskId: 'PLAY-PAT-001-20260716-140000-001',
      callSign: 'PAT-001',
      partnerCode: 'PAT',
      expertId: 'elena',
      market: 'Tennis',
      event: 'Djokovic vs Medvedev',
      selection: 'Djokovic -1.5 sets',
      odds: +105,
      stake: 1100,
      confidence: 0.63,
      status: 'settled',
      result: 'win',
      pnl: 720,
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'dynamic',
      placedAt: '2026-07-16T14:20:00.000Z',
      settledAt: '2026-07-16T18:40:00.000Z',
    },
    {
      playId: 'play-pat-001-nba-deep-002',
      taskId: 'PLAY-PAT-001-20260719-010000-001',
      callSign: 'PAT-001',
      partnerCode: 'PAT',
      expertId: 'marcus',
      market: 'NBA',
      event: 'BOS @ PHI',
      selection: 'Under 215.5',
      odds: -110,
      stake: 1300,
      confidence: 0.58,
      status: 'settled',
      result: 'push',
      pnl: 0,
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'dynamic',
      placedAt: '2026-07-19T01:05:00.000Z',
      settledAt: '2026-07-19T03:40:00.000Z',
    },
    {
      playId: 'play-pat-004-crypto-deep-001',
      taskId: 'PLAY-PAT-004-20260719-110000-001',
      callSign: 'PAT-004',
      partnerCode: 'PAT',
      expertId: 'kai',
      market: 'Crypto',
      event: 'BTC weekly close',
      selection: 'Above 68k',
      odds: -115,
      stake: 500,
      confidence: 0.51,
      status: 'settled',
      result: 'loss',
      pnl: -500,
      experimentId: 'exp-liquidity-weight-2026-07',
      variantKey: 'dynamic_weight',
      placedAt: '2026-07-19T11:00:00.000Z',
      settledAt: '2026-07-19T12:00:00.000Z',
    },
    {
      playId: 'play-pat-002-kalshi-deep-002',
      taskId: 'PLAY-PAT-002-20260723-130000-001',
      callSign: 'PAT-002',
      partnerCode: 'PAT',
      expertId: 'kai',
      market: 'Politics',
      event: 'CPI print Jul',
      selection: 'Below 3.0%',
      odds: +140,
      stake: 1500,
      confidence: 0.56,
      status: 'placed',
      result: 'pending',
      pnl: null,
      experimentId: 'exp-liquidity-weight-2026-07',
      variantKey: 'dynamic_weight',
      placedAt: '2026-07-23T13:10:00.000Z',
    },
  ];
}

function ashExtraSoft(): TocSoftEntry[] {
  return [
    ...profitSplitTriple(
      'ASH-001',
      'WD-ASH-001-20260718-233000-001',
      420,
      '2026-07-18T23:35:00.000Z'
    ),
    {
      entryType: 'Loss',
      stakeholder: 'House',
      amount: 800,
      callSign: 'ASH-001',
      taskId: 'PLAY-ASH-001-20260713-170000-001',
      timestamp: '2026-07-13T21:05:00.000Z',
    },
    {
      // Journal seed cannot mint Adjustment without correctsEntryId (row pk) —
      // represent fee correction as CostOfPriming in the demo Soft stream.
      entryType: 'CostOfPriming',
      stakeholder: 'House',
      amount: 25,
      callSign: 'ASH-001',
      taskId: 'ADJ-ASH-001-20260719-100000-001',
      timestamp: '2026-07-19T10:00:00.000Z',
    },
  ];
}

function patExtraSoft(): TocSoftEntry[] {
  return [
    ...profitSplitTriple(
      'PAT-001',
      'WD-PAT-001-20260716-190000-001',
      720,
      '2026-07-16T19:00:00.000Z'
    ),
    {
      entryType: 'Loss',
      stakeholder: 'House',
      amount: 500,
      callSign: 'PAT-004',
      taskId: 'PLAY-PAT-004-20260719-110000-001',
      timestamp: '2026-07-19T12:05:00.000Z',
    },
    {
      entryType: 'CostOfPriming',
      stakeholder: 'House',
      amount: 35,
      callSign: 'PAT-005',
      taskId: 'WARM-PAT-005-20260723-110000-001',
      timestamp: '2026-07-23T11:30:00.000Z',
    },
  ];
}

function resolvedBottlenecks(code: string): TocBottleneck[] {
  if (code === 'ASH') {
    return [
      {
        ruleKey: 'warmup_cycle_aging',
        severity: 'info',
        metric: 'hours_open',
        threshold: 24,
        observed: 26,
        callSign: 'ASH-001',
        resolvedAt: '2026-07-16T14:40:00.000Z',
        nextAction: 'Resolved — cycle 2 WD posted',
      },
    ];
  }
  if (code === 'PAT') {
    return [
      {
        ruleKey: 'open_pending_partner_queue',
        severity: 'warn',
        metric: 'pending_partner_tasks',
        threshold: 3,
        observed: 3,
        resolvedAt: '2026-07-20T19:00:00.000Z',
        nextAction: 'Resolved — PLAY ack within SLA',
      },
      {
        ruleKey: 'rotor_drift_detected',
        severity: 'info',
        metric: 'drift_bps',
        threshold: 50,
        observed: 62,
        callSign: 'PAT-001',
        resolvedAt: '2026-07-21T08:00:00.000Z',
        nextAction: 'Resolved — limit refresh + expert reweight',
      },
    ];
  }
  return [
    {
      ruleKey: 'telegram_lane_undelivered_cards',
      severity: 'info',
      metric: 'undelivered_cards',
      threshold: 1,
      observed: 2,
      resolvedAt: '2026-07-22T11:30:00.000Z',
      nextAction: 'Resolved — DM lane confirmed',
    },
  ];
}

function deepenPartnerDesk(p: TocPartner): TocPartner {
  if (!p.profile) return p;
  const code = p.partnerCode as 'ASH' | 'PAT' | 'NOV';
  const rails = p.rails.map(r => ({
    railId: r.id,
    successRate: r.confirmed ? (code === 'PAT' ? 0.97 : code === 'ASH' ? 0.93 : 0.8) : 0.4,
    avgSettleMin: r.railType === 'CashApp' ? 18 : r.railType === 'Venmo' ? 22 : 45,
    lastFailureAt: r.confirmed && code === 'ASH' ? '2026-07-11T09:00:00.000Z' : null,
    volume30d: r.confirmed ? (code === 'PAT' ? 28_400 : code === 'ASH' ? 14_200 : 5001) : 0,
  }));

  const proofs = [
    ...(p.accounts
      .filter(a => a.limits.screenshotRef)
      .map(a => ({
        ref: a.limits.screenshotRef!,
        kind: 'limits' as const,
        callSign: a.callSign,
        at: a.limits.checkedAt ?? dayIso(10),
      })) || []),
    ...p.rails
      .filter(r => r.profileScreenshotRef)
      .map(r => ({
        ref: r.profileScreenshotRef!,
        kind: 'rail' as const,
        at: dayIso(8, 12),
      })),
    ...p.openTasks
      .filter(t => t.proofRefs?.length)
      .flatMap(t =>
        (t.proofRefs ?? []).map(ref => ({
          ref,
          kind: (t.taskType === 'ONB' ? 'kyc' : t.taskType === 'FUND' ? 'receipt' : 'other') as
            | 'kyc'
            | 'receipt'
            | 'other',
          callSign: t.callSign,
          at: t.createdAt ?? dayIso(12),
        }))
      ),
  ];

  const deskScorecard = {
    trustScore: code === 'PAT' ? 0.91 : code === 'ASH' ? 0.78 : 0.42,
    slaOnTimePct: code === 'PAT' ? 0.88 : code === 'ASH' ? 0.71 : 0.55,
    proofCompletenessPct: Math.min(0.99, proofs.length / 8),
    avgPartnerResponseMin: code === 'PAT' ? 14 : code === 'ASH' ? 28 : 46,
    openExceptions: p.bottlenecks.filter(b => b.resolvedAt == null).length,
    lastReviewAt: '2026-07-23T18:00:00.000Z',
  };

  const softDailyT = softDailyFromEntries(p.softBalance.recentEntries);
  const weekAgo = Date.parse('2026-07-17T00:00:00.000Z');
  const plays7d = p.recentPlays.filter(pl => Date.parse(pl.placedAt) >= weekAgo);
  const velocity = {
    t7d: p.softBalance.recentEntries
      .filter(e => e.entryType === 'ProfitSplit' && Date.parse(e.timestamp) >= weekAgo)
      .reduce((n, e) => n + e.amount, 0),
    plays7d: plays7d.length,
    settles7d: plays7d.filter(pl => pl.status === 'settled').length,
    avgStake7d:
      plays7d.length === 0
        ? 0
        : Math.round(plays7d.reduce((n, pl) => n + pl.stake, 0) / plays7d.length),
  };

  const soft = p.softBalance.byStakeholder;
  return {
    ...p,
    profile: {
      ...p.profile,
      accounting: {
        ...p.profile.accounting,
        softPartner: soft.Partner,
        softExpert: soft.Expert,
        softHouse: soft.House,
        pendingDeploy: p.softBalance.pendingDeployments.totalAmount,
      },
      deskScorecard,
      railHealth: rails,
      proofVault: proofs.slice(0, 16),
      softDailyT,
      velocity,
      history: [
        ...p.profile.history,
        {
          at: '2026-07-23T18:05:00.000Z',
          kind: 'desk_review',
          summary: `Desk scorecard trust ${deskScorecard.trustScore} · SLA ${(deskScorecard.slaOnTimePct * 100).toFixed(0)}%`,
        },
        {
          at: '2026-07-22T07:00:00.000Z',
          kind: 'proof_audit',
          summary: `Proof vault ${proofs.length} refs · completeness ${(deskScorecard.proofCompletenessPct * 100).toFixed(0)}%`,
        },
      ].sort((a, b) => a.at.localeCompare(b.at)),
      payments: [
        ...p.profile.payments,
        {
          id: `pay-${code.toLowerCase()}-desk-fee`,
          method: 'ach' as const,
          direction: 'out' as const,
          amount: code === 'NOV' ? 0 : 49,
          currency: 'USD',
          status: code === 'NOV' ? ('pending' as const) : ('posted' as const),
          at: '2026-07-15T08:00:00.000Z',
          note: 'Desk tooling fee',
        },
      ],
    },
  };
}

function deepenAgentDesk(e: TocExpert): TocExpert {
  if (!e.profile) return e;
  const venues = e.profile.wagerPlaces.map((w, i) => ({
    venueId: w.venueId,
    allowed: true,
    maxStake: e.profile!.limits.perPlayMax ?? 2000 - i * 200,
    markets: e.profile!.markets.slice(0, 3 + (i % 2)),
    note: w.venueId === 'polymarket' || w.venueId === 'stake' ? 'alts cut applies' : undefined,
  }));
  if (e.expertId === 'marcus') {
    venues.push({
      venueId: 'fanduel',
      allowed: false,
      maxStake: 0,
      markets: ['NFL'],
      note: 'Pending state KYC mirror',
    });
  }

  const exposureLadder = [
    { band: '0-500', openStake: 400, reserved: 0, cap: 5_000 },
    { band: '500-1500', openStake: e.expertId === 'elena' ? 900 : 700, reserved: 200, cap: 12_000 },
    {
      band: '1500+',
      openStake: e.expertId === 'marcus' ? 1500 : 0,
      reserved: e.profile.liquidity.reserved,
      cap: e.profile.liquidity.allocated,
    },
  ];

  const clvDailyBps = (e.profile.clv.weeklySeriesBps ?? [10, 12, 14, 16, 18, 20, 22, 20]).flatMap(
    (w, i) => [w - 1, w, w + (i % 2)]
  );

  const allocated = e.profile.liquidity.allocated;
  const liquidityUtilSeries: TocLiquidityUtilPoint[] = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const inUse =
      e.expertId === 'marcus'
        ? Math.round(allocated * (0.55 + i * 0.04))
        : e.expertId === 'elena'
          ? Math.round(allocated * (0.42 + i * 0.03))
          : Math.round(allocated * (0.35 + i * 0.025));
    const utilPct = allocated === 0 ? 0 : Math.round((inUse / allocated) * 1000) / 10;
    return {
      day: dayIso(10 + i, 0).slice(0, 10),
      utilPct,
      allocated,
      inUse: Math.min(inUse, allocated),
    };
  });

  return {
    ...e,
    profile: {
      ...e.profile,
      bookPermissions: venues,
      exposureLadder,
      clvDailyBps: clvDailyBps.slice(0, 21),
      liquidityUtilSeries,
      history: [
        ...e.profile.history,
        {
          at: '2026-07-23T19:00:00.000Z',
          kind: 'permissions',
          summary: `Book matrix ${venues.filter(v => v.allowed).length}/${venues.length} venues allowed`,
        },
        {
          at: dayIso(9, 8),
          kind: 'exposure',
          summary: `Ladder top band reserved $${exposureLadder[2]!.reserved}`,
        },
      ].sort((a, b) => a.at.localeCompare(b.at)),
    },
  };
}

function partnerMessageLog(code: string): TocMessageLogEntry[] {
  if (code === 'ASH') {
    return [
      {
        id: 'msg-ash-001',
        at: '2026-07-18T19:55:00.000Z',
        channel: 'telegram',
        direction: 'out',
        from: 'Expert',
        to: 'Partner',
        taskId: 'PLAY-ASH-001-20260718-200000-001',
        callSign: 'ASH-001',
        summary: 'PLAY card DEN @ MIN — stake $1000 ack',
      },
      {
        id: 'msg-ash-002',
        at: '2026-07-18T20:08:00.000Z',
        channel: 'telegram',
        direction: 'in',
        from: 'Partner',
        to: 'Ops',
        taskId: 'PLAY-ASH-001-20260718-200000-001',
        callSign: 'ASH-001',
        summary: 'Slip posted · awaiting settle',
      },
      {
        id: 'msg-ash-003',
        at: '2026-07-19T10:05:00.000Z',
        channel: 'sms',
        direction: 'out',
        from: 'Ops',
        to: 'Partner',
        callSign: 'ASH-001',
        summary: 'Soft fee correction CostOfPriming $25 logged',
      },
      {
        id: 'msg-ash-004',
        at: '2026-07-23T19:12:00.000Z',
        channel: 'telegram',
        direction: 'out',
        from: 'Bot',
        to: 'Partner',
        taskId: 'PLAY-ASH-001-20260723-190000-001',
        callSign: 'ASH-001',
        summary: 'Instruction HOU @ TEX waiting partner ack',
        slaBreached: true,
      },
      {
        id: 'msg-ash-005',
        at: '2026-07-23T20:40:00.000Z',
        channel: 'system',
        direction: 'internal',
        from: 'System',
        to: 'Ops',
        callSign: 'ASH-001',
        summary: 'Rotor drift 48bps — LIMIT refresh queued',
      },
    ];
  }
  if (code === 'PAT') {
    return [
      {
        id: 'msg-pat-001',
        at: '2026-07-16T14:05:00.000Z',
        channel: 'telegram',
        direction: 'out',
        from: 'Expert',
        to: 'Partner',
        taskId: 'PLAY-PAT-001-20260716-140000-001',
        callSign: 'PAT-001',
        summary: 'Tennis PLAY Djokovic — dynamic variant',
      },
      {
        id: 'msg-pat-002',
        at: '2026-07-16T14:22:00.000Z',
        channel: 'telegram',
        direction: 'in',
        from: 'Partner',
        to: 'Expert',
        taskId: 'PLAY-PAT-001-20260716-140000-001',
        callSign: 'PAT-001',
        summary: 'Ack + stake confirmed Kalshi rail',
      },
      {
        id: 'msg-pat-003',
        at: '2026-07-20T18:30:00.000Z',
        channel: 'portal',
        direction: 'internal',
        from: 'Ops',
        to: 'System',
        summary: 'BIC handoff PLAY→Ops after SLA clear',
      },
      {
        id: 'msg-pat-004',
        at: '2026-07-21T08:10:00.000Z',
        channel: 'telegram',
        direction: 'out',
        from: 'Bot',
        to: 'Partner',
        callSign: 'PAT-001',
        summary: 'Limit refresh screenshot request',
      },
      {
        id: 'msg-pat-005',
        at: '2026-07-23T13:15:00.000Z',
        channel: 'telegram',
        direction: 'out',
        from: 'Expert',
        to: 'Partner',
        taskId: 'PLAY-PAT-002-20260723-130000-001',
        callSign: 'PAT-002',
        summary: 'CPI Kalshi ticket placed — pending settle',
      },
      {
        id: 'msg-pat-006',
        at: '2026-07-23T15:00:00.000Z',
        channel: 'voice',
        direction: 'out',
        from: 'Ops',
        to: 'Partner',
        summary: 'Desk review — trust 0.91 confirmed',
      },
    ];
  }
  return [
    {
      id: 'msg-nov-001',
      at: '2026-07-22T10:15:00.000Z',
      channel: 'telegram',
      direction: 'out',
      from: 'Ops',
      to: 'Partner',
      taskId: 'ONB-NOV-001-20260722-100000-001',
      callSign: 'NOV-001',
      summary: 'ONB welcome + KYC checklist',
    },
    {
      id: 'msg-nov-002',
      at: '2026-07-22T14:40:00.000Z',
      channel: 'sms',
      direction: 'in',
      from: 'Partner',
      to: 'Ops',
      callSign: 'NOV-001',
      summary: 'ID selfie uploaded',
    },
    {
      id: 'msg-nov-003',
      at: '2026-07-23T09:00:00.000Z',
      channel: 'telegram',
      direction: 'out',
      from: 'Bot',
      to: 'Partner',
      callSign: 'NOV-001',
      summary: 'FUND corridor $5k target — rail unconfirmed',
      slaBreached: true,
    },
    {
      id: 'msg-nov-004',
      at: '2026-07-23T16:20:00.000Z',
      channel: 'system',
      direction: 'internal',
      from: 'System',
      to: 'Ops',
      summary: 'Throttle ONB until rail confirm',
    },
  ];
}

function partnerRotor(code: string): TocRotorPoint[] {
  if (code === 'NOV') {
    return [
      {
        at: '2026-07-22T12:00:00.000Z',
        callSign: 'NOV-001',
        driftBps: 0,
        limitFreshHours: 999,
        action: 'No limits yet',
      },
    ];
  }
  const sign = code === 'ASH' ? 'ASH-001' : 'PAT-001';
  const base = code === 'ASH' ? 28 : 18;
  return [0, 1, 2, 3, 4, 5, 6].map(i => ({
    at: dayIso(10 + i, 8),
    callSign: sign,
    driftBps: base + i * (code === 'ASH' ? 4 : 3) + (i === 5 ? 12 : 0),
    limitFreshHours: Math.max(2, 72 - i * 10),
    action: i === 5 ? 'LIMIT refresh' : i === 6 ? 'Stable' : undefined,
  }));
}

function partnerExceptionTimeline(p: TocPartner): TocExceptionEvent[] {
  const fromKnown = p.knownExceptions.map((ex, i) => ({
    id: ex.id,
    at: dayIso(8 + i, 11),
    family: ex.id.split('-')[0] ?? 'UNK',
    status: 'mitigated' as const,
    callSign: p.accounts[0]?.callSign,
    summary: `${ex.trigger} → ${ex.action}`,
  }));
  if (p.partnerCode === 'ASH') {
    fromKnown.push({
      id: 'PLAY-EX-02',
      at: '2026-07-23T19:30:00.000Z',
      family: 'PLAY',
      status: 'open',
      callSign: 'ASH-001',
      summary: 'Pending instruction SLA > 60m — Ball-in-Court Partner',
    });
  }
  if (p.partnerCode === 'NOV') {
    fromKnown.push({
      id: 'ONB-EX-01',
      at: '2026-07-23T09:05:00.000Z',
      family: 'ONB',
      status: 'open',
      callSign: 'NOV-001',
      summary: 'Rail unconfirmed blocks FUND corridor',
    });
  }
  return fromKnown.sort((a, b) => a.at.localeCompare(b.at));
}

function novExtraSoft(): TocSoftEntry[] {
  return [
    {
      entryType: 'CostOfPriming',
      stakeholder: 'House',
      amount: 40,
      callSign: 'NOV-001',
      taskId: 'ONB-NOV-001-20260722-100000-001',
      timestamp: '2026-07-22T11:00:00.000Z',
    },
    {
      entryType: 'CostOfPriming',
      stakeholder: 'House',
      amount: 15,
      callSign: 'NOV-001',
      taskId: 'FUND-NOV-001-20260723-090000-001',
      timestamp: '2026-07-23T09:30:00.000Z',
    },
  ];
}

function switchbackWindowsFor(exp: TocExperiment): TocSwitchbackWindow[] {
  const windows: TocSwitchbackWindow[] = [];
  let i = 0;
  for (const a of exp.assignments) {
    const startDay = 10 + (i % 4) * 2;
    windows.push({
      windowId: `win-${exp.id}-${a.partnerCode}-${a.variantKey}-${i}`,
      startAt: dayIso(startDay, 0),
      endAt: dayIso(startDay + 1, 23),
      variantKey: a.variantKey,
      partnerCode: a.partnerCode,
      metricValue: a.metricValue,
    });
    i++;
  }
  return windows;
}

function deepenExperiments(exps: TocExperiment[], partners: TocPartner[]): TocExperiment[] {
  const plays = partners.flatMap(p => p.recentPlays);
  return exps.map(exp => {
    const tagged = plays.filter(pl => pl.experimentId === exp.id);
    const byVariant = exp.variants.map(v => {
      const rows = tagged.filter(pl => pl.variantKey === v.key);
      const settled = rows.filter(pl => pl.status === 'settled');
      const wins = settled.filter(pl => pl.result === 'win').length;
      const metric =
        exp.metricName === 'throughput_t'
          ? settled.reduce((n, pl) => n + Math.max(0, pl.pnl ?? 0), 0)
          : settled.length === 0
            ? (exp.assignments.find(a => a.variantKey === v.key)?.metricValue ?? 0)
            : wins / settled.length;
      return { variantKey: v.key, n: rows.length || 1, metric: Math.round(metric * 1000) / 1000 };
    });
    const control = byVariant[0]?.metric ?? 0;
    const treatment = byVariant[1]?.metric ?? control;
    const liftPct =
      control === 0 ? 0 : Math.round(((treatment - control) / Math.abs(control)) * 1000) / 1000;
    const sampleN = byVariant.reduce((n, v) => n + v.n, 0);
    const outcome =
      exp.outcome ??
      ({
        sampleN,
        controlMetric: control,
        treatmentMetric: treatment,
        liftPct,
        ci95: [liftPct - 0.05, liftPct + 0.05] as [number, number],
        decidedAt: exp.status === 'completed' ? '2026-07-01T00:00:00.000Z' : undefined,
        decision:
          exp.status === 'completed'
            ? liftPct >= 0
              ? 'keep'
              : 'kill'
            : liftPct > 0.05
              ? 'iterate'
              : 'pending',
        byVariant,
      } as const);
    return {
      ...exp,
      outcome,
      switchbackWindows: exp.switchbackWindows ?? switchbackWindowsFor(exp),
    };
  });
}

function accountCapitalLedgers(
  a: TocAccount,
  partnerCode: string
): {
  capitalLedger: TocCapitalMove[];
  warmCycles: TocWarmCycle[];
  gate12Ledger: TocGate12Event[];
} {
  const cs = a.callSign;
  const deploy = Math.max(a.hardBalance, a.gate12.housePrincipalOutstanding, 5000);
  const outstanding = a.gate12.housePrincipalOutstanding;

  const capitalLedger: TocCapitalMove[] = [];
  const warmCycles: TocWarmCycle[] = [];
  const gate12Ledger: TocGate12Event[] = [];

  if (partnerCode === 'NOV' || a.status === 'New' || a.status === 'Funded') {
    capitalLedger.push({
      at: '2026-07-22T11:00:00.000Z',
      from: 'HouseFloat',
      to: 'WithPartner',
      amount: Math.min(deploy, 5000),
      taskId: `FUND-${cs}-20260722-110000-001`,
      note: 'Corridor FUND pending sportsbook proof',
    });
    if (outstanding > 0) {
      gate12Ledger.push({
        at: '2026-07-22T11:05:00.000Z',
        kind: 'deploy',
        amount: outstanding,
        remainingAfter: outstanding,
        mode: 'warmup_capital_return',
        taskId: `FUND-${cs}-20260722-110000-001`,
        note: 'Principal disclosed — Gate 12 open',
      });
    }
    return { capitalLedger, warmCycles, gate12Ledger };
  }

  capitalLedger.push(
    {
      at: dayIso(2, 10),
      from: 'HouseFloat',
      to: 'WithPartner',
      amount: deploy,
      taskId: `FUND-${cs}-cycle1`,
      note: 'FUND verified',
    },
    {
      at: dayIso(2, 14),
      from: 'WithPartner',
      to: 'InSportsbook',
      amount: deploy,
      taskId: `FUND-${cs}-cycle1`,
      note: 'Sportsbook funded proof',
    }
  );
  gate12Ledger.push({
    at: dayIso(2, 14),
    kind: 'deploy',
    amount: deploy,
    remainingAfter: deploy,
    mode: 'warmup_capital_return',
    taskId: `FUND-${cs}-cycle1`,
  });

  if (a.warmupCount >= 1) {
    warmCycles.push({
      cycle: 1,
      startedAt: dayIso(3, 12),
      completedAt: a.warmupCount >= 2 ? dayIso(5, 18) : null,
      tags: a.warmupProgress.tags.slice(0, 2),
      wdTaskId: `WD-${cs}-cycle1`,
      returnedAmount: a.warmupCount >= 2 ? Math.round(deploy * 0.15) : undefined,
      status: a.warmupCount >= 2 ? 'completed' : 'open',
    });
    if (a.warmupCount >= 2) {
      capitalLedger.push({
        at: dayIso(5, 18),
        from: 'InSportsbook',
        to: 'HouseFloat',
        amount: Math.round(deploy * 0.15),
        taskId: `WD-${cs}-cycle1`,
        note: 'Warm cycle 1 capital return',
      });
      gate12Ledger.push({
        at: dayIso(5, 18),
        kind: 'return',
        amount: Math.round(deploy * 0.15),
        remainingAfter: Math.max(0, deploy - Math.round(deploy * 0.15)),
        mode: 'warmup_capital_return',
        taskId: `WD-${cs}-cycle1`,
      });
    }
  }

  if (a.warmupCount >= 2) {
    warmCycles.push({
      cycle: 2,
      startedAt: dayIso(6, 12),
      completedAt: a.status === 'WARMED' ? dayIso(9, 16) : null,
      tags: a.warmupProgress.tags.slice(0, 3),
      wdTaskId: `WD-${cs}-cycle2`,
      returnedAmount: a.status === 'WARMED' ? Math.round(deploy * 0.2) : undefined,
      status: a.status === 'WARMED' ? 'completed' : 'open',
    });
    if (a.status === 'WARMED') {
      capitalLedger.push({
        at: dayIso(9, 16),
        from: 'InSportsbook',
        to: a.capitalLocation === 'HouseFloat' ? 'HouseFloat' : 'InSportsbook',
        amount: Math.round(deploy * 0.2),
        taskId: `WD-${cs}-cycle2`,
        note: 'Warm cycle 2 complete — WARMED',
      });
      const remAfterWarm = Math.max(0, deploy - Math.round(deploy * 0.35));
      gate12Ledger.push({
        at: dayIso(9, 16),
        kind: 'return',
        amount: Math.round(deploy * 0.2),
        remainingAfter: remAfterWarm,
        mode: remAfterWarm > 0 ? 'principal_recovery' : 'profit_split',
        taskId: `WD-${cs}-cycle2`,
      });
      if (remAfterWarm === 0 || a.gate12.withdrawalMode === 'profit_split') {
        gate12Ledger.push({
          at: dayIso(10, 9),
          kind: 'mode_change',
          amount: 0,
          remainingAfter: outstanding,
          mode: 'profit_split',
          note: 'Principal cleared — profit_split unlocked',
        });
      }
    }
  }

  if (outstanding > 0 && a.gate12.withdrawalMode === 'principal_recovery') {
    gate12Ledger.push({
      at: '2026-07-23T12:00:00.000Z',
      kind: 'disclosure',
      amount: outstanding,
      remainingAfter: outstanding,
      mode: 'principal_recovery',
      note: 'Gate 12 cashier Rope — WD profit_split blocked',
    });
    capitalLedger.push({
      at: '2026-07-20T15:00:00.000Z',
      from: 'HouseFloat',
      to: 'InSportsbook',
      amount: outstanding,
      taskId: `FUND-${cs}-recycle`,
      note: 'Recycle deploy — principal still out',
    });
  }

  if (a.capitalLocation === 'HouseFloat' && a.status === 'WARMED') {
    capitalLedger.push({
      at: '2026-07-18T23:40:00.000Z',
      from: 'InSportsbook',
      to: 'HouseFloat',
      amount: a.hardBalance || 1000,
      taskId: `WD-${cs}-profit`,
      note: 'Profit WD after settle',
    });
  }

  return {
    capitalLedger: capitalLedger.sort((x, y) => x.at.localeCompare(y.at)),
    warmCycles,
    gate12Ledger: gate12Ledger.sort((x, y) => x.at.localeCompare(y.at)),
  };
}

function softBalanceSheet(p: TocPartner): TocSoftBalanceSheet {
  const soft = p.softBalance.byStakeholder;
  const hardInBook = p.accounts.reduce((n, a) => n + a.hardBalance, 0);
  const principal = p.accounts.reduce((n, a) => n + a.gate12.housePrincipalOutstanding, 0);
  // Soft stock identity: A = L + E (Partner+Expert Soft = L, House Soft = E)
  const liabilities = soft.Partner + soft.Expert;
  const equity = soft.House;
  const assets = liabilities + equity;
  const delta = 0;
  const byType = new Map<string, number>();
  for (const e of p.softBalance.recentEntries) {
    byType.set(e.entryType, (byType.get(e.entryType) ?? 0) + e.amount);
  }
  const drill = [
    {
      entryType: 'CapitalDeployment' as const,
      amount: hardInBook,
      note: `Hard in-book $${hardInBook} (memo — not Soft stock)`,
    },
    {
      entryType: 'CapitalDeployment' as const,
      amount: principal,
      note: `Gate 12 principal out $${principal}`,
    },
    ...[...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([entryType, amount]) => ({
        entryType: entryType as TocSoftEntry['entryType'],
        amount,
        note: `${entryType} Soft rollup`,
      })),
  ];
  return {
    assets: Math.round(assets),
    liabilities: Math.round(liabilities),
    equity: Math.round(equity),
    identityOk: true,
    delta,
    asOf: '2026-07-23T18:00:00.000Z',
    drill,
  };
}

function limitHistoryFor(a: TocAccount): TocLimitRefresh[] {
  if (a.limits.dailyMax == null && a.limits.checkedAt == null) {
    return [
      {
        at: '2026-07-22T12:00:00.000Z',
        dailyMax: null,
        weeklyMax: null,
        freshness: 'unknown',
        source: 'ops',
      },
    ];
  }
  const daily = a.limits.dailyMax ?? 0;
  const weekly = a.limits.weeklyMax ?? daily * 5;
  return [
    {
      at: dayIso(4, 10),
      dailyMax: Math.round(daily * 0.7),
      weeklyMax: Math.round(weekly * 0.7),
      freshness: 'stale',
      screenshotRef: a.limits.screenshotRef
        ? `${a.limits.screenshotRef}-v1`
        : `limits/${a.callSign}-v1.png`,
      source: 'partner',
    },
    {
      at: a.limits.checkedAt ?? dayIso(10, 9),
      dailyMax: daily,
      weeklyMax: weekly,
      freshness: a.limits.freshness,
      screenshotRef: a.limits.screenshotRef,
      source: a.limits.freshness === 'fresh' ? 'bot' : 'ops',
    },
  ];
}

function railConfirmHistory(p: TocPartner): TocPartner['rails'] {
  return p.rails.map(r => {
    const hist: TocRailConfirmEvent[] = [
      {
        at: dayIso(3, 11),
        railId: r.id,
        action: 'submitted',
        screenshotRef: r.profileScreenshotRef,
        note: 'Profile screenshot uploaded',
      },
    ];
    if (r.confirmed) {
      hist.push({
        at: dayIso(4, 15),
        railId: r.id,
        action: 'confirmed',
        screenshotRef: r.profileScreenshotRef,
        note: 'Ops confirmed destination',
      });
    } else {
      hist.push({
        at: dayIso(12, 9),
        railId: r.id,
        action: p.partnerCode === 'NOV' ? 'expired' : 'rejected',
        note: p.partnerCode === 'NOV' ? 'Confirm SLA elapsed' : 'Destination mismatch',
      });
    }
    const dailyCap = r.dailyLimit ?? (p.partnerCode === 'PAT' ? 8_000 : 4_000);
    const monthlyCap = r.monthlyLimit ?? dailyCap * 20;
    const usedDaily =
      p.partnerCode === 'PAT' && r.confirmed
        ? Math.round(dailyCap * 0.82)
        : p.partnerCode === 'ASH' && r.confirmed
          ? Math.round(dailyCap * 0.61)
          : p.partnerCode === 'NOV'
            ? 0
            : Math.round(dailyCap * 0.35);
    const usedMonthly =
      p.partnerCode === 'PAT' && r.confirmed
        ? Math.round(monthlyCap * 0.74)
        : p.partnerCode === 'ASH' && r.confirmed
          ? Math.round(monthlyCap * 0.58)
          : Math.round(usedDaily * 8);
    const pctDaily = dailyCap === 0 ? 0 : Math.round((usedDaily / dailyCap) * 1000) / 10;
    const pctMonthly = monthlyCap === 0 ? 0 : Math.round((usedMonthly / monthlyCap) * 1000) / 10;
    return {
      ...r,
      confirmHistory: hist,
      utilization: {
        usedDaily,
        usedMonthly,
        pctDaily,
        pctMonthly,
        asOf: '2026-07-23T18:00:00.000Z',
      },
    };
  });
}

function exposureAgingFromJournal(
  journal: TocExposureEvent[],
  pending: number,
  nowMs = Date.parse('2026-07-24T00:00:00.000Z')
): TocExposureAging {
  const aging: TocExposureAging = { bucket0_24h: 0, bucket24_72h: 0, bucket72hPlus: 0 };
  if (pending <= 0) return aging;
  const openEvents = journal.filter(
    e => (e.kind === 'reserve' || e.kind === 'place') && e.pendingAfter > 0
  );
  if (openEvents.length === 0) {
    aging.bucket0_24h = pending;
    return aging;
  }
  for (const e of openEvents) {
    const ageH = (nowMs - Date.parse(e.at)) / 3_600_000;
    const amt = e.pendingAfter;
    if (ageH <= 24) aging.bucket0_24h += amt;
    else if (ageH <= 72) aging.bucket24_72h += amt;
    else aging.bucket72hPlus += amt;
  }
  return aging;
}

function partnerWdPipeline(p: TocPartner): TocWdPipelineItem[] {
  const items: TocWdPipelineItem[] = [];
  for (const a of p.accounts) {
    const principal = a.gate12.housePrincipalOutstanding;
    if (principal <= 0 && a.flowStage !== 'WD') continue;
    const wdTask = p.openTasks.find(t => t.callSign === a.callSign && t.taskType === 'WD');
    const blocked = principal > 0;
    const unconfirmedRail = p.rails.some(r => r.id === a.primaryRailId && !r.confirmed);
    items.push({
      wdId: `wd-${a.callSign}-${p.partnerCode}`,
      callSign: a.callSign,
      amount: principal > 0 ? principal : Math.round(a.hardBalance * 0.4),
      mode: a.gate12.withdrawalMode,
      status: blocked
        ? 'blocked'
        : unconfirmedRail
          ? 'pending_rail'
          : wdTask?.status === 'Processing'
            ? 'processing'
            : wdTask?.status === 'GateCheck'
              ? 'gate_check'
              : principal > 0
                ? 'queued'
                : 'completed',
      requestedAt: wdTask?.createdAt ?? dayIso(12, 14),
      slaDueAt: wdTask?.slaDueAt ?? dayIso(13, 18),
      blockReason: blocked
        ? 'Gate 12 principal outstanding'
        : unconfirmedRail
          ? 'Rail unconfirmed'
          : undefined,
    });
  }
  if (p.partnerCode === 'PAT' && !items.some(i => i.status === 'processing')) {
    items.push({
      wdId: 'wd-pat-profit-split',
      callSign: 'PAT-001',
      amount: 420,
      mode: 'profit_split',
      status: 'processing',
      requestedAt: dayIso(13, 10),
      slaDueAt: dayIso(14, 12),
    });
  }
  return items.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

function partnerOnbChecklist(p: TocPartner): TocOnbChecklistItem[] | undefined {
  if (p.status !== 'Onboarding' && p.partnerCode !== 'NOV') return undefined;
  const allRailsConfirmed = p.rails.length > 0 && p.rails.every(r => r.confirmed);
  const kycComplete = !p.accounts.some(a => a.status === 'New');
  const limitsFresh = p.accounts.some(a => a.limits.freshness === 'fresh');
  return [
    {
      stepId: 'onb-package',
      label: 'Package agreement signed',
      status: 'done',
      completedAt: '2026-07-20T14:00:00.000Z',
    },
    {
      stepId: 'onb-kyc',
      label: 'KYC / identity docs',
      status: kycComplete ? 'done' : 'blocked',
      completedAt: kycComplete ? '2026-07-21T11:00:00.000Z' : undefined,
      blockReason: kycComplete ? undefined : 'NOV-001 still New — government ID pending',
    },
    {
      stepId: 'onb-rail',
      label: 'All payout rails screenshot-first',
      status: allRailsConfirmed ? 'done' : 'blocked',
      completedAt: allRailsConfirmed ? dayIso(4, 15) : undefined,
      blockReason: allRailsConfirmed ? undefined : 'CashApp rail unconfirmed — confirm SLA elapsed',
    },
    {
      stepId: 'onb-telegram',
      label: 'Telegram bot linked',
      status: p.telegramRef ? 'done' : 'pending',
      completedAt: p.telegramRef ? '2026-07-22T09:30:00.000Z' : undefined,
    },
    {
      stepId: 'onb-first-account',
      label: 'First Drum call sign minted',
      status: p.accounts.length > 0 ? 'done' : 'pending',
      completedAt: p.accounts[0]?.callSign ? dayIso(5, 8) : undefined,
    },
    {
      stepId: 'onb-fund',
      label: 'First FUND corridor ($4.5k–$5.5k)',
      status: limitsFresh ? 'pending' : 'blocked',
      blockReason: limitsFresh ? undefined : 'Blocked until limits screenshot + all rails clear',
    },
  ];
}

function partnerSettlementCalendar(p: TocPartner): TocSettlementSlot[] {
  const slots: TocSettlementSlot[] = [];
  for (const a of p.accounts) {
    if ((a.pendingExposure ?? 0) > 0) {
      slots.push({
        at: dayIso(14, 20),
        kind: 'exposure',
        callSign: a.callSign,
        amount: a.pendingExposure!,
        note: 'Pending play settlement window',
      });
    }
    for (const w of a.warmCycles?.filter(x => x.status === 'open') ?? []) {
      slots.push({
        at: dayIso(15, 12),
        kind: 'exposure',
        callSign: a.callSign,
        amount: w.returnedAmount ?? 0,
        note: `Warm cycle ${w.cycle} return`,
      });
    }
  }
  for (const w of p.wdPipeline ?? []) {
    if (w.status === 'blocked' || w.status === 'queued' || w.status === 'processing') {
      slots.push({
        at: w.slaDueAt ?? dayIso(14, 18),
        kind: 'wd',
        callSign: w.callSign,
        amount: w.amount,
        note: w.blockReason ?? `WD ${w.status}`,
      });
    }
  }
  for (const r of p.rails.filter(x => !x.confirmed)) {
    slots.push({
      at: dayIso(13, 17),
      kind: 'rail',
      amount: 0,
      note: `${r.label} confirm deadline`,
    });
  }
  return slots.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 12);
}

function rollupExposureAging(accounts: TocAccount[]): TocExposureAging {
  return accounts.reduce(
    (acc, a) => {
      const ag = a.exposureAging;
      if (!ag) return acc;
      acc.bucket0_24h += ag.bucket0_24h;
      acc.bucket24_72h += ag.bucket24_72h;
      acc.bucket72hPlus += ag.bucket72hPlus;
      return acc;
    },
    { bucket0_24h: 0, bucket24_72h: 0, bucket72hPlus: 0 }
  );
}

function accountConstraint(a: TocAccount, partnerCode: string): TocAccountConstraint {
  const g12 = a.gate12.housePrincipalOutstanding > 0;
  const warm = a.warmupCount < 2;
  const stale = a.limits.freshness === 'stale';
  if (partnerCode === 'NOV') {
    return {
      focus: 'rope',
      ropeBroken: true,
      drumStarved: false,
      bufferWrongSized: false,
      summary: 'ONB — partner ack blocks Drum',
    };
  }
  if (g12) {
    return {
      focus: 'elevate',
      ropeBroken: false,
      drumStarved: false,
      bufferWrongSized: false,
      summary: 'Gate 12 principal — WD before PLAY',
    };
  }
  if (warm) {
    return {
      focus: 'drum',
      ropeBroken: false,
      drumStarved: true,
      bufferWrongSized: false,
      summary: `Warm ${a.warmupCount}/2 starves PLAY`,
    };
  }
  if (stale) {
    return {
      focus: 'buffer',
      ropeBroken: false,
      drumStarved: false,
      bufferWrongSized: true,
      summary: 'Limit screenshot stale — buffer wrong-sized',
    };
  }
  return {
    focus: 'drum',
    ropeBroken: false,
    drumStarved: false,
    bufferWrongSized: false,
    summary: 'Drum ready — PLAY eligible',
  };
}

function partnerExceptionResolution(p: TocPartner): TocExceptionResolution[] {
  const rows: TocExceptionResolution[] = [];
  for (const ev of p.exceptionTimeline ?? []) {
    rows.push({
      exceptionId: ev.id,
      family: ev.family,
      status: ev.status === 'closed' ? 'resolved' : ev.status === 'mitigated' ? 'assigned' : 'open',
      owner: ev.status === 'open' ? 'Partner' : 'Ops',
      dueAt: dayIso(14, 17),
      callSign: ev.callSign,
      summary: ev.summary,
      resolvedAt: ev.status === 'closed' ? dayIso(13, 11) : undefined,
    });
  }
  for (const b of p.bottlenecks.filter(x => !x.resolvedAt).slice(0, 2)) {
    rows.push({
      exceptionId: `bn-${b.ruleKey}-${b.callSign ?? p.partnerCode}`,
      family: b.ruleKey,
      status: 'assigned',
      owner: 'Ops',
      dueAt: dayIso(13, 20),
      callSign: b.callSign,
      summary: b.nextAction,
    });
  }
  return rows.slice(0, 8);
}

function partnerPlaySettlementQueue(p: TocPartner): TocPlaySettlementSlot[] {
  return p.recentPlays
    .filter(pl => pl.status === 'placed' || pl.status === 'instruction')
    .slice(0, 6)
    .map((pl, i) => ({
      playId: pl.playId,
      callSign: pl.callSign,
      stake: pl.stake,
      status: pl.status,
      expectedSettleAt: dayIso(13 + (i % 3), 18 + i),
      market: pl.market,
    }));
}

function partnerBotCommandLog(p: TocPartner): TocBotCommandEntry[] {
  const bot = p.profile?.bot?.username ?? `@TOC_${p.partnerCode}_bot`;
  const base: TocBotCommandEntry[] = [
    {
      at: dayIso(12, 9),
      command: '/status',
      actor: bot,
      outcome: 'ok',
      note: `${p.partnerCode} readiness ${p.readiness.score.toFixed(2)}`,
    },
    {
      at: dayIso(12, 14),
      command: '/limits',
      actor: 'Partner',
      outcome: p.partnerCode === 'NOV' ? 'deferred' : 'ok',
      note: p.partnerCode === 'NOV' ? 'Awaiting screenshot-first' : 'Limits refreshed',
    },
  ];
  if (p.partnerCode === 'ASH') {
    base.push({
      at: dayIso(13, 8),
      command: '/play defer',
      actor: 'Expert',
      outcome: 'denied',
      note: 'Gate 12 principal outstanding on ASH-003',
    });
  }
  if (p.partnerCode === 'PAT') {
    base.push({
      at: dayIso(13, 16),
      command: '/wd queue',
      actor: 'Partner',
      outcome: 'ok',
      note: 'Profit-split WD processing',
    });
  }
  return base;
}

function exposureAndRecycle(
  a: TocAccount,
  partnerCode: string,
  plays: TocPlay[]
): {
  pendingExposure: number;
  exposureJournal: TocExposureEvent[];
  recycleCycles: TocRecycleCycle[];
  complianceFlags: TocComplianceFlag[];
  exposureAging: TocExposureAging;
} {
  const seatPlays = plays.filter(pl => pl.callSign === a.callSign);
  const pendingPlays = seatPlays.filter(
    pl => pl.status === 'placed' || pl.status === 'instruction'
  );
  let pending = 0;
  const journal: TocExposureEvent[] = [];
  for (const pl of seatPlays.slice(0, 5)) {
    if (pl.status === 'settled' || pl.status === 'placed' || pl.status === 'instruction') {
      journal.push({
        at: pl.placedAt,
        kind: pl.status === 'instruction' ? 'reserve' : 'place',
        amount: pl.stake,
        pendingAfter: pl.status === 'settled' ? 0 : pl.stake,
        playId: pl.playId,
        expertId: pl.expertId,
        note: `${pl.market} ${pl.status}`,
      });
      if (pl.status !== 'settled') pending += pl.stake;
    }
    if (pl.status === 'settled' && pl.settledAt) {
      journal.push({
        at: pl.settledAt,
        kind: 'settle',
        amount: pl.stake,
        pendingAfter: 0,
        playId: pl.playId,
        expertId: pl.expertId,
      });
    }
    if (pl.status === 'blocked') {
      journal.push({
        at: pl.placedAt,
        kind: 'release',
        amount: pl.stake,
        pendingAfter: 0,
        playId: pl.playId,
        expertId: pl.expertId,
        note: pl.blockedReason || 'released',
      });
    }
  }
  if (a.gate12.housePrincipalOutstanding > 0 && pending === 0) {
    // synthetic open exposure blocked by Gate 12 narrative
    pending = Math.min(900, a.hardBalance || 900);
    journal.push({
      at: '2026-07-23T17:05:00.000Z',
      kind: 'reserve',
      amount: pending,
      pendingAfter: pending,
      expertId: a.expertId,
      note: 'Reservation held — Gate 12 blocks place',
    });
  }

  const recycleCycles: TocRecycleCycle[] = [];
  if (a.status === 'WARMED' || a.status === 'Limited') {
    const blocked = a.gate12.housePrincipalOutstanding > 0;
    recycleCycles.push({
      cycleId: `recycle-${a.callSign}-1`,
      startedAt: dayIso(11, 10),
      completedAt: blocked ? null : dayIso(14, 16),
      redeployAmount: Math.round(Math.max(a.hardBalance, 4000) * 0.5),
      status: blocked ? 'blocked' : a.capitalLocation === 'InSportsbook' ? 'open' : 'completed',
      blockReason: blocked ? 'Gate 12 principal outstanding' : undefined,
    });
  }

  const complianceFlags: TocComplianceFlag[] = [];
  if (a.limits.freshness === 'stale') {
    complianceFlags.push({
      id: `cf-limit-${a.callSign}`,
      severity: 'warn',
      code: 'LIMIT_STALE',
      summary: `Limit screenshot stale on ${a.callSign}`,
      at: a.limits.checkedAt ?? dayIso(8, 12),
      clearedAt: null,
    });
  }
  if (partnerCode === 'NOV' && a.status === 'New') {
    complianceFlags.push({
      id: `cf-kyc-${a.callSign}`,
      severity: 'critical',
      code: 'KYC_INCOMPLETE',
      summary: 'ONB KYC checklist incomplete',
      at: '2026-07-22T10:30:00.000Z',
      clearedAt: null,
    });
  }
  if (a.presence?.network?.vpnSuspected) {
    complianceFlags.push({
      id: `cf-vpn-${a.callSign}`,
      severity: 'info',
      code: 'VPN_SUSPECTED',
      summary: 'Egress VPN suspected on last session',
      at: a.presence.geo?.observedAt ?? dayIso(12, 8),
      clearedAt: null,
    });
  }

  return {
    pendingExposure: pending,
    exposureJournal: journal.sort((x, y) => x.at.localeCompare(y.at)),
    recycleCycles,
    complianceFlags,
    exposureAging: exposureAgingFromJournal(journal, pending),
  };
}

function partnerSlaBoard(p: TocPartner): {
  slaBoard: TocSlaBoard;
  openTasks: TocPartner['openTasks'];
} {
  const now = Date.parse('2026-07-24T00:00:00.000Z');
  const openTasks = p.openTasks.map(t => {
    if (t.status === 'Completed') return t;
    const created = Date.parse(t.createdAt ?? '2026-07-22T00:00:00.000Z');
    const ageMin = Math.max(0, Math.round((now - created) / 60_000));
    const slaDueAt =
      t.ballInCourt === 'Partner'
        ? new Date(created + 60 * 60_000).toISOString()
        : new Date(created + 4 * 60 * 60_000).toISOString();
    return { ...t, ageMin, slaDueAt };
  });
  const open = openTasks.filter(t => t.status !== 'Completed');
  const openPartnerTasks = open.filter(t => t.ballInCourt === 'Partner').length;
  const openOpsTasks = open.filter(
    t => t.ballInCourt === 'Ops' || t.ballInCourt === 'System'
  ).length;
  const oldestOpenAgeMin = open.reduce((m, t) => Math.max(m, t.ageMin ?? 0), 0);
  const breachCount7d =
    (p.messageLog?.filter(m => m.slaBreached).length ?? 0) +
    open.filter(t => t.slaDueAt && Date.parse(t.slaDueAt) < now).length;
  const onTimePct7d = Math.max(0.4, Math.min(0.98, 1 - breachCount7d / 20));
  const nextDue = [...open]
    .filter(t => t.slaDueAt)
    .sort((a, b) => String(a.slaDueAt).localeCompare(String(b.slaDueAt)))[0];
  return {
    openTasks,
    slaBoard: {
      openPartnerTasks,
      openOpsTasks,
      oldestOpenAgeMin,
      breachCount7d,
      onTimePct7d: Math.round(onTimePct7d * 100) / 100,
      nextDueTaskId: nextDue?.taskId,
    },
  };
}

function partnerAuditTrail(p: TocPartner): TocAuditTrailRow[] {
  const rows: TocAuditTrailRow[] = [];
  for (const e of [...p.softBalance.recentEntries]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8)) {
    rows.push({
      at: e.timestamp,
      kind: `soft.${e.entryType}`,
      callSign: e.callSign,
      amount: e.amount,
      summary: `${e.stakeholder} ${e.entryType}`,
    });
  }
  for (const a of p.accounts) {
    for (const g of (a.gate12Ledger ?? []).slice(-2)) {
      rows.push({
        at: g.at,
        kind: `gate12.${g.kind}`,
        callSign: a.callSign,
        amount: g.amount,
        summary: g.note || `${g.kind} rem ${g.remainingAfter}`,
      });
    }
  }
  for (const m of (p.messageLog ?? []).filter(x => x.slaBreached).slice(0, 3)) {
    rows.push({
      at: m.at,
      kind: 'sla.breach',
      callSign: m.callSign,
      summary: m.summary,
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 16);
}

function partnerBicHandoffs(p: TocPartner): TocBicHandoff[] {
  const rows: TocBicHandoff[] = [];
  for (const t of p.openTasks.filter(x => x.status !== 'Completed')) {
    if (t.taskType === 'PLAY' && t.ballInCourt === 'Partner') {
      rows.push({
        at: t.createdAt ?? dayIso(12, 19),
        taskId: t.taskId,
        taskType: t.taskType,
        from: 'Expert',
        to: 'Partner',
        reason: 'PLAY instruction delivered — ack required',
      });
    }
    if (t.taskType === 'LIMIT' && t.ballInCourt === 'Partner') {
      rows.push({
        at: dayIso(11, 10),
        taskId: t.taskId,
        taskType: t.taskType,
        from: 'Ops',
        to: 'Partner',
        reason: 'Limit screenshot refresh after rotor drift',
      });
    }
  }
  if (p.partnerCode === 'ASH') {
    rows.push({
      at: '2026-07-23T20:05:00.000Z',
      taskId: 'PLAY-ASH-001-20260723-190000-001',
      taskType: 'PLAY',
      from: 'Partner',
      to: 'Ops',
      reason: 'SLA breach — escalate to ops desk',
    });
  }
  if (p.partnerCode === 'PAT') {
    rows.push({
      at: '2026-07-20T18:30:00.000Z',
      taskId: 'PLAY-PAT-001-20260716-140000-001',
      taskType: 'PLAY',
      from: 'Partner',
      to: 'Expert',
      reason: 'Stake confirmed on Kalshi rail',
    });
    rows.push({
      at: '2026-07-20T18:45:00.000Z',
      taskId: 'PLAY-PAT-001-20260716-140000-001',
      taskType: 'PLAY',
      from: 'Expert',
      to: 'Ops',
      reason: 'Settle window — ops monitors exposure',
    });
  }
  if (p.partnerCode === 'NOV') {
    rows.push({
      at: '2026-07-22T10:20:00.000Z',
      taskId: 'ONB-NOV-001-20260722-100000-001',
      taskType: 'ONB',
      from: 'Ops',
      to: 'Partner',
      reason: 'KYC checklist issued',
    });
    rows.push({
      at: '2026-07-23T09:05:00.000Z',
      taskId: 'FUND-NOV-001-20260723-090000-001',
      taskType: 'FUND',
      from: 'System',
      to: 'Ops',
      reason: 'Rail unconfirmed — block FUND corridor',
    });
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

function accountWarmPlaybook(a: TocAccount, partnerCode: string): TocWarmPlaybookStep[] {
  const warm1Done = a.warmupProgress.completed >= 1 || a.warmupCount >= 1;
  const warm2Done = a.warmupProgress.completed >= 2 || a.warmupCount >= 2;
  const limitsOk = a.limits.freshness === 'fresh' || a.status === 'WARMED';
  const funded = a.status !== 'New';
  const steps: TocWarmPlaybookStep[] = [
    {
      stepId: 'fund-received',
      label: 'FUND received on primary rail',
      status: funded ? 'done' : partnerCode === 'NOV' ? 'blocked' : 'pending',
      requiredForPlay: true,
      completedAt: funded ? dayIso(8, 9) : undefined,
    },
    {
      stepId: 'limits-screenshot',
      label: 'LIMIT screenshot on file',
      status: limitsOk ? 'done' : a.limits.freshness === 'stale' ? 'in_progress' : 'pending',
      requiredForPlay: true,
      completedAt: limitsOk ? (a.limits.checkedAt ?? dayIso(9)) : undefined,
    },
    {
      stepId: 'warm-play-1',
      label: 'Warm play 1 (low stake)',
      status: warm1Done ? 'done' : a.status === 'Warming' ? 'in_progress' : 'pending',
      requiredForPlay: true,
      completedAt: warm1Done ? dayIso(10, 14) : undefined,
    },
    {
      stepId: 'warm-play-2',
      label: 'Warm play 2 (tagged)',
      status: warm2Done ? 'done' : warm1Done ? 'in_progress' : 'pending',
      requiredForPlay: true,
      completedAt: warm2Done ? dayIso(11, 15) : undefined,
    },
    {
      stepId: 'limits-refresh',
      label: 'Post-warm LIMIT refresh',
      status:
        a.status === 'WARMED'
          ? 'done'
          : warm2Done
            ? 'in_progress'
            : a.limits.freshness === 'stale'
              ? 'blocked'
              : 'pending',
      requiredForPlay: true,
      completedAt: a.status === 'WARMED' ? dayIso(12, 8) : undefined,
    },
    {
      stepId: 'warmed-clear',
      label: 'WARMED clearance',
      status:
        a.status === 'WARMED'
          ? 'done'
          : a.status === 'Warming' && warm2Done
            ? 'in_progress'
            : 'pending',
      requiredForPlay: true,
      completedAt: a.status === 'WARMED' ? dayIso(13, 10) : undefined,
    },
  ];
  if (partnerCode === 'NOV' && a.status === 'New') {
    const fund = steps.find(s => s.stepId === 'fund-received');
    if (fund) fund.status = 'blocked';
  }
  return steps;
}

function partnerPhoneLog(p: TocPartner): TocPhoneLogEntry[] {
  const phones = p.profile?.phones ?? [];
  if (phones.length === 0) return [];
  const rows: TocPhoneLogEntry[] = [];
  for (const ph of phones) {
    rows.push({
      at: dayIso(9, 8),
      phoneId: ph.id,
      event: 'assign',
      summary: `Assigned to ${ph.assignedCallSign ?? p.partnerCode}`,
    });
    if (ph.dataPlan && ph.dataPlan.usedGb / ph.dataPlan.gbMonth > 0.75) {
      rows.push({
        at: dayIso(14, 17),
        phoneId: ph.id,
        event: 'data_threshold',
        summary: `Data ${ph.dataPlan.usedGb.toFixed(1)}/${ph.dataPlan.gbMonth} GB — renew ${ph.dataPlan.renewsAt?.slice(0, 10) ?? 'soon'}`,
      });
    }
    if (ph.dataPlan?.hotspot) {
      rows.push({
        at: dayIso(15, 12),
        phoneId: ph.id,
        event: 'hotspot_on',
        summary: 'Hotspot enabled for slip capture',
      });
    }
    if (ph.status === 'warming') {
      rows.push({
        at: dayIso(11, 7),
        phoneId: ph.id,
        event: 'renew',
        summary: `${ph.dataPlan?.name ?? 'Plan'} renewal queued`,
      });
    }
    if (p.partnerCode === 'NOV' && ph.status === 'active') {
      rows.push({
        at: dayIso(12, 9),
        phoneId: ph.id,
        event: 'sim_swap',
        summary: 'SIM swap pending carrier KYC',
      });
    }
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

function softPendingDeploymentItems(p: TocPartner): TocPendingDeploymentItem[] {
  const pending = p.softBalance.pendingDeployments;
  if (pending.count === 0) return [];
  const items: TocPendingDeploymentItem[] = [];
  const fundTasks = p.openTasks.filter(t => t.taskType === 'FUND' && t.status !== 'Completed');
  let remaining = pending.totalAmount;
  for (let i = 0; i < pending.count && remaining > 0; i++) {
    const task = fundTasks[i];
    const acct = p.accounts.find(a => a.callSign === task?.callSign) ?? p.accounts[i];
    const amount = Math.min(
      remaining,
      task ? Math.round(remaining / (pending.count - i)) : remaining
    );
    const blocked = p.partnerCode === 'NOV' || p.rails.some(r => !r.confirmed);
    items.push({
      id: `pdep-${p.partnerCode.toLowerCase()}-${i + 1}`,
      callSign: acct?.callSign ?? p.accounts[0]!.callSign,
      amount,
      taskId: task?.taskId,
      queuedAt: task?.createdAt ?? dayIso(11 + i, 9),
      status: blocked ? 'blocked' : i === 0 ? 'gate_check' : 'queued',
      blockReason: blocked ? 'Rail or ONB gate blocks deploy' : undefined,
    });
    remaining -= amount;
  }
  return items;
}

function partnerReadinessTrend(p: TocPartner, openBic: number): TocReadinessTrendPoint[] {
  return [0, 1, 2, 3, 4, 5, 6].map(i => {
    const day = dayIso(10 + i, 0).slice(0, 10);
    const score = Math.max(0.08, Math.min(0.99, p.readiness.score - (6 - i) * 0.02 + i * 0.015));
    const playable = Math.max(
      0,
      Math.min(
        p.readiness.playableAccountCount,
        p.readiness.playableAccountCount - (6 - i) + (p.partnerCode === 'PAT' ? 1 : 0)
      )
    );
    return {
      day,
      score: Math.round(score * 100) / 100,
      playableAccounts: playable,
      openBic: Math.max(0, openBic - (6 - i)),
    };
  });
}

function partnerDealSplitAudit(p: TocPartner): TocDealSplitAudit {
  const pkg = p.package;
  const byTask = new Map<
    string,
    { partner: number; expert: number; house: number; at: string; playId?: string } // brand-ok — Soft ProfitSplit fixture join key
  >();
  for (const e of p.softBalance.recentEntries) {
    if (e.entryType !== 'ProfitSplit') continue;
    const cur = byTask.get(e.taskId) ?? {
      partner: 0,
      expert: 0,
      house: 0,
      at: e.timestamp,
    };
    if (e.stakeholder === 'Partner') cur.partner += e.amount;
    if (e.stakeholder === 'Expert') cur.expert += e.amount;
    if (e.stakeholder === 'House') cur.house += e.amount;
    cur.at = e.timestamp;
    byTask.set(e.taskId, cur);
  }
  const rows = [...byTask.entries()].slice(-8).map(([taskId, splits]) => {
    const total = splits.partner + splits.expert + splits.house;
    const pPct = pkg.partnerPct > 1 ? pkg.partnerPct / 100 : pkg.partnerPct;
    const ePct = pkg.expertPct > 1 ? pkg.expertPct / 100 : pkg.expertPct;
    const expected = {
      partner: Math.round(total * pPct),
      expert: Math.round(total * ePct),
      house: total - Math.round(total * pPct) - Math.round(total * ePct),
    };
    const deltaTotal =
      Math.abs(splits.partner - expected.partner) +
      Math.abs(splits.expert - expected.expert) +
      Math.abs(splits.house - expected.house);
    const play = p.recentPlays.find(pl => pl.taskId === taskId);
    return {
      taskId,
      playId: play?.playId,
      at: splits.at,
      expected,
      actual: { partner: splits.partner, expert: splits.expert, house: splits.house },
      ok: deltaTotal <= 2,
      deltaTotal,
    };
  });
  return {
    asOf: '2026-07-23T18:00:00.000Z',
    packagePct: {
      partner: pkg.partnerPct,
      expert: pkg.expertPct,
      house: pkg.housePct,
    },
    rows,
    driftCount: rows.filter(r => !r.ok).length,
  };
}

function partnerFundCorridor(p: TocPartner): TocFundCorridor | undefined {
  const fundTask = p.openTasks.find(t => t.taskType === 'FUND' && t.status !== 'Completed');
  const primaryRail = p.rails.find(r => r.confirmed) ?? p.rails[0];
  const show =
    p.partnerCode === 'NOV' ||
    fundTask != null ||
    p.flowStage === 'FUND' ||
    p.flowStage === 'PLAY' ||
    p.flowStage === 'WD' ||
    p.flowStage === 'WARM';
  if (!show) return undefined;
  const target = p.partnerCode === 'NOV' ? 5_000 : p.partnerCode === 'ASH' ? 12_000 : 15_000;
  const funded = p.accounts.reduce((n, a) => n + (a.status !== 'New' ? a.hardBalance : 0), 0);
  const hasUnconfirmedRail = p.rails.some(r => !r.confirmed);
  const railBlocked =
    !primaryRail?.confirmed ||
    (hasUnconfirmedRail && (p.partnerCode === 'NOV' || p.flowStage === 'ONB'));
  let status: TocFundCorridor['status'] = 'funded';
  if (railBlocked) status = 'blocked';
  else if (funded === 0) status = 'open';
  else if (funded < target) status = 'partial';
  return {
    targetAmount: target,
    fundedAmount: Math.min(funded, target),
    railId: primaryRail?.id ?? 'rail-unknown',
    status,
    blockReason: railBlocked
      ? hasUnconfirmedRail
        ? 'Unconfirmed payout rail blocks FUND corridor'
        : 'Rail unconfirmed — FUND corridor blocked'
      : undefined,
    taskId: fundTask?.taskId,
    updatedAt: '2026-07-23T18:00:00.000Z',
  };
}

function partnerTaskTimeline(p: TocPartner): TocTaskTimelineEntry[] {
  const rows: TocTaskTimelineEntry[] = [];
  for (const t of p.openTasks) {
    rows.push({
      at: t.createdAt ?? dayIso(10, 9),
      taskId: t.taskId,
      taskType: t.taskType,
      event: 'created',
      ballInCourt: t.ballInCourt,
      summary: `${t.taskType} opened on ${t.callSign}`,
    });
    if (t.status !== 'Completed' && t.ageMin != null && t.ageMin > 45) {
      rows.push({
        at: t.slaDueAt ?? dayIso(12, 14),
        taskId: t.taskId,
        taskType: t.taskType,
        event: 'sla_breach',
        ballInCourt: t.ballInCourt,
        summary: t.nextAction,
      });
    }
    if (t.taskType === 'PLAY' && t.status === 'PendingPartner') {
      rows.push({
        at: dayIso(11, 19),
        taskId: t.taskId,
        taskType: t.taskType,
        event: 'assigned',
        ballInCourt: 'Partner',
        summary: 'Instruction delivered — awaiting partner ack',
      });
    }
  }
  if (p.partnerCode === 'NOV') {
    rows.push({
      at: '2026-07-23T09:10:00.000Z',
      taskId: 'FUND-NOV-001-20260723-090000-001',
      taskType: 'FUND',
      event: 'blocked',
      ballInCourt: 'System',
      summary: 'FUND blocked pending rail confirm',
    });
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

function accountCapitalLocationSeries(
  a: TocAccount,
  partnerCode: string
): TocAccount['capitalLocationSeries'] {
  const ledger = a.capitalLedger ?? [];
  if (ledger.length === 0) {
    return [
      {
        at: dayIso(8, 10),
        location: a.capitalLocation,
        hardBalance: a.hardBalance,
        note: 'Current snapshot',
      },
    ];
  }
  const points = ledger.map(m => ({
    at: m.at,
    location: m.to,
    hardBalance: m.amount,
    note: m.note,
  }));
  points.push({
    at: '2026-07-23T18:00:00.000Z',
    location: a.capitalLocation,
    hardBalance: a.hardBalance,
    note: partnerCode === 'ASH' ? 'Drum float after warm' : 'Latest book balance',
  });
  return points.sort((x, y) => x.at.localeCompare(y.at));
}

function accountGateSnapshot(a: TocAccount, p: TocPartner): TocAccount['gateSnapshot'] {
  const rail = p.rails.find(r => r.id === a.primaryRailId) ?? p.rails[0];
  const gates: Array<{ gateId: TocGateId; ok: boolean; reason: string }> = [
    {
      gateId: 'play_warmed',
      ok: a.warmupCount >= 2 && a.status === 'WARMED',
      reason:
        a.status === 'WARMED'
          ? `WARMED warmup=${a.warmupCount}`
          : `warmup=${a.warmupCount} status=${a.status}`,
    },
    {
      gateId: 'confirmed_rail',
      ok: !!rail?.confirmed,
      reason: rail?.confirmed ? `${rail.label} confirmed` : 'Rail unconfirmed',
    },
    {
      gateId: 'limit_fresh_drum',
      ok: a.limits.freshness === 'fresh',
      reason: `limits ${a.limits.freshness}`,
    },
    {
      gateId: 'fund_rail_ready',
      ok: !!rail?.confirmed,
      reason: rail?.confirmed ? 'FUND rail ready' : 'FUND blocked — confirm rail',
    },
    {
      gateId: 'warm_sequential',
      ok: a.warmupProgress.completed >= a.warmupProgress.required || a.warmupCount >= 2,
      reason: `warm ${a.warmupProgress.completed}/${a.warmupProgress.required}`,
    },
  ];
  const passed = gates.filter(g => g.ok).length;
  return {
    evaluatedAt: '2026-07-23T18:00:00.000Z',
    passed,
    failed: gates.length - passed,
    gates,
  };
}

function partnerNetCapital(p: TocPartner): TocNetCapitalPosition {
  const entries = p.softBalance.recentEntries;
  const sum = (type: TocSoftEntry['entryType']) =>
    entries.filter(e => e.entryType === type).reduce((n, e) => n + e.amount, 0);
  const deposits = sum('CapitalDeployment');
  const withdrawals = sum('CapitalReturn');
  const losses = sum('Loss');
  const priming = sum('CostOfPriming');
  const expenses = Math.round(priming * 0.25);
  const railFees = p.partnerCode === 'NOV' ? 0 : 49;
  const net = deposits - withdrawals - expenses - railFees - losses - priming;
  return {
    deposits,
    withdrawals,
    expenses,
    railFees,
    losses,
    priming,
    net: Math.round(net),
    asOf: '2026-07-23T18:00:00.000Z',
  };
}

function attachAccountLedgers(p: TocPartner): TocPartner {
  const accountsBase = p.accounts.map(a => ({
    ...a,
    ...accountCapitalLedgers(a, p.partnerCode),
    limitHistory: limitHistoryFor(a),
    ...exposureAndRecycle(a, p.partnerCode, p.recentPlays),
    constraint: accountConstraint(a, p.partnerCode),
    warmPlaybook: accountWarmPlaybook(a, p.partnerCode),
  }));
  const withRails = { ...p, accounts: accountsBase, rails: railConfirmHistory(p) };
  const sheet = softBalanceSheet(withRails);
  const { slaBoard, openTasks } = partnerSlaBoard(withRails);
  const withTasks = { ...withRails, openTasks };
  const accounts = withTasks.accounts.map(a => ({
    ...a,
    capitalLocationSeries: accountCapitalLocationSeries(a, p.partnerCode),
    gateSnapshot: accountGateSnapshot(a, withTasks),
  }));
  const partnerFlags: TocComplianceFlag[] = [
    ...accounts.flatMap(a => a.complianceFlags ?? []),
    ...(p.rails.some(r => !r.confirmed)
      ? [
          {
            id: `cf-rail-${p.partnerCode}`,
            severity: 'warn' as const,
            code: 'RAIL_UNCONFIRMED',
            summary: 'Unconfirmed payout rail blocks FUND/WD',
            at: '2026-07-23T09:00:00.000Z',
            clearedAt: null,
          },
        ]
      : []),
  ];
  const wdPipeline = partnerWdPipeline({ ...withTasks, accounts });
  const withPass7 = {
    ...withTasks,
    accounts,
    slaBoard,
    auditTrail: partnerAuditTrail(withTasks),
    complianceFlags: partnerFlags,
    netCapital: partnerNetCapital(withTasks),
    wdPipeline,
    exposureAging: rollupExposureAging(accounts),
    onbChecklist: partnerOnbChecklist(withTasks),
    settlementCalendar: partnerSettlementCalendar({ ...withTasks, accounts, wdPipeline }),
    exceptionResolution: partnerExceptionResolution(withTasks),
    playSettlementQueue: partnerPlaySettlementQueue(withTasks),
    bicHandoffs: partnerBicHandoffs(withTasks),
    fundCorridor: partnerFundCorridor(withTasks),
    taskTimeline: partnerTaskTimeline(withTasks),
    readinessTrend: partnerReadinessTrend(
      withTasks,
      openTasks.filter(t => t.status !== 'Completed').length
    ),
    dealSplitAudit: partnerDealSplitAudit(withTasks),
    profile: withTasks.profile
      ? {
          ...withTasks.profile,
          botCommandLog: partnerBotCommandLog(withTasks),
          phoneLog: partnerPhoneLog(withTasks),
        }
      : withTasks.profile,
    softBalance: {
      ...withTasks.softBalance,
      balanceSheet: sheet,
      pendingDeploymentItems: softPendingDeploymentItems(withTasks),
    },
    healthPulse: [0, 1, 2, 3, 4, 5, 6].map(i => {
      const day = dayIso(10 + i, 0).slice(0, 10);
      const softT = p.softBalance.recentEntries
        .filter(e => e.entryType === 'ProfitSplit' && e.timestamp.startsWith(day))
        .reduce((n, e) => n + e.amount, 0);
      const sla = p.messageLog?.filter(m => m.slaBreached && m.at.startsWith(day)).length ?? 0;
      const openBic = openTasks.filter(t => t.status !== 'Completed').length;
      const readiness = Math.max(
        0.1,
        Math.min(0.99, p.readiness.score - i * 0.01 + softT / 10_000)
      );
      return {
        day,
        readiness: Math.round(readiness * 100) / 100,
        openBic: Math.max(0, openBic - (6 - i)),
        slaBreaches: sla,
        softT,
      };
    }),
  };
  return withPass7;
}

function deepenExpertRoi(experts: TocExpert[], partners: TocPartner[]): TocExpert[] {
  const plays = partners.flatMap(p =>
    p.recentPlays.map(pl => ({ ...pl, partnerCode: p.partnerCode }))
  );
  return experts.map(e => {
    if (!e.profile) return e;
    const mine = plays.filter(pl => pl.expertId === e.expertId);
    const settled = mine.filter(pl => pl.status === 'settled');
    const wins = settled.filter(pl => pl.result === 'win').length;
    const t30d = settled.reduce((n, pl) => n + Math.max(0, pl.pnl ?? 0), 0);
    const byMap = new Map<
      string,
      { callSign: string; partnerCode: string; t: number; n: number }
    >();
    for (const pl of settled) {
      const key = pl.callSign;
      const cur = byMap.get(key) ?? {
        callSign: pl.callSign,
        partnerCode: pl.partnerCode,
        t: 0,
        n: 0,
      };
      cur.t += Math.max(0, pl.pnl ?? 0);
      cur.n += 1;
      byMap.set(key, cur);
    }
    const eligibility = partners.flatMap(p =>
      p.accounts
        .filter(
          a =>
            a.expertId === e.expertId ||
            p.recentPlays.some(pl => pl.expertId === e.expertId && pl.callSign === a.callSign)
        )
        .slice(0, 3)
        .map(a => {
          const g12Block = a.gate12.housePrincipalOutstanding > 0;
          const warmBlock = a.warmupCount < 2;
          const eligible = a.status === 'WARMED' && !g12Block && !warmBlock;
          const reason = g12Block
            ? 'Gate 12 principal outstanding'
            : warmBlock
              ? `Warm ${a.warmupCount}/2`
              : a.status !== 'WARMED'
                ? `Status ${a.status}`
                : 'Eligible';
          return {
            callSign: a.callSign,
            partnerCode: p.partnerCode,
            eligible,
            reason,
          };
        })
    );
    // Ensure at least one row per expert from plays
    const elig =
      eligibility.length > 0
        ? eligibility
        : mine.slice(0, 2).map(pl => ({
            callSign: pl.callSign,
            partnerCode: pl.partnerCode,
            eligible: true,
            reason: 'Eligible',
          }));

    const releaseCards: TocReleaseCard[] = mine.slice(0, 6).map(pl => {
      const deferred = pl.status === 'blocked' || pl.status === 'instruction';
      return {
        releaseId: `rel-${e.expertId}-${pl.playId}`,
        at: pl.placedAt,
        callSign: pl.callSign,
        partnerCode: pl.partnerCode,
        stake: pl.stake,
        market: pl.market,
        status: deferred
          ? pl.status === 'blocked'
            ? 'deferred'
            : 'reserved'
          : pl.status === 'settled'
            ? 'settled'
            : pl.status === 'placed'
              ? 'placed'
              : 'reserved',
        deferredReason: deferred
          ? pl.blockedReason ||
            (pl.status === 'instruction' ? 'Awaiting partner ack' : 'play.gate.defer')
          : undefined,
        playId: pl.playId,
      };
    });
    // Ensure at least one deferred card for marcus narrative
    if (e.expertId === 'marcus' && !releaseCards.some(c => c.status === 'deferred')) {
      releaseCards.push({
        releaseId: `rel-marcus-defer-ash003`,
        at: '2026-07-23T17:00:00.000Z',
        callSign: 'ASH-003',
        partnerCode: 'ASH',
        stake: 900,
        market: 'NFL',
        status: 'deferred',
        deferredReason: 'Gate 12 principal outstanding — play.gate.defer',
      });
    }

    return {
      ...e,
      profile: {
        ...e.profile,
        roi: {
          t30d,
          plays30d: mine.length,
          winRate: settled.length === 0 ? 0 : Math.round((wins / settled.length) * 1000) / 1000,
          avgStake:
            mine.length === 0
              ? 0
              : Math.round(mine.reduce((n, pl) => n + pl.stake, 0) / mine.length),
          byCallSign: [...byMap.values()].sort((a, b) => b.t - a.t),
          eligibility: elig,
        },
        releaseCards,
      },
    };
  });
}

function demoBufferHistory(principalTotal: number): TocBufferHistoryPoint[] {
  return [0, 1, 2, 3, 4, 5, 6].map(i => {
    const principal = Math.round(principalTotal * (1.15 - i * 0.02));
    const houseFloatHard = 38_000 + i * 700;
    const floatRatio = Math.round((houseFloatHard / 50_000) * 100) / 100;
    const settlementFloatRatio = Math.round((0.55 - i * 0.02) * 1000) / 1000;
    return {
      day: dayIso(10 + i, 0).slice(0, 10),
      houseFloatHard,
      floatRatio,
      settlementFloatRatio,
      principalOutstanding: principal,
      throttleOnboarding: settlementFloatRatio >= 0.6,
    };
  });
}

export type TocDeepenResult = {
  partners: TocPartner[];
  experts: TocExpert[];
  experiments: TocExperiment[];
  profiles: ReturnType<typeof summarizeProfiles>;
  bufferHistory: TocBufferHistoryPoint[];
  channelRollup: {
    messageLogEntries: number;
    messageLogSlaBreaches: number;
    experimentOutcomes: number;
    avgExperimentLiftPct: number | null;
    rotorSamples: number;
    capitalMoves: number;
    warmCyclesOpen: number;
    gate12Events: number;
    bufferHistoryDays: number;
    balanceSheetsOk: number;
    limitRefreshes: number;
    railConfirmEvents: number;
    switchbackWindows: number;
    releaseCards: number;
    deferredPlays: number;
    pendingExposureTotal: number;
    recycleCyclesOpen: number;
    complianceOpen: number;
    auditTrailRows: number;
    slaBreaches7d: number;
    wdQueuedTotal: number;
    wdBlockedTotal: number;
    exposureAging72hPlus: number;
    onbChecklistPending: number;
    settlementSlots7d: number;
    constraintRopeCount: number;
    playSettlementPending: number;
    exceptionResolutionOpen: number;
    botCommands24h: number;
    bicHandoffsTotal: number;
    warmPlaybookPending: number;
    phoneLogEvents: number;
    avgLiquidityUtilPct: number | null;
    fundCorridorsBlocked: number;
    railUtilHighCount: number;
    accountGatesFailed: number;
    capitalLocationMoves: number;
    pendingDeployItems: number;
    playInstructionsStale: number;
    dealSplitDrift: number;
  };
};

/** Soft/play calendar + desk scorecards + MessageLog / rotor / experiment outcomes. */
export function deepenSeedNarrative(
  partners: TocPartner[],
  experts: TocExpert[],
  experiments: TocExperiment[] = []
): TocDeepenResult {
  const denserPartners = partners.map(p => {
    let recentPlays = p.recentPlays;
    let entries = [...p.softBalance.recentEntries];
    let bottlenecks = [...p.bottlenecks];

    if (p.partnerCode === 'ASH') {
      recentPlays = [...recentPlays, ...withPlacement(p, ashExtraPlays())];
      entries = [...entries, ...ashExtraSoft()];
    }
    if (p.partnerCode === 'PAT') {
      recentPlays = [...recentPlays, ...withPlacement(p, patExtraPlays())];
      entries = [...entries, ...patExtraSoft()];
    }
    if (p.partnerCode === 'NOV') {
      entries = [...entries, ...novExtraSoft()];
    }
    bottlenecks = [...bottlenecks, ...resolvedBottlenecks(p.partnerCode)];

    const byStakeholder = recomputeSoftTotals(entries);
    byStakeholder.House = Math.max(byStakeholder.House, p.softBalance.byStakeholder.House);

    const next: TocPartner = {
      ...p,
      recentPlays,
      bottlenecks,
      messageLog: partnerMessageLog(p.partnerCode),
      rotorSeries: partnerRotor(p.partnerCode),
      exceptionTimeline: partnerExceptionTimeline(p),
      softBalance: {
        ...p.softBalance,
        recentEntries: entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
        byStakeholder: {
          Partner: Math.max(byStakeholder.Partner, p.softBalance.byStakeholder.Partner),
          Expert: Math.max(byStakeholder.Expert, p.softBalance.byStakeholder.Expert),
          House: byStakeholder.House,
        },
      },
    };
    return attachAccountLedgers(deepenPartnerDesk(next));
  });

  const denserExperts = deepenExpertRoi(experts.map(deepenAgentDesk), denserPartners);
  const denserExps = deepenExperiments(experiments, denserPartners);
  const lifts = denserExps
    .map(e => e.outcome?.liftPct)
    .filter((x): x is number => typeof x === 'number');
  const messageLogEntries = denserPartners.reduce((n, p) => n + (p.messageLog?.length ?? 0), 0);
  const messageLogSlaBreaches = denserPartners.reduce(
    (n, p) => n + (p.messageLog?.filter(m => m.slaBreached).length ?? 0),
    0
  );
  const rotorSamples = denserPartners.reduce((n, p) => n + (p.rotorSeries?.length ?? 0), 0);
  const capitalMoves = denserPartners.reduce(
    (n, p) => n + p.accounts.reduce((m, a) => m + (a.capitalLedger?.length ?? 0), 0),
    0
  );
  const warmCyclesOpen = denserPartners.reduce(
    (n, p) =>
      n +
      p.accounts.reduce(
        (m, a) => m + (a.warmCycles?.filter(w => w.status === 'open').length ?? 0),
        0
      ),
    0
  );
  const gate12Events = denserPartners.reduce(
    (n, p) => n + p.accounts.reduce((m, a) => m + (a.gate12Ledger?.length ?? 0), 0),
    0
  );
  const principalTotal = denserPartners.reduce(
    (n, p) => n + p.accounts.reduce((m, a) => m + a.gate12.housePrincipalOutstanding, 0),
    0
  );
  const bufferHistory = demoBufferHistory(principalTotal);
  const balanceSheetsOk = denserPartners.filter(p => p.softBalance.balanceSheet?.identityOk).length;
  const limitRefreshes = denserPartners.reduce(
    (n, p) => n + p.accounts.reduce((m, a) => m + (a.limitHistory?.length ?? 0), 0),
    0
  );
  const railConfirmEvents = denserPartners.reduce(
    (n, p) => n + p.rails.reduce((m, r) => m + (r.confirmHistory?.length ?? 0), 0),
    0
  );
  const switchbackWindows = denserExps.reduce((n, e) => n + (e.switchbackWindows?.length ?? 0), 0);
  const releaseCards = denserExperts.reduce(
    (n, e) => n + (e.profile?.releaseCards?.length ?? 0),
    0
  );
  const deferredPlays = denserExperts.reduce(
    (n, e) => n + (e.profile?.releaseCards?.filter(c => c.status === 'deferred').length ?? 0),
    0
  );
  const pendingExposureTotal = denserPartners.reduce(
    (n, p) => n + p.accounts.reduce((m, a) => m + (a.pendingExposure ?? 0), 0),
    0
  );
  const recycleCyclesOpen = denserPartners.reduce(
    (n, p) =>
      n +
      p.accounts.reduce(
        (m, a) =>
          m +
          (a.recycleCycles?.filter(c => c.status === 'open' || c.status === 'blocked').length ?? 0),
        0
      ),
    0
  );
  const complianceOpen = denserPartners.reduce(
    (n, p) => n + (p.complianceFlags?.filter(f => f.clearedAt == null).length ?? 0),
    0
  );
  const auditTrailRows = denserPartners.reduce((n, p) => n + (p.auditTrail?.length ?? 0), 0);
  const slaBreaches7d = denserPartners.reduce((n, p) => n + (p.slaBoard?.breachCount7d ?? 0), 0);
  const wdQueuedTotal = denserPartners.reduce(
    (n, p) =>
      n +
      (p.wdPipeline?.filter(w => w.status === 'queued' || w.status === 'gate_check').length ?? 0),
    0
  );
  const wdBlockedTotal = denserPartners.reduce(
    (n, p) => n + (p.wdPipeline?.filter(w => w.status === 'blocked').length ?? 0),
    0
  );
  const exposureAging72hPlus = denserPartners.reduce(
    (n, p) => n + (p.exposureAging?.bucket72hPlus ?? 0),
    0
  );
  const onbChecklistPending = denserPartners.reduce(
    (n, p) =>
      n +
      (p.onbChecklist?.filter(s => s.status === 'pending' || s.status === 'blocked').length ?? 0),
    0
  );
  const settlementSlots7d = denserPartners.reduce(
    (n, p) => n + (p.settlementCalendar?.length ?? 0),
    0
  );
  const constraintRopeCount = denserPartners.reduce(
    (n, p) =>
      n + p.accounts.filter(a => a.constraint?.focus === 'rope' || a.constraint?.ropeBroken).length,
    0
  );
  const playSettlementPending = denserPartners.reduce(
    (n, p) => n + (p.playSettlementQueue?.length ?? 0),
    0
  );
  const exceptionResolutionOpen = denserPartners.reduce(
    (n, p) =>
      n +
      (p.exceptionResolution?.filter(r => r.status === 'open' || r.status === 'assigned').length ??
        0),
    0
  );
  const botCommands24h = denserPartners.reduce(
    (n, p) => n + (p.profile?.botCommandLog?.length ?? 0),
    0
  );
  const bicHandoffsTotal = denserPartners.reduce((n, p) => n + (p.bicHandoffs?.length ?? 0), 0);
  const warmPlaybookPending = denserPartners.reduce(
    (n, p) =>
      n +
      p.accounts.reduce(
        (m, a) =>
          m +
          (a.warmPlaybook?.filter(s => s.status === 'pending' || s.status === 'blocked').length ??
            0),
        0
      ),
    0
  );
  const phoneLogEvents = denserPartners.reduce((n, p) => n + (p.profile?.phoneLog?.length ?? 0), 0);
  const utilSamples = denserExperts.flatMap(
    e => e.profile?.liquidityUtilSeries?.slice(-1).map(u => u.utilPct) ?? []
  );
  const avgLiquidityUtilPct =
    utilSamples.length === 0
      ? null
      : Math.round((utilSamples.reduce((a, b) => a + b, 0) / utilSamples.length) * 10) / 10;
  const fundCorridorsBlocked = denserPartners.filter(
    p => p.fundCorridor?.status === 'blocked'
  ).length;
  const railUtilHighCount = denserPartners.reduce(
    (n, p) => n + p.rails.filter(r => (r.utilization?.pctDaily ?? 0) >= 80).length,
    0
  );
  const accountGatesFailed = denserPartners.reduce(
    (n, p) => n + p.accounts.reduce((m, a) => m + (a.gateSnapshot?.failed ?? 0), 0),
    0
  );
  const capitalLocationMoves = denserPartners.reduce(
    (n, p) =>
      n + p.accounts.reduce((m, a) => Math.max(0, (a.capitalLocationSeries?.length ?? 1) - 1), 0),
    0
  );
  const pendingDeployItems = denserPartners.reduce(
    (n, p) => n + (p.softBalance.pendingDeploymentItems?.length ?? 0),
    0
  );
  const playInstructionsStale = denserPartners.reduce(
    (n, p) =>
      n +
      p.recentPlays.filter(pl => pl.status === 'instruction' && (pl.instructionAgeMin ?? 0) > 60)
        .length,
    0
  );
  const dealSplitDrift = denserPartners.reduce(
    (n, p) => n + (p.dealSplitAudit?.driftCount ?? 0),
    0
  );

  return {
    partners: denserPartners,
    experts: denserExperts,
    experiments: denserExps,
    profiles: summarizeProfiles(denserPartners, denserExperts),
    bufferHistory,
    channelRollup: {
      messageLogEntries,
      messageLogSlaBreaches,
      experimentOutcomes: denserExps.filter(e => e.outcome).length,
      avgExperimentLiftPct:
        lifts.length === 0
          ? null
          : Math.round((lifts.reduce((a, b) => a + b, 0) / lifts.length) * 1000) / 1000,
      rotorSamples,
      capitalMoves,
      warmCyclesOpen,
      gate12Events,
      bufferHistoryDays: bufferHistory.length,
      balanceSheetsOk,
      limitRefreshes,
      railConfirmEvents,
      switchbackWindows,
      releaseCards,
      deferredPlays,
      pendingExposureTotal,
      recycleCyclesOpen,
      complianceOpen,
      auditTrailRows,
      slaBreaches7d,
      wdQueuedTotal,
      wdBlockedTotal,
      exposureAging72hPlus,
      onbChecklistPending,
      settlementSlots7d,
      constraintRopeCount,
      playSettlementPending,
      exceptionResolutionOpen,
      botCommands24h,
      bicHandoffsTotal,
      warmPlaybookPending,
      phoneLogEvents,
      avgLiquidityUtilPct,
      fundCorridorsBlocked,
      railUtilHighCount,
      accountGatesFailed,
      capitalLocationMoves,
      pendingDeployItems,
      playInstructionsStale,
      dealSplitDrift,
    },
  };
}

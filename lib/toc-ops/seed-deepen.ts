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
  TocBottleneck,
  TocBufferHistoryPoint,
  TocCapitalMove,
  TocExceptionEvent,
  TocExperiment,
  TocExpert,
  TocGate12Event,
  TocLimitRefresh,
  TocMessageLogEntry,
  TocPartner,
  TocPlay,
  TocRailConfirmEvent,
  TocReleaseCard,
  TocRotorPoint,
  TocSoftBalanceSheet,
  TocSoftEntry,
  TocSwitchbackWindow,
  TocWarmCycle,
} from './types.ts';

function withPlacement(partner: TocPartner, plays: TocPlay[]): TocPlay[] {
  const bySign = new Map(partner.accounts.map(a => [a.callSign, a.presence]));
  return plays.map(play => {
    if (play.status === 'blocked' || play.placement) return play;
    const pr = bySign.get(play.callSign);
    if (!pr) return play;
    return { ...play, placement: demoPlacementFromPresence(pr, play.placedAt) };
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

  return {
    ...e,
    profile: {
      ...e.profile,
      bookPermissions: venues,
      exposureLadder,
      clvDailyBps: clvDailyBps.slice(0, 21),
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
    return { ...r, confirmHistory: hist };
  });
}

function attachAccountLedgers(p: TocPartner): TocPartner {
  const accounts = p.accounts.map(a => ({
    ...a,
    ...accountCapitalLedgers(a, p.partnerCode),
    limitHistory: limitHistoryFor(a),
  }));
  const withRails = { ...p, accounts, rails: railConfirmHistory(p) };
  const sheet = softBalanceSheet(withRails);
  return {
    ...withRails,
    softBalance: {
      ...withRails.softBalance,
      balanceSheet: sheet,
    },
    healthPulse: [0, 1, 2, 3, 4, 5, 6].map(i => {
      const day = dayIso(10 + i, 0).slice(0, 10);
      const softT = p.softBalance.recentEntries
        .filter(e => e.entryType === 'ProfitSplit' && e.timestamp.startsWith(day))
        .reduce((n, e) => n + e.amount, 0);
      const sla = p.messageLog?.filter(m => m.slaBreached && m.at.startsWith(day)).length ?? 0;
      const openBic = p.openTasks.filter(t => t.status !== 'Completed').length;
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
    },
  };
}

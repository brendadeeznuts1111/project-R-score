/**
 * Second-pass demo seed densification — Soft/play calendar, desk scorecards,
 * rail health, proof vault, book permissions, exposure ladders.
 *
 * @see lib/toc-ops/profiles.ts
 * @see lib/toc-ops/fixture.ts
 */
import { demoPlacementFromPresence } from './presence.ts';
import { summarizeProfiles } from './profiles.ts';
import type {
  TocBottleneck,
  TocExpert,
  TocPartner,
  TocPlay,
  TocSoftEntry,
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
    lastFailureAt:
      r.confirmed && code === 'ASH' ? '2026-07-11T09:00:00.000Z' : null,
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

/** Append Soft/play calendar + desk scorecards / book permissions. */
export function deepenSeedNarrative(
  partners: TocPartner[],
  experts: TocExpert[]
): { partners: TocPartner[]; experts: TocExpert[]; profiles: ReturnType<typeof summarizeProfiles> } {
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
    bottlenecks = [...bottlenecks, ...resolvedBottlenecks(p.partnerCode)];

    const byStakeholder = recomputeSoftTotals(entries);
    // Preserve elevated House float from prior narrative when recompute undershoots
    byStakeholder.House = Math.max(byStakeholder.House, p.softBalance.byStakeholder.House);

    const next: TocPartner = {
      ...p,
      recentPlays,
      bottlenecks,
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
    return deepenPartnerDesk(next);
  });

  const denserExperts = experts.map(deepenAgentDesk);
  return {
    partners: denserPartners,
    experts: denserExperts,
    profiles: summarizeProfiles(denserPartners, denserExperts),
  };
}

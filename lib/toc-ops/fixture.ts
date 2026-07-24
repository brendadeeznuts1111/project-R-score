/**
 * Deterministic TOC Ops demo fixture (ASH · PAT · NOV) for Pages / portal.
 * Full ONB→FUND→LIMIT→WARM→PLAY→WD narrative + limits, plays, experiments.
 *
 * @see toc-ops-repo/src/db/seed.ts
 * @see toc-ops-repo/docs/system/EXPERIMENTS.md
 */
import type { TocExperiment, TocExpert, TocOpsSnapshot, TocPartner, TocPlay } from './types.ts';

/** Exact registered rule keys mirrored from toc-ops-repo bottleneck-rules. */
export const TOC_BOTTLENECK_RULE_KEYS = [
  'open_pending_partner_queue',
  'warmup_cycle_aging',
  'stale_limit_on_drum',
  'orphan_pending_exposure',
  'capital_in_book_warming',
  'telegram_lane_undelivered_cards',
  'rotor_drift_detected',
] as const;

export const TOC_BOTTLENECK_RECONCILE_PREFIX = 'reconcile_' as const;

const PKG = {
  id: 'pkg-default-70-20-10',
  partnerPct: 70,
  expertPct: 20,
  housePct: 10,
} as const;

function summarize(
  partners: TocPartner[],
  experiments: TocExperiment[],
  plays: TocPlay[]
): TocOpsSnapshot['summary'] {
  const byTaskType: Record<string, number> = {};
  const byBallInCourt: Record<string, number> = {};
  const byFlowStage: Record<string, number> = {};
  let warmed = 0;
  let warming = 0;
  let onboarding = 0;
  let confirmedRails = 0;
  let unconfirmedRails = 0;
  let openTasks = 0;
  let openOnb = 0;
  let openLimit = 0;
  let openWarm = 0;
  let openPlay = 0;
  let openBottlenecks = 0;
  let criticalBottlenecks = 0;
  let accounts = 0;
  let principalOutstandingTotal = 0;

  for (const p of partners) {
    if (p.status === 'Onboarding') onboarding++;
    byFlowStage[p.flowStage] = (byFlowStage[p.flowStage] ?? 0) + 1;
    for (const a of p.accounts) {
      accounts++;
      if (a.status === 'WARMED') warmed++;
      if (a.status === 'Warming') warming++;
      principalOutstandingTotal += a.gate12.housePrincipalOutstanding;
    }
    for (const r of p.rails) {
      if (r.confirmed) confirmedRails++;
      else unconfirmedRails++;
    }
    for (const t of p.openTasks) {
      if (t.status === 'Completed') continue;
      openTasks++;
      byTaskType[t.taskType] = (byTaskType[t.taskType] ?? 0) + 1;
      byBallInCourt[t.ballInCourt] = (byBallInCourt[t.ballInCourt] ?? 0) + 1;
      if (t.taskType === 'ONB') openOnb++;
      if (t.taskType === 'LIMIT') openLimit++;
      if (t.taskType === 'WARM') openWarm++;
      if (t.taskType === 'PLAY') openPlay++;
    }
    for (const b of p.bottlenecks) {
      if (b.resolvedAt == null) {
        openBottlenecks++;
        if (b.severity === 'critical') criticalBottlenecks++;
      }
    }
  }

  return {
    partners: partners.length,
    accounts,
    warmed,
    warming,
    onboarding,
    confirmedRails,
    unconfirmedRails,
    openTasks,
    openOnb,
    openLimit,
    openWarm,
    openPlay,
    openBottlenecks,
    criticalBottlenecks,
    principalOutstandingTotal,
    playsPending: plays.filter(p => p.result === 'pending' || p.status === 'placed').length,
    playsSettled: plays.filter(p => p.status === 'settled').length,
    playsBlocked: plays.filter(p => p.status === 'blocked').length,
    activeExperiments: experiments.filter(e => e.status === 'active').length,
    byTaskType,
    byBallInCourt,
    byFlowStage,
  };
}

function experts(): TocExpert[] {
  return [
    {
      expertId: 'marcus',
      displayName: 'Marcus',
      markets: ['NFL', 'NBA', 'MLB'],
      weight: 1.2,
    },
    {
      expertId: 'elena',
      displayName: 'Elena',
      markets: ['NFL', 'Tennis'],
      weight: 1.0,
    },
    {
      expertId: 'kai',
      displayName: 'Kai',
      markets: ['MLB', 'Soccer'],
      weight: 0.95,
    },
  ];
}

function experiments(): TocExperiment[] {
  return [
    {
      id: 'exp-routing-phase1-2026-07',
      name: 'Phase-1 play routing (static vs dynamic)',
      status: 'active',
      phase: 1,
      designMethod: 'switchback',
      metricName: 'placement_rate',
      hypothesis:
        'Dynamic expert routing raises placement_rate without ↑OE on Ball-in-Court thrash',
      factors: [{ name: 'routing', levels: ['static', 'dynamic'] }],
      variants: [
        { key: 'static', name: 'Static expert rank', config: { routing: 'static' } },
        { key: 'dynamic', name: 'Dynamic readiness weight', config: { routing: 'dynamic' } },
      ],
      assignments: [
        {
          partnerCode: 'ASH',
          variantKey: 'static',
          metricValue: 0.72,
          assignedAt: '2026-07-18T12:00:00.000Z',
        },
        {
          partnerCode: 'PAT',
          variantKey: 'dynamic',
          metricValue: 0.88,
          assignedAt: '2026-07-18T12:00:00.000Z',
        },
        {
          partnerCode: 'NOV',
          variantKey: 'static',
          metricValue: 0.12,
          assignedAt: '2026-07-22T10:00:00.000Z',
        },
      ],
      clusterBy: 'partner_code',
    },
    {
      id: 'exp-cut-ab-2026-06',
      name: 'Cut cascade A/B (completed)',
      status: 'completed',
      phase: 2,
      designMethod: 'factorial',
      metricName: 'throughput_t',
      hypothesis: 'Lower partner cut on recycle WD does not reduce T when Soft posts on time',
      factors: [{ name: 'cut', levels: ['std_70', 'alt_65'] }],
      variants: [
        { key: 'std_70', name: '70/20/10', config: { partnerPct: 70 } },
        { key: 'alt_65', name: '65/25/10', config: { partnerPct: 65 } },
      ],
      assignments: [
        {
          partnerCode: 'PAT',
          variantKey: 'std_70',
          metricValue: 2760,
          assignedAt: '2026-06-01T00:00:00.000Z',
        },
        {
          partnerCode: 'ASH',
          variantKey: 'alt_65',
          metricValue: 408,
          assignedAt: '2026-06-15T00:00:00.000Z',
        },
      ],
      clusterBy: 'package_id',
    },
  ];
}

function ashPartner(): TocPartner {
  return {
    partnerCode: 'ASH',
    status: 'Ready',
    telegramRef: 'tg:group:ash-demo',
    package: { ...PKG },
    flowStage: 'WARM',
    readiness: {
      score: 0.72,
      playableAccountCount: 0,
      accountScores: [
        {
          callSign: 'ASH-001',
          score: 0.85,
          playable: false,
          factors: ['WARMED', 'limits_stale', 'needs_exact_stake_fund'],
        },
        {
          callSign: 'ASH-002',
          score: 0.4,
          playable: false,
          factors: ['Warming', 'warmup_1_of_2', 'ball_partner', 'limits_unknown'],
        },
        {
          callSign: 'ASH-003',
          score: 0.28,
          playable: false,
          factors: ['Limited', 'LIMIT-EX-02', 'principal_recovery', 'low_daily_max'],
        },
      ],
    },
    rails: [
      {
        id: 'rail-ash-venmo-1',
        railType: 'Venmo',
        label: 'CASHOUT-VENMO',
        confirmed: true,
        profileScreenshotRef: 'proof:ash-venmo-profile',
        destinationHint: '@ash.hr.fl',
        dailyLimit: 10_000,
        monthlyLimit: 40_000,
      },
      {
        id: 'rail-ash-cashapp-1',
        railType: 'CashApp',
        label: 'CASHOUT-CASHAPP',
        confirmed: true,
        profileScreenshotRef: 'proof:ash-cashapp-profile',
        destinationHint: '$ashHRFL',
        dailyLimit: 8_000,
        monthlyLimit: 30_000,
      },
    ],
    accounts: [
      {
        callSign: 'ASH-001',
        status: 'WARMED',
        warmupCount: 2,
        warmupProgress: {
          completed: 2,
          required: 2,
          tags: ['#WARMED', '#CYCLE-2', '#PRIMED'],
        },
        capitalLocation: 'HouseFloat',
        hardBalance: 0,
        primaryRailId: 'rail-ash-venmo-1',
        gate12: { housePrincipalOutstanding: 0, withdrawalMode: 'profit_split' },
        sportsbook: 'Hard Rock Florida',
        expertId: 'marcus',
        flowStage: 'LIMIT',
        limits: {
          dailyMax: 2500,
          weeklyMax: 10_000,
          rawText: 'Daily $2,500 · Weekly $10,000',
          checkedAt: '2026-07-12T09:00:00.000Z',
          screenshotRef: 'proof:ash-001-limits-stale',
          freshness: 'stale',
        },
      },
      {
        callSign: 'ASH-002',
        status: 'Warming',
        warmupCount: 1,
        warmupProgress: {
          completed: 1,
          required: 2,
          tags: ['#CYCLE-1', '#WARMUP-CYCLE'],
        },
        capitalLocation: 'InSportsbook',
        hardBalance: 5010,
        primaryRailId: 'rail-ash-venmo-1',
        gate12: {
          housePrincipalOutstanding: 0,
          withdrawalMode: 'warmup_capital_return',
        },
        sportsbook: 'Hard Rock Florida',
        flowStage: 'WARM',
        limits: {
          dailyMax: null,
          weeklyMax: null,
          checkedAt: null,
          freshness: 'unknown',
        },
      },
      {
        callSign: 'ASH-003',
        status: 'Limited',
        warmupCount: 2,
        warmupProgress: {
          completed: 2,
          required: 2,
          tags: ['#WARMED', '#LIMIT-EX-02', '#REALLOCATE'],
        },
        capitalLocation: 'InSportsbook',
        hardBalance: 4800,
        primaryRailId: 'rail-ash-venmo-1',
        gate12: {
          housePrincipalOutstanding: 4800,
          withdrawalMode: 'principal_recovery',
        },
        sportsbook: 'Hard Rock Florida',
        expertId: 'marcus',
        flowStage: 'WD',
        limits: {
          dailyMax: 200,
          weeklyMax: 500,
          rawText: 'Daily $200 · Weekly $500 — LIMIT-EX-02',
          checkedAt: '2026-07-22T10:00:00.000Z',
          screenshotRef: 'proof:ash-003-limits-low',
          freshness: 'fresh',
        },
      },
    ],
    openTasks: [
      {
        taskId: 'ONB-ASH-000-20260710-080000-001',
        taskType: 'ONB',
        callSign: 'ASH-001',
        status: 'Completed',
        ballInCourt: 'Ops',
        nextAction: 'Done — partner Ready + package bound',
        proofRefs: ['proof:ash-onb-kyc'],
        createdAt: '2026-07-10T08:00:00.000Z',
      },
      {
        taskId: 'WARM-ASH-002-20260716-120000-001',
        taskType: 'WARM',
        callSign: 'ASH-002',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Complete cycle 2 dummy bet → settlement → WD',
        linkedExceptionId: 'WARM-EX-01',
        createdAt: '2026-07-16T12:00:00.000Z',
      },
      {
        taskId: 'LIMIT-ASH-001-20260720-090000-001',
        taskType: 'LIMIT',
        callSign: 'ASH-001',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Screenshot limit screen (UTC stamp) — do not interrupt PLAY',
        createdAt: '2026-07-20T09:00:00.000Z',
      },
      {
        taskId: 'WD-ASH-003-20260723-120000-001',
        taskType: 'WD',
        callSign: 'ASH-003',
        status: 'Processing',
        ballInCourt: 'Ops',
        nextAction: 'LIMIT-EX-02 — principal_recovery WD; reallocate to PAT-001',
        linkedExceptionId: 'LIMIT-EX-02',
        createdAt: '2026-07-23T12:00:00.000Z',
      },
    ],
    softBalance: {
      // ProfitSplits: NFL win $240 → 168/48/24; Tennis win $336 → 235/67/34
      byStakeholder: { Partner: 403, Expert: 115, House: 10_058 },
      recentEntries: [
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'ASH-001',
          taskId: 'FUND-ASH-001-20260715-100000-001',
          timestamp: '2026-07-15T18:00:00.000Z',
        },
        {
          entryType: 'CapitalReturn',
          stakeholder: 'House',
          amount: 4980,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260716-140000-001',
          timestamp: '2026-07-16T14:30:00.000Z',
        },
        {
          entryType: 'CostOfPriming',
          stakeholder: 'House',
          amount: 20,
          callSign: 'ASH-001',
          taskId: 'WARM-ASH-001-20260716-120000-001',
          timestamp: '2026-07-16T14:31:00.000Z',
        },
        {
          entryType: 'Loss',
          stakeholder: 'House',
          amount: 40,
          callSign: 'ASH-001',
          taskId: 'WARM-ASH-001-20260716-120000-001',
          timestamp: '2026-07-16T14:32:00.000Z',
        },
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'ASH-002',
          taskId: 'FUND-ASH-002-20260718-100000-001',
          timestamp: '2026-07-18T16:00:00.000Z',
        },
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'ASH-003',
          taskId: 'FUND-ASH-003-20260719-100000-001',
          timestamp: '2026-07-19T10:00:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Partner',
          amount: 168,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260718-000000-001',
          timestamp: '2026-07-18T00:15:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Expert',
          amount: 48,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260718-000000-001',
          timestamp: '2026-07-18T00:15:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'House',
          amount: 24,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260718-000000-001',
          timestamp: '2026-07-18T00:15:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Partner',
          amount: 235,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260721-210000-001',
          timestamp: '2026-07-21T21:10:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Expert',
          amount: 67,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260721-210000-001',
          timestamp: '2026-07-21T21:10:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'House',
          amount: 34,
          callSign: 'ASH-001',
          taskId: 'WD-ASH-001-20260721-210000-001',
          timestamp: '2026-07-21T21:10:00.000Z',
        },
      ],
      pendingDeployments: { count: 0, totalAmount: 0 },
    },
    bottlenecks: [
      {
        ruleKey: 'warmup_cycle_aging',
        severity: 'warn',
        metric: 'hours_open',
        threshold: 24,
        observed: 30,
        callSign: 'ASH-002',
        taskId: 'WARM-ASH-002-20260716-120000-001',
        resolvedAt: null,
        nextAction: 'Ping Partner; complete cycle 2 WD; record AAR if delayed',
      },
      {
        ruleKey: 'stale_limit_on_drum',
        severity: 'info',
        metric: 'days_stale',
        threshold: 7,
        observed: 8,
        callSign: 'ASH-001',
        taskId: 'LIMIT-ASH-001-20260720-090000-001',
        resolvedAt: null,
        nextAction: 'Refresh limit screenshot before next PLAY release',
      },
      {
        ruleKey: 'capital_in_book_warming',
        severity: 'critical',
        metric: 'daily_max',
        threshold: 500,
        observed: 200,
        callSign: 'ASH-003',
        taskId: 'WD-ASH-003-20260723-120000-001',
        resolvedAt: null,
        nextAction: 'LIMIT-EX-02 — withdraw and reallocate; do not feed constrained Drum',
      },
    ],
    recentPlays: [
      {
        playId: 'play-ash-001-nfl-ml-001',
        taskId: 'PLAY-ASH-001-20260717-190000-001',
        callSign: 'ASH-001',
        partnerCode: 'ASH',
        expertId: 'marcus',
        market: 'NFL',
        event: 'KC @ BUF',
        selection: 'BUF ML',
        odds: -110,
        stake: 1200,
        confidence: 0.62,
        status: 'settled',
        result: 'win',
        pnl: 240,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'static',
        placedAt: '2026-07-17T19:10:00.000Z',
        settledAt: '2026-07-17T23:40:00.000Z',
      },
      {
        playId: 'play-ash-001-tennis-001',
        taskId: 'PLAY-ASH-001-20260721-150000-001',
        callSign: 'ASH-001',
        partnerCode: 'ASH',
        expertId: 'elena',
        market: 'Tennis',
        event: 'Alcaraz vs Sinner',
        selection: 'Alcaraz ML',
        odds: -125,
        stake: 900,
        confidence: 0.66,
        status: 'settled',
        result: 'win',
        pnl: 336,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'static',
        placedAt: '2026-07-21T15:05:00.000Z',
        settledAt: '2026-07-21T20:40:00.000Z',
      },
      {
        playId: 'play-ash-001-mlb-loss-001',
        taskId: 'PLAY-ASH-001-20260719-170000-001',
        callSign: 'ASH-001',
        partnerCode: 'ASH',
        expertId: 'kai',
        market: 'MLB',
        event: 'LAD @ SF',
        selection: 'LAD -1.5',
        odds: +140,
        stake: 600,
        confidence: 0.51,
        status: 'settled',
        result: 'loss',
        pnl: -600,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'static',
        placedAt: '2026-07-19T17:20:00.000Z',
        settledAt: '2026-07-19T22:05:00.000Z',
      },
      {
        playId: 'play-ash-002-blocked-001',
        callSign: 'ASH-002',
        partnerCode: 'ASH',
        expertId: 'marcus',
        market: 'NBA',
        event: 'LAL @ BOS',
        selection: 'LAL +4.5',
        odds: -105,
        stake: 800,
        status: 'blocked',
        result: 'blocked',
        pnl: null,
        blockedReason: 'PLAY-EX-02 warmup_count<2 / not WARMED',
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'static',
        placedAt: '2026-07-19T18:00:00.000Z',
      },
    ],
    experimentAssignment: {
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'static',
      metricName: 'placement_rate',
      metricValue: 0.72,
    },
    knownExceptions: [
      {
        id: 'WARM-EX-01',
        trigger: 'Dummy bet loses (balance < deposit)',
        action: 'WD remaining; Soft CostOfPriming; cycle still counts',
      },
      {
        id: 'FUND-EX-01',
        trigger: 'Typed rail ≠ profile screenshot',
        action: 'Block send; re-upload + re-confirm',
      },
      {
        id: 'LIMIT-EX-03',
        trigger: 'Active Expert Play in progress',
        action: 'Queue Limit Check; never interrupt PLAY',
      },
      {
        id: 'LIMIT-EX-02',
        trigger: 'Hard limit below useful expert stakes',
        action: 'Flag Limited; WD capital quickly; reallocate to higher-CE seat',
      },
      {
        id: 'WARM-EX-02',
        trigger: 'Parlay/prop/live dummy bet triggers early limit flag',
        action: 'Use major-league ML/totals near-even only; avoid WARM-EX-02 scrutiny',
      },
    ],
  };
}

function patPartner(): TocPartner {
  return {
    partnerCode: 'PAT',
    status: 'Ready',
    telegramRef: 'tg:group:pat-demo',
    package: { ...PKG },
    flowStage: 'PLAY',
    readiness: {
      score: 0.88,
      playableAccountCount: 1,
      accountScores: [
        {
          callSign: 'PAT-001',
          score: 0.92,
          playable: true,
          factors: ['WARMED', 'limits_fresh', 'capital_in_book', 'exp_dynamic'],
        },
        {
          callSign: 'PAT-002',
          score: 0.55,
          playable: false,
          factors: ['WARMED', 'gate12_principal_out'],
        },
        {
          callSign: 'PAT-003',
          score: 0.35,
          playable: false,
          factors: ['Funded', 'awaiting_warm', 'rail_confirmed'],
        },
      ],
    },
    rails: [
      {
        id: 'rail-pat-cashapp-1',
        railType: 'CashApp',
        label: 'CASHOUT-CASHAPP',
        confirmed: true,
        profileScreenshotRef: 'proof:pat-cashapp-profile',
        destinationHint: '$patHRFL',
        dailyLimit: 8_000,
        monthlyLimit: 35_000,
      },
      {
        id: 'rail-pat-paypal-1',
        railType: 'PayPal',
        label: 'CASHOUT-PAYPAL',
        confirmed: true,
        profileScreenshotRef: 'proof:pat-paypal-profile',
        destinationHint: 'pat@example.com',
        dailyLimit: 5_000,
        monthlyLimit: 20_000,
      },
    ],
    accounts: [
      {
        callSign: 'PAT-001',
        status: 'WARMED',
        warmupCount: 2,
        warmupProgress: {
          completed: 2,
          required: 2,
          tags: ['#WARMED', '#CYCLE-2', '#READY'],
        },
        capitalLocation: 'InSportsbook',
        hardBalance: 5200,
        primaryRailId: 'rail-pat-cashapp-1',
        gate12: { housePrincipalOutstanding: 0, withdrawalMode: 'profit_split' },
        sportsbook: 'Hard Rock Florida',
        expertId: 'elena',
        flowStage: 'PLAY',
        limits: {
          dailyMax: 3000,
          weeklyMax: 12_000,
          rawText: 'Daily $3,000 · Weekly $12,000',
          checkedAt: '2026-07-21T14:00:00.000Z',
          screenshotRef: 'proof:pat-001-limits',
          freshness: 'fresh',
        },
      },
      {
        callSign: 'PAT-002',
        status: 'WARMED',
        warmupCount: 2,
        warmupProgress: {
          completed: 2,
          required: 2,
          tags: ['#WARMED', '#CYCLE-2'],
        },
        capitalLocation: 'InSportsbook',
        hardBalance: 4800,
        primaryRailId: 'rail-pat-cashapp-1',
        gate12: {
          housePrincipalOutstanding: 5000,
          withdrawalMode: 'principal_recovery',
        },
        sportsbook: 'Hard Rock Florida',
        expertId: 'marcus',
        flowStage: 'WD',
        limits: {
          dailyMax: 2000,
          weeklyMax: 8_000,
          rawText: 'Daily $2,000 · Weekly $8,000',
          checkedAt: '2026-07-20T11:00:00.000Z',
          screenshotRef: 'proof:pat-002-limits',
          freshness: 'fresh',
        },
      },
      {
        callSign: 'PAT-003',
        status: 'Funded',
        warmupCount: 0,
        warmupProgress: {
          completed: 0,
          required: 2,
          tags: ['#FUNDED', '#AWAIT-WARM'],
        },
        capitalLocation: 'WithPartner',
        hardBalance: 5000,
        primaryRailId: 'rail-pat-paypal-1',
        gate12: {
          housePrincipalOutstanding: 5000,
          withdrawalMode: 'warmup_capital_return',
        },
        sportsbook: 'Hard Rock Florida',
        expertId: 'kai',
        flowStage: 'WARM',
        limits: {
          dailyMax: null,
          weeklyMax: null,
          checkedAt: null,
          freshness: 'unknown',
        },
      },
    ],
    openTasks: [
      {
        taskId: 'FUND-PAT-001-20260718-100000-001',
        taskType: 'FUND',
        callSign: 'PAT-001',
        status: 'Completed',
        ballInCourt: 'Ops',
        nextAction: 'Done — FUND $5000 corridor',
        proofRefs: ['proof:pat-001-fund'],
        createdAt: '2026-07-18T10:00:00.000Z',
      },
      {
        taskId: 'LIMIT-PAT-001-20260721-140000-001',
        taskType: 'LIMIT',
        callSign: 'PAT-001',
        status: 'Completed',
        ballInCourt: 'Ops',
        nextAction: 'Done — limits fresh for PLAY',
        proofRefs: ['proof:pat-001-limits'],
        createdAt: '2026-07-21T14:00:00.000Z',
      },
      {
        taskId: 'PLAY-PAT-001-20260722-150000-001',
        taskType: 'PLAY',
        callSign: 'PAT-001',
        status: 'Processing',
        ballInCourt: 'Partner',
        nextAction: 'Place expert instruction; post bet-slip screenshot',
        createdAt: '2026-07-22T15:00:00.000Z',
      },
      {
        taskId: 'WD-PAT-002-20260722-160000-001',
        taskType: 'WD',
        callSign: 'PAT-002',
        status: 'GateCheck',
        ballInCourt: 'Ops',
        nextAction: 'Gate 12 principal_recovery only — Soft CapitalReturn 100% House',
        createdAt: '2026-07-22T16:00:00.000Z',
      },
      {
        taskId: 'FUND-PAT-002-20260721-110000-001',
        taskType: 'FUND',
        callSign: 'PAT-002',
        status: 'Completed',
        ballInCourt: 'Ops',
        nextAction: 'Done — Soft location WithPartner → InSportsbook verified',
        proofRefs: ['proof:pat-002-fund'],
        createdAt: '2026-07-21T11:00:00.000Z',
      },
      {
        taskId: 'FUND-PAT-003-20260723-090000-001',
        taskType: 'FUND',
        callSign: 'PAT-003',
        status: 'Completed',
        ballInCourt: 'Ops',
        nextAction: 'Done — PayPal corridor funded; Soft pending InSportsbook confirm',
        proofRefs: ['proof:pat-003-fund', 'proof:pat-paypal-profile'],
        createdAt: '2026-07-23T09:00:00.000Z',
      },
      {
        taskId: 'WARM-PAT-003-20260723-120000-001',
        taskType: 'WARM',
        callSign: 'PAT-003',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Start cycle 1 dummy bet (ML near-even); post slip + settlement',
        createdAt: '2026-07-23T12:00:00.000Z',
      },
    ],
    softBalance: {
      // Prior cycle $800 pnl → 560/160/80; NFL $1200 → 840/240/120; +PAT-003 deploy
      byStakeholder: { Partner: 1400, Expert: 400, House: 17_500 },
      recentEntries: [
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'PAT-001',
          taskId: 'FUND-PAT-001-20260718-100000-001',
          timestamp: '2026-07-18T10:30:00.000Z',
        },
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'PAT-002',
          taskId: 'FUND-PAT-002-20260721-110000-001',
          timestamp: '2026-07-21T11:20:00.000Z',
        },
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'PAT-003',
          taskId: 'FUND-PAT-003-20260723-090000-001',
          timestamp: '2026-07-23T09:20:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Partner',
          amount: 560,
          callSign: 'PAT-001',
          taskId: 'WD-PAT-001-20260712-190000-001',
          timestamp: '2026-07-12T19:30:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Expert',
          amount: 160,
          callSign: 'PAT-001',
          taskId: 'WD-PAT-001-20260712-190000-001',
          timestamp: '2026-07-12T19:30:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'House',
          amount: 80,
          callSign: 'PAT-001',
          taskId: 'WD-PAT-001-20260712-190000-001',
          timestamp: '2026-07-12T19:30:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Partner',
          amount: 840,
          callSign: 'PAT-001',
          taskId: 'WD-PAT-001-20260720-180000-001',
          timestamp: '2026-07-20T18:45:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'Expert',
          amount: 240,
          callSign: 'PAT-001',
          taskId: 'WD-PAT-001-20260720-180000-001',
          timestamp: '2026-07-20T18:45:00.000Z',
        },
        {
          entryType: 'ProfitSplit',
          stakeholder: 'House',
          amount: 120,
          callSign: 'PAT-001',
          taskId: 'WD-PAT-001-20260720-180000-001',
          timestamp: '2026-07-20T18:45:00.000Z',
        },
        {
          entryType: 'Loss',
          stakeholder: 'House',
          amount: 180,
          callSign: 'PAT-001',
          taskId: 'PLAY-PAT-001-20260714-180000-001',
          timestamp: '2026-07-14T23:10:00.000Z',
        },
      ],
      pendingDeployments: { count: 1, totalAmount: 5000 },
    },
    bottlenecks: [
      {
        ruleKey: 'capital_in_book_warming',
        severity: 'info',
        metric: 'hard_balance',
        threshold: 4500,
        observed: 4800,
        callSign: 'PAT-002',
        resolvedAt: null,
        nextAction: 'Principal recovery WD after settlement; do not profit_split',
      },
      {
        ruleKey: 'open_pending_partner_queue',
        severity: 'warn',
        metric: 'pending_partner_tasks',
        threshold: 3,
        observed: 2,
        taskId: 'PLAY-PAT-001-20260722-150000-001',
        resolvedAt: null,
        nextAction: 'Partner holds PLAY + WARM balls — ping at 30m / escalate 60m',
      },
      {
        ruleKey: 'warmup_cycle_aging',
        severity: 'info',
        metric: 'hours_open',
        threshold: 12,
        observed: 4,
        callSign: 'PAT-003',
        taskId: 'WARM-PAT-003-20260723-120000-001',
        resolvedAt: null,
        nextAction: 'Kick off cycle 1 before capital idles WithPartner',
      },
    ],
    recentPlays: [
      {
        playId: 'play-pat-001-prior-cycle-001',
        taskId: 'PLAY-PAT-001-20260712-160000-001',
        callSign: 'PAT-001',
        partnerCode: 'PAT',
        expertId: 'marcus',
        market: 'NFL',
        event: 'KC @ DEN',
        selection: 'KC -6.5',
        odds: -110,
        stake: 1100,
        confidence: 0.68,
        status: 'settled',
        result: 'win',
        pnl: 800,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'dynamic',
        placedAt: '2026-07-12T16:10:00.000Z',
        settledAt: '2026-07-12T22:00:00.000Z',
      },
      {
        playId: 'play-pat-001-mlb-loss-001',
        taskId: 'PLAY-PAT-001-20260714-180000-001',
        callSign: 'PAT-001',
        partnerCode: 'PAT',
        expertId: 'kai',
        market: 'MLB',
        event: 'ATL @ PHI',
        selection: 'ATL ML',
        odds: +105,
        stake: 180,
        confidence: 0.54,
        status: 'settled',
        result: 'loss',
        pnl: -180,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'dynamic',
        placedAt: '2026-07-14T18:05:00.000Z',
        settledAt: '2026-07-14T23:00:00.000Z',
      },
      {
        playId: 'play-pat-001-nfl-spread-001',
        taskId: 'PLAY-PAT-001-20260720-160000-001',
        callSign: 'PAT-001',
        partnerCode: 'PAT',
        expertId: 'elena',
        market: 'NFL',
        event: 'DAL @ PHI',
        selection: 'PHI -3',
        odds: -115,
        stake: 1500,
        confidence: 0.71,
        status: 'settled',
        result: 'win',
        pnl: 1200,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'dynamic',
        placedAt: '2026-07-20T16:05:00.000Z',
        settledAt: '2026-07-20T22:10:00.000Z',
      },
      {
        playId: 'play-pat-001-nba-open-001',
        taskId: 'PLAY-PAT-001-20260722-150000-001',
        callSign: 'PAT-001',
        partnerCode: 'PAT',
        expertId: 'elena',
        market: 'NBA',
        event: 'MIA @ NYK',
        selection: 'MIA ML',
        odds: +130,
        stake: 900,
        confidence: 0.58,
        status: 'placed',
        result: 'pending',
        pnl: null,
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'dynamic',
        placedAt: '2026-07-22T15:20:00.000Z',
      },
      {
        playId: 'play-pat-002-limit-reject-001',
        callSign: 'PAT-002',
        partnerCode: 'PAT',
        expertId: 'marcus',
        market: 'MLB',
        event: 'NYY @ BOS',
        selection: 'NYY -1.5',
        odds: +145,
        stake: 2500,
        status: 'blocked',
        result: 'blocked',
        pnl: null,
        blockedReason: 'PLAY-EX-01 stake > dailyMax ($2000)',
        experimentId: 'exp-routing-phase1-2026-07',
        variantKey: 'dynamic',
        placedAt: '2026-07-22T12:00:00.000Z',
      },
    ],
    experimentAssignment: {
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'dynamic',
      metricName: 'placement_rate',
      metricValue: 0.88,
    },
    knownExceptions: [
      {
        id: 'PLAY-EX-01',
        trigger: 'Limit < requested stake',
        action: 'Reduce (if Expert permits) or reject; never replace live instruction',
      },
      {
        id: 'PLAY-EX-02',
        trigger: 'Warm-up count ≠ 2 / not WARMED',
        action: 'Block PLAY; escalate if Expert insists',
      },
      {
        id: 'WTH-EX-02',
        trigger: 'Rail payment under review',
        action: 'PendingRailReview; recheck 30 min',
      },
    ],
  };
}

/** NOV — onboarding partner (Rope before Drum). */
function novPartner(): TocPartner {
  return {
    partnerCode: 'NOV',
    status: 'Onboarding',
    telegramRef: 'tg:dm:nov-onboarding',
    package: { ...PKG },
    flowStage: 'ONB',
    readiness: {
      score: 0.28,
      playableAccountCount: 0,
      accountScores: [
        {
          callSign: 'NOV-001',
          score: 0.24,
          playable: false,
          factors: ['onboarding', 'rail_confirmed', 'awaiting_ready', 'no_limits'],
        },
        {
          callSign: 'NOV-002',
          score: 0.32,
          playable: false,
          factors: ['funded', 'receipt_pending', 'awaiting_warm'],
        },
      ],
    },
    rails: [
      {
        id: 'rail-nov-venmo-1',
        railType: 'Venmo',
        label: 'CASHOUT-VENMO',
        confirmed: true,
        profileScreenshotRef: 'proof:nov-venmo-profile',
        destinationHint: '@nov.newpartner',
        dailyLimit: 5_000,
        monthlyLimit: 20_000,
      },
      {
        id: 'rail-nov-cashapp-1',
        railType: 'CashApp',
        label: 'CASHOUT-CASHAPP',
        confirmed: false,
        destinationHint: '$novNew',
        dailyLimit: 4_000,
        monthlyLimit: 15_000,
      },
    ],
    accounts: [
      {
        callSign: 'NOV-001',
        status: 'New',
        warmupCount: 0,
        warmupProgress: { completed: 0, required: 2, tags: ['#RAIL-OK'] },
        capitalLocation: 'HouseFloat',
        hardBalance: 0,
        primaryRailId: 'rail-nov-venmo-1',
        gate12: {
          housePrincipalOutstanding: 0,
          withdrawalMode: 'warmup_capital_return',
        },
        sportsbook: 'Hard Rock Florida',
        flowStage: 'ONB',
        limits: {
          dailyMax: null,
          weeklyMax: null,
          checkedAt: null,
          freshness: 'unknown',
        },
      },
      {
        callSign: 'NOV-002',
        status: 'Funded',
        warmupCount: 0,
        warmupProgress: { completed: 0, required: 2, tags: ['#FUNDED'] },
        capitalLocation: 'WithPartner',
        hardBalance: 5000,
        primaryRailId: 'rail-nov-venmo-1',
        gate12: {
          housePrincipalOutstanding: 5000,
          withdrawalMode: 'warmup_capital_return',
        },
        sportsbook: 'Hard Rock Florida',
        flowStage: 'FUND',
        limits: {
          dailyMax: null,
          weeklyMax: null,
          checkedAt: null,
          freshness: 'unknown',
        },
      },
    ],
    openTasks: [
      {
        taskId: 'ONB-NOV-001-20260722-100000-001',
        taskType: 'ONB',
        callSign: 'NOV-001',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Finish KYC checklist + Ready ack (Venmo rail already confirmed)',
        proofRefs: ['proof:nov-venmo-profile'],
        createdAt: '2026-07-22T10:00:00.000Z',
      },
      {
        taskId: 'FUND-NOV-002-20260722-140000-001',
        taskType: 'FUND',
        callSign: 'NOV-002',
        status: 'Processing',
        ballInCourt: 'Partner',
        nextAction:
          'Confirm receipt screenshot before Soft location → InSportsbook (FUND-EX-02 if idle)',
        linkedExceptionId: 'FUND-EX-02',
        proofRefs: ['proof:nov-002-send'],
        createdAt: '2026-07-22T14:00:00.000Z',
      },
      {
        taskId: 'LIMIT-NOV-001-20260722-110000-001',
        taskType: 'LIMIT',
        callSign: 'NOV-001',
        status: 'New',
        ballInCourt: 'Ops',
        nextAction: 'Blocked until ONB Ready — queue after partner ack',
        createdAt: '2026-07-22T11:00:00.000Z',
      },
    ],
    softBalance: {
      byStakeholder: { Partner: 0, Expert: 0, House: 5000 },
      recentEntries: [
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'NOV-002',
          taskId: 'FUND-NOV-002-20260722-140000-001',
          timestamp: '2026-07-22T14:05:00.000Z',
        },
      ],
      pendingDeployments: { count: 1, totalAmount: 5000 },
    },
    bottlenecks: [
      {
        ruleKey: 'open_pending_partner_queue',
        severity: 'warn',
        metric: 'pending_partner_tasks',
        threshold: 3,
        observed: 2,
        taskId: 'ONB-NOV-001-20260722-100000-001',
        resolvedAt: null,
        nextAction: 'ONB + FUND ball with Partner — ping 30m / escalate 60m',
      },
      {
        ruleKey: 'telegram_lane_undelivered_cards',
        severity: 'info',
        metric: 'undelivered_cards',
        threshold: 1,
        observed: 1,
        resolvedAt: null,
        nextAction: 'Confirm Telegram DM lane for NOV onboarding pack',
      },
    ],
    recentPlays: [],
    experimentAssignment: {
      experimentId: 'exp-routing-phase1-2026-07',
      variantKey: 'static',
      metricName: 'placement_rate',
      metricValue: 0.12,
    },
    knownExceptions: [
      {
        id: 'ONB-EX-01',
        trigger: 'Partner cannot provide rail profile screenshot',
        action: 'Pause ONB; no FUND until screenshot-first Hard Gate clears',
      },
      {
        id: 'FUND-EX-02',
        trigger: 'Partner not ready / no confirm in window',
        action: 'Pause; do not send; re-trigger only after re-confirm',
      },
      {
        id: 'FUND-EX-03',
        trigger: 'Insufficient House clean capital',
        action: 'Pause; notify Ops Lead; may reduce/delay',
      },
    ],
  };
}

/** Build the demo TOC Ops snapshot used for Pages bake + local portal. */
export function buildDemoTocOpsFixture(generatedAt = new Date().toISOString()): TocOpsSnapshot {
  const partners = [ashPartner(), patPartner(), novPartner()];
  const exps = experiments();
  const expertList = experts();
  const allPlays = partners.flatMap(p => p.recentPlays);
  const summary = summarize(partners, exps, allPlays);

  return {
    schema: 'factorywager.toc-ops.portal-fixture.v2',
    source: 'demo',
    readOnly: true,
    plane: 'demo-readonly',
    generatedAt,
    ssot: {
      theory: 'toc-ops-repo/docs/reference/TOC-Production-Reference.md',
      accounting: 'toc-ops-repo/docs/system/ACCOUNTING.md',
      domain: 'toc-ops-repo/docs/DOMAIN_CONSTANTS.md',
    },
    catalog: {
      taskTypes: ['ONB', 'FUND', 'LIMIT', 'WARM', 'PLAY', 'WD'],
      accountStatuses: ['New', 'Funded', 'Warming', 'WARMED', 'Limited', 'Inactive'],
      softBalanceEntryTypes: [
        'CapitalDeployment',
        'CapitalReturn',
        'ProfitSplit',
        'Loss',
        'CostOfPriming',
        'Adjustment',
      ],
      bottleneckRuleKeys: [...TOC_BOTTLENECK_RULE_KEYS],
      warmupRequiredForPlay: 2,
      defaultSplit: { partnerPct: 70, expertPct: 20, housePct: 10 },
      exceptionFamilies: {
        WD: 'WTH-EX-',
        FUND: 'FUND-EX-',
        WARM: 'WARM-EX-',
        PLAY: 'PLAY-EX-',
        LIMIT: 'LIMIT-EX-',
        ONB: 'ONB-EX-',
      },
      flowOrder: ['ONB', 'FUND', 'LIMIT', 'WARM', 'PLAY', 'WD', 'RECYCLE'],
      depositCorridor: { min: 4500, max: 5500, target: 5000 },
      limitFreshnessDays: 7,
      returnEfficiency: {
        daysCover: 14,
        staticFloatFloor: 50_000,
        settlementThrottleRatio: 0.6,
        tVelocityWindowDays: 30,
        defaultExpectedPlayT: 840,
        processRank: ['LIMIT', 'ONB', 'WD', 'PLAY', 'WARM', 'FUND'],
      },
    },
    buffer: {
      floatTarget: 50_000,
      floatTargetSource: 'static',
      houseFloatHard: 42_500,
      floatRatio: 0.85,
      throttleOnboarding: false,
      settlementFloatRatio: 0.32,
      primedDrums: summary.warmed,
      playableDrums: partners.reduce((n, p) => n + p.readiness.playableAccountCount, 0),
      principalOutstandingTotal: summary.principalOutstandingTotal,
    },
    experts: expertList,
    experiments: exps,
    partners,
    summary,
  };
}

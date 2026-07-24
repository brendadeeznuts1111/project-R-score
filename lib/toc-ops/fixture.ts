/**
 * Deterministic TOC Ops demo fixture (ASH + PAT) for Pages / portal build-out.
 * Mirrors toc-ops-repo seed shapes without requiring Central Tool SQLite.
 *
 * @see toc-ops-repo/src/db/seed.ts
 */
import type { TocOpsSnapshot, TocPartner } from './types.ts';

export const TOC_BOTTLENECK_RULE_KEYS = [
  'open_pending_partner_queue',
  'warmup_cycle_aging',
  'stale_limit_on_drum',
  'orphan_pending_exposure',
  'capital_in_book_warming',
  'telegram_lane_undelivered_cards',
  'rotor_drift_detected',
] as const;

function summarize(partners: TocPartner[]): TocOpsSnapshot['summary'] {
  const byTaskType: Record<string, number> = {};
  const byBallInCourt: Record<string, number> = {};
  let warmed = 0;
  let warming = 0;
  let confirmedRails = 0;
  let openTasks = 0;
  let openBottlenecks = 0;
  let criticalBottlenecks = 0;
  let accounts = 0;
  let principalOutstandingTotal = 0;

  for (const p of partners) {
    for (const a of p.accounts) {
      accounts++;
      if (a.status === 'WARMED') warmed++;
      if (a.status === 'Warming') warming++;
      principalOutstandingTotal += a.gate12.housePrincipalOutstanding;
    }
    confirmedRails += p.rails.filter(r => r.confirmed).length;
    openTasks += p.openTasks.length;
    for (const t of p.openTasks) {
      byTaskType[t.taskType] = (byTaskType[t.taskType] ?? 0) + 1;
      byBallInCourt[t.ballInCourt] = (byBallInCourt[t.ballInCourt] ?? 0) + 1;
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
    confirmedRails,
    openTasks,
    openBottlenecks,
    criticalBottlenecks,
    principalOutstandingTotal,
    byTaskType,
    byBallInCourt,
  };
}

function ashPartner(): TocPartner {
  return {
    partnerCode: 'ASH',
    status: 'Ready',
    package: {
      id: 'pkg-default-70-20-10',
      partnerPct: 70,
      expertPct: 20,
      housePct: 10,
    },
    readiness: {
      score: 0.72,
      playableAccountCount: 0,
      accountScores: [
        {
          callSign: 'ASH-001',
          score: 0.85,
          playable: false,
          factors: ['WARMED', 'needs_exact_stake_fund'],
        },
        {
          callSign: 'ASH-002',
          score: 0.4,
          playable: false,
          factors: ['Warming', 'warmup_1_of_2', 'ball_partner'],
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
      },
    ],
    openTasks: [
      {
        taskId: 'WARM-ASH-002-20260716-120000-001',
        taskType: 'WARM',
        callSign: 'ASH-002',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Complete cycle 2 dummy bet → settlement → WD',
        linkedExceptionId: 'WARM-EX-01',
      },
      {
        taskId: 'LIMIT-ASH-001-20260720-090000-001',
        taskType: 'LIMIT',
        callSign: 'ASH-001',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Screenshot limit screen (UTC stamp) — do not interrupt PLAY',
      },
    ],
    softBalance: {
      byStakeholder: { Partner: 0, Expert: 0, House: 10_000 },
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
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'ASH-002',
          taskId: 'FUND-ASH-002-20260718-100000-001',
          timestamp: '2026-07-18T16:00:00.000Z',
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
    ],
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
    ],
  };
}

function patPartner(): TocPartner {
  return {
    partnerCode: 'PAT',
    status: 'Ready',
    package: {
      id: 'pkg-default-70-20-10',
      partnerPct: 70,
      expertPct: 20,
      housePct: 10,
    },
    readiness: {
      score: 0.91,
      playableAccountCount: 1,
      accountScores: [
        {
          callSign: 'PAT-001',
          score: 0.92,
          playable: true,
          factors: ['WARMED', 'limits_fresh', 'capital_in_book'],
        },
        {
          callSign: 'PAT-002',
          score: 0.55,
          playable: false,
          factors: ['WARMED', 'gate12_principal_out'],
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
      },
      {
        id: 'rail-pat-paypal-1',
        railType: 'PayPal',
        label: 'CASHOUT-PAYPAL',
        confirmed: false,
        profileScreenshotRef: undefined,
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
      },
    ],
    openTasks: [
      {
        taskId: 'PLAY-PAT-001-20260722-150000-001',
        taskType: 'PLAY',
        callSign: 'PAT-001',
        status: 'Processing',
        ballInCourt: 'Partner',
        nextAction: 'Place expert instruction; post bet-slip screenshot',
      },
      {
        taskId: 'WD-PAT-002-20260722-160000-001',
        taskType: 'WD',
        callSign: 'PAT-002',
        status: 'GateCheck',
        ballInCourt: 'Ops',
        nextAction: 'Gate 12 principal_recovery only — Soft CapitalReturn 100% House',
      },
      {
        taskId: 'FUND-PAT-002-20260721-110000-001',
        taskType: 'FUND',
        callSign: 'PAT-002',
        status: 'Completed',
        ballInCourt: 'Ops',
        nextAction: 'Done — Soft location WithPartner → InSportsbook verified',
      },
    ],
    softBalance: {
      byStakeholder: { Partner: 840, Expert: 240, House: 12_420 },
      recentEntries: [
        {
          entryType: 'CapitalDeployment',
          stakeholder: 'House',
          amount: 5000,
          callSign: 'PAT-002',
          taskId: 'FUND-PAT-002-20260721-110000-001',
          timestamp: '2026-07-21T11:20:00.000Z',
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
      ],
      pendingDeployments: { count: 0, totalAmount: 0 },
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
        observed: 1,
        taskId: 'PLAY-PAT-001-20260722-150000-001',
        resolvedAt: null,
        nextAction: 'Partner holds PLAY ball — ping at 30m / escalate 60m',
      },
    ],
    knownExceptions: [
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

/** Build the demo TOC Ops snapshot used for Pages bake + local portal. */
export function buildDemoTocOpsFixture(generatedAt = new Date().toISOString()): TocOpsSnapshot {
  const partners = [ashPartner(), patPartner()];
  const summary = summarize(partners);
  const openWarmTasks = partners.flatMap(p =>
    p.openTasks.filter(t => t.taskType === 'WARM' && t.status !== 'Completed')
  );

  return {
    schema: 'factorywager.toc-ops.portal-fixture.v1',
    source: 'demo',
    readOnly: true,
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
    partners,
    summary: {
      ...summary,
      // Keep openTasks count to non-Completed operational work for portal cards
      openTasks: partners.reduce(
        (n, p) => n + p.openTasks.filter(t => t.status !== 'Completed').length,
        0
      ),
      byTaskType: (() => {
        const m: Record<string, number> = {};
        for (const p of partners) {
          for (const t of p.openTasks) {
            if (t.status === 'Completed') continue;
            m[t.taskType] = (m[t.taskType] ?? 0) + 1;
          }
        }
        // Ensure warm aging signal visible even when filtered
        if (openWarmTasks.length > 0) m.WARM = openWarmTasks.length;
        return m;
      })(),
    },
  };
}

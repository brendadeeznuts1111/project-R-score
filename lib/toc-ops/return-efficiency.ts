/**
 * TOC return efficiency — R_P, CE_asset, LE, dynamic buffer, action ranking.
 * Pure functions over fixture snapshot; mirrors toc-ops-repo ACCOUNTING semantics.
 *
 * @see toc-ops-repo/docs/system/ACCOUNTING.md
 * @see docs/harness/tenants/toc-ops.md
 */
import { computeThroughput } from './enforcement.ts';
import type {
  TocAccount,
  TocAssetEfficiency,
  TocLimitEnhancement,
  TocOpenTask,
  TocOpsSnapshot,
  TocPartner,
  TocProcessReturn,
  TocRankedAction,
  TocReturnCatalog,
  TocReturnEfficiencySlice,
  TocTaskType,
  TocTioeSnapshot,
} from './types.ts';

export const DAYS_COVER = 14;
export const STATIC_FLOAT_FLOOR = 50_000;
export const SETTLEMENT_THROTTLE_RATIO = 0.6;
export const T_VELOCITY_WINDOW_DAYS = 30;
export const DEFAULT_EXPECTED_PLAY_T = 840;
/** LIMIT freshness first; WD (Gate 12 principal) before profit PLAY. */
export const PROCESS_RANK: TocTaskType[] = ['LIMIT', 'ONB', 'WD', 'PLAY', 'WARM', 'FUND'];

export const DEFAULT_RETURN_CATALOG: TocReturnCatalog = {
  daysCover: DAYS_COVER,
  staticFloatFloor: STATIC_FLOAT_FLOOR,
  settlementThrottleRatio: SETTLEMENT_THROTTLE_RATIO,
  tVelocityWindowDays: T_VELOCITY_WINDOW_DAYS,
  defaultExpectedPlayT: DEFAULT_EXPECTED_PLAY_T,
  processRank: [...PROCESS_RANK],
};

function msToDays(ms: number): number {
  return ms / (24 * 60 * 60 * 1000);
}

function parseTime(iso: string | null | undefined, fallback: number): number {
  if (!iso) return fallback;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : fallback;
}

/** Finite-only divide for JSON-safe R_P / CE / LE (∞ → large sentinel). */
const R_P_UNBOUNDED = 1e6;

function safeDivide(num: number, denom: number): number {
  if (denom <= 0) return num > 0 ? R_P_UNBOUNDED : 0;
  const q = num / denom;
  if (!Number.isFinite(q)) return num > 0 ? R_P_UNBOUNDED : 0;
  return q;
}

export function resolveReturnCatalog(snap: TocOpsSnapshot): TocReturnCatalog {
  return { ...DEFAULT_RETURN_CATALOG, ...snap.catalog.returnEfficiency };
}

export function computeLimitFreshness(
  checkedAt: string | null,
  limitFreshnessDays: number,
  now: number
): 'fresh' | 'stale' | 'unknown' {
  if (!checkedAt) return 'unknown';
  const checked = Date.parse(checkedAt);
  if (!Number.isFinite(checked)) return 'unknown';
  const days = msToDays(now - checked);
  return days <= limitFreshnessDays ? 'fresh' : 'stale';
}

function limitFreshFactor(freshness: 'fresh' | 'stale' | 'unknown'): number {
  if (freshness === 'fresh') return 1;
  if (freshness === 'stale') return 0.5;
  return 0.2;
}

function avgSettledProfitSplit(partners: TocPartner[], fallback: number): number {
  const splits: number[] = [];
  for (const p of partners) {
    for (const e of p.softBalance.recentEntries) {
      if (e.entryType === 'ProfitSplit') splits.push(e.amount);
    }
    for (const play of p.recentPlays) {
      if (play.status === 'settled' && play.result === 'win' && play.pnl != null && play.pnl > 0) {
        splits.push(play.pnl * 0.7);
      }
    }
  }
  if (splits.length === 0) return fallback;
  return splits.reduce((a, b) => a + b, 0) / splits.length;
}

function softDeltaT(
  p: TocPartner,
  callSign: string,
  taskId: string | undefined, // brand-ok — fixture task id filter
  entryTypes: Array<'ProfitSplit'>
): number {
  return p.softBalance.recentEntries
    .filter(
      e =>
        e.callSign === callSign &&
        entryTypes.includes(e.entryType as 'ProfitSplit') &&
        (!taskId || e.taskId === taskId)
    )
    .reduce((n, e) => n + e.amount, 0);
}

function softOE(
  p: TocPartner,
  callSign: string,
  taskId?: string /* brand-ok — fixture task id */
): number {
  return p.softBalance.recentEntries
    .filter(
      e =>
        e.callSign === callSign &&
        (e.entryType === 'CostOfPriming' || e.entryType === 'Loss') &&
        (!taskId || e.taskId === taskId)
    )
    .reduce((n, e) => n + e.amount, 0);
}

function taskTauDays(task: TocOpenTask, now: number, defaultDays: number): number {
  const created = parseTime(task.createdAt, now);
  const open = task.status !== 'Completed' && task.status !== 'Stopped';
  if (!open) return defaultDays;
  return Math.max(0.25, msToDays(now - created));
}

function computeIPeak(
  process: TocTaskType,
  account: TocAccount | undefined,
  corridorTarget: number
): number {
  if (process === 'ONB' || process === 'LIMIT') return 0;
  if (process === 'WARM') return corridorTarget;
  if (!account) return corridorTarget;
  if (process === 'WD' && account.gate12.housePrincipalOutstanding > 0) {
    return account.gate12.housePrincipalOutstanding;
  }
  if (process === 'PLAY') return account.hardBalance > 0 ? account.hardBalance : corridorTarget;
  return account.hardBalance > 0 ? account.hardBalance : corridorTarget;
}

function computeDeltaTForProcess(
  process: TocTaskType,
  p: TocPartner,
  account: TocAccount | undefined,
  task: TocOpenTask | undefined,
  expectedPlayT: number
): number {
  if (!account && process !== 'ONB') return expectedPlayT * 0.5;
  const callSign = account?.callSign ?? task?.callSign ?? p.partnerCode;

  if (process === 'PLAY' || process === 'WD') {
    const fromSoft = task ? softDeltaT(p, callSign, task.taskId, ['ProfitSplit']) : 0;
    if (fromSoft > 0) return fromSoft;
    if (process === 'WD' && account && account.gate12.housePrincipalOutstanding > 0) {
      return account.gate12.housePrincipalOutstanding;
    }
    return expectedPlayT;
  }

  if (process === 'LIMIT') {
    const daily = account?.limits.dailyMax ?? 0;
    const corridor = expectedPlayT > 0 ? expectedPlayT / 0.7 : 1200;
    return Math.max(0, daily - corridor) * 0.1 + expectedPlayT * 0.25;
  }

  if (process === 'ONB') return expectedPlayT;
  if (process === 'WARM') return expectedPlayT;
  if (process === 'FUND') return expectedPlayT * 0.15;
  return expectedPlayT * 0.5;
}

function defaultTau(process: TocTaskType): number {
  if (process === 'LIMIT') return 0.5;
  if (process === 'WARM') return 2;
  if (process === 'FUND') return 1;
  if (process === 'ONB') return 0.75;
  if (process === 'PLAY') return 1;
  if (process === 'WD') return 0.25;
  return 1;
}

export function computeProcessReturn(
  process: TocTaskType,
  p: TocPartner,
  account: TocAccount | undefined,
  task: TocOpenTask | undefined,
  catalog: TocReturnCatalog,
  corridorTarget: number,
  now: number,
  expectedPlayT: number
): TocProcessReturn {
  const callSign = account?.callSign ?? task?.callSign ?? p.partnerCode;
  const deltaT = computeDeltaTForProcess(process, p, account, task, expectedPlayT);
  const iPeak = computeIPeak(process, account, corridorTarget);
  const tauDays = task ? taskTauDays(task, now, defaultTau(process)) : defaultTau(process);
  const oe = account ? softOE(p, callSign, task?.taskId) : 0;
  // LIMIT/ONB are inventory-light — rank via process order; report τ-only R_P when I_peak=0
  const denom =
    iPeak <= 0 && (process === 'LIMIT' || process === 'ONB')
      ? Math.max(tauDays, 0.25)
      : iPeak * tauDays + oe;
  const rP = safeDivide(deltaT, denom);

  return {
    process,
    callSign,
    partnerCode: p.partnerCode,
    deltaT,
    iPeak,
    tauDays,
    oe,
    rP,
  };
}

export function computeAllProcessReturns(
  snap: TocOpsSnapshot,
  now: number,
  catalog: TocReturnCatalog,
  expectedPlayT: number
): TocProcessReturn[] {
  const rows: TocProcessReturn[] = [];

  for (const p of snap.partners) {
    const accountBySign = new Map(p.accounts.map(a => [a.callSign, a]));

    for (const task of p.openTasks) {
      if (task.status === 'Completed' || task.status === 'Stopped') continue;
      const account = accountBySign.get(task.callSign);
      rows.push(
        computeProcessReturn(
          task.taskType,
          p,
          account,
          task,
          catalog,
          snap.catalog.depositCorridor.target,
          now,
          expectedPlayT
        )
      );
    }

    for (const account of p.accounts) {
      if (account.status === 'WARMED' && account.limits.freshness !== 'fresh') {
        const hasLimitTask = p.openTasks.some(
          t => t.taskType === 'LIMIT' && t.callSign === account.callSign && t.status !== 'Completed'
        );
        if (!hasLimitTask) {
          rows.push(
            computeProcessReturn(
              'LIMIT',
              p,
              account,
              undefined,
              catalog,
              snap.catalog.depositCorridor.target,
              now,
              expectedPlayT
            )
          );
        }
      }
    }
  }

  return rows;
}

function firstFundTime(p: TocPartner, callSign: string): number | null {
  const deploy = p.softBalance.recentEntries.find(
    e => e.callSign === callSign && e.entryType === 'CapitalDeployment'
  );
  if (deploy) return parseTime(deploy.timestamp, NaN);
  const fundTask = p.openTasks.find(
    t => t.callSign === callSign && t.taskType === 'FUND' && t.createdAt
  );
  return fundTask?.createdAt ? parseTime(fundTask.createdAt, NaN) : null;
}

export function computeAssetEfficiency(
  p: TocPartner,
  account: TocAccount,
  now: number
): TocAssetEfficiency {
  const profitSplitTotal = p.softBalance.recentEntries
    .filter(e => e.callSign === account.callSign && e.entryType === 'ProfitSplit')
    .reduce((n, e) => n + e.amount, 0);

  const peakCapital = Math.max(
    account.hardBalance,
    p.softBalance.recentEntries
      .filter(e => e.callSign === account.callSign && e.entryType === 'CapitalDeployment')
      .reduce((n, e) => n + e.amount, 0)
  );

  const fundTime = firstFundTime(p, account.callSign);
  const capitalDaysInI =
    fundTime != null && Number.isFinite(fundTime)
      ? Math.max(1, msToDays(now - fundTime))
      : account.hardBalance > 0
        ? 7
        : 1;

  const ce = safeDivide(profitSplitTotal, peakCapital * capitalDaysInI);

  return {
    callSign: account.callSign,
    partnerCode: p.partnerCode,
    profitSplitTotal,
    peakCapital,
    capitalDaysInI,
    ce,
  };
}

export function computeLimitEnhancement(
  p: TocPartner,
  account: TocAccount,
  corridorTarget: number,
  now: number
): TocLimitEnhancement {
  const daily = account.limits.dailyMax ?? 0;
  const deltaL = daily > 0 ? Math.max(0, daily - corridorTarget) : 0.3;

  const cAsset = p.softBalance.recentEntries
    .filter(e => e.callSign === account.callSign && e.entryType === 'CapitalDeployment')
    .reduce((n, e) => n + e.amount, account.hardBalance);

  const fundTime = firstFundTime(p, account.callSign) ?? now;
  const limitTime = parseTime(account.limits.checkedAt, now);
  const daysToUsableLimit = Math.max(0.5, msToDays(limitTime - fundTime));

  const le = safeDivide(deltaL, cAsset * daysToUsableLimit);

  return {
    callSign: account.callSign,
    partnerCode: p.partnerCode,
    deltaL,
    cAsset: cAsset || corridorTarget,
    daysToUsableLimit,
    le,
  };
}

function deriveReadinessScore(
  account: TocAccount,
  freshness: 'fresh' | 'stale' | 'unknown'
): number {
  let score = 0.2;
  if (account.status === 'WARMED') score += 0.4;
  else if (account.status === 'Warming') score += 0.25;
  else if (account.status === 'Funded') score += 0.15;

  score += (account.warmupCount / 2) * 0.2;
  score *= limitFreshFactor(freshness);
  if (account.gate12.housePrincipalOutstanding > 0) score *= 0.3;
  if (account.status === 'Limited') score *= 0.2;
  return Math.min(1, Math.max(0, score));
}

export function computeWeightedScore(
  account: TocAccount,
  freshness: 'fresh' | 'stale' | 'unknown',
  expertWeight: number
): number {
  const readinessScore = deriveReadinessScore(account, freshness);
  const gate12Factor = account.gate12.housePrincipalOutstanding > 0 ? 0 : 1;
  const playable =
    account.status === 'WARMED' &&
    account.warmupCount >= 2 &&
    freshness === 'fresh' &&
    gate12Factor === 1;
  const playableBoost = playable ? 1.1 : 1;
  return readinessScore * expertWeight * limitFreshFactor(freshness) * gate12Factor * playableBoost;
}

export function normalizePartnerMetrics(snap: TocOpsSnapshot, now: number): TocPartner[] {
  const limitDays = snap.catalog.limitFreshnessDays;
  const expertById = new Map(snap.experts.map(e => [e.expertId, e.weight]));

  return snap.partners.map(p => {
    const accountScores = p.accounts.map(a => {
      const freshness = computeLimitFreshness(a.limits.checkedAt, limitDays, now);
      const limits = { ...a.limits, freshness };
      const expertWeight = a.expertId ? (expertById.get(a.expertId) ?? 1) : 1;
      const weightedScore = computeWeightedScore({ ...a, limits }, freshness, expertWeight);
      const score = deriveReadinessScore({ ...a, limits }, freshness);
      const playable =
        a.status === 'WARMED' &&
        a.warmupCount >= 2 &&
        freshness === 'fresh' &&
        a.gate12.housePrincipalOutstanding === 0;

      return {
        callSign: a.callSign,
        score,
        playable,
        weightedScore,
        factors: [
          a.status,
          `warmup_${a.warmupCount}_of_2`,
          `limits_${freshness}`,
          a.gate12.housePrincipalOutstanding > 0 ? 'gate12_principal_out' : 'gate12_clear',
        ],
      };
    });

    const playableAccountCount = accountScores.filter(s => s.playable).length;
    const score =
      accountScores.length > 0
        ? accountScores.reduce((n, s) => n + s.score, 0) / accountScores.length
        : p.readiness.score;

    const accounts = p.accounts.map(a => ({
      ...a,
      limits: {
        ...a.limits,
        freshness: computeLimitFreshness(a.limits.checkedAt, limitDays, now),
      },
    }));

    return {
      ...p,
      accounts,
      readiness: {
        score,
        playableAccountCount,
        accountScores,
      },
    };
  });
}

function settlementExposure(snap: TocOpsSnapshot): number {
  let pending = 0;
  for (const p of snap.partners) {
    pending += p.softBalance.pendingDeployments.totalAmount;
    for (const a of p.accounts) {
      if (a.capitalLocation === 'Pending' || a.capitalLocation === 'WithPartner') {
        pending += a.hardBalance;
      }
    }
    for (const play of p.recentPlays) {
      if (play.result === 'pending' || play.status === 'placed') {
        pending += play.stake;
      }
    }
  }
  return pending;
}

export function computeDynamicBuffer(
  snap: TocOpsSnapshot,
  throughputT: number,
  inventoryI: number,
  catalog: TocReturnCatalog,
  partners: TocPartner[]
): TocOpsSnapshot['buffer'] {
  const tPerDay = throughputT / catalog.tVelocityWindowDays;
  const velocityTarget = tPerDay * catalog.daysCover;
  const floatTarget = Math.max(catalog.staticFloatFloor, velocityTarget);
  const floatTargetSource = velocityTarget > catalog.staticFloatFloor ? 't_velocity' : 'static';
  const houseFloatHard = snap.buffer.houseFloatHard;
  const floatRatio = floatTarget > 0 ? houseFloatHard / floatTarget : 0;

  const pendingExposure = settlementExposure({ ...snap, partners });
  const settlementFloatRatio = inventoryI > 0 ? pendingExposure / inventoryI : 0;

  const warmed = partners.flatMap(p => p.accounts).filter(a => a.status === 'WARMED').length;
  const playableDrums = partners.reduce((n, p) => n + p.readiness.playableAccountCount, 0);
  const principalOutstandingTotal = partners
    .flatMap(p => p.accounts)
    .reduce((n, a) => n + a.gate12.housePrincipalOutstanding, 0);

  return {
    floatTarget,
    floatTargetSource,
    houseFloatHard,
    floatRatio,
    throttleOnboarding: settlementFloatRatio >= catalog.settlementThrottleRatio || floatRatio < 0.5,
    settlementFloatRatio,
    primedDrums: warmed,
    playableDrums,
    principalOutstandingTotal,
  };
}

function hasActivePlay(p: TocPartner, callSign: string): boolean {
  return p.openTasks.some(
    t =>
      t.callSign === callSign &&
      t.taskType === 'PLAY' &&
      t.status !== 'Completed' &&
      t.status !== 'Stopped'
  );
}

function actionPriority(a: TocRankedAction): number {
  if (a.process === 'LIMIT' && a.reason.includes('Stale')) return 100;
  if (a.process === 'WD' && a.reason.includes('principal_recovery')) return 95;
  if (a.process === 'LIMIT') return 92;
  if (a.process === 'PLAY') return 80 + (a.weightedScore ?? 0) * 10;
  if (a.process === 'WARM') return 70;
  if (a.process === 'WD') return 65;
  if (a.process === 'ONB') return 50;
  if (a.process === 'FUND') return 40;
  return 0;
}

export function rankNextActions(
  snap: TocOpsSnapshot,
  partners: TocPartner[],
  processReturns: TocProcessReturn[],
  assetEff: TocAssetEfficiency[],
  catalog: TocReturnCatalog,
  buffer: TocOpsSnapshot['buffer']
): TocRankedAction[] {
  const candidates: TocRankedAction[] = [];
  const returnByKey = new Map(
    processReturns.map(r => [`${r.process}|${r.callSign}|${r.partnerCode}`, r])
  );
  const ceBySign = new Map(assetEff.map(a => [a.callSign, a.ce]));

  for (const p of partners) {
    for (const account of p.accounts) {
      const freshness = account.limits.freshness;
      const weighted =
        p.readiness.accountScores.find(s => s.callSign === account.callSign)?.weightedScore ?? 0;

      if (account.status === 'WARMED' && (freshness === 'stale' || freshness === 'unknown')) {
        const r = returnByKey.get(`LIMIT|${account.callSign}|${p.partnerCode}`);
        const ropeSafe = !hasActivePlay(p, account.callSign);
        candidates.push({
          rank: 0,
          process: 'LIMIT',
          callSign: account.callSign,
          partnerCode: p.partnerCode,
          rP: r?.rP ?? 999,
          weightedScore: weighted,
          reason: ropeSafe
            ? 'Stale/missing limit on WARMED seat — LIMIT first (highest R)'
            : 'LIMIT queued — active PLAY (LIMIT-EX-03)',
          ropeSafe,
        });
      }

      if (
        p.status === 'Ready' &&
        (account.status === 'Warming' || account.status === 'Funded') &&
        account.warmupCount < 2
      ) {
        const r = returnByKey.get(`WARM|${account.callSign}|${p.partnerCode}`);
        candidates.push({
          rank: 0,
          process: 'WARM',
          callSign: account.callSign,
          partnerCode: p.partnerCode,
          rP: r?.rP ?? 0,
          weightedScore: weighted,
          reason: 'Complete WARM corridor (min capital path)',
          ropeSafe: true,
        });
      }

      if (
        account.status === 'WARMED' &&
        freshness === 'fresh' &&
        account.gate12.housePrincipalOutstanding === 0 &&
        p.readiness.accountScores.find(s => s.callSign === account.callSign)?.playable
      ) {
        const r = returnByKey.get(`PLAY|${account.callSign}|${p.partnerCode}`);
        candidates.push({
          rank: 0,
          process: 'PLAY',
          callSign: account.callSign,
          partnerCode: p.partnerCode,
          rP: r?.rP ?? 0,
          weightedScore: weighted,
          reason: 'WARMED + fresh limit — pick-play by weightedScore',
          ropeSafe: true,
        });
      }

      if (account.gate12.housePrincipalOutstanding > 0) {
        const r = returnByKey.get(`WD|${account.callSign}|${p.partnerCode}`);
        candidates.push({
          rank: 0,
          process: 'WD',
          callSign: account.callSign,
          partnerCode: p.partnerCode,
          rP: r?.rP ?? 0,
          weightedScore: weighted,
          reason: 'Gate 12 principal_recovery first',
          ropeSafe: account.gate12.withdrawalMode === 'principal_recovery',
        });
      }

      if (account.status === 'Limited' || (ceBySign.get(account.callSign) ?? 1) < 0.0005) {
        candidates.push({
          rank: 0,
          process: 'WD',
          callSign: account.callSign,
          partnerCode: p.partnerCode,
          rP: 0,
          weightedScore: weighted,
          reason: 'Low CE / Limited — WD + reallocate capital',
          ropeSafe: true,
        });
      }
    }

    if (p.status === 'Onboarding' && !buffer.throttleOnboarding) {
      const openOnb = p.openTasks.find(t => t.taskType === 'ONB' && t.status !== 'Completed');
      if (openOnb) {
        const r = returnByKey.get(`ONB|${openOnb.callSign}|${p.partnerCode}`);
        candidates.push({
          rank: 0,
          process: 'ONB',
          callSign: openOnb.callSign,
          partnerCode: p.partnerCode,
          rP: r?.rP ?? 0,
          reason: 'ONB new asset — buffer allows',
          ropeSafe: true,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    if (a.ropeSafe !== b.ropeSafe) return a.ropeSafe ? -1 : 1;
    const pa = actionPriority(a);
    const pb = actionPriority(b);
    if (pb !== pa) return pb - pa;
    if (b.rP !== a.rP) return b.rP - a.rP;
    return (b.weightedScore ?? 0) - (a.weightedScore ?? 0);
  });

  return candidates.map((c, i) => ({ ...c, rank: i + 1 }));
}

export function computeReturnEfficiencySlice(
  snap: TocOpsSnapshot,
  partners: TocPartner[],
  now: number,
  catalog: TocReturnCatalog
): TocReturnEfficiencySlice {
  const expectedPlayT = avgSettledProfitSplit(partners, catalog.defaultExpectedPlayT);
  const byProcess = computeAllProcessReturns(snap, now, catalog, expectedPlayT);

  const byAsset: TocAssetEfficiency[] = [];
  const byLimit: TocLimitEnhancement[] = [];
  for (const p of partners) {
    for (const a of p.accounts) {
      byAsset.push(computeAssetEfficiency(p, a, now));
      byLimit.push(computeLimitEnhancement(p, a, snap.catalog.depositCorridor.target, now));
    }
  }

  const rps = byProcess.map(r => r.rP).filter(r => Number.isFinite(r) && r < R_P_UNBOUNDED);
  const avgRP = rps.length ? rps.reduce((a, b) => a + b, 0) / rps.length : 0;

  const processTypeAvgRP: Partial<Record<TocTaskType, number>> = {};
  for (const proc of catalog.processRank) {
    const subset = byProcess.filter(r => r.process === proc);
    if (subset.length) {
      processTypeAvgRP[proc] = subset.reduce((n, r) => n + r.rP, 0) / subset.length;
    }
  }

  return {
    computedAt: new Date(now).toISOString(),
    byProcess,
    byAsset,
    byLimit,
    avgRP,
    processTypeAvgRP,
  };
}

/** Unified T/I/OE + return metrics + dynamic buffer (Pages bake + routing SSOT). */
export function getTioeSnapshot(
  snap: TocOpsSnapshot,
  now = Date.parse(snap.generatedAt)
): TocTioeSnapshot {
  const catalog = resolveReturnCatalog(snap);
  const partners = normalizePartnerMetrics(snap, now);
  const throughput = computeThroughput(partners);
  const returnEfficiency = computeReturnEfficiencySlice(snap, partners, now, catalog);
  const buffer = computeDynamicBuffer(snap, throughput.T, throughput.I, catalog, partners);
  const rankedActions = rankNextActions(
    snap,
    partners,
    returnEfficiency.byProcess,
    returnEfficiency.byAsset,
    catalog,
    buffer
  );

  return {
    throughput,
    buffer,
    returnEfficiency,
    rankedActions,
    partners,
  };
}

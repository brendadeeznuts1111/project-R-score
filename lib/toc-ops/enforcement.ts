/**
 * Hard Gate / Rope evaluation against TOC fixture (operate-plane lite).
 * Pure functions — no Pages mutations. Results bake into toc-ops.json.
 *
 * Mirrors toc-ops-repo gates.ts semantics without importing that repo.
 *
 * @see toc-ops-repo/src/schema/gates.ts
 * @see toc-ops-repo/docs/reference/TOC-Production-Reference.md §7
 */
import type {
  TocAccount,
  TocConstraintDiagnosis,
  TocEnforcementSlice,
  TocGateResult,
  TocOpenTask,
  TocOpsSnapshot,
  TocPartner,
  TocPlay,
  TocThroughputSlice,
  TocWdMode,
} from './types.ts';

export const WARMUP_REQUIRED_FOR_PLAY = 2 as const;

export type {
  TocConstraintDiagnosis,
  TocEnforcementSlice,
  TocGateId,
  TocGateResult,
  TocThroughputSlice,
} from './types.ts';

function resolveWdMode(warmupCount: number, principalOut: number): TocWdMode {
  if (warmupCount < WARMUP_REQUIRED_FOR_PLAY) return 'warmup_capital_return';
  if (principalOut > 0) return 'principal_recovery';
  return 'profit_split';
}

export function computeThroughput(partners: TocPartner[]): TocThroughputSlice {
  const byPartner: TocThroughputSlice['byPartner'] = {};
  let T = 0;
  let I = 0;
  let OE = 0;

  for (const p of partners) {
    let t = 0;
    let i = 0;
    let oe = 0;
    for (const e of p.softBalance.recentEntries) {
      if (e.entryType === 'ProfitSplit') {
        t += e.amount;
        T += e.amount;
      }
      if (e.entryType === 'CostOfPriming' || e.entryType === 'Loss') {
        oe += e.amount;
        OE += e.amount;
      }
    }
    for (const a of p.accounts) {
      i += a.hardBalance;
      I += a.hardBalance;
    }
    i += p.softBalance.pendingDeployments.totalAmount;
    I += p.softBalance.pendingDeployments.totalAmount;
    byPartner[p.partnerCode] = { T: t, I: i, OE: oe };
  }

  return { T, I, OE, byPartner };
}

function evalPlayWarmed(p: TocPartner, a: TocAccount, play?: TocPlay): TocGateResult {
  const ok = a.warmupCount >= WARMUP_REQUIRED_FOR_PLAY && a.status === 'WARMED';
  const attempt = play?.status === 'blocked' || play?.status === 'instruction';
  return {
    gateId: 'play_warmed',
    ok: attempt ? ok : ok || a.status !== 'Warming',
    severity: ok ? 'info' : 'critical',
    partnerCode: p.partnerCode,
    callSign: a.callSign,
    taskId: play?.taskId,
    reason: ok
      ? `PLAY Rope ok: ${a.callSign} WARMED warmup=${a.warmupCount}`
      : `PLAY blocked: warmup_count=${a.warmupCount} status=${a.status} (need WARMED + ${WARMUP_REQUIRED_FOR_PLAY})`,
    tag: ok ? '#ROPE' : '#HARDGATE-VIOLATION',
  };
}

function evalPlayLimit(p: TocPartner, a: TocAccount, play: TocPlay): TocGateResult {
  const daily = a.limits.dailyMax;
  const ok = daily == null || play.stake <= daily;
  return {
    gateId: 'play_limit',
    ok,
    severity: ok ? 'info' : 'critical',
    partnerCode: p.partnerCode,
    callSign: a.callSign,
    taskId: play.taskId,
    reason: ok
      ? `PLAY limit ok: stake ${play.stake} ≤ dailyMax ${daily ?? 'n/a'}`
      : `PLAY-EX-01: stake ${play.stake} > dailyMax ${daily}`,
    tag: ok ? undefined : '#HARDGATE-VIOLATION',
  };
}

function evalConfirmedRail(p: TocPartner, a: TocAccount): TocGateResult {
  const rail = p.rails.find(r => r.id === a.primaryRailId) ?? p.rails[0];
  const ok = !!rail?.confirmed;
  return {
    gateId: 'confirmed_rail',
    ok,
    severity: ok ? 'info' : 'critical',
    partnerCode: p.partnerCode,
    callSign: a.callSign,
    reason: ok
      ? `Rail confirmed: ${rail?.label}`
      : `Rail not confirmed for ${a.callSign} — FUND/WD Rope cut`,
    tag: ok ? '#ROPE' : '#HARDGATE-VIOLATION',
  };
}

function evalPartnerReady(p: TocPartner): TocGateResult {
  const ok = p.status === 'Ready';
  return {
    gateId: 'partner_ready',
    ok,
    severity: ok ? 'info' : 'warn',
    partnerCode: p.partnerCode,
    reason: ok
      ? `Partner ${p.partnerCode} Ready`
      : `Partner ${p.partnerCode} status=${p.status} — FUND blocked until Ready`,
    tag: ok ? undefined : '#ROPE',
  };
}

function evalGate12(p: TocPartner, a: TocAccount, task?: TocOpenTask): TocGateResult {
  const expected = resolveWdMode(a.warmupCount, a.gate12.housePrincipalOutstanding);
  const actual = a.gate12.withdrawalMode;
  const ok = expected === actual;
  const profitSplitBlocked = actual === 'profit_split' && a.gate12.housePrincipalOutstanding > 0;
  return {
    gateId: 'gate12_wd_mode',
    ok: ok && !profitSplitBlocked,
    severity: profitSplitBlocked || !ok ? 'critical' : 'info',
    partnerCode: p.partnerCode,
    callSign: a.callSign,
    taskId: task?.taskId,
    reason: profitSplitBlocked
      ? `GATE: PRINCIPAL_NOT_YET_RECOVERED — outstanding=${a.gate12.housePrincipalOutstanding}; use principal_recovery`
      : ok
        ? `Gate 12 mode ok: ${actual}`
        : `Gate 12 mismatch: account=${actual} expected=${expected}`,
    tag: profitSplitBlocked || !ok ? '#GATE12' : undefined,
  };
}

function evalSoftPosted(p: TocPartner, task: TocOpenTask): TocGateResult {
  if (task.status !== 'Completed' && task.taskType !== 'FUND' && task.taskType !== 'WD') {
    return {
      gateId: 'soft_posted',
      ok: true,
      severity: 'info',
      partnerCode: p.partnerCode,
      callSign: task.callSign,
      taskId: task.taskId,
      reason: 'Soft check N/A (task not money-close)',
    };
  }
  const has = p.softBalance.recentEntries.some(e => e.taskId === task.taskId);
  const moneyMoving = task.taskType === 'FUND' || task.taskType === 'WD';
  const needsSoft = task.status === 'Completed' || (moneyMoving && task.status === 'Processing');
  const ok = !needsSoft || has;
  return {
    gateId: 'soft_posted',
    ok,
    severity: ok ? 'info' : 'critical',
    partnerCode: p.partnerCode,
    callSign: task.callSign,
    taskId: task.taskId,
    reason: ok
      ? `Soft present for ${task.taskId}`
      : `Soft Balance required before Done — missing journal for ${task.taskId}`,
    tag: ok ? undefined : '#HARDGATE-VIOLATION',
  };
}

function evalScreenshot(p: TocPartner, task: TocOpenTask): TocGateResult {
  const needs =
    task.taskType === 'FUND' ||
    task.taskType === 'WD' ||
    task.taskType === 'LIMIT' ||
    task.taskType === 'ONB' ||
    task.taskType === 'PLAY';
  if (!needs || task.status === 'New' || task.status === 'GateCheck') {
    return {
      gateId: 'screenshot_first',
      ok: true,
      severity: 'info',
      partnerCode: p.partnerCode,
      callSign: task.callSign,
      taskId: task.taskId,
      reason: 'Screenshot check deferred (early status)',
    };
  }
  const ok = (task.proofRefs?.length ?? 0) > 0 || task.status === 'PendingPartner';
  return {
    gateId: 'screenshot_first',
    ok,
    severity: ok ? 'info' : 'warn',
    partnerCode: p.partnerCode,
    callSign: task.callSign,
    taskId: task.taskId,
    reason: ok
      ? `Screenshot-first ok / waiting Partner (${task.status})`
      : `Missing proofRefs on ${task.taskId}`,
    tag: ok ? undefined : '#HARDGATE-VIOLATION',
  };
}

function evalLimitFresh(p: TocPartner, a: TocAccount): TocGateResult {
  if (a.status !== 'WARMED') {
    return {
      gateId: 'limit_fresh_drum',
      ok: true,
      severity: 'info',
      partnerCode: p.partnerCode,
      callSign: a.callSign,
      reason: 'Limit freshness N/A (not on Drum)',
    };
  }
  const ok = a.limits.freshness === 'fresh';
  return {
    gateId: 'limit_fresh_drum',
    ok,
    severity: ok ? 'info' : 'warn',
    partnerCode: p.partnerCode,
    callSign: a.callSign,
    reason: ok
      ? `Drum limits fresh on ${a.callSign}`
      : `stale_limit_on_drum: ${a.callSign} freshness=${a.limits.freshness}`,
    tag: ok ? undefined : '#ROPE',
  };
}

function evalFundRailReady(p: TocPartner): TocGateResult {
  if (p.status === 'Onboarding') {
    return {
      gateId: 'fund_rail_ready',
      ok: true,
      severity: 'info',
      partnerCode: p.partnerCode,
      reason: `ONB — FUND gated until Ready + confirmed rail (current confirmed=${p.rails.some(r => r.confirmed)})`,
    };
  }
  const ok = p.status === 'Ready' && p.rails.some(r => r.confirmed);
  return {
    gateId: 'fund_rail_ready',
    ok,
    severity: ok ? 'info' : 'critical',
    partnerCode: p.partnerCode,
    reason: ok
      ? 'Partner Ready + confirmed rail'
      : 'FUND Hard Gate fail: need Ready + confirmed rail',
    tag: ok ? undefined : '#HARDGATE-VIOLATION',
  };
}

function evalWarmSequential(p: TocPartner, a: TocAccount): TocGateResult {
  const ok = a.status !== 'Warming' || a.warmupCount === 1 || a.warmupCount === 0;
  const bad = a.status === 'Warming' && a.warmupCount >= WARMUP_REQUIRED_FOR_PLAY;
  return {
    gateId: 'warm_sequential',
    ok: !bad && ok,
    severity: bad ? 'critical' : 'info',
    partnerCode: p.partnerCode,
    callSign: a.callSign,
    reason: bad
      ? `WARM sequence broken: Warming with warmup_count=${a.warmupCount}`
      : `WARM sequence ok: ${a.callSign} status=${a.status} count=${a.warmupCount}`,
    tag: bad ? '#HARDGATE-VIOLATION' : undefined,
  };
}

export function diagnoseConstraint(
  partners: TocPartner[],
  gates: TocGateResult[],
  buffer: TocOpsSnapshot['buffer']
): TocConstraintDiagnosis {
  const ropeBroken = gates.some(
    g =>
      !g.ok &&
      (g.tag === '#HARDGATE-VIOLATION' || g.tag === '#ROPE' || g.tag === '#GATE12') &&
      g.severity === 'critical'
  );
  const playable = partners.reduce((n, p) => n + p.readiness.playableAccountCount, 0);
  const warmed = partners.flatMap(p => p.accounts).filter(a => a.status === 'WARMED').length;
  const drumStarved = playable === 0 && warmed === 0;
  const bufferWrongSized =
    buffer.throttleOnboarding || buffer.floatRatio < 0.5 || buffer.settlementFloatRatio >= 0.6;

  let focus: TocConstraintDiagnosis['focus'] = 'elevate';
  let summary = 'Rope/Drum/Buffer healthy — elevation may be considered';
  if (ropeBroken) {
    focus = 'rope';
    summary = 'Rope broken — fix Hard Gates / Soft / screenshots before elevating';
  } else if (drumStarved || playable === 0) {
    focus = 'drum';
    summary = 'Drum starved — no playable WARMED accounts (finish WARM / limits / Partner ball)';
  } else if (bufferWrongSized) {
    focus = 'buffer';
    summary = 'Buffer wrong-sized — check float ratio / settlement throttle / onboard pause';
  }

  return {
    order: ['rope', 'drum', 'buffer', 'elevate'],
    focus,
    summary,
    ropeBroken,
    drumStarved: drumStarved || playable === 0,
    bufferWrongSized,
  };
}

/** Evaluate all operate-lite Hard Gates against fixture partners. */
export function evaluateTocEnforcement(snap: TocOpsSnapshot): TocEnforcementSlice {
  const gates: TocGateResult[] = [];
  const accountsBySign = new Map<string, { p: TocPartner; a: TocAccount }>();

  for (const p of snap.partners) {
    gates.push(evalPartnerReady(p));
    gates.push(evalFundRailReady(p));
    for (const a of p.accounts) {
      accountsBySign.set(a.callSign, { p, a });
      gates.push(evalConfirmedRail(p, a));
      gates.push(evalLimitFresh(p, a));
      gates.push(evalWarmSequential(p, a));
      gates.push(
        evalGate12(
          p,
          a,
          p.openTasks.find(t => t.callSign === a.callSign && t.taskType === 'WD')
        )
      );
      gates.push(evalPlayWarmed(p, a));
    }
    for (const play of p.recentPlays) {
      const pair = accountsBySign.get(play.callSign);
      if (!pair) continue;
      if (play.status === 'blocked' || play.status === 'instruction' || play.status === 'placed') {
        gates.push(evalPlayWarmed(pair.p, pair.a, play));
        gates.push(evalPlayLimit(pair.p, pair.a, play));
      }
    }
    for (const task of p.openTasks) {
      gates.push(evalSoftPosted(p, task));
      gates.push(evalScreenshot(p, task));
    }
  }

  const seen = new Map<string, TocGateResult>();
  for (const g of gates) {
    const key = `${g.gateId}|${g.callSign ?? ''}|${g.taskId ?? ''}|${g.partnerCode}`;
    const prev = seen.get(key);
    if (
      !prev ||
      (!g.ok && prev.ok) ||
      (g.severity === 'critical' && prev.severity !== 'critical')
    ) {
      seen.set(key, g);
    }
  }
  const uniq = [...seen.values()];
  const failed = uniq.filter(g => !g.ok);
  const criticalFailed = failed.filter(g => g.severity === 'critical').length;
  const throughput = computeThroughput(snap.partners);
  const diagnosis = diagnoseConstraint(snap.partners, uniq, snap.buffer);

  return {
    evaluatedAt: new Date().toISOString(),
    plane: 'operate-lite',
    note: 'Evaluated in-repo against fixture + Soft rollups. Pages cannot mutate; post Soft via bun local APIs / CT.',
    warmupRequiredForPlay: WARMUP_REQUIRED_FOR_PLAY,
    gates: uniq,
    passed: uniq.filter(g => g.ok).length,
    failed: failed.length,
    criticalFailed,
    throughput,
    diagnosis,
  };
}

export function resolveWithdrawalModeForAccount(a: TocAccount): TocWdMode {
  return resolveWdMode(a.warmupCount, a.gate12.housePrincipalOutstanding);
}

/** Attach operate-lite enforcement slice (pure; safe for Pages bake). */
export function withTocEnforcement(snap: TocOpsSnapshot): TocOpsSnapshot {
  return {
    ...snap,
    enforcement: evaluateTocEnforcement(snap),
  };
}

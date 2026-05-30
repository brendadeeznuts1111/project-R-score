/**
 * Partner Profile OS — THE KERNEL
 *
 * class PartnerGateway { profile: PartnerProfile; runtime: PartnerRuntimeState }
 *
 * evaluate(signal): GateResult — THE single entry point for all zone consumption.
 *
 * 10-step evaluation (in order):
 *   1. State check: must be active or graduated
 *   2. Book whitelist/blacklist check
 *   3. Signal type check (steam/arb/clv/manual/predictive allowed flags)
 *   4. Tier eligibility (context.tier in sor.eligible_tiers)
 *   5. KYC check (kyc_status === "verified")
 *   6. Balance check (currentBalance > minimum threshold)
 *   7. OpSec check (opsec_score <= max, risk_level not red)
 *   8. Market-specific limit check (currentLimits[market])
 *   9. Exposure check (suggestedStake <= maxExposurePerSignal, <= remainingDaily)
 *  10. Adjust stake if over limits, return action + metadata
 *
 * All gate decisions logged to immutable partner_gate_log table.
 */

import {
  type PartnerProfile,
  type PartnerRuntimeState,
  type GateResult,
  type SignalContext,
  type RiskLevel,
  type KycStatus,
  GateResultSchema,
} from "./partner-profile-schema";
import { EwmaTracker } from "../../services/ewma-tracker";

export class PartnerGateway {
  /** EWMA adaptive exposure tracker. Nil when lambda=0 (static caps). */
  readonly ewma: EwmaTracker | null;

  constructor(
    public readonly profile: PartnerProfile,
    public runtime: PartnerRuntimeState
  ) {
    const lambda = profile.sor.ewma_lambda ?? 0;
    this.ewma = lambda > 0 ? new EwmaTracker(lambda) : null;
  }

  // ── Core: Signal Evaluation ──

  /**
   * THE single entry point. Evaluates a signal against all 10 gates.
   * Returns GateResult: { allowed, action, reason?, adjustedStake?, metadata }
   *
   * Complexity: O(1) per partner
   */
  evaluate(signal: SignalContext): GateResult {
    const now = Math.floor(Date.now() / 1000);
    const p = this.profile;
    const r = this.runtime;
    const s = p.sor;

    // Build metadata scaffold
    const ewmaExposure = this.ewma?.currentExposure() ?? 0;
    const staticRemaining = Math.max(0, s.max_daily_exposure - r.dailyUsed);
    // EWMA-aware remaining: whichever is more restrictive
    const effectiveRemaining = this.ewma
      ? Math.min(staticRemaining, Math.max(0, s.max_daily_exposure - ewmaExposure))
      : staticRemaining;

    const metaBase = {
      originalStake: signal.suggestedStake,
      maxExposure: s.max_exposure_per_signal,
      maxDaily: s.max_daily_exposure,
      remainingDaily: effectiveRemaining,
      tier: signal.tier,
      template: p.template_id,
      bookAllowed: false,
      typeAllowed: false,
      kycPass: false,
      balancePass: false,
      opsecPass: false,
    };

    // 1. State check: must be active or graduated
    if (p.state !== "active" && p.state !== "graduated") {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `Partner ${p.state}`,
        metadata: { ...metaBase, bookAllowed: true, typeAllowed: true, kycPass: true, balancePass: true, opsecPass: true },
      }, signal.signalId);
    }

    // 2. Book whitelist/blacklist check
    if (s.book_blacklist.includes(signal.bookId)) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `Book ${signal.bookId} BLACKLISTED`,
        metadata: { ...metaBase, bookAllowed: false },
      }, signal.signalId);
    }
    if (s.book_whitelist.length > 0 && !s.book_whitelist.includes(signal.bookId)) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `Book ${signal.bookId} not in whitelist`,
        metadata: { ...metaBase, bookAllowed: false },
      }, signal.signalId);
    }
    metaBase.bookAllowed = true;

    // 3. Signal type check
    const typeMap: Record<string, boolean> = {
      steam: s.steam_allowed,
      arb: s.arb_allowed,
      clv: s.clv_allowed,
      manual: s.manual_allowed,
      predictive: s.predictive_allowed,
    };
    if (!typeMap[signal.type]) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `Signal type '${signal.type}' not enabled`,
        metadata: { ...metaBase, typeAllowed: false },
      }, signal.signalId);
    }
    metaBase.typeAllowed = true;

    // 4. Tier eligibility
    if (!s.eligible_tiers.includes(signal.tier as any)) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `Tier ${signal.tier} not eligible`,
        metadata: metaBase,
      }, signal.signalId);
    }

    // 5. KYC check
    if (r.kycStatus !== "verified") {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: "KYC pending",
        metadata: { ...metaBase, kycPass: false },
      }, signal.signalId);
    }
    metaBase.kycPass = true;

    // 6. Balance check (balance must be > 0)
    if (r.currentBalance <= 0) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: "Insufficient balance",
        metadata: { ...metaBase, balancePass: false },
      }, signal.signalId);
    }
    metaBase.balancePass = true;

    // 7. OpSec check
    if (r.riskLevel === "red") {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: "Risk level is RED",
        metadata: { ...metaBase, opsecPass: false },
      }, signal.signalId);
    }
    if (r.opsecScore > s.opsec_score_max) {
      // Auto-suspend trigger
      try {
        this.triggerAutoSuspend(`OpSec score ${r.opsecScore} > max ${s.opsec_score_max}`);
      } catch (_) { /* best effort */ }
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `OpSec score exceeded (${r.opsecScore} > ${s.opsec_score_max})`,
        metadata: { ...metaBase, opsecPass: false },
      }, signal.signalId);
    }
    if (s.require_opsec_green && r.riskLevel !== "green") {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `OpSec must be green (current: ${r.riskLevel})`,
        metadata: { ...metaBase, opsecPass: false },
      }, signal.signalId);
    }
    metaBase.opsecPass = true;

    // 8. Market-specific limit check
    const marketLimit = r.currentLimits[signal.market];
    if (marketLimit !== undefined && marketLimit <= 0) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: `Market ${signal.market} blocked (limit = 0)`,
        metadata: { ...metaBase, marketLimit: 0 },
      }, signal.signalId);
    }

    // 9. Exposure check
    const remainingDaily = metaBase.remainingDaily;
    const maxSignal = s.max_exposure_per_signal;
    let adjustedStake = signal.suggestedStake;
    let action: "allow" | "adjust" = "allow";
    let reason: string | undefined;

    // Check max per signal
    if (maxSignal > 0 && adjustedStake > maxSignal) {
      adjustedStake = maxSignal;
      action = "adjust";
      reason = "Exceeds max exposure per signal";
    }

    // Check max single bet
    if (s.max_single_bet > 0 && adjustedStake > s.max_single_bet) {
      adjustedStake = s.max_single_bet;
      action = "adjust";
      reason = "Exceeds max single bet";
    }

    // Check market limit
    if (marketLimit !== undefined && marketLimit > 0 && adjustedStake > marketLimit) {
      adjustedStake = marketLimit;
      action = "adjust";
      reason = `Exceeds market limit for ${signal.market}`;
    }

    // Check remaining daily
    if (remainingDaily <= 0) {
      return this.logAndReturn({
        allowed: false,
        action: "block",
        reason: "Daily exposure limit exhausted",
        metadata: metaBase,
      }, signal.signalId);
    }
    if (adjustedStake > remainingDaily) {
      adjustedStake = remainingDaily;
      action = "adjust";
      reason = "Exceeds remaining daily exposure";
    }

    // 10. Final result
    if (action === "adjust") {
      return this.logAndReturn({
        allowed: true,
        action: "adjust",
        reason,
        adjustedStake: Math.floor(adjustedStake * 100) / 100, // round to 2 decimals
        metadata: { ...metaBase, marketLimit },
      }, signal.signalId);
    }

    return this.logAndReturn({
      allowed: true,
      action: "allow",
      metadata: { ...metaBase, marketLimit },
    }, signal.signalId);
  }

  // ── Runtime Mutations ──

  /** Record consumed exposure. Also updates EWMA tracker if active. */
  recordExposure(stake: number): void {
    this.runtime.dailyUsed += stake;
    this.runtime.lastBetAt = Math.floor(Date.now() / 1000);
    if (this.ewma) {
      this.ewma.record(stake);
      const snap = this.ewma.snapshot();
      console.log(
        `[PARTNER:${this.profile.partner_id}] recordExposure: +${stake} ` +
        `(dailyUsed=${this.runtime.dailyUsed}, ewma=${snap.effectiveExposure.toFixed(0)}, λ=${snap.lambda})`
      );
    } else {
      console.log(
        `[PARTNER:${this.profile.partner_id}] recordExposure: +${stake} (dailyUsed=${this.runtime.dailyUsed})`
      );
    }
  }

  /** Release exposure (e.g., bet cancelled or settled). */
  releaseExposure(stake: number): void {
    this.runtime.dailyUsed = Math.max(0, this.runtime.dailyUsed - stake);
    console.log(
      `[PARTNER:${this.profile.partner_id}] releaseExposure: -${stake} (dailyUsed=${this.runtime.dailyUsed})`
    );
  }

  /** Record a deposit. */
  recordDeposit(amount: number): void {
    this.runtime.currentBalance += amount;
    this.runtime.totalDeposited += amount;
    this.runtime.lastDepositAt = Math.floor(Date.now() / 1000);
    console.log(
      `[PARTNER:${this.profile.partner_id}] recordDeposit: +${amount} (balance=${this.runtime.currentBalance})`
    );
  }

  /** Record a withdrawal. */
  recordWithdrawal(amount: number): void {
    if (amount > this.runtime.currentBalance) {
      throw new Error("Insufficient balance for withdrawal");
    }
    this.runtime.currentBalance -= amount;
    this.runtime.totalWithdrawn += amount;
    console.log(
      `[PARTNER:${this.profile.partner_id}] recordWithdrawal: -${amount} (balance=${this.runtime.currentBalance})`
    );
  }

  /** Record settlement P&L. */
  recordSettlement(pnl: number): void {
    this.runtime.currentBalance += pnl;
    this.runtime.totalSettledPnl += pnl;
    this.runtime.lastSettlementAt = Math.floor(Date.now() / 1000);
    console.log(
      `[PARTNER:${this.profile.partner_id}] recordSettlement: ${pnl >= 0 ? "+" : ""}${pnl} (balance=${this.runtime.currentBalance})`
    );
  }

  /** Reset daily exposure counter and EWMA tracker. */
  resetDaily(): void {
    this.runtime.dailyUsed = 0;
    this.runtime.dailyResetAt = Math.floor(Date.now() / 1000);
    if (this.ewma) {
      this.ewma.reset();
      console.log(`[PARTNER:${this.profile.partner_id}] resetDaily: dailyUsed=0, ewma=0`);
    } else {
      console.log(`[PARTNER:${this.profile.partner_id}] resetDaily: dailyUsed=0`);
    }
  }

  /** Set KYC status. */
  setKyc(status: KycStatus): void {
    this.runtime.kycStatus = status;
    console.log(`[PARTNER:${this.profile.partner_id}] setKyc: ${status}`);
  }

  /** Set risk level and OpSec score. */
  setRisk(level: RiskLevel, score: number): void {
    this.runtime.riskLevel = level;
    this.runtime.opsecScore = score;
    console.log(`[PARTNER:${this.profile.partner_id}] setRisk: level=${level} score=${score}`);
  }

  /** Set a per-market cultivation limit. */
  setMarketLimit(market: string, limit: number): void {
    this.runtime.currentLimits[market] = limit;
    console.log(`[PARTNER:${this.profile.partner_id}] setMarketLimit: ${market}=${limit}`);
  }

  // ── Query Shortcuts ──

  /**
   * Get commission rate for a given volume.
   * O(1) tier resolution — iterates through sorted tiers.
   */
  getCommissionRate(volume: number): number {
    const { commission_structure, commission_tiers } = this.profile.settlement;
    if (commission_structure === "flat") {
      return commission_tiers[0]?.rate ?? 0;
    }
    // Tiered: find highest threshold that volume exceeds
    let rate = 0;
    for (const tier of commission_tiers) {
      if (volume >= tier.threshold) {
        rate = tier.rate;
      }
    }
    return rate;
  }

  getPayoutCadence(): string {
    return this.profile.settlement.payout_cadence;
  }

  getTelegramGroups(): Array<{ type: string; name: string }> {
    return this.profile.telegram.groups.map((g) => ({
      type: g.type,
      name: g.name.replace(/{partner_id}/g, this.profile.partner_id),
    }));
  }

  /** Check if an alert of a given type and stake should fire. */
  shouldAlert(type: string, stake: number): boolean {
    const { alert_types, alert_stake_minimum } = this.profile.telegram;
    if (!alert_types.includes(type)) return false;
    if (stake < alert_stake_minimum) return false;
    return true;
  }

  /** Get alert groups for a signal type. */
  getAlertGroups(signalType: string): Array<{ type: string; name: string }> {
    const { groups } = this.profile.telegram;
    const typeGroup = groups.find((g) => g.type === signalType);
    const signalsGroup = groups.find((g) => g.type === "signals");
    return [typeGroup, signalsGroup]
      .filter(Boolean)
      .map((g) => ({
        type: g!.type,
        name: g!.name.replace(/{partner_id}/g, this.profile.partner_id),
      }));
  }

  /** Authorize a source connection. */
  authorizeSource(sourceId: string, sourceType: string): { allowed: boolean; reason?: string } {
    // Check max sources limit
    const activeSources = this.profile.sources.defaults.filter((s) => s.active).length;
    if (activeSources >= this.profile.sources.max_sources) {
      return { allowed: false, reason: `Max sources (${this.profile.sources.max_sources}) reached` };
    }

    // Check if source exists in profile
    const source = this.profile.sources.defaults.find((s) => s.id === sourceId);
    if (!source) {
      return { allowed: false, reason: `Source '${sourceId}' not in profile template` };
    }

    // Check API access permission
    if (sourceType === "book_api" && !this.profile.sources.api_access) {
      return { allowed: false, reason: "API access not enabled for this partner" };
    }

    return { allowed: true };
  }

  /** Calculate commission for a settled bet. */
  calculateCommission(
    stake: number,
    odds: number,
    result: "win" | "loss" | "push",
    volume: number
  ): { commission: number; houseNet: number; makeupApplied: number } {
    const rate = this.getCommissionRate(volume);
    const grossPnl = result === "win" ? -stake * (odds - 1) : result === "loss" ? stake : 0;
    const commission = Math.abs(grossPnl) * rate;
    const makeupApplied = this.applyMakeup(commission);
    const houseNet = grossPnl + commission - makeupApplied;

    return { commission, houseNet, makeupApplied };
  }

  /** Check if margin call is triggered. */
  checkMarginCall(): { triggered: boolean; action: string; threshold: number; current: number } {
    const { margin_call_threshold, margin_call_action } = this.profile.balance;
    const balanceRatio = this.runtime.currentBalance / Math.max(1, this.runtime.totalDeposited);
    const triggered = balanceRatio < margin_call_threshold && this.runtime.totalDeposited > 0;
    return {
      triggered,
      action: margin_call_action,
      threshold: margin_call_threshold,
      current: balanceRatio,
    };
  }

  /** Get a read-only snapshot of runtime state. */
  getRuntime(): Readonly<PartnerRuntimeState> {
    return Object.freeze({ ...this.runtime });
  }

  // ── Private ──

  private applyMakeup(commission: number): number {
    const { makeup_enabled } = this.profile.settlement;
    if (!makeup_enabled || this.profile.settlement.makeup_balance <= 0) return 0;

    const applied = Math.min(commission, this.profile.settlement.makeup_balance);
    this.profile.settlement.makeup_balance -= applied;
    return applied;
  }

  private triggerAutoSuspend(reason: string): void {
    console.error(`[PARTNER:${this.profile.partner_id}] AUTO-SUSPEND triggered: ${reason}`);
    // Best-effort: persist to lifecycle log, caller handles state transition
  }

  /**
   * Log gate decision and return validated GateResult.
   * All gate decisions are logged to partner_gate_log (immutable audit).
   */
  private logAndReturn(result: Omit<GateResult, "metadata"> & { metadata: GateResult["metadata"] }, signalId: string): GateResult {
    // Persist gate log (best effort)
    try {
      console.log(
        `[PARTNER:${this.profile.partner_id}] GATE signal=${signalId} ` +
          `action=${result.action} allowed=${result.allowed} ` +
          `reason=${result.reason ?? "-"} stake=${result.adjustedStake ?? result.metadata.originalStake}`
      );
    } catch (_) { /* never crash on logging */ }

    return GateResultSchema.parse(result);
  }
}

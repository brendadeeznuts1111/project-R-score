/**
 * Partner Profile OS — Settlement Integration
 *
 * - calculateCommission(stake, odds, result, volume): use tiered commission
 * - applyMakeup(commission): subtract makeup if enabled
 * - getCommissionTiers(): return tier thresholds and rates
 * - recordSettlement(partnerId, betResult): update balances
 */

import { partnerProfileService } from "./partner-profile-service";
import type { CommissionTier } from "./partner-profile-schema";

export interface BetResult {
  betId: string;
  stake: number;
  odds: number;
  result: "win" | "loss" | "push";
  volume: number;
}

export interface SettlementResult {
  partnerId: string;
  betId: string;
  commission: number;
  houseNet: number;
  makeupApplied: number;
  partnerBalanceAfter: number;
  profitLoss: number;
  settledAt: number;
}

/**
 * Process a bet settlement for a partner.
 *
 * Flow:
 *   1. Calculate commission (tiered rate based on volume)
 *   2. Apply makeup if enabled
 *   3. Update partner balance with P&L
 *   4. Persist to partner_settlement_log
 */
export function processSettlement(
  partnerId: string,
  bet: BetResult
): SettlementResult {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) {
    throw new Error(`Partner '${partnerId}' not found`);
  }

  const { stake, odds, result, volume } = bet;

  // Calculate commission and makeup
  const { commission, houseNet, makeupApplied } = gateway.calculateCommission(
    stake,
    odds,
    result,
    volume
  );

  // Apply P&L to balance
  const pnl =
    result === "win"
      ? stake * (odds - 1)
      : result === "loss"
      ? -stake
      : 0;

  gateway.recordSettlement(pnl);

  const partnerBalanceAfter = gateway.runtime.currentBalance;

  // Persist settlement log (best effort)
  persistSettlementLog(
    partnerId,
    bet.betId,
    stake,
    odds,
    result,
    pnl,
    commission,
    makeupApplied,
    houseNet,
    partnerBalanceAfter
  );

  return {
    partnerId,
    betId: bet.betId,
    commission,
    houseNet,
    makeupApplied,
    partnerBalanceAfter,
    profitLoss: pnl,
    settledAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Get commission tiers for a partner.
 */
export function getCommissionTiers(partnerId: string): {
  structure: string;
  tiers: CommissionTier[];
  currentMakeupBalance: number;
  makeupEnabled: boolean;
} {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) {
    throw new Error(`Partner '${partnerId}' not found`);
  }

  return {
    structure: gateway.profile.settlement.commission_structure,
    tiers: gateway.profile.settlement.commission_tiers,
    currentMakeupBalance: gateway.profile.settlement.makeup_balance,
    makeupEnabled: gateway.profile.settlement.makeup_enabled,
  };
}

/**
 * Get the commission rate for a given volume.
 * O(1) tier resolution.
 */
export function getCommissionRate(partnerId: string, volume: number): number {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return 0;
  return gateway.getCommissionRate(volume);
}

/**
 * Apply a makeup adjustment to a partner's makeup balance.
 * Used when makeup is cleared or added manually.
 */
export function adjustMakeupBalance(
  partnerId: string,
  amount: number
): number {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) {
    throw new Error(`Partner '${partnerId}' not found`);
  }

  gateway.profile.settlement.makeup_balance += amount;
  console.log(
    `[SETTLEMENT] ${partnerId} makeup adjusted by ${amount}: new balance=${gateway.profile.settlement.makeup_balance}`
  );
  return gateway.profile.settlement.makeup_balance;
}

// ── Private ──

function persistSettlementLog(
  partnerId: string,
  betId: string,
  stake: number,
  odds: number,
  result: string,
  pnl: number,
  commission: number,
  makeupApplied: number,
  houseNet: number,
  partnerBalanceAfter: number
): void {
  // In production: INSERT INTO partner_settlement_log
  console.log(
    `[SETTLEMENT] ${partnerId} bet=${betId} result=${result} pnl=${pnl.toFixed(2)} ` +
      `commission=${commission.toFixed(2)} makeup=${makeupApplied.toFixed(2)} ` +
      `balance_after=${partnerBalanceAfter.toFixed(2)}`
  );
}

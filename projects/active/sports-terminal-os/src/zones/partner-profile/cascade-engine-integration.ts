/**
 * Partner Profile OS — Cascade Engine Integration
 *
 * One-call processing: processSignal(signal) → routeSignal() → evaluate() → recordExposure()
 *
 * Single function: entire flow from raw signal to exposure recording.
 * Returns array of { partnerId, result } with exposure recorded.
 *
 * Cross-zone consumption entry point for the Sports Terminal Core.
 */

import { type SignalContext, type GateResult } from "./partner-profile-schema";
import { partnerProfileService } from "./partner-profile-service";
import { routeSignal } from "./partner-source-router";

/**
 * Process a single signal through the full cascade:
 *   1. Lookup partner gateway
 *   2. gateway.evaluate(signal)
 *   3. If allowed, gateway.recordExposure(stake)
 *   4. Return GateResult
 *
 * For direct (single-partner) routing — used when signal.partnerId is set.
 */
export function processSignal(signal: SignalContext): GateResult {
  const gateway = partnerProfileService.getGateway(signal.partnerId);
  if (!gateway) {
    return blocked("Partner not found", signal);
  }

  const result = gateway.evaluate(signal);

  if (result.allowed) {
    const stake = result.adjustedStake ?? signal.suggestedStake;
    gateway.recordExposure(stake);
  }

  return result;
}

/**
 * Process a signal and route it to ALL partners that have the book.
 * Multi-partner routing entry point.
 *
 * Returns array of { partnerId, result } with exposure already recorded.
 */
export function processSignalRoute(
  signal: SignalContext
): Array<{ partnerId: string; result: GateResult }> {
  return routeSignal(signal);
}

/**
 * Release previously recorded exposure (e.g., bet was cancelled before settlement).
 */
export function releaseSignalExposure(
  partnerId: string,
  stake: number
): void {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return;
  gateway.releaseExposure(stake);
}

/**
 * Process a batch of signals for the same partner.
 */
export function processSignalBatch(
  signals: SignalContext[]
): Array<{ signal: SignalContext; result: GateResult }> {
  return signals.map((signal) => ({
    signal,
    result: processSignal(signal),
  }));
}

// ── Helpers ──

function blocked(reason: string, signal: SignalContext): GateResult {
  return {
    allowed: false,
    action: "block",
    reason,
    metadata: {
      originalStake: signal.suggestedStake,
      maxExposure: 0,
      maxDaily: 0,
      remainingDaily: 0,
      tier: signal.tier,
      template: "",
      bookAllowed: false,
      typeAllowed: false,
      kycPass: false,
      balancePass: false,
      opsecPass: false,
    },
  };
}

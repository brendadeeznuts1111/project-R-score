export interface LegSignal {
  deviceId: string;
  ageDays: number;
  legAmount: number;
  legVelocity: number; // legs per hour
  ipJump: number; // /24 changes in last 24 h
  walletAgeDelta: number; // days between wallet creation and leg
  ctrProximity: number; // USD distance to $10 k daily
  chargebackHistory: boolean;
}

export function calculateLegRiskScore(signal: LegSignal): number {
  const weights = {
    amount: 0.3,
    velocity: 0.25,
    ipJump: 0.2,
    walletAgeDelta: 0.15,
    ctrProximity: 0.1,
  };

  // Clamp features to 0-1
  const norm = {
    amount: Math.min(1, signal.legAmount / 5000),
    velocity: Math.min(1, signal.legVelocity / 100),
    ipJump: Math.min(1, signal.ipJump / 50),
    walletAgeDelta: Math.min(1, signal.walletAgeDelta / 730),
    ctrProximity: Math.min(1, signal.ctrProximity / 10000),
  };

  let score = Object.keys(weights).reduce(
    (s, k) => s + norm[k as keyof typeof norm] * weights[k as keyof typeof weights],
    0
  );

  if (signal.chargebackHistory) score += 0.15;

  return Math.min(1, score);
}
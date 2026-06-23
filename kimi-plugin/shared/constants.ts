export const SPORT_POSSESSION_EMOJI: Record<string, string> = {
  NFL: "🏈",
  NCAAF: "🏈",
  NBA: "🏀",
  NCAAB: "🏀",
  MLB: "⚾",
  NHL: "🏒",
  SOCCER: "⚽",
};

export const RISK_TIERS: [number, string, string][] = [
  [100000, "🔴", "#ff4500"],
  [50000, "🟠", "#ff8c00"],
  [10000, "🟡", "#ffd700"],
  [0, "🟢", "#00ff7f"],
];

export function riskEmoji(exposure: number): string {
  for (const [threshold, emoji] of RISK_TIERS) {
    if (exposure > threshold) return emoji;
  }
  return RISK_TIERS[RISK_TIERS.length - 1][1];
}

export function riskColor(exposure: number): string {
  for (const [threshold, , hex] of RISK_TIERS) {
    if (exposure > threshold) return hex;
  }
  return RISK_TIERS[RISK_TIERS.length - 1][2];
}

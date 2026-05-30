export const SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "SOCCER"] as const;
export type Sport = typeof SPORTS[number];

export const MARKETS = ["moneyline", "spread", "totals", "all"] as const;
export type Market = typeof MARKETS[number];

export const STATUS_FILTERS = ["live", "upcoming", "completed", "all"] as const;
export const HANDLE_PERIODS = ["today", "week", "month"] as const;
export const POSITION_VIEWS = ["summary", "by_sport", "by_game", "sharp_flags", "limits"] as const;

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

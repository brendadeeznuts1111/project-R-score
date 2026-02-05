#!/usr/bin/env bun
/**
 * Matrix CLI table output using Bun.stringWidth for column alignment.
 */

import { getTheme } from "../src/client/config";

const TIER_COLORS: Record<string, string> = {
  elite: "\u001b[32m",
  strong: "\u001b[36m",
  medium: "\u001b[33m",
  caution: "\u001b[35m",
};
const RESET = "\u001b[0m";

export interface MatrixRow {
  pattern: string;
  opsPerSec?: number;
  colorTier?: string;
  [k: string]: unknown;
}

function colorize(text: string, tier: string): string {
  const c = TIER_COLORS[tier] ?? "";
  return c ? `${c}${text}${RESET}` : text;
}

export function printMatrixTable(
  results: MatrixRow[],
  options?: { theme?: "light" | "dark" | "midnight" },
): void {
  const _theme = options?.theme ?? "midnight";
  getTheme(_theme);

  const colPattern = Math.max(8, ...results.map((r) => Bun.stringWidth(String(r.pattern))), 32);
  const colOps = 12;
  const colTier = 10;

  const header =
    "Pattern".padEnd(colPattern) +
    "  " +
    "Ops/sec".padStart(colOps) +
    "  " +
    "Tier".padStart(colTier);
  console.log(header);
  console.log("—".repeat(colPattern + colOps + colTier + 4));

  for (const r of results) {
    const tier = (r.colorTier ?? "medium") as string;
    const tierRaw = String(tier);
    const tierDisplay = colorize(tierRaw, tier);
    const tierWidth = Bun.stringWidth(tierRaw);
    const tierPad = " ".repeat(Math.max(0, colTier - tierWidth));

    const pattern = String(r.pattern);
    const ops = typeof r.opsPerSec === "number" ? r.opsPerSec.toLocaleString() : "—";

    console.log(
      pattern.padEnd(colPattern) +
        "  " +
        ops.padStart(colOps) +
        "  " +
        tierDisplay +
        tierPad,
    );
  }
}

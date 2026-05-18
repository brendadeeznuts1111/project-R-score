#!/usr/bin/env bun
/**
 * Deep ANSI Color Demo
 * Run: bun run examples/color-demo.ts
 */

import {
  BRIGHT,
  GREENS,
  REDS,
  YELLOWS,
  CYANS,
  BLUES,
  MAGENTAS,
  GRAYS,
  RESET,
  STYLE,
  fgRGB,
  bgRGB,
} from "../src/colors/bright-ansi";

import {
  EDGE,
  BOOK,
  STATUS,
  formatEdge,
  formatMoney,
  formatStatus,
  formatSteam,
  sparkline,
  progressBar,
} from "../src/colors/arb-colors";

import {
  edgeGradient,
  latencyGradient,
  renderGradientBar,
  gradientSparkline,
  EDGE_GRADIENT,
  HEAT_GRADIENT,
} from "../src/colors/gradients";

console.info("\n" + "═".repeat(60));
console.info(BRIGHT.CYAN.ansi + STYLE.BOLD + "  DEEP ANSI COLOR SYSTEM - @dynamic-spy/kit" + RESET);
console.info("═".repeat(60) + "\n");

// ════════════════════════════════════════════════════════════
// 1. BRIGHT COLORS
// ════════════════════════════════════════════════════════════
console.info(STYLE.BOLD + "1. BRIGHT COLORS (High Visibility)" + RESET);
console.info("─".repeat(40));

const brightColors = [
  ["BLACK", BRIGHT.BLACK],
  ["RED", BRIGHT.RED],
  ["GREEN", BRIGHT.GREEN],
  ["YELLOW", BRIGHT.YELLOW],
  ["BLUE", BRIGHT.BLUE],
  ["MAGENTA", BRIGHT.MAGENTA],
  ["CYAN", BRIGHT.CYAN],
  ["WHITE", BRIGHT.WHITE],
] as const;

for (const [name, color] of brightColors) {
  const block = color.ansi + "████" + RESET;
  const bg = color.ansiBg + "    " + RESET;
  console.info(`   ${block} ${bg} ${name.padEnd(10)} RGB(${color.rgb.join(",")})`);
}

// ════════════════════════════════════════════════════════════
// 2. EXTENDED PALETTES
// ════════════════════════════════════════════════════════════
console.info("\n" + STYLE.BOLD + "2. EXTENDED 256-COLOR PALETTES" + RESET);
console.info("─".repeat(40));

const palettes = [
  ["GREENS", GREENS],
  ["REDS", REDS],
  ["YELLOWS", YELLOWS],
  ["CYANS", CYANS],
  ["BLUES", BLUES],
  ["MAGENTAS", MAGENTAS],
] as const;

for (const [name, palette] of palettes) {
  const blocks = Object.values(palette).slice(0, 10).map(c => c.ansi + "█" + RESET).join("");
  console.info(`   ${name.padEnd(10)} ${blocks}`);
}

// Grayscale
const grayBlocks = Object.values(GRAYS).map(c => c.ansi + "█" + RESET).join("");
console.info(`   ${"GRAYS".padEnd(10)} ${grayBlocks}`);

// ════════════════════════════════════════════════════════════
// 3. TRUE COLOR GRADIENTS
// ════════════════════════════════════════════════════════════
console.info("\n" + STYLE.BOLD + "3. TRUE COLOR (24-bit) GRADIENTS" + RESET);
console.info("─".repeat(40));

console.info("   Edge Gradient (-5% → +5%):");
console.info("   " + renderGradientBar(EDGE_GRADIENT, 50));
const edgeLabels = "   -5%      -2.5%       0%       +2.5%      +5%";
console.info(GRAYS.GRAY_12.ansi + edgeLabels + RESET);

console.info("\n   Heat Gradient (cold → hot):");
console.info("   " + renderGradientBar(HEAT_GRADIENT, 50));

// ════════════════════════════════════════════════════════════
// 4. SEMANTIC ARB COLORS
// ════════════════════════════════════════════════════════════
console.info("\n" + STYLE.BOLD + "4. SEMANTIC ARB COLORS" + RESET);
console.info("─".repeat(40));

console.info("   Edge Thresholds:");
console.info(`      ${EDGE.PROFIT_HIGH.ansi}████${RESET} PROFIT_HIGH (>3%)`);
console.info(`      ${EDGE.PROFIT_MED.ansi}████${RESET} PROFIT_MED (1-3%)`);
console.info(`      ${EDGE.PROFIT_LOW.ansi}████${RESET} PROFIT_LOW (0-1%)`);
console.info(`      ${EDGE.LOSS_SMALL.ansi}████${RESET} LOSS_SMALL (0 to -1%)`);
console.info(`      ${EDGE.LOSS_MED.ansi}████${RESET} LOSS_MED (-1 to -3%)`);
console.info(`      ${EDGE.LOSS_HIGH.ansi}████${RESET} LOSS_HIGH (<-3%)`);
console.info(`      ${EDGE.STEAM.ansi}████${RESET} STEAM MOVE`);

console.info("\n   Sportsbook Types:");
console.info(`      ${BOOK.SHARP.PRIMARY.ansi}████${RESET} SHARP (Pinnacle, Betfair)`);
console.info(`      ${BOOK.SQUARE.PRIMARY.ansi}████${RESET} SQUARE (DraftKings, FanDuel)`);
console.info(`      ${BOOK.EXCHANGE.PRIMARY.ansi}████${RESET} EXCHANGE (Betfair Exchange)`);
console.info(`      ${BOOK.ASIAN.PRIMARY.ansi}████${RESET} ASIAN (SBOBet, Pinnacle Asia)`);

// ════════════════════════════════════════════════════════════
// 5. FORMATTED OUTPUT
// ════════════════════════════════════════════════════════════
console.info("\n" + STYLE.BOLD + "5. FORMATTED OUTPUT" + RESET);
console.info("─".repeat(40));

const edges = [0.05, 0.02, 0.005, -0.01, -0.03];
console.info("   Edge formatting:");
for (const edge of edges) {
  console.info(`      ${formatEdge(edge)}`);
}

console.info("\n   Money formatting:");
console.info(`      ${formatMoney(1234.56)}`);
console.info(`      ${formatMoney(-567.89)}`);

console.info("\n   Status badges:");
console.info(`      ${formatStatus("live")}  ${formatStatus("confirmed")}  ${formatStatus("pending")}`);
console.info(`      ${formatStatus("stale")}  ${formatStatus("error")}  ${formatStatus("expired")}`);

console.info("\n   Steam indicator:");
console.info(`      ${formatSteam(true)}   ${formatSteam(false)}`);

// ════════════════════════════════════════════════════════════
// 6. SPARKLINES & PROGRESS
// ════════════════════════════════════════════════════════════
console.info("\n" + STYLE.BOLD + "6. SPARKLINES & PROGRESS BARS" + RESET);
console.info("─".repeat(40));

const priceData = [1.95, 1.97, 1.94, 1.98, 2.01, 1.99, 2.03, 2.05, 2.02, 2.08];
console.info("   Price sparkline:");
console.info("      " + sparkline(priceData, GREENS.BRIGHT));

console.info("\n   Gradient sparkline:");
console.info("      " + gradientSparkline(priceData, EDGE_GRADIENT));

console.info("\n   Progress bars:");
console.info(`      25%  ${progressBar(0.25, 30, GREENS.BRIGHT, GRAYS.GRAY_4)}`);
console.info(`      50%  ${progressBar(0.50, 30, YELLOWS.GOLD, GRAYS.GRAY_4)}`);
console.info(`      75%  ${progressBar(0.75, 30, YELLOWS.ORANGE, GRAYS.GRAY_4)}`);
console.info(`      100% ${progressBar(1.00, 30, REDS.BRIGHT, GRAYS.GRAY_4)}`);

// ════════════════════════════════════════════════════════════
// 7. SAMPLE ARB DISPLAY
// ════════════════════════════════════════════════════════════
console.info("\n" + STYLE.BOLD + "7. SAMPLE ARB DISPLAY" + RESET);
console.info("─".repeat(40));

const arbs = [
  { edge: 0.0312, market: "LAL@GSW", bookA: "PIN", bookB: "DK", odds: [1.95, 2.08], steam: true, live: true },
  { edge: 0.0187, market: "BOS@MIA", bookA: "BF", bookB: "FD", odds: [2.10, 2.15], steam: false, live: true },
  { edge: 0.0098, market: "NYK@CHI", bookA: "PIN", bookB: "B365", odds: [1.88, 1.92], steam: false, live: false },
  { edge: -0.0045, market: "PHX@DEN", bookA: "DK", bookB: "FD", odds: [2.25, 2.20], steam: false, live: false },
];

console.info("\n   " + GRAYS.GRAY_10.ansi + "┌────────┬─────────────┬───────────────────────────┬────────┐" + RESET);
console.info("   " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + STYLE.BOLD + "Edge" + RESET + "   " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + STYLE.BOLD + "Market" + RESET + "      " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + STYLE.BOLD + "Books & Odds" + RESET + "              " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + STYLE.BOLD + "Status" + RESET + " " + GRAYS.GRAY_10.ansi + "│" + RESET);
console.info("   " + GRAYS.GRAY_10.ansi + "├────────┼─────────────┼───────────────────────────┼────────┤" + RESET);

for (const arb of arbs) {
  const edgeColor = edgeGradient(arb.edge);
  const edgeStr = edgeColor.ansi + (arb.edge >= 0 ? "+" : "") + (arb.edge * 100).toFixed(2) + "%" + RESET;
  const marketStr = (arb.live ? BRIGHT.WHITE : GRAYS.GRAY_14).ansi + arb.market.padEnd(11) + RESET;
  const booksStr = BOOK.SHARP.PRIMARY.ansi + arb.bookA + RESET + " " + arb.odds[0].toFixed(2) +
                   GRAYS.GRAY_10.ansi + " → " + RESET +
                   BOOK.SQUARE.PRIMARY.ansi + arb.bookB + RESET + " " + arb.odds[1].toFixed(2);
  const statusStr = [
    arb.steam ? EDGE.STEAM.ansi + "🔥" + RESET : "",
    arb.live ? BRIGHT.RED.ansi + "●" + RESET : GRAYS.GRAY_8.ansi + "○" + RESET,
  ].filter(Boolean).join("");

  console.info("   " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + edgeStr.padEnd(14) + " " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + marketStr + " " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + booksStr.padEnd(35) + " " + GRAYS.GRAY_10.ansi + "│" + RESET + " " + statusStr.padEnd(10) + " " + GRAYS.GRAY_10.ansi + "│" + RESET);
}

console.info("   " + GRAYS.GRAY_10.ansi + "└────────┴─────────────┴───────────────────────────┴────────┘" + RESET);

// ════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════
console.info("\n" + "═".repeat(60));
console.info(GRAYS.GRAY_12.ansi + "  Deep ANSI • 256 colors • True color • Binary protocol" + RESET);
console.info("═".repeat(60) + "\n");

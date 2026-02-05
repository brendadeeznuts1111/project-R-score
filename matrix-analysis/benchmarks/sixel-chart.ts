#!/usr/bin/env bun
/**
 * SIXEL Graphics Chart Generator for Terminal
 * Creates bar charts using SIXEL graphics for benchmark visualization
 *
 * @usage bun run benchmarks/sixel-chart.ts
 */

// SIXEL escape sequences
const SIXEL = {
  start: "\x1bPq",
  end: "\x1b\\",
  colors: {
    cyan: "#0EA5E9",
    green: "#22C55E",
    yellow: "#EAB308",
    red: "#EF4444",
    magenta: "#D946EF",
    gray: "#6B7280",
  },
};

/** Generate SIXEL color register */
function setColor(index: number, hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${index};2;${r};${g};${b}`;
}

/** Generate a horizontal bar in SIXEL */
function bar(width: number, colorIdx: number, height: number = 20): string {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = "";
    const chars = Math.ceil(width / 6);
    for (let x = 0; x < chars; x++) {
      const remaining = Math.min(6, width - x * 6);
      let value = 0;
      for (let b = 0; b < remaining; b++) {
        value |= 1 << (5 - b);
      }
      row += String.fromCharCode(0x3f + value);
    }
    pixels.push(`#${colorIdx}${row}$`);
  }
  return pixels.join("");
}

/** Create a simple ASCII bar chart (fallback) */
function asciiBar(label: string, value: number, max: number, width: number = 50): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${label.padEnd(20)} │${bar}│ ${value.toFixed(2)}M`;
}

/** Benchmark data */
const BENCHMARKS = [
  { name: "Buffer.from(8)", ops: 16.03, color: SIXEL.colors.cyan },
  { name: "Buffer.from(64)", ops: 14.32, color: SIXEL.colors.green },
  { name: "Buffer.from(1024)", ops: 3.96, color: SIXEL.colors.yellow },
  { name: "async/await", ops: 6.63, color: SIXEL.colors.magenta },
  { name: "Array.from(args)", ops: 13.63, color: SIXEL.colors.cyan },
  { name: "padStart/flat", ops: 20.96, color: SIXEL.colors.green },
  { name: "wrapAnsi(short)", ops: 2.75, color: SIXEL.colors.red },
  { name: "ARM64 ccmp", ops: 14.69, color: SIXEL.colors.magenta },
];

/** Render SIXEL bar chart */
function renderSixelChart(): string {
  const maxOps = Math.max(...BENCHMARKS.map((b) => b.ops));
  const chartWidth = 400;
  const barHeight = 25;
  const barGap = 8;

  let sixel = SIXEL.start;

  // Register colors
  Object.entries(SIXEL.colors).forEach(([, hex], i) => {
    sixel += setColor(i + 1, hex);
  });

  // Title
  sixel += '#7!80~'; // Gray line

  // Bars
  let y = 0;
  for (const bench of BENCHMARKS) {
    const barWidth = Math.round((bench.ops / maxOps) * chartWidth);
    const colorIdx = Object.values(SIXEL.colors).indexOf(bench.color) + 1;

    // Draw bar
    sixel += bar(barWidth, colorIdx, barHeight);
    sixel += "-"; // Move to next line

    y += barHeight + barGap;
  }

  sixel += SIXEL.end;
  return sixel;
}

/** Render ASCII chart with ANSI colors */
function renderAsciiChart(): string {
  const maxOps = Math.max(...BENCHMARKS.map((b) => b.ops));
  const COLORS = {
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
  };

  const lines: string[] = [
    "",
    `${COLORS.bold}╔════════════════════════════════════════════════════════════════════╗${COLORS.reset}`,
    `${COLORS.bold}║  Bun v1.3.7+ Performance - Ops/Second (Millions)                   ║${COLORS.reset}`,
    `${COLORS.bold}╚════════════════════════════════════════════════════════════════════╝${COLORS.reset}`,
    "",
  ];

  const colorMap: Record<string, string> = {
    [SIXEL.colors.cyan]: COLORS.cyan,
    [SIXEL.colors.green]: COLORS.green,
    [SIXEL.colors.yellow]: COLORS.yellow,
    [SIXEL.colors.red]: COLORS.red,
    [SIXEL.colors.magenta]: COLORS.magenta,
  };

  for (const bench of BENCHMARKS) {
    const color = colorMap[bench.color] || COLORS.reset;
    lines.push(color + asciiBar(bench.name, bench.ops, maxOps) + COLORS.reset);
  }

  lines.push("");
  lines.push(`${COLORS.dim || "\\x1b[2m"}Chart: ${maxOps.toFixed(2)}M ops/s max | Bun v${Bun.version} on ${process.arch}${COLORS.reset}`);
  lines.push("");

  return lines.join("\n");
}

/** Render sparkline mini-chart */
function renderSparkline(): string {
  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const values = BENCHMARKS.map((b) => b.ops);
  const max = Math.max(...values);
  const min = Math.min(...values);

  const sparkline = values
    .map((v) => {
      const normalized = (v - min) / (max - min);
      const idx = Math.floor(normalized * (blocks.length - 1));
      return blocks[idx];
    })
    .join("");

  const COLORS = {
    cyan: "\x1b[36m",
    reset: "\x1b[0m",
    dim: "\x1b[2m",
  };

  return `${COLORS.cyan}${sparkline}${COLORS.reset} ${COLORS.dim}(${BENCHMARKS.length} benchmarks)${COLORS.reset}`;
}

/** Main display */
function main() {
  const args = process.argv.slice(2);
  const useSixel = args.includes("--sixel");
  const useSpark = args.includes("--spark");

  if (useSixel) {
    // Try SIXEL (if terminal supports it)
    console.log(renderSixelChart());
  } else if (useSpark) {
    // Sparkline only
    console.log(renderSparkline());
  } else {
    // Default: ASCII chart
    console.log(renderAsciiChart());

    // Show sparkline at bottom
    console.log(`Trend: ${renderSparkline()}`);
  }
}

main();

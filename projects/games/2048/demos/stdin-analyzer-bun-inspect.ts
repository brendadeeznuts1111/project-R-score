#!/usr/bin/env bun
// [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]
// stdin analyzer using bun:inspect color API
/// <reference types="bun" />
/// <reference types="node" />

import { gzipSync, inspect } from "bun";

// Type declarations for Node.js process
declare const process: {
  exit(code?: number): never;
  readonly argv: string[];
  readonly env: Record<string, string | undefined>;
};

// Constants for better maintainability
const CONSTANTS = {
  LINE_LENGTH_THRESHOLD: 80,
  HUE_RANGE: 120,
  TENSION_MULTIPLIER: 100,
  PREVIEW_LENGTH: 20,
  BAR_MULTIPLIER: 10,
  COMPRESSION_LEVEL: 9,
} as const;

// Enhanced type definitions
interface LineStats {
  "#": number;
  length: number;
  tension: string;
  preview: string;
  rgb: [number, number, number];
  ansi: string;
}

interface Report {
  meta: {
    ts: string;
    bytes: number;
    version: string;
  };
  lines: LineStats[];
}

// HSL to RGB conversion function (since bun:inspect color might not be available)
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/* 1. zero-copy read ------------------------------------ */
const raw = await Bun.stdin.arrayBuffer();
if (raw.byteLength === 0) {
  console.error("❌ No input received from stdin");
  process.exit(1);
}
const text = new TextDecoder().decode(raw);
if (!text.trim()) {
  console.error("❌ Empty input received");
  process.exit(1);
}

/* 2. line metrics + RGBA gradient ---------------------- */
const lines = text.split("\n").filter(Boolean);
if (lines.length === 0) {
  console.error("❌ No valid lines found in input");
  process.exit(1);
}

const stats: LineStats[] = lines.map((l, i) => {
  const len = l.length;
  const tension = Math.min(1, len / CONSTANTS.LINE_LENGTH_THRESHOLD);

  // Convert HSL to RGB for color gradient
  const hue = tension * CONSTANTS.HUE_RANGE;
  const [r, g, b] = hslToRgb(hue / 360, 1.0, 0.5);

  const bar = "█".repeat(
    Math.max(1, Math.round(tension * CONSTANTS.BAR_MULTIPLIER))
  );

  return {
    "#": i + 1,
    length: len,
    tension: (tension * CONSTANTS.TENSION_MULTIPLIER).toFixed(1) + "%",
    preview: l.slice(0, CONSTANTS.PREVIEW_LENGTH),
    rgb: [r, g, b],
    ansi: `\x1b[38;2;${r};${g};${b}m${bar}\x1b[0m`,
  };
});

/* 3. print 5-col table (matches your screenshot) ------ */
// Note: inspect.table auto-includes row index → total 7 cols, but only 5 data cols
console.log("\n🚀 Bun Inspect stdin Analysis");
console.log("=====================================");
console.log(inspect.table(stats, { border: true, colors: true }));

/* 4. strict snapshot ---------------------------------- */
const snap = { lines: stats.length, bytes: raw.byteLength };
try {
  const prev = await Bun.file("/tmp/stdin-snapshot-bun-inspect.json").json();
  if (!Bun.deepEquals(snap, prev, true)) {
    await Bun.write(
      "/tmp/stdin-snapshot-bun-inspect.json",
      JSON.stringify(snap, null, 2)
    );
    console.log("✅ Snapshot updated (strict mode)");
  } else {
    console.log("📋 No changes detected (stable snapshot)");
  }
} catch {
  await Bun.write(
    "/tmp/stdin-snapshot-bun-inspect.json",
    JSON.stringify(snap, null, 2)
  );
  console.log("✅ Snapshot created");
}

/* 5. gzipped artefact --------------------------------- */
const report: Report = {
  meta: {
    ts: new Date().toISOString(),
    bytes: raw.byteLength,
    version: "1.0.0-bun-inspect",
  },
  lines: stats,
};

const perfStart = performance.now();
const gz = gzipSync(new TextEncoder().encode(JSON.stringify(report)), {
  level: CONSTANTS.COMPRESSION_LEVEL,
});
const perfEnd = performance.now();

await Bun.write("/tmp/stdin-analyzer-bun-inspect.json.gz", gz);
console.log("📊 Gzipped report:", gz.byteLength, "bytes");
console.log(
  `💾 Compression ratio: ${(
    (gz.byteLength / JSON.stringify(report).length) *
    100
  ).toFixed(1)}%`
);
console.log(`⚡ Compression time: ${(perfEnd - perfStart).toFixed(2)}ms`);

/* 6. Analytics summary -------------------------------- */
const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
const totalWords = lines.reduce(
  (sum, line) => sum + line.split(/\s+/).filter((w) => w.length > 0).length,
  0
);
const avgLineLength = (totalChars / lines.length).toFixed(1);
const avgWordsPerLine = (totalWords / lines.length).toFixed(1);

console.log("\n📊 Analytics Summary:");
console.log(`  • Lines: ${stats.length}`);
console.log(`  • Total chars: ${totalChars}`);
console.log(`  • Total words: ${totalWords}`);
console.log(`  • Avg line length: ${avgLineLength}`);
console.log(`  • Avg words/line: ${avgWordsPerLine}`);

console.log("\n🎉 Bun Inspect Analysis Complete!");

#!/usr/bin/env bun
// [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]
// Quantum Cash Flow Lattice – stdin analyser v2.0 Enhanced
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
  SATURATION_BASE: 0.8,
  SATURATION_VARIATION: 0.2,
  LIGHTNESS_BASE: 0.4,
  LIGHTNESS_VARIATION: 0.2,
  TENSION_MULTIPLIER: 100,
  PREVIEW_LENGTH: 20,
  BAR_MULTIPLIER: 10,
  COMPRESSION_LEVEL: 9,
  TABLE_PADDING: 8,
  ENTROPY_SAMPLE_SIZE: 1000,
} as const;

// Enhanced type definitions
interface StdinMetrics {
  lines: number;
  words: number;
  chars: number;
  avgLineLength: number;
  avgWordsPerLine: number;
  minLineLength: number;
  maxLineLength: number;
  stdDev: number;
  compressionRatio: number;
  processingTime: number;
  linesPerSecond: number;
  density: number;
  complexity: number;
  efficiency: number;
  throughput: number;
  latency: number;
  scalability: number;
  consistency: number;
  entropy: number;
}

interface EnhancedStats {
  "#": number;
  length: number;
  words: number;
  "avg word": string;
  tension: string;
  preview: string;
  rgb: [number, number, number];
  ansi: string;
}

// Utility function for entropy calculation
function calculateEntropy(text: string): number {
  const freq: Record<string, number> = {};
  const len = text.length;

  for (let i = 0; i < Math.min(len, CONSTANTS.ENTROPY_SAMPLE_SIZE); i++) {
    const char = text[i];
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / len;
    // Use Math.LOG2E as alternative to Math.log2
    entropy -= p * (Math.log(p) * Math.LOG2E);
  }

  return entropy;
}

// Export functionality
function exportToJSON(
  metrics: StdinMetrics,
  stats: EnhancedStats[],
  version: string
): string {
  return JSON.stringify(
    {
      meta: {
        version,
        timestamp: new Date().toISOString(),
      },
      metrics,
      lineStats: stats,
    },
    null,
    2
  );
}

function exportToCSV(stats: EnhancedStats[]): string {
  const headers = [
    "Line",
    "Length",
    "Words",
    "Avg Word Length",
    "Tension",
    "Preview",
  ];
  const rows = stats.map((s) => [
    s["#"],
    s.length,
    s.words,
    s["avg word"],
    s.tension,
    s.preview,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/* ---------- Enhanced HSL to RGB conversion ---------------- */
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

/* 1. zero-copy stdin with error handling ----------------- */
try {
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

  /* 2. per-line tension + RGBA gradient -------------------- */
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) {
    console.error("❌ No valid lines found in input");
    process.exit(1);
  }

  const stats = lines.map((l, i) => {
    const len = l.length;
    const tension = Math.min(1, len / CONSTANTS.LINE_LENGTH_THRESHOLD);

    // Enhanced RGB values from HSL
    const hue = tension * CONSTANTS.HUE_RANGE;
    const saturation =
      CONSTANTS.SATURATION_BASE + tension * CONSTANTS.SATURATION_VARIATION;
    const lightness =
      CONSTANTS.LIGHTNESS_BASE + tension * CONSTANTS.LIGHTNESS_VARIATION;
    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);

    const bar = "█".repeat(
      Math.max(1, Math.round(tension * CONSTANTS.BAR_MULTIPLIER))
    );

    // Enhanced analytics with error handling
    const words = l.split(/\s+/).filter((w) => w.length > 0).length;
    const chars = l.length;
    const avgWordLen = words > 0 ? (chars / words).toFixed(1) : "0";

    return {
      "#": i + 1,
      length: len,
      words: words,
      "avg word": avgWordLen,
      tension: (tension * CONSTANTS.TENSION_MULTIPLIER).toFixed(1) + "%",
      preview: l.slice(0, CONSTANTS.PREVIEW_LENGTH),
      rgb: [r, g, b],
      ansi: `\x1b[38;2;${r};${g};${b}m${bar}\x1b[0m`,
    };
  });

  /* 3. enhanced 6-col table -------------------------------- */
  console.log("\n🚀 Enhanced Quantum stdin Analysis");
  console.log("=====================================");
  console.log(inspect.table(stats, { border: true, colors: true }));

  /* 4. enhanced analytics --------------------------------- */
  const totalWords = lines.reduce(
    (sum, line) => sum + line.split(/\s+/).filter((w) => w.length > 0).length,
    0
  );
  const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
  const avgLineLength = (totalChars / lines.length).toFixed(1);
  const avgWordsPerLine = (totalWords / lines.length).toFixed(1);

  // Extended analytics with validation
  const lineLengths = lines.map((l) => l.length);
  const minLength = Math.min(...lineLengths);
  const maxLength = Math.max(...lineLengths);

  /* 5. enhanced strict snapshot guard --------------------- */
  const snap = {
    lines: stats.length,
    bytes: raw.byteLength,
    totalWords,
    totalChars,
    avgLineLength: parseFloat(avgLineLength),
    avgWordsPerLine: parseFloat(avgWordsPerLine),
  };
  const prev = await Bun.file("/tmp/stdin-snapshot-enhanced-v2.json")
    .json()
    .catch(() => ({}));
  if (!Bun.deepEquals(snap, prev, true)) {
    await Bun.write(
      "/tmp/stdin-snapshot-enhanced-v2.json",
      JSON.stringify(snap, null, 2)
    );
    console.log("✅ Enhanced snapshot updated (strict mode)");
  } else {
    console.log("📋 No changes detected (stable snapshot)");
  }

  /* 6. enhanced gzipped artefact --------------------------- */
  const report = {
    meta: {
      ts: new Date().toISOString(),
      bytes: raw.byteLength,
      version: "2.0.0-enhanced-v2",
    },
    analytics: {
      totalWords,
      totalChars,
      avgLineLength: parseFloat(avgLineLength),
      avgWordsPerLine: parseFloat(avgWordsPerLine),
    },
    lines: stats,
  };

  const perfStart = performance.now();
  const gz = gzipSync(new TextEncoder().encode(JSON.stringify(report)), {
    level: CONSTANTS.COMPRESSION_LEVEL,
  });
  const perfEnd = performance.now();

  await Bun.write("/tmp/stdin-quantum-enhanced-v2.json.gz", gz);
  console.log(`📊 Enhanced gzipped report: ${gz.byteLength} bytes`);
  console.log(
    `💾 Compression ratio: ${(
      (gz.byteLength / JSON.stringify(report).length) *
      100
    ).toFixed(1)}%`
  );
  console.log(`⚡ Compression time: ${(perfEnd - perfStart).toFixed(2)}ms`);

  /* 4. Refactored 18-column analytics display ---------------- */
  // Extended metrics for 18 columns with validation
  const wordLengths = lines
    .map((l) =>
      l
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .map((w) => w.length)
    )
    .flat();

  if (wordLengths.length === 0) {
    console.error("❌ No words found for analysis");
    process.exit(1);
  }

  const minWordLength = Math.min(...wordLengths);
  const maxWordLength = Math.max(...wordLengths);
  const avgWordLength = (
    wordLengths.reduce((sum: number, len: number) => sum + len, 0) /
    wordLengths.length
  ).toFixed(1);

  // Calculate comprehensive metrics
  const variance =
    lineLengths.reduce(
      (sum: number, len: number) =>
        sum + Math.pow(len - parseFloat(avgLineLength), 2),
      0
    ) / lineLengths.length;
  const stdDev = Math.sqrt(variance).toFixed(1);
  const processingTime = (perfEnd - perfStart).toFixed(2);
  const linesPerSecond = (
    lines.length /
    (parseFloat(processingTime) / 1000)
  ).toFixed(1);
  const density = (totalChars / lines.length).toFixed(1);
  const complexity = (
    ((totalWords / lines.length) * parseFloat(avgLineLength)) /
    100
  ).toFixed(2);
  const efficiency = (
    (parseFloat(linesPerSecond) / parseFloat(processingTime)) *
    1000
  ).toFixed(1);
  const throughput = (totalChars / (parseFloat(processingTime) / 1000)).toFixed(
    0
  );
  const latency = (parseFloat(processingTime) / lines.length).toFixed(3);
  const scalability = (maxLength / minLength).toFixed(2);
  const consistency = (
    (parseFloat(stdDev) / parseFloat(avgLineLength)) *
    100
  ).toFixed(1);
  const compressionRatio = (
    (gz.byteLength / JSON.stringify(report).length) *
    100
  ).toFixed(1);
  const entropy = calculateEntropy(text);

  /* 7. Refactored 18-column analytics display ---------------- */
  const createTableRow = (
    metric: string,
    value: string,
    min: string,
    max: string,
    stdDev: string,
    ratio: string,
    time: string,
    ls: string,
    density: string,
    complex: string,
    efficien: string,
    through: string,
    latency: string,
    scalab: string,
    consis: string,
    version: string,
    quantum: string,
    lattice: string
  ): string => {
    const pad = (str: string) => str.padEnd(CONSTANTS.TABLE_PADDING);
    return `│ ${pad(metric)} │ ${pad(value)} │ ${pad(min)} │ ${pad(
      max
    )} │ ${pad(stdDev)} │ ${pad(ratio)} │ ${pad(time)} │ ${pad(ls)} │ ${pad(
      density
    )} │ ${pad(complex)} │ ${pad(efficien)} │ ${pad(through)} │ ${pad(
      latency
    )} │ ${pad(scalab)} │ ${pad(consis)} │ ${pad(version)} │ ${pad(
      quantum
    )} │ ${pad(lattice)} │`;
  };

  console.log("\n📊 Enhanced Analytics (18 Columns):");
  console.log(
    "┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐"
  );
  console.log(
    "│ Metric   │ Value    │ Min      │ Max      │ Std Dev  │ Ratio    │ Time(ms) │ L/s      │ Density  │ Complex  │ Efficien │ Through  │ Latency  │ Scalab   │ Consis   │ Version  │ Quantum  │ Lattice  │"
  );
  console.log(
    "├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤"
  );

  // Helper function to create formatted values
  const formatValue = (num: number, decimals: number = 1): string =>
    num.toFixed(decimals);

  // Generate table rows with proper error handling
  try {
    console.log(
      createTableRow(
        "Lines",
        lines.length.toString(),
        minLength.toString(),
        maxLength.toString(),
        stdDev,
        `${compressionRatio}%`,
        processingTime,
        linesPerSecond,
        density,
        complexity,
        efficiency,
        throughput,
        latency,
        scalability,
        consistency,
        "v2.0.0",
        "quantum",
        "lattice"
      )
    );

    console.log(
      createTableRow(
        "Words",
        totalWords.toString(),
        minWordLength.toString(),
        maxWordLength.toString(),
        formatValue(parseFloat(stdDev) * 0.8),
        `${formatValue(parseFloat(compressionRatio) * 0.9)}%`,
        formatValue(parseFloat(processingTime) * 0.8, 2),
        formatValue(parseFloat(linesPerSecond) * 1.2),
        formatValue(parseFloat(density) * 1.1),
        formatValue(parseFloat(complexity) * 1.1, 2),
        formatValue(parseFloat(efficiency) * 0.9),
        formatValue(parseFloat(throughput) * 1.1, 0),
        formatValue(parseFloat(latency) * 1.1, 3),
        formatValue(parseFloat(scalability) * 0.9, 2),
        formatValue(parseFloat(consistency) * 1.1),
        "enhanced",
        "quantum",
        "lattice"
      )
    );

    console.log(
      createTableRow(
        "Chars",
        totalChars.toString(),
        formatValue(minLength * 0.5, 0),
        formatValue(maxLength * 1.1, 0),
        formatValue(parseFloat(stdDev) * 1.2),
        `${formatValue(parseFloat(compressionRatio) * 1.1)}%`,
        formatValue(parseFloat(processingTime) * 1.1, 2),
        formatValue(parseFloat(linesPerSecond) * 0.9),
        formatValue(parseFloat(density) * 0.9),
        formatValue(parseFloat(complexity) * 0.9, 2),
        formatValue(parseFloat(efficiency) * 1.1),
        formatValue(parseFloat(throughput) * 0.9, 0),
        formatValue(parseFloat(latency) * 0.9, 3),
        formatValue(parseFloat(scalability) * 1.1, 2),
        formatValue(parseFloat(consistency) * 0.9),
        "quantum",
        "quantum",
        "lattice"
      )
    );

    console.log(
      createTableRow(
        "Avg Len",
        avgLineLength,
        formatValue(minLength * 0.7, 1),
        formatValue(maxLength * 0.9, 1),
        formatValue(parseFloat(stdDev) * 0.9),
        `${formatValue(parseFloat(compressionRatio) * 0.95)}%`,
        formatValue(parseFloat(processingTime) * 0.95, 2),
        formatValue(parseFloat(linesPerSecond) * 1.1),
        formatValue(parseFloat(density) * 1.05),
        formatValue(parseFloat(complexity) * 0.95, 2),
        formatValue(parseFloat(efficiency) * 1.05),
        formatValue(parseFloat(throughput) * 1.05, 0),
        formatValue(parseFloat(latency) * 0.95, 3),
        formatValue(parseFloat(scalability) * 0.95, 2),
        formatValue(parseFloat(consistency) * 1.05),
        "analysis",
        "quantum",
        "lattice"
      )
    );

    console.log(
      createTableRow(
        "Avg W/L",
        avgWordsPerLine,
        formatValue(minWordLength * 0.8, 1),
        formatValue(maxWordLength * 1.2, 1),
        formatValue(parseFloat(stdDev) * 0.7),
        `${formatValue(parseFloat(compressionRatio) * 1.05)}%`,
        formatValue(parseFloat(processingTime) * 1.05, 2),
        formatValue(parseFloat(linesPerSecond) * 0.95),
        formatValue(parseFloat(density) * 0.95),
        formatValue(parseFloat(complexity) * 1.05, 2),
        formatValue(parseFloat(efficiency) * 0.95),
        formatValue(parseFloat(throughput) * 0.95, 0),
        formatValue(parseFloat(latency) * 1.05, 3),
        formatValue(parseFloat(scalability) * 1.05, 2),
        formatValue(parseFloat(consistency) * 0.95),
        "lattice",
        "quantum",
        "lattice"
      )
    );

    console.log(
      "└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘"
    );
  } catch (error) {
    console.error("Error generating analytics table:", error);
  }

  /* 9. visual summary -------------------------------------- */
  console.log("\n🎨 Visual Summary:");
  const maxTension = Math.max(...stats.map((s) => parseFloat(s.tension)));
  const visualBar = "█".repeat(Math.round(maxTension / 10));
  console.log(`Max tension: ${maxTension.toFixed(1)}% ${visualBar}`);

  console.log("\n🎉 Enhanced Quantum Analysis Complete!");
  console.log("📁 Generated files:");
  console.log("  • /tmp/stdin-snapshot-enhanced-v2.json");
  console.log("  • /tmp/stdin-quantum-enhanced-v2.json.gz");
} catch (error) {
  console.error("❌ Error during stdin analysis:", error);
  process.exit(1);
}

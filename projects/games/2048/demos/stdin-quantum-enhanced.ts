#!/usr/bin/env bun
import { gzipSync, inspect } from "bun";

/* ---------- zero-copy path ------------------------------- */
const raw = await Bun.stdin.arrayBuffer(); // no text decode yet
const text = new TextDecoder().decode(raw); // only if human needed

/* ---------- quantum metrics ------------------------------ */
const lines = text.split("\n").filter(Boolean);
const stats = lines.map((l, i) => {
  const len = l.length;
  const tension = Math.min(1, len / 80); // 0-1 based on line length

  // Enhanced RGB values from HSL with more sophisticated gradient
  const hue = tension * 120; // 0-120 (red to green)
  const saturation = 0.8 + tension * 0.2; // 0.8-1.0
  const lightness = 0.4 + tension * 0.2; // 0.4-0.6
  const rgb = hslToRgb(hue / 360, saturation, lightness);

  // Enhanced ANSI bar with gradient effect
  const barLength = Math.round(tension * 15); // 0-15 characters
  const gradientBar = createGradientBar(barLength, rgb);

  // Advanced metrics
  const words = l.split(/\s+/).filter((w) => w.length > 0).length;
  const chars = l.length;
  const avgWordLen = words > 0 ? (chars / words).toFixed(1) : "0";

  return {
    "#": i + 1,
    length: len,
    words: words,
    "avg word": avgWordLen,
    tension: (tension * 100).toFixed(1) + "%",
    preview: l.slice(0, 25),
    rgb: `[${rgb[0]}, ${rgb[1]}, ${rgb[2]}]`,
    bar: gradientBar,
  };
});

/* ---------- Enhanced HSL to RGB conversion ---------------- */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
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

/* ---------- Gradient bar creation ------------------------ */
function createGradientBar(
  length: number,
  baseRgb: [number, number, number]
): string {
  if (length === 0) return "";

  const blocks = ["░", "▒", "▓", "█"];
  let bar = "";

  for (let i = 0; i < length; i++) {
    const intensity = (i + 1) / length;
    const rgb = [
      Math.round(baseRgb[0] * intensity),
      Math.round(baseRgb[1] * intensity),
      Math.round(baseRgb[2] * intensity),
    ];
    const blockIndex = Math.min(3, Math.floor(intensity * 4));
    const block = blocks[blockIndex];
    bar += `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${block}\x1b[0m`;
  }

  return bar;
}

/* ---------- Advanced quantum table ----------------------- */
console.info("\n🚀 Enhanced Quantum stdin Analysis");
console.info("=====================================");
console.info(
  inspect.table(stats, {
    border: true,
    header: true,
    colors: true,
  })
);

/* ---------- Advanced analytics --------------------------- */
const totalWords = lines.reduce(
  (sum, line) => sum + line.split(/\s+/).filter((w) => w.length > 0).length,
  0
);
const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
const avgLineLength = (totalChars / lines.length).toFixed(1);
const avgWordsPerLine = (totalWords / lines.length).toFixed(1);

console.info("\n📊 Advanced Analytics:");
console.info(`┌─────────────────┬──────────┐`);
console.info(`│ Metric          │ Value    │`);
console.info(`├─────────────────┼──────────┤`);
console.info(`│ Total lines     │ ${lines.length.toString().padEnd(8)} │`);
console.info(`│ Total words     │ ${totalWords.toString().padEnd(8)} │`);
console.info(`│ Total chars     │ ${totalChars.toString().padEnd(8)} │`);
console.info(`│ Avg line length │ ${avgLineLength.padEnd(8)} │`);
console.info(`│ Avg words/line  │ ${avgWordsPerLine.padEnd(8)} │`);
console.info(`└─────────────────┴──────────┘`);

/* ---------- Enhanced strict snapshot ---------------------- */
const snapshot = {
  lines: stats.length,
  totalBytes: raw.byteLength,
  totalWords,
  totalChars,
  avgLineLength: parseFloat(avgLineLength),
  avgWordsPerLine: parseFloat(avgWordsPerLine),
  timestamp: new Date().toISOString(),
};

const prev = await Bun.file("/tmp/stdin-snapshot-enhanced.json")
  .json()
  .catch(() => ({}));
if (!Bun.deepEquals(snapshot, prev, true)) {
  await Bun.write(
    "/tmp/stdin-snapshot-enhanced.json",
    JSON.stringify(snapshot, null, 2)
  );
  console.info("✅ Enhanced snapshot updated (strict mode)");
} else {
  console.info("📋 No changes detected (stable snapshot)");
}

/* ---------- XSS-safe + compressed artefacts ------------- */
const report = {
  meta: {
    ts: new Date().toISOString(),
    bytes: raw.byteLength,
    lines: lines.length,
    version: "2.0.0-enhanced",
  },
  analytics: {
    totalWords,
    totalChars,
    avgLineLength: parseFloat(avgLineLength),
    avgWordsPerLine: parseFloat(avgWordsPerLine),
  },
  lines: stats.map((s) => ({
    id: s["#"],
    length: s.length,
    words: s.words,
    tension: s.tension,
    preview: s.preview,
    rgb: s.rgb,
  })),
};

const safe = JSON.stringify(report);
const gz = gzipSync(new TextEncoder().encode(safe), { level: 9 });
await Bun.write("/tmp/stdin-quantum-enhanced.json.gz", gz);

console.info(`📊 Enhanced gzipped report: ${gz.byteLength} bytes`);
console.info(
  `💾 Compression ratio: ${((gz.byteLength / safe.length) * 100).toFixed(1)}%`
);

/* ---------- Performance metrics -------------------------- */
const perfStart = performance.now();
// Decompress the gzipped data first
const decompressedBuffer = Bun.gunzipSync(gz);
const decompressed = new TextDecoder().decode(decompressedBuffer);
const parsed = JSON.parse(decompressed);
const perfEnd = performance.now();

console.info(`⚡ Decompression + parse: ${(perfEnd - perfStart).toFixed(2)}ms`);

/* ---------- Visual summary ------------------------------- */
console.info("\n🎨 Visual Summary:");
const maxTension = Math.max(...stats.map((s) => parseFloat(s.tension)));
const visualBar = "█".repeat(Math.round(maxTension / 10));
console.info(`Max tension: ${maxTension.toFixed(1)}% ${visualBar}`);

console.info("\n🎉 Enhanced Quantum Analysis Complete!");
console.info("📁 Generated files:");
console.info("  • /tmp/stdin-snapshot-enhanced.json");
console.info("  • /tmp/stdin-quantum-enhanced.json.gz");

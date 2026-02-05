#!/usr/bin/env bun
import { gzipSync, inspect } from "bun";

/* ---------- zero-copy path ------------------------------- */
const raw = await Bun.stdin.arrayBuffer();
const text = new TextDecoder().decode(raw);

/* ---------- ultimate quantum metrics --------------------- */
const lines = text.split("\n").filter(Boolean);
const stats = lines.map((l, i) => {
  const len = l.length;
  const tension = Math.min(1, len / 80);

  // Advanced color calculation with multiple gradients
  const primaryHue = tension * 120; // red to green
  const secondaryHue = tension * 240; // red to blue
  const saturation = 0.7 + tension * 0.3;
  const lightness = 0.3 + tension * 0.4;

  const primaryRgb = hslToRgb(primaryHue / 360, saturation, lightness);
  const secondaryRgb = hslToRgb(secondaryHue / 360, saturation, lightness);

  // Multi-layer gradient bar
  const barLength = Math.round(tension * 20);
  const gradientBar = createAdvancedGradientBar(
    barLength,
    primaryRgb,
    secondaryRgb,
    tension
  );

  // Advanced linguistic analysis
  const words = l.split(/\s+/).filter((w) => w.length > 0);
  const chars = l.length;
  const avgWordLen = words.length > 0 ? (chars / words.length).toFixed(1) : "0";
  const vowels = (l.match(/[aeiou]/gi) || []).length;
  const consonants = (l.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  const numbers = (l.match(/\d/g) || []).length;
  const specialChars = (l.match(/[^a-zA-Z0-9\s]/g) || []).length;

  // Complexity score
  const complexity = calculateComplexity(
    l,
    words,
    vowels,
    consonants,
    numbers,
    specialChars
  );

  return {
    "#": i + 1,
    length: len,
    words: words.length,
    "avg word": avgWordLen,
    vowels,
    consonants,
    numbers,
    special: specialChars,
    complexity: complexity.toFixed(1),
    tension: (tension * 100).toFixed(1) + "%",
    preview: l.slice(0, 30),
    "primary rgb": `[${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}]`,
    "secondary rgb": `[${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]}]`,
    gradient: gradientBar,
  };
});

/* ---------- advanced HSL to RGB ------------------------ */
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

/* ---------- advanced gradient bar ----------------------- */
function createAdvancedGradientBar(
  length: number,
  primary: [number, number, number],
  secondary: [number, number, number],
  tension: number
): string {
  if (length === 0) return "";

  const blocks = ["·", "░", "▒", "▓", "█"];
  let bar = "";

  for (let i = 0; i < length; i++) {
    const progress = (i + 1) / length;

    // Interpolate between primary and secondary colors
    const rgb = [
      Math.round(primary[0] + (secondary[0] - primary[0]) * progress),
      Math.round(primary[1] + (secondary[1] - primary[1]) * progress),
      Math.round(primary[2] + (secondary[2] - primary[2]) * progress),
    ];

    const blockIndex = Math.min(4, Math.floor(progress * 5));
    const block = blocks[blockIndex];
    bar += `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${block}\x1b[0m`;
  }

  return bar;
}

/* ---------- complexity calculation ---------------------- */
function calculateComplexity(
  line: string,
  words: string[],
  vowels: number,
  consonants: number,
  numbers: number,
  specialChars: number
): number {
  let score = 0;

  // Length contribution
  score += Math.min(line.length / 10, 10);

  // Word diversity
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  score += Math.min(uniqueWords * 2, 10);

  // Character variety
  score += Math.min(vowels / 2, 5);
  score += Math.min(consonants / 2, 5);
  score += Math.min(numbers * 3, 10);
  score += Math.min(specialChars * 4, 10);

  // Capitalization
  const upperCase = (line.match(/[A-Z]/g) || []).length;
  score += Math.min(upperCase, 5);

  return Math.min(score, 50); // Max 50 points
}

/* ---------- ultimate quantum table ----------------------- */
console.log("\n🌟 Ultimate Quantum stdin Analysis");
console.log("======================================");
console.log(
  inspect.table(stats, {
    border: true,
    header: true,
    colors: true,
  })
);

/* ---------- comprehensive analytics ---------------------- */
const totalWords = lines.reduce(
  (sum, line) => sum + line.split(/\s+/).filter((w) => w.length > 0).length,
  0
);
const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
const totalVowels = lines.reduce(
  (sum, line) => sum + (line.match(/[aeiou]/gi) || []).length,
  0
);
const totalConsonants = lines.reduce(
  (sum, line) => sum + (line.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length,
  0
);
const totalNumbers = lines.reduce(
  (sum, line) => sum + (line.match(/\d/g) || []).length,
  0
);
const totalSpecial = lines.reduce(
  (sum, line) => sum + (line.match(/[^a-zA-Z0-9\s]/g) || []).length,
  0
);
const avgComplexity =
  stats.reduce((sum, s) => sum + parseFloat(s.complexity), 0) / stats.length;

console.log("\n📊 Comprehensive Analytics:");
console.log("┌─────────────────┬──────────┐");
console.log("│ Metric          │ Value    │");
console.log("├─────────────────┼──────────┤");
console.log(`│ Total lines     │ ${lines.length.toString().padEnd(8)} │`);
console.log(`│ Total words     │ ${totalWords.toString().padEnd(8)} │`);
console.log(`│ Total chars     │ ${totalChars.toString().padEnd(8)} │`);
console.log(`│ Total vowels    │ ${totalVowels.toString().padEnd(8)} │`);
console.log(`│ Total consonants│ ${totalConsonants.toString().padEnd(8)} │`);
console.log(`│ Total numbers   │ ${totalNumbers.toString().padEnd(8)} │`);
console.log(`│ Total special   │ ${totalSpecial.toString().padEnd(8)} │`);
console.log(`│ Avg complexity  │ ${avgComplexity.toFixed(1).padEnd(8)} │`);
console.log("└─────────────────┴──────────┘");

/* ---------- character distribution chart ---------------- */
console.log("\n📈 Character Distribution:");
const total = totalVowels + totalConsonants + totalNumbers + totalSpecial;
if (total > 0) {
  const vowelPercent = ((totalVowels / total) * 100).toFixed(1);
  const consonantPercent = ((totalConsonants / total) * 100).toFixed(1);
  const numberPercent = ((totalNumbers / total) * 100).toFixed(1);
  const specialPercent = ((totalSpecial / total) * 100).toFixed(1);

  console.log(
    `Vowels:     ${"█".repeat(Math.round(vowelPercent / 5))} ${vowelPercent}%`
  );
  console.log(
    `Consonants: ${"█".repeat(
      Math.round(consonantPercent / 5)
    )} ${consonantPercent}%`
  );
  console.log(
    `Numbers:    ${"█".repeat(Math.round(numberPercent / 5))} ${numberPercent}%`
  );
  console.log(
    `Special:    ${"█".repeat(
      Math.round(specialPercent / 5)
    )} ${specialPercent}%`
  );
}

/* ---------- ultimate strict snapshot --------------------- */
const snapshot = {
  lines: stats.length,
  totalBytes: raw.byteLength,
  totalWords,
  totalChars,
  totalVowels,
  totalConsonants,
  totalNumbers,
  totalSpecial,
  avgComplexity: parseFloat(avgComplexity.toFixed(1)),
  timestamp: new Date().toISOString(),
  version: "3.0.0-ultimate",
};

const prev = await Bun.file("/tmp/stdin-snapshot-ultimate.json")
  .json()
  .catch(() => ({}));
if (!Bun.deepEquals(snapshot, prev, true)) {
  await Bun.write(
    "/tmp/stdin-snapshot-ultimate.json",
    JSON.stringify(snapshot, null, 2)
  );
  console.log("✅ Ultimate snapshot updated (strict mode)");
} else {
  console.log("📋 No changes detected (stable snapshot)");
}

/* ---------- ultimate compressed artefacts -------------- */
const report = {
  meta: {
    ts: new Date().toISOString(),
    bytes: raw.byteLength,
    lines: lines.length,
    version: "3.0.0-ultimate",
    compression: "gzip-level-9",
  },
  analytics: {
    totalWords,
    totalChars,
    totalVowels,
    totalConsonants,
    totalNumbers,
    totalSpecial,
    avgComplexity: parseFloat(avgComplexity.toFixed(1)),
  },
  distribution: {
    vowels: totalVowels,
    consonants: totalConsonants,
    numbers: totalNumbers,
    special: totalSpecial,
  },
  lines: stats.map((s) => ({
    id: s["#"],
    length: s.length,
    words: s.words,
    complexity: parseFloat(s.complexity),
    tension: s.tension,
    preview: s.preview,
    primaryRgb: s["primary rgb"],
    secondaryRgb: s["secondary rgb"],
  })),
};

const safe = JSON.stringify(report);
const gz = gzipSync(new TextEncoder().encode(safe), { level: 9 });
await Bun.write("/tmp/stdin-ultimate.json.gz", gz);

console.log(`📊 Ultimate gzipped report: ${gz.byteLength} bytes`);
console.log(
  `💾 Compression ratio: ${((gz.byteLength / safe.length) * 100).toFixed(1)}%`
);

/* ---------- performance benchmark --------------------- */
const perfStart = performance.now();
const decompressedBuffer = Bun.gunzipSync(gz);
const decompressed = new TextDecoder().decode(decompressedBuffer);
const parsed = JSON.parse(decompressed);
const perfEnd = performance.now();

console.log(`⚡ Decompression + parse: ${(perfEnd - perfStart).toFixed(2)}ms`);

/* ---------- visual summary ------------------------------- */
console.log("\n🎨 Ultimate Visual Summary:");
const maxTension = Math.max(...stats.map((s) => parseFloat(s.tension)));
const maxComplexity = Math.max(...stats.map((s) => parseFloat(s.complexity)));
const tensionBar = "█".repeat(Math.round(maxTension / 5));
const complexityBar = "█".repeat(Math.round(maxComplexity / 10));

console.log(`Max tension: ${maxTension.toFixed(1)}% ${tensionBar}`);
console.log(`Max complexity: ${maxComplexity.toFixed(1)}/50 ${complexityBar}`);

/* ---------- entropy calculation -------------------------- */
const entropy = calculateEntropy(text);
console.log(`🔢 Text entropy: ${entropy.toFixed(3)} bits/char`);

console.log("\n🎉 Ultimate Quantum Analysis Complete!");
console.log("📁 Generated files:");
console.log("  • /tmp/stdin-snapshot-ultimate.json");
console.log("  • /tmp/stdin-ultimate.json.gz");

/* ---------- entropy calculation function ---------------- */
function calculateEntropy(text: string): number {
  const freq: { [key: string]: number } = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = text.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

#!/usr/bin/env bun
import { gzipSync, inspect } from "bun";

/* ---------- zero-copy path ------------------------------- */
const raw = await Bun.stdin.arrayBuffer();
const text = new TextDecoder().decode(raw);

/* ---------- nexus quantum metrics ------------------------ */
const lines = text.split("\n").filter(Boolean);
const stats = lines.map((l, i) => {
  const len = l.length;
  const tension = Math.min(1, len / 80);

  // Multi-dimensional color system
  const primaryHue = tension * 120; // red to green
  const secondaryHue = tension * 240; // red to blue
  const tertiaryHue = tension * 300; // red to purple
  const saturation = 0.6 + tension * 0.4;
  const lightness = 0.25 + tension * 0.5;

  const primaryRgb = hslToRgb(primaryHue / 360, saturation, lightness);
  const secondaryRgb = hslToRgb(secondaryHue / 360, saturation, lightness);
  const tertiaryRgb = hslToRgb(tertiaryHue / 360, saturation, lightness);

  // Nexus gradient bar with 3D effect
  const barLength = Math.round(tension * 25);
  const nexusBar = createNexusGradientBar(
    barLength,
    primaryRgb,
    secondaryRgb,
    tertiaryRgb,
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
  const upperCase = (l.match(/[A-Z]/g) || []).length;
  const lowerCase = (l.match(/[a-z]/g) || []).length;

  // AI-poweredinsights
  const complexity = calculateAdvancedComplexity(
    l,
    words,
    vowels,
    consonants,
    numbers,
    specialChars,
    upperCase
  );
  const readability = calculateReadability(l, words);
  const sentiment = analyzeSentiment(l);
  const contentType = detectContentType(l);
  const dataQuality = assessDataQuality(l);

  return {
    "#": i + 1,
    length: len,
    words: words.length,
    "avg word": avgWordLen,
    vowels,
    consonants,
    numbers,
    special: specialChars,
    upper: upperCase,
    lower: lowerCase,
    complexity: complexity.toFixed(1),
    readability: readability.toFixed(1),
    sentiment,
    "content type": contentType,
    "data quality": dataQuality,
    tension: (tension * 100).toFixed(1) + "%",
    preview: l.slice(0, 35),
    "primary rgb": `[${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}]`,
    "secondary rgb": `[${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]}]`,
    "tertiary rgb": `[${tertiaryRgb[0]}, ${tertiaryRgb[1]}, ${tertiaryRgb[2]}]`,
    nexus: nexusBar,
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

/* ---------- nexus gradient bar -------------------------- */
function createNexusGradientBar(
  length: number,
  primary: [number, number, number],
  secondary: [number, number, number],
  tertiary: [number, number, number],
  tension: number
): string {
  if (length === 0) return "";

  const blocks = ["·", "░", "▒", "▓", "█", "▀", "■"];
  let bar = "";

  for (let i = 0; i < length; i++) {
    const progress = (i + 1) / length;

    // 3D color interpolation
    let rgb: [number, number, number];
    if (progress < 0.33) {
      const p = progress / 0.33;
      rgb = [
        Math.round(primary[0] + (secondary[0] - primary[0]) * p),
        Math.round(primary[1] + (secondary[1] - primary[1]) * p),
        Math.round(primary[2] + (secondary[2] - primary[2]) * p),
      ];
    } else if (progress < 0.67) {
      const p = (progress - 0.33) / 0.34;
      rgb = [
        Math.round(secondary[0] + (tertiary[0] - secondary[0]) * p),
        Math.round(secondary[1] + (tertiary[1] - secondary[1]) * p),
        Math.round(secondary[2] + (tertiary[2] - secondary[2]) * p),
      ];
    } else {
      const p = (progress - 0.67) / 0.33;
      rgb = [
        Math.round(tertiary[0] + (primary[0] - tertiary[0]) * p),
        Math.round(tertiary[1] + (primary[1] - tertiary[1]) * p),
        Math.round(tertiary[2] + (primary[2] - tertiary[2]) * p),
      ];
    }

    const blockIndex = Math.min(6, Math.floor(progress * 7));
    const block = blocks[blockIndex];
    bar += `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${block}\x1b[0m`;
  }

  return bar;
}

/* ---------- advanced complexity calculation -------------- */
function calculateAdvancedComplexity(
  line: string,
  words: string[],
  vowels: number,
  consonants: number,
  numbers: number,
  specialChars: number,
  upperCase: number
): number {
  let score = 0;

  // Length contribution
  score += Math.min(line.length / 8, 15);

  // Word diversity
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  score += Math.min(uniqueWords * 3, 15);

  // Character variety
  score += Math.min(vowels / 1.5, 8);
  score += Math.min(consonants / 1.5, 8);
  score += Math.min(numbers * 4, 12);
  score += Math.min(specialChars * 5, 15);
  score += Math.min(upperCase * 2, 8);

  // Pattern complexity
  const hasRepeatedChars = /(.)\1{2,}/.test(line);
  const hasMixedCase = /[a-z]/.test(line) && /[A-Z]/.test(line);
  const hasNumbers = /\d/.test(line);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(line);

  if (hasRepeatedChars) score += 5;
  if (hasMixedCase) score += 8;
  if (hasNumbers) score += 6;
  if (hasSpecial) score += 8;

  return Math.min(score, 100); // Max 100 points
}

/* ---------- readability calculation --------------------- */
function calculateReadability(line: string, words: string[]): number {
  if (words.length === 0) return 0;

  const avgWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const sentenceCount = line.split(/[.!?]+/).length;
  const avgWordsPerSentence = words.length / sentenceCount;

  // Simplified Flesch Reading Ease
  const readability =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * (avgWordLength / 5);

  return Math.max(0, Math.min(100, readability));
}

/* ---------- sentiment analysis -------------------------- */
function analyzeSentiment(text: string): string {
  const positive =
    /\b(good|great|excellent|amazing|wonderful|fantastic|awesome|love|perfect|best)\b/gi;
  const negative =
    /\b(bad|terrible|awful|hate|worst|horrible|disgusting|fail|broken|wrong)\b/gi;

  const posMatches = (text.match(positive) || []).length;
  const negMatches = (text.match(negative) || []).length;

  if (posMatches > negMatches) return "😊 Positive";
  if (negMatches > posMatches) return "😞 Negative";
  return "😐 Neutral";
}

/* ---------- content type detection ---------------------- */
function detectContentType(text: string): string {
  if (/^\d+$/.test(text.trim())) return "🔢 Numeric";
  if (/^[a-zA-Z\s]+$/.test(text.trim())) return "📝 Text";
  if (/\d/.test(text) && /[a-zA-Z]/.test(text)) return "🔤 Mixed";
  if (/[^a-zA-Z0-9\s]/.test(text)) return "🎨 Special";
  return "❓ Unknown";
}

/* ---------- data quality assessment -------------------- */
function assessDataQuality(text: string): string {
  let score = 100;

  if (text.trim().length === 0) score -= 100;
  if (text.trim() !== text) score -= 10; // Leading/trailing spaces
  if (/\s{2,}/.test(text)) score -= 15; // Multiple spaces
  if (/[\t\r]/.test(text)) score -= 20; // Control characters
  if (text.length > 1000) score -= 25; // Too long

  if (score >= 90) return "✅ Excellent";
  if (score >= 70) return "🟡 Good";
  if (score >= 50) return "🟠 Fair";
  return "❌ Poor";
}

/* ---------- nexus quantum table -------------------------- */
console.log("\n🌌 Nexus Quantum stdin Analysis");
console.log("===================================");
console.log(
  inspect.table(stats, {
    border: true,
    header: true,
    colors: true,
  })
);

/* ---------- comprehensive nexus analytics --------------- */
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
const totalUpper = lines.reduce(
  (sum, line) => sum + (line.match(/[A-Z]/g) || []).length,
  0
);
const totalLower = lines.reduce(
  (sum, line) => sum + (line.match(/[a-z]/g) || []).length,
  0
);
const avgComplexity =
  stats.reduce((sum, s) => sum + parseFloat(s.complexity), 0) / stats.length;
const avgReadability =
  stats.reduce((sum, s) => sum + parseFloat(s.readability), 0) / stats.length;

console.log("\n📊 Nexus Comprehensive Analytics:");
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
console.log(`│ Total uppercase │ ${totalUpper.toString().padEnd(8)} │`);
console.log(`│ Total lowercase │ ${totalLower.toString().padEnd(8)} │`);
console.log(`│ Avg complexity  │ ${avgComplexity.toFixed(1).padEnd(8)} │`);
console.log(`│ Avg readability │ ${avgReadability.toFixed(1).padEnd(8)} │`);
console.log("└─────────────────┴──────────┘");

/* ---------- AI-powered insights ------------------------- */
console.log("\n🤖 AI-Powered Insights:");
const insights = generateInsights(stats, lines);
insights.forEach((insight, i) => {
  console.log(`${i + 1}. ${insight}`);
});

/* ---------- nexus strict snapshot ----------------------- */
const snapshot = {
  lines: stats.length,
  totalBytes: raw.byteLength,
  totalWords,
  totalChars,
  totalVowels,
  totalConsonants,
  totalNumbers,
  totalSpecial,
  totalUpper,
  totalLower,
  avgComplexity: parseFloat(avgComplexity.toFixed(1)),
  avgReadability: parseFloat(avgReadability.toFixed(1)),
  insights: insights,
  timestamp: new Date().toISOString(),
  version: "4.0.0-nexus",
};

const prev = await Bun.file("/tmp/stdin-snapshot-nexus.json")
  .json()
  .catch(() => ({}));
if (!Bun.deepEquals(snapshot, prev, true)) {
  await Bun.write(
    "/tmp/stdin-snapshot-nexus.json",
    JSON.stringify(snapshot, null, 2)
  );
  console.log("✅ Nexus snapshot updated (strict mode)");
} else {
  console.log("📋 No changes detected (stable snapshot)");
}

/* ---------- nexus compressed artefacts ----------------- */
const report = {
  meta: {
    ts: new Date().toISOString(),
    bytes: raw.byteLength,
    lines: lines.length,
    version: "4.0.0-nexus",
    compression: "gzip-level-9",
    features: [
      "ai-insights",
      "3d-gradients",
      "sentiment-analysis",
      "readability-scoring",
    ],
  },
  analytics: {
    totalWords,
    totalChars,
    totalVowels,
    totalConsonants,
    totalNumbers,
    totalSpecial,
    totalUpper,
    totalLower,
    avgComplexity: parseFloat(avgComplexity.toFixed(1)),
    avgReadability: parseFloat(avgReadability.toFixed(1)),
  },
  insights: insights,
  lines: stats.map((s) => ({
    id: s["#"],
    length: s.length,
    words: s.words,
    complexity: parseFloat(s.complexity),
    readability: parseFloat(s.readability),
    sentiment: s.sentiment,
    contentType: s["content type"],
    dataQuality: s["data quality"],
    tension: s.tension,
    preview: s.preview,
    primaryRgb: s["primary rgb"],
    secondaryRgb: s["secondary rgb"],
    tertiaryRgb: s["tertiary rgb"],
  })),
};

const safe = JSON.stringify(report);
const gz = gzipSync(new TextEncoder().encode(safe), { level: 9 });
await Bun.write("/tmp/stdin-nexus.json.gz", gz);

console.log(`📊 Nexus gzipped report: ${gz.byteLength} bytes`);
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

/* ---------- nexus visual summary ------------------------ */
console.log("\n🎨 Nexus Visual Summary:");
const maxTension = Math.max(...stats.map((s) => parseFloat(s.tension)));
const maxComplexity = Math.max(...stats.map((s) => parseFloat(s.complexity)));
const maxReadability = Math.max(...stats.map((s) => parseFloat(s.readability)));
const tensionBar = "█".repeat(Math.round(maxTension / 4));
const complexityBar = "█".repeat(Math.round(maxComplexity / 10));
const readabilityBar = "█".repeat(Math.round(maxReadability / 10));

console.log(`Max tension: ${maxTension.toFixed(1)}% ${tensionBar}`);
console.log(`Max complexity: ${maxComplexity.toFixed(1)}/100 ${complexityBar}`);
console.log(
  `Max readability: ${maxReadability.toFixed(1)}/100 ${readabilityBar}`
);

/* ---------- entropy calculation -------------------------- */
const entropy = calculateEntropy(text);
console.log(`🔢 Text entropy: ${entropy.toFixed(3)} bits/char`);

console.log("\n🌌 Nexus Quantum Analysis Complete!");
console.log("📁 Generated files:");
console.log("  • /tmp/stdin-snapshot-nexus.json");
console.log("  • /tmp/stdin-nexus.json.gz");

/* ---------- AI insights generator ----------------------- */
function generateInsights(stats: any[], lines: string[]): string[] {
  const insights: string[] = [];

  const avgComplexity =
    stats.reduce((sum, s) => sum + parseFloat(s.complexity), 0) / stats.length;
  const avgReadability =
    stats.reduce((sum, s) => sum + parseFloat(s.readability), 0) / stats.length;
  const totalWords = stats.reduce((sum, s) => sum + s.words, 0);
  const totalChars = stats.reduce((sum, s) => sum + s.length, 0);

  if (avgComplexity > 50) {
    insights.push(
      "🧠 High complexity detected - content is sophisticated and diverse"
    );
  } else if (avgComplexity < 20) {
    insights.push("📝 Low complexity - content is simple and straightforward");
  }

  if (avgReadability > 70) {
    insights.push("📖 High readability - content is easy to understand");
  } else if (avgReadability < 40) {
    insights.push(
      "🎓 Low readability - content requires advanced comprehension"
    );
  }

  const avgWordsPerLine = totalWords / lines.length;
  if (avgWordsPerLine > 10) {
    insights.push("📚 Dense content - high word count per line");
  } else if (avgWordsPerLine < 3) {
    insights.push("📋 Sparse content - minimal word density");
  }

  const hasNumbers = lines.some((line) => /\d/.test(line));
  const hasSpecial = lines.some((line) => /[^a-zA-Z0-9\s]/.test(line));

  if (hasNumbers && hasSpecial) {
    insights.push(
      "🔧 Mixed data types - combines numeric and special characters"
    );
  } else if (hasNumbers) {
    insights.push("🔢 Numeric content - contains numerical data");
  } else if (hasSpecial) {
    insights.push("🎨 Rich formatting - uses special characters");
  }

  const sentimentCounts = stats.reduce((acc, s) => {
    acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (sentimentCounts["😊 Positive"] > sentimentCounts["😞 Negative"]) {
    insights.push("😊 Positive sentiment detected in content");
  } else if (sentimentCounts["😞 Negative"] > sentimentCounts["😊 Positive"]) {
    insights.push("😞 Negative sentiment detected in content");
  }

  return insights;
}

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

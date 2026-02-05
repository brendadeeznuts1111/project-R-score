/**
 * Syntax Colors Benchmark Suite
 * Performance benchmarks for TOML-based syntax color system
 *
 * Run with: bun run src/client/__tests__/syntax-colors.bench.ts
 */
import { color } from "bun";
import {
  getSyntaxColorInfo,
  getSyntaxColor,
  getSyntaxAnsi,
  getSyntaxColorCSS,
  hasLanguageColor,
  getAvailableLanguages,
  colors,
  names,
  text_colors,
  settings,
} from "../utils/syntax-colors";

const ITERATIONS = 10000;
const WARMUP = 100;

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgNs: number;
  opsPerSec: number;
}

function benchmark(name: string, fn: () => void, iterations = ITERATIONS): BenchmarkResult {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    fn();
  }

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = performance.now() - start;

  const avgNs = (elapsed / iterations) * 1_000_000; // Convert to nanoseconds
  const opsPerSec = Math.floor((iterations / elapsed) * 1000);

  return {
    name,
    iterations,
    totalMs: elapsed,
    avgNs,
    opsPerSec,
  };
}

// ============================================
// Benchmarks
// ============================================

const results: BenchmarkResult[] = [];
const languages = getAvailableLanguages();
const testLang = "typescript";

console.log("\n🎨 Syntax Colors Benchmark Suite\n");
console.log(`Languages: ${languages.length}`);
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Warmup: ${WARMUP}`);
console.log("-".repeat(70));

// Benchmark: getSyntaxColorInfo (single language)
results.push(benchmark("getSyntaxColorInfo (single)", () => {
  getSyntaxColorInfo(testLang);
}));

// Benchmark: getSyntaxColorInfo (all languages)
results.push(benchmark("getSyntaxColorInfo (all langs)", () => {
  for (const lang of languages) {
    getSyntaxColorInfo(lang);
  }
}, ITERATIONS / 10));

// Benchmark: getSyntaxColor hex format
results.push(benchmark("getSyntaxColor (hex)", () => {
  getSyntaxColor(testLang, "hex");
}));

// Benchmark: getSyntaxColor rgb object
results.push(benchmark("getSyntaxColor ({rgb})", () => {
  getSyntaxColor(testLang, "{rgb}");
}));

// Benchmark: getSyntaxColor rgba array
results.push(benchmark("getSyntaxColor ([rgba])", () => {
  getSyntaxColor(testLang, "[rgba]");
}));

// Benchmark: getSyntaxColor number
results.push(benchmark("getSyntaxColor (number)", () => {
  getSyntaxColor(testLang, "number");
}));

// Benchmark: getSyntaxColor ansi
results.push(benchmark("getSyntaxColor (ansi)", () => {
  getSyntaxColor(testLang, "ansi");
}));

// Benchmark: getSyntaxAnsi
results.push(benchmark("getSyntaxAnsi", () => {
  getSyntaxAnsi(testLang);
}));

// Benchmark: getSyntaxColorCSS
results.push(benchmark("getSyntaxColorCSS", () => {
  getSyntaxColorCSS(testLang);
}));

// Benchmark: hasLanguageColor
results.push(benchmark("hasLanguageColor (hit)", () => {
  hasLanguageColor(testLang);
}));

// Benchmark: hasLanguageColor (miss)
results.push(benchmark("hasLanguageColor (miss)", () => {
  hasLanguageColor("unknown-xyz");
}));

// Benchmark: Direct TOML lookup
results.push(benchmark("Direct TOML lookup", () => {
  const _ = colors[testLang];
  const __ = names[testLang];
  const ___ = text_colors[testLang];
}));

// Benchmark: Bun.color (raw)
results.push(benchmark("Bun.color (raw hex)", () => {
  color("#3178C6", "hex");
}));

// Benchmark: Bun.color (raw {rgb})
results.push(benchmark("Bun.color (raw {rgb})", () => {
  color("#3178C6", "{rgb}");
}));

// Benchmark: Case normalization
results.push(benchmark("toLowerCase", () => {
  "TypeScript".toLowerCase();
}));

// Benchmark: Full render simulation (what ConfigTab does)
results.push(benchmark("Full render cycle", () => {
  const lang = "typescript";
  const normalized = lang.toLowerCase();
  const bg = colors[normalized] ?? settings.fallback_bg;
  const text = text_colors[normalized] ?? settings.fallback_text;
  const name = names[normalized] ?? settings.fallback_name;
  // Simulate style object creation
  const style = { backgroundColor: bg, color: text };
}));

// ============================================
// Output Results
// ============================================

console.log("\n📊 Results:\n");

// Sort by ops/sec descending
results.sort((a, b) => b.opsPerSec - a.opsPerSec);

// Format output using Bun.inspect.table
const tableData = results.map((r, i) => ({
  "#": i + 1,
  "Benchmark": r.name,
  "Iterations": r.iterations.toLocaleString(),
  "Total (ms)": r.totalMs.toFixed(2),
  "Avg (ns)": r.avgNs.toFixed(0),
  "Ops/sec": r.opsPerSec.toLocaleString(),
}));

console.log(Bun.inspect.table(tableData, { colors: true }));

// Summary stats
const fastestOps = Math.max(...results.map(r => r.opsPerSec));
const slowestOps = Math.min(...results.map(r => r.opsPerSec));
const avgOps = Math.floor(results.reduce((sum, r) => sum + r.opsPerSec, 0) / results.length);

console.log("\n📈 Summary:");
console.log(`  Fastest:  ${fastestOps.toLocaleString()} ops/sec`);
console.log(`  Slowest:  ${slowestOps.toLocaleString()} ops/sec`);
console.log(`  Average:  ${avgOps.toLocaleString()} ops/sec`);

// Performance assertions
console.log("\n✅ Performance Assertions:");

const renderCycle = results.find(r => r.name === "Full render cycle");
if (renderCycle && renderCycle.avgNs < 1000) {
  console.log(`  ✓ Full render cycle: ${renderCycle.avgNs.toFixed(0)}ns < 1000ns`);
} else {
  console.log(`  ✗ Full render cycle too slow: ${renderCycle?.avgNs.toFixed(0)}ns`);
}

const colorInfo = results.find(r => r.name === "getSyntaxColorInfo (single)");
if (colorInfo && colorInfo.opsPerSec > 1_000_000) {
  console.log(`  ✓ getSyntaxColorInfo: ${colorInfo.opsPerSec.toLocaleString()} ops/sec > 1M`);
} else {
  console.log(`  ✗ getSyntaxColorInfo too slow: ${colorInfo?.opsPerSec.toLocaleString()} ops/sec`);
}

const hasColor = results.find(r => r.name === "hasLanguageColor (hit)");
if (hasColor && hasColor.opsPerSec > 10_000_000) {
  console.log(`  ✓ hasLanguageColor: ${hasColor.opsPerSec.toLocaleString()} ops/sec > 10M`);
} else {
  console.log(`  ✗ hasLanguageColor too slow: ${hasColor?.opsPerSec.toLocaleString()} ops/sec`);
}

console.log("\n" + "=".repeat(70));
console.log("Benchmark complete.\n");

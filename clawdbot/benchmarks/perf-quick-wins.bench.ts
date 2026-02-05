/**
 * Performance Benchmark: Quick Wins
 * Run: bun run benchmarks/perf-quick-wins.bench.ts
 */

// --- Test Data ---

const SAMPLE_PATHS = [
  "src/components/Button.tsx",
  "src/components/Input.tsx",
  "src/components/Modal.tsx",
  "src/utils/helpers.ts",
  "src/utils/format.ts",
  "src/api/endpoints/users.ts",
  "src/api/endpoints/auth.ts",
  "src/api/endpoints/posts.ts",
  "config/settings.json",
  "package.json",
];

const SAMPLE_METAS = [
  "elevated · pty · npm install",
  "pty · git status",
  "elevated · docker compose up",
  "npm run build",
  "   spaced  ·  values  ·  here   ",
];

const SENSITIVE_TEXTS = [
  'API_KEY="sk-proj-abc123def456ghi789jkl012mno345pqr678"',
  'Authorization: Bearer ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'password=super_secret_password_12345678',
  '{"apiKey": "AIzaSyABC123DEF456GHI789JKL012MNO345PQR"}',
  '--token xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwx',
].join("\n").repeat(10);

const DEFAULT_REDACT_PATTERNS: string[] = [
  String.raw`\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\b\s*[=:]\s*(["']?)([^\s"'\\]+)\1`,
  String.raw`"(?:apiKey|token|secret|password|passwd|accessToken|refreshToken)"\s*:\s*"([^"]+)"`,
  String.raw`--(?:api[-_]?key|token|secret|password|passwd)\s+(["']?)([^\s"']+)\1`,
  String.raw`Authorization\s*[:=]\s*Bearer\s+([A-Za-z0-9._\-+=]+)`,
  String.raw`\bBearer\s+([A-Za-z0-9._\-+=]{18,})\b`,
  String.raw`-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----`,
  String.raw`\b(sk-[A-Za-z0-9_-]{8,})\b`,
  String.raw`\b(ghp_[A-Za-z0-9]{20,})\b`,
  String.raw`\b(github_pat_[A-Za-z0-9_]{20,})\b`,
  String.raw`\b(xox[baprs]-[A-Za-z0-9-]{10,})\b`,
  String.raw`\b(xapp-[A-Za-z0-9-]{10,})\b`,
  String.raw`\b(gsk_[A-Za-z0-9_-]{10,})\b`,
  String.raw`\b(AIza[0-9A-Za-z\-_]{20,})\b`,
  String.raw`\b(pplx-[A-Za-z0-9_-]{10,})\b`,
  String.raw`\b(npm_[A-Za-z0-9]{10,})\b`,
  String.raw`\b(\d{6,}:[A-Za-z0-9_-]{20,})\b`,
];

// --- BEFORE: Current Implementations ---

function pathParsing_BEFORE(paths: string[]) {
  const grouped: Record<string, string[]> = {};
  for (const m of paths) {
    const parts = m.split("/");
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join("/");
      const base = parts.at(-1) ?? m;
      if (!grouped[dir]) grouped[dir] = [];
      grouped[dir].push(base);
    } else {
      if (!grouped["."]) grouped["."] = [];
      grouped["."].push(m);
    }
  }
  return grouped;
}

function splitExecFlags_BEFORE(meta: string): { flags: string[]; body: string } {
  const parts = meta
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { flags: [], body: "" };
  const flags: string[] = [];
  const bodyParts: string[] = [];
  for (const part of parts) {
    if (part === "elevated" || part === "pty") {
      flags.push(part);
      continue;
    }
    bodyParts.push(part);
  }
  return { flags, body: bodyParts.join(" · ") };
}

function redactText_BEFORE(text: string): string {
  // Recompiles patterns every call (current behavior)
  const patterns = DEFAULT_REDACT_PATTERNS.map((raw) => new RegExp(raw, "gi"));
  let next = text;
  for (const pattern of patterns) {
    next = next.replace(pattern, "***REDACTED***");
  }
  return next;
}

// --- AFTER: Optimized Implementations ---

function pathParsing_AFTER(paths: string[]) {
  const grouped: Record<string, string[]> = {};
  for (const m of paths) {
    const lastSlash = m.lastIndexOf("/");
    if (lastSlash > 0) {
      const dir = m.substring(0, lastSlash);
      const base = m.substring(lastSlash + 1);
      if (!grouped[dir]) grouped[dir] = [];
      grouped[dir].push(base);
    } else {
      if (!grouped["."]) grouped["."] = [];
      grouped["."].push(m);
    }
  }
  return grouped;
}

function splitExecFlags_AFTER(meta: string): { flags: string[]; body: string } {
  const parts = meta.split(/\s*·\s*/).filter(Boolean);
  if (parts.length === 0) return { flags: [], body: "" };
  const flags: string[] = [];
  const bodyParts: string[] = [];
  for (const part of parts) {
    if (part === "elevated" || part === "pty") {
      flags.push(part);
      continue;
    }
    bodyParts.push(part);
  }
  return { flags, body: bodyParts.join(" · ") };
}

// Pre-compiled patterns (cached once)
const COMPILED_PATTERNS = DEFAULT_REDACT_PATTERNS.map((raw) => new RegExp(raw, "gi"));

function redactText_AFTER(text: string): string {
  // Uses pre-compiled patterns
  let next = text;
  for (const pattern of COMPILED_PATTERNS) {
    pattern.lastIndex = 0; // Reset for global regex
    next = next.replace(pattern, "***REDACTED***");
  }
  return next;
}

// --- Benchmark Runner ---

interface BenchResult {
  name: string;
  ops: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

function bench(name: string, fn: () => void, iterations = 10000): BenchResult {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const times: number[] = [];
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }

  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;

  return {
    name,
    ops: Math.round(iterations / (totalMs / 1000)),
    avgMs: Number(avgMs.toFixed(6)),
    minMs: Number(Math.min(...times).toFixed(6)),
    maxMs: Number(Math.max(...times).toFixed(6)),
  };
}

function runBenchmarks() {
  console.log("\n🏃 Running Performance Benchmarks...\n");
  console.log("═".repeat(70));

  const results: { before: BenchResult; after: BenchResult; improvement: string }[] = [];

  // Benchmark 1: Path Parsing
  console.log("\n📁 Path Parsing (split/slice/join vs lastIndexOf/substring)");
  const pathBefore = bench("BEFORE", () => pathParsing_BEFORE(SAMPLE_PATHS));
  const pathAfter = bench("AFTER ", () => pathParsing_AFTER(SAMPLE_PATHS));
  const pathImprove = ((pathBefore.avgMs - pathAfter.avgMs) / pathBefore.avgMs * 100).toFixed(1);
  results.push({ before: pathBefore, after: pathAfter, improvement: `${pathImprove}%` });

  // Benchmark 2: Exec Flags Split
  console.log("\n🔧 Exec Flags Split (split+map+filter vs regex split)");
  const flagsBefore = bench("BEFORE", () => SAMPLE_METAS.forEach(m => splitExecFlags_BEFORE(m)));
  const flagsAfter = bench("AFTER ", () => SAMPLE_METAS.forEach(m => splitExecFlags_AFTER(m)));
  const flagsImprove = ((flagsBefore.avgMs - flagsAfter.avgMs) / flagsBefore.avgMs * 100).toFixed(1);
  results.push({ before: flagsBefore, after: flagsAfter, improvement: `${flagsImprove}%` });

  // Benchmark 3: Redaction (the big one)
  console.log("\n🔐 Redaction (recompile patterns vs cached patterns)");
  const redactBefore = bench("BEFORE", () => redactText_BEFORE(SENSITIVE_TEXTS), 1000);
  const redactAfter = bench("AFTER ", () => redactText_AFTER(SENSITIVE_TEXTS), 1000);
  const redactImprove = ((redactBefore.avgMs - redactAfter.avgMs) / redactBefore.avgMs * 100).toFixed(1);
  results.push({ before: redactBefore, after: redactAfter, improvement: `${redactImprove}%` });

  // Summary Table
  console.log("\n" + "═".repeat(70));
  console.log("\n📊 RESULTS SUMMARY\n");

  const tableData = results.map((r, i) => ({
    "#": i + 1,
    "Benchmark": r.before.name.replace("BEFORE", ["Path Parsing", "Exec Flags", "Redaction"][i]),
    "Before (ops/s)": r.before.ops.toLocaleString(),
    "After (ops/s)": r.after.ops.toLocaleString(),
    "Improvement": r.improvement,
    "Speedup": `${(r.before.avgMs / r.after.avgMs).toFixed(2)}x`,
  }));

  console.log(Bun.inspect.table(tableData, { colors: true }));

  // Overall summary
  const totalBefore = results.reduce((sum, r) => sum + r.before.avgMs, 0);
  const totalAfter = results.reduce((sum, r) => sum + r.after.avgMs, 0);
  const overallImprove = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(1);

  console.log(`\n✨ Overall improvement: ${overallImprove}% faster`);
  console.log(`   Combined avg time: ${totalBefore.toFixed(4)}ms → ${totalAfter.toFixed(4)}ms\n`);

  return { results, overall: { before: totalBefore, after: totalAfter, improvement: overallImprove } };
}

// Run
runBenchmarks();

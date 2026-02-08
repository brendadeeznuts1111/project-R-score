// cookie-crc32-integrator.ts — CRC32 cookie signing, verification, AB testing, and wiki CLI
// Usage: bun run cookie-crc32-integrator.ts <command> [args]

import { crc32, verify, toHex, benchmark, runBenchmarks } from '../../lib/core/crc32';
import { styled, FW_COLORS, log, colorBar } from '../../lib/theme/colors';

// ============================================================================
// YAML CONFIG LOADING (Bun native import)
// ============================================================================

interface CookieConfig {
  cookie: {
    secret: string | null;
    name: string;
    domain: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    maxAgeDays: number;
  };
  ab: {
    defaultVariants: string[];
    trafficSplit: number;
  };
  benchmark: {
    iterations: number;
    sizes: number[];
  };
}

const DEFAULT_CONFIG: CookieConfig = {
  cookie: {
    secret: null,
    name: 'ab_variant',
    domain: 'localhost',
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAgeDays: 30,
  },
  ab: { defaultVariants: ['A', 'B'], trafficSplit: 50 },
  benchmark: { iterations: 100_000, sizes: [1, 10, 100, 1024] },
};

/** Load environment-specific YAML config using Bun's native import() */
async function loadConfig(): Promise<CookieConfig> {
  const env = Bun.env.NODE_ENV || 'development';
  try {
    const mod = await import(`../../configs/cookie-crc32/${env}.yaml`);
    const yaml = mod.default as Partial<CookieConfig>;
    // Deep merge with defaults so missing keys don't break
    return {
      cookie: { ...DEFAULT_CONFIG.cookie, ...yaml.cookie },
      ab: { ...DEFAULT_CONFIG.ab, ...yaml.ab },
      benchmark: { ...DEFAULT_CONFIG.benchmark, ...yaml.benchmark },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Fire config load eagerly — resolves during arg parsing.
// Use peek() in sync paths to skip the await microtick.
import { peek } from "bun";
const configPromise = loadConfig();

// ============================================================================
// COL-89 OUTPUT HELPERS
// ============================================================================

const COL_WIDTH = 89;

/** Measure visual width (Unicode-aware, ignores ANSI escapes) */
function measureWidth(text: string): number {
  return Bun.stringWidth(
    Bun.stripANSI(text),
    { countAnsiEscapeCodes: false },
  );
}

/** Wrap text to Col-89 (Unicode-aware) */
function col89(text: string): string {
  return Bun.wrapAnsi(text, COL_WIDTH, { wordWrap: true, trim: true });
}

/** Assert Col-89 compliance, warn on violation */
function assertCol89(text: string, context = "output"): void {
  const w = measureWidth(text);
  if (w > COL_WIDTH) {
    console.warn(`[COL-89 VIOLATION] ${context} width=${w}`);
  }
}

/** Print a line, enforcing Col-89 */
function print(text: string): void {
  const wrapped = col89(text);
  assertCol89(wrapped, "print");
  console.log(wrapped);
}

// ============================================================================
// COOKIE SIGNING PROTOCOL
// ============================================================================

/** Sign a cookie: crc32("name=value") → "name=value|hex" */
function signCookie(name: string, value: string): string {
  const payload = `${name}=${value}`;
  const { hex } = crc32(payload);
  return `${payload}|${hex}`;
}

/** Verify a signed cookie string "name=value|hex" */
function verifyCookie(cookie: string): { valid: boolean; payload: string; expected: string; actual: string } {
  const lastPipe = cookie.lastIndexOf('|');
  if (lastPipe === -1) {
    return { valid: false, payload: cookie, expected: '(none)', actual: crc32(cookie).hex };
  }

  const payload = cookie.slice(0, lastPipe);
  const expected = cookie.slice(lastPipe + 1).toUpperCase();
  const actual = crc32(payload).hex;

  // strict=true: zero-trust exact match (critical for security/CI contexts)
  const isCI = !!Bun.env.CI || !!Bun.env.CLAUDECODE;
  const strict = isCI ? true : true; // always strict for cookie integrity
  return { valid: Bun.deepEquals(actual, expected, strict), payload, expected, actual };
}

/** Deterministic AB bucket: crc32(userId + experimentId) % 2 → A or B */
function abBucket(userId: string, experimentId: string): 'A' | 'B' {
  const { value } = crc32(userId + experimentId);
  return (value % 2 === 0) ? 'A' : 'B';
}

// ============================================================================
// SECURE VARIANT MANAGER (aligned with barbershop/lib/cookie-security-v3.26.ts)
// ============================================================================

export interface VariantManagerConfig {
  secretKey: string;
  cookieName?: string;
  expiresDays?: number;
}

interface VariantPayload {
  v: string;
  s: string;
  t: number;
  id: string; // UUIDv7 — time-sortable, unique per assignment
  e?: string; // experiment ID
}

/**
 * Manages AB test variant cookies using the same JSON {v, s, t} format
 * and HMAC-SHA256 signing as barbershop/lib/cookie-security-v3.26.ts.
 *
 * CRC32 is used for deterministic bucketing (assignment),
 * SHA-256 HMAC is used for cookie integrity (signing).
 */
export class SecureVariantManager {
  private secretKey: string;
  private cookieName: string;
  private maxAge: number;

  constructor(config: VariantManagerConfig) {
    this.secretKey = config.secretKey;
    this.cookieName = config.cookieName || 'ab_variant';
    this.maxAge = (config.expiresDays || 30) * 24 * 60 * 60;
  }

  /** Custom inspect — shows config without leaking secretKey */
  [Bun.inspect.custom]() {
    return `SecureVariantManager { cookie: "${this.cookieName}", maxAge: ${this.maxAge}s, key: "${this.secretKey.slice(0, 4)}…" }`;
  }

  /** HMAC-SHA256 sign variant data, matching barbershop's approach */
  private sign(userId: string, variant: string, timestamp: number): string {
    const hasher = new Bun.CryptoHasher('sha256', this.secretKey);
    hasher.update(userId);
    hasher.update(variant);
    hasher.update(timestamp.toString());
    return hasher.digest('hex').slice(0, 16);
  }

  /** Deterministic bucket assignment via CRC32 */
  assignVariant(userId: string, experimentId: string): 'A' | 'B' {
    return abBucket(userId, experimentId);
  }

  /** Create a signed Set-Cookie header for a variant */
  createVariantCookie(variant: string, experimentId?: string): string {
    const userId = experimentId || 'default';
    const timestamp = Date.now();
    const signature = this.sign(userId, variant, timestamp);
    const id = Bun.randomUUIDv7("base64url", timestamp);

    const payload: VariantPayload = { v: variant, s: signature, t: timestamp, id };
    if (experimentId) payload.e = experimentId;

    const name = experimentId ? `${this.cookieName}_${experimentId}` : this.cookieName;
    const value = encodeURIComponent(JSON.stringify(payload));

    return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${this.maxAge}`;
  }

  /** Extract all variant cookies from a Cookie header */
  extractAllVariants(cookieHeader: string | null): Record<string, string> {
    const variants: Record<string, string> = {};
    if (!cookieHeader) return variants;

    const prefix = this.cookieName;
    const pairs = cookieHeader.split(';').map(s => s.trim());

    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;

      const name = pair.slice(0, eqIdx).trim();
      if (!name.startsWith(prefix)) continue;

      const rawValue = pair.slice(eqIdx + 1).trim();
      try {
        const decoded = decodeURIComponent(rawValue);
        const parsed: VariantPayload = JSON.parse(decoded);
        // Extract experiment key: "ab_variant_landing" → "landing", "ab_variant" → "default"
        const experimentKey = name === prefix ? 'default' : name.slice(prefix.length + 1);
        variants[experimentKey] = parsed.v;
      } catch {
        // Skip malformed cookies
      }
    }

    return variants;
  }

  /** Validate a variant cookie value against a userId */
  validateVariant(cookieValue: string, userId: string): { valid: boolean; variant?: string } {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const parsed: VariantPayload = JSON.parse(decoded);

      const expectedSig = this.sign(userId, parsed.v, parsed.t);
      if (!Bun.deepEquals(parsed.s, expectedSig, true)) return { valid: false };

      // Reject if older than maxAge
      if (Date.now() - parsed.t > this.maxAge * 1000) return { valid: false };

      return { valid: true, variant: parsed.v };
    } catch {
      return { valid: false };
    }
  }
}

// ============================================================================
// WIKI PAGE EXPORTS (for wiki-generator-cli integration)
// ============================================================================

/** WikiPage shape expected by lib/wiki/wiki-generator-cli.ts */
export interface CookieWikiPage {
	title: string;
	url: string;
	category: string;
	documentation: string;
	example?: string;
	relatedDocs?: string[];
	validationStatus?: "valid" | "invalid";
}

/**
 * Returns wiki pages describing the CRC32 cookie system.
 * Consumed by lib/wiki/wiki-generator-cli.ts so these pages appear
 * alongside other Bun utilities in the generated wiki.
 */
export function getCookieCRC32WikiPages(
	baseUrl = "https://wiki.company.com",
	workspace = "bun-utilities",
): CookieWikiPage[] {
	const base = `${baseUrl}/${workspace}/cookie_crc32`;
	return [
		{
			title: "COOKIE CRC32: SIGNING",
			url: `${base}/signing`,
			category: "cookie_crc32",
			documentation: "CRC32-based cookie signing: " +
				'crc32("name=value") -> "name=value|hex". ' +
				"Hardware-accelerated via PCLMULQDQ (x86) " +
				"or CRC32 (ARM64).",
			example: 'signCookie("session", "abc") ' +
				'// => "session=abc|D9D2E670"',
			relatedDocs: [
				"https://bun.sh/docs/api/hashing",
			],
			validationStatus: "valid",
		},
		{
			title: "COOKIE CRC32: VERIFICATION",
			url: `${base}/verification`,
			category: "cookie_crc32",
			documentation: "Verify signed cookies by splitting " +
				"on last pipe, recomputing CRC32, and " +
				"comparing hex digests.",
			example: 'verifyCookie("session=abc|D9D2E670") ' +
				"// => { valid: true, ... }",
			relatedDocs: [
				"https://bun.sh/docs/api/hashing",
			],
			validationStatus: "valid",
		},
		{
			title: "COOKIE CRC32: AB TESTING",
			url: `${base}/ab-testing`,
			category: "cookie_crc32",
			documentation: "Deterministic AB bucketing via " +
				"crc32(userId + experimentId) % 2. " +
				"Cookies use HMAC-SHA256 signed JSON " +
				"{v, s, t} format (barbershop-compatible).",
			example: 'abBucket("user123", "landing") // => "A"',
			relatedDocs: [
				"https://bun.sh/docs/api/hashing",
			],
			validationStatus: "valid",
		},
		{
			title: "COOKIE CRC32: SECURE VARIANT MANAGER",
			url: `${base}/secure-variant-manager`,
			category: "cookie_crc32",
			documentation: "SecureVariantManager class for " +
				"production AB testing. HMAC-SHA256 " +
				"signed, timestamp-bound, compatible " +
				"with barbershop cookie-security-v3.26.",
			example: "new SecureVariantManager({ " +
				'secretKey: "..." }).createVariantCookie("A", "exp1")',
			relatedDocs: [
				"https://bun.sh/docs/api/hashing",
			],
			validationStatus: "valid",
		},
		{
			title: "COOKIE CRC32: BENCHMARKS",
			url: `${base}/benchmarks`,
			category: "cookie_crc32",
			documentation: "Performance benchmarks for CRC32 " +
				"hashing and cookie sign/verify ops. " +
				"Hardware acceleration yields ~10 GB/s " +
				"on modern hardware.",
			example: "bun run cookie-crc32-integrator.ts benchmark",
			validationStatus: "valid",
		},
	];
}

// ============================================================================
// COMMANDS
// ============================================================================

async function cmdWiki(full = false): Promise<void> {
  if (full) {
    // Verify bun binary is available before shelling out
    const bunPath = Bun.which("bun");
    if (!bunPath) {
      print(styled("Error:", "error") + " bun binary not found in PATH");
      process.exit(1);
    }
    // Delegate to the full wiki generator pipeline
    // which now includes cookie-CRC32 pages via getCookieCRC32WikiPages()
    const { $ } = await import("bun");
    const outputDir = Bun.escapeHTML("./internal-wiki/");
    print(styled("Generating full wiki (includes cookie-CRC32 pages)...", "accent"));
    await $`${bunPath} ${import.meta.dir}/../../lib/wiki/wiki-generator-cli.ts --format all`.quiet();
    print(styled("Done!", "success") + ` Files written to ${outputDir}`);

    // Open generated HTML in browser if `open` is available
    const openBin = Bun.which("open");
    if (openBin) {
      await $`${openBin} ./internal-wiki/bun-utilities-wiki.html`.quiet().nothrow();
    }
    // Also open the markdown source in the user's editor
    Bun.openInEditor("./internal-wiki/bun-utilities-wiki.md", { line: 1 });
    return;
  }

  // Run a quick benchmark for live numbers
  const small = benchmark(1);
  const large = benchmark(1024);

  print(styled('CRC32 Cookie Integrator — Wiki', 'accent'));
  print('');

  print(styled('Overview', 'accent'));
  print('A single-file CLI that integrates hardware-accelerated CRC32');
  print('hashing with cookie signing, verification, and deterministic AB testing.');
  print('');

  print(styled('Hardware Acceleration', 'accent'));
  print('Bun.hash.crc32 delegates to CPU-native instructions:');
  console.log(Bun.inspect.table([
    { Architecture: 'x86/x64', Instruction: 'PCLMULQDQ', Throughput: `${large.throughput.trim()} (1KB)` },
    { Architecture: 'ARM64', Instruction: 'CRC32', Throughput: 'native speed' },
  ]));
  print('Not a software lookup table — runs on dedicated silicon (~10 GB/s).');
  print('');

  print(styled('Cookie Signing Protocol', 'accent'));
  print('  Sign:   crc32("name=value") -> hex');
  print('  Cookie: "name=value|hex"');
  print('  Verify: split on last "|", recompute CRC32, compare');
  print(`  ~${small.opsPerSecond.toLocaleString()} sign ops/sec | deterministic | not cryptographic`);
  print('');

  print(styled('AB Testing', 'accent'));
  print('  Bucketing: crc32(userId + experimentId) % 2 -> A or B');
  print('  Cookie:    ab_variant_<experiment> = JSON { v, s, t }');
  print('  Signing:   HMAC-SHA256 (barbershop cookie-security-v3.26 compatible)');
  print('');

  print(styled('CLI Reference', 'accent'));
  console.log(Bun.inspect.table([
    { Action: 'Wiki', Command: 'bun run cookie-crc32-integrator.ts wiki' },
    { Action: 'Wiki (full)', Command: 'bun run cookie-crc32-integrator.ts wiki --full' },
    { Action: 'Benchmark', Command: 'bun run cookie-crc32-integrator.ts benchmark' },
    { Action: 'Create cookie', Command: 'bun run cookie-crc32-integrator.ts create <n> <v>' },
    { Action: 'Verify cookie', Command: 'bun run cookie-crc32-integrator.ts verify "<c>"' },
    { Action: 'AB variant', Command: 'bun run cookie-crc32-integrator.ts ab <u> <e> [v]' },
  ], ['Action', 'Command']));

  print(styled('Performance', 'accent'));
  console.log(Bun.inspect.table([
    { Size: small.size, 'Time (ms)': small.timeMs.toFixed(3), Throughput: small.throughput.trim(), 'Ops/sec': small.opsPerSecond.toLocaleString() },
    { Size: large.size, 'Time (ms)': large.timeMs.toFixed(3), Throughput: large.throughput.trim(), 'Ops/sec': large.opsPerSecond.toLocaleString() },
  ], ['Size', 'Time (ms)', 'Throughput', 'Ops/sec']));
}

async function cmdBenchmark(exportJsonl = false): Promise<void> {
  const { heapStats, estimateShallowMemoryUsageOf, serialize, deserialize }
    = await import("bun:jsc");

  // Heap snapshot BEFORE benchmarks
  const heapBefore = heapStats();

  const benchResults: Record<string, unknown>[] = [];
  await runBenchmarks();

  // Cookie-specific benchmarks
  console.log('\n' + styled('Cookie Operations', 'accent'));

  const signIterations = 100_000;

  // Sign benchmark (Bun.nanoseconds for sub-ms precision)
  const signStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    signCookie('session', `value${i}`);
  }
  const signNs = Bun.nanoseconds() - signStart;
  const signAvgNs = signNs / signIterations;
  const signOps = Math.floor(1e9 / signAvgNs);

  // Verify benchmark
  const cookie = signCookie('session', 'testvalue');
  const verifyStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    verifyCookie(cookie);
  }
  const verifyNs = Bun.nanoseconds() - verifyStart;
  const verifyAvgNs = verifyNs / signIterations;
  const verifyOps = Math.floor(1e9 / verifyAvgNs);

  // stringWidth benchmark (Unicode-aware width measurement)
  const swSample = 'Set-Cookie: session=abc|D9D2E670; HttpOnly; Secure';
  const swStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.stringWidth(swSample, { countAnsiEscapeCodes: false });
  }
  const swNs = Bun.nanoseconds() - swStart;
  const swAvgNs = swNs / signIterations;
  const swOps = Math.floor(1e9 / swAvgNs);

  // stringWidth Unicode benchmark (emoji + CJK)
  const unicodeSample = '🍪 cookie=会话|D9D2E670 ✅';
  const uniStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.stringWidth(unicodeSample, { countAnsiEscapeCodes: false });
  }
  const uniNs = Bun.nanoseconds() - uniStart;
  const uniAvgNs = uniNs / signIterations;
  const uniOps = Math.floor(1e9 / uniAvgNs);

  // deepEquals benchmark (strict mode)
  const deA = { v: 'A', s: 'abc123', t: 1234567890 };
  const deB = { v: 'A', s: 'abc123', t: 1234567890 };
  const deStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.deepEquals(deA, deB, true);
  }
  const deNs = Bun.nanoseconds() - deStart;
  const deAvgNs = deNs / signIterations;
  const deOps = Math.floor(1e9 / deAvgNs);

  // randomUUIDv7 benchmark — hex (default string)
  const uuidHexStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.randomUUIDv7("hex");
  }
  const uuidHexNs = Bun.nanoseconds() - uuidHexStart;
  const uuidHexAvg = uuidHexNs / signIterations;
  const uuidHexOps = Math.floor(1e9 / uuidHexAvg);

  // randomUUIDv7 benchmark — base64url (cookie payload)
  const uuidB64Start = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.randomUUIDv7("base64url");
  }
  const uuidB64Ns = Bun.nanoseconds() - uuidB64Start;
  const uuidB64Avg = uuidB64Ns / signIterations;
  const uuidB64Ops = Math.floor(1e9 / uuidB64Avg);

  // randomUUIDv7 benchmark — buffer (raw bytes)
  const uuidBufStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.randomUUIDv7("buffer");
  }
  const uuidBufNs = Bun.nanoseconds() - uuidBufStart;
  const uuidBufAvg = uuidBufNs / signIterations;
  const uuidBufOps = Math.floor(1e9 / uuidBufAvg);

  // peek() benchmark — read settled promise without microtick
  const settledPromise = Promise.resolve(42);
  const peekStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    peek(settledPromise);
  }
  const peekNs = Bun.nanoseconds() - peekStart;
  const peekAvgNs = peekNs / signIterations;
  const peekOps = Math.floor(1e9 / peekAvgNs);

  // peek.status() benchmark
  const peekStatusStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    peek.status(settledPromise);
  }
  const peekStatusNs = Bun.nanoseconds() - peekStatusStart;
  const peekStatusAvg = peekStatusNs / signIterations;
  const peekStatusOps = Math.floor(1e9 / peekStatusAvg);

  // peek(nonPromise) pass-through benchmark
  const peekPassStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    peek(42);
  }
  const peekPassNs = Bun.nanoseconds() - peekPassStart;
  const peekPassAvg = peekPassNs / signIterations;
  const peekPassOps = Math.floor(1e9 / peekPassAvg);

  console.log(Bun.inspect.table([
    { Op: 'Sign', 'Time (ns)': signAvgNs.toFixed(1), 'Ops/sec': signOps.toLocaleString() },
    { Op: 'Verify', 'Time (ns)': verifyAvgNs.toFixed(1), 'Ops/sec': verifyOps.toLocaleString() },
    { Op: 'stringWidth (ASCII)', 'Time (ns)': swAvgNs.toFixed(1), 'Ops/sec': swOps.toLocaleString() },
    { Op: 'stringWidth (Unicode)', 'Time (ns)': uniAvgNs.toFixed(1), 'Ops/sec': uniOps.toLocaleString() },
    { Op: 'deepEquals (strict)', 'Time (ns)': deAvgNs.toFixed(1), 'Ops/sec': deOps.toLocaleString() },
    { Op: 'UUIDv7 (hex)', 'Time (ns)': uuidHexAvg.toFixed(1), 'Ops/sec': uuidHexOps.toLocaleString() },
    { Op: 'UUIDv7 (base64url)', 'Time (ns)': uuidB64Avg.toFixed(1), 'Ops/sec': uuidB64Ops.toLocaleString() },
    { Op: 'UUIDv7 (buffer)', 'Time (ns)': uuidBufAvg.toFixed(1), 'Ops/sec': uuidBufOps.toLocaleString() },
    { Op: 'peek(settled)', 'Time (ns)': peekAvgNs.toFixed(1), 'Ops/sec': peekOps.toLocaleString() },
    { Op: 'peek(nonPromise)', 'Time (ns)': peekPassAvg.toFixed(1), 'Ops/sec': peekPassOps.toLocaleString() },
    { Op: 'peek.status()', 'Time (ns)': peekStatusAvg.toFixed(1), 'Ops/sec': peekStatusOps.toLocaleString() },
  ], ['Op', 'Time (ns)', 'Ops/sec']));

  // Hash algorithm shootout — all Bun.hash.* functions
  const hashInput = 'session=abc123_test_cookie_value';
  const hashIter = 100_000;
  const hashAlgos: [string, (d: string) => number | bigint][] = [
    ['crc32', Bun.hash.crc32],
    ['adler32', Bun.hash.adler32],
    ['cityHash32', Bun.hash.cityHash32],
    ['cityHash64', Bun.hash.cityHash64],
    ['xxHash32', Bun.hash.xxHash32],
    ['xxHash64', Bun.hash.xxHash64],
    ['murmur32v3', Bun.hash.murmur32v3],
    ['murmur64v2', Bun.hash.murmur64v2],
    ['wyhash', Bun.hash.wyhash],
  ];

  const hashResults = hashAlgos.map(([name, fn]) => {
    const t0 = Bun.nanoseconds();
    for (let i = 0; i < hashIter; i++) fn(hashInput);
    const ns = Bun.nanoseconds() - t0;
    const avg = ns / hashIter;
    const sample = fn(hashInput);
    return {
      Algorithm: name,
      'Time (ns)': avg.toFixed(1),
      'Ops/sec': Math.floor(1e9 / avg).toLocaleString(),
      'Bits': typeof sample === 'bigint' ? '64' : '32',
      'Sample': typeof sample === 'bigint'
        ? `0x${sample.toString(16).slice(0, 12)}…`
        : `0x${(sample >>> 0).toString(16).toUpperCase()}`,
    };
  });

  console.log('\n' + styled('Hash Algorithm Shootout', 'accent'));
  console.log(Bun.inspect.table(hashResults,
    ['Algorithm', 'Bits', 'Time (ns)', 'Ops/sec', 'Sample']));

  // Cookie payload memory + gzip analysis
  const samplePayload: VariantPayload = {
    v: 'A', s: 'dfbc07ea9d985e7b', t: Date.now(),
    id: Bun.randomUUIDv7("base64url"), e: 'landing',
  };
  const jsonStr = JSON.stringify(samplePayload);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const gzipped = Bun.gzipSync(jsonBytes);

  // gzipSync benchmark
  const gzStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.gzipSync(jsonBytes);
  }
  const gzNs = Bun.nanoseconds() - gzStart;
  const gzAvg = gzNs / signIterations;
  const gzOps = Math.floor(1e9 / gzAvg);

  // deflateSync benchmark
  const deflated = Bun.deflateSync(jsonBytes);
  const dfStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.deflateSync(jsonBytes);
  }
  const dfNs = Bun.nanoseconds() - dfStart;
  const dfAvg = dfNs / signIterations;
  const dfOps = Math.floor(1e9 / dfAvg);

  // zstdCompressSync benchmark
  const zstd = Bun.zstdCompressSync(jsonBytes);
  const zsStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    Bun.zstdCompressSync(jsonBytes);
  }
  const zsNs = Bun.nanoseconds() - zsStart;
  const zsAvg = zsNs / signIterations;
  const zsOps = Math.floor(1e9 / zsAvg);

  // bun:jsc serialize vs JSON.stringify benchmark
  const jscStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    serialize(samplePayload);
  }
  const jscNs = Bun.nanoseconds() - jscStart;
  const jscAvg = jscNs / signIterations;
  const jscOps = Math.floor(1e9 / jscAvg);

  const jsonStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    JSON.stringify(samplePayload);
  }
  const jsonNs = Bun.nanoseconds() - jsonStart;
  const jsonAvg = jsonNs / signIterations;
  const jsonOps = Math.floor(1e9 / jsonAvg);

  // Deserialize round-trip verification
  const serialized = serialize(samplePayload);
  const deserialized = deserialize(serialized);
  const roundTripOk = Bun.deepEquals(samplePayload, deserialized, true);

  console.log('\n' + styled('Cookie Payload Analysis', 'accent'));
  console.log(Bun.inspect.table([
    { Metric: 'JSON size', Value: `${jsonBytes.length} bytes` },
    { Metric: 'Gzip size', Value: `${gzipped.length} bytes` },
    { Metric: 'Deflate size', Value: `${deflated.length} bytes` },
    { Metric: 'Zstd size', Value: `${zstd.length} bytes` },
    { Metric: 'JSC serialize size', Value: `${serialized.byteLength} bytes` },
    { Metric: 'Payload memory', Value: `${estimateShallowMemoryUsageOf(samplePayload)} bytes` },
    { Metric: 'Round-trip (JSC)', Value: roundTripOk ? 'pass' : 'FAIL' },
  ], ['Metric', 'Value']));

  console.log('\n' + styled('Compression & Serialization', 'accent'));
  console.log(Bun.inspect.table([
    { Op: 'gzipSync', 'Time (ns)': gzAvg.toFixed(1), 'Ops/sec': gzOps.toLocaleString(), Output: `${gzipped.length}B` },
    { Op: 'deflateSync', 'Time (ns)': dfAvg.toFixed(1), 'Ops/sec': dfOps.toLocaleString(), Output: `${deflated.length}B` },
    { Op: 'zstdCompressSync', 'Time (ns)': zsAvg.toFixed(1), 'Ops/sec': zsOps.toLocaleString(), Output: `${zstd.length}B` },
    { Op: 'JSC serialize', 'Time (ns)': jscAvg.toFixed(1), 'Ops/sec': jscOps.toLocaleString(), Output: `${serialized.byteLength}B` },
    { Op: 'JSON.stringify', 'Time (ns)': jsonAvg.toFixed(1), 'Ops/sec': jsonOps.toLocaleString(), Output: `${jsonBytes.length}B` },
  ], ['Op', 'Time (ns)', 'Ops/sec', 'Output']));

  // Optional: hyperfine system benchmark if available
  const hyperfinePath = Bun.which("hyperfine");
  if (hyperfinePath) {
    const { $ } = await import("bun");
    print('');
    print(styled('System Benchmark (hyperfine)', 'accent'));
    const script = `${import.meta.dir}/cookie-crc32-integrator.ts`;
    await $`${hyperfinePath} --warmup 3 --runs 10 "bun ${script} create session abc"`.nothrow();
  } else {
    print('');
    print(styled('Tip:', 'muted') + ' Install hyperfine for system-level benchmarks');
  }

  // heapStats() benchmark
  const hsStart = Bun.nanoseconds();
  for (let i = 0; i < signIterations; i++) {
    heapStats();
  }
  const hsNs = Bun.nanoseconds() - hsStart;
  const hsAvg = hsNs / signIterations;
  const hsOps = Math.floor(1e9 / hsAvg);

  // Heap snapshot AFTER benchmarks
  const heapAfter = heapStats();

  console.log('\n' + styled('JSC Heap (bun:jsc heapStats)', 'accent'));
  console.log(Bun.inspect.table([
    { Metric: 'heapSize', Before: `${(heapBefore.heapSize / 1024).toFixed(0)} KiB`, After: `${(heapAfter.heapSize / 1024).toFixed(0)} KiB`, Delta: `+${((heapAfter.heapSize - heapBefore.heapSize) / 1024).toFixed(0)} KiB` },
    { Metric: 'heapCapacity', Before: `${(heapBefore.heapCapacity / 1024).toFixed(0)} KiB`, After: `${(heapAfter.heapCapacity / 1024).toFixed(0)} KiB`, Delta: `+${((heapAfter.heapCapacity - heapBefore.heapCapacity) / 1024).toFixed(0)} KiB` },
    { Metric: 'extraMemorySize', Before: `${(heapBefore.extraMemorySize / 1024).toFixed(0)} KiB`, After: `${(heapAfter.extraMemorySize / 1024).toFixed(0)} KiB`, Delta: `+${((heapAfter.extraMemorySize - heapBefore.extraMemorySize) / 1024).toFixed(0)} KiB` },
    { Metric: 'objectCount', Before: String(heapBefore.objectCount), After: String(heapAfter.objectCount), Delta: `+${heapAfter.objectCount - heapBefore.objectCount}` },
    { Metric: 'protectedObjectCount', Before: String(heapBefore.protectedObjectCount), After: String(heapAfter.protectedObjectCount), Delta: `+${heapAfter.protectedObjectCount - heapBefore.protectedObjectCount}` },
    { Metric: 'globalObjectCount', Before: String(heapBefore.globalObjectCount), After: String(heapAfter.globalObjectCount), Delta: `+${heapAfter.globalObjectCount - heapBefore.globalObjectCount}` },
    { Metric: 'heapStats() call', Before: '—', After: `${hsAvg.toFixed(1)} ns`, Delta: `${hsOps.toLocaleString()} ops/s` },
  ], ['Metric', 'Before', 'After', 'Delta']));

  print(styled('Tip:', 'muted') + ' MIMALLOC_SHOW_STATS=1 bun <script> for allocator stats');

  // Collect all results for JSONL export
  benchResults.push(
    { op: 'sign', avgNs: signAvgNs, opsPerSec: signOps },
    { op: 'verify', avgNs: verifyAvgNs, opsPerSec: verifyOps },
    { op: 'stringWidth_ascii', avgNs: swAvgNs, opsPerSec: swOps },
    { op: 'stringWidth_unicode', avgNs: uniAvgNs, opsPerSec: uniOps },
    { op: 'deepEquals_strict', avgNs: deAvgNs, opsPerSec: deOps },
    { op: 'uuidv7_hex', avgNs: uuidHexAvg, opsPerSec: uuidHexOps },
    { op: 'uuidv7_base64url', avgNs: uuidB64Avg, opsPerSec: uuidB64Ops },
    { op: 'uuidv7_buffer', avgNs: uuidBufAvg, opsPerSec: uuidBufOps },
    { op: 'peek_settled', avgNs: peekAvgNs, opsPerSec: peekOps },
    { op: 'peek_nonPromise', avgNs: peekPassAvg, opsPerSec: peekPassOps },
    { op: 'peek_status', avgNs: peekStatusAvg, opsPerSec: peekStatusOps },
    ...hashResults.map(h => ({
      op: `hash_${h.Algorithm}`, avgNs: parseFloat(h['Time (ns)']),
      opsPerSec: parseInt(h['Ops/sec'].replace(/,/g, ''), 10),
    })),
    { op: 'gzipSync', avgNs: gzAvg, opsPerSec: gzOps, outputBytes: gzipped.length },
    { op: 'deflateSync', avgNs: dfAvg, opsPerSec: dfOps, outputBytes: deflated.length },
    { op: 'zstdCompressSync', avgNs: zsAvg, opsPerSec: zsOps, outputBytes: zstd.length },
    { op: 'jsc_serialize', avgNs: jscAvg, opsPerSec: jscOps, outputBytes: serialized.byteLength },
    { op: 'json_stringify', avgNs: jsonAvg, opsPerSec: jsonOps, outputBytes: jsonBytes.length },
    { op: 'heapStats', avgNs: hsAvg, opsPerSec: hsOps },
    { op: 'heap_snapshot', heapBefore, heapAfter },
  );

  if (exportJsonl) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = `${import.meta.dir}/benchmark-${ts}.jsonl`;
    const jsonl = benchResults.map(r =>
      JSON.stringify({ ...r, bunVersion: Bun.version, timestamp: Date.now() })
    ).join('\n') + '\n';
    await Bun.write(outPath, jsonl);
    print(styled('Exported:', 'success') + ` ${outPath}`);
    print(styled('Size:', 'muted') + ` ${Bun.file(outPath).size} bytes`);
  }
}

function cmdCreate(name: string, value: string, config: CookieConfig): void {
  const signed = signCookie(name, value);
  const id = Bun.randomUUIDv7("hex");
  const maxAge = config.cookie.maxAgeDays * 24 * 60 * 60;
  const flags = [
    config.cookie.httpOnly ? 'HttpOnly' : '',
    config.cookie.secure ? 'Secure' : '',
    `SameSite=${config.cookie.sameSite.charAt(0).toUpperCase() + config.cookie.sameSite.slice(1)}`,
    config.cookie.domain !== 'localhost' ? `Domain=${config.cookie.domain}` : '',
    `Max-Age=${maxAge}`,
  ].filter(Boolean).join('; ');
  const header = `Set-Cookie: ${signed}; ${flags}`;
  print(styled('Signed cookie:', 'success'));
  print(header);
  print(styled('ID:', 'muted') + ` ${id}`);
}

function cmdVerify(cookie: string): void {
  const result = verifyCookie(cookie);

  if (result.valid) {
    print(styled('Valid', 'success') + ` — payload: ${result.payload}`);
  } else {
    print(styled('Invalid', 'error') + ` — payload: ${result.payload}`);
    print(`  expected: ${result.expected}`);
    print(`  actual:   ${result.actual}`);
  }
}

async function cmdConfig(config: CookieConfig): Promise<void> {
  const env = Bun.env.NODE_ENV || 'development';
  const configRelPath = `../../configs/cookie-crc32/${env}.yaml`;
  let resolvedConfigPath: string;
  try {
    resolvedConfigPath = Bun.resolveSync(configRelPath, import.meta.dir);
  } catch {
    resolvedConfigPath = '(unresolved)';
  }
  const entryFile = Bun.file(Bun.main);
  const configFile = Bun.file(resolvedConfigPath);
  const { heapStats } = await import("bun:jsc");
  const heap = heapStats();

  print(styled(`Config: ${env}`, 'accent') + ` (configs/cookie-crc32/${env}.yaml)`);
  console.log(Bun.inspect.table([
    { Key: 'Bun.version', Value: Bun.version },
    { Key: 'Bun.revision', Value: Bun.revision.slice(0, 12) },
    { Key: 'Bun.main', Value: Bun.main },
    { Key: 'Entry file:// URL', Value: Bun.pathToFileURL(Bun.main).href },
    { Key: 'Entry size', Value: `${entryFile.size} bytes` },
    { Key: 'Config path', Value: resolvedConfigPath },
    { Key: 'Config file:// URL', Value: resolvedConfigPath !== '(unresolved)' ? Bun.pathToFileURL(resolvedConfigPath).href : '(n/a)' },
    { Key: 'Config size', Value: `${configFile.size} bytes` },
    { Key: 'NODE_ENV', Value: env },
    { Key: 'JSC heapSize', Value: `${(heap.heapSize / 1024).toFixed(0)} KiB` },
    { Key: 'JSC objectCount', Value: String(heap.objectCount) },
    { Key: 'JSC extraMemorySize', Value: `${(heap.extraMemorySize / 1024).toFixed(0)} KiB` },
    { Key: 'Bun.which("bun")', Value: Bun.which("bun") || '(not found)' },
    { Key: 'Bun.which("hyperfine")', Value: Bun.which("hyperfine") || '(not found)' },
    { Key: 'Bun.which("open")', Value: Bun.which("open") || '(not found)' },
  ], ['Key', 'Value']));
  console.log(Bun.inspect(config, { depth: 4, colors: true, compact: false }));
}

// ============================================================================
// DETERMINISTIC SNAPSHOT ENGINE
// ============================================================================

/** Well-known JSC types — stable across runs (no Object.keys() order dependency) */
const WELL_KNOWN_TYPES = [
  'string', 'Function', 'Array', 'Object', 'Date',
  'RegExp', 'Map', 'Set', 'Promise', 'Error',
] as const;

/** Flaky patterns that depend on non-deterministic ordering */
const FLAKY_PATTERNS = [
  /slice\s*\(\s*0\s*,\s*\d+\s*\)\s*\.?\s*sort/,
  /Object\.keys\s*\([^)]+\)\s*\.?\s*slice/,
  /types?\s*\[\s*\d+\s*:\s*\d+\s*\]/,
];

function detectFlakyPattern(code: string): { isFlaky: boolean; suggestion: string } {
  for (const pattern of FLAKY_PATTERNS) {
    if (pattern.test(code)) {
      return {
        isFlaky: true,
        suggestion: 'Replace with property-based checks: has("string"), has("Function")',
      };
    }
  }
  return { isFlaky: false, suggestion: 'Pattern is stable' };
}

function generateSnapshot(obj: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  if (typeof obj === 'object' && obj !== null) {
    for (const type of WELL_KNOWN_TYPES) {
      snapshot[`has_${type}`] = type in obj;
    }
    snapshot.keyCount = Object.keys(obj).length;
    snapshot.contentHash = crc32(JSON.stringify(obj, Object.keys(obj).sort())).hex;
  }
  return snapshot;
}

// ============================================================================
// SERVE COMMAND (Bun.serve diagnostic dashboard)
// ============================================================================

async function cmdServe(port = 3026): Promise<void> {
  const { heapStats, estimateShallowMemoryUsageOf } = await import("bun:jsc");
  const startedAt = Date.now();
  let requestCount = 0;

  // Heap history for WebSocket sparkline (last 60 snapshots)
  const heapHistory: { ts: number; heapKiB: number; objects: number }[] = [];
  function pushHeapSample() {
    const h = heapStats();
    heapHistory.push({ ts: Date.now(), heapKiB: +(h.heapSize / 1024).toFixed(0), objects: h.objectCount });
    if (heapHistory.length > 60) heapHistory.shift();
  }
  const heapInterval = setInterval(pushHeapSample, 1000);
  pushHeapSample(); // seed first sample

  /** Wrap a Response with standard headers + Server-Timing */
  function withHeaders(res: Response, t0: number, extra?: Record<string, string>): Response {
    const durationMs = ((Bun.nanoseconds() - t0) / 1e6).toFixed(2);
    res.headers.set('Server-Timing', `total;dur=${durationMs}`);
    res.headers.set('X-Powered-By', `Bun/${Bun.version}`);
    res.headers.set('X-Bun-Revision', Bun.revision.slice(0, 12));
    res.headers.set('X-Request-Id', Bun.randomUUIDv7());
    // Security
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // CORS (allow dashboard JS)
    res.headers.set('Access-Control-Allow-Origin', '*');
    if (extra) for (const [k, v] of Object.entries(extra)) res.headers.set(k, v);
    return res;
  }

  const server = Bun.serve({
    port,
    async fetch(req, server) {
      const t0 = Bun.nanoseconds();
      const url = new URL(req.url);
      requestCount++;

      // WebSocket upgrade — /ws (no wrapping needed)
      if (url.pathname === '/ws') {
        if (server.upgrade(req)) return undefined as unknown as Response;
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      // Route to handler, then wrap with standard headers
      const res = await route(url, t0);
      return withHeaders(res, t0);

      async function route(url: URL, t0: number): Promise<Response> {

      // GET / — HTML dashboard
      if (url.pathname === '/') {
        return new Response(dashboardHTML(port), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
        });
      }

      // GET /api — JSON route index
      if (url.pathname === '/api') {
        return Response.json({
          service: 'cookie-crc32-integrator',
          version: Bun.version,
          revision: Bun.revision.slice(0, 12),
          uptime: `${((Date.now() - startedAt) / 1000).toFixed(0)}s`,
          requests: requestCount,
          routes: [
            '/api', '/heap', '/heap/history', '/heap/gc',
            '/hash?algo=&input=', '/uuid', '/compress?data=',
            '/sign?name=&value=', '/verify?cookie=',
            '/ab?userId=&expId=&variant=',
            '/theme', '/color?hex=',
            '/s3/list?prefix=&maxKeys=',
            '/s3/read?key=', '/s3/write?key= (POST)',
            '/s3/delete?key=', '/s3/presign?key=&method=&expiresIn=',
            '/s3/stat?key=',
            '/deterministic-check?code=',
            '/snapshot-gen?data=',
            '/benchmark-recovery?file=&timeout=',
            '/stuck-detect?pattern=',
            '/ws (WebSocket — live heap stream)',
          ],
        });
      }

      // /deterministic-check → Flaky pattern detector
      if (url.pathname === '/deterministic-check') {
        const code = url.searchParams.get('code') || '';
        return Response.json(detectFlakyPattern(code));
      }

      // /snapshot-gen → Deterministic snapshot
      if (url.pathname === '/snapshot-gen') {
        try {
          const obj = JSON.parse(url.searchParams.get('data') || '{}');
          return Response.json(generateSnapshot(obj));
        } catch {
          return Response.json({ error: 'Invalid JSON in data param' }, { status: 400 });
        }
      }

      // /benchmark-recovery → Run bench with timeout + auto-kill
      if (url.pathname === '/benchmark-recovery') {
        const file = url.searchParams.get('file') || 'ai.bench.ts';
        const timeout = parseInt(url.searchParams.get('timeout') || '30000', 10);
        const safeName = file.replace(/[^a-zA-Z0-9._-]/g, '');
        const proc = Bun.spawn(['bun', 'run', `lib/ai/${safeName}`], {
          cwd: `${import.meta.dir}/../..`,
          stdout: 'pipe', stderr: 'pipe',
        });
        const timer = setTimeout(() => proc.kill(), timeout);
        return proc.exited.then(async (code) => {
          clearTimeout(timer);
          const stdout = await new Response(proc.stdout).text();
          return Response.json({ file: safeName, exitCode: code, killed: code !== 0, stdout: stdout.slice(0, 8192) });
        });
      }

      // /stuck-detect → Find and report stuck bun processes
      if (url.pathname === '/stuck-detect') {
        const pattern = url.searchParams.get('pattern') || 'ai.bench';
        const safePattern = pattern.replace(/[^a-zA-Z0-9._-]/g, '');
        const proc = Bun.spawn(['pgrep', '-fl', safePattern], {
          stdout: 'pipe', stderr: 'pipe',
        });
        return proc.exited.then(async () => {
          const stdout = await new Response(proc.stdout).text();
          const processes = stdout.trim().split('\n').filter(Boolean);
          return Response.json({ pattern: safePattern, found: processes.length, processes });
        });
      }

      // /heap → JSC heap stats (full)
      if (url.pathname === '/heap') {
        const heap = heapStats();
        return Response.json({
          heapSize: `${(heap.heapSize / 1024).toFixed(0)} KiB`,
          heapCapacity: `${(heap.heapCapacity / 1024).toFixed(0)} KiB`,
          extraMemorySize: `${(heap.extraMemorySize / 1024).toFixed(0)} KiB`,
          objectCount: heap.objectCount,
          protectedObjectCount: heap.protectedObjectCount,
          globalObjectCount: heap.globalObjectCount,
          objectTypeCounts: heap.objectTypeCounts,
        });
      }

      // /heap/history → Sparkline data (last 60s)
      if (url.pathname === '/heap/history') {
        return Response.json(heapHistory);
      }

      // /heap/gc → Force garbage collection
      if (url.pathname === '/heap/gc') {
        const before = heapStats();
        Bun.gc(true);
        const after = heapStats();
        return Response.json({
          before: { heapKiB: +(before.heapSize / 1024).toFixed(0), objects: before.objectCount },
          after: { heapKiB: +(after.heapSize / 1024).toFixed(0), objects: after.objectCount },
          freed: `${+((before.heapSize - after.heapSize) / 1024).toFixed(0)} KiB`,
          objectsFreed: before.objectCount - after.objectCount,
        });
      }

      // /hash?algo=&input= → Hash with any Bun.hash algorithm
      if (url.pathname === '/hash') {
        const input = url.searchParams.get('input') || '';
        const algo = url.searchParams.get('algo');
        if (algo) {
          const fn = (Bun.hash as Record<string, Function>)[algo];
          if (!fn) return Response.json({ error: `Unknown algo: ${algo}`, available: Object.keys(Bun.hash) }, { status: 400 });
          const t0 = Bun.nanoseconds();
          const result = fn(input);
          const ns = Bun.nanoseconds() - t0;
          return Response.json({ algo, input, result: String(result), ns: ns.toFixed(0) });
        }
        // All algorithms
        const algos = ['crc32', 'adler32', 'cityHash32', 'cityHash64', 'xxHash32', 'xxHash64', 'murmur32v3', 'murmur64v2', 'wyhash'] as const;
        const results = algos.map(a => {
          const result = (Bun.hash as Record<string, Function>)[a](input);
          return { algo: a, result: String(result) };
        });
        return Response.json({ input, hashes: results });
      }

      // /uuid → Generate UUIDv7 in all encodings
      if (url.pathname === '/uuid') {
        const ts = url.searchParams.get('ts') ? parseInt(url.searchParams.get('ts')!, 10) : undefined;
        const hex = ts ? Bun.randomUUIDv7("hex", ts) : Bun.randomUUIDv7("hex");
        const b64 = ts ? Bun.randomUUIDv7("base64url", ts) : Bun.randomUUIDv7("base64url");
        const buf = ts ? Bun.randomUUIDv7("buffer", ts) : Bun.randomUUIDv7("buffer");
        return Response.json({
          hex, base64url: b64, bufferHex: Buffer.from(buf).toString('hex'),
          lengths: { hex: hex.length, base64url: b64.length, buffer: buf.byteLength },
          ...(ts ? { timestamp: ts } : {}),
        });
      }

      // /compress?data= → 3-way compression comparison
      if (url.pathname === '/compress') {
        const data = url.searchParams.get('data') || '';
        const bytes = new TextEncoder().encode(data);
        const gzipped = Bun.gzipSync(bytes);
        const deflated = Bun.deflateSync(bytes);
        const zstd = Bun.zstdCompressSync(bytes);
        return Response.json({
          original: bytes.length,
          gzip: gzipped.length,
          deflate: deflated.length,
          zstd: zstd.length,
          ratios: {
            gzip: `${(gzipped.length / bytes.length * 100).toFixed(1)}%`,
            deflate: `${(deflated.length / bytes.length * 100).toFixed(1)}%`,
            zstd: `${(zstd.length / bytes.length * 100).toFixed(1)}%`,
          },
        });
      }

      // /verify?cookie=name=val|hex → verify cookie
      if (url.pathname === '/verify') {
        const cookie = url.searchParams.get('cookie') || '';
        if (!cookie) return Response.json({ error: 'cookie param required' }, { status: 400 });
        return Response.json(verifyCookie(cookie));
      }

      // /sign?name=n&value=v → sign cookie + Set-Cookie header
      if (url.pathname === '/sign') {
        const name = url.searchParams.get('name') || '';
        const value = url.searchParams.get('value') || '';
        if (!name || !value) return Response.json({ error: 'name and value params required' }, { status: 400 });
        const signed = signCookie(name, value);
        const maxAge = 30 * 24 * 60 * 60; // 30 days
        const setCookie = `${signed}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
        const res = Response.json({
          cookie: signed,
          header: setCookie,
          memory: `${estimateShallowMemoryUsageOf({ name, value, signed })} bytes`,
        });
        res.headers.set('Set-Cookie', setCookie);
        return res;
      }

      // /ab?userId=&expId=&variant= → AB bucketing + Set-Cookie header
      if (url.pathname === '/ab') {
        const userId = url.searchParams.get('userId') || '';
        const expId = url.searchParams.get('expId') || '';
        if (!userId || !expId) return Response.json({ error: 'userId and expId params required' }, { status: 400 });
        const forced = url.searchParams.get('variant') || undefined;
        const bucket = forced || abBucket(userId, expId);
        const abCookie = signCookie(`ab_${expId}`, bucket);
        const maxAge = 30 * 24 * 60 * 60;
        const setCookie = `${abCookie}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
        const res = Response.json({
          userId, experimentId: expId, variant: bucket,
          forced: !!forced, cookie: abCookie,
          header: setCookie,
          crc32: crc32(userId + expId).hex,
        });
        res.headers.set('Set-Cookie', setCookie);
        return res;
      }

      // /theme → Full design system: FW_COLORS with hex, hsl, rgb, css props, Bun APIs
      if (url.pathname === '/theme') {
        const tokens = Object.entries(FW_COLORS).map(([name, hex]) => {
          const css = `var(--fw-${name})`;
          // Bun.color() converts between all formats natively
          const hslRaw = Bun.color(hex, 'hsl')!;
          const rgb = Bun.color(hex, 'rgb')!;
          const rgba = Bun.color(hex, '{rgba}') as { r: number; g: number; b: number; a: number };
          const num = Bun.color(hex, 'number')!;
          // Format HSL: hsl(217.2, 0.912, 0.598) → hsl(217, 91%, 60%)
          const hm = hslRaw.match(/hsl\(([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
          const hsl = hm
            ? `hsl(${Math.round(+hm[1])}, ${Math.round(+hm[2] * 100)}%, ${Math.round(+hm[3] * 100)}%)`
            : hslRaw;

          // Map token type
          let type: string;
          if (['primary', 'secondary', 'accent'].includes(name)) type = 'brand';
          else if (['success', 'warning', 'error', 'muted'].includes(name)) type = 'status';
          else if (['cpu', 'memory', 'network', 'disk', 'cache'].includes(name)) type = 'metric';
          else type = 'surface';

          // Map to CSS properties
          const properties: string[] = [`--fw-${name}`];
          if (type === 'brand') properties.push('color', 'border-color', 'box-shadow');
          if (type === 'status') properties.push('color', 'background-color', 'border-left-color');
          if (type === 'metric') properties.push('fill', 'stroke', 'background');
          if (type === 'surface') properties.push('background-color', 'border-color');

          // Map to Bun APIs used with this token
          const apis: string[] = ['Bun.color()'];
          if (type === 'status') apis.push('styled()', 'log.*()');
          if (name === 'primary') apis.push('colorBar()', 'Bun.color(hex,"ansi")');
          if (type === 'metric') apis.push('sparkline', 'Bun.inspect.table()');

          // Naming conventions (case variants)
          const kebab = `fw-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          const camel = `fw${name[0].toUpperCase()}${name.slice(1)}`;
          const screaming = `FW_${name.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
          const pascal = `Fw${name[0].toUpperCase()}${name.slice(1)}`;
          const cases = { camelCase: camel, 'kebab-case': kebab, SCREAMING_SNAKE: screaming, PascalCase: pascal };

          // Bun.color uppercase HEX
          const HEX = Bun.color(hex, 'HEX')!;

          return { name, type, hex, HEX, hsl, rgb, rgba, number: num, css, properties, apis, case: cases };
        });

        return Response.json({ palette: tokens, count: tokens.length });
      }

      // ---- S3 ROUTES (Bun.s3 / S3Client native) ---------------------------

      // /s3/list?prefix=&maxKeys= → List objects in bucket
      if (url.pathname === '/s3/list') {
        try {
          const { S3Client } = await import("bun");
          const client = new S3Client({});          // reads S3_*/AWS_* env vars
          const prefix = url.searchParams.get('prefix') || undefined;
          const maxKeys = parseInt(url.searchParams.get('maxKeys') || '50', 10);
          const result = await client.list({ prefix, maxKeys });
          return Response.json({
            count: result.contents?.length ?? 0,
            truncated: result.isTruncated ?? false,
            objects: (result.contents ?? []).map((o: any) => ({
              key: o.key,
              size: o.size,
              etag: o.etag,
              lastModified: o.lastModified,
            })),
          });
        } catch (e: any) {
          return Response.json({ error: e.message, code: e.code }, { status: 500 });
        }
      }

      // /s3/read?key= → Read object as text (or stream for binary)
      if (url.pathname === '/s3/read') {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'key param required' }, { status: 400 });
        try {
          const file = Bun.s3(key);
          const exists = await file.exists();
          if (!exists) return Response.json({ error: `Object not found: ${key}` }, { status: 404 });
          const stat = await file.stat();
          const text = await file.text();
          return Response.json({
            key, size: stat.size, etag: stat.etag, type: stat.type,
            content: text.length > 8192 ? text.slice(0, 8192) + '…(truncated)' : text,
          });
        } catch (e: any) {
          return Response.json({ error: e.message, code: e.code }, { status: 500 });
        }
      }

      // /s3/write?key= (POST body → S3 object)
      if (url.pathname === '/s3/write') {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'key param required' }, { status: 400 });
        if (req.method !== 'POST' && req.method !== 'PUT') {
          return Response.json({ error: 'POST or PUT required' }, { status: 405 });
        }
        try {
          const body = await req.text();
          const file = Bun.s3(key);
          const bytes = await file.write(body, { type: req.headers.get('content-type') || 'text/plain' });
          return Response.json({ key, written: bytes, size: `${bytes} bytes` });
        } catch (e: any) {
          return Response.json({ error: e.message, code: e.code }, { status: 500 });
        }
      }

      // /s3/delete?key= → Delete object
      if (url.pathname === '/s3/delete') {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'key param required' }, { status: 400 });
        try {
          const file = Bun.s3(key);
          await file.delete();
          return Response.json({ key, deleted: true });
        } catch (e: any) {
          return Response.json({ error: e.message, code: e.code }, { status: 500 });
        }
      }

      // /s3/presign?key=&method=&expiresIn= → Generate presigned URL
      if (url.pathname === '/s3/presign') {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'key param required' }, { status: 400 });
        try {
          const method = (url.searchParams.get('method') || 'GET') as 'GET' | 'PUT' | 'DELETE';
          const expiresIn = parseInt(url.searchParams.get('expiresIn') || '3600', 10);
          const file = Bun.s3(key);
          const presigned = file.presign({ method, expiresIn });
          return Response.json({ key, method, expiresIn: `${expiresIn}s`, url: presigned });
        } catch (e: any) {
          return Response.json({ error: e.message, code: e.code }, { status: 500 });
        }
      }

      // /s3/stat?key= → Object metadata (size, etag, type)
      if (url.pathname === '/s3/stat') {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'key param required' }, { status: 400 });
        try {
          const file = Bun.s3(key);
          const exists = await file.exists();
          if (!exists) return Response.json({ error: `Object not found: ${key}` }, { status: 404 });
          const stat = await file.stat();
          return Response.json({ key, size: stat.size, etag: stat.etag, type: stat.type });
        } catch (e: any) {
          return Response.json({ error: e.message, code: e.code }, { status: 500 });
        }
      }

      // /color?hex= → Bun.color() converter (all 10+ output formats)
      if (url.pathname === '/color') {
        const hex = url.searchParams.get('hex') || '#3b82f6';
        const safeHex = hex.startsWith('#') ? hex : `#${hex}`;
        try {
          const result = {
            input: safeHex,
            css: Bun.color(safeHex, 'css'),
            hex: Bun.color(safeHex, 'hex'),
            hsl: Bun.color(safeHex, 'hsl'),
            rgb: Bun.color(safeHex, 'rgb'),
            lab: Bun.color(safeHex, 'lab'),
            number: Bun.color(safeHex, 'number'),
            '{rgba}': Bun.color(safeHex, '{rgba}'),
            ansi_16m: Bun.color(safeHex, 'ansi_16m'),
            ansi_256: Bun.color(safeHex, 'ansi_256'),
          };
          if (!result.css) throw new Error('Invalid color');
          return Response.json(result);
        } catch {
          return Response.json({
            error: `Invalid color: ${safeHex}`,
            validFormats: ['css', 'hex', 'HEX', 'hsl', 'rgb', 'rgba', 'lab', 'number', '{rgba}', '[rgba]', 'ansi', 'ansi_16m', 'ansi_256'],
          }, { status: 400 });
        }
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
      } // end route()
    },

    // WebSocket — live heap stream (push every 1s)
    websocket: {
      open(ws) {
        ws.subscribe('heap');
        const h = heapStats();
        ws.send(JSON.stringify({
          type: 'init',
          heap: { heapKiB: +(h.heapSize / 1024).toFixed(0), objects: h.objectCount },
          history: heapHistory,
        }));
      },
      message(ws, msg) {
        // Client can request gc
        if (msg === 'gc') {
          Bun.gc(true);
          const h = heapStats();
          ws.send(JSON.stringify({
            type: 'gc',
            heap: { heapKiB: +(h.heapSize / 1024).toFixed(0), objects: h.objectCount },
          }));
        }
      },
      close() {},
    },
  });

  // Broadcast heap stats to all WS subscribers every second
  setInterval(() => {
    const h = heapStats();
    server.publish('heap', JSON.stringify({
      type: 'tick',
      ts: Date.now(),
      heap: { heapKiB: +(h.heapSize / 1024).toFixed(0), objects: h.objectCount },
      requests: requestCount,
      uptime: `${((Date.now() - startedAt) / 1000).toFixed(0)}s`,
    }));
  }, 1000);

  print(styled('Serving', 'accent') + ` http://localhost:${port}`);
  print(styled('Dashboard:', 'muted') + ` http://localhost:${port}/`);
  print(styled('API index:', 'muted') + ` http://localhost:${port}/api`);
  print(styled('WebSocket:', 'muted') + ` ws://localhost:${port}/ws`);
}

/** HTML dashboard served at GET / */
function dashboardHTML(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CRC32 Cookie Integrator</title>
<style>
  :root{
    /* FactoryWager Design Tokens — synced from lib/theme/colors.ts */
    --fw-primary:#3b82f6;--fw-secondary:#8b5cf6;--fw-accent:#06b6d4;
    --fw-success:#22c55e;--fw-warning:#f59e0b;--fw-error:#ef4444;--fw-muted:#6b7280;
    --fw-background:#1f2937;--fw-highlight:#fbbf24;--fw-info:#60a5fa;
    --fw-cpu:#3b82f6;--fw-memory:#22c55e;--fw-network:#f59e0b;--fw-disk:#8b5cf6;--fw-cache:#06b6d4;
    /* Surfaces */
    --bg:#0d1117;--bg-card:#161b22;--border:#30363d;--text:#c9d1d9;--text-dim:#8b949e;--text-bright:#e6edf3;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--bg);color:var(--text);padding:1rem}
  h1{font-size:1.1rem;color:var(--fw-primary);margin-bottom:.5rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:.75rem;margin-top:.75rem}
  .card{background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:.75rem}
  .card h2{font-size:.85rem;color:var(--text-dim);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.05em}
  pre{font-size:.75rem;white-space:pre-wrap;word-break:break-all;color:var(--text-bright);background:var(--bg);padding:.5rem;border-radius:4px;max-height:200px;overflow-y:auto}
  .sparkline{display:flex;align-items:flex-end;gap:1px;height:40px;margin:.5rem 0}
  .sparkline .bar{background:var(--fw-success);min-width:4px;border-radius:1px 1px 0 0;transition:height .3s}
  .stat{display:inline-block;margin-right:1rem;color:var(--fw-primary);font-size:.8rem}
  .stat span{color:var(--text-dim)}
  button{background:#21262d;color:var(--text);border:1px solid var(--border);padding:.25rem .75rem;border-radius:4px;cursor:pointer;font-family:inherit;font-size:.75rem}
  button:hover{background:var(--border)}
  input{background:var(--bg);color:var(--text);border:1px solid var(--border);padding:.25rem .5rem;border-radius:4px;font-family:inherit;font-size:.75rem;width:100%}
  .row{display:flex;gap:.5rem;margin-bottom:.5rem}
  .ws-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:.4rem}
  .ws-dot.on{background:var(--fw-success)}.ws-dot.off{background:var(--fw-error)}
  .badge{font-size:.65rem;background:var(--border);padding:.1rem .4rem;border-radius:3px;margin-left:.3rem}
  /* Theme table */
  .theme-table{width:100%;border-collapse:collapse;font-size:.7rem;margin-top:.5rem}
  .theme-table th{text-align:left;color:var(--text-dim);font-weight:normal;padding:.2rem .4rem;border-bottom:1px solid var(--border)}
  .theme-table td{padding:.25rem .4rem;border-bottom:1px solid #21262d;vertical-align:middle}
  .swatch{display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:middle;margin-right:.4rem;border:1px solid rgba(255,255,255,.1)}
  .type-badge{font-size:.6rem;padding:.05rem .3rem;border-radius:2px;color:#fff}
  .type-badge.brand{background:var(--fw-primary)}.type-badge.status{background:var(--fw-warning)}
  .type-badge.metric{background:var(--fw-accent)}.type-badge.surface{background:var(--fw-muted)}
  .mono{font-family:inherit;color:var(--fw-accent);font-size:.65rem}
  .card.full{grid-column:1/-1}
  /* Color converter */
  .color-row{display:flex;gap:.5rem;align-items:center;margin-top:.5rem}
  .color-preview{width:48px;height:48px;border-radius:6px;border:1px solid var(--border)}
  .color-formats{font-size:.7rem;line-height:1.6}
  .color-formats span{color:var(--text-dim)}
  /* Tabs */
  .tabs{display:flex;gap:2px;margin-bottom:.5rem}
  .tab{padding:.2rem .6rem;font-size:.7rem;border-radius:3px 3px 0 0;cursor:pointer;background:#21262d;color:var(--text-dim);border:1px solid transparent}
  .tab.active{background:var(--bg-card);color:var(--fw-primary);border-color:var(--border);border-bottom-color:var(--bg-card)}
  .tab-content{display:none}.tab-content.active{display:block}
</style>
</head>
<body>
<h1>CRC32 Cookie Integrator <span class="badge">:${port}</span>
  <span class="ws-dot off" id="ws-status"></span>
  <span style="font-size:.7rem;color:var(--text-dim)" id="ws-label">disconnected</span>
</h1>
<div style="margin:.25rem 0">
  <span class="stat"><span>heap </span><span id="s-heap">—</span></span>
  <span class="stat"><span>objects </span><span id="s-obj">—</span></span>
  <span class="stat"><span>reqs </span><span id="s-req">0</span></span>
  <span class="stat"><span>uptime </span><span id="s-up">0s</span></span>
</div>
<div class="sparkline" id="sparkline"></div>

<div class="grid">
  <!-- THEME REFERENCE (full-width) -->
  <div class="card full">
    <h2>FactoryWager Design System</h2>
    <div class="tabs">
      <div class="tab active" onclick="switchTab('palette')">Palette</div>
      <div class="tab" onclick="switchTab('converter')">Bun.color()</div>
      <div class="tab" onclick="switchTab('apis')">API Map</div>
    </div>
    <div class="tab-content active" id="tab-palette">
      <table class="theme-table" id="theme-table">
        <tr><th>Token</th><th>Type</th><th>Hex</th><th>HEX</th><th>HSL</th><th>Case</th><th>CSS Custom Prop</th><th>Properties</th><th>Bun APIs</th></tr>
      </table>
    </div>
    <div class="tab-content" id="tab-converter">
      <div class="row"><input id="clr-hex" placeholder="#3b82f6" value="#3b82f6"><button onclick="doColor()">Convert</button></div>
      <div class="color-row">
        <div class="color-preview" id="clr-preview" style="background:#3b82f6"></div>
        <div class="color-formats" id="clr-out">Click Convert to see all formats via Bun.color()</div>
      </div>
    </div>
    <div class="tab-content" id="tab-apis">
      <table class="theme-table">
        <tr><th>Bun API</th><th>Used For</th><th>Tokens</th></tr>
        <tr><td class="mono">Bun.color(hex, 'css')</td><td>hex to CSS rgb()</td><td>all</td></tr>
        <tr><td class="mono">Bun.color(hex, 'ansi')</td><td>terminal color escape</td><td>all (styled())</td></tr>
        <tr><td class="mono">Bun.color(hex, 'number')</td><td>numeric 0xRRGGBB</td><td>all</td></tr>
        <tr><td class="mono">Bun.color(hex, {type:'rgba'})</td><td>rgba object {r,g,b,a}</td><td>all</td></tr>
        <tr><td class="mono">Bun.color('reset', 'ansi')</td><td>reset terminal color</td><td>n/a</td></tr>
        <tr><td class="mono">Bun.inspect.table()</td><td>metric tables</td><td>metric tokens</td></tr>
        <tr><td class="mono">Bun.nanoseconds()</td><td>bench timing</td><td>sparkline color</td></tr>
        <tr><td class="mono">heapStats()</td><td>heap sparkline</td><td>success (bar)</td></tr>
        <tr><td class="mono">Bun.hash.crc32()</td><td>content hash</td><td>n/a</td></tr>
        <tr><td class="mono">WebSocket</td><td>live heap stream</td><td>ws-dot success/error</td></tr>
      </table>
    </div>
  </div>

  <div class="card">
    <h2>Sign &amp; Verify</h2>
    <div class="row"><input id="c-name" placeholder="name" value="session"><input id="c-val" placeholder="value" value="abc"></div>
    <div class="row"><button onclick="doSign()">Sign</button><button onclick="doVerify()">Verify</button></div>
    <pre id="c-out">—</pre>
  </div>

  <div class="card">
    <h2>AB Bucket</h2>
    <div class="row"><input id="ab-user" placeholder="userId" value="user123"><input id="ab-exp" placeholder="expId" value="landing"></div>
    <button onclick="doAB()">Bucket</button>
    <pre id="ab-out">—</pre>
  </div>

  <div class="card">
    <h2>Hash Shootout</h2>
    <input id="h-input" placeholder="input string" value="hello">
    <button onclick="doHash()" style="margin-top:.25rem">Hash All</button>
    <pre id="h-out">—</pre>
  </div>

  <div class="card">
    <h2>Compress</h2>
    <input id="z-input" placeholder="data to compress" value='{"cookie":"session=abc","variant":"A"}'>
    <button onclick="doCompress()" style="margin-top:.25rem">Compare</button>
    <pre id="z-out">—</pre>
  </div>

  <div class="card">
    <h2>UUID v7</h2>
    <button onclick="doUUID()">Generate</button>
    <pre id="uuid-out">—</pre>
  </div>

  <div class="card">
    <h2>Flaky Detector</h2>
    <input id="f-code" placeholder="code snippet" value="types.slice(0,5).sort()">
    <button onclick="doFlaky()" style="margin-top:.25rem">Check</button>
    <pre id="f-out">—</pre>
  </div>

  <div class="card">
    <h2>Heap &amp; GC</h2>
    <div class="row"><button onclick="doHeap()">Heap Stats</button><button onclick="doGC()">Force GC</button></div>
    <pre id="heap-out">—</pre>
  </div>

  <div class="card">
    <h2>Object Types</h2>
    <button onclick="doTypes()">Load</button>
    <pre id="types-out">—</pre>
  </div>

  <div class="card">
    <h2>S3 <span class="badge">Bun.s3</span></h2>
    <div class="row"><input id="s3-key" placeholder="path/to/object.json" value="cookies/test.json"></div>
    <div class="row">
      <button onclick="doS3List()">List</button>
      <button onclick="doS3Read()">Read</button>
      <button onclick="doS3Stat()">Stat</button>
      <button onclick="doS3Presign()">Presign</button>
    </div>
    <div class="row">
      <input id="s3-body" placeholder='{"key":"value"}' value='{"signed":"session=abc|D9D2E670"}'>
    </div>
    <div class="row">
      <button onclick="doS3Write()">Write</button>
      <button onclick="doS3Delete()" style="color:var(--fw-error)">Delete</button>
    </div>
    <pre id="s3-out">—</pre>
  </div>
</div>

<script>
const $ = id => document.getElementById(id);
const api = path => fetch(path).then(r => r.json());
const show = (id, obj) => $(id).textContent = JSON.stringify(obj, null, 2);

// Tab switching
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  $('tab-' + name).classList.add('active');
}

// Load theme table from /theme API
async function loadTheme() {
  const { palette } = await api('/theme');
  const tbody = $('theme-table');
  palette.forEach(t => {
    const tr = document.createElement('tr');
    const c = t.case || {};
    const caseStr = Object.entries(c).map(([k,v]) => '<span style="color:var(--text-dim)">'+k+':</span> '+v).join('<br>');
    tr.innerHTML = '<td><span class="swatch" style="background:'+t.hex+'"></span>'+t.name+'</td>'
      + '<td><span class="type-badge '+t.type+'">'+t.type+'</span></td>'
      + '<td class="mono">'+t.hex+'</td>'
      + '<td class="mono">'+t.HEX+'</td>'
      + '<td class="mono">'+t.hsl+'</td>'
      + '<td style="font-size:.6rem;line-height:1.4">'+caseStr+'</td>'
      + '<td class="mono">'+t.css+'</td>'
      + '<td style="font-size:.6rem">'+t.properties.join(', ')+'</td>'
      + '<td style="font-size:.6rem">'+t.apis.join(', ')+'</td>';
    tbody.appendChild(tr);
  });
}
loadTheme();

// Color converter
async function doColor() {
  const hex = $('clr-hex').value;
  $('clr-preview').style.background = hex;
  try {
    const r = await api('/color?hex=' + encodeURIComponent(hex));
    $('clr-out').innerHTML = '<span>input:</span> ' + r.input
      + '\\n<span>css:</span>    ' + r.css
      + '\\n<span>ansi:</span>   ' + (r.ansi ? r.ansi.replace(/\\x1b/g, '\\\\x1b') : '(escape sequence)')
      + '\\n<span>number:</span> ' + r.number
      + '\\n<span>rgba:</span>   ' + JSON.stringify(r.rgba);
  } catch(e) { $('clr-out').textContent = 'Error: ' + e.message; }
}

// WebSocket
let ws;
function connectWS() {
  ws = new WebSocket('ws://localhost:${port}/ws');
  ws.onopen = () => { $('ws-status').className='ws-dot on'; $('ws-label').textContent='live'; };
  ws.onclose = () => { $('ws-status').className='ws-dot off'; $('ws-label').textContent='reconnecting...'; setTimeout(connectWS, 2000); };
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.type === 'init' || d.type === 'tick') {
      const h = d.heap || {};
      $('s-heap').textContent = h.heapKiB + ' KiB';
      $('s-obj').textContent = String(h.objects);
      if (d.requests !== undefined) $('s-req').textContent = String(d.requests);
      if (d.uptime) $('s-up').textContent = d.uptime;
      if (d.type === 'init' && d.history) { sparkData = d.history.map(x => x.heapKiB); }
      else { sparkData.push(h.heapKiB); if (sparkData.length > 60) sparkData.shift(); }
      renderSparkline();
    }
    if (d.type === 'gc') { $('s-heap').textContent = d.heap.heapKiB + ' KiB'; $('s-obj').textContent = String(d.heap.objects); }
  };
}
let sparkData = [];
function renderSparkline() {
  const max = Math.max(...sparkData, 1);
  $('sparkline').innerHTML = sparkData.map(v =>
    '<div class="bar" style="height:' + Math.max(2, v / max * 40) + 'px"></div>'
  ).join('');
}
connectWS();

// API calls
async function doSign() {
  const r = await api('/sign?name=' + encodeURIComponent($('c-name').value) + '&value=' + encodeURIComponent($('c-val').value));
  show('c-out', r);
}
async function doVerify() {
  const signed = await api('/sign?name=' + encodeURIComponent($('c-name').value) + '&value=' + encodeURIComponent($('c-val').value));
  const r = await api('/verify?cookie=' + encodeURIComponent(signed.cookie));
  show('c-out', r);
}
async function doAB() {
  const r = await api('/ab?userId=' + encodeURIComponent($('ab-user').value) + '&expId=' + encodeURIComponent($('ab-exp').value));
  show('ab-out', r);
}
async function doHash() {
  const r = await api('/hash?input=' + encodeURIComponent($('h-input').value));
  show('h-out', r);
}
async function doCompress() {
  const r = await api('/compress?data=' + encodeURIComponent($('z-input').value));
  show('z-out', r);
}
async function doUUID() { show('uuid-out', await api('/uuid')); }
async function doFlaky() {
  const r = await api('/deterministic-check?code=' + encodeURIComponent($('f-code').value));
  show('f-out', r);
}
async function doHeap() { show('heap-out', await api('/heap')); }
async function doGC() { if(ws) ws.send('gc'); show('heap-out', await api('/heap/gc')); }
async function doTypes() {
  const r = await api('/heap');
  const types = r.objectTypeCounts || {};
  const sorted = Object.entries(types).sort((a,b) => (b[1]) - (a[1])).slice(0, 20);
  $('types-out').textContent = sorted.map(([k,v]) => k.padEnd(30) + String(v)).join('\\n');
}
// S3
async function doS3List() {
  const prefix = $('s3-key').value.split('/').slice(0, -1).join('/');
  show('s3-out', await api('/s3/list?prefix=' + encodeURIComponent(prefix)));
}
async function doS3Read() { show('s3-out', await api('/s3/read?key=' + encodeURIComponent($('s3-key').value))); }
async function doS3Stat() { show('s3-out', await api('/s3/stat?key=' + encodeURIComponent($('s3-key').value))); }
async function doS3Presign() { show('s3-out', await api('/s3/presign?key=' + encodeURIComponent($('s3-key').value))); }
async function doS3Write() {
  const r = await fetch('/s3/write?key=' + encodeURIComponent($('s3-key').value), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: $('s3-body').value,
  }).then(r => r.json());
  show('s3-out', r);
}
async function doS3Delete() {
  if (!confirm('Delete ' + $('s3-key').value + '?')) return;
  show('s3-out', await api('/s3/delete?key=' + encodeURIComponent($('s3-key').value)));
}
</script>
</body>
</html>`;
}

/** Interactive REPL: read cookies from stdin, verify each line */
async function cmdInteractive(): Promise<void> {
  console.log(styled('Interactive mode', 'accent') + ' — paste cookies to verify (one per line, Ctrl+D to exit)');
  for await (const line of console) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    cmdVerify(trimmed);
  }
}

function cmdAb(userId: string, experimentId: string, config: CookieConfig, forcedVariant?: string): void {
  // Env var overrides YAML config; YAML secret must not be null in production
  const secret = Bun.env.COOKIE_SECRET || config.cookie.secret || 'dev-secret-minimum-32-bytes-long-here-123';
  const manager = new SecureVariantManager({
    secretKey: secret,
    cookieName: config.cookie.name,
    expiresDays: config.cookie.maxAgeDays,
  });

  const variant = forcedVariant || manager.assignVariant(userId, experimentId);
  const header = manager.createVariantCookie(variant, experimentId);

  print(styled(`Variant: ${variant}`, 'accent') + (forcedVariant ? ' (forced)' : ` (deterministic)`));
  print(`Set-Cookie: ${header}`);
}

// ============================================================================
// S3 OPERATIONS (Bun.s3 native — s3:// protocol + S3Client)
// ============================================================================

async function cmdS3(action: string, args: string[]): Promise<void> {
  switch (action) {
    case 'ls':
    case 'list': {
      const { S3Client } = await import("bun");
      const client = new S3Client({});
      const prefix = args[0] || '';
      const result = await client.list({ prefix, maxKeys: 100 });
      const objects = result.contents ?? [];
      if (objects.length === 0) {
        print(styled('No objects found', 'warning') + (prefix ? ` with prefix "${prefix}"` : ''));
        return;
      }
      print(styled(`${objects.length} objects`, 'accent') + (result.isTruncated ? ' (truncated)' : ''));
      const rows = objects.map((o: any) => ({
        key: o.key,
        size: o.size < 1024 ? `${o.size} B` : `${(o.size / 1024).toFixed(1)} KiB`,
        modified: new Date(o.lastModified).toISOString().slice(0, 19),
      }));
      console.log(Bun.inspect.table(rows, ['key', 'size', 'modified']));
      break;
    }

    case 'read':
    case 'cat': {
      const key = args[0];
      if (!key) { console.error('Usage: s3 read <key>'); process.exit(1); }
      const file = Bun.s3(key);
      if (!await file.exists()) { console.error(`Not found: ${key}`); process.exit(1); }
      const text = await file.text();
      console.log(text);
      break;
    }

    case 'write':
    case 'put': {
      const key = args[0];
      const data = args[1];
      if (!key || !data) { console.error('Usage: s3 write <key> <data|@file>'); process.exit(1); }
      const file = Bun.s3(key);
      // Support @filepath to upload a local file via s3:// protocol
      if (data.startsWith('@')) {
        const local = Bun.file(data.slice(1));
        if (!await local.exists()) { console.error(`Local file not found: ${data.slice(1)}`); process.exit(1); }
        const bytes = await file.write(await local.arrayBuffer());
        print(styled('Uploaded', 'success') + ` ${key} (${bytes} bytes from ${data.slice(1)})`);
      } else {
        const bytes = await file.write(data);
        print(styled('Written', 'success') + ` ${key} (${bytes} bytes)`);
      }
      break;
    }

    case 'rm':
    case 'delete': {
      const key = args[0];
      if (!key) { console.error('Usage: s3 delete <key>'); process.exit(1); }
      await Bun.s3(key).delete();
      print(styled('Deleted', 'error') + ` ${key}`);
      break;
    }

    case 'stat': {
      const key = args[0];
      if (!key) { console.error('Usage: s3 stat <key>'); process.exit(1); }
      const file = Bun.s3(key);
      if (!await file.exists()) { console.error(`Not found: ${key}`); process.exit(1); }
      const stat = await file.stat();
      console.log(Bun.inspect.table([{
        key,
        size: stat.size < 1024 ? `${stat.size} B` : `${(stat.size / 1024).toFixed(1)} KiB`,
        etag: stat.etag,
        type: stat.type,
      }], ['key', 'size', 'etag', 'type']));
      break;
    }

    case 'presign': {
      const key = args[0];
      if (!key) { console.error('Usage: s3 presign <key> [method] [expiresIn]'); process.exit(1); }
      const method = (args[1] || 'GET') as 'GET' | 'PUT';
      const expiresIn = parseInt(args[2] || '3600', 10);
      const presigned = Bun.s3(key).presign({ method, expiresIn });
      print(styled('Presigned URL', 'accent') + ` (${method}, ${expiresIn}s):`);
      console.log(presigned);
      break;
    }

    case 'backup': {
      // Export signed cookies to S3 as JSONL
      const prefix = args[0] || `cookies/backup-${new Date().toISOString().slice(0, 10)}`;
      const key = `${prefix}.jsonl`;
      const config = await configPromise;
      const cookies = config.ab.defaultVariants.map((v, i) => {
        const signed = signCookie(`ab_exp${i}`, v);
        return JSON.stringify({ variant: v, cookie: signed, ts: Date.now() });
      });
      const file = Bun.s3(key);
      await file.write(cookies.join('\n') + '\n', { type: 'application/x-ndjson' });
      print(styled('Backed up', 'success') + ` ${cookies.length} cookies → s3://${key}`);
      break;
    }

    case 'fetch': {
      // Fetch an S3 object via the s3:// protocol (like Bun.file("s3://..."))
      const key = args[0];
      if (!key) { console.error('Usage: s3 fetch <key>'); process.exit(1); }
      const s3url = key.startsWith('s3://') ? key : `s3://${key}`;
      const response = await fetch(s3url);
      if (!response.ok) { console.error(`Fetch failed: ${response.status} ${response.statusText}`); process.exit(1); }
      const text = await response.text();
      console.log(text);
      break;
    }

    default:
      console.log(`
${styled('S3 Operations', 'accent')} (Bun.s3 native)

  s3 ls [prefix]                 List objects
  s3 read <key>                  Read object content
  s3 write <key> <data|@file>    Write data or upload file
  s3 rm <key>                    Delete object
  s3 stat <key>                  Show size, etag, type
  s3 presign <key> [method] [s]  Generate presigned URL
  s3 backup [prefix]             Export cookies to S3 JSONL
  s3 fetch <key|s3://bucket/key> Fetch via s3:// protocol

Env: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
     S3_BUCKET, S3_REGION, S3_ENDPOINT
`);
  }
}

// ============================================================================
// CLI ENTRY
// ============================================================================

function usage(): void {
  console.log(`
${styled('CRC32 Cookie Integrator', 'accent')}
${colorBar('primary', 30)}

Usage: bun run cookie-crc32-integrator.ts <command> [args]

Commands:
  wiki                        Generate markdown wiki documentation
  wiki --full                 Generate full wiki via wiki-generator pipeline
  benchmark [--export]        Run CRC32 and cookie performance benchmarks
  create <name> <value>       Create a signed cookie
  verify "<cookie>"           Verify a signed cookie
  ab <userId> <expId> [variant]  Deterministic AB variant cookie
  config                      Show loaded YAML configuration
  serve [port]                Start diagnostic dashboard (default :3026)
  s3 <action> [args]          S3 operations (ls/read/write/rm/stat/presign/backup/fetch)
  interactive                 Verify cookies from stdin (one per line)

Examples:
  bun run cookie-crc32-integrator.ts wiki
  bun run cookie-crc32-integrator.ts wiki --full
  bun run cookie-crc32-integrator.ts benchmark
  bun run cookie-crc32-integrator.ts create session abc
  bun run cookie-crc32-integrator.ts verify "session=abc|A9B34F21"
  bun run cookie-crc32-integrator.ts ab user123 exp A
  bun run cookie-crc32-integrator.ts s3 ls cookies/
  bun run cookie-crc32-integrator.ts s3 write cookies/test.json '{"v":"A"}'
  bun run cookie-crc32-integrator.ts s3 read cookies/test.json
  echo "session=abc|D9D2E670" | bun run cookie-crc32-integrator.ts interactive
`);
}

if (import.meta.path === Bun.main) {
  const MIN_BUN = ">=1.3.7";
  if (!Bun.semver.satisfies(Bun.version, MIN_BUN)) {
    console.error(`[cookie-crc32] Bun ${Bun.version} (${Bun.revision.slice(0, 12)}) < ${MIN_BUN} — upgrade required`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const command = args[0];

  // Config was fired eagerly at import time.
  // peek(settled) returns the value; peek(pending) returns the promise.
  const peeked = peek(configPromise);
  const config: CookieConfig = peeked === configPromise
    ? await configPromise
    : peeked as CookieConfig;

  switch (command) {
    case 'wiki':
      await cmdWiki(args.includes('--full'));
      break;

    case 'benchmark':
      await cmdBenchmark(args.includes('--export'));
      break;

    case 'create': {
      const name = args[1];
      const value = args[2];
      if (!name || !value) {
        console.error('Usage: create <name> <value>');
        process.exit(1);
      }
      cmdCreate(name, value, config);
      break;
    }

    case 'verify': {
      const cookie = args[1];
      if (!cookie) {
        console.error('Usage: verify "<name=value|crc32hex>"');
        process.exit(1);
      }
      cmdVerify(cookie);
      break;
    }

    case 'ab': {
      const userId = args[1];
      const experimentId = args[2];
      if (!userId || !experimentId) {
        console.error('Usage: ab <userId> <experimentId> [variant]');
        process.exit(1);
      }
      cmdAb(userId, experimentId, config, args[3]);
      break;
    }

    case 'config':
      await cmdConfig(config);
      break;

    case 'serve':
      await cmdServe(args[1] ? parseInt(args[1], 10) : 3026);
      break;

    case 'interactive':
      await cmdInteractive();
      break;

    case 's3':
      await cmdS3(args[1] || 'help', args.slice(2));
      break;

    default:
      usage();
      break;
  }
}

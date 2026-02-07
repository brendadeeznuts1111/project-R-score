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
  const { estimateShallowMemoryUsageOf } = await import("bun:jsc");
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
  const { serialize, deserialize } = await import("bun:jsc");
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

function cmdConfig(config: CookieConfig): void {
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
    { Key: 'Bun.which("bun")', Value: Bun.which("bun") || '(not found)' },
    { Key: 'Bun.which("hyperfine")', Value: Bun.which("hyperfine") || '(not found)' },
    { Key: 'Bun.which("open")', Value: Bun.which("open") || '(not found)' },
  ], ['Key', 'Value']));
  console.log(Bun.inspect(config, { depth: 4, colors: true, compact: false }));
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
  interactive                 Verify cookies from stdin (one per line)

Examples:
  bun run cookie-crc32-integrator.ts wiki
  bun run cookie-crc32-integrator.ts wiki --full
  bun run cookie-crc32-integrator.ts benchmark
  bun run cookie-crc32-integrator.ts create session abc
  bun run cookie-crc32-integrator.ts verify "session=abc|A9B34F21"
  bun run cookie-crc32-integrator.ts ab user123 exp A
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
      cmdConfig(config);
      break;

    case 'interactive':
      await cmdInteractive();
      break;

    default:
      usage();
      break;
  }
}

// cookie-crc32-integrator.ts — CRC32 cookie signing, verification, AB testing, and wiki CLI
// Usage: bun run cookie-crc32-integrator.ts <command> [args]

import { crc32, verify, toHex, benchmark, runBenchmarks } from './lib/core/crc32';
import { styled, FW_COLORS, log, colorBar } from './lib/theme/colors';

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
    const mod = await import(`./configs/cookie-crc32/${env}.yaml`);
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

  return { valid: actual === expected, payload, expected, actual };
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

    const payload: VariantPayload = { v: variant, s: signature, t: timestamp };
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
      if (parsed.s !== expectedSig) return { valid: false };

      // Reject if older than maxAge
      if (Date.now() - parsed.t > this.maxAge * 1000) return { valid: false };

      return { valid: true, variant: parsed.v };
    } catch {
      return { valid: false };
    }
  }
}

// ============================================================================
// COMMANDS
// ============================================================================

async function cmdWiki(): Promise<void> {
  // Run a quick benchmark for live numbers
  const small = benchmark(1);
  const large = benchmark(1024);

  const wiki = `# CRC32 Cookie Integrator — Wiki

## Overview

A single-file CLI that integrates hardware-accelerated CRC32 hashing with
cookie signing, verification, and deterministic AB testing.

## Hardware Acceleration

Bun.hash.crc32 delegates to CPU-native instructions:

| Architecture | Instruction   | Throughput        |
|-------------|---------------|-------------------|
| x86/x64     | PCLMULQDQ     | ${large.throughput.trim()} (1MB) |
| ARM64       | CRC32         | native speed      |

This is **not** a software lookup table — it runs on dedicated silicon,
achieving ~10 GB/s on modern hardware.

## Cookie Signing Protocol

\`\`\`
Sign:   crc32("name=value") → hex
Cookie: "name=value|hex"
Verify: split on last "|", recompute CRC32, compare
\`\`\`

- Fast (~${small.opsPerSecond.toLocaleString()} sign ops/sec for small payloads)
- Deterministic — same input always produces same checksum
- **Not cryptographic** — use for integrity checks, not secrets

## AB Testing Integration

**Bucketing:** CRC32-based deterministic assignment
\`crc32(userId + experimentId) % 2\` → A or B

**Cookie format (aligned with barbershop cookie-security-v3.26):**
\`\`\`
Name:  ab_variant_<experiment>
Value: URL-encoded JSON { v: variant, s: hmac-sha256-sig, t: timestamp }
\`\`\`

- HMAC-SHA256 signed (cryptographic integrity)
- Timestamp-bound (rejects expired cookies)
- Compatible with SecureVariantManager from barbershop module

## CLI Reference

| Action        | Command                                          |
|--------------|--------------------------------------------------|
| Wiki         | \`bun run cookie-crc32-integrator.ts wiki\`        |
| Benchmark    | \`bun run cookie-crc32-integrator.ts benchmark\`   |
| Create cookie| \`bun run cookie-crc32-integrator.ts create <n> <v>\`|
| Verify cookie| \`bun run cookie-crc32-integrator.ts verify "<c>"\` |
| AB variant   | \`bun run cookie-crc32-integrator.ts ab <u> <e> [v]\`|

## Performance

| Size  | Time (ms) | Throughput    | Ops/sec         |
|-------|-----------|---------------|-----------------|
| ${small.size.padEnd(5)} | ${small.timeMs.toFixed(3).padStart(9)} | ${small.throughput.padStart(13)} | ${small.opsPerSecond.toLocaleString().padStart(15)} |
| ${large.size.padEnd(5)} | ${large.timeMs.toFixed(3).padStart(9)} | ${large.throughput.padStart(13)} | ${large.opsPerSecond.toLocaleString().padStart(15)} |
`;

  console.log(wiki);
}

async function cmdBenchmark(): Promise<void> {
  await runBenchmarks();

  // Cookie-specific benchmarks
  console.log('\n' + styled('Cookie Operations', 'accent'));
  console.log('--------|-----------|----------');
  console.log('Op      | Time (ms) | Ops/sec');
  console.log('--------|-----------|----------');

  // Sign benchmark
  const signIterations = 100_000;
  const signStart = performance.now();
  for (let i = 0; i < signIterations; i++) {
    signCookie('session', `value${i}`);
  }
  const signMs = performance.now() - signStart;
  const signAvg = signMs / signIterations;
  const signOps = Math.floor(1000 / signAvg);
  console.log(`Sign    | ${signAvg.toFixed(3).padStart(9)} | ${signOps.toLocaleString()}`);

  // Verify benchmark
  const cookie = signCookie('session', 'testvalue');
  const verifyStart = performance.now();
  for (let i = 0; i < signIterations; i++) {
    verifyCookie(cookie);
  }
  const verifyMs = performance.now() - verifyStart;
  const verifyAvg = verifyMs / signIterations;
  const verifyOps = Math.floor(1000 / verifyAvg);
  console.log(`Verify  | ${verifyAvg.toFixed(3).padStart(9)} | ${verifyOps.toLocaleString()}`);

  console.log('--------|-----------|----------');
}

function cmdCreate(name: string, value: string, config: CookieConfig): void {
  const signed = signCookie(name, value);
  const maxAge = config.cookie.maxAgeDays * 24 * 60 * 60;
  const flags = [
    config.cookie.httpOnly ? 'HttpOnly' : '',
    config.cookie.secure ? 'Secure' : '',
    `SameSite=${config.cookie.sameSite.charAt(0).toUpperCase() + config.cookie.sameSite.slice(1)}`,
    config.cookie.domain !== 'localhost' ? `Domain=${config.cookie.domain}` : '',
    `Max-Age=${maxAge}`,
  ].filter(Boolean).join('; ');
  const header = `Set-Cookie: ${signed}; ${flags}`;
  console.log(styled('Signed cookie:', 'success'));
  console.log(header);
}

function cmdVerify(cookie: string): void {
  const result = verifyCookie(cookie);

  if (result.valid) {
    console.log(styled('Valid', 'success') + ` — payload: ${result.payload}`);
  } else {
    console.log(styled('Invalid', 'error') + ` — payload: ${result.payload}`);
    console.log(`  expected: ${result.expected}`);
    console.log(`  actual:   ${result.actual}`);
  }
}

function cmdConfig(config: CookieConfig): void {
  const env = Bun.env.NODE_ENV || 'development';
  console.log(styled(`Config: ${env}`, 'accent') + ` (configs/cookie-crc32/${env}.yaml)`);
  console.log(config);
  console.log(styled('\nTip:', 'muted') + ' Use bun --console-depth 4 for full nesting');
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

  console.log(styled(`Variant: ${variant}`, 'accent') + (forcedVariant ? ' (forced)' : ` (deterministic)`));
  console.log(`Set-Cookie: ${header}`);
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
  benchmark                   Run CRC32 and cookie performance benchmarks
  create <name> <value>       Create a signed cookie
  verify "<cookie>"           Verify a signed cookie
  ab <userId> <expId> [variant]  Deterministic AB variant cookie
  config                      Show loaded YAML configuration
  interactive                 Verify cookies from stdin (one per line)

Examples:
  bun run cookie-crc32-integrator.ts wiki
  bun run cookie-crc32-integrator.ts benchmark
  bun run cookie-crc32-integrator.ts create session abc
  bun run cookie-crc32-integrator.ts verify "session=abc|A9B34F21"
  bun run cookie-crc32-integrator.ts ab user123 exp A
  echo "session=abc|D9D2E670" | bun run cookie-crc32-integrator.ts interactive
`);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];
  const config = await loadConfig();

  switch (command) {
    case 'wiki':
      await cmdWiki();
      break;

    case 'benchmark':
      await cmdBenchmark();
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

#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout — AbortSignal.timeout
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — server-only port precedence
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/bundler/loaders#toml — Bun.TOML.parse
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * domain-sweep.ts — full-surface verification sweep (read-only against the edge).
 *
 * Planes:
 *   surfaces   — every host in config/surfaces.toml, status-aware (live/vanity/retired)
 *   portal     — all PORTAL_HTML_ROUTES (200 public or 302 Access, never 404/HTML fallback)
 *   registry   — every public/registry/*.json: live-fetch, JSON-parse, sha256 vs local
 *   glossary   — live domain-glossary sections all titled (schema v3)
 *   api        — Functions contracts (/api/health, /api/env, /api/skills, well-known)
 *   gates      — subprocess: verify:pages-edge · validate:colors · glossary:verify ·
 *                telegram:verify · snapshot:live:quick · docs:native:check
 *
 *   bun run sweep:domain            # full sweep
 *   bun run sweep:domain -- --fast  # network probes only (no subprocess gates)
 *   bun run sweep:domain -- --json  # machine report
 *   bun run sweep:domain -- --help  # options (no network work)
 *
 * Artifacts (gitignored): reports/domain-sweep-latest.json + reports/domain-sweep.jsonl
 */

import { logTable } from '../lib/console-depth.ts';
import { captureProcess, summarizeProcessOutput } from '../lib/harness/process-capture.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('sweep:domain', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const FAST = argv.includes('--fast');
const JSON_MODE = argv.includes('--json');
const NO_WRITE = argv.includes('--no-write');

const DEFAULT_PAGES_ORIGIN = 'https://project-r-score.pages.dev';
const DEFAULT_SCORE_ORIGIN = 'https://score.factory-wager.com';
const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_GATE_TIMEOUT_MS = 180_000;

export const DOMAIN_SWEEP_ENV = {
  pagesOrigin: 'DOMAIN_SWEEP_PAGES_BASE_URL',
  scoreOrigin: 'DOMAIN_SWEEP_SCORE_BASE_URL',
  fetchTimeoutMs: 'DOMAIN_SWEEP_FETCH_TIMEOUT_MS',
  gateTimeoutMs: 'DOMAIN_SWEEP_GATE_TIMEOUT_MS',
} as const;

export interface DomainSweepConfig {
  pagesOrigin: URL;
  scoreOrigin: URL;
  fetchTimeoutMs: number;
  gateTimeoutMs: number;
}

export interface HttpTargetEvidence {
  href: string;
  protocol: 'http:' | 'https:';
  hostname: string;
  /** Effective TCP port; URL.port is empty when the scheme default applies. */
  port: string;
  explicitPort: string | null;
}

/** Parse the client origin once; path/query/hash belong to individual probes. */
export function parseHttpOrigin(raw: string, envName: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${envName} must be an absolute http(s) URL (received ${JSON.stringify(raw)})`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${envName} protocol must be http: or https: (received ${url.protocol})`);
  }
  if (url.username || url.password) throw new Error(`${envName} must not contain credentials`);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${envName} must be an origin without a path, query, or hash`);
  }
  return url;
}

function parsePositiveMilliseconds(
  raw: string | undefined,
  envName: string,
  fallback: number
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${envName} must be a positive integer in milliseconds`);
  }
  return value;
}

export function resolveDomainSweepConfig(
  env: Record<string, string | undefined> = Bun.env
): DomainSweepConfig {
  const pagesRaw =
    env[DOMAIN_SWEEP_ENV.pagesOrigin]?.trim() ||
    env.PAGES_VERIFY_BASE?.trim() ||
    DEFAULT_PAGES_ORIGIN;
  const scoreRaw = env[DOMAIN_SWEEP_ENV.scoreOrigin]?.trim() || DEFAULT_SCORE_ORIGIN;
  return {
    pagesOrigin: parseHttpOrigin(pagesRaw, DOMAIN_SWEEP_ENV.pagesOrigin),
    scoreOrigin: parseHttpOrigin(scoreRaw, DOMAIN_SWEEP_ENV.scoreOrigin),
    fetchTimeoutMs: parsePositiveMilliseconds(
      env[DOMAIN_SWEEP_ENV.fetchTimeoutMs],
      DOMAIN_SWEEP_ENV.fetchTimeoutMs,
      DEFAULT_FETCH_TIMEOUT_MS
    ),
    gateTimeoutMs: parsePositiveMilliseconds(
      env[DOMAIN_SWEEP_ENV.gateTimeoutMs],
      DOMAIN_SWEEP_ENV.gateTimeoutMs,
      DEFAULT_GATE_TIMEOUT_MS
    ),
  };
}

export function httpTargetEvidence(url: URL): HttpTargetEvidence {
  const protocol = url.protocol;
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`unsupported HTTP target protocol: ${protocol}`);
  }
  return {
    href: url.href,
    protocol,
    hostname: url.hostname,
    port: url.port || (protocol === 'https:' ? '443' : '80'),
    explicitPort: url.port || null,
  };
}

export function resolveHttpTarget(origin: URL, path: string): URL {
  return new URL(path, origin);
}

const USAGE = `Usage: bun run sweep:domain -- [options]

Full-surface domain verification (read-only against the edge).

  --fast      Run network probes only; skip subprocess gates
  --json      Print the machine-readable report
  --no-write  Do not update reports/domain-sweep*.json files
  --help      Show this help without running probes

Environment:
  DOMAIN_SWEEP_PAGES_BASE_URL    Pages client origin (fallback: PAGES_VERIFY_BASE)
  DOMAIN_SWEEP_SCORE_BASE_URL    Score client origin
  DOMAIN_SWEEP_FETCH_TIMEOUT_MS  Per-request timeout (default: 12000)
  DOMAIN_SWEEP_GATE_TIMEOUT_MS   Per-gate timeout (default: 180000)

Client ports come from each URL. BUN_PORT, PORT, and NODE_PORT configure an
omitted Bun.serve port; they do not rewrite fetch targets.`;

type Check = { plane: string; name: string; ok: boolean; detail: string };
const checks: Check[] = [];
const record = (plane: string, name: string, ok: boolean, detail: string) =>
  checks.push({ plane, name, ok, detail });

/** Keep one failed plane from suppressing evidence from every later plane. */
export async function runProbe(
  probe: () => Promise<void>,
  onFailure: (detail: string) => void
): Promise<void> {
  try {
    await probe();
  } catch (error) {
    onFailure(error instanceof Error ? error.message : String(error));
  }
}

/** Empty inventories are missing evidence, never a successful zero-check sweep. */
export function inventoryPassed(total: number, failures: number): boolean {
  return total > 0 && failures === 0;
}

export function summarizeFailures(failures: readonly string[], limit = 5): string {
  if (failures.length === 0) return '';
  const visible = failures.slice(0, limit).join(', ');
  const hidden = failures.length - Math.min(failures.length, limit);
  return `${visible}${hidden > 0 ? `, +${hidden} more` : ''}`;
}

// ── surfaces (config/surfaces.toml SSOT) ────────────────────────────────────
interface SurfaceRow {
  host: string;
  status: string;
  access?: string;
  accessSubpaths?: Array<{ path: string }>;
}

async function probeSurfaces(config: DomainSweepConfig) {
  const toml = Bun.TOML.parse(await Bun.file('config/surfaces.toml').text()) as {
    surfaces: Record<string, SurfaceRow>;
  };
  const surfaces = Object.entries(toml.surfaces);
  if (surfaces.length === 0) {
    record('surfaces', 'inventory', false, '0 surfaces configured');
    return;
  }
  for (const [key, s] of surfaces) {
    const expectGone = s.status === 'retired';
    try {
      const target = new URL(`https://${s.host}/`);
      const res = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.fetchTimeoutMs),
      });
      if (expectGone) {
        record(
          'surfaces',
          key,
          res.status !== 200,
          `${s.host} → ${res.status} (retired, want non-200)`
        );
      } else if (s.status === 'live' && s.access === 'applied') {
        const loc = res.headers.get('location') ?? '';
        record(
          'surfaces',
          key,
          res.status === 302 && loc.includes('cloudflareaccess'),
          `${s.host} → ${res.status} Access`
        );
      } else {
        record('surfaces', key, res.status === 200, `${s.host} → ${res.status}`);
      }
    } catch (e) {
      record(
        'surfaces',
        key,
        expectGone,
        `${s.host} → ${String(e).slice(0, 80)}${expectGone ? ' (retired)' : ''}`
      );
    }
    for (const sub of s.accessSubpaths ?? []) {
      try {
        const target = new URL(`${sub.path.replace(/\/+$/, '')}/`, `https://${s.host}/`);
        const r2 = await fetch(target, {
          redirect: 'manual',
          signal: AbortSignal.timeout(config.fetchTimeoutMs),
        });
        const loc = r2.headers.get('location') ?? '';
        record(
          'surfaces',
          `${key}${sub.path}`,
          r2.status === 302 && loc.includes('cloudflareaccess'),
          `${s.host}${sub.path}/ → ${r2.status} Access`
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        record(
          'surfaces',
          `${key}${sub.path}`,
          false,
          `${s.host}${sub.path}/ → ${detail.slice(0, 80)}`
        );
      }
    }
  }
}

// ── portal routes (manifest SSOT) ───────────────────────────────────────────
async function probePortalRoutes(config: DomainSweepConfig) {
  const { PORTAL_HTML_ROUTES } = await import('../lib/http/portal-route-manifest.ts');
  let ok = 0;
  const fails: string[] = [];
  for (const p of PORTAL_HTML_ROUTES) {
    try {
      const res = await fetch(resolveHttpTarget(config.pagesOrigin, p), {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.fetchTimeoutMs),
      });
      const access =
        res.status === 302 && (res.headers.get('location') ?? '').includes('cloudflareaccess');
      if (res.status === 200 || access) ok++;
      else fails.push(`${p}→${res.status}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      fails.push(`${p}→${detail.slice(0, 40)}`);
    }
  }
  record(
    'portal',
    'HTML routes',
    inventoryPassed(PORTAL_HTML_ROUTES.length, fails.length),
    `${ok}/${PORTAL_HTML_ROUTES.length}${
      PORTAL_HTML_ROUTES.length === 0
        ? ' FAIL: no portal routes configured'
        : fails.length
          ? ` FAIL: ${summarizeFailures(fails)}`
          : ''
    }`
  );
}

// ── registry roundtrip (byte-compare vs local) ──────────────────────────────
async function probeRegistry(config: DomainSweepConfig) {
  const files: string[] = [];
  for await (const f of new Bun.Glob('public/registry/*.json').scan()) files.push(f);
  let same = 0;
  const bad: string[] = [];
  const hasher = new Bun.CryptoHasher('sha256');
  const hash = (s: string) => hasher.update(s).digest('hex');
  const queue = [...files];
  async function worker() {
    for (let f = queue.pop(); f; f = queue.pop()) {
      const rel = f.replace(/^public\//, '/');
      try {
        const res = await fetch(resolveHttpTarget(config.pagesOrigin, rel), {
          signal: AbortSignal.timeout(config.fetchTimeoutMs),
        });
        if (!res.ok) {
          bad.push(`${rel}→${res.status}`);
          continue;
        }
        const live = await res.text();
        JSON.parse(live);
        const local = await Bun.file(f).text();
        if (hash(live) === hash(local)) same++;
        else bad.push(`${rel}→drift`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        bad.push(`${rel}→${detail.slice(0, 60)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  record(
    'registry',
    'JSON byte-parity',
    inventoryPassed(files.length, bad.length),
    files.length === 0
      ? '0/0 · no registry artifacts found'
      : `${same}/${files.length} identical${bad.length ? ` · ${summarizeFailures(bad, 3)}` : ''}`
  );
}

// ── glossary (live schema v3) ───────────────────────────────────────────────
async function probeGlossary(config: DomainSweepConfig) {
  const target = resolveHttpTarget(config.scoreOrigin, '/registry/domain-glossary.json');
  const res = await fetch(target, {
    signal: AbortSignal.timeout(config.fetchTimeoutMs),
  });
  if (!res.ok) throw new Error(`${target.href} → ${res.status}`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    throw new Error(`domain glossary → ${contentType.split(';')[0] || 'missing content-type'}`);
  }
  const g = (await res.json()) as { surfaces?: Array<{ sections?: Array<{ title?: string }> }> };
  let sections = 0;
  let titled = 0;
  for (const surf of g.surfaces ?? []) {
    for (const row of surf.sections ?? []) {
      sections++;
      if (typeof row.title === 'string' && row.title.trim()) titled++;
    }
  }
  record(
    'glossary',
    'sections titled',
    sections > 0 && titled === sections,
    `${titled}/${sections}`
  );
}

// ── api contracts ───────────────────────────────────────────────────────────
async function probeApi(config: DomainSweepConfig) {
  const apis: Array<[string, (j: Record<string, unknown>) => boolean]> = [
    ['/api/health', j => j.schemaVersion === 1],
    ['/api/env', j => !!j.summary && Array.isArray(j.table)],
    ['/api/content-type', j => Array.isArray(j.rows)],
    ['/api/skills', j => Array.isArray(j.skills) && typeof j.count === 'number'],
    [
      '/.well-known/mcp.json',
      j => Array.isArray(j.servers) && (j.servers as unknown[]).length >= 5,
    ],
  ];
  for (const [p, ok] of apis) {
    try {
      const res = await fetch(resolveHttpTarget(config.pagesOrigin, p), {
        signal: AbortSignal.timeout(config.fetchTimeoutMs),
      });
      const j = (await res.json()) as Record<string, unknown>;
      record('api', p, res.ok && ok(j), `${res.status}`);
    } catch (e) {
      record('api', p, false, String(e).slice(0, 40));
    }
  }
}

// ── subprocess gates ────────────────────────────────────────────────────────
async function runGates(config: DomainSweepConfig) {
  const gates: Array<[string, string[]]> = [
    ['verify:pages-edge', ['bun', 'tools/verify-pages-edge.ts']],
    ['verify:weave', ['bun', 'tools/verify-pages-edge.ts', '--weave']],
    ['verify:pm', ['bun', 'tools/verify-pages-edge.ts', '--pm']],
    ['validate:colors', ['bun', 'tools/check-portal-color-kernels.ts']],
    ['glossary:verify', ['bun', 'run', 'glossary:verify']],
    ['telegram:verify', ['bun', 'tools/telegram-verify-env.ts']],
    ['snapshot:live:quick', ['bun', 'tools/snapshot-live.ts', '--quick']],
    ['docs:native:check', ['bun', 'tools/bun-native-capabilities-sync.ts', '--check']],
  ];
  for (const [name, cmd] of gates) {
    await runProbe(
      async () => {
        const result = await captureProcess(cmd, {
          env: { ...Bun.env },
          timeoutMs: config.gateTimeoutMs,
        });
        const summary = summarizeProcessOutput(result);
        record(
          'gates',
          name,
          result.exitCode === 0,
          result.timedOut
            ? `timeout ${config.gateTimeoutMs}ms · ${summary}`
            : result.exitCode === 0
              ? summary
              : `exit ${result.exitCode} · ${summary}`
        );
      },
      detail => record('gates', name, false, detail)
    );
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.info(USAGE);
    return;
  }

  const config = resolveDomainSweepConfig(Bun.env);
  const t0 = Bun.nanoseconds();
  await runProbe(
    () => probeSurfaces(config),
    detail => record('surfaces', 'probe', false, detail)
  );
  await runProbe(
    () => probePortalRoutes(config),
    detail => record('portal', 'HTML routes', false, detail)
  );
  await runProbe(
    () => probeRegistry(config),
    detail => record('registry', 'JSON byte-parity', false, detail)
  );
  await runProbe(
    () => probeGlossary(config),
    detail => record('glossary', 'sections titled', false, detail)
  );
  await runProbe(
    () => probeApi(config),
    detail => record('api', 'contracts', false, detail)
  );
  if (!FAST) {
    await runProbe(
      () => runGates(config),
      detail => record('gates', 'subprocesses', false, detail)
    );
  }

  const failed = checks.filter(c => !c.ok);
  const report = {
    ts: new Date().toISOString(),
    ms: Math.round((Bun.nanoseconds() - t0) / 1e6),
    ok: failed.length === 0,
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.map(f => `${f.plane}/${f.name}: ${f.detail}`),
    targets: {
      pages: httpTargetEvidence(config.pagesOrigin),
      score: httpTargetEvidence(config.scoreOrigin),
      fetchTimeoutMs: config.fetchTimeoutMs,
      gateTimeoutMs: config.gateTimeoutMs,
    },
    checks,
  };

  if (!NO_WRITE) {
    const { appendFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('reports', { recursive: true });
    await Bun.write('reports/domain-sweep-latest.json', `${JSON.stringify(report, null, 2)}\n`);
    appendFileSync(
      'reports/domain-sweep.jsonl',
      `${JSON.stringify({ ...report, checks: undefined })}\n`
    );
  }

  if (JSON_MODE) {
    console.info(JSON.stringify(report));
  } else {
    logTable(
      checks.map(c => ({
        plane: c.plane,
        check: c.name,
        status: c.ok ? 'ok' : 'FAIL',
        detail: c.detail,
      })),
      ['plane', 'check', 'status', 'detail']
    );
    console.info(
      `\n${report.ok ? '✅' : '❌'} domain sweep: ${report.passed}/${report.total} pass · ${report.ms}ms`
    );
  }
  process.exitCode = report.ok ? 0 : 1;
}

if (import.meta.main) await main();

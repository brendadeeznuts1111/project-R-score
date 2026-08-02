#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/bundler/loaders#toml — Bun.TOML.parse
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
 *
 * Artifacts (gitignored): reports/domain-sweep-latest.json + reports/domain-sweep.jsonl
 */

import { logTable } from '../lib/console-depth.ts';

export {};

const FAST = Bun.argv.includes('--fast');
const JSON_MODE = Bun.argv.includes('--json');
const NO_WRITE = Bun.argv.includes('--no-write');
const BASE = 'https://project-r-score.pages.dev';
const SCORE = 'https://score.factory-wager.com';
const FETCH_TIMEOUT = 12_000;
const GATE_TIMEOUT = 180_000;

type Check = { plane: string; name: string; ok: boolean; detail: string };
const checks: Check[] = [];
const record = (plane: string, name: string, ok: boolean, detail: string) =>
  checks.push({ plane, name, ok, detail });

// ── surfaces (config/surfaces.toml SSOT) ────────────────────────────────────
interface SurfaceRow {
  host: string;
  status: string;
  access?: string;
  accessSubpaths?: Array<{ path: string }>;
}

async function probeSurfaces() {
  const toml = Bun.TOML.parse(await Bun.file('config/surfaces.toml').text()) as {
    surfaces: Record<string, SurfaceRow>;
  };
  for (const [key, s] of Object.entries(toml.surfaces)) {
    const expectGone = s.status === 'retired';
    try {
      const res = await fetch(`https://${s.host}/`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
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
      for (const sub of s.accessSubpaths ?? []) {
        const r2 = await fetch(`https://${s.host}${sub.path}/`, {
          redirect: 'manual',
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        const loc = r2.headers.get('location') ?? '';
        record(
          'surfaces',
          `${key}${sub.path}`,
          r2.status === 302 && loc.includes('cloudflareaccess'),
          `${s.host}${sub.path}/ → ${r2.status} Access`
        );
      }
    } catch (e) {
      record(
        'surfaces',
        key,
        expectGone,
        `${s.host} → ${String(e).slice(0, 40)}${expectGone ? ' (retired)' : ''}`
      );
    }
  }
}

// ── portal routes (manifest SSOT) ───────────────────────────────────────────
async function probePortalRoutes() {
  const { PORTAL_HTML_ROUTES } = await import('../lib/http/portal-route-manifest.ts');
  let ok = 0;
  const fails: string[] = [];
  for (const p of PORTAL_HTML_ROUTES) {
    const res = await fetch(`${BASE}${p}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    const access =
      res.status === 302 && (res.headers.get('location') ?? '').includes('cloudflareaccess');
    if (res.status === 200 || access) ok++;
    else fails.push(`${p}→${res.status}`);
  }
  record(
    'portal',
    'HTML routes',
    fails.length === 0,
    `${ok}/${PORTAL_HTML_ROUTES.length}${fails.length ? ' FAIL: ' + fails.join(', ') : ''}`
  );
}

// ── registry roundtrip (byte-compare vs local) ──────────────────────────────
async function probeRegistry() {
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
        const res = await fetch(`${BASE}${rel}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!res.ok) {
          bad.push(`${rel}→${res.status}`);
          continue;
        }
        const live = await res.text();
        JSON.parse(live);
        const local = await Bun.file(f).text();
        if (hash(live) === hash(local)) same++;
        else bad.push(`${rel}→drift`);
      } catch {
        bad.push(`${rel}→error`);
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  record(
    'registry',
    'JSON byte-parity',
    bad.length === 0,
    `${same}/${files.length} identical${bad.length ? ' · ' + bad.slice(0, 3).join(', ') : ''}`
  );
}

// ── glossary (live schema v3) ───────────────────────────────────────────────
async function probeGlossary() {
  const res = await fetch(`${SCORE}/registry/domain-glossary.json`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
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
async function probeApi() {
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
      const res = await fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
      const j = (await res.json()) as Record<string, unknown>;
      record('api', p, res.ok && ok(j), `${res.status}`);
    } catch (e) {
      record('api', p, false, String(e).slice(0, 40));
    }
  }
}

// ── subprocess gates ────────────────────────────────────────────────────────
async function runGates() {
  const gates: Array<[string, string[]]> = [
    ['verify:pages-edge', ['bun', 'tools/verify-pages-edge.ts']],
    ['validate:colors', ['bun', 'tools/check-portal-color-kernels.ts']],
    ['glossary:verify', ['bun', 'run', 'glossary:verify']],
    ['telegram:verify', ['bun', 'tools/telegram-verify-env.ts']],
    ['snapshot:live:quick', ['bun', 'tools/snapshot-live.ts', '--quick']],
    ['docs:native:check', ['bun', 'tools/bun-native-capabilities-sync.ts', '--check']],
  ];
  for (const [name, cmd] of gates) {
    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const timer = setTimeout(() => proc.kill(), GATE_TIMEOUT);
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    clearTimeout(timer);
    const last = out.trim().split('\n').filter(Boolean).pop() ?? '';
    record(
      'gates',
      name,
      code === 0,
      code === 0 ? last.slice(0, 80) : `exit ${code} · ${last.slice(0, 60)}`
    );
  }
}

// ── main ────────────────────────────────────────────────────────────────────
const t0 = Bun.nanoseconds();
await probeSurfaces();
await probePortalRoutes();
await probeRegistry();
await probeGlossary();
await probeApi();
if (!FAST) await runGates();

const failed = checks.filter(c => !c.ok);
const report = {
  ts: new Date().toISOString(),
  ms: Math.round((Bun.nanoseconds() - t0) / 1e6),
  ok: failed.length === 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.map(f => `${f.plane}/${f.name}: ${f.detail}`),
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
process.exit(report.ok ? 0 : 1);

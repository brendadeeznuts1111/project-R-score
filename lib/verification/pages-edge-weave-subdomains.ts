// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Weave subdomain probe matrix — config/subdomains.json.
 *
 * Default-on with weave: `--no-subdomains` to skip · `--subdomains-config <path>`
 *
 * Host inventory SSOT: config/surfaces.toml · this file is the health/path probe list only.
 *
 * @see lib/verification/pages-edge-weave.ts
 * @see config/subdomains.json
 */

import { fileURLToPath } from '../bun-path-url.ts';
import { sleep } from '../time.ts';
import { asHostId, asSurfaceId, type HostId, type SurfaceId } from '../types/branded.ts';

/** Probe row shape (assignable to WeaveProbeRow). */
export type SubdomainProbeRow = {
  group: 'subdomains';
  path: string;
  status: 'pass' | 'fail';
  httpStatus: number | null;
  latencyMs: number;
  sizeBytes: number;
  contentType: string;
  detail: string;
};

export type SubdomainExpect = 'json' | 'ok' | 'access' | 'fail-closed';

export type SubdomainCheckSpec = {
  path: string;
  expect: SubdomainExpect;
};

export type WeaveSubdomainEntry = {
  name: SurfaceId;
  domain: HostId;
  checks: SubdomainCheckSpec[];
};

export type WeaveSubdomainsConfig = {
  schemaVersion: 1;
  kind: 'weave-subdomain-probes';
  note?: string;
  subdomains: WeaveSubdomainEntry[];
};

export const DEFAULT_SUBDOMAINS_CONFIG = 'config/subdomains.json';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Default expect for a bare path string. */
export function defaultExpectForPath(path: string): SubdomainExpect {
  if (path.endsWith('.json')) return 'json';
  if (path === '/health' || path.endsWith('/health')) return 'json';
  return 'ok';
}

function normalizeCheck(raw: unknown): SubdomainCheckSpec {
  if (typeof raw === 'string') {
    if (!raw.startsWith('/'))
      throw new Error(`subdomain check path must start with / (got ${raw})`);
    return { path: raw, expect: defaultExpectForPath(raw) };
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error('subdomain check must be a path string or { path, expect? }');
  }
  const o = raw as { path?: unknown; expect?: unknown };
  if (typeof o.path !== 'string' || !o.path.startsWith('/')) {
    throw new Error('subdomain check.path must be a string starting with /');
  }
  const expect =
    o.expect === 'json' || o.expect === 'ok' || o.expect === 'access' || o.expect === 'fail-closed'
      ? o.expect
      : defaultExpectForPath(o.path);
  return { path: o.path, expect };
}

/** Parse wire JSON → branded subdomain probe config (boundary). */
export function parseSubdomainsConfig(raw: unknown): WeaveSubdomainsConfig {
  if (!raw || typeof raw !== 'object') throw new Error('subdomains config must be an object');
  const o = raw as {
    schemaVersion?: unknown;
    kind?: unknown;
    note?: unknown;
    subdomains?: unknown;
  };
  if (o.schemaVersion !== 1) {
    throw new Error(`subdomains config schemaVersion must be 1 (got ${String(o.schemaVersion)})`);
  }
  if (o.kind !== 'weave-subdomain-probes') {
    throw new Error(
      `subdomains config kind must be weave-subdomain-probes (got ${String(o.kind)})`
    );
  }
  if (!Array.isArray(o.subdomains) || o.subdomains.length === 0) {
    throw new Error('subdomains config requires a non-empty subdomains[]');
  }
  const subdomains: WeaveSubdomainEntry[] = o.subdomains.map((row, i) => {
    if (!row || typeof row !== 'object') throw new Error(`subdomains[${i}] must be an object`);
    const r = row as { name?: unknown; domain?: unknown; checks?: unknown };
    if (typeof r.name !== 'string') throw new Error(`subdomains[${i}].name required`);
    if (typeof r.domain !== 'string') throw new Error(`subdomains[${i}].domain required`);
    if (!Array.isArray(r.checks) || r.checks.length === 0) {
      throw new Error(`subdomains[${i}].checks must be a non-empty array`);
    }
    return {
      name: asSurfaceId(r.name),
      domain: asHostId(r.domain.toLowerCase()),
      checks: r.checks.map(normalizeCheck),
    };
  });
  return {
    schemaVersion: 1,
    kind: 'weave-subdomain-probes',
    note: typeof o.note === 'string' ? o.note : undefined,
    subdomains,
  };
}

export async function loadSubdomainsConfig(
  relOrAbs: string = DEFAULT_SUBDOMAINS_CONFIG
): Promise<WeaveSubdomainsConfig> {
  const path = relOrAbs.startsWith('/') ? relOrAbs : `${REPO_ROOT}/${relOrAbs}`;
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`subdomains config missing: ${path}`);
  return parseSubdomainsConfig(await file.json());
}

export type SubdomainProbeOpts = {
  retries: number;
  backoffMs: number;
};

export type SubdomainProbeHit = {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  sizeBytes: number;
  contentType: string;
  detail: string;
};

function contentTypeOf(res: Response): string {
  return (res.headers.get('content-type') ?? '').split(';')[0]?.trim() || '';
}

function sizeOf(res: Response, body: ArrayBuffer): number {
  const cl = res.headers.get('content-length');
  if (cl) {
    const n = Number(cl);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return body.byteLength;
}

/** Probe one absolute URL with retries; enforce expect. Parallel-safe. */
export async function probeSubdomainCheck(
  url: string,
  expect: SubdomainExpect,
  opts: SubdomainProbeOpts
): Promise<SubdomainProbeHit> {
  let lastErr: Error | undefined;
  const t0 = performance.now();
  for (let attempt = 0; attempt < opts.retries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      const location = res.headers.get('location') ?? '';
      const access = res.status === 302 && location.includes('cloudflareaccess');
      const contentType = contentTypeOf(res);
      const latencyMs = Math.round(performance.now() - t0);

      if (expect === 'access') {
        if (!access) {
          throw new Error(`expected 302 Access, got ${res.status}`);
        }
        return {
          ok: true,
          httpStatus: 302,
          latencyMs,
          sizeBytes: 0,
          contentType,
          detail: '302 Access',
        };
      }
      if (expect === 'fail-closed') {
        if (res.status !== 401 && res.status !== 503) {
          throw new Error(`expected fail-closed 401/503, got ${res.status}`);
        }
        const body = await res.arrayBuffer();
        const sizeBytes = sizeOf(res, body);
        try {
          const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
          if (parsed === null || typeof parsed !== 'object') {
            throw new Error('JSON not an object');
          }
          const auth = parsed as { ok?: unknown; code?: unknown };
          if (
            auth.ok !== false ||
            (auth.code !== 'unauthorized' && auth.code !== 'contract_auth_unconfigured')
          ) {
            throw new Error('JSON is not a recognized auth rejection');
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`invalid fail-closed JSON (${msg})`);
        }
        return {
          ok: true,
          httpStatus: res.status,
          latencyMs,
          sizeBytes,
          contentType: contentType || 'application/json',
          detail: `${res.status} fail-closed`,
        };
      }
      if (access) throw new Error(`302 Access (expected ${expect})`);
      if (!res.ok) throw new Error(`${res.status}`);

      const body = await res.arrayBuffer();
      const sizeBytes = sizeOf(res, body);
      const isJson =
        contentType.includes('application/json') || expect === 'json' || url.includes('.json');

      if (isJson || expect === 'json') {
        try {
          const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
          if (parsed === null || typeof parsed !== 'object') {
            throw new Error('JSON not an object');
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`invalid JSON (${msg})`);
        }
        return {
          ok: true,
          httpStatus: res.status,
          latencyMs,
          sizeBytes,
          contentType: contentType || 'application/json',
          detail: `${res.status} json`,
        };
      }

      return {
        ok: true,
        httpStatus: res.status,
        latencyMs,
        sizeBytes,
        contentType,
        detail: `${res.status}`,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt + 1 < opts.retries) {
        await sleep(opts.backoffMs * (attempt + 1));
      }
    }
  }
  return {
    ok: false,
    httpStatus: null,
    latencyMs: Math.round(performance.now() - t0),
    sizeBytes: 0,
    contentType: '',
    detail: lastErr?.message ?? 'unreachable',
  };
}

export type SubdomainProbeResult = {
  rows: SubdomainProbeRow[];
  pass: number;
  fail: number;
  ok: boolean;
  detail: string;
};

/** Run all subdomain probes in parallel; rows use group `subdomains`, path `name:path`. */
export async function runSubdomainProbes(
  config: WeaveSubdomainsConfig,
  opts: SubdomainProbeOpts
): Promise<SubdomainProbeResult> {
  const jobs = config.subdomains.flatMap(entry =>
    entry.checks.map(c => ({
      entry,
      check: c,
      url: `https://${entry.domain}${c.path}`,
      path: `${entry.name}:${c.path}`,
    }))
  );

  const hits = await Promise.all(
    jobs.map(async job => {
      const hit = await probeSubdomainCheck(job.url, job.check.expect, opts);
      const row: SubdomainProbeRow = {
        group: 'subdomains',
        path: job.path,
        status: hit.ok ? 'pass' : 'fail',
        httpStatus: hit.httpStatus,
        latencyMs: hit.latencyMs,
        sizeBytes: hit.sizeBytes,
        contentType: hit.contentType,
        detail: hit.detail.slice(0, 48),
      };
      return { row, failMsg: hit.ok ? null : `${job.path} → ${hit.detail}` };
    })
  );

  const rows = hits.map(h => h.row);
  const fails = hits.map(h => h.failMsg).filter((m): m is string => Boolean(m));
  const pass = rows.filter(r => r.status === 'pass').length;
  const fail = rows.length - pass;
  return {
    rows,
    pass,
    fail,
    ok: fail === 0,
    detail:
      fail === 0
        ? `${pass}/${rows.length} reachable · ${config.subdomains.length} hosts`
        : fails.slice(0, 4).join(' · '),
  };
}

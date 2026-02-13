#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Profile = {
  id: string;
  label: string;
  args: string[];
};

type QueryResultSummary = {
  query: string;
  // Engine time emitted by search-smart (semantic retrieval/ranking runtime).
  elapsedMs: number;
  // End-to-end wall time for the benchmark invocation of this query.
  wallElapsedMs: number;
  rssMB: number;
  heapUsedMB: number;
  total: number;
  slop: number;
  duplicate: number;
  generated: number;
  docsNoise: number;
  uniqueFamilies: number;
  avgMirrors: number;
  signalPct: number;
};

type ProfileSummary = {
  profile: string;
  label: string;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  peakRssMB: number;
  peakHeapUsedMB: number;
  avgRssMB: number;
  avgHeapUsedMB: number;
  avgSignalPct: number;
  avgSlopPct: number;
  avgDuplicatePct: number;
  avgUniqueFamilyPct: number;
  avgMirrorsPerHit: number;
  qualityScore: number;
  queries: QueryResultSummary[];
};

const FALLBACK_CORE_QUERIES = [
  'authorize middleware',
  'generated',
  'Bun.serve',
  'cache invalidation',
  'auth',
  'constants',
  'R2LifecycleManager',
];

type QueryPacks = Record<string, string[]>;

export const QUALITY_SCORE_WEIGHTS = Object.freeze({
  signalPct: 0.45,
  uniqueFamilyPct: 0.35,
  slopPenalty: 0.15,
  duplicatePenalty: 0.05,
});

export type QualityScoreInputs = {
  avgSignalPct: number;
  avgUniqueFamilyPct: number;
  avgSlopPct: number;
  avgDuplicatePct: number;
};

function boundedPct(input: number): number {
  if (!Number.isFinite(input)) return 0;
  return Math.max(0, Math.min(100, input));
}

export function computeQualityScore(inputs: QualityScoreInputs): number {
  const avgSignalPct = boundedPct(inputs.avgSignalPct);
  const avgUniqueFamilyPct = boundedPct(inputs.avgUniqueFamilyPct);
  const avgSlopPct = boundedPct(inputs.avgSlopPct);
  const avgDuplicatePct = boundedPct(inputs.avgDuplicatePct);

  // Higher is better.
  const qualityScoreRaw =
    avgSignalPct * QUALITY_SCORE_WEIGHTS.signalPct +
    avgUniqueFamilyPct * QUALITY_SCORE_WEIGHTS.uniqueFamilyPct +
    (100 - avgSlopPct) * QUALITY_SCORE_WEIGHTS.slopPenalty +
    (100 - avgDuplicatePct) * QUALITY_SCORE_WEIGHTS.duplicatePenalty;

  return Number(Math.max(0, Math.min(100, qualityScoreRaw)).toFixed(2));
}

const DEFAULT_QUERY_PACKS: QueryPacks = {
  core_delivery: [...FALLBACK_CORE_QUERIES],
  core_delivery_wide: [
    ...FALLBACK_CORE_QUERIES,
    'canonical family',
    'score thresholds',
    'query pack',
    'strict latency',
  ],
  bun_runtime_api: [
    'Bun.serve',
    'Bun.file',
    'Bun.write',
    'Bun.spawn',
    'bun test',
  ],
  cleanup_noise: [
    'generated',
    'docs-noise',
    'duplicate',
    'compiled',
    'ai-slop',
  ],
};

export function parseArgs(argv: string[]): {
  path: string;
  limit: number;
  queries?: string[];
  queryPack: string;
  concurrency: number;
  concurrencyExplicit: boolean;
  overlap: 'ignore' | 'remove';
  queryTimeoutMs: number;
  queryRetries: number;
} {
  let path = './lib';
  let limit = 40;
  let queries: string[] | undefined;
  let queryPack = 'core_delivery';
  let concurrency = 4;
  let concurrencyExplicit = false;
  let overlap: 'ignore' | 'remove' = 'ignore';
  let queryTimeoutMs = Number.parseInt(Bun.env.SEARCH_BENCH_QUERY_TIMEOUT_MS || '45000', 10);
  if (!Number.isFinite(queryTimeoutMs) || queryTimeoutMs <= 0) {
    queryTimeoutMs = 45000;
  }
  let queryRetries = Number.parseInt(Bun.env.SEARCH_BENCH_QUERY_RETRIES || '0', 10);
  if (!Number.isFinite(queryRetries) || queryRetries < 0) {
    queryRetries = 0;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      path = argv[i + 1] || path;
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) {
        limit = n;
      }
      i += 1;
      continue;
    }
    if (arg === '--queries') {
      const value = argv[i + 1] || '';
      const parsed = value.split(',').map((q) => q.trim()).filter(Boolean);
      if (parsed.length > 0) {
        queries = parsed;
      }
      i += 1;
      continue;
    }
    if (arg === '--query-pack') {
      queryPack = (argv[i + 1] || queryPack).trim() || queryPack;
      i += 1;
      continue;
    }
    if (arg === '--concurrency') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) {
        concurrency = Math.min(32, n);
        concurrencyExplicit = true;
      }
      i += 1;
      continue;
    }
    if (arg === '--overlap') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value === 'ignore' || value === 'remove') {
        overlap = value;
      }
      i += 1;
      continue;
    }
    if (arg === '--query-timeout-ms') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) {
        queryTimeoutMs = n;
      }
      i += 1;
      continue;
    }
    if (arg === '--query-retries') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n >= 0) {
        queryRetries = Math.min(5, n);
      }
      i += 1;
      continue;
    }
  }

  return { path, limit, queries, queryPack, concurrency, concurrencyExplicit, overlap, queryTimeoutMs, queryRetries };
}

export function normalizeQueryPacks(parsed: unknown): QueryPacks {
  const normalized: QueryPacks = {};
  for (const [pack, queries] of Object.entries((parsed || {}) as Record<string, unknown>)) {
    if (Array.isArray(queries)) {
      const list = queries.map((q) => String(q).trim()).filter(Boolean);
      if (list.length > 0) {
        normalized[pack] = list;
      }
    }
  }
  return {
    ...DEFAULT_QUERY_PACKS,
    ...normalized,
  };
}

export async function loadQueryPacks(): Promise<{ packs: QueryPacks; source: 'default' | 'file' }> {
  const path = resolve('.search/benchmark-queries.lib.json');
  if (!existsSync(path)) {
    return {
      packs: normalizeQueryPacks({}),
      source: 'default',
    };
  }
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return {
      packs: normalizeQueryPacks(parsed),
      source: 'file',
    };
  } catch {
    return {
      packs: normalizeQueryPacks({}),
      source: 'default',
    };
  }
}

export function extractFirstJsonObject(output: string): string | null {
  for (let i = 0; i < output.length; i += 1) {
    if (output[i] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < output.length; j += 1) {
      const ch = output[j];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') {
        depth += 1;
        continue;
      }
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return output.slice(i, j + 1);
        }
      }
    }
  }
  return null;
}

export function parseJsonPayload(output: string): any {
  const trimmed = output.trim();
  if (!trimmed) return { hits: [] };
  try {
    return JSON.parse(trimmed);
  } catch {
    const extracted = extractFirstJsonObject(output);
    if (!extracted) return { hits: [] };
    try {
      return JSON.parse(extracted);
    } catch {
      return { hits: [] };
    }
  }
}

async function runSearch(
  query: string,
  path: string,
  limit: number,
  overlap: 'ignore' | 'remove',
  args: string[],
  timeoutMs: number
): Promise<any> {
  const cmd = [
    'bun',
    'run',
    'search:smart',
    query,
    '--path',
    path,
    '--limit',
    String(limit),
    '--overlap',
    overlap,
    '--json',
    ...args,
  ];
  const proc = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      proc.kill();
    } catch {
      // no-op; process may already have exited.
    }
  }, timeoutMs);
  const [output, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);
  if (exitCode !== 0) {
    const reason = (stderr || output).trim();
    throw new Error(
      `[search:bench] search:smart failed for query "${query}" (${timedOut ? `timeout ${timeoutMs}ms` : `exit ${exitCode}`})${reason ? `: ${reason}` : ''}`
    );
  }
  return parseJsonPayload(output);
}

async function runSearchWithRetry(
  query: string,
  path: string,
  limit: number,
  overlap: 'ignore' | 'remove',
  args: string[],
  timeoutMs: number,
  retries: number
): Promise<any> {
  let lastError: unknown = null;
  const attempts = Math.max(1, retries + 1);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runSearch(query, path, limit, overlap, args, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) {
        break;
      }
      const delayMs = Math.min(2000, 200 * (2 ** (attempt - 1)));
      await Bun.sleep(delayMs);
      console.error(`[search:bench] retrying query "${query}" (${attempt}/${attempts - 1} retries used)`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`[search:bench] query "${query}" failed`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  const out = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      out[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: size }, () => runWorker()));
  return out;
}

function summarizeQuery(query: string, payload: any): QueryResultSummary {
  const hits = (payload?.hits || []) as Array<any>;
  const slopSet = new Set(['generated', 'compiled', 'docs-noise', 'ai-slop']);

  const total = hits.length;
  const slop = hits.filter((h) => slopSet.has(h.qualityTag)).length;
  const duplicate = hits.filter((h) => h.qualityTag === 'duplicate').length;
  const generated = hits.filter((h) => h.qualityTag === 'generated').length;
  const docsNoise = hits.filter((h) => h.qualityTag === 'docs-noise').length;

  const familyKeys = new Set(
    hits.map((h) => h.familyId || h.canonicalFile || h.file)
  );
  const uniqueFamilies = familyKeys.size;

  const avgMirrors = total > 0
    ? Number((hits.reduce((sum, h) => sum + (h.mirrorCount || 0), 0) / total).toFixed(2))
    : 0;

  const signalPct = total > 0 ? Number((((total - slop) / total) * 100).toFixed(2)) : 0;

  return {
    query,
    elapsedMs: Number(payload?.elapsedMs || 0),
    wallElapsedMs: Number(payload?.wallElapsedMs || 0),
    rssMB: Number(payload?.memory?.rssMB || 0),
    heapUsedMB: Number(payload?.memory?.heapUsedMB || 0),
    total,
    slop,
    duplicate,
    generated,
    docsNoise,
    uniqueFamilies,
    avgMirrors,
    signalPct,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function aggregateProfile(profile: Profile, querySummaries: QueryResultSummary[]): ProfileSummary {
  const n = querySummaries.length || 1;
  const latencies = querySummaries.map((q) => Number(q.elapsedMs || 0)).filter((v) => Number.isFinite(v) && v >= 0);
  const latencyP50Ms = Number(percentile(latencies, 50).toFixed(2));
  const latencyP95Ms = Number(percentile(latencies, 95).toFixed(2));
  const latencyMaxMs = Number((latencies.length > 0 ? Math.max(...latencies) : 0).toFixed(2));
  const rssValues = querySummaries.map((q) => Number(q.rssMB || 0)).filter((v) => Number.isFinite(v) && v >= 0);
  const heapValues = querySummaries.map((q) => Number(q.heapUsedMB || 0)).filter((v) => Number.isFinite(v) && v >= 0);
  const peakRssMB = Number((rssValues.length > 0 ? Math.max(...rssValues) : 0).toFixed(2));
  const peakHeapUsedMB = Number((heapValues.length > 0 ? Math.max(...heapValues) : 0).toFixed(2));
  const avgRssMB = Number((rssValues.reduce((a, b) => a + b, 0) / (rssValues.length || 1)).toFixed(2));
  const avgHeapUsedMB = Number((heapValues.reduce((a, b) => a + b, 0) / (heapValues.length || 1)).toFixed(2));

  const avgSignalPct = Number((querySummaries.reduce((a, q) => a + q.signalPct, 0) / n).toFixed(2));
  const avgSlopPct = Number((querySummaries.reduce((a, q) => a + (q.total ? (q.slop / q.total) * 100 : 0), 0) / n).toFixed(2));
  const avgDuplicatePct = Number((querySummaries.reduce((a, q) => a + (q.total ? (q.duplicate / q.total) * 100 : 0), 0) / n).toFixed(2));
  const avgUniqueFamilyPct = Number((querySummaries.reduce((a, q) => a + (q.total ? (q.uniqueFamilies / q.total) * 100 : 0), 0) / n).toFixed(2));
  const avgMirrorsPerHit = Number((querySummaries.reduce((a, q) => a + q.avgMirrors, 0) / n).toFixed(2));

  const qualityScore = computeQualityScore({
    avgSignalPct,
    avgUniqueFamilyPct,
    avgSlopPct,
    avgDuplicatePct,
  });

  return {
    profile: profile.id,
    label: profile.label,
    latencyP50Ms,
    latencyP95Ms,
    latencyMaxMs,
    peakRssMB,
    peakHeapUsedMB,
    avgRssMB,
    avgHeapUsedMB,
    avgSignalPct,
    avgSlopPct,
    avgDuplicatePct,
    avgUniqueFamilyPct,
    avgMirrorsPerHit,
    qualityScore,
    queries: querySummaries,
  };
}

export async function main(): Promise<void> {
  const {
    path,
    limit,
    queries: overrideQueries,
    queryPack,
    concurrency,
    concurrencyExplicit,
    overlap,
    queryTimeoutMs,
    queryRetries,
  } = parseArgs(process.argv.slice(2));
  const effectiveConcurrency = !concurrencyExplicit && path.includes(',')
    ? Math.min(concurrency, 2)
    : concurrency;
  const loaded = await loadQueryPacks();
  const packs = loaded.packs;
  const queries = overrideQueries || packs[queryPack] || packs.core_delivery || [...FALLBACK_CORE_QUERIES];
  if (!overrideQueries && !packs[queryPack]) {
    console.error(`[search:bench] query pack "${queryPack}" not found; using core_delivery fallback`);
  }
  if (loaded.source === 'default') {
    console.error('[search:bench] .search/benchmark-queries.lib.json not found or invalid; using built-in query packs');
  }

  const profiles: Profile[] = [
    { id: 'mixed', label: 'Mixed Delivery', args: ['--view', 'mixed', '--task', 'delivery'] },
    { id: 'strict', label: 'Strict', args: ['--strict'] },
    { id: 'lib-strict', label: 'Lib Strict', args: ['--strict', '--family-cap', '2'] },
    { id: 'cleanup', label: 'Cleanup Slop', args: ['--view', 'slop-only', '--task', 'cleanup', '--group-limit', '5'] },
  ];

  const summaries: ProfileSummary[] = [];

  const profileSummaries = await mapWithConcurrency(profiles, Math.min(effectiveConcurrency, profiles.length), async (profile) => {
    const querySummaries = await mapWithConcurrency(queries, effectiveConcurrency, async (query) => {
      const started = performance.now();
      const payload = await runSearchWithRetry(
        query,
        path,
        limit,
        overlap,
        profile.args,
        queryTimeoutMs,
        queryRetries
      );
      payload.wallElapsedMs = Number((performance.now() - started).toFixed(2));
      return summarizeQuery(query, payload);
    });
    return aggregateProfile(profile, querySummaries);
  });

  summaries.push(...profileSummaries);

  summaries.sort((a, b) => b.qualityScore - a.qualityScore);

  console.log(JSON.stringify({
    path,
    limit,
    queryPack,
    concurrency: effectiveConcurrency,
    queryTimeoutMs,
    queryRetries,
    overlap,
    queries,
    rankedProfiles: summaries,
  }, null, 2));
}

if (import.meta.main) {
  await main();
}

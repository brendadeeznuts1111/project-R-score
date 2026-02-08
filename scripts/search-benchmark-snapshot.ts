#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client } from 'bun';
import inspector from 'node:inspector/promises';
import {
  loadSearchPolicies,
  resolveScoreThresholdsForQueryPack,
  type ScoreThresholdsPolicy,
} from '../lib/docs/canonical-family';
import { evaluateStrictWarnings } from './lib/search-benchmark-thresholds';

type RankedProfile = {
  profile: string;
  label: string;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  peakRssMB?: number;
  peakHeapUsedMB?: number;
  avgRssMB?: number;
  avgHeapUsedMB?: number;
  avgSignalPct: number;
  avgSlopPct: number;
  avgDuplicatePct: number;
  avgUniqueFamilyPct: number;
  avgMirrorsPerHit: number;
  qualityScore: number;
};

type BenchmarkPayload = {
  path: string;
  limit: number;
  queryPack?: string;
  concurrency?: number;
  overlap?: 'ignore' | 'remove';
  queries: string[];
  rankedProfiles: RankedProfile[];
  warnings?: string[];
  thresholdsApplied?: Required<ScoreThresholdsPolicy>;
  warningContext?: {
    queryPack: string;
    strictMetrics: {
      qualityDelta: number | null;
      slopDelta: number | null;
      reliabilityDelta: number | null;
      reliabilityNow: number | null;
      latencyP95Ms: number | null;
      peakHeapUsedMB: number | null;
      peakRssMB: number | null;
    };
    thresholds: Required<ScoreThresholdsPolicy>;
  };
  coverage?: {
    files: number;
    lines: number;
    uniqueFiles: number;
    uniqueLines: number;
    roots: string[];
    overlapMode: string;
  };
};

type SnapshotDelta = {
  topQuality: number | null;
  familyCoverage: number | null;
  avgSlop: number | null;
  noiseRatio: number | null;
  reliability: number | null;
};

type DeltaBasis = 'same-pack';

type SnapshotIndexEntry = {
  id: string;
  createdAt: string;
  topProfile: string;
  topScore: number;
  queryPack?: string;
  localJson: string;
  localMd: string;
  r2JsonKey?: string;
  r2MdKey?: string;
  r2ManifestKey?: string;
};

type SnapshotIndex = {
  updatedAt: string;
  snapshots: SnapshotIndexEntry[];
};

type CliOptions = {
  path: string;
  limit: number;
  queryPack?: string;
  concurrency?: number;
  overlap: 'ignore' | 'remove';
  queries?: string;
  outputDir: string;
  id?: string;
  upload: boolean;
  bucket?: string;
  prefix: string;
  publicBase?: string;
  gzip: boolean;
  uploadRetries: number;
  cpuProfilePath?: string;
};

type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  publicBase?: string;
};

function escapeXml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toRfc822(dateIso: string): string {
  return new Date(dateIso).toUTCString();
}

function buildRssFeed(
  index: SnapshotIndex,
  opts: {
    bucket?: string;
    prefix: string;
    publicBase?: string;
  }
): string {
  const channelTitle = 'Search Benchmark Snapshots';
  const channelLink = opts.publicBase
    ? `${opts.publicBase.replace(/\/+$/g, '')}/index.json`
    : `r2://${opts.bucket || 'unknown'}/${opts.prefix}/index.json`;
  const channelDescription = 'Snapshot updates for search benchmark quality profiles.';
  const lastBuildDate = toRfc822(index.updatedAt);

  const items = index.snapshots.slice(0, 50).map((snap) => {
    const jsonKey = snap.r2JsonKey || `${opts.prefix}/${snap.id}/snapshot.json`;
    const summaryKey = snap.r2MdKey || `${opts.prefix}/${snap.id}/summary.md`;
    const itemLink = opts.publicBase
      ? `${opts.publicBase.replace(/\/+$/g, '')}/${snap.id}/snapshot.json`
      : `r2://${opts.bucket || 'unknown'}/${jsonKey}`;
    const summaryRef = opts.publicBase
      ? `${opts.publicBase.replace(/\/+$/g, '')}/${snap.id}/summary.md`
      : `r2://${opts.bucket || 'unknown'}/${summaryKey}`;
    const title = `${snap.id} · ${snap.topProfile} · ${snap.topScore.toFixed(2)}`;
    const description = `Top profile: ${snap.topProfile}. Top score: ${snap.topScore.toFixed(2)}. Summary: ${summaryRef}`;

    return [
      '    <item>',
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${escapeXml(itemLink)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(snap.id)}</guid>`,
      `      <pubDate>${escapeXml(toRfc822(snap.createdAt))}</pubDate>`,
      `      <description>${escapeXml(description)}</description>`,
      '    </item>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = {
    path: './lib',
    limit: 40,
    overlap: 'ignore',
    outputDir: './reports/search-benchmark',
    upload: true,
    prefix: Bun.env.R2_BENCH_PREFIX || 'reports/search-bench',
    gzip: true,
    uploadRetries: Number.parseInt(Bun.env.R2_UPLOAD_RETRIES || '3', 10) || 3,
    cpuProfilePath: Bun.env.SEARCH_BENCH_CPU_PROFILE || undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      out.path = argv[i + 1] || out.path;
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) out.limit = n;
      i += 1;
      continue;
    }
    if (arg === '--queries') {
      out.queries = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--query-pack') {
      out.queryPack = argv[i + 1] || out.queryPack;
      i += 1;
      continue;
    }
    if (arg === '--concurrency') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) out.concurrency = Math.min(32, n);
      i += 1;
      continue;
    }
    if (arg === '--overlap') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value === 'ignore' || value === 'remove') out.overlap = value;
      i += 1;
      continue;
    }
    if (arg === '--output') {
      out.outputDir = argv[i + 1] || out.outputDir;
      i += 1;
      continue;
    }
    if (arg === '--id') {
      out.id = argv[i + 1] || out.id;
      i += 1;
      continue;
    }
    if (arg === '--no-upload') {
      out.upload = false;
      continue;
    }
    if (arg === '--bucket') {
      out.bucket = argv[i + 1] || out.bucket;
      i += 1;
      continue;
    }
    if (arg === '--prefix') {
      out.prefix = argv[i + 1] || out.prefix;
      i += 1;
      continue;
    }
    if (arg === '--public-base') {
      out.publicBase = argv[i + 1] || out.publicBase;
      i += 1;
      continue;
    }
    if (arg === '--no-gzip') {
      out.gzip = false;
      continue;
    }
    if (arg === '--upload-retries') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n >= 0) out.uploadRetries = n;
      i += 1;
      continue;
    }
    if (arg === '--profile-cpu') {
      out.cpuProfilePath = argv[i + 1] || out.cpuProfilePath;
      i += 1;
      continue;
    }
  }

  return out;
}

function timestampId(now = new Date()): string {
  return now.toISOString().replace(/[:.]/g, '-');
}

function parseJsonFromStdout(text: string): BenchmarkPayload {
  const idx = text.indexOf('{');
  if (idx < 0) throw new Error('search benchmark output did not contain JSON payload');
  return JSON.parse(text.slice(idx));
}

async function runBenchmark(options: CliOptions): Promise<BenchmarkPayload> {
  const args = [
    'bun',
    'run',
    'scripts/search-benchmark.ts',
    '--path',
    options.path,
    '--limit',
    String(options.limit),
  ];
  if (options.queries && options.queries.trim().length > 0) {
    args.push('--queries', options.queries);
  }
  if (options.queryPack && options.queryPack.trim().length > 0) {
    args.push('--query-pack', options.queryPack);
  }
  if (options.concurrency && options.concurrency > 0) {
    args.push('--concurrency', String(options.concurrency));
  }
  args.push('--overlap', options.overlap);

  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`benchmark failed (${code}): ${stderr || stdout}`);
  }
  return parseJsonFromStdout(stdout);
}

function topProfile(payload: BenchmarkPayload): RankedProfile | null {
  if (!Array.isArray(payload.rankedProfiles) || payload.rankedProfiles.length === 0) {
    return null;
  }
  return payload.rankedProfiles[0] || null;
}

function averageSlop(payload: BenchmarkPayload): number | null {
  if (!Array.isArray(payload.rankedProfiles) || payload.rankedProfiles.length === 0) {
    return null;
  }
  const sum = payload.rankedProfiles.reduce((acc, p) => acc + Number(p.avgSlopPct || 0), 0);
  return Number((sum / payload.rankedProfiles.length).toFixed(2));
}

function snapshotMetrics(payload: BenchmarkPayload): {
  topQuality: number | null;
  familyCoverage: number | null;
  avgSlop: number | null;
  noiseRatio: number | null;
  reliability: number | null;
} {
  const top = topProfile(payload);
  return {
    topQuality: top ? Number(Number(top.qualityScore || 0).toFixed(2)) : null,
    familyCoverage: top ? Number(Number(top.avgUniqueFamilyPct || 0).toFixed(2)) : null,
    avgSlop: averageSlop(payload),
    noiseRatio: top
      ? Number(Math.min(100, Number(top.avgSlopPct || 0) + Number(top.avgDuplicatePct || 0)).toFixed(2))
      : null,
    reliability: top
      ? Number((((Number(top.avgSignalPct || 0) * Number(top.avgUniqueFamilyPct || 0)) / 100)).toFixed(2))
      : null,
  };
}

function computeDelta(
  current: ReturnType<typeof snapshotMetrics>,
  previous: ReturnType<typeof snapshotMetrics> | null
): SnapshotDelta {
  if (!previous) {
    return {
      topQuality: null,
      familyCoverage: null,
      avgSlop: null,
      noiseRatio: null,
      reliability: null,
    };
  }
  const calc = (a: number | null, b: number | null): number | null => {
    if (a === null || b === null) return null;
    return Number((a - b).toFixed(2));
  };
  return {
    topQuality: calc(current.topQuality, previous.topQuality),
    familyCoverage: calc(current.familyCoverage, previous.familyCoverage),
    avgSlop: calc(current.avgSlop, previous.avgSlop),
    noiseRatio: calc(current.noiseRatio, previous.noiseRatio),
    reliability: calc(current.reliability, previous.reliability),
  };
}

function profileById(payload: BenchmarkPayload | null, id: string): RankedProfile | null {
  if (!payload || !Array.isArray(payload.rankedProfiles)) {
    return null;
  }
  return payload.rankedProfiles.find((p) => p.profile === id) || null;
}

function profileReliability(profile: RankedProfile | null): number | null {
  if (!profile) {
    return null;
  }
  return Number((((Number(profile.avgSignalPct || 0) * Number(profile.avgUniqueFamilyPct || 0)) / 100)).toFixed(2));
}

function runClassForQueryPack(queryPack: string): 'core-iterative' | 'daily-coverage' | 'ad-hoc' {
  if (queryPack === 'core_delivery' || queryPack === 'core_delivery_wide') return 'core-iterative';
  if (queryPack === 'bun_runtime_api' || queryPack === 'cleanup_noise') return 'daily-coverage';
  return 'ad-hoc';
}

function renderSummaryMarkdown(
  id: string,
  createdAt: string,
  payload: BenchmarkPayload,
  delta: SnapshotDelta,
  warnings: string[],
  deltaBasis: DeltaBasis,
  baselineSnapshotId: string | null
): string {
  const lines: string[] = [];
  lines.push(`# Search Benchmark Snapshot`);
  lines.push('');
  lines.push(`- Snapshot: \`${id}\``);
  lines.push(`- Created: \`${createdAt}\``);
  lines.push(`- Path: \`${payload.path}\``);
  lines.push(`- Limit: \`${payload.limit}\``);
  lines.push(`- Query Pack: \`${payload.queryPack || 'core_delivery'}\``);
  if (payload.thresholdsApplied) {
    lines.push(`- Strict p95 Threshold: \`${payload.thresholdsApplied.strictLatencyP95WarnMs}ms\``);
    lines.push(`- Strict Heap Threshold: \`${payload.thresholdsApplied.strictPeakHeapWarnMB}MB\``);
    lines.push(`- Strict RSS Threshold: \`${payload.thresholdsApplied.strictPeakRssWarnMB}MB\``);
  }
  lines.push(`- Overlap Mode: \`${payload.overlap || 'ignore'}\``);
  lines.push(`- Delta Basis: \`${deltaBasis}\``);
  lines.push(`- Baseline Snapshot: \`${baselineSnapshotId || 'none'}\``);
  if (typeof payload.concurrency === 'number') {
    lines.push(`- Concurrency: \`${payload.concurrency}\``);
  }
  if (payload.coverage) {
    lines.push(`- Coverage LOC: \`${payload.coverage.lines}\``);
    lines.push(`- Coverage Files: \`${payload.coverage.files}\``);
    lines.push(`- Coverage Roots: \`${payload.coverage.roots.join(', ')}\``);
    lines.push(`- Coverage Overlap Mode: \`${payload.coverage.overlapMode}\``);
  }
  lines.push(`- Queries: \`${payload.queries.join(', ')}\``);
  lines.push('');
  lines.push(`## Trend Delta (vs same-pack previous snapshot)`);
  lines.push('');
  if (!baselineSnapshotId) {
    lines.push(`- delta_basis: \`unavailable_same_pack\``);
  }
  lines.push(`- topQuality: \`${delta.topQuality ?? 'n/a'}\``);
  lines.push(`- familyCoverage: \`${delta.familyCoverage ?? 'n/a'}\``);
  lines.push(`- avgSlop: \`${delta.avgSlop ?? 'n/a'}\``);
  lines.push(`- noiseRatio: \`${delta.noiseRatio ?? 'n/a'}\``);
  lines.push(`- reliability: \`${delta.reliability ?? 'n/a'}\``);
  lines.push('');
  lines.push(`## Warnings`);
  if (payload.warningContext) {
    lines.push(`- warningContext.queryPack: \`${payload.warningContext.queryPack}\``);
  }
  if (warnings.length === 0) {
    lines.push(`- none`);
  } else {
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push('');
  lines.push(`## Ranked Profiles`);
  lines.push('');
  lines.push(`| Rank | Profile | Quality | Signal% | Unique Family% | Slop% | Duplicate% | P95(ms) | Peak Heap(MB) | Peak RSS(MB) |`);
  lines.push(`|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|`);

  payload.rankedProfiles.forEach((p, idx) => {
    lines.push(
      `| ${idx + 1} | ${p.profile} | ${p.qualityScore.toFixed(2)} | ${p.avgSignalPct.toFixed(2)} | ${p.avgUniqueFamilyPct.toFixed(2)} | ${p.avgSlopPct.toFixed(2)} | ${p.avgDuplicatePct.toFixed(2)} | ${Number(p.latencyP95Ms || 0).toFixed(2)} | ${Number(p.peakHeapUsedMB || 0).toFixed(2)} | ${Number(p.peakRssMB || 0).toFixed(2)} |`
    );
  });

  return `${lines.join('\n')}\n`;
}

async function readIndex(indexPath: string): Promise<SnapshotIndex> {
  if (!existsSync(indexPath)) {
    return { updatedAt: new Date().toISOString(), snapshots: [] };
  }
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as SnapshotIndex;
    if (!Array.isArray(parsed.snapshots)) {
      return { updatedAt: new Date().toISOString(), snapshots: [] };
    }
    return parsed;
  } catch {
    return { updatedAt: new Date().toISOString(), snapshots: [] };
  }
}

function resolveR2Config(options: CliOptions): R2Config | null {
  const accountId = Bun.env.R2_ACCOUNT_ID || '';
  const endpoint =
    Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const bucket = options.bucket || Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || '';
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || '';
  const prefix = options.prefix.replace(/^\/+|\/+$/g, '');
  const publicBase = options.publicBase || Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey, prefix, publicBase };
}

async function uploadText(r2: R2Config, key: string, data: string, type: string): Promise<void> {
  await S3Client.write(key, data, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type,
  });
}

async function uploadTextEncoded(
  r2: R2Config,
  key: string,
  data: string | Uint8Array,
  type: string,
  contentEncoding: string
): Promise<void> {
  await S3Client.write(key, data, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type,
    contentEncoding,
  } as any);
}

async function uploadBytes(
  r2: R2Config,
  key: string,
  data: Uint8Array,
  type: string
): Promise<void> {
  await S3Client.write(key, data, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type,
  });
}

async function uploadWithRetry(
  fn: () => Promise<void>,
  retries: number
): Promise<{ attempts: number; elapsedMs: number }> {
  let attempt = 0;
  const started = performance.now();
  while (true) {
    attempt += 1;
    try {
      await fn();
      return { attempts: attempt, elapsedMs: Number((performance.now() - started).toFixed(2)) };
    } catch (error) {
      if (attempt > retries) {
        throw error;
      }
      const delayMs = Math.min(5000, 250 * (2 ** (attempt - 1)));
      await Bun.sleep(delayMs);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const id = options.id || timestampId();
  const createdAt = new Date().toISOString();

  const outDir = resolve(options.outputDir);
  const indexPath = resolve(outDir, 'index.json');
  const existingIndex = await readIndex(indexPath);
  const queryPack = options.queryPack || 'core_delivery';
  const deltaBasis: DeltaBasis = 'same-pack';
  let previousPayload: BenchmarkPayload | null = null;
  let baselineSnapshotId: string | null = null;
  const previousEntry = existingIndex.snapshots.find((s) => (s.queryPack || 'core_delivery') === queryPack);
  const previousSnapshotId = previousEntry?.id || null;
  if (previousSnapshotId) {
    baselineSnapshotId = previousSnapshotId;
    const previousPath = resolve(outDir, previousSnapshotId, 'snapshot.json');
    if (existsSync(previousPath)) {
      try {
        previousPayload = JSON.parse(await readFile(previousPath, 'utf8')) as BenchmarkPayload;
      } catch {
        previousPayload = null;
        baselineSnapshotId = null;
      }
    }
  }

  const payload = await (async () => {
    if (!options.cpuProfilePath) {
      return runBenchmark(options);
    }
    const session = new inspector.Session();
    session.connect();
    try {
      await session.post('Profiler.enable');
      await session.post('Profiler.start');
      const result = await runBenchmark(options);
      const { profile } = await session.post('Profiler.stop');
      await session.post('Profiler.disable');
      await writeFile(resolve(options.cpuProfilePath), JSON.stringify(profile, null, 2));
      console.log(`[search-bench:snapshot] wrote cpu profile ${resolve(options.cpuProfilePath)}`);
      return result;
    } finally {
      session.disconnect();
    }
  })();
  const coveragePath = resolve('reports/search-coverage-loc-latest.json');
  const coverage = await (async () => {
    if (!existsSync(coveragePath)) return null;
    try {
      const raw = JSON.parse(await readFile(coveragePath, 'utf8')) as {
        roots?: string[];
        overlap?: string;
        totals?: {
          files?: number;
          lines?: number;
          uniqueFiles?: number;
          uniqueLines?: number;
        };
      };
      if (!raw?.totals) return null;
      return {
        files: Number(raw.totals.files || 0),
        lines: Number(raw.totals.lines || 0),
        uniqueFiles: Number(raw.totals.uniqueFiles || 0),
        uniqueLines: Number(raw.totals.uniqueLines || 0),
        roots: Array.isArray(raw.roots) ? raw.roots : [],
        overlapMode: raw.overlap || 'ignore',
      };
    } catch {
      return null;
    }
  })();
  if (coverage) {
    payload.coverage = coverage;
  }
  const policies = await loadSearchPolicies(options.path);
  const thresholdsApplied = resolveScoreThresholdsForQueryPack(
    policies,
    payload.queryPack || options.queryPack || queryPack
  );
  const currentMetrics = snapshotMetrics(payload);
  const previousMetrics = previousPayload ? snapshotMetrics(previousPayload) : null;
  const delta = computeDelta(currentMetrics, previousMetrics);
  const strictCurrent = profileById(payload, 'strict');
  const strictPrevious = profileById(previousPayload, 'strict');
  const strictQualityDelta =
    strictCurrent && strictPrevious
      ? Number((strictCurrent.qualityScore - strictPrevious.qualityScore).toFixed(2))
      : null;
  const strictSlopDelta =
    strictCurrent && strictPrevious
      ? Number((strictCurrent.avgSlopPct - strictPrevious.avgSlopPct).toFixed(2))
      : null;
  const strictReliabilityDelta = (() => {
    const curr = profileReliability(strictCurrent);
    const prev = profileReliability(strictPrevious);
    if (curr === null || prev === null) return null;
    return Number((curr - prev).toFixed(2));
  })();
  const strictReliabilityNow = profileReliability(strictCurrent);

  const warnings = evaluateStrictWarnings(
    {
      qualityDelta: strictQualityDelta,
      slopDelta: strictSlopDelta,
      reliabilityDelta: strictReliabilityDelta,
      reliabilityNow: strictReliabilityNow,
      latencyP95Ms: strictCurrent?.latencyP95Ms ?? null,
      peakHeapUsedMB: strictCurrent?.peakHeapUsedMB ?? null,
      peakRssMB: strictCurrent?.peakRssMB ?? null,
    },
    thresholdsApplied
  );
  payload.warnings = warnings;
  payload.thresholdsApplied = thresholdsApplied;
  payload.warningContext = {
    queryPack: payload.queryPack || options.queryPack || queryPack,
    strictMetrics: {
      qualityDelta: strictQualityDelta,
      slopDelta: strictSlopDelta,
      reliabilityDelta: strictReliabilityDelta,
      reliabilityNow: strictReliabilityNow,
      latencyP95Ms: strictCurrent?.latencyP95Ms ?? null,
      peakHeapUsedMB: strictCurrent?.peakHeapUsedMB ?? null,
      peakRssMB: strictCurrent?.peakRssMB ?? null,
    },
    thresholds: thresholdsApplied,
  };

  const summaryMd = renderSummaryMarkdown(
    id,
    createdAt,
    payload,
    delta,
    warnings,
    deltaBasis,
    baselineSnapshotId
  );

  const snapshotDir = resolve(outDir, id);
  await mkdir(snapshotDir, { recursive: true });

  const snapshotData = {
    id,
    createdAt,
    deltaBasis,
    baselineSnapshotId,
    delta,
    warnings,
    ...payload,
  };

  const snapshotJsonPath = resolve(snapshotDir, 'snapshot.json');
  const summaryMdPath = resolve(snapshotDir, 'summary.md');
  const latestJsonPath = resolve(outDir, 'latest.json');
  const latestMdPath = resolve(outDir, 'latest.md');
  const rssPath = resolve(outDir, 'rss.xml');
  const manifestPath = resolve(snapshotDir, 'publish-manifest.json');
  const baseManifest = {
    id,
    createdAt,
    queryPack: payload.queryPack || options.queryPack || 'core_delivery',
    overlap: payload.overlap || options.overlap,
    runClass: runClassForQueryPack(payload.queryPack || options.queryPack || 'core_delivery'),
    concurrency: payload.concurrency ?? options.concurrency ?? null,
    deltaBasis,
    baselineSnapshotId,
    delta,
    warnings,
    coverage: coverage || null,
    gzip: options.gzip,
    uploadRetries: options.uploadRetries,
    uploadedObjects: 0,
    uploads: [] as Array<{ key: string; attempts: number; elapsedMs: number }>,
    rssKey: null as string | null,
    mode: options.upload ? 'pending-upload' : 'local-only',
  };

  const snapshotJsonText = JSON.stringify(snapshotData, null, 2);
  await writeFile(snapshotJsonPath, snapshotJsonText);
  await writeFile(summaryMdPath, summaryMd);
  await writeFile(latestJsonPath, snapshotJsonText);
  await writeFile(latestMdPath, summaryMd);

  const index = existingIndex;
  const top = payload.rankedProfiles[0];
  const nextEntry: SnapshotIndexEntry = {
    id,
    createdAt,
    topProfile: top?.profile || 'n/a',
    topScore: top?.qualityScore || 0,
    queryPack: payload.queryPack || options.queryPack || 'core_delivery',
    localJson: snapshotJsonPath,
    localMd: summaryMdPath,
  };
  const snapshots = [nextEntry, ...index.snapshots.filter(s => s.id !== id)].slice(0, 100);
  const nextIndex: SnapshotIndex = {
    updatedAt: createdAt,
    snapshots,
  };
  await writeFile(indexPath, JSON.stringify(nextIndex, null, 2));
  const localRssText = buildRssFeed(nextIndex, {
    prefix: options.prefix.replace(/^\/+|\/+$/g, ''),
  });
  await writeFile(rssPath, localRssText);

  console.log(`[search-bench:snapshot] wrote ${snapshotJsonPath}`);
  console.log(`[search-bench:snapshot] wrote ${summaryMdPath}`);
  console.log(`[search-bench:snapshot] wrote ${latestJsonPath}`);
  console.log(`[search-bench:snapshot] wrote ${indexPath}`);
  console.log(`[search-bench:snapshot] wrote ${rssPath}`);

  if (!options.upload) {
    await writeFile(manifestPath, JSON.stringify(baseManifest, null, 2));
    console.log(`[search-bench:snapshot] wrote ${manifestPath}`);
    console.log('[search-bench:snapshot] upload disabled (--no-upload)');
    return;
  }

  const r2 = resolveR2Config(options);
  if (!r2) {
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          ...baseManifest,
          mode: 'upload-skipped-missing-r2-config',
        },
        null,
        2
      )
    );
    console.log(`[search-bench:snapshot] wrote ${manifestPath}`);
    console.log('[search-bench:snapshot] R2 config missing; skipped upload');
    console.log('[search-bench:snapshot] required: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME (or R2_BUCKET), plus R2_ACCOUNT_ID or R2_ENDPOINT');
    return;
  }

  const base = `${r2.prefix}/${id}`;
  const snapshotKey = `${base}/snapshot.json`;
  const summaryKey = `${base}/summary.md`;
  const latestJsonKey = `${r2.prefix}/latest.json`;
  const latestMdKey = `${r2.prefix}/latest.md`;
  const indexKey = `${r2.prefix}/index.json`;
  const manifestKey = `${base}/publish-manifest.json`;
  const rssKey = `${r2.prefix}/rss.xml`;

  const encoder = new TextEncoder();
  const snapshotJsonGz = Bun.gzipSync(encoder.encode(snapshotJsonText));
  const summaryMdGz = Bun.gzipSync(encoder.encode(summaryMd));

  type UploadStat = { key: string; attempts: number; elapsedMs: number };
  const uploadStats: UploadStat[] = [];

  const pushStat = (key: string, stat: { attempts: number; elapsedMs: number }): void => {
    uploadStats.push({ key, attempts: stat.attempts, elapsedMs: stat.elapsedMs });
  };

  const uploadJobs: Array<Promise<void>> = [
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadBytes(r2, snapshotKey, encoder.encode(snapshotJsonText), 'application/json'),
        options.uploadRetries
      );
      pushStat(snapshotKey, stat);
    })(),
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadText(r2, summaryKey, summaryMd, 'text/markdown'),
        options.uploadRetries
      );
      pushStat(summaryKey, stat);
    })(),
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadText(r2, latestJsonKey, snapshotJsonText, 'application/json'),
        options.uploadRetries
      );
      pushStat(latestJsonKey, stat);
    })(),
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadText(r2, latestMdKey, summaryMd, 'text/markdown'),
        options.uploadRetries
      );
      pushStat(latestMdKey, stat);
    })(),
  ];

  if (options.gzip) {
    uploadJobs.push(
      (async () => {
        const key = `${snapshotKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, snapshotJsonGz, 'application/json', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })(),
      (async () => {
        const key = `${summaryKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, summaryMdGz, 'text/markdown', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })(),
      (async () => {
        const key = `${latestJsonKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, snapshotJsonGz, 'application/json', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })(),
      (async () => {
        const key = `${latestMdKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, summaryMdGz, 'text/markdown', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })()
    );
  }

  await Promise.all(uploadJobs);

  const indexWithR2: SnapshotIndex = {
    ...nextIndex,
    snapshots: nextIndex.snapshots.map(s =>
      s.id === id
        ? {
            ...s,
            r2JsonKey: snapshotKey,
            r2MdKey: summaryKey,
            r2ManifestKey: manifestKey,
          }
        : s
    ),
  };
  const indexJsonText = JSON.stringify(indexWithR2, null, 2);
  const rssText = buildRssFeed(indexWithR2, {
    bucket: r2.bucket,
    prefix: r2.prefix,
    publicBase: r2.publicBase,
  });
  const indexStat = await uploadWithRetry(
    () => uploadText(r2, indexKey, indexJsonText, 'application/json'),
    options.uploadRetries
  );
  pushStat(indexKey, indexStat);
  await writeFile(rssPath, rssText);
  const rssStat = await uploadWithRetry(
    () => uploadText(r2, rssKey, rssText, 'application/rss+xml'),
    options.uploadRetries
  );
  pushStat(rssKey, rssStat);
  if (options.gzip) {
    const key = `${indexKey}.gz`;
    const stat = await uploadWithRetry(
      () => uploadTextEncoded(r2, key, Bun.gzipSync(encoder.encode(indexJsonText)), 'application/json', 'gzip'),
      options.uploadRetries
    );
    pushStat(key, stat);
    const rssGzKey = `${rssKey}.gz`;
    const rssGzStat = await uploadWithRetry(
      () => uploadTextEncoded(r2, rssGzKey, Bun.gzipSync(encoder.encode(rssText)), 'application/rss+xml', 'gzip'),
      options.uploadRetries
    );
    pushStat(rssGzKey, rssGzStat);
  }
  await writeFile(indexPath, JSON.stringify(indexWithR2, null, 2));

  const manifest = {
    id,
    createdAt,
    queryPack: payload.queryPack || options.queryPack || 'core_delivery',
    runClass: runClassForQueryPack(payload.queryPack || options.queryPack || 'core_delivery'),
    concurrency: payload.concurrency ?? options.concurrency ?? null,
    deltaBasis,
    baselineSnapshotId,
    delta,
    warnings,
    bucket: r2.bucket,
    prefix: r2.prefix,
    gzip: options.gzip,
    uploadRetries: options.uploadRetries,
    uploadedObjects: uploadStats.length,
    uploads: uploadStats.sort((a, b) => a.key.localeCompare(b.key)),
    rssKey,
    mode: 'uploaded',
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[search-bench:snapshot] wrote ${manifestPath}`);

  const manifestText = JSON.stringify(manifest, null, 2);
  const manifestStat = await uploadWithRetry(
    () => uploadText(r2, manifestKey, manifestText, 'application/json'),
    options.uploadRetries
  );
  pushStat(manifestKey, manifestStat);
  if (options.gzip) {
    const key = `${manifestKey}.gz`;
    const stat = await uploadWithRetry(
      () => uploadTextEncoded(r2, key, Bun.gzipSync(encoder.encode(manifestText)), 'application/json', 'gzip'),
      options.uploadRetries
    );
    pushStat(key, stat);
  }

  if (r2.publicBase) {
    const pub = r2.publicBase.replace(/\/+$/g, '');
    console.log(`[search-bench:snapshot] uploaded ${pub}/${id}/snapshot.json`);
    console.log(`[search-bench:snapshot] uploaded ${pub}/${id}/summary.md`);
    console.log(`[search-bench:snapshot] latest ${pub}/latest.json`);
    console.log(`[search-bench:snapshot] index ${pub}/index.json`);
  } else {
    console.log(`[search-bench:snapshot] uploaded bucket=${r2.bucket}`);
    console.log(`[search-bench:snapshot] snapshot key=${snapshotKey}`);
    console.log(`[search-bench:snapshot] summary key=${summaryKey}`);
    console.log(`[search-bench:snapshot] latest key=${latestJsonKey}`);
    console.log(`[search-bench:snapshot] index key=${indexKey}`);
    if (options.gzip) {
      console.log(`[search-bench:snapshot] gzip variants enabled (.gz)`);
    }
  }
}

await main();

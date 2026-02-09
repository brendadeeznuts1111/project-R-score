#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  LOOP_FRESHNESS_WINDOW_MINUTES,
  formatLoopClosedReason,
  isLoopClosedByPolicy,
  normalizeWarningCode,
} from './lib/search-status-contract';

type StageStatus = 'pass' | 'warn' | 'fail';

type Stage = {
  id:
    | 'cli_search'
    | 'benchmark_snapshot'
    | 'coverage_kpi'
    | 'signal_quality'
    | 'signal_latency'
    | 'signal_memory'
    | 'dashboard_parity'
    | 'status_freshness';
  status: StageStatus;
  reason: string;
  evidence?: string[];
};

type CoverageKpi = {
  files: number;
  lines: number;
  uniqueFiles: number;
  uniqueLines: number;
  roots: string[];
  overlapMode: 'ignore' | 'remove' | string;
} | null;

type LoopStatus = {
  generatedAt: string;
  latestSnapshotId: string | null;
  queryPack: string | null;
  warnings: string[];
  coverage: CoverageKpi;
  freshness: {
    latestSnapshotIdSeen: string | null;
    loopStatusSnapshotId: string | null;
    isAligned: boolean;
    staleMinutes: number | null;
  };
  stages: Stage[];
  loopClosed: boolean;
  loopClosedReason: string;
};

type LatestSnapshot = {
  id?: string;
  createdAt?: string;
  queryPack?: string;
  warnings?: string[];
  deltaBasis?: string;
  baselineSnapshotId?: string | null;
  rankedProfiles?: Array<{
    profile?: string;
    qualityScore?: number;
    avgSlopPct?: number;
    avgUniqueFamilyPct?: number;
    avgSignalPct?: number;
    latencyP95Ms?: number;
    peakHeapUsedMB?: number;
    peakRssMB?: number;
  }>;
  coverage?: CoverageKpi;
};

type CoveragePayload = {
  roots?: string[];
  overlap?: string;
  totals?: {
    files?: number;
    lines?: number;
    uniqueFiles?: number;
    uniqueLines?: number;
  };
};

function profileByName(snapshot: LatestSnapshot | null, name: string) {
  const profiles = snapshot?.rankedProfiles || [];
  return profiles.find((p) => String(p.profile || '').toLowerCase() === name.toLowerCase()) || null;
}

function reliability(profile: ReturnType<typeof profileByName>): number | null {
  if (!profile) return null;
  const signal = Number(profile.avgSignalPct || 0);
  const unique = Number(profile.avgUniqueFamilyPct || 0);
  if (!Number.isFinite(signal) || !Number.isFinite(unique)) return null;
  return Number(((signal * unique) / 100).toFixed(2));
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toCoverage(payload: CoveragePayload | null): CoverageKpi {
  if (!payload?.totals) return null;
  const totals = payload.totals;
  return {
    files: Number(totals.files || 0),
    lines: Number(totals.lines || 0),
    uniqueFiles: Number(totals.uniqueFiles || 0),
    uniqueLines: Number(totals.uniqueLines || 0),
    roots: Array.isArray(payload.roots) ? payload.roots : [],
    overlapMode: payload.overlap || 'ignore',
  };
}

function stage(
  id: Stage['id'],
  status: StageStatus,
  reason: string,
  evidence: string[] = []
): Stage {
  return { id, status, reason, evidence };
}

function buildMarkdown(status: LoopStatus): string {
  const lines: string[] = [];
  lines.push('# Search Loop Status');
  lines.push('');
  lines.push(`- Generated: \`${status.generatedAt}\``);
  lines.push(`- Latest Snapshot: \`${status.latestSnapshotId || 'none'}\``);
  lines.push(`- Query Pack: \`${status.queryPack || 'n/a'}\``);
  lines.push(`- Loop Closed: \`${status.loopClosed ? 'yes' : 'no'}\``);
  lines.push(`- Loop Closed Reason: ${status.loopClosedReason}`);
  lines.push(`- Active Warnings: ${status.warnings.length > 0 ? status.warnings.join(', ') : 'none'}`);
  lines.push(`- Freshness Aligned: \`${status.freshness.isAligned ? 'yes' : 'no'}\``);
  lines.push(`- Freshness Stale Minutes: \`${status.freshness.staleMinutes ?? 'n/a'}\``);
  lines.push(`- Latest Snapshot Seen: \`${status.freshness.latestSnapshotIdSeen || 'none'}\``);
  lines.push(`- Loop Snapshot ID: \`${status.freshness.loopStatusSnapshotId || 'none'}\``);
  lines.push('');
  lines.push('## Coverage KPI');
  if (!status.coverage) {
    lines.push('- coverage: unavailable');
  } else {
    lines.push(`- roots: \`${status.coverage.roots.join(', ')}\``);
    lines.push(`- overlapMode: \`${status.coverage.overlapMode}\``);
    lines.push(`- files: **${status.coverage.files}**`);
    lines.push(`- lines: **${status.coverage.lines}**`);
    lines.push(`- uniqueFiles: **${status.coverage.uniqueFiles}**`);
    lines.push(`- uniqueLines: **${status.coverage.uniqueLines}**`);
  }
  lines.push('');
  lines.push('## Stage Status');
  lines.push('| Stage | Status | Reason | Evidence |');
  lines.push('|---|---|---|---|');
  for (const s of status.stages) {
    lines.push(`| ${s.id} | ${s.status} | ${s.reason} | ${(s.evidence || []).join('<br/>') || '-'} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const latestPath = resolve('reports/search-benchmark/latest.json');
  const indexPath = resolve('reports/search-benchmark/index.json');
  const coveragePath = resolve('reports/search-coverage-loc-latest.json');
  const outJson = resolve('reports/search-loop-status-latest.json');
  const outMd = resolve('reports/search-loop-status-latest.md');

  const latest = await readJsonFile<LatestSnapshot>(latestPath);
  const index = await readJsonFile<{ snapshots?: Array<{ id?: string }> }>(indexPath);
  const coverageRaw = await readJsonFile<CoveragePayload>(coveragePath);
  const coverage = toCoverage(coverageRaw);

  const strict = profileByName(latest, 'strict');
  const strictReliability = reliability(strict);
  const warnings = Array.isArray(latest?.warnings)
    ? latest!.warnings.map((code) => normalizeWarningCode(code)).filter(Boolean)
    : [];
  const latestSnapshotIdSeen = index?.snapshots?.[0]?.id || null;
  const loopStatusSnapshotId = latest?.id || null;
  const isAligned = Boolean(latestSnapshotIdSeen && loopStatusSnapshotId && latestSnapshotIdSeen === loopStatusSnapshotId);
  // Loop-status freshness is based on status generation age (not snapshot age).
  // At generation time this is effectively fresh; API readers may recompute over time.
  const staleMinutes = 0;
  const freshnessWindowMinutes = LOOP_FRESHNESS_WINDOW_MINUTES;
  const hasQualityWarn = warnings.includes('quality_drop_warn') || warnings.includes('slop_rise_warn') || warnings.includes('reliability_drop_warn');
  const hasLatencyWarn = warnings.includes('latency_p95_warn');
  const hasMemoryWarn = warnings.includes('heap_peak_warn') || warnings.includes('rss_peak_warn');

  const stages: Stage[] = [];

  stages.push(
    latest?.id && strict
      ? stage(
          'cli_search',
          'pass',
          'Strict profile found in latest snapshot.',
          [latestPath, `strict.quality=${Number(strict.qualityScore || 0).toFixed(2)}`]
        )
      : stage('cli_search', 'fail', 'Strict profile missing from latest snapshot.', [latestPath])
  );

  stages.push(
    latest?.id && latest.deltaBasis === 'same-pack' && Boolean(latest.baselineSnapshotId)
      ? stage(
          'benchmark_snapshot',
          'pass',
          'Latest snapshot has same-pack baseline lineage.',
          [latestPath, `baseline=${latest.baselineSnapshotId}`]
        )
      : stage(
          'benchmark_snapshot',
          latest?.id ? 'warn' : 'fail',
          latest?.id ? 'Latest snapshot exists but same-pack baseline is unavailable.' : 'Latest snapshot not found.',
          [latestPath, indexPath]
        )
  );

  stages.push(
    coverage && coverage.lines > 0 && coverage.roots.length > 0
      ? stage(
          'coverage_kpi',
          'pass',
          'Searchable LOC coverage is available.',
          [coveragePath, `lines=${coverage.lines}`, `roots=${coverage.roots.join(',')}`]
        )
      : stage(
          'coverage_kpi',
          coverage ? 'warn' : 'warn',
          'Coverage KPI missing or incomplete.',
          [coveragePath]
        )
  );

  stages.push(
    hasQualityWarn
      ? stage('signal_quality', 'warn', 'Quality/slop/reliability warning present.', warnings.filter((w) => ['quality_drop_warn', 'slop_rise_warn', 'reliability_drop_warn'].includes(w)))
      : stage(
          'signal_quality',
          'pass',
          'Quality signal stable.',
          [strict ? `quality=${Number(strict.qualityScore || 0).toFixed(2)}` : 'strict=missing', strictReliability !== null ? `reliability=${strictReliability.toFixed(2)}` : 'reliability=n/a']
        )
  );

  stages.push(
    hasLatencyWarn
      ? stage('signal_latency', 'warn', 'Latency warning present.', [strict ? `strict.p95=${Number(strict.latencyP95Ms || 0).toFixed(2)}ms` : 'strict.p95=n/a'])
      : stage('signal_latency', 'pass', 'Latency signal stable.', [strict ? `strict.p95=${Number(strict.latencyP95Ms || 0).toFixed(2)}ms` : 'strict.p95=n/a'])
  );

  stages.push(
    hasMemoryWarn
      ? stage('signal_memory', 'warn', 'Heap/RSS warning present.', [
          strict ? `strict.peakHeap=${Number(strict.peakHeapUsedMB || 0).toFixed(2)}MB` : 'strict.peakHeap=n/a',
          strict ? `strict.peakRss=${Number(strict.peakRssMB || 0).toFixed(2)}MB` : 'strict.peakRss=n/a',
        ])
      : stage('signal_memory', 'pass', 'Memory signal stable.', [
          strict ? `strict.peakHeap=${Number(strict.peakHeapUsedMB || 0).toFixed(2)}MB` : 'strict.peakHeap=n/a',
          strict ? `strict.peakRss=${Number(strict.peakRssMB || 0).toFixed(2)}MB` : 'strict.peakRss=n/a',
        ])
  );

  const parityInputsOk = Boolean(latest?.id && Array.isArray(warnings) && coverage);
  stages.push(
    parityInputsOk
      ? stage('dashboard_parity', 'pass', 'Loop status includes snapshot/warnings/coverage for dashboard parity checks.', [latestPath, coveragePath])
      : stage('dashboard_parity', 'fail', 'Missing parity inputs for dashboard stage.', [latestPath, coveragePath])
  );
  if (!latestSnapshotIdSeen || !loopStatusSnapshotId || !isAligned) {
    stages.push(
      stage(
        'status_freshness',
        'fail',
        'Loop status snapshot is misaligned with latest benchmark snapshot.',
        [`latestSeen=${latestSnapshotIdSeen || 'none'}`, `loopSnapshot=${loopStatusSnapshotId || 'none'}`]
      )
    );
  } else if (staleMinutes > freshnessWindowMinutes) {
    stages.push(
      stage(
        'status_freshness',
        'warn',
        `Loop status snapshot is older than ${freshnessWindowMinutes} minutes.`,
        [`staleMinutes=${staleMinutes.toFixed(2)}`, `freshnessWindow=${freshnessWindowMinutes}`]
      )
    );
  } else {
    stages.push(
      stage(
        'status_freshness',
        'pass',
        'Loop status snapshot is aligned and fresh.',
        [`staleMinutes=${staleMinutes === null ? 'n/a' : staleMinutes.toFixed(2)}`]
      )
    );
  }

  const loopPolicy = isLoopClosedByPolicy(stages as any);
  const loopClosed = loopPolicy.loopClosed;
  const loopClosedReason = formatLoopClosedReason(stages as any);

  const output: LoopStatus = {
    generatedAt,
    latestSnapshotId: latest?.id || null,
    queryPack: latest?.queryPack || null,
    warnings,
    coverage,
    freshness: {
      latestSnapshotIdSeen,
      loopStatusSnapshotId,
      isAligned,
      staleMinutes: Number(staleMinutes.toFixed(2)),
    },
    stages,
    loopClosed,
    loopClosedReason,
  };

  await writeFile(outJson, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(outMd, buildMarkdown(output));
  console.log(`[search:loop:status] wrote ${outJson}`);
  console.log(`[search:loop:status] wrote ${outMd}`);
}

await main();

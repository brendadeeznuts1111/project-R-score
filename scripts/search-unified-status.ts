#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDomainRegistryStatus } from './domain-registry-status';
import { runSearchStatusContract } from './search-status-contract-check';
import {
  LOOP_FRESHNESS_WINDOW_MINUTES,
  computeOverallStatus,
  formatLoopClosedReason,
  freshnessStatus,
  isLoopClosedByPolicy,
  mapLoopStageToStatusLevel,
  normalizeWarningCode,
  type LoopStage,
  type StatusLevel,
  type UnifiedContractCheck,
  type UnifiedStatusSnapshot,
} from './lib/search-status-contract';

type Options = {
  json: boolean;
  strict: boolean;
  source: 'local' | 'r2';
  domain: string;
  latestPath: string;
  loopPath: string;
  rssPath: string;
};

function parseArgs(argv: string[]): Options {
  const out: Options = {
    json: true,
    strict: false,
    source: 'local',
    domain: (Bun.env.SEARCH_BENCH_DOMAIN || 'factory-wager.com').trim().toLowerCase(),
    latestPath: 'reports/search-benchmark/latest.json',
    loopPath: 'reports/search-loop-status-latest.json',
    rssPath: 'reports/search-benchmark/rss.xml',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      out.json = true;
      continue;
    }
    if (arg === '--strict') {
      out.strict = true;
      continue;
    }
    if (arg === '--source') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value === 'local' || value === 'r2') out.source = value;
      i += 1;
      continue;
    }
    if (arg === '--domain') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value) out.domain = value;
      i += 1;
      continue;
    }
    if (arg === '--latest') {
      out.latestPath = argv[i + 1] || out.latestPath;
      i += 1;
      continue;
    }
    if (arg === '--loop') {
      out.loopPath = argv[i + 1] || out.loopPath;
      i += 1;
      continue;
    }
    if (arg === '--rss') {
      out.rssPath = argv[i + 1] || out.rssPath;
      i += 1;
      continue;
    }
    if (arg === '--text') {
      out.json = false;
      continue;
    }
  }
  return out;
}

async function readJsonIfExists(path: string): Promise<any | null> {
  const resolvedPath = resolve(path);
  if (!existsSync(resolvedPath)) return null;
  try {
    const text = await readFile(resolvedPath, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asLoopStages(raw: any): LoopStage[] {
  const rows = Array.isArray(raw?.stages) ? raw.stages : [];
  return rows
    .map((stage: any) => ({
      id: String(stage?.id || '') as LoopStage['id'],
      status: String(stage?.status || '').toLowerCase() as LoopStage['status'],
      reason: String(stage?.reason || ''),
      evidence: Array.isArray(stage?.evidence) ? stage.evidence.map((v: any) => String(v)) : [],
    }))
    .filter((stage: any) => stage.id && stage.status);
}

function toContractChecks(result: Awaited<ReturnType<typeof runSearchStatusContract>>): UnifiedContractCheck[] {
  return result.checks.map((check) => ({
    id: check.id,
    ok: check.ok,
    detail: check.detail,
    status: check.ok ? 'ok' : 'fail',
  }));
}

async function buildUnifiedStatus(options: Options): Promise<UnifiedStatusSnapshot> {
  const [latest, loopRaw, contract, domainStatus] = await Promise.all([
    readJsonIfExists(options.latestPath),
    readJsonIfExists(options.loopPath),
    runSearchStatusContract({
      latestJsonPath: options.latestPath,
      loopStatusPath: options.loopPath,
      rssPath: options.rssPath,
    }),
    buildDomainRegistryStatus({
      registryPath: Bun.env.DOMAIN_REGISTRY_PATH,
      latestPath: options.latestPath,
      healthReportPath: 'reports/health-report.json',
      envFile: '.env.factory-wager',
      json: true,
      doctor: false,
      fix: false,
      emitSecretsCommands: false,
    }),
  ]);

  const warnings = Array.isArray(latest?.warnings)
    ? latest.warnings.map((code: unknown) => normalizeWarningCode(code)).filter(Boolean)
    : [];

  const stages = asLoopStages(loopRaw);
  const staleMinutes = typeof loopRaw?.freshness?.staleMinutes === 'number'
    ? Number(loopRaw.freshness.staleMinutes)
    : null;
  const latestSnapshotIdSeen = contract.summary.latestId || loopRaw?.freshness?.latestSnapshotIdSeen || null;
  const loopSnapshotId = loopRaw?.latestSnapshotId || contract.summary.loopStatusSnapshotId || null;
  const freshLevel = freshnessStatus({
    latestSnapshotIdSeen,
    loopStatusSnapshotId: loopSnapshotId,
    staleMinutes,
    windowMinutes: LOOP_FRESHNESS_WINDOW_MINUTES,
  });

  const domainReadiness = {
    totalDomains: Number(domainStatus.registry.totalDomains || 0),
    tokenConfigured: Number(domainStatus.registry.tokenConfigured || 0),
    tokenMissing: Number(domainStatus.registry.tokenMissing || 0),
    onlineRows: Number(domainStatus.domainHealth.onlineRows || 0),
    checkedRows: Number(domainStatus.domainHealth.checkedRows || 0),
    onlineRatio:
      typeof domainStatus.domainHealth.onlineRatio === 'number'
        ? Number(domainStatus.domainHealth.onlineRatio)
        : null,
    blocked:
      Number(domainStatus.registry.tokenMissing || 0) > 0 ||
      (Number(domainStatus.domainHealth.checkedRows || 0) > 0 && Number(domainStatus.domainHealth.onlineRows || 0) === 0),
    reasons: [
      Number(domainStatus.registry.tokenMissing || 0) > 0
        ? `missing_domain_tokens=${Number(domainStatus.registry.tokenMissing || 0)}`
        : '',
      Number(domainStatus.domainHealth.checkedRows || 0) > 0
        ? `online_rows=${Number(domainStatus.domainHealth.onlineRows || 0)}/${Number(domainStatus.domainHealth.checkedRows || 0)}`
        : '',
    ].filter(Boolean),
  };

  const stageLevels = stages.map((stage) => mapLoopStageToStatusLevel(stage.status));
  const contractChecks = toContractChecks(contract);
  const checkLevels = contractChecks.map((check) => check.status);
  const domainLevel: StatusLevel = domainReadiness.blocked ? 'warn' : 'ok';
  const overallStatus = computeOverallStatus([...stageLevels, ...checkLevels, freshLevel, domainLevel]);
  const loopPolicy = isLoopClosedByPolicy(stages);

  return {
    generatedAt: new Date().toISOString(),
    latestSnapshotId: contract.summary.latestId || latest?.id || null,
    loopSnapshotId,
    freshness: {
      latestSnapshotIdSeen,
      loopStatusSnapshotId: loopSnapshotId,
      isAligned: Boolean(latestSnapshotIdSeen && loopSnapshotId && latestSnapshotIdSeen === loopSnapshotId),
      staleMinutes,
      windowMinutes: LOOP_FRESHNESS_WINDOW_MINUTES,
      status: freshLevel,
    },
    warnings,
    stages,
    domainReadiness,
    contractChecks,
    overall: {
      status: overallStatus,
      loopClosed: loopPolicy.loopClosed,
      reason: formatLoopClosedReason(stages),
    },
  };
}

function printText(status: UnifiedStatusSnapshot): void {
  console.log(`Unified Search Status (${status.generatedAt})`);
  console.log(`Overall: ${status.overall.status}`);
  console.log(`Loop closed: ${status.overall.loopClosed}`);
  console.log(`Latest snapshot: ${status.latestSnapshotId || 'n/a'}`);
  console.log(`Freshness: ${status.freshness.status} aligned=${status.freshness.isAligned} staleMinutes=${status.freshness.staleMinutes ?? 'n/a'}`);
  console.log(`Domain readiness: tokens ${status.domainReadiness.tokenConfigured}/${status.domainReadiness.totalDomains}, online ${status.domainReadiness.onlineRows}/${status.domainReadiness.checkedRows}`);
  if (status.domainReadiness.reasons.length > 0) {
    console.log(`Reasons: ${status.domainReadiness.reasons.join(', ')}`);
  }
}

if (import.meta.main) {
  const options = parseArgs(process.argv.slice(2));
  const unified = await buildUnifiedStatus(options);
  if (options.json) {
    console.log(JSON.stringify(unified, null, 2));
  } else {
    printText(unified);
  }

  if (options.strict) {
    if (unified.overall.status === 'fail') process.exit(3);
    if (unified.overall.status === 'warn') process.exit(2);
  }
  process.exit(unified.overall.status === 'fail' ? 3 : unified.overall.status === 'warn' ? 2 : 0);
}

export { buildUnifiedStatus, parseArgs };

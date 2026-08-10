#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/networking/fetch — fetch
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Ops summary endpoint diagnosis — shape, DB, snapshot freshness, routing drift.
 *
 *   bun run ops:diagnose
 *   bun run ops:diagnose --base-url http://localhost:3000 --compare-routing
 *   bun run ops:diagnose --json
 *
 * @see docs/harness/ops-summary-endpoint.md
 */
import { jsonOut } from '../lib/console-depth.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  embeddedRoutingFailures,
  formatComplianceBoardLine,
  formatSourceLabel,
  severityToExitCode,
  snapshotAgeWarn,
} from '../lib/operations/ops-summary-diagnose-format.ts';
import {
  CRITICAL_ROUTE_PATHS,
  classifySummaryPayload,
  detectRoutingDrift,
  parseSummaryShape,
  type OpsSummaryDiagnoseShape,
} from '../lib/operations/ops-summary-diagnose.ts';

const SNAPSHOT_PATH = 'public/registry/ops-summary.json';
const SNAPSHOT_MAX_AGE_MS = 24 * 3_600_000;

type CliOpts = {
  baseUrl: string;
  json: boolean;
  compareRouting: boolean;
};

function parseArgs(argv: string[]): CliOpts {
  let baseUrl = 'http://localhost:3000';
  let json = false;
  let compareRouting = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--compare-routing') compareRouting = true;
    else if (a === '--base-url' && argv[i + 1]) {
      baseUrl = argv[++i]!;
    }
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), json, compareRouting };
}

async function probeRoute(baseUrl: string, path: string): Promise<number | 'ERR'> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res.status;
  } catch {
    return 'ERR';
  }
}

function countTreeNodes(): number | null {
  try {
    const db = openOperationsDb({ path: DEFAULT_OPS_DB_PATH });
    const row = db.query('SELECT COUNT(*) AS n FROM tree_nodes').get() as { n: number };
    db.close();
    return row.n;
  } catch {
    return null;
  }
}

async function snapshotLastModified(): Promise<number | null> {
  const f = Bun.file(SNAPSHOT_PATH);
  if (!(await f.exists())) return null;
  return f.lastModified;
}

export type DiagnoseReport = {
  baseUrl: string;
  httpStatus: number;
  shape: OpsSummaryDiagnoseShape;
  sourceLabel: string;
  classification: ReturnType<typeof classifySummaryPayload>;
  treeNodes: number | null;
  snapshotModified: string | null;
  snapshotWarn: string | null;
  routingDrift: boolean;
  embeddedRoutingBaseUrl: string | undefined;
  embeddedRoutingFailures: ReturnType<typeof embeddedRoutingFailures>;
  criticalRoutes: Array<{ path: string; status: number | 'ERR' }>;
  liveRoutingCompare: Array<{
    path: string;
    embeddedStatus: number | string;
    liveStatus: number | 'ERR';
  }>;
};

export async function runDiagnose(opts: CliOpts): Promise<DiagnoseReport> {
  const summaryUrl = `${opts.baseUrl}/api/operations/summary`;
  let httpStatus = 0;
  let payload: unknown = {};
  try {
    const res = await fetch(summaryUrl, { headers: { Accept: 'application/json' } });
    httpStatus = res.status;
    payload = await res.json().catch(() => ({}));
  } catch (e) {
    httpStatus = 0;
    payload = { source: 'none', error: e instanceof Error ? e.message : String(e) };
  }

  const shape = parseSummaryShape(payload);
  const classification = classifySummaryPayload(shape, httpStatus);
  const treeNodes = countTreeNodes();
  const snapMs = await snapshotLastModified();
  const snapWarn = snapshotAgeWarn(snapMs, Date.now(), SNAPSHOT_MAX_AGE_MS);
  const routingDrift = detectRoutingDrift(shape.routing?.baseUrl, opts.baseUrl);
  const failures = embeddedRoutingFailures(shape);

  const criticalRoutes: DiagnoseReport['criticalRoutes'] = [];
  for (const path of CRITICAL_ROUTE_PATHS) {
    criticalRoutes.push({ path, status: await probeRoute(opts.baseUrl, path) });
  }

  const liveRoutingCompare: DiagnoseReport['liveRoutingCompare'] = [];
  if (opts.compareRouting) {
    for (const f of failures) {
      liveRoutingCompare.push({
        path: f.path,
        embeddedStatus: f.status,
        liveStatus: await probeRoute(opts.baseUrl, f.path),
      });
    }
  }

  if (snapWarn) classification.reasons.push(snapWarn);
  if (routingDrift && shape.routing?.baseUrl) {
    classification.reasons.push(
      `routing drift: artifact ${shape.routing.baseUrl} vs probe ${opts.baseUrl}`
    );
    if (failures.length > 0 && classification.severity === 'ok') {
      classification.severity = 'warn';
    }
  }

  return {
    baseUrl: opts.baseUrl,
    httpStatus,
    shape,
    sourceLabel: formatSourceLabel(shape),
    classification,
    treeNodes,
    snapshotModified: snapMs != null ? new Date(snapMs).toISOString() : null,
    snapshotWarn: snapWarn,
    routingDrift,
    embeddedRoutingBaseUrl: shape.routing?.baseUrl,
    embeddedRoutingFailures: failures,
    criticalRoutes,
    liveRoutingCompare,
  };
}

function printHuman(report: DiagnoseReport): void {
  const s = report.shape;
  console.info('Ops summary diagnose\n');
  console.info(`  baseUrl       ${report.baseUrl}`);
  console.info(`  HTTP          ${report.httpStatus || 'ERR'}`);
  console.info(`  source        ${report.sourceLabel} (${s.source ?? '?'})`);
  if (s.fallback) console.info(`  fallback      ${s.fallback}`);
  console.info(`  channelMeta   ${s.channelMeta?.passed ?? '—'}/${s.channelMeta?.total ?? '—'}`);
  console.info(`  routing       ${s.routing?.passed ?? '—'}/${s.routing?.total ?? '—'}`);
  if (report.embeddedRoutingBaseUrl) {
    console.info(`  routing base  ${report.embeddedRoutingBaseUrl}`);
  }
  {
    const complianceLine = formatComplianceBoardLine(s.compliance);
    if (complianceLine != null) {
      console.info(`  compliance    ${complianceLine}`);
    }
  }
  {
    const L = s.liquidity || {};
    const pos = L.positions;
    const pool = L.pool;
    const posBit =
      pos && (pos.count ?? 0) > 0
        ? ` · pos avail $${pos.available ?? 0} / dep $${pos.deposited ?? 0} / in-play $${pos.inPlay ?? 0} (n=${pos.count})`
        : '';
    const poolBit =
      pool && (pool.totalLiquidity ?? 0) > 0
        ? ` · pool $${pool.totalLiquidity} − exp $${pool.totalExposure ?? 0} = $${pool.available ?? 0}`
        : '';
    console.info(`  liquidity     $${L.total ?? 0} accounts${posBit}${poolBit}`);
  }
  console.info(`  tree_nodes    ${report.treeNodes ?? 'unreachable'}`);
  console.info(`  snapshot mtime ${report.snapshotModified ?? 'missing'}`);
  console.info(`  severity      ${report.classification.severity}`);
  for (const r of report.classification.reasons) {
    console.info(`    · ${r}`);
  }
  console.info('\n  critical routes');
  for (const r of report.criticalRoutes) {
    console.info(`    ${r.path} → ${r.status}`);
  }
  if (report.embeddedRoutingFailures.length > 0) {
    console.info('\n  embedded routing failures');
    for (const f of report.embeddedRoutingFailures) {
      console.info(`    ${f.path} → ${f.status}`);
    }
  }
  if (report.liveRoutingCompare.length > 0) {
    console.info('\n  live compare (embedded fail paths)');
    for (const c of report.liveRoutingCompare) {
      console.info(`    ${c.path} embedded=${c.embeddedStatus} live=${c.liveStatus}`);
    }
  }
  console.info('\n  runbook: bun run docs:ops-summary-endpoint');
}

async function main(): Promise<void> {
  const opts = parseArgs(applyUnknownLongOptionGuardFor('ops:diagnose', Bun.argv.slice(2)));
  const report = await runDiagnose(opts);
  if (opts.json) {
    jsonOut(report);
  } else {
    printHuman(report);
  }
  process.exit(severityToExitCode(report.classification.severity));
}

if (import.meta.main) {
  await main();
}

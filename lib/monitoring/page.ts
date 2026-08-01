// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
/**
 * Server-rendered monitoring HTML using Bun.inspect.table.
 */
import { stripANSI } from 'bun';
import type { MonitoringPayload } from './collect.ts';
import { inspectTable } from '../console-depth.ts';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tableSection(title: string, rows: Record<string, string | number>[]): string {
  // colors: false — ANSI codes are noise in HTML <pre>
  const body = inspectTable(rows, undefined, { colors: false });
  const plain = stripANSI(body);
  return `<div class="section"><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(plain)}</pre></div>`;
}

/** Render networking proof section (target-by-target with reuse metrics). */
function networkingProofSection(
  proof: import('./collect.ts').NetworkingChecksReport | undefined | null
): string {
  if (!proof)
    return tableSection('Networking proof', [
      { Metric: 'Status', Value: 'not available — run bun run check:networking:save' },
    ]);
  const targetRows = proof.targets.map(t => ({
    Target: t.name,
    Protocol: t.summary.protocol,
    Reuse: `${t.summary.reuseEfficiency.toFixed(1)}×`,
    'Cold(ms)': t.summary.coldFetchMs.toFixed(1),
    'Warm(ms)': t.summary.warmFetchMs.toFixed(1),
    Status: t.summary.statusCode,
  }));
  const summary = tableSection('Networking proof — per target', targetRows);
  const meta = tableSection('Networking summary', [
    { Metric: 'Report type', Value: proof.reportType },
    { Metric: 'Proof hash', Value: proof.proofHash.slice(0, 16) + '…' },
    { Metric: 'All OK', Value: String(proof.allOk) },
    { Metric: 'Targets', Value: String(proof.totalTargets) },
    { Metric: 'Bun version', Value: proof.bunVersion },
    { Metric: 'Generated', Value: proof.timestamp },
  ]);
  return summary + meta;
}

/** Render full monitoring HTML page from payload. */
export function renderMonitoringHtml(data: MonitoringPayload): string {
  const overview = tableSection('Registry overview', [
    { Metric: 'Uptime', Value: data.uptime },
    { Metric: 'Packages', Value: data.packageCount },
    { Metric: 'Versions', Value: data.versionCount },
    { Metric: 'DOD queue (pending)', Value: data.dodQueue },
    { Metric: 'Experiments active', Value: data.experimentsActive },
    { Metric: 'Prediction rows', Value: data.predictionN },
    { Metric: 'Source', Value: data.source },
  ]);

  const integrity = tableSection('Last integrity check', [
    { Metric: 'Status', Value: data.lastIntegrity.status },
    { Metric: 'Timestamp', Value: data.lastIntegrity.timestamp ?? 'never' },
    { Metric: 'Failures', Value: data.lastIntegrity.failures },
    { Metric: 'Source', Value: data.lastIntegrity.source ?? 'unknown' },
  ]);

  const platformRows = Object.entries(data.platformSummary).map(([status, count]) => ({
    Status: status,
    Count: count,
  }));
  const platforms = tableSection(
    'Platform health (status)',
    platformRows.length ? platformRows : [{ Status: 'none', Count: 0 }]
  );

  const api = tableSection('Platform API available', [
    { Metric: 'api_available=1', Value: data.platformApiAvailable.yes },
    { Metric: 'api_available=0', Value: data.platformApiAvailable.no },
  ]);

  const dodRows = Object.entries(data.dodByStatus).map(([status, count]) => ({
    Status: status,
    Count: count,
  }));
  const dod = tableSection(
    'DOD submissions',
    dodRows.length ? dodRows : [{ Status: 'none', Count: 0 }]
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="30" />
  <title>Monitoring · FactoryWager</title>
  <style>
    :root { --bg: #0d1117; --panel: #161b22; --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff; --border: #30363d; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 2rem; line-height: 1.4; }
    h1 { color: var(--accent); font-size: 1.35rem; margin: 0 0 0.5rem; font-weight: 600; }
    h2 { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 0.5rem; font-weight: 500; }
    .meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
    .section { margin-bottom: 1.5rem; }
    pre { background: var(--panel); border: 1px solid var(--border); padding: 1rem; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 13px; }
    a { color: var(--accent); }
    nav { margin-bottom: 1.25rem; display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.9rem; }
  </style>
</head>
<body>
  <nav>
    <a href="/portal/">Portal</a>
    <a href="/portal/ops/">Ops</a>
    <a href="/api/monitoring">JSON</a>
    <a href="/registry/prediction/report/">Prediction report</a>
  </nav>
  <h1>Registry monitoring</h1>
  <p class="meta">Last updated: ${escapeHtml(data.timestamp)} · auto-refresh 30s</p>
  ${overview}
  ${integrity}
  ${platforms}
  ${api}
  ${dod}
  ${tableSection('Bun API Proof', [
    {
      Metric: 'Status',
      Value: `${data.bunApiProof?.demosPassed ?? '?'}/${data.bunApiProof?.demosTotal ?? '?'} demos`,
    },
    { Metric: 'APIs verified', Value: String(data.bunApiProof?.apisVerified ?? '?') },
    { Metric: 'Pass rate', Value: data.bunApiProof?.demoPassRate ?? '?' },
    { Metric: 'Generated', Value: data.bunApiProof?.generated ?? 'never' },
  ])}
  ${tableSection('Routing proof', [
    {
      Metric: 'Routes passed',
      Value: `${data.routeStats?.routing?.passed ?? '?'}/${data.routeStats?.routing?.total ?? '?'}`,
    },
    { Metric: 'HTTP 200 ok', Value: String(data.routeStats?.routing?.httpOk ?? '?') },
    { Metric: 'Critical failed', Value: String(data.routeStats?.routing?.criticalFailed ?? '0') },
    {
      Metric: 'p95 latency',
      Value: data.routeStats?.routing?.p95Ms ? `${data.routeStats.routing.p95Ms}ms` : '?',
    },
    {
      Metric: 'Error rate',
      Value: data.routeStats?.routing?.errorRate
        ? `${(data.routeStats.routing.errorRate * 100).toFixed(1)}%`
        : '0%',
    },
    { Metric: 'Proof hash', Value: data.routeStats?.routing?.proofHash?.slice(0, 16) + '…' ?? '—' },
  ])}
  ${tableSection('Environment checks', [
    { Metric: 'Total checks', Value: String(data.env?.summary?.total ?? '?') },
    { Metric: 'OK', Value: String(data.env?.summary?.ok ?? '?') },
    { Metric: 'Missing', Value: String(data.env?.summary?.missing ?? '0') },
    { Metric: 'Required missing', Value: String(data.env?.summary?.requiredMissing ?? '0') },
  ])}
  ${networkingProofSection(data.networkingProof)}
</body></html>`;
}

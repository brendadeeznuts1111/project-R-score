#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac, createHash } from 'node:crypto';
import { S3Client } from 'bun';

type Options = {
  port: number;
  dir: string;
  r2Base?: string;
  r2Prefix: string;
  cacheTtlMs: number;
};

type CachedResponse = {
  expiresAt: number;
  status: number;
  body: string;
  contentType: string;
};

function parseArgs(argv: string[]): Options {
  const out: Options = {
    port: 3099,
    dir: './reports/search-benchmark',
    r2Base: Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE,
    r2Prefix: Bun.env.R2_BENCH_PREFIX || 'reports/search-bench',
    cacheTtlMs: Number.parseInt(Bun.env.SEARCH_BENCH_CACHE_TTL_MS || '8000', 10) || 8000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port') {
      const p = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(p) && p > 0) out.port = p;
      i += 1;
      continue;
    }
    if (arg === '--dir') {
      out.dir = argv[i + 1] || out.dir;
      i += 1;
      continue;
    }
    if (arg === '--r2-base') {
      out.r2Base = argv[i + 1] || out.r2Base;
      i += 1;
      continue;
    }
    if (arg === '--r2-prefix') {
      out.r2Prefix = argv[i + 1] || out.r2Prefix;
      i += 1;
      continue;
    }
    if (arg === '--cache-ttl-ms') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n >= 0) out.cacheTtlMs = n;
      i += 1;
      continue;
    }
  }

  return out;
}

function resolveR2ReadOptions():
  | { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string }
  | null {
  const accountId = Bun.env.R2_ACCOUNT_ID || '';
  const endpoint =
    Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const bucket = Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || '';
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || '';
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
}

async function readLocalJson(path: string): Promise<Response> {
  if (!existsSync(path)) {
    return Response.json({ error: 'not_found', path }, { status: 404 });
  }
  const raw = await readFile(path, 'utf8');
  return new Response(raw, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function finalizeJsonResponse(
  status: number,
  body: string,
  contentType = 'application/json; charset=utf-8',
  cacheStatus?: 'HIT' | 'MISS'
): Response {
  const headers: Record<string, string> = {
    'content-type': contentType,
  };
  if (cacheStatus) {
    headers['x-search-bench-cache'] = cacheStatus;
  }
  return new Response(body, { status, headers });
}

function htmlShell(options: Options): string {
  const r2Label = options.r2Base || '(not configured)';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Search Benchmark Dashboard</title>
  <style>
    :root {
      --bg: #0b111f;
      --panel: #111a2d;
      --text: #e8eefc;
      --muted: #90a0c4;
      --accent: #4fd1c5;
      --line: #1f2c49;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-monospace, Menlo, Monaco, monospace; background: linear-gradient(180deg, #081226, #0b111f); color: var(--text); }
    main { max-width: 1100px; margin: 0 auto; padding: 28px; }
    .card { border: 1px solid var(--line); background: var(--panel); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { color: var(--muted); font-size: 12px; }
    .buttons { display: flex; gap: 8px; margin-top: 12px; }
    button { cursor: pointer; background: #0f223e; border: 1px solid #2d466f; color: var(--text); padding: 8px 10px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; }
    th { color: var(--muted); font-weight: 600; }
    code { color: var(--accent); }
    pre { white-space: pre-wrap; word-break: break-word; background: #0a162b; border: 1px solid var(--line); padding: 12px; border-radius: 8px; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 11px; border: 1px solid transparent; }
    .status-good { color: #22c55e; border-color: #14532d; background: #052e16; }
    .status-warn { color: #facc15; border-color: #713f12; background: #292524; }
    .status-bad { color: #f97316; border-color: #7c2d12; background: #2b0f0a; }
    .status-neutral { color: #93c5fd; border-color: #1e3a8a; background: #0b1c3a; }
    .vol-zero { color: #93c5fd; border-color: #1e3a8a; background: #0b1c3a; }
    .vol-low { color: #22c55e; border-color: #14532d; background: #052e16; }
    .vol-medium { color: #facc15; border-color: #713f12; background: #292524; }
    .vol-high { color: #f43f5e; border-color: #881337; background: #2a0912; }
    .sparkline { font-size: 16px; letter-spacing: 1px; color: #4fd1c5; white-space: nowrap; }
    .rss-badge { margin-left: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Search Benchmark Dashboard</h1>
      <div class="meta">Local reports + optional R2: <code>${r2Label}</code><span id="rssBadge" class="badge status-neutral rss-badge">RSS idle</span></div>
      <div id="reportNotice" class="meta" style="margin-top:6px"></div>
      <div class="buttons">
        <button id="loadLocal">Load Local Latest</button>
        <button id="loadR2">Load R2 Latest</button>
        <button id="loadHistory">Load History</button>
      </div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">Latest Snapshot</h2>
      <div id="latest"></div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">Trend & Coverage</h2>
      <div id="trend"></div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">History</h2>
      <div id="history"></div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">Publish Manifest</h2>
      <div id="publish"></div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">R2 Inventory</h2>
      <div id="inventory"></div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">Domain Health Summary</h2>
      <div id="domainHealth"></div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 8px;font-size:16px">RSS Feed</h2>
      <div id="rss"></div>
    </div>
  </main>
  <script>
    const latestEl = document.getElementById('latest');
    const historyEl = document.getElementById('history');
    const trendEl = document.getElementById('trend');
    const publishEl = document.getElementById('publish');
    const inventoryEl = document.getElementById('inventory');
    const domainHealthEl = document.getElementById('domainHealth');
    const rssEl = document.getElementById('rss');
    const rssBadgeEl = document.getElementById('rssBadge');
    const reportNoticeEl = document.getElementById('reportNotice');
    let lastHistory = null;
    let previousSnapshot = null;
    let activeSource = 'local';
    let currentLatestId = null;
    let knownLatestId = null;
    let currentRssGuid = null;
    let knownRssGuid = null;
    const topProfile = (snapshot) =>
      snapshot && Array.isArray(snapshot.rankedProfiles) && snapshot.rankedProfiles.length > 0
        ? snapshot.rankedProfiles[0]
        : null;
    const avgSlopAcrossProfiles = (snapshot) => {
      if (!snapshot || !Array.isArray(snapshot.rankedProfiles) || snapshot.rankedProfiles.length === 0) return 0;
      const sum = snapshot.rankedProfiles.reduce((acc, p) => acc + Number(p.avgSlopPct || 0), 0);
      return sum / snapshot.rankedProfiles.length;
    };
    const classifyVolatility = (absDelta, medium = 2, high = 5) => {
      if (absDelta <= 0) return 'Zero';
      if (absDelta < medium) return 'Low';
      if (absDelta < high) return 'Medium';
      return 'High';
    };
    const classifyStdVolatility = (stdev, low = 0.5, medium = 1.5) => {
      if (stdev <= 0) return 'Zero';
      if (stdev < low) return 'Low';
      if (stdev < medium) return 'Medium';
      return 'High';
    };
    const statusBadgeClass = (status) => {
      const s = String(status || '').toLowerCase();
      if (['up', 'improving', 'stable', 'locked'].includes(s)) return 'status-good';
      if (['plateau', 'unchanged', 'static', 'neutral'].includes(s)) return 'status-neutral';
      if (['changed', 'rising'].includes(s)) return 'status-warn';
      if (['down'].includes(s)) return 'status-bad';
      return 'status-neutral';
    };
    const volatilityBadgeClass = (vol) => {
      const v = String(vol || '').toLowerCase();
      if (v === 'zero') return 'vol-zero';
      if (v === 'low') return 'vol-low';
      if (v === 'medium') return 'vol-medium';
      if (v === 'high') return 'vol-high';
      return 'vol-zero';
    };
    const statusBadge = (text) => '<span class="badge ' + statusBadgeClass(text) + '">' + text + '</span>';
    const volatilityBadge = (text) => '<span class="badge ' + volatilityBadgeClass(text) + '">' + text + '</span>';
    const sparkline = (values) => {
      if (!Array.isArray(values) || values.length === 0) return 'n/a';
      const blocks = Array.from('▁▂▃▄▅▆▇█');
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max === min) return Array(values.length).fill(blocks[3]).join('').normalize('NFC');
      const chars = values.map((v) => {
        const ratio = (v - min) / (max - min);
        const idx = Math.max(0, Math.min(blocks.length - 1, Math.round(ratio * (blocks.length - 1))));
        return blocks[idx];
      });
      return chars.join('').normalize('NFC');
    };
    const stdDev = (values) => {
      if (!Array.isArray(values) || values.length === 0) return 0;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    };
    const signedDelta = (v, suffix = '') => {
      if (v === null || Number.isNaN(v)) return '-';
      const sign = v > 0 ? '+' : '';
      return sign + v.toFixed(2) + suffix;
    };
    const formatCurrentPrev = (curr, prev, suffix = '') => [
      (curr === null || Number.isNaN(curr) ? 'n/a' : curr.toFixed(2) + suffix),
      (prev === null || Number.isNaN(prev) ? 'n/a' : prev.toFixed(2) + suffix),
    ];
    const pathStatus = (curr, prev) => (curr && prev && curr === prev ? 'Stable' : 'Changed');
    const deltaStatus = (delta, kind) => {
      if (delta === null || Number.isNaN(delta)) return 'n/a';
      if (Math.abs(delta) < 0.005) {
        return kind === 'quality' ? 'Plateau' : (kind === 'slop' ? 'Unchanged' : 'Locked');
      }
      if (kind === 'quality') return delta > 0 ? 'Up' : 'Down';
      if (kind === 'slop') return delta < 0 ? 'Improving' : 'Rising';
      return delta > 0 ? 'Up' : 'Down';
    };
    const renderLatest = (data) => {
      if (!data || !Array.isArray(data.rankedProfiles)) {
        latestEl.innerHTML = '<pre>No benchmark data found.</pre>';
        trendEl.innerHTML = '<pre>No trend data.</pre>';
        return;
      }
      const rows = data.rankedProfiles.map((p, idx) =>
        (() => {
          const uniquePct = Number(p.avgUniqueFamilyPct || 0);
          const signalPct = Number(p.avgSignalPct || 0);
          const slopPct = Number(p.avgSlopPct || 0);
          const dupPct = Number(p.avgDuplicatePct || 0);
          const mirrors = Number(p.avgMirrorsPerHit || 0);
          const density = uniquePct / Math.max(1, mirrors + 1);
          const noiseRatio = Math.min(100, slopPct + dupPct);
          const reliability = (signalPct * uniquePct) / 100;
          return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + p.profile + '</td>' +
            '<td>' + Number(p.qualityScore || 0).toFixed(2) + '</td>' +
            '<td>' + signalPct.toFixed(2) + '</td>' +
            '<td>' + uniquePct.toFixed(2) + '</td>' +
            '<td>' + slopPct.toFixed(2) + '</td>' +
            '<td>' + density.toFixed(2) + '</td>' +
            '<td>' + noiseRatio.toFixed(2) + '</td>' +
            '<td>' + reliability.toFixed(2) + '</td>' +
          '</tr>';
        })()
      ).join('');
      latestEl.innerHTML =
        '<div class="meta">snapshot=' + (data.id || 'n/a') + ' created=' + (data.createdAt || 'n/a') + '</div>' +
        '<div class="meta">path=' + (data.path || 'n/a') + ' limit=' + (data.limit || 'n/a') + ' queries=' + ((data.queries || []).length || 0) + ' queryPack=' + (data.queryPack || 'core_delivery') + '</div>' +
        '<div class="meta">warnings=' + ((Array.isArray(data.warnings) && data.warnings.length > 0) ? data.warnings.join(', ') : 'none') + '</div>' +
        '<table><thead><tr><th>Rank</th><th>Profile</th><th>Quality</th><th>Signal%</th><th>Unique%</th><th>Slop%</th><th>Density</th><th>Noise Ratio</th><th>Reliability</th></tr></thead><tbody>' + rows + '</tbody></table>';
      renderTrend(data, previousSnapshot);
    };
    const renderTrend = (latest, previous) => {
      if (!latest || !Array.isArray(latest.rankedProfiles) || latest.rankedProfiles.length === 0) {
        trendEl.innerHTML = '<pre>No trend data.</pre>';
        return;
      }
      const currentTop = topProfile(latest);
      const previousTop = topProfile(previous);
      const currentPath = latest.path || 'n/a';
      const previousPath = previous?.path || 'n/a';

      const currentQueries = Array.isArray(latest.queries) ? latest.queries.length : 0;
      const previousQueries = Array.isArray(previous?.queries) ? previous.queries.length : null;
      const queriesDelta = previousQueries === null ? null : currentQueries - previousQueries;

      const currentQuality = currentTop ? Number(currentTop.qualityScore || 0) : null;
      const previousQuality = previousTop ? Number(previousTop.qualityScore || 0) : null;
      const qualityDelta = Number.isFinite(Number(latest?.delta?.topQuality))
        ? Number(latest.delta.topQuality)
        : ((currentQuality !== null && previousQuality !== null)
          ? Number((currentQuality - previousQuality).toFixed(2))
          : null);

      const currentFamily = currentTop ? Number(currentTop.avgUniqueFamilyPct || 0) : null;
      const previousFamily = previousTop ? Number(previousTop.avgUniqueFamilyPct || 0) : null;
      const familyDelta = Number.isFinite(Number(latest?.delta?.familyCoverage))
        ? Number(latest.delta.familyCoverage)
        : ((currentFamily !== null && previousFamily !== null)
          ? Number((currentFamily - previousFamily).toFixed(2))
          : null);

      const currentSlop = Number(avgSlopAcrossProfiles(latest).toFixed(2));
      const previousSlopRaw = previous ? avgSlopAcrossProfiles(previous) : null;
      const previousSlop = previousSlopRaw === null ? null : Number(previousSlopRaw.toFixed(2));
      const slopDelta = Number.isFinite(Number(latest?.delta?.avgSlop))
        ? Number(latest.delta.avgSlop)
        : ((previousSlop === null) ? null : Number((currentSlop - previousSlop).toFixed(2)));

      const currentSignal = currentTop ? Number(currentTop.avgSignalPct || 0) : null;
      const previousSignal = previousTop ? Number(previousTop.avgSignalPct || 0) : null;
      const currentReliability = (currentSignal !== null && currentFamily !== null)
        ? Number(((currentSignal * currentFamily) / 100).toFixed(2))
        : null;
      const previousReliability = (previousSignal !== null && previousFamily !== null)
        ? Number(((previousSignal * previousFamily) / 100).toFixed(2))
        : null;
      const reliabilityDelta = Number.isFinite(Number(latest?.delta?.reliability))
        ? Number(latest.delta.reliability)
        : ((currentReliability !== null && previousReliability !== null)
          ? Number((currentReliability - previousReliability).toFixed(2))
          : null);

      const currentNoise = currentTop
        ? Number(Math.min(100, Number(currentTop.avgSlopPct || 0) + Number(currentTop.avgDuplicatePct || 0)).toFixed(2))
        : null;
      const previousNoise = previousTop
        ? Number(Math.min(100, Number(previousTop.avgSlopPct || 0) + Number(previousTop.avgDuplicatePct || 0)).toFixed(2))
        : null;
      const noiseDelta = Number.isFinite(Number(latest?.delta?.noiseRatio))
        ? Number(latest.delta.noiseRatio)
        : ((currentNoise !== null && previousNoise !== null)
          ? Number((currentNoise - previousNoise).toFixed(2))
          : null);

      const querySummaries = Array.isArray(currentTop?.queries) ? currentTop.queries : [];
      const queriesWithHits = querySummaries.filter(q => Number(q.total || 0) > 0).length;
      const currentQueryCoverage = querySummaries.length > 0
        ? Number(((queriesWithHits / querySummaries.length) * 100).toFixed(2))
        : null;
      const prevQuerySummaries = Array.isArray(previousTop?.queries) ? previousTop.queries : [];
      const prevQueriesWithHits = prevQuerySummaries.filter(q => Number(q.total || 0) > 0).length;
      const previousQueryCoverage = prevQuerySummaries.length > 0
        ? Number(((prevQueriesWithHits / prevQuerySummaries.length) * 100).toFixed(2))
        : null;
      const queryCoverageDelta = (currentQueryCoverage !== null && previousQueryCoverage !== null)
        ? Number((currentQueryCoverage - previousQueryCoverage).toFixed(2))
        : null;

      const rollingQuality = Array.isArray(lastHistory?.snapshots)
        ? lastHistory.snapshots.slice(0, 5).map(s => Number(s.topScore || 0)).filter(n => Number.isFinite(n))
        : [];
      const qualityStdev = Number(stdDev(rollingQuality).toFixed(2));
      const qualitySpark = sparkline(rollingQuality.slice().reverse());

      const [qualityCurrentText, qualityPrevText] = formatCurrentPrev(currentQuality, previousQuality);
      const [familyCurrentText, familyPrevText] = formatCurrentPrev(currentFamily, previousFamily, '%');
      const [slopCurrentText, slopPrevText] = formatCurrentPrev(currentSlop, previousSlop, '%');
      const [relCurrentText, relPrevText] = formatCurrentPrev(currentReliability, previousReliability);
      const [noiseCurrentText, noisePrevText] = formatCurrentPrev(currentNoise, previousNoise, '%');
      const [qcovCurrentText, qcovPrevText] = formatCurrentPrev(currentQueryCoverage, previousQueryCoverage, '%');

      const queriesStatus = queriesDelta === null ? 'n/a' : (queriesDelta === 0 ? 'Static' : 'Changed');
      const queriesVol = queriesDelta === null ? 'n/a' : classifyVolatility(Math.abs(queriesDelta), 1, 3);
      const qualityStatus = deltaStatus(qualityDelta, 'quality');
      const qualityVol = qualityDelta === null ? classifyStdVolatility(qualityStdev) : classifyVolatility(Math.abs(qualityDelta), 1, 3);
      const familyStatus = deltaStatus(familyDelta, 'family');
      const familyVol = familyDelta === null ? 'n/a' : classifyVolatility(Math.abs(familyDelta), 1, 3);
      const slopStatus = deltaStatus(slopDelta, 'slop');
      const slopVol = slopDelta === null ? 'n/a' : classifyVolatility(Math.abs(slopDelta), 1, 3);
      const qcovStatus = deltaStatus(queryCoverageDelta, 'family');
      const qcovVol = queryCoverageDelta === null ? 'n/a' : classifyVolatility(Math.abs(queryCoverageDelta), 1, 3);
      const noiseStatus = deltaStatus(noiseDelta, 'slop');
      const noiseVol = noiseDelta === null ? 'n/a' : classifyVolatility(Math.abs(noiseDelta), 1, 3);
      const relStatus = deltaStatus(reliabilityDelta, 'family');
      const relVol = reliabilityDelta === null ? 'n/a' : classifyVolatility(Math.abs(reliabilityDelta), 1, 3);

      trendEl.innerHTML =
        '<table><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Delta</th><th>Status</th><th>Volatility</th></tr></thead><tbody>' +
          '<tr><td>Path</td><td><code>' + currentPath + '</code></td><td><code>' + previousPath + '</code></td><td>-</td><td>' + statusBadge(pathStatus(currentPath, previousPath)) + '</td><td>' + volatilityBadge('Low') + '</td></tr>' +
          '<tr><td>Queries</td><td>' + currentQueries + '</td><td>' + (previousQueries === null ? 'n/a' : previousQueries) + '</td><td>' + (queriesDelta === null ? '-' : queriesDelta) + '</td><td>' + statusBadge(queriesStatus) + '</td><td>' + volatilityBadge(queriesVol) + '</td></tr>' +
          '<tr><td>Top Quality</td><td>' + qualityCurrentText + '</td><td>' + qualityPrevText + '</td><td>' + signedDelta(qualityDelta) + '</td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityBadge(qualityVol) + '</td></tr>' +
          '<tr><td>Top Quality (10)</td><td><span class="sparkline">' + qualitySpark + '</span></td><td colspan="2">latest ' + qualityCurrentText + '</td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityBadge(classifyStdVolatility(qualityStdev)) + '</td></tr>' +
          '<tr><td>Family Cov.</td><td>' + familyCurrentText + '</td><td>' + familyPrevText + '</td><td>' + signedDelta(familyDelta, '%') + '</td><td>' + statusBadge(familyStatus) + '</td><td>' + volatilityBadge(familyVol) + '</td></tr>' +
          '<tr><td>Slop Avg.</td><td>' + slopCurrentText + '</td><td>' + slopPrevText + '</td><td>' + signedDelta(slopDelta, '%') + '</td><td>' + statusBadge(slopStatus) + '</td><td>' + volatilityBadge(slopVol) + '</td></tr>' +
          '<tr><td>Query Coverage</td><td>' + qcovCurrentText + '</td><td>' + qcovPrevText + '</td><td>' + signedDelta(queryCoverageDelta, '%') + '</td><td>' + statusBadge(qcovStatus) + '</td><td>' + volatilityBadge(qcovVol) + '</td></tr>' +
          '<tr><td>Noise Ratio</td><td>' + noiseCurrentText + '</td><td>' + noisePrevText + '</td><td>' + signedDelta(noiseDelta, '%') + '</td><td>' + statusBadge(noiseStatus) + '</td><td>' + volatilityBadge(noiseVol) + '</td></tr>' +
          '<tr><td>Reliability</td><td>' + relCurrentText + '</td><td>' + relPrevText + '</td><td>' + signedDelta(reliabilityDelta) + '</td><td>' + statusBadge(relStatus) + '</td><td>' + volatilityBadge(relVol) + '</td></tr>' +
        '</tbody></table>';
    };
    const renderHistory = (data) => {
      if (!data || !Array.isArray(data.snapshots)) {
        historyEl.innerHTML = '<pre>No history index found.</pre>';
        lastHistory = null;
        return;
      }
      lastHistory = data;
      const rows = data.snapshots.map((s) =>
        '<tr>' +
          '<td>' + s.id + '</td>' +
          '<td>' + s.createdAt + '</td>' +
          '<td>' + (s.queryPack || 'core_delivery') + '</td>' +
          '<td>' + s.topProfile + '</td>' +
          '<td>' + Number(s.topScore || 0).toFixed(2) + '</td>' +
        '</tr>'
      ).join('');
      historyEl.innerHTML =
        '<table><thead><tr><th>Snapshot</th><th>Created</th><th>Query Pack</th><th>Top Profile</th><th>Top Score</th></tr></thead><tbody>' + rows + '</tbody></table>';
    };
    const renderPublish = (data) => {
      if (!data || !Array.isArray(data.uploads)) {
        publishEl.innerHTML = '<pre>No publish manifest found.</pre>';
        return;
      }
      const rows = data.uploads
        .slice(0, 12)
        .map((u) =>
          '<tr>' +
            '<td><code>' + u.key + '</code></td>' +
            '<td>' + Number(u.elapsedMs || 0).toFixed(2) + '</td>' +
            '<td>' + Number(u.attempts || 0) + '</td>' +
          '</tr>'
        )
        .join('');
      publishEl.innerHTML =
        '<div class="meta">snapshot=' + (data.id || 'n/a') +
        ' queryPack=' + (data.queryPack || 'core_delivery') +
        ' concurrency=' + (data.concurrency ?? 'n/a') +
        ' uploadedObjects=' + (data.uploadedObjects || 0) +
        ' retries=' + (data.uploadRetries ?? 'n/a') +
        ' gzip=' + (data.gzip ? 'true' : 'false') +
        ' mode=' + (data.mode || 'n/a') +
        ' bucket=' + (data.bucket || 'n/a') +
        '</div>' +
        '<div class="meta">warnings=' + ((Array.isArray(data.warnings) && data.warnings.length > 0) ? data.warnings.join(', ') : 'none') + '</div>' +
        '<div class="meta">delta=' + JSON.stringify(data.delta || {}) + '</div>' +
        '<table><thead><tr><th>Key</th><th>Elapsed (ms)</th><th>Attempts</th></tr></thead><tbody>' + rows + '</tbody></table>';
    };
    const renderInventory = (data) => {
      if (!data || !Array.isArray(data.items)) {
        inventoryEl.innerHTML = '<pre>No inventory available.</pre>';
        return;
      }
      const rows = data.items.map((item) =>
        '<tr>' +
          '<td><code>' + item.name + '</code></td>' +
          '<td>' + (item.exists ? 'yes' : 'no') + '</td>' +
          '<td>' + (item.size ?? 'n/a') + '</td>' +
          '<td>' + (item.lastModified || 'n/a') + '</td>' +
        '</tr>'
      ).join('');
      inventoryEl.innerHTML =
        '<div class="meta">snapshot=' + (data.snapshotId || 'n/a') + ' source=' + (data.source || 'local') + ' freshnessSec=' + (data.freshnessSec ?? 'n/a') + '</div>' +
        '<table><thead><tr><th>Object</th><th>Exists</th><th>Size</th><th>Last Modified</th></tr></thead><tbody>' + rows + '</tbody></table>';
    };
    const renderDomainHealth = (data) => {
      if (!data || data.error) {
        domainHealthEl.innerHTML = '<pre>' + (data?.error || 'No domain health data.') + '</pre>';
        return;
      }
      const latestRows = (data.latest || []).map((item) =>
        '<tr>' +
          '<td><code>' + item.type + '</code></td>' +
          '<td><code>' + item.key + '</code></td>' +
          '<td>' + (item.exists ? 'yes' : 'no') + '</td>' +
          '<td>' + (item.lastModified || 'n/a') + '</td>' +
        '</tr>'
      ).join('');
      domainHealthEl.innerHTML =
        '<div class="meta">domain=' + (data.domain || 'factory-wager.com') + ' knownSubdomains=' + (data.knownSubdomains ?? 'n/a') + ' source=' + (data.source || 'n/a') + '</div>' +
        '<table><thead><tr><th>Type</th><th>Key</th><th>Exists</th><th>Last Modified</th></tr></thead><tbody>' + latestRows + '</tbody></table>';
    };
    const renderRss = (xmlText, source) => {
      if (!xmlText || typeof xmlText !== 'string') {
        rssEl.innerHTML = '<pre>No RSS feed available.</pre>';
        return;
      }
      try {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        const items = Array.from(doc.querySelectorAll('item')).slice(0, 8);
        const latestGuid = items[0]?.querySelector('guid')?.textContent || items[0]?.querySelector('link')?.textContent || null;
        if (latestGuid && !currentRssGuid) currentRssGuid = latestGuid;
        if (latestGuid && !knownRssGuid) knownRssGuid = latestGuid;
        const rows = items.map((item) => {
          const title = item.querySelector('title')?.textContent || 'untitled';
          const pubDate = item.querySelector('pubDate')?.textContent || 'n/a';
          const link = item.querySelector('link')?.textContent || '#';
          return '<tr>' +
            '<td>' + title + '</td>' +
            '<td>' + pubDate + '</td>' +
            '<td><a href="' + link + '" target="_blank" rel="noreferrer">open</a></td>' +
          '</tr>';
        }).join('');
        rssEl.innerHTML =
          '<div class="meta">source=' + source + ' feed=<code>/api/rss?source=' + source + '</code></div>' +
          '<table><thead><tr><th>Title</th><th>Published</th><th>Link</th></tr></thead><tbody>' + rows + '</tbody></table>';
      } catch {
        rssEl.innerHTML = '<pre>RSS parse error.</pre>';
      }
    };
    const setRssBadge = (label, mode = 'neutral') => {
      const cls = mode === 'new' ? 'status-warn' : mode === 'ok' ? 'status-good' : 'status-neutral';
      rssBadgeEl.className = 'badge rss-badge ' + cls;
      rssBadgeEl.textContent = label;
    };
    const parseLatestRssGuid = (xmlText) => {
      try {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        const first = doc.querySelector('item');
        if (!first) return null;
        return first.querySelector('guid')?.textContent || first.querySelector('link')?.textContent || null;
      } catch {
        return null;
      }
    };
    const clearReportNotice = () => {
      reportNoticeEl.innerHTML = '';
    };
    const setReportNotice = (html) => {
      reportNoticeEl.innerHTML = html;
      const loadBtn = document.getElementById('loadNewReports');
      if (loadBtn) {
        loadBtn.onclick = () => loadLatest(activeSource);
      }
    };
    const countNewReports = (snapshots, baselineId) => {
      if (!Array.isArray(snapshots) || snapshots.length === 0 || !baselineId) return 0;
      const idx = snapshots.findIndex((s) => s.id === baselineId);
      if (idx < 0) return snapshots.length;
      return idx;
    };
    const checkForNewReports = async () => {
      try {
        const res = await fetch('/api/index?source=' + activeSource);
        const idx = await res.json();
        if (!idx || !Array.isArray(idx.snapshots) || idx.snapshots.length === 0) return;
        const latestId = idx.snapshots[0].id;
        if (!knownLatestId) {
          knownLatestId = latestId;
        }
        if (!currentLatestId) {
          currentLatestId = latestId;
          knownLatestId = latestId;
          return;
        }
        if (latestId !== currentLatestId) {
          const newCount = countNewReports(idx.snapshots, currentLatestId);
          setReportNotice(
            '<span class="badge status-warn">Update</span> ' +
            'New report' + (newCount > 1 ? 's' : '') + ' available (' + newCount + '). ' +
            'Latest: <code>' + latestId + '</code> ' +
            '<button id="loadNewReports" style="margin-left:8px">Load now</button>'
          );
        } else if (latestId === knownLatestId) {
          clearReportNotice();
        }
        knownLatestId = latestId;
      } catch {
        // ignore polling errors; dashboard remains usable
      }
    };
    const checkForNewRssItems = async () => {
      try {
        const res = await fetch('/api/rss?source=' + activeSource);
        const xmlText = await res.text();
        const latestGuid = parseLatestRssGuid(xmlText);
        if (!latestGuid) return;
        if (!knownRssGuid) knownRssGuid = latestGuid;
        if (!currentRssGuid) {
          currentRssGuid = latestGuid;
          knownRssGuid = latestGuid;
          setRssBadge('RSS synced', 'ok');
          return;
        }
        if (latestGuid !== currentRssGuid) {
          const short = latestGuid.length > 22 ? latestGuid.slice(0, 22) + '...' : latestGuid;
          setRssBadge('RSS update: ' + short, 'new');
        } else {
          setRssBadge('RSS synced', 'ok');
        }
        knownRssGuid = latestGuid;
      } catch {
        setRssBadge('RSS unavailable', 'neutral');
      }
    };
    async function loadLatest(source) {
      activeSource = source;
      const indexRes = await fetch('/api/index?source=' + source);
      const indexData = await indexRes.json();
      lastHistory = indexData;
      if (indexData && Array.isArray(indexData.snapshots) && indexData.snapshots.length > 1) {
        const prevId = indexData.snapshots[1].id;
        const prevRes = await fetch('/api/snapshot?id=' + encodeURIComponent(prevId) + '&source=' + source);
        previousSnapshot = await prevRes.json();
      } else {
        previousSnapshot = null;
      }
      const res = await fetch('/api/latest?source=' + source);
      const data = await res.json();
      renderLatest(data);
      currentLatestId = data?.id || currentLatestId;
      knownLatestId = data?.id || knownLatestId;
      clearReportNotice();
      const manifestRes = await fetch('/api/publish-manifest?source=' + source);
      const manifest = await manifestRes.json();
      renderPublish(manifest);
      const inventoryRes = await fetch('/api/r2-inventory?source=' + source + '&id=' + encodeURIComponent(data?.id || ''));
      const inventory = await inventoryRes.json();
      renderInventory(inventory);
      const domainRes = await fetch('/api/domain-health?source=' + source);
      const domain = await domainRes.json();
      renderDomainHealth(domain);
      const rssRes = await fetch('/api/rss?source=' + source);
      const rssText = await rssRes.text();
      renderRss(rssText, source);
      const guid = parseLatestRssGuid(rssText);
      if (guid) {
        currentRssGuid = guid;
        knownRssGuid = guid;
      }
      setRssBadge('RSS synced', 'ok');
    }
    async function loadHistory() {
      activeSource = 'local';
      const localRes = await fetch('/api/index');
      const localData = await localRes.json();
      renderHistory(localData);
      if (localData && Array.isArray(localData.snapshots) && localData.snapshots.length > 1) {
        const prevId = localData.snapshots[1].id;
        const prevRes = await fetch('/api/snapshot?id=' + encodeURIComponent(prevId) + '&source=local');
        previousSnapshot = await prevRes.json();
      } else {
        previousSnapshot = null;
      }
      const latestRes = await fetch('/api/latest?source=local');
      const latestData = await latestRes.json();
      renderLatest(latestData);
      currentLatestId = latestData?.id || currentLatestId;
      knownLatestId = latestData?.id || knownLatestId;
      clearReportNotice();
      const manifestRes = await fetch('/api/publish-manifest?source=local');
      const manifest = await manifestRes.json();
      renderPublish(manifest);
      const inventoryRes = await fetch('/api/r2-inventory?source=local&id=' + encodeURIComponent(latestData?.id || ''));
      const inventory = await inventoryRes.json();
      renderInventory(inventory);
      const domainRes = await fetch('/api/domain-health?source=local');
      const domain = await domainRes.json();
      renderDomainHealth(domain);
      const rssRes = await fetch('/api/rss?source=local');
      const rssText = await rssRes.text();
      renderRss(rssText, 'local');
      const guid = parseLatestRssGuid(rssText);
      if (guid) {
        currentRssGuid = guid;
        knownRssGuid = guid;
      }
      setRssBadge('RSS synced', 'ok');
    }
    document.getElementById('loadLocal').onclick = () => loadLatest('local');
    document.getElementById('loadR2').onclick = () => loadLatest('r2');
    document.getElementById('loadHistory').onclick = () => loadHistory();
    rssBadgeEl.onclick = () => loadLatest(activeSource);
    loadLatest('local');
    loadHistory();
    setInterval(() => {
      checkForNewReports();
      checkForNewRssItems();
    }, 15000);
  </script>
</body>
</html>`;
}

async function fetchR2Json(r2Base: string, name: string): Promise<Response> {
  const base = r2Base.replace(/\/+$/g, '');
  const targets = [`${base}/${name}.gz`, `${base}/${name}`];

  for (const target of targets) {
    const res = await fetch(target);
    if (!res.ok) {
      continue;
    }
    const raw = new Uint8Array(await res.arrayBuffer());
    const encoding = (res.headers.get('content-encoding') || '').toLowerCase();
    let text: string;
    if (encoding.includes('gzip') || target.endsWith('.gz')) {
      try {
        text = new TextDecoder().decode(Bun.gunzipSync(raw));
      } catch {
        text = new TextDecoder().decode(raw);
      }
    } else {
      text = new TextDecoder().decode(raw);
    }
    return new Response(text, {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  return Response.json(
    { error: 'r2_fetch_failed', target: targets[1], tried: targets },
    { status: 502 }
  );
}

function hashSha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function toAmzDate(d = new Date()): { amz: string; date: string } {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return { amz: `${y}${m}${day}T${hh}${mm}${ss}Z`, date: `${y}${m}${day}` };
}

async function fetchR2ObjectBySignature(
  endpoint: string,
  bucket: string,
  key: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<Response> {
  const endpointUrl = new URL(endpoint);
  const host = endpointUrl.host;
  const canonicalUri = `/${bucket}/${encodeKey(key)}`;
  const { amz, date } = toAmzDate();
  const payloadHash = hashSha256Hex('');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `GET\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amz}\n${scope}\n${hashSha256Hex(canonicalRequest)}`;
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, date);
  const kRegion = hmacSha256(kDate, 'auto');
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = hmacSha256(kSigning, stringToSign).toString('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `${endpoint.replace(/\/+$/g, '')}/${bucket}/${encodeKey(key)}`;

  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      'x-amz-date': amz,
      'x-amz-content-sha256': payloadHash,
      Accept: 'application/json',
    },
  });
}

async function readR2JsonByCredentials(
  options: Options,
  name: string
): Promise<Response | null> {
  const r2 = resolveR2ReadOptions();
  if (!r2) return null;
  try {
    const prefix = options.r2Prefix.replace(/^\/+|\/+$/g, '');
    const keys = [`${prefix}/${name}.gz`, `${prefix}/${name}`];

    for (const key of keys) {
      const res = await fetchR2ObjectBySignature(
        r2.endpoint,
        r2.bucket,
        key,
        r2.accessKeyId,
        r2.secretAccessKey
      );
      if (!res.ok) {
        continue;
      }
      const raw = new Uint8Array(await res.arrayBuffer());
      const encoding = (res.headers.get('content-encoding') || '').toLowerCase();
      let text: string;
      if (encoding.includes('gzip') || key.endsWith('.gz')) {
        try {
          text = new TextDecoder().decode(Bun.gunzipSync(raw));
        } catch {
          text = new TextDecoder().decode(raw);
        }
      } else {
        text = new TextDecoder().decode(raw);
      }
      return new Response(text, {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }

    return Response.json(
      {
        error: 'r2_get_failed',
        bucket: r2.bucket,
        tried: keys,
      },
      { status: 502 }
    );
  } catch (error) {
    return Response.json(
      {
        error: 'r2_read_failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

async function loadRemoteJson(options: Options, name: string): Promise<Response> {
  const credentialed = await readR2JsonByCredentials(options, name);
  if (credentialed) {
    return credentialed;
  }
  if (options.r2Base) {
    return fetchR2Json(options.r2Base, name);
  }
  return Response.json(
    { error: 'r2_not_configured', hint: 'set R2_* creds or --r2-base' },
    { status: 400 }
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const dir = resolve(options.dir);
  const latestJson = resolve(dir, 'latest.json');
  const indexJson = resolve(dir, 'index.json');
  const rssXml = resolve(dir, 'rss.xml');
  const responseCache = new Map<string, CachedResponse>();
  const inflight = new Map<string, Promise<CachedResponse>>();

  const getCachedRemoteJson = async (cacheKey: string, name: string): Promise<Response> => {
    const now = Date.now();
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return finalizeJsonResponse(cached.status, cached.body, cached.contentType, 'HIT');
    }

    if (inflight.has(cacheKey)) {
      const pending = await inflight.get(cacheKey)!;
      return finalizeJsonResponse(pending.status, pending.body, pending.contentType, 'HIT');
    }

    const task = (async (): Promise<CachedResponse> => {
      const res = await loadRemoteJson(options, name);
      const body = await res.text();
      const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
      const entry: CachedResponse = {
        status: res.status,
        body,
        contentType,
        expiresAt: Date.now() + options.cacheTtlMs,
      };
      if (res.ok) {
        responseCache.set(cacheKey, entry);
      }
      return entry;
    })();

    inflight.set(cacheKey, task);
    try {
      const loaded = await task;
      return finalizeJsonResponse(loaded.status, loaded.body, loaded.contentType, 'MISS');
    } finally {
      inflight.delete(cacheKey);
    }
  };

  const resolveLocalManifestPath = async (id?: string | null): Promise<string | null> => {
    const wanted = id?.trim();
    if (wanted) {
      return resolve(dir, wanted, 'publish-manifest.json');
    }
    if (!existsSync(indexJson)) {
      return null;
    }
    try {
      const idx = await Bun.file(indexJson).json() as { snapshots?: Array<{ id?: string }> };
      const latestId = idx.snapshots?.[0]?.id;
      return latestId ? resolve(dir, latestId, 'publish-manifest.json') : null;
    } catch {
      return null;
    }
  };

  const resolveLatestSnapshotId = async (source: 'local' | 'r2'): Promise<string | null> => {
    if (source === 'local') {
      if (!existsSync(indexJson)) return null;
      try {
        const idx = await Bun.file(indexJson).json() as { snapshots?: Array<{ id?: string }> };
        return idx.snapshots?.[0]?.id || null;
      } catch {
        return null;
      }
    }
    const idxRes = await getCachedRemoteJson('r2:index', 'index.json');
    if (!idxRes.ok) return null;
    try {
      const idx = JSON.parse(await idxRes.text()) as { snapshots?: Array<{ id?: string }> };
      return idx.snapshots?.[0]?.id || null;
    } catch {
      return null;
    }
  };

  const buildInventoryLocal = async (snapshotId: string | null) => {
    const id = snapshotId || await resolveLatestSnapshotId('local');
    const mk = (name: string, path: string) => {
      if (!existsSync(path)) {
        return { name, exists: false, size: null, lastModified: null };
      }
      const st = statSync(path);
      return {
        name,
        exists: true,
        size: st.size,
        lastModified: new Date(st.mtimeMs).toISOString(),
      };
    };
    const items = [
      mk('snapshot.json', id ? resolve(dir, id, 'snapshot.json') : resolve(dir, '__missing__/snapshot.json')),
      mk('summary.md', id ? resolve(dir, id, 'summary.md') : resolve(dir, '__missing__/summary.md')),
      mk('snapshot.json.gz', id ? resolve(dir, id, 'snapshot.json.gz') : resolve(dir, '__missing__/snapshot.json.gz')),
      mk('summary.md.gz', id ? resolve(dir, id, 'summary.md.gz') : resolve(dir, '__missing__/summary.md.gz')),
      mk('publish-manifest.json', id ? resolve(dir, id, 'publish-manifest.json') : resolve(dir, '__missing__/publish-manifest.json')),
      mk('rss.xml', resolve(dir, 'rss.xml')),
    ];
    const latestTs = items
      .map((it) => (it.lastModified ? Date.parse(it.lastModified) : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    return {
      source: 'local',
      snapshotId: id,
      freshnessSec: latestTs > 0 ? Math.max(0, Math.floor((Date.now() - latestTs) / 1000)) : null,
      items,
    };
  };

  const buildInventoryR2 = async (snapshotId: string | null) => {
    const id = snapshotId || await resolveLatestSnapshotId('r2');
    if (!id) {
      return { source: 'r2', snapshotId: null, freshnessSec: null, items: [] };
    }

    const r2 = resolveR2ReadOptions();
    if (r2) {
      const prefix = options.r2Prefix.replace(/^\/+|\/+$/g, '');
      const keys = [
        `${prefix}/${id}/snapshot.json`,
        `${prefix}/${id}/summary.md`,
        `${prefix}/${id}/snapshot.json.gz`,
        `${prefix}/${id}/summary.md.gz`,
        `${prefix}/${id}/publish-manifest.json`,
        `${prefix}/rss.xml`,
      ];
      const listed = await S3Client.list(
        { prefix: `${prefix}/${id}/` },
        {
          bucket: r2.bucket,
          endpoint: r2.endpoint,
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        }
      );
      const rootListed = await S3Client.list(
        { prefix: `${prefix}/`, limit: 1000 },
        {
          bucket: r2.bucket,
          endpoint: r2.endpoint,
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        }
      );
      const contents = [...(listed.contents || []), ...(rootListed.contents || [])] as Array<{
        key: string;
        size?: number;
        lastModified?: string;
      }>;
      const byKey = new Map(contents.map((c) => [c.key, c]));
      const items = keys.map((key) => {
        const item = byKey.get(key);
        return {
          name: key.replace(`${prefix}/`, ''),
          exists: Boolean(item),
          size: item?.size ?? null,
          lastModified: item?.lastModified ?? null,
        };
      });
      const latestTs = items
        .map((it) => (it.lastModified ? Date.parse(it.lastModified) : 0))
        .reduce((a, b) => Math.max(a, b), 0);
      return {
        source: 'r2',
        snapshotId: id,
        freshnessSec: latestTs > 0 ? Math.max(0, Math.floor((Date.now() - latestTs) / 1000)) : null,
        items,
      };
    }

    if (!options.r2Base) {
      return { error: 'r2_not_configured', source: 'r2', snapshotId: id, items: [] };
    }
    const base = options.r2Base.replace(/\/+$/g, '');
    const targets = [
      `${id}/snapshot.json`,
      `${id}/summary.md`,
      `${id}/snapshot.json.gz`,
      `${id}/summary.md.gz`,
      `${id}/publish-manifest.json`,
      `rss.xml`,
    ];
    const items = await Promise.all(targets.map(async (name) => {
      const res = await fetch(`${base}/${name}`, { method: 'HEAD' });
      return {
        name,
        exists: res.ok,
        size: Number(res.headers.get('content-length') || 0) || null,
        lastModified: res.headers.get('last-modified') || null,
      };
    }));
    return {
      source: 'r2',
      snapshotId: id,
      freshnessSec: null,
      items,
    };
  };

  const buildDomainHealthSummary = async (source: 'local' | 'r2') => {
    const prefixes = ['health', 'ssl', 'analytics'];
    let knownSubdomains: number | null = null;
    let managerNote: string | null = null;
    try {
      const mod = await import('../lib/mcp/cloudflare-domain-manager');
      try {
        const mgr = new mod.CloudflareDomainManager();
        knownSubdomains = mgr.getAllSubdomains().length;
      } catch (error) {
        managerNote = error instanceof Error ? error.message : String(error);
      }
    } catch (error) {
      managerNote = error instanceof Error ? error.message : String(error);
    }

    if (source === 'local') {
      return {
        source,
        domain: 'factory-wager.com',
        knownSubdomains,
        managerNote,
        latest: prefixes.map((type) => ({
          type,
          key: `domains/factory-wager/cloudflare/${type}/YYYY-MM-DD.json`,
          exists: false,
          lastModified: null,
        })),
      };
    }

    const r2 = resolveR2ReadOptions();
    if (!r2) {
      return { error: 'r2_not_configured_for_domain_health', source, domain: 'factory-wager.com', knownSubdomains, managerNote };
    }
    const latest = await Promise.all(prefixes.map(async (type) => {
      const prefix = `domains/factory-wager/cloudflare/${type}/`;
      const listed = await S3Client.list(
        { prefix, limit: 1000 },
        {
          bucket: r2.bucket,
          endpoint: r2.endpoint,
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        }
      );
      const contents = (listed.contents || []) as Array<{ key: string; lastModified?: string }>;
      const sorted = contents
        .filter((c) => c.key.endsWith('.json'))
        .sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
      const top = sorted[0];
      return {
        type,
        key: top?.key || `${prefix}YYYY-MM-DD.json`,
        exists: Boolean(top),
        lastModified: top?.lastModified || null,
      };
    }));
    return {
      source,
      domain: 'factory-wager.com',
      knownSubdomains,
      managerNote,
      latest,
    };
  };

  Bun.serve({
    port: options.port,
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        return new Response(htmlShell(options), {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }
      if (url.pathname === '/api/latest') {
        const source = url.searchParams.get('source') || 'local';
        if (source === 'r2') {
          return getCachedRemoteJson('r2:latest', 'latest.json');
        }
        return readLocalJson(latestJson);
      }
      if (url.pathname === '/api/index') {
        const source = url.searchParams.get('source') || 'local';
        if (source === 'r2') {
          return getCachedRemoteJson('r2:index', 'index.json');
        }
        return readLocalJson(indexJson);
      }
      if (url.pathname === '/api/snapshot') {
        const id = url.searchParams.get('id');
        const source = url.searchParams.get('source') || 'local';
        if (!id) {
          return Response.json({ error: 'missing_id' }, { status: 400 });
        }
        if (source === 'r2') {
          return getCachedRemoteJson(`r2:snapshot:${id}`, `${id}/snapshot.json`);
        }
        return readLocalJson(resolve(dir, id, 'snapshot.json'));
      }
      if (url.pathname === '/api/publish-manifest') {
        const source = url.searchParams.get('source') || 'local';
        const id = url.searchParams.get('id');
        if (source === 'r2') {
          let targetId = id?.trim() || '';
          if (!targetId) {
            const idxRes = await getCachedRemoteJson('r2:index', 'index.json');
            const idxText = await idxRes.text();
            try {
              const idx = JSON.parse(idxText) as { snapshots?: Array<{ id?: string }> };
              targetId = idx.snapshots?.[0]?.id || '';
            } catch {
              targetId = '';
            }
          }
          if (!targetId) {
            return Response.json({ error: 'manifest_not_found', reason: 'no_snapshot_id' }, { status: 404 });
          }
          return getCachedRemoteJson(`r2:manifest:${targetId}`, `${targetId}/publish-manifest.json`);
        }
        const localManifestPath = await resolveLocalManifestPath(id);
        if (!localManifestPath) {
          return Response.json({ error: 'manifest_not_found', reason: 'no_snapshot_id' }, { status: 404 });
        }
        return readLocalJson(localManifestPath);
      }
      if (url.pathname === '/api/r2-inventory') {
        const source = (url.searchParams.get('source') || 'local') as 'local' | 'r2';
        const id = url.searchParams.get('id');
        if (source === 'r2') {
          const data = await buildInventoryR2(id);
          return Response.json(data);
        }
        const data = await buildInventoryLocal(id);
        return Response.json(data);
      }
      if (url.pathname === '/api/domain-health') {
        const source = (url.searchParams.get('source') || 'local') as 'local' | 'r2';
        const data = await buildDomainHealthSummary(source);
        return Response.json(data);
      }
      if (url.pathname === '/api/rss') {
        const source = url.searchParams.get('source') || 'local';
        if (source === 'r2') {
          const credentialed = await readR2JsonByCredentials(options, 'rss.xml');
          if (credentialed) {
            const txt = await credentialed.text();
            return new Response(txt, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
          }
          if (options.r2Base) {
            const rss = await fetchR2Json(options.r2Base, 'rss.xml');
            const txt = await rss.text();
            return new Response(txt, { status: rss.status, headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
          }
          return Response.json(
            { error: 'r2_not_configured', hint: 'set R2_* creds or --r2-base' },
            { status: 400 }
          );
        }
        if (!existsSync(rssXml)) {
          return Response.json({ error: 'rss_not_found', path: rssXml }, { status: 404 });
        }
        return new Response(await Bun.file(rssXml).text(), {
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      }
      return new Response('Not found', { status: 404 });
    },
  });

  const ansi = (text: string, hex: string): string => `${Bun.color(hex, 'ansi')}${text}\x1b[0m`;
  console.log(ansi(`[search-bench:dashboard] http://localhost:${options.port}/dashboard`, '#22c55e'));
  console.log(ansi(`[search-bench:dashboard] dir=${dir}`, '#60a5fa'));
  if (options.r2Base) {
    console.log(ansi(`[search-bench:dashboard] r2-base=${options.r2Base}`, '#f59e0b'));
  } else {
    const r2Creds = resolveR2ReadOptions();
    if (r2Creds) {
      console.log(ansi(`[search-bench:dashboard] r2=credentialed bucket=${r2Creds.bucket}`, '#f59e0b'));
    } else {
      console.log(ansi('[search-bench:dashboard] r2=not-configured (set R2_* or --r2-base)', '#ef4444'));
    }
  }
  console.log(ansi(`[search-bench:dashboard] cache-ttl-ms=${options.cacheTtlMs}`, '#a78bfa'));
}

await main();

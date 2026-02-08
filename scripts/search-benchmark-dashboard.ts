#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac, createHash } from 'node:crypto';
import { S3Client } from 'bun';
import { resolve4, resolveCname, resolveNs, Resolver } from 'node:dns/promises';
import {
  CookieParser,
  StateManager,
  cookieFactory,
  type DomainContextCookieData,
  type DashboardState,
  type SubdomainStateCookieData,
} from './lib/cookie-manager';
import { createDomainContext } from './lib/domain-context';

type Options = {
  port: number;
  dir: string;
  r2Base?: string;
  r2Prefix: string;
  cacheTtlMs: number;
  domain: string;
  hotReload: boolean;
  cookies: boolean;
};

type CachedResponse = {
  expiresAt: number;
  status: number;
  body: string;
  contentType: string;
};

type BuildMeta = {
  repoUrl: string;
  repoBranchUrl: string;
  branchName: string;
  commitShort: string;
  commitFull: string;
};

type ProxyConfig = {
  url: string;
  headers?: Record<string, string>;
};

type CookieTelemetryInput = {
  enabled: boolean;
  hasStateCookie: boolean;
  hasDomainCookie: boolean;
  hasSubdomainCookie: boolean;
  parsedState: boolean;
  parsedDomain: boolean;
  parsedSubdomain: boolean;
  domainMatchesRequested: boolean | null;
  dnsCookieChecked: number | null;
  dnsCookieResolved: number | null;
  dnsCookieRatio: number | null;
  cookieUnresolved: string[];
};

type R2CookieTelemetry = {
  score: number;
  disabled: boolean;
  total: number;
  secureCount: number;
  httpOnlyCount: number;
  sameSiteCount: number;
  expiryCount: number;
  unresolved: string[];
  source: 'r2' | 'default' | 'error';
  key: string;
  error?: string;
};

function parseArgs(argv: string[]): Options {
  const out: Options = {
    port: 3099,
    dir: './reports/search-benchmark',
    r2Base: Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE,
    r2Prefix: Bun.env.R2_BENCH_PREFIX || 'reports/search-bench',
    cacheTtlMs: Number.parseInt(Bun.env.SEARCH_BENCH_CACHE_TTL_MS || '8000', 10) || 8000,
    domain: Bun.env.SEARCH_BENCH_DOMAIN || 'factory-wager.com',
    hotReload: Bun.env.SEARCH_BENCH_HOT_RELOAD !== '0',
    cookies: Bun.env.SEARCH_BENCH_DISABLE_COOKIES !== '1',
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
    if (arg === '--domain') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value) {
        out.domain = value;
      }
      i += 1;
      continue;
    }
    if (arg === '--hot-reload') {
      out.hotReload = true;
      continue;
    }
    if (arg === '--no-hot-reload') {
      out.hotReload = false;
      continue;
    }
    if (arg === '--no-cookies') {
      out.cookies = false;
      continue;
    }
    if (arg === '--cookies') {
      out.cookies = true;
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

function resolveProxyConfig(): ProxyConfig | null {
  const url = (Bun.env.SEARCH_BENCH_PROXY_URL || '').trim();
  if (!url) return null;
  const headers: Record<string, string> = {};
  const auth = (Bun.env.SEARCH_BENCH_PROXY_AUTH || '').trim();
  if (auth) headers['Proxy-Authorization'] = auth;
  for (const [key, value] of Object.entries(Bun.env)) {
    if (!key.startsWith('SEARCH_BENCH_PROXY_HEADER_')) continue;
    if (!value) continue;
    const headerName = key.replace('SEARCH_BENCH_PROXY_HEADER_', '').replace(/_/g, '-');
    if (headerName) headers[headerName] = String(value);
  }
  return Object.keys(headers).length > 0 ? { url, headers } : { url };
}

async function proxyFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const proxy = resolveProxyConfig();
  if (!proxy) return fetch(input, init);
  const proxyOpt = proxy.headers ? { url: proxy.url, headers: proxy.headers } : proxy.url;
  return fetch(input, {
    ...init,
    // Bun fetch extension
    proxy: proxyOpt as any,
  } as any);
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

function resolveBuildMeta(): BuildMeta {
  const normalizeRepoUrl = (value: string): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('git@github.com:')) {
      return `https://github.com/${raw.slice('git@github.com:'.length).replace(/\.git$/i, '')}`;
    }
    if (raw.startsWith('https://github.com/')) {
      return raw.replace(/\.git$/i, '');
    }
    return raw;
  };
  let repoUrl = normalizeRepoUrl(Bun.env.SEARCH_BENCH_REPO_URL || Bun.env.REPO_URL || '');
  if (!repoUrl) {
    try {
      const out = Bun.spawnSync(['git', 'remote', 'get-url', 'origin'], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'ignore',
      });
      if (out.exitCode === 0) {
        repoUrl = normalizeRepoUrl(new TextDecoder().decode(out.stdout));
      }
    } catch {
      repoUrl = '';
    }
  }
  if (!repoUrl) {
    repoUrl = 'https://github.com/brendadeeznuts1111/project-R-score';
  }
  const envSha = (Bun.env.GIT_COMMIT || Bun.env.COMMIT_SHA || '').trim();
  let commitFull = envSha;
  let branchName = (Bun.env.GIT_BRANCH || '').trim();
  if (!commitFull) {
    try {
      const out = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'ignore',
      });
      if (out.exitCode === 0) {
        commitFull = new TextDecoder().decode(out.stdout).trim();
      }
    } catch {
      commitFull = '';
    }
  }
  if (!branchName) {
    try {
      const out = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'ignore',
      });
      if (out.exitCode === 0) {
        branchName = new TextDecoder().decode(out.stdout).trim();
      }
    } catch {
      branchName = '';
    }
  }
  if (!branchName) branchName = 'main';
  const commitShort = commitFull ? commitFull.slice(0, 8) : 'unknown';
  const branchPath = branchName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const repoBranchUrl = `${repoUrl.replace(/\/+$/g, '')}/tree/${branchPath}`;
  return {
    repoUrl,
    repoBranchUrl,
    branchName,
    commitShort,
    commitFull: commitFull || 'unknown',
  };
}

function htmlShell(options: Options, buildMeta: BuildMeta, state: DashboardState): string {
  const r2Label = options.r2Base || '(not configured)';
  const hotReloadEnabled = options.hotReload;
  const initialSource = state.prefSource === 'r2' ? 'r2' : 'local';
  const commitUrl = buildMeta.commitFull && buildMeta.commitFull !== 'unknown'
    ? `${buildMeta.repoUrl.replace(/\/+$/g, '')}/commit/${buildMeta.commitFull}`
    : buildMeta.repoUrl;
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
    .footer { color: var(--muted); font-size: 12px; margin-top: 8px; }
    .footer a { color: #93c5fd; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Search Benchmark Dashboard</h1>
      <div class="meta">Local reports + optional R2: <code>${r2Label}</code><span id="strictP95Badge" class="badge status-neutral rss-badge">Strict p95 n/a</span><span id="rssBadge" class="badge status-neutral rss-badge">RSS idle</span></div>
      <div class="meta">repo=<a href="${buildMeta.repoBranchUrl}" target="_blank" rel="noreferrer">${buildMeta.repoBranchUrl}</a> commit=<a href="${commitUrl}" target="_blank" rel="noreferrer"><code>${buildMeta.commitShort}</code></a></div>
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
      <h2 style="margin:0 0 8px;font-size:16px">Loop Closure</h2>
      <div id="loopStatus"></div>
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
    <div class="footer">Repo: <a href="${buildMeta.repoBranchUrl}" target="_blank" rel="noreferrer">${buildMeta.repoBranchUrl}</a> · Commit: <a href="${commitUrl}" target="_blank" rel="noreferrer"><code>${buildMeta.commitShort}</code></a></div>
  </main>
  <script>
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Non-browser context: skip dashboard boot logic.
    } else {
    const HOT_RELOAD_ENABLED = ${hotReloadEnabled ? 'true' : 'false'};
    const INITIAL_SOURCE = ${JSON.stringify(initialSource)};
    const STORAGE_SOURCE_KEY = 'searchBenchActiveSource';
    const readStoredSource = () => {
      try {
        const v = window.localStorage.getItem(STORAGE_SOURCE_KEY);
        return v === 'r2' ? 'r2' : (v === 'local' ? 'local' : null);
      } catch {
        return null;
      }
    };
    const writeStoredSource = (source) => {
      try {
        window.localStorage.setItem(STORAGE_SOURCE_KEY, source);
      } catch {
        // ignore storage errors
      }
    };
    const latestEl = document.getElementById('latest');
    const historyEl = document.getElementById('history');
    const trendEl = document.getElementById('trend');
    const loopStatusEl = document.getElementById('loopStatus');
    const publishEl = document.getElementById('publish');
    const inventoryEl = document.getElementById('inventory');
    const domainHealthEl = document.getElementById('domainHealth');
    const rssEl = document.getElementById('rss');
    const rssBadgeEl = document.getElementById('rssBadge');
    const strictP95BadgeEl = document.getElementById('strictP95Badge');
    const reportNoticeEl = document.getElementById('reportNotice');
    let lastHistory = null;
    let previousSnapshot = null;
    let activeSource = readStoredSource() || INITIAL_SOURCE;
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
      if (['plateau', 'unchanged', 'static', 'neutral', 'flat'].includes(s)) return 'status-neutral';
      if (['changed', 'rising', 'watch'].includes(s)) return 'status-warn';
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
    const warningBadgeClass = (code) => {
      const c = String(code || '').toLowerCase();
      if (c === 'latency_p95_warn' || c === 'slop_rise_warn' || c === 'heap_peak_warn' || c === 'rss_peak_warn') return 'status-warn';
      if (c === 'quality_drop_warn' || c === 'reliability_drop_warn' || c === 'strict_reliability_floor_warn') return 'status-bad';
      return 'status-neutral';
    };
    const warningBadge = (code) => '<span class="badge ' + warningBadgeClass(code) + '">' + code + '</span>';
    const stageStatusBadge = (status) => {
      const s = String(status || '').toLowerCase();
      const cls = s === 'pass' ? 'status-good' : s === 'warn' ? 'status-warn' : s === 'fail' ? 'status-bad' : 'status-neutral';
      return '<span class="badge ' + cls + '">' + s + '</span>';
    };
    const sourceBadge = (source) => {
      const s = String(source || 'local').toLowerCase();
      const cls = s === 'r2' ? 'status-good' : 'status-neutral';
      return '<span class="badge ' + cls + '">' + s + '</span>';
    };
    const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
    const healthTone = (ratio) => Math.round(clamp01(ratio) * 120);
    const healthIcon = (ratio) => {
      if (ratio >= 0.9) return '🟢';
      if (ratio >= 0.6) return '🟡';
      return '🔴';
    };
    const healthLabel = (ratio) => {
      if (ratio >= 0.9) return 'healthy';
      if (ratio >= 0.6) return 'degraded';
      return 'critical';
    };
    const healthBadge = (ratio, text) => {
      const bounded = clamp01(ratio);
      const hue = healthTone(bounded);
      const fg = 'hsl(' + hue + ' 100% 88%)';
      const bg = 'hsl(' + hue + ' 70% 18% / 0.85)';
      const border = 'hsl(' + hue + ' 90% 46% / 0.75)';
      return '<span class="badge" style="color:' + fg + ';background:' + bg + ';border-color:' + border + '">' +
        healthIcon(bounded) + ' ' + text +
      '</span>';
    };
    const healthRatioByState = (state) => {
      const s = String(state || '').toLowerCase();
      if (s === 'healthy') return 1;
      if (s === 'degraded') return 0.7;
      if (s === 'critical') return 0.05;
      return 0.5;
    };
    const strictP95FromSnapshot = (snapshot) => {
      if (!snapshot || !Array.isArray(snapshot.rankedProfiles)) return null;
      const strict = snapshot.rankedProfiles.find((p) => String(p.profile || '').toLowerCase() === 'strict') || null;
      const p95 = Number(strict?.latencyP95Ms);
      return Number.isFinite(p95) ? p95 : null;
    };
    const asNumOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const profileByName = (snapshot, name) => {
      if (!snapshot || !Array.isArray(snapshot.rankedProfiles)) return null;
      return snapshot.rankedProfiles.find((p) => String(p.profile || '').toLowerCase() === String(name || '').toLowerCase()) || null;
    };
    const setStrictP95Badge = (latest) => {
      if (!strictP95BadgeEl) return;
      const strict = profileByName(latest, 'strict');
      const p95 = asNumOrNull(strict?.latencyP95Ms);
      const warnings = Array.isArray(latest?.warnings) ? latest.warnings : [];
      const hasWarn = warnings.includes('latency_p95_warn');
      const cls = hasWarn ? 'status-bad' : (p95 === null ? 'status-neutral' : 'status-good');
      const valueText = p95 === null ? 'n/a' : p95.toFixed(0) + 'ms';
      strictP95BadgeEl.className = 'badge rss-badge ' + cls;
      strictP95BadgeEl.textContent = hasWarn ? ('Strict p95 warn ' + valueText) : ('Strict p95 ' + valueText);
    };
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
      if (kind === 'latency') {
        if (Math.abs(delta) < 25) return 'Flat';
        return delta < 0 ? 'Improving' : 'Rising';
      }
      if (kind === 'memory') {
        if (Math.abs(delta) < 5) return 'Flat';
        return delta < 0 ? 'Improving' : 'Rising';
      }
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
          const p95 = Number(p.latencyP95Ms || 0);
          return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + p.profile + '</td>' +
            '<td>' + Number(p.qualityScore || 0).toFixed(2) + '</td>' +
            '<td>' + p95.toFixed(2) + '</td>' +
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
        '<div class="meta">path=' + (data.path || 'n/a') + ' limit=' + (data.limit || 'n/a') + ' queries=' + ((data.queries || []).length || 0) + ' queryPack=' + (data.queryPack || 'core_delivery') + ' deltaBasis=' + (data.deltaBasis || 'n/a') + '</div>' +
        '<div class="meta">warnings=' + ((Array.isArray(data.warnings) && data.warnings.length > 0) ? data.warnings.join(', ') : 'none') + '</div>' +
        '<table><thead><tr><th>Rank</th><th>Profile</th><th>Quality</th><th>P95(ms)</th><th>Signal%</th><th>Unique%</th><th>Slop%</th><th>Density</th><th>Noise Ratio</th><th>Reliability</th></tr></thead><tbody>' + rows + '</tbody></table>';
      setStrictP95Badge(data);
      renderTrend(data, previousSnapshot);
    };
    const renderTrend = (latest, previous) => {
      if (!latest || !Array.isArray(latest.rankedProfiles) || latest.rankedProfiles.length === 0) {
        trendEl.innerHTML = '<pre>No trend data.</pre>';
        return;
      }
      const latestPack = latest.queryPack || 'core_delivery';
      const previousPack = previous?.queryPack || null;
      const baselineId = latest?.baselineSnapshotId || null;
      const samePack = Boolean(previous && previousPack === latestPack);
      const baselineMatch = baselineId ? previous?.id === baselineId : samePack;
      const validBaseline = Boolean(previous && samePack && baselineMatch);
      const scopedPrevious = validBaseline ? previous : null;
      const currentTop = topProfile(latest);
      const previousTop = topProfile(scopedPrevious);
      const currentPath = latest.path || 'n/a';
      const previousPath = scopedPrevious?.path || 'n/a';

      const currentQueries = Array.isArray(latest.queries) ? latest.queries.length : 0;
      const previousQueries = Array.isArray(scopedPrevious?.queries) ? scopedPrevious.queries.length : null;
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
      const previousSlopRaw = scopedPrevious ? avgSlopAcrossProfiles(scopedPrevious) : null;
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
      const strictCurrent = profileByName(latest, 'strict');
      const strictPrevious = profileByName(scopedPrevious, 'strict');
      const strictP95Current = asNumOrNull(strictCurrent?.latencyP95Ms);
      const strictP95Previous = asNumOrNull(strictPrevious?.latencyP95Ms);
      const strictHeapCurrent = asNumOrNull(strictCurrent?.peakHeapUsedMB);
      const strictHeapPrevious = asNumOrNull(strictPrevious?.peakHeapUsedMB);
      const strictRssCurrent = asNumOrNull(strictCurrent?.peakRssMB);
      const strictRssPrevious = asNumOrNull(strictPrevious?.peakRssMB);
      const strictP95Delta = (strictP95Current !== null && strictP95Previous !== null)
        ? Number((strictP95Current - strictP95Previous).toFixed(2))
        : null;
      const strictHeapDelta = (strictHeapCurrent !== null && strictHeapPrevious !== null)
        ? Number((strictHeapCurrent - strictHeapPrevious).toFixed(2))
        : null;
      const strictRssDelta = (strictRssCurrent !== null && strictRssPrevious !== null)
        ? Number((strictRssCurrent - strictRssPrevious).toFixed(2))
        : null;
      const hasBaseline = Boolean(validBaseline);

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
      const [strictP95CurrentText, strictP95PrevText] = formatCurrentPrev(strictP95Current, strictP95Previous, 'ms');
      const [strictHeapCurrentText, strictHeapPrevText] = formatCurrentPrev(strictHeapCurrent, strictHeapPrevious, 'MB');
      const [strictRssCurrentText, strictRssPrevText] = formatCurrentPrev(strictRssCurrent, strictRssPrevious, 'MB');

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
      const strictP95Status = deltaStatus(strictP95Delta, 'latency');
      const strictP95Vol = strictP95Delta === null ? 'n/a' : classifyVolatility(Math.abs(strictP95Delta), 25, 150);
      const strictHeapStatus = deltaStatus(strictHeapDelta, 'memory');
      const strictHeapVol = strictHeapDelta === null ? 'n/a' : classifyVolatility(Math.abs(strictHeapDelta), 5, 20);
      const strictRssStatus = deltaStatus(strictRssDelta, 'memory');
      const strictRssVol = strictRssDelta === null ? 'n/a' : classifyVolatility(Math.abs(strictRssDelta), 10, 40);
      const baselineText = hasBaseline
        ? ('Same-pack ' + (baselineId || 'n/a'))
        : ('No same-pack baseline' + (previous && !samePack ? ' (pack mismatch)' : (previous && !baselineMatch ? ' (baseline mismatch)' : '')));
      const coreLoopSummary = [
        'Q ' + signedDelta(qualityDelta),
        'R ' + signedDelta(reliabilityDelta),
        'P95 ' + signedDelta(strictP95Delta, 'ms'),
        'S ' + signedDelta(slopDelta, '%'),
      ].join(' | ');
      const coreLoopWarnings = Array.isArray(latest?.warnings)
        ? latest.warnings.filter((code) =>
            code === 'latency_p95_warn' ||
            code === 'heap_peak_warn' ||
            code === 'rss_peak_warn' ||
            code === 'quality_drop_warn' ||
            code === 'reliability_drop_warn' ||
            code === 'slop_rise_warn' ||
            code === 'strict_reliability_floor_warn'
          )
        : [];
      const coreLoopStatus = coreLoopWarnings.length > 0
        ? ((strictP95Status === 'Flat' && qualityStatus === 'Plateau' && relStatus === 'Locked') ? 'Watch' : 'Changed')
        : (hasBaseline ? 'Stable' : 'Neutral');
      const coreLoopVol = hasBaseline
        ? classifyVolatility(
            Math.max(
              Math.abs(qualityDelta || 0),
              Math.abs(reliabilityDelta || 0),
              Math.abs(slopDelta || 0),
              Math.abs(strictP95Delta || 0) / 100
            ),
            1,
            3
          )
        : 'Low';

      trendEl.innerHTML =
        '<table><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Delta</th><th>Status</th><th>Volatility</th></tr></thead><tbody>' +
          '<tr><td>Baseline</td><td>' + baselineText + '</td><td>' + (scopedPrevious?.id || 'n/a') + '</td><td>' + (hasBaseline ? 'same-pack' : '-') + '</td><td>' + statusBadge(hasBaseline ? 'Stable' : 'Neutral') + '</td><td>' + volatilityBadge('Low') + '</td></tr>' +
          '<tr><td>Core Loop</td><td colspan="3">' + coreLoopSummary + (coreLoopWarnings.length ? (' | ' + coreLoopWarnings.map(warningBadge).join(' ')) : '') + '</td><td>' + statusBadge(coreLoopStatus) + '</td><td>' + volatilityBadge(coreLoopVol) + '</td></tr>' +
          '<tr><td>Path</td><td><code>' + currentPath + '</code></td><td><code>' + previousPath + '</code></td><td>-</td><td>' + statusBadge(pathStatus(currentPath, previousPath)) + '</td><td>' + volatilityBadge('Low') + '</td></tr>' +
          '<tr><td>Queries</td><td>' + currentQueries + '</td><td>' + (previousQueries === null ? 'n/a' : previousQueries) + '</td><td>' + (queriesDelta === null ? '-' : queriesDelta) + '</td><td>' + statusBadge(queriesStatus) + '</td><td>' + volatilityBadge(queriesVol) + '</td></tr>' +
          '<tr><td>Top Quality</td><td>' + qualityCurrentText + '</td><td>' + qualityPrevText + '</td><td>' + signedDelta(qualityDelta) + '</td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityBadge(qualityVol) + '</td></tr>' +
          '<tr><td>Strict p95</td><td>' + strictP95CurrentText + '</td><td>' + strictP95PrevText + '</td><td>' + signedDelta(strictP95Delta, 'ms') + '</td><td>' + statusBadge(strictP95Status) + '</td><td>' + volatilityBadge(strictP95Vol) + '</td></tr>' +
          '<tr><td>Strict Heap</td><td>' + strictHeapCurrentText + '</td><td>' + strictHeapPrevText + '</td><td>' + signedDelta(strictHeapDelta, 'MB') + '</td><td>' + statusBadge(strictHeapStatus) + '</td><td>' + volatilityBadge(strictHeapVol) + '</td></tr>' +
          '<tr><td>Strict RSS</td><td>' + strictRssCurrentText + '</td><td>' + strictRssPrevText + '</td><td>' + signedDelta(strictRssDelta, 'MB') + '</td><td>' + statusBadge(strictRssStatus) + '</td><td>' + volatilityBadge(strictRssVol) + '</td></tr>' +
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
    const renderLoopStatus = (data, latestSnapshot) => {
      if (!data || !Array.isArray(data.stages)) {
        loopStatusEl.innerHTML = '<pre>No loop status found.</pre>';
        return;
      }

      const localLatestId = latestSnapshot?.id || null;
      const localWarnings = Array.isArray(latestSnapshot?.warnings) ? latestSnapshot.warnings : [];
      const localCoverageLines = Number(latestSnapshot?.coverage?.lines || 0);
      const statusCoverageLines = Number(data?.coverage?.lines || 0);
      const warningsMatch = JSON.stringify([...localWarnings].sort()) === JSON.stringify([...(data.warnings || [])].sort());
      const snapshotIdMatch = !localLatestId || data.latestSnapshotId === localLatestId;
      const coverageMatch = localCoverageLines > 0 ? localCoverageLines === statusCoverageLines : true;

      const stages = data.stages.map((stage) => ({ ...stage }));
      const parityStage = stages.find((stage) => stage.id === 'dashboard_parity');
      if (parityStage) {
        const parityErrors = [];
        if (!snapshotIdMatch) parityErrors.push('snapshot_id_mismatch');
        if (!warningsMatch) parityErrors.push('warnings_mismatch');
        if (!coverageMatch) parityErrors.push('coverage_mismatch');
        if (parityErrors.length > 0) {
          parityStage.status = 'fail';
          parityStage.reason = 'Dashboard drift detected against loaded latest snapshot.';
          parityStage.evidence = [
            ...(parityStage.evidence || []),
            ...parityErrors,
          ];
        }
      }

      const hasFail = stages.some((s) => s.status === 'fail');
      const hasWarn = stages.some((s) => s.status === 'warn');
      const closed = !hasFail && Boolean(data.loopClosed);
      const loopBadge = statusBadge(closed ? 'Stable' : (hasWarn ? 'Watch' : 'Down'));
      const rows = stages.map((stage) =>
        '<tr>' +
          '<td><code>' + stage.id + '</code></td>' +
          '<td>' + stageStatusBadge(String(stage.status || 'neutral')) + '</td>' +
          '<td>' + (stage.reason || '-') + '</td>' +
          '<td>' + ((stage.evidence || []).map((e) => '<code>' + e + '</code>').join('<br/>') || '-') + '</td>' +
        '</tr>'
      ).join('');

      loopStatusEl.innerHTML =
        '<div class="meta">loopClosed=' + (closed ? 'yes' : 'no') +
        ' ' + loopBadge +
        ' snapshot=' + (data.latestSnapshotId || 'n/a') +
        ' queryPack=' + (data.queryPack || 'n/a') +
        ' coverageLOC=' + (statusCoverageLines || 'n/a') +
        ' warnings=' + ((data.warnings || []).length || 0) +
        '</div>' +
        '<div class="meta">loopClosedReason=' + (data.loopClosedReason || 'n/a') + '</div>' +
        '<table><thead><tr><th>Stage</th><th>Status</th><th>Reason</th><th>Evidence</th></tr></thead><tbody>' + rows + '</tbody></table>';
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
        ' runClass=' + (data.runClass || 'n/a') +
        ' concurrency=' + (data.concurrency ?? 'n/a') +
        ' deltaBasis=' + (data.deltaBasis || 'n/a') +
        ' baseline=' + (data.baselineSnapshotId || 'none') +
        ' uploadedObjects=' + (data.uploadedObjects || 0) +
        ' retries=' + (data.uploadRetries ?? 'n/a') +
        ' gzip=' + (data.gzip ? 'true' : 'false') +
        ' mode=' + (data.mode || 'n/a') +
        ' bucket=' + (data.bucket || 'n/a') +
        '</div>' +
        '<div class="meta">warnings=' + ((Array.isArray(data.warnings) && data.warnings.length > 0) ? data.warnings.map(warningBadge).join(' ') : 'none') + '</div>' +
        '<div class="meta">delta=' + JSON.stringify(data.delta || {}) + '</div>' +
        '<table><thead><tr><th>Key</th><th>Elapsed (ms)</th><th>Attempts</th></tr></thead><tbody>' + rows + '</tbody></table>';
    };
    const findPreviousSamePack = (snapshots, current) => {
      if (!Array.isArray(snapshots) || !current) return null;
      const currentPack = current.queryPack || 'core_delivery';
      const baselineId = current.baselineSnapshotId || null;
      if (baselineId) {
        const byBaseline = snapshots.find((s) => s.id === baselineId && (s.queryPack || 'core_delivery') === currentPack);
        if (byBaseline) return byBaseline;
      }
      return snapshots.find((s) => s.id !== current.id && (s.queryPack || 'core_delivery') === currentPack) || null;
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
      const dnsChecked = Number(data.dnsPrefetch?.checked || 0);
      const dnsResolved = Number(data.dnsPrefetch?.resolved || 0);
      const dnsRatio = dnsChecked > 0 ? dnsResolved / dnsChecked : 0;
      const latestCount = Array.isArray(data.latest) ? data.latest.length : 0;
      const latestPresent = Array.isArray(data.latest) ? data.latest.filter((item) => item.exists).length : 0;
      const storageRatio = latestCount > 0 ? latestPresent / latestCount : 0;
      const dnsStatus = String(data.health?.dns?.status || healthLabel(dnsRatio)).toLowerCase();
      const storageStatus = String(data.health?.storage?.status || healthLabel(storageRatio)).toLowerCase();
      const cookieStatus = String(data.health?.cookie?.status || 'neutral').toLowerCase();
      const overallStatus = String(data.health?.overall?.status || dnsStatus).toLowerCase();
      const overallScore = Number(data.health?.overall?.score);
      const overallScoreText = Number.isFinite(overallScore) ? (overallScore * 100).toFixed(0) + '%' : 'n/a';
      const strictP95Ms = Number(data.health?.latency?.strictP95Ms);
      const strictP95Text = Number.isFinite(strictP95Ms) ? strictP95Ms.toFixed(0) + 'ms' : 'n/a';
      const dnsStatusText = 'DNS ' + dnsResolved + '/' + dnsChecked + ' ' + dnsStatus;
      const storageStatusText = 'Storage ' + latestPresent + '/' + latestCount + ' ' + storageStatus;
      const cookieChecked = Number(data.health?.cookie?.checked);
      const cookieResolved = Number(data.health?.cookie?.resolved);
      const cookieSyncDelta = Number(data.health?.cookie?.syncDelta);
      const cookieScoreValue = Number(data.health?.cookie?.cookieScore);
      const cookieHexBadge = String(data.health?.cookie?.hexBadge || '#666666');
      const cookieUnicodeBar = String(data.health?.cookie?.unicodeBar || '░░░░░░░░░░').normalize('NFC');
      const cookieUnresolvedSet = new Set(
        Array.isArray(data.health?.cookie?.unresolved)
          ? data.health.cookie.unresolved.map((v) => String(v || '').trim().toLowerCase())
          : []
      );
      const baseUrl = String(data.baseUrl || data.domain || 'factory-wager.com').trim().toLowerCase();
      const cookieStatusText =
        'Cookie DNS ' +
        (Number.isFinite(cookieResolved) ? cookieResolved : 'n/a') +
        '/' +
        (Number.isFinite(cookieChecked) ? cookieChecked : 'n/a') +
        ' ' +
        cookieStatus +
        (Number.isFinite(cookieScoreValue) ? ' score=' + cookieScoreValue : '') +
        (Number.isFinite(cookieSyncDelta) ? ' (Δ ' + (cookieSyncDelta * 100).toFixed(0) + '%)' : '');
      const overallStatusText = 'Domain ' + overallStatus + (data.health?.latency?.degradedByStrictP95 ? ' (strict p95 ' + strictP95Text + ')' : '');
      const modeHint =
        data.source === 'local'
          ? 'Local mode uses placeholder storage keys. Use Load R2 for bucket-backed health objects.'
          : 'R2 mode reflects bucket-backed health objects.';
      const latestRows = (data.latest || []).map((item) =>
        '<tr>' +
          '<td><code>' + item.type + '</code></td>' +
          '<td><code>' + item.key + '</code></td>' +
          '<td>' + healthBadge(item.exists ? 1 : 0, item.exists ? '✓ present' : '✗ missing') + '</td>' +
          '<td>' + (item.lastModified || 'n/a') + '</td>' +
        '</tr>'
      ).join('');
      const latestMissing = Math.max(0, latestCount - latestPresent);
      const latestWithTimestamp = Array.isArray(data.latest)
        ? data.latest.filter((item) => Boolean(item?.lastModified)).length
        : 0;
      const latestFooter =
        '<tr>' +
          '<td><strong>Total</strong></td>' +
          '<td><code>' + latestCount + ' keys</code></td>' +
          '<td>' + healthBadge(latestCount > 0 ? latestPresent / latestCount : 0, '✓ ' + latestPresent + ' / ✗ ' + latestMissing) + '</td>' +
          '<td>' + latestWithTimestamp + ' timestamped</td>' +
        '</tr>';
      const subRows = (data.subdomains || []).slice(0, 24).map((item) =>
      {
        const fullDomain = String(item.fullDomain || '').trim().toLowerCase();
        const cookieSymbol = !data.health?.cookie?.enabled
          ? '⚪'
          : cookieUnresolvedSet.has(fullDomain)
            ? '🍪⚠️'
            : data.health?.cookie?.status === 'critical'
              ? '🍪🔴'
              : data.health?.cookie?.status === 'degraded'
                ? '🍪🟡'
                : '🍪🟢';
        return (
        '<tr>' +
          '<td><code>' + item.subdomain + '</code></td>' +
          '<td><code>' + (item.urlFragment || item.subdomain || 'n/a') + '</code></td>' +
          '<td><code>' + (item.path || '/') + '</code></td>' +
          '<td><code>' + item.fullDomain + '</code></td>' +
          '<td>' + healthBadge(item.dnsResolved ? 1 : 0, item.dnsResolved ? '✓ resolved' : '✗ unresolved') + '</td>' +
          '<td>' + ((item.dnsRecords || []).slice(0, 2).join(', ') || 'n/a') + '</td>' +
          '<td>' + (item.dnsSource || 'live') + '</td>' +
          '<td>' + (item.lastCheckedAt || 'n/a') + '</td>' +
          '<td>' + cookieSymbol + '</td>' +
        '</tr>'
      );
      }).join('');
      const subList = (data.subdomains || []).slice(0, 24);
      const subTotal = subList.length;
      const subResolved = subList.filter((item) => Boolean(item?.dnsResolved)).length;
      const subUnresolved = Math.max(0, subTotal - subResolved);
      const subCookieFlagged = subList.filter((item) => cookieUnresolvedSet.has(String(item?.fullDomain || '').trim().toLowerCase())).length;
      const subFooter =
        '<tr>' +
          '<td><strong>Total</strong></td>' +
          '<td><code>' + subTotal + '</code></td>' +
          '<td><code>—</code></td>' +
          '<td>' + healthBadge(subTotal > 0 ? subResolved / subTotal : 0, '✓ ' + subResolved + ' / ✗ ' + subUnresolved) + '</td>' +
          '<td>records n/a</td>' +
          '<td>mixed</td>' +
          '<td>latest check</td>' +
          '<td>flagged ' + subCookieFlagged + '</td>' +
          '<td>' + (subCookieFlagged > 0 ? '🍪⚠️' : '🍪🟢') + '</td>' +
        '</tr>';
      domainHealthEl.innerHTML =
        '<div class="meta">domain=' + (data.domain || 'factory-wager.com') + ' zone=' + (data.zone || 'n/a') + ' account=' + (data.accountId || 'n/a') + ' knownSubdomains=' + (data.knownSubdomains ?? 'n/a') + ' source=' + sourceBadge(data.source || 'n/a') + '</div>' +
        '<div class="meta">' +
          healthBadge(healthRatioByState(overallStatus), overallStatusText) + ' ' +
          healthBadge(Number.isFinite(overallScore) ? overallScore : healthRatioByState(overallStatus), 'Health score ' + overallScoreText) + ' ' +
          healthBadge(healthRatioByState(dnsStatus), dnsStatusText) + ' ' +
          healthBadge(healthRatioByState(storageStatus), storageStatusText) + ' ' +
          healthBadge(healthRatioByState(cookieStatus), cookieStatusText) +
        '</div>' +
        '<div class="meta">' + modeHint + '</div>' +
        '<div class="meta">base_url=<code>' + baseUrl + '</code> url_fragment=<code>{subdomain}</code> path=<code>{path}</code> full_domain=<code>{url_fragment}.{base_url}</code></div>' +
        '<div class="meta">storage bucket=' + (data.storage?.bucket || 'n/a') + ' endpoint=' + (data.storage?.endpoint || 'n/a') + ' prefix=<code>' + (data.storage?.domainPrefix || 'n/a') + '</code></div>' +
        '<div class="meta">storageKey health=<code>' + (data.storage?.sampleKeys?.health || 'n/a') + '</code></div>' +
        '<div class="meta">dnsChecked=' + (data.dnsPrefetch?.checked ?? 0) + ' dnsResolved=' + (data.dnsPrefetch?.resolved ?? 0) + ' cacheTtlSec=' + (data.dnsPrefetch?.cacheTtlSec ?? 'n/a') + '</div>' +
        '<div class="meta">cookieTelemetry=' + (data.health?.cookie?.detail || 'n/a') + ' domainMatch=' + (data.health?.cookie?.domainMatchesRequested ?? 'n/a') + ' cookieScore=' + (Number.isFinite(cookieScoreValue) ? cookieScoreValue : 'n/a') + ' hex=' + cookieHexBadge + ' bar=' + cookieUnicodeBar + ' <span class="badge" style="background:' + cookieHexBadge + ';border-color:' + cookieHexBadge + ';color:#0b0d12">■</span></div>' +
        '<table><thead><tr><th>Type</th><th>Key</th><th>Exists</th><th>Last Modified</th></tr></thead><tbody>' + latestRows + '</tbody><tfoot>' + latestFooter + '</tfoot></table>' +
        '<table style="margin-top:10px"><thead><tr><th>Subdomain</th><th>URL Fragment</th><th>Path</th><th>Full Domain</th><th>DNS</th><th>Records</th><th>Source</th><th>Last Checked</th><th>Cookie</th></tr></thead><tbody>' + (subRows || '<tr><td colspan="9">No subdomain data.</td></tr>') + '</tbody><tfoot>' + subFooter + '</tfoot></table>';
    };
    const renderRss = (xmlText, source, meta) => {
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
        const rssMeta =
          meta && !meta.error
            ? '<div class="meta">storage bucket=' + (meta.bucket || 'n/a') +
              ' endpoint=' + (meta.endpoint || 'n/a') +
              ' prefix=<code>' + (meta.prefix || 'n/a') + '</code>' +
              ' key=<code>' + (meta.rssKey || 'n/a') + '</code>' +
              '</div>' +
              '<div class="meta">rssUrl=' + (meta.rssUrl || 'n/a') + '</div>'
            : '<div class="meta">storage metadata unavailable</div>';
        rssEl.innerHTML =
          '<div class="meta">source=' + source + ' feed=<code>/api/rss?source=' + source + '</code></div>' +
          rssMeta +
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
    const fetchJson = async (url) => {
      const res = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error('Invalid JSON from ' + url);
      }
      if (!res.ok) {
        throw new Error((data && data.error) ? (url + ': ' + data.error) : (url + ': HTTP ' + res.status));
      }
      return data;
    };
    let refreshInFlight = false;
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
      if (refreshInFlight) return;
      refreshInFlight = true;
      try {
        activeSource = source;
        writeStoredSource(source);
        const indexData = await fetchJson('/api/index?source=' + source);
        lastHistory = indexData;
        const data = await fetchJson('/api/latest?source=' + source);
        const prevEntry = findPreviousSamePack(indexData?.snapshots, data);
        if (prevEntry?.id) {
          previousSnapshot = await fetchJson('/api/snapshot?id=' + encodeURIComponent(prevEntry.id) + '&source=' + source);
        } else {
          previousSnapshot = null;
        }
        renderLatest(data);
        currentLatestId = data?.id || currentLatestId;
        knownLatestId = data?.id || knownLatestId;
        clearReportNotice();
        const manifest = await fetchJson('/api/publish-manifest?source=' + source);
        renderPublish(manifest);
        const inventory = await fetchJson('/api/r2-inventory?source=' + source + '&id=' + encodeURIComponent(data?.id || ''));
        renderInventory(inventory);
        const strictP95 = strictP95FromSnapshot(data);
        const domainUrl = '/api/domain-health?source=' + source + (strictP95 === null ? '' : '&strictP95=' + encodeURIComponent(String(strictP95)));
        const domain = await fetchJson(domainUrl);
        renderDomainHealth(domain);
        const loop = await fetchJson('/api/loop-status?source=local');
        renderLoopStatus(loop, data);
        const rssMeta = await fetchJson('/api/rss-meta?source=' + source);
        const rssRes = await fetch('/api/rss?source=' + source, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const rssText = await rssRes.text();
        renderRss(rssText, source, rssMeta);
        const guid = parseLatestRssGuid(rssText);
        if (guid) {
          currentRssGuid = guid;
          knownRssGuid = guid;
        }
        setRssBadge('RSS synced', 'ok');
      } catch (error) {
        setRssBadge('RSS unavailable', 'neutral');
        const message = error instanceof Error ? error.message : String(error);
        setReportNotice('<span class="badge status-bad">Refresh failed</span> <code>' + message + '</code>');
      } finally {
        refreshInFlight = false;
      }
    }
    async function loadHistory() {
      try {
        activeSource = 'local';
        writeStoredSource('local');
        const localData = await fetchJson('/api/index');
        renderHistory(localData);
        const latestData = await fetchJson('/api/latest?source=local');
        const prevEntry = findPreviousSamePack(localData?.snapshots, latestData);
        if (prevEntry?.id) {
          previousSnapshot = await fetchJson('/api/snapshot?id=' + encodeURIComponent(prevEntry.id) + '&source=local');
        } else {
          previousSnapshot = null;
        }
        renderLatest(latestData);
        currentLatestId = latestData?.id || currentLatestId;
        knownLatestId = latestData?.id || knownLatestId;
        clearReportNotice();
        const manifest = await fetchJson('/api/publish-manifest?source=local');
        renderPublish(manifest);
        const inventory = await fetchJson('/api/r2-inventory?source=local&id=' + encodeURIComponent(latestData?.id || ''));
        renderInventory(inventory);
        const strictP95 = strictP95FromSnapshot(latestData);
        const domainUrl = '/api/domain-health?source=local' + (strictP95 === null ? '' : '&strictP95=' + encodeURIComponent(String(strictP95)));
        const domain = await fetchJson(domainUrl);
        renderDomainHealth(domain);
        const loop = await fetchJson('/api/loop-status?source=local');
        renderLoopStatus(loop, latestData);
        const rssMeta = await fetchJson('/api/rss-meta?source=local');
        const rssRes = await fetch('/api/rss?source=local', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const rssText = await rssRes.text();
        renderRss(rssText, 'local', rssMeta);
        const guid = parseLatestRssGuid(rssText);
        if (guid) {
          currentRssGuid = guid;
          knownRssGuid = guid;
        }
        setRssBadge('RSS synced', 'ok');
      } catch (error) {
        setRssBadge('RSS unavailable', 'neutral');
        const message = error instanceof Error ? error.message : String(error);
        setReportNotice('<span class="badge status-bad">History refresh failed</span> <code>' + message + '</code>');
      }
    }
    document.getElementById('loadLocal').onclick = () => loadLatest('local');
    document.getElementById('loadR2').onclick = () => loadLatest('r2');
    document.getElementById('loadHistory').onclick = () => loadHistory();
    rssBadgeEl.onclick = () => loadLatest(activeSource);
    loadLatest(INITIAL_SOURCE);
    // SSE hot reload is intentionally disabled in this build for stability.
    setInterval(() => {
      checkForNewReports();
      checkForNewRssItems();
    }, 15000);
    }
  </script>
</body>
</html>`;
}

async function fetchR2Json(r2Base: string, name: string): Promise<Response> {
  const base = r2Base.replace(/\/+$/g, '');
  const targets = [`${base}/${name}.gz`, `${base}/${name}`];

  for (const target of targets) {
    const res = await proxyFetch(target, { cache: 'no-store' });
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

  return proxyFetch(url, {
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
  const startedAt = Date.now();
  process.on('uncaughtException', (error) => {
    console.error('[search-bench:dashboard] uncaughtException', error);
  });
  process.on('unhandledRejection', (error) => {
    console.error('[search-bench:dashboard] unhandledRejection', error);
  });
  const options = parseArgs(process.argv.slice(2));
  const buildMeta = resolveBuildMeta();
  const dir = resolve(options.dir);
  const latestJson = resolve(dir, 'latest.json');
  const indexJson = resolve(dir, 'index.json');
  const rssXml = resolve(dir, 'rss.xml');
  const loopStatusJson = resolve('reports/search-loop-status-latest.json');
  const responseCache = new Map<string, CachedResponse>();
  const inflight = new Map<string, Promise<CachedResponse>>();
  const hotReloadClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const sseEncoder = new TextEncoder();
  const dnsPrefetchTtlMs = 120000;
  const nsCache = new Map<string, { expiresAt: number; servers: string[] }>();
  const dnsCache = new Map<string, {
    expiresAt: number;
    resolved: boolean;
    records: string[];
    source: 'A' | 'CNAME' | 'none';
      error?: string;
  }>();

  const zoneFromHost = (host: string): string => {
    const parts = String(host || '').toLowerCase().split('.').filter(Boolean);
    if (parts.length >= 2) return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    return String(host || '').toLowerCase();
  };

  const resolveDnsAuthoritative = async (host: string): Promise<{
    resolved: boolean;
    records: string[];
    source: 'A' | 'CNAME' | 'none';
    error?: string;
  }> => {
    const zone = zoneFromHost(host);
    const now = Date.now();
    const cached = nsCache.get(zone);
    let servers = cached && cached.expiresAt > now ? cached.servers : [];
    if (servers.length === 0) {
      try {
        servers = (await resolveNs(zone)).filter(Boolean);
      } catch {
        servers = [];
      }
      if (servers.length > 0) {
        nsCache.set(zone, { expiresAt: now + dnsPrefetchTtlMs, servers });
      }
    }
    if (servers.length === 0) {
      return { resolved: false, records: [], source: 'none', error: 'authoritative_nameservers_not_found' };
    }

    for (const server of servers) {
      let serverIp = server;
      try {
        const nsIps = await resolve4(server.replace(/\.$/, ''));
        if (Array.isArray(nsIps) && nsIps.length > 0) {
          serverIp = nsIps[0];
        }
      } catch {
        serverIp = server;
      }
      const resolver = new Resolver();
      resolver.setServers([serverIp]);
      try {
        const a = await resolver.resolve4(host);
        if (Array.isArray(a) && a.length > 0) {
          return { resolved: true, records: a.slice(0, 4), source: 'A' };
        }
      } catch {
        // try CNAME on same server
      }
      try {
        const c = await resolver.resolveCname(host);
        if (Array.isArray(c) && c.length > 0) {
          return { resolved: true, records: c.slice(0, 4), source: 'CNAME' };
        }
      } catch {
        // try next nameserver
      }
    }
    return { resolved: false, records: [], source: 'none', error: 'authoritative_lookup_failed' };
  };

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
      const res = await proxyFetch(`${base}/${name}`, { method: 'HEAD', cache: 'no-store' });
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

  const resolveDnsPrefetch = async (host: string): Promise<{
    resolved: boolean;
    records: string[];
    source: 'A' | 'CNAME' | 'none';
    cacheHit: boolean;
    error?: string;
  }> => {
    const key = host.toLowerCase();
    const now = Date.now();
    const cached = dnsCache.get(key);
    if (cached && cached.expiresAt > now) {
      return {
        resolved: cached.resolved,
        records: cached.records,
        source: cached.source,
        error: cached.error,
        cacheHit: true,
      };
    }

    let result: {
      resolved: boolean;
      records: string[];
      source: 'A' | 'CNAME' | 'none';
      error?: string;
    };

    try {
      const aRecords = await resolve4(host);
      result = {
        resolved: Array.isArray(aRecords) && aRecords.length > 0,
        records: (aRecords || []).slice(0, 4),
        source: 'A',
      };
    } catch (aError) {
      try {
        const cnameRecords = await resolveCname(host);
        result = {
          resolved: Array.isArray(cnameRecords) && cnameRecords.length > 0,
          records: (cnameRecords || []).slice(0, 4),
          source: 'CNAME',
        };
      } catch (cnameError) {
        const auth = await resolveDnsAuthoritative(host);
        if (auth.resolved) {
          result = auth;
        } else {
          result = {
            resolved: false,
            records: [],
            source: 'none',
            error: (cnameError instanceof Error ? cnameError.message : (aError instanceof Error ? aError.message : String(aError))),
          };
        }
      }
    }

    dnsCache.set(key, {
      expiresAt: now + dnsPrefetchTtlMs,
      resolved: result.resolved,
      records: result.records,
      source: result.source,
      error: result.error,
    });

    return { ...result, cacheHit: false };
  };

  const sseWrite = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: string,
    payload: unknown
  ) => {
    controller.enqueue(sseEncoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
  };

  const broadcastHotReload = (reason: string) => {
    const payload = { type: 'reload', reason, at: new Date().toISOString() };
    for (const controller of hotReloadClients) {
      try {
        sseWrite(controller, 'reload', payload);
      } catch {
        hotReloadClients.delete(controller);
      }
    }
  };

  if (options.hotReload) {
    const watchedPaths = [
      Bun.main,
      latestJson,
      indexJson,
      rssXml,
      loopStatusJson,
    ];
    const mtimes = new Map<string, number>();
    const readMtime = (file: string): number => {
      try {
        return existsSync(file) ? statSync(file).mtimeMs : 0;
      } catch {
        return 0;
      }
    };
    for (const file of watchedPaths) {
      mtimes.set(file, readMtime(file));
    }
    setInterval(() => {
      for (const file of watchedPaths) {
        const prev = mtimes.get(file) || 0;
        const next = readMtime(file);
        if (next !== prev) {
          mtimes.set(file, next);
          broadcastHotReload(file);
        }
      }
    }, 1000);
    setInterval(() => {
      for (const controller of hotReloadClients) {
        try {
          sseWrite(controller, 'ping', { at: Date.now() });
        } catch {
          hotReloadClients.delete(controller);
        }
      }
    }, 15000);
  }

  const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

  const statusFromRatio = (ratio: number): 'healthy' | 'degraded' | 'critical' => {
    if (ratio >= 0.9) return 'healthy';
    if (ratio >= 0.6) return 'degraded';
    return 'critical';
  };

  const scoreByState = (status: string): number => {
    const s = String(status || '').toLowerCase();
    if (s === 'healthy') return 1;
    if (s === 'degraded') return 0.7;
    if (s === 'critical') return 0.05;
    return 0.5;
  };

  const assessCookieTelemetry = (
    telemetry: CookieTelemetryInput | null,
    domain: string,
    dnsRatio: number
  ) => {
    if (!telemetry || !telemetry.enabled) {
      return {
        enabled: false,
        status: 'neutral',
        score: 0.5,
        ratio: null,
        checked: null,
        resolved: null,
        domainMatchesRequested: null,
        syncDelta: null,
        detail: 'cookies disabled',
        unresolved: [],
      };
    }
    const ratio = telemetry.dnsCookieRatio;
    const hasDnsCookie = telemetry.hasSubdomainCookie;
    const parsedDnsCookie = telemetry.parsedSubdomain;
    const hasDomainCookie = telemetry.hasDomainCookie;
    const parsedDomainCookie = telemetry.parsedDomain;
    const domainMatches = telemetry.domainMatchesRequested;
    if (!hasDnsCookie || !hasDomainCookie) {
      return {
        enabled: true,
        status: 'degraded',
        score: 0.45,
        ratio: null,
        checked: telemetry.dnsCookieChecked,
        resolved: telemetry.dnsCookieResolved,
        domainMatchesRequested: domainMatches,
        syncDelta: null,
        detail: `missing cookie telemetry for ${domain}`,
        unresolved: telemetry.cookieUnresolved,
      };
    }
    if (!parsedDnsCookie || !parsedDomainCookie) {
      return {
        enabled: true,
        status: 'critical',
        score: 0.2,
        ratio: null,
        checked: telemetry.dnsCookieChecked,
        resolved: telemetry.dnsCookieResolved,
        domainMatchesRequested: domainMatches,
        syncDelta: null,
        detail: 'cookie telemetry parse failed',
        unresolved: telemetry.cookieUnresolved,
      };
    }
    if (typeof ratio !== 'number' || !Number.isFinite(ratio)) {
      return {
        enabled: true,
        status: 'degraded',
        score: 0.55,
        ratio: null,
        checked: telemetry.dnsCookieChecked,
        resolved: telemetry.dnsCookieResolved,
        domainMatchesRequested: domainMatches,
        syncDelta: null,
        detail: 'cookie dns ratio unavailable',
        unresolved: telemetry.cookieUnresolved,
      };
    }
    const normalizedRatio = clamp01(ratio);
    const syncDelta = Math.abs(normalizedRatio - dnsRatio);
    let score = normalizedRatio;
    if (syncDelta <= 0.05) score += 0.15;
    else if (syncDelta <= 0.15) score += 0.05;
    else if (syncDelta >= 0.3) score -= 0.3;
    else if (syncDelta >= 0.2) score -= 0.15;
    if (domainMatches === false) score -= 0.25;
    score = clamp01(score);
    return {
      enabled: true,
      status: statusFromRatio(score),
      score,
      ratio: normalizedRatio,
      checked: telemetry.dnsCookieChecked,
      resolved: telemetry.dnsCookieResolved,
      domainMatchesRequested: domainMatches,
      syncDelta,
      detail: domainMatches === false
        ? 'cookie domain mismatch'
        : syncDelta <= 0.05
          ? 'dns cookie synced'
          : 'dns cookie drift detected',
      unresolved: telemetry.cookieUnresolved,
    };
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const withCookieBadgeTelemetry = <T extends { score: number }>(cookieHealth: T) => {
    const cookieScore = Math.round(clamp01(cookieHealth.score) * 100);
    const hue = Math.round(clamp01(cookieHealth.score) * 120);
    const hexBadge = hslToHex(hue, 85, 46);
    const rgb = {
      r: Number.parseInt(hexBadge.slice(1, 3), 16),
      g: Number.parseInt(hexBadge.slice(3, 5), 16),
      b: Number.parseInt(hexBadge.slice(5, 7), 16),
    };
    const filled = Math.max(0, Math.min(10, Math.round(cookieScore / 10)));
    const unicodeBar = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
    return {
      ...cookieHealth,
      cookieScore,
      hexBadge,
      rgb,
      ansiBg: `\\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`,
      unicodeBar,
    };
  };

  const defaultCookieTelemetry = (domain: string): R2CookieTelemetry => ({
    score: 50,
    disabled: true,
    total: 0,
    secureCount: 0,
    httpOnlyCount: 0,
    sameSiteCount: 0,
    expiryCount: 0,
    unresolved: [],
    source: 'default',
    key: `domains/${domain}/cookies.json`,
  });

  const normalizeCookieRows = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.cookies)) return payload.cookies;
      if (Array.isArray(payload.items)) return payload.items;
      if (Array.isArray(payload.entries)) return payload.entries;
    }
    return [];
  };

  const normalizeCookieObject = (row: any): Record<string, any> | null => {
    if (!row) return null;
    if (row instanceof Map) return Object.fromEntries(row.entries());
    if (Array.isArray(row)) {
      if (row.length === 2 && typeof row[0] === 'string') {
        if (row[1] && typeof row[1] === 'object') {
          return { name: row[0], ...(row[1] as Record<string, any>) };
        }
        return { name: row[0], value: row[1] };
      }
      return null;
    }
    if (typeof row === 'object') {
      if (row.cookie && typeof row.cookie === 'object') return row.cookie as Record<string, any>;
      return row as Record<string, any>;
    }
    return null;
  };

  const parseBooleanLike = (value: any): boolean => {
    if (value === true) return true;
    if (value === false) return false;
    const text = String(value || '').trim().toLowerCase();
    return text === '1' || text === 'true' || text === 'yes' || text === 'on';
  };

  const computeCookieScore = (rows: any[]): Omit<R2CookieTelemetry, 'source' | 'key' | 'error'> => {
    const cookies = rows
      .map((row) => normalizeCookieObject(row))
      .filter((v): v is Record<string, any> => Boolean(v));
    const total = cookies.length;
    if (total === 0) {
      return {
        score: 50,
        disabled: true,
        total: 0,
        secureCount: 0,
        httpOnlyCount: 0,
        sameSiteCount: 0,
        expiryCount: 0,
        unresolved: [],
      };
    }

    let secureCount = 0;
    let httpOnlyCount = 0;
    let sameSiteCount = 0;
    let expiryCount = 0;
    const unresolved = new Set<string>();
    const nowMs = Date.now();

    for (const cookie of cookies) {
      if (parseBooleanLike(cookie.secure)) secureCount += 1;
      if (parseBooleanLike(cookie.httpOnly ?? cookie.httponly)) httpOnlyCount += 1;
      const sameSite = String(cookie.sameSite ?? cookie.samesite ?? '').trim().toLowerCase();
      if (sameSite === 'strict' || sameSite === 'lax') sameSiteCount += 1;
      const maxAge = Number(cookie.maxAge ?? cookie.max_age);
      const expiresMs = Number(
        cookie.expiresMs ??
        cookie.expires_ms ??
        (cookie.expires ? Date.parse(String(cookie.expires)) : NaN)
      );
      if ((Number.isFinite(maxAge) && maxAge > 0) || (Number.isFinite(expiresMs) && expiresMs > nowMs)) {
        expiryCount += 1;
      }
      if (Array.isArray(cookie.unresolved)) {
        for (const host of cookie.unresolved) {
          const normalized = String(host || '').trim().toLowerCase();
          if (normalized) unresolved.add(normalized);
        }
      }
    }

    const secureRatio = secureCount / total;
    const httpOnlyRatio = httpOnlyCount / total;
    const sameSiteRatio = sameSiteCount / total;
    const expiryRatio = expiryCount / total;
    const score = Math.round(clamp01((secureRatio + httpOnlyRatio + sameSiteRatio + expiryRatio) / 4) * 100);
    return {
      score,
      disabled: false,
      total,
      secureCount,
      httpOnlyCount,
      sameSiteCount,
      expiryCount,
      unresolved: Array.from(unresolved),
    };
  };

  const fetchCookieTelemetry = async (domain: string): Promise<R2CookieTelemetry> => {
    const key = `domains/${domain}/cookies.json`;
    const fallback = defaultCookieTelemetry(domain);
    const r2 = resolveR2ReadOptions();
    if (!r2) return { ...fallback, key };
    try {
      const objectRes = await fetchR2ObjectBySignature(
        r2.endpoint,
        r2.bucket,
        key,
        r2.accessKeyId,
        r2.secretAccessKey
      );
      if (!objectRes.ok) {
        return { ...fallback, source: objectRes.status === 404 ? 'default' : 'error', key, error: `status_${objectRes.status}` };
      }
      const text = await objectRes.text();
      const parsed = JSON.parse(text);
      const rows = normalizeCookieRows(parsed);
      const computed = computeCookieScore(rows);
      const payloadUnresolved = Array.isArray(parsed?.unresolved)
        ? parsed.unresolved.map((v: any) => String(v || '').trim().toLowerCase()).filter(Boolean)
        : [];
      return {
        ...computed,
        unresolved: Array.from(new Set([...computed.unresolved, ...payloadUnresolved])),
        source: 'r2',
        key,
      };
    } catch (error) {
      return {
        ...fallback,
        source: 'error',
        key,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const buildDomainHealthSummary = async (
    source: 'local' | 'r2',
    domain: string,
    strictP95Ms: number | null = null,
    cookieTelemetryInput: CookieTelemetryInput | null = null
  ) => {
    const r2Read = resolveR2ReadOptions();
    const ctx = createDomainContext({
      domain,
      zone: Bun.env.CLOUDFLARE_ZONE_NAME || Bun.env.CLOUDFLARE_ZONE_ID || domain,
      bucket: r2Read?.bucket || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || Bun.env.R2_BENCH_BUCKET || null,
      endpoint: r2Read?.endpoint || Bun.env.R2_ENDPOINT || Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE || null,
      accountIdRaw: Bun.env.CLOUDFLARE_ACCOUNT_ID || Bun.env.R2_ACCOUNT_ID || null,
    });
    const prefixes = ['health', 'ssl', 'analytics'];
    const storage = ctx.storage;
    const accountId = ctx.accountId;
    const zone = ctx.zone;
    let knownSubdomains: number | null = null;
    let managerNote: string | null = null;
    let subdomainConfigs: Array<{
      subdomain: string;
      full_domain: string;
      purpose?: string;
      health_check_url?: string;
    }> = [];
    try {
      const mod = await import('../lib/mcp/cloudflare-domain-manager');
      try {
        // CloudflareDomainManager currently has a fixed domain map; expose count only for default domain.
        if (domain === 'factory-wager.com') {
          const mgr = new mod.CloudflareDomainManager();
          const all = mgr.getAllSubdomains();
          knownSubdomains = all.length;
          subdomainConfigs = all.map((entry) => ({
            subdomain: entry.subdomain,
            full_domain: entry.full_domain,
            purpose: entry.purpose,
            health_check_url: entry.health_check_url,
          }));
        } else {
          managerNote = 'knownSubdomains unavailable for non-default domain map';
        }
      } catch (error) {
        managerNote = error instanceof Error ? error.message : String(error);
      }
    } catch (error) {
      managerNote = error instanceof Error ? error.message : String(error);
    }

    const dnsCheckedAt = new Date().toISOString();
    const subdomains = await Promise.all(
      subdomainConfigs.map(async (entry) => {
        const dns = await resolveDnsPrefetch(entry.full_domain);
        let path = '/';
        try {
          const u = entry.health_check_url ? new URL(entry.health_check_url) : null;
          path = u?.pathname || '/';
        } catch {
          path = '/';
        }
        return {
          subdomain: entry.subdomain,
          urlFragment: entry.subdomain,
          baseUrl: domain,
          path,
          fullDomain: entry.full_domain,
          purpose: entry.purpose || '',
          healthCheckUrl: entry.health_check_url || null,
          dnsResolved: dns.resolved,
          dnsRecords: dns.records,
          dnsSource: dns.cacheHit ? `cache:${dns.source}` : `prefetch:${dns.source}`,
          dnsError: dns.error || null,
          lastCheckedAt: dnsCheckedAt,
        };
      })
    );
    const dnsResolvedCount = subdomains.filter((entry) => entry.dnsResolved).length;
    const dnsRatio = subdomains.length > 0 ? dnsResolvedCount / subdomains.length : 0;
    const dnsPrefetch = {
      checked: subdomains.length,
      resolved: dnsResolvedCount,
      cacheTtlSec: Math.floor(dnsPrefetchTtlMs / 1000),
    };
    const dnsStatus = dnsRatio >= 0.9 ? 'healthy' : dnsRatio >= 0.5 ? 'degraded' : 'critical';
    const requestCookieHealth = assessCookieTelemetry(cookieTelemetryInput, domain, dnsRatio);
    const r2CookieTelemetry = await fetchCookieTelemetry(domain);
    const r2CookieScoreNorm = clamp01((Number(r2CookieTelemetry.score) || 0) / 100);
    const requestCookieScoreNorm = clamp01(Number(requestCookieHealth.score) || 0);
    const hasRequestCookieSignal =
      requestCookieHealth.enabled &&
      requestCookieHealth.detail !== 'cookies disabled' &&
      requestCookieHealth.detail !== `missing cookie telemetry for ${domain}`;
    const mergedCookieScore = hasRequestCookieSignal
      ? clamp01(requestCookieScoreNorm * 0.7 + r2CookieScoreNorm * 0.3)
      : r2CookieScoreNorm;
    const mergedCookieStatus = statusFromRatio(mergedCookieScore);
    const mergedCookieUnresolved = Array.from(
      new Set([
        ...(requestCookieHealth.unresolved || []),
        ...(r2CookieTelemetry.unresolved || []),
      ])
    );
    const cookieHealth = withCookieBadgeTelemetry({
      ...requestCookieHealth,
      enabled: requestCookieHealth.enabled || !r2CookieTelemetry.disabled,
      status: mergedCookieStatus,
      score: mergedCookieScore,
      unresolved: mergedCookieUnresolved,
      detail:
        `${requestCookieHealth.detail}; r2 cookies ${r2CookieTelemetry.total} score=${r2CookieTelemetry.score}` +
        (r2CookieTelemetry.error ? ` (${r2CookieTelemetry.error})` : ''),
      r2: r2CookieTelemetry,
    });
    const thresholdStrictP95Ms = 900;

    if (source === 'local') {
      const latest = prefixes.map((type) => ({
        type,
        key: `${ctx.prefix}/${type}/YYYY-MM-DD.json`,
        exists: false,
        lastModified: null,
      }));
      const latestPresent = 0;
      const latestCount = latest.length;
      const storageStatus = latestCount > 0 && latestPresent === latestCount ? 'healthy' : 'critical';
      const storageRatio = 0;
      const degradedByStrictP95 = typeof strictP95Ms === 'number' && Number.isFinite(strictP95Ms) && strictP95Ms > thresholdStrictP95Ms;
      const preliminaryStatus = storageStatus === 'critical'
        ? 'critical'
        : degradedByStrictP95
          ? 'degraded'
          : dnsStatus;
      const latencyScore = degradedByStrictP95 ? 0.55 : (strictP95Ms === null ? 0.85 : 1);
      const overallScore = clamp01(
        dnsRatio * 0.4 +
        storageRatio * 0.35 +
        latencyScore * 0.15 +
        cookieHealth.score * 0.1
      );
      const scoreStatus = statusFromRatio(overallScore);
      const overallStatus = preliminaryStatus === 'critical'
        ? 'critical'
        : scoreByState(scoreStatus) < scoreByState(preliminaryStatus)
          ? scoreStatus
          : preliminaryStatus;
      return {
        source,
        domain,
        baseUrl: domain,
        zone,
        accountId,
        storage,
        knownSubdomains,
        managerNote,
        dnsPrefetch,
        subdomains,
        latest,
        health: {
          dns: {
            status: dnsStatus,
            ratio: dnsRatio,
            resolved: dnsResolvedCount,
            checked: subdomains.length,
            thresholds: { healthyMin: 0.9, criticalBelow: 0.5 },
          },
          storage: {
            status: storageStatus,
            ratio: storageRatio,
            present: latestPresent,
            checked: latestCount,
            thresholds: { healthyEquals: 1.0, criticalBelow: 1.0 },
          },
          cookie: {
            enabled: cookieHealth.enabled,
            status: cookieHealth.status,
            score: cookieHealth.score,
            cookieScore: cookieHealth.cookieScore,
            hexBadge: cookieHealth.hexBadge,
            rgb: cookieHealth.rgb,
            ansiBg: cookieHealth.ansiBg,
            unicodeBar: cookieHealth.unicodeBar,
            unresolved: cookieHealth.unresolved,
            r2: cookieHealth.r2,
            ratio: cookieHealth.ratio,
            checked: cookieHealth.checked,
            resolved: cookieHealth.resolved,
            domainMatchesRequested: cookieHealth.domainMatchesRequested,
            syncDelta: cookieHealth.syncDelta,
            detail: cookieHealth.detail,
          },
          latency: {
            strictP95Ms: typeof strictP95Ms === 'number' && Number.isFinite(strictP95Ms) ? strictP95Ms : null,
            degradedAboveMs: thresholdStrictP95Ms,
            degradedByStrictP95,
            score: latencyScore,
          },
          overall: {
            status: overallStatus,
            score: overallScore,
            components: {
              dns: dnsRatio,
              storage: storageRatio,
              latency: latencyScore,
              cookie: cookieHealth.score,
            },
          },
        },
      };
    }

    const r2 = resolveR2ReadOptions();
    if (!r2) {
      return { error: 'r2_not_configured_for_domain_health', source, domain, baseUrl: domain, zone, accountId, storage, knownSubdomains, managerNote };
    }
    const latest = await Promise.all(prefixes.map(async (type) => {
      const prefix = `${ctx.prefix}/${type}/`;
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
    const latestPresent = latest.filter((item) => item.exists).length;
    const latestCount = latest.length;
    const storageRatio = latestCount > 0 ? latestPresent / latestCount : 0;
    const storageStatus = latestCount > 0 && latestPresent === latestCount ? 'healthy' : 'critical';
    const degradedByStrictP95 = typeof strictP95Ms === 'number' && Number.isFinite(strictP95Ms) && strictP95Ms > thresholdStrictP95Ms;
    const preliminaryStatus = storageStatus === 'critical'
      ? 'critical'
      : degradedByStrictP95
        ? 'degraded'
        : dnsStatus;
    const latencyScore = degradedByStrictP95 ? 0.55 : (strictP95Ms === null ? 0.85 : 1);
    const overallScore = clamp01(
      dnsRatio * 0.4 +
      storageRatio * 0.35 +
      latencyScore * 0.15 +
      cookieHealth.score * 0.1
    );
    const scoreStatus = statusFromRatio(overallScore);
    const overallStatus = preliminaryStatus === 'critical'
      ? 'critical'
      : scoreByState(scoreStatus) < scoreByState(preliminaryStatus)
        ? scoreStatus
        : preliminaryStatus;
    return {
      source,
      domain,
      baseUrl: domain,
      zone,
      accountId,
      storage,
      knownSubdomains,
      managerNote,
      dnsPrefetch,
      subdomains,
      latest,
      health: {
        dns: {
          status: dnsStatus,
          ratio: dnsRatio,
          resolved: dnsResolvedCount,
          checked: subdomains.length,
          thresholds: { healthyMin: 0.9, criticalBelow: 0.5 },
        },
        storage: {
          status: storageStatus,
          ratio: storageRatio,
          present: latestPresent,
          checked: latestCount,
          thresholds: { healthyEquals: 1.0, criticalBelow: 1.0 },
        },
        cookie: {
          enabled: cookieHealth.enabled,
          status: cookieHealth.status,
          score: cookieHealth.score,
          cookieScore: cookieHealth.cookieScore,
          hexBadge: cookieHealth.hexBadge,
          rgb: cookieHealth.rgb,
          ansiBg: cookieHealth.ansiBg,
          unicodeBar: cookieHealth.unicodeBar,
          unresolved: cookieHealth.unresolved,
          r2: cookieHealth.r2,
          ratio: cookieHealth.ratio,
          checked: cookieHealth.checked,
          resolved: cookieHealth.resolved,
          domainMatchesRequested: cookieHealth.domainMatchesRequested,
          syncDelta: cookieHealth.syncDelta,
          detail: cookieHealth.detail,
        },
        latency: {
          strictP95Ms: typeof strictP95Ms === 'number' && Number.isFinite(strictP95Ms) ? strictP95Ms : null,
          degradedAboveMs: thresholdStrictP95Ms,
          degradedByStrictP95,
          score: latencyScore,
        },
        overall: {
          status: overallStatus,
          score: overallScore,
          components: {
            dns: dnsRatio,
            storage: storageRatio,
            latency: latencyScore,
            cookie: cookieHealth.score,
          },
        },
      },
    };
  };

  const buildRssStorageSummary = async (source: 'local' | 'r2') => {
    if (source === 'local') {
      return {
        source,
        bucket: Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || Bun.env.R2_BENCH_BUCKET || null,
        endpoint: Bun.env.R2_ENDPOINT || Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE || null,
        prefix: null,
        rssKey: rssXml,
        rssUrl: `file://${rssXml}`,
      };
    }

    const prefix = options.r2Prefix.replace(/^\/+|\/+$/g, '');
    const r2 = resolveR2ReadOptions();
    const rssKey = `${prefix}/rss.xml`;
    const publicBase = options.r2Base || Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE || null;
    return {
      source,
      bucket: r2?.bucket || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || Bun.env.R2_BENCH_BUCKET || null,
      endpoint: r2?.endpoint || Bun.env.R2_ENDPOINT || publicBase,
      prefix,
      rssKey,
      rssUrl: publicBase ? `${publicBase.replace(/\/+$/g, '')}/rss.xml` : null,
    };
  };

  const deriveLastSnapshotFromHealth = (data: any): string => {
    const key = data?.latest?.find((item: any) => item?.type === 'health')?.key;
    if (!key || typeof key !== 'string') return '';
    const parts = key.split('/');
    const file = parts[parts.length - 1] || '';
    return file.replace(/\.json$/i, '');
  };

  const buildR2SessionsDebugSummary = async (prefix = 'sessions/', limit = 3) => {
    const cappedLimit = Math.max(1, Math.min(10, Number(limit) || 3));
    const cleanPrefix = String(prefix || 'sessions/').replace(/^\/+/, '');
    const r2 = resolveR2ReadOptions();
    if (!r2) {
      return {
        error: 'r2_not_configured',
        bucket: Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || null,
        endpoint: Bun.env.R2_ENDPOINT || null,
        prefix: cleanPrefix,
      };
    }

    const listed = await S3Client.list(
      { prefix: cleanPrefix, limit: 1000 },
      {
        bucket: r2.bucket,
        endpoint: r2.endpoint,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      }
    );
    const objects = (listed.contents || []) as Array<{ key: string; size?: number; lastModified?: string }>;
    const sorted = objects.slice().sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
    const sampleTargets = sorted.slice(0, cappedLimit);

    const sample = await Promise.all(
      sampleTargets.map(async (o) => {
        try {
          const res = await fetchR2ObjectBySignature(
            r2.endpoint,
            r2.bucket,
            o.key,
            r2.accessKeyId,
            r2.secretAccessKey
          );
          if (!res.ok) {
            return {
              key: o.key,
              size: o.size ?? null,
              lastModified: o.lastModified || null,
              loadStatus: `http_${res.status}`,
              dataPreview: null,
              envelope: null,
            };
          }
          const text = await res.text();
          const preview = text.length > 120 ? `${text.slice(0, 120)}...` : text;
          let envelope: null | {
            isJson: boolean;
            keys: string[];
            version?: number | null;
            ivLen?: number | null;
            dataLen?: number | null;
            hmacLen?: number | null;
          } = null;
          try {
            const parsed = JSON.parse(text);
            envelope = {
              isJson: true,
              keys: parsed && typeof parsed === 'object' ? Object.keys(parsed as Record<string, unknown>).slice(0, 12) : [],
              version: Number.isFinite(Number((parsed as any)?.version)) ? Number((parsed as any).version) : null,
              ivLen: typeof (parsed as any)?.iv === 'string' ? (parsed as any).iv.length : null,
              dataLen: typeof (parsed as any)?.data === 'string' ? (parsed as any).data.length : null,
              hmacLen: typeof (parsed as any)?.hmac === 'string' ? (parsed as any).hmac.length : null,
            };
          } catch {
            envelope = { isJson: false, keys: [] };
          }
          return {
            key: o.key,
            size: o.size ?? null,
            lastModified: o.lastModified || null,
            loadStatus: 'ok',
            dataPreview: preview,
            envelope,
          };
        } catch (error) {
          return {
            key: o.key,
            size: o.size ?? null,
            lastModified: o.lastModified || null,
            loadStatus: 'error',
            dataPreview: null,
            envelope: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    return {
      checkedAt: new Date().toISOString(),
      bucket: r2.bucket,
      endpoint: r2.endpoint,
      prefix: cleanPrefix,
      count: objects.length,
      totalSize: objects.reduce((sum, o) => sum + Number(o.size || 0), 0),
      sample,
    };
  };

  Bun.serve({
    port: options.port,
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const stateFromCookie = options.cookies ? StateManager.parse(req) : null;
      if (options.cookies) {
        const rawCookie = req.headers.get('cookie') || '';
        CookieParser.parseBatch([rawCookie], { parallel: true });
      }
      const defaultState: DashboardState = {
        domain: options.domain,
        accountId: '',
        lastSnapshot: '',
        prefMetric: stateFromCookie?.prefMetric || 'latency',
        prefSource: stateFromCookie?.prefSource || 'local',
      };
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        const state = stateFromCookie || defaultState;
        const headers = new Headers({
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          vary: 'Cookie',
        });
        if (options.cookies) {
          headers.append('set-cookie', StateManager.serialize(state, url));
        }
        return new Response(htmlShell(options, buildMeta, state), { headers });
      }
      if (url.pathname === '/healthz') {
        return Response.json({
          ok: true,
          service: 'search-benchmark-dashboard',
          uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
          now: new Date().toISOString(),
          port: options.port,
        }, {
          headers: {
            'cache-control': 'no-store',
          },
        });
      }
      if (url.pathname === '/api/status') {
        return Response.json({
          ok: true,
          service: 'search-benchmark-dashboard',
          startedAt: new Date(startedAt).toISOString(),
          uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
          port: options.port,
          mode: {
            cookies: options.cookies,
            hotReload: options.hotReload,
          },
          r2: {
            credentialed: Boolean(resolveR2ReadOptions()),
            base: options.r2Base || null,
          },
        }, {
          headers: {
            'cache-control': 'no-store',
          },
        });
      }
      if (url.pathname === '/api/debug/r2-sessions') {
        try {
          const prefix = url.searchParams.get('prefix') || 'sessions/';
          const limit = Number.parseInt(url.searchParams.get('limit') || '3', 10);
          const data = await buildR2SessionsDebugSummary(prefix, limit);
          return Response.json(data, {
            headers: {
              'cache-control': 'no-store',
            },
          });
        } catch (error) {
          return Response.json(
            {
              error: 'r2_debug_failed',
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
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
        const domain = (
          url.searchParams.get('domain') ||
          stateFromCookie?.domain ||
          options.domain ||
          'factory-wager.com'
        ).trim().toLowerCase();
        const strictP95Raw = url.searchParams.get('strictP95');
        const strictP95Ms = strictP95Raw === null ? null : Number(strictP95Raw);
        const strictP95 = Number.isFinite(strictP95Ms) ? strictP95Ms : null;
        const cookieHeader = req.headers.get('cookie') || '';
        const cookieMap = options.cookies ? CookieParser.parseCookieHeader(cookieHeader) : new Map<string, string>();
        const rawDomainCookie = cookieMap.get('secure_domain_ctx') || '';
        const rawSubdomainCookie = cookieMap.get('secure_subdomain_state') || '';
        const parsedDomainCookie = rawDomainCookie
          ? CookieParser.parseSecureCookie<DomainContextCookieData>(rawDomainCookie, { compressed: true })
          : null;
        const parsedSubdomainCookie = rawSubdomainCookie
          ? CookieParser.parseSecureCookie<SubdomainStateCookieData>(rawSubdomainCookie, { compressed: true })
          : null;
        const dnsCookieChecked = Number(parsedSubdomainCookie?.checked);
        const dnsCookieResolved = Number(parsedSubdomainCookie?.resolved);
        const dnsCookieRatio =
          Number.isFinite(dnsCookieChecked) &&
          dnsCookieChecked > 0 &&
          Number.isFinite(dnsCookieResolved)
            ? dnsCookieResolved / dnsCookieChecked
            : null;
        const cookieTelemetryInput: CookieTelemetryInput = {
          enabled: options.cookies,
          hasStateCookie: cookieMap.has('bfw_state'),
          hasDomainCookie: Boolean(rawDomainCookie),
          hasSubdomainCookie: Boolean(rawSubdomainCookie),
          parsedState: Boolean(stateFromCookie),
          parsedDomain: Boolean(parsedDomainCookie),
          parsedSubdomain: Boolean(parsedSubdomainCookie),
          domainMatchesRequested:
            parsedDomainCookie?.domain
              ? String(parsedDomainCookie.domain).trim().toLowerCase() === domain
              : null,
          dnsCookieChecked:
            Number.isFinite(dnsCookieChecked) && dnsCookieChecked >= 0 ? dnsCookieChecked : null,
          dnsCookieResolved:
            Number.isFinite(dnsCookieResolved) && dnsCookieResolved >= 0 ? dnsCookieResolved : null,
          dnsCookieRatio:
            typeof dnsCookieRatio === 'number' && Number.isFinite(dnsCookieRatio) ? dnsCookieRatio : null,
          cookieUnresolved: Array.isArray(parsedSubdomainCookie?.unresolved)
            ? parsedSubdomainCookie.unresolved.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)
            : [],
        };
        const data = await buildDomainHealthSummary(source, domain, strictP95, cookieTelemetryInput);
        const state: DashboardState = {
          domain,
          accountId: String(data?.accountId || stateFromCookie?.accountId || ''),
          lastSnapshot: deriveLastSnapshotFromHealth(data),
          prefMetric: stateFromCookie?.prefMetric || 'latency',
          prefSource: source,
        };
        const headers = new Headers({
          'cache-control': 'no-store',
          vary: 'Cookie',
        });
        if (options.cookies) {
          headers.append('set-cookie', StateManager.serialize(state, url));
          const pipeline = CookieParser.createTransformPipeline()
            .secure()
            .rename((oldName) => `secure_${oldName}`)
            .setPath('/api');
          const domainCookie = pipeline.process(
            cookieFactory.domainContext({
              domain,
              zone: String(data?.zone || domain),
              accountId: String(data?.accountId || ''),
              source,
              prefix: String(data?.storage?.domainPrefix || ''),
            })
          );
          const unresolved = Array.isArray(data?.subdomains)
            ? data.subdomains.filter((s: any) => !s?.dnsResolved).map((s: any) => String(s?.fullDomain || s?.subdomain || ''))
            : [];
          const subdomainCookie = pipeline.process(
            cookieFactory.subdomainState({
              checked: Number(data?.dnsPrefetch?.checked || 0),
              resolved: Number(data?.dnsPrefetch?.resolved || 0),
              unresolved,
            })
          );
          headers.append('set-cookie', domainCookie.toString());
          headers.append('set-cookie', subdomainCookie.toString());
        }
        return Response.json(data, { headers });
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
      if (url.pathname === '/api/rss-meta') {
        const source = (url.searchParams.get('source') || 'local') as 'local' | 'r2';
        const meta = await buildRssStorageSummary(source);
        return Response.json(meta);
      }
      if (url.pathname === '/api/loop-status') {
        const source = url.searchParams.get('source') || 'local';
        if (source !== 'local') {
          return Response.json({ error: 'loop_status_local_only', source }, { status: 400 });
        }
        return readLocalJson(loopStatusJson);
      }
      if (url.pathname === '/api/dev-events') {
        if (!options.hotReload) {
          return new Response('event: disabled\ndata: {"hotReload":false}\n\n', {
            headers: {
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-store',
              connection: 'keep-alive',
            },
          });
        }
        let localController: ReadableStreamDefaultController<Uint8Array> | null = null;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            localController = controller;
            hotReloadClients.add(controller);
            sseWrite(controller, 'connected', { at: new Date().toISOString() });
          },
          cancel() {
            if (localController) {
              hotReloadClients.delete(localController);
            }
          },
        });
        return new Response(stream, {
          headers: {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
          },
        });
      }
      return new Response('Not found', { status: 404 });
    },
  });

  const ansi = (text: string, hex: string): string => `${Bun.color(hex, 'ansi')}${text}\x1b[0m`;
  console.log(ansi(`[search-bench:dashboard] http://localhost:${options.port}/dashboard`, '#22c55e'));
  console.log(ansi(`[search-bench:dashboard] dir=${dir}`, '#60a5fa'));
  const proxyCfg = resolveProxyConfig();
  if (proxyCfg) {
    console.log(ansi(`[search-bench:dashboard] proxy=${proxyCfg.url}`, '#f59e0b'));
  }
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
  console.log(ansi(`[search-bench:dashboard] domain=${options.domain}`, '#22d3ee'));
}

await main();

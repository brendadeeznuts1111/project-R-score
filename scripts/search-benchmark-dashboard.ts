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
import { storeCookieTelemetry } from './lib/cookie-telemetry';
import { resolveR2BridgeConfig } from './lib/r2-bridge';
import { buildDomainRegistryStatus } from './domain-registry-status';

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

type InventoryItem = {
  name: string;
  exists: boolean;
  size: number | null;
  lastModified: string | null;
  category?: 'snapshot' | 'domain-cookie' | 'domain-health';
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
  const hasR2Credentials = Boolean(resolveR2ReadOptions());
  const r2Label = options.r2Base || (hasR2Credentials ? 'credentialed (R2_* env)' : '(not configured)');
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
    main { max-width: 1280px; margin: 0 auto; padding: 28px; }
    .card { border: 1px solid var(--line); background: var(--panel); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .layout { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
    .span-12 { grid-column: span 12; }
    .span-8 { grid-column: span 8; }
    .span-6 { grid-column: span 6; }
    .span-4 { grid-column: span 4; }
    .section-title { margin: 6px 0 2px; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .section-subtitle { margin: 0 0 10px; color: var(--muted); font-size: 12px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { color: var(--muted); font-size: 12px; }
    .buttons { display: flex; gap: 8px; margin-top: 12px; }
    button { cursor: pointer; background: #0f223e; border: 1px solid #2d466f; color: var(--text); padding: 8px 10px; border-radius: 8px; }
    .refresh-btn {
      background: #0f223e;
      border: 1px solid #2d466f;
      color: #e8eefc;
      min-width: 150px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 700;
    }
    .refresh-btn[data-state="loading"] {
      background: #11324d;
      border-color: #4fd1c5;
      color: #d5fbf6;
      cursor: wait;
    }
    .refresh-btn[data-state="success"] {
      background: #072419;
      border-color: #22c55e;
      color: #dcfce7;
    }
    .refresh-btn[data-state="error"] {
      background: #2b1210;
      border-color: #ef4444;
      color: #fee2e2;
    }
    .refresh-icon {
      display: inline-flex;
      width: 16px;
      justify-content: center;
      line-height: 1;
      font-size: 14px;
    }
    .refresh-spinner {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      border: 2px solid rgba(79, 209, 197, 0.35);
      border-top-color: #4fd1c5;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .kpi-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .kpi-card { border: 1px solid var(--line); border-radius: 10px; padding: 10px; background: #0a162b; }
    .kpi-title { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .ring-wrap { display: flex; align-items: center; gap: 12px; }
    .ring-svg { width: 84px; height: 84px; transform: rotate(-90deg); }
    .ring-track { fill: none; stroke: #1f2c49; stroke-width: 10; }
    .ring-progress { fill: none; stroke: #4fd1c5; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 360ms ease; }
    .ring-value { font-size: 20px; font-weight: 700; color: var(--text); }
    .gauge-wrap { margin-top: 2px; }
    .gauge-track { position: relative; height: 12px; border-radius: 999px; overflow: hidden; border: 1px solid #1f2c49; }
    .gauge-zone { position: absolute; top: 0; bottom: 0; }
    .gauge-zone-good { left: 0; width: 60%; background: #14532d; }
    .gauge-zone-warn { left: 60%; width: 25%; background: #7c2d12; }
    .gauge-zone-bad { left: 85%; width: 15%; background: #7f1d1d; }
    .gauge-marker { position: absolute; top: -2px; width: 2px; height: 16px; background: #e8eefc; box-shadow: 0 0 0 1px #0b111f; }
    .gauge-threshold { position: absolute; top: -2px; width: 2px; height: 16px; background: #facc15; }
    .gauge-legend { margin-top: 6px; color: #9db2d9; font-size: 11px; }
    .delta-pulse { animation: deltaPulse 1.5s ease-in-out infinite; }
    @keyframes deltaPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }
    .status-pill-alert { animation: badgePulse 1.6s ease-in-out infinite; }
    @keyframes badgePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.15); }
      50% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.04); }
    }
    .empty-state {
      border: 1px dashed #2d466f;
      border-radius: 10px;
      background: #0a162b;
      padding: 14px;
      text-align: center;
      color: #9db2d9;
    }
    .empty-icon { font-size: 20px; display: block; margin-bottom: 6px; }
    #toastHost { position: fixed; right: 18px; bottom: 18px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
    .toast {
      pointer-events: auto;
      border: 1px solid #2d466f;
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 12px;
      background: #0f223e;
      color: #e8eefc;
      min-width: 220px;
    }
    .toast-success { border-color: #22c55e; background: #072419; color: #dcfce7; }
    .toast-error { border-color: #ef4444; background: #2b1210; color: #fee2e2; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; }
    th { color: var(--muted); font-weight: 600; }
    code { color: var(--accent); }
    pre { white-space: pre-wrap; word-break: break-word; background: #0a162b; border: 1px solid var(--line); padding: 12px; border-radius: 8px; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 11px; border: 1px solid transparent; }
    .trend-delta {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      font-family: ui-monospace, Menlo, Monaco, monospace;
    }
    .trend-delta-good { color: #22c55e; }
    .trend-delta-bad { color: #ef4444; }
    .trend-delta-neutral { color: #93c5fd; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid transparent;
      transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease;
      cursor: default;
    }
    .status-pill:hover {
      transform: translateY(-1px);
      filter: brightness(1.05);
    }
    .status-pill:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.45);
    }
    .pill-success { color: #dcfce7; background: #14532d; border-color: #22c55e; }
    .pill-warning { color: #ffedd5; background: #7c2d12; border-color: #f97316; }
    .pill-error { color: #fee2e2; background: #7f1d1d; border-color: #ef4444; }
    .pill-closed { color: #f3e8ff; background: #581c87; border-color: #a855f7; }
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
    .footer-meta { margin-top: 6px; color: #9db2d9; font-size: 11px; }
    .mono { font-family: ui-monospace, Menlo, Monaco, monospace; }
    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--line);
      border-radius: 10px;
      margin-top: 10px;
      background: #0a162b;
    }
    .table-scroll table { margin-top: 0; min-width: 980px; }
    .subdomain-table { font-family: ui-monospace, Menlo, Monaco, monospace; }
    .subdomain-table th, .subdomain-table td { white-space: nowrap; }
    .subdomain-table th:first-child,
    .subdomain-table td:first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      background: #0d1830;
      border-right: 1px solid var(--line);
    }
    .subdomain-table th:first-child { z-index: 3; }
    .dns-char { font-weight: 700; font-size: 13px; }
    .dns-char-ok { color: #22c55e; }
    .dns-char-bad { color: #ef4444; }
    .cookie-chip { display: inline-block; padding: 2px 6px; border-radius: 999px; border: 1px solid transparent; }
    .cookie-chip-ok { background: #052e16; border-color: #14532d; color: #22c55e; }
    .cookie-chip-warn { background: #292524; border-color: #713f12; color: #facc15; }
    .cookie-chip-bad { background: #2b0f0a; border-color: #7c2d12; color: #f97316; }
    .truncate-domain {
      display: inline-block;
      max-width: 230px;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: bottom;
    }
    .overview-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .overview-tile { border: 1px solid var(--line); background: #0d1830; border-radius: 10px; padding: 10px; min-height: 72px; }
    .overview-label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .overview-value { margin-top: 6px; font-size: 15px; font-weight: 700; color: #e8eefc; }
    .overview-meta { margin-top: 4px; color: #9db2d9; font-size: 11px; }
    .tile-good { border-color: #14532d; background: #072419; }
    .tile-warn { border-color: #713f12; background: #2a2313; }
    .tile-bad { border-color: #7c2d12; background: #2b1210; }
    .tile-neutral { border-color: #1e3a8a; background: #10213f; }
    @media (max-width: 1000px) {
      .span-8, .span-6, .span-4 { grid-column: span 12; }
      .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .kpi-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .overview-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main>
    <div class="card span-12">
      <h1>Search Benchmark Dashboard</h1>
      <div class="meta">Local reports + optional R2: <code>${r2Label}</code><span id="strictP95Badge" class="badge status-neutral rss-badge">Strict p95 n/a</span><span id="rssBadge" class="badge status-neutral rss-badge">RSS idle</span></div>
      <div class="meta">repo=<a href="${buildMeta.repoBranchUrl}" target="_blank" rel="noreferrer">${buildMeta.repoBranchUrl}</a> commit=<a href="${commitUrl}" target="_blank" rel="noreferrer"><code>${buildMeta.commitShort}</code></a></div>
      <div id="reportNotice" class="meta" style="margin-top:6px"></div>
      <div class="buttons">
        <button id="loadLocal">Load Local Latest</button>
        <button id="loadR2">Load R2 Latest</button>
        <button id="loadHistory">Load History</button>
        <button id="refreshBtn" class="refresh-btn" data-state="idle" aria-live="polite" aria-label="Refresh dashboard">
          <span class="refresh-icon" aria-hidden="true">⟳</span>
          <span class="refresh-text">Refresh</span>
        </button>
        <button id="jumpColors">Color Reference</button>
      </div>
      <div class="pill-row" aria-label="Factory-Wager status badges">
        <span class="status-pill pill-success" role="status" aria-label="SUCCESS: All Clear" tabindex="0">🟢 All Clear</span>
        <span class="status-pill pill-warning status-pill-alert" role="status" aria-label="WARNING: Attention Needed" tabindex="0">🟡 Attention Needed</span>
        <span class="status-pill pill-error status-pill-alert" role="status" aria-label="ERROR: Action Required" tabindex="0">🔴 Action Required</span>
        <span class="status-pill pill-closed" role="status" aria-label="CLOSED: Loop Closed" tabindex="0">✅ Loop Closed</span>
      </div>
      <div style="margin-top:12px" class="overview-grid">
        <div id="tileSnapshot" class="overview-tile tile-neutral">
          <div class="overview-label">Snapshot</div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </div>
        <div id="tileLoop" class="overview-tile tile-neutral">
          <div class="overview-label">Loop</div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </div>
        <div id="tileTokens" class="overview-tile tile-neutral">
          <div class="overview-label">Token Secrets</div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </div>
        <div id="tileDomainHealth" class="overview-tile tile-neutral">
          <div class="overview-label">Domain Health</div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </div>
        <div id="tileRss" class="overview-tile tile-neutral">
          <div class="overview-label">RSS</div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </div>
      </div>
    </div>
    <div class="section-title">Core Status</div>
    <div class="section-subtitle">Benchmark quality, performance trend, and loop-closure alignment.</div>
    <div class="layout">
      <div class="card span-8">
        <h2 style="margin:0 0 8px;font-size:16px">Latest Snapshot</h2>
        <div id="latest"></div>
      </div>
      <div class="card span-4">
        <h2 style="margin:0 0 8px;font-size:16px">Loop Closure</h2>
        <div id="loopStatus"></div>
      </div>
      <div class="card span-12">
        <h2 style="margin:0 0 8px;font-size:16px">Trend & Coverage</h2>
        <div id="trend"></div>
      </div>
      <div class="card span-12">
        <h2 style="margin:0 0 8px;font-size:16px">History</h2>
        <div id="history"></div>
      </div>
    </div>
    <div class="section-title">Domain & Registry</div>
    <div class="section-subtitle">Readiness of domain mappings, headers, token secrets, and runtime health.</div>
    <div class="layout">
      <div class="card span-6">
        <h2 style="margin:0 0 8px;font-size:16px">Domain Registry Readiness</h2>
        <div id="domainRegistryStatus"></div>
      </div>
      <div class="card span-6">
        <h2 style="margin:0 0 8px;font-size:16px">Domain Health Summary</h2>
        <div id="domainHealth"></div>
      </div>
    </div>
    <div class="section-title">Storage & Distribution</div>
    <div class="section-subtitle">Manifest integrity, inventory presence, and RSS publication consistency.</div>
    <div class="layout">
      <div class="card span-6">
        <h2 style="margin:0 0 8px;font-size:16px">Publish Manifest</h2>
        <div id="publish"></div>
      </div>
      <div class="card span-6">
        <h2 style="margin:0 0 8px;font-size:16px">R2 Inventory</h2>
        <div id="inventory"></div>
      </div>
      <div class="card span-12">
        <h2 style="margin:0 0 8px;font-size:16px">RSS Feed</h2>
        <div id="rss"></div>
      </div>
    </div>
    <div class="section-title" id="color-reference">Color Reference</div>
    <div class="section-subtitle">Dashboard palette and semantic status colors.</div>
    <div class="layout">
      <div class="card span-12">
        <table>
          <thead>
            <tr><th>Usage</th><th>Color</th><th>Hex</th><th>RGBA</th></tr>
          </thead>
          <tbody>
            <tr><td>Background</td><td>Deep Navy</td><td><code>#0B111F</code></td><td><code>rgba(11, 17, 31, 1)</code></td></tr>
            <tr><td>Panel</td><td>Slate Navy</td><td><code>#111A2D</code></td><td><code>rgba(17, 26, 45, 1)</code></td></tr>
            <tr><td>Primary Text</td><td>Soft White</td><td><code>#E8EEFC</code></td><td><code>rgba(232, 238, 252, 1)</code></td></tr>
            <tr><td>Muted Text</td><td>Dust Blue</td><td><code>#90A0C4</code></td><td><code>rgba(144, 160, 196, 1)</code></td></tr>
            <tr><td>Accent</td><td>Teal</td><td><code>#4FD1C5</code></td><td><code>rgba(79, 209, 197, 1)</code></td></tr>
            <tr><td>Divider/Border</td><td>Steel Blue</td><td><code>#1F2C49</code></td><td><code>rgba(31, 44, 73, 1)</code></td></tr>
            <tr><td>Success</td><td>Green</td><td><code>#22C55E</code></td><td><code>rgba(34, 197, 94, 1)</code></td></tr>
            <tr><td>Warning</td><td>Amber</td><td><code>#FACC15</code></td><td><code>rgba(250, 204, 21, 1)</code></td></tr>
            <tr><td>Error</td><td>Orange Red</td><td><code>#F97316</code></td><td><code>rgba(249, 115, 22, 1)</code></td></tr>
            <tr><td>Neutral Info</td><td>Sky Blue</td><td><code>#93C5FD</code></td><td><code>rgba(147, 197, 253, 1)</code></td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="footer">
      Repo: <a href="${buildMeta.repoBranchUrl}" target="_blank" rel="noreferrer">${buildMeta.repoBranchUrl}</a> ·
      Commit: <a href="${commitUrl}" target="_blank" rel="noreferrer"><code>${buildMeta.commitShort}</code></a> ·
      <a href="#color-reference">Color Reference</a>
      <div class="footer-meta">Base palette: <code>#0B111F</code> · <code>#111A2D</code> · <code>#E8EEFC</code> · <code>#4FD1C5</code> · <code>#1F2C49</code></div>
    </div>
  </main>
  <div id="toastHost" aria-live="polite" aria-atomic="false"></div>
  <script>
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Non-browser context: skip dashboard boot logic.
    } else {
    const HOT_RELOAD_ENABLED = ${hotReloadEnabled ? 'true' : 'false'};
    const R2_LABEL = ${JSON.stringify(r2Label)};
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
    const domainRegistryStatusEl = document.getElementById('domainRegistryStatus');
    const rssEl = document.getElementById('rss');
    const rssBadgeEl = document.getElementById('rssBadge');
    const strictP95BadgeEl = document.getElementById('strictP95Badge');
    const reportNoticeEl = document.getElementById('reportNotice');
    const toastHostEl = document.getElementById('toastHost');
    const refreshBtnEl = document.getElementById('refreshBtn');
    const tileSnapshotEl = document.getElementById('tileSnapshot');
    const tileLoopEl = document.getElementById('tileLoop');
    const tileTokensEl = document.getElementById('tileTokens');
    const tileDomainHealthEl = document.getElementById('tileDomainHealth');
    const tileRssEl = document.getElementById('tileRss');
    let lastHistory = null;
    let previousSnapshot = null;
    let historyVisibleCount = 40;
    let activeSource = readStoredSource() || INITIAL_SOURCE;
    let currentLatestId = null;
    let knownLatestId = null;
    let currentRssGuid = null;
    let knownRssGuid = null;
    const showToast = (message, tone = 'success', ttlMs = 2600) => {
      if (!toastHostEl) return;
      const node = document.createElement('div');
      node.className = 'toast ' + (tone === 'error' ? 'toast-error' : 'toast-success');
      node.textContent = message;
      toastHostEl.appendChild(node);
      setTimeout(() => {
        node.remove();
      }, ttlMs);
    };
    const overviewState = {
      snapshotId: 'n/a',
      queryPack: 'n/a',
      loop: 'n/a',
      loopMeta: 'not loaded',
      tokenCoverage: 'n/a',
      tokenMeta: 'not loaded',
      domainHealth: 'n/a',
      domainHealthMeta: 'not loaded',
      rss: 'n/a',
      rssMeta: 'not loaded',
    };
    const setTile = (el, tone, value, meta) => {
      if (!el) return;
      el.className = 'overview-tile ' + tone;
      const valueEl = el.querySelector('.overview-value');
      const metaEl = el.querySelector('.overview-meta');
      if (valueEl) valueEl.textContent = value;
      if (metaEl) metaEl.textContent = String(meta || '').slice(0, 96);
    };
    const parseCoverageNumerator = (coverage) => {
      const parts = String(coverage || '').split('/');
      const n = Number(parts[0]);
      return Number.isFinite(n) ? n : null;
    };
    const renderOverview = () => {
      setTile(
        tileSnapshotEl,
        overviewState.snapshotId === 'n/a' ? 'tile-neutral' : 'tile-good',
        overviewState.snapshotId,
        'pack ' + overviewState.queryPack
      );
      const loopTone = overviewState.loop === 'closed' ? 'tile-good' : overviewState.loop === 'open' ? 'tile-bad' : 'tile-neutral';
      setTile(tileLoopEl, loopTone, overviewState.loop, overviewState.loopMeta);
      const tokenNum = parseCoverageNumerator(overviewState.tokenCoverage);
      const tokenTone = overviewState.tokenCoverage === 'n/a'
        ? 'tile-neutral'
        : tokenNum === 0
          ? 'tile-bad'
          : 'tile-good';
      setTile(tileTokensEl, tokenTone, overviewState.tokenCoverage, overviewState.tokenMeta);
      const domainTone = overviewState.domainHealth.startsWith('online ') ? 'tile-good' : overviewState.domainHealth === 'n/a' ? 'tile-neutral' : 'tile-warn';
      setTile(tileDomainHealthEl, domainTone, overviewState.domainHealth, overviewState.domainHealthMeta);
      const rssTone = overviewState.rss === 'synced' ? 'tile-good' : overviewState.rss === 'drift' ? 'tile-warn' : 'tile-neutral';
      setTile(tileRssEl, rssTone, overviewState.rss, overviewState.rssMeta);
    };
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
    const statusPill = (kind) => {
      const map = {
        success: { cls: 'pill-success', icon: '🟢', label: 'All Clear', aria: 'SUCCESS: All Clear' },
        warning: { cls: 'pill-warning status-pill-alert', icon: '🟡', label: 'Attention Needed', aria: 'WARNING: Attention Needed' },
        error: { cls: 'pill-error status-pill-alert', icon: '🔴', label: 'Action Required', aria: 'ERROR: Action Required' },
        closed: { cls: 'pill-closed', icon: '✅', label: 'Loop Closed', aria: 'CLOSED: Loop Closed' },
      };
      const selected = map[kind] || map.success;
      return '<span class="status-pill ' + selected.cls + '" role="status" aria-label="' + selected.aria + '">' + selected.icon + ' ' + selected.label + '</span>';
    };
    const volatilityBadge = (text) => '<span class="badge ' + volatilityBadgeClass(text) + '">' + text + '</span>';
    const volatilityEmojiBadge = (text, metricLabel = 'volatility') => {
      const raw = String(text || 'Zero');
      const value = raw.toLowerCase();
      const icon = value === 'high' ? '🔴' : value === 'medium' ? '🟡' : value === 'low' ? '🟢' : '⚪';
      const tip = metricLabel + ' volatility: ' + raw + '. Low is stable, Medium is watch, High is unstable.';
      return '<span class="badge ' + volatilityBadgeClass(raw) + '" title="' + attrEscape(tip) + '">' + icon + ' ' + raw + '</span>';
    };
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
      if (s === 'simulated') return 0.85;
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
      const threshold = asNumOrNull(latest?.thresholdsApplied?.strictLatencyP95WarnMs);
      const queryPack = String(latest?.queryPack || 'core_delivery');
      const cls = hasWarn ? 'status-bad' : (p95 === null ? 'status-neutral' : 'status-good');
      const valueText = p95 === null ? 'n/a' : p95.toFixed(0) + 'ms';
      const thresholdText = threshold === null ? 'n/a' : threshold.toFixed(0) + 'ms';
      const context = ' (thr ' + thresholdText + ', pack ' + queryPack + ')';
      strictP95BadgeEl.className = 'badge rss-badge ' + cls;
      strictP95BadgeEl.textContent = hasWarn ? ('Strict p95 warn ' + valueText + context) : ('Strict p95 ' + valueText + context);
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
    const qualityProgressbar = (score) => {
      const raw = Number(score);
      if (!Number.isFinite(raw)) return '';
      const bounded = Math.max(0, Math.min(100, raw));
      const valueText = bounded.toFixed(2);
      const barWidth = bounded.toFixed(2) + '%';
      return (
        '<div style="margin-top:8px">' +
          '<div class="meta">Quality Accessibility</div>' +
          '<div role="progressbar" aria-valuenow="' + valueText + '" aria-valuemin="0" aria-valuemax="100" aria-label="Quality score ' + valueText + ' out of 100" style="position:relative;height:10px;border-radius:999px;background:#0a162b;border:1px solid #1f2c49;overflow:hidden">' +
            '<span style="display:block;height:100%;width:' + barWidth + ';background:linear-gradient(90deg,#22c55e,#4fd1c5)"></span>' +
          '</div>' +
          '<div class="meta" style="margin-top:4px">score=' + valueText + '/100</div>' +
        '</div>'
      );
    };
    const trendDeltaIndicator = (delta, unit, mode, metricLabel) => {
      if (delta === null || Number.isNaN(delta)) return '-';
      const valueText = (delta > 0 ? '+' : '') + Number(delta).toFixed(2) + unit;
      const isImprovement = mode === 'lower_is_better' ? delta < 0 : delta > 0;
      const isDegradation = mode === 'lower_is_better' ? delta > 0 : delta < 0;
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      const cls = isImprovement ? 'trend-delta-good' : isDegradation ? 'trend-delta-bad' : 'trend-delta-neutral';
      const pulse = isDegradation ? ' delta-pulse' : '';
      const interpretation = isImprovement ? 'improvement' : isDegradation ? 'degradation' : 'stable';
      const tip = metricLabel + ' delta ' + valueText + ' (' + interpretation + ')';
      return '<span class="trend-delta ' + cls + pulse + '" title="' + attrEscape(tip) + '">' + valueText + ' ' + arrow + '</span>';
    };
    const attrEscape = (text) =>
      String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const emptyState = (title, detail, icon = '📭') =>
      '<div class="empty-state" role="status" aria-live="polite"><span class="empty-icon" aria-hidden="true">' + icon + '</span><div><strong>' + title + '</strong></div><div style="margin-top:4px">' + detail + '</div></div>';
    const qualityRing = (score) => {
      const n = Math.max(0, Math.min(100, Number(score) || 0));
      const radius = 28;
      const c = 2 * Math.PI * radius;
      const offset = c * (1 - (n / 100));
      return (
        '<div class="kpi-card">' +
          '<div class="kpi-title">Circular Quality Ring</div>' +
          '<div class="ring-wrap">' +
            '<svg class="ring-svg" viewBox="0 0 84 84" role="img" aria-label="Quality score ' + n.toFixed(2) + ' out of 100">' +
              '<circle class="ring-track" cx="42" cy="42" r="' + radius + '"></circle>' +
              '<circle class="ring-progress" cx="42" cy="42" r="' + radius + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"></circle>' +
            '</svg>' +
            '<div><div class="ring-value">' + n.toFixed(2) + '</div><div class="meta">quality / 100</div></div>' +
          '</div>' +
        '</div>'
      );
    };
    const p95Gauge = (p95, threshold) => {
      const warn = Number.isFinite(Number(threshold)) ? Number(threshold) : 900;
      const max = Math.max(1500, warn * 1.5);
      const p = Math.max(0, Math.min(max, Number(p95) || 0));
      const markerLeft = (p / max) * 100;
      const thrLeft = (warn / max) * 100;
      const status = p <= warn ? 'within threshold' : 'above threshold';
      return (
        '<div class="kpi-card">' +
          '<div class="kpi-title">p95 Latency Gauge</div>' +
          '<div class="gauge-wrap">' +
            '<div class="gauge-track" role="img" aria-label="p95 latency ' + p.toFixed(2) + ' milliseconds, ' + status + '">' +
              '<span class="gauge-zone gauge-zone-good"></span>' +
              '<span class="gauge-zone gauge-zone-warn"></span>' +
              '<span class="gauge-zone gauge-zone-bad"></span>' +
              '<span class="gauge-threshold" style="left:' + thrLeft.toFixed(2) + '%" title="warn threshold ' + warn.toFixed(0) + 'ms"></span>' +
              '<span class="gauge-marker" style="left:' + markerLeft.toFixed(2) + '%" title="current p95 ' + p.toFixed(2) + 'ms"></span>' +
            '</div>' +
            '<div class="gauge-legend">p95=' + p.toFixed(2) + 'ms · threshold=' + warn.toFixed(0) + 'ms</div>' +
          '</div>' +
        '</div>'
      );
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
        latestEl.innerHTML = emptyState('No benchmark data', 'Run a new snapshot to populate latest metrics.', '📉');
        trendEl.innerHTML = emptyState('No trend data', 'Need at least one latest snapshot.', '📊');
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
        '<div class="kpi-grid">' +
          qualityRing(Number(currentTop?.qualityScore || 0)) +
          p95Gauge(Number(currentTop?.latencyP95Ms || 0), asNumOrNull(data?.thresholdsApplied?.strictLatencyP95WarnMs)) +
        '</div>' +
        qualityProgressbar(Number(currentTop?.qualityScore || 0)) +
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
      const missingHistoricalBaseline = !previous;
      const scopedPrevious = validBaseline
        ? previous
        : missingHistoricalBaseline
          ? latest
          : null;
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
      const hasBaseline = Boolean(validBaseline || missingHistoricalBaseline);

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
      const baselineText = validBaseline
        ? ('Same-pack ' + (baselineId || 'n/a'))
        : missingHistoricalBaseline
          ? 'Baseline fallback (current snapshot)'
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
          '<tr><td>Baseline</td><td>' + baselineText + '</td><td>' + (scopedPrevious?.id || 'n/a') + '</td><td>' + (hasBaseline ? 'same-pack' : '-') + '</td><td>' + statusBadge(hasBaseline ? 'Stable' : 'Neutral') + '</td><td>' + volatilityEmojiBadge('Low', 'Baseline') + '</td></tr>' +
          '<tr><td>Core Loop</td><td colspan="3">' + coreLoopSummary + (coreLoopWarnings.length ? (' | ' + coreLoopWarnings.map(warningBadge).join(' ')) : '') + '</td><td>' + statusBadge(coreLoopStatus) + '</td><td>' + volatilityEmojiBadge(coreLoopVol, 'Core loop') + '</td></tr>' +
          '<tr><td>Path</td><td><code>' + currentPath + '</code></td><td><code>' + previousPath + '</code></td><td>-</td><td>' + statusBadge(pathStatus(currentPath, previousPath)) + '</td><td>' + volatilityEmojiBadge('Low', 'Path') + '</td></tr>' +
          '<tr><td>Queries</td><td>' + currentQueries + '</td><td>' + (previousQueries === null ? 'n/a' : previousQueries) + '</td><td>' + (queriesDelta === null ? '-' : queriesDelta) + '</td><td>' + statusBadge(queriesStatus) + '</td><td>' + volatilityEmojiBadge(queriesVol, 'Queries') + '</td></tr>' +
          '<tr><td>Top Quality</td><td>' + qualityCurrentText + '</td><td>' + qualityPrevText + '</td><td>' + signedDelta(qualityDelta) + '</td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityEmojiBadge(qualityVol, 'Top quality') + '</td></tr>' +
          '<tr><td title="Strict p95 response latency. Lower is better.">Strict p95</td><td>' + strictP95CurrentText + '</td><td>' + strictP95PrevText + '</td><td>' + trendDeltaIndicator(strictP95Delta, 'ms', 'lower_is_better', 'Strict p95') + '</td><td>' + statusBadge(strictP95Status) + '</td><td>' + volatilityEmojiBadge(strictP95Vol, 'Strict p95') + '</td></tr>' +
          '<tr><td title="Strict heap usage. Lower is better.">Strict Heap</td><td>' + strictHeapCurrentText + '</td><td>' + strictHeapPrevText + '</td><td>' + trendDeltaIndicator(strictHeapDelta, 'MB', 'lower_is_better', 'Strict Heap') + '</td><td>' + statusBadge(strictHeapStatus) + '</td><td>' + volatilityEmojiBadge(strictHeapVol, 'Strict Heap') + '</td></tr>' +
          '<tr><td title="Strict RSS memory usage. Lower is better.">Strict RSS</td><td>' + strictRssCurrentText + '</td><td>' + strictRssPrevText + '</td><td>' + trendDeltaIndicator(strictRssDelta, 'MB', 'lower_is_better', 'Strict RSS') + '</td><td>' + statusBadge(strictRssStatus) + '</td><td>' + volatilityEmojiBadge(strictRssVol, 'Strict RSS') + '</td></tr>' +
          '<tr><td>Top Quality (10)</td><td><span class="sparkline">' + qualitySpark + '</span></td><td colspan="2">latest ' + qualityCurrentText + '</td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityEmojiBadge(classifyStdVolatility(qualityStdev), 'Top quality trend') + '</td></tr>' +
          '<tr><td>Family Cov.</td><td>' + familyCurrentText + '</td><td>' + familyPrevText + '</td><td>' + signedDelta(familyDelta, '%') + '</td><td>' + statusBadge(familyStatus) + '</td><td>' + volatilityEmojiBadge(familyVol, 'Family coverage') + '</td></tr>' +
          '<tr><td>Slop Avg.</td><td>' + slopCurrentText + '</td><td>' + slopPrevText + '</td><td>' + signedDelta(slopDelta, '%') + '</td><td>' + statusBadge(slopStatus) + '</td><td>' + volatilityEmojiBadge(slopVol, 'Slop average') + '</td></tr>' +
          '<tr><td>Query Coverage</td><td>' + qcovCurrentText + '</td><td>' + qcovPrevText + '</td><td>' + signedDelta(queryCoverageDelta, '%') + '</td><td>' + statusBadge(qcovStatus) + '</td><td>' + volatilityEmojiBadge(qcovVol, 'Query coverage') + '</td></tr>' +
          '<tr><td>Noise Ratio</td><td>' + noiseCurrentText + '</td><td>' + noisePrevText + '</td><td>' + signedDelta(noiseDelta, '%') + '</td><td>' + statusBadge(noiseStatus) + '</td><td>' + volatilityEmojiBadge(noiseVol, 'Noise ratio') + '</td></tr>' +
          '<tr><td>Reliability</td><td>' + relCurrentText + '</td><td>' + relPrevText + '</td><td>' + signedDelta(reliabilityDelta) + '</td><td>' + statusBadge(relStatus) + '</td><td>' + volatilityEmojiBadge(relVol, 'Reliability') + '</td></tr>' +
        '</tbody></table>';
    };
    const renderHistory = (data) => {
      if (!data || !Array.isArray(data.snapshots)) {
        historyEl.innerHTML = emptyState('No history index', 'History appears empty or unavailable.', '🗂️');
        lastHistory = null;
        return;
      }
      lastHistory = data;
      const slice = data.snapshots.slice(0, historyVisibleCount);
      const rows = slice.map((s) =>
        '<tr>' +
          '<td>' + s.id + '</td>' +
          '<td>' + s.createdAt + '</td>' +
          '<td>' + (s.queryPack || 'core_delivery') + '</td>' +
          '<td>' + s.topProfile + '</td>' +
          '<td>' + Number(s.topScore || 0).toFixed(2) + '</td>' +
        '</tr>'
      ).join('');
      const hasMore = data.snapshots.length > historyVisibleCount;
      historyEl.innerHTML =
        '<div class="meta">showing ' + slice.length + '/' + data.snapshots.length + ' (virtual window)</div>' +
        '<div class="table-scroll"><table><thead><tr><th>Snapshot</th><th>Created</th><th>Query Pack</th><th>Top Profile</th><th>Top Score</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (hasMore ? '<div style="margin-top:8px"><button id="historyMore">Load more</button></div>' : '');
      const moreBtn = document.getElementById('historyMore');
      if (moreBtn) {
        moreBtn.onclick = () => {
          historyVisibleCount += 40;
          renderHistory(data);
        };
      }
    };
    const renderLoopStatus = (data, latestSnapshot) => {
      if (!data || !Array.isArray(data.stages)) {
        loopStatusEl.innerHTML = '<pre>No loop status found.</pre>';
        return;
      }

      const statusCoverageLines = Number(data?.coverage?.lines || 0);
      const stages = data.stages.map((stage) => ({ ...stage }));

      const hasFail = stages.some((s) => s.status === 'fail');
      const hasWarn = stages.some((s) => s.status === 'warn');
      const closed = !hasFail && Boolean(data.loopClosed);
      const loopBadge = closed
        ? statusPill('closed')
        : hasWarn
          ? statusPill('warning')
          : statusPill('error');
      const freshness = data.freshness || null;
      const freshnessBadge = freshness
        ? statusBadge(freshness.isAligned ? 'Freshness aligned' : 'Freshness drift')
        : statusBadge('Freshness unknown');
      const freshnessText = freshness
        ? ('latestSeen=' + (freshness.latestSnapshotIdSeen || 'none') +
          ' loopSnapshot=' + (freshness.loopStatusSnapshotId || 'none') +
          ' staleMinutes=' + (freshness.staleMinutes ?? 'n/a'))
        : 'freshness unavailable';
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
        '<div class="meta">' + freshnessBadge + ' ' + freshnessText + '</div>' +
        '<div class="meta">loopClosedReason=' + (data.loopClosedReason || 'n/a') + '</div>' +
        '<table><thead><tr><th>Stage</th><th>Status</th><th>Reason</th><th>Evidence</th></tr></thead><tbody>' + rows + '</tbody></table>';

      const freshnessStage = stages.find((stage) => stage.id === 'status_freshness');
      if (freshnessStage?.status === 'fail') {
        setReportNotice(
          '<span class="badge status-bad">Loop freshness drift</span> <code>' + (freshnessStage.reason || 'status_freshness failed') + '</code>',
          'freshness'
        );
      } else if (freshnessStage?.status === 'warn') {
        setReportNotice(
          '<span class="badge status-warn">Loop freshness stale</span> <code>' + (freshnessStage.reason || 'status_freshness warning') + '</code>',
          'freshness'
        );
      } else {
        clearReportNotice('freshness');
      }
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
      const total = data.items.length;
      const present = data.items.filter((item) => item.exists).length;
      const cookieItems = data.items.filter((item) => item.category === 'domain-cookie');
      const cookiePresent = cookieItems.filter((item) => item.exists).length;
      const latestPayloadItem = cookieItems.find((item) => String(item.name || '').endsWith('/latest_payload'));
      const latestPayloadTs = latestPayloadItem?.lastModified ? Date.parse(String(latestPayloadItem.lastModified)) : NaN;
      const cookieAgeMin = Number.isFinite(latestPayloadTs)
        ? Math.max(0, Math.floor((Date.now() - latestPayloadTs) / 60000))
        : null;
      const cookieFreshness = cookieAgeMin === null
        ? '<span class="badge status-warn" title="Cookie telemetry not synced from runtime storage yet">Not synced</span>'
        : cookieAgeMin <= 15
          ? statusBadge('Stable')
          : cookieAgeMin <= 60
            ? statusBadge('Watch')
            : statusBadge('Down');
      const healthItems = data.items.filter((item) => item.category === 'domain-health');
      const healthPresent = healthItems.filter((item) => item.exists).length;
      const rows = data.items.map((item) =>
        '<tr>' +
          '<td>' + (item.category || 'snapshot') + '</td>' +
          '<td><code>' + item.name + '</code></td>' +
          '<td>' + (item.exists ? 'yes' : 'no') + '</td>' +
          '<td>' + (item.size ?? 'n/a') + '</td>' +
          '<td>' + (item.lastModified || 'n/a') + '</td>' +
        '</tr>'
      ).join('');
      inventoryEl.innerHTML =
        '<div class="meta">snapshot=' + (data.snapshotId || 'n/a') + ' source=' + (data.source || 'local') + ' freshnessSec=' + (data.freshnessSec ?? 'n/a') + '</div>' +
        '<div class="meta">objects=' + present + '/' + total + ' cookies=' + cookiePresent + '/' + cookieItems.length + ' domainHealth=' + healthPresent + '/' + healthItems.length + '</div>' +
        '<div class="meta">cookieTelemetry=' + cookieFreshness + ' age=' + (cookieAgeMin === null ? 'n/a' : (cookieAgeMin + 'm')) + '</div>' +
        '<table><thead><tr><th>Category</th><th>Object</th><th>Exists</th><th>Size</th><th>Last Modified</th></tr></thead><tbody>' + rows + '</tbody></table>';
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
      const registry = data.domainRegistry || {};
      const registrySource = String(registry.mappingSource || 'fallback');
      const registryVersion = registry.registryVersion ? String(registry.registryVersion) : 'n/a';
      const registryMatch = registry.matchedDomain ? String(registry.matchedDomain) : 'n/a';
      const requiredHeader = registry.requiredHeader ? String(registry.requiredHeader) : 'n/a';
      const tokenEnvVar = registry.tokenEnvVar ? String(registry.tokenEnvVar) : 'n/a';
      const tokenState = registry.tokenPresent === true ? 'present' : (registry.tokenPresent === false ? 'missing' : 'n/a');
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
        const fullDomainDisplay = fullDomain.length > 38 ? (fullDomain.slice(0, 35) + '...') : fullDomain;
        const dnsChar = item.dnsResolved
          ? '<span class="mono dns-char dns-char-ok" title="DNS resolved" aria-label="DNS resolved">✓</span>'
          : '<span class="mono dns-char dns-char-bad" title="DNS unresolved" aria-label="DNS unresolved">✗</span>';
        const cookieSymbol = !data.health?.cookie?.enabled
          ? '⚪'
          : cookieUnresolvedSet.has(fullDomain)
            ? '🍪⚠️'
            : data.health?.cookie?.status === 'critical'
              ? '🍪🔴'
              : data.health?.cookie?.status === 'degraded'
                ? '🍪🟡'
                : '🍪🟢';
        const cookieClass = !data.health?.cookie?.enabled
          ? 'cookie-chip-warn'
          : cookieUnresolvedSet.has(fullDomain)
            ? 'cookie-chip-warn'
            : data.health?.cookie?.status === 'critical'
              ? 'cookie-chip-bad'
              : data.health?.cookie?.status === 'degraded'
                ? 'cookie-chip-warn'
                : 'cookie-chip-ok';
        return (
        '<tr>' +
          '<td><code class="mono">' + item.subdomain + '</code></td>' +
          '<td><code class="mono">' + (item.urlFragment || item.subdomain || 'n/a') + '</code></td>' +
          '<td><code class="mono">' + (item.path || '/') + '</code></td>' +
          '<td><span class="mono truncate-domain" title="' + attrEscape(fullDomain) + '">' + fullDomainDisplay + '</span></td>' +
          '<td>' + dnsChar + '</td>' +
          '<td><span class="mono truncate-domain" title="' + attrEscape(((item.dnsRecords || []).join(', ') || 'n/a')) + '">' + (((item.dnsRecords || []).slice(0, 2).join(', ')) || 'n/a') + '</span></td>' +
          '<td><span class="mono">' + (item.dnsSource || 'live') + '</span></td>' +
          '<td>' + (item.lastCheckedAt || 'n/a') + '</td>' +
          '<td><span class="cookie-chip ' + cookieClass + '" title="Cookie telemetry">' + cookieSymbol + '</span></td>' +
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
        '<div class="meta">registry source=' + registrySource + ' match=<code>' + registryMatch + '</code> version=' + registryVersion + ' requiredHeader=<code>' + requiredHeader + '</code> tokenEnv=<code>' + tokenEnvVar + '</code> token=' + tokenState + '</div>' +
        '<div class="meta">storageKey health=<code>' + (data.storage?.sampleKeys?.health || 'n/a') + '</code></div>' +
        '<div class="meta">dnsChecked=' + (data.dnsPrefetch?.checked ?? 0) + ' dnsResolved=' + (data.dnsPrefetch?.resolved ?? 0) + ' cacheTtlSec=' + (data.dnsPrefetch?.cacheTtlSec ?? 'n/a') + '</div>' +
        '<div class="meta">cookieTelemetry=' + (data.health?.cookie?.detail || 'n/a') + ' domainMatch=' + (data.health?.cookie?.domainMatchesRequested ?? 'n/a') + ' cookieScore=' + (Number.isFinite(cookieScoreValue) ? cookieScoreValue : 'n/a') + ' hex=' + cookieHexBadge + ' bar=' + cookieUnicodeBar + ' <span class="badge" style="background:' + cookieHexBadge + ';border-color:' + cookieHexBadge + ';color:#0b0d12">■</span></div>' +
        '<div class="meta">cookieTelemetryWrite=' + (data.cookieTelemetryWrite?.written ? 'ok' : 'skipped') + (data.cookieTelemetryWrite?.reason ? ' reason=<code>' + data.cookieTelemetryWrite.reason + '</code>' : '') + '</div>' +
        '<table><thead><tr><th>Type</th><th>Key</th><th>Exists</th><th>Last Modified</th></tr></thead><tbody>' + latestRows + '</tbody><tfoot>' + latestFooter + '</tfoot></table>' +
        '<div class="table-scroll"><table class="subdomain-table"><thead><tr><th>Subdomain</th><th>URL Fragment</th><th>Path</th><th>Full Domain</th><th>DNS</th><th>Records</th><th>Source</th><th>Last Checked</th><th>Cookie</th></tr></thead><tbody>' + (subRows || '<tr><td colspan="9">No subdomain data.</td></tr>') + '</tbody><tfoot>' + subFooter + '</tfoot></table></div>';
    };
    const renderDomainRegistryStatus = (data) => {
      if (!domainRegistryStatusEl) return;
      if (!data || data.error || !data.registry) {
        domainRegistryStatusEl.innerHTML = '<pre>' + (data?.error || 'No domain registry status data.') + '</pre>';
        return;
      }
      const total = Number(data.registry.totalDomains || 0);
      const bucketMapped = Number(data.registry.bucketMapped || 0);
      const headerConfigured = Number(data.registry.headerConfigured || 0);
      const tokenConfigured = Number(data.registry.tokenConfigured || 0);
      const tokenMissing = Number(data.registry.tokenMissing || 0);
      const tokenCoverage = total > 0 ? tokenConfigured / total : 0;
      const tokenBadge = healthBadge(tokenCoverage, 'token secrets ' + tokenConfigured + '/' + total);
      const tokenState =
        tokenMissing > 0
          ? '<span class="badge status-bad">blocked</span> missing ' + tokenMissing + ' domain token secret(s)'
          : '<span class="badge status-good">ready</span> all domain token secrets present';
      const rows = Array.isArray(data.registry.domains)
        ? data.registry.domains.map((row) =>
          '<tr>' +
            '<td><code>' + (row.domain || 'n/a') + '</code></td>' +
            '<td><code>' + (row.tokenEnvVar || 'n/a') + '</code></td>' +
            '<td>' + (row.tokenPresent === true ? '<span class="badge status-good">present</span>' : '<span class="badge status-bad">missing</span>') + '</td>' +
            '<td>' + (row.tokenSource || 'n/a') + '</td>' +
            '<td><code>' + (row.bucket || 'n/a') + '</code></td>' +
            '<td><code>' + (row.requiredHeader || 'n/a') + '</code></td>' +
          '</tr>'
        ).join('')
        : '';
      domainRegistryStatusEl.innerHTML =
        '<div class="meta">generatedAt=' + (data.generatedAt || 'n/a') + ' registry=<code>' + (data.registry.path || 'n/a') + '</code> version=' + (data.registry.version || 'n/a') + '</div>' +
        '<div class="meta">domains=' + total + ' projects=' + (data.search?.projectCount ?? 'n/a') + ' latestSnapshot=' + (data.search?.latestSnapshotId || 'n/a') + ' queryPack=' + (data.search?.queryPack || 'n/a') + '</div>' +
        '<div class="meta">' +
          healthBadge(total > 0 ? bucketMapped / total : 0, 'bucket mapping ' + bucketMapped + '/' + total) + ' ' +
          healthBadge(total > 0 ? headerConfigured / total : 0, 'header mapping ' + headerConfigured + '/' + total) + ' ' +
          tokenBadge +
        '</div>' +
        '<div class="meta">' + tokenState + '</div>' +
        '<table><thead><tr><th>Domain</th><th>Token Env</th><th>Token</th><th>Source</th><th>Bucket</th><th>Header</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">No domain registry entries.</td></tr>') + '</tbody></table>';
    };
    const renderRss = (xmlText, source, meta) => {
      if (!xmlText || typeof xmlText !== 'string') {
        rssEl.innerHTML = '<div class="meta"><span title="RSS unavailable: missing feed object or source not configured">-</span></div>';
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
        rssEl.innerHTML = '<div class="meta"><span title="RSS parse error: feed content invalid">-</span></div>';
      }
    };
    const setRssBadge = (label, mode = 'neutral') => {
      const cls = mode === 'new' ? 'status-warn' : mode === 'ok' ? 'status-good' : 'status-neutral';
      rssBadgeEl.className = 'badge rss-badge ' + cls;
      rssBadgeEl.textContent = label;
      if (mode === 'neutral' && label === '-') {
        rssBadgeEl.title = 'RSS unavailable: feed missing, not configured, or parse failed.';
      } else {
        rssBadgeEl.title = '';
      }
    };
    const parseLatestRssGuid = (xmlText) => {
      try {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        const first = doc.querySelector('item');
        if (!first) return null;
        const raw = first.querySelector('guid')?.textContent || first.querySelector('link')?.textContent || null;
        return raw ? String(raw).trim() : null;
      } catch {
        return null;
      }
    };
    let reportNoticeType = 'none';
    const clearReportNotice = (type = 'all') => {
      if (type !== 'all' && reportNoticeType !== type) {
        return;
      }
      reportNoticeType = 'none';
      reportNoticeEl.innerHTML = '';
    };
    const setReportNotice = (html, type = 'general') => {
      reportNoticeType = type;
      reportNoticeEl.innerHTML = html;
      const loadBtn = document.getElementById('loadNewReports');
      if (loadBtn) {
        loadBtn.onclick = () => loadLatest(activeSource);
      }
    };
    const fetchJson = async (url, timeoutMs = 5000) => {
      const ctl = new AbortController();
      const timeout = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: ctl.signal,
        });
        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw { type: 'invalid_json', url, message: 'Invalid JSON response' };
        }
        if (!res.ok) {
          const retryAfterHeader = res.headers.get('retry-after');
          const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : null;
          throw {
            type: 'http_error',
            status: res.status,
            url,
            error: data?.error || null,
            payload: data,
            retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
            message: (data && data.error) ? String(data.error) : ('HTTP ' + res.status),
          };
        }
        return data;
      } catch (err) {
        if (err?.name === 'AbortError') {
          throw {
            type: 'timeout',
            status: 0,
            url,
            message: 'Network timeout after ' + timeoutMs + 'ms',
          };
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    };
    const classifyDashboardError = (errorLike) => {
      const err = errorLike || {};
      const code = String(err.error || err.message || '').toLowerCase();
      const status = Number(err.status || 0);
      if (err.type === 'timeout') {
        return { kind: 'timeout', label: 'Network timeout (5s)', detail: 'Request timed out before response.' };
      }
      if (code.includes('r2_get_failed')) {
        return { kind: 'r2_get_failed', label: 'R2 connection failure', detail: 'Could not read object from R2.' };
      }
      if (status === 401) {
        return { kind: 'auth', label: 'Authentication failure (401)', detail: 'Credentials rejected by upstream.' };
      }
      if (status === 404) {
        return { kind: 'not_found', label: 'R2 object not found (404)', detail: 'Bucket/path object is missing.' };
      }
      if (status === 429) {
        return { kind: 'rate_limit', label: 'Rate limited (429)', detail: 'Too many requests; retry later.' };
      }
      if (status >= 500) {
        return { kind: 'server', label: 'Server error (500+)', detail: 'Upstream error while loading dashboard data.' };
      }
      return { kind: 'generic', label: 'Request failed', detail: String(err.message || 'Unknown error') };
    };
    let refreshInFlight = false;
    let refreshRetryTimer = null;
    let refreshRetryCount = 0;
    let noticeRetryTimer = null;
    let lastRefreshSource = INITIAL_SOURCE;
    const formatTime = (d) => {
      try {
        return new Date(d).toLocaleTimeString();
      } catch {
        return new Date().toLocaleTimeString();
      }
    };
    const setRefreshVisual = (state, label, iconHtml, ariaLabel, disabled = false) => {
      if (!refreshBtnEl) return;
      refreshBtnEl.dataset.state = state;
      refreshBtnEl.setAttribute('aria-label', ariaLabel);
      refreshBtnEl.disabled = disabled;
      const iconEl = refreshBtnEl.querySelector('.refresh-icon');
      const textEl = refreshBtnEl.querySelector('.refresh-text');
      if (iconEl) iconEl.innerHTML = iconHtml;
      if (textEl) textEl.textContent = label;
    };
    const clearRetryTimer = () => {
      if (refreshRetryTimer !== null) {
        clearInterval(refreshRetryTimer);
        refreshRetryTimer = null;
      }
    };
    const clearNoticeRetryTimer = () => {
      if (noticeRetryTimer !== null) {
        clearInterval(noticeRetryTimer);
        noticeRetryTimer = null;
      }
    };
    const setRetryNotice = (source, reason, seconds = 6) => {
      clearNoticeRetryTimer();
      let remain = Math.max(1, Number(seconds) || 6);
      const render = () => {
        setReportNotice(
          '<span class="badge status-warn">Retry</span> <code>' + attrEscape(reason) + '</code> ' +
          '<button id="retryNow" ' + (remain > 0 ? 'disabled' : '') + '>' + (remain > 0 ? ('Retry in ' + remain + 's') : 'Retry now') + '</button>',
          'error'
        );
        const btn = document.getElementById('retryNow');
        if (btn) {
          btn.onclick = () => loadLatest(source);
        }
      };
      render();
      noticeRetryTimer = setInterval(() => {
        remain -= 1;
        if (remain < 0) {
          clearNoticeRetryTimer();
          remain = 0;
        }
        render();
      }, 1000);
    };
    const setRefreshIdle = () => {
      clearRetryTimer();
      refreshRetryCount = 0;
      setRefreshVisual('idle', 'Refresh', '⟳', 'Refresh dashboard', false);
    };
    const setRefreshLoading = () => {
      clearRetryTimer();
      refreshRetryCount = 0;
      setRefreshVisual('loading', 'Loading...', '<span class="refresh-spinner" aria-hidden="true"></span>', 'Loading dashboard data', true);
    };
    const setRefreshSuccess = () => {
      clearRetryTimer();
      refreshRetryCount = 0;
      setRefreshVisual('success', 'Updated ' + formatTime(Date.now()), '✅', 'Dashboard updated successfully', false);
      showToast('Dashboard updated successfully', 'success');
    };
    const setRefreshErrorCountdown = (seconds = 5) => {
      clearRetryTimer();
      refreshRetryCount = Math.max(1, Number(seconds) || 5);
      const tick = () => {
        setRefreshVisual(
          'error',
          'Retry in ' + refreshRetryCount + 's',
          '❌',
          'Refresh failed. Retry in ' + refreshRetryCount + ' seconds',
          true
        );
        refreshRetryCount -= 1;
        if (refreshRetryCount < 0) {
          setRefreshIdle();
        }
      };
      tick();
      showToast('Refresh failed. Countdown started.', 'error', 3200);
      refreshRetryTimer = setInterval(tick, 1000);
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
            '<button id="loadNewReports" style="margin-left:8px">Load now</button>',
            'updates'
          );
        } else if (latestId === knownLatestId) {
          clearReportNotice('updates');
        }
        knownLatestId = latestId;
      } catch {
        // ignore polling errors; dashboard remains usable
      }
    };
    const renderLocalFallback = async () => {
      const latestData = await fetchJson('/api/latest?source=local');
      renderLatest(latestData);
      currentLatestId = latestData?.id || currentLatestId;
      knownLatestId = latestData?.id || knownLatestId;
      const localData = await fetchJson('/api/index?source=local');
      renderHistory(localData);
      const manifest = await fetchJson('/api/publish-manifest?source=local');
      renderPublish(manifest);
      const inventory = await fetchJson('/api/r2-inventory?source=local&id=' + encodeURIComponent(latestData?.id || ''));
      renderInventory(inventory);
      const strictP95 = strictP95FromSnapshot(latestData);
      const strictP95Threshold = asNumOrNull(latestData?.thresholdsApplied?.strictLatencyP95WarnMs);
      const domainUrl =
        '/api/domain-health?source=local' +
        (strictP95 === null ? '' : '&strictP95=' + encodeURIComponent(String(strictP95))) +
        (strictP95Threshold === null ? '' : '&strictP95Threshold=' + encodeURIComponent(String(strictP95Threshold)));
      const domain = await fetchJson(domainUrl);
      renderDomainHealth(domain);
      const domainRegistryStatus = await fetchJson('/api/domain-registry-status');
      renderDomainRegistryStatus(domainRegistryStatus);
      const loop = await fetchJson('/api/loop-status?source=local');
      renderLoopStatus(loop, latestData);
      const rssMeta = await fetchJson('/api/rss-meta?source=local');
      const rssRes = await fetch('/api/rss?source=local', { credentials: 'same-origin', cache: 'no-store' });
      renderRss(await rssRes.text(), 'local', rssMeta);
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
          if (currentLatestId && latestGuid !== currentLatestId) {
            const short = latestGuid.length > 22 ? latestGuid.slice(0, 22) + '...' : latestGuid;
            setRssBadge('RSS drift: ' + short, 'new');
          } else {
            setRssBadge('RSS synced', 'ok');
          }
          return;
        }
        if (latestGuid !== currentRssGuid || (currentLatestId && latestGuid !== currentLatestId)) {
          const short = latestGuid.length > 22 ? latestGuid.slice(0, 22) + '...' : latestGuid;
          setRssBadge((currentLatestId && latestGuid !== currentLatestId) ? ('RSS drift: ' + short) : ('RSS update: ' + short), 'new');
        } else {
          setRssBadge('RSS synced', 'ok');
        }
        knownRssGuid = latestGuid;
      } catch {
        setRssBadge('-', 'neutral');
      }
    };
    async function loadLatest(source, opts = {}) {
      const attempt = Number(opts.attempt || 0);
      const maxRetries = Number(opts.maxRetries || 3);
      const internalRetry = Boolean(opts.internalRetry);
      if (refreshInFlight && !internalRetry) return;
      if (source === 'r2' && String(R2_LABEL || '').includes('(not configured)')) {
        setReportNotice(
          '<span class="badge status-warn">R2 not configured</span> set <code>R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY_ID</code>, <code>R2_SECRET_ACCESS_KEY</code> or pass <code>--r2-base</code>.',
          'error'
        );
        setRssBadge('-', 'neutral');
        showToast('R2 not configured. Using local mode.', 'error', 3200);
        return;
      }
      if (!internalRetry) {
        refreshInFlight = true;
      }
      lastRefreshSource = source;
      if (attempt === 0) {
        setRefreshLoading();
      }
      try {
        activeSource = source;
        writeStoredSource(source);
        const indexData = await fetchJson('/api/index?source=' + source);
        lastHistory = indexData;
        const data = await fetchJson('/api/latest?source=' + source);
        const prevEntry = findPreviousSamePack(indexData?.snapshots, data);
        if (prevEntry?.id) {
          const prev = await fetchJson(
            '/api/snapshot?id=' + encodeURIComponent(prevEntry.id) + '&source=' + source + '&optional=1'
          );
          previousSnapshot = prev?.missing ? null : prev;
        } else {
          previousSnapshot = null;
        }
        renderLatest(data);
        currentLatestId = data?.id || currentLatestId;
        knownLatestId = data?.id || knownLatestId;
        clearReportNotice('updates');
        const manifest = await fetchJson('/api/publish-manifest?source=' + source);
        renderPublish(manifest);
        const inventory = await fetchJson('/api/r2-inventory?source=' + source + '&id=' + encodeURIComponent(data?.id || ''));
        renderInventory(inventory);
        const strictP95 = strictP95FromSnapshot(data);
        const strictP95Threshold = asNumOrNull(data?.thresholdsApplied?.strictLatencyP95WarnMs);
        const domainUrl =
          '/api/domain-health?source=' + source +
          (strictP95 === null ? '' : '&strictP95=' + encodeURIComponent(String(strictP95))) +
          (strictP95Threshold === null ? '' : '&strictP95Threshold=' + encodeURIComponent(String(strictP95Threshold)));
        const domain = await fetchJson(domainUrl);
        renderDomainHealth(domain);
        const domainRegistryStatus = await fetchJson('/api/domain-registry-status');
        renderDomainRegistryStatus(domainRegistryStatus);
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
        const rssAligned = Boolean(guid && data?.id && guid === data.id);
        setRssBadge(rssAligned ? 'RSS synced' : 'RSS drift', rssAligned ? 'ok' : 'new');
        overviewState.snapshotId = String(data?.id || 'n/a');
        overviewState.queryPack = String(data?.queryPack || 'n/a');
        overviewState.loop = loop?.loopClosed === true ? 'closed' : 'open';
        overviewState.loopMeta = String(loop?.loopClosedReason || 'n/a');
        const tokenConfigured = Number(domainRegistryStatus?.registry?.tokenConfigured || 0);
        const totalDomains = Number(domainRegistryStatus?.registry?.totalDomains || 0);
        overviewState.tokenCoverage = totalDomains > 0 ? (tokenConfigured + '/' + totalDomains) : 'n/a';
        overviewState.tokenMeta = totalDomains > 0 ? (domainRegistryStatus.registry.tokenMissing + ' missing') : 'n/a';
        const checkedRows = Number(domainRegistryStatus?.domainHealth?.checkedRows || 0);
        const onlineRows = Number(domainRegistryStatus?.domainHealth?.onlineRows || 0);
        overviewState.domainHealth = checkedRows > 0 ? ('online ' + onlineRows + '/' + checkedRows) : 'n/a';
        overviewState.domainHealthMeta = checkedRows > 0 ? ('offline/degraded ' + (checkedRows - onlineRows)) : 'n/a';
        overviewState.rss = rssAligned ? 'synced' : 'drift';
        overviewState.rssMeta = guid ? ('guid ' + guid.slice(0, 16)) : 'guid n/a';
        renderOverview();
        setRefreshSuccess();
        clearNoticeRetryTimer();
      } catch (error) {
        setRssBadge('-', 'neutral');
        const classified = classifyDashboardError(error);
        const timestamp = new Date().toISOString();
        console.error('[dashboard-error][' + timestamp + ']', {
          source,
          error,
          classified,
        });
        const message = classified.label + ' - ' + classified.detail;
        overviewState.rss = 'unavailable';
        overviewState.rssMeta = message;
        renderOverview();
        setRefreshErrorCountdown(6);
        setRetryNotice(source, message, 6);
        if (source === 'r2') {
          const hasRetriesLeft = attempt < (maxRetries - 1);
          if (classified.kind === 'r2_get_failed' && hasRetriesLeft) {
            const waitMs = (attempt + 1) * 1000;
            setReportNotice(
              '<span class="badge status-warn">R2 connection failed</span> <code>' + attrEscape(message) + '</code> auto-retry ' + (attempt + 1) + '/' + maxRetries + ' in ' + Math.round(waitMs / 1000) + 's.',
              'error'
            );
            await Bun.sleep(waitMs);
            return await loadLatest(source, { attempt: attempt + 1, maxRetries, internalRetry: true });
          }
          if (classified.kind === 'timeout' && hasRetriesLeft) {
            const waitMs = Math.min(12000, Math.pow(2, attempt + 1) * 1000);
            setReportNotice(
              '<span class="badge status-warn">Network timeout</span> <code>' + attrEscape(message) + '</code> retry with backoff in ' + Math.round(waitMs / 1000) + 's (' + (attempt + 1) + '/' + maxRetries + ').',
              'error'
            );
            await Bun.sleep(waitMs);
            return await loadLatest(source, { attempt: attempt + 1, maxRetries, internalRetry: true });
          }
          if (classified.kind === 'rate_limit' && hasRetriesLeft) {
            const retryAfterSecRaw = Number(error?.retryAfter ?? error?.payload?.retryAfter ?? error?.payload?.retry_after ?? 5);
            const retryAfterSec = Number.isFinite(retryAfterSecRaw) && retryAfterSecRaw > 0 ? retryAfterSecRaw : 5;
            setReportNotice(
              '<span class="badge status-warn">Rate limited</span> <code>' + attrEscape(message) + '</code> waiting retryAfter=' + retryAfterSec + 's (' + (attempt + 1) + '/' + maxRetries + ').',
              'error'
            );
            await Bun.sleep(retryAfterSec * 1000);
            return await loadLatest(source, { attempt: attempt + 1, maxRetries, internalRetry: true });
          }
          if (classified.kind === 'not_found') {
            setReportNotice(
              '<span class="badge status-bad">R2 bucket/object missing (404)</span> <code>' + attrEscape(message) + '</code> check <code>wrangler.toml</code> bucket binding and prefix.',
              'error'
            );
          }
          if (classified.kind === 'auth') {
            showToast('Authentication failed (401). Check credentials.', 'error', 3600);
            setReportNotice(
              '<span class="badge status-bad">Auth failure (401)</span> <code>' + attrEscape(message) + '</code> check R2 credentials and token secrets.',
              'error'
            );
          }
        }
        if (source === 'r2' && (classified.kind === 'r2_get_failed' || classified.kind === 'timeout' || classified.kind === 'server' || classified.kind === 'not_found' || classified.kind === 'auth' || classified.kind === 'rate_limit')) {
          try {
            await renderLocalFallback();
            activeSource = 'local';
            writeStoredSource('local');
            setReportNotice(
              '<span class="badge status-warn">R2 degraded</span> <code>' + attrEscape(message) + '</code> showing cached local data.',
              'error'
            );
            showToast('Using cached local data after R2 failure', 'error', 3600);
          } catch (fallbackErr) {
            const fbMessage = fallbackErr?.message || String(fallbackErr);
            setReportNotice(
              '<span class="badge status-bad">Refresh failed</span> <code>' + attrEscape(message + '; local fallback failed: ' + fbMessage) + '</code>',
              'error'
            );
          }
          return;
        }
        if (classified.kind === 'generic' && source === 'r2' && !String(R2_LABEL || '').includes('credentialed')) {
          setReportNotice('<span class="badge status-warn">R2 not configured</span> set <code>R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY_ID</code>, <code>R2_SECRET_ACCESS_KEY</code> or <code>--r2-base</code>.', 'error');
        }
      } finally {
        refreshInFlight = false;
      }
    }
    async function loadHistory() {
      if (refreshInFlight) return;
      refreshInFlight = true;
      setRefreshLoading();
      try {
        activeSource = 'local';
        lastRefreshSource = 'local';
        writeStoredSource('local');
        const localData = await fetchJson('/api/index');
        historyVisibleCount = 40;
        renderHistory(localData);
        const latestData = await fetchJson('/api/latest?source=local');
        const prevEntry = findPreviousSamePack(localData?.snapshots, latestData);
        if (prevEntry?.id) {
          const prev = await fetchJson(
            '/api/snapshot?id=' + encodeURIComponent(prevEntry.id) + '&source=local&optional=1'
          );
          previousSnapshot = prev?.missing ? null : prev;
        } else {
          previousSnapshot = null;
        }
        renderLatest(latestData);
        currentLatestId = latestData?.id || currentLatestId;
        knownLatestId = latestData?.id || knownLatestId;
        clearReportNotice('updates');
        const manifest = await fetchJson('/api/publish-manifest?source=local');
        renderPublish(manifest);
        const inventory = await fetchJson('/api/r2-inventory?source=local&id=' + encodeURIComponent(latestData?.id || ''));
        renderInventory(inventory);
        const strictP95 = strictP95FromSnapshot(latestData);
        const strictP95Threshold = asNumOrNull(latestData?.thresholdsApplied?.strictLatencyP95WarnMs);
        const domainUrl =
          '/api/domain-health?source=local' +
          (strictP95 === null ? '' : '&strictP95=' + encodeURIComponent(String(strictP95))) +
          (strictP95Threshold === null ? '' : '&strictP95Threshold=' + encodeURIComponent(String(strictP95Threshold)));
        const domain = await fetchJson(domainUrl);
        renderDomainHealth(domain);
        const domainRegistryStatus = await fetchJson('/api/domain-registry-status');
        renderDomainRegistryStatus(domainRegistryStatus);
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
        const rssAligned = Boolean(guid && latestData?.id && guid === latestData.id);
        setRssBadge(rssAligned ? 'RSS synced' : 'RSS drift', rssAligned ? 'ok' : 'new');
        overviewState.snapshotId = String(latestData?.id || 'n/a');
        overviewState.queryPack = String(latestData?.queryPack || 'n/a');
        overviewState.loop = loop?.loopClosed === true ? 'closed' : 'open';
        overviewState.loopMeta = String(loop?.loopClosedReason || 'n/a');
        const tokenConfigured = Number(domainRegistryStatus?.registry?.tokenConfigured || 0);
        const totalDomains = Number(domainRegistryStatus?.registry?.totalDomains || 0);
        overviewState.tokenCoverage = totalDomains > 0 ? (tokenConfigured + '/' + totalDomains) : 'n/a';
        overviewState.tokenMeta = totalDomains > 0 ? (domainRegistryStatus.registry.tokenMissing + ' missing') : 'n/a';
        const checkedRows = Number(domainRegistryStatus?.domainHealth?.checkedRows || 0);
        const onlineRows = Number(domainRegistryStatus?.domainHealth?.onlineRows || 0);
        overviewState.domainHealth = checkedRows > 0 ? ('online ' + onlineRows + '/' + checkedRows) : 'n/a';
        overviewState.domainHealthMeta = checkedRows > 0 ? ('offline/degraded ' + (checkedRows - onlineRows)) : 'n/a';
        overviewState.rss = rssAligned ? 'synced' : 'drift';
        overviewState.rssMeta = guid ? ('guid ' + guid.slice(0, 16)) : 'guid n/a';
        renderOverview();
        setRefreshSuccess();
      } catch (error) {
        setRssBadge('-', 'neutral');
        const message = error instanceof Error ? error.message : String(error);
        setReportNotice('<span class="badge status-bad">History refresh failed</span> <code>' + message + '</code>', 'error');
        overviewState.rss = 'unavailable';
        overviewState.rssMeta = message;
        renderOverview();
        setRefreshErrorCountdown(6);
      } finally {
        refreshInFlight = false;
      }
    }
    document.getElementById('loadLocal').onclick = () => loadLatest('local');
    document.getElementById('loadR2').onclick = () => loadLatest('r2');
    document.getElementById('loadHistory').onclick = () => loadHistory();
    if (refreshBtnEl) {
      refreshBtnEl.onclick = () => loadLatest(activeSource || lastRefreshSource || INITIAL_SOURCE);
    }
    window.addEventListener('offline', () => {
      setReportNotice('<span class="badge status-bad">Offline</span> <code>Network unavailable; showing last known data.</code>', 'network');
      showToast('Offline mode: using cached dashboard state', 'error', 3600);
    });
    window.addEventListener('online', () => {
      clearReportNotice('network');
      showToast('Back online. Refreshing dashboard...', 'success', 2200);
      loadLatest(activeSource || INITIAL_SOURCE);
    });
    document.getElementById('jumpColors').onclick = () => {
      const el = document.getElementById('color-reference');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    rssBadgeEl.onclick = () => loadLatest(activeSource);
    renderOverview();
    setRefreshIdle();
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
    const mk = (name: string, path: string, category: InventoryItem['category'] = 'snapshot'): InventoryItem => {
      if (!existsSync(path)) {
        return { name, exists: false, size: null, lastModified: null, category };
      }
      const st = statSync(path);
      return {
        name,
        exists: true,
        size: st.size,
        lastModified: new Date(st.mtimeMs).toISOString(),
        category,
      };
    };
    const items: InventoryItem[] = [
      mk('snapshot.json', id ? resolve(dir, id, 'snapshot.json') : resolve(dir, '__missing__/snapshot.json'), 'snapshot'),
      mk('summary.md', id ? resolve(dir, id, 'summary.md') : resolve(dir, '__missing__/summary.md'), 'snapshot'),
      mk('snapshot.json.gz', id ? resolve(dir, id, 'snapshot.json.gz') : resolve(dir, '__missing__/snapshot.json.gz'), 'snapshot'),
      mk('summary.md.gz', id ? resolve(dir, id, 'summary.md.gz') : resolve(dir, '__missing__/summary.md.gz'), 'snapshot'),
      mk('publish-manifest.json', id ? resolve(dir, id, 'publish-manifest.json') : resolve(dir, '__missing__/publish-manifest.json'), 'snapshot'),
      mk('rss.xml', resolve(dir, 'rss.xml'), 'snapshot'),
      mk('health-report.json', resolve('reports', 'health-report.json'), 'domain-health'),
    ];
    const latestTs = items
      .filter((it) => it.category === 'snapshot')
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
        `cookies/${options.domain}/secure_domain_ctx`,
        `cookies/${options.domain}/secure_subdomain_state`,
        `cookies/${options.domain}/latest_payload`,
        `domains/${options.domain}/cookies.json`,
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
      const cookieListed = await S3Client.list(
        { prefix: `cookies/${options.domain}/`, limit: 1000 },
        {
          bucket: r2.bucket,
          endpoint: r2.endpoint,
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        }
      );
      const domainListed = await S3Client.list(
        { prefix: `domains/${options.domain}/`, limit: 1000 },
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
      const extras = [...(cookieListed.contents || []), ...(domainListed.contents || [])] as Array<{
        key: string;
        size?: number;
        lastModified?: string;
      }>;
      const allContents = [...contents, ...extras];
      const byKey = new Map(allContents.map((c) => [c.key, c]));
      const items: InventoryItem[] = keys.map((key) => {
        const item = byKey.get(key);
        const category: InventoryItem['category'] = key.includes('/snapshot') || key.includes('/summary') || key.includes('/publish-manifest') || key.endsWith('/rss.xml')
          ? 'snapshot'
          : key.startsWith('cookies/')
            ? 'domain-cookie'
            : 'domain-health';
        return {
          name: key.replace(`${prefix}/`, ''),
          exists: Boolean(item),
          size: item?.size ?? null,
          lastModified: item?.lastModified ?? null,
          category,
        };
      });
      const latestTs = items
        .filter((it) => it.category === 'snapshot')
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
      `cookies/${options.domain}/secure_domain_ctx`,
      `cookies/${options.domain}/secure_subdomain_state`,
      `cookies/${options.domain}/latest_payload`,
      `domains/${options.domain}/cookies.json`,
    ];
    const items: InventoryItem[] = await Promise.all(targets.map(async (name) => {
      const res = await proxyFetch(`${base}/${name}`, { method: 'HEAD', cache: 'no-store' });
      const category: InventoryItem['category'] = name.startsWith('cookies/')
        ? 'domain-cookie'
        : name.startsWith('domains/')
          ? 'domain-health'
          : 'snapshot';
      return {
        name,
        exists: res.ok,
        size: Number(res.headers.get('content-length') || 0) || null,
        lastModified: res.headers.get('last-modified') || null,
        category,
      };
    }));
    const latestTs = items
      .filter((it) => it.category === 'snapshot')
      .map((it) => (it.lastModified ? Date.parse(it.lastModified) : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    return {
      source: 'r2',
      snapshotId: id,
      freshnessSec: latestTs > 0 ? Math.max(0, Math.floor((Date.now() - latestTs) / 1000)) : null,
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
    const legacyKey = `domains/${domain}/cookies.json`;
    const fallback = defaultCookieTelemetry(domain);
    const r2 = resolveR2ReadOptions();
    if (!r2) return { ...fallback, key: legacyKey };
    const getJsonByKey = async (key: string): Promise<{ ok: boolean; status: number; parsed?: any; error?: string }> => {
      try {
        const objectRes = await fetchR2ObjectBySignature(
          r2.endpoint,
          r2.bucket,
          key,
          r2.accessKeyId,
          r2.secretAccessKey
        );
        if (!objectRes.ok) {
          return { ok: false, status: objectRes.status };
        }
        const text = await objectRes.text();
        return { ok: true, status: 200, parsed: JSON.parse(text) };
      } catch (error) {
        return {
          ok: false,
          status: 500,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };
    try {
      const legacy = await getJsonByKey(legacyKey);
      if (legacy.ok) {
        const parsed = legacy.parsed;
        const rows = normalizeCookieRows(parsed);
        const computed = computeCookieScore(rows);
        const payloadUnresolved = Array.isArray(parsed?.unresolved)
          ? parsed.unresolved.map((v: any) => String(v || '').trim().toLowerCase()).filter(Boolean)
          : [];
        return {
          ...computed,
          unresolved: Array.from(new Set([...computed.unresolved, ...payloadUnresolved])),
          source: 'r2',
          key: legacyKey,
        };
      }

      const ctxKey = `cookies/${domain}/secure_domain_ctx`;
      const stateKey = `cookies/${domain}/secure_subdomain_state`;
      const payloadKey = `cookies/${domain}/latest_payload`;
      const [ctxRes, stateRes, payloadRes] = await Promise.all([
        getJsonByKey(ctxKey),
        getJsonByKey(stateKey),
        getJsonByKey(payloadKey),
      ]);

      if (!ctxRes.ok && !stateRes.ok && !payloadRes.ok) {
        const code = legacy.status || ctxRes.status || stateRes.status || payloadRes.status;
        return {
          ...fallback,
          source: code === 404 ? 'default' : 'error',
          key: `${ctxKey},${stateKey},${payloadKey}`,
          error: `status_${code}`,
        };
      }

      const ctx = ctxRes.parsed || {};
      const state = stateRes.parsed || {};
      const payload = payloadRes.parsed || {};
      const secure = parseBooleanLike(ctx?.secure);
      const httpOnly = parseBooleanLike(ctx?.httpOnly);
      const sameSite = String(ctx?.sameSite || '').trim().toLowerCase();
      const active = parseBooleanLike(state?.active);
      const cookieCount = Number(payload?.cookies);
      const keyCount = Array.isArray(payload?.keys) ? payload.keys.length : 0;

      let rawScore = 0;
      if (secure) rawScore += 0.3;
      if (httpOnly) rawScore += 0.3;
      if (sameSite === 'strict') rawScore += 0.2;
      else if (sameSite === 'lax') rawScore += 0.1;
      if (active) rawScore += 0.1;
      if (Number.isFinite(cookieCount) && cookieCount > 0) rawScore += 0.05;
      if (keyCount > 0) rawScore += 0.05;
      rawScore = clamp01(rawScore);
      const score = Math.round(rawScore * 100);

      const unresolved = Array.isArray(state?.unresolved)
        ? state.unresolved.map((v: any) => String(v || '').trim().toLowerCase()).filter(Boolean)
        : [];
      return {
        score,
        disabled: false,
        total: Number.isFinite(cookieCount) && cookieCount >= 0 ? cookieCount : (active ? 1 : 0),
        secureCount: secure ? 1 : 0,
        httpOnlyCount: httpOnly ? 1 : 0,
        sameSiteCount: sameSite === 'strict' || sameSite === 'lax' ? 1 : 0,
        expiryCount: 0,
        unresolved,
        source: 'r2',
        key: `${ctxKey},${stateKey},${payloadKey}`,
      };
    } catch (error) {
      return {
        ...fallback,
        source: 'error',
        key: legacyKey,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const buildDomainHealthSummary = async (
    source: 'local' | 'r2',
    domain: string,
    strictP95Ms: number | null = null,
    cookieTelemetryInput: CookieTelemetryInput | null = null,
    strictP95ThresholdMs: number | null = null
  ) => {
    const r2Read = resolveR2ReadOptions();
    const ctx = await createDomainContext({
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
    const thresholdStrictP95Ms =
      typeof strictP95ThresholdMs === 'number' && Number.isFinite(strictP95ThresholdMs)
        ? strictP95ThresholdMs
        : 900;

    if (source === 'local') {
      const latest = prefixes.map((type) => ({
        type,
        key: `${ctx.prefix}/${type}/YYYY-MM-DD.json`,
        exists: false,
        lastModified: null,
      }));
      const latestPresent = 0;
      const latestCount = latest.length;
      const storageStatus = 'simulated';
      const storageRatio = 0;
      const storageScoreRatio = 1;
      const degradedByStrictP95 = typeof strictP95Ms === 'number' && Number.isFinite(strictP95Ms) && strictP95Ms > thresholdStrictP95Ms;
      const preliminaryStatus = degradedByStrictP95
        ? 'degraded'
        : dnsStatus;
      const latencyScore = degradedByStrictP95 ? 0.55 : (strictP95Ms === null ? 0.85 : 1);
      const overallScore = clamp01(
        dnsRatio * 0.4 +
        storageScoreRatio * 0.35 +
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
        domainRegistry: ctx.registry,
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
      return { error: 'r2_not_configured_for_domain_health', source, domain, baseUrl: domain, zone, accountId, storage, domainRegistry: ctx.registry, knownSubdomains, managerNote };
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
      domainRegistry: ctx.registry,
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

  const persistCookieTelemetry = async (
    domain: string,
    cookies: Map<string, string>
  ): Promise<{ written: boolean; reason?: string }> => {
    try {
      const r2 = resolveR2BridgeConfig();
      const bucketAdapter = {
        put: async (key: string, value: string) => {
          await S3Client.write(key, value, {
            bucket: r2.bucket,
            endpoint: r2.endpoint,
            accessKeyId: r2.accessKeyId,
            secretAccessKey: r2.secretAccessKey,
            type: 'application/json',
          });
        },
      };
      await storeCookieTelemetry(domain, cookies, bucketAdapter);
      return { written: true };
    } catch (error) {
      return {
        written: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
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
        const optional = url.searchParams.get('optional') === '1';
        if (!id) {
          return Response.json({ error: 'missing_id' }, { status: 400 });
        }
        if (source === 'r2') {
          const r2Snapshot = await getCachedRemoteJson(`r2:snapshot:${id}`, `${id}/snapshot.json`);
          if (optional && !r2Snapshot.ok) {
            return Response.json(
              {
                missing: true,
                source: 'r2',
                id,
                status: r2Snapshot.status,
              },
              { status: 200 }
            );
          }
          return r2Snapshot;
        }
        const localSnapshotPath = resolve(dir, id, 'snapshot.json');
        if (optional && !existsSync(localSnapshotPath)) {
          return Response.json(
            {
              missing: true,
              source: 'local',
              id,
              status: 404,
            },
            { status: 200 }
          );
        }
        return readLocalJson(localSnapshotPath);
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
        const strictP95ThresholdRaw = url.searchParams.get('strictP95Threshold');
        const strictP95ThresholdMs = strictP95ThresholdRaw === null ? null : Number(strictP95ThresholdRaw);
        const strictP95Threshold = Number.isFinite(strictP95ThresholdMs) ? strictP95ThresholdMs : null;
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
        const data: any = await buildDomainHealthSummary(
          source,
          domain,
          strictP95,
          cookieTelemetryInput,
          strictP95Threshold
        );
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

          const telemetryCookieMap = new Map(cookieMap);
          telemetryCookieMap.set('secure_domain_ctx', String(domainCookie.value || ''));
          telemetryCookieMap.set('secure_subdomain_state', String(subdomainCookie.value || ''));
          telemetryCookieMap.set('bfw_state', 'present');
          const telemetryWrite = await persistCookieTelemetry(domain, telemetryCookieMap);
          data.cookieTelemetryWrite = telemetryWrite;
        }
        return Response.json(data, { headers });
      }
      if (url.pathname === '/api/domain-registry-status') {
        try {
          const payload = await buildDomainRegistryStatus({
            registryPath: Bun.env.DOMAIN_REGISTRY_PATH,
            latestPath: 'reports/search-benchmark/latest.json',
            healthReportPath: 'reports/health-report.json',
            envFile: '.env.factory-wager',
            json: true,
            doctor: false,
            fix: false,
            emitSecretsCommands: false,
          });
          return Response.json(payload, {
            headers: {
              'cache-control': 'no-store',
            },
          });
        } catch (error) {
          return Response.json(
            {
              error: 'domain_registry_status_failed',
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
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
        if (!existsSync(loopStatusJson)) {
          return Response.json({ error: 'not_found', path: loopStatusJson }, { status: 404 });
        }
        const raw = JSON.parse(await readFile(loopStatusJson, 'utf8')) as any;
        let latestId: string | null = null;
        if (existsSync(latestJson)) {
          try {
            const latest = JSON.parse(await readFile(latestJson, 'utf8')) as any;
            latestId = latest?.id || null;
          } catch {
            latestId = null;
          }
        }
        const generatedAtMs = Date.parse(String(raw?.generatedAt || ''));
        const staleMinutes = Number.isFinite(generatedAtMs)
          ? Number(Math.max(0, (Date.now() - generatedAtMs) / 60000).toFixed(2))
          : null;
        const loopSnapshotId = raw?.latestSnapshotId || null;
        const freshness = {
          latestSnapshotIdSeen: latestId || null,
          loopStatusSnapshotId: loopSnapshotId,
          isAligned: Boolean(latestId && loopSnapshotId && latestId === loopSnapshotId),
          staleMinutes,
        };
        const freshnessWindowMinutes = 15;
        const stages = Array.isArray(raw?.stages) ? [...raw.stages] : [];
        const freshnessIdx = stages.findIndex((s: any) => s?.id === 'status_freshness');
        const nextFreshnessStage = (() => {
          if (!freshness.latestSnapshotIdSeen || !freshness.loopStatusSnapshotId || !freshness.isAligned) {
            return {
              id: 'status_freshness',
              status: 'fail',
              reason: 'Loop status snapshot is misaligned with latest benchmark snapshot.',
              evidence: [
                `latestSeen=${freshness.latestSnapshotIdSeen || 'none'}`,
                `loopSnapshot=${freshness.loopStatusSnapshotId || 'none'}`,
              ],
            };
          }
          if (typeof freshness.staleMinutes === 'number' && freshness.staleMinutes > freshnessWindowMinutes) {
            return {
              id: 'status_freshness',
              status: 'warn',
              reason: `Loop status snapshot is older than ${freshnessWindowMinutes} minutes.`,
              evidence: [
                `staleMinutes=${freshness.staleMinutes.toFixed(2)}`,
                `freshnessWindow=${freshnessWindowMinutes}`,
              ],
            };
          }
          return {
            id: 'status_freshness',
            status: 'pass',
            reason: 'Loop status snapshot is aligned and fresh.',
            evidence: [
              `staleMinutes=${typeof freshness.staleMinutes === 'number' ? freshness.staleMinutes.toFixed(2) : 'n/a'}`,
            ],
          };
        })();
        if (freshnessIdx >= 0) {
          stages[freshnessIdx] = { ...(stages[freshnessIdx] || {}), ...nextFreshnessStage };
        } else {
          stages.push(nextFreshnessStage);
        }
        raw.freshness = {
          ...(raw?.freshness || {}),
          ...freshness,
        };
        raw.stages = stages;
        const hasFail = stages.some((s: any) => String(s?.status || '').toLowerCase() === 'fail');
        const disallowedWarns = stages.filter(
          (s: any) =>
            String(s?.status || '').toLowerCase() === 'warn' &&
            !['signal_latency', 'signal_memory', 'status_freshness'].includes(String(s?.id || ''))
        );
        raw.loopClosed = !hasFail && disallowedWarns.length === 0;
        raw.loopClosedReason = raw.loopClosed
          ? 'All stages passed or are allowed warning states (latency/memory/status_freshness), including dashboard parity inputs.'
          : hasFail
            ? `One or more stages failed: ${stages.filter((s: any) => String(s?.status || '').toLowerCase() === 'fail').map((s: any) => s.id).join(', ')}`
            : `Disallowed warning stages present: ${disallowedWarns.map((s: any) => s.id).join(', ')}`;
        return Response.json(raw);
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

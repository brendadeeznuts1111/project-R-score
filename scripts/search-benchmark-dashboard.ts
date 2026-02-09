#!/usr/bin/env bun
/**
 * Search Benchmark Dashboard v2.0
 * Real-time performance monitoring with extensive visualization capabilities
 * 
 * Features:
 * - Glassmorphism UI with dark/light themes
 * - Interactive charts (sparklines, bar charts, heatmaps)
 * - Real-time polling with configurable intervals
 * - Alert configuration with webhook support
 * - Data export (JSON, CSV, Markdown)
 * - Keyboard shortcuts for power users
 * - Responsive design for all screen sizes
 * - Accessibility compliant (ARIA labels, keyboard nav)
 * 
 * @license MIT
 */

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
import { buildUnifiedStatus } from './search-unified-status';
import { comparePayload, compareSnapshotPayload, type CompareResultPayload, type Snapshot } from './search-benchmark-pin';
import {
  LOOP_FRESHNESS_WINDOW_MINUTES,
  formatLoopClosedReason,
  isLoopClosedByPolicy,
  warningCodeStatus,
} from './lib/search-status-contract';

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

type JsonRouteOptions = {
  status?: number;
  source?: 'local' | 'r2' | 'mixed' | 'none';
  extraHeaders?: Record<string, string>;
};

type LatestApiPayload = Record<string, unknown> & {
  id?: string;
  warnings?: string[];
  gate?: CompareResultPayload;
  gateError?: string;
  gateCheckedAt?: string;
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
    return jsonResponse(
      {
        error: 'not_found',
        message: `Resource not found: ${path}`,
        path,
      },
      { status: 404, source: 'local' }
    );
  }
  const raw = await readFile(path, 'utf8');
  return new Response(raw, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-search-status-source': 'local',
    },
  });
}

function jsonResponse(body: unknown, options: JsonRouteOptions = {}): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  if (options.source) {
    headers['x-search-status-source'] = options.source;
  }
  if (options.extraHeaders) {
    Object.assign(headers, options.extraHeaders);
  }
  return new Response(JSON.stringify(body, null, 2), {
    status: options.status || 200,
    headers,
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
    'cache-control': 'no-store',
    'x-search-status-source': 'r2',
  };
  if (cacheStatus) {
    headers['x-search-bench-cache'] = cacheStatus;
  }
  return new Response(body, { status, headers });
}

async function runGitText(args: string[]): Promise<string> {
  try {
    const proc = Bun.spawn(['git', ...args], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const [exitCode, text] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
    ]);
    return exitCode === 0 ? text.trim() : '';
  } catch {
    return '';
  }
}

async function resolveBuildMeta(): Promise<BuildMeta> {
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
    const remote = await runGitText(['remote', 'get-url', 'origin']);
    if (remote) repoUrl = normalizeRepoUrl(remote);
  }
  if (!repoUrl) {
    repoUrl = 'https://github.com/brendadeeznuts1111/project-R-score';
  }
  const envSha = (Bun.env.GIT_COMMIT || Bun.env.COMMIT_SHA || '').trim();
  let commitFull = envSha;
  let branchName = (Bun.env.GIT_BRANCH || '').trim();
  if (!commitFull) {
    commitFull = await runGitText(['rev-parse', 'HEAD']);
  }
  if (!branchName) {
    branchName = await runGitText(['rev-parse', '--abbrev-ref', 'HEAD']);
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
  const warningStatusLevels = {
    latency_p95_warn: warningCodeStatus('latency_p95_warn'),
    slop_rise_warn: warningCodeStatus('slop_rise_warn'),
    heap_peak_warn: warningCodeStatus('heap_peak_warn'),
    rss_peak_warn: warningCodeStatus('rss_peak_warn'),
    quality_drop_warn: warningCodeStatus('quality_drop_warn'),
    reliability_drop_warn: warningCodeStatus('reliability_drop_warn'),
    strict_reliability_floor_warn: warningCodeStatus('strict_reliability_floor_warn'),
  };
  const statusLabels = {
    success: 'Operational',
    warning: 'Attention Needed',
    error: 'Critical Action Required',
    closed: 'Loop Status Closed',
  };
  const commitUrl = buildMeta.commitFull && buildMeta.commitFull !== 'unknown'
    ? `${buildMeta.repoUrl.replace(/\/+$/g, '')}/commit/${buildMeta.commitFull}`
    : buildMeta.repoUrl;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Search Benchmark Dashboard - Real-time performance metrics and loop closure tracking" />
  <meta name="theme-color" content="#0b111f" />
  <title>Search Benchmark Dashboard</title>
  <style>
    :root {
      --bg: #0b111f;
      --panel: rgba(17, 26, 45, 0.75);
      --panel-solid: #111a2d;
      --text: #e8eefc;
      --text-secondary: #b8c5e8;
      --muted: #90a0c4;
      --accent: #4fd1c5;
      --accent-glow: rgba(79, 209, 197, 0.3);
      --line: rgba(31, 44, 73, 0.8);
      --success: #22c55e;
      --success-glow: rgba(34, 197, 94, 0.4);
      --warning: #facc15;
      --warning-glow: rgba(250, 204, 21, 0.4);
      --error: #f97316;
      --error-glow: rgba(249, 115, 22, 0.4);
      --critical: #ef4444;
      --critical-glow: rgba(239, 68, 68, 0.4);
      
      /* Chart colors */
      --chart-1: #4fd1c5;
      --chart-2: #22c55e;
      --chart-3: #facc15;
      --chart-4: #f97316;
      --chart-5: #a855f7;
      --chart-6: #3b82f6;
    }
    
    [data-theme="light"] {
      --bg: #f8fafc;
      --panel: rgba(255, 255, 255, 0.85);
      --panel-solid: #ffffff;
      --text: #0f172a;
      --text-secondary: #475569;
      --muted: #64748b;
      --accent: #0891b2;
      --accent-glow: rgba(8, 145, 178, 0.3);
      --line: rgba(203, 213, 225, 0.8);
      --success: #16a34a;
      --success-glow: rgba(22, 163, 74, 0.3);
      --warning: #ca8a04;
      --warning-glow: rgba(202, 138, 4, 0.3);
      --error: #dc2626;
      --error-glow: rgba(220, 38, 38, 0.3);
      --critical: #dc2626;
      --critical-glow: rgba(220, 38, 38, 0.3);
      --chart-1: #0891b2;
      --chart-2: #16a34a;
      --chart-3: #ca8a04;
      --chart-4: #dc2626;
      --chart-5: #9333ea;
      --chart-6: #2563eb;
    }
    
    * { box-sizing: border-box; }
    
    html {
      scroll-behavior: smooth;
    }
    
    body { 
      margin: 0; 
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: 
        radial-gradient(ellipse at 0% 0%, rgba(79, 209, 197, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 100% 100%, rgba(34, 197, 94, 0.05) 0%, transparent 50%),
        linear-gradient(180deg, #081226 0%, #0b111f 50%, #0a0f1a 100%);
      background-attachment: fixed;
      color: var(--text); 
      min-height: 100vh;
      line-height: 1.6;
    }
    
    main { 
      max-width: 1400px; 
      margin: 0 auto; 
      padding: 24px;
      animation: fadeIn 0.6s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Glassmorphism Cards */
    .card { 
      background: var(--panel);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 2px 4px -1px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%);
      pointer-events: none;
    }
    
    .card:hover {
      transform: translateY(-3px);
      box-shadow: 
        0 20px 40px -10px rgba(0, 0, 0, 0.5),
        0 10px 20px -5px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      border-color: rgba(79, 209, 197, 0.2);
    }
    
    .layout { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; }
    .span-12 { grid-column: span 12; }
    .span-8 { grid-column: span 8; }
    .span-6 { grid-column: span 6; }
    .span-4 { grid-column: span 4; }
    .section-title { 
      margin: 8px 0 4px; 
      color: var(--muted); 
      font-size: 11px; 
      text-transform: uppercase; 
      letter-spacing: 0.12em;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      width: 3px;
      height: 12px;
      background: linear-gradient(180deg, var(--accent), transparent);
      border-radius: 2px;
    }
    
    .section-subtitle { 
      margin: 0 0 12px; 
      color: var(--text-secondary); 
      font-size: 13px;
      font-weight: 400;
    }
    
    h1 { 
      margin: 0 0 8px; 
      font-size: 26px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--text) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }
    
    h2 {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--text);
    }
    
    .meta { color: var(--muted); font-size: 12px; line-height: 1.5; }
    
    .buttons { 
      display: flex; 
      gap: 10px; 
      margin-top: 16px;
      flex-wrap: wrap;
    }
    
    /* Enhanced Buttons */
    button { 
      cursor: pointer; 
      background: linear-gradient(135deg, rgba(15, 34, 62, 0.9) 0%, rgba(15, 34, 62, 0.6) 100%);
      border: 1px solid rgba(45, 70, 111, 0.8);
      color: var(--text); 
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    
    button::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    button:hover {
      border-color: var(--accent);
      box-shadow: 0 0 20px var(--accent-glow);
      transform: translateY(-1px);
    }
    
    button:hover::before {
      opacity: 1;
    }
    
    button:active {
      transform: translateY(0);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    /* Status Orbs with Pulse Animation */
    .status-orb {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      position: relative;
      flex-shrink: 0;
    }
    
    .status-orb::before,
    .status-orb::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    .status-orb.healthy {
      background: var(--success);
      box-shadow: 0 0 8px var(--success-glow);
    }
    .status-orb.healthy::before {
      border: 2px solid var(--success);
    }
    
    .status-orb.warning {
      background: var(--warning);
      box-shadow: 0 0 8px var(--warning-glow);
    }
    .status-orb.warning::before {
      border: 2px solid var(--warning);
    }
    
    .status-orb.critical {
      background: var(--critical);
      box-shadow: 0 0 8px var(--critical-glow);
    }
    .status-orb.critical::before {
      border: 2px solid var(--critical);
    }
    
    .status-orb.neutral {
      background: var(--muted);
      box-shadow: none;
    }
    .status-orb.neutral::before,
    .status-orb.neutral::after {
      display: none;
    }
    
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    
    /* Refresh Button Enhancement */
    .refresh-btn {
      background: linear-gradient(135deg, rgba(15, 34, 62, 0.9) 0%, rgba(15, 34, 62, 0.6) 100%);
      border: 1px solid rgba(45, 70, 111, 0.8);
      color: #e8eefc;
      min-width: 160px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13px;
    }
    
    .refresh-btn[data-state="loading"] {
      background: linear-gradient(135deg, rgba(17, 50, 77, 0.9) 0%, rgba(17, 50, 77, 0.6) 100%);
      border-color: var(--accent);
      color: #d5fbf6;
      cursor: wait;
      box-shadow: 0 0 20px var(--accent-glow);
    }
    
    .refresh-btn[data-state="success"] {
      background: linear-gradient(135deg, rgba(7, 36, 25, 0.9) 0%, rgba(7, 36, 25, 0.6) 100%);
      border-color: var(--success);
      color: #dcfce7;
      box-shadow: 0 0 20px var(--success-glow);
    }
    
    .refresh-btn[data-state="error"] {
      background: linear-gradient(135deg, rgba(43, 18, 16, 0.9) 0%, rgba(43, 18, 16, 0.6) 100%);
      border-color: var(--critical);
      color: #fee2e2;
      box-shadow: 0 0 20px var(--critical-glow);
    }
    
    .refresh-icon {
      display: inline-flex;
      width: 16px;
      justify-content: center;
      line-height: 1;
      font-size: 14px;
      transition: transform 0.3s ease;
    }
    
    .refresh-btn:hover .refresh-icon {
      transform: rotate(180deg);
    }
    
    .refresh-spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(79, 209, 197, 0.2);
      border-top-color: var(--accent);
      border-right-color: var(--accent);
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* Skeleton Loading States */
    .skeleton {
      background: linear-gradient(
        90deg,
        rgba(31, 44, 73, 0.4) 25%,
        rgba(31, 44, 73, 0.7) 50%,
        rgba(31, 44, 73, 0.4) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    /* Enhanced KPI Grid */
    .kpi-grid { 
      display: grid; 
      grid-template-columns: repeat(2, minmax(0, 1fr)); 
      gap: 12px; 
      margin-top: 12px; 
    }
    
    .kpi-card { 
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      background: linear-gradient(135deg, rgba(10, 22, 43, 0.8) 0%, rgba(10, 22, 43, 0.4) 100%);
      backdrop-filter: blur(8px);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .kpi-card:hover {
      border-color: rgba(79, 209, 197, 0.3);
      transform: translateY(-2px);
    }
    
    .kpi-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(79, 209, 197, 0.3), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .kpi-card:hover::after {
      opacity: 1;
    }
    
    .kpi-title { 
      color: var(--muted); 
      font-size: 10px; 
      text-transform: uppercase; 
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      font-weight: 600;
    }
    /* Enhanced Ring/Gauge */
    .ring-wrap { display: flex; align-items: center; gap: 12px; }
    .ring-svg { width: 84px; height: 84px; transform: rotate(-90deg); filter: drop-shadow(0 0 8px var(--accent-glow)); }
    .ring-track { fill: none; stroke: rgba(31, 44, 73, 0.5); stroke-width: 10; }
    .ring-progress { 
      fill: none; 
      stroke: url(#ringGradient); 
      stroke-width: 10; 
      stroke-linecap: round; 
      transition: stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1);
      filter: drop-shadow(0 0 4px var(--accent-glow));
    }
    .ring-value { font-size: 22px; font-weight: 700; color: var(--text); font-family: ui-monospace, monospace; }
    
    .gauge-wrap { margin-top: 4px; }
    .gauge-track { 
      position: relative; 
      height: 14px; 
      border-radius: 999px; 
      overflow: hidden; 
      border: 1px solid var(--line);
      background: rgba(10, 22, 43, 0.5);
    }
    .gauge-zone { position: absolute; top: 0; bottom: 0; transition: opacity 0.3s; }
    .gauge-zone-good { left: 0; width: 60%; background: linear-gradient(90deg, rgba(20, 83, 45, 0.8), rgba(34, 197, 94, 0.3)); }
    .gauge-zone-warn { left: 60%; width: 25%; background: linear-gradient(90deg, rgba(124, 45, 18, 0.6), rgba(250, 204, 21, 0.3)); }
    .gauge-zone-bad { left: 85%; width: 15%; background: linear-gradient(90deg, rgba(127, 29, 29, 0.6), rgba(239, 68, 68, 0.4)); }
    .gauge-marker { 
      position: absolute; 
      top: -3px; 
      width: 3px; 
      height: 20px; 
      background: var(--text);
      box-shadow: 0 0 8px rgba(232, 238, 252, 0.5);
      border-radius: 2px;
      transition: left 0.5s ease;
    }
    .gauge-threshold { 
      position: absolute; 
      top: -3px; 
      width: 2px; 
      height: 20px; 
      background: var(--warning);
      box-shadow: 0 0 8px var(--warning-glow);
    }
    .gauge-legend { margin-top: 8px; color: var(--text-secondary); font-size: 11px; }
    
    /* Animated Bar Chart */
    .bar-chart { 
      display: flex; 
      align-items: end; 
      gap: 3px;
      height: 50px;
      padding: 4px 0;
    }
    
    .bar { 
      flex: 1; 
      background: linear-gradient(180deg, var(--accent), rgba(79, 209, 197, 0.3));
      border-radius: 3px 3px 0 0;
      min-height: 4px;
      max-height: 100%;
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
      animation: growUp 0.6s ease-out forwards;
      animation-delay: var(--delay, 0ms);
      opacity: 0;
    }
    
    @keyframes growUp { 
      from { height: 0; opacity: 0; }
      to { height: var(--height); opacity: 1; }
    }
    
    .bar:hover { 
      filter: brightness(1.2);
      box-shadow: 0 0 12px var(--accent-glow);
    }
    
    .bar::after {
      content: attr(data-value);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(17, 26, 45, 0.95);
      color: var(--text);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      border: 1px solid var(--line);
      margin-bottom: 4px;
    }
    
    .bar:hover::after {
      opacity: 1;
    }
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
    /* Enhanced Empty State */
    .empty-state {
      border: 1px dashed rgba(45, 70, 111, 0.6);
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(10, 22, 43, 0.6) 0%, rgba(10, 22, 43, 0.3) 100%);
      backdrop-filter: blur(4px);
      padding: 24px;
      text-align: center;
      color: var(--text-secondary);
      animation: fadeIn 0.5s ease;
    }
    
    .empty-icon { 
      font-size: 32px; 
      display: block; 
      margin-bottom: 12px;
      opacity: 0.8;
    }
    
    .empty-state strong {
      color: var(--text);
      font-weight: 600;
    }
    /* Enhanced Toast Notifications */
    #toastHost { 
      position: fixed; 
      right: 20px; 
      bottom: 20px; 
      z-index: 9999; 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
      pointer-events: none;
    }
    
    .toast {
      pointer-events: auto;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 13px;
      background: linear-gradient(135deg, rgba(15, 34, 62, 0.95) 0%, rgba(15, 34, 62, 0.8) 100%);
      backdrop-filter: blur(12px);
      color: var(--text);
      min-width: 260px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      animation: toastSlide 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    @keyframes toastSlide {
      from { 
        opacity: 0; 
        transform: translateX(20px);
      }
      to { 
        opacity: 1; 
        transform: translateX(0);
      }
    }
    
    .toast-success { 
      border-color: rgba(34, 197, 94, 0.5); 
      background: linear-gradient(135deg, rgba(7, 36, 25, 0.95) 0%, rgba(7, 36, 25, 0.8) 100%);
      color: #dcfce7;
      box-shadow: 0 10px 40px rgba(34, 197, 94, 0.15);
    }
    
    .toast-error { 
      border-color: rgba(239, 68, 68, 0.5); 
      background: linear-gradient(135deg, rgba(43, 18, 16, 0.95) 0%, rgba(43, 18, 16, 0.8) 100%);
      color: #fee2e2;
      box-shadow: 0 10px 40px rgba(239, 68, 68, 0.15);
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; }
    th { color: var(--muted); font-weight: 600; }
    /* Enhanced Code Styling */
    code { 
      color: var(--accent);
      background: rgba(79, 209, 197, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 0.9em;
    }
    
    pre { 
      white-space: pre-wrap; 
      word-break: break-word; 
      background: linear-gradient(135deg, rgba(10, 22, 43, 0.8) 0%, rgba(10, 22, 43, 0.5) 100%);
      border: 1px solid var(--line); 
      padding: 16px; 
      border-radius: 10px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.6;
    }
    /* Enhanced Badges */
    .badge { 
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 999px; 
      padding: 3px 10px; 
      font-size: 11px; 
      font-weight: 600;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    
    .badge:hover {
      transform: translateY(-1px);
    }
    
    .trend-delta {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      font-family: ui-monospace, Menlo, Monaco, monospace;
    }
    .trend-delta-good { color: var(--success); text-shadow: 0 0 10px var(--success-glow); }
    .trend-delta-bad { color: var(--critical); text-shadow: 0 0 10px var(--critical-glow); }
    .trend-delta-neutral { color: #93c5fd; }
    
    .pill-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid transparent;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
      backdrop-filter: blur(4px);
    }
    
    .status-pill:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .status-pill:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.5);
    }
    
    .pill-success { 
      color: #dcfce7; 
      background: linear-gradient(135deg, rgba(20, 83, 45, 0.9) 0%, rgba(20, 83, 45, 0.6) 100%);
      border-color: rgba(34, 197, 94, 0.5);
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
    }
    
    .pill-warning { 
      color: #ffedd5; 
      background: linear-gradient(135deg, rgba(124, 45, 18, 0.9) 0%, rgba(124, 45, 18, 0.6) 100%);
      border-color: rgba(249, 115, 22, 0.5);
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2);
    }
    
    .pill-error { 
      color: #fee2e2; 
      background: linear-gradient(135deg, rgba(127, 29, 29, 0.9) 0%, rgba(127, 29, 29, 0.6) 100%);
      border-color: rgba(239, 68, 68, 0.5);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
    }
    
    .pill-closed { 
      color: #f3e8ff; 
      background: linear-gradient(135deg, rgba(88, 28, 135, 0.9) 0%, rgba(88, 28, 135, 0.6) 100%);
      border-color: rgba(168, 85, 247, 0.5);
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
    }
    
    .status-good { 
      color: var(--success);
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(135deg, rgba(5, 46, 22, 0.8) 0%, rgba(5, 46, 22, 0.4) 100%);
      box-shadow: inset 0 1px 0 rgba(34, 197, 94, 0.1);
    }
    
    .status-warn { 
      color: var(--warning);
      border-color: rgba(250, 204, 21, 0.4);
      background: linear-gradient(135deg, rgba(41, 37, 36, 0.8) 0%, rgba(41, 37, 36, 0.4) 100%);
      box-shadow: inset 0 1px 0 rgba(250, 204, 21, 0.1);
    }
    
    .status-bad { 
      color: var(--error);
      border-color: rgba(249, 115, 22, 0.4);
      background: linear-gradient(135deg, rgba(43, 15, 10, 0.8) 0%, rgba(43, 15, 10, 0.4) 100%);
      box-shadow: inset 0 1px 0 rgba(249, 115, 22, 0.1);
    }
    
    .status-neutral { 
      color: #93c5fd;
      border-color: rgba(30, 58, 138, 0.4);
      background: linear-gradient(135deg, rgba(11, 28, 58, 0.8) 0%, rgba(11, 28, 58, 0.4) 100%);
    }
    
    .vol-zero { color: #93c5fd; border-color: rgba(30, 58, 138, 0.4); background: rgba(11, 28, 58, 0.6); }
    .vol-low { 
      color: var(--success);
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(135deg, rgba(5, 46, 22, 0.6) 0%, rgba(5, 46, 22, 0.3) 100%);
    }
    .vol-medium { 
      color: var(--warning);
      border-color: rgba(250, 204, 21, 0.4);
      background: linear-gradient(135deg, rgba(41, 37, 36, 0.6) 0%, rgba(41, 37, 36, 0.3) 100%);
    }
    .vol-high { 
      color: #f43f5e;
      border-color: rgba(136, 19, 55, 0.4);
      background: linear-gradient(135deg, rgba(42, 9, 18, 0.6) 0%, rgba(42, 9, 18, 0.3) 100%);
    }
    
    .sparkline { 
      font-size: 16px; 
      letter-spacing: 2px;
      color: var(--accent);
      white-space: nowrap;
      text-shadow: 0 0 8px var(--accent-glow);
    }
    .rss-badge { margin-left: 8px; cursor: pointer; }
    /* Skeleton Loading States */
    .skeleton-wrapper {
      padding: 20px;
    }
    
    .skeleton-header {
      height: 28px;
      width: 60%;
      background: linear-gradient(90deg, rgba(31, 44, 73, 0.6) 25%, rgba(31, 44, 73, 0.9) 50%, rgba(31, 44, 73, 0.6) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    
    .skeleton-line {
      height: 12px;
      width: 100%;
      background: linear-gradient(90deg, rgba(31, 44, 73, 0.4) 25%, rgba(31, 44, 73, 0.7) 50%, rgba(31, 44, 73, 0.4) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    
    .skeleton-line:nth-child(2) { width: 80%; animation-delay: 0.1s; }
    .skeleton-line:nth-child(3) { width: 70%; animation-delay: 0.2s; }
    .skeleton-line:nth-child(4) { width: 90%; animation-delay: 0.3s; }
    
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 20px;
    }
    
    .skeleton-card {
      height: 80px;
      background: linear-gradient(90deg, rgba(31, 44, 73, 0.4) 25%, rgba(31, 44, 73, 0.7) 50%, rgba(31, 44, 73, 0.4) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }
    
    .skeleton-card:nth-child(1) { animation-delay: 0.1s; }
    .skeleton-card:nth-child(2) { animation-delay: 0.2s; }
    .skeleton-card:nth-child(3) { animation-delay: 0.3s; }
    .skeleton-card:nth-child(4) { animation-delay: 0.4s; }
    
    /* Data Table Sorting */
    th.sortable {
      cursor: pointer;
      user-select: none;
      position: relative;
      padding-right: 24px;
    }
    
    th.sortable:hover {
      background: rgba(79, 209, 197, 0.05);
    }
    
    th.sortable::after {
      content: '⇅';
      position: absolute;
      right: 8px;
      opacity: 0.3;
      font-size: 10px;
    }
    
    th.sortable.asc::after {
      content: '↑';
      opacity: 1;
      color: var(--accent);
    }
    
    th.sortable.desc::after {
      content: '↓';
      opacity: 1;
      color: var(--accent);
    }
    
    /* Virtual Scroll Container */
    .virtual-scroll {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .virtual-scroll::-webkit-scrollbar {
      width: 8px;
    }
    
    .virtual-scroll::-webkit-scrollbar-track {
      background: rgba(31, 44, 73, 0.3);
      border-radius: 4px;
    }
    
    .virtual-scroll::-webkit-scrollbar-thumb {
      background: rgba(79, 209, 197, 0.3);
      border-radius: 4px;
    }
    
    /* Fullscreen Mode */
    .fullscreen-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(10, 22, 43, 0.8);
      border: 1px solid var(--line);
      color: var(--muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      opacity: 0;
      transition: all 0.2s ease;
    }
    
    .card:hover .fullscreen-btn {
      opacity: 1;
    }
    
    .fullscreen-btn:hover {
      background: var(--accent);
      color: var(--bg);
      border-color: var(--accent);
    }
    
    /* Pulse Animation for Updates */
    .pulse-update {
      animation: pulseUpdate 0.6s ease;
    }
    
    @keyframes pulseUpdate {
      0% { background: rgba(79, 209, 197, 0); }
      50% { background: rgba(79, 209, 197, 0.2); }
      100% { background: rgba(79, 209, 197, 0); }
    }
    
    /* Number Counter Animation */
    .count-up {
      animation: countUp 0.5s ease-out;
    }
    
    @keyframes countUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Sticky Header on Scroll */
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: linear-gradient(180deg, var(--bg) 0%, transparent 100%);
      padding: 12px 0;
      margin: -12px 0;
    }
    
    /* Page Transition */
    .page-transition-enter {
      opacity: 0;
      transform: translateY(20px);
    }
    
    .page-transition-enter-active {
      opacity: 1;
      transform: translateY(0);
      transition: all 0.4s ease;
    }
    
    /* Date Range Picker */
    .date-range-picker {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(10, 22, 43, 0.4);
      border: 1px solid var(--line);
      border-radius: 10px;
      margin-bottom: 16px;
    }
    
    .date-input {
      background: rgba(31, 44, 73, 0.6);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text);
      font-size: 13px;
      font-family: ui-monospace, monospace;
    }
    
    .date-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    /* Range Slider */
    .range-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(31, 44, 73, 0.6);
      outline: none;
      -webkit-appearance: none;
    }
    
    .range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
      box-shadow: 0 0 10px var(--accent-glow);
    }
    
    .range-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px var(--accent-glow);
    }
    
    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: rgba(31, 44, 73, 0.8);
      border-radius: 24px;
      transition: 0.3s;
      border: 1px solid var(--line);
    }
    
    .toggle-slider::before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background: var(--text);
      border-radius: 50%;
      transition: 0.3s;
    }
    
    .toggle-switch input:checked + .toggle-slider {
      background: rgba(79, 209, 197, 0.3);
      border-color: var(--accent);
    }
    
    .toggle-switch input:checked + .toggle-slider::before {
      transform: translateX(20px);
      background: var(--accent);
    }
    
    /* Alert Configuration Panel */
    .alert-config {
      background: rgba(10, 22, 43, 0.4);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .alert-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(31, 44, 73, 0.5);
    }
    
    .alert-row:last-child {
      border-bottom: none;
    }
    
    .alert-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .alert-threshold {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .threshold-input {
      width: 80px;
      padding: 6px 10px;
      background: rgba(31, 44, 73, 0.6);
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--text);
      font-family: ui-monospace, monospace;
      font-size: 13px;
      text-align: center;
    }
    
    .threshold-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    /* Diff View */
    .diff-view {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.6;
    }
    
    .diff-line {
      padding: 2px 8px;
      display: flex;
      gap: 12px;
    }
    
    .diff-added {
      background: rgba(34, 197, 94, 0.15);
      color: var(--success);
    }
    
    .diff-removed {
      background: rgba(239, 68, 68, 0.15);
      color: var(--critical);
    }
    
    .diff-neutral {
      color: var(--muted);
    }
    
    .diff-line-num {
      color: var(--muted);
      min-width: 40px;
      text-align: right;
      user-select: none;
    }
    
    /* Chart Zoom Controls */
    .chart-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .chart-btn {
      padding: 6px 12px;
      font-size: 12px;
      background: rgba(31, 44, 73, 0.6);
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .chart-btn:hover {
      border-color: var(--accent);
      background: rgba(79, 209, 197, 0.1);
    }
    
    .chart-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--bg);
    }
    
    /* Multi-select Dropdown */
    .multi-select {
      position: relative;
      min-width: 150px;
    }
    
    .multi-select-trigger {
      padding: 8px 12px;
      background: rgba(31, 44, 73, 0.6);
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
    }
    
    .multi-select-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 100;
      display: none;
    }
    
    .multi-select.open .multi-select-dropdown {
      display: block;
    }
    
    .multi-option {
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .multi-option:hover {
      background: rgba(79, 209, 197, 0.1);
    }
    
    .multi-option input {
      accent-color: var(--accent);
    }
    
    /* Enhanced Footer */
    .footer { 
      color: var(--muted); 
      font-size: 13px; 
      margin-top: 24px;
      padding: 20px 0;
      border-top: 1px solid var(--line);
    }
    
    .footer-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .footer-links {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .footer a { 
      color: var(--text-secondary);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .footer a:hover { 
      color: var(--accent);
      background: rgba(79, 209, 197, 0.1);
    }
    
    .footer-separator {
      color: var(--line);
      user-select: none;
    }
    
    .footer-meta { 
      color: var(--muted);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mono { font-family: ui-monospace, Menlo, Monaco, monospace; }
    /* Enhanced Tables */
    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--line);
      border-radius: 12px;
      margin-top: 12px;
      background: rgba(10, 22, 43, 0.5);
      backdrop-filter: blur(8px);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .table-scroll::-webkit-scrollbar {
      height: 8px;
      width: 8px;
    }
    
    .table-scroll::-webkit-scrollbar-track {
      background: rgba(31, 44, 73, 0.3);
    }
    
    .table-scroll::-webkit-scrollbar-thumb {
      background: rgba(79, 209, 197, 0.3);
      border-radius: 4px;
    }
    
    .table-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(79, 209, 197, 0.5);
    }
    
    .table-scroll table { margin-top: 0; min-width: 980px; }
    
    table {
      border-collapse: separate;
      border-spacing: 0;
    }
    
    th {
      background: rgba(13, 24, 48, 0.9);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      padding: 12px;
    }
    
    td {
      padding: 10px 12px;
      font-size: 13px;
      border-bottom: 1px solid rgba(31, 44, 73, 0.5);
    }
    
    tr:hover td {
      background: rgba(79, 209, 197, 0.03);
    }
    
    .subdomain-table { font-family: ui-monospace, Menlo, Monaco, monospace; }
    .subdomain-table th, .subdomain-table td { white-space: nowrap; }
    .subdomain-table th:first-child,
    .subdomain-table td:first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      background: linear-gradient(90deg, rgba(13, 24, 48, 1) 0%, rgba(13, 24, 48, 0.95) 100%);
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
    /* Enhanced Overview Tiles */
    .overview-grid { 
      display: grid; 
      grid-template-columns: repeat(5, minmax(0, 1fr)); 
      gap: 12px;
      margin-top: 16px;
    }
    
    .overview-tile { 
      border: 1px solid var(--line);
      background: linear-gradient(135deg, rgba(13, 24, 48, 0.9) 0%, rgba(13, 24, 48, 0.5) 100%);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 14px;
      min-height: 80px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .overview-tile::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
      pointer-events: none;
    }
    
    .overview-tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    
    .overview-label { 
      color: var(--muted); 
      font-size: 10px; 
      text-transform: uppercase; 
      letter-spacing: 0.08em;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .overview-value { 
      margin-top: 8px; 
      font-size: 18px; 
      font-weight: 700;
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    }
    
    .overview-meta { 
      margin-top: 6px; 
      color: var(--text-secondary); 
      font-size: 11px;
    }
    
    .tile-good { 
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(135deg, rgba(7, 36, 25, 0.9) 0%, rgba(7, 36, 25, 0.5) 100%);
      box-shadow: inset 0 1px 0 rgba(34, 197, 94, 0.1);
    }
    .tile-warn { 
      border-color: rgba(250, 204, 21, 0.4);
      background: linear-gradient(135deg, rgba(42, 35, 19, 0.9) 0%, rgba(42, 35, 19, 0.5) 100%);
      box-shadow: inset 0 1px 0 rgba(250, 204, 21, 0.1);
    }
    .tile-bad { 
      border-color: rgba(249, 115, 22, 0.4);
      background: linear-gradient(135deg, rgba(43, 18, 16, 0.9) 0%, rgba(43, 18, 16, 0.5) 100%);
      box-shadow: inset 0 1px 0 rgba(249, 115, 22, 0.1);
    }
    .tile-neutral { 
      border-color: rgba(30, 58, 138, 0.4);
      background: linear-gradient(135deg, rgba(16, 33, 63, 0.9) 0%, rgba(16, 33, 63, 0.5) 100%);
    }
    /* Live Indicator */
    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--muted);
      background: rgba(31, 44, 73, 0.4);
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
    }
    
    .live-dot {
      width: 6px;
      height: 6px;
      background: var(--success);
      border-radius: 50%;
      animation: livePulse 2s ease-in-out infinite;
    }
    
    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    /* Search/Filter Input */
    .search-box {
      position: relative;
      margin-bottom: 16px;
    }
    
    .search-input {
      width: 100%;
      padding: 12px 16px 12px 40px;
      background: rgba(10, 22, 43, 0.6);
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--text);
      font-size: 14px;
      transition: all 0.2s ease;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    
    .search-input::placeholder {
      color: var(--muted);
    }
    
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      font-size: 16px;
    }
    
    /* Filter Pills */
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .filter-pill {
      padding: 6px 12px;
      background: rgba(31, 44, 73, 0.4);
      border: 1px solid var(--line);
      border-radius: 999px;
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .filter-pill:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .filter-pill.active {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--bg);
    }
    
    /* Chart Container */
    .chart-container {
      position: relative;
      height: 200px;
      margin: 16px 0;
      background: rgba(10, 22, 43, 0.3);
      border-radius: 12px;
      border: 1px solid var(--line);
      overflow: hidden;
    }
    
    .chart-canvas {
      width: 100%;
      height: 100%;
    }
    
    /* Multi-metric Chart */
    .multi-chart {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 16px 0;
    }
    
    .chart-box {
      background: rgba(10, 22, 43, 0.3);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .chart-title {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .chart-value {
      font-size: 18px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
    }
    
    /* Radar Chart Container */
    .radar-container {
      width: 200px;
      height: 200px;
      margin: 0 auto;
    }
    
    /* Heatmap Grid */
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
      margin: 16px 0;
    }
    
    .heatmap-cell {
      aspect-ratio: 1;
      border-radius: 3px;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .heatmap-cell:hover {
      transform: scale(1.2);
      z-index: 10;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    
    /* Breadcrumb Navigation */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    .breadcrumb a {
      color: var(--text-secondary);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    
    .breadcrumb a:hover {
      color: var(--accent);
      background: rgba(79, 209, 197, 0.1);
    }
    
    .breadcrumb-separator {
      color: var(--line);
    }
    
    .breadcrumb-current {
      color: var(--text);
      font-weight: 500;
    }
    
    /* Tab Navigation */
    .tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 20px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    
    .tabs::-webkit-scrollbar {
      display: none;
    }
    
    .tab {
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 500;
      color: var(--muted);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .tab:hover {
      color: var(--text);
      background: rgba(79, 209, 197, 0.05);
    }
    
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
      animation: fadeIn 0.3s ease;
    }
    
    /* Keyboard Shortcut Badge */
    .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      padding: 2px 6px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(31, 44, 73, 0.6);
      border: 1px solid var(--line);
      border-radius: 4px;
      box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
    }
    
    /* Drag and Drop Zone */
    .drop-zone {
      border: 2px dashed var(--line);
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      transition: all 0.3s ease;
      background: rgba(10, 22, 43, 0.3);
    }
    
    .drop-zone.drag-over {
      border-color: var(--accent);
      background: rgba(79, 209, 197, 0.1);
      transform: scale(1.02);
    }
    
    .drop-zone-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.6;
    }
    
    /* Loading Spinner Variants */
    .spinner-ring {
      display: inline-block;
      width: 40px;
      height: 40px;
    }
    
    .spinner-ring::after {
      content: '';
      display: block;
      width: 32px;
      height: 32px;
      margin: 4px;
      border-radius: 50%;
      border: 3px solid var(--line);
      border-top-color: var(--accent);
      animation: spin 1s linear infinite;
    }
    
    .spinner-dots {
      display: inline-flex;
      gap: 6px;
    }
    
    .spinner-dots span {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite both;
    }
    
    .spinner-dots span:nth-child(1) { animation-delay: -0.32s; }
    .spinner-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    /* Copy to Clipboard Button */
    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: 11px;
      background: rgba(31, 44, 73, 0.6);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .copy-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .copy-btn.copied {
      background: rgba(34, 197, 94, 0.2);
      border-color: var(--success);
      color: var(--success);
    }
    
    /* Info Box */
    .info-box {
      padding: 16px;
      border-radius: 10px;
      border-left: 3px solid var(--accent);
      background: rgba(79, 209, 197, 0.1);
      margin: 16px 0;
    }
    
    .info-box-title {
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .info-box.warning {
      border-left-color: var(--warning);
      background: rgba(250, 204, 21, 0.1);
    }
    
    .info-box.error {
      border-left-color: var(--error);
      background: rgba(249, 115, 22, 0.1);
    }
    
    .info-box.success {
      border-left-color: var(--success);
      background: rgba(34, 197, 94, 0.1);
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }
    
    .stat-item {
      text-align: center;
      padding: 16px 12px;
      background: rgba(10, 22, 43, 0.4);
      border-radius: 10px;
      border: 1px solid var(--line);
      transition: all 0.2s ease;
    }
    
    .stat-item:hover {
      border-color: rgba(79, 209, 197, 0.3);
      transform: translateY(-2px);
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
      color: var(--text);
      line-height: 1;
    }
    
    .stat-label {
      font-size: 11px;
      color: var(--muted);
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 24px;
    }
    
    .timeline::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(180deg, var(--accent), transparent);
    }
    
    .timeline-item {
      position: relative;
      padding-bottom: 20px;
    }
    
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 4px;
      width: 10px;
      height: 10px;
      background: var(--panel);
      border: 2px solid var(--accent);
      border-radius: 50%;
    }
    
    .timeline-item.success::before { border-color: var(--success); }
    .timeline-item.warning::before { border-color: var(--warning); }
    .timeline-item.error::before { border-color: var(--error); }
    
    .timeline-content {
      background: rgba(10, 22, 43, 0.4);
      border-radius: 8px;
      padding: 12px;
      border: 1px solid var(--line);
    }
    
    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 999;
      animation: fadeIn 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal {
      background: var(--panel);
      backdrop-filter: blur(20px);
      border: 1px solid var(--line);
      border-radius: 16px;
      max-width: 800px;
      width: 90%;
      max-height: 80vh;
      overflow: auto;
      padding: 24px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      animation: modalSlide 0.3s ease;
    }
    
    @keyframes modalSlide {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white !important;
        color: black !important;
      }
      
      .card {
        background: white !important;
        border: 1px solid #ccc !important;
        box-shadow: none !important;
        break-inside: avoid;
      }
      
      .theme-toggle,
      .fab,
      .buttons,
      .collapsible-toggle,
      .status-orb::before,
      .status-orb::after {
        display: none !important;
      }
      
      .collapsible-content {
        max-height: none !important;
      }
      
      h1 {
        background: none !important;
        -webkit-text-fill-color: black !important;
        color: black !important;
      }
      
      table {
        font-size: 10pt;
      }
      
      th {
        background: #f0f0f0 !important;
        color: black !important;
      }
    }
    
    /* Responsive Design */
    @media (max-width: 1200px) {
      main { padding: 20px; }
      .overview-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .theme-toggle { top: 16px; right: 16px; }
    }
    
    @media (max-width: 1000px) {
      .span-8, .span-6, .span-4 { grid-column: span 12; }
      .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .kpi-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
      .metric-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 768px) {
      .metric-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .fab { bottom: 16px; right: 16px; width: 48px; height: 48px; }
      .fab-menu { bottom: 72px; right: 16px; }
    }
    
    @media (max-width: 560px) {
      main { padding: 12px; }
      h1 { font-size: 18px; }
      .overview-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
      .buttons { flex-direction: column; }
      button { width: 100%; }
      .theme-toggle { width: 36px; height: 36px; font-size: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    /* Accessibility */
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    
    /* Focus styles */
    *:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    
    /* Selection */
    ::selection {
      background: rgba(79, 209, 197, 0.3);
      color: var(--text);
    }
    
    /* Enhanced Tooltips */
    [data-tooltip] {
      position: relative;
      cursor: help;
    }
    
    [data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      background: linear-gradient(135deg, rgba(15, 34, 62, 0.98) 0%, rgba(15, 34, 62, 0.9) 100%);
      backdrop-filter: blur(12px);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
      z-index: 1000;
      border: 1px solid var(--line);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      max-width: 280px;
      white-space: normal;
      line-height: 1.5;
    }
    
    [data-tooltip]::before {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-3px);
      border: 6px solid transparent;
      border-top-color: rgba(15, 34, 62, 0.98);
      opacity: 0;
      transition: all 0.2s ease;
    }
    
    [data-tooltip]:hover::after,
    [data-tooltip]:hover::before {
      opacity: 1;
      transform: translateX(-50%) translateY(-4px);
    }
    
    /* Collapsible Sections */
    .collapsible {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: var(--panel);
      backdrop-filter: blur(8px);
      margin-bottom: 16px;
    }
    
    .collapsible-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s ease;
      background: transparent;
    }
    
    .collapsible-header:hover {
      background: rgba(79, 209, 197, 0.05);
    }
    
    .collapsible-header h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    
    .collapsible-toggle {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.3s ease;
      color: var(--muted);
    }
    
    .collapsible.expanded .collapsible-toggle {
      transform: rotate(180deg);
    }
    
    .collapsible-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .collapsible.expanded .collapsible-content {
      max-height: 2000px;
    }
    
    .collapsible-inner {
      padding: 0 20px 20px;
    }
    
    /* Theme Toggle Button */
    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--line);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: all 0.3s ease;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .theme-toggle:hover {
      transform: scale(1.1) rotate(15deg);
      border-color: var(--accent);
      box-shadow: 0 0 20px var(--accent-glow);
    }
    
    /* Mini Charts */
    .mini-chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 30px;
      padding: 4px 0;
    }
    
    .mini-bar {
      flex: 1;
      background: linear-gradient(180deg, var(--accent), transparent);
      border-radius: 1px;
      min-height: 2px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    
    .mini-bar:hover {
      opacity: 1;
    }
    
    /* Floating Action Button */
    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent) 0%, rgba(79, 209, 197, 0.8) 100%);
      color: var(--bg);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 20px var(--accent-glow);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
    }
    
    .fab:hover {
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 8px 30px var(--accent-glow);
    }
    
    .fab-menu {
      position: fixed;
      bottom: 88px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px);
      transition: all 0.3s ease;
    }
    
    .fab-menu.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    
    .fab-item {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--line);
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    
    .fab-item:hover {
      transform: scale(1.1);
      border-color: var(--accent);
      box-shadow: 0 0 15px var(--accent-glow);
    }
    
    /* Trend Indicators */
    .trend-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
    }
    
    .trend-up {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }
    
    .trend-down {
      background: rgba(239, 68, 68, 0.2);
      color: var(--critical);
    }
    
    .trend-flat {
      background: rgba(147, 197, 253, 0.2);
      color: #93c5fd;
    }
    
    /* Progress Bars */
    .progress-bar {
      height: 8px;
      background: rgba(31, 44, 73, 0.5);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .progress-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: shimmer-bar 2s infinite;
    }
    
    @keyframes shimmer-bar {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    /* Loading Skeleton */
    .skeleton-text {
      height: 12px;
      background: linear-gradient(90deg, rgba(31, 44, 73, 0.4) 25%, rgba(31, 44, 73, 0.7) 50%, rgba(31, 44, 73, 0.4) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin: 8px 0;
    }
    
    .skeleton-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(90deg, rgba(31, 44, 73, 0.4) 25%, rgba(31, 44, 73, 0.7) 50%, rgba(31, 44, 73, 0.4) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    
    /* Metric Cards */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .metric-card {
      background: linear-gradient(135deg, rgba(10, 22, 43, 0.6) 0%, rgba(10, 22, 43, 0.3) 100%);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.3s ease;
    }
    
    .metric-card:hover {
      border-color: rgba(79, 209, 197, 0.3);
      transform: translateY(-2px);
    }
    
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    
    .metric-value-large {
      font-size: 28px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
      color: var(--text);
      line-height: 1.2;
    }
    
    .metric-delta {
      font-size: 12px;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    /* Comparison Table */
    .comparison-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
    }
    
    .comparison-row:last-child {
      border-bottom: none;
    }
    
    .comparison-label {
      flex: 1;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .comparison-value {
      font-family: ui-monospace, monospace;
      font-weight: 600;
      font-size: 14px;
    }
    
    .comparison-bar {
      width: 100px;
      height: 6px;
      background: rgba(31, 44, 73, 0.5);
      border-radius: 3px;
      overflow: hidden;
    }
    
    .comparison-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;
    }
    
    /* Data Export Button */
    .export-menu {
      position: relative;
      display: inline-block;
    }
    
    .export-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: var(--panel);
      backdrop-filter: blur(16px);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 8px;
      min-width: 160px;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-10px);
      transition: all 0.2s ease;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      z-index: 100;
    }
    
    .export-menu:hover .export-dropdown {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    
    .export-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
    }
    
    .export-option:hover {
      background: rgba(79, 209, 197, 0.1);
      color: var(--accent);
    }
  </style>
</head>
<body>
  <!-- SVG Definitions -->
  <svg width="0" height="0" style="position:absolute">
    <defs>
      <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4fd1c5;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#2dd4bf;stop-opacity:1" />
      </linearGradient>
    </defs>
  </svg>
  
  <!-- Theme Toggle -->
  <button class="theme-toggle" id="themeToggle" data-tooltip="Toggle dark/light mode" aria-label="Toggle theme">
    <span id="themeIcon">🌙</span>
  </button>
  
  <!-- Floating Action Button -->
  <button class="fab" id="fab" data-tooltip="Quick actions" aria-label="Quick actions menu">
    <span>⚡</span>
  </button>
  <div class="fab-menu" id="fabMenu">
    <button class="fab-item" id="fabExport" data-tooltip="Export JSON" aria-label="Export JSON">📥</button>
    <button class="fab-item" id="fabExportMd" data-tooltip="Export Markdown" aria-label="Export Markdown">📝</button>
    <button class="fab-item" id="fabShare" data-tooltip="Share link" aria-label="Share">🔗</button>
    <button class="fab-item" id="fabHelp" data-tooltip="Keyboard shortcuts (?))" aria-label="Help">❓</button>
    <button class="fab-item" id="fabScrollTop" data-tooltip="Scroll to top" aria-label="Scroll to top">⬆️</button>
  </div>
  
  <!-- Breadcrumb Navigation -->
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#" onclick="window.scrollTo({top:0,behavior:'smooth'});return false">🏠 Dashboard</a>
    <span class="breadcrumb-separator">/</span>
    <a href="#core-status-heading">Core Status</a>
    <span class="breadcrumb-separator">/</span>
    <a href="#domain-registry-heading">Domain</a>
    <span class="breadcrumb-separator">/</span>
    <a href="#storage-heading">Storage</a>
  </nav>
  
  <main>
    <header class="card span-12">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <h1>Search Benchmark Dashboard</h1>
        <div class="live-indicator" id="liveIndicator" style="display:none">
          <span class="live-dot"></span>
          <span>LIVE</span>
        </div>
      </div>
      <div class="meta">
        <span class="status-orb neutral" aria-hidden="true"></span>
        Local reports + optional R2: <code>${r2Label}</code>
        <span id="strictP95Badge" class="badge status-neutral rss-badge">Strict p95 n/a</span>
        <span id="rssBadge" class="badge status-neutral rss-badge">RSS idle</span>
        <span id="connectionStatus" class="badge status-neutral">●</span>
      </div>
      <div class="meta">
        repo=<a href="${buildMeta.repoBranchUrl}" target="_blank" rel="noreferrer">${buildMeta.repoBranchUrl}</a> 
        commit=<a href="${commitUrl}" target="_blank" rel="noreferrer"><code>${buildMeta.commitShort}</code></a>
      </div>
      <div id="reportNotice" class="meta" style="margin-top:8px"></div>
      <nav class="buttons" aria-label="Dashboard actions">
        <button id="loadLocal" title="Load latest local report (Ctrl+1)">
          <span aria-hidden="true">📁</span> Load Local Latest
        </button>
        <button id="loadR2" title="Load latest R2 report (Ctrl+2)">
          <span aria-hidden="true">☁️</span> Load R2 Latest
        </button>
        <button id="loadHistory" title="View report history">
          <span aria-hidden="true">📜</span> Load History
        </button>
        <button id="refreshBtn" class="refresh-btn" data-state="idle" aria-live="polite" aria-label="Refresh dashboard" title="Refresh (Ctrl+R)">
          <span class="refresh-icon" aria-hidden="true">⟳</span>
          <span class="refresh-text">Refresh</span>
        </button>
        <button id="jumpColors" title="Jump to color reference">
          <span aria-hidden="true">🎨</span> Color Reference
        </button>
      </nav>
      <div id="systemStatusPills" class="pill-row" aria-label="System status indicators">
        <span class="status-pill pill-success" role="status" aria-label="All systems operational">
          <span class="status-orb healthy" aria-hidden="true"></span> Operational
        </span>
        <span class="status-pill pill-warning" role="status" aria-label="Attention required">
          <span class="status-orb warning" aria-hidden="true"></span> Attention Needed
        </span>
        <span class="status-pill pill-error" role="status" aria-label="Critical action required">
          <span class="status-orb critical" aria-hidden="true"></span> Critical Action Required
        </span>
        <span class="status-pill pill-closed" role="status" aria-label="Loop closure complete">
          <span aria-hidden="true">✓</span> Loop Status Closed
        </span>
      </div>
      <section class="overview-grid" aria-label="Key metrics overview">
        <article id="tileSnapshot" class="overview-tile tile-neutral">
          <div class="overview-label">
            <span aria-hidden="true">📸</span> Snapshot
          </div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </article>
        <article id="tileLoop" class="overview-tile tile-neutral">
          <div class="overview-label">
            <span aria-hidden="true">🔄</span> Loop
          </div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </article>
        <article id="tileTokens" class="overview-tile tile-neutral">
          <div class="overview-label">
            <span aria-hidden="true">🔐</span> Token Secrets
          </div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </article>
        <article id="tileDomainHealth" class="overview-tile tile-neutral">
          <div class="overview-label">
            <span aria-hidden="true">🌐</span> Domain Health
          </div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </article>
        <article id="tileRss" class="overview-tile tile-neutral">
          <div class="overview-label">
            <span aria-hidden="true">📡</span> RSS
          </div>
          <div class="overview-value">n/a</div>
          <div class="overview-meta">not loaded</div>
        </article>
      </section>
    </header>
    <!-- Settings Panel -->
    <div class="collapsible" id="settingsPanel" style="margin-bottom:16px">
      <div class="collapsible-header" onclick="toggleCollapsible('settingsPanel')">
        <span style="font-size:13px;font-weight:600">⚙️ Dashboard Settings</span>
        <span class="collapsible-toggle">▼</span>
      </div>
      <div class="collapsible-content">
        <div class="collapsible-inner" style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="autoRefreshToggle" checked style="accent-color:var(--accent)">
            Auto-refresh (15s)
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px">
            <span>Refresh interval:</span>
            <select id="refreshInterval" style="background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px">
              <option value="5000">5s</option>
              <option value="10000">10s</option>
              <option value="15000" selected>15s</option>
              <option value="30000">30s</option>
              <option value="60000">1m</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="notificationsToggle" style="accent-color:var(--accent)">
            Desktop notifications
          </label>
          <button id="clearCacheBtn" style="padding:6px 12px;font-size:12px">Clear Cache</button>
        </div>
      </div>
    </div>
    
    <section aria-labelledby="core-status-heading">
      <div class="section-title" id="core-status-heading">Core Status</div>
      <div class="section-subtitle">Benchmark quality, performance trend, and loop-closure alignment.</div>
      <div class="layout">
        <article class="card span-8">
          <div class="collapsible expanded" id="latestSection">
            <div class="collapsible-header" onclick="toggleCollapsible('latestSection')">
              <h2>📊 Latest Snapshot</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="latest" role="region" aria-label="Latest benchmark snapshot data"></div>
              </div>
            </div>
          </div>
        </article>
        <article class="card span-4">
          <div class="collapsible expanded" id="loopSection">
            <div class="collapsible-header" onclick="toggleCollapsible('loopSection')">
              <h2>🔄 Loop & Status Contract</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="loopStatus" role="region" aria-label="Loop closure status"></div>
              </div>
            </div>
          </div>
        </article>
        <article class="card span-12">
          <div class="collapsible expanded" id="trendSection">
            <div class="collapsible-header" onclick="toggleCollapsible('trendSection')">
              <h2>📈 Trend & Coverage</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="trend" role="region" aria-label="Performance trends and coverage metrics"></div>
              </div>
            </div>
          </div>
        </article>
        <article class="card span-12">
          <div class="collapsible expanded" id="historySection">
            <div class="collapsible-header" onclick="toggleCollapsible('historySection')">
              <h2>📜 History</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="history" role="region" aria-label="Benchmark history"></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
    
    <section aria-labelledby="domain-registry-heading">
      <div class="section-title" id="domain-registry-heading">Domain Readiness</div>
      <div class="section-subtitle">Readiness of domain mappings, headers, token secrets, and runtime health.</div>
      <div class="layout">
        <article class="card span-6">
          <div class="collapsible expanded" id="registrySection">
            <div class="collapsible-header" onclick="toggleCollapsible('registrySection')">
              <h2>🌐 Registry Readiness</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="domainRegistryStatus" role="region" aria-label="Domain registry status"></div>
              </div>
            </div>
          </div>
        </article>
        <article class="card span-6">
          <div class="collapsible expanded" id="healthSection">
            <div class="collapsible-header" onclick="toggleCollapsible('healthSection')">
              <h2>💓 Runtime Domain Health</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="domainHealth" role="region" aria-label="Domain health metrics"></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
    
    <section aria-labelledby="storage-heading">
      <div class="section-title" id="storage-heading">Distribution & Feed</div>
      <div class="section-subtitle">Manifest integrity, inventory presence, and RSS publication consistency.</div>
      <div class="layout">
        <article class="card span-6">
          <div class="collapsible expanded" id="publishSection">
            <div class="collapsible-header" onclick="toggleCollapsible('publishSection')">
              <h2>📤 Manifest Integrity</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="publish" role="region" aria-label="Publish manifest details"></div>
              </div>
            </div>
          </div>
        </article>
        <article class="card span-6">
          <div class="collapsible expanded" id="inventorySection">
            <div class="collapsible-header" onclick="toggleCollapsible('inventorySection')">
              <h2>📦 Storage Inventory</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="inventory" role="region" aria-label="R2 inventory listing"></div>
              </div>
            </div>
          </div>
        </article>
        <article class="card span-12">
          <div class="collapsible expanded" id="rssSection">
            <div class="collapsible-header" onclick="toggleCollapsible('rssSection')">
              <h2>📡 RSS Consistency</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <div id="rss" role="region" aria-label="RSS feed content"></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
    <section aria-labelledby="color-ref-heading">
      <div class="section-title" id="color-ref-heading">Color Reference</div>
      <div class="section-subtitle">Dashboard palette and semantic status colors.</div>
      <div class="layout">
        <article class="card span-12">
          <div class="collapsible" id="colorSection">
            <div class="collapsible-header" onclick="toggleCollapsible('colorSection')">
              <h2>🎨 Color Palette</h2>
              <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
              <div class="collapsible-inner">
                <table>
                  <thead>
                    <tr><th>Usage</th><th>Color</th><th>Hex</th><th>Preview</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Background</td><td>Deep Navy</td><td><code>#0B111F</code></td><td><span class="color-preview" style="background:#0B111F;border-color:#1F2C49"></span></td></tr>
                    <tr><td>Panel</td><td>Slate Navy</td><td><code>#111A2D</code></td><td><span class="color-preview" style="background:#111A2D;border-color:#2D466F"></span></td></tr>
                    <tr><td>Primary Text</td><td>Soft White</td><td><code>#E8EEFC</code></td><td><span class="color-preview" style="background:#E8EEFC;border-color:#90A0C4"></span></td></tr>
                    <tr><td>Accent</td><td>Teal</td><td><code>#4FD1C5</code></td><td><span class="color-preview" style="background:#4FD1C5;border-color:#2DD4BF;box-shadow:0 0 10px rgba(79,209,197,0.5)"></span></td></tr>
                    <tr><td>Success</td><td>Green</td><td><code>#22C55E</code></td><td><span class="color-preview" style="background:#22C55E;border-color:#14532D;box-shadow:0 0 10px rgba(34,197,94,0.4)"></span></td></tr>
                    <tr><td>Warning</td><td>Amber</td><td><code>#FACC15</code></td><td><span class="color-preview" style="background:#FACC15;border-color:#713F12;box-shadow:0 0 10px rgba(250,204,21,0.4)"></span></td></tr>
                    <tr><td>Error</td><td>Orange Red</td><td><code>#F97316</code></td><td><span class="color-preview" style="background:#F97316;border-color:#7C2D12;box-shadow:0 0 10px rgba(249,115,22,0.4)"></span></td></tr>
                  </tbody>
                </table>
                <style>
                  .color-preview {
                    display: inline-block;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid;
                    vertical-align: middle;
                  }
                </style>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
    
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="${buildMeta.repoBranchUrl}" target="_blank" rel="noreferrer">
            <span aria-hidden="true">🔗</span> Repository
          </a>
          <span class="footer-separator">·</span>
          <a href="${commitUrl}" target="_blank" rel="noreferrer">
            <span aria-hidden="true">🔖</span> Commit <code>${buildMeta.commitShort}</code>
          </a>
          <span class="footer-separator">·</span>
          <a href="#color-ref-heading">
            <span aria-hidden="true">🎨</span> Colors
          </a>
          <span class="footer-separator">·</span>
          <a href="#api-docs-heading" onclick="showAPIDocs();return false">
            <span aria-hidden="true">📚</span> API Docs
          </a>
        </div>
        <div class="footer-meta">
          <span class="badge status-neutral">v2.0</span>
          Built with <span class="status-orb healthy" style="width:6px;height:6px;display:inline-block;vertical-align:middle"></span> 
          <span style="color:var(--accent)">Bun</span> · 
          <span id="loadTime"></span>
        </div>
      </div>
    </footer>
  </main>
  <div id="toastHost" aria-live="polite" aria-atomic="false"></div>
  <script>
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Non-browser context: skip dashboard boot logic.
    } else {
    const STATUS_LABELS = ${JSON.stringify(statusLabels)};
    const WARNING_STATUS_LEVELS = ${JSON.stringify(warningStatusLevels)};
    const HOT_RELOAD_ENABLED = ${hotReloadEnabled ? 'true' : 'false'};
    const R2_LABEL = ${JSON.stringify(r2Label)};
    const INITIAL_SOURCE = ${JSON.stringify(initialSource)};
    const DEFAULT_DOMAIN = ${JSON.stringify(options.domain || 'factory-wager.com')};
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
    const systemStatusPillsEl = document.getElementById('systemStatusPills');
    let lastHistory = null;
    let previousSnapshot = null;
    let historyVisibleCount = 40;
    let activeSource = readStoredSource() || INITIAL_SOURCE;
    let currentLatestId = null;
    let knownLatestId = null;
    let currentRssGuid = null;
    let knownRssGuid = null;
    
    // Real-time polling state
    let pollingEnabled = true;
    let lastDataTimestamp = Date.now();
    let connectionStatus = 'connected';
    
    // Canvas chart cache
    const chartCache = new Map();
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
      unifiedStatus: 'unknown',
    };
    const applyUnifiedOverview = (unified, latestId, guid) => {
      if (!unified || typeof unified !== 'object') return;
      const overall = String(unified?.overall?.status || 'unknown').toLowerCase();
      const loopClosed = Boolean(unified?.overall?.loopClosed);
      const domain = unified?.domainReadiness || {};
      overviewState.unifiedStatus = overall;
      overviewState.snapshotId = String(latestId || unified?.latestSnapshotId || 'n/a');
      overviewState.loop = loopClosed ? 'closed' : 'open';
      overviewState.loopMeta = String(unified?.overall?.reason || 'n/a');
      const totalDomains = Number(domain?.totalDomains || 0);
      const tokenConfigured = Number(domain?.tokenConfigured || 0);
      const tokenMissing = Number(domain?.tokenMissing || 0);
      overviewState.tokenCoverage = totalDomains > 0 ? (tokenConfigured + '/' + totalDomains) : 'n/a';
      overviewState.tokenMeta = totalDomains > 0 ? (tokenMissing + ' missing') : 'n/a';
      const onlineRows = Number(domain?.onlineRows || 0);
      const checkedRows = Number(domain?.checkedRows || 0);
      overviewState.domainHealth = checkedRows > 0 ? ('online ' + onlineRows + '/' + checkedRows) : 'n/a';
      overviewState.domainHealthMeta = checkedRows > 0 ? ('offline/degraded ' + (checkedRows - onlineRows)) : 'n/a';
      const rssAligned = Boolean(guid && overviewState.snapshotId !== 'n/a' && guid === overviewState.snapshotId);
      overviewState.rss = rssAligned ? 'synced' : (guid ? 'drift' : 'unavailable');
      overviewState.rssMeta = guid ? ('guid ' + guid.slice(0, 16)) : 'guid n/a';
      if (overall === 'fail') {
        setReportNotice(
          '<span class=\"badge status-bad\">Unified status fail</span> <code>' + attrEscape(String(unified?.overall?.reason || 'status failure')) + '</code>',
          'status'
        );
      } else if (overall === 'warn') {
        const domainReasons = Array.isArray(domain?.reasons) ? domain.reasons.join(', ') : 'degraded readiness';
        setReportNotice(
          '<span class=\"badge status-warn\">Unified status warn</span> <code>' + attrEscape(domainReasons) + '</code>',
          'status'
        );
      } else {
        clearReportNotice('status');
      }
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
      if (systemStatusPillsEl) {
        const unified = String(overviewState.unifiedStatus || 'unknown').toLowerCase();
        const leadKind = unified === 'fail' ? 'error' : unified === 'warn' ? 'warning' : 'success';
        systemStatusPillsEl.innerHTML =
          statusPill(leadKind) + statusPill('warning') + statusPill('error') + (overviewState.loop === 'closed' ? statusPill('closed') : '');
      }
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
        success: { cls: 'pill-success', icon: '🟢', label: STATUS_LABELS.success, aria: 'SUCCESS: ' + STATUS_LABELS.success },
        warning: { cls: 'pill-warning status-pill-alert', icon: '🟡', label: STATUS_LABELS.warning, aria: 'WARNING: ' + STATUS_LABELS.warning },
        error: { cls: 'pill-error status-pill-alert', icon: '🔴', label: STATUS_LABELS.error, aria: 'ERROR: ' + STATUS_LABELS.error },
        closed: { cls: 'pill-closed', icon: '✅', label: STATUS_LABELS.closed, aria: 'CLOSED: ' + STATUS_LABELS.closed },
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
      const level = WARNING_STATUS_LEVELS[c] || 'unknown';
      if (level === 'warn') return 'status-warn';
      if (level === 'fail') return 'status-bad';
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
    // Canvas-based sparkline renderer
    const renderSparkline = (canvasId, values, options = {}) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !Array.isArray(values) || values.length === 0) return;
      
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const width = rect.width;
      const height = rect.height;
      const padding = 4;
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, options.color || 'rgba(79, 209, 197, 0.8)');
      gradient.addColorStop(1, 'rgba(79, 209, 197, 0.1)');
      
      // Draw area
      ctx.beginPath();
      ctx.moveTo(0, height);
      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = options.color || '#4fd1c5';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw dots for last value
      if (values.length > 0) {
        const lastX = width;
        const lastY = height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2);
        ctx.beginPath();
        ctx.arc(lastX - 3, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = options.color || '#4fd1c5';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    
    // Render bar chart
    const renderBarChart = (canvasId, data, options = {}) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !Array.isArray(data) || data.length === 0) return;
      
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const width = rect.width;
      const height = rect.height;
      const padding = { top: 20, right: 10, bottom: 30, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      const max = Math.max(...data.map(d => d.value));
      const barWidth = (chartWidth / data.length) * 0.7;
      const barGap = (chartWidth / data.length) * 0.3;
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid lines
      ctx.strokeStyle = 'rgba(31, 44, 73, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }
      
      // Draw bars
      data.forEach((d, i) => {
        const x = padding.left + i * (barWidth + barGap) + barGap / 2;
        const barHeight = (d.value / max) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        
        // Bar gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, d.color || 'var(--accent)');
        gradient.addColorStop(1, 'rgba(79, 209, 197, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Label
        ctx.fillStyle = 'var(--muted)';
        ctx.font = '10px ui-sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label || i + 1, x + barWidth / 2, height - 10);
      });
    };
    
    // Render heatmap
    const renderHeatmap = (containerId, data, options = {}) => {
      const container = document.getElementById(containerId);
      if (!container || !Array.isArray(data)) return;
      
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      
      container.innerHTML = data.map((v, i) => {
        const intensity = (v - min) / range;
        const hue = (1 - intensity) * 120; // Green to red
        const color = 'hsl(' + hue.toFixed(0) + ', 70%, ' + (20 + intensity * 30).toFixed(0) + '%)';
        return '<div class="heatmap-cell" style="background:' + color + '" title="' + (options.labels?.[i] || v) + ': ' + v.toFixed(2) + '"></div>';
      }).join('');
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
      // Color based on score
      const getColor = (s) => {
        if (s >= 80) return ['#22c55e', 'rgba(34, 197, 94, 0.3)'];
        if (s >= 60) return ['#facc15', 'rgba(250, 204, 21, 0.3)'];
        if (s >= 40) return ['#f97316', 'rgba(249, 115, 22, 0.3)'];
        return ['#ef4444', 'rgba(239, 68, 68, 0.3)'];
      };
      const [color, glow] = getColor(n);
      return (
        '<div class="kpi-card">' +
          '<div class="kpi-title">Quality Score</div>' +
          '<div class="ring-wrap">' +
            '<svg class="ring-svg" viewBox="0 0 84 84" role="img" aria-label="Quality score ' + n.toFixed(2) + ' out of 100" style="filter: drop-shadow(0 0 8px ' + glow + ')">' +
              '<defs>' +
                '<linearGradient id="qualityGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
                  '<stop offset="0%" style="stop-color:' + color + '"/>' +
                  '<stop offset="100%" style="stop-color:' + color + ';stop-opacity:0.6"/>' +
                '</linearGradient>' +
              '</defs>' +
              '<circle class="ring-track" cx="42" cy="42" r="' + radius + '"></circle>' +
              '<circle class="ring-progress" cx="42" cy="42" r="' + radius + '" stroke="url(#qualityGrad)" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + c.toFixed(2) + '" style="animation:ringFill 1s ease forwards"></circle>' +
              '<style>@keyframes ringFill { to { stroke-dashoffset: ' + offset.toFixed(2) + '; } }</style>' +
            '</svg>' +
            '<div><div class="ring-value" style="color:' + color + '">' + n.toFixed(2) + '</div><div class="meta">quality / 100</div></div>' +
          '</div>' +
        '</div>'
      );
    };
    
    // Animated Bar Chart for visualizing data
    const barChart = (values, labels) => {
      if (!Array.isArray(values) || values.length === 0) return '';
      const max = Math.max(...values);
      const min = Math.min(...values);
      return (
        '<div class="bar-chart">' +
        values.map((v, i) => {
          const pct = max === min ? 50 : ((v - min) / (max - min)) * 100;
          const delay = i * 80;
          return '<div class="bar" style="--height:' + pct.toFixed(1) + '%;--delay:' + delay + 'ms" data-value="' + (labels?.[i] || v.toFixed(1)) + '" title="' + (labels?.[i] || '') + ': ' + v.toFixed(2) + '"></div>';
        }).join('') +
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
    // Show skeleton loading state
    const showSkeleton = (container) => {
      container.innerHTML = 
        '<div class="skeleton-wrapper">' +
          '<div class="skeleton-header"></div>' +
          '<div class="skeleton-line"></div>' +
          '<div class="skeleton-line"></div>' +
          '<div class="skeleton-line"></div>' +
          '<div class="skeleton-grid">' +
            '<div class="skeleton-card"></div>' +
            '<div class="skeleton-card"></div>' +
            '<div class="skeleton-card"></div>' +
            '<div class="skeleton-card"></div>' +
          '</div>' +
        '</div>';
    };
    
    // Table sorting state
    let tableSortColumn = null;
    let tableSortDirection = 'asc';
    
    const sortTable = (columnIndex, tableSelector) => {
      const table = document.querySelector(tableSelector);
      if (!table) return;
      
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      
      // Toggle direction if same column
      if (tableSortColumn === columnIndex) {
        tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        tableSortColumn = columnIndex;
        tableSortDirection = 'asc';
      }
      
      // Update header classes
      table.querySelectorAll('th').forEach((th, i) => {
        th.classList.remove('asc', 'desc');
        if (i === columnIndex) {
          th.classList.add(tableSortDirection);
        }
      });
      
      // Sort rows
      rows.sort((a, b) => {
        const aVal = a.cells[columnIndex]?.textContent || '';
        const bVal = b.cells[columnIndex]?.textContent || '';
        
        // Try numeric comparison
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return tableSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // String comparison
        return tableSortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
      
      // Re-append sorted rows
      rows.forEach(row => tbody.appendChild(row));
    };
    
    const renderLatest = (data) => {
      if (!data || !Array.isArray(data.rankedProfiles)) {
        latestEl.innerHTML = emptyState('No benchmark data', 'Run a new snapshot to populate latest metrics.', '📉');
        trendEl.innerHTML = emptyState('No trend data', 'Need at least one latest snapshot.', '📊');
        return;
      }
      
      const currentTop = topProfile(data);
      
      // Create mini sparklines for each profile
      const profileMetrics = data.rankedProfiles.map(p => ({
        profile: p.profile,
        quality: Number(p.qualityScore || 0),
        p95: Number(p.latencyP95Ms || 0),
        signal: Number(p.avgSignalPct || 0)
      }));
      
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
          const qualityColor = p.qualityScore >= 80 ? 'var(--success)' : p.qualityScore >= 60 ? 'var(--warning)' : 'var(--error)';
          return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td><strong>' + p.profile + '</strong></td>' +
            '<td style="color:' + qualityColor + '">' + Number(p.qualityScore || 0).toFixed(2) + '</td>' +
            '<td>' + p95.toFixed(0) + 'ms</td>' +
            '<td>' + signalPct.toFixed(1) + '%</td>' +
            '<td>' + uniquePct.toFixed(1) + '%</td>' +
            '<td>' + (slopPct > 0 ? '<span style="color:var(--error)">' + slopPct.toFixed(1) + '%</span>' : slopPct.toFixed(1) + '%') + '</td>' +
            '<td>' + density.toFixed(2) + '</td>' +
            '<td>' + noiseRatio.toFixed(1) + '%</td>' +
            '<td>' + reliability.toFixed(1) + '</td>' +
          '</tr>';
        })()
      ).join('');
      
      // Metric cards for quick overview
      const qualityColor = currentTop?.qualityScore >= 80 ? 'var(--success)' : currentTop?.qualityScore >= 60 ? 'var(--warning)' : 'var(--error)';
      const p95Val = Number(currentTop?.latencyP95Ms || 0);
      const p95Pct = Math.min(100, (p95Val / 1500) * 100);
      const p95Color = p95Val < 800 ? 'var(--success)' : p95Val < 1200 ? 'var(--warning)' : 'var(--error)';
      const signalVal = Number(currentTop?.avgSignalPct || 0);
      const rssVal = Number(currentTop?.peakRssMB || 0);
      const rssPct = Math.min(100, (rssVal / 300) * 100);
      const rssColor = rssVal < 200 ? 'var(--success)' : rssVal < 250 ? 'var(--warning)' : 'var(--error)';
      const miniBars = [1,2,3,4,5].map((_,i) => '<div class="mini-bar" style="height:' + (40 + Math.floor(Math.random() * 60)) + '%"></div>').join('');
      
      const metricCards = 
        '<div class="metric-grid" style="margin-bottom:20px">' +
          '<div class="metric-card" data-tooltip="Overall quality score across all profiles">' +
            '<div class="metric-label">Top Quality</div>' +
            '<div class="metric-value-large" style="color:' + qualityColor + '">' + Number(currentTop?.qualityScore || 0).toFixed(2) + '</div>' +
            '<div class="mini-chart">' + miniBars + '</div>' +
          '</div>' +
          '<div class="metric-card" data-tooltip="P95 latency - lower is better">' +
            '<div class="metric-label">P95 Latency</div>' +
            '<div class="metric-value-large">' + p95Val.toFixed(0) + '<span style="font-size:14px;color:var(--muted)">ms</span></div>' +
            '<div class="progress-bar" style="margin-top:8px">' +
              '<div class="progress-fill" style="width:' + p95Pct + '%;background:' + p95Color + '"></div>' +
            '</div>' +
          '</div>' +
          '<div class="metric-card" data-tooltip="Signal percentage - higher is better">' +
            '<div class="metric-label">Signal Ratio</div>' +
            '<div class="metric-value-large" style="color:var(--success)">' + signalVal.toFixed(1) + '<span style="font-size:14px;color:var(--muted)">%</span></div>' +
            '<div class="progress-bar" style="margin-top:8px">' +
              '<div class="progress-fill" style="width:' + signalVal + '%;background:var(--success)"></div>' +
            '</div>' +
          '</div>' +
          '<div class="metric-card" data-tooltip="Memory usage - RSS in MB">' +
            '<div class="metric-label">Peak RSS</div>' +
            '<div class="metric-value-large">' + rssVal.toFixed(0) + '<span style="font-size:14px;color:var(--muted)">MB</span></div>' +
            '<div class="progress-bar" style="margin-top:8px">' +
              '<div class="progress-fill" style="width:' + rssPct + '%;background:' + rssColor + '"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      
      // Calculate stats
      const stats = {
        totalQueries: (data.queries || []).length,
        avgQuality: data.rankedProfiles.reduce((a, p) => a + Number(p.qualityScore || 0), 0) / data.rankedProfiles.length,
        avgLatency: data.rankedProfiles.reduce((a, p) => a + Number(p.latencyP95Ms || 0), 0) / data.rankedProfiles.length,
        totalProfiles: data.rankedProfiles.length
      };
      
      // Store profiles for comparison
      window.currentProfiles = data.rankedProfiles;
      
      const statsHtml = 
        '<div class="stats-grid" style="margin-bottom:20px">' +
          '<div class="stat-item" data-tooltip="Total number of queries">' +
            '<div class="stat-value">' + stats.totalQueries + '</div>' +
            '<div class="stat-label">Queries</div>' +
          '</div>' +
          '<div class="stat-item" data-tooltip="Average quality score">' +
            '<div class="stat-value" style="color:' + (stats.avgQuality >= 80 ? 'var(--success)' : stats.avgQuality >= 60 ? 'var(--warning)' : 'var(--error)') + '">' + stats.avgQuality.toFixed(1) + '</div>' +
            '<div class="stat-label">Avg Quality</div>' +
          '</div>' +
          '<div class="stat-item" data-tooltip="Average P95 latency">' +
            '<div class="stat-value">' + stats.avgLatency.toFixed(0) + '<span style="font-size:12px">ms</span></div>' +
            '<div class="stat-label">Avg Latency</div>' +
          '</div>' +
          '<div class="stat-item" data-tooltip="Number of profiles tested">' +
            '<div class="stat-value">' + stats.totalProfiles + '</div>' +
            '<div class="stat-label">Profiles</div>' +
          '</div>' +
        '</div>';
      
      // Canvas chart for quality trend across profiles
      const chartHtml = 
        '<div style="margin-bottom:20px">' +
          '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Quality Distribution</div>' +
          '<canvas id="qualityChart" class="chart-canvas" style="width:100%;height:100px;background:rgba(10,22,43,0.3);border-radius:8px"></canvas>' +
        '</div>';

      const gate = data && typeof data.gate === 'object' ? data.gate : null;
      const gateError = typeof data.gateError === 'string' ? data.gateError : '';
      const gatePills = [];
      if (gate && typeof gate.anomalyType === 'string') {
        const gateClass = gate.failures && gate.failures.length > 0
          ? 'pill-error'
          : gate.warnings && gate.warnings.length > 0
            ? 'pill-warning'
            : 'pill-success';
        gatePills.push('<span class="status-pill ' + gateClass + '">🧭 anomaly: ' + gate.anomalyType + '</span>');
      }
      if (gate && Array.isArray(gate.failures) && gate.failures.length > 0) {
        gatePills.push('<span class="status-pill pill-error">🚨 gate fail: ' + gate.failures.join(', ') + '</span>');
      }
      if (gate && Array.isArray(gate.warnings) && gate.warnings.length > 0) {
        gatePills.push('<span class="status-pill pill-warning">⚠️ gate warn: ' + gate.warnings.join(', ') + '</span>');
      }
      if (gateError) {
        gatePills.push('<span class="status-pill pill-warning">⚠️ gate unavailable</span>');
      }
      const gateMetaHtml = gate
        ? '<div class="meta" style="margin:4px 0 12px">gate baseline=' + ((gate.baseline && gate.baseline.snapshot && gate.baseline.snapshot.id) || 'n/a') +
          ' current=' + ((gate.current && gate.current.snapshot && gate.current.snapshot.id) || 'n/a') +
          ' checked=' + (data.gateCheckedAt ? new Date(data.gateCheckedAt).toLocaleString() : 'n/a') + '</div>'
        : gateError
          ? '<div class="meta" style="margin:4px 0 12px">gate error: ' + gateError + '</div>'
          : '';
      
      latestEl.innerHTML =
        '<div class="meta" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">' +
          '<span data-tooltip="Unique snapshot identifier">📸 ' + (data.id || 'n/a') + '</span>' +
          '<span data-tooltip="Creation timestamp">🕐 ' + new Date(data.createdAt).toLocaleString() + '</span>' +
          '<span data-tooltip="Query pack configuration">📦 ' + (data.queryPack || 'core_delivery') + '</span>' +
          '<span data-tooltip="Number of queries executed">🔍 ' + ((data.queries || []).length || 0) + ' queries</span>' +
        '</div>' +
        (Array.isArray(data.warnings) && data.warnings.length > 0 
          ? '<div class="pill-row" style="margin-bottom:16px">' + data.warnings.map(w => '<span class="status-pill pill-warning">⚠️ ' + w + '</span>').join('') + '</div>'
          : '') +
        (gatePills.length > 0
          ? '<div class="pill-row" style="margin-bottom:12px">' + gatePills.join('') + '</div>'
          : '') +
        gateMetaHtml +
        statsHtml +
        metricCards +
        chartHtml +
        '<div class="kpi-grid" style="margin-bottom:20px">' +
          qualityRing(Number(currentTop?.qualityScore || 0)) +
          p95Gauge(Number(currentTop?.latencyP95Ms || 0), asNumOrNull(data?.thresholdsApplied?.strictLatencyP95WarnMs)) +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">' +
          '<button onclick="openComparisonModal(window.currentProfiles)" style="display:flex;align-items:center;gap:6px">' +
            '<span>📊</span> Compare All Profiles' +
          '</button>' +
          '<button onclick="exportData(\'json\')" style="display:flex;align-items:center;gap:6px">' +
            '<span>📥</span> Export JSON' +
          '</button>' +
          '<button onclick="window.print()" style="display:flex;align-items:center;gap:6px">' +
            '<span>🖨️</span> Print Report' +
          '</button>' +
        '</div>' +
        '<div class="table-scroll"><table id="profilesTable"><thead><tr><th class="sortable" onclick="sortTable(0, \'#profilesTable\')">Rank</th><th class="sortable" onclick="sortTable(1, \'#profilesTable\')">Profile</th><th class="sortable" onclick="sortTable(2, \'#profilesTable\')">Quality</th><th class="sortable" onclick="sortTable(3, \'#profilesTable\')">P95</th><th class="sortable" onclick="sortTable(4, \'#profilesTable\')">Signal</th><th class="sortable" onclick="sortTable(5, \'#profilesTable\')">Unique</th><th class="sortable" onclick="sortTable(6, \'#profilesTable\')">Slop</th><th class="sortable" onclick="sortTable(7, \'#profilesTable\')">Density</th><th class="sortable" onclick="sortTable(8, \'#profilesTable\')">Noise</th><th class="sortable" onclick="sortTable(9, \'#profilesTable\')">Reliability</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      
      // Render chart after DOM update
      setTimeout(() => {
        const qualityScores = data.rankedProfiles.map(p => Number(p.qualityScore || 0));
        renderSparkline('qualityChart', qualityScores, { color: '#4fd1c5' });
      }, 0);
      setStrictP95Badge(data);
      checkAlertThresholds(data);
      renderTrend(data, previousSnapshot);
    };
    // Help Modal
    window.showHelpModal = () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal" style="max-width:600px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
            '<h2 style="margin:0">⌨️ Keyboard Shortcuts</h2>' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>' +
          '</div>' +
          '<div style="display:grid;gap:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Refresh dashboard</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">R</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Load Local Latest</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">1</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Load R2 Latest</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">2</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Load History</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">H</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Export Data</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">E</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Toggle Theme</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">T</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Show Performance Metrics</span>' +
              '<span><span class="kbd">Ctrl</span> + <span class="kbd">P</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Show this help</span>' +
              '<span><span class="kbd">?</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(10,22,43,0.4);border-radius:8px">' +
              '<span>Close modal/menu</span>' +
              '<span><span class="kbd">Esc</span></span>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:20px;padding:12px;background:rgba(79,209,197,0.1);border-radius:8px;font-size:12px;color:var(--muted)">' +
            '💡 Tip: You can also click section headers to collapse/expand them' +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };
    
    // API Documentation Modal
    window.showAPIDocs = () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal" style="max-width:700px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
            '<h2 style="margin:0">📚 API Documentation</h2>' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>' +
          '</div>' +
          '<div style="max-height:60vh;overflow:auto">' +
            '<div class="info-box" style="margin-bottom:16px">' +
              '<div class="info-box-title">Base URL</div>' +
              '<div style="font-family:monospace;font-size:13px">' + window.location.origin + '</div>' +
            '</div>' +
            '<h3 style="font-size:14px;margin:16px 0 8px">Endpoints</h3>' +
            '<div style="display:grid;gap:12px">' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/version</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Get dashboard version and features</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/status</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Get server status and uptime</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/dashboard/status</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Stable alias for dashboard status</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--warning)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-warn">GET</span>' +
                  '<code>/api/dashboard/debug</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Dashboard debug payload with R2 session diagnostics</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/latest</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Get the latest benchmark snapshot</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/index</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Get the snapshot index/history</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/rss</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Get the RSS feed</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/api/loop-status</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Get loop closure status</div>' +
              '</div>' +
              '<div style="padding:12px;background:rgba(10,22,43,0.4);border-radius:8px;border-left:3px solid var(--accent)">' +
                '<div style="display:flex;gap:8px;margin-bottom:4px">' +
                  '<span class="badge status-good">GET</span>' +
                  '<code>/healthz</code>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Health check endpoint</div>' +
              '</div>' +
            '</div>' +
            '<h3 style="font-size:14px;margin:16px 0 8px">Query Parameters</h3>' +
            '<table style="font-size:12px">' +
              '<thead><tr><th>Param</th><th>Type</th><th>Description</th></tr></thead>' +
              '<tbody>' +
                '<tr><td><code>source</code></td><td>string</td><td>Data source: "local" or "r2"</td></tr>' +
                '<tr><td><code>id</code></td><td>string</td><td>Snapshot ID for specific data</td></tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };
    
    // Alert configuration
    const alertConfig = {
      qualityThreshold: parseFloat(localStorage.getItem('alertQualityThreshold') || '60'),
      latencyThreshold: parseFloat(localStorage.getItem('alertLatencyThreshold') || '1000'),
      enabled: localStorage.getItem('alertsEnabled') === 'true',
      webhook: localStorage.getItem('alertWebhook') || ''
    };
    
    const checkAlertThresholds = (data) => {
      if (!alertConfig.enabled || !data) return;
      
      const topProfile = data.rankedProfiles?.[0];
      if (!topProfile) return;
      
      const alerts = [];
      
      if (topProfile.qualityScore < alertConfig.qualityThreshold) {
        alerts.push('Quality below ' + alertConfig.qualityThreshold + ': ' + topProfile.qualityScore.toFixed(1));
      }
      
      if (topProfile.latencyP95Ms > alertConfig.latencyThreshold) {
        alerts.push('P95 latency above ' + alertConfig.latencyThreshold + 'ms: ' + topProfile.latencyP95Ms.toFixed(0) + 'ms');
      }
      
      if (alerts.length > 0) {
        showToast('⚠️ ' + alerts.join('; '), 'error', 5000);
      }
    };
    
    window.showAlertConfig = () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal" style="max-width:500px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
            '<h2 style="margin:0">🔔 Alert Configuration</h2>' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>' +
          '</div>' +
          '<div class="alert-config">' +
            '<div class="alert-row">' +
              '<span class="alert-label">Enable Alerts</span>' +
              '<label class="toggle-switch">' +
                '<input type="checkbox" id="alertEnabledToggle" ' + (alertConfig.enabled ? 'checked' : '') + '>' +
                '<span class="toggle-slider"></span>' +
              '</label>' +
            '</div>' +
            '<div class="alert-row">' +
              '<span class="alert-label">Quality Threshold</span>' +
              '<div class="alert-threshold">' +
                '<input type="range" class="range-slider" id="qualitySlider" min="0" max="100" value="' + alertConfig.qualityThreshold + '" style="width:100px">' +
                '<input type="number" class="threshold-input" id="qualityThreshold" value="' + alertConfig.qualityThreshold + '" min="0" max="100">' +
              '</div>' +
            '</div>' +
            '<div class="alert-row">' +
              '<span class="alert-label">Latency Threshold (ms)</span>' +
              '<div class="alert-threshold">' +
                '<input type="range" class="range-slider" id="latencySlider" min="100" max="3000" value="' + alertConfig.latencyThreshold + '" style="width:100px">' +
                '<input type="number" class="threshold-input" id="latencyThreshold" value="' + alertConfig.latencyThreshold + '" min="100" max="3000">' +
              '</div>' +
            '</div>' +
            '<div class="alert-row" style="flex-direction:column;align-items:flex-start;gap:8px">' +
              '<span class="alert-label">Webhook URL (optional)</span>' +
              '<input type="text" id="webhookUrl" value="' + alertConfig.webhook + '" placeholder="https://hooks.slack.com/..." style="width:100%;padding:8px 12px;background:rgba(31,44,73,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);font-size:13px">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end">' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
            '<button id="saveAlertConfig" style="background:var(--accent);color:var(--bg);border-color:var(--accent)">Save</button>' +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
      
      // Sync sliders with inputs
      const qualitySlider = document.getElementById('qualitySlider');
      const qualityInput = document.getElementById('qualityThreshold');
      const latencySlider = document.getElementById('latencySlider');
      const latencyInput = document.getElementById('latencyThreshold');
      
      qualitySlider.oninput = () => qualityInput.value = qualitySlider.value;
      qualityInput.oninput = () => qualitySlider.value = qualityInput.value;
      latencySlider.oninput = () => latencyInput.value = latencySlider.value;
      latencyInput.oninput = () => latencySlider.value = latencyInput.value;
      
      document.getElementById('saveAlertConfig').onclick = () => {
        alertConfig.enabled = document.getElementById('alertEnabledToggle').checked;
        alertConfig.qualityThreshold = parseFloat(qualityInput.value);
        alertConfig.latencyThreshold = parseFloat(latencyInput.value);
        alertConfig.webhook = document.getElementById('webhookUrl').value;
        
        localStorage.setItem('alertsEnabled', alertConfig.enabled);
        localStorage.setItem('alertQualityThreshold', alertConfig.qualityThreshold);
        localStorage.setItem('alertLatencyThreshold', alertConfig.latencyThreshold);
        localStorage.setItem('alertWebhook', alertConfig.webhook);
        
        showToast('Alert configuration saved', 'success');
        modal.remove();
      };
      
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };
    
    // Profile comparison modal
    let comparisonModalOpen = false;
    
    const openComparisonModal = (profiles) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal" style="background:var(--panel);backdrop-filter:blur(20px);border:1px solid var(--line);border-radius:16px;max-width:800px;width:90%;max-height:80vh;overflow:auto;padding:24px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1000;box-shadow:0 25px 50px rgba(0,0,0,0.5)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
            '<h2 style="margin:0">Profile Comparison</h2>' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>' +
          '</div>' +
          '<div class="comparison-content">' +
            profiles.map((p, i) => 
              '<div style="margin-bottom:20px;padding:16px;background:rgba(10,22,43,0.4);border-radius:12px;border:1px solid var(--line)">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
                  '<h3 style="margin:0;color:' + (p.qualityScore >= 80 ? 'var(--success)' : p.qualityScore >= 60 ? 'var(--warning)' : 'var(--error)') + '">' + p.profile + '</h3>' +
                  '<span class="badge ' + (p.qualityScore >= 80 ? 'status-good' : p.qualityScore >= 60 ? 'status-warn' : 'status-bad') + '">' + p.qualityScore.toFixed(1) + '</span>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;font-size:12px">' +
                  '<div><div style="color:var(--muted)">P95 Latency</div><div style="font-size:16px;font-weight:600;font-family:monospace">' + p.latencyP95Ms.toFixed(0) + 'ms</div></div>' +
                  '<div><div style="color:var(--muted)">Signal</div><div style="font-size:16px;font-weight:600;font-family:monospace">' + p.avgSignalPct.toFixed(1) + '%</div></div>' +
                  '<div><div style="color:var(--muted)">RSS</div><div style="font-size:16px;font-weight:600;font-family:monospace">' + p.peakRssMB.toFixed(0) + 'MB</div></div>' +
                '</div>' +
                '<canvas id="profileChart' + i + '" style="width:100%;height:60px;margin-top:12px"></canvas>' +
              '</div>'
            ).join('') +
          '</div>' +
        '</div>' +
        '<style>.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999;animation:fadeIn 0.2s}</style>';
      
      document.body.appendChild(modal);
      
      // Render mini charts
      setTimeout(() => {
        profiles.forEach((p, i) => {
          const canvas = document.getElementById('profileChart' + i);
          if (canvas) {
            const values = [p.qualityScore, p.avgSignalPct, 100 - p.avgSlopPct, p.avgUniqueFamilyPct];
            renderSparkline(canvas.id, values, { color: p.qualityScore >= 80 ? '#22c55e' : p.qualityScore >= 60 ? '#facc15' : '#f97316' });
          }
        });
      }, 0);
      
      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };
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
        ? latest.warnings
            .map((code) => String(code || '').toLowerCase())
            .filter((code) => (WARNING_STATUS_LEVELS[code] || 'unknown') !== 'unknown')
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

      // Visual trend indicators with progress bars
      const makeTrendVisual = (m) => {
        const pct = m.current !== null ? Math.min(100, (m.current / m.max) * 100) : 0;
        const color = m.invert 
          ? (pct < 40 ? 'var(--success)' : pct < 70 ? 'var(--warning)' : 'var(--error)')
          : (pct > 80 ? 'var(--success)' : pct > 60 ? 'var(--warning)' : 'var(--error)');
        const trend = m.current !== null && m.prev !== null 
          ? (m.current > m.prev ? '↑' : m.current < m.prev ? '↓' : '→')
          : '';
        const trendClass = m.current !== null && m.prev !== null 
          ? (m.invert 
              ? (m.current < m.prev ? 'trend-up' : m.current > m.prev ? 'trend-down' : 'trend-flat')
              : (m.current > m.prev ? 'trend-up' : m.current < m.prev ? 'trend-down' : 'trend-flat'))
          : 'trend-flat';
        return '<div class="comparison-row">' +
            '<div class="comparison-label">' + m.label + '</div>' +
            '<div class="comparison-bar">' +
              '<div class="comparison-fill" style="width:' + pct.toFixed(1) + '%;background:' + color + '"></div>' +
            '</div>' +
            '<div class="comparison-value">' +
              '<span class="trend-arrow ' + trendClass + '">' + trend + '</span>' +
              (m.current !== null ? m.current.toFixed(m.max === 100 ? 1 : 0) : '-') +
            '</div>' +
          '</div>';
      };
      
      const trendMetrics = [
        { label: 'Quality', current: currentQuality, prev: previousQuality, delta: qualityDelta, max: 100, invert: false },
        { label: 'P95 Latency', current: strictP95Current, prev: strictP95Previous, delta: strictP95Delta, max: 1500, invert: true },
        { label: 'Signal %', current: currentSignal, prev: previousSignal, delta: null, max: 100, invert: false },
        { label: 'Reliability', current: currentReliability, prev: previousReliability, delta: reliabilityDelta, max: 100, invert: false }
      ];
      const trendVisuals = trendMetrics.map(makeTrendVisual).join('');
      
      trendEl.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">' +
          '<div>' +
            '<h3 style="font-size:13px;color:var(--muted);margin-bottom:12px">Performance Comparison</h3>' +
            trendVisuals +
          '</div>' +
          '<div>' +
            '<h3 style="font-size:13px;color:var(--muted);margin-bottom:12px">Core Loop Status</h3>' +
            '<div class="pill-row" style="margin-bottom:12px">' +
              statusPill(coreLoopWarnings.length > 0 ? 'warning' : closed ? 'closed' : 'error') +
            '</div>' +
            '<div style="font-size:12px;color:var(--text-secondary);line-height:1.8">' +
              '<div>Baseline: ' + baselineText + '</div>' +
              '<div>Core Loop: ' + coreLoopSummary + '</div>' +
              (coreLoopWarnings.length ? '<div style="color:var(--error);margin-top:8px">⚠️ ' + coreLoopWarnings.join(', ') + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<table><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Delta</th><th>Status</th><th>Volatility</th></tr></thead><tbody>' +
          '<tr><td>Path</td><td><code>' + currentPath + '</code></td><td><code>' + previousPath + '</code></td><td>-</td><td>' + statusBadge(pathStatus(currentPath, previousPath)) + '</td><td>' + volatilityEmojiBadge('Low', 'Path') + '</td></tr>' +
          '<tr><td>Queries</td><td>' + currentQueries + '</td><td>' + (previousQueries === null ? 'n/a' : previousQueries) + '</td><td>' + (queriesDelta === null ? '-' : queriesDelta) + '</td><td>' + statusBadge(queriesStatus) + '</td><td>' + volatilityEmojiBadge(queriesVol, 'Queries') + '</td></tr>' +
          '<tr><td>Top Quality</td><td>' + qualityCurrentText + '</td><td>' + qualityPrevText + '</td><td>' + trendDeltaIndicator(qualityDelta, '', 'higher_is_better', 'Top quality') + '</td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityEmojiBadge(qualityVol, 'Top quality') + '</td></tr>' +
          '<tr><td data-tooltip="P95 latency - lower is better">Strict p95</td><td>' + strictP95CurrentText + '</td><td>' + strictP95PrevText + '</td><td>' + trendDeltaIndicator(strictP95Delta, 'ms', 'lower_is_better', 'Strict p95') + '</td><td>' + statusBadge(strictP95Status) + '</td><td>' + volatilityEmojiBadge(strictP95Vol, 'Strict p95') + '</td></tr>' +
          '<tr><td data-tooltip="Heap usage - lower is better">Strict Heap</td><td>' + strictHeapCurrentText + '</td><td>' + strictHeapPrevText + '</td><td>' + trendDeltaIndicator(strictHeapDelta, 'MB', 'lower_is_better', 'Strict Heap') + '</td><td>' + statusBadge(strictHeapStatus) + '</td><td>' + volatilityEmojiBadge(strictHeapVol, 'Strict Heap') + '</td></tr>' +
          '<tr><td data-tooltip="RSS memory - lower is better">Strict RSS</td><td>' + strictRssCurrentText + '</td><td>' + strictRssPrevText + '</td><td>' + trendDeltaIndicator(strictRssDelta, 'MB', 'lower_is_better', 'Strict RSS') + '</td><td>' + statusBadge(strictRssStatus) + '</td><td>' + volatilityEmojiBadge(strictRssVol, 'Strict RSS') + '</td></tr>' +
          '<tr><td>Quality Trend</td><td colspan="2"><span class="sparkline">' + qualitySpark + '</span></td><td></td><td>' + statusBadge(qualityStatus) + '</td><td>' + volatilityEmojiBadge(classifyStdVolatility(qualityStdev), 'Trend volatility') + '</td></tr>' +
          '<tr><td>Family Coverage</td><td>' + familyCurrentText + '</td><td>' + familyPrevText + '</td><td>' + trendDeltaIndicator(familyDelta, '%', 'higher_is_better', 'Family coverage') + '</td><td>' + statusBadge(familyStatus) + '</td><td>' + volatilityEmojiBadge(familyVol, 'Family coverage') + '</td></tr>' +
          '<tr><td>Slop Average</td><td>' + slopCurrentText + '</td><td>' + slopPrevText + '</td><td>' + trendDeltaIndicator(slopDelta, '%', 'lower_is_better', 'Slop') + '</td><td>' + statusBadge(slopStatus) + '</td><td>' + volatilityEmojiBadge(slopVol, 'Slop') + '</td></tr>' +
          '<tr><td>Query Coverage</td><td>' + qcovCurrentText + '</td><td>' + qcovPrevText + '</td><td>' + trendDeltaIndicator(queryCoverageDelta, '%', 'higher_is_better', 'Query coverage') + '</td><td>' + statusBadge(qcovStatus) + '</td><td>' + volatilityEmojiBadge(qcovVol, 'Query coverage') + '</td></tr>' +
          '<tr><td>Noise Ratio</td><td>' + noiseCurrentText + '</td><td>' + noisePrevText + '</td><td>' + trendDeltaIndicator(noiseDelta, '%', 'lower_is_better', 'Noise') + '</td><td>' + statusBadge(noiseStatus) + '</td><td>' + volatilityEmojiBadge(noiseVol, 'Noise') + '</td></tr>' +
          '<tr><td>Reliability</td><td>' + relCurrentText + '</td><td>' + relPrevText + '</td><td>' + trendDeltaIndicator(reliabilityDelta, '', 'higher_is_better', 'Reliability') + '</td><td>' + statusBadge(relStatus) + '</td><td>' + volatilityEmojiBadge(relVol, 'Reliability') + '</td></tr>' +
        '</tbody></table>';
    };
    // Search/filter functionality
    let historyFilter = '';
    let historyFilterPack = 'all';
    
    const filterHistory = (snapshots) => {
      if (!Array.isArray(snapshots)) return [];
      return snapshots.filter(s => {
        const matchesSearch = !historyFilter || 
          s.id.toLowerCase().includes(historyFilter.toLowerCase()) ||
          (s.queryPack || '').toLowerCase().includes(historyFilter.toLowerCase()) ||
          (s.topProfile || '').toLowerCase().includes(historyFilter.toLowerCase());
        const matchesPack = historyFilterPack === 'all' || (s.queryPack || 'core_delivery') === historyFilterPack;
        
        // Date range filtering
        let matchesDateRange = true;
        if (dateRangeStart || dateRangeEnd) {
          const snapshotDate = new Date(s.createdAt);
          if (dateRangeStart && snapshotDate < dateRangeStart) matchesDateRange = false;
          if (dateRangeEnd && snapshotDate > dateRangeEnd) matchesDateRange = false;
        }
        
        return matchesSearch && matchesPack && matchesDateRange;
      });
    };
    
    const renderHistory = (data) => {
      if (!data || !Array.isArray(data.snapshots)) {
        historyEl.innerHTML = emptyState('No history index', 'History appears empty or unavailable.', '🗂️');
        lastHistory = null;
        return;
      }
      lastHistory = data;
      
      // Get unique query packs for filter
      const packs = [...new Set(data.snapshots.map(s => s.queryPack || 'core_delivery'))];
      
      const filtered = filterHistory(data.snapshots);
      const slice = filtered.slice(0, historyVisibleCount);
      
      const rows = slice.map((s, idx) =>
        '<tr>' +
          '<td><code>' + s.id + '</code></td>' +
          '<td>' + new Date(s.createdAt).toLocaleString() + '</td>' +
          '<td><span class="badge status-neutral">' + (s.queryPack || 'core_delivery') + '</span></td>' +
          '<td>' + s.topProfile + '</td>' +
          '<td style="color:' + (s.topScore >= 80 ? 'var(--success)' : s.topScore >= 60 ? 'var(--warning)' : 'var(--error)') + '">' + Number(s.topScore || 0).toFixed(2) + '</td>' +
          '<td>' +
            '<button class="copy-btn" onclick="copyToClipboard(\'' + s.id + '\', this)" style="margin-right:4px">ID</button>' +
            (idx < slice.length - 1 ? '<button class="copy-btn" onclick="showDiffView(window.lastHistory.snapshots[' + idx + '], window.lastHistory.snapshots[' + (idx + 1) + '])">Compare</button>' : '') +
          '</td>' +
        '</tr>'
      ).join('');
      
      const hasMore = filtered.length > historyVisibleCount;
      
      const savedStart = localStorage.getItem('dateRangeStart') || '';
      const savedEnd = localStorage.getItem('dateRangeEnd') || '';
      
      historyEl.innerHTML =
        '<div class="search-box">' +
          '<span class="search-icon">🔍</span>' +
          '<input type="text" class="search-input" id="historySearch" placeholder="Search snapshots..." value="' + historyFilter + '">' +
        '</div>' +
        '<div class="date-range-picker" style="margin-bottom:16px">' +
          '<span style="font-size:12px;color:var(--muted);white-space:nowrap">📅 Date Range:</span>' +
          '<input type="datetime-local" class="date-input" id="dateRangeStart" value="' + savedStart + '">' +
          '<span style="color:var(--muted)">→</span>' +
          '<input type="datetime-local" class="date-input" id="dateRangeEnd" value="' + savedEnd + '">' +
          '<button onclick="applyDateFilter()" style="padding:6px 12px;font-size:12px">Apply</button>' +
          '<button onclick="clearDateFilter()" style="padding:6px 12px;font-size:12px;background:transparent">Clear</button>' +
        '</div>' +
        '<div class="filter-row">' +
          '<span class="filter-pill ' + (historyFilterPack === 'all' ? 'active' : '') + '" data-pack="all">All</span>' +
          packs.map(p => '<span class="filter-pill ' + (historyFilterPack === p ? 'active' : '') + '" data-pack="' + p + '">' + p + '</span>').join('') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<div class="meta">showing ' + slice.length + '/' + filtered.length + ' of ' + data.snapshots.length + ' total</div>' +
          '<button onclick="showAlertConfig()" style="display:flex;align-items:center;gap:6px;font-size:12px;padding:6px 12px">' +
            '<span>🔔</span> Configure Alerts' +
          '</button>' +
        '</div>' +
        '<div class="table-scroll"><table><thead><tr><th>Snapshot</th><th>Created</th><th>Query Pack</th><th>Top Profile</th><th>Top Score</th><th>Actions</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No matching snapshots</td></tr>') + '</tbody></table></div>' +
        (hasMore ? '<div style="margin-top:8px"><button id="historyMore">Load more</button></div>' : '');
      
      // Attach event listeners
      const searchInput = document.getElementById('historySearch');
      if (searchInput) {
        searchInput.oninput = (e) => {
          historyFilter = e.target.value;
          historyVisibleCount = 40;
          renderHistory(data);
        };
      }
      
      document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.onclick = () => {
          historyFilterPack = pill.dataset.pack;
          historyVisibleCount = 40;
          renderHistory(data);
        };
      });
      
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
        rssEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📡</span><div><strong>RSS Feed Unavailable</strong></div><div style="margin-top:4px">No feed data or source not configured</div></div>';
        return;
      }
      try {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        const items = Array.from(doc.querySelectorAll('item')).slice(0, 10);
        const latestGuid = items[0]?.querySelector('guid')?.textContent || items[0]?.querySelector('link')?.textContent || null;
        if (latestGuid && !currentRssGuid) currentRssGuid = latestGuid;
        if (latestGuid && !knownRssGuid) knownRssGuid = latestGuid;
        
        const rows = items.map((item, idx) => {
          const title = item.querySelector('title')?.textContent || 'untitled';
          const pubDate = item.querySelector('pubDate')?.textContent || 'n/a';
          const link = item.querySelector('link')?.textContent || '#';
          const pubDateObj = new Date(pubDate);
          const timeAgoText = isNaN(pubDateObj) ? 'unknown' : timeAgo(pubDateObj);
          const isLatest = idx === 0;
          
          return '<tr style="' + (isLatest ? 'background:rgba(79,209,197,0.05)' : '') + '">' +
            '<td><span style="font-weight:' + (isLatest ? '600' : '400') + '">' + title + '</span>' + (isLatest ? ' <span class="badge status-good">latest</span>' : '') + '</td>' +
            '<td><span data-tooltip="' + pubDate + '">' + timeAgoText + '</span></td>' +
            '<td>' +
              '<a href="' + link + '" target="_blank" rel="noreferrer" style="margin-right:8px">open ↗</a>' +
              '<button class="copy-btn" onclick="copyToClipboard(\'' + link + '\', this)">copy</button>' +
            '</td>' +
          '</tr>';
        }).join('');
        
        const itemCount = items.length;
        const feedTitle = doc.querySelector('channel > title')?.textContent || 'RSS Feed';
        
        const rssHeader = 
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
            '<div>' +
              '<div style="font-size:16px;font-weight:600;margin-bottom:4px">' + feedTitle + '</div>' +
              '<div class="meta">' + itemCount + ' items · source: <code>' + source + '</code></div>' +
            '</div>' +
            '<div class="pill-row" style="margin:0">' +
              '<button class="copy-btn" onclick="copyToClipboard(\'' + (meta?.rssUrl || '') + '\', this)">' +
                '<span>📋</span> Copy Feed URL' +
              '</button>' +
              '<a href="/api/rss?source=' + source + '" target="_blank" class="badge status-neutral" style="text-decoration:none">View Raw ↗</a>' +
            '</div>' +
          '</div>';
        
        const rssMeta = meta && !meta.error
          ? '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;font-size:12px;color:var(--muted)">' +
              '<span data-tooltip="Storage bucket">📦 ' + (meta.bucket || 'n/a') + '</span>' +
              '<span data-tooltip="RSS file path">📄 ' + (meta.rssKey || 'n/a').split('/').pop() + '</span>' +
            '</div>'
          : '';
          
        rssEl.innerHTML = rssHeader + rssMeta +
          '<div class="table-scroll"><table><thead><tr><th>Title</th><th>When</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      } catch (err) {
        rssEl.innerHTML = '<div class="info-box error"><div class="info-box-title">❌ RSS Parse Error</div><div style="font-size:12px">' + (err?.message || 'Invalid feed content') + '</div></div>';
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
    // Copy to clipboard utility
    window.copyToClipboard = async (text, btn) => {
      try {
        await navigator.clipboard.writeText(text);
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = '✓ Copied';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
          }, 2000);
        }
        showToast('Copied to clipboard', 'success');
      } catch (err) {
        showToast('Failed to copy', 'error');
      }
    };
    
    // Tab switching
    window.switchTab = (tabId, contentId) => {
      // Remove active from all tabs and content
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active to selected
      document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
      document.getElementById(contentId).classList.add('active');
      
      // Save preference
      localStorage.setItem('activeTab_' + tabId.split('-')[0], contentId);
    };
    
    // Drag and drop for file upload
    const setupDragAndDrop = () => {
      const dropZones = document.querySelectorAll('.drop-zone');
      
      dropZones.forEach(zone => {
        zone.ondragover = (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        };
        
        zone.ondragleave = () => {
          zone.classList.remove('drag-over');
        };
        
        zone.ondrop = (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');
          
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            handleDroppedFile(files[0]);
          }
        };
      });
    };
    
    const handleDroppedFile = (file) => {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            showToast('Loaded: ' + file.name, 'success');
            // Could process the file here
          } catch (err) {
            showToast('Invalid JSON file', 'error');
          }
        };
        reader.readAsText(file);
      } else {
        showToast('Please drop a JSON file', 'error');
      }
    };
    
    // Format bytes utility
    const formatBytes = (bytes, decimals = 2) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    };
    
    // Format duration
    const formatDuration = (ms) => {
      if (ms < 1000) return ms.toFixed(0) + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
      return (ms / 60000).toFixed(1) + 'm';
    };
    
    // Relative time formatter
    const timeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
      };
      
      for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
          return interval + ' ' + unit + (interval > 1 ? 's' : '') + ' ago';
        }
      }
      return 'just now';
    };
    
    // Diff view between two snapshots
    window.showDiffView = (current, previous) => {
      if (!current || !previous) {
        showToast('Need two snapshots to compare', 'error');
        return;
      }
      
      const diffData = [];
      const metrics = ['qualityScore', 'latencyP95Ms', 'avgSignalPct', 'avgSlopPct', 'peakRssMB'];
      
      current.rankedProfiles.forEach((curr, idx) => {
        const prev = previous.rankedProfiles?.[p => p.profile === curr.profile];
        if (prev) {
          metrics.forEach(metric => {
            const currVal = curr[metric];
            const prevVal = prev[metric];
            const change = currVal - prevVal;
            const pctChange = prevVal !== 0 ? ((change / prevVal) * 100).toFixed(1) : 'N/A';
            
            diffData.push({
              profile: curr.profile,
              metric: metric,
              current: currVal,
              previous: prevVal,
              change: change,
              pctChange: pctChange,
              improved: (metric === 'qualityScore' || metric === 'avgSignalPct') ? change > 0 : change < 0
            });
          });
        }
      });
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal" style="max-width:700px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
            '<h2 style="margin:0">📊 Snapshot Comparison</h2>' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>' +
          '</div>' +
          '<div style="margin-bottom:16px;font-size:12px;color:var(--muted)">' +
            'Comparing: <code>' + current.id + '</code> vs <code>' + previous.id + '</code>' +
          '</div>' +
          '<div class="diff-view" style="max-height:400px;overflow:auto">' +
            diffData.map(d => {
              const sign = d.change > 0 ? '+' : '';
              const color = d.improved ? 'var(--success)' : d.change !== 0 ? 'var(--error)' : 'var(--muted)';
              return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-family:monospace;font-size:12px">' +
                '<span>' + d.profile + ' <span style="color:var(--muted)">' + d.metric + '</span></span>' +
                '<span>' +
                  '<span style="color:var(--muted)">' + d.previous.toFixed(1) + '</span> → ' +
                  '<span style="color:' + color + '">' + d.current.toFixed(1) + '</span>' +
                  '<span style="color:' + color + ';margin-left:8px">(' + sign + d.pctChange + '%)</span>' +
                '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };
    
    // Date range filtering
    let dateRangeStart = null;
    let dateRangeEnd = null;
    
    window.applyDateFilter = () => {
      const startInput = document.getElementById('dateRangeStart');
      const endInput = document.getElementById('dateRangeEnd');
      
      dateRangeStart = startInput?.value ? new Date(startInput.value) : null;
      dateRangeEnd = endInput?.value ? new Date(endInput.value) : null;
      
      localStorage.setItem('dateRangeStart', startInput?.value || '');
      localStorage.setItem('dateRangeEnd', endInput?.value || '');
      
      // Re-render history with filter
      if (lastHistory) {
        renderHistory(lastHistory);
      }
      
      showToast('Date filter applied', 'success');
    };
    
    window.clearDateFilter = () => {
      dateRangeStart = null;
      dateRangeEnd = null;
      localStorage.removeItem('dateRangeStart');
      localStorage.removeItem('dateRangeEnd');
      
      const startInput = document.getElementById('dateRangeStart');
      const endInput = document.getElementById('dateRangeEnd');
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      
      if (lastHistory) {
        renderHistory(lastHistory);
      }
      
      showToast('Date filter cleared', 'success');
    };
    
    // Collapsible sections toggle
    window.toggleCollapsible = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('expanded');
        // Save state to localStorage
        const isExpanded = el.classList.contains('expanded');
        const savedStates = JSON.parse(localStorage.getItem('collapsibleStates') || '{}');
        savedStates[id] = isExpanded;
        localStorage.setItem('collapsibleStates', JSON.stringify(savedStates));
      }
    };
    
    // Restore collapsible states
    const restoreCollapsibleStates = () => {
      const savedStates = JSON.parse(localStorage.getItem('collapsibleStates') || '{}');
      Object.entries(savedStates).forEach(([id, isExpanded]) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.toggle('expanded', isExpanded);
        }
      });
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
      updateConnectionStatus('connected');
    };
    
    // Connection status management
    const updateConnectionStatus = (status) => {
      connectionStatus = status;
      const statusEl = document.getElementById('connectionStatus');
      const liveEl = document.getElementById('liveIndicator');
      if (!statusEl) return;
      
      if (status === 'connected') {
        statusEl.className = 'badge status-good';
        statusEl.textContent = '●';
        statusEl.setAttribute('data-tooltip', 'Connected');
        if (liveEl) liveEl.style.display = 'inline-flex';
      } else if (status === 'polling') {
        statusEl.className = 'badge status-neutral';
        statusEl.textContent = '◐';
        statusEl.setAttribute('data-tooltip', 'Polling...');
      } else if (status === 'error') {
        statusEl.className = 'badge status-bad';
        statusEl.textContent = '●';
        statusEl.setAttribute('data-tooltip', 'Connection error');
        if (liveEl) liveEl.style.display = 'none';
      } else if (status === 'offline') {
        statusEl.className = 'badge status-warn';
        statusEl.textContent = '○';
        statusEl.setAttribute('data-tooltip', 'Offline mode');
        if (liveEl) liveEl.style.display = 'none';
      }
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
    
    // Error recovery and circuit breaker
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    let circuitOpen = false;
    let circuitResetTimer = null;
    
    const recordError = () => {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        openCircuit();
      }
    };
    
    const recordSuccess = () => {
      consecutiveErrors = 0;
      if (circuitOpen) {
        closeCircuit();
      }
    };
    
    const openCircuit = () => {
      circuitOpen = true;
      updateConnectionStatus('error');
      showToast('Too many errors. Pausing auto-refresh for 60s.', 'error', 5000);
      
      // Stop auto-refresh
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
      
      // Auto-reset after 60s
      circuitResetTimer = setTimeout(() => {
        closeCircuit();
      }, 60000);
    };
    
    const closeCircuit = () => {
      circuitOpen = false;
      consecutiveErrors = 0;
      if (circuitResetTimer) {
        clearTimeout(circuitResetTimer);
        circuitResetTimer = null;
      }
      updateConnectionStatus('connected');
      showToast('Auto-refresh resumed', 'success');
      updateAutoRefresh();
    };
    
    // Safe fetch with error handling
    const safeFetch = async (url, options = {}) => {
      if (circuitOpen) {
        throw new Error('Circuit breaker is open');
      }
      
      try {
        const res = await fetch(url, options);
        recordSuccess();
        return res;
      } catch (err) {
        recordError();
        throw err;
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
        if (!idx || !Array.isArray(idx.snapshots) || idx.snapshots.length === 0) return false;
        const latestId = idx.snapshots[0].id;
        if (!knownLatestId) {
          knownLatestId = latestId;
        }
        if (!currentLatestId) {
          currentLatestId = latestId;
          knownLatestId = latestId;
          return false;
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
          knownLatestId = latestId;
          return true;
        } else if (latestId === knownLatestId) {
          clearReportNotice('updates');
        }
        knownLatestId = latestId;
        return false;
      } catch {
        // ignore polling errors; dashboard remains usable
        return false;
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
      const unified = await fetchJson('/api/search-status-unified?source=local&domain=' + encodeURIComponent(DEFAULT_DOMAIN));
      const rssMeta = await fetchJson('/api/rss-meta?source=local');
      const rssRes = await fetch('/api/rss?source=local', { credentials: 'same-origin', cache: 'no-store' });
      const rssText = await rssRes.text();
      renderRss(rssText, 'local', rssMeta);
      const guid = parseLatestRssGuid(rssText);
      applyUnifiedOverview(unified, latestData?.id || null, guid);
      renderOverview();
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
    
    // Performance monitoring
    const perfMetrics = {
      loadTimes: [],
      renderTimes: [],
      errorCount: 0,
      lastLoadTime: null
    };
    
    const recordPerformance = (type, duration) => {
      if (type === 'load') {
        perfMetrics.loadTimes.push(duration);
        perfMetrics.lastLoadTime = duration;
        // Keep only last 10 measurements
        if (perfMetrics.loadTimes.length > 10) {
          perfMetrics.loadTimes.shift();
        }
      } else if (type === 'render') {
        perfMetrics.renderTimes.push(duration);
        if (perfMetrics.renderTimes.length > 10) {
          perfMetrics.renderTimes.shift();
        }
      }
    };
    
    window.showPerformanceMetrics = () => {
      const avgLoad = perfMetrics.loadTimes.length > 0 
        ? (perfMetrics.loadTimes.reduce((a, b) => a + b, 0) / perfMetrics.loadTimes.length).toFixed(0)
        : 'N/A';
      const avgRender = perfMetrics.renderTimes.length > 0
        ? (perfMetrics.renderTimes.reduce((a, b) => a + b, 0) / perfMetrics.renderTimes.length).toFixed(0)
        : 'N/A';
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal" style="max-width:500px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
            '<h2 style="margin:0">📊 Performance Metrics</h2>' +
            '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>' +
          '</div>' +
          '<div class="stats-grid" style="margin-bottom:16px">' +
            '<div class="stat-item">' +
              '<div class="stat-value">' + avgLoad + '</div>' +
              '<div class="stat-label">Avg Load (ms)</div>' +
            '</div>' +
            '<div class="stat-item">' +
              '<div class="stat-value">' + avgRender + '</div>' +
              '<div class="stat-label">Avg Render (ms)</div>' +
            '</div>' +
            '<div class="stat-item">' +
              '<div class="stat-value">' + perfMetrics.errorCount + '</div>' +
              '<div class="stat-label">Errors</div>' +
            '</div>' +
            '<div class="stat-item">' +
              '<div class="stat-value">' + perfMetrics.loadTimes.length + '</div>' +
              '<div class="stat-label">Samples</div>' +
            '</div>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--muted)">' +
            '<div>Last load: ' + (perfMetrics.lastLoadTime ? perfMetrics.lastLoadTime + 'ms' : 'N/A') + '</div>' +
            '<div style="margin-top:8px">Recent loads: ' + perfMetrics.loadTimes.slice(-5).join(', ') + ' ms</div>' +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };
    
    async function loadLatest(source, opts = {}) {
      const loadStart = performance.now();
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
        const unified = await fetchJson('/api/search-status-unified?source=' + source + '&domain=' + encodeURIComponent(DEFAULT_DOMAIN));
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
        overviewState.queryPack = String(data?.queryPack || 'n/a');
        applyUnifiedOverview(unified, data?.id || null, guid);
        renderOverview();
        
        // Record performance metrics
        const loadEnd = performance.now();
        recordPerformance('load', loadEnd - loadStart);
        
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
        const unified = await fetchJson('/api/search-status-unified?source=local&domain=' + encodeURIComponent(DEFAULT_DOMAIN));
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
        overviewState.queryPack = String(latestData?.queryPack || 'n/a');
        applyUnifiedOverview(unified, latestData?.id || null, guid);
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
    
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const storedTheme = localStorage.getItem('searchBenchTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    
    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
      localStorage.setItem('searchBenchTheme', theme);
    };
    
    applyTheme(currentTheme);
    
    themeToggle.onclick = () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
      showToast('Theme: ' + (currentTheme === 'dark' ? 'Dark' : 'Light') + ' mode', 'success', 2000);
    };
    
    // Floating Action Button
    const fab = document.getElementById('fab');
    const fabMenu = document.getElementById('fabMenu');
    let fabOpen = false;
    
    fab.onclick = () => {
      fabOpen = !fabOpen;
      fabMenu.classList.toggle('open', fabOpen);
      fab.style.transform = fabOpen ? 'rotate(45deg)' : 'rotate(0)';
    };
    
    document.getElementById('fabScrollTop').onclick = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fab.click();
    };
    
    // Fullscreen toggle
    window.toggleFullscreen = (elementId) => {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      if (!document.fullscreenElement) {
        element.requestFullscreen().catch(err => {
          showToast('Error entering fullscreen: ' + err.message, 'error');
        });
      } else {
        document.exitFullscreen();
      }
    };
    
    // Animate number counting
    const animateNumber = (element, start, end, duration = 500) => {
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * easeProgress;
        
        if (element) {
          element.textContent = Number(current).toFixed(2);
          element.classList.add('count-up');
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    };
    
    // Export functionality
    const exportData = async (format) => {
      const latestData = lastHistory?.snapshots?.[0];
      const data = {
        snapshot: currentLatestId,
        timestamp: new Date().toISOString(),
        source: activeSource,
        overview: overviewState,
        details: latestData
      };
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'benchmark-' + currentLatestId + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported as JSON', 'success');
      } else if (format === 'csv') {
        let csv = 'Metric,Value,Unit\n';
        csv += 'Snapshot,' + currentLatestId + ',\n';
        csv += 'Timestamp,' + data.timestamp + ',\n';
        csv += 'Source,' + activeSource + ',\n';
        csv += 'Quality Score,' + (latestData?.topScore || 0) + ',\n';
        csv += 'Query Pack,' + (latestData?.queryPack || 'core_delivery') + ',\n';
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'benchmark-' + currentLatestId + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported as CSV', 'success');
      } else if (format === 'markdown') {
        let md = '# Benchmark Report\n\n';
        md += '**Snapshot:** ' + currentLatestId + '\n\n';
        md += '**Generated:** ' + new Date().toLocaleString() + '\n\n';
        md += '**Source:** ' + activeSource + '\n\n';
        md += '## Overview\n\n';
        md += '| Metric | Value |\n';
        md += '|--------|-------|\n';
        md += '| Snapshot | ' + overviewState.snapshotId + ' |\n';
        md += '| Loop Status | ' + overviewState.loop + ' |\n';
        md += '| Token Coverage | ' + overviewState.tokenCoverage + ' |\n';
        md += '| Domain Health | ' + overviewState.domainHealth + ' |\n';
        md += '| RSS Status | ' + overviewState.rss + ' |\n\n';
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'benchmark-' + currentLatestId + '.md';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported as Markdown', 'success');
      }
    };
    
    document.getElementById('fabExport').onclick = () => {
      exportData('json');
      fab.click();
    };
    
    const fabExportMd = document.getElementById('fabExportMd');
    if (fabExportMd) {
      fabExportMd.onclick = () => {
        exportData('markdown');
        fab.click();
      };
    }
    
    const fabHelp = document.getElementById('fabHelp');
    if (fabHelp) {
      fabHelp.onclick = () => {
        showHelpModal();
        fab.click();
      };
    }
    
    document.getElementById('fabShare').onclick = () => {
      const url = window.location.href;
      navigator.clipboard?.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('URL: ' + url, 'success', 4000);
      });
      fab.click();
    };
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'r':
            e.preventDefault();
            refreshBtnEl?.click();
            break;
          case '1':
            e.preventDefault();
            loadLatest('local');
            break;
          case '2':
            e.preventDefault();
            loadLatest('r2');
            break;
          case 'h':
            e.preventDefault();
            loadHistory();
            break;
          case 'e':
            e.preventDefault();
            exportData('json');
            break;
          case 't':
            e.preventDefault();
            themeToggle.click();
            break;
          case 'p':
            e.preventDefault();
            showPerformanceMetrics();
            break;
        }
      }
      if (e.key === 'Escape' && fabOpen) {
        fab.click();
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        showHelpModal();
      }
    });
    
    window.addEventListener('offline', () => {
      updateConnectionStatus('offline');
      setReportNotice('<span class="badge status-bad"><span class="status-orb critical" style="width:8px;height:8px;display:inline-block;vertical-align:middle;margin-right:4px"></span>Offline</span> <code>Network unavailable; showing last known data.</code>', 'network');
      showToast('Offline mode: using cached dashboard state', 'error', 3600);
    });
    window.addEventListener('online', () => {
      updateConnectionStatus('connected');
      clearReportNotice('network');
      showToast('Back online. Refreshing dashboard...', 'success', 2200);
      loadLatest(activeSource || INITIAL_SOURCE);
    });
    document.getElementById('jumpColors').onclick = () => {
      const el = document.getElementById('color-ref-heading');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    rssBadgeEl.onclick = () => loadLatest(activeSource);
    // Settings management
    let autoRefreshEnabled = localStorage.getItem('autoRefresh') !== 'false';
    let refreshIntervalMs = parseInt(localStorage.getItem('refreshInterval') || '15000');
    let notificationsEnabled = localStorage.getItem('notifications') === 'true';
    let autoRefreshTimer = null;
    
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    const refreshIntervalSelect = document.getElementById('refreshInterval');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    
    if (autoRefreshToggle) {
      autoRefreshToggle.checked = autoRefreshEnabled;
      autoRefreshToggle.onchange = (e) => {
        autoRefreshEnabled = e.target.checked;
        localStorage.setItem('autoRefresh', autoRefreshEnabled);
        updateAutoRefresh();
        showToast(autoRefreshEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled', 'success');
      };
    }
    
    if (refreshIntervalSelect) {
      refreshIntervalSelect.value = String(refreshIntervalMs);
      refreshIntervalSelect.onchange = (e) => {
        refreshIntervalMs = parseInt(e.target.value);
        localStorage.setItem('refreshInterval', String(refreshIntervalMs));
        updateAutoRefresh();
        showToast('Refresh interval: ' + (refreshIntervalMs / 1000) + 's', 'success');
      };
    }
    
    if (notificationsToggle) {
      notificationsToggle.checked = notificationsEnabled;
      notificationsToggle.onchange = (e) => {
        notificationsEnabled = e.target.checked;
        localStorage.setItem('notifications', notificationsEnabled);
        if (notificationsEnabled && 'Notification' in window) {
          Notification.requestPermission();
        }
        showToast(notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled', 'success');
      };
    }
    
    if (clearCacheBtn) {
      clearCacheBtn.onclick = () => {
        localStorage.removeItem('searchBenchActiveSource');
        localStorage.removeItem('collapsibleStates');
        sessionStorage.clear();
        showToast('Cache cleared', 'success');
        setTimeout(() => location.reload(), 1000);
      };
    }
    
    const updateAutoRefresh = () => {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
      if (autoRefreshEnabled) {
        autoRefreshTimer = setInterval(() => {
          checkForNewReports();
          checkForNewRssItems();
        }, refreshIntervalMs);
      }
    };
    
    const showNotification = (title, body) => {
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '📊',
          badge: '📊'
        });
      }
    };
    
    // Override checkForNewReports to show notifications
    const originalCheckForNewReports = checkForNewReports;
    checkForNewReports = async () => {
      const hadUpdate = await originalCheckForNewReports();
      if (hadUpdate) {
        showNotification('New Report Available', 'A new benchmark report is ready to view.');
      }
    };
    
    // Display load time
    const loadTimeEl = document.getElementById('loadTime');
    if (loadTimeEl) {
      const perf = performance.timing;
      const loadTime = perf.loadEventEnd - perf.navigationStart;
      loadTimeEl.textContent = 'Loaded in ' + loadTime + 'ms';
    }
    
    renderOverview();
    setRefreshIdle();
    restoreCollapsibleStates();
    setupDragAndDrop();
    updateAutoRefresh();
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

  return jsonResponse(
    { error: 'r2_fetch_failed', message: 'Failed to fetch R2 JSON via base URL', target: targets[1], tried: targets },
    { status: 502, source: 'r2' }
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

    return jsonResponse(
      {
        error: 'r2_get_failed',
        message: 'Failed to fetch R2 object via signed request',
        bucket: r2.bucket,
        tried: keys,
      },
      { status: 502, source: 'r2' }
    );
  } catch (error) {
    return jsonResponse(
      {
        error: 'r2_read_failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502, source: 'r2' }
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
  return jsonResponse(
    { error: 'r2_not_configured', message: 'R2 not configured', hint: 'set R2_* creds or --r2-base' },
    { status: 400, source: 'none' }
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
  const buildMeta = await resolveBuildMeta();
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

  const canonicalBaselinePath = resolve('.search/search-benchmark-pinned-baseline.json');
  let latestGateCache:
    | { source: 'local' | 'r2'; snapshotId: string; payload: CompareResultPayload; checkedAt: string }
    | { source: 'local' | 'r2'; snapshotId: string; error: string; checkedAt: string }
    | null = null;

  const enrichLatestWithGate = async (
    payload: LatestApiPayload,
    source: 'local' | 'r2'
  ): Promise<LatestApiPayload> => {
    const snapshotId = String(payload.id || '').trim();
    const checkedAt = new Date().toISOString();
    const base: LatestApiPayload = {
      ...payload,
      gateCheckedAt: checkedAt,
      warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    };

    if (!snapshotId) {
      return { ...base, gateError: 'missing_snapshot_id' };
    }

    if (latestGateCache && latestGateCache.snapshotId === snapshotId && latestGateCache.source === source) {
      if ('payload' in latestGateCache) {
        return {
          ...base,
          gate: latestGateCache.payload,
          gateCheckedAt: latestGateCache.checkedAt,
        };
      }
      return {
        ...base,
        gateError: latestGateCache.error,
        gateCheckedAt: latestGateCache.checkedAt,
      };
    }

    try {
      const gate =
        source === 'r2'
          ? await compareSnapshotPayload(payload as Snapshot, undefined, canonicalBaselinePath, false, 'r2:latest.json')
          : await comparePayload(latestJson, undefined, canonicalBaselinePath);
      latestGateCache = { source, snapshotId, payload: gate, checkedAt };
      return { ...base, gate, gateCheckedAt: checkedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      latestGateCache = { source, snapshotId, error: message, checkedAt };
      return { ...base, gateError: message, gateCheckedAt: checkedAt };
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
        return jsonResponse(
          {
            ok: true,
            service: 'search-benchmark-dashboard',
            uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
            now: new Date().toISOString(),
            port: options.port,
          },
          { source: 'mixed' }
        );
      }
      if (url.pathname === '/api/status' || url.pathname === '/api/dashboard/status') {
        return jsonResponse(
          {
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
          },
          { source: 'mixed' }
        );
      }
      if (url.pathname === '/api/version') {
        return jsonResponse(
          {
            version: '2.0.0',
            name: 'search-benchmark-dashboard',
            description: 'Real-time benchmark performance monitoring',
            features: [
              'glassmorphism-ui',
              'dark-light-theme',
              'canvas-charts',
              'real-time-polling',
              'alert-configuration',
              'data-export',
              'keyboard-shortcuts',
              'performance-monitoring',
              'circuit-breaker',
            ],
            repository: buildMeta.repoUrl,
            commit: buildMeta.commitShort,
            buildTime: new Date(startedAt).toISOString(),
          },
          { source: 'local' }
        );
      }
      if (url.pathname === '/api/debug/r2-sessions' || url.pathname === '/api/dashboard/debug') {
        try {
          const prefix = url.searchParams.get('prefix') || 'sessions/';
          const limit = Number.parseInt(url.searchParams.get('limit') || '3', 10);
          const data = await buildR2SessionsDebugSummary(prefix, limit);
          if (url.pathname === '/api/dashboard/debug') {
            return jsonResponse(
              {
                ok: true,
                service: 'search-benchmark-dashboard',
                checkedAt: new Date().toISOString(),
                domain: options.domain,
                debug: {
                  route: '/api/dashboard/debug',
                  sessionsRoute: '/api/debug/r2-sessions',
                },
                r2: {
                  configured: Boolean(resolveR2ReadOptions()),
                  base: options.r2Base || null,
                  sessions: data,
                },
              },
              { source: 'mixed' }
            );
          }
          return jsonResponse(data, { source: 'r2' });
        } catch (error) {
          return jsonResponse(
            {
              error: 'r2_debug_failed',
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500, source: 'r2' }
          );
        }
      }
      if (url.pathname === '/api/latest') {
        const source = url.searchParams.get('source') || 'local';
        if (source === 'r2') {
          const remote = await getCachedRemoteJson('r2:latest', 'latest.json');
          if (!remote.ok) return remote;
          try {
            const latest = await remote.json() as LatestApiPayload;
            const enriched = await enrichLatestWithGate(latest, 'r2');
            return jsonResponse(enriched, { source: 'r2' });
          } catch (error) {
            return jsonResponse(
              {
                error: 'invalid_json',
                message: error instanceof Error ? error.message : String(error),
                path: 'r2:latest.json',
              },
              { status: 500, source: 'r2' }
            );
          }
        }
        if (!existsSync(latestJson)) {
          return jsonResponse(
            {
              error: 'not_found',
              message: `Resource not found: ${latestJson}`,
              path: latestJson,
            },
            { status: 404, source: 'local' }
          );
        }
        try {
          const latest = await Bun.file(latestJson).json() as LatestApiPayload;
          const enriched = await enrichLatestWithGate(latest, 'local');
          return jsonResponse(enriched, { source: 'local' });
        } catch (error) {
          return jsonResponse(
            {
              error: 'invalid_json',
              message: error instanceof Error ? error.message : String(error),
              path: latestJson,
            },
            { status: 500, source: 'local' }
          );
        }
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
          return jsonResponse({ error: 'missing_id', message: 'Query param `id` is required.' }, { status: 400, source: source === 'r2' ? 'r2' : 'local' });
        }
        if (source === 'r2') {
          const r2Snapshot = await getCachedRemoteJson(`r2:snapshot:${id}`, `${id}/snapshot.json`);
          if (optional && !r2Snapshot.ok) {
            return jsonResponse(
              {
                missing: true,
                source: 'r2',
                id,
                status: r2Snapshot.status,
              },
              { status: 200, source: 'r2' }
            );
          }
          return r2Snapshot;
        }
        const localSnapshotPath = resolve(dir, id, 'snapshot.json');
        if (optional && !existsSync(localSnapshotPath)) {
          return jsonResponse(
            {
              missing: true,
              source: 'local',
              id,
              status: 404,
            },
            { status: 200, source: 'local' }
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
            return jsonResponse(
              { error: 'manifest_not_found', message: 'No snapshot id available for publish manifest.', reason: 'no_snapshot_id' },
              { status: 404, source: 'r2' }
            );
          }
          return getCachedRemoteJson(`r2:manifest:${targetId}`, `${targetId}/publish-manifest.json`);
        }
        const localManifestPath = await resolveLocalManifestPath(id);
        if (!localManifestPath) {
          return jsonResponse(
            { error: 'manifest_not_found', message: 'No local snapshot id available for publish manifest.', reason: 'no_snapshot_id' },
            { status: 404, source: 'local' }
          );
        }
        return readLocalJson(localManifestPath);
      }
      if (url.pathname === '/api/r2-inventory') {
        const source = (url.searchParams.get('source') || 'local') as 'local' | 'r2';
        const id = url.searchParams.get('id');
        if (source === 'r2') {
          const data = await buildInventoryR2(id);
          return jsonResponse(data, { source: 'r2' });
        }
        const data = await buildInventoryLocal(id);
        return jsonResponse(data, { source: 'local' });
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
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-search-status-source': source,
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
        return new Response(JSON.stringify(data, null, 2), { headers });
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
          return jsonResponse(payload, { source: 'local' });
        } catch (error) {
          return jsonResponse(
            {
              error: 'domain_registry_status_failed',
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500, source: 'local' }
          );
        }
      }
      if (url.pathname === '/api/search-status-unified') {
        const source = (url.searchParams.get('source') || 'local') as 'local' | 'r2';
        const domain = (url.searchParams.get('domain') || options.domain || 'factory-wager.com').trim().toLowerCase();
        try {
          const payload = await buildUnifiedStatus({
            json: true,
            strict: false,
            source,
            domain,
            latestPath: 'reports/search-benchmark/latest.json',
            loopPath: 'reports/search-loop-status-latest.json',
            rssPath: 'reports/search-benchmark/rss.xml',
          });
          return jsonResponse(payload, { source });
        } catch (error) {
          return jsonResponse(
            {
              error: 'unified_status_failed',
              message: error instanceof Error ? error.message : String(error),
              source,
              domain,
            },
            { status: 500, source }
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
          return jsonResponse(
            { error: 'r2_not_configured', message: 'R2 not configured for RSS route', hint: 'set R2_* creds or --r2-base' },
            { status: 400, source: 'r2' }
          );
        }
        if (!existsSync(rssXml)) {
          return jsonResponse(
            { error: 'rss_not_found', message: `RSS feed not found: ${rssXml}`, path: rssXml },
            { status: 404, source: 'local' }
          );
        }
        return new Response(await Bun.file(rssXml).text(), {
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      }
      if (url.pathname === '/api/rss-meta') {
        const source = (url.searchParams.get('source') || 'local') as 'local' | 'r2';
        const meta = await buildRssStorageSummary(source);
        return jsonResponse(meta, { source });
      }
      if (url.pathname === '/api/loop-status') {
        const source = url.searchParams.get('source') || 'local';
        if (source !== 'local') {
          return jsonResponse(
            { error: 'loop_status_local_only', message: 'Loop status endpoint currently supports local source only.', source },
            { status: 400, source: 'local' }
          );
        }
        if (!existsSync(loopStatusJson)) {
          return jsonResponse(
            { error: 'not_found', message: `Loop status file missing: ${loopStatusJson}`, path: loopStatusJson },
            { status: 404, source: 'local' }
          );
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
        const freshnessWindowMinutes = LOOP_FRESHNESS_WINDOW_MINUTES;
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
        raw.loopClosed = isLoopClosedByPolicy(stages as any).loopClosed;
        raw.loopClosedReason = formatLoopClosedReason(stages as any);
        return jsonResponse(raw, { source: 'local' });
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

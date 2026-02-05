#!/usr/bin/env bun

import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {existsSync, watch} from 'node:fs';
import {join, extname} from 'node:path';
import { InputValidator, CommonSchemas, ValidationMiddleware } from '../../lib/input-validation.ts';
import { Logger, LoggerFactory, LoggingMiddleware, LogLevel } from '../../lib/logging-monitoring.ts';

// ============================================================================
// ERROR SANITIZATION UTILITIES
// ============================================================================

interface SanitizedError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  requestId?: string;
}

class ErrorHandler {
  private static isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG === '1';
  
  /**
   * Sanitize error for client response
   */
  static sanitize(error: unknown, requestId?: string): SanitizedError {
    const timestamp = new Date().toISOString();
    
    if (error instanceof Error) {
      // In development, include more details
      if (this.isDevelopment) {
        return {
          code: 'INTERNAL_ERROR',
          message: error.message,
          details: error.stack,
          timestamp,
          requestId
        };
      }
      
      // In production, hide sensitive details
      const sanitizedMessage = this.sanitizeMessage(error.message);
      return {
        code: this.getErrorCode(error),
        message: sanitizedMessage,
        timestamp,
        requestId
      };
    }
    
    // Handle non-Error objects
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      timestamp,
      requestId
    };
  }
  
  /**
   * Remove sensitive information from error messages
   */
  private static sanitizeMessage(message: string): string {
    // Remove specific sensitive patterns with more precise regexes
    return message
      // Remove absolute file paths (but keep relative paths for debugging)
      .replace(/\/(?:Users|home|tmp|var|opt|usr)\/[^\s]+/g, '[ABSOLUTE_PATH]')
      // Remove environment variable assignments
      .replace(/\b[A-Z_]{2,}=/g, '[ENV_VAR]=')
      // Remove sensitive data patterns (more specific)
      .replace(/\b(password|passwd|pwd)\s*[:=]\s*[^\s\n]+/gi, '$1:***')
      .replace(/\b(secret|secret_key|api_secret)\s*[:=]\s*[^\s\n]+/gi, '$1:***')
      .replace(/\b(token|access_token|auth_token)\s*[:=]\s*[^\s\n]+/gi, '$1:***')
      .replace(/\b(key|private_key|api_key)\s*[:=]\s*[^\s\n]+/gi, '$1:***')
      // Remove potential JWT tokens
      .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g, '[JWT_TOKEN]')
      // Remove potential API keys (hex strings)
      .replace(/\b[a-fA-F0-9]{32,}\b/g, '[API_KEY]')
      .substring(0, 500); // Increased limit for better debugging
  }
  
  /**
   * Map error types to safe error codes
   */
  private static getErrorCode(error: Error): string {
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
    if (error.name === 'TypeError') return 'INVALID_REQUEST';
    if (error.name === 'RangeError') return 'OUT_OF_RANGE';
    if (error.message.includes('ENOENT')) return 'FILE_NOT_FOUND';
    if (error.message.includes('EACCES')) return 'PERMISSION_DENIED';
    if (error.message.includes('timeout')) return 'TIMEOUT';
    return 'INTERNAL_ERROR';
  }
  
  /**
   * Log error securely (without sensitive data)
   */
  static log(error: unknown, context?: string, requestId?: string): void {
    const sanitized = this.sanitize(error, requestId);
    console.error(`[${new Date().toISOString()}] ERROR ${requestId ? `[${requestId}]` : ''} ${context ? `[${context}]` : ''}:`, {
      code: sanitized.code,
      message: sanitized.message
    });
  }
}

const PORT = parseInt(process.env.PORT || Bun.env.PORT || '3456', 10);
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || process.env.SERVER_HOST || 'localhost';
const ROOT = import.meta.dir;
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = join(ROOT, '.data');
const INDEX_PATH = join(DATA_DIR, 'index.json');
const AUDIT_PATH = join(DATA_DIR, 'audit.jsonl');
const API_USAGE_PATH = join(DATA_DIR, 'bun-api-usage.json');
const PROFILES_PATH = join(DATA_DIR, 'profiles.json');
const PROJECTS_ROOT = Bun.env.BUN_PLATFORM_HOME ?? (() => {
	// Try to derive from Bun.main or current working directory
	const mainPath = Bun.main;
	if (mainPath && mainPath !== '') {
		const parts = mainPath.split('/');
		const idx = parts.lastIndexOf('bun');
		if (idx > 0) return parts.slice(0, idx).join('/');
	}
	return process.cwd();
})();

// Initialize logger for secrets dashboard
const logger = LoggerFactory.getLogger('secrets-dashboard', {
  service: 'secrets-dashboard',
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableMetrics: true,
  structuredFormat: true
});

const HMR_CLIENTS = new Set<WritableStreamDefaultWriter>();
const ENV_ROOT = PROJECTS_ROOT;
const MAIN_DIR = Bun.fileURLToPath(new URL('.', Bun.pathToFileURL(Bun.main)));
const THEME_FILE = Bun.env.THEME_FILE;
const THEME_COLOR = Bun.env.THEME_COLOR;

const SERVICE_DEFAULT = 'com.vercel.cli.default.default';
const DEFAULT_PROFILES = {
  activeTier: 'tier1',
  tiers: {
    tier1: {
      label: 'Tier 1',
      flags: {
        allowKeychain: true,
        allowEnvFallback: true,
        allowR2: true,
        allowWrites: true,
        allowDelete: true,
        requireAudit: false,
      },
    },
    tier2: {
      label: 'Tier 2',
      flags: {
        allowKeychain: true,
        allowEnvFallback: true,
        allowR2: true,
        allowWrites: true,
        allowDelete: false,
        requireAudit: true,
      },
    },
    tier3: {
      label: 'Tier 3',
      flags: {
        allowKeychain: true,
        allowEnvFallback: false,
        allowR2: true,
        allowWrites: true,
        allowDelete: false,
        requireAudit: true,
      },
    },
    tier4: {
      label: 'Tier 4',
      flags: {
        allowKeychain: true,
        allowEnvFallback: false,
        allowR2: false,
        allowWrites: false,
        allowDelete: false,
        requireAudit: true,
      },
    },
  },
};

type IndexEntry = {service: string; name: string; updatedAt: string};

async function ensureIndex(): Promise<IndexEntry[]> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, {recursive: true});
  if (!existsSync(INDEX_PATH)) {
    await writeFile(INDEX_PATH, JSON.stringify({items: []}, null, 2));
  }
  const raw = await readFile(INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

async function writeIndex(items: IndexEntry[]): Promise<void> {
  await writeFile(INDEX_PATH, JSON.stringify({items}, null, 2));
}

type UsageResult = {
  project: string;
  scannedAt: string;
  files: number;
  total: number;
  byApi: Record<string, number>;
};

const USAGE_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.data',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.turbo',
  '.cache',
  'tmp',
]);

const USAGE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

async function walkFiles(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, {withFileTypes: true});
  for (const e of entries) {
    if (e.isDirectory()) {
      if (USAGE_IGNORE_DIRS.has(e.name)) continue;
      await walkFiles(join(dir, e.name), out);
    } else if (e.isFile()) {
      const ext = extname(e.name);
      if (USAGE_EXTS.has(ext)) out.push(join(dir, e.name));
    }
  }
}

async function scanProjectBunUsage(project: string): Promise<UsageResult> {
  const root = join(PROJECTS_ROOT, project);
  const files: string[] = [];
  await walkFiles(root, files);
  const byApi: Record<string, number> = {};
  let total = 0;

  for (const file of files) {
    try {
      const text = await readFile(file, 'utf8');
      const re = /\bBun\.([A-Za-z_][A-Za-z0-9_]*)/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) {
        const api = match[1];
        byApi[api] = (byApi[api] ?? 0) + 1;
        total++;
      }
    } catch {
      // ignore unreadable files
    }
  }

  return {
    project,
    scannedAt: new Date().toISOString(),
    files: files.length,
    total,
    byApi,
  };
}

async function readUsageCache(): Promise<Record<string, UsageResult>> {
  try {
    if (!existsSync(API_USAGE_PATH)) return {};
    const raw = await readFile(API_USAGE_PATH, 'utf8');
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

async function writeUsageCache(cache: Record<string, UsageResult>): Promise<void> {
  await writeFile(API_USAGE_PATH, JSON.stringify(cache, null, 2));
}

function usageToCsv(usage: UsageResult): string {
  const rows = [["api", "count"]];
  for (const [api, count] of Object.entries(usage.byApi).sort((a, b) => b[1] - a[1])) {
    rows.push([api, String(count)]);
  }
  rows.push(["__total__", String(usage.total)]);
  return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

async function appendAudit(entry: Record<string, unknown>): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, {recursive: true});
  const line = JSON.stringify({timestamp: new Date().toISOString(), ...entry}) + '\n';
  await writeFile(AUDIT_PATH, line, {flag: 'a'});
}

function normalizeService(service?: string): string {
  return service?.trim() || SERVICE_DEFAULT;
}

function normalizeName(name?: string): string {
  const n = name?.trim();
  if (!n) throw new Error('Missing name');
  return n;
}

function requireSecrets() {
  const secrets = (Bun as unknown as {secrets?: {get: (opts: {service: string; name: string}) => Promise<string | null>; set: (opts: {service: string; name: string}, val: string) => Promise<void>; delete: (opts: {service: string; name: string}) => Promise<boolean>}}).secrets;
  if (!secrets) throw new Error('Bun.secrets not available');
  return secrets;
}

async function json(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

function envPathForProject(project: string): string {
  return join(ENV_ROOT, project, '.env');
}

async function readEnv(project: string): Promise<Record<string, string>> {
  const path = envPathForProject(project);
  if (!existsSync(path)) return {};
  const text = await readFile(path, 'utf8');
  return parseEnv(text);
}

async function writeEnv(project: string, next: Record<string, string>): Promise<void> {
  const path = envPathForProject(project);
  const lines = Object.entries(next).map(([k, v]) => `${k}=${v}`);
  await writeFile(path, lines.join('\n') + '\n');
}

type ProfileState = typeof DEFAULT_PROFILES;

async function ensureProfiles(): Promise<ProfileState> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, {recursive: true});
  if (!existsSync(PROFILES_PATH)) {
    await writeFile(PROFILES_PATH, JSON.stringify(DEFAULT_PROFILES, null, 2));
    return DEFAULT_PROFILES;
  }
  try {
    const raw = await readFile(PROFILES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return sanitizeProfiles(parsed);
  } catch {
    await writeFile(PROFILES_PATH, JSON.stringify(DEFAULT_PROFILES, null, 2));
    return DEFAULT_PROFILES;
  }
}

function sanitizeProfiles(input: any): ProfileState {
  const safe: ProfileState = JSON.parse(JSON.stringify(DEFAULT_PROFILES));
  if (input && typeof input === 'object') {
    const active = typeof input.activeTier === 'string' ? input.activeTier : safe.activeTier;
    if (input.tiers && typeof input.tiers === 'object') {
      for (const [tierId, tierDef] of Object.entries(safe.tiers)) {
        const incoming = input.tiers[tierId];
        if (incoming && typeof incoming === 'object') {
          if (typeof incoming.label === 'string') tierDef.label = incoming.label;
          if (incoming.flags && typeof incoming.flags === 'object') {
            for (const key of Object.keys(tierDef.flags)) {
              if (typeof incoming.flags[key] === 'boolean') {
                tierDef.flags[key] = incoming.flags[key];
              }
            }
          }
        }
      }
    }
    safe.activeTier = Object.prototype.hasOwnProperty.call(safe.tiers, active) ? active : safe.activeTier;
  }
  return safe;
}

async function writeProfiles(next: ProfileState): Promise<void> {
  await writeFile(PROFILES_PATH, JSON.stringify(next, null, 2));
}

const STATIC_CACHE = new Map<string, {etag: string; body: Uint8Array; type: string}>();
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function getMime(path: string): string {
  return MIME[extname(path)] ?? 'application/octet-stream';
}

function etagFor(buf: Uint8Array): string {
  return `W/\"${Bun.hash.wyhash(buf).toString(16)}\"`;
}

async function readStatic(path: string): Promise<{etag: string; body: Uint8Array; type: string}> {
  const cached = STATIC_CACHE.get(path);
  if (cached) return cached;
  const file = Bun.file(path);
  const body = new Uint8Array(await file.arrayBuffer());
  const type = getMime(path);
  const etag = etagFor(body);
  const entry = {etag, body, type};
  STATIC_CACHE.set(path, entry);
  return entry;
}

function acceptsGzip(req: Request): boolean {
  const enc = req.headers.get('accept-encoding') ?? '';
  return enc.includes('gzip');
}

async function serveStatic(req: Request, path: string): Promise<Response> {
  const {etag, body, type} = await readStatic(path);
  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, {status: 304});
  }

  let outBody: BodyInit = body;
  const headers = new Headers({
    'Content-Type': type,
    'Cache-Control': type.includes('javascript') || type.includes('html') ? 'no-cache' : 'public, max-age=300',
    'ETag': etag,
  });

  if (acceptsGzip(req) && typeof CompressionStream === 'function') {
    const cs = new CompressionStream('gzip');
    const stream = new Blob([body]).stream().pipeThrough(cs);
    headers.set('Content-Encoding', 'gzip');
    outBody = stream;
  }

  return new Response(outBody, {headers});
}

async function indexHash(): Promise<string> {
  try {
    const raw = await readFile(INDEX_PATH, 'utf8');
    return Bun.hash.wyhash(raw).toString(16);
  } catch {
    return '0';
  }
}

async function runWrangler(args: string[]): Promise<{stdout: string; stderr: string; code: number}> {
  const proc = Bun.spawn(['bunx', 'wrangler', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text(),
    proc.exited,
  ]);
  return {stdout, stderr, code};
}

function loadTheme(): {accent?: string; source: string} {
  if (THEME_FILE) {
    try {
      const themePath = Bun.resolveSync(THEME_FILE, import.meta.dir);
      const raw = Bun.file(themePath).text();
      const json = JSON.parse(raw);
      if (json?.primary) {
        return {accent: Bun.color(json.primary, 'hex') || json.primary, source: themePath};
      }
      return {source: themePath};
    } catch {
      return {source: THEME_FILE};
    }
  }
  if (THEME_COLOR) {
    return {accent: Bun.color(THEME_COLOR, 'hex') || THEME_COLOR, source: 'env'};
  }
  return {source: 'default'};
}

function getRunMode(): 'watch' | 'hot' | 'normal' {
  const argv = Bun.argv.join(' ');
  if (Bun.env.BUN_HOT === '1' || argv.includes('--hot')) return 'hot';
  if (Bun.env.BUN_WATCH === '1' || argv.includes('--watch')) return 'watch';
  return 'normal';
}

function getScope(): string {
  return currentScope;
}

let currentScope = Bun.env.SCOPE ?? 'local';

function broadcastHmr(): void {
  STATIC_CACHE.clear();
  for (const writer of HMR_CLIENTS) {
    writer.write(new TextEncoder().encode('data: reload\n\n')).catch(() => {
      HMR_CLIENTS.delete(writer);
    });
  }
}

function watchHmr(): void {
  const watchers = [
    watch(PUBLIC_DIR, {recursive: true}, () => broadcastHmr()),
    watch(ROOT, {recursive: false}, () => broadcastHmr()),
  ];
  process.on('beforeExit', () => {
    for (const w of watchers) w.close();
  });
}

function slugifyTokenPart(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'default';
}

function deriveOrg(pkgName: string | null, repoOwner: string | null): string {
  if (pkgName && pkgName.startsWith('@')) {
    const scope = pkgName.split('/')[0]?.slice(1) ?? '';
    if (scope) return slugifyTokenPart(scope);
  }
  if (repoOwner) return slugifyTokenPart(repoOwner);
  return 'default';
}

function deriveProject(pkgName: string | null, folder: string): string {
  let raw = pkgName ?? folder;
  if (raw.startsWith('@')) raw = raw.split('/')[1] ?? folder;
  return slugifyTokenPart(raw);
}

async function getRepoOwner(dir: string): Promise<string | null> {
  try {
    const proc = Bun.spawnSync(['git', 'remote', 'get-url', 'origin'], {cwd: dir, stdout: 'pipe', stderr: 'ignore'});
    if (!proc.success) return null;
    const url = proc.stdout.toString().trim();
    if (!url) return null;
    const cleaned = url
      .replace(/^git\+/, '')
      .replace(/^git@github\.com[^:]*:/, 'https://github.com/')
      .replace(/^https?:\/\/[^@]+@github\.com/, 'https://github.com')
      .replace(/\.git$/, '');
    const u = new URL(cleaned);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] ?? null;
  } catch {
    return null;
  }
}

async function listProjects(): Promise<{folder: string; name: string | null; path: string; service: string; tokenName: string; status: string; hsl: string; glyph: string; orgProject: string; tokenMask: string}> {
  const entries = await readdir(PROJECTS_ROOT, {withFileTypes: true});
  const dirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'scanner' && e.name !== 'secrets-dashboard')
    .map(e => e.name);

  const results = await Promise.all(dirs.map(async folder => {
    const dir = join(PROJECTS_ROOT, folder);
    let pkgName: string | null = null;
    try {
      const pkgFile = Bun.file(join(dir, 'package.json'));
      if (await pkgFile.exists()) {
        const pkg = await pkgFile.json();
        if (typeof pkg.name === 'string') pkgName = pkg.name;
      }
    } catch {}
    const repoOwner = await getRepoOwner(dir);
    const org = deriveOrg(pkgName, repoOwner);
    const project = deriveProject(pkgName, folder);
    const service = `com.vercel.cli.${org}.${project}`;
    const tokenName = project;
    // token status via Bun.secrets (if available)
    let status = 'unknown';
    let tokenMask = '••••';
    try {
      const secrets = (Bun as unknown as {secrets?: {get: (opts: {service: string; name: string}) => Promise<string | null>}}).secrets;
      if (secrets) {
        const val = await secrets.get({service, name: tokenName});
        status = val ? 'keychain' : 'missing';
        if (val) tokenMask = `•••• (${val.length})`;
      } else {
        status = 'unsupported';
      }
    } catch {
      status = 'error';
    }
    const base = status === 'keychain' ? [120, 100, 40] : status === 'missing' ? [35, 100, 50] : status === 'error' ? [0, 80, 45] : [0, 0, 60];
    const hue = (base[0] + (Number(Bun.hash.wyhash(service)) % 360)) % 360;
    const hsl = `hsl(${hue}, ${base[1]}%, ${base[2]}%)`;
    const glyph = status === 'keychain' ? '✓' : status === 'missing' ? '⚠' : status === 'error' ? '✗' : '?';
    return {folder, name: pkgName, path: dir, service, tokenName, status, hsl, glyph, orgProject: `${org}.${project}`, tokenMask};
  }));

  return results.sort((a, b) => a.folder.localeCompare(b.folder));
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function logResponse(response: Response, startTime: number, requestId: string): void {
  const duration = Date.now() - startTime;
  logger.logRequest('HTTP', response.url || 'unknown', response.status, duration, requestId);
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 0,
  async fetch(req) {
    const requestId = generateRequestId();
    const url = new URL(req.url);
    const startTime = Date.now();

    // Log request start
    logger.info(`${req.method} ${url.pathname} started`, {
      method: req.method,
      path: url.pathname,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    }, requestId);

    try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const response = serveStatic(req, join(PUBLIC_DIR, 'index.html'));
      logResponse(response, startTime, requestId);
      return response;
    }
    if (url.pathname === '/app.js') {
      const response = serveStatic(req, join(PUBLIC_DIR, 'app.js'));
      logResponse(response, startTime, requestId);
      return response;
    }
    if (url.pathname === '/constants.js') {
      const response = serveStatic(req, join(PUBLIC_DIR, 'constants.js'));
      logResponse(response, startTime, requestId);
      return response;
    }
    if (url.pathname === '/__hmr') {
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      HMR_CLIENTS.add(writer);
      const response = new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
      logResponse(response, startTime, requestId);
      return response;
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        if (url.pathname === '/api/index') {
          const items = await ensureIndex();
          const hash = await indexHash();
          return Response.json({items, hash});
        }
        if (url.pathname === '/api/projects') {
          const items = await listProjects();
          return Response.json({items});
        }
        if (url.pathname === '/api/bun-usage') {
          // Validate URL parameters
          const paramValidation = InputValidator.validateUrlParams(url, {
            project: { required: true, type: 'string', minLength: 1, maxLength: 100, sanitize: true },
            refresh: { required: false, type: 'string', enum: ['0', '1'] },
            format: { required: false, type: 'string', enum: ['json', 'csv'] }
          });
          
          if (!paramValidation.isValid) {
            throw new Error(`Validation failed: ${paramValidation.errors.join(', ')}`);
          }
          
          const project = paramValidation.sanitized.project;
          const refresh = paramValidation.sanitized.refresh === '1';
          const format = paramValidation.sanitized.format || 'json';
          
          const cache = await readUsageCache();
          if (!refresh && cache[project]) {
            if (format === 'csv') {
              return new Response(usageToCsv(cache[project]), {
                headers: { 'Content-Type': 'text/csv; charset=utf-8' },
              });
            }
            return Response.json({usage: cache[project], cached: true});
          }
          const usage = await scanProjectBunUsage(project);
          cache[project] = usage;
          await writeUsageCache(cache);
          if (format === 'csv') {
            return new Response(usageToCsv(usage), {
              headers: { 'Content-Type': 'text/csv; charset=utf-8' },
            });
          }
          return Response.json({usage, cached: false});
        }
        if (url.pathname === '/api/audit') {
          if (!existsSync(AUDIT_PATH)) return Response.json({items: []});
          const raw = await readFile(AUDIT_PATH, 'utf8');
          const items = raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
          return Response.json({items});
        }
        if (url.pathname === '/api/export') {
          const items = await ensureIndex();
          return Response.json({items});
        }
        if (url.pathname === '/api/import') {
          const bodyValidation = await InputValidator.validateJsonBody(req, {
            items: {
              required: true,
              type: 'array',
              maxLength: 1000
            }
          });
          
          if (!bodyValidation.isValid) {
            throw new Error(`Validation failed: ${bodyValidation.errors.join(', ')}`);
          }
          
          const items = bodyValidation.sanitized.items
            .filter((i: any) => i && typeof i.service === 'string' && typeof i.name === 'string' && typeof i.value === 'string')
            .map((i: any) => ({
              service: InputValidator.validateField(i.service, {
                type: 'string',
                minLength: 1,
                maxLength: 255,
                sanitize: true
              }, 'service').sanitized,
              name: InputValidator.validateField(i.name, {
                type: 'string',
                minLength: 1,
                maxLength: 255,
                sanitize: true
              }, 'name').sanitized,
              value: i.value // Don't sanitize secret values
            }));
            
          if (items.length === 0) {
            throw new Error('No valid items provided');
          }
          
          const secrets = requireSecrets();
          for (const i of items) {
            await secrets.set({service: i.service, name: i.name}, i.value);
            await appendAudit({action: 'import', service: i.service, name: i.name});
          }
          return Response.json({ok: true, count: items.length});
        }
        if (url.pathname === '/api/env') {
          const body = await json(req);
          const project = body.project as string;
          if (!project) throw new Error('Missing project');
          if (req.method === 'GET') {
            const env = await readEnv(project);
            return Response.json({env});
          }
          const env = await readEnv(project);
          for (const [k, v] of Object.entries(body.env || {})) {
            if (typeof v === 'string') env[k] = v;
          }
          await writeEnv(project, env);
          return Response.json({ok: true});
        }
        if (url.pathname === '/api/wrangler') {
          const body = await json(req);
          const action = body.action as string;
          if (action === 'r2:list') {
            const bucket = body.bucket as string;
            const prefix = body.prefix as string | undefined;
            if (!bucket) throw new Error('Missing bucket');
            const args = ['r2', 'object', 'list', bucket];
            if (prefix) args.push('--prefix', prefix);
            const result = await runWrangler(args);
            return Response.json(result);
          }
          throw new Error('Unknown action');
        }
        if (url.pathname === '/api/mode') {
          return Response.json({mode: getRunMode(), scope: getScope()});
        }
        if (url.pathname === '/api/theme') {
          const theme = loadTheme();
          return Response.json({theme, mainDir: MAIN_DIR});
        }
        if (url.pathname === '/api/profiles') {
          if (req.method === 'GET') {
            const profiles = await ensureProfiles();
            return Response.json({profiles});
          }
          const body = await json(req);
          if (body?.reset === true) {
            await writeProfiles(DEFAULT_PROFILES);
            return Response.json({profiles: DEFAULT_PROFILES});
          }
          const next = sanitizeProfiles(body?.profiles ?? body);
          await writeProfiles(next);
          return Response.json({profiles: next});
        }
        if (url.pathname === '/api/debug') {
          if (Bun.env.DEBUG_BUN !== '1') throw new Error('Debug endpoint disabled');
          const body = await json(req);
          const action = body.action as string;
          if (action === 'gc') {
            const start = Bun.nanoseconds();
            Bun.gc(true);
            const tookNs = Bun.nanoseconds() - start;
            return Response.json({ok: true, tookNs});
          }
          if (action === 'heap') {
            const snap = Bun.generateHeapSnapshot('v8');
            return Response.json({ok: true, snapshot: typeof snap === 'string' ? snap : 'heap'});
          }
          throw new Error('Unknown debug action');
        }
        if (url.pathname === '/api/scope') {
          if (req.method === 'GET') return Response.json({scope: getScope()});
          const body = await json(req);
          const next = typeof body.scope === 'string' && body.scope.trim() ? body.scope.trim() : 'local';
          currentScope = next;
          return Response.json({scope: currentScope});
        }

        const secrets = requireSecrets();
        
        // Validate all secret management requests
        const bodyValidation = await InputValidator.validateJsonBody(req, {
          service: { required: true, type: 'string', minLength: 1, maxLength: 255, sanitize: true },
          name: { required: true, type: 'string', minLength: 1, maxLength: 255, sanitize: true },
          value: { required: false, type: 'string', maxLength: 10000 }
        });
        
        if (!bodyValidation.isValid) {
          throw new Error(`Validation failed: ${bodyValidation.errors.join(', ')}`);
        }
        
        const service = bodyValidation.sanitized.service;
        const name = bodyValidation.sanitized.name;
        const value = bodyValidation.sanitized.value;

        if (url.pathname === '/api/get') {
          const getValue = await secrets.get({service, name});
          await appendAudit({action: 'get', service, name, hit: !!getValue});
          return Response.json({value: getValue});
        }

        if (url.pathname === '/api/set') {
          if (typeof value !== 'string') {
            throw new Error('Missing value for set operation');
          }
          await secrets.set({service, name}, value);
          await appendAudit({action: 'set', service, name});
          const items = await ensureIndex();
          const now = new Date().toISOString();
          const idx = items.findIndex((i) => i.service === service && i.name === name);
          if (idx >= 0) items[idx] = {service, name, updatedAt: now};
          else items.push({service, name, updatedAt: now});
          await writeIndex(items);
          return Response.json({ok: true});
        }

        if (url.pathname === '/api/delete') {
          const ok = await secrets.delete({service, name});
          await appendAudit({action: 'delete', service, name, ok});
          const items = await ensureIndex();
          const filtered = items.filter((i) => !(i.service === service && i.name === name));
          await writeIndex(filtered);
          return Response.json({ok});
        }

        return new Response('Not found', {status: 404});
      } catch (err) {
        // Log the full error for debugging
        logger.error(`API ${url.pathname} failed`, err instanceof Error ? err : new Error(String(err)), {
          method: req.method,
          path: url.pathname,
          duration: Date.now() - startTime
        }, requestId);
        
        // Return sanitized error to client
        const sanitized = ErrorHandler.sanitize(err, requestId);
        const response = Response.json(sanitized, {status: 400});
        logResponse(response, startTime, requestId);
        return response;
      }
    }

    const response = new Response('Not found', {status: 404});
    logResponse(response, startTime, requestId);
    return response;
  },
});

console.log(`Bun Secrets Dashboard running on http://${DASHBOARD_HOST}:${PORT}`);
logger.info(`Secrets dashboard server started`, {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0'
});

watchHmr();

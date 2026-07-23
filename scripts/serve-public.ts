#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Local portal + static public/ server with live ops/catalog/registry APIs.
 *
 *   bun scripts/serve-public.ts
 *   open http://localhost:3000/portal/ops/
 *
 * Routes:
 *   /api/operations/summary   → live SQLite
 *   /api/catalog              → account catalog from SQLite
 *   /api/registry             → full registry index
 *   /api/registry/{name}      → package detail
 *   /api/registry/{name}/versions → list/publish versions
 *   /api/registry/search      → search packages
 *   /api/dod                  → DOD submissions
 *   /api/monitoring           → live registry + ops metrics (JSON)
 *   /monitoring               → Bun.inspect.table dashboard (HTML)
 *   /api/channels/events      → notification events
 *   PUT /{name}               → npm-compatible publish (bun publish)
 *   /*                        → public/* static files
 */
import { Database } from 'bun:sqlite';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { collectMonitoring, renderMonitoringHtml } from '../lib/monitoring/index.ts';
import { DODVerifier } from '../lib/dod/verifier.ts';

const PORT = Number(Bun.env.PORT || 3000);
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

function json(
  data: object | string | number | boolean | null,
  status = 200,
  cache = 'no-store'
): Response {
  return Response.json(data, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

async function writeBytes(path: string, data: Uint8Array | string): Promise<void> {
  // Bun.write creates parent directories
  await Bun.write(path, data);
}

// ── Ops Summary ─────────────────────────────────────────────────────

async function liveOpsSummary(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      return json(buildOpsSummary(db, 'live'));
    } finally {
      db.close();
    }
  } catch (err) {
    const snap = Bun.file('public/registry/ops-summary.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      return json({ ...data, source: 'snapshot', fallback: 'db-unavailable' });
    }
    return json(
      {
        error: 'Failed to open operations DB',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      503
    );
  }
}

// ── Account Catalog ─────────────────────────────────────────────────

async function liveCatalog(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const status = url.searchParams.get('status') || '';
  try {
    const db = new Database(dbPath);
    db.run('PRAGMA journal_mode=WAL');
    let sql = `SELECT p.id as platform_id, p.name as platform, p.category, p.sub_category, a.id as account_id, a.partner_id, a.account_identifier, a.balance, a.status, a.notes, a.opened_at, a.last_verified_at, n.name as partner_name, n.type as partner_type FROM partner_platform_accounts a JOIN platforms p ON a.platform_id = p.id JOIN tree_nodes n ON a.partner_id = n.id WHERE a.status != 'closed'`;
    const params: (string | number)[] = [];
    if (search) {
      sql += ' AND (p.name LIKE ? OR a.account_identifier LIKE ? OR n.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY p.category, p.name';
    return json({ source: 'live', accounts: db.query(sql).all(...params) });
  } catch {
    const file = Bun.file('public/registry/catalog-snapshot.json');
    if (await file.exists()) return json(await file.json());
    return json(
      { error: 'No live database or snapshot available', source: 'none', accounts: [] },
      503
    );
  }
}

// ── Registry Index ──────────────────────────────────────────────────

async function readRegistry() {
  const f = Bun.file('public/registry/registry.json');
  if (!(await f.exists())) return null;
  return JSON.parse(await f.text());
}

async function serveRegistryIndex(): Promise<Response> {
  const reg = await readRegistry();
  if (!reg) return json({ error: 'No registry index' }, 404);
  return json(reg);
}

async function searchRegistry(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase() || '';
  const type = url.searchParams.get('type')?.toLowerCase() || '';
  const reg = await readRegistry();
  if (!reg) return json({ results: [] });
  const results: { name: string; version: string; type: string; description: string }[] = [];
  for (const [name, pkg] of Object.entries(reg.packages || {})) {
    const info = pkg as any;
    const latest = info['dist-tags']?.latest;
    const rel = latest ? info.releases?.[latest] : null;
    if (
      q &&
      !name.toLowerCase().includes(q) &&
      !(rel?.description || '').toLowerCase().includes(q) &&
      !(rel?.tags || []).some((t: string) => t.toLowerCase().includes(q))
    )
      continue;
    if (type && rel?.type !== type) continue;
    results.push({
      name,
      version: latest || '?',
      type: rel?.type || '?',
      description: rel?.description || '',
    });
  }
  return json({ results, total: results.length });
}

async function packageDetail(name: string): Promise<Response> {
  const reg = await readRegistry();
  if (!reg) return json({ error: 'No registry' }, 404);
  const pkg = (reg.packages || {})[name];
  if (!pkg) return json({ error: 'Package not found' }, 404);
  return json({ name, ...pkg });
}

// ── Version endpoints ───────────────────────────────────────────────

async function listVersions(name: string): Promise<Response> {
  const reg = await readRegistry();
  const pkg = reg?.packages?.[name];
  if (!pkg) return json({ versions: [] });
  return json({
    name,
    versions: (pkg.versions || []).map((v: string) => {
      const r = pkg.releases?.[v];
      return {
        version: v,
        publishedAt: r?.publishedAt || null,
        checksum: r?.storage?.checksum || null,
        type: r?.type || null,
        description: r?.description || null,
      };
    }),
    distTags: pkg['dist-tags'] || {},
  });
}

async function publishVersion(req: Request, name: string): Promise<Response> {
  const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey) return json({ error: 'Authorization required' }, 401);
  const form = await req.formData();
  const file = form.get('file');
  const version = form.get('version') as string;
  const tags = ((form.get('tags') as string) || '')
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean);
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse((form.get('metadata') as string) || '{}');
  } catch {}
  if (!file || !(file instanceof File)) return json({ error: 'File required' }, 400);
  if (!version) return json({ error: 'Version required' }, 400);
  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const storageDir = `public/registry/storage/${name}/${version}`;
  await writeBytes(`${storageDir}/artifact.tgz`, buf);
  const raw = await Bun.file('public/registry/registry.json').text();
  const reg = JSON.parse(raw || '{"packages":{}}');
  if (!reg.packages) reg.packages = {};
  if (!reg.packages[name]) reg.packages[name] = { versions: [], 'dist-tags': {}, releases: {} };
  const pkg = reg.packages[name];
  if (!pkg.versions.includes(version)) pkg.versions.push(version);
  pkg.versions.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
  for (const tag of tags) pkg['dist-tags'][tag] = version;
  pkg.releases[version] = {
    id: `${name}@${version}`,
    name,
    version,
    type: metadata.type || 'library',
    description: metadata.description || '',
    tags: metadata.tags || tags,
    publishedAt: new Date().toISOString(),
    publisher: 'api',
    storage: {
      r2Key: `@factorywager/${name}/${version}.tgz`,
      size: buf.length,
      checksum: sha256,
      contentType: file.type || 'application/gzip',
    },
  };
  await writeBytes('public/registry/registry.json', JSON.stringify(reg, null, 2));
  return json({ success: true, version, checksum: sha256, size: buf.length });
}

// ── npm-compatible publish (bun publish) ────────────────────────────

async function npmPublish(req: Request, name: string): Promise<Response> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token && Bun.env.NODE_ENV === 'production')
    return json({ error: 'missing authentication' }, 401);
  const ct = req.headers.get('content-type') || '';
  let version = '';
  let tarballBuf: Uint8Array | null = null;
  if (ct.includes('application/json')) {
    const body = await req.json();
    version = body['dist-tags']?.latest || Object.keys(body.versions || {})[0] || '0.0.0';
    const attachments = body._attachments;
    if (attachments) {
      const data = attachments[Object.keys(attachments)[0]]?.data;
      if (data) tarballBuf = Buffer.from(data, 'base64');
    }
  } else {
    tarballBuf = new Uint8Array(await req.arrayBuffer());
    version = `0.0.0-${Date.now()}`;
  }
  if (!tarballBuf) return json({ error: 'No tarball in request' }, 400);
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', tarballBuf)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const storageDir = `public/registry/storage/${name}/${version}`;
  await writeBytes(`${storageDir}/artifact.tgz`, tarballBuf);
  const raw = await Bun.file('public/registry/registry.json').text();
  const reg = JSON.parse(raw || '{"packages":{}}');
  if (!reg.packages) reg.packages = {};
  if (!reg.packages[name]) reg.packages[name] = { versions: [], 'dist-tags': {}, releases: {} };
  const pkg = reg.packages[name];
  if (!pkg.versions.includes(version)) pkg.versions.push(version);
  pkg.versions.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
  pkg['dist-tags'].latest = version;
  pkg.releases[version] = {
    id: `${name}@${version}`,
    name,
    version,
    type: 'library',
    description: 'Published via bun publish',
    publishedAt: new Date().toISOString(),
    publisher: 'bun-publish',
    storage: {
      r2Key: `@factorywager/${name}/${version}.tgz`,
      size: tarballBuf.length,
      checksum: sha256,
      contentType: 'application/gzip',
    },
  };
  await writeBytes('public/registry/registry.json', JSON.stringify(reg, null, 2));
  return json({ ok: true, id: `${name}@${version}`, revision: sha256.slice(0, 12) });
}

// ── npm-compatible package metadata (for bun install / bunx) ────────

async function npmPackageMetadata(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawPath = url.pathname;
  // Handle URL-encoded scoped names: /@factorywager%2Fregistry-client → @factorywager/registry-client
  const name = decodeURIComponent(rawPath.startsWith('/@') ? rawPath.slice(1) : rawPath.slice(1));
  const reg = await readRegistry();
  if (!reg) return json({ error: 'No registry' }, 404);
  const pkg = (reg.packages || {})[name];
  if (!pkg) return json({ error: 'Package not found' }, 404);

  // Build npm-registry-compatible response
  const latest = pkg['dist-tags']?.latest;
  const versions: Record<string, any> = {};
  for (const v of pkg.versions || []) {
    const rel = pkg.releases?.[v];
    if (!rel) continue;
    versions[v] = {
      name,
      version: v,
      type: rel.type,
      description: rel.description,
      bin: rel.bin || undefined,
      dependencies: rel.dependencies || undefined,
      dist: {
        tarball: `/registry/storage/${name}/${v}/artifact.tgz`,
        shasum: rel.storage?.checksum?.slice(0, 40) || '',
        integrity: rel.storage?.checksum ? `sha256-${rel.storage.checksum}` : undefined,
        size: rel.storage?.size || 0,
      },
    };
  }

  return json({
    _id: name,
    name,
    'dist-tags': pkg['dist-tags'] || {},
    versions,
    time: Object.fromEntries(
      (pkg.versions || []).map((v: string) => {
        const rel = pkg.releases?.[v];
        return [v, rel?.publishedAt || new Date().toISOString()];
      })
    ),
  });
}

// ── DOD / Channels ──────────────────────────────────────────────────

const dodVerifier = new DODVerifier();

async function dodApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/dod', '').replace(/\/$/, '');

  if (req.method === 'GET') {
    const status = url.searchParams.get('status') || 'all';
    return json(dodVerifier.list(status));
  }

  if (req.method === 'POST') {
    const body = await req.json();
    if (path === '/approve' && body.id) {
      dodVerifier.approve(body.id);
      return json({ ok: true, id: body.id, status: 'verified' });
    }
    if (path === '/reject' && body.id) {
      dodVerifier.reject(body.id, body.reason || 'Not specified');
      return json({ ok: true, id: body.id, status: 'rejected' });
    }
  }
  return json({ error: 'Not found' }, 404);
}

async function channelsEvents(req: Request): Promise<Response> {
  const url = new URL(req.url);
  return json({
    topic: url.searchParams.get('topic') || 'factory',
    since: parseInt(url.searchParams.get('since') || '0', 10),
    events: [],
    ok: true,
  });
}

// ── Static files ────────────────────────────────────────────────────

async function staticFile(pathname: string): Promise<Response | null> {
  let path = pathname === '/' ? '/index.html' : pathname;
  if (path.endsWith('/')) path = `${path}index.html`;
  let file = Bun.file(`public${path}`);
  if (!(await file.exists()) && !path.endsWith('.html') && !path.includes('.'))
    file = Bun.file(`public${path}/index.html`);
  if (!(await file.exists())) return null;
  const headers = new Headers();
  if (path.endsWith('.json')) headers.set('Content-Type', 'application/json; charset=utf-8');
  else if (path.endsWith('.svg')) headers.set('Content-Type', 'image/svg+xml');
  return new Response(file, { headers });
}

// ── Server ──────────────────────────────────────────────────────────

const startedAt = Date.now();

/** GET /api/monitoring — registry + ops metrics (live SQLite, snapshot fallback). */
async function liveMonitoringApi(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = await collectMonitoring(db, { source: 'live', uptimeOriginMs: startedAt });
      return json(data);
    } finally {
      db.close();
    }
  } catch (err) {
    const snap = Bun.file('public/registry/monitoring.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      return json({ ...data, source: 'snapshot', fallback: 'db-unavailable' });
    }
    return json(
      {
        error: 'Failed to collect monitoring metrics',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      503
    );
  }
}

/** GET /monitoring — server-rendered Bun.inspect.table dashboard. */
async function monitoringPage(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = await collectMonitoring(db, { source: 'live', uptimeOriginMs: startedAt });
      return new Response(renderMonitoringHtml(data), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    } finally {
      db.close();
    }
  } catch {
    const staticRes = await staticFile('/monitoring/');
    if (staticRes) return staticRes;
    return new Response('Monitoring unavailable', { status: 503 });
  }
}

/** GET /health — uptime, runtime, and artifact freshness probe. */
async function health(): Promise<Response> {
  const summary = Bun.file('public/registry/ops-summary.json');
  const exists = await summary.exists();
  let generated: string | null = null;
  let ageSeconds: number | null = null;
  if (exists) {
    try {
      const parsed = (await summary.json()) as { generated?: string };
      generated = parsed.generated ?? null;
      ageSeconds = generated ? Math.round((Date.now() - Date.parse(generated)) / 1000) : null;
    } catch {
      /* malformed artifact still reports exists */
    }
  }
  return json({
    status: 'ok',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    bun: Bun.version,
    artifacts: {
      opsSummary: { exists, generated, ageSeconds },
    },
  });
}

/** Optional auth middleware — set REGISTRY_AUTH=token to protect read endpoints. */
function requireReadAuth(req: Request): Response | null {
  const expected = Bun.env.REGISTRY_AUTH;
  if (!expected) return null;
  const provided = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (provided === expected) return null;
  return json({ error: 'Unauthorized' }, 401);
}

async function fetchHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Health endpoint — no auth
  if (path === '/health' || path === '/health/') return health();

  // Optional auth for read endpoints
  const authErr = requireReadAuth(req);
  if (authErr && path !== '/api/operations/summary' && path !== '/api/catalog') {
    const unprotectedPaths = ['/api/monitoring', '/api/registry', '/api/dod', '/api/channels'];
    if (unprotectedPaths.some(p => path.startsWith(p))) return authErr;
  }
  if (path === '/api/monitoring' || path === '/api/monitoring/') return liveMonitoringApi();
  if (path === '/monitoring' || path === '/monitoring/') return monitoringPage();
  if (path === '/api/operations/summary' || path === '/api/operations/summary/')
    return liveOpsSummary();
  if (path === '/api/catalog' || path === '/api/catalog/') return liveCatalog(req);

  // Registry
  if (path === '/api/registry' || path === '/api/registry/') return serveRegistryIndex();
  if (path === '/api/registry/registry.json') return serveRegistryIndex();
  if (path === '/api/registry/search') return searchRegistry(req);

  // Version endpoints: /api/registry/{name}/versions
  if (path.startsWith('/api/registry/') && path.endsWith('/versions')) {
    const name = path.slice(14, -9);
    if (req.method === 'GET') return listVersions(name);
    if (req.method === 'POST') return publishVersion(req, name);
    return json({ error: 'Method not allowed' }, 405);
  }

  // Package detail: GET /api/registry/{name}
  if (path.startsWith('/api/registry/') && req.method === 'GET') {
    const name = path.slice(14);
    if (name && name !== 'search' && name !== 'registry.json' && !name.includes('/tenants/')) {
      if (name.includes('/')) {
        const parts = name.split('/');
        if (parts.length === 2 && parts[0]!.startsWith('@')) return packageDetail(name);
      } else {
        return packageDetail(name);
      }
    }
  }

  // Tenant registries
  const tenantM = path.match(/^\/api\/registry\/tenants\/([^/]+)\/registry\.json$/);
  if (tenantM) {
    const f = Bun.file(`public/registry/${tenantM[1]}/registry.json`);
    if (await f.exists())
      return new Response(f, { headers: { 'Content-Type': 'application/json' } });
    return json({ error: `No registry for tenant: ${tenantM[1]}` }, 404);
  }

  // DOD + Channels
  if (path === '/api/dod' || path === '/api/dod/' || path.startsWith('/api/dod/'))
    return dodApi(req);
  if (path === '/api/channels/events') return channelsEvents(req);

  // npm-compatible publish: PUT /{name} or /@scope/name
  if (
    req.method === 'PUT' &&
    (path.match(/^\/@[a-z0-9-]+\/[a-zA-Z0-9._-]+$/) ||
      path.match(/^\/@[a-z0-9-]+%2[fF][a-zA-Z0-9._-]+$/) ||
      (path.split('/').length === 2 && path.startsWith('/') && !path.startsWith('/@')))
  ) {
    return npmPublish(req, decodeURIComponent(path.slice(1)));
  }

  // npm-compatible metadata: GET /{name} or /@scope/name
  if (
    req.method === 'GET' &&
    (path.match(/^\/@[a-z0-9-]+\/[a-zA-Z0-9._-]+$/) ||
      path.match(/^\/@[a-z0-9-]+%2[fF][a-zA-Z0-9._-]+$/) ||
      (path.split('/').length === 2 && path.startsWith('/') && !path.startsWith('/@')))
  ) {
    return npmPackageMetadata(req);
  }

  const staticRes = await staticFile(path);
  if (staticRes) return staticRes;

  return new Response('Not found', { status: 404 });
}

function startServer(preferred: number, maxTries = 20): { port: number } {
  let lastErr: unknown;
  for (let i = 0; i < maxTries; i++) {
    const port = preferred + i;
    try {
      Bun.serve({ port, fetch: fetchHandler });
      return { port };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('EADDRINUSE') && !msg.includes('port')) throw e;
    }
  }
  console.error(`
Port ${preferred}–${preferred + maxTries - 1} busy.

  # Use the server already on :${preferred} (if it is serve-public):
  open http://localhost:${preferred}/portal/ops/

  # Or free the port, then re-run:
  lsof -nP -iTCP:${preferred} -sTCP:LISTEN
  kill <PID>

  # Or pick a free port:
  PORT=3010 bunx --bun serve-public
  # (not: bunx bunx --bun serve-public)
`);
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const { port: boundPort } = startServer(PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

console.log(`Local portal:  http://localhost:${boundPort}/portal/ops/`);
console.log(`Monitoring:    http://localhost:${boundPort}/monitoring`);
console.log(`Live API:      http://localhost:${boundPort}/api/operations/summary`);
console.log(`Monitoring API http://localhost:${boundPort}/api/monitoring`);
console.log(`Registry:      http://localhost:${boundPort}/api/registry`);
console.log(`Catalog:       http://localhost:${boundPort}/api/catalog`);
console.log(`Prediction:    http://localhost:${boundPort}/registry/prediction/report.html`);
console.log(`Publish:       PUT http://localhost:${boundPort}/{name} (npm-compatible)`);
console.log(`DB: ${dbPath}`);
if (boundPort !== PORT) {
  console.log(`(preferred PORT=${PORT} was busy — bound ${boundPort})`);
}

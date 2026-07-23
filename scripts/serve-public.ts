#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve routes
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Local portal + static public/ server with live ops/catalog/registry APIs.
 *
 *   bun scripts/serve-public.ts
 *   open http://127.0.0.1:3000/portal/ops/
 *
 * Routing (Bun.serve `routes` + `fetch` fallback):
 *   routes  — SIMD-matched exact API + monitoring + ready/health handlers
 *   fetch   — publish mutations, npm-compatible PUT, static public/*, catch-all
 *
 * Paths:
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
import type { BunRequest } from 'bun';
import { Database } from 'bun:sqlite';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { collectMonitoring, renderMonitoringHtml } from '../lib/monitoring/index.ts';
import { DODVerifier } from '../lib/dod/verifier.ts';
import {
  bearerToken,
  configuredPublishToken,
  decidePublishAuth,
} from '../lib/registry/publish-auth.ts';
import { envCheckForHealth } from '../lib/env-check.ts';
import {
  computeDataETag,
  isFresh,
  notModified,
  respondWithSharedETag,
} from '../lib/http/data-etag.ts';
import {
  getRouteStats,
  preloadStaticMap,
  respondAuto,
  respondStatic,
  type PreloadedStatic,
} from '../lib/http/static-response.ts';

const PORT = Number(Bun.env.PORT || 3000);
/** Loopback by default — set HOST=0.0.0.0 only when intentional LAN bind. */
const HOST = (Bun.env.HOST || Bun.env.BIND_HOST || '127.0.0.1').trim() || '127.0.0.1';
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

/** Fail-closed publish gate — 503 unconfigured, 401 bad/missing Bearer. */
async function requirePublishAuth(req: Request): Promise<Response | null> {
  const decision = await decidePublishAuth(req);
  if (decision.ok) return null;
  return json(
    decision.hint ? { error: decision.error, hint: decision.hint } : { error: decision.error },
    decision.status
  );
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

/** GET /api/registry/static — aggregated snapshot with monitoring + proof. */
async function serveStaticRegistry(): Promise<Response> {
  const f = Bun.file('public/registry/static.json');
  if (await f.exists())
    return new Response(f, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  // Fallback to live aggregation
  const reg = await readRegistry();
  const db = openOperationsDb({ path: dbPath });
  let ops: Record<string, unknown> = {};
  try {
    ops = buildOpsSummary(db, 'live') as Record<string, unknown>;
  } catch {}
  db.close();
  const proofFile = Bun.file('tools/bun-api-coverage-proof.json');
  let proof: Record<string, unknown> = {};
  if (await proofFile.exists())
    try {
      proof = JSON.parse(await proofFile.text());
    } catch {}
  const snapshot = {
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    packageCount: reg?.packages ? Object.keys(reg.packages).length : 0,
    packages: reg?.packages || {},
    ops,
    bunApiProof: proof,
  };
  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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
  const authErr = await requirePublishAuth(req);
  if (authErr) return authErr;
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
  const authErr = await requirePublishAuth(req);
  if (authErr) return authErr;
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
// Hot small registry JSON → memory static-route (ETag); everything else → Bun.file
// @see lib/http/static-response.ts

const HOT_STATIC_PATHS = [
  'public/registry/ops-summary.json',
  'public/registry/static.json',
  'public/registry/monitoring.json',
  'public/registry/registry.json',
  'public/registry/@factorywager/bun-utils-test/latest.json',
  'public/registry/@factorywager/routing-test/latest.json',
  'public/registry/@factorywager/registry-snapshot/latest.json',
  'public/registry/@factorywager/proof-packages.json',
  'tools/bun-api-coverage-proof.json',
];

const hotStatic = await preloadStaticMap(HOT_STATIC_PATHS, { optional: true });
// Key by URL path (/registry/...)
const hotByUrl = new Map<string, PreloadedStatic>();
for (const [fsPath, asset] of hotStatic) {
  hotByUrl.set('/' + fsPath.replace(/^public\//, ''), asset);
}

// Route aliases for preloaded assets
const proofAsset = hotStatic.get('tools/bun-api-coverage-proof.json');
if (proofAsset) {
  hotByUrl.set('/api/proof', proofAsset);
  hotByUrl.set('/api/proof/', proofAsset);
}

const fileRouteCache = new Map<string, PreloadedStatic>();

async function staticFile(
  pathname: string,
  request: Request = new Request('http://local/')
): Promise<Response | null> {
  let path = pathname === '/' ? '/index.html' : pathname;
  if (path.endsWith('/')) path = `${path}index.html`;

  const hot = hotByUrl.get(path);
  if (hot) {
    return respondStatic(hot, request, { cacheControl: 'public, max-age=30' });
  }

  let fsPath = `public${path}`;
  let file = Bun.file(fsPath);
  if (!(await file.exists()) && !path.endsWith('.html') && !path.includes('.')) {
    fsPath = `public${path}/index.html`;
    file = Bun.file(fsPath);
    path = `${path}index.html`.replace(/\/+/g, '/');
  }
  if (!(await file.exists())) return null;

  return respondAuto(fsPath, request, {
    cache: fileRouteCache,
    cacheControl: path.startsWith('/registry/') ? 'public, max-age=60' : 'public, max-age=300',
  });
}

// ── Server ──────────────────────────────────────────────────────────

const startedAt = Date.now();

/** GET /api/monitoring — registry + ops metrics + API proof (JSON). */
async function liveMonitoringApi(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      const data = (await collectMonitoring(db, {
        source: 'live',
        uptimeOriginMs: startedAt,
      })) as Record<string, unknown>;
      // Append Bun API proof status
      const proofFile = Bun.file('tools/bun-api-coverage-proof.json');
      if (await proofFile.exists()) {
        const proof = JSON.parse(await proofFile.text());
        data.bunApiProof = {
          generated: proof.generated,
          bunVersion: proof.bunVersion,
          demosTotal: proof.summary?.demos ?? 0,
          demosPassed: proof.summary?.demosPassed ?? 0,
          apisTotal: proof.summary?.apis ?? 0,
          apisVerified: proof.summary?.apisVerified ?? 0,
          allPassed: proof.summary?.demosPassed === proof.summary?.demos,
        };
      }
      data.routeStats = routeStatsForHealth();
      data.env = envCheckForHealth();
      return json(data);
    } finally {
      db.close();
    }
  } catch (err) {
    const snap = Bun.file('public/registry/monitoring.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      return json({
        ...data,
        source: 'snapshot',
        fallback: 'db-unavailable',
        routeStats: routeStatsForHealth(),
      });
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
    const staticRes = await staticFile('/monitoring/', new Request('http://local/monitoring/'));
    if (staticRes) return staticRes;
    return new Response('Monitoring unavailable', { status: 503 });
  }
}

/** Health data TTL — regenerate underlying payload every 5s; ETag is data-scoped. */
const HEALTH_TTL_MS = 5_000;
let healthDataCache: { data: Record<string, unknown>; etag: string; at: number } | null = null;

function routeStatsForHealth() {
  return getRouteStats([hotByUrl, fileRouteCache]);
}

/**
 * Fields that change every second must not enter the shared data ETag
 * (uptime, hit counters) — otherwise JSON and /health/pre never share a 304.
 */
function healthETagPayload(data: Record<string, unknown>): Record<string, unknown> {
  const { uptimeSeconds: _u, routeStats, ...rest } = data;
  const rs = routeStats as Record<string, unknown> | undefined;
  return {
    ...rest,
    routeStats: rs
      ? {
          staticRoutes: rs.staticRoutes,
          fileRoutes: rs.fileRoutes,
          totalMemoryUsed: rs.totalMemoryUsed,
          decision: rs.decision,
        }
      : undefined,
  };
}

async function collectHealthData(): Promise<{
  data: Record<string, unknown>;
  etag: string;
}> {
  const now = Date.now();
  if (healthDataCache && now - healthDataCache.at < HEALTH_TTL_MS) {
    return { data: healthDataCache.data, etag: healthDataCache.etag };
  }

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

  const reg = await readRegistry();
  const pkgCount = reg?.packages ? Object.keys(reg.packages).length : 0;
  const versionCount = reg?.packages
    ? Object.values(reg.packages).reduce(
        (sum: number, p: any) => sum + (p.versions?.length || 0),
        0
      )
    : 0;

  const proofFile = Bun.file('tools/bun-api-coverage-proof.json');
  let proofStatus: Record<string, unknown> = { available: false };
  if (await proofFile.exists()) {
    try {
      const proof = JSON.parse(await proofFile.text());
      proofStatus = {
        available: true,
        generated: proof.generated,
        demosPassed: proof.summary?.demosPassed,
        demosTotal: proof.summary?.demos,
        apisVerified: proof.summary?.apisVerified,
      };
    } catch {
      /* ignore */
    }
  }

  const routeStats = routeStatsForHealth();
  const envCheck = envCheckForHealth();
  const data: Record<string, unknown> = {
    status: envCheck.summary.requiredMissing > 0 ? 'degraded' : 'ok',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    bun: Bun.version,
    platform: process.arch + ' ' + process.platform,
    artifacts: { opsSummary: { exists, generated, ageSeconds } },
    registry: { packages: pkgCount, versions: versionCount },
    bunApiProof: proofStatus,
    routeStats,
    env: envCheck,
    serve: {
      strategies: {
        static: 'memory + ETag + If-None-Match (hot registry JSON, health)',
        file: 'Bun.file stream + Last-Modified + Range (large / changing)',
        hybrid: '≤512KiB first hit → static cache; else file',
      },
      etagScope: 'shared-data across /health and /health/pre (Vary: Accept)',
      hotPreloaded: [...hotByUrl.keys()],
    },
  };

  const etag = computeDataETag(healthETagPayload(data));
  healthDataCache = { data, etag, at: now };
  return { data, etag };
}

function renderHealthPlain(data: Record<string, unknown>): string {
  const lines: string[] = [
    '╔══════════════════════════════════════════╗',
    '║     FactoryWager · Health Diagnostics    ║',
    '╚══════════════════════════════════════════╝',
    '',
    `  Status:    ${data.status}`,
    `  Uptime:    ${formatDuration(data.uptimeSeconds as number)}`,
    `  Runtime:   Bun ${data.bun} (${data.platform})`,
    `  PID:       ${process.pid}`,
    `  Started:   ${new Date(startedAt).toISOString()}`,
    '',
    '── Registry ──────────────────────────────',
    `  Packages:  ${(data.registry as Record<string, number>)?.packages ?? '?'}`,
    `  Versions:  ${(data.registry as Record<string, number>)?.versions ?? '?'}`,
    '',
    '── Artifacts ─────────────────────────────',
    `  Ops summary: ${((data.artifacts as Record<string, unknown>)?.opsSummary as Record<string, unknown>)?.exists ? 'yes' : 'no'}`,
    `  Generated:   ${((data.artifacts as Record<string, unknown>)?.opsSummary as Record<string, unknown>)?.generated ?? '—'}`,
    '',
    '── Bun API Proof ────────────────────────',
  ];
  const proof = (data.bunApiProof as Record<string, unknown>) || {};
  if (proof.available) {
    lines.push(`  Generated:   ${proof.generated}`);
    lines.push(`  Demos:       ${proof.demosPassed}/${proof.demosTotal} passed`);
    lines.push(`  APIs:        ${proof.apisVerified} verified`);
  } else {
    lines.push('  Not generated — run bun run docs:api-verify --write');
  }
  const rs = (data.routeStats as Record<string, unknown>) || {};
  lines.push(
    '',
    '── Route strategy ────────────────────────',
    `  Static (memory): ${rs.staticRoutes ?? 0} · hits ${rs.staticHits ?? 0}`,
    `  File (stream):   ${rs.fileRoutes ?? 0} · hits ${rs.fileHits ?? 0}`,
    `  304 responses:   ${rs.notModified304 ?? 0}`,
    `  Memory used:     ${Math.round(Number(rs.totalMemoryUsed ?? 0) / 1024)} KiB`,
    `  Rule:            ${((rs.decision as Record<string, string>) || {}).rule ?? '—'}`,
    `  ETag:            shared data scope (JSON + plain)`,
    '',
  );
  const env = (data.env as { summary?: Record<string, number>; requiredMissingKeys?: string[] }) || {};
  if (env.summary) {
    lines.push(
      '── Environment ───────────────────────────',
      `  Checklist:    ${env.summary.ok}/${env.summary.total} ok`,
      `  Required gaps:${env.summary.requiredMissing ?? 0}`,
      `  Missing keys: ${(env.requiredMissingKeys || []).join(', ') || '—'}`,
      ''
    );
  }
  lines.push(`  Checked at: ${new Date().toISOString()}`, '');
  return lines.join('\n');
}

/** GET /health — JSON; ETag = data hash (shared with /health/pre). */
async function health(req: Request = new Request('http://local/health')): Promise<Response> {
  const { data, etag } = await collectHealthData();
  // Refresh volatile uptime for body while keeping shared etag
  const body = {
    ...data,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };
  return respondWithSharedETag(
    req,
    healthETagPayload(data),
    {
      body: JSON.stringify(body),
      contentType: 'application/json; charset=utf-8',
    },
    {
      etag,
      cacheControl: 'public, max-age=5, must-revalidate',
      vary: 'Accept',
      extraHeaders: { 'X-ETag-Scope': 'health-data' },
    }
  );
}

/** GET /health/pre — plain diagnostics; same data ETag as /health. */
async function healthHtml(req: Request = new Request('http://local/health/pre')): Promise<Response> {
  const { data, etag } = await collectHealthData();
  const live = {
    ...data,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };
  if (isFresh(req, etag)) {
    return notModified(etag, { vary: 'Accept', cacheControl: 'public, max-age=5, must-revalidate' });
  }
  return respondWithSharedETag(
    req,
    healthETagPayload(data),
    {
      body: renderHealthPlain(live),
      contentType: 'text/plain; charset=utf-8',
    },
    {
      etag,
      cacheControl: 'public, max-age=5, must-revalidate',
      vary: 'Accept',
      extraHeaders: { 'X-ETag-Scope': 'health-data' },
    }
  );
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

/** GET /api/proof — Bun API coverage proof status. */
async function bunApiProof(): Promise<Response> {
  const proofFile = Bun.file('tools/bun-api-coverage-proof.json');
  if (!(await proofFile.exists()))
    return json({ error: 'No proof manifest generated yet — run bun run docs:api-verify' }, 404);
  const proof = JSON.parse(await proofFile.text());
  return json({
    generated: proof.generated,
    bunVersion: proof.bunVersion,
    summary: proof.summary,
    demoPassRate: proof.summary?.demos
      ? `${Math.round((proof.summary.demosPassed / proof.summary.demos) * 100)}%`
      : '0%',
    allPassed: proof.summary?.demosPassed === proof.summary?.demos,
  });
}

/** GET /api/env — read-only env var status with HSL health indicators. */
async function envStatus(): Promise<Response> {
  const critical = [
    ['CLOUDFLARE_API_TOKEN', 'Cloudflare API token for MCP + deploys'],
    ['FACTORY_WAGER_TOKEN', 'Registry scope auth token'],
    ['REGISTRY_SECRET', 'Local publish auth secret'],
    ['R2_ACCESS_KEY_ID', 'R2/S3 access key for artifact storage'],
    ['R2_SECRET_ACCESS_KEY', 'R2/S3 secret key'],
    ['R2_ACCOUNT_ID', 'Cloudflare account ID'],
  ];
  const optional = [
    ['NODE_ENV', 'Runtime environment', 'production'],
    ['PORT', 'Server port', '3000'],
    ['HOST', 'Server bind address', '127.0.0.1'],
    ['BUN_CONSOLE_DEPTH', 'Console inspect depth', '4'],
    ['SLACK_WEBHOOK_URL', 'Slack alert webhook'],
    ['TELEGRAM_BOT_TOKEN', 'Telegram alert bot token'],
    ['TELEGRAM_OPS_CHAT_ID', 'Telegram ops chat ID'],
  ];

  function hue(val: string | undefined, expected?: string): number {
    if (!val || !val.trim()) return 0;
    if (!expected || val.trim() === expected) return 120;
    return 45;
  }

  const crit = critical.map(([key, desc]) => {
    const val = Bun.env[key];
    const h = hue(val);
    return { key, desc, actual: val ? '••••' + val.slice(-4) : null, set: !!val, hue: h, hsl: `hsl(${h}, 70%, ${h === 0 ? 40 : 50}%)` };
  });

  const opt = optional.map(([key, desc, expected]) => {
    const val = Bun.env[key];
    const h = hue(val, expected);
    return { key, desc, actual: val ?? '', default: expected, set: !!val, match: val === expected, hue: h, hsl: `hsl(${h}, 60%, 45%)` };
  });

  return json({ critical: crit, optional: opt, generated: new Date().toISOString() });
}

/**
 * Optional read auth — set REGISTRY_SECRET (or REGISTRY_AUTH as the bearer secret).
 * Mode keywords from .env.registry.example (`token`/`jwt`/`basic`/`none`) are ignored
 * so they are never treated as the literal password.
 */
function requireReadAuth(req: Request): Response | null {
  const modeish = new Set(['token', 'jwt', 'basic', 'none']);
  const authEnv = (Bun.env.REGISTRY_AUTH || '').trim();
  const expected =
    (Bun.env.REGISTRY_SECRET || '').trim() ||
    (authEnv && !modeish.has(authEnv.toLowerCase()) ? authEnv : '');
  if (!expected) return null;
  const provided = bearerToken(req);
  // Sync path: hash via Bun.CryptoHasher for constant-time string compare without async.
  const a = new Bun.CryptoHasher('sha256').update(provided).digest();
  const b = new Bun.CryptoHasher('sha256').update(expected).digest();
  if (a.byteLength !== b.byteLength) return json({ error: 'Unauthorized' }, 401);
  let mismatch = 0;
  for (let i = 0; i < a.byteLength; i++) mismatch |= a[i]! ^ b[i]!;
  if (mismatch !== 0) return json({ error: 'Unauthorized' }, 401);
  return null;
}

async function fetchHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Health endpoint — no auth
  if (path === '/health' || path === '/health/') return health(req);
  if (path === '/health/pre' || path === '/health/pre/') return healthHtml(req);

  // Bun API proof status
  if (path === '/api/proof' || path === '/api/proof/') return bunApiProof();
  if (path === '/api/env' || path === '/api/env/') return envStatus();

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

  const staticRes = await staticFile(path, req);
  if (staticRes) return staticRes;

  return new Response('Not found', { status: 404 });
}

/**
 * Exact SIMD-matched routes. Named params work; bare `*` wildcards do not
 * populate `req.params` on this runtime — multi-segment paths stay in `fetch`.
 */
function buildPublicRoutes() {
  /** Static ready probe — zero-allocation cloneable response. */
  const ready = new Response('Ready', {
    headers: { 'X-Ready': '1', 'Cache-Control': 'no-store' },
  });

  /** Pre-buffered portal index — zero filesystem I/O on requests. */

  return {
    '/ready': ready,

    // Dynamic health (handler — not frozen Response)
    '/health': (req: Request) => health(req),
    '/health/pre': (req: Request) => healthHtml(req),
    '/health/pre/': (req: Request) => healthHtml(req),

    '/api/proof': (req: Request) => {
      const hot = hotByUrl.get('/api/proof');
      if (hot) return respondStatic(hot, req, { cacheControl: 'public, max-age=30' });
      return bunApiProof();
    },
    '/api/monitoring': () => liveMonitoringApi(),
    '/api/operations/summary': () => liveOpsSummary(),
    '/api/catalog': (req: Request) => liveCatalog(req),
    '/api/dod': (req: Request) => dodApi(req),
    '/api/channels/events': (req: Request) => channelsEvents(req),

    '/api/registry': () => serveRegistryIndex(),
    '/api/registry/registry.json': () => serveRegistryIndex(),
    '/api/registry/static': () => serveStaticRegistry(),
    '/api/registry/search': (req: Request) => searchRegistry(req),

    // Unscoped package detail + versions (named params — type-safe)
    '/api/registry/:package': (req: BunRequest<'/api/registry/:package'>) => {
      const name = req.params.package;
      if (name === 'search' || name === 'registry.json' || name === 'static') {
        return json({ error: 'Not found' }, 404);
      }
      return packageDetail(name);
    },
    '/api/registry/:package/versions': {
      GET: (req: BunRequest<'/api/registry/:package/versions'>) => listVersions(req.params.package),
      POST: (req: BunRequest<'/api/registry/:package/versions'>) =>
        publishVersion(req, req.params.package),
    },

    // Unencoded scoped package: /api/registry/@scope/name[/versions]
    '/api/registry/:scope/:name': (req: BunRequest<'/api/registry/:scope/:name'>) => {
      const { scope, name } = req.params;
      if (!scope.startsWith('@')) return json({ error: 'Not found' }, 404);
      return packageDetail(`${scope}/${name}`);
    },
    '/api/registry/:scope/:name/versions': {
      GET: (req: BunRequest<'/api/registry/:scope/:name/versions'>) =>
        listVersions(`${req.params.scope}/${req.params.name}`),
      POST: (req: BunRequest<'/api/registry/:scope/:name/versions'>) =>
        publishVersion(req, `${req.params.scope}/${req.params.name}`),
    },

    '/monitoring': () => monitoringPage(),

    // Portal — file-route with Last-Modified / Range; small HTML can cache in respondAuto
    '/portal': (req: Request) =>
      respondAuto('public/portal/index.html', req, { cacheControl: 'public, max-age=60' }),
    '/portal/': (req: Request) =>
      respondAuto('public/portal/index.html', req, { cacheControl: 'public, max-age=60' }),
  };
}

function startServer(preferred: number, maxTries = 20): { port: number; hostname: string } {
  let lastErr: unknown;
  const routes = buildPublicRoutes();

  for (let i = 0; i < maxTries; i++) {
    const port = preferred + i;
    try {
      const server = Bun.serve({
        port,
        hostname: HOST,
        routes,
        // Mutations, multi-segment static, npm-compat, tenants, everything else
        fetch: fetchHandler,
      });
      return { port: server.port, hostname: server.hostname };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('EADDRINUSE') && !msg.includes('port')) throw e;
    }
  }
  console.error(`
Port ${preferred}–${preferred + maxTries - 1} busy on ${HOST}.

  # Use the server already on :${preferred} (if it is serve-public):
  open http://127.0.0.1:${preferred}/portal/ops/

  # Or free the port, then re-run:
  lsof -nP -iTCP:${preferred} -sTCP:LISTEN
  kill <PID>

  # Or pick a free port:
  PORT=3010 bun scripts/serve-public.ts
  # LAN bind (explicit only): HOST=0.0.0.0 bun scripts/serve-public.ts
`);
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const { port: boundPort, hostname: boundHost } = startServer(PORT);
const base = `http://${boundHost === '0.0.0.0' ? '127.0.0.1' : boundHost}:${boundPort}`;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

console.log(`Local portal:  ${base}/portal/ops/`);
console.log(`Monitoring:    ${base}/monitoring`);
console.log(`Live API:      ${base}/api/operations/summary`);
console.log(`Monitoring API ${base}/api/monitoring`);
console.log(`Registry:      ${base}/api/registry`);
console.log(`Catalog:       ${base}/api/catalog`);
console.log(`Prediction:    ${base}/registry/prediction/report.html`);
const publishReady = Boolean(configuredPublishToken());
console.log(
  publishReady
    ? `Publish:       PUT ${base}/{name} (Bearer REGISTRY_SECRET required)`
    : `Publish:       disabled — set REGISTRY_SECRET or FACTORY_WAGER_TOKEN`
);
console.log(`Bind: ${boundHost}:${boundPort}  DB: ${dbPath}`);
if (boundPort !== PORT) {
  console.log(`(preferred PORT=${PORT} was busy — bound ${boundPort})`);
}

// In-process Bun.cron complement: refresh snapshots while the portal is up.
// UTC schedule, no-overlap (next fire waits for snapshot Promise).
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
if (Bun.env.OPS_SNAPSHOT_CRON === '1') {
  const { registerOpsSnapshotCron, OPS_SNAPSHOT_SCHEDULE } = await import(
    '../lib/operations/snapshot-cron.ts'
  );
  registerOpsSnapshotCron();
  console.log(
    `Cron:          ops-snapshot @ ${OPS_SNAPSHOT_SCHEDULE} UTC (in-process Bun.cron, no-overlap)`
  );
}

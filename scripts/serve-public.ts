#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @updated Bun.serve · fixed v0.1.4 · 2022-07-13 · https://bun.com/blog/bun-v0.1.4
// @updated Bun.serve · changed v0.1.6 · 2022-08-01 · https://bun.com/blog/bun-v0.1.6
// @updated Bun.serve · changed v0.1.9 · 2022-08-18 · https://bun.com/blog/bun-v0.1.9
// @updated Bun.serve · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.serve · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.serve · changed v0.2.1 · 2022-10-19 · https://bun.com/blog/bun-v0.2.1
// @updated Bun.serve · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.serve · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.serve · fixed v0.5.7 · 2023-02-24 · https://bun.com/blog/bun-v0.5.7
// @updated Bun.serve · changed v0.5.9 · 2023-04-04 · https://bun.com/blog/bun-v0.5.9
// @updated Bun.serve · fixed v0.6.3 · 2023-05-22 · https://bun.com/blog/bun-v0.6.3
// @updated Bun.serve · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.serve · changed v0.6.9 · 2023-06-13 · https://bun.com/blog/bun-v0.6.9
// @updated Bun.serve · changed v0.8.0 · 2023-08-24 · https://bun.com/blog/bun-v0.8.0
// @updated Bun.serve · changed v0.8.1 · 2023-08-26 · https://bun.com/blog/bun-v0.8.1
// @updated Bun.serve · changed v1.0.0 · 2023-09-08 · https://bun.com/blog/bun-v1.0
// @updated Bun.serve · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.serve · changed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated Bun.serve · fixed v1.0.11 · 2023-11-08 · https://bun.com/blog/bun-v1.0.11
// @updated Bun.serve · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated Bun.serve · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.serve · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.serve · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.serve · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.serve · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.serve · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.serve · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.serve · fixed v1.0.33 · 2024-03-17 · https://bun.com/blog/bun-v1.0.33
// @updated Bun.serve · fixed v1.0.34 · 2024-03-22 · https://bun.com/blog/bun-v1.0.34
// @updated Bun.serve · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.serve · fixed v1.1.2 · 2024-04-06 · https://bun.com/blog/bun-v1.1.2
// @updated Bun.serve · fixed v1.1.3 · 2024-04-08 · https://bun.com/blog/bun-v1.1.3
// @updated Bun.serve · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated Bun.serve · changed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.serve · fixed v1.1.7 · 2024-05-03 · https://bun.com/blog/bun-v1.1.7
// @updated Bun.serve · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.serve · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.serve · fixed v1.1.10 · 2024-05-24 · https://bun.com/blog/bun-v1.1.10
// @updated Bun.serve · changed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.serve · fixed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.serve · fixed v1.1.19 · 2024-07-12 · https://bun.com/blog/bun-v1.1.19
// @updated Bun.serve · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.serve · changed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.serve · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.serve · fixed v1.1.23 · 2024-08-14 · https://bun.com/blog/bun-v1.1.23
// @updated Bun.serve · changed v1.1.25 · 2024-08-21 · https://bun.com/blog/bun-v1.1.25
// @updated Bun.serve · changed v1.1.26 · 2024-08-24 · https://bun.com/blog/bun-v1.1.26
// @updated Bun.serve · changed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.serve · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.serve · changed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.serve · changed v1.1.31 · 2024-10-18 · https://bun.com/blog/bun-v1.1.31
// @updated Bun.serve · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.serve · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated Bun.serve · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.serve · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.serve · changed v1.1.44 · 2025-01-16 · https://bun.com/blog/bun-v1.1.44
// @updated Bun.serve · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.serve · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.serve · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.serve · fixed v1.2.4 · 2025-02-26 · https://bun.com/blog/bun-v1.2.4
// @updated Bun.serve · changed v1.2.5 · 2025-03-11 · https://bun.com/blog/bun-v1.2.5
// @updated Bun.serve · fixed v1.2.5 · 2025-03-11 · https://bun.com/blog/bun-v1.2.5
// @updated Bun.serve · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.serve · changed v1.2.7 · 2025-03-27 · https://bun.com/blog/bun-v1.2.7
// @updated Bun.serve · fixed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.serve · changed v1.2.12 · 2025-05-04 · https://bun.com/blog/bun-v1.2.12
// @updated Bun.serve · changed v1.2.14 · 2025-05-21 · https://bun.com/blog/bun-v1.2.14
// @updated Bun.serve · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.serve · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.serve · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated Bun.serve · fixed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated Bun.serve · fixed v1.2.23 · 2025-09-28 · https://bun.com/blog/bun-v1.2.23
// @updated Bun.serve · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.serve · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.serve · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.serve · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.serve · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated Bun.serve · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.serve · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.serve · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.serve · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.serve · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.serve · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.serve · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.serve · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.serve · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/http/server
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — BUN_PORT / PORT / NODE_PORT
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port + hostname
// @see https://bun.com/docs/runtime/http/routing — static paths, params, wildcards, fetch fallback
// @see https://bun.com/docs/runtime/http/routing#static-responses — zero-alloc Response routes
// @see https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses — memory vs Bun.file
// @see https://bun.com/docs/runtime/http/routing#fetch-request-handler — fetch(req, server)
// @see https://bun.com/docs/runtime/http/error-handling — development + error callback
// @see https://bun.com/docs/runtime/http/server#server-stop — server.stop
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/hot-reloading — bun --hot (server module re-eval)
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Content-Type
// @see https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata — FormData upload
// @see https://bun.com/docs/runtime/image — Bun.Image avatar route
/**
 * Local portal + static public/ server with live ops/catalog/registry APIs.
 *
 *   bun scripts/serve-public.ts
 *   bun --hot scripts/serve-public.ts      # soft reload server TS (see docs/portal-foundation.md)
 *   bun --watch scripts/serve-public.ts    # hard restart process
 *   bun run serve:public:hot               # same as --hot (flag embedded in package.json script)
 *   open http://127.0.0.1:3000/portal/ops/
 *
 * Bun flags (--hot, --watch, --port) must come immediately after `bun`, not after `run`.
 * @see https://bun.com/docs/runtime/watch-mode
 * @see https://bun.com/docs/runtime#watch
 *
 * Browser live-reload (SSE /__hmr) is ON for loopback by default.
 *   SERVE_PUBLIC_HMR=0  disable
 *   SERVE_PUBLIC_HMR=1  force on (any bind)
 *
 * Routing — Bun native recommendations (docs/runtime/http/routing):
 *   routes  — SIMD match: exact > :param > wildcard; static Response for /ready
 *             hot JSON via respondStatic (ETag); portal pages via respondAuto/file
 *             JSON GET APIs via jsonETag → data-ETag + If-None-Match 304
 *   fetch   — unmatched only (publish, npm PUT, multi-segment static, 404)
 *             signature fetch(req, server) for requestIP / timeout on real sockets
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
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import type { BunRequest } from 'bun';
import { Database } from 'bun:sqlite';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { sleep } from '../lib/time.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { jsonWithDataSource, withDataSource } from '../lib/http/data-source.ts';
import {
  handleLimitRaiseAgentRequest,
  handleLimitRecordRequest,
  handleLimitSummaryRequest,
  handleLimitAnalyzeRequest,
  handleLimitPredictCycleRequest,
  handleLimitPredictionsRequest,
} from '../lib/operations/limit-raise-agent-api.ts';
import { readLocalChannelEvents } from '../lib/channels/outbox.ts';
import { parseOpsChannelTopic } from '../lib/channels/ops-channel-event.ts';
import { collectMonitoring, renderMonitoringHtml } from '../lib/monitoring/index.ts';
import { DODVerifier } from '../lib/dod/verifier.ts';
import {
  bearerToken,
  configuredPublishToken,
  decidePublishAuth,
} from '../lib/registry/publish-auth.ts';
import { envCheckForHealth } from '../lib/env-check.ts';
import { avatarWebpResponse } from '../lib/images/avatar-response.ts';
import {
  computeDataETag,
  isFresh,
  notModified,
  respondWithSharedETag,
} from '../lib/http/data-etag.ts';
import {
  parseNetworkingProofArtifact,
  toMonitoringNetworkingReport,
  NETWORKING_REPORT_TYPES,
  NETWORKING_PROOF_SCHEMA_VERSION,
} from '../lib/http/networking-proof.ts';
import {
  getRouteStats,
  preloadStaticMap,
  respondAuto,
  respondFile,
  respondStatic,
  type PreloadedStatic,
} from '../lib/http/static-response.ts';
import { portalCorsHeaders, portalOptionsResponse } from '../lib/http/portal-cors.ts';
import {
  LiveReloadHub,
  maybeInjectLiveReloadResponse,
  shouldEnableLiveReload,
} from '../lib/http/live-reload.ts';
import { formString, requireFormBlob, sha256Blob, writeFormBlob } from '../lib/http/form-upload.ts';
import {
  contentTypePolicyTableRows,
  summarizeContentTypeMatrix,
} from '../lib/http/content-type.ts';
import { buildPortalEnvStatus } from '../lib/http/portal-env-status.ts';
import { parsePortalMdPath } from '../lib/http/portal-nav.ts';
import {
  portalMarkdownExists,
  portalMarkdownRaw,
  renderPortalMarkdownPage,
} from '../lib/http/portal-markdown.ts';
import { llmsFullTxtBody, llmsTxtBody, PORTAL_MD_SLUGS } from '../lib/http/llms-txt.ts';
import {
  buildSkillDetail,
  buildSkillsCatalog,
  packageSkill,
  SkillPackageError,
  skillPackageExists,
} from '../lib/http/skills-catalog.ts';
import { renderSkillDetailPage, renderSkillNotFoundPage } from '../lib/http/portal-skill-detail.ts';
import {
  serveVerificationScript,
  serveVerificationScriptMeta,
} from '../lib/http/verification-scripts.ts';
import { resolvePublishReadme } from '../lib/registry/npm-publish-readme.ts';
import {
  assertServerPortUrlAligned,
  serveBindSnapshot,
  type BunServer,
  type BunServeOptions,
  type ServeBindSnapshot,
} from '../lib/http/bun-server.ts';
import { PORTAL_BOARD_SLUGS } from '../lib/http/portal-board-slugs.ts';
import { canonicalSlashRedirect } from '../lib/http/canonical-redirect.ts';
import { parseNpmPackageRequestPath } from '../lib/registry/npm-package-path.ts';
import { projectRSSAliasRoutes } from '../lib/rss/project-channel-registry.ts';
import {
  formatServePublicBindLines,
  writeServePublicBindManifest,
  type ServePublicBindManifest,
} from '../lib/http/serve-public-bind.ts';
import {
  loadServePublicToml,
  resolveServePublicBindPrefs,
} from '../lib/http/serve-public-config.ts';
import {
  attachServePublicErrorHandler,
  throwServePublicDevelopmentError,
} from '../lib/http/serve-public-error.ts';
import { isPublicReadPath } from '../lib/http/public-read-path.ts';
import { registryBoardRedirectFor } from '../lib/http/registry-board-negotiate.ts';
import { getDb, getMonitoringData } from '../lib/db/connection.ts';
import {
  agentOddsWebSocketHandlers,
  handleAgentOddsRequest,
  startAgentOddsBroadcast,
  stopAgentOddsBroadcast,
} from '../lib/operator-research/agent-odds-http.ts';

/** Unknown long-option allowlist (registry: serve:public). */
applyUnknownLongOptionGuardFor('serve:public', Bun.argv.slice(2));

/** Env/CLI/TOML bind prefs — omit port/hostname on Bun.serve when Bun env chain wins. */
const bindPrefs = resolveServePublicBindPrefs(await loadServePublicToml(), Bun.env, process.argv);
/** Hint for live-reload gating before listen (runtime uses `localhost` when hostname omitted). */
const BIND_HOST_HINT = bindPrefs.hostname ?? 'localhost';
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
/** Browser SSE live-reload (not Cloudflare Pages). */
const LIVE_RELOAD = shouldEnableLiveReload({ host: BIND_HOST_HINT });
/**
 * Bun.serve development flag — docs default true; we prefer false for prod-like
 * local/staging unless SERVE_PUBLIC_DEV=1 or NODE_ENV=development.
 */
const SERVE_DEVELOPMENT =
  Bun.env.SERVE_PUBLIC_DEV === '1' ||
  Bun.env.NODE_ENV === 'development' ||
  Bun.env.NODE_ENV === 'dev';

/** Active server for graceful stop (Bun Server interface). */
let activeServer: BunServer | null = null;

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

/**
 * JSON GET with strong data-ETag + If-None-Match → 304 (shared with health helpers).
 * Errors / non-objects stay on `json()` (no-store).
 * @see lib/http/data-etag.ts
 */
function jsonETag(
  req: Request,
  data: object,
  opts: { cache?: string; versionKey?: string; etagData?: object } = {}
): Response {
  const etagPayload = opts.etagData ?? data;
  const body = JSON.stringify(data);
  return respondWithSharedETag(
    req,
    etagPayload,
    { body, contentType: 'application/json; charset=utf-8' },
    {
      cacheControl: opts.cache ?? 'public, max-age=5, must-revalidate',
      versionKey: opts.versionKey,
      vary: 'Accept',
    }
  );
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

async function liveOpsSummary(req: Request): Promise<Response> {
  try {
    const res = jsonETag(req, buildOpsSummary(getDb(), 'live') as object, {
      versionKey: 'ops-summary-live',
    });
    return withDataSource(res, 'live');
  } catch (err) {
    // Fail-open to last good bake — read-only public boards must not 503 when SQLite is down.
    const snap = Bun.file('public/registry/ops-summary.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      const res = jsonETag(
        req,
        {
          ...data,
          source: 'snapshot',
          fallback: 'db-unavailable',
          dataSource: 'stale-cache',
        },
        { versionKey: 'ops-summary-snap' }
      );
      return withDataSource(res, 'stale-cache');
    }
    return jsonWithDataSource(
      {
        error: 'Failed to open operations DB',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      'none',
      { status: 503 }
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
    const db = getDb();
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
    return jsonETag(
      req,
      { source: 'live', accounts: db.query(sql).all(...params) },
      { versionKey: `catalog:${search}|${category}|${status}` }
    );
  } catch {
    const file = Bun.file('public/registry/catalog-snapshot.json');
    if (await file.exists()) {
      return jsonETag(req, (await file.json()) as object, { versionKey: 'catalog-snap' });
    }
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

async function serveRegistryIndex(req: Request): Promise<Response> {
  const reg = await readRegistry();
  if (!reg) return json({ error: 'No registry index' }, 404);
  return jsonETag(req, reg as object, {
    versionKey: 'registry-index',
    cache: 'public, max-age=30, must-revalidate',
  });
}

/** GET /api/registry/static — aggregated snapshot with monitoring + proof. */
async function serveStaticRegistry(req: Request): Promise<Response> {
  const f = Bun.file('public/registry/static.json');
  if (await f.exists()) {
    const data = (await f.json()) as object;
    return jsonETag(req, data, {
      versionKey: 'registry-static-file',
      cache: 'public, max-age=60, must-revalidate',
    });
  }
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
  const generated = new Date().toISOString();
  const snapshot = {
    generated,
    bunVersion: Bun.version,
    packageCount: reg?.packages ? Object.keys(reg.packages).length : 0,
    packages: reg?.packages || {},
    ops,
    bunApiProof: proof,
  };
  const { generated: _g, ...etagData } = snapshot;
  return jsonETag(req, snapshot, {
    versionKey: 'registry-static-live',
    etagData,
    cache: 'public, max-age=5, must-revalidate',
  });
}

async function searchRegistry(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase() || '';
  const type = url.searchParams.get('type')?.toLowerCase() || '';
  const reg = await readRegistry();
  if (!reg) return jsonETag(req, { results: [] }, { versionKey: 'registry-search-empty' });
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
  return jsonETag(
    req,
    { results, total: results.length },
    {
      versionKey: `registry-search:${q}|${type}`,
    }
  );
}

async function packageDetail(req: Request, name: string): Promise<Response> {
  const reg = await readRegistry();
  if (!reg) return json({ error: 'No registry' }, 404);
  const pkg = (reg.packages || {})[name];
  if (!pkg) return json({ error: 'Package not found' }, 404);
  return jsonETag(req, { name, ...pkg }, { versionKey: `pkg:${name}` });
}

// ── Version endpoints ───────────────────────────────────────────────

async function listVersions(req: Request, name: string): Promise<Response> {
  const reg = await readRegistry();
  const pkg = reg?.packages?.[name];
  if (!pkg) return jsonETag(req, { versions: [] }, { versionKey: `versions-empty:${name}` });
  return jsonETag(
    req,
    {
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
    },
    { versionKey: `versions:${name}` }
  );
}

async function publishVersion(req: Request, name: string): Promise<Response> {
  const authErr = await requirePublishAuth(req);
  if (authErr) return authErr;
  // Bun guide: await req.formData() → get fields → Bun.write(path, blob)
  const form = await req.formData();
  const filePart = requireFormBlob(form, 'file');
  if (!filePart.ok) return json({ error: filePart.error }, 400);
  const version = formString(form, 'version');
  if (!version) return json({ error: 'Version required' }, 400);
  const tags = (formString(form, 'tags') || '')
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean);
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(formString(form, 'metadata') || '{}');
  } catch {
    /* empty metadata */
  }
  const { blob } = filePart;
  const sha256 = await sha256Blob(blob);
  const size = blob.size;
  const storageDir = `public/registry/storage/${name}/${version}`;
  // Bun.write accepts Blob/File directly (no Buffer.copy)
  await writeFormBlob(`${storageDir}/artifact.tgz`, blob);
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
      size,
      checksum: sha256,
      contentType: blob.type || 'application/gzip',
    },
  };
  await Bun.write('public/registry/registry.json', `${JSON.stringify(reg, null, 2)}\n`);
  return json({ success: true, version, checksum: sha256, size });
}

// ── npm-compatible publish (bun publish) ────────────────────────────

async function npmPublish(req: Request, name: string): Promise<Response> {
  const authErr = await requirePublishAuth(req);
  if (authErr) return authErr;
  const ct = req.headers.get('content-type') || '';
  let version = '';
  let tarballBuf: Uint8Array | null = null;
  let publishBody: Record<string, unknown> | null = null;
  if (ct.includes('application/json')) {
    publishBody = (await req.json()) as Record<string, unknown>;
    version =
      publishBody['dist-tags']?.latest || Object.keys(publishBody.versions || {})[0] || '0.0.0';
    const attachments = publishBody._attachments as Record<string, { data?: string }> | undefined;
    if (attachments) {
      const data = attachments[Object.keys(attachments)[0]!]?.data;
      if (data) tarballBuf = Buffer.from(data, 'base64');
    }
  } else {
    tarballBuf = new Uint8Array(await req.arrayBuffer());
    version = `0.0.0-${Date.now()}`;
  }
  if (!tarballBuf) return json({ error: 'No tarball in request' }, 400);
  const manifest = await resolvePublishReadme(publishBody, version, tarballBuf);
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
    description: manifest.description ?? 'Published via bun publish',
    ...(manifest.dependencies ? { dependencies: manifest.dependencies } : {}),
    ...(manifest.readme
      ? { readme: manifest.readme, readmeFilename: manifest.readmeFilename ?? 'README.md' }
      : {}),
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

async function npmPackageMetadata(req: Request, name: string): Promise<Response> {
  const url = new URL(req.url);
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
      readme: rel.readme || undefined,
      readmeFilename: rel.readmeFilename || (rel.readme ? 'README.md' : undefined),
      dist: {
        tarball: `${url.origin}/registry/storage/${name.split('/').map(encodeURIComponent).join('/')}/${v}/artifact.tgz`,
        // npm SRI: sha256-<base64 of the 32 digest bytes> (hex string mislabeled
        // as SRI breaks install-time integrity verification).
        shasum: rel.storage?.checksum?.slice(0, 40) || '',
        integrity: rel.storage?.checksum
          ? `sha256-${Buffer.from(rel.storage.checksum, 'hex').toString('base64')}`
          : undefined,
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
    const { enrichDodEntries } = await import('../lib/dod/enrich-entry.ts');
    return json(enrichDodEntries(dodVerifier.list(status) as Record<string, unknown>[]));
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
  if (!SERVE_DEVELOPMENT) {
    const authErr = requireReadAuth(req);
    if (authErr) return authErr;
  }

  const url = new URL(req.url);
  const topicParam = url.searchParams.get('topic') || 'identity';
  const topic = parseOpsChannelTopic(topicParam) ?? 'identity';
  const since = parseInt(url.searchParams.get('since') || '0', 10);

  if (url.searchParams.get('stream') === '1') {
    let cursor = since;
    const stream = new ReadableStream({
      async pull(controller) {
        const events = await readLocalChannelEvents(topic, cursor);
        if (events.length === 0) {
          await sleep(2000);
          return;
        }
        for (const ev of events) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(ev)}\n\n`));
          cursor = ev.seq;
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      },
    });
  }

  const events = await readLocalChannelEvents(topic, since);
  return jsonETag(
    req,
    {
      topic,
      since,
      events,
      ok: true,
    },
    { versionKey: `channels:${topic}:${since}`, cache: 'no-store' }
  );
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
  'public/registry/prediction/report/index.html',
  'public/registry/prediction/report/summary.json',
  'public/registry/prediction/coverage-chart.svg',
  'public/registry/prediction/error-chart.svg',
  'public/registry/prediction/error-histogram.svg',
  'public/registry/prediction/rolling-mae.svg',
  'public/registry/networking-proof.json',
  'public/registry/install-env-proof.json',
  'public/registry/registry-client-proof.json',
  'public/registry/docs-coverage-proof.json',
  'public/registry/bun-runtime-nits-proof.json',
  'public/registry/doc-index.json',
  'tools/bun-api-coverage-proof.json',
];

/** Paths polled for browser live-reload (mtime via Bun.file). */
const WATCH_PATHS = [
  ...HOT_STATIC_PATHS,
  'public/portal/index.html',
  'public/portal/ops/index.html',
  'public/portal/skills/index.html',
  'public/portal/dashboard/index.html',
  'public/portal/limits/index.html',
  'public/portal/limits/limit-profiles.js',
  'public/portal/partner/index.html',
  'public/portal/partner/partner-board.js',
  'public/registry/partner-health.json',
  'public/portal/partner-history/index.html',
  'public/portal/glossary/index.html',
  'public/portal/glossary/glossary-board.js',
  'public/portal/components/glossary-ux.js',
  'public/registry/sportsbook-opening-baseline.json',
  'public/portal/operations-dashboard.js',
  'public/portal/dashboard.js',
  'public/portal/app.js',
  'public/portal/style.css',
  'public/monitoring/index.html',
  'public/monitoring/monitoring-dashboard.js',
];

const hotByUrl = new Map<string, PreloadedStatic>();
const fileRouteCache = new Map<string, PreloadedStatic>();

function rebuildHotUrlMap(hotStatic: Map<string, PreloadedStatic>): void {
  hotByUrl.clear();
  for (const [fsPath, asset] of hotStatic) {
    hotByUrl.set('/' + fsPath.replace(/^public\//, ''), asset);
  }
  const proofAsset = hotStatic.get('tools/bun-api-coverage-proof.json');
  if (proofAsset) {
    hotByUrl.set('/api/proof', proofAsset);
    hotByUrl.set('/api/proof/', proofAsset);
  }
}

async function refreshHotStatic(reason = 'reload'): Promise<void> {
  const hotStatic = await preloadStaticMap(HOT_STATIC_PATHS, { optional: true });
  rebuildHotUrlMap(hotStatic);
  fileRouteCache.clear();
  if (LIVE_RELOAD) {
    // reason is for logs; browser notify is driven by watcher
    void reason;
  }
}

// Initial preload
{
  const hotStatic = await preloadStaticMap(HOT_STATIC_PATHS, { optional: true });
  rebuildHotUrlMap(hotStatic);
}

const liveReloadHub = LIVE_RELOAD
  ? new LiveReloadHub({
      pollMs: 350,
      onChange: async path => {
        console.log(`[hmr] change ${path} — refresh preload cache`);
        await refreshHotStatic(path);
      },
    })
  : null;

async function withLiveReload(res: Response): Promise<Response> {
  return maybeInjectLiveReloadResponse(res, LIVE_RELOAD);
}

/** GET /registry/storage/{name}/{version}/artifact.tgz — decode scoped segments for disk lookup. */
async function serveRegistryStorage(pathname: string, request: Request): Promise<Response | null> {
  const prefix = '/registry/storage/';
  if (!pathname.startsWith(prefix) || !pathname.endsWith('/artifact.tgz')) return null;
  const rel = pathname.slice(prefix.length);
  const segments = rel.split('/').map(segment => decodeURIComponent(segment));
  if (segments.length < 3) return null;
  const fsPath = `public/registry/storage/${segments.join('/')}`;
  const file = Bun.file(fsPath);
  if (!(await file.exists())) return null;
  return respondAuto(fsPath, request, {
    cache: fileRouteCache,
    cacheControl: 'public, max-age=60',
  });
}

async function staticFile(
  pathname: string,
  request: Request = new Request('http://local/')
): Promise<Response | null> {
  let path = pathname === '/' ? '/index.html' : pathname;
  if (path.endsWith('/')) path = `${path}index.html`;

  const hot = hotByUrl.get(path);
  if (hot) {
    // Dev: no-store so browser picks up post-reload content
    const cache = LIVE_RELOAD ? 'no-store' : 'public, max-age=30';
    return withLiveReload(respondStatic(hot, request, { cacheControl: cache }));
  }

  let fsPath = `public${path}`;
  let file = Bun.file(fsPath);
  if (!(await file.exists()) && !path.endsWith('.html') && !path.includes('.')) {
    fsPath = `public${path}/index.html`;
    file = Bun.file(fsPath);
    path = `${path}index.html`.replace(/\/+/g, '/');
  }
  if (!(await file.exists())) return null;

  const cacheControl = LIVE_RELOAD
    ? 'no-store'
    : path.startsWith('/registry/')
      ? 'public, max-age=60, stale-while-revalidate=30'
      : 'public, max-age=300';
  // Skip memory cache for portal assets and mutable registry JSON when live-reload
  // is active. Registry bakes occur without changing this server module, so an
  // in-memory JSON response would otherwise remain pinned until process restart.
  const skipMemoryCache =
    LIVE_RELOAD &&
    (path.endsWith('.html') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.md') ||
      (path.startsWith('/registry/') && path.endsWith('.json')));
  const responseHeaders =
    path.startsWith('/feeds/v1/') && path.endsWith('.xml')
      ? { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      : path.endsWith('.mp4')
        ? { 'Content-Type': 'video/mp4' }
        : path.startsWith('/registry/')
          ? portalCorsHeaders()
          : undefined;
  const responseOptions = {
    cache: skipMemoryCache ? undefined : fileRouteCache,
    cacheControl,
    headers: responseHeaders,
  };
  // Limit raises are rebaked while the server is running. Keep this route on a
  // native BunFile response so every request sees current bytes and retains
  // Last-Modified / Range semantics instead of pinning a buffered first hit.
  const res =
    path === '/registry/limit-raises.json'
      ? await respondFile(fsPath, request, responseOptions)
      : await respondAuto(fsPath, request, responseOptions);
  return withLiveReload(withMarkdownAlternate(res, path));
}

/**
 * Advertise the machine-readable markdown alternate on portal HTML pages:
 *   Link: </portal/{slug}.md>; rel="alternate"; type="text/markdown"
 */
function withMarkdownAlternate(res: Response, path: string): Response {
  if (!path.endsWith('.html')) return res;
  let slug: string | null = null;
  if (path === '/portal/index.html') slug = 'index';
  else {
    const m = path.match(
      /^\/portal\/(ops|catalog|dod|health|env|monitoring|skills|dashboard|compliance)\/index\.html$/
    );
    if (m) slug = m[1]!;
  }
  if (!slug) return res;
  const headers = new Headers(res.headers);
  headers.append('Link', `</portal/${slug}.md>; rel="alternate"; type="text/markdown"`);
  return new Response(res.body, { status: res.status, headers });
}

// ── Server ──────────────────────────────────────────────────────────

const startedAt = Date.now();

/** GET /api/compliance — baked board snapshot (public read plane; no auth). */
async function complianceBoardApi(req: Request): Promise<Response> {
  const f = Bun.file('public/registry/compliance-board.json');
  if (!(await f.exists())) {
    return json(
      {
        ok: false,
        error: 'compliance-board missing — bun run compliance:bake',
        links: { portal: '/portal/compliance/', bake: 'bun run compliance:bake' },
      },
      503
    );
  }
  const board = await f.json();
  return jsonETag(
    req,
    { ok: true, mode: 'snapshot', readOnly: true, ...board },
    { versionKey: 'compliance-board', cache: 'public, max-age=30, must-revalidate' }
  );
}

/** GET /api/monitoring — registry + ops metrics + API proof (JSON). */
async function liveMonitoringApi(req: Request): Promise<Response> {
  try {
    const data = (await getMonitoringData({
      source: 'live',
      uptimeOriginMs: startedAt,
      includeInstallCache: false,
    })) as Record<string, unknown>;
    // Append Bun API proof status
    const proofFile = Bun.file('tools/bun-api-coverage-proof.json');
    if (await proofFile.exists()) {
      const proof = JSON.parse(await proofFile.text());
      data.bunApiProof = {
        generated: proof.generated,
        bunVersion: proof.runtime?.bunVersion ?? proof.bunVersion,
        demosTotal: proof.summary?.demos ?? 0,
        demosPassed: proof.summary?.demosPassed ?? 0,
        demoApisTotal: proof.summary?.uniqueDemoApis ?? proof.summary?.apis ?? 0,
        demoApisVerified: proof.summary?.demoApisVerified ?? proof.summary?.apisVerified ?? 0,
        allPassed: proof.summary?.demosPassed === proof.summary?.demos,
      };
    }
    data.routeStats = routeStatsForHealth();
    data.env = envCheckForHealth();
    // Append networking proof
    const netFile = Bun.file('public/registry/networking-proof.json');
    if (await netFile.exists()) {
      try {
        const parsed = parseNetworkingProofArtifact(await netFile.json());
        data.networkingProof = parsed ? toMonitoringNetworkingReport(parsed) : await netFile.json();
      } catch {}
    }
    // Append install env proof
    const envFile = Bun.file('public/registry/install-env-proof.json');
    if (await envFile.exists()) {
      try {
        data.installEnvProof = JSON.parse(await envFile.text());
      } catch {}
    }
    const rcFile = Bun.file('public/registry/registry-client-proof.json');
    if (await rcFile.exists()) {
      try {
        data.registryClientProof = JSON.parse(await rcFile.text());
      } catch {}
    }
    const nitsFile = Bun.file('public/registry/bun-runtime-nits-proof.json');
    if (await nitsFile.exists()) {
      try {
        data.bunRuntimeNitsProof = JSON.parse(await nitsFile.text());
      } catch {}
    }
    const docsCovFile = Bun.file('public/registry/docs-coverage-proof.json');
    if (await docsCovFile.exists()) {
      try {
        data.docsCoverageProof = JSON.parse(await docsCovFile.text());
      } catch {}
    }
    return jsonETag(req, data, {
      versionKey: 'monitoring-live',
      etagData: healthETagPayload(data),
      cache: 'public, max-age=5, must-revalidate',
    });
  } catch (err) {
    const snap = Bun.file('public/registry/monitoring.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      // Append proof files to snapshot fallback too
      const proofFiles = [
        ['bunApiProof', 'tools/bun-api-coverage-proof.json'],
        ['networkingProof', 'public/registry/networking-proof.json'],
        ['installEnvProof', 'public/registry/install-env-proof.json'],
        ['registryClientProof', 'public/registry/registry-client-proof.json'],
        ['docsCoverageProof', 'public/registry/docs-coverage-proof.json'],
        ['bunRuntimeNitsProof', 'public/registry/bun-runtime-nits-proof.json'],
        ['defaultsProof', 'public/registry/defaults-proof.json'],
      ];
      for (const [key, path] of proofFiles) {
        try {
          const f = Bun.file(path);
          if (await f.exists()) data[key] = JSON.parse(await f.text());
        } catch {}
      }
      const payload = {
        ...data,
        source: 'snapshot',
        fallback: 'db-unavailable',
        routeStats: routeStatsForHealth(),
      };
      return jsonETag(req, payload, {
        versionKey: 'monitoring-snap',
        etagData: healthETagPayload(payload),
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

/** GET /api/agents/v1/limits/raises — scoped, proofed multi-factor raise context. */
function agentLimitRaisesApi(req: Request): Response {
  const authErr = requireReadAuth(req);
  if (authErr) return authErr;
  const db = openOperationsDb({ path: dbPath });
  try {
    return handleLimitRaiseAgentRequest(req, db);
  } finally {
    db.close();
  }
}

/** POST /api/agents/v1/limits/record — record a limit snapshot (no auth, write-only). */
async function agentLimitRecordApi(req: Request): Promise<Response> {
  const db = openOperationsDb({ path: dbPath });
  try {
    return await handleLimitRecordRequest(req, db);
  } finally {
    db.close();
  }
}

/** GET /api/limits/summary — aggregate stats, public (no auth).
 *  ?format=table|text → Bun.inspect.table via LimitRaiseReport
 *  Fail-open to limit-raises bake when SQLite is unavailable.
 */
async function limitSummaryApi(req?: Request): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      return withDataSource(handleLimitSummaryRequest(db, req), 'live');
    } finally {
      db.close();
    }
  } catch (err) {
    const snap = Bun.file('public/registry/limit-raises.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      return jsonWithDataSource(
        {
          ...data,
          source: 'snapshot',
          fallback: 'db-unavailable',
          dataSource: 'stale-cache',
          detail: err instanceof Error ? err.message : String(err),
        },
        'stale-cache',
        { cache: 'public, max-age=30, must-revalidate' }
      );
    }
    return jsonWithDataSource(
      {
        error: 'Limits summary unavailable',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      'none',
      { status: 503 }
    );
  }
}

/** GET /api/limits/analyze — granular breakdown by book/sport/market + regulatory. */
async function limitAnalyzeApi(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      return withDataSource(handleLimitAnalyzeRequest(db), 'live');
    } finally {
      db.close();
    }
  } catch (err) {
    const snap = Bun.file('public/registry/limit-raises.json');
    if (await snap.exists()) {
      const data = (await snap.json()) as Record<string, unknown>;
      return jsonWithDataSource(
        {
          source: 'snapshot',
          fallback: 'db-unavailable',
          dataSource: 'stale-cache',
          note: 'Full granular analyze requires SQLite; serving limit-raises bake',
          detail: err instanceof Error ? err.message : String(err),
          bake: data,
        },
        'stale-cache',
        { cache: 'public, max-age=30, must-revalidate' }
      );
    }
    return jsonWithDataSource(
      {
        error: 'Limits analyze unavailable',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      'none',
      { status: 503 }
    );
  }
}

/** POST /api/limits/predictions — run prediction cycle. */
function limitPredictCycleApi(): Response {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      return withDataSource(handleLimitPredictCycleRequest(db), 'live');
    } finally {
      db.close();
    }
  } catch (err) {
    // Mutations cannot fail-open to a bake — keep 503 with provenance.
    return jsonWithDataSource(
      {
        error: 'Limit prediction cycle requires local SQLite',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      'none',
      { status: 503 }
    );
  }
}

/** GET /api/limits/predictions — latest prediction accuracy. */
async function limitPredictionsApi(): Promise<Response> {
  try {
    const db = openOperationsDb({ path: dbPath });
    try {
      return withDataSource(handleLimitPredictionsRequest(db), 'live');
    } finally {
      db.close();
    }
  } catch (err) {
    return jsonWithDataSource(
      {
        error: 'Limit predictions require local SQLite',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
        hint: 'Use ops:limits:predict locally or bake limit-raises for desk history',
      },
      'none',
      { status: 503 }
    );
  }
}

/** GET /monitoring — server-rendered Bun.inspect.table dashboard. */
async function monitoringPage(): Promise<Response> {
  try {
    const data = await getMonitoringData({
      source: 'live',
      uptimeOriginMs: startedAt,
      includeInstallCache: false,
    });
    return withLiveReload(
      new Response(renderMonitoringHtml(data), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    );
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

async function readNetworkingProofCompact(): Promise<Record<string, unknown>> {
  const f = Bun.file('public/registry/networking-proof.json');
  if (!(await f.exists())) return { available: false };
  try {
    const raw = await f.json();
    const parsed = parseNetworkingProofArtifact(raw);
    if (parsed) {
      const checksPassed = parsed.global.checksPassed;
      const checksTotal = parsed.global.checksTotal;
      return {
        available: true,
        reportType: parsed.reportType,
        schemaVersion: parsed.schemaVersion,
        generated: parsed.timestamp,
        proofHash: parsed.proofHash,
        checksPassed,
        checksTotal,
        targets: parsed.targets.length,
        allOk: parsed.allOk,
        degraded: !parsed.allOk,
      };
    }
    const p = raw as {
      proofHash?: string;
      timestamp?: string;
      global?: { checksPassed?: number; checksTotal?: number };
      targets?: unknown[];
    };
    const checksPassed = p.global?.checksPassed ?? 0;
    const checksTotal = p.global?.checksTotal ?? 0;
    return {
      available: true,
      reportType: NETWORKING_REPORT_TYPES.verification,
      schemaVersion: null,
      generated: p.timestamp ?? null,
      proofHash: p.proofHash ?? null,
      checksPassed,
      checksTotal,
      targets: Array.isArray(p.targets) ? p.targets.length : 0,
      allOk: checksTotal > 0 && checksPassed >= checksTotal,
      degraded: checksTotal > 0 && checksPassed < checksTotal,
      legacy: true,
    };
  } catch {
    return { available: false };
  }
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
        demoApisTotal: proof.summary?.uniqueDemoApis ?? proof.summary?.apis,
        demoApisVerified: proof.summary?.demoApisVerified ?? proof.summary?.apisVerified,
      };
    } catch {
      /* ignore */
    }
  }

  const routeStats = routeStatsForHealth();
  const envCheck = envCheckForHealth();
  const networking = await readNetworkingProofCompact();
  const ctMatrix = summarizeContentTypeMatrix();
  const docIndexFile = Bun.file('public/registry/doc-index.json');
  let docRefs: Record<string, unknown> = { available: false };
  if (await docIndexFile.exists()) {
    try {
      const parsed = (await docIndexFile.json()) as {
        totalEntries?: number;
        byStability?: Record<string, number>;
        defaultsCoverage?: { passed?: boolean };
        proofHash?: string;
        timestamp?: string;
      };
      docRefs = {
        available: true,
        totalEntries: parsed.totalEntries ?? 0,
        stable: parsed.byStability?.stable ?? 0,
        experimental: parsed.byStability?.experimental ?? 0,
        deprecated: parsed.byStability?.deprecated ?? 0,
        defaultsCoverage: parsed.defaultsCoverage?.passed ?? false,
        proofHash: parsed.proofHash,
        generated: parsed.timestamp,
      };
    } catch {
      docRefs = { available: true, malformed: true };
    }
  }
  const networkingDegraded =
    networking.available === true &&
    typeof networking.degraded === 'boolean' &&
    networking.degraded;

  // Compliance board — shared freeze-shape with edge collectEdgeHealth.
  // Missing bake does not degrade; present + fail does.
  let complianceRaw: unknown = null;
  const complianceFile = Bun.file('public/registry/compliance-board.json');
  if (await complianceFile.exists()) {
    try {
      complianceRaw = await complianceFile.json();
    } catch {
      /* malformed → treat as missing */
    }
  }
  const { projectComplianceHealthArtifact } = await import('../lib/monitoring/compliance-slice.ts');
  const complianceBoard = projectComplianceHealthArtifact(complianceRaw);
  const complianceFail = complianceBoard.exists && !complianceBoard.ok;

  // Limit raises bake — informational (missing does not degrade).
  let limitRaisesRaw: unknown = null;
  const limitRaisesFile = Bun.file('public/registry/limit-raises.json');
  if (await limitRaisesFile.exists()) {
    try {
      limitRaisesRaw = await limitRaisesFile.json();
    } catch {
      /* malformed → treat as missing */
    }
  }
  const { projectLimitRaisesHealthArtifact } = await import('../lib/monitoring/limit-slice.ts');
  const limitRaises = projectLimitRaisesHealthArtifact(limitRaisesRaw);

  const data: Record<string, unknown> = {
    schemaVersion: 1,
    status:
      envCheck.summary.requiredMissing > 0 || networkingDegraded || complianceFail
        ? 'degraded'
        : 'ok',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    bun: Bun.version,
    platform: process.arch + ' ' + process.platform,
    artifacts: {
      opsSummary: { exists, generated, ageSeconds },
      complianceBoard,
      limitRaises,
    },
    registry: { packages: pkgCount, versions: versionCount },
    bunApiProof: proofStatus,
    networking,
    routeStats,
    env: envCheck,
    /** Content-Type: defaultValue | ourValue | wireValue | expected | status */
    contentType: {
      total: ctMatrix.total,
      pass: ctMatrix.pass,
      warn: ctMatrix.warn,
      fail: ctMatrix.fail,
      byStatus: ctMatrix.byStatus,
      /** compact rows for dashboards */
      rows: contentTypePolicyTableRows(ctMatrix.rows).map(r => ({
        id: r.id,
        side: r.side,
        defaultValue: r.defaultValue,
        ourValue: r.ourValue,
        wireValue: r.wireValue,
        expected: r.expected,
        status: r.status,
        severity: r.severity,
      })),
    },
    docRefs,
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
    lines.push(`  Demo APIs:   ${proof.demoApisVerified}/${proof.demoApisTotal} verified`);
  } else {
    lines.push('  Not generated — run bun run docs:api-verify --write');
  }
  const net = (data.networking as Record<string, unknown>) || {};
  lines.push('', '── Networking Proof ───────────────────────');
  if (net.available) {
    lines.push(`  Report type: ${net.reportType ?? NETWORKING_REPORT_TYPES.verification}`);
    lines.push(`  Schema:      ${net.schemaVersion ?? NETWORKING_PROOF_SCHEMA_VERSION}`);
    lines.push(`  Generated:   ${net.generated ?? '—'}`);
    lines.push(`  Checks:      ${net.checksPassed}/${net.checksTotal} passed`);
    lines.push(`  Targets:     ${net.targets ?? '—'}`);
    lines.push(`  Proof hash:  ${String(net.proofHash ?? '—').slice(0, 16)}…`);
  } else {
    lines.push('  Not generated — run bun run check:networking:save');
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
    ''
  );
  const ct = (data.contentType as Record<string, unknown>) || {};
  lines.push(
    '── Content-Type (default | our | wire | expected) ──',
    `  pass/warn/fail: ${ct.pass ?? 0}/${ct.warn ?? 0}/${ct.fail ?? 0} of ${ct.total ?? 0}`,
    `  byStatus:       ${JSON.stringify(ct.byStatus ?? {})}`,
    `  full matrix:    GET /api/content-type`,
    ''
  );
  const env =
    (data.env as { summary?: Record<string, number>; requiredMissingKeys?: string[] }) || {};
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

/**
 * Optional Server from route/fetch 2nd arg (TCP only — not server.fetch).
 * @see https://bun.com/docs/runtime/http/routing#fetch-request-handler
 */
type RouteServer = Pick<BunServer, 'requestIP' | 'timeout' | 'pendingRequests'>;

function clientSocket(req: Request, server?: RouteServer) {
  try {
    return server?.requestIP?.(req) ?? null;
  } catch {
    return null;
  }
}

/** GET /health — JSON; ETag = data hash (shared with /health/pre). */
async function health(
  req: Request = new Request('http://local/health'),
  server?: RouteServer
): Promise<Response> {
  const { data, etag } = await collectHealthData();
  // Volatile fields (uptime, client) stay out of ETag payload
  const ip = clientSocket(req, server);
  const body = {
    ...data,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    client: ip ? { address: ip.address, family: ip.family, port: ip.port } : null,
    pendingRequests: server?.pendingRequests ?? null,
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
      extraHeaders: {
        'X-ETag-Scope': 'health-data',
        ...(ip ? { 'X-Client-Address': ip.address } : {}),
      },
    }
  );
}

/** GET /health/pre — plain diagnostics; same data ETag as /health. */
async function healthHtml(
  req: Request = new Request('http://local/health/pre'),
  server?: RouteServer
): Promise<Response> {
  const { data, etag } = await collectHealthData();
  const ip = clientSocket(req, server);
  const live = {
    ...data,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    client: ip ? { address: ip.address, family: ip.family, port: ip.port } : null,
  };
  if (isFresh(req, etag)) {
    return notModified(etag, {
      vary: 'Accept',
      cacheControl: 'public, max-age=5, must-revalidate',
    });
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
      extraHeaders: {
        'X-ETag-Scope': 'health-data',
        ...(ip ? { 'X-Client-Address': ip.address } : {}),
      },
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

/** GET /api/content-type — default | our | wire | expected | status matrix. */
function contentTypeApi(req: Request): Response {
  const m = summarizeContentTypeMatrix();
  return jsonETag(
    req,
    {
      columns: ['defaultValue', 'ourValue', 'wireValue', 'expected', 'status', 'severity'],
      summary: {
        total: m.total,
        pass: m.pass,
        warn: m.warn,
        fail: m.fail,
        byStatus: m.byStatus,
      },
      rows: contentTypePolicyTableRows(m.rows),
    },
    { versionKey: 'content-type-matrix', cache: 'public, max-age=60, must-revalidate' }
  );
}

/** GET /api/proof — Bun API coverage proof status. */
async function bunApiProof(req: Request): Promise<Response> {
  const proofFile = Bun.file('tools/bun-api-coverage-proof.json');
  if (!(await proofFile.exists()))
    return json({ error: 'No proof manifest generated yet — run bun run docs:api-verify' }, 404);
  const proof = JSON.parse(await proofFile.text());
  return jsonETag(
    req,
    {
      generated: proof.generated,
      bunVersion: proof.runtime?.bunVersion ?? proof.bunVersion,
      summary: proof.summary,
      demoPassRate: proof.summary?.demos
        ? `${Math.round((proof.summary.demosPassed / proof.summary.demos) * 100)}%`
        : '0%',
      allPassed: proof.summary?.demosPassed === proof.summary?.demos,
      _links: {
        self: '/api/proof',
        // Contract note: when the proof asset is hot-preloaded this route serves
        // the raw manifest; otherwise this normalized summary. Edge /api/proof
        // (functions/api/proof.ts) is always normalized.
        manifest: '/api/proof?format=manifest',
        contract: 'normalized summary (default) | raw manifest when hot-preloaded',
      },
    },
    { versionKey: 'bun-api-proof', cache: 'public, max-age=30, must-revalidate' }
  );
}

/** GET /api/env — read-only env var status with HSL health indicators. */
async function envStatus(req: Request): Promise<Response> {
  const data = buildPortalEnvStatus() as Record<string, unknown>;
  const { checkedAt: _checkedAt, ...etagData } = data;
  return jsonETag(req, data, {
    versionKey: 'portal-env-status',
    etagData,
    cache: 'public, max-age=5, must-revalidate',
  });
}

/**
 * GET /llms.txt — machine-readable index for LLM consumers.
 * Lists the portal markdown endpoints (Accept: text/markdown) and JSON APIs.
 * @see https://llmstxt.org — llms.txt convention
 */
function llmsTxt(): Response {
  return new Response(llmsTxtBody(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function llmsFullTxt(): Response {
  return new Response(llmsFullTxtBody(portalMarkdownRaw), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function portalMarkdown(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const slug = parsePortalMdPath(path);
  if (!slug) return null;
  if (!portalMarkdownExists(slug)) {
    return new Response(`Not found: ${path}`, { status: 404 });
  }

  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/markdown') && !accept.includes('text/html')) {
    const raw = portalMarkdownRaw(slug);
    return new Response(raw, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const html = renderPortalMarkdownPage(slug);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
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

/**
 * GET|POST /api/doctor/run — loopback-only portal doctor bake.
 * Runs pure doctor (no --full spawn by default) and writes doctor-state.json.
 * Never enable on non-loopback binds (Pages / staging IPs).
 *
 *   curl -X POST http://127.0.0.1:3000/api/doctor/run
 *   curl 'http://127.0.0.1:3000/api/doctor/run?full=1'
 */
async function doctorRunApi(req: Request, server?: RouteServer): Promise<Response> {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed — use GET or POST' }, 405);
  }
  const ip = clientSocket(req, server);
  const addr = ip?.address ?? '';
  const loopback =
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === '::ffff:127.0.0.1' ||
    (!ip &&
      (new URL(req.url).hostname === '127.0.0.1' ||
        new URL(req.url).hostname === 'localhost' ||
        new URL(req.url).hostname === '::1'));
  if (!loopback) {
    return json(
      {
        error: 'doctor run is loopback-only',
        hint: 'Use: bun run bake:doctor  ·  or bun run portal:doctor',
        client: addr || null,
      },
      403
    );
  }
  try {
    const full = new URL(req.url).searchParams.get('full') === '1';
    const { bakeDoctorState } = await import('../tools/bake-doctor.ts');
    const { state, path } = await bakeDoctorState({ full });
    return json({
      ok: state.ok,
      tone: state.tone,
      path: '/registry/doctor-state.json',
      wrote: path,
      generatedAt: state.generatedAt,
      summary: state.summary,
      byGroup: state.byGroup,
      state,
      cli: 'bun run portal:doctor',
      board: '/portal/doctor/',
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        hint: 'bun run bake:doctor',
      },
      500
    );
  }
}

/**
 * POST /api/packages/graph/rebake — loopback-only offline bake.
 * Runs `bun run audit:packages -- --bake` and returns score metadata from the new map.
 * Never enable on non-loopback binds (Pages / staging IPs).
 */
/**
 * GET /api/partner/health — loopback-only live partner health snapshot
 * (same shape as the committed bake, minus the outChecks desk scan cost
 * being fresh). Use `bun run partner:health:bake` for the committed board.
 */
async function partnerHealthApi(req: Request, server?: RouteServer): Promise<Response> {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed — use GET' }, 405);
  }
  const ip = clientSocket(req, server);
  const addr = ip?.address ?? '';
  const loopback =
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === '::ffff:127.0.0.1' ||
    (!ip &&
      (new URL(req.url).hostname === '127.0.0.1' ||
        new URL(req.url).hostname === 'localhost' ||
        new URL(req.url).hostname === '::1'));
  if (!loopback) {
    return json(
      {
        error: 'partner health is loopback-only',
        hint: 'Use: bun run partner:health:bake',
        client: addr || null,
      },
      403
    );
  }
  try {
    const { buildPartnerHealthBake } =
      await import('../lib/partner-profile/partner-health-bake.ts');
    const bake = await buildPartnerHealthBake();
    return json({ ok: bake.health.ok, ...bake });
  } catch (e) {
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        hint: 'bun run partner:health:bake',
      },
      500
    );
  }
}

async function packagesGraphRebake(req: Request, server?: RouteServer): Promise<Response> {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed — use POST' }, 405);
  }
  const ip = clientSocket(req, server);
  const addr = ip?.address ?? '';
  const loopback =
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === '::ffff:127.0.0.1' ||
    // in-process server.fetch without TCP has no requestIP — allow only when host is loopback
    (!ip &&
      (new URL(req.url).hostname === '127.0.0.1' ||
        new URL(req.url).hostname === 'localhost' ||
        new URL(req.url).hostname === '::1'));
  if (!loopback) {
    return json(
      {
        error: 'packages graph rebake is loopback-only',
        hint: 'Use: bun run audit:packages -- --bake  ·  or portal-cli pm graph --update',
        client: addr || null,
      },
      403
    );
  }
  const root = Bun.env.PWD || '.';
  const proc = Bun.spawn(bunSpawnArgs(['run', 'audit:packages', '--', '--bake']), {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env },
  });
  const code = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  if (code !== 0) {
    return json(
      {
        ok: false,
        error: 'rebake failed',
        exitCode: code,
        stderr: stderr.slice(0, 2000),
      },
      500
    );
  }
  const mapPath = 'public/registry/packages-graph-map.json';
  const file = Bun.file(mapPath);
  if (!(await file.exists())) {
    return json({ ok: false, error: 'bake finished but packages-graph-map.json missing' }, 500);
  }
  const map = (await file.json()) as {
    score?: number;
    grade?: string;
    generatedAt?: string;
    schemaVersion?: number;
  };
  return json({
    ok: true,
    path: '/registry/packages-graph-map.json',
    score: map.score ?? null,
    grade: map.grade ?? null,
    generatedAt: map.generatedAt ?? null,
    schemaVersion: map.schemaVersion ?? null,
    cli: 'bun run portal-cli pm graph --update',
  });
}

/**
 * Unmatched-request handler (Bun routing docs: runs when no `routes` match).
 * Second arg is Server on real TCP; may be undefined for in-process server.fetch.
 * @see https://bun.com/docs/runtime/http/routing#fetch-request-handler
 */
async function fetchHandler(req: Request, server?: RouteServer): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'OPTIONS' && path.startsWith('/registry/')) {
    return portalOptionsResponse();
  }

  // Agent-odds desk APIs + WebSocket upgrade (shared with standalone agent:odds-dashboard).
  // Mounted here so /portal/agent-odds/ has same-origin live edges/health/ws.
  const agentOdds = await handleAgentOddsRequest(req, server);
  if (agentOdds !== null) return agentOdds;

  // Primary APIs + portal boards + health/llms + __hmr live on `routes` (buildPublicRoutes).
  // fetch = unmatched only: markdown stubs, encoded registry, static, npm PUT/GET.

  // Browser address-bar hits on registry JSON → portal board (curl/API keep JSON).
  // Escape: ?raw=1 or ?format=json or Accept: application/json
  const board = registryBoardRedirectFor(req, path);
  if (board) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: board,
        Vary: 'Accept, Sec-Fetch-Dest',
        'Cache-Control': 'no-store',
      },
    });
  }

  const md = await portalMarkdown(req);
  if (md) return md;

  // Optional auth for read endpoints — public paths skip the gate
  const authErr = requireReadAuth(req);
  if (authErr) {
    if (!isPublicReadPath(path)) return authErr;
  }

  // Encoded scoped package: /api/registry/@scope%2Fname[/versions] (not matched by :param routes)
  if (path.startsWith('/api/registry/') && path.endsWith('/versions')) {
    const name = path.slice(14, -9);
    if (name.includes('%') || (name.includes('/') && !name.startsWith('@'))) {
      if (req.method === 'GET') return listVersions(req, decodeURIComponent(name));
      if (req.method === 'POST') return publishVersion(req, decodeURIComponent(name));
      return json({ error: 'Method not allowed' }, 405);
    }
  }
  if (path.startsWith('/api/registry/') && req.method === 'GET') {
    const name = path.slice(14);
    if (name.includes('%2') || name.includes('%2F') || name.includes('%2f')) {
      return packageDetail(req, decodeURIComponent(name));
    }
  }

  const storageRes = await serveRegistryStorage(path, req);
  if (storageRes) return storageRes;

  const staticRes = await staticFile(path, req);
  if (staticRes) return staticRes;

  const npmPackageName = parseNpmPackageRequestPath(path);

  // npm-compatible publish: PUT /{name} or /@scope/name (not / or static paths)
  if (req.method === 'PUT' && npmPackageName) {
    return npmPublish(req, npmPackageName);
  }

  // npm-compatible metadata: GET /{name} or /@scope/name
  if (req.method === 'GET' && npmPackageName) {
    return npmPackageMetadata(req, npmPackageName);
  }

  // API paths always JSON 404 so `curl | jq` fails with a clear error object
  if (path.startsWith('/api/')) {
    return json({ error: 'Not found', path, hint: 'Restart serve-public if route is new' }, 404);
  }
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * Exact `/portal/<slug>` + trailing-slash routes → directory index via portalPage.
 * @see https://bun.com/docs/runtime/http/routing#route-precedence
 */
function portalBoardRoutes(
  portalPage: (urlPath: string) => (req: Request) => Promise<Response>,
  slugs: readonly string[]
): Record<string, (req: Request) => Promise<Response>> {
  const out: Record<string, (req: Request) => Promise<Response>> = {};
  for (const slug of slugs) {
    const dir = `/portal/${slug}/`;
    // Canonical form is the trailing-slash directory index; the bare slug 301s
    // to it so relative URLs and nav active-state never see duplicate paths.
    out[`/portal/${slug}`] = (req: Request) => Promise.resolve(canonicalSlashRedirect(req, dir));
    out[dir] = portalPage(dir);
  }
  return out;
}

/**
 * Exact SIMD-matched routes (docs: exact > :param > wildcard).
 * Named params are type-safe via BunRequest string literals.
 * Static Response objects for fixed probes (zero-alloc dispatch).
 * @see https://bun.com/docs/runtime/http/routing#route-precedence
 * @see https://bun.com/docs/runtime/http/routing#static-responses
 */
function buildPublicRoutes() {
  /** Static ready probe — zero-allocation cloneable response (docs pattern). */
  const ready = new Response('Ready', {
    headers: { 'X-Ready': '1', 'Cache-Control': 'no-store' },
  });

  /** Portal HTML — file/hybrid via staticFile (Last-Modified / Range / HMR). */
  const portalPage =
    (urlPath: string) =>
    (req: Request): Promise<Response> =>
      staticFile(urlPath, req).then(r => r ?? new Response('Not found', { status: 404 }));

  return {
    // Exact static first (highest specificity)
    '/ready': ready,
    ...(SERVE_DEVELOPMENT
      ? {
          '/__debug/error': () => throwServePublicDevelopmentError(),
        }
      : {}),

    // Dynamic health — handlers receive (req, server) on TCP
    '/health': (req: Request, server: RouteServer) => health(req, server),
    '/health/': (req: Request, server: RouteServer) => health(req, server),
    '/api/health': (req: Request, server: RouteServer) => health(req, server),
    '/api/health/': (req: Request, server: RouteServer) => health(req, server),
    '/health/pre': (req: Request, server: RouteServer) => healthHtml(req, server),
    '/health/pre/': (req: Request, server: RouteServer) => healthHtml(req, server),

    '/': (req: Request): Promise<Response> =>
      staticFile('/index.html', req).then(r => r ?? new Response('Not found', { status: 404 })),
    '/index.html': (req: Request): Promise<Response> =>
      staticFile('/index.html', req).then(r => r ?? new Response('Not found', { status: 404 })),

    '/api/content-type': (req: Request) => contentTypeApi(req),
    '/api/content-type/': (req: Request) => contentTypeApi(req),
    '/api/proof': (req: Request) => {
      const hot = hotByUrl.get('/api/proof');
      if (hot) return respondStatic(hot, req, { cacheControl: 'public, max-age=30' });
      return bunApiProof(req);
    },
    '/api/proof/': (req: Request) => {
      const hot = hotByUrl.get('/api/proof');
      if (hot) return respondStatic(hot, req, { cacheControl: 'public, max-age=30' });
      return bunApiProof(req);
    },
    '/api/defaults': async (req: Request) => {
      const f = Bun.file('public/registry/defaults-proof.json');
      if (!(await f.exists())) {
        return json(
          {
            error: 'Defaults proof not generated — run bun tools/verify-defaults.ts --save',
            docs: 'https://bun.com/docs/runtime/utils',
            _links: {
              script: '/api/defaults/script',
              pipe: 'curl -sf http://127.0.0.1:3000/api/defaults/script | bun run -',
            },
          },
          404
        );
      }
      const raw = JSON.parse(await f.text());
      const passed = raw.passed ?? raw.summary?.passed ?? 0;
      const total = raw.total ?? raw.summary?.total ?? 0;
      const url = new URL(req.url);
      const format = url.searchParams.get('format') || req.headers.get('Accept') || 'json';

      if (format === 'raw' || (format === 'application/json' && url.searchParams.has('format'))) {
        const cases = raw.results ?? raw.cases ?? raw.testCases;
        const body = cases && !raw.tests ? { ...raw, tests: cases } : raw;
        return jsonETag(req, body as object, {
          versionKey: 'defaults-raw',
          cache: 'public, max-age=60, must-revalidate',
        });
      }
      if (format === 'text' || format.startsWith('text/')) {
        return new Response(
          `Bun Defaults Verification\n` +
            `Status: ${passed === total ? '✅ PASS' : '❌ FAIL'}\n` +
            `Passed: ${passed}/${total} (${total > 0 ? Math.round((passed / total) * 100) : 0}%)\n` +
            `Bun:    ${raw.bunVersion}\n` +
            `Hash:   ${raw.proofHash}\n`,
          {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=60',
            },
          }
        );
      }

      return jsonETag(
        req,
        {
          status: passed === total ? 'pass' : 'fail',
          passed,
          total,
          passedRatio: +(passed / Math.max(total, 1)).toFixed(2),
          bunVersion: raw.bunVersion,
          proofHash: raw.proofHash,
          generated: raw.timestamp,
          results: raw.results ?? raw.cases ?? raw.testCases,
          tests: raw.results ?? raw.cases ?? raw.testCases,
          _links: {
            self: '/api/defaults',
            raw: '/api/defaults?format=raw',
            text: '/api/defaults?format=text',
            proof: '/registry/defaults-proof.json',
            script: '/api/defaults/script',
            // Contract note: local serves this normalized shape; the Pages edge
            // (functions/api/defaults.ts) passes the raw proof through.
            contract: 'normalized/local vs raw/edge — use ?format=raw for the edge shape',
            scriptMeta: '/api/defaults/script.meta',
            docs: 'https://bun.com/docs/runtime/utils',
          },
        },
        { versionKey: 'defaults-normalized', cache: 'public, max-age=60, must-revalidate' }
      );
    },
    '/api/defaults/script': (req: Request) =>
      serveVerificationScript('defaults', { baseUrl: new URL(req.url).origin }),
    '/api/defaults/script/': (req: Request) =>
      serveVerificationScript('defaults', { baseUrl: new URL(req.url).origin }),
    '/api/defaults/script.meta': (req: Request) =>
      serveVerificationScriptMeta('defaults', new URL(req.url).origin),
    '/api/sqlite/version': async () => {
      const db = new Database(':memory:');
      const v = db.query('SELECT sqlite_version() as v').get() as { v: string };
      return json({
        version: v.v,
        bunVersion: Bun.version,
        features: ['WAL mode', 'Synchronous NORMAL', 'Prepared statements', 'JSON functions'],
        docs: 'https://bun.sh/docs/runtime/sqlite',
      });
    },
    '/api/networking/script': (req: Request) =>
      serveVerificationScript('networking', { baseUrl: new URL(req.url).origin }),
    '/api/networking/script/': (req: Request) =>
      serveVerificationScript('networking', { baseUrl: new URL(req.url).origin }),
    '/api/networking/script.meta': (req: Request) =>
      serveVerificationScriptMeta('networking', new URL(req.url).origin),
    '/api/bun-defaults/script': (req: Request) =>
      serveVerificationScript('bun-defaults', { baseUrl: new URL(req.url).origin }),
    '/api/bun-defaults/script.meta': (req: Request) =>
      serveVerificationScriptMeta('bun-defaults', new URL(req.url).origin),
    '/api/release/script': (req: Request) =>
      serveVerificationScript('release', { baseUrl: new URL(req.url).origin }),
    '/api/release': async () => {
      const f = Bun.file('public/registry/release-features.json');
      if (await f.exists())
        return new Response(f, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
          },
        });
      return json({ error: 'Not generated' }, 404);
    },
    '/api/release/': async () => {
      const f = Bun.file('public/registry/release-features.json');
      if (await f.exists())
        return new Response(f, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
          },
        });
      return json({ error: 'Not generated' }, 404);
    },
    '/api/release/script/': (req: Request) =>
      serveVerificationScript('release', { baseUrl: new URL(req.url).origin }),
    '/api/release/script.meta': (req: Request) =>
      serveVerificationScriptMeta('release', new URL(req.url).origin),
    '/api/doc-refs': async () => {
      const f = Bun.file('public/registry/doc-index.json');
      if (!(await f.exists())) {
        return json(
          {
            error: 'Doc index not generated — run bun tools/build-doc-index.ts --save',
            _links: {
              script: '/api/doc-refs/script',
              pipe: 'curl -sf http://127.0.0.1:3000/api/doc-refs/script | bun run - --save',
            },
          },
          503
        );
      }
      return json(JSON.parse(await f.text()), 200, 'public, max-age=60');
    },
    '/api/doc-refs/script': (req: Request) =>
      serveVerificationScript('doc-index', { baseUrl: new URL(req.url).origin }),
    '/api/doc-refs/script/': (req: Request) =>
      serveVerificationScript('doc-index', { baseUrl: new URL(req.url).origin }),
    '/api/doc-refs/script.meta': (req: Request) =>
      serveVerificationScriptMeta('doc-index', new URL(req.url).origin),
    '/api/env': (req: Request) => envStatus(req),
    '/api/env/': (req: Request) => envStatus(req),
    '/api/monitoring': (req: Request) => liveMonitoringApi(req),
    '/api/monitoring/': (req: Request) => liveMonitoringApi(req),
    '/api/compliance': (req: Request) => complianceBoardApi(req),
    '/api/compliance/': (req: Request) => complianceBoardApi(req),
    '/api/agents/v1/limits/raises': (req: Request) => agentLimitRaisesApi(req),
    '/api/agents/v1/limits/raises/': (req: Request) => agentLimitRaisesApi(req),
    '/api/agents/v1/limits/record': (req: Request) => agentLimitRecordApi(req),
    '/api/agents/v1/limits/record/': (req: Request) => agentLimitRecordApi(req),
    '/api/limits/summary': (req: Request) => limitSummaryApi(req),
    '/api/limits/summary/': (req: Request) => limitSummaryApi(req),
    '/api/limits/analyze': () => limitAnalyzeApi(),
    '/api/limits/analyze/': () => limitAnalyzeApi(),
    // Method maps (Bun routing docs) — prefer over req.method branching
    '/api/limits/predictions': {
      GET: () => limitPredictionsApi(),
      POST: () => limitPredictCycleApi(),
    },
    '/api/limits/predictions/': {
      GET: () => limitPredictionsApi(),
      POST: () => limitPredictCycleApi(),
    },
    '/api/doctor/run': {
      GET: (req: Request, server: RouteServer) => doctorRunApi(req, server),
      POST: (req: Request, server: RouteServer) => doctorRunApi(req, server),
    },
    '/api/doctor/run/': {
      GET: (req: Request, server: RouteServer) => doctorRunApi(req, server),
      POST: (req: Request, server: RouteServer) => doctorRunApi(req, server),
    },
    '/api/partner/health': {
      GET: (req: Request, server: RouteServer) => partnerHealthApi(req, server),
    },
    '/api/partner/health/': {
      GET: (req: Request, server: RouteServer) => partnerHealthApi(req, server),
    },
    '/api/packages/graph/rebake': {
      GET: (req: Request, server: RouteServer) => packagesGraphRebake(req, server),
      POST: (req: Request, server: RouteServer) => packagesGraphRebake(req, server),
    },
    '/api/packages/graph/rebake/': {
      GET: (req: Request, server: RouteServer) => packagesGraphRebake(req, server),
      POST: (req: Request, server: RouteServer) => packagesGraphRebake(req, server),
    },
    '/api/operations/summary': (req: Request) => liveOpsSummary(req),
    '/api/operations/summary/': (req: Request) => liveOpsSummary(req),
    '/api/catalog': (req: Request) => liveCatalog(req),
    '/api/catalog/': (req: Request) => liveCatalog(req),
    '/api/portal/dashboard': async () => {
      const { portalDashboardResponse } = await import('../lib/portal/command-centre-api.ts');
      return portalDashboardResponse();
    },
    '/api/portal/dashboard/': async () => {
      const { portalDashboardResponse } = await import('../lib/portal/command-centre-api.ts');
      return portalDashboardResponse();
    },
    '/api/portal/action': async (req: Request, server: RouteServer) => {
      const { portalActionResponse } = await import('../lib/portal/command-centre-api.ts');
      return portalActionResponse(req, server);
    },
    '/api/portal/action/': async (req: Request, server: RouteServer) => {
      const { portalActionResponse } = await import('../lib/portal/command-centre-api.ts');
      return portalActionResponse(req, server);
    },
    '/api/skills': async (req: Request) =>
      jsonETag(req, await buildSkillsCatalog(), {
        versionKey: 'skills-catalog',
        cache: 'public, max-age=30, must-revalidate',
      }),
    '/api/skills/': async (req: Request) =>
      jsonETag(req, await buildSkillsCatalog(), {
        versionKey: 'skills-catalog',
        cache: 'public, max-age=30, must-revalidate',
      }),
    '/api/skills/:name': {
      GET: async (req: BunRequest<'/api/skills/:name'>) => {
        const detail = await buildSkillDetail(req.params.name);
        if (!detail) return json({ error: `No such skill: ${req.params.name}` }, 404);
        return jsonETag(req, detail as object, {
          versionKey: `skill:${req.params.name}`,
          cache: 'public, max-age=30, must-revalidate',
        });
      },
    },
    '/api/skills/:name/package': {
      POST: async (req: BunRequest<'/api/skills/:name/package'>) => {
        const pubErr = await requirePublishAuth(req);
        if (pubErr) return pubErr;
        try {
          const result = await packageSkill(req.params.name);
          return json({ ok: true, ...result });
        } catch (err) {
          if (err instanceof SkillPackageError)
            return json(
              { error: err.message, code: err.code },
              err.code === 'not-found' ? 404 : 500
            );
          return json({ error: err instanceof Error ? err.message : String(err) }, 500);
        }
      },
    },
    '/portal/skills/:name': {
      GET: async (req: BunRequest<'/portal/skills/:name'>) => {
        const detail = await buildSkillDetail(req.params.name);
        const html = detail
          ? renderSkillDetailPage(detail, await skillPackageExists(req.params.name))
          : renderSkillNotFoundPage(req.params.name);
        return new Response(html, {
          status: detail ? 200 : 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      },
    },
    '/api/dod': {
      GET: (req: Request) => dodApi(req),
      POST: (req: Request) => dodApi(req),
    },
    '/api/dod/': {
      GET: (req: Request) => dodApi(req),
      POST: (req: Request) => dodApi(req),
    },
    '/api/dod/approve': {
      POST: (req: Request) => dodApi(req),
    },
    '/api/dod/approve/': {
      POST: (req: Request) => dodApi(req),
    },
    '/api/dod/reject': {
      POST: (req: Request) => dodApi(req),
    },
    '/api/dod/reject/': {
      POST: (req: Request) => dodApi(req),
    },
    '/api/channels/events': (req: Request) => channelsEvents(req),
    '/api/channels/events/': (req: Request) => channelsEvents(req),

    '/api/registry': (req: Request) => serveRegistryIndex(req),
    '/api/registry/': (req: Request) => serveRegistryIndex(req),
    '/api/registry/registry.json': (req: Request) => serveRegistryIndex(req),
    '/api/registry/health': async (req: Request) => {
      const idx = await Bun.file('public/registry/registry.json')
        .json()
        .catch(() => ({ packages: {} }));
      const packages = Object.keys(idx.packages ?? {});
      const timestamp = new Date().toISOString();
      const body = {
        ok: true,
        source: 'assets',
        packageCount: packages.length,
        timestamp,
      };
      return jsonETag(req, body, {
        versionKey: 'registry-health',
        etagData: { ok: true, source: 'assets', packageCount: packages.length },
        cache: 'public, max-age=5, must-revalidate',
      });
    },
    '/api/registry/static': (req: Request) => serveStaticRegistry(req),
    '/api/registry/search': (req: Request) => searchRegistry(req),
    '/api/registry/search/': (req: Request) => searchRegistry(req),

    // Tenant registries (literal `tenants` before :package so it is not shadowed)
    '/api/registry/tenants/:tenant/registry.json': async (
      req: BunRequest<'/api/registry/tenants/:tenant/registry.json'>
    ) => {
      const f = Bun.file(`public/registry/${req.params.tenant}/registry.json`);
      if (await f.exists()) {
        return jsonETag(req, (await f.json()) as object, {
          versionKey: `tenant-registry:${req.params.tenant}`,
          cache: 'public, max-age=30, must-revalidate',
        });
      }
      return json({ error: `No registry for tenant: ${req.params.tenant}` }, 404);
    },

    // Unscoped package detail + versions (named params — type-safe)
    '/api/registry/:package': (req: BunRequest<'/api/registry/:package'>) => {
      const name = req.params.package;
      if (name === 'search' || name === 'registry.json' || name === 'static' || name === 'health') {
        return json({ error: 'Not found' }, 404);
      }
      return packageDetail(req, name);
    },
    '/api/registry/:package/versions': {
      GET: (req: BunRequest<'/api/registry/:package/versions'>) =>
        listVersions(req, req.params.package),
      POST: (req: BunRequest<'/api/registry/:package/versions'>) =>
        publishVersion(req, req.params.package),
    },

    // Unencoded scoped package: /api/registry/@scope/name[/versions]
    '/api/registry/:scope/:name': (req: BunRequest<'/api/registry/:scope/:name'>) => {
      const { scope, name } = req.params;
      if (!scope.startsWith('@')) return json({ error: 'Not found' }, 404);
      return packageDetail(req, `${scope}/${name}`);
    },
    '/api/registry/:scope/:name/versions': {
      GET: (req: BunRequest<'/api/registry/:scope/:name/versions'>) =>
        listVersions(req, `${req.params.scope}/${req.params.name}`),
      POST: (req: BunRequest<'/api/registry/:scope/:name/versions'>) =>
        publishVersion(req, `${req.params.scope}/${req.params.name}`),
    },

    '/monitoring': () => monitoringPage(),
    '/monitoring/': () => monitoringPage(),
    '/llms.txt': llmsTxt(),
    '/llms-full.txt': llmsFullTxt(),

    // Tennis HQ — on-demand avatar (Bun.Image, zero npm image deps)
    '/avatar/:id': (req: BunRequest<'/avatar/:id'>) => avatarWebpResponse(req.params.id),
    '/api/avatar/:id': (req: BunRequest<'/api/avatar/:id'>) => avatarWebpResponse(req.params.id),

    '/__hmr': (req: Request, server: RouteServer) => {
      if (server?.timeout) {
        try {
          server.timeout(req, 0);
        } catch {
          /* ignore */
        }
      }
      return liveReloadHub
        ? liveReloadHub.subscribe(req)
        : json({ error: 'live-reload disabled' }, 404);
    },

    // Portal home + every board index (SIMD exact routes; fetch for unmatched only)
    '/portal': (req: Request) => Promise.resolve(canonicalSlashRedirect(req, '/portal/')),
    '/portal/': portalPage('/portal/index.html'),
    ...portalBoardRoutes(portalPage, PORTAL_BOARD_SLUGS),
    ...projectRSSAliasRoutes(),
  };
}

function isListenPortBusy(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('EADDRINUSE') || /port \d+ in use/i.test(msg);
}

function createServer(options: Pick<BunServeOptions, 'port' | 'hostname'> = {}): BunServer {
  const routes = buildPublicRoutes();
  const serveOptions = attachServePublicErrorHandler(
    {
      development: SERVE_DEVELOPMENT,
      routes,
      fetch: fetchHandler,
      // Agent-odds live feed (same handlers as tools/agent-odds-dashboard-serve.ts)
      websocket: agentOddsWebSocketHandlers() as BunServeOptions['websocket'],
    } satisfies BunServeOptions,
    { development: SERVE_DEVELOPMENT }
  );
  // Explicit options (ephemeral retry) win; otherwise TOML hostname/port when prefs set them.
  if (options.hostname !== undefined) serveOptions.hostname = options.hostname;
  else if (bindPrefs.hostname !== undefined) serveOptions.hostname = bindPrefs.hostname;
  if (options.port !== undefined) serveOptions.port = options.port;
  else if (bindPrefs.port !== undefined) serveOptions.port = bindPrefs.port;

  return Bun.serve(serveOptions);
}

/**
 * Probe whether something already listens on the resolved default port.
 * Bun's listener uses SO_REUSEPORT on some platforms, so a second bind can
 * SUCCEED (no EADDRINUSE) while traffic round-robins across stale instances —
 * the bind-time check alone is not enough. A connect probe is deterministic.
 */
async function probeDefaultPortBusy(): Promise<boolean> {
  const port = bindPrefs.requestedPort;
  if (port === 0) return false;
  const host = bindPrefs.hostname ?? '127.0.0.1';
  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        data() {},
        open(s) {
          s.end();
        },
        error() {},
      },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * Start with Bun-native bind: omit `port`/`hostname` so `--port`, env chain, and docs defaults apply.
 * On EADDRINUSE (or a positive busy probe), retry once with `port: 0` (ephemeral).
 * @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
 * @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
 */
async function startServer(): Promise<ServeBindSnapshot & { ephemeralFallback: boolean }> {
  if (await probeDefaultPortBusy()) {
    console.warn(
      `[serve] default port ${bindPrefs.requestedPort} already listening — binding ephemeral port instead`
    );
    return { ...serveBindSnapshot(createServer({ port: 0 })), ephemeralFallback: true };
  }

  let lastErr: unknown;
  try {
    return {
      ...serveBindSnapshot(
        createServer({
          port: bindPrefs.port,
          hostname: bindPrefs.hostname,
        })
      ),
      ephemeralFallback: false,
    };
  } catch (e) {
    lastErr = e;
    if (!isListenPortBusy(e)) throw e;
  }

  try {
    console.warn(
      `[serve] default port ${bindPrefs.requestedPort} busy — retrying with port: 0 (ephemeral)`
    );
    return { ...serveBindSnapshot(createServer({ port: 0 })), ephemeralFallback: true };
  } catch (e) {
    lastErr = e;
  }

  const expected = bindPrefs.requestedPort;
  console.error(`
Failed to bind serve-public on ${bindPrefs.hostname ?? '(Bun default hostname)'} port ${expected}.

  # Free the default port, then re-run (Bun resolves --port → BUN_PORT → PORT → NODE_PORT → 3000):
  lsof -nP -iTCP:${expected} -sTCP:LISTEN
  kill <PID>

  bun --port=3010 scripts/serve-public.ts
  BUN_PORT=3010 bun scripts/serve-public.ts
  HOST=0.0.0.0 bun scripts/serve-public.ts
`);
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const bind = await startServer();
// After bind: server.port (number) + server.url (URL) are SSOT — never re-read env.
assertServerPortUrlAligned(bind.server);
const { ephemeralFallback } = bind;
activeServer = bind.server;
const base = bind.loopbackOrigin;
startAgentOddsBroadcast(bind.server);

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} — graceful stop (server.stop)…`);
  try {
    stopAgentOddsBroadcast();
  } catch {
    /* ignore */
  }
  try {
    liveReloadHub?.stop();
  } catch {
    /* ignore */
  }
  try {
    if (activeServer) await activeServer.stop(false);
  } catch (e) {
    console.error('server.stop failed:', e);
    try {
      await activeServer?.stop(true);
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

console.log(`Local portal:  ${base}/portal/ops/`);
console.log(
  `Agent odds:    ${base}/portal/agent-odds/  (APIs /api/edges · /api/partners/health · WS /ws)`
);
console.log(`Monitoring:    ${base}/monitoring`);
console.log(`Live API:      ${base}/api/operations/summary`);
console.log(`Monitoring API ${base}/api/monitoring`);
console.log(`Registry:      ${base}/api/registry`);
console.log(`Catalog:       ${base}/api/catalog`);
console.log(`Prediction:    ${base}/registry/prediction/report/`);
if (SERVE_DEVELOPMENT) console.log(`Dev error:     ${base}/__debug/error`);
const publishReady = Boolean(configuredPublishToken());
console.log(
  publishReady
    ? `Publish:       PUT ${base}/{name} (Bearer REGISTRY_SECRET required)`
    : `Publish:       disabled — set REGISTRY_SECRET or FACTORY_WAGER_TOKEN`
);
console.log(
  `[serve] portSource=${bindPrefs.portSource} hostnameSource=${bindPrefs.hostnameSource} requestedPort=${bindPrefs.requestedPort}`
);
const bindManifest: ServePublicBindManifest = {
  ...bind,
  schemaVersion: 1,
  ephemeralFallback,
  requestedDefaultPort: bindPrefs.requestedPort,
  boundAt: new Date().toISOString(),
};
await writeServePublicBindManifest(bindManifest);
// Docs dual shape (server.port + server.url) then Bind/Serve lines — all from live Server.
for (const line of formatServePublicBindLines(bindManifest, { dbPath })) {
  console.log(line);
}
if (LIVE_RELOAD && liveReloadHub) {
  await liveReloadHub.startPolling(WATCH_PATHS);
  console.log(
    `HMR:           browser live-reload ON (SSE ${base}/__hmr) · poll ${WATCH_PATHS.length} paths`
  );
  console.log(
    `               server HMR: bun --hot scripts/serve-public.ts · off: SERVE_PUBLIC_HMR=0`
  );
} else {
  console.log(`HMR:           off (set SERVE_PUBLIC_HMR=1 or bind 127.0.0.1)`);
}

// In-process Bun.cron complement: refresh snapshots while the portal is up.
// UTC schedule, no-overlap (next fire waits for snapshot Promise).
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
if (Bun.env.OPS_SNAPSHOT_CRON === '1') {
  const { registerOpsSnapshotCron, OPS_SNAPSHOT_SCHEDULE } =
    await import('../lib/operations/snapshot-cron.ts');
  registerOpsSnapshotCron();
  console.log(
    `Cron:          ops-snapshot @ ${OPS_SNAPSHOT_SCHEDULE} UTC (in-process Bun.cron, no-overlap)`
  );
}

// Tier 4 scrape agents → artifacts/raw-limits/ (JSONL; no registry bake)
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
if (Bun.env.BASELINE_SCRAPE_CRON === '1') {
  const { registerBaselineScrapeCron, BASELINE_SCRAPE_CRON_SCHEDULE } =
    await import('../lib/operations/scrapers/scrape-cron.ts');
  registerBaselineScrapeCron();
  console.log(
    `Cron:          baseline-scrape @ ${BASELINE_SCRAPE_CRON_SCHEDULE} UTC (in-process Bun.cron, no-overlap)`
  );
}

// Nightly Bun defaults verification (12 cases → public/registry/bun-defaults-proof.json)
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
// Schedule: Bun.cron("0 4 * * *", handler) — UTC, no-overlap (not title-first overload)
if (Bun.env.BUN_DEFAULTS_CRON === '1') {
  const { registerDefaultsVerifyCron, BUN_DEFAULTS_CRON_SCHEDULE, BUN_DEFAULTS_PROOF_PATH } =
    await import('../lib/http/defaults-cron.ts');
  registerDefaultsVerifyCron();
  console.log(
    `Cron:          defaults-verify @ ${BUN_DEFAULTS_CRON_SCHEDULE} UTC → ${BUN_DEFAULTS_PROOF_PATH}`
  );
}

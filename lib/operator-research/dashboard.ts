// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
import { joinPath } from '../path-bun.ts';
import { buildPartnerHealthPayload } from '../bookmakers/merge.ts';
import {
  addLiquiditySpot,
  getLastResearchMarkets,
  getLiquiditySummary,
  getResearchAgent,
  getResearchCoverage,
  getLimitsHistory,
  listEventAlertConfigs,
  listPartnerMappingsForEventRow,
  listSnapshots,
  lookupCanonicalIdForEventRow,
  runResearchCycle,
  saveEventAlertConfigs,
  startResearchAgent,
  type EventAlertConfig,
  type ResearchAgentHandle,
} from '../research/index.ts';
import { checkApiKey } from './auth/api-key.ts';
import { checkCsrf, issueCsrf, isMutatingMethod, getSessionId } from './auth/csrf.ts';
import {
  authenticatePartnerRequest,
  isLoopbackHostname,
  jsonWithRequestId,
} from './auth/partner-request.ts';
import {
  getPackageSnapshot,
  runPackageUpdate,
  updateEventsToSse,
  type UpdateFlags,
} from './package-update.ts';
import {
  listPresets,
  listPublishableWorkspaces,
  packageNameFromPathSuffix,
  parseRegistryPreset,
  publishEventsToSse,
  registryHealth,
  resolveRegistryPackage,
  runBunPublish,
  runFactoryPublish,
  searchRegistryPackages,
  type PublishFlags,
} from './registry-desk.ts';
import {
  getEnvView,
  getSystemInfo,
  globSearch,
  hashPassword,
  inspectValue,
  listDirectory,
  listProcesses,
  peekTasks,
  readProjectFile,
  setDeskEnv,
  verifyPassword,
  writeProjectFile,
} from './system-panel.ts';
import {
  alertsTomlPath,
  deleteAlertRule,
  evaluateAlerts,
  listRecentAlerts,
  loadAlertRules,
  reloadAlertRules,
  upsertAlertRule,
  type AlertRule,
} from './matching/alerts.ts';
import { getEvent, listEventFilterOptions, listEvents } from './matching/events-query.ts';
import { queryOddsHistorySeries } from './matching/history-query.ts';
import { detectSignals, type OddsPeriod } from './matching/signals.ts';
import { buildBookTelegramIndex, sendPartnerSignal } from './partners-signal.ts';
import { getPlatformSnapshot } from './platform.ts';
import { respondBunFile, resolveUnderRoot } from './http/bun-file.ts';
import { EXPORTS_DIR, ROOT, SCREENSHOTS_DIR } from './paths.ts';
import { getTask, getTaskPromise, listTaskIds, resolveTaskView } from './tasks.ts';
import { buildDeskJobsSnapshot } from './desk-jobs.ts';
import { startOddsDashboard, type OddsDashboardServer } from './odds/dashboard.ts';
import type { OddsSchedulerHandle } from './odds/scheduler.ts';

const AGENT_ODDS_DIR = joinPath(ROOT, 'public/portal/agent-odds');
const PUBLIC_PORTAL_DIR = joinPath(ROOT, 'public/portal');
const AGENT_ODDS_V112 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.12.html');
const AGENT_ODDS_V111 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.11.html');
const AGENT_ODDS_V110 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.10.html');
const AGENT_ODDS_V107 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.07.html');
const AGENT_ODDS_EVENTS_V105 = joinPath(AGENT_ODDS_DIR, 'dashboard-events-v1.05.html');
const AGENT_ODDS_V105 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.05.html');
const AGENT_ODDS_V104 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.04.html');
const AGENT_ODDS_V103 = joinPath(AGENT_ODDS_DIR, 'dashboard-v1.03.html');
const AGENT_ODDS_PARTNER = joinPath(AGENT_ODDS_DIR, 'dashboard-partner-intel.html');
const AGENT_ODDS_PARTNER_V105 = joinPath(AGENT_ODDS_DIR, 'dashboard-partner-v1.05.html');

async function agentOddsHtml(req: Request, preferred?: string): Promise<Response> {
  const candidates = preferred
    ? [
        preferred,
        AGENT_ODDS_V112,
        AGENT_ODDS_V111,
        AGENT_ODDS_V110,
        AGENT_ODDS_V107,
        AGENT_ODDS_EVENTS_V105,
        AGENT_ODDS_V105,
        AGENT_ODDS_V104,
        AGENT_ODDS_V103,
      ]
    : [
        AGENT_ODDS_V112,
        AGENT_ODDS_V111,
        AGENT_ODDS_V110,
        AGENT_ODDS_V107,
        AGENT_ODDS_EVENTS_V105,
        AGENT_ODDS_V105,
        AGENT_ODDS_V104,
        AGENT_ODDS_V103,
      ];
  const issued = issueCsrf(req);
  const cookieHeaders = issued.setCookie ? { 'set-cookie': issued.setCookie } : undefined;
  for (const path of candidates) {
    const res = await respondBunFile(path, {
      cacheControl: 'no-store',
      headers: cookieHeaders,
    });
    if (res.status !== 404) {
      // Expose token for same-origin bootstrap via header (portal also GETs /api/csrf).
      const headers = new Headers(res.headers);
      headers.set('x-csrf-token', issued.token);
      return new Response(res.body, { status: res.status, headers });
    }
  }
  const headers = new Headers({
    'content-type': 'text/html;charset=utf-8',
    'x-bun-file-type': 'text/html;charset=utf-8',
    'x-csrf-token': issued.token,
  });
  if (issued.setCookie) headers.append('set-cookie', issued.setCookie);
  return new Response(PLATFORM_HTML, { headers });
}

function withCsrfGate(req: Request): Response | null {
  if (!isMutatingMethod(req.method)) return null;
  const path = new URL(req.url).pathname;
  if (!path.startsWith('/api/')) return null;
  // Token issuance itself is GET-only; evaluate/reload still gated.
  const csrf = checkCsrf(req);
  if (csrf.ok) return null;
  return json({ ok: false, error: csrf.error, csrf: true }, csrf.status);
}

/**
 * Partner auth for system-panel routes after CSRF.
 * - `read`: same-origin OK when tokens configured; open when none.
 * - `write`: token required when configured; open only on loopback bind.
 */
function requirePartnerAuth(
  req: Request,
  sensitivity: 'read' | 'write',
  bindHostname: string
):
  | { ok: true; requestId: string; mode: 'open' | 'token' | 'same-origin' } // brand-ok — opaque research/wire id
  | { ok: false; response: Response } {
  const auth = authenticatePartnerRequest(req, sensitivity);
  if (!auth.ok) {
    return {
      ok: false,
      response: jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId),
    };
  }
  if (sensitivity === 'write' && auth.mode === 'open' && !isLoopbackHostname(bindHostname)) {
    return {
      ok: false,
      response: jsonWithRequestId(
        {
          ok: false,
          error:
            'System writes require PARTNER_API_TOKEN (or OPERATOR_RESEARCH_API_KEY) when not bound to loopback',
        },
        503,
        auth.requestId
      ),
    };
  }
  return { ok: true, requestId: auth.requestId, mode: auth.mode };
}

function serializeRule(r: AlertRule) {
  return {
    id: r.id,
    name: r.name ?? r.id,
    description: r.description ?? null,
    active: r.enabled,
    type: r.type,
    threshold: r.threshold,
    condition: r.condition ?? null,
    channels: r.channels,
    email_recipients: r.emailRecipients,
    period: r.period,
    pattern: r.pattern ?? null,
    edge: r.edge ?? null,
    market_type: r.marketType ?? null,
    geo: r.geo ?? null,
    state: r.state ?? null,
    limit: r.limit ?? null,
    latency_threshold: r.latencyThreshold ?? null,
    bookmaker_comparison: r.bookmakerComparison ?? null,
    event_id: r.eventId ?? null,
    partner_ids: r.partnerIds ?? [],
    telegram_chat_id: r.telegramChatId ?? null,
    source: r.source ?? 'toml',
  };
}

function serializeAlertForPortal(a: {
  id: string; // brand-ok — opaque research/wire id
  type: string;
  ruleId: string; // brand-ok — opaque research/wire id
  severity: string;
  title: string;
  details: string;
  payload: unknown;
  createdAt: string;
  channels?: string[];
}) {
  const payload = (a.payload ?? {}) as {
    partner_ids?: string[];
    partners?: Array<{ id?: string; label?: string; host?: string; status?: string }>; // brand-ok — opaque research/wire id
    partnerId?: string; // brand-ok — opaque research/wire id
    legs?: Array<{ bookmaker?: string; host?: string | null }>;
    bookmaker?: string;
    host?: string | null;
  };
  const partnerIds = [
    ...(payload.partner_ids ?? []),
    ...(payload.partnerId ? [payload.partnerId] : []),
    ...(payload.partners ?? []).map(p => p.id).filter((x): x is string => !!x),
  ];
  const partnerLabels =
    payload.partners?.map(p => p.label || p.id).filter(Boolean) ??
    payload.legs?.map(l => l.bookmaker).filter(Boolean) ??
    (payload.bookmaker ? [payload.bookmaker] : []);
  return {
    ...a,
    rule_id: a.ruleId,
    message: a.title,
    timestamp: Date.parse(a.createdAt) || a.createdAt,
    partner_ids: [...new Set(partnerIds)],
    partners: payload.partners ?? [],
    partner_labels: [...new Set(partnerLabels.map(String))],
    books: (payload.legs ?? []).map(l => l.bookmaker || l.host).filter(Boolean),
  };
}

function parseEdgeBody(raw: unknown): { min?: number; max?: number } | number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { min?: unknown; max?: unknown };
    return {
      min: o.min != null ? Number(o.min) : undefined,
      max: o.max != null ? Number(o.max) : undefined,
    };
  }
  return undefined;
}

function parseLimitBody(raw: unknown): { min?: number; max?: number } | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as { min?: unknown; max?: unknown };
  const out: { min?: number; max?: number } = {};
  if (o.min != null && Number.isFinite(Number(o.min))) out.min = Number(o.min);
  if (o.max != null && Number.isFinite(Number(o.max))) out.max = Number(o.max);
  return out.min != null || out.max != null ? out : undefined;
}

function ruleInputFromBody(body: Record<string, unknown>, idOverride?: string) {
  return {
    id: idOverride ?? String(body.id ?? ''),
    name: body.name != null ? String(body.name) : undefined,
    description: body.description != null ? String(body.description) : undefined,
    condition: body.condition != null ? String(body.condition) : undefined,
    type: body.type as AlertRule['type'] | undefined,
    threshold: body.threshold != null ? Number(body.threshold) : undefined,
    active: body.active as boolean | undefined,
    enabled: body.enabled as boolean | undefined,
    channels: Array.isArray(body.channels) ? body.channels.map(String) : undefined,
    email_recipients: Array.isArray(body.email_recipients)
      ? body.email_recipients.map(String)
      : undefined,
    period: body.period != null ? String(body.period) : undefined,
    pattern: body.pattern != null ? String(body.pattern) : undefined,
    edge: parseEdgeBody(body.edge),
    market_type: body.market_type != null ? String(body.market_type) : undefined,
    geo: body.geo != null ? String(body.geo) : undefined,
    state: body.state != null ? String(body.state) : undefined,
    limit: parseLimitBody(body.limit),
    latency_threshold:
      body.latency_threshold != null && Number.isFinite(Number(body.latency_threshold))
        ? Number(body.latency_threshold)
        : undefined,
    bookmaker_comparison:
      body.bookmaker_comparison != null ? String(body.bookmaker_comparison) : undefined,
    event_id: body.event_id != null ? String(body.event_id) : undefined,
    partner_ids: Array.isArray(body.partner_ids) ? body.partner_ids.map(String) : undefined,
    telegram_chat_id:
      body.telegram_chat_id != null
        ? String(body.telegram_chat_id)
        : body.telegramChatId != null
          ? String(body.telegramChatId)
          : undefined,
  };
}

export type ResearchDashboardServer = {
  port: number;
  url: string;
  stop: () => void;
  odds?: OddsDashboardServer;
  research?: ResearchAgentHandle;
  /** Optional Bun.cron odds monitor (owned by agent serve when --monitor). */
  oddsMonitor?: OddsSchedulerHandle;
};

// eslint-disable-next-line harness/no-unknown-function-param -- HTTP JSON response edge
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/**
 * Operator research ops dashboard — platform observability + optimistic task status.
 * Optionally mounts the odds WebSocket dashboard on a sibling port.
 * Starts the research agent (liquidity + account limits) on serve.
 */
export function startResearchDashboard(
  opts: {
    port?: number;
    hostname?: string;
    withOdds?: boolean;
    oddsPort?: number;
    withResearchAgent?: boolean;
    researchIntervalMs?: number;
    /** Optional in-process odds monitor (Bun.cron); stopped by caller or stop(). */
    oddsMonitor?: OddsSchedulerHandle;
  } = {}
): ResearchDashboardServer {
  const port = opts.port ?? 8790;
  const hostname = opts.hostname ?? '127.0.0.1';

  const odds =
    opts.withOdds === false
      ? undefined
      : startOddsDashboard({ port: opts.oddsPort ?? port + 1, hostname });

  const research =
    opts.withResearchAgent === false
      ? undefined
      : startResearchAgent({
          intervalMs: opts.researchIntervalMs,
          runImmediately: true,
          live: Bun.env.RESEARCH_AGENT_LIVE === '1',
        });

  const oddsMonitor = opts.oddsMonitor;

  const server = Bun.serve({
    port,
    hostname,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/health') {
        return json({ ok: true, bun: Bun.version });
      }

      if (url.pathname === '/api/csrf' || url.pathname === '/api/csrf/') {
        const issued = issueCsrf(req);
        const headers: Record<string, string> = {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-csrf-token': issued.token,
        };
        if (issued.setCookie) headers['set-cookie'] = issued.setCookie;
        return new Response(
          JSON.stringify({
            ok: true,
            csrfToken: issued.token,
            session: !!getSessionId(req) || !!issued.setCookie,
            // @see https://bun.sh/docs/runtime/csrf
            docs: 'https://bun.sh/docs/runtime/csrf',
          }),
          { status: 200, headers }
        );
      }

      const csrfBlock = withCsrfGate(req);
      if (csrfBlock) return csrfBlock;

      if (url.pathname === '/api/platform') {
        return json(await getPlatformSnapshot());
      }

      // ── System panel (Bun.file / Glob / which / spawn / password / peek) ──
      if (url.pathname === '/api/system/jobs' || url.pathname === '/api/desk/jobs') {
        return json(
          buildDeskJobsSnapshot({
            research,
            odds,
            oddsMonitor,
          })
        );
      }

      if (url.pathname === '/api/system/info' || url.pathname === '/api/system/info/') {
        return json(await getSystemInfo());
      }

      if (url.pathname === '/api/system/processes' || url.pathname === '/api/processes') {
        try {
          return json(await listProcesses(Number(url.searchParams.get('limit') ?? '40')));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 500);
        }
      }

      if (url.pathname === '/api/system/tasks' || url.pathname === '/api/system/peek') {
        return json(peekTasks());
      }

      if (url.pathname === '/api/system/env' || url.pathname === '/api/env') {
        if (req.method === 'GET') {
          const auth = requirePartnerAuth(req, 'read', hostname);
          if (!auth.ok) return auth.response;
          return json(getEnvView({ includeValues: url.searchParams.get('values') !== '0' }));
        }
        if (req.method === 'POST') {
          const auth = requirePartnerAuth(req, 'write', hostname);
          if (!auth.ok) return auth.response;
          let body: { key?: string; value?: string };
          try {
            body = (await req.json()) as typeof body;
          } catch {
            return json({ error: 'Invalid JSON' }, 400);
          }
          try {
            const result = setDeskEnv(String(body.key ?? ''), String(body.value ?? ''));
            return json({ ok: true, ...result });
          } catch (err) {
            return json(
              { ok: false, error: err instanceof Error ? err.message : String(err) },
              400
            );
          }
        }
        return json({ error: 'method not allowed' }, 405);
      }

      if (url.pathname === '/api/system/fs/ls' || url.pathname === '/api/fs/ls') {
        if (req.method !== 'POST' && req.method !== 'GET') {
          return json({ error: 'method not allowed' }, 405);
        }
        const auth = requirePartnerAuth(req, 'read', hostname);
        if (!auth.ok) return auth.response;
        try {
          const path =
            req.method === 'GET'
              ? (url.searchParams.get('path') ?? '.')
              : String(((await req.json()) as { path?: string }).path ?? '.');
          return json(await listDirectory(path));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      }

      if (url.pathname === '/api/system/fs/read' || url.pathname === '/api/fs/read') {
        if (req.method !== 'POST' && req.method !== 'GET') {
          return json({ error: 'method not allowed' }, 405);
        }
        const auth = requirePartnerAuth(req, 'read', hostname);
        if (!auth.ok) return auth.response;
        try {
          const path =
            req.method === 'GET'
              ? (url.searchParams.get('path') ?? '')
              : String(((await req.json()) as { path?: string }).path ?? '');
          if (!path) return json({ error: 'path required' }, 400);
          return json(await readProjectFile(path));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      }

      if (url.pathname === '/api/system/fs/write' || url.pathname === '/api/fs/write') {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        const auth = requirePartnerAuth(req, 'write', hostname);
        if (!auth.ok) return auth.response;
        let body: { path?: string; content?: string };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ error: 'Invalid JSON' }, 400);
        }
        try {
          const result = await writeProjectFile(
            String(body.path ?? ''),
            String(body.content ?? '')
          );
          return json({ ok: true, ...result });
        } catch (err) {
          return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 403);
        }
      }

      if (url.pathname === '/api/system/search' || url.pathname === '/api/search') {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        const auth = requirePartnerAuth(req, 'read', hostname);
        if (!auth.ok) return auth.response;
        let body: { pattern?: string; cwd?: string };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ error: 'Invalid JSON' }, 400);
        }
        try {
          return json(await globSearch(String(body.pattern ?? ''), body.cwd));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      }

      if (url.pathname === '/api/system/password/hash' || url.pathname === '/api/password/hash') {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        const auth = requirePartnerAuth(req, 'write', hostname);
        if (!auth.ok) return auth.response;
        try {
          const { plain } = (await req.json()) as { plain?: string };
          return json(await hashPassword(String(plain ?? '')));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      }

      if (
        url.pathname === '/api/system/password/verify' ||
        url.pathname === '/api/password/verify'
      ) {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        const auth = requirePartnerAuth(req, 'write', hostname);
        if (!auth.ok) return auth.response;
        try {
          const { plain, hash } = (await req.json()) as { plain?: string; hash?: string };
          return json(await verifyPassword(String(plain ?? ''), String(hash ?? '')));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      }

      if (url.pathname === '/api/system/inspect' || url.pathname === '/api/inspect') {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        try {
          const body = (await req.json()) as { object?: unknown; depth?: number };
          return json(inspectValue(body.object, body.depth));
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      }

      if (url.pathname === '/api/package' || url.pathname === '/api/package/') {
        try {
          const snap = await getPackageSnapshot({
            production: url.searchParams.get('production') === 'true',
            recursive: url.searchParams.get('recursive') === 'true',
            latestAsTarget: url.searchParams.get('latest') === 'true',
          });
          return json(snap);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return json({ ok: false, error: message }, 500);
        }
      }

      if (url.pathname === '/api/update' || url.pathname === '/api/update/') {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        let body: {
          selected?: string[];
          flags?: UpdateFlags & { confirm?: boolean };
          stream?: boolean;
          dryRun?: boolean;
        };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ ok: false, error: 'Invalid JSON body' }, 400);
        }
        const selected = Array.isArray(body.selected) ? body.selected.map(String) : [];
        const confirm = body.flags?.confirm === true;
        const explicitDry = body.dryRun ?? body.flags?.dryRun;
        const flags: UpdateFlags = {
          latest: !!body.flags?.latest,
          force: !!body.flags?.force,
          frozenLockfile: !!body.flags?.frozenLockfile,
          noSave: !!body.flags?.noSave,
          production: !!body.flags?.production,
          recursive: !!body.flags?.recursive,
          // Safe default: dry-run unless confirm:true (or dryRun:false)
          dryRun: confirm ? false : explicitDry !== false,
        };
        const wantStream =
          body.stream === true || (req.headers.get('accept') ?? '').includes('text/event-stream');

        if (wantStream) {
          return new Response(updateEventsToSse(runPackageUpdate(selected, flags)), {
            headers: {
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-store',
              connection: 'keep-alive',
            },
          });
        }

        const events = [];
        for await (const ev of runPackageUpdate(selected, flags)) {
          events.push(ev);
        }
        const done = events.find(e => e.type === 'done');
        return json({
          ok: done?.type === 'done' ? done.ok : false,
          dryRun: flags.dryRun !== false,
          events,
          result: done,
        });
      }

      if (url.pathname === '/api/update/stream' || url.pathname === '/api/update/stream/') {
        // GET EventSource helper — always dry-run (mutating updates require POST + CSRF).
        const selected = (url.searchParams.get('selected') ?? '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const flags: UpdateFlags = {
          latest: url.searchParams.get('latest') === '1',
          force: url.searchParams.get('force') === '1',
          frozenLockfile: url.searchParams.get('frozen') === '1',
          noSave: url.searchParams.get('noSave') === '1',
          production: url.searchParams.get('production') === '1',
          recursive: url.searchParams.get('recursive') === '1',
          dryRun: true,
        };
        return new Response(updateEventsToSse(runPackageUpdate(selected, flags)), {
          headers: {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-store',
            connection: 'keep-alive',
          },
        });
      }

      // ── Registry browser + publish (snapshot + allowlisted presets) ──
      if (url.pathname === '/api/registry/presets' || url.pathname === '/api/registry/presets/') {
        return json({ presets: listPresets() });
      }

      if (url.pathname === '/api/registry/health' || url.pathname === '/api/registry/health/') {
        const preset = parseRegistryPreset(url.searchParams.get('preset')) ?? 'local';
        return json(await registryHealth(preset));
      }

      if (
        url.pathname === '/api/registry/workspaces' ||
        url.pathname === '/api/registry/workspaces/'
      ) {
        return json({ workspaces: await listPublishableWorkspaces() });
      }

      if (url.pathname === '/api/registry/packages' || url.pathname === '/api/registry/packages/') {
        const q = url.searchParams.get('q') ?? url.searchParams.get('search') ?? '';
        const type = url.searchParams.get('type') ?? '';
        return json(await searchRegistryPackages(q, type));
      }

      if (url.pathname.startsWith('/api/registry/packages/')) {
        const suffix = url.pathname.slice('/api/registry/packages/'.length);
        const name = packageNameFromPathSuffix(suffix);
        if (!name) return json({ error: 'package name required' }, 400);
        const version = url.searchParams.get('version');
        const live =
          url.searchParams.get('live') === '1' || url.searchParams.get('live') === 'true';
        const preset = parseRegistryPreset(url.searchParams.get('preset')) ?? 'local';
        const detail = await resolveRegistryPackage(name, { version, live, preset });
        if (!detail) return json({ error: 'package not found', name }, 404);
        return json(detail);
      }

      if (url.pathname === '/api/registry/publish' || url.pathname === '/api/registry/publish/') {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        let body: {
          workspace?: string;
          preset?: string;
          access?: 'public' | 'restricted';
          tag?: string;
          dryRun?: boolean;
          confirm?: boolean;
          tolerateRepublish?: boolean;
          gzipLevel?: number;
          stream?: boolean;
        };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ ok: false, error: 'Invalid JSON body' }, 400);
        }
        const preset = parseRegistryPreset(body.preset ?? 'local');
        if (!preset) return json({ ok: false, error: 'preset must be local|prod' }, 400);
        if (preset !== 'local') {
          return json(
            {
              ok: false,
              error: 'bun publish only allowed for preset=local; use /api/registry/factory-publish',
            },
            400
          );
        }
        const workspace = String(body.workspace ?? '').trim();
        if (!workspace) return json({ ok: false, error: 'workspace required' }, 400);
        const confirm = body.confirm === true;
        const dryRun = confirm ? false : body.dryRun !== false;
        const flags: PublishFlags = {
          access: body.access,
          tag: body.tag,
          dryRun,
          tolerateRepublish: !!body.tolerateRepublish,
          gzipLevel: body.gzipLevel,
        };
        const wantStream =
          body.stream === true || (req.headers.get('accept') ?? '').includes('text/event-stream');
        if (wantStream) {
          return new Response(publishEventsToSse(runBunPublish(workspace, flags)), {
            headers: {
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-store',
              connection: 'keep-alive',
            },
          });
        }
        const events = [];
        for await (const ev of runBunPublish(workspace, flags)) events.push(ev);
        const done = events.find(e => e.type === 'done');
        return json({
          ok: done?.type === 'done' ? done.ok : false,
          dryRun,
          events,
          result: done,
        });
      }

      if (
        url.pathname === '/api/registry/factory-publish' ||
        url.pathname === '/api/registry/factory-publish/'
      ) {
        if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
        let body: {
          workspace?: string;
          dryRun?: boolean;
          confirm?: boolean;
          stream?: boolean;
        };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ ok: false, error: 'Invalid JSON body' }, 400);
        }
        const workspace = String(body.workspace ?? '').trim();
        if (!workspace) return json({ ok: false, error: 'workspace required' }, 400);
        const confirm = body.confirm === true;
        const dryRun = confirm ? false : body.dryRun !== false;
        const wantStream =
          body.stream === true || (req.headers.get('accept') ?? '').includes('text/event-stream');
        if (wantStream) {
          return new Response(
            publishEventsToSse(runFactoryPublish(workspace, { dryRun, confirm })),
            {
              headers: {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-store',
                connection: 'keep-alive',
              },
            }
          );
        }
        const events = [];
        for await (const ev of runFactoryPublish(workspace, { dryRun, confirm })) {
          events.push(ev);
        }
        const done = events.find(e => e.type === 'done');
        return json({
          ok: done?.type === 'done' ? done.ok : false,
          dryRun,
          events,
          result: done,
        });
      }

      if (url.pathname === '/api/partners/health') {
        const auth = authenticatePartnerRequest(req, 'read');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        try {
          const tgIndex = buildBookTelegramIndex();
          const telegramByBookId: Record<string, string> = {};
          for (const [bookId, target] of Object.entries(tgIndex)) {
            telegramByBookId[bookId] = target.chatId;
          }
          return jsonWithRequestId(
            buildPartnerHealthPayload({ telegramByBookId }),
            200,
            auth.requestId
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonWithRequestId({ ok: false, error: message }, 500, auth.requestId);
        }
      }

      if (url.pathname === '/api/partners/signal' && req.method === 'POST') {
        const auth = authenticatePartnerRequest(req, 'write');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }

        // brand-ok — opaque research/wire id
        let body: { partnerId?: string; message?: string; topic?: string } | null = null; // brand-ok — opaque research/wire id
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return jsonWithRequestId({ ok: false, error: 'Invalid JSON body' }, 400, auth.requestId);
        }
        if (!body?.partnerId || !body?.message) {
          return jsonWithRequestId(
            { ok: false, error: 'Missing partnerId or message' },
            400,
            auth.requestId
          );
        }

        const result = await sendPartnerSignal({
          partnerId: String(body.partnerId),
          message: String(body.message),
          topic: body.topic ? String(body.topic) : undefined,
        });
        if (!result.ok) {
          return jsonWithRequestId(
            {
              ok: false,
              error: result.error,
              details: result.details,
            },
            result.status,
            auth.requestId
          );
        }
        return jsonWithRequestId(
          {
            success: true,
            ok: true,
            chatId: result.chatId,
            partnerCode: result.partnerCode,
            source: result.source,
            telegramMessageId: result.telegramMessageId,
          },
          200,
          auth.requestId
        );
      }

      // Desk UI: GET /api/partners/liquidity/aggregates → sport/league/market rollups
      if (url.pathname === '/api/partners/liquidity/aggregates' && req.method === 'GET') {
        const auth = authenticatePartnerRequest(req, 'read');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        const recentLimit = Number(url.searchParams.get('limit') ?? '20');
        const summary = getLiquiditySummary(recentLimit);
        const bySport: Record<string, number> = {};
        const byLeague: Record<string, number> = {};
        const byMarketType: Record<string, number> = {};
        const byCombination: Record<string, number> = {};
        for (const agg of summary.aggregates) {
          bySport[agg.sport] = (bySport[agg.sport] ?? 0) + agg.totalStakeUsd;
          byLeague[agg.league] = (byLeague[agg.league] ?? 0) + agg.totalStakeUsd;
          byMarketType[agg.marketType] = (byMarketType[agg.marketType] ?? 0) + agg.totalStakeUsd;
          byCombination[agg.key] = agg.totalStakeUsd;
        }
        return jsonWithRequestId(
          {
            ok: true,
            aggregates: { bySport, byLeague, byMarketType, byCombination },
            recent: summary.recent.map(s => ({
              partnerId: s.partnerId,
              sport: s.sport,
              league: s.league,
              marketType: s.marketType,
              amount: s.maxStakeUsd,
              timestamp: s.recordedAt,
              note: s.note,
              source: s.source,
            })),
            totalLiquidity: summary.totalStakeUsd,
            historyCount: summary.spotCount,
            generatedAt: summary.generatedAt,
            lastUpdated: summary.generatedAt,
          },
          200,
          auth.requestId
        );
      }

      if (url.pathname === '/api/partners/liquidity') {
        if (req.method === 'GET') {
          const auth = authenticatePartnerRequest(req, 'read');
          if (!auth.ok) {
            return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
          }
          const recentLimit = Number(url.searchParams.get('limit') ?? '25');
          return jsonWithRequestId(getLiquiditySummary(recentLimit), 200, auth.requestId);
        }

        if (req.method === 'POST') {
          const auth = authenticatePartnerRequest(req, 'write');
          if (!auth.ok) {
            return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
          }
          let body: {
            partnerId?: string; // brand-ok — opaque research/wire id
            sport?: string;
            league?: string;
            marketType?: string;
            /** Desk / accounting alias for maxStakeUsd */
            amount?: number;
            maxStakeUsd?: number;
            currency?: string;
            source?: 'manual' | 'research' | 'partner' | 'agent';
            note?: string; // brand-ok — opaque research/wire id
            marketId?: string; // brand-ok — opaque research/wire id
          } | null = null;
          try {
            body = (await req.json()) as typeof body;
          } catch {
            return jsonWithRequestId(
              { ok: false, error: 'Invalid JSON body' },
              400,
              auth.requestId
            );
          }
          const stake =
            body?.amount != null
              ? Number(body.amount)
              : body?.maxStakeUsd != null
                ? Number(body.maxStakeUsd)
                : NaN;
          if (
            !body?.partnerId ||
            !body.sport ||
            !body.league ||
            !body.marketType ||
            !Number.isFinite(stake)
          ) {
            return jsonWithRequestId(
              {
                ok: false,
                error:
                  'Missing fields: partnerId, sport, league, marketType, amount (or maxStakeUsd)',
              },
              400,
              auth.requestId
            );
          }
          const spot = addLiquiditySpot({
            partnerId: String(body.partnerId),
            sport: String(body.sport),
            league: String(body.league),
            marketType: String(body.marketType),
            maxStakeUsd: stake,
            currency: body.currency ? String(body.currency) : 'USD',
            source: body.source ?? 'manual',
            note: body.note ? String(body.note) : undefined,
            marketId: body.marketId ? String(body.marketId) : undefined,
          });
          return jsonWithRequestId(
            {
              success: true,
              ok: true,
              total: spot.maxStakeUsd,
              spot,
              entry: {
                partnerId: spot.partnerId,
                sport: spot.sport,
                league: spot.league,
                marketType: spot.marketType,
                amount: spot.maxStakeUsd,
                timestamp: spot.recordedAt,
                note: spot.note,
              },
            },
            201,
            auth.requestId
          );
        }

        return json({ error: 'method not allowed' }, 405);
      }

      if (url.pathname === '/api/research/limits') {
        const auth = authenticatePartnerRequest(req, 'read');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        const partnerId = url.searchParams.get('partnerId')?.trim();
        if (!partnerId) {
          return jsonWithRequestId(
            { ok: false, error: 'Missing partnerId query param' },
            400,
            auth.requestId
          );
        }
        const limit = Number(url.searchParams.get('limit') ?? '100');
        const rows = getLimitsHistory(partnerId, { limit });
        return jsonWithRequestId(
          { ok: true, partnerId, count: rows.length, limits: rows },
          200,
          auth.requestId
        );
      }

      if (url.pathname === '/api/research/coverage') {
        const auth = authenticatePartnerRequest(req, 'read');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        const coverage = getResearchCoverage();
        const agent = getResearchAgent()?.status() ?? null;
        return jsonWithRequestId(
          {
            ok: true,
            coverage,
            agent,
            count: coverage.length,
            generatedAt: new Date().toISOString(),
          },
          200,
          auth.requestId
        );
      }

      if (url.pathname === '/api/research/markets') {
        const auth = authenticatePartnerRequest(req, 'read');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        const partnerId = url.searchParams.get('partnerId')?.trim();
        const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') ?? '100'), 500));
        let markets = getResearchAgent()?.lastMarkets() ?? getLastResearchMarkets();
        if (partnerId) markets = markets.filter(m => m.partnerId === partnerId);
        markets = markets.slice(0, limit);
        const coverage = getResearchCoverage();
        const agent = getResearchAgent()?.status() ?? null;
        return jsonWithRequestId(
          {
            ok: true,
            markets,
            coverage,
            agent,
            count: markets.length,
            generatedAt: new Date().toISOString(),
          },
          200,
          auth.requestId
        );
      }

      if (url.pathname === '/api/research/run' && req.method === 'POST') {
        const auth = authenticatePartnerRequest(req, 'write');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        let live = Bun.env.RESEARCH_AGENT_LIVE === '1';
        try {
          const body = (await req.json()) as { live?: boolean };
          if (typeof body?.live === 'boolean') live = body.live;
        } catch {
          /* empty body ok */
        }
        const agent = getResearchAgent();
        const result = agent ? await agent.runOnce() : await runResearchCycle({ live });
        return jsonWithRequestId(
          {
            ok: result.ok,
            ranAt: result.ranAt,
            marketCount: result.markets.length,
            markets: result.markets.length,
            events: result.events.length,
            snapshotsStored: result.snapshotsStored,
            alertsFired: result.alertsFired,
            changes: result.changes.length,
            liquidityPushed: result.liquidityPushed,
            limitsRecorded: result.limitsRecorded,
            error: result.error ?? null,
            fetches: result.fetches.map(f => ({
              partnerId: f.partnerId,
              ok: f.ok,
              mode: f.mode,
              count: f.markets.length,
              error: f.error ?? null,
            })),
          },
          result.ok ? 200 : 500,
          auth.requestId
        );
      }

      if (
        url.pathname === '/api/events' ||
        url.pathname === '/api/events/' ||
        url.pathname === '/api/research/events' ||
        url.pathname === '/api/research/events/'
      ) {
        const session =
          url.searchParams.get('session') ?? url.searchParams.get('period') ?? undefined;
        const events = listEvents({
          sport: url.searchParams.get('sport') ?? undefined,
          league: url.searchParams.get('league') ?? undefined,
          status: url.searchParams.get('status') ?? undefined,
          session: session ?? undefined,
          geo: url.searchParams.get('geo') ?? undefined,
          state: url.searchParams.get('state') ?? undefined,
          limit: Number(url.searchParams.get('limit') ?? '100'),
        });
        const filters = listEventFilterOptions();
        return json({
          count: events.length,
          events,
          filters: {
            ...filters,
            sessions: ['live', 'pregame'],
          },
        });
      }

      if (url.pathname === '/api/research/alerts' || url.pathname === '/api/research/alerts/') {
        if (req.method === 'GET') {
          const alerts = await listEventAlertConfigs();
          return json({ ok: true, count: alerts.length, alerts });
        }
        if (req.method === 'POST' || req.method === 'PUT') {
          const auth = authenticatePartnerRequest(req, 'write');
          if (!auth.ok) {
            return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
          }
          let body: unknown;
          try {
            body = await req.json();
          } catch {
            return json({ ok: false, error: 'Invalid JSON body' }, 400);
          }
          const configs = Array.isArray(body)
            ? (body as EventAlertConfig[])
            : Array.isArray((body as { alerts?: EventAlertConfig[] })?.alerts)
              ? (body as { alerts: EventAlertConfig[] }).alerts
              : null;
          if (!configs) {
            return json({ ok: false, error: 'Expected alerts array' }, 400);
          }
          await saveEventAlertConfigs(configs);
          return jsonWithRequestId(
            { ok: true, count: configs.length, alerts: configs },
            200,
            auth.requestId
          );
        }
        return json({ error: 'method not allowed' }, 405);
      }

      if (
        (url.pathname === '/api/research/cycle' || url.pathname === '/api/research/run') &&
        req.method === 'POST'
      ) {
        const auth = authenticatePartnerRequest(req, 'write');
        if (!auth.ok) {
          return jsonWithRequestId({ ok: false, error: auth.error }, auth.status, auth.requestId);
        }
        const result = await runResearchCycle({
          live: url.searchParams.get('live') === '1',
        });
        return jsonWithRequestId(
          {
            ok: result.ok,
            markets: result.markets.length,
            events: result.events.length,
            snapshotsStored: result.snapshotsStored,
            alertsFired: result.alertsFired,
            changes: result.changes.length,
            error: result.error,
            ranAt: result.ranAt,
          },
          result.ok ? 200 : 500,
          auth.requestId
        );
      }

      const eventHistoryMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/history\/?$/);
      if (eventHistoryMatch) {
        const eventId = Number(decodeURIComponent(eventHistoryMatch[1]!));
        if (!Number.isFinite(eventId) || eventId <= 0) {
          return json({ error: 'Invalid event id' }, 400);
        }
        const market = url.searchParams.get('market') ?? 'moneyline';
        const series = queryOddsHistorySeries({
          eventId,
          market,
          selection: url.searchParams.get('selection') ?? undefined,
          bucketMs: url.searchParams.get('bucketMs')
            ? Number(url.searchParams.get('bucketMs'))
            : undefined,
          limit: Number(url.searchParams.get('limit') ?? '500'),
        });
        let points = series.points.map(p => ({
          timestamp: p.timestamp,
          odds_decimal: p.oddsDecimal,
          bookmaker: p.bookmaker,
          host: p.host,
          selection: p.selection,
          tier: p.tier,
        }));
        let source: 'odds' | 'snapshots' = 'odds';
        if (points.length === 0) {
          const canonicalId = lookupCanonicalIdForEventRow(eventId);
          if (canonicalId) {
            const snaps = await listSnapshots(canonicalId, {
              limit: Number(url.searchParams.get('limit') ?? '100'),
            });
            const marketKey = market.toLowerCase();
            points = snaps
              .flatMap(snap => {
                const m =
                  snap.markets.find(x => x.type.toLowerCase().includes(marketKey)) ??
                  snap.markets[0];
                const sel = m?.selections?.[0];
                if (!sel || typeof sel.price !== 'number') return [];
                return [
                  {
                    timestamp: Date.parse(snap.timestamp) || Date.now(),
                    odds_decimal: sel.price,
                    bookmaker: snap.partnerId,
                    host: snap.partnerId,
                    selection: sel.label,
                    tier: null as string | null,
                  },
                ];
              })
              .sort((a, b) => a.timestamp - b.timestamp);
            if (points.length) source = 'snapshots';
          }
        }
        return json({
          eventId: series.eventId,
          market: series.market,
          count: points.length,
          source,
          points,
        });
      }

      const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/?$/);
      if (eventMatch) {
        const eventId = Number(decodeURIComponent(eventMatch[1]!));
        if (!Number.isFinite(eventId) || eventId <= 0) {
          return json({ error: 'Invalid event id' }, 400);
        }
        const event = getEvent(eventId);
        if (!event) return json({ error: 'not found', id: eventId }, 404);
        const partner_mappings = listPartnerMappingsForEventRow(eventId);
        return json({ event, partner_mappings });
      }

      if (
        url.pathname === '/api/alerts/rules/reload' ||
        url.pathname === '/api/alerts/rules/reload/'
      ) {
        if (req.method !== 'POST' && req.method !== 'GET') {
          return json({ error: 'method not allowed' }, 405);
        }
        const rules = await reloadAlertRules();
        return json({
          ok: true,
          status: 'reloaded',
          path: alertsTomlPath(),
          count: rules.length,
          rules: rules.map(serializeRule),
        });
      }

      if (url.pathname === '/api/alerts/rules' || url.pathname === '/api/alerts/rules/') {
        if (req.method === 'GET') {
          const rules = await loadAlertRules();
          return json({ count: rules.length, rules: rules.map(serializeRule) });
        }
        if (req.method === 'POST' || req.method === 'PUT') {
          const auth = checkApiKey(req);
          if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
          let body: Record<string, unknown>;
          try {
            body = (await req.json()) as Record<string, unknown>;
          } catch {
            return json({ ok: false, error: 'Invalid JSON body' }, 400);
          }
          try {
            const rule = await upsertAlertRule(ruleInputFromBody(body));
            return json({ ok: true, rule: serializeRule(rule) });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return json({ ok: false, error: message }, 400);
          }
        }
        return json({ error: 'method not allowed' }, 405);
      }

      const ruleMatch = url.pathname.match(/^\/api\/alerts\/rules\/([^/]+)\/?$/);
      if (ruleMatch) {
        const ruleId = decodeURIComponent(ruleMatch[1]!);
        if (req.method === 'DELETE') {
          const auth = checkApiKey(req);
          if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
          const deleted = await deleteAlertRule(ruleId);
          if (!deleted) return json({ ok: false, error: 'not found', id: ruleId }, 404);
          return json({ ok: true, deleted: ruleId });
        }
        if (req.method === 'PUT' || req.method === 'POST') {
          const auth = checkApiKey(req);
          if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
          let body: Record<string, unknown>;
          try {
            body = (await req.json()) as Record<string, unknown>;
          } catch {
            return json({ ok: false, error: 'Invalid JSON body' }, 400);
          }
          try {
            const rule = await upsertAlertRule(ruleInputFromBody(body, ruleId));
            return json({ ok: true, rule: serializeRule(rule) });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return json({ ok: false, error: message }, 400);
          }
        }
        return json({ error: 'method not allowed' }, 405);
      }

      if (url.pathname === '/api/signals' || url.pathname === '/api/signals/') {
        const periodParam = (url.searchParams.get('period') ?? 'all') as OddsPeriod;
        const period: OddsPeriod =
          periodParam === 'prematch' || periodParam === 'live' || periodParam === 'all'
            ? periodParam
            : 'all';
        const signals = await detectSignals({
          period,
          limit: Number(url.searchParams.get('limit') ?? '50'),
        });
        return json({
          count: signals.length,
          period,
          signals: signals.map(s => ({
            ...s,
            edge_pct: Number((s.edge * 100).toFixed(3)),
            matched_rules: s.matchedRuleIds,
          })),
        });
      }

      if (url.pathname === '/api/alerts') {
        if (url.searchParams.get('evaluate') === '1') {
          const periodParam = url.searchParams.get('period') as OddsPeriod | null;
          const emitted = await evaluateAlerts({
            period:
              periodParam === 'prematch' || periodParam === 'live' || periodParam === 'all'
                ? periodParam
                : undefined,
          });
          return json({
            count: emitted.length,
            alerts: emitted.map(a => serializeAlertForPortal(a)),
            evaluated: true,
          });
        }
        const alerts = listRecentAlerts(Number(url.searchParams.get('limit') ?? '50'));
        return json({
          count: alerts.length,
          alerts: alerts.map(a => serializeAlertForPortal(a)),
        });
      }

      if (url.pathname === '/api/tasks') {
        return json({ ids: listTaskIds() });
      }

      if (url.pathname.startsWith('/api/tasks/')) {
        const taskId = decodeURIComponent(url.pathname.slice('/api/tasks/'.length));
        if (!taskId) return json({ error: 'task id required' }, 400);

        const taskPromise = getTaskPromise(taskId);
        if (!taskPromise) return json({ error: 'not found', id: taskId }, 404);

        // Optimistic Bun.peek path — skip await microtask when already settled.
        const status = Bun.peek.status(taskPromise);
        if (status === 'fulfilled') {
          const peeked = Bun.peek(taskPromise);
          const record = getTask(taskId);
          return json({
            id: taskId,
            kind: record?.kind ?? 'unknown',
            createdAt: record?.createdAt,
            status: 'fulfilled',
            peeked: true,
            result: peeked,
          });
        }
        if (status === 'rejected') {
          const view = await resolveTaskView(taskId);
          return json(view, 500);
        }

        const view = await resolveTaskView(taskId);
        return json(view);
      }

      if (
        url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname === '/dashboard.html'
      ) {
        return agentOddsHtml(req, AGENT_ODDS_V105);
      }
      if (
        url.pathname === '/dashboard-v1.12.html' ||
        url.pathname === '/system' ||
        url.pathname === '/system.html' ||
        url.pathname === '/registry' ||
        url.pathname === '/registry.html'
      ) {
        return agentOddsHtml(req, AGENT_ODDS_V112);
      }
      if (url.pathname === '/packages' || url.pathname === '/packages.html') {
        return agentOddsHtml(req, AGENT_ODDS_V111);
      }
      if (url.pathname === '/dashboard-v1.11.html') {
        return agentOddsHtml(req, AGENT_ODDS_V111);
      }
      if (url.pathname === '/dashboard-v1.10.html') {
        return agentOddsHtml(req, AGENT_ODDS_V110);
      }
      if (url.pathname === '/dashboard-v1.07.html') {
        return agentOddsHtml(req, AGENT_ODDS_V107);
      }
      if (url.pathname === '/dashboard-events-v1.05.html') {
        return agentOddsHtml(req, AGENT_ODDS_EVENTS_V105);
      }
      if (url.pathname === '/dashboard-v1.05.html') {
        return agentOddsHtml(req, AGENT_ODDS_V105);
      }
      if (url.pathname === '/dashboard-v1.04.html') {
        return agentOddsHtml(req, AGENT_ODDS_V104);
      }
      if (url.pathname === '/dashboard-v1.03.html') {
        return agentOddsHtml(req, AGENT_ODDS_V103);
      }
      if (
        url.pathname === '/dashboard-partner-intel.html' ||
        url.pathname === '/dashboard-partner.html' ||
        url.pathname === '/dashboard-partner-v1.05.html'
      ) {
        const issued = issueCsrf(req);
        for (const path of [AGENT_ODDS_PARTNER_V105, AGENT_ODDS_PARTNER, AGENT_ODDS_V104]) {
          const res = await respondBunFile(path, {
            cacheControl: 'no-store',
            headers: issued.setCookie ? { 'set-cookie': issued.setCookie } : undefined,
          });
          if (res.status !== 404) {
            const headers = new Headers(res.headers);
            headers.set('x-csrf-token', issued.token);
            return new Response(res.body, { status: res.status, headers });
          }
        }
        return json({ error: 'partner dashboard not found' }, 404);
      }

      // Static portal assets — Content-Type from Bun.file.type
      if (url.pathname.startsWith('/portal/')) {
        const abs = resolveUnderRoot(PUBLIC_PORTAL_DIR, url.pathname.slice('/portal/'.length));
        if (!abs) return json({ error: 'invalid path' }, 400);
        return respondBunFile(abs, {
          cacheControl: url.pathname.endsWith('.html') ? 'no-store' : 'public, max-age=300',
        });
      }

      // Screenshots written via Bun.write — MIME from Bun.file.type (image/png, image/webp)
      if (url.pathname.startsWith('/api/screenshots/')) {
        const name = decodeURIComponent(url.pathname.slice('/api/screenshots/'.length));
        const abs = resolveUnderRoot(SCREENSHOTS_DIR, name);
        if (!abs) return json({ error: 'invalid path' }, 400);
        return respondBunFile(abs, { cacheControl: 'public, max-age=3600' });
      }

      // Export artifacts under data/exports
      if (url.pathname.startsWith('/api/exports/')) {
        const name = decodeURIComponent(url.pathname.slice('/api/exports/'.length));
        const abs = resolveUnderRoot(EXPORTS_DIR, name);
        if (!abs) return json({ error: 'invalid path' }, 400);
        return respondBunFile(abs, {
          cacheControl: 'no-store',
          downloadAs: name.includes('/') ? name.split('/').pop() : name,
        });
      }

      if (url.pathname === '/platform' || url.pathname === '/platform.html') {
        return new Response(PLATFORM_HTML, {
          headers: {
            'content-type': 'text/html;charset=utf-8',
            'x-bun-file-type': 'text/html;charset=utf-8',
          },
        });
      }

      return json({ error: 'not found' }, 404);
    },
  });

  return {
    port: server.port,
    url: `http://${hostname}:${server.port}/`,
    odds,
    research,
    oddsMonitor,
    stop() {
      oddsMonitor?.stop();
      research?.stop();
      server.stop(true);
      odds?.stop();
    },
  };
}

const PLATFORM_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Operator research platform</title>
  <style>
    :root { color-scheme: dark; --bg:#0f1419; --fg:#e7ecf1; --muted:#8b949e; --line:#30363d; --ok:#3fb950; --bad:#f85149; }
    body { margin: 0; font-family: "IBM Plex Mono", ui-monospace, monospace; background: radial-gradient(1200px 600px at 10% -10%, #1b2838, var(--bg)); color: var(--fg); }
    main { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    h1 { font-size: 1.25rem; letter-spacing: 0.02em; margin: 0 0 0.35rem; }
    p { color: var(--muted); margin: 0 0 1.25rem; }
    pre { background: rgba(0,0,0,.35); border: 1px solid var(--line); border-radius: 10px; padding: 1rem; overflow: auto; font-size: 12px; line-height: 1.45; }
    .row { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .chip { border: 1px solid var(--line); border-radius: 999px; padding: .25rem .7rem; font-size: 12px; }
    .ok { color: var(--ok); } .bad { color: var(--bad); }
  </style>
</head>
<body>
  <main>
    <h1>Operator research · platform</h1>
    <p>Live <code>/api/platform</code> snapshot (Bun version, features, tools).</p>
    <div class="row" id="chips"></div>
    <pre id="out">loading…</pre>
  </main>
  <script>
    async function refresh() {
      const res = await fetch('/api/platform');
      const data = await res.json();
      document.getElementById('out').textContent = JSON.stringify(data, null, 2);
      const chips = document.getElementById('chips');
      chips.innerHTML = '';
      const items = [
        ['bun', data.bun?.version + (data.bun?.satisfies ? ' ✓' : ' ✗')],
        ['webview', data.features?.webview],
        ['image', data.features?.image],
        ['cron', data.features?.cron],
        ['operators', data.config?.operators],
      ];
      for (const [k,v] of items) {
        const el = document.createElement('span');
        el.className = 'chip ' + (v === false ? 'bad' : 'ok');
        el.textContent = k + ': ' + v;
        chips.appendChild(el);
      }
    }
    refresh();
    setInterval(refresh, 15000);
  </script>
</body>
</html>
`;

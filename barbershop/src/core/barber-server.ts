#!/usr/bin/env bun

import { serve, redis, env } from 'bun';
import crypto from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { Database } from 'bun:sqlite';
import manifestData from '../../manifest.toml' with { type: 'toml' };
import { fetchWithDefaults, isPublicHttpUrl } from '../utils/fetch-utils';
import { getFactorySecret } from '../secrets/factory-secrets';

export type BarberRecord = {
  id: string;
  name: string;
  code: string;
  skills: string[];
  commissionRate: string;
  status: string;
};

export type Report = {
  revenue: number;
  tips: number;
  barbers: Record<string, string>;
};

const PORT_ENV_KEYS = ['BUN_PORT', 'PORT', 'NODE_PORT'] as const;
const DEFAULT_PORT = 3000;

function resolvePort() {
  const envMap = env as Record<string, string | undefined>;
  for (const key of PORT_ENV_KEYS) {
    const value = Number(envMap[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return DEFAULT_PORT;
}

const PORT = resolvePort();
const HOST = env.HOST ?? '0.0.0.0';
const SERVER_NAME = env.SERVER_NAME ?? 'Native Barber Server';
const KEEP_ALIVE_TIMEOUT_SEC = Number(env.KEEP_ALIVE_TIMEOUT_SEC ?? 5);
const KEEP_ALIVE_MAX = Number(env.KEEP_ALIVE_MAX ?? 1000);
const LIFECYCLE_KEY = env.LIFECYCLE_KEY ?? '';
const AUTO_UNREF = env.AUTO_UNREF === 'true';
const DNS_PREFETCH_HOSTS = (env.DNS_PREFETCH_HOSTS ?? 'example.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const DNS_WARMUP_HOSTS = (env.DNS_WARMUP_HOSTS ?? env.DNS_PREFETCH_HOSTS ?? 'example.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const DNS_WARMUP_TIMEOUT_MS = Number(env.DNS_WARMUP_TIMEOUT_MS ?? 500);
const MANAGER_KEY = env.MANAGER_KEY ?? '';
const PAYPAL_SECRET_ENV = env.PAYPAL_SECRET ?? '';
const TLS_KEY_PATH = env.TLS_KEY_PATH ?? '';
const TLS_CERT_PATH = env.TLS_CERT_PATH ?? '';
const TLS_CA_PATH = env.TLS_CA_PATH ?? '';
const ALLOW_INSECURE_WS = env.ALLOW_INSECURE_WS === 'true';
const NODE_ENV = env.NODE_ENV ?? 'development';
const CACHE_TTL_MS = Number(env.BARBER_CACHE_TTL_MS ?? 2000);

function responseHeaders(contentType: string) {
  return {
    'Content-Type': contentType,
    Connection: 'keep-alive',
    'Keep-Alive': `timeout=${KEEP_ALIVE_TIMEOUT_SEC}, max=${KEEP_ALIVE_MAX}`,
    'X-Server-Name': SERVER_NAME,
    Vary: 'Accept-Encoding',
    'Cache-Control': 'no-store',
  };
}

function etagFor(body: string) {
  return `"${Bun.hash(body).toString(16)}"`;
}

function textResponse(body: string, contentType: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...responseHeaders(contentType),
      ETag: etagFor(body),
    },
  });
}

function requireEnv(name: string, value: string) {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
}

function validateEnv() {
  if (NODE_ENV === 'production' && ALLOW_INSECURE_WS) {
    throw new Error('ALLOW_INSECURE_WS not permitted in production');
  }
  if (NODE_ENV === 'production') {
    requireEnv('MANAGER_KEY', MANAGER_KEY);
    if (!PAYPAL_SECRET_ENV) {
      throw new Error('Missing PAYPAL_SECRET in production');
    }
    requireEnv('LIFECYCLE_KEY', LIFECYCLE_KEY);
  }
  if ((TLS_KEY_PATH && !TLS_CERT_PATH) || (!TLS_KEY_PATH && TLS_CERT_PATH)) {
    throw new Error('TLS_KEY_PATH and TLS_CERT_PATH must be set together');
  }
}

validateEnv();

const db = new Database(':memory:');
db.run('CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,data TEXT)');

const wsClients = new Set<WebSocket>();
let redisSubscribed = false;

async function subscribeRedis(channel: string) {
  if (redisSubscribed) return;
  redisSubscribed = true;
  await redis.subscribe(channel, message => {
    for (const ws of wsClients) {
      try {
        ws.send(message);
      } catch (err) {
        // Client disconnected, remove from set
        wsClients.delete(ws);
      }
    }
  });
}

function requestId() {
  return crypto.randomUUID();
}

function logInfo(event: string, details: Record<string, unknown>) {
  const payload = { event, ...details };
  console.log(JSON.stringify(payload));
}

function parseCookie(header: string) {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function serializeCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    maxAge?: number;
  }
) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) segments.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) segments.push(`Path=${opts.path}`);
  if (opts.httpOnly) segments.push('HttpOnly');
  if (opts.secure) segments.push('Secure');
  if (opts.sameSite) segments.push(`SameSite=${opts.sameSite}`);
  return segments.join('; ');
}

function parseClearRequest(url: URL, managerKey: string) {
  return url.pathname === '/clear' && url.searchParams.get('key') === managerKey;
}

async function getPaypalSecret() {
  if (PAYPAL_SECRET_ENV) return PAYPAL_SECRET_ENV;
  try {
    return (await getFactorySecret('PAYPAL_SECRET')) ?? '';
  } catch (err) {
    if (NODE_ENV === 'production') {
      throw new Error('PAYPAL_SECRET unavailable in production');
    }
    return '';
  }
}

const barberCache = {
  data: null as Record<string, string> | null,
  fetchedAt: 0,
};

async function getBarberRecord() {
  const now = Date.now();
  if (barberCache.data && now - barberCache.fetchedAt < CACHE_TTL_MS) {
    return barberCache.data;
  }
  try {
    const record = await redis.hgetall('barber:jb');
    barberCache.data = record;
    barberCache.fetchedAt = now;
    return record;
  } catch (err) {
    logInfo('redis_hgetall_failed', { message: String(err) });
    if (barberCache.data) return barberCache.data;
    return {};
  }
}

async function getUserTokens(userId: string) {
  const key = `user:${userId}:tokens`;
  try {
    const tokens = await redis.hgetall(key);
    return tokens;
  } catch (err) {
    logInfo('redis_hgetall_tokens_failed', { message: String(err), key });
    return {};
  }
}

function buildReport(barbers: Record<string, string>): Report {
  return { revenue: 600, tips: 50, barbers };
}

const telemetry = {
  requests: 0,
  errors: 0,
  latencyMs: 0,
  perEndpoint: {} as Record<
    string,
    { count: number; errors: number; lastLatencyMs: number; p95Ms: number; p99Ms: number }
  >,
};

const endpointLatencies: Record<string, number[]> = {};
const LATENCY_WINDOW = Number(env.BARBER_LATENCY_WINDOW ?? 200);
const manifestFile = Bun.file(new URL('./manifest.toml', import.meta.url).pathname);
const docsReadmeFile = Bun.file(new URL('./README.md', import.meta.url).pathname);
const docsClientFile = Bun.file(new URL('./CLIENT.md', import.meta.url).pathname);
const docsAdminFile = Bun.file(new URL('./ADMIN.md', import.meta.url).pathname);
let shutdownHooksInstalled = false;

function resourceHintsHtml() {
  return DNS_PREFETCH_HOSTS.map(
    host =>
      `<link rel="dns-prefetch" href="//${host}"><link rel="preconnect" href="https://${host}" crossorigin>`
  ).join('\n  ');
}

const RESOURCE_HINTS = resourceHintsHtml();

async function warmupDns(hosts: string[]) {
  if (!hosts.length) return;
  for (const host of hosts) {
    const started = performance.now();
    try {
      await Promise.race([
        lookup(host),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), DNS_WARMUP_TIMEOUT_MS)
        ),
      ]);
      logInfo('dns_warmup_ok', {
        host,
        durationMs: Math.round((performance.now() - started) * 1000) / 1000,
      });
    } catch (error) {
      logInfo('dns_warmup_error', { host, error: String(error) });
    }
  }
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[idx] * 1000) / 1000;
}

function buildTelemetrySnapshot() {
  const snapshot = { ...telemetry, perEndpoint: {} as typeof telemetry.perEndpoint };
  for (const [path, entry] of Object.entries(telemetry.perEndpoint)) {
    const values = endpointLatencies[path] ?? [];
    snapshot.perEndpoint[path] = {
      ...entry,
      p95Ms: percentile(values, 95),
      p99Ms: percentile(values, 99),
    };
  }
  return snapshot;
}

async function redisHealthy() {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 200));
    const pong = await Promise.race([redis.ping(), timeout]);
    return pong === 'PONG';
  } catch (err) {
    return false;
  }
}

function telemetryHtml(snapshot: ReturnType<typeof buildTelemetrySnapshot>) {
  const rows = Object.entries(snapshot.perEndpoint)
    .map(([path, entry]) => {
      return `<tr><td>${path}</td><td>${entry.count}</td><td>${entry.errors}</td><td>${entry.lastLatencyMs}</td><td>${entry.p95Ms}</td><td>${entry.p99Ms}</td></tr>`;
    })
    .join('');
  return `<!doctype html>
  <html><head><meta charset="utf-8"><title>Telemetry</title>
  ${RESOURCE_HINTS}
  <style>
  body{font-family:ui-sans-serif,system-ui;margin:24px;background:#0b0f1a;color:#e8f2ff}
  table{border-collapse:collapse;width:100%;background:#0f1a2b}
  th,td{border:1px solid #1c2740;padding:8px;font-size:12px}
  th{background:#101b35;text-align:left}
  </style></head><body>
  <h2>Telemetry</h2>
  <p>Requests: ${snapshot.requests} | Errors: ${snapshot.errors} | Last Latency: ${snapshot.latencyMs}ms</p>
  <table><thead><tr><th>Path</th><th>Count</th><th>Errors</th><th>Last</th><th>P95</th><th>P99</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;
}

function docsHtml(port: number, baseUrl: string) {
  return `<!doctype html>
  <html><head><meta charset="utf-8"><title>Barbershop Server Docs</title>
  ${RESOURCE_HINTS}
  <style>
  body{font-family:ui-sans-serif,system-ui;margin:24px;background:#f6f8fb;color:#0d1b2a}
  .card{background:#fff;border:1px solid #d7deea;border-radius:8px;padding:14px;margin:12px 0}
  code{background:#eef2f8;padding:2px 6px;border-radius:4px}
  a{text-decoration:none;color:#0954d8}
  </style></head><body>
  <h2>Barbershop Server Docs</h2>
  <p><code>${SERVER_NAME}</code> on <code>${baseUrl}</code> (port <code>${port}</code>)</p>
  <div class="card">
    <h3>Endpoints</h3>
    <p><a href="/health"><code>/health</code></a> | <a href="/telemetry"><code>/telemetry</code></a> | <a href="/telemetry?format=html"><code>/telemetry?format=html</code></a></p>
    <p><a href="/docs/readme"><code>/docs/readme</code></a> | <a href="/docs/manifest"><code>/docs/manifest</code></a> | <a href="/docs/manifest.json"><code>/docs/manifest.json</code></a></p>
    <p><a href="/docs/client"><code>/docs/client</code></a> | <a href="/docs/admin"><code>/docs/admin</code></a></p>
    <p><a href="/ops/fetch-check?url=https://example.com"><code>/ops/fetch-check</code></a> (outbound fetch diagnostics)</p>
    <p><a href="/ops/runtime"><code>/ops/runtime</code></a> | <a href="/ops/lifecycle?action=status&key=***"><code>/ops/lifecycle</code></a></p>
  </div>
  </body></html>`;
}

type StartServerOptions = {
  port?: number;
  host?: string;
};

async function startServer(options: StartServerOptions = {}) {
  const runtimePort = options.port ?? PORT;
  const runtimeHost = options.host ?? HOST;
  const baseUrl = env.PUBLIC_BASE_URL ?? `http://localhost:${runtimePort}`;
  const server = serve({
    port: runtimePort,
    hostname: runtimeHost,
    development:
      TLS_KEY_PATH && TLS_CERT_PATH
        ? { tls: { key: Bun.file(TLS_KEY_PATH), cert: Bun.file(TLS_CERT_PATH) } }
        : undefined,
    websocket: {
      open(ws) {
        wsClients.add(ws);
      },
      close(ws) {
        wsClients.delete(ws);
      },
    },
    async fetch(req) {
      const start = performance.now();
      const rid = requestId();
      telemetry.requests += 1;
      let status = 200;
      let path = '';

      try {
        const url = new URL(req.url);
        path = url.pathname;

        if (url.pathname === '/ws/dashboard') {
          const ok = server.upgrade(req, {
            data: {},
            perMessageDeflate: false,
            tls: TLS_CA_PATH
              ? { ca: Bun.file(TLS_CA_PATH), rejectUnauthorized: !ALLOW_INSECURE_WS }
              : { rejectUnauthorized: !ALLOW_INSECURE_WS },
          });
          if (!ok) {
            status = 426;
            logInfo('ws_upgrade_failed', { rid, path });
            return new Response('Upgrade failed', { status });
          }
          return;
        }

        if (url.pathname === '/barber/login') {
          const parsed = parseCookie(req.headers.get('cookie') || '');
          await getPaypalSecret();
          const r = await getBarberRecord();
          const tokens = await getUserTokens('ashschaeffer1');
          return new Response(
            JSON.stringify({
              success: true,
              barber: { ...r, cookie: parsed },
              tokens,
              session: 'jb',
            }),
            {
              headers: {
                ...responseHeaders('application/json; charset=utf-8'),
                'Set-Cookie': serializeCookie('auth', 'jb', {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'strict',
                }),
              },
            }
          );
        }

        if (parseClearRequest(url, MANAGER_KEY)) {
          const r = await getBarberRecord();
          const report = buildReport(r);
          db.prepare('INSERT OR REPLACE INTO reports VALUES(?,?)').run(
            Date.now().toString(),
            JSON.stringify(report)
          );
          await redis.publish('eod', JSON.stringify(report));
          return new Response(JSON.stringify(report), {
            headers: {
              ...responseHeaders('application/json; charset=utf-8'),
              'Set-Cookie': serializeCookie('session', 'jb', {
                httpOnly: true,
                path: '/',
                maxAge: 3600,
                sameSite: 'strict',
                secure: true,
              }),
              'Proxy-Connection': 'keep-alive',
            },
          });
        }

        if (url.pathname === '/telemetry') {
          const snapshot = buildTelemetrySnapshot();
          if (url.searchParams.get('format') === 'html') {
            return textResponse(telemetryHtml(snapshot), 'text/html; charset=utf-8');
          }
          return new Response(JSON.stringify(snapshot), {
            headers: responseHeaders('application/json; charset=utf-8'),
          });
        }

        if (url.pathname === '/docs') {
          return textResponse(docsHtml(runtimePort, baseUrl), 'text/html; charset=utf-8');
        }

        if (url.pathname === '/docs/manifest') {
          const text = await manifestFile.text();
          return textResponse(text, 'application/toml; charset=utf-8');
        }

        if (url.pathname === '/docs/manifest.json') {
          return new Response(JSON.stringify(manifestData), {
            headers: responseHeaders('application/json; charset=utf-8'),
          });
        }

        if (url.pathname === '/docs/readme') {
          const text = await docsReadmeFile.text();
          return textResponse(text, 'text/markdown; charset=utf-8');
        }

        if (url.pathname === '/docs/client') {
          const text = await docsClientFile.text();
          return textResponse(text, 'text/markdown; charset=utf-8');
        }

        if (url.pathname === '/docs/admin') {
          const text = await docsAdminFile.text();
          return textResponse(text, 'text/markdown; charset=utf-8');
        }

        if (url.pathname === '/health') {
          const ok = await redisHealthy();
          const payload = { status: ok ? 'ok' : 'degraded', redis: ok };
          return new Response(JSON.stringify(payload), {
            status: ok ? 200 : 503,
            headers: responseHeaders('application/json; charset=utf-8'),
          });
        }

        if (url.pathname === '/ops/fetch-check') {
          const target = url.searchParams.get('url') || 'https://example.com';
          if (!isPublicHttpUrl(target)) {
            return new Response(
              JSON.stringify({ ok: false, error: 'Only public http/https URLs are allowed.' }),
              { status: 400, headers: responseHeaders('application/json; charset=utf-8') }
            );
          }
          const method = (url.searchParams.get('method') || 'GET').toUpperCase();
          const allowedMethods = new Set([
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'HEAD',
            'OPTIONS',
          ]);
          if (!allowedMethods.has(method)) {
            return new Response(
              JSON.stringify({ ok: false, error: `Unsupported method: ${method}` }),
              {
                status: 400,
                headers: responseHeaders('application/json; charset=utf-8'),
              }
            );
          }
          let headers: Record<string, string> = {};
          const headersRaw = url.searchParams.get('headers');
          if (headersRaw) {
            try {
              headers = JSON.parse(headersRaw) as Record<string, string>;
            } catch (err) {
              return new Response(JSON.stringify({ ok: false, error: 'Invalid headers JSON' }), {
                status: 400,
                headers: responseHeaders('application/json; charset=utf-8'),
              });
            }
          }
          let body: string | undefined;
          const bodyJsonRaw = url.searchParams.get('body_json');
          if (bodyJsonRaw != null) {
            try {
              body = JSON.stringify(JSON.parse(bodyJsonRaw));
              if (!Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
                headers['content-type'] = 'application/json';
              }
            } catch (err) {
              return new Response(JSON.stringify({ ok: false, error: 'Invalid body_json value' }), {
                status: 400,
                headers: responseHeaders('application/json; charset=utf-8'),
              });
            }
          } else {
            const bodyRaw = url.searchParams.get('body');
            if (bodyRaw != null) body = bodyRaw;
          }
          const verbose =
            url.searchParams.get('verbose') === '1' || url.searchParams.get('verbose') === 'true';
          const { response, durationMs } = await fetchWithDefaults(
            target,
            { method, headers, body },
            { verbose }
          );
          return new Response(
            JSON.stringify({
              ok: response.ok,
              target,
              method,
              status: response.status,
              durationMs,
            }),
            { headers: responseHeaders('application/json; charset=utf-8') }
          );
        }

        if (url.pathname === '/ops/runtime') {
          const address = server.requestIP(req);
          return new Response(
            JSON.stringify({
              name: SERVER_NAME,
              host: runtimeHost,
              port: server.port,
              protocol: server.protocol,
              pendingRequests: server.pendingRequests,
              pendingWebSockets: server.pendingWebSockets,
              subscribers: {
                eod: server.subscriberCount('eod'),
              },
              requestIP: address ? { address: address.address, port: address.port } : null,
            }),
            { headers: responseHeaders('application/json; charset=utf-8') }
          );
        }

        if (url.pathname === '/ops/lifecycle') {
          const key = url.searchParams.get('key');
          if (!key || !LIFECYCLE_KEY || key !== LIFECYCLE_KEY) {
            return new Response(
              JSON.stringify({ ok: false, error: 'Unauthorized lifecycle key' }),
              {
                status: 401,
                headers: responseHeaders('application/json; charset=utf-8'),
              }
            );
          }
          const action = url.searchParams.get('action') || 'status';
          if (action === 'unref') {
            server.unref();
            return new Response(
              JSON.stringify({ ok: true, action, message: 'Server unref applied' }),
              {
                headers: responseHeaders('application/json; charset=utf-8'),
              }
            );
          }
          if (action === 'ref') {
            server.ref();
            return new Response(
              JSON.stringify({ ok: true, action, message: 'Server ref applied' }),
              {
                headers: responseHeaders('application/json; charset=utf-8'),
              }
            );
          }
          if (action === 'stop' || action === 'stop_force') {
            const force = action === 'stop_force';
            setTimeout(() => {
              void server.stop(force);
            }, 10);
            return new Response(
              JSON.stringify({ ok: true, action, force, message: 'Server stop scheduled' }),
              {
                headers: responseHeaders('application/json; charset=utf-8'),
              }
            );
          }
          return new Response(
            JSON.stringify({
              ok: true,
              action: 'status',
              pendingRequests: server.pendingRequests,
              pendingWebSockets: server.pendingWebSockets,
            }),
            { headers: responseHeaders('application/json; charset=utf-8') }
          );
        }

        return new Response('🦘 Native Barber: Redis+SQLite+WS+TLS+Secrets+Cookies', {
          headers: {
            ...responseHeaders('text/plain; charset=utf-8'),
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (err) {
        telemetry.errors += 1;
        status = 500;
        if (path) {
          const entry = telemetry.perEndpoint[path] ?? { count: 0, errors: 0, lastLatencyMs: 0 };
          entry.errors += 1;
          telemetry.perEndpoint[path] = entry;
        }
        logInfo('error', { rid, message: String(err) });
        const message =
          NODE_ENV === 'development' ? `Internal error: ${String(err)}` : 'Internal error';
        return new Response(message, { status });
      } finally {
        const elapsed = performance.now() - start;
        telemetry.latencyMs = Math.round(elapsed * 1000) / 1000;
        if (path) {
          const entry = telemetry.perEndpoint[path] ?? { count: 0, errors: 0, lastLatencyMs: 0 };
          entry.count += 1;
          entry.lastLatencyMs = telemetry.latencyMs;
          telemetry.perEndpoint[path] = entry;
          const list = endpointLatencies[path] ?? [];
          list.push(telemetry.latencyMs);
          if (list.length > LATENCY_WINDOW) list.shift();
          endpointLatencies[path] = list;
        }
        logInfo('request', {
          rid,
          method: req.method,
          path,
          status,
          latencyMs: telemetry.latencyMs,
        });
      }
    },
  });

  subscribeRedis('eod').catch(err => {
    logInfo('redis_subscribe_error', { message: String(err) });
  });

  logInfo('startup', {
    name: SERVER_NAME,
    host: runtimeHost,
    port: server.port,
    protocol: server.protocol,
    baseUrl,
    tls: Boolean(TLS_KEY_PATH && TLS_CERT_PATH),
    insecureWs: ALLOW_INSECURE_WS,
  });

  if (AUTO_UNREF) {
    server.unref();
  }

  warmupDns(DNS_WARMUP_HOSTS).catch(() => {});

  if (!shutdownHooksInstalled) {
    shutdownHooksInstalled = true;
    const shutdown = (signal: string) => {
      try {
        server.stop(true);
      } catch (err) {}
      logInfo('shutdown', { signal, name: SERVER_NAME });
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  return server;
}

if (import.meta.main) {
  startServer();
}

export { parseClearRequest, buildReport, startServer };

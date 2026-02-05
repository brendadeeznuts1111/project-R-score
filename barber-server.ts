#!/usr/bin/env bun

import { serve, redis, secrets, env } from 'bun';
import crypto from 'node:crypto';
import { Database } from 'bun:sqlite';

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

const PORT = Number(env.PORT ?? 3000);
const MANAGER_KEY = env.MANAGER_KEY ?? '';
const PAYPAL_SECRET_ENV = env.PAYPAL_SECRET ?? '';
const TLS_KEY_PATH = env.TLS_KEY_PATH ?? '';
const TLS_CERT_PATH = env.TLS_CERT_PATH ?? '';
const TLS_CA_PATH = env.TLS_CA_PATH ?? '';
const ALLOW_INSECURE_WS = env.ALLOW_INSECURE_WS === 'true';
const NODE_ENV = env.NODE_ENV ?? 'development';
const CACHE_TTL_MS = Number(env.BARBER_CACHE_TTL_MS ?? 2000);

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
  await redis.subscribe(channel, (message) => {
    for (const ws of wsClients) {
      try {
        ws.send(message);
      } catch {
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

function serializeCookie(name: string, value: string, opts: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
}) {
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
    const secret = await secrets.get({ service: 'barber', name: 'PAYPAL_SECRET' });
    return secret?.value ?? '';
  } catch {
    if (NODE_ENV === 'production') {
      throw new Error('PAYPAL_SECRET unavailable in production');
    }
    return '';
  }
}

const barberCache = {
  data: null as Record<string, string> | null,
  fetchedAt: 0
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
  perEndpoint: {} as Record<string, { count: number; errors: number; lastLatencyMs: number; p95Ms: number; p99Ms: number }>
};

const endpointLatencies: Record<string, number[]> = {};
const LATENCY_WINDOW = Number(env.BARBER_LATENCY_WINDOW ?? 200);

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
      p99Ms: percentile(values, 99)
    };
  }
  return snapshot;
}

async function redisHealthy() {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 200));
    const pong = await Promise.race([redis.ping(), timeout]);
    return pong === 'PONG';
  } catch {
    return false;
  }
}

function telemetryHtml(snapshot: ReturnType<typeof buildTelemetrySnapshot>) {
  const rows = Object.entries(snapshot.perEndpoint).map(([path, entry]) => {
    return `<tr><td>${path}</td><td>${entry.count}</td><td>${entry.errors}</td><td>${entry.lastLatencyMs}</td><td>${entry.p95Ms}</td><td>${entry.p99Ms}</td></tr>`;
  }).join('');
  return `<!doctype html>
  <html><head><meta charset="utf-8"><title>Telemetry</title>
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

async function startServer() {
  const server = serve({
    port: PORT,
    development: TLS_KEY_PATH && TLS_CERT_PATH
      ? { tls: { key: Bun.file(TLS_KEY_PATH), cert: Bun.file(TLS_CERT_PATH) } }
      : undefined,
    websocket: {
      open(ws) {
        wsClients.add(ws);
      },
      close(ws) {
        wsClients.delete(ws);
      }
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
              : { rejectUnauthorized: !ALLOW_INSECURE_WS }
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
            JSON.stringify({ success: true, barber: { ...r, cookie: parsed }, tokens, session: 'jb' }),
            {
              headers: {
                'Set-Cookie': serializeCookie('auth', 'jb', {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'strict'
                })
              }
            }
          );
        }

        if (parseClearRequest(url, MANAGER_KEY)) {
          const r = await getBarberRecord();
          const report = buildReport(r);
          db.prepare('INSERT OR REPLACE INTO reports VALUES(?,?)')
            .run(Date.now().toString(), JSON.stringify(report));
          await redis.publish('eod', JSON.stringify(report));
          return new Response(JSON.stringify(report), {
            headers: {
              'Set-Cookie': serializeCookie('session', 'jb', {
                httpOnly: true,
                path: '/',
                maxAge: 3600,
                sameSite: 'strict',
                secure: true
              }),
              'Proxy-Connection': 'keep-alive'
            }
          });
        }

        if (url.pathname === '/telemetry') {
          const snapshot = buildTelemetrySnapshot();
          if (url.searchParams.get('format') === 'html') {
            return new Response(telemetryHtml(snapshot), {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
          return new Response(JSON.stringify(snapshot), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (url.pathname === '/health') {
          const ok = await redisHealthy();
          const payload = { status: ok ? 'ok' : 'degraded', redis: ok };
          return new Response(JSON.stringify(payload), {
            status: ok ? 200 : 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('🦘 Native Barber: Redis+SQLite+WS+TLS+Secrets+Cookies', {
          headers: { 'Access-Control-Allow-Origin': '*' }
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
        const message = NODE_ENV === 'development' ? `Internal error: ${String(err)}` : 'Internal error';
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
          latencyMs: telemetry.latencyMs
        });
      }
    }
  });

  subscribeRedis('eod').catch((err) => {
    logInfo('redis_subscribe_error', { message: String(err) });
  });

  logInfo('startup', {
    port: server.port,
    tls: Boolean(TLS_KEY_PATH && TLS_CERT_PATH),
    insecureWs: ALLOW_INSECURE_WS
  });
}

if (import.meta.main) {
  startServer();
}

export { parseClearRequest, buildReport, startServer };

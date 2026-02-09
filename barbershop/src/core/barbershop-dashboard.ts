// barbershop-dashboard.ts - Complete 3-View Dashboard System
// Admin (God View) | Client (Customer) | Barber (Worker)

import {
  serve,
  redis,
  RedisClient,
  Cookie,
  env,
  randomUUIDv7,
  r2_upload,
  r2_status,
  S3Client,
} from 'bun';
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
// Load manifest dynamically using Bun.file with file:// protocol
const manifestPath = new URL(
  'file://' + Bun.fileURLToPath(new URL('../../manifest.toml', import.meta.url))
);
const manifestContent = await Bun.file(manifestPath)
  .text()
  .catch(() => 'name = "barbershop-demo"\nversion = "1.0.0"');
// Parse simple TOML (name = "value" format)
const manifestData = Object.fromEntries(
  manifestContent
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('[') && !line.startsWith('#'))
    .map(line => {
      const [key, ...rest] = line.split('=');
      const value = rest
        .join('=')
        .trim()
        .replace(/^["']|["']$/g, '');
      return [key.trim(), value];
    })
);
import { fetchWithDefaults, isPublicHttpUrl } from '../utils/fetch-utils';
import { renderAdminDashboard, renderBarberDashboard, renderClientDashboard } from './ui';
// Note: v3 dashboards are available via ui.ts re-exports
import { renderPaymentRoutingPanel } from './payment-routing-ui';
import { getFactorySecret } from '../secrets/factory-secrets';
import {
  PaymentRouting,
  createPaymentSplit,
  getPaymentSplit,
  updatePaymentSplitStatus,
  getPendingSplits,
  createPaymentRoute,
  getPaymentRoute,
  getActiveRoutes,
  updatePaymentRoute,
  deletePaymentRoute,
  createFallbackPlan,
  getFallbackPlan,
  createRoutingConfig,
  getRoutingConfig,
  getActiveRoutingConfig,
  setActiveRoutingConfig,
  getRoutingStats,
  type PaymentSplitRecipient,
} from './payment-routing';
import { SecureCookieManager, CookieMonitor } from '../utils/cookie-security';

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

const SERVER_PORT = resolvePort();
const SERVER_HOST = env.HOST ?? '0.0.0.0';
const SERVER_NAME = env.SERVER_NAME ?? 'Barbershop Dashboard';
const PUBLIC_BASE_URL = env.PUBLIC_BASE_URL ?? `http://localhost:${SERVER_PORT}`;
const KEEP_ALIVE_TIMEOUT_SEC = Number(env.KEEP_ALIVE_TIMEOUT_SEC ?? 5);
const KEEP_ALIVE_MAX = Number(env.KEEP_ALIVE_MAX ?? 1000);
const LIFECYCLE_KEY = env.LIFECYCLE_KEY ?? '';
const UPLOAD_TIMEOUT_SEC = Number(env.UPLOAD_TIMEOUT_SEC ?? 60);
const AUTO_UNREF = env.AUTO_UNREF === 'true';
const UPLOAD_DIR = new URL('./uploads', import.meta.url).pathname;
const DNS_PREFETCH_HOSTS = (env.DNS_PREFETCH_HOSTS ?? 'example.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const DNS_WARMUP_HOSTS = (env.DNS_WARMUP_HOSTS ?? env.DNS_PREFETCH_HOSTS ?? 'example.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const DNS_WARMUP_TIMEOUT_MS = Number(env.DNS_WARMUP_TIMEOUT_MS ?? 500);
const USE_UI_V3 = env.USE_UI_V3 !== 'false'; // Default to v3
mkdirSync(UPLOAD_DIR, { recursive: true });

type R2MirrorConfig = {
  enabled: boolean;
  bucket: string;
  prefix: string;
  apiAvailable: boolean;
  mode: 'none' | 'bun-r2' | 's3client';
};

type R2MirrorState = {
  connected: boolean;
  initialized: boolean;
  lastUploadAt: string | null;
  lastUploadKey: string | null;
  lastError: string | null;
};

const r2MirrorConfig: R2MirrorConfig = {
  enabled: false,
  bucket: '',
  prefix: 'barbershop',
  apiAvailable: typeof r2_upload === 'function' && typeof r2_status === 'function',
  mode: 'none',
};

const r2MirrorState: R2MirrorState = {
  connected: false,
  initialized: false,
  lastUploadAt: null,
  lastUploadKey: null,
  lastError: null,
};
let lastR2StatusSnapshotAt = 0;
let r2S3Credentials: {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
} | null = null;

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

function resourceHintsHtml() {
  return DNS_PREFETCH_HOSTS.map(
    host =>
      `<link rel="dns-prefetch" href="//${host}"><link rel="preconnect" href="https://${host}" crossorigin>`
  ).join('\n    ');
}

const RESOURCE_HINTS = resourceHintsHtml();

// Dashboard versions - using ui.ts exports
const ADMIN_DASHBOARD_V2 = renderAdminDashboard(RESOURCE_HINTS);
const CLIENT_DASHBOARD_V2 = renderClientDashboard(RESOURCE_HINTS);
const BARBER_DASHBOARD_V2 = renderBarberDashboard(RESOURCE_HINTS);

// For now, use v2 dashboards (v3 would require additional ui-components module)
const getAdminDashboard = () => ADMIN_DASHBOARD_V2;
const getClientDashboard = () => CLIENT_DASHBOARD_V2;
const getBarberDashboard = () => BARBER_DASHBOARD_V2;

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
      logTelemetry(
        'dns_warmup_ok',
        { host, durationMs: Math.round((performance.now() - started) * 1000) / 1000 },
        '127.0.0.1'
      );
    } catch (error) {
      logTelemetry('dns_warmup_error', { host, error: String(error) }, '127.0.0.1');
    }
  }
}

// ==================== DATABASE SETUP ====================
const db = new Database(':memory:');

// Core tables
db.run(`
  CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT UNIQUE,
    skills TEXT,
    commissionRate REAL,
    status TEXT,
    ip TEXT,
    userAgent TEXT,
    lastSeen TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    services TEXT,
    totalAmount REAL,
    walkIn INTEGER,
    paymentId TEXT,
    status TEXT,
    assignedTo TEXT,
    createdAt TEXT,
    assignedAt TEXT,
    completedAt TEXT,
    clientIp TEXT,
    headers TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    type TEXT,
    entityId TEXT,
    ip TEXT,
    userAgent TEXT,
    headers TEXT,
    connectedAt TEXT,
    lastActivity TEXT,
    wsConnected INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventType TEXT,
    data TEXT,
    ip TEXT,
    timestamp TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS financials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    totalRevenue REAL,
    totalTips REAL,
    totalCommission REAL,
    ticketCount INTEGER,
    createdAt TEXT
  )
`);

// ==================== SEED DATA ====================
// Intentionally do not write Bun.secrets at startup to avoid repeated OS keychain prompts.
// Use the one-time setup script in barbershop/setup-secrets.ts when you actually want to persist secrets.

await redis.hmset('barber:jb', [
  'id',
  'barber_jb',
  'name',
  'John Barber',
  'code',
  'JB',
  'skills',
  JSON.stringify(['Haircut', 'Beard Trim', 'Hot Towel Shave']),
  'commissionRate',
  '0.6',
  'status',
  'active',
]);
await redis.hmset('barber:ms', [
  'id',
  'barber_ms',
  'name',
  'Mike Styles',
  'code',
  'MS',
  'skills',
  JSON.stringify(['Haircut', 'Fade', 'Design']),
  'commissionRate',
  '0.55',
  'status',
  'active',
]);
await redis.hmset('barber:ck', [
  'id',
  'barber_ck',
  'name',
  'Chris Kutz',
  'code',
  'CK',
  'skills',
  JSON.stringify(['Beard Trim', 'Hot Towel Shave']),
  'commissionRate',
  '0.5',
  'status',
  'off_duty',
]);
await redis.hmset('barber:om', [
  'id',
  'barber_om',
  'name',
  'Omar Razor',
  'code',
  'OM',
  'skills',
  JSON.stringify(['Hot Towel Shave', 'Beard Trim']),
  'commissionRate',
  '0.58',
  'status',
  'active',
]);
await redis.hmset('barber:ja', [
  'id',
  'barber_ja',
  'name',
  'Jamal Braids',
  'code',
  'JA',
  'skills',
  JSON.stringify(['Braids', 'Design', 'Fade']),
  'commissionRate',
  '0.57',
  'status',
  'active',
]);

// ==================== PUB/SUB SETUP ====================
const pubsub = new RedisClient();
await pubsub.connect();
await initR2Mirror();

// ==================== TELEMETRY LOGGER ====================
interface TelemetryData {
  [key: string]: string | number | boolean | null | undefined;
}

function logTelemetry(eventType: string, data: TelemetryData, ip: string) {
  const entry = {
    eventType,
    data,
    ip,
    timestamp: new Date().toISOString(),
  };
  db.prepare('INSERT INTO telemetry (eventType, data, ip, timestamp) VALUES (?, ?, ?, ?)').run(
    entry.eventType,
    JSON.stringify(entry.data),
    entry.ip,
    entry.timestamp
  );
  redis.publish(
    'telemetry',
    JSON.stringify({ eventType: entry.eventType, data: entry.data, ip: entry.ip, time: Date.now() })
  );
  void mirrorToR2('telemetry', entry);
}

async function initR2Mirror() {
  try {
    // Optional secret -> env bridge for Bun's R2 runtime config.
    const access = (await getFactorySecret('R2_ACCESS_KEY_ID')) || '';
    const secret = (await getFactorySecret('R2_SECRET_ACCESS_KEY')) || '';
    const endp = (await getFactorySecret('R2_ENDPOINT')) || '';
    const account = (await getFactorySecret('CLOUDFLARE_ACCOUNT_ID')) || '';
    if (access && !Bun.env.R2_ACCESS_KEY_ID) Bun.env.R2_ACCESS_KEY_ID = access;
    if (secret && !Bun.env.R2_SECRET_ACCESS_KEY) Bun.env.R2_SECRET_ACCESS_KEY = secret;
    if (endp && !Bun.env.R2_ENDPOINT) Bun.env.R2_ENDPOINT = endp;
    if (account && !Bun.env.CLOUDFLARE_ACCOUNT_ID) Bun.env.CLOUDFLARE_ACCOUNT_ID = account;

    const bucket = (await getFactorySecret('R2_BUCKET')) || '';
    const prefix = (await getFactorySecret('R2_PREFIX')) || 'barbershop';
    if (!bucket) {
      r2MirrorState.initialized = true;
      r2MirrorState.lastError = 'R2 bucket is not configured (set Bun.secrets r2/BUCKET)';
      return;
    }
    r2MirrorConfig.enabled = true;
    r2MirrorConfig.bucket = bucket;
    r2MirrorConfig.prefix = prefix;
    if (r2MirrorConfig.apiAvailable) {
      r2MirrorConfig.mode = 'bun-r2';
      const status = await r2_status();
      r2MirrorState.connected = Boolean(status.connected);
      r2MirrorState.initialized = true;
      r2MirrorState.lastError = r2MirrorState.connected ? null : 'R2 connection is not ready';
      return;
    }
    if (access && secret && endp) {
      r2MirrorConfig.mode = 's3client';
      r2S3Credentials = {
        accessKeyId: access,
        secretAccessKey: secret,
        bucket,
        endpoint: endp,
      };
      r2MirrorState.connected = true;
      r2MirrorState.initialized = true;
      r2MirrorState.lastError = null;
      return;
    }
    r2MirrorConfig.mode = 'none';
    r2MirrorState.initialized = true;
    r2MirrorState.lastError =
      'R2 API unavailable and S3 credentials missing (ACCESS_KEY_ID/SECRET_ACCESS_KEY/ENDPOINT)';
  } catch (error) {
    r2MirrorState.initialized = true;
    r2MirrorState.lastError = String(error);
  }
}

async function mirrorToR2(kind: string, payload: unknown) {
  if (!r2MirrorConfig.enabled) return;
  const key = `${r2MirrorConfig.prefix}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  try {
    if (r2MirrorConfig.mode === 'bun-r2') {
      await r2_upload({
        bucket: r2MirrorConfig.bucket,
        key,
        body: Buffer.from(JSON.stringify(payload)),
        contentType: 'application/json',
      });
    } else if (r2MirrorConfig.mode === 's3client' && r2S3Credentials) {
      await S3Client.write(key, JSON.stringify(payload), {
        ...r2S3Credentials,
        type: 'application/json',
      });
    } else {
      return;
    }
    r2MirrorState.lastUploadAt = new Date().toISOString();
    r2MirrorState.lastUploadKey = key;
    r2MirrorState.lastError = null;
  } catch (error) {
    r2MirrorState.lastError = String(error);
  }
}

const manifestFile = Bun.file(new URL('./manifest.toml', import.meta.url).pathname);
const docsReadmeFile = Bun.file(new URL('./README.md', import.meta.url).pathname);
const docsClientFile = Bun.file(new URL('./CLIENT.md', import.meta.url).pathname);
const docsAdminFile = Bun.file(new URL('./ADMIN.md', import.meta.url).pathname);

function docsHtml(baseUrl: string) {
  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Barbershop Docs</title>
    ${RESOURCE_HINTS}
    <style>
      body { font-family: ui-sans-serif, system-ui; margin: 24px; color: #0d1b2a; background: #f6f8fb; }
      h1 { margin-bottom: 8px; }
      .card { background: #fff; border: 1px solid #d7deea; border-radius: 8px; padding: 14px; margin: 12px 0; }
      code { background: #eef2f8; padding: 2px 6px; border-radius: 4px; }
      a { color: #0954d8; text-decoration: none; }
      a:hover { text-decoration: underline; }
      ul { margin: 8px 0; }
    </style>
  </head>
  <body>
    <h1>Barbershop Demo Documentation</h1>
    <p>Quick reference for the dashboard/server demo and current manifest.</p>
    <p><code>${SERVER_NAME}</code> at <code>${baseUrl}</code></p>

    <div class="card">
      <h3>Dashboards</h3>
      <ul>
        <li><a href="/admin"><code>/admin</code></a> - Admin view</li>
        <li><a href="/client"><code>/client</code></a> - Client booking view</li>
        <li><a href="/barber"><code>/barber</code></a> - Barber station</li>
      </ul>
    </div>

    <div class="card">
      <h3>Documentation Files</h3>
      <ul>
        <li><a href="/docs/readme"><code>/docs/readme</code></a> - Barbershop README (Markdown)</li>
        <li><a href="/docs/manifest"><code>/docs/manifest</code></a> - Barbershop manifest (TOML)</li>
        <li><a href="/docs/manifest.json"><code>/docs/manifest.json</code></a> - Parsed manifest (JSON via Bun TOML loader)</li>
        <li><a href="/docs/client"><code>/docs/client</code></a> - Client-facing flow guide</li>
        <li><a href="/docs/admin"><code>/docs/admin</code></a> - Admin flow guide</li>
      </ul>
    </div>

    <div class="card">
      <h3>API Quick Links</h3>
      <ul>
        <li><a href="/admin/data"><code>/admin/data</code></a></li>
        <li><a href="/admin/orders"><code>/admin/orders</code></a></li>
        <li><a href="/tickets/pending"><code>/tickets/pending</code></a></li>
        <li><a href="/barbers"><code>/barbers</code></a></li>
        <li><code>POST /checkout/bundle</code></li>
        <li><a href="/ops/fetch-check?url=https://example.com"><code>/ops/fetch-check</code></a></li>
        <li><a href="/ops/runtime"><code>/ops/runtime</code></a></li>
        <li><a href="/ops/r2-status"><code>/ops/r2-status</code></a></li>
      </ul>
    </div>
  </body>
  </html>`;
}

type BundleLineItem = {
  name: string;
  price: number;
  quantity?: number;
  kind?: 'service' | 'product';
  providerId?: string;
  providerName?: string;
  providerRole?: 'barber' | 'cashier' | 'store';
  tipEligible?: boolean;
};

type TipInput = {
  mode?: 'percent' | 'flat';
  value?: number;
};

interface Service {
  name: string;
  price?: number;
  duration?: number;
  [key: string]: unknown;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeTip(subtotal: number, tipInput?: TipInput) {
  const mode = tipInput?.mode ?? 'percent';
  const rawValue = Number(tipInput?.value ?? 0);
  const safeValue = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
  if (mode === 'flat') return roundMoney(safeValue);
  return roundMoney(subtotal * (safeValue / 100));
}

function normalizeBundleItem(item: BundleLineItem): BundleLineItem {
  const quantity =
    Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1;
  const price = Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0;
  const kind = item.kind ?? 'service';
  const providerRole = item.providerRole ?? (kind === 'service' ? 'barber' : 'cashier');
  return {
    ...item,
    quantity,
    price,
    kind,
    providerRole,
    tipEligible: item.tipEligible ?? (kind === 'service' && providerRole === 'barber'),
  };
}

function computeBundle(itemsInput: BundleLineItem[], tipInput?: TipInput) {
  const items = itemsInput.map(normalizeBundleItem);
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0)
  );
  const tipTotal = normalizeTip(subtotal, tipInput);
  const total = roundMoney(subtotal + tipTotal);

  const tipEligible = items.filter(
    item => item.tipEligible && item.providerRole === 'barber' && item.providerId
  );
  const tipBasis = tipEligible.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const tipByProvider: Record<string, number> = {};

  if (tipTotal > 0 && tipBasis > 0) {
    for (const item of tipEligible) {
      const providerId = item.providerId as string;
      const share = ((item.price * (item.quantity ?? 1)) / tipBasis) * tipTotal;
      tipByProvider[providerId] = roundMoney((tipByProvider[providerId] ?? 0) + share);
    }
  }

  return { items, subtotal, tipTotal, total, tipByProvider };
}

// ==================== HTML DASHBOARD TEMPLATES ====================

const ADMIN_DASHBOARD = `
<!DOCTYPE html>
<html>
<head>
  <title>👁️ ADMIN GOD VIEW | Barbershop Telemetry</title>
  ${RESOURCE_HINTS}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #0a0a0a; 
      color: #00ff00; 
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .header { 
      background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
      padding: 15px; 
      border-bottom: 2px solid #00ff00;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header h1 { color: #00ff00; text-shadow: 0 0 10px #00ff00; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; padding: 10px; }
    .panel { 
      background: #1a1a1a; 
      border: 1px solid #333; 
      border-radius: 4px;
      padding: 10px;
      max-height: 400px;
      overflow-y: auto;
    }
    .panel h3 { 
      color: #00ffff; 
      border-bottom: 1px solid #333; 
      padding-bottom: 5px; 
      margin-bottom: 10px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .metric { 
      display: flex; 
      justify-content: space-between; 
      padding: 4px 0;
      border-bottom: 1px solid #222;
    }
    .metric label { color: #888; }
    .metric value { color: #fff; font-weight: bold; }
    .money { color: #00ff00; }
    .alert { color: #ff6600; }
    .danger { color: #ff0000; }
    .success { color: #00ff00; }
    .ip { color: #ff00ff; }
    .connection {
      background: #0f0f0f;
      border-left: 3px solid #00ff00;
      padding: 8px;
      margin: 5px 0;
      font-size: 10px;
    }
    .connection.ws { border-left-color: #00ffff; }
    .connection.http { border-left-color: #ffff00; }
    pre { 
      background: #0f0f0f; 
      padding: 8px; 
      overflow-x: auto;
      font-size: 10px;
      color: #aaa;
    }
    .live-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #00ff00;
      border-radius: 50%;
      animation: pulse 1s infinite;
      margin-right: 8px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .barber-card {
      background: #151515;
      border: 1px solid #333;
      padding: 8px;
      margin: 5px 0;
      border-radius: 3px;
    }
    .barber-card.active { border-color: #00ff00; }
    .barber-card.busy { border-color: #ff6600; }
    .barber-card.offline { border-color: #333; opacity: 0.6; }
    #wsLog { height: 200px; overflow-y: auto; }
    .log-entry { padding: 2px 0; font-size: 10px; }
    .log-entry.incoming { color: #00ffff; }
    .log-entry.outgoing { color: #ffff00; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <span class="live-indicator"></span>
      <h1>👁️ ADMIN GOD VIEW</h1>
    </div>
    <div>
      <span id="clock"></span> | 
      <span class="money">💰 $<span id="totalRevenue">0</span></span> |
      <span class="success">🟢 <span id="activeConnections">0</span> CONN</span>
    </div>
  </div>
  
  <div class="grid">
    <!-- FINANCIALS -->
    <div class="panel">
      <h3>💰 FINANCIALS (REAL-TIME)</h3>
      <div class="metric"><label>Today's Revenue:</label><value class="money" id="revToday">$0.00</value></div>
      <div class="metric"><label>Total Tips:</label><value class="money" id="tipsTotal">$0.00</value></div>
      <div class="metric"><label>Commissions Paid:</label><value class="alert" id="commissions">$0.00</value></div>
      <div class="metric"><label>Net Profit:</label><value class="success" id="netProfit">$0.00</value></div>
      <div class="metric"><label>Tickets Completed:</label><value id="ticketsDone">0</value></div>
      <div class="metric"><label>Tickets Pending:</label><value class="alert" id="ticketsPending">0</value></div>
    </div>
    
    <!-- ACTIVE CONNECTIONS -->
    <div class="panel">
      <h3>🔌 ACTIVE CONNECTIONS</h3>
      <div id="connectionsList"></div>
    </div>
    
    <!-- BARBER STATUS -->
    <div class="panel">
      <h3>✂️ BARBER PROFILES</h3>
      <div id="barberList"></div>
    </div>
    
    <!-- TELEMETRY/HEADERS -->
    <div class="panel">
      <h3>📡 TELEMETRY & HEADERS</h3>
      <div id="telemetryLog"></div>
    </div>
    
    <!-- WEBSOCKET LOG -->
    <div class="panel" style="grid-column: 1 / 3;">
      <h3>🌐 WEBSOCKET STREAM</h3>
      <div id="wsLog"></div>
    </div>
    
    <!-- RAW DATA -->
    <div class="panel" style="grid-column: 3 / 5;">
      <h3>📊 RAW DATABASE DUMP</h3>
      <pre id="rawData">Loading...</pre>
    </div>
  </div>

  <script>
    const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(wsProto + '://' + location.host + '/admin/ws?key=' + (window.LIFECYCLE_KEY || 'development'));
    
    ws.onopen = () => {
      log('🟢 Connected to admin telemetry stream');
    };
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      updateDashboard(data);
    };
    
    ws.onclose = () => {
      log('🔴 Disconnected from telemetry');
    };
    
    function log(msg) {
      const div = document.getElementById('wsLog');
      div.innerHTML += '<div class="log-entry incoming">' + new Date().toLocaleTimeString() + ' ' + msg + '</div>';
      div.scrollTop = div.scrollHeight;
    }
    
    function updateDashboard(data) {
      if (data.type === 'financials') {
        document.getElementById('revToday').textContent = '$' + data.revenue.toFixed(2);
        document.getElementById('tipsTotal').textContent = '$' + data.tips.toFixed(2);
        document.getElementById('commissions').textContent = '$' + data.commissions.toFixed(2);
        document.getElementById('netProfit').textContent = '$' + (data.revenue - data.commissions).toFixed(2);
        document.getElementById('totalRevenue').textContent = data.revenue.toFixed(0);
      }
      if (data.type === 'connections') {
        document.getElementById('activeConnections').textContent = data.count;
        document.getElementById('connectionsList').innerHTML = data.list.map(c => 
          '<div class="connection ' + c.type + '">' +
          '<strong class="ip">' + c.ip + '</strong> ' +
          '<span>' + c.type + '</span> ' +
          '<span>' + (c.entity || 'anonymous') + '</span> ' +
          '<small>' + c.ua?.substring(0, 30) + '...</small>' +
          '</div>'
        ).join('');
      }
      if (data.type === 'barbers') {
        document.getElementById('barberList').innerHTML = data.list.map(b =>
          '<div class="barber-card ' + b.status + '">' +
          '<strong>' + b.name + '</strong> (' + b.code + ')<br>' +
          'Skills: ' + b.skills.join(', ') + '<br>' +
          'Commission: ' + (b.commissionRate * 100) + '% | ' +
          'Status: <span class="' + b.status + '">' + b.status + '</span><br>' +
          '<small class="ip">Last IP: ' + (b.ip || 'N/A') + '</small>' +
          '</div>'
        ).join('');
        document.getElementById('ticketsDone').textContent = data.completed;
        document.getElementById('ticketsPending').textContent = data.pending;
      }
      if (data.type === 'telemetry') {
        const div = document.getElementById('telemetryLog');
        div.innerHTML = data.events.slice(-5).map(e =>
          '<div class="log-entry">' +
          '<span class="ip">' + e.ip + '</span> ' +
          e.eventType + ': ' + JSON.stringify(e.data).substring(0, 50) +
          '</div>'
        ).join('') + div.innerHTML;
      }
      if (data.type === 'raw') {
        document.getElementById('rawData').textContent = JSON.stringify(data, null, 2);
      }
    }
    
    // Clock
    setInterval(() => {
      document.getElementById('clock').textContent = new Date().toLocaleTimeString();
    }, 1000);
  </script>
</body>
</html>
`;

const CLIENT_DASHBOARD = `
<!DOCTYPE html>
<html>
<head>
  <title>✨ Book Your Cut | Client Portal</title>
  ${RESOURCE_HINTS}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
    }
    .container { max-width: 400px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; color: white; padding: 30px 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin: 15px 0;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .service {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: all 0.2s;
    }
    .service:hover { background: #f8f9fa; }
    .service.selected { background: #e3f2fd; border-left: 4px solid #2196f3; }
    .service-name { font-weight: 600; color: #333; }
    .service-price { color: #667eea; font-weight: bold; font-size: 18px; }
    .service-time { color: #999; font-size: 12px; }
    .btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .total { padding: 20px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 16px;
      font-weight: 600;
    }
    .total-row.grand {
      margin-top: 8px;
      border-top: 1px solid #eee;
      padding-top: 10px;
      font-size: 20px;
      font-weight: 800;
    }
    .inline-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #d8d8d8;
      border-radius: 10px;
      margin-top: 8px;
    }
    .status {
      text-align: center;
      padding: 20px;
      color: #666;
    }
    .barber-select {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 10px 0;
    }
    .barber-option {
      min-width: 80px;
      text-align: center;
      padding: 10px;
      border: 2px solid #ddd;
      border-radius: 12px;
      cursor: pointer;
    }
    .barber-option.selected { border-color: #667eea; background: #e3f2fd; }
    .avatar { width: 50px; height: 50px; border-radius: 50%; background: #ddd; margin: 0 auto 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✂️ Fresh Cuts</h1>
      <p>Book your appointment</p>
    </div>
    
    <div class="card">
      <h3 style="margin-bottom: 15px;">Select Services</h3>
      <div class="service" onclick="toggleService(this, 'haircut', 30, 30)">
        <div>
          <div class="service-name">✂️ Haircut</div>
          <div class="service-time">⏱️ 30 min</div>
        </div>
        <div class="service-price">$30</div>
      </div>
      <div class="service" onclick="toggleService(this, 'beard', 15, 15)">
        <div>
          <div class="service-name">🧔 Beard Trim</div>
          <div class="service-time">⏱️ 15 min</div>
        </div>
        <div class="service-price">$15</div>
      </div>
      <div class="service" onclick="toggleService(this, 'shave', 25, 20)">
        <div>
          <div class="service-name">🔥 Hot Towel Shave</div>
          <div class="service-time">⏱️ 20 min</div>
        </div>
        <div class="service-price">$25</div>
      </div>
      <div class="service" onclick="toggleService(this, 'fade', 35, 45)">
        <div>
          <div class="service-name">⚡ Fade/Design</div>
          <div class="service-time">⏱️ 45 min</div>
        </div>
        <div class="service-price">$35</div>
      </div>
    </div>
    
    <div class="card">
      <h3 style="margin-bottom: 15px;">Choose Barber (Optional)</h3>
      <div class="barber-select" id="barberList">
        <div class="barber-option selected" onclick="selectBarber(this, null)">
          <div class="avatar">🎲</div>
          <small>Any</small>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 15px;">Checkout Options</h3>
      <label>
        Tip Mode
        <select id="tipMode" class="inline-input" onchange="calculateTotal()">
          <option value="percent">Percent (%)</option>
          <option value="flat">Flat ($)</option>
        </select>
      </label>
      <label>
        Tip Value
        <input id="tipValue" class="inline-input" type="number" min="0" step="0.01" value="15" oninput="calculateTotal()" />
      </label>
      <label style="display: flex; gap: 8px; margin-top: 12px; align-items: center;">
        <input id="includeShampoo" type="checkbox" onchange="calculateTotal()" />
        Add Shampoo ($12) - Provider: house-cashier-01
      </label>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 15px;">Reference Upload (Optional)</h3>
      <form id="referenceForm" onsubmit="return uploadReference(event)">
        <label>
          Name
          <input id="uploadName" name="name" class="inline-input" type="text" placeholder="Customer name" />
        </label>
        <label>
          Profile Picture
          <input id="profilePicture" name="profilePicture" class="inline-input" type="file" accept="image/*" />
        </label>
        <button class="btn" style="margin-top:12px;" type="submit">Upload Reference</button>
      </form>
      <p id="uploadStatus" style="margin-top:10px; color:#444;"></p>
    </div>
    
    <div class="card">
      <div class="total">
        <div class="total-row"><span>Subtotal</span><span id="subtotalPrice">$0</span></div>
        <div class="total-row"><span>Tip</span><span id="tipPrice">$0</span></div>
        <div class="total-row grand"><span>Total</span><span id="totalPrice">$0</span></div>
      </div>
      <button class="btn" id="bookBtn" onclick="bookAppointment()" disabled>
        Checkout Bundle
      </button>
    </div>
    
    <div class="card status" id="statusCard" style="display: none;">
      <div id="statusText"></div>
    </div>
  </div>

  <script>
    let selectedServices = [];
    let selectedBarber = null;
    let activeBarbers = [];
    let subtotal = 0;
    let tipAmount = 0;
    let total = 0;
    
    function toggleService(el, name, price, time) {
      el.classList.toggle('selected');
      const idx = selectedServices.findIndex(s => s.name === name);
      if (idx > -1) {
        selectedServices.splice(idx, 1);
      } else {
        selectedServices.push({ name, price, duration: time });
      }
      calculateTotal();
    }
    
    function selectBarber(el, barber) {
      document.querySelectorAll('.barber-option').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      selectedBarber = barber;
    }
    
    function pickServiceProvider(index) {
      if (selectedBarber) {
        const chosen = activeBarbers.find(b => b.id === selectedBarber);
        if (chosen) return chosen;
      }
      if (activeBarbers.length === 0) {
        return { id: 'barber_unassigned', name: 'Unassigned Barber' };
      }
      return activeBarbers[index % activeBarbers.length];
    }

    function calculateTotal() {
      subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
      if (document.getElementById('includeShampoo').checked) {
        subtotal += 12;
      }
      const tipMode = document.getElementById('tipMode').value;
      const tipValue = Number(document.getElementById('tipValue').value || 0);
      if (tipMode === 'flat') {
        tipAmount = Math.max(0, tipValue);
      } else {
        tipAmount = subtotal * (Math.max(0, tipValue) / 100);
      }
      tipAmount = Math.round(tipAmount * 100) / 100;
      total = Math.round((subtotal + tipAmount) * 100) / 100;
      document.getElementById('subtotalPrice').textContent = '$' + subtotal.toFixed(2);
      document.getElementById('tipPrice').textContent = '$' + tipAmount.toFixed(2);
      document.getElementById('totalPrice').textContent = '$' + total;
      document.getElementById('bookBtn').disabled = selectedServices.length === 0;
    }
    
    async function bookAppointment() {
      const btn = document.getElementById('bookBtn');
      btn.disabled = true;
      btn.textContent = 'Processing...';
      
      const tipMode = document.getElementById('tipMode').value;
      const tipValue = Number(document.getElementById('tipValue').value || 0);
      const includeShampoo = document.getElementById('includeShampoo').checked;
      const serviceItems = selectedServices.map((s, idx) => {
        const provider = pickServiceProvider(idx);
        return {
          name: s.name,
          price: s.price,
          quantity: 1,
          kind: 'service',
          providerId: provider.id,
          providerName: provider.name,
          providerRole: 'barber',
          tipEligible: true
        };
      });
      const productItems = includeShampoo
        ? [{
            name: 'Shampoo',
            price: 12,
            quantity: 1,
            kind: 'product',
            providerId: 'house-cashier-01',
            providerName: 'House Cashier',
            providerRole: 'cashier',
            tipEligible: false
          }]
        : [];

      const res = await fetch('/checkout/bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Walk-in Customer',
          items: [...serviceItems, ...productItems],
          tip: { mode: tipMode, value: tipValue },
          totalAmount: total,
          walkIn: true,
          paymentId: 'pay_' + Date.now()
        })
      });
      
      const data = await res.json();
      document.getElementById('statusCard').style.display = 'block';
      
      if (data.success) {
        document.getElementById('statusText').innerHTML = 
          '<h2>✅ Checkout Complete!</h2>' +
          '<p>Order #' + data.order.id.slice(-6) + '</p>' +
          '<p>Subtotal: $' + data.order.subtotal.toFixed(2) + '</p>' +
          '<p>Tip: $' + data.order.tip.toFixed(2) + ' (' + data.order.tipMode + ')</p>' +
          '<p>Total: $' + data.order.total.toFixed(2) + '</p>' +
          '<p>Tip Share: ' + JSON.stringify(data.order.tipByBarber) + '</p>';
        selectedServices = [];
        document.querySelectorAll('.service.selected').forEach(s => s.classList.remove('selected'));
        document.getElementById('includeShampoo').checked = false;
        calculateTotal();
      } else {
        document.getElementById('statusText').innerHTML = '<p class="danger">Error: ' + data.error + '</p>';
      }
      
      btn.disabled = false;
      btn.textContent = 'Checkout Bundle';
    }

    async function uploadReference(event) {
      event.preventDefault();
      const form = document.getElementById('referenceForm');
      const status = document.getElementById('uploadStatus');
      const formData = new FormData(form);
      const res = await fetch('/action', { method: 'POST', body: formData });
      if (!res.ok) {
        status.textContent = 'Upload failed';
        return false;
      }
      const data = await res.json();
      status.textContent = 'Uploaded: ' + data.file;
      form.reset();
      return false;
    }
    
    // Load barbers
    fetch('/barbers').then(r => r.json()).then(data => {
      const list = document.getElementById('barberList');
      activeBarbers = data.barbers.filter(b => b.status === 'active');
      data.barbers.forEach(b => {
        if (b.status === 'active') {
          list.innerHTML += '<div class="barber-option" onclick="selectBarber(this, \'' + b.id + '\')">' +
            '<div class="avatar">✂️</div><small>' + b.name.split(' ')[0] + '</small></div>';
        }
      });
      calculateTotal();
    });
  </script>
</body>
</html>
`;

const BARBER_DASHBOARD = `
<!DOCTYPE html>
<html>
<head>
  <title>✂️ Barber Station | Worker Portal</title>
  ${RESOURCE_HINTS}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #1a1a2e;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .login-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .login-screen h1 { margin-bottom: 30px; color: #00d4ff; }
    .code-input {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .code-input input {
      width: 60px;
      height: 80px;
      font-size: 32px;
      text-align: center;
      border: 2px solid #333;
      border-radius: 12px;
      background: #0f0f1a;
      color: #fff;
    }
    .code-input input:focus {
      outline: none;
      border-color: #00d4ff;
    }
    .dashboard { display: none; padding: 20px; max-width: 500px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 1px solid #333;
    }
    .profile { text-align: right; }
    .profile h2 { color: #00d4ff; }
    .profile small { color: #888; }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-badge.active { background: #00ff00; color: #000; }
    .status-badge.busy { background: #ff6600; color: #fff; }
    .ticket-card {
      background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
      border-radius: 16px;
      padding: 20px;
      margin: 15px 0;
      border: 1px solid #333;
    }
    .ticket-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .customer-name { font-size: 20px; font-weight: bold; }
    .ticket-id { color: #888; font-size: 12px; }
    .services { margin: 15px 0; }
    .service-tag {
      display: inline-block;
      background: rgba(0,212,255,0.2);
      color: #00d4ff;
      padding: 5px 12px;
      border-radius: 20px;
      margin: 3px;
      font-size: 12px;
    }
    .ticket-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .amount { font-size: 24px; font-weight: bold; color: #00ff00; }
    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
    .btn-primary { background: #00d4ff; color: #000; }
    .btn-success { background: #00ff00; color: #000; }
    .btn-danger { background: #ff3333; color: #fff; }
    .earnings {
      background: #0f0f1a;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .earnings-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #333;
    }
    .earnings-row:last-child { border: none; }
    .big-number { font-size: 32px; font-weight: bold; color: #00ff00; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    .queue-info {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <!-- LOGIN SCREEN -->
  <div class="login-screen" id="loginScreen">
    <h1>✂️ Barber Station</h1>
    <div class="code-input">
      <input type="text" maxlength="2" id="codeInput" onkeyup="checkCode()">
    </div>
    <p style="color: #666;">Enter your barber code</p>
    <p style="color: #333; font-size: 12px; margin-top: 20px;">Hint: Try JB, MS, CK, OM, or JA</p>
  </div>

  <!-- DASHBOARD -->
  <div class="dashboard" id="dashboard">
    <div class="header">
      <span class="status-badge active" id="statusBadge">ACTIVE</span>
      <div class="profile">
        <h2 id="barberName">Loading...</h2>
        <small id="barberCode">--</small>
      </div>
    </div>
    
    <div class="earnings">
      <div class="earnings-row">
        <span>Today's Commission</span>
        <span class="big-number" id="todayEarnings">$0</span>
      </div>
      <div class="earnings-row">
        <span>Tickets Completed</span>
        <span id="ticketsCompleted">0</span>
      </div>
      <div class="earnings-row">
        <span>Commission Rate</span>
        <span id="commissionRate">--%</span>
      </div>
    </div>
    
    <div class="queue-info" id="queueInfo">
      <strong>Queue Status:</strong> <span id="queueStatus">Checking...</span>
    </div>
    
    <h3 style="margin: 20px 0 10px;">Current Ticket</h3>
    <div id="currentTicket">
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 10px;">☕</div>
        <p>No active ticket</p>
        <p style="font-size: 12px;">Waiting for assignment...</p>
      </div>
    </div>
    
    <div style="margin-top: 30px; text-align: center;">
      <button class="btn btn-danger" onclick="logout()">Logout</button>
    </div>
  </div>

  <script>
    let barber = null;
    let ws = null;
    
    async function checkCode() {
      const code = document.getElementById('codeInput').value.toUpperCase();
      if (code.length !== 2) return;
      
      const res = await fetch('/barber/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (data.success) {
        barber = data.barber;
        showDashboard(data);
        connectWebSocket();
      } else {
        alert('Invalid code');
        document.getElementById('codeInput').value = '';
        document.getElementById('codeInput').focus();
      }
    }
    
    function showDashboard(data) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      
      document.getElementById('barberName').textContent = data.barber.name;
      document.getElementById('barberCode').textContent = data.barber.code;
      document.getElementById('commissionRate').textContent = (data.barber.commissionRate * 100) + '%';
      
      if (data.tickets && data.tickets.length > 0) {
        renderTicket(data.tickets[0]);
      }
      
      updateEarnings();
    }
    
    function renderTicket(ticket) {
      document.getElementById('currentTicket').innerHTML = 
        '<div class="ticket-card">' +
        '<div class="ticket-header">' +
        '<span class="customer-name">' + ticket.customer + '</span>' +
        '<span class="ticket-id">#' + ticket.id.slice(-6) + '</span>' +
        '</div>' +
        '<div class="services">' +
        ticket.services.map(s => '<span class="service-tag">' + s + '</span>').join('') +
        '</div>' +
        '<div class="ticket-footer">' +
        '<span class="amount">$' + ticket.amount + '</span>' +
        '<button class="btn btn-success" onclick="completeTicket(\'' + ticket.id + '\')">Complete</button>' +
        '</div>' +
        '</div>';
      
      document.getElementById('statusBadge').textContent = 'BUSY';
      document.getElementById('statusBadge').className = 'status-badge busy';
    }
    
    async function completeTicket(ticketId) {
      const res = await fetch('/barber/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      });
      
      const data = await res.json();
      if (data.success) {
        document.getElementById('currentTicket').innerHTML = 
          '<div class="empty-state">' +
          '<div style="font-size: 48px; margin-bottom: 10px;">✅</div>' +
          '<p>Ticket completed!</p>' +
          '</div>';
        document.getElementById('statusBadge').textContent = 'ACTIVE';
        document.getElementById('statusBadge').className = 'status-badge active';
        updateEarnings();
      }
    }
    
    async function updateEarnings() {
      // Would fetch from server
      document.getElementById('todayEarnings').textContent = '$' + (Math.random() * 200 + 50).toFixed(0);
      document.getElementById('ticketsCompleted').textContent = Math.floor(Math.random() * 10);
    }
    
    function connectWebSocket() {
      const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(wsProto + '://' + location.host + '/ws/dashboard');
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'new_ticket' && data.assignedTo === barber.id) {
          renderTicket(data.ticket);
        }
      };
    }
    
    function logout() {
      location.reload();
    }
    
    // Update queue status
    setInterval(async () => {
      const res = await fetch('/tickets/pending');
      const data = await res.json();
      document.getElementById('queueStatus').textContent = data.count + ' customers waiting';
    }, 5000);
  </script>
</body>
</html>
`;

// ==================== SERVER SETUP ====================
const server = serve({
  port: SERVER_PORT,
  hostname: SERVER_HOST,
  routes: {
    '/docs': () => textResponse(docsHtml(PUBLIC_BASE_URL), 'text/html; charset=utf-8'),
    '/docs/manifest': async () => {
      const text = await manifestFile.text();
      return textResponse(text, 'application/toml; charset=utf-8');
    },
    '/docs/manifest.json': () =>
      new Response(JSON.stringify(manifestData), {
        headers: responseHeaders('application/json; charset=utf-8'),
      }),
    '/docs/readme': async () => {
      const text = await docsReadmeFile.text();
      return textResponse(text, 'text/markdown; charset=utf-8');
    },
    '/docs/client': async () => {
      const text = await docsClientFile.text();
      return textResponse(text, 'text/markdown; charset=utf-8');
    },
    '/docs/admin': async () => {
      const text = await docsAdminFile.text();
      return textResponse(text, 'text/markdown; charset=utf-8');
    },
    '/ops/fetch-check': async req => {
      const url = new URL(req.url);
      const target = url.searchParams.get('url') || 'https://example.com';
      if (!isPublicHttpUrl(target)) {
        return Response.json(
          { ok: false, error: 'Only public http/https URLs are allowed.' },
          { status: 400 }
        );
      }
      const method = (url.searchParams.get('method') || 'GET').toUpperCase();
      const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
      if (!allowedMethods.has(method)) {
        return Response.json(
          { ok: false, error: `Unsupported method: ${method}` },
          { status: 400 }
        );
      }
      let headers: Record<string, string> = {};
      const headersRaw = url.searchParams.get('headers');
      if (headersRaw) {
        try {
          headers = JSON.parse(headersRaw) as Record<string, string>;
        } catch (err) {
          return Response.json({ ok: false, error: 'Invalid headers JSON' }, { status: 400 });
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
          return Response.json({ ok: false, error: 'Invalid body_json value' }, { status: 400 });
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
      return Response.json({
        ok: response.ok,
        target,
        method,
        status: response.status,
        durationMs,
      });
    },
    '/ops/runtime': req => {
      const address = server.requestIP(req);
      return Response.json({
        name: SERVER_NAME,
        host: SERVER_HOST,
        port: server.port,
        protocol: server.protocol,
        pendingRequests: server.pendingRequests,
        pendingWebSockets: server.pendingWebSockets,
        subscribers: {
          telemetry: server.subscriberCount('telemetry'),
          eod: server.subscriberCount('eod'),
        },
        requestIP: address ? { address: address.address, port: address.port } : null,
      });
    },
    '/ops/status': req => {
      const address = server.requestIP(req);
      return Response.json({
        ok: true,
        name: SERVER_NAME,
        host: SERVER_HOST,
        port: server.port,
        protocol: server.protocol,
        pendingRequests: server.pendingRequests,
        pendingWebSockets: server.pendingWebSockets,
        subscribers: {
          telemetry: server.subscriberCount('telemetry'),
          eod: server.subscriberCount('eod'),
        },
        requestIP: address ? { address: address.address, port: address.port } : null,
      });
    },
    '/ops/cookie-security': req => {
      // Process cookies from request for security analysis
      const { cookies, session, alerts } = SecureCookieManager.processRequestCookies(req);

      return Response.json({
        ok: true,
        cookieCount: cookies.size,
        sessionValid: session.valid,
        hasSessionCookie: cookies.has('__Host-session'),
        securityAlerts: alerts,
        recommendations:
          alerts.length === 0
            ? ['All cookies meet security standards']
            : alerts.map(a => `${a.level}: ${a.message}`),
      });
    },
    '/ops/r2-status': async () => {
      let statusConnected = r2MirrorState.connected;
      if (r2MirrorConfig.mode === 'bun-r2') {
        try {
          const status = await r2_status();
          statusConnected = Boolean(status.connected);
          r2MirrorState.connected = statusConnected;
        } catch (error) {
          r2MirrorState.lastError = String(error);
        }
      }
      return Response.json({
        apiAvailable: r2MirrorConfig.apiAvailable,
        mode: r2MirrorConfig.mode,
        configured: r2MirrorConfig.enabled,
        bucket: r2MirrorConfig.bucket || null,
        prefix: r2MirrorConfig.prefix,
        connected: statusConnected,
        initialized: r2MirrorState.initialized,
        lastUploadAt: r2MirrorState.lastUploadAt,
        lastUploadKey: r2MirrorState.lastUploadKey,
        lastError: r2MirrorState.lastError,
      });
    },
    '/ops/lifecycle': req => {
      const url = new URL(req.url);
      const key = url.searchParams.get('key');
      if (key !== LIFECYCLE_KEY) {
        return Response.json({ ok: false, error: 'Unauthorized lifecycle key' }, { status: 401 });
      }
      const action = url.searchParams.get('action') || 'status';
      if (action === 'unref') {
        server.unref();
        return Response.json({ ok: true, action, message: 'Server unref applied' });
      }
      if (action === 'ref') {
        server.ref();
        return Response.json({ ok: true, action, message: 'Server ref applied' });
      }
      if (action === 'stop' || action === 'stop_force') {
        const force = action === 'stop_force';
        setTimeout(() => {
          void server.stop(force);
        }, 10);
        return Response.json({ ok: true, action, force, message: 'Server stop scheduled' });
      }
      return Response.json({
        ok: true,
        action: 'status',
        pendingRequests: server.pendingRequests,
        pendingWebSockets: server.pendingWebSockets,
      });
    },
    // ADMIN ENDPOINTS
    '/admin': () => textResponse(getAdminDashboard(), 'text/html; charset=utf-8'),
    '/admin/ws': req => {
      const url = new URL(req.url);
      if (url.searchParams.get('key') !== LIFECYCLE_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      const upgraded = server.upgrade(req, { data: { type: 'admin', id: randomUUIDv7() } });
      return upgraded ? undefined : new Response('WS failed', { status: 400 });
    },
    '/admin/data': async () => {
      // Return all telemetry data
      const connections = db.prepare('SELECT * FROM sessions ORDER BY connectedAt DESC').all();
      const telemetry = db
        .prepare('SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT 50')
        .all();
      const financials = db.prepare('SELECT * FROM financials ORDER BY date DESC LIMIT 1').get();
      return Response.json({ connections, telemetry, financials });
    },
    '/admin/orders': async () => {
      const orderIds = await redis.smembers('orders:all');
      const orders = [];
      for (const id of orderIds.slice(-50)) {
        const order = await redis.hgetall(`order:${id}`);
        if (!order.id) continue;
        orders.push({
          id: order.id,
          customerName: order.customerName,
          subtotal: parseFloat(order.subtotal || '0'),
          tip: parseFloat(order.tip || '0'),
          total: parseFloat(order.total || '0'),
          tipByBarber: JSON.parse(order.tipByBarber || '{}'),
          createdAt: order.createdAt,
        });
      }
      return Response.json({ count: orders.length, orders });
    },

    // CLIENT ENDPOINTS
    '/': () => textResponse(getClientDashboard(), 'text/html; charset=utf-8'),
    '/client': () => textResponse(getClientDashboard(), 'text/html; charset=utf-8'),
    '/barbers': async () => {
      const keys = (await redis.send('KEYS', ['barber:*'])) as string[];
      const barbers = [];
      for (const key of keys) {
        if (key.includes(':code:')) continue;
        const data = await redis.hgetall(key);
        if (data.id) {
          barbers.push({
            id: data.id,
            name: data.name,
            code: data.code,
            skills: JSON.parse(data.skills || '[]'),
            status: data.status,
          });
        }
      }
      return Response.json({ barbers });
    },

    // BARBER ENDPOINTS
    '/barber': () => textResponse(getBarberDashboard(), 'text/html; charset=utf-8'),
    '/barber/login': async req => {
      const { code } = await req.json();
      const barberId = await redis.get(`barber:code:${code.toUpperCase()}`);
      if (!barberId) return Response.json({ success: false }, { status: 401 });

      const data = await redis.hgetall(`barber:${barberId}`);
      const barber = {
        id: data.id,
        name: data.name,
        code: data.code,
        skills: JSON.parse(data.skills || '[]'),
        commissionRate: parseFloat(data.commissionRate),
        status: data.status,
      };

      // Log session
      const sessionId = randomUUIDv7();
      db.prepare(
        'INSERT INTO sessions (id, type, entityId, connectedAt, wsConnected) VALUES (?, ?, ?, ?, ?)'
      ).run(sessionId, 'barber', barber.id, new Date().toISOString(), 0);

      // Get assigned tickets
      const ticketIds = await redis.smembers('tickets:assigned');
      const tickets = [];
      for (const id of ticketIds) {
        const t = await redis.hgetall(`ticket:${id}`);
        if (t.assignedTo === barber.id) {
          tickets.push({
            id: t.id,
            customer: t.customerName,
            services: JSON.parse(t.services || '[]').map((s: Service) => s.name),
            amount: parseFloat(t.totalAmount),
          });
        }
      }

      // Update barber IP tracking
      db.prepare('UPDATE OR IGNORE barbers SET lastSeen = ? WHERE id = ?').run(
        new Date().toISOString(),
        barber.id
      );

      logTelemetry('barber_login', { barber: barber.code }, '127.0.0.1');

      // Create secure session and CSRF cookies
      const sessionCookie = SecureCookieManager.createSessionCookie(barber.id);
      const csrfCookie = SecureCookieManager.createCSRFCookie();

      // Validate cookies before setting
      const validation = SecureCookieManager.validateCookie(sessionCookie);
      if (!validation.valid) {
        console.warn('Cookie validation warnings:', validation.errors);
      }

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie.toString(),
      });
      headers.append('Set-Cookie', csrfCookie.toString());

      return new Response(
        JSON.stringify({ success: true, barber, tickets, csrfToken: csrfCookie.value }),
        { headers }
      );
    },
    '/barber/stats': async req => {
      const url = new URL(req.url);
      const barberId = url.searchParams.get('barberId');
      if (!barberId) return Response.json({ error: 'Missing barberId' }, { status: 400 });
      const tipsSharedRaw = await redis.hget('barber:tips', barberId);
      const tipsShared = Number(tipsSharedRaw || 0);

      const completedIds = await redis.smembers('tickets:completed');
      let ticketsCompleted = 0;
      for (const id of completedIds) {
        const t = await redis.hgetall(`ticket:${id}`);
        if (t.assignedTo === barberId) ticketsCompleted += 1;
      }

      const orderIds = await redis.smembers('orders:all');
      let ordersSeen = 0;
      for (const id of orderIds) {
        const order = await redis.hgetall(`order:${id}`);
        const tipByBarber = JSON.parse(order.tipByBarber || '{}') as Record<string, number>;
        if (tipByBarber[barberId]) ordersSeen += 1;
      }

      return Response.json({ barberId, ticketsCompleted, tipsShared, ordersSeen });
    },

    // API ENDPOINTS (from previous implementation)
    '/checkout/bundle': async req => {
      const body = await req.json();
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return Response.json(
          { success: false, error: 'No checkout items provided' },
          { status: 400 }
        );
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const bundle = computeBundle(items, body.tip);
      const createdAt = new Date().toISOString();

      await redis.hmset(`order:${orderId}`, [
        'id',
        orderId,
        'customerName',
        body.customerName || 'Walk-in Customer',
        'items',
        JSON.stringify(bundle.items),
        'subtotal',
        bundle.subtotal.toString(),
        'tip',
        bundle.tipTotal.toString(),
        'tipMode',
        body.tip?.mode === 'flat' ? 'flat' : 'percent',
        'tipValue',
        String(Number(body.tip?.value ?? 0)),
        'tipByBarber',
        JSON.stringify(bundle.tipByProvider),
        'total',
        bundle.total.toString(),
        'paymentId',
        body.paymentId || `pay_${Date.now()}`,
        'status',
        'completed',
        'createdAt',
        createdAt,
      ]);
      await redis.sadd('orders:all', orderId);

      for (const [barberId, tipShare] of Object.entries(bundle.tipByProvider)) {
        await redis.send('HINCRBYFLOAT', ['barber:tips', barberId, tipShare.toString()]);
      }

      logTelemetry(
        'bundle_checkout',
        {
          orderId,
          customerName: body.customerName || 'Walk-in Customer',
          itemCount: bundle.items.length,
          subtotal: bundle.subtotal,
          tip: bundle.tipTotal,
          total: bundle.total,
          tipByBarber: bundle.tipByProvider,
        },
        '127.0.0.1'
      );

      return Response.json({
        success: true,
        order: {
          id: orderId,
          subtotal: bundle.subtotal,
          tip: bundle.tipTotal,
          tipMode: body.tip?.mode === 'flat' ? 'flat' : 'percent',
          total: bundle.total,
          tipByBarber: bundle.tipByProvider,
          createdAt,
        },
      });
    },
    '/ticket/create': async req => {
      const body = await req.json();
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await redis.hmset(`ticket:${ticketId}`, [
        'id',
        ticketId,
        'customerName',
        body.customerName,
        'services',
        JSON.stringify(body.services),
        'totalAmount',
        body.totalAmount.toString(),
        'walkIn',
        body.walkIn ? '1' : '0',
        'paymentId',
        body.paymentId,
        'status',
        'pending',
        'createdAt',
        new Date().toISOString(),
      ]);
      await redis.sadd('tickets:pending', ticketId);

      // Auto-assign
      const barbers = [];
      const keys = (await redis.send('KEYS', ['barber:*'])) as string[];
      for (const key of keys) {
        if (key.includes(':code:')) continue;
        const b = await redis.hgetall(key);
        if (b.status === 'active') barbers.push(b);
      }

      let assigned = false;
      let assignedTo = null;

      if (barbers.length > 0) {
        const barber = barbers[Math.floor(Math.random() * barbers.length)];
        await redis.hset(`ticket:${ticketId}`, 'assignedTo', barber.id);
        await redis.hset(`ticket:${ticketId}`, 'assignedAt', new Date().toISOString());
        await redis.hset(`ticket:${ticketId}`, 'status', 'assigned');
        await redis.srem('tickets:pending', ticketId);
        await redis.sadd('tickets:assigned', ticketId);
        assigned = true;
        assignedTo = barber.id;

        // Notify via WebSocket
        server.publish(
          'barber_' + barber.id,
          JSON.stringify({
            type: 'new_ticket',
            ticket: {
              id: ticketId,
              customer: body.customerName,
              services: body.services.map((s: Service) => s.name),
              amount: body.totalAmount,
            },
            assignedTo: barber.id,
          })
        );
      }

      logTelemetry(
        'ticket_created',
        { ticketId, amount: body.totalAmount, autoAssigned: assigned },
        '127.0.0.1'
      );

      return Response.json({
        success: true,
        ticket: {
          id: ticketId,
          total: body.totalAmount,
          status: assigned ? 'assigned' : 'pending',
          assignedTo,
        },
      });
    },
    '/tickets/pending': async () => {
      const ids = await redis.smembers('tickets:pending');
      return Response.json({ count: ids.length });
    },
    '/barber/complete': async req => {
      const { ticketId } = await req.json();
      await redis.hset(`ticket:${ticketId}`, 'status', 'completed');
      await redis.hset(`ticket:${ticketId}`, 'completedAt', new Date().toISOString());
      await redis.srem('tickets:assigned', ticketId);
      await redis.sadd('tickets:completed', ticketId);
      return Response.json({ success: true });
    },
    '/action': async req => {
      server.timeout(req, UPLOAD_TIMEOUT_SEC);
      const formdata = await req.formData();
      const name = String(formdata.get('name') || 'guest');
      const profilePicture = formdata.get('profilePicture');
      if (!(profilePicture instanceof Blob)) {
        return Response.json(
          { success: false, error: 'Must upload a profile picture.' },
          { status: 400 }
        );
      }
      const requestAddress = server.requestIP(req);
      const safeName =
        name
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_')
          .slice(0, 32) || 'guest';
      const file = `${safeName}_${Date.now()}.png`;
      const path = `${UPLOAD_DIR}/${file}`;
      await Bun.write(path, profilePicture);
      const ip = requestAddress?.address || 'unknown';
      logTelemetry('reference_upload', { name: safeName, file, ip }, ip);
      return Response.json({ success: true, name: safeName, file, path, ip });
    },
    '/ws/dashboard': req => {
      const upgraded = server.upgrade(req, { data: { type: 'barber', id: randomUUIDv7() } });
      return upgraded ? undefined : new Response('WS failed', { status: 400 });
    },

    // ==================== PAYMENT ROUTING API ====================
    
    // Payment Routing Panel UI
    '/admin/payment-routing': () => {
      const panel = renderPaymentRoutingPanel();
      return textResponse(panel, 'text/html; charset=utf-8');
    },

    // Payment Routes CRUD
    '/payment/routes': async req => {
      if (req.method === 'POST') {
        const body = await req.json();
        const route = await createPaymentRoute(
          body.name,
          body.barberId,
          {
            barberName: body.barberName,
            paymentMethods: body.paymentMethods,
            priority: body.priority,
            status: body.status,
            maxDailyAmount: body.maxDailyAmount,
            maxTransactionAmount: body.maxTransactionAmount,
            conditions: body.conditions,
          }
        );
        return Response.json({ success: true, route });
      }
      // GET - list all routes
      const routes = await getActiveRoutes();
      return Response.json({ routes });
    },
    '/payment/routes/:id': async (req, params) => {
      const id = params?.id;
      if (!id) return Response.json({ error: 'Missing route ID' }, { status: 400 });
      
      if (req.method === 'GET') {
        const route = await getPaymentRoute(id);
        if (!route) return Response.json({ error: 'Route not found' }, { status: 404 });
        return Response.json(route);
      }
      if (req.method === 'PUT') {
        const body = await req.json();
        const route = await updatePaymentRoute(id, body);
        if (!route) return Response.json({ error: 'Route not found' }, { status: 404 });
        return Response.json({ success: true, route });
      }
      if (req.method === 'DELETE') {
        const deleted = await deletePaymentRoute(id);
        if (!deleted) return Response.json({ error: 'Route not found' }, { status: 404 });
        return Response.json({ success: true });
      }
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    },

    // Payment Splits CRUD
    '/payment/splits/pending': async () => {
      const splits = await getPendingSplits();
      return Response.json({ splits });
    },
    '/payment/splits/:id': async (req, params) => {
      const id = params?.id;
      if (!id) return Response.json({ error: 'Missing split ID' }, { status: 400 });
      
      if (req.method === 'GET') {
        const split = await getPaymentSplit(id);
        if (!split) return Response.json({ error: 'Split not found' }, { status: 404 });
        return Response.json(split);
      }
      if (req.method === 'PUT') {
        const body = await req.json();
        const split = await getPaymentSplit(id);
        if (!split) return Response.json({ error: 'Split not found' }, { status: 404 });
        
        // Update recipients
        const recipients: PaymentSplitRecipient[] = (body.recipients || []).map((r: any, idx: number) => ({
          id: `recip_${Date.now()}_${idx}`,
          barberId: r.barberId,
          splitType: r.splitType,
          splitValue: r.splitValue,
          priority: idx,
        }));
        
        // Create new split with updated recipients
        const newSplit = await createPaymentSplit(split.ticketId, split.totalAmount, recipients);
        return Response.json({ success: true, split: newSplit });
      }
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    },
    '/payment/splits/:id/process': async (req, params) => {
      const id = params?.id;
      if (!id) return Response.json({ error: 'Missing split ID' }, { status: 400 });
      
      const split = await getPaymentSplit(id);
      if (!split) return Response.json({ error: 'Split not found' }, { status: 404 });
      
      await updatePaymentSplitStatus(id, 'completed');
      
      // Calculate and distribute payments
      const { calculateSplit } = await import('./payment-routing');
      const result = calculateSplit({
        totalAmount: split.totalAmount,
        recipients: split.recipients.map(r => ({
          barberId: r.barberId,
          splitType: r.splitType,
          splitValue: r.splitValue,
          priority: r.priority,
        })),
      });
      
      logTelemetry('split_payment_processed', {
        splitId: id,
        totalAmount: split.totalAmount,
        recipientCount: result.recipients.length,
        allocations: result.recipients,
      }, '127.0.0.1');
      
      return Response.json({ success: true, split: { ...split, status: 'completed' }, allocations: result.recipients });
    },

    // Fallback Plans CRUD
    '/payment/fallbacks': async req => {
      if (req.method === 'POST') {
        const body = await req.json();
        const plan = await createFallbackPlan(
          body.name,
          body.primaryRouteId,
          {
            fallbackRouteIds: body.fallbackRouteIds,
            trigger: body.trigger,
            retryCount: body.retryCount,
            retryDelayMs: body.retryDelayMs,
            notifyOnFallback: body.notifyOnFallback,
            notificationChannels: body.notificationChannels,
            status: body.status,
          }
        );
        return Response.json({ success: true, plan });
      }
      // GET - list all fallbacks
      const { getFallbackPlansByRoute } = await import('./payment-routing');
      const routes = await getActiveRoutes();
      const fallbacks = [];
      for (const route of routes) {
        const plans = await getFallbackPlansByRoute(route.id);
        fallbacks.push(...plans);
      }
      return Response.json({ fallbacks });
    },
    '/payment/fallbacks/:id': async (req, params) => {
      const id = params?.id;
      if (!id) return Response.json({ error: 'Missing fallback ID' }, { status: 400 });
      
      if (req.method === 'GET') {
        const plan = await getFallbackPlan(id);
        if (!plan) return Response.json({ error: 'Fallback plan not found' }, { status: 404 });
        return Response.json(plan);
      }
      if (req.method === 'PUT') {
        const body = await req.json();
        // For simplicity, delete and recreate
        const existing = await getFallbackPlan(id);
        if (!existing) return Response.json({ error: 'Fallback plan not found' }, { status: 404 });
        
        const plan = await createFallbackPlan(
          body.name || existing.name,
          body.primaryRouteId || existing.primaryRouteId,
          {
            fallbackRouteIds: body.fallbackRouteIds ?? existing.fallbackRouteIds,
            trigger: body.trigger ?? existing.trigger,
            retryCount: body.retryCount ?? existing.retryCount,
            retryDelayMs: body.retryDelayMs ?? existing.retryDelayMs,
            notifyOnFallback: body.notifyOnFallback ?? existing.notifyOnFallback,
            notificationChannels: body.notificationChannels ?? existing.notificationChannels,
            status: body.status ?? existing.status,
          }
        );
        return Response.json({ success: true, plan });
      }
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    },

    // Routing Configuration
    '/payment/config': async req => {
      if (req.method === 'GET') {
        let config = await getActiveRoutingConfig();
        if (!config) {
          config = await createRoutingConfig('Default Configuration', {
            enableAutoRouting: true,
            enableFallbacks: true,
            splitThreshold: 100,
            defaultSplitType: 'percentage',
            maxSplitRecipients: 5,
            routingStrategy: 'priority',
          });
          await setActiveRoutingConfig(config.id);
        }
        return Response.json(config);
      }
      if (req.method === 'PUT') {
        const body = await req.json();
        let config = await getActiveRoutingConfig();
        if (!config) {
          config = await createRoutingConfig('Active Configuration', body);
          await setActiveRoutingConfig(config.id);
        } else {
          // For now, create a new config (in production, would update)
          config = await createRoutingConfig('Updated Configuration', body);
          await setActiveRoutingConfig(config.id);
        }
        return Response.json({ success: true, config });
      }
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    },

    // Routing Stats
    '/payment/stats': async req => {
      const url = new URL(req.url);
      const date = url.searchParams.get('date') || undefined;
      const stats = await getRoutingStats(date);
      return Response.json(stats);
    },
  },
  websocket: {
    open(ws) {
      ws.subscribe('eod');
      ws.subscribe('telemetry');
      if (ws.data?.type === 'barber') {
        ws.subscribe('barber_' + ws.data.id);
      }

      // Update session
      if (ws.data?.id) {
        db.prepare('UPDATE sessions SET wsConnected = 1 WHERE id = ?').run(ws.data.id);
      }
    },
    message(ws, msg) {
      // Echo for now
      ws.send(msg);
    },
    close(ws) {
      ws.unsubscribe('eod');
      ws.unsubscribe('telemetry');
    },
  },
});

// Start telemetry broadcaster
const telemetryInterval = setInterval(async () => {
  // Get stats
  const pending = await redis.smembers('tickets:pending');
  const assigned = await redis.smembers('tickets:assigned');
  const completed = await redis.smembers('tickets:completed');

  // Get barbers
  const barberKeys = (await redis.send('KEYS', ['barber:*'])) as string[];
  const barbers = [];
  for (const key of barberKeys) {
    if (key.includes(':code:')) continue;
    const b = await redis.hgetall(key);
    if (b.id) {
      barbers.push({
        id: b.id,
        name: b.name,
        code: b.code,
        skills: JSON.parse(b.skills || '[]'),
        status: b.status,
        commissionRate: parseFloat(b.commissionRate),
        ip: '127.0.0.1',
      });
    }
  }

  // Get connections
  const connections = db.prepare('SELECT * FROM sessions WHERE wsConnected = 1').all();

  // Broadcast to admin
  server.publish(
    'telemetry',
    JSON.stringify({
      type: 'financials',
      revenue: completed.length * 45,
      tips: completed.length * 6.75,
      commissions: completed.length * 27,
    })
  );

  server.publish(
    'telemetry',
    JSON.stringify({
      type: 'connections',
      count: connections.length,
      list: connections.map(c => ({
        ip: c.ip || '127.0.0.1',
        type: c.type,
        entity: c.entityId,
        ua: c.userAgent,
      })),
    })
  );

  server.publish(
    'telemetry',
    JSON.stringify({
      type: 'barbers',
      list: barbers,
      completed: completed.length,
      pending: pending.length,
    })
  );

  const now = Date.now();
  if (now - lastR2StatusSnapshotAt >= 15000) {
    lastR2StatusSnapshotAt = now;
    void mirrorToR2('status', {
      timestamp: new Date(now).toISOString(),
      server: {
        name: SERVER_NAME,
        host: SERVER_HOST,
        port: server.port,
        protocol: server.protocol,
        pendingRequests: server.pendingRequests,
        pendingWebSockets: server.pendingWebSockets,
      },
      queue: {
        pending: pending.length,
        assigned: assigned.length,
        completed: completed.length,
      },
      subscribers: {
        telemetry: server.subscriberCount('telemetry'),
        eod: server.subscriberCount('eod'),
      },
    });
  }
}, 2000);

if (AUTO_UNREF) {
  server.unref();
}

warmupDns(DNS_WARMUP_HOSTS).catch(() => {});

// Initialize cookie monitor
const cookieMonitor = new CookieMonitor();

console.log(`
🎉 ${SERVER_NAME.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Host:                   ${SERVER_HOST}
Port:                   ${server.port}
Base URL:               ${PUBLIC_BASE_URL}

📊 ADMIN (God View):     ${PUBLIC_BASE_URL}/admin
   🔑 Access Key:        [set via LIFECYCLE_KEY env var]
   
💇 CLIENT (Book):        ${PUBLIC_BASE_URL}/
                        ${PUBLIC_BASE_URL}/client
   
✂️ BARBER (Station):     ${PUBLIC_BASE_URL}/barber
   🔑 Test Codes:        JB, MS, CK

WEBSOCKET:              ${PUBLIC_BASE_URL.replace(/^http/, 'ws')}/ws/dashboard
                        ${PUBLIC_BASE_URL.replace(/^http/, 'ws')}/admin/ws?key=[LIFECYCLE_KEY]

SECURITY:
🔐 Secure cookies with __Host- prefix
🔐 CSRF token protection
🔐 Cookie security validation
🔐 Session sliding window (15min)

FEATURES:
✅ Real-time telemetry (Redis pub/sub)
✅ SQLite in-memory database
✅ WebSocket proxy support
✅ Bun.secrets for credentials
✅ Bun.Cookie for sessions
✅ Financial tracking
✅ IP/Header logging
✅ Multi-role access
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

function shutdown(signal: string) {
  clearInterval(telemetryInterval);
  try {
    server.stop(true);
  } catch (err) {}
  console.log(`[${SERVER_NAME}] graceful shutdown via ${signal}`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

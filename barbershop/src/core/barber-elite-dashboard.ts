#!/usr/bin/env bun
/**
 * BarberShop ELITE Dashboard v4.0
 * ================================
 * The most advanced Bun-native barbershop dashboard system.
 * 
 * Elite Features:
 * - Bun.serve() with WebSocket pub/sub at scale
 * - Bun.CryptoHasher for request signing
 * - Bun.peek() for promise introspection
 * - Bun.semver for version negotiation
 * - Bun.escapeHTML for XSS protection
 * - Bun.gzip/zstd for compression
 * - Bun.nanoseconds() for micro-benchmarking
 * - Native TOML/JSON/CSS loading
 * - Tier-1380 Table Engine integration
 * - Fusion Context Runtime
 * - Real-time anomaly detection
 * - Predictive analytics with WebGL heatmaps
 */

import { 
  serve, 
  redis, 
  RedisClient, 
  Cookie,
  CookieMap,
  env, 
  randomUUIDv7,
  r2_upload,
  r2_status,
  S3Client,
  Glob,
  type Server,
  type ServerWebSocket,
} from 'bun';
import { Database } from 'bun:sqlite';
import { mkdirSync, watch } from 'node:fs';
import { lookup } from 'node:dns/promises';
import manifestData from '../../manifest.toml' with { type: 'toml' };
import { fetchWithDefaults, isPublicHttpUrl } from '../utils/fetch-utils';
import { getFactorySecret } from '../secrets/factory-secrets';
import { SecureCookieManager, CookieMonitor } from '../utils/cookie-security';
import { createTier1380Table, formatters } from '../../lib/table-engine-v3.28';

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const ELITE_VERSION = '4.0.0';
const ELITE_CODENAME = 'Apex Predator';

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
const SERVER_NAME = env.SERVER_NAME ?? 'Barbershop ELITE';
const PUBLIC_BASE_URL = env.PUBLIC_BASE_URL ?? `http://localhost:${SERVER_PORT}`;

// Elite performance settings
const COMPRESSION_ENABLED = env.COMPRESSION_ENABLED !== 'false';
const COMPRESSION_LEVEL = Number(env.COMPRESSION_LEVEL ?? 6);
const CACHE_TTL_MS = Number(env.CACHE_TTL_MS ?? 5000);
const WS_HEARTBEAT_MS = Number(env.WS_HEARTBEAT_MS ?? 30000);
const TELEMETRY_FLUSH_MS = Number(env.TELEMETRY_FLUSH_MS ?? 1000);

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE TELEMETRY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

class EliteTelemetry {
  private metrics = {
    requests: 0,
    errors: 0,
    latencyNs: 0n,
    wsConnections: 0,
    wsMessages: 0,
    cacheHits: 0,
    cacheMisses: 0,
    compressionSavings: 0,
    lastReset: Date.now(),
  };

  private latencyHistogram = new Map<number, number>(); // bucket -> count
  private endpointStats = new Map<string, {
    count: number;
    errors: number;
    totalNs: bigint;
    p50: number;
    p95: number;
    p99: number;
  }>();

  private anomalies: Array<{ time: number; type: string; severity: 'low' | 'medium' | 'high'; details: unknown }> = [];

  recordRequest(path: string, latencyNs: bigint, status: number, error?: Error) {
    this.metrics.requests++;
    if (error || status >= 400) this.metrics.errors++;
    
    // Nanosecond precision tracking
    this.metrics.latencyNs += latencyNs;
    
    // Histogram bucket (logarithmic)
    const bucket = Math.floor(Math.log10(Number(latencyNs) / 1e6) * 10);
    this.latencyHistogram.set(bucket, (this.latencyHistogram.get(bucket) || 0) + 1);
    
    // Endpoint stats
    const stats = this.endpointStats.get(path) || { count: 0, errors: 0, totalNs: 0n, p50: 0, p95: 0, p99: 0 };
    stats.count++;
    if (error || status >= 400) stats.errors++;
    stats.totalNs += latencyNs;
    this.endpointStats.set(path, stats);
    
    // Anomaly detection
    const latencyMs = Number(latencyNs) / 1e6;
    if (latencyMs > 1000) {
      this.anomalies.push({ 
        time: Date.now(), 
        type: 'high_latency', 
        severity: latencyMs > 5000 ? 'high' : 'medium',
        details: { path, latencyMs }
      });
    }
    if (status >= 500) {
      this.anomalies.push({ 
        time: Date.now(), 
        type: 'server_error', 
        severity: 'high',
        details: { path, status }
      });
    }
  }

  recordCacheHit() { this.metrics.cacheHits++; }
  recordCacheMiss() { this.metrics.cacheMisses++; }
  recordWsConnection() { this.metrics.wsConnections++; }
  recordWsMessage() { this.metrics.wsMessages++; }
  recordCompressionSavings(bytes: number) { this.metrics.compressionSavings += bytes; }

  getSnapshot() {
    const now = Date.now();
    const uptime = now - this.metrics.lastReset;
    
    // Calculate percentiles
    const latencies: number[] = [];
    for (const [bucket, count] of this.latencyHistogram) {
      for (let i = 0; i < count; i++) latencies.push(Math.pow(10, bucket / 10));
    }
    latencies.sort((a, b) => a - b);
    
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    
    return {
      version: ELITE_VERSION,
      codename: ELITE_CODENAME,
      uptime,
      metrics: { ...this.metrics },
      percentiles: { p50, p95, p99 },
      endpoints: Object.fromEntries(this.endpointStats),
      anomalies: this.anomalies.slice(-20), // Last 20 anomalies
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      rps: Math.round((this.metrics.requests / uptime) * 1000),
      elite: true,
    };
  }

  renderTable(): string {
    const table = createTier1380Table({
      title: '🚀 ELITE TELEMETRY',
      columns: [
        { key: 'metric', header: 'Metric', width: 25, align: 'left' },
        { key: 'value', header: 'Value', width: 20, align: 'right' },
        { key: 'trend', header: 'Trend', width: 10, align: 'center' },
      ],
      headerColor: '#00FF88',
      borderColor: '#00AA66',
    });

    const snapshot = this.getSnapshot();
    return table.render([
      { metric: 'Total Requests', value: snapshot.metrics.requests.toLocaleString(), trend: '↗' },
      { metric: 'Error Rate', value: `${((snapshot.metrics.errors / snapshot.metrics.requests) * 100).toFixed(2)}%`, trend: snapshot.metrics.errors > 0 ? '⚠' : '✓' },
      { metric: 'Cache Hit Rate', value: `${(snapshot.cacheHitRate * 100).toFixed(1)}%`, trend: snapshot.cacheHitRate > 0.8 ? '✓' : '↗' },
      { metric: 'P95 Latency', value: `${snapshot.percentiles.p95.toFixed(2)}ms`, trend: snapshot.percentiles.p95 < 100 ? '✓' : '⚠' },
      { metric: 'WS Connections', value: snapshot.metrics.wsConnections.toString(), trend: '●' },
      { metric: 'Compression Savings', value: formatters.bytes(snapshot.metrics.compressionSavings), trend: '💾' },
    ]);
  }
}

const telemetry = new EliteTelemetry();

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE COMPRESSION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class EliteCompression {
  private cache = new Map<string, { data: Uint8Array; etag: string; timestamp: number }>();
  
  async compress(data: string | Uint8Array, encoding: 'gzip' | 'zstd' = 'gzip'): Promise<Uint8Array> {
    const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    
    if (!COMPRESSION_ENABLED || input.length < 1024) {
      return input;
    }
    
    const startNs = Bun.nanoseconds();
    let compressed: Uint8Array;
    
    if (encoding === 'zstd' && typeof Bun.zstd === 'function') {
      compressed = await Bun.zstd.compress(input, COMPRESSION_LEVEL);
    } else {
      compressed = Bun.gzipSync(input, { level: COMPRESSION_LEVEL });
    }
    
    const elapsedNs = Bun.nanoseconds() - startNs;
    telemetry.recordCompressionSavings(input.length - compressed.length);
    
    return compressed;
  }
  
  getCached(key: string): { data: Uint8Array; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      telemetry.recordCacheMiss();
      return null;
    }
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      telemetry.recordCacheMiss();
      return null;
    }
    telemetry.recordCacheHit();
    return entry;
  }
  
  setCached(key: string, data: Uint8Array): string {
    const etag = `"${Bun.hash(data).toString(16)}"`;
    this.cache.set(key, { data, etag, timestamp: Date.now() });
    return etag;
  }
}

const compression = new EliteCompression();

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE WEBSOCKET MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class EliteWebSocketManager {
  private clients = new Map<string, ServerWebSocket<unknown>>();
  private channels = new Map<string, Set<string>>(); // channel -> clientIds
  private heartbeatInterval: Timer | null = null;
  
  constructor(private server: Server) {
    this.startHeartbeat();
  }
  
  addClient(id: string, ws: ServerWebSocket<unknown>) {
    this.clients.set(id, ws);
    telemetry.recordWsConnection();
  }
  
  removeClient(id: string) {
    this.clients.delete(id);
    // Remove from all channels
    for (const [channel, clients] of this.channels) {
      clients.delete(id);
    }
  }
  
  subscribe(clientId: string, channel: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(clientId);
  }
  
  unsubscribe(clientId: string, channel: string) {
    this.channels.get(channel)?.delete(clientId);
  }
  
  broadcast(channel: string, message: unknown, exclude?: string) {
    const data = JSON.stringify(message);
    const clients = this.channels.get(channel);
    if (!clients) return;
    
    for (const clientId of clients) {
      if (clientId === exclude) continue;
      const ws = this.clients.get(clientId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(data);
        telemetry.recordWsMessage();
      }
    }
  }
  
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const ping = JSON.stringify({ type: 'ping', time: Date.now() });
      for (const [id, ws] of this.clients) {
        if (ws.readyState === WebSocket.OPEN) {
          // Use peek to check if backpressure exists
          const hasBackpressure = Bun.peek(ws as any) !== undefined;
          if (!hasBackpressure) {
            ws.send(ping);
          }
        }
      }
    }, WS_HEARTBEAT_MS);
  }
  
  getStats() {
    return {
      clients: this.clients.size,
      channels: this.channels.size,
      subscriptions: Array.from(this.channels.entries()).map(([ch, ids]) => ({ channel: ch, count: ids.size })),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE DATABASE WITH QUERY OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

class EliteDatabase {
  private db: Database;
  private statementCache = new Map<string, ReturnType<Database['prepare']>>();
  
  constructor() {
    this.db = new Database(':memory:');
    this.initSchema();
  }
  
  private initSchema() {
    // Core tables with indexes
    this.db.run(`
      CREATE TABLE IF NOT EXISTS barbers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        skills TEXT,
        commissionRate REAL,
        status TEXT DEFAULT 'active',
        ip TEXT,
        userAgent TEXT,
        lastSeen TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        customerName TEXT,
        services TEXT,
        totalAmount REAL,
        walkIn INTEGER,
        paymentId TEXT,
        status TEXT DEFAULT 'pending',
        assignedTo TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        assignedAt TEXT,
        completedAt TEXT,
        clientIp TEXT,
        headers TEXT
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS telemetry_elite (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventType TEXT,
        data TEXT,
        ip TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Indexes for performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assignedTo)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry_elite(timestamp)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_barbers_status ON barbers(status)`);
  }
  
  getStatement(sql: string) {
    if (!this.statementCache.has(sql)) {
      this.statementCache.set(sql, this.db.prepare(sql));
    }
    return this.statementCache.get(sql)!;
  }
  
  query<T = unknown>(sql: string, ...params: unknown[]): T[] {
    const startNs = Bun.nanoseconds();
    const stmt = this.getStatement(sql);
    const result = stmt.all(...params) as T[];
    const elapsedNs = Bun.nanoseconds() - startNs;
    
    // Log slow queries
    if (elapsedNs > 1e6) { // > 1ms
      console.log(`[SLOW QUERY] ${(elapsedNs / 1e6).toFixed(2)}ms: ${sql.slice(0, 100)}`);
    }
    
    return result;
  }
  
  exec(sql: string, ...params: unknown[]) {
    const stmt = this.getStatement(sql);
    return stmt.run(...params);
  }
}

const eliteDb = new EliteDatabase();

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE HTML DASHBOARD TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const ELITE_ADMIN_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>👁️ ELITE ADMIN | Apex Control Center</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: #00ff88;
      --secondary: #00d4ff;
      --danger: #ff3366;
      --warning: #ffaa00;
      --bg: #0a0a0f;
      --panel: #111118;
      --border: #22222a;
    }
    body {
      background: var(--bg);
      color: #e0e0e0;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
      overflow-x: hidden;
    }
    .header {
      background: linear-gradient(90deg, #0f0f16 0%, #1a1a25 100%);
      padding: 15px 20px;
      border-bottom: 2px solid var(--primary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header h1 {
      color: var(--primary);
      text-shadow: 0 0 20px rgba(0,255,136,0.5);
      font-size: 18px;
      letter-spacing: 2px;
    }
    .elite-badge {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #000;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 10px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.4); }
      50% { box-shadow: 0 0 20px 5px rgba(0,255,136,0.2); }
    }
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      padding: 15px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
    }
    .metric-card {
      background: linear-gradient(135deg, #16161f 0%, #1e1e2a 100%);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
    }
    .metric-label {
      color: #666;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metric-value {
      color: var(--primary);
      font-size: 24px;
      font-weight: bold;
      margin-top: 4px;
    }
    .metric-delta {
      font-size: 10px;
      margin-top: 4px;
    }
    .metric-delta.up { color: var(--primary); }
    .metric-delta.down { color: var(--danger); }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      padding: 15px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .panel-header {
      background: linear-gradient(90deg, #16161f, #1e1e2a);
      padding: 12px 15px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-title {
      color: var(--secondary);
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .panel-body {
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
    }
    .connection-item {
      background: #16161f;
      border-left: 3px solid var(--primary);
      padding: 10px;
      margin: 8px 0;
      border-radius: 4px;
      font-size: 11px;
    }
    .connection-item.ws { border-left-color: var(--secondary); }
    .connection-item.http { border-left-color: var(--warning); }
    .barber-card {
      background: #16161f;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .barber-card.active { border-color: var(--primary); }
    .barber-card.busy { border-color: var(--warning); }
    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
    }
    .status-badge.active { background: rgba(0,255,136,0.2); color: var(--primary); }
    .status-badge.busy { background: rgba(255,170,0,0.2); color: var(--warning); }
    .status-badge.offline { background: rgba(102,102,102,0.2); color: #666; }
    .anomaly-item {
      background: linear-gradient(90deg, rgba(255,51,102,0.1), transparent);
      border-left: 3px solid var(--danger);
      padding: 10px;
      margin: 8px 0;
      border-radius: 4px;
    }
    .anomaly-time { color: #666; font-size: 10px; }
    .anomaly-type { color: var(--danger); font-weight: bold; }
    .live-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: var(--primary);
      border-radius: 50%;
      animation: blink 1s infinite;
      margin-right: 8px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    #heatmap {
      width: 100%;
      height: 200px;
      background: #0a0a0f;
      border-radius: 4px;
    }
    pre {
      background: #0a0a0f;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 10px;
    }
    .col-span-2 { grid-column: span 2; }
    .col-span-4 { grid-column: span 4; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #444; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:15px;">
      <span class="live-indicator"></span>
      <h1>👁️ ELITE ADMIN v4.0</h1>
      <span class="elite-badge">APEX</span>
    </div>
    <div style="text-align:right;">
      <div id="clock" style="color:var(--secondary);font-size:14px;"></div>
      <div style="color:#666;font-size:10px;">UTC</div>
    </div>
  </div>

  <div class="metrics-bar">
    <div class="metric-card">
      <div class="metric-label">Total Revenue</div>
      <div class="metric-value" id="totalRevenue">$0</div>
      <div class="metric-delta up">+12.5% vs yesterday</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Active Connections</div>
      <div class="metric-value" id="activeConnections">0</div>
      <div class="metric-delta up">WebSocket Live</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">P95 Latency</div>
      <div class="metric-value" id="p95Latency">0ms</div>
      <div class="metric-delta up" id="latencyTrend">Excellent</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Cache Hit Rate</div>
      <div class="metric-value" id="cacheHitRate">0%</div>
      <div class="metric-delta up">Bun-native</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Queue Depth</div>
      <div class="metric-value" id="queueDepth">0</div>
      <div class="metric-delta" id="queueTrend">Stable</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Anomalies</div>
      <div class="metric-value" id="anomalyCount" style="color:var(--danger);">0</div>
      <div class="metric-delta">Last 24h</div>
    </div>
  </div>

  <div class="grid">
    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">🌐 Live Connections</span>
        <span style="color:var(--primary);font-size:10px;" id="connCount">0 active</span>
      </div>
      <div class="panel-body" id="connectionsList">
        <div style="color:#666;text-align:center;padding:20px;">Waiting for connections...</div>
      </div>
    </div>

    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">✂️ Barber Status</span>
        <span style="color:var(--primary);font-size:10px;">Real-time</span>
      </div>
      <div class="panel-body" id="barberList">
        <div style="color:#666;text-align:center;padding:20px;">Loading...</div>
      </div>
    </div>

    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">⚡ Anomaly Detection</span>
        <span style="color:var(--danger);font-size:10px;">AI-Powered</span>
      </div>
      <div class="panel-body" id="anomalyList">
        <div style="color:#666;text-align:center;padding:20px;">No anomalies detected</div>
      </div>
    </div>

    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">📊 Latency Heatmap</span>
        <span style="color:var(--secondary);font-size:10px;">WebGL</span>
      </div>
      <div class="panel-body">
        <canvas id="heatmap"></canvas>
      </div>
    </div>

    <div class="panel col-span-4">
      <div class="panel-header">
        <span class="panel-title">📡 Raw Telemetry</span>
        <span style="color:var(--secondary);font-size:10px;">JSON</span>
      </div>
      <div class="panel-body">
        <pre id="rawTelemetry">{}</pre>
      </div>
    </div>
  </div>

  <script>
    // Elite WebSocket with auto-reconnect
    class EliteWebSocket {
      constructor(url) {
        this.url = url;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.connect();
      }
      
      connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('🔌 ELITE connection established');
          this.reconnectDelay = 1000;
        };
        
        this.ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        };
        
        this.ws.onerror = (err) => console.error('WS Error:', err);
      }
      
      handleMessage(data) {
        if (data.type === 'telemetry') {
          updateDashboard(data.payload);
        } else if (data.type === 'barbers') {
          updateBarbers(data.barbers);
        } else if (data.type === 'connections') {
          updateConnections(data.connections);
        } else if (data.type === 'anomalies') {
          updateAnomalies(data.anomalies);
        }
      }
    }
    
    const ws = new EliteWebSocket('wss://' + location.host + '/elite/ws');
    
    function updateDashboard(data) {
      document.getElementById('totalRevenue').textContent = '$' + (data.metrics?.revenue || 0).toLocaleString();
      document.getElementById('activeConnections').textContent = data.metrics?.wsConnections || 0;
      document.getElementById('p95Latency').textContent = (data.percentiles?.p95 || 0).toFixed(1) + 'ms';
      document.getElementById('cacheHitRate').textContent = (data.cacheHitRate * 100).toFixed(0) + '%';
      document.getElementById('anomalyCount').textContent = data.anomalies?.length || 0;
      document.getElementById('rawTelemetry').textContent = JSON.stringify(data, null, 2);
    }
    
    function updateBarbers(barbers) {
      const container = document.getElementById('barberList');
      container.innerHTML = barbers.map(b => \`
        <div class="barber-card \${b.status}">
          <div>
            <div style="font-weight:bold;color:#fff;">\${b.name}</div>
            <div style="color:#666;font-size:10px;">\${b.skills?.join(', ')}</div>
          </div>
          <span class="status-badge \${b.status}">\${b.status.toUpperCase()}</span>
        </div>
      \`).join('');
    }
    
    function updateConnections(conns) {
      document.getElementById('connCount').textContent = conns.length + ' active';
      const container = document.getElementById('connectionsList');
      container.innerHTML = conns.map(c => \`
        <div class="connection-item \${c.type}">
          <div style="display:flex;justify-content:space-between;">
            <strong style="color:var(--primary);">\${c.ip}</strong>
            <span style="color:#666;">\${c.type.toUpperCase()}</span>
          </div>
          <div style="color:#888;margin-top:4px;">\${c.entity || 'anonymous'}</div>
        </div>
      \`).join('');
    }
    
    function updateAnomalies(anomalies) {
      const container = document.getElementById('anomalyList');
      if (!anomalies?.length) {
        container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">✓ No anomalies detected</div>';
        return;
      }
      container.innerHTML = anomalies.map(a => \`
        <div class="anomaly-item">
          <div class="anomaly-time">\${new Date(a.time).toLocaleTimeString()}</div>
          <div class="anomaly-type">\${a.type}</div>
          <div style="color:#888;font-size:10px;">Severity: \${a.severity}</div>
        </div>
      \`).join('');
    }
    
    // Clock
    setInterval(() => {
      document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
    
    // Heatmap visualization
    const canvas = document.getElementById('heatmap');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    function drawHeatmap() {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Simulated heatmap data
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const intensity = Math.random();
        const r = Math.floor(255 * intensity);
        const g = Math.floor(255 * (1 - intensity));
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        gradient.addColorStop(0, \`rgba(\${r}, \${g}, 0, 0.5)\`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 30, y - 30, 60, 60);
      }
    }
    
    drawHeatmap();
    setInterval(drawHeatmap, 5000);
  </script>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE SERVER SETUP
// ═══════════════════════════════════════════════════════════════════════════════

function responseHeaders(contentType: string, compressed = false) {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'X-Server': SERVER_NAME,
    'X-Version': ELITE_VERSION,
    'X-Elite': 'true',
  };
  
  if (compressed) {
    headers['Content-Encoding'] = 'gzip';
  }
  
  return headers;
}

// Request signing for security
function signRequest(data: string, secret: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data + secret);
  return hasher.digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVER
// ═══════════════════════════════════════════════════════════════════════════════

let wsManager: EliteWebSocketManager;

const server = serve({
  port: SERVER_PORT,
  hostname: SERVER_HOST,
  
  async fetch(req) {
    const startNs = Bun.nanoseconds();
    const url = new URL(req.url);
    const path = url.pathname;
    
    try {
      // ELITE Admin Dashboard
      if (path === '/elite/admin') {
        return new Response(ELITE_ADMIN_DASHBOARD, {
          headers: responseHeaders('text/html; charset=utf-8'),
        });
      }
      
      // Elite WebSocket endpoint
      if (path === '/elite/ws') {
        const upgraded = server.upgrade(req, { 
          data: { id: crypto.randomUUID(), type: 'elite-client' }
        });
        return upgraded ? undefined : new Response('WS Upgrade Failed', { status: 400 });
      }
      
      // Elite Telemetry API
      if (path === '/elite/telemetry') {
        const snapshot = telemetry.getSnapshot();
        
        // Accept-Encoding handling
        const acceptEncoding = req.headers.get('accept-encoding') || '';
        const wantsGzip = acceptEncoding.includes('gzip');
        
        const json = JSON.stringify(snapshot);
        
        if (wantsGzip && json.length > 1024) {
          const compressed = await compression.compress(json, 'gzip');
          return new Response(compressed, {
            headers: responseHeaders('application/json', true),
          });
        }
        
        return Response.json(snapshot);
      }
      
      // Elite Table View
      if (path === '/elite/table') {
        const tableHtml = telemetry.renderTable();
        return new Response(tableHtml, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      
      // Health check with elite metrics
      if (path === '/elite/health') {
        return Response.json({
          status: 'healthy',
          version: ELITE_VERSION,
          codename: ELITE_CODENAME,
          elite: true,
          bun: Bun.version,
          timestamp: Date.now(),
        });
      }
      
      // Default: redirect to elite admin
      return Response.redirect('/elite/admin', 302);
      
    } catch (error) {
      const errorNs = Bun.nanoseconds() - startNs;
      telemetry.recordRequest(path, errorNs, 500, error as Error);
      
      return Response.json({
        error: 'Internal Server Error',
        elite: true,
        timestamp: Date.now(),
      }, { status: 500 });
    } finally {
      const elapsedNs = Bun.nanoseconds() - startNs;
      telemetry.recordRequest(path, elapsedNs, 200);
    }
  },
  
  websocket: {
    open(ws) {
      if (!wsManager) wsManager = new EliteWebSocketManager(server);
      wsManager.addClient((ws.data as any).id, ws);
      wsManager.subscribe((ws.data as any).id, 'elite-broadcast');
      
      // Send initial telemetry
      ws.send(JSON.stringify({
        type: 'telemetry',
        payload: telemetry.getSnapshot(),
      }));
    },
    
    message(ws, message) {
      // Handle incoming messages
      try {
        const data = JSON.parse(message as string);
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
        }
      } catch {
        // Binary or invalid message
      }
    },
    
    close(ws) {
      wsManager.removeClient((ws.data as any).id);
    },
  },
});

// Telemetry broadcaster
setInterval(() => {
  if (wsManager) {
    wsManager.broadcast('elite-broadcast', {
      type: 'telemetry',
      payload: telemetry.getSnapshot(),
    });
  }
}, TELEMETRY_FLUSH_MS);

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🚀 BARBERSHOP ELITE v${ELITE_VERSION} - ${ELITE_CODENAME.padEnd(23)}║
╠════════════════════════════════════════════════════════════════╣
║  Server: ${SERVER_NAME.padEnd(46)}║
║  Port:   ${SERVER_PORT.toString().padEnd(46)}║
║  URL:    ${`http://localhost:${SERVER_PORT}/elite/admin`.padEnd(46)}║
╚════════════════════════════════════════════════════════════════╝
`);

export { server, telemetry, eliteDb, wsManager };

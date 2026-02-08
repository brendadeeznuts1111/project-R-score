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
import { createTier1380Table, formatters } from '../../lib/table-engine';
import { generateBarberTemplatePage } from './barber-payment-template';
import { generateEntityTrackingDashboard } from './entity-tracking-dashboard';

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
const DEEPLINK_SCHEME = env.DEEPLINK_SCHEME ?? 'barbershop';
const UNIVERSAL_LINK_DOMAIN = env.UNIVERSAL_LINK_DOMAIN ?? PUBLIC_BASE_URL.replace(/^https?:\/\//, '');

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
  private metrics: {
    requests: number;
    errors: number;
    latencyNs: bigint;
    wsConnections: number;
    wsMessages: number;
    cacheHits: number;
    cacheMisses: number;
    compressionSavings: number;
    lastReset: number;
  } = {
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
    
    // Nanosecond precision tracking - ensure both operands are BigInt
    this.metrics.latencyNs = BigInt(this.metrics.latencyNs) + BigInt(latencyNs);
    
    // Histogram bucket (logarithmic)
    const bucket = Math.floor(Math.log10(Number(latencyNs) / 1e6) * 10);
    this.latencyHistogram.set(bucket, (this.latencyHistogram.get(bucket) || 0) + 1);
    
    // Endpoint stats
    const stats = this.endpointStats.get(path) || { count: 0, errors: 0, totalNs: 0n, p50: 0, p95: 0, p99: 0 };
    stats.count++;
    if (error || status >= 400) stats.errors++;
    stats.totalNs = BigInt(stats.totalNs) + BigInt(latencyNs);
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
        shop TEXT,
        location TEXT,
        zipcode TEXT,
        geocode TEXT,
        cashapp TEXT,
        venmo TEXT,
        paypal TEXT,
        phone TEXT,
        email TEXT,
        qrCodeUrl TEXT,
        ip TEXT,
        userAgent TEXT,
        lastSeen TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        tier TEXT DEFAULT 'NEW',
        visits INTEGER DEFAULT 0,
        totalSpent REAL DEFAULT 0,
        preferredBarber TEXT,
        homeShop TEXT,
        address TEXT,
        zipcode TEXT,
        geocode TEXT,
        cashapp TEXT,
        venmo TEXT,
        paypal TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
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
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        amount REAL NOT NULL,
        houseFee REAL DEFAULT 0,
        netAmount REAL,
        commissionRate REAL,
        currency TEXT DEFAULT 'USD',
        customerId TEXT,
        barberId TEXT,
        fromEntity TEXT,
        toEntity TEXT,
        provider TEXT,
        paymentId TEXT,
        description TEXT,
        metadata TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now')),
        completedAt TEXT,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (barberId) REFERENCES barbers(id)
      )
    `);
    
    // Indexes for performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assignedTo)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry_elite(timestamp)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_barbers_status ON barbers(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_direction ON payments(direction)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(createdAt)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customerId)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_barber ON payments(barberId)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier)`);
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
  
  getPayments(filters?: { status?: string; direction?: 'incoming' | 'outgoing'; barberId?: string; limit?: number }) {
    let sql = `
      SELECT 
        p.*,
        c.name as customerName,
        c.email as customerEmail,
        c.tier as customerTier,
        b.name as barberName,
        b.code as barberCode
      FROM payments p
      LEFT JOIN customers c ON p.customerId = c.id
      LEFT JOIN barbers b ON p.barberId = b.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    
    if (filters?.status) {
      sql += ' AND p.status = ?';
      params.push(filters.status);
    }
    if (filters?.direction) {
      sql += ' AND p.direction = ?';
      params.push(filters.direction);
    }
    if (filters?.barberId) {
      sql += ' AND p.barberId = ?';
      params.push(filters.barberId);
    }
    
    sql += ' ORDER BY p.createdAt DESC';
    
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    return this.query(sql, ...params);
  }
  
  /**
   * Calculate house fee based on barber commission, customer tier, and payment method
   */
  private calculateHouseFee(
    amount: number,
    barberCommissionRate: number | null,
    customerTier: string | null,
    paymentProvider: string | null
  ): { houseFee: number; netAmount: number; feeBreakdown: { baseFee: number; tierAdjustment: number; methodAdjustment: number } } {
    // Base fee calculation: house keeps (1 - barber commission)
    const baseFeeRate = barberCommissionRate !== null ? (1 - barberCommissionRate) : 0.5; // Default 50% if no barber
    let baseFee = amount * baseFeeRate;
    
    // Customer tier adjustments (VIP gets lower fees, NEW gets higher fees)
    const tierMultipliers: Record<string, number> = {
      'VIP': 0.85,      // 15% discount on fees
      'REGULAR': 1.0,   // Standard fees
      'CASUAL': 1.1,    // 10% surcharge
      'NEW': 1.15,      // 15% surcharge
    };
    const tierMultiplier = customerTier ? (tierMultipliers[customerTier] || 1.0) : 1.0;
    const tierAdjustment = baseFee * (tierMultiplier - 1.0);
    
    // Payment method adjustments (some methods have different processing costs)
    const methodMultipliers: Record<string, number> = {
      'cashapp': 1.0,   // Standard
      'venmo': 1.0,     // Standard
      'paypal': 1.05,   // 5% surcharge (PayPal fees)
      'stripe': 1.03,   // 3% surcharge (Stripe fees)
      'card': 1.03,     // 3% surcharge
      'bank': 0.95,     // 5% discount (lower processing cost)
      'crypto': 0.90,   // 10% discount
    };
    const normalizedProvider = paymentProvider?.toLowerCase().replace(/[^a-z]/g, '') || '';
    const methodMultiplier = methodMultipliers[normalizedProvider] || 
                            (normalizedProvider.includes('cash') ? 1.0 :
                             normalizedProvider.includes('venmo') ? 1.0 :
                             normalizedProvider.includes('paypal') ? 1.05 :
                             normalizedProvider.includes('stripe') ? 1.03 :
                             normalizedProvider.includes('card') ? 1.03 :
                             normalizedProvider.includes('bank') ? 0.95 :
                             normalizedProvider.includes('crypto') ? 0.90 : 1.0);
    const methodAdjustment = baseFee * (methodMultiplier - 1.0);
    
    // Calculate final house fee
    const houseFee = Math.max(0, baseFee + tierAdjustment + methodAdjustment);
    const netAmount = Math.max(0, amount - houseFee);
    
    return {
      houseFee,
      netAmount,
      feeBreakdown: {
        baseFee,
        tierAdjustment,
        methodAdjustment,
      },
    };
  }

  createPayment(payment: {
    type: string;
    direction: 'incoming' | 'outgoing';
    status?: string;
    amount: number;
    currency?: string;
    customerId?: string;
    barberId?: string;
    fromEntity?: string;
    toEntity?: string;
    provider?: string;
    paymentId?: string;
    description?: string;
    metadata?: string;
  }) {
    const id = payment.paymentId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const status = payment.status || 'pending';
    const currency = payment.currency || 'USD';
    
    // Calculate house fee if barber is specified and payment is incoming
    let houseFee = 0;
    let netAmount = payment.amount;
    let commissionRate = null;
    let feeBreakdown = null;
    let customerTier: string | null = null;
    
    if (payment.barberId && payment.direction === 'incoming') {
      // Get barber commission rate
      const barber = this.query('SELECT commissionRate FROM barbers WHERE id = ?', payment.barberId)[0] as { commissionRate?: number } | undefined;
      commissionRate = barber?.commissionRate ?? null;
      
      // Get customer tier if customerId is provided
      if (payment.customerId) {
        const customer = this.query('SELECT tier FROM customers WHERE id = ?', payment.customerId)[0] as { tier?: string } | undefined;
        customerTier = customer?.tier || null;
      }
      
      // Calculate fees with tier and method adjustments
      const feeCalc = this.calculateHouseFee(
        payment.amount,
        commissionRate,
        customerTier,
        payment.provider || null
      );
      
      houseFee = feeCalc.houseFee;
      netAmount = feeCalc.netAmount;
      feeBreakdown = feeCalc.feeBreakdown;
    }
    
    // Store fee breakdown in metadata
    let metadata: Record<string, any> = {};
    if (payment.metadata) {
      if (typeof payment.metadata === 'string') {
        try {
          metadata = JSON.parse(payment.metadata);
        } catch (e) {
          metadata = {};
        }
      } else {
        metadata = payment.metadata as Record<string, any>;
      }
    }
    if (feeBreakdown) {
      metadata.feeBreakdown = feeBreakdown;
      metadata.customerTier = customerTier;
      metadata.paymentMethod = payment.provider;
    }
    
    this.exec(`
      INSERT INTO payments (id, type, direction, status, amount, houseFee, netAmount, commissionRate, currency, customerId, barberId, fromEntity, toEntity, provider, paymentId, description, metadata, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, id, payment.type, payment.direction, status, payment.amount, houseFee, netAmount, commissionRate, currency,
       payment.customerId || null, payment.barberId || null,
       payment.fromEntity || null, payment.toEntity || null,
       payment.provider || null, payment.paymentId || id,
       payment.description || null, JSON.stringify(metadata));
    
    return this.query('SELECT * FROM payments WHERE id = ?', id)[0];
  }
  
  getPaymentStats(barberId?: string) {
    let pending, incoming, outgoing, completed, houseFees;
    
    if (barberId) {
      pending = this.query('SELECT COUNT(*) as count, SUM(amount) as total, SUM(netAmount) as netTotal FROM payments WHERE status = ? AND barberId = ?', 'pending', barberId)[0] as { count: number; total: number | null; netTotal: number | null };
      incoming = this.query('SELECT COUNT(*) as count, SUM(amount) as total, SUM(netAmount) as netTotal FROM payments WHERE direction = ? AND status = ? AND barberId = ?', 'incoming', 'pending', barberId)[0] as { count: number; total: number | null; netTotal: number | null };
      outgoing = this.query('SELECT COUNT(*) as count, SUM(amount) as total FROM payments WHERE direction = ? AND status = ? AND barberId = ?', 'outgoing', 'pending', barberId)[0] as { count: number; total: number | null };
      completed = this.query('SELECT COUNT(*) as count, SUM(amount) as total, SUM(netAmount) as netTotal FROM payments WHERE status = ? AND barberId = ?', 'completed', barberId)[0] as { count: number; total: number | null; netTotal: number | null };
      houseFees = this.query('SELECT SUM(houseFee) as total FROM payments WHERE barberId = ?', barberId)[0] as { total: number | null };
    } else {
      pending = this.query('SELECT COUNT(*) as count, SUM(amount) as total, SUM(netAmount) as netTotal FROM payments WHERE status = ?', 'pending')[0] as { count: number; total: number | null; netTotal: number | null };
      incoming = this.query('SELECT COUNT(*) as count, SUM(amount) as total, SUM(netAmount) as netTotal FROM payments WHERE direction = ? AND status = ?', 'incoming', 'pending')[0] as { count: number; total: number | null; netTotal: number | null };
      outgoing = this.query('SELECT COUNT(*) as count, SUM(amount) as total FROM payments WHERE direction = ? AND status = ?', 'outgoing', 'pending')[0] as { count: number; total: number | null };
      completed = this.query('SELECT COUNT(*) as count, SUM(amount) as total, SUM(netAmount) as netTotal FROM payments WHERE status = ?', 'completed')[0] as { count: number; total: number | null; netTotal: number | null };
      houseFees = this.query('SELECT SUM(houseFee) as total FROM payments')[0] as { total: number | null };
    }
    
    return {
      pending: { count: pending.count || 0, total: pending.total || 0, netTotal: pending.netTotal || 0 },
      incoming: { count: incoming.count || 0, total: incoming.total || 0, netTotal: incoming.netTotal || 0 },
      outgoing: { count: outgoing.count || 0, total: outgoing.total || 0 },
      completed: { count: completed.count || 0, total: completed.total || 0, netTotal: completed.netTotal || 0 },
      houseFees: houseFees.total || 0,
    };
  }
  
  getCustomers(limit?: number) {
    let sql = 'SELECT * FROM customers ORDER BY totalSpent DESC';
    if (limit) {
      sql += ' LIMIT ?';
      return this.query(sql, limit);
    }
    return this.query(sql);
  }
  
  getCustomerPayments(customerId: string) {
    return this.query('SELECT * FROM payments WHERE customerId = ? ORDER BY createdAt DESC', customerId);
  }
  
  getCustomersWithPayments() {
    return this.query(`
      SELECT 
        c.*,
        COUNT(p.id) as paymentCount,
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as pendingAmount
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customerId
      GROUP BY c.id
      ORDER BY c.totalSpent DESC
    `);
  }
  
  getBarbers() {
    return this.query('SELECT * FROM barbers ORDER BY name');
  }
  
  getBarberPaymentInfo(barberId: string, baseUrl: string, deeplinkScheme: string, universalDomain: string) {
    const barbers = this.query('SELECT id, name, code, cashapp, venmo, paypal, phone, email, qrCodeUrl FROM barbers WHERE id = ?', barberId);
    if (barbers.length === 0) return null;
    
    const barber = barbers[0] as any;
    // Generate URLs if not set
    if (!barber.qrCodeUrl) {
      barber.qrCodeUrl = `${baseUrl}/pay/${barberId}`;
    }
    
    // Generate deeplink URLs
    barber.deeplinkUrl = `${deeplinkScheme}://pay/${barberId}`;
    barber.universalLink = `https://${universalDomain}/pay/${barberId}`;
    barber.webUrl = `${baseUrl}/pay/${barberId}`;
    
    return barber;
  }
  
  saveBarberPaymentInfo(barberId: string, paymentInfo: {
    cashapp?: string;
    venmo?: string;
    paypal?: string;
    phone?: string;
    email?: string;
  }, baseUrl: string, deeplinkScheme: string, universalDomain: string) {
    const qrCodeUrl = `${baseUrl}/pay/${barberId}`;
    
    this.exec(`
      UPDATE barbers 
      SET cashapp = ?, venmo = ?, paypal = ?, phone = ?, email = ?, qrCodeUrl = ?, updatedAt = datetime('now')
      WHERE id = ?
    `, paymentInfo.cashapp || null, paymentInfo.venmo || null, paymentInfo.paypal || null,
       paymentInfo.phone || null, paymentInfo.email || null, qrCodeUrl, barberId);
    
    return this.getBarberPaymentInfo(barberId, baseUrl, deeplinkScheme, universalDomain);
  }
  
  /**
   * Hash sensitive data for privacy-safe tracking
   */
  private hashSensitive(value: string): string {
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(value.toLowerCase().trim());
    return hasher.digest('hex').substring(0, 16); // First 16 chars for shorter hashes
  }
  
  recordTemplateEvent(eventType: string, barberId: string, data: Record<string, unknown>, ip?: string) {
    const eventData = {
      barberId,
      ...data,
      timestamp: Date.now(),
    };
    
    this.exec(`
      INSERT INTO telemetry_elite (eventType, data, ip, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `, eventType, JSON.stringify(eventData), ip || null);
  }
  
  /**
   * Record event with entity tracking (email, phone, payment, location, customer, barber)
   */
  recordEntityEvent(
    eventType: string,
    entities: {
      email?: string;
      phone?: string;
      paymentId?: string;
      location?: string;
      customerId?: string;
      barberId?: string;
      zipcode?: string;
      geocode?: string;
    },
    data: Record<string, unknown> = {},
    ip?: string
  ) {
    const eventData: Record<string, unknown> = {
      ...data,
      timestamp: Date.now(),
    };
    
    // Add entity identifiers (hashed for privacy)
    if (entities.email) {
      eventData.emailHash = this.hashSensitive(entities.email);
      eventData.emailDomain = entities.email.split('@')[1]?.toLowerCase();
    }
    if (entities.phone) {
      eventData.phoneHash = this.hashSensitive(entities.phone.replace(/\D/g, '')); // Remove non-digits
      eventData.phoneArea = entities.phone.replace(/\D/g, '').substring(0, 3); // Area code
    }
    if (entities.paymentId) {
      eventData.paymentId = entities.paymentId;
    }
    if (entities.location) {
      eventData.location = entities.location;
    }
    if (entities.zipcode) {
      eventData.zipcode = entities.zipcode;
    }
    if (entities.geocode) {
      eventData.geocode = entities.geocode;
    }
    if (entities.customerId) {
      eventData.customerId = entities.customerId;
    }
    if (entities.barberId) {
      eventData.barberId = entities.barberId;
    }
    
    this.exec(`
      INSERT INTO telemetry_elite (eventType, data, ip, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `, eventType, JSON.stringify(eventData), ip || null);
  }
  
  /**
   * Get events filtered by entity
   */
  getEventsByEntity(
    entityType: 'email' | 'phone' | 'payment' | 'location' | 'customer' | 'barber' | 'zipcode',
    entityValue: string,
    limit: number = 100
  ) {
    let jsonPath = '';
    switch (entityType) {
      case 'email':
        jsonPath = '$.emailHash';
        entityValue = this.hashSensitive(entityValue);
        break;
      case 'phone':
        jsonPath = '$.phoneHash';
        entityValue = this.hashSensitive(entityValue.replace(/\D/g, ''));
        break;
      case 'payment':
        jsonPath = '$.paymentId';
        break;
      case 'location':
        jsonPath = '$.location';
        break;
      case 'customer':
        jsonPath = '$.customerId';
        break;
      case 'barber':
        jsonPath = '$.barberId';
        break;
      case 'zipcode':
        jsonPath = '$.zipcode';
        break;
    }
    
    return this.query(`
      SELECT * FROM telemetry_elite 
      WHERE json_extract(data, ?) = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, jsonPath, entityValue, limit);
  }
  
  /**
   * Get entity analytics - aggregate stats per entity
   */
  getEntityAnalytics(
    entityType: 'email' | 'phone' | 'payment' | 'location' | 'customer' | 'barber' | 'zipcode',
    limit: number = 50
  ) {
    let jsonPath = '';
    let groupBy = '';
    switch (entityType) {
      case 'email':
        jsonPath = '$.emailHash';
        groupBy = 'json_extract(data, "$.emailDomain")';
        break;
      case 'phone':
        jsonPath = '$.phoneHash';
        groupBy = 'json_extract(data, "$.phoneArea")';
        break;
      case 'payment':
        jsonPath = '$.paymentId';
        groupBy = 'json_extract(data, "$.paymentId")';
        break;
      case 'location':
        jsonPath = '$.location';
        groupBy = 'json_extract(data, "$.location")';
        break;
      case 'customer':
        jsonPath = '$.customerId';
        groupBy = 'json_extract(data, "$.customerId")';
        break;
      case 'barber':
        jsonPath = '$.barberId';
        groupBy = 'json_extract(data, "$.barberId")';
        break;
      case 'zipcode':
        jsonPath = '$.zipcode';
        groupBy = 'json_extract(data, "$.zipcode")';
        break;
    }
    
    return this.query(`
      SELECT 
        ${groupBy} as entityValue,
        COUNT(*) as eventCount,
        COUNT(DISTINCT eventType) as eventTypes,
        MIN(timestamp) as firstSeen,
        MAX(timestamp) as lastSeen,
        COUNT(DISTINCT ip) as uniqueIPs
      FROM telemetry_elite
      WHERE json_extract(data, ?) IS NOT NULL
        AND ${groupBy} IS NOT NULL
      GROUP BY ${groupBy}
      ORDER BY eventCount DESC
      LIMIT ?
    `, jsonPath, limit);
  }
  
  /**
   * Get cross-entity relationships (e.g., customer-barber interactions)
   */
  getEntityRelationships(
    entity1Type: 'email' | 'phone' | 'customer' | 'barber',
    entity2Type: 'email' | 'phone' | 'customer' | 'barber' | 'location' | 'payment',
    limit: number = 100
  ) {
    const path1Map: Record<string, string> = {
      email: '$.emailHash',
      phone: '$.phoneHash',
      customer: '$.customerId',
      barber: '$.barberId',
    };
    
    const path2Map: Record<string, string> = {
      ...path1Map,
      location: '$.location',
      payment: '$.paymentId',
    };
    
    const path1 = path1Map[entity1Type];
    const path2 = path2Map[entity2Type];
    
    return this.query(`
      SELECT 
        json_extract(data, ?) as entity1,
        json_extract(data, ?) as entity2,
        COUNT(*) as interactionCount,
        GROUP_CONCAT(DISTINCT eventType) as eventTypes,
        MIN(timestamp) as firstInteraction,
        MAX(timestamp) as lastInteraction
      FROM telemetry_elite
      WHERE json_extract(data, ?) IS NOT NULL 
        AND json_extract(data, ?) IS NOT NULL
      GROUP BY entity1, entity2
      ORDER BY interactionCount DESC
      LIMIT ?
    `, path1, path2, path1, path2, limit);
  }
  
  getTemplateTelemetry(barberId?: string, limit: number = 100) {
    let sql = 'SELECT * FROM telemetry_elite WHERE eventType LIKE ? ORDER BY timestamp DESC LIMIT ?';
    const params: unknown[] = ['template_%', limit];
    
    if (barberId) {
      sql = 'SELECT * FROM telemetry_elite WHERE eventType LIKE ? AND json_extract(data, "$.barberId") = ? ORDER BY timestamp DESC LIMIT ?';
      params.splice(1, 0, barberId);
    }
    
    return this.query(sql, ...params);
  }
  
  getTemplateStats(barberId?: string) {
    let sql = `
      SELECT 
        eventType,
        COUNT(*) as count,
        MAX(timestamp) as lastEvent
      FROM telemetry_elite 
      WHERE eventType LIKE 'template_%'
    `;
    const params: unknown[] = [];
    
    if (barberId) {
      sql += ' AND json_extract(data, "$.barberId") = ?';
      params.push(barberId);
    }
    
    sql += ' GROUP BY eventType ORDER BY count DESC';
    
    return this.query(sql, ...params);
  }
  
  /**
   * Calculate percentiles for template telemetry events
   * Extracts timing data from events and calculates p50, p95, p99
   */
  getTemplatePercentiles(barberId?: string, eventType?: string) {
    let sql = `
      SELECT eventType, data, timestamp
      FROM telemetry_elite 
      WHERE eventType LIKE 'template_%'
    `;
    const params: (string | number)[] = [];
    
    if (barberId) {
      sql += ' AND json_extract(data, "$.barberId") = ?';
      params.push(barberId);
    }
    
    if (eventType) {
      sql += ' AND eventType = ?';
      params.push(eventType);
    }
    
    sql += ' ORDER BY timestamp DESC';
    
    const events = this.query<{ eventType: string; data: string; timestamp: string }>(sql, ...params);
    
    // Group events by type and extract timing data
    const eventGroups = new Map<string, number[]>();
    
    for (const event of events) {
      let eventData: Record<string, unknown>;
      try {
        eventData = typeof event.data === 'string' ? JSON.parse(event.data) : (event.data as Record<string, unknown>);
      } catch {
        continue;
      }
      
      const timingFields = ['generationTime', 'duration', 'saveTime', 'loadTime', 'renderTime'];
      
      for (const field of timingFields) {
        const dataObj = eventData.data as Record<string, unknown> | undefined;
        if (dataObj && typeof dataObj[field] === 'number') {
          const time = dataObj[field] as number;
          if (!eventGroups.has(event.eventType)) {
            eventGroups.set(event.eventType, []);
          }
          eventGroups.get(event.eventType)!.push(time);
        }
      }
    }
    
    // Calculate percentiles for each event type
    const percentiles: Record<string, { p50: number; p95: number; p99: number; count: number; min: number; max: number; avg: number }> = {};
    
    for (const [eventType, times] of eventGroups) {
      if (times.length === 0) continue;
      
      const sorted = [...times].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      const p50 = sorted[Math.floor(count * 0.5)] || 0;
      const p95 = sorted[Math.floor(count * 0.95)] || 0;
      const p99 = sorted[Math.floor(count * 0.99)] || 0;
      const min = sorted[0] || 0;
      const max = sorted[count - 1] || 0;
      const avg = sum / count;
      
      percentiles[eventType] = { p50, p95, p99, count, min, max, avg };
    }
    
    return percentiles;
  }
  
  /**
   * Get comprehensive template analytics including stats and percentiles
   */
  getTemplateAnalytics(barberId?: string) {
    const stats = this.getTemplateStats(barberId) as Array<{ eventType: string; count: number; lastEvent: string }>;
    const percentiles = this.getTemplatePercentiles(barberId);
    
    // Calculate overall metrics
    const totalEvents = stats.reduce((sum, stat) => sum + (stat.count || 0), 0);
    const eventTypes = stats.length;
    const mostCommonEvent = stats[0]?.eventType || null;
    
    // Calculate success rates
    const successEvents = stats.filter(s => 
      !s.eventType.includes('error') && !s.eventType.includes('fail')
    ).reduce((sum, s) => sum + (s.count || 0), 0);
    const errorEvents = stats.filter(s => 
      s.eventType.includes('error') || s.eventType.includes('fail')
    ).reduce((sum, s) => sum + (s.count || 0), 0);
    const successRate = totalEvents > 0 ? (successEvents / totalEvents) * 100 : 0;
    
    return {
      summary: {
        totalEvents,
        eventTypes,
        mostCommonEvent,
        successRate: Math.round(successRate * 100) / 100,
        successEvents,
        errorEvents,
      },
      stats,
      percentiles,
    };
  }
}

const eliteDb = new EliteDatabase();

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE HTML DASHBOARD TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// Generate payment options page (fallback when no auto-redirect)
function generatePaymentOptionsPage(barber: any, amount: string | null): string {
  const amountParam = amount ? `?amount=${amount}` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pay ${barber.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .barber-name {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .payment-method {
      display: block;
      width: 100%;
      padding: 16px;
      margin-bottom: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      text-decoration: none;
      color: #333;
      font-weight: 500;
      transition: all 0.2s;
      text-align: center;
    }
    .payment-method:hover {
      border-color: #667eea;
      background: #f5f5ff;
    }
    .payment-method.cashapp { border-color: #00d632; }
    .payment-method.venmo { border-color: #1e88e5; }
    .payment-method.paypal { border-color: #0070ba; }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pay ${barber.name}</h1>
    <p class="barber-name">${barber.code || barber.id}</p>
    ${amount ? `<div class="amount">$${parseFloat(amount).toFixed(2)}</div>` : ''}
    <div>
      ${barber.cashapp ? `<a href="https://cash.app/${barber.cashapp.replace('$', '')}${amountParam}" class="payment-method cashapp">💚 Pay with CashApp</a>` : ''}
      ${barber.venmo ? `<a href="https://venmo.com/${barber.venmo.replace('@', '')}${amountParam}" class="payment-method venmo">💙 Pay with Venmo</a>` : ''}
      ${barber.paypal ? `<a href="https://paypal.me/${barber.paypal}${amount ? `/${amount}` : ''}" class="payment-method paypal">🅿️ Pay with PayPal</a>` : ''}
    </div>
  </div>
</body>
</html>`;
}


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
    .payment-item {
      background: #16161f;
      border-left: 3px solid var(--primary);
      padding: 10px;
      margin: 8px 0;
      border-radius: 4px;
      font-size: 11px;
    }
    .payment-item.incoming { border-left-color: var(--primary); }
    .payment-item.outgoing { border-left-color: var(--secondary); }
    .payment-item.pending { border-left-color: var(--warning); }
    .payment-amount {
      color: var(--primary);
      font-weight: bold;
      font-size: 14px;
    }
    .payment-meta {
      color: #666;
      font-size: 10px;
      margin-top: 4px;
    }
    .customer-card {
      background: #16161f;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin: 8px 0;
    }
    .customer-card.vip { border-left: 3px solid #ffd700; }
    .customer-card.regular { border-left: 3px solid var(--primary); }
    .customer-card.casual { border-left: 3px solid var(--warning); }
    .customer-card.new { border-left: 3px solid var(--secondary); }
    .customer-name {
      font-weight: bold;
      color: #fff;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .customer-info {
      color: #888;
      font-size: 10px;
      margin: 2px 0;
    }
    .customer-payment-apps {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--border);
      font-size: 9px;
      color: #666;
    }
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
    <div style="display:flex;align-items:center;gap:15px;">
      <a href="/elite/tracking/dashboard" style="color:var(--secondary);text-decoration:none;font-size:12px;padding:6px 12px;border:1px solid var(--border);border-radius:4px;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--secondary)';this.style.background='rgba(0,212,255,0.1)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
        📊 Entity Tracking
      </a>
      <div style="text-align:right;">
        <div id="clock" style="color:var(--secondary);font-size:14px;"></div>
        <div style="color:#666;font-size:10px;">UTC</div>
      </div>
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
    <div class="metric-card">
      <div class="metric-label">Pending Payments</div>
      <div class="metric-value" id="pendingPayments" style="color:var(--warning);">0</div>
      <div class="metric-delta" id="pendingAmount">$0.00</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Incoming</div>
      <div class="metric-value" id="incomingPayments" style="color:var(--primary);">0</div>
      <div class="metric-delta" id="incomingAmount">$0.00</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Outgoing</div>
      <div class="metric-value" id="outgoingPayments" style="color:var(--secondary);">0</div>
      <div class="metric-delta" id="outgoingAmount">$0.00</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">House Fees</div>
      <div class="metric-value" id="houseFees" style="color:var(--warning);">$0.00</div>
      <div class="metric-delta">Total collected</div>
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
        <span class="panel-title">👥 Customers</span>
        <span style="color:var(--primary);font-size:10px;" id="customerCount">0</span>
      </div>
      <div class="panel-body" id="customerList" style="max-height:400px;overflow-y:auto;">
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

    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">💰 Pending Payments</span>
        <span style="color:var(--warning);font-size:10px;" id="pendingCount">0</span>
      </div>
      <div class="panel-body" id="pendingPaymentsList">
        <div style="color:#666;text-align:center;padding:20px;">No pending payments</div>
      </div>
    </div>

    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">📥 Incoming Payments</span>
        <span style="color:var(--primary);font-size:10px;" id="incomingCount">0</span>
      </div>
      <div class="panel-body" id="incomingPaymentsList">
        <div style="color:#666;text-align:center;padding:20px;">No incoming payments</div>
      </div>
    </div>

    <div class="panel col-span-2">
      <div class="panel-header">
        <span class="panel-title">📤 Outgoing Payments</span>
        <span style="color:var(--secondary);font-size:10px;" id="outgoingCount">0</span>
      </div>
      <div class="panel-body" id="outgoingPaymentsList">
        <div style="color:#666;text-align:center;padding:20px;">No outgoing payments</div>
      </div>
    </div>

    <div class="panel col-span-2">
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
        } else if (data.type === 'payments') {
          updatePayments(data.payments);
        }
      }
    }
    
    const ws = new EliteWebSocket('wss://' + location.host + '/elite/ws');
    
    async function loadPayments() {
      try {
        const [statsRes, pendingRes, incomingRes, outgoingRes] = await Promise.all([
          fetch('/elite/payments/stats'),
          fetch('/elite/payments?status=pending&limit=10'),
          fetch('/elite/payments?direction=incoming&status=pending&limit=10'),
          fetch('/elite/payments?direction=outgoing&status=pending&limit=10')
        ]);
        
        const stats = await statsRes.json();
        const pending = await pendingRes.json();
        const incoming = await incomingRes.json();
        const outgoing = await outgoingRes.json();
        
        // Update metrics
        document.getElementById('pendingPayments').textContent = stats.pending.count;
        document.getElementById('pendingAmount').textContent = '$' + (stats.pending.netTotal || stats.pending.total || 0).toFixed(2) + ' net';
        document.getElementById('incomingPayments').textContent = stats.incoming.count;
        document.getElementById('incomingAmount').textContent = '$' + (stats.incoming.netTotal || stats.incoming.total || 0).toFixed(2) + ' net';
        document.getElementById('outgoingPayments').textContent = stats.outgoing.count;
        document.getElementById('outgoingAmount').textContent = '$' + (stats.outgoing.total || 0).toFixed(2);
        
        // Update house fees if element exists
        const houseFeesEl = document.getElementById('houseFees');
        if (houseFeesEl) {
          houseFeesEl.textContent = '$' + (stats.houseFees || 0).toFixed(2);
        }
        
        // Update lists
        updatePaymentList('pendingPaymentsList', pending.payments || [], 'pending');
        updatePaymentList('incomingPaymentsList', incoming.payments || [], 'incoming');
        updatePaymentList('outgoingPaymentsList', outgoing.payments || [], 'outgoing');
        
        document.getElementById('pendingCount').textContent = stats.pending.count + ' pending';
        document.getElementById('incomingCount').textContent = stats.incoming.count + ' incoming';
        document.getElementById('outgoingCount').textContent = stats.outgoing.count + ' outgoing';
      } catch (err) {
        console.error('Failed to load payments:', err);
      }
    }
    
    async function loadBarbers() {
      try {
        const res = await fetch('/elite/barbers');
        const data = await res.json();
        const barbers = data.barbers || [];
        
        const container = document.getElementById('barberList');
        if (!barbers || barbers.length === 0) {
          container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No barbers</div>';
          return;
        }
        
        container.innerHTML = barbers.map(b => {
          const statusClass = b.status === 'active' ? 'active' : b.status === 'busy' ? 'busy' : 'offline';
          const statusEmoji = b.status === 'active' ? '🟢' : b.status === 'busy' ? '🟡' : '⚪';
          const skills = b.skills ? b.skills.split(',').map(s => s.trim()).join(', ') : 'N/A';
          
          return \`
            <div class="barber-card \${statusClass}">
              <div>
                <div style="font-weight:bold;color:#fff;">\${statusEmoji} \${b.name} (\${b.code || b.id})</div>
                <div style="color:#666;font-size:10px;margin-top:4px;">Skills: \${skills}</div>
                <div style="color:#888;font-size:9px;margin-top:2px;">Commission: \${((b.commissionRate || 0) * 100).toFixed(0)}%</div>
                \${b.shop ? \`<div style="color:#888;font-size:9px;margin-top:2px;">🏪 \${b.shop}</div>\` : ''}
                \${b.location ? \`<div style="color:#666;font-size:9px;margin-top:1px;">📍 \${b.location}</div>\` : ''}
                \${b.zipcode ? \`<div style="color:#666;font-size:9px;margin-top:1px;">🗺️ Zip: \${b.zipcode}\${b.geocode ? ' | ' + b.geocode : ''}</div>\` : ''}
              </div>
              <span class="status-badge \${statusClass}">\${(b.status || 'offline').toUpperCase()}</span>
            </div>
          \`;
        }).join('');
      } catch (err) {
        console.error('Failed to load barbers:', err);
      }
    }
    
    async function loadCustomers() {
      try {
        const res = await fetch('/elite/customers/with-payments');
        const data = await res.json();
        const customers = data.customers || [];
        
        document.getElementById('customerCount').textContent = customers.length + ' customers';
        
        const container = document.getElementById('customerList');
        if (!customers || customers.length === 0) {
          container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No customers</div>';
          return;
        }
        
        const tierEmoji = { VIP: '⭐', REGULAR: '🔵', CASUAL: '🟡', NEW: '🆕' };
        const tierClass = { VIP: 'vip', REGULAR: 'regular', CASUAL: 'casual', NEW: 'new' };
        
        container.innerHTML = customers.map(c => {
          const apps = [];
          if (c.cashapp) apps.push(\`CashApp: \${c.cashapp}\`);
          if (c.venmo) apps.push(\`Venmo: \${c.venmo}\`);
          if (c.paypal) apps.push(\`PayPal: \${c.paypal}\`);
          
          return \`
            <div class="customer-card \${tierClass[c.tier] || 'regular'}">
              <div class="customer-name">
                \${tierEmoji[c.tier] || '👤'} \${c.name} (\${c.id})
              </div>
              <div class="customer-info">
                📧 \${c.email || 'N/A'} | 📱 \${c.phone || 'N/A'}
              </div>
              <div class="customer-info">
                Tier: \${c.tier} | Visits: \${c.visits} | Total: $\${c.totalSpent.toFixed(2)}
              </div>
              \${c.preferredBarber ? \`<div class="customer-info">Preferred Barber: \${c.preferredBarber}</div>\` : ''}
              \${c.homeShop ? \`<div class="customer-info">🏪 Home Shop: \${c.homeShop}</div>\` : ''}
              \${c.address ? \`<div class="customer-info">📍 \${c.address}</div>\` : ''}
              \${c.zipcode ? \`<div class="customer-info">🗺️ Zip: \${c.zipcode}\${c.geocode ? ' | ' + c.geocode : ''}</div>\` : ''}
              \${apps.length > 0 ? \`<div class="customer-payment-apps">💳 \${apps.join(' | ')}</div>\` : ''}
            </div>
          \`;
        }).join('');
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    }
    
    function updatePaymentList(containerId, payments, type) {
      const container = document.getElementById(containerId);
      if (!payments || payments.length === 0) {
        container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No ' + type + ' payments</div>';
        return;
      }
      
      container.innerHTML = payments.map(p => {
        const customerInfo = p.customerName ? \`<div style="color:#888;font-size:9px;margin-top:2px;">👤 \${p.customerName}\${p.customerTier ? ' (' + p.customerTier + ')' : ''}</div>\` : '';
        const barberInfo = p.barberName ? \`<div style="color:#888;font-size:9px;margin-top:2px;">✂️ \${p.barberName}\${p.barberCode ? ' (' + p.barberCode + ')' : ''}</div>\` : '';
        
        // Parse fee breakdown from metadata if available
        let feeBreakdown = null;
        try {
          const metadata = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
          feeBreakdown = metadata.feeBreakdown;
        } catch (e) {}
        
        const feeInfo = p.houseFee && p.houseFee > 0 ? \`
          <div style="color:#ff6600;font-size:9px;margin-top:2px;">
            🏠 House Fee: $\${p.houseFee.toFixed(2)} | Net: $\${(p.netAmount || p.amount).toFixed(2)}
            \${feeBreakdown ? \`<div style="color:#999;font-size:8px;margin-top:1px;padding-left:8px;">
              Base: $\${feeBreakdown.baseFee?.toFixed(2) || '0.00'} | 
              Tier: \${feeBreakdown.tierAdjustment >= 0 ? '+' : ''}\$\${feeBreakdown.tierAdjustment?.toFixed(2) || '0.00'} | 
              Method: \${feeBreakdown.methodAdjustment >= 0 ? '+' : ''}\$\${feeBreakdown.methodAdjustment?.toFixed(2) || '0.00'}
            </div>\` : ''}
          </div>
        \` : '';
        const netAmountDisplay = p.houseFee && p.houseFee > 0 ? \` <span style="color:#888;font-size:12px;">→ $\${(p.netAmount || p.amount).toFixed(2)}</span>\` : '';
        return \`
        <div class="payment-item \${type}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div class="payment-amount">$\${p.amount.toFixed(2)}\${netAmountDisplay}</div>
              <div class="payment-meta">
                \${p.description || p.type || 'Payment'} | \${p.provider || 'N/A'} | \${new Date(p.createdAt).toLocaleString()}
              </div>
              \${customerInfo}
              \${barberInfo}
              \${feeInfo}
            </div>
            <span class="status-badge \${p.status}">\${p.status.toUpperCase()}</span>
          </div>
        </div>
      \`;
      }).join('');
    }
    
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
    
    // Load payments, customers, and barbers on page load and refresh every 5 seconds
    loadPayments();
    loadCustomers();
    loadBarbers();
    setInterval(() => {
      loadPayments();
      loadCustomers();
      loadBarbers();
    }, 5000);
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
      
      // Entity Tracking Dashboard
      if (path === '/elite/tracking/dashboard') {
        return new Response(generateEntityTrackingDashboard(), {
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
      
      // Payment endpoints
      if (path === '/elite/payments') {
        const url = new URL(req.url);
        const status = url.searchParams.get('status') || undefined;
        const direction = url.searchParams.get('direction') as 'incoming' | 'outgoing' | undefined;
        const barberId = url.searchParams.get('barberId') || undefined;
        const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 50;
        
        const payments = eliteDb.getPayments({ status, direction, barberId, limit });
        return Response.json({ payments });
      }
      
      if (path === '/elite/payments/stats') {
        const url = new URL(req.url);
        const barberId = url.searchParams.get('barberId') || undefined;
        const stats = eliteDb.getPaymentStats(barberId);
        return Response.json(stats);
      }
      
      // Customer endpoints
      if (path === '/elite/customers') {
        const url = new URL(req.url);
        const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined;
        const customers = eliteDb.getCustomers(limit);
        return Response.json({ customers });
      }
      
      if (path === '/elite/customers/with-payments') {
        const customers = eliteDb.getCustomersWithPayments();
        return Response.json({ customers });
      }
      
      // Barber endpoints
      if (path === '/elite/barbers') {
        const barbers = eliteDb.getBarbers();
        return Response.json({ barbers });
      }
      
      // Barber payment info endpoints
      const barberPaymentMatch = path.match(/^\/elite\/barber\/([^\/]+)\/payment-info$/);
      if (barberPaymentMatch) {
        const barberId = barberPaymentMatch[1];
        
        if (req.method === 'GET') {
          const paymentInfo = eliteDb.getBarberPaymentInfo(barberId, PUBLIC_BASE_URL, DEEPLINK_SCHEME, UNIVERSAL_LINK_DOMAIN);
          if (!paymentInfo) {
            return Response.json({ error: 'Barber not found' }, { status: 404 });
          }
          return Response.json({ paymentInfo });
        }
        
        if (req.method === 'POST') {
          try {
            const body = await req.json();
            const paymentInfo = eliteDb.saveBarberPaymentInfo(barberId, body, PUBLIC_BASE_URL, DEEPLINK_SCHEME, UNIVERSAL_LINK_DOMAIN);
            return Response.json({ success: true, paymentInfo });
          } catch (err) {
            return Response.json({ error: 'Failed to save payment info', details: String(err) }, { status: 400 });
          }
        }
      }
      
      // Barber QR template endpoint
      const barberTemplateMatch = path.match(/^\/elite\/barber\/([^\/]+)\/qr-template$/);
      if (barberTemplateMatch) {
        const barberId = barberTemplateMatch[1];
        const paymentInfo = eliteDb.getBarberPaymentInfo(barberId, PUBLIC_BASE_URL, DEEPLINK_SCHEME, UNIVERSAL_LINK_DOMAIN);
        if (!paymentInfo) {
          return Response.json({ error: 'Barber not found' }, { status: 404 });
        }
        return Response.json({ template: paymentInfo });
      }
      
      // Barber template page
      const barberTemplatePageMatch = path.match(/^\/elite\/barber\/([^\/]+)\/template$/);
      if (barberTemplatePageMatch) {
        const barberId = barberTemplatePageMatch[1];
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                        req.headers.get('x-real-ip') || 
                        'unknown';
        
        // Record template view
        eliteDb.recordTemplateEvent('template_view', barberId, {
          userAgent: req.headers.get('user-agent') || 'unknown',
        }, clientIp);
        
        return new Response(generateBarberTemplatePage(barberId), {
          headers: responseHeaders('text/html; charset=utf-8'),
        });
      }
      
      // Template telemetry endpoint
      if (path === '/elite/template/telemetry') {
        const url = new URL(req.url);
        const barberId = url.searchParams.get('barberId') || undefined;
        const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 100;
        const includePercentiles = url.searchParams.get('percentiles') !== 'false';
        const includeAnalytics = url.searchParams.get('analytics') === 'true';
        
        if (req.method === 'POST') {
          try {
            const body = await req.json();
            const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                            req.headers.get('x-real-ip') || 
                            'unknown';
            
            eliteDb.recordTemplateEvent(
              body.eventType || 'template_event',
              body.barberId || 'unknown',
              body.data || {},
              clientIp
            );
            
            return Response.json({ success: true });
          } catch (err) {
            return Response.json({ error: 'Failed to record telemetry', details: String(err) }, { status: 400 });
          }
        }
        
        // GET - return telemetry data
        const events = eliteDb.getTemplateTelemetry(barberId, limit);
        const stats = eliteDb.getTemplateStats(barberId);
        
        const response: Record<string, unknown> = { events, stats };
        
        if (includePercentiles) {
          response.percentiles = eliteDb.getTemplatePercentiles(barberId);
        }
        
        if (includeAnalytics) {
          response.analytics = eliteDb.getTemplateAnalytics(barberId);
        }
        
        return Response.json(response);
      }
      
      // Template analytics endpoint (full analytics with percentiles)
      if (path === '/elite/template/analytics') {
        const url = new URL(req.url);
        const barberId = url.searchParams.get('barberId') || undefined;
        
        const analytics = eliteDb.getTemplateAnalytics(barberId);
        
        return Response.json(analytics);
      }
      
      // Entity tracking endpoints
      if (path === '/elite/tracking/event') {
        if (req.method === 'POST') {
          try {
            const body = await req.json() as {
              eventType: string;
              entities: {
                email?: string;
                phone?: string;
                paymentId?: string;
                location?: string;
                customerId?: string;
                barberId?: string;
                zipcode?: string;
                geocode?: string;
              };
              data?: Record<string, unknown>;
            };
            
            const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                            req.headers.get('x-real-ip') || 
                            'unknown';
            
            eliteDb.recordEntityEvent(
              body.eventType,
              body.entities,
              body.data || {},
              clientIp
            );
            
            return Response.json({ success: true });
          } catch (err) {
            return Response.json({ error: 'Failed to record event', details: String(err) }, { status: 400 });
          }
        }
      }
      
      // Get events by entity
      const entityEventsMatch = path.match(/^\/elite\/tracking\/(email|phone|payment|location|customer|barber|zipcode)\/(.+)$/);
      if (entityEventsMatch) {
        const entityType = entityEventsMatch[1] as 'email' | 'phone' | 'payment' | 'location' | 'customer' | 'barber' | 'zipcode';
        const entityValue = decodeURIComponent(entityEventsMatch[2]);
        const url = new URL(req.url);
        const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 100;
        
        const events = eliteDb.getEventsByEntity(entityType, entityValue, limit);
        return Response.json({ events, entityType, entityValue });
      }
      
      // Get entity analytics
      const entityAnalyticsMatch = path.match(/^\/elite\/tracking\/(email|phone|payment|location|customer|barber|zipcode)\/analytics$/);
      if (entityAnalyticsMatch) {
        const entityType = entityAnalyticsMatch[1] as 'email' | 'phone' | 'payment' | 'location' | 'customer' | 'barber' | 'zipcode';
        const url = new URL(req.url);
        const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 50;
        
        const analytics = eliteDb.getEntityAnalytics(entityType, limit);
        return Response.json({ entityType, analytics });
      }
      
      // Get entity relationships
      if (path === '/elite/tracking/relationships') {
        const url = new URL(req.url);
        const entity1 = url.searchParams.get('entity1') as 'email' | 'phone' | 'customer' | 'barber' | null;
        const entity2 = url.searchParams.get('entity2') as 'email' | 'phone' | 'customer' | 'barber' | 'location' | 'payment' | null;
        const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 100;
        
        if (!entity1 || !entity2) {
          return Response.json({ error: 'Both entity1 and entity2 parameters required' }, { status: 400 });
        }
        
        const relationships = eliteDb.getEntityRelationships(entity1, entity2, limit);
        return Response.json({ entity1, entity2, relationships });
      }
      
      // Entity tracking dashboard
      if (path === '/elite/tracking/dashboard') {
        return new Response(generateEntityTrackingDashboard(), {
          headers: responseHeaders('text/html; charset=utf-8'),
        });
      }
      
      // Payment routing endpoint (deeplink handler)
      const paymentRouteMatch = path.match(/^\/pay\/([^\/]+)$/);
      if (paymentRouteMatch) {
        const barberId = paymentRouteMatch[1];
        const url = new URL(req.url);
        const amount = url.searchParams.get('amount');
        const method = url.searchParams.get('method'); // Preferred payment method
        const customerId = url.searchParams.get('customerId');
        const createPending = url.searchParams.get('create') !== 'false'; // Default: create pending payment
        
        const barber = eliteDb.getBarberPaymentInfo(barberId, PUBLIC_BASE_URL, DEEPLINK_SCHEME, UNIVERSAL_LINK_DOMAIN);
        if (!barber) {
          return Response.json({ error: 'Barber not found' }, { status: 404 });
        }
        
        // Create pending payment record if requested
        let paymentRecord = null;
        if (createPending && amount) {
          const paymentAmount = parseFloat(amount);
          if (!isNaN(paymentAmount) && paymentAmount > 0) {
            paymentRecord = eliteDb.createPayment({
              type: 'service',
              direction: 'incoming',
              status: 'pending',
              amount: paymentAmount,
              barberId: barberId,
              customerId: customerId || null,
              fromEntity: customerId ? `Customer ${customerId}` : 'Anonymous',
              toEntity: barber.name,
              provider: method || 'auto',
              description: `Payment to ${barber.name} via QR code`,
              metadata: {
                source: 'qr_code',
                deeplink: true,
                barberCode: barber.code,
              },
            });
          }
        }
        
        // Determine best payment method (backend routing logic)
        let selectedMethod = method || 'auto';
        let paymentUrl = '';
        
        if (selectedMethod === 'auto') {
          // Auto-select: prefer CashApp, then Venmo, then PayPal
          if (barber.cashapp) {
            selectedMethod = 'cashapp';
            paymentUrl = `https://cash.app/${barber.cashapp.replace('$', '')}${amount ? `?amount=${amount}` : ''}`;
          } else if (barber.venmo) {
            selectedMethod = 'venmo';
            paymentUrl = `https://venmo.com/${barber.venmo.replace('@', '')}${amount ? `?amount=${amount}` : ''}`;
          } else if (barber.paypal) {
            selectedMethod = 'paypal';
            paymentUrl = `https://paypal.me/${barber.paypal}${amount ? `/${amount}` : ''}`;
          }
        } else {
          // Use specified method
          if (selectedMethod === 'cashapp' && barber.cashapp) {
            paymentUrl = `https://cash.app/${barber.cashapp.replace('$', '')}${amount ? `?amount=${amount}` : ''}`;
          } else if (selectedMethod === 'venmo' && barber.venmo) {
            paymentUrl = `https://venmo.com/${barber.venmo.replace('@', '')}${amount ? `?amount=${amount}` : ''}`;
          } else if (selectedMethod === 'paypal' && barber.paypal) {
            paymentUrl = `https://paypal.me/${barber.paypal}${amount ? `/${amount}` : ''}`;
          }
        }
        
        // Return payment options or redirect
        const acceptHeader = req.headers.get('accept') || '';
        if (acceptHeader.includes('application/json') || url.searchParams.get('format') === 'json') {
          return Response.json({
            barberId,
            barberName: barber.name,
            selectedMethod,
            paymentUrl,
            paymentRecord: paymentRecord ? {
              id: paymentRecord.id,
              status: paymentRecord.status,
              amount: paymentRecord.amount,
            } : null,
            availableMethods: {
              cashapp: barber.cashapp || null,
              venmo: barber.venmo || null,
              paypal: barber.paypal || null,
            },
            amount: amount ? parseFloat(amount) : null,
          });
        }
        
        // HTML response with payment options
        if (paymentUrl) {
          return Response.redirect(paymentUrl, 302);
        }
        
        // Fallback: show payment options page
        return new Response(generatePaymentOptionsPage(barber, amount), {
          headers: responseHeaders('text/html; charset=utf-8'),
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
      } catch (err) {
        // Binary or invalid message
      }
    },
    
    close(ws) {
      wsManager.removeClient((ws.data as any).id);
    },
  },
});

// Seed sample barbers
function seedSampleBarbers() {
  const barbers = [
    { 
      id: 'barber_jb', 
      name: 'John Barber', 
      code: 'JB', 
      skills: 'Haircut, Beard Trim, Hot Towel Shave', 
      commissionRate: 0.60, 
      status: 'active', 
      shop: 'Fresh Cuts Downtown', 
      location: '123 Main St, New York, NY', 
      zipcode: '10001', 
      geocode: '40.7128,-74.0060',
      cashapp: '$JohnBarberFresh',
      venmo: '@JohnBarber-Fresh',
      paypal: 'john.barber@freshcuts.com',
      phone: '555-1001',
      email: 'john@freshcuts.com'
    },
    { 
      id: 'barber_ms', 
      name: 'Mike Styles', 
      code: 'MS', 
      skills: 'Haircut, Fade, Design', 
      commissionRate: 0.55, 
      status: 'active', 
      shop: 'Fresh Cuts Brooklyn', 
      location: '456 Atlantic Ave, Brooklyn, NY', 
      zipcode: '11217', 
      geocode: '40.6782,-73.9442',
      cashapp: '$MikeStylesCuts',
      venmo: '@MikeStyles-Cuts',
      paypal: 'mike.styles@freshcuts.com',
      phone: '555-1002',
      email: 'mike@freshcuts.com'
    },
    { 
      id: 'barber_ck', 
      name: 'Chris Kutz', 
      code: 'CK', 
      skills: 'Beard Trim, Hot Towel Shave', 
      commissionRate: 0.50, 
      status: 'off_duty', 
      shop: 'Fresh Cuts Downtown', 
      location: '123 Main St, New York, NY', 
      zipcode: '10001', 
      geocode: '40.7128,-74.0060',
      cashapp: '$ChrisKutz',
      venmo: '@ChrisKutz-Barber',
      paypal: 'chris.kutz@freshcuts.com',
      phone: '555-1003',
      email: 'chris@freshcuts.com'
    },
    { 
      id: 'barber_om', 
      name: 'Omar Razor', 
      code: 'OM', 
      skills: 'Hot Towel Shave, Beard Trim', 
      commissionRate: 0.58, 
      status: 'active', 
      shop: 'Fresh Cuts Queens', 
      location: '789 Queens Blvd, Queens, NY', 
      zipcode: '11375', 
      geocode: '40.7282,-73.7949',
      cashapp: '$OmarRazorSharp',
      venmo: '@OmarRazor-Barber',
      paypal: 'omar.razor@freshcuts.com',
      phone: '555-1004',
      email: 'omar@freshcuts.com'
    },
    { 
      id: 'barber_ja', 
      name: 'Jamal Braids', 
      code: 'JA', 
      skills: 'Braids, Design, Fade', 
      commissionRate: 0.57, 
      status: 'active', 
      shop: 'Fresh Cuts Harlem', 
      location: '321 125th St, New York, NY', 
      zipcode: '10027', 
      geocode: '40.8176,-73.9482',
      cashapp: '$JamalBraids',
      venmo: '@JamalBraids-Artist',
      paypal: 'jamal.braids@freshcuts.com',
      phone: '555-1005',
      email: 'jamal@freshcuts.com'
    },
  ];
  
  for (const barber of barbers) {
    try {
      const qrCodeUrl = `${PUBLIC_BASE_URL}/pay/${barber.id}`;
      eliteDb.exec(`
        INSERT OR REPLACE INTO barbers (id, name, code, skills, commissionRate, status, shop, location, zipcode, geocode, cashapp, venmo, paypal, phone, email, qrCodeUrl, ip, userAgent, lastSeen, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, barber.id, barber.name, barber.code, barber.skills, barber.commissionRate, barber.status, 
         barber.shop, barber.location, barber.zipcode, barber.geocode,
         barber.cashapp, barber.venmo, barber.paypal, barber.phone, barber.email, qrCodeUrl,
         null, null);
    } catch (err) {
      console.error('Error seeding barber:', err);
    }
  }
}

// Seed sample customers
function seedSampleCustomers() {
  const customers = [
    { id: 'cust_001', name: 'Alice Johnson', email: 'alice.j@gmail.com', phone: '555-0101', tier: 'VIP', visits: 12, totalSpent: 650.00, preferredBarber: 'barber_jb', homeShop: 'Fresh Cuts Downtown', address: '456 Park Ave, New York, NY', zipcode: '10001', geocode: '40.7112,-73.9975', cashapp: '$AliceJ2024', venmo: '@Alice-Johnson', paypal: 'alice.j@gmail.com' },
    { id: 'cust_002', name: 'Bob Smith', email: 'bob.smith@yahoo.com', phone: '555-0102', tier: 'REGULAR', visits: 8, totalSpent: 320.00, preferredBarber: 'barber_ms', homeShop: 'Fresh Cuts Brooklyn', address: '789 Fulton St, Brooklyn, NY', zipcode: '11217', geocode: '40.6795,-73.9423', cashapp: '$BobSmithCuts', venmo: '@BobSmith-Venmo', paypal: 'bob.smith@yahoo.com' },
    { id: 'cust_003', name: 'Carlos Ruiz', email: 'c.ruiz@outlook.com', phone: '555-0103', tier: 'CASUAL', visits: 3, totalSpent: 85.00, preferredBarber: null, homeShop: 'Fresh Cuts Downtown', address: '321 Broadway, New York, NY', zipcode: '10001', geocode: '40.7145,-74.0039', cashapp: '$CarlosR', venmo: null, paypal: 'c.ruiz@outlook.com' },
    { id: 'cust_004', name: 'David Kim', email: 'dkim@gmail.com', phone: '555-0104', tier: 'NEW', visits: 1, totalSpent: 45.00, preferredBarber: 'barber_om', homeShop: 'Fresh Cuts Queens', address: '654 Austin St, Queens, NY', zipcode: '11375', geocode: '40.7268,-73.7965', cashapp: null, venmo: '@DavidKim', paypal: null },
    { id: 'cust_005', name: 'Eric Taylor', email: 'eric.t@proton.me', phone: '555-0105', tier: 'REGULAR', visits: 6, totalSpent: 240.00, preferredBarber: 'barber_ja', homeShop: 'Fresh Cuts Harlem', address: '987 Malcolm X Blvd, New York, NY', zipcode: '10027', geocode: '40.8142,-73.9496', cashapp: '$EricTaylor', venmo: '@EricTaylor-Pay', paypal: 'eric.t@proton.me' },
  ];
  
  for (const customer of customers) {
    try {
      eliteDb.exec(`
        INSERT OR REPLACE INTO customers (id, name, email, phone, tier, visits, totalSpent, preferredBarber, homeShop, address, zipcode, geocode, cashapp, venmo, paypal, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, customer.id, customer.name, customer.email, customer.phone, customer.tier, 
         customer.visits, customer.totalSpent, customer.preferredBarber, 
         customer.homeShop, customer.address, customer.zipcode, customer.geocode,
         customer.cashapp, customer.venmo, customer.paypal);
    } catch (err) {
      console.error('Error seeding customer:', err);
    }
  }
}

// Seed sample payments linked to customers
function seedSamplePayments() {
  const samplePayments = [
    { id: 'pay_1', type: 'service', direction: 'incoming', status: 'pending', amount: 45.00, customerId: 'cust_001', fromEntity: 'Alice Johnson', toEntity: 'Barbershop', provider: 'cashapp', description: 'Haircut + Beard Trim', paymentId: 'pay_1' },
    { id: 'pay_2', type: 'tip', direction: 'incoming', status: 'pending', amount: 10.00, customerId: 'cust_002', fromEntity: 'Bob Smith', toEntity: 'John Doe', provider: 'venmo', description: 'Tip for great service', paymentId: 'pay_2' },
    { id: 'pay_3', type: 'commission', direction: 'outgoing', status: 'pending', amount: 150.00, customerId: null, fromEntity: 'Barbershop', toEntity: 'Jane Barber', provider: 'cashapp', description: 'Weekly commission payout', paymentId: 'pay_3' },
    { id: 'pay_4', type: 'service', direction: 'incoming', status: 'pending', amount: 35.00, customerId: 'cust_003', fromEntity: 'Carlos Ruiz', toEntity: 'Barbershop', provider: 'stripe', description: 'Haircut', paymentId: 'pay_4' },
    { id: 'pay_5', type: 'refund', direction: 'outgoing', status: 'pending', amount: 25.00, customerId: 'cust_004', fromEntity: 'Barbershop', toEntity: 'David Kim', provider: 'paypal', description: 'Cancellation refund', paymentId: 'pay_5' },
  ];
  
  for (const payment of samplePayments) {
    try {
      eliteDb.exec(`
        INSERT OR IGNORE INTO payments (id, type, direction, status, amount, currency, customerId, fromEntity, toEntity, provider, paymentId, description, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, payment.id, payment.type, payment.direction, payment.status, payment.amount, 'USD',
         payment.customerId, payment.fromEntity, payment.toEntity, payment.provider, payment.paymentId, payment.description);
    } catch (err) {
      // Ignore duplicates
    }
  }
}

// Seed data on startup
seedSampleBarbers();
seedSampleCustomers();
seedSamplePayments();

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

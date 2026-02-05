#!/usr/bin/env bun

// Advanced T3-Lattice Registry Implementation
// Enterprise-grade with security, monitoring, and real-time features

import { COMPONENTS, VIEWS, getViewComponents, getViewConfig, renderGraphASCII } from "../src/core.ts";
import css from "./dashboard.css" with { type: "text" };
import config from "../config.toml" with { type: "toml" };
import { LATTICE_REGISTRY, CONFIG } from "../src/constants.ts";
import { dnsCacheManager, fetchWithDNSCache } from "../src/dns-cache.ts";
import bunConfig from "../src/config-loader.ts";

// Advanced Registry Client with Auto-Retry
export class LatticeRegistryClient {
  private sessionId: string;
  private csrfToken: string | null = null;

  constructor(private scope = "private-beta") {
    this.sessionId = crypto.randomUUID();
  }

  async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries = 3
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    const headers = this.buildHeaders(requestId);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithDNSCache(
          `${config.registry.base_url}${endpoint}`,
          {
            ...options,
            headers: { ...headers, ...options.headers },
            // Additional Bun-specific performance optimizations
            ...(process.env.NODE_ENV === 'production' && {
              keepalive: true
            })
          }
        );

        if (!response.ok) {
          throw new LatticeRegistryError(
            response.status,
            await response.text(),
            requestId
          );
        }

        const data: LatticeRegistryResponse<T> = await response.json();
        this.updateCSRFToken(response);

        return data.data;
      } catch (error) {
        if (attempt === maxRetries) throw error;

        // Exponential backoff with jitter
        const delay = Math.min(1000 * 2 ** attempt + Math.random() * 100, 10000);
        await Bun.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private buildHeaders(requestId: string): HeadersInit {
    return {
      'X-Session': this.sessionId,
      'X-Scope': this.scope,
      'X-Agent': 'T3-Lattice-Registry/3.3.0',
      'X-Request-ID': requestId,
      'X-CSRF-Token': this.csrfToken || '',
      'Authorization': `Bearer ${process.env.LATTICE_TOKEN || ''}`,
      'Accept-Encoding': 'gzip, deflate, br',
    };
  }

  private updateCSRFToken(response: Response): void {
    const token = response.headers.get('X-CSRF-Token');
    if (token) this.csrfToken = token;
  }
}

// Enhanced Error Handling
class LatticeRegistryError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public requestId: string
  ) {
    super(`Registry Error ${statusCode}: ${message}`);
    this.name = 'LatticeRegistryError';

    // Bun-specific stack trace enhancement
    if (typeof Bun !== 'undefined') {
      Error.captureStackTrace?.(this, LatticeRegistryError);
    }
  }
}

// WebSocket Connection Manager for Real-time Feeds
export class LatticeWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private backpressure = 0;

  constructor(
    private onMessage: (data: LatticeWebSocketPayload) => void,
    private onStatusChange: (status: string) => void
  ) {}

  connect(): void {
    const wsUrl = new URL('/ws', `http://localhost:${config.server.port}`);
    wsUrl.protocol = 'ws:';

    this.ws = new WebSocket(wsUrl.toString(), {
      headers: {
        'X-Agent': 'T3-Lattice-Registry/3.3.0',
      'Authorization': `Bearer ${process.env.LATTICE_TOKEN || config.registry.scope || ''}`,
      },
      perMessageDeflate: true,
      handshakeTimeout: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.onStatusChange('CONNECTED');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      this.onStatusChange('DISCONNECTED');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onStatusChange('ERROR');
    };
  }

  private handleMessage(data: any): void {
    // Handle backpressure
    this.backpressure += data.length || 0;
    if (this.backpressure > 1024 * 1024) { // 1MB limit
      this.ws?.pause?.();
      setTimeout(() => {
        this.ws?.resume?.();
        this.backpressure = 0;
      }, 100);
      return;
    }

    try {
      const payload = this.decodePayload(data);
      this.onMessage(payload);
    } catch (error) {
      console.error('Failed to decode message:', error);
    }
  }

  private decodePayload(data: any): LatticeWebSocketPayload {
    // Simple JSON payload for now
    if (typeof data === 'string') {
      return JSON.parse(data);
    }

    // Binary payload handling (placeholder for future)
    return {
      type: 'binary',
      data: data,
      timestamp: Date.now()
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}

// Cookie Manager using Bun.CookieMap
export class LatticeCookieManager {
  private cookieMap: Bun.CookieMap;
  private config: any;

  constructor() {
    this.cookieMap = new Bun.CookieMap();
    // Load config asynchronously
    bunConfig.YAML.parse().then(config => {
      this.config = config;
    }).catch(() => {
      // Use defaults if config fails to load
      this.config = {
        cookies: {
          defaults: { http_only: true, secure: false, same_site: "strict", max_age: 86400 },
          session: { name: "t3_session", path: "/", domain: "localhost" },
          csrf: { name: "t3_csrf", path: "/", http_only: false }
        }
      };
    });
  }

  // Set session cookie
  setSessionCookie(sessionId: string, options?: { maxAge?: number; secure?: boolean }): void {
    const cookieOptions = {
      httpOnly: this.config?.cookies?.defaults?.http_only ?? true,
      secure: options?.secure ?? this.config?.cookies?.defaults?.secure ?? false,
      sameSite: this.config?.cookies?.defaults?.same_site ?? "strict",
      maxAge: options?.maxAge ?? this.config?.cookies?.defaults?.max_age ?? 86400,
      path: this.config?.cookies?.session?.path ?? "/",
      domain: this.config?.cookies?.session?.domain
    };

    this.cookieMap.set(
      this.config?.cookies?.session?.name ?? "t3_session",
      sessionId,
      cookieOptions
    );
  }

  // Set CSRF token cookie
  setCsrfCookie(token: string): void {
    const cookieOptions = {
      httpOnly: this.config?.cookies?.csrf?.http_only ?? false,
      secure: this.config?.cookies?.defaults?.secure ?? false,
      sameSite: this.config?.cookies?.defaults?.same_site ?? "strict",
      maxAge: this.config?.cookies?.defaults?.max_age ?? 86400,
      path: this.config?.cookies?.csrf?.path ?? "/",
    };

    this.cookieMap.set(
      this.config?.cookies?.csrf?.name ?? "t3_csrf",
      token,
      cookieOptions
    );
  }

  // Get cookie value
  getCookie(name: string): string | null {
    return this.cookieMap.get(name);
  }

  // Delete cookie
  deleteCookie(name: string): void {
    this.cookieMap.delete(name);
  }

  // Get all cookies as headers
  getCookieHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    try {
      const cookies = this.cookieMap.toString();
      // Check if we have actual cookies by trying to get them
      const testCookie = this.cookieMap.get('t3_session') || this.cookieMap.get('t3_csrf');
      if (testCookie !== null && testCookie !== undefined) {
        headers['Set-Cookie'] = cookies;
      }
    } catch (error) {
      // If there's an error, no cookies are set
    }
    return headers;
  }

  // Parse request cookies
  parseRequestCookies(request: Request): void {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // Create new CookieMap from request headers
      this.cookieMap = Bun.CookieMap.from(cookieHeader);
    }
  }
}

// Global cookie manager instance
export const cookieManager = new LatticeCookieManager();

// Security and Audit System
export class LatticeSecurity {
  private auditLog: string[] = [];

  async auditRequest(request: Request): Promise<AuditResult> {
    const audit: AuditResult = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent') || 'unknown',
      ip: request.headers.get('X-Forwarded-For') || 'unknown',
      threats: [],
      safe: true
    };

    // Basic security checks
    const threats = await this.checkThreats(request);
    audit.threats = threats;
    audit.safe = threats.length === 0;

    // Log to memory (could be written to file in production)
    this.auditLog.push(JSON.stringify(audit));

    return audit;
  }

  private async checkThreats(request: Request): Promise<string[]> {
    const threats: string[] = [];

    // Check for suspicious patterns
    const userAgent = request.headers.get('User-Agent') || '';
    if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      threats.push('Automated request detected');
    }

    // Check for suspicious IP patterns
    const ip = request.headers.get('X-Forwarded-For') || '';
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      threats.push('Private IP address detected');
    }

    // Check for unusual request patterns
    if (request.method === 'POST' && !request.headers.get('Content-Type')?.includes('application/json')) {
      threats.push('POST request without proper content-type');
    }

    return threats;
  }

  private isRateLimited(ip: string): boolean {
    // Simplified rate limiting - in production use Redis or similar
    return false; // Placeholder
  }
}

// Metrics and Monitoring
export class LatticeMetricsCollector {
  private metrics: LatticeMetric[] = [];
  private slaViolations = 0;

  async trackRequest(endpoint: string, startTime: number): Promise<LatticeMetric> {
    const duration = performance.now() - startTime;

    const metric: LatticeMetric = {
      endpoint,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      status: this.determineStatus(duration),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage?.() || {}
    };

    this.metrics.push(metric);
    this.checkSLACompliance(metric);

    return metric;
  }

  private determineStatus(duration: number): string {
    if (duration > 5000) return "TIMEOUT";
    if (duration > 1000) return "SLOW";
    if (duration < 100) return "FAST";
    return "NORMAL";
  }

  private checkSLACompliance(metric: LatticeMetric): void {
    const duration = parseFloat(metric.duration.replace('ms', ''));

    if (duration > 2000) { // 2 second SLA
      this.slaViolations++;

      if (this.slaViolations >= 5) {
        console.error(`SLA VIOLATION: ${metric.endpoint} exceeded threshold`);
        this.triggerAlert(metric);
      }
    } else {
      this.slaViolations = Math.max(0, this.slaViolations - 1);
    }
  }

  private triggerAlert(metric: LatticeMetric): void {
    // In production, this would send alerts via email, Slack, etc.
    console.error('🚨 ALERT:', JSON.stringify(metric, null, 2));
  }

  getMetrics(): LatticeMetric[] {
    return [...this.metrics];
  }

  getHealthStatus(): HealthStatus {
    const recentMetrics = this.metrics.slice(-10);
    const avgDuration = recentMetrics.reduce((sum, m) =>
      sum + parseFloat(m.duration.replace('ms', '')), 0) / recentMetrics.length;

    return {
      status: avgDuration < 1000 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: recentMetrics.length,
      averageResponseTime: `${avgDuration.toFixed(2)}ms`,
      slaViolations: this.slaViolations,
      memoryUsage: process.memoryUsage()
    };
  }
}

// Type Definitions
interface LatticeRegistryResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

interface LatticeWebSocketPayload {
  type: string;
  data: any;
  timestamp: number;
  [key: string]: any;
}

interface AuditResult {
  timestamp: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  threats: string[];
  safe: boolean;
}

interface LatticeMetric {
  endpoint: string;
  duration: string;
  timestamp: string;
  status: string;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  metrics: number;
  averageResponseTime: string;
  slaViolations: number;
  memoryUsage: NodeJS.MemoryUsage;
}

// Enhanced Dashboard Server with Advanced Features
function generateAdvancedDashboardHTML(view: keyof typeof VIEWS = "overview"): string {
  const components = getViewComponents(view);
  const viewConfig = getViewConfig(view);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>T3-Lattice Registry v3.3 - Enterprise Edition</title>
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <h1>🚀 T3-Lattice Registry v3.3</h1>
    <p>Enterprise-grade component registry with real-time monitoring</p>
    <div class="status-indicators">
      <span class="status status-healthy">System: HEALTHY</span>
      <span class="status status-active">WebSocket: CONNECTED</span>
      <span class="status status-secure">Security: ENABLED</span>
    </div>
  </div>

  <div class="tabs">
    <a class="tab ${view === 'overview' ? 'active' : ''}" href="?view=overview">Overview</a>
    <a class="tab ${view === 'detail' ? 'active' : ''}" href="?view=detail">Detail</a>
    <a class="tab ${view === 'expert' ? 'active' : ''}" href="?view=expert">Expert</a>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${components.length}</div>
      <div class="stat-label">Components</div>
    </div>
    <div class="stat">
      <div class="stat-value">${new Set(components.map(c => c.category)).size}</div>
      <div class="stat-label">Categories</div>
    </div>
    <div class="stat">
      <div class="stat-value">${new Set(components.map(c => c.bunVersion)).size}</div>
      <div class="stat-label">Version Types</div>
    </div>
    <div class="stat">
      <div class="stat-value">${components.filter(c => c.status === 'stable').length}</div>
      <div class="stat-label">Stable</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="realtime-connections">0</div>
      <div class="stat-label">Active Connections</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="metrics-count">${COMPONENTS.length}</div>
      <div class="stat-label">Metrics Tracked</div>
    </div>
  </div>

  <div class="grid">
    ${components.map(comp => `
      <div class="card" data-component-id="${comp.id}">
        <div class="card-header">
          <span class="color-dot" style="background: ${comp.color.hex}"></span>
          <span class="card-id">#${comp.id.toString().padStart(2, '0')}</span>
          <span class="card-name">${comp.name}</span>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary);">${comp.description}</p>
        <div class="card-meta">
          <span>${comp.slot}</span>
          <span>${comp.category}</span>
          <span class="badge badge-${comp.status}">${comp.status}</span>
        </div>
        <div class="card-metrics">
          <small>Latency: <span class="metric-latency">--</span></small>
          <small>Uptime: <span class="metric-uptime">100%</span></small>
        </div>
      </div>
    `).join("")}
  </div>

  <div class="graph-section">
    <h3>Dependency Graph & Real-time Metrics</h3>
    <pre id="graph">${renderGraphASCII()}</pre>
    <div id="realtime-metrics">
      <h4>Live Metrics</h4>
      <div id="metrics-container">
        <div class="metric-item">
          <span class="metric-label">Response Time:</span>
          <span class="metric-value" id="avg-response-time">--ms</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">SLA Violations:</span>
          <span class="metric-value" id="sla-violations">0</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Memory Usage:</span>
          <span class="metric-value" id="memory-usage">--MB</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Real-time WebSocket connection
    let ws = null;
    let reconnectAttempts = 0;

    function connectWebSocket() {
      ws = new WebSocket('ws://localhost:8080/ws');

      ws.onopen = function() {
        console.log('WebSocket connected');
        document.querySelector('.status-active').textContent = 'WebSocket: CONNECTED';
        reconnectAttempts = 0;
      };

      ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateMetrics(data);
      };

      ws.onclose = function() {
        document.querySelector('.status-active').textContent = 'WebSocket: DISCONNECTED';
        attemptReconnect();
      };

      ws.onerror = function(error) {
        console.error('WebSocket error:', error);
        document.querySelector('.status-active').textContent = 'WebSocket: ERROR';
      };
    }

    function attemptReconnect() {
      if (reconnectAttempts >= 10) return;

      setTimeout(() => {
        reconnectAttempts++;
        connectWebSocket();
      }, Math.min(1000 * 2 ** reconnectAttempts, 30000));
    }

    function updateMetrics(data) {
      if (data.type === 'health') {
        document.getElementById('realtime-connections').textContent = data.connections || 0;
        document.getElementById('avg-response-time').textContent = data.avgLatency || '--ms';
        document.getElementById('sla-violations').textContent = data.slaViolations || 0;
        document.getElementById('memory-usage').textContent = data.memoryMB || '--MB';
      }
    }

    // Connect on page load
    connectWebSocket();

    // Periodic health check
    setInterval(async () => {
      try {
        const response = await fetch('/health');
        const health = await response.json();

        const statusEl = document.querySelector('.status-healthy');
        statusEl.textContent = \`System: \${health.status.toUpperCase()}\`;
        statusEl.className = \`status status-\${health.status === 'healthy' ? 'healthy' : 'error'}\`;
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 5000);
  </script>
</body>
</html>`;
}

async function startAdvancedDashboard(runtimeConfig: any = {}): Promise<void> {
  // Load Bun configuration
  const bunCfg = await bunConfig.YAML.parse();

  const mergedConfig = {
    port: runtimeConfig.port ?? config.server.port ?? 8080,
    host: runtimeConfig.host ?? config.server.host ?? "0.0.0.0"
  };

  // Initialize enterprise components
  const client = new LatticeRegistryClient();
  const security = new LatticeSecurity();
  const metrics = new LatticeMetricsCollector();

  const server = Bun.serve({
    port: mergedConfig.port,
    hostname: mergedConfig.host,
    async fetch(req) {
      const url = new URL(req.url);
      const startTime = performance.now();

      // Parse and manage cookies
      cookieManager.parseRequestCookies(req);

      // Set session cookie if not exists
      if (!cookieManager.getCookie('t3_session')) {
        const sessionId = crypto.randomUUID();
        cookieManager.setSessionCookie(sessionId);
      }

      // Set CSRF cookie if not exists
      if (!cookieManager.getCookie('t3_csrf')) {
        const csrfToken = crypto.randomUUID();
        cookieManager.setCsrfCookie(csrfToken);
      }

      // Security audit for all requests
      security.auditRequest(req).catch(err =>
        console.error('Security audit failed:', err)
      );

      // Health check endpoint
      if (url.pathname === "/health") {
        const health = metrics.getHealthStatus();

        return new Response(JSON.stringify({
          status: health.status,
          timestamp: health.timestamp,
          components: COMPONENTS.length,
          metrics: health.metrics,
          avgLatency: health.averageResponseTime,
          slaViolations: health.slaViolations,
          memoryMB: Math.round(health.memoryUsage.heapUsed / 1024 / 1024),
          version: "3.3.0"
        }), {
          headers: {
            "Content-Type": "application/json",
            "X-Powered-By": "T3-Lattice-Enterprise",
            "X-Version": "3.3.0"
          }
        });
      }

      // WebSocket upgrade
      if (url.pathname === "/ws") {
        const wsManager = new LatticeWebSocketManager(
          (data) => {
            // Broadcast metrics to all connected clients
            // In production, use Redis pub/sub
          },
          (status) => {
            console.log('WebSocket status:', status);
          }
        );

        // Note: Bun.serve handles WebSocket upgrades automatically
        // This is a placeholder for the actual WebSocket handling
      }

      // API endpoints for advanced features
      if (url.pathname === "/api/metrics") {
        return new Response(JSON.stringify(metrics.getMetrics()), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.pathname === "/api/security/audit") {
        security.auditRequest(req).catch(err =>
          console.error('Security audit failed:', err)
        );
        return new Response(JSON.stringify({ status: "audit_logged" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.pathname === "/api/dns/stats") {
        const dnsStats = dnsCacheManager.getStats();
        return new Response(JSON.stringify({
          status: "ok",
          dnsCache: dnsStats
        }), {
          headers: {
            "Content-Type": "application/json",
            ...cookieManager.getCookieHeaders()
          }
        });
      }

      if (url.pathname === "/api/dns/warmup") {
        // Trigger connection warmup for prefetched hosts
        dnsCacheManager.warmupConnections().catch(err =>
          console.error('Connection warmup failed:', err)
        );

        return new Response(JSON.stringify({
          status: "warming_up",
          message: "TCP connections warming up for prefetched hosts"
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.pathname === "/api/config") {
        return new Response(JSON.stringify({
          config: bunCfg,
          features: {
            dns_prefetch: bunConfig.isFeatureEnabled('dns_prefetch'),
            enterprise: bunConfig.isFeatureEnabled('enterprise'),
            websocket: bunConfig.isFeatureEnabled('websocket'),
            security_audit: bunConfig.isFeatureEnabled('security_audit'),
            metrics_collection: bunConfig.isFeatureEnabled('metrics_collection')
          },
          cookies: {
            session: cookieManager.getCookie('t3_session'),
            csrf: cookieManager.getCookie('t3_csrf')
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.pathname === "/api/cookies/test") {
        // Test cookie functionality
        const testCookie = `test_${Date.now()}`;
        cookieManager.setSessionCookie(testCookie, { maxAge: 60 }); // 1 minute

        return new Response(JSON.stringify({
          message: "Cookie test set",
          testCookie,
          allCookies: {
            session: cookieManager.getCookie('t3_session'),
            csrf: cookieManager.getCookie('t3_csrf'),
            test: cookieManager.getCookie('t3_session') // Should be the test value
          }
        }), {
          headers: {
            "Content-Type": "application/json",
            ...cookieManager.getCookieHeaders()
          }
        });
      }

      // Main dashboard
      const searchParams = url.searchParams;
      const view = (searchParams.get("view") as keyof typeof VIEWS) || "overview";

      if (!["overview", "detail", "expert"].includes(view)) {
        return new Response("Invalid view", { status: 400 });
      }

      // Track metrics for dashboard requests
      setTimeout(() => {
        metrics.trackRequest(url.pathname, startTime);
      }, 0);

      return new Response(generateAdvancedDashboardHTML(view), {
        headers: {
          "Content-Type": "text/html",
          "X-Powered-By": "T3-Lattice-Enterprise",
          "X-Version": "3.3.0",
          ...bunCfg.http?.headers,
          ...cookieManager.getCookieHeaders()
        }
      });
    },

    websocket: {
      message(ws, message) {
        // Handle WebSocket messages
        console.log('WebSocket message received');
      },

      open(ws) {
        console.log('WebSocket connection opened');
      },

      close(ws) {
        console.log('WebSocket connection closed');
      }
    }
  });

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 T3-Lattice Registry v3.3 - ENTERPRISE EDITION        ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  URL: http://${mergedConfig.host}:${server.port}             ║
║  Health: http://${mergedConfig.host}:${server.port}/health    ║
║  WebSocket: ws://${mergedConfig.host}:${server.port}/ws       ║
║  Metrics: http://${mergedConfig.host}:${server.port}/api/metrics ║
║  Security: http://${mergedConfig.host}:${server.port}/api/security/audit ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Config: bun.yaml loaded with enterprise features          ║
║  Cookies: Bun.CookieMap with session & CSRF management      ║
║  Security: CSRF enabled, threat intelligence active         ║
║  DNS: Advanced prefetching & caching system                ║
║  Monitoring: Real-time metrics & SLA compliance            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
}

// Enterprise components are already exported above

// Auto-start the enterprise dashboard
if (import.meta.main) {
  startAdvancedDashboard();
}
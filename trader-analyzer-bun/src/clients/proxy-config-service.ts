/**
 * @fileoverview Proxy Configuration Management Service
 * @description 12.6.0.0.0.0.0 - Dynamic proxy rotation, health monitoring, and circuit breaker integration
 * @module clients/proxy-config-service
 */

import { Database } from "bun:sqlite"
import { StructuredLogger } from "../logging/structured-logger"
import { CircuitBreaker } from "../utils/enterprise-retry"

/**
 * 12.6.1.2.0.0.0: Defines a persistent entry for a proxy server
 */
export interface ProxyEntry {
  id: string // Unique ID for this proxy instance
  url: string // The base URL of the proxy (e.g., "http://proxy.example.com:8080")
  headers?: Record<string, string> // Custom headers like Proxy-Authorization
  type: "HTTP" | "HTTPS" | "SOCKS5" // Proxy protocol type
  isEnabled: boolean // Flag to enable/disable proxy dynamically
  healthScore: number // Dynamic score (0-100) based on performance/errors
  lastChecked: number // Timestamp of last health check
  errorCount: number // Cumulative error count for this proxy
  successCount: number // Cumulative success count
  totalLatency: number // Cumulative latency for averaging
  bookmakers: string[] // List of bookmakers this proxy is configured for
  createdAt: number // Creation timestamp
  updatedAt: number // Last update timestamp
}

/**
 * Proxy selection context
 */
export interface ProxySelectionContext {
  operation?: string
  requestId?: string
  priority?: "low" | "medium" | "high"
}

/**
 * Proxy selection strategy
 */
export type ProxySelectionStrategy = "round-robin" | "least-errors" | "weighted-random" | "health-score"

/**
 * Proxy health check result
 */
export interface ProxyHealthCheckResult {
  proxyId: string
  healthy: boolean
  latency?: number
  error?: string
  timestamp: number
}

/**
 * 12.6.1.0.0.0.0 ProxyConfigService Implementation
 * 
 * Centralizes proxy configuration, provides dynamic proxy rotation,
 * health monitoring, and tight integration with Circuit Breaker.
 */
export class ProxyConfigService {
  private db: Database
  private logger: StructuredLogger
  private circuitBreaker: CircuitBreaker
  private selectionStrategy: ProxySelectionStrategy = "health-score"
  private lastRoundRobinIndex: Map<string, number> = new Map()
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null
  private metrics: Map<string, { count: number; sum: number; min: number; max: number }> = new Map()

  constructor(
    db: Database,
    logger: StructuredLogger,
    circuitBreaker?: CircuitBreaker,
    strategy: ProxySelectionStrategy = "health-score"
  ) {
    this.db = db
    this.logger = logger
    this.circuitBreaker = circuitBreaker || new CircuitBreaker(5, 60000, 3)
    this.selectionStrategy = strategy
    this.initSchema()
    this.startHealthCheckWorker()
  }

  /**
   * 12.6.1.1.0.0.0: Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS proxy_entries (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        headers TEXT, -- JSON string
        type TEXT NOT NULL CHECK(type IN ('HTTP', 'HTTPS', 'SOCKS5')),
        is_enabled INTEGER NOT NULL DEFAULT 1,
        health_score REAL NOT NULL DEFAULT 100.0 CHECK(health_score >= 0 AND health_score <= 100),
        last_checked INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        total_latency REAL NOT NULL DEFAULT 0,
        bookmakers TEXT NOT NULL, -- JSON array string
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_proxy_enabled ON proxy_entries(is_enabled);
      CREATE INDEX IF NOT EXISTS idx_proxy_health ON proxy_entries(health_score DESC);
      CREATE INDEX IF NOT EXISTS idx_proxy_bookmakers ON proxy_entries(bookmakers);
    `)
  }

  /**
   * 12.6.1.3.0.0.0: Get proxy for bookmaker with dynamic selection
   * 
   * @example
   * ```typescript
   * const proxy = await service.getProxyForBookmaker("draftkings", {
   *   operation: "fetchMarkets",
   *   requestId: "req-123"
   * });
   * // Returns: { url: "http://proxy.example.com:8080", headers: {...}, proxyId: "proxy-123" }
   * ```
   */
  async getProxyForBookmaker(
    bookmaker: string,
    context?: ProxySelectionContext
  ): Promise<{ url: string; headers?: Record<string, string>; proxyId: string } | null> {
    try {
      // Retrieve enabled proxies for this bookmaker
      const proxies = await this.getEnabledProxiesForBookmaker(bookmaker)

      if (proxies.length === 0) {
        this.logger.logMcpError(
          { code: "HBPC-002", message: "No proxy available" },
          { bookmaker, operation: context?.operation, requestId: context?.requestId }
        )
        return null
      }

      // Apply selection strategy
      const selectedProxy = this.selectProxy(proxies, bookmaker, context)

      if (!selectedProxy) {
        this.logger.logMcpError(
          { code: "HBPC-002", message: "Proxy selection failed" },
          { bookmaker, operation: context?.operation, requestId: context?.requestId }
        )
        return null
      }

      // Load Proxy-Authorization token from Bun.secrets
      const headers = await this.enrichProxyHeaders(selectedProxy, bookmaker)

      // Log proxy selection
      this.logger.logMcpError(
        { code: "HBPC-001", message: "Proxy selected" },
        {
          bookmaker,
          proxyId: selectedProxy.id,
          operation: context?.operation,
          requestId: context?.requestId,
          healthScore: selectedProxy.healthScore,
        }
      )

      return {
        url: selectedProxy.url,
        headers,
        proxyId: selectedProxy.id,
      }
    } catch (error) {
      this.logger.logMcpError(
        { code: "HBPC-002", message: error instanceof Error ? error.message : String(error) },
        { bookmaker, operation: context?.operation }
      )
      return null
    }
  }

  /**
   * 12.6.1.3.1.0.0: Dynamic Proxy Selection Algorithm
   */
  private selectProxy(
    proxies: ProxyEntry[],
    bookmaker: string,
    context?: ProxySelectionContext
  ): ProxyEntry | null {
    if (proxies.length === 0) return null
    if (proxies.length === 1) return proxies[0]

    switch (this.selectionStrategy) {
      case "round-robin":
        return this.selectRoundRobin(proxies, bookmaker)

      case "least-errors":
        return proxies.reduce((best, current) =>
          current.errorCount < best.errorCount ? current : best
        )

      case "weighted-random":
        return this.selectWeightedRandom(proxies)

      case "health-score":
      default:
        // Select proxy with highest health score, filtering out unhealthy ones (< 20)
        const healthyProxies = proxies.filter((p) => p.healthScore >= 20)
        if (healthyProxies.length === 0) {
          // Fallback: use least unhealthy proxy
          return proxies.reduce((best, current) =>
            current.healthScore > best.healthScore ? current : best
          )
        }
        return healthyProxies.reduce((best, current) =>
          current.healthScore > best.healthScore ? current : best
        )
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(proxies: ProxyEntry[], bookmaker: string): ProxyEntry {
    const currentIndex = this.lastRoundRobinIndex.get(bookmaker) || 0
    const selectedIndex = currentIndex % proxies.length
    this.lastRoundRobinIndex.set(bookmaker, selectedIndex + 1)
    return proxies[selectedIndex]
  }

  /**
   * Weighted random selection based on health score
   */
  private selectWeightedRandom(proxies: ProxyEntry[]): ProxyEntry {
    const weights = proxies.map((p) => Math.max(p.healthScore, 1))
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < proxies.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return proxies[i]
      }
    }

    return proxies[proxies.length - 1]
  }

  /**
   * Get enabled proxies for a bookmaker
   */
  private async getEnabledProxiesForBookmaker(bookmaker: string): Promise<ProxyEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM proxy_entries
      WHERE is_enabled = 1
      AND json_extract(bookmakers, '$') LIKE ?
      ORDER BY health_score DESC
    `)

    const rows = stmt.all(`%"${bookmaker}"%`) as Array<{
      id: string
      url: string
      headers: string | null
      type: string
      is_enabled: number
      health_score: number
      last_checked: number
      error_count: number
      success_count: number
      total_latency: number
      bookmakers: string
      created_at: number
      updated_at: number
    }>

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      headers: row.headers ? JSON.parse(row.headers) : undefined,
      type: row.type as "HTTP" | "HTTPS" | "SOCKS5",
      isEnabled: row.is_enabled === 1,
      healthScore: row.health_score,
      lastChecked: row.last_checked,
      errorCount: row.error_count,
      successCount: row.success_count,
      totalLatency: row.total_latency,
      bookmakers: JSON.parse(row.bookmakers),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Enrich proxy headers with authentication token from Bun.secrets
   */
  private async enrichProxyHeaders(proxy: ProxyEntry, bookmaker: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      ...proxy.headers,
      "X-Bookmaker-ID": bookmaker,
      "X-Target-Region": process.env.PROXY_TARGET_REGION || "us-east-1",
      "X-Rate-Limit-Tier": "premium",
      "X-Connection-Pool": "keep-alive",
    }

    // Load Proxy-Authorization token from Bun.secrets
    try {
      const proxyToken = (Bun.secrets as any)[`proxy-token-${bookmaker}`]
      if (proxyToken) {
        headers["Proxy-Authorization"] = `Bearer ${proxyToken}`
      }
    } catch {
      // Fallback to environment variable
      const envToken = process.env[`PROXY_TOKEN_${bookmaker.toUpperCase()}`]
      if (envToken) {
        headers["Proxy-Authorization"] = `Bearer ${envToken}`
      }
    }

    return headers
  }

  /**
   * 12.6.1.4.0.0.0: Update proxy health after request
   */
  async updateProxyHealth(
    proxyId: string,
    success: boolean,
    latency_ms?: number,
    errorDetails?: string
  ): Promise<void> {
    const now = Date.now()

    try {
      const stmt = this.db.prepare(`
        SELECT error_count, success_count, total_latency, health_score
        FROM proxy_entries
        WHERE id = ?
      `)

      const row = stmt.get(proxyId) as {
        error_count: number
        success_count: number
        total_latency: number
        health_score: number
      } | undefined

      if (!row) {
        this.logger.logMcpError(
          { code: "HBPC-005", message: "Proxy not found" },
          { proxyId }
        )
        return
      }

      const newErrorCount = success ? row.error_count : row.error_count + 1
      const newSuccessCount = success ? row.success_count + 1 : row.success_count
      const newTotalLatency = latency_ms ? row.total_latency + latency_ms : row.total_latency
      const totalRequests = newErrorCount + newSuccessCount

      // Calculate health score: weighted average of success rate and latency
      let healthScore = 100.0

      if (totalRequests > 0) {
        const successRate = newSuccessCount / totalRequests
        const avgLatency = totalRequests > 0 ? newTotalLatency / totalRequests : 0

        // Success rate contributes 70% to health score
        const successRateScore = successRate * 100

        // Latency contributes 30% (lower is better, max 100ms = 100 points)
        const latencyScore = Math.max(0, 100 - (avgLatency / 100) * 30)

        healthScore = successRateScore * 0.7 + latencyScore * 0.3

        // Penalize recent errors more heavily
        if (!success) {
          healthScore *= 0.9
        }
      }

      // Update proxy entry
      const updateStmt = this.db.prepare(`
        UPDATE proxy_entries
        SET
          error_count = ?,
          success_count = ?,
          total_latency = ?,
          health_score = ?,
          last_checked = ?,
          updated_at = ?
        WHERE id = ?
      `)

      updateStmt.run(
        newErrorCount,
        newSuccessCount,
        newTotalLatency,
        Math.max(0, Math.min(100, healthScore)),
        now,
        now,
        proxyId
      )

      // Update metrics
      this.updateMetrics(proxyId, latency_ms || 0, success)
    } catch (error) {
      this.logger.logMcpError(
        { code: "HBPC-006", message: error instanceof Error ? error.message : String(error) },
        { proxyId, success, latency_ms }
      )
    }
  }

  /**
   * Update Prometheus-style metrics
   */
  private updateMetrics(proxyId: string, latency: number, success: boolean): void {
    if (!this.metrics.has(proxyId)) {
      this.metrics.set(proxyId, { count: 0, sum: 0, min: Infinity, max: 0 })
    }

    const metric = this.metrics.get(proxyId)!
    metric.count++
    metric.sum += latency
    metric.min = Math.min(metric.min, latency)
    metric.max = Math.max(metric.max, latency)
  }

  /**
   * 12.6.1.5.0.0.0: List all proxies, optionally filtered by bookmaker
   */
  async listProxies(bookmaker?: string): Promise<ProxyEntry[]> {
    let stmt
    let rows

    if (bookmaker) {
      stmt = this.db.prepare(`
        SELECT * FROM proxy_entries
        WHERE json_extract(bookmakers, '$') LIKE ?
        ORDER BY health_score DESC
      `)
      rows = stmt.all(`%"${bookmaker}"%`)
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM proxy_entries
        ORDER BY health_score DESC
      `)
      rows = stmt.all()
    }

    return (rows as Array<any>).map((row) => ({
      id: row.id,
      url: row.url,
      headers: row.headers ? JSON.parse(row.headers) : undefined,
      type: row.type as "HTTP" | "HTTPS" | "SOCKS5",
      isEnabled: row.is_enabled === 1,
      healthScore: row.health_score,
      lastChecked: row.last_checked,
      errorCount: row.error_count,
      successCount: row.success_count,
      totalLatency: row.total_latency,
      bookmakers: JSON.parse(row.bookmakers),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * 12.6.1.6.0.0.0: Add a new proxy configuration
   */
  async addProxy(entry: Omit<ProxyEntry, "id" | "healthScore" | "lastChecked" | "errorCount" | "successCount" | "totalLatency" | "createdAt" | "updatedAt">): Promise<ProxyEntry> {
    const id = `proxy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO proxy_entries (
        id, url, headers, type, is_enabled, health_score, last_checked,
        error_count, success_count, total_latency, bookmakers, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 100.0, ?, 0, 0, 0.0, ?, ?, ?)
    `)

    stmt.run(
      id,
      entry.url,
      entry.headers ? JSON.stringify(entry.headers) : null,
      entry.type,
      entry.isEnabled ? 1 : 0,
      now,
      JSON.stringify(entry.bookmakers),
      now,
      now
    )

    return {
      id,
      ...entry,
      healthScore: 100.0,
      lastChecked: now,
      errorCount: 0,
      successCount: 0,
      totalLatency: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * 12.6.1.7.0.0.0: Remove a proxy configuration
   */
  async removeProxy(proxyId: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM proxy_entries WHERE id = ?`)
    stmt.run(proxyId)
    this.metrics.delete(proxyId)
  }

  /**
   * Enable/disable a proxy
   */
  async setProxyEnabled(proxyId: string, enabled: boolean): Promise<void> {
    const stmt = this.db.prepare(`UPDATE proxy_entries SET is_enabled = ?, updated_at = ? WHERE id = ?`)
    stmt.run(enabled ? 1 : 0, Date.now(), proxyId)
  }

  /**
   * 12.6.2.1.0.0.0: Scheduled proxy health checks
   */
  private startHealthCheckWorker(): void {
    // Run health checks every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, 5 * 60 * 1000)

    // Perform initial health check
    this.performHealthChecks().catch((error) => {
      this.logger.logMcpError(
        { code: "HBPC-007", message: error instanceof Error ? error.message : String(error) },
        {}
      )
    })
  }

  /**
   * Perform health checks on all enabled proxies
   */
  private async performHealthChecks(): Promise<void> {
    const proxies = await this.listProxies()
    const enabledProxies = proxies.filter((p) => p.isEnabled)

    for (const proxy of enabledProxies) {
      try {
        const result = await this.checkProxyHealth(proxy)
        await this.updateProxyHealth(proxy.id, result.healthy, result.latency, result.error)

        if (result.healthy) {
          this.logger.logMcpError(
            { code: "HBPC-003", message: "Proxy healthy" },
            { proxyId: proxy.id, latency: result.latency }
          )
        } else {
          this.logger.logMcpError(
            { code: "HBPC-004", message: "Proxy unhealthy" },
            { proxyId: proxy.id, error: result.error }
          )
        }
      } catch (error) {
        this.logger.logMcpError(
          { code: "HBPC-008", message: error instanceof Error ? error.message : String(error) },
          { proxyId: proxy.id }
        )
      }
    }
  }

  /**
   * Check health of a single proxy
   */
  private async checkProxyHealth(proxy: ProxyEntry): Promise<ProxyHealthCheckResult> {
    const startTime = Bun.nanoseconds()
    const testUrl = "https://www.google.com" // Lightweight endpoint for health check

    try {
      const fetchOptions: RequestInit = {
        method: "HEAD",
        signal: AbortSignal.timeout(5000), // 5 second timeout for health checks
      }

      if (proxy.type === "HTTP" || proxy.type === "HTTPS") {
        ;(fetchOptions as any).proxy = {
          url: proxy.url,
          headers: proxy.headers || {},
        }
      }

      const response = await fetch(testUrl, fetchOptions)
      const latency = (Bun.nanoseconds() - startTime) / 1_000_000

      return {
        proxyId: proxy.id,
        healthy: response.ok,
        latency,
        timestamp: Date.now(),
      }
    } catch (error) {
      const latency = (Bun.nanoseconds() - startTime) / 1_000_000
      return {
        proxyId: proxy.id,
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get Prometheus-style metrics for a proxy
   */
  getProxyMetrics(proxyId: string): {
    healthScore: number
    errorTotal: number
    successTotal: number
    latencyAvg: number
    latencyMin: number
    latencyMax: number
  } | null {
    const proxy = this.db.prepare(`SELECT health_score, error_count, success_count, total_latency FROM proxy_entries WHERE id = ?`).get(proxyId) as {
      health_score: number
      error_count: number
      success_count: number
      total_latency: number
    } | undefined

    if (!proxy) return null

    const totalRequests = proxy.error_count + proxy.success_count
    const avgLatency = totalRequests > 0 ? proxy.total_latency / totalRequests : 0

    const metric = this.metrics.get(proxyId)
    return {
      healthScore: proxy.health_score,
      errorTotal: proxy.error_count,
      successTotal: proxy.success_count,
      latencyAvg: avgLatency,
      latencyMin: metric?.min || 0,
      latencyMax: metric?.max || 0,
    }
  }

  /**
   * Stop health check worker
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

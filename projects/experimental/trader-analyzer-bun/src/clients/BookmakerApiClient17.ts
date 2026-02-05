/**
 * @fileoverview BookmakerApiClient17 - Enhanced Connection Pool for Bookmaker APIs
 * @description Hyper-Bun v1.3.3+ http.Agent Connection Pool with Circuit Breaker, Retry Logic, and Proxy Support
 * @module clients/BookmakerApiClient17
 */

import http from "node:http"
import https from "node:https"
import { CircuitBreaker } from "../utils/enterprise-retry"
import { retryWithBackoff, type RetryOptions, type RetryResult } from "../utils/enterprise-retry"
import type { ProxyConfigService } from "./proxy-config-service"

/**
 * Bookmaker API client configuration
 */
export interface BookmakerClientConfig {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number
  /** Circuit breaker failure threshold (default: 5) */
  circuitBreakerThreshold?: number
  /** Circuit breaker reset timeout in ms (default: 60000) */
  circuitBreakerResetTimeout?: number
  /** Enable automatic proxy detection (default: true) */
  autoProxy?: boolean
  /** Custom proxy URL (overrides auto-detection) */
  proxyUrl?: string
  /** Request timeout in ms (default: 10000) */
  timeout?: number
  /** Rate limit: requests per second (default: 10) */
  rateLimitPerSecond?: number
  /** Enable request/response logging (default: false) */
  enableLogging?: boolean
}

/**
 * Request metrics
 */
export interface RequestMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  retries: number
  circuitBreakerTrips: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  reusedConnections: number
  connectionErrors: number
  reuseRate: number
}

/**
 * 6.1.1.2.2.8.1.1.2.10.1 Enhanced Connection Pool for Bookmaker APIs
 * Features:
 * - Fixed Bun v1.3.51.1 http.Agent keepAlive bug
 * - Circuit breaker protection
 * - Exponential backoff retry logic
 * - Automatic proxy detection with custom headers
 * - Rate limiting
 * - Request/response interceptors
 * - Health monitoring
 */
export class BookmakerApiClient17 {
  private httpsAgent: https.Agent
  private httpAgent: http.Agent
  private bookmaker: string
  private config: Required<BookmakerClientConfig>
  private circuitBreaker: CircuitBreaker
  private reusedConnections = 0
  private totalRequests = 0
  private successfulRequests = 0
  private failedRequests = 0
  private retries = 0
  private circuitBreakerTrips = 0
  private connectionErrors = 0
  private responseTimes: number[] = []
  private lastRequestTime = 0
  private requestQueue: Array<() => Promise<any>> = []
  private processingQueue = false
  private proxyUrl?: string
  private proxyToken?: string
  private proxyConfigService?: ProxyConfigService

  constructor(
    bookmaker: string,
    config: BookmakerClientConfig = {},
    proxyConfigService?: ProxyConfigService
  ) {
    this.bookmaker = bookmaker

    // Merge config with defaults
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerResetTimeout: config.circuitBreakerResetTimeout ?? 60000,
      autoProxy: config.autoProxy ?? true,
      proxyUrl: config.proxyUrl,
      timeout: config.timeout ?? 10000,
      rateLimitPerSecond: config.rateLimitPerSecond ?? 10,
      enableLogging: config.enableLogging ?? false,
    }

    // Fixed: keepAlive (NOT keepalive) - Bun v1.3.51.1
    this.httpsAgent = new https.Agent({
      keepAlive: true, // ✅ Case-sensitive, properly respected
      maxSockets: 50, // Max concurrent connections per bookmaker
      maxFreeSockets: 10, // Idle connections to keep alive
      timeout: 30000, // 30s socket timeout
      scheduling: "lifo", // Reuse most recent connections first (hot paths)
    })

    this.httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 30,
      maxFreeSockets: 5,
      timeout: 30000,
    })

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerThreshold,
      this.config.circuitBreakerResetTimeout,
      3 // half-open max attempts
    )

    // Initialize proxy configuration
    this.proxyConfigService = proxyConfigService
    if (this.config.autoProxy && !this.proxyConfigService) {
      this.initializeProxy()
    } else if (this.config.proxyUrl) {
      this.proxyUrl = this.config.proxyUrl
      this.loadProxyToken()
    }
  }

  /**
   * Initialize proxy configuration from environment/secrets
   */
  private initializeProxy(): void {
    // Check for proxy URL in environment
    this.proxyUrl = this.config.proxyUrl || process.env.BOOKMAKER_PROXY_URL || process.env[`${this.bookmaker.toUpperCase()}_PROXY_URL`]
    this.loadProxyToken()
  }

  /**
   * Load proxy authentication token from Bun.secrets or environment
   */
  private loadProxyToken(): void {
    try {
      this.proxyToken = (Bun.secrets as any)[`proxy-token-${this.bookmaker}`]
    } catch {
      // Fallback to environment variable
      this.proxyToken = process.env[`PROXY_TOKEN_${this.bookmaker.toUpperCase()}`]
    }
  }

  /**
   * Get bookmaker-specific hostname
   */
  private getBookmakerHost(): string {
    const hosts: Record<string, string> = {
      draftkings: "api.draftkings.com",
      fonbet: "api.fonbet.com",
      betfair: "api.betfair.com",
      pinnacle: "api.pinnacle.com",
      ps3838: "api.ps3838.com",
    }
    return hosts[this.bookmaker] || `api.${this.bookmaker}.com`
  }

  /**
   * Unified fetch method with automatic proxy detection and fallback
   * Uses Bun's fetch() with proxy support when available, falls back to Node.js http/https
   */
  async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const startTime = Bun.nanoseconds()
    this.totalRequests++

    // Rate limiting
    await this.enforceRateLimit()

    const retryOptions: RetryOptions = {
      maxAttempts: this.config.maxRetries,
      initialDelayMs: this.config.retryDelay,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504, "ECONNRESET", "ETIMEDOUT"],
      onRetry: (attempt, error) => {
        this.retries++
        if (this.config.enableLogging) {
          console.log(`[${this.bookmaker}] Retry attempt ${attempt}: ${error}`)
        }
      },
    }

    try {
      const result = await retryWithBackoff(
        () =>
          this.circuitBreaker.execute(async () => {
            // Use ProxyConfigService if available for dynamic proxy selection
            if (this.proxyConfigService) {
              const proxyConfig = await this.proxyConfigService.getProxyForBookmaker(
                this.bookmaker,
                { operation: options.method || "GET", requestId: crypto.randomUUID() }
              )

              if (proxyConfig) {
                const startTime = Bun.nanoseconds()
                try {
                  const data = await this.fetchMarketDataWithProxy(endpoint, options, {
                    url: proxyConfig.url,
                    headers: proxyConfig.headers,
                  })
                  const latency = (Bun.nanoseconds() - startTime) / 1_000_000
                  // Update proxy health on success
                  await this.proxyConfigService.updateProxyHealth(proxyConfig.proxyId, true, latency)
                  return data
                } catch (error) {
                  const latency = (Bun.nanoseconds() - startTime) / 1_000_000
                  // Update proxy health on failure
                  await this.proxyConfigService.updateProxyHealth(
                    proxyConfig.proxyId,
                    false,
                    latency,
                    error instanceof Error ? error.message : String(error)
                  )
                  throw error
                }
              }
            }

            // Fallback to static proxy or direct connection
            if (this.proxyUrl) {
              return this.fetchMarketDataWithProxy(endpoint, options)
            } else {
              return this.fetchMarketData(endpoint, "https", options)
            }
          }),
        retryOptions
      )

      if (result.success && result.result) {
        this.successfulRequests++
        const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000
        this.responseTimes.push(responseTime)
        // Keep only last 1000 response times for metrics
        if (this.responseTimes.length > 1000) {
          this.responseTimes.shift()
        }
        return result.result
      } else {
        this.failedRequests++
        throw result.error || new Error("Request failed")
      }
    } catch (error: any) {
      this.failedRequests++
      if (this.circuitBreaker.getState() === "open") {
        this.circuitBreakerTrips++
      }
      if (this.config.enableLogging) {
        console.error(`[${this.bookmaker}] Request failed:`, error)
      }
      throw error
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const minInterval = 1000 / this.config.rateLimitPerSecond

    if (timeSinceLastRequest < minInterval) {
      await Bun.sleep(minInterval - timeSinceLastRequest)
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Fetch market data with connection reuse (Node.js http/https)
   */
  async fetchMarketData(
    endpoint: string,
    protocol: "http" | "https" = "https",
    options: RequestInit = {}
  ): Promise<any> {
    const agent = protocol === "https" ? this.httpsAgent : this.httpAgent
    this.totalRequests++

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        Connection: "keep-alive", // ✅ Header now properly handled
        "User-Agent": "Hyper-Bun/17.3.0",
        Accept: "application/json",
      }

      // Merge custom headers from options
      if (options.headers) {
        const customHeaders = options.headers as Record<string, string>
        Object.assign(headers, customHeaders)
      }

      const req = (protocol === "https" ? https : http).request(
        {
          hostname: this.getBookmakerHost(),
          port: protocol === "https" ? 443 : 80,
          path: endpoint,
          method: options.method || "GET",
          agent: agent, // ✅ Connection pool properly reused
          headers,
          timeout: this.config.timeout,
        },
        (res) => {
          let data = ""
          res.on("data", (chunk) => (data += chunk))
          res.on("end", () => {
            // ✅ Case-insensitive header parsing ensures connection stays open
            if (res.headers["keep-alive"] || res.headers["Keep-Alive"]) {
              this.reusedConnections++
            }

            try {
              resolve(JSON.parse(data))
            } catch (error) {
              reject(new Error(`JSON parse error: ${error}`))
            }
          })
        }
      )

      req.on("error", (error) => {
        this.connectionErrors++
        reject(error)
      })

      req.setTimeout(10000, () => {
        req.destroy()
        this.connectionErrors++
        reject(new Error("Request timeout"))
      })

      req.end()
    })
  }

  /**
   * Fetch market data using Bun's fetch() with proxy support (Bun v1.3.3+)
   * Supports custom proxy headers for authentication and routing
   * 
   * @param endpoint - API endpoint path
   * @param options - Optional fetch options
   * @param proxyConfig - Optional proxy configuration with custom headers (overrides auto-detected)
   */
  async fetchMarketDataWithProxy(
    endpoint: string,
    options: RequestInit = {},
    proxyConfig?: {
      url: string
      headers?: Record<string, string>
    }
  ): Promise<any> {
    const baseUrl = `https://${this.getBookmakerHost()}${endpoint}`
    
    // Use provided proxy config or fall back to auto-detected
    const proxyUrl = proxyConfig?.url || this.proxyUrl
    const proxyToken = this.proxyToken

    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        "User-Agent": "Hyper-Bun/17.3.0",
        Accept: "application/json",
        ...options.headers,
      },
      // Use http.Agent for connection pooling
      agent: this.httpsAgent,
      signal: AbortSignal.timeout(this.config.timeout),
    }

    // Add proxy configuration if available
    if (proxyUrl) {
      ;(fetchOptions as any).proxy = {
        url: proxyUrl,
        headers: {
          // Proxy authentication (takes precedence over URL credentials)
          ...(proxyToken && { "Proxy-Authorization": `Bearer ${proxyToken}` }),
          // Custom routing headers
          "X-Target-Region": process.env.PROXY_TARGET_REGION || "us-east-1",
          "X-Bookmaker-ID": this.bookmaker,
          "X-Rate-Limit-Tier": "premium",
          "X-Connection-Pool": "keep-alive",
          // Merge any additional custom headers
          ...proxyConfig?.headers,
        },
      }
    }

    const response = await fetch(baseUrl, fetchOptions)
    
    // Track connection reuse
    const connectionHeader = response.headers.get("connection")
    if (connectionHeader?.toLowerCase() === "keep-alive") {
      this.reusedConnections++
    }

    if (!response.ok) {
      this.connectionErrors++
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return await response.json()
  }

  /**
   * Get comprehensive agent statistics for monitoring
   */
  getAgentStats() {
    // Access internal agent properties (Node.js http.Agent internals)
    const agent = this.httpsAgent as any
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0

    return {
      bookmaker: this.bookmaker,
      totalSocketCount: agent.sockets ? Object.keys(agent.sockets).length : 0,
      freeSockets: agent.freeSockets ? Object.keys(agent.freeSockets).length : 0,
      pendingRequestCount: agent.requests ? Object.keys(agent.requests).length : 0,
      reusedConnections: this.reusedConnections,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      retries: this.retries,
      circuitBreakerTrips: this.circuitBreakerTrips,
      connectionErrors: this.connectionErrors,
      reuseRate: this.totalRequests > 0 ? this.reusedConnections / this.totalRequests : 0,
      successRate: this.totalRequests > 0 ? this.successfulRequests / this.totalRequests : 0,
      averageResponseTime: avgResponseTime,
      minResponseTime: this.responseTimes.length > 0 ? Math.min(...this.responseTimes) : 0,
      maxResponseTime: this.responseTimes.length > 0 ? Math.max(...this.responseTimes) : 0,
      circuitBreakerState: this.circuitBreaker.getState(),
      proxyConfigured: !!this.proxyUrl,
    }
  }

  /**
   * Get detailed request metrics
   */
  getMetrics(): RequestMetrics {
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      retries: this.retries,
      circuitBreakerTrips: this.circuitBreakerTrips,
      averageResponseTime: avgResponseTime,
      minResponseTime: this.responseTimes.length > 0 ? Math.min(...this.responseTimes) : 0,
      maxResponseTime: this.responseTimes.length > 0 ? Math.max(...this.responseTimes) : 0,
      reusedConnections: this.reusedConnections,
      connectionErrors: this.connectionErrors,
      reuseRate: this.totalRequests > 0 ? this.reusedConnections / this.totalRequests : 0,
    }
  }

  /**
   * Check if client is healthy
   */
  isHealthy(): boolean {
    const metrics = this.getMetrics()
    const errorRate = metrics.totalRequests > 0
      ? metrics.failedRequests / metrics.totalRequests
      : 0

    return (
      this.circuitBreaker.getState() !== "open" &&
      errorRate < 0.5 && // Less than 50% error rate
      metrics.connectionErrors < 10 // Less than 10 connection errors
    )
  }

  /**
   * Reset circuit breaker (for testing/recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset()
  }

  /**
   * Properly destroy agent on shutdown (prevents fd leaks)
   */
  async destroy(): Promise<void> {
    this.httpsAgent.destroy()
    this.httpAgent.destroy()
  }
}

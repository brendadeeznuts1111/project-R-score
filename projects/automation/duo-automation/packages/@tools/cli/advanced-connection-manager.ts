#!/usr/bin/env bun
// Advanced Connection Management System
// HTTP Keep-Alive, Connection Pooling, Dedicated Headers, and Persistent Cookie Management

import { UnifiedColorTensionEcosystem } from './unified-ecosystem-demo';

// =============================================================================
// ADVANCED CONNECTION MANAGEMENT
// =============================================================================

/**
 * Connection configuration with pooling and keep-alive settings
 */
export interface ConnectionConfig {
  /** Connection pool settings */
  pool: {
    maxConnections: number;      // Maximum connections in pool
    minConnections: number;      // Minimum connections to maintain
    acquireTimeout: number;      // Timeout to acquire connection (ms)
    idleTimeout: number;         // Idle connection timeout (ms)
    maxLifetime: number;         // Maximum connection lifetime (ms)
    healthCheckInterval: number; // Health check interval (ms)
  };
  /** HTTP keep-alive settings */
  keepAlive: {
    enabled: boolean;            // Enable HTTP keep-alive
    timeout: number;             // Keep-alive timeout (ms)
    maxRequests: number;         // Max requests per connection
    maxIdleTime: number;         // Max idle time per connection (ms)
  };
  /** Dedicated headers for all requests */
  headers: {
    userAgent: string;           // Custom user agent
    authorization?: string;      // Authorization header
    xApiKey?: string;           // API key header
    xClientVersion: string;      // Client version
    xRequestId: () => string;    // Request ID generator
    xTimestamp: () => string;    // Timestamp generator
    custom: Record<string, string>; // Custom headers
  };
  /** Cookie management settings */
  cookies: {
    enabled: boolean;            // Enable cookie persistence
    store: CookieStore;          // Cookie storage implementation
    autoRefresh: boolean;        // Auto-refresh expired cookies
    secure: boolean;             // Secure cookie handling
    sameSite: 'strict' | 'lax' | 'none'; // SameSite policy
  };
  /** Retry and resilience settings */
  resilience: {
    maxRetries: number;          // Maximum retry attempts
    retryDelay: number;          // Base retry delay (ms)
    backoffMultiplier: number;    // Exponential backoff multiplier
    circuitBreakerThreshold: number; // Circuit breaker threshold
    timeout: number;             // Request timeout (ms)
  };
}

/**
 * Cookie interface for persistent storage
 */
export interface PersistentCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Cookie storage interface
 */
export interface CookieStore {
  get(name: string): PersistentCookie | undefined;
  set(cookie: PersistentCookie): void;
  delete(name: string, domain?: string, path?: string): void;
  getAll(): PersistentCookie[];
  clear(): void;
  export(): string;
  import(cookieData: string): void;
}

/**
 * In-memory cookie store implementation
 */
export class InMemoryCookieStore implements CookieStore {
  private cookies: Map<string, PersistentCookie> = new Map();

  get(name: string): PersistentCookie | undefined {
    return this.cookies.get(name);
  }

  set(cookie: PersistentCookie): void {
    this.cookies.set(cookie.name, cookie);
  }

  delete(name: string, domain?: string, path?: string): void {
    this.cookies.delete(name);
  }

  getAll(): PersistentCookie[] {
    return Array.from(this.cookies.values());
  }

  clear(): void {
    this.cookies.clear();
  }

  export(): string {
    return JSON.stringify(Array.from(this.cookies.entries()));
  }

  import(cookieData: string): void {
    try {
      const entries = JSON.parse(cookieData) as [string, PersistentCookie][];
      this.cookies = new Map(entries);
    } catch (error) {
      console.error('Failed to import cookies:', error);
    }
  }
}

/**
 * File-based cookie store for persistence
 */
export class FileCookieStore implements CookieStore {
  private filePath: string;
  private memoryStore: InMemoryCookieStore;

  constructor(filePath: string = './cookies.json') {
    this.filePath = filePath;
    this.memoryStore = new InMemoryCookieStore();
    this.loadFromFile();
  }

  private async loadFromFile(): Promise<void> {
    try {
      const file = Bun.file(this.filePath);
      if (file.exists) {
        const data = await file.text();
        this.memoryStore.import(data);
      }
    } catch (error) {
      console.warn('Failed to load cookies from file:', error);
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const data = this.memoryStore.export();
      await Bun.write(this.filePath, data);
    } catch (error) {
      console.error('Failed to save cookies to file:', error);
    }
  }

  get(name: string): PersistentCookie | undefined {
    return this.memoryStore.get(name);
  }

  set(cookie: PersistentCookie): void {
    this.memoryStore.set(cookie);
    this.saveToFile().catch(console.error);
  }

  delete(name: string, domain?: string, path?: string): void {
    this.memoryStore.delete(name, domain, path);
    this.saveToFile().catch(console.error);
  }

  getAll(): PersistentCookie[] {
    return this.memoryStore.getAll();
  }

  clear(): void {
    this.memoryStore.clear();
    this.saveToFile().catch(console.error);
  }

  export(): string {
    return this.memoryStore.export();
  }

  import(cookieData: string): void {
    this.memoryStore.import(cookieData);
    this.saveToFile().catch(console.error);
  }
}

/**
 * Connection pool entry
 */
interface PooledConnection {
  id: string;
  connection: any; // HTTP connection or similar
  created: Date;
  lastUsed: Date;
  requestCount: number;
  isActive: boolean;
  healthScore: number;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
}

/**
 * Advanced connection manager with pooling and keep-alive
 */
export class AdvancedConnectionManager {
  private config: ConnectionConfig;
  private connectionPool: Map<string, PooledConnection[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private cookieStore: CookieStore;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    poolHits: number;
    poolMisses: number;
    averageResponseTime: number;
    circuitBreakerActivations: number;
  };

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = this.createDefaultConfig(config);
    this.cookieStore = this.config.cookies.store;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      poolHits: 0,
      poolMisses: 0,
      averageResponseTime: 0,
      circuitBreakerActivations: 0
    };

    this.startHealthChecks();
  }

  /**
   * Create default connection configuration
   */
  private createDefaultConfig(overrides: Partial<ConnectionConfig>): ConnectionConfig {
    return {
      pool: {
        maxConnections: 10,
        minConnections: 2,
        acquireTimeout: 5000,
        idleTimeout: 30000,
        maxLifetime: 300000, // 5 minutes
        healthCheckInterval: 10000, // 10 seconds
        ...overrides.pool
      },
      keepAlive: {
        enabled: true,
        timeout: 60000, // 1 minute
        maxRequests: 1000,
        maxIdleTime: 30000, // 30 seconds
        ...overrides.keepAlive
      },
      headers: {
        userAgent: 'DuoPlus-Ecosystem/1.0 (Advanced-Connection-Manager)',
        xClientVersion: '3.7.0',
        xRequestId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        xTimestamp: () => new Date().toISOString(),
        custom: {},
        ...overrides.headers
      },
      cookies: {
        enabled: true,
        store: new FileCookieStore(),
        autoRefresh: true,
        secure: true,
        sameSite: 'strict',
        ...overrides.cookies
      },
      resilience: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        circuitBreakerThreshold: 5,
        timeout: 10000,
        ...overrides.resilience
      },
      ...overrides
    };
  }

  /**
   * Start health check interval
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.pool.healthCheckInterval);
  }

  /**
   * Perform health checks on pooled connections
   */
  private performHealthChecks(): void {
    for (const [host, connections] of this.connectionPool.entries()) {
      const now = new Date();
      
      for (let i = connections.length - 1; i >= 0; i--) {
        const conn = connections[i];
        
        // Remove idle connections
        if (now.getTime() - conn.lastUsed.getTime() > this.config.pool.idleTimeout) {
          this.closeConnection(conn);
          connections.splice(i, 1);
          continue;
        }
        
        // Remove old connections
        if (now.getTime() - conn.created.getTime() > this.config.pool.maxLifetime) {
          this.closeConnection(conn);
          connections.splice(i, 1);
          continue;
        }
        
        // Update health score
        conn.healthScore = this.calculateHealthScore(conn);
      }
      
      // Maintain minimum connections
      while (connections.length < this.config.pool.minConnections) {
        this.createConnection(host);
      }
    }
  }

  /**
   * Calculate connection health score
   */
  private calculateHealthScore(connection: PooledConnection): number {
    const age = Date.now() - connection.created.getTime();
    const idleTime = Date.now() - connection.lastUsed.getTime();
    const requestLoad = connection.requestCount / this.config.keepAlive.maxRequests;
    
    // Health score decreases with age and load
    let score = 100;
    score -= (age / this.config.pool.maxLifetime) * 30;
    score -= (idleTime / this.config.pool.idleTimeout) * 20;
    score -= requestLoad * 50;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Acquire connection from pool
   */
  private async acquireConnection(host: string): Promise<PooledConnection> {
    const connections = this.connectionPool.get(host) || [];
    
    // Find healthy, available connection
    const availableConnection = connections.find(conn => 
      !conn.isActive && 
      conn.healthScore > 50 && 
      conn.requestCount < this.config.keepAlive.maxRequests
    );
    
    if (availableConnection) {
      availableConnection.isActive = true;
      availableConnection.lastUsed = new Date();
      this.metrics.poolHits++;
      return availableConnection;
    }
    
    // Create new connection if pool not full
    if (connections.length < this.config.pool.maxConnections) {
      const newConnection = this.createConnection(host);
      this.metrics.poolMisses++;
      return newConnection;
    }
    
    // Wait for available connection
    return this.waitForAvailableConnection(host);
  }

  /**
   * Wait for available connection
   */
  private async waitForAvailableConnection(host: string): Promise<PooledConnection> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.pool.acquireTimeout) {
      const connections = this.connectionPool.get(host) || [];
      const availableConnection = connections.find(conn => 
        !conn.isActive && 
        conn.healthScore > 50
      );
      
      if (availableConnection) {
        availableConnection.isActive = true;
        availableConnection.lastUsed = new Date();
        return availableConnection;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Failed to acquire connection for ${host} within timeout`);
  }

  /**
   * Create new connection
   */
  private createConnection(host: string): PooledConnection {
    const connection: PooledConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connection: this.createUnderlyingConnection(host),
      created: new Date(),
      lastUsed: new Date(),
      requestCount: 0,
      isActive: true,
      healthScore: 100
    };
    
    const connections = this.connectionPool.get(host) || [];
    connections.push(connection);
    this.connectionPool.set(host, connections);
    
    return connection;
  }

  /**
   * Create underlying HTTP connection
   */
  private createUnderlyingConnection(host: string): any {
    // This would integrate with Bun's HTTP client or similar
    // For now, return a mock connection object
    return {
      host,
      keepAlive: this.config.keepAlive.enabled,
      timeout: this.config.resilience.timeout,
      created: new Date()
    };
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(connection: PooledConnection): void {
    connection.isActive = false;
    connection.lastUsed = new Date();
    connection.requestCount++;
  }

  /**
   * Close connection
   */
  private closeConnection(connection: PooledConnection): void {
    // Close underlying connection
    if (connection.connection && typeof connection.connection.close === 'function') {
      connection.connection.close();
    }
  }

  /**
   * Check circuit breaker
   */
  private checkCircuitBreaker(host: string): boolean {
    const breaker = this.circuitBreakers.get(host);
    
    if (!breaker) {
      return true; // No breaker, allow requests
    }
    
    const now = new Date();
    
    if (breaker.isOpen) {
      if (now >= breaker.nextAttemptTime) {
        // Try to close breaker
        breaker.isOpen = false;
        breaker.failureCount = 0;
        return true;
      }
      return false; // Breaker is still open
    }
    
    return true; // Breaker is closed
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(host: string): void {
    const breaker = this.circuitBreakers.get(host) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      nextAttemptTime: new Date()
    };
    
    breaker.failureCount++;
    breaker.lastFailureTime = new Date();
    
    if (breaker.failureCount >= this.config.resilience.circuitBreakerThreshold) {
      breaker.isOpen = true;
      breaker.nextAttemptTime = new Date(
        Date.now() + (this.config.resilience.retryDelay * Math.pow(this.config.resilience.backoffMultiplier, breaker.failureCount))
      );
      this.metrics.circuitBreakerActivations++;
    }
    
    this.circuitBreakers.set(host, breaker);
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.headers.userAgent,
      'X-Client-Version': this.config.headers.xClientVersion,
      'X-Request-ID': this.config.headers.xRequestId(),
      'X-Timestamp': this.config.headers.xTimestamp(),
      'Connection': this.config.keepAlive.enabled ? 'keep-alive' : 'close',
      'Keep-Alive': `timeout=${this.config.keepAlive.timeout / 1000}, max=${this.config.keepAlive.maxRequests}`,
      ...this.config.headers.custom,
      ...customHeaders
    };
    
    if (this.config.headers.authorization) {
      headers['Authorization'] = this.config.headers.authorization;
    }
    
    if (this.config.headers.xApiKey) {
      headers['X-API-Key'] = this.config.headers.xApiKey;
    }
    
    return headers;
  }

  /**
   * Build cookie header
   */
  private buildCookieHeader(host: string): string {
    if (!this.config.cookies.enabled) {
      return '';
    }
    
    const cookies = this.cookieStore.getAll();
    const relevantCookies = cookies.filter(cookie => 
      !cookie.domain || cookie.domain === host || host.endsWith(cookie.domain)
    );
    
    if (relevantCookies.length === 0) {
      return '';
    }
    
    return relevantCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  }

  /**
   * Parse and store cookies from response
   */
  private parseAndStoreCookies(setCookieHeaders: string[], host: string): void {
    if (!this.config.cookies.enabled || !setCookieHeaders) {
      return;
    }
    
    setCookieHeaders.forEach(header => {
      const cookie = this.parseSetCookieHeader(header, host);
      if (cookie) {
        this.cookieStore.set(cookie);
      }
    });
  }

  /**
   * Parse Set-Cookie header
   */
  private parseSetCookieHeader(header: string, host: string): PersistentCookie | null {
    try {
      const parts = header.split(';');
      const [nameValue] = parts[0].split('=');
      
      if (!nameValue) {
        return null;
      }
      
      const cookie: PersistentCookie = {
        name: nameValue.trim(),
        value: parts[0].substring(nameValue.length + 1).trim(),
        domain: host
      };
      
      // Parse attributes
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim().toLowerCase();
        
        if (part.startsWith('expires=')) {
          cookie.expires = new Date(part.substring(8));
        } else if (part.startsWith('max-age=')) {
          cookie.maxAge = parseInt(part.substring(8));
        } else if (part.startsWith('domain=')) {
          cookie.domain = part.substring(7);
        } else if (part.startsWith('path=')) {
          cookie.path = part.substring(5);
        } else if (part === 'secure') {
          cookie.secure = true;
        } else if (part === 'httponly') {
          cookie.httpOnly = true;
        } else if (part === 'samesite=strict') {
          cookie.sameSite = 'strict';
        } else if (part === 'samesite=lax') {
          cookie.sameSite = 'lax';
        } else if (part === 'samesite=none') {
          cookie.sameSite = 'none';
        }
      }
      
      return cookie;
    } catch (error) {
      console.error('Failed to parse Set-Cookie header:', error);
      return null;
    }
  }

  /**
   * Make HTTP request with connection management
   */
  async request(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    body?: string | object;
    timeout?: number;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
    metrics: {
      responseTime: number;
      connectionId: string;
      fromPool: boolean;
      retries: number;
    };
  }> {
    const startTime = Date.now();
    const url = new URL(options.url);
    const host = url.host;
    let retries = 0;
    let lastError: Error | null = null;
    
    // Check circuit breaker
    if (!this.checkCircuitBreaker(host)) {
      throw new Error(`Circuit breaker is open for ${host}`);
    }
    
    while (retries <= this.config.resilience.maxRetries) {
      try {
        this.metrics.totalRequests++;
        
        // Acquire connection
        const connection = await this.acquireConnection(host);
        
        try {
          // Build headers
          const headers = this.buildHeaders(options.headers);
          const cookieHeader = this.buildCookieHeader(host);
          
          if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
          }
          
          // Make request (this would integrate with Bun's HTTP client)
          const response = await this.makeUnderlyingRequest(connection, {
            ...options,
            headers,
            timeout: options.timeout || this.config.resilience.timeout
          });
          
          // Parse and store cookies
          const setCookieHeaders = response.headers['set-cookie'] || [];
          this.parseAndStoreCookies(Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders], host);
          
          // Update metrics
          this.metrics.successfulRequests++;
          const responseTime = Date.now() - startTime;
          this.updateAverageResponseTime(responseTime);
          
          // Release connection
          this.releaseConnection(connection);
          
          return {
            status: response.status,
            headers: response.headers,
            body: response.body,
            metrics: {
              responseTime,
              connectionId: connection.id,
              fromPool: this.metrics.poolHits > this.metrics.poolMisses,
              retries
            }
          };
          
        } catch (error) {
          this.releaseConnection(connection);
          throw error;
        }
        
      } catch (error) {
        lastError = error as Error;
        retries++;
        
        if (retries <= this.config.resilience.maxRetries) {
          // Exponential backoff
          const delay = this.config.resilience.retryDelay * Math.pow(this.config.resilience.backoffMultiplier, retries - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Record failure
    this.metrics.failedRequests++;
    this.recordCircuitBreakerFailure(host);
    
    throw lastError || new Error('Request failed after maximum retries');
  }

  /**
   * Make underlying HTTP request (mock implementation)
   */
  private async makeUnderlyingRequest(connection: PooledConnection, options: any): Promise<any> {
    // This would integrate with Bun's HTTP client
    // For now, return a mock response
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
    
    return {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-response-time': Date.now().toString()
      },
      body: {
        message: 'Success',
        timestamp: new Date().toISOString(),
        connectionId: connection.id
      }
    };
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const total = this.metrics.totalRequests;
    const current = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = ((current * (total - 1)) + responseTime) / total;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): typeof this.metrics & {
    poolUtilization: number;
    averageConnectionsPerHost: number;
    circuitBreakerStatus: Record<string, boolean>;
  } {
    let totalConnections = 0;
    const circuitBreakerStatus: Record<string, boolean> = {};
    
    for (const [host, connections] of this.connectionPool.entries()) {
      totalConnections += connections.length;
      circuitBreakerStatus[host] = this.circuitBreakers.get(host)?.isOpen || false;
    }
    
    return {
      ...this.metrics,
      poolUtilization: totalConnections / (this.connectionPool.size * this.config.pool.maxConnections),
      averageConnectionsPerHost: this.connectionPool.size > 0 ? totalConnections / this.connectionPool.size : 0,
      circuitBreakerStatus
    };
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(): {
    totalHosts: number;
    totalConnections: number;
    activeConnections: number;
    averageHealthScore: number;
    connectionsByHost: Record<string, number>;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    let totalHealthScore = 0;
    const connectionsByHost: Record<string, number> = {};
    
    for (const [host, connections] of this.connectionPool.entries()) {
      connectionsByHost[host] = connections.length;
      totalConnections += connections.length;
      activeConnections += connections.filter(conn => conn.isActive).length;
      totalHealthScore += connections.reduce((sum, conn) => sum + conn.healthScore, 0);
    }
    
    return {
      totalHosts: this.connectionPool.size,
      totalConnections,
      activeConnections,
      averageHealthScore: totalConnections > 0 ? totalHealthScore / totalConnections : 0,
      connectionsByHost
    };
  }

  /**
   * Get cookie information
   */
  getCookies(): {
    total: number;
    byDomain: Record<string, number>;
    expired: number;
    secure: number;
  } {
    const cookies = this.cookieStore.getAll();
    const byDomain: Record<string, number> = {};
    let expired = 0;
    let secure = 0;
    
    cookies.forEach(cookie => {
      const domain = cookie.domain || 'default';
      byDomain[domain] = (byDomain[domain] || 0) + 1;
      
      if (cookie.expires && cookie.expires < new Date()) {
        expired++;
      }
      
      if (cookie.secure) {
        secure++;
      }
    });
    
    return {
      total: cookies.length,
      byDomain,
      expired,
      secure
    };
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Close all connections
    for (const connections of this.connectionPool.values()) {
      connections.forEach(conn => this.closeConnection(conn));
    }
    
    this.connectionPool.clear();
    this.circuitBreakers.clear();
    
    // Save cookies if needed
    if (this.config.cookies.enabled) {
      // Cookies are automatically saved by FileCookieStore
    }
  }
}

// =============================================================================
// ECOSYSTEM INTEGRATION WITH CONNECTION MANAGEMENT
// =============================================================================

/**
 * Enhanced ecosystem with connection management
 */
export class ConnectedEcosystem extends UnifiedColorTensionEcosystem {
  private connectionManager: AdvancedConnectionManager;

  constructor(thresholds: Partial<MonitoringThresholds> = {}, connectionConfig: Partial<ConnectionConfig> = {}) {
    super(thresholds);
    this.connectionManager = new AdvancedConnectionManager(connectionConfig);
  }

  /**
   * Make monitored request
   */
  async makeMonitoredRequest(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    body?: string | object;
    systemId?: string;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await this.connectionManager.request(options);
      
      // Update system metrics based on response
      if (options.systemId) {
        this.updateSystemMetrics(options.systemId, {
          responseTime: response.metrics.responseTime,
          success: response.status < 400,
          connectionId: response.metrics.connectionId
        });
      }
      
      return response;
      
    } catch (error) {
      // Record failure
      if (options.systemId) {
        this.updateSystemMetrics(options.systemId, {
          responseTime: Date.now() - startTime,
          success: false,
          error: (error as Error).message
        });
      }
      
      throw error;
    }
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(systemId: string, metrics: {
    responseTime: number;
    success: boolean;
    connectionId?: string;
    error?: string;
  }): void {
    const system = this.getSystemState(systemId);
    if (system) {
      // Update performance metrics
      system.performance.responseTime = metrics.responseTime;
      
      if (!metrics.success) {
        system.performance.errorRate += 0.01;
      }
      
      // Trigger update notification
      this.notifySubscribers(system);
    }
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ReturnType<AdvancedConnectionManager['getMetrics']> {
    return this.connectionManager.getMetrics();
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(): ReturnType<AdvancedConnectionManager['getPoolStatistics']> {
    return this.connectionManager.getPoolStatistics();
  }

  /**
   * Get cookie information
   */
  getConnectionCookies(): ReturnType<AdvancedConnectionManager['getCookies']> {
    return this.connectionManager.getCookies();
  }

  /**
   * Close ecosystem and connections
   */
  async close(): Promise<void> {
    await this.connectionManager.close();
    super.stop();
  }
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate advanced connection management
 */
async function demonstrateConnectionManagement(): Promise<void> {
  console.log('🌐 ADVANCED CONNECTION MANAGEMENT DEMONSTRATION');
  console.log('=' .repeat(60));

  // Create connection manager with custom configuration
  const connectionConfig: Partial<ConnectionConfig> = {
    pool: {
      maxConnections: 5,
      minConnections: 1,
      acquireTimeout: 3000,
      idleTimeout: 15000,
      healthCheckInterval: 5000
    },
    keepAlive: {
      enabled: true,
      timeout: 30000,
      maxRequests: 500
    },
    headers: {
      userAgent: 'DuoPlus-Ecosystem/1.0 (Connection-Management-Demo)',
      custom: {
        'X-Environment': 'demo',
        'X-Feature-Flags': 'connection-pooling,keep-alive,cookie-management'
      }
    },
    cookies: {
      enabled: true,
      store: new InMemoryCookieStore(),
      secure: true,
      sameSite: 'strict'
    },
    resilience: {
      maxRetries: 2,
      retryDelay: 500,
      circuitBreakerThreshold: 3
    }
  };

  const connectionManager = new AdvancedConnectionManager(connectionConfig);

  console.log('\n📊 CONNECTION MANAGER INITIALIZED:');
  console.log(`  Pool: ${connectionConfig.pool?.maxConnections} max, ${connectionConfig.pool?.minConnections} min connections`);
  console.log(`  Keep-Alive: ${connectionConfig.keepAlive?.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Cookies: ${connectionConfig.cookies?.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Retries: ${connectionConfig.resilience?.maxRetries} max`);

  // Demonstrate connection pooling
  console.log('\n🔄 TESTING CONNECTION POOLING:');
  
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(connectionManager.request({
      method: 'GET',
      url: 'https://api.example.com/health',
      headers: {
        'X-Request-Index': i.toString()
      }
    }));
  }

  const responses = await Promise.allSettled(requests);
  
  console.log(`  Sent 10 concurrent requests`);
  console.log(`  Successful: ${responses.filter(r => r.status === 'fulfilled').length}`);
  console.log(`  Failed: ${responses.filter(r => r.status === 'rejected').length}`);

  // Show metrics
  console.log('\n📈 CONNECTION METRICS:');
  const metrics = connectionManager.getMetrics();
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(`  Successful: ${metrics.successfulRequests}`);
  console.log(`  Failed: ${metrics.failedRequests}`);
  console.log(`  Pool Hits: ${metrics.poolHits}`);
  console.log(`  Pool Misses: ${metrics.poolMisses}`);
  console.log(`  Average Response Time: ${Math.round(metrics.averageResponseTime)}ms`);
  console.log(`  Circuit Breaker Activations: ${metrics.circuitBreakerActivations}`);
  console.log(`  Pool Utilization: ${Math.round(metrics.poolUtilization * 100)}%`);

  // Show pool statistics
  console.log('\n🏊 POOL STATISTICS:');
  const poolStats = connectionManager.getPoolStatistics();
  console.log(`  Total Hosts: ${poolStats.totalHosts}`);
  console.log(`  Total Connections: ${poolStats.totalConnections}`);
  console.log(`  Active Connections: ${poolStats.activeConnections}`);
  console.log(`  Average Health Score: ${Math.round(poolStats.averageHealthScore)}%`);
  console.log('  Connections by Host:', poolStats.connectionsByHost);

  // Demonstrate cookie management
  console.log('\n🍪 COOKIE MANAGEMENT:');
  
  // Add some cookies
  connectionManager['cookieStore'].set({
    name: 'session_id',
    value: 'abc123',
    domain: 'api.example.com',
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  });
  
  connectionManager['cookieStore'].set({
    name: 'user_preferences',
    value: 'theme=dark;lang=en',
    domain: 'api.example.com',
    maxAge: 3600
  });

  const cookieInfo = connectionManager.getCookies();
  console.log(`  Total Cookies: ${cookieInfo.total}`);
  console.log(`  Secure Cookies: ${cookieInfo.secure}`);
  console.log(`  Expired Cookies: ${cookieInfo.expired}`);
  console.log('  Cookies by Domain:', cookieInfo.byDomain);

  // Demonstrate ecosystem integration
  console.log('\n🌟 ECOSYSTEM INTEGRATION:');
  
  const ecosystem = new ConnectedEcosystem(undefined, connectionConfig);
  
  console.log('  Making monitored requests...');
  
  try {
    const response = await ecosystem.makeMonitoredRequest({
      method: 'GET',
      url: 'https://api.example.com/metrics',
      systemId: 'STORAGE-ENTERPRISE-duoplus'
    });
    
    console.log(`  Response Status: ${response.status}`);
    console.log(`  Response Time: ${response.metrics.responseTime}ms`);
    console.log(`  Connection ID: ${response.metrics.connectionId}`);
    console.log(`  From Pool: ${response.metrics.fromPool}`);
    console.log(`  Retries: ${response.metrics.retries}`);
    
  } catch (error) {
    console.log(`  Request failed: ${(error as Error).message}`);
  }

  // Get ecosystem metrics
  console.log('\n📊 ECOSYSTEM METRICS:');
  const ecosystemMetrics = ecosystem.getConnectionMetrics();
  const ecosystemPoolStats = ecosystem.getPoolStatistics();
  const ecosystemCookies = ecosystem.getConnectionCookies();
  
  console.log(`  Connection Metrics: ${ecosystemMetrics.totalRequests} requests`);
  console.log(`  Pool Statistics: ${ecosystemPoolStats.totalConnections} connections`);
  console.log(`  Cookie Management: ${ecosystemCookies.total} cookies`);

  // Cleanup
  console.log('\n🧹 CLEANING UP...');
  await connectionManager.close();
  await ecosystem.close();

  console.log('\n✅ ADVANCED CONNECTION MANAGEMENT DEMONSTRATION COMPLETE!');
  console.log('\n📋 CONNECTION MANAGEMENT FEATURES:');
  console.log('  🌐 HTTP Keep-Alive for connection reuse');
  console.log('  🏊 Connection pooling with health monitoring');
  console.log('  🍪 Persistent cookie management');
  console.log('  🔧 Dedicated headers with request tracking');
  console.log('  ⚡ Circuit breaker pattern for resilience');
  console.log('  🔄 Retry logic with exponential backoff');
  console.log('  📊 Comprehensive metrics and monitoring');
  console.log('  🔒 Secure cookie handling');
  console.log('  🎯 Ecosystem integration with monitoring');

  console.log('\n🔧 USAGE EXAMPLES:');
  console.log('  // Create connection manager');
  console.log('  const manager = new AdvancedConnectionManager({');
  console.log('    pool: { maxConnections: 10, minConnections: 2 },');
  console.log('    keepAlive: { enabled: true, timeout: 60000 },');
  console.log('    headers: { custom: { "X-API-Version": "1.0" } },');
  console.log('    cookies: { enabled: true, store: new FileCookieStore() }');
  console.log('  });');
  console.log('');
  console.log('  // Make request with pooling');
  console.log('  const response = await manager.request({');
  console.log('    method: "GET",');
  console.log('    url: "https://api.example.com/data",');
  console.log('    headers: { "Authorization": "Bearer token" }');
  console.log('  });');
  console.log('');
  console.log('  // Use with ecosystem');
  console.log('  const ecosystem = new ConnectedEcosystem(undefined, connectionConfig);');
  console.log('  const response = await ecosystem.makeMonitoredRequest({');
  console.log('    method: "POST",');
  console.log('    url: "https://api.example.com/metrics",');
  console.log('    systemId: "STORAGE-ENTERPRISE-duoplus",');
  console.log('    body: { metrics: data }');
  console.log('  });');
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  demonstrateConnectionManagement().catch(console.error);
}

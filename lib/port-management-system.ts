#!/usr/bin/env bun
/**
 * Port Management and Connection Pooling System
 * 
 * Solves port conflicts with dedicated port properties per project
 * and implements Bun's simultaneous connection limits for optimal performance.
 */

// Entry guard check
if (import.meta.main) {
  // Only run when executed directly
  main().catch(console.error);
} else {
  console.log('ℹ️  Script was imported, not executed directly');
}

import { readFileSync, existsSync } from 'fs';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const VALIDATION_CONSTANTS = {
  PORT: {
    MIN: 1,
    MAX: 65535,
    USER_MIN: 1024,      // Below this requires root privileges
    USER_MAX: 49151,      // Above this is for dynamic/private ports
    PRACTICAL_MIN: 3000,  // Common starting point for apps
    PRACTICAL_MAX: 32767  // Safe upper range
  },
  CONNECTIONS: {
    MIN: 1,
    MAX: 65336,           // Bun's documented maximum
    PRACTICAL_MIN: 10,    // Minimum useful connections
    PRACTICAL_MAX: 1000,  // Practical upper limit for most apps
    DEFAULT: 512          // Bun's default
  }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

class ValidationUtils {
  /**
   * Validate port number is within acceptable range
   */
  static validatePort(port: number, context: string = 'Port'): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof port !== 'number' || isNaN(port)) {
      errors.push(`${context}: Port must be a valid number, got ${typeof port}`);
      return { isValid: false, errors };
    }

    if (port < VALIDATION_CONSTANTS.PORT.MIN) {
      errors.push(`${context}: Port ${port} is below minimum (${VALIDATION_CONSTANTS.PORT.MIN})`);
    }

    if (port > VALIDATION_CONSTANTS.PORT.MAX) {
      errors.push(`${context}: Port ${port} exceeds maximum (${VALIDATION_CONSTANTS.PORT.MAX})`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate connection limit is within acceptable range
   */
  static validateConnectionLimit(limit: number, context: string = 'Connection limit'): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof limit !== 'number' || isNaN(limit)) {
      errors.push(`${context}: Must be a valid number, got ${typeof limit}`);
      return { isValid: false, errors };
    }

    if (limit < VALIDATION_CONSTANTS.CONNECTIONS.MIN) {
      errors.push(`${context}: ${limit} is below minimum (${VALIDATION_CONSTANTS.CONNECTIONS.MIN})`);
    }

    if (limit > VALIDATION_CONSTANTS.CONNECTIONS.MAX) {
      errors.push(`${context}: ${limit} exceeds Bun's maximum (${VALIDATION_CONSTANTS.CONNECTIONS.MAX})`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate port range
   */
  static validatePortRange(start: number, end: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const startValidation = this.validatePort(start, 'Range start');
    const endValidation = this.validatePort(end, 'Range end');

    errors.push(...startValidation.errors);
    errors.push(...endValidation.errors);

    if (start > end) {
      errors.push(`Range start (${start}) cannot be greater than range end (${end})`);
    }

    return { isValid: errors.length === 0, errors };
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PortConfig {
  project: string;
  port: number;
  range: { start: number; end: number };
  maxConnections?: number;
  connectionTimeout?: number;
  keepAlive?: boolean;
}

interface ConnectionPoolOptions {
  maxConnections: number;
  connectionTimeout: number;
  keepAlive: boolean;
  retryAttempts: number;
  retryDelay: number;
}

interface ConnectionInfo {
  host: string;
  port: number;
  created: number;
  destroyed?: boolean;
  close?: () => void;
  destroy?: () => void;
}

interface DNSCacheStats {
  entries: number;
  hitRate: number;
  memoryUsage: number;
  lastCleanup: number;
}

interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  memoryUsage: number;
}

// ============================================================================
// PORT CONFIGURATION SYSTEM
// ============================================================================

class PortManager {
  private static getDefaultConfig(): PortConfig {
    const DEFAULT_PORT = parseInt(process.env.DEFAULT_PORT || '3000', 10);
    return {
      project: 'default',
      port: DEFAULT_PORT,
      range: { start: DEFAULT_PORT, end: DEFAULT_PORT + 100 },
    maxConnections: 100,
    connectionTimeout: 30000,
    keepAlive: true
  };

  private static readonly PROJECT_CONFIGS = new Map<string, PortConfig>();
  private static readonly USED_PORTS = new Set<number>();
  private static readonly PORT_ALLOCATION = new Map<string, number>();
  
  // Mutex for preventing race conditions in port allocation
  private static allocationMutex = Promise.resolve();
  private static isAllocating = false;

  /**
   * Load project-specific port configuration with validation
   */
  static loadProjectConfig(projectPath: string): PortConfig {
    const configFiles = [
      `${projectPath}/port-config.json`,
      `${projectPath}/.port-config.json`,
      `${projectPath}/package.json`
    ];

    let config = { ...this.getDefaultConfig() };

    for (const configFile of configFiles) {
      if (existsSync(configFile)) {
        try {
          const content = readFileSync(configFile, 'utf-8');
          const parsed = JSON.parse(content);
          
          // Extract port configuration
          const portConfig = parsed.portConfig || parsed.server || {};
          
          config = {
            project: parsed.name || 'unknown',
            port: portConfig.port || this.getDefaultConfig().port,
            range: portConfig.range || this.getDefaultConfig().range,
            maxConnections: portConfig.maxConnections || this.getDefaultConfig().maxConnections,
            connectionTimeout: portConfig.connectionTimeout || this.getDefaultConfig().connectionTimeout,
            keepAlive: portConfig.keepAlive !== false
          };
          break;
        } catch (error) {
          console.warn(`Failed to load config from ${configFile}: ${error.message}`);
        }
      }
    }

    // Validate configuration
    const portValidation = ValidationUtils.validatePort(config.port, 'Configuration port');
    if (!portValidation.isValid) {
      console.error(`Invalid port configuration: ${portValidation.errors.join(', ')}`);
      console.log(`Falling back to default port ${this.getDefaultConfig().port}`);
      config.port = this.getDefaultConfig().port;
    }

    const rangeValidation = ValidationUtils.validatePortRange(config.range.start, config.range.end);
    if (!rangeValidation.isValid) {
      console.error(`Invalid port range: ${rangeValidation.errors.join(', ')}`);
      const defaultConfig = this.getDefaultConfig();
      console.log(`Falling back to default range ${defaultConfig.range.start}-${defaultConfig.range.end}`);
      config.range = defaultConfig.range;
    }

    const connectionValidation = ValidationUtils.validateConnectionLimit(config.maxConnections, 'Configuration maxConnections');
    if (!connectionValidation.isValid) {
      console.error(`Invalid connection limit: ${connectionValidation.errors.join(', ')}`);
      console.log(`Falling back to default maxConnections ${this.getDefaultConfig().maxConnections}`);
      config.maxConnections = this.getDefaultConfig().maxConnections;
    }

    return { ...config, project: config.project || projectPath.split('/').pop() };
  }

  /**
   * Allocate a dedicated port for a project (thread-safe)
   */
  static async allocatePort(projectPath: string): Promise<number> {
    // Wait for any ongoing allocation to complete
    await this.allocationMutex;
    
    // Start new allocation
    const allocationPromise = this.performAllocation(projectPath);
    this.allocationMutex = allocationPromise;
    
    return allocationPromise;
  }

  /**
   * Internal method to perform port allocation with proper locking
   */
  private static async performAllocation(projectPath: string): Promise<number> {
    if (this.isAllocating) {
      throw new Error('Port allocation already in progress');
    }

    this.isAllocating = true;
    
    try {
      const config = this.loadProjectConfig(projectPath);
      
      // Check if project already has an allocated port
      if (this.PORT_ALLOCATION.has(projectPath)) {
        const existingPort = this.PORT_ALLOCATION.get(projectPath)!;
        console.log(`🚪 Port ${existingPort} already allocated to project: ${config.project}`);
        return existingPort;
      }

      // Find available port in project's range (atomic operation)
      let allocatedPort = config.port;
      
      if (this.USED_PORTS.has(allocatedPort)) {
        // Find next available port in range
        let found = false;
        for (let port = config.range.start; port <= config.range.end; port++) {
          if (!this.USED_PORTS.has(port)) {
            allocatedPort = port;
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`No available ports in range ${config.range.start}-${config.range.end} for project ${config.project}`);
        }
      }

      // Atomic allocation
      this.USED_PORTS.add(allocatedPort);
      this.PORT_ALLOCATION.set(projectPath, allocatedPort);
      this.PROJECT_CONFIGS.set(projectPath, config);

      console.log(`🚪 Port ${allocatedPort} allocated to project: ${config.project}`);
      return allocatedPort;
      
    } finally {
      this.isAllocating = false;
    }
  }

  /**
   * Release a port allocation
   */
  static releasePort(projectPath: string): void {
    const port = this.PORT_ALLOCATION.get(projectPath);
    if (port) {
      this.USED_PORTS.delete(port);
      this.PORT_ALLOCATION.delete(projectPath);
      this.PROJECT_CONFIGS.delete(projectPath);
      console.log(`🔓 Port ${port} released from project: ${projectPath}`);
    }
  }

  /**
   * Get project configuration
   */
  static getProjectConfig(projectPath: string): PortConfig | undefined {
    return this.PROJECT_CONFIGS.get(projectPath);
  }

  /**
   * Get all allocated ports
   */
  static getAllocatedPorts(): Map<string, number> {
    return new Map(this.PORT_ALLOCATION);
  }
}

// ============================================================================
// DNS PREFETCHING AND PRECONNECT OPTIMIZATION
// ============================================================================

class DNSOptimizer {
  private static prefetchedHosts = new Set<string>();
  private static preconnectedHosts = new Set<string>();

  /**
   * Prefetch DNS for a host to resolve hostname before request
   */
  static async prefetchDNS(host: string): Promise<void> {
    if (this.prefetchedHosts.has(host)) {
      return; // Already prefetched
    }

    try {
      if (typeof Bun !== 'undefined' && Bun.dns && Bun.dns.prefetch) {
        await Bun.dns.prefetch(host);
        this.prefetchedHosts.add(host);
        console.log(`🌐 DNS prefetched for: ${host}`);
      }
    } catch (error) {
      console.warn(`DNS prefetch failed for ${host}: ${error.message}`);
    }
  }

  /**
   * Preconnect to a host to establish TCP connection before request
   */
  static async preconnect(host: string): Promise<void> {
    if (this.preconnectedHosts.has(host)) {
      return; // Already preconnected
    }

    try {
      if (typeof Bun !== 'undefined' && Bun.fetch && Bun.fetch.preconnect) {
        await Bun.fetch.preconnect(`https://${host}`);
        this.preconnectedHosts.add(host);
        console.log(`🔗 Preconnected to: ${host}`);
      }
    } catch (error) {
      console.warn(`Preconnect failed for ${host}: ${error.message}`);
    }
  }

  /**
   * Get DNS cache statistics
   */
  static getDNSCacheStats(): any {
    try {
      if (typeof Bun !== 'undefined' && Bun.dns && Bun.dns.getCacheStats) {
        return Bun.dns.getCacheStats();
      }
    } catch (error) {
      console.warn(`Failed to get DNS cache stats: ${error.message}`);
    }
    return {
      prefetchedHosts: this.prefetchedHosts.size,
      preconnectedHosts: this.preconnectedHosts.size
    };
  }

  /**
   * Clear DNS and preconnect cache
   */
  static clearCache(): void {
    this.prefetchedHosts.clear();
    this.preconnectedHosts.clear();
    console.log('🧹 DNS and preconnect cache cleared');
  }
}

// ============================================================================
// ADVANCED CONNECTION POOLING
// ============================================================================

interface ConnectionPoolOptions {
  maxConnections: number;
  connectionTimeout: number;
  keepAlive: boolean;
  retryAttempts: number;
  retryDelay: number;
}

class ConnectionPool {
  private readonly pools = new Map<string, ConnectionInfo[]>();
  private readonly activeConnections = new Map<string, number>();
  private readonly connectionTimestamps = new Map<string, number>();
  private readonly options: ConnectionPoolOptions;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(options: ConnectionPoolOptions) {
    this.options = {
      maxConnections: 100,
      connectionTimeout: 30000,
      keepAlive: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };

    // Start periodic cleanup
    this.startCleanupInterval();
  }

  /**
   * Get connection from pool or create new one
   */
  async getConnection(host: string, port: number): Promise<ConnectionInfo> {
    const poolKey = `${host}:${port}`;
    
    // Check if we have available connections in pool
    const pool = this.pools.get(poolKey) || [];
    const activeCount = this.activeConnections.get(poolKey) || 0;

    // Clean up expired connections from pool
    this.cleanupExpiredConnections(poolKey);

    if (pool.length > 0 && activeCount < this.options.maxConnections) {
      const connection = pool.pop();
      this.activeConnections.set(poolKey, activeCount + 1);
      this.connectionTimestamps.set(`${poolKey}:${Date.now()}`, Date.now());
      return connection!;
    }

    // Create new connection if under limit
    if (activeCount < this.options.maxConnections) {
      const connection = await this.createConnection(host, port);
      this.activeConnections.set(poolKey, activeCount + 1);
      this.connectionTimestamps.set(`${poolKey}:${Date.now()}`, Date.now());
      return connection;
    }

    // Wait for available connection
    return this.waitForConnection(poolKey);
  }

  /**
   * Return connection to pool
   */
  returnConnection(host: string, port: number, connection: ConnectionInfo): void {
    const poolKey = `${host}:${port}`;
    const pool = this.pools.get(poolKey) || [];
    const activeCount = this.activeConnections.get(poolKey) || 0;

    // Mark connection as returned
    this.activeConnections.set(poolKey, Math.max(0, activeCount - 1));

    // Clean up connection if needed
    if (!this.options.keepAlive || connection.destroyed) {
      this.destroyConnection(connection);
      return;
    }

    // Add connection back to pool if it's still valid
    if (this.isConnectionValid(connection)) {
      pool.push(connection);
      this.pools.set(poolKey, pool);
    } else {
      this.destroyConnection(connection);
    }
  }

  /**
   * Clean up expired connections
   */
  private cleanupExpiredConnections(poolKey: string): void {
    const pool = this.pools.get(poolKey) || [];
    const now = Date.now();
    const timeoutMs = this.options.connectionTimeout;

    // Remove expired connections from pool
    const validConnections = pool.filter(connection => {
      if (connection.created && (now - connection.created) > timeoutMs) {
        this.destroyConnection(connection);
        return false;
      }
      return true;
    });

    this.pools.set(poolKey, validConnections);
  }

  /**
   * Check if connection is still valid
   */
  private isConnectionValid(connection: ConnectionInfo): boolean {
    return connection && !connection.destroyed && 
           (!connection.created || (Date.now() - connection.created) < this.options.connectionTimeout);
  }

  /**
   * Destroy a connection properly
   */
  private destroyConnection(connection: ConnectionInfo): void {
    try {
      if (connection && typeof connection.destroy === 'function') {
        connection.destroy();
      } else if (connection && typeof connection.close === 'function') {
        connection.close();
      }
    } catch (error) {
      console.warn('Error destroying connection:', error);
    }
  }

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30000);
  }

  /**
   * Perform comprehensive cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    const timeoutMs = this.options.connectionTimeout;
    let cleanedUp = 0;

    // Clean up all pools
    for (const [poolKey, pool] of this.pools.entries()) {
      const validConnections = pool.filter(connection => {
        if (connection.created && (now - connection.created) > timeoutMs) {
          this.destroyConnection(connection);
          cleanedUp++;
          return false;
        }
        return true;
      });

      if (validConnections.length !== pool.length) {
        this.pools.set(poolKey, validConnections);
      }
    }

    // Clean up old timestamps
    for (const [timestampKey, timestamp] of this.connectionTimestamps.entries()) {
      if (now - timestamp > timeoutMs) {
        this.connectionTimestamps.delete(timestampKey);
      }
    }

    if (cleanedUp > 0) {
      console.log(`🧹 Connection pool cleanup: removed ${cleanedUp} expired connections`);
    }
  }

  /**
   * Stop cleanup interval and destroy all connections
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Destroy all connections in all pools
    for (const [poolKey, pool] of this.pools.entries()) {
      pool.forEach(connection => this.destroyConnection(connection));
    }

    // Clear all maps
    this.pools.clear();
    this.activeConnections.clear();
    this.connectionTimestamps.clear();

    console.log('🔌 Connection pool destroyed and all connections cleaned up');
  }

  /**
   * Create new connection with Bun's optimized settings
   */
  private async createConnection(host: string, port: number): Promise<ConnectionInfo> {
    return {
      host,
      port,
      created: Date.now(),
      destroyed: false,
      close: () => {
        // Simulate connection close
        console.log(`Connection closed to ${host}:${port}`);
      },
      destroy: () => {
        // Simulate connection destroy
        console.log(`Connection destroyed to ${host}:${port}`);
      }
    };
  }

  /**
   * Wait for available connection
   */
  private async waitForConnection(poolKey: string): Promise<ConnectionInfo> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const activeCount = this.activeConnections.get(poolKey) || 0;
        if (activeCount < this.options.maxConnections) {
          clearInterval(checkInterval);
          this.getConnection(poolKey.split(':')[0], parseInt(poolKey.split(':')[1]))
            .then(resolve)
            .catch(reject);
        }
      }, 100);

      // Timeout after connectionTimeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Connection timeout for ${poolKey}`));
      }, this.options.connectionTimeout);
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): Record<string, { available: number; active: number; max: number }> {
    const stats: Record<string, { available: number; active: number; max: number }> = {};
    
    for (const [poolKey, pool] of this.pools.entries()) {
      stats[poolKey] = {
        available: pool.length,
        active: this.activeConnections.get(poolKey) || 0,
        max: this.options.maxConnections
      };
    }
    
    return stats;
  }
}

// ============================================================================
// OPTIMIZED FETCH WITH BUN CONNECTION LIMITS
// ============================================================================

class OptimizedFetch {
  private static connectionPool: ConnectionPool;
  private static readonly DEFAULT_LIMITS = {
    simultaneousConnections: 100,
    connectionsPerHost: 6,
    keepAlive: true,
    connectionTimeout: 30000
  };

  /**
   * Initialize optimized fetch with connection pooling and Bun environment variables
   */
  static initialize(options: Partial<typeof this.DEFAULT_LIMITS> = {}): void {
    // Use Bun's native environment variables or defaults
    let maxRequests = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '512');
    let maxConnectionsPerHost = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST || '6');
    
    // Validate environment variables
    const requestsValidation = ValidationUtils.validateConnectionLimit(maxRequests, 'BUN_CONFIG_MAX_HTTP_REQUESTS');
    const perHostValidation = ValidationUtils.validateConnectionLimit(maxConnectionsPerHost, 'BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST');
    
    if (!requestsValidation.isValid) {
      console.error(`Invalid BUN_CONFIG_MAX_HTTP_REQUESTS: ${requestsValidation.errors.join(', ')}`);
      console.log(`Falling back to default: ${VALIDATION_CONSTANTS.CONNECTIONS.DEFAULT}`);
      maxRequests = VALIDATION_CONSTANTS.CONNECTIONS.DEFAULT;
    }
    
    if (!perHostValidation.isValid) {
      console.error(`Invalid BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST: ${perHostValidation.errors.join(', ')}`);
      console.log(`Falling back to default: 6`);
      maxConnectionsPerHost = 6;
    }
    
    const limits = {
      simultaneousConnections: options.simultaneousConnections || maxRequests,
      connectionsPerHost: options.connectionsPerHost || maxConnectionsPerHost,
      keepAlive: options.keepAlive ?? true,
      connectionTimeout: options.connectionTimeout || 30000
    };
    
    // Validate final limits
    const finalValidation = ValidationUtils.validateConnectionLimit(limits.simultaneousConnections, 'Final simultaneousConnections');
    if (!finalValidation.isValid) {
      console.error(`Invalid simultaneousConnections: ${finalValidation.errors.join(', ')}`);
      limits.simultaneousConnections = VALIDATION_CONSTANTS.CONNECTIONS.DEFAULT;
    }
    
    this.connectionPool = new ConnectionPool({
      maxConnections: limits.simultaneousConnections,
      connectionTimeout: limits.connectionTimeout,
      keepAlive: limits.keepAlive,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Configure Bun's fetch with environment variables
    if (typeof Bun !== 'undefined') {
      // Set simultaneous connection limits using Bun's native config
      (Bun as any).configure({
        maxConcurrency: limits.simultaneousConnections,
        maxConnectionsPerHost: limits.connectionsPerHost
      });
    }

    console.log(`🌐 Optimized fetch initialized with validated configuration:`);
    console.log(`   BUN_CONFIG_MAX_HTTP_REQUESTS: ${limits.simultaneousConnections}`);
    console.log(`   BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST: ${limits.connectionsPerHost}`);
    console.log(`   Keep-Alive: ${limits.keepAlive}`);
    console.log(`   Connection Timeout: ${limits.connectionTimeout}ms`);
  }

  /**
   * Optimized fetch with connection pooling, DNS prefetching, and response buffering
   */
  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.connectionPool) {
      this.initialize();
    }

    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const poolKey = `${host}:${urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)}`;

    try {
      // Optimize with DNS prefetching and preconnect if enabled
      if (options.prefetch !== false) {
        await DNSOptimizer.prefetchDNS(host);
      }
      
      if (options.preconnect !== false) {
        await DNSOptimizer.preconnect(host);
      }

      // Get connection from pool
      const connection = await this.connectionPool.getConnection(
        host,
        urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)
      );

      // Perform fetch with optimized options and response buffering
      const fetchOptions = {
        ...options,
        // Enable keep-alive and connection reuse
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60',
          ...options.headers
        },
        // Set timeout
        signal: AbortSignal.timeout(30000),
        // Enable response buffering for better performance
        // Bun automatically buffers responses when using .text(), .json(), etc.
        buffer: options.buffer !== false // Default to true for optimal performance
      };

      const response = await fetch(url, fetchOptions);

      // Return connection to pool
      this.connectionPool.returnConnection(
        host,
        urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        connection
      );

      return response;

    } catch (error) {
      console.error(`Fetch failed for ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch fetch with DNS prefetching and connection pooling
   */
  static async batchFetch(urls: string[], options: RequestInit = {}): Promise<Response[]> {
    if (!this.connectionPool) {
      this.initialize();
    }

    // Extract unique hosts for DNS prefetching and preconnect
    const uniqueHosts = new Set<string>();
    for (const url of urls) {
      try {
        const host = new URL(url).hostname;
        uniqueHosts.add(host);
      } catch (error) {
        console.warn(`Invalid URL for batch fetch: ${url}`);
      }
    }

    // Prefetch DNS and preconnect to all unique hosts
    if (options.prefetch !== false) {
      await Promise.all(Array.from(uniqueHosts).map(host => DNSOptimizer.prefetchDNS(host)));
    }
    
    if (options.preconnect !== false) {
      await Promise.all(Array.from(uniqueHosts).map(host => DNSOptimizer.preconnect(host)));
    }

    // Execute batch fetch
    const promises = urls.map(url => this.fetch(url, options));
    return Promise.all(promises);
  }

  /**
   * Optimized fetch with automatic response buffering to file
   */
  static async fetchAndBuffer(url: string, outputPath: string, options: RequestInit = {}): Promise<void> {
    const response = await this.fetch(url, options);
    
    try {
      // Use Bun's optimized write with response buffering as documented
      // import { write } from "bun";
      // await write("output.txt", response);
      if (typeof Bun !== 'undefined' && Bun.write) {
        await Bun.write(outputPath, response);
        console.log(`📄 Response buffered to file: ${outputPath}`);
      } else {
        // Fallback for non-Bun environments
        const text = await response.text();
        await Deno.writeTextFile(outputPath, text);
      }
    } catch (error) {
      console.error(`Failed to buffer response to ${outputPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optimized fetch with response buffering to memory
   */
  static async fetchAndBufferToMemory(url: string, options: RequestInit = {}): Promise<{
    text: string;
    json: any;
    formData: FormData | null;
    bytes: Uint8Array;
    arrayBuffer: ArrayBuffer;
    blob: Blob;
  }> {
    const response = await this.fetch(url, options);
    
    try {
      // Use Bun's optimized response buffering methods
      const [text, json, formData, bytes, arrayBuffer, blob] = await Promise.all([
        response.text(),
        response.json().catch(() => null), // Handle non-JSON responses
        response.formData().catch(() => null), // Handle non-form responses
        response.bytes(),
        response.arrayBuffer(),
        response.blob()
      ]);

      return {
        text,
        json,
        formData,
        bytes,
        arrayBuffer,
        blob
      };
    } catch (error) {
      console.error(`Failed to buffer response to memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comprehensive performance statistics including DNS optimization
   */
  static getComprehensiveStats(): any {
    return {
      connectionPool: this.getStats(),
      dnsOptimization: DNSOptimizer.getDNSCacheStats(),
      configuration: {
        maxRequests: process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '512',
        maxPerHost: process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST || '6'
      }
    };
  }

  /**
   * Clear all optimization caches
   */
  static clearAllCaches(): void {
    DNSOptimizer.clearCache();
    console.log('🧹 All optimization caches cleared');
  }
}

// ============================================================================
// PROJECT SERVER MANAGER
// ============================================================================

class ProjectServer {
  private readonly projectPath: string;
  private readonly config: PortConfig;
  private readonly port: number;
  private server: any = null;
  private connectionPool: ConnectionPool;

  constructor(projectPath: string) {
    const config = PortManager.loadProjectConfig(projectPath);
    
    // Use Bun's environment variables with project-specific fallbacks
    const maxRequests = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || config.maxConnections?.toString() || '512');
    const maxConnectionsPerHost = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST || '6');
    
    this.config = {
      ...config,
      maxConnections: maxRequests,
      connectionTimeout: config.connectionTimeout || 30000,
      keepAlive: config.keepAlive !== false
    };
    
    // Note: Port allocation is now async, will be done in start()
    this.port = 0; // Temporary, will be set in start()
    
    this.connectionPool = new ConnectionPool({
      maxConnections: this.config.maxConnections,
      connectionTimeout: this.config.connectionTimeout,
      keepAlive: this.config.keepAlive,
      retryAttempts: 3,
      retryDelay: 1000
    });

    console.log(`🚀 Project server initialized for: ${this.config.project}`);
    console.log(`   Environment BUN_CONFIG_MAX_HTTP_REQUESTS: ${maxRequests}`);
    console.log(`   Environment BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST: ${maxConnectionsPerHost}`);
    console.log(`   Project-specific maxConnections: ${this.config.maxConnections}`);
  }

  /**
   * Start optimized server with dedicated port (async allocation)
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting server for project: ${this.config.project}`);
    
    // Allocate port asynchronously to prevent race conditions
    try {
      this.port = await PortManager.allocatePort(this.projectPath);
    } catch (error) {
      console.error(`❌ Failed to allocate port: ${error.message}`);
      throw error;
    }
    
    console.log(`📍 Dedicated port: ${this.port}`);
    console.log(`🔗 Max connections: ${this.config.maxConnections}`);
    console.log(`⏱️ Connection timeout: ${this.config.connectionTimeout}ms`);

    try {
      this.server = Bun.serve({
        port: this.port,
        reusePort: true,
        fetch: this.handleRequest.bind(this),
        error: this.handleError.bind(this)
      });

      console.log(`✅ Server started successfully on port ${this.port}`);
      
    } catch (error) {
      console.error(`❌ Failed to start server: ${error.message}`);
      PortManager.releasePort(this.projectPath);
      throw error;
    }
  }

  /**
   * Handle requests with connection pooling
   */
  private async handleRequest(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      // Simulate processing
      const data = {
        project: this.config.project,
        port: this.port,
        timestamp: Date.now(),
        url: req.url,
        method: req.method,
        connectionPool: this.connectionPool.getStats()
      };

      const responseTime = Date.now() - startTime;

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
          'X-Project': this.config.project,
          'X-Port': this.port.toString()
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          project: this.config.project,
          timestamp: Date.now()
        }), 
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }
  }

  /**
   * Handle server errors
   */
  private handleError(error: Error): void {
    console.error(`Server error in ${this.config.project}:`, error);
  }

  /**
   * Stop the server and cleanup resources
   */
  async stop(): Promise<void> {
    console.log(`🛑 Stopping server for project: ${this.config.project}`);
    
    // Stop the server
    if (this.server) {
      this.server.stop();
      this.server = undefined;
    }
    
    // Destroy connection pool and cleanup connections
    if (this.connectionPool) {
      this.connectionPool.destroy();
      this.connectionPool = undefined;
    }
    
    // Release port allocation
    if (this.projectPath) {
      PortManager.releasePort(this.projectPath);
    }
    
    console.log(`✅ Server stopped and resources cleaned up for: ${this.config.project}`);
  }

  /**
   * Get server info
   */
  getInfo(): any {
    return {
      project: this.config.project,
      port: this.port,
      config: this.config,
      running: this.server !== null,
      connectionPool: this.connectionPool.getStats()
    };
  }
}

// ============================================================================
// DEMO AND TESTING
// ============================================================================

async function demonstratePortManagement(): Promise<void> {
  console.log('🚀 PORT MANAGEMENT AND CONNECTION POOLING DEMO');
  console.log('=' .repeat(60));

  // Show Bun's environment variables
  console.log('🌍 Bun Environment Variables:');
  console.log(`   BUN_CONFIG_MAX_HTTP_REQUESTS: ${process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '512 (default)'}`);
  console.log(`   BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST: ${process.env.BUN_CONFIG_MAX_HTTP_REQUESTS_PER_HOST || '6 (default)'}`);
  console.log('');

  // Initialize optimized fetch with Bun's native configuration
  OptimizedFetch.initialize({
    // These will use Bun's environment variables or defaults
    keepAlive: true,
    connectionTimeout: 15000
  });

  // Create project servers with dedicated ports
  const platformRoot = Bun.env.BUN_PLATFORM_HOME ?? process.cwd();
  const projects = [
    `${platformRoot}/projects/apps/my-bun-app`,
    `${platformRoot}/projects/apps/cli-dashboard`,
    `${platformRoot}/projects/apps/edge-worker`
  ];

  const servers: ProjectServer[] = [];

  try {
    // Start all project servers
    for (const projectPath of projects) {
      try {
        const server = new ProjectServer(projectPath);
        await server.start();
        servers.push(server);
      } catch (error) {
        console.log(`⚠️ Could not start server for ${projectPath}: ${error.message}`);
      }
    }

    // Show port allocation
    console.log('\n📊 PORT ALLOCATION:');
    const allocatedPorts = PortManager.getAllocatedPorts();
    for (const [project, port] of allocatedPorts.entries()) {
      console.log(`   ${project}: ${port}`);
    }

    // Test connection pooling
    console.log('\n🔗 TESTING CONNECTION POOLING:');
    const testUrl = `http://example.com:${servers[0]?.getInfo().port}/`;
    
    if (servers.length > 0) {
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        OptimizedFetch.fetch(testUrl)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      console.log(`   10 concurrent requests completed in ${totalTime}ms`);
      console.log(`   Average per request: ${(totalTime / 10).toFixed(2)}ms`);
      
      // Show connection pool stats
      console.log('\n📈 CONNECTION POOL STATS:');
      const stats = OptimizedFetch.getStats();
      for (const [key, stat] of Object.entries(stats)) {
        console.log(`   ${key}: ${stat.active}/${stat.max} active, ${stat.available} available`);
      }
    }

    // Keep servers running for demo
    console.log('\n🌐 Servers running. Press Ctrl+C to stop...');
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down all servers...');
      for (const server of servers) {
        await server.stop();
      }
      process.exit(0);
    });

    // Wait indefinitely (or until interrupted)
    await new Promise(() => {});

  } catch (error) {
    console.error('Demo failed:', error);
    
    // Cleanup on error
    for (const server of servers) {
      await server.stop();
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.path === Bun.main) {
  demonstratePortManagement().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { PortManager, ConnectionPool, OptimizedFetch, ProjectServer, DNSOptimizer, ValidationUtils };

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
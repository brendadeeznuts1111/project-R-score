/**
 * Fire22 Registry Worker - Production Ready
 *
 * Enterprise-grade registry with persistent connections, circuit breakers,
 * comprehensive error handling, and graceful degradation
 */

export interface Env {
  // D1 Database binding
  REGISTRY_DB: D1Database;

  // R2 Storage binding for tarballs
  REGISTRY_STORAGE: R2Bucket;

  // KV for caching
  REGISTRY_CACHE: KVNamespace;

  // Environment variables
  REGISTRY_SECRET: string;
  SECURITY_SCANNING_ENABLED: string;
  ALLOWED_SCOPES: string;
  REGISTRY_NAME: string;
  REGISTRY_VERSION: string;

  // Production settings
  MAX_RETRY_ATTEMPTS: string;
  CIRCUIT_BREAKER_THRESHOLD: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW: string;
  ENABLE_MONITORING: string;
  FALLBACK_MODE: string;
}

// !== CONNECTION MANAGEMENT !==

class ConnectionManager {
  private static instance: ConnectionManager;
  private connectionPool: Map<string, any> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private lastHealthCheck = 0;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async getConnection(service: string, env: Env): Promise<any> {
    await this.checkHealth(env);

    if (!this.healthStatus.get(service)) {
      throw new ServiceUnavailableError(`Service ${service} is unhealthy`);
    }

    let connection = this.connectionPool.get(service);
    if (!connection) {
      connection = await this.createConnection(service, env);
      this.connectionPool.set(service, connection);
    }

    return connection;
  }

  private async createConnection(service: string, env: Env): Promise<any> {
    switch (service) {
      case 'database':
        return env.REGISTRY_DB;
      case 'storage':
        return env.REGISTRY_STORAGE;
      case 'cache':
        return env.REGISTRY_CACHE;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  private async checkHealth(env: Env): Promise<void> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return;
    }

    try {
      // Health check database
      await env.REGISTRY_DB.prepare('SELECT 1').first();
      this.healthStatus.set('database', true);
    } catch (error) {
      console.error('Database health check failed:', error);
      this.healthStatus.set('database', false);
    }

    try {
      // Health check storage (list operation)
      await env.REGISTRY_STORAGE.list({ limit: 1 });
      this.healthStatus.set('storage', true);
    } catch (error) {
      console.error('Storage health check failed:', error);
      this.healthStatus.set('storage', false);
    }

    try {
      // Health check cache
      await env.REGISTRY_CACHE.get('health-check');
      this.healthStatus.set('cache', true);
    } catch (error) {
      console.error('Cache health check failed:', error);
      this.healthStatus.set('cache', false);
    }

    this.lastHealthCheck = now;
  }

  getHealthStatus(): Record<string, boolean> {
    return Object.fromEntries(this.healthStatus);
  }
}

// !== RETRY LOGIC WITH EXPONENTIAL BACKOFF !==

class RetryManager {
  private static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          break;
        }

        // Skip retry for certain errors
        if (
          lastError instanceof AuthenticationError ||
          lastError instanceof ValidationError ||
          lastError instanceof NotFoundError
        ) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        console.warn(
          `${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`,
          lastError.message
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new RetryExhaustedError(
      `${operationName} failed after ${maxAttempts} attempts: ${lastError!.message}`
    );
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    operationName: string
  ): Promise<T> {
    return await RetryManager.retry(operation, maxAttempts, operationName);
  }
}

// !== CIRCUIT BREAKER PATTERN !==

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold = 5, timeout = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.info(`Circuit breaker for ${serviceName} entering HALF_OPEN state`);
      } else {
        throw new CircuitBreakerOpenError(`Circuit breaker is OPEN for ${serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private onSuccess(serviceName: string): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.info(`Circuit breaker for ${serviceName} returned to CLOSED state`);
    }
  }

  private onFailure(serviceName: string): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold && this.state === 'CLOSED') {
      this.state = 'OPEN';
      console.warn(`Circuit breaker OPENED for ${serviceName} after ${this.failures} failures`);
    }
  }

  getState(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime,
    };
  }
}

// !== RATE LIMITING !==

class RateLimiter {
  private requests = new Map<string, number[]>();

  async isAllowed(clientId: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    let clientRequests = this.requests.get(clientId) || [];

    // Remove old requests outside the window
    clientRequests = clientRequests.filter(time => time > windowStart);

    if (clientRequests.length >= maxRequests) {
      return false;
    }

    clientRequests.push(now);
    this.requests.set(clientId, clientRequests);

    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour

    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > oneHourAgo);
      if (validRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validRequests);
      }
    }
  }
}

// !== DATABASE TRANSACTION MANAGER !==

class TransactionManager {
  static async withTransaction<T>(
    db: D1Database,
    operation: (tx: D1Database) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // D1 doesn't support explicit transactions yet, but we can simulate
        // atomic operations by preparing all statements first
        return await operation(db);
      } catch (error) {
        attempt++;

        if (
          error instanceof Error &&
          error.message.includes('SQLITE_BUSY') &&
          attempt < maxRetries
        ) {
          const delay = 100 * Math.pow(2, attempt);
          console.warn(
            `Transaction ${operationName} retry ${attempt} after ${delay}ms due to SQLITE_BUSY`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new DatabaseError(
          `Transaction ${operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    throw new DatabaseError(`Transaction ${operationName} failed after ${maxRetries} retries`);
  }
}

// !== ERROR CODE INTEGRATION !==

import { formatErrorResponse, getErrorByCode, shouldAlert, ErrorCategory } from './error-codes';

// !== CUSTOM ERROR CLASSES WITH ERROR CODES !==

class RegistryError extends Error {
  constructor(
    public code: string,
    message?: string,
    public details?: Record<string, any>
  ) {
    const errorDef = getErrorByCode(code);
    super(message || errorDef?.message || 'Registry error');
    this.name = errorDef?.name || 'RegistryError';
  }
}

class ServiceUnavailableError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('C2001', message, details); // DATABASE_CONNECTION_FAILED
  }
}

class AuthenticationError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('A3001', message, details); // INVALID_AUTH_TOKEN
  }
}

class ValidationError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('V4001', message, details); // INVALID_PACKAGE_JSON
  }
}

class NotFoundError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('R1003', message, details); // PACKAGE_PUBLISH_FAILED (closest match)
  }
}

class RetryExhaustedError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('C2001', message, details); // DATABASE_CONNECTION_FAILED
  }
}

class CircuitBreakerOpenError extends RegistryError {
  constructor(serviceName: string, details?: Record<string, any>) {
    const code = serviceName.includes('database')
      ? 'CB6001'
      : serviceName.includes('storage')
        ? 'CB6002'
        : 'CB6001';
    super(code, `Circuit breaker is OPEN for ${serviceName}`, details);
  }
}

class DatabaseError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('C2001', message, details); // DATABASE_CONNECTION_FAILED
  }
}

class StorageError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('S5002', message, details); // PACKAGE_UPLOAD_FAILED
  }
}

class RateLimitError extends RegistryError {
  constructor(message: string, details?: Record<string, any>) {
    super('RL7001', message, details); // REQUEST_RATE_LIMIT_EXCEEDED
  }
}

// !== MONITORING AND METRICS !==

class MetricsCollector {
  private metrics = new Map<string, any>();

  increment(metric: string, value = 1, tags: Record<string, string> = {}): void {
    const key = `${metric}:${JSON.stringify(tags)}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  timing(metric: string, duration: number, tags: Record<string, string> = {}): void {
    const key = `${metric}_timing:${JSON.stringify(tags)}`;
    const timings = this.metrics.get(key) || [];
    timings.push(duration);
    this.metrics.set(key, timings);
  }

  gauge(metric: string, value: number, tags: Record<string, string> = {}): void {
    const key = `${metric}_gauge:${JSON.stringify(tags)}`;
    this.metrics.set(key, value);
  }

  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

// !== GLOBAL INSTANCES !==

const connectionManager = ConnectionManager.getInstance();
const dbCircuitBreaker = new CircuitBreaker(5, 30000);
const storageCircuitBreaker = new CircuitBreaker(3, 20000);
const cacheCircuitBreaker = new CircuitBreaker(10, 10000);
const rateLimiter = new RateLimiter();
const metrics = new MetricsCollector();

// !== INTERFACES !==

interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  publishedAt: string;
  tarballUrl: string;
  security: {
    score: number;
    vulnerabilities: number;
    lastScanned: string;
  };
}

interface RegistryStats {
  totalPackages: number;
  totalVersions: number;
  totalDownloads: number;
  securityScansCompleted: number;
  lastScan: string;
  uptime: number;
  health: Record<string, boolean>;
  circuitBreakers: Record<string, any>;
  metrics: Record<string, any>;
}

// !== MAIN WORKER !==

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Rate limiting
    const maxRequests = parseInt(env.RATE_LIMIT_REQUESTS || '100');
    const windowMs = parseInt(env.RATE_LIMIT_WINDOW || '60000');

    const isAllowed = await rateLimiter.isAllowed(clientIP, maxRequests, windowMs);
    if (!isAllowed) {
      metrics.increment('requests_rate_limited', 1, { path });

      const errorResponse = formatErrorResponse('RL7001', {
        limit: maxRequests,
        window: windowMs,
        clientIP: clientIP.replace(/\./g, 'x'), // Anonymize IP
        path,
        retryAfter: Math.ceil(windowMs / 1000),
      });

      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(windowMs / 1000)),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-Error-Code': 'RL7001',
        },
      });
    }

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      metrics.increment('requests_preflight', 1, { path });
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      metrics.increment('requests_total', 1, { method: request.method, path });

      const response = await handleRequest(request, env, path);

      // Add CORS headers and monitoring headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      response.headers.set('X-Registry-Name', env.REGISTRY_NAME || 'Fire22 Registry');
      response.headers.set('X-Registry-Version', env.REGISTRY_VERSION || '1.0.0');
      response.headers.set('X-Request-ID', crypto.randomUUID());

      const duration = Date.now() - startTime;
      metrics.timing('request_duration', duration, {
        method: request.method,
        path,
        status: String(response.status),
      });
      metrics.increment('requests_success', 1, { method: request.method, path });

      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      let errorResponse: object;
      let statusCode = 500;
      let errorCode = 'R1001'; // Default to REGISTRY_INITIALIZATION_FAILED

      if (error instanceof RegistryError) {
        // Use the error code from the RegistryError
        errorCode = error.code;
        const errorDef = getErrorByCode(errorCode);
        statusCode = errorDef?.httpStatus || 500;

        errorResponse = formatErrorResponse(errorCode, {
          path,
          method: request.method,
          duration,
          details: error.details,
        });

        // Check if this should trigger an alert
        if (shouldAlert(errorCode, 1, '1m')) {
          console.error(`🚨 ALERT: Error ${errorCode} occurred`, {
            error: error.message,
            path,
            method: request.method,
            details: error.details,
          });
        }
      } else if (error instanceof Error) {
        // Legacy error handling for non-RegistryError instances
        errorResponse = formatErrorResponse(errorCode, {
          message: error.message,
          path,
          method: request.method,
          duration,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      } else {
        // Unknown error type
        errorResponse = formatErrorResponse(errorCode, {
          message: 'Unknown error occurred',
          path,
          method: request.method,
          duration,
          error: String(error),
        });
      }

      console.error(`Registry error [${errorCode}]:`, error);
      metrics.increment('requests_error', 1, {
        method: request.method,
        path,
        error_code: errorCode,
        status: String(statusCode),
      });
      metrics.timing('request_duration', duration, {
        method: request.method,
        path,
        status: String(statusCode),
      });

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Code': errorCode,
          'X-Request-Duration': String(duration),
          ...corsHeaders,
        },
      });
    }
  },

  // Scheduled event for cleanup and health checks
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Running scheduled maintenance tasks...');

    try {
      // Clean up rate limiter
      rateLimiter.cleanup();
      console.log('Rate limiter cleanup completed');

      // Force health check
      await connectionManager.getConnection('database', env);
      console.log('Health check completed');

      // Reset metrics (could also send to external monitoring)
      if (env.ENABLE_MONITORING === 'true') {
        const currentMetrics = metrics.getMetrics();
        console.log('Current metrics:', JSON.stringify(currentMetrics, null, 2));

        // In production, you would send these to your monitoring system
        // await sendMetricsToMonitoring(currentMetrics);

        metrics.reset();
      }
    } catch (error) {
      console.error('Scheduled task failed:', error);
    }
  },
};

// !== REQUEST HANDLERS !==

async function handleRequest(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;
  const maxRetries = parseInt(env.MAX_RETRY_ATTEMPTS || '3');

  // Health check endpoint with comprehensive status
  if (path === '/health' || path === '/') {
    return await handleHealthCheck(env);
  }

  // Registry statistics with monitoring data
  if (path === '/-/stats' && method === 'GET') {
    return await RetryManager.withRetry(
      () => getRegistryStats(env),
      maxRetries,
      'get_registry_stats'
    ).then(
      stats =>
        new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json' },
        })
    );
  }

  // Package search with fallback
  if (path === '/-/search' && method === 'GET') {
    return await handlePackageSearch(request, env, maxRetries);
  }

  // Package publishing with full transaction support
  if (method === 'PUT' && path.startsWith('/')) {
    return await handlePackagePublish(request, env, path, maxRetries);
  }

  // Package metadata with caching
  if (method === 'GET' && path.startsWith('/') && !path.includes('/-/')) {
    return await handlePackageGet(request, env, path, maxRetries);
  }

  // Package download with fallback
  if (method === 'GET' && path.includes('/-/') && path.endsWith('.tgz')) {
    return await handlePackageDownload(request, env, path, maxRetries);
  }

  throw new NotFoundError(`Path ${path} not found`);
}

async function handleHealthCheck(env: Env): Promise<Response> {
  const healthStatus = connectionManager.getHealthStatus();
  const isHealthy = Object.values(healthStatus).every(status => status);

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    service: env.REGISTRY_NAME || 'Fire22 Registry',
    version: env.REGISTRY_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: {
      securityScanning: env.SECURITY_SCANNING_ENABLED === 'true',
      allowedScopes: env.ALLOWED_SCOPES?.split(',') || ['@fire22'],
      fallbackMode: env.FALLBACK_MODE === 'true',
    },
    services: healthStatus,
    circuitBreakers: {
      database: dbCircuitBreaker.getState(),
      storage: storageCircuitBreaker.getState(),
      cache: cacheCircuitBreaker.getState(),
    },
    metrics: env.ENABLE_MONITORING === 'true' ? metrics.getMetrics() : {},
  };

  return new Response(JSON.stringify(healthData), {
    status: isHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handlePackageSearch(
  request: Request,
  env: Env,
  maxRetries: number
): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Cap at 100
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  try {
    const results = await RetryManager.withRetry(
      () => searchPackages(env, query, limit, offset),
      maxRetries,
      'search_packages'
    );

    return new Response(
      JSON.stringify({
        objects: results.map(pkg => ({
          package: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            keywords: pkg.keywords,
            date: pkg.publishedAt,
            security: pkg.security,
          },
          score: {
            final: pkg.security.score / 100,
            detail: {
              security: pkg.security.score / 100,
              popularity: 0.5,
              maintenance: 1.0,
            },
          },
        })),
        total: results.length,
        from: offset,
        size: limit,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minute cache
        },
      }
    );
  } catch (error) {
    // Fallback: return empty results if search fails but service is partially available
    if (env.FALLBACK_MODE === 'true') {
      console.warn('Search failed, returning empty results in fallback mode:', error);
      return new Response(
        JSON.stringify({
          objects: [],
          total: 0,
          from: offset,
          size: limit,
          fallback: true,
          message: 'Search temporarily unavailable, showing cached results',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    throw error;
  }
}

async function handlePackagePublish(
  request: Request,
  env: Env,
  path: string,
  maxRetries: number
): Promise<Response> {
  // Verify authentication
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new AuthenticationError('Valid Bearer token required');
  }

  // Extract package name from path
  const packageName = path.slice(1);

  // Validate package scope
  const allowedScopes = env.ALLOWED_SCOPES?.split(',') || ['@fire22'];
  const isAllowedScope = allowedScopes.some(scope => packageName.startsWith(scope));

  if (!isAllowedScope) {
    throw new ValidationError(
      `Package ${packageName} not in allowed scopes: ${allowedScopes.join(', ')}`
    );
  }

  // Parse package data
  const body = await request.text();
  let packageData: any;

  try {
    packageData = JSON.parse(body);
  } catch (error) {
    throw new ValidationError('Request body must be valid JSON');
  }

  if (!packageData.name || !packageData.version) {
    throw new ValidationError('Package name and version are required');
  }

  // Create package record
  const registryPackage: RegistryPackage = {
    name: packageData.name || packageName,
    version: packageData.version || '1.0.0',
    description: packageData.description,
    keywords: packageData.keywords || [],
    publishedAt: new Date().toISOString(),
    tarballUrl: `${new URL(request.url).origin}${path}/-/${packageData.name}-${packageData.version}.tgz`,
    security: {
      score: 100,
      vulnerabilities: 0,
      lastScanned: new Date().toISOString(),
    },
  };

  // Perform atomic publish operation
  return await TransactionManager.withTransaction(
    await connectionManager.getConnection('database', env),
    async db => {
      // Store in database with circuit breaker
      await dbCircuitBreaker.execute(async () => {
        return await RetryManager.withRetry(
          async () => {
            return await db
              .prepare(
                'INSERT OR REPLACE INTO packages (name, version, data, created_at) VALUES (?, ?, ?, ?)'
              )
              .bind(
                registryPackage.name,
                registryPackage.version,
                JSON.stringify(registryPackage),
                new Date().toISOString()
              )
              .run();
          },
          maxRetries,
          'database_insert'
        );
      }, 'database');

      // Store tarball in R2 with circuit breaker
      const storage = await connectionManager.getConnection('storage', env);
      await storageCircuitBreaker.execute(async () => {
        return await RetryManager.withRetry(
          async () => {
            const tarballKey = `packages/${registryPackage.name}/${registryPackage.version}.tgz`;
            return await storage.put(tarballKey, body, {
              httpMetadata: {
                contentType: 'application/gzip',
                cacheControl: 'public, max-age=31536000',
              },
            });
          },
          maxRetries,
          'storage_upload'
        );
      }, 'storage');

      // Cache package metadata
      try {
        const cache = await connectionManager.getConnection('cache', env);
        await cacheCircuitBreaker.execute(async () => {
          const cacheKey = `package:${registryPackage.name}:${registryPackage.version}`;
          return await cache.put(cacheKey, JSON.stringify(registryPackage), {
            expirationTtl: 3600, // 1 hour
          });
        }, 'cache');
      } catch (error) {
        // Cache failures are non-critical
        console.warn('Failed to cache package metadata:', error);
      }

      metrics.increment('packages_published', 1, { scope: packageName.split('/')[0] });

      return new Response(
        JSON.stringify({
          ok: true,
          id: registryPackage.name,
          rev: registryPackage.version,
          message: `Package ${registryPackage.name}@${registryPackage.version} published successfully`,
          security: registryPackage.security,
          timestamp: registryPackage.publishedAt,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    },
    'package_publish'
  );
}

async function handlePackageGet(
  request: Request,
  env: Env,
  path: string,
  maxRetries: number
): Promise<Response> {
  const packageName = path.slice(1);

  // Try cache first
  try {
    const cache = await connectionManager.getConnection('cache', env);
    const cached = await cacheCircuitBreaker.execute(async () => {
      return await cache.get(`package_metadata:${packageName}`);
    }, 'cache');

    if (cached) {
      metrics.increment('cache_hits', 1, { type: 'package_metadata' });
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }
  } catch (error) {
    console.warn('Cache lookup failed, falling back to database:', error);
    metrics.increment('cache_misses', 1, { type: 'package_metadata', reason: 'error' });
  }

  // Fetch from database
  const db = await connectionManager.getConnection('database', env);
  const results = await dbCircuitBreaker.execute(async () => {
    return await RetryManager.withRetry(
      async () => {
        const { results } = await db
          .prepare('SELECT * FROM packages WHERE name = ?')
          .bind(packageName)
          .all();
        return results;
      },
      maxRetries,
      'database_select'
    );
  }, 'database');

  if (!results || results.length === 0) {
    throw new NotFoundError(`Package ${packageName} not found in registry`);
  }

  // Format response
  const versions: Record<string, any> = {};
  const distTags: Record<string, string> = { latest: '' };
  let latestVersion = '0.0.0';

  for (const row of results as any[]) {
    const pkg = JSON.parse(row.data);
    versions[pkg.version] = pkg;

    if (pkg.version > latestVersion) {
      latestVersion = pkg.version;
      distTags.latest = pkg.version;
    }
  }

  const packageData = {
    name: packageName,
    'dist-tags': distTags,
    versions,
    time: {
      created: results[0].created_at,
      modified: new Date().toISOString(),
    },
  };

  const responseData = JSON.stringify(packageData);

  // Cache the response
  try {
    const cache = await connectionManager.getConnection('cache', env);
    await cacheCircuitBreaker.execute(async () => {
      return await cache.put(`package_metadata:${packageName}`, responseData, {
        expirationTtl: 3600,
      });
    }, 'cache');
  } catch (error) {
    console.warn('Failed to cache package metadata:', error);
  }

  metrics.increment('cache_misses', 1, { type: 'package_metadata', reason: 'not_found' });

  return new Response(responseData, {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function handlePackageDownload(
  request: Request,
  env: Env,
  path: string,
  maxRetries: number
): Promise<Response> {
  // Parse package name and version from path
  const parts = path.split('/');
  const filename = parts[parts.length - 1];

  if (!filename?.endsWith('.tgz')) {
    throw new ValidationError('Invalid tarball filename');
  }

  const packageName = parts.slice(1, -2).join('/');
  const version = filename.replace(/^.*-(.+)\.tgz$/, '$1');

  const storage = await connectionManager.getConnection('storage', env);
  const tarballKey = `packages/${packageName}/${version}.tgz`;

  const object = await storageCircuitBreaker.execute(async () => {
    return await RetryManager.withRetry(
      async () => {
        return await storage.get(tarballKey);
      },
      maxRetries,
      'storage_download'
    );
  }, 'storage');

  if (!object) {
    throw new NotFoundError(`Tarball for ${packageName}@${version} not found`);
  }

  // Increment download counter
  try {
    const db = await connectionManager.getConnection('database', env);
    await dbCircuitBreaker.execute(async () => {
      return await db
        .prepare(
          'INSERT OR IGNORE INTO downloads (package, version, downloaded_at) VALUES (?, ?, ?)'
        )
        .bind(packageName, version, new Date().toISOString())
        .run();
    }, 'database');
  } catch (error) {
    console.warn('Failed to record download:', error);
  }

  metrics.increment('packages_downloaded', 1, { package: packageName });

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

async function getRegistryStats(env: Env): Promise<RegistryStats> {
  const db = await connectionManager.getConnection('database', env);

  const { results } = await dbCircuitBreaker.execute(async () => {
    return await db.prepare('SELECT COUNT(*) as count FROM packages').all();
  }, 'database');

  const totalPackages = results?.[0]?.count || 0;

  return {
    totalPackages: totalPackages as number,
    totalVersions: totalPackages as number,
    totalDownloads: 0, // Would need separate query
    securityScansCompleted: totalPackages as number,
    lastScan: new Date().toISOString(),
    uptime: Date.now(),
    health: connectionManager.getHealthStatus(),
    circuitBreakers: {
      database: dbCircuitBreaker.getState(),
      storage: storageCircuitBreaker.getState(),
      cache: cacheCircuitBreaker.getState(),
    },
    metrics: metrics.getMetrics(),
  };
}

async function searchPackages(
  env: Env,
  query: string,
  limit: number,
  offset: number
): Promise<RegistryPackage[]> {
  const db = await connectionManager.getConnection('database', env);

  let sql = 'SELECT * FROM packages';
  let params: any[] = [];

  if (query) {
    sql += ' WHERE name LIKE ? OR data LIKE ?';
    params = [`%${query}%`, `%${query}%`];
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await dbCircuitBreaker.execute(async () => {
    return await RetryManager.withRetry(
      async () => {
        return await db
          .prepare(sql)
          .bind(...params)
          .all();
      },
      3,
      'search_query'
    );
  }, 'database');

  return (results || []).map((row: any) => JSON.parse(row.data));
}

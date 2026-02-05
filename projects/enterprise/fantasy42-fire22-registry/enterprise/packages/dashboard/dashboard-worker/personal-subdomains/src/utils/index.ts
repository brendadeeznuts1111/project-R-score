/**
 * Utility functions for Fire22 Personal Subdomains Worker
 */

import type { EmployeeData, ValidationResult, LogEntry, LogLevel, ApiResponse } from '../types';
import { CONFIG } from '../config';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  // Allow alphanumeric characters, hyphens, and underscores
  // Must be 1-63 characters long
  const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}$/;
  return subdomainRegex.test(subdomain) && subdomain.length <= 63;
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Format employee name for subdomain
 */
export function formatEmployeeSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Validate employee data
 */
export function validateEmployeeData(employee: Partial<EmployeeData>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!employee.id) {
    errors.push('Employee ID is required');
  }

  if (!employee.name) {
    errors.push('Employee name is required');
  }

  if (!employee.email) {
    errors.push('Employee email is required');
  } else if (!isValidEmail(employee.email)) {
    errors.push('Invalid email format');
  }

  if (!employee.department) {
    errors.push('Employee department is required');
  }

  if (!employee.tier || employee.tier < 1 || employee.tier > 5) {
    errors.push('Employee tier must be between 1 and 5');
  }

  if (!employee.bio) {
    warnings.push('Employee bio is recommended for better profiles');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  statusCode?: number
): Response {
  const response: ApiResponse<T> = {
    success,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    ...(error && { error }),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode || (success ? 200 : 400),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(details && { data: details }),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): Response {
  return createApiResponse(true, data, undefined, statusCode);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Generate avatar placeholder text
 */
export function getAvatarPlaceholder(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Check if user has required tier level
 */
export function hasRequiredTier(userTier: number, requiredTier: number): boolean {
  return userTier >= requiredTier;
}

/**
 * Get feature availability based on tier
 */
export function isFeatureAvailable(feature: string, tier: number): boolean {
  const tierConfig = CONFIG.TIERS[tier as keyof typeof CONFIG.TIERS];
  const features = tierConfig?.features || [];
  return features.some(f => f === feature);
}

/**
 * Create cache headers based on configuration
 */
export function createCacheHeaders(cacheConfig: {
  ttl: number;
  cacheControl: string;
}): Record<string, string> {
  return {
    'Cache-Control': cacheConfig.cacheControl,
    'X-Cache-TTL': cacheConfig.ttl.toString(),
  };
}

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Simple logging utility
 */
export class Logger {
  static log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata }),
    };

    const logMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage, metadata);
        break;
      case 'warn':
        console.warn(logMessage, metadata);
        break;
      case 'info':
        console.info(logMessage, metadata);
        break;
      case 'debug':
      default:
        console.log(logMessage, metadata);
        break;
    }
  }

  static error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  static warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  static info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  static debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }
}

/**
 * Rate limiting utility (simple in-memory implementation)
 */
export class RateLimiter {
  private static requests = new Map<string, number[]>();

  static checkLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);

    // Check if under limit
    if (validRequests.length >= limit) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  static cleanup(): void {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const windowStart = now - windowMs;

    for (const [key, requests] of Array.from(this.requests.entries())) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Clean up rate limiter every 5 minutes - moved to main handler
// setInterval(() => RateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Enhanced caching utilities
 */
export class CacheManager {
  private static cache = new Map<string, { data: any; expires: number; etag?: string }>();

  static set(key: string, data: any, ttlSeconds: number): void {
    const expires = Date.now() + ttlSeconds * 1000;
    const etag = this.generateETag(data);

    this.cache.set(key, { data, expires, etag });

    // Clean up expired entries periodically
    this.cleanup();
  }

  static get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  static getWithMetadata(key: string): { data: any; etag?: string } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return { data: entry.data, etag: entry.etag };
  }

  static invalidate(pattern: string): void {
    for (const [key] of Array.from(this.cache.entries())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  static clear(): void {
    this.cache.clear();
  }

  static generateETag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `"${Math.abs(hash).toString(16)}"`;
  }

  static getStats(): { entries: number; totalSize: number } {
    let totalSize = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      totalSize += key.length + JSON.stringify(entry.data).length;
    }

    return {
      entries: this.cache.size,
      totalSize,
    };
  }

  private static cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * HTTP Cache utilities
 */
export class HttpCache {
  static createConditionalResponse(request: Request, response: Response, etag?: string): Response {
    if (etag) {
      // Add ETag header
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('ETag', etag);

      // Check If-None-Match header
      const ifNoneMatch = request.headers.get('If-None-Match');
      if (ifNoneMatch && ifNoneMatch.includes(etag)) {
        // Return 304 Not Modified
        return new Response(null, {
          status: 304,
          statusText: 'Not Modified',
          headers: {
            ETag: etag,
            'Cache-Control': response.headers.get('Cache-Control') || 'no-cache',
          },
        });
      }

      return newResponse;
    }

    return response;
  }

  static createCacheHeaders(config: {
    ttl: number;
    cacheControl?: string;
    etag?: string;
  }): Record<string, string> {
    const headers: Record<string, string> = {};

    if (config.cacheControl) {
      headers['Cache-Control'] = config.cacheControl;
    } else if (config.ttl > 0) {
      headers['Cache-Control'] = `public, max-age=${config.ttl}`;
    }

    if (config.etag) {
      headers['ETag'] = config.etag;
    }

    // Add Last-Modified header
    headers['Last-Modified'] = new Date().toUTCString();

    return headers;
  }

  static parseCacheControl(cacheControl: string): {
    maxAge?: number;
    staleWhileRevalidate?: number;
  } {
    const directives = cacheControl.split(',').map(d => d.trim());
    const result: { maxAge?: number; staleWhileRevalidate?: number } = {};

    for (const directive of directives) {
      if (directive.startsWith('max-age=')) {
        result.maxAge = parseInt(directive.split('=')[1]);
      } else if (directive.startsWith('stale-while-revalidate=')) {
        result.staleWhileRevalidate = parseInt(directive.split('=')[1]);
      }
    }

    return result;
  }
}

/**
 * Response compression utilities
 */
export class Compression {
  static async compressResponse(response: Response): Promise<Response> {
    const acceptEncoding = response.headers.get('Accept-Encoding') || '';

    if (acceptEncoding.includes('gzip')) {
      // In a real implementation, you would use a compression library
      // For now, we'll just add the header
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Content-Encoding', 'gzip');
      return newResponse;
    }

    return response;
  }

  static shouldCompress(request: Request, response: Response): boolean {
    // Don't compress if already compressed
    if (response.headers.get('Content-Encoding')) {
      return false;
    }

    // Don't compress small responses
    const contentLength = response.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) < 1024) {
      return false;
    }

    // Check if client accepts compression
    const acceptEncoding = request.headers.get('Accept-Encoding') || '';
    return acceptEncoding.includes('gzip') || acceptEncoding.includes('deflate');
  }
}

/**
 * Enhanced API Response utilities
 */
export class ApiResponseFormatter {
  static formatSuccess<T>(
    data: T,
    options: {
      version?: string;
      requestId?: string;
      meta?: Record<string, any>;
      links?: Record<string, string>;
    } = {}
  ): Response {
    const version = options.version || ApiVersioning.getCurrentVersion();
    const timestamp = new Date().toISOString();

    const response = {
      success: true,
      version,
      timestamp,
      data,
      ...(options.requestId && { requestId: options.requestId }),
      ...(options.meta && { meta: options.meta }),
      ...(options.links && { links: options.links }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': `application/vnd.fire22.${version}+json`,
        'X-API-Version': version,
        'Cache-Control': 'public, max-age=60',
        ...(options.requestId && { 'X-Request-ID': options.requestId }),
      },
    });
  }

  static formatError(
    error: string | Error,
    statusCode: number = 500,
    options: {
      version?: string;
      requestId?: string;
      code?: string;
      details?: any;
    } = {}
  ): Response {
    const version = options.version || ApiVersioning.getCurrentVersion();
    const timestamp = new Date().toISOString();

    const errorMessage = error instanceof Error ? error.message : error;
    const errorCode = options.code || this.getErrorCode(statusCode);

    const response = {
      success: false,
      version,
      timestamp,
      error: {
        code: errorCode,
        message: errorMessage,
        ...(options.details && { details: options.details }),
      },
      ...(options.requestId && { requestId: options.requestId }),
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': `application/vnd.fire22.${version}+json`,
        'X-API-Version': version,
        ...(options.requestId && { 'X-Request-ID': options.requestId }),
      },
    });
  }

  static formatHealthCheck(
    data: {
      status: string;
      checks: Record<string, any>;
      uptime?: number;
      version?: string;
    },
    options: {
      requestId?: string;
    } = {}
  ): Response {
    const version = ApiVersioning.getCurrentVersion();
    const timestamp = new Date().toISOString();

    const response = {
      success: true,
      version,
      timestamp,
      data: {
        ...data,
        timestamp,
      },
      ...(options.requestId && { requestId: options.requestId }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': `application/vnd.fire22.${version}+json`,
        'X-API-Version': version,
        'Cache-Control': 'no-cache',
        ...(options.requestId && { 'X-Request-ID': options.requestId }),
      },
    });
  }

  static formatPaginatedResponse<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    options: {
      version?: string;
      requestId?: string;
      links?: Record<string, string>;
    } = {}
  ): Response {
    const version = options.version || ApiVersioning.getCurrentVersion();
    const timestamp = new Date().toISOString();

    const response = {
      success: true,
      version,
      timestamp,
      data,
      pagination,
      ...(options.links && { links: options.links }),
      ...(options.requestId && { requestId: options.requestId }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': `application/vnd.fire22.${version}+json`,
        'X-API-Version': version,
        'X-Pagination-Total': pagination.total.toString(),
        'X-Pagination-Pages': pagination.totalPages.toString(),
        'X-Pagination-Page': pagination.page.toString(),
        'Cache-Control': 'public, max-age=300',
        ...(options.requestId && { 'X-Request-ID': options.requestId }),
      },
    });
  }

  private static getErrorCode(statusCode: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }
}

/**
 * API Middleware utilities
 */
export class ApiMiddleware {
  static async handleVersioning(request: Request): Promise<{ request: Request; version: string }> {
    const version = ApiVersioning.getVersionFromRequest(request);

    if (!ApiVersioning.isVersionSupported(version)) {
      throw new Error(
        `API version '${version}' is not supported. Supported versions: ${ApiVersioning.getSupportedVersions().join(', ')}`
      );
    }

    return { request, version };
  }

  static validateContentType(
    request: Request,
    allowedTypes: string[] = ['application/json']
  ): void {
    const contentType = request.headers.get('Content-Type');

    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      throw new Error(`Invalid content type. Expected one of: ${allowedTypes.join(', ')}`);
    }
  }

  static async parseJsonBody<T>(request: Request): Promise<T> {
    try {
      return await request.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  static createCorsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Version',
      'Access-Control-Max-Age': '86400',
    };
  }

  static handleOptions(): Response {
    return new Response(null, {
      status: 204,
      headers: this.createCorsHeaders(),
    });
  }
}

// Periodic cache cleanup - moved to main handler
// setInterval(() => {
//   const stats = CacheManager.getStats();
//   if (stats.entries > 1000) { // Clean up if too many entries
//     Logger.info('Cache cleanup triggered', { stats });
//     CacheManager.clear();
//   }
// }, 10 * 60 * 1000); // Every 10 minutes

/**
 * API Versioning System
 */
export class ApiVersioning {
  private static currentVersion = 'v1';
  private static supportedVersions = ['v1'];
  private static versionHistory = [
    {
      version: 'v1',
      releaseDate: '2024-01-29',
      changes: [
        'Initial API release',
        'Basic health, status, and analytics endpoints',
        'Profile, tools, contacts, and schedule endpoints',
        'Admin endpoints for cache and logs',
        'API documentation endpoint',
      ],
      deprecated: false,
    },
  ];

  static getCurrentVersion(): string {
    return this.currentVersion;
  }

  static setCurrentVersion(version: string): boolean {
    if (this.supportedVersions.includes(version)) {
      this.currentVersion = version;
      return true;
    }
    return false;
  }

  static isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  static getSupportedVersions(): string[] {
    return [...this.supportedVersions];
  }

  static getVersionHistory(): any[] {
    return [...this.versionHistory];
  }

  static addVersion(version: string, changes: string[]): boolean {
    if (!this.supportedVersions.includes(version)) {
      this.supportedVersions.push(version);
      this.versionHistory.push({
        version,
        releaseDate: new Date().toISOString().split('T')[0],
        changes,
        deprecated: false,
      });
      return true;
    }
    return false;
  }

  static deprecateVersion(version: string): boolean {
    const versionEntry = this.versionHistory.find(v => v.version === version);
    if (versionEntry) {
      versionEntry.deprecated = true;
      return true;
    }
    return false;
  }

  static parseVersionFromPath(pathname: string): { path: string; version: string } {
    const versionMatch = pathname.match(/^\/api\/(v\d+)\//);
    if (versionMatch) {
      const version = versionMatch[1];
      const pathWithoutVersion = pathname.replace(/^\/api\/v\d+/, '/api');
      return { path: pathWithoutVersion, version };
    }
    return { path: pathname, version: this.currentVersion };
  }

  static formatVersionedPath(path: string, version: string): string {
    if (version === this.currentVersion) {
      return path;
    }
    return path.replace('/api', `/api/${version}`);
  }

  static getVersionedResponse(data: any, version: string): any {
    return {
      ...data,
      _metadata: {
        apiVersion: version,
        requestedAt: new Date().toISOString(),
        supportedVersions: this.getSupportedVersions(),
      },
    };
  }

  static getVersionFromRequest(request: Request): string {
    // Check Accept header for version
    const accept = request.headers.get('Accept') || '';
    const versionMatch = accept.match(/application\/vnd\.fire22\.(\w+)\+json/);

    if (versionMatch && this.supportedVersions.includes(versionMatch[1])) {
      return versionMatch[1];
    }

    // Check URL path for version
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/api\/(v\d+)\//);

    if (pathMatch && this.supportedVersions.includes(pathMatch[1])) {
      return pathMatch[1];
    }

    return this.currentVersion;
  }
}

/**
 * API Analytics and Metrics Tracker
 */
export class ApiAnalytics {
  private static metrics: Map<
    string,
    {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      responseTimes: number[];
      errorCodes: Map<number, number>;
      hourlyStats: Map<number, number>;
      lastAccessed: Date;
    }
  > = new Map();

  private static globalStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    uptime: Date.now(),
    peakHour: 0,
    peakRequests: 0,
  };

  static trackRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userAgent?: string,
    ip?: string
  ): void {
    // Initialize endpoint metrics if not exists
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errorCodes: new Map(),
        hourlyStats: new Map(),
        lastAccessed: new Date(),
      });
    }

    const endpointMetrics = this.metrics.get(endpoint)!;

    // Update endpoint metrics
    endpointMetrics.totalRequests++;
    endpointMetrics.lastAccessed = new Date();

    if (statusCode >= 200 && statusCode < 400) {
      endpointMetrics.successfulRequests++;
    } else {
      endpointMetrics.failedRequests++;
      endpointMetrics.errorCodes.set(
        statusCode,
        (endpointMetrics.errorCodes.get(statusCode) || 0) + 1
      );
    }

    // Track response time (keep last 1000 for memory efficiency)
    endpointMetrics.responseTimes.push(responseTime);
    if (endpointMetrics.responseTimes.length > 1000) {
      endpointMetrics.responseTimes.shift();
    }

    // Track hourly stats
    const hour = new Date().getHours();
    endpointMetrics.hourlyStats.set(hour, (endpointMetrics.hourlyStats.get(hour) || 0) + 1);

    // Update global stats
    this.globalStats.totalRequests++;
    if (statusCode >= 200 && statusCode < 400) {
      this.globalStats.successfulRequests++;
    } else {
      this.globalStats.failedRequests++;
    }

    // Update average response time (rolling average)
    const totalResponseTime =
      this.globalStats.averageResponseTime * (this.globalStats.totalRequests - 1) + responseTime;
    this.globalStats.averageResponseTime = totalResponseTime / this.globalStats.totalRequests;

    // Update error rate
    this.globalStats.errorRate =
      (this.globalStats.failedRequests / this.globalStats.totalRequests) * 100;

    // Track peak hour
    if (endpointMetrics.hourlyStats.get(hour)! > this.globalStats.peakRequests) {
      this.globalStats.peakRequests = endpointMetrics.hourlyStats.get(hour)!;
      this.globalStats.peakHour = hour;
    }
  }

  static getEndpointStats(endpoint: string) {
    const metrics = this.metrics.get(endpoint);
    if (!metrics) return null;

    const avgResponseTime =
      metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;

    return {
      endpoint,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      responseTimes: metrics.responseTimes,
      errorCodes: Object.fromEntries(metrics.errorCodes),
      hourlyStats: Object.fromEntries(metrics.hourlyStats),
      lastAccessed: metrics.lastAccessed,
    };
  }

  static getGlobalStats() {
    return {
      ...this.globalStats,
      averageResponseTime: Math.round(this.globalStats.averageResponseTime * 100) / 100,
      errorRate: Math.round(this.globalStats.errorRate * 100) / 100,
      uptime: Date.now() - this.globalStats.uptime,
      peakHourFormatted: `${this.globalStats.peakHour.toString().padStart(2, '0')}:00`,
    };
  }

  static getAllEndpointStats() {
    const endpoints = Array.from(this.metrics.keys());
    return endpoints.map(endpoint => this.getEndpointStats(endpoint)).filter(Boolean);
  }

  static getTopEndpoints(limit: number = 10) {
    const endpoints = this.getAllEndpointStats();
    return endpoints.sort((a, b) => b!.totalRequests - a!.totalRequests).slice(0, limit);
  }

  static getSlowestEndpoints(limit: number = 10) {
    const endpoints = this.getAllEndpointStats();
    return endpoints
      .filter(e => e!.responseTimes && e!.responseTimes.length > 0)
      .sort((a, b) => b!.averageResponseTime - a!.averageResponseTime)
      .slice(0, limit);
  }

  static getFailingEndpoints(limit: number = 10) {
    const endpoints = this.getAllEndpointStats();
    return endpoints
      .filter(e => e!.successRate < 95) // Less than 95% success rate
      .sort((a, b) => a!.successRate - b!.successRate)
      .slice(0, limit);
  }

  static resetMetrics(): void {
    this.metrics.clear();
    this.globalStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: Date.now(),
      peakHour: 0,
      peakRequests: 0,
    };
  }

  static exportMetrics(): any {
    return {
      global: this.getGlobalStats(),
      endpoints: this.getAllEndpointStats(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }
}

/**
 * Batch API Operations Processor
 */
export class BatchProcessor {
  private static maxBatchSize = 10;
  private static timeout = 30000; // 30 seconds

  static async processBatch(
    requests: Array<{
      id: string;
      method: string;
      path: string;
      body?: any;
      headers?: Record<string, string>;
    }>,
    employee: EmployeeData,
    baseRequestId: string
  ): Promise<{
    results: Array<{
      id: string;
      status: number;
      data?: any;
      error?: any;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      duration: number;
    };
  }> {
    const startTime = Date.now();
    const results: Array<{
      id: string;
      status: number;
      data?: any;
      error?: any;
    }> = [];

    if (requests.length > this.maxBatchSize) {
      return {
        results: [
          {
            id: 'batch_error',
            status: 400,
            error: `Batch size exceeds maximum of ${this.maxBatchSize} requests`,
          },
        ],
        summary: {
          total: requests.length,
          successful: 0,
          failed: 1,
          duration: Date.now() - startTime,
        },
      };
    }

    let successful = 0;
    let failed = 0;

    for (const request of requests) {
      try {
        // Simulate API call (in real implementation, this would route to actual handlers)
        const result = await this.executeSingleRequest(request, employee, baseRequestId);
        results.push(result);
        if (result.status >= 200 && result.status < 300) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          id: request.id,
          status: 500,
          error: error instanceof Error ? error.message : 'Internal error',
        });
        failed++;
      }
    }

    return {
      results,
      summary: {
        total: requests.length,
        successful,
        failed,
        duration: Date.now() - startTime,
      },
    };
  }

  private static async executeSingleRequest(
    request: {
      id: string;
      method: string;
      path: string;
      body?: any;
      headers?: Record<string, string>;
    },
    employee: EmployeeData,
    baseRequestId: string
  ): Promise<{
    id: string;
    status: number;
    data?: any;
    error?: any;
  }> {
    // This is a simplified version. In a real implementation, you'd route to actual handlers
    const { path } = ApiVersioning.parseVersionFromPath(request.path);

    try {
      switch (path) {
        case '/api/health':
          return {
            id: request.id,
            status: 200,
            data: {
              status: 'healthy',
              employee: employee.name,
              timestamp: new Date().toISOString(),
            },
          };

        case '/api/profile':
          return {
            id: request.id,
            status: 200,
            data: {
              id: employee.id,
              name: employee.name,
              title: employee.title,
              department: employee.department,
            },
          };

        case '/api/status':
          return {
            id: request.id,
            status: 200,
            data: {
              employee: employee.name,
              tier: employee.tier,
              status: 'active',
            },
          };

        default:
          return {
            id: request.id,
            status: 404,
            error: 'Endpoint not found in batch processing',
          };
      }
    } catch (error) {
      return {
        id: request.id,
        status: 500,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  static validateBatchRequest(requests: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(requests)) {
      errors.push('Requests must be an array');
      return { valid: false, errors };
    }

    if (requests.length === 0) {
      errors.push('Batch must contain at least one request');
      return { valid: false, errors };
    }

    if (requests.length > this.maxBatchSize) {
      errors.push(`Batch size exceeds maximum of ${this.maxBatchSize} requests`);
      return { valid: false, errors };
    }

    const ids = new Set();
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];

      if (!req.id) {
        errors.push(`Request ${i}: Missing 'id' field`);
      } else if (ids.has(req.id)) {
        errors.push(`Request ${i}: Duplicate 'id' field`);
      } else {
        ids.add(req.id);
      }

      if (!req.method) {
        errors.push(`Request ${i}: Missing 'method' field`);
      }

      if (!req.path) {
        errors.push(`Request ${i}: Missing 'path' field`);
      } else if (!req.path.startsWith('/api/')) {
        errors.push(`Request ${i}: Path must start with '/api/'`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  static setMaxBatchSize(size: number): void {
    this.maxBatchSize = Math.max(1, Math.min(size, 50)); // Between 1 and 50
  }

  static setTimeout(timeout: number): void {
    this.timeout = Math.max(1000, timeout); // Minimum 1 second
  }
}

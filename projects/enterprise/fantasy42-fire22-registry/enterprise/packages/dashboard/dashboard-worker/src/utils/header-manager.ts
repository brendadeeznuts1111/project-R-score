#!/usr/bin/env bun

/**
 * 🔐 Fire22 Header Manager - Comprehensive Security & System Headers
 * Implements OWASP security standards, CORS policies, and Fire22 system headers
 */

// Mandatory Security Headers (OWASP compliant)
export const MANDATORY_SECURITY_HEADERS = {
  // Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security Policy
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.fire22.com; frame-ancestors 'none';",

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy':
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

  // Cache Control
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',

  // Security Headers
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Download-Options': 'noopen',
  'X-DNS-Prefetch-Control': 'off',

  // Custom Security
  'X-Fire22-Security': 'enhanced',
  'X-Content-Security': 'strict',
  'X-Frame-Security': 'deny-all',
};

// Production Security Headers (enhanced)
export const PRODUCTION_SECURITY_HEADERS = {
  ...MANDATORY_SECURITY_HEADERS,
  'Strict-Transport-Security':
    'max-age=31536000; includeSubDomains; preload; hsts-report-uri=https://report.fire22.com/hsts',
  'Content-Security-Policy-Report-Only':
    "default-src 'self'; report-uri https://report.fire22.com/csp",
  'Public-Key-Pins':
    'pin-sha256="base64+primary=="; pin-sha256="base64+backup=="; max-age=5184000; includeSubDomains',
};

// Development Security Headers (relaxed for development)
export const DEVELOPMENT_SECURITY_HEADERS = {
  ...MANDATORY_SECURITY_HEADERS,
  'Content-Security-Policy':
    "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
  'X-Fire22-Environment': 'development',
  'X-Fire22-Debug': 'enabled',
};

// CORS Headers
export const CORS_HEADERS = {
  // Production CORS
  'Access-Control-Allow-Origin': 'https://dashboard.fire22.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, X-Fire22-Version, X-Fire22-Build, X-Fire22-Security, X-Request-ID, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers':
    'X-Fire22-Version, X-Fire22-Build, X-Request-ID, X-Rate-Limit-Remaining, X-Rate-Limit-Reset',

  // Development CORS
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, X-Fire22-Version, X-Fire22-Build, X-Fire22-Security, X-Request-ID, X-CSRF-Token, X-Fire22-Debug',
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Max-Age': '86400',
};

// Fire22 System Headers
export const FIRE22_SYSTEM_HEADERS = {
  // Version & Build
  'X-Fire22-Version': '3.0.9',
  'X-Fire22-Build': '2024.08.27.001',
  'X-Fire22-Environment': 'production',

  // Security & Authentication
  'X-Fire22-Security': 'enhanced',
  'X-Fire22-Auth-Level': 'jwt-enhanced',
  'X-Fire22-Session-ID': 'session_uuid',

  // Request Tracking
  'X-Request-ID': 'req_timestamp_uuid',
  'X-Correlation-ID': 'corr_uuid',
  'X-Trace-ID': 'trace_uuid',

  // Performance & Caching
  'X-Fire22-Cache': 'miss|hit|stale',
  'X-Fire22-Cache-TTL': '3600',
  'X-Fire22-Response-Time': '45ms',

  // Rate Limiting
  'X-Rate-Limit-Limit': '100',
  'X-Rate-Limit-Remaining': '95',
  'X-Rate-Limit-Reset': '1640995200',

  // API Information
  'X-API-Version': 'v2.0.0',
  'X-API-Endpoint': '/api/v1/auth/login',
  'X-API-Method': 'POST',
};

// Request Validation Headers
export const REQUEST_VALIDATION_HEADERS = {
  // Client Identification
  'X-Client-ID': 'fire22_dashboard_web',
  'X-Client-Version': '3.0.9',
  'X-Client-Platform': 'web',

  // Request Context
  'X-Requested-With': 'XMLHttpRequest',
  'X-Request-Source': 'dashboard',
  'X-Request-Priority': 'normal|high|critical',

  // Security Validation
  'X-CSRF-Token': 'csrf_token_uuid',
  'X-Anti-Forgery-Token': 'anti_forgery_uuid',
  'X-Device-Fingerprint': 'device_hash',

  // User Context
  'X-User-Agent': 'Fire22-Dashboard/3.0.9 (Enhanced Security)',
  'X-User-Locale': 'en-US',
  'X-User-TimeZone': 'America/New_York',
};

/**
 * 🔐 Header Manager Class
 * Manages all header operations including security, CORS, and system headers
 */
export class HeaderManager {
  private static instance: HeaderManager;
  private environment: string;
  private version: string;
  private build: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.version = process.env.FIRE22_VERSION || '3.0.9';
    this.build = process.env.FIRE22_BUILD || '2024.08.27.001';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): HeaderManager {
    if (!HeaderManager.instance) {
      HeaderManager.instance = new HeaderManager();
    }
    return HeaderManager.instance;
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    const securityHeaders = this.getSecurityHeaders();

    Object.entries(securityHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Get environment-specific security headers
   */
  private getSecurityHeaders(): Record<string, string> {
    return this.environment === 'production'
      ? PRODUCTION_SECURITY_HEADERS
      : DEVELOPMENT_SECURITY_HEADERS;
  }

  /**
   * Apply CORS headers to response
   */
  applyCorsHeaders(response: Response, origin?: string): Response {
    const headers = new Headers(response.headers);
    const corsHeaders = this.getCorsHeaders(origin);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Get CORS headers based on origin and environment
   */
  private getCorsHeaders(origin?: string): Record<string, string> {
    if (this.environment === 'production') {
      return {
        ...CORS_HEADERS,
        'Access-Control-Allow-Origin': origin || 'https://dashboard.fire22.com',
      };
    }
    return CORS_HEADERS;
  }

  /**
   * Apply Fire22 system headers to response
   */
  applySystemHeaders(response: Response, request: Request): Response {
    const headers = new Headers(response.headers);
    const systemHeaders = this.generateSystemHeaders(request);

    Object.entries(systemHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Generate system headers for request
   */
  private generateSystemHeaders(request: Request): Record<string, string> {
    const requestId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const url = new URL(request.url);

    return {
      'X-Fire22-Version': this.version,
      'X-Fire22-Build': this.build,
      'X-Fire22-Environment': this.environment,
      'X-Fire22-Security': 'enhanced',
      'X-Request-ID': `req_${timestamp}_${requestId}`,
      'X-Correlation-ID': requestId,
      'X-Trace-ID': requestId,
      'X-API-Version': 'v2.0.0',
      'X-API-Endpoint': url.pathname,
      'X-API-Method': request.method,
    };
  }

  /**
   * Apply all headers (security + CORS + system) to response
   */
  applyAllHeaders(response: Response, request: Request, origin?: string): Response {
    let enhancedResponse = response;

    // Apply security headers first
    enhancedResponse = this.applySecurityHeaders(enhancedResponse);

    // Apply CORS headers
    enhancedResponse = this.applyCorsHeaders(enhancedResponse, origin);

    // Apply system headers last
    enhancedResponse = this.applySystemHeaders(enhancedResponse, request);

    return enhancedResponse;
  }

  /**
   * Apply JWT-specific headers to response
   */
  applyJWTHeaders(response: Response, jwtData: any): Response {
    const headers = new Headers(response.headers);

    // Add JWT context headers
    if (jwtData.iss) headers.set('X-JWT-Issuer', jwtData.iss);
    if (jwtData.aud) headers.set('X-JWT-Audience', jwtData.aud);
    if (jwtData.exp) headers.set('X-JWT-Expires', jwtData.exp.toString());
    if (jwtData.sub) headers.set('X-JWT-Subject', jwtData.sub);
    if (jwtData.jti) headers.set('X-JWT-ID', jwtData.jti);
    if (jwtData.iat) headers.set('X-JWT-Issued', jwtData.iat.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Apply rate limiting headers to response
   */
  applyRateLimitHeaders(
    response: Response,
    rateLimitData: {
      limit: number;
      remaining: number;
      reset: number;
    }
  ): Response {
    const headers = new Headers(response.headers);

    headers.set('X-Rate-Limit-Limit', rateLimitData.limit.toString());
    headers.set('X-Rate-Limit-Remaining', rateLimitData.remaining.toString());
    headers.set('X-Rate-Limit-Reset', rateLimitData.reset.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Apply cache control headers to response
   */
  applyCacheHeaders(
    response: Response,
    cacheConfig: {
      public?: boolean;
      maxAge?: number;
      staleWhileRevalidate?: number;
      immutable?: boolean;
    }
  ): Response {
    const headers = new Headers(response.headers);

    let cacheControl = '';

    if (cacheConfig.public) {
      cacheControl += 'public, ';
    } else {
      cacheControl += 'private, ';
    }

    if (cacheConfig.maxAge) {
      cacheControl += `max-age=${cacheConfig.maxAge}, `;
    }

    if (cacheConfig.staleWhileRevalidate) {
      cacheControl += `stale-while-revalidate=${cacheConfig.staleWhileRevalidate}, `;
    }

    if (cacheConfig.immutable) {
      cacheControl += 'immutable, ';
    }

    // Remove trailing comma and space
    cacheControl = cacheControl.replace(/,\s*$/, '');

    headers.set('Cache-Control', cacheControl);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Get headers for preflight response
   */
  getPreflightHeaders(origin?: string): Record<string, string> {
    const corsHeaders = this.getCorsHeaders(origin);
    const securityHeaders = this.getSecurityHeaders();

    return {
      ...corsHeaders,
      ...securityHeaders,
      'Access-Control-Max-Age': '86400',
    };
  }

  /**
   * Validate required headers in request
   */
  validateRequestHeaders(request: Request): {
    valid: boolean;
    missing: string[];
    invalid: string[];
  } {
    const requiredHeaders = ['User-Agent', 'Accept', 'Accept-Language'];

    const missing: string[] = [];
    const invalid: string[] = [];

    requiredHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (!value) {
        missing.push(header);
      } else if (header === 'User-Agent' && value.length < 10) {
        invalid.push(header);
      }
    });

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
    };
  }

  /**
   * Log header information for debugging
   */
  logHeaders(headers: Headers, context: string): void {
    if (this.environment === 'development') {
      console.log(`🔐 [${context}] Headers:`, Object.fromEntries(headers.entries()));
    }
  }
}

/**
 * 🚀 Header Manager Factory
 * Creates header managers with specific configurations
 */
export class HeaderManagerFactory {
  /**
   * Create header manager for API endpoints
   */
  static createAPIHeaderManager(): HeaderManager {
    const manager = HeaderManager.getInstance();
    // API-specific configuration can be added here
    return manager;
  }

  /**
   * Create header manager for dashboard endpoints
   */
  static createDashboardHeaderManager(): HeaderManager {
    const manager = HeaderManager.getInstance();
    // Dashboard-specific configuration can be added here
    return manager;
  }

  /**
   * Create header manager for static assets
   */
  static createStaticHeaderManager(): HeaderManager {
    const manager = HeaderManager.getInstance();
    // Static asset-specific configuration can be added here
    return manager;
  }
}

/**
 * 🔍 Header Validator
 * Validates header compliance and security
 */
export class HeaderValidator {
  /**
   * Validate security headers compliance
   */
  static validateSecurityHeaders(headers: Headers): {
    compliant: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const mandatoryHeaders = [
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
    ];

    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    mandatoryHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        score += 20; // 20 points per header
      } else {
        issues.push(`Missing ${header} header`);
        recommendations.push(`Add ${header} header for security compliance`);
      }
    });

    // Check for additional security headers
    const additionalHeaders = [
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Permitted-Cross-Domain-Policies',
    ];

    additionalHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        score = Math.min(score + 10, 100);
      } else {
        recommendations.push(`Consider adding ${header} header for enhanced security`);
      }
    });

    return {
      compliant: score >= 80,
      score: Math.min(score, 100),
      issues,
      recommendations,
    };
  }

  /**
   * Validate CORS headers
   */
  static validateCORSHeaders(headers: Headers): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    const origin = headers.get('Access-Control-Allow-Origin');
    if (!origin) {
      issues.push('Missing Access-Control-Allow-Origin header');
    } else if (origin === '*') {
      issues.push('Wildcard CORS origin may pose security risks in production');
    }

    const methods = headers.get('Access-Control-Allow-Methods');
    if (!methods) {
      issues.push('Missing Access-Control-Allow-Methods header');
    }

    const allowHeaders = headers.get('Access-Control-Allow-Headers');
    if (!allowHeaders) {
      issues.push('Missing Access-Control-Allow-Headers header');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Export default instance
export default HeaderManager.getInstance();

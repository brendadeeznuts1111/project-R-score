/**
 * Enhanced Security Middleware
 * Comprehensive security layer with authentication, rate limiting, and validation
 */

import { AuthService } from '../../../features/authentication/services/auth-service';

export interface SecurityConfig {
  enableAuth: boolean;
  enableRateLimit: boolean;
  enableValidation: boolean;
  enableCORS: boolean;
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  allowedOrigins: string[];
  allowedHeaders: string[];
  allowedMethods: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  requestId: string;
  startTime: number;
}

export interface SecurityContext {
  request: AuthenticatedRequest;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export class SecurityMiddleware {
  private config: SecurityConfig;
  private authService: AuthService;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: SecurityConfig, authService: AuthService) {
    this.config = config;
    this.authService = authService;
  }

  /**
   * Create security context for request processing
   */
  async createSecurityContext(request: Request): Promise<SecurityContext> {
    const authRequest = await this.authenticateRequest(request);
    const context: SecurityContext = {
      request: authRequest,
      isAuthenticated: !!authRequest.user,
      hasPermission: (permission: string) => this.checkPermission(authRequest, permission),
      hasRole: (role: string) => this.checkRole(authRequest, role),
    };

    return context;
  }

  /**
   * Authenticate the incoming request
   */
  private async authenticateRequest(request: Request): Promise<AuthenticatedRequest> {
    const authRequest = request as AuthenticatedRequest;
    authRequest.requestId = this.generateRequestId();
    authRequest.startTime = Date.now();

    if (!this.config.enableAuth) {
      return authRequest;
    }

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return authRequest;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const user = await this.authService.verifyToken(token);
      if (user) {
        authRequest.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        };
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Continue without authentication if token verification fails
    }

    return authRequest;
  }

  /**
   * Check if request should be rate limited
   */
  checkRateLimit(request: AuthenticatedRequest): {
    allowed: boolean;
    resetTime?: number;
    remaining?: number;
  } {
    if (!this.config.enableRateLimit) {
      return { allowed: true };
    }

    const clientId = this.getClientIdentifier(request);
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;

    let clientData = this.rateLimitStore.get(clientId);

    if (!clientData || clientData.resetTime < windowStart) {
      // Reset or initialize rate limit data
      clientData = {
        count: 0,
        resetTime: now + this.config.rateLimitWindowMs,
      };
      this.rateLimitStore.set(clientId, clientData);
    }

    clientData.count++;

    const allowed = clientData.count <= this.config.rateLimitMaxRequests;
    const remaining = Math.max(0, this.config.rateLimitMaxRequests - clientData.count);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      this.cleanupExpiredEntries(now);
    }

    return {
      allowed,
      resetTime: clientData.resetTime,
      remaining,
    };
  }

  /**
   * Validate request input (basic implementation)
   */
  validateRequest(
    request: AuthenticatedRequest,
    schema?: any
  ): { valid: boolean; errors?: string[] } {
    if (!this.config.enableValidation || !schema) {
      return { valid: true };
    }

    const errors: string[] = [];

    // Basic validation - in a real implementation, you'd use a library like Joi or Zod
    // This is a placeholder for demonstration

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Handle CORS
   */
  handleCORS(request: Request): Response | null {
    if (!this.config.enableCORS) {
      return null;
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');

      if (origin && this.isOriginAllowed(origin)) {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': this.config.allowedMethods.join(', '),
            'Access-Control-Allow-Headers': this.config.allowedHeaders.join(', '),
            'Access-Control-Max-Age': '86400',
          },
        });
      }
    }

    return null;
  }

  /**
   * Add security headers to response
   */
  addSecurityHeaders(response: Response, request: AuthenticatedRequest): Response {
    const headers = new Headers(response.headers);

    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Add request ID for tracing
    headers.set('X-Request-ID', request.requestId);

    // Add processing time
    const processingTime = Date.now() - request.startTime;
    headers.set('X-Processing-Time', `${processingTime}ms`);

    // Add user info if authenticated
    if (request.user) {
      headers.set('X-User-ID', request.user.id);
      headers.set('X-User-Role', request.user.role);
    }

    // HSTS header for HTTPS
    if (request.url.startsWith('https://')) {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(
    error: string,
    code: string,
    status: number,
    request: AuthenticatedRequest,
    details?: any
  ): Response {
    const errorResponse = {
      success: false,
      error: {
        code,
        message: error,
        details,
      },
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
      path: new URL(request.url).pathname,
      method: request.method,
    };

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': request.requestId,
      },
    });
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: AuthenticatedRequest): string {
    // Use user ID if authenticated, otherwise use IP
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    // Get client IP (in Cloudflare Workers, this is available in request.cf?.colo or similar)
    // For now, use a hash of the user agent and some headers
    const userAgent = request.headers.get('User-Agent') || '';
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const identifier = `${userAgent}:${acceptLanguage}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `anon:${Math.abs(hash)}`;
  }

  /**
   * Check if user has specific permission
   */
  private checkPermission(request: AuthenticatedRequest, permission: string): boolean {
    if (!request.user) {
      return false;
    }

    return (
      request.user.permissions.includes(permission) ||
      request.user.permissions.includes('*') ||
      (request.user.role === 'admin' && permission !== 'super-admin')
    );
  }

  /**
   * Check if user has specific role
   */
  private checkRole(request: AuthenticatedRequest, role: string): boolean {
    if (!request.user) {
      return false;
    }

    const roleHierarchy = {
      user: 1,
      moderator: 2,
      admin: 3,
      'super-admin': 4,
    };

    const userRoleLevel = roleHierarchy[request.user.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if origin is allowed for CORS
   */
  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    return this.config.allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Simple wildcard matching
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(now: number): void {
    const expiredKeys: string[] = [];

    for (const [key, data] of this.rateLimitStore) {
      if (data.resetTime < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.rateLimitStore.delete(key));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get middleware function for request processing
   */
  getMiddleware(): (request: Request) => Promise<Response | null> {
    return async (request: Request): Promise<Response | null> => {
      // Handle CORS first
      const corsResponse = this.handleCORS(request);
      if (corsResponse) {
        return corsResponse;
      }

      // Create security context
      const context = await this.createSecurityContext(request);

      // Check rate limit
      const rateLimitResult = this.checkRateLimit(context.request);
      if (!rateLimitResult.allowed) {
        const resetTime = rateLimitResult.resetTime
          ? new Date(rateLimitResult.resetTime)
          : new Date();
        return this.createErrorResponse(
          'Rate limit exceeded',
          'RATE_LIMIT_EXCEEDED',
          429,
          context.request,
          {
            resetTime: resetTime.toISOString(),
            remaining: rateLimitResult.remaining || 0,
          }
        );
      }

      // Add rate limit headers to request for later use
      (context.request as any).rateLimit = rateLimitResult;

      return null; // Continue to next middleware
    };
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  enableAuth: true,
  enableRateLimit: true,
  enableValidation: true,
  enableCORS: true,
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100, // 100 requests per 15 minutes
  allowedOrigins: ['http://localhost:3000', 'https://dashboard.fire22.com', 'https://*.fire22.com'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
};

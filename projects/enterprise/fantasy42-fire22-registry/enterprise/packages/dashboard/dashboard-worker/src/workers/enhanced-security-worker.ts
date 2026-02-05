/**
 * 🛡️ Enhanced Security Cloudflare Worker with Fire22 Integration
 *
 * Provides comprehensive API security with:
 * - JWT token authentication and validation
 * - Enhanced security headers and CORS
 * - Rate limiting and IP-based security
 * - Integration with Fire22 security infrastructure
 * - Comprehensive audit logging and monitoring
 */

// Enhanced CORS headers with Fire22 security
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://fire22.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-CSRF-Token, X-API-Version, X-Client-ID, X-Fire22-Security, X-Request-ID',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// Security configuration
const SECURITY_CONFIG = {
  JWT_SECRET: 'your-super-secret-key-change-this-in-production',
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 10,
  TOKEN_EXPIRY_SECONDS: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY_SECONDS: 86400, // 24 hours
  ALLOWED_ORIGINS: ['https://fire22.com', 'https://dashboard.fire22.com'],
  SECURITY_LEVEL: 'enhanced',
};

// Rate limiting storage (use KV in production)
const rateLimit = new Map();

// Security audit log
interface SecurityAuditLog {
  timestamp: string;
  event: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  requestId: string;
  securityLevel: string;
  status: 'success' | 'warning' | 'error';
  details: Record<string, any>;
}

/**
 * Check rate limiting per IP with enhanced security
 */
function checkRateLimit(
  ip: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS;
  const maxRequests = SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW;

  const key = `${ip}:${endpoint}`;

  if (!rateLimit.has(key)) {
    rateLimit.set(key, []);
  }

  const requests = rateLimit.get(key).filter(time => now - time < windowMs);

  if (requests.length >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: now + windowMs };
  }

  requests.push(now);
  rateLimit.set(key, requests);

  return {
    allowed: true,
    remaining: maxRequests - requests.length,
    resetTime: now + windowMs,
  };
}

/**
 * Enhanced JWT verification with security checks
 */
async function verifyJWT(token: string): Promise<any> {
  try {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      throw new Error('Invalid JWT format');
    }

    // Decode payload
    const decodedPayload = JSON.parse(atob(payload));

    // Check expiration
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Check token type if specified
    if (decodedPayload.type && decodedPayload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // Verify signature (simplified - use jose library in production)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SECURITY_CONFIG.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${header}.${payload}`);
    const sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, sig, data);

    if (!valid) {
      throw new Error('Invalid signature');
    }

    return decodedPayload;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

/**
 * Generate JWT token with enhanced security
 */
function generateJWT(payload: any, type: 'access' | 'refresh' = 'access'): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: 'fire22-key-1', // Key ID for rotation
  };

  const now = Math.floor(Date.now() / 1000);
  const expiry =
    type === 'access'
      ? SECURITY_CONFIG.TOKEN_EXPIRY_SECONDS
      : SECURITY_CONFIG.REFRESH_TOKEN_EXPIRY_SECONDS;

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiry,
    type,
    iss: 'fire22-dashboard',
    aud: 'fire22-api',
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(tokenPayload));

  // In production, use proper HMAC signing
  const signature = btoa(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Log security audit events
 */
function logSecurityAudit(auditLog: SecurityAuditLog): void {
  // Log to console in development
  console.log('🔒 Security Audit:', JSON.stringify(auditLog, null, 2));

  // In production, send to security monitoring service
  // This could be sent to a KV store, external API, or Cloudflare Analytics
}

/**
 * Validate request security headers
 */
function validateSecurityHeaders(headers: Headers): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check required headers
  const requiredHeaders = ['X-API-Version', 'X-Client-ID', 'X-Request-ID'];
  for (const header of requiredHeaders) {
    if (!headers.get(header)) {
      issues.push(`Missing required header: ${header}`);
    }
  }

  // Validate API version
  const apiVersion = headers.get('X-API-Version');
  if (apiVersion && !/^v\d+$/.test(apiVersion)) {
    issues.push('Invalid API version format');
  }

  // Validate client ID format
  const clientId = headers.get('X-Client-ID');
  if (clientId && !clientId.startsWith('fire22_')) {
    issues.push('Invalid client ID format');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Enhanced request handler with security features
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  const requestId = request.headers.get('X-Request-ID') || `req_${Date.now()}`;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
      },
    });
  }

  // Validate origin
  const origin = request.headers.get('Origin');
  if (origin && !SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      event: 'origin_validation_failed',
      ip,
      userAgent,
      endpoint: path,
      method,
      requestId,
      securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
      status: 'error',
      details: { origin, allowedOrigins: SECURITY_CONFIG.ALLOWED_ORIGINS },
    });

    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(ip, path);
  if (!rateLimitResult.allowed) {
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      event: 'rate_limit_exceeded',
      ip,
      userAgent,
      endpoint: path,
      method,
      requestId,
      securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
      status: 'warning',
      details: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Validate security headers
  const headerValidation = validateSecurityHeaders(request.headers);
  if (!headerValidation.valid) {
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      event: 'security_headers_validation_failed',
      ip,
      userAgent,
      endpoint: path,
      method,
      requestId,
      securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
      status: 'warning',
      details: { issues: headerValidation.issues },
    });

    return new Response(
      JSON.stringify({
        error: 'Security headers validation failed',
        issues: headerValidation.issues,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Log request start
  logSecurityAudit({
    timestamp: new Date().toISOString(),
    event: 'request_start',
    ip,
    userAgent,
    endpoint: path,
    method,
    requestId,
    securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
    status: 'success',
    details: {
      rateLimitRemaining: rateLimitResult.remaining,
      securityHeaders: headerValidation.valid,
    },
  });

  try {
    let response: Response;

    switch (path) {
      case '/api/v1/auth/login':
        response = await handleLogin(request, ip, userAgent, requestId);
        break;
      case '/api/v1/auth/refresh':
        response = await handleRefresh(request, ip, userAgent, requestId);
        break;
      case '/api/v1/auth/verify':
        response = await handleVerify(request, ip, userAgent, requestId);
        break;
      case '/api/v1/auth/logout':
        response = await handleLogout(request, ip, userAgent, requestId);
        break;
      case '/api/v1/protected':
        response = await handleProtected(request, ip, userAgent, requestId);
        break;
      case '/api/v1/security/status':
        response = await handleSecurityStatus(request, ip, userAgent, requestId);
        break;
      default:
        response = new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Add security headers to response
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    responseHeaders.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    responseHeaders.set('X-Request-ID', requestId);
    responseHeaders.set('X-Fire22-Security', SECURITY_CONFIG.SECURITY_LEVEL);

    // Log successful response
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      event: 'request_success',
      ip,
      userAgent,
      endpoint: path,
      method,
      requestId,
      securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
      status: 'success',
      details: {
        statusCode: response.status,
        rateLimitRemaining: rateLimitResult.remaining,
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    // Log error
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      event: 'request_error',
      ip,
      userAgent,
      endpoint: path,
      method,
      requestId,
      securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
      status: 'error',
      details: { error: error.message },
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle login with enhanced security
 */
async function handleLogin(
  request: Request,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<Response> {
  const { username, password } = await request.json();

  // Validate credentials (replace with database check)
  if (username !== 'fire22_user' || password !== 'secure_password_123') {
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      event: 'login_failed',
      ip,
      userAgent,
      endpoint: '/api/v1/auth/login',
      method: 'POST',
      requestId,
      securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
      status: 'warning',
      details: { username, reason: 'Invalid credentials' },
    });

    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate tokens
  const accessToken = generateJWT({
    sub: 'fire22_user_123',
    username,
    scope: 'read write admin',
    ip,
    userAgent,
  });

  const refreshToken = generateJWT({
    sub: 'fire22_user_123',
    type: 'refresh',
    ip,
  });

  logSecurityAudit({
    timestamp: new Date().toISOString(),
    event: 'login_success',
    ip,
    userAgent,
    endpoint: '/api/v1/auth/login',
    method: 'POST',
    requestId,
    securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
    status: 'success',
    details: { username, tokenType: 'access+refresh' },
  });

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: SECURITY_CONFIG.TOKEN_EXPIRY_SECONDS,
      scope: 'read write admin',
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle token refresh
 */
async function handleRefresh(
  request: Request,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<Response> {
  const { refresh_token } = await request.json();

  try {
    const payload = await verifyJWT(refresh_token);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Validate IP consistency (optional security measure)
    if (payload.ip && payload.ip !== ip) {
      logSecurityAudit({
        timestamp: new Date().toISOString(),
        event: 'refresh_token_ip_mismatch',
        ip,
        userAgent,
        endpoint: '/api/v1/auth/refresh',
        method: 'POST',
        requestId,
        securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
        status: 'warning',
        details: {
          tokenIp: payload.ip,
          requestIp: ip,
        },
      });
    }

    const newAccessToken = generateJWT({
      sub: payload.sub,
      username: payload.username,
      scope: payload.scope || 'read write',
      ip,
      userAgent,
    });

    return new Response(
      JSON.stringify({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: SECURITY_CONFIG.TOKEN_EXPIRY_SECONDS,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle token verification
 */
async function handleVerify(
  request: Request,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = auth.substring(7);
    const payload = await verifyJWT(token);

    return new Response(
      JSON.stringify({
        valid: true,
        user: payload.username,
        scope: payload.scope,
        expires: payload.exp,
        issued: payload.iat,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle logout
 */
async function handleLogout(
  request: Request,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    try {
      const payload = await verifyJWT(token);

      logSecurityAudit({
        timestamp: new Date().toISOString(),
        event: 'logout_success',
        ip,
        userAgent,
        endpoint: '/api/v1/auth/logout',
        method: 'POST',
        requestId,
        securityLevel: SECURITY_CONFIG.SECURITY_LEVEL,
        status: 'success',
        details: { username: payload.username },
      });
    } catch (error) {
      // Token invalid, but still allow logout
    }
  }

  return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle protected resource access
 */
async function handleProtected(
  request: Request,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = auth.substring(7);
    const payload = await verifyJWT(token);

    return new Response(
      JSON.stringify({
        message: 'Protected resource accessed successfully',
        user: payload.username,
        scope: payload.scope,
        timestamp: new Date().toISOString(),
        requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle security status endpoint
 */
async function handleSecurityStatus(
  request: Request,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<Response> {
  const rateLimitResult = checkRateLimit(ip, '/api/v1/security/status');

  return new Response(
    JSON.stringify({
      security: {
        level: SECURITY_CONFIG.SECURITY_LEVEL,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
        headers: {
          cors: true,
          security: true,
          hsts: true,
        },
      },
      timestamp: new Date().toISOString(),
      requestId,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Event listener for Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Export for testing
export {
  handleRequest,
  verifyJWT,
  generateJWT,
  checkRateLimit,
  validateSecurityHeaders,
  logSecurityAudit,
};

/**
 * Security Middleware
 *
 * Provides defense-in-depth for all HTTP requests:
 *   - CORS configuration (configurable origins)
 *   - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
 *   - Request ID generation for distributed tracing
 *   - Request/response logging
 *
 * Applied globally in Bun.serve fetch() before route handlers.
 */

import { env } from "@utils/env";
import { createLogger } from "@utils/logger";

const logger = createLogger("Security");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Allowed CORS origins — comma-separated in ALLOWED_ORIGINS env var */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Trust proxy headers */
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

// ---------------------------------------------------------------------------
// Request ID
// ---------------------------------------------------------------------------

/**
 * Generate a unique request ID for tracing.
 */
export function generateRequestId(): string {
  return `req_${Bun.randomUUIDv7().slice(0, 12)}`;
}

/**
 * Get request ID from headers or generate a new one.
 */
export function getRequestId(req: Request): string {
  const existingId = req.headers.get("X-Request-ID");
  if (existingId) return existingId;
  return generateRequestId();
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/**
 * Determine if the origin is allowed.
 */
function isOriginAllowed(origin: string): boolean {
  // In development, allow all
  if (env.NODE_ENV === "development") return true;

  // No configured origins — allow all (backward compatible)
  if (ALLOWED_ORIGINS.length === 0) return true;

  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isDev = env.NODE_ENV === "development";
  const allowedOrigin = isDev || isOriginAllowed(origin) ? origin || "*" : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, X-Admin-Token, X-Request-ID",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight OPTIONS requests.
 */
export function handleCorsPreflight(req?: Request): Response {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, X-Admin-Token, X-Request-ID",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };

  if (req?.headers.get("Access-Control-Request-Headers")) {
    headers["Access-Control-Allow-Headers"] =
      req.headers.get("Access-Control-Request-Headers")!;
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

/**
 * Get standard security headers to add to all responses.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Prevent clickjacking
    "X-Frame-Options": "DENY",

    // XSS protection (legacy but still useful)
    "X-XSS-Protection": "1; mode=block",

    // Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions policy (restrict browser features)
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",

    // Strict transport security (only in production)
    ...(env.NODE_ENV === "production"
      ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
      : {}),
  };
}

/**
 * Apply security headers to a Response object.
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------

/**
 * Log an incoming request. Returns the request ID.
 */
export function logRequest(
  req: Request,
  pathname: string,
  requestId: string
): string {
  const method = req.method;
  const userAgent = req.headers.get("User-Agent") || "-";
  const clientIp = getClientIp(req);

  logger.debug(`${method} ${pathname}`, {
    requestId,
    clientIp,
    userAgent: userAgent.slice(0, 100),
  });

  return requestId;
}

/**
 * Log a completed response.
 */
export function logResponse(
  requestId: string,
  method: string,
  pathname: string,
  statusCode: number,
  durationMs: number
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "debug";

  if (level === "error") {
    logger.error(`${method} ${pathname} ${statusCode} ${durationMs}ms`, {
      requestId,
      statusCode,
      durationMs,
    });
  } else if (level === "warn") {
    logger.warn(`${method} ${pathname} ${statusCode} ${durationMs}ms`, {
      requestId,
      statusCode,
      durationMs,
    });
  } else {
    logger.debug(`${method} ${pathname} ${statusCode} ${durationMs}ms`, {
      requestId,
      statusCode,
      durationMs,
    });
  }
}

// ---------------------------------------------------------------------------
// Client IP extraction
// ---------------------------------------------------------------------------

/**
 * Extract the real client IP from request headers.
 */
export function getClientIp(req: Request): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp;
  }

  // Fall back to connection info if available
  try {
    const url = new URL(req.url);
    return url.hostname || "unknown";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

/**
 * Create a timing marker for request duration measurement.
 */
export function createTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

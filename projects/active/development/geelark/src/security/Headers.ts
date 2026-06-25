/**
 * Security Headers Middleware
 *
 * https://bun.sh/docs/runtime/http#headers
 * https://owasp.org/www-project-secure-headers/
 */

export interface SecurityHeadersOptions {
  /**
   * X-Frame-Options
   * Prevents clickjacking attacks
   * @default "DENY"
   */
  frameOptions?: "DENY" | "SAMEORIGIN" | "ALLOW-FROM";

  /**
   * X-Content-Type-Options
   * Prevents MIME sniffing
   * @default "nosniff"
   */
  contentTypeOptions?: boolean;

  /**
   * Strict-Transport-Security
   * Enforces HTTPS connections
   * @default "max-age=31536000; includeSubDomains"
   */
  strictTransportSecurity?: string | boolean;

  /**
   * Content-Security-Policy
   * Prevents XSS and data injection attacks
   */
  contentSecurityPolicy?: string;

  /**
   * X-XSS-Protection
   * Enables XSS filtering
   * @deprecated Use CSP instead
   */
  xssProtection?: boolean;

  /**
   * Referrer-Policy
   * Controls referrer information
   * @default "strict-origin-when-cross-origin"
   */
  referrerPolicy?:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";

  /**
   * Permissions-Policy
   * Controls browser features
   */
  permissionsPolicy?: string;

  /**
   * Cross-Origin-Embedder-Policy
   * Controls COOP/COEP
   */
  crossOriginEmbedderPolicy?: "require-corp" | "none";

  /**
   * Cross-Origin-Opener-Policy
   * Controls COOP/COEP
   */
  crossOriginOpenerPolicy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none";
}

/**
 * Default security headers
 */
export const defaultSecurityHeaders: Required<
  Omit<SecurityHeadersOptions, "frameOptions" | "strictTransportSecurity" | "contentSecurityPolicy" | "permissionsPolicy" | "crossOriginEmbedderPolicy" | "crossOriginOpenerPolicy">
> = {
  contentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: "strict-origin-when-cross-origin",
};

/**
 * Create security headers middleware
 */
export function createSecurityHeaders(options: SecurityHeadersOptions = {}) {
  const mergedOptions = { ...defaultSecurityHeaders, ...options };

  return function securityHeaders(
    response: Response
  ): Response {
    const headers = new Headers(response.headers);

    // X-Frame-Options
    if (mergedOptions.frameOptions) {
      headers.set("X-Frame-Options", mergedOptions.frameOptions);
    }

    // X-Content-Type-Options
    if (mergedOptions.contentTypeOptions) {
      headers.set("X-Content-Type-Options", "nosniff");
    }

    // Strict-Transport-Security
    if (mergedOptions.strictTransportSecurity === true) {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    } else if (typeof mergedOptions.strictTransportSecurity === "string") {
      headers.set("Strict-Transport-Security", mergedOptions.strictTransportSecurity);
    }

    // Content-Security-Policy
    if (mergedOptions.contentSecurityPolicy) {
      headers.set("Content-Security-Policy", mergedOptions.contentSecurityPolicy);
    }

    // X-XSS-Protection
    if (mergedOptions.xssProtection) {
      headers.set("X-XSS-Protection", "1; mode=block");
    }

    // Referrer-Policy
    if (mergedOptions.referrerPolicy) {
      headers.set("Referrer-Policy", mergedOptions.referrerPolicy);
    }

    // Permissions-Policy
    if (mergedOptions.permissionsPolicy) {
      headers.set("Permissions-Policy", mergedOptions.permissionsPolicy);
    }

    // Cross-Origin-Embedder-Policy
    if (mergedOptions.crossOriginEmbedderPolicy) {
      headers.set("Cross-Origin-Embedder-Policy", mergedOptions.crossOriginEmbedderPolicy);
    }

    // Cross-Origin-Opener-Policy
    if (mergedOptions.crossOriginOpenerPolicy) {
      headers.set("Cross-Origin-Opener-Policy", mergedOptions.crossOriginOpenerPolicy);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Apply security headers to a Response
 */
export function withSecurityHeaders(
  response: Response,
  options: SecurityHeadersOptions = {}
): Response {
  return createSecurityHeaders(options)(response);
}

/**
 * Recommended CSP for modern applications
 */
export const CSP_PRESETS = {
  /**
   * Strict CSP for applications without inline scripts
   */
  strict: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),

  /**
   * Moderate CSP allowing some external resources
   */
  moderate: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.github.com",
    "frame-src 'self'",
  ].join("; "),

  /**
   * Development CSP with relaxed rules
   */
  development: [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    "connect-src 'self' ws://localhost:* http://localhost:*",
  ].join("; "),
};

/**
 * Common Permissions-Policy directives
 */
export const PERMISSIONS_PRESETS = {
  /**
   * Minimal permissions - deny everything by default
   */
  minimal: [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ].join(", "),

  /**
   * Standard permissions for typical web apps
   */
  standard: [
    "geolocation=(self)",
    "microphone=()",
    "camera=(self)",
    "payment=(self)",
  ].join(", "),
};

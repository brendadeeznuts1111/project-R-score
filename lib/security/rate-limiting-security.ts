/**
 * lib/security/rate-limiting-security.ts
 *
 * Stub replacement for the missing rate-limiting-security module.
 * The original module was removed; this stub preserves the server
 * startup contract while applying a minimal no-op security layer.
 *
 * The base server already catches middleware initialization failures
 * and falls back to a no-op middleware, so this stub keeps the same
 * interface without requiring wider refactors.
 */

export interface SecurityMiddleware {
  apply(request: Request, handler: () => Promise<Response>): Promise<Response>;
}

export interface SecurityPresetsShape {
  productionAPI: string;
  development: string;
}

export const SecurityPresets: SecurityPresetsShape = {
  productionAPI: 'productionAPI',
  development: 'development',
};

export interface CORSConfig {
  maxRequests?: number;
  windowMs?: number;
}

export interface SecurityConfig {
  rateLimit?: CORSConfig;
  securityHeaders?: {
    customHeaders?: Record<string, string>;
  };
}

export function createCORSHeaders(
  origins: string[],
  methods: string[],
  headers: string[]
): Record<string, string> {
  const origin = origins.includes('*') ? '*' : origins.join(', ');
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': headers.join(', '),
  };
}

export function createSecurityMiddleware(
  _preset: string,
  _config?: Partial<SecurityConfig>
): SecurityMiddleware {
  return {
    async apply(_request: Request, handler: () => Promise<Response>): Promise<Response> {
      return handler();
    },
  };
}

export default createSecurityMiddleware;

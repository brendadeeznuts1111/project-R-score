/**
 * @fileoverview Cookie Security v3.26 - Tier-1380 OMEGA Protocol
 * @description Bun-native cookie security implementation with A+ to F grading
 * @author FactoryWager Engineering
 * @version 3.26.0
 * @license MIT
 * 
 * @see {@link https://bun.sh/docs/api/cookies Bun Cookie API Documentation}
 * @see {@link https://bun.sh/docs/api/hashing Bun CryptoHasher Documentation}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies MDN HTTP Cookies}
 * @see {@link https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html OWASP Session Management}
 * 
 * @example
 * ```typescript
 * import { cookieSecurity, variantManager } from './cookie-security-v3.26';
 * 
 * // Parse and validate incoming cookie
 * const { cookie, report } = cookieSecurity.parseAndValidate(
 *   'session=abc; Secure; HttpOnly; SameSite=Strict'
 * );
 * console.log(report.grade); // 'A+'
 * 
 * // Create secure session cookie
 * const { cookie: sessionCookie, report } = cookieSecurity.createSecure(
 *   'sid', 
 *   { userId: 123 }, 
 *   'session'
 * );
 * 
 * // Generate CSRF token
 * const { token, cookie: csrfCookie } = await cookieSecurity.generateCSRF('session_123');
 * ```
 */

import { Cookie, CookieMap } from 'bun';
import crypto from 'node:crypto';

/**
 * Bun Cookie options interface
 * @see {@link https://bun.sh/docs/api/cookies#cookie-properties Bun Cookie Properties}
 */
interface CookieOptions {
  /** Cookie is only sent over HTTPS connections */
  secure?: boolean;
  /** Cookie is inaccessible to JavaScript (prevents XSS) */
  httpOnly?: boolean;
  /** Controls cross-site request behavior */
  sameSite?: 'strict' | 'lax' | 'none';
  /** URL path scope for the cookie */
  path?: string;
  /** Maximum age in seconds */
  maxAge?: number;
  /** Domain scope (null for host-only) */
  domain?: string | null;
  /** Partitioned cookies for privacy sandbox */
  partitioned?: boolean;
}

/**
 * Security configuration constants
 * @readonly
 */
const SECURITY_CONFIG = {
  /** Minimum score for valid cookie (out of 100) */
  MIN_SCORE: 80,
  /** Default session cookie max-age: 1 day */
  MAX_AGE_SESSION: 60 * 60 * 24,
  /** Default persistent cookie max-age: 1 year */
  MAX_AGE_PERSISTENT: 60 * 60 * 24 * 365,
  /** CSRF secret from environment or generated */
  CSRF_SECRET: Bun.env.CSRF_SECRET || Bun.hash.crc32(crypto.randomUUID()).toString(16)
} as const;

/**
 * Security report interface returned from audit operations
 * @interface
 */
export interface SecurityReport {
  /** Whether the cookie meets minimum security requirements */
  valid: boolean;
  /** Security score (0-100) */
  score: number;
  /** Letter grade based on score */
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  /** Critical security issues found */
  issues: string[];
  /** Non-critical warnings */
  warnings: string[];
  /** Recommended security headers */
  headers: {
    'Strict-Transport-Security'?: string;
    'X-Frame-Options'?: string;
    'X-Content-Type-Options'?: string;
  };
}

/**
 * Debug logging utility (disabled in production)
 */
const debug = {
  enabled: Bun.env.DEBUG_COOKIE_SECURITY === 'true',
  log: (msg: string, ...args: unknown[]) => {
    if (debug.enabled) {
      console.log(`[🍪 CookieSecurity] ${msg}`, ...args);
    }
  },
  error: (msg: string, ...args: unknown[]) => {
    if (debug.enabled) {
      console.error(`[🍪 CookieSecurity] ERROR: ${msg}`, ...args);
    }
  }
};

/**
 * Tier-1380 Cookie Security Engine
 * 
 * Implements production-grade cookie security with:
 * - Native Bun Cookie.parse/from APIs (C++ performance)
 * - Comprehensive security auditing with A+ to F grading
 * - CSRF protection using Bun.CryptoHasher
 * - OWASP-compliant security headers
 * 
 * @see {@link https://bun.sh/docs/api/cookies Bun Cookie API}
 * @see {@link https://bun.sh/docs/api/hashing Bun.CryptoHasher}
 * 
 * @example
 * ```typescript
 * const security = new Tier1380CookieSecurity();
 * 
 * // Audit existing cookie
 * const report = security.audit(cookie);
 * if (!report.valid) {
 *   console.error('Security issues:', report.issues);
 * }
 * ```
 */
export class Tier1380CookieSecurity {
  private csrfTokens = new Map<string, { token: string; expires: number }>();

  /**
   * Parse a cookie header string and immediately validate security
   * 
   * Uses Bun's native {@link https://bun.sh/docs/api/cookies#cookie.parse Cookie.parse()} 
   * for high-performance C++ parsing.
   * 
   * @param headerValue - Raw cookie header string (e.g., "session=abc; Secure; HttpOnly")
   * @returns Object containing parsed cookie and security report
   * 
   * @example
   * ```typescript
   * const { cookie, report } = security.parseAndValidate(
   *   'session=abc123; Secure; HttpOnly; SameSite=Strict'
   * );
   * 
   * if (report.grade === 'A+') {
   *   console.log('Excellent security!');
   * }
   * ```
   */
  parseAndValidate(headerValue: string): { cookie: Cookie | null; report: SecurityReport } {
    debug.log('Parsing cookie header:', headerValue.slice(0, 50) + '...');
    
    try {
      const cookie = Cookie.parse(headerValue);
      const report = this.audit(cookie);
      
      debug.log('Parsed cookie:', cookie.name, '| Grade:', report.grade, '| Score:', report.score);
      return { cookie, report };
    } catch (error) {
      debug.error('Failed to parse cookie:', error);
      return {
        cookie: null,
        report: this.failReport('Parse error: invalid cookie format')
      };
    }
  }

  /**
   * Perform comprehensive security audit on a cookie
   * 
   * Checks for:
   * - Secure flag (HTTPS requirement)
   * - HttpOnly flag (XSS prevention)
   * - SameSite attribute (CSRF protection)
   * - Cookie prefixes (__Host-, __Secure-)
   * - Maximum age validation
   * - Partitioned attribute
   * 
   * @param cookie - Bun Cookie instance to audit
   * @returns Complete security report with grade and recommendations
   * 
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies MDN Cookie Security}
   * @see {@link https://owasp.org/www-community/SameSite OWASP SameSite Guide}
   */
  audit(cookie: Cookie): SecurityReport {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    debug.log('Auditing cookie:', cookie.name);

    // Critical: Secure flag prevents MITM attacks
    if (!cookie.secure) {
      issues.push('Missing Secure flag (MITM vulnerability)');
      score -= 25;
      debug.log('  ✗ Missing Secure flag (-25 points)');
    } else {
      debug.log('  ✓ Secure flag present');
    }

    // Critical: HttpOnly prevents XSS cookie theft
    if (!cookie.httpOnly) {
      issues.push('Missing HttpOnly flag (XSS vulnerability)');
      score -= 25;
      debug.log('  ✗ Missing HttpOnly flag (-25 points)');
    } else {
      debug.log('  ✓ HttpOnly flag present');
    }

    // Critical: SameSite prevents CSRF
    if (cookie.sameSite !== 'strict') {
      if (cookie.sameSite === 'none') {
        issues.push('SameSite=None requires Secure (CSRF risk)');
        score -= 20;
        debug.log('  ✗ SameSite=None without Secure (-20 points)');
      } else {
        warnings.push('SameSite=Lax allows cross-site GET requests');
        score -= 10;
        debug.log('  ⚠ SameSite=Lax (-10 points)');
      }
    } else {
      debug.log('  ✓ SameSite=Strict');
    }

    // Lifetime validation
    if (cookie.maxAge) {
      if (cookie.maxAge > SECURITY_CONFIG.MAX_AGE_PERSISTENT) {
        issues.push(`MaxAge exceeds ${SECURITY_CONFIG.MAX_AGE_PERSISTENT}s (1 year)`);
        score -= 15;
        debug.log('  ✗ MaxAge too long (-15 points)');
      } else if (cookie.maxAge > SECURITY_CONFIG.MAX_AGE_SESSION) {
        warnings.push('Long-lived cookie (consider session duration)');
        score -= 5;
        debug.log('  ⚠ Long-lived cookie (-5 points)');
      }
    }

    // Cookie prefix validation per RFC 6265bis
    if (cookie.name.startsWith('__Secure-') && !cookie.secure) {
      issues.push('__Secure- prefix requires Secure flag');
      score -= 30;
      debug.log('  ✗ __Secure- without Secure (-30 points)');
    }

    if (cookie.name.startsWith('__Host-')) {
      if (!cookie.secure) {
        issues.push('__Host- prefix requires Secure flag');
        score -= 30;
        debug.log('  ✗ __Host- without Secure (-30 points)');
      }
      if (cookie.path !== '/') {
        issues.push('__Host- prefix requires Path=/');
        score -= 20;
        debug.log('  ✗ __Host- without Path=/ (-20 points)');
      }
      if (cookie.domain !== null) {
        issues.push('__Host- prefix must not have Domain');
        score -= 20;
        debug.log('  ✗ __Host- with Domain (-20 points)');
      }
      if (cookie.secure && cookie.path === '/' && cookie.domain === null) {
        debug.log('  ✓ Valid __Host- prefix');
      }
    }

    // Partitioned attribute (CHIPS)
    if (cookie.partitioned && !cookie.secure) {
      warnings.push('Partitioned without Secure (browser rejection risk)');
      score -= 5;
      debug.log('  ⚠ Partitioned without Secure (-5 points)');
    }

    const finalScore = Math.max(0, score);
    const report: SecurityReport = {
      valid: finalScore >= SECURITY_CONFIG.MIN_SCORE && issues.length === 0,
      score: finalScore,
      grade: this.scoreToGrade(finalScore),
      issues,
      warnings,
      headers: this.securityHeaders(cookie)
    };

    debug.log('Audit complete:', report.grade, `(${finalScore}/100)`);
    return report;
  }

  /**
   * Convert numeric score to letter grade
   * @private
   */
  private scoreToGrade(score: number): SecurityReport['grade'] {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate failure report for parse errors
   * @private
   */
  private failReport(reason: string): SecurityReport {
    return {
      valid: false,
      score: 0,
      grade: 'F',
      issues: [reason],
      warnings: [],
      headers: {}
    };
  }

  /**
   * Generate recommended security headers based on cookie properties
   * @private
   */
  private securityHeaders(cookie: Cookie): SecurityReport['headers'] {
    const headers: SecurityReport['headers'] = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff'
    };

    // HSTS for secure cookies
    if (cookie.secure) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }

  /**
   * Create a secure cookie with pre-configured security defaults
   * 
   * Uses Bun's native {@link https://bun.sh/docs/api/cookies#cookie.from Cookie.from()}
   * for optimal performance.
   * 
   * @param name - Cookie name
   * @param value - Cookie value (string or object)
   * @param type - Cookie type: 'session' | 'auth' | 'csrf' | 'preferences'
   * @param overrides - Optional property overrides
   * @returns Cookie instance and security report
   * 
   * @example
   * ```typescript
   * // Session cookie (1 day, HttpOnly)
   * const { cookie, report } = security.createSecure('sid', 'abc123', 'session');
   * 
   * // Auth cookie (4 hours, strict)
   * const { cookie } = security.createSecure('auth', token, 'auth');
   * 
   * // Preferences (1 year, JS-accessible)
   * const { cookie } = security.createSecure('prefs', {theme: 'dark'}, 'preferences');
   * ```
   */
  createSecure(
    name: string,
    value: string | object,
    type: 'session' | 'auth' | 'csrf' | 'preferences' = 'session',
    overrides: Partial<CookieOptions> = {}
  ): { cookie: Cookie; report: SecurityReport } {
    const val = typeof value === 'string' ? value : JSON.stringify(value);

    // Security defaults for each cookie type
    const defaults: Record<string, CookieOptions> = {
      session: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: SECURITY_CONFIG.MAX_AGE_SESSION
      },
      auth: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 4 // 4 hours
      },
      csrf: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        path: '/'
      },
      preferences: {
        secure: true,
        httpOnly: false, // Allow JS access for preferences
        sameSite: 'lax',
        path: '/',
        maxAge: SECURITY_CONFIG.MAX_AGE_PERSISTENT
      }
    };

    debug.log('Creating', type, 'cookie:', name);

    const opts = { ...defaults[type], ...overrides };
    const cookie = Cookie.from(name, val, opts as CookieOptions);
    const report = this.audit(cookie);

    debug.log('Cookie created:', name, '| Grade:', report.grade);
    return { cookie, report };
  }

  /**
   * Generate cryptographically secure CSRF token
   * 
   * Uses {@link https://bun.sh/docs/api/hashing Bun.CryptoHasher} for high-performance
   * SHA-256 HMAC token generation.
   * 
   * @param sessionId - User session identifier
   * @returns Token string and associated cookie
   * @throws Never throws, always returns a token
   * 
   * @example
   * ```typescript
   * const { token, cookie } = await security.generateCSRF('user_session_123');
   * 
   * // Send token in response header
   * response.headers.set('X-CSRF-Token', token);
   * 
   * // Set cookie
   * response.headers.set('Set-Cookie', cookie.serialize());
   * ```
   */
  async generateCSRF(sessionId: string): Promise<{ token: string; cookie: Cookie }> {
    debug.log('Generating CSRF token for session:', sessionId);

    try {
      // Use Bun.CryptoHasher for high-performance SHA-256
      const hasher = new Bun.CryptoHasher('sha256', SECURITY_CONFIG.CSRF_SECRET);
      hasher.update(sessionId);
      hasher.update(crypto.randomUUID());
      hasher.update(Date.now().toString());
      
      const token = hasher.digest('base64url').slice(0, 32);
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour

      this.csrfTokens.set(sessionId, { token, expires });
      debug.log('CSRF token generated:', token.slice(0, 8) + '...');

      const { cookie } = this.createSecure('csrf_token', token, 'csrf');
      
      return { token, cookie };
    } catch (error) {
      debug.error('CSRF generation failed:', error);
      // Fallback: generate simple random token
      const fallbackToken = Bun.hash.crc32(crypto.randomUUID()).toString(16).slice(0, 32);
      const { cookie } = this.createSecure('csrf_token', fallbackToken, 'csrf');
      return { token: fallbackToken, cookie };
    }
  }

  /**
   * Validate a submitted CSRF token against stored token
   * 
   * Tokens expire after 1 hour automatically.
   * 
   * @param sessionId - User session identifier
   * @param submittedToken - Token submitted by client
   * @returns True if token is valid and not expired
   * 
   * @example
   * ```typescript
   * // In API route
   * const isValid = security.validateCSRF(
   *   request.cookies.get('session'),
   *   request.headers.get('X-CSRF-Token')
   * );
   * 
   * if (!isValid) {
   *   return new Response('Invalid CSRF token', { status: 403 });
   * }
   * ```
   */
  validateCSRF(sessionId: string, submittedToken: string): boolean {
    if (!sessionId || !submittedToken) {
      debug.log('CSRF validation failed: missing session or token');
      return false;
    }

    const stored = this.csrfTokens.get(sessionId);
    if (!stored) {
      debug.log('CSRF validation failed: no stored token for session');
      return false;
    }

    // Check expiration
    if (Date.now() > stored.expires) {
      this.csrfTokens.delete(sessionId);
      debug.log('CSRF validation failed: token expired');
      return false;
    }

    const valid = stored.token === submittedToken;
    debug.log('CSRF validation:', valid ? '✓ valid' : '✗ invalid');
    return valid;
  }

  /**
   * Start automatic cleanup of expired CSRF tokens
   * 
   * Runs every hour to prevent memory leaks.
   * Call this once when your server starts.
   * 
   * @example
   * ```typescript
   * // In server startup
   * cookieSecurity.startCleanup();
   * ```
   */
  startCleanup(): void {
    debug.log('Starting CSRF token cleanup (hourly)');
    
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [id, data] of this.csrfTokens.entries()) {
        if (now > data.expires) {
          this.csrfTokens.delete(id);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        debug.log('Cleaned up', cleaned, 'expired CSRF tokens');
      }
    }, 60 * 60 * 1000); // Hourly
  }

  /**
   * Get current CSRF token statistics
   * @returns Object with active and expired token counts
   */
  getCSRFStats(): { active: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const [, data] of this.csrfTokens.entries()) {
      if (now > data.expires) expired++;
    }
    
    return {
      active: this.csrfTokens.size - expired,
      expired
    };
  }

  /**
   * Clear all stored CSRF tokens (useful for testing)
   */
  clearCSRFTokens(): void {
    debug.log('Clearing all CSRF tokens');
    this.csrfTokens.clear();
  }
}

/**
 * Secure A/B Testing Variant Manager
 * 
 * Creates cryptographically signed variant cookies for A/B testing.
 * Prevents tampering by verifying HMAC signature on each request.
 * 
 * @see {@link https://bun.sh/docs/api/hashing Bun.CryptoHasher}
 * 
 * @example
 * ```typescript
 * const variantManager = new SecureVariantManager();
 * 
 * // Assign user to variant A
 * const { cookie, signature } = variantManager.createVariantCookie('user_123', 'A');
 * 
 * // Validate on subsequent requests
 * const result = variantManager.validateVariant(cookieValue, 'user_123');
 * if (result.valid) {
 *   console.log('User is in variant:', result.variant); // 'A'
 * }
 * ```
 */
export class SecureVariantManager {
  private variants = new Map<string, string>();

  /**
   * Create a signed variant assignment cookie
   * 
   * @param userId - Unique user identifier
   * @param variant - Variant name ('A', 'B', or 'control')
   * @param options - Optional maxAge and domain overrides
   * @returns Cookie and signature for verification
   * 
   * @example
   * ```typescript
   * const { cookie, signature } = variantManager.createVariantCookie(
   *   userId,
   *   Math.random() > 0.5 ? 'A' : 'B',
   *   { maxAge: 60 * 60 * 24 * 30 } // 30 days
   * );
   * 
   * response.headers.set('Set-Cookie', cookie.serialize());
   * ```
   */
  createVariantCookie(
    userId: string,
    variant: 'A' | 'B' | 'control',
    options: { maxAge?: number; domain?: string } = {}
  ): { cookie: Cookie; signature: string } {
    debug.log('Creating variant cookie:', userId, '->', variant);

    // Create HMAC signature using Bun.CryptoHasher
    const variantSecret = Bun.env.VARIANT_SECRET || SECURITY_CONFIG.CSRF_SECRET;
    const hasher = new Bun.CryptoHasher('sha256', variantSecret);
    hasher.update(userId);
    hasher.update(variant);
    hasher.update(Date.now().toString());
    const signature = hasher.digest('hex').slice(0, 16);

    const value = JSON.stringify({ v: variant, s: signature, t: Date.now() });

    const { cookie } = cookieSecurity.createSecure('ab_variant', value, 'preferences', {
      maxAge: options.maxAge || 60 * 60 * 24 * 30, // 30 days
      domain: options.domain || null
    });

    debug.log('Variant cookie created:', signature);
    return { cookie, signature };
  }

  /**
   * Validate a variant cookie against tampering
   * 
   * Verifies:
   * - HMAC signature matches userId + variant + timestamp
   * - Cookie is not expired (>30 days old)
   * - JSON structure is valid
   * 
   * @param cookieValue - The cookie value (may be URL-encoded)
   * @param userId - Expected user identifier
   * @returns Validation result with variant name if valid
   * 
   * @example
   * ```typescript
   * const result = variantManager.validateVariant(
   *   request.cookies.get('ab_variant'),
   *   session.userId
   * );
   * 
   * if (result.valid) {
   *   // Show variant-specific UI
   *   return result.variant === 'A' ? variantA() : variantB();
   * } else {
   *   // Assign to new variant
   *   const { cookie } = variantManager.createVariantCookie(session.userId, 'A');
   * }
   * ```
   */
  validateVariant(cookieValue: string, userId: string): { valid: boolean; variant?: string } {
    if (!cookieValue || !userId) {
      debug.log('Variant validation failed: missing value or userId');
      return { valid: false };
    }

    try {
      // Handle URL-encoded cookie values from CookieMap
      const decodedValue = decodeURIComponent(cookieValue);
      const parsed = JSON.parse(decodedValue);

      // Verify HMAC signature
      const variantSecret = Bun.env.VARIANT_SECRET || SECURITY_CONFIG.CSRF_SECRET;
      const hasher = new Bun.CryptoHasher('sha256', variantSecret);
      hasher.update(userId);
      hasher.update(parsed.v);
      hasher.update(parsed.t.toString());
      const expectedSig = hasher.digest('hex').slice(0, 16);

      if (parsed.s !== expectedSig) {
        debug.log('Variant validation failed: signature mismatch');
        return { valid: false };
      }

      // Check expiration (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.t > maxAge) {
        debug.log('Variant validation failed: expired');
        return { valid: false };
      }

      debug.log('Variant validation successful:', parsed.v);
      return { valid: true, variant: parsed.v };
    } catch (error) {
      debug.error('Variant validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Get statistics about tracked variants
   * @returns Map of variant names to counts
   */
  getVariantStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const variant of this.variants.values()) {
      stats[variant] = (stats[variant] || 0) + 1;
    }
    
    return stats;
  }
}

/**
 * Global singleton instance for convenience
 * @see {@link Tier1380CookieSecurity}
 */
export const cookieSecurity = new Tier1380CookieSecurity();

/**
 * Global singleton variant manager for convenience
 * @see {@link SecureVariantManager}
 */
export const variantManager = new SecureVariantManager();

/**
 * Export security configuration for advanced use cases
 */
export { SECURITY_CONFIG };

// Default export
export default {
  cookieSecurity,
  variantManager,
  Tier1380CookieSecurity,
  SecureVariantManager,
  SECURITY_CONFIG
};

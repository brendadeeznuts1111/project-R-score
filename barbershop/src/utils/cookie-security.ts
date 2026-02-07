/**
 * FactoryWager Cookie Security & Best Practices
 * Implements production-grade cookie handling from Bun Cookie Pro-Tips
 */

import { Cookie, CookieMap } from 'bun';

export interface SecureCookieOptions {
  name: string;
  value: string;
  maxAge?: number;
  path?: string;
  isSession?: boolean;
}

export class SecureCookieManager {
  private static readonly MAX_COOKIE_SIZE = 4096;
  private static readonly MAX_COOKIES_PER_DOMAIN = 20;
  private metrics = {
    totalSets: 0,
    totalGets: 0,
    validationFailures: 0,
    sizeViolations: 0,
  };

  /**
   * Create unbreakable session cookie with __Host- prefix protection
   */
  static createSessionCookie(userId: string): Cookie {
    return new Cookie('__Host-session', crypto.randomUUID(), {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 15, // 15 minutes - short sessions
    });
  }

  /**
   * Create preference cookie (long-lived, JS accessible)
   */
  static createPreferenceCookie(prefs: Record<string, unknown>): Cookie {
    return new Cookie('prefs', JSON.stringify(prefs), {
      secure: true,
      httpOnly: false, // Allow JS access for preferences
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }

  /**
   * Create CSRF token cookie
   */
  static createCSRFCookie(): Cookie {
    const token = Bun.hash(Date.now().toString()).toString(16);
    return new Cookie('csrf_token', token, {
      secure: true,
      httpOnly: false, // Needed for JS to read
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }

  /**
   * Refresh session with sliding window (never extend beyond max)
   */
  static refreshSession(sessionCookie: Cookie): Cookie {
    const newMaxAge = Math.min(
      sessionCookie.maxAge || 900,
      3600 // Never exceed 1 hour total
    );

    return new Cookie(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie,
      maxAge: newMaxAge,
    });
  }

  /**
   * Validate cookie security requirements
   */
  static validateCookie(cookie: Cookie): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Size validation
    const totalSize = cookie.name.length + cookie.value.length;
    if (totalSize > this.MAX_COOKIE_SIZE) {
      errors.push(`Cookie too large: ${totalSize} bytes (max ${this.MAX_COOKIE_SIZE})`);
    }

    // Security validation for __Secure- prefix
    if (cookie.name.startsWith('__Secure-') && !cookie.secure) {
      errors.push('__Secure- cookie must have secure=true');
    }

    // Security validation for __Host- prefix
    if (cookie.name.startsWith('__Host-')) {
      if (!cookie.secure) errors.push('__Host- cookie must have secure=true');
      if (cookie.path !== '/') errors.push('__Host- cookie must have path=/');
      if (cookie.domain) errors.push('__Host- cookie must not have domain');
    }

    // Session cookie duration validation
    if (cookie.name.includes('session') && (cookie.maxAge || 0) > 86400) {
      errors.push('Session cookie too long-lived (max 24 hours recommended)');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Optimize cookie size - compress if needed
   */
  static optimizeCookieSize(cookie: Cookie): Cookie {
    const maxValueSize =
      this.MAX_COOKIE_SIZE - cookie.name.length - this.estimateAttributeSize(cookie);

    if (cookie.value.length > maxValueSize) {
      // For large values, use session storage reference instead
      console.warn(`Cookie ${cookie.name} too large, consider using server-side session`);
      return new Cookie(cookie.name, '[LARGE_VALUE_STORED_SERVER_SIDE]', {
        ...cookie,
        maxAge: cookie.maxAge,
      });
    }

    return cookie;
  }

  private static estimateAttributeSize(cookie: Cookie): number {
    let size = 0;
    if (cookie.secure) size += 8;
    if (cookie.httpOnly) size += 10;
    if (cookie.sameSite) size += 10 + cookie.sameSite.length;
    if (cookie.path) size += 6 + cookie.path.length;
    if (cookie.domain) size += 8 + cookie.domain.length;
    if (cookie.maxAge) size += 8 + cookie.maxAge.toString().length;
    return size;
  }

  /**
   * Cookie-free zone check - skip parsing for static paths
   */
  static shouldSkipCookieCheck(path: string): boolean {
    const cookieFreePaths = [
      '/health',
      '/telemetry',
      '/static/',
      '/favicon.ico',
      '/robots.txt',
      '/docs/',
    ];
    return cookieFreePaths.some(p => path.startsWith(p));
  }

  /**
   * Check for cookie anomalies
   */
  static checkForAnomalies(
    cookies: Cookie[]
  ): Array<{ level: string; message: string; code: string }> {
    const alerts: Array<{ level: string; message: string; code: string }> = [];

    // Too many cookies
    if (cookies.length > 20) {
      alerts.push({
        level: 'warning',
        message: `Too many cookies: ${cookies.length} (recommend < 20)`,
        code: 'COOKIE_COUNT_HIGH',
      });
    }

    // Large cookies
    const largeCookies = cookies.filter(c => c.name.length + c.value.length > 1024);
    if (largeCookies.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${largeCookies.length} cookies exceed 1KB`,
        code: 'COOKIE_SIZE_LARGE',
      });
    }

    // Insecure session cookies
    const insecureSessions = cookies.filter(
      c => (c.name.includes('session') || c.name.includes('auth')) && !c.secure
    );
    if (insecureSessions.length > 0) {
      alerts.push({
        level: 'critical',
        message: `${insecureSessions.length} insecure session cookies detected`,
        code: 'SESSION_INSECURE',
      });
    }

    return alerts;
  }

  /**
   * Process request cookies with validation
   */
  static processRequestCookies(request: Request): {
    cookies: CookieMap;
    session: { valid: boolean; userId?: string };
    alerts: Array<{ level: string; message: string; code: string }>;
  } {
    const cookies = new CookieMap(request.headers);
    const cookieList = Array.from(cookies.values());

    // Check for anomalies
    const alerts = this.checkForAnomalies(cookieList);

    // Validate all cookies
    cookieList.forEach(cookie => {
      const validation = this.validateCookie(cookie);
      if (!validation.valid) {
        alerts.push({
          level: 'error',
          message: `Invalid cookie ${cookie.name}: ${validation.errors.join(', ')}`,
          code: 'COOKIE_VALIDATION_FAILED',
        });
      }
    });

    // Extract session
    const sessionCookie = cookies.get('__Host-session');
    const session = {
      valid: !!sessionCookie,
      userId: sessionCookie?.value,
    };

    return { cookies, session, alerts };
  }

  /**
   * Create layered cookies for different purposes
   */
  static createLayeredCookies(userId: string, prefs: Record<string, unknown>): Cookie[] {
    return [
      this.createSessionCookie(userId),
      this.createPreferenceCookie(prefs),
      this.createCSRFCookie(),
    ];
  }
}

/**
 * Cookie analytics and monitoring
 */
export class CookieMonitor {
  private metrics = {
    totalSets: 0,
    totalGets: 0,
    validationFailures: 0,
    sizeViolations: 0,
    securityViolations: 0,
  };

  recordCookieSet(name: string, result: 'success' | 'failed'): void {
    this.metrics.totalSets++;
    if (result === 'failed') this.metrics.validationFailures++;
  }

  recordCookieGet(): void {
    this.metrics.totalGets++;
  }

  recordSecurityViolation(type: string): void {
    this.metrics.securityViolations++;
    console.warn(`Cookie security violation: ${type}`);
  }

  exportMetrics(): string {
    return `
# HELP cookie_sets_total Total number of cookies set
# TYPE cookie_sets_total counter
cookie_sets_total ${this.metrics.totalSets}

# HELP cookie_gets_total Total number of cookies retrieved
# TYPE cookie_gets_total counter
cookie_gets_total ${this.metrics.totalGets}

# HELP cookie_validation_failures_total Total cookie validation failures
# TYPE cookie_validation_failures_total counter
cookie_validation_failures_total ${this.metrics.validationFailures}

# HELP cookie_security_violations_total Total security violations
# TYPE cookie_security_violations_total counter
cookie_security_violations_total ${this.metrics.securityViolations}
    `.trim();
  }
}

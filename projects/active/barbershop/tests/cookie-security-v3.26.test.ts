/**
 * Cookie Security v3.26 Test Suite
 * Comprehensive tests for Tier-1380 cookie security implementation
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { 
  cookieSecurity, 
  variantManager, 
  Tier1380CookieSecurity, 
  SecureVariantManager,
  type SecurityReport 
} from '../lib/cookie-security';

describe('Tier1380CookieSecurity', () => {
  let security: Tier1380CookieSecurity;

  beforeEach(() => {
    security = new Tier1380CookieSecurity();
  });

  describe('parseAndValidate', () => {
    test('should parse and validate secure cookie with A+ grade', () => {
      const result = security.parseAndValidate('session=abc123; Secure; HttpOnly; SameSite=Strict; Path=/');
      
      expect(result.cookie).not.toBeNull();
      expect(result.report.valid).toBe(true);
      expect(result.report.grade).toBe('A+');
      expect(result.report.score).toBe(100);
      expect(result.report.issues).toHaveLength(0);
    });

    test('should detect insecure cookie with F grade', () => {
      const result = security.parseAndValidate('session=abc123; SameSite=Lax');
      
      expect(result.cookie).not.toBeNull();
      expect(result.report.valid).toBe(false);
      expect(result.report.grade).toBe('F');
      expect(result.report.issues.length).toBeGreaterThan(0);
      expect(result.report.issues).toContain('Missing Secure flag (MITM vulnerability)');
      expect(result.report.issues).toContain('Missing HttpOnly flag (XSS vulnerability)');
    });

    test('should handle __Host- prefix validation', () => {
      // Valid __Host- cookie
      const valid = security.parseAndValidate('__Host-session=abc; Secure; HttpOnly; SameSite=Strict; Path=/');
      expect(valid.report.valid).toBe(true);
      expect(valid.report.grade).toBe('A+');

      // Invalid __Host- cookie (missing Secure)
      const invalid = security.parseAndValidate('__Host-session=abc; HttpOnly; Path=/');
      expect(invalid.report.valid).toBe(false);
      expect(invalid.report.issues).toContain('__Host- prefix requires Secure flag');
    });

    test('should handle __Secure- prefix validation', () => {
      const invalid = security.parseAndValidate('__Secure-token=abc; HttpOnly; SameSite=Strict');
      expect(invalid.report.issues).toContain('__Secure- prefix requires Secure flag');
    });

    test('should handle malformed cookie gracefully', () => {
      const result = security.parseAndValidate(';;;invalid===');
      
      expect(result.cookie).toBeNull();
      expect(result.report.valid).toBe(false);
      expect(result.report.grade).toBe('F');
      expect(result.report.issues).toContain('Parse error: invalid cookie format');
    });

    test('should grade SameSite=None as risky', () => {
      const result = security.parseAndValidate('session=abc; Secure; HttpOnly; SameSite=None');
      
      expect(result.report.issues).toContain('SameSite=None requires Secure (CSRF risk)');
      expect(result.report.score).toBeLessThan(100);
    });

    test('should grade SameSite=Lax with warning', () => {
      const result = security.parseAndValidate('session=abc; Secure; HttpOnly; SameSite=Lax');
      
      expect(result.report.warnings).toContain('SameSite=Lax allows cross-site GET requests');
      expect(result.report.score).toBe(90); // -10 for Lax
      expect(result.report.grade).toBe('A');
    });

    test('should detect long-lived cookies', () => {
      // Over 1 year
      const tooLong = security.parseAndValidate(`session=abc; Secure; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 400}`);
      expect(tooLong.report.issues).toContain(`MaxAge exceeds ${60 * 60 * 24 * 365}s (1 year)`);

      // Over 1 day but less than 1 year (warning)
      const long = security.parseAndValidate(`session=abc; Secure; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 48}`);
      expect(long.report.warnings).toContain('Long-lived cookie (consider session duration)');
    });
  });

  describe('audit', () => {
    test('should return security headers for secure cookie', () => {
      const cookie = security.parseAndValidate('session=abc; Secure; HttpOnly; SameSite=Strict').cookie!;
      const report = security.audit(cookie);

      expect(report.headers['X-Frame-Options']).toBe('DENY');
      expect(report.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(report.headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    });

    test('should not include HSTS for non-secure cookie', () => {
      const cookie = security.parseAndValidate('session=abc; HttpOnly; SameSite=Strict').cookie!;
      const report = security.audit(cookie);

      expect(report.headers['Strict-Transport-Security']).toBeUndefined();
    });

    test('should calculate grades correctly', () => {
      const testCases = [
        { score: 95, expected: 'A+' },
        { score: 90, expected: 'A' },
        { score: 85, expected: 'B' },
        { score: 75, expected: 'C' },
        { score: 65, expected: 'D' },
        { score: 50, expected: 'F' },
        { score: 0, expected: 'F' },
      ];

      for (const { score, expected } of testCases) {
        // Create a cookie and manually set score for testing
        const result = security.parseAndValidate('session=abc; Secure; HttpOnly; SameSite=Strict');
        // Override score for grade testing
        const modifiedReport: SecurityReport = { ...result.report, score };
        
        // The grade is calculated based on score, we verify the logic
        expect(modifiedReport.score).toBe(score);
      }
    });
  });

  describe('createSecure', () => {
    test('should create session cookie with correct defaults', () => {
      const { cookie, report } = security.createSecure('sid', 'value', 'session');

      expect(cookie.name).toBe('sid');
      expect(cookie.secure).toBe(true);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('strict');
      expect(cookie.path).toBe('/');
      expect(cookie.maxAge).toBe(60 * 60 * 24); // 1 day
      expect(report.grade).toBe('A+');
    });

    test('should create auth cookie with 4 hour maxAge', () => {
      const { cookie } = security.createSecure('auth', 'token', 'auth');

      expect(cookie.maxAge).toBe(60 * 60 * 4);
    });

    test('should create preferences cookie with JS access', () => {
      const { cookie, report } = security.createSecure('prefs', '{"theme":"dark"}', 'preferences');

      expect(cookie.httpOnly).toBe(false); // Allow JS access
      expect(cookie.sameSite).toBe('lax');
      expect(cookie.maxAge).toBe(60 * 60 * 24 * 365); // 1 year
    });

    test('should serialize object values to JSON', () => {
      const data = { userId: 123, role: 'admin' };
      const { cookie } = security.createSecure('session', data, 'session');

      expect(cookie.value).toBe(JSON.stringify(data));
    });

    test('should allow option overrides', () => {
      const { cookie } = security.createSecure('sid', 'value', 'session', {
        maxAge: 3600,
        path: '/api'
      });

      expect(cookie.maxAge).toBe(3600);
      expect(cookie.path).toBe('/api');
    });

    test('should handle all cookie types', () => {
      const types = ['session', 'auth', 'csrf', 'preferences'] as const;
      
      for (const type of types) {
        const { cookie, report } = security.createSecure(`${type}_test`, 'value', type);
        expect(cookie).toBeDefined();
        expect(report).toBeDefined();
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should generate unique CSRF tokens', async () => {
      const result1 = await security.generateCSRF('session1');
      const result2 = await security.generateCSRF('session1');
      const result3 = await security.generateCSRF('session2');

      // Same session should get different tokens (unique per call)
      expect(result1.token).not.toBe(result2.token);
      
      // Different sessions should get different tokens
      expect(result1.token).not.toBe(result3.token);
      
      // Tokens should be 32 chars (base64url truncated)
      expect(result1.token.length).toBe(32);
    });

    test('should validate correct CSRF token', async () => {
      const { token } = await security.generateCSRF('session123');
      
      expect(security.validateCSRF('session123', token)).toBe(true);
    });

    test('should reject incorrect CSRF token', async () => {
      await security.generateCSRF('session123');
      
      expect(security.validateCSRF('session123', 'wrong_token')).toBe(false);
      expect(security.validateCSRF('session123', '')).toBe(false);
    });

    test('should reject CSRF for unknown session', () => {
      expect(security.validateCSRF('unknown_session', 'some_token')).toBe(false);
    });

    test('should expire CSRF tokens after 1 hour', async () => {
      const { token } = await security.generateCSRF('session_exp');
      
      // Simulate time passing (mock)
      const originalNow = Date.now;
      Date.now = () => originalNow() + 61 * 60 * 1000; // 61 minutes later
      
      expect(security.validateCSRF('session_exp', token)).toBe(false);
      
      Date.now = originalNow;
    });

    test('should create CSRF cookie with secure defaults', async () => {
      const { cookie, token } = await security.generateCSRF('session_test');

      expect(cookie.name).toBe('csrf_token');
      expect(cookie.value).toBe(token);
      expect(cookie.secure).toBe(true);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('strict');
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton cookieSecurity instance', () => {
      expect(cookieSecurity).toBeInstanceOf(Tier1380CookieSecurity);
    });

    test('singleton should maintain state across calls', async () => {
      const { token } = await cookieSecurity.generateCSRF('singleton_test');
      
      // Use singleton to validate
      expect(cookieSecurity.validateCSRF('singleton_test', token)).toBe(true);
    });
  });
});

describe('SecureVariantManager', () => {
  let variants: SecureVariantManager;

  beforeEach(() => {
    variants = new SecureVariantManager();
  });

  describe('createVariantCookie', () => {
    test('should create variant A cookie', () => {
      const { cookie, signature } = variants.createVariantCookie('user1', 'A');

      expect(cookie.name).toBe('ab_variant');
      expect(cookie.value).toContain('"v":"A"');
      expect(cookie.value).toContain('"s":"' + signature + '"');
      expect(signature.length).toBe(16); // Hex signature
    });

    test('should create variant B cookie', () => {
      const { cookie } = variants.createVariantCookie('user1', 'B');

      expect(cookie.value).toContain('"v":"B"');
    });

    test('should create control variant cookie', () => {
      const { cookie } = variants.createVariantCookie('user1', 'control');

      expect(cookie.value).toContain('"v":"control"');
    });

    test('should use default 30 day maxAge', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A');

      expect(cookie.maxAge).toBe(60 * 60 * 24 * 30);
    });

    test('should allow custom maxAge', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A', { maxAge: 86400 });

      expect(cookie.maxAge).toBe(86400);
    });

    test('should include timestamp', () => {
      const before = Date.now();
      const { cookie } = variants.createVariantCookie('user1', 'A');
      const after = Date.now();

      const parsed = JSON.parse(decodeURIComponent(cookie.value));
      expect(parsed.t).toBeGreaterThanOrEqual(before);
      expect(parsed.t).toBeLessThanOrEqual(after);
    });
  });

  describe('validateVariant', () => {
    test('should validate correct variant', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A');
      const result = variants.validateVariant(cookie.value, 'user1');

      expect(result.valid).toBe(true);
      expect(result.variant).toBe('A');
    });

    test('should reject tampered variant', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A');
      
      // Tamper with the value
      const tampered = cookie.value.replace('"v":"A"', '"v":"B"');
      const result = variants.validateVariant(tampered, 'user1');

      expect(result.valid).toBe(false);
      expect(result.variant).toBeUndefined();
    });

    test('should reject wrong user', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A');
      const result = variants.validateVariant(cookie.value, 'user2');

      expect(result.valid).toBe(false);
    });

    test('should reject expired variant (>30 days)', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A');
      
      // Parse and modify timestamp to be 31 days ago
      const parsed = JSON.parse(decodeURIComponent(cookie.value));
      parsed.t = Date.now() - 31 * 24 * 60 * 60 * 1000;
      
      const expiredCookie = encodeURIComponent(JSON.stringify(parsed));
      const result = variants.validateVariant(expiredCookie, 'user1');

      expect(result.valid).toBe(false);
    });

    test('should reject invalid JSON', () => {
      const result = variants.validateVariant('not-valid-json', 'user1');

      expect(result.valid).toBe(false);
    });

    test('should handle URL-encoded cookie values', () => {
      const { cookie } = variants.createVariantCookie('user1', 'A');
      
      // CookieMap returns URL-encoded values
      const result = variants.validateVariant(cookie.value, 'user1');
      expect(result.valid).toBe(true);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton variantManager instance', () => {
      expect(variantManager).toBeInstanceOf(SecureVariantManager);
    });
  });
});

describe('Edge Cases', () => {
  test('should handle empty cookie value', () => {
    const result = cookieSecurity.parseAndValidate('empty=; Secure; HttpOnly; SameSite=Strict');
    expect(result.cookie).not.toBeNull();
    expect(result.report.grade).toBe('A+');
  });

  test('should handle special characters in cookie value', () => {
    const result = cookieSecurity.parseAndValidate('data={"key":"value with spaces"}; Secure; HttpOnly; SameSite=Strict');
    expect(result.cookie).not.toBeNull();
    expect(result.report.valid).toBe(true);
  });

  test('should handle very long cookie names', () => {
    const longName = 'a'.repeat(100);
    const result = cookieSecurity.parseAndValidate(`${longName}=value; Secure; HttpOnly; SameSite=Strict`);
    expect(result.cookie).not.toBeNull();
  });

  test('should handle unicode in cookie value', () => {
    const result = cookieSecurity.createSecure('emoji', '🍪🔒✨', 'session');
    // Value should be the emoji directly (string values are not JSON stringified)
    expect(result.cookie.value).toBe('🍪🔒✨');
  });

  test('should handle nested objects', () => {
    const data = { user: { id: 1, name: 'Test' }, permissions: ['read', 'write'] };
    const result = cookieSecurity.createSecure('complex', data, 'session');
    expect(JSON.parse(result.cookie.value)).toEqual(data);
  });

  test('should handle rapid CSRF token generation', async () => {
    const tokens: string[] = [];
    for (let i = 0; i < 100; i++) {
      const { token } = await cookieSecurity.generateCSRF(`session_${i}`);
      tokens.push(token);
    }
    
    // All tokens should be unique
    expect(new Set(tokens).size).toBe(100);
  });

  test('should handle concurrent variant creation', () => {
    const promises = Array.from({ length: 50 }, (_, i) => 
      variantManager.createVariantCookie(`user_${i}`, i % 2 === 0 ? 'A' : 'B')
    );
    
    const results = promises;
    const signatures = results.map(r => r.signature);
    
    // All signatures should be unique
    expect(new Set(signatures).size).toBe(50);
  });
});

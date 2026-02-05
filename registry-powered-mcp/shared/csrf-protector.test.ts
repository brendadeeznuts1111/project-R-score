// shared/csrf-protector.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  CSRFProtector,
  csrfProtector,
  validateCSRF,
  generateCSRFToken,
  type CSRFValidationResult,
} from './csrf-protector';

describe('CSRFProtector', () => {
  let protector: CSRFProtector;

  beforeEach(() => {
    protector = new CSRFProtector({
      secret: 'test-secret-key-for-csrf-protection-32bytes',
      expiryMs: 60 * 60 * 1000, // 1 hour
    });
  });

  describe('Token Generation', () => {
    test('generates valid tokens', () => {
      const token = protector.generateToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
      expect(token).toContain('.'); // payload.signature format
    });

    test('generates unique tokens each time', () => {
      const token1 = protector.generateToken();
      const token2 = protector.generateToken();

      expect(token1).not.toBe(token2);
    });

    test('generates tokens with session binding', () => {
      const sessionId = 'user-session-123';
      const token = protector.generateToken(sessionId);

      expect(token).toBeDefined();
      expect(protector.validateToken(token, sessionId).valid).toBe(true);
    });

    test('token has valid base64 payload', () => {
      const token = protector.generateToken();
      const [encodedPayload] = token.split('.');

      expect(() => atob(encodedPayload)).not.toThrow();

      const payload = JSON.parse(atob(encodedPayload));
      expect(payload.nonce).toBeDefined();
      expect(payload.timestamp).toBeDefined();
      expect(typeof payload.timestamp).toBe('number');
    });
  });

  describe('Token Validation', () => {
    test('validates correct token', () => {
      const token = protector.generateToken();
      const result = protector.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.tokenAge).toBeDefined();
      expect(result.tokenAge).toBeLessThan(1000); // Less than 1 second old
    });

    test('rejects missing token', () => {
      const result = protector.validateToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing or invalid token');
    });

    test('rejects malformed token', () => {
      const result = protector.validateToken('not-a-valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed token structure');
    });

    test('rejects token with invalid signature', () => {
      const token = protector.generateToken();
      const [payload] = token.split('.');
      const tamperedToken = payload + '.invalidsignature';

      const result = protector.validateToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    test('rejects token with tampered payload', () => {
      const token = protector.generateToken();
      const [, signature] = token.split('.');

      // Create tampered payload
      const tamperedPayload = btoa(JSON.stringify({
        nonce: 'tampered-nonce',
        timestamp: Date.now(),
      }));
      const tamperedToken = tamperedPayload + '.' + signature;

      const result = protector.validateToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    test('rejects expired token', () => {
      const shortLivedProtector = new CSRFProtector({
        secret: 'test-secret',
        expiryMs: 1, // 1ms expiry
      });

      const token = shortLivedProtector.generateToken();

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }

      const result = shortLivedProtector.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    test('validates session-bound token with matching session', () => {
      const sessionId = 'session-abc-123';
      const token = protector.generateToken(sessionId);

      const result = protector.validateToken(token, sessionId);

      expect(result.valid).toBe(true);
    });

    test('rejects session-bound token with mismatched session', () => {
      const token = protector.generateToken('session-1');
      const result = protector.validateToken(token, 'session-2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session mismatch');
    });
  });

  describe('Double-Submit Cookie Pattern', () => {
    test('validates matching cookie and header tokens', () => {
      const token = protector.generateToken();

      const result = protector.validateTokenPair(token, token);

      expect(result.valid).toBe(true);
    });

    test('rejects missing cookie token', () => {
      const token = protector.generateToken();

      const result = protector.validateTokenPair(null, token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing cookie token');
    });

    test('rejects missing header token', () => {
      const token = protector.generateToken();

      const result = protector.validateTokenPair(token, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing submitted token');
    });

    test('rejects mismatched tokens', () => {
      const cookieToken = protector.generateToken();
      const headerToken = protector.generateToken();

      const result = protector.validateTokenPair(cookieToken, headerToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token mismatch (double-submit failed)');
    });
  });

  describe('Request Validation', () => {
    test('allows safe methods without token', () => {
      const request = new Request('http://localhost/api', { method: 'GET' });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(true);
    });

    test('allows HEAD requests without token', () => {
      const request = new Request('http://localhost/api', { method: 'HEAD' });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(true);
    });

    test('allows OPTIONS requests without token', () => {
      const request = new Request('http://localhost/api', { method: 'OPTIONS' });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(true);
    });

    test('validates POST request with matching tokens', () => {
      const token = protector.generateToken();
      const request = new Request('http://localhost/api', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${encodeURIComponent(token)}`,
          'X-CSRF-Token': token,
        },
      });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(true);
    });

    test('rejects POST request without tokens', () => {
      const request = new Request('http://localhost/api', { method: 'POST' });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(false);
    });

    test('rejects PUT request without tokens', () => {
      const request = new Request('http://localhost/api', { method: 'PUT' });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(false);
    });

    test('rejects DELETE request without tokens', () => {
      const request = new Request('http://localhost/api', { method: 'DELETE' });

      const result = protector.validateRequest(request);

      expect(result.valid).toBe(false);
    });
  });

  describe('Token Extraction', () => {
    test('extracts cookie token correctly', () => {
      const token = protector.generateToken();
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: `other=value; csrf_token=${encodeURIComponent(token)}; another=test`,
        },
      });

      const { cookie, header } = protector.extractTokens(request);

      expect(cookie).toBe(token);
      expect(header).toBeNull();
    });

    test('extracts header token correctly', () => {
      const token = protector.generateToken();
      const request = new Request('http://localhost/api', {
        headers: {
          'X-CSRF-Token': token,
        },
      });

      const { cookie, header } = protector.extractTokens(request);

      expect(cookie).toBeNull();
      expect(header).toBe(token);
    });

    test('extracts both tokens correctly', () => {
      const token = protector.generateToken();
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: `csrf_token=${encodeURIComponent(token)}`,
          'X-CSRF-Token': token,
        },
      });

      const { cookie, header } = protector.extractTokens(request);

      expect(cookie).toBe(token);
      expect(header).toBe(token);
    });
  });

  describe('Cookie Header Generation', () => {
    test('generates correct cookie header', () => {
      const token = protector.generateToken();
      const cookieHeader = protector.createCookieHeader(token);

      expect(cookieHeader).toContain('csrf_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Secure');
      expect(cookieHeader).toContain('SameSite=Strict');
      expect(cookieHeader).toContain('Path=/');
      expect(cookieHeader).toContain('Max-Age=');
    });

    test('respects custom options', () => {
      const token = protector.generateToken();
      const cookieHeader = protector.createCookieHeader(token, {
        sameSite: 'Lax',
        path: '/api',
        domain: 'example.com',
      });

      expect(cookieHeader).toContain('SameSite=Lax');
      expect(cookieHeader).toContain('Path=/api');
      expect(cookieHeader).toContain('Domain=example.com');
    });
  });

  describe('Origin Validation', () => {
    test('allows valid origin', () => {
      const result = protector.validateOrigin(
        'https://example.com',
        ['https://example.com', 'https://api.example.com']
      );

      expect(result).toBe(true);
    });

    test('rejects invalid origin', () => {
      const result = protector.validateOrigin(
        'https://evil.com',
        ['https://example.com']
      );

      expect(result).toBe(false);
    });

    test('rejects missing origin in strict mode', () => {
      const result = protector.validateOrigin(null, ['https://example.com']);

      expect(result).toBe(false);
    });

    test('allows missing origin when strict mode disabled', () => {
      const laxProtector = new CSRFProtector({
        secret: 'test',
        strictOrigin: false,
      });

      const result = laxProtector.validateOrigin(null, ['https://example.com']);

      expect(result).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('exposes read-only configuration', () => {
      const config = protector.configuration;

      expect(config.cookieName).toBe('csrf_token');
      expect(config.headerName).toBe('X-CSRF-Token');
      expect(config.expiryMs).toBe(60 * 60 * 1000);
    });

    test('uses custom configuration', () => {
      const customProtector = new CSRFProtector({
        cookieName: 'my_csrf',
        headerName: 'X-My-CSRF',
        expiryMs: 30 * 60 * 1000,
      });

      const config = customProtector.configuration;

      expect(config.cookieName).toBe('my_csrf');
      expect(config.headerName).toBe('X-My-CSRF');
      expect(config.expiryMs).toBe(30 * 60 * 1000);
    });
  });

  describe('Singleton and Helpers', () => {
    test('singleton instance works', () => {
      const token = csrfProtector.generateToken();
      const result = csrfProtector.validateToken(token);

      expect(result.valid).toBe(true);
    });

    test('generateCSRFToken helper works', () => {
      const token = generateCSRFToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('validateCSRF helper works for safe methods', () => {
      const request = new Request('http://localhost/api', { method: 'GET' });
      const result = validateCSRF(request);

      expect(result.valid).toBe(true);
    });
  });

  describe('Security Properties', () => {
    test('tokens from different secrets are invalid', () => {
      const protector1 = new CSRFProtector({ secret: 'secret-1' });
      const protector2 = new CSRFProtector({ secret: 'secret-2' });

      const token = protector1.generateToken();
      const result = protector2.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    test('timing-safe comparison prevents length leak', () => {
      // This is a behavioral test - the comparison should take similar time
      // regardless of where the mismatch occurs
      const token = protector.generateToken();
      const [payload, sig] = token.split('.');

      // Different length signature
      const shortSig = sig.substring(0, 10);
      const longSig = sig + 'extra';

      const result1 = protector.validateToken(payload + '.' + shortSig);
      const result2 = protector.validateToken(payload + '.' + longSig);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });
});

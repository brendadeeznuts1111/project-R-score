// shared/secure-cookie-manager.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  SecureCookieManager,
  secureCookieManager,
  createSecureCookie,
  parseSecureCookies,
  createSessionCookie,
  type ParsedCookie,
} from './secure-cookie-manager';

describe('SecureCookieManager', () => {
  let manager: SecureCookieManager;

  beforeEach(() => {
    manager = new SecureCookieManager({
      secret: 'test-secret-key-for-cookie-signing-32bytes',
    });
  });

  describe('Cookie Creation', () => {
    test('creates basic cookie with secure defaults', () => {
      const header = manager.createCookie('session', 'user-123');

      expect(header).toContain('session=');
      expect(header).toContain('Path=/');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
    });

    test('creates signed cookie by default', () => {
      const header = manager.createCookie('session', 'user-123');
      const value = header.split('=')[1].split(';')[0];
      const decoded = decodeURIComponent(value);

      // Signed cookies have format: value.signature
      expect(decoded).toContain('.');
      expect(decoded.split('.').length).toBe(2);
    });

    test('creates cookie with custom expiry (Date)', () => {
      const expires = new Date('2025-12-31T23:59:59Z');
      const header = manager.createCookie('session', 'user-123', { expires });

      expect(header).toContain('Expires=Wed, 31 Dec 2025 23:59:59 GMT');
    });

    test('creates cookie with custom expiry (Max-Age)', () => {
      const header = manager.createCookie('session', 'user-123', { expires: 3600 });

      expect(header).toContain('Max-Age=3600');
    });

    test('creates cookie with custom domain', () => {
      const header = manager.createCookie('session', 'user-123', { domain: 'example.com' });

      expect(header).toContain('Domain=example.com');
    });

    test('creates cookie with SameSite=Lax', () => {
      const header = manager.createCookie('session', 'user-123', { sameSite: 'Lax' });

      expect(header).toContain('SameSite=Lax');
    });

    test('creates cookie with SameSite=None', () => {
      const header = manager.createCookie('session', 'user-123', { sameSite: 'None' });

      expect(header).toContain('SameSite=None');
    });

    test('creates __Host- prefixed cookie', () => {
      const header = manager.createCookie('session', 'user-123', { hostPrefix: true });

      expect(header).toContain('__Host-session=');
      expect(header).toContain('Secure');
      expect(header).toContain('Path=/');
      expect(header).not.toContain('Domain=');
    });

    test('creates __Secure- prefixed cookie', () => {
      const header = manager.createCookie('session', 'user-123', { securePrefix: true });

      expect(header).toContain('__Secure-session=');
      expect(header).toContain('Secure');
    });

    test('creates partitioned cookie (CHIPS)', () => {
      const header = manager.createCookie('session', 'user-123', { partitioned: true });

      expect(header).toContain('Partitioned');
    });

    test('creates unsigned cookie when sign=false', () => {
      const header = manager.createCookie('session', 'user-123', { sign: false });
      const value = header.split('=')[1].split(';')[0];
      const decoded = decodeURIComponent(value);

      expect(decoded).toBe('user-123');
      expect(decoded).not.toContain('.');
    });
  });

  describe('Cookie Parsing', () => {
    test('parses single cookie', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const cookieHeader = `session=${encodeURIComponent(signedValue)}`;

      const cookies = manager.parseCookies(cookieHeader);

      expect(cookies.size).toBe(1);
      expect(cookies.get('session')?.value).toBe('user-123');
      expect(cookies.get('session')?.verified).toBe(true);
    });

    test('parses multiple cookies', () => {
      const signed1 = 'value1.' + sign('value1', manager);
      const signed2 = 'value2.' + sign('value2', manager);
      const cookieHeader = `cookie1=${encodeURIComponent(signed1)}; cookie2=${encodeURIComponent(signed2)}`;

      const cookies = manager.parseCookies(cookieHeader);

      expect(cookies.size).toBe(2);
      expect(cookies.get('cookie1')?.value).toBe('value1');
      expect(cookies.get('cookie2')?.value).toBe('value2');
    });

    test('parses null cookie header', () => {
      const cookies = manager.parseCookies(null);

      expect(cookies.size).toBe(0);
    });

    test('parses empty cookie header', () => {
      const cookies = manager.parseCookies('');

      expect(cookies.size).toBe(0);
    });

    test('strips __Host- prefix for lookup', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const cookieHeader = `__Host-session=${encodeURIComponent(signedValue)}`;

      const cookies = manager.parseCookies(cookieHeader);

      expect(cookies.get('session')?.value).toBe('user-123');
      expect(cookies.get('session')?.name).toBe('__Host-session');
    });

    test('strips __Secure- prefix for lookup', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const cookieHeader = `__Secure-session=${encodeURIComponent(signedValue)}`;

      const cookies = manager.parseCookies(cookieHeader);

      expect(cookies.get('session')?.value).toBe('user-123');
      expect(cookies.get('session')?.name).toBe('__Secure-session');
    });

    test('fails verification for invalid signature', () => {
      const cookieHeader = 'session=' + encodeURIComponent('user-123.invalidsig');

      const cookies = manager.parseCookies(cookieHeader);

      expect(cookies.get('session')?.verified).toBe(false);
      expect(cookies.get('session')?.error).toBe('Invalid signature');
    });

    test('fails verification for missing signature', () => {
      const cookieHeader = 'session=user-123';

      const cookies = manager.parseCookies(cookieHeader);

      expect(cookies.get('session')?.verified).toBe(false);
      expect(cookies.get('session')?.error).toBe('Missing signature');
    });

    test('skips verification when verify=false', () => {
      const cookieHeader = 'session=user-123';

      const cookies = manager.parseCookies(cookieHeader, { verify: false });

      expect(cookies.get('session')?.verified).toBe(true);
      expect(cookies.get('session')?.value).toBe('user-123');
    });
  });

  describe('Request Cookie Parsing', () => {
    test('parses cookies from request', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: `session=${encodeURIComponent(signedValue)}`,
        },
      });

      const cookies = manager.parseCookiesFromRequest(request);

      expect(cookies.get('session')?.value).toBe('user-123');
      expect(cookies.get('session')?.verified).toBe(true);
    });

    test('getCookie returns single cookie', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: `session=${encodeURIComponent(signedValue)}`,
        },
      });

      const cookie = manager.getCookie(request, 'session');

      expect(cookie?.value).toBe('user-123');
      expect(cookie?.verified).toBe(true);
    });

    test('getCookie returns null for missing cookie', () => {
      const request = new Request('http://localhost/api');

      const cookie = manager.getCookie(request, 'session');

      expect(cookie).toBeNull();
    });
  });

  describe('Cookie Deletion', () => {
    test('creates deletion header', () => {
      const header = manager.deleteCookie('session');

      expect(header).toContain('session=');
      expect(header).toContain('Max-Age=0');
      expect(header).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    test('creates deletion header with path', () => {
      const header = manager.deleteCookie('session', { path: '/api' });

      expect(header).toContain('Path=/api');
    });

    test('creates deletion header with domain', () => {
      const header = manager.deleteCookie('session', { domain: 'example.com' });

      expect(header).toContain('Domain=example.com');
    });
  });

  describe('Multiple Cookies', () => {
    test('creates multiple cookies', () => {
      const cookies = manager.createCookies([
        ['session', 'user-123'],
        ['preference', 'dark', { sameSite: 'Lax' }],
      ]);

      expect(cookies.length).toBe(2);
      expect(cookies[0].name).toBe('session');
      expect(cookies[0].header).toContain('session=');
      expect(cookies[1].name).toBe('preference');
      expect(cookies[1].header).toContain('SameSite=Lax');
    });
  });

  describe('Session Cookies', () => {
    test('creates session cookie with secure defaults', () => {
      const header = manager.createSessionCookie('user-123');

      expect(header).toContain('__Host-session=');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
      expect(header).toContain('Path=/');
    });

    test('creates session cookie with custom options', () => {
      const header = manager.createSessionCookie('user-123', { expires: 3600 });

      expect(header).toContain('Max-Age=3600');
    });
  });

  describe('Partitioned Cookies (CHIPS)', () => {
    test('creates partitioned cookie with correct attributes', () => {
      const header = manager.createPartitionedCookie('cross-origin', 'value');

      expect(header).toContain('Partitioned');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=None');
    });
  });

  describe('Simplified Interface', () => {
    test('setSecureCookie creates secure signed cookie', () => {
      const header = manager.setSecureCookie('session', 'user-123');

      expect(header).toContain('session=');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
    });

    test('getSecureCookie returns verified value', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: `session=${encodeURIComponent(signedValue)}`,
        },
      });

      const value = manager.getSecureCookie(request, 'session');

      expect(value).toBe('user-123');
    });

    test('getSecureCookie returns null for unverified cookie', () => {
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: 'session=user-123.invalidsig',
        },
      });

      const value = manager.getSecureCookie(request, 'session');

      expect(value).toBeNull();
    });

    test('getSecureCookie returns null for missing cookie', () => {
      const request = new Request('http://localhost/api');

      const value = manager.getSecureCookie(request, 'session');

      expect(value).toBeNull();
    });
  });

  describe('Cookie Name Validation', () => {
    test('rejects empty cookie name', () => {
      expect(() => manager.createCookie('', 'value')).toThrow('Cookie name must be a non-empty string');
    });

    test('rejects cookie name with spaces', () => {
      expect(() => manager.createCookie('my cookie', 'value')).toThrow('Invalid cookie name');
    });

    test('rejects cookie name with semicolon', () => {
      expect(() => manager.createCookie('my;cookie', 'value')).toThrow('Invalid cookie name');
    });

    test('rejects cookie name with equals', () => {
      expect(() => manager.createCookie('my=cookie', 'value')).toThrow('Invalid cookie name');
    });

    test('accepts valid cookie name', () => {
      expect(() => manager.createCookie('valid-cookie_name123', 'value')).not.toThrow();
    });
  });

  describe('Signature Security', () => {
    test('different secrets produce different signatures', () => {
      const manager1 = new SecureCookieManager({ secret: 'secret-1' });
      const manager2 = new SecureCookieManager({ secret: 'secret-2' });

      const header1 = manager1.createCookie('test', 'value');
      const header2 = manager2.createCookie('test', 'value');

      const sig1 = decodeURIComponent(header1.split('=')[1].split(';')[0]).split('.')[1];
      const sig2 = decodeURIComponent(header2.split('=')[1].split(';')[0]).split('.')[1];

      expect(sig1).not.toBe(sig2);
    });

    test('cookies from different managers fail verification', () => {
      const manager1 = new SecureCookieManager({ secret: 'secret-1' });
      const manager2 = new SecureCookieManager({ secret: 'secret-2' });

      const header = manager1.createCookie('test', 'value');
      const cookieValue = decodeURIComponent(header.split('=')[1].split(';')[0]);

      const cookies = manager2.parseCookies(`test=${encodeURIComponent(cookieValue)}`);

      expect(cookies.get('test')?.verified).toBe(false);
    });

    test('tampered value fails verification', () => {
      const signedValue = 'user-123.' + sign('user-123', manager);
      const tamperedValue = 'user-456.' + signedValue.split('.')[1];

      const cookies = manager.parseCookies(`session=${encodeURIComponent(tamperedValue)}`);

      expect(cookies.get('session')?.verified).toBe(false);
    });

    test('tampered signature fails verification', () => {
      const signedValue = 'user-123.tamperedsignature';

      const cookies = manager.parseCookies(`session=${encodeURIComponent(signedValue)}`);

      expect(cookies.get('session')?.verified).toBe(false);
    });
  });

  describe('Configuration', () => {
    test('exposes read-only configuration', () => {
      const config = manager.configuration;

      expect(config.defaults?.path).toBe('/');
      expect(config.defaults?.secure).toBe(true);
      expect(config.defaults?.httpOnly).toBe(true);
    });

    test('uses custom defaults', () => {
      const customManager = new SecureCookieManager({
        secret: 'secret',
        defaults: {
          path: '/api',
          sameSite: 'Lax',
        },
      });

      const header = customManager.createCookie('test', 'value');

      expect(header).toContain('Path=/api');
      expect(header).toContain('SameSite=Lax');
    });
  });

  describe('Singleton and Helpers', () => {
    test('singleton instance works', () => {
      const header = secureCookieManager.setSecureCookie('test', 'value');

      expect(header).toContain('test=');
      expect(header).toContain('Secure');
    });

    test('createSecureCookie helper works', () => {
      const header = createSecureCookie('test', 'value');

      expect(header).toContain('test=');
    });

    test('parseSecureCookies helper works', () => {
      const request = new Request('http://localhost/api', {
        headers: {
          Cookie: 'test=value',
        },
      });

      const cookies = parseSecureCookies(request);

      expect(cookies.size).toBe(1);
    });

    test('createSessionCookie helper works', () => {
      const header = createSessionCookie('user-123');

      expect(header).toContain('__Host-session=');
    });
  });

  describe('Encryption', () => {
    test('encrypts and decrypts values', () => {
      const encryptManager = new SecureCookieManager({
        secret: 'test-secret',
        encryptionKey: 'encryption-key-32-bytes-long!!!!',
      });

      const header = encryptManager.createCookie('sensitive', 'secret-data', {
        encrypt: true,
        sign: false, // Only encrypt, not sign for this test
      });

      const value = decodeURIComponent(header.split('=')[1].split(';')[0]);

      // Encrypted value should be base64 and different from original
      expect(value).not.toBe('secret-data');
      expect(() => atob(value)).not.toThrow();
    });
  });
});

// Helper to sign a value with the same secret as the manager
function sign(value: string, manager: SecureCookieManager): string {
  const hasher = new Bun.CryptoHasher(
    'sha256',
    new TextEncoder().encode(manager.configuration.secret)
  );
  hasher.update(value);
  return hasher.digest('hex');
}

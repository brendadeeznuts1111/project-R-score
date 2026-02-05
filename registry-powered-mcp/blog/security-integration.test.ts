// blog/security-integration.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  BlogSecurityManager,
  blogSecurity,
  validateBlogAccess,
  generateBlogToken,
  hasBlogPermission,
  type BlogAccessScope,
  type BlogPermission,
} from './security-integration';

describe('BlogSecurityManager', () => {
  let manager: BlogSecurityManager;

  beforeEach(() => {
    manager = new BlogSecurityManager({
      secret: 'test-secret-key-for-blog-security-32bytes',
      tokenExpiryMs: 60 * 60 * 1000, // 1 hour for tests
    });
  });

  describe('Token Generation', () => {
    test('generates valid token', () => {
      const token = manager.generateSecureBlogToken('user-123');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toContain('.'); // payload.signature format
    });

    test('generates token with default read scope', () => {
      const token = manager.generateSecureBlogToken('user-123');
      const result = manager.validateBlogAccess(token);

      expect(result.valid).toBe(true);
      expect(result.scope).toBe('read');
      expect(result.permissions).toContain('posts:read');
      expect(result.permissions).toContain('comments:read');
    });

    test('generates token with write scope', () => {
      const token = manager.generateSecureBlogToken('user-123', 'write');
      const result = manager.validateBlogAccess(token);

      expect(result.valid).toBe(true);
      expect(result.scope).toBe('write');
      expect(result.permissions).toContain('posts:create');
      expect(result.permissions).toContain('posts:edit');
    });

    test('generates token with admin scope', () => {
      const token = manager.generateSecureBlogToken('user-123', 'admin');
      const result = manager.validateBlogAccess(token);

      expect(result.valid).toBe(true);
      expect(result.scope).toBe('admin');
      expect(result.permissions).toContain('posts:delete');
      expect(result.permissions).toContain('settings:edit');
      expect(result.permissions).toContain('analytics:view');
    });

    test('generates token with custom permissions', () => {
      const customPerms: BlogPermission[] = ['posts:read', 'analytics:view'];
      const token = manager.generateSecureBlogToken('user-123', 'read', customPerms);
      const result = manager.validateBlogAccess(token);

      expect(result.valid).toBe(true);
      expect(result.permissions).toEqual(customPerms);
    });

    test('generates different tokens for different users', () => {
      const token1 = manager.generateSecureBlogToken('user-123');
      const token2 = manager.generateSecureBlogToken('user-456');

      // Tokens for different users should differ
      expect(token1).not.toBe(token2);
    });

    test('generates different tokens for different scopes', () => {
      const token1 = manager.generateSecureBlogToken('user-123', 'read');
      const token2 = manager.generateSecureBlogToken('user-123', 'write');

      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Validation', () => {
    test('validates correct token', () => {
      const token = manager.generateSecureBlogToken('user-123');
      const result = manager.validateBlogAccess(token);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.error).toBeUndefined();
      expect(result.tokenAge).toBeDefined();
      expect(result.tokenAge).toBeLessThan(1000);
    });

    test('rejects missing token', () => {
      const result = manager.validateBlogAccess('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing or invalid token');
    });

    test('rejects malformed token', () => {
      const result = manager.validateBlogAccess('not-a-valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed token structure');
    });

    test('rejects token with invalid signature', () => {
      const token = manager.generateSecureBlogToken('user-123');
      const [payload] = token.split('.');
      const tamperedToken = payload + '.invalidsignature';

      const result = manager.validateBlogAccess(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    test('rejects expired token', () => {
      const shortLivedManager = new BlogSecurityManager({
        secret: 'test-secret',
        tokenExpiryMs: 1, // 1ms expiry
      });

      const token = shortLivedManager.generateSecureBlogToken('user-123');

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }

      const result = shortLivedManager.validateBlogAccess(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });
  });

  describe('Permission Checking', () => {
    test('hasPermission returns true for valid permission', () => {
      const token = manager.generateSecureBlogToken('user-123', 'write');

      expect(manager.hasPermission(token, 'posts:create')).toBe(true);
      expect(manager.hasPermission(token, 'posts:edit')).toBe(true);
    });

    test('hasPermission returns false for invalid permission', () => {
      const token = manager.generateSecureBlogToken('user-123', 'read');

      expect(manager.hasPermission(token, 'posts:create')).toBe(false);
      expect(manager.hasPermission(token, 'settings:edit')).toBe(false);
    });

    test('hasAllPermissions returns true when all present', () => {
      const token = manager.generateSecureBlogToken('user-123', 'admin');

      expect(manager.hasAllPermissions(token, ['posts:read', 'posts:delete'])).toBe(true);
    });

    test('hasAllPermissions returns false when any missing', () => {
      const token = manager.generateSecureBlogToken('user-123', 'write');

      expect(manager.hasAllPermissions(token, ['posts:create', 'posts:delete'])).toBe(false);
    });

    test('hasAnyPermission returns true when any present', () => {
      const token = manager.generateSecureBlogToken('user-123', 'read');

      expect(manager.hasAnyPermission(token, ['posts:read', 'posts:delete'])).toBe(true);
    });

    test('hasAnyPermission returns false when none present', () => {
      const token = manager.generateSecureBlogToken('user-123', 'read');

      expect(manager.hasAnyPermission(token, ['posts:delete', 'settings:edit'])).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('creates blog session cookie', () => {
      const header = manager.createBlogSession('user-123');

      expect(header).toContain('__Host-blog_session=');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
    });

    test('creates blog session with scope', () => {
      const header = manager.createBlogSession('user-123', 'admin');

      expect(header).toContain('__Host-blog_session=');
      // Cookie value should be signed token
      expect(header.length).toBeGreaterThan(100);
    });

    test('revokes blog session', () => {
      const header = manager.revokeBlogSession();

      expect(header).toContain('__Host-blog_session=');
      expect(header).toContain('Max-Age=0');
      expect(header).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  describe('CSRF Integration', () => {
    test('creates CSRF token', () => {
      const token = manager.createBlogCSRFToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toContain('.'); // payload.signature format
    });

    test('creates CSRF cookie', () => {
      const header = manager.createBlogCSRFCookie();

      expect(header).toContain('csrf_token=');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('Secure');
    });

    test('validates CSRF for GET requests', () => {
      const request = new Request('http://localhost/api', { method: 'GET' });
      const result = manager.validateBlogCSRF(request);

      expect(result.valid).toBe(true);
    });

    test('rejects POST without CSRF', () => {
      const request = new Request('http://localhost/api', { method: 'POST' });
      const result = manager.validateBlogCSRF(request);

      expect(result.valid).toBe(false);
    });
  });

  describe('Request Validation', () => {
    test('validates request with Bearer token', () => {
      const token = manager.generateSecureBlogToken('user-123', 'write');
      const request = new Request('http://localhost/api', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = manager.validateBlogRequest(request);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.csrfValid).toBe(true); // GET is safe method
    });

    test('rejects request without token', () => {
      const request = new Request('http://localhost/api', { method: 'GET' });

      const result = manager.validateBlogRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No access token provided');
    });
  });

  describe('Origin Validation', () => {
    test('allows valid origin', () => {
      const managerWithOrigins = new BlogSecurityManager({
        secret: 'secret',
        allowedOrigins: ['https://example.com', 'https://blog.example.com'],
      });

      expect(managerWithOrigins.validateOrigin('https://example.com')).toBe(true);
    });

    test('rejects invalid origin', () => {
      const managerWithOrigins = new BlogSecurityManager({
        secret: 'secret',
        allowedOrigins: ['https://example.com'],
      });

      expect(managerWithOrigins.validateOrigin('https://evil.com')).toBe(false);
    });

    test('allows any origin when list is empty', () => {
      const managerWithOrigins = new BlogSecurityManager({
        secret: 'secret',
        allowedOrigins: [],
      });

      expect(managerWithOrigins.validateOrigin('https://any-origin.com')).toBe(true);
    });

    test('rejects null origin in strict mode', () => {
      const strictManager = new BlogSecurityManager({
        secret: 'secret',
        strictOrigin: true,
        allowedOrigins: ['https://example.com'],
      });

      expect(strictManager.validateOrigin(null)).toBe(false);
    });

    test('allows null origin when strict mode disabled', () => {
      const laxManager = new BlogSecurityManager({
        secret: 'secret',
        strictOrigin: false,
      });

      expect(laxManager.validateOrigin(null)).toBe(true);
    });
  });

  describe('Security Properties', () => {
    test('tokens from different secrets are invalid', () => {
      const manager1 = new BlogSecurityManager({ secret: 'secret-1' });
      const manager2 = new BlogSecurityManager({ secret: 'secret-2' });

      const token = manager1.generateSecureBlogToken('user-123');
      const result = manager2.validateBlogAccess(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    test('tampered payload is rejected', () => {
      const token = manager.generateSecureBlogToken('user-123', 'read');
      const [, signature] = token.split('.');

      // Create tampered payload with admin scope
      const tamperedPayload = btoa(JSON.stringify({
        userId: 'user-123',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        scope: 'admin', // Escalate to admin
        permissions: ['posts:delete', 'settings:edit'],
      }));

      const tamperedToken = tamperedPayload + '.' + signature;
      const result = manager.validateBlogAccess(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });
  });

  describe('Configuration', () => {
    test('exposes read-only configuration', () => {
      const config = manager.configuration;

      expect(config.tokenExpiryMs).toBe(60 * 60 * 1000);
      expect(config.strictOrigin).toBe(true);
    });

    test('provides access to underlying managers', () => {
      expect(manager.cookies).toBeDefined();
      expect(manager.csrf).toBeDefined();
    });
  });

  describe('Singleton and Helpers', () => {
    test('singleton instance works', () => {
      const token = blogSecurity.generateSecureBlogToken('user-123');
      const result = blogSecurity.validateBlogAccess(token);

      expect(result.valid).toBe(true);
    });

    test('validateBlogAccess helper works', () => {
      const token = generateBlogToken('user-123');
      const result = validateBlogAccess(token);

      expect(result.valid).toBe(true);
    });

    test('generateBlogToken helper works', () => {
      const token = generateBlogToken('user-123', 'write');
      const result = validateBlogAccess(token);

      expect(result.scope).toBe('write');
    });

    test('hasBlogPermission helper works', () => {
      const token = generateBlogToken('user-123', 'admin');

      expect(hasBlogPermission(token, 'posts:delete')).toBe(true);
      expect(hasBlogPermission(token, 'posts:read')).toBe(true);
    });
  });
});

/**
 * URL Pattern Security Testing
 * Comprehensive security validation for enhanced URL patterns
 */

import { EnhancedURLPatternUtils } from '../../../packages/core/src/utils/enhanced-url-patterns';

describe('URL Pattern Security Testing', () => {
  describe('Path Traversal Prevention', () => {
    test('blocks basic path traversal', () => {
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/../../../etc/passwd')).toThrow('Path traversal detected');
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/..\\..\\..\\etc\\passwd')).toThrow('Path traversal detected');
    });

    test('allows safe relative paths', () => {
      expect(EnhancedURLPatternUtils.normalizePathname('/api/v1/users')).toBe('/api/v1/users');
      expect(EnhancedURLPatternUtils.normalizePathname('/files/docs/readme.txt')).toBe('/files/docs/readme.txt');
    });
  });

  describe('XSS Attack Prevention', () => {
    test('blocks script injection attempts', () => {
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/<script>alert("xss")</script>')).toThrow('Invalid characters in path');
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/<img src=x onerror=alert(1)>')).toThrow('Invalid characters in path');
    });

    test('allows safe URLs', () => {
      expect(EnhancedURLPatternUtils.normalizePathname('/api/v1/users/123')).toBe('/api/v1/users/123');
      expect(EnhancedURLPatternUtils.normalizePathname('/files/images/logo.png')).toBe('/files/images/logo.png');
    });
  });

  describe('Null Byte Injection Prevention', () => {
    test('blocks null byte injection', () => {
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/path\x00evil')).toThrow('Invalid characters in path');
    });
  });

  describe('Data URL and Protocol Injection Prevention', () => {
    test('blocks dangerous protocols', () => {
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/javascript:evil()')).toThrow('Security violation');
      expect(() => EnhancedURLPatternUtils.normalizePathname('/test/data:evil')).toThrow('Security violation');
    });
  });

  describe('Length and Complexity Limits', () => {
    test('enforces path length limits', () => {
      const longPath = '/test/' + 'a'.repeat(3000);
      expect(() => EnhancedURLPatternUtils.normalizePathname(longPath)).toThrow('Path too long');
    });

    test('handles reasonable path lengths', () => {
      const reasonablePath = '/api/v1/users/123/posts/456/comments/789';
      expect(EnhancedURLPatternUtils.normalizePathname(reasonablePath)).toBe('/api/v1/users/123/posts/456/comments/789');
    });
  });

  describe('Security Analysis', () => {
    test('comprehensive security analysis', () => {
      const testCases = [
        { url: '/safe/path', shouldHaveViolations: false },
        { url: '/path/with/../../../traversal', shouldHaveViolations: true },
        { url: '/path/with\x00null', shouldHaveViolations: true },
      ];

      for (const testCase of testCases) {
        const analysis = EnhancedURLPatternUtils.analyzeSecurity(testCase.url);

        if (testCase.shouldHaveViolations) {
          expect(analysis.violations.length).toBeGreaterThan(0);
        } else {
          expect(analysis.violations.length).toBe(0);
          expect(analysis.isValid).toBe(true);
        }
      }
    });
  });

  describe('URL Condition Evaluation Security', () => {
    test('condition evaluation blocks attacks', () => {
      const safeConditions = {
        allowedPrefixes: ['/api/', '/health', '/metrics'],
        blockedPatterns: [/\.\./, /<script/i, /\x00/],
        maxLength: 50,
      };

      expect(EnhancedURLPatternUtils.evaluateConditions('/api/v1/users/123', safeConditions)).toBe(true);
      expect(EnhancedURLPatternUtils.evaluateConditions('/health', safeConditions)).toBe(true);
      expect(EnhancedURLPatternUtils.evaluateConditions('/../../../etc/passwd', safeConditions)).toBe(false);
      expect(EnhancedURLPatternUtils.evaluateConditions('/api/<script>alert(1)</script>', safeConditions)).toBe(false);
    });
  });

  describe('Performance Under Security Load', () => {
    test('security validation scales with request volume', () => {
      const testUrls = [
        '/api/v1/users/123',
        '/api/v1/repos/octocat/hello-world',
        '/health',
        '/metrics',
      ];

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const url = testUrls[i % testUrls.length];
        EnhancedURLPatternUtils.analyzeSecurity(url);
        EnhancedURLPatternUtils.normalizePathname(url);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // Should handle 1000 security validations in < 200ms
    });
  });
});
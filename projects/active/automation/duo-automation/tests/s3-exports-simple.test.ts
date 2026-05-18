// tests/s3-exports-simple.test.ts
import { describe, it, expect } from 'bun:test';
import { SCOPE_STRATEGIES } from '../src/utils/s3Exports.js';

describe('S3 Exports Utility - Configuration Tests', () => {
  describe('SCOPE_STRATEGIES', () => {
    it('should have correct development strategy', () => {
      expect(SCOPE_STRATEGIES.DEVELOPMENT).toEqual({
        cacheControl: 'no-cache',
        inline: true,
        expiresIn: 300
      });
    });

    it('should have correct staging strategy', () => {
      expect(SCOPE_STRATEGIES.STAGING).toEqual({
        cacheControl: 'max-age=300',
        inline: false,
        expiresIn: 3600
      });
    });

    it('should have correct production strategy', () => {
      expect(SCOPE_STRATEGIES.PRODUCTION).toEqual({
        cacheControl: 'max-age=3600',
        inline: false,
        expiresIn: 86400
      });
    });

    it('should have different strategies for each scope', () => {
      const strategies = Object.values(SCOPE_STRATEGIES);
      expect(strategies).toHaveLength(3);
      
      // Ensure all strategies are unique
      const uniqueStrategies = Array.from(new Set(strategies.map(s => JSON.stringify(s))));
      expect(uniqueStrategies).toHaveLength(3);
    });

    it('should have progressive caching from dev to production', () => {
      expect(SCOPE_STRATEGIES.DEVELOPMENT.cacheControl).toBe('no-cache');
      expect(SCOPE_STRATEGIES.STAGING.cacheControl).toBe('max-age=300');
      expect(SCOPE_STRATEGIES.PRODUCTION.cacheControl).toBe('max-age=3600');
    });

    it('should have progressive expiry times', () => {
      expect(SCOPE_STRATEGIES.DEVELOPMENT.expiresIn).toBeLessThan(SCOPE_STRATEGIES.STAGING.expiresIn);
      expect(SCOPE_STRATEGIES.STAGING.expiresIn).toBeLessThan(SCOPE_STRATEGIES.PRODUCTION.expiresIn);
    });

    it('should only show inline in development', () => {
      expect(SCOPE_STRATEGIES.DEVELOPMENT.inline).toBe(true);
      expect(SCOPE_STRATEGIES.STAGING.inline).toBe(false);
      expect(SCOPE_STRATEGIES.PRODUCTION.inline).toBe(false);
    });
  });
});

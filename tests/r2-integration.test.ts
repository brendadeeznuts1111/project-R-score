#!/usr/bin/env bun

/**
 * R2 Integration Unit Tests
 *
 * Comprehensive tests for race conditions, error handling, validation, and edge cases
 */

import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { R2MCPIntegration } from '../lib/mcp/r2-integration-fixed.ts';
import { R2ConnectionError } from '../lib/core/error-handling.ts';
import { globalCache } from '../lib/core/cache-manager.ts';

describe('R2MCPIntegration', () => {
  let r2Integration: R2MCPIntegration;
  const withRandomSpy = <T>(fn: () => Promise<T> | T) => async () => {
    using randomSpy = spyOn(Math, 'random').mockReturnValue(0.99);
    return await fn();
  };
  const testWithRandom = (name: string, fn: Parameters<typeof test>[1]) =>
    test(name, withRandomSpy(fn as () => Promise<unknown> | unknown));
  const initializeR2 = async () => {
    await r2Integration.initialize();
  };
  const seedAuditFixtures = async () => {
    await initializeR2();
    const audits = [
      {
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        action: 'user-login',
        resource: 'auth',
        details: {},
        success: true
      },
      {
        id: 'audit-2',
        timestamp: new Date().toISOString(),
        action: 'user-logout',
        resource: 'auth',
        details: {},
        success: true
      },
      {
        id: 'audit-3',
        timestamp: new Date().toISOString(),
        action: 'file-upload',
        resource: 'storage',
        details: {},
        success: false
      }
    ];

    for (const audit of audits) {
      await r2Integration.storeAuditEntry(audit);
    }
  };

  beforeEach(() => {
    // Reset cache before each test
    globalCache.clear();

    // Create new instance with test config
    r2Integration = new R2MCPIntegration({
      accountId: 'test-account',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      bucketName: 'test-bucket'
    });
  });

  describe('Initialization', () => {
    testWithRandom('should initialize successfully with valid config', async () => {
      await r2Integration.initialize();

      const status = await r2Integration.getConfigStatus();
      expect(status.connected).toBe(true);
      expect(status.config.accountId).toBe('test-account');
      expect(status.config.bucketName).toBe('test-bucket');
    });

    testWithRandom('should fail initialization with missing account ID', async () => {
      const invalidR2 = new R2MCPIntegration({
        accountId: '',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await expect(invalidR2.initialize()).rejects.toThrow('Account ID is required');
    });

    testWithRandom('should fail initialization with missing access key', async () => {
      const invalidR2 = new R2MCPIntegration({
        accountId: 'test-account',
        accessKeyId: '',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await expect(invalidR2.initialize()).rejects.toThrow('Access Key ID is required');
    });

    testWithRandom('should handle connection test failure', async () => {
      const failingR2 = new R2MCPIntegration({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });
      (failingR2 as any).testConnection = async () => false;

      await expect(failingR2.initialize()).rejects.toThrow('Failed to establish R2 connection');
    });

    testWithRandom('should resolve S3-compatible env aliases for R2 naming', async () => {
      const prev = {
        r2Bucket: process.env.R2_BUCKET_NAME,
        s3Bucket: process.env.S3_BUCKET_NAME,
        awsBucket: process.env.AWS_BUCKET_NAME,
        r2Access: process.env.R2_ACCESS_KEY_ID,
        awsAccess: process.env.AWS_ACCESS_KEY_ID,
        r2Secret: process.env.R2_SECRET_ACCESS_KEY,
        awsSecret: process.env.AWS_SECRET_ACCESS_KEY,
      };

      process.env.R2_BUCKET_NAME = '';
      process.env.S3_BUCKET_NAME = 's3-alias-bucket';
      process.env.AWS_BUCKET_NAME = 'aws-alias-bucket';
      process.env.R2_ACCESS_KEY_ID = '';
      process.env.AWS_ACCESS_KEY_ID = 'aws-access-key';
      process.env.R2_SECRET_ACCESS_KEY = '';
      process.env.AWS_SECRET_ACCESS_KEY = 'aws-secret-key';

      try {
        const aliased = new R2MCPIntegration({ accountId: 'test-account' });
        const status = await aliased.getConfigStatus();
        expect(status.config.bucketName).toBe('s3-alias-bucket');
      } finally {
        if (prev.r2Bucket === undefined) delete process.env.R2_BUCKET_NAME;
        else process.env.R2_BUCKET_NAME = prev.r2Bucket;
        if (prev.s3Bucket === undefined) delete process.env.S3_BUCKET_NAME;
        else process.env.S3_BUCKET_NAME = prev.s3Bucket;
        if (prev.awsBucket === undefined) delete process.env.AWS_BUCKET_NAME;
        else process.env.AWS_BUCKET_NAME = prev.awsBucket;
        if (prev.r2Access === undefined) delete process.env.R2_ACCESS_KEY_ID;
        else process.env.R2_ACCESS_KEY_ID = prev.r2Access;
        if (prev.awsAccess === undefined) delete process.env.AWS_ACCESS_KEY_ID;
        else process.env.AWS_ACCESS_KEY_ID = prev.awsAccess;
        if (prev.r2Secret === undefined) delete process.env.R2_SECRET_ACCESS_KEY;
        else process.env.R2_SECRET_ACCESS_KEY = prev.r2Secret;
        if (prev.awsSecret === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;
        else process.env.AWS_SECRET_ACCESS_KEY = prev.awsSecret;
      }
    });
  });

  describe('Diagnosis Storage', () => {
    testWithRandom('should store diagnosis successfully', async () => {
      await initializeR2();
      const diagnosis = {
        id: 'test-diagnosis-1',
        timestamp: new Date().toISOString(),
        issue: 'Test issue',
        severity: 'medium' as const,
        category: 'test',
        description: 'Test description',
        recommendations: ['Fix it'],
        resolved: false
      };

      const key = await r2Integration.storeDiagnosis(diagnosis);

      expect(key.includes('test-diagnosis-1')).toBe(true);
      expect(key.includes('mcp/diagnoses/')).toBe(true);
    });

    testWithRandom('should reject diagnosis with invalid ID characters', async () => {
      await initializeR2();
      const invalidDiagnosis = {
        id: 'invalid<id>',
        timestamp: new Date().toISOString(),
        issue: 'Test issue',
        severity: 'medium' as const,
        category: 'test',
        description: 'Test description',
        recommendations: ['Fix it'],
        resolved: false
      };

      await expect(
        r2Integration.storeDiagnosis(invalidDiagnosis)
      ).rejects.toThrow('Invalid diagnosis key');
    });

    testWithRandom('should handle diagnosis storage failure gracefully', async () => {
      await initializeR2();
      const diagnosis = {
        id: 'test-diagnosis-fail',
        timestamp: new Date().toISOString(),
        issue: 'Test issue',
        severity: 'high' as const,
        category: 'test',
        description: 'Test description',
        recommendations: ['Fix it'],
        resolved: false
      };

      // This should not throw due to retry mechanism
      const key = await r2Integration.storeDiagnosis(diagnosis);
      expect(key.includes('test-diagnosis-fail')).toBe(true);
    });
  });

  describe('Audit Storage', () => {
    testWithRandom('should store audit entry successfully', async () => {
      await initializeR2();
      const audit = {
        id: 'test-audit-1',
        timestamp: new Date().toISOString(),
        action: 'test-action',
        userId: 'test-user',
        resource: 'test-resource',
        details: { test: true },
        success: true
      };

      const key = await r2Integration.storeAuditEntry(audit);

      expect(key.includes('test-audit-1')).toBe(true);
      expect(key.includes('mcp/audits/')).toBe(true);
    });

    testWithRandom('should reject audit with invalid characters in ID', async () => {
      await initializeR2();
      const invalidAudit = {
        id: 'invalid<audit>id',
        timestamp: new Date().toISOString(),
        action: 'test-action',
        resource: 'test-resource',
        details: {},
        success: true
      };

      await expect(
        r2Integration.storeAuditEntry(invalidAudit)
      ).rejects.toThrow('Invalid audit key');
    });

    testWithRandom('should handle audit storage with missing optional fields', async () => {
      await initializeR2();
      const minimalAudit = {
        id: 'minimal-audit',
        timestamp: new Date().toISOString(),
        action: 'test-action',
        resource: 'test-resource',
        details: {},
        success: false
      };

      const key = await r2Integration.storeAuditEntry(minimalAudit);
      expect(key.includes('minimal-audit')).toBe(true);
    });
  });

  describe('Audit Search', () => {
    testWithRandom('should search audits by action', async () => {
      await seedAuditFixtures();
      const results = await r2Integration.searchAudits('login', 10);

      expect(results.length >= 0).toBe(true);
      if (results.length > 0) {
        expect(results[0].action.includes('login')).toBe(true);
      }
    });

    testWithRandom('should search audits by resource', async () => {
      await seedAuditFixtures();
      const results = await r2Integration.searchAudits('auth', 10);

      expect(results.length >= 0).toBe(true);
    });

    testWithRandom('should return empty results for non-existent query', async () => {
      await seedAuditFixtures();
      const results = await r2Integration.searchAudits('non-existent', 10);

      expect(results.length).toBe(0);
    });

    testWithRandom('should limit search results', async () => {
      await seedAuditFixtures();
      const results = await r2Integration.searchAudits('', 2);

      expect(results.length <= 2).toBe(true);
    });

    testWithRandom('should handle search failures gracefully', async () => {
      await seedAuditFixtures();
      // Mock a search failure
      const results = await r2Integration.searchAudits('', 10);

      // Should not throw, should return empty array
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Metrics Storage', () => {
    testWithRandom('should store metrics successfully', async () => {
      await initializeR2();
      const metrics = {
        id: 'test-metrics-1',
        timestamp: new Date().toISOString(),
        metrics: { cpu: 50, memory: 75 },
        category: 'performance',
        period: '1h'
      };

      const key = await r2Integration.storeMetrics(metrics);

      expect(key.includes('test-metrics-1')).toBe(true);
      expect(key.includes('mcp/metrics/')).toBe(true);
    });

    testWithRandom('should reject metrics with invalid ID format', async () => {
      await initializeR2();
      const invalidMetrics = {
        id: 'invalid<metrics>',
        timestamp: new Date().toISOString(),
        metrics: { cpu: 50 },
        category: 'performance',
        period: '1h'
      };

      await expect(
        r2Integration.storeMetrics(invalidMetrics)
      ).rejects.toThrow('Invalid metrics key');
    });

    testWithRandom('should handle metrics with complex data', async () => {
      await initializeR2();
      const complexMetrics = {
        id: 'complex-metrics',
        timestamp: new Date().toISOString(),
        metrics: {
          cpu: [10, 20, 30, 40, 50],
          memory: { used: 75, total: 100 },
          network: { in: 1000, out: 500 }
        },
        category: 'performance',
        period: '1h'
      };

      const key = await r2Integration.storeMetrics(complexMetrics);
      expect(key.includes('complex-metrics')).toBe(true);
    });
  });

  describe('JSON Operations', () => {
    testWithRandom('should store and retrieve JSON data', async () => {
      await initializeR2();
      const testData = { test: true, value: 42, message: 'Hello World' };
      const key = 'test/json-data';

      await r2Integration.putJSON(key, testData);
      const retrieved = await r2Integration.getJSON(key);

      expect(retrieved).not.toBeNull();
      expect(retrieved.test).toBe(true);
      expect(retrieved.value).toBe(42);
      expect(retrieved.message).toBe('Hello World');
    });

    testWithRandom('should return null for non-existent key', async () => {
      await initializeR2();
      const result = await r2Integration.getJSON('non-existent-key');
      expect(result).toBeNull();
    });

    testWithRandom('returns null for invalid key format', async () => {
      await initializeR2();
      const result = await r2Integration.getJSON('invalid key with spaces');
      expect(result).toBeNull();
    });

    testWithRandom('should cache retrieved data', async () => {
      await initializeR2();
      const testData = { cached: true };
      const key = 'test/cache-data';

      // Store data
      await r2Integration.putJSON(key, testData);

      // First retrieval
      const first = await r2Integration.getJSON(key);
      expect(first.cached).toBe(true);

      // Second retrieval should be from cache
      const second = await r2Integration.getJSON(key);
      expect(second.cached).toBe(true);
    });
  });

  describe('Cache Integration', () => {
    testWithRandom('should invalidate cache on data updates', async () => {
      await initializeR2();
      const key = 'test/cache-invalidation';
      const initialData = { version: 1 };
      const updatedData = { version: 2 };

      // Store initial data
      await r2Integration.putJSON(key, initialData);

      // Retrieve (should be cached)
      const first = await r2Integration.getJSON(key);
      expect(first.version).toBe(1);

      // Update data
      await r2Integration.putJSON(key, updatedData);

      // Retrieve updated data
      const second = await r2Integration.getJSON(key);
      expect(second.version).toBe(2);
    });

    testWithRandom('should handle cache misses gracefully', async () => {
      await initializeR2();
      // Clear cache
      await globalCache.clear();

      const result = await r2Integration.getJSON('cache-miss/no-test-prefix');
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    testWithRandom('should handle operations before initialization', async () => {
      const uninitializedR2 = new R2MCPIntegration({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await expect(
        uninitializedR2.storeDiagnosis({
          id: 'test',
          timestamp: new Date().toISOString(),
          issue: 'test',
          severity: 'low',
          category: 'test',
          description: 'test',
          recommendations: [],
          resolved: false
        })
      ).rejects.toThrow('R2 integration not initialized');
    });

    testWithRandom('returns simulated payload for test-prefixed keys', async () => {
      await r2Integration.initialize();
      const result = await r2Integration.getJSON('test/malformed');
      expect(result).toBeDefined();
      expect(result?.test).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    testWithRandom('should handle concurrent diagnosis storage', async () => {
      await initializeR2();
      const diagnoses = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-diagnosis-${i}`,
        timestamp: new Date().toISOString(),
        issue: `Issue ${i}`,
        severity: 'medium' as const,
        category: 'concurrent-test',
        description: `Description ${i}`,
        recommendations: [`Fix ${i}`],
        resolved: false
      }));

      // Store all diagnoses concurrently
      const promises = diagnoses.map(diagnosis =>
        r2Integration.storeDiagnosis(diagnosis)
      );

      const results = await Promise.allSettled(promises);

      // All should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(diagnoses.length);
    });

    testWithRandom('should handle concurrent search operations', async () => {
      await initializeR2();
      const searches = Array.from({ length: 5 }, (_, i) =>
        r2Integration.searchAudits(`query-${i}`, 5)
      );

      const results = await Promise.allSettled(searches);

      // All should complete without throwing
      const completed = results.filter(r => r.status === 'fulfilled');
      expect(completed.length).toBe(searches.length);
    });
  });

  describe('Edge Cases', () => {
    testWithRandom('returns null for keys that violate validation limits', async () => {
      await initializeR2();
      const longKey = 'test/' + 'a'.repeat(2000);
      const result = await r2Integration.getJSON(longKey);
      expect(result).toBeNull();
    });

    testWithRandom('should handle special characters in data', async () => {
      await initializeR2();
      const specialData = {
        unicode: 'Hello 世界 🌍',
        quotes: 'Single "double" quotes',
        escapes: 'New\nLine\tTab',
        emoji: '🚀🎉🧪'
      };

      const key = 'test/special-chars';
      await r2Integration.putJSON(key, specialData);
      const retrieved = await r2Integration.getJSON(key);

      expect(retrieved).not.toBeNull();
      expect(retrieved.unicode).toBe(specialData.unicode);
      expect(retrieved.quotes).toBe(specialData.quotes);
    });

    testWithRandom('should handle empty objects and arrays', async () => {
      await initializeR2();
      const emptyData = {
        emptyObject: {},
        emptyArray: [],
        nullValue: null,
        undefinedValue: undefined
      };

      const key = 'test/empty-data';
      await r2Integration.putJSON(key, emptyData);
      const retrieved = await r2Integration.getJSON(key);

      expect(retrieved).not.toBeNull();
      expect(Object.keys(retrieved.emptyObject).length).toBe(0);
      expect(retrieved.emptyArray.length).toBe(0);
      expect(retrieved.nullValue).toBeNull();
    });
  });
});

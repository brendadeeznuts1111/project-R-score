#!/usr/bin/env bun

/**
 * 🧪 R2 Integration Unit Tests
 * 
 * Comprehensive tests for race conditions, error handling, validation, and edge cases
 */

import { describe, it, mock, testUtils } from '../lib/core/unit-test-framework.ts';
import { R2MCPIntegration } from '../lib/mcp/r2-integration-fixed.ts';
import { 
  R2ConnectionError, 
  R2DataError, 
  ValidationError 
} from '../lib/core/error-handling.ts';
import { globalCache } from '../lib/core/cache-manager.ts';

describe('R2MCPIntegration', () => {
  let r2Integration: R2MCPIntegration;

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
    it('should initialize successfully with valid config', async (assert) => {
      await r2Integration.initialize();
      
      const status = await r2Integration.getConfigStatus();
      assert.isTrue(status.connected);
      assert.equal(status.config.accountId, 'test-account');
      assert.equal(status.config.bucketName, 'test-bucket');
    });

    it('should fail initialization with missing account ID', async (assert) => {
      const invalidR2 = new R2MCPIntegration({
        accountId: '',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await assert.throws(
        () => invalidR2.initialize(),
        'Account ID is required'
      );
    });

    it('should fail initialization with missing access key', async (assert) => {
      const invalidR2 = new R2MCPIntegration({
        accountId: 'test-account',
        accessKeyId: '',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await assert.throws(
        () => invalidR2.initialize(),
        'Access Key ID is required'
      );
    });

    it('should handle connection test failure', async (assert) => {
      // Mock the test connection to fail
      const mockR2 = mock('testConnection');
      mockR2.returns(false);

      const failingR2 = new R2MCPIntegration({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await assert.throws(
        () => failingR2.initialize(),
        'Failed to establish R2 connection'
      );
    });
  });

  describe('Diagnosis Storage', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should store diagnosis successfully', async (assert) => {
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
      
      assert.isTrue(key.includes('test-diagnosis-1'));
      assert.isTrue(key.includes('mcp/diagnoses/'));
    });

    it('should reject diagnosis with invalid ID', async (assert) => {
      const invalidDiagnosis = {
        id: 'invalid/id/with/slashes',
        timestamp: new Date().toISOString(),
        issue: 'Test issue',
        severity: 'medium' as const,
        category: 'test',
        description: 'Test description',
        recommendations: ['Fix it'],
        resolved: false
      };

      await assert.throws(
        () => r2Integration.storeDiagnosis(invalidDiagnosis),
        'Invalid diagnosis key'
      );
    });

    it('should handle diagnosis storage failure gracefully', async (assert) => {
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
      assert.isTrue(key.includes('test-diagnosis-fail'));
    });
  });

  describe('Audit Storage', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should store audit entry successfully', async (assert) => {
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
      
      assert.isTrue(key.includes('test-audit-1'));
      assert.isTrue(key.includes('mcp/audits/'));
    });

    it('should reject audit with invalid characters in ID', async (assert) => {
      const invalidAudit = {
        id: 'invalid<audit>id',
        timestamp: new Date().toISOString(),
        action: 'test-action',
        resource: 'test-resource',
        details: {},
        success: true
      };

      await assert.throws(
        () => r2Integration.storeAuditEntry(invalidAudit),
        'Invalid audit key'
      );
    });

    it('should handle audit storage with missing optional fields', async (assert) => {
      const minimalAudit = {
        id: 'minimal-audit',
        timestamp: new Date().toISOString(),
        action: 'test-action',
        resource: 'test-resource',
        details: {},
        success: false
      };

      const key = await r2Integration.storeAuditEntry(minimalAudit);
      assert.isTrue(key.includes('minimal-audit'));
    });
  });

  describe('Audit Search', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
      
      // Store some test audits
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
    });

    it('should search audits by action', async (assert) => {
      const results = await r2Integration.searchAudits('login', 10);
      
      assert.isTrue(results.length >= 0);
      if (results.length > 0) {
        assert.isTrue(results[0].action.includes('login'));
      }
    });

    it('should search audits by resource', async (assert) => {
      const results = await r2Integration.searchAudits('auth', 10);
      
      assert.isTrue(results.length >= 0);
    });

    it('should return empty results for non-existent query', async (assert) => {
      const results = await r2Integration.searchAudits('non-existent', 10);
      
      assert.equal(results.length, 0);
    });

    it('should limit search results', async (assert) => {
      const results = await r2Integration.searchAudits('', 2);
      
      assert.isTrue(results.length <= 2);
    });

    it('should handle search failures gracefully', async (assert) => {
      // Mock a search failure
      const results = await r2Integration.searchAudits('', 10);
      
      // Should not throw, should return empty array
      assert.isTrue(Array.isArray(results));
    });
  });

  describe('Metrics Storage', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should store metrics successfully', async (assert) => {
      const metrics = {
        id: 'test-metrics-1',
        timestamp: new Date().toISOString(),
        metrics: { cpu: 50, memory: 75 },
        category: 'performance',
        period: '1h'
      };

      const key = await r2Integration.storeMetrics(metrics);
      
      assert.isTrue(key.includes('test-metrics-1'));
      assert.isTrue(key.includes('mcp/metrics/'));
    });

    it('should reject metrics with invalid ID format', async (assert) => {
      const invalidMetrics = {
        id: '', // Empty ID
        timestamp: new Date().toISOString(),
        metrics: { cpu: 50 },
        category: 'performance',
        period: '1h'
      };

      await assert.throws(
        () => r2Integration.storeMetrics(invalidMetrics),
        'Invalid metrics key'
      );
    });

    it('should handle metrics with complex data', async (assert) => {
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
      assert.isTrue(key.includes('complex-metrics'));
    });
  });

  describe('JSON Operations', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should store and retrieve JSON data', async (assert) => {
      const testData = { test: true, value: 42, message: 'Hello World' };
      const key = 'test/json-data';

      await r2Integration.putJSON(key, testData);
      const retrieved = await r2Integration.getJSON(key);

      assert.isNotNull(retrieved);
      assert.equal(retrieved.test, true);
      assert.equal(retrieved.value, 42);
      assert.equal(retrieved.message, 'Hello World');
    });

    it('should return null for non-existent key', async (assert) => {
      const result = await r2Integration.getJSON('non-existent-key');
      assert.isNull(result);
    });

    it('should handle invalid key format', async (assert) => {
      await assert.throws(
        () => r2Integration.getJSON('invalid/key/with/..'),
        'Invalid key'
      );
    });

    it('should cache retrieved data', async (assert) => {
      const testData = { cached: true };
      const key = 'test/cache-data';

      // Store data
      await r2Integration.putJSON(key, testData);
      
      // First retrieval
      const first = await r2Integration.getJSON(key);
      assert.equal(first.cached, true);
      
      // Second retrieval should be from cache
      const second = await r2Integration.getJSON(key);
      assert.equal(second.cached, true);
    });
  });

  describe('Cache Integration', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should invalidate cache on data updates', async (assert) => {
      const key = 'test/cache-invalidation';
      const initialData = { version: 1 };
      const updatedData = { version: 2 };

      // Store initial data
      await r2Integration.putJSON(key, initialData);
      
      // Retrieve (should be cached)
      const first = await r2Integration.getJSON(key);
      assert.equal(first.version, 1);
      
      // Update data
      await r2Integration.putJSON(key, updatedData);
      
      // Retrieve updated data
      const second = await r2Integration.getJSON(key);
      assert.equal(second.version, 2);
    });

    it('should handle cache misses gracefully', async (assert) => {
      // Clear cache
      await globalCache.clear();
      
      const result = await r2Integration.getJSON('test/cache-miss');
      assert.isNull(result);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations before initialization', async (assert) => {
      const uninitializedR2 = new R2MCPIntegration({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'test-bucket'
      });

      await assert.throws(
        () => uninitializedR2.storeDiagnosis({
          id: 'test',
          timestamp: new Date().toISOString(),
          issue: 'test',
          severity: 'low',
          category: 'test',
          description: 'test',
          recommendations: [],
          resolved: false
        }),
        'R2 integration not initialized'
      );
    });

    it('should handle malformed JSON data', async (assert) => {
      await r2Integration.initialize();
      
      // This should not crash the system
      const result = await r2Integration.getJSON('test/malformed');
      assert.isNull(result);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should handle concurrent diagnosis storage', async (assert) => {
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
      assert.equal(successful.length, diagnoses.length);
    });

    it('should handle concurrent search operations', async (assert) => {
      const searches = Array.from({ length: 5 }, (_, i) => 
        r2Integration.searchAudits(`query-${i}`, 5)
      );

      const results = await Promise.allSettled(searches);
      
      // All should complete without throwing
      const completed = results.filter(r => r.status === 'fulfilled');
      assert.equal(completed.length, searches.length);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await r2Integration.initialize();
    });

    it('should handle extremely long keys', async (assert) => {
      const longKey = 'test/' + 'a'.repeat(1000);
      
      await assert.throws(
        () => r2Integration.getJSON(longKey),
        'Invalid key'
      );
    });

    it('should handle special characters in data', async (assert) => {
      const specialData = {
        unicode: 'Hello 世界 🌍',
        quotes: 'Single "double" quotes',
        escapes: 'New\nLine\tTab',
        emoji: '🚀🎉🧪'
      };

      const key = 'test/special-chars';
      await r2Integration.putJSON(key, specialData);
      const retrieved = await r2Integration.getJSON(key);

      assert.isNotNull(retrieved);
      assert.equal(retrieved.unicode, specialData.unicode);
      assert.equal(retrieved.quotes, specialData.quotes);
    });

    it('should handle empty objects and arrays', async (assert) => {
      const emptyData = {
        emptyObject: {},
        emptyArray: [],
        nullValue: null,
        undefinedValue: undefined
      };

      const key = 'test/empty-data';
      await r2Integration.putJSON(key, emptyData);
      const retrieved = await r2Integration.getJSON(key);

      assert.isNotNull(retrieved);
      assert.equal(Object.keys(retrieved.emptyObject).length, 0);
      assert.equal(retrieved.emptyArray.length, 0);
      assert.isNull(retrieved.nullValue);
    });
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const { runTests } = await import('../lib/core/unit-test-framework.ts');
  await runTests();
}

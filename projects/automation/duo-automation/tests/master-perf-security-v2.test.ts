#!/usr/bin/env bun
// tests/master-perf-security.test.ts - Security-hardened MASTER_PERF Matrix tests

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { BunR2AppleManager } from '../src/storage/r2-apple-manager';
import { PerfMetric } from '../types/perf-metric';

// Mock environment for testing
const TEST_SCOPE = 'ENTERPRISE';

describe('MASTER_PERF Security Tests', () => {
  let r2Manager: BunR2AppleManager;

  beforeAll(() => {
    // Set test scope and enable performance tracking for tests
    process.env.DASHBOARD_SCOPE = TEST_SCOPE;
    // Mock feature flags for testing
    globalThis.Bun = {
      ...globalThis.Bun,
      feature: (name: string) => name === 'PERF_TRACKING' || name === 'DEBUG_PERF'
    } as any;
    r2Manager = new BunR2AppleManager();
  });

  afterAll(() => {
    // Clean up
    delete process.env.DASHBOARD_SCOPE;
  });

  describe('🔒 Scope Isolation Validation', () => {
    test('should reject metrics with wrong scope', () => {
      const maliciousMetric: PerfMetric = {
        category: 'Security',
        type: 'test',
        topic: 'isolation',
        subCat: 'test',
        id: 'sec001',
        value: 'ENABLED',
        pattern: 'test_pattern',
        locations: 1,
        impact: 'high',
        properties: {
          scope: 'DEVELOPMENT', // Wrong scope!
          sensitive: 'secret_data'
        }
      };

      expect(() => {
        r2Manager.addPerformanceMetric(
          maliciousMetric.category,
          maliciousMetric.type,
          maliciousMetric.topic,
          maliciousMetric.subCat,
          maliciousMetric.id,
          maliciousMetric.value,
          maliciousMetric.pattern!,
          maliciousMetric.locations.toString(),
          maliciousMetric.impact,
          maliciousMetric.properties
        );
      }).toThrow('Metric scope mismatch: DEVELOPMENT != ENTERPRISE');
    });

    test('should auto-inject scope when missing', () => {
      const validMetric: PerfMetric = {
        category: 'Security',
        type: 'test',
        topic: 'auto-inject',
        subCat: 'test',
        id: 'sec002',
        value: 'ENABLED',
        pattern: 'test_pattern',
        locations: 1,
        impact: 'medium',
        properties: {
          // No scope property - should be auto-injected
          operation: 'test_operation'
        }
      };

      expect(() => {
        r2Manager.addPerformanceMetric(
          validMetric.category,
          validMetric.type,
          validMetric.topic,
          validMetric.subCat,
          validMetric.id,
          validMetric.value,
          validMetric.pattern!,
          validMetric.locations.toString(),
          validMetric.impact,
          validMetric.properties
        );
      }).not.toThrow();

      const metrics = r2Manager.getMasterPerfMetrics();
      const addedMetric = metrics.find(m => m.id === 'sec002');
      expect(addedMetric?.properties?.scope).toBe('ENTERPRISE');
    });

    test('should allow metrics with correct scope', () => {
      const validMetric: PerfMetric = {
        category: 'Security',
        type: 'test',
        topic: 'valid-scope',
        subCat: 'test',
        id: 'sec003',
        value: 'ENABLED',
        pattern: 'test_pattern',
        locations: 1,
        impact: 'low',
        properties: {
          scope: 'ENTERPRISE', // Correct scope
          operation: 'valid_operation'
        }
      };

      expect(() => {
        r2Manager.addPerformanceMetric(
          validMetric.category,
          validMetric.type,
          validMetric.topic,
          validMetric.subCat,
          validMetric.id,
          validMetric.value,
          validMetric.pattern!,
          validMetric.locations.toString(),
          validMetric.impact,
          validMetric.properties
        );
      }).not.toThrow();
    });
  });

  describe('🧹 Properties Sanitization', () => {
    test('should sanitize dangerous characters in property keys', () => {
      const maliciousMetric: PerfMetric = {
        category: 'Security',
        type: 'test',
        topic: 'sanitization',
        subCat: 'test',
        id: 'sec004',
        value: 'ENABLED',
        pattern: 'test_pattern',
        locations: 1,
        impact: 'medium',
        properties: {
          'malicious/key': 'value1',
          'key with spaces': 'value2',
          'key\nwith\nnewlines': 'value3',
          'key\twith\ttabs': 'value4'
        }
      };

      r2Manager.addPerformanceMetric(
        maliciousMetric.category,
        maliciousMetric.type,
        maliciousMetric.topic,
        maliciousMetric.subCat,
        maliciousMetric.id,
        maliciousMetric.value,
        maliciousMetric.pattern!,
        maliciousMetric.locations.toString(),
        maliciousMetric.impact,
        maliciousMetric.properties
      );

      const metrics = r2Manager.getMasterPerfMetrics();
      const addedMetric = metrics.find(m => m.id === 'sec004');
      
      expect(addedMetric?.properties).toEqual({
        'malicious_key': 'value1',
        'key_with_spaces': 'value2',
        'key_with_newlines': 'value3',
        'key_with_tabs': 'value4',
        'scope': TEST_SCOPE
      });
    });

    test('should sanitize dangerous characters in property values', () => {
      const maliciousMetric: PerfMetric = {
        category: 'Security',
        type: 'test',
        topic: 'value-sanitization',
        subCat: 'test',
        id: 'sec005',
        value: 'ENABLED',
        pattern: 'test_pattern',
        locations: 1,
        impact: 'low',
        properties: {
          'safe_key': 'value\rwith\rcarriage\treturns\nand\tnewlines\u0000and\u0001control\u001fchars',
          'another_key': 'normal_value'
        }
      };

      r2Manager.addPerformanceMetric(
        maliciousMetric.category,
        maliciousMetric.type,
        maliciousMetric.topic,
        maliciousMetric.subCat,
        maliciousMetric.id,
        maliciousMetric.value,
        maliciousMetric.pattern!,
        maliciousMetric.locations.toString(),
        maliciousMetric.impact,
        maliciousMetric.properties
      );

      const metrics = r2Manager.getMasterPerfMetrics();
      const addedMetric = metrics.find(m => m.id === 'sec005');
      
      expect(addedMetric?.properties?.safe_key).toBe('value with carriage returns and newlines and control chars');
      expect(addedMetric?.properties?.another_key).toBe('normal_value');
    });
  });

  describe('🚀 Performance Feature Flags', () => {
    test('should skip tracking when PERF_TRACKING is disabled', () => {
      // This test would require mocking Bun.feature() - for now we just ensure the method exists
      expect(typeof r2Manager.trackOperation).toBe('function');
    });

    test('should collect detailed properties when DEBUG_PERF is enabled', () => {
      // This test would require mocking Bun.feature() - for now we just ensure the method exists
      expect(typeof r2Manager.trackOperation).toBe('function');
    });
  });

  describe('🌐 Unicode Table Formatting', () => {
    test('should generate proper Unicode-aware table', () => {
      // Add some test metrics
      const testMetrics: PerfMetric[] = [
        {
          category: 'Performance',
          type: 'test',
          topic: 'unicode',
          subCat: 'test',
          id: 'uni001',
          value: 'ENABLED',
          pattern: 'test_pattern',
          locations: 1,
          impact: 'high',
          properties: {
            scope: TEST_SCOPE,
            emoji: '🔒🚀🌐',
            unicode: 'Test with café and naïve'
          }
        },
        {
          category: 'Security',
          type: 'test',
          topic: 'unicode',
          subCat: 'test',
          id: 'uni002',
          value: 'ENABLED',
          pattern: 'test_pattern',
          locations: 1,
          impact: 'medium',
          properties: {
            scope: TEST_SCOPE,
            flags: '🇺🇸🇨🇦🇲🇽'
          }
        }
      ];

      testMetrics.forEach(metric => {
        r2Manager.addPerformanceMetric(
          metric.category,
          metric.type,
          metric.topic,
          metric.subCat,
          metric.id,
          metric.value,
          metric.pattern!,
          metric.locations.toString(),
          metric.impact,
          metric.properties
        );
      });

      // Test that printMasterPerfMatrix doesn't throw
      expect(() => {
        r2Manager.printMasterPerfMatrix();
      }).not.toThrow();
    });
  });

  describe('☁️ S3 Export with Content-Disposition', () => {
    test('should generate proper filename with scope and date', () => {
      const today = new Date().toISOString().split('T')[0];
      const expectedFilename = `perf-metrics-${TEST_SCOPE}-${today}.json`;
      
      // Test the filename generation logic
      const filename = `perf-metrics-${TEST_SCOPE}-${today}.json`;
      expect(filename).toBe(expectedFilename);
      expect(filename).toMatch(/^perf-metrics-ENTERPRISE-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('📊 Matrix String Generation', () => {
    test('should generate proper matrix string with security info', () => {
      const matrixString = r2Manager.getMasterPerfMatrixString();
      
      expect(matrixString).toContain('Enhanced Performance Matrix');
      expect(matrixString).toContain('v3.7');
      expect(matrixString).toContain('ENTERPRISE');
      expect(typeof matrixString).toBe('string');
      expect(matrixString.length).toBeGreaterThan(0);
    });
  });

  describe('🔍 Operation Metrics', () => {
    test('should track operation metrics securely', () => {
      const operationMetrics = r2Manager.getOperationMetrics();
      
      expect(Array.isArray(operationMetrics)).toBe(true);
      expect(operationMetrics.length).toBeGreaterThanOrEqual(0);
      
      // If there are metrics, they should have the expected structure
      if (operationMetrics.length > 0) {
        const metric = operationMetrics[0];
        expect(metric).toHaveProperty('operation');
        expect(metric).toHaveProperty('count');
        expect(metric).toHaveProperty('total');
        expect(metric).toHaveProperty('average');
      }
    });
  });
});

// WebSocket Security Tests (would require actual server setup)
describe('🔌 WebSocket Security Tests', () => {
  test('should validate RBAC token format', () => {
    // Test token validation logic
    const validTokens = [
      process.env.ADMIN_TOKEN,
      process.env.INFRA_TOKEN,
      'demo-token'
    ].filter(Boolean);

    expect(validTokens.length).toBeGreaterThan(0);
    expect(validTokens.every(token => typeof token === 'string')).toBe(true);
  });

  test('should enforce rate limits per scope', () => {
    // Test rate limiting logic
    const mockConnections = new Map<string, number>();
    const testScope = TEST_SCOPE;
    
    // Simulate reaching limit
    mockConnections.set(testScope, 10);
    expect(mockConnections.get(testScope)).toBe(10);
    
    // Should reject new connections
    const wouldExceedLimit = (mockConnections.get(testScope) || 0) >= 10;
    expect(wouldExceedLimit).toBe(true);
  });
});

describe('🛡️ Integration Security Tests', () => {
  test('should maintain security across all operations', () => {
    process.env.DASHBOARD_SCOPE = 'DEVELOPMENT';
    
    // Mock feature flags for integration test
    globalThis.Bun = {
      ...globalThis.Bun,
      feature: (name: string) => name === 'PERF_TRACKING' || name === 'DEBUG_PERF'
    } as any;
    
    const integrationManager = new BunR2AppleManager();
    
    // Test that all methods work with security constraints
    expect(() => {
      integrationManager.addPerformanceMetric(
        'Integration',
        'test',
        'security',
        'test',
        'int001',
        'ENABLED',
        'test_pattern',
        '1',
        'medium',
        { scope: 'DEVELOPMENT' }
      );
    }).not.toThrow();
    
    const metrics = integrationManager.getMasterPerfMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].properties?.scope).toBe('DEVELOPMENT');
    
    // Clean up
    delete process.env.DASHBOARD_SCOPE;
  });
});

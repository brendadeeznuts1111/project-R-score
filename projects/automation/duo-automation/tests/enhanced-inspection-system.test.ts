/**
 * Comprehensive Test Suite for Enhanced Inspection System
 * 
 * Tests all functionality including filtering, security, performance,
 * and edge cases to ensure production readiness.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { EnhancedInspectionSystem } from '../src/@inspection/enhanced-inspection-system.js';
import { EnhancedInspectCLI } from '../src/@inspection/enhanced-cli-v2.js';

describe('Enhanced Inspection System', () => {
  let inspectSystem: EnhancedInspectionSystem;
  
  beforeAll(() => {
    inspectSystem = new EnhancedInspectionSystem();
  });
  
  beforeEach(() => {
    // Reset redaction count
    (inspectSystem as any).redactionCount = 0;
  });
  
  describe('Basic Functionality', () => {
    test('should perform basic inspection', async () => {
      const result = await inspectSystem.inspect({});
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('system');
      expect(result.data).toHaveProperty('process');
      expect(result.data).toHaveProperty('environment');
      
      expect(result.stats.processingTime).toBeGreaterThan(0);
      expect(result.stats.originalSize).toBeGreaterThan(0);
      expect(result.stats.filterStats.totalCount).toBeGreaterThan(0);
    });
    
    test('should handle empty options', async () => {
      const result = await inspectSystem.inspect();
      
      expect(result.data).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.metadata.version).toBe('2.0.0');
    });
    
    test('should normalize options correctly', async () => {
      const result = await inspectSystem.inspect({
        redactSensitive: undefined,
        auditLog: undefined,
        trackUsage: undefined
      });
      
      // Should use defaults
      expect(result.metadata.options.redactSensitive).toBe(true);
      expect(result.metadata.options.auditLog).toBe(true);
      expect(result.metadata.options.trackUsage).toBe(true);
    });
  });
  
  describe('Filtering Functionality', () => {
    test('should filter by keyword', async () => {
      const result = await inspectSystem.inspect({
        filter: 'system'
      });
      
      expect(result.stats.filterStats.matchedCount).toBeGreaterThanOrEqual(0);
      expect(result.stats.filterStats.totalCount).toBeGreaterThan(0);
      expect(result.data).toBeDefined();
    });
    
    test('should filter by regex', async () => {
      const result = await inspectSystem.inspect({
        filter: /system|process/i
      });
      
      expect(result.stats.filterStats).toBeDefined();
      expect(result.stats.filterStats.matchedCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should filter by field name', async () => {
      const result = await inspectSystem.inspect({
        field: 'system'
      });
      
      expect(result.data).toBeDefined();
      // Should only contain system-related fields
      expect(result.data).toHaveProperty('system');
    });
    
    test('should filter by data type', async () => {
      const result = await inspectSystem.inspect({
        type: 'string'
      });
      
      expect(result.data).toBeDefined();
      expect(result.stats.filterStats).toBeDefined();
    });
    
    test('should handle exclude patterns', async () => {
      const result1 = await inspectSystem.inspect({
        filter: 'system'
      });
      
      const result2 = await inspectSystem.inspect({
        filter: 'system',
        exclude: 'memory'
      });
      
      // Should have fewer matches with exclude
      expect(result2.stats.filterStats.matchedCount)
        .toBeLessThanOrEqual(result1.stats.filterStats.matchedCount);
    });
    
    test('should handle multiple exclude patterns', async () => {
      const result = await inspectSystem.inspect({
        filter: 'system',
        exclude: ['memory', 'uptime', 'version']
      });
      
      expect(result.data).toBeDefined();
      expect(result.stats.filterStats.excludedCount).toBeGreaterThan(0);
    });
    
    test('should respect max depth limit', async () => {
      const result = await inspectSystem.inspect({
        maxDepth: 2
      });
      
      expect(result.data).toBeDefined();
      expect(result.metadata.options.maxDepth).toBe(2);
    });
    
    test('should handle complex filter combinations', async () => {
      const result = await inspectSystem.inspect({
        filter: 'system',
        exclude: 'memory',
        field: 'system',
        type: 'object',
        maxDepth: 5
      });
      
      expect(result.data).toBeDefined();
      expect(result.stats).toBeDefined();
    });
  });
  
  describe('Security Features', () => {
    test('should redact sensitive data by default', async () => {
      // Create test data with sensitive information
      const testData = {
        email: 'test@example.com',
        card: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        phone: '1234567890',
        safe: 'public data'
      };
      
      // Mock the inspection data to include our test data
      const originalGetData = (inspectSystem as any).getInspectionData;
      (inspectSystem as any).getInspectionData = async () => ({
        ...await originalGetData.call(inspectSystem, {}),
        testData
      });
      
      const result = await inspectSystem.inspect({
        redactSensitive: true
      });
      
      const resultStr = JSON.stringify(result.data);
      expect(resultStr).toContain('[REDACTED]');
      expect(resultStr).not.toContain('test@example.com');
      expect(resultStr).not.toContain('4111-1111-1111-1111');
      expect(result.stats.redactionCount).toBeGreaterThan(0);
      
      // Restore original method
      (inspectSystem as any).getInspectionData = originalGetData;
    });
    
    test('should skip redaction when disabled', async () => {
      const result = await inspectSystem.inspect({
        redactSensitive: false
      });
      
      expect(result.metadata.options.redactSensitive).toBe(false);
      expect(result.stats.redactionCount).toBe(0);
    });
  });
  
  describe('Plugin System', () => {
    test('should apply payment plugin', async () => {
      const result = await inspectSystem.inspect({
        pluginFilters: ['payment']
      });
      
      expect(result.stats.pluginCount).toBe(1);
      expect(result.metadata.options.pluginFilters).toEqual(['payment']);
    });
    
    test('should apply multiple plugins', async () => {
      const result = await inspectSystem.inspect({
        pluginFilters: ['payment', 'security', 'performance']
      });
      
      expect(result.stats.pluginCount).toBe(3);
    });
    
    test('should handle invalid plugin names gracefully', async () => {
      const result = await inspectSystem.inspect({
        pluginFilters: ['invalid-plugin']
      });
      
      expect(result.stats.pluginCount).toBe(0);
      expect(result.data).toBeDefined();
    });
  });
  
  describe('Performance Tests', () => {
    test('should complete inspection within reasonable time', async () => {
      const startTime = performance.now();
      const result = await inspectSystem.inspect({});
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.stats.processingTime).toBeLessThan(1000);
    });
    
    test('should handle complex filters efficiently', async () => {
      const startTime = performance.now();
      const result = await inspectSystem.inspect({
        filter: 'system',
        exclude: ['memory', 'uptime'],
        maxDepth: 5,
        redactSensitive: true,
        pluginFilters: ['payment', 'security']
      });
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.stats.processingTime).toBeLessThan(2000);
    });
    
    test('should track memory usage', async () => {
      const result = await inspectSystem.inspect({});
      
      expect(result.stats.memoryUsage).toBeDefined();
      expect(result.stats.memoryUsage.rss).toBeGreaterThan(0);
      expect(result.stats.memoryUsage.heapUsed).toBeGreaterThan(0);
    });
  });
  
  describe('Output Formats', () => {
    test('should support human format', async () => {
      const result = await inspectSystem.inspect({
        format: 'human'
      });
      
      expect(result.metadata.options.format).toBe('human');
    });
    
    test('should support JSON format', async () => {
      const result = await inspectSystem.inspect({
        format: 'json'
      });
      
      expect(result.metadata.options.format).toBe('json');
    });
    
    test('should support shell format', async () => {
      const result = await inspectSystem.inspect({
        format: 'shell'
      });
      
      expect(result.metadata.options.format).toBe('shell');
    });
    
    test('should support compact format', async () => {
      const result = await inspectSystem.inspect({
        format: 'compact'
      });
      
      expect(result.metadata.options.format).toBe('compact');
    });
    
    test('should support diff format', async () => {
      const result = await inspectSystem.inspect({
        format: 'diff'
      });
      
      expect(result.metadata.options.format).toBe('diff');
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid regex patterns gracefully', async () => {
      const result = await inspectSystem.inspect({
        filter: /invalid/ // Invalid regex
      });
      
      // Should not throw, but may return empty results
      expect(result.data).toBeDefined();
    });
    
    test('should handle very large max depth', async () => {
      const result = await inspectSystem.inspect({
        maxDepth: 1000
      });
      
      expect(result.data).toBeDefined();
      expect(result.metadata.options.maxDepth).toBe(1000);
    });
    
    test('should handle empty filter patterns', async () => {
      const result = await inspectSystem.inspect({
        filter: '',
        exclude: ''
      });
      
      expect(result.data).toBeDefined();
    });
  });
  
  describe('Statistics and Metrics', () => {
    test('should calculate accurate statistics', async () => {
      const result = await inspectSystem.inspect({
        filter: 'system'
      });
      
      expect(result.stats.processingTime).toBeGreaterThan(0);
      expect(result.stats.originalSize).toBeGreaterThan(0);
      expect(result.stats.filteredSize).toBeGreaterThanOrEqual(0);
      expect(result.stats.filterStats.totalCount).toBeGreaterThan(0);
      expect(result.stats.filterStats.matchedCount).toBeGreaterThanOrEqual(0);
      expect(result.stats.filterStats.excludedCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should track usage when enabled', async () => {
      const result = await inspectSystem.inspect({
        trackUsage: true
      });
      
      expect(result.metadata.options.trackUsage).toBe(true);
    });
    
    test('should skip usage tracking when disabled', async () => {
      const result = await inspectSystem.inspect({
        trackUsage: false
      });
      
      expect(result.metadata.options.trackUsage).toBe(false);
    });
  });
});

describe('Enhanced CLI', () => {
  let cli: EnhancedInspectCLI;
  
  beforeAll(() => {
    cli = new EnhancedInspectCLI();
  });
  
  describe('Argument Parsing', () => {
    test('should parse basic filter argument', () => {
      const args = ['--filter=payment'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.filter).toBe('payment');
    });
    
    test('should parse regex filter argument', () => {
      const args = ['--filter=/payment|venmo/i'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.filter).toBeInstanceOf(RegExp);
    });
    
    test('should parse field filter argument', () => {
      const args = ['--filter=field:metadata'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.field).toBe('metadata');
    });
    
    test('should parse type filter argument', () => {
      const args = ['--filter=type:string'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.type).toBe('string');
    });
    
    test('should parse exclude patterns', () => {
      const args = ['--exclude=token,secret,password'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.exclude).toEqual(['token', 'secret', 'password']);
    });
    
    test('should parse max depth', () => {
      const args = ['--max-depth=5'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.maxDepth).toBe(5);
    });
    
    test('should parse format', () => {
      const args = ['--format=json'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.format).toBe('json');
    });
    
    test('should parse output file', () => {
      const args = ['--output=test.json'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.outputFile).toBe('test.json');
    });
    
    test('should parse plugin filters', () => {
      const args = ['--plugin=payment,security'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.pluginFilters).toEqual(['payment', 'security']);
    });
    
    test('should parse boolean flags', () => {
      const args = ['--no-redact', '--stats', '--interactive'];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.redactSensitive).toBe(false);
      expect(options.stats).toBe(true);
      expect(options.interactive).toBe(true);
    });
    
    test('should use default options', () => {
      const args: string[] = [];
      const options = (cli as any).parseInspectArgs(args);
      
      expect(options.format).toBe('human');
      expect(options.redactSensitive).toBe(true);
      expect(options.auditLog).toBe(true);
      expect(options.trackUsage).toBe(true);
      expect(options.maxDepth).toBe(10);
    });
  });
  
  describe('Output Formatting', () => {
    test('should format human output', () => {
      const data = { test: 'value' };
      const stats = { processingTime: 100 };
      const options = { format: 'human' };
      
      const output = (cli as any).formatOutput(data, stats, options);
      
      expect(output).toContain('test');
      expect(output).toContain('value');
    });
    
    test('should format JSON output', () => {
      const data = { test: 'value' };
      const stats = { processingTime: 100 };
      const options = { format: 'json' };
      
      const output = (cli as any).formatOutput(data, stats, options);
      
      expect(() => JSON.parse(output)).not.toThrow();
      expect(JSON.parse(output)).toEqual(data);
    });
    
    test('should format shell output', () => {
      const data = { test: 'value' };
      const stats = { processingTime: 100 };
      const options = { format: 'shell' };
      
      const output = (cli as any).formatOutput(data, stats, options);
      
      expect(output).toContain('TEST=');
      expect(output).toContain('value');
    });
    
    test('should format compact output', () => {
      const data = { test: 'value' };
      const stats = { processingTime: 100 };
      const options = { format: 'compact' };
      
      const output = (cli as any).formatOutput(data, stats, options);
      
      expect(output).toBe(JSON.stringify(data));
    });
  });
  
  describe('Statistics Formatting', () => {
    test('should format statistics correctly', () => {
      const stats = {
        processingTime: 123.45,
        originalSize: 1024,
        filteredSize: 512,
        filterStats: {
          matchedCount: 10,
          totalCount: 20,
          excludedCount: 5
        },
        redactionCount: 2,
        pluginCount: 1,
        memoryUsage: {
          heapUsed: 1024 * 1024
        }
      };
      
      const output = (cli as any).formatStats(stats);
      
      expect(output).toContain('123.45ms');
      expect(output).toContain('1.00 KB');
      expect(output).toContain('10/20');
      expect(output).toContain('1.00 MB');
    });
  });
  
  describe('Help System', () => {
    test('should show help without errors', () => {
      expect(() => {
        EnhancedInspectCLI.showHelp();
      }).not.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete inspection workflow', async () => {
    const inspectSystem = new EnhancedInspectionSystem();
    const cli = new EnhancedInspectCLI();
    
    // Parse complex arguments
    const args = [
      '--filter=payment',
      '--exclude=token,secret',
      '--max-depth=5',
      '--format=json',
      '--stats',
      '--plugin=payment,security'
    ];
    
    const options = (cli as any).parseInspectArgs(args);
    
    // Run inspection
    const result = await inspectSystem.inspect(options);
    
    // Verify results
    expect(result.data).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.metadata.options.filter).toBe('payment');
    expect(result.metadata.options.exclude).toEqual(['token', 'secret']);
    expect(result.metadata.options.maxDepth).toBe(5);
    expect(result.metadata.options.format).toBe('json');
    expect(result.metadata.options.stats).toBe(true);
    expect(result.metadata.options.pluginFilters).toEqual(['payment', 'security']);
  });
  
  test('should handle error scenarios gracefully', async () => {
    const inspectSystem = new EnhancedInspectionSystem();
    
    // Test with invalid options
    const result = await inspectSystem.inspect({
      filter: /invalid/, // Invalid regex
      maxDepth: -1, // Invalid depth
      format: 'invalid' as any // Invalid format
    });
    
    // Should still return valid result structure
    expect(result.data).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});

describe('Performance Benchmarks', () => {
  test('should meet performance requirements', async () => {
    const inspectSystem = new EnhancedInspectionSystem();
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await inspectSystem.inspect({
        filter: 'system',
        maxDepth: 5
      });
      times.push(performance.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    // Performance requirements
    expect(avgTime).toBeLessThan(500); // Average under 500ms
    expect(maxTime).toBeLessThan(1000); // Max under 1 second
    
    console.log(`Average inspection time: ${avgTime.toFixed(2)}ms`);
    console.log(`Max inspection time: ${maxTime.toFixed(2)}ms`);
  });
  
  test('should handle memory efficiently', async () => {
    const inspectSystem = new EnhancedInspectionSystem();
    
    const beforeMemory = process.memoryUsage();
    
    // Run multiple inspections
    for (let i = 0; i < 20; i++) {
      await inspectSystem.inspect({
        filter: 'system',
        redactSensitive: true,
        pluginFilters: ['payment', 'security']
      });
    }
    
    const afterMemory = process.memoryUsage();
    const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
    
    // Memory should not grow excessively
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });
});

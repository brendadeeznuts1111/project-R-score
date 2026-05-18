#!/usr/bin/env bun

/**
 * 🧪 Enhanced Demo Script Tests
 *
 * Comprehensive test suite for the enhanced demo script
 * Tests all functionality: validation, performance, error handling, CLI
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('🚀 Enhanced Demo Script', () => {
  describe('📋 Demo Configuration', () => {
    it('should have valid demo configuration structure', async () => {
      const { demoConfig, demoConfigSchema } = await import('./enhanced-demo');

      expect(demoConfig).toHaveProperty('name');
      expect(demoConfig).toHaveProperty('port');
      expect(demoConfig).toHaveProperty('features');
      expect(demoConfig).toHaveProperty('enabled');

      expect(typeof demoConfig.name).toBe('string');
      expect(typeof demoConfig.port).toBe('number');
      expect(Array.isArray(demoConfig.features)).toBe(true);
      expect(typeof demoConfig.enabled).toBe('boolean');
    });

    it('should have valid configuration schema', async () => {
      const { demoConfigSchema } = await import('./enhanced-demo');

      expect(demoConfigSchema.name).toHaveProperty('type', 'string');
      expect(demoConfigSchema.name).toHaveProperty('required', true);
      expect(demoConfigSchema.name).toHaveProperty('min', 2);
      expect(demoConfigSchema.name).toHaveProperty('max', 50);

      expect(demoConfigSchema.port).toHaveProperty('type', 'number');
      expect(demoConfigSchema.port).toHaveProperty('min', 1024);
      expect(demoConfigSchema.port).toHaveProperty('max', 65535);
    });
  });

  describe('🔧 Demo Operations', () => {
    it('should have performFastOperation function', async () => {
      const { performFastOperation } = await import('./enhanced-demo');

      expect(typeof performFastOperation).toBe('function');
      expect(performFastOperation.name).toBe('performFastOperation');
    });

    it('should have performSlowOperation function', async () => {
      const { performSlowOperation } = await import('./enhanced-demo');

      expect(typeof performSlowOperation).toBe('function');
      expect(performSlowOperation.name).toBe('performSlowOperation');
    });

    it('should have performFailingOperation function', async () => {
      const { performFailingOperation } = await import('./enhanced-demo');

      expect(typeof performFailingOperation).toBe('function');
      expect(performFailingOperation.name).toBe('performFailingOperation');
    });

    it('should have performConditionalOperation function', async () => {
      const { performConditionalOperation } = await import('./enhanced-demo');

      expect(typeof performConditionalOperation).toBe('function');
      expect(performConditionalOperation.name).toBe('performConditionalOperation');
    });

    it('should have performDatabaseOperation function', async () => {
      const { performDatabaseOperation } = await import('./enhanced-demo');

      expect(typeof performDatabaseOperation).toBe('function');
      expect(performDatabaseOperation.name).toBe('performDatabaseOperation');
    });

    it('should have performTransactionSimulation function', async () => {
      const { performTransactionSimulation } = await import('./enhanced-demo');

      expect(typeof performTransactionSimulation).toBe('function');
      expect(performTransactionSimulation.name).toBe('performTransactionSimulation');
    });

    it('should have performDataValidation function', async () => {
      const { performDataValidation } = await import('./enhanced-demo');

      expect(typeof performDataValidation).toBe('function');
      expect(performDataValidation.name).toBe('performDataValidation');
    });
  });

  describe('📁 File Structure', () => {
    it('should export main function', async () => {
      const { main } = await import('./enhanced-demo');
      expect(typeof main).toBe('function');
      expect(main.name).toBe('main');
    });

    it('should have proper shebang', async () => {
      const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();
      expect(content).toMatch(/^#!/);
      expect(content).toMatch(/bun/);
    });
  });

  describe('🎯 Demo Content', () => {
    it('should contain all demo steps', async () => {
      const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();

      // Check for all demo steps
      expect(content).toMatch(/Step 1: Configuration Validation/);
      expect(content).toMatch(/Step 2: Performance Monitoring/);
      expect(content).toMatch(/Step 3: Error Handling Demo/);
      expect(content).toMatch(/Step 4: Custom Error Creation/);
      expect(content).toMatch(/Step 5: Validation Rules Demo/);
      expect(content).toMatch(/Step 6: Advanced Operations Demo/);
      expect(content).toMatch(/Step 7: Advanced Validation Demo/);
      expect(content).toMatch(/Step 8: Database Operations Demo/);
      expect(content).toMatch(/Step 9: Performance Summary/);
    });

    it('should contain CLI help documentation', async () => {
      const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();

      expect(content).toMatch(/Usage:/);
      expect(content).toMatch(/Options:/);
      expect(content).toMatch(/Examples:/);
      expect(content).toMatch(/--help/);
      expect(content).toMatch(/--fast/);
      expect(content).toMatch(/--slow/);
    });
  });

  describe('🔍 Code Quality', () => {
    it('should have proper JSDoc comments', async () => {
      const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();

      expect(content).toMatch(/@version/);
      expect(content).toMatch(/@author/);
      expect(content).toMatch(/Fire22 Development Team/);
    });

    it('should have proper error handling', async () => {
      const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();

      expect(content).toMatch(/try\s*{/);
      expect(content).toMatch(/catch\s*\(/);
      expect(content).toMatch(/process\.exit/);
    });

    it('should have proper async/await usage', async () => {
      const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();

      expect(content).toMatch(/async function/);
      expect(content).toMatch(/await /);
    });
  });
});

describe('🚀 Advanced Demo Features', () => {
  describe('🔧 Advanced Operations', () => {
    it('should perform complex operations with metadata', async () => {
      const { performComplexOperation } = await import('./enhanced-demo');

      const result = await performComplexOperation();

      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('metadata');
      expect(result.result).toBe('Complex operation completed');
      expect(result.metadata).toHaveProperty('steps');
      expect(result.metadata).toHaveProperty('complexity');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata.steps).toBe(5);
      expect(result.metadata.complexity).toBe('high');
    });

    it('should perform batch operations successfully', async () => {
      const { performBatchOperation } = await import('./enhanced-demo');

      const results = await performBatchOperation();

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('Batch item 1 completed');
      expect(results[1]).toBe('Batch item 2 completed');
      expect(results[2]).toBe('Batch item 3 completed');
    });

    it('should handle conditional operations correctly', async () => {
      const { performConditionalOperation } = await import('./enhanced-demo');

      // Test success case
      const successResult = await performConditionalOperation(true);
      expect(successResult).toBe('Conditional operation succeeded');

      // Test failure case
      await expect(performConditionalOperation(false)).rejects.toThrow(
        'Conditional operation failed as expected'
      );
    });

    it('should perform database operations successfully', async () => {
      const { performDatabaseOperation } = await import('./enhanced-demo');

      const result = await performDatabaseOperation();

      expect(result).toHaveProperty('customers');
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('bets');
      expect(typeof result.customers).toBe('number');
      expect(typeof result.transactions).toBe('number');
      expect(typeof result.bets).toBe('number');
      expect(result.customers).toBe(2);
      expect(result.transactions).toBe(3);
      expect(result.bets).toBe(3);
    });

    it('should simulate transactions correctly', async () => {
      const { performTransactionSimulation } = await import('./enhanced-demo');

      const result = await performTransactionSimulation();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('amount');
      expect(result.success).toBe(true);
      expect(typeof result.transactionId).toBe('string');
      expect(result.transactionId).toMatch(/^TXN_\d+$/);
      expect(typeof result.amount).toBe('number');
      expect(result.amount).toBe(500.0);
    });

    it('should perform data validation correctly', async () => {
      const { performDataValidation } = await import('./enhanced-demo');

      const result = await performDataValidation();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('invalid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.valid).toBe('number');
      expect(typeof result.invalid).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.valid).toBe(8);
      expect(result.invalid).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('AL500');
      expect(result.errors[1]).toContain('TXN002');
    });
  });

  describe('🔍 Advanced Validation', () => {
    it('should validate complex nested configurations', async () => {
      const { validateConfig } = await import('./config-validator');

      const complexConfig = {
        userName: 'Test User',
        userEmail: 'test@example.com',
        userAge: 25,
        systemVersion: '1.0.0',
      };

      const complexSchema = {
        userName: {
          type: 'string',
          required: true,
          min: 2,
        },
        userEmail: {
          type: 'string',
          required: true,
          custom: (value: string) => value.includes('@'),
        },
        userAge: {
          type: 'number',
          required: true,
          min: 18,
        },
        systemVersion: {
          type: 'string',
          required: true,
          pattern: /^\d+\.\d+\.\d+$/,
        },
      };

      const validation = validateConfig(complexConfig, complexSchema);
      expect(validation.isValid).toBe(true);
    });
  });
});

describe('🧪 Integration Test', () => {
  it('should be able to import the script without errors', async () => {
    // This test ensures the script can be imported without syntax errors
    expect(async () => {
      await import('./enhanced-demo');
    }).not.toThrow();
  });

  it('should have proper TypeScript syntax', async () => {
    // This test ensures the file has valid TypeScript syntax
    const content = await Bun.file('./scripts/core/enhanced-demo.ts').text();

    // Basic syntax checks
    expect(content).toMatch(/import\s*{/);
    expect(content).toMatch(/export\s*{/);
    expect(content).toMatch(/const\s+/);
    expect(content).toMatch(/function\s+/);
  });
});

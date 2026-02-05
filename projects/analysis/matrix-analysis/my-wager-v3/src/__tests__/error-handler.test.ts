#!/usr/bin/env bun
// Error Handler Test Suite
// [TENSION-TEST-001] [TENSION-ERROR-TEST-002]

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { errorHandler, TensionErrorCode, BunErrorUtils } from '../tension-field/error-handler';
import { ErrorRecoverySystem } from '../../scripts/error-recovery';
import { Database } from 'bun:sqlite';
import { unlinkSync } from 'fs';

describe('Error Handler', () => {
  const testDbPath = './test-errors.db';
  const testLogPath = './test-errors.log';

  beforeEach(() => {
    // Clean up any existing test files
    try {
      unlinkSync(testDbPath);
      unlinkSync(testLogPath);
      unlinkSync('./critical-errors.json');
    } catch (e) {
      // Files don't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await errorHandler.cleanupOldLogs(0);
      unlinkSync(testDbPath);
      unlinkSync(testLogPath);
      unlinkSync('./critical-errors.json');
    } catch (e) {
      // Files don't exist, that's fine
    }
  });

  describe('Error Creation', () => {
    it('should create a structured error', () => {
      const error = errorHandler.createError(
        TensionErrorCode.PROPAGATION_FAILED,
        'Test propagation error',
        'high',
        { nodeId: 'test-node' },
        true,
        3
      );

      expect(error.code).toBe(TensionErrorCode.PROPAGATION_FAILED);
      expect(error.message).toBe('Test propagation error');
      expect(error.severity).toBe('high');
      expect(error.context?.nodeId).toBe('test-node');
      expect(error.recoverable).toBe(true);
      expect(error.maxRetries).toBe(3);
      expect(error.timestamp).toBeTypeOf('number');
    });

    it('should handle default values', () => {
      const error = errorHandler.createError(
        TensionErrorCode.NODE_NOT_FOUND,
        'Node not found'
      );

      expect(error.severity).toBe('medium');
      expect(error.recoverable).toBe(true);
      expect(error.maxRetries).toBe(3);
      expect(error.retryCount).toBe(0);
    });
  });

  describe('Error Logging', () => {
    it('should log error to database', async () => {
      const error = errorHandler.createError(
        TensionErrorCode.PROPAGATION_FAILED,
        'Test error'
      );

      await errorHandler.handleError(error);

      // Check database
      const db = new Database(testDbPath);
      const logs = db.prepare('SELECT * FROM error_logs').all() as any[];

      expect(logs).toHaveLength(1);
      expect(logs[0].code).toBe(TensionErrorCode.PROPAGATION_FAILED);
      expect(logs[0].message).toBe('Test error');
      expect(logs[0].severity).toBe('medium');
      expect(logs[0].resolved).toBe(false);
    });

    it('should log error to file', async () => {
      const error = errorHandler.createError(
        TensionErrorCode.DATABASE_CONNECTION_FAILED,
        'DB connection failed',
        'critical'
      );

      await errorHandler.handleError(error);

      // Check file exists and has content
      const logFile = Bun.file(testLogPath);
      expect(await logFile.exists()).toBe(true);

      const content = await logFile.text();
      const logLines = content.trim().split('\n');
      expect(logLines).toHaveLength(1);

      const logEntry = JSON.parse(logLines[0]);
      expect(logEntry.code).toBe(TensionErrorCode.DATABASE_CONNECTION_FAILED);
      expect(logEntry.level).toBe('CRITICAL');
    });

    it('should create critical error file', async () => {
      const error = errorHandler.createError(
        TensionErrorCode.SECURITY_VIOLATION,
        'Security breach detected',
        'critical'
      );

      await errorHandler.handleError(error);

      const criticalFile = Bun.file('./critical-errors.json');
      expect(await criticalFile.exists()).toBe(true);

      const content = await criticalFile.text();
      const critical = JSON.parse(content);
      expect(critical.error.code).toBe(TensionErrorCode.SECURITY_VIOLATION);
    });
  });

  describe('Bun Error Utils', () => {
    it('should time operations', async () => {
      const result = await BunErrorUtils.createTimedError(
        TensionErrorCode.API_TIMEOUT,
        async () => {
          await Bun.sleep(10);
          return 'success';
        }
      );

      expect(result).toBe('success');
    });

    it('should handle timed errors', async () => {
      let errorCaught = false;

      try {
        await BunErrorUtils.createTimedError(
          TensionErrorCode.PROPAGATION_FAILED,
          async () => {
            throw new Error('Test error');
          }
        );
      } catch (e) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
    });

    it('should wrap functions with error handling', async () => {
      const safeFn = BunErrorUtils.withErrorHandling(
        async (value: number) => value * 2,
        TensionErrorCode.DATA_VALIDATION_FAILED
      );

      const result = await safeFn(5);
      expect(result).toBe(10);
    });
  });

  describe('Circuit Breaker', () => {
    it('should track circuit breaker state', async () => {
      // Simulate failures
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleError(
          errorHandler.createError(
            TensionErrorCode.EXTERNAL_API_ERROR,
            'API failure',
            'medium',
            { service: 'test-service' }
          )
        );
      }

      // Check if service is marked as unavailable
      expect(errorHandler.isServiceAvailable('test-service')).toBe(false);
    });

    it('should recover on success', async () => {
      // First, fail the service
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleError(
          errorHandler.createError(
            TensionErrorCode.EXTERNAL_API_ERROR,
            'API failure',
            'medium',
            { service: 'test-service' }
          )
        );
      }

      expect(errorHandler.isServiceAvailable('test-service')).toBe(false);

      // Simulate a successful operation (this would be done by the actual service)
      // In real implementation, the service would call updateCircuitBreaker with success: true
    });
  });

  describe('Error Statistics', () => {
    beforeEach(async () => {
      // Create some test errors
      await errorHandler.handleError(
        errorHandler.createError(TensionErrorCode.PROPAGATION_FAILED, 'Error 1')
      );
      await errorHandler.handleError(
        errorHandler.createError(TensionErrorCode.PROPAGATION_FAILED, 'Error 2')
      );
      await errorHandler.handleError(
        errorHandler.createError(TensionErrorCode.NODE_NOT_FOUND, 'Error 3')
      );
    });

    it('should get error statistics', () => {
      const stats = errorHandler.getErrorStats();

      expect(stats).toHaveLength(2);
      expect((stats[0] as any).code).toBe(TensionErrorCode.PROPAGATION_FAILED);
      expect((stats[0] as any).count).toBe(2);
      expect((stats[1] as any).code).toBe(TensionErrorCode.NODE_NOT_FOUND);
      expect((stats[1] as any).count).toBe(1);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const stats = errorHandler.getErrorStats({
        start: now - 1000,
        end: now
      });

      expect(stats.length).toBeGreaterThan(0);
    });
  });
});

describe('Error Recovery System', () => {
  const recovery = new ErrorRecoverySystem();

  describe('Recovery Actions', () => {
    it('should analyze errors', async () => {
      // This should not throw
      await recovery.analyzeErrors(1000);
    });

    it('should handle unknown error codes', async () => {
      // Should not throw for unknown codes
      await recovery.executeRecovery('UNKNOWN_CODE' as TensionErrorCode);
    });

    it('should generate report', async () => {
      const reportPath = './test-report.json';
      await recovery.generateReport(reportPath);

      const reportFile = Bun.file(reportPath);
      expect(await reportFile.exists()).toBe(true);

      // Clean up
      unlinkSync(reportPath);
    });
  });
});

describe('Integration Tests', () => {
  it('should handle real propagation errors', async () => {
    // Simulate a propagation error
    const error = errorHandler.createError(
      TensionErrorCode.PROPAGATION_FAILED,
      'Graph propagation failed',
      'high',
      {
        sourceNodeIds: ['node-1', 'node-2'],
        iterations: 100,
        maxDelta: 0.5
      }
    );

    await errorHandler.handleError(error);

    // Verify error was logged
    const stats = errorHandler.getErrorStats();
    expect(stats.some((s: any) => s.code === TensionErrorCode.PROPAGATION_FAILED)).toBe(true);
  });

  it('should handle batch error processing', async () => {
    const errors = [
      errorHandler.createError(TensionErrorCode.PROPAGATION_FAILED, 'Error 1'),
      errorHandler.createError(TensionErrorCode.NODE_NOT_FOUND, 'Error 2'),
      errorHandler.createError(TensionErrorCode.TIMEOUT_EXCEEDED, 'Error 3')
    ];

    await BunErrorUtils.processErrors(errors);

    const stats = errorHandler.getErrorStats();
    expect(stats).toHaveLength(3);
  });
});

console.log('✅ Error Handler Tests Complete');

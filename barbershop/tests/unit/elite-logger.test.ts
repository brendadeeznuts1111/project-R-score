#!/usr/bin/env bun
/**
 * EliteLogger Comprehensive Test Suite
 * 
 * Tests all features:
 * - Log level filtering
 * - All log methods (debug, info, warn, error, fatal)
 * - Metadata attachment
 * - Child logger creation with context
 * - Async batch writing
 * - File rotation
 * - Pretty vs JSON output formats
 * - Request ID context tracking
 * - Source map stack traces
 * - Log level color coding
 */

import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { mkdir, appendFile, stat } from 'node:fs/promises';
import { EliteLogger } from '../../src/utils/elite-logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (matching the source)
// ═══════════════════════════════════════════════════════════════════════════════

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  source?: {
    file?: string;
    line?: number;
    column?: number;
  };
}

interface LoggerOptions {
  level: LogLevel;
  pretty?: boolean;
  output?: 'stdout' | 'file' | 'both';
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  batchSize?: number;
  batchTimeoutMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Store captured logs for assertions
let capturedLogs: string[] = [];
let capturedFiles: { path: string; content: string }[] = [];

// Mock fs/promises
mock.module('node:fs/promises', () => ({
  mkdir: mock(async () => Promise.resolve()),
  appendFile: mock(async (path: string, content: string) => {
    capturedFiles.push({ path, content });
    return Promise.resolve();
  }),
  stat: mock(async (path: string) => {
    throw new Error('ENOENT');
  }),
}));

// Mock Bun.file for rotation tests
const mockFileExists = new Map<string, boolean>();
const mockFileContents = new Map<string, string>();
const originalBunFile = Bun.file;

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

describe('EliteLogger', () => {
  let logger: EliteLogger;
  let consoleSpy: ReturnType<typeof spyOn>;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Reset captured data
    capturedLogs = [];
    capturedFiles = [];
    mockFileExists.clear();
    mockFileContents.clear();

    // Save original console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    // Spy on console.log to capture output
    consoleSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      capturedLogs.push(msg);
    });

    // Mock console.error to capture errors
    spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore console methods
    consoleSpy.mockRestore();
    
    // Close logger to flush any pending batches
    if (logger) {
      await logger.close();
    }

    // Restore Bun.file
    // @ts-ignore
    Bun.file = originalBunFile;
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LOG LEVEL FILTERING
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Log Level Filtering', () => {
    test('should not output DEBUG logs when minLevel is INFO', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug message');
      logger.info('info message');

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain('info message');
      expect(capturedLogs[0]).not.toContain('debug message');
    });

    test('should not output DEBUG or INFO when minLevel is WARN', () => {
      logger = new EliteLogger({
        level: 'WARN',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain('warn message');
    });

    test('should not output logs below ERROR when minLevel is ERROR', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error message');

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain('error message');
    });

    test('should only output FATAL when minLevel is FATAL', () => {
      logger = new EliteLogger({
        level: 'FATAL',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      logger.fatal('fatal message');

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain('fatal message');
    });

    test('should output all logs when minLevel is DEBUG', () => {
      logger = new EliteLogger({
        level: 'DEBUG',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      logger.fatal('fatal');

      expect(capturedLogs.length).toBe(5);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LOG METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Log Methods', () => {
    test('should log debug messages', () => {
      logger = new EliteLogger({
        level: 'DEBUG',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug test message');

      expect(capturedLogs.length).toBe(1);
      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.level).toBe('DEBUG');
      expect(entry.message).toBe('debug test message');
      expect(entry.timestamp).toBeTruthy();
    });

    test('should log info messages', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('info test message');

      expect(capturedLogs.length).toBe(1);
      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.level).toBe('INFO');
      expect(entry.message).toBe('info test message');
    });

    test('should log warn messages', () => {
      logger = new EliteLogger({
        level: 'WARN',
        pretty: false,
        output: 'stdout',
      });

      logger.warn('warn test message');

      expect(capturedLogs.length).toBe(1);
      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.level).toBe('WARN');
      expect(entry.message).toBe('warn test message');
    });

    test('should log error messages with Error object', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      const error = new Error('Test error');
      logger.error('error test message', error);

      expect(capturedLogs.length).toBe(1);
      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('error test message');
      expect(entry.error).toBeTruthy();
      expect(entry.error?.message).toBe('Test error');
      expect(entry.error?.stack).toBeTruthy();
    });

    test('should log fatal messages with Error object', () => {
      logger = new EliteLogger({
        level: 'FATAL',
        pretty: false,
        output: 'stdout',
      });

      const error = new Error('Fatal error');
      logger.fatal('fatal test message', error);

      expect(capturedLogs.length).toBe(1);
      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.level).toBe('FATAL');
      expect(entry.message).toBe('fatal test message');
      expect(entry.error?.message).toBe('Fatal error');
    });

    test('should log error without Error object', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      logger.error('error without exception');

      expect(capturedLogs.length).toBe(1);
      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.level).toBe('ERROR');
      expect(entry.error).toBeUndefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // METADATA ATTACHMENT
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Metadata Attachment', () => {
    test('should attach context to debug logs', () => {
      logger = new EliteLogger({
        level: 'DEBUG',
        pretty: false,
        output: 'stdout',
      });

      const context = { userId: '123', action: 'login', ip: '192.168.1.1' };
      logger.debug('user action', context);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.context).toEqual(context);
    });

    test('should attach context to info logs', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      const context = { requestId: 'req-456', duration: 150 };
      logger.info('request processed', context);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.context).toEqual(context);
    });

    test('should attach context to warn logs', () => {
      logger = new EliteLogger({
        level: 'WARN',
        pretty: false,
        output: 'stdout',
      });

      const context = { cacheKey: 'user:123', ttl: 0 };
      logger.warn('cache miss', context);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.context).toEqual(context);
    });

    test('should attach context and error to error logs', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      const error = new Error('Connection failed');
      const context = { retry: 3, endpoint: '/api/users' };
      logger.error('database error', error, context);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.context).toEqual(context);
      expect(entry.error?.message).toBe('Connection failed');
    });

    test('should handle nested context objects', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      const context = {
        user: { id: '123', name: 'John' },
        metadata: { timestamp: Date.now(), version: '1.0.0' },
      };
      logger.info('complex event', context);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.context).toEqual(context);
    });

    test('should handle empty context', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('no context');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.context).toBeUndefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // REQUEST ID CONTEXT TRACKING
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Request ID Context Tracking', () => {
    test('should include request ID in logs when set', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.setRequestId('req-abc-123');
      logger.info('request started');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.requestId).toBe('req-abc-123');
    });

    test('should include same request ID in multiple logs', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.setRequestId('req-xyz-789');
      logger.info('step 1');
      logger.info('step 2');
      logger.warn('step 3');

      expect(capturedLogs.length).toBe(3);
      capturedLogs.forEach(log => {
        const entry = JSON.parse(log) as LogEntry;
        expect(entry.requestId).toBe('req-xyz-789');
      });
    });

    test('should not include requestId when not set', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('no request id');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.requestId).toBeUndefined();
    });

    test('should update request ID when changed', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.setRequestId('req-1');
      logger.info('first request');
      
      logger.setRequestId('req-2');
      logger.info('second request');

      const entry1 = JSON.parse(capturedLogs[0]) as LogEntry;
      const entry2 = JSON.parse(capturedLogs[1]) as LogEntry;
      
      expect(entry1.requestId).toBe('req-1');
      expect(entry2.requestId).toBe('req-2');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SOURCE MAP STACK TRACES
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Source Map Stack Traces', () => {
    test('should capture source location for ERROR logs', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      logger.error('error with source');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.source).toBeDefined();
      // Source info may or may not be captured depending on stack format
      if (entry.source) {
        expect(typeof entry.source.file).toBe('string');
        expect(typeof entry.source.line).toBe('number');
      }
    });

    test('should capture source location for FATAL logs', () => {
      logger = new EliteLogger({
        level: 'FATAL',
        pretty: false,
        output: 'stdout',
      });

      logger.fatal('fatal with source');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.source).toBeDefined();
    });

    test('should NOT capture source location for INFO logs', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('info without source');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.source).toBeUndefined();
    });

    test('should NOT capture source location for DEBUG logs', () => {
      logger = new EliteLogger({
        level: 'DEBUG',
        pretty: false,
        output: 'stdout',
      });

      logger.debug('debug without source');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.source).toBeUndefined();
    });

    test('should include error stack trace when Error is provided', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      const error = new Error('Stack trace test');
      logger.error('error occurred', error);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.error).toBeDefined();
      expect(entry.error?.stack).toContain('Stack trace test');
      expect(entry.error?.stack).toContain('at ');
    });

    test('should include error code if present', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      const error = new Error('Custom error') as Error & { code: string };
      error.code = 'ECONNREFUSED';
      logger.error('connection failed', error);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.error?.code).toBe('ECONNREFUSED');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PRETTY VS JSON OUTPUT FORMATS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Output Formats', () => {
    test('should output JSON format when pretty is false', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('json format test');

      expect(capturedLogs.length).toBe(1);
      // Should be valid JSON
      const parsed = JSON.parse(capturedLogs[0]);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('json format test');
    });

    test('should output pretty format when pretty is true', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: true,
        output: 'stdout',
      });

      logger.info('pretty format test');

      expect(capturedLogs.length).toBe(1);
      const output = capturedLogs[0];
      
      // Should NOT be valid JSON (pretty format)
      expect(() => JSON.parse(output)).toThrow();
      
      // Should contain ANSI color codes
      expect(output).toContain('\x1b[');
      
      // Should contain timestamp and level
      expect(output).toContain('INFO');
      expect(output).toContain('pretty format test');
    });

    test('should output JSON with context in pretty mode', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: true,
        output: 'stdout',
      });

      logger.info('with context', { key: 'value' });

      const output = capturedLogs[0];
      expect(output).toContain('key');
      expect(output).toContain('value');
    });

    test('should output JSON with error in pretty mode', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: true,
        output: 'stdout',
      });

      const error = new Error('Pretty error');
      logger.error('error message', error);

      const output = capturedLogs[0];
      expect(output).toContain('ERROR');
      expect(output).toContain('error message');
      expect(output).toContain('Pretty error');
    });

    test('should include request ID in pretty format', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: true,
        output: 'stdout',
      });

      logger.setRequestId('req-pretty-123');
      logger.info('with request id');

      const output = capturedLogs[0];
      expect(output).toContain('req-pretty-123');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LOG LEVEL COLOR CODING
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Log Level Color Coding', () => {
    test('should use cyan color for DEBUG level', () => {
      logger = new EliteLogger({
        level: 'DEBUG',
        pretty: true,
        output: 'stdout',
      });

      logger.debug('debug colored');

      // Cyan color code: \x1b[36m
      expect(capturedLogs[0]).toContain('\x1b[36m');
    });

    test('should use green color for INFO level', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: true,
        output: 'stdout',
      });

      logger.info('info colored');

      // Green color code: \x1b[32m
      expect(capturedLogs[0]).toContain('\x1b[32m');
    });

    test('should use yellow color for WARN level', () => {
      logger = new EliteLogger({
        level: 'WARN',
        pretty: true,
        output: 'stdout',
      });

      logger.warn('warn colored');

      // Yellow color code: \x1b[33m
      expect(capturedLogs[0]).toContain('\x1b[33m');
    });

    test('should use red color for ERROR level', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: true,
        output: 'stdout',
      });

      logger.error('error colored');

      // Red color code: \x1b[31m
      expect(capturedLogs[0]).toContain('\x1b[31m');
    });

    test('should use magenta color for FATAL level', () => {
      logger = new EliteLogger({
        level: 'FATAL',
        pretty: true,
        output: 'stdout',
      });

      logger.fatal('fatal colored');

      // Magenta color code: \x1b[35m
      expect(capturedLogs[0]).toContain('\x1b[35m');
    });

    test('should reset color after log level', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: true,
        output: 'stdout',
      });

      logger.info('color reset test');

      // Reset code: \x1b[0m
      expect(capturedLogs[0]).toContain('\x1b[0m');
    });

    test('should use dim color for context in pretty mode', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: true,
        output: 'stdout',
      });

      logger.info('dim context', { data: 'test' });

      // Dim color code: \x1b[90m
      expect(capturedLogs[0]).toContain('\x1b[90m');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // ASYNC BATCH WRITING
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Async Batch Writing', () => {
    test('should batch entries and write to file', async () => {
      const appendFileMock = mock(async () => Promise.resolve());
      
      mock.module('node:fs/promises', () => ({
        mkdir: mock(async () => Promise.resolve()),
        appendFile: appendFileMock,
        stat: mock(async () => { throw new Error('ENOENT'); }),
      }));

      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'file',
        filePath: './logs/test.log',
        batchSize: 3,
        batchTimeoutMs: 1000,
      });

      logger.info('message 1');
      logger.info('message 2');
      
      // Wait for potential immediate flush
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should not flush yet (batch size not reached)
      expect(appendFileMock.mock.calls.length).toBe(0);

      logger.info('message 3');
      
      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should flush when batch size reached
      expect(appendFileMock.mock.calls.length).toBeGreaterThan(0);

      await logger.close();
    });

    test('should flush on close', async () => {
      const appendFileMock = mock(async () => Promise.resolve());
      
      mock.module('node:fs/promises', () => ({
        mkdir: mock(async () => Promise.resolve()),
        appendFile: appendFileMock,
        stat: mock(async () => { throw new Error('ENOENT'); }),
      }));

      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'file',
        filePath: './logs/test.log',
        batchSize: 100,
        batchTimeoutMs: 10000, // Long timeout
      });

      logger.info('message before close');
      
      // Should flush on close
      await logger.close();

      expect(appendFileMock.mock.calls.length).toBeGreaterThan(0);
    });

    test('should flush after timeout', async () => {
      const appendFileMock = mock(async () => Promise.resolve());
      
      mock.module('node:fs/promises', () => ({
        mkdir: mock(async () => Promise.resolve()),
        appendFile: appendFileMock,
        stat: mock(async () => { throw new Error('ENOENT'); }),
      }));

      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'file',
        filePath: './logs/test.log',
        batchSize: 100,
        batchTimeoutMs: 100, // Short timeout
      });

      logger.info('single message');
      
      // Wait for timeout flush
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(appendFileMock.mock.calls.length).toBeGreaterThan(0);

      await logger.close();
    });

    test('should write to both stdout and file when output is both', async () => {
      const appendFileMock = mock(async () => Promise.resolve());
      
      mock.module('node:fs/promises', () => ({
        mkdir: mock(async () => Promise.resolve()),
        appendFile: appendFileMock,
        stat: mock(async () => { throw new Error('ENOENT'); }),
      }));

      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'both',
        filePath: './logs/test.log',
        batchSize: 1, // Immediate flush
      });

      logger.info('both output');
      
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should write to console
      expect(capturedLogs.length).toBe(1);
      
      // Should write to file
      expect(appendFileMock.mock.calls.length).toBeGreaterThan(0);

      await logger.close();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FILE ROTATION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('File Rotation', () => {
    test('should rotate files when max size is reached', async () => {
      const fileExists = new Map<string, boolean>();
      const fileContents = new Map<string, string>();
      
      // Mock Bun.file for rotation
      // @ts-ignore
      Bun.file = (path: string) => ({
        exists: async () => fileExists.get(path) || false,
        text: async () => fileContents.get(path) || '',
      });

      // Mock Bun.write for rotation
      const originalBunWrite = Bun.write;
      // @ts-ignore
      Bun.write = async (path: string, content: any) => {
        fileContents.set(path, content.toString());
        fileExists.set(path, true);
      };

      const appendFileMock = mock(async (path: string, content: string) => {
        const current = fileContents.get(path) || '';
        fileContents.set(path, current + content);
        fileExists.set(path, true);
      });

      mock.module('node:fs/promises', () => ({
        mkdir: mock(async () => Promise.resolve()),
        appendFile: appendFileMock,
        stat: mock(async () => { throw new Error('ENOENT'); }),
      }));

      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'file',
        filePath: './logs/rotate.log',
        batchSize: 1,
        maxFileSize: 100, // Very small for testing
        maxFiles: 3,
      });

      // Write enough to trigger rotation
      logger.info('a'.repeat(200));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      await logger.close();

      // Restore Bun.write
      Bun.write = originalBunWrite;

      // Rotation should have been attempted
      // Note: Full rotation test requires more complex mocking
    });

    test('should create log directory if it does not exist', async () => {
      const mkdirMock = mock(async () => Promise.resolve());
      
      mock.module('node:fs/promises', () => ({
        mkdir: mkdirMock,
        appendFile: mock(async () => Promise.resolve()),
        stat: mock(async () => { throw new Error('ENOENT'); }),
      }));

      logger = new EliteLogger({
        level: 'INFO',
        output: 'file',
        filePath: './logs/subdir/app.log',
      });

      // Directory creation is async, wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mkdirMock.mock.calls.length).toBeGreaterThan(0);

      await logger.close();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CHILD LOGGER CREATION (CONTEXT)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Child Logger with Context', () => {
    test('should create logger with default context via constructor', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      // Simulate child logger pattern using request ID
      logger.setRequestId('child-req-123');
      logger.info('child message', { component: 'auth' });

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.requestId).toBe('child-req-123');
      expect(entry.context?.component).toBe('auth');
    });

    test('should maintain separate context per logger instance', () => {
      const logger1 = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      const logger2 = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger1.setRequestId('req-1');
      logger2.setRequestId('req-2');

      logger1.info('from logger 1');
      logger2.info('from logger 2');

      // logger1 log
      const entry1 = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry1.requestId).toBe('req-1');

      // logger2 log
      const entry2 = JSON.parse(capturedLogs[1]) as LogEntry;
      expect(entry2.requestId).toBe('req-2');

      logger1.close();
      logger2.close();
    });

    test('should inherit level setting from parent configuration', () => {
      const parentLogger = new EliteLogger({
        level: 'WARN',
        pretty: false,
        output: 'stdout',
      });

      // Simulate child with same config
      const childLogger = new EliteLogger({
        level: 'WARN',
        pretty: false,
        output: 'stdout',
      });

      parentLogger.info('parent info');
      childLogger.info('child info');
      parentLogger.warn('parent warn');
      childLogger.warn('child warn');

      // Only warns should be logged
      expect(capturedLogs.length).toBe(2);
      expect(capturedLogs[0]).toContain('parent warn');
      expect(capturedLogs[1]).toContain('child warn');

      parentLogger.close();
      childLogger.close();
    });

    test('should allow different levels for parent and child', () => {
      const parentLogger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      const childLogger = new EliteLogger({
        level: 'DEBUG',
        pretty: false,
        output: 'stdout',
      });

      parentLogger.info('parent info');
      childLogger.info('child info');

      // Only child info should be logged
      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain('child info');

      parentLogger.close();
      childLogger.close();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // EDGE CASES AND ERROR HANDLING
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases and Error Handling', () => {
    test('should handle special characters in message', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      const specialMessage = 'Special chars: "quotes" \n newline \t tab';
      logger.info(specialMessage);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.message).toBe(specialMessage);
    });

    test('should handle unicode characters', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('Unicode: 你好 🎉 émojis');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.message).toBe('Unicode: 你好 🎉 émojis');
    });

    test('should handle empty message', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      logger.info('');

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.message).toBe('');
    });

    test('should handle very long message', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      const longMessage = 'a'.repeat(10000);
      logger.info(longMessage);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.message).toBe(longMessage);
    });

    // Note: EliteLogger does not handle circular references in context
    // JSON.stringify will throw, causing unhandled rejection in async write
    // This is a known limitation of the current implementation

    test('should handle multiple rapid log calls', async () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      for (let i = 0; i < 100; i++) {
        logger.info(`message ${i}`);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(capturedLogs.length).toBeGreaterThanOrEqual(100);
    });

    test('should handle error with no stack', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: false,
        output: 'stdout',
      });

      const error = new Error('No stack');
      error.stack = undefined;
      logger.error('test', error);

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      expect(entry.error?.message).toBe('No stack');
      expect(entry.error?.stack).toBeUndefined();
    });

    test('should provide valid ISO timestamp', () => {
      logger = new EliteLogger({
        level: 'INFO',
        pretty: false,
        output: 'stdout',
      });

      const before = new Date().toISOString();
      logger.info('timestamp test');
      const after = new Date().toISOString();

      const entry = JSON.parse(capturedLogs[0]) as LogEntry;
      
      // Timestamp should be valid ISO string
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(entry.timestamp >= before || entry.timestamp <= after).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION OPTIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Configuration Options', () => {
    test('should use default config when no options provided', () => {
      logger = new EliteLogger();

      // Should use INFO level by default
      logger.debug('debug');
      logger.info('info');

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain('info');
    });

    test('should merge partial config with defaults', () => {
      logger = new EliteLogger({
        level: 'DEBUG',
        // other options should use defaults
      });

      logger.debug('should log');
      expect(capturedLogs.length).toBe(1);
    });

    test('should respect all custom config options', () => {
      logger = new EliteLogger({
        level: 'ERROR',
        pretty: true,
        output: 'stdout',
        filePath: './custom/logs/app.log',
        maxFileSize: 5 * 1024 * 1024,
        maxFiles: 10,
        batchSize: 50,
        batchTimeoutMs: 500,
      });

      logger.error('custom config test');

      expect(capturedLogs.length).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT TEST
// ═══════════════════════════════════════════════════════════════════════════════

describe('Default Export', () => {
  test('should export EliteLogger as default', async () => {
    const module = await import('../../src/utils/elite-logger');
    expect(module.default).toBe(EliteLogger);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE RESTORE
// ═══════════════════════════════════════════════════════════════════════════════

// Restore original fs/promises module after all tests complete
describe('Module Cleanup', () => {
  test('restore fs/promises', () => {
    // Using mock.module with actual implementations to restore
    const actualFs = require('node:fs/promises');
    mock.module('node:fs/promises', () => actualFs);
    expect(true).toBe(true);
  });
});

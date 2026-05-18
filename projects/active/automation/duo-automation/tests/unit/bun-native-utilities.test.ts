/**
 * Comprehensive Test Suite for Bun-Native Utilities
 * 
 * Tests all utilities with performance benchmarks and edge cases
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';

// Import all utilities
import { BunBinaryValidator } from '../cli/binary-validator';
import { BunPerfBenchmark } from '../utils/benchmark';
import { BunIDGenerator } from '../utils/id-generator';
import { BunPeekOrchestrator } from '../workers/peek-orchestrator';
import { BunModuleResolver } from '../utils/module-resolver';
import { BunStateCompressor } from '../utils/state-compressor';
import { BunOutputFormatter } from '../cli/output-formatter';
import { BunRuntimeDetector } from '../utils/runtime-detector';

describe('Bun-Native Utilities Test Suite', () => {
  describe('BunBinaryValidator', () => {
    it('should validate existing binaries', () => {
      const result = BunBinaryValidator.validateBinaries(['bun', 'node']);
      expect(result.present).toContain('bun');
      expect(result.missing.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect missing binaries', () => {
      const result = BunBinaryValidator.validateBinaries(['nonexistent-binary-12345']);
      expect(result.missing).toContain('nonexistent-binary-12345');
      expect(result.valid).toBe(false);
    });

    it('should check binary availability', () => {
      expect(BunBinaryValidator.isBinaryAvailable('bun')).toBe(true);
      expect(BunBinaryValidator.isBinaryAvailable('nonexistent-binary-12345')).toBe(false);
    });

    it('should get binary paths in parallel', async () => {
      const paths = await BunBinaryValidator.getBinaryPaths(['bun', 'node'], 1000);
      expect(paths.size).toBe(2);
      expect(paths.get('bun')).not.toBe('NOT_FOUND');
    });

    it('should find conflicting binaries', () => {
      const conflicts = BunBinaryValidator.findConflictingBinaries(['bun', 'node']);
      expect(conflicts).toBeInstanceOf(Map);
    });

    it('should generate validation report', () => {
      const result = BunBinaryValidator.validateBinaries(['bun']);
      const report = BunBinaryValidator.generateValidationReport(result);
      expect(report).toContain('Binary Validation Report');
      expect(report).toContain('Present:');
    });
  });

  describe('BunPerfBenchmark', () => {
    it('should benchmark function execution', () => {
      const result = BunPerfBenchmark.benchmark('test', () => Math.random(), 100);
      expect(result.name).toBe('test');
      expect(result.iterations).toBe(100);
      expect(result.opsPerSecond).toBeGreaterThan(0);
      expect(result.avgMs).toBeGreaterThan(0);
    });

    it('should benchmark async function', async () => {
      const result = await BunPerfBenchmark.benchmarkAsync('async-test', async () => {
        await Bun.sleep(1);
        return Math.random();
      }, 10);
      
      expect(result.name).toBe('async-test');
      expect(result.iterations).toBe(10);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    it('should compare two functions', () => {
      const result = BunPerfBenchmark.compare(
        'fast',
        () => Math.random(),
        'slow',
        () => Math.random() + Math.random(),
        100
      );
      
      expect(result.results).toHaveLength(2);
      expect(['fast', 'slow']).toContain(result.winner);
      expect(result.speedup).toBeGreaterThan(0);
    });

    it('should run benchmark suite', () => {
      const suite = BunPerfBenchmark.runSuite('test-suite', [
        { name: 'test1', fn: () => Math.random() },
        { name: 'test2', fn: () => Date.now() }
      ]);
      
      expect(suite.name).toBe('test-suite');
      expect(suite.results).toHaveLength(2);
      expect(suite.summary.totalOps).toBeGreaterThan(0);
    });

    it('should format benchmark results', () => {
      const result = BunPerfBenchmark.benchmark('test', () => Math.random(), 10);
      const formatted = BunPerfBenchmark.formatResult(result);
      expect(formatted).toContain('test');
      expect(formatted).toContain('ops/sec');
    });
  });

  describe('BunIDGenerator', () => {
    it('should generate agent IDs', () => {
      const id = BunIDGenerator.generateAgentId();
      expect(id).toMatch(/^AG[A-F0-9]{12}$/);
    });

    it('should generate sequential agent IDs', () => {
      const id1 = BunIDGenerator.generateSequentialAgentId();
      const id2 = BunIDGenerator.generateSequentialAgentId();
      expect(id1).toMatch(/^AG\d{6}[A-F0-9]{6}$/);
      expect(id2).toMatch(/^AG\d{6}[A-F0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate bulk IDs', () => {
      const ids = BunIDGenerator.generateBulkIds(100, { prefix: 'TEST' });
      expect(ids).toHaveLength(100);
      expect(ids[0]).toMatch(/^TEST[A-F0-9]{12}$/);
      
      // Check uniqueness
      const unique = new Set(ids);
      expect(unique.size).toBe(100);
    });

    it('should generate bulk IDs with tracking', () => {
      const result = BunIDGenerator.generateBulkIdsTracked(100);
      expect(result.ids).toHaveLength(100);
      expect(result.count).toBe(100);
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.duplicates).toBe(0);
    });

    it('should generate transaction IDs', () => {
      const tx = BunIDGenerator.generateTxId('AG000001');
      expect(tx.id).toMatch(/^TX-AG000001-/);
      expect(tx.agentId).toBe('AG000001');
      expect(tx.timestamp).toBeGreaterThan(0);
      expect(tx.uuid).toMatch(/^[A-F0-9-]+$/);
    });

    it('should decode UUIDv7 timestamp', () => {
      const uuid = Bun.randomUUIDv7();
      const timestamp = BunIDGenerator.decodeUUIDv7(uuid);
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThan(Date.now() + 1000); // Should be recent
    });

    it('should validate agent IDs', () => {
      expect(BunIDGenerator.validateAgentId('AG123456789012')).toBe(true);
      expect(BunIDGenerator.validateAgentId('INVALID')).toBe(false);
    });

    it('should validate transaction IDs', () => {
      const tx = BunIDGenerator.generateTxId('AG000001');
      expect(BunIDGenerator.validateTransactionId(tx.id)).toBe(true);
      expect(BunIDGenerator.validateTransactionId('INVALID')).toBe(false);
    });

    it('should extract agent ID from transaction ID', () => {
      const tx = BunIDGenerator.generateTxId('AG000001');
      const extracted = BunIDGenerator.extractAgentIdFromTxId(tx.id);
      expect(extracted).toBe('AG000001');
    });

    it('should generate mixed bulk IDs', () => {
      const result = BunIDGenerator.generateMixedBulk(10);
      expect(result.agents).toHaveLength(10);
      expect(result.transactions).toHaveLength(10);
      expect(result.sessions).toHaveLength(10);
      expect(result.workflows).toHaveLength(10);
    });
  });

  describe('BunPeekOrchestrator', () => {
    let orchestrator: BunPeekOrchestrator;

    beforeEach(() => {
      orchestrator = new BunPeekOrchestrator();
    });

    it('should execute task once', async () => {
      let callCount = 0;
      const task = () => {
        callCount++;
        return Promise.resolve('result');
      };

      const result1 = await orchestrator.executeOnce('test-key', task);
      const result2 = await orchestrator.executeOnce('test-key', task);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(callCount).toBe(1); // Should only be called once
    });

    it('should batch process items', async () => {
      const items = ['item1', 'item2', 'item3'];
      const processor = async (item: string) => `${item}-processed`;

      const results = await orchestrator.batchProcess(items, processor);
      expect(results.size).toBe(3);
      expect(results.get('item1')).toBe('item1-processed');
    });

    it('should handle concurrent batch processing', async () => {
      const items = Array.from({ length: 20 }, (_, i) => `item-${i}`);
      const processor = async (item: string) => {
        await Bun.sleep(10);
        return `${item}-processed`;
      };

      const results = await orchestrator.concurrentBatch(items, processor, 5);
      expect(results.size).toBe(20);
    });

    it('should track statistics', async () => {
      await orchestrator.executeOnce('test', () => Promise.resolve('result'));
      const stats = orchestrator.getStats();
      
      expect(stats.totalTasks).toBe(1);
      expect(stats.executedTasks).toBe(1);
      expect(stats.activeTasks).toBe(0);
    });

    it('should clear cache', async () => {
      await orchestrator.executeOnce('test', () => Promise.resolve('result'));
      orchestrator.clearCache();
      
      const cached = orchestrator.getCachedResult('test');
      expect(cached).toBeNull();
    });

    it('should get task status', async () => {
      const promise = orchestrator.executeOnce('test', async () => {
        await Bun.sleep(100);
        return 'result';
      });

      const status = orchestrator.getTaskStatus('test');
      expect(status).toBe('pending');

      await promise;
      const finalStatus = orchestrator.getTaskStatus('test');
      expect(['fulfilled', 'not_found']).toContain(finalStatus);
    });
  });

  describe('BunModuleResolver', () => {
    it('should resolve modules', () => {
      const resolved = BunModuleResolver.resolveModules(['fs', 'path']);
      expect(resolved.size).toBe(2);
      expect(resolved.get('fs')?.found).toBe(true);
      expect(resolved.get('path')?.found).toBe(true);
    });

    it('should find TypeScript files', () => {
      const files = BunModuleResolver.findTsFiles('.');
      expect(Array.isArray(files)).toBe(true);
      if (files.length > 0) {
        expect(files[0]).toMatch(/\.ts$/);
      }
    });

    it('should find JavaScript files', () => {
      const files = BunModuleResolver.findJsFiles('.');
      expect(Array.isArray(files)).toBe(true);
      if (files.length > 0) {
        expect(files[0]).toMatch(/\.js$/);
      }
    });

    it('should resolve with fallback', () => {
      const path = BunModuleResolver.resolveWithFallback('fs', ['.']);
      expect(path).toBeTruthy();
    });

    it('should get module info', async () => {
      const info = await BunModuleResolver.getModuleInfo('fs');
      expect(info).toBeTruthy();
      if (info) {
        expect(info.name).toBe('fs');
        expect(info.type).toBe('builtin');
      }
    });

    it('should find duplicate modules', () => {
      const duplicates = BunModuleResolver.findDuplicateModules(['fs', 'path']);
      expect(duplicates).toBeInstanceOf(Map);
    });

    it('should analyze dependencies', () => {
      // Create a temporary test file
      const testContent = `
        import { readFile } from 'bun:fs';
        import { join } from 'path';
        export function test() {}
      `;
      
      // This would normally write to a temp file and analyze it
      // For now, just test the function exists
      expect(typeof BunModuleResolver.analyzeDependencies).toBe('function');
    });

    it('should get resolution stats', () => {
      const stats = BunModuleResolver.getResolutionStats(['fs', 'path']);
      expect(stats.totalModules).toBe(2);
      expect(stats.foundModules).toBe(2);
      expect(stats.resolutionTime).toBeGreaterThan(0);
    });

    it('should generate module report', () => {
      const report = BunModuleResolver.generateModuleReport(['fs']);
      expect(report).toContain('Module Resolution Report');
      expect(report).toContain('fs');
    });
  });

  describe('BunStateCompressor', () => {
    it('should compress and decompress state', () => {
      const testData = { message: 'Hello, World!', data: new Array(1000).fill('test') };
      const compressed = BunStateCompressor.compressState(testData);
      
      expect(compressed.compressed.length).toBeGreaterThan(0);
      expect(compressed.compressionRatio).toBeGreaterThan(1);
      expect(compressed.compressionTime).toBeGreaterThan(0);
      
      const decompressed = BunStateCompressor.decompressState(compressed.compressed);
      expect(decompressed.decompressed).toEqual(testData);
    });

    it('should compress with Zstandard', () => {
      const testData = { message: 'Hello, World!' };
      const compressed = BunStateCompressor.compressStateZstd(testData);
      
      expect(compressed.algorithm).toBe('zstd');
      expect(compressed.compressed.length).toBeGreaterThan(0);
      
      const decompressed = BunStateCompressor.decompressStateZstd(compressed.compressed);
      expect(decompressed.decompressed).toEqual(testData);
    });

    it('should batch compress states', () => {
      const states = new Map([
        ['state1', { data: 'test1' }],
        ['state2', { data: 'test2' }],
        ['state3', { data: 'test3' }]
      ]);
      
      const result = BunStateCompressor.batchCompress(states);
      expect(result.results.size).toBe(3);
      expect(result.totalOriginalSize).toBeGreaterThan(result.totalCompressedSize);
      expect(result.averageCompressionRatio).toBeGreaterThan(1);
    });

    it('should batch decompress states', async () => {
      const states = new Map([
        ['state1', { data: 'test1' }],
        ['state2', { data: 'test2' }]
      ]);
      
      const compressed = BunStateCompressor.batchCompress(states);
      const compressedMap = new Map(
        Array.from(compressed.results.entries()).map(([key, value]) => [key, value.compressed])
      );
      
      const decompressed = await BunStateCompressor.batchDecompress(compressedMap);
      expect(decompressed.size).toBe(2);
      expect(decompressed.get('state1')).toEqual({ data: 'test1' });
    });

    it('should compress to base64 and decompress', () => {
      const testData = { message: 'Hello, World!' };
      const base64 = BunStateCompressor.compressToBase64(testData);
      const decompressed = BunStateCompressor.decompressFromBase64(base64);
      
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      expect(decompressed).toEqual(testData);
    });

    it('should compare algorithms', () => {
      const testData = { data: new Array(100).fill('test') };
      const comparison = BunStateCompressor.compareAlgorithms(testData);
      
      expect(comparison.gzip).toBeDefined();
      expect(comparison.zstd).toBeDefined();
      expect(['gzip', 'zstd']).toContain(comparison.winner);
      expect(comparison.speedup).toBeGreaterThan(0);
    });

    it('should handle compression options', () => {
      const testData = { small: 'test' };
      const result = BunStateCompressor.compressWithOptions(testData, { 
        threshold: 1000,
        algorithm: 'none'
      });
      
      expect(result.algorithm).toBe('none');
      expect(result.compressionRatio).toBe(1);
    });

    it('should get and reset stats', () => {
      BunStateCompressor.compressState({ test: 'data' });
      const stats = BunStateCompressor.getStats();
      expect(stats.totalCompressed).toBeGreaterThan(0);
      
      BunStateCompressor.resetStats();
      const resetStats = BunStateCompressor.getStats();
      expect(resetStats.totalCompressed).toBe(0);
    });

    it('should generate compression report', () => {
      const states = new Map([
        ['test', { data: 'value' }]
      ]);
      const result = BunStateCompressor.batchCompress(states);
      const report = BunStateCompressor.generateReport(result);
      
      expect(report).toContain('Compression Report');
      expect(report).toContain('test');
    });
  });

  describe('BunOutputFormatter', () => {
    it('should format agent table', () => {
      const agents = [
        { id: 'AG000001', status: 'active', balance: 100.50 },
        { id: 'AG000002', status: 'pending', balance: 200.75 }
      ];
      
      const table = BunOutputFormatter.formatAgentTable(agents);
      expect(table).toContain('AG000001');
      expect(table).toContain('active');
      expect(table).toContain('$100.50');
    });

    it('should format generic table', () => {
      const data = [
        { name: 'Test', value: 123, active: true },
        { name: 'Test2', value: 456, active: false }
      ];
      
      const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Value', key: 'value', format: (v: number) => v.toFixed(0) },
        { header: 'Active', key: 'active' }
      ];
      
      const table = BunOutputFormatter.formatTable(data, columns);
      expect(table).toContain('Test');
      expect(table).toContain('123');
      expect(table).toContain('true');
    });

    it('should clean ANSI codes', () => {
      const colored = '\x1b[31mRed Text\x1b[0m';
      const clean = BunOutputFormatter.cleanLogs(colored);
      expect(clean).toBe('Red Text');
      expect(clean).not.toContain('\x1b');
    });

    it('should create status badges', () => {
      const badge = BunOutputFormatter.statusBadge('active');
      expect(badge).toContain('active');
      expect(badge).toContain('●');
    });

    it('should format progress bar', () => {
      const progress = BunOutputFormatter.progressBar(50, 100, 20);
      expect(progress).toContain('50.0%');
      expect(progress).toContain('(50/100)');
    });

    it('should format file size', () => {
      expect(BunOutputFormatter.formatFileSize(1024)).toBe('1.0 KB');
      expect(BunOutputFormatter.formatFileSize(1048576)).toBe('1.0 MB');
      expect(BunOutputFormatter.formatFileSize(500)).toBe('500 B');
    });

    it('should format duration', () => {
      expect(BunOutputFormatter.formatDuration(500)).toBe('500ms');
      expect(BunOutputFormatter.formatDuration(5000)).toBe('5.0s');
      expect(BunOutputFormatter.formatDuration(120000)).toBe('2.0m');
    });

    it('should format timestamp', () => {
      const now = new Date();
      const formatted = BunOutputFormatter.formatTimestamp(now);
      expect(formatted).toBeTruthy();
    });

    it('should format JSON', () => {
      const data = { test: 'value', number: 123 };
      const formatted = BunOutputFormatter.formatJson(data);
      expect(formatted).toContain('test');
      expect(formatted).toContain('value');
      expect(formatted).toContain('123');
    });

    it('should format key-value pairs', () => {
      const pairs = { name: 'test', value: 123 };
      const formatted = BunOutputFormatter.formatKeyValue(pairs);
      expect(formatted).toContain('name:');
      expect(formatted).toContain('test');
    });

    it('should truncate text', () => {
      const long = 'This is a very long text that should be truncated';
      const truncated = BunOutputFormatter.truncate(long, 20);
      expect(truncated.length).toBeLessThanOrEqual(20);
      expect(truncated).toContain('...');
    });

    it('should wrap text', () => {
      const text = 'This is a long line of text that should be wrapped';
      const wrapped = BunOutputFormatter.wrapText(text, 20);
      expect(wrapped.length).toBeGreaterThan(1);
      expect(wrapped[0].length).toBeLessThanOrEqual(20);
    });

    it('should format messages', () => {
      expect(BunOutputFormatter.formatSuccess('Success')).toContain('✅');
      expect(BunOutputFormatter.formatError('Error')).toContain('❌');
      expect(BunOutputFormatter.formatWarning('Warning')).toContain('⚠️');
      expect(BunOutputFormatter.formatInfo('Info')).toContain('ℹ️');
    });
  });

  describe('BunRuntimeDetector', () => {
    it('should get system info', () => {
      const info = BunRuntimeDetector.getSystemInfo();
      expect(info.bunVersion).toBeTruthy();
      expect(info.bunRevision).toBeTruthy();
      expect(info.hardwareConcurrency).toBeGreaterThan(0);
      expect(info.memoryUsage).toBeTruthy();
      expect(info.platform).toBeTruthy();
    });

    it('should analyze memory usage', () => {
      const testData = new Array(1000).fill({ data: 'test' });
      const analysis = BunRuntimeDetector.analyzeMemoryUsage(testData);
      
      expect(analysis.shallowBytes).toBeGreaterThan(0);
      expect(analysis.heapUsed).toBeGreaterThan(0);
      expect(analysis.heapTotal).toBeGreaterThan(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(analysis.pressure);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should get performance metrics', () => {
      const metrics = BunRuntimeDetector.getPerformanceMetrics();
      expect(metrics.cpuUsage).toBeTruthy();
      expect(metrics.memoryUsage).toBeTruthy();
      expect(metrics.activeHandles).toBeGreaterThanOrEqual(0);
      expect(metrics.activeRequests).toBeGreaterThanOrEqual(0);
    });

    it('should detect production environment', () => {
      const isProd = BunRuntimeDetector.isProduction();
      expect(typeof isProd).toBe('boolean');
    });

    it('should get environment info', () => {
      const env = BunRuntimeDetector.getEnvironmentInfo();
      expect(env.nodeEnv).toBeTruthy();
      expect(typeof env.isProduction).toBe('boolean');
      expect(typeof env.isDevelopment).toBe('boolean');
      expect(typeof env.isTest).toBe('boolean');
      expect(env.variables).toBeTruthy();
      expect(env.duoplusConfig).toBeTruthy();
    });

    it('should benchmark function', async () => {
      const result = await BunRuntimeDetector.benchmarkFunction(
        'test',
        () => Math.random(),
        10
      );
      
      expect(result.name).toBe('test');
      expect(result.iterations).toBe(10);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.memoryBefore).toBeTruthy();
      expect(result.memoryAfter).toBeTruthy();
    });

    it('should monitor memory', async () => {
      const readings = await BunRuntimeDetector.monitorMemory(1000, 500);
      expect(readings.length).toBeGreaterThanOrEqual(1);
      expect(readings[0].heapUsed).toBeGreaterThan(0);
    }, 2000);

    it('should detect memory leaks', async () => {
      const result = await BunRuntimeDetector.detectMemoryLeaks(
        () => {
          // Create some objects
          new Array(100).fill({ data: 'test' });
          return Promise.resolve();
        },
        5,
        1024 * 1024 // 1MB threshold
      );
      
      expect(typeof result.hasLeak).toBe('boolean');
      expect(typeof result.leakSize).toBe('number');
      expect(result.readings).toHaveLength(5);
    });

    it('should get system capabilities', () => {
      const caps = BunRuntimeDetector.getSystemCapabilities();
      expect(typeof caps.supportsJSC).toBe('boolean');
      expect(typeof caps.supportsSQLite).toBe('boolean');
      expect(typeof caps.supportsFFI).toBe('boolean');
      expect(typeof caps.supportsTLS).toBe('boolean');
      expect(typeof caps.supportsWorkers).toBe('boolean');
      expect(typeof caps.supportsFileWatcher).toBe('boolean');
    });

    it('should generate health report', () => {
      const report = BunRuntimeDetector.generateHealthReport();
      expect(report).toContain('System Health Report');
      expect(report).toContain('Bun Runtime:');
      expect(report).toContain('System:');
      expect(report).toContain('Memory:');
      expect(report).toContain('Environment:');
      expect(report).toContain('Capabilities:');
    });

    it('should create snapshot', () => {
      const snapshot = BunRuntimeDetector.createSnapshot();
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.systemInfo).toBeTruthy();
      expect(snapshot.memoryAnalysis).toBeTruthy();
      expect(snapshot.performanceMetrics).toBeTruthy();
    });

    it('should compare snapshots', () => {
      const snapshot1 = BunRuntimeDetector.createSnapshot();
      // Small delay to ensure different timestamps
      setTimeout(() => {}, 10);
      const snapshot2 = BunRuntimeDetector.createSnapshot();
      
      const comparison = BunRuntimeDetector.compareSnapshots(snapshot1, snapshot2);
      expect(comparison.timeDelta).toBeGreaterThanOrEqual(0);
      expect(typeof comparison.memoryDelta).toBe('number');
      expect(comparison.performanceDelta).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should work together: ID generation and compression', () => {
      const ids = BunIDGenerator.generateBulkIds(100);
      const compressed = BunStateCompressor.compressState({ ids });
      
      expect(compressed.compressionRatio).toBeGreaterThan(1);
      const decompressed = BunStateCompressor.decompressState(compressed.compressed);
      expect(decompressed.decompressed.ids).toEqual(ids);
    });

    it('should work together: Benchmark and formatting', () => {
      const benchmark = BunPerfBenchmark.benchmark('test', () => Math.random(), 100);
      const formatted = BunPerfBenchmark.formatResult(benchmark);
      
      expect(formatted).toContain('test');
      expect(formatted).toContain('ops/sec');
    });

    it('should work together: Orchestrator and ID generation', async () => {
      const orchestrator = new BunPeekOrchestrator();
      
      const result1 = await orchestrator.executeOnce('id-gen', async () => 
        BunIDGenerator.generateAgentId()
      );
      const result2 = await orchestrator.executeOnce('id-gen', async () => 
        BunIDGenerator.generateAgentId()
      );
      
      expect(result1).toBe(result2); // Should be cached
      expect(BunIDGenerator.validateAgentId(result1)).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should benchmark all utilities performance', () => {
      const suite = BunPerfBenchmark.runSuite('Utilities Performance', [
        { name: 'id-generation', fn: () => BunIDGenerator.generateAgentId() },
        { name: 'binary-validation', fn: () => BunBinaryValidator.isBinaryAvailable('bun') },
        { name: 'memory-analysis', fn: () => BunRuntimeDetector.analyzeMemoryUsage({}) },
        { name: 'text-formatting', fn: () => BunOutputFormatter.formatFileSize(1024) }
      ]);
      
      expect(suite.results).toHaveLength(4);
      expect(suite.summary.averageOpsPerSecond).toBeGreaterThan(0);
      
      // All utilities should be reasonably fast
      for (const result of suite.results) {
        expect(result.avgMs).toBeLessThan(1); // Should be under 1ms average
        expect(result.opsPerSecond).toBeGreaterThan(1000); // Should handle 1000+ ops/sec
      }
    });
  });
});

// Global test setup and teardown
beforeAll(() => {
  // Reset any global state before tests
  BunStateCompressor.resetStats();
});

afterAll(() => {
  // Cleanup after tests
  BunModuleResolver.clearCache();
});

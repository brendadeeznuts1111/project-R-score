#!/usr/bin/env bun
// scripts/bun-1.3-monitor.ts - Bun 1.3 performance monitoring for odds protocol

import { spawn, $ } from 'bun';
import { hash, stripANSI } from "bun";
import { BunJSCGCIntegration } from '../packages/odds-core/src/bun-jsc-gc';
import { BunCompleteAPIsIntegration } from '../packages/odds-core/src/bun-complete-apis';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  hash: string;
  memoryBefore: number;
  memoryAfter: number;
  timestamp: number;
}

export interface ProcessMonitoringResult {
  success: boolean;
  output: string;
  error: string;
  exitCode: number | null;
  duration: number;
  memoryPeak: number;
}

export class Bun13PerformanceMonitor {
  private samples: number[] = [];
  private rapidHashCache = new Map<string, bigint>();
  private metrics: PerformanceMetrics[] = [];
  private monitoringStartTime = performance.now();

  constructor() {
    console.log('📊 Bun 1.3 Performance Monitor initialized');
  }

  // Bun 1.3: Enhanced timing with rapidhash and memory tracking
  measureExecution<T>(
    fn: () => T, 
    operation: string
  ): { result: T; duration: number; hash: string; memoryDelta: number } {
    const memoryBefore = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    const result = fn();
    
    const duration = performance.now() - start;
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDelta = memoryAfter - memoryBefore;
    
    const operationHash = this.getOperationHash(operation, duration);
    
    this.samples.push(duration);
    this.metrics.push({
      operation,
      duration,
      hash: operationHash.toString(16),
      memoryBefore,
      memoryAfter,
      timestamp: Date.now(),
    });
    
    return { result, duration, hash: operationHash.toString(16), memoryDelta };
  }

  // Async version for promises
  async measureExecutionAsync<T>(
    fn: () => Promise<T>, 
    operation: string
  ): Promise<{ result: T; duration: number; hash: string; memoryDelta: number }> {
    const memoryBefore = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    const result = await fn();
    
    const duration = performance.now() - start;
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDelta = memoryAfter - memoryBefore;
    
    const operationHash = this.getOperationHash(operation, duration);
    
    this.samples.push(duration);
    this.metrics.push({
      operation,
      duration,
      hash: operationHash.toString(16),
      memoryBefore,
      memoryAfter,
      timestamp: Date.now(),
    });
    
    return { result, duration, hash: operationHash.toString(16), memoryDelta };
  }

  private getOperationHash(operation: string, duration: number): bigint {
    const key = `${operation}-${duration.toFixed(3)}-${Date.now()}`;
    
    if (!this.rapidHashCache.has(key)) {
      this.rapidHashCache.set(key, hash(key));
    }
    
    return this.rapidHashCache.get(key)!;
  }

  // Bun 1.3: Enhanced process monitoring with timeout and memory limits
  async monitorProcess(
    cmd: string[], 
    options: {
      timeout?: number;
      maxBuffer?: number;
      env?: Record<string, string>;
    } = {}
  ): Promise<ProcessMonitoringResult> {
    const {
      timeout = 30000,
      maxBuffer = 10 * 1024 * 1024, // 10MB
      env = {}
    } = options;

    const start = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;
    
    try {
      const proc = spawn({
        cmd,
        timeout, // Bun 1.3: Auto-kill after timeout
        maxBuffer,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, ...env },
      });

      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();
      
      const duration = performance.now() - start;
      const memoryAfter = process.memoryUsage().heapUsed;
      
      return {
        success: proc.exitCode === 0,
        output: stripANSI(output), // Bun 1.3: Strip ANSI codes
        error: stripANSI(error),
        exitCode: proc.exitCode,
        duration,
        memoryPeak: memoryAfter - memoryBefore,
      };
    } catch (error) {
      const duration = performance.now() - start;
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: null,
        duration,
        memoryPeak: 0,
      };
    }
  }

  // Bun 1.3: Enhanced memory usage monitoring with JSC integration
  getMemoryStats() {
    const nodeStats = process.memoryUsage();
    
    // Bun.memoryUsage() might not be available in all versions
    let bunStats;
    try {
      bunStats = (Bun as any).memoryUsage?.() || {};
    } catch {
      bunStats = {};
    }
    
    try {
      // Use our JSC integration for advanced memory analysis
      const jscAnalysis = BunJSCGCIntegration.getDetailedMemoryAnalysis();
      
      return {
        node: {
          heapUsed: nodeStats.heapUsed,
          heapTotal: nodeStats.heapTotal,
          external: nodeStats.external,
          rss: nodeStats.rss,
        },
        bun: {
          heapUsed: bunStats.heapUsed || 0,
          heapSize: bunStats.heapSize || 0,
          external: bunStats.externalMemory || 0,
        },
        jsc: {
          heapSize: jscAnalysis.heapSize,
          objectCount: jscAnalysis.heapStats.objectCount,
          efficiency: jscAnalysis.analysis.memoryEfficiency,
          fragmentation: jscAnalysis.analysis.fragmentationRatio,
        },
        cache: {
          rapidHashSize: this.rapidHashCache.size,
          metricsCount: this.metrics.length,
        },
      };
    } catch (error) {
      console.warn('⚠️ JSC memory analysis not available:', error);
      
      return {
        node: {
          heapUsed: nodeStats.heapUsed,
          heapTotal: nodeStats.heapTotal,
          external: nodeStats.external,
          rss: nodeStats.rss,
        },
        bun: {
          heapUsed: bunStats.heapUsed || 0,
          heapSize: bunStats.heapSize || 0,
          external: bunStats.externalMemory || 0,
        },
        jsc: null,
        cache: {
          rapidHashSize: this.rapidHashCache.size,
          metricsCount: this.metrics.length,
        },
      };
    }
  }

  // Bun 1.3: WebSocket performance testing
  async testWebSocketPerformance(url: string, messageCount: number = 1000) {
    console.log(`🌐 Testing WebSocket performance: ${messageCount} messages`);
    
    const ws = new WebSocket(url);
    const results: number[] = [];
    let receivedCount = 0;
    
    return new Promise<{
      averageLatency: number;
      messagesPerSecond: number;
      success: boolean;
    }>((resolve) => {
      ws.onopen = () => {
        console.log('🔗 WebSocket connected, starting performance test...');
        
        const startTime = performance.now();
        
        // Send messages rapidly
        for (let i = 0; i < messageCount; i++) {
          const messageStart = performance.now();
          const message = {
            id: i,
            timestamp: messageStart,
            data: `test-message-${i}`,
          };
          
          ws.send(JSON.stringify(message));
          
          // Track send time for latency calculation
          setTimeout(() => {
            if (receivedCount >= messageCount) {
              const totalTime = performance.now() - startTime;
              const averageLatency = results.reduce((a, b) => a + b, 0) / results.length;
              const messagesPerSecond = (messageCount / totalTime) * 1000;
              
              ws.close();
              resolve({
                averageLatency,
                messagesPerSecond,
                success: true,
              });
            }
          }, 100);
        }
      };
      
      ws.onmessage = (event) => {
        const receiveTime = performance.now();
        const message = JSON.parse(event.data.toString());
        const latency = receiveTime - message.timestamp;
        
        results.push(latency);
        receivedCount++;
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket test error:', error);
        ws.close();
        resolve({
          averageLatency: 0,
          messagesPerSecond: 0,
          success: false,
        });
      };
      
      // Timeout after 30 seconds
      setTimeout(() => {
        ws.close();
        resolve({
          averageLatency: 0,
          messagesPerSecond: 0,
          success: false,
        });
      }, 30000);
    });
  }

  // Bun 1.3: RapidHash performance benchmarking
  benchmarkRapidHash(iterations: number = 100000) {
    console.log(`⚡ Benchmarking RapidHash: ${iterations} iterations`);
    
    const testData = Array.from({ length: 100 }, (_, i) => `test-data-${i}-${Math.random()}`);
    
    const result = this.measureExecution(() => {
      for (let i = 0; i < iterations; i++) {
        const data = testData[i % testData.length];
        hash(data);
      }
    }, 'rapidhash-benchmark');
    
    const hashesPerSecond = (iterations / result.duration) * 1000;
    
    return {
      duration: result.duration,
      hashesPerSecond,
      memoryDelta: result.memoryDelta,
      hash: result.hash,
    };
  }

  // Generate comprehensive performance report
  generateReport(): string {
    const memoryStats = this.getMemoryStats();
    const uptime = performance.now() - this.monitoringStartTime;
    
    // Calculate statistics
    const avgDuration = this.samples.length > 0 
      ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length 
      : 0;
    
    const maxDuration = this.samples.length > 0 
      ? Math.max(...this.samples) 
      : 0;
    
    const minDuration = this.samples.length > 0 
      ? Math.min(...this.samples) 
      : 0;
    
    const report = [
      '# Bun 1.3 Performance Report',
      `Generated: ${new Date().toISOString()}`,
      `Uptime: ${(uptime / 1000).toFixed(2)}s`,
      '',
      '## Execution Statistics',
      `- Total Operations: ${this.samples.length}`,
      `- Average Duration: ${avgDuration.toFixed(2)}ms`,
      `- Min Duration: ${minDuration.toFixed(2)}ms`,
      `- Max Duration: ${maxDuration.toFixed(2)}ms`,
      '',
      '## Memory Usage',
      `- Node Heap Used: ${(memoryStats.node.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      `- Bun Heap Used: ${(memoryStats.bun.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      `- RapidHash Cache Size: ${memoryStats.cache.rapidHashSize}`,
      `- Metrics Count: ${memoryStats.cache.metricsCount}`,
      '',
      memoryStats.jsc ? [
        '## JSC Memory Analysis',
        `- Heap Size: ${(memoryStats.jsc.heapSize / 1024 / 1024).toFixed(2)}MB`,
        `- Object Count: ${memoryStats.jsc.objectCount}`,
        `- Memory Efficiency: ${memoryStats.jsc.efficiency.toFixed(2)}%`,
        `- Fragmentation: ${memoryStats.jsc.fragmentation.toFixed(2)}%`,
        ''
      ].join('\n') : '',
      '## Bun Information',
      `- Version: ${Bun.version}`,
      `- Revision: ${Bun.revision}`,
      '',
      '---',
      '*Generated by Bun 1.3 Performance Monitor*',
    ].filter(Boolean).join('\n');
    
    return report;
  }

  // Save report to file
  async saveReport(filePath: string = './performance-report.md'): Promise<void> {
    const report = this.generateReport();
    await Bun.write(filePath, report);
    console.log(`📄 Performance report saved to: ${filePath}`);
  }

  // Cleanup old metrics
  cleanup() {
    const maxMetrics = 10000;
    if (this.metrics.length > maxMetrics) {
      this.metrics = this.metrics.slice(-maxMetrics);
    }
    
    const maxSamples = 10000;
    if (this.samples.length > maxSamples) {
      this.samples = this.samples.slice(-maxSamples);
    }
    
    // Cleanup hash cache
    if (this.rapidHashCache.size > 10000) {
      const entries = Array.from(this.rapidHashCache.entries());
      this.rapidHashCache.clear();
      entries.slice(-5000).forEach(([key, value]) => {
        this.rapidHashCache.set(key, value);
      });
    }
  }
}

// CLI interface for running performance tests
if (import.meta.main) {
  const monitor = new Bun13PerformanceMonitor();
  
  console.log('🚀 Starting Bun 1.3 Performance Tests...');
  
  // Test rapidhash performance
  const hashBenchmark = monitor.benchmarkRapidHash(100000);
  console.log(`⚡ RapidHash: ${hashBenchmark.hashesPerSecond.toFixed(0)} hashes/sec`);
  
  // Test memory usage
  const memoryStats = monitor.getMemoryStats();
  console.log(`📊 Memory: ${(memoryStats.bun.heapUsed / 1024 / 1024).toFixed(2)}MB used`);
  
  // Test WebSocket performance if server is running
  if (process.argv.includes('--ws-test')) {
    const wsTest = await monitor.testWebSocketPerformance('ws://localhost:3000/ws', 1000);
    console.log(`🌐 WebSocket: ${wsTest.messagesPerSecond.toFixed(0)} msg/sec, ${wsTest.averageLatency.toFixed(2)}ms latency`);
  }
  
  // Generate and save report
  await monitor.saveReport();
  
  console.log('✅ Performance tests completed!');
}

export default Bun13PerformanceMonitor;

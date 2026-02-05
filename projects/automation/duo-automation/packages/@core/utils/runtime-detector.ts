/**
 * Bun-Native Runtime Detection Utilities
 * 
 * Comprehensive system introspection with nanosecond precision
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface SystemInfo {
  bunVersion: string;
  bunRevision: string;
  mainEntry: string;
  isDirectExecution: boolean;
  hardwareConcurrency: number;
  memoryUsage: NodeJS.MemoryUsage;
  startTime: number;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
}

export interface MemoryAnalysis {
  shallowBytes: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  ratio: number;
  recommendations: string[];
  pressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceMetrics {
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  eventLoopLag: number;
  activeHandles: number;
  activeRequests: number;
  gcStats?: {
    type: string;
    duration: number;
    before: MemoryAnalysis;
    after: MemoryAnalysis;
  };
}

export interface EnvironmentInfo {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  variables: Record<string, string>;
  duoplusConfig: Record<string, any>;
}

export class BunRuntimeDetector {
  private static startTime = Bun.nanoseconds();
  private static metrics: PerformanceMetrics[] = [];

  /**
   * Get comprehensive system info
   */
  static getSystemInfo(): SystemInfo {
    return {
      bunVersion: Bun.version,
      bunRevision: Bun.revision,
      mainEntry: Bun.main,
      isDirectExecution: import.meta.path === Bun.main,
      hardwareConcurrency: navigator.hardwareConcurrency,
      memoryUsage: process.memoryUsage(),
      startTime: this.startTime,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime()
    };
  }

  /**
   * Memory usage analysis with JSC estimation
   */
  static analyzeMemoryUsage(obj: any): MemoryAnalysis {
    const shallow = (typeof (Bun as any).jsc !== 'undefined' && (Bun as any).jsc.estimateShallowMemoryUsageOf) 
      ? (Bun as any).jsc.estimateShallowMemoryUsageOf(obj) || 0 
      : 0;
    
    const memory = process.memoryUsage();
    
    const ratio = memory.heapUsed > 0 ? shallow / memory.heapUsed : 0;
    
    // Determine memory pressure
    const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    let pressure: MemoryAnalysis['pressure'] = 'low';
    
    if (heapUsagePercent > 90) {
      pressure = 'critical';
    } else if (heapUsagePercent > 75) {
      pressure = 'high';
    } else if (heapUsagePercent > 50) {
      pressure = 'medium';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (shallow > 50_000_000) {
      recommendations.push('Consider compressing large objects');
    }
    if (pressure === 'high' || pressure === 'critical') {
      recommendations.push('High memory pressure detected');
      recommendations.push('Consider implementing object pooling');
    }
    if (ratio > 0.8) {
      recommendations.push('Object represents large portion of heap');
    }
    
    return {
      shallowBytes: shallow,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers,
      ratio,
      recommendations,
      pressure
    };
  }

  /**
   * Get current performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    const start = Bun.nanoseconds();
    
    // Measure event loop lag
    const eventLoopStart = Bun.nanoseconds();
    setImmediate(() => {
      const eventLoopEnd = Bun.nanoseconds();
      // This would be captured in a real implementation
    });
    
    return {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      eventLoopLag: 0, // Would be measured properly
      activeHandles: (process as any)._getActiveHandles().length,
      activeRequests: (process as any)._getActiveRequests().length
    };
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return Bun.env.NODE_ENV === 'production' || 
           Bun.env.NODE_ENV === 'prod' || 
           Bun.main.includes('dist/') ||
           process.env.NODE_ENV === 'production';
  }

  /**
   * Get environment information
   */
  static getEnvironmentInfo(): EnvironmentInfo {
    const nodeEnv = Bun.env.NODE_ENV || process.env.NODE_ENV || 'development';
    
    return {
      nodeEnv,
      isProduction: this.isProduction(),
      isDevelopment: nodeEnv === 'development' || nodeEnv === 'dev',
      isTest: nodeEnv === 'test',
      variables: { ...process.env, ...Bun.env } as Record<string, string>,
      duoplusConfig: this.getDuoPlusConfig()
    };
  }

  /**
   * Benchmark function execution
   */
  static async benchmarkFunction<T>(
    name: string,
    fn: () => T | Promise<T>,
    iterations: number = 1
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    result: T;
    memoryBefore: MemoryAnalysis;
    memoryAfter: MemoryAnalysis;
  }> {
    const memoryBefore = this.analyzeMemoryUsage({});
    const startTime = Bun.nanoseconds();
    
    let result: T;
    if (iterations === 1) {
      result = await fn();
    } else {
      for (let i = 0; i < iterations - 1; i++) {
        await fn();
      }
      result = await fn();
    }
    
    const endTime = Bun.nanoseconds();
    const memoryAfter = this.analyzeMemoryUsage({});
    
    const totalTime = (endTime - startTime) / 1_000_000; // Convert to ms
    const averageTime = totalTime / iterations;
    
    return {
      name,
      iterations,
      totalTime,
      averageTime,
      result,
      memoryBefore,
      memoryAfter
    };
  }

  /**
   * Monitor memory usage over time
   */
  static async monitorMemory(
    duration: number,
    interval: number = 1000
  ): Promise<MemoryAnalysis[]> {
    const readings: MemoryAnalysis[] = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const analysis = this.analyzeMemoryUsage({});
      readings.push(analysis);
      await Bun.sleep(interval);
    }
    
    return readings;
  }

  /**
   * Detect memory leaks
   */
  static async detectMemoryLeaks(
    testFn: () => void | Promise<void>,
    iterations: number = 10,
    threshold: number = 1024 * 1024 // 1MB
  ): Promise<{
    hasLeak: boolean;
    leakSize: number;
    readings: MemoryAnalysis[];
  }> {
    const readings: MemoryAnalysis[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const before = this.analyzeMemoryUsage({});
      await testFn();
      
      if (global.gc) {
        global.gc();
      }
      
      const after = this.analyzeMemoryUsage({});
      readings.push(after);
      
      // Small delay between iterations
      await Bun.sleep(100);
    }
    
    // Check for memory growth
    const first = readings[0];
    const last = readings[readings.length - 1];
    const leakSize = last.heapUsed - first.heapUsed;
    
    return {
      hasLeak: leakSize > threshold,
      leakSize,
      readings
    };
  }

  /**
   * Get system capabilities
   */
  static getSystemCapabilities(): {
    supportsJSC: boolean;
    supportsSQLite: boolean;
    supportsFFI: boolean;
    supportsTLS: boolean;
    supportsWorkers: boolean;
    supportsFileWatcher: boolean;
  } {
    return {
      supportsJSC: typeof (Bun as any).jsc !== 'undefined',
      supportsSQLite: typeof (Bun as any).sqlite !== 'undefined',
      supportsFFI: typeof (Bun as any).ffi !== 'undefined',
      supportsTLS: true, // Bun always supports TLS
      supportsWorkers: typeof Worker !== 'undefined',
      supportsFileWatcher: typeof Bun.file !== 'undefined'
    };
  }

  /**
   * Generate system health report
   */
  static generateHealthReport(): string {
    const systemInfo = this.getSystemInfo();
    const memoryAnalysis = this.analyzeMemoryUsage({});
    const environmentInfo = this.getEnvironmentInfo();
    const capabilities = this.getSystemCapabilities();
    
    const lines: string[] = [];
    lines.push('=== System Health Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    // Bun Information
    lines.push('🦊 Bun Runtime:');
    lines.push(`  Version: ${systemInfo.bunVersion} (${systemInfo.bunRevision})`);
    lines.push(`  Entry: ${systemInfo.mainEntry}`);
    lines.push(`  Direct Execution: ${systemInfo.isDirectExecution ? 'Yes' : 'No'}`);
    lines.push('');
    
    // System Information
    lines.push('💻 System:');
    lines.push(`  Platform: ${systemInfo.platform} (${systemInfo.arch})`);
    lines.push(`  CPU Cores: ${systemInfo.hardwareConcurrency}`);
    lines.push(`  Node.js: ${systemInfo.nodeVersion}`);
    lines.push(`  Uptime: ${systemInfo.uptime.toFixed(0)}s`);
    lines.push('');
    
    // Memory Information
    lines.push('🧠 Memory:');
    lines.push(`  Heap Used: ${(memoryAnalysis.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  Heap Total: ${(memoryAnalysis.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  External: ${(memoryAnalysis.external / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`  Pressure: ${memoryAnalysis.pressure.toUpperCase()}`);
    lines.push('');
    
    // Environment
    lines.push('🌍 Environment:');
    lines.push(`  Mode: ${environmentInfo.nodeEnv}`);
    lines.push(`  Production: ${environmentInfo.isProduction ? 'Yes' : 'No'}`);
    lines.push('');
    
    // Capabilities
    lines.push('⚡ Capabilities:');
    lines.push(`  JSC: ${capabilities.supportsJSC ? '✅' : '❌'}`);
    lines.push(`  SQLite: ${capabilities.supportsSQLite ? '✅' : '❌'}`);
    lines.push(`  FFI: ${capabilities.supportsFFI ? '✅' : '❌'}`);
    lines.push(`  Workers: ${capabilities.supportsWorkers ? '✅' : '❌'}`);
    lines.push('');
    
    // Recommendations
    if (memoryAnalysis.recommendations.length > 0) {
      lines.push('💡 Recommendations:');
      for (const rec of memoryAnalysis.recommendations) {
        lines.push(`  • ${rec}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Get DuoPlus configuration
   */
  private static getDuoPlusConfig(): Record<string, any> {
    const config: Record<string, any> = {};
    
    // Common DuoPlus environment variables
    const duoVars = [
      'DUOPLUS_API_KEY',
      'DUOPLUS_ENDPOINT',
      'DUOPLUS_REGION',
      'DUOPLUS_ENVIRONMENT',
      'R2_BUCKET',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY'
    ];
    
    for (const varName of duoVars) {
      const value = Bun.env[varName] || process.env[varName];
      if (value) {
        config[varName] = value.includes('key') || value.includes('secret') 
          ? '***REDACTED***' 
          : value;
      }
    }
    
    return config;
  }

  /**
   * Create performance snapshot
   */
  static createSnapshot(): {
    timestamp: number;
    systemInfo: SystemInfo;
    memoryAnalysis: MemoryAnalysis;
    performanceMetrics: PerformanceMetrics;
  } {
    return {
      timestamp: Date.now(),
      systemInfo: this.getSystemInfo(),
      memoryAnalysis: this.analyzeMemoryUsage({}),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }

  /**
   * Compare two snapshots
   */
  static compareSnapshots(
    before: ReturnType<typeof BunRuntimeDetector.createSnapshot>,
    after: ReturnType<typeof BunRuntimeDetector.createSnapshot>
  ): {
    timeDelta: number;
    memoryDelta: number;
    performanceDelta: Partial<PerformanceMetrics>;
  } {
    return {
      timeDelta: after.timestamp - before.timestamp,
      memoryDelta: after.memoryAnalysis.heapUsed - before.memoryAnalysis.heapUsed,
      performanceDelta: {
        memoryUsage: {
          heapUsed: after.performanceMetrics.memoryUsage.heapUsed - before.performanceMetrics.memoryUsage.heapUsed,
          heapTotal: after.performanceMetrics.memoryUsage.heapTotal - before.performanceMetrics.memoryUsage.heapTotal,
          external: after.performanceMetrics.memoryUsage.external - before.performanceMetrics.memoryUsage.external,
          arrayBuffers: after.performanceMetrics.memoryUsage.arrayBuffers - before.performanceMetrics.memoryUsage.arrayBuffers,
          rss: 0 // Would need to be calculated
        } as NodeJS.MemoryUsage
      }
    };
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'health') {
    console.log(BunRuntimeDetector.generateHealthReport());
  } else if (args[0] === 'memory') {
    const agents = { agents: Array.from({ length: 10000 }, (_, i) => ({ id: i, balance: Math.random() * 1000 })) };
    const analysis = BunRuntimeDetector.analyzeMemoryUsage(agents);
    
    console.log('=== Memory Analysis ===');
    console.log(`Shallow: ${(analysis.shallowBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Heap Used: ${(analysis.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Heap Total: ${(analysis.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Pressure: ${analysis.pressure.toUpperCase()}`);
    console.log(`Ratio: ${(analysis.ratio * 100).toFixed(1)}%`);
    
    if (analysis.recommendations.length > 0) {
      console.log('\nRecommendations:');
      for (const rec of analysis.recommendations) {
        console.log(`  • ${rec}`);
      }
    }
  } else if (args[0] === 'benchmark') {
    const result = await BunRuntimeDetector.benchmarkFunction(
      'array-generation',
      () => Array.from({ length: 1000 }, (_, i) => ({ id: i, data: Math.random() })),
      100
    );
    
    console.log('=== Benchmark Result ===');
    console.log(`Function: ${result.name}`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`Average Time: ${result.averageTime.toFixed(4)}ms`);
    console.log(`Memory Before: ${(result.memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memory After: ${(result.memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  } else if (args[0] === 'monitor') {
    const duration = parseInt(args[1]) || 5000;
    console.log(`Monitoring memory for ${duration}ms...`);
    
    const readings = await BunRuntimeDetector.monitorMemory(duration, 1000);
    
    console.log('\n=== Memory Monitor Results ===');
    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];
      console.log(`Reading ${i + 1}: ${(reading.heapUsed / 1024 / 1024).toFixed(2)} MB (${reading.pressure})`);
    }
  } else {
    console.log('Usage:');
    console.log('  bun runtime-detector.ts health');
    console.log('  bun runtime-detector.ts memory');
    console.log('  bun runtime-detector.ts benchmark');
    console.log('  bun runtime-detector.ts monitor [duration]');
  }
}

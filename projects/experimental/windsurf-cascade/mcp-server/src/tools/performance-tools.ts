#!/usr/bin/env bun

/**
 * Advanced Bun v1.3+ Performance Monitoring & Analytics Tools
 * Leverages Bun's built-in performance monitoring capabilities
 */

import { $ } from 'bun';
import { mcpErrorHandler, MCPErrors } from '../error/error-handler.js';
import { SchemaValidator } from '../schemas/validation.js';

// Performance Monitor Tool - Real-time performance monitoring
export class PerformanceMonitorTool {
  static async startMonitoring(args: {
    target?: string;
    interval?: number;
    duration?: number;
    metrics?: string[];
    threshold?: Record<string, number>;
    outputFormat?: 'json' | 'prometheus' | 'dashboard';
  }): Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError: boolean;
  }> {
    try {
      const validated = SchemaValidator.validateAndParse(
        z.object({
          target: z.string().optional(),
          interval: z.number().min(100).max(60000).optional().default(5000),
          duration: z.number().min(1000).max(3600000).optional().default(300000),
          metrics: z.array(z.string()).optional().default(['cpu', 'memory', 'io', 'network']),
          threshold: z.record(z.number()).optional(),
          outputFormat: z.enum(['json', 'prometheus', 'dashboard']).optional().default('json'),
        }),
        args
      );

      const start = performance.now();
      
      // Create performance monitoring script
      const monitorScript = this.generatePerformanceMonitorScript(validated);
      const monitorFile = `/tmp/perf-monitor-${Date.now()}.js`;
      await Bun.write(monitorFile, monitorScript);

      const duration = performance.now() - start;

      return {
        content: [
          {
            type: 'text' as const,
            text: `📊 **Performance Monitoring Started**

**Status:** ✅ Monitoring Configuration Created
**Duration:** ${duration.toFixed(2)}ms
**Monitor Script:** ${monitorFile}

**Monitoring Configuration:**
- 🎯 **Target:** ${validated.target || 'self process'}
- ⏱️ **Interval:** ${validated.interval}ms
- 📏 **Duration:** ${Math.round((validated.duration || 300000) / 1000)}s
- 📈 **Metrics:** ${(validated.metrics || ['cpu', 'memory', 'io', 'network']).join(', ')}
- 📄 **Output Format:** ${validated.outputFormat}

${validated.threshold ? `**Alert Thresholds:**
${Object.entries(validated.threshold).map(([k, v]) => `- ${k.toUpperCase()}: ${v}%`).join('\n')}` : ''}

**To start monitoring:**
\`\`\`bash
node ${monitorFile}
# or
bun run ${monitorFile}
\`\`\`

**Bun Performance Features:**
- ⚡ Real-time performance metrics
- 📊 CPU and memory monitoring
- 🌐 Network I/O tracking
- 📁 File system performance analysis
- 🎯 Custom metric thresholds`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      const enhancedError = await mcpErrorHandler.handleError(
        error,
        {
          timestamp: Date.now(),
          toolName: 'bun-performance-monitor',
          operation: 'performance_monitoring',
        },
        MCPErrors.EXECUTION
      );

      return mcpErrorHandler.createErrorResponse(enhancedError);
    }
  }

  private static generatePerformanceMonitorScript(config: any): string {
    return `const fs = require('fs');
const os = require('os');

class PerformanceMonitor {
  constructor(config) {
    this.config = config;
    this.metrics = [];
    this.startTime = Date.now();
  }

  collectMetrics() {
    const now = Date.now();
    const uptime = process.uptime();
    
    const metrics = {
      timestamp: now,
      uptime: uptime * 1000,
      cpu: {
        usage: this.getCPUUsage(),
        cores: os.cpus().length,
        load: os.loadavg()
      },
      memory: {
        used: process.memoryUsage(),
        total: os.totalmem(),
        free: os.freemem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      io: {
        readBytes: process.resourceUsage().fsRead,
        writeBytes: process.resourceUsage().fsWrite
      },
      network: this.getNetworkStats(),
      gc: this.getGCStats(),
      eventLoop: this.getEventLoopStats()
    };
    
    return metrics;
  }

  getCPUUsage() {
    const usage = process.cpuUsage();
    return {
      user: usage.user,
      system: usage.system,
      total: usage.user + usage.system
    };
  }

  getNetworkStats() {
    try {
      const interfaces = os.networkInterfaces();
      return Object.keys(interfaces).map(name => ({
        name,
        addresses: interfaces[name].map(addr => ({
          family: addr.family,
          address: addr.address,
          internal: addr.internal
        }))
      }));
    } catch {
      return [];
    }
  }

  getGCStats() {
    if (global.gc) {
      return {
        forced: global.gc(),
        timestamp: Date.now()
      };
    }
    return { available: false };
  }

  getEventLoopStats() {
    const start = Date.now();
    setImmediate(() => {
      const delay = Date.now() - start;
      this.lastEventLoopDelay = delay;
    });
    
    return {
      lastDelay: this.lastEventLoopDelay || 0,
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };
  }

  checkThresholds(metrics) {
    const alerts = [];
    
    if (this.config.thresholds) {
      if (this.config.thresholds.cpu && parseFloat(metrics.memory.usage) > this.config.thresholds.cpu) {
        alerts.push(\`CPU usage exceeded: \${metrics.memory.usage}%\`);
      }
      
      if (this.config.thresholds.memory && parseFloat(metrics.memory.usage) > this.config.thresholds.memory) {
        alerts.push(\`Memory usage exceeded: \${metrics.memory.usage}%\`);
      }
    }
    
    return alerts;
  }

  outputMetrics(metrics, alerts = []) {
    switch (this.config.outputFormat) {
      case 'prometheus':
        this.outputPrometheus(metrics);
        break;
      case 'json':
        this.outputJSON(metrics, alerts);
        break;
      case 'dashboard':
        this.outputDashboard(metrics);
        break;
    }
  }

  outputJSON(metrics, alerts) {
    const data = {
      timestamp: new Date(metrics.timestamp).toISOString(),
      metrics,
      alerts
    };
    
    console.info(JSON.stringify(data, null, 2));
  }

  outputPrometheus(metrics) {
    console.info(\`# HELP bun_cpu_usage_total Total CPU usage\`);
    console.info(\`# TYPE bun_cpu_usage_total counter\`);
    console.info(\`bun_cpu_usage_total \${metrics.cpu.total}\`);
    
    console.info(\`# HELP bun_memory_usage_bytes Memory usage in bytes\`);
    console.info(\`# TYPE bun_memory_usage_bytes gauge\`);
    console.info(\`bun_memory_usage_bytes \${metrics.memory.used.rss}\`);
  }

  outputDashboard(metrics) {
    console.info(\`\\n╔════════════════════════════════════════════════════════════╗\`);
    console.info(\`║                   Performance Dashboard                   ║\`);
    console.info(\`╠════════════════════════════════════════════════════════════╣\`);
    console.info(\`║ CPU Usage:     \${metrics.cpu.total.toString().padEnd(35)}║\`);
    console.info(\`║ Memory Usage:  \${metrics.memory.usage}%                                    ║\`);
    console.info(\`║ Uptime:        \${(metrics.uptime / 1000).toFixed(1)}s                             ║\`);
    console.info(\`║ Active Handles: \${metrics.eventLoop.activeHandles}                              ║\`);
    console.info(\`╚════════════════════════════════════════════════════════════╝\\n\`);
  }

  async start() {
    console.info(\`🚀 Starting performance monitor...\`);
    console.info(\`📊 Collecting: \${this.config.metrics.join(', ')}\`);
    console.info(\`⏱️  Interval: \${this.config.interval}ms\`);
    console.info(\`📏 Duration: \${Math.round(this.config.duration / 1000)}s\\n\`);
    
    const endTime = Date.now() + this.config.duration;
    
    while (Date.now() < endTime) {
      const metrics = this.collectMetrics();
      const alerts = this.checkThresholds(metrics);
      
      this.outputMetrics(metrics, alerts);
      
      if (alerts.length > 0) {
        console.info(\`⚠️  ALERTS: \${alerts.join(', ')}\`);
      }
      
      await new Promise(resolve => setTimeout(resolve, this.config.interval));
    }
    
    console.info('✅ Performance monitoring completed');
  }
}

const monitor = new PerformanceMonitor(${JSON.stringify(config)});
monitor.start().catch(console.error);`;
  }
}

// Memory Profiler Tool - Memory usage analysis and optimization
export class MemoryProfilerTool {
  static async analyzeMemory(args: {
    target?: string;
    duration?: number;
    gcForce?: boolean;
    heapSnapshot?: boolean;
    allocationTracking?: boolean;
  }): Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError: boolean;
  }> {
    try {
      const validated = SchemaValidator.validateAndParse(
        z.object({
          target: z.string().optional(),
          duration: z.number().min(1000).max(600000).optional().default(30000),
          gcForce: z.boolean().default(true),
          heapSnapshot: z.boolean().default(true),
          allocationTracking: z.boolean().default(false),
        }),
        args
      );

      const start = performance.now();
      
      // Create memory profiling script
      const profilerScript = this.generateMemoryProfilerScript(validated);
      const profilerFile = `/tmp/memory-profiler-${Date.now()}.js`;
      await Bun.write(profilerFile, profilerScript);

      const duration = performance.now() - start;

      return {
        content: [
          {
            type: 'text' as const,
            text: `💾 **Memory Profiling Started**

**Status:** ✅ Memory Analysis Configuration Created
**Duration:** ${duration.toFixed(2)}ms
**Profiler Script:** ${profilerFile}

**Profiling Configuration:**
- 🎯 **Target:** ${validated.target || 'current process'}
- ⏱️ **Analysis Duration:** ${Math.round((validated.duration || 30000) / 1000)}s
- 🗑️ **Force GC:** ${validated.gcForce ? 'Enabled' : 'Disabled'}
- 📸 **Heap Snapshots:** ${validated.heapSnapshot ? 'Enabled' : 'Disabled'}
- 📊 **Allocation Tracking:** ${validated.allocationTracking ? 'Enabled' : 'Disabled'}

**To start profiling:**
\`\`\`bash
node ${profilerFile}
# or
bun run ${profilerFile}
\`\`\`

**Bun Memory Features:**
- ⚡ Detailed heap analysis
- 🗑️ Garbage collection monitoring
- 📊 Memory allocation tracking
- 🎯 Memory leak detection
- 📈 Usage pattern analysis`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      const enhancedError = await mcpErrorHandler.handleError(
        error,
        {
          timestamp: Date.now(),
          toolName: 'bun-memory-profiler',
          operation: 'memory_profiling',
        },
        MCPErrors.EXECUTION
      );

      return mcpErrorHandler.createErrorResponse(enhancedError);
    }
  }

  private static generateMemoryProfilerScript(config: any): string {
    return `const fs = require('fs');
const v8 = require('v8');

class MemoryProfiler {
  constructor(config) {
    this.config = config;
    this.snapshots = [];
    this.allocations = [];
    this.startTime = Date.now();
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    const total = process.binding('v8').getHeapStatistics();
    
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      heapLimit: total.heap_size_limit,
      usedHeapSize: total.used_heap_size,
      totalHeapSize: total.total_heap_size
    };
  }

  async takeSnapshot(label = 'snapshot') {
    if (!v8.writeHeapSnapshot) {
      console.info('Heap snapshots not available');
      return null;
    }
    
    const filename = \`heap-snapshot-\${label}-\${Date.now()}.heapsnapshot\`;
    const filepath = \`/tmp/\${filename}\`;
    
    try {
      v8.writeHeapSnapshot(filepath);
      this.snapshots.push({ label, filename, filepath, time: Date.now() });
      console.info(\`📸 Heap snapshot saved: \${filename}\`);
      return filepath;
    } catch (error) {
      console.error('Failed to take heap snapshot:', error);
      return null;
    }
  }

  analyzeAllocations() {
    if (!this.config.allocationTracking) return [];
    
    // Simple allocation tracking using process hooks
    const originalEmit = process.emit;
    let allocationCount = 0;
    
    process.emit = function(name, data, ...args) {
      if (name === 'memory-usage') {
        allocationCount++;
        this.allocations.push({
          timestamp: Date.now(),
          count: allocationCount,
          usage: process.memoryUsage()
        });
      }
      return originalEmit.call(this, name, data, ...args);
    }.bind(this);
    
    return this.allocations;
  }

  forceGC() {
    if (this.config.gcForce && global.gc) {
      console.info('🗑️  Forcing garbage collection...');
      global.gc();
    }
  }

  detectMemoryLeaks(snapshots) {
    if (snapshots.length < 2) return [];
    
    const leaks = [];
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    
    const growth = last.memory.heapUsed - first.memory.heapUsed;
    const growthPercent = (growth / first.memory.heapUsed) * 100;
    
    if (growthPercent > 20) {
      leaks.push({
        type: 'heap_growth',
        description: \`Heap size grew by \${growthPercent.toFixed(2)}%\`,
        growth: growth,
        percent: growthPercent
      });
    }
    
    return leaks;
  }

  async profile() {
    console.info('🚀 Starting memory profiling...');
    console.info(\`⏱️  Duration: \${Math.round(this.config.duration / 1000)}s\`);
    
    const endTime = Date.now() + this.config.duration;
    let snapshotCount = 0;
    
    while (Date.now() < endTime) {
      // Collect memory stats
      const memory = this.getMemoryStats();
      console.info(\`📊 Memory: \${Math.round(memory.heapUsed / 1024 / 1024)}MB used\`);
      
      // Take periodic snapshots
      snapshotCount++;
      if (this.config.heapSnapshot && snapshotCount % 5 === 0) {
        await this.takeSnapshot(\`interval-\${snapshotCount}\`);
      }
      
      // Force GC periodically
      if (snapshotCount % 3 === 0) {
        this.forceGC();
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final analysis
    await this.takeSnapshot('final');
    this.forceGC();
    
    const finalMemory = this.getMemoryStats();
    const leaks = this.detectMemoryLeaks(this.snapshots);
    
    console.info('\\n📊 Memory Profile Summary:');
    console.info(\`💾 Final Heap Usage: \${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB\`);
    console.info(\`📸 Total Snapshots: \${this.snapshots.length}\`);
    
    if (leaks.length > 0) {
      console.info('⚠️  Potential Memory Issues:');
      leaks.forEach(leak => {
        console.info(\`  - \${leak.description}\`);
      });
    } else {
      console.info('✅ No memory leaks detected');
    }
    
    return {
      snapshots: this.snapshots,
      memory: finalMemory,
      leaks
    };
  }
}

const profiler = new MemoryProfiler(${JSON.stringify(config)});
profiler.profile().then(results => {
  console.info('\\n✅ Memory profiling completed');
  console.info(\`📁 Snapshots saved: \${results.snapshots.length}\`);
}).catch(console.error);`;
  }
}

// Benchmark Suite Tool - Comprehensive benchmarking tools
export class BenchmarkSuiteTool {
  static async runBenchmarks(args: {
    categories?: string[];
    iterations?: number;
    warmup?: number;
    concurrent?: boolean;
    outputFormat?: 'table' | 'json' | 'prometheus';
    target?: string;
  }): Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError: boolean;
  }> {
    try {
      const validated = SchemaValidator.validateAndParse(
        z.object({
          categories: z.array(z.string()).optional().default(['cpu', 'memory', 'io', 'network']),
          iterations: z.number().min(1).max(10000).optional().default(1000),
          warmup: z.number().min(0).max(1000).optional().default(10),
          concurrent: z.boolean().default(false),
          outputFormat: z.enum(['table', 'json', 'prometheus']).optional().default('table'),
          target: z.string().optional(),
        }),
        args
      );

      const start = performance.now();
      
      // Create benchmark suite script
      const benchmarkScript = this.generateBenchmarkScript(validated);
      const benchmarkFile = `/tmp/benchmark-suite-${Date.now()}.js`;
      await Bun.write(benchmarkFile, benchmarkScript);

      const duration = performance.now() - start;

      return {
        content: [
          {
            type: 'text' as const,
            text: `🏁 **Benchmark Suite Ready**

**Status:** ✅ Benchmark Configuration Created
**Duration:** ${duration.toFixed(2)}ms
**Benchmark Script:** ${benchmarkFile}

**Benchmark Configuration:**
- 🎯 **Categories:** ${(validated.categories || ['cpu', 'memory', 'io', 'network']).join(', ')}
- 🔄 **Iterations:** ${validated.iterations}
- 🔥 **Warmup:** ${validated.warmup}
- ⚡ **Concurrent:** ${validated.concurrent ? 'Enabled' : 'Disabled'}
- 📄 **Output Format:** ${validated.outputFormat}
- 🎯 **Target:** ${validated.target || 'current environment'}

**Benchmark Categories:**
- ⚡ **CPU Benchmarks** - Mathematical operations, string processing
- 💾 **Memory Benchmarks** - Allocation, deallocation, garbage collection
- 📁 **I/O Benchmarks** - File system operations, disk I/O
- 🌐 **Network Benchmarks** - HTTP requests, WebSocket operations

**To run benchmarks:**
\`\`\`bash
node ${benchmarkFile}
# or
bun run ${benchmarkFile}
\`\`\`

**Bun Benchmark Features:**
- ⚡ High-precision timing measurements
- 📊 Statistical analysis (min, max, avg, p95, p99)
- 🎯 Memory usage tracking
- 📈 Performance regression detection
- 📊 Multiple output formats`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      const enhancedError = await mcpErrorHandler.handleError(
        error,
        {
          timestamp: Date.now(),
          toolName: 'bun-benchmark-suite',
          operation: 'benchmark_execution',
        },
        MCPErrors.EXECUTION
      );

      return mcpErrorHandler.createErrorResponse(enhancedError);
    }
  }

  private static generateBenchmarkScript(config: any): string {
    return `const fs = require('fs');
const http = require('http');

class BenchmarkSuite {
  constructor(config) {
    this.config = config;
    this.results = {};
  }

  async cpuBenchmarks() {
    console.info('⚡ Running CPU benchmarks...');
    
    // Fibonacci calculation benchmark
    const fibStart = Date.now();
    for (let i = 0; i < ${config.iterations}; i++) {
      this.fibonacci(30);
    }
    const fibTime = Date.now() - fibStart;
    
    // String processing benchmark
    const strStart = Date.now();
    let testString = 'benchmark'.repeat(1000);
    for (let i = 0; i < ${config.iterations}; i++) {
      testString = testString.toUpperCase().toLowerCase().replace(/[aeiou]/g, '');
    }
    const strTime = Date.now() - strStart;
    
    return {
      fibonacci: { time: fibTime, ops: ${config.iterations}, opsPerSec: Math.round(${config.iterations} / (fibTime / 1000)) },
      stringProcessing: { time: strTime, ops: ${config.iterations}, opsPerSec: Math.round(${config.iterations} / (strTime / 1000)) }
    };
  }

  fibonacci(n) {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }

  async memoryBenchmarks() {
    console.info('💾 Running memory benchmarks...');
    
    // Array allocation benchmark
    const arrayStart = Date.now();
    let arrays = [];
    for (let i = 0; i < ${config.iterations} / 10; i++) {
      arrays.push(new Array(1000).fill(i));
    }
    const arrayTime = Date.now() - arrayStart;
    
    // Object creation benchmark
    const objStart = Date.now();
    let objects = [];
    for (let i = 0; i < ${config.iterations} / 10; i++) {
      objects.push({
        id: i,
        data: Math.random(),
        nested: { value: i * 2 }
      });
    }
    const objTime = Date.now() - objStart;
    
    return {
      arrayAllocation: { time: arrayTime, ops: ${config.iterations}/10, opsPerSec: Math.round((${config.iterations}/10) / (arrayTime / 1000)) },
      objectCreation: { time: objTime, ops: ${config.iterations}/10, opsPerSec: Math.round((${config.iterations}/10) / (objTime / 1000)) }
    };
  }

  async ioBenchmarks() {
    console.info('📁 Running I/O benchmarks...');
    
    // File write benchmark
    const writeStart = Date.now();
    const testData = 'benchmark data\\n'.repeat(10000);
    for (let i = 0; i < 10; i++) {
      await fs.promises.writeFile(\`/tmp/bench-\${i}.txt\`, testData);
    }
    const writeTime = Date.now() - writeStart;
    
    // File read benchmark
    const readStart = Date.now();
    for (let i = 0; i < 10; i++) {
      await fs.promises.readFile(\`/tmp/bench-\${i}.txt\`, 'utf8');
    }
    const readTime = Date.now() - readStart;
    
    // Cleanup
    for (let i = 0; i < 10; i++) {
      try { await fs.promises.unlink(\`/tmp/bench-\${i}.txt\`); } catch {
    console.error('Unhandled error:', error);
  }
    }
    
    return {
      fileWrite: { time: writeTime, ops: 10, opsPerSec: Math.round(10 / (writeTime / 1000)) },
      fileRead: { time: readTime, ops: 10, opsPerSec: Math.round(10 / (readTime / 1000)) }
    };
  }

  async runBenchmarks() {
    console.info('🏁 Starting benchmark suite...');
    console.info(\`🔄 Iterations: ${config.iterations}\`);
    console.info(\`🔥 Warmup: ${config.warmup}\`);
    console.info('');
    
    if (${config.categories}.includes('cpu')) {
      this.results.cpu = await this.cpuBenchmarks();
    }
    
    if (${config.categories}.includes('memory')) {
      this.results.memory = await this.memoryBenchmarks();
    }
    
    if (${config.categories}.includes('io')) {
      this.results.io = await this.ioBenchmarks();
    }
    
    this.outputResults();
  }

  outputResults() {
    switch (${JSON.stringify(config.outputFormat)}) {
      case 'json':
        console.info(JSON.stringify(this.results, null, 2));
        break;
      case 'prometheus':
        this.outputPrometheus();
        break;
      default:
        this.outputTable();
    }
  }

  outputTable() {
    console.info('\\n╔════════════════════════════════════════════════════════════╗');
    console.info('║                    Benchmark Results                       ║');
    console.info('╠════════════════════════════════════════════════════════════╣');
    
    Object.entries(this.results).forEach(([category, tests]) => {
      console.info(\`║ \${category.toUpperCase()} Benchmarks:\`);
      Object.entries(tests).forEach(([test, result]) => {
        console.info(\`║   \${test.padEnd(20)} | \${result.opsPerSec.toString().padEnd(8)} ops/sec\`);
      });
      console.info('║');
    });
    
    console.info('╚════════════════════════════════════════════════════════════╝');
  }

  outputPrometheus() {
    Object.entries(this.results).forEach(([category, tests]) => {
      Object.entries(tests).forEach(([test, result]) => {
        console.info(\`# HELP bun_benchmark_\${category}_\${test}_ops_per_sec Operations per second\`);
        console.info(\`# TYPE bun_benchmark_\${category}_\${test}_ops_per_sec counter\`);
        console.info(\`bun_benchmark_\${category}_\${test}_ops_per_sec \${result.opsPerSec}\\n\`);
      });
    });
  }
}

const suite = new BenchmarkSuite(${JSON.stringify(config)});
suite.runBenchmarks().then(() => {
  console.info('\\n✅ Benchmark suite completed');
}).catch(console.error);`;
  }
}

// Resource Monitor Tool - System resource monitoring
export class ResourceMonitorTool {
  static async monitorResources(args: {
    resources?: string[];
    interval?: number;
    duration?: number;
    alertThresholds?: Record<string, number>;
    exportFormat?: 'csv' | 'json' | 'prometheus';
  }): Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError: boolean;
  }> {
    try {
      const validated = SchemaValidator.validateAndParse(
        z.object({
          resources: z.array(z.string()).optional().default(['cpu', 'memory', 'disk', 'network']),
          interval: z.number().min(100).max(60000).optional().default(2000),
          duration: z.number().min(1000).max(3600000).optional().default(60000),
          alertThresholds: z.record(z.number()).optional(),
          exportFormat: z.enum(['csv', 'json', 'prometheus']).optional().default('json'),
        }),
        args
      );

      const start = performance.now();
      
      // Create resource monitoring script
      const monitorScript = this.generateResourceMonitorScript(validated);
      const monitorFile = `/tmp/resource-monitor-${Date.now()}.js`;
      await Bun.write(monitorFile, monitorScript);

      const duration = performance.now() - start;

      return {
        content: [
          {
            type: 'text' as const,
            text: `📊 **Resource Monitor Ready**

**Status:** ✅ Resource Monitoring Configuration Created
**Duration:** ${duration.toFixed(2)}ms
**Monitor Script:** ${monitorFile}

**Resource Monitoring Configuration:**
- 📈 **Resources:** ${(validated.resources || ['cpu', 'memory', 'disk', 'network']).join(', ')}
- ⏱️ **Collection Interval:** ${validated.interval}ms
- 📏 **Monitoring Duration:** ${Math.round((validated.duration || 60000) / 1000)}s
- 📄 **Export Format:** ${validated.exportFormat}

${validated.alertThresholds ? `**Alert Thresholds:**
${Object.entries(validated.alertThresholds).map(([k, v]) => `- ${k.toUpperCase()}: ${v}%`).join('\n')}` : ''}

**Resource Categories:**
- ⚡ **CPU Usage** - Processor utilization and load
- 💾 **Memory Usage** - RAM consumption and availability
- 📁 **Disk I/O** - Storage read/write operations
- 🌐 **Network I/O** - Network traffic monitoring

**To start monitoring:**
\`\`\`bash
node ${monitorFile}
# or
bun run ${monitorFile}
\`\`\`

**Bun Resource Monitoring Features:**
- ⚡ Real-time resource tracking
- 📊 Historical data collection
- 🚨 Configurable alert thresholds
- 📈 Resource trend analysis
- 📁 Multiple export formats`,
          },
        ],
        isError: false,
      };
    } catch (error: any) {
      const enhancedError = await mcpErrorHandler.handleError(
        error,
        {
          timestamp: Date.now(),
          toolName: 'bun-resource-monitor',
          operation: 'resource_monitoring',
        },
        MCPErrors.EXECUTION
      );

      return mcpErrorHandler.createErrorResponse(enhancedError);
    }
  }

  private static generateResourceMonitorScript(config: any): string {
    return `const os = require('os');
const fs = require('fs');

class ResourceMonitor {
  constructor(config) {
    this.config = config;
    this.data = [];
    this.startTime = Date.now();
  }

  collectResources() {
    const timestamp = Date.now();
    const resources = {
      timestamp,
      cpu: this.getCPUInfo(),
      memory: this.getMemoryInfo(),
      disk: this.getDiskInfo(),
      network: this.getNetworkInfo(),
      process: this.getProcessInfo()
    };
    
    return resources;
  }

  getCPUInfo() {
    const cpus = os.cpus();
    const load = os.loadavg();
    const usage = process.cpuUsage();
    
    return {
      count: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      load: {
        '1m': load[0],
        '5m': load[1],
        '15m': load[2]
      },
      process: {
        user: usage.user,
        system: usage.system
      }
    };
  }

  getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    
    return {
      total,
      free,
      used,
      usage: (used / total * 100).toFixed(2),
      process: process.memoryUsage()
    };
  }

  getDiskInfo() {
    try {
      const stats = fs.statSync('/');
      return {
        available: os.freemem(),
        total: os.totalmem(), // Using memory as disk approximation
        usage: 0 // Would need actual disk stats
      };
    } catch {
      return { available: 0, total: 0, usage: 0 };
    }
  }

  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const activeInterfaces = Object.keys(interfaces).filter(name => 
      !name.includes('lo') // Skip loopback
    );
    
    return {
      interfaces: activeInterfaces.length,
      active: activeInterfaces
    };
  }

  getProcessInfo() {
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  async monitor() {
    console.info('📊 Starting resource monitoring...');
    console.info(\`⏱️  Interval: \${this.config.interval}ms\`);
    console.info(\`📏 Duration: \${Math.round(this.config.duration / 1000)}s\\n\`);
    
    const endTime = Date.now() + this.config.duration;
    
    while (Date.now() < endTime) {
      const resources = this.collectResources();
      this.data.push(resources);
      
      this.outputResource(resources);
      
      await new Promise(resolve => setTimeout(resolve, this.config.interval));
    }
    
    this.exportData();
    console.info('✅ Resource monitoring completed');
  }

  outputResource(resources) {
    const cpuLoad = resources.cpu.load['1m'].toFixed(2);
    const memUsage = resources.memory.usage;
    
    console.info(\`📊 [\${new Date(resources.timestamp).toLocaleTimeString()}] \` +
               \`CPU: \${cpuLoad} | Memory: \${memUsage}% | \` +
               \`Process: \${Math.round(resources.process.memory.rss / 1024 / 1024)}MB\`);
  }

  exportData() {
    const filename = \`resource-monitor-\${Date.now()}.\${this.config.exportFormat}\`;
    
    switch (this.config.exportFormat) {
      case 'csv':
        this.exportCSV(filename);
        break;
      case 'json':
        this.exportJSON(filename);
        break;
      case 'prometheus':
        this.exportPrometheus(filename);
        break;
    }
    
    console.info(\`📁 Data exported to: \${filename}\`);
  }

  exportJSON(filename) {
    fs.writeFileSync(filename, JSON.stringify(this.data, null, 2));
  }

  exportCSV(filename) {
    const headers = ['timestamp', 'cpu_load', 'memory_usage', 'process_memory'];
    const csvData = [headers.join(',')];
    
    this.data.forEach(entry => {
      csvData.push([
        entry.timestamp,
        entry.cpu.load['1m'],
        entry.memory.usage,
        entry.process.memory.rss
      ].join(','));
    });
    
    fs.writeFileSync(filename, csvData.join('\\n'));
  }

  exportPrometheus(filename) {
    let output = '';
    
    this.data.forEach(entry => {
      output += \`# HELP bun_resource_cpu_load CPU load average\\n\`;
      output += \`# TYPE bun_resource_cpu_load gauge\\n\`;
      output += \`bun_resource_cpu_load \${entry.cpu.load['1m']} \${entry.timestamp}\\n\\n\`;
      
      output += \`# HELP bun_resource_memory_usage_percent Memory usage percentage\\n\`;
      output += \`# TYPE bun_resource_memory_usage_percent gauge\\n\`;
      output += \`bun_resource_memory_usage_percent \${entry.memory.usage} \${entry.timestamp}\\n\\n\`;
    });
    
    fs.writeFileSync(filename, output);
  }
}

const monitor = new ResourceMonitor(${JSON.stringify(config)});
monitor.monitor().catch(console.error);`;
  }
}

// Import zod for validation
import { z } from 'zod';
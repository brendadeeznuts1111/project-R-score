# Omega Phase 3.25 - Bun Utilities Integration Guide

## 🚀 Overview

This guide demonstrates how to leverage Bun's powerful utility APIs for enhanced operations in Omega Phase 3.25. From tool resolution to performance monitoring, these utilities provide the foundation for a robust, high-performance system.

## 📋 Table of Contents

1. [Core Utilities](#core-utilities)
2. [Performance Tools](#performance-tools)
3. [Stream & Serialization](#stream--serialization)
4. [CLI & Display](#cli--display)
5. [Security & Validation](#security--validation)
6. [Integration Examples](#integration-examples)
7. [Best Practices](#best-practices)

## 🔧 Core Utilities

### Bun.which() - Tool Resolution

The cornerstone for executable discovery in Omega.

```typescript
import { omegaUtils } from '../utils/omega-utilities.ts';

// Basic tool resolution
const bunPath = await omegaUtils.resolveTool('bun');
console.log(`Bun found at: ${bunPath}`);

// Batch validation
const validation = await omegaUtils.validateTools(['bun', 'git', 'node']);
if (!validation.valid) {
  console.error(`Missing tools: ${validation.missing.join(', ')}`);
}
```

**Key Features:**
- Caching for performance
- Multiple resolution strategies
- Project-local tool priority
- Security-aware path handling

### Bun.resolveSync() - Module Resolution

Secure module and file path resolution.

```typescript
// Resolve database paths securely
const dbPath = Bun.resolveSync('./data/pools.db', import.meta.dir);

// Resolve project modules
const configPath = Bun.resolveSync('./config/omega.json', process.cwd());
```

## ⚡ Performance Tools

### Bun.nanoseconds() - High-Precision Timing

Essential for performance monitoring in Omega pools.

```typescript
// Benchmark pool operations
const start = Bun.nanoseconds();
await pools.matrix.query('SELECT * FROM metrics');
const duration = Bun.nanoseconds() - start;

console.log(`Query took: ${duration}ns (${duration / 1000000}ms)`);
```

### Bun.peek() - Non-blocking Promise Inspection

Monitor async operations without blocking.

```typescript
// Monitor pool health checks
const healthCheck = pools.health.check();
const status = Bun.peek.status(healthCheck);

if (status === 'fulfilled') {
  const result = Bun.peek(healthCheck);
  console.log('Pool is healthy:', result);
}
```

### bun:jsc Memory Utilities

Memory profiling and optimization.

```typescript
import { serialize, deserialize, estimateShallowMemoryUsageOf } from 'bun:jsc';

// Estimate memory usage
const memUsage = estimateShallowMemoryUsageOf(pools);
console.log(`Pool memory usage: ${memUsage} bytes`);

// Serialize pool state
const snapshot = serialize(pools);
await Bun.write('pool-snapshot.bin', snapshot);

// Restore pool state
const restored = deserialize(await Bun.file('pool-snapshot.bin').arrayBuffer());
```

## 🌊 Stream & Serialization

### Bun.readableStreamTo*() - Stream Consumption

Handle API responses and file streams efficiently.

```typescript
// Consume API response as JSON
const response = await fetch('https://api.example.com/pools');
const data = await Bun.readableStreamToJSON(response.body);

// Convert to ArrayBuffer for binary storage
const binary = await Bun.readableStreamToArrayBuffer(stream);
```

### Bun.fileURLToPath() / Bun.pathToFileURL()

Cross-platform path handling.

```typescript
// Convert paths for different environments
const fileUrl = Bun.pathToFileURL('./config.json');
const filePath = Bun.fileURLToPath(fileUrl);

// Use in pool configuration
const config = await Bun.file(filePath).json();
```

## 🖥️ CLI & Display

### Bun.inspect.table() - Beautiful Tables

Perfect for CLI dashboards and reports.

```typescript
// Create pool status table
const poolData = pools.map(pool => ({
  name: pool.name,
  status: pool.status,
  connections: pool.connections.length,
  memory: `${pool.memoryUsage}MB`
}));

const table = Bun.inspect.table(poolData, ['name', 'status', 'connections', 'memory'], 
  { colors: true });

console.log(table);
```

### Bun.stringWidth() - Terminal Formatting

Ensure proper alignment in CLI output.

```typescript
// Calculate column widths
const columns = ['Pool Name', 'Status', 'Memory'];
const widths = columns.map(col => Bun.stringWidth(col));

// Align output properly
pools.forEach(pool => {
  const line = [
    pool.name.padEnd(widths[0]),
    pool.status.padEnd(widths[1]),
    `${pool.memory}MB`.padEnd(widths[2])
  ].join(' | ');
  console.log(line);
});
```

### Bun.wrapAnsi() / Bun.stripANSI()

Handle terminal output gracefully.

```typescript
// Wrap long lines for narrow terminals
const wrapped = Bun.wrapAnsi(longOutput, 80, { wordWrap: true });

// Strip ANSI for logs
const clean = Bun.stripANSI(coloredOutput);
```

### Bun.escapeHTML() - Web Dashboard Safety

Sanitize content for Omega web interface.

```typescript
// Safe dashboard content
const safeContent = Bun.escapeHTML(userInput);
const safeJson = Bun.escapeHTML(JSON.stringify(data));
```

## 🔒 Security & Validation

### Bun.deepEquals() - Configuration Validation

Ensure configuration integrity.

```typescript
// Validate pool configuration
const expectedConfig = { maxConnections: 100, timeout: 30000 };
const isValid = Bun.deepEquals(poolConfig, expectedConfig, true);

if (!isValid) {
  console.warn('Pool configuration mismatch!');
}
```

### Custom Security with Bun.which()

Secure executable execution.

```typescript
// Validate tool before execution
const toolPath = Bun.which('sqlite3', { 
  cwd: '/restricted/path',
  PATH: '/bin:/usr/bin' // Restricted PATH
});

if (!toolPath || !toolPath.startsWith('/usr/bin/')) {
  throw new Error('Unauthorized tool access');
}
```

## 🎯 Integration Examples

### Example 1: Pool Health Monitor

```typescript
// utils/pool-health-monitor.ts
export class PoolHealthMonitor {
  private sessionId: string;
  
  constructor() {
    this.sessionId = Bun.randomUUIDv7('base64');
  }
  
  async generateReport() {
    const start = Bun.nanoseconds();
    
    // Collect pool data
    const pools = await this.collectPoolData();
    
    // Generate table
    const table = Bun.inspect.table(pools, 
      ['name', 'status', 'connections', 'memory', 'uptime'],
      { colors: true }
    );
    
    // Calculate metrics
    const duration = Bun.nanoseconds() - start;
    const memUsage = Bun.estimateShallowMemoryUsageOf(pools);
    
    return {
      sessionId: this.sessionId,
      table: Bun.wrapAnsi(table, 80),
      plainText: Bun.stripANSI(table),
      metrics: {
        duration: `${duration / 1000000}ms`,
        memory: `${memUsage} bytes`,
        pools: pools.length
      }
    };
  }
}
```

### Example 2: Tool Validation Service

```typescript
// utils/tool-validator.ts
export class ToolValidator {
  private requiredTools = ['bun', 'git', 'node', 'npm'];
  private cache = new Map<string, string | null>();
  
  async validateEnvironment(): Promise<{
    valid: boolean;
    report: string;
    tools: Record<string, string | null>;
  }> {
    const results: Record<string, string | null> = {};
    
    // Check each tool
    for (const tool of this.requiredTools) {
      if (this.cache.has(tool)) {
        results[tool] = this.cache.get(tool)!;
      } else {
        const path = await this.resolveTool(tool);
        results[tool] = path;
        this.cache.set(tool, path);
      }
    }
    
    // Generate report
    const valid = Object.values(results).every(Boolean);
    const report = this.generateReport(results);
    
    return { valid, report, tools: results };
  }
  
  private async resolveTool(tool: string): Promise<string | null> {
    // Try project-local first
    const localPath = Bun.which(tool, { 
      cwd: process.cwd(),
      PATH: `./node_modules/.bin:${Bun.env.PATH}`
    });
    
    if (localPath) return localPath;
    
    // Fall back to system
    return Bun.which(tool);
  }
  
  private generateReport(tools: Record<string, string | null>): string {
    const data = Object.entries(tools).map(([tool, path]) => ({
      tool,
      path: path || 'Not found',
      status: path ? '✅' : '❌'
    }));
    
    return Bun.inspect.table(data, ['tool', 'path', 'status'], { colors: true });
  }
}
```

### Example 3: Performance Profiler

```typescript
// utils/performance-profiler.ts
export class PerformanceProfiler {
  private measurements: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }> = [];
  
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Bun.nanoseconds();
    const result = await fn();
    const duration = Bun.nanoseconds() - start;
    
    this.measurements.push({
      name,
      duration,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  generateReport(): string {
    const sorted = [...this.measurements].sort((a, b) => b.duration - a.duration);
    
    const data = sorted.map(m => ({
      operation: m.name,
      duration: `${(m.duration / 1000000).toFixed(3)}ms`,
      'duration (ns)': m.duration.toLocaleString(),
      timestamp: new Date(m.timestamp).toISOString()
    }));
    
    return Bun.inspect.table(data, 
      ['operation', 'duration', 'duration (ns)', 'timestamp'],
      { colors: true }
    );
  }
  
  exportData(): ArrayBuffer {
    const { serialize } = require('bun:jsc');
    return serialize({
      measurements: this.measurements,
      summary: {
        total: this.measurements.length,
        average: this.measurements.reduce((s, m) => s + m.duration, 0) / this.measurements.length,
        max: Math.max(...this.measurements.map(m => m.duration)),
        min: Math.min(...this.measurements.map(m => m.duration))
      }
    });
  }
}
```

## 📚 Best Practices

### 1. Tool Resolution
- Always cache tool paths for performance
- Validate paths before execution
- Use restricted PATH for security

### 2. Performance Monitoring
- Use `nanoseconds()` for precise measurements
- Leverage `peek()` for non-blocking monitoring
- Serialize performance data for analysis

### 3. CLI Output
- Use `inspect.table()` for structured data
- Respect terminal width with `wrapAnsi()`
- Provide plain text with `stripANSI()`

### 4. Memory Management
- Monitor with `estimateShallowMemoryUsageOf()`
- Serialize state for persistence
- Clean up resources properly

### 5. Security
- Validate all executable paths
- Sanitize web content with `escapeHTML()`
- Use `deepEquals()` for configuration validation

## 🔗 Related Files

- `/utils/omega-tool-resolver.ts` - Enhanced tool resolution
- `/utils/omega-utilities.ts` - Integrated utility class
- `/examples/mega-which-table-enhanced.ts` - Comprehensive demo
- `/examples/bun-utilities-demo.ts` - Basic utilities demo

## 🚀 Quick Start

```typescript
import { omegaUtils } from './utils/omega-utilities.ts';

// Validate tools
const validation = await omegaUtils.validateTools(['bun', 'git']);
console.log(validation.report);

// Create session
const session = omegaUtils.createSession('omega-pool');

// Monitor performance
const metrics = await omegaUtils.monitorOperation(
  pools.matrix.stats(),
  'pool-stats'
);

// Export data
const json = omegaUtils.exportData('json');
```

---

*This guide is part of Omega Phase 3.25 documentation. For more information, see the project README.*

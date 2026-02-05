#!/usr/bin/env bun

/**
 * Bun.inspect() & Bun.inspect.table() - Practical Examples
 *
 * This file demonstrates various real-world usage patterns for Bun's inspection utilities.
 * Run with: bun run bun-inspect-example.ts
 */

import { inspect } from "bun";

// =============================================================================
// 🎯 BASIC OBJECT INSPECTION
// =============================================================================

console.log("🎯 BASIC OBJECT INSPECTION");
console.log("=".repeat(50));

// Simple object inspection
const user = {
  id: 123,
  name: "Alice Johnson",
  email: "alice@example.com",
  profile: {
    age: 28,
    location: "San Francisco, CA",
    interests: ["coding", "music", "travel"]
  }
};

console.log("User object:");
console.log(inspect(user, { colors: true, depth: 3 }));

// Binary data inspection
const buffer = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]);
console.log("\nBinary data:");
console.log(inspect(buffer));

// =============================================================================
// 🎭 CUSTOM INSPECTION WITH SYMBOL
// =============================================================================

console.log("\n\n🎭 CUSTOM INSPECTION");
console.log("=".repeat(50));

/**
 * CustomProxyServer - Production-ready implementation with comprehensive custom object inspection
 * in Bun with proper error handling, color support, and serialization.
 */
class CustomProxyServer {
  constructor(name: string, initialConnections = 0) {
    this.name = name;
    this.connections = initialConnections;
    this.startedAt = new Date();
    this.maxConnections = 10000;
    this.region = 'us-east-1';
    this.tags = new Map();
    this.handlers = new Map();
  }

  name: string;
  connections: number;
  startedAt: Date;
  maxConnections: number;
  region: string;
  tags: Map<string, any>;
  handlers: Map<string, Function>;

  /**
   * Gets the time elapsed since server startup with proper error handling
   */
  get timeSinceStart() {
    try {
      const elapsed = Date.now() - this.startedAt.getTime();
      if (elapsed < 0) return 'Clock skew detected';

      const seconds = Math.floor(elapsed / 1000);
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
      return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Determines server load status based on connection count
   */
  get status() {
    const ratio = this.connections / this.maxConnections;
    if (ratio > 0.9) return { level: 'critical', icon: '🔴', text: 'Critical' };
    if (ratio > 0.7) return { level: 'warning', icon: '🟡', text: 'High Load' };
    if (ratio > 0.4) return { level: 'moderate', icon: '🟢', text: 'Normal' };
    return { level: 'low', icon: '⚪', text: 'Idle' };
  }

  /**
   * Calculates connections per minute since start
   */
  get connectionsPerMinute() {
    try {
      const elapsedSeconds = (Date.now() - this.startedAt.getTime()) / 1000;
      if (elapsedSeconds <= 0) return 0;
      return Math.round(this.connections / (elapsedSeconds / 60));
    } catch {
      return 0;
    }
  }

  /**
   * Serializes server state to JSON
   */
  toJSON() {
    return {
      name: this.name,
      connections: this.connections,
      maxConnections: this.maxConnections,
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      region: this.region,
      status: this.status.text,
      tags: Object.fromEntries(this.tags),
      connectionsPerMinute: this.connectionsPerMinute
    };
  }

  /**
   * Primary custom inspection method with comprehensive options
   */
  [inspect.custom](depth?: number, options?: any) {
    // Handle negative depth for summary representation
    if (depth !== undefined && depth < 0) {
      return options?.stylize(`[CustomProxyServer: ${this.name}]`, 'special');
    }

    // Merge options with sensible defaults
    const opts = {
      ...options,
      colors: options?.colors ?? true,
      depth: options?.depth ?? 2
    };

    // Create styled components
    const nameStylized = opts.stylize ? opts.stylize(this.name, 'string') : this.name;
    const statusStylized = opts.stylize ?
      opts.stylize(`${this.status.icon} ${this.status.text}`,
        this.status.level === 'critical' || this.status.level === 'warning' ? 'warning' : 'string') :
      `${this.status.icon} ${this.status.text}`;
    const connectionsStylized = opts.stylize ? opts.stylize(this.connections.toString(), 'number') : this.connections.toString();
    const uptimeStylized = opts.stylize ? opts.stylize(this.timeSinceStart, 'date') : this.timeSinceStart;
    const cpmStylized = opts.stylize ? opts.stylize(`${this.connectionsPerMinute}/min`, 'number') : `${this.connectionsPerMinute}/min`;

    // Compact single-line format for shallow inspection
    if (opts.depth === 0 || opts.compact) {
      return `${nameStylized} ${statusStylized} (${connectionsStylized} connections, ${uptimeStylized})`;
    }

    // Detailed multi-line format for deeper inspection
    const details = {
      Name: nameStylized,
      Status: statusStylized,
      Connections: `${connectionsStylized} / ${opts.stylize ? opts.stylize(this.maxConnections.toString(), 'number') : this.maxConnections}`,
      Uptime: uptimeStylized,
      'Connections/min': cpmStylized,
      Region: opts.stylize ? opts.stylize(this.region, 'string') : this.region,
      Started: opts.stylize ? opts.stylize(this.startedAt.toLocaleString(), 'date') : this.startedAt.toLocaleString()
    };

    // Format as table-like structure
    const maxKeyLength = Math.max(...Object.keys(details).map(k => k.length));
    const lines = Object.entries(details).map(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      const keyStyled = opts.stylize ? opts.stylize(paddedKey, 'special') : paddedKey;
      return `  ${keyStyled}: ${value}`;
    });

    return `CustomProxyServer {\n${lines.join('\n')}\n}`;
  }

  /**
   * Alternative simple format for quick logging
   */
  toString() {
    return `${this.name} [${this.status.text}] - ${this.connections} connections (${this.timeSinceStart})`;
  }

  /**
   * Instance method to add tags for metadata tracking
   */
  setTag(key: string, value: any) {
    this.tags.set(key, value);
    return this;
  }

  /**
   * Instance method to register connection handlers
   */
  registerHandler(event: string, handler: Function) {
    this.handlers.set(event, handler);
    return this;
  }

  connect() {
    this.connections++;
  }

  disconnect() {
    this.connections--;
  }
}

// Create multiple server instances for demonstration
const servers = [
  new CustomProxyServer('WebSocket Proxy', 1250).setTag('env', 'production').setTag('version', '2.1.0'),
  new CustomProxyServer('REST API Gateway', 3400).setTag('env', 'staging').setTag('version', '2.1.0-beta'),
  new CustomProxyServer('GraphQL Endpoint', 890).setTag('env', 'development').setTag('version', '2.0.0')
];

// Simulate connection updates for demonstration
servers[0].connections = 1250;
servers[1].connections = 8723;
servers[2].connections = 45;

// Add more connections to demonstrate status changes
for (let i = 0; i < 1200; i++) {
  servers[0].connect();
}

console.log("Enhanced Custom inspection:");
console.log("Simple format:");
console.log(servers[0]); // Uses custom inspect

console.log("\nColored format:");
console.log(inspect(servers[0], { colors: true, depth: 3 })); // Colored, deeper

console.log("\nJSON serialization:");
console.log(JSON.stringify(servers[0], null, 2)); // JSON serialization

console.log("\nDepth-limited inspection:");
console.log(inspect(servers[0], { depth: 0 })); // Limited depth

console.log("\nCompact format:");
console.log(inspect(servers[0], { compact: true })); // Compact format

console.log("\nMonochrome format:");
console.log(inspect(servers[0], { colors: false })); // No colors

console.log("\nString representation:");
console.log(servers[0].toString()); // toString method

// ============================================================================
// UTILITY FUNCTIONS DEMONSTRATION
// ============================================================================

/**
 * Formats server status with color coding based on load level
 */
function formatServerStatus(server: CustomProxyServer, options: any = {}) {
  const useColors = options.colors ?? true;
  const colorMap: Record<string, string> = {
    critical: useColors ? '\x1b[31m' : '',      // Red
    warning: useColors ? '\x1b[33m' : '',       // Yellow
    moderate: useColors ? '\x1b[32m' : '',      // Green
    low: useColors ? '\x1b[37m' : ''            // White
  };

  const reset = useColors ? '\x1b[0m' : '';
  const color = colorMap[server.status.level] || reset;

  return `${color}${server.status.icon} ${server.name}: ${server.status.text} ` +
         `(${server.connections} connections)${reset}`;
}

/**
 * Generates a summary report for multiple servers
 */
function generateServerReport(serverList: CustomProxyServer[]) {
  const report = {
    totalServers: serverList.length,
    totalConnections: serverList.reduce((sum, s) => sum + s.connections, 0),
    serversByStatus: {} as Record<string, number>,
    averageConnections: 0
  };

  // Categorize by status
  serverList.forEach(server => {
    const status = server.status.text;
    report.serversByStatus[status] = (report.serversByStatus[status] || 0) + 1;
  });

  report.averageConnections = Math.round(report.totalConnections / serverList.length);

  return report;
}

console.log("\n📊 Formatted Server Status:");
console.log('─'.repeat(50));
servers.forEach(server => console.log(formatServerStatus(server)));

console.log("\n📈 Server Summary Report:");
console.log('─'.repeat(50));
const report = generateServerReport(servers);
console.log(inspect(report, { depth: 3, colors: true }));

console.log("\n📋 Array of Servers:");
console.log('─'.repeat(50));
console.log(inspect(servers, { depth: 2 }));

// =============================================================================
// 📊 TABLE EXAMPLES
// =============================================================================

console.log("\n\n📊 TABLE EXAMPLES");
console.log("=".repeat(50));

// 1. Simple array of objects
const users = [
  { id: 1, name: "Alice", role: "admin", status: "active" },
  { id: 2, name: "Bob", role: "user", status: "active" },
  { id: 3, name: "Charlie", role: "user", status: "inactive" },
  { id: 4, name: "Diana", role: "moderator", status: "active" }
];

console.log("Simple table:");
console.log(inspect.table(users));

// 2. Custom column definitions with formatting
const metrics = {
  columns: [
    { key: "service", header: "Service", type: "string", width: 15 },
    { key: "requests", header: "Requests/min", type: "number", align: "right" },
    { key: "latency", header: "Avg Latency", type: "number", format: (v: number) => `${v}ms` },
    { key: "status", header: "Status", type: "badge" },
    { key: "uptime", header: "Uptime", type: "number", format: (v: number) => `${v.toFixed(1)}%` }
  ],
  rows: [
    { service: "API Gateway", requests: 1250, latency: 45, status: "healthy", uptime: 99.9 },
    { service: "Database", requests: 890, latency: 12, status: "healthy", uptime: 99.8 },
    { service: "Cache", requests: 2100, latency: 3, status: "warning", uptime: 98.5 },
    { service: "Auth Service", requests: 450, latency: 78, status: "critical", uptime: 95.2 }
  ]
};

console.log("\nCustom formatted table:");
console.log(inspect.table(metrics, {
  theme: "dark",
  showBorder: true,
  caption: "System Metrics Dashboard"
}));

// =============================================================================
// 🔄 REAL-TIME MONITORING EXAMPLE
// =============================================================================

console.log("\n\n🔄 REAL-TIME MONITORING");
console.log("=".repeat(50));

class SystemMonitor {
  private metrics = {
    cpu: 0,
    memory: 0,
    connections: 0,
    requests: 0
  };

  updateMetrics() {
    // Simulate metric updates
    this.metrics.cpu = Math.random() * 100;
    this.metrics.memory = Math.random() * 100;
    this.metrics.connections = Math.floor(Math.random() * 1000);
    this.metrics.requests = Math.floor(Math.random() * 10000);
  }

  displayDashboard() {
    const dashboard = {
      columns: [
        { key: "metric", header: "Metric", type: "string", width: 15 },
        { key: "value", header: "Value", type: "number", align: "right" },
        { key: "unit", header: "Unit", type: "string", width: 8 },
        { key: "status", header: "Status", type: "badge", width: 10 }
      ],
      rows: [
        {
          metric: "CPU Usage",
          value: this.metrics.cpu,
          unit: "%",
          status: this.metrics.cpu > 80 ? "critical" : this.metrics.cpu > 60 ? "warning" : "healthy"
        },
        {
          metric: "Memory",
          value: this.metrics.memory,
          unit: "%",
          status: this.metrics.memory > 85 ? "critical" : this.metrics.memory > 70 ? "warning" : "healthy"
        },
        {
          metric: "Connections",
          value: this.metrics.connections,
          unit: "conn",
          status: "healthy"
        },
        {
          metric: "Requests/min",
          value: this.metrics.requests,
          unit: "req/m",
          status: "healthy"
        }
      ]
    };

    console.clear();
    console.log(inspect.table(dashboard, {
      theme: "dark",
      showBorder: true,
      compact: true,
      caption: `System Monitor - ${new Date().toLocaleTimeString()}`
    }));
  }

  start(intervalMs: number = 2000) {
    const monitor = () => {
      this.updateMetrics();
      this.displayDashboard();
    };

    // Initial display
    monitor();

    // Update at intervals
    setInterval(monitor, intervalMs);
  }
}

// Uncomment to run real-time monitoring
// const monitor = new SystemMonitor();
// monitor.start(2000);

// =============================================================================
// 🧪 TESTING WITH INSPECT
// =============================================================================

console.log("\n\n🧪 TESTING EXAMPLES");
console.log("=".repeat(50));

// Enhanced debug utilities with multiple output formats
global.debug = (value: any, label?: string, options: any = {}) => {
  const opts = {
    colors: true,
    depth: 3,
    showHidden: false,
    maxArrayLength: 10,
    maxStringLength: 100,
    ...options
  };

  console.log(`🔍 ${label || "Debug"}:`, inspect(value, opts));
};

global.debugTable = (data: any, options: any = {}) => {
  console.log(inspect.table(data, {
    theme: "dark",
    compact: true,
    showBorder: true,
    ...options
  }));
};

// Advanced debug utilities
global.debugJSON = (value: any, label?: string, indent: number = 2) => {
  console.log(`📄 ${label || "JSON"}:`, JSON.stringify(value, null, indent));
};

global.debugInspect = (value: any, label?: string, inspectOptions: any = {}) => {
  const opts = {
    colors: true,
    depth: 4,
    showHidden: true,
    getters: true,
    ...inspectOptions
  };

  console.log(`🔎 ${label || "Inspect"}:`, inspect(value, opts));
};

global.debugPerformance = (fn: () => any, label?: string, iterations: number = 100) => {
  const start = performance.now();
  let result;

  for (let i = 0; i < iterations; i++) {
    result = fn();
  }

  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`⚡ ${label || "Performance"}:`, {
    iterations,
    totalTime: `${totalTime.toFixed(2)}ms`,
    avgTime: `${avgTime.toFixed(4)}ms`,
    opsPerSecond: `${(1000 / avgTime).toFixed(0)} ops/sec`
  });

  return result;
};

global.debugCompare = (values: any[], labels?: string[], options: any = {}) => {
  console.log("📊 Comparison:");

  values.forEach((value, index) => {
    const label = labels?.[index] || `Item ${index + 1}`;
    debug(value, label, options);
  });
};

// Example usage with enhanced utilities
console.log("Enhanced Debug utility examples:");
debug(user, "User data");

console.log("\nDebug table example:");
debugTable(users, { caption: "User List" });

console.log("\nJSON debug example:");
debugJSON(user, "User as JSON");

console.log("\nDeep inspection example:");
debugInspect(servers[0], "Server deep inspection", { depth: 2 });

console.log("\nPerformance comparison:");
debugPerformance(() => inspect(user), "User inspection", 1000);
debugPerformance(() => JSON.stringify(user), "User JSON stringify", 1000);

console.log("\nComparison example:");
debugCompare([user, servers[0]], ["User Object", "Server Object"], { depth: 1 });

// =============================================================================
// 🚀 PERFORMANCE COMPARISON
// =============================================================================

console.log("\n\n🚀 PERFORMANCE COMPARISON");
console.log("=".repeat(50));

function benchmark(fn: () => void, name: string, iterations: number = 1000): { name: string, time: number, avg: number } {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const time = end - start;
  return { name, time, avg: time / iterations };
}

// Test data
const largeObject = {
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    profile: {
      age: 20 + (i % 30),
      city: `City ${i % 50}`,
      settings: {
        theme: i % 2 ? "dark" : "light",
        notifications: !!(i % 3)
      }
    }
  }))
};

const results = [
  benchmark(() => inspect(largeObject), "Bun.inspect"),
  benchmark(() => JSON.stringify(largeObject), "JSON.stringify"),
  benchmark(() => Bun.inspect.table(largeObject.users), "Bun.inspect.table")
];

const perfTable = {
  columns: [
    { key: "name", header: "Method", type: "string" },
    { key: "time", header: "Total Time (ms)", type: "number", format: (v: number) => v.toFixed(2) },
    { key: "avg", header: "Avg Time (ms)", type: "number", format: (v: number) => v.toFixed(4) }
  ],
  rows: results
};

console.log("Performance benchmark results:");
console.log(inspect.table(perfTable, {
  theme: "dark",
  caption: `Performance Test (${results[0].time < results[1].time ? 'Bun.inspect is faster!' : 'JSON.stringify is faster'})`
}));

// =============================================================================
// 🔗 INTEGRATION WITH BUN APIs
// =============================================================================

console.log("\n\n🔗 BUN API INTEGRATION");
console.log("=".repeat(50));

// Example with Bun.serve
const exampleServer = Bun.serve({
  port: 3001,
  async fetch(req) {
    // Log request with inspect
    console.log("📨 Incoming request:", inspect({
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    }, { colors: true, depth: 1 }));

    // Return response
    return new Response(JSON.stringify({
      message: "Hello from Bun.inspect example!",
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get("user-agent")
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
});

console.log("🚀 Server started:", inspect(exampleServer, { colors: true }));

// Example with Bun.build
async function buildExample() {
  try {
    const result = await Bun.build({
      entrypoints: ["./bun-inspect-example.ts"],
      outdir: "./dist",
      minify: true
    });

    console.log("🏗️ Build result:", inspect(result, { colors: true, depth: 2 }));

    if (result.outputs) {
      const buildTable = {
        columns: [
          { key: "path", header: "Output Path", type: "string" },
          { key: "size", header: "Size", type: "bytes" }
        ],
        rows: result.outputs.map(output => ({
          path: output.path,
          size: output.size
        }))
      };

      console.log(inspect.table(buildTable, {
        theme: "dark",
        caption: "Build Outputs"
      }));
    }
  } catch (error) {
    console.error("Build failed:", inspect(error, { colors: true }));
  }
}

// Uncomment to test build integration
// await buildExample();

// =============================================================================
// 🎨 ADVANCED FORMATTING
// =============================================================================

console.log("\n\n🎨 ADVANCED FORMATTING");
console.log("=".repeat(50));

// Complex data with custom formatting
const complexData = {
  columns: [
    {
      key: "timestamp",
      header: "Time",
      type: "datetime",
      width: 20
    },
    {
      key: "level",
      header: "Level",
      type: "badge",
      width: 10
    },
    {
      key: "message",
      header: "Message",
      type: "string",
      width: 40
    },
    {
      key: "data",
      header: "Data",
      type: "json",
      width: 30
    }
  ],
  rows: [
    {
      timestamp: new Date(),
      level: "info",
      message: "Server started successfully",
      data: { port: 3000, mode: "development" }
    },
    {
      timestamp: new Date(Date.now() - 5000),
      level: "warning",
      message: "High memory usage detected",
      data: { memoryUsage: 85, threshold: 80 }
    },
    {
      timestamp: new Date(Date.now() - 10000),
      level: "error",
      message: "Database connection failed",
      data: { error: "ECONNREFUSED", retryCount: 3 }
    }
  ]
};

console.log("Advanced formatted table:");
console.log(inspect.table(complexData, {
  theme: "dark",
  showBorder: true,
  zebra: true,
  caption: "Application Logs"
}));

console.log("\n🎉 Bun.inspect() examples completed!");
console.log("Run this file with: bun run bun-inspect-example.ts");

// Cleanup
exampleServer.stop();
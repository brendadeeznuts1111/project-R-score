# 📊 **Bun.inspect() & Bun.inspect.table() - Complete Guide**

## 🎯 **Quick Start**

### **Basic Object Inspection**
```javascript
import { inspect } from "bun";

// 1. Simple object inspection
const obj = { foo: "bar", nested: { key: "value" }, array: [1, 2, 3] };
console.log(inspect(obj));
// Output:
// {
//   foo: "bar",
//   nested: {
//     key: "value"
//   },
//   array: [ 1, 2, 3 ]
// }

// 2. Binary data inspection
const buffer = new Uint8Array([1, 2, 3, 4, 5]);
console.log(inspect(buffer));
// Output: Uint8Array(5) [ 1, 2, 3, 4, 5 ]

// 3. Custom depth and colors
console.log(inspect(obj, {
  depth: 2,
  colors: true,
  showHidden: false
}));
```

### **Custom Inspection with Symbol**
```javascript
import { inspect } from "bun";

class CustomProxyServer {
  constructor(name, connections) {
    this.name = name;
    this.connections = connections;
    this.startedAt = new Date();
  }

  // Custom inspection implementation
  [inspect.custom]() {
    return `${this.name} (${this.connections} connections, started ${this.timeSinceStart})`;
  }

  get timeSinceStart() {
    const seconds = Math.floor((Date.now() - this.startedAt) / 1000);
    return `${seconds}s ago`;
  }
}

const server = new CustomProxyServer("WebSocket Proxy", 1250);
console.log(server); // Output: WebSocket Proxy (1250 connections, started 0s ago)
console.log(inspect(server)); // Same output
```

## 📊 **Bun.inspect.table() - Complete Guide**

### **Basic Table Examples**

#### **1. Simple Data Display**
```javascript
import { inspect } from "bun";

// Array of objects (auto-detects columns)
const protocols = [
  { name: "HTTP", port: 80, secure: false, status: "active" },
  { name: "HTTPS", port: 443, secure: true, status: "active" },
  { name: "WebSocket", port: 3000, secure: false, status: "connecting" },
  { name: "WSS", port: 8443, secure: true, status: "active" }
];

console.log(inspect.table(protocols));
```

#### **2. Custom Column Definitions**
```javascript
const proxyConfigs = {
  columns: [
    { key: "property", header: "Property", type: "string", width: 20 },
    { key: "type", header: "Type", type: "string", width: 15 },
    { key: "required", header: "Required", type: "boolean" },
    { key: "default", header: "Default", type: "string", width: 15 },
    { key: "description", header: "Description", type: "string", width: 40 }
  ],
  rows: [
    { property: "listenHost", type: "string", required: false, default: '"0.0.0.0"', description: "Host to bind server to" },
    { property: "listenPort", type: "number", required: false, default: "random", description: "Port to listen on (0=auto)" },
    { property: "targetUrl", type: "string", required: true, default: "-", description: "Backend WebSocket URL" },
    { property: "maxConnections", type: "number", required: false, default: "10000", description: "Maximum concurrent connections" },
    { property: "idleTimeout", type: "number", required: false, default: "60000", description: "Idle timeout in milliseconds" }
  ]
};

console.log(inspect.table(proxyConfigs));
```

### **Advanced Table Features**

#### **Column Types and Formatting**
```javascript
const metricsTable = {
  columns: [
    {
      key: "metric",
      header: "Metric",
      type: "string",
      width: 25
    },
    {
      key: "value",
      header: "Value",
      type: "number",
      align: "right",
      format: (value, row) => {
        if (row.metric.includes("Latency")) return `${value}ms`;
        if (row.metric.includes("Memory")) return `${(value / 1024 / 1024).toFixed(2)} MB`;
        if (row.metric.includes("Percentage")) return `${value}%`;
        return value.toLocaleString();
      }
    },
    {
      key: "status",
      header: "Status",
      type: "badge",
      format: (value) => {
        const colors = {
          healthy: { text: "✓ Healthy", color: "green" },
          warning: { text: "⚠ Warning", color: "yellow" },
          critical: { text: "✗ Critical", color: "red" }
        };
        return colors[value] || { text: value, color: "gray" };
      }
    },
    {
      key: "trend",
      header: "Trend",
      type: "string",
      format: (value) => {
        const arrows = {
          up: "↗",
          down: "↘",
          stable: "→"
        };
        return arrows[value] || value;
      }
    }
  ],
  rows: [
    { metric: "Active Connections", value: 2456, status: "healthy", trend: "up" },
    { metric: "Avg Latency", value: 42.5, status: "healthy", trend: "down" },
    { metric: "Memory Usage", value: 256 * 1024 * 1024, status: "warning", trend: "up" },
    { metric: "Error Rate", value: 0.12, status: "warning", trend: "stable" },
    { metric: "CPU Usage Percentage", value: 78, status: "critical", trend: "up" }
  ]
};

console.log(inspect.table(metricsTable, {
  theme: "dark",
  showBorder: true,
  zebra: true
}));
```

#### **Sorting and Filtering**
```javascript
const sortedTable = {
  columns: [
    { key: "protocol", header: "Protocol", type: "string", sortable: true },
    { key: "connections", header: "Connections", type: "number", sortable: true },
    { key: "latency", header: "Latency (ms)", type: "number", sortable: true },
    { key: "status", header: "Status", type: "badge" }
  ],
  rows: [
    { protocol: "HTTP", connections: 1500, latency: 28, status: "active" },
    { protocol: "HTTPS", connections: 2200, latency: 45, status: "active" },
    { protocol: "WebSocket", connections: 850, latency: 120, status: "active" },
    { protocol: "WSS", connections: 1200, latency: 85, status: "connecting" },
    { protocol: "MQTT", connections: 450, latency: 65, status: "inactive" }
  ]
};

// Display with sorting
console.log(inspect.table(sortedTable, {
  sortBy: "connections",
  sortOrder: "desc",
  filter: (row) => row.status !== "inactive"
}));
```

### **Theme and Styling Options**

#### **Complete Theme Configuration**
```javascript
const options = {
  // Display options
  maxRows: 100,
  maxColumns: 10,
  showHeaders: true,
  showBorder: true,
  compact: false,
  zebra: true,
  truncate: true,

  // Sorting & filtering
  sortBy: "latency",
  sortOrder: "asc",

  // Styling
  theme: "dark", // "dark" or "light"
  colors: true,

  // Output format
  output: "text", // "text", "html", "json", "csv", "markdown"

  // Custom styling
  style: {
    border: "rounded", // "single", "double", "rounded", "none"
    padding: 1,
    margin: 0,
    align: "center"
  }
};

console.log(inspect.table(yourData, options));
```

#### **Custom Color Themes**
```javascript
const customTheme = {
  dark: {
    border: "#4A5568",
    header: {
      text: "#F0F4F8",
      background: "#2D3748"
    },
    cell: {
      text: "#A0AEC0",
      background: {
        normal: "#1A202C",
        zebra: "#252D3A"
      }
    },
    accent: {
      green: "#10B981",
      red: "#EF4444",
      yellow: "#F59E0B",
      blue: "#3B82F6",
      purple: "#8B5CF6"
    }
  },
  light: {
    border: "#CBD5E0",
    header: {
      text: "#2D3748",
      background: "#EDF2F7"
    },
    cell: {
      text: "#4A5568",
      background: {
        normal: "#FFFFFF",
        zebra: "#F7FAFC"
      }
    },
    accent: {
      green: "#059669",
      red: "#DC2626",
      yellow: "#D97706",
      blue: "#2563EB",
      purple: "#7C3AED"
    }
  }
};

console.log(inspect.table(data, {
  theme: "dark",
  colors: customTheme
}));
```

## 🔄 **Dynamic and Real-time Examples**

### **Real-time Monitoring Dashboard**
```javascript
import { inspect } from "bun";

class LiveDashboard {
  constructor() {
    this.metrics = {
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      requestRate: 0
    };
  }

  async updateMetrics() {
    // Simulate fetching real-time data
    this.metrics = {
      activeConnections: Math.floor(Math.random() * 10000),
      memoryUsage: Math.random() * 512,
      cpuUsage: Math.random() * 100,
      requestRate: Math.floor(Math.random() * 10000)
    };
  }

  render() {
    const tableData = {
      columns: [
        { key: "metric", header: "Metric", type: "string", width: 25 },
        { key: "value", header: "Value", type: "number", align: "right" },
        { key: "unit", header: "Unit", type: "string", width: 10 },
        { key: "status", header: "Status", type: "badge", width: 12 },
        { key: "chart", header: "Chart", type: "string", width: 20 }
      ],
      rows: [
        {
          metric: "Active Connections",
          value: this.metrics.activeConnections,
          unit: "conn",
          status: this.metrics.activeConnections > 8000 ? "warning" : "healthy",
          chart: this.generateBar(this.metrics.activeConnections / 10000 * 100)
        },
        {
          metric: "Memory Usage",
          value: this.metrics.memoryUsage,
          unit: "MB",
          status: this.metrics.memoryUsage > 400 ? "warning" : "healthy",
          chart: this.generateBar(this.metrics.memoryUsage / 512 * 100)
        },
        {
          metric: "CPU Usage",
          value: this.metrics.cpuUsage,
          unit: "%",
          status: this.metrics.cpuUsage > 80 ? "critical" : "healthy",
          chart: this.generateBar(this.metrics.cpuUsage)
        },
        {
          metric: "Request Rate",
          value: this.metrics.requestRate,
          unit: "req/s",
          status: "healthy",
          chart: this.generateBar(this.metrics.requestRate / 10000 * 100)
        }
      ]
    };

    console.clear();
    console.log(inspect.table(tableData, {
      theme: "dark",
      showBorder: true,
      compact: true,
      caption: `Live Dashboard - ${new Date().toLocaleTimeString()}`
    }));
  }

  generateBar(percentage) {
    const width = 15;
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  start() {
    setInterval(async () => {
      await this.updateMetrics();
      this.render();
    }, 1000);
  }
}

const dashboard = new LiveDashboard();
dashboard.start();
```

### **Interactive Table Viewer**
```javascript
import { inspect } from "bun";
import { readline } from "node:readline/promises";

class InteractiveTableViewer {
  constructor(data, options = {}) {
    this.data = data;
    this.options = options;
    this.currentPage = 1;
    this.pageSize = options.pageSize || 20;
    this.sortColumn = options.sortBy;
    this.sortOrder = options.sortOrder || "asc";
    this.filterText = "";

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.clear();
    this.render();

    this.rl.on('line', async (input) => {
      switch (input.trim()) {
        case 'n':
          this.nextPage();
          break;
        case 'p':
          this.prevPage();
          break;
        case 's':
          await this.promptSort();
          break;
        case 'f':
          await this.promptFilter();
          break;
        case 'q':
          this.exit();
          break;
        default:
          console.log('Unknown command');
      }
      this.render();
    });
  }

  render() {
    const paginatedData = this.getCurrentPage();
    console.clear();
    console.log(inspect.table(paginatedData, {
      ...this.options,
      caption: this.getCaption()
    }));
    console.log(this.getControls());
  }

  getCurrentPage() {
    let rows = [...this.data.rows];

    // Apply filtering
    if (this.filterText) {
      rows = rows.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(this.filterText.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (this.sortColumn) {
      rows.sort((a, b) => {
        const aVal = a[this.sortColumn];
        const bVal = b[this.sortColumn];
        if (typeof aVal === 'string') {
          return this.sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return this.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Apply pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    return {
      columns: this.data.columns,
      rows: rows.slice(start, end)
    };
  }

  getCaption() {
    const totalRows = this.filterText
      ? this.data.rows.filter(row =>
          Object.values(row).some(value =>
            String(value).toLowerCase().includes(this.filterText.toLowerCase())
          )
        ).length
      : this.data.rows.length;

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, totalRows);

    let caption = `Page ${this.currentPage} - Showing ${start}-${end} of ${totalRows}`;

    if (this.sortColumn) {
      caption += ` | Sorted by: ${this.sortColumn} (${this.sortOrder})`;
    }

    if (this.filterText) {
      caption += ` | Filter: "${this.filterText}"`;
    }

    return caption;
  }

  getControls() {
    return `
Controls:
[n] Next Page    [p] Previous Page    [s] Sort    [f] Filter    [q] Quit
`;
  }

  nextPage() {
    const totalRows = this.filterText
      ? this.data.rows.filter(row =>
          Object.values(row).some(value =>
            String(value).toLowerCase().includes(this.filterText.toLowerCase())
          )
        ).length
      : this.data.rows.length;

    if (this.currentPage * this.pageSize < totalRows) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  async promptSort() {
    console.log('Available columns:');
    this.data.columns.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.header} (${col.key})`);
    });

    const input = await this.rl.question('Select column number: ');
    const index = parseInt(input) - 1;

    if (index >= 0 && index < this.data.columns.length) {
      this.sortColumn = this.data.columns[index].key;
      const order = await this.rl.question('Sort order (asc/desc) [asc]: ');
      this.sortOrder = order.toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
  }

  async promptFilter() {
    const input = await this.rl.question('Filter text (leave empty to clear): ');
    this.filterText = input.trim();
    this.currentPage = 1;
  }

  exit() {
    this.rl.close();
    process.exit(0);
  }
}

// Usage
const data = {
  columns: [
    { key: "name", header: "Name", type: "string" },
    { key: "status", header: "Status", type: "badge" },
    { key: "connections", header: "Connections", type: "number" },
    { key: "latency", header: "Latency", type: "number" }
  ],
  rows: [
    // Your data here...
  ]
};

const viewer = new InteractiveTableViewer(data, {
  theme: "dark",
  pageSize: 10,
  showBorder: true
});
viewer.start();
```

## 📤 **Export and Integration**

### **Export to Different Formats**
```javascript
import { inspect } from "bun";

async function exportTable(data, format = "text") {
  const options = {
    output: format,
    theme: "dark",
    showBorder: true
  };

  const result = inspect.table(data, options);

  switch (format) {
    case "html":
      await Bun.write("table.html", `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0B0E14; color: #F0F4F8; font-family: monospace; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #2D3748; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #4A5568; }
    tr:nth-child(even) { background: #1A202C; }
  </style>
</head>
<body>
  ${result}
</body>
</html>`);
      break;

    case "json":
      const jsonData = JSON.parse(result);
      await Bun.write("table.json", JSON.stringify(jsonData, null, 2));
      break;

    case "csv":
      await Bun.write("table.csv", result);
      break;

    case "markdown":
      await Bun.write("table.md", result);
      break;

    default:
      console.log(result);
  }

  return result;
}

// Usage
const data = {
  columns: [
    { key: "protocol", header: "Protocol" },
    { key: "status", header: "Status" }
  ],
  rows: [
    { protocol: "HTTP", status: "active" },
    { protocol: "HTTPS", status: "active" }
  ]
};

// Export to all formats
await Promise.all([
  exportTable(data, "html"),
  exportTable(data, "json"),
  exportTable(data, "csv"),
  exportTable(data, "markdown")
]);
```

### **Integration with WebSocket Proxy**
```javascript
import { inspect } from "bun";
import { serve } from "bun";

class ProxyDashboard {
  constructor() {
    this.stats = {
      connections: [],
      messages: [],
      errors: []
    };
  }

  logConnection(client) {
    this.stats.connections.push({
      id: client.id,
      connectedAt: new Date(),
      userAgent: client.headers['user-agent'],
      ip: client.remoteAddress
    });
  }

  renderStats() {
    const connectionsTable = {
      columns: [
        { key: "id", header: "ID", type: "string", width: 10 },
        { key: "connectedAt", header: "Connected", type: "datetime", width: 20 },
        { key: "userAgent", header: "User Agent", type: "string", width: 40 },
        { key: "ip", header: "IP", type: "string", width: 15 },
        { key: "duration", header: "Duration", type: "duration", width: 10 }
      ],
      rows: this.stats.connections.slice(-10).map(conn => ({
        id: conn.id.slice(0, 8),
        connectedAt: conn.connectedAt,
        userAgent: conn.userAgent?.slice(0, 40) || "Unknown",
        ip: conn.ip,
        duration: Date.now() - conn.connectedAt.getTime()
      }))
    };

    console.clear();
    console.log("=== WebSocket Proxy Dashboard ===");
    console.log(`Total Connections: ${this.stats.connections.length}`);
    console.log(inspect.table(connectionsTable, {
      theme: "dark",
      compact: true,
      caption: "Recent Connections"
    }));
  }
}

const dashboard = new ProxyDashboard();
const server = serve({
  port: 3000,
  fetch(req, server) {
    if (req.headers.get("upgrade") === "websocket") {
      const client = {
        id: Math.random().toString(36).substr(2, 9),
        headers: Object.fromEntries(req.headers),
        remoteAddress: req.headers.get("x-forwarded-for") || "unknown"
      };

      dashboard.logConnection(client);
      dashboard.renderStats();

      const success = server.upgrade(req, {
        data: client
      });

      return success ? undefined : new Response("Upgrade failed", { status: 500 });
    }

    return new Response("WebSocket server running");
  },
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    }
  }
});

// Update dashboard every 5 seconds
setInterval(() => dashboard.renderStats(), 5000);
```

## 🚀 **Performance Tips**

### **1. Optimize Large Tables**
```javascript
// ❌ Slow for large datasets
console.log(inspect.table(hugeDataset));

// ✅ Use pagination and filtering
const optimizedTable = {
  columns: yourColumns,
  rows: hugeDataset
    .filter(row => row.active) // Filter early
    .slice(0, 100) // Limit rows
    .map(row => ({ // Select only needed fields
      key: row.id,
      name: row.name,
      value: row.value
    }))
};

console.log(inspect.table(optimizedTable, {
  compact: true,
  maxRows: 50
}));
```

### **2. Cache Formatted Data**
```javascript
class CachedTableView {
  constructor(data) {
    this.rawData = data;
    this.cache = new Map();
  }

  getTable(format = "text", options = {}) {
    const cacheKey = `${format}-${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const table = inspect.table(this.prepareData(), options);
    this.cache.set(cacheKey, table);

    // Clear cache after 5 minutes
    setTimeout(() => this.cache.delete(cacheKey), 300000);

    return table;
  }

  prepareData() {
    // Pre-process data once
    return {
      columns: this.rawData.columns,
      rows: this.data.rows.map(row => ({
        ...row,
        // Pre-compute expensive operations
        formattedDate: new Date(row.timestamp).toLocaleString(),
        truncatedText: row.text?.slice(0, 100) + (row.text?.length > 100 ? "..." : "")
      }))
    };
  }
}
```

## 🔧 **API Reference**

### **Bun Type Definitions**

#### **HMR Event Names**
```typescript
type HMREventNames = 'beforeUpdate' | 'afterUpdate' | 'beforeFullReload' | 'beforePrune' | 'invalidate' | 'error' | 'ws:disconnect' | 'ws:connect'
```

These event names are used with Bun's Hot Module Replacement (HMR) system to track different stages of module updates and WebSocket connections during development.

#### **Server Options**
```typescript
interface ServerOptions {
  port?: number | string;           // Port to listen on (default: random)
  hostname?: string;                // Hostname to bind to (default: "0.0.0.0")
  baseURL?: string;                 // Base URL for the server
  maxRequestBodySize?: number;      // Maximum request body size in bytes
  development?: boolean;            // Enable development mode
  tls?: TLSOptions;                 // TLS configuration
  fetch?: FetchHandler;             // Request handler function
  error?: ErrorHandler;             // Error handler function
  websocket?: WebSocketHandler;     // WebSocket upgrade handler
  static?: StaticOptions;           // Static file serving options
}

type FetchHandler = (request: Request, server: Server) => Response | Promise<Response>;
type ErrorHandler = (error: Error) => Response | Promise<Response>;
```

Configuration options for Bun's built-in HTTP server with TypeScript definitions for handlers and options.

#### **Build Configuration**
```typescript
interface BuildConfig {
  entrypoints: string[];            // Entry files to build
  outdir?: string;                  // Output directory
  root?: string;                    // Root directory for resolving imports
  target?: Target;                  // Build target environment
  format?: Format;                  // Output format
  minify?: boolean | MinifyOptions; // Minification options
  sourcemap?: boolean | "inline" | "external" | "linked";
  splitting?: boolean;              // Code splitting
  publicPath?: string;              // Public path for assets
  define?: Record<string, string>;  // Define global constants
  loader?: Record<string, Loader>;  // File loaders
  plugins?: Plugin[];               // Build plugins
  external?: string[];              // External dependencies
  banner?: string;                  // Code to prepend
  footer?: string;                  // Code to append
}

type Target = "browser" | "bun" | "node";
type Format = "esm" | "cjs" | "iife";
type Loader = "js" | "jsx" | "ts" | "tsx" | "json" | "text" | "file" | "wasm";
```

TypeScript interfaces for Bun's build system configuration, including all major options and their types.

#### **Test Runner Types**
```typescript
interface TestOptions {
  timeout?: number;                 // Test timeout in milliseconds
  retries?: number;                 // Number of retries on failure
  bail?: boolean;                   // Stop on first failure
  grep?: string | RegExp;           // Filter tests by pattern
  only?: boolean;                   // Only run tests marked with .only()
  todo?: boolean;                   // Include TODO tests
  coverage?: CoverageOptions;       // Code coverage options
  reporters?: Reporter[];           // Test reporters
  setupFiles?: string[];            // Setup files to run before tests
  globals?: boolean;                // Expose test globals
}

interface CoverageOptions {
  enabled?: boolean;                // Enable coverage collection
  reporter?: CoverageReporter[];    // Coverage reporters
  include?: string[];               // Files to include
  exclude?: string[];               // Files to exclude
  thresholds?: CoverageThresholds;  // Coverage thresholds
}

type CoverageReporter = "text" | "lcov" | "html" | "json" | "cobertura";
```

Type definitions for Bun's test runner configuration and coverage options.

#### **WebSocket Handler Types**
```typescript
interface WebSocketHandler<Data = undefined> {
  open?: (ws: ServerWebSocket<Data>) => void;
  message?: (ws: ServerWebSocket<Data>, message: string | Buffer) => void;
  close?: (ws: ServerWebSocket<Data>, code: number, reason: string) => void;
  error?: (ws: ServerWebSocket<Data>, error: Error) => void;
  drain?: (ws: ServerWebSocket<Data>) => void;
}

interface ServerWebSocket<Data = undefined> {
  data: Data;                       // Custom data associated with the WebSocket
  remoteAddress: string;            // Remote IP address
  readyState: WebSocketReadyState;  // Connection state

  send(message: string | Buffer | ArrayBuffer | SharedArrayBuffer): void;
  close(code?: number, reason?: string): void;
  terminate(): void;
  ping(data?: string | Buffer): void;
  pong(data?: string | Buffer): void;

  publish(topic: string, message: string | Buffer): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  isSubscribed(topic: string): boolean;
}

type WebSocketReadyState = 0 | 1 | 2 | 3; // CONNECTING | OPEN | CLOSING | CLOSED
```

Complete TypeScript definitions for Bun's WebSocket implementation, including handlers and WebSocket instance methods.

#### **Environment Types**
```typescript
interface BunEnv {
  readonly BUN_VERSION: string;     // Current Bun version
  readonly BUN_REVISION: string;    // Git revision hash
  readonly BUN_RUNTIME: "bun";      // Always "bun"
  readonly NODE_ENV?: string;       // Node.js environment variable
  readonly npm_package_version?: string; // Package version
  readonly npm_package_name?: string;    // Package name
  readonly npm_config_user_agent?: string; // NPM user agent
}

interface ProcessVersions {
  readonly bun: string;             // Bun version
  readonly node: string;            // Compatible Node.js version
  readonly webkit: string;          // WebKit version
  readonly boringssl: string;       // BoringSSL version
  readonly zlib: string;            // Zlib version
  readonly modules: string;         // Modules version
}
```

Type definitions for Bun-specific environment variables and version information available at runtime.

#### **File System Types**
```typescript
interface BunFile {
  readonly size: number;            // File size in bytes
  readonly type: string;            // MIME type
  readonly name?: string;           // File name (if available)
  readonly lastModified: number;    // Last modified timestamp

  text(): Promise<string>;          // Read as text
  arrayBuffer(): Promise<ArrayBuffer>; // Read as ArrayBuffer
  bytes(): Promise<Uint8Array>;     // Read as bytes
  json<T = any>(): Promise<T>;      // Parse as JSON
  blob(): Promise<Blob>;            // Convert to Blob
  stream(): ReadableStream;         // Get readable stream
}

interface FileSystemWatcher {
  readonly kind: "file" | "directory";
  readonly path: string;
  readonly event: "create" | "update" | "delete";

  stop(): void;                     // Stop watching
}

type WatchOptions = {
  recursive?: boolean;              // Watch subdirectories
  signal?: AbortSignal;             // Abort signal
};
```

TypeScript interfaces for Bun's enhanced file system APIs, including file handling and file watching.

#### **Request/Response Extensions**
```typescript
interface Request extends globalThis.Request {
  readonly params?: Record<string, string>; // URL parameters
  readonly query?: URLSearchParams; // Query string parameters
  readonly body?: any;              // Parsed request body
  readonly cookies?: Record<string, string>; // Parsed cookies
}

interface Response extends globalThis.Response {
  static(path: string, options?: StaticOptions): Response;
  json(data: any, init?: ResponseInit): Response;
  html(html: string, init?: ResponseInit): Response;
  text(text: string, init?: ResponseInit): Response;
  redirect(url: string, status?: number): Response;
}

interface StaticOptions {
  headers?: Record<string, string>; // Custom headers
  dotfiles?: boolean;               // Serve dotfiles
  etag?: boolean;                   // Enable ETag headers
  index?: string | false;           // Index file name
  maxAge?: number;                  // Cache max age in seconds
}
```

Extended Request and Response interfaces with Bun-specific enhancements and convenience methods.

### **Bun.inspect()**

```typescript
function inspect(
  value: any,
  options?: InspectOptions
): string
```

#### **InspectOptions**
```typescript
interface InspectOptions {
  // Display options
  colors?: boolean;           // Enable ANSI color output (default: false)
  depth?: number | null;      // Depth to expand nested objects (default: 2)
  maxArrayLength?: number | null;  // Max array elements to show (default: 100)
  maxStringLength?: number | null; // Max string length to show (default: 10000)
  breakLength?: number;       // Line width before breaking (default: 80)
  compact?: boolean | number; // Compact mode (default: 3)

  // Content filtering
  showHidden?: boolean;       // Show non-enumerable properties (default: false)
  showProxy?: boolean;        // Show proxy handler information (default: false)
  getters?: boolean;          // Show getter results (default: false)
  sorted?: boolean;           // Sort object keys alphabetically (default: false)

  // Custom formatting
  customInspect?: boolean;    // Use custom inspect methods (default: true)
}
```

### **Bun.inspect.table()**

```typescript
function inspect.table(
  data: TableData | any[],
  options?: TableOptions
): string
```

#### **TableData Interface**
```typescript
interface TableData {
  columns?: ColumnDefinition[];
  rows: Record<string, any>[];
  caption?: string;
}

interface ColumnDefinition {
  key: string;              // Data key to display
  header?: string;          // Column header text
  type?: ColumnType;        // Data type for formatting
  width?: number;           // Column width in characters
  align?: 'left' | 'center' | 'right';  // Text alignment
  format?: FormatFunction;  // Custom formatting function
  sortable?: boolean;       // Enable sorting for this column
}

type ColumnType =
  | 'string'     // Plain text
  | 'number'     // Numeric values
  | 'boolean'    // True/false values
  | 'date'       // Date objects
  | 'datetime'   // Date with time
  | 'duration'   // Time duration
  | 'badge'      // Status badges with colors
  | 'progress'   // Progress bars
  | 'bytes'      // File sizes
  | 'currency'   // Monetary values
  | 'percentage' // Percentage values
  | 'json'       // JSON data
  | 'code'       // Code snippets

type FormatFunction = (value: any, row: any, column: ColumnDefinition) => string;
```

#### **TableOptions**
```typescript
interface TableOptions {
  // Display options
  maxRows?: number;          // Maximum rows to display (default: 100)
  maxColumns?: number;       // Maximum columns to display (default: 10)
  showHeaders?: boolean;     // Show column headers (default: true)
  showBorder?: boolean;      // Show table borders (default: true)
  compact?: boolean;         // Compact mode (default: false)
  zebra?: boolean;           // Alternating row colors (default: false)
  truncate?: boolean;        // Truncate long content (default: true)

  // Sorting & filtering
  sortBy?: string;           // Column key to sort by
  sortOrder?: 'asc' | 'desc'; // Sort direction
  filter?: FilterFunction;   // Row filter function

  // Styling
  theme?: 'dark' | 'light' | ThemeConfig;
  colors?: boolean;          // Enable colors (default: true)

  // Output format
  output?: 'text' | 'html' | 'json' | 'csv' | 'markdown';

  // Layout
  style?: {
    border?: 'single' | 'double' | 'rounded' | 'none';
    padding?: number;
    margin?: number;
    align?: 'left' | 'center' | 'right';
  };
}

type FilterFunction = (row: any, index: number) => boolean;
```

## 🎭 **Data Types and Special Cases**

### **Primitive Types**
```javascript
import { inspect } from "bun";

// Numbers
console.log(inspect(42));                    // "42"
console.log(inspect(3.14159));               // "3.14159"
console.log(inspect(NaN));                   // "NaN"
console.log(inspect(Infinity));              // "Infinity"
console.log(inspect(-0));                    // "-0"

// BigInt
console.log(inspect(123n));                  // "123n"
console.log(inspect(BigInt("9007199254740991"))); // "9007199254740991n"

// Strings
console.log(inspect("Hello World"));         // "'Hello World'"
console.log(inspect("Multi\nLine"));         // "'Multi\\nLine'"
console.log(inspect("🚀 Unicode"));          // "'🚀 Unicode'"

// Booleans and null/undefined
console.log(inspect(true));                  // "true"
console.log(inspect(false));                 // "false"
console.log(inspect(null));                  // "null"
console.log(inspect(undefined));             // "undefined"
```

### **Complex Data Types**
```javascript
import { inspect } from "bun";

// Arrays
console.log(inspect([1, 2, 3]));             // "[ 1, 2, 3 ]"
console.log(inspect([1, , 3]));              // "[ 1, <1 empty item>, 3 ]"
console.log(inspect(new Array(3)));          // "[ <3 empty items> ]"

// Typed Arrays
console.log(inspect(new Uint8Array([1, 2, 3])));    // "Uint8Array(3) [ 1, 2, 3 ]"
console.log(inspect(new Float64Array([1.1, 2.2]))); // "Float64Array(2) [ 1.1, 2.2 ]"

// Maps and Sets
console.log(inspect(new Map([['a', 1], ['b', 2]])));
// Map(2) { 'a' => 1, 'b' => 2 }

console.log(inspect(new Set([1, 2, 3])));
// Set(3) { 1, 2, 3 }

// Regular Expressions
console.log(inspect(/test/gi));              // "/test/gi"
console.log(inspect(new RegExp("test", "i"))); // "/test/i"

// Symbols
const sym = Symbol("test");
console.log(inspect(sym));                   // "Symbol(test)"
console.log(inspect(Symbol.iterator));       // "Symbol(Symbol.iterator)"
```

### **Special Objects and Edge Cases**
```javascript
import { inspect } from "bun";

// Functions
function regularFunction(a, b) { return a + b; }
console.log(inspect(regularFunction));
// "[Function: regularFunction]"

const arrowFunc = (a, b) => a + b;
console.log(inspect(arrowFunc));
// "(a, b) => a + b"

// Promises
const promise = Promise.resolve(42);
console.log(inspect(promise));
// "Promise { 42 }"

const pendingPromise = new Promise(() => {});
console.log(inspect(pendingPromise));
// "Promise { <pending> }"

// Errors
const error = new Error("Something went wrong");
console.log(inspect(error));
// "Error: Something went wrong"

// Circular references
const circular = { self: null };
circular.self = circular;
console.log(inspect(circular, { depth: 1 }));
// "{ self: [Circular] }"

// Proxies
const target = { message: "hello" };
const proxy = new Proxy(target, {
  get(target, prop) {
    return prop in target ? target[prop] : "default";
  }
});
console.log(inspect(proxy, { showProxy: true }));
// "{ message: 'hello' }" (proxy details shown when showProxy: true)
```

## 🔗 **Integration with Bun Ecosystem**

### **Bun.serve() Integration**
```javascript
import { inspect } from "bun";
import { serve } from "bun";

const server = serve({
  port: 3000,
  fetch(req) {
    // Log request details
    console.log("Request:", inspect({
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers),
      body: req.body ? "present" : "none"
    }, { colors: true, depth: 1 }));

    return new Response("Hello World");
  }
});

// Display server info
console.log("Server started:", inspect(server, {
  customInspect: true,
  colors: true
}));
```

### **Bun.test() Integration**
```javascript
import { inspect } from "bun";
import { test, expect } from "bun:test";

class Calculator {
  add(a, b) { return a + b; }
  multiply(a, b) { return a + b; } // Bug: should be multiply
}

test("Calculator operations", () => {
  const calc = new Calculator();

  // Use inspect for better error messages
  expect(calc.add(2, 3)).toBe(5);

  // This will fail - inspect helps debug
  try {
    expect(calc.multiply(2, 3)).toBe(6);
  } catch (error) {
    console.log("Debug info:", inspect(calc, { colors: true }));
    console.log("Error:", inspect(error, { colors: true }));
    throw error;
  }
});

// Custom matcher with inspect
expect.extend({
  toEqualInspect(received, expected) {
    const pass = inspect(received) === inspect(expected);
    return {
      pass,
      message: () => `Expected ${inspect(expected)}, received ${inspect(received)}`
    };
  }
});
```

### **Bun.build() Integration**
```javascript
import { inspect } from "bun";

const buildResult = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,
  sourcemap: "external"
});

// Display build results
console.log("Build result:", inspect(buildResult, {
  colors: true,
  depth: 3,
  customInspect: true
}));

// Show build outputs
if (buildResult.outputs) {
  const outputTable = {
    columns: [
      { key: "path", header: "Output Path", type: "string" },
      { key: "size", header: "Size", type: "bytes" },
      { key: "hash", header: "Hash", type: "string", width: 10 }
    ],
    rows: buildResult.outputs.map(output => ({
      path: output.path,
      size: output.size,
      hash: output.hash?.slice(0, 8) || "N/A"
    }))
  };

  console.log(inspect.table(outputTable, {
    theme: "dark",
    caption: "Build Outputs"
  }));
}
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Colors not showing in output**
```javascript
// ❌ Colors not enabled
console.log(inspect(data));

// ✅ Enable colors explicitly
console.log(inspect(data, { colors: true }));

// Or set environment variable
process.env.FORCE_COLOR = "1";
console.log(inspect(data));
```

#### **2. Large objects truncated**
```javascript
// ❌ Default depth is shallow
console.log(inspect(deepObject));

// ✅ Increase depth
console.log(inspect(deepObject, { depth: 10 }));

// Or set to null for unlimited depth
console.log(inspect(deepObject, { depth: null }));
```

#### **3. Table columns not displaying correctly**
```javascript
// ❌ Missing column definitions
const data = [{ name: "John", age: 30 }];

// ✅ Define columns explicitly
const tableData = {
  columns: [
    { key: "name", header: "Name", type: "string" },
    { key: "age", header: "Age", type: "number" }
  ],
  rows: data
};

console.log(inspect.table(tableData));
```

#### **4. Memory issues with large datasets**
```javascript
// ❌ Loading entire dataset into memory
const largeData = await loadAllDataFromDatabase();

// ✅ Stream and paginate
const tableViewer = new InteractiveTableViewer(largeData, {
  pageSize: 50,
  lazyLoad: true // Custom option for your implementation
});
```

### **Debugging Custom Inspect Methods**
```javascript
class DebuggableClass {
  constructor(value) {
    this.value = value;
  }

  [inspect.custom](depth, options) {
    // Add debug information
    console.log("Custom inspect called with:", { depth, options });
    return `DebuggableClass(${this.value})`;
  }
}

// Test custom inspect
const obj = new DebuggableClass(42);
console.log(inspect(obj)); // Will show debug logs
```

### **Performance Debugging**
```javascript
import { inspect } from "bun";

// Time inspect operations
console.time("inspect-large-object");
const result = inspect(largeObject, { depth: 5 });
console.timeEnd("inspect-large-object");

// Profile table rendering
console.time("table-render");
const table = inspect.table(largeDataset, { maxRows: 1000 });
console.timeEnd("table-render");

// Memory usage
const before = process.memoryUsage().heapUsed;
inspect(largeObject);
const after = process.memoryUsage().heapUsed;
console.log(`Memory used: ${(after - before) / 1024 / 1024} MB`);
```

## 🚀 **Advanced Patterns**

### **Conditional Inspection**
```javascript
import { inspect } from "bun";

class EnvironmentAwareLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  log(data, label = "") {
    const options = this.isDevelopment
      ? { colors: true, depth: 5, showHidden: true }
      : { colors: false, depth: 2, compact: true };

    const output = label
      ? `${label}: ${inspect(data, options)}`
      : inspect(data, options);

    console.log(output);
  }
}

const logger = new EnvironmentAwareLogger();
logger.log({ user: "john", data: { nested: { value: 42 } } }, "User Data");
```

### **Structured Logging with Tables**
```javascript
import { inspect } from "bun";

class StructuredLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date(),
      level,
      message,
      data: inspect(data, { compact: true, colors: false })
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Immediate console output
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  showLogTable(filterLevel = null) {
    let filteredLogs = this.logs;
    if (filterLevel) {
      filteredLogs = this.logs.filter(log => log.level === filterLevel);
    }

    const tableData = {
      columns: [
        { key: "timestamp", header: "Time", type: "datetime", width: 20 },
        { key: "level", header: "Level", type: "badge", width: 8 },
        { key: "message", header: "Message", type: "string", width: 40 },
        { key: "data", header: "Data", type: "string", width: 30 }
      ],
      rows: filteredLogs.slice(-50).map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        data: log.data
      }))
    };

    console.log(inspect.table(tableData, {
      theme: "dark",
      caption: `Recent Logs${filterLevel ? ` (${filterLevel})` : ""}`
    }));
  }
}

const logger = new StructuredLogger();
logger.log("info", "Server started", { port: 3000 });
logger.log("error", "Database connection failed", { error: "ECONNREFUSED" });
logger.showLogTable();
```

### **Inspect Middleware for APIs**
```javascript
import { inspect } from "bun";

function createInspectMiddleware(options = {}) {
  return async (req, next) => {
    const startTime = Date.now();

    // Log incoming request
    console.log("→ Incoming Request:", inspect({
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers),
      body: req.body ? await req.clone().text() : null
    }, { colors: true, depth: 2, ...options }));

    try {
      const response = await next(req);
      const duration = Date.now() - startTime;

      // Log outgoing response
      console.log("← Outgoing Response:", inspect({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        duration: `${duration}ms`,
        body: options.includeResponseBody ? await response.clone().text() : "[body]"
      }, { colors: true, ...options }));

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log errors
      console.error("✗ Request Error:", inspect({
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        request: { method: req.method, url: req.url }
      }, { colors: true, ...options }));

      throw error;
    }
  };
}

// Usage with Bun.serve
const server = serve({
  port: 3000,
  async fetch(req) {
    const middleware = createInspectMiddleware({ includeResponseBody: false });

    return await middleware(req, async (req) => {
      // Your route handlers here
      return new Response("Hello World");
    });
  }
});
```

## 🧪 **Testing and Debugging**

### **Snapshot Testing with Inspect**
```javascript
import { inspect } from "bun";
import { test, expect } from "bun:test";

test("API response structure", async () => {
  const response = await fetch("/api/users");
  const data = await response.json();

  // Create normalized snapshot
  const snapshot = inspect(data, {
    sorted: true,
    compact: true,
    colors: false,
    depth: 3
  });

  // Compare against expected structure
  expect(snapshot).toMatchSnapshot();
});

test("Database query results", async () => {
  const users = await db.query("SELECT * FROM users LIMIT 5");

  const tableSnapshot = inspect.table({
    columns: [
      { key: "id", header: "ID", type: "number" },
      { key: "name", header: "Name", type: "string" },
      { key: "email", header: "Email", type: "string" }
    ],
    rows: users
  }, {
    theme: "none", // Disable colors for consistent snapshots
    output: "markdown"
  });

  expect(tableSnapshot).toMatchSnapshot();
});
```

### **Debug Test Helpers**
```javascript
import { inspect } from "bun";

// Custom test utilities
global.debug = (value, label) => {
  console.log(`${label || "Debug"}:`, inspect(value, {
    colors: true,
    depth: 4,
    showHidden: true
  }));
};

global.debugTable = (data, options = {}) => {
  console.table(data); // Fallback
  console.log(inspect.table(data, {
    theme: "dark",
    ...options
  }));
};

// Usage in tests
test("complex data transformation", () => {
  const input = { /* complex data */ };
  const result = transform(input);

  debug(result, "Transformation result");

  // More detailed inspection
  if (result.errors) {
    debugTable(result.errors, { caption: "Validation Errors" });
  }

  expect(result.success).toBe(true);
});
```

## 📊 **Performance Benchmarks**

### **Inspect Performance Comparison**
```javascript
import { inspect } from "bun";
import { inspect as nodeInspect } from "node:util";

// Test data
const testObject = {
  users: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    profile: {
      age: 20 + (i % 50),
      city: `City ${i % 100}`,
      settings: {
        theme: i % 2 ? "dark" : "light",
        notifications: !!(i % 3)
      }
    }
  }))
};

// Benchmark function
function benchmark(fn, name, iterations = 100) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return { name, time: end - start, avg: (end - start) / iterations };
}

// Run benchmarks
const results = [
  benchmark(() => inspect(testObject), "Bun.inspect"),
  benchmark(() => nodeInspect(testObject), "Node.js inspect"),
  benchmark(() => JSON.stringify(testObject), "JSON.stringify")
];

// Display results
const benchmarkTable = {
  columns: [
    { key: "name", header: "Method", type: "string" },
    { key: "time", header: "Total Time (ms)", type: "number", format: v => v.toFixed(2) },
    { key: "avg", header: "Avg Time (ms)", type: "number", format: v => v.toFixed(4) }
  ],
  rows: results
};

console.log(inspect.table(benchmarkTable, {
  theme: "dark",
  caption: "Inspect Performance Benchmark (100 iterations)"
}));
```

### **Table Rendering Performance**
```javascript
import { inspect } from "bun";

// Generate test data
const generateTestData = (rows) => ({
  columns: [
    { key: "id", header: "ID", type: "number" },
    { key: "name", header: "Name", type: "string" },
    { key: "value", header: "Value", type: "number" },
    { key: "status", header: "Status", type: "string" }
  ],
  rows: Array.from({ length: rows }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 1000,
    status: ["active", "inactive", "pending"][i % 3]
  }))
});

// Test different table sizes
const sizes = [100, 1000, 10000];
const performanceResults = [];

for (const size of sizes) {
  const data = generateTestData(size);

  const start = performance.now();
  const result = inspect.table(data, { compact: true });
  const end = performance.now();

  performanceResults.push({
    size,
    time: end - start,
    outputSize: result.length
  });
}

// Display performance table
console.log(inspect.table({
  columns: [
    { key: "size", header: "Row Count", type: "number" },
    { key: "time", header: "Render Time (ms)", type: "number", format: v => v.toFixed(2) },
    { key: "outputSize", header: "Output Size (chars)", type: "number" }
  ],
  rows: performanceResults
}, {
  theme: "dark",
  caption: "Table Rendering Performance"
}));
```

## 🔄 **Migration from Node.js**

### **Key Differences**
```javascript
// Node.js util.inspect
const util = require('util');

// Bun.inspect equivalent
import { inspect } from "bun";

// Basic usage - similar
console.log(util.inspect(obj));      // Node.js
console.log(inspect(obj));           // Bun

// Options mapping
util.inspect(obj, {
  colors: true,
  depth: 3,
  showHidden: true
});

// Bun equivalent
inspect(obj, {
  colors: true,
  depth: 3,
  showHidden: true
});

// Key differences:
// - Bun.inspect is faster
// - Better default formatting
// - Enhanced table support
// - Built-in TypeScript support
```

### **Migration Helper**
```javascript
// migration-helper.js
import { inspect } from "bun";
import { inspect as nodeInspect } from "node:util";

function migrateInspectUsage(code) {
  return code
    .replace(/const util = require\('util'\);/g, "import { inspect } from 'bun';")
    .replace(/util\.inspect\(/g, "inspect(")
    .replace(/require\('util'\)\.inspect\(/g, "inspect(");
}

// Usage
const oldCode = `
const util = require('util');
console.log(util.inspect(data, { colors: true, depth: 2 }));
`;

const newCode = migrateInspectUsage(oldCode);
console.log("Migrated code:", newCode);
```

## 📚 **Best Practices Summary**

1. **Use appropriate column types** for proper formatting
2. **Implement custom inspection** for complex objects
3. **Add captions and context** to your tables
4. **Use pagination** for large datasets
5. **Export to appropriate formats** for different use cases
6. **Cache expensive operations** when displaying frequently
7. **Implement real-time updates** for monitoring dashboards
8. **Provide interactive controls** for large datasets
9. **Enable colors in development** for better readability
10. **Use structured logging** with inspect for debugging
11. **Profile performance** when working with large datasets
12. **Test inspect output** with snapshot testing
13. **Implement conditional inspection** based on environment
14. **Use TypeScript interfaces** for better type safety
15. **Handle circular references** appropriately

This comprehensive guide covers everything from basic usage to advanced patterns with `Bun.inspect()` and `Bun.inspect.table()`. These utilities are powerful tools for debugging, monitoring, and displaying structured data in Bun applications.
3. **Add captions and context** to your tables
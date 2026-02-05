# 📊 **Bun inspect.table() - Complete Practical Guide**

## 🎯 **Quick Start**

### **Basic Usage**
```javascript
import { inspect } from "bun";

// Simple array of objects
const users = [
  { name: "Alice", age: 25, active: true },
  { name: "Bob", age: 30, active: false },
  { name: "Charlie", age: 35, active: true }
];

console.log(inspect.table(users));
```

**Output:**
```
┌─────────┬─────┬────────┐
│ name    │ age │ active │
├─────────┼─────┼────────┤
│ Alice   │ 25  │ true   │
│ Bob     │ 30  │ false  │
│ Charlie │ 35  │ true   │
└─────────┴─────┴────────┘
```

### **With Custom Columns**
```javascript
const tableData = {
  columns: [
    { key: "protocol", header: "Protocol", type: "string" },
    { key: "status", header: "Status", type: "badge" },
    { key: "latency", header: "Latency (ms)", type: "number", align: "right" },
    { key: "throughput", header: "Throughput", type: "bytes" }
  ],
  rows: [
    { protocol: "HTTP", status: "connected", latency: 28, throughput: 125000 },
    { protocol: "HTTPS", status: "connected", latency: 1234, throughput: 98765 },
    { protocol: "WebSocket", status: "connecting", latency: 800, throughput: 250000 }
  ]
};

console.log(inspect.table(tableData));
```

---

## 🎨 **Advanced Formatting Examples**

### **1. Proxy Server Configuration Table**
```javascript
const proxyConfigs = {
  columns: [
    { key: "property", header: "Property", type: "code", width: 20 },
    { key: "type", header: "Type", type: "string", width: 12 },
    { key: "required", header: "Required", type: "boolean" },
    { key: "default", header: "Default", type: "string", width: 15 },
    { key: "description", header: "Description", type: "string", width: 40 }
  ],
  rows: [
    {
      property: "listenHost",
      type: "string",
      required: false,
      default: '"0.0.0.0"',
      description: "Host to bind server to"
    },
    {
      property: "listenPort",
      type: "number",
      required: false,
      default: "random",
      description: "Port to listen on (0=auto)"
    },
    {
      property: "targetUrl",
      type: "string",
      required: true,
      default: "-",
      description: "Backend WebSocket URL"
    },
    {
      property: "maxConnections",
      type: "number",
      required: false,
      default: "10000",
      description: "Maximum concurrent connections"
    },
    {
      property: "idleTimeout",
      type: "number",
      required: false,
      default: "60000",
      description: "Idle timeout in milliseconds"
    }
  ],
  caption: "Proxy Server Configuration Options"
};

console.log(inspect.table(proxyConfigs, {
  theme: "dark",
  showBorder: true,
  zebra: true
}));
```

### **2. Performance Metrics Dashboard**
```javascript
const performanceData = {
  columns: [
    { key: "metric", header: "Metric", type: "string" },
    { key: "value", header: "Value", type: "number", align: "right" },
    { key: "unit", header: "Unit", type: "string" },
    { key: "trend", header: "Trend", type: "badge" },
    { key: "threshold", header: "Threshold", type: "number", align: "right" },
    { key: "status", header: "Status", type: "badge" }
  ],
  rows: [
    {
      metric: "Active Connections",
      value: 2456,
      unit: "connections",
      trend: "up",
      threshold: 10000,
      status: "healthy"
    },
    {
      metric: "Avg Latency",
      value: 42.5,
      unit: "ms",
      trend: "down",
      threshold: 100,
      status: "good"
    },
    {
      metric: "Error Rate",
      value: 0.12,
      unit: "%",
      trend: "up",
      threshold: 1,
      status: "warning"
    },
    {
      metric: "Throughput",
      value: 12500,
      unit: "req/s",
      trend: "up",
      threshold: 10000,
      status: "excellent"
    },
    {
      metric: "Memory Usage",
      value: 245,
      unit: "MB",
      trend: "stable",
      threshold: 512,
      status: "healthy"
    }
  ]
};

console.log(inspect.table(performanceData, {
  sortBy: "value",
  sortOrder: "desc",
  zebra: true,
  theme: "dark"
}));
```

### **3. Color Theme Reference Table**
```javascript
const colorTheme = {
  columns: [
    { key: "name", header: "Color Name", type: "string" },
    { key: "swatch", header: "Swatch", type: "color" },
    { key: "hex", header: "HEX", type: "string" },
    { key: "rgb", header: "RGB", type: "string" },
    { key: "hsl", header: "HSL", type: "string" },
    { key: "usage", header: "Usage", type: "string" }
  ],
  rows: [
    {
      name: "Primary Blue",
      swatch: "#3B82F6",
      hex: "#3B82F6",
      rgb: "rgb(59, 130, 246)",
      hsl: "hsl(217, 91%, 60%)",
      usage: "Primary actions, links"
    },
    {
      name: "Success Green",
      swatch: "#10B981",
      hex: "#10B981",
      rgb: "rgb(16, 185, 129)",
      hsl: "hsl(162, 84%, 39%)",
      usage: "Success states, connected"
    },
    {
      name: "Error Red",
      swatch: "#EF4444",
      hex: "#EF4444",
      rgb: "rgb(239, 68, 68)",
      hsl: "hsl(0, 79%, 60%)",
      usage: "Error states, disconnected"
    },
    {
      name: "Warning Orange",
      swatch: "#F59E0B",
      hex: "#F59E0B",
      rgb: "rgb(245, 158, 11)",
      hsl: "hsl(38, 92%, 50%)",
      usage: "Warnings, connecting"
    }
  ]
};

console.log(inspect.table(colorTheme, {
  theme: "light",
  showBorder: true
}));
```

### **4. API Endpoints Table**
```javascript
const apiEndpoints = {
  columns: [
    { key: "method", header: "Method", type: "badge", width: 8 },
    { key: "path", header: "Path", type: "code", width: 25 },
    { key: "component", header: "Component", type: "string", width: 20 },
    { key: "latency", header: "Latency", type: "duration", width: 10 },
    { key: "auth", header: "Auth", type: "badge", width: 8 },
    { key: "description", header: "Description", type: "string", width: 40 }
  ],
  rows: [
    {
      method: "GET",
      path: "/health",
      component: "HealthChecker",
      latency: 0.1,
      auth: "none",
      description: "Health check endpoint"
    },
    {
      method: "GET",
      path: "/metrics",
      component: "StatsCollector",
      latency: 0.3,
      auth: "required",
      description: "Prometheus metrics"
    },
    {
      method: "POST",
      path: "/api/v1/proxy",
      component: "ProxyServer",
      latency: 1.2,
      auth: "required",
      description: "Create proxy session"
    },
    {
      method: "WS",
      path: "/ws/proxy",
      component: "WebSocketProxy",
      latency: 0.8,
      auth: "optional",
      description: "WebSocket proxy endpoint"
    },
    {
      method: "DELETE",
      path: "/api/v1/connections/:id",
      component: "ConnectionManager",
      latency: 0.3,
      auth: "required",
      description: "Close connection"
    }
  ]
};

console.log(inspect.table(apiEndpoints, {
  sortBy: "method",
  sortOrder: "asc",
  zebra: true
}));
```

### **5. Load Test Results Table**
```javascript
const loadTestResults = {
  columns: [
    { key: "scenario", header: "Scenario", type: "string", width: 20 },
    { key: "vus", header: "VUs", type: "number", align: "right" },
    { key: "duration", header: "Duration", type: "duration", align: "right" },
    { key: "p50", header: "P50 Latency", type: "number", format: v => `${v}ms`, align: "right" },
    { key: "p95", header: "P95 Latency", type: "number", format: v => `${v}ms`, align: "right" },
    { key: "errorRate", header: "Error Rate", type: "percentage", align: "right" },
    { key: "throughput", header: "Throughput", type: "number", format: v => `${v}/s`, align: "right" },
    { key: "status", header: "Status", type: "badge" }
  ],
  rows: [
    {
      scenario: "Light Load",
      vus: 10,
      duration: 300,
      p50: 28,
      p95: 45,
      errorRate: 0,
      throughput: 1250,
      status: "passed"
    },
    {
      scenario: "Normal Load",
      vus: 50,
      duration: 600,
      p50: 42,
      p95: 89,
      errorRate: 0.1,
      throughput: 5200,
      status: "passed"
    },
    {
      scenario: "Heavy Load",
      vus: 100,
      duration: 900,
      p50: 78,
      p95: 215,
      errorRate: 0.3,
      throughput: 9800,
      status: "warning"
    },
    {
      scenario: "Stress Test",
      vus: 500,
      duration: 1800,
      p50: 245,
      p95: 1250,
      errorRate: 2.5,
      throughput: 12300,
      status: "failed"
    }
  ]
};

console.log(inspect.table(loadTestResults, {
  sortBy: "vus",
  sortOrder: "asc",
  theme: "dark",
  zebra: true
}));
```

### **6. Background Colors Design System Table**
```javascript
const backgroundColorsTable = {
  columns: [
    { key: "variable", header: "Variable", type: "string" },
    { key: "hex", header: "HEX", type: "color" },
    { key: "rgb", header: "RGB", type: "string" },
    { key: "hsl", header: "HSL", type: "string" },
    { key: "usage", header: "Usage", type: "string" }
  ],
  rows: [
    { variable: "--bg-primary", hex: "#0B0E14", rgb: "rgb(11, 14, 20)", hsl: "hsla(220, 13%, 6%, 1)", usage: "Main page background" },
    { variable: "--bg-secondary", hex: "#151922", rgb: "rgb(21, 25, 34)", hsl: "hsla(218, 17%, 10%, 1)", usage: "Card backgrounds, modals" },
    { variable: "--bg-tertiary", hex: "#1E2430", rgb: "rgb(30, 36, 48)", hsl: "hsla(218, 23%, 15%, 1)", usage: "Table headers, hover states" }
  ]
};

console.log(inspect.table(backgroundColorsTable, { theme: "dark", showBorder: true }));
```

### **7. Operation Performance Metrics Table**
```javascript
const operationPerformanceTable = {
  columns: [
    { key: "operation", header: "Operation", type: "string" },
    { key: "average", header: "Average", type: "number", format: (v) => `${v} ms` },
    { key: "p50", header: "P50", type: "number", format: (v) => `${v} ms` },
    { key: "p99", header: "P99", type: "number", format: (v) => `${v} ms` },
    { key: "unit", header: "Unit", type: "string" }
  ],
  rows: [
    { operation: "Buffer push", average: 0.012, p50: 0.010, p99: 0.050, unit: "ms" },
    { operation: "Buffer pop", average: 0.008, p50: 0.007, p99: 0.030, unit: "ms" },
    { operation: "Buffer flush", average: 0.050, p50: 0.040, p99: 0.200, unit: "ms" }
  ]
};

console.log(inspect.table(operationPerformanceTable, { theme: "dark", showBorder: true }));
```

---

## 🔧 **Custom Formatters & Transformations**

### **Custom Formatter Functions**
```javascript
const customFormatters = {
  columns: [
    {
      key: "amount",
      header: "Amount",
      type: "number",
      format: (value) => `$${value.toFixed(2)}`,
      align: "right"
    },
    {
      key: "progress",
      header: "Progress",
      type: "number",
      format: (value) => {
        const bar = '█'.repeat(Math.floor(value / 10));
        const empty = '░'.repeat(10 - Math.floor(value / 10));
        return `${bar}${empty} ${value}%`;
      }
    },
    {
      key: "timestamp",
      header: "Timestamp",
      type: "datetime",
      format: (value) => new Date(value).toLocaleString()
    },
    {
      key: "tags",
      header: "Tags",
      type: "array",
      format: (value) => value.map(tag => `#${tag}`).join(', ')
    }
  ],
  rows: [
    {
      amount: 1234.56,
      progress: 75,
      timestamp: Date.now(),
      tags: ["urgent", "backend", "performance"]
    },
    {
      amount: 789.01,
      progress: 30,
      timestamp: Date.now() - 86400000,
      tags: ["monitoring", "dashboard"]
    }
  ]
};

console.log(inspect.table(customFormatters));
```

### **Conditional Formatting**
```javascript
const conditionalTable = {
  columns: [
    {
      key: "name",
      header: "Component",
      type: "string"
    },
    {
      key: "status",
      header: "Status",
      type: "badge",
      format: (value, row) => {
        const colors = {
          stable: "green",
          beta: "orange",
          experimental: "purple",
          deprecated: "gray"
        };
        return { text: value, color: colors[value] };
      }
    },
    {
      key: "score",
      header: "Score",
      type: "number",
      format: (value) => {
        if (value >= 90) return { text: value, color: "green" };
        if (value >= 70) return { text: value, color: "orange" };
        return { text: value, color: "red" };
      }
    }
  ],
  rows: [
    { name: "ConnectionManager", status: "stable", score: 95 },
    { name: "WebSocketProxy", status: "beta", score: 85 },
    { name: "MITMProxy", status: "experimental", score: 65 },
    { name: "LegacyProxy", status: "deprecated", score: 30 }
  ]
};

console.log(inspect.table(conditionalTable));
```

---

## 📤 **Export Options**

### **1. Export as HTML**
```javascript
const htmlOutput = inspect.table(proxyConfigs, { output: "html" });
console.log(htmlOutput);

// Save to file
await Bun.write("config-table.html", htmlOutput);
```

### **2. Export as JSON**
```javascript
const jsonOutput = inspect.table(performanceData, { output: "json" });
console.log(jsonOutput);
// Outputs: { columns: [...], rows: [...], options: {...} }

// Save to file
await Bun.write("metrics.json", JSON.stringify(JSON.parse(jsonOutput), null, 2));
```

### **3. Export as CSV**
```javascript
const csvOutput = inspect.table(apiEndpoints, { output: "csv" });
console.log(csvOutput);
// Outputs: Method,Path,Component,Latency,Auth,Description...

// Save to file
await Bun.write("endpoints.csv", csvOutput);
```

### **4. Export as Markdown**
```javascript
const mdOutput = inspect.table(colorTheme, { output: "markdown" });
console.log(mdOutput);
// Outputs: | Color Name | Swatch | HEX | ... |

// Save to file
await Bun.write("colors.md", mdOutput);
```

---

## 🎛️ **Table Options Reference**

### **Complete Options Example**
```javascript
const options = {
  // Display options
  maxRows: 100,           // Maximum rows to display
  maxColumns: 10,         // Maximum columns to display
  showHeaders: true,      // Show column headers
  showBorder: true,       // Show table border
  compact: false,         // Compact mode (reduced padding)
  zebra: true,           // Alternating row colors
  truncate: true,        // Truncate long content

  // Sorting & Filtering
  sortBy: "latency",     // Column to sort by
  sortOrder: "asc",      // "asc" or "desc"
  filter: "active",      // Filter expression

  // Styling
  theme: "dark",         // "dark" or "light"
  colors: true,          // Enable colored output

  // Output format
  output: "text",        // "text", "html", "json", "csv", "markdown"

  // Custom styling
  style: {
    border: "rounded",   // "single", "double", "rounded", "none"
    padding: 1,          // Cell padding
    margin: 0,           // Table margin
    align: "center"      // Table alignment
  }
};

console.log(inspect.table(yourData, options));
```

### **Theme Configuration**
```javascript
const customTheme = {
  dark: {
    border: "#4A5568",
    header: "#F0F4F8",
    cell: "#A0AEC0",
    zebra: "#1A202C",
    accent: "#3B82F6"
  },
  light: {
    border: "#CBD5E0",
    header: "#2D3748",
    cell: "#4A5568",
    zebra: "#F7FAFC",
    accent: "#3182CE"
  }
};

console.log(inspect.table(data, {
  theme: "dark",
  colors: customTheme
}));
```

---

## 🔄 **Dynamic Table Generation**

### **Real-time Monitoring Dashboard**
```javascript
async function createLiveDashboard() {
  const dashboardData = {
    columns: [
      { key: "metric", header: "Metric", type: "string" },
      { key: "value", header: "Value", type: "number" },
      { key: "trend", header: "Trend", type: "badge" },
      { key: "lastUpdate", header: "Updated", type: "datetime" }
    ],
    rows: []
  };

  // Update table in real-time
  setInterval(async () => {
    // Fetch fresh data
    const stats = await fetchStats();

    dashboardData.rows = [
      {
        metric: "Active Connections",
        value: stats.activeConnections,
        trend: stats.connectionsTrend,
        lastUpdate: Date.now()
      },
      {
        metric: "Memory Usage",
        value: stats.memoryMB,
        trend: stats.memoryTrend,
        lastUpdate: Date.now()
      },
      {
        metric: "CPU Load",
        value: stats.cpuPercent,
        trend: stats.cpuTrend,
        lastUpdate: Date.now()
      }
    ];

    // Clear console and display updated table
    console.clear();
    console.log(inspect.table(dashboardData, {
      theme: "dark",
      showBorder: true,
      compact: true
    }));

  }, 1000); // Update every second
}

createLiveDashboard();
```

### **Paginated Tables**
```javascript
function createPaginatedTable(data, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageData = data.slice(start, end);

  const table = {
    columns: [...], // your columns
    rows: pageData,
    caption: `Page ${page} of ${Math.ceil(data.length / pageSize)}`
  };

  return inspect.table(table, {
    showBorder: true,
    zebra: true
  });
}

// Usage
console.log(createPaginatedTable(largeDataset, 2, 10));
```

---

## 🛠️ **Utility Functions**

### **Table Builder Utility**
```javascript
class TableBuilder {
  constructor() {
    this.columns = [];
    this.rows = [];
    this.options = {};
  }

  addColumn(key, header, type = "string", options = {}) {
    this.columns.push({ key, header, type, ...options });
    return this;
  }

  addRow(data) {
    this.rows.push(data);
    return this;
  }

  setOption(key, value) {
    this.options[key] = value;
    return this;
  }

  build() {
    return inspect.table(
      { columns: this.columns, rows: this.rows },
      this.options
    );
  }

  render() {
    console.log(this.build());
  }
}

// Usage
new TableBuilder()
  .addColumn("name", "Name", "string", { width: 20 })
  .addColumn("status", "Status", "badge")
  .addColumn("latency", "Latency", "number", { format: v => `${v}ms` })
  .addRow({ name: "HTTP Proxy", status: "connected", latency: 28 })
  .addRow({ name: "WebSocket", status: "connecting", latency: 125 })
  .setOption("theme", "dark")
  .setOption("zebra", true)
  .render();
```

### **Table Comparison Utility**
```javascript
function compareTables(table1, table2, compareBy = "name") {
  const comparison = {
    columns: [
      { key: compareBy, header: "Key", type: "string" },
      { key: "table1", header: "Table 1", type: "string" },
      { key: "table2", header: "Table 2", type: "string" },
      { key: "match", header: "Match", type: "boolean" }
    ],
    rows: []
  };

  // Compare rows
  table1.rows.forEach((row1) => {
    const row2 = table2.rows.find(r => r[compareBy] === row1[compareBy]);
    comparison.rows.push({
      [compareBy]: row1[compareBy],
      table1: JSON.stringify(row1),
      table2: row2 ? JSON.stringify(row2) : "Missing",
      match: !!row2 && JSON.stringify(row1) === JSON.stringify(row2)
    });
  });

  return inspect.table(comparison, {
    theme: "dark",
    zebra: true
  });
}
```

---

## 📝 **Best Practices**

### **1. Keep Tables Focused**
```javascript
// ❌ Too many columns
const badTable = {
  columns: Array(15).fill({ key: "col", header: "Column" }), // Too wide
  rows: Array(100).fill({}) // Too long
};

// ✅ Focused table
const goodTable = {
  columns: [
    { key: "keyMetric", header: "Key Metric", width: 20 },
    { key: "value", header: "Value", width: 10 },
    { key: "status", header: "Status", width: 10 }
  ],
  rows: data.slice(0, 20) // Show only top 20
};
```

### **2. Use Appropriate Column Types**
```javascript
const typedTable = {
  columns: [
    { key: "name", type: "string" },      // Text data
    { key: "count", type: "integer" },    // Whole numbers
    { key: "price", type: "float" },      // Decimal numbers
    { key: "active", type: "boolean" },   // True/False
    { key: "date", type: "datetime" },    // Date & time
    { key: "progress", type: "percentage" }, // Percentages
    { key: "size", type: "bytes" },       // File sizes
    { key: "tags", type: "array" }        // Arrays
  ],
  rows: [...]
};
```

### **3. Add Context with Captions**
```javascript
const tableWithContext = {
  columns: [...],
  rows: [...],
  caption: "Connection Statistics - Last Updated: " + new Date().toLocaleString()
};
```

### **4. Handle Large Datasets**
```javascript
function createPaginatedView(data, pageSize = 25) {
  const totalPages = Math.ceil(data.length / pageSize);

  return {
    columns: [...],
    rows: data.slice(0, pageSize),
    caption: `Showing 1-${pageSize} of ${data.length} entries`
  };
}
```

---

## 🎨 **Colorful Tables with Theme Integration**

### **Protocol Status Dashboard**
```javascript
const protocolDashboard = {
  columns: [
    { key: "protocol", header: "Protocol", type: "string", width: 12 },
    { key: "status", header: "Status", type: "badge", width: 10 },
    {
      key: "color",
      header: "Color",
      type: "color",
      format: (value) => ({
        text: value,
        background: value + "20", // 20% opacity
        border: value
      })
    },
    { key: "connections", header: "Connections", type: "number", align: "right" },
    { key: "latency", header: "Avg Latency", type: "duration", align: "right" }
  ],
  rows: [
    {
      protocol: "HTTP",
      status: "connected",
      color: "#10B981", // Green
      connections: 2450,
      latency: 28
    },
    {
      protocol: "HTTPS",
      status: "connected",
      color: "#34D399", // Light Green
      connections: 1890,
      latency: 1234
    },
    {
      protocol: "WebSocket",
      status: "connected",
      color: "#3B82F6", // Blue
      connections: 850,
      latency: 800
    },
    {
      protocol: "WSS",
      status: "connecting",
      color: "#60A5FA", // Light Blue
      connections: 0,
      latency: 2200
    }
  ]
};

console.log(inspect.table(protocolDashboard, {
  theme: "dark",
  showBorder: true,
  zebra: true
}));
```

---

## 📊 **Interactive Tables Example**

```javascript
// Example of creating an interactive table viewer
class InteractiveTableViewer {
  constructor(data, options = {}) {
    this.data = data;
    this.options = options;
    this.currentPage = 1;
    this.pageSize = options.pageSize || 20;
    this.sortColumn = options.sortBy;
    this.sortOrder = options.sortOrder || "asc";
  }

  render() {
    const paginatedData = this.getCurrentPage();
    const table = inspect.table(paginatedData, {
      ...this.options,
      caption: this.getCaption()
    });

    console.clear();
    console.log(table);
    console.log(this.getControls());
  }

  getCurrentPage() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return {
      columns: this.data.columns,
      rows: this.data.rows.slice(start, end)
    };
  }

  getCaption() {
    const total = this.data.rows.length;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, total);
    return `Page ${this.currentPage} - Showing ${start}-${end} of ${total}`;
  }

  getControls() {
    return `
Controls:
← Previous Page | → Next Page | ↑ Sort Asc | ↓ Sort Desc | Q Quit
    `;
  }

  // Add keyboard navigation, sorting, filtering...
}

// Usage
const viewer = new InteractiveTableViewer(largeDataset, {
  theme: "dark",
  pageSize: 10,
  showBorder: true
});
viewer.render();
```

---

## 🚀 **Quick Reference Cheat Sheet**

### **Common Patterns**
```javascript
// 1. Simple data display
inspect.table(arrayOfObjects)

// 2. Custom columns and formatting
inspect.table({ columns, rows }, options)

// 3. Export to different formats
inspect.table(data, { output: "html" })
inspect.table(data, { output: "json" })
inspect.table(data, { output: "csv" })

// 4. Themed tables
inspect.table(data, { theme: "dark", colors: true })

// 5. Sorted and filtered
inspect.table(data, { sortBy: "name", filter: "active" })
```

### **Column Type Quick Reference**
```javascript
const columnTypes = {
  text: "string",      // Plain text
  numbers: "number",   // Formatted numbers
  trueFalse: "boolean", // ✓/✗ icons
  dates: "date",       // Date formatting
  times: "datetime",   // Date & time
  files: "bytes",      // KB, MB, GB
  progress: "percentage", // 75%
  status: "badge",     // Colored badges
  code: "code",        // Monospace
  json: "json",        // Pretty JSON
  color: "color"       // Color swatches
};
```

### **Performance Tips**
1. **Limit rows** for console display: `maxRows: 50`
2. **Use pagination** for large datasets
3. **Pre-compute** formatted values
4. **Cache** frequently displayed tables
5. **Use compact mode** for dense data: `compact: true`

---

## 📚 **Real-world Examples**

### **1. Server Monitoring Dashboard**
```javascript
// Simulate server monitoring data
function createServerMonitor() {
  const servers = [
    { name: "web-01", region: "us-east", cpu: 45, memory: 65, status: "healthy" },
    { name: "web-02", region: "us-west", cpu: 78, memory: 89, status: "warning" },
    { name: "api-01", region: "eu-central", cpu: 22, memory: 34, status: "healthy" },
    { name: "db-01", region: "asia-pacific", cpu: 92, memory: 95, status: "critical" }
  ];

  return inspect.table({
    columns: [
      { key: "name", header: "Server", type: "string" },
      { key: "region", header: "Region", type: "string" },
      { key: "cpu", header: "CPU %", type: "percentage", align: "right" },
      { key: "memory", header: "Memory %", type: "percentage", align: "right" },
      {
        key: "status",
        header: "Status",
        type: "badge",
        format: (value) => {
          const colors = {
            healthy: "green",
            warning: "orange",
            critical: "red"
          };
          return { text: value, color: colors[value] };
        }
      }
    ],
    rows: servers
  }, {
    theme: "dark",
    showBorder: true,
    zebra: true,
    caption: `Server Status - ${new Date().toLocaleTimeString()}`
  });
}

// Update every 5 seconds
setInterval(() => {
  console.clear();
  console.log(createServerMonitor());
}, 5000);
```

### **2. API Documentation Generator**
```javascript
function generateAPIDocs(endpoints) {
  const tableData = {
    columns: [
      { key: "method", header: "Method", type: "badge", width: 8 },
      { key: "path", header: "Path", type: "code", width: 30 },
      { key: "description", header: "Description", type: "string", width: 40 },
      { key: "auth", header: "Auth", type: "string", width: 8 },
      { key: "example", header: "Example", type: "code", width: 30 }
    ],
    rows: endpoints
  };

  return inspect.table(tableData, {
    theme: "dark",
    showBorder: true,
    compact: true
  });
}

// Generate documentation
const apiDocs = generateAPIDocs([
  {
    method: "GET",
    path: "/api/v1/users",
    description: "List all users",
    auth: "Bearer",
    example: "curl -H 'Authorization: Bearer token' https://api.example.com/users"
  },
  {
    method: "POST",
    path: "/api/v1/users",
    description: "Create new user",
    auth: "Bearer",
    example: "curl -X POST -d '{\"name\":\"John\"}' https://api.example.com/users"
  }
]);

console.log(apiDocs);
```

This comprehensive guide covers everything from basic usage to advanced patterns with `inspect.table()`. The function is incredibly versatile for displaying structured data in terminal applications, dashboards, documentation, and more!

# 📊 **Bun.inspect.table() - Complete Practical Guide**

## 🎯 **Quick Start Examples**

### **1. Basic Table Display**
```javascript
import { inspect } from "bun";

// Simple array of objects
const data = [
  { id: 1, name: "Alice", age: 25, active: true },
  { id: 2, name: "Bob", age: 30, active: false },
  { id: 3, name: "Charlie", age: 35, active: true }
];

console.log(inspect.table(data));
```
**Output:**
```
┌────┬─────────┬─────┬────────┐
│ id │ name    │ age │ active │
├────┼─────────┼─────┼────────┤
│ 1  │ Alice   │ 25  │ true   │
│ 2  │ Bob     │ 30  │ false  │
│ 3  │ Charlie │ 35  │ true   │
└────┴─────────┴─────┴────────┘
```

### **2. Advanced Table with Custom Formatting**
```javascript
import { inspect } from "bun";

const configTable = {
  columns: [
    { key: "property", header: "Property", type: "string" },
    { key: "type", header: "Type", type: "string" },
    { key: "required", header: "Required", type: "boolean" },
    { key: "default", header: "Default", type: "string" },
    { key: "description", header: "Description", type: "string" }
  ],
  rows: [
    { property: "listenHost", type: "string", required: false, default: '"0.0.0.0"', description: "Host to bind server to" },
    { property: "listenPort", type: "number", required: false, default: "random", description: "Port to listen on (0=auto)" },
    { property: "targetUrl", type: "string", required: true, default: "-", description: "Backend WebSocket URL" },
    { property: "maxConnections", type: "number", required: false, default: "10000", description: "Maximum concurrent connections" },
    { property: "idleTimeout", type: "number", required: false, default: "60000", description: "Idle timeout in milliseconds" }
  ]
};

console.log(inspect.table(configTable, {
  theme: "dark",
  showBorder: true,
  zebra: true
}));
```

## 🔧 **Complete API Reference**

### **Table Options**
```javascript
const options = {
  // Display Options
  maxRows: 100,           // Maximum rows to display
  maxColumns: 10,         // Maximum columns to display
  showHeaders: true,      // Show column headers
  showBorder: true,       // Show table border
  compact: false,         // Compact mode (reduced padding)
  zebra: true,           // Alternating row colors

  // Sorting & Filtering
  sortBy: "property",    // Column to sort by
  sortOrder: "asc",     // "asc" or "desc"
  filter: "required",   // Filter expression

  // Styling
  theme: "dark",        // "dark" or "light"
  colors: true,         // Enable colored output

  // Output Format
  output: "text",       // "text", "html", "json", "csv", "markdown"

  // Custom Styling
  style: {
    border: "rounded",  // "single", "double", "rounded", "none"
    padding: 1,         // Cell padding
    margin: 0,          // Table margin
    align: "center"     // Table alignment
  }
};
```

### **Column Configuration**
```javascript
const columns = [
  {
    key: "id",                    // Property key in row objects
    header: "ID",                 // Column header text
    type: "number",              // Data type for formatting
    width: 10,                   // Column width (auto if not specified)
    align: "right",              // "left", "center", or "right"
    sortable: true,              // Enable sorting
    filterable: true,            // Enable filtering
    format: (value) => `#${value}`, // Custom formatter function
    truncate: 50,                // Truncate at N characters
    ellipsis: true,              // Show ellipsis when truncated
    case: "title"                // "upper", "lower", "title"
  }
];
```

## 🎨 **Column Types & Formatters**

### **Available Column Types**
```javascript
const typeExamples = {
  columns: [
    { key: "type", header: "Type", type: "string" },
    { key: "example", header: "Example", type: "string" },
    { key: "formatted", header: "Formatted", type: "string" }
  ],
  rows: [
    { type: "string", example: "Hello World", formatted: "Hello World" },
    { type: "number", example: 1234.56, formatted: "1,234.56" },
    { type: "integer", example: 1234, formatted: "1,234" },
    { type: "float", example: 1234.5678, formatted: "1,234.5678" },
    { type: "boolean", example: true, formatted: "✓ true" },
    { type: "date", example: new Date(), formatted: "2026-01-06" },
    { type: "datetime", example: new Date(), formatted: "2026-01-06 15:30:00" },
    { type: "duration", example: 300000, formatted: "5m" },
    { type: "bytes", example: 1048576, formatted: "1.00 MB" },
    { type: "percentage", example: 0.755, formatted: "75.5%" },
    { type: "color", example: "#3B82F6", formatted: "■ #3B82F6" },
    { type: "badge", example: "success", formatted: "● success" },
    { type: "code", example: "console.log()", formatted: "`console.log()`" },
    { type: "json", example: { key: "value" }, formatted: "{ key: 'value' }" }
  ]
};
```

### **Custom Formatter Examples**
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
        const filled = "█".repeat(Math.floor(value / 10));
        const empty = "░".repeat(10 - Math.floor(value / 10));
        return `${filled}${empty} ${value}%`;
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
      format: (value) => value.map(tag => `#${tag}`).join(", ")
    },
    {
      key: "status",
      header: "Status",
      type: "badge",
      format: (value) => {
        const colors = {
          connected: "green",
          connecting: "orange",
          disconnected: "red"
        };
        return { text: value, color: colors[value] };
      }
    }
  ],
  rows: [
    {
      amount: 1234.56,
      progress: 75,
      timestamp: Date.now(),
      tags: ["urgent", "backend"],
      status: "connected"
    },
    {
      amount: 789.01,
      progress: 30,
      timestamp: Date.now() - 86400000,
      tags: ["monitoring"],
      status: "connecting"
    }
  ]
};
```

## 📤 **Export Examples**

### **Export to Different Formats**
```javascript
import { inspect } from "bun";

const data = [
  { name: "HTTP Proxy", status: "Stable", version: "1.0" },
  { name: "HTTPS Proxy", status: "Stable", version: "1.0" },
  { name: "WebSocket Proxy", status: "Stable", version: "1.3.5" }
];

// Export as Text (Default)
console.log(inspect.table(data, { output: "text" }));

// Export as HTML
const html = inspect.table(data, { output: "html" });
await Bun.write("table.html", html);

// Export as JSON
const json = inspect.table(data, { output: "json" });
await Bun.write("table.json", JSON.stringify(JSON.parse(json), null, 2));

// Export as CSV
const csv = inspect.table(data, { output: "csv" });
await Bun.write("table.csv", csv);

// Export as Markdown
const markdown = inspect.table(data, { output: "markdown" });
await Bun.write("table.md", markdown);
```

### **HTML Export Example**
```javascript
const htmlTable = inspect.table(configTable, {
  output: "html",
  theme: "dark",
  zebra: true
});

// Resulting HTML
console.log(htmlTable);
/*
<table class="bun-table bun-theme-dark bun-zebra">
  <thead>
    <tr>
      <th>Property</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>listenHost</td><td>string</td><td>false</td><td>"0.0.0.0"</td><td>Host to bind server to</td></tr>
    ...
  </tbody>
</table>
*/
```

## 🌐 **Proxy Configuration Tables**

### **Complete Proxy Configuration Example**
```javascript
import { inspect } from "bun";

const proxyConfigs = [
  {
    protocol: "HTTP",
    listenPort: 8080,
    maxConnections: 10000,
    compression: true,
    ssl: false,
    status: "active"
  },
  {
    protocol: "HTTPS",
    listenPort: 8443,
    maxConnections: 5000,
    compression: true,
    ssl: true,
    status: "active"
  },
  {
    protocol: "WebSocket",
    listenPort: 3000,
    maxConnections: 20000,
    compression: true,
    ssl: false,
    status: "connecting"
  },
  {
    protocol: "WSS",
    listenPort: 443,
    maxConnections: 10000,
    compression: true,
    ssl: true,
    status: "error"
  }
];

const proxyTable = {
  columns: [
    { key: "protocol", header: "Protocol", type: "string" },
    { key: "listenPort", header: "Port", type: "number", align: "right" },
    { key: "maxConnections", header: "Max Conn", type: "number", format: v => v.toLocaleString(), align: "right" },
    { key: "compression", header: "Compression", type: "boolean", format: v => v ? "✓ Enabled" : "✗ Disabled" },
    { key: "ssl", header: "SSL/TLS", type: "boolean", format: v => v ? "✓ Yes" : "✗ No" },
    {
      key: "status",
      header: "Status",
      type: "badge",
      format: (value) => {
        const colors = {
          active: "green",
          connecting: "orange",
          error: "red"
        };
        return { text: value, color: colors[value] };
      }
    }
  ],
  rows: proxyConfigs
};

console.log(inspect.table(proxyTable, {
  theme: "dark",
  showBorder: true,
  zebra: true,
  sortBy: "protocol"
}));
```

## 📈 **Performance Monitoring Dashboard**

### **Real-time Metrics Table**
```javascript
import { inspect } from "bun";

// Simulate real-time metrics
function getLiveMetrics() {
  return {
    columns: [
      { key: "metric", header: "Metric", type: "string" },
      { key: "value", header: "Value", type: "number", align: "right" },
      { key: "unit", header: "Unit", type: "string" },
      { key: "trend", header: "Trend", type: "badge" },
      { key: "threshold", header: "Threshold", type: "string", align: "right" },
      { key: "status", header: "Status", type: "badge" }
    ],
    rows: [
      {
        metric: "Active Connections",
        value: Math.floor(Math.random() * 10000),
        unit: "connections",
        trend: Math.random() > 0.5 ? "up" : "down",
        threshold: "10,000",
        status: Math.random() > 0.1 ? "healthy" : "warning"
      },
      {
        metric: "Avg Latency",
        value: Math.floor(Math.random() * 200),
        unit: "ms",
        trend: Math.random() > 0.5 ? "down" : "up",
        threshold: "100ms",
        status: Math.random() > 0.2 ? "good" : "warning"
      },
      {
        metric: "Error Rate",
        value: Math.random() * 5,
        unit: "%",
        trend: Math.random() > 0.5 ? "up" : "down",
        threshold: "1%",
        status: Math.random() > 0.3 ? "good" : "error"
      },
      {
        metric: "Throughput",
        value: Math.floor(Math.random() * 20000),
        unit: "req/s",
        trend: "up",
        threshold: "10,000 req/s",
        status: "excellent"
      }
    ]
  };
}

// Update dashboard every second
setInterval(() => {
  console.clear();
  console.log(inspect.table(getLiveMetrics(), {
    theme: "dark",
    showBorder: true,
    zebra: true,
    compact: true,
    caption: `Live Metrics - ${new Date().toLocaleTimeString()}`
  }));
}, 1000);
```

## 🎯 **Quick Reference Cheat Sheet**

### **Common Patterns**
```javascript
// 1. Simple array of objects
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

// 6. Compact mode
inspect.table(data, { compact: true })

// 7. Zebra striping
inspect.table(data, { zebra: true })

// 8. No borders
inspect.table(data, { showBorder: false })
```

### **Column Type Quick Reference**
| Type | Example Input | Formatted Output | Description |
|------|---------------|------------------|-------------|
| `"string"` | `"hello"` | `hello` | Plain text |
| `"number"` | `1234.56` | `1,234.56` | Formatted number |
| `"integer"` | `1234` | `1,234` | Integer with commas |
| `"float"` | `1234.5678` | `1,234.5678` | Floating point |
| `"boolean"` | `true` | `✓ true` | Checkmark/cross |
| `"date"` | `Date.now()` | `2026-01-06` | Date only |
| `"datetime"` | `Date.now()` | `2026-01-06 15:30:00` | Date and time |
| `"duration"` | `300000` | `5m` | Human readable duration |
| `"bytes"` | `1048576` | `1.00 MB` | File size format |
| `"percentage"` | `0.755` | `75.5%` | Percentage |
| `"color"` | `"#3B82F6"` | `■ #3B82F6` | Color swatch |
| `"badge"` | `"success"` | `● success` | Colored badge |
| `"code"` | `"console.log()"` | `` `console.log()` `` | Monospace code |
| `"json"` | `{key: "value"}` | `{ key: "value" }` | Pretty JSON |

## 🚀 **Utility Functions**

### **Table Builder Class**
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
    return { columns: this.columns, rows: this.rows };
  }

  render() {
    console.log(inspect.table(this.build(), this.options));
  }
}

// Usage
new TableBuilder()
  .addColumn("name", "Name", "string", { width: 20 })
  .addColumn("status", "Status", "badge")
  .addColumn("latency", "Latency", "number", { format: v => `${v}ms`, align: "right" })
  .addRow({ name: "HTTP Proxy", status: "connected", latency: 28 })
  .addRow({ name: "WebSocket", status: "connecting", latency: 125 })
  .setOption("theme", "dark")
  .setOption("zebra", true)
  .render();
```

### **Paginated Table Viewer**
```javascript
function createPaginatedView(data, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageData = data.slice(start, end);

  return {
    columns: data.columns,
    rows: pageData,
    caption: `Page ${page} of ${Math.ceil(data.rows.length / pageSize)} (${start+1}-${end} of ${data.rows.length})`
  };
}

// Usage with inspect.table
const largeDataset = { columns: [...], rows: Array(100).fill(...) };
const page1 = createPaginatedView(largeDataset, 1, 10);
console.log(inspect.table(page1, { theme: "dark" }));
```

## 📝 **Best Practices**

### **1. Keep Tables Focused**
```javascript
// ❌ Too many columns/rows
inspect.table({ columns: Array(20).fill(...), rows: Array(100).fill(...) });

// ✅ Focused table
inspect.table({
  columns: [
    { key: "keyMetric", header: "Key Metric", width: 20 },
    { key: "value", header: "Value", width: 10 },
    { key: "status", header: "Status", width: 10 }
  ],
  rows: data.slice(0, 20) // Show only top 20 rows
});
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
  caption: `Connection Statistics - Last Updated: ${new Date().toLocaleString()}`
};
```

## 🎨 **Color Theme Integration**

### **Protocol Status Dashboard with Colors**
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
    }
  ]
};

console.log(inspect.table(protocolDashboard, {
  theme: "dark",
  showBorder: true,
  zebra: true
}));
```

## 🔄 **Interactive Example**

```javascript
// Interactive table viewer with keyboard navigation
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

This comprehensive guide shows how to use `Bun.inspect.table()` for everything from simple data display to complex, interactive dashboards with custom formatting, export capabilities, and real-time updates. The API is incredibly versatile for terminal-based applications, monitoring dashboards, configuration displays, and more!

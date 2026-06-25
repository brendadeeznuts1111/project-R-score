# 📊 Bun.inspect.table() - Quick Reference

## 🎯 **Core Usage Patterns**

### **1. Simple Data Display**
```javascript
import { inspect } from "bun";

// Auto-detect columns from array of objects
const data = [
  { name: "HTTP", port: 80, status: "active" },
  { name: "HTTPS", port: 443, status: "active" }
];

inspect.table(data);
```

### **2. Custom Columns & Formatting**
```javascript
const tableData = {
  columns: [
    { key: "name", header: "Service", type: "string" },
    { key: "status", header: "Status", type: "badge" },
    { key: "uptime", header: "Uptime", type: "number", format: v => `${v}%` }
  ],
  rows: [
    { name: "API", status: "healthy", uptime: 99.9 },
    { name: "DB", status: "warning", uptime: 95.2 }
  ]
};

inspect.table(tableData, {
  theme: "dark",
  showBorder: true,
  compact: true
});
```

### **3. Export Formats**
```javascript
// HTML export
inspect.table(data, { output: "html" });

// JSON export
inspect.table(data, { output: "json" });

// CSV export
inspect.table(data, { output: "csv" });
```

### **4. Theming & Styling**
```javascript
inspect.table(data, {
  theme: "dark",        // "dark" | "light"
  colors: true,         // Enable colors
  showBorder: true,     // Show table borders
  zebra: true,          // Alternating row colors
  compact: false        // Compact mode
});
```

### **5. Sorting & Filtering**
```javascript
inspect.table(data, {
  sortBy: "name",           // Column to sort by
  sortOrder: "asc",         // "asc" | "desc"
  filter: (row) => row.status === "active"  // Filter function
});
```

## 🚀 **Advanced Options**

### **Column Types**
- `"string"` - Text data
- `"number"` - Numeric data
- `"boolean"` - True/false values
- `"badge"` - Status indicators
- `"date"` - Date/time values

### **Output Formats**
- `"text"` - Terminal display (default)
- `"html"` - HTML table
- `"json"` - JSON data
- `"csv"` - CSV format
- `"markdown"` - Markdown table

### **Theme Options**
- `"dark"` - Dark terminal theme
- `"light"` - Light terminal theme
- `customTheme` - Custom color scheme object

## 📋 **Quick Examples**

```javascript
// Metrics dashboard
const metrics = [
  { service: "API", requests: 1250, latency: 45, status: "healthy" },
  { service: "DB", requests: 890, latency: 120, status: "warning" }
];

inspect.table(metrics, {
  sortBy: "requests",
  sortOrder: "desc",
  theme: "dark"
});

// Configuration table
const config = {
  columns: [
    { key: "setting", header: "Setting" },
    { key: "value", header: "Value" },
    { key: "required", header: "Required", type: "boolean" }
  ],
  rows: [
    { setting: "port", value: "3000", required: true },
    { setting: "host", value: "0.0.0.0", required: false }
  ]
};

inspect.table(config);
```

## 🔗 **See Also**
- Full guide: [`BUN_INSPECT_GUIDE.md`](./BUN_INSPECT_GUIDE.md)
- Examples: [`bun-proxy/demo/`](./bun-proxy/demo/)

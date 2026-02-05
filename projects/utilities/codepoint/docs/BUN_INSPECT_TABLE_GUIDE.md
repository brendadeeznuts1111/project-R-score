# 📊 Bun.inspect.table() - Practical Guide

## Overview

`Bun.inspect.table(tabularData, properties, options)` is a powerful utility for displaying structured data in tabular format. It provides rich formatting, sorting, filtering, and theming capabilities.

## Basic Usage

### Simple Array of Objects

```javascript
import { inspect } from "bun";

const users = [
  {
    name: "Alice",
    age: 28,
    role: "admin",
    active: true,
    score: 95,
    department: "Engineering",
    salary: 95000,
    skills: ["JavaScript", "React", "Node.js"],
    os: "macOS",
    model: "MacBook Pro M2",
    dns: ["8.8.8.8", "1.1.1.1"]
  },
  {
    name: "Bob",
    age: 32,
    role: "user",
    active: true,
    score: 87,
    department: "Marketing",
    salary: 65000,
    skills: ["SEO", "Analytics"],
    os: "Windows",
    model: "Dell XPS 13",
    dns: ["192.168.1.1"]
  },
  {
    name: "Charlie",
    age: 25,
    role: "moderator",
    active: false,
    score: 92,
    department: "Support",
    salary: 55000,
    skills: ["Customer Service", "Documentation"],
    os: "Linux",
    model: "ThinkPad T14s",
    dns: ["208.67.222.222", "208.67.220.220"]
  },
  {
    name: "Diana",
    age: 29,
    role: "user",
    active: true,
    score: 88,
    department: "Engineering",
    salary: 85000,
    skills: ["Python", "Django", "PostgreSQL"],
    os: "macOS",
    model: "MacBook Air M1",
    dns: ["8.8.4.4", "8.8.8.8"]
  },
  {
    name: "Eve",
    age: 31,
    role: "admin",
    active: true,
    score: 96,
    department: "Engineering",
    salary: 110000,
    skills: ["TypeScript", "AWS", "Docker", "Kubernetes"],
    os: "Linux",
    model: "Framework Laptop",
    dns: ["1.1.1.1", "1.0.0.1"]
  }
];

// Basic table display
console.log("=== Basic User Table ===");
console.log(inspect.table(users));

// Advanced table with custom formatting and features
const advancedUserTable = {
  columns: [
    { key: "name", header: "Name", type: "string", width: 12 },
    { key: "age", header: "Age", type: "number", align: "right", width: 5 },
    { key: "role", header: "Role", type: "badge", width: 12 },
    { key: "department", header: "Department", type: "string", width: 15 },
    { key: "active", header: "Status", type: "boolean", width: 8 },
    { key: "score", header: "Score", type: "number", align: "right", width: 7 },
    {
      key: "salary",
      header: "Salary",
      type: "currency",
      align: "right",
      width: 12,
      format: (value) => `$${value.toLocaleString()}`
    },
    {
      key: "skills",
      header: "Skills",
      type: "string",
      width: 25,
      format: (skills) => skills.join(", ")
    },
    { key: "os", header: "OS", type: "string", width: 8 },
    { key: "model", header: "Model", type: "string", width: 15 },
    {
      key: "dns",
      header: "DNS Servers",
      type: "string",
      width: 20,
      format: (dns) => dns.join(", ")
    }
  ],
  rows: users
};

console.log("\n=== Advanced User Dashboard ===");
console.log(inspect.table(advancedUserTable, {
  theme: "dark",
  showBorder: true,
  zebra: true,
  caption: "Employee Management System"
}));

// Export to different formats
console.log("\n=== Export Examples ===");

// HTML Export
const htmlOutput = inspect.table(advancedUserTable, {
  output: "html",
  theme: "light"
});

console.log("HTML Export (first 200 chars):");
console.log(htmlOutput.substring(0, 200) + "...");

// JSON Export
const jsonOutput = inspect.table(advancedUserTable, {
  output: "json"
});

console.log("\nJSON Export (first 300 chars):");
console.log(jsonOutput.substring(0, 300) + "...");

// CSV Export
const csvOutput = inspect.table(advancedUserTable, {
  output: "csv"
});

console.log("\nCSV Export (first 200 chars):");
console.log(csvOutput.substring(0, 200) + "...");

// Interactive filtering and sorting examples
console.log("\n=== Interactive Examples ===");

// Filter by department
console.log("Engineering Team:");
console.log(inspect.table(advancedUserTable, {
  filter: (row) => row.department === "Engineering",
  theme: "dark",
  compact: true,
  caption: "Engineering Department"
}));

// Sort by salary (highest first)
console.log("\nTop Earners:");
console.log(inspect.table(advancedUserTable, {
  sortBy: "salary",
  sortOrder: "desc",
  maxRows: 3,
  theme: "dark",
  caption: "Top 3 Salaries"
}));

// Filter active users with high scores
console.log("\nActive High Performers (Score > 90):");
console.log(inspect.table(advancedUserTable, {
  filter: (row) => row.active && row.score > 90,
  sortBy: "score",
  sortOrder: "desc",
  theme: "dark",
  caption: "High Performing Active Users"
}));

// Filter by operating system
console.log("\nmacOS Users:");
console.log(inspect.table(advancedUserTable, {
  filter: (row) => row.os === "macOS",
  theme: "dark",
  caption: "macOS Users"
}));

// Filter by DNS configuration (users with multiple DNS servers)
console.log("\nUsers with Multiple DNS Servers:");
console.log(inspect.table(advancedUserTable, {
  filter: (row) => row.dns.length > 1,
  theme: "dark",
  caption: "Users with Multiple DNS Servers"
}));

// Department summary
const departmentStats = users.reduce((acc, user) => {
  if (!acc[user.department]) {
    acc[user.department] = { count: 0, totalSalary: 0, avgScore: 0, activeCount: 0 };
  }
  acc[user.department].count++;
  acc[user.department].totalSalary += user.salary;
  acc[user.department].avgScore += user.score;
  if (user.active) acc[user.department].activeCount++;
  return acc;
}, {});

const summaryRows = Object.entries(departmentStats).map(([dept, stats]) => ({
  department: dept,
  employees: stats.count,
  active: stats.activeCount,
  avgScore: Math.round(stats.avgScore / stats.count),
  totalSalary: stats.totalSalary,
  avgSalary: Math.round(stats.totalSalary / stats.count)
}));

const summaryTable = {
  columns: [
    { key: "department", header: "Department", type: "string", width: 15 },
    { key: "employees", header: "Total", type: "number", align: "right", width: 8 },
    { key: "active", header: "Active", type: "number", align: "right", width: 8 },
    { key: "avgScore", header: "Avg Score", type: "number", align: "right", width: 10 },
    {
      key: "totalSalary",
      header: "Total Salary",
      type: "currency",
      align: "right",
      width: 15,
      format: (value) => `$${value.toLocaleString()}`
    },
    {
      key: "avgSalary",
      header: "Avg Salary",
      type: "currency",
      align: "right",
      width: 15,
      format: (value) => `$${value.toLocaleString()}`
    }
  ],
  rows: summaryRows
};

console.log("\nDepartment Summary:");
console.log(inspect.table(summaryTable, {
  theme: "dark",
  showBorder: true,
  caption: "Department Statistics"
}));
```

### Enhanced Example with Full Features

```javascript
import { inspect } from "bun";

const users = [
  {
    name: "Alice",
    age: 28,
    role: "admin",
    active: true,
    score: 95,
    joined: new Date("2023-01-15"),
    department: "Engineering",
    salary: 95000,
    skills: ["JavaScript", "React", "Node.js"],
    os: "macOS",
    model: "MacBook Pro M2"
  },
  {
    name: "Bob",
    age: 32,
    role: "user",
    active: true,
    score: 87,
    joined: new Date("2023-03-22"),
    department: "Marketing",
    salary: 65000,
    skills: ["SEO", "Analytics"],
    os: "Windows",
    model: "Dell XPS 13"
  },
  {
    name: "Charlie",
    age: 25,
    role: "moderator",
    active: false,
    score: 92,
    joined: new Date("2023-02-10"),
    department: "Support",
    salary: 55000,
    skills: ["Customer Service", "Documentation"],
    os: "Linux",
    model: "ThinkPad T14s"
  },
  {
    name: "Diana",
    age: 29,
    role: "user",
    active: true,
    score: 88,
    joined: new Date("2023-04-05"),
    department: "Engineering",
    salary: 85000,
    skills: ["Python", "Django", "PostgreSQL"],
    os: "macOS",
    model: "MacBook Air M1"
  },
  {
    name: "Eve",
    age: 31,
    role: "admin",
    active: true,
    score: 96,
    joined: new Date("2022-12-01"),
    department: "Engineering",
    salary: 110000,
    skills: ["TypeScript", "AWS", "Docker", "Kubernetes"],
    os: "Linux",
    model: "Framework Laptop"
  }
];

// Display with custom columns and formatting
const userTable = {
  columns: [
    { key: "name", header: "Name", type: "string", width: 12 },
    { key: "age", header: "Age", type: "number", align: "right", width: 5 },
    { key: "role", header: "Role", type: "badge", width: 10 },
    { key: "department", header: "Department", type: "string", width: 15 },
    { key: "active", header: "Active", type: "boolean", width: 8 },
    { key: "score", header: "Score", type: "number", align: "right", width: 7 },
    {
      key: "salary",
      header: "Salary",
      type: "currency",
      align: "right",
      width: 12,
      format: (value) => `$${value.toLocaleString()}`
    },
    { key: "os", header: "OS", type: "string", width: 8 },
    { key: "model", header: "Model", type: "string", width: 15 },
    {
      key: "joined",
      header: "Joined",
      type: "datetime",
      width: 12,
      format: (value) => value.toLocaleDateString()
    }
  ],
  rows: users
};

console.log(inspect.table(userTable, {
  theme: "dark",
  showBorder: true,
  zebra: true,
  caption: "User Management Dashboard"
}));

// Display sorted by score (descending)
console.log("\nTop Performers:");
console.log(inspect.table(userTable, {
  sortBy: "score",
  sortOrder: "desc",
  maxRows: 3,
  theme: "dark",
  compact: true,
  caption: "Top 3 Users by Score"
}));

// Display only active users
console.log("\nActive Users Only:");
console.log(inspect.table(userTable, {
  filter: (row) => row.active,
  theme: "dark",
  caption: "Active Users"
}));

// Display by department
console.log("\nEngineering Team:");
console.log(inspect.table(userTable, {
  filter: (row) => row.department === "Engineering",
  theme: "dark",
  caption: "Engineering Department"
}));
```

### Structured Data with Columns

```javascript
const simpleUserTable = {
  columns: [
    { key: "name", header: "Name" },
    { key: "age", header: "Age" },
    { key: "role", header: "Role" }
  ],
  rows: [
    { name: "Alice", age: 28, role: "admin" },
    { name: "Bob", age: 32, role: "user" },
    { name: "Charlie", age: 25, role: "moderator" }
  ]
};

console.log(inspect.table(simpleUserTable));
```

## Parameters

### tabularData

**Type:** `TableData | any[]`

Can be either:
- An array of objects (columns auto-detected)
- A `TableData` object with explicit `columns` and `rows`

### properties (Optional)

**Type:** `TableOptions`

Configuration object for table display and behavior.

### options (Optional)

**Type:** `TableOptions`

Same as properties parameter - used for backward compatibility.

## TableData Interface

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
  align?: 'left' | 'center' | 'right'; // Text alignment
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

## TableOptions Interface

```typescript
interface TableOptions {
  // Display options
  maxRows?: number;          // Maximum rows to display
  maxColumns?: number;       // Maximum columns to display
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

  // Caption
  caption?: string;          // Table caption/title
}

type FilterFunction = (row: any, index: number) => boolean;
```

## Column Types & Formatting

### Built-in Column Types

```javascript
const data = {
  columns: [
    { key: "name", header: "Name", type: "string" },
    { key: "count", header: "Count", type: "number" },
    { key: "active", header: "Active", type: "boolean" },
    { key: "created", header: "Created", type: "datetime" },
    { key: "status", header: "Status", type: "badge" },
    { key: "progress", header: "Progress", type: "percentage" }
  ],
  rows: [
    {
      name: "Project A",
      count: 1250,
      active: true,
      created: new Date(),
      status: "success",
      progress: 85
    }
  ]
};

console.log(inspect.table(data));
```

### Custom Formatting

```javascript
const metrics = {
  columns: [
    {
      key: "metric",
      header: "Metric",
      type: "string"
    },
    {
      key: "value",
      header: "Value",
      format: (value, row) => {
        if (row.metric.includes("Memory")) {
          return `${(value / 1024 / 1024).toFixed(2)} MB`;
        }
        if (row.metric.includes("CPU")) {
          return `${value.toFixed(1)}%`;
        }
        return value.toLocaleString();
      }
    }
  ],
  rows: [
    { metric: "Memory Usage", value: 256 * 1024 * 1024 },
    { metric: "CPU Usage", value: 78.5 }
  ]
};

console.log(inspect.table(metrics));
```

## Sorting & Filtering

### Sorting

```javascript
const users = [
  { name: "Alice", age: 28, score: 95 },
  { name: "Bob", age: 32, score: 87 },
  { name: "Charlie", age: 25, score: 92 }
];

// Sort by score descending
console.log(inspect.table(users, {
  sortBy: "score",
  sortOrder: "desc"
}));
```

### Filtering

```javascript
// Filter function
console.log(inspect.table(users, {
  filter: (row) => row.age > 26
}));

// String filter (searches all fields)
console.log(inspect.table(users, {
  filter: "Alice"  // Case-insensitive search
}));
```

## Theming & Styling

### Built-in Themes

```javascript
console.log(inspect.table(data, {
  theme: "dark",    // "dark" or "light"
  showBorder: true,
  zebra: true
}));
```

### Custom Theme

```javascript
const customTheme = {
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
  }
};

console.log(inspect.table(data, {
  theme: customTheme,
  colors: true
}));
```

## Output Formats

### HTML Export

```javascript
const htmlOutput = inspect.table(data, {
  output: "html",
  theme: "dark"
});

// Write to file
await Bun.write("table.html", `
<!DOCTYPE html>
<html>
<head>
  <title>Data Table</title>
  <style>
    body { font-family: monospace; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 8px 12px; border: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  ${htmlOutput}
</body>
</html>`);
```

### JSON Export

```javascript
const jsonOutput = inspect.table(data, {
  output: "json"
});

await Bun.write("table.json", jsonOutput);
```

### CSV Export

```javascript
const csvOutput = inspect.table(data, {
  output: "csv"
});

await Bun.write("table.csv", csvOutput);
```

## Real-World Examples

### System Monitoring Dashboard

```javascript
const systemMetrics = {
  columns: [
    { key: "service", header: "Service", type: "string", width: 20 },
    { key: "status", header: "Status", type: "badge" },
    { key: "cpu", header: "CPU %", type: "percentage", align: "right" },
    { key: "memory", header: "Memory", type: "bytes", align: "right" },
    { key: "connections", header: "Conn", type: "number", align: "right" }
  ],
  rows: [
    { service: "Web Server", status: "healthy", cpu: 45, memory: 256 * 1024 * 1024, connections: 1250 },
    { service: "Database", status: "warning", cpu: 78, memory: 512 * 1024 * 1024, connections: 890 },
    { service: "Cache", status: "critical", cpu: 92, memory: 128 * 1024 * 1024, connections: 2100 }
  ]
};

console.log(inspect.table(systemMetrics, {
  theme: "dark",
  showBorder: true,
  caption: "System Health Dashboard",
  zebra: true
}));
```

### API Request Logs

```javascript
const requestLogs = {
  columns: [
    { key: "timestamp", header: "Time", type: "datetime", width: 20 },
    { key: "method", header: "Method", type: "badge", width: 8 },
    { key: "endpoint", header: "Endpoint", type: "string", width: 30 },
    { key: "status", header: "Status", type: "number", align: "right", width: 8 },
    { key: "duration", header: "Duration", type: "duration", align: "right" }
  ],
  rows: [
    {
      timestamp: new Date(),
      method: "GET",
      endpoint: "/api/users",
      status: 200,
      duration: 45
    },
    {
      timestamp: new Date(Date.now() - 1000),
      method: "POST",
      endpoint: "/api/users",
      status: 201,
      duration: 120
    }
  ]
};

console.log(inspect.table(requestLogs, {
  sortBy: "timestamp",
  sortOrder: "desc",
  filter: (row) => row.status < 400,
  caption: "API Request Logs"
}));
```

## Performance Tips

### Large Datasets

```javascript
// ❌ Don't display huge datasets directly
console.log(inspect.table(hugeDataset));

// ✅ Paginate and limit
console.log(inspect.table(largeDataset, {
  maxRows: 100,
  sortBy: "timestamp",
  sortOrder: "desc"
}));
```

### Pre-compute Expensive Operations

```javascript
// ✅ Pre-format data
const formattedData = rawData.map(row => ({
  ...row,
  formattedDate: new Date(row.timestamp).toLocaleString(),
  statusBadge: row.status === 'active' ? '✓ Active' : '✗ Inactive'
}));

console.log(inspect.table(formattedData));
```

## Integration Examples

### With Bun.serve

```javascript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    // Log requests in table format
    const logEntry = {
      time: new Date(),
      method: req.method,
      url: req.url,
      userAgent: req.headers.get("user-agent")
    };

    console.log(inspect.table([logEntry], {
      compact: true,
      showBorder: false
    }));

    return new Response("OK");
  }
});
```

### With Testing

```javascript
import { test, expect } from "bun:test";

test("API returns expected data structure", async () => {
  const response = await fetch("/api/data");
  const data = await response.json();

  // Use table for better test output
  console.log(inspect.table(data, {
    caption: "API Response Data"
  }));

  expect(data).toHaveLength(3);
  expect(data[0]).toHaveProperty("id");
});
```

## Quick Reference

### Most Common Options

```javascript
inspect.table(data, {
  // Basic display
  showBorder: true,
  compact: false,
  zebra: true,

  // Sorting & filtering
  sortBy: "columnName",
  sortOrder: "desc",
  filter: (row) => row.active,

  // Theming
  theme: "dark",
  colors: true,

  // Layout
  caption: "My Table",
  maxRows: 50
});
```

### Column Configuration

```javascript
{
  key: "fieldName",        // Required: data field
  header: "Display Name",  // Optional: column header
  type: "string",          // Optional: formatting type
  width: 20,               // Optional: column width
  align: "right",          // Optional: text alignment
  format: (value) => `${value}%`  // Optional: custom formatter
}
```

## Advanced Use Cases & Enhancements

### 📊 Data Manipulation & Display

#### Custom Column Selection & Formatting
```javascript
// Display specific columns with custom headers
console.log(inspect.table(enhancedUsers, {
  // Select and rename specific columns
  columns: ["name", "age", "role", "status"],
  // Optional: custom headers
  header: {
    name: "User Name",
    age: "Years",
    role: "Position",
    status: "Active Status"
  }
}));

// Or use an array of properties
console.log(inspect.table(enhancedUsers, ["name", "ageGroup", "initials", "active"]));
```

#### Dynamic Computed Columns
```javascript
// Add computed columns on the fly
console.log(inspect.table(enhancedUsers, {
  columns: ["name", "age", "role", "active", "seniority"],
  computedColumns: {
    seniority: (user) => {
      if (user.age >= 40) return "Senior";
      if (user.age >= 30) return "Mid-level";
      return "Junior";
    },
    performance: (user) => {
      const score = Math.random() * 100;
      return `${score.toFixed(1)}% ${score > 70 ? "🏆" : ""}`;
    }
  }
}));
```

#### Nested Objects in Tables
```javascript
const usersWithDetails = enhancedUsers.map(user => ({
  ...user,
  contact: {
    email: `${user.name.toLowerCase()}@company.com`,
    extension: Math.floor(Math.random() * 1000) + 1000
  },
  metrics: {
    loginCount: Math.floor(Math.random() * 100),
    lastLogin: new Date(Date.now() - Math.random() * 86400000 * 30)
  }
}));

// Show nested objects
console.log(inspect.table(usersWithDetails, {
  columns: ["name", "role", "contact", "metrics"],
  maxDepth: 2, // How deep to display nested objects
  compact: false // Show full object details
}));
```

### 🎨 Styling & Visualization

#### Advanced Table Styling Options
```javascript
console.log(inspect.table(enhancedUsers, {
  columns: ["name", "age", "role", "status", "ageGroup"],
  header: true,
  border: "rounded", // or "thick", "double", "none"
  cellPadding: 2,
  maxWidth: 50,
  colors: {
    header: "yellow",
    border: "gray",
    // Conditional row coloring
    row: (row, index) => row.active ? "green" : "red"
  }
}));
```

#### Progress Bar in Tables
```javascript
// Add visual progress indicators
const usersWithProgress = enhancedUsers.map(user => ({
  ...user,
  progress: Math.floor(Math.random() * 100),
  // Create a visual progress bar
  progressBar: () => {
    const width = 20;
    const filled = Math.floor((user.progress / 100) * width);
    return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${user.progress}%`;
  }
}));

console.log("\n📊 User Progress:");
console.log(inspect.table(usersWithProgress, {
  columns: ["name", "role", "progress", "progressBar"],
  cellFormatter: {
    progress: (value) => {
      if (value >= 80) return `🟢 ${value}%`;
      if (value >= 50) return `🟡 ${value}%`;
      return `🔴 ${value}%`;
    }
  }
}));
```

### 📋 Data Organization & Navigation

#### Sorting & Filtering Tables
```javascript
// Sort users by age and display
const sortedUsers = [...enhancedUsers].sort((a, b) => a.age - b.age);
console.log("👴 Age Sorted Users:");
console.log(inspect.table(sortedUsers, ["name", "age", "ageGroup", "role"]));

// Filter and display with custom formatting
const admins = enhancedUsers.filter(u => u.role === "Admin");
console.log("\n👑 Administrators:");
console.log(inspect.table(admins, {
  columns: ["name", "age", "status"],
  cellFormatter: {
    name: (value) => `🌟 ${value}`,
    status: (value) => value === "✅ Active" ? "🟢 Active" : "🔴 Inactive"
  }
}));
```

#### Pagination & Chunking
```javascript
// Display table in pages
function displayTablePage(data, page = 1, pageSize = 2) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageData = data.slice(start, end);

  console.log(`\n📄 Page ${page} (${start + 1}-${Math.min(end, data.length)} of ${data.length}):`);
  console.log(inspect.table(pageData, ["name", "age", "role", "status"]));

  if (end < data.length) {
    console.log("⬇️  More records available...");
  }
}

// Display paginated
displayTablePage(enhancedUsers, 1);
displayTablePage(enhancedUsers, 2);
displayTablePage(enhancedUsers, 3);
```

#### Grouped Tables with Headers
```javascript
// Create grouped table display
function displayGroupedTables() {
  const groups = enhancedUsers.reduce((acc, user) => {
    const key = user.role;
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {});

  Object.entries(groups).forEach(([role, users]) => {
    console.log(`\n📂 ${role} (${users.length} users)`);
    console.log("-".repeat(40));
    console.log(inspect.table(users, {
      columns: ["name", "age", "status", "ageGroup"],
      border: "single",
      header: true,
      colors: {
        header: "cyan",
        row: (row) => row.active ? "green" : "dim"
      }
    }));
  });
}

displayGroupedTables();
```

### 📈 Specialized Display Formats

#### Comparison Tables
```javascript
// Create comparison table
const userComparison = enhancedUsers.map(user => ({
  "👤 User": user.name,
  "📊 Role": user.role,
  "🎂 Age": `${user.age} (${user.ageGroup})`,
  "⚡ Status": user.status,
  "🆔 Initials": user.initials,
  "📈 Activity": user.active ? "High" : "Low"
}));

console.log("\n📈 User Comparison:");
console.log(inspect.table(userComparison, {
  border: "double",
  cellPadding: 3,
  align: {
    "👤 User": "left",
    "🎂 Age": "center",
    "📈 Activity": "right"
  }
}));
```

### 💾 Export & Integration

#### Export & Save Table Data
```javascript
import { writeFileSync } from 'fs';

// Function to export table as markdown
function exportAsMarkdownTable(data, columns) {
  const headers = columns.map(col => col.charAt(0).toUpperCase() + col.slice(1));
  const separator = headers.map(() => "---");

  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col];
      return typeof value === 'boolean' ? (value ? "✅" : "❌") : value;
    }).join(" | ")
  );

  const markdown = [
    `| ${headers.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...rows.map(row => `| ${row} |`)
  ].join("\n");

  writeFileSync("users-table.md", markdown);
  console.log("📁 Table exported to users-table.md");

  return markdown;
}

// Export the table
exportAsMarkdownTable(enhancedUsers, ["name", "age", "role", "active"]);
```

#### Quick One-liner Tables
```javascript
// Super concise table displays
console.log(inspect.table(users, ["name", "role"]));
console.log(inspect.table(users, { compact: true }));
console.log(inspect.table(users, { border: "none", header: false }));
```

This guide covers the essential usage patterns for `Bun.inspect.table()`. For more advanced features, refer to the comprehensive guide in `BUN_INSPECT_GUIDE.md`.

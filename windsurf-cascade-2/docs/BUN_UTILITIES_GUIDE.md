# 🎯 Mastering Bun Utilities: A Comprehensive Guide

This guide demonstrates advanced usage of Bun's powerful utility functions with practical examples and real-world applications.

## 📊 `Bun.inspect.table()` - Advanced Table Display

```javascript
// Advanced table inspection with custom formatting
import { feature } from "bun:bundle";

const users = [
  { id: 1, name: "Alice 👩‍💻", age: 28, status: "active", salary: 75000 },
  { id: 2, name: "Bob 🧑‍🔧", age: 35, status: "inactive", salary: 85000 },
  { id: 3, name: "Charlie 🧑‍🚀", age: 42, status: "active", salary: 95000 },
  { id: 4, name: "Diana 👩‍🎨", age: 31, status: "pending", salary: 65000 },
  { id: 5, name: "Eve 👩‍🔬", age: 29, status: "active", salary: 80000 }
];

// Basic table
console.log("📋 Basic Table:");
console.log(Bun.inspect.table(users));

// With specific properties
console.log("\n🎯 Selected Columns:");
console.log(Bun.inspect.table(users, ["name", "status", "salary"]));

// With options
console.log("\n🎨 Styled Table:");
console.log(Bun.inspect.table(users, undefined, {
  border: "rounded", // 'single', 'double', 'rounded', 'none'
  compact: false,
  columns: ["id", "name", "age", "status", "salary"],
  align: {
    id: "right",
    age: "right",
    salary: "right"
  }
}));

// Color-coded table
const coloredUsers = users.map(user => ({
  ...user,
  name: user.status === 'active' ? `\x1b[32m${user.name}\x1b[0m` : 
         user.status === 'inactive' ? `\x1b[31m${user.name}\x1b[0m` : 
         `\x1b[33m${user.name}\x1b[0m` 
}));

console.log("\n🌈 Color-coded Table:");
console.log(Bun.inspect.table(coloredUsers, ["name", "status", "salary"], {
  border: "single",
  compact: true
}));
```

## 🎭 `Bun.inspect.custom` - Custom Object Inspection

```javascript
// Custom inspect implementations for classes
class DatabaseConnection {
  constructor(host, port, poolSize = 10) {
    this.host = host;
    this.port = port;
    this.poolSize = poolSize;
    this.connections = new Map();
    this.stats = {
      queries: 0,
      errors: 0,
      connectedSince: new Date()
    };
  }

  // Custom inspection method
  [Bun.inspect.custom]() {
    const active = Array.from(this.connections.values())
      .filter(conn => conn.status === 'active').length;

    return {
      type: 'DatabaseConnection',
      config: {
        host: this.host,
        port: this.port,
        poolSize: this.poolSize
      },
      status: {
        activeConnections: active,
        available: this.poolSize - active,
        uptime: Math.floor((Date.now() - this.stats.connectedSince) / 1000) + 's'
      },
      stats: this.stats,
      // Return a table for the connections
      connections: Bun.inspect.table(
        Array.from(this.connections.values()).map(conn => ({
          id: conn.id.substring(0, 8),
          user: conn.user,
          database: conn.database,
          status: conn.status,
          duration: `${Math.floor((Date.now() - conn.createdAt) / 1000)}s` 
        })),
        undefined,
        { border: 'none', compact: true }
      )
    };
  }

  // Add a connection method to demonstrate
  addConnection(user, database) {
    const id = crypto.randomUUID();
    this.connections.set(id, {
      id,
      user,
      database,
      status: 'active',
      createdAt: Date.now()
    });
    this.stats.queries++;
    return id;
  }
}

// Usage
const db = new DatabaseConnection('localhost', 5432, 20);
db.addConnection('admin', 'production');
db.addConnection('app_user', 'analytics');

console.log("\n🔍 Custom Database Inspection:");
console.log(db); // Automatically uses [Bun.inspect.custom]

// More complex example with inheritance
class APIResponse {
  constructor(data, meta = {}) {
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...meta
    };
  }

  [Bun.inspect.custom]() {
    return {
      [Bun.inspect.custom]: 'APIResponse',
      data: Bun.inspect.table(
        Array.isArray(this.data) ? this.data : [this.data],
        undefined,
        { border: 'single' }
      ),
      meta: this.meta
    };
  }
}

const apiData = new APIResponse(users.slice(0, 3), { 
  page: 1, 
  total: users.length 
});
console.log("\n🌐 API Response Inspection:");
console.log(apiData);
```

## 🔍 `Bun.deepEquals()` - Advanced Comparison

```javascript
// Deep equality with various data types
const obj1 = {
  name: "Test",
  values: [1, 2, 3],
  nested: {
    deep: true,
    list: ["a", "b", "c"],
    date: new Date("2024-01-01"),
    buffer: new Uint8Array([1, 2, 3]),
    regex: /test/i,
    map: new Map([["key", "value"]]),
    set: new Set([1, 2, 3])
  }
};

const obj2 = {
  name: "Test",
  values: [1, 2, 3],
  nested: {
    deep: true,
    list: ["a", "b", "c"],
    date: new Date("2024-01-01"),
    buffer: new Uint8Array([1, 2, 3]),
    regex: /test/i,
    map: new Map([["key", "value"]]),
    set: new Set([1, 2, 3])
  }
};

const obj3 = {
  ...obj1,
  nested: { ...obj1.nested, deep: false }
};

console.log("\n🔍 Deep Equality Tests:");
console.log("obj1 === obj2:", Bun.deepEquals(obj1, obj2)); // true
console.log("obj1 === obj3:", Bun.deepEquals(obj1, obj3)); // false

// Circular reference comparison
function createCircular() {
  const obj = { name: "Circular" };
  obj.self = obj;
  return obj;
}

const circular1 = createCircular();
const circular2 = createCircular();

console.log("\n🌀 Circular Reference Comparison:");
console.log("Circular references equal:", Bun.deepEquals(circular1, circular2));

// Advanced comparison with custom logic
class CustomEqual {
  constructor(value) {
    this.value = value;
  }

  // Custom equality method
  `Bun.deepEquals.custom`(other) {
    if (other instanceof CustomEqual) {
      return this.value === other.value;
    }
    return false;
  }
}

const custom1 = new CustomEqual(42);
const custom2 = new CustomEqual(42);
const custom3 = new CustomEqual(43);

console.log("\n🎭 Custom Equality Implementation:");
console.log("custom1 === custom2:", Bun.deepEquals(custom1, custom2)); // true
console.log("custom1 === custom3:", Bun.deepEquals(custom1, custom3)); // false

// Performance comparison vs JSON.stringify
function compareWithJSON(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const largeObj = Array.from({ length: 1000 }, (_, i) => ({ 
  id: i, 
  data: `item-${i}`, 
  nested: { value: Math.random() } 
}));

const largeCopy = JSON.parse(JSON.stringify(largeObj));

console.log("\n⚡ Performance Test:");
console.time("Bun.deepEquals");
const deepEqualResult = Bun.deepEquals(largeObj, largeCopy);
console.timeEnd("Bun.deepEquals");

console.time("JSON.stringify compare");
const jsonResult = compareWithJSON(largeObj, largeCopy);
console.timeEnd("JSON.stringify compare");

console.log("Results match:", deepEqualResult === jsonResult);
```

## 🛡️ `Bun.escapeHTML()` - Security & Formatting

```javascript
// HTML escaping for security
const unsafeInput = `
  <script>alert('XSS')</script>
  <img src="x" onerror="alert(1)">
  <a href="javascript:alert('hack')">Click me</a>
  Normal text with <strong>bold</strong> & "quotes"
`;

console.log("\n🛡️ HTML Escaping:");
console.log("Original unsafe input:");
console.log(unsafeInput);

console.log("\nEscaped output:");
console.log(Bun.escapeHTML(unsafeInput));

// Template tag for safe HTML
function html(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += Bun.escapeHTML(String(values[i])) + strings[i + 1];
  }
  return result;
}

const userData = {
  name: "<script>alert('pwned')</script>",
  bio: "I <3 JavaScript & HTML!",
  website: "https://evil.com\" onload=\"alert(1)"
};

const safeHTML = html`
  <div class="profile">
    <h2>${userData.name}</h2>
    <p>${userData.bio}</p>
    <a href="${userData.website}">Website</a>
  </div>
`;

console.log("\n🔐 Safe HTML Template:");
console.log(safeHTML);

// Comparison with other escaping methods
const testStrings = [
  "Regular text",
  "<script>alert('test')</script>",
  "A & B < C > D",
  "\"Quotes\" & 'Apostrophes'",
  "Emoji 😀 and Unicode 你好",
  "Multiple\nlines\nhere"
];

console.log("\n📊 Escaping Comparison:");
console.log(Bun.inspect.table(
  testStrings.map(str => ({
    "Input": str.length > 20 ? str.substring(0, 20) + "..." : str,
    "Bun.escapeHTML": Bun.escapeHTML(str).length > 30 ? 
      Bun.escapeHTML(str).substring(0, 30) + "..." : Bun.escapeHTML(str),
    "Length Change": `${str.length} → ${Bun.escapeHTML(str).length}` 
  })),
  undefined,
  { border: "single", compact: false }
));

// Real-world example: HTML sanitizer
class HTMLSanitizer {
  static allowedTags = ['strong', 'em', 'code', 'pre', 'p', 'br', 'ul', 'ol', 'li'];
  
  static sanitize(html) {
    // First escape everything
    const escaped = Bun.escapeHTML(html);
    
    // Then selectively allow safe tags (simplified version)
    return escaped.replace(/&lt;(\/(?(strong|em|code|pre|p|br|ul|ol|li))&gt;/g, '<$1>')
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
  }
}

const mixedContent = `
  <p>Hello <strong>World</strong>!</p>
  <script>alert('bad')</script>
  <em>Italic</em> and <code>code</code>
  <iframe src="evil.com"></iframe>
`;

console.log("\n🧼 HTML Sanitizer Example:");
console.log("Input:", mixedContent);
console.log("\nSanitized:", HTMLSanitizer.sanitize(mixedContent));
```

## 📏 `Bun.stringWidth()` - Terminal Layout & Unicode

```javascript
// String width calculations for terminal layout
const testStrings = [
  "Hello World",          // Regular ASCII
  "你好世界",              // Chinese characters
  "🎉 Party!",            // Emoji
  "👨‍👩‍👧‍👦 Family",        // Emoji ZWJ sequence
  "🇺🇸 USA",              // Flag emoji
  "ā́̇",                   // Combining marks
  "\x1b[31mRed\x1b[0m",   // ANSI escape codes
  "Tab\tCharacter",       // Control characters
  "Soft­hyphen",          // Soft hyphen (U+00AD)
  "Arabic: مرحبا"         // Arabic script
];

console.log("\n📏 String Width Analysis:");
console.log(Bun.inspect.table(
  testStrings.map((str, i) => ({
    "#": i + 1,
    "String": str.replace(/\x1b\[[0-9;]*m/g, '') // Remove colors for display
                 .substring(0, 20),
    "Length (chars)": str.length,
    "Width (cells)": Bun.stringWidth(str),
    "Difference": str.length - Bun.stringWidth(str),
    "Visual": "█".repeat(Bun.stringWidth(str)) + 
              "░".repeat(Math.max(0, 20 - Bun.stringWidth(str)))
  })),
  undefined,
  {
    border: "rounded",
    align: {
      "#": "right",
      "Length (chars)": "right",
      "Width (cells)": "right",
      "Difference": "right"
    }
  }
));

// Terminal table formatter
class TerminalTable {
  static formatTable(data, options = {}) {
    const headers = Object.keys(data[0] || {});
    const columnWidths = {};
    
    // Calculate column widths
    headers.forEach(header => {
      columnWidths[header] = Math.max(
        Bun.stringWidth(header),
        ...data.map(row => Bun.stringWidth(String(row[header] || "")))
      );
    });
    
    // Build table
    const border = options.border || "single";
    const borderChars = {
      single: { h: "─", v: "│", tl: "┌", tr: "┐", bl: "└", br: "┘", m: "┼" },
      double: { h: "═", v: "║", tl: "╔", tr: "╗", bl: "╚", br: "╝", m: "╬" },
      rounded: { h: "─", v: "│", tl: "╭", tr: "╮", bl: "╰", br: "╯", m: "┼" }
    }[border];
    
    // Top border
    let result = borderChars.tl;
    headers.forEach((header, i) => {
      result += borderChars.h.repeat(columnWidths[header] + 2);
      result += i === headers.length - 1 ? borderChars.tr : borderChars.m;
    });
    result += "\n";
    
    // Header row
    result += borderChars.v;
    headers.forEach(header => {
      const width = Bun.stringWidth(header);
      const padding = columnWidths[header] - width;
      result += ` ${header}${" ".repeat(padding)} ${borderChars.v}`;
    });
    result += "\n";
    
    // Separator
    result += borderChars.m;
    headers.forEach((header, i) => {
      result += borderChars.h.repeat(columnWidths[header] + 2);
      result += i === headers.length - 1 ? borderChars.m : borderChars.m;
    });
    result += "\n";
    
    // Data rows
    data.forEach(row => {
      result += borderChars.v;
      headers.forEach(header => {
        const value = String(row[header] || "");
        const width = Bun.stringWidth(value);
        const padding = columnWidths[header] - width;
        result += ` ${value}${" ".repeat(padding)} ${borderChars.v}`;
      });
      result += "\n";
    });
    
    // Bottom border
    result += borderChars.bl;
    headers.forEach((header, i) => {
      result += borderChars.h.repeat(columnWidths[header] + 2);
      result += i === headers.length - 1 ? borderChars.br : borderChars.m;
    });
    
    return result;
  }
}

// Test the table formatter
console.log("\n📊 Terminal Table Formatter:");
const tableData = [
  { Name: "Alice 👩‍💻", Age: "28", City: "New York 🌃", Salary: "$75,000" },
  { Name: "Bob 🧑‍🔧", Age: "35", City: "Los Angeles ☀️", Salary: "$85,000" },
  { Name: "Charlie 🧑‍🚀", Age: "42", City: "Tokyo 🇯🇵", Salary: "$95,000" }
];

console.log(TerminalTable.formatTable(tableData, { border: "rounded" }));

// Progress bar with accurate width
function createProgressBar(current, total, width = 40) {
  const percentage = current / total;
  const filledWidth = Math.floor(width * percentage);
  const emptyWidth = width - filledWidth;
  
  const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
  const percentText = `${Math.round(percentage * 100)}%`;
  
  // Calculate positions considering emoji widths
  const barWidth = Bun.stringWidth(bar);
  const percentWidth = Bun.stringWidth(percentText);
  const totalWidth = barWidth + percentWidth + 3; // +3 for brackets and space
  
  return `[${bar}] ${percentText}`;
}

console.log("\n📈 Progress Bars:");
for (let i = 0; i <= 10; i++) {
  console.log(createProgressBar(i, 10, 30));
}
```

## 🚀 Integrated Example: API Server with All Utilities

```javascript
// server.js - Complete example using all utilities
import { feature } from "bun:bundle";

class APIServer {
  constructor() {
    this.requests = [];
    this.cache = new Map();
  }

  [Bun.inspect.custom]() {
    const now = Date.now();
    const recent = this.requests.filter(r => now - r.timestamp < 30000);
    
    return {
      server: "APIServer",
      stats: {
        totalRequests: this.requests.length,
        recentRequests: recent.length,
        cacheSize: this.cache.size,
        uptime: `${Math.floor(process.uptime())}s` 
      },
      recentRequests: recent.length > 0 ? 
        Bun.inspect.table(
          recent.map(r => ({
            Method: r.method,
            Path: r.path,
            Status: r.status,
            Duration: `${r.duration}ms`,
            IP: r.ip,
            Time: new Date(r.timestamp).toLocaleTimeString()
          })),
          undefined,
          { border: "single", compact: true }
        ) : "No recent requests"
    };
  }

  async handleRequest(req) {
    const start = Date.now();
    const url = new URL(req.url);
    const ip = req.headers.get('x-forwarded-for') || 'localhost';
    
    // Check cache
    const cacheKey = `${req.method}:${url.pathname}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) {
        return cached.response;
      }
    }
    
    // Process request
    let response;
    switch (url.pathname) {
      case '/api/users':
        response = await this.getUsers();
        break;
      case '/api/escape':
        const text = url.searchParams.get('text') || '';
        response = new Response(
          JSON.stringify({
            original: text,
            escaped: Bun.escapeHTML(text),
            width: Bun.stringWidth(text)
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        break;
      case '/api/compare':
        const a = JSON.parse(url.searchParams.get('a') || '{}');
        const b = JSON.parse(url.searchParams.get('b') || '{}');
        response = new Response(
          JSON.stringify({
            a,
            b,
            equal: Bun.deepEquals(a, b)
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        break;
      default:
        response = new Response('Not Found', { status: 404 });
    }
    
    // Cache response
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    // Log request
    this.requests.push({
      method: req.method,
      path: url.pathname,
      status: response.status,
      duration: Date.now() - start,
      ip,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 requests
    if (this.requests.length > 1000) {
      this.requests = this.requests.slice(-1000);
    }
    
    return response;
  }

  async getUsers() {
    const users = [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob", role: "user" },
      { id: 3, name: "Charlie", role: "moderator" }
    ];
    
    return new Response(
      JSON.stringify({
        users,
        generated: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Start server
const server = new APIServer();

Bun.serve({
  port: 3000,
  async fetch(req) {
    const response = await server.handleRequest(req);
    
    // Display server state every 10th request
    if (Math.random() < 0.1) {
      console.log("\n" + "=".repeat(80));
      console.log("🔄 Server State Update:");
      console.log(server); // Uses custom inspection
      console.log("=".repeat(80) + "\n");
    }
    
    return response;
  }
});

console.log(`🚀 Server running at http://localhost:3000`);
console.log(`📊 View server state by inspecting the server object`);
```

## 📦 Quick Reference Table

```javascript
// Summary of all utilities
const summary = [
  {
    Utility: "Bun.inspect.table()",
    Purpose: "Display tabular data in terminal",
    UseCase: "Debugging, monitoring, CLI tools",
    Example: `Bun.inspect.table(data, ['col1', 'col2'], {border: 'rounded'})` 
  },
  {
    Utility: "Bun.inspect.custom",
    Purpose: "Custom object inspection",
    UseCase: "Classes with complex internal state",
    Example: `[Bun.inspect.custom]() { return customFormat; }` 
  },
  {
    Utility: "Bun.deepEquals()",
    Purpose: "Deep object comparison",
    UseCase: "Testing, state comparison, caching",
    Example: `Bun.deepEquals(obj1, obj2)` 
  },
  {
    Utility: "Bun.escapeHTML()",
    Purpose: "HTML escaping for security",
    UseCase: "Web servers, template rendering",
    Example: `Bun.escapeHTML(userInput)` 
  },
  {
    Utility: "Bun.stringWidth()",
    Purpose: "Calculate terminal display width",
    UseCase: "CLI layouts, progress bars, tables",
    Example: `Bun.stringWidth("🎉 Hello!") // Returns 8` 
  }
];

console.log("\n📚 Bun Utilities Quick Reference:");
console.log(Bun.inspect.table(summary, undefined, {
  border: "double",
  compact: false,
  align: {
    Example: "left"
  }
}));
```

## 🎯 Performance Benchmarks

```javascript
// Benchmark all utilities
function benchmark() {
  const iterations = 10000;
  const largeObject = Array.from({ length: 1000 }, (_, i) => ({ 
    id: i, 
    data: `item-${i}-${"🎉".repeat(i % 5)}`,
    nested: { value: Math.random(), list: Array.from({ length: 10 }, (_, j) => j) }
  }));

  console.log("\n⚡ Performance Benchmarks (10k iterations):");
  
  // Bun.deepEquals benchmark
  const copy = JSON.parse(JSON.stringify(largeObject));
  console.time("Bun.deepEquals");
  for (let i = 0; i < 10; i++) { // Reduced due to size
    Bun.deepEquals(largeObject, copy);
  }
  console.timeEnd("Bun.deepEquals");

  // Bun.escapeHTML benchmark
  const htmlString = "<script>alert('test')</script>".repeat(100);
  console.time("Bun.escapeHTML");
  for (let i = 0; i < iterations; i++) {
    Bun.escapeHTML(htmlString);
  }
  console.timeEnd("Bun.escapeHTML");

  // Bun.stringWidth benchmark
  const testString = "Hello 🌍 World! 👨‍👩‍👧‍👦".repeat(50);
  console.time("Bun.stringWidth");
  for (let i = 0; i < iterations; i++) {
    Bun.stringWidth(testString);
  }
  console.timeEnd("Bun.stringWidth");

  // Bun.inspect.table benchmark
  const smallData = largeObject.slice(0, 10);
  console.time("Bun.inspect.table");
  for (let i = 0; i < iterations / 10; i++) {
    Bun.inspect.table(smallData);
  }
  console.timeEnd("Bun.inspect.table");
}

// Run benchmarks
benchmark();
```

This comprehensive guide shows you how to use all five Bun utilities effectively, with practical examples, performance considerations, and real-world applications. Each utility serves a specific purpose in building robust, secure, and user-friendly applications with Bun.

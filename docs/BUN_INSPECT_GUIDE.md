# Bun.inspect() - Complete Visual Guide

**Reference:** https://bun.sh/docs/runtime/utils#bun-inspect-table-tabulardata%2C-properties%2C-options

`Bun.inspect()` is a powerful debugging utility that formats data for console output. Its `{ columns: true }` option automatically converts arrays of objects into beautiful tables.

---

## 📋 Function Signature

```typescript
Bun.inspect(value: any, options?: {
  columns?: boolean;           // Enable table format for arrays
  sort?: (a: any, b: any) => number;  // Custom sort function
  depth?: number | null;       // Nesting depth (null = unlimited)
  colors?: boolean;            // Enable ANSI colors (default: true in terminal)
  maxArrayLength?: number;     // Max array items to show (default: 100)
  maxStringLength?: number;    // Max string length before truncation
  keys?: (string | number)[];  // Specify which keys/properties to show
}): string
```

---

## 🎨 Options Breakdown with Visual Examples

### 1. **columns: true** (The Magic)

When you pass an array of objects with consistent keys, `columns: true` automatically formats as a table with aligned columns.

**Input:**
```typescript
const projects = [
  { name: "my-bun-app", path: "/Users/ashley/PROJECTS/my-bun-app", status: "active" },
  { name: "native-addon-tool", path: "/Users/ashley/PROJECTS/native-addon-tool", status: "building" },
  { name: "cli-dashboard", path: "/Users/ashley/PROJECTS/cli-dashboard", status: "active" }
];

console.log(Bun.inspect(projects, { columns: true }));
```

**Visual Output:**
```
┌─────────────────┬──────────────────────────────────────────────┬─────────┐
│ name            │ path                                         │ status  │
├─────────────────┼──────────────────────────────────────────────┼─────────┤
│ my-bun-app      │ /Users/ashley/PROJECTS/my-bun-app           │ active  │
│ native-addon-   │ /Users/ashley/PROJECTS/native-addon-tool    │ building│
│ tool            │                                              │         │
│ cli-dashboard   │ /Users/ashley/PROJECTS/cli-dashboard        │ active  │
└─────────────────┴──────────────────────────────────────────────┴─────────┘
```

**Notice:**
- Column widths auto-adjust to content
- Header row with property names
- Separator lines (─, │)
- Alignment is automatic

---

### 2. **sort: (a, b) => number**

Custom sort function to order rows before display.

**Input:**
```typescript
const metrics = [
  { name: "CPU", usage: 45.2 },
  { name: "Memory", usage: 78.9 },
  { name: "Disk", usage: 23.1 }
];

console.log(Bun.inspect(metrics, {
  columns: true,
  sort: (a, b) => a.usage - b.usage  // Ascending
}));
```

**Visual Output:**
```
┌─────────┬────────┐
│ name    │ usage  │
├─────────┼────────┤
│ Disk    │ 23.1   │
│ CPU     │ 45.2   │
│ Memory  │ 78.9   │
└─────────┴────────┘
```

**Without sort** (original order):
```
┌─────────┬────────┐
│ name    │ usage  │
├─────────┼────────┤
│ CPU     │ 45.2   │
│ Memory  │ 78.9   │
│ Disk    │ 23.1   │
└─────────┴────────┘
```

---

### 3. **depth: number | null**

Controls how deep nested objects are displayed.

**Input:**
```typescript
const project = {
  name: "my-bun-app",
  config: {
    port: 3000,
    db: { host: "localhost", port: 5432 }
  }
};

console.log(Bun.inspect(project, { depth: 1 }));
```

**Visual Output (depth: 1):**
```
┌─────────────┬────────────────────────────────────────────┐
│ name        │ my-bun-app                                 │
│ config      │ [Object]                                   │
└─────────────┴────────────────────────────────────────────┘
```

**With depth: 2:**
```
┌─────────────┬────────────────────────────────────────────┐
│ name        │ my-bun-app                                 │
│ config      │ {                                          │
│             │   port: 3000,                              │
│             │   db: [Object]                             │
│             │ }                                          │
└─────────────┴────────────────────────────────────────────┘
```

**With depth: null (unlimited):**
```
┌─────────────┬────────────────────────────────────────────────────────────┐
│ name        │ my-bun-app                                                 │
│ config      │ {                                                          │
│             │   port: 3000,                                              │
│             │   db: {                                                    │
│             │     host: "localhost",                                     │
│             │     port: 5432                                             │
│             │   }                                                        │
│             │ }                                                          │
└─────────────┴────────────────────────────────────────────────────────────┘
```

---

### 4. **colors: boolean**

Enables/disables ANSI color codes. Default is `true` in terminals.

**With colors: true** (default):
```
┌─────────────────┬──────────────────────────────────────────────┬─────────┐
│ name            │ path                                         │ status  │
├─────────────────┼──────────────────────────────────────────────┼─────────┤
│ my-bun-app      │ /Users/ashley/PROJECTS/my-bun-app           │ active  │
└─────────────────┴──────────────────────────────────────────────┴─────────┘
```
(Headers appear in bold/color in actual terminal)

**With colors: false:**
```
┌─────────────────┬──────────────────────────────────────────────┬─────────┐
│ name            │ path                                         │ status  │
├─────────────────┼──────────────────────────────────────────────┼─────────┤
│ my-bun-app      │ /Users/ashley/PROJECTS/my-bun-app           │ active  │
└─────────────────┴──────────────────────────────────────────────┴─────────┘
```
(Plain ASCII, no ANSI escape codes)

---

### 5. **maxArrayLength: number**

Limits how many array items are displayed before truncation.

**Input:**
```typescript
const manyProjects = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  name: `project-${i}`
}));

console.log(Bun.inspect(manyProjects, {
  columns: true,
  maxArrayLength: 5
}));
```

**Visual Output:**
```
┌────┬─────────────┐
│ id │ name        │
├────┼─────────────┤
│ 0  │ project-0   │
│ 1  │ project-1   │
│ 2  │ project-2   │
│ 3  │ project-3   │
│ 4  │ project-4   │
└────┴─────────────┘
... and 10 more items (use maxArrayLength to show more)
```

---

### 6. **maxStringLength: number**

Truncates long strings with `...`.

**Input:**
```typescript
const longDescriptions = [
  { desc: "This is a very long description that should be truncated because it exceeds the limit" },
  { desc: "Short one" }
];

console.log(Bun.inspect(longDescriptions, {
  columns: true,
  maxStringLength: 30
}));
```

**Visual Output:**
```
┌────────────────────────────────────────────────────────────┬──────────────┐
│ desc                                                        │              │
├────────────────────────────────────────────────────────────┼──────────────┤
│ This is a very long description that sh...                │              │
│ Short one                                                  │              │
└────────────────────────────────────────────────────────────┴──────────────┘
```

---

### 7. **keys: (string | number)[]**

Select specific properties to display, in custom order.

**Input:**
```typescript
const projects = [
  { name: "app1", path: "/path1", version: "1.0.0", author: "Alice", active: true },
  { name: "app2", path: "/path2", version: "2.0.0", author: "Bob", active: false }
];

console.log(Bun.inspect(projects, {
  columns: true,
  keys: ["name", "active", "author"]  // Only show these, in this order
}));
```

**Visual Output:**
```
┌─────────┬─────────┬─────────┐
│ name    │ active  │ author  │
├─────────┼─────────┼─────────┤
│ app1    │ true    │ Alice   │
│ app2    │ false   │ Bob     │
└─────────┴─────────┴─────────┘
```

Notice `path` and `version` are omitted.

---

## 🎯 Combined Examples

### Example 1: Sorted Dashboard Metrics

```typescript
const metrics = [
  { metric: "CPU", percent: 45.2, status: "ok" },
  { metric: "Memory", percent: 78.9, status: "warning" },
  { metric: "Disk", percent: 23.1, status: "ok" },
  { metric: "Network", percent: 12.5, status: "ok" }
];

console.log(Bun.inspect(metrics, {
  columns: true,
  sort: (a, b) => b.percent - a.percent,  // Descending by percent
  keys: ["metric", "percent", "status"]
}));
```

**Output:**
```
┌─────────┬────────┬──────────┐
│ metric  │ percent│ status   │
├─────────┼────────┼──────────┤
│ Memory  │ 78.9   │ warning  │
│ CPU     │ 45.2   │ ok       │
│ Disk    │ 23.1   │ ok       │
│ Network │ 12.5   │ ok       │
└─────────┴────────┴──────────┘
```

---

### Example 2: Nested Objects with Controlled Depth

```typescript
const projectTree = {
  platform: "bun",
  projects: [
    {
      name: "my-bun-app",
      config: { port: 3000, env: { NODE_ENV: "development" } },
      dependencies: ["react", "lodash"]
    },
    {
      name: "worker",
      config: { port: 8788, env: { NODE_ENV: "production" } },
      dependencies: ["miniflare"]
    }
  ]
};

console.log(Bun.inspect(projectTree, {
  depth: 2,
  maxArrayLength: 10
}));
```

**Output (depth: 2):**
```
┌──────────┬────────────────────────────────────────────────────┐
│ platform │ bun                                               │
│ projects │ [                                                 │
│          │   {                                               │
│          │     name: "my-bun-app",                           │
│          │     config: {                                     │
│          │       port: 3000,                                 │
│          │       env: [Object]                               │
│          │     },                                            │
│          │     dependencies: [Array]                         │
│          │   },                                              │
│          │   {                                               │
│          │     name: "worker",                               │
│          │     config: {                                     │
│          │       port: 8788,                                 │
│          │       env: [Object]                               │
│          │     },                                            │
│          │     dependencies: [Array]                         │
│          │   }                                               │
│          │ ]                                                 │
└──────────┴────────────────────────────────────────────────────┘
```

---

### Example 3: Project Matrix with All Options

```typescript
console.log(Bun.inspect(projects, {
  columns: true,
  sort: (a, b) => a.name.localeCompare(b.name),
  keys: ["name", "path", "status"],
  maxStringLength: 50
}));
```

---

## 📊 Table Format Reference

The table format uses these Unicode box-drawing characters:

```
┌─ header start
├─ separator (| for vertical)
│─ column separator
─ horizontal line
└─ bottom corner
╞═ alternative separator
╪─ cross junction
╡─ bottom T
```

**Column alignment:**
- Left-aligned by default (strings)
- Right-aligned for numbers
- Centered for headers

---

## 💡 Best Practices for Your Project Matrix

### 1. **Project Listings**
```typescript
console.log(Bun.inspect(projects, {
  columns: true,
  sort: (a, b) => a.name.localeCompare(b.name)
}));
```

### 2. **Process Monitoring**
```typescript
const processes = getProcessList();
console.log(Bun.inspect(processes, {
  columns: true,
  sort: (a, b) => b.cpu - a.cpu,  // Highest CPU first
  maxArrayLength: 20
}));
```

### 3. **Configuration Dumps**
```typescript
console.log(Bun.inspect(config, {
  depth: 3,
  maxStringLength: 80
}));
```

### 4. **Simple Debugging**
```typescript
// Just pass the data - Bun.inspect is smart
console.log(Bun.inspect(someArray));  // May auto-table if array of objects
console.log(Bun.inspect(someObject)); // Shows properties
```

---

## 🚀 Quick Reference Card

```typescript
// Basic table
Bun.inspect(arrayOfObjects, { columns: true })

// Sorted table
Bun.inspect(array, { columns: true, sort: (a,b) => a.key - b.key })

// Limited depth
Bun.inspect(object, { depth: 2 })

// Select columns
Bun.inspect(array, { columns: true, keys: ["col1", "col2"] })

// Limit array size
Bun.inspect(array, { maxArrayLength: 10 })

// No colors (for logs/files)
Bun.inspect(data, { colors: false })

// Unlimited depth
Bun.inspect(object, { depth: null })

// Combine them!
Bun.inspect(projects, {
  columns: true,
  sort: (a,b) => a.name.localeCompare(b.name),
  keys: ["name", "status"],
  maxStringLength: 30,
  maxArrayLength: 50
})
```

---

## 🔧 When to Use Bun.inspect vs JSON.stringify

| Use Case | Choose |
|----------|--------|
| Human-readable console output | `Bun.inspect(data)` |
| Terminal tables for lists | `Bun.inspect(array, { columns: true })` |
| Programmatic storage | `JSON.stringify(data, null, 2)` |
| Full depth guaranteed | `JSON.stringify(data)` |
| Quick debugging | `console.log(Bun.inspect(obj))` |

---

## 📝 Example from Your Project Matrix

```typescript
// In overseer-cli.ts or cli-resolver.ts
const projects = fs.readdirSync(Bun.cwd)
  .filter(dir => fs.existsSync(`${Bun.cwd}/${dir}/package.json`))
  .map(name => ({
    name,
    path: `${Bun.cwd}/${name}`,
    entry: getEntryPoint(name)  // Your function
  }));

console.log("🚀 Available Projects:\n");
console.log(Bun.inspect(projects, {
  columns: true,
  sort: (a, b) => a.name.localeCompare(b.name),
  keys: ["name", "path", "entry"]
}));
```

**Output:**
```
┌──────────────┬────────────────────────────────────────────┬──────────────────────┐
│ name         │ path                                       │ entry                │
├──────────────┼────────────────────────────────────────────┼──────────────────────┤
│ cli-dashboard│ /Users/ashley/PROJECTS/cli-dashboard      │ dashboard.ts         │
│ edge-worker  │ /Users/ashley/PROJECTS/edge-worker        │ worker.ts            │
│ my-bun-app   │ /Users/ashley/PROJECTS/my-bun-app         │ index.ts             │
│ native-addon │ /Users/ashley/PROJECTS/native-addon-tool  │ build.ts             │
│ tool         │                                            │                      │
└──────────────┴────────────────────────────────────────────┴──────────────────────┘
```

---

**Remember:** `Bun.inspect()` is designed for **human consumption in terminals**. The `{ columns: true }` option is perfect for displaying project matrices, metrics, process lists, and any array of objects with consistent structure.

For more details, see: https://bun.sh/docs/runtime/utils#bun-inspect-table-tabulardata%2C-properties%2C-options
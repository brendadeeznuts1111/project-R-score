# 🚀 Bun APIs Quick Reference Card

## 📁 **File I/O**
```typescript
// Lazy file handle (zero-copy)
const file = Bun.file("./config.json");
console.log(file.size);           // Size without reading
const content = await file.text(); // Actual read here

// Fast write (sendfile optimized)
await Bun.write("output.txt", "Hello World");
await Bun.write("data.bin", new Blob([binaryData]));

// Streaming write
const writer = Bun.file("log.txt").writer();
await writer.write("Log entry\n");
await writer.end();
```

## 📝 **String & ANSI**
```typescript
// Terminal-aware width (emoji/ANSI safe)
const width = Bun.stringWidth("Text 🚀 with emoji"); // 18

// ANSI manipulation
const clean = Bun.stripANSI("\x1b[32mgreen\x1b[0m"); // "green"
const wrapped = Bun.wrapAnsi(longText, 40); // Preserve colors

// Fast padding
const padded = text.padEnd(Bun.stringWidth(text) + 5);
```

## 🎨 **Color**
```typescript
// HSL dynamic coloring
const green = Bun.color("hsl(120, 100%, 50%)", "ansi");
console.log(`${green}Success\x1b[0m`);

// RGB/HEX support
const red = Bun.color("rgb(255, 0, 0)", "ansi");
const blue = Bun.color("#0000ff", "ansi");

// Profile-aware themes
const profileColors = {
  production: 120,  // Green
  staging: 45,      // Orange  
  development: 210  // Blue
};
```

## 📊 **Inspection**
```typescript
// Beautiful ASCII tables
const data = [{ name: "API", status: "running" }];
console.log(Bun.inspect.table(data, ["name", "status"], { colors: true }));

// Deep equality (regression testing)
const unchanged = Bun.deepEquals(baseline, current);

// Safe HTML
const safe = Bun.escapeHTML(userInput);
```

## 🔧 **Editor Integration**
```typescript
// Open file at specific line
Bun.openInEditor(import.meta.url, { line: 123 });

// Dynamic error location
const errorLine = new Error().stack?.match(/:(\d+):/)?.[1];
Bun.openInEditor(__filename, { line: parseInt(errorLine) });
```

## ⏱️ **Timing**
```typescript
// High-resolution profiling
const start = Bun.nanoseconds();
// ... operation ...
const elapsedMs = (Bun.nanoseconds() - start) / 1e6;
const elapsedμs = (Bun.nanoseconds() - start) / 1e3;
```

## 📂 **File System**
```typescript
// Pattern-based scanning
const glob = new Bun.Glob("**/*.ts");
for await (const file of glob.scan(".")) {
  console.log(`Found: ${file}`);
}

// Count files quickly
let count = 0;
for await (const _ of new Bun.Glob("*.json").scan(".")) {
  count++;
}
```

## 📄 **Parsing**
```typescript
// TOML configuration
const config = Bun.TOML.parse(tomlContent);
console.log(config.server.port); // 3000

// JSON with file handle
const pkg = await Bun.file("./package.json").json();
```

## 🔗 **Common Patterns**

### **Project Status Report**
```typescript
async function projectReport() {
  const pkg = await Bun.file("./package.json").json();
  const glob = new Bun.Glob("**/*.ts");
  let tsCount = 0;
  for await (const _ of glob.scan(".")) tsCount++;
  
  const data = [
    { metric: "Project", value: pkg.name, status: "info" },
    { metric: "TS Files", value: tsCount.toString(), status: tsCount > 100 ? "warning" : "success" }
  ];
  
  console.log(Bun.inspect.table(data, ["metric", "value", "status"], { colors: true }));
  await Bun.write("report.md", `# Report\n${data.map(r => `- ${r.metric}: ${r.value}`).join('\n')}`);
}
```

### **Colored Logging**
```typescript
function logStatus(level: "info" | "warn" | "error", message: string) {
  const colors = { info: 210, warn: 45, error: 0 };
  const ansi = Bun.color(`hsl(${colors[level]}, 100%, 50%)`, "ansi");
  console.log(`${ansi}${level.toUpperCase()}\x1b[0m: ${message}`);
}
```

### **Safe Config Loading**
```typescript
async function loadConfig(path: string) {
  try {
    const file = Bun.file(path);
    if (!await file.exists()) return null;
    return await file.json();
  } catch {
    return null;
  }
}
```

### **Performance Profiling**
```typescript
async function profileOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const start = Bun.nanoseconds();
  const result = await operation();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(`${name}: ${elapsed.toFixed(2)}ms`);
  return result;
}
```

## ⚡ **Performance Tips**

- **Use `Bun.file()`** for lazy loading - reads only when needed
- **Prefer `Bun.stringWidth()`** over `String.length` for terminal output
- **Use `Bun.Glob`** for async file scanning - much faster than recursive fs.readdir
- **Leverage `Bun.nanoseconds()`** for precise profiling
- **Use `Bun.inspect.table()`** for formatted output - handles colors automatically
- **Combine `Bun.color()` with HSL** for dynamic theming

## 🎯 **Real-World Examples**

### **Service Status Dashboard**
```typescript
const services = await Promise.all([
  checkService("api"),
  checkService("db"), 
  checkService("cache")
]);

const table = services.map(s => ({
  service: s.name,
  status: s.ok ? "✅ running" : "❌ down",
  response: `${s.latency}ms`
}));

console.log(Bun.inspect.table(table, ["service", "status", "response"], { colors: true }));
```

### **Multi-Project Scanner**
```typescript
async function scanProjects() {
  const results = [];
  for await (const path of new Bun.Glob("projects/*/package.json").scan(".")) {
    const pkg = await Bun.file(path).json();
    results.push({ project: pkg.name, path });
  }
  return results;
}
```

---

**🚀 All Bun APIs are highly optimized and production-ready!**

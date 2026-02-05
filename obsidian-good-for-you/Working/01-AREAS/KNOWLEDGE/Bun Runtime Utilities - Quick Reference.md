# 🚀 **Bun Runtime Utilities - Complete Reference**

> [!INFO] **Technical Reference**: Fast lookup for Bun JavaScript Runtime utilities and APIs
> 
> [!TIP] **Performance Note**: Bun is 3x faster than Node.js on average for most operations

---

## 📊 **Data Display & Inspection**

### **🔍 Bun.inspect.table()** - Advanced Table Display

Display tabular data with professional formatting and customization options.

#### **Basic Usage**
```javascript
const data = [
  { name: "Alice", age: 30, ageDays: 10950, ageMonths: 360, role: "Developer", salary: 95000, height: 175, weight: 68, sex: "F", milesFromWork: 12.5, kmFromWork: 20.1, feetFromWork: 66000, transport: "car", colorHSL: "hsl(200, 70%, 60%)", colorHEX: "#3399CC" },
  { name: "Bob", age: 25, ageDays: 9125, ageMonths: 300, role: "Designer", salary: 78000, height: 182, weight: 75, sex: "M", milesFromWork: 8.2, kmFromWork: 13.2, feetFromWork: 43296, transport: "bike", colorHSL: "hsl(120, 65%, 55%)", colorHEX: "#2D8F2D" },
  { name: "Charlie", age: 35, ageDays: 12775, ageMonths: 420, role: "Manager", salary: 120000, height: 178, weight: 82, sex: "M", milesFromWork: 25.8, kmFromWork: 41.5, feetFromWork: 136224, transport: "car", colorHSL: "hsl(30, 80%, 65%)", colorHEX: "#E6A833" },
  { name: "Diana", age: 28, ageDays: 10220, ageMonths: 336, role: "Engineer", salary: 88000, height: 165, weight: 58, sex: "F", milesFromWork: 5.1, kmFromWork: 8.2, feetFromWork: 26928, transport: "bike", colorHSL: "hsl(280, 60%, 65%)", colorHEX: "#B366CC" },
  { name: "Eve", age: 32, ageDays: 11680, ageMonths: 384, role: "Analyst", salary: 92000, height: 170, weight: 63, sex: "F", milesFromWork: 15.3, kmFromWork: 24.6, feetFromWork: 80784, transport: "car", colorHSL: "hsl(0, 70%, 60%)", colorHEX: "#CC3333" }
];

Bun.inspect.table(data);
```

**Output:**
```
┌───┬─────────┬─────┬─────────┬───────────┬────────┬────────┬────────┬──────┬─────────┬────────┬────────┬────────┬─────────┬────────┐
│ # │  name   │ age │  days   │ months  │   role    │ salary │ height │ weight │ sex  │ miles   │   km   │transport│  feet  │   HSL   │  HEX   │
├───┼─────────┼─────┼─────────┼───────────┼────────┼────────┼────────┼──────┼─────────┼────────┼────────┼────────┼─────────┼────────┤
│ 0 │  Alice  │  30 │ 10,950  │   360   │ Developer │  95000 │    175 │     68 │   F  │   12.5  │   20.1 │   car   │ 66,000 │hsl(200, │ #3399CC│
│   │         │     │         │         │           │        │        │        │      │         │         │         │        │70%,60%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼────────┼────────┼──────┼─────────┼────────┼────────┼────────┼─────────┼────────┤
│ 1 │   Bob   │  25 │  9,125  │   300   │  Designer │  78000 │    182 │     75 │   M  │    8.2  │   13.2 │   bike  │ 43,296 │hsl(120, │ #2D8F2D│
│   │         │     │         │         │           │        │        │        │      │         │         │         │        │65%,55%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼────────┼────────┼──────┼─────────┼────────┼────────┼────────┼─────────┼────────┤
│ 2 │ Charlie │  35 │ 12,775  │   420   │  Manager  │ 120000 │    178 │     82 │   M  │   25.8  │   41.5 │   car   │136,224 │hsl(30,  │ #E6A833│
│   │         │     │         │         │           │        │        │        │      │         │         │         │        │80%,65%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼────────┼────────┼──────┼─────────┼────────┼────────┼────────┼─────────┼────────┤
│ 3 │  Diana  │  28 │ 10,220  │   336   │  Engineer │  88000 │    165 │     58 │   F  │    5.1  │    8.2 │   bike  │ 26,928 │hsl(280, │ #B366CC│
│   │         │     │         │         │           │        │        │        │      │         │         │         │        │60%,65%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼────────┼────────┼──────┼─────────┼────────┼────────┼────────┼─────────┼────────┤
│ 4 │   Eve   │  32 │ 11,680  │   384   │   Analyst │  92000 │    170 │     63 │   F  │   15.3  │   24.6 │   car   │ 80,784 │hsl(0,   │ #CC3333│
│   │         │     │         │         │           │        │        │        │      │         │         │         │        │70%,60%) │        │
└───┴─────────┴─────┴─────────┴───────────┼────────┼────────┼────────┼──────┼─────────┼────────┼────────┼────────┼─────────┼────────┘
```

#### **Salary Analysis & Calculations**
```javascript
// Add calculated salary metrics
const enhancedData = data.map(person => {
  const avgSalary = data.reduce((sum, p) => sum + p.salary, 0) / data.length;
  const salaryDiff = person.salary - avgSalary;
  const salaryGrade = person.salary >= 100000 ? 'A' : person.salary >= 85000 ? 'B' : 'C';
  const monthlySalary = person.salary / 12;
  const hourlyRate = person.salary / 2080; // 40 hours/week, 52 weeks/year
  const minuteRate = hourlyRate / 60; // Per minute rate
  
  return {
    ...person,
    salaryFormatted: `$${person.salary.toLocaleString()}`,
    monthlyFormatted: `$${monthlySalary.toFixed(0)}`,
    hourlyFormatted: `$${hourlyRate.toFixed(2)}`,
    minuteFormatted: `$${minuteRate.toFixed(3)}`,
    salaryDiff: salaryDiff > 0 ? `+$${Math.abs(salaryDiff).toLocaleString()}` : `-$${Math.abs(salaryDiff).toLocaleString()}`,
    salaryGrade,
    aboveAvg: person.salary > avgSalary ? '✅' : '❌'
  };
});

Bun.inspect.table(enhancedData);
```

**Enhanced Output:**
```text
┌───┬─────────┬─────┬─────────┬───────────┬────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬─────────┬────────┬────────┬─────────┬────────┐
│ # │  name   │ age │ days    │ months  │   role    │ salary │salaryFmt │ monthly  │  hourly  │ per minute│ salaryDiff│ grade │above │ miles  │   km   │transport│  feet  │   HSL   │  HEX   │
├───┼─────────┼─────┼─────────┼───────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼────────┼────────┼─────────┼────────┼─────────┼────────┤
│ 0 │  Alice  │  30 │ 10,950  │   360   │ Developer │  95000 │ $95,000  │ $7,917   │ $45.67   │  $0.761   │ +$2,600 │  B    │  ✅   │  12.5  │  20.1  │   car   │ 66,000 │hsl(200, │ #3399CC│
│   │         │     │         │         │           │        │          │          │          │           │          │       │       │        │        │         │        │70%,60%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼────────┼────────┼─────────┼────────┼─────────┼────────┤
│ 1 │   Bob   │  25 │  9,125  │   300   │  Designer │  78000 │ $78,000  │ $6,500   │ $37.50   │  $0.625   │ -$14,400│  C    │  ❌   │   8.2  │  13.2  │   bike  │ 43,296 │hsl(120, │ #2D8F2D│
│   │         │     │         │         │           │        │          │          │          │           │          │       │       │        │        │         │        │65%,55%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼────────┼────────┼─────────┼────────┼─────────┼────────┤
│ 2 │ Charlie │  35 │ 12,775  │   420   │  Manager  │ 120000 │ $120,000 │ $10,000  │ $57.69   │  $0.962   │ +$27,600│  A    │  ✅   │  25.8  │  41.5  │   car   │136,224 │hsl(30,  │ #E6A833│
│   │         │     │         │         │           │        │          │          │          │           │          │       │       │        │        │         │        │80%,65%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼────────┼────────┼─────────┼────────┼─────────┼────────┤
│ 3 │  Diana  │  28 │ 10,220  │   336   │  Engineer │  88000 │ $88,000  │ $7,333   │ $42.31   │  $0.705   │ -$4,400 │  B    │  ❌   │   5.1  │   8.2  │   bike  │ 26,928 │hsl(280, │ #B366CC│
│   │         │     │         │         │           │        │          │          │          │           │          │       │       │        │        │         │        │60%,65%) │        │
├───┼─────────┼─────┼─────────┼───────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼────────┼────────┼─────────┼────────┼─────────┼────────┤
│ 4 │   Eve   │  32 │ 11,680  │   384   │   Analyst │  92000 │ $92,000  │ $7,667   │ $44.23   │  $0.737   │ -$400   │  B    │  ❌   │  15.3  │  24.6  │   car   │ 80,784 │hsl(0,   │ #CC3333│
│   │         │     │         │         │           │        │          │          │          │           │          │       │       │        │        │         │        │70%,60%) │        │
└───┴─────────┴─────┴─────────┴───────────┼────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼────────┼────────┼─────────┼────────┼─────────┼────────┘
```

#### **Salary Statistics Summary**
```javascript
// Calculate salary statistics
const salaries = data.map(p => p.salary);
const stats = {
  count: salaries.length,
  total: salaries.reduce((sum, sal) => sum + sal, 0),
  average: salaries.reduce((sum, sal) => sum + sal, 0) / salaries.length,
  min: Math.min(...salaries),
  max: Math.max(...salaries),
  median: salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)],
  range: Math.max(...salaries) - Math.min(...salaries)
};

const summaryData = [
  { metric: 'Total Payroll', value: `$${stats.total.toLocaleString()}` },
  { metric: 'Average Salary', value: `$${Math.round(stats.average).toLocaleString()}` },
  { metric: 'Highest Salary', value: `$${stats.max.toLocaleString()}` },
  { metric: 'Lowest Salary', value: `$${stats.min.toLocaleString()}` },
  { metric: 'Median Salary', value: `$${stats.median.toLocaleString()}` },
  { metric: 'Salary Range', value: `$${stats.range.toLocaleString()}` }
];

console.log('\n📊 Salary Statistics Summary:');
Bun.inspect.table(summaryData);
```

**Statistics Output:**
```
📊 Salary Statistics Summary:
┌───┬─────────────────┬─────────────────┐
│ # │     metric      │      value       │
├───┼─────────────────┼─────────────────┤
│ 0 │  Total Payroll  │    $473,000     │
│ 1 │ Average Salary  │     $94,600     │
│ 2 │ Highest Salary  │    $120,000     │
│ 3 │  Lowest Salary  │     $78,000     │
│ 4 │ Median Salary   │     $92,000     │
│ 5 │  Salary Range   │     $42,000     │
└───┴─────────────────┴─────────────────┘
```

#### **Advanced Options & Customization**
```javascript
// Select specific columns
Bun.inspect.table(data, ["name", "salary"]);

// Custom table options
Bun.inspect.table(data, {
  maxRows: 10,
  maxColumnWidth: 15,
  showHeader: true,
  showIndex: true,
  sort: (a, b) => a.salary - b.salary  // Sort by salary
});

// Transform data before display
const transformedData = data.map(person => ({
  ...person,
  salary: `$${person.salary.toLocaleString()}`
}));
Bun.inspect.table(transformedData);
```

#### **Real-World Example - Project Metrics**
```javascript
const projectMetrics = [
  { project: "E-commerce", tasks: 45, completed: 38, velocity: 8.5 },
  { project: "Mobile App", tasks: 32, completed: 24, velocity: 6.2 },
  { project: "API Redesign", tasks: 28, completed: 28, velocity: 9.1 }
];

// Add calculated properties
const enhancedMetrics = projectMetrics.map(p => ({
  ...p,
  completion: ((p.completed / p.tasks) * 100).toFixed(1) + '%',
  efficiency: (p.velocity / p.tasks * 10).toFixed(2)
}));

Bun.inspect.table(enhancedMetrics);
```

---

## 📁 **File System Operations**

### **📖 File Reading - High Performance**

#### **Multiple Reading Methods**
```javascript
// Method 1: Read as text (fastest for text files)
const content = await Bun.file("config.json").text();

// Method 2: Read as buffer (binary data)
const buffer = await Bun.file("image.png").arrayBuffer();

// Method 3: Parse JSON directly
const config = await Bun.file("config.json").json();

// Method 4: Stream large files
const stream = Bun.file("large-dataset.csv").stream();
for await (const chunk of stream) {
  console.log(chunk);
}
```

#### **Advanced File Operations**
```javascript
// File metadata
const file = Bun.file("document.pdf");
console.log({
  size: file.size,
  type: file.type,
  lastModified: new Date(file.lastModified),
  exists: file.size > 0
});

// Batch file operations
const files = ["file1.txt", "file2.txt", "file3.txt"];
const contents = await Promise.all(
  files.map(file => Bun.file(file).text())
);

// Conditional file reading
const readIfExists = async (filename) => {
  const file = Bun.file(filename);
  return file.size > 0 ? await file.text() : null;
};
```

### **✍️ File Writing - Optimized**

#### **Writing Different Data Types**
```javascript
// Write text content
await Bun.write("output.txt", "Hello, Bun!");

// Write JSON with formatting
await Bun.write("data.json", JSON.stringify(data, null, 2));

// Write binary data
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
await Bun.write("binary.bin", binaryData);

// Append to file
await Bun.write("log.txt", "New log entry\n", { createNew: false });
```

#### **Advanced Writing Patterns**
```javascript
// Atomic write (write to temp, then rename)
const writeAtomic = async (filename, content) => {
  const tempFile = `${filename}.tmp`;
  await Bun.write(tempFile, content);
  await Bun.rename(tempFile, filename);
};

// Backup before writing
const writeWithBackup = async (filename, content) => {
  const backup = `${filename}.backup.${Date.now()}`;
  if (Bun.file(filename).size > 0) {
    await Bun.copyFile(filename, backup);
  }
  await Bun.write(filename, content);
};
```

---

## 🌐 **HTTP Server & Client**

### **🚀 High-Performance HTTP Server**

#### **Basic Server Setup**
```javascript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/api") {
      return Response.json({ 
        message: "API endpoint", 
        timestamp: Date.now(),
        method: req.method 
      });
    }
    
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }
    
    return new Response("Not found", { status: 404 });
  }
});

console.log(`Server running on http://localhost:${server.port}`);
```

#### **Advanced Server Features**
```javascript
const server = Bun.serve({
  port: 3000,
  
  // CORS configuration
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE"
  },
  
  // WebSocket support
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    },
    open(ws) {
      ws.subscribe("chat");
    },
    close(ws) {
      ws.unsubscribe("chat");
    }
  },
  
  fetch(req, server) {
    const url = new URL(req.url);
    
    // Upgrade to WebSocket
    if (url.pathname === "/ws") {
      return server.upgrade(req);
    }
    
    // Static file serving
    if (url.pathname === "/") {
      return new Response(Bun.file("index.html"));
    }
    
    // API routing
    if (url.pathname.startsWith("/api/")) {
      return handleAPI(req, url);
    }
    
    return new Response("Not found", { status: 404 });
  }
});

// API handler
async function handleAPI(req, url) {
  const path = url.pathname.replace("/api/", "");
  
  switch (path) {
    case "users":
      return Response.json([{ id: 1, name: "Alice" }]);
    case "stats":
      return Response.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: Bun.version
      });
    default:
      return new Response("API endpoint not found", { status: 404 });
  }
}
```

### **📡 HTTP Client - Fast Requests**

#### **Advanced HTTP Operations**
```javascript
// GET request with headers
const response = await fetch("https://api.github.com/users/bun-sh", {
  headers: {
    "User-Agent": "Bun-App/1.0",
    "Accept": "application/vnd.github.v3+json"
  }
});
const userData = await response.json();

// POST request with JSON body
const createResponse = await fetch("https://api.example.com/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    role: "developer"
  })
});

// File upload
const fileData = await Bun.file("document.pdf").arrayBuffer();
const uploadResponse = await fetch("https://api.example.com/upload", {
  method: "POST",
  headers: { "Content-Type": "application/pdf" },
  body: fileData
});

// Concurrent requests
const urls = [
  "https://api.example.com/users",
  "https://api.example.com/posts",
  "https://api.example.com/comments"
];
const responses = await Promise.all(urls.map(url => fetch(url)));
const data = await Promise.all(responses.map(r => r.json()));
```

---

## ⚡ **Performance & Concurrency**

### **🔥 Bun.spawn() - Process Management**

#### **Advanced Process Control**
```javascript
// Spawn subprocess with environment
const proc = Bun.spawn(["python", "script.py"], {
  cwd: "/workspace",
  env: {
    "NODE_ENV": "production",
    "API_KEY": process.env.API_KEY,
    "DEBUG": "true"
  },
  stdin: "pipe",
  stdout: "pipe",
  stderr: "pipe"
});

// Send input to process
proc.stdin.write("input data\n");

// Read output
const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();

// Wait for completion
const exitCode = await proc.exited;

console.log(`Process exited with code: ${exitCode}`);
if (exitCode === 0) {
  console.log("Output:", stdout);
} else {
  console.error("Error:", stderr);
}
```

#### **Process Pool Pattern**
```javascript
class ProcessPool {
  constructor(command, size = 4) {
    this.command = command;
    this.size = size;
    this.processes = [];
    this.available = [];
    this.init();
  }
  
  async init() {
    for (let i = 0; i < this.size; i++) {
      const proc = Bun.spawn(this.command);
      this.processes.push(proc);
      this.available.push(proc);
    }
  }
  
  async execute(input) {
    const proc = this.available.pop();
    if (!proc) {
      throw new Error("No available processes");
    }
    
    proc.stdin.write(input);
    const output = await new Response(proc.stdout).text();
    
    this.available.push(proc);
    return output;
  }
}

// Usage
const pool = new ProcessPool(["python", "worker.py"], 4);
const results = await Promise.all([
  pool.execute("task1"),
  pool.execute("task2"),
  pool.execute("task3"),
  pool.execute("task4")
]);
```

### **⏱️ Bun.sleep() - Async Timing**

#### **Advanced Sleep Patterns**
```javascript
// Basic sleep
await Bun.sleep(1000); // Sleep 1 second

// Sleep with abort controller
const controller = new AbortController();
setTimeout(() => controller.abort(), 500);

try {
  await Bun.sleep(2000, controller.signal);
  console.log("Slept for 2 seconds");
} catch {
  console.log("Sleep aborted after 500ms");
}

// Retry pattern with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await Bun.sleep(delay);
    }
  }
}

// Usage
const result = await retryWithBackoff(async () => {
  const response = await fetch("https://api.example.com/data");
  if (!response.ok) throw new Error("Request failed");
  return response.json();
});
```

---

## 🔍 **Glob & File Patterns**

### **🎯 Advanced File Matching**

#### **Complex Pattern Matching**
```javascript
// Find all JavaScript files
const jsFiles = await Bun.glob("**/*.js");

// Find TypeScript files in specific directories
const tsFiles = await Bun.glob("src/**/*.{ts,tsx}");

// Multiple patterns with exclusions
const sourceFiles = await Bun.glob([
  "src/**/*.js",
  "src/**/*.ts",
  "tests/**/*.spec.js"
], {
  ignore: [
    "node_modules/**",
    "dist/**",
    "*.min.js",
    "**/*.d.ts"
  ]
});

// Find files modified in last 7 days
const recentFiles = await Bun.glob("**/*", {
  onlyFiles: true,
  absolute: true
}).then(files => 
  files.filter(async file => {
    const stats = await Bun.file(file).stat();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return stats.mtimeMs > sevenDaysAgo;
  })
);

// Large file finder
const largeFiles = await Bun.glob("**/*", {
  onlyFiles: true,
  absolute: true
}).then(files =>
  Promise.all(files.map(async file => {
    const size = Bun.file(file).size;
    return { file, size };
  }))
).then(results =>
  results.filter(r => r.size > 1024 * 1024) // > 1MB
  .sort((a, b) => b.size - a.size)
);
```

---

## 📦 **Package Management**

### **🚀 Programmatic Package Management**

#### **Advanced Installation Patterns**
```javascript
// Install with specific versions
await Bun.install({
  name: "my-project",
  dependencies: {
    "express": "^4.18.0",
    "lodash": "^4.17.21",
    "axios": "1.6.0"
  },
  devDependencies: {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0"
  }
});

// Conditional installation
const installDependencies = async (env) => {
  const baseDeps = {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  };
  
  const envDeps = env === 'development' ? {
    "typescript": "^5.0.0",
    "nodemon": "^3.0.0"
  } : env === 'production' ? {
    "pm2": "^5.0.0"
  } : {};
  
  await Bun.install({
    name: "my-project",
    dependencies: baseDeps,
    devDependencies: envDeps
  });
};

// Usage
await installDependencies(process.env.NODE_ENV);
```

---

## 🎯 **Real-World Integration Examples**

### **📊 Analytics Dashboard Backend**
```javascript
// analytics-server.js
const server = Bun.serve({
  port: 3001,
  
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/api/metrics") {
      // Get system metrics
      const metrics = {
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        version: Bun.version,
        platform: process.platform,
        arch: process.arch
      };
      
      // Get project data
      const projects = await Bun.glob("projects/*.json")
        .then(files => Promise.all(
          files.map(file => Bun.file(file).json())
        ));
      
      // Calculate analytics
      const analytics = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === "active").length,
        avgProgress: projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length
      };
      
      return Response.json({ metrics, analytics });
    }
    
    if (url.pathname === "/api/export") {
      // Export data as CSV
      const projects = await Bun.glob("projects/*.json")
        .then(files => Promise.all(
          files.map(file => Bun.file(file).json())
        ));
      
      const csv = [
        "name,status,progress,lastUpdated",
        ...projects.map(p => 
          `"${p.name}","${p.status}",${p.progress},"${p.lastUpdated}"`
        )
      ].join("\n");
      
      return new Response(csv, {
        headers: { "Content-Type": "text/csv" }
      });
    }
    
    return new Response("Not found", { status: 404 });
  }
});

console.log(`Analytics server running on port ${server.port}`);
```

### **🔧 Automated Project Builder**
```javascript
// build-system.js
class ProjectBuilder {
  constructor() {
    this.projects = [];
    this.buildQueue = [];
  }
  
  async loadProjects() {
    const projectFiles = await Bun.glob("projects/*.json");
    this.projects = await Promise.all(
      projectFiles.map(file => Bun.file(file).json())
    );
  }
  
  async buildProject(project) {
    console.log(`Building ${project.name}...`);
    
    // Run build command
    const buildProc = Bun.spawn([
      "npm", "run", "build"
    ], {
      cwd: project.path,
      stdout: "pipe",
      stderr: "pipe"
    });
    
    const stdout = await new Response(buildProc.stdout).text();
    const stderr = await new Response(buildProc.stderr).text();
    const exitCode = await buildProc.exited;
    
    // Update project status
    project.lastBuild = {
      timestamp: Date.now(),
      success: exitCode === 0,
      output: stdout,
      error: stderr
    };
    
    // Save updated project
    await Bun.write(
      `projects/${project.name}.json`,
      JSON.stringify(project, null, 2)
    );
    
    return project.lastBuild;
  }
  
  async buildAll() {
    await this.loadProjects();
    
    const buildPromises = this.projects
      .filter(p => p.autoBuild)
      .map(p => this.buildProject(p));
    
    const results = await Promise.allSettled(buildPromises);
    
    // Display results table
    const tableData = results.map((result, index) => ({
      project: this.projects[index].name,
      status: result.status === 'fulfilled' ? '✅ Success' : '❌ Failed',
      time: result.value?.timestamp || 'N/A'
    }));
    
    Bun.inspect.table(tableData);
    
    return results;
  }
}

// Usage
const builder = new ProjectBuilder();
await builder.buildAll();
```

---

## 📚 **Additional Resources & Performance Tips**

### **⚡ Performance Optimization**
```javascript
// Use Bun.file() for better performance than fs
const fastRead = async (filename) => {
  const file = Bun.file(filename);
  return await file.json(); // Faster than fs.readFile + JSON.parse
};

// Batch operations for better performance
const batchProcess = async (files) => {
  const results = await Promise.all(
    files.map(file => Bun.file(file).text())
  );
  return results;
};

// Memory-efficient streaming
const streamProcess = async (largeFile) => {
  const stream = Bun.file(largeFile).stream();
  let processed = 0;
  
  for await (const chunk of stream) {
    // Process chunk without loading entire file
    processed += chunk.length;
    if (processed % 1024 * 1024 === 0) {
      console.log(`Processed ${processed / 1024 / 1024} MB`);
    }
  }
};
```

### **🔗 Integration with Your Knowledge System**
- [[01-AREAS/SKILLS/Bun JavaScript Runtime - Learning Track]] - Skill development
- [[02-SYSTEM/Templates/Project Template]] - Add Bun-based project templates
- [[01-AREAS/KNOWLEDGE/Table Formulas - Complete Reference]] - Data processing

---

## 🔧 **Transpilation & Language Features**

### **⚙️ TypeScript & JavaScript Transpilation**

#### **Basic Transpilation**
```javascript
// Transpile TypeScript to JavaScript
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'browser'
});

// Transpile with custom settings
await Bun.build({
  entrypoints: ['src/app.tsx'],
  outdir: 'build',
  target: 'node',
  minify: true,
  sourcemap: 'external'
});
```

#### **Advanced Configuration Options**
```javascript
// Custom tsconfig override
const result = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  tsconfig: './custom.tsconfig.json', // --tsconfig-override
  define: {
    'process.env.NODE_ENV': '"production"', // --define
    'API_URL': '"https://api.example.com"'
  },
  drop: ['console', 'debugger'], // --drop
  zeroFillBuffers: true, // --zero-fill-buffers
  external: ['react', 'react-dom']
});

console.log(`Build success: ${result.success}`);
console.log(`Outputs: ${result.outputs.length} files`);
```

#### **Buffer Security Configuration**
```javascript
// Security-focused build with zero-filled buffers
const secureBuild = await Bun.build({
  entrypoints: ['src/secure-app.ts'],
  outdir: 'dist',
  target: 'node',
  zeroFillBuffers: true, // Force Buffer.allocUnsafe() to be zero-filled
  // This ensures that even "unsafe" buffers are initialized with zeros
  // Prevents potential data leakage from uninitialized memory
});

// Development vs Production buffer handling
const configs = {
  development: {
    zeroFillBuffers: false, // Faster for development
    // Buffer.allocUnsafe() behaves normally (may contain old data)
  },
  production: {
    zeroFillBuffers: true, // Secure for production
    // All buffers are zero-filled, preventing data exposure
  }
};

// Example of buffer behavior
// With zeroFillBuffers: true
const unsafeBuffer = Buffer.allocUnsafe(1024);
console.log(unsafeBuffer.toString('hex')); // All zeros: 0000...
// Even though allocUnsafe was used, it's zero-filled

// With zeroFillBuffers: false
const unsafeBufferDev = Buffer.allocUnsafe(1024);
console.log(unsafeBufferDev.toString('hex')); // May contain old data
```

### **🎯 JSX & React Features**

#### **JSX Runtime Configuration**
```javascript
// Automatic JSX runtime (default)
await Bun.build({
  entrypoints: ['src/App.tsx'],
  jsxRuntime: 'automatic', // --jsx-runtime
  jsxImportSource: 'preact', // --jsx-import-source
  outdir: 'dist'
});

// Classic JSX runtime
await Bun.build({
  entrypoints: ['src/LegacyComponent.jsx'],
  jsxRuntime: 'classic',
  jsxFactory: 'h', // --jsx-factory
  jsxFragment: 'Fragment', // --jsx-fragment
  outdir: 'dist'
});

// JSX with side effects
await Bun.build({
  entrypoints: ['src/components.tsx'],
  jsxSideEffects: true, // --jsx-side-effects
  outdir: 'dist'
});
```

#### **JSX Loader Examples**
```javascript
// Custom file loaders
await Bun.build({
  entrypoints: ['src/index.tsx'],
  outdir: 'dist',
  loader: {
    '.js': 'jsx', // --loader .js:jsx
    '.ts': 'tsx',
    '.svg': 'text',
    '.css': 'css'
  }
});

// Load different file types
const loaders = {
  '.js': 'js',     // JavaScript
  '.jsx': 'jsx',   // JSX
  '.ts': 'ts',     // TypeScript
  '.tsx': 'tsx',   // TypeScript with JSX
  '.json': 'json', // JSON files
  '.toml': 'toml', // TOML configuration
  '.text': 'text', // Plain text
  '.file': 'file', // Binary files
  '.wasm': 'wasm'  // WebAssembly
};
```

### **🔄 Advanced Build Features**

#### **Macro System**
```javascript
// Enable/disable macros
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  macros: true, // Default: enabled
  // noMacros: true // --no-macros to disable
});

// Custom macro usage
const config = {
  development: {
    macros: true,
    define: { DEBUG: 'true' }
  },
  production: {
    macros: false, // --no-macros
    drop: ['console', 'debugger'],
    minify: true
  }
};
```

#### **Tree Shaking & DCE**
```javascript
// Tree shaking configuration
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  treeShaking: true,
  ignoreDCEAnnotations: false, // --ignore-dce-annotations
  // When true, ignores @__PURE__ and similar annotations
});

// Example with @PURE annotation
// utils.ts
export const helper = /*#__PURE__*/ (() => {
  return function expensiveCalculation() {
    return Math.random() * 1000;
  };
})();

// Will be removed if unused (unless ignoreDCEAnnotations: true)
```

### **📦 Complete Build Pipeline Example**

#### **Production Build Setup**
```javascript
// build.config.js
export const buildConfig = {
  entrypoints: [
    'src/index.tsx',
    'src/sw.ts', // Service worker
    'src/worker.ts' // Web worker
  ],
  outdir: 'dist',
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true
  },
  sourcemap: 'external',
  tsconfig: './tsconfig.build.json',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.VERSION': `"${process.env.npm_package_version}"`
  },
  drop: ['console', 'debugger', 'alert'],
  external: [],
  plugins: [
    {
      name: 'custom-plugin',
      setup(build) {
        build.onLoad({ filter: /\.custom$/ }, async (args) => {
          return {
            contents: `// Processed ${args.path}`,
            loader: 'js'
          };
        });
      }
    }
  ]
};

// Execute build
const result = await Bun.build(buildConfig);
if (result.success) {
  console.log('✅ Build completed successfully');
  result.outputs.forEach(output => {
    console.log(`📄 ${output.path}`);
  });
} else {
  console.error('❌ Build failed:');
  result.logs.forEach(log => console.error(log));
}
```

#### **Development Build Setup**
```javascript
// dev.config.js
export const devConfig = {
  entrypoints: ['src/index.tsx'],
  outdir: 'dist-dev',
  target: 'browser',
  watch: true, // Watch for changes
  serve: true, // Start dev server
  port: 3000,
  liveReload: true,
  tsconfig: './tsconfig.json',
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.DEBUG': 'true'
  },
  drop: [], // Keep console logs in development
  minify: false,
  sourcemap: 'inline',
  ignoreDCEAnnotations: true, // Keep all code for debugging
  macros: true // Enable all macros
};
```

### **🎛️ Command Line Interface**

#### **Common CLI Patterns**
```bash
# Basic transpilation
bun build src/index.ts --outdir dist --target browser

# With custom configuration
bun build src/app.tsx \
  --tsconfig-override ./tsconfig.build.json \
  --define process.env.NODE_ENV:"production" \
  --drop console \
  --loader .js:jsx \
  --jsx-runtime automatic \
  --jsx-import-source preact

# Security-focused build with zero-filled buffers
bun build src/secure-app.ts \
  --outdir dist \
  --zero-fill-buffers \
  --define process.env.NODE_ENV:"production"

# Development build
bun build src/index.ts \
  --outdir dist-dev \
  --watch \
  --sourcemap inline \
  --define DEBUG:"true"

# Production build with security
bun build src/index.ts \
  --outdir dist \
  --minify \
  --target browser \
  --drop console,debugger \
  --zero-fill-buffers \
  --define process.env.NODE_ENV:"production"
```

### **🔍 Integration with Your Knowledge System**

- [[01-AREAS/SKILLS/Bun JavaScript Runtime - Learning Track]] - Progressive learning
- [[02-SYSTEM/Templates/Project Template]] - Build configuration templates
- [[01-AREAS/KNOWLEDGE/Table Formulas - Complete Reference]] - Data processing

---

*Last Updated: {{date}}* | *Version: Bun v1.0+* | *Performance: 3x faster than Node.js*

// Custom options
Bun.inspect.table(data, {
  maxRows: 10,
  maxColumnWidth: 20,
  showHeader: true,
  showIndex: true
});
```

---

## 📁 **File System Operations**

### **File Reading**
```javascript
// Read entire file
const content = await Bun.file("example.txt").text();
const buffer = await Bun.file("example.txt").arrayBuffer();
const json = await Bun.file("data.json").json();

// Stream reading
const stream = Bun.file("large.txt").stream();
for await (const chunk of stream) {
  console.log(chunk);
}
```

### **File Writing**
```javascript
// Write text
await Bun.write("output.txt", "Hello, Bun!");

// Write JSON
await Bun.write("data.json", JSON.stringify(data));

// Write binary data
await Bun.write("binary.bin", new Uint8Array([1, 2, 3]));
```

### **File Information**
```javascript
const file = Bun.file("example.txt");
console.log(file.size);     // File size in bytes
console.log(file.type);     // MIME type
console.log(file.lastModified); // Timestamp
```

---

## 🌐 **HTTP Server & Client**

### **HTTP Server**
```javascript
// Basic server
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun!");
  }
});

// With routing
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/api") {
      return Response.json({ message: "API endpoint" });
    }
    
    return new Response("Not found", { status: 404 });
  }
});
```

### **HTTP Client**
```javascript
// GET request
const response = await fetch("https://api.example.com/data");
const data = await response.json();

// POST request
const result = await fetch("https://api.example.com/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "value" })
});
```

---

## ⚡ **Performance Utilities**

### **Bun.sleep()**
```javascript
// Sleep for specified milliseconds
await Bun.sleep(1000); // Sleep 1 second

// Sleep with abort signal
const controller = new AbortController();
setTimeout(() => controller.abort(), 500);
await Bun.sleep(1000, controller.signal); // Will abort after 500ms
```

### **Bun.spawn()**
```javascript
// Spawn subprocess
const proc = Bun.spawn(["ls", "-la"], {
  cwd: "/tmp",
  env: { CUSTOM_VAR: "value" }
});

// Get output
const stdout = await new Response(proc.stdout).text();
const exitCode = await proc.exited;
```

---

## 🔍 **Glob & File Patterns**

### **Bun.glob()**
```javascript
// Find all JavaScript files
const jsFiles = await Bun.glob("**/*.js");

// Find TypeScript files in src directory
const tsFiles = await Bun.glob("src/**/*.ts");

// Multiple patterns
const files = await Bun.glob(["**/*.js", "**/*.ts", "**/*.json"]);

// Exclude patterns
const filteredFiles = await Bun.glob("**/*", {
  ignore: ["node_modules/**", "*.log"]
});
```

---

## 📦 **Package Management**

### **Bun.install()**
```javascript
// Install packages programmatically
await Bun.install({
  name: "my-project",
  dependencies: {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  }
});

// Install dev dependencies
await Bun.install({
  name: "my-project",
  devDependencies: {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
});
```

---

## 🔧 **Environment & Configuration**

### **Environment Variables**
```javascript
// Access environment variables
const apiKey = process.env.API_KEY;
const nodeEnv = process.env.NODE_ENV;

// Load .env file automatically (Bun does this by default)
const dbUrl = process.env.DATABASE_URL;
```

### **Configuration**
```javascript
// Get Bun version
console.log(Bun.version);

// Get platform info
console.log(Bun.platform); // "darwin", "linux", "win32"
console.log(Bun.arch); // "x64", "arm64", etc.
```

---

## 🎯 **TypeScript Integration**

### **Native TypeScript Support**
```typescript
// app.ts - No compilation step needed!
interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
];

// Run directly with Bun
// bun run app.ts
```

### **TypeScript Configuration**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

---

## 🚀 **Performance Tips**

### **Fast File Operations**
```javascript
// Use Bun.file() for better performance
const file = Bun.file("large-data.json");
const data = await file.json(); // Faster than fs.readFile + JSON.parse
```

### **Efficient String Operations**
```javascript
// Bun has optimized string operations
const text = await Bun.file("large.txt").text();
const lines = text.split("\n"); // Fast line splitting
```

### **Memory Management**
```javascript
// Use streams for large files
const stream = Bun.file("huge-file.txt").stream();
for await (const chunk of stream) {
  // Process chunk by chunk to save memory
}
```

---

## 📚 **Additional Resources**

- [Official Bun Documentation](https://bun.sh/docs)
- [Bun vs Node.js Benchmarks](https://bun.sh/docs/benchmark/nodejs)
- [API Reference](https://bun.sh/docs/api)
- [GitHub Repository](https://github.com/oven-sh/bun)

---

*Last Updated: {{date}}* | *Version: Bun v1.0+*

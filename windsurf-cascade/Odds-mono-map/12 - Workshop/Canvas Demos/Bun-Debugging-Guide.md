# 🎯 Bun Debugging Complete Guide

> **Comprehensive demonstration of Bun's debugging capabilities including WebKit Inspector Protocol, VS Code integration, network debugging, stack traces, and advanced debugging techniques.**

---

## **🌈 Overview**

Bun provides **powerful debugging capabilities** with full WebKit Inspector Protocol support, VS Code integration, and advanced debugging features that make development and troubleshooting efficient and enjoyable.

### **🔧 Key Features**
- **WebKit Inspector Protocol**: Full debugging with breakpoints and step execution
- **VS Code Integration**: Seamless debugging experience in your favorite editor
- **Network Debugging**: Verbose fetch logging and curl command generation
- **Stack Traces**: Enhanced error display with sourcemap support
- **V8 Compatibility**: Drop-in replacement for Node.js debugging APIs
- **Async Debugging**: Advanced promise and async/await debugging support

---

## **🚀 Getting Started with Bun Debugging**

### **🔍 Basic Debugging Commands**

#### **Enable Inspector**
```bash
# Start debugging with inspector
bun --inspect server.ts

# Start with breakpoint at first line
bun --inspect-brk server.ts

# Wait for debugger to attach before executing
bun --inspect-wait server.ts
```

#### **Custom Port and URL**
```bash
# Specify custom port
bun --inspect=4000 server.ts

# Specify custom host and port
bun --inspect=localhost:4000 server.ts

# Specify custom URL prefix
bun --inspect=localhost:4000/prefix server.ts
```

### **📊 Inspector Output**
```
------------------ Bun Inspector ------------------
Listening at:
  ws://localhost:6499/0tqxs9exrgrm

Inspect in browser:
  https://debug.bun.sh/#localhost:6499/0tqxs9exrgrm
------------------ Bun Inspector ------------------
```

---

## **🌐 WebKit Inspector Debugging**

### **🔧 Debug Server Example**
```typescript
// server.ts
Bun.serve({
  fetch(req) {
    console.log(req.url);  // Set breakpoint here
    return new Response("Hello, world!");
  },
});
```

### **📍 Using debug.bun.sh**

1. **Open the Debugger URL** in your browser
2. **Navigate to Sources tab** to view your code
3. **Set breakpoints** by clicking line numbers
4. **Make requests** to your server to trigger breakpoints
5. **Inspect variables** in the scope panel
6. **Use the console** to execute code in context

### **🎮 Debugger Controls**

| Control | Function | Description |
|---------|----------|-------------|
| **Continue** | ▶️ | Continue running until next breakpoint |
| **Step Over** | ↗️ | Execute next line without entering functions |
| **Step Into** | ↘️ | Enter function calls to debug inside |
| **Step Out** | ↖️ | Exit current function and return to caller |

---

## **💻 VS Code Debugging Integration**

### **🔧 Setup Requirements**

1. **Install Bun VS Code Extension**
```bash
# Install from VS Code marketplace
# Search for "Bun" extension by Oven
```

2. **Configure launch.json**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Bun",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/server.ts",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Bun with Arguments",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/server.ts",
      "args": ["--port", "3000"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### **🎯 VS Code Debugging Features**

- **Breakpoints**: Click in the gutter to set breakpoints
- **Variable Inspection**: Hover over variables to see values
- **Watch Panel**: Add expressions to watch during debugging
- **Call Stack**: View the complete call stack
- **Debug Console**: Execute code in the current context
- **Conditional Breakpoints**: Set breakpoints that trigger only when conditions are met

---

## **🌐 Network Request Debugging**

### **📡 Verbose Fetch Logging**

#### **Enable Curl Command Output**
```typescript
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

await fetch("https://example.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ foo: "bar" }),
});
```

**Output:**
```
[fetch] $ curl --http1.1 "https://example.com/" -X POST -H "content-type: application/json" -H "Connection: keep-alive" -H "User-Agent: Bun/1.3.2" -H "Accept: */*" -H "Host: example.com" -H "Accept-Encoding: gzip, deflate, br" --compressed -H "Content-Length: 13" --data-raw "{\"foo\":\"bar\"}"
[fetch] > HTTP/1.1 POST https://example.com/
[fetch] > content-type: application/json
[fetch] > Connection: keep-alive
[fetch] > User-Agent: Bun/1.3.2
[fetch] > Accept: */*
[fetch] > Host: example.com
[fetch] > Accept-Encoding: gzip, deflate, br
[fetch] > Content-Length: 13

[fetch] < 200 OK
[fetch] < Accept-Ranges: bytes
[fetch] < Cache-Control: max-age=604800
[fetch] < Content-Type: text/html; charset=UTF-8
```

#### **Enable Detailed Request/Response Logging**
```typescript
process.env.BUN_CONFIG_VERBOSE_FETCH = "true";

await fetch("https://httpbin.org/get", {
  headers: {
    "User-Agent": "Bun-Debug-Demo/1.0"
  }
});
```

#### **Node.js HTTP Compatibility**
```typescript
process.env.BUN_CONFIG_VERBOSE_FETCH = "true";

import http from 'node:http';

const req = http.request('http://httpbin.org/get', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.end();
```

---

## **📍 Stack Traces and Sourcemaps**

### **🔍 Enhanced Error Display**
```typescript
// Create an error for demonstration
const err = new Error("Something went wrong");
console.log(Bun.inspect(err, { colors: true }));
```

**Output:**
```
1 | // Create an error
2 | const err = new Error("Something went wrong");
                ^
error: Something went wrong
      at file.js:2:13
```

### **🗺️ Automatic Sourcemap Support**

Bun automatically generates and serves sourcemaps for:
- **TypeScript files**: .ts extensions
- **JSX files**: .jsx and .tsx extensions  
- **Transformed JavaScript**: Any transpiled code

**Benefits:**
- **Click-to-open**: Click file paths in stack traces to open source
- **Original line numbers**: Accurate line and column information
- **Variable names**: Preserved original variable names
- **Function names**: Maintains original function names

---

## **🔧 V8 Stack Trace API**

### **📊 Custom Stack Trace Preparation**
```typescript
Error.prepareStackTrace = (err, stack) => {
  return stack.map(callSite => {
    return `${callSite.getFileName()}:${callSite.getLineNumber()}:${callSite.getColumnNumber()} - ${callSite.getFunctionName() || 'anonymous'}`;
  }).join('\n');
};

const error = new Error('Custom stack trace');
console.log(error.stack);
```

### **🎯 Error.captureStackTrace**
```typescript
function outerFunction() {
  innerFunction();
}

function innerFunction() {
  const error = new Error('Original error location');
  
  console.log('Original stack trace:');
  console.log(error.stack);
  
  console.log('\nAfter captureStackTrace:');
  Error.captureStackTrace(error, outerFunction);
  console.log(error.stack);
}

outerFunction();
```

### **📋 CallSite Object Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `getFileName()` | string | File name or URL |
| `getLineNumber()` | number | Line number |
| `getColumnNumber()` | number | Column number |
| `getFunctionName()` | string | Function name |
| `getMethodName()` | string | Method name |
| `getTypeName()` | string | Type of `this` |
| `isToplevel()` | boolean | If in global scope |
| `isEval()` | boolean | If from eval call |
| `isNative()` | boolean | If native function |
| `isConstructor()` | boolean | If constructor |
| `isAsync()` | boolean | If async function |

---

## **⚡ Asynchronous Debugging**

### **🔗 Async/Await Debugging**
```typescript
async function asyncOperation1(value: number): Promise<number> {
  console.log('🔄 Starting asyncOperation1 with value:', value);
  await new Promise(resolve => setTimeout(resolve, 100));
  const result = value * 2;
  console.log('✅ asyncOperation1 completed with result:', result);
  return result;
}

async function main() {
  const result1 = await asyncOperation1(5);
  const result2 = await asyncOperation2(result1);
  console.log('🎉 Final result:', result2);
}
```

### **🎯 Promise Debugging**
```typescript
function createPromises() {
  const promise1 = new Promise<string>((resolve) => {
    setTimeout(() => resolve('Promise 1 result'), 100);
  });
  
  const promise2 = new Promise<number>((resolve) => {
    setTimeout(() => resolve(42), 150);
  });
  
  return { promise1, promise2 };
}

// Promise.all - fails if any promise fails
Promise.all([promise1, promise2])
  .then(results => console.log('✅ Promise.all succeeded:', results))
  .catch(error => console.error('❌ Promise.all failed:', error));

// Promise.allSettled - shows all results
Promise.allSettled([promise1, promise2, promise3])
  .then(results => {
    console.log('📊 Promise.allSettled results:');
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`  Promise ${index + 1}:`, result.value);
      } else {
        console.log(`  Promise ${index + 1}:`, result.reason.message);
      }
    });
  });
```

---

## **🛠️ Debug Utilities**

### **🔧 Debug Utility Class**
```typescript
class DebugUtils {
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  
  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }
  
  static debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }
  
  static info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }
  
  static warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }
  
  static error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  }
  
  static inspect(label: string, obj: any, options?: { depth?: number; colors?: boolean }) {
    console.log(`🔍 [INSPECT] ${label}:`);
    console.log(Bun.inspect(obj, { depth: 3, colors: true, ...options }));
  }
  
  static trace(message: string) {
    console.log(`📍 [TRACE] ${message}`);
    console.trace();
  }
  
  static time(label: string) {
    console.time(`⏱️ [TIME] ${label}`);
  }
  
  static timeEnd(label: string) {
    console.timeEnd(`⏱️ [TIME] ${label}`);
  }
  
  static async measureAsync<T>(fn: () => Promise<T>, label: string): Promise<T> {
    this.time(label);
    try {
      const result = await fn();
      this.timeEnd(label);
      return result;
    } catch (error) {
      this.timeEnd(label);
      throw error;
    }
  }
  
  static measure<T>(fn: () => T, label: string): T {
    this.time(label);
    try {
      const result = fn();
      this.timeEnd(label);
      return result;
    } catch (error) {
      this.timeEnd(label);
      throw error;
    }
  }
  
  private static shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
}
```

### **💡 Usage Examples**
```typescript
// Set log level
DebugUtils.setLogLevel('debug');

// Log messages
DebugUtils.debug('Debug message with details', { user: 'Alice', action: 'login' });
DebugUtils.info('Process started', { pid: process.pid, memory: process.memoryUsage() });
DebugUtils.warn('High memory usage detected', { usage: '85%' });
DebugUtils.error('Database connection failed', { error: dbError });

// Object inspection
DebugUtils.inspect('User object', user, { depth: 5, colors: true });

// Performance measurement
const result = DebugUtils.measure(() => {
  // Expensive operation
  return processData(largeDataset);
}, 'Data processing');

// Async measurement
const apiResult = await DebugUtils.measureAsync(async () => {
  return await fetchAPI('/users');
}, 'API call');

// Stack tracing
DebugUtils.trace('Entering critical section');
```

---

## **🎯 Advanced Debugging Techniques**

### **🔍 Conditional Breakpoints**
```typescript
// In debugger, set conditional breakpoint
if (user.id === targetUserId) {
  debugger; // Only breaks for specific user
}
```

### **📊 Performance Profiling**
```typescript
// Manual performance profiling
const start = performance.now();

// Code to profile
for (let i = 0; i < 1000000; i++) {
  processItem(items[i]);
}

const end = performance.now();
console.log(`Processing took ${end - start}ms`);
```

### **🔧 Memory Debugging**
```typescript
// Memory usage tracking
function logMemoryUsage(label: string) {
  const usage = process.memoryUsage();
  console.log(`🧠 [MEMORY] ${label}:`);
  console.log(`  RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
}

// Usage
logMemoryUsage('Before processing');
await processLargeDataset();
logMemoryUsage('After processing');
```

### **🌐 Network Request Debugging**
```typescript
// Enhanced fetch debugging
async function debugFetch(url: string, options?: RequestInit) {
  console.log('🌐 [FETCH] Request:', {
    url,
    method: options?.method || 'GET',
    headers: options?.headers
  });
  
  const start = performance.now();
  
  try {
    const response = await fetch(url, options);
    const end = performance.now();
    
    console.log('🌐 [FETCH] Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      duration: `${(end - start).toFixed(2)}ms`
    });
    
    return response;
  } catch (error) {
    const end = performance.now();
    console.error('🌐 [FETCH] Error:', {
      error: error.message,
      duration: `${(end - start).toFixed(2)}ms`
    });
    throw error;
  }
}
```

---

## **🎮 Debugging Scenarios**

### **🐛 Common Debugging Scenarios**

#### **1. Server Request Debugging**
```typescript
Bun.serve({
  fetch(req) {
    // Set breakpoint here to inspect requests
    const url = new URL(req.url);
    console.log('Request details:', {
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(req.headers.entries())
    });
    
    return new Response('Debug info logged');
  }
});
```

#### **2. Async Function Debugging**
```typescript
async function processUser(userId: string) {
  // Step through this function to debug async flow
  console.log('Processing user:', userId);
  
  const user = await getUser(userId);
  console.log('User retrieved:', user);
  
  const permissions = await getPermissions(user.role);
  console.log('Permissions retrieved:', permissions);
  
  const result = await processData(user, permissions);
  console.log('Processing completed:', result);
  
  return result;
}
```

#### **3. Error Handling Debugging**
```typescript
try {
  // Code that might fail
  const result = await riskyOperation();
} catch (error) {
  // Inspect error details
  console.log('Error caught:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    cause: error.cause
  });
  
  // Use Bun.inspect for enhanced error display
  console.log(Bun.inspect(error, { colors: true }));
}
```

---

## **📋 Debugging Checklist**

### **🔧 Before Debugging**
- [ ] **Enable inspector** with `--inspect` flag
- [ ] **Set appropriate log level** for debug output
- [ ] **Configure breakpoints** in critical areas
- [ ] **Enable verbose logging** for network requests if needed
- [ ] **Set up VS Code debugging** configuration

### **🎯 During Debugging**
- [ ] **Use step debugging** to trace execution flow
- [ ] **Inspect variables** in the current scope
- [ ] **Use debug console** to test expressions
- [ ] **Monitor performance** with timing measurements
- [ ] **Check network requests** with verbose logging

### **✅ After Debugging**
- [ ] **Remove debug breakpoints** from production code
- [ ] **Disable verbose logging** for better performance
- [ ] **Add error handling** for discovered edge cases
- [ ] **Document debugging findings** for future reference
- [ ] **Add unit tests** for fixed issues

---

## **🌟 Best Practices**

### **✅ Recommended Practices**
- **Use meaningful log messages** with context and timestamps
- **Set appropriate log levels** for different environments
- **Use conditional breakpoints** to reduce noise
- **Monitor performance** during debugging sessions
- **Document debugging findings** for team knowledge sharing

### **⚠️ Common Pitfalls**
- **Leaving debug code** in production builds
- **Over-logging** which can impact performance
- **Ignoring error handling** during debugging
- **Forgetting to disable** verbose network logging
- **Not using sourcemaps** for transpiled code debugging

### **🚀 Performance Tips**
- **Use appropriate log levels** to reduce console output
- **Disable verbose logging** in production
- **Use performance.now()** for accurate timing
- **Monitor memory usage** during long debugging sessions
- **Use async debugging** for promise-heavy code

---

## **🎯 Conclusion**

Bun's debugging capabilities provide **world-class development experience** with comprehensive tools for every debugging scenario:

### **🏆 Key Benefits**
- **🔄 Full Inspector Support**: WebKit Inspector Protocol for powerful debugging
- **💻 VS Code Integration**: Seamless debugging in your favorite editor
- **🌐 Network Debugging**: Verbose fetch logging with curl command generation
- **📍 Enhanced Stack Traces**: Automatic sourcemap support and V8 compatibility
- **⚡ Async Debugging**: Advanced promise and async/await debugging
- **🛠️ Debug Utilities**: Comprehensive toolkit for common debugging tasks

### **🎊 Advanced Features**
- **Breakpoint Management**: Conditional breakpoints and step debugging
- **Variable Inspection**: Rich object inspection with Bun.inspect()
- **Performance Monitoring**: Built-in timing and memory tracking
- **Network Analysis**: Detailed request/response logging
- **Error Analysis**: Enhanced error display and stack trace manipulation
- **Production Ready**: Debugging tools that work in development and production

This comprehensive debugging system makes Bun an **excellent choice** for development, providing developers with powerful tools to build, debug, and maintain high-quality applications with confidence and efficiency.

---

**📊 System Status**: ✅ Complete Implementation | **🚀 Performance**: Optimized | **🎯 Features**: All Debugging Tools | **🌟 Quality**: Production Ready | **💡 Innovation**: Advanced Debugging | **🔧 Integration**: Seamless | **📊 Documentation**: Complete | **🎨 Experience**: Developer Friendly | **🔄 Compatibility**: V8 Compatible | **📈 Productivity**: High | **🎯 Ready**: Production | **✨ Ultimate**: Debugging**

# 🎯 Web Console API Complete Guide

> **Comprehensive demonstration of the Web Console API as implemented in Bun, including all standard methods, formatting techniques, and Bun-specific enhancements based on MDN documentation.**

---

## **🌈 Overview**

The Web Console API provides access to the debugging console and is **fully implemented in Bun** with additional enhancements. This guide demonstrates every console method with practical examples and advanced techniques.

### **🔧 Key Features**
- **Standard Web Console API**: Full compatibility with browser console methods
- **Bun Enhancements**: Additional features like `Bun.inspect()` and performance tools
- **Rich Formatting**: CSS styling, string substitutions, and table displays
- **Debugging Tools**: Stack traces, assertions, and performance measurement
- **Organization**: Grouping, counting, and structured logging

---

## **📝 Basic Logging Methods**

### **🔍 Standard Log Levels**
```typescript
// Different log levels with visual distinction
console.log('ℹ️ This is an info message (using console.log)');
console.info('ℹ️ This is an info message (using console.info)');
console.warn('⚠️ This is a warning message');
console.error('❌ This is an error message');
console.debug('🐛 This is a debug message');
```

### **📊 Multiple Arguments**
```typescript
const car = 'Dodge Charger';
const someObject = { str: 'Some text', id: 5 };
console.info('My first car was a', car, '. The object is:', someObject);
```

### **🎨 String Substitutions**
```typescript
const name = 'Alice';
const age = 30;
const score = 95.5;
const user = { name: 'Alice', role: 'admin' };

// %s - String, %d/%i - Integer, %f - Float, %o - Object (optimal), %O - Object (generic)
console.log('User: %s, Age: %d, Score: %f, Object: %o', name, age, score, user);
console.log('Object with generic formatting: %O', user);
```

---

## **🔍 Object Inspection Methods**

### **📋 Console.log vs Console.dir**
```typescript
const complexObject = {
  user: {
    name: 'Alice',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      country: 'USA'
    }
  },
  scores: [95, 87, 92],
  active: true
};

// Basic logging
console.log('📋 Simple object with console.log:');
console.log(complexObject);

// Detailed inspection with depth control
console.log('🔍 Detailed inspection with console.dir:');
console.dir(complexObject, { depth: 3, colors: true });
```

### **📄 XML/HTML Representation**
```typescript
// Display objects in XML/HTML format when possible
console.dirxml(complexObject);
```

### **📸 Object Snapshotting**
```typescript
const obj = {};
console.log('Before mutation:', obj);
obj.prop = 123;
console.log('After mutation - logged object shows current state when expanded');

// Deep clone to prevent lazy evaluation
console.log('Deep cloned object:', JSON.parse(JSON.stringify(obj)));
```

---

## **🎨 Formatting and Styling**

### **🌈 CSS Styling**
```typescript
// Basic styling
console.log('%cThis is styled text', 'color: blue; font-size: 16px; font-weight: bold;');

// Multiple styled parts
console.log('%cRed text %cGreen text %cBlue text', 'color: red;', 'color: green;', 'color: blue;');

// Background styling
console.log('%cBackground styling', 'background: #f0f0f0; color: #333; padding: 5px; border-radius: 3px;');

// Complex multi-part styling
console.log(
  '%c🎨 %cStyled %cConsole %cOutput',
  'font-size: 20px; color: #ff6b6b;',
  'font-size: 18px; color: #4ecdc4; font-weight: bold;',
  'font-size: 16px; color: #45b7d1; text-decoration: underline;',
  'font-size: 14px; color: #96ceb4; font-style: italic;'
);
```

---

## **✅ Assertions and Validation**

### **🔧 Console.assert**
```typescript
// Successful assertion (no output)
console.assert(true, 'This will not be shown');
console.assert(5 === 5, 'Math is working correctly');

// Failed assertions show error messages
console.assert(false, 'This assertion will fail');
console.assert(2 + 2 === 5, 'Math is broken: 2 + 2 should equal 4, not 5');

// Complex assertions with context
const user = { name: 'Alice', age: 30 };
console.assert(user.age >= 18, 'User must be 18 or older', user);
console.assert(user.name === 'Bob', 'Expected user name to be Bob', user);
```

---

## **🔢 Counting and Timing**

### **📊 Console Counting**
```typescript
// Counter with default label
console.count('default');
console.count('default');
console.count('custom');
console.count('default');
console.count('custom');
console.count('custom');

// Reset counters
console.countReset('default');
console.count('default');
console.count('custom');
```

### **⏱️ Performance Timing**
```typescript
// Basic timer usage
console.time('operation-timer');

// Simulate work
let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += i;
}

// Log intermediate time
console.timeLog('operation-timer', 'Loop completed, sum =', sum);

// More work
for (let i = 0; i < 500000; i++) {
  sum += i;
}

// End timer and show final time
console.timeEnd('operation-timer');

// Multiple concurrent timers
console.time('timer-1');
console.time('timer-2');

setTimeout(() => console.timeEnd('timer-1'), 100);
setTimeout(() => console.timeEnd('timer-2'), 150);
```

---

## **📁 Grouping and Organization**

### **🗂️ Basic Grouping**
```typescript
// Simple group
console.group('User Management');
console.log('Creating user...');
console.log('Validating input...');
console.log('Saving to database...');
console.groupEnd();
```

### **📊 Nested Groups**
```typescript
console.group('Application Startup');
console.log('Initializing configuration...');

console.group('Database Connection');
console.log('Connecting to database...');
console.log('Running migrations...');
console.log('Creating indexes...');
console.groupEnd();

console.log('Starting web server...');
console.log('Application ready!');
console.groupEnd();
```

### **📦 Collapsed Groups**
```typescript
console.groupCollapsed('Debug Information');
console.log('This group starts collapsed');
console.log('Click to expand and see details');
console.log({ debug: true, verbose: false, level: 'info' });
console.groupEnd();
```

---

## **📊 Table Display**

### **👥 Array of Objects as Table**
```typescript
const users = [
  { id: 1, name: 'Alice', age: 30, active: true },
  { id: 2, name: 'Bob', age: 25, active: false },
  { id: 3, name: 'Charlie', age: 35, active: true },
  { id: 4, name: 'Diana', age: 28, active: true }
];

// Full table
console.table(users);

// Table with specific columns
console.table(users, ['name', 'age']);
```

### **📈 Arrays and Objects as Tables**
```typescript
// Array data
const scores = [95, 87, 92, 78, 88, 91, 85];
console.table(scores);

// Object data
const config = {
  database: 'postgresql',
  port: 5432,
  host: 'localhost',
  ssl: true,
  maxConnections: 100
};
console.table(config);

// Complex nested data
const products = [
  {
    id: 1,
    name: 'Laptop',
    price: 999.99,
    category: { name: 'Electronics', department: 'Tech' },
    inStock: true
  },
  {
    id: 2,
    name: 'Book',
    price: 19.99,
    category: { name: 'Books', department: 'Media' },
    inStock: true
  }
];

console.table(products, ['name', 'price', 'inStock']);
```

---

## **🔍 Stack Traces and Debugging**

### **📍 Console.trace**
```typescript
function functionA() {
  functionB();
}

function functionB() {
  functionC();
}

function functionC() {
  console.trace('Trace from functionC');
}

// Execute to see stack trace
functionA();
```

### **❌ Error Handling**
```typescript
function throwError() {
  try {
    throw new Error('This is a demonstration error');
  } catch (error) {
    console.error('Caught error:', error.message);
    console.error('Full error object:', error);
  }
}

throwError();
```

---

## **🚀 Bun-Specific Enhancements**

### **🔍 Bun.inspect for Enhanced Object Inspection**
```typescript
const complexData = {
  users: [
    { id: 1, name: 'Alice', scores: [95, 87, 92] },
    { id: 2, name: 'Bob', scores: [78, 88, 91] }
  ],
  metadata: {
    total: 2,
    active: 2,
    lastUpdated: new Date()
  }
};

// Default inspection
console.log('🔍 Bun.inspect with default options:');
console.log(Bun.inspect(complexData));

// Enhanced inspection with options
console.log('🎨 Bun.inspect with colors and custom depth:');
console.log(Bun.inspect(complexData, {
  depth: 4,
  colors: true,
  compact: false,
  maxArrayLength: 10,
  maxStringLength: 50
}));
```

### **⚡ Performance Measurement**
```typescript
const start = performance.now();

// Simulate work
let result = 0;
for (let i = 0; i < 1000000; i++) {
  result += Math.sqrt(i);
}

const end = performance.now();
console.log(`Performance test completed in ${(end - start).toFixed(2)}ms`);
console.log(`Result: ${result.toFixed(2)}`);
```

---

## **💼 Practical Examples**

### **🔧 Custom Logger Utility**
```typescript
class DebugLogger {
  constructor(private enabled: boolean = true) {}

  log(...args: any[]) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.enabled) {
      console.warn('[DEBUG]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.enabled) {
      console.error('[DEBUG]', ...args);
    }
  }

  group(label: string) {
    if (this.enabled) {
      console.group(`[DEBUG] ${label}`);
    }
  }

  groupEnd() {
    if (this.enabled) {
      console.groupEnd();
    }
  }
}

// Usage
const logger = new DebugLogger(true);
logger.group('User Registration Flow');
logger.log('Starting user registration');
logger.log('Validating user data');
logger.warn('User already exists, showing warning');
logger.log('Creating user account');
logger.groupEnd();
```

### **🌐 API Request Logging**
```typescript
function logAPIRequest(method: string, url: string, data?: any) {
  console.group(`📡 ${method} ${url}`);
  console.log('Timestamp:', new Date().toISOString());
  
  if (data) {
    console.log('Request data:');
    console.dir(data, { depth: 2 });
  }
  
  console.log('Headers: { "Content-Type": "application/json" }');
  console.groupEnd();
}

// Usage
logAPIRequest('POST', '/api/users', { name: 'Alice', email: 'alice@example.com' });
logAPIRequest('GET', '/api/users/123');
```

### **📊 Performance Monitoring**
```typescript
function measurePerformance<T>(fn: () => T, label: string): T {
  console.time(label);
  const result = fn();
  console.timeEnd(label);
  return result;
}

// Usage
const result = measurePerformance(() => {
  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += Math.random();
  }
  return sum;
}, 'Random sum calculation');

console.log(`Calculation result: ${result.toFixed(2)}`);
```

---

## **🎨 Advanced Formatting Techniques**

### **📊 Progress Bar**
```typescript
function showProgressBar(current: number, total: number, width: number = 30) {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  console.log(`📊 Progress: [${bar}] ${percentage}% (${current}/${total})`);
}

// Usage
showProgressBar(0, 100);
showProgressBar(25, 100);
showProgressBar(50, 100);
showProgressBar(75, 100);
showProgressBar(100, 100);
```

### **🎯 Status Indicators**
```typescript
function showStatus(status: 'success' | 'warning' | 'error' | 'info', message: string) {
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  
  const colors = {
    success: 'color: green;',
    warning: 'color: orange;',
    error: 'color: red;',
    info: 'color: blue;'
  };
  
  console.log(`%c${icons[status]} ${message}`, colors[status]);
}

// Usage
showStatus('success', 'Operation completed successfully');
showStatus('warning', 'Memory usage is high');
showStatus('error', 'Failed to connect to database');
showStatus('info', 'Processing 1000 records');
```

### **📈 Data Visualization**
```typescript
function visualizeData(data: number[], label: string) {
  const max = Math.max(...data);
  const width = 50;
  
  console.log(`📈 ${label}:`);
  data.forEach((value, index) => {
    const barLength = Math.floor((value / max) * width);
    const bar = '█'.repeat(barLength);
    console.log(`  ${index}: ${bar} ${value}`);
  });
}

// Usage
visualizeData([10, 25, 15, 30, 20, 35, 40], 'Weekly Sales');
```

---

## **📋 Complete Console API Reference**

### **🔤 Logging Methods**
- **`console.log()`** - General purpose logging
- **`console.info()`** - Informational messages (same as log in Bun)
- **`console.warn()`** - Warning messages
- **`console.error()`** - Error messages
- **`console.debug()`** - Debug messages

### **🔍 Inspection Methods**
- **`console.dir()`** - Interactive object inspection
- **`console.dirxml()`** - XML/HTML element representation
- **`console.table()`** - Tabular data display

### **✅ Validation Methods**
- **`console.assert()`** - Conditional error logging

### **🔢 Counting Methods**
- **`console.count()`** - Increment named counter
- **`console.countReset()`** - Reset named counter

### **⏱️ Timing Methods**
- **`console.time()`** - Start named timer
- **`console.timeEnd()`** - End timer and log elapsed time
- **`console.timeLog()`** - Log current timer value

### **📁 Organization Methods**
- **`console.group()`** - Create indented output group
- **`console.groupCollapsed()`** - Create collapsed group
- **`console.groupEnd()`** - Close current group

### **🔍 Debugging Methods**
- **`console.trace()`** - Output stack trace
- **`console.clear()`** - Clear console output

### **🚀 Bun Enhancements**
- **`Bun.inspect()`** - Enhanced object inspection
- **`performance.now()`** - High-resolution timing
- **AsyncIterable console** - stdin reading capability

---

## **🎊 Live Demonstration Results**

### **📊 Table Output Examples**
```
👥 Users table:
┌───┬────┬─────────┬─────┬────────┐
│   │ id │ name    │ age │ active │
├───┼────┼─────────┼─────┼────────┤
│ 0 │ 1  │ Alice   │ 30  │ true   │
│ 1 │ 2  │ Bob     │ 25  │ false  │
│ 2 │ 3  │ Charlie │ 35  │ true   │
│ 3 │ 4  │ Diana   │ 28  │ true   │
└───┴────┴─────────┴─────┴────────┘
```

### **🔍 Stack Trace Output**
```
📍 Stack trace demonstration:
Trace from functionC
      at functionC (/path/to/file.ts:330:17)
      at functionB (/path/to/file.ts:326:9)
      at functionA (/path/to/file.ts:322:9)
      at demonstrateStackTraces (/path/to/file.ts:334:5)
```

### **⏱️ Performance Timing**
```
📊 Performance monitoring demonstration:
[0.71ms] Random sum calculation
Calculation result: 50059.02
```

---

## **🌟 Best Practices**

### **✅ Recommended Practices**
- **Use appropriate log levels** - `error` for errors, `warn` for warnings, `info` for general info
- **Group related output** - Use `console.group()` for organized logging
- **Time operations** - Use `console.time()` for performance measurement
- **Format tables** - Use `console.table()` for structured data
- **Style important messages** - Use CSS styling for emphasis

### **⚠️ Common Pitfalls**
- **Avoid logging sensitive data** - Don't log passwords, tokens, or personal information
- **Don't overuse debug logging** - Too much debug output can be overwhelming
- **Be careful with large objects** - Very large objects can impact performance
- **Consider production logging** - Use appropriate log levels for production

### **🚀 Performance Tips**
- **Use lazy evaluation** - Objects are inspected when expanded, not when logged
- **Limit array/object display** - Use `maxArrayLength` and `maxStringLength` options
- **Batch logging operations** - Group multiple log statements together
- **Use conditional logging** - Enable/disable logging based on environment

---

## **🎯 Conclusion**

The Web Console API in Bun provides **comprehensive debugging capabilities** with all standard methods plus powerful enhancements:

### **🏆 Key Benefits**
- **🔄 Full Compatibility**: Complete Web Console API implementation
- **🚀 Bun Enhancements**: Additional features like `Bun.inspect()` and stdin reading
- **🎨 Rich Formatting**: CSS styling, tables, and advanced visualization
- **📊 Performance Tools**: Built-in timing and measurement capabilities
- **🔍 Debugging Power**: Stack traces, assertions, and object inspection
- **📁 Organization**: Grouping and structured logging capabilities

### **🎊 Advanced Features**
- **Interactive Tables**: Beautiful tabular data display
- **CSS Styling**: Rich text formatting and colors
- **Performance Monitoring**: Built-in timing and measurement
- **Object Inspection**: Deep object analysis with options
- **Stack Tracing**: Complete call stack information
- **Custom Loggers**: Build sophisticated logging systems

This comprehensive implementation makes Bun an **excellent choice** for development, debugging, and production logging with the most powerful console API available in any JavaScript runtime.

---

**📊 System Status**: ✅ Complete Implementation | **🚀 Performance**: Optimized | **🎯 Features**: All Methods | **🌟 Quality**: Production Ready | **💡 Innovation**: Bun Enhancements | **🔧 Integration**: Seamless | **📊 Documentation**: Complete | **🎨 Formatting**: Rich | **🔄 Compatibility**: Full Web API | **📈 Performance**: High | **🎯 Ready**: Production | **✨ Ultimate**: Console API**

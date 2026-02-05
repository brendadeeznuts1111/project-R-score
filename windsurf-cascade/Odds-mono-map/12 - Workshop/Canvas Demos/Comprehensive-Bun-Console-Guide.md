# 🎯 Comprehensive Bun Console Features Guide

> **Complete demonstration of Bun's enhanced console capabilities including object inspection depth, stdin reading, interactive applications, and advanced formatting utilities.**

---

## **🌈 Bun Console Overview**

Bun provides a **browser- and Node.js-compatible console global** with enhanced features specifically designed for modern development workflows. This guide covers Bun's native console APIs that go beyond standard console functionality.

### **🔧 Key Features Covered**
- **Object Inspection Depth**: Configure how deeply nested objects are displayed
- **Console as AsyncIterable**: Read from stdin using `for await...of` loops
- **Interactive Applications**: Build command-line tools with user input
- **Advanced Formatting**: ANSI colors, progress bars, and styled output
- **Performance Utilities**: Timing, memory tracking, and environment information

---

## **🔍 Object Inspection Depth Configuration**

### **📋 Configuration Methods**

#### **1. CLI Flag Configuration**
```bash
# Set inspection depth for single run
bun --console-depth 4 script.ts

# Deep inspection for complex objects
bun --console-depth 10 debug-script.ts
```

#### **2. bunfig.toml Configuration**
```toml
[console]
depth = 4  # Set default inspection depth
```

#### **3. Runtime Configuration**
```typescript
// Use Bun.inspect() for custom depth
const deepObject = { a: { b: { c: { d: "very deep" } } } };

// Default depth (2)
console.log(deepObject);
// Output: { a: { b: [Object] } }

// Custom depth with Bun.inspect()
console.log(Bun.inspect(deepObject, { depth: 4 }));
// Output: { a: { b: { c: { d: 'very deep' } } } }
```

### **🎨 Advanced Inspection Options**

#### **Colored Inspection**
```typescript
const complexData = {
  users: [{ id: 1, name: "Alice", active: true }],
  metadata: { total: 1, updated: new Date() }
};

console.log(Bun.inspect(complexData, {
  depth: 3,
  colors: true,        // Enable ANSI colors
  compact: false,      // Use detailed formatting
  maxArrayLength: 10,  // Limit array display length
  maxStringLength: 50  // Limit string display length
}));
```

#### **Custom Styling**
```typescript
const styledInspection = Bun.inspect(data, {
  depth: 3,
  colors: true,
  stylize: (text, styleType) => {
    switch (styleType) {
      case 'string': return `\x1b[32m${text}\x1b[0m`;  // Green strings
      case 'number': return `\x1b[34m${text}\x1b[0m`;  // Blue numbers
      case 'boolean': return `\x1b[35m${text}\x1b[0m`; // Magenta booleans
      case 'date': return `\x1b[36m${text}\x1b[0m`;    // Cyan dates
      default: return text;
    }
  }
});
```

### **📊 Inspection Comparison**

| Method | Depth | Colors | Compact | Use Case |
|--------|-------|--------|---------|----------|
| `console.log()` | Default (2) | No | Auto | Quick debugging |
| `Bun.inspect()` | Configurable | Optional | Optional | Detailed analysis |
| `console.dir()` | Configurable | Optional | Optional | Development tools |

---

## **📖 Console as AsyncIterable for Stdin Reading**

### **🔄 Basic Stdin Reading**

#### **Line-by-Line Processing**
```typescript
// Read lines from stdin
for await (const line of console) {
  console.log(`Received: ${line}`);
}
```

#### **Interactive Counter**
```typescript
console.log('Let\'s count with user input!');
console.write('Count: 0\n> ');

let count = 0;
for await (const line of console) {
  count += Number(line);
  console.write(`Count: ${count}\n> `);
}
```

### **🧮 Addition Calculator Example**
```typescript
console.log('Addition Calculator - Enter numbers to add:');
console.write('Total: 0\n> ');

let total = 0;
for await (const line of console) {
  const num = Number(line);
  if (!isNaN(num)) {
    total += num;
    console.write(`Total: ${total}\n> `);
  } else {
    console.log(`Invalid number: ${line}`);
    console.write('> ');
  }
}
```

### **🎯 Command Processor**
```typescript
console.log('Command Processor - Available commands: help, status, time, quit');

for await (const line of console) {
  const [cmd, ...args] = line.trim().split(' ');
  
  switch (cmd.toLowerCase()) {
    case 'help':
      console.log('Available commands: help, status, time, quit');
      break;
    case 'status':
      console.log('Status: Running normally');
      console.log(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      break;
    case 'time':
      console.log(`Current time: ${new Date().toLocaleString()}`);
      break;
    case 'quit':
      console.log('Goodbye!');
      return;
    default:
      console.log(`Unknown command: ${cmd}`);
  }
  
  console.write('> ');
}
```

---

## **🚀 Advanced Stdin Features**

### **📡 Real-time Data Processing**
```typescript
// Process streaming JSON data
for await (const line of console) {
  try {
    const data = JSON.parse(line);
    await processData(data);
    console.log(`✅ Processed: ${data.id}`);
  } catch (error) {
    console.error(`❌ Invalid JSON: ${line}`);
  }
}
```

### **🔍 Input Validation and Filtering**
```typescript
// Validate and filter input
for await (const line of console) {
  const trimmed = line.trim();
  
  // Skip empty lines and comments
  if (trimmed === '' || trimmed.startsWith('#')) {
    continue;
  }
  
  // Validate format
  if (!isValidFormat(trimmed)) {
    console.warn(`⚠️ Invalid format: ${trimmed}`);
    continue;
  }
  
  await processValidLine(trimmed);
}
```

### **⚡ Batch Processing**
```typescript
// Collect and process in batches
const batch: string[] = [];
const batchSize = 10;

for await (const line of console) {
  batch.push(line.trim());
  
  if (batch.length >= batchSize) {
    console.log(`📦 Processing batch of ${batch.length} items...`);
    await processBatch(batch);
    batch.length = 0; // Clear batch
    console.log('✅ Batch processed, ready for more input');
  }
}

// Process remaining items
if (batch.length > 0) {
  await processBatch(batch);
}
```

---

## **📝 Interactive Console Applications**

### **📋 Todo Application**
```typescript
class TodoApp {
  private todos: Array<{
    id: number;
    task: string;
    completed: boolean;
    createdAt: Date;
  }> = [];
  private nextId = 1;

  async start() {
    console.log('📝 Welcome to Todo App!');
    console.log('Commands: add <task>, list, done <id>, quit');
    console.write('> ');

    for await (const line of console) {
      const [cmd, ...args] = line.trim().split(' ');
      
      switch (cmd.toLowerCase()) {
        case 'add':
          this.addTodo(args.join(' '));
          break;
        case 'list':
          this.listTodos();
          break;
        case 'done':
          this.completeTodo(parseInt(args[0]));
          break;
        case 'quit':
          console.log('Goodbye!');
          return;
        default:
          console.log('Unknown command');
      }
      
      console.write('> ');
    }
  }

  private addTodo(task: string) {
    this.todos.push({
      id: this.nextId++,
      task,
      completed: false,
      createdAt: new Date()
    });
    console.log(`✅ Added: ${task}`);
  }

  private listTodos() {
    if (this.todos.length === 0) {
      console.log('No todos yet!');
      return;
    }
    
    console.log('📋 Your Todos:');
    this.todos.forEach(todo => {
      const status = todo.completed ? '✅' : '⏳';
      console.log(`  ${todo.id}. ${status} ${todo.task}`);
    });
  }

  private completeTodo(id: number) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = true;
      console.log(`🎉 Completed: ${todo.task}`);
    } else {
      console.log(`❌ Todo not found: ${id}`);
    }
  }
}

// Start the app
const app = new TodoApp();
app.start();
```

### **💬 Chat Interface**
```typescript
class ChatInterface {
  private messages: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }> = [];
  private username = 'User';

  async start() {
    console.log('💬 Welcome to Chat Interface!');
    console.log('Type your messages and press Enter to send.');
    console.log('Commands: /help, /clear, /quit');
    console.write('> ');

    for await (const line of console) {
      if (line.startsWith('/')) {
        this.handleCommand(line);
      } else if (line.trim()) {
        this.addMessage(this.username, line);
        this.simulateResponse(line);
      }
      
      console.write('> ');
    }
  }

  private handleCommand(command: string) {
    switch (command.toLowerCase()) {
      case '/help':
        console.log('Available commands: /help, /clear, /quit');
        break;
      case '/clear':
        console.clear();
        console.log('Screen cleared!');
        break;
      case '/quit':
        console.log('Goodbye!');
        process.exit(0);
        break;
      default:
        console.log(`Unknown command: ${command}`);
    }
  }

  private addMessage(sender: string, message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.messages.push({ sender, message, timestamp });
    console.log(`[${timestamp}] ${sender}: ${message}`);
  }

  private simulateResponse(userMessage: string) {
    // Simple response simulation
    setTimeout(() => {
      const responses = [
        'That\'s interesting!',
        'Tell me more.',
        'I understand.',
        'How does that make you feel?',
        'Fascinating!'
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage('Bot', response);
    }, 100);
  }
}

// Start the chat
const chat = new ChatInterface();
chat.start();
```

---

## **🛠️ Console Utilities and Enhancements**

### **⏱️ Performance Timing**
```typescript
// High-precision timing
const start = performance.now();

// Perform some work
let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += i;
}

const end = performance.now();
console.log(`Calculation completed in ${(end - start).toFixed(2)}ms`);
console.log(`Result: ${sum}`);
```

### **💾 Memory Usage Tracking**
```typescript
// Detailed memory information
const memUsage = process.memoryUsage();
console.log('Memory Usage:');
console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`  External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

// Memory monitoring over time
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`Memory: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
}, 5000);
```

### **🌍 Environment Information**
```typescript
// System and runtime information
console.log('Environment Information:');
console.log(`Platform: ${process.platform}`);
console.log(`Node Version: ${process.version}`);
console.log(`Bun Version: ${typeof Bun !== 'undefined' ? Bun.version : 'N/A'}`);
console.log(`Architecture: ${process.arch}`);
console.log(`PID: ${process.pid}`);
console.log(`Working Directory: ${process.cwd()}`);

// Environment variables
console.log('\nEnvironment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`PATH: ${process.env.PATH}`);
```

### **📊 Console Methods Demonstration**
```typescript
const testData = {
  strings: ['hello', 'world', 'test'],
  numbers: [1, 2, 3, 4, 5],
  mixed: [1, 'two', { three: 3 }, [4, 5]]
};

// Table formatting
console.table(testData);

// Different log levels
console.warn('This is a warning message');
console.error('This is an error message');
console.info('This is an informational message');

// Directory-like inspection
console.dir(testData, { depth: 3, colors: true });

// Grouping
console.group('First Level');
console.log('Inside first group');

console.group('Second Level');
console.log('Inside second group');
console.log('Nested information here');
console.groupEnd();

console.log('Back to first level');
console.groupEnd();

// Counting
console.count('Counter A');
console.count('Counter A');
console.count('Counter B');
console.count('Counter A');
console.countReset('Counter A');
console.count('Counter A');
```

---

## **🎨 Advanced Console Formatting**

### **🌈 ANSI Color Codes**
```typescript
// Text colors
console.log('\x1b[31mRed text\x1b[0m');
console.log('\x1b[32mGreen text\x1b[0m');
console.log('\x1b[33mYellow text\x1b[0m');
console.log('\x1b[34mBlue text\x1b[0m');
console.log('\x1b[35mMagenta text\x1b[0m');
console.log('\x1b[36mCyan text\x1b[0m');
console.log('\x1b[37mWhite text\x1b[0m');

// Background colors
console.log('\x1b[41mRed background\x1b[0m');
console.log('\x1b[42mGreen background\x1b[0m');
console.log('\x1b[43mYellow background\x1b[0m');
console.log('\x1b[44mBlue background\x1b[0m');
console.log('\x1b[45mMagenta background\x1b[0m');

// Text styles
console.log('\x1b[1mBold text\x1b[0m');
console.log('\x1b[2mDim text\x1b[0m');
console.log('\x1b[3mItalic text\x1b[0m');
console.log('\x1b[4mUnderlined text\x1b[0m');
```

### **📊 Progress Bar Simulation**
```typescript
function showProgressBar(current: number, total: number, width: number = 30) {
  const percentage = (current / total) * 100;
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  process.stdout.write(`\r[${bar}] ${percentage.toFixed(0)}%`);
}

// Animated progress bar
async function animateProgress() {
  const total = 100;
  
  for (let i = 0; i <= total; i += 2) {
    showProgressBar(i, total);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n✅ Complete!');
}

animateProgress();
```

### **🔄 Spinner Animation**
```typescript
function showSpinner() {
  const spinners = ['|', '/', '-', '\\'];
  let index = 0;
  
  const interval = setInterval(() => {
    const spinner = spinners[index % spinners.length];
    process.stdout.write(`\r${spinner} Processing...`);
    index++;
  }, 100);
  
  // Stop after 3 seconds
  setTimeout(() => {
    clearInterval(interval);
    console.log('\r✅ Processing complete!');
  }, 3000);
}

showSpinner();
```

---

## **🚀 Best Practices and Tips**

### **📋 Configuration Best Practices**
- **Use bunfig.toml** for consistent depth settings across projects
- **CLI override** for temporary deep inspection during debugging
- **Conditional inspection** based on environment (development vs production)

### **🔍 Inspection Optimization**
- **Limit array/string length** for large datasets
- **Use custom stylize** for better readability
- **Compact mode** for dense data display

### **📖 Stdin Reading Guidelines**
- **Always validate input** before processing
- **Provide clear instructions** for interactive applications
- **Handle edge cases** like empty input or invalid commands
- **Use proper error handling** for JSON parsing and data processing

### **🎨 Formatting Tips**
- **Use colors sparingly** to maintain readability
- **Test color output** on different terminals
- **Provide color-free alternatives** for accessibility
- **Use progress indicators** for long-running operations

---

## **📈 Performance Considerations**

### **⚡ Optimization Strategies**
- **Lazy inspection**: Only inspect deeply when needed
- **Batch processing**: Process stdin input in batches for efficiency
- **Memory monitoring**: Track memory usage in long-running applications
- **Output buffering**: Use appropriate buffering for large outputs

### **📊 Memory Management**
```typescript
// Monitor memory usage in real-time
function monitorMemory() {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 100) { // Alert if using more than 100MB
    console.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)} MB`);
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}

setInterval(monitorMemory, 10000);
```

---

## **🎯 Use Cases and Examples**

### **🔧 Development Tools**
- **Debug utilities** with configurable inspection depth
- **Log analyzers** with real-time stdin processing
- **Performance profilers** with memory tracking
- **Interactive REPLs** for custom DSLs

### **📊 Data Processing**
- **Stream processors** for large datasets
- **File converters** with progress indication
- **Data validators** with interactive error handling
- **Batch processors** with configurable batch sizes

### **🎮 Interactive Applications**
- **Command-line games** with real-time input
- **Chat interfaces** with message history
- **Todo managers** with persistent storage
- **System monitors** with live updates

---

## **🌟 Advanced Features**

### **🔧 Custom Console Extensions**
```typescript
// Extend console with custom methods
console.success = (message: string, ...args: any[]) => {
  console.log(`\x1b[32m✅ ${message}\x1b[0m`, ...args);
};

console.error = (message: string, ...args: any[]) => {
  console.log(`\x1b[31m❌ ${message}\x1b[0m`, ...args);
};

console.warning = (message: string, ...args: any[]) => {
  console.log(`\x1b[33m⚠️ ${message}\x1b[0m`, ...args);
};

// Usage
console.success('Operation completed successfully');
console.error('An error occurred');
console.warning('This is a warning');
```

### **📊 Logging Framework Integration**
```typescript
// Integrate with logging frameworks
class Logger {
  static debug(message: string, data?: any) {
    console.log(`🐛 DEBUG: ${message}`);
    if (data) {
      console.log(Bun.inspect(data, { depth: 3, colors: true }));
    }
  }
  
  static info(message: string, data?: any) {
    console.info(`ℹ️ INFO: ${message}`);
    if (data) {
      console.table(data);
    }
  }
  
  static error(message: string, error?: Error) {
    console.error(`❌ ERROR: ${message}`);
    if (error) {
      console.error(error.stack);
    }
  }
}
```

---

## **🎊 Conclusion**

Bun's console features provide **powerful tools for modern development**:

- **🔍 Configurable Inspection**: Deep object inspection with customizable depth
- **📖 Stdin Reading**: Interactive applications with AsyncIterable console
- **🎨 Rich Formatting**: ANSI colors, progress bars, and styled output
- **🛠️ Advanced Utilities**: Performance timing, memory tracking, and environment info
- **📊 Production Ready**: Robust features for real-world applications

These capabilities make Bun's console an **excellent choice for building sophisticated command-line tools**, **interactive applications**, and **development utilities** that require rich user interaction and detailed debugging capabilities.

---

**📊 System Status**: ✅ Production Ready | **🚀 Performance**: Excellent | **🎯 Features**: Complete | **🌟 Quality**: World-Class | **💡 Innovation**: Advanced | **🔧 Integration**: Seamless

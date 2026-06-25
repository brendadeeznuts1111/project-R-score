# Bun FileSink API Examples

This directory contains comprehensive examples demonstrating Bun's incremental file writing API using the `FileSink` class. These examples cover everything from basic usage to real-world applications.

## 📁 Files Overview

### Core Examples
- **`filesink-core-examples.ts`** - Essential FileSink functionality and basic usage patterns
- **`incremental-writing-examples.ts`** - Comprehensive examples with performance comparisons
- **`filesink-practical-examples.ts`** - Real-world use cases and applications

## 🚀 Quick Start

### Basic Usage
```typescript
const file = Bun.file("output.txt");
const writer = file.writer();

writer.write("Hello");
writer.write(" ");
writer.write("World!");
writer.flush(); // Write to disk
writer.end();   // Close file
```

### Custom Buffer Size
```typescript
const writer = Bun.file("large-file.txt").writer({
  highWaterMark: 1024 * 1024 // 1MB buffer
});
```

### Different Data Types
```typescript
writer.write("String data");
writer.write(Buffer.from("Buffer data"));
writer.write(new Uint8Array([0x48, 0x49, 0x4A]));
```

## 📚 Example Categories

### 1. Core Concepts (`filesink-core-examples.ts`)

- **Basic FileSink Usage** - Simple write, flush, end operations
- **Data Types** - Writing strings, Buffers, and Uint8Arrays
- **Buffer Management** - Custom highWaterMark configuration
- **Flushing Behavior** - Manual vs automatic flushing
- **Error Handling** - Proper resource cleanup
- **Real-time Logging** - Stream-like writing with delays

### 2. Comprehensive Examples (`incremental-writing-examples.ts`)

- **Large File Writing** - Handling massive datasets efficiently
- **Stream Processing** - Simulating real-time data streams
- **Performance Comparison** - FileSink vs traditional writeFile
- **Resource Management** - Advanced error handling patterns
- **Memory Management** - Optimizing buffer usage

### 3. Practical Applications (`filesink-practical-examples.ts`)

- **Application Logging** - Production-ready logging system
- **CSV Data Export** - Large dataset export with progress tracking
- **JSON Streaming** - Memory-efficient JSON generation
- **Backup & Archive** - File backup and archiving system
- **Real-time Data Collection** - Sensor data simulation

## 🏃‍♂️ Running Examples

### Individual Examples
```bash
# Core examples
bun run examples/bun-file-io/filesink-core-examples.ts

# Comprehensive examples
bun run examples/bun-file-io/incremental-writing-examples.ts

# Practical examples
bun run examples/bun-file-io/filesink-practical-examples.ts
```

### Programmatic Usage
```typescript
import { basicFileSinkUsage, Logger } from './filesink-core-examples';

// Run specific examples
await basicFileSinkUsage();

// Use the Logger class
const logger = new Logger('./app.log');
logger.info('Application started');
logger.close();
```

## 🔧 Key Features Demonstrated

### Buffer Management
- **Automatic Flushing** - When buffer reaches highWaterMark
- **Manual Flushing** - Explicit `writer.flush()` calls
- **Custom Buffer Sizes** - Optimize for your use case

### Data Types Support
- **Strings** - Text data and UTF-8 encoding
- **Buffers** - Node.js Buffer objects
- **Uint8Arrays** - Binary data arrays
- **Mixed Data** - Combining different types

### Error Handling
- **Try-catch Blocks** - Proper error catching
- **Resource Cleanup** - Ensuring `writer.end()` is called
- **Graceful Degradation** - Handling write failures

### Performance Optimization
- **Large File Handling** - Efficient memory usage
- **Streaming Patterns** - Real-time data processing
- **Batch Writing** - Optimized write operations

## 📊 Performance Insights

### FileSink vs Traditional Methods
- **Memory Efficiency** - Constant memory usage regardless of file size
- **Speed** - Faster for large files due to buffering
- **Flexibility** - Write incrementally over time

### Buffer Size Recommendations
- **Small Files** (< 1MB): 4KB - 16KB buffer
- **Medium Files** (1MB - 100MB): 64KB - 256KB buffer
- **Large Files** (> 100MB): 1MB - 4MB buffer
- **Real-time Data**: 32KB - 128KB buffer

## 🎯 Best Practices

### 1. Always End the Writer
```typescript
try {
  writer.write(data);
  writer.flush();
} finally {
  writer.end(); // Always close!
}
```

### 2. Handle Errors Gracefully
```typescript
try {
  writer.write(data);
} catch (error) {
  console.error('Write failed:', error);
} finally {
  writer.end();
}
```

### 3. Choose Appropriate Buffer Sizes
```typescript
// For real-time logging
const writer = file.writer({ highWaterMark: 64 * 1024 });

// For large file exports
const writer = file.writer({ highWaterMark: 1024 * 1024 });
```

### 4. Flush Strategically
```typescript
// Flush critical data immediately
writer.write(criticalLogData);
writer.flush();

// Let buffer handle routine data
writer.write(routineData);
// Auto-flush when buffer is full
```

## 🔍 Common Use Cases

### Application Logs
- Structured logging with JSON format
- Real-time log streaming
- Log rotation and archiving

### Data Export
- CSV/JSON file generation
- Large dataset processing
- Progress tracking and reporting

### Backup Systems
- File backup and archiving
- Incremental backups
- Compression integration

### Streaming Data
- Real-time sensor data
- Event streaming
- Network data capture

## 🚨 Important Notes

1. **Always call `writer.end()`** to properly close files
2. **Handle errors** to prevent resource leaks
3. **Choose appropriate buffer sizes** for your use case
4. **Flush critical data** immediately if needed
5. **Use try-finally blocks** for guaranteed cleanup

## 📖 Additional Resources

- [Bun File I/O Documentation](https://bun.sh/docs/runtime/file-io)
- [FileSink API Reference](https://bun.sh/docs/runtime/file-io#incremental-writing-with-filesink)
- [Bun Performance Guide](https://bun.sh/docs/runtime/performance)

## 🤝 Contributing

Feel free to add more examples or improve existing ones! Key areas for contribution:

- More real-world use cases
- Performance benchmarks
- Error handling patterns
- Integration examples with other Bun APIs

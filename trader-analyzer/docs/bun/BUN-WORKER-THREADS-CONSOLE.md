# Bun Worker Threads & Console Features

## Overview

This document covers Bun's advanced worker thread APIs and console features for parallel processing and interactive CLI applications.

## Worker Threads

### Environment Data Sharing

Share data between the main thread and workers using `setEnvironmentData()` and `getEnvironmentData()`:

```typescript
import { setEnvironmentData, getEnvironmentData } from "worker_threads";

// In main thread
setEnvironmentData("config", { 
  apiUrl: "https://api.example.com",
  timeout: 5000,
  maxRetries: 3,
});

// In worker
const config = getEnvironmentData("config");
console.log(config); // => { apiUrl: "https://api.example.com", ... }
```

**Benefits**:
- Share configuration without serialization overhead
- Access shared data synchronously in workers
- No need to pass data via `postMessage()`

### Worker Creation Events

Listen for worker creation events using `process.on("worker")`:

```typescript
process.on("worker", (worker) => {
  console.log("New worker created:", worker.threadId);
});
```

**Use Cases**:
- Monitoring worker lifecycle
- Tracking worker creation for debugging
- Resource management

### Thread Detection

Check if you're in the main thread using `Bun.isMainThread`:

```typescript
if (Bun.isMainThread) {
  console.log("I'm the main thread");
  // Create workers, set environment data, etc.
} else {
  console.log("I'm in a worker thread");
  // Access environment data, process tasks, etc.
}
```

### Example: Parallel File Processing

```typescript
import { setEnvironmentData } from "worker_threads";
import { Worker } from "worker_threads";

if (Bun.isMainThread) {
  // Set shared configuration
  setEnvironmentData("config", {
    apiUrl: "https://api.example.com",
    timeout: 5000,
  });
  
  // Listen for worker creation
  process.on("worker", (worker) => {
    console.log(`Worker ${worker.threadId} created`);
  });
  
  // Create workers for parallel processing
  const worker = new Worker("./worker.ts");
  worker.postMessage({ files: ["file1.ts", "file2.ts"] });
}
```

**Worker Script** (`worker.ts`):
```typescript
import { getEnvironmentData } from "worker_threads";

if (!Bun.isMainThread) {
  // Get shared configuration
  const config = getEnvironmentData("config");
  
  self.onmessage = (event) => {
    const { files } = event.data;
    // Process files using shared config
    const results = files.map(file => processFile(file, config));
    self.postMessage({ results });
  };
}
```

## Console Features

### Console Depth Configuration

Control how deeply nested objects are displayed in `console.log()` output:

**Configuration File** (`bunfig.toml`):
```toml
[console]
depth = 5
```

**CLI Flag** (if available in your Bun version):
```bash
bun --console-depth 4 run script.ts
```

**Default**: Objects are inspected to a depth of `2` levels

**Note**: The `--console-depth` CLI flag may not be available in all Bun versions. The `bunfig.toml` configuration is the recommended approach.

**Example**:
```typescript
const nested = { 
  a: { 
    b: { 
      c: { 
        d: "deep" 
      } 
    } 
  } 
};

console.log(nested);
// Default (depth 2): { a: { b: [Object] } }
// With depth 4: { a: { b: { c: { d: 'deep' } } } }
```

### Reading from Stdin (AsyncIterable)

Use `console` as an `AsyncIterable` to sequentially read lines from `process.stdin`:

```typescript
// Basic example
for await (const line of console) {
  console.log(line);
}
```

**Interactive Calculator Example**:
```typescript
console.log(`Let's add some numbers!`);
console.write(`Count: 0\n> `);

let count = 0;
for await (const line of console) {
  count += Number(line);
  console.write(`Count: ${count}\n> `);
}
```

**Use Cases**:
- Interactive CLI applications
- Command-line tools with user input
- REPL-like interfaces
- File pattern scanners

## Demo Scripts

### Worker Threads Demo

```bash
bun run scripts/demo-worker-threads.ts
```

**Features Demonstrated**:
- `setEnvironmentData()` / `getEnvironmentData()` for sharing config
- `Bun.isMainThread` for thread detection
- `process.on("worker")` for worker creation events
- Parallel file processing with workers

### Console Features Demo

```bash
# Console depth demonstration
bun run scripts/demo-console-features.ts depth

# Interactive calculator
bun run scripts/demo-console-features.ts calc

# Interactive tag scanner
bun run scripts/demo-console-features.ts scan

# Run all demos
bun run scripts/demo-console-features.ts all

# With custom console depth
bun --console-depth 4 run scripts/demo-console-features.ts depth
```

**Features Demonstrated**:
- Console depth configuration
- Reading from stdin using console as AsyncIterable
- Interactive console input
- File pattern scanning

## Integration with Tag Manager Pro

Tag Manager Pro supports console depth configuration:

```bash
# Use custom console depth
bun --console-depth 4 run scripts/tag-manager-pro.ts config

# Check console configuration
bun run scripts/tag-manager-pro.ts config
```

The `config` command shows:
- Current console depth settings
- How to configure via CLI flag or `bunfig.toml`

## Best Practices

### Worker Threads

1. **Share Configuration**: Use `setEnvironmentData()` for shared config instead of passing via `postMessage()`
2. **Thread Detection**: Always check `Bun.isMainThread` before accessing worker-specific APIs
3. **Worker Lifecycle**: Use `process.on("worker")` to monitor worker creation
4. **Resource Cleanup**: Always call `worker.terminate()` when done

### Console Features

1. **Depth Configuration**: Set appropriate depth in `bunfig.toml` for your project
2. **CLI Override**: Use `--console-depth` flag for one-off debugging
3. **Interactive Input**: Use `for await (const line of console)` for CLI tools
4. **Error Handling**: Always handle invalid input in interactive loops

## Configuration

### bunfig.toml

```toml
[console]
depth = 5  # Set default console depth
```

**Priority**:
1. CLI flag (`--console-depth`) - highest priority
2. `bunfig.toml` configuration
3. Default (depth 2)

## See Also

- [Bun Worker Threads Documentation](https://bun.com/docs/runtime/workers)
- [Bun Console Documentation](https://bun.com/docs/runtime/console)
- [Tag Manager Pro Documentation](./TAG-MANAGER-PRO.md)
- [Tag Manager Table Formatting](./TAG-MANAGER-TABLE-FORMATTING.md)

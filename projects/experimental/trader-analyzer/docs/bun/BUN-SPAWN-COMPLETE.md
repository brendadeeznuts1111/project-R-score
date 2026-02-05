# Bun.spawn() Complete API Reference

## Overview

`Bun.spawn()` is Bun's native API for spawning child processes. It provides a powerful, flexible interface for executing external commands with full control over input/output, process lifecycle, and resource monitoring.

**Documentation:** [Bun.spawn() API](https://bun.sh/docs/api/spawn)

## Quick Start

### Basic Usage

```typescript
// Command array API
const proc = Bun.spawn(["echo", "Hello, World!"]);
await proc.exited;

// Options object API
const proc = Bun.spawn({
  cmd: ["echo", "Hello, World!"],
  stdout: "pipe",
});
const output = await new Response(proc.stdout).text();
```

### User's Example Pattern

```typescript
const proc = Bun.spawn(["cat"], {
  stdin: await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/examples/hashing.js"),
});
const text = await proc.stdout.text();
```

## API Overloads

### Overload 1: Command Array

```typescript
Bun.spawn(command: string[], options?: SpawnOptions): Subprocess
```

**Example:**
```typescript
const proc = Bun.spawn(["git", "status"]);
```

### Overload 2: Options Object

```typescript
Bun.spawn(options: SpawnOptions): Subprocess
```

**Example:**
```typescript
const proc = Bun.spawn({
  cmd: ["git", "status"],
  stdout: "pipe",
});
```

## SpawnOptions Interface

### Required Fields

- **`cmd`** (when using options object): `string[]` - Command and arguments

### Optional Fields

#### Input/Output

- **`stdin`**: `Writable | "pipe" | "inherit" | "ignore"` - Standard input source
- **`stdout`**: `Readable | "pipe" | "inherit" | "ignore"` - Standard output destination
- **`stderr`**: `Readable | "pipe" | "inherit" | "ignore"` - Standard error destination

#### Process Control

- **`cwd`**: `string` - Working directory
- **`env`**: `Record<string, string | undefined>` - Environment variables
- **`timeout`**: `number` - Timeout in milliseconds
- **`signal`**: `AbortSignal` - Abort signal for cancellation
- **`onExit`**: `(subprocess, exitCode, signal, error) => void` - Exit callback

#### Advanced

- **`ipc`**: `boolean` - Enable IPC communication
- **`detached`**: `boolean` - Detach process from parent
- **`killSignal`**: `string | number` - Default kill signal

## Stdin Types (Writable)

### 1. Response

```typescript
const proc = Bun.spawn(["cat"], {
  stdin: await fetch("https://example.com/data.txt"),
});
```

### 2. Request

```typescript
const request = new Request("https://api.example.com/data", {
  method: "POST",
  body: JSON.stringify({ data: "test" }),
});
const proc = Bun.spawn(["cat"], {
  stdin: request,
});
```

### 3. Blob

```typescript
const blob = new Blob(["Hello\nWorld\n"], { type: "text/plain" });
const proc = Bun.spawn(["cat"], {
  stdin: blob,
});
```

### 4. BunFile

```typescript
const file = Bun.file("input.txt");
const proc = Bun.spawn(["cat"], {
  stdin: file,
});
```

### 5. ArrayBufferView (Uint8Array, etc.)

```typescript
const data = new TextEncoder().encode("Hello, World!\n");
const proc = Bun.spawn(["cat"], {
  stdin: data,
});
```

### 6. ReadableStream

```typescript
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("Line 1\n"));
    controller.enqueue(new TextEncoder().encode("Line 2\n"));
    controller.close();
  },
});
const proc = Bun.spawn(["cat"], {
  stdin: stream,
});
```

### 7. "pipe" (Manual Write)

```typescript
const proc = Bun.spawn(["cat"], {
  stdin: "pipe",
  stdout: "pipe",
});

proc.stdin.write("Line 1\n");
proc.stdin.write("Line 2\n");
proc.stdin.end();

const output = await new Response(proc.stdout).text();
```

## Stdout/Stderr Types (Readable)

### 1. "pipe" (Default)

```typescript
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: "pipe",
});
const output = await new Response(proc.stdout).text();
```

### 2. "inherit"

```typescript
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: "inherit", // Output goes directly to parent's stdout
});
```

### 3. "ignore"

```typescript
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: "ignore", // Output is discarded
});
```

### 4. BunFile

```typescript
const outputFile = Bun.file("output.txt");
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: outputFile,
});
```

### 5. ArrayBufferView (Uint8Array)

```typescript
const buffer = new Uint8Array(1024);
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: buffer,
});
// Read from buffer after process exits
```

### 6. File Descriptor Number

```typescript
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: 1, // stdout file descriptor
});
```

## Subprocess Interface

### Properties

- **`stdin`**: `WritableStream` | `null` - Process stdin (when `stdin: "pipe"`)
- **`stdout`**: `ReadableStream` | `null` - Process stdout (when `stdout: "pipe"`)
- **`stderr`**: `ReadableStream` | `null` - Process stderr (when `stderr: "pipe"`)
- **`pid`**: `number` - Process ID
- **exitCode**: `Promise<number | null>` - Exit code promise

### Methods

#### `kill(signal?: string | number): void`

Kill the process with optional signal.

```typescript
const proc = Bun.spawn(["sleep", "10"]);
setTimeout(() => {
  proc.kill(); // SIGTERM (default)
  // or
  proc.kill("SIGKILL"); // Force kill
}, 1000);
```

**Signals:**
- `"SIGTERM"` (default) - Graceful termination
- `"SIGKILL"` - Force kill
- `"SIGINT"` - Interrupt
- `"SIGHUP"` - Hangup
- Or numeric signal: `9` (SIGKILL), `15` (SIGTERM)

#### `ref(): void`

Keep process alive (prevents event loop from exiting).

```typescript
const proc = Bun.spawn(["long-running-process"]);
proc.ref(); // Process keeps event loop alive
```

#### `unref(): void`

Allow event loop to exit even if process is running.

```typescript
const proc = Bun.spawn(["background-task"]);
proc.unref(); // Process won't prevent exit
```

#### `send(message: any): boolean`

Send IPC message to process (requires `ipc: true`).

```typescript
const proc = Bun.spawn(["node", "worker.js"], {
  ipc: true,
});
proc.send({ type: "start", data: "value" });
```

#### `disconnect(): void`

Close IPC channel.

```typescript
proc.disconnect();
```

#### `resourceUsage(): ResourceUsage`

Get resource usage statistics.

```typescript
const usage = proc.resourceUsage();
console.log("CPU time:", usage.userCPUTime + usage.systemCPUTime);
console.log("Memory:", usage.maxRSS);
```

## ResourceUsage Interface

```typescript
interface ResourceUsage {
  userCPUTime: number;      // User CPU time in nanoseconds
  systemCPUTime: number;    // System CPU time in nanoseconds
  maxRSS: number;           // Maximum resident set size (bytes)
  pageFaults: number;       // Page faults
  contextSwitches: number;  // Context switches
}
```

**Example:**
```typescript
const proc = Bun.spawn(["complex-task"]);
await proc.exited;

const usage = proc.resourceUsage();
console.log({
  cpuTime: (usage.userCPUTime + usage.systemCPUTime) / 1_000_000, // Convert to ms
  memoryMB: usage.maxRSS / 1024 / 1024,
  pageFaults: usage.pageFaults,
});
```

## Timeout and AbortSignal

### Timeout Option

```typescript
const proc = Bun.spawn(["slow-command"], {
  timeout: 5000, // 5 seconds
});

try {
  await proc.exited;
} catch (error) {
  // Process timed out
  console.error("Timeout:", error);
}
```

### AbortSignal

```typescript
const controller = new AbortController();
const proc = Bun.spawn(["long-task"], {
  signal: controller.signal,
});

// Cancel after 2 seconds
setTimeout(() => {
  controller.abort();
}, 2000);

try {
  await proc.exited;
} catch (error) {
  // Process was aborted
  console.error("Aborted:", error);
}
```

## onExit Callback

```typescript
const proc = Bun.spawn(["command"], {
  onExit(subprocess, exitCode, signal, error) {
    console.log("Process exited:");
    console.log("  Exit code:", exitCode);
    console.log("  Signal:", signal);
    console.log("  Error:", error?.message);
    
    // Cleanup resources
    // Update state
    // Log metrics
  },
});
```

**Parameters:**
- `subprocess`: `Subprocess` - The subprocess instance
- `exitCode`: `number | null` - Exit code (null if killed by signal)
- `signal`: `number | null` - Signal number (null if normal exit)
- `error`: `Error | null` - Error if process failed

## Environment Variables

### Inherit from Parent

```typescript
const proc = Bun.spawn(["command"], {
  env: { ...process.env }, // Copy parent's environment
});
```

### Custom Environment

```typescript
const proc = Bun.spawn(["command"], {
  env: {
    NODE_ENV: "production",
    CUSTOM_VAR: "value",
    // Note: undefined values remove variables
    REMOVE_VAR: undefined,
  },
});
```

### Merge with Parent

```typescript
const proc = Bun.spawn(["command"], {
  env: {
    ...process.env,
    CUSTOM_VAR: "override",
  },
});
```

## Working Directory

```typescript
const proc = Bun.spawn(["pwd"], {
  cwd: "/tmp", // Change working directory
  stdout: "pipe",
});

const output = await new Response(proc.stdout).text();
console.log(output.trim()); // "/tmp"
```

## Bun.spawnSync() - Synchronous Operations

For synchronous process execution, use `Bun.spawnSync()`.

### Basic Usage

```typescript
const result = Bun.spawnSync(["echo", "Hello"], {
  stdout: "pipe",
});

console.log(result.stdout.toString()); // "Hello\n"
console.log(result.exitCode); // 0
console.log(result.success); // true
```

### SpawnSyncResult Interface

```typescript
interface SpawnSyncResult {
  stdout: Buffer;        // Standard output
  stderr?: Buffer;       // Standard error (if stderr: "pipe")
  exitCode: number;      // Exit code
  success: boolean;      // true if exitCode === 0
  signal: number | null; // Signal number if killed
}
```

### Error Handling

```typescript
const result = Bun.spawnSync(["sh", "-c", "exit 42"], {
  stdout: "pipe",
  stderr: "pipe",
});

if (!result.success) {
  console.error("Command failed:");
  console.error("Exit code:", result.exitCode);
  console.error("Stderr:", result.stderr?.toString());
}
```

### With Environment

```typescript
const result = Bun.spawnSync(["sh", "-c", "echo $VAR"], {
  stdout: "pipe",
  env: {
    VAR: "test-value",
  },
});

console.log(result.stdout.toString().trim()); // "test-value"
```

## IPC Communication

### Enable IPC

```typescript
const proc = Bun.spawn(["node", "worker.js"], {
  ipc: true,
});

// Send message
proc.send({ type: "start", data: "value" });

// Receive messages (if supported by child process)
// Note: IPC message handling depends on child process implementation
```

### Node.js-Compatible IPC

```typescript
// worker.js
process.on("message", (msg) => {
  console.log("Received:", msg);
  process.send({ response: "pong" });
});

// parent.js
const proc = Bun.spawn(["node", "worker.js"], {
  ipc: true,
});

proc.send("ping");
```

## Best Practices

### 1. Always Await Process Exit

```typescript
// ✅ Good
const proc = Bun.spawn(["command"]);
await proc.exited;

// ❌ Bad - Process may not complete
const proc = Bun.spawn(["command"]);
// Script exits before process completes
```

### 2. Handle Errors

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, code, signal, error) {
    if (error) {
      console.error("Process error:", error);
    }
    if (code !== 0) {
      console.error("Non-zero exit:", code);
    }
  },
});
```

### 3. Use Timeout for Long-Running Processes

```typescript
const proc = Bun.spawn(["slow-command"], {
  timeout: 30000, // 30 seconds
});

try {
  await proc.exited;
} catch (error) {
  // Handle timeout
  proc.kill(); // Ensure cleanup
}
```

### 4. Clean Up Resources

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
});

try {
  const output = await new Response(proc.stdout).text();
  // Use output
} finally {
  // Ensure process is cleaned up
  if (proc.exitCode === null) {
    proc.kill();
  }
}
```

### 5. Monitor Resource Usage

```typescript
const proc = Bun.spawn(["resource-intensive-task"]);
await proc.exited;

const usage = proc.resourceUsage();
if (usage.maxRSS > 100 * 1024 * 1024) { // 100MB
  console.warn("High memory usage detected");
}
```

### 6. Use spawnSync for Simple Operations

```typescript
// ✅ Good for simple, synchronous operations
const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
  stdout: "pipe",
});
const hash = result.stdout.toString().trim();

// ✅ Good for complex, async operations
const proc = Bun.spawn(["long-running-task"], {
  stdout: "pipe",
});
const output = await new Response(proc.stdout).text();
```

## Comparison with Bun Shell

| Feature | Bun.spawn() | Bun Shell (`$`) |
|---------|-------------|-----------------|
| **API Style** | Programmatic | Template literal |
| **Type Safety** | Full TypeScript | Limited |
| **Control** | Fine-grained | High-level |
| **IPC** | Supported | Not supported |
| **Resource Monitoring** | Yes (`resourceUsage()`) | No |
| **Process Management** | Full (kill, ref, unref) | Limited |
| **Use Case** | Complex process control | Simple command execution |

### When to Use Bun.spawn()

- Need fine-grained control over process lifecycle
- Require IPC communication
- Need resource usage monitoring
- Want to stream large data
- Need to handle timeouts and cancellation
- Building process management utilities

### When to Use Bun Shell (`$`)

- Simple command execution
- Shell-like syntax preferred
- Quick scripting tasks
- Don't need advanced features

**Example Comparison:**

```typescript
// Bun.spawn() - More control
const proc = Bun.spawn(["git", "log"], {
  stdout: "pipe",
  timeout: 5000,
  onExit(subprocess, code) {
    console.log("Git log completed:", code);
  },
});
const logs = await new Response(proc.stdout).text();

// Bun Shell - Simpler syntax
import { $ } from "bun";
const logs = await $`git log`.text();
```

## Common Patterns

### Pattern 1: Fetch and Process

```typescript
const proc = Bun.spawn(["jq", "."], {
  stdin: await fetch("https://api.example.com/data.json"),
  stdout: "pipe",
});
const formatted = await new Response(proc.stdout).text();
```

### Pattern 2: Stream Processing

```typescript
const proc = Bun.spawn(["grep", "error"], {
  stdin: Bun.file("logs.txt"),
  stdout: "pipe",
});

for await (const chunk of proc.stdout) {
  processChunk(chunk);
}
```

### Pattern 3: Background Process

```typescript
const proc = Bun.spawn(["long-task"], {
  stdout: "ignore",
  stderr: "ignore",
});
proc.unref(); // Don't block exit

// Process runs in background
```

### Pattern 4: Process Pipeline

```typescript
// Stage 1: Generate data
const gen = Bun.spawn(["generate-data"], {
  stdout: "pipe",
});

// Stage 2: Process data
const proc = Bun.spawn(["process-data"], {
  stdin: gen.stdout,
  stdout: "pipe",
});

const result = await new Response(proc.stdout).text();
```

### Pattern 5: Timeout with Fallback

```typescript
const proc = Bun.spawn(["slow-command"], {
  timeout: 5000,
});

try {
  await proc.exited;
} catch (error) {
  // Fallback to alternative command
  const fallback = Bun.spawn(["fast-alternative"], {
    stdout: "pipe",
  });
  const result = await new Response(fallback.stdout).text();
}
```

## Error Handling

### Process Errors

```typescript
const proc = Bun.spawn(["command"], {
  onExit(subprocess, code, signal, error) {
    if (error) {
      // Process failed to start or crashed
      console.error("Process error:", error);
    }
  },
});
```

### Timeout Errors

```typescript
try {
  const proc = Bun.spawn(["command"], {
    timeout: 1000,
  });
  await proc.exited;
} catch (error) {
  if (error instanceof Error && error.message.includes("timeout")) {
    console.error("Process timed out");
  }
}
```

### Abort Errors

```typescript
const controller = new AbortController();
const proc = Bun.spawn(["command"], {
  signal: controller.signal,
});

controller.abort();

try {
  await proc.exited;
} catch (error) {
  if (error.name === "AbortError") {
    console.error("Process was aborted");
  }
}
```

## Performance Considerations

### 1. Use spawnSync for Simple Operations

Synchronous operations avoid Promise overhead:

```typescript
// ✅ Faster for simple operations
const result = Bun.spawnSync(["echo", "test"], {
  stdout: "pipe",
});

// ⚠️ More overhead for simple operations
const proc = Bun.spawn(["echo", "test"], {
  stdout: "pipe",
});
await proc.exited;
```

### 2. Stream Large Data

For large inputs/outputs, use streaming:

```typescript
// ✅ Memory efficient
const proc = Bun.spawn(["process"], {
  stdin: largeFile,
  stdout: "pipe",
});

for await (const chunk of proc.stdout) {
  await processChunk(chunk);
}

// ❌ Loads everything into memory
const proc = Bun.spawn(["process"], {
  stdin: await largeFile.text(), // Loads entire file
});
```

### 3. Monitor Resource Usage

Track resource consumption:

```typescript
const proc = Bun.spawn(["task"]);
await proc.exited;

const usage = proc.resourceUsage();
if (usage.maxRSS > threshold) {
  // Alert or log
}
```

## Security Considerations

### 1. Validate Input

```typescript
// ❌ Dangerous - command injection risk
const userInput = req.query.file;
Bun.spawn(["cat", userInput]); // User could inject: "; rm -rf /"

// ✅ Safe - validate and sanitize
const userInput = sanitize(req.query.file);
if (!isValidPath(userInput)) {
  throw new Error("Invalid path");
}
Bun.spawn(["cat", userInput]);
```

### 2. Limit Environment Variables

```typescript
// ❌ Exposes all environment
Bun.spawn(["command"], {
  env: process.env, // May expose secrets
});

// ✅ Only expose needed variables
Bun.spawn(["command"], {
  env: {
    PATH: process.env.PATH,
    NODE_ENV: "production",
    // Don't expose secrets
  },
});
```

### 3. Use Timeout

Prevent processes from running indefinitely:

```typescript
Bun.spawn(["command"], {
  timeout: 30000, // 30 seconds max
});
```

## Examples

See `scripts/demo-bun-spawn-complete.ts` for comprehensive examples covering all features.

## References

- [Bun.spawn() API Documentation](https://bun.sh/docs/api/spawn)
- [Bun Shell Documentation](https://bun.sh/docs/runtime/shell)
- [Process Management Best Practices](https://bun.sh/docs/runtime/bun-apis)

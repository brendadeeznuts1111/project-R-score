# Bun.spawn() Complete API Reference

**Date:** 2025-01-07  
**Source:** Bun TypeScript definitions

---

## 📋 API Signatures

### Overload 1: Command Array

```typescript
Bun.spawn(command: string[], options?: SpawnOptions.OptionsObject): Subprocess
```

**Example:**
```typescript
const proc = Bun.spawn(["bun", "--version"], {
  stdout: "pipe",
});
```

### Overload 2: Options Object

```typescript
Bun.spawn(options: { cmd: string[] } & SpawnOptions.OptionsObject): Subprocess
```

**Example:**
```typescript
const proc = Bun.spawn({
  cmd: ["bun", "--version"],
  stdout: "pipe",
});
```

---

## 🔧 SpawnOptions Interface

```typescript
interface OptionsObject {
  // Working directory
  cwd?: string;
  
  // Environment variables
  env?: Record<string, string | undefined>;
  
  // Standard I/O (legacy, use stdin/stdout/stderr instead)
  stdio?: [Writable, Readable, Readable];
  
  // Standard input
  stdin?: Writable;
  
  // Standard output
  stdout?: Readable;
  
  // Standard error
  stderr?: Readable;
  
  // Exit callback
  onExit?(
    subprocess: Subprocess,
    exitCode: number | null,
    signalCode: number | null,
    error?: ErrorLike,
  ): void | Promise<void>;
  
  // IPC message handler
  ipc?(message: any, subprocess: Subprocess): void;
  
  // IPC serialization format
  serialization?: "json" | "advanced";
  
  // Windows options
  windowsHide?: boolean;
  windowsVerbatimArguments?: boolean;
  
  // Process options
  argv0?: string; // Override argv[0]
  signal?: AbortSignal; // Abort signal for cancellation
  timeout?: number; // Timeout in milliseconds
  killSignal?: string | number; // Signal to use for kill
  maxBuffer?: number; // Maximum buffer size
}
```

### Readable Types

```typescript
type Readable =
  | "pipe"      // Create ReadableStream
  | "inherit"   // Use parent's stream
  | "ignore"    // Discard output
  | null        // Equivalent to "ignore"
  | undefined   // Use default
  | BunFile     // Write to file
  | ArrayBufferView // Write to buffer
  | number;     // File descriptor
```

### Writable Types

```typescript
type Writable =
  | "pipe"         // Create WritableStream
  | "inherit"      // Use parent's stream
  | "ignore"       // Discard input
  | null           // Equivalent to "ignore"
  | undefined      // Use default
  | BunFile        // Read from file
  | ArrayBufferView // Read from buffer
  | number         // File descriptor
  | ReadableStream // Stream input
  | Blob           // Blob input
  | Response       // HTTP response input
  | Request;       // HTTP request input
```

---

## 📦 Subprocess Interface

```typescript
interface Subprocess extends AsyncDisposable {
  // Standard I/O streams
  readonly stdin: FileSink | number | undefined;
  readonly stdout: ReadableStream<Uint8Array> | number | undefined;
  readonly stderr: ReadableStream<Uint8Array> | number | undefined;
  readonly readable: ReadableStream<Uint8Array> | number | undefined; // Alias for stdout
  
  // Process information
  readonly pid: number;                    // Process ID
  readonly exited: Promise<number>;        // Promise resolving to exit code
  readonly exitCode: number | null;       // Exit code (null if killed by signal)
  readonly signalCode: NodeJS.Signals | null; // Signal code if killed
  readonly killed: boolean;               // Whether process was killed
  
  // Process control
  kill(exitCode?: number | NodeJS.Signals): void; // Kill process
  ref(): void;      // Keep process alive (prevents event loop exit)
  unref(): void;    // Allow event loop to exit even if process running
  
  // IPC (requires ipc: true)
  send(message: any): void;    // Send IPC message
  disconnect(): void;          // Close IPC channel
  
  // Resource monitoring
  resourceUsage(): ResourceUsage | undefined; // Get resource usage stats
}
```

---

## 📊 ResourceUsage Interface

```typescript
interface ResourceUsage {
  // Context switches
  contextSwitches: {
    voluntary: number;    // Voluntary context switches
    involuntary: number;  // Involuntary context switches
  };
  
  // CPU time (nanoseconds)
  cpuTime: {
    user: number;    // User CPU time
    system: number;  // System CPU time
    total: number;   // Total CPU time
  };
  
  // Memory
  maxRSS: number;  // Maximum resident set size (bytes)
  
  // IPC messages (if ipc enabled)
  messages: {
    sent: number;      // Messages sent
    received: number;  // Messages received
  };
  
  // I/O operations
  ops: {
    in: number;   // Input operations
    out: number;  // Output operations
  };
  
  // Shared memory
  shmSize: number;  // Shared memory size (bytes)
  
  // Signals
  signalCount: number;  // Number of signals received
  
  // Memory swapping
  swapCount: number;  // Swap count
}
```

---

## 🎯 Usage Examples

### Basic Usage

```typescript
const proc = Bun.spawn(["echo", "Hello World"]);
await proc.exited;
```

### With Pipes

```typescript
const proc = Bun.spawn(["cat", "file.txt"], {
  stdout: "pipe",
  stderr: "pipe",
});

const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
const exitCode = await proc.exited;
```

### With PID and onExit

```typescript
const proc = Bun.spawn(["server"], {
  stdout: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    console.log(`Process ${subprocess.pid} exited:`, exitCode);
    if (error) console.error("Error:", error);
  },
});

const pid = proc.pid;
console.log(`Server started with PID: ${pid}`);
```

### With Timeout

```typescript
const proc = Bun.spawn(["slow-command"], {
  stdout: "pipe",
  timeout: 5000, // 5 seconds
});

try {
  await proc.exited;
} catch (error) {
  console.error("Process timed out");
}
```

### With AbortSignal

```typescript
const controller = new AbortController();
const proc = Bun.spawn(["long-task"], {
  stdout: "pipe",
  signal: controller.signal,
});

setTimeout(() => controller.abort(), 2000);

try {
  await proc.exited;
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Process aborted");
  }
}
```

### With Resource Usage

```typescript
const proc = Bun.spawn(["cpu-intensive-task"], {
  stdout: "pipe",
});

await proc.exited;

const usage = proc.resourceUsage();
if (usage) {
  console.log("CPU time (ms):", usage.cpuTime.total / 1_000_000);
  console.log("Memory (MB):", usage.maxRSS / 1024 / 1024);
  console.log("Context switches:", usage.contextSwitches.voluntary);
}
```

### With IPC

```typescript
const proc = Bun.spawn(["worker.js"], {
  ipc: true,
  ipc(message, subprocess) {
    console.log("Received:", message);
  },
});

proc.send({ type: "start", data: "value" });
```

### Background Process

```typescript
const proc = Bun.spawn(["background-task"], {
  stdout: "ignore",
  stderr: "ignore",
});

proc.unref(); // Don't block event loop exit
```

### Keep Process Alive

```typescript
const proc = Bun.spawn(["long-running"], {
  stdout: "pipe",
});

proc.ref(); // Keep event loop alive until process exits
```

### Kill Process

```typescript
const proc = Bun.spawn(["sleep", "10"]);

setTimeout(() => {
  proc.kill(); // SIGTERM (default)
  // or
  proc.kill("SIGKILL"); // Force kill
  // or
  proc.kill(9); // Numeric signal
}, 1000);
```

### Redirect to File

```typescript
const outputFile = Bun.file("output.txt");
const proc = Bun.spawn(["command"], {
  stdout: outputFile,
});

await proc.exited;
```

### Redirect from Response

```typescript
const response = await fetch("https://example.com/data.json");
const proc = Bun.spawn(["jq", "."], {
  stdin: response,
  stdout: "pipe",
});

const formatted = await new Response(proc.stdout).text();
```

---

## 🔍 Property Details

### `pid: number`

Process ID of the spawned process. Available immediately after spawn.

```typescript
const proc = Bun.spawn(["server"]);
console.log(proc.pid); // e.g., 12345
```

### `exited: Promise<number>`

Promise that resolves when the process exits, returning the exit code.

```typescript
const proc = Bun.spawn(["command"]);
const exitCode = await proc.exited;
console.log("Exit code:", exitCode);
```

### `exitCode: number | null`

Current exit code. `null` if process hasn't exited or was killed by signal.

```typescript
const proc = Bun.spawn(["command"]);
// proc.exitCode is null while running
await proc.exited;
// proc.exitCode is now the exit code
```

### `signalCode: NodeJS.Signals | null`

Signal code if process was killed by signal. `null` if exited normally.

```typescript
const proc = Bun.spawn(["sleep", "10"]);
proc.kill("SIGTERM");
await proc.exited;
console.log(proc.signalCode); // "SIGTERM"
```

### `killed: boolean`

Whether the process was killed.

```typescript
const proc = Bun.spawn(["sleep", "10"]);
proc.kill();
console.log(proc.killed); // true
```

### `readable: ReadableStream | number | undefined`

Alias for `stdout`. Use when you only need stdout.

```typescript
const proc = Bun.spawn(["command"], { stdout: "pipe" });
// These are equivalent:
const data1 = await new Response(proc.stdout).text();
const data2 = await new Response(proc.readable).text();
```

---

## 🎯 Signal Types

```typescript
type Signal =
  | "SIGABRT" | "SIGALRM" | "SIGBUS" | "SIGCHLD" | "SIGCONT"
  | "SIGFPE" | "SIGHUP" | "SIGILL" | "SIGINT" | "SIGIO"
  | "SIGIOT" | "SIGKILL" | "SIGPIPE" | "SIGPOLL" | "SIGPROF"
  | "SIGPWR" | "SIGQUIT" | "SIGSEGV" | "SIGSTKFLT" | "SIGSTOP"
  | "SIGSYS" | "SIGTERM" | "SIGTRAP" | "SIGTSTP" | "SIGTTIN"
  | "SIGTTOU" | "SIGUNUSED" | "SIGURG" | "SIGUSR1" | "SIGUSR2"
  | "SIGVTALRM" | "SIGWINCH" | "SIGXCPU" | "SIGXFSZ"
  | "SIGBREAK" | "SIGLOST" | "SIGINFO";
```

**Common Signals:**
- `SIGTERM` (15) - Graceful termination (default for `kill()`)
- `SIGKILL` (9) - Force kill (cannot be caught)
- `SIGINT` (2) - Interrupt (Ctrl+C)

---

## 📚 References

- **Current Implementation:** `src/mcp/tools/server-control.ts`
- **Complete Guide:** `docs/bun/BUN-SPAWN-COMPLETE.md`
- **PID/onExit Guide:** `docs/BUN-SPAWN-PID-ONEXIT-GUIDE.md`
- **Codebase Review:** `docs/BUN-SPAWN-CODEBASE-REVIEW.md`
- **Official Docs:** https://bun.sh/docs/api/spawn

---

**Last Updated:** 2025-01-07

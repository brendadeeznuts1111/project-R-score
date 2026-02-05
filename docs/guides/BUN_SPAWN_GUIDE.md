<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# 🚀 Bun.spawn: Complete Guide to Spawning Child Processes

Comprehensive reference for using `Bun.spawn()` and `Bun.spawnSync()` in Bun runtime applications (v1.3.8+).

## 📖 Overview

`Bun.spawn()` is Bun's powerful API for creating child processes. It provides fine-grained control over subprocess execution, including input/output handling, environment configuration, IPC communication, terminal (PTY) support, and more.

---

## 🎯 Quick Start

### Spawn a child process

Use [`Bun.spawn()`](/runtime/child-process) to spawn a child process.

```ts
const proc = Bun.spawn(["echo", "hello"]);

// await completion
await proc.exited;
```

***

The second argument accepts a configuration object.

```ts
const proc = Bun.spawn(["echo", "Hello, world!"], {
  cwd: "/tmp",
  env: { FOO: "bar" },
  onExit(proc, exitCode, signalCode, error) {
    // exit handler
  },
});
```

***

By default, the `stdout` of the child process can be consumed as a `ReadableStream` using `proc.stdout`.

```ts
const proc = Bun.spawn(["echo", "hello"]);

const output = await proc.stdout.text();
output; // => "hello\n"
```

***

See [Docs > API > Child processes](/runtime/child-process) for complete documentation.

---

## 📋 API Reference

### `Bun.spawn(command: string[], options?: SpawnOptions): Subprocess`

Spawns a new child process asynchronously. Returns a `Subprocess` object.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | `string[]` | Command and arguments (e.g., `["bun", "run", "dev"]`) |
| `options` | `SpawnOptions` | Configuration object (optional) |

### `Bun.spawnSync(command: string[], options?: SpawnSyncOptions): SyncSubprocess`

Synchronous blocking version. Better for CLI tools; not recommended for HTTP servers.

**Key difference:** Returns `SyncSubprocess` with `Buffer` stdout/stderr instead of streams, and no `stdin` property.

---

## 🔧 SpawnOptions

### Standard Options

#### `cwd?: string`
Working directory for the subprocess. Defaults to parent's current directory.

```ts
Bun.spawn(["npm", "install"], { cwd: "/path/to/project" });
```

#### `env?: Record<string, string>`
Environment variables for the subprocess. Merges with parent environment by default.

```ts
Bun.spawn(["bun", "run"], {
  env: { ...process.env, NODE_ENV: "production", PORT: "3000" }
});
```

#### `stdio?: StdioOption[] | StdioOption`
Configure stdin/stdout/stderr. Can be an array of 3 values or a single value to apply to all.

Default: `["pipe", "inherit", "inherit"]`

**Values:**
- `"pipe"` (default for stdin and stdout) - Create stream
- `"inherit"` (default for stderr) - Use parent's stream
- `"ignore"` - Discard
- `Bun.file("path")` - File descriptor
- `number` - Raw file descriptor
- `ReadableStream` / `Response` / `Request` / `Blob` / `TypedArray` - Data sources

```ts
Bun.spawn(["bun", "build.ts"], {
  stdio: ["inherit", "pipe", "pipe"] // stdin=inherit, stdout=pipe, stderr=pipe
});
```

### Input Options

#### `stdin?: StdioOption`
Configure stdin. Default: `null`

```ts
// Pipe from a ReadableStream
const stream = new ReadableStream({ /* ... */ });
Bun.spawn(["cat"], { stdin: stream });

// From a file
Bun.spawn(["node", "script.js"], { stdin: Bun.file("input.txt") });

// Buffer
Bun.spawn(["node", "script.js"], { stdin: new Uint8Array([1, 2, 3]) });

// Inherit from parent
Bun.spawn(["bash"], { stdin: "inherit" });

// Pipe for manual writing
const proc = Bun.spawn(["cat"], { stdin: "pipe" });
proc.stdin.write("Hello");
proc.stdin.end();
```

### Output Options

#### `stdout?: StdioOption`
Configure stdout. Default: `"pipe"`

```ts
// Write to file
Bun.spawn(["bun", "build"], { stdout: Bun.file("output.log") });

// Discard
Bun.spawn(["npm", "test"], { stdout: "ignore" });

// Inherit (print to console)
Bun.spawn(["bun", "dev"], { stdout: "inherit" });
```

**Reading stdout programmatically:**

Use `proc.stdout.text()` to read the entire output as a string:

```ts
const proc = Bun.spawn(["bun", "--version"]);
const output = await proc.stdout.text();
output; // => "1.3.8\n"
```

Or stream it line-by-line:

```ts
const proc = Bun.spawn(["bun", "build"], { stdout: "pipe" });
const reader = proc.stdout.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log("Chunk:", new TextDecoder().decode(value));
}
```

#### `stderr?: StdioOption`
Configure stderr. Default: `"inherit"`

**Reading stderr programmatically:**

```ts
const proc = Bun.spawn(["bun", "build"], { stderr: "pipe" });
const stderrOutput = await proc.stderr.text();
if (stderrOutput) {
  console.error("Build errors:", stderrOutput);
}
```

---

## 🔄 Exit Handling

### `onExit(proc, exitCode, signalCode, error)`

Callback invoked when the subprocess exits or is killed.

```ts
Bun.spawn(["bun", "--version"], {
  onExit(proc, exitCode, signalCode, error) {
    console.log(`Exited: code=${exitCode} signal=${signalCode}`);
    if (error) console.error(error);
  },
});
```

**Parameters:**
- `proc` - The Subprocess object
- `exitCode` - Exit code (0 = success)
- `signalCode` - Signal that killed the process (e.g., "SIGTERM") or `null`
- `error` - Error object if terminated abnormally, otherwise `null`

### Exiting Promise

`proc.exited: Promise<number>` resolves when the process exits with the exit code.

```ts
const proc = Bun.spawn(["bun", "build"]);
const exitCode = await proc.exited;
console.log(`Process exited with code ${exitCode}`);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `proc.pid` | `number` | Process ID |
| `proc.exitCode` | `number \| null` | Exit code (null while running) |
| `proc.signalCode` | `string \| null` | Signal code if killed |
| `proc.killed` | `boolean` | Whether process was killed |
| `proc.exited` | `Promise<number>` | Promise that resolves on exit |
| `proc.stdin` | `FileSink \| null` | Writable stream (if `stdin: "pipe"`) |
| `proc.stdout` | `ReadableStream` | Output stream (if `stdout: "pipe"`) |
| `proc.stderr` | `ReadableStream` | Error stream (if `stderr: "pipe"`) |

### Killing a Process

```ts
const proc = Bun.spawn(["sleep", "1000"]);

proc.kill(); // Send SIGTERM
proc.kill(15); // Send signal 15 (SIGTERM)
proc.kill("SIGKILL"); // Send SIGKILL
```

### Detaching a Process

By default, the parent `bun` process waits for all children to exit. To detach:

```ts
const proc = Bun.spawn(["long-running-command"]);
proc.unref(); // Parent can exit independently
```

---

## ⏱️ Advanced Control

### AbortSignal

Abort a subprocess with an `AbortSignal`:

```ts
const controller = new AbortController();
const proc = Bun.spawn({
  cmd: ["sleep", "100"],
  signal: controller.signal,
});

// Later...
controller.abort(); // Kills the process with SIGTERM
```

### Timeout

Automatically kill a process after a timeout:

```ts
const proc = Bun.spawn({
  cmd: ["sleep", "10"],
  timeout: 5000, // 5 seconds (milliseconds)
});

await proc.exited; // Resolves after timeout kills process
```

### killSignal

Specify which signal to send on timeout or abort:

```ts
Bun.spawn({
  cmd: ["sleep", "10"],
  timeout: 5000,
  killSignal: "SIGKILL", // or signal number
});
```

### maxBuffer (spawnSync only)

Limit output buffer before killing the process:

```ts
const result = Bun.spawnSync({
  cmd: ["yes"],
  maxBuffer: 100, // Kill after 100 bytes
});
```

---

## 📡 Inter-Process Communication (IPC)

Bun supports direct message passing between `bun` processes.

### Parent Process

```ts
const child = Bun.spawn(["bun", "child.ts"], {
  ipc(message) {
    console.log("Received from child:", message);
  },
});

child.send("Hello from parent");
```

The `ipc` callback receives:
- `message` - The deserialized message from child
- `childProc` - Reference to the Subprocess (for replying)

Two-way communication:

```ts
const childProc = Bun.spawn(["bun", "child.ts"], {
  ipc(message, child) {
    console.log("Child says:", message);
    child.send("Parent acknowledges");
  },
});

childProc.send("Parent initialization");
```

### Child Process

In the child script (`child.ts`):

```ts
// Send message to parent
process.send("Hello from child");

// Receive messages from parent
process.on("message", (msg) => {
  console.log("Parent said:", msg);
});
```

### Serialization

Control message serialization format:

```ts
Bun.spawn({
  cmd: ["bun", "child.ts"],
  ipc(message) { /* ... */ },
  serialization: "json", // or "advanced" (default)
});
```

**Options:**
- `"advanced"` (default) - Uses JSC serialize, supports most types (like `structuredClone`)
- `"json"` - Uses `JSON.stringify/parse`, compatible with Node.js

**Node.js ↔ Bun IPC:** Must use `serialization: "json"`

```ts
// In Bun, spawn Node.js with JSON serialization
Bun.spawn({
  cmd: ["node", "child.js"],
  stdio: ["inherit", "inherit", "inherit"],
  serialization: "json",
  ipc(msg) { /* receives JSON-serialized messages */ }
});
```

### Disconnect IPC

```ts
childProc.disconnect(); // Close IPC channel
```

---

## 🖥️ Terminal (PTY) Support

For interactive terminal applications, spawn with a pseudo-terminal (PTY).

### Basic PTY Usage

```ts
const proc = Bun.spawn(["bash"], {
  terminal: {
    cols: 80,
    rows: 24,
    data(terminal, data) {
      process.stdout.write(data);
    },
  },
});

proc.terminal.write("echo hello\n");
await proc.exited;
proc.terminal.close();
```

### Terminal Configuration

```ts
const proc = Bun.spawn(["bash"], {
  terminal: {
    cols: 120,        // Number of columns (default: 80)
    rows: 40,         // Number of rows (default: 24)
    name: "xterm-256color", // Terminal type (default)
    data(term, data) {},   // Called when data received
    exit(term, exitCode) {}, // Called when PTY closes (exitCode: 0=EOF, 1=error)
    drain(term) {},        // Called when ready for more data
  },
});
```

### Terminal Methods

Available on `proc.terminal`:

```ts
proc.terminal.write("ls -la\n");      // Write to terminal
proc.terminal.resize(100, 30);        // Resize dimensions
proc.terminal.setRawMode(true);      // Disable line buffering
proc.terminal.ref();                 // Keep event loop alive
proc.terminal.unref();               // Allow parent to exit independently
proc.terminal.close();               // Close PTY
```

### Reusable Terminal

Create a terminal once and reuse it:

```ts
await using terminal = new Bun.Terminal({
  cols: 80, rows: 24,
  data(term, data) => process.stdout.write(data),
});

// Use for multiple commands
await Bun.spawn(["echo", "first"], { terminal }).exited;
await Bun.spawn(["echo", "second"], { terminal }).exited;
// Terminal auto-closes with `await using`
```

**Note:** PTY support is **POSIX-only** (Linux, macOS). Not available on Windows.

---

## ⚖️ spawn vs spawnSync

| Feature | `Bun.spawn()` | `Bun.spawnSync()` |
|---------|---------------|-------------------|
| **Blocking** | No (async) | Yes (blocking) |
| **stdin** | Yes (pipe, streams, etc.) | No |
| **stdout/stderr** | `ReadableStream` | `Buffer` |
| **Return type** | `Subprocess` | `SyncSubprocess` |
| **Use case** | HTTP servers, long-running processes | CLI tools, quick commands |

### When to Use spawnSync

For short-lived synchronously-executed commands where you need immediate output:

```ts
const result = Bun.spawnSync(["bun", "--version"]);
console.log(result.stdout.toString());
// Output: "1.3.8\n"
```

`SyncSubprocess` properties:
- `result.success` - `boolean` (exit code === 0)
- `result.stdout` - `Buffer`
- `result.stderr` - `Buffer`
- `result.exitCode` - `number`
- `result.signalCode` - `string \| null`

---

## 🎯 Common Patterns

### Stream Piping

```ts
const proc = Bun.spawn(["bun", "build.ts"], {
  stdout: "pipe",
  stderr: "pipe",
});

// Pipe output to console
proc.stdout.pipeTo(new WritableStream({
  write(data) { console.log(String(data)); }
}));

// Or use text()
const output = await proc.stdout.text();
console.log(output);
```

### Capture Output

```ts
const proc = Bun.spawn(["bun", "--version"]);
const stdout = await proc.stdout.text();
const stderr = await proc.stderr?.text() || "";
console.log(`Version: ${stdout.trim()}`);
```

### Pipe Between Processes

```ts
const producer = Bun.spawn(["bun", "producer.ts"], {
  stdout: "pipe",
});

const consumer = Bun.spawn(["bun", "consumer.ts"], {
  stdin: producer.stdout,
  stdout: "inherit",
});

await consumer.exited;
```

### Resource Usage Monitoring

After process exits:

```ts
const proc = Bun.spawn(["bun", "build"]);
await proc.exited;

const usage = proc.resourceUsage();
console.log(`Max memory: ${usage.maxRSS} bytes`);
console.log(`User CPU: ${usage.cpuTime.user} µs`);
console.log(`System CPU: ${usage.cpuTime.system} µs`);
```

---

## 🏆 Best Practices

### ✅ DO:

1. **Use cwd to isolate projects**
   ```ts
   Bun.spawn(["bun", "run"], { cwd: projectRoot });
   ```

2. **Set appropriate env variables**
   ```ts
   env: { ...process.env, NODE_ENV: "production" }
   ```

3. **Always await proc.exited**
   ```ts
   const proc = Bun.spawn([...]);
   await proc.exited; // Clean shutdown
   ```

4. **Use unref() for background tasks**
   ```ts
   proc.unref(); // Don't block parent exit
   ```

5. **Handle errors in onExit**
   ```ts
   onExit(proc, code, signal, error) {
     if (error || code !== 0) {
       console.error("Failed:", error || `exit code ${code}`);
     }
   }
   ```

6. **Use PTY for interactive apps**
   ```ts
   terminal: { cols: 80, rows: 24, data: (t, d) => process.stdout.write(d) }
   ```

### ❌ DON'T:

1. **Don't forget to close stdin**
   ```ts
   const proc = Bun.spawn([...], { stdin: "pipe" });
   proc.stdin.end(); // Important!
   ```

2. **Don't ignore stderr**
   ```ts
   // Wrong: stderr: "ignore"
   stderr: "pipe" // or "inherit" to see errors
   ```

3. **Don't use spawn for HTTP servers**
   - Use spawn for subprocesses, not server processes

4. **Don't block in async code with spawnSync**
   - Use async spawn in server contexts

5. **Don't assume PTY works on Windows**
   - Check platform before using terminal option

6. **Don't forget to clean up terminals**
   ```ts
   try {
     await proc.exited;
   } finally {
     proc.terminal?.close();
   }
   ```

---

## ⚠️ Gotchas

1. **Stderr default is "inherit" not "pipe"**
   - Remember to set `stderr: "pipe"` if you need to read it

2. **Terminal vs stdio conflict**
   - When using `terminal`, `stdin/stdout/stderr` options are ignored
   - Use `proc.terminal.write()` instead of `proc.stdin`

3. **IPC only works with Bun**
   - Node.js requires `serialization: "json"`
   - Other languages aren't supported

4. **onExit fires after exited promise**
   - `onExit` is a callback; `exited` is a promise. Both work similarly.

5. **SpawnSync buffers can overflow**
   - Use `maxBuffer` to prevent OOM
   - Consider async spawn for large output

6. **Realtime output requires streaming**
   - Don't await `proc.stdout.text()` for realtime; use `pipeTo` or loop with reader

---

## 📊 Performance Notes

- `Bun.spawn()` uses non-blocking I/O; safe for high-concurrency servers
- PTY allocation has overhead; only use when needed (interactive programs)
- `Bun.spawnSync()` blocks the event loop; use judiciously
- Message serialization for IPC: `"advanced"` is faster but less compatible than `"json"`

---

## 🔗 Related Resources

- [Bun Docs: Child Processes](/runtime/child-process)
- [Bun.main Guide](./BUN_MAIN_GUIDE.md) - For entrypoint-based resolution
- Node.js: [`child_process.spawn()` 🌐](https://nodejs.org/api/child_process.html)

---

## 📋 Quick Reference

| Task | Code |
|------|------|
| Spawn basic | `Bun.spawn(["cmd", "arg"])` |
| Set working dir | `{ cwd: "/path" }` |
| Set environment | `{ env: { ...process.env, KEY: "val" } }` |
| Capture stdout | `await proc.stdout.text()` |
| Pipe stdout | `proc.stdout.pipeTo(dest)` |
| Handle exit | `proc.onExit((proc, code, signal, err) => {})` |
| Wait for exit | `await proc.exited` |
| Kill process | `proc.kill()` or `proc.kill("SIGKILL")` |
| Use PTY | `{ terminal: { cols, rows, data } }` |
| Abort process | `{ signal: controller.signal }` |
| Set timeout | `{ timeout: 5000 }` |
| IPC messaging | `{ ipc(msg) {}, ... }` |
| Resource usage | `proc.resourceUsage()` after exit |
| SpawnSync | `Bun.spawnSync(["cmd"])` → `result.stdout` |

---

## 🤝 Contributing

This guide is part of the Project Matrix. See also:
- `BUN_MAIN_GUIDE.md` - Entrypoint-based path resolution
- `utils/guide-cli.ts` - CLI guidance tool implementation
- `tools/overseer-cli.ts` - Monorepo manager using spawn

---

**Last Updated:** 2025-02-02  
**Bun Version:** 1.3.8+  
**License:** MIT
# Bun.spawn() Stdin Guide

**Date:** 2025-01-07  
**Purpose:** Complete guide for using stdin with Bun.spawn()

---

## 📋 Stdin Types Overview

| Value | Description | Use Case |
|-------|-------------|----------|
| `null` / `undefined` | Default. No input to subprocess | Simple commands |
| `"pipe"` | Return FileSink for incremental writing | Manual data writing |
| `"inherit"` | Inherit parent's stdin | Interactive commands |
| `"ignore"` | Discard input | Background processes |
| `Bun.file()` | Read from file | File processing |
| `TypedArray \| DataView` | Use binary buffer | Binary data |
| `Response` | Use HTTP response body | Process fetched data |
| `Request` | Use HTTP request body | Process request data |
| `ReadableStream` | Pipe from JavaScript stream | Stream processing |
| `Blob` | Use blob data | Blob processing |
| `number` | Read from file descriptor | Low-level I/O |

---

## 🎯 Usage Examples

### 1. Default (null/undefined) - No Input

```typescript
// No stdin needed
const proc = Bun.spawn(["echo", "Hello"]);
await proc.exited;
```

### 2. "pipe" - Manual Write with FileSink

**Use Case:** Incrementally write data to process input

```typescript
const proc = Bun.spawn(["cat"], {
  stdin: "pipe", // Returns FileSink
  stdout: "pipe",
});

// Write string data
proc.stdin.write("hello");

// Write binary data
const enc = new TextEncoder();
proc.stdin.write(enc.encode(" world!"));

// Flush buffered data
proc.stdin.flush();

// Close input stream
proc.stdin.end();

// Read output
const output = await proc.stdout.text();
console.log(output); // "hello world!"
```

**FileSink Methods:**
- `write(data: string | Uint8Array): void` - Write data
- `flush(): void` - Flush buffered data
- `end(): void` - Close stream

**Example: Streaming Large Data**

```typescript
const proc = Bun.spawn(["gzip"], {
  stdin: "pipe",
  stdout: "pipe",
});

// Write data in chunks
for (let i = 0; i < 1000; i++) {
  proc.stdin.write(`Line ${i}\n`);
}

proc.stdin.flush();
proc.stdin.end();

const compressed = await proc.stdout.arrayBuffer();
```

### 3. "inherit" - Inherit Parent's Stdin

**Use Case:** Interactive commands that need user input

```typescript
const proc = Bun.spawn(["node", "-i"], {
  stdin: "inherit", // Process receives parent's stdin
  stdout: "inherit",
  stderr: "inherit",
});

// User can type directly into the Node.js REPL
await proc.exited;
```

### 4. "ignore" - Discard Input

**Use Case:** Background processes that don't need input

```typescript
const proc = Bun.spawn(["background-task"], {
  stdin: "ignore", // Input is discarded
  stdout: "ignore",
  stderr: "ignore",
});

proc.unref(); // Don't block exit
```

### 5. Response - HTTP Response Body

**Use Case:** Process data fetched from HTTP endpoint

```typescript
// User's example
const proc = Bun.spawn(["cat"], {
  stdin: await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/examples/hashing.js"),
  stdout: "pipe",
});

const text = await proc.stdout.text();
console.log(text); // File content from GitHub
```

**Real-World Example: Process API Response**

```typescript
// Fetch JSON and process with jq
const response = await fetch("https://api.example.com/data.json");
const proc = Bun.spawn(["jq", "."], {
  stdin: response,
  stdout: "pipe",
});

const formatted = await proc.stdout.text();
console.log(formatted); // Formatted JSON
```

### 6. Request - HTTP Request Body

**Use Case:** Process HTTP request body

```typescript
const request = new Request("https://api.example.com/process", {
  method: "POST",
  body: JSON.stringify({ data: "test" }),
});

const proc = Bun.spawn(["cat"], {
  stdin: request,
  stdout: "pipe",
});

const output = await proc.stdout.text();
console.log(output); // Request body content
```

### 7. ReadableStream - JavaScript Stream

**Use Case:** Pipe data from JavaScript ReadableStream

```typescript
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue("Hello from ");
    controller.enqueue("ReadableStream!");
    controller.close();
  },
});

const proc = Bun.spawn(["cat"], {
  stdin: stream,
  stdout: "pipe",
});

const output = await proc.stdout.text();
console.log(output); // "Hello from ReadableStream!"
```

**Example: Transform Stream**

```typescript
// Create transform stream
const transformStream = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toUpperCase());
  },
});

// Pipe through transform then to process
const input = new ReadableStream({
  start(controller) {
    controller.enqueue("hello world");
    controller.close();
  },
});

const proc = Bun.spawn(["cat"], {
  stdin: input.pipeThrough(transformStream),
  stdout: "pipe",
});

const output = await proc.stdout.text();
console.log(output); // "HELLO WORLD"
```

### 8. BunFile - File Input

**Use Case:** Process file content

```typescript
const file = Bun.file("input.txt");
const proc = Bun.spawn(["cat"], {
  stdin: file,
  stdout: "pipe",
});

const output = await proc.stdout.text();
console.log(output); // File content
```

**Example: Process Large File**

```typescript
// Process large file without loading into memory
const largeFile = Bun.file("large-data.jsonl");
const proc = Bun.spawn(["grep", "error"], {
  stdin: largeFile,
  stdout: "pipe",
});

// Stream output
for await (const line of proc.stdout.lines()) {
  processErrorLine(line);
}
```

### 9. ArrayBufferView (TypedArray) - Binary Buffer

**Use Case:** Process binary data

```typescript
const data = new TextEncoder().encode("Hello, World!\n");
const proc = Bun.spawn(["cat"], {
  stdin: data,
  stdout: "pipe",
});

const output = await proc.stdout.text();
console.log(output); // "Hello, World!"
```

**Example: Binary Data Processing**

```typescript
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
const proc = Bun.spawn(["xxd"], { // Hex dump
  stdin: binaryData,
  stdout: "pipe",
});

const hexOutput = await proc.stdout.text();
console.log(hexOutput); // Hex representation
```

### 10. Blob - Blob Data

**Use Case:** Process blob content

```typescript
const blob = new Blob(["Hello\nWorld\n"], { type: "text/plain" });
const proc = Bun.spawn(["cat"], {
  stdin: blob,
  stdout: "pipe",
});

const output = await proc.stdout.text();
console.log(output); // "Hello\nWorld\n"
```

**Example: Process Image Blob**

```typescript
const imageBlob = await fetch("https://example.com/image.png").then(r => r.blob());
const proc = Bun.spawn(["file", "-"], { // Detect file type
  stdin: imageBlob,
  stdout: "pipe",
});

const fileType = await proc.stdout.text();
console.log(fileType); // File type information
```

### 11. number - File Descriptor

**Use Case:** Low-level file descriptor access

```typescript
// Open file descriptor
const fd = Bun.openSync("input.txt").fd;

const proc = Bun.spawn(["cat"], {
  stdin: fd, // Read from file descriptor
  stdout: "pipe",
});

const output = await proc.stdout.text();
```

---

## 🔧 Common Patterns

### Pattern 1: Fetch and Process

```typescript
async function fetchAndProcess(url: string, processor: string[]): Promise<string> {
  const response = await fetch(url);
  const proc = Bun.spawn(processor, {
    stdin: response,
    stdout: "pipe",
  });
  
  return await proc.stdout.text();
}

// Usage
const processed = await fetchAndProcess(
  "https://api.example.com/data.json",
  ["jq", ".data"]
);
```

### Pattern 2: Stream Processing Pipeline

```typescript
async function processStream(input: ReadableStream): Promise<string> {
  // Stage 1: Transform
  const transform = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk.toUpperCase());
    },
  });
  
  // Stage 2: Process with external command
  const proc = Bun.spawn(["grep", "ERROR"], {
    stdin: input.pipeThrough(transform),
    stdout: "pipe",
  });
  
  return await proc.stdout.text();
}
```

### Pattern 3: File Processing Pipeline

```typescript
async function processFile(inputFile: string, outputFile: string): Promise<void> {
  const input = Bun.file(inputFile);
  const output = Bun.file(outputFile);
  
  const proc = Bun.spawn(["gzip"], {
    stdin: input,
    stdout: output, // Write directly to file
  });
  
  await proc.exited;
}
```

### Pattern 4: Interactive Process

```typescript
async function runInteractive(command: string[]): Promise<void> {
  const proc = Bun.spawn(command, {
    stdin: "inherit",  // User input
    stdout: "inherit", // User output
    stderr: "inherit", // User errors
  });
  
  await proc.exited;
}

// Usage: User can interact with command
await runInteractive(["node", "-i"]); // Node.js REPL
```

### Pattern 5: Background Process with No I/O

```typescript
function startBackgroundTask(command: string[]): number {
  const proc = Bun.spawn(command, {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  
  proc.unref(); // Don't block exit
  
  return proc.pid;
}

// Usage
const pid = startBackgroundTask(["long-running-task"]);
console.log(`Background task started with PID: ${pid}`);
```

---

## 📊 Current Usage in Codebase

### Found Usage

1. **`test/harness.ts:173`** - Uses `"pipe"` for stdin with manual write
   ```typescript
   stdin: options?.stdin ? 'pipe' : 'ignore',
   if (options?.stdin) {
     proc.stdin.write(options.stdin);
     proc.stdin.end();
   }
   ```

2. **`examples/demos/demo-bun-spawn-complete.ts`** - Multiple examples:
   - Response as stdin (line 89)
   - "pipe" with manual write (line 165)
   - ReadableStream (line 145)
   - BunFile (line 124)
   - ArrayBufferView (line 136)
   - Blob (line 109)

### Not Used in Production

- No production code uses stdin with Response/Request
- No production code uses stdin with ReadableStream
- No production code uses stdin with Blob

**Opportunity:** Use stdin for processing fetched data, file processing, etc.

---

## 🎯 Integration Opportunities

### 1. API Route - Process Fetched Data

**File:** `src/api/routes.ts`

```typescript
// Process external API data
app.post("/api/process-external", async (c) => {
  const url = c.req.query("url");
  const response = await fetch(url);
  
  const proc = Bun.spawn(["jq", "."], {
    stdin: response,
    stdout: "pipe",
  });
  
  const processed = await proc.stdout.text();
  return c.json({ processed });
});
```

### 2. File Processing Utility

**File:** `src/utils/file-processor.ts`

```typescript
export async function processFileWithCommand(
  file: BunFile,
  command: string[]
): Promise<string> {
  const proc = Bun.spawn(command, {
    stdin: file,
    stdout: "pipe",
  });
  
  return await proc.stdout.text();
}

// Usage
const file = Bun.file("data.json");
const formatted = await processFileWithCommand(file, ["jq", "."]);
```

### 3. Stream Processing

**File:** `src/utils/stream-processor.ts`

```typescript
export async function processStream(
  stream: ReadableStream,
  command: string[]
): Promise<string> {
  const proc = Bun.spawn(command, {
    stdin: stream,
    stdout: "pipe",
  });
  
  return await proc.stdout.text();
}
```

---

## 🔍 FileSink API Details

When `stdin: "pipe"`, you get a `FileSink` object:

```typescript
interface FileSink {
  write(data: string | Uint8Array): void;
  flush(): void;
  end(): void;
}
```

### Write Methods

```typescript
const proc = Bun.spawn(["cat"], { stdin: "pipe", stdout: "pipe" });

// Write string
proc.stdin.write("Hello");

// Write binary
proc.stdin.write(new Uint8Array([72, 101, 108, 108, 111]));

// Write encoded string
const encoder = new TextEncoder();
proc.stdin.write(encoder.encode("World"));
```

### Flush

```typescript
// Write multiple chunks
proc.stdin.write("Chunk 1");
proc.stdin.write("Chunk 2");
proc.stdin.write("Chunk 3");

// Flush all buffered data
proc.stdin.flush();

// Continue writing
proc.stdin.write("Chunk 4");
```

### End

```typescript
// Write final data
proc.stdin.write("Final data");

// Close stdin (sends EOF)
proc.stdin.end();

// Process will receive EOF and can finish
await proc.exited;
```

---

## 📚 References

- **Complete API:** `docs/BUN-SPAWN-COMPLETE-API.md`
- **Examples:** `examples/demos/demo-bun-spawn-complete.ts`
- **Documentation:** `src/runtime/bun-native-utils-complete.ts` (examples 7.4.3.1.7-7.4.3.1.11)
- **Official Docs:** https://bun.sh/docs/api/spawn

---

## 🎯 Quick Reference

```typescript
// Response
stdin: await fetch("https://example.com/data")

// Manual write
stdin: "pipe"
proc.stdin.write("data")
proc.stdin.end()

// ReadableStream
stdin: new ReadableStream({ ... })

// File
stdin: Bun.file("input.txt")

// Binary
stdin: new Uint8Array([...])

// Blob
stdin: new Blob(["data"])

// Inherit
stdin: "inherit"

// Ignore
stdin: "ignore"
```

---

**Last Updated:** 2025-01-07

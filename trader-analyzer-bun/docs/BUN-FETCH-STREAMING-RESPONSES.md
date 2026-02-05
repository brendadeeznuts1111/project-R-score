# Bun Fetch API: Streaming Response Bodies

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Fetch Documentation](https://bun.com/docs/runtime/networking/fetch#streaming-response-bodies)

> **Status**: ✅ Production Ready  
> **See Also**: [Anti-Patterns Guide](./ANTI-PATTERNS.md) - Avoid buffering large responses

---

## Overview

Bun's `fetch` API supports **streaming response bodies** using async iterators or `ReadableStream`. This is essential for:

- **Large responses** (datasets, logs, files)
- **Real-time data** (live feeds, progress updates)
- **Memory efficiency** (avoid loading entire response into memory)
- **Faster time-to-first-byte** (start processing before download completes)

---

## 🚀 Basic Usage

### Async Iterator Pattern (Recommended)

```typescript
const response = await fetch("https://api.example.com/large-dataset");

// Stream response body chunk by chunk
for await (const chunk of response.body) {
  console.log("Received chunk:", chunk);
  // Process chunk immediately without waiting for entire response
}
```

### ReadableStream Pattern

```typescript
const response = await fetch("https://api.example.com/large-dataset");
const stream = response.body;

if (!stream) {
  throw new Error("Response body is not streamable");
}

const reader = stream.getReader();

try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    // Process chunk
    console.log("Chunk:", value);
  }
} finally {
  reader.releaseLock();
}
```

---

## 📊 When to Use Streaming

### ✅ Use Streaming For:

1. **Large JSON responses** (>1MB)
   ```typescript
   // ❌ Bad: Buffers entire response
   const data = await response.json(); // Could be 100MB+
   
   // ✅ Good: Stream and parse incrementally
   for await (const chunk of response.body) {
     // Process JSON chunks as they arrive
   }
   ```

2. **File downloads**
   ```typescript
   const response = await fetch("https://example.com/large-file.zip");
   const file = Bun.file("./downloads/file.zip");
   
   // Stream directly to file (Bun optimizes this)
   await Bun.write(file, response);
   ```

3. **Real-time data feeds**
   ```typescript
   const response = await fetch("https://api.example.com/live-feed");
   
   for await (const chunk of response.body) {
     const data = JSON.parse(new TextDecoder().decode(chunk));
     // Process live updates immediately
   }
   ```

4. **Log streaming**
   ```typescript
   const response = await fetch("https://api.example.com/logs");
   
   const decoder = new TextDecoder();
   for await (const chunk of response.body) {
     const text = decoder.decode(chunk, { stream: true });
     const lines = text.split("\n").filter(Boolean);
     
     for (const line of lines) {
       console.log("Log:", line);
     }
   }
   ```

### ❌ Don't Use Streaming For:

- Small responses (<100KB)
- Responses that need full data before processing
- Simple API calls where `.json()` or `.text()` is sufficient

---

## 🔧 Advanced Patterns

### Streaming JSON Parsing

```typescript
/**
 * Stream and parse large JSON responses incrementally
 * Useful for NDJSON (newline-delimited JSON) or large arrays
 */
async function* streamJSONLines(response: Response): AsyncGenerator<unknown> {
  const decoder = new TextDecoder();
  let buffer = "";
  
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    
    // Keep incomplete line in buffer
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          yield JSON.parse(line);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Failed to parse JSON line: ${errorMessage}`);
        }
      }
    }
  }
  
  // Process remaining buffer
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to parse final JSON line: ${errorMessage}`);
    }
  }
}

// Usage
const response = await fetch("https://api.example.com/ndjson-feed");
for await (const item of streamJSONLines(response)) {
  console.log("Item:", item);
}
```

### Streaming CSV Processing

```typescript
/**
 * Stream and process CSV data line by line
 * Memory-efficient for large CSV files
 */
async function* streamCSV(response: Response): AsyncGenerator<string[]> {
  const decoder = new TextDecoder();
  let buffer = "";
  let headers: string[] | null = null;
  
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row = line.split(",").map(cell => cell.trim());
      
      if (!headers) {
        headers = row;
        continue;
      }
      
      // Yield row as object
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        record[header] = row[i] || "";
      });
      
      yield record as unknown as string[];
    }
  }
}

// Usage
const response = await fetch("https://api.example.com/large-dataset.csv");
for await (const row of streamCSV(response)) {
  console.log("Row:", row);
}
```

### Error Handling with Streaming

```typescript
/**
 * Stream with proper error handling and cleanup
 */
async function streamWithErrorHandling(url: string): Promise<void> {
  let response: Response | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  
  try {
    response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error("Response body is not streamable");
    }
    
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value, { stream: true });
      console.log("Chunk:", text);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Streaming error:", errorMessage);
    throw error;
  } finally {
    // Always cleanup
    if (reader) {
      reader.releaseLock();
    }
  }
}
```

---

## 🎯 Project-Specific Examples

### Streaming Correlation Graph Data

```typescript
/**
 * Stream large correlation graph responses
 * @see src/api/routes.ts - Correlation graph endpoint
 */
async function streamCorrelationGraph(eventId: string): Promise<void> {
  const response = await fetch(
    `http://localhost:3001/api/correlation-graph?event_id=${eventId}&time_window=24`
  );
  
  if (!response.body) {
    throw new Error("Response body is not streamable");
  }
  
  const decoder = new TextDecoder();
  let buffer = "";
  
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    
    // Try to parse complete JSON objects as they arrive
    try {
      const data = JSON.parse(buffer);
      console.log("Graph data received:", data);
      buffer = "";
    } catch {
      // Incomplete JSON, keep buffering
      continue;
    }
  }
}
```

### Streaming Log Responses

```typescript
/**
 * Stream log responses from API
 * @see src/api/websocket/log-stream.ts - WebSocket log streaming
 */
async function streamLogs(level?: string): Promise<void> {
  const url = new URL("http://localhost:3001/api/logs");
  if (level) url.searchParams.set("level", level);
  
  const response = await fetch(url.toString());
  
  if (!response.body) {
    throw new Error("Response body is not streamable");
  }
  
  const decoder = new TextDecoder();
  
  for await (const chunk of response.body) {
    const text = decoder.decode(chunk, { stream: true });
    const lines = text.split("\n").filter(Boolean);
    
    for (const line of lines) {
      try {
        const log = JSON.parse(line);
        console.log(`[${log.level}] ${log.message}`);
      } catch (error: unknown) {
        // Not JSON, print as-is
        console.log(line);
      }
    }
  }
}
```

---

## ⚡ Performance Benefits

### Memory Usage

```typescript
// ❌ Bad: Loads entire 100MB response into memory
const response = await fetch("https://api.example.com/large-dataset");
const data = await response.json(); // 100MB in memory

// ✅ Good: Processes chunks as they arrive (constant memory)
const response = await fetch("https://api.example.com/large-dataset");
for await (const chunk of response.body) {
  // Process 64KB chunks - memory usage stays constant
  processChunk(chunk);
}
```

### Time to First Byte

```typescript
// ❌ Bad: Waits for entire response before processing
const start = Date.now();
const data = await response.json(); // Waits for full download
const end = Date.now();
console.log(`Total time: ${end - start}ms`);

// ✅ Good: Starts processing immediately
const start = Date.now();
let firstChunkTime: number | null = null;

for await (const chunk of response.body) {
  if (!firstChunkTime) {
    firstChunkTime = Date.now();
    console.log(`Time to first byte: ${firstChunkTime - start}ms`);
  }
  processChunk(chunk);
}
```

---

## 🔍 Debugging Streaming Responses

### Verbose Logging

```typescript
const response = await fetch("https://api.example.com/data", {
  verbose: true, // Bun-specific: logs request/response headers
});

for await (const chunk of response.body) {
  console.log("Chunk size:", chunk.length);
}
```

### Monitoring Stream Progress

```typescript
async function streamWithProgress(url: string): Promise<void> {
  const response = await fetch(url);
  
  if (!response.body) {
    throw new Error("Response body is not streamable");
  }
  
  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
  
  let receivedBytes = 0;
  
  for await (const chunk of response.body) {
    receivedBytes += chunk.length;
    
    if (totalBytes) {
      const percent = (receivedBytes / totalBytes) * 100;
      console.log(`Progress: ${percent.toFixed(2)}%`);
    } else {
      console.log(`Received: ${receivedBytes} bytes`);
    }
  }
}
```

---

## 🚨 Common Pitfalls

### 1. Forgetting to Release Locks

```typescript
// ❌ Bad: Reader lock not released
const reader = response.body.getReader();
const { value } = await reader.read();
// Lock still held!

// ✅ Good: Always release lock
const reader = response.body.getReader();
try {
  const { value } = await reader.read();
} finally {
  reader.releaseLock();
}
```

### 2. Mixing Streaming and Buffering

```typescript
// ❌ Bad: Can't use both
const response = await fetch(url);
for await (const chunk of response.body) {
  // ...
}
const data = await response.json(); // Error: body already consumed

// ✅ Good: Choose one approach
// Option 1: Stream
for await (const chunk of response.body) {
  // ...
}

// Option 2: Buffer
const data = await response.json();
```

### 3. Not Handling Incomplete Data

```typescript
// ❌ Bad: Assumes complete data in each chunk
for await (const chunk of response.body) {
  const text = decoder.decode(chunk);
  const json = JSON.parse(text); // May fail if JSON spans chunks
}

// ✅ Good: Buffer incomplete data
let buffer = "";
for await (const chunk of response.body) {
  buffer += decoder.decode(chunk, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  
  for (const line of lines) {
    const json = JSON.parse(line);
  }
}
```

---

## 📚 Related Documentation

- [Bun Fetch API](./BUN-FETCH-API.md) - Complete fetch API reference
- [Anti-Patterns Guide](./ANTI-PATTERNS.md) - Avoid buffering large responses
- [Bun Streams](./BUN-STREAMS.md) - General streaming patterns
- [Performance Optimization](./PERFORMANCE.md) - Memory and performance tips

---

## 🔗 External References

- [Bun Fetch Documentation](https://bun.com/docs/runtime/networking/fetch#streaming-response-bodies)
- [MDN ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [WHATWG Streams Standard](https://streams.spec.whatwg.org/)

---

**Ripgrep Pattern**: `streaming.*response|response\.body|for await.*response|ReadableStream`

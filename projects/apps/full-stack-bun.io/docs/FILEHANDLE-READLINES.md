# FileHandle.readLines() Guide

## Overview

`FileHandle.readLines()` enables efficient, backpressure-aware async iteration over file lines using `for-await-of`. This is perfect for processing large files line-by-line without loading the entire file into memory.

## Basic Usage

```typescript
import { open } from "node:fs/promises";

const file = await open("file.txt");
try {
  for await (const line of file.readLines({ encoding: "utf8" })) {
    console.log(line);
  }
} finally {
  await file.close();
}
```

## Features

- ✅ **Memory Efficient**: O(1) memory usage
- ✅ **Backpressure Aware**: Handles large files gracefully
- ✅ **CRLF Handling**: Correctly handles Windows line endings
- ✅ **Empty Lines**: Properly handles empty lines
- ✅ **Encoding Support**: Same options as `createReadStream`

## Options

```typescript
file.readLines({
  encoding: "utf8",        // Text encoding
  autoClose: false,        // Auto-close on end
  emitClose: false,       // Emit close event
  start: 0,               // Start position
  end: Infinity,          // End position
  highWaterMark: 64 * 1024 // Buffer size
})
```

## Real-World Examples

### 1. NDJSON Processing

```typescript
import { open } from "node:fs/promises";

async function processNDJSON(filePath: string) {
  const file = await open(filePath);
  const results = [];

  try {
    for await (const line of file.readLines({ encoding: "utf8" })) {
      if (!line.trim()) continue; // Skip empty lines
      
      try {
        const data = JSON.parse(line);
        results.push(data);
      } catch (error) {
        console.error(`Parse error: ${error.message}`);
      }
    }
  } finally {
    await file.close();
  }

  return results;
}
```

### 2. Log File Processing

```typescript
import { open } from "node:fs/promises";

async function processLogFile(filePath: string, filter: string) {
  const file = await open(filePath);
  const matchingLines = [];

  try {
    for await (const line of file.readLines({ encoding: "utf8" })) {
      if (line.includes(filter)) {
        matchingLines.push(line);
      }
    }
  } finally {
    await file.close();
  }

  return matchingLines;
}
```

### 3. CSV Processing

```typescript
import { open } from "node:fs/promises";

async function processCSV(filePath: string) {
  const file = await open(filePath);
  const rows = [];
  let headers: string[] = [];

  try {
    let isFirstLine = true;
    
    for await (const line of file.readLines({ encoding: "utf8" })) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      
      if (isFirstLine) {
        headers = columns;
        isFirstLine = false;
      } else {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header.trim()] = columns[index]?.trim() || '';
        });
        rows.push(row);
      }
    }
  } finally {
    await file.close();
  }

  return rows;
}
```

### 4. Large File Streaming

```typescript
import { open } from "node:fs/promises";

async function streamLargeFile(filePath: string, onLine: (line: string) => void) {
  const file = await open(filePath);
  
  try {
    for await (const line of file.readLines({ encoding: "utf8" })) {
      onLine(line);
    }
  } finally {
    await file.close();
  }
}

// Usage
await streamLargeFile("large-file.txt", (line) => {
  console.log(`Processing: ${line}`);
});
```

## Performance Comparison

### Before (Loading Entire File)

```typescript
// ❌ Loads entire file into memory
const content = await Bun.file("file.txt").text();
const lines = content.split('\n');
for (const line of lines) {
  // Process line
}
```

**Memory**: O(n) - entire file in memory
**Time**: Slower for large files

### After (Line-by-Line)

```typescript
// ✅ Processes line-by-line
const file = await open("file.txt");
try {
  for await (const line of file.readLines({ encoding: "utf8" })) {
    // Process line
  }
} finally {
  await file.close();
}
```

**Memory**: O(1) - constant memory usage
**Time**: Faster for large files

## Error Handling

```typescript
import { open } from "node:fs/promises";

async function safeReadLines(filePath: string) {
  let file;
  
  try {
    file = await open(filePath);
    
    for await (const line of file.readLines({ encoding: "utf8" })) {
      try {
        // Process line
        processLine(line);
      } catch (error) {
        console.error(`Error processing line: ${error.message}`);
        // Continue processing
      }
    }
  } catch (error) {
    console.error(`File error: ${error.message}`);
    throw error;
  } finally {
    if (file) {
      await file.close();
    }
  }
}
```

## Best Practices

1. **Always Close Files**: Use `try/finally` to ensure files are closed
2. **Handle Empty Lines**: Check `line.trim()` before processing
3. **Error Handling**: Wrap line processing in try/catch
4. **Encoding**: Always specify encoding for text files
5. **Memory**: Use for large files that don't fit in memory

## Integration with Arbitrage Platform

See `src/utils/odds-file-processor.ts` for a complete example of using `readLines()` for processing odds files in the arbitrage platform.




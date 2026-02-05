# Bun.utils API Reference

Complete guide to Bun-native utility APIs, globals, and best practices for replacing Node.js patterns.

## Overview

Bun provides native implementations of common utilities that are faster, more efficient, and require zero dependencies. Bun also implements a comprehensive set of global objects from Web APIs, Node.js, and Bun-specific APIs. Following the Hyper-Bun manifesto, prefer Bun-native APIs over Node.js patterns.

## Table of Contents

- [Global Objects](#global-objects)
- [Binary Data & TypedArrays](#binary-data--typedarrays)
- [File Operations](#file-operations)
- [Cryptographic Hashing](#cryptographic-hashing)
- [Timing & Performance](#timing--performance)
- [Debugging & Inspection](#debugging--inspection)
- [File Pattern Matching](#file-pattern-matching)
- [Environment Variables](#environment-variables)
- [Process Control](#process-control)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Global Objects

Bun implements a comprehensive set of global objects from Web APIs, Node.js, and Bun-specific APIs. These are available without imports.

### Web API Globals

Bun implements the full Web API standard, including:

#### Fetch API
```typescript
// ✅ Available globally - no imports needed
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// Request and Response are also global
const request = new Request('https://api.example.com/data');
const response2 = await fetch(request);
```

#### Streams API
```typescript
// ✅ ReadableStream, WritableStream, TransformStream available globally
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('Hello');
    controller.close();
  },
});

const reader = stream.getReader();
const { value } = await reader.read();
```

#### Crypto API
```typescript
// ✅ Web Crypto API available globally
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Also available: crypto.randomUUID()
const uuid = crypto.randomUUID();
```

#### URL API
```typescript
// ✅ URL and URLSearchParams available globally
const url = new URL('https://example.com/path?query=value');
url.searchParams.set('new', 'param');
console.log(url.toString());
```

#### Encoding/Decoding
```typescript
// ✅ TextEncoder and TextDecoder available globally
const encoder = new TextEncoder();
const bytes = encoder.encode('Hello, Bun!');

const decoder = new TextDecoder();
const text = decoder.decode(bytes);

// Base64 encoding/decoding
const encoded = btoa('Hello, Bun!');
const decoded = atob(encoded);
```

#### FormData & Headers
```typescript
// ✅ FormData and Headers available globally
const formData = new FormData();
formData.append('name', 'Bun');
formData.append('file', Bun.file('data.txt'));

const headers = new Headers();
headers.set('Content-Type', 'application/json');
headers.set('Authorization', 'Bearer token');
```

#### Events
```typescript
// ✅ EventTarget, Event, CustomEvent available globally
const target = new EventTarget();
target.addEventListener('custom', (event) => {
  console.log('Event received:', event.detail);
});

target.dispatchEvent(new CustomEvent('custom', { detail: { data: 'value' } }));
```

### Node.js Globals

Bun maintains Node.js compatibility:

#### Process & Module System
```typescript
// ✅ process available globally
console.log(process.env.NODE_ENV);
console.log(process.cwd());
console.log(process.platform);

// ✅ __dirname and __filename available
console.log(__dirname);
console.log(__filename);

// ✅ require() and module.exports available
const fs = require('fs'); // Works, but prefer Bun.file()
```

#### Buffer
```typescript
// ✅ Buffer available globally (Node.js compatible)
const buffer = Buffer.from('Hello, Bun!', 'utf-8');
const string = buffer.toString('utf-8');
```

### Bun-Specific Globals

#### Bun Object
```typescript
// ✅ Bun object available globally
Bun.file('path.txt');
Bun.write('file.txt', 'content');
Bun.nanoseconds();
Bun.inspect(obj);
new Bun.CryptoHasher('sha256');
new Bun.Glob('**/*.ts');
```

#### HTMLRewriter
```typescript
// ✅ HTMLRewriter available globally (Cloudflare Workers compatible)
const rewriter = new HTMLRewriter()
  .on('div', {
    element(el) {
      el.setAttribute('data-processed', 'true');
    },
  });

const transformed = rewriter.transform(new Response(html));
```

### Timing Globals

```typescript
// ✅ setTimeout, setInterval, setImmediate available globally
const timerId = setTimeout(() => {
  console.log('Delayed');
}, 1000);

clearTimeout(timerId);

// ✅ queueMicrotask available
queueMicrotask(() => {
  console.log('Microtask');
});
```

### Console & Debugging

```typescript
// ✅ console available globally with enhanced features
console.log('Standard log');
console.error('Error');
console.warn('Warning');
console.info('Info');
console.debug('Debug');

// Bun enhances console with better formatting
console.log(Bun.inspect(obj, { colors: true }));
```

### Command-Line Tools

```typescript
// ✅ alert, confirm, prompt available for CLI tools
const confirmed = confirm('Do you want to continue?');
if (confirmed) {
  const name = prompt('Enter your name:');
  alert(`Hello, ${name}!`);
}
```

### Complete Global Reference

| Global | Source | Notes |
|--------|--------|-------|
| **Web API Globals** | | |
| `fetch`, `Request`, `Response` | Web | Fetch API - no imports needed |
| `Headers`, `FormData` | Web | HTTP utilities |
| `ReadableStream`, `WritableStream`, `TransformStream` | Web | Streams API |
| `crypto`, `Crypto`, `CryptoKey`, `SubtleCrypto` | Web | Web Crypto API |
| `URL`, `URLSearchParams` | Web | URL parsing and manipulation |
| `TextEncoder`, `TextDecoder` | Web | Text encoding/decoding |
| `atob()`, `btoa()` | Web | Base64 encoding/decoding |
| `EventTarget`, `Event`, `CustomEvent` | Web | Event system |
| `AbortController`, `AbortSignal` | Web | Request cancellation |
| `Blob` | Web | Binary large objects |
| `JSON` | Web | JSON parsing |
| `performance` | Web | Performance timing |
| `queueMicrotask()` | Web | Microtask scheduling |
| `setTimeout()`, `setInterval()`, `setImmediate()` | Web/Node.js | Timing functions |
| `clearTimeout()`, `clearInterval()`, `clearImmediate()` | Web/Node.js | Clear timers |
| **Node.js Globals** | | |
| `process` | Node.js | Process information and control |
| `Buffer` | Node.js | Binary data handling |
| `__dirname`, `__filename` | Node.js | File path references |
| `require()`, `module`, `exports` | Node.js | CommonJS module system |
| `global`, `globalThis` | Node.js/Web | Global object reference |
| **Bun-Specific Globals** | | |
| `Bun` | Bun | Bun runtime APIs (file, crypto, glob, etc.) |
| `HTMLRewriter` | Cloudflare | HTML transformation (Cloudflare Workers compatible) |
| `BuildMessage` | Bun | Build-time messages |
| `ResolveMessage` | Bun | Module resolution messages |
| **Console & CLI** | | |
| `console` | Web | Enhanced console with Bun.inspect() |
| `alert()`, `confirm()`, `prompt()` | Web | CLI interaction (command-line tools) |
| **Stream Controllers** | | |
| `ReadableByteStreamController` | Web | Byte stream controller |
| `ReadableStreamDefaultController` | Web | Default stream controller |
| `ReadableStreamDefaultReader` | Web | Stream reader |
| `WritableStreamDefaultController` | Web | Writable stream controller |
| `WritableStreamDefaultWriter` | Web | Stream writer |
| `TransformStreamDefaultController` | Web | Transform stream controller |
| **Queuing Strategies** | | |
| `ByteLengthQueuingStrategy` | Web | Byte length queuing |
| `CountQueuingStrategy` | Web | Count queuing |
| **Other Web APIs** | | |
| `WebAssembly` | Web | WebAssembly support |
| `ShadowRealm` | Web | Stage 3 proposal |
| `DOMException` | Web | DOM exceptions |
| `reportError()` | Web | Error reporting |

### Best Practices for Globals

1. **Prefer Web Standards**: Use Web API globals over Node.js equivalents when possible
   ```typescript
   // ✅ Good - Web Standard
   const response = await fetch(url);
   
   // ❌ Avoid - Node.js specific
   const http = require('http');
   ```

2. **Use Bun-Specific APIs**: Leverage Bun globals for better performance
   ```typescript
   // ✅ Good - Bun-native
   Bun.file('path.txt');
   
   // ❌ Avoid - Node.js fs
   const fs = require('fs');
   ```

3. **No Imports Needed**: Remember that globals don't require imports
   ```typescript
   // ✅ Works - fetch is global
   const response = await fetch(url);
   
   // ❌ Unnecessary
   import { fetch } from 'undici';
   ```

---

## Binary Data & TypedArrays

Bun fully supports Web Standards for binary data handling, including TypedArrays, ArrayBuffer, and DataView. These APIs provide efficient, type-safe ways to work with binary data and are fully compatible with Bun's native APIs.

> **See also**: 
> - [Bun's official Binary Data documentation](https://bun.com/docs/runtime/binary-data) for complete details on binary data manipulation and conversion
> - [API Examples](../src/api/examples.ts) - Code examples for all conversion patterns (`GET /api/examples?category=Binary Data`)

### Binary Data Overview

Bun implements the complete Web Standards specification for binary data:

- **TypedArrays** - Type-specific views of binary data (Uint8Array, Int32Array, Float64Array, etc.)
- **ArrayBuffer** - Fixed-length raw binary data buffer
- **SharedArrayBuffer** - Shared memory buffer for multi-threaded operations
- **DataView** - Endianness-aware interface for reading/writing binary data

All of these APIs are available globally - no imports needed!

### TypedArrays

TypedArrays provide type-specific views of binary data. Bun supports all standard TypedArray types:

#### Available TypedArray Types

| Type | Element Size | Description |
|------|--------------|-------------|
| `Int8Array` | 1 byte | Signed 8-bit integers (-128 to 127) |
| `Uint8Array` | 1 byte | Unsigned 8-bit integers (0 to 255) |
| `Uint8ClampedArray` | 1 byte | Unsigned 8-bit integers clamped (0 to 255) |
| `Int16Array` | 2 bytes | Signed 16-bit integers (-32,768 to 32,767) |
| `Uint16Array` | 2 bytes | Unsigned 16-bit integers (0 to 65,535) |
| `Int32Array` | 4 bytes | Signed 32-bit integers (-2³¹ to 2³¹-1) |
| `Uint32Array` | 4 bytes | Unsigned 32-bit integers (0 to 2³²-1) |
| `BigInt64Array` | 8 bytes | Signed 64-bit integers (BigInt) |
| `BigUint64Array` | 8 bytes | Unsigned 64-bit integers (BigInt) |
| `Float32Array` | 4 bytes | 32-bit floating point numbers |
| `Float64Array` | 8 bytes | 64-bit floating point numbers |

#### Creating TypedArrays

```typescript
// Create from array literal
const uint8 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);

// Create with length (initialized to zeros)
const int32 = new Int32Array(10); // 10 elements, all zeros

// Create from ArrayBuffer
const buffer = new ArrayBuffer(16);
const uint8View = new Uint8Array(buffer);
const int32View = new Int32Array(buffer); // Same buffer, different view

// Create with byte offset and length
const buffer2 = new ArrayBuffer(32);
const offsetView = new Uint8Array(buffer2, 8, 8); // Start at byte 8, length 8

// Inspect TypedArrays with Bun.inspect()
const arr = new Uint8Array([1, 2, 3]);
const str = Bun.inspect(arr);
// => "Uint8Array(3) [ 1, 2, 3 ]"

// Inspect larger arrays (truncated display)
const large = new Uint8Array(1000).fill(42);
console.log(Bun.inspect(large));
// => "Uint8Array(1000) [ 42, 42, 42, ... 997 more items ]"
```

#### Working with Byte Offsets and Lengths

```typescript
const buffer = new ArrayBuffer(16);

// Create view starting at byte 4, length 8
const view = new Uint8Array(buffer, 4, 8);
console.log(view.byteOffset); // 4
console.log(view.byteLength); // 8
console.log(view.length); // 8 (number of elements)
```

#### Subarray Operations

```typescript
const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);

// Create subarray (shares same buffer)
const sub = arr.subarray(2, 5); // [2, 3, 4]
sub[0] = 99; // Modifies original array!
console.log(arr); // [0, 1, 99, 3, 4, 5, 6, 7]

// Create copy with slice (new buffer)
const copy = arr.slice(2, 5); // [2, 3, 4]
copy[0] = 88; // Does NOT modify original
console.log(arr); // [0, 1, 99, 3, 4, 5, 6, 7]
```

#### Integration with Bun.file()

```typescript
// Read file as ArrayBuffer
const file = Bun.file('data.bin');
const buffer = await file.arrayBuffer();

// Create TypedArray views
const uint8 = new Uint8Array(buffer);
const int32 = new Int32Array(buffer); // Same buffer, different interpretation

// Process binary data
for (let i = 0; i < uint8.length; i++) {
  console.log(`Byte ${i}: 0x${uint8[i].toString(16).padStart(2, '0')}`);
}
```

### ArrayBuffer

ArrayBuffer represents a fixed-length raw binary data buffer. It cannot be read or written directly - you must use TypedArrays or DataView.

#### Creating ArrayBuffers

```typescript
// Create with size in bytes
const buffer = new ArrayBuffer(16); // 16 bytes

// Get buffer properties
console.log(buffer.byteLength); // 16

// ArrayBuffer is immutable - cannot resize
// buffer.byteLength = 32; // ❌ Error: Cannot assign to read-only property
```

#### Converting Between Formats

```typescript
// String to TypedArray
const encoder = new TextEncoder();
const uint8 = encoder.encode('Hello, Bun!');

// TypedArray to string
const decoder = new TextDecoder();
const str = decoder.decode(uint8); // "Hello, Bun!"

// ArrayBuffer to TypedArray
const buffer = new ArrayBuffer(8);
const view = new Uint8Array(buffer);

// TypedArray to ArrayBuffer
const arr = new Uint8Array([1, 2, 3, 4]);
const buf = arr.buffer; // Get underlying ArrayBuffer
```

#### Memory Sharing and Views

```typescript
// Create buffer
const buffer = new ArrayBuffer(16);

// Multiple views share the same buffer
const uint8 = new Uint8Array(buffer);
const int32 = new Int32Array(buffer);

// Modifying one view affects others
uint8[0] = 0xFF;
console.log(int32[0]); // -1 (0xFFFFFFFF in two's complement)

// Views can overlap
const view1 = new Uint8Array(buffer, 0, 8);
const view2 = new Uint8Array(buffer, 4, 8); // Overlaps with view1
```

#### Working with Bun.file().arrayBuffer()

```typescript
// Read binary file
const file = Bun.file('image.png');
const buffer = await file.arrayBuffer();

// Process binary data
const uint8 = new Uint8Array(buffer);
console.log(`File size: ${buffer.byteLength} bytes`);
console.log(`PNG signature: ${uint8.slice(0, 8).map(b => b.toString(16)).join(' ')}`);

// Write binary data
const newBuffer = new ArrayBuffer(1024);
await Bun.write('output.bin', newBuffer);
```

### DataView

DataView provides a low-level interface for reading and writing binary data with explicit endianness control. This is essential for parsing binary formats where byte order matters.

#### Creating DataView from TypedArray

**Important Pattern**: When creating a DataView from a TypedArray, you must account for the TypedArray's byte offset and length:

```typescript
// ✅ Correct pattern - account for TypedArray's byte offset and length
const arr: Uint8Array = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

// This ensures DataView correctly references the TypedArray's portion of the buffer
// Even if the TypedArray is a subarray or has a byte offset
```

#### Why This Pattern Matters

```typescript
// Create buffer with offset
const buffer = new ArrayBuffer(16);
const arr = new Uint8Array(buffer, 8, 4); // Start at byte 8, length 4

// ❌ Wrong - DataView starts at beginning of buffer, not TypedArray's offset
const dvWrong = new DataView(arr.buffer);

// ✅ Correct - DataView matches TypedArray's view
const dvCorrect = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
```

#### Endianness Handling

```typescript
const buffer = new ArrayBuffer(4);
const dv = new DataView(buffer);

// Write in little-endian (default on most systems)
dv.setUint32(0, 0x12345678, true); // littleEndian = true

// Read back
const le = dv.getUint32(0, true); // 0x12345678

// Write in big-endian (network byte order)
dv.setUint32(0, 0x12345678, false); // littleEndian = false

// Read back
const be = dv.getUint32(0, false); // 0x12345678 (but bytes are swapped)
```

#### Reading/Writing Different Data Types

```typescript
const buffer = new ArrayBuffer(16);
const dv = new DataView(buffer);

// Write different types
dv.setInt8(0, -128);           // Signed 8-bit
dv.setUint8(1, 255);          // Unsigned 8-bit
dv.setInt16(2, -32768, true);  // Signed 16-bit (little-endian)
dv.setUint16(4, 65535, true);  // Unsigned 16-bit (little-endian)
dv.setInt32(6, -2147483648, true);  // Signed 32-bit (little-endian)
dv.setUint32(10, 4294967295, true); // Unsigned 32-bit (little-endian)
dv.setFloat32(14, 3.14159, true);   // 32-bit float (little-endian)
dv.setFloat64(18, Math.PI, true);    // 64-bit float (little-endian)

// Read back
const int8 = dv.getInt8(0);
const uint8 = dv.getUint8(1);
const int16 = dv.getInt16(2, true);
const uint16 = dv.getUint16(4, true);
const int32 = dv.getInt32(6, true);
const uint32 = dv.getUint32(10, true);
const float32 = dv.getFloat32(14, true);
const float64 = dv.getFloat64(18, true);
```

#### Converting DataView to String

If a DataView contains ASCII-encoded text (or UTF-8), you can convert it to a string using the `TextDecoder` class:

```typescript
// DataView containing ASCII/UTF-8 encoded text
const buffer = new ArrayBuffer(12);
const dv = new DataView(buffer);

// Write ASCII bytes manually
const textBytes = [0x48, 0x65, 0x6C, 0x6C, 0x6F]; // "Hello"
for (let i = 0; i < textBytes.length; i++) {
  dv.setUint8(i, textBytes[i]);
}

// Convert DataView to string
const decoder = new TextDecoder();
const str = decoder.decode(dv); // "Hello"

// Alternative: Use the underlying buffer
const str2 = decoder.decode(dv.buffer); // Also works

// Alternative: Create TypedArray view
const uint8 = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
const str3 = decoder.decode(uint8); // Also works
```

**Note**: `TextDecoder.decode()` accepts DataView, ArrayBuffer, or TypedArray directly. When using a DataView, it will decode from the DataView's byte offset through its byte length.

```typescript
// DataView with offset (only decode the relevant portion)
const buffer = new ArrayBuffer(20);
const dv = new DataView(buffer, 5, 5); // Start at byte 5, length 5

// Write text at offset
const textBytes = [0x57, 0x6F, 0x72, 0x6C, 0x64]; // "World"
for (let i = 0; i < textBytes.length; i++) {
  dv.setUint8(i, textBytes[i]);
}

// Decode only the DataView portion
const decoder = new TextDecoder();
const str = decoder.decode(dv); // "World" (only bytes 5-9)
```

#### Practical Binary Format Parsing

```typescript
// Parse a simple binary format: [magic: 4 bytes][count: uint32][data: count bytes]

async function parseBinaryFormat(filePath: string) {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const dv = new DataView(buffer);
  
  // Read magic number (4 bytes as string)
  const magicBytes = new Uint8Array(buffer, 0, 4);
  const magic = new TextDecoder().decode(magicBytes);
  
  // Read count (uint32, little-endian)
  const count = dv.getUint32(4, true);
  
  // Read data (count bytes starting at offset 8)
  const data = new Uint8Array(buffer, 8, count);
  
  return { magic, count, data };
}

// Usage
const parsed = await parseBinaryFormat('data.bin');
console.log(`Magic: ${parsed.magic}, Count: ${parsed.count}`);
```

### Conversion

Bun supports comprehensive conversion between all binary data types. Here are complete conversion patterns:

> **💡 Tip**: See [API Examples](../src/api/examples.ts) for more code examples. Access via:
> - API: `GET /api/examples?category=Binary Data`
> - Code: `import { getExamplesByCategory } from './api/examples'; getExamplesByCategory('Binary Data')`
> - Available examples: TypedArrays/ArrayBuffer/DataView, ArrayBuffer Conversions, TypedArray Conversions, DataView Conversions, Blob Conversions, BunFile Conversions, Bun.CryptoHasher with Binary Data

#### From ArrayBuffer

```typescript
const buffer = new ArrayBuffer(16);

// To TypedArray
const uint8 = new Uint8Array(buffer);
const int32 = new Int32Array(buffer);

// To DataView
const dv = new DataView(buffer);

// To Buffer (Node.js compatible)
const nodeBuffer = Buffer.from(buffer);

// To string
const decoder = new TextDecoder();
const str = decoder.decode(buffer);

// To number[]
const uint8Array = new Uint8Array(buffer);
const numbers = Array.from(uint8Array);

// To Blob
const blob = new Blob([buffer]);

// To ReadableStream
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array(buffer));
    controller.close();
  },
});
```

#### From TypedArray

```typescript
const arr = new Uint8Array([1, 2, 3, 4]);

// To ArrayBuffer
const buffer = arr.buffer; // Shared buffer
const bufferCopy = arr.slice().buffer; // New buffer (copy)

// To DataView
const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

// To Buffer (Node.js compatible)
const nodeBuffer = Buffer.from(arr);

// To string
const decoder = new TextDecoder();
const str = decoder.decode(arr);

// To number[]
const numbers = Array.from(arr);

// To Blob
const blob = new Blob([arr]);

// To ReadableStream
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(arr);
    controller.close();
  },
});
```

#### From DataView

```typescript
const buffer = new ArrayBuffer(16);
const dv = new DataView(buffer, 4, 8); // Offset 4, length 8

// To ArrayBuffer
const fullBuffer = dv.buffer; // Full buffer
const sliceBuffer = dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength); // Only DataView portion

// To TypedArray
const uint8 = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);

// To Buffer (Node.js compatible)
const nodeBuffer = Buffer.from(dv.buffer, dv.byteOffset, dv.byteLength);

// To string
const decoder = new TextDecoder();
const str = decoder.decode(dv); // Direct conversion

// To number[]
const uint8Array = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
const numbers = Array.from(uint8Array);

// To Blob
const blob = new Blob([dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength)]);

// To ReadableStream
const stream = new ReadableStream({
  start(controller) {
    const uint8 = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    controller.enqueue(uint8);
    controller.close();
  },
});
```

#### From Buffer (Node.js)

```typescript
const nodeBuffer = Buffer.from('Hello, Bun!');

// To ArrayBuffer
const buffer = nodeBuffer.buffer.slice(
  nodeBuffer.byteOffset,
  nodeBuffer.byteOffset + nodeBuffer.byteLength
);

// To TypedArray
const uint8 = new Uint8Array(nodeBuffer);

// To DataView
const dv = new DataView(
  nodeBuffer.buffer,
  nodeBuffer.byteOffset,
  nodeBuffer.byteLength
);

// To string
const str = nodeBuffer.toString('utf-8');
// Or using TextDecoder
const decoder = new TextDecoder();
const str2 = decoder.decode(nodeBuffer);

// To number[]
const numbers = Array.from(nodeBuffer);

// To Blob
const blob = new Blob([nodeBuffer]);

// To ReadableStream
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array(nodeBuffer));
    controller.close();
  },
});
```

#### From Blob

```typescript
const blob = new Blob(['Hello, Bun!'], { type: 'text/plain' });

// To ArrayBuffer
const buffer = await blob.arrayBuffer();

// To TypedArray
const buffer2 = await blob.arrayBuffer();
const uint8 = new Uint8Array(buffer2);

// To DataView
const buffer3 = await blob.arrayBuffer();
const dv = new DataView(buffer3);

// To Buffer (Node.js compatible)
const buffer4 = await blob.arrayBuffer();
const nodeBuffer = Buffer.from(buffer4);

// To string
const str = await blob.text();

// To number[]
const buffer5 = await blob.arrayBuffer();
const uint8Array = new Uint8Array(buffer5);
const numbers = Array.from(uint8Array);

// To ReadableStream
const stream = blob.stream();
```

#### From ReadableStream

```typescript
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array([1, 2, 3, 4]));
    controller.close();
  },
});

// To ArrayBuffer
const reader = stream.getReader();
const chunks: Uint8Array[] = [];
let result;
while (!(result = await reader.read()).done) {
  chunks.push(result.value);
}
const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
const buffer = new ArrayBuffer(totalLength);
const view = new Uint8Array(buffer);
let offset = 0;
for (const chunk of chunks) {
  view.set(chunk, offset);
  offset += chunk.length;
}

// To Uint8Array
const reader2 = stream.getReader();
const chunks2: Uint8Array[] = [];
let result2;
while (!(result2 = await reader2.read()).done) {
  chunks2.push(result2.value);
}
const totalLength2 = chunks2.reduce((sum, chunk) => sum + chunk.length, 0);
const uint8 = new Uint8Array(totalLength2);
let offset2 = 0;
for (const chunk of chunks2) {
  uint8.set(chunk, offset2);
  offset2 += chunk.length;
}

// To TypedArray (from Uint8Array)
const int32 = new Int32Array(uint8.buffer);

// To DataView
const dv = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);

// To Buffer (Node.js compatible)
const nodeBuffer = Buffer.from(uint8);

// To string
const decoder = new TextDecoder();
const str = decoder.decode(uint8);

// To number[]
const numbers = Array.from(uint8);

// To Blob
const blob = new Blob([uint8]);

// To ReadableStream (recreate)
const newStream = new ReadableStream({
  start(controller) {
    controller.enqueue(uint8);
    controller.close();
  },
});
```

#### BunFile Conversions

```typescript
const file = Bun.file('data.bin');

// To ArrayBuffer
const buffer = await file.arrayBuffer();

// To TypedArray
const buffer2 = await file.arrayBuffer();
const uint8 = new Uint8Array(buffer2);

// To DataView
const buffer3 = await file.arrayBuffer();
const dv = new DataView(buffer3);

// To Buffer (Node.js compatible)
const buffer4 = await file.arrayBuffer();
const nodeBuffer = Buffer.from(buffer4);

// To string
const str = await file.text();

// To number[]
const buffer5 = await file.arrayBuffer();
const uint8Array = new Uint8Array(buffer5);
const numbers = Array.from(uint8Array);

// To Blob
const blob = await file.blob();

// To ReadableStream
const stream = file.stream();
```

### Integration with Bun APIs

#### Bun.file() and ArrayBuffer

```typescript
// Read file as ArrayBuffer
const file = Bun.file('binary.data');
const buffer = await file.arrayBuffer();

// Process with TypedArrays
const uint8 = new Uint8Array(buffer);
const dataView = new DataView(buffer);

// Parse binary format
const header = dataView.getUint32(0, true);
const payload = uint8.slice(4);
```

#### Bun.write() with TypedArrays

```typescript
// Write TypedArray directly
const data = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
await Bun.write('output.bin', data);

// Write ArrayBuffer
const buffer = new ArrayBuffer(1024);
await Bun.write('output.bin', buffer);

// Write DataView's buffer
const dv = new DataView(new ArrayBuffer(8));
dv.setUint32(0, 0x12345678, true);
await Bun.write('output.bin', dv.buffer);
```

#### Bun.CryptoHasher with Binary Data

```typescript
// Hash binary data
const hasher = new Bun.CryptoHasher('sha256');

// Update with TypedArray
const data = new Uint8Array([1, 2, 3, 4]);
hasher.update(data);

// Update with ArrayBuffer
const buffer = new ArrayBuffer(8);
hasher.update(buffer);

// Digest returns Uint8Array
const hash = hasher.digest(); // Uint8Array
console.log(`Hash length: ${hash.length} bytes`);

// Convert to hex string
const hexHash = hasher.digest('hex');
console.log(`Hash: ${hexHash}`);
```

#### HTMLRewriter with ArrayBuffer

```typescript
// Process binary HTML content
const htmlFile = Bun.file('template.html');
const buffer = await htmlFile.arrayBuffer();

// Convert to text for HTMLRewriter
const text = new TextDecoder().decode(new Uint8Array(buffer));

// Transform with HTMLRewriter
const rewriter = new HTMLRewriter()
  .on('img', {
    element(el) {
      // Process image references
    },
  });

const transformed = rewriter.transform(new Response(text));
const result = await transformed.text();

// Write back as binary if needed
const resultBuffer = new TextEncoder().encode(result);
await Bun.write('output.html', resultBuffer);
```

### Standards & Compatibility

Bun fully implements Web Standards for binary data handling:

#### Web Standards Compliance

- **TypedArray Specification** - ECMAScript 2023 (ES2023) compliant
- **ArrayBuffer Specification** - Web IDL standard compliant
- **DataView Specification** - Web IDL standard compliant
- **SharedArrayBuffer** - Available (with proper security headers in web contexts)

#### TypedArray Specification

Bun implements the complete TypedArray specification:
- All 11 TypedArray types supported
- Proper byte alignment and element sizes
- Subarray and slice operations
- Buffer sharing semantics
- Iterator support (`for...of`, `Array.from()`)

#### ArrayBuffer Specification

- Fixed-length binary data buffer
- Immutable byte length
- Transferable objects (for `postMessage()`)
- Proper memory management

#### DataView Specification

- Endianness-aware read/write operations
- All numeric types supported (int8/16/32, uint8/16/32, float32/64, BigInt64/64)
- Bounds checking
- Proper byte offset and length handling

#### Compatibility with Node.js Buffer

Bun's `Buffer` is compatible with Node.js, but TypedArrays are preferred:

```typescript
// Node.js Buffer (works in Bun)
const nodeBuffer = Buffer.from('Hello');
const uint8 = new Uint8Array(nodeBuffer); // Convert to TypedArray

// TypedArray to Buffer
const arr = new Uint8Array([1, 2, 3]);
const buffer = Buffer.from(arr); // Convert to Node.js Buffer

// Prefer TypedArrays for new code
const typedArray = new Uint8Array([1, 2, 3]); // ✅ Web Standard
```

#### Performance Considerations

```typescript
// TypedArrays are optimized in Bun
const largeArray = new Uint8Array(1_000_000);

// Direct access is fastest
for (let i = 0; i < largeArray.length; i++) {
  largeArray[i] = i % 256;
}

// Subarray is efficient (shares buffer)
const sub = largeArray.subarray(0, 1000); // No copy!

// Slice creates copy (use when needed)
const copy = largeArray.slice(0, 1000); // New buffer
```

---

## File Operations

### Bun.file()

Bun-native file API - no `fs` imports needed!

#### Reading Files

```typescript
// ❌ Node.js pattern
import { readFileSync } from 'fs';
const content = readFileSync('file.txt', 'utf-8');

// ✅ Bun-native pattern
const file = Bun.file('file.txt');
const content = await file.text();
```

#### Writing Files

```typescript
// ❌ Node.js pattern
import { writeFileSync } from 'fs';
writeFileSync('file.txt', 'content');

// ✅ Bun-native pattern
await Bun.write('file.txt', 'content');
// Or
const file = Bun.file('file.txt');
await Bun.write(file, 'content');
```

#### File Operations API

```typescript
const file = Bun.file('path/to/file.txt');

// Check if file exists
const exists = await file.exists();

// Get file size
const size = file.size; // bytes

// Get MIME type
const type = file.type; // e.g., 'text/plain'

// Read as text
const text = await file.text();

// Read as JSON
const json = await file.json();

// Read as ArrayBuffer
const buffer = await file.arrayBuffer();

// Read as Blob
const blob = await file.blob();

// Write to file
await Bun.write(file, content);
const bytesWritten = await Bun.write('path.txt', content);
```

#### Supported Input Types for Bun.write()

```typescript
// String
await Bun.write('file.txt', 'text content');

// ArrayBuffer
await Bun.write('file.bin', arrayBuffer);

// Blob
await Bun.write('file.txt', blob);

// File
const source = Bun.file('source.txt');
await Bun.write('dest.txt', source);

// Response
const response = await fetch('https://example.com/file.txt');
await Bun.write('file.txt', response);

// ReadableStream
await Bun.write('file.txt', readableStream);
```

---

## Cryptographic Hashing

### Bun.CryptoHasher

Fast cryptographic hashing - better performance than Node.js `crypto`.

#### Basic Usage

```typescript
// ❌ Node.js pattern
import { createHash } from 'crypto';
const hash = createHash('sha256').update('data').digest('hex');

// ✅ Bun-native pattern
const hasher = new Bun.CryptoHasher('sha256');
hasher.update('data');
const hash = hasher.digest('hex');
```

#### Supported Algorithms

- `sha256` - SHA-256 (recommended)
- `sha1` - SHA-1 (legacy)
- `md5` - MD5 (legacy, not cryptographically secure)

#### Digest Formats

```typescript
const hasher = new Bun.CryptoHasher('sha256');
hasher.update('data');

// Hex string (most common)
const hex = hasher.digest('hex'); // "e3b0c44298fc1c149afbf4c8996fb924..."

// Binary (Uint8Array)
const binary = hasher.digest(); // Uint8Array

// Base64
const base64 = hasher.digest('base64'); // "47DEQpj8HBSa+/TImW+5JC..."
```

#### Streaming Large Data

```typescript
const hasher = new Bun.CryptoHasher('sha256');

// Update multiple times
hasher.update('chunk1');
hasher.update('chunk2');
hasher.update('chunk3');

// Final digest
const hash = hasher.digest('hex');
```

#### Performance Comparison

Bun.CryptoHasher is significantly faster than Node.js crypto:

```typescript
// Benchmark: 1000 SHA-256 hashes
// Bun.CryptoHasher: ~50ms
// Node.js crypto: ~120ms
// Speed improvement: ~2.4x faster
```

---

## Timing & Performance

### Bun.nanoseconds()

High-precision timing with nanosecond accuracy - better than `performance.now()`.

#### Basic Usage

```typescript
// ❌ Node.js pattern
const start = performance.now();
// ... do work ...
const duration = performance.now() - start; // millisecond precision

// ✅ Bun-native pattern
const start = Bun.nanoseconds();
// ... do work ...
const duration = Bun.nanoseconds() - start; // nanosecond precision
```

#### Precision Comparison

```typescript
// performance.now() - millisecond precision (3 decimal places)
const perfStart = performance.now();
await Bun.sleep(1);
const perfDuration = performance.now() - perfStart; // ~1.234 ms

// Bun.nanoseconds() - nanosecond precision (9 decimal places)
const nsStart = Bun.nanoseconds();
await Bun.sleep(1);
const nsDuration = Bun.nanoseconds() - nsStart; // ~1234567 ns
```

#### Converting Units

```typescript
const durationNs = Bun.nanoseconds() - startNs;

// Convert to milliseconds
const durationMs = durationNs / 1_000_000;

// Convert to microseconds
const durationUs = durationNs / 1_000;

// Convert to seconds
const durationS = durationNs / 1_000_000_000;
```

#### Benchmarking Example

```typescript
function benchmark(fn: () => void | Promise<void>) {
  const start = Bun.nanoseconds();
  await fn();
  const duration = (Bun.nanoseconds() - start) / 1_000_000;
  return duration; // milliseconds
}

const time = await benchmark(async () => {
  // Your code here
});
console.log(`Execution time: ${time.toFixed(3)} ms`);
```

---

## Debugging & Inspection

### Bun.inspect()

Better than `util.inspect()` - optimized for Bun runtime. Supports custom inspection via `[Bun.inspect.custom]` symbol.

#### Basic Usage

```typescript
// ❌ Node.js pattern
import { inspect } from 'util';
console.log(inspect(obj));

// ✅ Bun-native pattern
console.log(Bun.inspect(obj));
```

#### Options

```typescript
interface InspectOptions {
  colors?: boolean;    // Enable ANSI colors (default: true)
  depth?: number;      // Max depth to recurse (default: 2)
  sorted?: boolean;    // Sort object keys (default: false)
  compact?: boolean;   // Compact output (default: false)
}

// With options
console.log(Bun.inspect(obj, {
  colors: true,
  depth: 3,
  sorted: true,
  compact: false,
}));
```

#### Examples

```typescript
const obj = {
  name: 'Bun',
  version: '1.4+',
  nested: {
    deep: {
      value: 42,
    },
  },
};

// Default (colors enabled, depth 2)
console.log(Bun.inspect(obj));

// Compact mode
console.log(Bun.inspect(obj, { compact: true }));

// Deep inspection
console.log(Bun.inspect(obj, { depth: 5 }));

// No colors (for logging)
console.log(Bun.inspect(obj, { colors: false }));
```

#### Custom Inspection

You can implement custom inspection for your classes using the `[Bun.inspect.custom]` symbol:

```typescript
import { inspect } from 'bun';

class BinaryTagCollection {
  private tags: Array<{ key: string; value?: Uint8Array }> = [];
  private cache = new Map<string, ArrayBuffer>();

  [inspect.custom](depth: number, options: any): string {
    if (depth < 0) {
      return options.stylize('[BinaryTagCollection]', 'special');
    }

    const lines = [
      `${options.stylize('BinaryTagCollection', 'special')} (${this.tags.length} tags)`,
      `  ${options.stylize('cache', 'string')}: ${this.cache.size} cached binaries`,
    ];

    // Show tag summary
    if (this.tags.length > 0) {
      lines.push(`  ${options.stylize('tags', 'string')}:`);
      this.tags.slice(0, 5).forEach((tag, i) => {
        const truncated = tag.value?.toString().substring(0, 50) || 'undefined';
        lines.push(`    [${i}] ${tag.key}=${truncated}${truncated.length > 50 ? '...' : ''}`);
      });
      if (this.tags.length > 5) {
        lines.push(`    ... and ${this.tags.length - 5} more`);
      }
    }

    return options.colors 
      ? lines.join('\n')
      : lines.map(l => l.replace(/\u001b\[\d+m/g, '')).join('\n');
  }
}

// Usage
const collection = new BinaryTagCollection();
console.log(Bun.inspect(collection));
// => BinaryTagCollection (0 tags)
//      cache: 0 cached binaries
```

See [BinaryTagCollection](../src/utils/binary-tag-collection.ts) for a complete example with performance tracking.

#### Console Depth Control

Bun supports controlling console output depth via the `--console-depth` CLI argument:

```bash
# Set console depth to 7 levels
bun --console-depth=7 run script.ts

# Default depth is 2
bun run script.ts
```

**Custom Array Inspection**: Use `Bun.inspect.custom` for custom array formatting:

```typescript
class MarketDataArray {
  [Bun.inspect.custom](depth: number, options: any): string {
    // Custom formatting that respects depth parameter
    return formatArray(this.items, depth);
  }
}
```

📚 **See Also**: [Console Depth Debugging Features (7.0.0.0.0.0.0)](../7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md) for comprehensive documentation on console depth control and custom array inspection for Hyper-Bun debugging.

---

## File Pattern Matching

### Bun.Glob()

Fast file pattern matching - no external glob packages needed.

#### Basic Usage

```typescript
// ❌ Node.js pattern
import { glob } from 'glob';
const files = await glob('**/*.ts');

// ✅ Bun-native pattern
const glob = new Bun.Glob('**/*.ts');
const files: string[] = [];
for await (const file of glob.scan('.')) {
  files.push(file);
}
```

#### Pattern Syntax

```typescript
// Match all TypeScript files
new Bun.Glob('*.ts');

// Recursive match
new Bun.Glob('**/*.ts');

// Match in specific directory
new Bun.Glob('src/**/*.ts');

// Multiple patterns
new Bun.Glob('*.{ts,tsx}');

// Exclude patterns
new Bun.Glob('**/*.ts', { exclude: ['**/*.test.ts'] });
```

#### Scanning Directories

```typescript
const glob = new Bun.Glob('**/*.ts');

// Scan current directory
for await (const file of glob.scan('.')) {
  console.log(file);
}

// Scan specific directory
for await (const file of glob.scan('./src')) {
  console.log(file);
}

// Collect all matches
const files: string[] = [];
for await (const file of glob.scan('.')) {
  files.push(file);
}
```

#### Performance

Bun.Glob is significantly faster than npm glob packages:

```typescript
// Benchmark: Matching 10,000 files
// Bun.Glob: ~50ms
// npm glob: ~200ms
// Speed improvement: ~4x faster
```

---

## Environment Variables

### Bun.env

Access environment variables - compatible with `process.env` but Bun-native.

#### Basic Usage

```typescript
// ❌ Node.js pattern (still works, but prefer Bun.env)
const port = process.env.PORT || '3000';

// ✅ Bun-native pattern
const port = Bun.env.PORT || '3000';
```

#### Type Safety

```typescript
// Bun.env provides better TypeScript inference
const port = parseInt(Bun.env.PORT || '3000', 10);
const apiKey = Bun.env.API_KEY || '';
```

#### Setting Environment Variables

```typescript
// Set for current process
Bun.env.MY_VAR = 'value';

// Read
const value = Bun.env.MY_VAR;
```

---

## Process Control

### Process Exit

Bun is Node.js-compatible, so `process.exit()` works as expected:

```typescript
// Works in Bun (Node.js compatible)
process.exit(1);

// Note: Bun doesn't have a separate Bun.exit() API
// process.exit() is the standard way to exit
```

### Graceful Shutdown

Bun handles SIGINT/SIGTERM automatically. For custom cleanup:

```typescript
const server = Bun.serve({
  // ... server config
});

// Bun handles shutdown automatically
// For custom cleanup, use server.stop()
```

---

## Best Practices

### 1. Prefer Bun-Native APIs

Always use Bun-native APIs when available:

```typescript
// ✅ Good
const file = Bun.file('data.json');
const data = await file.json();

// ❌ Avoid
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('data.json', 'utf-8'));
```

### 2. Use Async/Await

Bun file operations are async - use async/await:

```typescript
// ✅ Good
const content = await Bun.file('file.txt').text();

// ❌ Avoid
Bun.file('file.txt').text().then(content => {
  // ...
});
```

### 3. Error Handling

Always handle errors for file operations:

```typescript
try {
  const file = Bun.file('file.txt');
  if (await file.exists()) {
    const content = await file.text();
  }
} catch (error) {
  console.error('File operation failed:', error);
}
```

### 4. Performance Monitoring

Use `Bun.nanoseconds()` for precise timing:

```typescript
const start = Bun.nanoseconds();
// ... operation ...
const duration = (Bun.nanoseconds() - start) / 1_000_000;
console.log(`Operation took ${duration.toFixed(3)} ms`);
```

### 5. Type Safety

Leverage TypeScript for type safety:

```typescript
interface Config {
  port: number;
  apiKey: string;
}

const configFile = Bun.file('config.json');
const config: Config = await configFile.json();
```

---

## Migration Guide

### From Node.js to Bun-Native

#### File Operations

```typescript
// Before (Node.js)
import { readFileSync, writeFileSync, existsSync } from 'fs';

const content = readFileSync('file.txt', 'utf-8');
writeFileSync('file.txt', 'new content');
const exists = existsSync('file.txt');

// After (Bun-native)
const file = Bun.file('file.txt');
const content = await file.text();
await Bun.write(file, 'new content');
const exists = await file.exists();
```

#### Crypto

```typescript
// Before (Node.js)
import { createHash } from 'crypto';
const hash = createHash('sha256').update('data').digest('hex');

// After (Bun-native)
const hasher = new Bun.CryptoHasher('sha256');
hasher.update('data');
const hash = hasher.digest('hex');
```

#### Timing

```typescript
// Before (Node.js)
const start = performance.now();
// ... work ...
const duration = performance.now() - start;

// After (Bun-native)
const start = Bun.nanoseconds();
// ... work ...
const duration = (Bun.nanoseconds() - start) / 1_000_000; // ms
```

#### Inspection

```typescript
// Before (Node.js)
import { inspect } from 'util';
console.log(inspect(obj));

// After (Bun-native)
console.log(Bun.inspect(obj));
```

#### Glob Patterns

```typescript
// Before (Node.js)
import { glob } from 'glob';
const files = await glob('**/*.ts');

// After (Bun-native)
const glob = new Bun.Glob('**/*.ts');
const files: string[] = [];
for await (const file of glob.scan('.')) {
  files.push(file);
}
```

#### Binary Data

```typescript
// Before (Node.js)
import { readFileSync } from 'fs';
const buffer = readFileSync('data.bin');
const uint8 = new Uint8Array(buffer);

// After (Bun-native - Web Standards)
const file = Bun.file('data.bin');
const buffer = await file.arrayBuffer();
const uint8 = new Uint8Array(buffer);

// DataView pattern (works in both, but Bun prefers Web Standards)
const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
const value = dv.getUint32(0, true); // little-endian
```

---

## Integration Examples

### HTMLRewriter + Bun.utils

```typescript
const HTMLRewriter = globalThis.HTMLRewriter;

// Read HTML file
const htmlFile = Bun.file('template.html');
const html = await htmlFile.text();

// Transform with HTMLRewriter
const rewriter = new HTMLRewriter()
  .on('div[data-hash]', {
    element(el) {
      // Use Bun.CryptoHasher
      const content = el.textContent || '';
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(content);
      const hash = hasher.digest('hex');
      el.setAttribute('data-hash', hash);
    },
  });

// Measure transformation time
const start = Bun.nanoseconds();
const transformed = rewriter.transform(new Response(html));
const result = await transformed.text();
const duration = (Bun.nanoseconds() - start) / 1_000_000;

// Write result
await Bun.write('output.html', result);
console.log(`Transformed in ${duration.toFixed(3)} ms`);
```

### File Processing Pipeline

```typescript
// Process multiple files with Bun.Glob
const glob = new Bun.Glob('**/*.txt');
const hasher = new Bun.CryptoHasher('sha256');

for await (const filePath of glob.scan('.')) {
  const file = Bun.file(filePath);
  const content = await file.text();
  
  // Hash content
  hasher.update(content);
  const hash = hasher.digest('hex');
  
  // Process file
  console.log(`${filePath}: ${hash}`);
}
```

---

## Summary

### Key Benefits

1. **Zero Dependencies** - No need for `fs`, `crypto`, `util`, or glob packages
2. **Better Performance** - Native implementations are faster
3. **Type Safety** - Full TypeScript support
4. **Hyper-Bun Compliance** - Follows Hyper-Bun manifesto principles
5. **Modern API** - Async/await native, better ergonomics

### Quick Reference

| Node.js Pattern | Bun-Native Pattern |
|----------------|-------------------|
| `fs.readFileSync()` | `Bun.file().text()` |
| `fs.writeFileSync()` | `Bun.write()` |
| `crypto.createHash()` | `Bun.CryptoHasher` |
| `performance.now()` | `Bun.nanoseconds()` |
| `util.inspect()` | `Bun.inspect()` |
| `glob()` | `Bun.Glob()` |
| `process.env` | `Bun.env` (or `process.env` - both work) |
| `process.exit()` | `process.exit()` (Bun-compatible) |

---

## Quick Reference Card

### Globals (No Imports Needed)
```typescript
// Web APIs
const response = await fetch(url);
const url = new URL('https://example.com');
const formData = new FormData();
const headers = new Headers();
const uuid = crypto.randomUUID();

// Node.js
console.log(process.platform);
const buffer = Buffer.from('data');

// Bun
Bun.file('path.txt');
new HTMLRewriter();
```

### File Operations
```typescript
// Read
const file = Bun.file('path.txt');
const text = await file.text();
const json = await file.json();
const buffer = await file.arrayBuffer();

// Write
await Bun.write('path.txt', content);
await Bun.write(file, content);

// Info
const exists = await file.exists();
const size = file.size;
const type = file.type;
```

### Crypto
```typescript
const hasher = new Bun.CryptoHasher('sha256');
hasher.update(data);
const hash = hasher.digest('hex');
```

### Timing
```typescript
const start = Bun.nanoseconds();
// ... work ...
const duration = Bun.nanoseconds() - start;
const ms = duration / 1_000_000;
```

### Inspection
```typescript
console.log(Bun.inspect(obj, { colors: true, depth: 2 }));
```

### Glob
```typescript
const glob = new Bun.Glob('**/*.ts');
for await (const file of glob.scan('.')) {
  console.log(file);
}
```

### Binary Data & TypedArrays
```typescript
// TypedArrays
const uint8 = new Uint8Array([0x01, 0x02, 0x03]);
const int32 = new Int32Array(10); // 10 elements, zeros

// ArrayBuffer
const buffer = new ArrayBuffer(16);
const view = new Uint8Array(buffer);

// DataView (from TypedArray pattern)
const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
const value = dv.getUint32(0, true); // little-endian

// File operations
const file = Bun.file('data.bin');
const buffer = await file.arrayBuffer();
const uint8 = new Uint8Array(buffer);

// String conversion
const encoder = new TextEncoder();
const bytes = encoder.encode('Hello');
const decoder = new TextDecoder();
const str = decoder.decode(bytes);

// DataView to string
const dv = new DataView(buffer);
const str2 = decoder.decode(dv); // Direct conversion

// Conversions
const buffer = new ArrayBuffer(8);
const uint8 = new Uint8Array(buffer); // To TypedArray
const dv2 = new DataView(buffer); // To DataView
const nodeBuffer = Buffer.from(buffer); // To Buffer
const blob = new Blob([buffer]); // To Blob
const str3 = decoder.decode(buffer); // To string
const numbers = Array.from(new Uint8Array(buffer)); // To number[]

// Crypto with binary
const hasher = new Bun.CryptoHasher('sha256');
hasher.update(new Uint8Array([1, 2, 3]));
const hash = hasher.digest(); // Uint8Array
```

## See Also

- [Bun File I/O Documentation](https://bun.com/docs/api/file-io)
- [Bun Crypto Documentation](https://bun.com/docs/api/crypto)
- [Bun Utilities Documentation](https://bun.com/docs/api/utilities)
- [Bun Binary Data Documentation](https://bun.com/docs/runtime/binary-data) - Official guide on binary data handling and conversion
- [Hyper-Bun Manifesto](../CLAUDE.md#architecture)
- [Demo Script](../scripts/demo-bun-utils.ts) - Run with `bun run demo:bun-utils`
- [API Examples](../src/api/examples.ts) - Code examples for binary data conversions and Bun APIs
  - Get all examples: `GET /api/examples`
  - Get by category: `GET /api/examples?category=Binary Data`
  - Get by name: `GET /api/examples/:name`

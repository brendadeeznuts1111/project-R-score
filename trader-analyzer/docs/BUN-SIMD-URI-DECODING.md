# **Bun SIMD-Optimized URI Decoding**

**Reference:** [Bun Source Code (Commit)](https://github.com/oven-sh/bun/blob/5eb2145b3104f48eadd601518904e56aaa9937bf/src/bun.js/bindings/decodeURIComponentSIMD.cpp#L21-L271)  
**Status:** ✅ Available in Bun Runtime  
**Performance:** Significant speedup for URI decoding operations  
**Implementation:** C++ with WebAssembly SIMD instructions

---

## **Overview**

Bun implements SIMD (Single Instruction, Multiple Data) optimized `decodeURIComponent` using WebAssembly SIMD instructions. This provides substantial performance improvements for URI decoding operations, especially when processing large amounts of URL-encoded data.

### **Key Features**

- ✅ **SIMD Optimization**: Uses WebAssembly SIMD for parallel processing
- ✅ **Native Performance**: Implemented in C++ with WASM SIMD
- ✅ **Automatic Fallback**: Falls back to standard implementation if SIMD unavailable
- ✅ **Production Ready**: Used throughout Bun's runtime

---

## **Performance Characteristics**

### **SIMD Benefits**

SIMD allows processing multiple characters simultaneously:

- **Standard**: Processes 1 character per cycle
- **SIMD (128-bit)**: Processes 16 characters per cycle (up to 16x speedup)
- **SIMD (256-bit)**: Processes 32 characters per cycle (up to 32x speedup)

### **Benchmark Estimates**

| Operation | Standard | SIMD Optimized | Speedup |
|-----------|----------|----------------|---------|
| Small strings (<100 chars) | ~50ns | ~10ns | ~5x |
| Medium strings (100-1K chars) | ~500ns | ~50ns | ~10x |
| Large strings (>1K chars) | ~5μs | ~200ns | ~25x |

*Note: Actual performance depends on CPU SIMD support and string characteristics*

---

## **Usage in Bun**

### **Standard Usage**

```typescript
// Bun automatically uses SIMD-optimized decodeURIComponent
const encoded = "Hello%20World%21";
const decoded = decodeURIComponent(encoded);
console.log(decoded); // "Hello World!"
```

### **No Code Changes Required**

Bun's `decodeURIComponent` is automatically SIMD-optimized:

```typescript
// This automatically uses SIMD optimization
const url = "https://example.com/path?query=value%20with%20spaces";
const decoded = decodeURIComponent(url);

// Works with all standard JavaScript APIs
const params = new URLSearchParams(decoded);
```

---

## **Implementation Details**

### **SIMD Algorithm**

The Bun implementation uses:

1. **SIMD Load**: Loads multiple characters into SIMD registers
2. **Parallel Processing**: Processes multiple characters simultaneously
3. **Percent-Encoding Detection**: Efficiently identifies `%XX` patterns
4. **Hex Decoding**: Converts hex pairs to characters in parallel
5. **Fallback**: Handles edge cases with standard implementation

### **Key Optimizations**

- **Vectorized Percent Detection**: Checks for `%` characters in parallel
- **Batch Hex Decoding**: Decodes multiple hex pairs simultaneously
- **Memory Alignment**: Optimized memory access patterns
- **Early Exit**: Fast path for strings without encoding

---

## **Use Cases in Audit System**

### **1. WebSocket Message Decoding**

```typescript
// WebSocket messages may contain URL-encoded data
websocket: {
  message(ws, message) {
    if (typeof message === 'string') {
      // Bun automatically uses SIMD-optimized decodeURIComponent
      const decoded = decodeURIComponent(message);
      // Process decoded message
    }
  }
}
```

### **2. URL Parameter Parsing**

```typescript
// Parsing audit query parameters
function parseAuditParams(url: string): AuditParams {
  const urlObj = new URL(url);
  // decodeURIComponent is SIMD-optimized automatically
  const pattern = decodeURIComponent(urlObj.searchParams.get('pattern') || '');
  const directory = decodeURIComponent(urlObj.searchParams.get('dir') || '');
  
  return { pattern, directory };
}
```

### **3. File Path Decoding**

```typescript
// Decoding file paths from URLs
function decodeFilePath(encodedPath: string): string {
  // Automatically uses SIMD optimization
  return decodeURIComponent(encodedPath);
}
```

---

## **Best Practices**

### **1. Use Native Functions**

```typescript
// ✅ Good: Uses Bun's SIMD-optimized implementation
const decoded = decodeURIComponent(encoded);

// ❌ Avoid: Custom implementations won't benefit from SIMD
function customDecode(str: string) {
  return str.replace(/%([0-9A-F]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}
```

### **2. Batch Processing**

```typescript
// ✅ Good: Process multiple strings (SIMD benefits from batching)
const decoded = urls.map(url => decodeURIComponent(url));

// ✅ Good: Process large strings (SIMD excels with large inputs)
const decoded = decodeURIComponent(largeEncodedString);
```

### **3. Avoid Premature Optimization**

```typescript
// ✅ Good: Let Bun handle optimization automatically
const decoded = decodeURIComponent(encoded);

// ❌ Avoid: Don't cache unless profiling shows it's needed
// Bun's SIMD implementation is already very fast
```

---

## **Browser Compatibility**

### **SIMD Support**

- **Bun**: ✅ Full SIMD support (WebAssembly SIMD)
- **Node.js**: ⚠️ No SIMD optimization (standard implementation)
- **Browsers**: ⚠️ Limited SIMD support (varies by browser)

### **Fallback Behavior**

Bun automatically falls back to standard implementation if:
- SIMD instructions unavailable
- CPU doesn't support required SIMD features
- Edge cases requiring standard implementation

---

## **Performance Monitoring**

### **Measuring Impact**

```typescript
// Benchmark decodeURIComponent performance
function benchmarkDecoding(encoded: string, iterations: number = 1000) {
  const start = Bun.nanoseconds();
  
  for (let i = 0; i < iterations; i++) {
    decodeURIComponent(encoded);
  }
  
  const end = Bun.nanoseconds();
  const avg = (end - start) / iterations;
  
  console.log(`Average decode time: ${avg}ns`);
  console.log(`Throughput: ${(encoded.length * iterations) / ((end - start) / 1e9)} chars/sec`);
}
```

### **Expected Performance**

For typical audit system workloads:

- **Small messages** (<100 chars): <100ns per decode
- **Medium messages** (100-1K chars): <1μs per decode
- **Large messages** (>1K chars): <10μs per decode

---

## **Integration with Audit System**

### **WebSocket Audit Server**

The WebSocket audit server automatically benefits from SIMD optimization when:

1. **Decoding WebSocket messages**: URL-encoded audit parameters
2. **Parsing query strings**: Audit filter parameters
3. **Processing file paths**: URL-encoded file paths from clients

### **No Code Changes Required**

```typescript
// src/audit/websocket-audit-server.ts
// Automatically uses SIMD-optimized decodeURIComponent

websocket: {
  message(ws, message) {
    if (typeof message === 'string') {
      // Bun's decodeURIComponent is SIMD-optimized
      const data = JSON.parse(message);
      const pattern = decodeURIComponent(data.pattern || '');
      // Process pattern...
    }
  }
}
```

---

## **Cross-References**

- **9.1.5.21.0.0.0** → WebSocket Audit Server
- **7.4.6.0.0.0.0** → Bun WebSocket API Documentation
- **Bun Source**: [decodeURIComponentSIMD.cpp](https://github.com/oven-sh/bun/blob/main/src/bun.js/bindings/decodeURIComponentSIMD.cpp)

---

## **References**

- [Bun GitHub - SIMD URI Decoding (Commit)](https://github.com/oven-sh/bun/blob/5eb2145b3104f48eadd601518904e56aaa9937bf/src/bun.js/bindings/decodeURIComponentSIMD.cpp#L21-L271)
- [Bun GitHub - Main Branch](https://github.com/oven-sh/bun/blob/main/src/bun.js/bindings/decodeURIComponentSIMD.cpp)
- [Technical Deep Dive](./BUN-SIMD-URI-DECODING-TECHNICAL.md) - Detailed implementation analysis
- [WebAssembly SIMD Proposal](https://github.com/WebAssembly/simd)
- [MDN - decodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent)

---

## **Conclusion**

Bun's SIMD-optimized `decodeURIComponent` provides significant performance improvements for URI decoding operations. The optimization is:

- ✅ **Automatic**: No code changes required
- ✅ **Transparent**: Works with standard JavaScript APIs
- ✅ **Production Ready**: Used throughout Bun's runtime
- ✅ **Backward Compatible**: Falls back gracefully if SIMD unavailable

The audit system automatically benefits from these optimizations when processing URL-encoded data in WebSocket messages, query parameters, and file paths.

---

**Last Updated:** 2024  
**Bun Version:** 1.3+  
**Status:** ✅ Available & Optimized

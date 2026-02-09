# 🚀 Bun v1.3.7 Release Summary

> **Major Release**: Enhanced package management, profiling APIs, performance improvements, and compatibility fixes

---

## 📦 Package Management Enhancements

### ✅ **`bun pm pack` Lifecycle Script Support**

**Breaking Improvement**: `bun pm pack` now respects changes to `package.json` from lifecycle scripts, matching npm's behavior.

#### **What Changed**
- **Pre-pack Processing**: Re-reads `package.json` after running `prepack`, `prepare`, and `prepublishOnly` scripts
- **Tool Compatibility**: Enables compatibility with tools like `clean-package` that modify `package.json` during packing
- **Correct Tarball Contents**: Ensures modifications made by lifecycle scripts are included in the final package

#### **Example Usage**
```json
// package.json
{
  "name": "my-package",
  "version": "1.0.0",
  "scripts": {
    "prepack": "node prepack.js"
  },
  "description": "Original description",
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

```javascript
// prepack.js - removes devDependencies before packing
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.devDependencies;
pkg.description = 'Production build';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
```

**Result**: The tarball now contains the modified `package.json` without `devDependencies` and with the updated description.

#### **Benefits**
- **Build Tool Integration**: Works seamlessly with `clean-package`, `prepack-cleanup`, etc.
- **Production Optimization**: Remove development dependencies automatically
- **npm Compatibility**: Matches npm's exact behavior for better ecosystem compatibility

---

## 🔍 Profiling & Debugging

### ✅ **Node Inspector Profiler API**

**New Feature**: Full implementation of `node:inspector` Profiler API for CPU profiling via Chrome DevTools Protocol.

#### **Supported Methods**
- `Profiler.enable` / `Profiler.disable`
- `Profiler.start` / `Profiler.stop` 
- `Profiler.setSamplingInterval`

#### **Usage Examples**

**Callback API (node:inspector)**
```javascript
import inspector from "node:inspector";

const session = new inspector.Session();
session.connect();

session.post("Profiler.enable", () => {
  session.post("Profiler.start", () => {
    // ... code to profile ...
    
    session.post("Profiler.stop", (error, { profile }) => {
      console.log("Profile captured:", profile);
      session.post("Profiler.disable");
    });
  });
});
```

**Promise API (node:inspector/promises)**
```javascript
import inspector from "node:inspector/promises";

const session = new inspector.Session();
session.connect();

await session.post("Profiler.enable");
await session.post("Profiler.start");

// ... code to profile ...

const { profile } = await session.post("Profiler.stop");
await session.post("Profiler.disable");

// profile is in Chrome DevTools Protocol format
console.log("CPU Profile:", profile);
```

#### **Bug Fix**
- **Fixed**: `Bun.profile()` from `bun:jsc` returning empty traces on subsequent calls

---

## ⚡ Performance Improvements

### ✅ **Faster Buffer Operations**

**Significant Speedup**: Optimized buffer swapping methods using CPU intrinsics.

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| `Buffer.swap16()` | 1.00 µs | 0.56 µs | **1.8x faster** |
| `Buffer.swap64()` | 2.02 µs | 0.56 µs | **3.6x faster** |

#### **Usage**
```javascript
const buf = Buffer.alloc(64 * 1024);

// Swap byte pairs in-place (e.g., for UTF-16 encoding conversion)
buf.swap16();

// Swap 8-byte chunks in-place (e.g., for 64-bit integer endianness)
buf.swap64();
```

**Result**: Bun now matches or exceeds Node.js performance for all buffer swap operations.

### ✅ **Faster JavaScript Built-ins**

**WebKit Upgrade**: Significant performance improvements to JavaScript built-in methods.

#### **String Methods**
- `String.prototype.isWellFormed`: **5.2x faster** using simdutf
- `String.prototype.toWellFormed`: **5.4x faster** using simdutf

#### **RegExp Methods**
- `RegExp.prototype[Symbol.matchAll]`: Reimplemented in C++
- `RegExp.prototype[Symbol.replace]`: Reimplemented in C++

---

## 🌐 Unicode & Text Handling

### ✅ **Enhanced Grapheme Breaking (GB9c Support)**

**Unicode Improvement**: Upgraded grapheme breaking implementation to support Unicode's GB9c rule for Indic Conjunct Break.

#### **What Changed**
- **Indic Script Support**: Devanagari and other Indic script conjuncts now correctly form single grapheme clusters
- **Table Optimization**: Reduced internal table size from ~70KB to ~51KB
- **Comprehensive Unicode**: Added more comprehensive Unicode support

#### **Examples**
```javascript
// Devanagari conjuncts now correctly treated as single grapheme clusters
Bun.stringWidth("क्ष");   // Ka+Virama+Ssa → width 2 (single cluster)
Bun.stringWidth("क्‍ष"); // Ka+Virama+ZWJ+Ssa → width 2 (single cluster)  
Bun.stringWidth("क्क्क"); // Ka+Virama+Ka+Virama+Ka → width 3 (single cluster)
```

#### **Impact**
- **Correct Text Rendering**: Proper display of Indic scripts in UI components
- **Accurate String Width**: Correct width calculations for text layout
- **Better Internationalization**: Improved support for Indic languages

---

## 🔧 Compatibility & Ecosystem

### ✅ **Next.js 16 Cache Components Compatibility**

**Next.js Fix**: Added `_idleStart` property to Timeout objects for Next.js 16 Cache Components.

```javascript
const timer = setTimeout(() => {}, 1000);
console.log(timer._idleStart); // monotonic timestamp in ms
clearTimeout(timer);
```

**Purpose**: This internal property coordinates timers in Next.js 16's Cache Components feature.

### ✅ **Enhanced HTTP Headers Support**

**Capacity Increase**: Maximum HTTP headers doubled from 100 to 200.

**Benefits**:
- **API Compatibility**: Better support for APIs with extensive metadata
- **Proxy Support**: Handles proxies that append multiple forwarding headers
- **Enterprise Integration**: Improved compatibility with enterprise middleware

### ✅ **WebSocket URL Credentials Support**

**Authentication Enhancement**: WebSocket connections now properly forward URL-embedded credentials as Basic Authorization headers.

```javascript
// Credentials are now automatically forwarded
const ws = new WebSocket("ws://username:password@example.com/socket");

// User-provided Authorization headers take precedence
const ws2 = new WebSocket("ws://user:pass@example.com/socket", {
  headers: {
    Authorization: "Bearer custom-token", // This will be used instead
  },
});
```

**Use Cases**:
- **Puppeteer Integration**: Connect to remote browser instances (Bright Data, etc.)
- **WebSocket Authentication**: Simplified credential management
- **Node.js Compatibility**: Matches Node.js behavior exactly

---

## 🛠️ Developer Experience

### ✅ **REPL Mode for Bun.Transpiler**

**New Feature**: `replMode` option for building Node.js-compatible REPLs using Bun.Transpiler.

#### **Key Features**
- **Variable Hoisting**: `var/let/const` declarations persist across REPL lines
- **const → let Conversion**: Allows re-declaration in subsequent inputs
- **Expression Result Capture**: Wraps last expression for easy result extraction
- **Object Literal Detection**: Auto-detects `{a: 1}` as object literal vs block statement
- **Top-level Await**: Automatically uses async IIFE wrappers when needed

#### **Implementation Example**
```javascript
import vm from "node:vm";

const transpiler = new Bun.Transpiler({
  loader: "tsx",
  replMode: true,
});

const context = vm.createContext({ console, Promise });

async function repl(code: string) {
  const transformed = transpiler.transformSync(code);
  const result = await vm.runInContext(transformed, context);
  return result.value;
}

// Variables persist across REPL lines
await repl("var x = 10");        // 10
await repl("x + 5");             // 15

// Classes and functions are hoisted to the context
await repl("class Counter {}");   // [class Counter]
await repl("new Counter()");      // Counter {}

// Object literals are auto-detected
await repl("{a: 1, b: 2}");       // {a: 1, b: 2}

// Top-level await works
await repl("await Promise.resolve(42)"); // 42
```

---

## ☁️ Cloud Storage Enhancements

### ✅ **S3 Content-Encoding Option**

**New Feature**: S3 client now supports setting `Content-Encoding` header for uploads.

#### **Usage Examples**

**With .write()**
```javascript
import { s3 } from "bun";

const file = s3.file("my-bucket/data.json.gz");
await file.write(compressedData, { contentEncoding: "gzip" });
```

**With .writer()**
```javascript
const writer = file.writer({ contentEncoding: "gzip" });
writer.write(compressedData);
await writer.end();
```

**With bucket.write()**
```javascript
const bucket = s3.bucket("my-bucket");
await bucket.write("data.json.br", brotliData, { contentEncoding: "br" });
```

#### **Supported Encodings**
- `gzip` - Gzip compression
- `br` - Brotli compression  
- `deflate` - Deflate compression
- `identity` - No compression (default)

**Use Cases**:
- **Pre-compressed Assets**: Upload already compressed files
- **Storage Optimization**: Reduce storage costs with compression
- **CDN Integration**: Proper encoding headers for CDN edge caching

---

## 📊 Performance Benchmarks

### **Buffer Operations**
```javascript
// Benchmark results (64KB buffer)
Buffer.swap16(): 1.8x faster (0.56µs vs 1.00µs)
Buffer.swap64(): 3.6x faster (0.56µs vs 2.02µs)
```

### **String Methods**
```javascript
// simdutf-powered improvements
String.prototype.isWellFormed: 5.2x faster
String.prototype.toWellFormed: 5.4x faster
```

### **RegExp Operations**
```javascript
// C++ reimplementation
RegExp.prototype[Symbol.matchAll]: Significant speedup
RegExp.prototype[Symbol.replace]: Significant speedup
```

---

## 🔄 Migration Guide

### **For Package Authors**
```bash
# Update build scripts to use prepack for cleanup
npm install --save-dev clean-package
# Add to package.json:
# "scripts": {
#   "prepack": "clean-package"
# }
```

### **For Profiling**
```javascript
// Replace Bun.profile() with node:inspector for better compatibility
import inspector from "node:inspector/promises";
// Use the new Profiler API for Chrome DevTools integration
```

### **For REPL Development**
```javascript
// Enable replMode for Node.js-compatible REPL behavior
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  replMode: true, // New option
});
```

### **For S3 Uploads**
```javascript
// Add contentEncoding for pre-compressed uploads
await s3.file("data.gz").write(data, { 
  contentEncoding: "gzip" 
});
```

---

## 🎯 Key Takeaways

### **Major Wins**
1. **Package Management**: Full npm compatibility for `bun pm pack`
2. **Profiling**: Complete Node.js inspector API support
3. **Performance**: Significant speedups across buffer, string, and regex operations
4. **Unicode**: Proper Indic script support with smaller memory footprint
5. **Ecosystem**: Next.js 16 and WebSocket authentication compatibility

### **Developer Experience**
- **REPL Mode**: Build Node.js-compatible REPLs easily
- **S3 Enhancements**: Better cloud storage integration
- **Debugging**: Improved profiling capabilities
- **Internationalization**: Enhanced Unicode support

### **Production Ready**
- **Performance**: Multiple 2-5x speedups
- **Compatibility**: Better ecosystem integration
- **Reliability**: Fixed critical bugs in profiling and text handling

---

**🚀 Bun v1.3.7 - Performance, Compatibility, and Developer Experience Enhancements!**

*Download: `bun upgrade` • Documentation: https://bun.sh/docs • GitHub: https://github.com/oven-sh/bun*

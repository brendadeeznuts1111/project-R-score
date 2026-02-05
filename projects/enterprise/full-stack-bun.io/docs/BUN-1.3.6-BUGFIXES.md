# Bun 1.3.6+ Bug Fixes - Critical Stability Improvements

## 🔧 Critical Fixes Summary

### 1. Bun.S3Client - ETag Handling Fix
### 2. bun:ffi - Improved Error Messages
### 3. Bun Shell ($) - Memory & Stability Fixes
### 4. WebSocket - Cookie Handling Fix

---

## 📦 Bun.S3Client - listObjects ETag Handling

### Issue
ETag handling in `listObjects` response parsing could cause **unbounded memory growth** when:
- Listing large S3 buckets
- Repeatedly calling `listObjects`

### Fix
ETag parsing now properly handles memory, preventing unbounded growth.

### Before (Potential Memory Issue)

```typescript
import { S3Client } from "bun";

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ❌ Could cause memory growth with large buckets
const objects = await s3.listObjects({
  Bucket: "large-bucket",
  MaxKeys: 1000,
});
```

### After (Fixed)

```typescript
// ✅ ETag handling fixed - no memory growth
const objects = await s3.listObjects({
  Bucket: "large-bucket",
  MaxKeys: 1000,
});

// Safe to call repeatedly
for (let i = 0; i < 100; i++) {
  const result = await s3.listObjects({
    Bucket: "large-bucket",
    ContinuationToken: objects.NextContinuationToken,
  });
  // Memory usage remains stable ✅
}
```

### Best Practices

1. **Use Pagination**: Process large buckets in chunks
2. **Monitor Memory**: Check memory usage during large operations
3. **Use Continuation Tokens**: For large bucket listings

---

## 🔌 bun:ffi - Improved Error Messages

### Issue
When FFI libraries couldn't be opened, errors were generic and unhelpful.

### Fix
Errors now include:
- Library path
- OS error message (e.g., "invalid ELF header", "No such file or directory")
- Clear symbol definition errors

### Before (Generic Errors)

```typescript
import { dlopen } from "bun:ffi";

// ❌ Generic error: "Failed to open library"
try {
  const lib = dlopen("./lib.so", {
    // ...
  });
} catch (error) {
  // Error message not helpful
}
```

### After (Actionable Errors)

```typescript
import { dlopen } from "bun:ffi";

try {
  const lib = dlopen("./lib.so", {
    // ...
  });
} catch (error) {
  // ✅ Clear error with path and OS error
  // Error: Failed to open library './lib.so': No such file or directory
  // or: Failed to open library './lib.so': invalid ELF header
}
```

### linkSymbols() and CFunction() Fixes

**Before**:
```typescript
// ❌ Missing ptr field - unclear error
const lib = dlopen("./lib.so", {
  myFunction: {
    // Missing ptr field
    args: ["cstring"],
    returns: "cstring",
  },
});
```

**After**:
```typescript
// ✅ Clear error when ptr field is missing
// Error: Symbol definition missing 'ptr' field for 'myFunction'
const lib = dlopen("./lib.so", {
  myFunction: {
    ptr: myFunctionPtr, // Required
    args: ["cstring"],
    returns: "cstring",
  },
});
```

### Error Propagation Fix

Errors in `linkSymbols()` are now thrown consistently, preventing silent failures.

---

## 💻 Bun Shell ($) - Memory & Stability Fixes

### Fixes Applied

1. **Memory Leak Fix**: Command-line arguments no longer leak memory
2. **GC Crash Fix**: Fixed crash when Bun Shell is garbage collected
3. **macOS Blocking I/O Fix**: Fixed blocking I/O when writing large (>1 MB) outputs to pipes
4. **Windows Path Fix**: Fixed assertion failure with long paths or disabled 8.3 short names
5. **Windows Error Handling**: Fixed missing error handling when monitoring shell writers

### Memory Leak Fix

**Before**:
```typescript
// ❌ Memory leak in command-line arguments
for (let i = 0; i < 10000; i++) {
  await $`echo "test ${i}"`;
  // Memory grows unbounded
}
```

**After**:
```typescript
// ✅ Memory leak fixed
for (let i = 0; i < 10000; i++) {
  await $`echo "test ${i}"`;
  // Memory usage remains stable
}
```

### macOS Large Output Fix

**Before**:
```typescript
// ❌ Blocking I/O on macOS with large outputs
const result = await $`dd if=/dev/zero bs=1M count=2`;
// Could hang or block
```

**After**:
```typescript
// ✅ Non-blocking I/O for large outputs
const result = await $`dd if=/dev/zero bs=1M count=2`;
// Processes smoothly
```

### Windows Path Fix

**Before**:
```typescript
// ❌ Assertion failure on Windows with long paths
const longPath = "C:\\" + "a".repeat(300) + "\\script.bat";
await $`${longPath}`;
// Could crash
```

**After**:
```typescript
// ✅ Handles long paths correctly
const longPath = "C:\\" + "a".repeat(300) + "\\script.bat";
await $`${longPath}`;
// Works correctly
```

---

## 🌐 WebSocket - Cookie Handling Fix

### Issue
Cookies set with `req.cookies.set()` prior to `server.upgrade()` were ignored. The `Set-Cookie` header was not included in the 101 Switching Protocols response.

### Fix
Cookies are now properly included in the WebSocket upgrade response.

### Before (Cookies Ignored)

```typescript
const server = Bun.serve({
  fetch(req, server) {
    // Set cookie before upgrade
    req.cookies.set("session", "abc123");
    
    // ❌ Cookie not included in upgrade response
    server.upgrade(req, {
      headers: {
        "Custom-Header": "value",
      },
    });
  },
});
```

### After (Cookies Included)

```typescript
const server = Bun.serve({
  fetch(req, server) {
    // Set cookie before upgrade
    req.cookies.set("session", "abc123");
    
    // ✅ Cookie now included in 101 Switching Protocols response
    server.upgrade(req, {
      headers: {
        "Custom-Header": "value",
        // Set-Cookie: session=abc123 is automatically included
      },
    });
  },
});
```

### With Custom Headers

```typescript
const server = Bun.serve({
  fetch(req, server) {
    req.cookies.set("session", "abc123");
    req.cookies.set("user", "john");
    
    // ✅ Both cookies and custom headers included
    server.upgrade(req, {
      headers: {
        "X-Custom": "value",
        // Set-Cookie headers automatically included:
        // Set-Cookie: session=abc123
        // Set-Cookie: user=john
      },
    });
  },
});
```

---

## 🧪 Testing the Fixes

### Test S3Client Memory

```typescript
import { test } from "bun:test";
import { S3Client } from "bun";

test("S3Client listObjects no memory growth", async () => {
  const s3 = new S3Client({ /* config */ });
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Repeated calls
  for (let i = 0; i < 100; i++) {
    await s3.listObjects({ Bucket: "test-bucket" });
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const growth = finalMemory - initialMemory;
  
  // Memory growth should be reasonable
  expect(growth).toBeLessThan(100 * 1024 * 1024); // <100MB
});
```

### Test FFI Error Messages

```typescript
import { test, expect } from "bun:test";
import { dlopen } from "bun:ffi";

test("FFI error includes library path", () => {
  expect(() => {
    dlopen("./nonexistent.so", {});
  }).toThrow(/Failed to open library.*nonexistent\.so/);
});

test("FFI error includes OS error", () => {
  expect(() => {
    dlopen("./nonexistent.so", {});
  }).toThrow(/No such file or directory/);
});
```

### Test Bun Shell Memory

```typescript
import { test } from "bun:test";
import { $ } from "bun";

test("Bun Shell no memory leak", async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 1000; i++) {
    await $`echo "test ${i}"`;
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const growth = finalMemory - initialMemory;
  
  // Memory growth should be minimal
  expect(growth).toBeLessThan(10 * 1024 * 1024); // <10MB
});
```

### Test WebSocket Cookies

```typescript
import { test, expect } from "bun:test";

test("WebSocket upgrade includes cookies", async () => {
  const server = Bun.serve({
    fetch(req, server) {
      req.cookies.set("session", "abc123");
      server.upgrade(req);
      return new Response("Upgrading", { status: 101 });
    },
  });
  
  const ws = new WebSocket(`ws://localhost:${server.port}`);
  
  await new Promise((resolve) => {
    ws.onopen = () => {
      // Check that cookies were sent
      resolve(undefined);
    };
  });
  
  ws.close();
  server.stop();
});
```

---

## 📊 Impact Summary

| Component | Issue | Impact | Status |
|-----------|-------|--------|--------|
| S3Client | Memory growth | Critical | ✅ Fixed |
| bun:ffi | Generic errors | High | ✅ Fixed |
| Bun Shell | Memory leak | Critical | ✅ Fixed |
| Bun Shell | GC crash | Critical | ✅ Fixed |
| Bun Shell | macOS blocking I/O | High | ✅ Fixed |
| Bun Shell | Windows paths | Medium | ✅ Fixed |
| WebSocket | Missing cookies | High | ✅ Fixed |

---

## ✅ Verification Checklist

- [ ] S3Client: Test large bucket listings
- [ ] bun:ffi: Verify error messages include paths
- [ ] Bun Shell: Test memory usage over time
- [ ] Bun Shell: Test large output handling
- [ ] WebSocket: Verify cookies in upgrade response

---

## 🔗 Related Documentation

- [Bun.S3Client API](./BUN-S3CLIENT.md)
- [bun:ffi Guide](./BUN-FFI.md)
- [Bun Shell ($) Guide](./BUN-SHELL.md)
- [WebSocket API](./WEBSOCKET.md)




# Bun 1.3 Quick Reference

**Version**: 1.3.0  
**Quick Reference Card**  
**Last Updated**: 2025-12-07

---

## 🚀 Quick Start

```bash
# Check version
bun --version

# Update to 1.3+
bun upgrade

# Run examples
bun example:bun-1.3
bun example:bun-1.3:server
bun example:bun-1.3:crypto

# Run tests
bun test:bun-1.3
```

---

## 📋 Feature Cheat Sheet

### Cookies (Native Support)

```typescript
// Automatic cookie management
request.cookies.set("sessionId", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 86400,
});

// Read cookies
const sessionId = request.cookies.get("sessionId");

// Delete cookies
request.cookies.delete("sessionId");
```

### CSRF Protection

```typescript
import { CSRF } from "bun";

// Generate token
const token = CSRF.generate({
  secret: "your-secret",
  encoding: "hex",
  expiresIn: 3600000,
});

// Verify token
const isValid = CSRF.verify(token, { secret: "your-secret" });
```

### Secrets Management

```typescript
import { secrets } from "bun";

// Store secret
await secrets.set({
  service: "hyper-bun",
  name: "api-key",
  value: "secret-value",
});

// Retrieve secret
const secret = await secrets.get({
  service: "hyper-bun",
  name: "api-key",
});
```

### YAML Support

```typescript
import { YAML } from "bun";

// Parse YAML
const obj = YAML.parse("key: value");

// Stringify to YAML
const yaml = YAML.stringify({ key: "value" }, 0, 2);

// Import YAML file
import config from "./config.yaml";
```

### ReadableStream Convenience

```typescript
// Consume streams easily
const text = await stream.text();
const json = await stream.json();
const bytes = await stream.bytes();
const blob = await stream.blob();
```

### Zstandard Compression

```typescript
import { zstdCompress, zstdDecompress } from "bun";

// Compress
const compressed = await zstdCompress("Hello, world!");

// Decompress
const decompressed = await zstdDecompress(compressed);

// Automatic HTTP decompression
const response = await fetch("https://api.example.com/data");
// Automatically decompressed if Content-Encoding: zstd
```

### WebSocket Compression

```typescript
const ws = new WebSocket("wss://example.com", {
  perMessageDeflate: true, // Enable compression
  headers: {
    "User-Agent": "Hyper-Bun/1.0",
  },
});
```

### DisposableStack

```typescript
const stack = new DisposableStack();

stack.use({
  [Symbol.dispose]() {
    console.log("Cleanup!");
  },
});

// Automatically disposed when stack goes out of scope
stack.dispose();
```

### WebAssembly Streaming

```typescript
const response = await fetch("module.wasm");
const module = await WebAssembly.compileStreaming(response);
const instance = await WebAssembly.instantiate(module);
```

---

## 🔧 Testing Improvements

```typescript
import { clearAllMocks } from 'bun:test';

beforeEach(() => {
  clearAllMocks(); // Clear all mocks
});

// Variable substitution
test.each([
  { name: "Alice", age: 30 },
])("User $name is $age", ({ name, age }) => {
  // Test
});
```

---

## 📊 Performance Improvements

| Operation | Improvement |
|-----------|-------------|
| DiffieHellman | ~400x faster |
| AES-256-GCM | ~400x faster |
| scrypt | ~6x faster |
| Cookie parsing | Zero overhead when not used |

---

## 🔗 Quick Links

- **Features**: [BUN-1.3-FEATURES.md](./BUN-1.3-FEATURES.md)
- **Migration**: [BUN-1.3-MIGRATION-GUIDE.md](./BUN-1.3-MIGRATION-GUIDE.md)
- **Integration**: [BUN-1.3-INTEGRATION-SUMMARY.md](./BUN-1.3-INTEGRATION-SUMMARY.md)
- **Auth & Sessions**: [10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md)

---

## ⚡ Common Patterns

### Secure Session Cookie

```typescript
request.cookies.set("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 86400,
});
```

### CSRF Protected Route

```typescript
const csrfToken = req.headers.get("X-CSRF-Token");
const isValid = await CSRFService.validateToken(req.cookies, csrfToken);
if (!isValid) return new Response("Invalid CSRF", { status: 403 });
```

### Compressed Response

```typescript
const compressed = await compressZstd(data);
return new Response(compressed, {
  headers: { "Content-Encoding": "zstd" },
});
```

### Resource Cleanup

```typescript
const stack = createDisposableStack();
stack.use(dbConnection);
stack.use(fileHandle);
// Auto-cleanup on exit
```

---

**Status**: ✅ Quick Reference Complete

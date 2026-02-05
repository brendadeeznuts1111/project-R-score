# Bun 1.3 Features Integration

**Version**: 1.3.0  
**Bun Version**: 1.3+ Required  
**Last Updated**: 2025-12-07

---

## Overview

Bun 1.3 introduces significant improvements to testing, APIs, security, and performance. This document tracks Hyper-Bun's integration of these features.

---

## Testing Improvements

### mock.clearAllMocks()

Clear all mocks at once for cleaner test setup:

```typescript
import { mock, clearAllMocks } from 'bun:test';

beforeEach(() => {
  clearAllMocks(); // Clear all mocks between tests
});
```

### Coverage Filtering

Use `test.coveragePathIgnorePatterns` to exclude paths from coverage:

```typescript
// bunfig.toml
[test]
coveragePathIgnorePatterns = [
  "node_modules",
  "test",
  "*.test.ts"
]
```

### Variable Substitution in test.each

Use `$variable` and `$object.property` in test titles:

```typescript
test.each([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
])("User $name is $age years old", ({ name, age }) => {
  // Test implementation
});
```

### Improved Diffs

Better visualization with whitespace highlighting in test failures.

### Stricter CI Mode

Errors on `test.only()` and new snapshots without `--update-snapshots`:

```bash
bun test --ci
```

### Compact AI Output

Condensed output for AI coding assistants.

---

## YAML Support

### Direct YAML Parsing

```typescript
import { YAML } from "bun";

const obj = YAML.parse("key: value");
console.log(obj); // { key: "value" }

const yaml = YAML.stringify({ key: "value" }, 0, 2);
console.log(yaml); // "key: value"
```

### Import YAML Files Directly

```typescript
import config from "./config.yaml";
console.log(config);
```

**Status**: ✅ Available in Bun 1.3  
**Parser**: Custom implementation, 90% passing yaml-test-suite  
**Limitations**: No literal chomping (|+ and |-) or cyclic references

---

## URLPattern API (Bun 1.3.4+)

### Declarative URL Pattern Matching

Bun now supports the URLPattern Web API, providing declarative pattern matching for URLs—similar to how regular expressions work for strings. This is especially useful for routing in web servers and frameworks.

```typescript
// Match URLs with a user ID parameter
const pattern = new URLPattern({ pathname: "/users/:id" });

pattern.test("https://example.com/users/123"); // true
pattern.test("https://example.com/posts/456"); // false

const result = pattern.exec("https://example.com/users/123");
console.log(result.pathname.groups.id); // "123"

// Wildcard matching
const filesPattern = new URLPattern({ pathname: "/files/*" });
const match = filesPattern.exec("https://example.com/files/image.png");
console.log(match.pathname.groups[0]); // "image.png"
```

**Features**:
- Constructor: Create patterns from strings or URLPatternInit dictionaries
- `test()`: Check if a URL matches the pattern (returns boolean)
- `exec()`: Extract matched groups from a URL (returns URLPatternResult or null)
- Pattern properties: protocol, username, password, hostname, port, pathname, search, hash
- `hasRegExpGroups`: Detect if the pattern uses custom regular expressions

**Status**: ✅ Available in Bun 1.3.4+  
**Web Platform Tests**: 408 tests pass  
**See Also**: [BUN-1.3.4-URLPATTERN-API.md](./BUN-1.3.4-URLPATTERN-API.md) - Complete URLPattern documentation

---

## Cookies (Native Support)

Bun 1.3 includes built-in cookie support with `request.cookies` API.

### Automatic Cookie Management

```typescript
import { serve, randomUUIDv7 } from "bun";

serve({
  routes: {
    "/api/users/sign-in": (request) => {
      request.cookies.set("sessionId", randomUUIDv7(), {
        httpOnly: true,
        sameSite: "strict",
      });
      return new Response("Signed in");
    },
    "/api/users/sign-out": (request) => {
      request.cookies.delete("sessionId");
      return new Response("Signed out");
    },
  },
});
```

**Integration**: See [10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md)

---

## ReadableStream Convenience Methods

Consume ReadableStreams directly:

```typescript
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("Hello"));
    controller.close();
  },
});

const text = await stream.text(); // "Hello"
const json = await stream.json(); // Parse as JSON
const bytes = await stream.bytes(); // Get as Uint8Array
const blob = await stream.blob(); // Get as Blob
```

**Status**: ✅ Available in Bun 1.3  
**Standard**: Matches upcoming Web Streams standard

---

## WebSocket Improvements

### Compression

Client-side permessage-deflate support:

```typescript
const ws = new WebSocket("wss://example.com", {
  headers: {
    "User-Agent": "MyApp/1.0",
  },
  perMessageDeflate: true, // Enable compression
});
```

### Subprotocol Negotiation

RFC 6455 compliant protocol negotiation.

### Header Overrides

Override Host, Sec-WebSocket-Key, and other headers.

**Status**: ✅ Available in Bun 1.3

---

## WebAssembly Streaming

Compile and instantiate WebAssembly modules from streams:

```typescript
const response = fetch("module.wasm");
const module = await WebAssembly.compileStreaming(response);
const instance = await WebAssembly.instantiate(module);
```

**Status**: ✅ Available in Bun 1.3  
**Benefit**: More efficient than loading entire WASM file into memory

---

## Zstandard Compression

### Automatic Decompression

Bun automatically decompresses HTTP responses with `Content-Encoding: zstd`:

```typescript
const response = await fetch("https://api.example.com/data");
const data = await response.json(); // Automatically decompressed
```

### Manual Compression

```typescript
import { zstdCompressSync, zstdDecompressSync } from "node:zlib";

const compressed = zstdCompressSync("Hello, world!");
const decompressed = zstdDecompressSync(compressed);
console.log(decompressed.toString()); // "Hello, world!"

// Or use Bun's async APIs
import { zstdCompress, zstdDecompress } from "bun";
const compressed2 = await zstdCompress("Hello, world!");
const decompressed2 = await zstdDecompress(compressed2);
```

**Status**: ✅ Available in Bun 1.3

---

## DisposableStack and AsyncDisposableStack

TC39 Explicit Resource Management proposal implementation:

```typescript
const stack = new DisposableStack();

stack.use({
  [Symbol.dispose]() {
    console.log("Cleanup!");
  },
});

// Dispose all resources at once
stack.dispose(); // "Cleanup!"
```

**Status**: ✅ Available in Bun 1.3  
**Use Case**: Resource cleanup, database connections, file handles

---

## URLPattern API (Bun 1.3.4+)

### Declarative URL Pattern Matching

Bun now supports the URLPattern Web API, providing declarative pattern matching for URLs—similar to how regular expressions work for strings. This is especially useful for routing in web servers and frameworks.

```typescript
// Match URLs with a user ID parameter
const pattern = new URLPattern({ pathname: "/users/:id" });

pattern.test("https://example.com/users/123"); // true
pattern.test("https://example.com/posts/456"); // false

const result = pattern.exec("https://example.com/users/123");
console.log(result.pathname.groups.id); // "123"

// Wildcard matching
const filesPattern = new URLPattern({ pathname: "/files/*" });
const match = filesPattern.exec("https://example.com/files/image.png");
console.log(match.pathname.groups[0]); // "image.png"
```

**Features**:
- Constructor: Create patterns from strings or URLPatternInit dictionaries
- `test()`: Check if a URL matches the pattern (returns boolean)
- `exec()`: Extract matched groups from a URL (returns URLPatternResult or null)
- Pattern properties: protocol, username, password, hostname, port, pathname, search, hash
- `hasRegExpGroups`: Detect if the pattern uses custom regular expressions

**Status**: ✅ Available in Bun 1.3.4+  
**Web Platform Tests**: 408 tests pass  
**See Also**: [BUN-1.3.4-URLPATTERN-API.md](./BUN-1.3.4-URLPATTERN-API.md) - Complete URLPattern documentation

---

## Security Enhancements

### Bun.secrets for Encrypted Credential Storage

Use OS-native credential storage:

```typescript
import { secrets } from "bun";

await secrets.set({
  service: "my-app",
  name: "api-key",
  value: "secret-value",
});

const key: string | null = await secrets.get({
  service: "my-app",
  name: "api-key",
});
```

**Storage**:
- macOS: Keychain
- Linux: libsecret
- Windows: Windows Credential Manager

**Integration**: See [10.1.3.5.0.0.0](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md#10135000-bunsecrets-for-cookie-signing-keys)

---

### CSRF Protection

Bun 1.3 adds `Bun.CSRF` for cross-site request forgery protection:

```typescript
import { CSRF } from "bun";

const secret = "your-secret-key";
const token = CSRF.generate({ secret, encoding: "hex", expiresIn: 60 * 1000 });
const isValid = CSRF.verify(token, { secret });
```

**Integration**: See [10.1.1.3.0.0.0](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md#10113000-csrf-protection-tokens)

**Note**: Consider migrating from custom CSRF implementation to `Bun.CSRF`

---

## Crypto Performance Improvements

Bun 1.3 includes major performance improvements:

- **DiffieHellman**: ~400x faster
- **Cipheriv/Decipheriv**: ~400x faster
- **scrypt**: ~6x faster

### New Crypto Features

- **X25519 curve**: Elliptic curve support in `crypto.generateKeyPair()`
- **HKDF**: `crypto.hkdf()` and `crypto.hkdfSync()` for key derivation
- **Prime number functions**: `crypto.generatePrime()`, `crypto.checkPrime()` and sync variants
- **System CA certificates**: `--use-system-ca` flag to use OS trusted certificates
- **crypto.KeyObject hierarchy**: Full implementation with `structuredClone` support

**Status**: ✅ Available in Bun 1.3

---

## Migration Guide

### Updating CSRF Implementation

**Before** (Custom implementation):
```typescript
import { CSRFService } from './services/csrf-service';
const token = CSRFService.generateToken(cookies, request.url);
```

**After** (Bun.CSRF):
```typescript
import { CSRF } from "bun";
const secret = Bun.env.CSRF_SECRET || await Bun.secrets.get({ service: "hyper-bun", name: "csrf-secret" });
const token = CSRF.generate({ secret, encoding: "hex", expiresIn: 3600000 });
```

### Updating Secrets Management

**Before** (Bun.env):
```typescript
const secret = Bun.env.SESSION_SECRET;
```

**After** (Bun.secrets):
```typescript
const secret = await Bun.secrets.get({
  service: "hyper-bun",
  name: "session-secret"
});
```

---

## Version Requirements

All features documented here require **Bun 1.3.0 or later**.

Check Bun version:
```bash
bun --version
```

---

## Related Documentation

- [10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md) - Cookie and session management
- [BUN-1.3-SECURITY-ENHANCEMENTS.md](./BUN-1.3-SECURITY-ENHANCEMENTS.md) - Security features
- [BUN-APIS-COVERED.md](./BUN-APIS-COVERED.md) - Complete API coverage

---

**Status**: ✅ Documented & Implemented  
**Implementation Files**:
- `src/utils/yaml-config.ts` - YAML configuration utilities
- `src/utils/readable-stream-helpers.ts` - ReadableStream convenience methods
- `src/utils/disposable-resources.ts` - DisposableStack utilities
- `src/utils/zstd-compression.ts` - Zstandard compression helpers
- `src/api/websocket-enhanced.ts` - Enhanced WebSocket with compression
- `examples/bun-1.3-features.ts` - Comprehensive examples
- `test/bun-1.3-features.test.ts` - Feature tests

**Migration Status**:
- ✅ CSRF: Updated to use Bun.CSRF with fallback
- ✅ Secrets: Updated to use Bun.secrets API with fallback
- ✅ YAML: Utilities created
- ✅ Compression: Zstandard helpers created
- ✅ WebSocket: Enhanced handlers created
- ✅ Testing: Examples with new testing features

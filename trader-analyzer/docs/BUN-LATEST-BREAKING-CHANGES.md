# Bun Latest Breaking Changes & TypeScript Updates

## Overview

This document covers the latest breaking changes and TypeScript improvements in Bun, including the reworked `Bun.serve()` TypeScript types and other important updates.

**Reference**: [Bun.serve() TypeScript Types Documentation](https://bun.sh/docs/api/http-server)

---

## 🔄 Bun.serve() TypeScript Types Rework

### Overview

`Bun.serve()` TypeScript types have been reworked to use a pattern popularized by XState. This change addresses TypeScript limitations and provides better type safety for WebSocket data.

### Key Changes

#### 1. Bun.Server<T> is Now Generic

**Before** (deprecated):
```typescript
const server = Bun.serve({
  websocket: {
    // ws.data type inferred from usage
  }
});
```

**After** (new pattern):
```typescript
interface WebSocketData {
  userId: number;
  username?: string;
  connectedAt: number;
}

// Explicitly specify WebSocket data type
const server = Bun.serve<WebSocketData>({
  websocket: {
    open(ws) {
      // ws.data is now typed as WebSocketData
      console.log(ws.data.userId); // ✅ Type-safe
    }
  }
});
```

**For servers without WebSockets**:
```typescript
// Use undefined or unknown
const server = Bun.serve<undefined>({
  fetch(req) {
    return new Response("Hello");
  }
  // No websocket configuration
});
```

#### 2. Bun.ServeOptions Deprecated

**Before** (deprecated):
```typescript
import type { Bun.ServeOptions } from "bun";

const options: Bun.ServeOptions = {
  port: 3000,
  fetch(req) { return new Response("OK"); }
};
```

**After** (new pattern):
```typescript
import type { Bun } from "bun";

const options: Bun.Serve.Options<WebSocketData> = {
  port: 3000,
  fetch(req) { return new Response("OK"); }
};
```

#### 3. XState-Style Pattern

The new pattern follows XState's approach for better TypeScript inference:

```typescript
interface WebSocketData {
  userId: number;
  sessionId: string;
}

const server = Bun.serve<WebSocketData>({
  port: 3000,
  fetch(req, server) {
    // server is typed as Bun.Server<WebSocketData>
    if (server.upgrade(req, {
      data: {
        userId: 123,
        sessionId: "abc-123"
      }
    })) {
      return; // Upgrade successful
    }
    return new Response("Upgrade failed", { status: 400 });
  },
  websocket: {
    open(ws) {
      // ws.data is typed as WebSocketData
      console.log(`User ${ws.data.userId} connected`);
    },
    message(ws, message) {
      // Full type safety
      const userId = ws.data.userId; // ✅ number
    }
  }
});
```

---

## 📋 Other Breaking Changes

### TypeScript Module Resolution

**Change**: TypeScript default `"module": "Preserve"` (was auto-detected)

**Impact**: Explicit module resolution configuration required

**Migration**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "Preserve" // Explicitly set
  }
}
```

### GC Signal Change (Linux)

**Change**: GC signal changed from `SIGUSR1` to `SIGPWR` on Linux

**Impact**: Scripts using `kill -SIGUSR1` for GC will need updating

**Migration**:
```bash
# Before
kill -SIGUSR1 <pid>

# After
kill -SIGPWR <pid>
```

### require() with Unknown Extensions

**Change**: Requiring files with unknown extensions defaults to JavaScript loader instead of file loader

**Impact**: Better Node.js compatibility, but may affect custom loaders

**Migration**: Use `require.extensions` for custom file types (see Bun 1.3 test improvements)

### bun info Command

**Change**: `bun info` aliased to `bun pm view`

**Impact**: `bun info` still works but redirects to `bun pm view`

**Migration**: No code changes needed, but documentation should use `bun pm view`

### Bun.serve() Routes Rename

**Change**: `static` option renamed to `routes`

**Before**:
```typescript
Bun.serve({
  static: "./public"
});
```

**After**:
```typescript
Bun.serve({
  routes: "./public"
});
```

### SQL Client Changes

**Change**: SQL client now throws error if called as function instead of tagged template literal

**Before** (incorrect, now throws):
```typescript
const result = sql("SELECT * FROM users"); // ❌ Error
```

**After** (correct):
```typescript
const result = sql`SELECT * FROM users`; // ✅ Correct
// Or use unsafe for dynamic queries
const result = sql.unsafe(`SELECT * FROM users WHERE id = ${id}`);
```

### Bun.build() Errors

**Change**: Now throws `AggregateError` by default on build failures

**Before**:
```typescript
const result = await Bun.build({...});
if (!result.success) {
  // Handle errors manually
}
```

**After**:
```typescript
// Default: throws AggregateError
try {
  const result = await Bun.build({...});
} catch (error) {
  // error is AggregateError
}

// To revert to old behavior:
const result = await Bun.build({...}, { throw: false });
if (!result.success) {
  // Handle errors manually
}
```

### Minifier Changes

**Change**: Removes unused function and class expression names by default

**Impact**: Better minification, but may affect debugging

**Migration**: Use `--keep-names` flag to preserve names:
```bash
bun build --minify --keep-names
```

### bun:test expect() Matchers Stricter Types

**Change**: TypeScript types for `expect()` matchers made stricter

**Before**:
```typescript
expect(null).toBe("hello"); // No type error
```

**After**:
```typescript
expect(null).toBe("hello"); // ❌ Type error

// Relax strictness with type parameter
expect(null).toBe<string | null>("hello"); // ✅ Works
```

### bun test Filter Behavior

**Change**: Now fails with error when no tests match `-t <filter>` regex

**Before**: Succeeded silently if no matches

**After**: Fails with error message

**Migration**: Ensure test filters match actual test names

### os.networkInterfaces() Changes

**Change**: Returns `scopeid` instead of `scope_id` for IPv6 interfaces (matches Node.js)

**Impact**: Better Node.js compatibility

**Migration**: Update code using `scope_id` to use `scopeid`

### Namespace Imports

**Change**: Objects from `import * as ns` no longer inherit from `Object.prototype`

**Impact**: More accurate ES module behavior

**Migration**: Explicitly call `Object.prototype` methods if needed:
```typescript
import * as utils from "./utils";
// Before: utils.hasOwnProperty() worked
// After: Object.prototype.hasOwnProperty.call(utils, "key")
```

### bun test Nesting

**Change**: `test()` and `afterAll()` inside another `test()` callback now throw error

**Before**: Silently ignored

**After**: Throws error to prevent confusion

**Migration**: Move nested tests outside of test callbacks

### Node.js Version Reporting

**Change**: Bun now reports as Node.js v24.3.0 instead of v22.6.0

**Impact**: Affects `process.version`, `process.versions.node`, and N-API version

**Migration**: Update version checks if needed:
```typescript
// process.version now reports v24.3.0
// process.versions.node now reports 24.3.0
```

---

## 🔧 Migration Guide

### Step 1: Update Bun.serve() TypeScript Types

**Find all Bun.serve() calls**:
```bash
rg "Bun\.serve\(" src/
```

**Update to new pattern**:
```typescript
// 1. Define WebSocket data interface
interface WebSocketData {
  userId: number;
  // ... other properties
}

// 2. Update Bun.serve() call
const server = Bun.serve<WebSocketData>({
  // ... configuration
});
```

### Step 2: Update Type Imports

**Before**:
```typescript
import type { Bun.ServeOptions } from "bun";
```

**After**:
```typescript
import type { Bun } from "bun";
type ServeOptions = Bun.Serve.Options<WebSocketData>;
```

### Step 3: Update SQL Client Usage

**Find SQL calls**:
```bash
rg "sql\(" src/
```

**Update to tagged template**:
```typescript
// Before
const result = sql("SELECT * FROM users");

// After
const result = sql`SELECT * FROM users`;
```

### Step 4: Update Bun.build() Error Handling

**Add try-catch or use throw: false**:
```typescript
// Option 1: Use try-catch
try {
  const result = await Bun.build({...});
} catch (error) {
  // Handle AggregateError
}

// Option 2: Use throw: false
const result = await Bun.build({...}, { throw: false });
if (!result.success) {
  // Handle errors
}
```

### Step 5: Update Test Matchers

**Add type parameters where needed**:
```typescript
// Before
expect(null).toBe("hello");

// After
expect(null).toBe<string | null>("hello");
```

---

## 📝 Code Examples

### Example 1: Bun.serve() with Typed WebSocket Data

```typescript
interface WebSocketData {
  userId: number;
  username?: string;
  connectedAt: number;
  sessionId: string;
}

const server = Bun.serve<WebSocketData>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === "/ws") {
      // server is typed as Bun.Server<WebSocketData>
      if (server.upgrade(req, {
        data: {
          userId: 123,
          connectedAt: Date.now(),
          sessionId: crypto.randomUUID()
        }
      })) {
        return; // Upgrade successful
      }
      return new Response("Upgrade failed", { status: 400 });
    }
    
    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      // ws.data is typed as WebSocketData
      console.log(`User ${ws.data.userId} connected`);
      console.log(`Session: ${ws.data.sessionId}`);
    },
    message(ws, message) {
      // Full type safety
      const userId = ws.data.userId; // ✅ number
      const username = ws.data.username; // ✅ string | undefined
    },
    close(ws) {
      console.log(`User ${ws.data.userId} disconnected`);
    }
  }
});
```

### Example 2: Bun.serve() without WebSockets

```typescript
// Use undefined or unknown
const server = Bun.serve<undefined>({
  port: 3000,
  fetch(req) {
    return new Response("Hello World");
  }
  // No websocket configuration
});
```

### Example 3: Updated SQL Client Usage

```typescript
import { Database } from "bun:sqlite";

const db = new Database(":memory:");

// ✅ Correct: Tagged template literal
const users = db.query(sql`SELECT * FROM users`).all();

// ✅ Correct: Unsafe for dynamic queries
const userId = 123;
const user = db.query(sql.unsafe(`SELECT * FROM users WHERE id = ${userId}`)).get();

// ❌ Incorrect: Function call (now throws error)
// const users = db.query(sql("SELECT * FROM users")); // Error!
```

### Example 4: Bun.build() Error Handling

```typescript
// Option 1: Try-catch (default behavior)
try {
  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist"
  });
  console.log("Build successful");
} catch (error) {
  if (error instanceof AggregateError) {
    console.error("Build failed with multiple errors:");
    for (const err of error.errors) {
      console.error(`  - ${err.message}`);
    }
  } else {
    console.error("Build failed:", error);
  }
}

// Option 2: Use throw: false (old behavior)
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist"
}, { throw: false });

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(`  - ${log.message}`);
  }
}
```

### Example 5: Stricter Test Matchers

```typescript
import { test, expect } from "bun:test";

test("nullable values", () => {
  const value: string | null = null;
  
  // ❌ Type error: null is not assignable to string
  // expect(value).toBe("hello");
  
  // ✅ Correct: Relax type with type parameter
  expect(value).toBe<string | null>("hello");
  
  // ✅ Or use toBeNull()
  expect(value).toBeNull();
});
```

---

## 🔍 Finding Code That Needs Updates

### Ripgrep Patterns

```bash
# Find Bun.serve() calls
rg "Bun\.serve\(" src/

# Find Bun.ServeOptions usage
rg "Bun\.ServeOptions|ServeOptions" src/

# Find SQL function calls (incorrect usage)
rg "sql\(" src/

# Find Bun.build() without error handling
rg "Bun\.build\(" src/

# Find test() nesting
rg "test\(.*test\(" test/
```

---

## ✅ Checklist

- [ ] Update all `Bun.serve()` calls to use generic type parameter
- [ ] Replace `Bun.ServeOptions` with `Bun.Serve.Options<T>`
- [ ] Update SQL client calls to use tagged template literals
- [ ] Add error handling for `Bun.build()` (try-catch or `throw: false`)
- [ ] Update test matchers with type parameters where needed
- [ ] Fix nested `test()` calls
- [ ] Update `os.networkInterfaces()` usage (`scope_id` → `scopeid`)
- [ ] Update namespace import usage if relying on `Object.prototype`
- [ ] Update version checks if using `process.version`
- [ ] Update `static` → `routes` in Bun.serve() config
- [ ] Update GC signal scripts (Linux): `SIGUSR1` → `SIGPWR`

---

## 🔗 Related Documentation

- [Bun.serve() Documentation](https://bun.sh/docs/api/http-server) - Official Bun.serve() docs
- [Bun 1.3 Test Improvements](./BUN-1.3-TEST-IMPROVEMENTS.md) - Test framework updates
- [Bun 1.3.3 Summary](./BUN-1.3.3-SUMMARY.md) - Bun 1.3.3 features
- [Bun APIs Covered](./BUN-APIS-COVERED.md) - Complete API reference

---

**Last Updated**: 2025-01-XX  
**Bun Version**: Latest (with breaking changes)

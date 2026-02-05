# Bun v1.2.11 Improvements & Fixes

**Release Date**: 2025-01-16  
**Bun Version**: 1.2.11+  
**Contributors**: @dylan-conway, @alii, @cirospaciari, @paperclover

## Overview

Bun v1.2.11 introduces significant improvements to Node.js compatibility, TypeScript support, and runtime stability. This release focuses on crypto API enhancements, better error handling, and improved type safety.

---

## 🔐 Crypto Improvements

### KeyObject Class Hierarchy Implementation

Bun v1.2.11 reimplements the full KeyObject class hierarchy with proper class names and structuredClone support.

#### New Classes

- `SecretKeyObject` - For symmetric encryption keys
- `PublicKeyObject` - For public keys (RSA, EC, etc.)
- `PrivateKeyObject` - For private keys (RSA, EC, etc.)

#### structuredClone Support

All KeyObject instances and CryptoKey instances can now be cloned using `structuredClone()`.

**Example**:
```typescript
import { generateKeySync, generateKeyPairSync } from "node:crypto";

// Generate symmetric key
const secretKey = generateKeySync("aes", { length: 128 });

// Generate RSA key pair
const { publicKey, privateKey } = generateKeyPairSync("rsa", { 
  modulusLength: 2048 
});

// Keys are now clonable
const secretKeyClone = structuredClone(secretKey);
const publicKeyClone = structuredClone(publicKey);
const privateKeyClone = structuredClone(privateKey);

// Verify clones are equal
console.log(
  publicKey.equals(publicKeyClone),   // true
  privateKey.equals(privateKeyClone), // true
  secretKey.equals(secretKeyClone),   // true
);

// Verify class names
console.log(
  publicKey.constructor.name,  // "PublicKeyObject"
  privateKey.constructor.name, // "PrivateKeyObject"
  secretKey.constructor.name,  // "SecretKeyObject"
);
```

**Use Cases**:
- Cloning keys for secure key rotation
- Passing keys between workers/threads
- Deep copying key objects for testing

**Thanks to**: @dylan-conway

---

## 🔧 Type Fixes

### crypto.generatePrime Return Type Fix

The `crypto.generatePrime` and `crypto.generatePrimeSync` functions now correctly return `ArrayBuffer` instead of `Buffer`.

**Before** (incorrect):
```typescript
const prime = crypto.generatePrimeSync(512);
console.log(prime instanceof Buffer); // true (incorrect)
```

**After** (correct):
```typescript
import { generatePrimeSync } from "node:crypto";

const prime = generatePrimeSync(512);
console.log(prime instanceof ArrayBuffer); // true ✅
console.log(prime instanceof Buffer);      // false ✅
```

**Impact**:
- Better type safety
- Consistent with Web Crypto API
- Proper ArrayBuffer handling

**Thanks to**: @dylan-conway

---

## 🔌 Node.js Compatibility Fixes

### node:https createServer Boolean Validation

Fixed a compatibility issue where the `rejectUnauthorized` option was not properly validated as a boolean.

**Before** (could accept invalid values):
```typescript
const https = require("node:https");

// This would silently accept invalid values
const server = https.createServer({
  key: key,
  cert: cert,
  rejectUnauthorized: "not a boolean" // ❌ No error
});
```

**After** (proper validation):
```typescript
import * as https from "node:https";

// Now properly validates boolean options
try {
  const server = https.createServer({
    key: key,
    cert: cert,
    rejectUnauthorized: "not a boolean" // ✅ Throws TypeError
  });
} catch (error) {
  console.error(error); // TypeError: rejectUnauthorized must be a boolean
}
```

**Impact**:
- Better error detection
- Matches Node.js behavior
- Prevents silent failures

**Thanks to**: @alii

### node:readline/promises Error Handling

Fixed an issue where errors in `node:readline/promises` could be silently ignored.

**Before** (errors could be ignored):
```typescript
import { Readline } from "node:readline/promises";

const readline = new Readline(writable);

// Errors could be silently ignored
await readline.clearLine(0).commit(); // Could silently fail
```

**After** (errors properly propagated):
```typescript
import { Readline } from "node:readline/promises";

const readline = new Readline(writable);

// Now errors are properly propagated
try {
  await readline.clearLine(0).commit();
} catch (err) {
  console.error("Readline error:", err); // ✅ Error is caught
}
```

**Impact**:
- Proper error handling
- Better debugging experience
- Matches Node.js behavior

**Thanks to**: @alii

---

## 📘 TypeScript Improvements

### Bun.$ Type Support

The `Bun.$` shell API can now be used as a TypeScript type, allowing for better type integration when working with shell instances.

**Before** (no type support):
```typescript
class Wrapper {
  shell: any; // ❌ No type safety
  constructor() {
    this.shell = Bun.$.nothrow();
  }
}
```

**After** (type support):
```typescript
class Wrapper {
  shell: Bun.$; // ✅ Bun.$ is now available as a type
  constructor() {
    this.shell = Bun.$.nothrow();
  }
  
  async execute(command: string) {
    return await this.shell`${command}`;
  }
}
```

**Benefits**:
- Full TypeScript IntelliSense
- Type safety for shell operations
- Better IDE support

**Thanks to**: @alii

---

## 🗄️ Database Fixes

### PostgreSQL flush() Method Fix

Fixed an issue where the `flush()` method on PostgreSQL connections was undefined.

**Before** (method was undefined):
```typescript
import { sql } from "bun:sqlite"; // or postgres

await sql`SELECT * FROM users WHERE id = ${userId}`;
sql.flush(); // ❌ TypeError: sql.flush is not a function
```

**After** (method works correctly):
```typescript
import { sql } from "bun:sqlite"; // or postgres

await sql`SELECT * FROM users WHERE id = ${userId}`;
sql.flush(); // ✅ Works correctly now
```

**Impact**:
- Proper connection flushing
- Better connection management
- Matches expected API

**Thanks to**: @cirospaciari

---

## 🌐 HTTP/2 Improvements

### Type Validation in HTTP/2 Client Options

The HTTP/2 client request method now properly validates option parameters, throwing appropriate type errors when incorrect values are provided.

**Options validated**:
- `endStream` - must be boolean
- `weight` - must be number
- `parent` - must be number
- `exclusive` - must be boolean
- `silent` - must be boolean

**Example**:
```typescript
import * as http2 from "node:http2";

const client = http2.connect(`http://localhost:${port}`);

// This will now properly throw a type error
try {
  client.request({
    ':method': 'GET',
    ':path': '/'
  }, {
    silent: "yes",  // ✅ Error: options.silent must be a boolean
    weight: "high"  // ✅ Error: options.weight must be a number
  });
} catch (error) {
  console.error(error); // TypeError with proper message
}
```

**Impact**:
- Better type safety
- Clearer error messages
- Prevents runtime errors

**Thanks to**: @alii

### HTTP/2 Client Port Stringification

Fixed an issue where ports were not stringified correctly in HTTP/2 client connections.

**Before** (port type inconsistency):
```typescript
import * as http2 from "node:http2";
import * as net from "node:net";

const connect = net.connect;
net.connect = (...args) => {
  console.log(args[0].port === '80'); // false (could be number)
  return connect(...args);
}

const client = http2.connect('http://localhost:80');
```

**After** (proper stringification):
```typescript
import * as http2 from "node:http2";
import * as net from "node:net";

const connect = net.connect;
net.connect = (...args) => {
  console.log(args[0].port === '80'); // true ✅
  return connect(...args);
}

const client = http2.connect('http://localhost:80');
```

**Impact**:
- Consistent port handling
- Better compatibility
- Matches Node.js behavior

**Thanks to**: @alii

---

## 🏗️ Build & Minification Fixes

### Dead Code Elimination for Comma Expressions

Bun now correctly eliminates unused function calls inside comma expressions during minification when the functions are pure.

**Before** (incorrect transformation):
```typescript
const result = (/* @__PURE__ */ funcWithNoSideEffects(), 456);

// Output was incorrectly transformed into:
const result = ( , 456); // ❌ Syntax error
```

**After** (correct transformation):
```typescript
const result = (/* @__PURE__ */ funcWithNoSideEffects(), 456);

// Output is correctly transformed into:
const result = 456; // ✅ Correct
```

**Impact**:
- Proper minification
- No syntax errors
- Better bundle size optimization

**Thanks to**: @paperclover

---

## ⚙️ Runtime Fixes

### queueMicrotask Error Handling

Error handling in `queueMicrotask` has been improved. When passing an invalid argument (like `null`), it now throws an error with code `ERR_INVALID_ARG_TYPE` matching Node.js behavior.

**Before** (inconsistent behavior):
```typescript
queueMicrotask(null); // Could behave inconsistently
```

**After** (proper error):
```typescript
try {
  queueMicrotask(null);
} catch (error) {
  console.error(error.code); // "ERR_INVALID_ARG_TYPE" ✅
  console.error(error.message); // Proper error message
}
```

**Impact**:
- Matches Node.js behavior
- Better error messages
- Consistent error codes

**Thanks to**: @dylan-conway

### ReadableStream.prototype.tee() Typo Fix

Fixed a bug in `ReadableStream.prototype.tee()` where a typo in the property name (`fllags` instead of `flags`) could cause incorrect behavior.

**Before** (typo):
```typescript
if (teeState.fllags & (TeeStateFlags.canceled1 | TeeStateFlags.canceled2))
  // ❌ Typo: "fllags" instead of "flags"
```

**After** (fixed):
```typescript
if (teeState.flags & (TeeStateFlags.canceled1 | TeeStateFlags.canceled2))
  // ✅ Correct: "flags"
```

**Impact**:
- Proper stream cancellation checking
- Correct tee() behavior
- Better stream handling

### Bun.plugin Crash Fix

Fixed an issue where using `Bun.plugin` in certain scenarios (particularly with recursive plugin calls) could crash. Proper exception handling has been added.

**Before** (could crash):
```typescript
Bun.plugin({
  name: "recursion",
  setup(builder) {
    builder.onResolve({ filter: /.*/, namespace: "recursion" }, ({ path }) => ({
      path: require.resolve("recursion:" + path),
      namespace: "recursion",
    }));
  },
});
// ❌ Could crash with recursive plugin calls
```

**After** (proper error handling):
```typescript
Bun.plugin({
  name: "recursion",
  setup(builder) {
    builder.onResolve({ filter: /.*/, namespace: "recursion" }, ({ path }) => ({
      path: require.resolve("recursion:" + path),
      namespace: "recursion",
    }));
  },
});
// ✅ Proper exception handling prevents crashes
```

**Impact**:
- No more crashes
- Better error messages
- Safer plugin development

### TLSSocket allowHalfOpen Behavior Fix

Bun now correctly matches Node.js behavior for the `allowHalfOpen` property in `TLSSocket`. When a socket is passed to the `TLSSocket` constructor, the `allowHalfOpen` option is properly ignored and set to `false`.

**Before** (incorrect behavior):
```typescript
import * as tls from "node:tls";
import * as net from "node:net";

const socket = new tls.TLSSocket(new net.Socket(), { allowHalfOpen: true });
console.log(socket.allowHalfOpen); // true (incorrect)
```

**After** (correct behavior):
```typescript
import * as tls from "node:tls";
import * as net from "node:net";

const socket = new tls.TLSSocket(new net.Socket(), { allowHalfOpen: true });
console.log(socket.allowHalfOpen); // false ✅ (matches Node.js)

const customSocket = new tls.TLSSocket(undefined, { allowHalfOpen: true });
console.log(customSocket.allowHalfOpen); // false ✅
```

**Impact**:
- Matches Node.js behavior
- Consistent TLS socket handling
- Better compatibility

---

## Summary

| Category | Fixes | Impact |
|----------|-------|--------|
| **Crypto** | KeyObject hierarchy, structuredClone support | Better key management |
| **Types** | generatePrime return type | Type safety |
| **Node.js** | https, readline/promises fixes | Better compatibility |
| **TypeScript** | Bun.$ type support | Better IDE support |
| **Database** | PostgreSQL flush() fix | Proper connection management |
| **HTTP/2** | Type validation, port stringification | Better error handling |
| **Build** | Dead code elimination | Proper minification |
| **Runtime** | queueMicrotask, ReadableStream, Bun.plugin, TLSSocket | Stability improvements |

---

## Migration Guide

### Upgrading to Bun v1.2.11

1. **Update Bun**:
   ```bash
   bun upgrade
   bun --version  # Should be 1.2.11+
   ```

2. **Update crypto.generatePrime usage**:
   ```typescript
   // Old (if you were relying on Buffer)
   const prime = crypto.generatePrimeSync(512);
   const buffer = Buffer.from(prime); // Convert if needed
   
   // New (use ArrayBuffer directly)
   const prime = crypto.generatePrimeSync(512);
   console.log(prime instanceof ArrayBuffer); // true
   ```

3. **Update HTTPS server options**:
   ```typescript
   // Ensure boolean options are actually booleans
   const server = https.createServer({
     key: key,
     cert: cert,
     rejectUnauthorized: true, // ✅ Must be boolean
   });
   ```

4. **Use Bun.$ type**:
   ```typescript
   // Now you can use Bun.$ as a type
   class ShellWrapper {
     shell: Bun.$;
     constructor() {
       this.shell = Bun.$.nothrow();
     }
   }
   ```

---

## Related Documentation

- [Bun Type Definition Fixes](./BUN-TYPE-DEFINITION-FIXES.md)
- [Bun Latest Breaking Changes](./BUN-LATEST-BREAKING-CHANGES.md)
- [Bun TypeScript Integration](./BUN-1.3.3-TYPESCRIPT-INTEGRATION.md)
- [Bun Official Release Notes](https://bun.com/blog)

---

## Search Commands

### Find References to These Fixes
```bash
# Find crypto KeyObject usage
rg "KeyObject|generateKeySync|generateKeyPairSync" src/

# Find generatePrime usage
rg "generatePrime" src/

# Find Bun.$ type usage
rg "Bun\.\$" src/

# Find HTTP/2 usage
rg "http2\.connect|http2\.request" src/

# Find queueMicrotask usage
rg "queueMicrotask" src/

# Find TLSSocket usage
rg "TLSSocket|tls\.Socket" src/
```

---

**All improvements are included in Bun v1.2.11+**

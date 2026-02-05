# Dead Code Elimination (DCE) Annotations - Complete Guide

## Overview

Bun's **Dead Code Elimination (DCE)** system removes unused code during the build process. The `--ignore-dce-annotations` flag provides a workaround when tree-shaking causes issues by ignoring all DCE annotations.

**Flag**: `--ignore-dce-annotations` (boolean)
**Purpose**: Ignore tree-shaking annotations (`@PURE`, `@__PURE__`, `@__NO_SIDE_EFFECTS__`) and `package.json "sideEffects"` fields
**Usage**: Temporary workaround for build issues

## Reference
- [Bun Runtime Docs](https://bun.com/docs/runtime)
- [Bun Bundler Docs](https://bun.com/docs/bundler)
- [Bun.BuildConfig API](https://bun.com/reference/bun/BuildConfig)
- [Bun 1.2 Release Notes](https://bun.com/blog/bun-v1.2)
- [GitHub Issue #20866](https://github.com/oven-sh/bun/issues/20866)

---

## What is DCE (Dead Code Elimination)?

DCE is the process of removing code that doesn't affect the program results. Bun uses several signals to determine if code can be eliminated:

### DCE Signals

1. **`@PURE` annotation** - Marks function/exports as pure (no side effects)
2. **`@__PURE__` annotation** - Closure Compiler style pure annotation
3. **`@__NO_SIDE_EFFECTS__` annotation** - Marks code as having no side effects
4. **`package.json "sideEffects"` field** - Declares which modules have side effects

**When these signals are present**, Bun may eliminate the code if it appears unused.

---

## The Problem: Over-Aggressive Tree-Shaking

Sometimes DCE removes code that **should** be kept:

### Example 1: Side Effects Not Detected

```typescript
// utils.ts
export const initialize = () => {
  console.log("Initializing..."); // Side effect!
  setupPluginSystem(); // Side effect!
};

export const helper = () => {
  return "helper";
};

// main.ts
import { helper } from "./utils";

// Even though we only import 'helper',
// Bun might eliminate 'initialize' if marked @PURE
```

### Example 2: Dynamic Imports

```typescript
// plugins.ts
export const loadPlugins = () => {
  // Dynamically loads plugins
  import("./plugins/" + name + ".ts");
};

// main.ts
// No direct import of 'loadPlugins'
// Bun might eliminate it entirely
```

### Example 3: Global Registration

```typescript
// registry.ts
export const registerComponent = (name: string) => {
  globalRegistry[name] = component;
};

// Components call this at module level
registerComponent("Button", ButtonComponent);

// main.ts
// Doesn't import 'registerComponent'
// Bun might eliminate the entire module
```

---

## The Solution: `--ignore-dce-annotations`

### Basic Usage

```bash
# Ignore all DCE annotations during build
bun build --ignore-dce-annotations src/index.ts

# With minification
bun build --ignore-dce-annotations --minify src/index.ts

# Build to specific directory
bun build --ignore-dce-annotations src/index.ts --outdir=./dist
```

### NPM Scripts

```json
{
  "scripts": {
    "build:safe": "bun build --ignore-dce-annotations src/index.ts",
    "build:dce": "bun build src/index.ts"
  }
}
```

### Programmatic Usage

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  ignoreDCEAnnotations: true, // Ignore @PURE, sideEffects, etc.
  outdir: "./dist"
});
```

---

## What Gets Ignored?

When `--ignore-dce-annotations` is enabled:

| Annotation | Status | Example |
|------------|--------|---------|
| `@PURE` | ❌ Ignored | `@PURE export const foo = () => {}` |
| `@__PURE__` | ❌ Ignored | `const x = /*#__PURE__*/ fn()` |
| `@__NO_SIDE_EFFECTS__` | ❌ Ignored | `@__NO_SIDE_EFFECTS__ export const x = 1` |
| `package.json "sideEffects"` | ❌ Ignored | `"sideEffects": false` |
| Regular tree-shaking | ✅ Still active | Unused imports still removed |

---

## When to Use `--ignore-dce-annotations`

### ✅ Use It When:

1. **Build Fails with Missing Exports**
   ```bash
   # Error: Cannot find module './plugin' that was tree-shaken
   bun build --ignore-dce-annotations src/index.ts
   ```

2. **Runtime Errors Due to Missing Initialization**
   ```typescript
   // Error: globalRegistry is not defined
   // The registration module was eliminated!
   bun build --ignore-dce-annotations src/index.ts
   ```

3. **Plugin/Extension System Not Working**
   ```typescript
   // Plugins not loading because discovery was eliminated
   bun build --ignore-dce-annotations src/index.ts
   ```

4. **Side Effects Not Running**
   ```typescript
   // Polyfills not loading because import was eliminated
   bun build --ignore-dce-annotations src/index.ts
   ```

### ❌ Don't Use It When:

1. **Production Builds** (unless necessary)
   - Increases bundle size
   - Defeats tree-shaking optimizations

2. **Library Packages** (unless users need it)
   - Forces all code to be included
   - Users can override the flag

3. **Code Without Side Effects**
   - Unnecessary to disable DCE
   - Let tree-shaking work normally

---

## Examples

### Example 1: Plugin System

**Problem**: Plugin registration gets eliminated

```typescript
// plugins.ts
export function registerPlugin(name: string, plugin: Plugin) {
  globalPlugins[name] = plugin;
  console.log(`Registered plugin: ${name}`);
}

// Automatically register built-in plugins
registerPlugin("logger", loggerPlugin);
registerPlugin("auth", authPlugin);

// main.ts
import { usePlugin } from "./plugins";

usePlugin("logger"); // Error: 'logger' not found!
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### Example 2: Polyfill Import

**Problem**: Polyfill module gets eliminated

```typescript
// polyfills.ts
export function installPolyfills() {
  if (!("Promise" in globalThis)) {
    // @ts-ignore
    globalThis.Promise = PromisePolyfill;
  }
  console.log("Polyfills installed");
}

installPolyfills(); // Runs at module load time

// main.ts
import "./polyfills"; // Just importing for side effects

// Bun eliminates polyfills.ts if "sideEffects": false
```

**Solution**:
```bash
# Method 1: Ignore DCE annotations
bun build --ignore-dce-annotations src/index.ts

# Method 2: Mark sideEffects correctly in package.json
{
  "sideEffects": [
    "./src/polyfills.ts"
  ]
}
```

---

### Example 3: Decorator Metadata

**Problem**: Decorator registration gets eliminated

```typescript
// decorators.ts
export function registerDecorator(metadata: DecoratorMetadata) {
  decoratorRegistry.set(metadata.name, metadata);
}

// Decorators self-register
registerDecorator({
  name: "Component",
  fn: componentDecorator
});

// main.ts
import { Component } from "./decorators";

@Component
class MyComponent {}

// Error: 'Component' decorator not found
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### Example 4: CSS-in-JS

**Problem**: CSS registration gets eliminated

```typescript
// styles.ts
export function injectCSS(css: string) {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

export const styles = {
  primary: injectCSS(".primary { color: blue; }"),
  secondary: injectCSS(".secondary { color: red; }")
};

// main.ts
import { styles } from "./styles";

// Styles not injected because module was eliminated
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

## package.json Configuration

### sideEffects Field

The `sideEffects` field in `package.json` tells Bun which modules have side effects:

```json
{
  "name": "my-package",
  "sideEffects": false
}
```

**Values**:
- `false` - No modules have side effects (all can be tree-shaken)
- `true` - All modules have side effects (don't tree-shake anything)
- `[]` - Same as `false`
- `["./file.ts"]` - Specific files have side effects

**Example**:
```json
{
  "sideEffects": [
    "./src/polyfills.ts",
    "./src/plugins/index.ts",
    "./src/styles.ts"
  ]
}
```

---

## Annotations Reference

### @PURE

Marks a function as having no side effects:

```typescript
// Can be eliminated if unused
export const PURE add = /*#__PURE__*/((a: number, b: number) => a + b);

// Same as:
/** @pure */
export const add2 = (a: number, b: number) => a + b;
```

### @__PURE__

Closure Compiler style (also recognized by Bun):

```typescript
export const data = /*#__PURE__*/({ foo: "bar" });
export const fn = /*#__PURE__*/(() => {});
```

### @__NO_SIDE_EFFECTS__

Marks code as having no side effects:

```typescript
/** @__NO_SIDE_EFFECTS__ */
export function helper() {
  return 42;
}
```

### jsx-side-effects

Treats JSX elements as having side effects:

```bash
# CLI flag
bun build --jsx-side-effects src/index.ts

# Build config
await Bun.build({
  entrypoints: ["./src/index.ts"],
  jsxSideEffects: true
});
```

---

## Build Config Comparison

### Without --ignore-dce-annotations

```bash
bun build src/index.ts
```

**Behavior**:
- ✅ Respects `@PURE` annotations
- ✅ Respects `@__PURE__` annotations
- ✅ Respects `@__NO_SIDE_EFFECTS__` annotations
- ✅ Respects `package.json "sideEffects"`
- ✅ Tree-shakes unused code
- ⚠️ May over-aggressively eliminate code with side effects

**Bundle Size**: Smallest possible
**Risk**: Missing side effects

### With --ignore-dce-annotations

```bash
bun build --ignore-dce-annotations src/index.ts
```

**Behavior**:
- ❌ Ignores `@PURE` annotations
- ❌ Ignores `@__PURE__` annotations
- ❌ Ignores `@__NO_SIDE_EFFECTS__` annotations
- ❌ Ignores `package.json "sideEffects"`
- ✅ Still tree-shakes unused imports
- ✅ Keeps modules with apparent side effects

**Bundle Size**: Larger than default
**Risk**: Minimal (includes code that might have been eliminated)

---

## Troubleshooting

### Issue: "Cannot find module" after build

**Cause**: Module was tree-shaken despite having side effects

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

### Issue: "Undefined is not a function" at runtime

**Cause**: Function was eliminated despite being called dynamically

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

### Issue: Plugins/extensions not loading

**Cause**: Registration code was eliminated

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

### Issue: Polyfills not working

**Cause**: Polyfill import was eliminated

**Solution**:
```bash
# Method 1: Ignore DCE annotations
bun build --ignore-dce-annotations src/index.ts

# Method 2: Mark as having side effects
# package.json
{
  "sideEffects": ["./src/polyfills.ts"]
}
```

### Issue: Protocol handlers not registering

**Cause**: Protocol registration code was eliminated

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

### Issue: WebSocket status codes not working

**Cause**: Status code constants were eliminated

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

## Protocol Types and Status Codes

### HTTP Protocol

#### HTTP Status Codes

```typescript
// http-status.ts
/** @__NO_SIDE_EFFECTS__ */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  MOVED_PERMANENTLY: 301,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// HTTP status code registry (side effect: registration)
const statusCodeRegistry = new Map<number, string>();

Object.entries(HTTP_STATUS).forEach(([name, code]) => {
  statusCodeRegistry.set(code as number, name);
  console.log(`✅ Registered status code: ${code} (${name})`);
});

// Use in response
function createResponse(data: unknown, status: number = 200) {
  const statusName = statusCodeRegistry.get(status);
  console.log(`Sending ${statusName} (${status})`);

  return Response.json(data, { status });
}
```

**Problem**: Status code registry gets eliminated
```bash
# Build without flag - status codes not registered!
bun build src/index.ts

# Runtime error:
# Sending undefined (200)
# statusCodeRegistry.get is undefined
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### WebSocket Protocol

#### WebSocket Close Codes

```typescript
// websocket-codes.ts
/** @__NO_SIDE_EFFECTS__ */
export const WS_CLOSE_CODES = {
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED: 1003,
  MESSAGE_TOO_LARGE: 1009,
  INTERNAL_ERROR: 1011
} as const;

// WebSocket close code registry
const wsCodeRegistry = new Map<number, string>();

Object.entries(WS_CLOSE_CODES).forEach(([name, code]) => {
  wsCodeRegistry.set(code as number, name);
  console.log(`✅ Registered WS close code: ${code} (${name})`);
});

// Use in WebSocket close
function closeWebSocket(ws: WebSocket, code: number, reason: string) {
  const codeName = wsCodeRegistry.get(code);
  console.log(`Closing WebSocket: ${codeName} (${code}) - ${reason}`);

  ws.close(code, reason);
}
```

**Problem**: WebSocket code registry gets eliminated
```bash
# Build without flag - codes not registered!
bun build src/index.ts

# Runtime error:
# Closing WebSocket: undefined (1000) - Normal closure
# wsCodeRegistry.get is undefined
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### Protocol Handlers

#### HTTP Protocol Handlers

```typescript
// http-handlers.ts
/** @__NO_SIDE_EFFECTS__ */
export function registerHTTPHandler(method: string, handler: (req: Request) => Response) {
  httpHandlers.set(method.toUpperCase(), handler);
  console.log(`✅ Registered HTTP handler: ${method.toUpperCase()}`);
}

const httpHandlers = new Map<string, (req: Request) => Response>();

// Register handlers at module level
registerHTTPHandler("GET", (req) => Response.json({ method: "GET" }));
registerHTTPHandler("POST", (req) => Response.json({ method: "POST" }));
registerHTTPHandler("PUT", (req) => Response.json({ method: "PUT" }));
registerHTTPHandler("DELETE", (req) => Response.json({ method: "DELETE" }));

// Use in server
function handleRequest(req: Request) {
  const method = req.method;
  const handler = httpHandlers.get(method);

  if (!handler) {
    return new Response("Method not allowed", { status: 405 });
  }

  return handler(req);
}
```

**Problem**: HTTP handlers not registered
```bash
# Build without flag - handlers not registered!
bun build src/index.ts

# Runtime error:
# Method not allowed
# httpHandlers.get is undefined or empty
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

#### WebSocket Protocol Handlers

```typescript
// websocket-handlers.ts
/** @__NO_SIDE_EFFECTS__ */
export function registerWSHandler(event: string, handler: (ws: WebSocket, data: any) => void) {
  wsHandlers.set(event, handler);
  console.log(`✅ Registered WS handler: ${event}`);
}

const wsHandlers = new Map<string, (ws: WebSocket, data: any) => void>();

// Register handlers at module level
registerWSHandler("connection", (ws) => {
  console.log("✅ Client connected");
  ws.subscribe("room");
});

registerWSHandler("message", (ws, data) => {
  console.log("📨 Message received:", data);
  ws.publish("room", data);
});

registerWSHandler("close", (ws, code, reason) => {
  console.log(`❌ Client disconnected: ${code} - ${reason}`);
});

// Use in WebSocket server
Bun.serve({
  fetch(req, server) {
    if (req.headers.get("upgrade") === "websocket") {
      server.upgrade(req);
    }
    return new Response("Upgrade required", { status: 426 });
  },
  websocket: {
    open(ws) {
      wsHandlers.get("connection")?.(ws);
    },
    message(ws, data) {
      wsHandlers.get("message")?.(ws, data);
    },
    close(ws, code, reason) {
      wsHandlers.get("close")?.(ws, code, reason);
    }
  }
});
```

**Problem**: WebSocket handlers not registered
```bash
# Build without flag - handlers not registered!
bun build src/index.ts

# Runtime error:
# wsHandlers.get("connection") is undefined
# Handlers don't fire
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### Content-Type Registry

```typescript
// content-types.ts
/** @__NO_SIDE_EFFECTS__ */
export const CONTENT_TYPES = {
  "application/json": "json",
  "text/html": "html",
  "text/plain": "text",
  "application/xml": "xml",
  "multipart/form-data": "form",
  "application/octet-stream": "binary"
} as const;

// Content-Type registry
const contentTypeRegistry = new Map<string, string>();

Object.entries(CONTENT_TYPES).forEach(([type, ext]) => {
  contentTypeRegistry.set(ext, type);
  console.log(`✅ Registered Content-Type: ${ext} -> ${type}`);
});

// Use in responses
function createJSONResponse(data: unknown) {
  const contentType = contentTypeRegistry.get("json");
  return Response.json(data, {
    headers: { "Content-Type": contentType }
  });
}
```

**Problem**: Content-Type registry gets eliminated

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### Protocol Constants

```typescript
// protocol-constants.ts
/** @__NO_SIDE_EFFECTS__ */
export const PROTOCOL_CONSTANTS = {
  HTTP: {
    PORT: 80,
    SSL_PORT: 443,
    VERSION: "1.1",
    METHODS: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
  },
  WEBSOCKET: {
    PORT: 80,
    SSL_PORT: 443,
    VERSION: 13,
    PROTOCOLS: ["ws", "wss"]
  }
} as const;

// Protocol constant registry
const protocolRegistry = new Map<string, unknown>();

Object.entries(PROTOCOL_CONSTANTS).forEach(([protocol, constants]) => {
  protocolRegistry.set(protocol, constants);
  console.log(`✅ Registered protocol constants: ${protocol}`);
});

// Use in server
function getServerConfig(protocol: "HTTP" | "WEBSOCKET") {
  return protocolRegistry.get(protocol);
}
```

**Problem**: Protocol constants get eliminated

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

### Error Code Registry

```typescript
// error-codes.ts
/** @__NO_SIDE_EFFECTS__ */
export const ERROR_CODES = {
  // Application errors
  VALIDATION_ERROR: "ERR_VALIDATION",
  AUTH_ERROR: "ERR_AUTH",
  NOT_FOUND_ERROR: "ERR_NOT_FOUND",

  // System errors
  NETWORK_ERROR: "ERR_NETWORK",
  DATABASE_ERROR: "ERR_DATABASE",
  FILESYSTEM_ERROR: "ERR_FS"
} as const;

// Error code registry
const errorCodeRegistry = new Map<string, string>();

Object.entries(ERROR_CODES).forEach(([name, code]) => {
  errorCodeRegistry.set(name, code);
  console.log(`✅ Registered error code: ${name} -> ${code}`);
});

// Use in error handling
class ApplicationError extends Error {
  constructor(
    public type: keyof typeof ERROR_CODES,
    message: string
  ) {
    super(message);
    this.code = errorCodeRegistry.get(type) || "UNKNOWN";
  }
}
```

**Problem**: Error code registry gets eliminated

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

---

## Protocol and Status Code Examples

### Complete HTTP Server Example

```typescript
// complete-http-server.ts
import { Server } from "bun";

// Status codes (side effect: registration)
const statusCodeRegistry = new Map<number, string>();

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

Object.entries(HTTP_STATUS).forEach(([name, code]) => {
  statusCodeRegistry.set(code as number, name);
});

// HTTP methods registry (side effect: registration)
const methodRegistry = new Map<string, (req: Request) => Response>();

function registerHandler(method: string, handler: (req: Request) => Response) {
  methodRegistry.set(method.toUpperCase(), handler);
  console.log(`✅ Registered ${method.toUpperCase()} handler`);
}

// Register handlers (side effects!)
registerHandler("GET", (req) => {
  return Response.json({ method: "GET" });
});

registerHandler("POST", async (req) => {
  const data = await req.json();
  return Response.json({ method: "POST", data }, { status: HTTP_STATUS.CREATED });
});

// Server
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const method = req.method;
    const handler = methodRegistry.get(method);

    if (!handler) {
      const code = HTTP_STATUS.METHOD_NOT_ALLOWED || 405;
      const statusName = statusCodeRegistry.get(code);
      return new Response(`Method not allowed`, { status: code });
    }

    return handler(req);
  }
});

console.log("🚀 Server running on http://localhost:3000");
```

**Build with DCE ignored**:
```bash
bun build --ignore-dce-annotations complete-http-server.ts
```

---

### Complete WebSocket Server Example

```typescript
// complete-websocket-server.ts
import { Server } from "bun";

// WebSocket close codes (side effect: registration)
const wsCodeRegistry = new Map<number, string>();

const WS_CLOSE_CODES = {
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED: 1003,
  MESSAGE_TOO_LARGE: 1009
} as const;

Object.entries(WS_CLOSE_CODES).forEach(([name, code]) => {
  wsCodeRegistry.set(code as number, name);
});

// WebSocket event handlers (side effects: registration)
const wsHandlers = new Map<string, (ws: WebSocket, data: any) => void>();

function registerWSHandler(event: string, handler: (ws: WebSocket, data: any) => void) {
  wsHandlers.set(event, handler);
  console.log(`✅ Registered WS handler: ${event}`);
}

// Register handlers
registerWSHandler("connection", (ws) => {
  console.log("✅ Client connected");
  ws.subscribe("room");
});

registerWSHandler("message", (ws, data) => {
  console.log("📨 Message:", data);
  ws.publish("room", data);
});

registerWSHandler("close", (ws, code, reason) => {
  const codeName = wsCodeRegistry.get(code);
  console.log(`❌ Client disconnected: ${codeName} (${code}) - ${reason}`);
});

// Server
const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (req.headers.get("upgrade") === "websocket") {
      server.upgrade(req);
    }
    return new Response("Upgrade required", { status: 426 });
  },
  websocket: {
    open(ws) {
      wsHandlers.get("connection")?.(ws);
    },
    message(ws, data) {
      wsHandlers.get("message")?.(ws, data);
    },
    close(ws, code, reason) {
      wsHandlers.get("close")?.(ws, code, reason);
    }
  }
});

console.log("🚀 WebSocket server running on ws://localhost:3000");
```

**Build with DCE ignored**:
```bash
bun build --ignore-dce-annotations complete-websocket-server.ts
```

---

## Summary Table: Protocol Types

| Protocol Type | What Gets Eliminated | Symptoms | Solution |
|---------------|---------------------|----------|----------|
| **HTTP Status Codes** | Status code registry | "undefined" status | `--ignore-dce-annotations` |
| **HTTP Methods** | Method handler registry | 405 Method Not Allowed | `--ignore-dce-annotations` |
| **WebSocket Codes** | Close code registry | "undefined" close code | `--ignore-dce-annotations` |
| **WS Handlers** | Event handler registry | Handlers don't fire | `--ignore-dce-annotations` |
| **Content-Types** | Type registry | Missing Content-Type | `--ignore-dce-annotations` |
| **Error Codes** | Error code registry | "UNKNOWN" error code | `--ignore-dce-annotations` |
| **Protocol Constants** | Protocol registry | Missing configuration | `--ignore-dce-annotations` |

---

## Best Practices

### 1. Use Specific sideEffects Arrays

**Good**:
```json
{
  "sideEffects": [
    "./src/polyfills.ts",
    "./src/plugins/register.ts"
  ]
}
```

**Bad**:
```json
{
  "sideEffects": true  // Disables tree-shaking entirely
}
```

### 2. Use @PURE Carefully

**Only mark truly pure functions**:
```typescript
// ✅ Good: Pure function
export const add = /*#__PURE__*/((a: number, b: number) => a + b);

// ❌ Bad: Has side effect
export const logAndReturn = /*#__PURE__*/((x: number) => {
  console.log(x); // Side effect!
  return x;
});
```

### 3. Test Without Flag First

```bash
# Try default build
bun build src/index.ts

# If issues occur, use flag
bun build --ignore-dce-annotations src/index.ts
```

### 4. Document Why Flag Is Needed

```typescript
// build.ts
/**
 * Build with --ignore-dce-annotations because:
 * 1. Plugin system registers at module level
 * 2. Decorators self-register via side effects
 * 3. Polyfills must run even if not directly imported
 */
await Bun.build({
  entrypoints: ["./src/index.ts"],
  ignoreDCEAnnotations: true,
  outdir: "./dist"
});
```

---

## Geelark Integration

### For Upload System

```bash
# Build upload system with DCE ignored
bun build --ignore-dce-annotations \
  --feature=FEAT_CLOUD_UPLOAD \
  src/index.ts \
  --outdir=./dist/upload-safe
```

### For Dashboard

```bash
# Build dashboard with all side effects preserved
bun build --ignore-dce-annotations \
  dashboard-react/src/index.tsx \
  --outdir=./dist/dashboard
```

### For Plugin System

```typescript
// build-safe.ts
await Bun.build({
  entrypoints: ["./src/index.ts"],
  ignoreDCEAnnotations: true, // Keep plugin registration
  outdir: "./dist"
});
```

---

## Summary Table

| Feature | Default | With Flag |
|---------|---------|-----------|
| **@PURE respected** | ✅ Yes | ❌ No |
| **@__PURE__ respected** | ✅ Yes | ❌ No |
| **@__NO_SIDE_EFFECTS__ respected** | ✅ Yes | ❌ No |
| **sideEffects field respected** | ✅ Yes | ❌ No |
| **Tree-shaking** | ✅ Active | ✅ Active |
| **Bundle size** | Smallest | Larger |
| **Risk of bugs** | Higher | Lower |
| **Recommended for** | Production | Troubleshooting |

---

## Alternatives to `--ignore-dce-annotations`

### 1. Mark Specific Files with Side Effects

```json
{
  "sideEffects": [
    "./src/plugins/*.ts",
    "./src/polyfills.ts"
  ]
}
```

### 2. Import for Side Effects

```typescript
// Explicitly import for side effects
import "./register-plugins";
import "./install-polyfills";
```

### 3. Use --jsx-side-effects

```bash
# Treat JSX as having side effects
bun build --jsx-side-effects src/index.tsx
```

### 4. Disable Tree-Shaking Entirely

```bash
# Not recommended, but available
bun build --tree-shaking=false src/index.ts
```

---

## Conclusion

**`--ignore-dce-annotations`** is a valuable **temporary workaround** when:

- ✅ Tree-shaking eliminates essential code
- ✅ Side effects are not detected
- ✅ Build fails mysteriously
- ✅ Runtime errors occur due to missing code

**However**, you should:

- ⚠️ Use it only when necessary
- ⚠️ Prefer proper `sideEffects` configuration
- ⚠️ Test thoroughly with and without the flag
- ⚠️ Document why it's needed
- ⚠️ Try to fix root cause (missing annotations)

**Best approach**:
```bash
# 1. Try default build
bun build src/index.ts

# 2. If issues occur, use flag
bun build --ignore-dce-annotations src/index.ts

# 3. Fix root cause (add sideEffects, annotations)

# 4. Remove flag and verify
bun build src/index.ts
```

---

**Sources**:
- [Bun Runtime Documentation](https://bun.com/docs/runtime)
- [Bun Bundler Documentation](https://bun.com/docs/bundler)
- [Bun.BuildConfig API Reference](https://bun.com/reference/bun/BuildConfig)
- [Bun 1.2 Release Notes](https://bun.com/blog/bun-v1.2)
- [GitHub Issue #20866](https://github.com/oven-sh/bun/issues/20866)
- [GitHub Issue #18008](https://github.com/oven-sh/bun/issues/18008)

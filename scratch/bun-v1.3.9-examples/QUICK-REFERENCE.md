# Bun v1.3.9 Quick Reference

Quick reference guide for the key features introduced in Bun v1.3.9.

## 🚀 `bun run --parallel` and `bun run --sequential`

### Basic Usage

```bash
# Run multiple scripts concurrently
bun run --parallel build test lint

# Run scripts sequentially
bun run --sequential build test

# Glob pattern matching
bun run --parallel "build:*"
```

### Workspace Support

```bash
# Run in all workspace packages (parallel)
bun run --parallel --filter '*' build

# Run in all workspace packages (sequential)
bun run --sequential --workspaces build

# Multiple scripts across packages
bun run --parallel --filter '*' build lint test

# Continue even if one fails
bun run --parallel --no-exit-on-error --filter '*' test

# Skip packages missing the script
bun run --parallel --workspaces --if-present build
```

### Output Format

```
build | compiling...
test  | running suite...
lint  | checking files...
```

With workspaces:
```
app:build | compiling...
lib:build | compiling...
```

### Key Differences

| Feature | `--filter` | `--parallel` / `--sequential` |
|---------|------------|-------------------------------|
| Dependency order | ✅ Respected | ❌ Not respected |
| Watch scripts | ⚠️ Can wait unnecessarily | ✅ Starts immediately |
| Use case | Build dependencies | Independent scripts |

## 🔌 HTTP/2 Connection Upgrades

The `net.Server → Http2SecureServer` upgrade pattern now works:

```typescript
import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { readFileSync } from "node:fs";

const h2Server = createSecureServer({
  key: readFileSync("key.pem"),
  cert: readFileSync("cert.pem"),
});

h2Server.on("stream", (stream, headers) => {
  stream.respond({ ":status": 200 });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  // Forward the raw TCP connection to the HTTP/2 server
  h2Server.emit("connection", rawSocket);
});

netServer.listen(8443);
```

## 🧪 Symbol.dispose for Mocks

Automatic mock cleanup using the `using` keyword:

```typescript
import { spyOn, mock, expect, test } from "bun:test";

test("auto-restores spy", () => {
  const obj = { method: () => "original" };

  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }

  // Automatically restored when `spy` leaves scope
  expect(obj.method()).toBe("original");
});

// Works with mock() too
const fn = mock(() => "original");
fn();
expect(fn).toHaveBeenCalledTimes(1);

fn[Symbol.dispose](); // same as fn.mockRestore()
expect(fn).toHaveBeenCalledTimes(0);
```

## 🌐 NO_PROXY Environment Variable

Previously, setting `NO_PROXY` only worked when the proxy was auto-detected from `http_proxy`/`HTTP_PROXY` environment variables. If you explicitly passed a `proxy` option to `fetch()` or `new WebSocket()`, the `NO_PROXY` environment variable was ignored.

Now, `NO_PROXY` is always checked — even when a proxy is explicitly provided via the `proxy` option.

```typescript
// NO_PROXY=localhost
// Previously, this would still use the proxy. Now it correctly bypasses it.
await fetch("http://localhost:3000/api", {
  proxy: "http://my-proxy:8080",
});

// Same fix applies to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws", {
  proxy: "http://my-proxy:8080",
});
```

## 📊 CPU Profiling Interval

Configure the CPU profiler's sampling interval:

```bash
# Sample every 500μs for higher resolution profiling
bun --cpu-prof --cpu-prof-interval 500 index.js

# Default interval is 1000μs (1ms)
bun --cpu-prof index.js
```

**Note:** If used without `--cpu-prof` or `--cpu-prof-md`, Bun will emit a warning.

## 📦 ESM Bytecode Compilation

ESM bytecode compilation is now supported:

```bash
# ESM bytecode (NEW in v1.3.9)
bun build --compile --bytecode --format=esm ./cli.ts

# CJS bytecode (existing)
bun build --compile --bytecode --format=cjs ./cli.ts

# Without explicit format, defaults to CommonJS
bun build --compile --bytecode ./cli.ts
```

## 🐛 Important Fixes

### ARMv8.0 Compatibility
- Fixed crashes on older ARM64 processors (Cortex-A53, Raspberry Pi 4, AWS a1 instances)
- Now correctly targets ARMv8.0 on Linux aarch64

### Windows File Operations
- Fixed: `existsSync('.')`, `statSync('.')` incorrectly failing on Windows
- Fixed: `Function.prototype.toString()` whitespace now matches V8/Node.js

### WebSocket
- Fixed: Crash when using `binaryType = "blob"` with no event listener

### Security
- Fixed: HTTP server chunked encoding parser security issue (request smuggling)

## 📚 More Information

- [Full Release Notes](https://bun.com/blog/bun-v1.3.9)
- [Examples Directory](./README.md)
- [Bun Documentation](https://bun.sh/docs)

---
name: bun-expert
description: Advanced Bun patterns - FFI, bundler plugins, zero-copy, concurrency, compile, API reference
user-invocable: false
version: 1.2.0
---

# Bun Expert Patterns

## FFI (Foreign Function Interface)

```typescript
import { dlopen, suffix, ptr } from "bun:ffi";

const lib = dlopen(`libfoo.${suffix}`, {
  add: { args: ["i32", "i32"], returns: "i32" },
  strlen: { args: ["ptr"], returns: "usize" }
});

lib.symbols.add(1, 2);  // 3

// Pass strings
const buf = Buffer.from("hello\0");
lib.symbols.strlen(ptr(buf));  // 5
```

## Bundle Plugins

```typescript
Bun.build({
  entrypoints: ["./src/index.ts"],
  plugins: [{
    name: "custom-loader",
    setup(build) {
      build.onLoad({ filter: /\.custom$/ }, async (args) => {
        const text = await Bun.file(args.path).text();
        return { contents: transform(text), loader: "ts" };
      });

      build.onResolve({ filter: /^virtual:/ }, (args) => ({
        path: args.path,
        namespace: "virtual"
      }));
    }
  }]
});
```

## Zero-Copy Patterns

```typescript
// Memory-mapped files (no JS heap copy)
const data = Bun.mmap("large.bin");
data[0];  // Direct memory access

// Stream large files (no buffering)
return new Response(Bun.file("video.mp4").stream());

// sendfile syscall for uploads (>32KB, HTTP, regular file)
await fetch(url, { method: "POST", body: Bun.file("large.mp4") });

// Efficient buffer building
const sink = new Bun.ArrayBufferSink();
sink.start({ asUint8Array: true, highWaterMark: 1024 * 1024 });
sink.write(chunk1);
sink.write(chunk2);
const result = sink.end();

// Direct response to disk
await Bun.write("output.json", await fetch(url));
```

## Concurrency Patterns

```typescript
// Semaphore for rate limiting
const sem = new Bun.Semaphore(10);

async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  await sem.acquire();
  try { return await fn(); }
  finally { sem.release(); }
}

// Batch with concurrency limit
async function batch<T, R>(items: T[], fn: (t: T) => Promise<R>, limit = 10): Promise<R[]> {
  const sem = new Bun.Semaphore(limit);
  return Promise.all(items.map(async (item) => {
    await sem.acquire();
    try { return await fn(item); }
    finally { sem.release(); }
  }));
}

// Usage
await batch(urls, fetch, 5);  // Max 5 concurrent
```

## Native Modules

```typescript
// Load .node files directly
import native from "./native.node";

// Or use FFI
import { dlopen, suffix } from "bun:ffi";
const lib = dlopen(`libfoo.${suffix}`, { /* symbols */ });
```

## Build Options

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",                    // "bun" | "node" | "browser"
  format: "esm",                    // "esm" | "cjs" | "iife"
  splitting: true,                  // Code splitting
  minify: true,
  sourcemap: "external",            // "none" | "inline" | "external"
  naming: "[dir]/[name]-[hash].[ext]",
  publicPath: "/assets/",
  external: ["react"],
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [myPlugin],
});

for (const output of result.outputs) {
  console.log(output.path, output.size);
}
```

## Workspace Optimization

```json
{
  "workspaces": ["packages/*"],
  "trustedDependencies": ["esbuild"]
}
```

```bash
bun install --filter='api*'
bun run --filter='*' build
```

## Reproducible Binaries (--compile)

```bash
# Cross-compile with locked Bun binary (supply-chain guard)
bun build cli.ts \
  --compile \
  --target=bun-linux-arm64 \
  --compile-executable-path=./artifacts/bun-1.3.6-linux-arm64 \
  --outfile cli-edge

# Verify binary integrity
sha256sum ./artifacts/bun-1.3.6-linux-arm64 > bun-checksum.txt
```

```typescript
// ci/compile.ts - Reproducible builds
const targets = ["bun-linux-x64", "bun-linux-arm64", "bun-darwin-arm64"];

for (const target of targets) {
  await Bun.build({
    entrypoints: ["./src/cli.ts"],
    outfile: `./dist/cli-${target}`,
    target,
    minify: true,
    // Lock Bun version for reproducibility
    // compileExecutablePath: `./artifacts/${target}`,
  });
}
```

## Virtual Files (In-Memory Builds)

Zero-disk builds for testing - no temp files to sanitize:

```typescript
// test/virtual-build.test.ts
const { outputs, success } = await Bun.build({
  entrypoints: ["/virtual/main.ts"],
  files: {
    "/virtual/main.ts": `
      import { helper } from './lib.ts';
      export const result = helper(42);
    `,
    "/virtual/lib.ts": `
      export const helper = (n: number) => n * 2;
    `,
  },
});

expect(success).toBe(true);
const code = await outputs[0].text();
expect(code).toContain("84");
```

### Mock External Dependencies

```typescript
const { outputs } = await Bun.build({
  entrypoints: ["/virtual/app.ts"],
  files: {
    "/virtual/app.ts": `
      import { fetch } from './mock-fetch.ts';
      export const data = await fetch('/api/data');
    `,
    "/virtual/mock-fetch.ts": `
      export const fetch = () => Promise.resolve({ ok: true });
    `,
  },
});
```

## SIMD-Accelerated Buffer Operations

```typescript
// Buffer.indexOf uses SIMD on supported platforms
const bigBuffer = await Bun.file("large.log").bytes();

// SIMD-accelerated search (~2x faster than Node.js)
const idx = bigBuffer.indexOf("ERROR");
const needle = Buffer.from("-->]]");
const pos = bigBuffer.indexOf(needle);  // Vectorized

// Benchmark: 124 µs/MB on Apple Silicon
```

## React Fast Refresh

```typescript
// dev-server.ts - Hot reload React components
await Bun.build({
  entrypoints: ["./src/App.tsx"],
  outdir: "./dev",
  reactFastRefresh: true,  // Enable HMR for React
  sourcemap: "inline",
});

// Serve with --hot for full HMR
// bun --hot dev-server.ts
```

## Metafile Analysis

```typescript
// ci/analyze.ts - Bundle analysis
const { metafile, outputs } = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  metafile: true,  // Generate analysis data
  minify: true,
});

// Analyze bundle
for (const [path, meta] of Object.entries(metafile.outputs)) {
  console.log(`${path}: ${meta.bytes} bytes, ${meta.imports.length} imports`);

  // Budget gate
  if (meta.bytes > 250_000) {
    throw new Error(`${path} exceeds 250KB budget`);
  }
}

// Export for visualization tools
await Bun.write("metafile.json", JSON.stringify(metafile));
```

## HTMLRewriter (Streaming HTML Transform)

```typescript
// Transform HTML on the fly
const rewriter = new HTMLRewriter()
  .on("a[href]", {
    element(el) {
      const href = el.getAttribute("href");
      if (href?.startsWith("/")) {
        el.setAttribute("href", `https://example.com${href}`);
      }
    },
  })
  .on("script", {
    element(el) {
      el.setAttribute("defer", "");
    },
  });

const response = await fetch("https://example.com");
const transformed = rewriter.transform(response);
```

## S3 Requester Pays

Access public S3 buckets where the requester pays for data transfer:

```typescript
import { s3 } from "bun";

// Reading from a Requester Pays bucket
const file = s3.file("data.csv", {
  bucket: "requester-pays-bucket",
  requestPayer: true,
});
const content = await file.text();

// Writing to a Requester Pays bucket
await s3.write("output.json", data, {
  bucket: "requester-pays-bucket",
  requestPayer: true,
});

// Works with all S3 operations
const stat = await s3.stat("file.bin", {
  bucket: "requester-pays-bucket",
  requestPayer: true,
});

// Multipart uploads
await s3.write("large-file.zip", largeBuffer, {
  bucket: "requester-pays-bucket",
  requestPayer: true,
  multipart: true,
});
```

- **`s3.file().text()`** — requestPayer supported
- **`s3.write()`** — requestPayer supported
- **`s3.stat()`** — requestPayer supported
- **Multipart uploads** — requestPayer supported

---

## Bun 1.3.6 API Cross-Reference

### Valid `bun:*` Imports

Only these module imports exist:

- **`bun:sqlite`** — Exports: `Database`, `Statement`. Usage: `import { Database } from "bun:sqlite"`
- **`bun:ffi`** — Exports: `dlopen`, `ptr`, `suffix`, `CString`, etc. Usage: `import { dlopen, ptr } from "bun:ffi"`
- **`bun:test`** — Exports: `test`, `expect`, `describe`, `mock`, etc. Usage: `import { test, expect } from "bun:test"`
- **`bun:jsc`** — Exports: `serialize`, `deserialize`, `profile`. Usage: `import { serialize } from "bun:jsc"`

### Global APIs (No Import Required)

These are accessed directly on the `Bun` global:

```typescript
// ❌ WRONG - these modules don't exist
import { color } from 'bun:inspect';      // NO
import { stringWidth } from 'bun:string'; // NO
import { dns } from 'bun:dns';            // NO
import { connect } from 'bun:tcp';        // NO

// ✅ CORRECT - use Bun globals
Bun.color("red", "hex");           // Color conversion
Bun.stringWidth("hello");          // Unicode width
Bun.dns.prefetch("example.com");   // DNS prefetch
Bun.connect({ hostname, port });   // TCP client
```

### Complete Bun Global API Reference

- **Hashing**
  - **`Bun.hash()`** — `(data) → bigint` — xxhash64 (fastest)
  - **`Bun.hash.crc32()`** — `(data) → number` — HW-accelerated CRC32 (20x)
  - **`Bun.hash.adler32()`** — `(data) → number` — Adler-32 checksum
  - **`Bun.hash.wyhash()`** — `(data) → bigint` — wyhash
  - **`Bun.CryptoHasher`** — `new (algo)` — SHA256, MD5, etc.
- **Compression**
  - **`Bun.gzipSync()`** — `(data, opts?) → Uint8Array` — Gzip compress
  - **`Bun.gunzipSync()`** — `(data) → Uint8Array` — Gzip decompress
  - **`Bun.deflateSync()`** — `(data, opts?) → Uint8Array` — Raw deflate
  - **`Bun.inflateSync()`** — `(data) → Uint8Array` — Raw inflate
- **Files**
  - **`Bun.file()`** — `(path) → BunFile` — File handle
  - **`Bun.write()`** — `(path, data, opts?) → Promise` — Write file
  - **`Bun.mmap()`** — `(path) → Uint8Array` — Memory-mapped file
- **Network**
  - **`Bun.serve()`** — `(opts) → Server` — HTTP/WebSocket server
  - **`Bun.connect()`** — `(opts) → Socket` — TCP client
  - **`Bun.listen()`** — `(opts) → Listener` — TCP server
  - **`Bun.dns.prefetch()`** — `(hostname)` — DNS prefetch
  - **`Bun.dns.lookup()`** — `(hostname) → Promise` — DNS resolve
- **S3**
  - **`Bun.s3.file()`** — `(key, opts?) → S3File` — S3 file handle
  - **`Bun.s3.write()`** — `(key, data, opts?) → Promise` — S3 upload
  - **`Bun.s3.stat()`** — `(key, opts?) → Promise` — S3 metadata
- **Process**
  - **`Bun.spawn()`** — `(cmd, opts?) → Subprocess` — Async spawn
  - **`Bun.spawnSync()`** — `(cmd, opts?) → SyncSubprocess` — Sync spawn
  - **`Bun.which()`** — `(cmd) → string | null` — Find executable
- **Utils**
  - **`Bun.color()`** — `(input, format) → string` — Color conversion
  - **`Bun.stringWidth()`** — `(str) → number` — Unicode display width
  - **`Bun.inspect.table()`** — `(data, opts?) → string` — Format as table
  - **`JSON.stringify()`** — `(a) === JSON.stringify(b) → boolean` — Deep equality
  - **`Bun.escapeHTML()`** — `(str) → string` — HTML escape
  - **`Bun.peek()`** — `(promise) → value | promise` — Sync promise peek
- **Build**
  - **`Bun.build()`** — `(opts) → Promise<BuildOutput>` — Bundler
  - **`Bun.Transpiler`** — `new (opts)` — Standalone transpiler
- **Concurrency**
  - **`Bun.Semaphore`** — `new (count)` — Concurrency limiter
  - **`Bun.sleep()`** — `(ms) → Promise` — Async sleep
  - **`Bun.sleepSync()`** — `(ms)` — Sync sleep
- **Config**
  - **`Bun.JSONC.parse()`** — `(str) → any` — JSON with comments
  - **`Bun.TOML.parse()`** — `(str) → any` — TOML parser
- **Archive**
  - **`Bun.Archive`** — `new (files, opts?)` — Tar archive
- **stdin**
  - **`Bun.stdin`** — `.text()`, `.arrayBuffer()`, etc. — Read stdin

### Global Constructors (No Import)

```typescript
// These are globals, not imports
URLPattern        // URL pattern matching
WebSocket         // WebSocket client
Request           // HTTP Request
Response          // HTTP Response
Headers           // HTTP Headers
FormData          // Multipart form data
Blob              // Binary large object
File              // File object
TextEncoder       // String → bytes
TextDecoder       // Bytes → string
Buffer            // Node.js Buffer (global in Bun)
```

### Correct Usage Examples

```typescript
// Hash with CRC32 (HW accelerated)
const checksum = Bun.hash.crc32(await Bun.file("data.bin").bytes());

// Color conversion
const hex = Bun.color("rgb(255, 0, 0)", "hex");  // "#ff0000"
const ansi = Bun.color("red", "ansi");           // "\x1b[38;2;255;0;0m"

// Table formatting
console.log(Bun.inspect.table([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]));

// DNS prefetch
Bun.dns.prefetch("api.example.com");

// TCP connection
const socket = await Bun.connect({
  hostname: "example.com",
  port: 443,
  tls: true,
});

// Gzip with options
const compressed = Bun.gzipSync(data, { level: 9 });

// URLPattern (global)
const pattern = new URLPattern({ pathname: "/users/:id" });
const match = pattern.exec("https://example.com/users/123");
// match.pathname.groups.id === "123"

// JSONC config
const config = Bun.JSONC.parse(await Bun.file("config.jsonc").text());

// S3 with requester pays
await Bun.s3.write("file.bin", data, {
  bucket: "my-bucket",
  requestPayer: true,
});
```

### Version History

- **v1.2.0** (2026-01-18): Added complete Bun 1.3.6 API cross-reference
- **v1.1.0** (2026-01-18): Added compile-executable-path, virtual files, SIMD, metafile, S3 requester pays

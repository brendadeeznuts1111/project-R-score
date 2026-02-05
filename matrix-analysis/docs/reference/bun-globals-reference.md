# 📊 Bun Globals & Utils MASTER REFERENCE TABLE 🔥

**Ultimate compilation** of **ALL 34+ APIs** for Omega v1.6.3!

| Category | Name | Signature | Description | Returns | Key Parameters | Example | Omega Use Cases | Perf | Strict? | Encoding | Related | Docs |
|----------|------|-----------|-------------|---------|----------------|---------|----------------|------|---------|----------|---------|------|
| **Info** | `Bun.version` | `Bun.version: string` | Current Bun version string. | `string` | N/A | `"1.2.21"` | Version checks in health endpoints | Const | N/A | N/A | `Bun.revision` | [docs](#version) |
| **Info** | `Bun.revision` | `Bun.revision: string` | Git commit hash of Bun build. | `string` | N/A | `"abc123def"` | Prod logging, reproducible builds | Const | N/A | N/A | `Bun.version` | [docs](#revision) |
| **Runtime** | `Bun.env` | `Bun.env: Record<string,string>` | Process env (read-only proxy to process.env). | `Record` | N/A | `{ PATH: "/bin:/usr/bin" }` | Dynamic pool sizes from env (fallback define) | Proxy (fast) | N/A | N/A | `process.env` | [docs](#env) |
| **Runtime** | `Bun.main` | `Bun.main: string | undefined` | Path to main script (like __main__). | `string | undefined` | N/A | `"/project/server.ts"` | Resolve relative to main (dbPaths/.bin) | Const | N/A | N/A | `import.meta.url` | [docs](#main) |
| **Runtime** | `Bun.sleep()` | `Bun.sleep(ms: number): Promise<void>` | Async sleep (non-blocking). | `Promise<void>` | ms | `N/A (waits)` | Pool health checks, rate limiting | Yielding | N/A | N/A | `Bun.sleepSync()` | [docs](#sleep) |
| **Runtime** | `Bun.sleepSync()` | `Bun.sleepSync(ms: number): void` | Sync sleep (blocks thread). | `void` | ms | `N/A (blocks)` | Init delays (avoid in servers) | Precise ns | N/A | N/A | `Bun.sleep()` | [docs](#sleepsync) |
| **Resolution** | `Bun.which()` | `Bun.which(bin: string, opts?: {cwd?: string, PATH?: string})` | Finds exec via PATH (your demo star). | `string | null` | cwd, PATH | `"/bin/ls"` | Local .bin tools (sqlite3 for pools) | ~1.5ms/1k (cache!) | N/A | N/A | `Bun.resolveSync()` | [docs](#which) |
| **Resolution** | `Bun.resolveSync()` | `Bun.resolveSync(path: string, root: string)` | Module/path resolve (throws). | `string` | root: cwd/import.meta.dir | `"/proj/node_modules/zod"` | Secure .bin/db loads | Cached | N/A | N/A | `Bun.which()` | [docs](#resolvesync) |
| **Crypto** | `Bun.randomUUIDv7()` | `Bun.randomUUIDv7(encoding?: string, ts?: number)` | Monotonic UUIDv7 (time+rand). | `string | Buffer` | "hex/base64/buffer", timestamp | `"0192ce11-..."` | Session/pool IDs (sortable DB) | Crypto-fast | N/A | hex/b64/buffer | `N/A` | [docs](#uuidv7) |
| **Performance** | `Bun.peek()` | `Bun.peek(promise: Promise)` | Non-await peek at settled promise. | `T | Promise<T>` | N/A | `"hi"` | Async pool stats (no ticks) | Zero microtasks | N/A | N/A | `Bun.peek.status()` | [docs](#peek) |
| **Performance** | `Bun.nanoseconds()` | `Bun.nanoseconds()` | Uptime ns (benchmarking). | `number` | N/A | `7288958` | which()/pool timings | Sub-μs | N/A | N/A | `process.hrtime.bigint()` | [docs](#nanoseconds) |
| **Debug** | `Bun.openInEditor()` | `Bun.openInEditor(path: string, opts?: {editor?: string, line?: number})` | Opens in $EDITOR/VSCode. | `void` | editor: "code", line/col | `Opens file:10:5` | Debug failed which() paths | System spawn | N/A | N/A | `N/A` | [docs](#editor) |
| **Debug** | `Bun.inspect()` | `Bun.inspect(obj: any)` | Pretty-print as console.log(). | `string` | N/A | `'{ foo: "bar" }'` | Pool dumps | Fast | N/A | N/A | `Bun.inspect.table()` | [docs](#inspect) |
| **Debug** | `Bun.inspect.custom` | `[Bun.inspect.custom](): string` | Custom print override. | `string` | Class method | `"custom foo"` | Custom Pool class | N/A | N/A | N/A | `Bun.inspect()` | [docs](#inspect-custom) |
| **Debug** | `Bun.inspect.table()` | `Bun.inspect.table(data: any[], props?: string[], opts?: {colors: bool})` | ASCII table string (console.table drop-in). | `string` | props[], {colors: true} | `┌───┬───┐...` | **which() mega-tables** (CLI health) | Opt render | N/A | ANSI | `N/A` | [docs](#inspect-table) |
| **Comparison** | `Bun.deepEquals()` | `Bun.deepEquals(a: any, b: any, strict?: boolean)` | Deep equality (powers tests). | `boolean` | strict (undef unequal) | `true` | Pool config validation | Recursion opt | ✅ | N/A | `expect().toEqual()` | [docs](#deepequals) |
| **String** | `Bun.escapeHTML()` | `Bun.escapeHTML(value: any)` | Escapes HTML chars (&<>"'). | `string` | N/A | `"&lt;script&gt;"` | Sanitize dashboard/pool stats | 480MB/s–20GB/s SIMD | N/A | N/A | `N/A` | [docs](#escapehtml) |
| **Terminal** | `Bun.stringWidth()` | `Bun.stringWidth(str: string, opts?: {countAnsiEscapeCodes?: bool})` | Terminal col width (ANSI/emoji). ~6k x npm. | `number` | countAnsiEscapeCodes, ambiguousIsNarrow | `5 ("hello")` | Align CLI tables (which() mega-table) | SIMD ns/iter | N/A | ANSI/Emoji | `Bun.stripANSI()` | [docs](#stringwidth) |
| **Terminal** | `Bun.stripANSI()` | `Bun.stripANSI(text: string)` | Remove ANSI (~6-57x npm). | `string` | N/A | `"Hello World"` | Clean table exports | SIMD ns | N/A | ANSI | `Bun.stringWidth()` | [docs](#stripansi) |
| **Terminal** | `Bun.wrapAnsi()` | `Bun.wrapAnsi(str: string, cols: number, opts?)` | Wrap w/ ANSI/emoji (~npm drop-in). | `string` | hard/wordWrap/trim/ambiguousIsNarrow | `Wrapped lines` | Long CLI stats | Native | N/A | ANSI/Emoji | `Bun.stringWidth()` | [docs](#wrapansi) |
| **URL** | `Bun.fileURLToPath()` | `Bun.fileURLToPath(url: URL)` | file:// → abs path. | `string` | N/A | `"/foo/bar.txt"` | Import.meta → dbPath | Instant | N/A | N/A | `Bun.pathToFileURL()` | [docs](#fileurltopath) |
| **URL** | `Bun.pathToFileURL()` | `Bun.pathToFileURL(path: string)` | Abs path → file:// URL. | `URL` | N/A | `file:///foo/bar.txt` | dbPath → Bun.file() | Instant | N/A | N/A | `Bun.fileURLToPath()` | [docs](#pathtofileurl) |
| **Compression** | `Bun.gzipSync()` | `Bun.gzipSync(data: Uint8Array | string)` | Sync gzip compress. | `Uint8Array` | N/A | `Compressed bytes` | Pool snapshots (disk/network) | SIMD fast | N/A | Binary | `Bun.gunzipSync()` | [docs](#gzipsync) |
| **Compression** | `Bun.gunzipSync()` | `Bun.gunzipSync(data: Uint8Array)` | Sync gzip decompress. | `Uint8Array` | N/A | `Original bytes` | Restore compressed configs | SIMD fast | N/A | Binary | `Bun.gzipSync()` | [docs](#gunzipsync) |
| **Compression** | `Bun.deflateSync()` | `Bun.deflateSync(data: Uint8Array | string)` | Sync deflate compress. | `Uint8Array` | N/A | `Compressed bytes` | Smaller than gzip for pools | SIMD | N/A | Binary | `Bun.inflateSync()` | [docs](#deflatesync) |
| **Compression** | `Bun.inflateSync()` | `Bun.inflateSync(data: Uint8Array)` | Sync deflate decompress. | `Uint8Array` | N/A | `Original bytes` | Decompress pool data | SIMD | N/A | Binary | `Bun.deflateSync()` | [docs](#inflatesync) |
| **Compression** | `Bun.zstdCompress()` | `Bun.zstdCompress(data: Uint8Array | string)` | Async Zstandard compress (fast/small). | `Promise<Uint8Array>` | N/A | `Compressed bytes` | High-perf pool backups (better gzip) | Zstd opt | N/A | Binary | `Bun.zstdDecompress()` | [docs](#zstdcompress) |
| **Compression** | `Bun.zstdCompressSync()` | `Bun.zstdCompressSync(data: Uint8Array | string)` | Sync Zstd compress. | `Uint8Array` | N/A | `Compressed bytes` | Sync backups | Zstd opt | N/A | Binary | `Bun.zstdCompress()` | [docs](#zstdcompresssync) |
| **Compression** | `Bun.zstdDecompress()` | `Bun.zstdDecompress(data: Uint8Array)` | Async Zstd decompress. | `Promise<Uint8Array>` | N/A | `Original bytes` | Restore fast | Zstd opt | N/A | Binary | `Bun.zstdCompress()` | [docs](#zstddecompress) |
| **Compression** | `Bun.zstdDecompressSync()` | `Bun.zstdDecompressSync(data: Uint8Array)` | Sync Zstd decompress. | `Uint8Array` | N/A | `Original bytes` | Sync restore | Zstd opt | N/A | Binary | `Bun.zstdDecompress()` | [docs](#zstddecompresssync) |
| **Streams** | `Bun.readableStreamTo*()` | `readableStreamToArrayBuffer/Bytes/Blob/JSON/Text/Array/FormData(stream)` | Consume stream → formats. | `Varies` | boundary (FormData) | `Uint8Array` | Fetch → pool blobs | Zero-copy | N/A | All | `fetch().body` | [docs](#streamto) |
| **JSC** | `bun:jsc.serialize()` | `serialize(value: any): ArrayBuffer` | StructuredClone → buffer. | `ArrayBuffer` | N/A | `Buffer from obj` | Pool IPC/snapshots | JSC zero-copy | N/A | Binary | `deserialize()` | [docs](#jsc-serialize) |
| **JSC** | `bun:jsc.deserialize()` | `deserialize(buf: ArrayBuffer): any` | Buffer → value. | `any` | N/A | `Restored obj` | Load snapshots | JSC zero-copy | N/A | Binary | `serialize()` | [docs](#jsc-deserialize) |
| **JSC** | `bun:jsc.estimateShallowMemoryUsageOf()` | `estimateShallowMemoryUsageOf(obj: any): number` | Shallow mem bytes (no props). | `number` | N/A | `16` | Pool leak profiling | Instant | N/A | N/A | `Bun.generateHeapSnapshot()` | [docs](#jsc-mem) |

## 🚀 Omega MASTER Example: Pools + which() Table + Compression

```typescript
// omega-master.ts – ALL APIs in action!
import { which, inspect, nanoseconds, zstdCompressSync, version } from 'bun';
import { estimateShallowMemoryUsageOf, serialize } from 'bun:jsc';

// which() table w/ inspect.table()
const whichData = [
  { tool: 'sqlite3', path: which('sqlite3'), cwd: Bun.main!, mem: estimateShallowMemoryUsageOf(pools) },
];
console.log(inspect.table(whichData, ['tool', 'path'], { colors: true }));

// Perf + compress pool snapshot
const startNs = nanoseconds();
const snapshot = zstdCompressSync(serialize(pools));  // Zstd + JSC
console.log(`Snapshot: ${nanoseconds() - startNs} ns, size: ${snapshot.byteLength}, Bun: ${version}`);

// Sleep + env fallback
await Bun.sleep(100);  // Rate limit
const poolSize = parseInt(Bun.env.POOL_SIZE || '5');  // define fallback
```

## 💡 Pro Tips

- **Compression Kings**: Zstd > gzip (faster/smaller for pools)
- **Table Magic**: `inspect.table(whichData)` auto-formats your mega-table!
- **Perf Trio**: `nanoseconds()` + `peek()` + `sleep()` for benchmarks
- **Secure**: `resolveSync(Bun.main + '/matrix.db')` + `which()`

Generated with Bun Globals Master Generator v1.6.3 🚀

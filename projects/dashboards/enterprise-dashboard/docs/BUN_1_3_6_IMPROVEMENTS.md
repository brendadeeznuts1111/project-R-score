# Bun 1.3.6+ Improvements & Updates

## Overview
This document tracks improvements and optimizations from Bun 1.3.6+ that benefit the enterprise-dashboard codebase.

## Performance Improvements

### 1. Faster Bun.spawnSync() on Linux ARM64
**Fixed**: Performance regression where `Bun.spawnSync()` was up to 30x slower on Linux systems with high file descriptor limits.

**Before**: ~13ms per spawn with default ulimit  
**After**: ~0.4ms per spawn

**Impact**: The codebase uses `Bun.spawnSync()` in:
- `src/server/build-info.ts` - Build information gathering
- `src/macros/build-info.ts` - Macro build info
- `build.ts` - CSS compilation
- `examples/bun-1.3.6-bench.ts` - Performance benchmarks

**No code changes required** - automatic performance improvement!

### 2. Bun.hash.crc32 is now 20x faster
**Improvement**: Hardware-accelerated CRC32 using CPU instructions (PCLMULQDQ on x86, native CRC32 on ARM).

**Before**: 2,644 µs (software-only)  
**After**: 124 µs (hardware-accelerated)  
**Speedup**: ~20x faster

**Impact**: The codebase extensively uses `Bun.hash.crc32()` for:
- System integrity checks (`src/server/index.ts`)
- Asset integrity verification (`src/client/hooks/useCRC32IntegrityGuard.tsx`)
- Config validation (`scripts/config-lint.ts`)
- Pattern hashing (`src/client/components/RouteHeatmap.tsx`)
- Session management (`src/server/services/pty-service.ts`)

**No code changes required** - automatic performance improvement!

### 3. Faster JSON Serialization
**Improvement**: ~3x faster JSON serialization using JSC's SIMD-optimized FastStringifier.

**Benefits**:
- `console.log` with `%j` format - faster debugging output
- PostgreSQL JSON/JSONB types - faster database operations
- MySQL JSON type - faster database operations
- Jest `%j`/`%o` format specifiers - faster test output

**Impact**: All JSON operations throughout the codebase benefit automatically.

### 4. Faster Buffer.indexOf/includes
**Improvement**: SIMD-optimized search functions, up to 2x faster.

**Impact**: Used in log search endpoint (`/api/logs/search`) - see [`benchmarks/BUFFER_SIMD_PERFORMANCE.md`](benchmarks/BUFFER_SIMD_PERFORMANCE.md).

## New Features

### 1. --grep flag for bun test
**New**: `bun test` now supports `--grep` as an alias for `--test-name-pattern`.

```bash
# All equivalent:
bun test --grep "should handle"
bun test --test-name-pattern "should handle"
bun test -t "should handle"
```

**Usage**: Update test scripts in `package.json` to use `--grep` for better Jest/Mocha compatibility.

### 2. S3 Requester Pays Support
**New**: Bun's S3 client now supports Requester Pays buckets.

**Current Usage**: The codebase already supports this via `config.S3.REQUESTER_PAYS`:

```typescript
// src/server/index.ts
const requestPayer = options?.requestPayer ?? config.S3.REQUESTER_PAYS;
```

**Enhancement**: Can now use Bun's native S3 client directly:

```typescript
import { s3 } from "bun";

const file = s3.file("data.csv", {
  bucket: "requester-pays-bucket",
  requestPayer: true,
});
```

### 3. HTTP/HTTPS Proxy Support for WebSocket
**New**: WebSocket constructor now supports HTTP/HTTPS proxies.

**Current Usage**: WebSocket connections in:
- `src/client/KYCReviewTab.tsx`
- `src/client/Dashboard.tsx`
- `src/client/components/TerminalPanel.tsx`
- `ui-frontend/lib/bun-websocket.js`

**Enhancement**: Can now add proxy support:

```typescript
new WebSocket("wss://example.com", {
  proxy: "http://proxy:8080",
  // or with auth
  proxy: "http://user:pass@proxy:8080",
  // or object format
  proxy: {
    url: "http://proxy:8080",
    headers: { "Proxy-Authorization": "Bearer token" },
  },
});
```

### 4. sql() INSERT Helper Respects undefined Values
**New**: `sql()` tagged template now filters out `undefined` values in INSERT statements, allowing DEFAULT values to work correctly.

**Before**:
```typescript
// Would fail with "null value violates not-null constraint"
// even if 'foo' has a DEFAULT in schema
await sql`INSERT INTO "MyTable" ${sql({ foo: undefined, id: Bun.randomUUIDv7() })}`;
```

**After**:
```typescript
// Generates: INSERT INTO "MyTable" (id) VALUES ($1)
// 'foo' column omitted, database uses DEFAULT
await sql`INSERT INTO "MyTable" ${sql({ foo: undefined, id: Bun.randomUUIDv7() })}`;
```

**Impact**: Fixes data loss bug in bulk inserts where columns were determined only from the first object.

## Testing Improvements

### Fake Timers Now Work with @testing-library/react
**Fixed**: `jest.useFakeTimers()` now works correctly with `@testing-library/react` and `@testing-library/user-event`.

**Issues Fixed**:
1. Fake timer detection - Bun sets `setTimeout.clock = true` when fake timers are enabled
2. Immediate timer handling - `advanceTimersByTime(0)` now correctly fires `setTimeout(fn, 0)` callbacks

**Current Usage**: The codebase uses `@testing-library/react`:
- `src/client/__tests__/useToast.test.tsx`
- `src/client/__tests__/components.test.tsx`

**Example**:
```typescript
import { jest } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("works with fake timers", async () => {
  jest.useFakeTimers();
  const { getByRole } = render(<button>Click me</button>);
  const user = userEvent.setup();
  
  // This no longer hangs!
  await user.click(getByRole("button"));
  
  jest.useRealTimers();
});
```

## Database Updates

### Updated SQLite to 3.51.2
**Update**: Bun's embedded SQLite updated from 3.51.1 to 3.51.2.

**Fixes**:
- Edge cases with DISTINCT and OFFSET clauses
- Improved WAL mode locking behavior
- Cursor renumbering improvements

**Impact**: All SQLite operations benefit from bugfixes automatically.

## Bugfixes

### Node.js Compatibility
- Fixed: `node:http` server CONNECT event handler pipelined data
- Fixed: Temp directory resolution (TMPDIR, TMP, TEMP order)
- Fixed: Memory leak in `node:zlib` compression streams
- Fixed: `ws` module `agent` option for proxy connections
- Improved: `node:http2` module flow control

### Bun APIs
- Fixed: Subprocess stdin cleanup edgecase
- Fixed: HTTP client hanging on proxy authentication failures
- Fixed: Potential data corruption in `Bun.write()` for files >2GB
- Fixed: `NO_PROXY` parsing with empty entries
- Fixed: Memory leak in streaming responses through `Bun.serve()`
- Fixed: MySQL driver returns Buffer for BINARY/VARBINARY/BLOB columns
- Fixed: PostgreSQL driver array parsing for strings/JSON >16KB
- Fixed: PostgreSQL empty array reading
- Fixed: JSON parsing errors from SQL columns now throw SyntaxError
- Fixed: S3 credential validation for invalid values
- Fixed: `Bun.write()` respects `mode` option when copying files
- Improved: Null byte injection prevention in spawn arguments
- Improved: Stricter wildcard certificate matching (RFC 6125)

### Web APIs
- Fixed: `URLSearchParams.prototype.size` configurability
- Fixed: WebSocket decompression bomb limit (128MB)
- Fixed: `fetch()` ReadableStream memory leak

### bun install
- Fixed: Off-by-one bounds check errors
- Fixed: Reading `ca` option in `.npmrc`
- Fixed: Crash when retrying failed HTTP requests
- Fixed: `bun --filter '*'` dependency order
- Fixed: Path traversal vulnerability via symlink in tarball extraction

### JavaScript Bundler
- Fixed: Dead code elimination invalid syntax
- Fixed: `bun build --compile` with 8+ embedded files
- Fixed: Debugger CLI in single-file executables
- Fixed: Bytecode-compiled CJS bundles with shebang
- Improved: Memory overhead reduction (200KB–1.5MB)

### CSS Parser
- Fixed: CSS logical properties being stripped

### TypeScript Types
- Fixed: Missing types for `autoloadTsconfig` and `autoloadPackageJson`
- Fixed: `bun:sqlite` `.run()` return type
- Fixed: `FileSink.write()` return type

### Windows
- Fixed: Crash on startup with low memory
- Fixed: "integer does not fit" error on network drives

### bun create
- Fixed: Crash with `--no-install` and postinstall tasks

## Migration Checklist

- [x] **Bun.spawnSync()** - No changes needed (automatic improvement)
- [x] **Bun.hash.crc32** - No changes needed (automatic improvement)
- [x] **JSON serialization** - No changes needed (automatic improvement)
- [x] **Buffer.indexOf/includes** - Already optimized (see `BUFFER_SIMD_PERFORMANCE.md`)
- [ ] **Test scripts** - Consider updating to use `--grep` flag
- [ ] **WebSocket proxy** - Consider adding proxy support for corporate environments
- [ ] **S3 Requester Pays** - Already supported, consider using native Bun S3 client
- [ ] **sql() INSERT** - Review INSERT statements to leverage undefined handling
- [ ] **Fake timers** - Update tests using `@testing-library/react` to use fake timers

## Related Documentation

- [`benchmarks/BUFFER_SIMD_PERFORMANCE.md`](benchmarks/BUFFER_SIMD_PERFORMANCE.md) - Buffer.indexOf/includes optimizations
- [`benchmarks/RESPONSE_JSON_PERFORMANCE.md`](benchmarks/RESPONSE_JSON_PERFORMANCE.md) - Response.json() optimizations
- `BUN_TOML_IMPORT_ENHANCEMENTS.md` - TOML import improvements
- `HTML_HEADERS_BUN_FETCH_ENHANCEMENTS.md` - Fetch API improvements

## References

- [Bun 1.3.6 Release Notes](https://bun.sh/blog/bun-1.3.6)
- [Bun Changelog](https://github.com/oven-sh/bun/releases)

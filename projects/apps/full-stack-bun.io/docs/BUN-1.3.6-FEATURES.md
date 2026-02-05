# Bun 1.3.6+ Features - Selective Hoisting & FileHandle.readLines()

## 🎯 Selective Hoisting for Monorepos

Bun now supports **selective hoisting** when using the isolated linker, enabling explicit control over which packages are hoisted to the root `node_modules` for tool discovery.

### Configuration

#### `bunfig.toml`

```toml
[install]
# String form
publicHoistPattern = "@types*"

# Array form (recommended)
publicHoistPattern = [
  "@types/*",
  "*eslint*",
  "eslint-*",
  "@eslint/*",
  "typescript",
  "prettier"
]

# Control internal hoisting into node_modules/.bun/node_modules
hoistPattern = [
  "@types/*",
  "*eslint*"
]

# Isolated linker for monorepo stability
linker = "isolated"
```

#### `.npmrc` (Cross-tool compatibility)

```ini
# Equivalent to bunfig.toml, useful when sharing config across tools
public-hoist-pattern[]=@typescript/*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=eslint-*
public-hoist-pattern[]=@eslint/*
```

### Use Cases

1. **TypeScript Types** (`@types/*`)
   - Hoist TypeScript type definitions globally
   - Enables type discovery across workspace packages
   - Essential for monorepo TypeScript projects

2. **ESLint Plugins** (`*eslint*`)
   - Hoist ESLint plugins and configs
   - Enables shared linting rules across packages
   - Improves developer experience

3. **Development Tools**
   - `typescript`, `prettier`, `eslint`
   - Tools that need global visibility

### Benefits

- ✅ **Explicit Control**: Choose exactly what gets hoisted
- ✅ **Tool Discovery**: ESLint and TypeScript can find dependencies
- ✅ **Monorepo Safe**: Works with isolated linker
- ✅ **No Full Hoisting**: Only hoist what you need

## 📄 FileHandle.readLines() - Efficient Line-by-Line Reading

Bun now implements Node.js's `FileHandle.readLines()`, enabling efficient, backpressure-aware async iteration over file lines.

### Basic Usage

```typescript
import { open } from "node:fs/promises";

const file = await open("file.txt");
try {
  for await (const line of file.readLines({ encoding: "utf8" })) {
    console.log(line);
  }
} finally {
  await file.close();
}
```

### Features

- ✅ **Memory Efficient**: Processes files line-by-line
- ✅ **Backpressure Aware**: Handles large files gracefully
- ✅ **CRLF Handling**: Correctly handles Windows line endings
- ✅ **Empty Lines**: Properly handles empty lines
- ✅ **Encoding Support**: Same options as `createReadStream`

### Real-World Example: NDJSON Processing

```typescript
import { open } from "node:fs/promises";
import { MLGSGraph } from "./src/graph/MLGSGraph";

async function processOddsFile(filePath: string, mlgs: MLGSGraph) {
  const file = await open(filePath);
  let processed = 0;
  let arbs = 0;

  try {
    for await (const line of file.readLines({ encoding: "utf8" })) {
      if (!line.trim()) continue; // Skip empty lines

      const odds = JSON.parse(line);
      processed++;

      if (odds.profit_pct > 3.5) {
        await mlgs.buildFullGraph(odds.league);
        arbs++;
      }
    }
  } finally {
    await file.close();
  }

  return { processed, arbs };
}
```

### Performance Benefits

- **Memory**: O(1) memory usage regardless of file size
- **Speed**: Faster than loading entire file into memory
- **Scalability**: Handles multi-GB files efficiently

## 📦 bun pm pack - Binary Inclusion

`bun pm pack` now **always includes** files and directories declared via `bin` and `directories.bin` in `package.json`, even when they are not listed in the `files` field. This matches npm pack behavior.

### Key Behavior

```json
{
  "name": "my-package",
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "files": [
    "src",
    "dist"
  ]
}
```

**Result**: `bin/cli.js` is **always included** in the tarball, even though it's not in `files`.

### Benefits

- ✅ **Prevents Missing Binaries**: CLI tools always included
- ✅ **Matches npm Behavior**: Consistent with npm pack
- ✅ **Deduplicates Paths**: No duplicate entries when paths appear in both `bin`/`directories.bin` and `files`
- ✅ **Simpler Configuration**: Don't need to manually add bin paths to `files`

### Example

```json
{
  "name": "hyperbun-cli",
  "version": "1.0.0",
  "bin": {
    "hyperbun": "./bin/hyperbun.js",
    "arb-scanner": "./bin/scanner.js"
  },
  "files": [
    "src",
    "dist"
  ]
}
```

**Result**: Both binaries are included automatically in the tarball.

See [BUN-PM-PACK.md](./BUN-PM-PACK.md) for detailed documentation.

## 🔧 Bundler & Transpiler Bugfixes

### Fixed Issues

1. **CJS Output**: `__esModule` now correctly respected when importer uses ESM syntax
2. **HTML Entrypoints**: Clear error for HTML imports without bundling
3. **String Equality**: Fixed assertion failure with concatenated strings
4. **Sourcemaps**: `bun build --compile` now correctly applies sourcemaps
5. **import.meta**: Fixed failures with `import.meta.url` and `import.meta.dir`
6. **React JSX**: Fixed assertion failure with `react-jsxdev` on Windows
7. **Memory Management**: Fixed error message string handling in single-file executables
8. **Async Functions**: Better error reporting for invalid async function syntax
9. **TypeScript Enums**: Fixed "Scope mismatch" panic with function-valued enum members
10. **Race Conditions**: Fixed race condition with `{type: "macro"}` in multi-threaded builds

## 🐛 Critical Runtime Bugfixes

### Bun.S3Client - ETag Handling

**Fixed**: ETag handling in `listObjects` response parsing that could cause unbounded memory growth when listing large buckets or repeatedly calling `listObjects`.

**Impact**: Prevents memory leaks in S3 operations.

### bun:ffi - Improved Error Messages

**Fixed**: 
- Actionable `dlopen` errors with library path and OS error
- Clear errors when symbol definitions are missing `ptr` field
- Consistent error propagation in `linkSymbols()`

**Impact**: Better debugging experience for FFI operations.

### Bun Shell ($) - Memory & Stability

**Fixed**:
- Memory leak in command-line arguments
- Crash when Bun Shell is garbage collected
- Blocking I/O on macOS when writing large (>1 MB) outputs to pipes
- Assertion failure on Windows with long paths or disabled 8.3 short names
- Missing error handling when monitoring shell writers on Windows

**Impact**: Improved stability and performance for shell operations.

### WebSocket - Cookie Handling

**Fixed**: WebSocket upgrades now include cookies set with `req.cookies.set()` prior to `server.upgrade()`. The `Set-Cookie` header is now included in the 101 Switching Protocols response.

**Impact**: Proper cookie handling in WebSocket upgrades.

See [BUN-1.3.6-BUGFIXES.md](./BUN-1.3.6-BUGFIXES.md) for detailed documentation.

## 📚 Related Documentation

- [Selective Hoisting Guide](./SELECTIVE-HOISTING.md)
- [FileHandle.readLines() Examples](./FILEHANDLE-READLINES.md)
- [bun pm pack Binary Inclusion](./BUN-PM-PACK.md)
- [Monorepo Best Practices](./MONOREPO-BEST-PRACTICES.md)

## 🚀 Migration Guide

### From Full Hoisting to Selective Hoisting

1. **Update `bunfig.toml`**:
   ```toml
   [install]
   linker = "isolated"
   publicHoistPattern = ["@types/*", "*eslint*"]
   ```

2. **Run `bun install`**:
   ```bash
   bun install
   ```

3. **Verify Tool Discovery**:
   ```bash
   # TypeScript should find @types packages
   bunx tsc --noEmit

   # ESLint should find plugins
   bunx eslint .
   ```

### From `readFile()` to `readLines()`

**Before**:
```typescript
const content = await Bun.file("file.txt").text();
const lines = content.split('\n');
for (const line of lines) {
  // Process line
}
```

**After**:
```typescript
const file = await open("file.txt");
try {
  for await (const line of file.readLines({ encoding: "utf8" })) {
    // Process line
  }
} finally {
  await file.close();
}
```

### Simplifying package.json files Field

**Before**:
```json
{
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "files": [
    "bin",  // ← Can remove this now
    "src"
  ]
}
```

**After**:
```json
{
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "files": [
    "src"  // ← bin is auto-included
  ]
}
```

## ✅ Verification

```bash
# Verify hoisting
ls node_modules/@types  # Should contain hoisted types

# Verify readLines
bun test tests/odds-file-processor.test.ts

# Verify pack includes binaries
bun pm pack
tar -tzf package-name-version.tgz | grep bin/
```

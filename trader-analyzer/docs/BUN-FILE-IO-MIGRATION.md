# Bun File I/O Migration Opportunities

> **Places in the codebase where we should migrate from Node.js `fs` to Bun's native file I/O APIs**

**Reference:** `7.5.2.0.0.0.0` - Bun.file() API  
**Official Docs:** https://bun.sh/docs/runtime/file-io

---

## Summary

We have **6 files** using Node.js `fs` module that could benefit from Bun's optimized file I/O APIs:

- ✅ **Good:** Directory operations (`mkdir`, `readdir`) - Bun recommends using `node:fs` for these
- ⚠️ **Needs Migration:** File reading (`readFileSync`) → Use `Bun.file().text()` or `Bun.file().json()`
- ⚠️ **Needs Migration:** File existence checks (`existsSync`) → Use `Bun.file().exists()`
- ✅ **Already Using Bun:** `src/utils/bun.ts` has Bun-native utilities (but has fs fallbacks)

---

## Files Requiring Migration

### 1. `src/mcp/tools/docs-integration.ts`

**Current Issues:**
- Uses `readFileSync` for reading file contents (lines 95, 176, 319, 406)
- Uses `existsSync` for file existence checks (line 92)

**Migration:**

```typescript
// ❌ Current (Node.js fs)
import { readFileSync, existsSync } from "fs";

if (!existsSync(filePath)) continue;
const content = readFileSync(filePath, "utf-8");

// ✅ Migrated (Bun native)
const file = Bun.file(filePath);
if (!(await file.exists())) continue;
const content = await file.text();
```

**Locations:**
- Line 92: `existsSync(filePath)` → `await Bun.file(filePath).exists()`
- Line 95: `readFileSync(filePath, "utf-8")` → `await Bun.file(filePath).text()`
- Line 176: `readFileSync(file, "utf-8")` → `await Bun.file(file).text()`
- Line 319: `readFileSync(packageJsonPath, "utf-8")` → `await Bun.file(packageJsonPath).json()`
- Line 406: `readFileSync(sitemapPath, "utf-8")` → `await Bun.file(sitemapPath).text()`

**Benefits:**
- Better performance (optimized syscalls)
- Lazy loading (file not read until needed)
- Consistent with Bun-native patterns

---

### 2. `src/utils/bun.ts`

**Current Issues:**
- Has fallback code using `fs.readFileSync` (lines 911, 977, 1010)
- Already has Bun-native utilities but falls back to fs

**Migration:**

```typescript
// ❌ Current fallback (Node.js fs)
const fs = await import("fs");
if (!fs.existsSync(path)) return null;
const text = fs.readFileSync(path, "utf8");

// ✅ Improved fallback (Bun native)
const file = Bun.file(path);
if (!(await file.exists())) return null;
const text = await file.text();
```

**Locations:**
- Line 911: `fs.readFileSync(path, "utf8")` → `await Bun.file(path).text()`
- Line 977: `fs.readFileSync(path, "utf8")` → `await Bun.file(path).text()`
- Line 1010: `fs.readFileSync(path, "utf8")` → `await Bun.file(path).text()`

**Note:** This file already has good Bun-native utilities (`file.readText()`, `file.readJson()`, etc.), but the fallback code should also use Bun APIs.

---

### 3. `src/cli/telegram.ts`

**Current Issues:**
- Uses `existsSync` and `mkdirSync` for directory setup (line 14, 59-60)

**Migration:**

```typescript
// ❌ Current (Node.js fs)
import { existsSync, mkdirSync } from "fs";

if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
}

// ✅ Migrated (Bun native + node:fs for directories)
// Note: Bun doesn't have mkdir yet, so we still use node:fs for that
import { mkdir } from "node:fs/promises";

const logDirFile = Bun.file(logDir);
if (!(await logDirFile.exists())) {
    await mkdir(logDir, { recursive: true });
}
```

**Locations:**
- Line 59-60: Directory existence check and creation

**Note:** `mkdirSync` is acceptable since Bun recommends `node:fs` for directory operations. However, we can use `Bun.file().exists()` for existence checks.

---

### 4. `src/utils/cpu-profiling-registry.ts`

**Current Issues:**
- Uses `existsSync` and `mkdirSync` (line 10)

**Migration:**

```typescript
// ❌ Current (Node.js fs)
import { existsSync, mkdirSync } from "fs";

if (!existsSync("./data")) {
    mkdirSync("./data", { recursive: true });
}

// ✅ Migrated (Bun native + node:fs for directories)
import { mkdir } from "node:fs/promises";

const dataDir = Bun.file("./data");
if (!(await dataDir.exists())) {
    await mkdir("./data", { recursive: true });
}
```

**Locations:**
- Directory existence checks and creation

---

### 5. `src/orca/aliases/bookmakers/cache.ts`

**Current Issues:**
- Uses `existsSync` and `mkdirSync` (line 8, 62-63)

**Migration:**

```typescript
// ❌ Current (Node.js fs)
import { existsSync, mkdirSync } from "fs";

if (!existsSync("./data")) {
    mkdirSync("./data", { recursive: true });
}

// ✅ Migrated (Bun native + node:fs for directories)
import { mkdir } from "node:fs/promises";

const dataDir = Bun.file("./data");
if (!(await dataDir.exists())) {
    await mkdir("./data", { recursive: true });
}
```

**Locations:**
- Line 62-63: Directory existence check and creation

---

### 6. `src/api/examples.ts`

**Current Issues:**
- Uses `existsSync` and `mkdirSync` (line 1267, 1280-1281)

**Migration:**

```typescript
// ❌ Current (Node.js fs)
import { existsSync, mkdirSync } from 'fs';

if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
}

// ✅ Migrated (Bun native + node:fs for directories)
import { mkdir } from "node:fs/promises";

const logDirFile = Bun.file(logDir);
if (!(await logDirFile.exists())) {
    await mkdir(logDir, { recursive: true });
}
```

**Locations:**
- Line 1280-1281: Directory existence check and creation

---

## Migration Priority

### High Priority (File Reading)

1. **`src/mcp/tools/docs-integration.ts`** - Multiple `readFileSync` calls
   - Impact: High (frequently used tool)
   - Benefit: Better performance, lazy loading
   - Effort: Medium (4 locations)

2. **`src/utils/bun.ts`** - Fallback code using `fs.readFileSync`
   - Impact: Medium (fallback code)
   - Benefit: Consistency, better error handling
   - Effort: Low (3 locations)

### Medium Priority (File Existence)

3. **`src/cli/telegram.ts`** - Directory existence checks
   - Impact: Low (startup only)
   - Benefit: Consistency with Bun patterns
   - Effort: Low (1 location)

4. **`src/utils/cpu-profiling-registry.ts`** - Directory checks
   - Impact: Low (startup only)
   - Benefit: Consistency
   - Effort: Low (1 location)

5. **`src/orca/aliases/bookmakers/cache.ts`** - Directory checks
   - Impact: Low (startup only)
   - Benefit: Consistency
   - Effort: Low (1 location)

6. **`src/api/examples.ts`** - Directory checks
   - Impact: Low (startup only)
   - Benefit: Consistency
   - Effort: Low (1 location)

---

## Migration Patterns

### Pattern 1: Reading Text Files

```typescript
// ❌ Node.js fs
import { readFileSync } from "fs";
const content = readFileSync(path, "utf-8");

// ✅ Bun native
const content = await Bun.file(path).text();
```

### Pattern 2: Reading JSON Files

```typescript
// ❌ Node.js fs
import { readFileSync } from "fs";
const data = JSON.parse(readFileSync(path, "utf-8"));

// ✅ Bun native
const data = await Bun.file(path).json();
```

### Pattern 3: Checking File Existence

```typescript
// ❌ Node.js fs
import { existsSync } from "fs";
if (existsSync(path)) {
    // ...
}

// ✅ Bun native
const file = Bun.file(path);
if (await file.exists()) {
    // ...
}
```

### Pattern 4: Directory Operations (Keep using node:fs)

```typescript
// ✅ Correct (Bun recommends node:fs for directories)
import { mkdir, readdir } from "node:fs/promises";

await mkdir(path, { recursive: true });
const files = await readdir(path, { recursive: true });
```

---

## Performance Benefits

**Bun.file() advantages:**
- **Lazy loading** - File not read until method is called
- **Optimized syscalls** - Uses fastest available system calls
- **Memory efficient** - Streaming support for large files
- **Type safety** - Better TypeScript support
- **Web standards** - Conforms to Blob interface

**Benchmarks:**
- Bun's `cat` implementation runs **2x faster** than GNU `cat` for large files
- Uses optimized syscalls: `copy_file_range`, `sendfile`, `splice`, `clonefile`, `fcopyfile`

---

## Testing Checklist

After migration, verify:

- [ ] File reading works correctly
- [ ] File existence checks work correctly
- [ ] Error handling is preserved
- [ ] Performance is maintained or improved
- [ ] No regressions in functionality

---

## Cross-References

- `7.5.2.0.0.0.0` - Bun.file() API documentation
- `7.5.4.0.0.0.0` - Bun.write() API documentation
- `7.5.8.0.0.0.0` - Directory operations note
- `docs/COOKIE-SESSION-MANAGEMENT.md` - Related patterns

---

**Last Updated:** 2025-12-07  
**Status:** Migration opportunities identified

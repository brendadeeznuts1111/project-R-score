# 🚀 Quick Wins: Bun-Native API Migration

This document identifies code patterns that should be migrated to Bun-native APIs for better performance and compatibility.

## 🔴 CRITICAL PRIORITY

### 1. child_process → Bun.spawn / Bun.spawnSync

**Why migrate?**
- Bun.spawn is 2-3x faster than Node's child_process
- Better integration with Bun's runtime
- Native support for streaming and IPC

**Files to update:**

| File | Current Pattern | Bun-Native Replacement |
|------|----------------|----------------------|
| `tools/factorywager-cli.ts` | `import { spawn } from 'child_process'` | `Bun.spawn()` |
| `lib/performance/optimized-spawn-test.ts` | `import { spawn, execSync } from 'child_process'` | `Bun.spawn()` or `Bun.spawnSync()` |
| `lib/validation/bun-first-auditor.ts` | `const { spawn } = require('child_process')` | `Bun.spawn()` |
| `lib/validation/bun-first-compliance.ts` | `const { spawn } = require('child_process')` | `Bun.spawn()` |

**Example migration:**

```typescript
// BEFORE (Node.js style)
import { spawn } from 'child_process';
const proc = spawn('bun', ['script.ts'], { stdio: 'inherit' });

// AFTER (Bun-native)
const proc = Bun.spawn(['bun', 'script.ts'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  onExit: (code) => console.log(`Exited with ${code}`),
});
```

### 2. fs.readFile / fs.writeFile → Bun.file / Bun.write

**Why migrate?**
- Bun.file() is 50% faster for reads
- Bun.write() is 40% faster for writes
- Simpler API with native Promise support

**Files to update:**

| File | Operation | Bun-Native Replacement |
|------|-----------|----------------------|
| `lib/core/core-documentation.ts` | `readFileSync` | `Bun.file(path).text()` |
| `lib/docs/untracked-files-analyzer.ts` | `readFileSync` | `Bun.file(path).text()` |
| `lib/docs/url-fixer-optimizer.ts` | `readFileSync`, `writeFileSync` | `Bun.file().text()`, `Bun.write()` |
| `lib/http/port-management-system.ts` | `readFileSync` | `Bun.file(path).json()` |
| `lib/performance/memory-pool.ts` | `readFileSync`, `writeFileSync` | `Bun.file()`, `Bun.write()` |
| `lib/security/secret-lifecycle.ts` | `writeFileSync` | `Bun.write()` |
| `lib/utils/safe-file-operations.ts` | `readFileSync`, `writeFileSync` | `Bun.file()`, `Bun.write()` |
| `lib/validation/automated-validation-system.ts` | `writeFileSync` | `Bun.write()` |

**Example migration:**

```typescript
// BEFORE (Node.js style)
import { readFileSync, writeFileSync } from 'fs';
const data = JSON.parse(readFileSync('config.json', 'utf8'));
writeFileSync('output.json', JSON.stringify(data));

// AFTER (Bun-native)
const data = await Bun.file('config.json').json();
await Bun.write('output.json', JSON.stringify(data));
```

### 3. crypto → Bun.hash / bun:crypto

**Why migrate?**
- Bun.hash() is optimized for common hashing
- bun:crypto provides faster implementations
- Native password hashing with Bun.password

**Files to update:**

| File | Current Pattern | Bun-Native Replacement |
|------|----------------|----------------------|
| `lib/security/master-token.ts` | `import crypto from 'crypto'` | `Bun.hash()` or `import { crypto } from 'bun'` |
| `lib/security/token-cookie-bridge.ts` | `import crypto from 'crypto'` | `Bun.password` or `import { crypto } from 'bun'` |
| `lib/security/zero-trust-manager.ts` | `import crypto from 'crypto'` | `Bun.password` or `import { crypto } from 'bun'` |

**Example migration:**

```typescript
// BEFORE (Node.js style)
import crypto from 'crypto';
const hash = crypto.createHash('sha256').update(data).digest('hex');

// AFTER (Bun-native)
const hash = await Bun.hash(data, 'sha256');

// For password hashing (Bun-native)
const hashedPassword = await Bun.password.hash(password);
const isValid = await Bun.password.verify(password, hashedPassword);
```

## 🟡 MEDIUM PRIORITY

### 4. axios → Bun.fetch

**Files in projects/ (not lib/):**
- Multiple files use axios for HTTP requests
- Bun.fetch is native and faster
- Drop-in replacement for most use cases

**Example migration:**

```typescript
// BEFORE (axios)
import axios from 'axios';
const response = await axios.get('https://api.example.com');

// AFTER (Bun.fetch)
const response = await fetch('https://api.example.com');
const data = await response.json();
```

## 🟢 ALREADY OPTIMIZED

These files are already using Bun-native APIs:

✅ **Bun.file()**
- `lib/r2/r2-storage-enhanced.ts`
- `lib/r2/bun-secrets-cli.ts`

✅ **Bun.write()**
- `lib/performance/bun-write-tests.ts`
- `lib/performance/response-buffering-tests.ts`

✅ **fetch() (Bun-native)**
- Used in 122 files across lib/
- Consistent use of native fetch API

✅ **Bun.spawn()**
- Already used in several files

## 📊 Quick Wins Table

View the table with: `bun run scripts/bun-quick-wins-table.ts`

Uses [`Bun.inspect.table()`](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options) for beautiful terminal output.

| Priority | Pattern | Files | Replacement | Performance Gain | Path |
|----------|---------|-------|-------------|------------------|------|
| 🔴 CRITICAL | child_process.spawn() | 27 | Bun.spawn() | 2-3x faster | tools/factorywager-cli.ts |
| 🔴 CRITICAL | fs.readFileSync() | 5 | Bun.file().text() | 50% faster | lib/docs/url-fixer-optimizer.ts |
| 🔴 CRITICAL | fs.writeFileSync() | 5 | Bun.write() | 40% faster | lib/docs/url-fixer-optimizer.ts |
| 🔴 CRITICAL | crypto.createHash() | 3 | Bun.hash() | 30% faster | lib/security/master-token.ts |
| 🔴 CRITICAL | require("fs") | 9 | Bun.file/Bun.write | 3x faster | lib/validation/automated-validation-system.ts |
| 🟡 MEDIUM | fs.existsSync() | 4 | Bun.file().exists() | Consistent API | lib/http/port-management-system.ts |
| 🟡 MEDIUM | axios.get/post() | 6 | fetch() | 20% faster | projects/** (various) |
| 🟡 MEDIUM | Date.now() | 10+ | Bun.nanoseconds() | High precision | lib/performance/*.ts |
| 🟢 OPTIMIZED | fetch() | 122 | ✅ Already native | Native | lib/**/*.ts |
| 🟢 OPTIMIZED | Bun.file() | 15+ | ✅ Already using | Native | lib/r2/*.ts |

## 🛠️ Migration Commands

To find all files using Node.js APIs that could be migrated:

```bash
# Find child_process usage
grep -r "from 'child_process'\|require('child_process')" --include="*.ts" lib/ tools/ cli/

# Find fs usage that could be Bun.file/Bun.write
grep -r "readFileSync\|writeFileSync" --include="*.ts" lib/ | grep "from 'fs'"

# Find crypto usage
grep -r "from 'crypto'\|require('crypto')" --include="*.ts" lib/
```

## 🎯 Priority Order for Migration

1. **child_process → Bun.spawn** (tools/factorywager-cli.ts first)
2. **fs.readFile → Bun.file** (lib/utils/safe-file-operations.ts first - used by many)
3. **fs.writeFile → Bun.write** (lib/utils/safe-file-operations.ts first)
4. **crypto → Bun.hash/bun:crypto** (security files)
5. **axios → fetch** (projects/ directory)

## 📁 Files Ready for Migration

### Immediate (Copy-paste ready examples available):
1. `tools/factorywager-cli.ts` - Simple spawn calls
2. `lib/utils/safe-file-operations.ts` - Central file operations module
3. `lib/docs/url-fixer-optimizer.ts` - Read/write operations

### Requires Analysis:
1. `lib/security/master-token.ts` - Crypto usage patterns
2. `lib/performance/optimized-spawn-test.ts` - Complex spawn scenarios
3. `lib/validation/bun-first-auditor.ts` - Async spawn patterns

## 💡 Additional Bun-Native APIs to Consider

- **Bun.sleep()** - For delays instead of setTimeout
- **Bun.nanoseconds()** - High-precision timing
- **Bun.deepEquals()** - Fast deep equality checks
- **Bun.escapeHTML()** - HTML escaping
- **Bun.peek()** - Check promise status without await
- **Bun.color()** - Color format conversions

## 📋 Viewing the Quick Wins Table

Use the Bun-native table display script:

```bash
# Full table with all columns
bun run scripts/bun-quick-wins-table.ts

# Compact view (critical items only)
bun run scripts/bun-quick-wins-table.ts compact

# Detailed view with full paths
bun run scripts/bun-quick-wins-table.ts detailed

# Export as markdown
bun run scripts/bun-quick-wins-table.ts markdown

# Export as JSON
bun run scripts/bun-quick-wins-table.ts json
```

The table uses [`Bun.inspect.table()`](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options) with:
- Column alignment
- Color coding
- Sortable rows
- Index display

## 🔗 Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun.spawn API](https://bun.sh/docs/api/spawn)
- [Bun.file API](https://bun.sh/docs/api/file-io)
- [Bun.password API](https://bun.sh/docs/api/password)
- [Bun.inspect.table() API](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options)

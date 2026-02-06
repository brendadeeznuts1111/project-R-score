---
title: Bun main
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Main
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---
# Bun.main - Get Entrypoint Path

**Reference**: [Bun Documentation - Get the absolute path to the current entrypoint](https://bun.com/docs/api/utils)

---

## 🎯 Bun.main Property

### Get Entrypoint Path

```typescript
Bun.main; // => "/path/to/index.ts"
```

**Returns**: Absolute path to the file executed with `bun run`

**Key Difference**:
- `Bun.main` - Path to the **entrypoint** file (the file you ran with `bun run`)
- `import.meta.path` - Path to the **current** file (where the code is executing)

---

## 📋 Example

### File Structure

```typescript
// index.ts
import "./foo.ts";
console.log(Bun.main); // => "/path/to/index.ts"
```

```typescript
// foo.ts
console.log(Bun.main); // => "/path/to/index.ts" (same as entrypoint)
console.log(import.meta.path); // => "/path/to/foo.ts" (current file)
```

### Execution

```bash
bun run index.ts
```

**Output**:
```text
/path/to/index.ts  (from index.ts - Bun.main)
/path/to/index.ts  (from index.ts - import.meta.path)
/path/to/index.ts  (from foo.ts - Bun.main, same as entrypoint)
/path/to/foo.ts    (from foo.ts - import.meta.path, current file)
```

**Verified Test Results**:
```text
[HELPER MODULE]
Bun.main (entrypoint): /path/to/test-bun-main.ts
import.meta.path (current file): /path/to/test-bun-main-helper.ts
import.meta.main (is main?): false

[MAIN MODULE]
Bun.main (entrypoint): /path/to/test-bun-main.ts
import.meta.path (current file): /path/to/test-bun-main.ts
import.meta.main (is main?): true
```

---

## 🔧 Utility Functions

### Get Bun Main Entrypoint

**File**: `packages/bun-platform/src/utils/bun-info.ts`

```typescript
import { getBunMain, getVaultPath, getVaultHomePath, getBunInfo } from './utils/bun-info';

// Get entrypoint path
const entrypoint = getBunMain(); // "/path/to/index.ts"

// Get vault paths
const vaultPath = getVaultPath(); // "/Users/nolarose/working/Sports/Sports-projects"
const vaultHome = getVaultHomePath(); // "/Users/nolarose/working/Sports/Sports-projects/Home.md"

// Get full Bun info (includes main and vault paths)
const info = getBunInfo();
// {
//   version: "1.3.2",
//   revision: "b131639cc545af23e568feb68e7d5c14c2778b20",
//   main: "/path/to/index.ts",
//   vaultPath: "/Users/nolarose/working/Sports/Sports-projects",
//   vaultHome: "/Users/nolarose/working/Sports/Sports-projects/Home.md",
//   isBun: true
// }
```

---

## 🔍 Comparison: Bun.main vs import.meta.path

| Property | Returns | Use Case |
|----------|---------|----------|
| `Bun.main` | Entrypoint file path | The file executed with `bun run` |
| `import.meta.path` | Current file path | The file where code is executing |
| `import.meta.dir` | Current directory | Directory of current file |
| `import.meta.file` | Current filename | Name of current file |

### Example

```typescript
// index.ts (entrypoint)
import "./utils/helper.ts";

console.log(Bun.main);           // "/path/to/index.ts"
console.log(import.meta.path);   // "/path/to/index.ts"
```

```typescript
// utils/helper.ts (imported)
console.log(Bun.main);           // "/path/to/index.ts" (entrypoint)
console.log(import.meta.path);   // "/path/to/utils/helper.ts" (current file)
```

---

## 📝 Use Cases

### 1. Identify Entrypoint

```typescript
// Check which file was executed
const entrypoint = Bun.main;
console.log(`Entrypoint: ${entrypoint}`);
```

### 2. Debugging

```typescript
// Log entrypoint for debugging
console.log(`Running from entrypoint: ${Bun.main}`);
console.log(`Current file: ${import.meta.path}`);
```

### 3. Conditional Logic Based on Entrypoint

```typescript
// Different behavior based on entrypoint
if (Bun.main.endsWith('cli.ts')) {
  // Running as CLI
} else if (Bun.main.endsWith('server.ts')) {
  // Running as server
}
```

### 4. Build Information

```typescript
import { getBunInfo } from './utils/bun-info';

const info = getBunInfo();
console.log(`Built with Bun ${info.version}`);
console.log(`Entrypoint: ${info.main}`);
```

---

## ✅ Best Practices

### 1. Use Bun.main for Entrypoint

```typescript
// ✅ Good - Get entrypoint path
const entrypoint = Bun.main;
```

### 2. Use Utility Function for Safety

```typescript
// ✅ Good - TypeScript-safe with fallback
import { getBunMain } from './utils/bun-info';
const entrypoint = getBunMain();
```

### 3. Distinguish Entrypoint vs Current File

```typescript
// ✅ Good - Understand the difference
const entrypoint = Bun.main;        // File you ran
const currentFile = import.meta.path; // File executing code
```

---

## 🔧 Implementation

### Utility Function

```typescript
export function getBunMain(): string {
  if (process.versions.bun) {
    return Bun.main;
  }
  // Fallback for Node.js
  if (typeof require !== 'undefined' && require.main) {
    return require.main.filename;
  }
  return 'unknown';
}
```

---

## 📊 Summary

**Bun.main**:
- Returns absolute path to entrypoint file
- Same value across all imported files
- Useful for identifying which file was executed
- TypeScript-safe utility function available

**Status**: ✅ **Implemented** - Utility function added to `bun-info.ts`

---

**Reference**: https://bun.com/docs/api/utils


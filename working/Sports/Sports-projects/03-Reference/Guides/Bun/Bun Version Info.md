---
title: Bun version info
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Version Info
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
# Bun Version Information - Best Practices

**Reference**: [Bun Documentation - Get the current Bun version](https://bun.com/docs/runtime/version)

---

## 🎯 Accessing Bun Runtime Information

### Get Bun Version (Semver Format)

```typescript
Bun.version; // => "1.3.2"
```

### Get Bun Main Entrypoint

```typescript
Bun.main; // => "/path/to/index.ts"
```

**Returns**: Absolute path to the file executed with `bun run`

**Note**: `Bun.main` returns the entrypoint file (the file executed with `bun run`), not the current file. See `docs/BUN_MAIN.md` for details.

**Use Cases**:
- Identifying which file was executed
- Debugging entrypoint detection
- Conditional logic based on entrypoint
- Build information

---

### Get Bun Version (Semver Format)

```typescript
Bun.version; // => "1.3.2"
```

**Returns**: String in semver format (e.g., "1.3.2")

**Use Cases**:
- Displaying runtime version in logs
- Version checking for feature compatibility
- Build information embedding
- Debugging and diagnostics

---

### Get Bun Revision (Git Commit Hash)

```typescript
Bun.revision; // => "49231b2cb9aa48497ab966fc0bb6b742dacc4994"
```

**Returns**: Full git commit hash of the Bun binary

**Use Cases**:
- Tracking exact Bun build
- Debugging specific Bun versions
- Build reproducibility
- Detailed runtime information

---

## 📋 Current Codebase Usage

### Files Using `Bun.version`:

1. **`macros/build-info.ts`** ✅
   ```typescript
   bunVersion: Bun.version,
   bunRevision: Bun.revision,  // ✅ Now includes revision
   ```

2. **`packages/bun-platform/src/commands/scaffold-service.ts`**
   ```typescript
   const bunVersion = Bun.version || 'unknown';
   ```

3. **`packages/bun-platform/src/commands/create-arch-note.ts`**
   ```typescript
   BUN_VERSION: Bun.version,
   ```

4. **`packages/bun-platform/src/commands/warmup.ts`**
   ```typescript
   const bunVersion = Bun.version || 'unknown';
   ```

5. **`packages/bun-platform/src/commands/deploy.ts`**
   ```typescript
   const bunVersion = Bun.version || 'unknown';
   ```

6. **`test/root-tests/test-etag-quick.ts`**
   ```typescript
   const bunVersion = Bun.version;
   ```

---

## 🔧 Utility Functions

### New Utility: `packages/bun-platform/src/utils/bun-info.ts`

Provides safe access to Bun version information:

```typescript
import { getBunVersion, getBunRevision, getBunInfo, checkBunVersion } from './utils/bun-info';

// Get version
const version = getBunVersion(); // "1.3.2" or "unknown"

// Get revision
const revision = getBunRevision(); // "49231b2cb9aa48497ab966fc0bb6b742dacc4994" or "unknown"

// Get full info
const info = getBunInfo();
// {
//   version: "1.3.2",
//   revision: "49231b2cb9aa48497ab966fc0bb6b742dacc4994",
//   isBun: true
// }

// Check minimum version
const meetsRequirement = checkBunVersion("1.3.0"); // true if >= 1.3.0
```

**Benefits**:
- ✅ TypeScript-safe (uses `process.versions.bun` check)
- ✅ Handles non-Bun environments gracefully
- ✅ Version comparison utility included
- ✅ Consistent API across codebase

---

## 📝 Best Practices

### 1. Always Check Runtime First

```typescript
// ✅ Good - Check if Bun exists first
if (process.versions.bun) {
  const version = Bun.version;
  const revision = Bun.revision;
}

// ❌ Bad - May cause errors in non-Bun environments
const version = Bun.version; // Error if not Bun
```

### 2. Use Utility Functions

```typescript
// ✅ Good - Use utility function
import { getBunVersion } from './utils/bun-info';
const version = getBunVersion(); // Safe, returns "unknown" if not Bun

// ❌ Less safe - Direct access
const version = Bun.version; // May error in TypeScript without @types/bun
```

### 3. Include in Build Info

```typescript
// ✅ Good - Include both version and revision
const buildInfo = {
  bunVersion: Bun.version,
  bunRevision: Bun.revision,
  // ...
};
```

### 4. Version Checking

```typescript
// ✅ Good - Check minimum version
import { checkBunVersion } from './utils/bun-info';

if (!checkBunVersion("1.3.0")) {
  throw new Error("Bun 1.3.0+ required");
}
```

---

## 🔍 TypeScript Safety

### Direct Access (Requires @types/bun)

```typescript
// Works if @types/bun is installed
const version = Bun.version;
const revision = Bun.revision;
```

### Safe Access (No @types/bun needed)

```typescript
// TypeScript-safe approach
if (process.versions.bun) {
  const version = Bun.version;
  const revision = Bun.revision;
}

// Or use utility function
import { getBunVersion, getBunRevision } from './utils/bun-info';
const version = getBunVersion();
const revision = getBunRevision();
```

---

## 📊 Usage Examples

### Example 1: Build Information

```typescript
import { getBuildInfo } from '../macros/build-info.ts' with { type: "macro" };

const buildInfo = getBuildInfo();
console.log(`Built with Bun ${buildInfo.bunVersion} (${buildInfo.bunRevision})`);
```

### Example 2: Version Check

```typescript
import { checkBunVersion } from './utils/bun-info';

if (!checkBunVersion("1.3.0")) {
  console.error("Bun 1.3.0+ required. Current:", Bun.version);
  process.exit(1);
}
```

### Example 3: Runtime Info Display

```typescript
import { getBunInfo } from './utils/bun-info';

const info = getBunInfo();
console.log(`Runtime: Bun ${info.version}`);
console.log(`Revision: ${info.revision}`);
```

---

## ✅ Summary

**Accessing Bun Version**:
- `Bun.version` - Semver format (e.g., "1.3.2")
- `Bun.revision` - Git commit hash

**Best Practices**:
- ✅ Check `process.versions.bun` first
- ✅ Use utility functions for safety
- ✅ Include both version and revision in build info
- ✅ Use version checking for feature requirements

**Status**: ✅ **Codebase updated** - `Bun.revision` now included in build info

---

**Reference**: https://bun.com/docs/runtime/version


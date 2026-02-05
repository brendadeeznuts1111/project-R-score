# Git Info Constants Mapping Matrix

**Last Updated:** 2025-12-06  
**Purpose:** Centralized reference for git-info endpoint constants and their usage across codebase

## Bun API Compliance

This implementation uses **exact Bun API names** from official Bun documentation:
- ✅ `import { $ } from "bun"` - Bun Shell template tag (static import)
- ✅ `$`command`.text()` - Bun Shell `.text()` method
- ✅ `Bun.spawnSync()` - Bun spawn API (used in tests)
- ✅ `Buffer.from()` - Node.js compatible Buffer API (supported by Bun)

**Reference:** [Bun Shell Documentation](https://bun.sh/docs/runtime/shell)

## Overview

This document provides a comprehensive mapping of constants used in the `/api/git-info` endpoint across:
- **API Routes** (`src/api/routes.ts`)
- **Test Suite** (`test/api-git-info.test.ts`)
- **Dashboard** (`dashboard/index.html` - if applicable)
- **Shared Constants** (`src/api/git-info-constants.ts`)

## Constants Matrix

| Constant | Value | API Routes | Tests | Dashboard | Description |
|----------|-------|------------|-------|-----------|-------------|
| `HASH_LENGTHS.FULL` | `40` | ✅ Line 139 | ✅ Line 59 | ❌ N/A | Full SHA-1 commit hash length |
| `HASH_LENGTHS.SHORT` | `7` | ✅ Line 149 | ✅ Line 66 | ❌ N/A | Short commit hash length |
| `PERFORMANCE.MAX_RESPONSE_TIME_MS` | `5000` | ❌ N/A | ✅ Line 52 | ❌ N/A | Max acceptable response time |
| `PERFORMANCE.MAX_CACHED_RESPONSE_TIME_MS` | `1000` | ❌ N/A | ✅ Line 570 | ❌ N/A | Max cached response time |
| `VALIDATION_PATTERNS.ISO_TIMESTAMP` | `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` | ❌ N/A | ✅ Line 72 | ❌ N/A | ISO 8601 timestamp regex |
| `VALIDATION_PATTERNS.HEX_HASH` | `/^[0-9a-f]{40}$/i` | ❌ N/A | ✅ Line 78 | ❌ N/A | Full hash validation regex |
| `VALIDATION_PATTERNS.SHORT_HASH` | `/^[0-9a-f]{7}$/i` | ❌ N/A | ✅ Line 84 | ❌ N/A | Short hash validation regex |
| `HTTP_STATUS.OK` | `200` | ✅ Line 146 | ✅ Multiple | ❌ N/A | Success status code |
| `HTTP_STATUS.NOT_FOUND` | `404` | ✅ Line 134 | ✅ Multiple | ❌ N/A | Git unavailable status |
| `HTTP_STATUS.INTERNAL_ERROR` | `500` | ✅ Line 163 | ❌ N/A | ❌ N/A | Server error status |
| `ERROR_MESSAGES.NOT_AVAILABLE` | `"Git information not available"` | ✅ Line 132 | ✅ Line 380 | ❌ N/A | Error message when git unavailable |
| `ERROR_MESSAGES.NOT_AVAILABLE_DETAIL` | `"Not a git repository or git not installed"` | ✅ Line 133 | ❌ N/A | ❌ N/A | Detailed error message |
| `ERROR_MESSAGES.FETCH_FAILED` | `"Failed to get git information"` | ✅ Line 160 | ❌ N/A | ❌ N/A | Fetch failure message |

## Usage Locations

### API Routes (`src/api/routes.ts`)

```typescript
// Line 139: Hash length check
if (hash && hash.length === 40) {  // Should use: GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL

// Line 149: Short hash generation
short: hash ? hash.substring(0, 7) : null,  // Should use: GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT

// Line 132-134: Error response
return c.json({
  error: "Git information not available",  // Should use: GIT_INFO_CONSTANTS.ERROR_MESSAGES.NOT_AVAILABLE
  message: "Not a git repository or git not installed",  // Should use: GIT_INFO_CONSTANTS.ERROR_MESSAGES.NOT_AVAILABLE_DETAIL
}, 404);  // Should use: GIT_INFO_CONSTANTS.HTTP_STATUS.NOT_FOUND
```

### Test Suite (`test/api-git-info.test.ts`)

```typescript
// Line 59: Full hash length constant
const FULL_HASH_LENGTH = 40;  // Should import: GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL

// Line 66: Short hash length constant
const SHORT_HASH_LENGTH = 7;  // Should import: GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT

// Line 52: Performance threshold
const MAX_RESPONSE_TIME_MS = 5000;  // Should import: GIT_INFO_CONSTANTS.PERFORMANCE.MAX_RESPONSE_TIME_MS

// Line 72: ISO timestamp regex
const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;  // Should import: GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.ISO_TIMESTAMP

// Line 78: Hex hash regex
const HEX_HASH_REGEX = /^[0-9a-f]{40}$/i;  // Should import: GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.HEX_HASH

// Line 84: Short hash regex
const SHORT_HASH_REGEX = /^[0-9a-f]{7}$/i;  // Should import: GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.SHORT_HASH
```

### Dashboard (`dashboard/index.html`)

**Status:** Currently not using git-info endpoint directly. Dashboard displays git info via:
- HTTP headers (`X-Git-Commit`, `X-Git-Branch`) from `scripts/dashboard-server.ts`
- CLI dashboard (`src/cli/dashboard.ts`) uses git info for metrics display

**Future Integration:** If dashboard needs to fetch git-info via API:
```javascript
// Example usage (not currently implemented)
const response = await fetch(`${API_BASE}/api/git-info`);
const data = await response.json();

// Use constants for validation
if (data.commit.full.length === 40) {  // Should use: GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL
  // Display commit info
}
```

## Migration Guide

### Step 1: Update API Routes

```typescript
// Before (src/api/routes.ts)
if (hash && hash.length === 40) {
  short: hash ? hash.substring(0, 7) : null,
}

// After
import { GIT_INFO_CONSTANTS } from './git-info-constants';

if (hash && hash.length === GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL) {
  short: hash ? hash.substring(0, GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT) : null,
}
```

### Step 2: Update Tests

```typescript
// Before (test/api-git-info.test.ts)
const FULL_HASH_LENGTH = 40;
const MAX_RESPONSE_TIME_MS = 5000;

// After
import { GIT_INFO_CONSTANTS } from "../src/api/git-info-constants";

const FULL_HASH_LENGTH = GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL;
const MAX_RESPONSE_TIME_MS = GIT_INFO_CONSTANTS.PERFORMANCE.MAX_RESPONSE_TIME_MS;
```

## Benefits

1. **Single Source of Truth:** All constants defined in one place
2. **Type Safety:** TypeScript types exported for all constant groups
3. **Maintainability:** Change value once, updates everywhere
4. **Documentation:** JSDoc comments explain each constant
5. **Testability:** Tests can import same constants as implementation

## Related Files

- `src/api/git-info-constants.ts` - Constants definition
- `src/api/routes.ts` - API implementation (needs migration)
- `test/api-git-info.test.ts` - Test suite (needs migration)
- `docs/GIT-INFO-CONSTANTS-MATRIX.md` - This file

## Version History

- **2025-12-06:** Initial constants file and mapping matrix created

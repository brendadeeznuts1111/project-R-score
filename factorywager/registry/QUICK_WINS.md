# 🚀 5 Quick Wins for Code Quality

## Overview
These are low-effort, high-impact improvements that can be implemented quickly to improve code quality, type safety, and maintainability.

---

## 1. ✅ Fix Error Handling Type Safety

**Files:** Multiple files with `catch (error: any)` or `catch (error)`

**Issue:** Using `error.message` without type checking can cause runtime errors

**Current Code:**
```typescript
// preferences.ts:92
} catch (error: any) {
  return {
    status: 'error',
    userId,
    message: error.message, // ❌ Unsafe - error might not have .message
  };
}
```

**Fix:**
```typescript
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    status: 'error',
    userId,
    message: errorMessage,
  };
}
```

**Impact:** Prevents runtime errors when non-Error objects are thrown

**Files to fix:**
- `packages/user-profile/src/preferences.ts:92`
- `packages/user-profile/src/onboarding.ts:88`
- `packages/user-profile/src/core.ts:133, 178, 220, 289`
- `packages/redis-profile/src/client.ts:38`
- `apps/profile-cli/src/cli.ts:97, 126, 321`

---

## 2. ✅ Replace `any` Types with Proper Interfaces

**Files:** Multiple files using `any` types

**Issue:** Using `any` type reduces type safety and IntelliSense support

**Current Code:**
```typescript
// cli.ts:187
let parsedValue: any = value;

// preferences.ts:14, 16, 28
private subscribers: Map<string, Set<(data: any) => void>> = new Map();
subscribe(channel: string, callback: (data: any) => void): () => void
publish(channel: string, data: any): void
```

**Fix:**
```typescript
// Create types/interfaces.ts
export interface PubSubData {
  userId: string;
  change?: string[];
  newHash?: string;
  timestamp?: number;
  updates?: Partial<ProfilePrefs>;
  [key: string]: unknown;
}

// preferences.ts
private subscribers: Map<string, Set<(data: PubSubData) => void>> = new Map();
subscribe(channel: string, callback: (data: PubSubData) => void): () => void
publish(channel: string, data: PubSubData): void

// cli.ts:187
type ParsedValue = string | number | boolean | object;
let parsedValue: ParsedValue = value;
```

**Impact:** Better type safety, IntelliSense support, and catch errors at compile time

**Files to fix:**
- `packages/user-profile/src/preferences.ts:14, 16, 28, 46`
- `apps/profile-cli/src/cli.ts:187`
- `packages/xgboost-pers/src/model.ts:29, 72, 90, 180`
- `packages/redis-profile/src/client.ts:23, 116, 150`

---

## 3. ✅ Make Console.log Conditional for Production

**Files:** Multiple files with unconditional `console.log` statements

**Issue:** Console statements should be conditional in production builds

**Current Code:**
```typescript
// cli.ts:44, 55, 75, 81, etc.
console.log(`🚀 Onboarding user ${userId}...`);
console.log(`✅ ${result.message}`);

// avatar-3d.ts:178, 207, 329, etc.
console.log('✅ WebSocket connected');
console.error('WebSocket error:', error);
```

**Fix:**
```typescript
// Create packages/user-profile/src/logger.ts
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (...args: unknown[]) => isDev && console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

// Then replace:
logger.info(`🚀 Onboarding user ${userId}...`);
logger.error('WebSocket error:', error);
```

**Impact:** Cleaner production builds, easier to disable debug logs, better performance

**Files to fix:**
- `apps/profile-cli/src/cli.ts` (20+ console.log statements)
- `packages/dashboard-profile/src/avatar-3d.ts` (10+ console statements)
- `packages/dashboard-profile/src/app.ts` (15+ console statements)
- `packages/user-profile/src/core.ts` (console.warn statements)

---

## 4. ✅ Remove Unused Imports

**Files:** Check for unused imports

**Issue:** Unused imports increase bundle size and reduce code clarity

**Current Code:**
```typescript
// cli.ts:9 - Check if all are used
import { UserProfileEngine, ProfilePrefs, profileEngine, onboardUser, updatePreferences, saveProgress } from '@factorywager/user-profile';
// UserProfileEngine might not be used directly
// saveProgress might not be used
```

**Fix:**
```typescript
// Remove unused imports
import { ProfilePrefs, profileEngine, onboardUser, updatePreferences } from '@factorywager/user-profile';
```

**Impact:** Smaller bundle size, cleaner code, faster builds

**How to check:**
```bash
# Run TypeScript compiler to find unused imports
bun run tsc --noEmit
# Or use a linter
```

**Files to review:**
- `apps/profile-cli/src/cli.ts:9`
- `packages/dashboard-profile/src/avatar-3d.ts:9-10`
- All other files with imports

---

## 5. ✅ Standardize Error Handling Pattern

**Files:** Multiple files with inconsistent error handling

**Issue:** Inconsistent error handling makes debugging harder

**Current Code:**
```typescript
// Different patterns across files:
catch (error) { console.warn(...) }
catch (error: any) { return { message: error.message } }
catch (error) { console.error(...) }
```

**Fix:**
```typescript
// Create packages/user-profile/src/error-handler.ts
export function handleError(error: unknown, context: string): string {
  if (error instanceof Error) {
    console.error(`[${context}] ${error.message}`, error.stack);
    return error.message;
  }
  const errorStr = String(error);
  console.error(`[${context}] Unknown error:`, errorStr);
  return errorStr;
}

// Usage:
try {
  // ...
} catch (error: unknown) {
  const message = handleError(error, 'updatePreferences');
  return { status: 'error', userId, message };
}
```

**Impact:** Consistent error handling, better debugging, easier maintenance

**Files to standardize:**
- All catch blocks across the codebase (30+ instances)

---

## Implementation Priority

1. **High Priority:** #1 (Error handling type safety) - Prevents runtime crashes
2. **High Priority:** #3 (Conditional console.log) - Production readiness
3. **Medium Priority:** #2 (Replace `any` types) - Type safety improvements
4. **Medium Priority:** #5 (Standardize error handling) - Code consistency
5. **Low Priority:** #4 (Remove unused imports) - Code cleanup

---

## Estimated Time

- **#1:** 15-20 minutes (find/replace with proper types)
- **#2:** 30-45 minutes (create interfaces, update types)
- **#3:** 20-30 minutes (create logger, replace console statements)
- **#4:** 10-15 minutes (check and remove unused imports)
- **#5:** 30-45 minutes (create utility, update all catch blocks)

**Total:** ~2-3 hours for all 5 quick wins

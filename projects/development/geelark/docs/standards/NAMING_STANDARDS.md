# Geelark Naming Standards & Conventions

A comprehensive guide to standardize naming conventions across the Geelark codebase for consistency and maintainability.

## Table of Contents
1. [TypeScript/JavaScript Standards](#typescriptjavascript-standards)
2. [File & Directory Naming](#file--directory-naming)
3. [Constants & Configuration](#constants--configuration)
4. [Current Status](#current-status)
5. [Migration Guide](#migration-guide)

---

## TypeScript/JavaScript Standards

### ✅ Class Names - `PascalCase`
**Rule**: Always start with uppercase, capitalize each word. No underscores.

```typescript
// ✅ CORRECT
export class FeatureRegistry { }
export class ConfigLoader { }
export class BunServe { }
export class MemoryManager { }
export class AlertsSystem { }

// ❌ INCORRECT
export class featureRegistry { }
export class Feature_Registry { }
export class FEATURE_REGISTRY { }
```

**Status**: ✅ Codebase is compliant

---

### ✅ Function Names - `camelCase`
**Rule**: Start with lowercase, capitalize subsequent words. No underscores.

```typescript
// ✅ CORRECT
function loadConfig() { }
function parseJSON() { }
function getUserData() { }
function createServer() { }
function isHealthy() { }

// ❌ INCORRECT
function LoadConfig() { }
function load_config() { }
function LOAD_CONFIG() { }
```

**Status**: ✅ Codebase is compliant

---

### ✅ Variable Names - `camelCase`
**Rule**: Start with lowercase, capitalize subsequent words. Descriptive names.

```typescript
// ✅ CORRECT
const userName = "admin";
const isActive = true;
const serverPort = 3000;
const configPath = "./config.json";
const maxRetries = 5;

// ❌ INCORRECT
const user_name = "admin";
const UserName = "admin";
const USERNAME = "admin";
```

**Status**: ✅ Codebase is compliant

---

### 🔧 Constant Names - `UPPER_SNAKE_CASE`
**Rule**: All uppercase with underscores between words. For exported module-level constants.

```typescript
// ✅ CORRECT
export const MAX_RETRIES = 5;
export const DEFAULT_PORT = 3000;
export const API_TIMEOUT = 30000;
export const DATABASE_URL = process.env.DATABASE_URL;
export const FEATURE_FLAGS = { };
export const HEALTH_CHECK_INTERVAL = 60000;

// Configuration objects - use UPPER_SNAKE_CASE for the object, camelCase for properties
export const SERVER_CONFIG = {
  port: 3000,
  hostname: "localhost",
  maxConnections: 100,
  timeoutMs: 5000,
};

// ❌ INCORRECT
export const max_retries = 5;  // Use UPPER_SNAKE_CASE
export const Max_Retries = 5;  // Use UPPER_SNAKE_CASE
export const maxRetries = 5;   // Use UPPER_SNAKE_CASE (for constants)
```

**Status**: 🔧 **NEEDS STANDARDIZATION**
- Many constants are compliant (MAX_TREND_POINTS, ROOT_DIR, etc.)
- Some config objects use PascalCase names (CONCURRENT_CONFIGS, FEATURE_FLAG_CONFIGS, etc.) - these should stay UPPER_SNAKE_CASE
- Object properties within constants should remain camelCase

---

### ✅ Interface/Type Names - `PascalCase`
**Rule**: Capitalize first letter, no `I` prefix (modern TypeScript convention).

```typescript
// ✅ CORRECT
export interface ProcessOptions { }
export interface HealthStatus { }
export interface ServerConfig { }
export interface DashboardComponent { }

// ⚠️ ACCEPTABLE (older style, less common now)
export interface IProcessOptions { }

// ❌ INCORRECT
export interface processOptions { }
export interface process_options { }
```

**Status**: ✅ Codebase is compliant

---

### 🔧 Private Properties/Methods - `_camelCase` or `#camelCase`
**Rule**: Leading underscore or hash for private members.

```typescript
export class Example {
  // ✅ CORRECT - Private field (modern)
  #privateState = {};
  #internalData: any;
  
  // ✅ CORRECT - Protected/private property (convention)
  private _internalState = {};
  private _cache: Map<string, any> = new Map();
  
  // ✅ CORRECT - Private method
  private _internalMethod() { }
  #privateCompute() { }
  
  // ❌ INCORRECT - No indicator of privacy
  private internalState = {};
}
```

**Status**: ✅ Codebase is compliant (mostly using private keyword)

---

### 🔧 Boolean Variables/Functions - `is/has/can/should` Prefix
**Rule**: Use semantic prefixes to indicate boolean nature immediately.

```typescript
// ✅ CORRECT
const isLoading = false;
const hasError = true;
const canAccess = false;
const shouldRetry = true;
function isHealthy() { }
function hasConfig() { }
function canConnect() { }

// ❌ INCORRECT
const loading = false;  // Ambiguous
const error = true;     // Ambiguous
const access = false;   // Ambiguous
```

**Status**: ✅ Codebase is mostly compliant

---

## File & Directory Naming

### ✅ Directory Names - `kebab-case`
**Rule**: All lowercase with hyphens. Consistent across all platforms.

```
✅ CORRECT:
src/
  utils/
  config/
  server/
  api-handlers/
  security/
  decorators/
  components/

❌ INCORRECT:
src/
  Utils/
  Config/
  API_Handlers/
```

**Status**: ✅ Codebase is compliant

---

### 🔧 File Names - `PascalCase` or `kebab-case`
**Rule**: Either match the main class export OR use kebab-case. Be consistent within each directory.

```
✅ APPROACH 1 - Match Class Name:
src/FeatureRegistry.ts      // exports class FeatureRegistry
src/ConfigLoader.ts         // exports class ConfigLoader
src/MemoryManager.ts        // exports class MemoryManager
src/server/BunServe.ts      // exports class BunServe

✅ APPROACH 2 - kebab-case for utils/helpers:
src/utils/string-width.ts
src/utils/table-formatter.ts
src/utils/stream-utils.ts
src/config/config-cache.ts

❌ AVOID MIXING:
src/FeatureRegistry.ts      // PascalCase
src/config-loader.ts        // kebab-case (inconsistent in same area)
```

**Status**: 🔧 **Currently Mixed** - Mostly PascalCase in src/, some kebab-case in examples/

---

## Constants & Configuration

### Object Constants - `UPPER_SNAKE_CASE` with `camelCase` properties

```typescript
// ✅ CORRECT
export const SERVER_CONFIG = {
  port: 3000,
  hostname: "localhost",
  maxConnections: 100,
  timeoutMs: 5000,
};

export const FEATURE_FLAGS = {
  enableAnalytics: true,
  enableDebugMode: false,
  premiumTier: false,
};

export const ALERT_THRESHOLDS = {
  cpuUsagePercent: 80,
  memoryUsageMb: 500,
  responseTimeMs: 1000,
};

// ❌ INCORRECT
export const serverConfig = {   // Should be UPPER_SNAKE_CASE
  port: 3000,
  Hostname: "localhost",        // Property should be camelCase
  MAX_CONNECTIONS: 100,         // Property should be camelCase
};
```

---

## Current Status

### ✅ Already Compliant
- Class names in PascalCase
- Function names in camelCase
- Variable names in camelCase
- Interface names in PascalCase
- Directory names in kebab-case
- Boolean naming conventions (mostly)
- Private members marked with `private` keyword

### 🔧 Needs Standardization
- Some constants use `PascalCase` instead of `UPPER_SNAKE_CASE`
- File names are mixed between `PascalCase` and `kebab-case`
- Some object constants have incorrect property naming

### 📋 Examples Found

**Constants that should be reviewed:**
- `CONCURRENT_CONFIGS` ✅ (correct)
- `FEATURE_FLAG_CONFIGS` ✅ (correct)
- `ALERT_CONFIGS` ✅ (correct)
- `BUILD_CONFIGS` ✅ (correct)
- `DATABASE_PATHS` ✅ (correct)

**Files to standardize:**
- `src/FeatureRegistry.ts` ✅ (matches class)
- `src/Logger.ts` ✅ (matches class)
- `src/StringWidth.ts` ✅ (matches class)
- `src/utils/BunUtils.ts` ✅ (matches export)
- `src/examples/bun-file-exists.ts` ✅ (kebab-case, appropriate for examples)

---

## Migration Guide

### Phase 1: Quick Wins (No Breaking Changes)
1. **Add NAMING_STANDARDS.md** to repo root ✅ (you're reading it)
2. **Create ESLint configuration** to enforce conventions
3. **Document in comments** where exceptions are needed

### Phase 2: File Naming Audit
```bash
# Find inconsistent file names
find src -name "*.ts" | grep -E "[a-z]-[a-z].*\.ts"  # kebab-case
find src -name "*.ts" | grep -E "[A-Z].*\.ts"        # PascalCase
```

### Phase 3: Constants Audit
```bash
# Find constants not in UPPER_SNAKE_CASE
grep -r "export const [a-z]" src/
grep -r "export const [a-zA-Z]*[a-z][A-Z]" src/  # camelCase
```

### Phase 4: Code Refactoring (One File at a Time)
1. Identify file with naming issues
2. Update constant names to `UPPER_SNAKE_CASE`
3. Update file imports/references
4. Run tests to ensure nothing broke
5. Commit with message: `refactor: standardize naming in [file]`

---

## TypeScript/ESLint Configuration

### Recommended .eslintrc.json
```json
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        "selector": "class",
        "format": ["PascalCase"]
      },
      {
        "selector": "interface",
        "format": ["PascalCase"]
      },
      {
        "selector": "typeAlias",
        "format": ["PascalCase"]
      },
      {
        "selector": "function",
        "format": ["camelCase"]
      },
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_SNAKE_CASE"]
      },
      {
        "selector": "parameter",
        "format": ["camelCase"]
      }
    ]
  }
}
```

---

## Best Practices

### 1. Use Descriptive Names
```typescript
// ✅ GOOD
const userAuthenticationToken = "...";
const maxConcurrentConnections = 50;
const isUserAuthenticated = true;

// ❌ AVOID
const token = "...";
const max = 50;
const auth = true;
```

### 2. Avoid Abbreviations (Unless Obvious)
```typescript
// ✅ GOOD
const currentDateTime = new Date();
const userIdentifier = "user123";
const applicationPort = 3000;

// ⚠️ SOMETIMES OK
const userId = "user123";  // ID is universally understood
const apiKey = "key123";   // API is well-known
const httpMethod = "GET";  // HTTP is standard

// ❌ AVOID
const curDtm = new Date();
const usrId = "user123";
const appPrt = 3000;
```

### 3. Boolean Names Should Be Questions
```typescript
// ✅ GOOD
const isValid = true;
const hasPermission = false;
const canDelete = true;
const shouldRetry = false;

// ❌ AVOID
const valid = true;         // Not clear it's boolean
const permission = false;   // Ambiguous
const delete = true;        // Invalid (reserved word)
```

### 4. Group Related Constants
```typescript
// ✅ GOOD
const TIME_CONSTANTS = {
  ONE_SECOND_MS: 1000,
  ONE_MINUTE_MS: 60000,
  ONE_HOUR_MS: 3600000,
};

const LIMITS = {
  MAX_RETRIES: 5,
  MAX_CONNECTIONS: 100,
  MAX_FILE_SIZE_MB: 50,
};
```

---

## Summary

| Element | Convention | Status |
|---------|-----------|--------|
| Classes | PascalCase | ✅ Compliant |
| Functions | camelCase | ✅ Compliant |
| Variables | camelCase | ✅ Compliant |
| Constants | UPPER_SNAKE_CASE | 🔧 Mostly Compliant |
| Interfaces | PascalCase | ✅ Compliant |
| Directories | kebab-case | ✅ Compliant |
| File Names | PascalCase or kebab-case | 🔧 Mixed |
| Boolean Vars | is/has/can prefix | ✅ Mostly Compliant |
| Private Members | _camelCase or # | ✅ Compliant |

---

## Additional Resources

- [TypeScript Handbook - Naming Conventions](https://www.typescriptlang.org/docs/handbook/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [ESLint @typescript-eslint/naming-convention](https://typescript-eslint.io/rules/naming-convention/)

---

**Last Updated**: January 9, 2026  
**Status**: Active & in use  
**Maintainer**: Geelark Development Team

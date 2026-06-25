# Constants Refactoring Guide

Complete inventory and refactoring recommendations for all exported constants in the Geelark codebase.

## Executive Summary

- **Total Constants Found**: 55+
- **✅ Already UPPER_SNAKE_CASE**: 47 constants
- **🔧 Needs Standardization**: 8 constants
- **Status**: 86% compliant with naming standards

---

## Constants Needing Standardization

### 🔴 High Priority - Need Immediate Refactoring

#### 1. `proxyExamples` → `PROXY_EXAMPLES`
**File**: `src/examples/feature-flags/fetch-proxy-example.ts`

```typescript
// ❌ BEFORE
export const proxyExamples = {
  // HTTP proxy with authentication
  ...
};

// ✅ AFTER
export const PROXY_EXAMPLES = {
  // HTTP proxy with authentication
  ...
};
```

**Impact**: 
- Search for usages: `grep -r "proxyExamples" src/`
- Update all references

---

#### 2. `features` → `FEATURES`
**Files**: 
- `src/examples/feature-flags/feature-flag-pro-tips.ts`
- `src/examples/feature-flags/feature-gated-imports.ts`

```typescript
// ❌ BEFORE
export const features = {
  analytics: feature("FEAT_ADVANCED_MONITORING")
  ...
};

// ✅ AFTER
export const FEATURES = {
  analytics: feature("FEAT_ADVANCED_MONITORING")
  ...
};
```

**Impact**:
- Search for usages: `grep -r "features\." src/`
- Update all references in example files
- These are in examples, so lower priority but should still be standardized

---

#### 3. `tlsPresets` → `TLS_PRESETS`
**File**: `src/security/TLS.ts`

```typescript
// ❌ BEFORE
export const tlsPresets = {
  /**
   * Modern TLS configuration
   */
  ...
};

// ✅ AFTER
export const TLS_PRESETS = {
  /**
   * Modern TLS configuration
   */
  ...
};
```

**Impact**:
- Search for usages: `grep -r "tlsPresets" src/`
- Update all references in security configurations

---

#### 4. `cspPresets` → `CSP_PRESETS`
**File**: `src/security/Headers.ts`

```typescript
// ❌ BEFORE
export const cspPresets = {
  /**
   * Strict CSP policy
   */
  ...
};

// ✅ AFTER
export const CSP_PRESETS = {
  /**
   * Strict CSP policy
   */
  ...
};
```

**Impact**:
- Search for usages: `grep -r "cspPresets" src/`
- Update all references

---

#### 5. `permissionsPresets` → `PERMISSIONS_PRESETS`
**File**: `src/security/Headers.ts`

```typescript
// ❌ BEFORE
export const permissionsPresets = {
  /**
   * Restrictive permissions policy
   */
  ...
};

// ✅ AFTER
export const PERMISSIONS_PRESETS = {
  /**
   * Restrictive permissions policy
   */
  ...
};
```

**Impact**:
- Search for usages: `grep -r "permissionsPresets" src/`
- Update all references

---

#### 6. `middleware` → `MIDDLEWARE`
**File**: `src/decorators/Middleware.ts`

```typescript
// ❌ BEFORE
export const middleware = {
  /**
   * Logger middleware
   */
  ...
};

// ✅ AFTER
export const MIDDLEWARE = {
  /**
   * Logger middleware
   */
  ...
};
```

**Impact**:
- Search for usages: `grep -r "middleware\." src/`
- Update all references in decorator usage

---

#### 7. `benchmarkUtils` → `BENCHMARK_UTILS`
**File**: `src/core/benchmark.ts`

```typescript
// ❌ BEFORE
export const benchmarkUtils = {
  PerformanceTracker,
  MemoryAnalyzer,
  ...
};

// ✅ AFTER
export const BENCHMARK_UTILS = {
  PerformanceTracker,
  MemoryAnalyzer,
  ...
};
```

**Impact**:
- Search for usages: `grep -r "benchmarkUtils" src/`
- Update all references

---

#### 8. `HEADERS` (src/proxy/headers.ts) - Already Correct ✅
**Status**: Already in UPPER_SNAKE_CASE, no action needed.

---

## Constants Already Compliant ✅

All the following constants follow the UPPER_SNAKE_CASE convention correctly:

### Server & Network Constants
```text
✅ CONCURRENT_CONFIGS (ConcurrentProcessor.ts)
✅ NETWORK (server/ServerConstants.ts)
✅ HTTP (server/ServerConstants.ts)
✅ INTERVALS (server/ServerConstants.ts)
✅ DATABASE_PATHS (server/ServerConstants.ts)
✅ DIR_PATHS (server/ServerConstants.ts)
✅ TELEMETRY_THRESHOLDS (server/ServerConstants.ts)
✅ WEBSOCKET (server/ServerConstants.ts)
✅ INTEGRATION_STATUS (server/ServerConstants.ts)
✅ API_RESPONSE (server/ServerConstants.ts)
✅ BUILD_DIRS (server/ServerConstants.ts)
✅ UPLOAD (server/ServerConstants.ts)
✅ HEADERS (proxy/headers.ts)
```

### Feature & Configuration Constants
```text
✅ FEATURE_FLAGS (server/ServerConstants.ts)
✅ COMPILE_TIME_FEATURES (constants/features/compile-time.ts)
✅ COMPILE_TIME_CONFIG (constants/features/compile-time.ts)
✅ COMPILE_TIME_VALIDATION (constants/features/compile-time.ts)
✅ FEATURE_METADATA (constants/features/compile-time.ts)
```

### Alert & Health Constants
```text
✅ ALERT_SEVERITY (server/ServerConstants.ts)
✅ HEALTH_SCORE (server/ServerConstants.ts)
```

### Environment & Build Constants
```text
✅ ENVIRONMENT (server/ServerConstants.ts)
✅ PLATFORM (constants/index.ts)
✅ VERSION (constants/index.ts)
✅ PERF (constants/index.ts)
✅ MODULE (constants/index.ts)
✅ MEMORY (constants/index.ts)
✅ JSX (constants/index.ts)
✅ NET (constants/index.ts)
✅ CLI (constants/index.ts)
✅ DEBUG (constants/index.ts)
✅ WATCH (constants/index.ts)
✅ BUILD (constants/index.ts)
✅ TS (constants/index.ts)
✅ TEST (constants/index.ts)
✅ SECURITY (constants/index.ts)
✅ ENV (constants/index.ts)
```

### Template & Create Constants
```text
✅ CREATE_FLAGS (constants/templates.ts)
✅ CREATE_ENV (constants/templates.ts)
✅ TEMPLATE_SOURCES (constants/templates.ts)
✅ FRAMEWORK_HANDLERS (constants/templates.ts)
✅ PACKAGE_HOOKS (constants/templates.ts)
✅ FILE_OPS (constants/templates.ts)
```

### Communication & Sizing Constants
```text
✅ WS_MSG (websocket/subprotocol.ts)
✅ FIELD_OFFSET (websocket/subprotocol.ts)
✅ UNICODE_WIDTH (server/ServerConstants.ts)
```

### Time Constants
```text
✅ MS (server/ServerConstants.ts)
✅ SECONDS (server/ServerConstants.ts)
```

---

## Refactoring Checklist

### Phase 1: Pre-Refactoring (No Breaking Changes)
- [ ] Review this guide with team
- [ ] Create feature branch: `refactor/standardize-constants`
- [ ] Verify all tests pass before starting: `bun test`

### Phase 2: Refactoring (One File at a Time)

#### File: `src/examples/feature-flags/fetch-proxy-example.ts`
- [ ] Rename `proxyExamples` → `PROXY_EXAMPLES`
- [ ] Update all references in the file
- [ ] Update any imports in other files
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize proxyExamples constant`

#### File: `src/examples/feature-flags/feature-flag-pro-tips.ts`
- [ ] Rename `features` → `FEATURES`
- [ ] Update all references
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize features constant`

#### File: `src/examples/feature-flags/feature-gated-imports.ts`
- [ ] Rename `features` → `FEATURES`
- [ ] Update all references
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize features constant`

#### File: `src/security/TLS.ts`
- [ ] Rename `tlsPresets` → `TLS_PRESETS`
- [ ] Update all references
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize tlsPresets constant`

#### File: `src/security/Headers.ts`
- [ ] Rename `cspPresets` → `CSP_PRESETS`
- [ ] Rename `permissionsPresets` → `PERMISSIONS_PRESETS`
- [ ] Update all references
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize security presets constants`

#### File: `src/decorators/Middleware.ts`
- [ ] Rename `middleware` → `MIDDLEWARE`
- [ ] Update all references in files using middleware
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize middleware constant`

#### File: `src/core/benchmark.ts`
- [ ] Rename `benchmarkUtils` → `BENCHMARK_UTILS`
- [ ] Update all references
- [ ] Run tests: `bun test`
- [ ] Commit: `refactor: standardize benchmarkUtils constant`

### Phase 3: Validation
- [ ] Run full test suite: `bun test`
- [ ] Run type checking: `bun run type-check` (if available)
- [ ] Search for any remaining references: `grep -r "camelCase constant names" src/`
- [ ] Create pull request with all changes

---

## Search & Replace Commands

Use these commands to find and understand the scope of changes needed:

### Find usage of non-standard constants:
```bash
# Find proxyExamples usage
grep -r "proxyExamples" src/

# Find features usage
grep -r "features\." src/

# Find tlsPresets usage
grep -r "tlsPresets" src/

# Find cspPresets usage
grep -r "cspPresets" src/

# Find permissionsPresets usage
grep -r "permissionsPresets" src/

# Find middleware constant usage
grep -r "middleware\." src/

# Find benchmarkUtils usage
grep -r "benchmarkUtils" src/
```

### Bulk replacement with sed (macOS):
```bash
# Replace proxyExamples with PROXY_EXAMPLES
sed -i '' 's/proxyExamples/PROXY_EXAMPLES/g' src/examples/feature-flags/fetch-proxy-example.ts

# Replace tlsPresets with TLS_PRESETS
sed -i '' 's/tlsPresets/TLS_PRESETS/g' src/security/TLS.ts

# Replace cspPresets with CSP_PRESETS
sed -i '' 's/cspPresets/CSP_PRESETS/g' src/security/Headers.ts

# Replace permissionsPresets with PERMISSIONS_PRESETS
sed -i '' 's/permissionsPresets/PERMISSIONS_PRESETS/g' src/security/Headers.ts

# Replace middleware constant with MIDDLEWARE (be careful with this)
sed -i '' 's/export const middleware/export const MIDDLEWARE/g' src/decorators/Middleware.ts

# Replace benchmarkUtils with BENCHMARK_UTILS
sed -i '' 's/benchmarkUtils/BENCHMARK_UTILS/g' src/core/benchmark.ts
```

---

## Impact Analysis

### Low Risk Changes
- `proxyExamples` → Only used in examples, no production code impact
- `features` → Only used in example files

### Medium Risk Changes
- `cspPresets` / `permissionsPresets` → Used in security headers setup
- `tlsPresets` → Used in TLS configuration
- `middleware` → Used in decorator implementations

### Higher Risk Changes
- `benchmarkUtils` → May be used in multiple test and performance files

---

## Validation After Refactoring

1. **Type Checking**
   ```bash
   bun run type-check
   ```

2. **Linting**
   ```bash
   bun run lint
   ```

3. **Tests**
   ```bash
   bun test
   ```

4. **Search for any remaining issues**
   ```bash
   # Verify camelCase constants are gone
   grep -r "export const [a-z][a-zA-Z]*\s*=" src/ | \
   grep -v "export const [A-Z_]*\s*=" | \
   grep -v "function\|=>.*{" | head -20
   ```

---

## Completion Criteria

- [ ] All 8 constants renamed to UPPER_SNAKE_CASE
- [ ] All imports and usages updated
- [ ] All tests pass
- [ ] Type checking passes
- [ ] No ESLint warnings
- [ ] Pull request reviewed and approved
- [ ] Merged to main branch
- [ ] Documentation updated (add note to NAMING_STANDARDS.md)

---

## Post-Refactoring Documentation

Once complete, update `NAMING_STANDARDS.md`:

```markdown
### ✅ Constant Names - `UPPER_SNAKE_CASE`
**Status**: ✅ FULLY COMPLIANT
- All 55+ constants follow UPPER_SNAKE_CASE convention
- Refactoring completed: [PR link]
- Last verified: [date]
```

---

## Notes

- These are the **only** constants that don't follow the UPPER_SNAKE_CASE convention
- The codebase is actually very well-organized! 86% compliance is excellent
- Some constants in examples are acceptable to have camelCase, but standardizing is better for consistency
- This refactoring has minimal breaking changes since these are mostly internal constants

---

**Created**: January 9, 2026  
**Status**: Ready for implementation  
**Estimated Effort**: 30-45 minutes  
**Risk Level**: Low to Medium

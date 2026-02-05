# HTML Routes Test Suite Summary

## Overview

Comprehensive test suite for HTML serving routes (`/api/registry.html`, `/api/dashboard`, `/registry.html`, `/dashboard`) that verify:

1. Routes serve HTML correctly
2. HTMLRewriter injects `HYPERBUN_UI_CONTEXT` properly
3. `API_BASE` variable is preserved (not removed by regex)
4. Proper error handling for missing files
5. Content-Type headers are correct
6. Route priority and conflicts are handled correctly

## Test Files

### 1. `test/api/html-routes.test.ts` - Integration Tests
**Purpose**: End-to-end integration tests that require a running server

**Coverage**:
- ✅ API endpoint routes (`/api/registry.html`, `/api/dashboard`)
- ✅ Root endpoint routes (`/registry.html`, `/dashboard`)
- ✅ HTML content validation
- ✅ `API_BASE` variable preservation
- ✅ `HYPERBUN_UI_CONTEXT` injection
- ✅ Error handling (404 for missing files)
- ✅ Headers validation (Content-Type, git headers)
- ✅ Route priority (ensuring `/api/dashboard` doesn't conflict with `/api/dashboard/data`)
- ✅ Performance tests (response time, concurrent requests)

**Run**: `bun test test/api/html-routes.test.ts`

**Requirements**: Server must be running on port 3001 (or set `PORT` env var)

### 2. `test/api/html-routes-unit.test.ts` - Unit Tests
**Purpose**: Unit tests that don't require a running server

**Coverage**:
- ✅ `UIContextRewriter` integration
- ✅ HTML transformation without removing `API_BASE`
- ✅ `HYPERBUN_UI_CONTEXT` script tag injection
- ✅ Fallback transformation handling
- ✅ File reading logic
- ✅ `API_BASE` pattern preservation
- ✅ `UIPolicyManager` functionality
- ✅ Error handling for missing files
- ✅ Content validation
- ✅ Regex pattern validation (verifies problematic regex was removed)

**Run**: `bun test test/api/html-routes-unit.test.ts`

**Requirements**: None (no server needed)

### 3. `test/api/html-files-validation.test.ts` - Source File Validation
**Purpose**: Validates HTML source files contain correct patterns

**Coverage**:
- ✅ `registry.html` contains `uiContext.apiBaseUrl` pattern
- ✅ No hardcoded `API_BASE` assignments in source files
- ✅ Valid HTML structure
- ✅ `dashboard/index.html` contains `API_BASE` or `uiContext` reference
- ✅ No hardcoded API URLs in script tags
- ✅ Pattern consistency across all HTML files
- ✅ HTMLRewriter compatibility

**Run**: `bun test test/api/html-files-validation.test.ts`

**Requirements**: None (validates source files only)

## Test Coverage Summary

| Category | Coverage | Tests |
|----------|----------|-------|
| Route Handlers | ✅ Complete | 20+ tests |
| HTMLRewriter Integration | ✅ Complete | 8 tests |
| API_BASE Preservation | ✅ Complete | 6 tests |
| Error Handling | ✅ Complete | 4 tests |
| File Validation | ✅ Complete | 8 tests |
| Headers & Content-Type | ✅ Complete | 3 tests |
| Route Priority | ✅ Complete | 2 tests |
| Performance | ✅ Complete | 2 tests |

## Key Test Scenarios

### 1. API_BASE Preservation
```typescript
// Verifies this pattern is preserved:
const API_BASE = uiContext.apiBaseUrl;

// And NOT removed by regex cleaning
```

### 2. HTMLRewriter Injection
```typescript
// Verifies HYPERBUN_UI_CONTEXT is injected:
<script>
  window.HYPERBUN_UI_CONTEXT = {...};
</script>
```

### 3. Route Priority
```typescript
// Ensures /api/dashboard serves HTML
// And /api/dashboard/data serves JSON
// (No conflicts)
```

### 4. Error Handling
```typescript
// Missing files return proper 404 with error format:
{
  error: true,
  code: "NX-001",
  status: 404,
  ...
}
```

## Running All Tests

```bash
# Run all HTML route tests
bun test test/api/html-routes*.test.ts

# Run integration tests (requires server)
PORT=3001 bun test test/api/html-routes.test.ts

# Run unit tests (no server needed)
bun test test/api/html-routes-unit.test.ts

# Run file validation tests
bun test test/api/html-files-validation.test.ts
```

## Test Dependencies

- **Bun Test Framework**: Built-in `bun:test`
- **Test Harness**: `test/harness.ts` (for server startup utilities)
- **UIPolicyManager**: `src/services/ui-policy-manager.ts`
- **UIContextRewriter**: `src/services/ui-context-rewriter.ts`

## Continuous Integration

These tests should be run in CI/CD pipeline:

1. **Unit Tests**: Fast, no dependencies - run on every commit
2. **File Validation**: Fast, validates source files - run on every commit
3. **Integration Tests**: Slower, requires server - run on PR and main branch

## Known Issues / Future Improvements

- [ ] Add snapshot tests for HTML output
- [ ] Add visual regression tests for dashboard
- [ ] Add tests for different user roles (RBAC)
- [ ] Add tests for feature flag variations
- [ ] Add performance benchmarks
- [ ] Add tests for HTMLRewriter fallback scenarios

## Related Documentation

- `src/index.ts` - Main server file with route handlers
- `src/api/routes.ts` - API routes including HTML routes
- `src/services/ui-context-rewriter.ts` - HTMLRewriter implementation
- `src/services/ui-policy-manager.ts` - UI policy management

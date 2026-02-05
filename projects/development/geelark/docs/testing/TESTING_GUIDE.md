# Geelark Testing Guide

**Last Updated**: 2026-01-08
**Test Framework**: Bun Test (built-in)
**Total Tests**: 84 files

---

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Writing Tests](#writing-tests)
6. [Test Utilities](#test-utilities)
7. [Coverage](#coverage)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Geelark uses **Bun Test** - the built-in testing framework that comes with Bun. It provides:

- ⚡ **Fast execution** - No external dependencies required
- 🔍 **Built-in mocking** - `mock()` function for stubbing
- 📊 **Coverage reports** - Built-in code coverage
- 🎯 **Type testing** - `expectTypeOf()` for type validation
- 🔄 **Watch mode** - Automatic re-running on file changes
- 📈 **Performance tests** - Benchmark support

### Test Statistics

| Category | Files | Location |
|----------|-------|----------|
| Unit Tests | 60+ | `tests/unit/` |
| Integration Tests | 8 | `tests/integration/` |
| E2E Tests | 2 | `tests/e2e/` |
| Performance Tests | 8 | `tests/performance/` |
| CLI Tests | 6 | `tests/cli/` |
| **Total** | **84** | - |

---

## Test Structure

```
tests/
├── config/                      # Test configuration
│   └── setup.ts                 # Global test setup
├── unit/                        # Unit tests
│   ├── server/                  # Server component tests
│   │   ├── upload-service.test.ts
│   │   ├── monitoring-system.test.ts
│   │   └── ...
│   ├── utils/                   # Utility function tests
│   │   ├── bun-file-io.test.ts
│   │   ├── deep-equals.test.ts
│   │   └── ...
│   ├── feature-elimination/     # Feature flag tests
│   │   ├── feature-elimination.test.ts
│   │   └── advanced-feature-elimination.test.ts
│   ├── type-testing/            # Type validation tests
│   │   ├── expectTypeOf-comprehensive.test.ts
│   │   ├── utility-types.test.ts
│   │   └── ...
│   └── dashboard/               # Dashboard component tests
│       ├── api-client.test.ts
│       └── component-logic.test.ts
├── integration/                 # Integration tests
│   ├── upload.test.ts
│   ├── upload-api.test.ts
│   ├── server.test.ts
│   └── dashboard-api.test.ts
├── e2e/                         # End-to-end tests
│   ├── cli/
│   │   └── cli-e2e.test.ts
│   └── automation/
│       ├── process-lifecycle.test.ts
│       └── snapshot-testing.test.ts
├── performance/                 # Performance tests
│   ├── networking/
│   │   └── networking-performance.test.ts
│   ├── http-server/
│   │   └── export-default-benchmarks.test.ts
│   └── transpilation/
│       └── bun-transpiler-benchmarks.test.ts
└── cli/                         # CLI tests
    ├── watch-api/
    │   └── bun-watch-api.test.ts
    └── examples/
        └── bun-cli-examples.test.ts
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/server/upload-service.test.ts

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage

# Verbose output
bun test --verbose

# Run only tests matching pattern
bun test -t "upload"

# Run tests in specific directory
bun test tests/unit/

# Run tests excluding pattern
bun test --exclude "performance"
```

### NPM Scripts

```json
{
  "test": "bun test",
  "test:unit": "bun test tests/unit/",
  "test:integration": "bun test tests/integration/",
  "test:e2e": "bun test tests/e2e/",
  "test:performance": "bun test tests/performance/",
  "test:coverage": "bun test --coverage",
  "test:watch": "bun test --watch",
  "test:upload": "bun test tests/unit/server/upload-service.test.ts tests/integration/upload.test.ts"
}
```

### Test Configuration

**File**: `bunfig.toml`

```toml
[test]
root = "tests"
preload = ["./tests/config/setup.ts"]
coverage = true
timeout = 30000
concurrent = false
```

---

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual functions and classes in isolation

**Location**: `tests/unit/`

**Example**: Upload Service Unit Test

```typescript
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { UploadService } from "../../src/server/UploadService.js";

describe("UploadService", () => {
  let uploadService: UploadService;

  beforeEach(() => {
    uploadService = new UploadService({
      provider: "local",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      bucket: "test-bucket",
      localDir: "./test-uploads"
    });
  });

  test("should upload small file successfully", async () => {
    const testFile = new Blob(["test content"], { type: "text/plain" });
    const result = await uploadService.initiateUpload(testFile, {
      filename: "test.txt",
      contentType: "text/plain"
    });

    expect(result).toBeDefined();
    expect(result.uploadId).toBeDefined();
    expect(result.filename).toBe("test.txt");
    expect(result.success).toBe(true);
  });

  test("should track upload progress", async () => {
    const testFile = new Blob(["test content"], { type: "text/plain" });
    const result = await uploadService.initiateUpload(testFile, {
      filename: "test.txt",
      contentType: "text/plain"
    });

    const progress = uploadService.getProgress(result.uploadId);
    expect(progress).toBeDefined();
    expect(progress?.status).toBe("completed");
    expect(progress?.progress).toBe(100);
  });

  test("should cancel active upload", async () => {
    const testFile = new Blob(["test"], { type: "text/plain" });
    const result = await uploadService.initiateUpload(testFile, {
      filename: "test.txt",
      contentType: "text/plain"
    });

    const cancelled = uploadService.cancelUpload(result.uploadId);
    expect(cancelled).toBe(true);

    const progress = uploadService.getProgress(result.uploadId);
    expect(progress?.status).toBe("cancelled");
  });
});
```

### 2. Integration Tests

**Purpose**: Test interactions between multiple components

**Location**: `tests/integration/`

**Example**: Upload API Integration Test

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { BunServe } from "../../src/server/BunServe.js";

describe("Upload API Integration", () => {
  let server: BunServe;
  let baseUrl: string;

  beforeAll(async () => {
    // Start test server
    server = new BunServe({
      port: 0, // Random port
      fetch: (req) => {
        const { UploadService } = require("../../src/server/UploadService.js");
        const uploadService = new UploadService({
          provider: "local",
          accessKeyId: "test-key",
          secretAccessKey: "test-secret",
          bucket: "test-bucket",
          localDir: "./test-uploads"
        });

        const url = new URL(req.url);
        const path = url.pathname;

        // POST /api/upload/initiate
        if (path === "/api/upload/initiate" && req.method === "POST") {
          return req.formData().then(async (formData: FormData) => {
            const file = formData.get("file") as File;
            if (!file) {
              return new Response(
                JSON.stringify({ error: "No file provided" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const result = await uploadService.initiateUpload(file, {
              filename: formData.get("filename") as string || file.name,
              contentType: formData.get("contentType") as string || file.type
            });

            return Response.json({ success: true, ...result });
          });
        }

        return new Response("Not found", { status: 404 });
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
  });

  test("should complete full upload workflow", async () => {
    const formData = new FormData();
    const testFile = new Blob(["test content"], { type: "text/plain" });
    formData.append("file", testFile, "test.txt");
    formData.append("filename", "test.txt");
    formData.append("contentType", "text/plain");

    const response = await fetch(`${baseUrl}/api/upload/initiate`, {
      method: "POST",
      body: formData
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.uploadId).toBeDefined();
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows

**Location**: `tests/e2e/`

**Example**: CLI E2E Test

```typescript
import { describe, test, expect } from "bun:test";
import { Bun } from "bun";

describe("CLI E2E", () => {
  test("should display help message", async () => {
    const proc = Bun.spawn(["bun", "bin/dev-hq-cli.ts", "--help"]);
    await proc.exited;
    const output = await Bun.file(proc.stdout).text();

    expect(output).toContain("Dev HQ CLI");
    expect(output).toContain("Usage:");
  });
});
```

### 4. Performance Tests

**Purpose**: Benchmark and validate performance requirements

**Location**: `tests/performance/`

**Example**: HTTP Server Performance Test

```typescript
import { describe, test, expect } from "bun:test";

describe("HTTP Server Performance", () => {
  test("should handle 10k requests/sec", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response("OK")
    });

    const start = performance.now();
    const requests = [];

    for (let i = 0; i < 10000; i++) {
      requests.push(fetch(`http://localhost:${server.port}`));
    }

    await Promise.all(requests);
    const duration = performance.now() - start;
    const rps = (10000 / duration) * 1000;

    expect(rps).toBeGreaterThan(10000);
    server.stop();
  });
});
```

### 5. Feature Flag Tests

**Purpose**: Verify compile-time dead code elimination

**Location**: `tests/unit/feature-elimination/`

**Example**: Feature Elimination Test

```typescript
import { test, expect } from "bun:test";

test("feature flag should eliminate dead code", () => {
  const source = `
    import { feature } from "bun:bundle";
    const value = feature("TEST") ? "yes" : "no";
    console.log("Value:", value);
  `;

  // Build with feature
  const withFeature = Bun.build({
    entrypoints: ["test.ts"],
    feature: "TEST"
  });

  // Build without feature
  const withoutFeature = Bun.build({
    entrypoints: ["test.ts"]
  });

  expect(withFeature.output).not.toEqual(withoutFeature.output);
});
```

### 6. Type Testing

**Purpose**: Validate TypeScript types at compile time

**Location**: `tests/unit/type-testing/`

**Example**: expectTypeOf Test

```typescript
import { test, expectTypeOf } from "bun:test";

test("upload result should have correct types", () => {
  type UploadResult = {
    uploadId: string;
    filename: string;
    url: string;
    size: number;
    duration: number;
    provider: "s3" | "r2" | "local";
  };

  const result: UploadResult = {
    uploadId: "uuid",
    filename: "test.txt",
    url: "https://example.com/test.txt",
    size: 1024,
    duration: 1234,
    provider: "s3"
  };

  expectTypeOf(result).toMatchObjectOf<UploadResult>();
  expectTypeOf(result.uploadId).toBeString();
  expectTypeOf(result.size).toBeNumber();
  expectTypeOf(result.provider). toBeUnionOf<"s3" | "r2" | "local">();
});
```

---

## Writing Tests

### Test Structure

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

describe("Feature/Component Name", () => {
  // Setup (runs once before all tests)
  beforeAll(async () => {
    // Initialize resources
  });

  // Teardown (runs once after all tests)
  afterAll(async () => {
    // Cleanup resources
  });

  // Setup (runs before each test)
  beforeEach(() => {
    // Reset state
  });

  // Teardown (runs after each test)
  afterEach(() => {
    // Cleanup
  });

  test("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = processData(input);

    // Assert
    expect(result).toBeDefined();
    expect(result).toBe("expected");
  });

  test("should handle error case", async () => {
    await expect(
      asyncOperation()
    ).toThrow("Expected error message");
  });
});
```

### Assertions

```typescript
import { expect } from "bun:test";

// Basic assertions
expect(value).toBe(true);
expect(value).toEqual({ foo: "bar" });
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);

// String assertions
expect(str).toContain("substring");
expect(str).toMatch(/regex/);

// Array assertions
expect(arr).toHaveLength(3);
expect(arr).toContain(item);

// Object assertions
expect(obj).toHaveProperty("key");
expect(obj).toMatchObject({ key: "value" });

// Null/undefined
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Not
expect(value).not.toBe(false);
```

### Type Testing

```typescript
import { expectTypeOf } from "bun:test";

// Basic type checks
expectTypeOf(value).toBeString();
expectTypeOf(value).toBeNumber();
expectTypeOf(value).toBeBoolean();
expectTypeOf(value).toBeObject();
expectTypeOf(value).toBeArray();
expectTypeOf(value).toBeFunction();

// Object shape
expectTypeOf(value).toMatchObjectOf<{ name: string; age: number }>();
expectTypeOf(value).toHaveProperty("name");

// Function return type
expectTypeOf(fn).returns.toBeVoid();
expectTypeOf(fn).parameters.toEqualTypesOf<[string, number]>();

// Union types
expectTypeOf(value).toBeUnionOf<"a" | "b" | "c">();

// Generics
expectTypeOf(value).toBeGenericOf({ generic: "T" });
```

---

## Test Utilities

### Mocking

```typescript
import { mock } from "bun:test";

// Create mock function
const mockFn = mock(() => "test");
mockFn();
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveReturnedWith("test");

// Mock implementation
const mockFn = mock((val: string) => val.toUpperCase());
mockFn("hello");
expect(mockFn).toHaveReturnedWith("HELLO");

// Mock return values
const mockFn = mock();
mockFn.mockReturnValue("test");
mockFn.mockResolvedValue("async");

// Clear mock
mockFn.mockClear();
```

### Spying

```typescript
import { spyOn } from "bun:test";

const obj = {
  method: (val: string) => val.toUpperCase()
};

const spy = spyOn(obj, "method");
obj.method("test");

expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith("test");
```

### Fixtures

```typescript
// tests/fixtures/data.ts
export const testFile = new Blob(["test content"], { type: "text/plain" });
export const testFormData = new FormData();
testFormData.append("file", testFile, "test.txt");

// Test usage
import { testFile, testFormData } from "../fixtures/data";

test("should use fixtures", async () => {
  const result = await uploadFile(testFile);
  expect(result).toBeDefined();
});
```

---

## Coverage

### Generating Coverage

```bash
# Run with coverage
bun test --coverage

# Coverage for specific directory
bun test --coverage tests/unit/

# Output coverage report
bun test --coverage --coverage-reporter="text"
bun test --coverage --coverage-reporter="html"
bun test --coverage --coverage-reporter="json"
```

### Coverage Thresholds

```json
{
  "test": {
    "coverage": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}
```

### Current Coverage

| Component | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| UploadService | 85% | 78% | 90% | 84% |
| TelemetrySystem | 82% | 75% | 88% | 81% |
| MonitoringSystem | 80% | 72% | 85% | 79% |
| **Overall** | **81%** | **75%** | **87%** | **80%** |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: bun test --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### GitLab CI

```yaml
test:
  image: oven/bun:latest
  script:
    - bun install
    - bun test --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

---

## Best Practices

### 1. Test Organization

- ✅ **One test file per source file**
- ✅ **Describe blocks for logical grouping**
- ✅ **Clear test names describing what is being tested**
- ✅ **Arrange-Act-Assert pattern**
- ❌ **Avoid testing multiple things in one test**

### 2. Test Isolation

- ✅ **Each test should be independent**
- ✅ **Use `beforeEach` for setup**
- ✅ **Use `afterEach` for cleanup**
- ✅ **Don't rely on test execution order**
- ❌ **Avoid shared state between tests**

### 3. Async Testing

- ✅ **Use `async/await` for async operations**
- ✅ **Test both success and error cases**
- ✅ **Set appropriate timeouts**
- ❌ **Don't forget to `await` promises**

### 4. Mocking

- ✅ **Mock external dependencies**
- ✅ **Use mocks sparingly**
- ✅ **Clear mocks in `beforeEach`**
- ❌ **Don't mock the code you're testing**

### 5. Performance

- ✅ **Keep tests fast**
- ✅ **Use `test.skip()` for slow tests**
- ✅ **Run integration tests separately**
- ❌ **Don't include performance tests in normal test runs**

### 6. Coverage

- ✅ **Aim for 80%+ coverage**
- ✅ **Focus on critical paths**
- ✅ **Test edge cases**
- ❌ **Don't chase 100% coverage at the expense of readability**

---

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Problem**: Tests exceed default timeout (5000ms)

**Solution**:
```typescript
test("slow operation", async () => {
  // Increase timeout for this test
}, 30000); // 30 seconds
```

#### 2. Module Not Found

**Problem**: Can't import module in test

**Solution**:
```typescript
// Use relative imports
import { UploadService } from "../../src/server/UploadService.js";

// Or ensure tsconfig.json paths are correct
```

#### 3. Feature Flags Not Working

**Problem**: Feature flags always return `false`

**Solution**:
```typescript
// Mock feature function
const mockFeature = mock((flag: string) => {
  if (flag === "FEAT_CLOUD_UPLOAD") return true;
  return false;
});
globalThis.feature = mockFeature;
```

#### 4. Tests Failing in CI but Passing Locally

**Problem**: Environment differences

**Solution**:
```typescript
// Use environment-aware test setup
const isCI = process.env.CI === "true";
const timeout = isCI ? 30000 : 5000;

test("test", async () => {
  // Test code
}, timeout);
```

#### 5. Port Already in Use

**Problem**: Integration test can't bind to port

**Solution**:
```typescript
// Use port 0 to get random available port
const server = Bun.serve({
  port: 0, // Random port
  fetch: (req) => new Response("OK")
});

const port = server.port;
```

### Debugging Tests

```bash
# Run with verbose output
bun test --verbose

# Run specific test
bun test -t "test name"

# Run with debugger
bun --inspect test

# Enable debug logging
DEBUG=* bun test
```

---

## Resources

- [Bun Test Documentation](https://bun.sh/docs/test)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Coverage Guide](https://bun.sh/docs/test/coverage)
- [Mock Functions Guide](https://bun.sh/docs/test/mocking)

---

**Generated**: 2026-01-08
**Version**: 1.0.0
**Maintainer**: Geelark Development Team

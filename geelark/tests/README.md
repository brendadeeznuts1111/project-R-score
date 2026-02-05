# Tests Directory

This directory contains comprehensive tests for Dev HQ - Advanced Codebase Analysis and Automation Platform, organized by test type and functionality.

## 📁 Directory Structure

```text
tests/
├── README.md                    # This file
├── config/                      # Test configuration files
│   ├── bun-test.config.ts      # Bun test configuration
│   └── test-setup.ts           # Global test setup and utilities
├── unit/                        # Unit tests
│   ├── feature-elimination/    # Feature elimination unit tests
│   ├── feature-flags/          # Feature flag pattern tests
│   ├── bun-runtime/            # Bun runtime API tests
│   ├── type-testing/          # TypeScript type testing
│   └── utils/                 # Utility function tests
├── integration/                 # Integration tests
│   ├── dev-hq/                # Dev HQ module integration tests
│   ├── server/                # Server and networking tests
│   └── api/                   # API endpoint tests
├── e2e/                        # End-to-end tests
│   ├── automation/            # Full automation workflow tests
│   └── cli/                   # CLI end-to-end tests
├── performance/                # Performance and benchmark tests
│   ├── bun-runtime/           # Bun runtime performance
│   ├── http-server/           # HTTP server benchmarks
│   ├── networking/            # Networking performance
│   ├── transpilation/         # Transpilation benchmarks
│   └── configuration/         # Configuration management
├── cli/                        # CLI-specific tests
│   ├── examples/              # CLI example tests
│   ├── flag-structure/        # Flag structure tests
│   └── watch-api/             # Watch API tests
├── fixtures/                   # Test fixtures and mock data
├── demos/                      # Demo and example files
└── __snapshots__/              # Jest/Bun snapshot files
```

## 🧪 Test Categories

### Unit Tests (`unit/`)

#### Feature Elimination Tests (`unit/feature-elimination/`)

- **feature-elimination.test.ts**: Premium vs free bundle size comparison, multiple feature elimination, nested feature conditions
- **advanced-feature-elimination.test.ts**: Complex feature dependencies, bundle size threshold validation
- **test-feature-elimination.ts**: Standalone demonstration of feature elimination

#### Type Testing (`unit/type-testing/`)

- **type-testing.test.ts**: TypeScript type testing with `expectTypeOf`, conditional type narrowing
- **advanced-expectTypeOf.test.ts**: Advanced `expectTypeOf` examples with real-world patterns
- **expectTypeOf-comprehensive.test.ts**: Comprehensive type validation examples
- **expectTypeOf-advanced-patterns.test.ts**: Complex nested types with feature gates
- **expectTypeOf-pro-tips-working.test.ts**: Working examples of advanced type patterns

#### Feature Flag Tests (`unit/feature-flags/`)

- **feature-flag-pro-tips.test.ts**: Feature flag best practices and patterns
- **flag-flow-diagram.test.ts**: Feature flag flow and processing tests
- **perfect-flag-pattern.test.ts**: Optimal feature flag patterns

#### Bun Runtime Tests (`unit/bun-runtime/`)

- **bun-file-watching-patterns.test.ts**: File watching patterns with Bun
- **bun-filter-monorepo.test.ts**: Monorepo filtering tests
- **bun-run-index-js.test.ts**: Index.js execution tests
- **bun-specific-flag-combo.test.ts**: Bun-specific flag combinations

#### Utility Tests (`unit/utils/`)

- **bun-file-io.test.ts**: Bun file I/O best practices including Bun.file, Bun.write, streaming, and binary handling
- **glob.test.ts**: File pattern matching and glob operations
- **glob-hidden-files.test.ts**: Hidden file pattern matching
- **pattern.test.ts**: General pattern matching utilities
- **pattern-simple.test.ts**: Simple pattern validation
- **console-depth.test.ts**: Console logging depth control
- **fetch-proxy-headers.test.ts**: Proxy header handling
- **http-agent-keepalive.test.ts**: HTTP connection management
- **proxy-connection.test.ts**: Proxy connection handling
- **security.test.ts**: Security-related utilities
- **unhandled-rejections.test.ts**: Promise rejection handling

### Integration Tests (`integration/`)

#### Dev HQ Tests (`integration/dev-hq/`)

- **dev-hq-api-server.test.ts**: Comprehensive API server tests including health checks, Bun Secrets API, MMap API, Plugin API, FormData, FFI CString, RedisClient, ReadableStream, error handling, and concurrency
- **dev-hq-automation.test.ts**: Process automation tests including basic execution, working directory, environment variables, streaming output, timeout handling, process management, cleanup, complex scenarios, and resource management (located in integration/dev-hq/)
- **dev-hq-spawn-server.test.ts**: HTTP/WebSocket automation service tests including server lifecycle, authentication, command execution, streaming commands, WebSocket support, metrics, concurrency, security, and performance

#### Server Tests (`integration/server/`)

- **server.test.ts**: Bun.serve protocol testing with full type coverage including protocol type testing, server property validation, production setup, TLS/HTTPS handling, and URL construction

#### API Tests (`integration/api/`)

- **api-fixes.test.ts**: API endpoint fixes and validation
- **api-fixes-simple.test.ts**: Simple API fix tests
- **bun-123-api-fixes-final.test.ts**: Final API fixes for Bun 123

### End-to-End Tests (`e2e/`)

#### Automation Tests (`e2e/automation/`)

- **process-lifecycle.test.ts**: Full process lifecycle management
- **seeded-testing.test.ts**: Seeded random testing for reproducible results
- **snapshot-testing.test.ts**: Snapshot testing for feature elimination

#### CLI Tests (`e2e/cli/`)

- **cli-e2e.test.ts**: End-to-end CLI testing

### Bun-Specific Tests

#### Runtime Features

- **bun-runtime-features.test.ts**: Bun runtime feature testing
- **bun-runtime-execution-config.test.ts**: Runtime execution configuration
- **bun-runtime-process-control.test.ts**: Process control in Bun runtime

#### CLI and Watch Mode

- **bun-cli-examples.test.ts**: CLI example testing
- **bun-cli-flag-structure.test.ts**: CLI flag structure validation
- **bun-cli-specific-examples.test.ts**: Specific CLI examples
- **bun-file-watching-patterns.test.ts**: File watching for development
- **bun-filter-monorepo.test.ts**: Monorepo filtering
- **bun-flag-structure-demo.test.ts**: Flag structure demonstration
- **bun-run-index-js.test.ts**: Index.js execution
- **bun-specific-flag-combo.test.ts**: Specific flag combinations
- **bun-watch-api.test.ts**: Watch API testing
- **bun-watch-screen-control.test.ts**: Screen control in watch mode
- **bun-watch-simple.test.ts**: Simple watch functionality

#### Feature Flags

- **feature-flag-pro-tips.test.ts**: Feature flag best practices
- **flag-flow-diagram.test.ts**: Feature flag flow validation
- **perfect-flag-pattern.test.ts**: Optimal flag patterns

## 🏃‍♂️ Running Tests

### Configuration

The test suite uses the configuration in `config/bun-test.config.ts`. This includes:

- Coverage settings with 80% threshold
- Global test setup in `config/test-setup.ts`
- Snapshot configuration
- Timeout and concurrency settings

### All Tests

```bash
# Run all tests with default configuration
bun test

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch

# Run with specific configuration
bun test --config tests/config/bun-test.config.ts
```

### By Test Type

```bash
# Run only unit tests
bun test tests/unit/**/*.test.ts

# Run only integration tests
bun test tests/integration/**/*.test.ts

# Run only e2e tests
bun test tests/e2e/**/*.test.ts

# Run specific category
bun test tests/unit/feature-elimination/*.test.ts
bun test tests/integration/dev-hq/*.test.ts
```

### Dev HQ Tests

```bash
# Run all Dev HQ tests
bun test tests/integration/dev-hq/*.test.ts

# Run specific Dev HQ module tests
bun test tests/integration/dev-hq/dev-hq-api-server.test.ts
bun test tests/integration/dev-hq/dev-hq-automation.test.ts
bun test tests/integration/dev-hq/dev-hq-spawn-server.test.ts
```

### Feature Elimination & Type Tests

```bash
# Run feature elimination tests
bun test tests/unit/feature-elimination/*.test.ts

# Run type testing
bun test tests/unit/type-testing/*.test.ts

# Run advanced type tests
bun test tests/unit/type-testing/advanced-*.test.ts
bun test tests/unit/type-testing/expectTypeOf-*.test.ts
```

### Server & API Tests

```bash
# Run server tests
bun test tests/integration/server/*.test.ts

# Run API-specific tests
bun test tests/integration/api/*.test.ts

# Run Bun-specific tests
bun test tests/*bun-*.test.ts
```

### Specialized Test Runs

```bash
# Run with specific seed for reproducible results
bun test tests/e2e/automation/seeded-testing.test.ts --seed=12345

# Update snapshots when needed
bun test tests/unit/feature-elimination/snapshot-testing.test.ts --update-snapshots

# Run with debug output
DEBUG=* bun test tests/integration/dev-hq/dev-hq-api-server.test.ts

# Run performance-focused tests
bun test tests/unit/utils/performance-*.test.ts
```

## 📊 Test Coverage

### Coverage Configuration

Coverage is configured in `config/bun-test.config.ts` with:

- **Global threshold**: 80% for branches, functions, lines, and statements
- **Include**: All source files in `src/` directory
- **Exclude**: Test files, type definitions, and build artifacts
- **Reporters**: Text, JSON, and HTML reports

### Dev HQ Coverage

- ✅ API Server endpoints (11/11)
- ✅ Process automation execution
- ✅ Spawn server HTTP/WebSocket API
- ✅ Authentication & authorization
- ✅ Error handling & edge cases
- ✅ Concurrency & performance
- ✅ Security & validation

### Core System Coverage

- ✅ Feature flag elimination
- ✅ Bundle size verification
- ✅ Dead code elimination
- ✅ Nested feature conditions
- ✅ Multiple feature combinations
- ✅ TypeScript type safety
- ✅ Server protocols & networking
- ✅ Snapshot testing
- ✅ Seeded reproducible testing

### Coverage Reports

```bash
# Generate coverage report
bun test --coverage

# View HTML coverage report
open coverage/index.html

# Coverage for specific modules
bun test tests/unit/feature-elimination --coverage
bun test tests/integration/dev-hq --coverage
```

## 🔧 Test Configuration

### Configuration Files

- **`config/bun-test.config.ts`**: Main test configuration with coverage, timeouts, and reporters
- **`config/test-setup.ts`**: Global setup, utilities, and environment configuration

### Environment Setup

```bash
# Set test environment
export NODE_ENV=test

# Enable debug logging
export DEBUG=dev-hq:*

# Set test timeout (default: 10000ms)
export TEST_TIMEOUT=10000

# Enable coverage reporting
export COVERAGE=true
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "test:unit": "bun test tests/unit/**/*.test.ts",
    "test:integration": "bun test tests/integration/**/*.test.ts",
    "test:e2e": "bun test tests/e2e/**/*.test.ts",
    "test:dev-hq": "bun test tests/integration/dev-hq/*.test.ts",
    "test:elimination": "bun test tests/unit/feature-elimination/*.test.ts",
    "test:types": "bun test tests/unit/type-testing/*.test.ts",
    "test:servers": "bun test tests/integration/server/*.test.ts tests/integration/api/*.test.ts",
    "test:ci": "bun test --coverage --reporter=json"
  }
}
```

### Test Utilities

The `config/test-setup.ts` provides global utilities:

```typescript
// Available in all test files
global.testUtils.getRandomPort()  // Get random available port
global.testUtils.createTempDir()  // Create temporary directory
global.testUtils.cleanupTempDir() // Cleanup temporary directory
```

## 📝 Adding New Tests

### Test File Structure

```typescript
#!/usr/bin/env bun

import { describe, expect, expectTypeOf, it } from "bun:test";
import { testUtils } from "./config/test-setup";

describe("Test Category", () => {
  it("should test specific functionality", () => {
    // Use test utilities when needed
    const port = testUtils.getRandomPort();

    // Test implementation
    expect(result).toBe(expected);
  });

  it("should maintain type safety", () => {
    expectTypeOf(value).toEqualTypeOf<ExpectedType>();
  });
});
```

### File Naming Conventions

- **Unit tests**: `tests/unit/[category]/[feature].test.ts`
- **Integration tests**: `tests/integration/[module]/[feature].test.ts`
- **E2E tests**: `tests/e2e/[scenario]/[workflow].test.ts`
- **Type tests**: `tests/unit/type-testing/[type-feature].test.ts`

### Best Practices

1. **Use descriptive test names** that clearly state what's being tested
2. **Include type safety tests** with `expectTypeOf` for TypeScript code
3. **Test both success and failure scenarios**
4. **Use proper cleanup** in `beforeEach`/`afterAll` hooks
5. **Mock external dependencies** when necessary
6. **Include edge cases and error conditions**
7. **Add performance tests** for critical paths
8. **Use seeded tests** for random operations
9. **Follow the directory structure** for proper organization
10. **Use global test utilities** for common operations

### Test Categories Guide

#### Unit Tests

- Test individual functions and classes in isolation
- Mock external dependencies
- Focus on business logic and edge cases
- Fast execution with minimal setup

#### Integration Tests

- Test interactions between modules
- Use real dependencies when possible
- Test API endpoints and database interactions
- Include authentication and authorization

#### E2E Tests
- Test complete user workflows
- Use the application as a user would
- Include browser automation when applicable
- Focus on critical user journeys

### Dev HQ Test Guidelines

- **API Tests**: Test all endpoints, authentication, and error handling
- **Automation Tests**: Test process lifecycle, cleanup, and resource management
- **Server Tests**: Test concurrency, security, and performance under load
- **Integration Tests**: Test interactions between Dev HQ modules

## 🐛 Debugging Tests

### Debug Mode

```bash
# Run with debug output
DEBUG=* bun test tests/integration/dev-hq/dev-hq-api-server.test.ts

# Run specific test with debug
bun test tests/integration/dev-hq/dev-hq-automation.test.ts --debug
```

### Common Issues

1. **Port conflicts**: Tests use random ports (port: 0) to avoid conflicts
2. **Async cleanup**: Always use `afterAll` for resource cleanup
3. **Timing issues**: Use proper async/await and timeout handling
4. **Environment isolation**: Tests should not modify global state

## 📈 Test Performance

### Benchmarks

- **API Server Tests**: ~50 tests run in <2 seconds
- **Automation Tests**: ~60 tests run in <3 seconds
- **Spawn Server Tests**: ~40 tests run in <5 seconds
- **Full Test Suite**: ~300 tests run in <15 seconds

### Performance Tips

1. **Use concurrent execution** for independent tests
2. **Reuse server instances** across multiple tests
3. **Mock expensive operations** when possible
4. **Optimize setup/teardown** to minimize overhead

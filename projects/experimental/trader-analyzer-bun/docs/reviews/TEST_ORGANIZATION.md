# Test Organization

## Overview
This project uses a hybrid test organization pattern combining co-located unit tests with a dedicated integration test directory.

## Directory Structure

```
trader-analyzer/
├── src/                          # Source code with co-located unit tests
│   ├── api/
│   │   ├── workers-client.ts
│   │   └── workers-client.test.ts      # Unit test (10 tests)
│   └── orca/aliases/bookmakers/
│       ├── tags.ts
│       ├── tags.test.ts                # Unit test
│       └── tags.performance.test.ts    # Performance test
└── test/                         # Dedicated integration test directory
    ├── harness.ts                      # Test utilities (runBun, runCli, etc.)
    ├── security-cli.test.ts             # Integration test (CLI commands)
    └── sri.test.ts                     # Integration test (SRI generation)
```

## Test Files Summary

| File | Type | Location | Tests | Purpose |
|------|------|----------|-------|---------|
| `src/api/workers-client.test.ts` | Unit | Co-located | 10 | Cloudflare Workers API client |
| `src/orca/aliases/bookmakers/tags.test.ts` | Unit | Co-located | - | Bookmaker tags functionality |
| `src/orca/aliases/bookmakers/tags.performance.test.ts` | Performance | Co-located | - | Performance benchmarks |
| `test/security-cli.test.ts` | Integration | Dedicated | - | Security CLI commands |
| `test/sri.test.ts` | Integration | Dedicated | 28 | Subresource Integrity |
| `test/ticks/correlation-detection.test.ts` | Integration | Dedicated | 11 | Layer4 cross-sport correlation detection |
| `test/profiling/correlation-detection.bench.ts` | Performance | Dedicated | - | Layer4 correlation performance benchmarks |

**Total: 7 test files, 105+ tests**

**See also:** [Layer4 Correlation Test Guide](../LAYER4-CORRELATION-TEST-GUIDE.md) for comprehensive documentation on Layer4 correlation detection tests.

## Naming Conventions

- **Standard tests**: `*.test.ts`
- **Performance tests**: `*.performance.test.ts`
- **Test utilities**: `test/harness.ts` (not a test file, but test utilities)

## When to Use Each Pattern

### Co-located Tests (`src/**/*.test.ts`)
Use for:
- ✅ Unit tests for specific modules/components
- ✅ Tests that test implementation details
- ✅ Tests that need direct access to private/protected members
- ✅ Performance tests for specific functions

### Dedicated Test Directory (`test/**/*.test.ts`)
Use for:
- ✅ Integration tests spanning multiple modules
- ✅ End-to-end tests
- ✅ Tests requiring external services (databases, APIs)
- ✅ CLI command tests
- ✅ Tests that exercise the full application stack

## Running Tests

### Basic Commands

```bash
# Run all tests
bun test

# Run tests in specific directory
bun test src/api/
bun test test/

# Run tests matching pattern
bun test workers-client
bun test security-cli

# Run specific test file
bun test src/api/workers-client.test.ts

# Filter by test name
bun test -t "timeout"
```

### Advanced Test Execution

#### Stability Testing (Repeats)

```bash
# Run with 20 repeats for stability testing
bun test --repeats=20 packages/graphs/multilayer/test/correlation-detection.test.ts

# Run Layer4 correlation detection tests with 20 repeats
bun test --repeats=20 test/ticks/correlation-detection.test.ts

# Run with verbose output
bun test --repeats=20 --verbose packages/graphs/multilayer/test/correlation-detection.test.ts

# Run with specific test filter
bun test --repeats=20 --test-name-pattern="detects volume spike anomalies" \
  packages/graphs/multilayer/test/correlation-detection.test.ts

# Run Layer4 tests with specific filter
bun test --repeats=20 --test-name-pattern="detects volume spike anomalies" \
  test/ticks/correlation-detection.test.ts
```

#### Performance Benchmarks

```bash
# Run performance benchmarks (50 repeats recommended)
bun test --repeats=50 packages/graphs/multilayer/test/correlation-detection.bench.ts

# Run Layer4 correlation detection performance benchmarks
bun test --repeats=50 test/profiling/correlation-detection.bench.ts

# Performance testing with custom timeout
bun test --repeats=50 --timeout=60000 packages/graphs/multilayer/test/correlation-detection.bench.ts

# Layer4 benchmarks with CPU profiling
bun test --repeats=50 test/profiling/correlation-detection.bench.ts --profile=cpu
```

#### Coverage Reports

```bash
# Generate text coverage report
bun test --coverage packages/graphs/multilayer/test/correlation-detection.test.ts

# Generate HTML coverage report
bun test --coverage --coverage-reporter=html packages/graphs/multilayer/test/correlation-detection.test.ts

# Generate multiple coverage formats
bun test --coverage --coverage-reporter=html,lcov packages/graphs/multilayer/test/correlation-detection.test.ts
```

#### Using Test Runner Script

For convenience, use the enhanced test runner script:

```bash
# Stability testing
bun run scripts/test-runner.ts --repeats=20 packages/graphs/multilayer/test/correlation-detection.test.ts

# Performance benchmarks
bun run scripts/test-runner.ts --repeats=50 --bench packages/graphs/multilayer/test/correlation-detection.bench.ts

# Coverage with HTML report
bun run scripts/test-runner.ts --coverage --coverage-reporter=html \
  packages/graphs/multilayer/test/correlation-detection.test.ts

# Verbose with filter
bun run scripts/test-runner.ts --repeats=20 --verbose \
  --test-name-pattern="detects volume spike anomalies" \
  packages/graphs/multilayer/test/correlation-detection.test.ts
```

**Test Runner Features:**
- ✅ Automatic repeat count for benchmarks (50) vs stability (20)
- ✅ Configurable timeouts based on test type
- ✅ Multiple coverage reporter formats
- ✅ Verbose output with detailed configuration
- ✅ Test name pattern filtering

## Test Discovery

Bun automatically discovers test files matching:
- `*.test.ts`
- `*.spec.ts`
- `test/**/*.ts`

Configuration is in `bunfig.toml` under `[test]` section.

## Test Utilities

### Test Harness (`test/harness.ts`)

Provides utilities for integration tests:
- `runBun()` - Execute Bun commands with timeout handling
- `runCli()` - Execute CLI commands with timeout handling
- `normalizeBunSnapshot()` - Normalize output for snapshot testing
- `bunExe()` - Get Bun executable path
- `bunEnv` - Sanitized environment variables

### Global Test Setup (`test/setup.ts`)

Automatically loaded before all tests (configured in `bunfig.toml`):
- **Mock Data Factories:**
  - `createMockSportData()` - Generate mock sport data for testing
  - `createMockCorrelation()` - Generate mock correlation data
- **Global Lifecycle Hooks:**
  - `beforeAll()` - Sets up test environment, mocks external services
  - `afterAll()` - Cleans up resources and environment variables
  - `beforeEach()` - Resets mocks before each test
  - `afterEach()` - Cleans up test-specific state

**Usage:**
```typescript
import { createMockSportData, createMockCorrelation } from "../setup";

// Use in tests
const sportData = createMockSportData("basketball", Date.now());
const correlation = createMockCorrelation("basketball", "soccer", 0.85);
```

## Configuration

See `bunfig.toml` for:
- Test discovery settings
- Timeout configuration
- Coverage settings
- Lifecycle hooks documentation
- Snapshot testing documentation

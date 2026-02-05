# Bun Test Commands Quick Reference

Quick reference guide for running tests with Bun's advanced features: repeats, coverage, filtering, and performance benchmarking.

---

## **Basic Test Execution**

```bash
# Run all tests
bun test

# Run specific test file
bun test packages/graphs/multilayer/test/correlation-detection.test.ts

# Run Layer4 correlation detection tests
bun test test/ticks/correlation-detection.test.ts

# Run tests in directory
bun test packages/graphs/multilayer/test/

# Filter by test name pattern
bun test --test-name-pattern="detects volume spike anomalies"
```

---

## **Stability Testing (Repeats)**

Use `--repeats` to run tests multiple times, catching flaky tests and ensuring stability:

```bash
# Run with 20 repeats (recommended for stability testing)
bun test --repeats=20 packages/graphs/multilayer/test/correlation-detection.test.ts

# Run Layer4 correlation tests with 20 repeats
bun test --repeats=20 test/ticks/correlation-detection.test.ts

# Run with verbose output to see all iterations
bun test --repeats=20 --verbose packages/graphs/multilayer/test/correlation-detection.test.ts

# Run with specific test filter
bun test --repeats=20 --test-name-pattern="detects volume spike anomalies" \
  packages/graphs/multilayer/test/correlation-detection.test.ts

# Run Layer4 tests with specific filter
bun test --repeats=20 --test-name-pattern="detects volume spike anomalies" \
  test/ticks/correlation-detection.test.ts
```

**When to use:**
- ✅ Testing flaky tests
- ✅ Ensuring test stability
- ✅ Catching race conditions
- ✅ Validating deterministic behavior

**Default:** `TEST_CONFIG.DEFAULT_REPEATS` (20) from `src/utils/rss-constants.ts`

---

## **Performance Benchmarks**

Use higher repeat counts (50+) for performance testing:

```bash
# Run performance benchmarks (50 repeats recommended)
bun test --repeats=50 test/profiling/correlation-detection.bench.ts

# Performance testing with custom timeout
bun test --repeats=50 --timeout=60000 test/profiling/correlation-detection.bench.ts

# Performance testing with verbose output
bun test --repeats=50 --verbose test/profiling/correlation-detection.bench.ts

# Using npm script shortcut
bun run test:bench test/profiling/correlation-detection.bench.ts
```

**Available Benchmarks:**
- `test/profiling/correlation-detection.bench.ts` - Layer 4 correlation detection performance
  - Graph building with 1000 data points
  - Anomaly detection with 500 correlations
  - Time-series alignment performance
  - Multi-layer graph construction
  - Cross-sport correlation calculation

**When to use:**
- ✅ Performance regression detection
- ✅ Benchmarking critical paths
- ✅ Comparing algorithm implementations
- ✅ Validating performance thresholds

**Default:** `TEST_CONFIG.PERFORMANCE_REPEATS` (50) from `src/utils/rss-constants.ts`

---

## **Coverage Reports**

Generate code coverage reports in multiple formats:

```bash
# Generate text coverage report (default)
bun test --coverage packages/graphs/multilayer/test/correlation-detection.test.ts

# Generate HTML coverage report (viewable in browser)
bun test --coverage --coverage-reporter=html packages/graphs/multilayer/test/correlation-detection.test.ts

# Generate multiple coverage formats
bun test --coverage --coverage-reporter=html,lcov packages/graphs/multilayer/test/correlation-detection.test.ts

# Generate JSON coverage report (for CI/CD)
bun test --coverage --coverage-reporter=json packages/graphs/multilayer/test/correlation-detection.test.ts
```

**Coverage Reporters:**
- `text` - Console output (default)
- `html` - HTML report (view at `./coverage/index.html`)
- `lcov` - LCOV format (for CI/CD tools)
- `json` - JSON format (for programmatic analysis)

**Coverage Configuration:**
- Coverage directory: `./coverage` (configurable in `bunfig.toml`)
- Test files excluded by default
- Thresholds: See `TEST_CONFIG` in `src/utils/rss-constants.ts`

---

## **Using Test Runner Script**

The enhanced test runner script (`scripts/test-runner.ts`) provides convenient wrappers:

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

# Multiple test files
bun run scripts/test-runner.ts --repeats=20 \
  packages/graphs/multilayer/test/*.test.ts
```

**Test Runner Features:**
- ✅ Automatic repeat count for benchmarks (50) vs stability (20)
- ✅ Configurable timeouts based on test type
- ✅ Multiple coverage reporter formats
- ✅ Verbose output with detailed configuration
- ✅ Test name pattern filtering

---

## **NPM Script Shortcuts**

Convenient npm scripts for common test patterns:

```bash
# Test runner (pass arguments)
bun run test:runner --repeats=20 packages/graphs/multilayer/test/correlation-detection.test.ts

# Stability testing (20 repeats)
bun run test:stability packages/graphs/multilayer/test/correlation-detection.test.ts

# Performance benchmarks (50 repeats)
bun run test:bench packages/graphs/multilayer/test/correlation-detection.bench.ts

# Coverage with HTML report
bun run test:coverage packages/graphs/multilayer/test/correlation-detection.test.ts
```

---

## **Advanced Options**

### **Timeout Configuration**

```bash
# Custom timeout (milliseconds)
bun test --timeout=60000 packages/graphs/multilayer/test/correlation-detection.test.ts

# Performance timeout (default: 60000ms)
bun test --repeats=50 --timeout=60000 packages/graphs/multilayer/test/correlation-detection.bench.ts
```

**Defaults:**
- Standard tests: `TEST_CONFIG.DEFAULT_TIMEOUT` (30000ms)
- Performance tests: `TEST_CONFIG.PERFORMANCE_TIMEOUT` (60000ms)

### **Memory Optimization**

```bash
# Use reduced memory mode (useful for CI or large test suites)
bun test --smol packages/graphs/multilayer/test/correlation-detection.test.ts
```

### **Verbose Output**

```bash
# Enable verbose output for detailed test information
bun test --verbose packages/graphs/multilayer/test/correlation-detection.test.ts

# Verbose with repeats
bun test --repeats=20 --verbose packages/graphs/multilayer/test/correlation-detection.test.ts
```

---

## **Test Configuration Constants**

Configuration constants are centralized in `src/utils/rss-constants.ts`:

```typescript
export const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 30000,           // Standard test timeout
  PERFORMANCE_TIMEOUT: 60000,       // Performance test timeout
  DEFAULT_REPEATS: 20,              // Stability testing repeats
  PERFORMANCE_REPEATS: 50,          // Performance benchmark repeats
  CONCURRENCY: 4,                   // Test concurrency level
  COVERAGE_LINES_THRESHOLD: 80,     // Coverage threshold for lines
  COVERAGE_FUNCTIONS_THRESHOLD: 80, // Coverage threshold for functions
  COVERAGE_BRANCHES_THRESHOLD: 75,  // Coverage threshold for branches
  COVERAGE_STATEMENTS_THRESHOLD: 80, // Coverage threshold for statements
} as const;
```

---

## **Test File Patterns**

Test discovery patterns from `TEST_PATTERNS`:

- `*.test.ts` - Standard test files
- `*.spec.ts` - Spec test files
- `*.performance.test.ts` - Performance test files
- `*.bench.ts` - Benchmark test files
- `test/**/*.ts` - Tests in test directory
- `src/**/*.test.ts` - Co-located tests

---

## **Best Practices**

| Practice | Command | Rationale |
|----------|---------|-----------|
| **Stability testing** | `--repeats=20` | Catch flaky tests |
| **Performance benchmarks** | `--repeats=50` | Reliable performance metrics |
| **Coverage reports** | `--coverage --coverage-reporter=html` | Visual coverage analysis |
| **Verbose debugging** | `--verbose` | Detailed test output |
| **Test filtering** | `--test-name-pattern` | Focus on specific tests |
| **CI/CD optimization** | `--smol` | Reduced memory footprint |

---

## **Integration with Benchmarking System**

Test results can be integrated with the benchmarking system:

```bash
# Run performance test
bun test --repeats=50 packages/graphs/multilayer/test/correlation-detection.bench.ts

# Create benchmark from test results
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=profiles/correlation-detection.cpuprofile \
  --name="Correlation Detection Performance" \
  --description="Performance baseline for correlation detection tests"
```

---

## **Related Documentation**

- 📚 [Test Organization](./reviews/TEST_ORGANIZATION.md) - Test structure and organization
- 📚 [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) - Test configuration in `bunfig.toml`
- 📚 [Benchmarks README](../benchmarks/README.md) - Performance benchmarking guide
- 📚 [Bun v1.51 Impact Analysis](./BUN-V1.51-IMPACT-ANALYSIS.md) - Performance optimizations

---

## **Quick Reference**

```bash
# Stability (20 repeats)
bun test --repeats=20 <test-file>

# Performance (50 repeats)
bun test --repeats=50 <bench-file>

# Coverage (HTML)
bun test --coverage --coverage-reporter=html <test-file>

# Verbose with filter
bun test --repeats=20 --verbose --test-name-pattern="pattern" <test-file>

# Using test runner script
bun run scripts/test-runner.ts --repeats=20 --verbose <test-file>
```

---

Your test infrastructure now supports **production-grade testing** with stability validation, performance benchmarking, and comprehensive coverage reporting.

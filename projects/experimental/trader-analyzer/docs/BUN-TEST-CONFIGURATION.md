# Bun Test Configuration Reference

Complete reference for configuring Bun's test runner via `bunfig.toml` and CLI flags.

---

## **Configuration File: `bunfig.toml`**

Bun uses `bunfig.toml` (not `bun.test.toml`) for all configuration, including test settings under the `[test]` section.

**Location:** `config/bunfig.toml` or root `bunfig.toml`

---

## **Valid Bun Test Configuration Options**

### **Basic Test Settings**

```toml
[test]
# Default timeout in milliseconds
timeout = 30000

# Retry failed tests (Bun v1.51+)
retry = 0  # 0 = disabled, N = retry N times

# Bail on failures
bail = false  # false = continue, true = stop after first failure
# bail = 5  # Stop after 5 failures

# Re-run tests to catch flakiness
rerunEach = 0  # Number of times to re-run each test file

# Randomize test execution order (detects test dependencies)
randomize = false

# Reduce memory footprint (useful for CI)
smol = false
```

### **Coverage Configuration**

```toml
[test]
# Enable coverage (or use --coverage flag)
coverage = false

# Coverage reporters (multiple formats supported)
coverageReporter = ["text", "html", "json", "lcov"]

# Coverage output directory
coverageDir = "./coverage"

# Exclude test files from coverage
coverageSkipTestFiles = true

# Coverage thresholds (Bun v1.51+)
coverageThreshold = 0.8  # Overall threshold
# Or detailed thresholds:
# coverageThreshold = { lines = 0.9, functions = 0.8, statements = 0.85, branches = 0.75 }

# Files/patterns to exclude from coverage
coveragePathIgnorePatterns = [
  "**/*.test.ts",
  "**/*.spec.ts",
  "test/**",
  "dist/**",
]
```

### **Preload Scripts**

```toml
[test]
# Global test setup (runs before all tests)
preload = ["./test/setup.ts"]
```

### **Reporter Configuration**

```toml
[test.reporter]
# JUnit XML reporter for CI/CD
junit = "./reports/junit.xml"
```

---

## **CLI-Only Options (Not Configurable in bunfig.toml)**

These options must be specified via CLI flags:

### **Test Filtering**

```bash
# Filter by test name pattern
bun test --test-name-pattern="pattern"

# Filter by file path
bun test ./test/specific-test.test.ts
```

### **Watch Mode**

```bash
# Watch for file changes and re-run tests
bun test --watch

# Watch with specific files
bun test --watch ./test/
```

### **Verbose Output**

```bash
# Enable verbose output
bun test --verbose
```

### **Repeats (Stability/Performance Testing)**

```bash
# Run tests multiple times (stability testing)
bun test --repeats=20

# Performance benchmarks (50+ repeats)
bun test --repeats=50 ./test/profiling/correlation-detection.bench.ts
```

### **Environment Variables**

```bash
# Load environment variables from file
bun test --env-file .env.test

# Set environment variables
NODE_ENV=test bun test
```

### **TypeScript Configuration**

```bash
# Override TypeScript config
bun test --tsconfig-override ./tsconfig.test.json
```

### **Module Conditions**

```bash
# Set package.json conditions
bun test --conditions development
```

---

## **Jest-Specific Options (Not Supported)**

These options are Jest-specific and **not supported** in Bun:

- ❌ `coverageProvider` - Bun uses its own coverage implementation
- ❌ `globals` - Not applicable (Bun doesn't inject globals)
- ❌ `mock` - Use manual mocks in test files or preload scripts
- ❌ `match` / `exclude` - Bun auto-discovers `*.test.ts`, `*.spec.ts`, `test/**/*.ts`
- ❌ `watchIgnore` - Use `.gitignore` patterns
- ❌ `isolate` - Tests run in same process (use proper cleanup)
- ❌ `env` array - Use `--env-file` flag or preload script
- ❌ `tsconfig` in `[test]` - Use `--tsconfig-override` flag
- ❌ `bench` / `benchTimeout` - Use `--repeats` and `--timeout` flags

---

## **Configuration Examples**

### **Development Configuration**

```toml
[test]
timeout = 30000
coverage = false
preload = ["./test/setup.ts"]
smol = false
randomize = false
```

### **CI/CD Configuration**

```toml
[test]
timeout = 60000
coverage = true
coverageReporter = ["text", "lcov", "json"]
coverageThreshold = 0.8
preload = ["./test/setup.ts"]
smol = true  # Reduce memory footprint
bail = true  # Stop on first failure
retry = 3    # Retry flaky tests

[test.reporter]
junit = "./reports/junit.xml"
```

### **Performance Benchmark Configuration**

```toml
[test]
timeout = 60000  # Longer timeout for benchmarks
preload = ["./test/setup.ts"]
smol = false  # Don't reduce memory for accurate benchmarks
```

**Usage:**
```bash
# Run with 50 repeats for performance testing
bun test --repeats=50 --timeout=60000 ./test/profiling/correlation-detection.bench.ts
```

---

## **Configuration Priority**

1. **CLI flags** (highest priority)
2. **Environment variables**
3. **bunfig.toml** `[test]` section
4. **Bun defaults** (lowest priority)

**Example:**
```bash
# CLI flag overrides config file
bun test --timeout=10000  # Uses 10s timeout even if bunfig.toml says 30000
```

---

## **Best Practices**

### **1. Use Preload Scripts for Global Setup**

```toml
[test]
preload = ["./test/setup.ts"]
```

**`test/setup.ts`:**
```typescript
import { beforeAll, afterAll } from "bun:test";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  // Setup global mocks
});

afterAll(() => {
  // Cleanup
});
```

### **2. Configure Coverage Thresholds**

```toml
[test]
coverageThreshold = { 
  lines = 0.9, 
  functions = 0.8, 
  statements = 0.85, 
  branches = 0.75 
}
```

### **3. Use Conditional Configurations**

```toml
# Default config
[test]
timeout = 30000
coverage = false

# CI-specific config
[test.ci]
timeout = 60000
coverage = true
smol = true
bail = true
```

**Usage:**
```bash
bun test --config=ci
```

### **4. Exclude Files from Coverage**

```toml
[test]
coveragePathIgnorePatterns = [
  "**/*.test.ts",
  "test/**",
  "scripts/**",
  "*.config.ts",
]
```

---

## **Related Documentation**

- 📚 [Bun Test Commands](./BUN-TEST-COMMANDS.md) - CLI usage and examples
- 📚 [Test Organization](./reviews/TEST_ORGANIZATION.md) - Test structure and best practices
- 📚 [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) - Complete bunfig.toml reference
- 📚 [Benchmarks README](../benchmarks/README.md) - Performance benchmarking guide

---

## **Quick Reference**

| Option | Config File | CLI Flag | Default |
|--------|-------------|----------|---------|
| Timeout | `timeout = 30000` | `--timeout=30000` | 5000ms |
| Coverage | `coverage = true` | `--coverage` | false |
| Retry | `retry = 3` | `--retry=3` | 0 |
| Bail | `bail = true` | `--bail` | false |
| Repeats | ❌ | `--repeats=20` | 1 |
| Verbose | ❌ | `--verbose` | false |
| Watch | ❌ | `--watch` | false |
| Preload | `preload = ["./test/setup.ts"]` | `--preload ./test/setup.ts` | [] |

---

Your Bun test configuration is now optimized for development, CI/CD, and performance benchmarking!

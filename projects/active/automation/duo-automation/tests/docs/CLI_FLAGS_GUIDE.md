# CLI Flags Guide - Matrix Testing System

## 🚩 CLI Flags Overview

The matrix testing system supports comprehensive CLI flags for fine-grained control over test execution.

---

## 📋 Matrix Runner Flags

### **Basic Flags**
```bash
bun run tests/matrix-test-runner.ts [options]

Options:
  --category <name>       Run tests for specific category
  --priority <level>      Run tests for specific priority
  --parallel              Run tests in parallel
  --dry-run              Show execution plan without running
  --help                 Show this help message
```

### **Category Examples**
```bash
# Run Core Functionality tests
bun run tests/matrix-test-runner.ts --category "Core Functionality"

# Run Security tests
bun run tests/matrix-test-runner.ts --category Security

# Run Performance tests
bun run tests/matrix-test-runner.ts --category Performance
```

### **Priority Examples**
```bash
# Run Critical priority tests only
bun run tests/matrix-test-runner.ts --priority critical

# Run High and Medium priority tests
bun run tests/matrix-test-runner.ts --priority high
```

---

## ⚙️ Bun Test Execution Flags

### **Timeout Control**
```bash
# Set per-test timeout to 10 seconds
BUN_TEST_TIMEOUT=10000 bun run tests/matrix-test-runner.ts

# Extended timeout for slow tests
BUN_TEST_TIMEOUT=30000 bun run tests/matrix-test-runner.ts
```

### **Rerun Control**
```bash
# Re-run each test 3 times for reliability
BUN_TEST_RERUN_EACH=3 bun run tests/matrix-test-runner.ts

# Stress test with 5 reruns
BUN_TEST_RERUN_EACH=5 bun run tests/matrix-test-runner.ts
```

### **Concurrency Control**
```bash
# Force all tests to run concurrently
BUN_TEST_CONCURRENT=true bun run tests/matrix-test-runner.ts

# Limit maximum concurrent tests
BUN_TEST_MAX_CONCURRENCY=8 bun run tests/matrix-test-runner.ts
```

### **Randomization Control**
```bash
# Run tests in random order
BUN_TEST_RANDOMIZE=true bun run tests/matrix-test-runner.ts

# Randomized with reproducible seed
BUN_TEST_RANDOMIZE=true BUN_TEST_SEED=12345 bun run tests/matrix-test-runner.ts
```

### **Bail Control**
```bash
# Exit after first failure (default)
BUN_TEST_BAIL=1 bun run tests/matrix-test-runner.ts

# Exit after 3 failures
BUN_TEST_BAIL=3 bun run tests/matrix-test-runner.ts

# Never bail (run all tests)
BUN_TEST_BAIL=0 bun run tests/matrix-test-runner.ts
```

---

## 🎛️ Environment Variable Flags

### **Global Control Flags**
```bash
# Master switch for all tests
ENABLE_ALL_TESTS=true          # Enable all tests
ENABLE_ALL_TESTS=false         # Disable all tests

# Global overrides
TEST_TIMEOUT_OVERRIDE=15000    # Override all test timeouts
TEST_PARALLEL_OVERRIDE=true    # Force parallel execution
```

### **Category Control Flags**
```bash
# Enable/disable entire categories
ENABLE_CORE=true               # Core functionality tests
ENABLE_CONFIG=false            # Disable configuration tests
ENABLE_SECURITY=true           # Security tests
ENABLE_PERFORMANCE=false       # Performance tests
ENABLE_INTEGRATION=true        # Integration tests
ENABLE_E2E=false               # E2E tests
```

### **Priority Control Flags**
```bash
# Control by priority level
ENABLE_CRITICAL=true           # Critical priority tests
ENABLE_HIGH=false              # Disable high priority
ENABLE_MEDIUM=true             # Medium priority tests
ENABLE_LOW=false               # Disable low priority tests
```

### **Individual Test Flags**
```bash
# Control specific tests
ENABLE_CORE_USER_AGENT=true    # User agent generation tests
ENABLE_CORE_PROXY=false        # Disable proxy management tests
ENABLE_CORE_RATE_LIMIT=true    # Rate limiting tests
ENABLE_CORE_VALIDATION=false   # Input validation tests
ENABLE_CORE_INTEGRATION=true   # Integration tests
```

---

## 🚀 Pre-configured Scripts

### **Category Scripts**
```bash
bun run matrix                    # Run all enabled tests
bun run matrix:critical          # Critical tests only
bun run matrix:core              # Core functionality tests
bun run matrix:config            # Configuration tests
bun run matrix:security          # Security tests
bun run matrix:performance       # Performance tests
bun run matrix:integration       # Integration tests
bun run matrix:e2e               # E2E tests
```

### **Execution Control Scripts**
```bash
bun run matrix:timeout           # Extended timeout (10s)
bun run matrix:rerun             # Rerun each test 3x
bun run matrix:concurrent        # Force concurrent execution
bun run matrix:random            # Randomize with seed 12345
bun run matrix:bail              # Bail after 2 failures
bun run matrix:max-concurrency   # Limit to 8 concurrent
bun run matrix:stress            # Stress test with rerun
bun run matrix:reliable          # Reliable testing mode
```

### **Utility Scripts**
```bash
bun run matrix:parallel          # All tests in parallel
bun run matrix:sequential        # All tests sequentially
bun run matrix:dry-run           # Show execution plan
bun run matrix:help              # Show detailed help
```

---

## 📊 Flag Combinations

### **Development Workflow**
```bash
# Fast feedback - critical tests only
bun run matrix:critical

# Extended timeout for slow features
BUN_TEST_TIMEOUT=10000 bun run matrix:core

# Reliable testing with rerun
bun run matrix:reliable
```

### **CI/CD Pipeline**
```bash
# Fast fail on first issue
BUN_TEST_BAIL=1 bun run matrix:critical

# Full suite with parallel execution
bun run matrix:parallel

# Performance testing
ENABLE_PERFORMANCE=true BUN_TEST_MAX_CONCURRENCY=4 bun run matrix
```

### **Debugging & Analysis**
```bash
# Randomized execution to find dependencies
bun run matrix:random

# High concurrency stress test
bun run matrix:stress

# Verbose output with extended timeout
BUN_TEST_TIMEOUT=15000 LOG_LEVEL=debug bun run matrix
```

---

## 🔍 Flag Reference Table

| Category | Flag | Environment Variable | Default | Description |
|----------|------|---------------------|---------|-------------|
| **Basic** | `--category` | N/A | all | Test category filter |
| **Basic** | `--priority` | N/A | all | Priority level filter |
| **Basic** | `--parallel` | N/A | false | Parallel execution |
| **Basic** | `--dry-run` | N/A | false | Show plan only |
| **Timeout** | N/A | `BUN_TEST_TIMEOUT` | 5000 | Per-test timeout (ms) |
| **Rerun** | N/A | `BUN_TEST_RERUN_EACH` | 1 | Rerun count |
| **Concurrency** | N/A | `BUN_TEST_CONCURRENT` | false | Force concurrent |
| **Concurrency** | N/A | `BUN_TEST_MAX_CONCURRENCY` | 20 | Max concurrent |
| **Randomize** | N/A | `BUN_TEST_RANDOMIZE` | false | Random order |
| **Randomize** | N/A | `BUN_TEST_SEED` | null | Random seed |
| **Bail** | N/A | `BUN_TEST_BAIL` | 1 | Fail limit |
| **Global** | N/A | `ENABLE_ALL_TESTS` | true | Master switch |
| **Category** | N/A | `ENABLE_CORE` | true | Core tests |
| **Category** | N/A | `ENABLE_CONFIG` | true | Config tests |
| **Category** | N/A | `ENABLE_SECURITY` | true | Security tests |
| **Category** | N/A | `ENABLE_PERFORMANCE` | true | Performance tests |
| **Priority** | N/A | `ENABLE_CRITICAL` | true | Critical tests |
| **Priority** | N/A | `ENABLE_HIGH` | true | High priority |
| **Priority** | N/A | `ENABLE_MEDIUM` | true | Medium priority |
| **Priority** | N/A | `ENABLE_LOW` | true | Low priority |

---

## 🛠️ Advanced Usage

### **Custom Configuration Files**
```bash
# Create .env.test-critical
ENABLE_CRITICAL=true
ENABLE_HIGH=false
ENABLE_MEDIUM=false
ENABLE_LOW=false
BUN_TEST_TIMEOUT=3000

# Use with
source .env.test-critical && bun run matrix
```

### **Script Chaining**
```bash
# Run critical tests, then performance tests if successful
bun run matrix:critical && bun run matrix:performance

# Run with different configurations
bun run matrix:critical || (echo "Critical tests failed" && exit 1)
```

### **Conditional Execution**
```bash
# Only run performance tests on weekends
if [ $(date +%u) -ge 6 ]; then
  bun run matrix:performance
fi

# Run extended tests in CI environment
if [ "$CI" = "true" ]; then
  bun run matrix:stress
fi
```

---

## 📚 Getting Help

### **Built-in Help**
```bash
# Show main help
bun run matrix:help

# Show execution plan
bun run matrix:dry-run

# Show current configuration
env | grep -E "(ENABLE_|BUN_TEST_)" | sort
```

### **Documentation**
- `tests/QUICK_REFERENCE.md` - Quick start guide
- `tests/MATRIX_TESTING_GUIDE.md` - Comprehensive guide
- `tests/CLI_FLAGS_GUIDE.md` - This flags reference

### **Troubleshooting**
```bash
# Check what tests are enabled
ENABLE_ALL_TESTS=true bun run matrix:dry-run

# Debug with verbose output
LOG_LEVEL=debug bun run matrix

# Test specific configuration
BUN_TEST_TIMEOUT=10000 ENABLE_CORE=true bun run matrix --category "Core Functionality"
```

---

**💡 Tip:** Combine multiple flags for precise control over test execution. Use environment variables for persistent configuration and CLI flags for one-time overrides.

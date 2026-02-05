# Matrix Testing Guide - Enhanced Execution Control

This guide explains the enhanced matrix testing system that provides granular control over test execution, separation, and organization.

## 🎯 Overview

The matrix testing system introduces:
- **Test Categorization**: Organized by functionality and priority
- **Environment Variable Control**: Fine-grained execution control
- **Dependency Management**: Automatic test ordering based on dependencies
- **Execution Matrix**: Visual representation of test relationships
- **Performance Optimization**: Parallel execution with resource management

## 📊 Test Matrix Structure

### **Categories**

| Category | Description | Typical Tests |
|----------|-------------|---------------|
| **Core Functionality** | Essential system features | User agents, proxy management, rate limiting |
| **Configuration** | System configuration and environment | Config management, environment handling |
| **Security** | Security features and secrets management | Authentication, secrets storage |
| **Performance** | Performance benchmarks and load testing | Load tests, memory usage |
| **Integration** | Cross-component integration | Scoping, platform capabilities |
| **E2E** | End-to-end workflow testing | Complete user workflows |

### **Priority Levels**

| Priority | Description | Execution Order |
|----------|-------------|-----------------|
| **Critical** | System-breaking if fails | 1st (always run) |
| **High** | Important features | 2nd |
| **Medium** | Standard features | 3rd |
| **Low** | Nice-to-have features | 4th |

## 🎛️ Environment Variable Control

##### **Global Controls**

```bash
# Global test execution
ENABLE_ALL_TESTS=true              # Enable/disable all tests
TEST_TIMEOUT_OVERRIDE=10000        # Override test timeouts (ms)
TEST_PARALLEL_OVERRIDE=true        # Force parallel execution
```

##### **🆕 Bun Test Execution Controls**
```bash
# Per-test timeout (default: 5000ms)
BUN_TEST_TIMEOUT=10000             # Set timeout to 10 seconds

# Test rerun for reliability (default: 1)
BUN_TEST_RERUN_EACH=3              # Re-run each test 3 times

# Concurrent execution
BUN_TEST_CONCURRENT=true            # Treat all tests as concurrent

# Randomized execution for dependency detection
BUN_TEST_RANDOMIZE=true            # Run tests in random order
BUN_TEST_SEED=12345               # Set seed for reproducible order

# Bail on failures (default: 1)
BUN_TEST_BAIL=2                    # Exit after 2 failures

# Concurrency control (default: 20)
BUN_TEST_MAX_CONCURRENCY=8         # Max 8 concurrent tests
```

##### **Category Controls**

```bash
# Enable/disable entire categories
ENABLE_CORE=true                   # Core functionality tests
ENABLE_CONFIG=false                # Disable configuration tests
ENABLE_SECURITY=true               # Security tests
ENABLE_PERFORMANCE=false           # Performance tests
ENABLE_INTEGRATION=true            # Integration tests
ENABLE_E2E=false                   # E2E tests
```

##### **Priority Controls**

```bash
# Control by priority level
ENABLE_CRITICAL=true               # Critical priority tests
ENABLE_HIGH=false                  # Disable high priority
ENABLE_MEDIUM=true                 # Medium priority tests
ENABLE_LOW=false                   # Disable low priority tests
```

##### **Individual Test Controls**

```bash
# Control specific tests
ENABLE_CORE_USER_AGENT=true        # User agent generation tests
ENABLE_CORE_PROXY=false            # Disable proxy management tests
ENABLE_CORE_RATE_LIMIT=true        # Rate limiting tests
ENABLE_CORE_VALIDATION=false       # Input validation tests
ENABLE_CORE_INTEGRATION=true       # Integration tests
```

## 🚀 Usage Examples

### **🆕 Advanced Usage Examples**

#### **Execution Control Examples**
```bash
# Extended timeout for slow tests
BUN_TEST_TIMEOUT=15000 bun run matrix

# Stress test with rerun and concurrent execution
BUN_TEST_RERUN_EACH=3 BUN_TEST_CONCURRENT=true bun run matrix --parallel

# Randomized execution with reproducible seed
BUN_TEST_RANDOMIZE=true BUN_TEST_SEED=12345 bun run matrix

# Bail early on failures for fast feedback
BUN_TEST_BAIL=1 BUN_TEST_TIMEOUT=5000 bun run matrix:critical

# High concurrency for performance testing
BUN_TEST_MAX_CONCURRENCY=16 bun run matrix:performance
```

#### **Combined Control Examples**
```bash
# Reliable testing with extended timeout and rerun
BUN_TEST_TIMEOUT=10000 BUN_TEST_RERUN_EACH=2 BUN_TEST_BAIL=1 bun run matrix:core

# Performance-focused testing
ENABLE_PERFORMANCE=true BUN_TEST_MAX_CONCURRENCY=8 BUN_TEST_TIMEOUT=30000 bun run matrix

# Quick critical tests with fast feedback
ENABLE_CRITICAL=true BUN_TEST_TIMEOUT=3000 BUN_TEST_BAIL=1 bun run matrix

# Comprehensive reliability testing
ENABLE_ALL_TESTS=true BUN_TEST_RERUN_EACH=2 BUN_TEST_RANDOMIZE=true BUN_TEST_SEED=42 bun run matrix --parallel
```

### **Basic Usage**

```bash
# Run all enabled tests
bun run tests/matrix-test-runner.ts

# Run with specific category
ENABLE_CORE=true bun run tests/matrix-test-runner.ts --category "Core Functionality"

# Run with specific priority
ENABLE_CRITICAL=true bun run tests/matrix-test-runner.ts --priority critical
```

### **Advanced Control**

```bash
# Run only critical and high priority tests in parallel
ENABLE_CRITICAL=true ENABLE_HIGH=true ENABLE_MEDIUM=false ENABLE_LOW=false \
bun run tests/matrix-test-runner.ts --parallel

# Run performance tests with extended timeout
ENABLE_PERFORMANCE=true TEST_TIMEOUT_OVERRIDE=60000 \
bun run tests/matrix-test-runner.ts --category Performance

# Dry run to see execution plan
bun run tests/matrix-test-runner.ts --dry-run
```

### **Development Workflow**

```bash
# Quick feedback - run only critical tests
ENABLE_CRITICAL=true ENABLE_HIGH=false ENABLE_MEDIUM=false ENABLE_LOW=false \
bun run tests/matrix-test-runner.ts

# Full test suite before commit
ENABLE_ALL_TESTS=true bun run tests/matrix-test-runner.ts --parallel

# Performance testing
ENABLE_PERFORMANCE=true ENABLE_CORE=false ENABLE_CONFIG=false \
bun run tests/matrix-test-runner.ts --category Performance
```

## 📋 Test Matrix Table

### **Complete Test Matrix**

| Test Key | Category | Priority | Dependencies | Timeout | Parallel | Environment Variables |
|----------|----------|----------|--------------|---------|----------|---------------------|
| `core-user-agent` | Core Functionality | Critical | None | 5s | ✅ | TEST_MODE=user-agent |
| `core-proxy-management` | Core Functionality | Critical | None | 10s | ✅ | TEST_MODE=proxy-management |
| `core-rate-limiting` | Core Functionality | Critical | core-user-agent | 15s | ❌ | TEST_MODE=rate-limiting |
| `core-input-validation` | Core Functionality | High | None | 5s | ✅ | TEST_MODE=validation |
| `core-integration` | Core Functionality | High | core-user-agent, core-proxy-management, core-rate-limiting | 20s | ❌ | TEST_MODE=integration |
| `config-manager` | Configuration | High | None | 8s | ✅ | TEST_MODE=config |
| `config-environment` | Configuration | Medium | config-manager | 10s | ✅ | TEST_MODE=environment |
| `security-secrets` | Security | Critical | config-manager | 12s | ❌ | TEST_MODE=security |
| `performance-load` | Performance | Medium | core-integration | 30s | ❌ | PERFORMANCE_MODE=load |
| `performance-memory` | Performance | Low | core-integration | 25s | ❌ | PERFORMANCE_MODE=memory |
| `integration-scoping` | Integration | High | config-environment | 15s | ✅ | TEST_MODE=scoping |
| `integration-platform` | Integration | Medium | integration-scoping | 18s | ✅ | TEST_MODE=platform |
| `e2e-workflows` | E2E | High | integration-scoping, integration-platform | 45s | ❌ | TEST_MODE=e2e |

### **Dependency Graph**

```
core-user-agent ──┐
                  ├─── core-rate-limiting ──┐
core-proxy-management ──┤                   ├─── core-integration ──┐
                                              │                   │
core-input-validation ────────────────────────┤                   ├─── performance-load ──┐
                                              │                   │                   │
config-manager ── config-environment ── integration-scoping ──┤                   │
                                              │                   │                   ├─── e2e-workflows
security-secrets ─────────────────────────────┤                   │
                                              │                   │
                                              └── integration-platform ──┘
```

## 🔧 Implementation Details

### **Matrix Configuration**

The matrix is defined in `tests/test-matrix.config.ts`:

```typescript
export const TEST_MATRIX: Record<string, TestMatrixConfig> = {
  'core-user-agent': {
    category: 'Core Functionality',
    description: 'User agent generation and validation tests',
    enabled: process.env.ENABLE_CORE_USER_AGENT !== 'false',
    priority: 'critical',
    dependencies: [],
    timeout: 5000,
    parallel: true,
    environment: {
      TEST_MODE: 'user-agent',
      LOG_LEVEL: 'info'
    }
  },
  // ... more test configurations
};
```

### **Environment Variable Resolution**

The system resolves environment variables in this order:

1. **Global overrides** (e.g., `ENABLE_ALL_TESTS=false`)
2. **Category overrides** (e.g., `ENABLE_CORE=false`)
3. **Priority overrides** (e.g., `ENABLE_CRITICAL=false`)
4. **Individual test overrides** (e.g., `ENABLE_CORE_USER_AGENT=false`)

### **Execution Order**

Tests are executed based on:
1. **Priority** (critical → high → medium → low)
2. **Dependencies** (dependency tests run first)
3. **Parallel capability** (parallel tests run concurrently when possible)

## 📊 Reporting and Analytics

### **Real-time Execution**

```bash
🔧 Setting up test matrix environment...
📊 Test Matrix Configuration:
   Total Tests: 13
   Enabled Tests: 8
   Categories: Core Functionality, Configuration, Security
   Priorities: critical, high, medium

🚀 Starting matrix test execution...
📋 Tests to execute: 8

🧪 Running core-user-agent (Core Functionality - critical)...
✅ core-user-agent passed (234ms)

🧪 Running core-proxy-management (Core Functionality - critical)...
✅ core-proxy-management passed (456ms)
```

### **Final Report**

```bash
📈 Test Matrix Results:
┌─────────────┬──────┬───────┬─────────┬──────────────┐
│    total    │ passed│ failed │ skipped │ totalDuration│
├─────────────┼──────┼───────┼─────────┼──────────────┤
│      8      │   7  │   1   │    0    │    5234ms    │
└─────────────┴──────┴───────┴─────────┴──────────────┘

📋 Detailed Results:
┌─────────────────┬───────────────────┬──────────┬────────┬─────────────┐
│      Test       │     Category      │ Priority │ Status │  Duration   │
├─────────────────┼───────────────────┼──────────┼────────┼─────────────┤
│ core-user-agent │ Core Functionality │ critical │ passed │    234ms    │
│ core-proxy-mgmt │ Core Functionality │ critical │ passed │    456ms    │
└─────────────────┴───────────────────┴──────────┴────────┴─────────────┘
```

### **JSON Report**

A detailed JSON report is saved to `reports/test-matrix-report.json`:

```json
{
  "timestamp": "2026-01-14T10:00:00.000Z",
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 1,
    "skipped": 0,
    "totalDuration": 5234,
    "categoryBreakdown": {
      "Core Functionality": { "total": 5, "passed": 5, "failed": 0 },
      "Configuration": { "total": 2, "passed": 1, "failed": 1 }
    },
    "priorityBreakdown": {
      "critical": { "total": 3, "passed": 3, "failed": 0 },
      "high": { "total": 3, "passed": 2, "failed": 1 }
    }
  },
  "detailedResults": [...],
  "environmentControls": {...},
  "matrixConfiguration": {...}
}
```

## 🎯 Best Practices

### **Development Workflow**

1. **Local Development**: Use critical tests only for fast feedback
   ```bash
   ENABLE_CRITICAL=true ENABLE_HIGH=false ENABLE_MEDIUM=false ENABLE_LOW=false bun run tests/matrix-test-runner.ts
   ```

2. **Feature Development**: Enable relevant categories
   ```bash
   ENABLE_CORE=true ENABLE_CONFIG=true bun run tests/matrix-test-runner.ts
   ```

3. **Before Commit**: Run full suite in parallel
   ```bash
   ENABLE_ALL_TESTS=true bun run tests/matrix-test-runner.ts --parallel
   ```

4. **Performance Testing**: Isolate performance tests
   ```bash
   ENABLE_PERFORMANCE=true TEST_TIMEOUT_OVERRIDE=120000 bun run tests/matrix-test-runner.ts
   ```

### **CI/CD Integration**

```yaml
# GitHub Actions example
- name: Run Critical Tests
  run: |
    ENABLE_CRITICAL=true ENABLE_HIGH=false ENABLE_MEDIUM=false ENABLE_LOW=false \
    bun run tests/matrix-test-runner.ts

- name: Run Full Test Suite
  run: |
    ENABLE_ALL_TESTS=true bun run tests/matrix-test-runner.ts --parallel

- name: Run Performance Tests
  run: |
    ENABLE_PERFORMANCE=true ENABLE_CORE=false ENABLE_CONFIG=false \
    TEST_TIMEOUT_OVERRIDE=180000 bun run tests/matrix-test-runner.ts
```

### **Environment Management**

Create `.env.test` files for different scenarios:

```bash
# .env.test-critical
ENABLE_CRITICAL=true
ENABLE_HIGH=false
ENABLE_MEDIUM=false
ENABLE_LOW=false
LOG_LEVEL=error

# .env.test-performance
ENABLE_PERFORMANCE=true
ENABLE_CORE=false
ENABLE_CONFIG=false
ENABLE_SECURITY=false
TEST_TIMEOUT_OVERRIDE=180000
PERFORMANCE_MODE=benchmark

# .env.test-full
ENABLE_ALL_TESTS=true
TEST_PARALLEL_OVERRIDE=true
LOG_LEVEL=info
```

## 🔍 Troubleshooting

### **Common Issues**

1. **Tests Not Running**
   - Check `ENABLE_ALL_TESTS` is not set to `false`
   - Verify category and priority environment variables
   - Check individual test environment variables

2. **Timeout Issues**
   - Use `TEST_TIMEOUT_OVERRIDE` to increase timeouts
   - Check if tests are running in parallel when they shouldn't
   - Verify system resources are sufficient

3. **Dependency Issues**
   - Check dependency graph in matrix configuration
   - Ensure required tests are enabled
   - Use `--dry-run` to see execution order

4. **Environment Variable Conflicts**
   - Check for conflicting environment variables
   - Verify variable names match matrix configuration
   - Use `env | grep ENABLE_` to debug

### **Debug Commands**

```bash
# Show execution plan without running
bun run tests/matrix-test-runner.ts --dry-run

# Run with verbose output
LOG_LEVEL=debug bun run tests/matrix-test-runner.ts

# Show current environment
env | grep -E "(ENABLE_|TEST_)" | sort

# Check matrix configuration
node -e "console.log(JSON.stringify(require('./test-matrix.config.ts').TEST_MATRIX, null, 2))"
```

## 🚀 Future Enhancements

### **Planned Features**

- [ ] **Dynamic Test Discovery**: Automatically discover and categorize tests
- [ ] **Smart Caching**: Cache test results for unchanged code
- [ ] **Resource Monitoring**: Track CPU/memory usage during tests
- [ ] **Test Impact Analysis**: Run only tests affected by code changes
- [ ] **Visual Dashboard**: Web interface for test matrix management

### **Integration Opportunities**

- **IDE Integration**: VS Code extension for matrix control
- **Git Hooks**: Pre-commit matrix validation
- **Slack Integration**: Test result notifications
- **Metrics Collection**: Track test performance over time

---

## 📞 Support

For questions or issues with the matrix testing system:

1. Check this guide for common solutions
2. Review the matrix configuration in `tests/test-matrix.config.ts`
3. Use the `--help` flag for CLI options
4. Check the generated reports in `reports/test-matrix-report.json`

---

**Last Updated**: 2026-01-14  
**Version**: 1.0.0  
**Framework**: Bun Test Matrix System

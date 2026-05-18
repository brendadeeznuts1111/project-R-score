# Matrix Testing System - Quick Reference

## 🚀 Quick Start

```bash
# Run all critical tests
bun run matrix:critical

# Run with extended timeout
bun run matrix:timeout

# Stress test with rerun
bun run matrix:stress

# Show help
bun run matrix:help
```

## 📊 Test Categories

| Category | Script | Description |
|----------|--------|-------------|
| **Critical** | `matrix:critical` | System-breaking tests |
| **Core** | `matrix:core` | Core functionality |
| **Config** | `matrix:config` | Configuration management |
| **Security** | `matrix:security` | Security features |
| **Performance** | `matrix:performance` | Performance tests |
| **Integration** | `matrix:integration` | Cross-component tests |
| **E2E** | `matrix:e2e` | End-to-end workflows |

## ⚡ Execution Controls

| Control | Environment Variable | Default | Quick Script |
|---------|---------------------|---------|--------------|
| **Timeout** | `BUN_TEST_TIMEOUT=10000` | 5000ms | `matrix:timeout` |
| **Rerun** | `BUN_TEST_RERUN_EACH=3` | 1 | `matrix:rerun` |
| **Concurrent** | `BUN_TEST_CONCURRENT=true` | false | `matrix:concurrent` |
| **Randomize** | `BUN_TEST_RANDOMIZE=true` | false | `matrix:random` |
| **Bail** | `BUN_TEST_BAIL=2` | 1 | `matrix:bail` |
| **Max Concurrency** | `BUN_TEST_MAX_CONCURRENCY=8` | 20 | `matrix:max-concurrency` |

## 🎛️ Environment Controls

### **Global Controls**
```bash
ENABLE_ALL_TESTS=true          # Enable all tests
ENABLE_ALL_TESTS=false         # Disable all tests
TEST_TIMEOUT_OVERRIDE=15000    # Override all timeouts
TEST_PARALLEL_OVERRIDE=true    # Force parallel execution
```

### **Category Controls**
```bash
ENABLE_CORE=true               # Core functionality tests
ENABLE_CONFIG=false            # Disable configuration tests
ENABLE_SECURITY=true           # Security tests
ENABLE_PERFORMANCE=false       # Performance tests
ENABLE_INTEGRATION=true        # Integration tests
ENABLE_E2E=false               # E2E tests
```

### **Priority Controls**
```bash
ENABLE_CRITICAL=true           # Critical priority tests
ENABLE_HIGH=false              # Disable high priority
ENABLE_MEDIUM=true             # Medium priority tests
ENABLE_LOW=false               # Disable low priority tests
```

## 🔧 Common Usage Patterns

### **Fast Feedback Development**
```bash
# Critical tests only (fastest)
bun run matrix:critical

# Extended timeout for slow tests
BUN_TEST_TIMEOUT=10000 bun run matrix:critical
```

### **Comprehensive Testing**
```bash
# All tests with reliability features
bun run matrix:reliable

# Stress test for performance validation
bun run matrix:stress
```

### **CI/CD Pipeline**
```bash
# Fast fail on first issue
BUN_TEST_BAIL=1 bun run matrix:critical

# Full suite with parallel execution
bun run matrix:parallel
```

### **Debugging & Analysis**
```bash
# Randomized execution to find dependencies
bun run matrix:random

# High verbosity with extended timeout
BUN_TEST_TIMEOUT=15000 bun run matrix
```

## 📋 Matrix Table Structure

| Test Key | Category | Priority | Dependencies | Environment |
|----------|----------|----------|--------------|-------------|
| `core-user-agent` | Core Functionality | Critical | None | `TEST_MODE=user-agent` |
| `core-proxy-management` | Core Functionality | Critical | None | `TEST_MODE=proxy-management` |
| `core-rate-limiting` | Core Functionality | Critical | core-user-agent | `TEST_MODE=rate-limiting` |
| `security-secrets` | Security | Critical | config-manager | `TEST_MODE=security` |
| `performance-load` | Performance | Medium | core-integration | `PERFORMANCE_MODE=load` |

## 🚨 Troubleshooting

### **Common Issues**
```bash
# Tests timing out
BUN_TEST_TIMEOUT=15000 bun run matrix

# Too many concurrent failures
BUN_TEST_MAX_CONCURRENCY=4 bun run matrix

# Flaky tests
BUN_TEST_RERUN_EACH=3 bun run matrix

# Test order dependencies
BUN_TEST_RANDOMIZE=true bun run matrix
```

### **Debug Commands**
```bash
# Show execution plan
bun run matrix:dry-run

# Verbose output
LOG_LEVEL=debug bun run matrix

# Show current configuration
env | grep -E "(ENABLE_|BUN_TEST_)" | sort
```

## 📊 Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| **🟢 Passed** | Test succeeded | Continue |
| **🔴 Failed** | Test failed | Investigate |
| **🟡 Running** | Test in progress | Wait |
| **⚪ Skipped** | Test disabled | Check config |
| **📊 Progress** | Real-time updates | Monitor |

## 📄 Reports

### **Console Output**
- Real-time progress bar
- Detailed results table
- Execution summary

### **JSON Report**
```bash
# Location: reports/test-matrix-report.json
# Contains: Full execution details, timing, environment
```

### **Key Report Fields**
```json
{
  "timestamp": "2026-01-14T10:00:00.000Z",
  "summary": { "total": 13, "passed": 12, "failed": 1 },
  "detailedResults": [...],
  "executionControl": { "timeout": 5000, "concurrent": false }
}
```

## 🎯 Best Practices

### **Development Workflow**
1. **Local Development**: Use `matrix:critical` for fast feedback
2. **Feature Testing**: Use category-specific scripts
3. **Before Commit**: Use `matrix:reliable` for thorough testing
4. **Performance Testing**: Use `matrix:performance` with extended timeout

### **CI/CD Integration**
1. **Fast Pipeline**: `matrix:critical` with bail
2. **Full Pipeline**: `matrix:parallel` with coverage
3. **Performance Pipeline**: `matrix:performance` with benchmarks

### **Environment Management**
- Use `.env.test` files for different scenarios
- Override specific controls as needed
- Document custom configurations for team

---

**Need more help?** Run `bun run matrix:help` for detailed CLI options.

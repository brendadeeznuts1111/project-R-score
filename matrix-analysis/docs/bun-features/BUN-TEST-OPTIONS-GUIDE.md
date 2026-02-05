# Bun Test Options Complete Guide

## Overview
Bun's test runner provides powerful options for timeout control, code coverage, and performance testing. This guide covers all essential test options with examples.

## Timeout Options

### Basic Timeout Configuration
```bash
bun test --timeout <milliseconds>      # Set timeout in ms
bun test --timeout-secs <seconds>      # Set timeout in seconds
```

### Examples
```bash
bun test --timeout 1000               # 1 second timeout
bun test --timeout-secs 30            # 30 second timeout
bun test --timeout 0                  # Disable timeout completely
```

### Per-Test Timeout Override
```typescript
import { test } from "bun:test";

test("slow operation", async () => {
  // Test-specific timeout
  await longRunningOperation();
}, { timeout: 10000 }); // 10 seconds for this test only
```

**Note**: Timeout options glow yellow in the help text for easy visibility.

## Coverage Options

### Enable Coverage
```bash
bun test --coverage
```

### Coverage Reporters
```bash
bun test --coverage --coverage-reporter <type>
```

Available reporters:
- `text` - Console output (default)
- `html` - HTML report in `coverage/` folder
- `lcov` - LCOV format for CI integration
- `json` - JSON output

### Coverage Examples
```bash
# Basic coverage report
bun test --coverage

# HTML coverage report
bun test --coverage --coverage-reporter html

# Multiple reporters
bun test --coverage --coverage-reporter text --coverage-reporter html

# LCOV for CI/CD
bun test --coverage --coverage-reporter lcov > coverage.lcov
```

### Coverage Thresholds
```bash
bun test --coverage --coverage-threshold 80
```

### Coverage Configuration (test.config.json)
```json
{
  "test": {
    "coverage": {
      "reporter": ["text", "html"],
      "threshold": {
        "global": {
          "branches": 80,
          "functions": 80,
          "lines": 80,
          "statements": 80
        }
      }
    }
  }
}
```

## Version-Locked Options (Bun 1.3)

### Test Execution Control
```bash
bun test --rerun-each <n>        # Rerun each test N times
bun test --bail                  # Stop on first failure
bun test --only                  # Run only tests with .only
bun test --skip                  # Skip tests with .skip
bun test --todo                  # Run tests with .todo
```

### Performance Options
```bash
bun test --preload <module>      # Preload modules before tests
bun test --run-in-band          # Run tests serially (not parallel)
bun test --watch                # Watch mode for auto-rerun
```

### Version-Specific Examples
```bash
# Rerun flaky tests 3 times
bun test --rerun-each 3

# Fast feedback - stop on first failure
bun test --bail

# Run specific test only
bun test --only

# Run in serial for debugging
bun test --run-in-band

# Watch for changes during development
bun test --watch
```

## Test Filtering and Selection

### File Pattern Matching
```bash
bun test "/*.test.ts          # All test files
bun test "**/*.spec.ts        # All spec files
bun test "unit/**/*           # All tests in unit folder
```

### Test Name Filtering
```bash
bun test -t "test name"       # Run tests matching name
bun test --grep "pattern"     # Regex pattern matching
```

## Configuration Options

### test.config.json
```json
{
  "test": {
    "timeout": 5000,
    "preload": ["./test/setup.ts"],
    "coverage": {
      "enabled": true,
      "reporter": "text"
    },
    "runInBand": false
  }
}
```

### Environment Variables
```bash
BUN_TEST_TIMEOUT=5000 bun test
BUN_TEST_REPORTER=verbose bun test
```

## Advanced Options

### Parallel Execution
```bash
bun test --concurrency <n>     # Number of parallel workers
bun test --run-in-band        # Disable parallel execution
```

### Output Control
```bash
bun test --verbose            # Detailed output
bun test --silent             # Minimal output
bun test --reporter <type>    # Test reporter (default, verbose, tap)
```

### Debug Options
```bash
bun test --debug              # Enable debugging
bun test --inspect            # Open Node inspector
```

## Practical Examples

### 1. Development Workflow
```bash
# Watch mode with coverage
bun test --watch --coverage

# Fast feedback on changes
bun test --bail --watch
```

### 2. CI/CD Pipeline
```bash
# Full test suite with coverage
bun test --coverage --coverage-reporter lcov > coverage.lcov

# Stop on failure for CI
bun test --bail --coverage-threshold 80
```

### 3. Performance Testing
```bash
# Run tests multiple times for consistency
bun test --rerun-each 5 --coverage

# Serial execution for accurate timing
bun test --run-in-band --preload ./test/bench.ts
```

### 4. Debugging Flaky Tests
```bash
# Run single test with verbose output
bun test --only --verbose

# Rerun to check consistency
bun test --rerun-each 10 --only
```

## Test Code Examples

### Basic Test with Options
```typescript
import { test, expect, describe } from "bun:test";

describe("feature tests", () => {
  test.only("exclusive test", () => {
    // Only this test will run
    expect(true).toBe(true);
  });

  test.skip("skipped test", () => {
    // This test will be skipped
  });

  test.todo("not implemented", () => {
    // Marked as TODO
  });

  test("with timeout", async () => {
    await asyncOperation();
    expect(result).toBeDefined();
  }, { timeout: 10000 });
});
```

### Coverage Example
```typescript
// functions.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// functions.test.ts
import { test, expect } from "bun:test";
import { add, divide } from "./functions";

test("add function", () => {
  expect(add(2, 3)).toBe(5);
});

// Note: divide function not tested - will show in coverage
```

## Best Practices

### 1. Timeout Management
- Set reasonable timeouts based on test complexity
- Use per-test timeouts for slow operations
- Disable timeout (0) only for integration tests

### 2. Coverage Strategy
- Aim for 80%+ coverage threshold
- Use HTML reports for detailed analysis
- Exclude non-essential files from coverage

### 3. Performance Testing
- Use `--run-in-band` for accurate timing
- Rerun tests multiple times for consistency
- Preload heavy modules with `--preload`

### 4. CI/CD Integration
- Always use `--bail` in CI for fast feedback
- Generate LCOV reports for coverage services
- Set coverage thresholds to enforce quality

## Quick Reference

| Option | Description | Example |
|--------|-------------|---------|
| `--timeout` | Set test timeout | `--timeout 5000` |
| `--coverage` | Enable coverage | `--coverage` |
| `--rerun-each` | Rerun tests N times | `--rerun-each 3` |
| `--bail` | Stop on first failure | `--bail` |
| `--only` | Run only .only tests | `--only` |
| `--watch` | Watch for changes | `--watch` |
| `--preload` | Preload modules | `--preload ./setup.ts` |

## Tips and Tricks

1. **Highlight Options**: Timeout options glow yellow in help text for easy spotting
2. **Version Check**: Use `rg -f .options.index "1.3"` to find version-locked options
3. **Quick Coverage**: `bun test --coverage | tail -n 20` for quick coverage stats
4. **Debug Mode**: `BUN_DEBUG=1 bun test` for verbose debugging
5. **Config Override**: CLI options override test.config.json settings

This guide covers all essential Bun test options for effective testing workflows.

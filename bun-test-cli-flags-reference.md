# 🚀 Bun Test CLI Flags Complete Reference v2.8

## 📋 Available CLI Flags

### 🏃‍♂️ Execution Control

#### `--run`
Run tests (default behavior). Explicitly specifies test execution mode.

```bash
bun test --run
bun test --run src/**/*.test.ts
```

**Use Cases:**
- Explicit test execution in scripts
- Override configuration that might set other modes
- Clear intention in CI/CD pipelines

#### `--bail` | `-b`
Stop test execution on first failure.

```bash
bun test --bail
bun test -b src/**/*.test.ts
```

**Use Cases:**
- CI/CD pipelines for faster feedback
- Large test suites where first failure needs immediate attention
- Debugging specific test failures

#### `--timeout <ms>`
Set custom timeout for all tests.

```bash
bun test --timeout 5000
bun test --timeout 10000 slow-tests.test.ts
```

**Use Cases:**
- Tests that require more time than default
- Network-dependent tests with variable latency
- Performance testing with extended execution time

---

### 📊 Coverage and Reporting

#### `--coverage`
Generate code coverage report.

```bash
bun test --coverage
bun test --coverage --coverage-reporter html
```

**Output:**
- Console coverage summary
- `coverage/` directory with detailed reports
- HTML, JSON, and text report formats

**Use Cases:**
- Code quality assessment
- Test coverage requirements
- Identifying untested code paths

#### `--coverage-reporter <type>`
Specify coverage report format.

```bash
bun test --coverage --coverage-reporter html
bun test --coverage --coverage-reporter json
bun test --coverage --coverage-reporter text
```

**Available Reporters:**
- `text` (default) - Console output
- `json` - Machine-readable JSON
- `html` - Interactive HTML report
- `lcov` - LCOV format for external tools

#### `--coverage-dir <path>`
Specify output directory for coverage reports.

```bash
bun test --coverage --coverage-dir ./reports/coverage
```

---

### 🔍 Filtering and Selection

#### `--test-name-pattern <regex>`
Run tests matching the specified pattern.

```bash
bun test --test-name-pattern "integration"
bun test --test-name-pattern ".*API.*"
bun test --test-name-pattern "^should.*"
```

**Use Cases:**
- Running specific test categories
- Debugging related test groups
- Running smoke tests before full suite

#### `--test-ignore-pattern <regex>`
Ignore tests matching the specified pattern.

```bash
bun test --test-ignore-pattern "slow"
bun test --test-ignore-pattern ".*integration.*"
bun test --test-ignore-pattern "^skip.*"
```

**Use Cases:**
- Excluding slow tests in CI
- Skipping integration tests in unit test runs
- Ignoring deprecated tests

#### `--test-path-pattern <regex>`
Run tests from files matching the pattern.

```bash
bun test --test-path-pattern ".*unit.*"
bun test --test-path-pattern "src/.*\\.test\\.ts"
```

---

### ⚙️ Configuration

#### `--config <path>`
Use custom configuration file.

```bash
bun test --config ./custom-test.config.ts
bun test --config bun-test.config.js
```

**Configuration File Format:**
```typescript
// bun-test.config.ts
export default {
  testMatch: ['**/*.test.ts'],
  testIgnore: ['**/node_modules/**'],
  coverage: {
    reporter: ['text', 'html'],
    exclude: ['**/*.test.ts']
  }
};
```

#### `--preload <module>`
Preload modules before running tests.

```bash
bun test --preload ./test-setup.ts
bun test --preload ./polyfills.ts
```

**Use Cases:**
- Global test setup and configuration
- Polyfills for testing environment
- Mock implementations

---

### 📝 Output and Verbosity

#### `--verbose` | `-v`
Enable verbose output with detailed information.

```bash
bun test --verbose
bun test -v src/**/*.test.ts
```

**Output Includes:**
- Individual test start/end times
- Detailed assertion results
- Stack traces with context
- Test file discovery information

#### `--quiet`
Suppress non-error output.

```bash
bun test --quiet
```

**Use Cases:**
- CI/CD pipelines with minimal output
- Scripts where only errors matter
- Automated test execution

#### `--reporter <type>`
Specify test reporter format.

```bash
bun test --reporter verbose
bun test --reporter dot
bun test --reporter spec
```

**Available Reporters:**
- `spec` (default) - Hierarchical test output
- `verbose` - Detailed test information
- `dot` - Minimal dot progress indicator
- `json` - Machine-readable JSON output

---

### 🔄 Development Mode

#### `--watch` | `-w`
Enable watch mode for continuous testing.

```bash
bun test --watch
bun test -w src/**/*.test.ts
```

**Features:**
- Automatic test re-run on file changes
- Intelligent file change detection
- Interactive test selection
- Live test status updates

**Watch Mode Commands:**
- `Enter` - Re-run all tests
- `a` - Run all tests
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern
- `q` - Quit watch mode

#### `--changed`
Run only tests affected by changed files.

```bash
bun test --changed
bun test --changed --since main
```

**Use Cases:**
- Pre-commit testing
- Pull request validation
- Incremental testing in large projects

---

### 🚀 Performance

#### `--smol`
Reduce memory footprint for test execution.

```bash
bun test --smol
```

**Use Cases:**
- Memory-constrained environments
- CI/CD runners with limited resources
- Large test suites with memory pressure

#### `--concurrency <number>`
Set number of concurrent test workers.

```bash
bun test --concurrency 4
bun test --concurrency 1  # Sequential execution
```

**Use Cases:**
- Controlling parallel test execution
- Resource-limited environments
- Tests that require exclusive access

---

### 🎯 Advanced Usage

#### Multiple Flags Combination

```bash
# CI/CD optimized
bun test --bail --coverage --verbose

# Development workflow
bun test --watch --coverage --reporter verbose

# Performance testing
bun test --timeout 30000 --concurrency 1 --test-name-pattern "performance"

# Coverage analysis
bun test --coverage --coverage-reporter html --coverage-dir ./reports
```

#### Environment Variables

```bash
# Set test environment
NODE_ENV=test bun test

# Enable coverage
COVERAGE=true bun test

# Custom timeout
TEST_TIMEOUT=10000 bun test
```

#### Configuration File Integration

```typescript
// bun-test.config.ts
export default {
  // Test discovery
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**'
  ],
  
  // Execution options
  bail: process.env.CI === 'true',
  timeout: 5000,
  concurrency: 4,
  
  // Coverage configuration
  coverage: {
    reporter: ['text', 'html', 'json'],
    exclude: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/config/**'
    ],
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  
  // Setup files
  setupFiles: ['./test-setup.ts'],
  
  // Reporters
  reporter: process.env.CI ? 'verbose' : 'spec'
};
```

---

## 🔄 Integration Examples

### CI/CD Pipeline

```yaml
# GitHub Actions
- name: Run Tests
  run: |
    bun test --bail --coverage --verbose
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Development Script

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:ci": "bun test --bail --coverage --verbose",
    "test:unit": "bun test --test-name-pattern \"unit\"",
    "test:integration": "bun test --test-name-pattern \"integration\"",
    "test:slow": "bun test --timeout 30000 --test-name-pattern \"slow\""
  }
}
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run only tests affected by changed files
bun test --changed --bail

# Run coverage if it passes
if [ $? -eq 0 ]; then
  bun test --coverage --quiet
fi
```

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Use `--bail` in CI** for faster feedback
2. **Enable `--smol`** for memory-constrained environments
3. **Adjust `--concurrency`** based on available resources
4. **Filter tests** with patterns to reduce execution time
5. **Use `--changed`** for incremental testing

### Memory Management

```bash
# Memory-efficient testing
bun test --smol --concurrency 2

# Large test suite optimization
bun test --bail --timeout 10000
```

---

## 🎯 Best Practices

### Development Workflow

1. **Local Development**: Use `--watch --coverage`
2. **Before Commit**: Use `--changed --bail`
3. **CI/CD**: Use `--bail --coverage --verbose`
4. **Release**: Use full suite with coverage thresholds

### Configuration Management

1. **Use config files** for complex setups
2. **Environment-specific** configurations
3. **Consistent flags** across environments
4. **Documentation** of custom configurations

### Performance Optimization

1. **Parallel execution** with appropriate concurrency
2. **Test filtering** for targeted testing
3. **Memory optimization** with `--smol`
4. **Timeout management** for different test types

---

*Generated by Bun Test CLI Flags Reference v2.8*

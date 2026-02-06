# Tests - Duo Automation System

This directory contains the comprehensive test suite for the Duo Automation system, built with Bun's native testing framework. The test suite covers core functionality, integration scenarios, performance benchmarks, and edge cases.

## 🧪 Test Suite Overview

### **Framework & Tools**
- **Testing Framework**: Bun Test (native, high-performance)
- **Type Safety**: Full TypeScript support
- **Custom Matchers**: Domain-specific assertions
- **Mocking**: Built-in mock functions and spies
- **Coverage**: Built-in coverage reporting
- **Concurrency**: Parallel test execution support
- **🆕 Matrix Control**: Enhanced execution control with environment variables

### **🆕 Matrix Testing System**

The enhanced matrix testing system provides granular control over test execution:

#### **🎛️ Environment Variable Control**
```bash
# Global controls
ENABLE_ALL_TESTS=true              # Enable/disable all tests
TEST_TIMEOUT_OVERRIDE=10000        # Override test timeouts
TEST_PARALLEL_OVERRIDE=true        # Force parallel execution

# Category controls
ENABLE_CORE=true                   # Core functionality tests
ENABLE_CONFIG=false                # Disable configuration tests
ENABLE_SECURITY=true               # Security tests
ENABLE_PERFORMANCE=false           # Performance tests
ENABLE_INTEGRATION=true            # Integration tests
ENABLE_E2E=false                   # E2E tests

# Priority controls
ENABLE_CRITICAL=true               # Critical priority tests
ENABLE_HIGH=false                  # Disable high priority
ENABLE_MEDIUM=true                 # Medium priority tests
ENABLE_LOW=false                   # Disable low priority tests
```

#### **🚀 Matrix Scripts**
```bash
# Matrix execution scripts
bun run matrix                     # Run all enabled tests
bun run matrix:critical           # Critical tests only (fast feedback)
bun run matrix:core               # Core functionality tests
bun run matrix:config             # Configuration tests
bun run matrix:security           # Security tests
bun run matrix:performance        # Performance tests
bun run matrix:integration        # Integration tests
bun run matrix:e2e                # End-to-end tests
bun run matrix:parallel           # All tests in parallel
bun run matrix:sequential         # All tests sequentially
bun run matrix:dry-run            # Show execution plan
bun run matrix:help               # Show help
```

#### **📊 Test Matrix Table**

| Category | Priority | Tests | Environment Control |
|----------|----------|--------|-------------------|
| **Core Functionality** | Critical | User agents, proxy management, rate limiting | `ENABLE_CORE` |
| **Configuration** | High | Config management, environment handling | `ENABLE_CONFIG` |
| **Security** | Critical | Secrets management, authentication | `ENABLE_SECURITY` |
| **Performance** | Medium/Low | Load testing, memory benchmarks | `ENABLE_PERFORMANCE` |
| **Integration** | High/Medium | Cross-component integration | `ENABLE_INTEGRATION` |
| **E2E** | High | End-to-end workflows | `ENABLE_E2E` |

#### **📖 Full Documentation**
See `tests/MATRIX_TESTING_GUIDE.md` for comprehensive matrix system documentation.

### **Test Categories**

#### **🎯 Core Functionality Tests**
- **BunAntiDetection System** (`bun-anti-detection.test.ts`)
  - User agent generation and validation
  - Proxy management and health tracking
  - Rate limiting with token bucket algorithm
  - Input validation and error handling
  - Memory management and cleanup

#### **⚙️ Configuration Management**
- **Config Manager** (`config-manager.test.ts`, `config-manager-fixed.test.ts`)
  - Environment variable handling
  - Service configuration validation
  - Database connection setup
  - Security configuration verification
  - Port configuration system

#### **🌍 Environment & Scoping**
- **Environment Tests** (`environment.test.ts`, `environment-fixed.test.ts`)
  - Multi-environment support
  - Environment-specific configurations
  - Deployment configurations
- **Scoping System** (`scoping-integration.test.ts`, `scoping-system.test.ts`)
  - Scope-based access control
  - Team and project isolation
  - Platform scope adaptation
  - Dashboard launch configurations

#### **🔒 Security & Secrets**
- **Secrets Management** (`secrets-health-export.test.ts`, `secrets-scoping.test.ts`)
  - Enterprise secrets manager
  - Secure storage validation
  - Health check systems
  - Scoped secret access

#### **📊 Performance & Integration**
- **Performance Tests** (`performance/` directory)
  - Load testing scenarios
  - Memory usage benchmarks
  - Response time validation
- **Integration Tests** (`integration/` directory)
  - End-to-end workflows
  - API integration testing
  - Cross-component validation

#### **🏗️ Platform & Architecture**
- **Platform Capabilities** (`platform-capabilities.test.ts`)
  - Cross-platform compatibility
  - Native feature detection
  - System integration validation
- **Taxonomy System** (`taxonomy-validator.test.ts`)
  - Component taxonomy validation
  - Domain and type filtering
  - Cross-reference verification

## 🚀 Running Tests

### **Basic Commands**

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/bun-anti-detection.test.ts

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch

# Run with concurrent execution
bun test --concurrent

# Run with specific concurrency
bun test --concurrent --max-concurrency 4
```

### **Advanced Options**

```bash
# Randomize test order (detects order dependencies)
bun test --randomize

# Reproduce random order with seed
bun test --seed 12345

# Bail out after N failures
bun test --bail=1

# Update snapshots
bun test --update-snapshots

# AI-friendly quiet output
CLAUDECODE=1 bun test
AGENT=1 bun test
```

### **Targeted Testing**

```bash
# Configuration tests only
bun test tests/config*.test.ts

# Integration tests only
bun test tests/integration/

# Performance tests only
bun test tests/performance/

# Using package.json scripts
bun run test:config-manager
bun run test:integration
bun run test:coverage
```

## 📁 Directory Structure

```text
tests/
├── README.md                    # This documentation
├── setup.ts                     # Global test setup and utilities
├── package.json                 # Test-specific scripts and dependencies
│
├── Core Tests/
│   ├── bun-anti-detection.test.ts    # Anti-detection system tests
│   ├── config-manager.test.ts        # Configuration management
│   ├── environment.test.ts           # Environment handling
│   └── integration.test.ts           # Integration scenarios
│
├── Specialized Tests/
│   ├── scoping-integration.test.ts   # Scoping system tests
│   ├── secrets-*.test.ts             # Security and secrets
│   ├── platform-capabilities.test.ts # Platform features
│   └── taxonomy-validator.test.ts    # Component taxonomy
│
├── Subdirectories/
│   ├── e2e/                    # End-to-end tests
│   ├── email/                  # Email system tests
│   ├── integration/            # Integration test suites
│   ├── performance/            # Performance benchmarks
│   ├── storage/                # Storage system tests
│   ├── unit/                   # Unit test collections
│   └── query/                  # Query system tests
│
└── Utilities/
    ├── test-cross-platform-integration.js
    └── verify-enhanced-system.ts
```

## 🔧 Test Configuration

### **Environment Setup**
Tests use isolated environments with controlled variables:

```typescript
// From setup.ts - Global test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  parallel: false
};

// Test environment variables
process.env.NODE_ENV = 'test';
process.env.R2_BUCKET = 'test-bucket';
process.env.GRAFANA_URL = 'http://localhost:3000';
```

### **Custom Matchers**
Domain-specific matchers for better test readability:

```typescript
// Anti-detection matchers
expect(userAgent).toBeValidUserAgent();
expect(agentId).toBeValidAgentId();
expect(proxyUrl).toBeValidProxyUrl();

// Configuration matchers
expect(config).toBeValidConfiguration();
expect(env).toBeProductionReady();
```

### **Global Test Helpers**
Available in all test files via `global.testHelpers`:

```typescript
// File operations
await testHelpers.createTestFile(path, content);
const content = await testHelpers.readTestFile(path);
await testHelpers.removeTestFile(path);

// Utilities
await testHelpers.wait(1000);
const data = testHelpers.generateTestData();
```

## 📊 Test Results & Coverage

### **Current Status**
- **Total Tests**: 100+ tests across multiple categories
- **Core Functionality**: ✅ 13/13 passing (BunAntiDetection)
- **Configuration**: ⚠️ ~90% passing (environment dependencies)
- **Integration**: ✅ 10/10 passing (Scoping system)
- **Performance**: ✅ All benchmarks passing

### **Coverage Targets**
- **Overall Coverage**: 80%+ target
- **Core Components**: 90%+ target
- **Integration Coverage**: 70%+ target
- **Critical Paths**: 95%+ target

### **Coverage Reports**
```bash
# Generate coverage report
bun test --coverage

# View coverage in browser
open coverage/lcov-report/index.html

# Coverage thresholds in package.json
{
  "scripts": {
    "test:coverage": "bun test --coverage --threshold=80"
  }
}
```

## 🛠️ Development Guidelines

### **Writing New Tests**

1. **File Naming**: Use `.test.ts` suffix for test files
2. **Test Structure**: Follow existing patterns with `describe()` and `test()`
3. **Setup/Teardown**: Use `beforeEach()`/`afterEach()` for isolation
4. **Mocking**: Use Bun's built-in `mock()` and `spyOn()`
5. **Assertions**: Leverage custom matchers when available

```typescript
// Example test structure
describe('Feature Name', () => {
  let detector: BunAntiDetection;
  
  beforeEach(() => {
    detector = new BunAntiDetection({
      maxRequestsPerMinute: 5,
      metricsEnabled: true
    });
  });
  
  afterEach(() => {
    detector.destroy();
  });
  
  test('should handle rate limiting', async () => {
    await detector.delay('test-agent');
    const stats = detector.stats();
    expect(stats.totalRequests).toBe(1);
  });
});
```

### **Best Practices**

1. **Test Isolation**: Each test should be independent
2. **Clear Descriptions**: Use descriptive test names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Error Testing**: Test both success and failure cases
5. **Performance**: Include performance assertions where relevant
6. **Documentation**: Comment complex test scenarios

### **Mock Strategy**

```typescript
// Function mocking
const mockFunction = mock(() => 'mocked result');

// Spying on existing functions
const consoleSpy = spyOn(console, 'log');

// Module mocking
mock.module('external-module', {
  defaultFunction: () => 'mocked'
});
```

## 🔍 Debugging & Troubleshooting

### **Common Issues**

1. **Environment Dependencies**: Tests failing due to missing env vars
   - **Solution**: Check `setup.ts` for required variables
   - **Fix**: Set environment variables or use mocks

2. **Test Order Dependencies**: Tests passing/failing based on execution order
   - **Solution**: Use `--randomize` to detect
   - **Fix**: Ensure proper test isolation and cleanup

3. **Timing Issues**: Tests timing out on slow systems
   - **Solution**: Increase timeout in `TEST_CONFIG`
   - **Fix**: Optimize test performance or use async properly

4. **Missing Modules**: Import errors for test dependencies
   - **Solution**: Verify file paths and exports
   - **Fix**: Update imports or create missing files

### **Debugging Commands**

```bash
# Run with verbose output
bun test --verbose

# Run single test for debugging
bun test -t "specific test name"

# Run with debugging
bun test --inspect

# Check test syntax without running
bun test --dry-run
```

## 📈 CI/CD Integration

### **GitHub Actions Example**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test --concurrent --coverage
      - uses: codecov/codecov-action@v3
```

### **Test Scripts**
```json
{
  "scripts": {
    "test": "bun test",
    "test:ci": "bun test --concurrent --coverage --bail=1",
    "test:watch": "bun test --watch",
    "test:debug": "bun test --verbose",
    "test:random": "bun test --randomize"
  }
}
```

## 🎯 Future Enhancements

### **Planned Improvements**
- [ ] **Visual Testing**: Add screenshot comparison tests
- [ ] **Load Testing**: Enhanced performance scenarios
- [ ] **Contract Testing**: API contract validation
- [ ] **Accessibility Testing**: A11y compliance checks
- [ ] **Security Scanning**: Automated security test integration

### **Tooling Upgrades**
- [ ] **Test Reports**: Enhanced HTML reports
- [ ] **Coverage Visualization**: Interactive coverage maps
- [ ] **Performance Baselines**: Automated performance regression detection
- [ ] **Test Data Management**: Improved test data generation

---

## 📞 Support & Contributing

### **Getting Help**
- Check existing test patterns for guidance
- Review Bun Test documentation: https://bun.sh/docs/test
- Use `bun test --help` for command options

### **Contributing Tests**
1. Follow existing naming conventions
2. Ensure proper test isolation
3. Add documentation for complex scenarios
4. Update this README for new test categories
5. Verify coverage impact

---

**Framework**: Bun Test v1.3.6+  
**TypeScript**: Full strict mode support  
**Coverage Target**: 80%+ overall  
**Environment**: Node.js Test Mode  
**Last Updated**: 2026-01-14

# Running Tests Guide

This guide shows how to run the comprehensive testing infrastructure for the Odds Protocol project.

## 🚀 Quick Start

### Run All Tests
```bash
# Run all standardized tests
bun test:all

# Run all tests including legacy and property tests
bun run test:all
```

### Run Specific Test Categories
```bash
# Unit tests
bun test:unit

# Integration tests  
bun test:integration

# Performance tests
bun test:performance

# End-to-end tests
bun test:e2e

# Contract tests
bun test:contracts

# Property-based tests
bun test:property
```

## 📦 Package-Specific Testing

### WebSocket Server Tests
```bash
# From project root
cd packages/odds-websocket

# Run all WebSocket tests
bun test:all

# Run specific categories
bun test:unit        # Server functionality
bun test:integration # Real client connections
bun test:performance # High-volume scenarios
bun test:e2e         # Complete workflows
```

### Core Package Tests
```bash
# From project root
cd packages/odds-core

# Run core tests
bun test:all

# Specific categories
bun test:unit        # Core calculations
bun test:integration # API workflows
bun test:performance # Benchmarks
```

### Testing Infrastructure Tests
```bash
# From project root
cd packages/testing

# Test factories and utilities
bun test:factories
bun test:contracts
bun test:utils
```

## 🎯 Test Configuration

### Using Custom Configuration
```bash
# Use specific test config
bun test --config tests/config/bun.test.toml

# Use performance-focused config
bun test:performance --config tests/config/bun.performance.toml

# Run with coverage
bun test --coverage --config tests/config/bun.test.toml
```

### Environment Variables
```bash
# Enable test mode
NODE_ENV=test bun test

# Enable verbose logging
TEST_VERBOSE=true bun test

# Enable performance monitoring
TEST_PERFORMANCE=true bun test:performance

# Set test timeout
TEST_TIMEOUT=30000 bun test:e2e
```

## 📊 Performance Testing

### Run Performance Benchmarks
```bash
# Quick performance check
bun test:performance

# Extended performance testing
bun test:performance --timeout 600000

# Memory leak detection
bun test:performance --testNamePattern="memory"

# Stress testing
bun test:performance --testNamePattern="stress"
```

### Performance Monitoring
```bash
# Run with performance metrics
TEST_PERFORMANCE=true bun test:performance

# Generate performance report
bun run scripts/generate-performance-report.ts

# Compare with baseline
bun test:performance --compare-baseline
```

## 🔗 Integration Testing

### WebSocket Integration Tests
```bash
# Test real WebSocket connections
bun test:integration

# Test with external dependencies
TEST_EXTERNAL=true bun test:integration

# Test API integration
bun test:integration --testNamePattern="api"
```

### End-to-End Testing
```bash
# Complete workflow testing
bun test:e2e

# Test with real services
TEST_SERVICES=true bun test:e2e

# Test multi-client scenarios
bun test:e2e --testNamePattern="multi-client"
```

## 🧪 Contract Testing

### WebSocket Contract Tests
```bash
# Test WebSocket message contracts
bun test:contracts --testNamePattern="websocket"

# Test API contracts
bun test:contracts --testNamePattern="api"

# Test all contracts
bun test:contracts
```

### Schema Validation
```bash
# Validate message schemas
bun test:contracts --testNamePattern="schema"

# Test business rule contracts
bun test:contracts --testNamePattern="business-rules"
```

## 🔧 Development Testing

### Watch Mode
```bash
# Watch for changes and re-run tests
bun test:watch

# Watch specific category
bun test:unit --watch

# Watch with coverage
bun test:watch --coverage
```

### Debug Mode
```bash
# Run tests with debugging
bun test --debug

# Debug specific test
bun test --debug --testNamePattern="specific-test"

# Debug with inspector
bun test --inspect
```

### Parallel Testing
```bash
# Run tests in parallel
bun test --concurrent

# Set concurrency level
bun test --concurrent --max-concurrency 8

# Run performance tests in parallel
bun test:performance --concurrent
```

## 📈 Coverage Reporting

### Generate Coverage Reports
```bash
# Generate coverage report
bun test --coverage

# HTML coverage report
bun test --coverage --reporter html

# Coverage with thresholds
bun test --coverage --threshold 80

# Coverage for specific package
cd packages/odds-websocket && bun test --coverage
```

### Coverage Analysis
```bash
# View coverage summary
bun test --coverage --reporter text

# Generate detailed report
bun test --coverage --reporter json

# Compare coverage
bun test --coverage --compare-with-main
```

## 🏗️ CI/CD Testing

### Pre-commit Testing
```bash
# Run pre-commit checks
bun run pre-commit-test

# Run linting and tests
bun run lint && bun test:unit

# Run golden rules validation
bun run validate-golden-rules
```

### Continuous Integration
```bash
# Full CI test suite
bun run test:ci

# Performance regression testing
bun run test:performance-regression

# Contract compliance testing
bun run test:contract-compliance
```

## 🎮 Test Scenarios

### High-Frequency Trading Simulation
```bash
# Run high-frequency trading tests
bun test:performance --testNamePattern="high-frequency"

# Test with realistic load
TEST_LOAD=realistic bun test:performance

# Stress test scenarios
bun test:performance --testNamePattern="stress"
```

### Multi-Client Scenarios
```bash
# Test concurrent clients
bun test:e2e --testNamePattern="concurrent"

# Test client reconnection
bun test:e2e --testNamePattern="reconnection"

# Test client scaling
bun test:performance --testNamePattern="scaling"
```

## 🐛 Debugging Failed Tests

### Isolate Failing Tests
```bash
# Run only failing tests
bun test --testNamePattern="failing-test-name"

# Run with verbose output
bun test --verbose

# Run with specific timeout
bun test --timeout 30000
```

### Test Diagnostics
```bash
# Generate diagnostic report
bun test --diagnostic

# Run with memory profiling
bun test --profile-memory

# Run with performance profiling
bun test --profile-performance
```

## 📝 Test Organization

### Test Structure
```text
packages/
├── odds-core/src/tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── performance/    # Performance tests
│   └── e2e/           # End-to-end tests
├── odds-websocket/src/tests/
│   ├── unit/           # Server unit tests
│   ├── integration/    # WebSocket integration
│   ├── performance/    # Performance benchmarks
│   └── e2e/           # Complete workflows
└── testing/src/
    ├── factories/      # Test data factories
    ├── contracts/      # Contract testing
    └── utils/         # Test utilities
```

### Test Naming Conventions
- Unit tests: `*.test.ts` in `tests/unit/`
- Integration tests: `*-integration.test.ts` in `tests/integration/`
- Performance tests: `*-performance.test.ts` in `tests/performance/`
- E2E tests: `*-e2e.test.ts` in `tests/e2e/`
- Contract tests: `*.contract.test.ts` in `contracts/`

## 🎯 Best Practices

### Running Tests Efficiently
1. **Use specific test categories** - Only run what you need
2. **Leverage watch mode** - For development feedback
3. **Use parallel execution** - For faster test runs
4. **Monitor performance** - Track test execution time

### Test Environment Setup
1. **Consistent environment** - Use `NODE_ENV=test`
2. **Isolated databases** - Use test databases
3. **Mock external services** - Avoid real network calls
4. **Clean resources** - Proper test cleanup

### Performance Testing
1. **Baseline measurements** - Establish performance baselines
2. **Regression detection** - Monitor for performance degradation
3. **Resource monitoring** - Track memory and CPU usage
4. **Realistic scenarios** - Test with production-like data volumes

## 🚨 Troubleshooting

### Common Issues
```bash
# Port conflicts
PORT=0 bun test  # Use random port

# Memory issues
NODE_OPTIONS="--max-old-space-size=4096" bun test:performance

# Timeout issues
bun test --timeout 60000

# Dependency issues
bun install && bun test
```

### Test Failures
```bash
# Run with more verbose output
bun test --verbose

# Run specific failing test
bun test --testNamePattern="specific-test"

# Run with debugging
bun test --debug

# Check test configuration
bun test --config tests/config/bun.test.toml --dry-run
```

This comprehensive testing infrastructure provides multiple levels of testing from unit to end-to-end scenarios, with robust performance monitoring and contract validation. Use the appropriate test category based on your development needs.

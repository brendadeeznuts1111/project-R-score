# 🧪 Odds Protocol Testing Framework

This document describes the comprehensive testing framework for the Odds Protocol, leveraging Bun v1.3's enhanced testing capabilities.

## 📁 Testing Structure

```text
packages/
├── odds-core/src/__tests__/
│   ├── core.test.ts              # Core functionality tests
│   ├── performance.test.ts       # Performance benchmarks
│   ├── integration.test.ts       # Integration tests
│   └── bun-v13-features.test.ts  # Bun v1.3 specific features
├── odds-websocket/src/__tests__/
│   └── server.test.ts            # WebSocket server tests
scripts/
└── test-setup.ts                 # Global test setup and utilities
```

## 🚀 Test Categories

### **1. Core Tests** (`packages/odds-core/src/__tests__/core.test.ts`)
- Mathematical calculations (Kelly fraction, expected value)
- Arbitrage opportunity detection
- Network diagnostics
- Data validation
- Error handling

### **2. Performance Tests** (`packages/odds-core/src/__tests__/performance.test.ts`)
- Hash performance benchmarks
- Memory usage tracking
- ANSI stripping performance
- Data processing throughput
- Concurrent operation performance
- Stress testing

### **3. Integration Tests** (`packages/odds-core/src/__tests__/integration.test.ts`)
- WebSocket integration
- API integration
- End-to-end performance
- Network integration
- Data validation pipeline
- Error recovery

### **4. WebSocket Server Tests** (`packages/odds-websocket/src/__tests__/server.test.ts`)
- Server initialization
- Connection management
- Message handling
- Broadcasting functionality
- Performance and scalability
- Error handling and security

### **5. Bun v1.3 Feature Tests** (`packages/odds-core/src/__tests__/bun-v13-features.test.ts`)
- Async stack traces
- Concurrent testing
- Performance testing
- Process control
- Stream processing
- Mock utilities

## 🎯 Available Test Scripts

### **Core Testing**
```bash
# Run all tests
bun run test

# Test specific packages
bun run test:core          # Core functionality
bun run test:websocket     # WebSocket server
bun run test:performance   # Performance benchmarks
bun run test:integration   # Integration tests
bun run test:bun-features  # Bun v1.3 features
```

### **Advanced Testing**
```bash
# Concurrent execution
bun run test:concurrent

# Performance testing
bun run test:performance

# Debug mode
bun run test:debug

# Verbose output
bun run test:verbose

# Randomized test order
bun run test:random

# Type checking
bun run test:types
```

### **Coverage & CI**
```bash
# Coverage reporting
bun run test:coverage
bun run test:coverage:html

# CI environment
bun run test:ci

# VS Code integration
bun run test:vscode
```

## 🔧 Test Configuration

### **Bun Test Configuration** (`bun.test.toml`)
```toml
[test]
concurrent = true
maxConcurrency = 10
randomize = true
preload = ["./scripts/test/test-setup.ts"]

[coverage]
enabled = true
thresholds = { statements = 80, branches = 75 }

[performance]
enabled = true
thresholds = { "hash-operation" = 10 }
```

### **Global Test Setup** (`scripts/test/test-setup.ts`)
- Mock data generators
- Performance monitoring
- Mock server management
- Environment configuration
- Test utilities

## 🧪 Test Features

### **Concurrent Testing**
```typescript
describe.concurrent("Odds Processing", () => {
  test.concurrent("processes multiple feeds", async () => {
    // Runs concurrently with other tests
  });
});
```

### **Performance Benchmarks**
```typescript
test("hash performance", () => {
  const startTime = performance.now();
  const results = data.map(hash);
  const duration = performance.now() - startTime;
  
  expect(duration).toBeLessThan(100);
  expect(results.length).toBe(10000);
});
```

### **Mock Data Generation**
```typescript
const mockOdds = TestData.createMockOddsTick({
  sport: "basketball",
  odds: { home: -110, away: -110 }
});
```

### **Integration Testing**
```typescript
test.concurrent("API integration", async () => {
  const response = await fetch("http://localhost:3006/api/odds");
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data.odds).toBeDefined();
});
```

## 📊 Performance Benchmarks

### **Hash Performance**
- **Target**: >100,000 ops/sec
- **Dataset**: 10,000 odds entries
- **Acceptable Duration**: <100ms

### **Memory Management**
- **Tracking**: Real-time memory usage
- **Cleanup**: Automatic garbage collection
- **Limits**: Configurable memory thresholds

### **Network Diagnostics**
- **Endpoints**: Multiple test endpoints
- **Timeout**: Configurable per test
- **Metrics**: Response time, success rate

## 🛡️ Error Handling

### **Network Failures**
- Graceful degradation
- Retry mechanisms
- Fallback data sources

### **Invalid Data**
- Schema validation
- Type checking
- Malformed JSON handling

### **Process Failures**
- Timeout handling
- Process recovery
- Resource cleanup

## 🔍 Debugging Features

### **VS Code Integration**
- Test Explorer support
- Inline error messages
- One-click debugging
- Breakpoint support

### **Performance Profiling**
- Operation timing
- Memory usage tracking
- Bottleneck identification
- Performance reports

### **Logging**
- Structured test output
- Performance metrics
- Error details
- Debug information

## 📈 Coverage Requirements

### **Thresholds**
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### **Reporting**
- Text output
- HTML reports
- LCOV format
- JSON data

## 🎨 Best Practices

### **Test Organization**
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Keep tests focused and independent

### **Mock Usage**
- Use consistent mock data
- Clean up mocks after tests
- Test both success and failure scenarios
- Avoid over-mocking

### **Performance Testing**
- Set realistic thresholds
- Test with various data sizes
- Monitor memory usage
- Include concurrent scenarios

### **Integration Testing**
- Test real API endpoints
- Include network failure scenarios
- Validate end-to-end workflows
- Use realistic data volumes

## 🚀 Running Tests

### **Development**
```bash
# Watch mode for development
bun run test:watch

# Debug specific test
bun run test:debug packages/odds-core/src/__tests__/core.test.ts

# Performance profiling
bun run test:performance
```

### **CI/CD**
```bash
# Full test suite with coverage
bun run test:ci

# Type checking
bun run test:types

# Security testing
bun run test:security
```

### **VS Code**
1. Install the Bun extension
2. Use Test Explorer sidebar
3. Run tests with one click
4. Debug directly from editor

## 📝 Test Examples

### **Basic Test**
```typescript
test("calculates Kelly fraction correctly", () => {
  const kelly = calculateKellyFraction(0.05, 2.0);
  expect(kelly).toBeCloseTo(0.025, 3);
});
```

### **Concurrent Test**
```typescript
test.concurrent("processes odds concurrently", async () => {
  const results = await Promise.all(oddsData.map(processOdds));
  expect(results.every(r => r.processed)).toBe(true);
});
```

### **Performance Test**
```typescript
test("hash performance benchmark", () => {
  const { duration, opsPerSecond } = measurePerformance(() => {
    return hash("test data");
  }, { iterations: 10000 });
  
  expect(duration).toBeLessThan(100);
  expect(opsPerSecond).toBeGreaterThan(100000);
});
```

This testing framework provides comprehensive coverage of all Odds Protocol functionality while leveraging Bun v1.3's advanced testing capabilities for optimal performance and developer experience.

# Testing Infrastructure Structure

This document outlines the standardized testing infrastructure for the Odds Protocol project.

## 📁 Directory Structure

```
packages/
├── testing/                          # Centralized testing infrastructure
│   ├── src/
│   │   ├── factories/               # Test data factories
│   │   │   └── index.ts            # All factory classes
│   │   ├── contracts/               # Contract testing
│   │   │   ├── api.contract.test.ts
│   │   │   ├── websocket.contract.test.ts
│   │   │   └── index.ts
│   │   ├── utils/                   # Test utilities
│   │   │   └── test-helpers.ts
│   │   ├── types/                   # Type definitions
│   │   │   └── index.ts
│   │   └── index.ts                 # Main entry point
│   └── package.json
├── odds-core/
│   └── src/
│       └── tests/                   # Standardized test structure
│           ├── unit/                # Unit tests
│           │   └── core-calculations.test.ts
│           ├── integration/         # Integration tests
│           │   └── api-integration.test.ts
│           ├── performance/         # Performance tests
│           │   └── performance-benchmarks.test.ts
│           └── e2e/                 # End-to-end tests
├── odds-websocket/
│   └── src/
│       └── tests/                   # WebSocket-specific tests
└── property-tests/                  # Property-based tests
    ├── arbitrage/
    └── network/
```

## 🏭 Test Data Factories

### Purpose
Centralized, consistent test data generation across all test suites.

### Key Features
- **Realistic Data**: Uses Faker.js for realistic test data
- **Type Safety**: Full TypeScript support with proper typing
- **Customization**: Easy override and extension capabilities
- **Performance**: Optimized for high-volume test data generation

### Available Factories

#### `OddsTickFactory`
```typescript
import { OddsTickFactory } from '@testing/factories';

// Create single odds tick
const oddsTick = OddsTickFactory.create();

// Create with overrides
const customTick = OddsTickFactory.create({
  sport: 'basketball',
  odds: { home: -110, away: -110 }
});

// Create batch
const batch = OddsTickFactory.createBatch(100);

// Create arbitrage scenario
const arbitrageData = OddsTickFactory.createArbitrageOpportunity();
```

#### `ArbitrageOpportunityFactory`
```typescript
import { ArbitrageOpportunityFactory } from '@testing/factories';

// Create profitable opportunity
const opportunity = ArbitrageOpportunityFactory.createProfitable();

// Create with custom profit
const customOpportunity = ArbitrageOpportunityFactory.create({
  profit: 5.0,
  sport: 'football'
});
```

#### `WebSocketMessageFactory`
```typescript
import { WebSocketMessageFactory } from '@testing/factories';

// Create odds update message
const message = WebSocketMessageFactory.createOddsUpdate(oddsTick);

// Create arbitrage alert
const alert = WebSocketMessageFactory.createArbitrageAlert(opportunity);

// Create batch
const messages = WebSocketMessageFactory.createBatch(50);
```

## 📋 Contract Testing

### Purpose
Ensures APIs and WebSocket interfaces conform to expected schemas and business rules.

### Features
- **Schema Validation**: JSON Schema-based validation
- **Business Rule Testing**: Validates mathematical properties and constraints
- **Performance Contracts**: Ensures latency and throughput requirements
- **Error Handling**: Validates error response formats and behaviors

### WebSocket Contract Testing
```typescript
import { WebSocketContractUtils } from '@testing/contracts';

// Validate message schema
const validation = WebSocketContractUtils.validateSchema(message, schema);
expect(validation.valid).toBe(true);

// Create contract test suite
const suite = WebSocketContractUtils.createContractTestSuite(customSchema);
suite.expectValidMessage(testMessage);
suite.expectInvalidMessage(invalidMessage, ['Missing required field']);
```

### API Contract Testing
```typescript
import { APIContractUtils } from '@testing/contracts';

// Validate API response
const response = await apiClient.get('/api/odds');
APIContractUtils.expectValidResponse(response);

// Test error responses
APIContractUtils.expectErrorResponse(errorResponse, 400);
```

## 🛠️ Test Utilities

### Purpose
Common utilities and helpers for test setup, execution, and assertions.

### Key Utilities

#### Domain Assertions
```typescript
import { DomainAssertions } from '@testing/utils';

// Validate odds tick structure
DomainAssertions.assertValidOddsTick(oddsTick);

// Validate American odds format
DomainAssertions.assertValidAmericanOdds(-110);

// Validate arbitrage opportunity
DomainAssertions.assertValidArbitrageOpportunity(opportunity);
```

#### Mock Clients
```typescript
import { MockWebSocket, MockAPIClient } from '@testing/utils';

// Mock WebSocket client
const wsClient = new MockWebSocket('ws://localhost:8080');
wsClient.simulateMessage(testMessage);
expect(wsClient.receivedMessages).toHaveLength(1);

// Mock API client
const apiClient = new MockAPIClient();
apiClient.setResponse('/api/odds', { status: 200, data: [] });
const response = await apiClient.get('/api/odds');
```

#### Performance Testing
```typescript
import { PerformanceHelper, MemoryHelper } from '@testing/utils';

// Measure performance
const perfHelper = new PerformanceHelper();
const endTimer = perfHelper.startTimer('test-operation');
// ... perform operation
const duration = endTimer();
perfHelper.assertPerformance('test-operation', 100); // max 100ms

// Monitor memory
const memHelper = new MemoryHelper();
// ... perform operations
memHelper.assertMemoryIncrease(50); // max 50MB increase
```

## 🧪 Test Categories

### Unit Tests (`tests/unit/`)
- **Purpose**: Test individual functions and components in isolation
- **Characteristics**: Fast, focused, no external dependencies
- **Examples**: Mathematical calculations, data transformations, utility functions

### Integration Tests (`tests/integration/`)
- **Purpose**: Test interaction between multiple components
- **Characteristics**: Real API calls, database interactions, WebSocket communication
- **Examples**: API workflows, WebSocket message flows, data pipeline integration

### Performance Tests (`tests/performance/`)
- **Purpose**: Validate performance requirements and catch regressions
- **Characteristics**: High-volume data, timing measurements, load testing
- **Examples**: Throughput benchmarks, latency tests, memory usage validation

### Contract Tests (`contracts/`)
- **Purpose**: Ensure interface compliance and business rule adherence
- **Characteristics**: Schema validation, error handling, edge case testing
- **Examples**: API response formats, WebSocket message contracts, mathematical properties

### Property Tests (`property-tests/`)
- **Purpose**: Validate mathematical properties and invariants
- **Characteristics**: Randomized data generation, property-based assertions
- **Examples**: Arbitrage calculations, odds transformations, probability computations

## 🚀 Usage Examples

### Basic Test with Factories
```typescript
import { test, expect } from "bun:test";
import { OddsTickFactory, DomainAssertions } from "@testing/factories";

test("processes odds tick correctly", () => {
  const oddsTick = OddsTickFactory.create({
    sport: 'basketball',
    odds: { home: -110, away: -110 }
  });
  
  DomainAssertions.assertValidOddsTick(oddsTick);
  
  const result = processOddsTick(oddsTick);
  expect(result.processed).toBe(true);
});
```

### Integration Test with Mocks
```typescript
import { test, expect, beforeAll, afterAll } from "bun:test";
import { MockAPIClient, MockWebSocket, TestScenarioFactory } from "@testing/utils";

test("complete arbitrage workflow", async () => {
  const apiClient = new MockAPIClient();
  const wsClient = new MockWebSocket('ws://localhost:8080');
  
  const scenario = TestScenarioFactory.createArbitrageScenario();
  
  // Setup mock responses
  apiClient.setResponse('/api/odds', { status: 200, data: scenario.oddsTicks });
  
  // Execute workflow
  const oddsResponse = await apiClient.get('/api/odds');
  const arbitrageResult = calculateArbitrage(oddsResponse.data);
  
  // Broadcast result
  wsClient.simulateMessage({
    type: 'arbitrage-alert',
    data: arbitrageResult
  });
  
  expect(arbitrageResult.profit).toBeGreaterThan(0);
  expect(wsClient.sentMessages).toHaveLength(1);
});
```

### Performance Test
```typescript
import { test, expect } from "bun:test";
import { PerformanceDataFactory, PerformanceHelper } from "@testing/factories";

test("processes high-volume data efficiently", () => {
  const perfHelper = new PerformanceHelper();
  const largeDataset = PerformanceDataFactory.createLargeDataset(50000);
  
  const endTimer = perfHelper.startTimer('high-volume-processing');
  
  const results = largeDataset.map(processOddsTick);
  
  const duration = endTimer();
  
  expect(results).toHaveLength(50000);
  expect(duration).toBeLessThan(200); // Should process in under 200ms
  perfHelper.assertPerformance('high-volume-processing', 200);
});
```

## 🔧 Configuration

### Test Configuration
The testing infrastructure uses `tests/config/bun.test.toml` for centralized configuration:

```toml
[test]
concurrent = true
maxConcurrency = 10
randomize = true

testMatch = [
  "**/tests/**/*.test.ts",
  "**/tests/**/*.spec.ts",
  "packages/testing/src/contracts/**/*.test.ts"
]

concurrentTestGlob = [
  "**/tests/unit/**/*.test.ts",
  "**/tests/integration/**/*.test.ts",
  "**/tests/performance/**/*.test.ts"
]
```

### NPM Scripts
Enhanced test scripts for different test categories:

```json
{
  "test": "bun test --config ./tests/config/bun.test.toml",
  "test:unit": "bun test packages/*/src/tests/unit/ --concurrent",
  "test:integration": "bun test packages/*/src/tests/integration/ --concurrent",
  "test:performance": "bun test packages/*/src/tests/performance/",
  "test:contracts": "bun test packages/testing/src/contracts/ --concurrent",
  "test:structured": "bun test packages/*/src/tests/ --concurrent",
  "test:all": "bun test packages/*/src/tests/ packages/testing/src/contracts/ property-tests/ --concurrent"
}
```

## 📊 Best Practices

### 1. Use Factories for Test Data
- ✅ `OddsTickFactory.create()` 
- ❌ Manual object creation with hardcoded values

### 2. Leverage Domain Assertions
- ✅ `DomainAssertions.assertValidOddsTick(oddsTick)`
- ❌ Manual field-by-field validation

### 3. Organize Tests by Category
- ✅ Unit tests in `tests/unit/`
- ✅ Integration tests in `tests/integration/`
- ✅ Performance tests in `tests/performance/`

### 4. Use Mock Clients for Integration Tests
- ✅ `MockAPIClient` and `MockWebSocket`
- ❌ Real network calls in unit tests

### 5. Include Performance Assertions
- ✅ `perfHelper.assertPerformance('operation', 100)`
- ❌ No performance validation

### 6. Test Contract Compliance
- ✅ Schema validation with contract tests
- ❌ Only happy path testing

## 🎯 Migration Guide

### From Legacy Tests
1. **Move test files** from `__tests__/` to appropriate `tests/` subdirectory
2. **Replace manual test data** with factory-generated data
3. **Add domain assertions** for data validation
4. **Use mock clients** instead of real network calls
5. **Include performance testing** where applicable

### Example Migration
```typescript
// Before (legacy)
test("calculates kelly fraction", () => {
  const edge = 0.05;
  const odds = 2.0;
  const result = calculateKellyFraction(edge, odds);
  expect(result).toBe(0.025);
});

// After (standardized)
test("calculates kelly fraction with factory data", () => {
  const testCases = [
    { edge: 0.05, odds: 2.0, expected: 0.025 },
    { edge: 0.02, odds: 1.5, expected: 0.013 }
  ];
  
  testCases.forEach(({ edge, odds, expected }) => {
    const result = calculateKellyFraction(edge, odds);
    expect(result).toBeCloseTo(expected, 3);
  });
});
```

This standardized testing infrastructure provides a solid foundation for reliable, maintainable, and comprehensive testing across the Odds Protocol project.

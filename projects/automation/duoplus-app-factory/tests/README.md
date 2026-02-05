# 🧪 Test Suite

Comprehensive test suite for Nebula-Flow™ DuoPlus Lightning Network Integration.

## Test Files

### Lightning Integration Tests
**File**: `lightning.integration.test.ts`

Integration tests for Lightning Network functionality.

**Coverage**:
- Invoice generation and validation
- KYC limits and FinCEN rules
- Savings routing logic
- Error handling and fallbacks
- Webhook settlement flow
- Yield calculations
- Channel health monitoring

### DuoPlus Tests
**File**: `test-duoplus.ts`

Unit and integration tests for DuoPlus features.

**Coverage**:
- Device management
- Compliance validation
- Financial calculations
- API endpoints
- Data persistence

## Running Tests

### Run All Tests
```bash
bun test tests/
```

### Run Specific Test File
```bash
bun test tests/lightning.integration.test.ts
```

### Run with Watch Mode
```bash
bun test --watch tests/
```

### Run with Coverage
```bash
bun test --coverage tests/
```

### Run Specific Test
```bash
bun test tests/lightning.integration.test.ts -t "invoice generation"
```

## Test Structure

### Test Organization
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something', () => {
    // Arrange
    // Act
    // Assert
  });

  afterEach(() => {
    // Cleanup
  });
});
```

### Assertions
- `expect(value).toBe(expected)`
- `expect(value).toEqual(expected)`
- `expect(value).toThrow()`
- `expect(value).toMatch(regex)`

## Writing Tests

### Template
```typescript
// tests/my-feature.test.ts
import { describe, test, expect } from 'bun:test';
import { MyFeature } from '../src/features/my-feature';

describe('MyFeature', () => {
  test('should initialize correctly', () => {
    const feature = new MyFeature();
    expect(feature).toBeDefined();
  });

  test('should process data', () => {
    const feature = new MyFeature();
    const result = feature.process({ data: 'test' });
    expect(result).toEqual({ success: true });
  });
});
```

## Test Coverage

### Current Coverage
- Lightning Service: 95%
- Compliance Service: 90%
- Finance Service: 85%
- Atlas Service: 80%
- API Routes: 75%

### Coverage Goals
- Maintain > 80% overall coverage
- 100% coverage for critical paths
- 90%+ for business logic
- 70%+ for utilities

## Mocking

### Mock LND Client
```typescript
import { lndMockClient } from '../src/services/lndMockClient';

test('should handle LND responses', () => {
  const balance = lndMockClient.getBalance();
  expect(balance).toBeDefined();
});
```

### Mock Database
```typescript
// Use in-memory SQLite for tests
const db = new Database(':memory:');
```

## Performance Testing

### Benchmark Tests
```bash
bun test --bench tests/
```

### Performance Targets
- Invoice generation: < 1s
- KYC validation: < 100ms
- Database queries: < 50ms
- API responses: < 200ms

## Continuous Integration

Tests run automatically on:
- Pre-commit (via git hooks)
- Pull requests
- Main branch pushes
- Scheduled daily runs

## Troubleshooting

### Tests Fail
```bash
# Clear cache
rm -rf .bun

# Reinstall dependencies
bun install

# Run with verbose output
bun test --verbose tests/
```

### Flaky Tests
- Check for timing issues
- Verify mock data
- Review async operations
- Check database state

### Performance Issues
- Profile slow tests
- Optimize database queries
- Reduce mock data size
- Parallelize tests

## Best Practices

1. **Descriptive Names** - Clear test descriptions
2. **Arrange-Act-Assert** - Consistent structure
3. **DRY** - Reuse setup and utilities
4. **Isolation** - Tests don't depend on each other
5. **Speed** - Keep tests fast
6. **Coverage** - Aim for high coverage
7. **Maintenance** - Keep tests updated

## Adding Tests

1. Create test file in `tests/`
2. Import test utilities
3. Write descriptive tests
4. Run tests locally
5. Commit with code changes

## Test Utilities

### Common Helpers
```typescript
// tests/helpers.ts
export function createMockInvoice() { ... }
export function createMockDevice() { ... }
export function createMockUser() { ... }
```

---

**Version**: 3.5.0


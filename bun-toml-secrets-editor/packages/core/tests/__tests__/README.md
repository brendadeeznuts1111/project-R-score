# Test Organization

This directory contains organized tests for the bun-toml-secrets-editor project.

## Test Structure

### 📁 Unit Tests (`unit/`)
Tests for individual modules and functions in isolation.
- **logging/**: Logger functionality and configuration
- **security/**: Security utilities and validation
- **utils/**: Helper functions and utilities
- **cli/**: CLI command implementations
- **integration/**: Integration module functions
- **rss/**: RSS fetching and processing

### 🔗 Integration Tests (`integration/`)
Tests for module interactions and workflows.
- **security/**: Security integration scenarios
- **profile-rss/**: Profile-RSS bridge functionality
- **api/**: API endpoint testing
- **cli/**: CLI workflow testing

### ⚡ Edge Cases (`edge-cases/`)
Tests for boundary conditions and unusual scenarios.
- **ssrf/**: SSRF protection edge cases
- **logger/**: Logger concurrency and edge cases
- **concurrency/**: Concurrent access patterns
- **security/**: Security bypass attempts

### 🎯 End-to-End Tests (`e2e/`)
Complete workflow tests from user perspective.
- **workflows/**: Full user workflows
- **scenarios/**: Real-world usage scenarios

### ⚡ Performance Tests (`performance/`)
Benchmarks and performance validation.
- **benchmarks/**: Performance benchmarks
- **load/**: Load testing scenarios

## Running Tests

### By Category
```bash
# Run all unit tests
bun run test:unit

# Run integration tests
bun run test:integration

# Run edge case tests
bun run test:edge

# Run E2E tests
bun run test:e2e

# Run performance tests
bun run test:performance
```

### Organized Execution
```bash
# Run all tests in organized order
bun run test:organized

# Run specific category
bun run src/__tests__/runner.ts unit
```

### Security Tests
```bash
# Run all security-related tests
bun run test:security
```

## Test Configuration

See `test-config.ts` for:
- Timeout settings
- Environment configuration
- Feature flags
- Test helpers

## Writing New Tests

1. Choose the appropriate category (unit, integration, edge, e2e, performance)
2. Create test file in the corresponding directory
3. Use the test configuration and helpers from `test-config.ts`
4. Follow the naming convention: `*.test.ts`

## Test Data

- `fixtures/`: Static test data
- `mocks/`: Mock implementations
- `temp/`: Temporary files for testing

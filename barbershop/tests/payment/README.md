# Payment Routing Tests

All payment routing related tests in one place.

## Test Files

| File | Description |
|------|-------------|
| `payment-smoke.test.ts` | Unit tests for edge cases, validation, rate limiting, errors |
| `payment-api.integration.test.ts` | End-to-end API integration tests |

## Running Tests

```bash
# Run all payment tests
bun test tests/payment

# Run smoke tests only
bun test tests/payment/payment-smoke.test.ts

# Run integration tests only
bun test tests/payment/payment-api.integration.test.ts

# Run with coverage
bun test tests/payment --coverage
```

## Test Categories

### Smoke Tests (40 tests)
- Configuration edge cases
- Validation edge cases
- Rate limiting
- Error handling
- Redis manager
- Route validation
- Fallback plans
- Split validation
- Config validation
- Reorder validation
- Concurrent operations
- Memory/performance

### Integration Tests (32 tests)
- Health endpoints
- Route management (CRUD)
- Fallback plans
- Configuration
- Payment splits
- Error handling
- CORS
- Rate limiting
- Concurrent requests
- Data validation

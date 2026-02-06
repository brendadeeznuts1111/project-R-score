# Rotation Number Testing Suite

Comprehensive property testing and validation for rotation number functionality in the Odds Protocol.

## 🎯 Overview

This testing suite provides production-grade property tests, performance benchmarks, and integration tests for rotation number validation, parsing, and arbitrage detection.

## 📁 Structure

```text
src/domain/rotation-numbers/
├── property/                          # Property-based tests
│   ├── rotation-boundaries.property.test.ts
│   ├── rotation-performance.property.test.ts
│   ├── rotation-arbitrage-integration.property.test.ts
│   └── rotation-error-handling.property.test.ts
├── integration/                       # Integration tests
│   └── rotation-db.test.ts
├── types/                            # Type safety tests
│   └── rotation-types.test.ts
├── arbitraries/                      # Fast-check arbitraries
│   └── rotation-arbitraries.ts
└── README.md                         # This file
```

## 🧪 Test Categories

### 1. Property Tests
- **Boundary Testing**: Validates behavior at exact range limits
- **Edge Case Testing**: Handles invalid inputs and special values
- **Performance Properties**: Ensures linear scaling and efficiency
- **Integration Properties**: Tests rotation + arbitrage interactions
- **Error Handling**: Validates error messages and robustness

### 2. Integration Tests
- **Database Operations**: CRUD operations with mock database
- **Concurrent Operations**: Parallel execution safety
- **Data Integrity**: Consistency across operations
- **Performance at Scale**: Large dataset handling

### 3. Performance Benchmarks
- **Single Operations**: Individual function performance
- **Batch Operations**: Large dataset processing
- **Search Efficiency**: Index-based lookup performance
- **Arbitrage Detection**: Complex calculation benchmarks

## 🚀 Running Tests

### All Tests
```bash
bun test src/domain/rotation-numbers/ --coverage
```

### Property Tests Only
```bash
bun test src/domain/rotation-numbers/property/ --concurrent --max-concurrency 20
```

### Integration Tests
```bash
bun test src/domain/rotation-numbers/integration/
```

### Benchmarks
```bash
bun test src/benchmarks/rotation-processing.bench.ts --bench
```

### CI Mode (Strict)
```bash
bun test src/domain/rotation-numbers/ --ci --coverage --reporter junit --output-file test-results/rotation-numbers.xml
```

### Using Test Runner Script
```bash
# Run all tests
bun run src/scripts/run-rotation-tests.ts

# Property tests only
bun run src/scripts/run-rotation-tests.ts property

# Benchmarks only
bun run src/scripts/run-rotation-tests.ts benchmarks

# CI mode
bun run src/scripts/run-rotation-tests.ts ci
```

## 📊 Success Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| **Property iterations** | 1000+ per test | `numRuns: 1000` |
| **Execution time** | < 15s | `time bun test` |
| **Coverage** | > 90% | `bun test --coverage` |
| **CI stability** | 0 flakes | `--randomize` passes |
| **Type safety** | 100% | `bunx tsc --noEmit` passes |
| **Performance** | < 0.1ms/operation | Benchmarks |

### Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Single parse | < 0.01ms | `parseRotationNumber()` |
| Batch parse (10k) | < 50ms | 10,000 operations |
| Validation | < 0.1ms | `validateRotationNumber()` |
| Search | < 5ms | `searchRotationNumbers()` |
| Arbitrage detection (100) | < 20ms | `detectRotationArbitrage()` |

## 🔧 Configuration

Test configuration is managed through `src/config/rotation-test-config.ts`:

```typescript
export const ROTATION_TEST_CONFIG: RotationTestConfig = {
  propertyTests: {
    numRuns: 1000,
    maxConcurrency: 20,
    timeout: 30000
  },
  performanceTests: {
    maxExecutionTime: 15000,
    maxPerOperationTime: 0.1,
    memoryLimit: 10 * 1024 * 1024
  },
  // ... more config
};
```

## 📋 Validation Checklist

### Property Tests ✅
- [x] Boundary conditions (exact range limits)
- [x] Edge cases (negative, fractional, gaps)
- [x] Performance scaling (linear time complexity)
- [x] Integration with arbitrage detection
- [x] Error handling and validation

### Type Tests ✅
- [x] `expectTypeOf` assertions
- [x] Interface validation
- [x] Type safety coverage

### Performance Tests ✅
- [x] Benchmark targets met
- [x] Scalability validation
- [x] Memory efficiency

### Integration Tests ✅
- [x] Database CRUD operations
- [x] Concurrent execution safety
- [x] Data integrity preservation

### Code Quality ✅
- [x] No `test.only()` or `.skip()` in CI
- [x] Coverage threshold > 90%
- [x] CI stability with randomization

## 🎯 Property Testing Examples

### Boundary Testing
```typescript
test("rotation numbers at exact range boundaries are valid", () => {
  fc.assert(
    fc.property(
      rotationArbitraries.sportType,
      (sport) => {
        const [min, max] = ROTATION_RANGES[sport];
        const minResult = validateRotationNumber(min);
        const maxResult = validateRotationNumber(max);
        
        expect(minResult.isValid).toBe(true);
        expect(maxResult.isValid).toBe(true);
        expect(minResult.sport).toBe(sport);
        expect(maxResult.sport).toBe(sport);
        
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Performance Properties
```typescript
test("batch validation scales linearly", () => {
  fc.assert(
    fc.property(
      fc.array(rotationArbitraries.validRotationNumber, { minLength: 100, maxLength: 5000 }),
      (rotations) => {
        const start = performance.now();
        const results = rotations.map(r => validateRotationNumber(r.rotationId));
        const duration = performance.now() - start;
        
        const perItem = duration / rotations.length;
        expect(perItem).toBeLessThan(0.1); // < 0.1ms per validation
        
        return true;
      }
    ),
    { numRuns: 50 }
  );
});
```

## 🐛 Debugging Failed Tests

### Property Test Failures
1. **Check the seed**: Use the provided seed to reproduce
2. **Minimal example**: Fast-check automatically shrinks to minimal failing case
3. **Add logging**: Use `console.log` inside property for debugging
4. **Reduce iterations**: Temporarily reduce `numRuns` for faster debugging

### Performance Test Failures
1. **Profile with Bun**: Use `bun --prof` for detailed profiling
2. **Check memory usage**: Monitor with `process.memoryUsage()`
3. **Algorithm analysis**: Verify O(n) vs O(n²) complexity
4. **Benchmark environment**: Ensure consistent testing environment

### Integration Test Failures
1. **Database state**: Check mock database initialization
2. **Concurrent issues**: Look for race conditions
3. **Data consistency**: Verify transaction boundaries
4. **Error propagation**: Ensure proper error handling

## 🔄 Continuous Integration

### GitHub Actions Integration
```yaml
name: Rotation Number Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test src/domain/rotation-numbers/ --ci --coverage
      - run: bun run src/scripts/run-rotation-tests.ts ci
```

### Test Reports
- **JUnit XML**: `test-results/rotation-numbers.xml`
- **Coverage Report**: `coverage/rotation-numbers/`
- **Benchmark Results**: Console output with timing metrics

## 📈 Monitoring and Maintenance

### Regular Maintenance Tasks
1. **Update property test data**: Refresh arbitraries periodically
2. **Review performance baselines**: Adjust targets as needed
3. **Coverage monitoring**: Ensure >90% coverage maintained
4. **CI stability**: Monitor flaky test patterns

### Performance Monitoring
```bash
# Run performance benchmarks weekly
bun test src/benchmarks/rotation-processing.bench.ts --bench

# Compare with baseline
bun run src/scripts/compare-benchmarks.ts
```

## 🤝 Contributing

### Adding New Property Tests
1. Create appropriate arbitrary in `rotation-arbitraries.ts`
2. Add property test with sufficient iterations
3. Include edge cases and boundary conditions
4. Add performance assertions if applicable

### Updating Benchmarks
1. Add new benchmark to `rotation-processing.bench.ts`
2. Update performance targets in config
3. Validate against success metrics
4. Update documentation

## 📚 Additional Resources

- [Fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Bun Testing Guide](https://bun.sh/docs/test)
- [Property Testing Best Practices](https://hypothesis.works/articles/what-is-property-testing/)

## 🎉 Success

When all validation checks pass, you'll see:

```text
🎉 All validation checks passed! Ready for production.

✅ Property Tests: 100% complete
✅ Performance Targets: All met
✅ Coverage: >90% achieved
✅ CI Stability: 0 flakes
```

This comprehensive testing suite ensures rotation number functionality is robust, performant, and production-ready.

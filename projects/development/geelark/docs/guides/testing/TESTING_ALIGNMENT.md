# Testing Alignment with Bun Best Practices

This document outlines how our testing practices align with [Bun's testing best practices](https://github.com/oven-sh/bun/tree/main/test#tests).

## 📁 Directory Structure

Following Bun's convention, we organize tests into dedicated directories:

```
/
├── tests/          # Unit and integration tests
│   ├── *.test.ts   # Test files using bun:test
│   └── __snapshots__/  # Snapshot files
├── bench/          # Performance benchmarks
│   ├── *.bench.ts  # Benchmark files
│   └── utils.ts    # Benchmarking utilities
└── docs/           # Documentation
```

## 🧪 Test Organization

### Test Files Pattern
- **Tests**: `tests/*.test.ts` - Unit and integration tests
- **Benchmarks**: `bench/*.bench.ts` - Performance benchmarks
- **Fixtures**: `tests/__fixtures__/` - Test fixtures (when needed)

### Naming Conventions
Following Bun's patterns:
- Test files: `feature-name.test.ts`
- Benchmark files: `feature-name.bench.ts`
- Snapshot files: `test-name.test.ts.snap`

## 🎯 Testing Practices

### Using `bun:test`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";

describe("Feature Flags", () => {
  beforeEach(() => {
    // Setup
  });

  it("should enable a flag", () => {
    expect(registry.isEnabled(flag)).toBe(true);
  });
});
```

### Type Testing with `expectTypeOf`

Following Bun's type testing patterns:

```typescript
import { expectTypeOf } from "bun:test";

describe("Type Safety", () => {
  it("should have correct return types", () => {
    expectTypeOf(registry.isEnabled).toBeFunction();
    expectTypeOf(registry.isEnabled(FeatureFlag.FEAT_PREMIUM)).toEqualTypeOf<boolean>();
  });
});
```

### Snapshot Testing

```typescript
import { expect } from "bun:test";

it("should match snapshot", () => {
  const result = someFunction();
  expect(result).toMatchSnapshot();
});
```

### Seeded Random Testing

For reproducible tests:

```bash
bun test --seed=12345
```

```typescript
it("should produce reproducible results", () => {
  const seed = Number(process.env.BUN_TEST_SEED) || 12345;
  // Use seed for reproducible randomness
});
```

## ⚡ Benchmarking Practices

### Benchmark Structure

Following Bun's benchmarking conventions:

```typescript
import { bench, describe } from "bun:test";

describe("Feature Flags", () => {
  bench("isEnabled() lookup", () => {
    registry.isEnabled(FeatureFlag.FEAT_PREMIUM);
  }, {
    iterations: 10_000,
  });
});
```

### Timing Methods

- **`performance.now()`** - High-resolution timestamps (milliseconds)
- **`Bun.nanoseconds()`** - Nanosecond-precision timing
- **`Bun.gc()`** - Force garbage collection between runs

### Benchmark Utilities

Our `bench/utils.ts` provides:
- `measure()` - Measure function execution time
- `measureNanoseconds()` - Nanosecond-precision measurement
- `benchmark()` - Run benchmarks with statistics
- `compareBaseline()` - Compare against baseline performance

## 📊 Test Configuration

### `bunfig.toml`

```toml
[test]
timeout = 30000  # 30 seconds for build operations
concurrent = false  # Sequential execution to avoid conflicts
```

### Package Scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:elimination": "bun test tests/feature-elimination.test.ts",
    "bench": "bun test bench/",
    "bench:feature-flags": "bun test bench/feature-flags.bench.ts"
  }
}
```

## 🔍 Test Categories

### 1. Feature Elimination Tests
- Bundle size comparisons
- Dead code elimination verification
- Feature flag impact analysis

### 2. Type Testing
- `expectTypeOf()` assertions
- Compile-time type checking
- Generic type validation

### 3. Integration Tests
- Service interactions
- API integration
- End-to-end workflows

### 4. Performance Benchmarks
- Feature flag operations
- String width calculations
- Logger performance
- Dashboard rendering

## 🎯 Aligning with Bun's Practices

### 1. Test Structure
✅ **Aligned**: Using `describe()`, `it()`, `expect()` from `bun:test`
✅ **Aligned**: Separate `tests/` and `bench/` directories
✅ **Aligned**: Snapshot testing with `toMatchSnapshot()`

### 2. Type Testing
✅ **Aligned**: Using `expectTypeOf()` for compile-time type assertions
✅ **Aligned**: Testing generic types and complex type scenarios
✅ **Aligned**: Type elimination verification

### 3. Benchmarking
✅ **Aligned**: Using `bench()` for performance tests
✅ **Aligned**: Using `performance.now()` and `Bun.nanoseconds()` for timing
✅ **Aligned**: Using `Bun.gc()` for consistent benchmark runs
✅ **Aligned**: Proper iterations and warmup patterns

### 4. Test Execution
✅ **Aligned**: Running with `bun test`
✅ **Aligned**: Watch mode with `bun test --watch`
✅ **Aligned**: Seeded random testing support

## 📈 Performance Targets

Based on our benchmarks:

| Component | Target | Measurement |
|-----------|--------|-------------|
| Feature flag lookup | < 1μs | `Bun.nanoseconds()` |
| String width calculation | < 10μs | `performance.now()` |
| Logger entry | < 50μs | `performance.now()` |
| Dashboard render | < 100ms | `performance.now()` |
| Bundle build | < 5s | `performance.now()` |

## 🔗 Resources

- [Bun Test Documentation](https://bun.sh/docs/test)
- [Bun Benchmark Examples](https://github.com/oven-sh/bun/tree/main/test)
- [Bun.spawn() API](https://bun.sh/docs/api/spawn)
- [Process Lifecycle Guide](../runtime/PROCESS_LIFECYCLE.md)
- [Runtime Controls Guide](../runtime/RUNTIME_CONTROLS.md)
- [expectTypeOf() Guide](./expectTypeOf-pro-tips.md)
- [Feature Flags Testing](../../tests/README.md)

## 🚀 Next Steps

1. ✅ Created `/bench` directory with benchmarks
2. ✅ Aligned test structure with Bun practices
3. ✅ Added type testing with `expectTypeOf()`
4. ✅ Implemented performance benchmarks
5. 🔄 Continue aligning test patterns as Bun evolves
6. 🔄 Add more integration tests
7. 🔄 Expand benchmark coverage


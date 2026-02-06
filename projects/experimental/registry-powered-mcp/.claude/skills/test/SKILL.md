---
name: test
description: Run test suites for the registry. Use when running tests, checking unit tests, integration tests, performance tests, regression tests, or validating code changes with coverage.
---

# Test Suite Runner

Run test suites using Bun's native test runner.

## Usage

```text
/test                    - Run all tests
/test unit               - Run unit tests only
/test integration        - Run integration tests only
/test performance        - Run performance tests only
/test regression         - Run regression tests only
/test <pattern>          - Filter tests by name pattern
/test -t <pattern>       - Filter tests by name (explicit)
/test --coverage         - Run with coverage report
/test --watch            - Watch mode for development
/test --bail             - Stop on first failure
/test --bail=10          - Stop after 10 failures
```

## Test Categories

| Category | Path | Description |
|----------|------|-------------|
| unit | `test/unit/` | Core functionality and routing |
| integration | `test/integration/` | API and MCP server behavior |
| performance | `test/performance/` | Benchmark validation |
| regression | `test/regression/` | Performance baselines |

## Examples

```bash
# Run all tests
bun test

# Run unit tests with coverage
/test unit --coverage

# Watch mode during development
/test --watch

# Run specific test pattern
/test "routing"

# Stop on first failure
/test --bail
```

## Additional Flags

```text
/test --update          - Update snapshots (bun test -u)
/test --timeout 10000   - Custom timeout in milliseconds
/test --concurrent      - Run tests concurrently
/test --randomize       - Randomize test order
```

## Common Commands

```bash
# Update snapshots
bun test -u test/

# Run with specific timeout
bun test --timeout 10000 test/

# Run concurrent tests
bun test --concurrent test/

# Randomize test order
bun test --randomize test/
```

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| Test execution | Sub-ms | Per individual test |
| CI pass rate | 99.9% | Snapshot validation |
| Heap validation | <50ms | Memory profiling |

## Related Skills

- `/bench` - Performance benchmarks
- `/lint` - Type checking
- `/dev` - Development server

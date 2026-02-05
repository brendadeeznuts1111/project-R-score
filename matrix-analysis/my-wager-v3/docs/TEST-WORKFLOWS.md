# Test Workflows Guide

This guide describes the standardized test workflows for the Tension Field System using Bun's test discovery features.

## Quick Start

### Bug Fixing Workflow

```bash
# Run all bug and fix related tests
bun test:bug
# or
bun test --test-name-pattern "bug|fix"
```

### Performance Testing

```bash
# Run performance benchmarks
bun test:performance
# or
bun test --test-name-pattern "performance|perf"
```

### Feature Development

```bash
# Run feature tests
bun test:feature
# or
bun test --test-name-pattern "feature|new"
```

### Changed Files Testing

```bash
# Test only changed files with bug/fix pattern
bun test:changed
# or
bun test $(git diff --name-only HEAD~1 | grep "\.test\.") --test-name-pattern "bug|fix"
```

## Available Workflows

| Command            | Description                      | Use Case                     |
| ------------------ | -------------------------------- | ---------------------------- |
| `bun test:bug`     | Run bug fix related tests        | After fixing bugs            |
| `bun test:performance` | Run performance tests           | After optimization           |
| `bun test:feature` | Run feature tests                | During feature development   |
| `bun test:changed` | Test changed files (bug/fix)     | Pre-commit validation        |
| `bun test:regression` | Run regression tests            | Before releases              |
| `bun test:integration` | Run integration tests           | System integration           |
| `bun test:coverage`| Run all tests with coverage      | Code coverage reports        |
| `bun test:smoke`   | Quick smoke test                 | Quick validation             |

## Test Naming Conventions

To use these workflows effectively, follow these naming conventions in your test files:

### Bug Fix Tests

```typescript
describe('bug fix', () => {
  it('should fix memory leak', () => {
    // Test implementation
  });
});

describe('memory bug', () => {
  it('should not leak memory', () => {
    // Test implementation
  });
});
```

### Performance Tests

```typescript
describe('performance test', () => {
  it('should complete operations quickly', () => {
    // Performance assertion
  });
});

describe('perf optimization', () => {
  it('should be faster than before', () => {
    // Benchmark comparison
  });
});
```

### Feature Tests

```typescript
describe('new feature', () => {
  it('should implement new functionality', () => {
    // Feature test
  });
});

describe('feature enhancement', () => {
  it('should enhance existing feature', () => {
    // Enhancement test
  });
});
```

### Regression Tests

```typescript
describe('regression test', () => {
  it('should not regress on known issues', () => {
    // Regression check
  });
});
```

### Integration Tests

```typescript
describe('integration test', () => {
  it('should integrate with external system', () => {
    // Integration test
  });
});
```

## Development Workflow Examples

### 1. Bug Fix Workflow

```bash
# 1. Create/modify bug fix test
# 2. Run bug-specific tests
bun test:bug

# 3. If tests pass, run full suite
bun test

# 4. Commit changes
git add .
git commit -m "fix: resolve memory leak issue"
```

### 2. Performance Optimization

```bash
# 1. Write performance test
# 2. Run baseline
bun test:performance

# 3. Implement optimization
# 4. Verify improvement
bun test:performance

# 5. Run regression tests
bun test:regression
```

### 3. Feature Development

```bash
# 1. Create feature test
# 2. Run feature tests
bun test:feature

# 3. Implement feature
# 4. Run integration tests
bun test:integration

# 5. Full test suite
bun test:coverage
```

### 4. Pre-commit Validation

```bash
# Quick smoke test
bun test:smoke

# Test changed files
bun test:changed

# Run coverage if needed
bun test:coverage
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run bug fix tests
        run: bun test:bug

      - name: Run performance tests
        run: bun test:performance

      - name: Run regression tests
        run: bun test:regression

      - name: Run coverage
        run: bun test:coverage
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running pre-commit tests..."

# Smoke test
bun test:smoke

# Test changed files
bun test:changed

# If any test fails, prevent commit
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ All tests passed. Commit allowed."
```

## Advanced Usage

### Combining Patterns

```bash
# Multiple patterns
bun test --test-name-pattern "bug|fix|regression"

# Pattern with file filter
bun test src/tests --test-name-pattern "performance"

# Exclude patterns
bun test --test-name-pattern ".*" --exclude "integration"
```

### Custom Workflows

Create your own workflow scripts in `scripts/`:

```typescript
// scripts/custom-workflow.ts
#!/usr/bin/env bun
import { $ } from 'bun';

await $`bun test --test-name-pattern "custom|specific"`;
```

Add to package.json:

```json
{
  "scripts": {
    "test:custom": "bun scripts/custom-workflow.ts"
  }
}
```

## Best Practices

1. **Descriptive Test Names**: Use clear, consistent naming in `describe()` blocks
2. **Pattern Matching**: Leverage patterns for efficient test selection
3. **Git Integration**: Use `git diff` for changed file testing
4. **Coverage Goals**: Maintain high coverage with `test:coverage`
5. **CI/CD**: Integrate workflows into your pipeline
6. **Pre-commit**: Use smoke tests for quick validation

## Troubleshooting

### Pattern Not Matching

- Check that patterns match `describe()` blocks, not filenames
- Patterns are case-sensitive
- Use `|` for OR logic in patterns

### Git Diff Issues

- Ensure you're in a git repository
- Check that test files have `.test.` in the name
- Use absolute paths if needed

### Performance Test Issues

- Set appropriate timeouts for slow tests
- Use `--timeout` flag for specific tests
- Consider running performance tests separately

## Resources

- [Bun Test Documentation](https://bun.com/docs/test)
- [Test Discovery Guide](../examples/test-discovery-practical.ts)
- [Pattern Matching Examples](../examples/test-pattern-demo.ts)

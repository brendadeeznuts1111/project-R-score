# CI Detection and Configuration

This guide explains how the test suite automatically detects and adapts to different CI/CD environments.

## 🎯 Overview

The CI detection system automatically:

- Detects the current CI/CD platform
- Adjusts test configuration for optimal performance
- Emits platform-specific annotations
- Configures appropriate timeouts and concurrency

## 🏗️ Supported CI Platforms

| Platform | Detection Variable | Annotations | Coverage | Notes |
|----------|-------------------|-------------|----------|-------|
| GitHub Actions | `GITHUB_ACTIONS` | ✅ Native | ✅ LCOV, HTML | Full integration |
| GitLab CI | `GITLAB_CI` | ❌ Generic | ✅ LCOV | Basic support |
| CircleCI | `CIRCLECI` | ❌ Generic | ✅ LCOV | Basic support |
| Travis CI | `TRAVIS` | ❌ Generic | ✅ LCOV | Basic support |
| Jenkins | `JENKINS_URL` | ❌ Generic | ✅ LCOV | Basic support |
| Azure Pipelines | `TF_BUILD` | ❌ Generic | ✅ LCOV | Basic support |
| Bitbucket Pipelines | `BITBUCKET_BUILD_NUMBER` | ❌ Generic | ✅ LCOV | Basic support |
| AppVeyor | `APPVEYOR` | ❌ Generic | ✅ LCOV | Basic support |
| Buildkite | `BUILDKITE` | ❌ Generic | ✅ LCOV | Basic support |
| Generic CI | `CI` | ❌ Generic | ✅ LCOV | Fallback support |

## 📋 Environment Variables

### Automatic Detection

The system automatically detects CI environments using these variables:

```bash
# GitHub Actions
GITHUB_ACTIONS=true
GITHUB_REF_NAME=main
GITHUB_SHA=abc123
GITHUB_RUN_NUMBER=42

# GitLab CI
GITLAB_CI=true
CI_COMMIT_REF_NAME=main
CI_COMMIT_SHA=def456

# Generic CI
CI=true
```

### Configuration Variables

You can override behavior with these variables:

```bash
# Force enable annotations (non-GitHub CIs)
CI_ANNOTATIONS=true
ENABLE_ANNOTATIONS=true

# Force coverage locally
COVERAGE=true

# Disable frozen lockfile
BUN_FROZEN_LOCKFILE=0
```

## 🔧 Test Configuration

### CI vs Local Behavior

| Setting | Local | CI | Reason |
|---------|-------|----|--------|
| Timeout | 10s | 30s | CI is slower |
| Concurrency | All cores | 4 | Resource limits |
| Coverage | On-demand | Always | CI needs reports |
| Retries | 0 | 2 | Flaky tests in CI |
| Bail | No | After 10 failures | Fast feedback |
| Annotations | No | Platform-specific | CI integration |

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun run test:ci-runner
```

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - test

test:
  stage: test
  image: oven/bun:latest
  script:
    - bun install --frozen-lockfile
    - bun run test:ci-runner
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 🎨 Annotations

### GitHub Actions

GitHub Actions annotations are automatically emitted:

```bash
# Error annotation
::error file=test.ts,line=10,title=Test Failure::Test failed

# Warning annotation
::warning file=src.ts,line=5::Low coverage

# Grouping
::group::Test Suite
::endgroup::
```

### Generic CI

For other CI platforms, generic annotations are used:

```bash
[ERROR] Test failed
  File: test.ts:10
  Title: Test Failure

[WARNING] Low coverage
  File: src.ts:5
```

## 📊 Usage Examples

### Basic Usage

```bash
# Run with automatic CI detection
bun run test:ci-runner

# Run specific patterns
bun run test:ci-runner src/__tests__/unit/

# Force coverage locally
COVERAGE=true bun run test:ci-runner
```

### Programmatic Usage

```typescript
import { CIDetector } from './src/lib/ci-detector';
import { testConfig } from './src/lib/test-config';

// Detect CI environment
const ci = CIDetector.getInstanceSync().detect();
console.log(`Running in: ${ci.name}`);

// Get CI-aware configuration
const config = testConfig.getConfig();
console.log(`Timeout: ${config.timeout}ms`);

// Emit annotations
if (ci.annotations.enabled) {
  CIDetector.getInstanceSync().emitAnnotation('error', 'Something failed', {
    file: 'test.ts',
    line: 42
  });
}
```

### Custom Test Runner

```typescript
import { CIDetector } from './src/lib/ci-detector';

const detector = CIDetector.getInstance();
const ci = detector.detect();

// Emit test start
detector.startGroup('Running tests');

// Your test logic here...

// Emit test results
if (testsPassed) {
  console.log('✅ All tests passed');
} else {
  detector.emitAnnotation('error', 'Tests failed', {
    title: 'Test Failure'
  });
}

detector.endGroup();
```

## 🔍 Debugging

### Check CI Detection

```bash
# Run the CI test runner to see detection info
bun run test:ci-runner

# Check environment variables
env | grep -E "(CI|GITHUB|GITLAB|CIRCLE|TRAVIS)"
```

### Force Local Behavior

```bash
# Run as if local (ignore CI)
CI= bun run test:ci-runner

# Force CI behavior locally
CI=true bun run test:ci-runner
```

### Enable Debug Output

```bash
# Enable verbose output
DEBUG=ci:* bun run test:ci-runner

# Show configuration
bun run test:ci-runner --dry-run
```

## 🚀 Best Practices

### For GitHub Actions

1. Use `bun run test:ci-runner` for automatic integration
2. Enable coverage reporting for PR checks
3. Use `--frozen-lockfile` for reproducible builds
4. Cache dependencies for faster runs

### For Other CI Platforms

1. Set `CI_ANNOTATIONS=true` for better error reporting
2. Use `--coverage-reporter=lcov` for coverage integration
3. Configure appropriate resource limits
4. Use `--timeout` for slower environments

### For Local Development

1. Use default test runner for fast feedback
2. Enable coverage only when needed: `COVERAGE=true`
3. Use `--prefer-offline` on slow networks
4. Use process management tools for stuck tests

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Bun Test Configuration](https://bun.com/docs/test/configuration)
- [CI Environment Variables](https://github.com/watson/ci-info/blob/master/vendors.md)

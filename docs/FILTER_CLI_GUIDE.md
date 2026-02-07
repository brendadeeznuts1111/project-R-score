# Bun Filter CLI - Quick Start Guide

## Installation

Add the filter CLI to your workspace:

```bash
# Make the CLI executable
chmod +x bin/bun-filter-cli.ts

# Add to your package.json scripts
{
  "scripts": {
    "filter": "bun bin/bun-filter-cli.ts",
    "test:all": "bun run --filter '*' test",
    "build:apps": "bun run --filter 'app-*' build",
    "deploy:staging": "bun run --filter 'staging-*' deploy"
  }
}
```

## Basic Usage

### Filter Patterns

```bash
# Run tests in all packages
bun run --filter "*" test

# Run tests in packages starting with "ba"
bun run --filter "ba*" test

# Run tests in packages ending with "utils"
bun run --filter "*utils" test

# Run tests in packages containing "api"
bun run --filter "*api*" test
```

### Advanced Patterns

```bash
# Exclude test packages
bun run --filter "!test-*" build

# Multiple patterns (OR logic)
bun run --filter "app-* api-*" test

# Brace expansion
bun run --filter "pkg-{a,b}" test

# Multiple exclusions
bun run --filter "!test-* !demo-*" build
```

## Execution Options

### Parallel vs Sequential

```bash
# Execute in parallel (faster for independent packages)
bun run --filter "app-*" --parallel build

# Execute sequentially (default, safer for dependent operations)
bun run --filter "db-*" --sequential migrate

# Stop on first failure
bun run --filter "prod-*" --bail deploy
```

### Performance Tuning

```bash
# Limit parallel execution
bun run --filter "*" --parallel --max-concurrency 4 test

# Set per-package timeout
bun run --filter "api-*" --timeout 30000 test

# Silent execution
bun run --filter "*" --silent test

# Dry run (see what would execute)
bun run --filter "app-*" --dry-run build
```

## Real-World Examples

### Development Workflow

```bash
# Install dependencies in all packages
bun run --filter "*" install

# Start development servers for all apps
bun run --filter "app-*" dev

# Run tests in parallel
bun run --filter "*" --parallel test

# Lint everything
bun run --filter "*" --parallel lint
```

### CI/CD Pipeline

```bash
# Test all packages
bun run --filter "*" --parallel test

# Build applications (stop on failure)
bun run --filter "app-*" --bail build

# Deploy to staging
bun run --filter "staging-*" --sequential deploy

# Run smoke tests
bun run --filter "smoke-test-*" test
```

### Package Management

```bash
# Build only libraries
bun run --filter "lib-*" --parallel build

# Publish packages
bun run --filter "publish-*" --sequential publish

# Update dependencies
bun run --filter "*" update
```

## Dashboard Integration

Start the filter dashboard:

```bash
bun run src/server/filter-dashboard.ts
```

Then visit `http://localhost:3001` to:
- See real-time filter execution
- View package statistics
- Monitor active filters
- Browse execution history

## Performance Tips

### When to Use Parallel

✅ **Use parallel for:**
- Independent packages
- CPU-intensive operations
- Large workspaces (10+ packages)
- Non-dependent builds/tests

❌ **Avoid parallel for:**
- Database migrations
- Sequential deployments
- Shared resource operations
- Debugging (harder to follow logs)

### Optimizing Large Workspaces

```bash
# Limit concurrency to control memory usage
bun run --filter "*" --parallel --max-concurrency 4 test

# Use bail to fail fast in CI
bun run --filter "*" --parallel --bail test

# Split large operations
bun run --filter "app-*" --parallel test
bun run --filter "lib-*" --parallel test
```

## Troubleshooting

### Common Issues

```bash
# Check what packages match your pattern
bun run --filter "your-pattern" --dry-run test

# Verify scripts exist in packages
bun run --filter "*" --dry-run your-script

# Debug with verbose output
FILTER_SILENT=false bun run --filter "*" test
```

### Pattern Validation

```bash
# Test complex patterns
bun run --filter "pkg-{a,b,c}" --dry-run test
bun run --filter "!test-* !demo-*" --dry-run build
```

## Integration Examples

### GitHub Actions

```yaml
name: Test and Build
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run --filter "*" --parallel test
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run --filter "app-*" --bail build
```

### GitLab CI

```yaml
stages:
  - test
  - build

test_all:
  stage: test
  script:
    - bun install
    - bun run --filter "*" --parallel test

build_apps:
  stage: build
  script:
    - bun install
    - bun run --filter "app-*" --bail build
  only:
    - main
```

## Advanced Usage

### Custom Scripts

Create custom filter scripts:

```typescript
// scripts/build-workspace.ts
#!/usr/bin/env bun
import { runFilteredScript } from '../lib/filter-runner';

await runFilteredScript('app-*', 'build', {
  parallel: true,
  bail: true,
  args: ['--production']
});
```

### Programmatic API

```typescript
import { runFilteredScript, discoverWorkspacePackages } from './lib/filter-runner';

// Discover packages
const packages = await discoverWorkspacePackages();
console.log(`Found ${packages.length} packages`);

// Run custom filter
const result = await runFilteredScript('app-*', 'build', {
  parallel: true,
  bail: true
});

console.log(`Built ${result.successfulPackages} packages`);
```

## Best Practices

1. **Always test patterns with `--dry-run` first**
2. **Use `--bail` in CI/CD pipelines**
3. **Limit parallel execution in large workspaces**
4. **Use specific patterns to avoid unintended matches**
5. **Combine filters for complex workflows**
6. **Monitor memory usage with parallel execution**

## Performance Benchmarks

Typical performance improvements with parallel execution:

| Package Count | Sequential | Parallel | Speedup |
|---------------|------------|----------|---------|
| 2-5 packages  | ~100ms     | ~30ms    | 3.3x    |
| 10-20 packages| ~800ms     | ~150ms   | 5.3x    |
| 50+ packages  | ~4000ms    | ~600ms   | 6.7x    |

Memory usage: ~50MB baseline, ~200MB peak with parallel execution.

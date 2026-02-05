# Test Management Suite - Quick Start Guide

## 🎯 What We've Built

### 1. CI Detection System

Automatically detects and adapts to 15+ CI/CD platforms:

- GitHub Actions (full annotation support)
- GitLab CI, CircleCI, Travis CI
- Jenkins, Azure Pipelines, Bitbucket
- And many more...

### 2. Network Control

Control network requests during test execution:

- `--prefer-offline`: Use cache when possible
- `--frozen-lockfile`: Prevent dependency updates
- Isolated mode for air-gapped testing

### 3. Process Management

Graceful and immediate test process termination:

- SIGTERM for graceful shutdown
- SIGKILL for immediate termination
- Batch operations for multiple processes

## 🚀 Quick Commands

### CI Detection

```bash
# Run with CI detection
bun run test:ci-runner

# See CI detection examples
bun run examples:ci-detection

# Simulate GitHub Actions
GITHUB_ACTIONS=true bun run test:ci-runner
```

### Network Control

```bash
# Offline mode (cache preferred)
bun run test:offline

# Frozen lockfile (no updates)
bun run test:frozen

# Network-controlled runner
bun run test:network offline
bun run test:network frozen
bun run test:network isolated
```

### Process Management

```bash
# List test processes
bun run test:process:list --tests-only

# Kill specific process
bun run test:process:kill <pid>

# Kill all test processes
bun run test:process:kill-all

# Graceful shutdown
bun run test:process:graceful <pid>

# Quick kill via shell script
./scripts/kill-test.sh <pid>
./scripts/kill-test.sh all --force
```

## 📚 Documentation

- **CI Detection Guide**: `docs/CI-DETECTION-GUIDE.md`
- **Network Control Guide**: `docs/NETWORK-CONTROL-GUIDE.md`
- **Process Management**: `docs/TEST-PROCESS-MANAGEMENT.md`

## 🔧 Configuration

### bunfig.toml additions

```toml
[test.offline]
coverage = false
timeout = 15000
preload = ["./test-setup.ts", "./global-mocks.ts"]

[test.frozen]
coverage = false
timeout = 15000
preload = ["./test-setup.ts", "./global-mocks.ts"]
```

### package.json scripts

- `test:ci-runner` - CI-aware test runner
- `test:network` - Network control runner
- `test:process:*` - Process management commands
- `examples:ci-detection` - CI detection examples

## 🎨 Next Steps

1. **Integrate with your CI/CD**

   - Add `bun run test:ci-runner` to your GitHub Actions
   - Configure coverage reporting
   - Set up annotation notifications

2. **Customize for your needs**

   - Add your own CI platform detection
   - Configure custom test patterns
   - Set up project-specific annotations

3. **Explore advanced features**

   - Create custom test configurations
   - Build process monitoring dashboards
   - Integrate with deployment pipelines

## 🐛 Troubleshooting

### Tests not detecting CI

```bash
# Check environment variables
env | grep -E "(CI|GITHUB|GITLAB)"

# Force CI behavior
CI=true bun run test:ci-runner
```

### Process won't die

```bash
# Try graceful first
bun run test:process:graceful <pid>

# Force kill if needed
bun run test:process:kill <pid> --signal=SIGKILL
```

### Network issues

```bash
# Check network mode
bun run test:network --dry-run

# Clear cache if needed
bun pm cache rm
```

## 📊 Example GitHub Actions Workflow

```yaml
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

## 🎉 You're Ready

You now have a comprehensive test management suite that:

- Adapts to any CI/CD environment
- Controls network access during tests
- Manages test processes effectively
- Provides detailed documentation and examples

Happy testing

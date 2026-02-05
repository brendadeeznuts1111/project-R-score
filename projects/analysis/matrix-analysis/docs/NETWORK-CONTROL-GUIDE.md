# Network Control for Bun Test Execution

This guide explains how to control network requests and auto-installs during Bun test execution.

## 🎯 Quick Reference

| Command                     | Purpose                               | Network Access                     |
| --------------------------- | ------------------------------------- | ---------------------------------- |
| `bun test --prefer-offline` | Use cache when possible               | Fallback to network if cache miss  |
| `bun test --frozen-lockfile`| Fail if lockfile changes              | No dependency updates              |
| `bun test --config=ci`      | CI mode with restrictions              | Frozen lockfile                    |
| `bun run test:network offline`| Offline mode                         | Cache preferred                     |
| `bun run test:network frozen`| Frozen lockfile                      | No updates                         |
| `bun run test:network isolated`| Maximum restriction                 | No network, no installs            |

## 🔧 Configuration Options

### 1. Command Line Flags

#### `--prefer-offline`

- Uses cached packages when available
- Falls back to network if package not in cache
- Good for: Slow networks, flaky connections

```bash
bun test --prefer-offline
```

#### `--frozen-lockfile`

- Error if `bun.lockb` would change
- Prevents dependency updates during test
- Good for: CI/CD, reproducible builds

```bash
bun test --frozen-lockfile
```

### 2. Configuration Files

#### bunfig.toml

```toml
[install]
# Control package manager behavior
prefer = "offline"        # "online" | "offline"
frozenLockfile = false    # Set to true for CI

[test]
# Test-specific configurations
timeout = 10000
preload = ["./test-setup.ts"]

# Environment-specific configs
[test.ci]
frozenLockfile = true
coverage = true
timeout = 30000

[test.offline]
preferOffline = true
coverage = false
```

### 3. Environment Variables

| Variable                  | Effect                        | Default |
| -------------------------- | ----------------------------- | ------- |
| `CI`                      | Enables CI mode (frozen lockfile) | `0`     |
| `BUN_INSTALL_SKIP_DOWNLOAD`| Skip all downloads             | `0`     |
| `BUN_DISABLE_INSTALL`     | Disable auto-installs          | `0`     |
| `NO_UPDATE`                | Prevent package updates        | `0`     |

```bash
# Set environment variables
CI=1 bun test
BUN_INSTALL_SKIP_DOWNLOAD=1 bun test --prefer-offline
```

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "test": "bun test .claude src",
    "test:offline": "bun test --prefer-offline",
    "test:frozen": "bun test --frozen-lockfile",
    "test:ci": "bun test --config=ci",
    "test:network": "bun scripts/test-network-controlled.ts"
  }
}
```

## 🚀 Advanced Usage

### Network-Controlled Test Runner

Use the dedicated script for comprehensive network control:

```bash
# Run in offline mode
bun run test:network offline

# Run with frozen lockfile
bun run test:network frozen

# Maximum isolation (no network, no installs)
bun run test:network isolated

# CI mode with coverage
bun run test:network ci

# Show help
bun run test:network --help
```

### Combining Options

You can combine multiple flags for stricter control:

```bash
# Maximum restriction - no network, no lockfile changes
bun test --prefer-offline --frozen-lockfile

# With environment variables
CI=1 BUN_INSTALL_SKIP_DOWNLOAD=1 bun test --prefer-offline
```

## 🏗️ CI/CD Integration

### GitHub Actions

```yaml
- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Run tests
  run: bun test --config=ci
  env:
    CI: true
```

### Docker

```dockerfile
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Run tests without network access
RUN bun test --prefer-offline
```

## 🔍 Troubleshooting

### Cache Issues

```bash
# Clear cache if needed
bun pm cache rm

# Rebuild cache
bun install
```

### Lockfile Conflicts

```bash
# Check if lockfile would change
bun install --dry-run

# Update lockfile if needed
bun install
```

### Network Failures

```bash
# Force offline mode (will fail if cache miss)
BUN_INSTALL_SKIP_DOWNLOAD=1 bun test --prefer-offline

# Check what would be installed
bun install --dry-run --prefer-offline
```

## 📊 Best Practices

### Development

- Use default mode for active development
- Use `--prefer-offline` on slow networks
- Keep lockfile updated regularly

### CI/CD

- Always use `--frozen-lockfile` in CI
- Set `CI=1` environment variable
- Use `--config=ci` for consistent settings

### Production Testing

- Use isolated mode for final validation
- Combine `--prefer-offline` and `--frozen-lockfile`
- Disable auto-installs entirely

## 🎛️ Mode Comparison

| Mode     | Network       | Lockfile | Auto-install | Use Case        |
| -------- | ------------- | -------- | ------------ | --------------- |
| Default  | Full          | Flexible | Enabled      | Development     |
| Offline  | Cache preferred| Flexible | Enabled      | Slow networks   |
| Frozen   | Full          | Frozen   | Enabled      | CI/CD           |
| Isolated | None          | Frozen   | Disabled     | Air-gapped      |

### Process Management

```bash
# Kill test processes gracefully
bun run test:process:kill <pid>

# Kill all test processes
bun run test:process:kill-all

# List test processes
bun run test:process:list --tests-only

# Monitor test processes
bun run test:process:monitor

# Quick kill via shell script
./scripts/kill-test.sh <pid>
./scripts/kill-test.sh all --force
```

## 📚 Additional Resources

- [Bun Test Documentation](https://bun.com/docs/test/configuration)
- [Bun Install Options](https://bun.com/docs/cli/install)
- [Configuration Inheritance](https://bun.com/docs/test/configuration#install-settings-inheritance)

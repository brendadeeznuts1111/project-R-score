# Bun Config Flag (`-c` / `--config`)

**Reference**: [Bun Configuration Documentation](https://bun.com/docs/cli/bunfig)

---

## Overview

The `-c` / `--config` flag allows you to specify a custom path to the `bunfig.toml` configuration file, overriding the default configuration lookup order.

---

## Default Config Lookup Order

Bun looks for `bunfig.toml` in this order (first found wins):

1. CLI flag: `--config` or `-c` (highest priority)
2. Local: `./bunfig.toml` (project root)
3. XDG: `$XDG_CONFIG_HOME/.bunfig.toml`
4. Home: `$HOME/.bunfig.toml` (lowest priority)

---

## Usage

### Basic Usage

```bash
# Specify custom config file
bun install --config ./config/custom-bunfig.toml

# Short form
bun install -c ./config/custom-bunfig.toml

# Use config for any command
bun outdated -c ./config/prod-bunfig.toml
bun publish -c ./config/publish-bunfig.toml
```

### Multiple Environments

```bash
# Development config
bun install -c ./config/dev-bunfig.toml

# Production config
bun install -c ./config/prod-bunfig.toml

# CI config
bun install -c ./config/ci-bunfig.toml
```

### Workspace-Specific Configs

```bash
# Root workspace config
bun install -c ./bunfig.toml

# Workspace-specific config
bun install --filter @graph/types -c ./packages/types/bunfig.toml
```

---

## Use Cases

### 1. Environment-Specific Configurations

```bash
# Development
bun install -c ./config/dev-bunfig.toml

# Production
bun install -c ./config/prod-bunfig.toml

# Staging
bun install -c ./config/staging-bunfig.toml
```

### 2. Different Registries Per Environment

**`config/dev-bunfig.toml`**:
```toml
[install.scopes."@graph"]
registry = "https://npm.dev.company.com"
token = "$DEV_NPM_TOKEN"
```

**`config/prod-bunfig.toml`**:
```toml
[install.scopes."@graph"]
registry = "https://npm.prod.company.com"
token = "$PROD_NPM_TOKEN"
```

**Usage**:
```bash
# Development
bun install -c ./config/dev-bunfig.toml

# Production
bun install -c ./config/prod-bunfig.toml
```

### 3. CI/CD with Custom Config

```bash
# CI uses custom config
bun install -c ./config/ci-bunfig.toml

# Or via environment variable
export BUNFIG_PATH=./config/ci-bunfig.toml
bun install
```

### 4. Testing Different Configurations

```bash
# Test with isolated installs
bun install -c ./config/isolated-bunfig.toml

# Test with hoisted installs
bun install -c ./config/hoisted-bunfig.toml
```

---

## Integration with Our Scripts

### Publish Script

```bash
# Use custom config for publishing
VERSION=1.4.1 bun run publish:graph \
  --config ./config/publish-bunfig.toml \
  --otp=123456
```

### Install Scripts

```bash
# Install with custom config
bun install -c ./config/custom-bunfig.toml

# Or set via environment
export BUNFIG_PATH=./config/custom-bunfig.toml
bun install
```

---

## Config File Examples

### Development Config (`config/dev-bunfig.toml`)

```toml
[install]
linker = "isolated"
auto = "fallback"
network-concurrency = 64  # Faster for dev

[install.scopes."@graph"]
registry = "https://npm.dev.company.com"
token = "$DEV_NPM_TOKEN"

[test]
timeout = 10000  # Longer timeout for dev
```

### Production Config (`config/prod-bunfig.toml`)

```toml
[install]
linker = "isolated"
auto = "deny"  # Stricter for prod
network-concurrency = 32  # Balanced

[install.scopes."@graph"]
registry = "https://npm.prod.company.com"
token = "$PROD_NPM_TOKEN"

[test]
timeout = 5000
smol = true  # Reduce memory in CI
```

### CI Config (`config/ci-bunfig.toml`)

```toml
[install]
linker = "isolated"
frozen-lockfile = true
network-concurrency = 24

[install.scopes."@graph"]
registry = "https://npm.internal.company.com"
token = "$CI_NPM_TOKEN"

[test]
timeout = 30000
smol = true
coverage = true
```

---

## Environment Variable Alternative

Instead of `--config` flag, you can use environment variable:

```bash
# Set config path
export BUNFIG_PATH=./config/custom-bunfig.toml

# Commands will use this config
bun install
bun outdated
bun publish
```

**Priority**: CLI `--config` flag > `BUNFIG_PATH` env var > default lookup

---

## Best Practices

### 1. Use Config Files for Different Environments

```bash
# Development
bun install -c ./config/dev-bunfig.toml

# Production
bun install -c ./config/prod-bunfig.toml
```

### 2. Store Configs in Version Control

```bash
# Track configs
git add config/dev-bunfig.toml
git add config/prod-bunfig.toml

# Don't track secrets (use env vars)
echo "config/*-secrets.toml" >> .gitignore
```

### 3. Use Environment Variables for Secrets

```toml
# config/prod-bunfig.toml
[install.scopes."@graph"]
registry = "https://npm.prod.company.com"
token = "$PROD_NPM_TOKEN"  # Load from environment
```

### 4. Document Config Usage

```bash
# README.md
## Configuration

- Development: `bun install -c ./config/dev-bunfig.toml`
- Production: `bun install -c ./config/prod-bunfig.toml`
- CI: `bun install -c ./config/ci-bunfig.toml`
```

---

## Troubleshooting

### Issue: Config Not Found

**Error**: `config file not found`

**Solution**:
```bash
# Use absolute path
bun install -c /absolute/path/to/bunfig.toml

# Or relative to current directory
bun install -c ./config/bunfig.toml
```

### Issue: Config Not Applied

**Error**: Config changes not taking effect

**Solution**:
```bash
# Verify config is being used
bun install -c ./config/bunfig.toml --verbose

# Check config path
bun install -c ./config/bunfig.toml --dry-run
```

### Issue: Multiple Configs Conflict

**Error**: Conflicting settings

**Solution**:
```bash
# Use explicit config flag
bun install -c ./config/specific-bunfig.toml

# Don't rely on default lookup
```

---

## Related Documentation

- [Bun Configuration](./BUNFIG-CONFIGURATION.md) - Complete config guide
- [Bun Network & Registry](./BUN-NETWORK-REGISTRY.md) - Registry configuration
- [Bun Workspaces](./BUN-WORKSPACES.md) - Workspace configuration

---

## Quick Reference

```bash
# Use custom config
bun install -c ./config/custom-bunfig.toml

# Short form
bun install -c ./config/custom-bunfig.toml

# Environment variable
export BUNFIG_PATH=./config/custom-bunfig.toml
bun install

# Multiple environments
bun install -c ./config/dev-bunfig.toml   # Development
bun install -c ./config/prod-bunfig.toml  # Production
```

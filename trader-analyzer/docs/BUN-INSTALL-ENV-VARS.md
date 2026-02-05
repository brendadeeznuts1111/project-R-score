# Bun Install Environment Variables

**Reference**: [Bun Install Configuration - Environment Variables](https://bun.com/docs/pm/cli/install#configuring-with-environment-variables)

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+

---

## Overview

Environment variables have **higher priority** than `bunfig.toml` configuration. They allow you to override Bun's install behavior without modifying configuration files, making them ideal for:

- CI/CD pipelines
- Temporary overrides
- Environment-specific settings
- Security-sensitive configurations

---

## Configuration Priority

**Highest to Lowest Priority**:

1. **CLI Flags** (e.g., `--frozen-lockfile`, `--production`)
2. **Environment Variables** (`BUN_CONFIG_*`)
3. **Local `bunfig.toml`** (`./bunfig.toml`)
4. **Global `bunfig.toml`** (`$HOME/.bunfig.toml` or `$XDG_CONFIG_HOME/.bunfig.toml`)

---

## Available Environment Variables

### Registry & Authentication

#### `BUN_CONFIG_REGISTRY`

Set an npm registry URL (default: `https://registry.npmjs.org`).

**Usage**:
```bash
# Use private registry
export BUN_CONFIG_REGISTRY="https://npm.internal.yourcompany.com"
bun install

# Or inline
BUN_CONFIG_REGISTRY="https://npm.internal.yourcompany.com" bun install
```

**Example**: Override registry for CI/CD:
```bash
# .github/workflows/ci.yml
- name: Install dependencies
  env:
    BUN_CONFIG_REGISTRY: ${{ secrets.NPM_REGISTRY_URL }}
  run: bun install
```

**Note**: This overrides `[install.scopes]` registry settings in `bunfig.toml`.

---

#### `BUN_CONFIG_TOKEN`

Set an auth token for npm registry (currently does nothing per Bun docs, but reserved for future use).

**Usage**:
```bash
export BUN_CONFIG_TOKEN="your-npm-token"
bun install
```

**Note**: For scoped packages, use `[install.scopes]` in `bunfig.toml` or set tokens per scope.

---

### Lockfile Control

#### `BUN_CONFIG_YARN_LOCKFILE`

Save a Yarn v1-style `yarn.lock` file in addition to `bun.lock`.

**Usage**:
```bash
# Generate yarn.lock for compatibility
export BUN_CONFIG_YARN_LOCKFILE=1
bun install
```

**Use Case**: When migrating from Yarn or needing compatibility with tools that read `yarn.lock`.

---

#### `BUN_CONFIG_SKIP_SAVE_LOCKFILE`

Don't save a lockfile (`bun.lock`).

**Usage**:
```bash
# Skip lockfile generation
export BUN_CONFIG_SKIP_SAVE_LOCKFILE=1
bun install
```

**Use Case**: 
- Testing package resolution without modifying lockfile
- Temporary installs where lockfile isn't needed

**Warning**: Not recommended for production or version-controlled projects.

---

#### `BUN_CONFIG_SKIP_LOAD_LOCKFILE`

Don't load existing lockfile (`bun.lock`).

**Usage**:
```bash
# Ignore existing lockfile
export BUN_CONFIG_SKIP_LOAD_LOCKFILE=1
bun install
```

**Use Case**:
- Force fresh dependency resolution
- Testing latest versions
- Debugging lockfile issues

**Warning**: May install different versions than lockfile specifies.

---

### Installation Control

#### `BUN_CONFIG_SKIP_INSTALL_PACKAGES`

Don't install any packages (only resolve dependencies).

**Usage**:
```bash
# Resolve dependencies without installing
export BUN_CONFIG_SKIP_INSTALL_PACKAGES=1
bun install
```

**Use Case**:
- Validate `package.json` dependencies
- Check for dependency conflicts
- Generate lockfile without installing

---

#### `BUN_CONFIG_LINK_NATIVE_BINS`

Point `bin` in `package.json` to a platform-specific dependency.

**Usage**:
```bash
export BUN_CONFIG_LINK_NATIVE_BINS=1
bun install
```

**Use Case**: When packages have platform-specific binaries (e.g., native addons).

---

## Common Use Cases

### 1. CI/CD Pipeline

**`.github/workflows/ci.yml`**:
```yaml
- name: Install dependencies
  env:
    BUN_CONFIG_REGISTRY: ${{ secrets.NPM_REGISTRY_URL }}
    BUN_CONFIG_SKIP_SAVE_LOCKFILE: 0  # Ensure lockfile is saved
  run: bun install --frozen-lockfile
```

**Benefits**:
- Registry configured via secrets (not in config files)
- Lockfile validation enforced
- No local config file modifications needed

---

### 2. Development Override

**Temporary registry override**:
```bash
# Use different registry for testing
BUN_CONFIG_REGISTRY="https://npm.test.company.com" bun install
```

**Skip lockfile for experimentation**:
```bash
# Try latest versions without updating lockfile
BUN_CONFIG_SKIP_LOAD_LOCKFILE=1 bun install
```

---

### 3. Debugging Dependency Resolution

**Validate dependencies without installing**:
```bash
# Check what would be installed
BUN_CONFIG_SKIP_INSTALL_PACKAGES=1 bun install --verbose
```

**Force fresh resolution**:
```bash
# Ignore lockfile and resolve fresh
BUN_CONFIG_SKIP_LOAD_LOCKFILE=1 bun install
```

---

### 4. Multi-Environment Setup

**Development**:
```bash
# .env.development
BUN_CONFIG_REGISTRY=https://npm.dev.company.com
```

**Production**:
```bash
# .env.production
BUN_CONFIG_REGISTRY=https://npm.prod.company.com
```

**Load and use**:
```bash
# Development
source .env.development
bun install

# Production
source .env.production
bun install
```

---

## Integration with Our Workspace

### Current Setup

Our `bunfig.toml` uses scoped registries:
```toml
[install.scopes."@graph"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"
```

### Environment Variable Override

**Override scoped registry globally**:
```bash
# Override all registries
export BUN_CONFIG_REGISTRY="https://npm.alternative.com"
bun install
```

**Note**: This affects **all** packages, not just scoped ones. For scoped overrides, use `bunfig.toml` or per-scope environment variables.

---

## Environment Variable vs bunfig.toml

### When to Use Environment Variables

✅ **Use Environment Variables For**:
- CI/CD secrets (registry URLs, tokens)
- Temporary overrides
- Per-developer settings
- Debugging/testing scenarios
- Environment-specific configurations

### When to Use bunfig.toml

✅ **Use bunfig.toml For**:
- Project-wide defaults
- Scoped registry configurations
- Permanent settings
- Version-controlled configurations
- Team-shared settings

---

## Security Best Practices

### 1. Never Commit Secrets

❌ **Don't**:
```bash
# Don't commit tokens in bunfig.toml
[install.scopes."@graph"]
token = "actual-secret-token"  # ❌ BAD
```

✅ **Do**:
```toml
# Use environment variable references
[install.scopes."@graph"]
token = "$GRAPH_NPM_TOKEN"  # ✅ GOOD
```

### 2. Use CI/CD Secrets

✅ **GitHub Actions**:
```yaml
env:
  BUN_CONFIG_REGISTRY: ${{ secrets.NPM_REGISTRY_URL }}
  GRAPH_NPM_TOKEN: ${{ secrets.GRAPH_NPM_TOKEN }}
```

### 3. Use Bun.secrets for Local Development

✅ **Local Development**:
```bash
# Store tokens securely
bun run scripts/registry-secrets.ts set @graph --token <token>

# bunfig.toml loads from Bun.secrets automatically
[install.scopes."@graph"]
token = "$GRAPH_NPM_TOKEN"  # Loads from Bun.secrets
```

---

## Complete Example: CI/CD Setup

**`.github/workflows/ci.yml`**:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Bun
        uses: oven-sh/setup-bun@v2
      
      - name: Install dependencies
        env:
          # Override registry for CI
          BUN_CONFIG_REGISTRY: ${{ secrets.NPM_REGISTRY_URL }}
          # Ensure lockfile is validated
          BUN_CONFIG_SKIP_SAVE_LOCKFILE: 0
          BUN_CONFIG_SKIP_LOAD_LOCKFILE: 0
          # Scoped package tokens
          GRAPH_NPM_TOKEN: ${{ secrets.GRAPH_NPM_TOKEN }}
        run: bun ci  # Equivalent to bun install --frozen-lockfile
      
      - name: Run tests
        run: bun test
```

---

## Troubleshooting

### Issue: Environment Variable Not Applied

**Problem**: Setting `BUN_CONFIG_REGISTRY` but still using default registry.

**Solution**:
```bash
# Verify environment variable is set
echo $BUN_CONFIG_REGISTRY

# Use explicit export
export BUN_CONFIG_REGISTRY="https://npm.internal.yourcompany.com"
bun install

# Or inline
BUN_CONFIG_REGISTRY="https://npm.internal.yourcompany.com" bun install --verbose
```

---

### Issue: Scoped Registry Override

**Problem**: `BUN_CONFIG_REGISTRY` overrides scoped registries in `bunfig.toml`.

**Solution**: Don't set `BUN_CONFIG_REGISTRY` globally. Instead:
- Use scoped registry configs in `bunfig.toml`
- Or set per-scope environment variables (if supported)
- Or use `--registry` CLI flag per command

---

### Issue: Lockfile Not Updating

**Problem**: Changes to `package.json` not reflected in `bun.lock`.

**Solution**:
```bash
# Ensure lockfile loading isn't skipped
unset BUN_CONFIG_SKIP_LOAD_LOCKFILE

# Force update
bun install
```

---

## Quick Reference

| Variable | Purpose | Default |
|----------|---------|---------|
| `BUN_CONFIG_REGISTRY` | npm registry URL | `https://registry.npmjs.org` |
| `BUN_CONFIG_TOKEN` | Auth token | (none) |
| `BUN_CONFIG_YARN_LOCKFILE` | Generate yarn.lock | `false` |
| `BUN_CONFIG_SKIP_SAVE_LOCKFILE` | Don't save lockfile | `false` |
| `BUN_CONFIG_SKIP_LOAD_LOCKFILE` | Don't load lockfile | `false` |
| `BUN_CONFIG_SKIP_INSTALL_PACKAGES` | Don't install packages | `false` |
| `BUN_CONFIG_LINK_NATIVE_BINS` | Link platform-specific bins | `false` |

---

## Related Documentation

- [Bun Install Configuration](./BUNFIG-CONFIGURATION.md) - Complete `bunfig.toml` reference
- [Bun Workspaces](./BUN-WORKSPACES.md) - Workspace configuration
- [Bun Registry Secrets](./BUN-REGISTRY-SECRETS.md) - Secure token storage
- [Bun Config Flag](./BUN-CONFIG-FLAG.md) - Using `--config` flag

---

## Official Documentation

- **[Bun Install - Environment Variables](https://bun.com/docs/pm/cli/install#configuring-with-environment-variables)** - Official reference




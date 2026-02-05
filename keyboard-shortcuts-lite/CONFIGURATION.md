# 📋 Package Manager Configuration Guide

## Overview

The `keyboard-shortcuts-lite` library supports both **npm** and **Bun** package managers with full configuration compatibility. This guide shows how to configure both systems for optimal performance and security.

## 🔄 Configuration Files

### Primary: `bunfig.toml` (Recommended)

- **Purpose**: Bun-native configuration with advanced features
- **Location**: Project root or `~/.bunfig.toml`
- **Benefits**: More options, better performance, Bun-specific features

### Secondary: `.npmrc` (Compatibility)

- **Purpose**: npm compatibility and migration support
- **Location**: Project root or `~/.npmrc`
- **Benefits**: Works with npm, easy migration path

## ⚙️ Configuration Comparison

### Registry Configuration

#### `.npmrc` format

```ini
# Default registry
registry=https://registry.npmjs.org

# Scope-specific registry
@myorg:registry=https://your-bucket.com/packages

# Authentication
//your-bucket.com/:_authToken=${BUCKET_TOKEN}
```

#### `bunfig.toml` equivalent

```toml
[install]
registry = "https://registry.npmjs.org"

[install.scopes]
myorg = "https://your-bucket.com/packages"

# Advanced auth with multiple options
[install.scopes.myorg]
url = "https://your-bucket.com/packages"
token = "${BUCKET_TOKEN}"
```

### Installation Strategy

#### `.npmrc` format

```ini
# npm style
install-strategy=hoisted

# pnpm/yarn style
node-linker=hoisted
```

#### `bunfig.toml` equivalent

```toml
[install]
linker = "hoisted"
```

### Security & Performance

#### `.npmrc` format

```ini
save-exact=false
cache=true
ignore-scripts=false
dry-run=false
```

#### `bunfig.toml` equivalent

```toml
[install]
exact = false
cache = true
ignoreScripts = false
dryRun = false
```

## 🚀 Recommended Setup for keyboard-shortcuts-lite

### Production Configuration

#### `bunfig.toml` (Recommended)

```toml
[install]
# Production-optimized settings
production = true
minimumReleaseAge = 604800  # 1 week for production
linker = "hoisted"
cache = true
exact = false

[install.registry]
url = "https://your-bucket.com/packages"
token = "${BUCKET_AUTH_TOKEN}"

# Security settings
[install.security]
enabled = true
minimumReleaseAge = 604800

# Performance optimization
[install.performance]
backend = "clonefile"
networkConcurrency = 48
```

#### `.npmrc` (Fallback)

```ini
# Production registry
registry=https://your-bucket.com/packages

# Authentication
//your-bucket.com/:_authToken=${BUCKET_AUTH_TOKEN}

# Security
save-exact=false
cache=true
ignore-scripts=false

# Installation strategy
install-strategy=hoisted
```

### Development Configuration

#### `bunfig.toml`

```toml
[install]
# Development-friendly settings
dev = true
minimumReleaseAge = 0  # Allow fresh packages
verbose = true
linker = "hoisted"

[install.registry]
url = "https://registry.npmjs.org"

# Faster installs for development
[install.performance]
backend = "clonefile"
networkConcurrency = 48
```

#### `.npmrc`

```ini
# Development registry
registry=https://registry.npmjs.org

# Development settings
save-exact=false
cache=true
link-workspace-packages=true

# Allow fresh packages
# (no age restriction in npmrc)
```

## 🔄 Migration from npm to Bun

### Step 1: Keep `.npmrc` for compatibility

```bash
# Your existing .npmrc continues to work
bun install  # Will read .npmrc automatically
```

### Step 2: Create `bunfig.toml` for advanced features

```bash
# Gradually migrate to bunfig.toml
# Bun will merge both configurations
bun install  # Uses merged config
```

### Step 3: Optimize with Bun-specific features

```toml
# Add Bun-only features like minimumReleaseAge
[install]
minimumReleaseAge = 259200  # 3 days stability check
```

## 📦 Usage Examples

### Install from Different Sources

#### GitHub (Direct)

```bash
bun add https://github.com/brendadeeznuts1111/keyboard-shortcuts-lite
```

#### npm Registry

```bash
bun add keyboard-shortcuts-lite  # Uses .npmrc/bunfig.toml registry
```

#### Bucket System

```bash
# Configure in .npmrc:
# registry=https://your-bucket.com/packages

bun add keyboard-shortcuts-lite
```

### Install with Security Features

#### Age-Gated Installation

```bash
bun install --minimum-release-age 259200
```

#### Exact Versions

```bash
bun add keyboard-shortcuts-lite@1.0.0 --exact
```

#### Development Mode

```bash
bun install --dev --minimum-release-age 0
```

## 🛡️ Security Best Practices

### 1. Use Environment Variables for Tokens

```ini
# .npmrc
//your-bucket.com/:_authToken=${BUCKET_TOKEN}
```

```toml
# bunfig.toml
[install.registry]
token = "${BUCKET_TOKEN}"
```

### 2. Enable Age Gating

```toml
# bunfig.toml
[install]
minimumReleaseAge = 259200  # 3 days
```

### 3. Use Private Registries

```ini
# .npmrc
@myorg:registry=https://your-private-registry.com
```

```toml
# bunfig.toml
[install.scopes]
myorg = "https://your-private-registry.com"
```

## 📊 Performance Comparison

| Feature | .npmrc | bunfig.toml | Winner |
|---------|--------|-------------|---------|
| Basic Config | ✅ | ✅ | Tie |
| Age Gating | ❌ | ✅ | bunfig.toml |
| Performance Options | ❌ | ✅ | bunfig.toml |
| Security Features | ⚠️ | ✅ | bunfig.toml |
| Bucket Integration | ⚠️ | ✅ | bunfig.toml |
| npm Compatibility | ✅ | ✅ | Tie |

## 🎯 Recommendation

**Use `bunfig.toml` as primary** with `.npmrc` as fallback for:

1. **Maximum Performance**: Bun-specific optimizations
2. **Enhanced Security**: Age gating and advanced auth
3. **Bucket Integration**: Native support for your systems
4. **Future-Proof**: Continued Bun development and features

**Keep `.npmrc` for:**
1. **npm Compatibility**: Teams still using npm
2. **Migration Path**: Gradual transition to Bun
3. **CI/CD Systems**: Existing npm-based workflows

---

**Ready to configure?** Start with `bunfig.toml` for the best experience! 🚀

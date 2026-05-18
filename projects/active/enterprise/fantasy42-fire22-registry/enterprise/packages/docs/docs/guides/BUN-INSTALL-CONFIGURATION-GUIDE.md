# 🔧 **Fire22 Enterprise - Bun Install Configuration Guide**

## 📋 **Overview**

This comprehensive guide covers all Bun package manager installation
configuration options implemented in the Fire22 enterprise system. Each
configuration option is explained with practical examples and enterprise use
cases.

## 🏗️ **Complete Configuration Structure**

### **Primary Configuration Sections**

```toml
# Core installation behavior
[install]

# Scoped registry configuration
[install.scopes]

# Cache management
[install.cache]

# Lockfile handling
[install.lockfile]

# CA certificate configuration
[install.ca]

# Security scanning
[install.security]
```

## 📦 **Installation Behavior Configuration**

### **Dependency Types**

```toml
[install]
# Install development dependencies
dev = true

# Install optional dependencies
optional = true

# Install peer dependencies
peer = true

# Production mode
production = false
```

**Practical Usage:**

```bash
# Development installation (includes all deps)
bun install

# Production installation (excludes dev deps)
bun install --production

# Override specific behaviors
bun install --no-optional
bun install --no-peer
```

### **Version Management**

```toml
[install]
# Use exact versions or caret ranges
exact = false

# Allow lockfile updates
frozenLockfile = false

# Dry run mode
dryRun = false
```

**Version Control Examples:**

```bash
# Install with exact version (overrides config)
bun add lodash --exact
# package.json: "lodash": "4.17.21"

# Install with caret range (default behavior)
bun add express
# package.json: "express": "^4.18.0"

# Dry run (no actual installation)
bun install --dry-run

# Frozen lockfile (CI/CD)
bun install --frozen-lockfile
```

## 🌐 **Registry & Authentication**

### **Primary Registry**

```toml
[install]
# Registry with authentication
registry = { url = "https://registry.npmjs.org", token = "$FIRE22_REGISTRY_TOKEN" }
```

### **Scoped Registries**

```toml
[install.scopes]
# Public scoped registry
fire22 = { url = "https://registry.npmjs.org" }

# Enterprise registry with token
enterprise = { token = "$FIRE22_ENTERPRISE_TOKEN", url = "https://npm.enterprise.com" }

# Private registry with credentials
private = { username = "$FIRE22_PRIVATE_USER", password = "$FIRE22_PRIVATE_PASS", url = "https://npm.private.com" }
```

**Authentication Methods:**

```bash
# Environment variables for security
export FIRE22_REGISTRY_TOKEN="your-registry-token"
export FIRE22_ENTERPRISE_TOKEN="enterprise-token"
export FIRE22_PRIVATE_USER="service-account"
export FIRE22_PRIVATE_PASS="secure-password"
```

## 💾 **Cache & Performance**

### **Cache Configuration**

```toml
[install.cache]
# Cache directory
dir = "~/.bun/install/cache"

# Enable/disable caching
disable = false

# Cache manifest files
disableManifest = false
```

**Performance Benefits:**

- ✅ **Faster Installations**: Reuse cached packages
- ✅ **Reduced Network Usage**: Local cache storage
- ✅ **Enterprise Scaling**: Shared cache across team
- ✅ **Offline Support**: Work with cached packages

### **Global Package Management**

```toml
[install]
# Global package installation directory
globalDir = "~/.bun/install/global"

# Global binary symlinks
globalBinDir = "~/.bun/bin"
```

## 🔄 **Lockfile & Workspace Management**

### **Lockfile Configuration**

```toml
[install]
# Generate human-readable lockfiles
saveTextLockfile = true

[install.lockfile]
# Generate lockfile
save = true

# Generate compatibility lockfiles
print = "yarn"
```

**Lockfile Benefits:**

- ✅ **Human-Readable**: Text format for collaboration
- ✅ **Version Control**: Track dependency changes
- ✅ **Cross-Tool**: Generate yarn.lock for compatibility
- ✅ **Deterministic**: Reproducible installations

### **Workspace Configuration**

```toml
[install]
# Enable monorepo workspace linking
linkWorkspacePackages = true

# Dependency isolation
linker = "isolated"
```

**Monorepo Benefits:**

- ✅ **Cross-Package Development**: Seamless workspace linking
- ✅ **Dependency Isolation**: Prevent conflicts between packages
- ✅ **Hot Reloading**: Fast development iteration
- ✅ **Enterprise Scale**: Handle large monorepo structures

## 🚀 **Auto-Install Behavior**

### **Auto-Install Modes**

```toml
[install]
auto = "auto"  # Recommended for development
```

**Available Modes:**

- `"auto"`: Smart mode (recommended)
  - Use local node_modules if exists
  - Auto-install when missing
- `"force"`: Always auto-install
  - Ignore local node_modules
  - Always install on-demand
- `"disable"`: Never auto-install
  - Require explicit commands
- `"fallback"`: Check local first
  - Use CLI: `bun -i` or `bun --install=fallback`

**Practical Examples:**

```bash
# Enable fallback mode for current session
bun -i
bun --install=fallback

# Force auto-install for debugging
bun install --auto=force

# Disable auto-install for production
export BUN_INSTALL_AUTO=disable
```

## 🔐 **CA Certificate Configuration**

### **Enterprise Proxy Support**

```toml
# CA certificate file path
cafile = "~/.bun/certs/ca-bundle.crt"
```

**Enterprise Benefits:**

- ✅ **Corporate Proxy Support**: Handle enterprise firewalls
- ✅ **Custom CA Certificates**: Support internal certificate authorities
- ✅ **Secure Downloads**: Validate package integrity
- ✅ **Compliance**: Meet enterprise security requirements

## 🎯 **Practical Usage Scenarios**

### **Development Environment**

```bash
# Full development setup
bun install
# → dev=true, optional=true, peer=true
# → linker=isolated for security
# → auto=auto for convenience
# → Security scanning enabled
```

### **Production Deployment**

```bash
# Optimized production installation
bun install --production
# → Excludes devDependencies
# → Minimal runtime footprint
# → Frozen lockfile for consistency
```

### **CI/CD Pipeline**

```bash
# Reproducible CI/CD builds
bun install --frozen-lockfile
# → Fail if lockfile outdated
# → Ensure consistent environments
# → Security scanning included
```

### **Testing & Validation**

```bash
# Dry run for testing
bun install --dry-run
# → Show installation plan
# → No actual package downloads
# → Validate configuration
```

### **Enterprise Registry Usage**

```bash
# Install from enterprise registry
bun add @enterprise/package
# → Uses enterprise scoped registry
# → Automatic token authentication
# → Enterprise security policies
```

## 🏢 **Enterprise Configuration Examples**

### **Corporate Environment**

```toml
[install]
registry = { url = "https://registry.company.com", token = "$COMPANY_REGISTRY_TOKEN" }
frozenLockfile = true
saveTextLockfile = true

[install.scopes]
company = { token = "$COMPANY_TOKEN", url = "https://npm.company.com" }

[install.cache]
dir = "/shared/cache/bun"

[install.ca]
cafile = "/etc/company/certs/ca-bundle.crt"
```

### **Open Source Project**

```toml
[install]
registry = { url = "https://registry.npmjs.org", token = "$NPM_TOKEN" }
exact = false
saveTextLockfile = true

[install.cache]
disable = false

[install.lockfile]
print = "yarn"
```

### **High-Security Environment**

```toml
[install]
frozenLockfile = true
saveTextLockfile = true
linker = "isolated"

[install.security]
enable = true
level = "fatal"

[install.cache]
disableManifest = true

[install.ca]
cafile = "/etc/security/ca-bundle.crt"
```

## 📊 **Configuration Impact Analysis**

| Configuration              | Performance | Security   | Compatibility |
| -------------------------- | ----------- | ---------- | ------------- |
| `linker = "isolated"`      | 🟡 Medium   | 🟢 High    | 🟢 High       |
| `frozenLockfile = true`    | 🟢 High     | 🟢 High    | 🟢 High       |
| `saveTextLockfile = true`  | 🟡 Medium   | 🟢 High    | 🟢 High       |
| `cache = enabled`          | 🟢 High     | 🟢 Neutral | 🟢 High       |
| `auto = "auto"`            | 🟢 High     | 🟡 Medium  | 🟢 High       |
| `registry = authenticated` | 🟢 Neutral  | 🟢 High    | 🟢 High       |

## 🔧 **Advanced Configuration**

### **Conditional Configuration**

```toml
# Environment-specific settings
[install]
frozenLockfile = false  # Development default

# Override in production
# frozenLockfile = true  # Uncomment for production
```

### **Dynamic Registry Selection**

```toml
# Environment-based registry
[install]
registry = { url = "https://registry.npmjs.org", token = "$NPM_TOKEN" }

[install.scopes]
staging = { url = "https://staging.npmjs.com", token = "$STAGING_TOKEN" }
production = { url = "https://npm.company.com", token = "$PROD_TOKEN" }
```

### **Performance Tuning**

```toml
# High-performance configuration
[install]
auto = "fallback"
saveTextLockfile = false  # Use binary lockfile
frozenLockfile = false

[install.cache]
disableManifest = false
dir = "/fast/ssd/cache/bun"
```

## 🎯 **Best Practices**

### **🔐 Security Best Practices**

1. **Use isolated linker** for dependency security
2. **Enable frozen lockfiles** in production
3. **Configure authenticated registries** for private packages
4. **Set up CA certificates** for enterprise proxies
5. **Enable security scanning** with appropriate levels

### **⚡ Performance Best Practices**

1. **Enable caching** for faster installations
2. **Use auto=fallback** for development efficiency
3. **Configure appropriate timeouts** for your network
4. **Use binary lockfiles** for large projects
5. **Set up shared caches** in enterprise environments

### **👥 Collaboration Best Practices**

1. **Use text lockfiles** for version control
2. **Enable workspace linking** for monorepos
3. **Configure scoped registries** for team packages
4. **Use exact versions** sparingly (prefer caret ranges)
5. **Document configuration** for team consistency

### **🚀 CI/CD Best Practices**

1. **Use frozen lockfiles** for reproducible builds
2. **Enable dry runs** for testing
3. **Configure appropriate timeouts** for CI environments
4. **Use authenticated registries** for private packages
5. **Set up proper caching** for faster pipelines

## 🎉 **Configuration Complete!**

Your Fire22 project now has **enterprise-grade Bun package manager
configuration** with:

- ✅ **Comprehensive installation behavior control**
- ✅ **Multi-registry support with authentication**
- ✅ **Enterprise security through isolation**
- ✅ **Performance optimization with caching**
- ✅ **Monorepo workspace support**
- ✅ **CI/CD pipeline integration**
- ✅ **Cross-platform compatibility**
- ✅ **Human-readable lockfiles for collaboration**

**🚀 Ready for enterprise-scale development and deployment!**

---

**🔧 Quick Commands:**

```bash
# View current configuration
bun run install-config-demo

# Test installation behavior
bun install --dry-run

# Check frozen lockfile
bun install --frozen-lockfile

# Force exact version
bun add package --exact
```

**📚 Configuration Reference:**

- `bunfig.toml`: Complete configuration file
- `scripts/bun-install-config-demo.js`: Interactive demonstration
- Enterprise documentation: Comprehensive setup guide

# 🔧 **Fire22 Enterprise - Bun Package Manager Configuration Guide**

## 📋 **Overview**

This comprehensive guide covers all Bun package manager configuration options
implemented in the Fire22 enterprise system. Each configuration option is
explained with practical examples and enterprise use cases.

## 🏗️ **Complete Configuration Structure**

### **Primary Configuration Sections**

```toml
# Main package manager configuration
[install]

# Scoped registry configuration
[install.scopes]

# Cache management
[install.cache]

# Lockfile handling
[install.lockfile]

# Security scanning
[install.security]

# Script execution
[run]

# Version management
[version]
```

## 📦 **Installation Configuration**

### **Registry Settings**

```toml
[install]
# Default npm registry for all packages
registry = "https://registry.npmjs.org"

# Scoped registry for @fire22 packages
[install.scopes]
fire22 = { url = "https://registry.npmjs.org" }
```

**Enterprise Benefits:**

- ✅ Centralized package source control
- ✅ Support for private enterprise registries
- ✅ Scoped package management for organizations

### **Dependency Installation Behavior**

```toml
[install]
# Install development dependencies (default: true)
dev = true

# Install optional dependencies (default: true)
optional = true

# Install peer dependencies (default: true)
peer = true

# Production mode (default: false)
production = false
```

**Use Cases:**

```bash
# Development installation (includes dev deps)
bun install

# Production installation (excludes dev deps)
bun install --production

# Override config with CLI flags
bun install --no-optional
```

### **Dependency Resolution**

```toml
[install]
# Use exact versions instead of caret ranges
exact = false

# Prevent lockfile updates
frozenLockfile = false

# Dry run mode (no actual installation)
dryRun = false
```

**Practical Examples:**

```bash
# Install with exact versions
bun add lodash --exact

# Check what would be installed
bun install --dry-run

# Prevent lockfile changes
bun install --frozen-lockfile
```

### **Auto-Installation Behavior**

```toml
[install]
# Auto-install modes: "auto", "force", "disable", "fallback"
auto = "auto"
```

**Modes Explained:**

- `"auto"`: Install when no node_modules exists
- `"force"`: Always auto-install
- `"disable"`: Never auto-install
- `"fallback"`: Check local, then auto-install

### **Workspace Linking**

```toml
[install]
# Link workspace packages to node_modules
linkWorkspacePackages = true
```

**Benefits for Monorepos:**

- ✅ Seamless cross-package development
- ✅ Proper dependency resolution
- ✅ Hot reloading support

### **Lockfile Management**

```toml
[install]
# Generate text-based lockfile (default: true)
saveTextLockfile = true

[install.lockfile]
# Generate lockfile on install
save = true

# Generate additional lockfile formats
print = "yarn"
```

**Enterprise Benefits:**

- ✅ Human-readable lockfiles
- ✅ Version control friendly
- ✅ Multi-tool compatibility

## 🔒 **Security Configuration**

### **Security Scanner Setup**

```toml
[install.security]
# Custom Fire22 security scanner
scanner = "fire22-security-scanner"

# Security level: "fatal" or "warn"
level = "fatal"

# Enable security scanning
enable = true
```

### **Security Options**

```toml
[install.security.options]
# Scan for license compliance
license_check = true

# Detect malicious packages
malware_scan = true

# Check for security updates
vulnerability_check = true

# Enterprise security mode
enterprise_mode = true
```

### **Custom Fire22 Policies**

```toml
[install.security.fire22]
# Trust only verified registries
trusted_registries_only = true

# Require security audits
require_audit = true

# Custom security policies
policies = [
    "no-typosquatting",
    "no-malicious-code",
    "license-compliance",
    "supply-chain-security"
]
```

## 💾 **Cache Configuration**

```toml
[install.cache]
# Cache directory location
dir = "~/.bun/install/cache"

# Enable/disable caching
disable = false

# Cache manifest files
disableManifest = false
```

**Performance Benefits:**

- ✅ Faster subsequent installations
- ✅ Reduced network usage
- ✅ Enterprise-wide cache sharing

## 📂 **Directory Configuration**

```toml
[install]
# Global package installation directory
globalDir = "~/.bun/install/global"

# Global binary symlinks directory
globalBinDir = "~/.bun/bin"
```

**Enterprise Benefits:**

- ✅ Centralized global package management
- ✅ Consistent binary locations
- ✅ Team environment standardization

## 🚀 **Run Configuration**

### **Shell Selection**

```toml
[run]
# Use Bun's shell or system shell
shell = "bun"
```

**Cross-Platform Benefits:**

- ✅ Consistent behavior across Windows/macOS/Linux
- ✅ Advanced shell features on all platforms
- ✅ Better scripting capabilities

### **Node.js Compatibility**

```toml
[run]
# Auto-alias node commands to bun
bun = true

# Suppress command output
silent = false
```

**Migration Benefits:**

- ✅ Seamless transition from Node.js
- ✅ Existing scripts work without changes
- ✅ Bun performance with Node.js compatibility

## 🎯 **Practical Usage Examples**

### **Development Workflow**

```bash
# Standard development installation
bun install
# → Includes dev, optional, and peer dependencies
# → Runs security scans
# → Uses cached dependencies
# → Links workspace packages

# Add new dependency with security scan
bun add axios
# → Security scan → License check → Installation

# Run development scripts
bun run dev
# → Uses Bun shell with node aliasing
```

### **Production Deployment**

```bash
# Production installation
bun install --production
# → Excludes dev dependencies
# → Minimal footprint
# → Security scans still run

# Frozen lockfile for CI/CD
bun install --frozen-lockfile
# → Fail if lockfile needs updates
# → Ensure reproducible builds
```

### **Security Operations**

```bash
# Run security audit
bun run security:audit

# Manual security scan
bun run security:scan

# Check dependency analysis
bun run deps:analyze

# Bundle size analysis
bun run analyze:bundle
```

### **Package Management**

```bash
# View current configuration
bun pm pkg get

# Check dependencies
bun pm pkg get dependencies devDependencies

# Add new dependency
bun pm pkg set dependencies.new-package="^1.0.0"

# Update scripts
bun pm pkg set scripts.new-task="bun run command"
```

## 🏢 **Enterprise Scenarios**

### **Scenario 1: Secure Development Environment**

```toml
[install]
dev = true
optional = true
peer = true

[install.security]
enable = true
level = "fatal"

[run]
shell = "bun"
bun = true
```

**Benefits:**

- All dependencies installed for development
- Security scans prevent malicious packages
- Consistent shell behavior
- Node.js compatibility maintained

### **Scenario 2: Production Deployment**

```bash
bun install --production --frozen-lockfile
```

**Benefits:**

- Minimal production footprint
- Reproducible builds
- Security maintained
- Performance optimized

### **Scenario 3: CI/CD Pipeline**

```yaml
- name: Install Dependencies
  run: bun install --frozen-lockfile

- name: Security Audit
  run: bun run security:audit

- name: Bundle Analysis
  run: bun run analyze:bundle
```

**Benefits:**

- Fast, cached installations
- Security gates prevent vulnerabilities
- Bundle size monitoring
- Reproducible CI/CD runs

## 📊 **Configuration Impact Analysis**

### **Performance Impact**

| Configuration             | Performance Impact | Use Case    |
| ------------------------- | ------------------ | ----------- |
| `cache = true`            | 🚀 Faster installs | Development |
| `linker = "isolated"`     | 🛡️ Deterministic   | Enterprise  |
| `saveTextLockfile = true` | 👥 Collaborative   | Teams       |
| `auto = "auto"`           | ⚡ Faster dev      | Development |

### **Security Impact**

| Configuration             | Security Impact             | Use Case   |
| ------------------------- | --------------------------- | ---------- |
| Security scanner          | 🛡️ Vulnerability prevention | All        |
| `trusted_registries_only` | 🔒 Supply chain security    | Enterprise |
| License checking          | 📋 Compliance               | Enterprise |
| Malware scanning          | 🚫 Threat prevention        | All        |

### **Developer Experience**

| Configuration    | DX Impact             | Use Case          |
| ---------------- | --------------------- | ----------------- |
| `shell = "bun"`  | 🔧 Consistent         | Cross-platform    |
| `bun = true`     | 🔄 Seamless migration | Node.js migration |
| `silent = false` | 📋 Informative        | Development       |

## 🚀 **Advanced Configuration**

### **Environment-Specific Configuration**

```toml
# .env support
[install]
registry = { url = "https://registry.npmjs.org", token = "$NPM_TOKEN" }

[install.scopes]
company = { url = "https://npm.company.com", username = "$NPM_USER", password = "$NPM_PASS" }
```

### **Conditional Configuration**

```toml
# Platform-specific settings
[install]
# Use different linker based on environment
linker = "isolated"  # Always isolated for security

[run]
# Use system shell in CI
shell = "system"  # Override to "bun" locally
```

### **Custom Scripts Integration**

```json
{
  "scripts": {
    "install:secure": "bun install",
    "install:production": "bun install --production --frozen-lockfile",
    "audit:full": "bun run security:audit && bun run deps:analyze",
    "build:analyze": "bun run build && bun run analyze:bundle"
  }
}
```

## 🎯 **Best Practices Summary**

### **✅ Enterprise Recommendations**

1. **Always use isolated linker** for security and determinism
2. **Enable security scanning** with fatal level for production
3. **Use caching** for development performance
4. **Configure trusted registries** for supply chain security
5. **Enable text lockfiles** for team collaboration

### **✅ Development Optimization**

1. **Use Bun shell** for cross-platform consistency
2. **Enable node aliasing** for seamless migration
3. **Configure auto-install** for faster development
4. **Set up workspace linking** for monorepo development

### **✅ Production Readiness**

1. **Use frozen lockfiles** in CI/CD
2. **Enable production mode** for deployments
3. **Configure security gates** in pipelines
4. **Monitor bundle sizes** and dependencies

## 🎉 **Configuration Complete!**

Your Fire22 project now has **enterprise-grade package management** with:

- ✅ **Comprehensive security scanning** protecting against vulnerabilities
- ✅ **Isolated dependencies** ensuring deterministic builds
- ✅ **Performance optimizations** with intelligent caching
- ✅ **Cross-platform consistency** with Bun shell
- ✅ **Enterprise registry support** for private packages
- ✅ **CI/CD integration** with security gates and monitoring
- ✅ **Developer experience** optimized for productivity

**🚀 Ready for enterprise-scale development and deployment!**

---

**📚 Quick Reference:**

```bash
# View configuration
bun pm pkg get

# Run security audit
bun run security:audit

# Analyze dependencies
bun run deps:analyze

# View demo
bun run pm-config-demo
```

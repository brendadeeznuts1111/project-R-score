# 🔧 **Fire22 Enterprise - Complete Bunfig Configuration Guide**

## 📋 **Overview**

This comprehensive guide covers all Bun configuration options implemented in the
Fire22 enterprise system. The `bunfig.toml` file configures Bun's behavior for
runtime, testing, package management, and enterprise features.

## 🏗️ **Complete Configuration Structure**

### **Configuration File Location**

```bash
# Project root (recommended)
./bunfig.toml

# Global configuration
~/.bunfig.toml
$XDG_CONFIG_HOME/.bunfig.toml
```

### **Configuration Hierarchy**

```
CLI Flags > Local bunfig.toml > Global bunfig.toml > Defaults
```

## 🚀 **Runtime Configuration**

### **Preload Scripts**

```toml
# Scripts executed before any Bun command
preload = ["./scripts/preload.ts"]
```

**Enterprise Benefits:**

- ✅ Global enterprise environment setup
- ✅ Plugin registration and initialization
- ✅ Error handling and monitoring setup
- ✅ Security policy enforcement

### **Performance & Memory**

```toml
# Memory optimization (reduce memory usage at cost of performance)
smol = false

# Logging level
logLevel = "warn"
```

**Configuration Options:**

- `"debug"`: Verbose logging for development
- `"warn"`: Warnings and errors (recommended for enterprise)
- `"error"`: Errors only (production)

### **JSX Configuration**

```toml
# JSX transformation settings
jsx = "react"
jsxFactory = "React.createElement"
jsxFragment = "React.Fragment"
jsxImportSource = "react"
```

**Supported JSX Modes:**

- `"react"`: React.createElement calls
- `"react-jsx"`: JSX runtime (\_jsx calls)
- `"preact"`: Preact-compatible JSX

### **Global Definitions**

```toml
# Replace identifiers with constant expressions
[define]
"process.env.NODE_ENV" = "'development'"
"process.env.FIRE22_ENV" = "'enterprise'"
"__DEV__" = "true"
```

**Enterprise Use Cases:**

- Environment-specific constants
- Feature flags and toggles
- Build-time configuration injection

### **Custom File Loaders**

```toml
# Map file extensions to loaders
[loader]
".fire22" = "ts"
".enterprise" = "tsx"
".config" = "json"
```

**Supported Loaders:**

- `jsx`, `js`, `ts`, `tsx`: JavaScript/TypeScript
- `css`: Stylesheets
- `json`: JSON files
- `text`: Plain text
- `file`: Binary files

### **Console Output**

```toml
# Console logging configuration
[console]
depth = 4
```

**Benefits:**

- ✅ Deeper object inspection for debugging
- ✅ Better development experience
- ✅ Consistent output formatting

### **Telemetry & Privacy**

```toml
# Analytics and telemetry (disabled for enterprise privacy)
telemetry = false
```

**Enterprise Considerations:**

- Privacy compliance (GDPR, CCPA)
- Data sovereignty requirements
- Corporate policy adherence

## 🧪 **Test Runner Configuration**

### **Test Discovery**

```toml
# Test runner configuration
[test]
root = "./src"
preload = ["./test/setup.ts"]
smol = false
coverage = true
```

**Test Root Options:**

- `"."`: Current directory
- `"./src"`: Source directory (recommended)
- `"./__tests__"`: Dedicated test directory

### **Coverage Configuration**

```toml
# Coverage thresholds (enterprise quality standards)
coverageThreshold = { line = 0.8, function = 0.85, statement = 0.8 }

# Skip test files from coverage
coverageSkipTestFiles = true

# Coverage report formats
coverageReporter = ["text", "lcov", "html"]

# Custom coverage directory
coverageDir = "./coverage/fire22"
```

**Coverage Thresholds:**

- `line`: Line-level coverage percentage
- `function`: Function-level coverage percentage
- `statement`: Statement-level coverage percentage

### **Coverage Exclusions**

```toml
# Exclude files/patterns from coverage
coveragePathIgnorePatterns = [
  "**/*.config.*",    # Configuration files
  "**/*.d.ts",        # TypeScript declarations
  "**/build/**",      # Build artifacts
  "**/dist/**",       # Distribution files
  "**/node_modules/**", # Dependencies
  "**/scripts/**",    # Build scripts
  "**/test/**"        # Test files
]
```

## 📦 **Package Manager Configuration**

### **Registry Configuration**

```toml
# Primary registry with authentication
registry = { url = "https://registry.npmjs.org", token = "$FIRE22_REGISTRY_TOKEN" }

# Scoped registries
[install.scopes]
fire22 = { url = "https://registry.npmjs.org" }
enterprise = { token = "$FIRE22_ENTERPRISE_TOKEN", url = "https://npm.enterprise.com" }
private = { username = "$FIRE22_PRIVATE_USER", password = "$FIRE22_PRIVATE_PASS", url = "https://npm.private.com" }
```

### **Dependency Installation**

```toml
# Dependency types to install
dev = true
optional = true
peer = true
production = false

# Version management
exact = false
frozenLockfile = false
dryRun = false
```

### **Lockfile Management**

```toml
# Lockfile format
saveTextLockfile = true

# Generate additional formats
[install.lockfile]
save = true
print = "yarn"
```

### **Workspace & Linking**

```toml
# Workspace package linking
linkWorkspacePackages = true

# Dependency isolation
linker = "isolated"
```

**Linker Options:**

- `"hoisted"`: Traditional node_modules structure
- `"isolated"`: Strict dependency isolation (recommended for enterprise)

### **Auto-Installation**

```toml
# Auto-install behavior
auto = "auto"
```

**Auto-Install Modes:**

- `"auto"`: Smart mode (recommended)
- `"force"`: Always auto-install
- `"disable"`: Never auto-install
- `"fallback"`: Check local, then auto-install

### **Cache Configuration**

```toml
# Cache management
[install.cache]
dir = "~/.bun/install/cache"
disable = false
disableManifest = false
```

### **Global Package Management**

```toml
# Global package directories
globalDir = "~/.bun/install/global"
globalBinDir = "~/.bun/bin"
```

### **CA Certificate Configuration**

```toml
# Enterprise proxy support
cafile = "~/.bun/certs/ca-bundle.crt"
```

## 🔒 **Security Configuration**

### **Security Scanner**

```toml
# Enterprise security scanning
[install.security]
scanner = "packages/fire22-security-scanner/src/index.ts"
level = "fatal"
enable = true
```

### **Security Options**

```toml
[install.security.options]
license_check = true
malware_scan = true
vulnerability_check = true
enterprise_mode = true
```

### **Enterprise Security Policies**

```toml
[install.security.fire22]
trusted_registries_only = true
require_audit = true
policies = [
    "no-typosquatting",
    "no-malicious-code",
    "license-compliance",
    "supply-chain-security"
]
```

## 🎯 **Practical Usage Examples**

### **Development Workflow**

```bash
# Run with preload configuration
bun run dev
# → Preload script executes
# → Enterprise environment configured
# → Plugins and error handlers active

# Build with JSX configuration
bun build src/app.tsx
# → Uses React JSX transform
# → Applies custom factory and fragment

# Import custom file types
import config from './app.config'
# → Uses custom JSON loader
```

### **Testing with Coverage**

```bash
# Run tests with enterprise configuration
bun test
# → Test setup script loads
# → Coverage collection enabled
# → Enterprise thresholds applied

# Run with specific coverage options
bun test --coverage --coverage-reporter html
# → HTML coverage reports generated
```

### **Package Management**

```bash
# Install with security scanning
bun install
# → Enterprise security scanner active
# → Authenticated registries used
# → Isolated dependency linking

# Add package with exact version
bun add lodash --exact
# → Overrides exact=false config

# Dry run installation
bun install --dry-run
# → Shows what would be installed
```

### **Production Deployment**

```bash
# Production installation
bun install --production --frozen-lockfile
# → Excludes dev dependencies
# → Prevents lockfile changes
# → Enterprise security maintained
```

## 🏢 **Enterprise Configuration Examples**

### **Development Environment**

```toml
# Development-focused configuration
preload = ["./scripts/preload.ts"]
logLevel = "debug"
smol = false
coverage = true
auto = "auto"
frozenLockfile = false
```

### **Staging Environment**

```toml
# Quality assurance configuration
logLevel = "warn"
coverage = true
coverageThreshold = { line = 0.8, function = 0.8, statement = 0.8 }
frozenLockfile = true
auto = "fallback"
```

### **Production Environment**

```toml
# Production-optimized configuration
smol = true
logLevel = "error"
telemetry = false
frozenLockfile = true
auto = "disable"
[install.security]
level = "fatal"
```

### **Enterprise Environment**

```toml
# Maximum security and compliance
logLevel = "error"
telemetry = false
frozenLockfile = true
auto = "disable"
[install.security]
level = "fatal"
enable = true
[install.security.fire22]
trusted_registries_only = true
require_audit = true
```

## 📊 **Configuration Impact Analysis**

| Configuration Area | Development | Staging      | Production  | Enterprise  |
| ------------------ | ----------- | ------------ | ----------- | ----------- |
| **preload**        | ✅ Scripts  | ✅ Scripts   | ❌ Disabled | ✅ Security |
| **logLevel**       | `"debug"`   | `"warn"`     | `"error"`   | `"error"`   |
| **smol**           | `false`     | `false`      | `true`      | `true`      |
| **coverage**       | `true`      | `true`       | `false`     | `false`     |
| **frozenLockfile** | `false`     | `true`       | `true`      | `true`      |
| **auto**           | `"auto"`    | `"fallback"` | `"disable"` | `"disable"` |
| **security.level** | `"warn"`    | `"fatal"`    | `"fatal"`   | `"fatal"`   |

## 🚀 **Advanced Configuration**

### **Environment-Specific Overrides**

```toml
# Base configuration
logLevel = "warn"
frozenLockfile = false

# Environment-specific overrides can be handled via:
# 1. Separate bunfig.toml files per environment
# 2. Environment variables in configuration
# 3. Build-time configuration injection
```

### **Conditional Configuration**

```toml
# Use environment variables for dynamic configuration
[define]
"process.env.NODE_ENV" = "'development'"
"process.env.FIRE22_ENV" = "'enterprise'"

[install]
registry = { url = "https://registry.npmjs.org", token = "$FIRE22_REGISTRY_TOKEN" }
```

### **Custom Build Integration**

```bash
# Custom build with bunfig configuration
bun build --config bunfig.production.toml

# Override specific settings
bun run --smol dev

# Use different test configuration
bun test --config bunfig.ci.toml
```

## 🎯 **Best Practices**

### **🔐 Security Best Practices**

1. **Use isolated linker** for dependency security
2. **Enable security scanning** with appropriate levels
3. **Configure authenticated registries** for private packages
4. **Set up CA certificates** for enterprise proxies
5. **Disable telemetry** for privacy compliance

### **⚡ Performance Best Practices**

1. **Enable caching** for faster installations
2. **Use appropriate auto-install modes** for your workflow
3. **Configure coverage exclusions** to avoid unnecessary processing
4. **Use smol mode** in production for memory optimization
5. **Set appropriate console depth** for your debugging needs

### **👥 Collaboration Best Practices**

1. **Use text lockfiles** for version control compatibility
2. **Configure coverage thresholds** appropriate for your project
3. **Set up preload scripts** for consistent development environment
4. **Use custom loaders** for enterprise file types
5. **Document configuration** for team consistency

### **🚀 CI/CD Best Practices**

1. **Use frozen lockfiles** for reproducible builds
2. **Configure appropriate log levels** for CI output
3. **Set up coverage reporting** for quality gates
4. **Use dry runs** for testing deployment configurations
5. **Configure authenticated registries** for CI environments

## 🎉 **Complete Configuration Summary**

Your Fire22 project now has **enterprise-grade Bun configuration** with:

- ✅ **Runtime preload scripts** for enterprise environment setup
- ✅ **JSX configuration** optimized for React development
- ✅ **Global definitions** for environment-specific constants
- ✅ **Custom file loaders** for enterprise asset types
- ✅ **Enhanced console output** for better debugging
- ✅ **Privacy-focused telemetry** configuration
- ✅ **Comprehensive test coverage** with enterprise thresholds
- ✅ **Advanced package management** with security scanning
- ✅ **Enterprise registry support** with authentication
- ✅ **Isolated dependency management** for security
- ✅ **Cross-platform consistency** and optimization

**🚀 Ready for enterprise-scale development, testing, and deployment!**

---

**🔧 Quick Commands:**

```bash
# View configuration in action
bun run bunfig-demo

# Test runtime configuration
bun run dev

# Test test configuration
bun test

# Test package management
bun install --dry-run
```

**📚 Configuration Files:**

- `bunfig.toml`: Complete enterprise configuration
- `scripts/preload.ts`: Runtime preload script
- `test/setup.ts`: Test setup configuration
- `scripts/bunfig-config-demo.js`: Interactive demonstration

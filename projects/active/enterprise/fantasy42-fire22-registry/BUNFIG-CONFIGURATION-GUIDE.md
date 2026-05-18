# 🚀 Bunfig.toml Configuration Guide - Enterprise Edition

This comprehensive guide explains all the configuration options available in
your `bunfig.toml` file for the Fire22 Enterprise System.

## 📋 Table of Contents

- [🔧 Serve Configuration](#-serve-configuration)
- [📦 Bundle Configuration](#-bundle-configuration)
- [🎨 CSS Configuration](#-css-configuration)
- [📱 Plugin Configuration](#-plugin-configuration)
- [🧩 Macro Configuration](#-macro-configuration)
- [🔄 Transpiler Configuration](#-transpiler-configuration)
- [📊 Analytics & Monitoring](#-analytics--monitoring)
- [🔐 Security Configuration](#-security-configuration)
- [🚀 Performance Configuration](#-performance-configuration)
- [📝 Logging Configuration](#-logging-configuration)
- [🧪 Testing Configuration (Enhanced)](#-testing-configuration-enhanced)
- [📦 Package Management (Advanced)](#-package-management-advanced)
- [🌍 Environment Configuration](#-environment-configuration)
- [🔧 Development Tools](#-development-tools)
- [📋 Task Configuration](#-task-configuration)
- [🔗 Integration Configuration](#-integration-configuration)
- [📊 Metrics & Monitoring](#-metrics--monitoring)
- [🏗️ Build Pipeline Configuration](#-build-pipeline-configuration)
- [🎯 Quality Assurance](#-quality-assurance)
- [🚀 Deployment Configuration](#-deployment-configuration)
- [📚 Documentation Configuration](#-documentation-configuration)

---

## 🔧 Serve Configuration

Configure the built-in development server.

```toml
[serve]
development = true          # Enable dev mode features
port = 3000                 # Server port
hostname = "localhost"      # Server hostname
hmr = true                  # Hot module reloading
console = true              # Browser console to terminal
error_overlay = true        # Error overlay in browser
cors = { enabled = true, origins = ["*"] }  # CORS settings
```

**Usage:**

```bash
bun run serve  # Start development server
```

---

## 📦 Bundle Configuration

Configure how Bun bundles your code for production.

```toml
[bundle]
target = "browser"          # Target environment
format = "esm"              # Output format
minify = { whitespace = true, identifiers = false, syntax = true }
sourcemap = "linked"        # Source map generation
external = ["node:*", "bun:*"]  # Exclude from bundle
splitting = true            # Code splitting
tree_shaking = true         # Tree shaking
analyze = true              # Bundle analysis
```

**Usage:**

```bash
bun build ./src/index.ts --outdir ./dist
```

---

## 🎨 CSS Configuration

Configure CSS processing and optimization.

```toml
[css]
modules = true              # Enable CSS modules
postcss = true              # Enable PostCSS
minify = true               # Minify CSS
sourcemap = true            # CSS source maps
tailwind = { enabled = true, config = "tailwind.config.js" }
```

**Features:**

- CSS Modules support
- PostCSS processing
- Tailwind CSS integration
- Automatic minification
- Source map generation

---

## 📱 Plugin Configuration

Configure Bun plugins for enhanced functionality.

```toml
[plugins]
"bun-plugin-tailwind" = { enabled = true }
"postcss-preset-env" = { enabled = true, stage = 0 }
"bun-plugin-imagemin" = { enabled = true, quality = 80 }
```

**Supported Plugins:**

- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS post-processing
- **Image Optimization**: Automatic image compression
- **Custom Plugins**: Extend functionality

---

## 🧩 Macro Configuration

Define build-time macros and constants.

```toml
[macro]
jsx = true
FIRE22_ENV = "'production'"
BUILD_TIME = "new Date().toISOString()"
VERSION = "require('./package.json').version"
```

**Usage:**

```typescript
// These get replaced at build time
console.log(FIRE22_ENV); // 'production'
console.log(BUILD_TIME); // '2024-01-01T00:00:00.000Z'
console.log(VERSION); // '1.0.0'
```

---

## 🔄 Transpiler Configuration

Configure TypeScript and JavaScript transpilation.

```toml
[transpiler]
typescript = { target = "es2020", module = "esm" }
jsx = { pragma = "React.createElement", pragmaFrag = "React.Fragment" }
features = ["async-await", "optional-chaining", "nullish-coalescing"]
experimental = { decorators = true, classFields = true }
```

**Features:**

- Modern JavaScript target
- JSX transformation
- Experimental features
- TypeScript compilation

---

## 📊 Analytics & Monitoring

Configure build analytics and performance monitoring.

```toml
[analytics]
enabled = true
output_dir = "./analytics"
performance = { enabled = true, detailed = true }
bundle_size = { enabled = true, threshold = "500KB" }
dependencies = { enabled = true, circular_check = true }
```

**Analytics Include:**

- Build performance metrics
- Bundle size analysis
- Dependency analysis
- Circular dependency detection

---

## 🔐 Security Configuration

Configure security scanning and protection.

```toml
[security]
scanning = true
audit_level = "high"
block_malicious = true
vulnerability_check = true
license_check = true
code_signing = { enabled = true, certificate = "~/.bun/certificates/code-signing.pem" }
```

**Security Features:**

- Package vulnerability scanning
- Malicious package detection
- License compliance checking
- Code signing verification

---

## 🚀 Performance Configuration

Optimize build and runtime performance.

```toml
[performance]
optimizations = true
preload = ["./src/index.ts", "./src/styles/index.css"]
splitting = { chunks = "async", vendor = true }
cache = { enabled = true, strategy = "aggressive" }
compression = { enabled = true, algorithm = "gzip" }
```

**Performance Optimizations:**

- Critical resource preloading
- Intelligent code splitting
- Aggressive caching
- Gzip compression

---

## 📝 Logging Configuration

Configure logging output and formatting.

```toml
[logging]
level = "info"
format = "json"
outputs = ["console", "file"]
file = { path = "./logs/bun.log", max_size = "10MB", rotation = "daily" }
structured = true
```

**Logging Options:**

- Multiple log levels
- Structured JSON logging
- File rotation
- Console and file output

---

## 🧪 Testing Configuration (Enhanced)

Advanced testing configuration with parallel execution.

```toml
[test]
runner = "bun:test"
timeout = 10000
parallel = true
workers = 4
patterns = ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*.ts"]
setup = ["./test/setup.ts"]
globals = { describe = true, it = true, expect = true, beforeEach = true, afterEach = true }
```

**Testing Features:**

- Parallel test execution
- Multiple test patterns
- Global test helpers
- Timeout configuration

---

## 📦 Package Management (Advanced)

Advanced package management and dependency resolution.

```toml
[package]
registry = { url = "https://registry.npmjs.org", auth = "$NPM_TOKEN" }
resolution = "highest"
peer_deps = { auto_install = true, strict = false }
lockfile = { format = "bun", validate = true, prune = true }
overrides = { "react" = "^18.0.0", "typescript" = "^5.0.0" }
```

**Package Features:**

- Custom registry support
- Peer dependency handling
- Lockfile management
- Dependency overrides

---

## 🌍 Environment Configuration

Environment-specific configuration and variables.

```toml
[env]
NODE_ENV = "development"
BUN_ENV = "development"
FIRE22_ENV = "enterprise"

[env.production]
NODE_ENV = "production"
DEBUG = false
LOG_LEVEL = "warn"

[env.development]
DEBUG = true
LOG_LEVEL = "debug"
```

**Environment Features:**

- Default environment variables
- Environment-specific overrides
- Conditional configuration

---

## 🔧 Development Tools

Configure development tools and debugging.

```toml
[dev]
tools = true
hot_reload = { enabled = true, watch = ["src/**/*", "public/**/*"] }
server = { port = 3000, host = "localhost", https = false }
debug = { enabled = true, breakpoints = true, inspector = true }
profile = { enabled = true, heap = true, cpu = true }
```

**Development Features:**

- Hot reload watching
- Development server
- Debugging tools
- Performance profiling

---

## 📋 Task Configuration

Configure custom build tasks and automation.

```toml
[task]
build = { command = "bun run build", watch = ["src/**/*"] }
dev = { command = "bun run dev", watch = ["src/**/*", "public/**/*"] }
test = { command = "bun test", watch = ["src/**/*", "test/**/*"] }
lint = { command = "bun run lint", watch = ["src/**/*"] }
```

**Task Features:**

- File watching
- Custom commands
- Automated workflows

---

## 🔗 Integration Configuration

Configure external service integrations.

```toml
[integrations]
github = { enabled = true, token = "$GITHUB_TOKEN" }
cloudflare = { enabled = true, account_id = "$CF_ACCOUNT_ID", api_token = "$CF_API_TOKEN" }
database = { type = "sqlite", path = "./data/app.db" }
api = { base_url = "https://api.fire22.com", timeout = 5000 }
```

**Integration Support:**

- GitHub API integration
- Cloudflare Workers
- Database connections
- External APIs

---

## 📊 Metrics & Monitoring

Configure metrics collection and monitoring.

```toml
[metrics]
enabled = true
interval = "30s"
format = "prometheus"
custom = [
  { name = "build_time", type = "histogram" },
  { name = "bundle_size", type = "gauge" },
  { name = "test_coverage", type = "gauge" }
]
```

**Metrics Include:**

- Build time tracking
- Bundle size monitoring
- Test coverage metrics
- Custom performance metrics

---

## 🏗️ Build Pipeline Configuration

Configure CI/CD build pipelines.

```toml
[pipeline]
stages = ["lint", "test", "build", "deploy"]
parallel = true
cache = { enabled = true, paths = [".bun/cache", "node_modules/.cache"] }
artifacts = { enabled = true, path = "./artifacts", retention = "30d" }
```

**Pipeline Features:**

- Multi-stage builds
- Parallel execution
- Caching optimization
- Artifact management

---

## 🎯 Quality Assurance

Configure code quality checks and gates.

```toml
[quality]
checks = ["lint", "format", "security", "performance"]
gates = [
  { metric = "test_coverage", operator = ">=", value = 80 },
  { metric = "bundle_size", operator = "<=", value = "2MB" },
  { metric = "security_score", operator = ">=", value = 90 }
]
auto_fix = { enabled = true, rules = ["format", "imports"] }
```

**Quality Features:**

- Automated code quality checks
- Quality gates and thresholds
- Auto-fixing capabilities

---

## 🚀 Deployment Configuration

Configure deployment strategies and health checks.

```toml
[deploy]
targets = ["preview", "production"]
strategy = "rolling"
health_checks = { enabled = true, endpoint = "/health", timeout = "30s" }
rollback = { enabled = true, automatic = true, threshold = 50 }
```

**Deployment Features:**

- Multi-target deployment
- Rolling deployment strategy
- Health check validation
- Automatic rollback

---

## 📚 Documentation Configuration

Configure automatic documentation generation.

```toml
[docs]
auto_generate = true
format = "markdown"
api_docs = { enabled = true, output = "./docs/api" }
component_docs = { enabled = true, output = "./docs/components" }
```

**Documentation Features:**

- Automatic API documentation
- Component documentation
- Markdown format
- Custom output directories

---

## 🎮 Dashboard Configuration

Specific configuration for the Fire22 Manager Dashboard.

```toml
[dashboard]
serve_dashboard = true
entry_point = "crystal-clear-architecture/dashboard.html"
dev_port = 3001
hot_reload = true
enable_api_routes = true

[dashboard.env]
DASHBOARD_VERSION = "5.0.0"
THEME_MODE = "dark"
PRIMARY_COLOR = "#DC2626"
```

**Dashboard Features:**

- Dedicated development server
- Real-time data updates
- Theme customization
- API route configuration

---

## 🚀 Quick Start Examples

### Development Server

```bash
# Start development server with hot reload
bun run serve

# Start dashboard development server
bun run dashboard:dev
```

### Build for Production

```bash
# Build with optimizations
bun run build

# Build dashboard specifically
bun run dashboard:build
```

### Testing

```bash
# Run tests with coverage
bun test

# Run tests in watch mode
bun test --watch
```

### Quality Assurance

```bash
# Run all quality checks
bun run quality

# Auto-fix code issues
bun run quality:fix
```

---

## 🔧 Advanced Usage

### Custom Scripts

Add custom scripts to your `package.json`:

```json
{
  "scripts": {
    "dev:custom": "bun run serve --port 8080",
    "build:analyze": "bun run build --analyze",
    "test:ci": "bun test --coverage --ci"
  }
}
```

### Environment Overrides

Override configuration based on environment:

```toml
[env.production.bundle]
minify = { whitespace = true, identifiers = true, syntax = true }
sourcemap = false

[env.development.serve]
console = true
error_overlay = true
```

### Custom Plugins

Create custom Bun plugins:

```typescript
// custom-plugin.ts
export default {
  name: 'custom-plugin',
  setup(build) {
    // Plugin logic here
  },
};
```

---

## 📞 Support & Resources

- **Official Bun Documentation**: https://bun.sh/docs
- **Configuration Reference**: https://bun.sh/docs/runtime/configuration
- **Plugin Development**: https://bun.sh/docs/bundler/plugins
- **CLI Reference**: https://bun.sh/docs/cli

---

**🎉 Your bunfig.toml is now a comprehensive enterprise configuration system
with advanced features for development, building, testing, and deployment!**

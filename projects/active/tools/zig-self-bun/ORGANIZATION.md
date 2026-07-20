# 📁 Codebase Organization Guide

## Overview

The Bun 13-byte config system has been fully organized into a clean, modular structure that separates concerns while maintaining the core performance principles.

## 🏗️ Directory Structure

```text
zig-selg-bun/
├── src/                          # Source code (organized by feature)
│   ├── index.ts                  # Main library exports
│   ├── bootstrap.ts              # System initialization
│   ├── hash.ts                   # Hash utilities
│   ├── immutable/                # Core 13-byte config
│   │   └── config.zig
│   ├── features/                 # Feature flags
│   │   └── flags.zig
│   ├── terminal/                 # PTY management
│   │   └── pty.zig
│   ├── config/                   # Config management
│   │   └── manager.ts
│   ├── logging/                  # Structured logging
│   │   └── logger.ts
│   ├── metrics/                  # Prometheus metrics
│   │   ├── metrics.ts
│   │   └── observability.ts
│   ├── auth/                     # JWT authentication
│   │   └── jwt.ts
│   ├── rate-limiting/            # Rate limiting
│   │   └── rate-limiter.ts
│   ├── http/                     # HTTP utilities
│   │   └── compression.ts
│   ├── proxy/                    # HTTP proxy
│   │   ├── headers.ts
│   │   ├── validator.ts
│   │   ├── dns.ts
│   │   └── middleware.ts
│   ├── errors/                   # Error handling
│   │   └── error-classes.ts
│   ├── env/                      # Environment variables
│   │   └── readonly.ts
│   ├── websocket/                # WebSocket protocol
│   │   └── subprotocol.ts
│   ├── api/                      # TypeScript definitions
│   │   └── bun.d.ts
│   └── bundle/                   # Build utilities
│       └── feature_elimination.ts
├── lib/                          # Compiled libraries
│   ├── cli/                      # CLI tools source
│   │   ├── config.ts
│   │   └── enhanced-cli.ts
│   └── core/                     # Compiled core modules
├── registry/                     # Registry server
│   ├── api.ts                    # Main registry API
│   ├── auth.ts                   # Authentication
│   ├── dashboard/                # Web dashboard
│   │   ├── index.html
│   │   └── websocket-client.ts
│   └── terminal/                 # Terminal UI
│       └── term.ts
├── tests/                        # Test suites
│   ├── config_test.zig
│   ├── config_immutability_test.ts
│   └── proxy-validator.test.ts
├── scripts/                      # Utility scripts
│   ├── self-publish.ts
│   └── compare-bench.ts
├── ops/                          # Operations
│   ├── docker/
│   ├── kubernetes/
│   └── prometheus/
├── bin/                          # Compiled binaries
│   └── compiled/                 # Standalone executables
│       ├── bun-config
│       └── bun-config-cli
├── build.zig                     # Zig build config
├── package.json                  # Package configuration
├── tsconfig.json                 # TypeScript config
└── README.md                     # Comprehensive documentation
```

## 📦 Module Organization

### Core Modules (`src/`)

Each feature is organized into its own directory with clear separation:

- **`immutable/`** - Core 13-byte config (Zig)
- **`features/`** - Feature flags (Zig)
- **`terminal/`** - PTY management (Zig)
- **`config/`** - Config management (TypeScript)
- **`logging/`** - Structured logging (TypeScript)
- **`metrics/`** - Prometheus metrics (TypeScript)
- **`auth/`** - JWT authentication (TypeScript)
- **`rate-limiting/`** - Rate limiting (TypeScript)
- **`http/`** - HTTP utilities (TypeScript)
- **`proxy/`** - HTTP proxy (TypeScript)
- **`errors/`** - Error handling (TypeScript)
- **`env/`** - Environment variables (TypeScript)
- **`websocket/`** - WebSocket protocol (TypeScript)
- **`api/`** - TypeScript definitions (TypeScript)
- **`bundle/`** - Build utilities (TypeScript)

### Library Structure (`lib/`)

- **`lib/core/`** - Compiled core modules
- **`lib/cli/`** - CLI tool source code
- **`lib/registry/`** - Registry server modules

### Binaries (`bin/compiled/`)

- **`bun-config`** - Basic config CLI (3.1KB executable)
- **`bun-config-cli`** - Enhanced CLI (48.85KB executable)

## 🔧 Build System

### Build Commands

```bash
# Build everything
bun run build:all

# Build TypeScript only
bun run build

# Build Zig modules
bun run build:zig

# Development mode
bun run dev
```

### Build Outputs

- **TypeScript** → `lib/core/` (bundled modules)
- **CLI tools** → `bin/compiled/` (standalone executables)
- **Zig modules** → Compiled into bundles

## 📋 Package Configuration

### Exports (`package.json`)

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./config": "./src/config/manager.ts",
    "./logging": "./src/logging/logger.ts",
    "./metrics": "./src/metrics/metrics.ts",
    "./auth": "./src/auth/jwt.ts",
    "./compression": "./src/http/compression.ts",
    "./rate-limit": "./src/rate-limiting/rate-limiter.ts",
    "./errors": "./src/errors/error-classes.ts",
    "./proxy": "./src/proxy/middleware.ts",
    "./terminal": "./src/terminal/pty.zig",
    "./immutable": "./src/immutable/config.zig",
    "./env": "./src/env/readonly.ts",
    "./websocket": "./src/websocket/subprotocol.ts",
    "./cli": "./lib/cli/enhanced-cli.ts",
    "./registry": "./registry/api.ts"
  }
}
```

### TypeScript Paths (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/config": ["src/config/manager"],
      "@/logging": ["src/logging/logger"],
      "@/metrics": ["src/metrics/metrics"],
      "@/auth": ["src/auth/jwt"],
      "@/compression": ["src/http/compression"],
      "@/rate-limit": ["src/rate-limiting/rate-limiter"],
      "@/errors": ["src/errors/error-classes"],
      "@/proxy": ["src/proxy/middleware"],
      "@/terminal": ["src/terminal/pty.zig"],
      "@/immutable": ["src/immutable/config.zig"],
      "@/env": ["src/env/readonly"],
      "@/websocket": ["src/websocket/subprotocol"],
      "@/registry": ["registry/api"]
    }
  }
}
```

## 🚀 Usage Examples

### Library Usage

```typescript
// Import specific modules
import { createLogger } from "@mycompany/bun-config-system/logging";
import { createPerformanceLogger } from "@mycompany/bun-config-system";

// Or use path mapping
import { createLogger } from "@/logging";
import { getConfig } from "@/config";
```

### CLI Usage

```bash
# Use npm binaries
bun x bun-config-cli status
bun x bun-config feature enable DEBUG

# Or direct execution
./bin/compiled/bun-config-cli metrics
./bin/compiled/bun-config set version 1
```

### Registry Usage

```bash
# Start registry
bun run registry

# API endpoints
curl http://localhost:4873/_dashboard/api/metrics
curl http://localhost:4873/_dashboard/api/env?format=shell
```

## 🧪 Testing Structure

### Test Organization

- **`tests/*.zig`** - Zig unit tests (nanosecond validation)
- **`tests/*.test.ts`** - Bun integration tests
- **`tests/proxy-validator.test.ts`** - Proxy validation tests

### Test Commands

```bash
# Run all tests
bun test

# Run with watch mode
bun run test:watch

# Run specific tests
bun test tests/config_immutability_test.ts
```

## 📚 Documentation

### Documentation Files

- **`README.md`** - Comprehensive usage guide
- **`ENHANCED_FEATURES.md`** - Feature integration details
- **`PERFORMANCE_SUMMARY.md`** - Performance characteristics
- **`ORGANIZATION.md`** - This file
- **`MANIFESTO.md`** - Philosophy and design principles
- **`OBSERVABILITY.md`** - Production operations guide

### API Documentation

- **TypeScript definitions** in `src/api/bun.d.ts`
- **JSDoc comments** throughout the codebase
- **Usage examples** in README and docs

## 🔄 Development Workflow

### Adding New Features

1. **Create feature directory** in `src/`
2. **Add exports** to `src/index.ts`
3. **Update package.json exports** if public API
4. **Add TypeScript path** if needed
5. **Write tests** in `tests/`
6. **Update documentation**

### Building and Testing

```bash
# Development cycle
bun run build          # Build TypeScript
bun run build:zig      # Build Zig modules
bun test              # Run tests
bun run cli status    # Test CLI functionality
```

### Release Process

```bash
# Clean build
bun run clean
bun run build:all

# Test everything
bun test
bun run validate

# Tag and release
git tag v1.3.5
npm publish
```

## 🎯 Key Benefits

### Organization Benefits

- **Clear separation** of concerns by feature
- **Modular architecture** for easy maintenance
- **Consistent structure** across all modules
- **Proper exports** for library usage

### Performance Benefits

- **L1 cache alignment** maintained (13-byte config)
- **Zero-copy operations** preserved
- **Efficient bundling** with proper tree-shaking
- **Standalone executables** for CLI tools

### Developer Benefits

- **Path mapping** for clean imports
- **TypeScript definitions** for IDE support
- **Comprehensive testing** framework
- **Extensive documentation**

## ✅ Organization Complete

The Bun 13-byte config system is now fully organized with:

- ✅ **Clean directory structure**
- ✅ **Modular feature organization**
- ✅ **Proper build system**
- ✅ **Comprehensive documentation**
- ✅ **Working CLI executables**
- ✅ **Test framework**
- ✅ **Production-ready packaging**

**The codebase is now enterprise-ready and maintainable!** 🚀

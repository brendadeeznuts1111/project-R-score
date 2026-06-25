# 🔧 Bun Dependency & Transpilation Features

This document covers Bun's dependency resolution and transpilation features, with practical examples for the geelark project.

**References:**
- [Bun Dependency Resolution](https://bun.sh/docs/runtime/dependency-resolution)
- [Bun Transpilation](https://bun.sh/docs/runtime/transpilation)

## 📦 Dependency Resolution

### Auto-Install (`--install`)

Automatically installs missing dependencies when running code.

```bash
# Auto-install missing packages
bun run --install=auto ./src/index.ts

# Only install when dependencies are missing (default)
bun run --install=fallback ./src/index.ts

# Always install, even if dependencies exist
bun run --install=force ./src/index.ts
```

**Use Cases:**
- Seamless onboarding - new contributors don't need to run `bun install`
- CI/CD pipelines - skip explicit install step
- Docker containers - reduce layer size

### Module Preloading (`--preload`, `-r`)

Import a module before other modules are loaded.

```bash
# Preload test setup
bun test --preload ./src/preload/test-setup.ts

# Preload environment configuration
bun run --preload ./src/preload/env.ts ./src/index.ts

# Multiple preloads
bun run --preload ./polyfills.ts --preload ./setup.ts ./src/index.ts
```

**In `bun.toml`:**
```toml
[test]
preload = ["./src/preload/test-setup.ts", "./src/preload/global-polyfills.ts"]
```

**Use Cases:**
- Global polyfills
- Test environment setup
- Environment variable configuration
- Mock/stub setup for testing

### Package Resolution (`--conditions`, `--main-fields`)

Control how Bun selects which file to load from a package.

```bash
# Resolve for production environment
bun run --conditions production ./src/index.ts

# Resolve for development
bun run --conditions development ./src/index.ts

# Custom main field priority
bun run --main-fields "browser:module,main" ./src/index.ts
```

**In `package.json`:**
```json
{
  "exports": {
    ".": {
      "production": "./prod.js",
      "development": "./dev.js",
      "default": "./index.js"
    }
  }
}
```

## 🔨 Transpilation Features

### TypeScript/JSX Support

Built-in, zero-config TypeScript and JSX support.

```bash
# Run TypeScript directly
bun run ./src/index.ts

# Run JSX/TSX
bun run ./src/components/App.tsx

# No tsconfig.json needed (but can use one for customization)
```

**In `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "experimentalDecorators": true
  }
}
```

### Custom Loaders (`--loader`)

Override file transpilation for specific extensions.

```bash
# Treat .js files as JSX
bun run --loader .js:jsx ./component.js

# Treat .txt files as JSON
bun run --loader .txt:json ./data.txt

# Custom loader for config files
bun run --loader .config:toml ./app.config
```

**Use Cases:**
- Migrating from .js to .jsx gradually
- Loading configuration files
- Custom file formats

### Compile-Time Constants (`--define`)

Define constants at compile/transpile time.

```bash
# Define environment
bun run --define process.env.NODE_ENV:\"production\" ./src/index.ts

# Define feature flags
bun run --define ENABLE_ANALYTICS:false ./src/index.ts

# Define API endpoints
bun run --define API_ENDPOINT:\"https://api.example.com\" ./src/index.ts
```

**In `bun.toml`:**
```toml
[define]
NODE_ENV = "\"development\""
API_VERSION = "\"v1\""
```

### Custom TypeScript Config (`--tsconfig-override`)

Specify a custom `tsconfig.json` for specific runs.

```bash
# Use production TypeScript config
bun run --tsconfig-override ./config/tsconfig/tsconfig.prod.json ./src/index.ts

# Use test TypeScript config
bun test --tsconfig-override ./config/tsconfig/tsconfig.test.json
```

### Macro Control (`--no-macros`)

Disable Bun's compile-time macros feature.

```bash
# Run without macros
bun run --no-macros ./src/index.ts
```

**Use Cases:**
- Debugging macro expansion issues
- Projects using custom macro systems

### Tree-Shaking Control (`--ignore-treeshake-annotations`)

Ignore code elimination hints like `@__PURE__`.

```bash
# Debug tree-shaking
bun build --ignore-treeshake-annotations ./src/index.ts --outdir ./dist
```

## 💡 Practical Examples

### Development Workflow

```bash
# Hot reload with auto-install
bun --hot --watch --install=fallback ./src/index.ts
```

### Testing with Setup

```bash
# Preload test setup, use custom tsconfig
bun test \
  --preload ./src/preload/test-setup.ts \
  --tsconfig-override ./config/tsconfig/tsconfig.test.json
```

### Production Build

```bash
# Define production constants, ignore dev code
bun build \
  --define process.env.NODE_ENV:\"production\" \
  --define DEV_TOOLS:false \
  ./src/index.ts \
  --outdir ./dist
```

### Docker/CI Environment

```bash
# Minimal dependencies, production mode
bun run \
  --install=auto \
  --smol \
  --define process.env.NODE_ENV:\"production\" \
  ./src/index.ts
```

### Multi-Environment Package

```bash
# Development
bun run --conditions development ./src/index.ts

# Production
bun run --conditions production ./src/index.ts

# Test
bun run --conditions test ./src/index.ts
```

## 📁 Configuration Files

### `bun.toml` Configuration

```toml
# Dependency resolution
[install]
exact = true
frozen-lockfile = true
auto = "fallback"  # Auto-install behavior

# Preload modules for all runs
[run]
preload = ["./src/preload/global-polyfills.ts"]

# Preload modules for tests
[test]
preload = ["./src/preload/test-setup.ts"]
root = "tests"

# Custom main fields
[resolve]
main-fields = ["browser:module", "module", "main"]

# Define constants
[define]
DEV_MODE = "true"
API_VERSION = "\"v1\""
```

### `tsconfig.json` Integration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["bun-types"]
  }
}
```

## 🎯 Geelark Integration

### Preload Scripts

```typescript
// src/preload/test-setup.ts
import { beforeAll, afterEach, afterAll } from "bun:test";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  // Global test setup
});
```

### Environment-Specific Exports

```json
// package.json
{
  "exports": {
    ".": {
      "development": "./src/index.dev.ts",
      "production": "./src/index.prod.ts",
      "default": "./src/index.ts"
    },
    "./cli": {
      "default": "./bin/dev-hq-cli.ts"
    }
  }
}
```

### Feature Flags with Defines

```typescript
// Runtime check of compile-time constant
declare const DEV_TOOLS: boolean;

if (DEV_TOOLS) {
  console.log("Development tools enabled");
}
```

Build with:
```bash
bun run --define DEV_TOOLS:true ./src/index.ts
```

## 🔗 Related Documentation

- [BUN_RUNTIME_FEATURES](./BUN_RUNTIME_FEATURES.md)
- [ARCHITECTURE](../architecture/ARCHITECTURE.md)
- [CLI_REFERENCE](../api/CLI_REFERENCE.md)
- [Bun Docs - Dependency Resolution](https://bun.sh/docs/runtime/dependency-resolution)
- [Bun Docs - Transpilation](https://bun.sh/docs/runtime/transpilation)

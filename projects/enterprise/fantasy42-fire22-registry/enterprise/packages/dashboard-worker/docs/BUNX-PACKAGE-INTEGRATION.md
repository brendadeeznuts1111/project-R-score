# 🚀 Bunx --package Integration Guide

## Fire22 Enhanced with Bun's New `--package` Feature

This guide demonstrates how to use the new `bunx --package` functionality with
our Fire22 Telegram system, along with enhanced `sideEffects` glob pattern
support.

---

## 📦 New `bunx --package` Feature

Bun now supports the `--package` (or `-p`) flag with `bunx` to run binaries from
packages where the binary name differs from the package name. This brings `bunx`
functionality in line with `npx` and `yarn dlx`.

### Basic Syntax

```bash
bunx --package <package-name> <binary-name> [args...]
bunx -p <package-name> <binary-name> [args...]
```

---

## 🎯 Fire22 Package Binary Integration

### Updated Package Structure

Each Fire22 workspace package now includes dedicated binaries:

```json
{
  "name": "@fire22/telegram-bot",
  "bin": {
    "fire22-telegram-bot": "./dist/telegram-bot.js",
    "fire22-bot": "./dist/telegram-bot.js",
    "telegram-bot": "./dist/telegram-bot.js"
  }
}
```

### Available Fire22 Binaries

#### 1. **@fire22/telegram-bot**

```bash
# Multiple binary aliases available
bunx --package @fire22/telegram-bot fire22-telegram-bot
bunx -p @fire22/telegram-bot fire22-bot
bunx --package @fire22/telegram-bot telegram-bot

# Direct package script shortcuts
bun run bunx:telegram-bot
```

#### 2. **@fire22/queue-system**

```bash
# Queue system binaries
bunx --package @fire22/queue-system fire22-queue-system
bunx -p @fire22/queue-system fire22-queue
bunx --package @fire22/queue-system queue-system

# Direct shortcut
bun run bunx:queue-system
```

#### 3. **@fire22/telegram-benchmarks**

```bash
# Benchmark binaries
bunx --package @fire22/telegram-benchmarks fire22-benchmarks
bunx -p @fire22/telegram-benchmarks fire22-telegram-benchmarks
bunx --package @fire22/telegram-benchmarks telegram-benchmarks

# Direct shortcut
bun run bunx:benchmarks
```

#### 4. **@fire22/telegram-dashboard**

```bash
# Dashboard server binary
bunx --package @fire22/telegram-dashboard fire22-staging-server
bunx -p @fire22/telegram-dashboard staging-server

# Direct shortcut
bun run bunx:staging
```

#### 5. **@fire22/multilingual**

```bash
# Language system demo
bunx --package @fire22/multilingual fire22-language-demo
bunx -p @fire22/multilingual language-demo

# Direct shortcut
bun run bunx:multilingual
```

#### 6. **@fire22/telegram-workflows**

```bash
# Workflow demonstration
bunx --package @fire22/telegram-workflows fire22-workflow-demo
bunx -p @fire22/telegram-workflows workflow-demo

# Direct shortcut
bun run bunx:workflows
```

---

## 🛡️ Enhanced sideEffects with Glob Patterns

Our `package.json` now uses advanced glob patterns for better tree-shaking
optimization:

```json
{
  "sideEffects": [
    "**/*.css",
    "./src/styles/**/*",
    "./src/components/**/*.css",
    "./docs/**/*.css",
    "./src/setup/polyfills.js",
    "./src/i18n/**/*",
    "./src/firebase-config.ts",
    "./scripts/enhanced-logging-system.ts",

    // Fire22 workspace patterns
    "./workspaces/@fire22-*/src/**/*.css",
    "./workspaces/@fire22-*/src/**/polyfills.{js,ts}",
    "./workspaces/@fire22-telegram-*/src/i18n/**/*",
    "./src/telegram/**/*.css",
    "./src/telegram/**/telegram-constants.ts",

    // Package-specific patterns
    "./packages/*/src/**/*.css",
    "./packages/version-manager/src/**/version-constants.ts",
    "./packages/wager-system/src/**/sports-data.ts",
    "./packages/env-manager/src/**/env-defaults.ts"
  ]
}
```

### Pattern Types Explained

#### **Wildcard Patterns**

```json
"./workspaces/@fire22-*/src/**/*.css"
```

- Matches CSS files in any Fire22 workspace
- `*` matches any characters in directory names
- `**` matches nested directories

#### **Brace Expansion**

```json
"./workspaces/@fire22-*/src/**/polyfills.{js,ts}"
```

- Matches both `.js` and `.ts` polyfill files
- Prevents tree-shaking of essential initialization code

#### **Nested Glob Patterns**

```json
"./workspaces/@fire22-telegram-*/src/i18n/**/*"
```

- Preserves all internationalization files
- Ensures translation data remains accessible

---

## 🚀 Practical Usage Examples

### Development Workflow

```bash
# Start the complete staging environment
bunx -p @fire22/telegram-dashboard fire22-staging-server

# Run performance benchmarks
bunx --package @fire22/telegram-benchmarks fire22-benchmarks

# Test queue system functionality
bunx -p @fire22/queue-system fire22-queue-system --test-mode

# Demo multilingual capabilities
bunx --package @fire22/multilingual fire22-language-demo --interactive

# Launch workflow demonstration
bunx -p @fire22/telegram-workflows fire22-workflow-demo
```

### Production Deployment

```bash
# Deploy Telegram bot to production
bunx --package @fire22/telegram-bot fire22-telegram-bot --env=production

# Run production benchmarks
bunx -p @fire22/telegram-benchmarks telegram-benchmarks --profile=production

# Start staging server for testing
bunx --package @fire22/telegram-dashboard staging-server --port=3001
```

### CI/CD Integration

```yaml
# .github/workflows/fire22-ci.yml
name: Fire22 CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun run workspace:install

      - name: Run benchmarks
        run:
          bunx --package @fire22/telegram-benchmarks fire22-benchmarks --ci-mode

      - name: Test queue system
        run: bunx -p @fire22/queue-system fire22-queue-system --test

      - name: Validate multilingual system
        run: bunx --package @fire22/multilingual fire22-language-demo --validate
```

---

## 📊 Package Binary Build Process

### Automated Binary Generation

Each workspace package includes build scripts for binary compilation:

```json
{
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target bun --format esm",
    "build:bin": "bun build src/main.ts --outdir dist --target bun --format esm --compile --outfile binary.js",
    "build:all": "bun run build && bun run build:bin"
  }
}
```

### Build Commands

```bash
# Build all workspace binaries
bun run workspace:build

# Build specific package binary
cd workspaces/@fire22-telegram-bot
bun run build:bin

# Build all packages and binaries
cd workspaces/@fire22-telegram-bot && bun run build:all
cd ../fire22-queue-system && bun run build:all
cd ../fire22-telegram-benchmarks && bun run build:all
```

---

## 🎯 Advanced Integration Patterns

### Cross-Package Communication

```bash
# Chain multiple Fire22 tools
bunx -p @fire22/multilingual fire22-language-demo --export-codes | \
bunx --package @fire22/telegram-bot fire22-telegram-bot --import-codes

# Pipeline benchmarking
bunx -p @fire22/queue-system fire22-queue-system --generate-data | \
bunx --package @fire22/telegram-benchmarks fire22-benchmarks --input-stream
```

### Environment-Specific Execution

```bash
# Development mode
BUN_ENV=development bunx -p @fire22/telegram-dashboard fire22-staging-server

# Production mode with custom config
bunx --package @fire22/telegram-bot fire22-telegram-bot \
  --config=/etc/fire22/production.json \
  --log-level=info

# Testing mode with mocks
NODE_ENV=test bunx -p @fire22/telegram-workflows fire22-workflow-demo \
  --mock-apis \
  --dry-run
```

### Performance Profiling

```bash
# Profile memory usage
bunx --package @fire22/telegram-benchmarks fire22-benchmarks \
  --profile=memory \
  --duration=60s \
  --output=memory-profile.json

# Benchmark specific components
bunx -p @fire22/telegram-benchmarks telegram-benchmarks \
  --category=language \
  --iterations=100000 \
  --format=json > language-benchmark.json
```

---

## 🔧 Configuration Integration

### Package-Specific Configuration Files

Each package supports configuration via:

1. **Environment Variables**

   ```bash
   FIRE22_TELEGRAM_TOKEN=xxx bunx -p @fire22/telegram-bot fire22-bot
   ```

2. **Configuration Files**

   ```bash
   bunx --package @fire22/queue-system fire22-queue-system \
     --config=./configs/staging-queue.json
   ```

3. **CLI Arguments**
   ```bash
   bunx -p @fire22/multilingual fire22-language-demo \
     --languages=en,es,pt,fr \
     --cache-size=1000 \
     --output-format=json
   ```

---

## 🎉 Benefits of This Integration

### **1. Simplified Package Execution**

- Direct binary execution without installation
- Multiple alias support for different use cases
- Consistent naming across all Fire22 packages

### **2. Enhanced Tree Shaking**

- Glob pattern support prevents accidental removal of critical files
- Better bundle optimization for production builds
- Preserved side-effect files (CSS, i18n, polyfills)

### **3. Developer Experience**

- Intuitive command structure
- Built-in shortcuts in root package.json
- Cross-platform binary support

### **4. CI/CD Optimization**

- Direct execution in build pipelines
- No need for global package installation
- Version-pinned execution

---

## 📈 Migration Guide

### From Old bunx Usage

```bash
# Old way
bunx @fire22/telegram-bot

# New way (when binary name differs from package)
bunx --package @fire22/telegram-bot fire22-telegram-bot
```

### From npm Scripts

```bash
# Old package.json
"scripts": {
  "bot": "node ./node_modules/@fire22/telegram-bot/dist/index.js"
}

# New package.json with bunx
"scripts": {
  "bot": "bunx -p @fire22/telegram-bot fire22-telegram-bot"
}
```

---

## 🎯 Quick Reference

### All Fire22 bunx Commands

```bash
# Telegram System
bun run bunx:telegram-bot     # Start Telegram bot
bun run bunx:queue-system     # Run queue system
bun run bunx:multilingual     # Language demo
bun run bunx:workflows        # Workflow demo
bun run bunx:staging          # Staging server
bun run bunx:benchmarks       # Performance tests

# Extended Packages (from package.json)
bun run bunx:version-manager  # Version management
bun run bunx:wager-system     # Wager system demo
bun run bunx:env-manager      # Environment validator
```

The new `bunx --package` feature makes Fire22 package execution more powerful
and flexible than ever! 🚀

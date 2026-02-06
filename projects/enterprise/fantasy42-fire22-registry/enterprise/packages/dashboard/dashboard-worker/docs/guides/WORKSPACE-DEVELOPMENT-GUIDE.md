# 🚀 Fire22 Workspace Development Guide

## Overview

This guide covers the enhanced workspace development workflows using Bun's
latest features and our custom scripts. Fire22 has **15 workspaces** organized
as a monorepo with powerful development tools.

## Quick Reference Commands

### 📋 Workspace Discovery

```bash
# List all workspaces
bun run workspaces:list

# Check workspace versions
bun run version:status

# Check outdated packages across workspaces
bun run workspaces:outdated
```

### 🚀 Single Workspace Development

#### Start Development with Hot Reload

```bash
# Method 1: Using our helper script
bun run ws:dev api-client

# Method 2: Direct approach (original pattern)
cd workspaces/@fire22-api-client && bun run dev
```

#### Build and Test Specific Workspace

```bash
# Build specific workspace
bun run ws:build api-client

# Test specific workspace
bun run ws:test api-client

# Direct approach
cd workspaces/@fire22-api-client && bun run build
cd workspaces/@fire22-api-client && bun test
```

### 📦 Dependency Management

#### Add to Specific Workspace

```bash
# Add production dependency
bun run ws:add api-client zod

# Add dev dependency
bun run ws:add-dev api-client typescript

# Direct approach (original pattern)
cd workspaces/@fire22-api-client && bun add zod
cd workspaces/@fire22-api-client && bun add -D typescript
```

#### Bulk Operations Across All Workspaces

```bash
# Add dev dependency to ALL workspaces (original pattern enhanced)
bun run all:add-dev "@types/node"

# Add production dependency to ALL workspaces
bun run all:add lodash

# Original manual approach:
for ws in workspaces/@fire22-*/; do
  (cd "$ws" && bun add -D "@types/node")
done
```

### 🔄 Bulk Operations

#### Build, Test, Lint Everything

```bash
# Build all workspaces
bun run all:build

# Test all workspaces
bun run all:test

# Lint all workspaces
bun run all:lint

# Original pattern enhanced:
# bun lint --filter="@fire22/*"  # Uses Bun's filtering
```

#### Clean Everything

```bash
# Clean all node_modules, dist, build folders
bun run all:clean
```

## Workspace Architecture

### Current Fire22 Workspaces (15 total)

```text
📦 Fire22 Workspaces:
  → @fire22-api-client          # API client library
  → @fire22-api-consolidated    # Consolidated API endpoints
  → @fire22-build-system        # Build tools and configs
  → @fire22-core-dashboard      # Core dashboard components
  → @fire22-language-keys       # Internationalization
  → @fire22-multilingual        # Multi-language support
  → @fire22-pattern-system      # Design patterns
  → @fire22-queue-system        # P2P queue processing
  → @fire22-security-registry   # Security scanning
  → @fire22-sports-betting      # Sports betting logic
  → @fire22-telegram-benchmarks # Performance testing
  → @fire22-telegram-bot        # Telegram bot
  → @fire22-telegram-dashboard  # Telegram dashboard
  → @fire22-telegram-integration# Telegram integration
  → @fire22-telegram-workflows  # Telegram workflows
```

### Version Status Example

```bash
Root version: "4.0.0-staging"
@fire22-api-client: "3.0.9"
@fire22-api-consolidated: "1.0.0"
@fire22-build-system: "3.0.9"
# ... shows version inconsistencies
```

## Development Workflows

### 🔥 Hot Development Workflow

#### Starting Development on Multiple Workspaces

```bash
# Terminal 1: API development
bun run ws:dev api-client

# Terminal 2: Dashboard development
bun run ws:dev core-dashboard

# Terminal 3: Integration testing
bun run ws:test telegram-integration
```

#### Dependency Updates During Development

```bash
# Add new dependency while developing
bun run ws:add api-client axios

# Immediately test the change
bun run ws:test api-client

# Update across all workspaces if needed
bun run all:add axios
```

### 🔧 Maintenance Workflows

#### Daily Dependency Health Check

```bash
# Check what's outdated
bun run workspaces:outdated

# Check version consistency
bun run version:status

# Fix any package.json issues
bun run pkg:fix-all
```

#### Weekly Bulk Updates

```bash
# Update dev dependencies everywhere
bun run all:add-dev "@types/node@latest"
bun run all:add-dev "typescript@latest"

# Lint everything after updates
bun run all:lint

# Test everything
bun run all:test
```

### 🚀 Release Preparation

```bash
# 1. Sync all versions to root
bun run version:sync

# 2. Build everything
bun run all:build

# 3. Test everything
bun run all:test

# 4. Pre-publish checks
bun run verify:pre-publish
```

## Advanced Patterns

### 🎯 Selective Operations

#### Working with Specific Workspace Groups

```bash
# Telegram-related workspaces only
for ws in workspaces/@fire22-telegram-*/; do
  echo "Processing $(basename "$ws")..."
  (cd "$ws" && bun run build)
done

# API-related workspaces
for ws in workspaces/@fire22-api-* workspaces/@fire22-core-*; do
  (cd "$ws" && bun add axios)
done
```

#### Conditional Operations

```bash
# Only build workspaces that have build scripts
bun run all:build  # Automatically skips missing scripts

# Add dependency only to workspaces that need it
for ws in workspaces/@fire22-api-* workspaces/@fire22-telegram-*; do
  if [ -f "$ws/package.json" ]; then
    (cd "$ws" && bun add zod)
  fi
done
```

### 🔍 Debugging and Analysis

#### Dependency Chain Analysis

```bash
# Why is a package installed?
bun run deps:why zod

# Check specific workspace dependencies
cd workspaces/@fire22-api-client && bun why axios

# Generate dependency report
bun run deps:analyze
```

#### Performance Monitoring

```bash
# Benchmark installations
time bun run all:clean && time bun install

# Monitor workspace sizes
du -sh workspaces/@fire22-*/ | sort -hr
```

## Configuration Management

### 🔧 Package.json Synchronization

```bash
# Get workspace package info
cd workspaces/@fire22-api-client && bun run pkg:get name version

# Set common fields across workspaces
for ws in workspaces/@fire22-*/; do
  (cd "$ws" && bun pm pkg set license="MIT")
  (cd "$ws" && bun pm pkg set author="Fire22 Team")
done
```

### 📝 Automated Scripts Management

```bash
# Add common scripts to all workspaces
for ws in workspaces/@fire22-*/; do
  (cd "$ws" && bun pm pkg set scripts.lint="eslint . --ext .ts,.tsx")
  (cd "$ws" && bun pm pkg set scripts.typecheck="tsc --noEmit")
done
```

## Best Practices

### 🎯 Development Best Practices

1. **Use Workspace Shortcuts**

   ```bash
   # Preferred
   bun run ws:dev api-client

   # Instead of
   cd workspaces/@fire22-api-client && bun run dev
   ```

2. **Bulk Operations for Consistency**

   ```bash
   # Keep all workspaces in sync
   bun run all:add-dev "@types/node"
   bun run version:sync
   ```

3. **Regular Health Checks**
   ```bash
   # Daily routine
   bun run workspaces:outdated
   bun run pkg:fix-all
   bun run version:status
   ```

### ⚠️ Common Pitfalls

1. **Version Drift**

   - Use `bun run version:sync` regularly
   - Check `bun run version:status` before releases

2. **Dependency Inconsistencies**

   - Use bulk operations: `bun run all:add-dev`
   - Avoid manual per-workspace installs for common deps

3. **Missing Scripts**
   - Scripts gracefully handle missing commands
   - Use `bun run all:lint` to identify workspaces needing scripts

## Performance Tips

### 🚀 Speed Optimizations

1. **Use Bun's Native Features**

   ```bash
   # Fast filtering (when available)
   bun lint --filter="@fire22/*"

   # Parallel operations
   bun run all:build  # Runs in parallel where possible
   ```

2. **Smart Caching**

   - Bun automatically caches dependencies
   - Use `--frozen-lockfile` for CI/CD

3. **Selective Operations**
   ```bash
   # Only build changed workspaces
   for ws in workspaces/@fire22-api-* workspaces/@fire22-core-*; do
     if git diff --quiet HEAD~1 "$ws"; then
       echo "No changes in $(basename "$ws"), skipping..."
     else
       (cd "$ws" && bun run build)
     fi
   done
   ```

## Troubleshooting

### 🔧 Common Issues

#### Workspace Not Found

```bash
$ bun run ws:dev nonexistent
❌ Workspace @fire22-nonexistent not found

# Solution: Check available workspaces
bun run workspaces:list
```

#### Version Inconsistencies

```bash
# Problem: Mixed versions across workspaces
bun run version:status

# Solution: Synchronize versions
bun run version:sync
```

#### Dependency Conflicts

```bash
# Problem: Different package versions
bun run deps:why problematic-package

# Solution: Standardize across workspaces
bun run all:add problematic-package@latest
```

### 🚨 Emergency Procedures

#### Complete Reset

```bash
# Nuclear option: clean everything and reinstall
bun run all:clean
bun install --frozen-lockfile
bun run pkg:fix-all
```

#### Selective Workspace Reset

```bash
# Reset specific workspace
cd workspaces/@fire22-problematic && rm -rf node_modules
cd workspaces/@fire22-problematic && bun install
```

## Integration with CI/CD

### 🔄 Automated Workflows

```bash
# Pre-commit hook
bun run pkg:fix-all
bun run all:lint
bun run all:test

# Release workflow
bun run version:sync
bun run all:build
bun run verify:pre-publish
```

### 📊 Monitoring

```bash
# Generate reports
bun run deps:analyze  # Creates JSON report
bun run workspaces:outdated > outdated-report.txt
```

---

## Quick Command Reference

```bash
# Workspace Operations
bun run ws:dev <name>           # Start dev server
bun run ws:build <name>         # Build workspace
bun run ws:test <name>          # Test workspace
bun run ws:add <name> <pkg>     # Add dependency
bun run ws:add-dev <name> <pkg> # Add dev dependency

# Bulk Operations
bun run all:add <pkg>           # Add to all workspaces
bun run all:add-dev <pkg>       # Add dev dep to all
bun run all:build               # Build all workspaces
bun run all:test                # Test all workspaces
bun run all:lint                # Lint all workspaces
bun run all:clean               # Clean all workspaces

# Management
bun run workspaces:list         # List all workspaces
bun run workspaces:outdated     # Check outdated packages
bun run version:status          # Check version consistency
bun run version:sync            # Sync versions to root
bun run pkg:fix-all            # Fix all package.json files
```

This guide provides comprehensive patterns for managing Fire22's 15-workspace
monorepo using Bun's enhanced features and our custom automation scripts.

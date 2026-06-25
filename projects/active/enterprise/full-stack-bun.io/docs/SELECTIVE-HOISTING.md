# Selective Hoisting Guide

## Overview

Selective hoisting allows you to explicitly control which packages are hoisted to the root `node_modules` directory in monorepos, enabling tool discovery (ESLint, TypeScript) without full hoisting.

## Configuration

### `bunfig.toml` (Recommended)

```toml
[install]
# Public hoisting (to root node_modules)
publicHoistPattern = [
  "@types/*",      # TypeScript type definitions
  "*eslint*",      # ESLint plugins and configs
  "eslint-*",      # ESLint packages
  "@eslint/*",     # ESLint scoped packages
  "typescript",    # TypeScript compiler
  "prettier"       # Prettier formatter
]

# Internal hoisting (to node_modules/.bun/node_modules)
hoistPattern = [
  "@types/*",
  "*eslint*"
]

# Use isolated linker for monorepo stability
linker = "isolated"
```

### `.npmrc` (Cross-tool compatibility)

```ini
# Public hoist patterns
public-hoist-pattern[]=@types/*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=eslint-*
public-hoist-pattern[]=@eslint/*
```

## Pattern Matching

- `@types/*` - Matches all packages in `@types` scope
- `*eslint*` - Matches packages containing "eslint"
- `eslint-*` - Matches packages starting with "eslint-"
- `@eslint/*` - Matches all packages in `@eslint` scope

## Use Cases

### 1. TypeScript Types

```toml
publicHoistPattern = ["@types/*"]
```

**Why**: TypeScript needs to discover type definitions across workspace packages.

**Result**: All `@types/*` packages hoisted to root `node_modules/@types/`.

### 2. ESLint Plugins

```toml
publicHoistPattern = ["*eslint*", "eslint-*", "@eslint/*"]
```

**Why**: ESLint needs to discover plugins and configs across packages.

**Result**: All ESLint-related packages hoisted to root `node_modules/`.

### 3. Development Tools

```toml
publicHoistPattern = ["typescript", "prettier", "eslint"]
```

**Why**: Development tools need global visibility.

**Result**: Tools available at workspace root.

## Verification

```bash
# Check hoisted packages
ls node_modules/@types
ls node_modules/eslint-*

# Verify TypeScript can find types
bunx tsc --noEmit

# Verify ESLint can find plugins
bunx eslint .
```

## Best Practices

1. **Start Minimal**: Only hoist what you need
2. **Use Patterns**: Leverage wildcards for flexibility
3. **Test Tools**: Verify ESLint/TypeScript can discover dependencies
4. **Document Patterns**: Keep patterns documented in bunfig.toml

## Troubleshooting

### TypeScript Can't Find Types

```bash
# Check if @types packages are hoisted
ls node_modules/@types

# If not, add to publicHoistPattern
publicHoistPattern = ["@types/*"]
```

### ESLint Can't Find Plugins

```bash
# Check if ESLint packages are hoisted
ls node_modules/eslint-*

# If not, add to publicHoistPattern
publicHoistPattern = ["*eslint*"]
```

### Package Not Hoisted

1. Check pattern matches package name
2. Verify `linker = "isolated"` is set
3. Run `bun install` to apply changes




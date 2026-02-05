# Bun --define Flag Guide

## Overview

The `--define` flag allows you to declare statically-analyzable constants and globals. Bun replaces all usages of an identifier or property with a constant value at build/runtime time, enabling dead code elimination and other optimizations.

## Basic Usage

### Runtime
```bash
bun --define process.env.NODE_ENV="'production'" src/index.ts
```

### Build Time
```bash
bun build --define process.env.NODE_ENV="'production'" src/index.ts
```

## How It Works

### Before Transformation

```typescript
if (process.env.NODE_ENV === "production") {
  console.log("Production mode");
} else {
  console.log("Development mode");
}
```

### After --define Replacement

Bun replaces `process.env.NODE_ENV` with `"production"`:

```typescript
if ("production" === "production") {
  console.log("Production mode");
} else {
  console.log("Development mode");
}
```

### After Constant Folding

Bun's optimizer detects `"production" === "production"` is always `true`:

```typescript
if (true) {
  console.log("Production mode");
} else {
  console.log("Development mode");
}
```

### After Dead Code Elimination

Bun removes unreachable code:

```typescript
console.log("Production mode");
```

## Supported Value Types

### 1. Strings

```bash
bun --define process.env.NODE_ENV="'production'" src/index.ts
```

### 2. Identifiers

Replace all usages of `window` with `undefined`:

```bash
bun --define window="undefined" src/index.ts
```

Replace `global` with `globalThis`:

```bash
bun --define global="globalThis" src/index.ts
```

### 3. JSON Objects

```bash
bun --define AWS='{"ACCESS_KEY":"abc","SECRET_KEY":"def"}' src/index.ts
```

### 4. Properties

Replace `console.write` with `console.log`:

```bash
bun --define console.write=console.log src/index.ts
```

## Dashboard Build Usage

### Production Build

The dashboard CLI uses `--define` for production builds:

```bash
bun cli/dashboard/dashboard-cli.ts build
```

This automatically sets:
```bash
--define process.env.NODE_ENV="'production'"
```

### Development Build

For development builds:
```bash
NODE_ENV=development bun cli/dashboard/dashboard-cli.ts build
```

This sets:
```bash
--define process.env.NODE_ENV="'development'"
```

## Example: Environment-Specific Code

### Code Pattern

```typescript
// This code benefits from --define
if (process.env.NODE_ENV === "production") {
  // Production-only code (removed in dev builds)
  console.log("Production analytics enabled");
  enableProductionLogging();
} else {
  // Development-only code (removed in prod builds)
  console.log("Development mode");
  enableDebugMode();
}
```

### Production Build

```bash
bun build --define process.env.NODE_ENV="'production'" src/index.ts
```

**Result:** Only production code remains, development code is eliminated.

### Development Build

```bash
bun build --define process.env.NODE_ENV="'development'" src/index.ts
```

**Result:** Only development code remains, production code is eliminated.

## Benefits

1. **Dead Code Elimination**: Unreachable code is removed, reducing bundle size
2. **Performance**: Fewer conditionals at runtime
3. **Security**: Development-only code never reaches production
4. **Bundle Size**: Smaller production bundles

## Differences from Regular Variables

### Setting Variables (No Optimization)

```typescript
process.env.NODE_ENV = "production";
if (process.env.NODE_ENV === "production") {
  // This check still happens at runtime
}
```

**Problem:** Property accesses can have side effects (getters, setters, Proxy), so static analysis tools can't safely eliminate code.

### Using --define (Optimized)

```bash
bun --define process.env.NODE_ENV="'production'" src/index.ts
```

**Benefit:** Static replacement happens at transpilation time, enabling dead code elimination.

## Differences from String Replacement

- **AST-Level**: `--define` operates on the Abstract Syntax Tree, not text
- **Safe**: No escaping issues or unintended replacements
- **Optimized**: Works with Bun's transpiler for dead code elimination

## Dashboard Implementation

### CLI Build Command

The dashboard CLI (`cli/dashboard/dashboard-cli.ts`) automatically uses `--define`:

```typescript
const buildArgs = [
  "build",
  heatmapSrc,
  "--outdir",
  outputDir,
  "--target",
  "browser",
  "--define",
  `process.env.NODE_ENV="${env}"`,
];

if (isProduction) {
  buildArgs.push("--minify");
}

await $`bun ${buildArgs}`;
```

### Usage Examples

```bash
# Production build (default)
bun cli/dashboard/dashboard-cli.ts build

# Development build
NODE_ENV=development bun cli/dashboard/dashboard-cli.ts build

# Custom define
bun build pages/risk-heatmap.ts --define process.env.NODE_ENV="'production'" --target browser --minify
```

## Best Practices

1. **Use for Constants**: Only use `--define` for values that won't change at runtime
2. **Environment Variables**: Perfect for `NODE_ENV`, `API_URL`, etc.
3. **Production Builds**: Always use `--define` for production to enable optimizations
4. **Documentation**: Document which defines are used in your build process

## Real-World Example

See [BUN_DEFINE_EXAMPLES.md](./BUN_DEFINE_EXAMPLES.md) for a real-world KYC failsafe command example.

## References

- [Bun Documentation: --define Flag](https://bun.com/docs/bundler/define)
- [Bun Documentation: llms.txt](https://bun.com/docs/llms.txt)
- [BUN_DEFINE_EXAMPLES.md](./BUN_DEFINE_EXAMPLES.md) - Real-world examples

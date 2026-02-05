# Bun Type Definition Fixes

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**@types/bun**: latest

## Overview

This document tracks fixes and improvements made to Bun's TypeScript type definitions, ensuring proper type safety and IntelliSense support for Bun APIs.

---

## Fix 1: Added JSDoc Documentation for configVersion in BunLockFile Type Definition

### Issue
The `configVersion` property in the `BunLockFile` type definition lacked JSDoc documentation, making it unclear what this property represents and how it should be used.

### Fix
Added comprehensive JSDoc documentation for the `configVersion` property:

```typescript
/**
 * Bun lockfile type definition
 */
interface BunLockFile {
  /**
   * Configuration version of the lockfile format
   * 
   * - `0`: Legacy format (hoisted linker, Bun < 1.3)
   * - `1`: Modern format (isolated linker, Bun 1.3+)
   * 
   * @description Determines which lockfile format and linker strategy to use.
   * Projects with `configVersion: 1` use isolated installs by default,
   * preventing packages from accessing dependencies they don't declare.
   * 
   * @example
   * ```json
   * {
   *   "configVersion": 1,
   *   "lockfileVersion": "6.0",
   *   ...
   * }
   * ```
   * 
   * @see https://bun.com/docs/install/lockfile#configversion
   */
  configVersion: 0 | 1;
  
  // ... other properties
}
```

### Impact
- ✅ Improved IntelliSense documentation
- ✅ Clearer understanding of lockfile format versions
- ✅ Better developer experience when working with `bun.lock` files

### Verification
```bash
# Check lockfile configVersion
cat bun.lock | grep configVersion

# Expected output:
# "configVersion": 1
```

---

## Fix 2: Added Missing Loader Types ("css", "jsonc", "yaml", "html")

### Issue
The `Loader` type definition was missing several file type loaders that Bun supports, including:
- `"css"` - CSS file loader
- `"jsonc"` - JSON with Comments loader
- `"yaml"` - YAML file loader
- `"html"` - HTML file loader

This caused TypeScript errors when using these loaders in `Bun.build()` or other Bun APIs.

### Fix
Updated the `Loader` type definition to include all supported file types:

```typescript
/**
 * File loader types supported by Bun
 */
type Loader =
  | "js"           // JavaScript
  | "jsx"          // JSX (React)
  | "ts"           // TypeScript
  | "tsx"          // TypeScript + JSX
  | "css"          // ✅ CSS stylesheets
  | "json"         // JSON
  | "jsonc"        // ✅ JSON with Comments
  | "yaml"         // ✅ YAML configuration files
  | "html"         // ✅ HTML files
  | "toml"         // TOML configuration
  | "wasm"         // WebAssembly
  | "txt"          // Plain text
  | "file";        // Generic file
```

### Usage Examples

#### CSS Loader
```typescript
// Build CSS files
await Bun.build({
  entrypoints: ["./src/styles.css"],
  outdir: "./dist",
  loader: {
    ".css": "css"
  }
});
```

#### JSONC Loader
```typescript
// Load JSON with comments
const config = await Bun.file("./config.jsonc").text();
// Bun automatically handles comments in JSONC files
```

#### YAML Loader
```typescript
// Load YAML files
const yamlFile = Bun.file("./config.yaml");
const data = await yamlFile.yaml(); // Uses YAML loader internally
```

#### HTML Loader
```typescript
// Build HTML files
await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  loader: {
    ".html": "html"
  }
});
```

### Impact
- ✅ TypeScript now recognizes all Bun-supported loaders
- ✅ No more type errors when using CSS, JSONC, YAML, or HTML loaders
- ✅ Full IntelliSense support for all loader types
- ✅ Better type safety for build configurations

### Verification
```typescript
// TypeScript should now accept these loaders without errors
const loaders: Record<string, Bun.Loader> = {
  ".css": "css",      // ✅ No error
  ".jsonc": "jsonc",  // ✅ No error
  ".yaml": "yaml",    // ✅ No error
  ".yml": "yaml",     // ✅ No error
  ".html": "html"     // ✅ No error
};
```

---

## Fix 3: Removed Unnecessary Dependency on @types/react in @types/bun

### Issue
The `@types/bun` package incorrectly included `@types/react` as a dependency, even though Bun's type definitions don't require React types. This caused:
- Unnecessary package installation
- Potential version conflicts
- Larger `node_modules` size
- Confusion about Bun's React requirements

### Fix
Removed `@types/react` from `@types/bun` dependencies:

```json
// Before (@types/bun/package.json)
{
  "dependencies": {
    "@types/react": "^18.0.0",  // ❌ Unnecessary
    "bun-types": "1.3.4"
  }
}

// After (@types/bun/package.json)
{
  "dependencies": {
    "bun-types": "1.3.4"  // ✅ Only required dependency
  },
  "peerDependencies": {
    "@types/react": "*"  // ✅ Optional, only if using React
  }
}
```

### Impact
- ✅ Reduced package size
- ✅ Faster `bun install` times
- ✅ No unnecessary React type dependencies
- ✅ Clearer separation: React types only needed if using React
- ✅ No version conflicts with React type definitions

### Verification
```bash
# Check @types/bun dependencies
bun pm ls @types/bun

# Verify @types/react is not installed unless explicitly needed
bun pm ls @types/react

# If using React, install @types/react separately:
bun add -d @types/react @types/react-dom
```

### Migration Notes
If your project uses React with Bun:

1. **Install React types explicitly** (if not already installed):
   ```bash
   bun add -d @types/react @types/react-dom
   ```

2. **No changes needed** if you're already using React types.

3. **Projects without React** no longer pull in unnecessary React type definitions.

---

## Related Documentation

- [Bun TypeScript Integration](./BUN-1.3.3-TYPESCRIPT-INTEGRATION.md)
- [Bun Native Optimizations](./BUN-NATIVE-OPTIMIZATIONS.md)
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md)
- [Bun Official TypeScript Docs](https://bun.com/docs/typescript)

## Search Commands

### Find References to These Fixes
```bash
# Find configVersion references
rg "configVersion" bun.lock

# Find Loader type usage
rg "Loader.*css|jsonc|yaml|html" src/

# Find @types/bun references
rg "@types/bun" package.json
```

### Verify Type Definitions
```bash
# Check Bun version
bun --version

# Check @types/bun version
bun pm ls @types/bun

# Verify type definitions are loaded
bun --print <(echo 'console.log(typeof Bun.Loader)')
```

---

## Summary

| Fix | Status | Impact | Verification |
|-----|--------|--------|--------------|
| JSDoc for `configVersion` | ✅ Fixed | Improved documentation | Check `bun.lock` |
| Loader types (css, jsonc, yaml, html) | ✅ Fixed | Full type support | TypeScript compilation |
| Removed `@types/react` dependency | ✅ Fixed | Cleaner dependencies | `bun pm ls` |

All fixes are included in `@types/bun@latest` (Bun 1.3.4+).

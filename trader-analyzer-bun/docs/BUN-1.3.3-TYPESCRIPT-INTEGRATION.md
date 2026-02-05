# Bun 1.3.3 TypeScript Definitions Integration

## Overview

This document describes how Hyper-Bun leverages Bun 1.3.3+ improved TypeScript definitions for better type safety and developer experience.

## Bun 1.3.3 TypeScript Improvements

According to [Bun v1.3.3 Release Notes](https://bun.com/blog/bun-v1.3.3#typescript-definitions), Bun 1.3.3 introduced:

1. **Improved TypeScript definitions** for Bun APIs
2. **Better type inference** for global objects
3. **Enhanced IDE support** with proper types

## UIContextRewriter Type Safety Updates

### Before (Using `any`)

```typescript
// Old approach - loose typing
const HTMLRewriter = (globalThis as any).HTMLRewriter;
const rewriter = new HTMLRewriter();
rewriter.on("body", {
  element: (element: any) => {  // ❌ any type
    // ...
  }
});
```

### After (Using Bun 1.3.3+ Types)

```typescript
// Bun 1.3.3+: Proper type declarations
declare const HTMLRewriter: typeof globalThis.HTMLRewriter | undefined;

const HTMLRewriterClass = globalThis.HTMLRewriter || undefined;

// Proper typing throughout
createRewriter(): InstanceType<typeof HTMLRewriter> {
  const rewriter = new this.rewriterClass();
  rewriter.on("body", {
    element: (element) => {  // ✅ Properly inferred type
      // ...
    }
  });
}
```

## Type Safety Benefits

### 1. Better IDE Support

**Before**:
- No autocomplete for `element` methods
- No type checking for handler parameters
- `any` types hide errors

**After**:
- Full autocomplete for HTMLRewriter API
- Type checking catches errors at compile time
- Proper IntelliSense for all methods

### 2. Compile-Time Error Detection

```typescript
// TypeScript now catches these errors:
rewriter.on("body", {
  element: (element) => {
    element.setAttribute('class', 'test');  // ✅ Type-checked
    element.invalidMethod();                // ❌ Compile error
  }
});
```

### 3. Better Refactoring Support

- Rename operations work correctly
- Find usages is accurate
- Go to definition works properly

## Implementation Details

### HTMLRewriter Type Declaration

```typescript
// Bun 1.3.3+ provides HTMLRewriter as a global type
declare const HTMLRewriter: typeof globalThis.HTMLRewriter | undefined;

// Runtime check with proper typing
const HTMLRewriterClass = 
  (typeof globalThis !== 'undefined' && globalThis.HTMLRewriter) ||
  (typeof Bun !== 'undefined' && 'HTMLRewriter' in Bun && (Bun as any).HTMLRewriter) ||
  undefined;
```

### Return Type Improvements

```typescript
// Before
createRewriter(): any {
  // ...
}

// After
createRewriter(): InstanceType<typeof HTMLRewriter> {
  // ...
}
```

### Handler Parameter Types

```typescript
// Before: explicit any
rewriter.on("[data-feature]", {
  element: (element: any) => {
    // ...
  }
});

// After: inferred types from Bun 1.3.3+
rewriter.on("[data-feature]", {
  element: (element) => {
    // TypeScript infers correct type from HTMLRewriter definitions
    // Full autocomplete and type checking available
  }
});
```

## Compatibility

### Bun Version Requirements

- **Minimum**: Bun 1.3.3+ for improved TypeScript definitions
- **Recommended**: Bun 1.4+ for HTMLRewriter API availability
- **Fallback**: `--compat` flag for Cloudflare Workers compatibility

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "types": ["bun"],
    "target": "ESNext",
    "module": "Preserve"
  }
}
```

### Package Dependencies

```json
{
  "devDependencies": {
    "@types/bun": "latest",  // Includes Bun 1.3.3+ definitions
    "typescript": "^5.0.0"
  }
}
```

## Type Definition Fixes

Recent fixes to `@types/bun` include:
- ✅ Added JSDoc documentation for `configVersion` in `BunLockFile` type
- ✅ Added missing loader types: `"css"`, `"jsonc"`, `"yaml"`, `"html"`
- ✅ Removed unnecessary `@types/react` dependency

See [Bun Type Definition Fixes](./BUN-TYPE-DEFINITION-FIXES.md) for details.

## Migration Guide

### Step 1: Update Bun

```bash
bun upgrade
# Verify version
bun --version  # Should be 1.3.3+
```

### Step 2: Update @types/bun

```bash
bun add -d @types/bun@latest
```

**Note**: `@types/bun@latest` no longer includes `@types/react` as a dependency. If you use React, install it separately:
```bash
bun add -d @types/react @types/react-dom
```

### Step 3: Update Code

Replace `any` types with proper Bun types:

```typescript
// Old
const HTMLRewriter = (globalThis as any).HTMLRewriter;
element: (element: any) => {}

// New
declare const HTMLRewriter: typeof globalThis.HTMLRewriter | undefined;
element: (element) => {}  // Type inferred from HTMLRewriter
```

### Step 4: Verify Types

```bash
bun run typecheck
# Should show improved type checking
```

## Benefits Summary

✅ **Better IDE Support**: Full autocomplete and IntelliSense  
✅ **Compile-Time Safety**: Catch errors before runtime  
✅ **Better Refactoring**: Accurate find/replace operations  
✅ **Self-Documenting**: Types serve as documentation  
✅ **Future-Proof**: Compatible with Bun's evolving type system  

## Related Documentation

- [Bun Type Definition Fixes](./BUN-TYPE-DEFINITION-FIXES.md) - Recent fixes to @types/bun
- [Bun v1.3.3 Release Notes](https://bun.com/blog/bun-v1.3.3#typescript-definitions)
- [UIContextRewriter Implementation](./UI-CONTEXT-REWRITER-IMPLEMENTATION-SUMMARY.md)
- [Bun HTMLRewriter Documentation](https://bun.com/docs/runtime/html-rewriter)

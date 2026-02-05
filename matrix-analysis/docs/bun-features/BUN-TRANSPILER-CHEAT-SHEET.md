# 🚀 Bun.Transpiler Cheat Sheet

## Quick Reference

### Create a Transpiler

```typescript
const transpiler = new Bun.Transpiler({
  loader: "tsx", // "js" | "jsx" | "ts" | "tsx"
  target: "browser", // "browser" | "bun" | "node"
  define: { "process.env.NODE_ENV": "\"production\"" },
  minifyWhitespace: true,
  trimUnusedImports: true
});
```

### Transform Code

```typescript
// Synchronous (recommended for most cases)
const result = transpiler.transformSync(code);
const withLoader = transpiler.transformSync(code, "jsx");

// Asynchronous (for many large files)
const result = await transpiler.transform(code);
```

### Scan Imports/Exports

```typescript
// Full scan (slower but more accurate)
const { exports, imports } = transpiler.scan(code);

// Imports only (faster for large files)
const imports = transpiler.scanImports(code);
```

## Import Types

| Kind | Example | Description |
|------|---------|-------------|
| `import-statement` | `import React from 'react'` | ES6 import |
| `require-call` | `require('./module')` | CommonJS require |
| `require-resolve` | `require.resolve('./module')` | Resolve path only |
| `dynamic-import` | `await import('./module')` | Dynamic import |
| `import-rule` | `@import 'styles.css'` | CSS import |
| `url-token` | `url('./image.png')` | CSS URL reference |
| `internal` | `import.meta.url` | Bun-injected |
| `entry-point-*` | - | Bundle entry points |

## Configuration Options

### Core Options

- **loader**: Default file type loader
- **target**: Output platform target
- **define**: Replace variables (like webpack DefinePlugin)
- **tsconfig**: Custom TypeScript configuration

### Optimization Options

- **minifyWhitespace**: Remove extra whitespace
- **trimUnusedImports**: Remove unused imports
- **inline**: Inline constant values (default: true)
- **jsxOptimizationInline**: Enable JSX optimizations

### Advanced Options

- **macro**: Replace imports with macros
- **exports**: Eliminate or rename exports

## Performance Tips

1. Use `transformSync()` for single files
2. Use `scanImports()` for large files instead of `scan()`
3. Enable `minifyWhitespace` for production builds
4. Use `trimUnusedImports` to reduce bundle size

## Real-world Examples

### React Component

```typescript
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  target: "browser",
  define: { "process.env.NODE_ENV": "\"production\"" }
});

const result = transpiler.transformSync(`
import React from 'react';
export default () => <div>Hello World</div>;
`);
```

### Node.js Module

```typescript
const transpiler = new Bun.Transpiler({
  loader: "ts",
  target: "node"
});

const result = transpiler.transformSync(`
import { readFile } from 'fs';
export const data = readFile('./file.txt');
`);
```

### Preact Configuration

```typescript
const transpiler = new Bun.Transpiler({
  loader: "jsx",
  tsconfig: {
    jsxFactory: "h" as any,
    jsxFragmentFactory: "Fragment",
    jsxImportSource: "preact"
  }
});
```

## Error Handling

```typescript
try {
  const result = transpiler.transformSync(code);
} catch (error) {
  console.error('Transpilation failed:', error.message);
}
```

## Complete Implementation

See: `bun-transpiler-complete-reference.ts`

This demonstrates ALL features from the official Bun.Transpiler documentation!

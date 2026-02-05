# Bun JSX/TypeScript Setup Guide

This project now uses Bun instead of Vite for JSX/TypeScript compilation and bundling.

## Key Changes

### 1. Removed Vite Dependencies

- No more `vite`, `@vitejs/*`, or Vite configuration files
- Uses Bun's native bundler and TypeScript support

### 2. Added React Support

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

### 3. TypeScript Configuration

Created `tsconfig.json` with Bun-optimized settings:

- `"jsx": "react-jsx"` for modern JSX transform
- `"target": "ESNext"` for latest JavaScript features
- `"moduleResolution": "bundler"` for Bun's bundler
- `"types": ["bun-types"]` for Bun-specific APIs

### 4. Build Scripts

```json
{
  "scripts": {
    "build": "bun build ./src/index.tsx --outdir ./dist --target browser --minify --sourcemap",
    "build:dev": "bun build ./src/index.tsx --outdir ./dist --target browser --sourcemap",
    "dev": "bun --hot --watch server.ts"
  }
}
```

## JSX Syntax Error Fix

The original error:

```text
ERROR: The character "}" is not valid inside a JSX element
```

### Cause

Stray closing braces in JSX code, like:

```jsx
// BAD - stray closing brace
<div>
  <p>Content</p>
}  // <- This causes the error
</div>
```

### Solution

Remove stray braces and ensure proper JSX syntax:

```jsx
// GOOD - proper JSX
<div>
  <p>Content</p>
</div>
```

## Usage

### Development

```bash
bun run dev
```

### Build for Production

```bash
bun run build
```

### Build for Development

```bash
bun run build:dev
```

## Performance Benefits

- **Faster builds**: Bun's bundler is 10-100x faster than Vite/Webpack
- **Native TypeScript**: No transpilation step needed
- **Built-in JSX support**: No additional plugins required
- **Smaller bundles**: Better tree-shaking and optimization

## Testing JSX Components

The project includes example components:

- `example-component.tsx` - Basic React component
- `jsx-fix-demo.tsx` - Demonstrates JSX syntax fixes

Both compile successfully with Bun:

```bash
bun build ./example-component.tsx --outdir ./test-dist
bun build ./jsx-fix-demo.tsx --outdir ./test-dist
```

## Migration from Vite

1. ✅ Remove `vite` and related dependencies
2. ✅ Add `react` and `react-dom` if not present
3. ✅ Create `tsconfig.json` with JSX settings
4. ✅ Update build scripts to use `bun build`
5. ✅ Remove `vite.config.*` files
6. ✅ Use Bun's built-in dev server with `--hot` flag

## Bun Configuration

The `bunfig.toml` file contains optimized settings:

- Build targets and optimization
- Package management configuration
- Development server settings
- Performance tuning for the 13-byte config system

This setup provides a complete Vite replacement with superior performance and simpler configuration.

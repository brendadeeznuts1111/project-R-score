# --ignore-dce-annotations Quick Reference

## What It Does

Ignores Dead Code Elimination (DCE) annotations:
- `@PURE`
- `@__PURE__`
- `@__NO_SIDE_EFFECTS__`
- `package.json "sideEffects"` field

## When to Use

✅ **Use When**:
- Build fails with "Cannot find module"
- Runtime errors due to eliminated code
- Plugin/extension system not working
- Polyfills not loading
- Decorators/CSS not registering
- Side effects not running

❌ **Don't Use When**:
- Production builds (unless necessary)
- Library packages (let users decide)
- Code without side effects
- You want smallest bundle size

## Usage

### CLI

```bash
# Basic usage
bun build --ignore-dce-annotations src/index.ts

# With minification
bun build --ignore-dce-annotations --minify src/index.ts

# With features
bun build --ignore-dce-annotations --feature=FEAT_CLOUD_UPLOAD src/index.ts

# Dashboard
bun build --ignore-dce-annotations dashboard-react/src/index.tsx --outdir=./dist
```

### Programmatic

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  ignoreDCEAnnotations: true,
  outdir: "./dist"
});
```

## NPM Scripts

```json
{
  "scripts": {
    "build:safe": "bun build --ignore-dce-annotations src/index.ts",
    "build:safe:minify": "bun build --ignore-dce-annotations --minify src/index.ts",
    "build:dashboard:safe": "bun build --ignore-dce-annotations dashboard-react/src/index.tsx --outdir=./dist"
  }
}
```

## Examples

### Plugin System

```typescript
// plugins.ts
export function registerPlugin(name: string, plugin: any) {
  globalPlugins[name] = plugin;
}

// Self-registration (side effect!)
registerPlugin("logger", loggerPlugin);

// main.ts
import { usePlugin } from "./plugins";

// Error: 'loggerPlugin' not found (eliminated by DCE)
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

### Polyfills

```typescript
// polyfills.ts
export function installPolyfills() {
  console.log("Installing...");
  // Install polyfills
}

installPolyfills(); // Side effect at module level!

// main.ts
import "./polyfills"; // Just for side effects

// Error: Polyfills not installed (module eliminated)
```

**Solution**:
```bash
bun build --ignore-dce-annotations src/index.ts
```

## Better Alternative

Use `package.json "sideEffects"` instead:

```json
{
  "sideEffects": [
    "./src/plugins.ts",
    "./src/polyfills.ts",
    "./src/styles.ts"
  ]
}
```

**Benefits**:
- ✅ More explicit
- ✅ Only affects specified files
- ✅ Doesn't disable all DCE
- ✅ Still tree-shakes other code

## Comparison

| Build Command | DCE Annotations | sideEffects Field | Tree-Shaking | Bundle Size |
|---------------|-----------------|-------------------|--------------|-------------|
| `bun build src/index.ts` | ✅ Respected | ✅ Respected | ✅ Active | Smallest |
| `bun build --ignore-dce-annotations` | ❌ Ignored | ❌ Ignored | ✅ Active | Larger |
| `bun build --jsx-side-effects` | ✅ Respected | ✅ Respected | ✅ JSX only | Medium |

## Troubleshooting

### Build fails mysteriously

```bash
# Try with DCE ignored
bun build --ignore-dce-annotations src/index.ts

# If works, you have over-aggressive tree-shaking
# Fix: Add sideEffects to package.json
```

### Plugin not loading

```bash
# Use safe build
bun build --ignore-dce-annotations src/index.ts
```

### Runtime error: "undefined is not a function"

```bash
# Function was eliminated
bun build --ignore-dce-annotations src/index.ts
```

## Common Patterns Requiring Flag

1. **Plugin registration** at module level
2. **Decorator self-registration**
3. **Polyfill installation**
4. **CSS-in-JS injection**
5. **Singleton initialization**
6. **Dynamic import discovery**
7. **Configuration registry**

## Best Practices

1. **Test without flag first**
   ```bash
   bun build src/index.ts
   ```

2. **Use only if needed**
   ```bash
   # If build fails
   bun build --ignore-dce-annotations src/index.ts
   ```

3. **Fix root cause**
   ```json
   {
     "sideEffects": ["./src/plugins.ts"]
   }
   ```

4. **Remove flag when fixed**
   ```bash
   # Go back to normal build
   bun build src/index.ts
   ```

## Geelark Scripts

```bash
# Run DCE examples
bun run examples:dce

# Safe build (ignores DCE annotations)
bun run build:safe

# Safe minified build
bun run build:safe:minify

# Safe dashboard build
bun run build:dashboard:safe

# Safe upload system build
bun run build:upload:safe
```

## Summary

- **Flag**: `--ignore-dce-annotations`
- **Type**: Boolean (no value needed)
- **Purpose**: Ignore tree-shaking annotations
- **Use Case**: Workaround for over-aggressive DCE
- **Recommendation**: Use sparingly, prefer `sideEffects` field
- **Risk**: Larger bundle sizes

**Sources**:
- [Bun Runtime Docs](https://bun.com/docs/runtime)
- [Bun Bundler Docs](https://bun.com/docs/bundler)
- [Bun.BuildConfig API](https://bun.com/reference/bun/BuildConfig)
- [Bun 1.2 Release](https://bun.com/blog/bun-v1.2)

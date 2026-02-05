# Bun TOML Import Enhancements

## Overview
Updated the codebase to leverage Bun's native TOML import syntax (`import ... with { type: "toml" }`) for improved performance and cleaner code.

## Bun's Native TOML Import Syntax

Bun provides native support for importing TOML files directly:

```typescript
// Static import (compile-time, fastest)
import config from './config/features.toml' with { type: 'toml' };

// Dynamic import (runtime, use when path is variable)
const { default: config } = await import('./config/features.toml', { 
  with: { type: 'toml' } 
});
```

## Benefits

1. **Performance**: Native TOML parsing is faster than `Bun.TOML.parse()` because it's optimized at the runtime level
2. **Type Safety**: TypeScript can infer types from imported TOML files
3. **Cleaner Code**: No need for manual file reading and parsing
4. **Better Error Handling**: Import errors are handled by Bun's module system

## Changes Made

### 1. Created `cli/config-loader.ts`
A utility module that provides:
- `loadConfig<T>(filePath)` - Async TOML loading using Bun's native import
- `loadConfigs(filePaths[])` - Parallel loading of multiple configs
- `loadConfigWithFallback(primary, fallback)` - Load with fallback support

**Example:**
```typescript
import { loadConfig } from './cli/config-loader';
const config = await loadConfig('./config/features.toml');
```

### 2. Updated `src/server/index.ts`
Updated the dynamic config validation endpoint to use Bun's native import syntax:

**Before:**
```typescript
const content = await file.text();
const parsed = Bun.TOML.parse(content);
```

**After:**
```typescript
const module = await import(configPath, { with: { type: "toml" } });
const parsed = module.default;
```

This provides better performance for dynamic config loading while maintaining fallback to `Bun.TOML.parse()` for compatibility.

## Files Already Using Native TOML Imports

The following files already use Bun's native TOML import syntax (no changes needed):

- `src/client/components/ShortcutCustomization.tsx`
- `src/client/components/RouteHeatmap.tsx`
- `src/client/utils/mobile-detection.ts`
- `src/client/utils/theme-variables.ts`
- `src/client/hooks/useCRC32IntegrityGuard.tsx`
- `src/client/hooks/useVirtualizedMatrix.tsx`
- `src/client/hooks/useDeferredData.tsx`
- `src/client/hooks/useTransitionThemeSwitch.tsx`
- `src/client/ConfigTab.tsx`
- `src/client/config/index.ts`
- `src/client/utils/syntax-engine.ts`
- `src/client/utils/syntax-colors.ts`
- `src/server/network.ts`
- `scripts/startup-optimizations.ts`
- `scripts/config-lint.ts`
- `scripts/shortcuts-help.ts`

## Usage Patterns

### Static Import (Recommended for Known Paths)
```typescript
import featuresConfig from '../config/features.toml' with { type: 'toml' };
import themesConfig from '../config/ui-themes.toml' with { type: 'toml' };

// Use directly
console.log(featuresConfig.featureFlags);
```

### Dynamic Import (For Variable Paths)
```typescript
// Using the utility function
import { loadConfig } from './cli/config-loader';
const config = await loadConfig(`./config/${name}.toml`);

// Or directly
const { default: config } = await import(`./config/${name}.toml`, {
  with: { type: 'toml' }
});
```

### Parallel Loading
```typescript
import { loadConfigs } from './cli/config-loader';

const configs = await loadConfigs([
  './config/features.toml',
  './config/performance.toml',
  './config/theme.toml'
]);

// Access: configs['./config/features.toml']
```

## Performance Comparison

| Method | Performance | Use Case |
|--------|------------|----------|
| Static `import ... with { type: "toml" }` | Fastest (compile-time) | Known file paths |
| Dynamic `import(..., { with: { type: "toml" } })` | Fast (runtime optimized) | Variable file paths |
| `Bun.TOML.parse()` | Slower | Fallback or sync operations |

## Migration Guide

### For Static Configs
```typescript
// Old way
const file = Bun.file('./config/features.toml');
const content = await file.text();
const config = Bun.TOML.parse(content);

// New way
import config from './config/features.toml' with { type: 'toml' };
```

### For Dynamic Configs
```typescript
// Old way
const file = Bun.file(`./config/${name}.toml`);
const content = await file.text();
const config = Bun.TOML.parse(content);

// New way
import { loadConfig } from './cli/config-loader';
const config = await loadConfig(`./config/${name}.toml`);

// Or directly
const { default: config } = await import(`./config/${name}.toml`, {
  with: { type: 'toml' }
});
```

## Notes

- Bun's TOML import syntax requires Bun 1.0.0+
- Static imports are resolved at build time and are the fastest option
- Dynamic imports work with variable paths but are slightly slower
- The `config-loader.ts` utility provides a consistent API for both patterns
- All existing TOML files continue to work without modification

## Related Documentation

- [Bun TOML Import Documentation](https://bun.sh/docs/runtime/imports#toml)
- [Bun File API](https://bun.sh/docs/api/file)

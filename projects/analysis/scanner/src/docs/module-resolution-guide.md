# Bun Module Resolution Guide

Complete guide to module resolution in Bun, including error handling, best practices, and performance considerations.

## Official Documentation

- **[Bun.resolve API](https://bun.com/docs/api/utils#bun-resolve)** - Asynchronous module resolution
- **[Bun.resolveSync API](https://bun.com/docs/api/utils#bun-resolvesync)** - Synchronous module resolution
- **[import.meta.resolve](https://bun.com/docs/runtime/bun-apis#importmetaresolve)** - ESM module resolution
- **[ResolveMessage](https://bun.com/docs/api/utils#resolvemessage)** - Error class documentation
- **[Bun Utilities API](https://bun.com/docs/api/utils)** - Complete utilities reference

## Table of Contents

1. [Overview](#overview)
2. [API Reference](#api-reference)
3. [Error Handling](#error-handling)
4. [Best Practices](#best-practices)
5. [Performance Guide](#performance-guide)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

## Overview

Bun provides three main APIs for module resolution:

- **`Bun.resolve()`** - Asynchronous module resolution
- **`Bun.resolveSync()`** - Synchronous module resolution
- **`import.meta.resolve()`** - ESM-specific resolution with referer context

All three APIs can throw `ResolveMessage` errors when resolution fails.

## API Reference

### Bun.resolve

**📚 [Official Documentation](https://bun.com/docs/api/utils#bun-resolve)**

```typescript
const path = await Bun.resolve(specifier: string, from?: string): Promise<string>
```

**Parameters:**

- `specifier` (required): Module specifier to resolve (e.g., `'lodash'`, `'./utils'`, `'@scope/package'`)
- `from` (optional): Base directory for resolution (defaults to current working directory)

**Returns:** `Promise<string>` - Absolute path to the resolved module

**Throws:** `ResolveMessage` on failure

**Example:**

```typescript
// Resolve from current directory
const path = await Bun.resolve('lodash');
console.log(path); // "/project/node_modules/lodash/index.js"

// Resolve from specific directory
const utilsPath = await Bun.resolve('./utils', import.meta.dir);
```

### Bun.resolveSync

**📚 [Official Documentation](https://bun.com/docs/api/utils#bun-resolvesync)**

```typescript
const path = Bun.resolveSync(specifier: string, from?: string): string
```

**Parameters:** Same as `Bun.resolve`

**Returns:** `string` - Absolute path to the resolved module

**Throws:** `ResolveMessage` on failure

**Example:**

```typescript
// Synchronous resolution
const path = Bun.resolveSync('uuid', process.cwd());
console.log(path); // "/project/node_modules/uuid/dist/index.js"
```

### import.meta.resolve

**📚 [Official Documentation](https://bun.com/docs/runtime/bun-apis#importmetaresolve)**

```typescript
const path = await import.meta.resolve(specifier: string, parent?: string): Promise<string>
```

**Parameters:**

- `specifier` (required): Module specifier to resolve
- `parent` (optional): Parent module URL for resolution context

**Returns:** `Promise<string>` - Absolute path to the resolved module

**Throws:** `ResolveMessage` on failure

**Example:**

```typescript
// Resolve relative to current module
const utilsPath = await import.meta.resolve('./utils');
```

### ResolveMessage

**📚 [Official Documentation](https://bun.com/docs/api/utils#resolvemessage)**

Error class thrown when module resolution fails.

**Properties:**

- `code: string` - Error code (e.g., `"MODULE_NOT_FOUND"`, `"INVALID_SPECIFIER"`, `"CIRCULAR_DEPENDENCY"`)
- `message: string` - Human-readable error message
- `specifier: string` - Module specifier that failed to resolve
- `referrer: string` - Path of the module that attempted the resolution
- `importKind: string` - Type of import (e.g., `"import"`, `"require"`, `"dynamic"`)
- `level: string` - Error level (`"error"`, `"warning"`, `"info"`, etc.)

**Example:**

```typescript
try {
	await Bun.resolve('./missing-module');
} catch (error) {
	if (error instanceof ResolveMessage) {
		console.log('Code:', error.code); // "MODULE_NOT_FOUND"
		console.log('Message:', error.message); // "Module not found: ./missing-module"
		console.log('Specifier:', error.specifier); // "./missing-module"
		console.log('Referrer:', error.referrer); // "/path/to/calling/module.ts"
	}
}
```

## Error Handling

### Basic Error Handling

```typescript
try {
	const path = await Bun.resolve('lodash');
	console.log('Resolved:', path);
} catch (error) {
	if (error instanceof ResolveMessage) {
		console.error('Resolution failed:', error.code, error.message);
	} else {
		console.error('Unknown error:', error);
	}
}
```

### Error-Specific Handling

```typescript
try {
	const path = await Bun.resolve(specifier);
	return path;
} catch (error) {
	if (error instanceof ResolveMessage) {
		switch (error.code) {
			case 'MODULE_NOT_FOUND':
				// Module doesn't exist - suggest installation or fallback
				console.error(`Module "${specifier}" not found. Try: bun add ${specifier}`);
				break;
			case 'INVALID_SPECIFIER':
				// Invalid module specifier format
				console.error(`Invalid module specifier: "${specifier}"`);
				break;
			case 'CIRCULAR_DEPENDENCY':
				// Circular dependency detected
				console.error('Circular dependency detected');
				break;
			default:
				console.error('Resolution error:', error.message);
		}
	}
	throw error;
}
```

### Using Error Handling Recipes

See `src/docs/error-handling-recipes.ts` for reusable error handling patterns:

```typescript
import {resolveWithErrorHandling, resolveWithFallback} from './error-handling-recipes';

// Basic error handling
const result = await resolveWithErrorHandling('lodash');
if (result.success) {
	console.log('Resolved:', result.path);
} else {
	console.error('Error:', result.error?.message);
}

// With fallback paths
const result2 = await resolveWithFallback('lodash', [import.meta.dir, process.cwd(), '/usr/local/lib/node_modules']);
```

## Best Practices

### 1. Prefer Async Resolution

Use `Bun.resolve()` (async) over `Bun.resolveSync()` when possible:

```typescript
// ✅ Good - Non-blocking
const path = await Bun.resolve('lodash');

// ⚠️ Use sync only when necessary (e.g., top-level code)
const path = Bun.resolveSync('lodash');
```

### 2. Provide Explicit Base Directory

Always specify `from` parameter for predictable resolution:

```typescript
// ✅ Good - Explicit base directory
const path = await Bun.resolve('./utils', import.meta.dir);

// ⚠️ Less predictable - uses process.cwd()
const path = await Bun.resolve('./utils');
```

### 3. Handle Errors Gracefully

Always handle `ResolveMessage` errors:

```typescript
// ✅ Good - Error handling
try {
	const path = await Bun.resolve(specifier);
	return path;
} catch (error) {
	if (error instanceof ResolveMessage) {
		// Handle specific error codes
		return handleResolveError(error);
	}
	throw error;
}
```

### 4. Use import.meta.resolve for ESM Context

For ESM modules, use `import.meta.resolve` to maintain referer context:

```typescript
// ✅ Good - ESM context preserved
const utilsPath = await import.meta.resolve('./utils');

// ⚠️ Less ideal - loses ESM context
const utilsPath = await Bun.resolve('./utils', import.meta.dir);
```

### 5. Cache Resolved Paths

Cache resolved paths when resolving the same modules repeatedly:

```typescript
const resolveCache = new Map<string, string>();

async function cachedResolve(specifier: string): Promise<string> {
	if (resolveCache.has(specifier)) {
		return resolveCache.get(specifier)!;
	}

	const path = await Bun.resolve(specifier);
	resolveCache.set(specifier, path);
	return path;
}
```

## Performance Guide

### Performance Characteristics

1. **Async vs Sync**: `Bun.resolve()` is generally faster for concurrent operations
2. **Caching**: Bun caches resolution results internally
3. **Base Directory**: Providing explicit `from` parameter can improve performance
4. **Batch Operations**: Use `Promise.all()` for multiple resolutions

### Benchmarking

```typescript
// Measure resolution performance
const start = Bun.nanoseconds();
const path = await Bun.resolve('lodash');
const duration = (Bun.nanoseconds() - start) / 1e6; // Convert to milliseconds
console.log(`Resolved in ${duration.toFixed(2)}ms`);
```

### Optimization Tips

1. **Batch Resolutions**: Resolve multiple modules concurrently

    ```typescript
    const paths = await Promise.all([Bun.resolve('lodash'), Bun.resolve('uuid'), Bun.resolve('chalk')]);
    ```

2. **Cache Results**: Cache resolved paths for repeated lookups
3. **Avoid Sync in Hot Paths**: Use async resolution in performance-critical code
4. **Provide Explicit Base**: Always specify `from` parameter for faster resolution

## Common Patterns

### Pattern 1: Resolve and Import

```typescript
async function resolveAndImport<T>(specifier: string): Promise<T> {
	const path = await Bun.resolve(specifier);
	return (await import(path)) as T;
}

// Usage
const lodash = await resolveAndImport('lodash');
```

### Pattern 2: Resolve with Fallback

```typescript
async function resolveWithFallback(specifier: string, fallbacks: string[]): Promise<string> {
	try {
		return await Bun.resolve(specifier);
	} catch {
		for (const fallback of fallbacks) {
			try {
				return await Bun.resolve(specifier, fallback);
			} catch {
				continue;
			}
		}
		throw new Error(`Could not resolve "${specifier}"`);
	}
}
```

### Pattern 3: Check if Module Exists

```typescript
async function moduleExists(specifier: string): Promise<boolean> {
	try {
		await Bun.resolve(specifier);
		return true;
	} catch (error) {
		if (error instanceof ResolveMessage && error.code === 'MODULE_NOT_FOUND') {
			return false;
		}
		throw error;
	}
}
```

### Pattern 4: Resolve Multiple Modules

```typescript
async function resolveMultiple(specifiers: string[]): Promise<Map<string, string>> {
	const results = await Promise.allSettled(
		specifiers.map(async spec => ({
			spec,
			path: await Bun.resolve(spec),
		})),
	);

	const resolved = new Map<string, string>();
	for (const result of results) {
		if (result.status === 'fulfilled') {
			resolved.set(result.value.spec, result.value.path);
		}
	}
	return resolved;
}
```

## Troubleshooting

### Module Not Found

**Error:** `ResolveMessage` with code `"MODULE_NOT_FOUND"`

**Solutions:**

1. Check if the module is installed: `bun install`
2. Verify the module name is correct
3. Check `package.json` dependencies
4. Verify `node_modules` directory exists

### Invalid Specifier

**Error:** `ResolveMessage` with code `"INVALID_SPECIFIER"`

**Solutions:**

1. Check module specifier format
2. Ensure relative paths start with `./` or `../`
3. Verify package scope format: `@scope/package`

### Circular Dependency

**Error:** `ResolveMessage` with code `"CIRCULAR_DEPENDENCY"`

**Solutions:**

1. Review module dependency graph
2. Refactor to break circular dependencies
3. Use dynamic imports where appropriate

### Performance Issues

**Symptoms:** Slow resolution times

**Solutions:**

1. Cache resolved paths
2. Use async resolution (`Bun.resolve()`)
3. Provide explicit `from` parameter
4. Batch multiple resolutions with `Promise.all()`

## Related APIs

- **[Bun.plugin](https://bun.com/docs/runtime/plugins)** - Module loader plugins
- **[Bun.build](https://bun.com/docs/bundler)** - Bundler with module resolution
- **[import.meta](https://bun.com/docs/runtime/bun-apis#importmeta)** - ESM metadata
- **[Bun.Transpiler](https://bun.com/docs/api/transpiler)** - TypeScript/JSX transpiler
- **[Bun.FileSystemRouter](https://bun.com/docs/api/file-system-router)** - File-based routing

## See Also

- **[Error Handling Recipes](./error-handling-recipes.ts)** - Reusable error handling patterns
- **[Bun API Catalog](../../cli/renderers/bun-api-matrix.ts)** - Complete API reference
- **[Bun.resolve Documentation](https://bun.com/docs/api/utils#bun-resolve)** - Official API documentation
- **[Bun.resolveSync Documentation](https://bun.com/docs/api/utils#bun-resolvesync)** - Synchronous resolution docs
- **[import.meta.resolve Documentation](https://bun.com/docs/runtime/bun-apis#importmetaresolve)** - ESM resolution docs
- **[Bun Utilities API](https://bun.com/docs/api/utils)** - Complete utilities reference
- **[Bun Runtime APIs](https://bun.com/docs/runtime/bun-apis)** - Runtime API documentation

# Tag Manager Pro - Advanced Features

## Overview

Tag Manager Pro is an advanced tag management system with custom error inspection, context awareness, security integration, and environment adaptation.

## Key Features

### 1. Custom Error Inspection with Error.prepareStackTrace

Uses `Error.prepareStackTrace` to provide structured, formatted stack traces:

```typescript
class TagManagerError extends Error {
  [Bun.inspect.custom](depth: number, options: any) {
    // Custom formatted error output with:
    // - Context information
    // - Tag context (if available)
    // - Filtered stack traces
    // - Color-coded output
  }
}
```

**Features**:
- Structured stack trace with function names, file paths, line/column numbers
- Filters out node_modules and native code
- Shows async/constructor indicators
- Context-aware depth handling
- Tag context integration

### 2. Context Awareness

Deep integration with Bun runtime:

```typescript
{
  bunVersion: Bun.version,
  bunRevision: Bun.revision,
  mainScript: Bun.main,
  currentPath: import.meta.path,
  isMainScript: import.meta.main,
  timestamp: ISO timestamp
}
```

### 3. Security Integration

Automatic sensitive data redaction:

- **Default Patterns**: passwords, tokens, secrets, API keys, credentials
- **Custom Patterns**: Configurable via constructor
- **Environment-Aware**: Enabled in production, disabled in debug mode

```typescript
const buffer = new CircularBuffer(10, {
  sensitivePatterns: [/custom-pattern/gi]
});
```

### 4. Environment Adaptation

Dynamic configuration based on:

- **NODE_ENV**: `production` (compact + redaction) vs `development` (verbose)
- **DEBUG_LEVEL**: `trace` (2x items), `debug` (full), `info` (standard), `warn`/`error` (reduced)
- **Execution Context**: Main script vs module

### 5. Advanced Array Formatting

Multiple formatting options:

- **`dense`**: Single-line compact
- **`expanded`**: Multi-line with index labels
- **`compact`**: Compact representation
- **Custom Separator**: Configurable array item separator

### 6. Caching System

LRU cache with statistics:

- Automatic eviction when full
- Hit/miss tracking
- Error tracking
- Custom `Bun.inspect.custom` for cache inspection

## Usage

### Basic Usage

```typescript
import { TagManagerPro } from './scripts/tag-manager-pro';

const manager = new TagManagerPro();
const results = await manager.scanFiles('src/**/*.ts');
```

### Custom Configuration

```typescript
const manager = new TagManagerPro({
  arrayFormat: 'expanded',
  maxArrayLength: 100,
  redactSensitive: true,
  enableCaching: true,
});
```

### Error Handling

```typescript
try {
  await manager.scanFiles('src/**/*.ts');
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error); // Beautiful formatted error with stack trace
  }
}
```

## Environment Variables

| Variable | Values | Default | Effect |
|----------|--------|---------|--------|
| `TAG_ARRAY_FORMAT` | `dense`, `expanded`, `compact` | `expanded` (dev), `compact` (prod) | Array formatting style |
| `TAG_ARRAY_SEP` | string | `', '` | Array item separator |
| `TAG_MAX_ARRAY_LEN` | number | `50` | Maximum array length |
| `TAG_INCLUDE_EXEC_CONTEXT` | `true`, `false` | `true` (dev) | Include execution context |
| `TAG_INCLUDE_FILE_CONTEXT` | `true`, `false` | `true` (dev) | Include file context |
| `TAG_REDACT_SENSITIVE` | `true`, `false` | `true` (prod) | Enable sensitive data redaction |
| `TAG_ENABLE_CACHE` | `true`, `false` | `true` (dev) | Enable caching |
| `TAG_MAX_CACHE_SIZE` | number | `1000` | Maximum cache size |
| `DEBUG_LEVEL` | `0-5` | `0` | Debug verbosity level |

## Error Inspection Examples

### Standard Error

```typescript
throw new TagManagerError('Operation failed', {
  operation: 'scan',
  file: 'test.ts',
});
```

Output:
```text
✗ TagManagerError: Operation failed
Context: {
  operation: "scan",
  file: "test.ts"
}
Stack Trace:
  1. <function> (file.ts:123:45)
  2. <function> (file.ts:456:78)
```

### Error with Tag Context

```typescript
throw new TagManagerError('Invalid tag', {
  tag: '[hyper-bun][utils][feat][META:priority=high][tag-manager][#REF:Bun.utils]',
});
```

Automatically parses tag and includes in error context.

### Error with showHidden

```typescript
console.log(Bun.inspect(error, { showHidden: true }));
```

Shows additional metadata:
- Error name and message
- Stack trace length
- Tag context (if available)
- Full execution context

## CLI Commands

```bash
# Scan files
bun run scripts/tag-manager-pro.ts scan "src/**/*.ts"

# Validate tag
bun run scripts/tag-manager-pro.ts validate "[hyper-bun][utils][feat][META:priority=high][tag-manager][#REF:Bun.utils]"

# Show cache statistics
bun run scripts/tag-manager-pro.ts stats

# Show configuration
bun run scripts/tag-manager-pro.ts config
```

## Best Practices

1. **Error Handling**: Always catch `TagManagerError` for formatted errors
2. **Security**: Use custom `sensitivePatterns` for domain-specific sensitive data
3. **Performance**: Enable caching for repeated scans
4. **Debugging**: Use `DEBUG_LEVEL=debug` for full error details
5. **Production**: Let environment variables handle configuration automatically

## See Also

- [Bun.inspect.custom Documentation](https://bun.sh/docs/runtime/utils#bun-inspect-custom)
- [Error.prepareStackTrace](https://v8.dev/docs/stack-trace-api)
- [CircularBuffer Advanced Features](./CIRCULAR-BUFFER-ADVANCED.md)
- [Hyper-Bun Manifesto](./HYPER-BUN-MANIFESTO.md)

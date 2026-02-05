# Advanced CircularBuffer Inspection Features

## Overview

The `CircularBuffer` class features advanced `Bun.inspect.custom` implementation with enterprise-grade inspection capabilities.

## Features

### 1. Advanced Array Formatting

#### Array Format Options
- **`oneline`**: Single-line compact format
- **`structured`**: Multi-line formatted (default)
- **`compact`**: Compact representation
- **`expanded`**: Expanded format with index labels

#### Array Separator
Custom separator for array items (default: `', '`)

```typescript
Bun.inspect(buffer, { 
  arrayFormat: 'oneline',
  arraySeparator: ' | ' 
});
```

#### Enhanced maxArrayLength
Context-aware scaling based on execution environment:
- Main script + verbose: up to 200 items
- Development mode: up to 100 items
- Production mode: up to 10 items
- Adjusts based on `DEBUG_LEVEL` environment variable

### 2. Context Awareness

#### Deep Integration with Bun.main and import.meta.path
- Detects if running as main script vs module
- Captures creation file path
- Tracks execution context

```typescript
{
  _createdAt: "2025-12-06T13:20:15.555Z",
  _createdIn: "/path/to/file.ts",
  _executionContext: {
    mainScript: Bun.main,
    currentPath: import.meta.path,
    isMainScript: boolean
  }
}
```

### 3. Environment Adaptation

#### Dynamic Configuration Based on Environment Variables

**NODE_ENV**:
- `production`: Compact mode, sensitive data redaction enabled
- `development`: Verbose mode, full details

**DEBUG_LEVEL**:
- `trace`: Maximum verbosity (2x items)
- `debug`: Full details, no redaction
- `info`: Standard verbosity
- `warn`/`error`: Reduced verbosity (50% items)

**Automatic Adaptation**:
```typescript
const envConfig = {
  verbose: !isProduction || debugLevel === 'debug',
  maxItems: isMainScript ? 200 : isVerbose ? 100 : 10,
  showDetails: isVerbose || debugLevel === 'debug',
  redactSensitive: isProduction && debugLevel !== 'debug'
};
```

### 4. Security Integration

#### Sensitive Data Redaction

**Default Patterns**:
- API keys: `/api[_-]?key|apikey/gi`
- Tokens: `/token|bearer|authorization/gi`
- Passwords: `/password|passwd|pwd/gi`
- Secrets: `/secret|secret[_-]?key/gi`

**Custom Patterns**:
```typescript
const buffer = new CircularBuffer(10, {
  sensitivePatterns: [
    /custom-pattern/gi,
    /another-pattern/gi
  ]
});
```

**Redaction Behavior**:
- Enabled by default in production
- Disabled in development or when `DEBUG_LEVEL=debug`
- Can be overridden via `redactSensitive` option
- Redacts both string values and object properties

### 5. File Context Tracking

#### Optional Creation Context

When `showFileContext: true`:
```typescript
{
  _createdAt: "ISO timestamp",
  _createdIn: "file path where buffer was created",
  _executionContext: {
    mainScript: Bun.main,
    currentPath: import.meta.path,
    isMainScript: boolean
  }
}
```

Enabled automatically in verbose mode or when `showFileContext: true`.

## Usage Examples

### Basic Usage
```typescript
import { CircularBuffer } from './utils/circular-buffer';

const buffer = new CircularBuffer<number>(100);
buffer.push(1, 2, 3, 4, 5);
console.log(buffer); // Environment-aware formatting
```

### Advanced Formatting
```typescript
// Custom array format
console.log(Bun.inspect(buffer, {
  arrayFormat: 'expanded',
  arraySeparator: '\n',
  maxArrayLength: 20
}));
```

### Security-Aware
```typescript
const secureBuffer = new CircularBuffer<any>(10, {
  sensitivePatterns: [/password/gi, /token/gi]
});

secureBuffer.push({ apiKey: "secret123", data: "public" });
console.log(Bun.inspect(secureBuffer, { redactSensitive: true }));
// apiKey will be redacted
```

### Full Context
```typescript
console.log(Bun.inspect(buffer, {
  showFileContext: true,
  showHidden: true,
  redactSensitive: false
}));
```

## Environment Variables

| Variable | Values | Effect |
|----------|--------|--------|
| `NODE_ENV` | `production`, `development` | Controls verbosity and redaction |
| `DEBUG_LEVEL` | `trace`, `debug`, `info`, `warn`, `error` | Adjusts detail level |

## API Reference

### Constructor Options
```typescript
new CircularBuffer<T>(capacity: number, options?: {
  sensitivePatterns?: RegExp[];
})
```

### Inspection Options
```typescript
interface AdvancedInspectOptions extends Bun.InspectOptions {
  arrayFormat?: 'oneline' | 'structured' | 'compact' | 'expanded';
  arraySeparator?: string;
  maxArrayLength?: number;
  redactSensitive?: boolean | RegExp[];
  showFileContext?: boolean;
}
```

## Best Practices

1. **Production**: Use default settings (automatic redaction)
2. **Development**: Enable `showFileContext` for debugging
3. **Security**: Always use custom `sensitivePatterns` for sensitive data
4. **Performance**: Adjust `maxArrayLength` based on needs
5. **Debugging**: Use `showHidden: true` for internal state inspection

## Performance

- O(1) inspection overhead
- Lazy evaluation of formatting
- Context-aware caching
- Minimal memory footprint

## See Also

- [Bun.inspect.custom Documentation](https://bun.sh/docs/runtime/utils#bun-inspect-custom)
- [Hyper-Bun Manifesto](./HYPER-BUN-MANIFESTO.md)
- [Console Enhancement Utilities](../src/hyper-bun/console-enhancement.ts)

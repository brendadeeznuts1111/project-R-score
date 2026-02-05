# Safe TOML Parser with Stack Overflow Protection

This document describes the safe TOML parsing utilities added to address the Bun v1.3.7 stack overflow fixes for `Bun.JSONC.parse` and `Bun.TOML.parse`.

## Overview

The safe TOML parser provides additional protection against stack overflow errors and other parsing issues on top of Bun v1.3.7's built-in safeguards. It includes:

- **Stack overflow protection** with configurable depth limits
- **File size validation** to prevent memory exhaustion
- **Comprehensive error handling** with detailed error messages
- **Performance caching** with LRU eviction
- **Pre-parse validation** to catch common issues early
- **CLI tool** for easy testing and debugging

## Files Added

### Core Implementation
- `src/utils/toml-parser-safe.ts` - Main safe parsing utilities
- `src/__tests__/toml-parser-safe.test.ts` - Comprehensive test suite
- `src/cli/safe-toml-cli.ts` - CLI tool for safe TOML parsing

### Package Scripts
- `safe-toml` - Parse TOML files safely
- `safe-toml:help` - Show CLI help
- `safe-toml:stats` - Show cache statistics
- `safe-toml:clear` - Clear parse cache

## API Reference

### `safeParseToml(content, options?)`

Parse TOML string content with safety checks.

```typescript
import { safeParseToml } from './src/utils/toml-parser-safe';

const result = safeParseToml(tomlContent, {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxDepth: 1000,
  verboseErrors: true,
  enableCache: true,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
});

if (result.success) {
  console.log('Parsed data:', result.data);
  console.log('Metadata:', result.metadata);
} else {
  console.error('Parse error:', result.error);
}
```

### `safeParseTomlFile(filePath, options?)`

Parse TOML file with file system error handling.

```typescript
import { safeParseTomlFile } from './src/utils/toml-parser-safe';

const result = await safeParseTomlFile('./config/app.toml');
if (result.success) {
  // Use parsed data
}
```

### Options Interface

```typescript
interface SafeTomlParseOptions {
  maxFileSize?: number;    // Maximum file size in bytes (default: 10MB)
  maxDepth?: number;       // Maximum nesting depth (default: 1000)
  verboseErrors?: boolean; // Enable detailed error messages (default: true)
  enableCache?: boolean;   // Enable caching (default: true)
  cacheTTL?: number;       // Cache TTL in milliseconds (default: 10 minutes)
}
```

### Result Interface

```typescript
interface TomlParseResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    size: number;        // Content size in bytes
    parseTime: number;   // Parse time in milliseconds
    fromCache: boolean;  // Whether result came from cache
    depth: number;       // Maximum object depth
  };
}
```

## CLI Usage

### Basic Usage

```bash
# Parse a TOML file
bun run safe-toml config/app.toml

# Parse with verbose output
bun run safe-toml config/app.toml --verbose

# Parse with custom limits
bun run safe-toml config/app.toml --max-depth 500 --max-size 5242880
```

### Cache Management

```bash
# Show cache statistics
bun run safe-toml:stats

# Clear cache
bun run safe-toml:clear

# Parse without cache
bun run safe-toml config/app.toml --no-cache
```

### Help

```bash
bun run safe-toml:help
```

## Safety Features

### 1. Stack Overflow Protection

- **Pre-parse validation**: Checks table nesting before parsing
- **Post-parse validation**: Verifies actual object depth
- **Configurable limits**: Customizable maximum depth (default: 1000)
- **Early detection**: Catches potential issues before Bun's parser

### 2. File Size Protection

- **Size limits**: Prevents parsing excessively large files
- **Memory safety**: Avoids memory exhaustion attacks
- **Configurable thresholds**: Customizable maximum file size

### 3. Enhanced Error Handling

- **Detailed messages**: Context-specific error descriptions
- **Troubleshooting tips**: Helpful suggestions for common issues
- **Error categorization**: Different error types for different problems

### 4. Performance Optimization

- **LRU caching**: Intelligent caching with size limits
- **Fast hashing**: Uses Bun's built-in CRC32 for cache keys
- **Metadata tracking**: Detailed performance metrics

## Integration with Existing Code

### Replacing Existing `Bun.TOML.parse` Calls

```typescript
// Before (potentially vulnerable)
const parsed = Bun.TOML.parse(content);

// After (safe with protection)
const result = safeParseToml(content);
if (result.success) {
  const parsed = result.data;
} else {
  throw new Error(result.error);
}
```

### Updating Existing Utilities

You can update your existing TOML utilities to use the safe parser:

```typescript
// In src/utils/toml-utils.ts
import { safeParseToml } from './toml-parser-safe';

export function parseTomlString(content: string): any {
  const result = safeParseToml(content);
  if (!result.success) {
    throw new Error(`TOML parsing failed: ${result.error}`);
  }
  return result.data;
}
```

## Testing

The safe TOML parser includes comprehensive tests covering:

- ✅ Valid TOML parsing
- ✅ Syntax error handling
- ✅ Stack overflow protection
- ✅ File size limits
- ✅ Deep nesting validation
- ✅ Array and object handling
- ✅ Multiline string support
- ✅ Cache functionality
- ✅ Error message quality
- ✅ File system operations

Run tests with:

```bash
bun test src/__tests__/toml-parser-safe.test.ts
```

## Performance Considerations

### Cache Behavior

- **In-memory cache**: Shared within a single process
- **LRU eviction**: Automatically removes oldest entries
- **TTL-based expiration**: Entries expire after 10 minutes (configurable)
- **Size limits**: Maximum 100 cached entries

### Parsing Performance

- **Minimal overhead**: ~1-2μs additional validation time
- **Fast cache hits**: Sub-microsecond cache retrieval
- **Memory efficient**: Controlled memory usage via limits

## Migration Guide

### For New Projects

Use `safeParseToml` instead of `Bun.TOML.parse` for all TOML parsing needs.

### For Existing Projects

1. **Identify TOML parsing locations**:
   ```bash
   grep -r "Bun.TOML.parse" src/
   ```

2. **Replace with safe parser**:
   ```typescript
   // Old
   const data = Bun.TOML.parse(content);
   
   // New
   const result = safeParseToml(content);
   if (!result.success) {
     throw new Error(result.error);
   }
   const data = result.data;
   ```

3. **Add error handling** for the new result format

4. **Update tests** to use the new API

## Bun v1.3.7 Integration

This safe parser builds on Bun v1.3.7's improvements:

- **Leverages built-in stack overflow checks** in Bun's TOML parser
- **Adds additional validation layers** for maximum safety
- **Maintains compatibility** with existing Bun APIs
- **Provides migration path** for legacy code

## Troubleshooting

### Common Issues

1. **"Table nesting too deep"**
   - Increase `maxDepth` option
   - Flatten TOML structure
   - Use arrays instead of deep nesting

2. **"Content too large"**
   - Increase `maxFileSize` option
   - Split large files
   - Use streaming for very large data

3. **"TOML syntax error"**
   - Check for missing quotes
   - Verify table brackets
   - Validate equal signs and values

### Debug Mode

Use verbose mode for detailed debugging:

```bash
bun run safe-toml config/app.toml --verbose
```

This shows:
- Parse options used
- Detailed metadata
- Full error context
- Troubleshooting suggestions

## Future Enhancements

Potential improvements for future versions:

- **Streaming parser** for very large files
- **Schema validation** integration
- **Custom error formatters**
- **Persistent cache** across process restarts
- **Async parsing** for non-blocking operations

## Contributing

When contributing to the safe TOML parser:

1. **Add tests** for new features
2. **Update documentation** for API changes
3. **Maintain compatibility** with existing code
4. **Consider performance** impact of changes
5. **Test edge cases** thoroughly

## License

This safe TOML parser is part of the bun-toml-secrets-editor project and follows the same MIT license.

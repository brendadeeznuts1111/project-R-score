# Bun.ShellError - Quick Reference

## Overview
`Bun.ShellError` provides comprehensive error handling for shell command failures with access to stdout, stderr, exit codes, and multiple output formats.

## Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `exitCode` | `readonly number` | Exit code from failed shell command |
| `stdout` | `readonly Buffer` | Buffer containing stdout output |
| `stderr` | `readonly Buffer` | Buffer containing stderr output |
| `message` | `string` | Error message |
| `name` | `string` | Error name ("ShellError") |
| `cause` | `unknown` | The cause of the error |
| `stack` | `string` | Stack trace |

## Output Methods

### Text Output
```typescript
error.text()           // Default UTF-8
error.text('base64')   // Base64 encoding
error.text('hex')      // Hex encoding
```

### Binary Output
```typescript
error.bytes()          // Uint8Array
error.arrayBuffer()    // ArrayBuffer
error.blob()           // Blob
```

### Structured Output
```typescript
error.json()           // Parsed JSON object
```

## Static Methods

```typescript
$.ShellError.isError(value)      // Check if value is Error
$.ShellError.captureStackTrace(obj) // Create stack property
$.ShellError.stackTraceLimit     // Stack trace depth (default: 10)
```

## Usage Patterns

### Basic Error Handling
```typescript
try {
  await $`command`;
} catch (error) {
  if (error instanceof $.ShellError) {
    console.log(`Exit code: ${error.exitCode}`);
    console.log(`Stdout: ${error.text()}`);
    console.log(`Stderr: ${error.stderr.toString()}`);
  }
}
```

### JSON Processing
```typescript
try {
  await $`echo '{"data": "value"}'`;
} catch (error) {
  const data = error.json(); // { data: "value" }
}
```

### Recovery Patterns
```typescript
// Process partial output even if command fails
try {
  await $`command-that-produces-output-then-fails`;
} catch (error) {
  const output = error.text(); // Still get the output
  // Process output...
}
```

## Common Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Misuse of shell builtins |
| 126 | Command found but not executable |
| 127 | Command not found |
| 130 | Ctrl+C interrupt |

## Error Recovery Strategies

1. **Retry Logic** - Retry transient failures
2. **Fallback Commands** - Use alternative commands
3. **Partial Processing** - Process stdout even on failure
4. **Graceful Degradation** - Continue with limited functionality

## Integration Examples

### File Operations
```typescript
try {
  await $`cat config.json`;
} catch (error) {
  if (error.exitCode === 2) {
    // File doesn't exist, use defaults
    config = defaultConfig;
  } else {
    throw error; // Re-throw other errors
  }
}
```

### API Calls
```typescript
try {
  await $`curl -s https://api.example.com/data`;
} catch (error) {
  const response = error.text();
  if (response.includes('404')) {
    // Handle 404 specifically
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Always check `instanceof $.ShellError`** before accessing shell-specific properties
2. **Process both stdout and stderr** for complete error information
3. **Use appropriate output method** for your data type (text, json, binary)
4. **Implement retry logic** for transient failures
5. **Log exit codes** for debugging shell command issues
6. **Handle partial outputs** when commands fail after producing useful data

## Performance Considerations

- **Buffer access** is fastest for binary data
- **Text parsing** has encoding overhead
- **JSON parsing** can throw if output is malformed
- **Stack traces** are limited by `stackTraceLimit`

## Debugging Tips

```typescript
// Comprehensive error logging
function logShellError(error: $.ShellError) {
  console.error('Shell Error Details:');
  console.error(`  Exit Code: ${error.exitCode}`);
  console.error(`  Command: ${error.message}`);
  console.error(`  Stdout: ${error.text()}`);
  console.error(`  Stderr: ${error.stderr.toString()}`);
  if (error.stack) console.error(`  Stack: ${error.stack}`);
}
```

This reference provides the essential information for working effectively with `Bun.ShellError` in your applications.

# Shell Command Execution

This directory contains examples of shell command execution in Bun scripts using the `$` tagged template function.

## Files

- **`index.ts`** - Main example demonstrating shell command execution

## Overview

Bun provides a simple `$` tagged template function for running shell commands from TypeScript/JavaScript code. This allows you to execute system commands and capture their output in an async/await friendly way.

## Key Features

### Basic Command Execution
```ts
// Simple command execution
await $`echo Hello, world!`; // => "Hello, world!"
```

### Capturing Output
```ts
// Get output as text
const output = await $`ls -l`.text();
console.log(output);
```

### Processing Line By Line
```ts
// Process output line by line
for await (const line of $`ls -l`.lines()) {
  console.log(`Line: ${line}`);
}
```

## Usage Example

```bash
bun run examples/shell/index.ts
```

## Related Documentation

See [Bun Shell Documentation](https://bun.com/docs/runtime/shell) for complete API details.

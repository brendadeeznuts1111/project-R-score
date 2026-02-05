# CLI Arguments Parsing

This directory contains examples of command-line argument parsing in Bun scripts using the argument vector (`Bun.argv`) and the `util.parseArgs` utility.

## Files

- **`index.ts`** - Main example demonstrating CLI argument parsing

## Overview

Command-line arguments are passed to scripts via `Bun.argv`, which returns an array containing:
- The path to the Bun executable
- The path to the current script
- All arguments passed to the script

To parse arguments into a more useful structure, you can use Node.js's built-in `util.parseArgs` function, which provides structured options parsing with support for boolean flags, string values, and positional arguments.

## Usage Example

```bash
bun run examples/cli-args/index.ts --flag1 --flag2 value
```

This outputs:
```typescript
// Raw argv
[ "/path/to/bun", "/path/to/script.ts", "--flag1", "--flag2", "value" ]

// Parsed values
{ flag1: true, flag2: "value" }

// Positionals (executable and script paths)
[ "/path/to/bun", "/path/to/script.ts" ]
```

## Learn More

See [Bun Docs - CLI Arguments](https://bun.com/examples/cli-args) for more information.

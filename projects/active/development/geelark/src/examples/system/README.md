# System Examples

This directory contains examples of system interactions, environment management, and file system operations using Bun's APIs.

## Files

- `environment-vars.ts` - Working with environment variables and process.environ
- `file-operations.ts` - File system operations (read, write, mkdir, etc.)
- `working-directory.ts` - Directory navigation and path manipulation

## System Integration Features

Bun provides excellent system integration with:

- Native `Bun.env` and `process.env` access
- `Bun.write()` and `Bun.read()` for file operations
- `Bun.spawn()` with custom `cwd` and `env`
- Performance-optimized system calls

See [Bun documentation](https://bun.sh/docs) for complete API details.

# Examples Directory

This directory contains example code, demos, and test files for the Quantum Terminal Dashboard.

## Structure

### `servers/`
Bun server examples demonstrating different configurations:
- `server.ts` - Basic Bun server
- `timeout-server.ts` - Server with idle timeout
- `export-server.ts` - Server using export default syntax
- `reload-server.ts` - Hot reload server
- `abstract-server.ts` - Linux abstract namespace socket
- `unix-server.ts` - Unix domain socket server

### `tests/`
Integration and API tests:
- `test-bun-*.js` - Bun API feature tests
- `test-*.js` - Various component tests

### Other Examples
- `demo-*.js` - Interactive demos
- `debug-*.js` - Debugging utilities
- `hot-reload-*.js` - Hot reload examples
- `token-graph.*` - Graph visualization examples

## Running Examples

```bash
# Run a server example
bun run examples/servers/server.ts

# Run a test
bun run examples/tests/test-bun-cookie-api.js

# Run a demo
bun run examples/demo-console-depth.js
```

## Purpose

These examples serve as:
- Learning resources for Bun features
- Integration test suites
- Debugging tools
- Reference implementations
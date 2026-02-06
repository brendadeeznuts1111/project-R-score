---
name: lint
description: Run linting and type checking. Use when checking code quality, running TypeScript type checks, or auto-fixing lint issues.
---

# Lint

Run linting and type checking.

## Usage

```text
/lint              - Run all linters
/lint types        - TypeScript type checking only
/lint --fix        - Auto-fix fixable issues
/lint --strict     - Strict mode (fail on warnings)
```

## Type Checking

```bash
# Full type check
bun run typecheck

# Or directly with tsc
bunx tsc --noEmit
```

## TypeScript Configuration

The project uses strict TypeScript settings:

| Setting | Value | Description |
|---------|-------|-------------|
| `strict` | true | Enable all strict checks |
| `noEmit` | true | Type check only, no output |
| `target` | ESNext | Latest JavaScript features |
| `module` | ESNext | ESM modules |

## Common Type Issues

### Native API Types
```typescript
// Ensure Bun types are available
/// <reference types="bun-types" />

// Use Bun native APIs with proper types
const file = Bun.file('config.toml');  // BunFile
const server = Bun.serve({ ... });     // Server
```

### URLPattern Types
```typescript
// URLPattern is globally available in Bun
const pattern = new URLPattern({ pathname: '/api/:id' });
const result: URLPatternResult | null = pattern.exec(url);
```

## Examples

```bash
# Check all TypeScript files
bunx tsc --noEmit

# Check specific package
bunx tsc --noEmit -p packages/core/tsconfig.json

# Watch mode for development
bunx tsc --noEmit --watch
```

## Integration with Tests

Run type checking before tests:

```bash
# Type check then test
bunx tsc --noEmit && bun test
```

## Related Skills

- `/test` - Run test suites
- `/build` - Build packages

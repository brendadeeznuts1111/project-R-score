# Bun Runtime Detection Guide

## Recommended Method

Use `process.versions.bun` to detect Bun runtime. This works in both JavaScript and TypeScript without requiring additional type definitions.

```typescript
if (process.versions.bun) {
  // This code will only run when executed with Bun
}
```

## Alternative Method

Check for the `Bun` global (similar to checking `window` in browsers):

```typescript
if (typeof Bun !== "undefined") {
  // This code will only run when executed with Bun
}
```

**Note:** This approach requires `@types/bun` for TypeScript. Install with:
```bash
bun add -d @types/bun
```

## Implementation in Dashboard Files

### CLI Tools
- `cli/dashboard/dashboard-cli.ts` - Uses `process.versions.bun` check at startup
- `pages/dev-server.ts` - Uses `process.versions.bun` check at startup

### Backend Services
- `ai/prediction/anomaly-predict.ts` - Uses `process.versions.bun` check before Bun-specific APIs

## Error Messages

When Bun is not detected, files provide helpful error messages:

```text
❌ This CLI requires Bun runtime.
   Install Bun: https://bun.sh
   Then run: bun cli/dashboard/dashboard-cli.ts
```

## Why Detection Matters

1. **Clear Error Messages**: Better than cryptic import errors
2. **Graceful Degradation**: Can provide fallbacks or warnings
3. **Documentation**: Makes runtime requirements explicit
4. **Development Experience**: Helps developers understand requirements

## Bun-Specific APIs Used

Files that require Bun detection use these Bun-specific APIs:

- `Bun.serve()` - HTTP server
- `Bun.file()` - File I/O
- `Bun.env` - Environment variables (preferred over `process.env`)
- `Bun.dns.prefetch()` - DNS prefetching
- `fetch.preconnect()` - Connection pre-warming
- `Bun.spawn()` - Process spawning
- `Bun.$` - Shell commands
- `Bun.sleep()` - Async sleep
- `Bun.write()` - File writing
- `Bun.hash()` - Hashing
- `Bun.randomUUIDv7()` - UUID generation

## Environment Variables

Dashboard files use `Bun.env` (Bun's preferred method) with fallback to `process.env`:

```typescript
const port = Bun.env.PORT || process.env.PORT || "8080";
```

Bun automatically loads `.env` files. See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for details.

## References

- [Bun Documentation: Detect Bun Runtime](https://bun.com/docs/runtime/detect-bun)
- [Bun Documentation: llms.txt](https://bun.com/docs/llms.txt)

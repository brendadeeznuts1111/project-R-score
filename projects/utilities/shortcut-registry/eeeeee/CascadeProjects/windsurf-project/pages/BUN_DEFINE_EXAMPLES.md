# Bun --define Real-World Examples

## KYC Failsafe Command Pattern

The KYC failsafe command demonstrates production use of `--define` flags:

```bash
bun --define process.env.NODE_ENV="'production'" \
    --define process.env.LOG_LEVEL="'INFO'" \
    src/main.ts kyc-failsafe "user123" primary_flow_timeout
```

### What This Does

1. **Sets NODE_ENV to production** - Enables production optimizations
2. **Sets LOG_LEVEL to INFO** - Reduces log verbosity in production
3. **Runs KYC failsafe** - Executes failsafe mode with defined constants

### Benefits

- **Dead Code Elimination** - Development-only code removed
- **Performance** - Production optimizations enabled
- **Logging Control** - Log level set at build/runtime time
- **Type Safety** - Constants known at compile time

## Package.json Script Pattern

You can create npm scripts that use `--define`:

```json
{
  "scripts": {
    "dev:prod": "bun --define process.env.NODE_ENV=\"'production'\" --define process.env.LOG_LEVEL=\"'INFO'\" src/main.ts"
  }
}
```

Then run:
```bash
bun run dev:prod kyc-failsafe user123 primary_flow_timeout
```

## Multiple Define Flags

You can chain multiple `--define` flags:

```bash
bun --define process.env.NODE_ENV="'production'" \
    --define process.env.LOG_LEVEL="'INFO'" \
    --define process.env.API_URL="'https://api.production.com'" \
    --define process.env.DEBUG="'false'" \
    src/main.ts
```

## Environment-Specific Builds

### Development
```bash
bun --define process.env.NODE_ENV="'development'" \
    --define process.env.LOG_LEVEL="'DEBUG'" \
    src/main.ts
```

### Production
```bash
bun --define process.env.NODE_ENV="'production'" \
    --define process.env.LOG_LEVEL="'INFO'" \
    src/main.ts
```

### Staging
```bash
bun --define process.env.NODE_ENV="'staging'" \
    --define process.env.LOG_LEVEL="'WARN'" \
    src/main.ts
```

## Code Example

### Before (Runtime Check)
```typescript
if (process.env.NODE_ENV === "production") {
  console.log("Production mode");
} else {
  console.log("Development mode");
}
```

### After --define
```bash
bun --define process.env.NODE_ENV="'production'" src/main.ts
```

Bun transforms it to:
```typescript
if ("production" === "production") {  // Always true
  console.log("Production mode");
} else {
  // This branch is eliminated
}
```

Final output:
```typescript
console.log("Production mode");
```

## KYC Failsafe Output Analysis

From the example output:

```
[2026-01-23T18:02:32.451Z] 🚀 Starting KYC failsafe for user: user123
{"timestamp":"...","level":"WARN","message":"KYC failsafe triggered",...}
{"timestamp":"...","level":"INFO","message":"Starting device integrity verification",...}
```

**Observations:**
- ✅ Log level set to INFO (WARN and INFO logs shown)
- ✅ Production mode active (optimized output)
- ✅ Structured JSON logging
- ⚠️ Security patch warning (expected in test/dev)
- ⚠️ Play Integrity not found (expected without device)

## Best Practices

1. **Use Single Quotes** - Wrap string values: `"'production'"`
2. **Chain Flags** - Multiple `--define` flags for multiple constants
3. **Document** - Add comments explaining what each define does
4. **Test Both** - Test with development and production defines
5. **CI/CD** - Use defines in build pipelines

## Common Patterns

### Feature Flags
```bash
bun --define process.env.FEATURE_X="'enabled'" \
    --define process.env.FEATURE_Y="'disabled'" \
    src/main.ts
```

### API Endpoints
```bash
bun --define process.env.API_URL="'https://api.example.com'" \
    --define process.env.API_VERSION="'v1'" \
    src/main.ts
```

### Debug Mode
```bash
bun --define process.env.DEBUG="'true'" \
    --define process.env.VERBOSE="'true'" \
    src/main.ts
```

## Integration with Dashboard CLI

The dashboard CLI uses `--define` for builds:

```typescript
const buildArgs = [
  "build",
  heatmapSrc,
  "--outdir",
  outputDir,
  "--target",
  "browser",
  "--define",
  `process.env.NODE_ENV="${env}"`,
];
```

This ensures production builds eliminate development code.

## References

- [BUN_DEFINE.md](./BUN_DEFINE.md) - Complete `--define` guide
- [Bun Documentation](https://bun.com/docs/bundler/define) - Official docs

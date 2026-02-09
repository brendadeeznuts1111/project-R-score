# Feature Demonstrations

This directory contains comprehensive demonstrations of Bun features.

## 🎯 Demo Categories

### Core Bun APIs

| Demo | File | Description |
|------|------|-------------|
| Bun Hash CRC32 | `DEMO-BUN-HASH-CRC32.ts` | CRC32 hashing with Bun.hash |
| Buffer SIMD | `DEMO-BUFFER-SIMD-INDEXOF.ts` | SIMD-optimized buffer operations |
| StringWidth | `DEMO-STRINGWIDTH-TESTS.ts` | Unicode string width calculations |
| WrapANSI | `DEMO-WRAPANSI-FEATURES.ts` | ANSI string wrapping |
| Archive | `DEMO-ARCHIVE-FEATURES.ts` | Archive handling features |
| ArrayBufferSink | `DEMO-ARRAYBUFFERSINK-FEATURES.ts` | Streaming buffer operations |

### Bun v1.3.9 Demos (in `bun/` subdirectory)

See `bun/` for v1.3.9-specific demos:
- Security fixes
- HTTP/2 fetch improvements
- WebSocket fixes
- Stability improvements

### FactoryWager Demos

| Demo | File | Description |
|------|------|-------------|
| Commands | `DEMO-FACTORY-WAGER-COMMANDS.ts` | Command system demo |
| Golden Checklist | `DEMO-GOLDEN-CHECKLIST.ts` | Release checklist |
| Meta JSON | `DEMO-META-JSON-ANALYSIS.ts` | Metafile analysis |
| Release Detector | `DEMO-RELEASE-DETECTOR.ts` | Release detection |
| Secrets Error Codes | `DEMO-SECRETS-ERROR-CODES-FEATURES.ts` | Secrets management |

### Utility Demos

| Demo | File | Description |
|------|------|-------------|
| Peek Simple | `demo-bun-peek-simple.ts` | Simple peek utility |
| Peek Utility | `demo-bun-peek-utility.ts` | Advanced peek utility |
| PM Pack | `demo-bun-pm-pack-v131.ts` | Package manager features |
| Shell Error | `demo-bun-shell-error.ts` | Shell error handling |
| Stability Fixes | `demo-bun-stability-fixes.ts` | Stability improvements |
| WebSocket Fixes | `demo-websocket-fixes.ts` | WebSocket improvements |

## 🚀 Running Demos

```bash
# Run a specific demo
bun run demos/DEMO-BUN-HASH-CRC32.ts

# Run with arguments
bun run demos/DEMO-FACTORY-WAGER-COMMANDS.ts help

# Run in watch mode
bun --watch run demos/demo-bun-peek-simple.ts
```

## 📚 Related

- [bun-v139-features/](../bun-v139-features/) - Bun v1.3.9 feature examples
- [scratch/bun-v1.3.9-examples/](../../scratch/bun-v1.3.9-examples/) - v1.3.9 scratch examples

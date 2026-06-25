# Bun 1.3.6 Windows & Compatibility Reference

> Use this skill when debugging Windows-specific issues, WebSocket crashes, native module HMR failures, or Node.js API discrepancies.

## Quick Reference

- **WebSocket crash on Windows** — Root cause: Zlib DLL version mismatch, struct size corruption. Fix: Aligned headers/runtime, fixed buffer sizes
- **`bunx` panic with spaces/empty args** — Root cause: Argv parsing didn't handle Windows shell edge cases. Fix: Graceful fallback + correct splitting
- **Native module HMR crash** — Root cause: `napi_register_module_v1 already loaded` error. Fix: Safe module sharing across threads
- **`domainToASCII` throws** — Root cause: Bun threw TypeError, Node.js returns `''`. Fix: Now spec-compliant (returns empty string)
- **TLS state incorrect** — Root cause: `_secureEstablished` wrong under concurrent load. Fix: Accurate state tracking

## WebSocket Compression (Windows-Safe)

```javascript
// SAFE: Full compression on all platforms
const ws = new WebSocket("wss://api.example.com", {
  perMessageDeflate: {
    serverMaxWindowBits: 15,
    clientMaxWindowBits: 15,
    serverNoContextTakeover: true,
    clientNoContextTakeover: true
  }
});

// Send any size payload
ws.send(JSON.stringify(largeDataset));  // No crash
```

**Bandwidth savings:** ~70% reduction for JSON payloads (100KB/s → 30KB/s typical).

## CLI Edge Cases (Now Fixed)

```bash
# All work correctly on Windows:
bunx create-react-app "My Project"           # Spaces in path
bunx some-tool --env="production" --debug="" # Empty strings
bunx my-cli "C:\Users\Name\file.txt"         # Windows paths
```

**Recovery behavior:** Corrupted `.bunx` metadata triggers silent rebuild instead of panic.

## Native Module HMR

```javascript
// BEFORE: Crash in dev
const native = require("./crypto.node");
// Hot reload → "napi_register_module_v1 already loaded"

// AFTER: Works in dev
const native = require("./crypto.node");
// Hot reload → Module reloads cleanly
```

**Worker threads:** Native modules now safely share between main thread and workers.

## Node.js API Compliance

```javascript
// domainToASCII - now matches Node.js behavior
import { domainToASCII } from "url";

domainToASCII("invalid..domain");
// BEFORE: TypeError
// AFTER:  "" (empty string, spec-compliant)

// Pattern for validation:
function isValidDomain(domain) {
  return domainToASCII(domain) !== "";
}
```

## TLS Security Middleware

```javascript
// Accurate HTTPS detection under load
app.use((req, res, next) => {
  if (!req.socket._secureEstablished) {
    return res.status(403).send("HTTPS required");
  }
  next();
});
```

## CI Matrix

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ">=1.3.6"
      - run: bun test
```

## Diagnostic Commands

```bash
# Verify version
bun --version  # Must be >= 1.3.6

# Test WebSocket compression
bun run websocket-stress.test.js

# Test native module HMR
bun --hot server-with-native-modules.js

# Upgrade if needed
bun upgrade  # Unix
powershell -c "irm bun.sh/install.ps1 | iex"  # Windows
```

## Remove Legacy Workarounds

```javascript
// DELETE: Platform-specific compression toggle
if (process.platform === "win32") {
  ws.send(data, { compress: false });
}

// REPLACE WITH: Clean cross-platform code
ws.send(data, { compress: true });
```

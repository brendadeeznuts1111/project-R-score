# Bun 1.3 Security Enhancements Integration

**Complete integration of Bun 1.3 security features into NEXUS Platform**

---

## Overview

Bun 1.3 introduces major security enhancements that are now fully integrated into the NEXUS Platform:

- ✅ **Bun.secrets** - OS-native encrypted credential storage
- ✅ **Bun.CSRF** - Cross-site request forgery protection
- ✅ **Crypto Performance** - 400x faster cryptographic operations
- ✅ **Security Scanner** - Package vulnerability scanning

---

## Bun.secrets for Encrypted Credential Storage

### Overview

Bun.secrets provides OS-native credential storage that's encrypted at rest:

- **macOS**: Keychain (`~/Library/Keychains/`)
- **Linux**: libsecret (GNOME Keyring)
- **Windows**: Credential Manager

Secrets are separate from environment variables and encrypted at rest.

### API Usage

```typescript
import { secrets } from "bun";

// Store secret (two parameters: options, value)
await secrets.set(
  {
    service: "nexus-security-scanner",
    name: "threat-intel-api-key",
  },
  "your-api-key"
);

// Retrieve secret
const apiKey = await secrets.get({
  service: "nexus-security-scanner",
  name: "threat-intel-api-key",
});

// Delete secret (returns boolean)
const deleted = await secrets.delete({
  service: "nexus-security-scanner",
  name: "threat-intel-api-key",
});
```

### Integration Points

#### 1. Security Scanner

**File**: `src/security/bun-scanner.ts`

The security scanner automatically loads API keys from Bun.secrets:

```typescript
// Automatically checks Bun.secrets first, then environment variables
const apiKey = await loadThreatIntelApiKey();
```

**Setup Script**: `scripts/setup-security-scanner.ts`

```bash
# Interactive setup
bun run scripts/setup-security-scanner.ts

# Command-line setup
bun run scripts/setup-security-scanner.ts --api-key "your-api-key"
```

#### 2. MCP Secrets Management

**File**: `src/secrets/mcp.ts`

MCP server credentials are stored using Bun.secrets:

```typescript
import { mcpApiKeys, mcpSessions } from "./secrets/mcp";

// Store API key
await mcpApiKeys.set("bun", "your-api-key");

// Store session cookies
await mcpSessions.set("bun", cookies);
```

**Setup Script**: `scripts/setup-mcp-config.ts`

```bash
bun run scripts/setup-mcp-config.ts --set-api-key bun "your-api-key"
```

#### 3. Provider Credentials

**File**: `src/secrets/index.ts`

All provider credentials (CCXT, Polymarket, Kalshi, Deribit) use Bun.secrets:

```typescript
import { ccxt, polymarket, kalshi, deribit } from "./secrets";

// Store exchange credentials
await ccxt.set("binance", "api-key", "api-secret");
```

**Migration**: `src/secrets/migrate.ts`

Automatically migrates plaintext credentials to Bun.secrets on first run.

---

## Bun.CSRF for CSRF Protection

### Overview

Bun.CSRF provides secure CSRF token generation and verification:

- Generate XSRF/CSRF tokens
- Verify tokens with expiration
- Multiple encoding formats (hex, base64)

### Integration

**File**: `src/middleware/csrf.ts`

```typescript
import { CSRF } from "bun";

const secret = "your-secret-key";
const token = CSRF.generate({
  secret,
  encoding: "hex",
  expiresIn: 60 * 1000  // 1 minute
});

const isValid = CSRF.verify(token, { secret });
```

### Usage in Middleware

```typescript
// Generate token for GET requests
if (method === "GET") {
  const token = generateCSRFToken();
  c.header("X-CSRF-Token", token);
}

// Verify token for mutation requests
if (method === "POST" || method === "PUT" || method === "DELETE") {
  const token = c.req.header("X-CSRF-Token");
  if (!verifyCSRFToken(token)) {
    return c.json({ error: "Invalid CSRF token" }, 403);
  }
}
```

### Security Best Practices

1. **Store CSRF secret in Bun.secrets:**
   ```typescript
   const CSRF_SECRET = await secrets.get({
     service: "nexus",
     name: "csrf-secret"
   }) || crypto.randomUUID();
   ```

2. **Use short expiration times** (1-5 minutes for sensitive operations)

3. **Regenerate tokens** on each request for maximum security

---

## Crypto Performance Improvements

### Performance Gains

Bun 1.3 includes major performance improvements:

| Operation | Bun 1.2 | Bun 1.3 | Improvement |
|-----------|---------|---------|-------------|
| DiffieHellman (512-bit) | 41.15s | 103.90ms | **~400x faster** |
| Cipheriv/Decipheriv (AES-256-GCM) | 912.65µs | 2.25µs | **~400x faster** |
| scrypt (N=16384) | 224.92ms | 36.94ms | **~6x faster** |

### New Crypto APIs

#### X25519 Curve Support

```typescript
import { generateKeyPair } from "crypto";

const { publicKey, privateKey } = generateKeyPair("x25519");
```

#### HKDF (Key Derivation)

```typescript
import { hkdf } from "crypto";

const derivedKey = hkdf("sha256", inputKey, salt, info, 32);
```

#### Prime Number Functions

```typescript
import { generatePrime, checkPrime } from "crypto";

const prime = generatePrime(512);
const isPrime = checkPrime(prime);
```

### Integration

**File**: `src/security/bun-scanner.ts`

Uses `Bun.CryptoHasher` for package integrity verification:

```typescript
const hasher = new Bun.CryptoHasher("sha256");
hasher.update(buffer);
const hash = hasher.digest("hex");
```

**File**: `src/utils/bun.ts`

Uses `Bun.CryptoHasher` for hashing utilities:

```typescript
export const crypto = {
  sha256(input: string): string {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(input);
    return hasher.digest("hex");
  },
  // ... other algorithms
};
```

---

## Security Scanner Integration

### Bun.secrets Integration

The security scanner automatically uses Bun.secrets for API key storage:

```typescript
// Priority: Bun.secrets → Environment Variables
async function loadThreatIntelApiKey(): Promise<string> {
  // Try Bun.secrets first (Bun 1.3+)
  try {
    const { secrets } = await import("bun");
    const apiKey = await secrets.get({
      service: "nexus-security-scanner",
      name: "threat-intel-api-key",
    });
    if (apiKey) return apiKey;
  } catch {
    // Fall back to environment variable
  }
  return process.env.NEXUS_THREAT_INTEL_API_KEY || "";
}
```

### Setup

```bash
# Store API key securely
bun run scripts/setup-security-scanner.ts --api-key "your-api-key"

# Verify storage
bun run scripts/setup-security-scanner.ts --get
```

---

## Node.js Compatibility

### VM Module Support

Bun 1.3 adds support for `node:vm`:

```typescript
import vm from "node:vm";

const script = new vm.Script('console.log("Hello from VM")');
script.runInThisContext();
```

**Features:**
- `vm.SourceTextModule` - Evaluate ECMAScript modules
- `vm.SyntheticModule` - Create synthetic modules
- `vm.compileFunction` - Compile JavaScript into functions
- Bytecode caching with `cachedData`

### node:test Support

Bun now supports `node:test` module:

```typescript
import { test, describe } from "node:test";
import assert from "node:assert";

describe("Math", () => {
  test("addition", () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### Worker Enhancements

Environment data sharing between workers:

```typescript
import { Worker, setEnvironmentData, getEnvironmentData } from "node:worker_threads";

// Set data in parent thread
setEnvironmentData("config", { timeout: 1000 });

// Access in worker
const config = getEnvironmentData("config");
```

---

## System CA Certificates

Bun 1.3 supports using system CA certificates:

```bash
# Use system CA certificates for TLS verification
bun --use-system-ca run src/index.ts
```

**Configuration**: `bunfig.toml`

```toml
[security]
use_system_ca = true
```

---

## Migration Guide

### From Environment Variables to Bun.secrets

**Before:**
```bash
export NEXUS_THREAT_INTEL_API_KEY="your-api-key"
```

**After:**
```bash
bun run scripts/setup-security-scanner.ts --api-key "your-api-key"
```

**Benefits:**
- ✅ Encrypted at rest
- ✅ OS-native security
- ✅ No risk of accidental exposure
- ✅ Separate from environment variables

### From Custom CSRF to Bun.CSRF

**Before:**
```typescript
function generateToken() {
  return crypto.randomUUID();
}
```

**After:**
```typescript
import { CSRF } from "bun";
const token = CSRF.generate({ secret, encoding: "hex", expiresIn: 60000 });
```

---

## Related Documentation

- [Bun.secrets API](https://bun.com/docs/runtime/bun-apis)
- [Bun.CSRF API](https://bun.com/docs/runtime/bun-apis)
- [Bun Security Scanner](./BUN-SECURITY-SCANNER.md)
- [Enterprise Scanner Config](./ENTERPRISE-SCANNER-CONFIG.md)
- [MCP Secrets Integration](./MCP-SECRETS-INTEGRATION.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)

---

## Status

✅ **Complete** - All Bun 1.3 security enhancements integrated.

**Last Updated:** 2025-01-27  
**Bun Version**: 1.3+ required  
**Status**: ✅ Complete

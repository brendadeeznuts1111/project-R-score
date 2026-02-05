# Bun 1.3 Migration Guide

**Version**: 1.3.0  
**Target Audience**: Developers migrating from Bun 1.2 to Bun 1.3  
**Last Updated**: 2025-12-07

---

## Overview

This guide helps you migrate your Hyper-Bun codebase to take advantage of Bun 1.3 features while maintaining backward compatibility.

---

## Prerequisites

**Check Bun Version**:
```bash
bun --version
# Should be 1.3.0 or later
```

**Update Bun**:
```bash
bun upgrade
```

---

## Migration Steps

### 1. Cookie Management

**Before** (Manual cookie handling):
```typescript
// Manual Set-Cookie header construction
const cookieValue = `sessionId=${sessionId}; HttpOnly; Secure; SameSite=Strict`;
response.headers.set('Set-Cookie', cookieValue);
```

**After** (Bun 1.3 native):
```typescript
// Automatic cookie management
request.cookies.set("sessionId", sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
});
```

**Status**: ✅ Already migrated in Hyper-Bun

---

### 2. CSRF Protection

**Before** (Custom implementation):
```typescript
import { CSRFService } from './services/csrf-service';
const token = CSRFService.generateToken(cookies, request.url);
```

**After** (Bun.CSRF):
```typescript
import { CSRF } from "bun";
const secret = await Bun.secrets.get({ service: "hyper-bun", name: "csrf-secret" });
const token = CSRF.generate({ secret, encoding: "hex", expiresIn: 3600000 });
```

**Status**: ✅ Auto-migrated with fallback

---

### 3. Secrets Management

**Before** (Bun.env):
```typescript
const secret = Bun.env.SESSION_SECRET;
```

**After** (Bun.secrets):
```typescript
const secret = await Bun.secrets.get({
  service: "hyper-bun",
  name: "session-secret"
});
```

**Migration Steps**:
1. Store secrets in OS credential manager:
   ```bash
   bun run -e 'await Bun.secrets.set({ service: "hyper-bun", name: "session-secret", value: "your-secret" })'
   ```
2. Update code to use `Bun.secrets.get()`
3. Keep `Bun.env` as fallback for compatibility

**Status**: ✅ Auto-migrated with fallback

---

### 4. YAML Configuration

**Before** (JSON only):
```typescript
import config from './config.json';
```

**After** (YAML support):
```typescript
import config from './config.yaml';
// Or
import { loadYAMLConfig } from './utils/yaml-config';
const config = await loadYAMLConfig('./config.yaml');
```

**Migration Steps**:
1. Convert JSON configs to YAML (optional)
2. Use `loadYAMLConfig()` utility
3. Keep JSON support for backward compatibility

**Status**: ✅ Utilities created, optional migration

---

### 5. ReadableStream Convenience Methods

**Before** (Manual stream consumption):
```typescript
const reader = stream.getReader();
const chunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}
const text = new TextDecoder().decode(Buffer.concat(chunks));
```

**After** (Bun 1.3 convenience):
```typescript
const text = await stream.text();
const json = await stream.json();
const bytes = await stream.bytes();
const blob = await stream.blob();
```

**Status**: ✅ Utilities created

---

### 6. Zstandard Compression

**Before** (gzip only):
```typescript
import { gzipSync, gunzipSync } from 'zlib';
const compressed = gzipSync(data);
```

**After** (Zstandard):
```typescript
import { compressZstd, decompressZstd } from './utils/zstd-compression';
const compressed = await compressZstd(data);
```

**Migration Steps**:
1. Update compression utilities to use Zstandard
2. Update HTTP responses to use `Content-Encoding: zstd`
3. Bun automatically decompresses responses

**Status**: ✅ Utilities created

---

### 7. WebSocket Compression

**Before** (No compression):
```typescript
const ws = new WebSocket("wss://example.com");
```

**After** (With compression):
```typescript
const ws = new WebSocket("wss://example.com", {
  perMessageDeflate: true,
  headers: {
    "User-Agent": "Hyper-Bun/1.0",
  },
});
```

**Status**: ✅ Enhanced handlers created

---

## Testing Migration

### Run Tests

```bash
# Test Bun 1.3 features
bun test:bun-1.3

# Test all features
bun test

# Run examples
bun example:bun-1.3
```

### Verify Features

```bash
# Check Bun version
bun --version

# Test YAML support
bun -e 'console.log(Bun.YAML.parse("key: value"))'

# Test CSRF
bun -e 'console.log(typeof Bun.CSRF)'

# Test secrets
bun -e 'console.log(typeof Bun.secrets)'
```

---

## Backward Compatibility

All Bun 1.3 features in Hyper-Bun include fallbacks:

- **CSRF**: Falls back to custom implementation if `Bun.CSRF` not available
- **Secrets**: Falls back to `Bun.env` if `Bun.secrets` not available
- **YAML**: Throws error if Bun < 1.3 (optional feature)
- **Zstandard**: Throws error if Bun < 1.3 (optional feature)
- **Cookies**: Works on all Bun versions (native feature)

---

## Performance Improvements

After migration, expect:

- **DiffieHellman**: ~400x faster
- **AES-256-GCM**: ~400x faster
- **scrypt**: ~6x faster
- **Cookie parsing**: Zero overhead when not used
- **Zstandard**: Better compression ratios than gzip

---

## Troubleshooting

### Issue: "YAML support requires Bun 1.3+"

**Solution**: Update Bun or use JSON configs instead

### Issue: "Bun.CSRF is not defined"

**Solution**: Code automatically falls back to custom implementation

### Issue: "Bun.secrets.get is not a function"

**Solution**: Code automatically falls back to `Bun.env`

### Issue: WebSocket compression not working

**Solution**: Ensure server supports permessage-deflate

---

## Checklist

- [ ] Update Bun to 1.3+
- [ ] Run `bun test:bun-1.3` to verify features
- [ ] Migrate secrets to `Bun.secrets` (optional)
- [ ] Update WebSocket clients to use compression (optional)
- [ ] Convert configs to YAML (optional)
- [ ] Update compression to Zstandard (optional)
- [ ] Test all functionality

---

## Related Documentation

- [BUN-1.3-FEATURES.md](./BUN-1.3-FEATURES.md) - Complete feature list
- [BUN-1.3-INTEGRATION-SUMMARY.md](./BUN-1.3-INTEGRATION-SUMMARY.md) - Integration status
- [10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md) - Cookie & session docs

---

**Status**: ✅ Migration Guide Complete  
**Next Steps**: Follow checklist above

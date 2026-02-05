# 🔐 Bun State Vault - Encrypted Cookie Storage Guide

Secure, encrypted state management using Bun's native Cookie API with AES-256-GCM encryption.

## Overview

The State Vault provides a simple, secure way to store and retrieve encrypted state in HTTP cookies using Bun's built-in cryptography. It integrates seamlessly with the Bun YAML configuration system.

**Features:**
- ✅ AES-256-GCM encryption (256-bit keys)
- ✅ Automatic JSON serialization/deserialization
- ✅ HttpOnly, Secure, SameSite flags
- ✅ Configurable TTL (maxAge)
- ✅ No external dependencies
- ✅ Integrated with bun.yaml configuration
- ✅ Environment variable interpolation
- ✅ Production-ready security

## Architecture

```
bun.yaml (Configuration)
    ↓
src/config.js (Bun.yaml() loader)
    ↓
src/state-vault.js (Encrypted state management)
    ↓
Application (Secure session/state storage)
```

## Setup

### 1. Generate Encryption Secret

Generate a cryptographically secure 256-bit (32-byte) key:

```bash
# Generate hex-encoded 256-bit key
openssl rand -hex 32

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. Set Environment Variable

```bash
# Development
export QUANTUM_SECRET=$(openssl rand -hex 32)

# Production (use secure secret management)
export QUANTUM_SECRET="your-generated-256-bit-key"
```

Or in `.env` file:
```
QUANTUM_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 3. Configuration (bun.yaml)

The configuration is already set up in `bun.yaml`:

```yaml
api:
  cookie:
    name: __quantum
    httpOnly: true
    secure: true
    sameSite: strict
    maxAge: 86400        # 24 hours

security:
  encryption: aes-256-gcm
  session_timeout: 3600
  rate_limit: 1000
```

**Configuration Details:**
- `name`: Cookie identifier
- `httpOnly`: Prevents JavaScript access (security)
- `secure`: HTTPS-only transmission
- `sameSite`: CSRF protection (strict mode)
- `maxAge`: Session duration in seconds (24 hours)
- `encryption`: AES-256-GCM algorithm
- `session_timeout`: Server-side session timeout

## Integration with Configuration System

The State Vault automatically uses configuration from `bun.yaml` via `src/config.js`:

```javascript
// src/state-vault.js
import { COOKIE_OPTS, SECURITY_CONFIG } from './config.js';

// COOKIE_OPTS comes from cfg.api.cookie (bun.yaml)
// SECURITY_CONFIG comes from cfg.security (bun.yaml)

const vault = new Bun.Cookie(COOKIE_OPTS, {
  secret: Bun.env.QUANTUM_SECRET,
  encryption: SECURITY_CONFIG.encryption, // aes-256-gcm
});
```

This ensures:
- ✅ Consistent cookie settings across the application
- ✅ Centralized configuration management
- ✅ Environment variable interpolation support
- ✅ Easy configuration updates without code changes

## Usage

### Save State

```javascript
import { saveState } from './src/state-vault.js';

// In your request handler
const cookieHeader = await saveState(request, 'user_id', '12345');

// Return with Set-Cookie header
return new Response('OK', {
  headers: { 'Set-Cookie': cookieHeader }
});
```

**What happens:**
1. State value is JSON serialized
2. Encrypted with AES-256-GCM using QUANTUM_SECRET
3. Stored in HTTP cookie with security flags
4. Returned as Set-Cookie header

### Load State

```javascript
import { loadState } from './src/state-vault.js';

// In your request handler
const userId = await loadState(request, 'user_id');
console.log(userId); // '12345'
```

**What happens:**
1. Cookie is extracted from request headers
2. Decrypted using QUANTUM_SECRET
3. JSON parsed and returned
4. Returns null if key not found or decryption fails

### Delete State

```javascript
import { deleteState } from './src/state-vault.js';

const cookieHeader = await deleteState(request, 'user_id');

return new Response('OK', {
  headers: { 'Set-Cookie': cookieHeader }
});
```

### Get All State

```javascript
import { getAllState } from './src/state-vault.js';

const allState = await getAllState(request);
// { user_id: '12345', session: {...}, preferences: {...} }
```

### Clear All State

```javascript
import { clearState } from './src/state-vault.js';

const cookieHeader = await clearState(request);

return new Response('OK', {
  headers: { 'Set-Cookie': cookieHeader }
});
```

## Complete Example

### Full Server Implementation

```javascript
import { Bun } from 'bun';
import { saveState, loadState, deleteState } from './src/state-vault.js';
import { SERVER_CONFIG } from './src/config.js';

const server = Bun.serve({
  hostname: SERVER_CONFIG.host,
  port: SERVER_CONFIG.port,
  async fetch(request) {
    const url = new URL(request.url);

    // Login endpoint - save encrypted session
    if (url.pathname === '/login' && request.method === 'POST') {
      const body = await request.json();
      const cookieHeader = await saveState(request, 'session', {
        userId: body.userId,
        email: body.email,
        loginTime: new Date().toISOString(),
        role: 'user'
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader
        }
      });
    }

    // Protected endpoint - load encrypted session
    if (url.pathname === '/profile') {
      const session = await loadState(request, 'session');
      if (!session) {
        return new Response('Unauthorized', { status: 401 });
      }

      return new Response(JSON.stringify({
        userId: session.userId,
        email: session.email,
        role: session.role
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Logout endpoint - delete session
    if (url.pathname === '/logout') {
      const cookieHeader = await deleteState(request, 'session');
      return new Response('Logged out', {
        headers: { 'Set-Cookie': cookieHeader }
      });
    }

    return new Response('Not found', { status: 404 });
  }
});

console.log(`Server running at ${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
```

### Run the Example

```bash
# Generate and set encryption secret
export QUANTUM_SECRET=$(openssl rand -hex 32)

# Run the example
bun examples/state-vault-example.js

# Or run the full server
bun src/servers/http-server.js
```

## Security Considerations

### Encryption Key Management

1. **QUANTUM_SECRET**: Must be a cryptographically secure 256-bit (32-byte) key
   ```bash
   # Generate with OpenSSL
   openssl rand -hex 32

   # Or with Bun
   bun -e "console.log(crypto.getRandomValues(new Uint8Array(32)).toString())"
   ```

2. **Key Storage**:
   - ✅ Use environment variables in production
   - ✅ Use secret management systems (AWS Secrets Manager, HashiCorp Vault)
   - ❌ Never hardcode keys in source code
   - ❌ Never commit keys to version control

3. **Key Rotation**:
   - Implement key rotation strategy
   - Support multiple keys during transition period
   - Update QUANTUM_SECRET regularly

### Cookie Security

1. **HTTPS Only**: `secure: true` ensures HTTPS-only transmission
2. **HttpOnly**: Prevents JavaScript access to cookies
3. **SameSite**: `strict` prevents CSRF attacks
4. **maxAge**: Set appropriate session timeout (24 hours default)

### Best Practices

```javascript
// ✅ GOOD: Use environment variable
const secret = Bun.env.QUANTUM_SECRET;

// ❌ BAD: Hardcoded secret
const secret = 'my-secret-key';

// ✅ GOOD: Validate secret on startup
if (!Bun.env.QUANTUM_SECRET) {
  throw new Error('QUANTUM_SECRET environment variable required');
}

// ✅ GOOD: Use HTTPS in production
if (Bun.env.NODE_ENV === 'production' && !isHTTPS) {
  throw new Error('HTTPS required in production');
}
```

## API Reference

### `saveState(request, key, value)`
Saves encrypted state to cookie jar.

**Parameters:**
- `request` (Request): HTTP request object
- `key` (string): State key identifier
- `value` (any): Value to store (will be JSON serialized)

**Returns:** Promise<string> - Serialized cookie string for Set-Cookie header

**Example:**
```javascript
const cookieHeader = await saveState(request, 'user', { id: '123' });
return new Response('OK', { headers: { 'Set-Cookie': cookieHeader } });
```

### `loadState(request, key)`
Loads and decrypts state from cookie jar.

**Parameters:**
- `request` (Request): HTTP request object
- `key` (string): State key identifier

**Returns:** Promise<any> - Decrypted and parsed value, or null if not found

**Example:**
```javascript
const user = await loadState(request, 'user');
if (!user) return new Response('Unauthorized', { status: 401 });
```

### `deleteState(request, key)`
Removes a specific state key from cookie jar.

**Parameters:**
- `request` (Request): HTTP request object
- `key` (string): State key identifier

**Returns:** Promise<string> - Serialized cookie string for Set-Cookie header

### `clearState(request)`
Clears all state from cookie jar.

**Parameters:**
- `request` (Request): HTTP request object

**Returns:** Promise<string> - Serialized cookie string for Set-Cookie header

### `getAllState(request)`
Returns all state as an object.

**Parameters:**
- `request` (Request): HTTP request object

**Returns:** Promise<object> - All state key-value pairs

## Troubleshooting

### "QUANTUM_SECRET environment variable is required"
**Solution:** Set the environment variable before running:
```bash
export QUANTUM_SECRET=$(openssl rand -hex 32)
bun your-app.js
```

### "Decryption failed" or state returns null
**Possible causes:**
- QUANTUM_SECRET changed between requests
- Cookie was tampered with
- Cookie expired (maxAge exceeded)

**Solution:** Clear cookies and re-authenticate

### "Cookie too large"
**Solution:** Store less data in cookies, use server-side sessions instead

## Performance Notes

- Encryption/decryption is fast (native Bun implementation)
- Typical overhead: <1ms per operation
- Suitable for high-traffic applications
- Consider server-side sessions for very large state objects


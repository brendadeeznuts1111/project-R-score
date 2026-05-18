# Password Hashing with Bun

**Real-world Argon2id password hashing utility** based on OWASP and NIST recommendations.

---

## Overview

Bun includes native Argon2id support - the winner of the Password Hashing Competition 2015 and the algorithm recommended by OWASP for password storage.

## Quick Start

```bash
# Hash a password (production settings)
bun run password:hash "my-secure-password"

# Verify a password
bun run password:verify "my-secure-password" "$argon2id$..."

# Benchmark on your hardware
bun run password:benchmark
```

## Configuration Levels

| Level | Memory | Time Cost | Threads | Typical Time | Use Case |
|-------|--------|-----------|---------|--------------|----------|
| **production** | 64 MiB | 3 | 4 | ~70ms | **Recommended for most apps** |
| **highSecurity** | 128 MiB | 4 | 4 | ~190ms | Financial, healthcare, high-value |
| **balanced** | 32 MiB | 2 | 2 | ~20ms | Moderate security needs |
| **development** | 16 MiB | 1 | 1 | ~4ms | Testing only (NOT production) |

**Times measured on M1 Max. Your hardware will vary.**

## Benchmark Results (This System)

```text
production      64MiB, t=3, p=4  →  68.3ms
highSecurity    128MiB, t=4, p=4  →  192.1ms
balanced        32MiB, t=2, p=2  →  20.5ms
development     16MiB, t=1, p=1  →  4.3ms
```

## Why These Settings?

### Production (64 MiB, t=3, p=4)
- **OWASP recommended** minimum for Argon2id
- Balances security vs. UX (< 100ms on modern hardware)
- Resists GPU/ASIC attacks effectively
- Good default for most applications

### High Security (128 MiB, t=4, p=4)
- For high-value accounts or sensitive data
- Stronger resistance against dedicated attackers
- ~200ms is acceptable for critical operations
- Use for: admin accounts, financial transactions

### Target Hash Time

| Use Case | Target Time | Config |
|----------|-------------|--------|
| User login | 50-200ms | production |
| Admin login | 100-500ms | highSecurity |
| API keys | 10-100ms | balanced |
| Tests | < 10ms | development |

## Usage Examples

### Basic Hashing

```typescript
import { hashPassword, verifyPassword } from "./tools/password-hash";

// Hash a password
const hash = await hashPassword("user-password");
// Store hash in database

// Verify later
const isValid = await verifyPassword("user-password", hash);
```

### With Different Security Levels

```typescript
// Standard user account
const userHash = await hashPassword("password123", "production");

// Admin account (higher security)
const adminHash = await hashPassword("admin-pw", "highSecurity");

// Development/testing
const testHash = await hashPassword("test", "development");
```

### Check for Rehashing

```typescript
import { needsRehash } from "./tools/password-hash";

// After user login
if (await verifyPassword(password, storedHash)) {
  // Check if hash needs upgrade
  if (needsRehash(storedHash, "production")) {
    // Rehash with current settings
    const newHash = await hashPassword(password, "production");
    // Update database
  }
}
```

## Security Best Practices

### ✅ DO

- Use `production` or `highSecurity` in production
- Store only the hash, never the password
- Use HTTPS for password transmission
- Implement rate limiting on login attempts
- Consider adding a pepper (app-level secret)
- Rehash passwords when upgrading security settings

### ❌ DON'T

- Use `development` config in production
- Implement custom password hashing
- Store passwords in plain text
- Log password hashes
- Use MD5, SHA1, or bcrypt (Argon2id is better)
- Skip the built-in salt (Bun handles this)

## CLI Reference

```bash
# Hash with specific level
bun tools/password-hash.ts hash "password" production
bun tools/password-hash.ts hash "password" highSecurity

# Verify password
bun tools/password-hash.ts verify "password" "$argon2id$..."

# Run benchmark
bun tools/password-hash.ts benchmark

# Check if hash needs upgrade
bun tools/password-hash.ts check-rehash "$argon2id$..." production
```

## Integration with Bun.secrets

For storing sensitive keys:

```typescript
// Store API key with password protection
const apiKey = process.env.API_KEY;
const hash = await hashPassword(apiKey, "highSecurity");

// Store in OS keychain
await Bun.secrets.set({
  service: "com.myapp.api",
  name: "api-key-hash",
  value: hash
});

// Verify later
const storedHash = await Bun.secrets.get({
  service: "com.myapp.api", 
  name: "api-key-hash"
});
const isValid = await verifyPassword(userInput, storedHash);
```

## Performance Considerations

### Memory Cost
- Higher = more resistant to GPU attacks
- Requires more RAM per hash operation
- 64 MiB = good balance for most servers

### Time Cost
- Number of iterations
- Higher = slower but more secure
- 3-4 iterations recommended

### Parallelism
- Threads used for hashing
- Should match available CPU cores
- 4 threads = good for modern CPUs

## Compliance

| Standard | Requirement | Meets? |
|----------|-------------|--------|
| **OWASP** | Argon2id preferred | ✅ Yes |
| **NIST SP 800-63B** | Memory-hard function | ✅ Yes |
| **PCI DSS** | Strong hash algorithm | ✅ Yes |
| **GDPR** | Secure password storage | ✅ Yes |

## Migration from Other Algorithms

### From bcrypt

```typescript
// During login
if (oldHash.startsWith('$2a$') || oldHash.startsWith('$2b$')) {
  // Verify with bcrypt library
  const isValid = await bcrypt.compare(password, oldHash);
  
  if (isValid) {
    // Migrate to Argon2id
    const newHash = await hashPassword(password, "production");
    // Update database with newHash
  }
}
```

### From PBKDF2 or SHA-256

Similar pattern - verify with old algorithm, then rehash with Argon2id on successful login.

## Troubleshooting

**Hash takes too long (>500ms)**
- Reduce memory cost to 32 MiB
- Or use `balanced` configuration
- Check server load/CPU availability

**Hash too fast (<50ms)**
- Increase to `highSecurity` for critical accounts
- Current settings might be too weak

**Out of memory errors**
- Reduce memory cost
- Check available RAM on server
- Consider horizontal scaling for high traffic

## Scripts

| Command | Description |
|---------|-------------|
| `bun run password:hash` | Hash a password |
| `bun run password:verify` | Verify a password |
| `bun run password:benchmark` | Benchmark configurations |

---

**Documentation:** https://bun.sh/docs/api/hashing  
**Tool:** `tools/password-hash.ts`

*Last updated: January 31, 2026*  
*Benchmarked on: macOS 14.7 ARM64 (M1 Max)*

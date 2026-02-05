# Feature Request: Bun.secrets Enumeration API

## Summary
Add `Bun.secrets.list()` and related methods to enable enumeration of stored secrets, critical for building secret management tools, migration utilities, and audit systems.

## Current Limitation

The `Bun.secrets` API (introduced in Bun v1.3.7) provides:
- `Bun.secrets.get({ service, name })` - Retrieve a secret
- `Bun.secrets.set({ service, name }, value)` - Store a secret
- `Bun.secrets.delete({ service, name })` - Remove a secret

**Missing:** Any method to discover what secrets exist.

## Problem Statement

Without enumeration capabilities, developers cannot:

1. **Build secret management CLIs** - Users can't see what they've stored
2. **Migrate between services** - No way to list secrets to transfer them
3. **Audit secret usage** - Can't generate reports of stored credentials
4. **Rotate credentials systematically** - Must guess names to find expired secrets
5. **Implement backup utilities** - Can't enumerate what needs backing up

## Real-World Impact

We built an RSS feed optimization system using Bun and attempted to integrate `Bun.secrets` for secure credential storage. We encountered:

```javascript
// Current workaround: Guessing common names
const commonSecrets = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DATABASE_URL',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'ADMIN_TOKEN',
  'GITHUB_TOKEN'
];

async function findExistingSecrets(service) {
  const found = [];
  for (const name of commonSecrets) {
    const value = await Bun.secrets.get({ service, name });
    if (value !== undefined) found.push(name);
  }
  return found; // Incomplete - misses custom names
}
```

This approach:
- **Misses user-defined secret names** (e.g., `MY_CUSTOM_API_KEY`)
- **Requires maintenance** of common name list
- **Leaks metadata** about what services are used (via guess attempts)
- **Forces index files** - Users store secret names in separate unencrypted files

## Proposed API

### 1. List Secrets in a Service

```typescript
interface SecretsListOptions {
  service: string;
}

// Returns array of secret names
await Bun.secrets.list({ service: "my-app" });
// => ["DATABASE_URL", "AWS_ACCESS_KEY", "STRIPE_KEY"]
```

### 2. List All Services

```typescript
// Returns array of service identifiers
await Bun.secrets.services();
// => ["my-app", "rss-feed-optimizer", "legacy-project"]
```

### 3. Iterate Entries (Optional)

```typescript
// Async iterator for [name, value] pairs
for await (const [name, value] of Bun.secrets.entries({ service: "my-app" })) {
  console.log(`${name}: ${mask(value)}`);
}
```

## Implementation Path

### macOS (Keychain Services)

```c
// Use SecItemCopyMatching with kSecMatchLimitAll
CFDictionaryRef query = CFDictionaryCreate(
  NULL,
  (const void *[]){kSecClass, kSecAttrService, kSecMatchLimit, kSecReturnAttributes},
  (const void *[]){kSecClassGenericPassword, CFSTR("my-service"), kSecMatchLimitAll, kCFBooleanTrue},
  4, NULL, NULL
);

CFArrayRef results;
OSStatus status = SecItemCopyMatching(query, (CFTypeRef*)&results);
// Iterate results to extract kSecAttrAccount (name)
```

### Linux (libsecret/Secret Service API)

```c
// Use secret_service_search with NULL label match
GHashTable *attributes = g_hash_table_new_full(
  g_str_hash, g_str_equal, NULL, NULL
);
// Empty attributes = match all in service

GList *items = secret_service_search_sync(
  service, SECRET_SCHEMA_COMPAT_NETWORK,
  attributes, SECRET_SEARCH_ALL | SECRET_SEARCH_UNLOCK,
  NULL, &error
);
// Iterate items to get labels (names)
```

### Windows (Credential Manager)

```c
// Use CredEnumerate with filter
DWORD count;
PCREDENTIAL *creds;
BOOL success = CredEnumerate(
  L"my-service*",  // Filter prefix
  0, &count, &creds
);
// Iterate creds to get TargetName (service:name)
```

## Security Considerations

### Permission Model
Enumeration should require **the same OS-level authentication** as get/set operations:

- **macOS**: User must have unlocked keychain access (same as `security dump-keychain`)
- **Linux**: User must have unlocked secret service (same as `secret-tool`)
- **Windows**: User must have credential manager access (same as `cmdkey /list`)

This matches native tool behavior—if a user can access their own credentials via OS tools, they should be able to enumerate them via Bun.

### No Security Degradation
- Listing reveals **names only**, not values (requires separate `get()` call)
- Names are already visible to user via native OS tools
- No elevation of privilege—same user, same credentials

## Use Cases

### 1. Secret Migration Tool

```typescript
// Migrate all secrets from old service to new
async function migrateSecrets(oldService: string, newService: string) {
  const names = await Bun.secrets.list({ service: oldService });
  
  for (const name of names) {
    const value = await Bun.secrets.get({ service: oldService, name });
    if (value) {
      await Bun.secrets.set({ service: newService, name }, value);
      console.log(`Migrated: ${name}`);
    }
  }
}

await migrateSecrets("my-app-v1", "my-app-v2");
```

### 2. Secret Audit Report

```typescript
// Generate compliance report
async function auditSecrets() {
  const services = await Bun.secrets.services();
  const report = [];
  
  for (const service of services) {
    const names = await Bun.secrets.list({ service });
    report.push({
      service,
      secretCount: names.length,
      names: names.map(n => maskMiddle(n)), // Privacy
      lastRotated: await getLastRotation(service, names)
    });
  }
  
  return report;
}
```

### 3. Interactive Secret Manager

```typescript
// CLI tool to manage secrets
import { select } from "@inquirer/prompts";

async function secretManager() {
  const services = await Bun.secrets.services();
  const service = await select({
    message: "Choose service:",
    choices: services.map(s => ({ name: s, value: s }))
  });
  
  const names = await Bun.secrets.list({ service });
  const name = await select({
    message: "Choose secret:",
    choices: names.map(n => ({ name: n, value: n }))
  });
  
  const action = await select({
    message: "Action:",
    choices: [
      { name: "View", value: "view" },
      { name: "Edit", value: "edit" },
      { name: "Delete", value: "delete" }
    ]
  });
  
  // Execute action...
}
```

### 4. Automated Rotation

```typescript
// Rotate expired credentials
async function rotateExpiredSecrets(service: string) {
  for await (const [name, value] of Bun.secrets.entries({ service })) {
    if (isCredentialExpired(value)) {
      const newValue = await generateNewCredential(name);
      await Bun.secrets.set({ service, name }, newValue);
      console.log(`Rotated: ${name}`);
    }
  }
}
```

## Alternative Considered

### Sidecar Index Files

Store secret names in a separate (encrypted) index:

```typescript
// Index file approach (current workaround)
const index = await Bun.file(".secrets-index").json();
// { "my-app": ["DATABASE_URL", "API_KEY"] }
```

**Problems:**
- Index can get out of sync with actual secrets
- Requires separate encryption for index
- Doesn't work across machines (index not synced with keychain)
- Violates single-source-of-truth principle

## Conclusion

The `Bun.secrets` API is excellent for basic get/set operations, but the inability to enumerate secrets severely limits its utility for real-world secret management. Adding `list()` and `services()` methods would:

1. Enable migration, audit, and management tools
2. Match capabilities of native OS tools
3. Maintain security boundaries (same auth as get/set)
4. Follow principle of least surprise (users expect this)

This is a **non-breaking addition** that significantly expands the API's usefulness.

---

**Submitted by:** RSS Feed Optimization Project Team  
**Related Work:** Production-grade runtime and process control APIs  
**Bun Version:** 1.3.7+

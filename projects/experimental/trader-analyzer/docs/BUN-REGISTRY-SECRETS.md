# Bun Registry Secrets Management

**Secure package registry credential management using Bun.secrets**

## Overview

Instead of storing registry tokens/passwords in `.env.local` files, you can now use `Bun.secrets` to securely store credentials for scoped package registries (`@orca`, `@nexus`, etc.). Credentials are encrypted at rest by the OS credential manager:

- **macOS**: Keychain Services
- **Linux**: libsecret (GNOME Keyring, KWallet)
- **Windows**: Windows Credential Manager

## Quick Start

### 1. Store Registry Credentials

```bash
# Store token for @orca scope
bun run scripts/registry-secrets.ts set @orca --token ghp_xxxxxxxxxxxx

# Store username/password for @nexus scope
bun run scripts/registry-secrets.ts set @nexus --username nexus --password your-password
```

### 2. Install Packages with Secrets

```bash
# Use the wrapper script to load secrets before bun install
bun run scripts/bun-install-with-secrets.ts

# Or with additional arguments
bun run scripts/bun-install-with-secrets.ts --frozen-lockfile
```

### 3. View Credentials

```bash
# List all configured scopes
bun run scripts/registry-secrets.ts list

# Get credentials for a specific scope
bun run scripts/registry-secrets.ts get @orca
```

## CLI Commands

### `set` - Store Credentials

```bash
# Token auth (recommended)
bun run scripts/registry-secrets.ts set @orca --token <token>

# Username/password auth
bun run scripts/registry-secrets.ts set @orca --username <user> --password <pass>

# Combined (token + username/password)
bun run scripts/registry-secrets.ts set @orca --token <token> --username <user> --password <pass>
```

### `get` - Retrieve Credentials

```bash
bun run scripts/registry-secrets.ts get @orca
```

Output:
```text
📦 Credentials for @orca:
   Token: ghp_xxxx...
   Username: orca
   Password: ********
```

### `delete` - Remove Credentials

```bash
bun run scripts/registry-secrets.ts delete @orca
```

### `list` - List All Scopes

```bash
bun run scripts/registry-secrets.ts list
```

Output:
```text
📦 Registry Credentials:

  @orca:
    ✅ Token configured
    ✅ Username configured
  @nexus:
    ❌ No credentials
```

## Programmatic API

### Using the Registry Secrets Module

```typescript
import { registry } from "./src/secrets/index";

// Store credentials
await registry.set("@orca", {
  token: "ghp_xxxxxxxxxxxx",
});

// Retrieve credentials
const creds = await registry.get("@orca");
console.log(creds.token); // "ghp_xxxxxxxxxxxx"

// Delete credentials
await registry.del("@orca");

// Load all credentials as environment variables
const envVars = await registry.loadEnvVars();
// Returns: { ORCA_TOKEN: "...", NEXUS_REGISTRY_TOKEN: "..." }
```

## Integration with bunfig.toml

Your `config/bunfig.toml` remains unchanged:

```toml
[install.scopes]
"@orca" = { token = "$ORCA_TOKEN", url = "https://registry.orca.sh/" }
"@nexus" = { token = "$NEXUS_REGISTRY_TOKEN", url = "https://registry.nexus.internal/" }
```

The wrapper script (`bun-install-with-secrets.ts`) automatically loads credentials from `Bun.secrets` and sets them as environment variables before running `bun install`, so `bunfig.toml` continues to work as expected.

## Migration from .env.local

### Before (using .env.local)

```bash
# .env.local
ORCA_TOKEN=ghp_xxxxxxxxxxxx
NEXUS_REGISTRY_TOKEN=nexus_token_here
```

### After (using Bun.secrets)

```bash
# Store credentials securely
bun run scripts/registry-secrets.ts set @orca --token ghp_xxxxxxxxxxxx
bun run scripts/registry-secrets.ts set @nexus --token nexus_token_here

# Use wrapper script for installs
bun run scripts/bun-install-with-secrets.ts
```

## Benefits

1. **Security**: Credentials encrypted at rest by OS credential manager
2. **No Plaintext Files**: No need for `.env.local` files with sensitive tokens
3. **OS Integration**: Works with macOS Keychain, Linux Keyring, Windows Credential Manager
4. **Backward Compatible**: `bunfig.toml` configuration remains unchanged
5. **Type Safety**: Uses the same `setSecret()` wrapper pattern as `devworkspace.ts`

## Storage Format

Credentials are stored in Bun.secrets with the following naming pattern:

- **Service**: `nexus`
- **Token**: `registry.{scope}.token` (e.g., `registry.orca.token`)
- **Username**: `registry.{scope}.username` (e.g., `registry.orca.username`)
- **Password**: `registry.{scope}.password` (e.g., `registry.orca.password`)

## Related Documentation

- [Bun.secrets API](https://bun.com/docs/runtime/secrets)
- [Package Manager Scopes & Registries](https://bun.com/docs/pm/scopes-registries)
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Complete lockfile and lifecycle script guide
- [Workspace Secrets Management](./WORKSPACE-BUN-V1.3.4-INTEGRATION.md)
- [Bun v1.3.4 Release Notes](./BUN-V1.3.4-RELEASE-NOTES.md)

## Troubleshooting

### Credentials Not Loading

If `bun install` fails with authentication errors:

1. Verify credentials are stored:
   ```bash
   bun run scripts/registry-secrets.ts get @orca
   ```

2. Use the wrapper script:
   ```bash
   bun run scripts/bun-install-with-secrets.ts
   ```

3. Check `bunfig.toml` configuration:
   ```bash
   cat config/bunfig.toml | grep -A 5 "install.scopes"
   ```

### TypeScript Type Errors

The `setSecret()` wrapper handles the Bun.secrets type mismatch (same pattern as `devworkspace.ts`). If you see type errors, ensure you're using the wrapper functions, not calling `Bun.secrets.set()` directly.

# Bun.secrets API Reference

**Correct TypeScript interface and usage for Bun.secrets**

## TypeScript Interface

```typescript
namespace Bun {
  interface SecretsOptions {
    service: string;
    name: string;
  }

  interface Secrets {
    get(options: SecretsOptions): Promise<string | null>;
    set(options: SecretsOptions, value: string): Promise<void>;
    delete(options: SecretsOptions): Promise<boolean>;
  }

  const secrets: Secrets;
}
```

## API Methods

### `secrets.get(options)`

Retrieve a secret value.

**Parameters:**
- `options.service` (string): Service name
- `options.name` (string): Secret name

**Returns:** `Promise<string | null>`

**Example:**
```typescript
import { secrets } from "bun";

const apiKey = await secrets.get({
  service: "nexus",
  name: "mcp.bun.apiKey",
});
```

### `secrets.set(options, value)`

Store a secret value securely.

**Parameters:**
- `options.service` (string): Service name
- `options.name` (string): Secret name
- `value` (string): Secret value to store

**Returns:** `Promise<void>`

**Example:**
```typescript
import { secrets } from "bun";

await secrets.set(
  {
    service: "nexus",
    name: "mcp.bun.apiKey",
  },
  "your-api-key-here"
);
```

**Important:** `set()` takes **two parameters**:
1. Options object (`{ service, name }`)
2. Value string

**Incorrect usage:**
```typescript
// ❌ Wrong - single object with value property
await secrets.set({
  service: "nexus",
  name: "mcp.bun.apiKey",
  value: "your-api-key-here"  // This is incorrect!
});
```

**Correct usage:**
```typescript
// ✅ Correct - two parameters
await secrets.set(
  { service: "nexus", name: "mcp.bun.apiKey" },
  "your-api-key-here"
);
```

### `secrets.delete(options)`

Delete a secret value.

**Parameters:**
- `options.service` (string): Service name
- `options.name` (string): Secret name

**Returns:** `Promise<boolean>` - Returns `true` if deleted, `false` if not found

**Example:**
```typescript
import { secrets } from "bun";

const deleted = await secrets.delete({
  service: "nexus",
  name: "mcp.bun.apiKey",
});

if (deleted) {
  console.log("Secret deleted successfully");
}
```

## Storage Backends

Bun.secrets uses OS-native credential storage:

- **macOS**: Keychain (`~/Library/Keychains/`)
- **Linux**: libsecret (GNOME Keyring)
- **Windows**: Credential Manager

Secrets are encrypted at rest and separate from environment variables.

## Usage in NEXUS Platform

### MCP API Keys

```typescript
import { mcpApiKeys } from "./src/secrets/mcp";

// Set Bun MCP API key
await mcpApiKeys.set("bun", "your-api-key-here");

// Get Bun MCP API key
const apiKey = await mcpApiKeys.get("bun");

// Delete Bun MCP API key
await mcpApiKeys.del("bun");
```

### Direct Usage

```typescript
import { secrets } from "bun";

const SERVICE = "nexus";
const SECRET_NAME = "mcp.bun.apiKey";

// Store
await secrets.set(
  { service: SERVICE, name: SECRET_NAME },
  "your-api-key-here"
);

// Retrieve
const apiKey = await secrets.get({
  service: SERVICE,
  name: SECRET_NAME,
});

// Delete
const deleted = await secrets.delete({
  service: SERVICE,
  name: SECRET_NAME,
});
```

## Helper Scripts

### Set Bun MCP API Key

```bash
bun run scripts/mcp-bun-api-key.ts set <your-api-key>
```

### Get Bun MCP API Key Status

```bash
bun run scripts/mcp-bun-api-key.ts get
```

### Demo: Using Bun.secrets.get()

```bash
bun run scripts/demo-bun-secrets-get.ts
```

## References

- [Bun.secrets Documentation](https://bun.com/docs/runtime/secrets#bun-secrets-get-options)
- `src/secrets/mcp.ts` - MCP secrets management
- `src/secrets/index.ts` - Core secrets API
- `scripts/mcp-bun-api-key.ts` - Bun MCP API key CLI
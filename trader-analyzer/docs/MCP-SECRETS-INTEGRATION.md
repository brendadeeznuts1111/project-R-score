# MCP Secrets Integration with Bun.secrets

> Secure API key and session cookie management for MCP servers using Bun.secrets

## Overview

NEXUS integrates Bun.secrets for secure storage of MCP server credentials:
- **API Keys** - Stored securely in OS keychain (macOS Keychain, Linux libsecret, Windows Credential Manager)
- **Session Cookies** - Persistent cookie storage for authenticated MCP sessions

**Bun Documentation**: [Bun.secrets API](https://bun.sh/docs/runtime/bun-apis)

**Configuration**: See `config/bunfig.toml` for MCP configuration documentation and environment variables.

---

## Features

✅ **Secure Storage** - Uses OS-native credential storage  
✅ **API Key Management** - Store, retrieve, validate API keys  
✅ **Session Cookie Storage** - Persistent cookie management  
✅ **Cookie Parsing** - Parse cookies from headers/strings  
✅ **Migration Tools** - Migrate from config files to Bun.secrets  
✅ **CLI Interface** - Command-line tools for secret management  

---

## API Reference

### MCP API Keys

**File**: `src/secrets/mcp.ts`

```typescript
import { mcpApiKeys } from "../secrets/mcp";

// Set API key
await mcpApiKeys.set("bun", "your-api-key-here");

// Get API key
const apiKey = await mcpApiKeys.get("bun");

// Check if API key exists
const exists = await mcpApiKeys.has("bun");

// Delete API key
await mcpApiKeys.del("bun");

// List configured servers
const servers = await mcpApiKeys.list();
```

### MCP Session Cookies

```typescript
import { mcpSessions, cookieUtils } from "../secrets/mcp";

// Store cookies from CookieMap
const cookies = cookieUtils.fromString("sessionId=abc123; Path=/");
await mcpSessions.set("bun", cookies);

// Store cookies from string
await mcpSessions.setString("bun", "sessionId=abc123; Path=/; HttpOnly");

// Get cookies
const cookies = await mcpSessions.get("bun");
if (cookies) {
  const sessionId = cookieUtils.get(cookies, "sessionId");
}

// Get cookies as string
const cookieString = await mcpSessions.getString("bun");

// Update cookies (merge)
await mcpSessions.update("bun", newCookies);

// Delete cookies
await mcpSessions.del("bun");
```

### Utility Functions

```typescript
import { parseApiKey, parseCookies, validateApiKey, getMCPConfig, setMCPConfig } from "../secrets/mcp";

// Parse and validate API key
const apiKey = parseApiKey("your-key-here");
if (apiKey && validateApiKey(apiKey)) {
  // Valid API key
}

// Parse cookies
const cookies = parseCookies("sessionId=abc123; theme=dark");

// Get complete MCP configuration
const config = await getMCPConfig("bun");
// { apiKey: string | null, cookies: CookieMap | null }

// Set complete MCP configuration
await setMCPConfig("bun", {
  apiKey: "your-key",
  cookies: cookieMap, // or cookie string
});
```

---

## CLI Usage

### Setup Script

```bash
# Basic setup (creates config from template)
bun run scripts/setup-mcp-config.ts

# Set API key securely
bun run scripts/setup-mcp-config.ts --set-api-key bun "your-api-key"

# Get stored API key
bun run scripts/setup-mcp-config.ts --get-api-key bun

# Migrate API key from config file to Bun.secrets
bun run scripts/setup-mcp-config.ts --migrate-api-key bun

# List configured servers
bun run scripts/setup-mcp-config.ts --list-servers
```

### Examples

```bash
# Store Bun MCP API key
bun run scripts/setup-mcp-config.ts --set-api-key bun "sk-abc123..."

# Store Nexus MCP API key
bun run scripts/setup-mcp-config.ts --set-api-key nexus "local-key-123"

# Migrate existing API key from .cursor/mcp.json
bun run scripts/setup-mcp-config.ts --migrate-api-key bun

# Check what's configured
bun run scripts/setup-mcp-config.ts --list-servers
```

---

## Integration in MCP Server

The MCP server automatically loads secrets on startup:

**File**: `scripts/mcp-server.ts`

```typescript
import { getMCPConfig } from "../src/secrets/mcp";

// Load MCP configuration from Bun.secrets
const nexusConfig = await getMCPConfig("nexus");
if (nexusConfig.apiKey) {
  // Use API key for authentication
}
if (nexusConfig.cookies) {
  // Use cookies for session management
}
```

---

## Storage Format

### API Keys

Stored as: `nexus.mcp.<serverName>.apiKey`

**Example**:
- Server: `bun` → Key: `nexus.mcp.bun.apiKey`
- Server: `nexus` → Key: `nexus.mcp.nexus.apiKey`

### Session Cookies

Stored as: `nexus.mcp.<serverName>.cookies`

**Format**: JSON string of cookie name-value pairs

**Example**:
```json
{
  "sessionId": "abc123",
  "csrfToken": "xyz789"
}
```

---

## Migration Guide

### From Config File to Bun.secrets

**Before** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "bun": {
      "apiKey": "sk-abc123..."
    }
  }
}
```

**After** (using Bun.secrets):
```bash
# Migrate API key
bun run scripts/setup-mcp-config.ts --migrate-api-key bun

# Remove apiKey from config file (optional, for security)
```

**Config file** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "bun": {
      "apiKey": ""  // Empty - stored in Bun.secrets
    }
  }
}
```

---

## Security Best Practices

1. **Never commit API keys** - Use Bun.secrets instead of config files
2. **Use OS keychain** - Bun.secrets uses native OS credential storage
3. **Validate API keys** - Use `validateApiKey()` before storing
4. **Rotate keys regularly** - Update secrets periodically
5. **Use session cookies** - Store authenticated sessions securely

---

## Cookie Parsing

The integration supports parsing cookies from various formats:

```typescript
import { parseCookies, cookieUtils } from "../secrets/mcp";

// From Set-Cookie header
const cookies = parseCookies("sessionId=abc123; Path=/; HttpOnly; Secure");

// From Cookie header
const cookies = cookieUtils.fromString("sessionId=abc123; theme=dark");

// From Bun.CookieMap
const cookies = cookieUtils.fromHeaders(request.headers);
```

---

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const apiKey = await mcpApiKeys.get("bun");
  if (!apiKey) {
    // API key not configured
  }
} catch (error) {
  // Handle error (e.g., keychain access denied)
  console.error("Failed to access secrets:", error);
}
```

---

## Related Documentation

- [Bun.secrets API](https://bun.sh/docs/runtime/bun-apis)
- [Bun.CookieMap](https://bun.sh/docs/api/cookies)
- [MCP Server Setup](../MCP-SERVER.md)
- [Secrets Migration](../src/secrets/migrate.ts)

---

## Code References

- **MCP Secrets**: `src/secrets/mcp.ts`
- **Setup Script**: `scripts/setup-mcp-config.ts`
- **MCP Server**: `scripts/mcp-server.ts`
- **Cookie Utils**: `src/utils/bun-cookie.ts`
- **Secrets Index**: `src/secrets/index.ts`

---

**Last Updated**: 2025-01-15  
**Bun Version**: 1.3.3+  
**Status**: ✅ Production Ready

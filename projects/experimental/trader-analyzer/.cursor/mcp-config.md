# Cursor MCP Configuration

This directory contains MCP server configurations for Cursor.

## Configuration Files

### `.cursor/mcp.json`
MCP server configuration for Cursor. This file configures external MCP servers that Cursor can connect to.

**Setup**:
1. Copy `.cursor/mcp.json.template` to `.cursor/mcp.json`
2. If you have a Bun MCP API key, add it to the `apiKey` field in the `bun` server configuration (leave as `""` if not required)
3. Restart Cursor to load MCP servers

## Available MCP Servers

### Bun MCP Server (External)
- **Name**: `bun`
- **Transport**: HTTP
- **URL**: `https://mcp.bun.sh`
- **API Key**: Optional (set in `apiKey` field)
- **Tools**: 
  - `SearchBun` - Search Bun's knowledge base

**API Key Setup**:
- If the Bun MCP server requires authentication, obtain an API key from [Bun's MCP service](https://mcp.bun.sh)
- Add the API key to the `apiKey` field in `.cursor/mcp.json` (replace the empty string `""`)
- If no API key is required, leave the field as an empty string `""`
- **Note**: The NEXUS MCP server can also store API keys securely using Bun.secrets (see MCP-SERVER.md for details)

### NEXUS MCP Server (Local)
- **Name**: `nexus`
- **Command**: `bun run scripts/mcp-server.ts`
- **Tools**: See `MCP-SERVER.md` for full list
- **Requirements**: 
  - Bun runtime installed
  - Project dependencies installed (`bun install`)
  - Optional: `./data/research.db` for research tools

**Bun Utilities Used**:
- **Bun.stdin** (7.5.5.0.0.0.0) - Standard input stream for JSON-RPC requests
- **Bun.stdout** (7.5.6.0.0.0.0) - Standard output stream for JSON-RPC responses
- **Bun.stderr** (7.5.7.0.0.0.0) - Standard error stream for diagnostic messages
  - See `src/runtime/bun-native-utils-complete.ts` for complete documentation
  - Cross-reference: Used in `src/mcp/server.ts` for stdio protocol communication

## Setup Instructions

1. **Initial Setup**:
   ```bash
   # Copy template to actual config
   cp .cursor/mcp.json.template .cursor/mcp.json
   
   # Edit mcp.json and add your Bun API key if needed
   # Then restart Cursor
   ```

2. **Verify Configuration**:
   - Ensure `.cursor/mcp.json` exists with proper configuration
   - Check that `scripts/mcp-server.ts` is executable
   - Verify Bun is installed: `bun --version`

3. **Load Servers**:
   - Restart Cursor to load MCP servers
   - MCP tools will be available in Cursor's tool palette

4. **Troubleshooting**:
   - Check Cursor's MCP server logs for connection errors
   - Verify the nexus server starts: `bun run scripts/mcp-server.ts`
   - Ensure all project dependencies are installed: `bun install`

## SearchBun Tool

The SearchBun tool is available both:
- As an external MCP server (via Bun's official MCP server)
- As a local tool in the NEXUS MCP server (wrapper implementation)

Use SearchBun to:
- Search Bun's official documentation
- Find API references and examples
- Understand Bun features and best practices
- Get code examples and guides

## Secure API Key Storage (Optional)

For enhanced security, you can store MCP API keys using Bun.secrets instead of plain text in the JSON file:

```typescript
import { mcpApiKeys } from "./src/secrets/mcp";

// Store API key securely (macOS Keychain, Linux libsecret, Windows Credential Manager)
await mcpApiKeys.set("bun", "your-api-key-here");

// The NEXUS MCP server will automatically load keys from Bun.secrets on startup
```

**Benefits**:
- API keys are encrypted at rest using OS-native credential storage
- Keys are separate from configuration files (not committed to git)
- Automatically loaded by the NEXUS MCP server

**Bun Utilities Used**:
- **Bun.secrets** (7.11.5.0.0.0.0) - OS-native encrypted credential storage
  - See `src/runtime/bun-native-utils-complete.ts` for complete documentation
  - Cross-reference: Used in `src/secrets/mcp.ts` for MCP API key management

**Cross-Reference**: `docs/api/MCP-SERVER.md` and `docs/MCP-SECRETS-INTEGRATION.md` for more details.

---

## Version Information

**Component Version**: `4.7.0.0.0.0.0`  
**Subsystem**: MCP & Alerting (`4.0.0.0.0.0.0`)  
**Related Versions**:
- `4.0.0.0.0.0.0` - MCP & Alerting Subsystem (Root)
- `4.1.0.0.0.0.0` - Frontend Configuration & Policy Management
- `4.2.0.0.0.0.0` - Operational Dashboard Enhancements & Tooling
- `4.3.0.0.0.0.0` - Operational Dashboard Benefits for Snapshot Testing
- `4.4.0.0.0.0.0` - MCP Server Architecture
- `4.5.0.0.0.0.0` - Alerting Infrastructure
- `4.6.0.0.0.0.0` - Integration Points
- `4.7.0.0.0.0.0` - Cursor IDE Integration (this document)

**Bun Runtime Utilities Used**:
- `7.5.5.0.0.0.0` - Bun.stdin (standard input for JSON-RPC)
- `7.5.6.0.0.0.0` - Bun.stdout (standard output for JSON-RPC)
- `7.5.7.0.0.0.0` - Bun.stderr (diagnostic output)
- `7.11.5.0.0.0.0` - Bun.secrets (OS-native credential storage)

**CLI Integration**:
- `11.2.0.0.0.0.0` - MCP Tools Execution CLI
- `11.2.1.0.0.0.0` - Tool Listing
- `11.2.2.0.0.0.0` - Tool Execution
- `11.2.3.0.0.0.0` - Tool Categories

---

## Related Documentation

- `docs/4.0.0.0.0.0.0-MCP-ALERTING.md` - MCP & Alerting Subsystem overview
- `docs/api/MCP-SERVER.md` - MCP Server implementation details
- `docs/MCP-SECRETS-INTEGRATION.md` - Secure API key management
- `commands/mcp.md` - MCP CLI commands (`11.2.0.0.0.0.0`)
- `src/mcp/server.ts` - MCP Server implementation
- `scripts/mcp-server.ts` - MCP Server entry point
- `src/runtime/bun-native-utils-complete.ts` - Bun Runtime Utilities (`7.0.0.0.0.0.0`)

---

## Example Usage

```typescript
// Search for Bun.serve documentation
SearchBun({ query: "Bun.serve HTTP server" })

// Search for testing patterns
SearchBun({ query: "Bun test beforeAll afterAll" })

// Search for ETag handling
SearchBun({ query: "Bun.CryptoHasher ETag" })
```

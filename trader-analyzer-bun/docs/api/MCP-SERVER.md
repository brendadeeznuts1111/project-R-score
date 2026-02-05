# [MCP.SERVER.RG] Model Context Protocol Server

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-SERVER@0.1.0;instance-id=MCP-SERVER-001;version=0.1.0}][PROPERTIES:{mcp={value:"mcp-server";@root:"ROOT-MCP";@chain:["BP-MCP","BP-SERVER"];@version:"0.1.0"}}][CLASS:MCPServer][#REF:v-0.1.0.BP.MCP.SERVER.1.0.A.1.1.MCP.1.1]]`

## 1. Overview

Model Context Protocol (MCP) server implementation following Bun MCP documentation for AI tool integration.

**Code Reference**: `#REF:v-0.1.0.BP.MCP.SERVER.1.0.A.1.1.MCP.1.1`

---

## 2. [MCP.FEATURES.RG] Features

### 2.1. [FEATURES.TOOLS.RG] Tools
- **Bun Tooling Tools**: Diagnostics, health checks, profiling, metrics
- **Research Tools**: Pattern discovery, tension exploration, correlation analysis
- **Extensible**: Easy to add new tools

### 2.2. [FEATURES.RESOURCES.RG] Resources
- **File Resources**: README, package.json, documentation
- **Dynamic Resources**: Can register any file or data source

### 2.3. [FEATURES.PROTOCOL.RG] Protocol
- **JSON-RPC 2.0**: Standard MCP protocol
- **stdio Mode**: Communicates via stdin/stdout
- **Error Handling**: Proper error responses

---

## 3. [MCP.USAGE.RG] Usage

### 3.1. [USAGE.START.RG] Start Server
```bash
# Start MCP server (stdio mode)
bun run scripts/mcp-server.ts

# Or use npm script
bun run mcp-server
```

**Configuration**: See `config/bunfig.toml` for MCP configuration options, environment variables, and Bun.secrets integration.

### 3.2. [USAGE.TOOLS.RG] Available Tools

#### 3.2.1. [TOOLS.BUN_TOOLING.RG] Bun Tooling Tools
- `tooling-diagnostics` - Run comprehensive diagnostics
- `tooling-flush-forensics` - Flush forensic logs and checkpoint WAL
- `tooling-profile-book` - Profile bookmaker operations
- `tooling-check-health` - Check system health
- `tooling-get-metrics` - Get Prometheus metrics

#### 3.2.2. [TOOLS.RESEARCH.RG] Research Tools
- `research-discover-patterns` - Discover patterns via ML clustering
- `research-explore-tension` - Explore tension events
- `research-analyze-correlation` - Calculate correlation coefficients
- `research-backtest-pattern` - Backtest patterns against history

#### 3.2.3. [TOOLS.DOCS_INTEGRATION.RG] Documentation Integration Tools
- `docs-get-headers` - Get documentation headers using grepable [DOMAIN.CATEGORY.KEYWORD.RG] format
- `docs-get-footers` - Get documentation footers and metadata from markdown files
- `docs-bun-reference` - Get Bun documentation references and links for specific APIs
- `docs-tooling-info` - Get tooling information including Bun version, scripts, and CLI commands
- `docs-get-sitemap` - Get component sitemap with CSS classes, components, and layers (1.x.x.x numbering)
- `docs-metadata-mapping` - Get metadata mapping between code tags, API tags, and documentation headers

#### 3.2.4. [TOOLS.SEARCH_BUN.RG] SearchBun Tool
- `SearchBun` - Search across the Bun knowledge base to find relevant information, code examples, API references, and guides. Returns contextual content with titles and direct links to documentation pages.

#### 3.2.5. [TOOLS.SECURITY.RG] Security Dashboard Tools
- `security-threat-summary` - Get real-time security threat summary for the last 24 hours
- `security-incident-response` - Get active incident response status
- `security-compliance-status` - Check compliance audit trail health
- `security-recent-threats` - Get recent security threats with details

#### 3.2.6. [TOOLS.ANOMALY_RESEARCH.RG] Anomaly Research Tools
- `research-discover-url-patterns` - Discover patterns specifically caused by URL parsing anomalies
- `research-correct-historical-data` - Remove URL artifact false positives from historical data
- `research-calculate-false-steam-rate` - Calculate false steam rate caused by URL anomalies per bookmaker
- `research-flag-url-artifacts` - Flag all historical patterns likely caused by URL artifacts

#### 3.2.7. [TOOLS.UI_POLICY_MANAGEMENT.RG] UI Policy Management Tools (4.1.5.0.0.0.0)
- `ui-policy-get-manifest` - Get current UI Policy Manifest configuration and metadata
- `ui-policy-get-metrics` - Get UI Policy Manager metrics and health status (hour/day/all)
- `ui-policy-validate-manifest` - Validate UI Policy Manifest file for correctness
- `ui-policy-reload-manifest` - Hot-reload UI Policy Manifest without restarting server
- `ui-policy-get-feature-flags` - Get current feature flag states with resolution details
- `ui-policy-check-health` - Check UI Policy Manager health status and alert on issues
- **Integration**: Frontend Configuration & Policy Management (4.1.0.0.0.0.0) under MCP & Alerting Subsystem
- **See**: [MCP & Alerting Subsystem](./docs/4.0.0.0.0.0.0-MCP-ALERTING.md) and [Frontend Configuration & Policy Documentation](./docs/8.0.0.0.0.0.0-FRONTEND-CONFIG-POLICY.md)

#### 3.2.8. [TOOLS.SECRETS_MANAGEMENT.RG] Secrets Management Tools
- **MCP Secrets API** - Secure storage and retrieval of MCP API keys and session cookies using Bun.secrets (Bun 1.3+)
  - API endpoint: `GET /api/mcp/secrets` - Get status of all MCP server secrets
  - See [MCP Secrets Integration](./docs/MCP-SECRETS-INTEGRATION.md) for details

**Bun.secrets Integration**:
- Uses OS-native encrypted credential storage:
  - **macOS**: Keychain
  - **Linux**: libsecret
  - **Windows**: Credential Manager
- Secrets are encrypted at rest and separate from environment variables
- Supports API keys and session cookies for MCP servers

**Usage Example**:
```typescript
import { mcpApiKeys, mcpSessions } from "./src/secrets/mcp";

// Store API key securely
await mcpApiKeys.set("bun", "your-api-key-here");

// Store session cookies
await mcpSessions.setString("bun", "sessionId=abc123; Path=/; HttpOnly");

// Retrieve secrets
const apiKey = await mcpApiKeys.get("bun");
const cookies = await mcpSessions.get("bun");
```

---

## 4. [MCP.INTEGRATION.RG] Integration

### 4.1. [INTEGRATION.CLAUDE.RG] Claude Desktop
Add to Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "bun",
      "args": ["run", "scripts/mcp-server.ts"]
    }
  }
}
```

### 4.2. [INTEGRATION.OTHER.RG] Other MCP Clients
The server follows the standard MCP protocol and can be used with any MCP-compatible client.

---

## 5. [MCP.API.RG] API Methods

### 5.1. [API.INITIALIZE.RG] Initialize
```json
{
  "method": "initialize",
  "params": {}
}
```

### 5.2. [API.TOOLS_LIST.RG] List Tools
```json
{
  "method": "tools/list",
  "params": {}
}
```

### 5.3. [API.TOOLS_CALL.RG] Call Tool
```json
{
  "method": "tools/call",
  "params": {
    "name": "tooling-diagnostics",
    "arguments": {}
  }
}
```

### 5.4. [API.RESOURCES_LIST.RG] List Resources
```json
{
  "method": "resources/list",
  "params": {}
}
```

### 5.5. [API.RESOURCES_READ.RG] Read Resource
```json
{
  "method": "resources/read",
  "params": {
    "uri": "file:///README.md"
  }
}
```

---

## 6. Status

**Status**: ✅ MCP server implemented

**Components**:
- ✅ MCP Server (`src/mcp/server.ts`)
- ✅ Bun Tooling Tools (`src/mcp/tools/bun-tooling.ts`)
- ✅ Bun Shell Tools (`src/mcp/tools/bun-shell-tools.ts`)
- ✅ Documentation Integration Tools (`src/mcp/tools/docs-integration.ts`)
- ✅ Security Dashboard Tools (`src/mcp/tools/security-dashboard.ts`)
- ✅ Research Tools (`src/research/mcp/tools/research-explorer.ts`)
- ✅ Secrets Management (`src/secrets/mcp.ts`) - Bun.secrets integration (Bun 1.3+)
- ✅ Server entry point (`scripts/mcp-server.ts`)

**Related Documentation**:
- [MCP Quick Reference](./MCP-QUICK-REFERENCE.md) - Quick start guide and common commands
- [MCP Secrets Integration](../MCP-SECRETS-INTEGRATION.md) - Complete guide to MCP secrets management
- [Bun 1.3 Security Enhancements](../BUN-1.3-SECURITY-ENHANCEMENTS.md) - Overview of Bun.secrets and other security features
- [Headers, ETags, Properties & Types](./HEADERS-ETAGS-PROPERTIES-TYPES.md) - Class, Function & Group-specific elements

**Configuration Files**:
- `.cursor/mcp.json` - Cursor IDE MCP server configuration (see `.cursor/mcp.json.template`)
- `config/bunfig.toml` - Bun configuration with MCP section (see `[mcp]` section)
- `src/secrets/mcp.ts` - Bun.secrets integration for API keys and sessions

**Last Updated**: 2025-01-27  
**Version**: 0.1.0

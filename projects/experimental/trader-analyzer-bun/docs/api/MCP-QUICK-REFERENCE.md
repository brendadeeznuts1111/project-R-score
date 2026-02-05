# [MCP.QUICK.REFERENCE.RG] MCP Quick Reference

**Quick Links**: [Full Documentation](./MCP-SERVER.md) | [Secrets Integration](../MCP-SECRETS-INTEGRATION.md) | [Configuration](../../config/bunfig.toml) | [Main Dashboard](../../dashboard/index.html)

## Start MCP Server

```bash
bun run mcp-server
# Or: bun run scripts/mcp-server.ts
```

## Configuration

### Environment Variables
- `MCP_USER_ID` - User identifier (default: "mcp-client")
- `BUN_SQLITE_LOCATION` - Database location (default: "./data")
- `LOG_LEVEL` - Logging level (default: "info")
- `COMPLIANCE_LOGGING` - Enable audit trail (default: "false")

### Bun.secrets (API Keys)
```typescript
import { mcpApiKeys } from "./src/secrets/mcp";

// Store API key
await mcpApiKeys.set("bun", "your-api-key");

// Get API key
const key = await mcpApiKeys.get("bun");
```

### Cursor IDE Setup
```bash
# Copy template
cp .cursor/mcp.json.template .cursor/mcp.json

# Or use setup script
bun run setup-mcp
```

## Available Tools

- **Bun Tooling**: `tooling-diagnostics`, `tooling-check-health`, `tooling-get-metrics`
- **Research**: `research-discover-patterns`, `research-analyze-correlation`
- **Documentation**: `docs-get-headers`, `docs-get-footers`, `docs-bun-reference`
- **Security**: `security-threat-summary`, `security-incident-response`
- **UI Policy**: `ui-policy-get-manifest`, `ui-policy-get-metrics`

## API Endpoints

- `GET /api/mcp/secrets` - List all MCP secrets status
- `GET /api/mcp/secrets/:server` - Get specific server secrets
- `POST /api/mcp/secrets/:server/api-key` - Store API key
- `POST /api/mcp/secrets/:server/cookies` - Store session cookies

## See Also

- [Full MCP Documentation](./MCP-SERVER.md)
- [Secrets Integration](../MCP-SECRETS-INTEGRATION.md)
- [Bun Configuration](../../config/bunfig.toml)

# API Registry Topics Endpoint

## Endpoint

```
GET /api/registry/topics
```

## Description

Returns GitHub topics, labels, and categorization system for issues and PRs. This registry provides a structured view of all topics used across the Hyper-Bun codebase.

## Response Format

```json
{
  "registry": "topics",
  "components": [
    {
      "name": "api",
      "color": "#00d4ff",
      "department": "API & Routes"
    },
    {
      "name": "arbitrage",
      "color": "#ff1744",
      "department": "Arbitrage & Trading"
    },
    {
      "name": "orca",
      "color": "#9c27b0",
      "department": "ORCA & Sports Betting"
    },
    {
      "name": "dashboard",
      "color": "#667eea",
      "department": "Dashboard & UI"
    },
    {
      "name": "registry",
      "color": "#ff00ff",
      "department": "Registry & MCP Tools"
    },
    {
      "name": "security",
      "color": "#ff6b00",
      "department": "Security"
    },
    {
      "name": "secrets",
      "color": "#d73a4a",
      "department": "Security"
    },
    {
      "name": "cache",
      "color": "#00ff88",
      "department": "Performance & Caching"
    },
    {
      "name": "docs",
      "color": "#00ff88",
      "department": "Documentation & DX"
    }
  ],
  "types": [
    "bug",
    "enhancement",
    "documentation",
    "refactoring",
    "performance",
    "security"
  ],
  "status": [
    "ready-for-review",
    "needs-testing",
    "blocked",
    "triage",
    "discussion"
  ],
  "priority": [
    "priority-high",
    "priority-medium",
    "priority-low"
  ],
  "integrations": [
    "telegram",
    "mcp-tools",
    "exchange-integration",
    "venue-integration",
    "bun-secrets"
  ],
  "total": 27,
  "source": ".github/TOPICS.md"
}
```

## Usage Examples

### cURL

```bash
# Default port (3000)
curl http://localhost:3000/api/registry/topics

# With jq for pretty output
curl -s http://localhost:3000/api/registry/topics | jq .

# Filter components only
curl -s http://localhost:3000/api/registry/topics | jq '.components'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/api/registry/topics');
const data = await response.json();

console.log(`Total topics: ${data.total}`);
console.log(`Components: ${data.components.length}`);
console.log(`Types: ${data.types.length}`);
console.log(`Status labels: ${data.status.length}`);
console.log(`Priority labels: ${data.priority.length}`);
console.log(`Integrations: ${data.integrations.length}`);
```

### Bun

```typescript
const response = await fetch('http://localhost:3000/api/registry/topics');
const topics = await response.json();

// Get all component names
const componentNames = topics.components.map(c => c.name);
// ['api', 'arbitrage', 'orca', 'dashboard', 'registry', 'security', 'cache', 'docs']

// Find component by name
const apiComponent = topics.components.find(c => c.name === 'api');
// { name: 'api', color: '#00d4ff', department: 'API & Routes' }
```

## Response Fields

### `components` (Array)
Component topics with metadata:
- `name` (string): Component identifier
- `color` (string): Hex color code for UI display
- `department` (string): Department/team responsible

### `types` (Array)
Issue/PR type labels:
- `bug`: Bug reports
- `enhancement`: Feature requests
- `documentation`: Documentation updates
- `refactoring`: Code refactoring
- `performance`: Performance improvements
- `security`: Security-related changes

### `status` (Array)
Status labels for workflow:
- `ready-for-review`: Ready for code review
- `needs-testing`: Requires testing
- `blocked`: Blocked by dependencies
- `triage`: Needs triage
- `discussion`: Under discussion

### `priority` (Array)
Priority levels:
- `priority-high`: High priority
- `priority-medium`: Medium priority
- `priority-low`: Low priority

### `integrations` (Array)
Integration-related topics:
- `telegram`: Telegram integration
- `mcp-tools`: MCP tools integration
- `exchange-integration`: Exchange integrations
- `venue-integration`: Venue integrations

### `total` (number)
Total count of all topics across all categories.

### `source` (string)
Source file reference: `.github/TOPICS.md`

## Use Cases

1. **Topic Discovery**: Discover available topics for issues/PRs
2. **Label Management**: Manage GitHub labels programmatically
3. **Category Organization**: Organize issues by component/type
4. **Automated Labeling**: Use topics for automated issue labeling
5. **Documentation**: Generate topic documentation

## Related Endpoints

- `GET /api/registry` - List all available registries
- `GET /api/registry/team-departments` - Team structure registry
- `GET /api/registry/mcp-tools` - MCP tools registry
- `GET /api/registry/bookmaker-profiles` - Bookmaker profiles registry

### Secrets Management Endpoints

- `GET /api/mcp/secrets` - Get MCP secrets status for all servers
- `GET /api/mcp/secrets/{server}` - Get MCP server secret status
- `GET /api/mcp/secrets/{server}/api-key` - Get MCP server API key (masked, requires read auth)
- `POST /api/mcp/secrets/{server}/api-key` - Store MCP server API key (requires write auth)
- `DELETE /api/mcp/secrets/{server}/api-key` - Delete MCP server API key (requires delete auth)
- `GET /api/metrics` - Prometheus metrics including secret access metrics

**Documentation References**:
- @docs/BUN-SECRETS-API.md - Bun.secrets API reference
- @docs/MCP-SECRETS-INTEGRATION.md - MCP secrets management integration
- @docs/BUN-SECRETS-DOD-COMPLETION.md - DoD completion report
- @docs/VERIFY-SECRETS-METRICS.md - Metrics verification guide
- @docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md - RBAC details

## Implementation

**Location**: `src/api/routes.ts` (line ~4693)

**Handler**: Returns static topic definitions organized by category.

**Source**: Topics are defined in `.github/TOPICS.md` and referenced in the response.

## Server Port

The default server runs on port **3000**. To use port 8080:

```bash
PORT=8080 bun run dev
```

Then access:
```
http://localhost:8080/api/registry/topics
```

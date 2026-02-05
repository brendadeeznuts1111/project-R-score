# Tier-1380 MCP Tool Registry

Production-grade MCP tool registry with `Bun.deepMatch` runtime validation for Tier-1380 OMEGA.

## Features

- **JSON Schema Validation**: Strict schema for tool definitions
- **Runtime deepMatch Validation**: `Bun.deepMatch` for subset validation
- **Security Integration**: Threat intelligence logging and session validation
- **Type Safety**: Full TypeScript support with strict typing
- **Comprehensive Testing**: Built-in validation tests and examples

## Quick Start

```bash
# Install dependencies
bun install

# Run validation tests
bun run test

# Start demonstration server
bun run server

# Validate schema
bun run schema:validate
```

## Architecture

### 1. Schema (`schema.json`)

- Defines the shape of every tool in the registry
- Enforces strict typing with pattern properties
- Supports nested structures and complex validation rules

### 2. Registry (`registry.json`)

- Contains tool definitions with input schemas
- Organized by category: rss, cdn, audit, telemetry, security, system
- All tools operate at Tier-1380 security level

### 3. Validation Middleware (`validate.ts`)

- Runtime validation using `Bun.deepMatch`
- Security context verification
- Threat intelligence integration
- Comprehensive error handling

## Validation Examples

### Valid Tool Call

```javascript
const call = {
  name: 'rss/query',
  arguments: { pattern: 'bun', limit: 5 }
};
const isValid = quickValidate(call); // true
```

### Invalid Tool Call

```javascript
const call = {
  name: 'rss/query',
  arguments: { limit: 10 } // Missing required 'pattern'
};
const isValid = quickValidate(call); // false
```

### DeepMatch Validation

```bash
bun -e '
const schemas = { "rss/query": { input: { pattern: "string", limit: "number" }, required: ["pattern"] } };
const call = { name: "rss/query", arguments: { pattern: "bun" } };
console.log(Bun.deepMatch(call.arguments, schemas["rss/query"].input) ? "Valid subset" : "Invalid")'
```

## Available Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **RSS** | `rss/query`, `rss/generate` | Query and generate RSS feeds |
| **CDN** | `cdn/purge`, `cdn/status` | Cache management and status |
| **Audit** | `audit/log`, `audit/scan` | Col-89 compliance and logging |
| **Telemetry** | `telemetry/metrics` | System performance metrics |
| **Security** | `security/validate` | Permission and token validation |
| **System** | `system/info`, `system/health` | System information and health checks |

## Security Features

- **Schema Validation**: Prevents malformed tool calls
- **Required Field Enforcement**: Ensures all required parameters are present
- **Session Validation**: Verifies user permissions and tier level
- **Threat Logging**: Automatically logs validation failures
- **Subset Validation**: Uses `Bun.deepMatch` for safe argument parsing

## Integration

### MCP Server Integration

```typescript
import { createValidatedMCPServer } from '@tier1380/mcp-tools';

const server = createValidatedMCPServer();
// Server automatically validates all tool calls
```

### Custom Validation

```typescript
import { validateToolCall } from '@tier1380/mcp-tools';

const result = validateToolCall('rss/query', { pattern: 'bun' });
if (!result.valid) {
  console.error('Validation failed:', result.error);
}
```

## Testing

Run the comprehensive test suite:

```bash
bun run test
```

Tests include:

- Valid tool calls
- Missing required fields
- Invalid parameter types
- Non-existent tools
- Edge cases and boundary conditions

## Registry Statistics

- **Total Tools**: 10
- **Categories**: 6 (rss, cdn, audit, telemetry, security, system)
- **Security Tier**: 1380 (all tools)
- **Validation**: Runtime with `Bun.deepMatch`

## Next Vectors

Available enhancements:

1. **SSE live width violation alerts** - Real-time violation notifications
2. **Tenant compliance score** - Percentage compliance tracking
3. **Nightly width stats compaction** - Automated aggregation
4. **Export tenant width report** - CSV/JSON reporting
5. **Per-tenant threshold alerts** - Custom alerting rules

## License

MIT License - Tier-1380 OMEGA

---

🔐 **Chalmette 12:32 AM CST** – Registry validated, deepMatch locked, tenants protected.
▵⟂⥂ standing by.

# 6.1.1.2.2.8.1.1.2.6 Enhanced MCP Error Code Management and Discoverability

**Section**: `6.1.1.2.2.8.1.1.2.6`  
**Parent Section**: `6.1.1.2.2` (MCP System)  
**Last Updated**: 2025-01-15

---

## Overview

This directory contains documentation for Hyper-Bun's Enhanced MCP Error Code Management and Discoverability system. This subsystem establishes a critical foundation for automated diagnostics, developer efficiency, and robust operational response.

## Contents

### Core Documentation

- **[MCP-ERROR-CODES.md](./MCP-ERROR-CODES.md)** - Comprehensive error code reference
  - Complete error code registry with detailed entries
  - `ripgrep` discoverability patterns
  - Integration with logging and alerting subsystems
  - Strategic impact analysis

## Constants Integration

The MCP error codes documentation references API endpoints and ports that align with centralized constants. See the [Constants Integration section](./MCP-ERROR-CODES.md#constants-integration) in `MCP-ERROR-CODES.md` for details.

**Key Constants**:
- `DEEP_LINK_DEFAULTS.API_PORT` → `"3001"` (Main API server port)
- `RSS_API_PATHS.REGISTRY_MCP_TOOLS` → `"/api/registry/mcp-tools"` (MCP tools registry)
- `RSS_API_PATHS.HEALTH` → `"/api/health"` (Health check endpoint)

**Cross-Reference**: See [BUN-RSS-INTEGRATION.md](../../BUN-RSS-INTEGRATION.md) for complete constants documentation.

## Related Documentation

- `docs/MCP-CLI-TROUBLESHOOTING.md` - MCP CLI troubleshooting guide
- `docs/MCP-CLI-VERIFICATION.md` - MCP CLI verification guide
- `src/errors/index.ts` - Error registry implementation
- `src/mcp/server.ts` - MCP server error handling
- `docs/BUN-RSS-INTEGRATION.md` - Constants system documentation

## Quick Links

### Error Code Discovery

```bash
# Find error definition
rg "NX-MCP-001" src/errors/index.ts

# Find error usage
rg "NX-MCP-001" src/

# Find in logs
rg "NX-MCP-001" --type log
```

### Related Sections

- `6.1.1.2.2` - MCP System (Parent)
- `6.1.1.2.2.8.1.1.2.6.1` - Centralized Error Code Registry
- `6.1.1.2.2.8.1.1.2.6.2` - `ripgrep` Driven Discovery
- `6.1.1.2.2.8.1.1.2.6.3` - Logging & Alerting Integration
- `6.1.1.2.2.8.1.1.2.6.4` - Strategic Impact

---

**Maintainer**: Hyper-Bun Platform Team  
**Documentation Standard**: `6.1.1.2.2.8.1.1.2.6`

# MCP Bun Utils Integration Guide

**Document ID: MCP-7.0.0.0.0.0.0** | **Last Updated: 2025-01-06**
**Cross-Reference Hub: See `7.0.0.0.0.0.0` for Bun Runtime Utilities, `MCP-TOOLS` for MCP Tool Structure**

---

## Overview

Bun Runtime Utilities (`7.x.x.x.x.x.x`) are now available as MCP tools, enabling programmatic access to inspection, UUID generation, and string formatting utilities through the Model Context Protocol.

## Available MCP Tools

### 1. `bun-inspect-table` (7.1.1.0.0.0.0)

Format tabular data using `Bun.inspect.table()` with column selection and colors.

**Parameters:**
- `data` (array, required) - Array of objects to display as table
- `columns` (array of strings, optional) - Column names to display
- `colors` (boolean, optional) - Enable ANSI colors (default: true)

**Example:**
```bash
bun run mcp exec bun-inspect-table \
  --data='[{"Event":"TEST-001","Severity":9.5,"Bookmaker":"DraftKings"}]' \
  --columns='["Event","Severity","Bookmaker"]'
```

**Output:** Formatted table with aligned columns

---

### 2. `bun-inspect-deep` (7.1.2.0.0.0.0)

Perform deep inspection of nested objects/arrays using `Bun.inspect()`.

**Parameters:**
- `value` (any, required) - Value to inspect
- `depth` (number, optional) - Inspection depth (default: 5)
- `colors` (boolean, optional) - Enable ANSI colors (default: true)

**Example:**
```bash
bun run mcp exec bun-inspect-deep \
  --value='{"featureFlags":{"shadowGraph":true,"covertSteamAlerts":false}}' \
  --depth=2
```

**Output:** Deep inspection with nested objects expanded

---

### 3. `bun-generate-uuid` (7.2.1.0.0.0.0)

Generate time-ordered UUIDv7 for event correlation.

**Parameters:**
- `count` (number, optional) - Number of UUIDs to generate (default: 1, max: 1000)
- `correlationKey` (string, optional) - Correlation key for deterministic sharding

**Example:**
```bash
# Generate single UUID
bun run mcp exec bun-generate-uuid

# Generate multiple UUIDs
bun run mcp exec bun-generate-uuid --count=5

# Generate correlated UUID
bun run mcp exec bun-generate-uuid --correlationKey="bet365"
```

**Output:** UUID(s) with uniqueness verification

---

### 4. `bun-string-width` (7.3.1.0.0.0.0)

Calculate Unicode-aware display width for string formatting.

**Parameters:**
- `strings` (array of strings, required) - Strings to calculate width for
- `targetWidth` (number, optional) - Target width for padding

**Example:**
```bash
bun run mcp exec bun-string-width \
  --strings='["Bet365⚡","Pinnacle","测试"]' \
  --targetWidth=15
```

**Output:** Table showing string width and padded versions

---

### 5. `bun-diagnostics-log` (7.4.1.2.0)

Log UIContext state using integrated diagnostics.

**Parameters:**
- `context` (object, required) - HyperBunUIContext object
- `severity` (string, optional) - Log level: "info", "warn", or "error" (default: "info")

**Example:**
```bash
bun run mcp exec bun-diagnostics-log \
  --context='{"apiBaseUrl":"http://localhost:3001","featureFlags":{"shadowGraph":true},"userRole":"admin","debugMode":false,"currentTimestamp":1704556800000}' \
  --severity="error"
```

**Output:** Diagnostic logged to terminal and Telegram (if error severity)

---

### 6. `bun-inspect-shadow-graph` (7.1.2.3.0)

Inspect ShadowGraph data structures with specialized formatting.

**Parameters:**
- `graph` (any, required) - ShadowGraph data structure

**Example:**
```bash
bun run mcp exec bun-inspect-shadow-graph \
  --graph='{"nodes":[{"id":"node1","correlationStrength":0.95}]}'
```

**Output:** Specialized ShadowGraph inspection

---

## CLI Usage

### List All Bun Utils Tools
```bash
bun run mcp list | grep "Bun Utils"
```

### Execute Tools
```bash
# Table inspection
bun run mcp exec bun-inspect-table --data='[...]' --columns='["col1","col2"]'

# UUID generation
bun run mcp exec bun-generate-uuid --count=10

# String width calculation
bun run mcp exec bun-string-width --strings='["test","测试"]' --targetWidth=10

# Deep inspection
bun run mcp exec bun-inspect-deep --value='{"nested":{"data":123}}' --depth=3

# Diagnostics logging
bun run mcp exec bun-diagnostics-log --context='{...}' --severity="info"
```

## Integration with Other Systems

### HTMLRewriter Integration
- Uses UIContext from HTMLRewriter (`6.1.1.2.2.1.2.0`)
- Inspects context using `bun-diagnostics-log` (7.4.1.2.0)

### Telegram Integration
- Formats messages using `bun-string-width` (7.3.1.0.0.0.0)
- Generates event IDs using `bun-generate-uuid` (7.2.1.0.0.0.0)
- Creates tables using `bun-inspect-table` (7.1.1.0.0.0.0)

## MCP Tool Registration

Tools are automatically registered in `src/cli/mcp.ts`:

```typescript
// Register Bun Runtime Utilities tools (7.0.0.0.0.0.0)
const bunUtilsTools = createBunUtilsTools();
server.registerTools(bunUtilsTools);
```

## Cross-Reference Verification

```bash
# Find all Bun Utils MCP tools
rg "bun-" src/mcp/tools/bun-utils.ts

# Verify tool registration
rg "createBunUtilsTools" src/cli/mcp.ts

# Check cross-references
rg "7\.\d+\.\d+\.\d+\.\d+" src/mcp/tools/bun-utils.ts
```

## See Also

- [Bun Utils Integration Guide](./BUN-UTILS-INTEGRATION.md) - Complete utilities documentation
- [MCP Server](../src/mcp/server.ts) - MCP server implementation
- [MCP CLI](../src/cli/mcp.ts) - Command-line interface

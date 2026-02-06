# MCP CLI Troubleshooting Guide

## Overview

This guide helps diagnose and fix common issues with MCP (Model Context Protocol) CLI commands.

## Quick Verification

First, verify the MCP CLI is properly configured:

```bash
# Check if script exists in package.json
grep '"mcp"' package.json

# Should output:
# "mcp": "bun run src/cli/mcp.ts"
```

## Common Issues and Solutions

### 1. Script Not Found

**Symptom:**
```bash
$ bun run mcp list
error: script "mcp" not found
```

**Solution:**
- Verify `package.json` contains: `"mcp": "bun run src/cli/mcp.ts"`
- Ensure you're in the project root directory
- Run `bun install` to refresh scripts

### 2. Import Errors

**Symptom:**
```bash
$ bun run mcp list
Error: Cannot find module '../mcp'
```

**Solution:**
- Verify `src/mcp/index.ts` exists and exports required functions:
  - `MCPServer`
  - `createBunToolingTools`
  - `createBunShellTools`
  - `createDocsIntegrationTools`
  - `createSecurityDashboardTools`
  - `createBunUtilsTools`
  - `multiLayerCorrelationTools`
- Check import paths in `src/cli/mcp.ts`
- Run `bun run typecheck` to verify TypeScript compilation

### 3. Missing Tool Exports

**Symptom:**
```bash
$ bun run mcp list
Error: multiLayerCorrelationTools is not exported
```

**Solution:**
- Verify `src/mcp/index.ts` exports all required tools:
  ```typescript
  export { multiLayerCorrelationTools } from "./tools/multi-layer-correlation";
  export { createBunUtilsTools } from "./tools/bun-utils";
  ```
- Check individual tool files exist:
  - `src/mcp/tools/bun-utils.ts`
  - `src/mcp/tools/multi-layer-correlation.ts`
  - `src/mcp/tools/bun-shell-tools.ts`
  - `src/mcp/tools/bun-tooling.ts`
  - `src/mcp/tools/docs-integration.ts`
  - `src/mcp/tools/security-dashboard.ts`

### 4. Database Path Issues

**Symptom:**
```bash
$ bun run mcp exec research-discover-patterns --sport=NBA
Error: Cannot open database ./data/research.db
```

**Solution:**
- Research tools require `./data/research.db` to exist
- Create the database directory: `mkdir -p data`
- Initialize the database if needed (check research tools documentation)
- Tools will gracefully skip if database doesn't exist (non-fatal)

### 5. Tool Execution Errors

**Symptom:**
```bash
$ bun run mcp exec tooling-diagnostics
Error: Tool execution failed
```

**Solution:**
- Check tool-specific requirements (some tools need API endpoints running)
- Verify environment variables are set (e.g., `TELEGRAM_BOT_TOKEN`)
- Review tool error messages for specific requirements
- Check `src/mcp/tools/` for tool-specific documentation

### 6. Argument Parsing Issues

**Symptom:**
```bash
$ bun run mcp exec tool-name --key=value
Error: Invalid argument format
```

**Solution:**
- Use proper argument format:
  - `--key=value` (recommended)
  - `--key value` (alternative)
  - `--flag` (boolean flags)
- For JSON values: `--key='{"nested": "value"}'`
- Check tool's `inputSchema` for required parameters:
  ```bash
  bun run mcp list  # Shows all tools with parameters
  ```

### 7. Missing Dependencies

**Symptom:**
```bash
$ bun run mcp list
Error: Cannot find module 'bun:sqlite'
```

**Solution:**
- Ensure Bun version >= 1.2.0 (check: `bun --version`)
- Run `bun install` to install dependencies
- Verify `package.json` dependencies are correct

### 8. Circular Import Issues

**Symptom:**
```bash
$ bun run mcp list
Error: Circular dependency detected
```

**Solution:**
- Check import chains in:
  - `src/cli/mcp.ts`
  - `src/mcp/index.ts`
  - `src/mcp/tools/*.ts`
- Use dynamic imports for optional dependencies (research tools)
- Review import statements for circular references

## Diagnostic Commands

### Verify Installation
```bash
# Check Bun version
bun --version

# Verify script exists
grep '"mcp"' package.json

# Check file exists
test -f src/cli/mcp.ts && echo "✅ CLI file exists" || echo "❌ CLI file missing"
test -f src/mcp/index.ts && echo "✅ MCP index exists" || echo "❌ MCP index missing"
```

### Test Basic Functionality
```bash
# List all tools (should work without database)
bun run mcp list

# Test tool execution (no parameters)
bun run mcp exec tooling-diagnostics

# Test UUID generation
bun run mcp exec bun-generate-uuid --count=3
```

### Check Exports
```bash
# Verify TypeScript compilation
bun run typecheck

# Check for import errors
bun run src/cli/mcp.ts list 2>&1 | grep -i error
```

## File Structure Verification

Expected file structure:

```text
src/
├── cli/
│   └── mcp.ts                    # MCP CLI entry point
├── mcp/
│   ├── index.ts                  # Main exports
│   ├── server.ts                 # MCPServer class
│   └── tools/
│       ├── bun-utils.ts          # Bun utilities tools
│       ├── bun-shell-tools.ts    # Shell execution tools
│       ├── bun-tooling.ts        # Tooling diagnostics
│       ├── docs-integration.ts   # Documentation tools
│       ├── security-dashboard.ts # Security tools
│       ├── multi-layer-correlation.ts  # Correlation tools
│       └── search-bun.ts         # Search tools
```

## Tool Categories

Tools are organized into categories:

- **Bun Tooling** (`tooling-*`) - System diagnostics and health checks
- **Bun Shell** (`shell-*`) - Shell command execution
- **Documentation** (`docs-*`) - Documentation integration
- **Security** (`security-*`) - Security dashboard tools
- **Bun Utils** (`bun-*`) - Runtime utilities (inspect, UUID, formatting)
- **Research** (`research-*`) - Research tools (requires database)
- **Multi-Layer Correlation** (`multi-layer-*`) - Correlation analysis

## Getting Help

### List Available Tools
```bash
bun run mcp list
```

### Show Help
```bash
bun run mcp help
# or
bun run mcp --help
```

### View Tool Details
```bash
# List shows tool parameters and descriptions
bun run mcp list | grep -A 10 "tool-name"
```

## Error Reporting

When reporting issues, include:

1. **Command executed:**
   ```bash
   bun run mcp exec tool-name --key=value
   ```

2. **Full error output:**
   ```bash
   bun run mcp exec tool-name --key=value 2>&1
   ```

3. **Environment:**
   ```bash
   bun --version
   node --version  # if applicable
   uname -a
   ```

4. **File verification:**
   ```bash
   ls -la src/cli/mcp.ts
   ls -la src/mcp/index.ts
   ```

5. **TypeScript check:**
   ```bash
   bun run typecheck 2>&1 | grep -i mcp
   ```

## Best Practices

1. **Always use `bun run mcp`** instead of direct script execution
2. **Check tool requirements** before execution (some need database, API endpoints, etc.)
3. **Use proper argument format** (`--key=value` recommended)
4. **Verify environment** before running tools that require external services
5. **Check tool output** for warnings about missing dependencies

## Related Documentation

- `commands/mcp.md` - MCP CLI usage guide
- `docs/4.0.0.0.0.0.0-MCP-ALERTING.md` - MCP alerting system
- Individual tool files in `src/mcp/tools/` for tool-specific documentation

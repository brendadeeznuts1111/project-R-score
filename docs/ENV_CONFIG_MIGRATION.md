# Environment Configuration Migration Guide

This document tracks the migration from hardcoded `/Users/...` paths to environment variable-based configuration.

## ✅ Completed Migrations

### Code Files (TypeScript/TS)
- ✅ `projects/analysis/scanner/scan.ts` - Uses `Bun.env.BUN_PLATFORM_HOME` with fallback detection
- ✅ `projects/dashboards/secrets-dashboard/server.ts` - Uses `Bun.env.BUN_PLATFORM_HOME` with fallback detection  
- ✅ `lib/port-management-system.ts` - Uses `Bun.env.BUN_PLATFORM_HOME` for project paths

### Shell Scripts
- ✅ `.husky/new-project.sh` - Uses `$BUN_PLATFORM_HOME` (defaults to `$HOME/Projects`)
- ✅ `.husky/apply-hooks.sh` - Uses `$BUN_PLATFORM_HOME` (defaults to `$HOME/Projects`)

## ⚠️ JSON Config Files Requiring Manual Setup

The following JSON configuration files contain hardcoded paths that cannot be automatically resolved at runtime. These require manual configuration or environment variable substitution by the tooling that reads them.

### MCP Server Configurations

#### `factorywager-mcp.json`
```json
{
  "mcpServers": {
    "bun-docs": {
      "args": ["run", "/Users/nolarose/Projects/scripts/mcp-bridge.ts"]
    },
    "factorywager-tools": {
      "args": ["run", "/Users/nolarose/Projects/scripts/fw-tools-mcp.ts"]
    }
  }
}
```

**Solution Options:**
1. **Use relative paths** (if MCP tool supports it):
   ```json
   "args": ["run", "scripts/mcp-bridge.ts"]
   ```
2. **Use environment variable substitution** (if your MCP client supports it):
   ```json
   "args": ["run", "${BUN_PLATFORM_HOME}/scripts/mcp-bridge.ts"]
   ```
3. **Create a wrapper script** that resolves paths before launching MCP servers
4. **Manual edit** per installation (documented in setup instructions)

#### `lib/security/bun-mcp-config.json` & `lib/security/mcp-config.json`
```json
{
  "mcpServers": {
    "tier1380-security": {
      "args": ["run", "/Users/nolarose/Projects/lib/security/mcp-server.ts"]
    }
  }
}
```

**Solution:** Same options as above. Consider using relative paths if the config is always loaded from the repo root.

### Recommended Approach

1. **For development:** Keep relative paths or use a local config override
2. **For deployment:** Use environment variable substitution if supported, or generate configs from templates
3. **Documentation:** Add setup instructions that mention setting `BUN_PLATFORM_HOME` before using these tools

## Environment Variable Reference

### `BUN_PLATFORM_HOME`
- **Purpose:** Root directory of the Bun platform workspace
- **Default:** `$HOME/Projects` (in shell scripts), auto-detected in TypeScript (walks up from `Bun.main`)
- **Usage:** Set this before running tools or scripts that need platform root
- **Example:**
  ```bash
  export BUN_PLATFORM_HOME="/path/to/your/projects"
  bun tools/overseer-cli.ts
  ```

### Detection Logic (TypeScript)

When `BUN_PLATFORM_HOME` is not set, code files attempt to detect the platform root by:
1. Starting from `Bun.main` directory
2. Walking up the directory tree
3. Looking for markers: `.husky/` directory and `docs/` directory
4. Falling back to `process.cwd()` if not found

This allows the code to work without environment variables when run from within the repo structure.

## Migration Checklist

- [x] Fix TypeScript code files to use `Bun.env.BUN_PLATFORM_HOME`
- [x] Fix shell scripts to use `$BUN_PLATFORM_HOME`
- [x] Document JSON config file limitations
- [x] Update documentation examples to use `BUN_PLATFORM_HOME` or generic paths
- [x] Update AGENTS.md, QUICK_TEST.md, DIRECTORY_STRUCTURE.md, BUN_MAIN_GUIDE.md, BUN_WHICH_GUIDE.md
- [ ] Add setup instructions for MCP configs (in tool-specific docs)
- [ ] Test all tools work with env var set
- [ ] Test all tools work with env var unset (auto-detection)

## Testing

After migration, verify:

```bash
# Test with env var set
export BUN_PLATFORM_HOME="/custom/path"
bun projects/analysis/scanner/scan.ts --help

# Test without env var (should auto-detect)
unset BUN_PLATFORM_HOME
bun projects/analysis/scanner/scan.ts --help

# Test shell scripts
export BUN_PLATFORM_HOME="/custom/path"
bash .husky/new-project.sh test-project
```

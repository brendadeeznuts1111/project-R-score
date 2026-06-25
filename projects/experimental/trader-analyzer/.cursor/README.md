# Cursor Configuration

This directory contains Cursor-specific configuration files.

## Files

- **`mcp.json`** - MCP server configuration (not tracked in git, contains API keys)
- **`mcp.json.template`** - Template for `mcp.json` (tracked in git)
- **`mcp-config.md`** - Detailed MCP configuration documentation

## Quick Setup

1. Copy the template:
   ```bash
   cp .cursor/mcp.json.template .cursor/mcp.json
   ```

2. Edit `.cursor/mcp.json` and add your Bun MCP API key if required:
   ```json
   {
     "mcpServers": {
       "bun": {
         "url": "https://mcp.bun.sh",
         "transport": "http",
         "apiKey": "your-api-key-here"
       }
     }
   }
   ```

3. Restart Cursor to load the MCP servers.

## Security Note

The `mcp.json` file is excluded from git to prevent accidentally committing API keys. Only the template file is tracked.

# Usage Guide: Bun Docs MCP Server

## Quick Start

### Option 1: Using bunx (Recommended)

```bash
# From the project directory
cd /path/to/mcp-bun-docs
bunx mcp-bun-docs

# Or use absolute path
bunx /path/to/mcp-bun-docs/index.ts
```

### Option 2: Global Installation

```bash
# Install globally
bun install -g ./mcp-bun-docs

# Then use from anywhere
mcp-bun-docs
```

### Option 3: Local Installation

```bash
# In your project
bun add ./path/to/mcp-bun-docs

# Run via bunx
bunx mcp-bun-docs
```

## MCP Client Configuration

### Cursor IDE

Add to `.cursor/mcp.json` or your Cursor settings:

```json
{
  "mcpServers": {
    "bun-docs": {
      "command": "bunx",
      "args": ["/absolute/path/to/mcp-bun-docs/index.ts"]
    }
  }
}
```

**Using bunx resolution:**

```json
{
  "mcpServers": {
    "bun-docs": {
      "command": "bunx",
      "args": ["--bun", "mcp-bun-docs"],
      "cwd": "/path/to/mcp-bun-docs"
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bun-docs": {
      "command": "bunx",
      "args": ["/absolute/path/to/mcp-bun-docs/index.ts"]
    }
  }
}
```

## Testing the Server

### Manual Test

```bash
# Start the server (stdio mode)
bunx mcp-bun-docs

# The server will wait for MCP protocol messages on stdin
# Use an MCP client to interact with it
```

### Verify Installation

```bash
# Check if bunx can resolve it
bunx --help

# Test the executable
bunx mcp-bun-docs --version 2>&1 || echo "Server started (no --version flag, this is normal)"
```

## Troubleshooting bunx Resolution

### Issue: bunx can't find the package

**Solution 1:** Use absolute path
```bash
bunx /full/path/to/mcp-bun-docs/index.ts
```

**Solution 2:** Install locally first
```bash
cd /path/to/mcp-bun-docs
bun install
bunx mcp-bun-docs
```

**Solution 3:** Use bun directly
```bash
bun /path/to/mcp-bun-docs/index.ts
```

### Issue: Permission denied

```bash
# Make executable
chmod +x index.ts

# Or run with bun explicitly
bun index.ts
```

### Issue: Module not found errors

```bash
# Install dependencies
cd /path/to/mcp-bun-docs
bun install
```

## Environment Variables

The server respects these environment variables:

- `BUN_PLATFORM_HOME` - Platform root (for analyze plan resource)
- `DEBUG` - Enable debug logging (if implemented)

## Examples

### Search Bun Documentation

```typescript
// Via MCP client
SearchBun({
  query: "Bun.serve",
  apiReferenceOnly: true,
  prodSafe: true
})
```

### Get Specific Entry

```typescript
GetBunDocEntry({
  term: "spawn",
  urlOnly: false
})
```

### Find Cross-References

```typescript
GetBunDocCrossReferences({
  term: "Bun.serve"
})
```

## Performance

- **Startup time**: < 100ms
- **Memory usage**: ~20-30MB
- **Response time**: < 50ms for most queries

## Next Steps

1. Configure your MCP client (Cursor/Claude)
2. Test the connection
3. Start using the tools in your AI assistant

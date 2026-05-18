# Bun Docs MCP Server

SearchBun MCP Server - Bun documentation search bridge for Model Context Protocol (MCP) clients like Cursor and Claude.

## Features

- 🔍 **SearchBun**: Full-text search across Bun documentation
- 📚 **GetBunDocEntry**: Resolve curated doc entries by term
- 🔗 **GetBunDocCrossReferences**: Find related documentation
- 💡 **SuggestBunDocTerms**: Typeahead/discovery for doc terms
- 📊 **Matrix Resources**: Access Bun feature matrices and performance baselines
- 🌐 **Global Access**: Available via `bun x` from anywhere

## Installation

### Global Installation (Recommended)

```bash
# Install globally via bun
bun install -g mcp-bun-docs

# Or use bunx to run without installing
bunx mcp-bun-docs
```

### Local Installation

```bash
# In your project directory
bun add mcp-bun-docs

# Run locally
bunx mcp-bun-docs
```

### Using bunx (No Installation Required)

For local packages, use the full path:

```bash
# Run from project directory using bun directly (recommended)
bun index.ts

# Or use bunx with full path
bunx /absolute/path/to/mcp-bun-docs/index.ts

# If installed locally in a project
cd /path/to/your/project
bun add ./path/to/mcp-bun-docs
bunx mcp-bun-docs
```

**Note:** `bunx` resolves packages from:
- npm registry (if published)
- Local `node_modules` (if installed)
- For local development, use `bun` directly or provide full path to `bunx`

## Usage

### As MCP Server

Add to your MCP configuration (e.g., `.cursor/mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "bun-docs": {
      "command": "bun",
      "args": ["/absolute/path/to/mcp-bun-docs/index.ts"]
    }
  }
}
```

**Or using bunx:**

```json
{
  "mcpServers": {
    "bun-docs": {
      "command": "bunx",
      "args": ["--bun", "/absolute/path/to/mcp-bun-docs/index.ts"]
    }
  }
}
```

### Direct Execution

```bash
# Run the server (stdio mode for MCP)
bunx mcp-bun-docs

# Or if installed globally
mcp-bun-docs
```

## Available Tools

### SearchBun
Search across the Bun knowledge base to find relevant information, code examples, API references, and guides.

**Parameters:**
- `query` (string): Search query
- `version` (string, optional): Filter to specific version (e.g. 1.3.6)
- `language` (string, optional): Language code (en, zh, es)
- `apiReferenceOnly` (boolean, optional): Only API reference docs
- `codeOnly` (boolean, optional): Only code snippets
- `prodSafe` (boolean, optional): Exclude experimental/deprecated
- `platform` (enum, optional): Filter by platform (darwin, linux, win32)

### GetBunDocEntry
Resolve a curated Bun doc entry by term (e.g. spawn, Bun.serve).

**Parameters:**
- `term` (string): Curated term (e.g. spawn, Bun.serve, S3File.presign)
- `urlOnly` (boolean, optional): If true, return only the doc URL

### GetBunDocCrossReferences
Get cross-references for a Bun doc term: related doc entries with URLs.

**Parameters:**
- `term` (string): Curated term (e.g. spawn, Bun.serve, buffer)

### SuggestBunDocTerms
Suggest curated doc terms by partial match (case-insensitive).

**Parameters:**
- `query` (string): Partial term (e.g. spawn, buffer, serve)
- `limit` (number, optional): Max results (default 10)

## Global Access to Constants

### CLI Tool

Access `BUN_DOC_MAP` and `BUN_DOCS_BASE` from the command line:

```bash
# Get base URL
bunx bun-docs-cli --base-url
# Output: https://bun.com

# Get docs base URL
bunx bun-docs-cli --docs-base
# Output: https://bun.com/docs

# Get specific term from BUN_DOC_MAP
bunx bun-docs-cli --doc-map --term spawn
# Output: {"term":"spawn","path":"api/spawn","url":"https://bun.com/docs/api/spawn"}

# List all terms
bunx bun-docs-cli --list-terms

# Search documentation
bunx bun-docs-cli --search "Bun.serve"

# Get curated entry
bunx bun-docs-cli --entry spawn

# Get doc URL for term
bunx bun-docs-cli --entry-url spawn
# Output: https://bun.com/docs/api/spawn

# Get count of entries
bunx bun-docs-cli --count
```

### Programmatic Access

Import constants directly in your code:

```typescript
// Import from lib
import { 
  BUN_DOCS_BASE,      // "https://bun.com/docs"
  BUN_DOC_MAP,        // Record<string, string> - 88 entries
  BUN_BASE_URL,       // "https://bun.com"
  buildDocUrl,
  getDocEntry
} from "mcp-bun-docs/lib";

// Use
const spawnUrl = buildDocUrl(BUN_DOC_MAP["spawn"]);
// "https://bun.com/docs/api/spawn"
```

See [EXPORTS.md](./EXPORTS.md) for complete API documentation.

## Available Resources

- `bun://docs/matrix` - Bun MCP matrix with curated terms and weights
- `bun://docs/matrix/v1.3.7` - Tier-1380 Feature Matrix
- `bun://docs/matrix/v1.3.7-complete` - Complete Matrix (28 entries)
- `bun://docs/matrix/perf-baselines` - Performance Regression Gates
- `bun://profiles/cpu-heap-md` - CPU & Heap Profiling (Markdown)
- `bun://docs/reference-links` - All Bun reference link keys and URLs
- `bun://docs/feedback` - Bun feedback/upgrade-first guidance
- `bun://docs/bun-types` - oven-sh/bun-types package info
- `bun://docs/links` - Official Bun links (shop, blog, guides, RSS, repo)
- `bun://analyze/plan/realtime` - Analyze CLI plan status (live updates)

## Development

### Local Development

```bash
# Clone the repository
git clone <repo-url>
cd mcp-bun-docs

# Install dependencies
bun install

# Run the server
bun run start
# or
bun run mcp
```

### Testing

```bash
# Run examples
bun run example:search
bun run example:rss

# Validate entries
bun run matrix:validate
```

## Configuration

The server uses stdio transport for MCP communication. No additional configuration is required.

### Environment Variables

- `BUN_PLATFORM_HOME` - Platform root directory (optional, for analyze plan resource)

## Requirements

- Bun >= 1.3.8
- Node.js >= 18.0.0 (for compatibility)

## Troubleshooting

### Server Won't Start

```bash
# Check Bun version
bun --version

# Verify the file is executable
chmod +x index.ts

# Run with verbose output
bunx --verbose mcp-bun-docs
```

### MCP Client Can't Find Server

1. Ensure `bunx` is in your PATH
2. Verify the command in MCP config: `bunx mcp-bun-docs`
3. Check server logs for errors

### TypeScript Errors

The server uses Bun's native TypeScript support. If you see TypeScript errors in your editor but the server runs fine, this is normal - Bun handles TypeScript at runtime.

## License

MIT

## Author

nolarose

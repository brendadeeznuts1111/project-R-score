# MCP CLI

**11.2.0.0.0.0.0: MCP Tools Execution**

Execute MCP (Model Context Protocol) tools from the command line.

**Cross-Reference:**
- `7.0.0.0.0.0.0` → Bun Runtime Utilities (used by MCP tools)
- `7.4.3.x.x.x.x` → Bun.spawn() for process execution
- `7.5.x.x.x.x.x` → File & Stream operations

## 11.2.0.1.0.0.0: Usage

```bash
bun run mcp <command> [options]
```

## 11.2.0.2.0.0.0: Commands

### 11.2.1.0.0.0.0: Tool Listing

#### `list`

List all available MCP tools.

**Example:**
```bash
bun run mcp list
```

**Output:**
- Groups tools by category (Bun Tooling, Shell, Documentation, etc.)
- Shows tool name and description
- Displays total count

### 11.2.2.0.0.0.0: Tool Execution

#### `exec <tool-name> [--key=value ...]`

Execute an MCP tool.

**Aliases:** `run`, `execute`

**Argument Format:**
- `--key=value` - Set parameter value
- `--key value` - Alternative format
- `--flag` - Boolean flag (sets to true)
- `--key='{"nested": "value"}'` - JSON values

**Examples:**
```bash
# Execute tooling diagnostics
bun run mcp exec tooling-diagnostics

# Check API health
bun run mcp exec tooling-check-health --endpoint=http://localhost:3000/health

# Execute shell command
bun run mcp exec shell-execute --command="echo hello"

# Research patterns
bun run mcp exec research-discover-patterns --sport=NBA --hours=24

# Inspect table data
bun run mcp exec bun-inspect-table --data='[{"name":"test","value":123}]' --columns='["name","value"]'

# Generate UUIDs
bun run mcp exec bun-generate-uuid --count=5
```

## 11.2.3.0.0.0.0: Tool Categories

### 11.2.3.1.0.0.0: Bun Tooling Tools

- `tooling-diagnostics` - System diagnostics
- `tooling-check-health` - Health check endpoint
- `tooling-check-version` - Version information

### 11.2.3.2.0.0.0: Shell Tools

- `shell-execute` - Execute shell commands
- `shell-pipe` - Execute piped commands
- `shell-redirect-response` - Redirect HTTP response to shell
- `shell-find-exec` - Find and execute pattern

### 11.2.3.3.0.0.0: Documentation Tools

- `docs-get-headers` - Get documentation headers
- `docs-get-footers` - Get documentation footers
- `docs-bun-reference` - Get Bun API references
- `docs-tooling-info` - Get tooling information
- `docs-get-sitemap` - Get component sitemap
- `docs-metadata-mapping` - Get metadata mapping

### 11.2.3.4.0.0.0: Research Tools

*Requires research database (`./data/research.db`)*

- `research-discover-patterns` - Discover trading patterns
- `research-anomaly-analysis` - Analyze anomalies
- `anomaly-research-*` - Various anomaly research tools

### 11.2.3.5.0.0.0: Bun Utils Tools

- `bun-inspect-table` - Inspect table data
- `bun-inspect-deep` - Deep inspection
- `bun-generate-uuid` - Generate UUIDs
- `bun-pad-strings` - String padding utilities
- `bun-format-table` - Format table output
- `bun-format-ripgrep` - Format ripgrep output

## 11.2.4.0.0.0.0: Tool Execution

Tools are executed through the MCP server:

1. Tool is registered with `MCPServer`
2. Arguments are parsed from CLI
3. Tool's `execute()` method is called
4. Results are displayed (text, JSON, or error)

## 11.2.5.0.0.0.0: Error Handling

- Invalid tool names show error message
- Tool execution errors are displayed
- Missing required arguments show usage

## 11.2.6.0.0.0.0: Examples

```bash
# List all tools
bun run mcp list

# Execute diagnostics
bun run mcp exec tooling-diagnostics

# Execute shell command
bun run mcp exec shell-execute --command="ls -la"

# Research patterns (requires database)
bun run mcp exec research-discover-patterns --sport=NBA --hours=24

# Generate UUIDs
bun run mcp exec bun-generate-uuid --count=10
```

## 11.2.7.0.0.0.0: Implementation Details

- Uses `Bun.argv` for argument parsing
- Tools are registered via `MCPServer`
- Supports async tool execution
- JSON output format available

## 11.2.8.0.0.0.0: See Also

- [MCP Server](../src/mcp/server.ts)
- [MCP Tools](../src/mcp/tools/)
- [Bun Shell Tools](../src/mcp/tools/bun-shell-tools.ts)

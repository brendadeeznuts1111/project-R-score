# MCP AST-Aware Analysis Tools

**MCP tools for AST-aware code analysis, pattern matching, and security detection**

---

## Overview

The AST-Aware Analysis MCP tools provide programmatic access to all AST-aware code analysis capabilities through the Model Context Protocol. All tools are **signed with Bun PM hash** (SHA-256) for verification.

**Location**: `src/mcp/tools/ast-analysis.ts`  
**Registry**: `src/api/registry.ts`  
**Category**: `ast-analysis`

---

## Tools

### 1. `ast-grep-search`

**AST-aware grep with semantic pattern matching and transformation**

#### Input Schema

```json
{
  "pattern": "string (required) - AST pattern (e.g., 'eval($EXPR)')",
  "query": "string (optional) - Complex query syntax",
  "context": "number (optional, default: 3) - Context lines",
  "transform": "string (optional) - Transformation pattern",
  "rewrite": "string (optional) - Rewrite pattern",
  "directory": "string (optional, default: 'src') - Directory to search"
}
```

#### Example

```json
{
  "method": "tools/call",
  "params": {
    "name": "ast-grep-search",
    "arguments": {
      "pattern": "eval($EXPR)",
      "context": 50,
      "transform": "safeEval($EXPR)"
    }
  }
}
```

#### Signature

```text
SHA-256: [generated via Bun.CryptoHasher]
Tool: ast-grep-search
Definition: AST-aware grep with semantic pattern matching
```

---

### 2. `pattern-weave-correlate`

**Cross-file pattern correlation with confidence scoring**

#### Input Schema

```json
{
  "patterns": "string (optional, default: './patterns.yaml') - Patterns config",
  "acrossFiles": "boolean (optional, default: true) - Enable cross-file correlation",
  "minConfidence": "number (optional, default: 0.85) - Minimum confidence",
  "minSupport": "number (optional, default: 0.7) - Minimum support",
  "output": "string (optional, default: 'pattern-graph.json') - Output file"
}
```

#### Example

```json
{
  "method": "tools/call",
  "params": {
    "name": "pattern-weave-correlate",
    "arguments": {
      "acrossFiles": true,
      "minConfidence": 0.85,
      "output": "pattern-graph.json"
    }
  }
}
```

#### Signature

```text
SHA-256: [generated via Bun.CryptoHasher]
Tool: pattern-weave-correlate
Definition: Cross-file pattern correlation with confidence scoring
```

---

### 3. `anti-pattern-detect`

**Security anti-pattern detection with automatic fixes**

#### Input Schema

```json
{
  "config": "string (optional, default: './security-rules.yaml') - Rules config",
  "severity": "string (optional) - Filter by severity (low|medium|high|critical)",
  "autofix": "boolean (optional, default: false) - Auto-apply fixes",
  "backup": "boolean (optional, default: false) - Create backups",
  "report": "string (optional, default: 'security-antipatterns.md') - Report file"
}
```

#### Example

```json
{
  "method": "tools/call",
  "params": {
    "name": "anti-pattern-detect",
    "arguments": {
      "severity": "high",
      "autofix": true,
      "backup": true,
      "report": "security-antipatterns.md"
    }
  }
}
```

#### Signature

```text
SHA-256: [generated via Bun.CryptoHasher]
Tool: anti-pattern-detect
Definition: Security anti-pattern detection with automatic fixes
```

---

### 4. `smell-diffuse-analyze`

**Code smell diffusion analysis with visualization**

#### Input Schema

```json
{
  "source": "string (optional, default: 'src') - Source file or directory",
  "radius": "number (optional, default: 3) - Diffusion radius",
  "visualize": "boolean (optional, default: false) - Generate HTML",
  "hotspots": "boolean (optional, default: true) - Show hotspots",
  "export": "string (optional) - Export file (JSON or HTML)"
}
```

#### Example

```json
{
  "method": "tools/call",
  "params": {
    "name": "smell-diffuse-analyze",
    "arguments": {
      "source": "src/api/routes.ts",
      "radius": 3,
      "visualize": true,
      "hotspots": true
    }
  }
}
```

#### Signature

```text
SHA-256: [generated via Bun.CryptoHasher]
Tool: smell-diffuse-analyze
Definition: Code smell diffusion analysis with visualization
```

---

### 5. `pattern-evolve-track`

**Track patterns across git history with frequency analysis and prediction**

#### Input Schema

```json
{
  "pattern": "string (required) - Pattern to track (e.g., 'eval(')",
  "gitHistory": "boolean (optional, default: true) - Analyze git history",
  "frequencyAnalysis": "boolean (optional, default: true) - Frequency analysis",
  "predictNext": "boolean (optional, default: false) - Predict next occurrence",
  "export": "string (optional) - Export evolution data (JSON)"
}
```

#### Example

```json
{
  "method": "tools/call",
  "params": {
    "name": "pattern-evolve-track",
    "arguments": {
      "pattern": "eval(",
      "gitHistory": true,
      "frequencyAnalysis": true,
      "predictNext": true
    }
  }
}
```

#### Signature

```text
SHA-256: [generated via Bun.CryptoHasher]
Tool: pattern-evolve-track
Definition: Track patterns across git history with frequency analysis
```

---

## Bun PM Hash Signing

All AST analysis tools are signed using `Bun.CryptoHasher` with SHA-256:

```typescript
function generateToolHash(toolName: string, toolDefinition: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(toolName);
  hasher.update(toolDefinition);
  return hasher.digest("hex");
}
```

Each tool includes a `signature` field containing the SHA-256 hash of:
- Tool name
- Tool definition/description

This ensures tool integrity and allows verification of tool authenticity.

---

## Registration

Tools are automatically registered in:

1. **MCP Server** (`scripts/mcp-server.ts`)
   ```typescript
   const astTools = createAstAnalysisTools();
   server.registerTools(astTools);
   ```

2. **MCP Registry** (`src/api/registry.ts`)
   ```typescript
   const astTools = createAstAnalysisTools();
   // Added to registry with category: "ast-analysis"
   ```

3. **MCP Module Exports** (`src/mcp/index.ts`)
   ```typescript
   export { createAstAnalysisTools } from "./tools/ast-analysis";
   ```

---

## Usage

### Via MCP Client

```bash
# Start MCP server
bun run mcp-server

# Tools are available via MCP protocol
# tools/list - List all tools
# tools/call - Execute tool
```

### Via API

```bash
# Get tools registry
curl http://localhost:3000/api/registry/mcp-tools

# Tools are categorized as "ast-analysis"
```

### Via CLI

```bash
# List all MCP tools including AST analysis tools
bun run list-tools

# Tools appear under "AST Analysis" category
```

---

## Related Documentation

- [AST Tools Reference](./AST-TOOLS-REFERENCE.md) - CLI tool documentation
- [MCP Server](./MCP-SERVER.md) - MCP server documentation
- [Constants Reference](./CONSTANTS-REFERENCE.md) - Platform constants

---

## Verification

To verify tool signatures:

```typescript
import { createAstAnalysisTools } from "./mcp/tools/ast-analysis";

const tools = createAstAnalysisTools();
for (const tool of tools) {
  console.log(`${tool.name}: ${tool.signature}`);
  // Verify signature matches expected hash
}
```

---

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0  
**Signed**: ✅ All tools signed with Bun PM hash (SHA-256)

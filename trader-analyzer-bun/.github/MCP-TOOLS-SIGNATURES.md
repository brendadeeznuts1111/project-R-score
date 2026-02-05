# MCP AST Analysis Tools - Bun PM Hash Signatures

**Tool signatures generated using Bun.CryptoHasher SHA-256**

---

## Signing Method

All AST analysis tools are signed using Bun's native `CryptoHasher`:

```typescript
function generateToolHash(toolName: string, toolDefinition: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(toolName);
  hasher.update(toolDefinition);
  return hasher.digest("hex");
}
```

**Hash Algorithm**: SHA-256  
**Source**: Bun.CryptoHasher (Bun PM)  
**Input**: Tool name + Tool definition/description

---

## Tool Signatures

### 1. `ast-grep-search`

**Tool Name**: `ast-grep-search`  
**Definition**: `AST-aware grep with semantic pattern matching`  
**Signature**: `f8c94c8dcd1de506...` (full: 64 hex chars)  
**Category**: `ast-analysis`  
**Status**: ✅ Signed

---

### 2. `pattern-weave-correlate`

**Tool Name**: `pattern-weave-correlate`  
**Definition**: `Cross-file pattern correlation with confidence scoring`  
**Signature**: `7e9c7b36249c29b4...` (full: 64 hex chars)  
**Category**: `ast-analysis`  
**Status**: ✅ Signed

---

### 3. `anti-pattern-detect`

**Tool Name**: `anti-pattern-detect`  
**Definition**: `Security anti-pattern detection with automatic fixes`  
**Signature**: `3b41f8759139a176...` (full: 64 hex chars)  
**Category**: `ast-analysis`  
**Status**: ✅ Signed

---

### 4. `smell-diffuse-analyze`

**Tool Name**: `smell-diffuse-analyze`  
**Definition**: `Code smell diffusion analysis with visualization`  
**Signature**: `45946d35ae0ada79...` (full: 64 hex chars)  
**Category**: `ast-analysis`  
**Status**: ✅ Signed

---

### 5. `pattern-evolve-track`

**Tool Name**: `pattern-evolve-track`  
**Definition**: `Track patterns across git history with frequency analysis`  
**Signature**: `6bf696f71d42b386...` (full: 64 hex chars)  
**Category**: `ast-analysis`  
**Status**: ✅ Signed

---

## Verification

To verify tool signatures:

```bash
# Get full signatures
bun -e "import { createAstAnalysisTools } from './src/mcp/tools/ast-analysis.ts'; const tools = createAstAnalysisTools(); tools.forEach(t => console.log(\`\${t.name}: \${t.signature}\`));"

# Verify in MCP registry
curl http://localhost:3000/api/registry/mcp-tools | jq '.tools[] | select(.category == "ast-analysis") | {name, signature}'
```

---

## Registry Integration

All tools are registered in:

1. **MCP Server** (`scripts/mcp-server.ts`)
2. **MCP Registry API** (`src/api/registry.ts`)
3. **MCP Module Exports** (`src/mcp/index.ts`)
4. **Tools Lister** (`scripts/list-tools.ts`)

---

## Documentation

- **MCP Tools Reference**: `docs/MCP-AST-TOOLS.md`
- **CLI Tools Reference**: `docs/AST-TOOLS-REFERENCE.md`
- **MCP Server Docs**: `MCP-SERVER.md`

---

**Last Updated**: 2025-01-XX  
**Signing Method**: Bun.CryptoHasher SHA-256  
**Status**: ✅ All tools signed and verified

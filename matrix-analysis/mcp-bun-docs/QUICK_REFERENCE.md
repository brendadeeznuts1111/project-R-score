# Quick Reference: BUN_DOC_MAP and BUN_DOCS_BASE

## Quick Access

### Via CLI (Recommended)

```bash
# Base URLs
bunx bun-docs-cli --base-url        # https://bun.com
bunx bun-docs-cli --docs-base       # https://bun.com/docs

# Get term from BUN_DOC_MAP
bunx bun-docs-cli --doc-map --term spawn
# Output: {"term":"spawn","path":"api/spawn","url":"https://bun.com/docs/api/spawn"}

# List all terms
bunx bun-docs-cli --list-terms

# Get count
bunx bun-docs-cli --count           # Shows entry count
```

### Via Programmatic Import

```typescript
// Import constants
import { 
  BUN_BASE_URL,      // "https://bun.com"
  BUN_DOCS_BASE,     // "https://bun.com/docs"
  BUN_DOC_MAP        // Record<string, string>
} from "mcp-bun-docs/lib";

// Use
console.log(BUN_DOCS_BASE);                    // "https://bun.com/docs"
console.log(BUN_DOC_MAP["spawn"]);             // "api/spawn"
console.log(BUN_DOC_MAP["Bun.serve"]);        // "api/http"
```

## Common Use Cases

### 1. Get Doc URL for Term

```typescript
import { BUN_DOC_MAP, BUN_DOCS_BASE } from "mcp-bun-docs/lib";

function getDocUrl(term: string): string | null {
  const path = BUN_DOC_MAP[term];
  return path ? `${BUN_DOCS_BASE}/${path}` : null;
}
```

### 2. Check if Term Exists

```bash
# CLI
bunx bun-docs-cli --doc-map --term <term>

# Programmatic
import { BUN_DOC_MAP } from "mcp-bun-docs/lib";
const exists = term in BUN_DOC_MAP;
```

### 3. List All API Terms

```bash
# CLI
bunx bun-docs-cli --list-terms | grep "^api/"

# Programmatic
import { BUN_DOC_MAP } from "mcp-bun-docs/lib";
const apiTerms = Object.entries(BUN_DOC_MAP)
  .filter(([_, path]) => path.startsWith("api/"))
  .map(([term]) => term);
```

### 4. Search Documentation

```bash
# CLI
bunx bun-docs-cli --search "Bun.serve"

# Programmatic
import { searchBunDocs } from "mcp-bun-docs/lib";
const results = await searchBunDocs("Bun.serve");
```

## Constants Reference

| Constant | Value | Description |
|----------|-------|-------------|
| `BUN_BASE_URL` | `"https://bun.com"` | Canonical base URL |
| `BUN_DOCS_BASE` | `"https://bun.com/docs"` | Docs base URL |
| `BUN_DOC_MAP` | `Record<string, string>` | Term → path mapping (88 entries) |
| `BUN_DOCS_VERSION` | `"1.3.7"` | Current docs version |
| `BUN_DOCS_MIN_VERSION` | `"1.3.6"` | Minimum supported version |

## Installation for Global Access

```bash
# Option 1: Install globally
bun install -g ./mcp-bun-docs
bun-docs-cli --base-url

# Option 2: Use bunx (no install)
bunx bun-docs-cli --base-url

# Option 3: Add to your project
bun add mcp-bun-docs
import { BUN_DOCS_BASE } from "mcp-bun-docs/lib";
```

## Examples

### Shell Script Usage

```bash
#!/bin/bash
# Get doc URL for a term
DOC_URL=$(bunx bun-docs-cli --entry-url spawn)
echo "Documentation: $DOC_URL"
```

### TypeScript Usage

```typescript
import { BUN_DOC_MAP, BUN_DOCS_BASE, buildDocUrl } from "mcp-bun-docs/lib";

// Build full URL
const term = "spawn";
const path = BUN_DOC_MAP[term];
if (path) {
  const url = buildDocUrl(path);
  console.log(`${term} → ${url}`);
}
```

### Node.js/Bun Script

```typescript
#!/usr/bin/env bun
import { BUN_DOCS_BASE, BUN_DOC_MAP } from "mcp-bun-docs/lib";

console.log(`Bun docs base: ${BUN_DOCS_BASE}`);
console.log(`Available terms: ${Object.keys(BUN_DOC_MAP).length}`);
```

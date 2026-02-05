# Exported Constants and Functions

This package exports Bun documentation constants and utilities for programmatic use.

## Installation

```bash
# Install as dependency
bun add mcp-bun-docs

# Or use bunx for one-off access
bunx bun-docs-cli --base-url
```

## Exported Constants

### Base URLs

```typescript
import { BUN_BASE_URL, BUN_DOCS_BASE } from "mcp-bun-docs/lib";

// BUN_BASE_URL: "https://bun.com"
// BUN_DOCS_BASE: "https://bun.com/docs"
```

### Documentation Map

```typescript
import { BUN_DOC_MAP } from "mcp-bun-docs/lib";

// BUN_DOC_MAP: Record<string, string>
// Maps curated terms to doc paths
// Example: { "spawn": "api/spawn", "Bun.serve": "api/http" }
```

### Version Info

```typescript
import { BUN_DOCS_VERSION, BUN_DOCS_MIN_VERSION } from "mcp-bun-docs/lib";

// BUN_DOCS_VERSION: "1.3.7"
// BUN_DOCS_MIN_VERSION: "1.3.6"
```

### Other Constants

```typescript
import {
  BUN_BLOG_URL,
  BUN_GUIDES_URL,
  BUN_REPO_URL,
  BUN_CHANGELOG_RSS,
  BUN_FEEDBACK_URL,
  BUN_REFERENCE_URL,
  // ... and more
} from "mcp-bun-docs/lib";
```

## Exported Functions

### Search Documentation

```typescript
import { searchBunDocs } from "mcp-bun-docs/lib";

const results = await searchBunDocs("Bun.serve", {
  apiReferenceOnly: true,
  prodSafe: true,
  bunVersion: "1.3.7",
  platform: "darwin"
});
```

### Get Doc Entry

```typescript
import { getDocEntry, buildDocUrl } from "mcp-bun-docs/lib";

const entry = getDocEntry("spawn");
if (entry) {
  console.log(entry.path); // "api/spawn"
  console.log(buildDocUrl(entry.path)); // "https://bun.com/docs/api/spawn"
}
```

### Get Cross-References

```typescript
import { getCrossReferences } from "mcp-bun-docs/lib";

const xrefs = getCrossReferences("spawn");
// Returns related doc entries with URLs
```

### Suggest Terms

```typescript
import { suggestDocTerms } from "mcp-bun-docs/lib";

const suggestions = suggestDocTerms("spa", 10);
// Returns matching terms sorted by weight
```

## Usage Examples

### Example 1: Get Doc URL for Term

```typescript
import { BUN_DOC_MAP, BUN_DOCS_BASE, buildDocUrl } from "mcp-bun-docs/lib";

function getDocUrl(term: string): string | null {
  const path = BUN_DOC_MAP[term];
  return path ? buildDocUrl(path) : null;
}

console.log(getDocUrl("spawn")); // "https://bun.com/docs/api/spawn"
```

### Example 2: List All Terms

```typescript
import { BUN_DOC_MAP } from "mcp-bun-docs/lib";

const terms = Object.keys(BUN_DOC_MAP).sort();
console.log(`Available terms: ${terms.length}`);
terms.forEach(term => console.log(`  ${term} -> ${BUN_DOC_MAP[term]}`));
```

### Example 3: Check if Term Exists

```typescript
import { BUN_DOC_MAP } from "mcp-bun-docs/lib";

function hasTerm(term: string): boolean {
  return term in BUN_DOC_MAP;
}

console.log(hasTerm("spawn")); // true
console.log(hasTerm("nonexistent")); // false
```

### Example 4: Filter Terms by Path

```typescript
import { BUN_DOC_MAP } from "mcp-bun-docs/lib";

const apiTerms = Object.entries(BUN_DOC_MAP)
  .filter(([term, path]) => path.startsWith("api/"))
  .map(([term]) => term);

console.log(`API terms: ${apiTerms.length}`);
```

## CLI Access

All constants are also accessible via the CLI:

```bash
# Get constants
bunx bun-docs-cli --base-url
bunx bun-docs-cli --docs-base
bunx bun-docs-cli --doc-map --term spawn

# Search
bunx bun-docs-cli --search "Bun.serve"

# Get entry
bunx bun-docs-cli --entry spawn
```

## Type Definitions

All exports are fully typed. Import types if needed:

```typescript
import type { SearchResult, DocEntry } from "mcp-bun-docs/lib";
```

## Notes

- `BUN_DOC_MAP` is derived from `BUN_DOC_ENTRIES` for backward compatibility
- All URLs use `BUN_BASE_URL` as the canonical base
- Constants are exported as ES modules (use `import`, not `require`)

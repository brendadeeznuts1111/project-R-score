# Ripgrep Search Cheatsheet: HTMLRewriter Documentation

Quick reference for searching the HTMLRewriter unified deployment documentation using `ripgrep` (or `rg`).

## Header Number Searches

### Find Specific Header Sections
```bash
# Find consolidated service integration section
rg "Header 6\.1\.1\.2\.2\.1\.0" docs/

# Find context construction sections
rg "Header 6\.1\.1\.2\.2\.1\.2" docs/

# Find enhancement pillars
rg "Header 6\.1\.1\.2\.2\.2\." docs/

# Find operational advantages
rg "Header 6\.1\.1\.2\.2\.3\." docs/
```

### Find All Headers in a Range
```bash
# All 6.1.1.2.2.x headers
rg "Header 6\.1\.1\.2\.2\." docs/

# All context construction subsections
rg "Header 6\.1\.1\.2\.2\.1\.2\." docs/
```

## Code Pattern Searches

### TypeScript Code Examples
```bash
# Find apiBaseUrl usage (in markdown code blocks)
rg "apiBaseUrl" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find UIContextRewriter usage
rg "UIContextRewriter" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find createUIContextFromRequest
rg "createUIContextFromRequest" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find featureFlags patterns
rg "featureFlags" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Count TypeScript code blocks (use single quotes + 4 backticks to match actual file format!)
rg '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md | wc -l
```

### HTML Code Examples
```bash
# Find data-feature attributes
rg "data-feature" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find data-access attributes
rg "data-access" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find data-server-timestamp
rg "data-server-timestamp" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find HYPERBUN_UI_CONTEXT injection
rg "HYPERBUN_UI_CONTEXT" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Count HTML code blocks (use single quotes + 4 backticks to match actual file format!)
rg '````html' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md | wc -l
```

### Bash/Shell Examples
```bash
# Find curl commands
rg "curl.*registry.html" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find verification commands
rg "Expected:" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

## Implementation File Searches

### Find Version References in Code
```bash
# Find all 6.1.1.2.2.x references in implementation
rg "6\.1\.1\.2\.2\." src/services/ui-context-rewriter.ts

# Find UIContextRewriter class usage
rg "UIContextRewriter" src/index.ts
rg "UIContextRewriter" scripts/dashboard-server.ts

# Find createUIContextFromRequest usage
rg "createUIContextFromRequest" src/
```

### Find Specific Implementation Patterns
```bash
# Find feature flag handlers
rg "data-feature" src/services/ui-context-rewriter.ts

# Find RBAC handlers
rg "data-access" src/services/ui-context-rewriter.ts

# Find timestamp handlers
rg "data-server-timestamp" src/services/ui-context-rewriter.ts
```

## Advanced Searches

### Multi-File Pattern Search
```bash
# Find all references to a specific version number across codebase
rg "6\.1\.1\.2\.2\.1\.2\.1" .

# Find all HTMLRewriter-related files
rg -l "HTMLRewriter" docs/ src/ scripts/

# Find all files mentioning UIContextRewriter
rg -l "UIContextRewriter" .
```

### Context-Aware Searches
```bash
# Find headers with context (3 lines before/after)
rg -C 3 "Header 6\.1\.1\.2\.2\.2\.1" docs/

# Find code examples with context (use single quotes + 4 backticks to match actual file format!)
rg -A 10 '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md | head -30
```

### Count Matches
```bash
# Count how many times a pattern appears
rg -c "Header 6\.1\.1\.2\.2\." docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Count TypeScript code blocks (use single quotes + 4 backticks to match actual file format!)
rg -c '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Count HTML code blocks (use single quotes + 4 backticks to match actual file format!)
rg -c '````html' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

## Quick Reference Aliases

Add these to your `~/.zshrc` or `~/.bashrc` for quick access:

```bash
# HTMLRewriter documentation shortcuts
alias rg-htmlrewriter-headers='rg "Header 6\.1\.1\.2\.2\." docs/'
alias rg-htmlrewriter-ts='rg '\''````typescript'\'' -A 20 docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md'
alias rg-htmlrewriter-html='rg '\''````html'\'' -A 20 docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md'
alias rg-htmlrewriter-impl='rg "6\.1\.1\.2\.2\." src/services/ui-context-rewriter.ts'
```

## Common Search Patterns

### Find Verification Steps
```bash
rg "Verification Steps:" -A 10 docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### Find Implementation Examples
```bash
rg "Implementation:" -A 15 docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### Find Code Snippets
```bash
rg "Context Construction Snippet" -A 10 docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

## Tips

1. **Escape Special Characters**: Use `\.` for literal dots in regex patterns
2. **Use Single Quotes + Match Exact Backticks**: When searching for markdown code block markers, use single quotes AND match the exact number of backticks in the file. The documentation uses **4 backticks** (````typescript`), not 3: `rg '````typescript'` instead of `rg "```typescript"` to avoid shell interpretation errors
3. **Use Context Flags**: `-A` (after), `-B` (before), `-C` (context) to see surrounding lines
4. **Case Insensitive**: Add `-i` flag for case-insensitive searches
5. **File Filtering**: Use `-g` to filter by glob pattern: `rg "pattern" -g "*.md"`
6. **Line Numbers**: Use `-n` to show line numbers in results

## Common Shell Errors & Fixes

### Error: `(eval):1: unmatched "`
**Cause**: Using double quotes with backticks causes shell interpretation issues  
**Fix**: Use single quotes instead AND match the actual number of backticks in the file (4 backticks, not 3):
```bash
# ❌ Wrong (causes error)
rg "```typescript" file.md

# ❌ Wrong (wrong number of backticks - won't match)
rg '```typescript' file.md

# ✅ Correct (matches actual file format: 4 backticks)
rg '````typescript' file.md
```

**Important**: The documentation file uses **4 backticks** (````typescript`) not 3, which is why the pattern must match exactly.

## Related Documentation

- [Main HTMLRewriter Documentation](./6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md)
- [Ripgrep General Cheatsheet](./logging/ripgrep-cheatsheet.md)

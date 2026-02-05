# Quick Start: Ripgrep Commands for HTMLRewriter Documentation

## ✅ Ready-to-Use Commands

Copy and paste these commands directly into your terminal:

### Find TypeScript Code Blocks
```bash
rg '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### Find HTML Code Blocks
```bash
rg '````html' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### Find Header Sections
```bash
rg "Header 6\.1\.1\.2\.2\." docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### Count Code Blocks
```bash
# Count TypeScript blocks
rg -c '````typescript' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Count HTML blocks
rg -c '````html' docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

### Find Specific Patterns
```bash
# Find apiBaseUrl usage
rg "apiBaseUrl" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find data-feature attributes
rg "data-feature" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md

# Find UIContextRewriter references
rg "UIContextRewriter" docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md
```

## Important Notes

1. **Use single quotes** (`'`) for patterns with backticks to prevent shell interpretation
2. **Use 4 backticks** (````) not 3 - the file uses 4 backticks for code blocks
3. **Escape dots** in regex patterns: `\.` for literal dots

## Common Errors & Fixes

### Error: `(eval):1: unmatched "`
**Cause**: Using double quotes with backticks  
**Fix**: Use single quotes instead
```bash
# ❌ Wrong
rg "```typescript" file.md

# ✅ Correct
rg '````typescript' file.md
```

### No Results Found
**Cause**: Wrong number of backticks  
**Fix**: Use 4 backticks (matches the file format)
```bash
# ❌ Wrong (3 backticks)
rg '```typescript' file.md

# ✅ Correct (4 backticks)
rg '````typescript' file.md
```

## Full Documentation

For comprehensive search patterns and advanced usage, see:
- [Ripgrep HTMLRewriter Cheatsheet](./RIPGREP-HTMLREWRITER-CHEATSHEET.md)
- [Ripgrep Fix Summary](./RIPGREP-FIX-SUMMARY.md)
- [HTMLRewriter Unified Deployment](./6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md)

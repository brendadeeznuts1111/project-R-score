# Ripgrep Search Cheatsheet: Bun Utils Documentation

Quick reference for searching `docs/bun/BUN-UTILS.md` using `ripgrep` (or `rg`).

## Important Note

**This file uses standard 3-backtick markdown format** (not 4 backticks like the HTMLRewriter doc).

## ✅ Ready-to-Use Commands

### Find TypeScript Code Blocks
```bash
# Standard 3-backtick format (use single quotes for backticks)
rg '```typescript' docs/bun/BUN-UTILS.md

# Count TypeScript blocks
rg -c '```typescript' docs/bun/BUN-UTILS.md
```

### Find Specific Bun APIs
```bash
# Find Bun.file() examples
rg "Bun\.file" docs/bun/BUN-UTILS.md

# Find Bun.CryptoHasher examples
rg "Bun\.CryptoHasher" docs/bun/BUN-UTILS.md

# Find Bun.nanoseconds() examples
rg "Bun\.nanoseconds" docs/bun/BUN-UTILS.md

# Find Bun.inspect() examples
rg "Bun\.inspect" docs/bun/BUN-UTILS.md

# Find Bun.Glob() examples
rg "Bun\.Glob" docs/bun/BUN-UTILS.md

# Find Bun.write() examples
rg "Bun\.write" docs/bun/BUN-UTILS.md
```

### Find Section Headers
```bash
# Find all main sections
rg "^## " docs/bun/BUN-UTILS.md

# Find subsections
rg "^### " docs/bun/BUN-UTILS.md

# Find specific section
rg "^## File Operations" docs/bun/BUN-UTILS.md
rg "^## Binary Data" docs/bun/BUN-UTILS.md
rg "^## Cryptographic Hashing" docs/bun/BUN-UTILS.md
```

### Find Code Patterns
```bash
# Find ArrayBuffer examples
rg "ArrayBuffer" docs/bun/BUN-UTILS.md

# Find TypedArray examples
rg "TypedArray|Uint8Array|Int32Array" docs/bun/BUN-UTILS.md

# Find DataView examples
rg "DataView" docs/bun/BUN-UTILS.md

# Find conversion patterns
rg "To ArrayBuffer|To TypedArray|To DataView" docs/bun/BUN-UTILS.md
```

### Find Migration Examples
```bash
# Find Node.js to Bun migration patterns
rg "❌ Node.js|✅ Bun-native" docs/bun/BUN-UTILS.md

# Find before/after examples
rg "Before.*Node.js|After.*Bun" docs/bun/BUN-UTILS.md
```

## Advanced Searches

### With Line Numbers
```bash
# Show line numbers for Bun.file references
rg -n "Bun\.file" docs/bun/BUN-UTILS.md

# Show line numbers for code blocks
rg -n '```typescript' docs/bun/BUN-UTILS.md
```

### Context-Aware Searches
```bash
# Show 5 lines after each Bun.file match
rg -A 5 "Bun\.file" docs/bun/BUN-UTILS.md

# Show 3 lines before and after
rg -C 3 "Bun\.CryptoHasher" docs/bun/BUN-UTILS.md
```

### Multi-File Search
```bash
# Search across all Bun docs
rg "Bun\.file" docs/bun/

# Search across entire docs directory
rg "Bun\.CryptoHasher" docs/
```

## Quick Reference

### Common Patterns
```bash
# Count all code blocks
rg -c '```' docs/bun/BUN-UTILS.md

# Find all API examples
rg "// ✅" docs/bun/BUN-UTILS.md

# Find anti-patterns (Node.js)
rg "// ❌" docs/bun/BUN-UTILS.md

# Find performance notes
rg "Performance|faster|benchmark" docs/bun/BUN-UTILS.md
```

## Key Differences from HTMLRewriter Doc

| Aspect | HTMLRewriter Doc | Bun Utils Doc |
|--------|------------------|---------------|
| Code Block Format | 4 backticks (````typescript`) | 3 backticks (```typescript`) |
| Search Pattern | `rg '````typescript'` | `rg '```typescript'` |
| Header Format | `Header 6.1.1.2.2.X.X:` | Standard markdown (`## Section`) |

## Tips

1. **Standard Format**: This file uses standard markdown (3 backticks), so commands are simpler
2. **Escape Dots**: Use `\.` for literal dots in regex: `Bun\.file`
3. **Case Sensitive**: Ripgrep is case-sensitive by default
4. **Use `-i` Flag**: For case-insensitive search: `rg -i "bun.file"`

## Related Documentation

- [Bun Utils Main Documentation](./BUN-UTILS.md)
- [Ripgrep HTMLRewriter Cheatsheet](../RIPGREP-HTMLREWRITER-CHEATSHEET.md)
- [Ripgrep Fix Summary](../RIPGREP-FIX-SUMMARY.md)

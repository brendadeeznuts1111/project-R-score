# Missing Items - Bun Documentation Constants Integration

## Summary

While the core integration is complete, there are **5 files** with hardcoded Bun URLs that should be migrated to use `BUN_DOCS_URLS` constants.

---

## Files Needing Migration

### 1. `src/mcp/tools/search-bun.ts`
**Line 118**: Hardcoded URL in string
```typescript
`  Full Reference: https://bun.com/reference\n\n` +
```
**Should use**: `BUN_DOCS_URLS.API_REFERENCE`

### 2. `src/mcp/tools/docs-integration.ts`
**Line 376**: Hardcoded URL in string
```typescript
`  Bun Reference: https://bun.com/reference\n` +
```
**Should use**: `BUN_DOCS_URLS.API_REFERENCE`

### 3. `src/api/examples.ts`
**Multiple lines**: Hardcoded URLs in `docsUrl` properties
- Line 27: `docsUrl: "https://bun.com/reference"`
- Line 54: `docsUrl: "https://bun.com/reference/globals/URLSearchParams"`
- Lines 84, 120, 145, 166, 197: `docsUrl: "https://bun.com/docs/runtime/bun-apis"`
- And more...

**Should use**: 
- `BUN_DOCS_URLS.API_REFERENCE`
- `BUN_DOCS_URLS.GLOBALS_REFERENCE + "/URLSearchParams"`
- `BUN_DOCS_URLS.RUNTIME_APIS`

### 4. `src/api/workspace-routes.ts`
**Line 572**: Hardcoded URL in object
```typescript
docs: "https://bun.com/docs",
```
**Should use**: `BUN_DOCS_URLS.DOCS`

### 5. `src/services/ui-policy-manager.ts`
**Line 243**: Hardcoded URL in error message
```typescript
`See https://bun.com/docs/runtime/yaml for Bun YAML API documentation.`
```
**Should use**: `BUN_DOCS_URLS.YAML_API`

---

## Migration Commands

### Option 1: Use Migration Script
```bash
# Preview changes for specific files
./scripts/migrate-bun-urls-to-constants.sh --dry-run --file src/mcp/tools/search-bun.ts
./scripts/migrate-bun-urls-to-constants.sh --dry-run --file src/mcp/tools/docs-integration.ts
./scripts/migrate-bun-urls-to-constants.sh --dry-run --file src/api/examples.ts
./scripts/migrate-bun-urls-to-constants.sh --dry-run --file src/api/workspace-routes.ts
./scripts/migrate-bun-urls-to-constants.sh --dry-run --file src/services/ui-policy-manager.ts

# Apply changes
./scripts/migrate-bun-urls-to-constants.sh --file src/mcp/tools/search-bun.ts
./scripts/migrate-bun-urls-to-constants.sh --file src/mcp/tools/docs-integration.ts
./scripts/migrate-bun-urls-to-constants.sh --file src/api/examples.ts
./scripts/migrate-bun-urls-to-constants.sh --file src/api/workspace-routes.ts
./scripts/migrate-bun-urls-to-constants.sh --file src/services/ui-policy-manager.ts
```

### Option 2: Manual Migration
1. Add import: `import { BUN_DOCS_URLS } from "../utils/rss-constants";`
2. Replace hardcoded URLs with constants
3. Run typecheck: `bun run typecheck`

---

## Status

- ✅ **Core Integration**: Complete
- ⚠️ **Remaining Migrations**: 5 files need updates
- ✅ **Migration Script**: Ready to use
- ✅ **Documentation**: Complete

---

## Next Steps

1. Run migration script on the 5 files listed above
2. Verify with: `rg "https://bun\.com/(docs|reference)" src/ --type ts | rg -v "BUN_DOCS_URLS|rss-constants|@see"`
3. Run typecheck: `bun run typecheck`
4. Update this document when complete

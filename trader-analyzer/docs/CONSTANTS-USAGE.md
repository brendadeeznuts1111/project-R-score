# Constants Usage Guide

**Last Updated**: 2025-01-15  
**Status**: ✅ **Production Ready**

---

## Overview

This codebase uses centralized constants for URLs, paths, and configuration values to ensure **discoverability, maintainability, and pattern-matchability** via ripgrep.

---

## Bun Documentation URLs

### Constant: `BUN_DOCS_URLS`

**Location**: `src/utils/rss-constants.ts`

**Usage**:
```typescript
import { BUN_DOCS_URLS } from "../utils/rss-constants";

// Use the constant instead of hardcoded URLs
const installConfigUrl = BUN_DOCS_URLS.PM_CLI_INSTALL_CONFIG;
// Returns: "https://bun.com/docs/pm/cli/install#configuration"
```

### Available Constants

- `BUN_DOCS_URLS.PM_CLI_INSTALL_CONFIG` - Bun Package Manager CLI install configuration
- `BUN_DOCS_URLS.API_REFERENCE` - Bun API Reference
- `BUN_DOCS_URLS.GLOBALS_REFERENCE` - Bun Globals Reference
- `BUN_DOCS_URLS.RUNTIME_APIS` - Bun Runtime APIs
- `BUN_DOCS_URLS.DOCS` - Bun Documentation
- `BUN_DOCS_URLS.BLOG` - Bun Blog
- `BUN_DOCS_URLS.GITHUB` - Bun GitHub Repository
- `BUN_DOCS_URLS.TEST_RUNNER` - Bun Test Runner
- `BUN_DOCS_URLS.WORKSPACE_CONFIG` - Bun Workspace Configuration
- `BUN_DOCS_URLS.BENCHMARKING` - Bun Performance Benchmarking
- `BUN_DOCS_URLS.BUILD_COMPILE` - Bun Build & Compile
- `BUN_DOCS_URLS.FETCH_API` - Bun Fetch API Documentation
- `BUN_DOCS_URLS.FETCH_TIMEOUTS` - Bun Fetch Timeouts
- `BUN_DOCS_URLS.DEBUGGER` - Bun Debugger Documentation
- `BUN_DOCS_URLS.SECURITY_SCANNER` - Bun Security Scanner
- `BUN_DOCS_URLS.SECRETS` - Bun Secrets Management
- `BUN_DOCS_URLS.CSRF` - Bun CSRF Protection

---

## Migration

### Finding Hardcoded URLs

```bash
# Find all hardcoded Bun URLs
rg "https://bun\.com/(docs|reference)" src/ | rg -v "BUN_DOCS_URLS"

# Find specific documentation section
rg "PM_CLI_INSTALL_CONFIG" src/

# Find uses of the constant
rg "BUN_DOCS_URLS\." src/
```

### Migration Script

Use the automated migration script:

```bash
# Dry run (see what would change)
./scripts/migrate-bun-urls-to-constants.sh --dry-run

# Apply changes
./scripts/migrate-bun-urls-to-constants.sh

# Process specific file
./scripts/migrate-bun-urls-to-constants.sh --file src/some-file.ts
```

### Manual Migration

1. **Add import**:
   ```typescript
   import { BUN_DOCS_URLS } from "../utils/rss-constants";
   ```

2. **Replace hardcoded URL**:
   ```typescript
   // BEFORE
   const url = "https://bun.com/docs/pm/cli/install#configuration";
   
   // AFTER
   const url = BUN_DOCS_URLS.PM_CLI_INSTALL_CONFIG;
   ```

---

## Ripgrep Pattern Discovery

The constants file includes a ripgrep pattern comment for easy discovery:

```bash
# Find all constant definitions
rg "RSS_FEED_URLS|RSS_USER_AGENTS|RSS_DEFAULTS|RSS_REGEX_PATTERNS|RSS_ENV|RSS_INTERNAL|RSS_CATEGORIES|RSS_GITHUB_LINKS|RSS_API_PATHS|RSS_TEAM_PATHS|RSS_APPS_PATHS|RSS_EXAMPLES_PATHS|RSS_COMMANDS_PATHS|RSS_DOCS_API_PATHS|RSS_BUN_VERSION_PATHS|RSS_BENCHMARK_PATHS|RSS_DASHBOARD_PATHS|ROUTING_REGISTRY_NAMES|TELEGRAM_MINIAPP_URLS|DEEP_LINK_DEFAULTS|RSS_REGISTRY_CONFIG|TEST_CONFIG|WORKSPACE_PATHS|TEST_PATTERNS|SHADOW_GRAPH_PATHS|ROOT_DIR_PATHS|DATABASE_PATHS|BUN_DOCS_URLS|rss-constants" src/utils/rss-constants.ts
```

---

## Best Practices

1. **Always use constants** - Never hardcode URLs or paths
2. **Import from centralized location** - Use `src/utils/rss-constants.ts`
3. **Type safety** - Constants are typed with TypeScript
4. **Discoverability** - Use ripgrep to find all usages
5. **Maintainability** - Update URLs in one place

---

## Related Documentation

- [Constants Reference](./CONSTANTS-REFERENCE.md) - Complete constants documentation
- [RSS Integration](./BUN-RSS-INTEGRATION.md) - RSS constants and integration
- [Bun PM Documentation](https://bun.com/docs/pm/cli/install#configuration) - Bun Package Manager docs

---

## Validation

```bash
# Check export exists
rg "export.*BUN_DOCS_URLS" src/utils/rss-constants.ts

# Check TypeScript can resolve it
bun run typecheck

# Find files that should use it but don't
rg "https://bun\.com/docs" src/ | rg -v "BUN_DOCS_URLS"
```

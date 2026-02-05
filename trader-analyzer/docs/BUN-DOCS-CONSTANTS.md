# Bun Documentation Constants

**Last Updated**: 2025-01-15  
**Status**: ✅ **Production Ready**

---

## Overview

All Bun documentation URLs are centralized in `src/utils/rss-constants.ts` under the `BUN_DOCS_URLS` constant. This ensures **discoverability, maintainability, and pattern-matchability** via ripgrep.

---

## Usage

```typescript
import { BUN_DOCS_URLS } from "../utils/rss-constants";

// Use constants instead of hardcoded URLs
const installConfigUrl = BUN_DOCS_URLS.PM_CLI_INSTALL_CONFIG;
const apiReference = BUN_DOCS_URLS.API_REFERENCE;
```

---

## Available Constants

### Package Manager
- `BUN_DOCS_URLS.PM_CLI_INSTALL_CONFIG` - Bun Package Manager CLI install configuration

### Core Documentation
- `BUN_DOCS_URLS.API_REFERENCE` - Bun API Reference (`https://bun.com/reference`)
- `BUN_DOCS_URLS.GLOBALS_REFERENCE` - Bun Globals Reference (`https://bun.com/reference/globals`)
- `BUN_DOCS_URLS.DOCS` - Bun Documentation (`https://bun.com/docs`)
- `BUN_DOCS_URLS.BLOG` - Bun Blog (`https://bun.com/blog`)
- `BUN_DOCS_URLS.GITHUB` - Bun GitHub Repository (`https://github.com/oven-sh/bun`)

### Runtime APIs
- `BUN_DOCS_URLS.RUNTIME_APIS` - Bun Runtime APIs (`https://bun.com/docs/runtime/bun-apis`)
- `BUN_DOCS_URLS.TEST_RUNNER` - Bun Test Runner (`https://bun.com/docs/test/runner`)
- `BUN_DOCS_URLS.WORKSPACE_CONFIG` - Bun Workspace Configuration (`https://bun.com/docs/install/workspaces`)
- `BUN_DOCS_URLS.BENCHMARKING` - Bun Performance Benchmarking (`https://bun.com/docs/benchmarks`)
- `BUN_DOCS_URLS.BUILD_COMPILE` - Bun Build & Compile (`https://bun.com/docs/bundler`)

### Networking
- `BUN_DOCS_URLS.FETCH_API` - Bun Fetch API Documentation (`https://bun.com/docs/runtime/networking/fetch`)
- `BUN_DOCS_URLS.FETCH_TIMEOUTS` - Bun Fetch Timeouts (`https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout`)
- `BUN_DOCS_URLS.WEBSOCKET_CONTEXTUAL_DATA` - Bun WebSocket Contextual Data (`https://bun.com/docs/runtime/http/websockets#contextual-data`)

### Shell
- `BUN_DOCS_URLS.SHELL_BUILTIN_COMMANDS` - Bun Shell Builtin Commands (`https://bun.com/docs/runtime/shell#builtin-commands`)
- `BUN_DOCS_URLS.SHELL_FILE_LOADER` - Bun Shell File Loader (`https://bun.com/docs/runtime/shell#sh-file-loader`)
- `BUN_DOCS_URLS.SHELL_ENV_VARS` - Bun Shell Environment Variables (`https://bun.com/docs/runtime/shell#environment-variables`)
- `BUN_DOCS_URLS.SHELL_UTILITIES` - Bun Shell Utilities (`https://bun.com/docs/runtime/shell#utilities`)

### Development & Debugging
- `BUN_DOCS_URLS.DEBUGGER` - Bun Debugger Documentation (`https://bun.com/docs/runtime/debugger`)
- `BUN_DOCS_URLS.YAML_API` - Bun YAML API (`https://bun.com/docs/runtime/yaml`)

### Security
- `BUN_DOCS_URLS.SECURITY_SCANNER` - Bun Security Scanner (`https://bun.com/docs/runtime/security-scanner`)
- `BUN_DOCS_URLS.SECRETS` - Bun Secrets Management (`https://bun.com/docs/runtime/secrets`)
- `BUN_DOCS_URLS.CSRF` - Bun CSRF Protection (`https://bun.com/docs/runtime/csrf`)

---

## Migration

### Finding Hardcoded URLs

```bash
# Find all hardcoded Bun URLs
rg "https://bun\.com/(docs|reference)" src/ | rg -v "BUN_DOCS_URLS"

# Find uses of the constant
rg "BUN_DOCS_URLS\." src/

# Find specific documentation section
rg "PM_CLI_INSTALL_CONFIG" src/
```

### Automated Migration

Use the migration script:

```bash
# Dry run (preview changes)
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

The constants file includes a ripgrep pattern for easy discovery:

```bash
# Find all constant definitions
rg "RSS_FEED_URLS|RSS_USER_AGENTS|RSS_DEFAULTS|RSS_REGEX_PATTERNS|RSS_ENV|RSS_INTERNAL|RSS_CATEGORIES|RSS_GITHUB_LINKS|RSS_API_PATHS|RSS_TEAM_PATHS|RSS_APPS_PATHS|RSS_EXAMPLES_PATHS|RSS_COMMANDS_PATHS|RSS_DOCS_API_PATHS|RSS_BUN_VERSION_PATHS|RSS_BENCHMARK_PATHS|RSS_DASHBOARD_PATHS|ROUTING_REGISTRY_NAMES|TELEGRAM_MINIAPP_URLS|DEEP_LINK_DEFAULTS|RSS_REGISTRY_CONFIG|TEST_CONFIG|WORKSPACE_PATHS|TEST_PATTERNS|SHADOW_GRAPH_PATHS|ROOT_DIR_PATHS|DATABASE_PATHS|BUN_DOCS_URLS|rss-constants" src/utils/rss-constants.ts
```

---

## Validation

```bash
# Check export exists
rg "export.*BUN_DOCS_URLS" src/utils/rss-constants.ts

# Check TypeScript can resolve it
bun run typecheck

# Find files that should use it but don't
rg "https://bun\.com/docs" src/ --type ts | rg -v "BUN_DOCS_URLS"
```

---

## Related Documentation

- [Constants Usage Guide](./CONSTANTS-USAGE.md) - Complete constants guide
- [Constants Reference](./CONSTANTS-REFERENCE.md) - All constants documentation
- [RSS Integration](./BUN-RSS-INTEGRATION.md) - RSS constants and integration

---

## Best Practices

1. **Always use constants** - Never hardcode URLs or paths
2. **Import from centralized location** - Use `src/utils/rss-constants.ts`
3. **Type safety** - Constants are typed with TypeScript
4. **Discoverability** - Use ripgrep to find all usages
5. **Maintainability** - Update URLs in one place

---

## Adding New URLs

When adding new Bun documentation URLs:

1. Add to `BUN_DOCS_URLS` in `src/utils/rss-constants.ts`
2. Add JSDoc comment describing the URL
3. Update this documentation
4. Run migration script to update existing code
5. Update ripgrep pattern if needed

---

**Status**: ✅ **Production Ready** - All Bun documentation URLs are centralized and discoverable via ripgrep patterns.

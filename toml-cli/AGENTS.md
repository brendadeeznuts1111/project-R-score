# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Project-Specific Patterns

### Bun Native API Requirements (Critical)
- **NEVER use axios, node-fetch, form-data, or dotenv** - ESLint will error. Use Bun's native equivalents:
  - `fetch()` instead of axios/node-fetch
  - `FormData` API instead of form-data package
  - Bun automatically loads `.env` files - no dotenv import needed
- **TOML handling**: Bun has `TOML.parse()` but NOT `TOML.stringify()`. The [`ConfigManager.save()`](src/config-manager.ts:280) method manually builds TOML strings line-by-line - follow this pattern for TOML serialization.

### Feature Flag System
- Features are **compile-time flags** using Bun's `--feature` flag, not runtime environment variables
- Example: `bun build --feature=ENTERPRISE --feature=DEBUG` enables those code paths
- Check features with `feature('FLAG_NAME')` from `bun` import
- Available features: DEBUG, ENTERPRISE, PREMIUM_SECRETS, R2_STORAGE, DEVELOPMENT, MOCK_API

### Build Commands (Non-Standard)
- `bun run build:enterprise` - Production build with all enterprise features
- `bun run build:dev` - Development build with DEBUG and MOCK_API features
- `bun run ci:bundle` - Full bundle analysis pipeline (analyze + compare)
- `bun run devices:dashboard` - Virtual device monitoring dashboard
- `bun run system:full-demo` - Runs both device integration and API demos

### Testing Requirements
- **Test timeout is 5 seconds** (configured in [bunfig.toml](bunfig.toml:9))
- Test files MUST be in `tests/` directory (enforced by bunfig.toml)
- Run single test: `bun test tests/unit/config-manager.test.ts`
- Run with features: `bun test --feature=MOCK_API tests/`

### Path Aliases
- `@/*` → `src/*`
- `@config/*` → `config/*`
- `@types/*` → `types/*`
- `@utils/*` → `utils/*`

### Code Style Enforcement
- **Explicit return types required** for all TypeScript functions (@typescript-eslint/explicit-function-return-types: warn)
- **Console logs allowed but warned** (no-console: warn)
- Unused variables must be prefixed with underscore (`_unusedVar`)
- No explicit any without warning (@typescript-eslint/no-explicit-any: warn)

### R2 Storage Pattern
- R2 credentials MUST be environment variables with `EMPIRE_` prefix (e.g., `EMPIRE_R2_ACCOUNT_ID`)
- Public URL construction requires `R2_PUBLIC_URL` to be set
- Uploads use `configs/{environment}/config.toml` key structure

### Virtual Device System
- Device monitoring via `agent-container/` directory
- Reports generated in `reports/` with timestamped JSON files
- Integration tests use mock APIs with `--feature=MOCK_API` flag
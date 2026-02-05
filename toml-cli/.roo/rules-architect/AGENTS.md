# AGENTS.md - Architect Mode

This file provides guidance to agents when designing or architecting solutions in this repository.

## Non-Obvious Architectural Constraints

### Compile-Time Feature Flag Architecture
- **Features are NOT runtime toggles** - they enable code splitting and dead code elimination at build time
- **Feature flags must be checked with `feature('FLAG')`** from `bun` import, not `process.env`
- **Available features**: DEBUG, ENTERPRISE, PREMIUM_SECRETS, R2_STORAGE, DEVELOPMENT, MOCK_API
- **Build command pattern**: `bun build --feature=FLAG1 --feature=FLAG2 src/config-manager.ts`
- **Architectural impact**: Different builds have completely different code paths - test each build separately

### Bun Runtime Constraints
- **Bun has TOML.parse() but NOT TOML.stringify()** - this is by design, not an oversight
- **No axios/node-fetch/dotenv** - Bun provides native alternatives that must be used
- **S3Client is the R2 client** - Bun's S3Client works with Cloudflare R2 (not well documented)
- **Test runner built-in** - no Jest/Vitest needed, but test timeout is 5 seconds ([bunfig.toml:9](bunfig.toml:9))
- **Path aliases in tsconfig** - but scripts/ directory is excluded, requiring relative imports

### R2 Storage Architecture
- **Primary storage backend** - Cloudflare R2 replaces traditional databases
- **Key structure**: `configs/{environment}/config.toml` (environment = dev|staging|prod)
- **Environment variables MUST use EMPIRE_ prefix** - enforced but not validated at runtime
- **Public URL generation** - requires R2_PUBLIC_URL to be set for CDN access
- **No transaction support** - R2 is object storage, not a database
- **Eventual consistency** - R2 operations may not be immediately visible globally

### Virtual Device System Architecture
- **Agent-container pattern** - devices simulated in `agent-container/` directory
- **Separate monitoring dashboard** - runs independently on different port
- **Timestamped JSON reports** - stored in `reports/` directory
- **Mock API feature** - enables testing without real device hardware
- **Hub integration** - devices report to central hub for aggregation

### Bundle Analysis System
- **Custom analyzer in src/analyzers/** - not using webpack-bundle-analyzer
- **Performance matrix tracking** - MASTER_PERF metrics with color formatting
- **Compliance checking** - bundle size guardrails and thresholds
- **Export capabilities** - JSON, plain text, and S3 export formats
- **CI integration** - `bun run ci:bundle` runs full analysis pipeline

### Scoping Matrix Architecture
- **Complex permission system** - documented in [docs/DUOPLUS_SCOPING_MATRIX.md](docs/DUOPLUS_SCOPING_MATRIX.md)
- **Runtime loading** - matrix loaded from config but validated at build time
- **Multi-dimensional access control** - scope, environment, and feature based
- **Integration points** - affects registry, API routes, and device access

### Monorepo Structure (Without Lerna/Rush)
- **Manual package organization** - no automated workspace management
- **Root-level directories act as packages** - `src/`, `integrations/`, `types/`, etc.
- **Shared types in types/** - central type definitions across packages
- **Config in config/** - shared configuration files
- **Utils in utils/** - shared utility functions
- **Scripts in scripts/** - build and development scripts (excluded from compilation)

### Testing Architecture
- **Bun test runner only** - no Jest, Mocha, or Vitest
- **Test files MUST be in tests/** - enforced by [bunfig.toml:8](bunfig.toml:8)
- **Feature flag support in tests** - pass `--feature=FLAG` to test command
- **Mock API feature** - enables stub implementations for integration tests
- **5-second timeout** - may be insufficient for R2 operations in slow networks

### Security Architecture
- **API keys generated with prefix** - `generateApiKey("dp")` creates `dp_...` keys
- **SHA256 hashing for config diffing** - used in sync command to detect changes
- **No encryption at rest** - R2 storage assumes bucket-level encryption
- **Environment isolation** - configs stored in `configs/{env}/` paths
- **No secret management** - API keys stored in config files (consider PREMIUM_SECRETS feature)

### Performance Considerations
- **Bun's native APIs are faster** - fetch, TOML.parse, S3Client all native
- **Bundle size matters** - custom analyzer tracks performance impact
- **R2 operations are network-bound** - consider caching for frequently accessed configs
- **Virtual devices add overhead** - simulation mode for testing, not production
- **Feature flags enable dead code elimination** - smaller bundles when flags not enabled
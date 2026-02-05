# AGENTS.md - Ask Mode

This file provides guidance to agents when answering questions about this repository.

## Project Context and Documentation

### Counterintuitive Code Organization
- **`src/` contains the main CLI tool** (`config-manager.ts`), not just library code
- **`scripts/` directory is EXCLUDED from TypeScript compilation** ([tsconfig.json:29](tsconfig.json:29)) - scripts must use relative imports, not path aliases
- **`tests/` and `test/` both exist** - `tests/` is for Bun test runner (enforced by [bunfig.toml:8](bunfig.toml:8)), `test/` is legacy and should not be used
- **`agent-container/` is not a Docker container** - it's the virtual device monitoring system

### Documentation Structure
- **Primary docs in `docs/` directory** - start with [docs/START_HERE.md](docs/START_HERE.md) for orientation
- **Feature flags documented in multiple files** - see [docs/FEATURE_FLAGS_COMPLETE.md](docs/FEATURE_FLAGS_COMPLETE.md) for master list
- **Bundle analysis docs are critical** - [docs/BUNDLE_ANALYSIS_GUIDE.md](docs/BUNDLE_ANALYSIS_GUIDE.md) explains the custom analyzer
- **Scoping matrix documentation** - [docs/DUOPLUS_SCOPING_MATRIX.md](docs/DUOPLUS_SCOPING_MATRIX.md) explains the complex permission system

### Key Architectural Decisions
- **Monorepo structure without Lerna/Rush** - manually organized packages in root directories
- **Bun chosen over Node.js** - for native TOML parsing, built-in test runner, and performance
- **Compile-time feature flags** - enable code splitting and dead code elimination
- **R2 storage as primary backend** - Cloudflare R2 used instead of traditional databases
- **Virtual device simulation** - complex system for testing without physical hardware

### Hidden Dependencies
- **Bundle analyzer depends on build output** - must run `bun run build:enterprise` before analysis
- **Device dashboard requires separate process** - runs independently of main CLI
- **Registry system requires feature flags** - PRIVATE_REGISTRY feature must be enabled at build time
- **Scoping matrix loaded at runtime** - but validated at build time via scripts

### Misleading Naming Conventions
- **`config-manager.ts`** is both a library AND a CLI tool (has shebang and parseArgs)
- **`PrivateRegistryClient`** is not actually private - it's the main registry implementation
- **`BundleMatrix`** is not a matrix data structure - it's a performance metrics analyzer
- **`virtual-device`** files contain real device simulation logic, not just test doubles

### Environment Variable Requirements
- **All R2 credentials MUST use `EMPIRE_` prefix** - this is enforced but not well documented
- **Feature flags are compile-time only** - `process.env` checks for features won't work
- **Bun version requirement** - `>=1.3.6` specified in package.json but not enforced at runtime
- **TypeScript target is ES2020** - but uses ES2023 features in some files (inconsistency)

### Testing Gotchas
- **Test files must be in `tests/`** - not `test/` (subtle but critical difference)
- **Feature flags in tests** - must pass `--feature=FLAG` to `bun test` command
- **Mock API feature** - enables stub implementations that bypass real network calls
- **Timeout is 5 seconds** - may be too short for R2 operations in slow networks

### Build System Quirks
- **`bun build` with `--feature` flags** - features are compile-time, not runtime
- **Scripts excluded from build** - anything in `scripts/` won't be type-checked with main code
- **Hot reload disabled** - [bunfig.toml:12](bunfig.toml:12) sets `hot = false` for dev mode
- **Declaration maps enabled** - but no publish step configured (unused feature)
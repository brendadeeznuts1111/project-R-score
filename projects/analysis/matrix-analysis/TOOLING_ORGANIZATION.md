# Tooling Organization Guide

Optimized categorization of CLI commands by workflow and dependency, with refactoring progress.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Performance & Analysis](#performance--analysis)
- [Documentation](#documentation)
- [Deployment & Operations](#deployment--operations)
- [Security & Compliance](#security--compliance)
- [Enterprise Management](#enterprise-management)
- [Infrastructure](#infrastructure)
- [Utilities](#utilities)
- [Command Patterns & Refactoring](#command-patterns--refactoring)
- [Command Map](#command-map)

---

## Quick Start

### First Time Setup
```bash
bun install              # Install dependencies
bun run typecheck        # Verify TypeScript
bun run lint             # Check code style
```

### Daily Development
```bash
bun run dev              # Start development server
bun run test:unified     # Run tests (new unified runner)
bun run matrix           # See analysis output
```

---

## Development Workflow

### Code Quality
Enhanced tables with metadata:

| Command | Aliases | Purpose | When to Use | Related |
|---------|---------|---------|-------------|---------|
| `lint` | - | Check code style with Biome | Before commits, CI | `lint:fix`, `format` |
| `lint:fix` | - | Auto-fix lint issues | When lint fails | `lint`, `format` |
| `format` | - | Format all code | After lint:fix, before PR | `lint`, `lint:fix` |
| `typecheck` | `tsc` | TypeScript type checking | CI, before PR, after changes | `lint` |

**Pattern**: All code quality commands are zero-argument, read-only operations. They can be chained: `bun run lint && bun run typecheck`.

### Build Exploration
**NEW**: Use `bun run build` for unified build management.

| Command | Purpose | Status |
|---------|---------|--------|
| `build` | Unified build command (recommended) | ✅ **Active** |
| `build files types` | Explore file content types | Legacy |
| `build files practical` | Practical file building | Legacy |
| `build content-types` | Content type handling | Legacy |
| `build outdir <dir>` | Output directory config | Legacy |
| `build publicpath <path>` | Public path configuration | Legacy |
| `build naming <pattern>` | Build naming patterns | Legacy |
| `build env [--prefix]` | Environment variables in build | Legacy |
| `build sourcemap [--minify]` | Source maps + minification | Legacy |
| `build memory [--simple]` | Memory bundle building | Legacy |
| `build preview` | Preview CWD root behavior | Legacy |
| `build demo <name>` | Run build demo (bunx-demo, bun-update-demo) | Legacy |

**Migration**: Use `build <target> [options]` instead of individual `build:*` commands.
```bash
# Old
bun run build:files:types
bun run build:env-prefix

# New
bun run build files types
bun run build env --prefix
```

### Profile Management
| Command | Scope | Purpose | Mutates | Export |
|---------|-------|---------|---------|--------|
| `profiles` | FW | Main profile CLI | Yes | `.factory-wager/` |
| `profiles:list` | FW | List all profiles | No | Terminal |
| `profiles:use <name>` | FW | Switch to profile | Yes | Env vars |
| `profiles:switch` | FW | Interactive switch | Yes | Env vars |
| `profiles:status` | FW | Current status | No | Terminal |
| `profiles:init` | FW | First-time setup | Yes | Config files |
| `profiles:secrets:*` | FW | Secret management | Yes | Encrypted storage |
| `secrets:v5.7:*` | FW | v5.7 compatibility | Yes | Backwards compat |

**Alias**: `fw` → `factory-wager`

---

## Testing Strategy

### Quick Commands (Unified)
**NEW**: Use `bun run test:unified` for all testing needs.

| Command | Purpose | Status |
|---------|---------|--------|
| `test:unified` | Unified test runner (recommended) | ✅ **Active** |
| `test` | All tests (legacy) | Legacy (deprecated) |
| `test:smoke` | Smoke tests | Legacy |
| `test:unit` | Unit tests | Legacy |
| `test:integration` | Integration tests | Legacy |
| `test:e2e` | End-to-end tests | Legacy |
| `test:performance` | Performance tests | Legacy |
| `test:security` | Security tests | Legacy |
| `test:network-group` | Network tests | Legacy |
| `test:ci` | CI-optimized tests | Legacy |
| `test:fast` | Fast tests only | Legacy |
| `test:critical` | Critical path | Legacy |
| `test:coverage` | With coverage report | Legacy |
| `test:preload` | With preload scripts | Legacy |
| `test:env` | With test env | Legacy |
| `test:tz` | UTC timezone | Legacy |
| `test:verbose` | Verbose output | Legacy |
| `test:dry-run` | Dry run | Legacy |
| `test:inheritance` | Test inheritance | Legacy |

**Migration**: Use `bun run test:unified run <group>` instead of individual `test:*` commands.
```bash
# Old
bun run test:smoke
bun run test:unit --coverage

# New
bun run test:unified run smoke
bun run test:unified run unit -- --coverage
```

### Unified Test Runner Features

The new `test:unified` command provides:
- **Single entry point** for all testing needs
- **Group management**: `run <group>` (smoke, unit, integration, e2e, performance, security, network, ci, all)
- **Profile support**: `--profile=<name>` (benchmark, test-performance, test-comprehensive, integration)
- **Process management**: `process <action>` (kill, list, monitor, graceful, kill-all)
- **CI mode**: `ci` (runs smoke, unit, integration with coverage)
- **Organize**: `organize` (runs test-organizer)
- **Pass-through**: Use `--` to pass any `bun test` option

### Test Profiles
| Profile | Purpose | Command |
|---------|---------|---------|
| `default` | Standard test execution | `test:unified run <group>` |
| `benchmark` | Performance-optimized | `test:unified run --profile=benchmark` |
| `test-performance` | Performance tests | `test:unified run --profile=test-performance` |
| `test-comprehensive` | Full comprehensive suite | `test:unified run --profile=test-comprehensive` |
| `integration` | Integration-focused | `test:unified run --profile=integration` |

### Organized Testing (Legacy)
| Command | Input | Output | Features |
|---------|-------|--------|----------|
| `test:organizer` | Test files | Organized groups | Auto-grouping |
| `test:groups` | - | Group list | `--list` |
| `test:runner` | Groups | Executed tests | Smart selection |
| `test:runner:all` | All groups | Full run | Via runner |
| `test:all-groups` | All groups | Full run | Direct |

### Specialized Testing (Legacy)
| Command | Focus | Environment | Preload |
|---------|-------|-------------|---------|
| `test:process:*` | Process mgmt | Various | Varies |
| `spawn:monitor` | Spawn validation | Monitor mode | No |
| `spawn:check` | Spawn check | Check mode | No |
| `spawn:bench` | Spawn benchmark | Benchmark mode | No |

**Pattern**: Test commands follow `test[:<group>][:<action>]` pattern. Groups: `smoke`, `unit`, `integration`, `e2e`, `performance`, `security`, `network`, `ci`. Actions: `runner`, `organizer`, `profile`, `process`, `spawn`.

---

## Performance & Analysis

### Matrix Analysis (Core Feature)
| Command | Columns | Profile | Output | Watch |
|---------|---------|---------|--------|-------|
| `matrix` | 197 | Default | Detailed table | No |
| `matrix:profile` | 197 | Custom | Profile-specific | No |
| `matrix:preview` | ~50 | Default | Simplified | No |
| `matrix:validate` | - | Default | Pass/fail | No |
| `matrix:rss` | - | Default | RSS XML | No |
| `matrix:links:check` | - | Default | Link report | No |
| `matrix:links:quick` | - | Default | Quick report | No |
| `matrix:fm:*` | - | Default | Frontmatter ops | No |
| `matrix:openclaw:*` | - | Default | Infra status | `:watch` variant |

**Pattern**: Matrix commands are namespaced under `matrix:` with subcommands for specific features.

### Benchmarking
| Command | Target | Metric | Compare |
|---------|--------|--------|---------|
| `benchmark` | ARM64 | System perf | Baseline |
| `bench:spawn` | Process spawn | Latency | Previous |
| `bench:hash` | Hash funcs | Throughput | Algorithms |
| `bench:all` | Everything | Comprehensive | All |
| `bench:report` | All | HTML report | Historical |
| `bench:json` | All | JSON output | Machine-readable |
| `buffer:simd` | SIMD ops | Speedup | Non-SIMD |
| `buffer:simd:benchmark` | SIMD | Detailed | Variants |
| `ab:parse:bench` | A/B parsing | Parse speed | Variants |

### Performance Suites
| Command | Alias | Scope | Output |
|---------|-------|-------|--------|
| `performance:suite` | `perf` | Full suite | Report |
| `audit:full` | - | Full audit | Audit log |
| `enhanced:perf` | `perf:enhanced` | Enhanced metrics | Enhanced report |
| `audit:enhanced` | - | Enhanced audit | Enhanced audit |

### Code Analysis
| Command | Analyzes | Output | Use With |
|---------|----------|--------|----------|
| `analyze` | General | Summary | Any project |
| `analyze:scan` | Code scan | Scan report | `analyze` |
| `analyze:types` | Type usage | Type stats | Type-heavy code |
| `analyze:props` | Properties | Prop analysis | React/Vue |
| `analyze:deps` | Dependencies | Dep graph | Dependency audit |
| `analyze:complexity` | Complexity | Metrics | Refactoring |
| `analyze:classes` | Classes | Class map | OOP code |
| `analyze:strength` | Code strength | Strength score | Code review |
| `analyze:rename` | Rename suggestions | Refactor plan | Before rename |
| `analyze:polish` | Polish opportunities | Polish list | Pre-release |
| `analyze:coverage` | Coverage gaps | Gap report | Test planning |
| `analyze:xref` | Cross-refs | Xref map | Documentation |
| `analyze:reality` | With reality | Reality-aware | Deployment |

**Pattern**: Analysis commands follow `analyze[:<aspect>]` pattern. Aspects: `scan`, `types`, `props`, `deps`, `complexity`, `classes`, `strength`, `rename`, `polish`, `coverage`, `xref`, `reality`.

---

## Documentation

### Documentation Generation
| Command | Format | Input | Output | Use Case |
|---------|--------|-------|--------|----------|
| `docs:search` | Index | Source code | Search index | Docs search |
| `docs:entry` | List | Entry points | Entry list | API docs |
| `docs:link` | Graph | Links | Link map | Link checking |
| `docs:terms` | Glossary | Terms | Glossary | Documentation |
| `docs:globals` | Ref | Globals | Reference | Global API |
| `docs:xrefs` | Graph | Xrefs | Cross-refs | Navigation |
| `docs:reference` | Full | All | Full reference | Complete docs |
| `docs:latest` | Changelog | Commits | Latest changes | Release notes |
| `docs:version` | Meta | Package | Version info | Version display |

### Specialized Docs
| Command | Domain | Purpose |
|---------|--------|---------|
| `docs:shop` | E-commerce | Shop documentation |
| `docs:blog` | Blogging | Blog docs |
| `docs:guides` | Tutorials | How-to guides |
| `docs:rss` | RSS | RSS documentation |
| `docs:repo` | Repository | Repo-specific docs |
| `docs:deps` | Dependencies | Dependency docs |
| `docs:compat` | Compatibility | Compatibility matrix |

### Global Reference
| Command | Format | Output File | Interactive |
|---------|--------|-------------|-------------|
| `globals:table` | Markdown | `.md` | No |
| `globals:csv` | CSV | `.csv` | No |
| `globals:json` | JSON | `.json` | No |
| `globals:interactive` | TUI | - | Yes |

### Utilities
| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `grep:options` | Find test options | Code | Option list |
| `grep:timeout` | Find timeouts | Code | Timeout list |
| `index:options` | Index all options | Code | Index |
| `feedback` | Send feedback | User input | Feedback sent |

**Pattern**: Docs commands follow `docs[:<topic>]` or `globals:<format>` patterns.

---

## Deployment & Operations

### Reality System (Deployment Safety)
| Command | Phase | Check | Auto-fix | Report |
|---------|-------|-------|----------|--------|
| `reality:audit` | Pre-deploy | Full | No | Yes |
| `reality:status` | Monitoring | Status | No | Yes |
| `reality:check` | Pre-deploy | Critical | No | Yes |
| `reality:guard` | Runtime | Guardrails | Yes | Yes |
| `reality:enforce` | Runtime | Strict | Yes | Yes |
| `reality:mixed-test` | Testing | Mixed reality | No | Yes |
| `deploy:reality` | Deploy | All checks | Yes | Yes |
| `deploy:safe` | Deploy | Safe checks | Yes | Yes |

### Nexus Monitoring
| Command | Mode | Alert | History | Export |
|---------|------|-------|---------|--------|
| `nexus:reality` | With reality | Yes | Yes | Yes |
| `nexus:status` | Status only | No | Yes | Yes |
| `nexus:watch` | Live watch | Configurable | Yes | No |

### Changelog Management
| Command | Source | Output | Format |
|---------|--------|--------|--------|
| `changelog:reality` | Reality | Changelog | Markdown |
| `changelog:diff` | Git range | Diff | Unified |

### Setup & Configuration
| Command | Purpose | Idempotent | Interactive |
|---------|---------|------------|-------------|
| `setup:r2` | R2 storage config | Yes | No |
| `setup:guide` | Show guide | N/A | No |

**Pattern**: Reality commands use `reality:<action>`; deployment uses `deploy:<mode>`; nexus uses `nexus[:<mode>]`.

---

## Security & Compliance

### Tier1380 (Compliance System)
| Command | Category | Subcommands | Output | Compliance |
|---------|----------|-------------|--------|------------|
| `tier1380` | Main CLI | All | Varies | Full |
| `t1380` | Alias | All | Varies | Full |
| `tier1380:audit` | Audit | `check`, `css`, `rss`, `db`, `dashboard`, `clean`, `export`, `scan` | Audit report | SOC2, HIPAA |
| `tier1380:seal` | Artifacts | - | Sealed artifacts | Integrity |
| `tier1380:bench` | Performance | Color benchmark | Perf metrics | - |
| `tier1380:sysinfo` | Info | System info | Sysinfo | - |
| `tier1380:exec` | Execution | `log`, `stats`, `packages` | Exec data | - |
| `tier1380:registry` | Registry | 30+ subcommands | Registry ops | - |
| `tier1380:sse` | Alerts | `start`, `test` | SSE stream | - |
| `tier1380:terminal` | Terminal | `profiles`, `list`, `switch` | Terminal mgmt | - |
| `team:*` | Team | `add`, `remove`, `promote`, `demote`, `hierarchy`, `show` | Team info | Access control |

**Pattern**: Tier1380 uses deep hierarchy: `tier1380:<domain>:<action>[:<subaction>]`. Example: `tier1380:registry:r2:upload`.

### Security Testing
| Command | Type | Scope | Automation |
|---------|------|-------|------------|
| `test:security` | Tests | Security suite | CI |
| `test:audit` | Tests | Audit tests | CI |
| `mcp:secure-test` | MCP | Secure MCP test | Manual |
| `col89:check` | Check | Column 89 | CI |
| `col89:gate` | Gate | Enforcement | CI/CD |
| `sqlite:violations` | Check | SQLite issues | Manual |

### Password & Tension
| Command | Operation | Algorithm | Output |
|---------|-----------|-----------|--------|
| `password:hash` | Hash | Argon2/bcrypt | Hashed string |
| `password:verify` | Verify | Same as hash | Boolean |
| `password:benchmark` | Benchmark | All algos | Comparison |
| `tension:status` | Status | - | Tension level |
| `tension:debug` | Debug | Detailed | Debug info |
| `tension:search` | Search | Query | Results |

---

## Enterprise Management

### FactoryWager Core
| Command | Entry | Config | Secrets | Profiles |
|---------|-------|--------|---------|----------|
| `factory-wager` | `~/.factory-wager/factory-wager-cli.ts` | `.factory-wager/config/` | `Bun.secrets` | Yes |
| `fw` | Alias to above | - | - | - |
| `profiles:*` | `profiles-cli.ts` | `profiles-v5.7.ts` | Integrated | Yes |
| `secrets:*` | Various | `secrets-persistence-guide.ts` | Multiple backends | Yes |
| `secrets:v5.7:*` | `profiles-v5.7.ts` | v5.7 format | Backwards compat | Yes |

**Storage Locations**:
- Development: `~/.factory-wager/`
- Production: R2/Cloudflare (configurable)
- Backup: `vault:archive:*`

### Vault System
| Command | Health | Archive | Backup | Restore |
|---------|--------|---------|--------|---------|
| `vault:health` | ✅ | - | - | - |
| `vault:health:verbose` | ✅ | - | - | - |
| `vault:health:fix` | ✅ (auto) | - | - | - |
| `vault:health:report` | ✅ | - | - | - |
| `vault:health:full` | ✅ | - | - | - |
| `vault:archive:*` | - | ✅ | - | - |
| `archive:*` | - | - | ✅ | ✅ |

### Organization
| Command | Action | Dry Run | Force |
|---------|--------|---------|-------|
| `organize:run` | Organize files | `--dry-run` | `--force` |
| `organize:cleanup` | Cleanup untracked | `--dry-run` | `--force` |

### Migration & Verification
| Command | Purpose | Safe | Reversible |
|---------|---------|------|------------|
| `migrate` | Run migration | `migrate:dry` | `migrate:rollback` |
| `migrate:dry` | Preview | Yes | N/A |
| `migrate:verbose` | Detailed output | - | - |
| `guardian` | Run guardian | Auto-fix | Yes |
| `verify:arm64` | Verify ARM64 | - | - |
| `verify:arm64:output` | With output | - | - |
| `demo` | Demo run | - | - |

---

## Infrastructure

### MCP Servers (Model Context Protocol)
| Server | Command | Description | Auto-start | Env Vars |
|--------|---------|-------------|------------|----------|
| bun | `mcp:bun-docs` | Bun runtime | No | `DISABLE_NOTIFICATIONS` |
| bun-docs | `mcp:bun-docs` | Bun docs search | No | - |
| context7 | `mcp:analyze` | Documentation search | No | - |
| filesystem | `mcp:list` | File system access | No | Root path |
| sequential-thinking | `mcp:flow` | Problem-solving | No | - |
| puppeteer | `mcp:example:*` | Browser automation | No | `HEADLESS` |
| rss | `mcp:rss` | RSS reader | No | `RSS_MAX_ITEMS`, `RSS_CACHE_TTL` |

**Management Commands**:
| Command | Purpose | Server |
|---------|---------|--------|
| `mcp:inspector` | Inspect all | All |
| `mcp:list` | List servers | - |
| `mcp:status` | System diagnostic | All |
| `mcp:flow` | Flow management | sequential-thinking |
| `mcp:shell` | Shell bridge | - |
| `mcp:health` | Health check | All |
| `mcp:migrate` | Legacy migration | - |
| `mcp:deploy` | Profile deploy | - |
| `mcp:example:*` | Examples | Various |

### OpenClaw & Agents
| Command | Component | Watch | Health | Info |
|---------|-----------|-------|--------|------|
| `openclaw:status` | Gateway | `:watch` | - | `:info` |
| `openclaw:status:watch` | Gateway live | Yes | - | - |
| `openclaw:health` | All components | - | Yes | - |
| `openclaw:info` | System info | - | - | Yes |
| `agent` | Matrix agent | - | `:health` | `:info` |
| `agent:init` | Agent setup | - | - | - |
| `agent:status` | Agent status | - | - | - |
| `agent:migrate` | Agent migration | - | - | - |
| `terminal:*` | Terminal multiplexer | - | - | - |
| `tbind`, `tstatus`, `tmatrix`, `tbroadcast` | Short aliases | - | - | - |

**Pattern**: OpenClaw commands have `:watch` variant for continuous monitoring.

### Team Management
| Command | Operation | Requires | Output |
|---------|-----------|----------|--------|
| `team:add` | Add member | Admin | Confirmation |
| `team:remove` | Remove member | Admin | Confirmation |
| `team:promote` | Promote member | Admin | New role |
| `team:demote` | Demote member | Admin | New role |
| `team:hierarchy` | Show hierarchy | - | Org chart |
| `team:show` | Show team | - | Member list |

---

## Utilities

### Hardware & System
| Command | Measures | Platform | Output |
|---------|----------|----------|--------|
| `hardware:benchmark` | CPU/GPU/Mem | ARM64 | Benchmark report |
| `css:optimize` | CSS size | Any | Optimized CSS |
| `rss:parse` | RSS feeds | Any | Parsed feed |
| `bun-search` | Bun docs | Online | Search results |

### Omega System
| Command | Environment | Purpose |
|---------|-------------|---------|
| `omega:registry:check` | Staging/Prod | Registry validation |
| `omega:deploy:staging` | Staging | Deploy to staging |
| `omega:health:check` | Any | Health check |
| `omega:demo` | Local | Demo deployment |

### Examples & Demos
| Command | Demo Type | Dependencies |
|---------|-----------|--------------|
| `examples:test-organizer` | Testing | Test suite |
| `examples:ci-detection` | CI | CI config |
| `examples:omega-dashboard` | Dashboard | Omega system |
| `future:demo` | Future features | Experimental |
| `ab:*` | A/B testing | Variant system |
| `tier1380:registry:demo:*` | Tier1380 | Registry |

### Development Helpers
| Command | Purpose | Shortcut For |
|---------|---------|-------------|
| `dev` | Development mode | `bun run src/cli.ts` |
| `feedback` | Send feedback | Feedback form |
| `test:grep` | Filter tests | `--test-name-pattern` |
| `test:safe` | Safe execution | Wrapped test |
| `test:ci-runner` | CI runner | CI-optimized |
| `test:process:*` | Process mgmt | Process tests |
| `test:network` | Network tests | Network-controlled |
| `test:offline` | Offline mode | `--prefer-offline` |
| `test:frozen` | Frozen lockfile | `--frozen-lockfile` |
| `test:inheritance` | Test inheritance | Security mocks |

### Matrix Commands (Direct)
| Command | Parent | Purpose |
|---------|--------|---------|
| `matrix:links:check` | `matrix` | Link checking |
| `matrix:links:quick` | `matrix` | Quick link check |
| `matrix:fm:debug` | `matrix` | Frontmatter debug |
| `matrix:fm:batch` | `matrix` | Batch frontmatter |
| `matrix:fm:validate` | `matrix` | Validate frontmatter |
| `matrix:fm:render` | `matrix` | Render markdown |
| `matrix:openclaw:*` | `matrix` | OpenClaw integration |

---

## Command Patterns & Refactoring

### Completed Refactorings (Quick Wins)

#### ✅ 1. Unified Test Runner
**Status**: Implemented  
**File**: `tools/unified-test-runner.ts`  
**Package.json**: `test:unified` command added

**Benefits**:
- Single entry point for all testing needs
- Intuitive subcommands: `run`, `groups`, `profile`, `process`, `organize`, `ci`
- Backward compatible: old commands still work
- Clear migration path

**Usage**:
```bash
# New way
bun run test:unified run smoke
bun run test:unified run all --profile=benchmark
bun run test:unified groups
bun run test:unified process monitor
bun run test:unified ci

# Old way (still works, but deprecated)
bun run test:smoke
bun run test:unit
```

#### ✅ 2. Unified Build Command
**Status**: Implemented  
**File**: `tools/unified-build.ts`  
**Package.json**: `build` and `build:unified` commands added

**Benefits**:
- Consolidates 18+ build commands into 5 targets
- Clear structure: `build <target> [options]`
- Supports legacy commands for backward compatibility

**Usage**:
```bash
# New way
bun run build files types
bun run build bundle --outdir=dist --publicpath=/static
bun run build optimize --sourcemap --minify
bun run build preview
bun run build demo bunx-demo

# Old way (still works)
bun run build:files:types
bun run build:env-prefix
```

### Pending Refactorings

#### 3. Scattered Test Commands (Partially Done)
**Issue**: Tests still scattered across `test:*`, `test:runner:*`, `test:process:*`, `spawn:*`  
**Solution**: ✅ Unified test runner addresses this. Old commands should be gradually deprecated.

#### 4. Deep Hierarchy Pattern
**Current**: `tier1380:registry:r2:upload`, `tier1380:registry:r2:download`  
**Issue**: 4-level nesting is hard to type and remember.  
**Recommendation**: Flatten to `tier1380:r2-upload` or `tier1380:registry-r2-upload` in next major version.

#### 5. Duplicate Aliases Pattern
**Current**: `matrix` and `dev` both run `src/cli.ts`. `tier1380` and `t1380` are duplicates.  
**Issue**: Multiple entry points cause confusion.  
**Recommendation**: 
- Keep `dev` as convenient alias for development
- Keep `t1380` as short alias, deprecate `tier1380` in docs (both work)

#### 6. Profile Naming Conflict
**Current**: `profiles:*` (FactoryWager) vs `matrix:profile:*` (Matrix CLI)  
**Issue**: Two different profile systems with similar names.  
**Recommendation**: 
- Document the distinction clearly
- Consider renaming FactoryWager to `fw:profile:*` in next major version
- Or merge if compatible

#### 7. MCP Server Management
**Current**: 14 `mcp:*` commands scattered.  
**Issue**: No clear way to start/stop/manage individual servers.  
**Recommendation**: Create `mcp` command with subcommands in future:
```text
mcp start <server>
mcp stop <server>
mcp list
mcp status
mcp logs <server>
```

#### 8. Inconsistent Watch Patterns
**Current**: Some commands have `:watch` suffix (`openclaw:status:watch`), others `--watch` flag.  
**Issue**: Inconsistent UX.  
**Recommendation**: Standardize in next version:
- Long-running: `command watch` (subcommand)
- One-shot with watch: `command --watch`

#### 9. Documentation Command Scattering
**Current**: `docs:*`, `globals:*`, `grep:*`, `index:*` all generate docs.  
**Issue**: No cohesive documentation command.  
**Recommendation**: Consider `docs` command with subcommands:
```text
docs generate <type>
docs serve [port]
docs grep <pattern>
docs index
```

#### 10. Tier1380 Registry Explosion
**Current**: 30+ `tier1380:registry:*` commands including 15+ `demo:*` variants.  
**Issue**: Too many specific commands; demos clutter namespace.  
**Recommendation**: 
- Group demos: `tier1380:demo <name>` instead of `tier1380:registry:demo:<name>`
- Group R2: `tier1380:r2:*` instead of `tier1380:registry:r2:*`

---

## Migration Guide

### From Legacy Test Commands to Unified Test Runner

**Before**:
```bash
bun run test:smoke
bun run test:unit --coverage
bun run test:integration
bun run test:organizer --group performance
bun run test:process:kill
```

**After**:
```bash
bun run test:unified run smoke
bun run test:unified run unit -- --coverage
bun run test:unified run integration
bun run test:unified run performance  # organizer runs automatically
bun run test:unified process kill
```

### From Legacy Build Commands to Unified Build

**Before**:
```bash
bun run build:files:types
bun run build:env-prefix
bun run build:sourcemap-minify
bun run build:memory
```

**After**:
```bash
bun run build files types
bun run build env --prefix
bun run build optimize --sourcemap --minify
bun run build optimize --memory
```

### Deprecation Timeline

- **Phase 1 (Now)**: Introduce unified commands (`test:unified`, `build`) alongside legacy commands
- **Phase 2 (Next minor version)**: Add deprecation warnings to legacy commands
- **Phase 3 (Next major version)**: Remove legacy commands (keep as wrappers with warnings)

---

## Command Map

### By Frequency

**Daily:**
- `dev`, `test:unified`, `matrix`, `lint`, `typecheck`

**Weekly:**
- `test:coverage`, `benchmark`, `docs:*`, `analyze:*`

**Monthly:**
- `reality:*`, `nexus:*`, `tier1380:*`, `vault:*`

**As Needed:**
- `migrate`, `deploy:*`, `secrets:*`, `archive:*`

### By User Role

**Developer:**
- `dev`, `test:unified`, `lint`, `format`, `typecheck`, `analyze:*`

**DevOps:**
- `deploy:*`, `reality:*`, `nexus:*`, `setup:*`, `mcp:*`

**Security:**
- `tier1380:*`, `test:security`, `audit:*`, `col89:*`, `vault:*`

**Platform Engineer:**
- `factory-wager`, `profiles:*`, `secrets:*`, `mcp:*`, `agent:*`

**QA:**
- `test:unified`, `benchmark`, `ab:*`, `performance:*`

---

## Dependency Graph

```text
Development
├── Code Quality (lint, format, typecheck)
├── Build (build [unified]) ✅ NEW
└── Testing (test:unified) ✅ NEW

Performance
├── Matrix Analysis (matrix)
├── Benchmarking (benchmark, buffer:simd)
├── Code Analysis (analyze:*)
└── Performance Suites (perf, audit:full)

Deployment
├── Reality Check (reality:*)
├── Nexus Monitor (nexus:*)
├── Changelog (changelog:*)
└── Setup (setup:*)

Security
├── Tier1380 (tier1380:*)
├── Vault (vault:*)
├── Secrets (secrets:*)
└── Audits (test:security, col89:*)

Enterprise
├── FactoryWager (factory-wager, fw)
├── Profiles (profiles:*)
├── Archives (archive:*)
└── Migration (migrate:*)

Infrastructure
├── MCP Servers (mcp:*)
├── OpenClaw (openclaw:*)
├── Agents (agent:*)
└── Terminal (terminal:*)
```

---

## Quick Reference Index

### Looking for... Use...

**Start developing** → `dev`  
**Run tests** → `test:unified run` or `test:unified run smoke`  
**Check performance** → `matrix` or `benchmark`  
**Deploy safely** → `deploy:reality`  
**Fix security issues** → `tier1380:audit`  
**Manage secrets** → `profiles:secrets:*` or `vault:*`  
**Monitor infra** → `openclaw:status` or `nexus:watch`  
**Generate docs** → `docs:reference` or `globals:table`  
**Analyze code** → `analyze:*`  
**Setup MCP** → `mcp:inspector` or `mcp:bun-docs`  
**Build project** → `build <target>` (new unified command)

---

## Notes

### Current Status
- **✅ Unified test runner** implemented and ready for use
- **✅ Unified build command** implemented (basic functionality)
- **📝 Documentation updated** with migration guides
- **⏳ Deprecation warnings** to be added to legacy commands

### How to Adopt Unified Commands

1. **Start using `test:unified` today** - It's fully functional and backward compatible
2. **Try `build` for common operations** - File operations work, bundle/optimize need implementation
3. **Provide feedback** - Report issues or missing features
4. **Gradual migration** - No need to change scripts immediately; legacy commands still work

### Future Work

- Implement full `build bundle` and `build optimize` functionality
- Add deprecation warnings to legacy `test:*` and `build:*` commands
- Flatten deep hierarchies in Tier1380 commands
- Standardize watch patterns across all commands
- Create unified MCP management command

---

*Last updated: 2026-02-02*  
*Project: nolarose-mcp-config (Matrix Analysis)*  
*Refactoring Status: Quick Wins Implemented ✅*
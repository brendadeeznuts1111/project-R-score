# Scripts

Utility scripts and CLI tools for workspace management.

## Structure

```
scripts/
├── cli/           # Command-line tools
├── secrets/       # Secrets management
├── 1password/     # 1Password setup
├── generators/    # Code/config generators
├── terminal/      # Terminal effects
├── bun/           # Bun-specific tools
├── data/          # Generated data files
├── docs/          # Documentation
├── diagnose/      # Diagnose module
└── utils/         # Shared utilities
```

---

## CLI Tools

| Script | Type | Description | Properties | Patterns |
|--------|------|-------------|------------|----------|
| `cli/diagnose.ts` | Analyzer | Project health analysis with scoring, painpoint detection | `async` `file-io` `modular` | Plugin analyzers, Strategy |
| `cli/feedback.ts` | Reporter | Submit bug reports and feature requests from CLI | `async` `network` `stdin` | Command, Template |
| `cli/pm.ts` | Reference | Bun package manager reference and command wrapper | `sync` `reference` | Facade |
| `cli/projects.ts` | Scanner | Unified workspace scanner, lists all projects with stats | `async` `file-io` `ansi` | Registry, Observer |
| `cli/deep-app-cli.ts` | Scanner | Project scanner with OSC8 hyperlinks, bloat/secret detection | `async` `file-io` `osc8` | Visitor, Strategy |

| Script | Interfaces | Types | Flags |
|--------|------------|-------|-------|
| `cli/diagnose.ts` | `HealthResult` | — | `--quick` `--deep` `--all` `--json` `--html` `--chart` `--open` |
| `cli/feedback.ts` | — | — | `--email=<addr>` `--dry-run` `--open` |
| `cli/pm.ts` | — | — | `install` `add` `remove` `link` `update` `outdated` |
| `cli/projects.ts` | `ExecutionOptions` `ExecutionResult` `ScriptDescriptor` `ProjectStats` `WorkspaceStats` `FileInfo` `FileTypeGroup` `ProjectFileStats` | `ProjectSlug` `ProjectPath` `WorkspaceKey` `ProjectRef` `CategoryKey` | `--scan` `--filter=<pat>` `--sort=<field>` `--json` |
| `cli/deep-app-cli.ts` | `ProjectInfo` | — | `--projects` `--scan=outdated\|bloat\|secrets` `--hyper` `--fix` |

---

## Secrets Management

| Script | Type | Description | Properties | Patterns |
|--------|------|-------------|------------|----------|
| `secrets/check-secrets.ts` | Validator | Validate secrets config, detect exposed credentials | `async` `file-io` `sensitive` | Scanner, Reporter |
| `secrets/secrets-migrate.ts` | Migrator | Migrate between stores (env, 1Password, Bun.secrets) | `async` `auth-required` `destructive` | Adapter, Pipeline |
| `secrets/sync-secrets.ts` | Syncer | Sync secrets across environments | `async` `auth-required` | Sync, Diff-Apply |
| `secrets/sync-wrangler-secrets.ts` | Syncer | Push secrets to Cloudflare Workers | `async` `auth-required` `network` | Bridge |

| Script | Interfaces | Classes | Flags |
|--------|------------|---------|-------|
| `secrets/check-secrets.ts` | `SecretPattern` `ScanResult` | — | `--fix` `--verbose` `--json` |
| `secrets/secrets-migrate.ts` | `StoreConfig` `MigrationResult` | `SecretStore` | `--from=<store>` `--to=<store>` `--dry-run` |
| `secrets/sync-secrets.ts` | `SyncOptions` `SyncResult` | — | `--env=<name>` `--force` |
| `secrets/sync-wrangler-secrets.ts` | `WranglerSecret` | — | `--project=<name>` `--env=<name>` |

---

## 1Password Setup

| Script | Type | Description | Properties | Patterns |
|--------|------|-------------|------------|----------|
| `1password/setup-1password.ts` | Installer | Complete 1Password CLI setup guide with status checks | `async` `auth-required` `interactive` | Wizard, State Machine |
| `1password/setup-1password-plugins.ts` | Configurator | Configure shell plugins for auto credential injection | `async` `auth-required` `shell` | Registry, Builder |
| `1password/setup-1password-vault.ts` | Provisioner | Create Development vault with API credential items | `async` `auth-required` `destructive` | Factory, Template |

| Script | Interfaces | Constants | Flags |
|--------|------------|-----------|-------|
| `1password/setup-1password.ts` | `SetupStatus` `StepResult` | `STEPS` | `--check` `--plugins` `--step=<n>` |
| `1password/setup-1password-plugins.ts` | `PluginConfig` | `RECOMMENDED_PLUGINS` | `--list` `--all` `<plugin-name>` |
| `1password/setup-1password-vault.ts` | `VaultItem` `FieldDef` | `VAULT_NAME` `ITEMS` | `--dry-run` `--force` |

---

## Generators

| Script | Type | Description | Properties | Patterns |
|--------|------|-------------|------------|----------|
| `generators/generate-toc.ts` | Generator | Table of contents generator for markdown/code | `async` `file-io` `recursive` | Visitor, Builder |
| `generators/generate-toml-types.ts` | Generator | Generate TypeScript interfaces from TOML configs | `async` `file-io` `codegen` | Parser, Template |
| `generators/config-manager.ts` | Manager | TOML + R2 storage config manager with sync/diff | `async` `network` `auth-required` | Repository, Command |

| Script | Interfaces | Classes | Flags |
|--------|------------|---------|-------|
| `generators/generate-toc.ts` | `Metrics` `GitStatus` `BuildHealth` `Scripts` `CodeMetrics` `TestStatus` `Activity` `ClaudeSkill` `ClaudePlugin` `ClaudeHook` `SkillsSummary` `CacheEntry` `DepsInfo` `HealthInfo` `Project` | — | `--depth=<n>` `--output=<path>` `--format=md\|json` |
| `generators/generate-toml-types.ts` | — | `BunTomlTypeGenerator` | `--dir=<path>` `--output=<path>` |
| `generators/config-manager.ts` | `R2Config` `Config` | `R2Storage` `ConfigManager` | `get <key>` `set <key> <val>` `sync` `diff` `push` `pull` |

---

## Terminal

| Script | Type | Description | Properties | Patterns | Compatibility |
|--------|------|-------------|------------|----------|---------------|
| `terminal/hyper-matrix.ts` | Display | Clickable project matrix with OSC8 links | `sync` `ansi` `osc8` `interactive` | Table renderer, Hyperlink | iTerm2, WezTerm, Kitty, Hyper |
| `terminal/osc8-matrix.sh` | Display | 25 clickable one-liner project commands | `sync` `bash` `osc8` | Script collection | iTerm2, WezTerm, Kitty |

| Script | Interfaces | Constants |
|--------|------------|-----------|
| `terminal/hyper-matrix.ts` | `Project` | `PROJECTS` |
| `terminal/osc8-matrix.sh` | — | — |

---

## Bun Tools

| Script | Type | Description | Properties | Patterns | Integration |
|--------|------|-------------|------------|----------|-------------|
| `bun/bunpm-preinstall-gate.ts` | Hook | Pre-install security scanner, blocks supply chain attacks | `async` `network` `blocking` | Gate, Chain of Responsibility | `bunfig.toml` preinstall hook |

| Script | Interfaces | Classes |
|--------|------------|---------|
| `bun/bunpm-preinstall-gate.ts` | `GateResult` `ScanResult` | `EnterpriseScanner` (imported) |

---

## Diagnose Module

| File | Type | Description | Properties | Patterns |
|------|------|-------------|------------|----------|
| `diagnose/config.ts` | Config | Analyzer configuration and thresholds | `sync` `readonly` | Configuration object |
| `diagnose/painpoints.ts` | Detector | Painpoint detection rules and scoring | `sync` `rules` | Rule engine, Weighted scoring |
| `diagnose/scoring.ts` | Calculator | Health score calculation and grading | `sync` `pure` | Calculator, Grade mapper |
| `diagnose/analyzers/git.ts` | Analyzer | Git history and commit analysis | `async` `modular` | Strategy, Plugin |
| `diagnose/analyzers/code.ts` | Analyzer | Code complexity and quality metrics | `async` `modular` | Strategy, Plugin |
| `diagnose/analyzers/deps.ts` | Analyzer | Dependency health and vulnerabilities | `async` `modular` | Strategy, Plugin |
| `diagnose/analyzers/performance.ts` | Analyzer | Runtime and build performance metrics | `async` `modular` | Strategy, Plugin |

| File | Interfaces | Types |
|------|------------|-------|
| `diagnose/config.ts` | `DiagnoseConfig` | — |
| `diagnose/painpoints.ts` | `Painpoint` `PainpointSummary` | — |
| `diagnose/scoring.ts` | `HealthScores` `Grade` | — |
| `diagnose/analyzers/git.ts` | `GitHealth` | — |
| `diagnose/analyzers/code.ts` | `CodeHealth` | — |
| `diagnose/analyzers/deps.ts` | `DepsHealth` | — |
| `diagnose/analyzers/performance.ts` | `PerformanceHealth` | — |

---

## Utils

| File | Type | Description | Properties | Patterns |
|------|------|-------------|------------|----------|
| `utils/shared.ts` | Library | ANSI colors, OSC8 links, formatters, spinners | `sync` `stateless` | Utility functions |
| `utils/einstein-similarity.ts` | Algorithm | String similarity using Einstein coefficient | `sync` `pure` | Tokenizer, Comparator |
| `utils/test-logger.js` | Debug | Test logging utility | `sync` `debug` | Logger |

| File | Interfaces | Classes | Exports |
|------|------------|---------|---------|
| `utils/shared.ts` | — | `Spinner` | `color` `osc8` `Spinner` `timer` `pad` `formatBytes` `formatDate` `SECRET_PATTERNS` `BLOAT_PATTERNS` |
| `utils/einstein-similarity.ts` | `SimilarityResult` | — | `SimilarityResult` `einsteinSimilarity` `tokenize` `compare` |
| `utils/test-logger.js` | — | — | `log` `debug` `trace` |

---

## Usage

```bash
# Health analysis
bun cli/diagnose.ts --quick
bun cli/diagnose.ts --all --html --open

# Project scanning
bun cli/projects.ts --scan
bun cli/deep-app-cli.ts --projects --hyper

# Package management
bun cli/pm.ts add zod
bun cli/pm.ts outdated

# 1Password setup
bun 1password/setup-1password.ts --check
bun 1password/setup-1password-plugins.ts --list

# Config management
bun generators/config-manager.ts sync
bun generators/config-manager.ts diff

# Terminal matrix (clickable links)
bun terminal/hyper-matrix.ts
```

---

## Property Legend

| Property | Meaning | Category |
|----------|---------|----------|
| `async` | Uses async/await, returns promises | Execution |
| `sync` | Synchronous execution | Execution |
| `pure` | No side effects, deterministic | Execution |
| `file-io` | Reads/writes files | I/O |
| `network` | Makes HTTP requests | I/O |
| `stdin` | Accepts piped input | I/O |
| `auth-required` | Requires authentication (1Password, API keys) | Security |
| `sensitive` | Handles secrets/credentials | Security |
| `destructive` | Can modify/delete data | Security |
| `blocking` | Can block/prevent operations | Security |
| `interactive` | Prompts for user input | UX |
| `ansi` | Uses ANSI escape codes for colors | UX |
| `osc8` | Uses OSC8 hyperlink protocol | UX |
| `modular` | Plugin/analyzer architecture | Architecture |
| `recursive` | Processes nested structures | Architecture |
| `codegen` | Generates code/types | Architecture |
| `readonly` | Does not modify state | Architecture |
| `rules` | Contains rule definitions | Architecture |
| `reference` | Documentation/reference only | Architecture |
| `stateless` | No internal state | Architecture |
| `debug` | Development/debugging use | Architecture |

---

## Type Reference

### Core Types (cli/projects.ts)

```typescript
type ProjectSlug = "api-plive-setup-discovery" | "registry-powered-mcp" | "trader-analyzer" | ...
type ProjectPath = "/Users/nolarose/Projects/api-plive-setup-discovery" | ...
type WorkspaceKey = "apiPlive" | "registryMcp" | "traderAnalyzer" | ...
type ProjectRef = ProjectSlug | ProjectPath
type CategoryKey = "api" | "trading" | "mcp" | "bot" | "web" | ...

interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

interface ProjectStats {
  name: string;
  path: string;
  deps: number;
  devDeps: number;
  scripts: string[];
  hasTests: boolean;
}
```

### Health Interfaces (diagnose/)

```typescript
interface GitHealth {
  commits: number;
  branches: number;
  stale: boolean;
  lastCommit: Date;
  contributors: number;
}

interface CodeHealth {
  loc: number;
  complexity: number;
  duplication: number;
  coverage: number;
}

interface DepsHealth {
  total: number;
  outdated: number;
  vulnerable: number;
  unused: number;
}

interface PerformanceHealth {
  buildTime: number;
  startupTime: number;
  bundleSize: number;
}

interface HealthScores {
  git: number;
  code: number;
  deps: number;
  perf: number;
}

interface Grade {
  letter: "A" | "B" | "C" | "D" | "F";
  score: number;
  label: string;
}

interface Painpoint {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  file?: string;
  line?: number;
}
```

### Config Interfaces (generators/)

```typescript
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

interface Config {
  title: string;
  version: string;
  server: { port: number; host: string; timeout: number; };
  database: { redis: string; postgres: string; };
  features: Record<string, boolean>;
}
```

### Utility Classes (utils/)

```typescript
class Spinner {
  constructor(options?: { text?: string; color?: string });
  start(msg?: string): void;
  stop(msg?: string): void;
  update(msg: string): void;
  succeed(msg?: string): void;
  fail(msg?: string): void;
}

interface SimilarityResult {
  score: number;
  matches: string[];
  confidence: number;
}
```

---

## Dependency Graph

```
cli/diagnose.ts
├── diagnose/analyzers/git.ts
├── diagnose/analyzers/code.ts
├── diagnose/analyzers/deps.ts
├── diagnose/analyzers/performance.ts
├── diagnose/scoring.ts
├── diagnose/config.ts
└── utils/shared.ts

cli/projects.ts
└── utils/shared.ts

cli/deep-app-cli.ts
├── utils/shared.ts
└── utils/einstein-similarity.ts

generators/config-manager.ts
└── utils/shared.ts

bun/bunpm-preinstall-gate.ts
└── (external) enterprise-scanner.ts
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Health check | `bun cli/diagnose.ts --quick` |
| Full analysis | `bun cli/diagnose.ts --all --html --open` |
| List projects | `bun cli/projects.ts` |
| Scan outdated | `bun cli/deep-app-cli.ts --scan=outdated` |
| Check secrets | `bun secrets/check-secrets.ts` |
| Setup 1Password | `bun 1password/setup-1password.ts` |
| Generate TOC | `bun generators/generate-toc.ts` |
| Sync config | `bun generators/config-manager.ts sync` |
| Project matrix | `bun terminal/hyper-matrix.ts` |

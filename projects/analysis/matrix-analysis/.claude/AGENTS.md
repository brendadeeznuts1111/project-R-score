# 🤖 Tier-1380 OMEGA Protocol - Agent Guide

> **AI Coding Agent Configuration File**  
> This document is optimized for AI agents working on the Tier-1380 OMEGA Protocol codebase.

---

## 📋 Project Overview

**Tier-1380 OMEGA Protocol** is an enterprise-grade development platform built on Bun runtime (v1.3.7), featuring:

- **Cloudflare R2 Integration** - Zero-import native S3 storage (no AWS SDK)
- **MCP/ACP Infrastructure** - Model Context Protocol and Agent Context Protocol servers
- **Chrome State Bridge** - Production-grade cookie/state management with zero-knowledge sealing
- **Matrix Telemetry** - 97-column observability matrix (Cols 72-75: Phase 3.9 Apex)
- **Tension Field** - Real-time anomaly detection and live WebSocket bridging
- **Bun BLAST Suite** - Deployment automation, heap analysis, and release management

### Key Domains

| Domain | Path | Purpose |
|--------|------|---------|
| `chrome-state/` | Chrome state management, entropy analysis, vault sealing | Cols 72-75 |
| `omega-blast/` | BLAST suite: semver, heap analysis, atomic patches, releases | Deployment |
| `tension-field/` | Live telemetry bridge, anomaly detection, validation | Monitoring |
| `matrix/` | 97-column standards CLI, column indexing, integrations | Telemetry |
| `mcp_servers/` | MCP/ACP servers, skill search, matrix dashboard | AI Infrastructure |
| `core/` | Shared utilities, error handling, storage, terminal | Foundation |
| `lib/` | Database pools, exit codes, low-level utilities | System |
| `bin/` | CLI tools: `omega`, `infra`, `kimi-shell`, `kimi-session`, `kimi-notify`, `kimi-workspace` | Commands |

---

## 🛠️ Technology Stack

### Runtime & Language
- **Runtime**: Bun v1.3.7 (required)
- **Language**: TypeScript 5.0+
- **Module System**: ES Modules (`"type": "module"` implied)

### Key Dependencies
```json
{
  "fuzzysort": "^3.0.0",      // Fuzzy string matching
  "mitata": "1.0.34"          // Benchmarking framework
}
```

### Storage & Infrastructure
- **Database**: Bun SQLite (`bun:sqlite`) with connection pooling
- **Object Storage**: Cloudflare R2 (native Bun.s3)
- **Cache**: Redis (optional, via Docker)
- **Monitoring**: Prometheus + Grafana (Docker Compose)

### Configuration Files

| File | Purpose |
|------|---------|
| `bunfig.toml` | Bun runtime configuration with 74+ `[define]` constants |
| `tsconfig.json` | TypeScript strict mode configuration |
| `domain-config.json5` | Domain-specific settings (JSON5 format) |
| `package.json` | Scripts and minimal dependencies |
| `mcp.json` | MCP server configurations |
| `acp.json` | Agent Context Protocol configuration |
| `docker-compose.yml` | Local infrastructure (Redis, Prometheus, Grafana) |
| `Dockerfile` | Multi-stage production build |

---

## 🏗️ Project Structure

```
├── bin/                    # CLI executables (omega, infra, kimi-shell)
├── chrome-state/           # Chrome state bridge (Cols 72-75)
│   ├── api.ts             # Main API
│   ├── entropy.ts         # Col 72: Entropy vector
│   ├── vault.ts           # Col 73: Seal latency
│   ├── guard.ts           # Col 74: Security score
│   ├── columns.ts         # Col 75: Omega status
│   └── health.ts          # Health check endpoint
├── config/                 # Configuration files
│   ├── pipeline.ts        # Registry versioning & deploy
│   └── *.toml            # Bunfig variants (dev/prod/ci/local)
├── core/                   # Core foundation (215+ TypeScript files)
│   ├── agents/            # Swarm orchestration, flow agents
│   ├── analysis/          # Benchmarks, complexity analysis
│   ├── backend/           # Backend services
│   ├── cli/               # CLI commands
│   ├── shared/            # Logger, errors, storage, utils
│   ├── security/          # Buffer security, bootstrapping
│   ├── team/              # Team management
│   ├── terminal/          # Terminal bindings
│   └── workers/           # Profile workers, R2 uploaders
├── lib/                    # Low-level utilities
│   ├── db-pool.ts         # SQLite connection pooling
│   └── exit-codes.ts      # Standardized exit codes
├── matrix/                 # 97-column matrix telemetry
│   ├── column-standards-all.ts    # Main CLI
│   ├── column-standards-index.ts  # Column definitions
│   └── *.md               # Documentation
├── mcp_servers/            # MCP/ACP servers
│   ├── skill_search_server.ts     # Main MCP server
│   ├── acp_ws_gateway.ts          # WebSocket gateway
│   ├── matrix_dashboard.ts        # Matrix dashboard server
│   └── audit_integration.ts       # Audit integration
├── omega-blast/            # BLAST suite
│   ├── cookie-semver.ts     # Cookie-based versioning
│   ├── heap-blast.ts        # Heap analysis
│   ├── atomic-patch.ts      # Hot-patching
│   └── release-bump.ts      # Release automation
├── tension-field/          # Live telemetry
│   ├── live-bridge.ts       # WebSocket bridge
│   └── telemetry-validate.ts # Validation
├── tests/                  # Test suite
│   ├── omega/              # OMEGA-specific tests
│   └── unit/               # Unit tests
├── test/                   # Test infrastructure
│   └── setup.ts            # Global test setup
└── .agents/skills/         # Kimi CLI skills
    ├── tier1380-omega/     # OMEGA skill
    ├── tier1380-commit-flow/  # Commit governance
    └── tier1380-infra/     # Infrastructure skill
```

---

## 🔨 Build & Test Commands

### Installation
```bash
# Install dependencies
bun install --frozen-lockfile

# Initialize git hooks
make hooks
# OR
git config core.hooksPath .githooks && chmod +x .githooks/*
```

### Development Servers
```bash
# Start full stack (MCP + Matrix Dashboard)
bun run fullstack

# Start individual services
bun run mcp:start          # MCP server on :8080
bun run matrix:dashboard   # Matrix dashboard on :3004
bun run omega:server       # OMEGA dashboard on :1380

# Docker Compose (Redis, Prometheus, Grafana)
docker-compose up -d
```

### Testing
```bash
# Run all tests
make test
# OR
./scripts/test-omega.sh

# Quick tests
make test-quick
# OR
bun test tests/omega/pipeline.test.ts

# Integration tests
make test-integration
# OR
bun test tests/omega/integration.test.ts

# Specific test categories
bun run test:ws:flood      # WebSocket flood testing
bun run test:ws:leak       # Memory leak testing (--smol)
bun run matrix:test        # Matrix column tests

# Test with flags
bun test --verbose --timeout 60000
```

### Benchmarking
```bash
# Run all benchmarks
make bench
# OR
bun run bench:all

# Specific benchmarks
bun run bench:omega        # OMEGA benchmarks
bun run bench:cli          # Column CLI benchmarks
bun run bench:server       # Server benchmarks
```

### Linting & Formatting
```bash
# Biome lint (primary)
bunx @biomejs/biome check .
bunx @biomejs/biome check --write .    # Fix issues

# Biome format
make fmt
# OR
bunx @biomejs/biome format --write .

# Type checking
tsc --noEmit
```

---

## 🚀 Deployment Commands

### Registry & Versioning
```bash
# Check current version
bun run omega:registry:check
bun run omega:registry:version

# Bump version
bun run omega:registry:bump patch
bun run omega:registry:bump minor
bun run omega:registry:bump major

# Deploy checks
bun run omega:deploy:check
```

### Deployment Pipeline
```bash
# Deploy to staging
make deploy-staging
# OR
bun run omega:deploy:staging

# Deploy to production
make deploy-prod
# OR
bun run omega:deploy:production

# Dry run
make deploy-dry
# OR
bun run omega:deploy:dry

# Full pipeline
bun run omega:pipeline     # check → bump → deploy staging
```

### Docker
```bash
# Build image
make docker-build
# OR
docker build -t omega:latest .

# Run container
make docker-run
# OR
docker run -p 1380:1380 -p 8080:8080 -p 9000:9000 omega:latest

# Docker Compose
make docker-compose        # Start
make docker-down          # Stop
```

---

## 📝 Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled**: All strict options on
- **Module resolution**: `bundler`
- **Target**: ESNext
- **JSX**: `react-jsx`

### Key Style Rules
```typescript
// ✅ Use const/let (no var)
const result = await fetch(url);

// ✅ Explicit return types on public APIs
export async function healthCheck(): Promise<HealthStatus> { }

// ✅ Strict null checks
if (value === undefined) { }  // Not: if (!value)

// ✅ Use Bun native APIs
const file = Bun.file(path);
const contents = await file.text();

// ✅ Structured logging
import { createLogger } from "./core/shared/logger";
const logger = createLogger("ComponentName");
logger.info("Operation completed", { duration: 100 });
```

### Biome Configuration (Primary Linter)
```json
{
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "globals": ["Bun", "process", "fetch", "WebSocket"],
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all"
    }
  }
}
```

### Import Conventions
```typescript
// Bun built-ins first
import { Database } from "bun:sqlite";
import { spawn } from "bun";

// Project imports
import { pools } from "./lib/db-pool";
import { createLogger } from "./core/shared/logger";

// Type imports
import type { HealthStatus } from "./types";
```

---

## 🧪 Testing Strategy

### Test Structure
```
tests/
├── omega/
│   ├── pipeline.test.ts      # Registry/deployment tests
│   └── integration.test.ts   # Integration tests
├── unit/
│   └── shell-integration.test.ts
└── bun-markdown.test.ts      # Markdown processing tests
```

### Test Setup (`test/setup.ts`)
- Environment isolation (resets env vars)
- Deterministic random seeds (`TEST_SEED = 1380`)
- Test database cleanup
- Cloud environment detection

### Writing Tests
```typescript
import { describe, expect, test } from "bun:test";

describe("Feature Name", () => {
  test("should do something", async () => {
    const result = await someOperation();
    expect(result).toBeDefined();
    expect(result.status).toBe("ok");
  });
});
```

### Test Utilities
```typescript
import { withTimeout, retry, getTestDbPath } from "../test/setup";

// With timeout
const result = await withTimeout(fetchData(), 5000, "fetch");

// With retry
const result = await retry(() => flakyOperation(), { retries: 3 });

// Test database
const dbPath = getTestDbPath("mytest");
```

---

## 🔐 Security Considerations

### Secret Management
- **Never commit secrets** - Use `Bun.secrets` or environment variables
- **Secret files ignored**: `.env`, `.env.*`, `secrets/**`
- **Use R2 for secrets**: `./bin/fw secrets set <key> <value>`

### Security Hardening
```typescript
// ✅ Use Bun.secrets for sensitive data
const apiKey = Bun.env.API_KEY;  // NOT: hardcoded string

// ✅ Validate all inputs
import { validate } from "./core/shared/validation";
const result = validate(input, schema);

// ✅ Use exit codes properly
import { EXIT_CODES } from "./lib/exit-codes";
process.exit(EXIT_CODES.SUCCESS);
```

### CCMP Verification
- 25,555 verified instructions
- Security hardening tier: 1320
- Secrets provider: `Bun.secrets`

---

## 🔧 Development Conventions

### Bun [define] Constants
All configuration uses Bun's compile-time defines (zero runtime overhead):

```toml
# In bunfig.toml
[define]
PORT_MCP = "8080"
TIMEOUT_HEALTH_CHECK_MS = "5000"
ENABLE_ACP_SWARM = "true"
```

Access in code:
```typescript
// These are replaced at build time
const port = PORT_MCP;  // No process.env lookup
```

### Database Pool Usage
```typescript
import { pools } from "./lib/db-pool";

// Query
const rows = await pools.matrix.query(
  "SELECT * FROM columns WHERE id = ?",
  [id]
);

// Run
pools.skills.run(
  "INSERT INTO logs (msg) VALUES (?)",
  [message]
);
```

### Structured Logging
```typescript
import { createLogger } from "./core/shared/logger";

const logger = createLogger("ComponentName");

logger.debug("Debug info", { detail: "value" });
logger.info("Operation started");
logger.warn("Warning condition", { code: "WARN_001" });
logger.error("Error occurred", error);
logger.perf("Operation timing", { duration: 100 });
```

### Error Handling
```typescript
import { EXIT_CODES } from "./lib/exit-codes";
import { createErrorBoundary } from "./core/shared/error-boundary";

// Global error boundary
const boundary = createErrorBoundary({
  onError: (err) => logger.error("Unhandled", err),
  gracefulShutdown: true
});

// Specific error handling
try {
  await operation();
} catch (error) {
  logger.error("Operation failed", error);
  process.exit(EXIT_CODES.ERROR_OPERATION);
}
```

---

## 📊 Matrix Telemetry (97 Columns)

The project uses a 97-column matrix for observability. Key columns:

| Col | Name | Module | Access |
|-----|------|--------|--------|
| 72 | Entropy Vector | `chrome-state/entropy.ts` | `COL_ENTROPY_VECTOR` |
| 73 | Seal Latency | `chrome-state/vault.ts` | `COL_SEAL_LATENCY` |
| 74 | Security Score | `chrome-state/guard.ts` | `COL_SECURITY_SCORE` |
| 75 | Omega Status | `chrome-state/columns.ts` | `COL_OMEGA_STATUS` |
| 89 | MD Compliance | matrix | `COL_MD_COMPLIANCE` |
| 93 | MCP Search Score | matrix | `COL_MCP_SEARCH_SCORE` |
| 94 | ACP Swarm Size | matrix | `COL_ACP_SWARM_SIZE` |

Access via bunfig defines:
```typescript
const colIndex = COL_MCP_SEARCH_SCORE;  // 93
```

---

## 🎯 Common Tasks

### Running the OMEGA CLI
```bash
# Help
./bin/omega help

# Status checks
./bin/omega status
./bin/omega health

# Dashboard
./bin/omega dashboard
```

### Using Skills
```bash
# Load OMEGA skill
/skill:tier1380-omega

# Load infrastructure skill
/skill:tier1380-infra

# Load commit flow
/skill:tier1380-commit-flow
```

### Infrastructure Management
```bash
# After: source <(./bin/kimi-shell init)
infra status          # Show all services
infra health          # Health checks
infra start dashboard # Start dashboard
infra diagnose        # Run diagnostics
```

---

## 🐚 Shell Integration v7.0

Complete shell integration with 100+ aliases, session management, notifications, and workspace switching.

### Quick Setup
```bash
# One-time automated setup (recommended)
./bin/kimi-shell-setup

# Or manual initialization
source <(./bin/kimi-shell init)
```

### Core Components

| Component | Path | Purpose |
|-----------|------|---------|
| `kimi-shell` | `./bin/kimi-shell` | Shell initialization (v7.0) |
| `kimi-shell-setup` | `./bin/kimi-shell-setup` | Automated setup wizard |
| `kimi-session` | `./bin/kimi-session` | Session save/load |
| `kimi-notify` | `./bin/kimi-notify` | Desktop notifications |
| `kimi-workspace` | `./bin/kimi-workspace` | Workspace management |
| `kimi-agent-loop` | `./bin/kimi-agent-loop` | Agent workflow automation |
| `kimi-cloudflare` | `./bin/kimi-cloudflare` | Cloudflare & domain management |
| `kimi-deploy` | `./bin/kimi-deploy` | Deployment automation |
| `kimi-secrets` | `./bin/kimi-secrets` | Secrets management |
| `infra` | `./bin/infra` | Service management |
| `cmd` | `./bin/cmd` | Unified command system |

### Essential Aliases

```bash
# Core
k, ks           # kimi, kimi --shell

# Infrastructure (is, ish, idstart...)
is              # infra status
ish             # infra health
idstart         # infra start dashboard
idstop          # infra stop dashboard

# Unified Commands
c               # cmd (unified command system)
cstatus         # cmd infra status
chealth         # cmd infra health
cpm             # cmd pm
cskill          # cmd skill

# Session Management (v7.0)
kss <name>      # Save session
ksl <name>      # Load session  
ksls            # List sessions
ksd <name>      # Delete session

# Notifications (v7.0)
knotify         # Send notification
knwatch <cmd>   # Watch command
knsuccess       # Success notification
knerror         # Error notification

# Workspaces (v7.0)
w, wl           # Workspace list
ws <name>       # Switch workspace
wn <name>       # New workspace

# Agent Loops (v7.0)
kal <name>      # Start agent loop
kals            # List loops
kalstop <id>    # Stop loop
kalresume <id>  # Resume loop

# Cloudflare (v7.0)
kcf-r2          # R2 bucket operations
kcf-kv          # KV namespace operations
kcf-cdn         # CDN status
kcf-domain      # Domain info
kcf-deploy      # Deploy worker
kcf-logs        # Worker logs

# Deployment (v7.0)
kdeploy-staging   # Deploy to staging
kdeploy-prod      # Deploy to production
kdeploy-pipeline  # Run full pipeline
kdeploy-status    # Show deploy status
kdeploy-history   # Show deploy history
kdeploy-check     # Run pre-deploy checks
kdeploy-rollback  # Rollback deployment

# Secrets (v7.0)
ksec-list         # List secrets
ksec-staging      # List staging secrets
ksec-prod         # List production secrets

# Navigation
ocd-dashboard   # cd apps/dashboard
ocd-matrix      # cd matrix
ocd-chrome      # cd chrome-state
```

### Session Management

Save and restore complete shell sessions:

```bash
# Save current session
kss feature-x --notes "Working on feature X"

# List all sessions
ksls

# Load session (restores dir, env, aliases)
eval "$(ksl feature-x --exec)"

# Export for backup
kimi-session export feature-x -o ~/backups/feature-x.json
```

### Notifications

Desktop notifications for long-running commands:

```bash
# Send notification
knotify "Build Complete" "Your project is ready"

# Watch command (notifies if > 10s)
knwatch bun run build

# Auto-notify for slow commands
eval "$(kimi-notify setup --auto --threshold 30)"
```

Supports: macOS (osascript), Linux (notify-send), WSL

### Workspace Management

```bash
# Create workspaces
wn main                  # Current directory
wn chrome ./chrome-state # Specific path

# Switch between projects
wl                       # List workspaces
ws main                  # Switch to main
ws chrome                # Switch to chrome

# Each workspace remembers:
# - Directory path
# - Environment variables
# - Startup commands
```

### Agent Loop Management (v7.0)

Automated agent workflow execution with checkpointing and recovery:

```bash
# Start a new agent loop
kal "code-review" "Review all TypeScript files for errors"
kal "refactor" "Refactor codebase" --checkpoint 5

# Check loop status
kals                    # All loops
kals <loop-id>          # Specific loop with checkpoints

# Control running loops
kalstop <id>            # Stop loop
kalpause <id>           # Pause loop
kalresume <id>          # Resume from last checkpoint
kalwatch <id>           # Watch progress in real-time

# View metrics
kalmetrics              # Aggregate statistics
```

**Features:**
- **Checkpointing**: Automatic state saves every N steps
- **Recovery**: Resume interrupted loops from last checkpoint
- **Self-monitoring**: Built-in metrics and health tracking
- **Hooks**: Pre/post execution and checkpoint hooks

**Configuration:**
- Config file: `config/kimi-tier1380-config.toml`
- State dir: `~/.kimi/agent-state/`
- Checkpoints: `~/.kimi/agent-state/checkpoints/`

### Unified Command System

```bash
# Interactive FZF mode
cmd -i

# Chain commands
cmd -c "pm audit; infra health"

# Parallel execution
cmd -c "pm audit; skill list" -p

# JSON output
cmd -f json skill list

# Replay history
cmd self replay 5
```

### Matrix Operations
```bash
# Column CLI
bun run matrix:cols           # Show all columns
bun run matrix:search <term>  # Search columns
bun run matrix:validate       # Validate standards
bun run matrix:doctor         # Check health
```

### Cloudflare & Domain Management (v7.0)

Integrated Cloudflare infrastructure management:

```bash
# R2 Bucket Operations
kcf-r2 list                              # List all buckets
kcf-r2 list fw-artifacts                 # List objects in bucket
kcf-r2 upload fw-artifacts ./app.zip     # Upload file
kcf-r2 download fw-artifacts app.zip     # Download file

# KV Namespace Management
kcf-kv list                              # List KV namespaces
kcf-kv list OMEGA_REGISTRY               # List keys in namespace
kcf-kv get OMEGA_REGISTRY version:current # Get key value
kcf-kv put OMEGA_REGISTRY key value      # Set key value

# Worker Deployment
kcf-deploy omega staging                 # Deploy to staging
kcf-deploy omega production              # Deploy to production
kcf-logs omega-staging                   # Stream worker logs

# CDN & Domain
kcf-cdn                                  # Check CDN status
kcf-domain                               # Show domain info
kcf-health                               # Check domain health
kcf-health mcp                           # Check MCP endpoint
kcf-health acp                           # Check ACP endpoint
```

**Configuration:**
- Domain config: `domain-config.json5`
- Wrangler configs: `config/wrangler*.toml`
- Pipeline: `config/pipeline.ts`

### Deployment Automation (v7.0)

Comprehensive deployment pipeline with automated checks and rollback:

```bash
# Quick Deployments
kdeploy-staging                   # Deploy to staging
kdeploy-prod                      # Deploy to production
kdeploy-staging --dry-run         # Dry run (no actual deploy)
kdeploy-prod --skip-checks       # Skip pre-deploy checks

# Full Pipeline (checks → staging → e2e → production)
kdeploy-pipeline

# Deployment Status & History
kdeploy-status                    # Show current deployment status
kdeploy-history                   # Show all deployments
kdeploy-history staging          # Show staging deployments only

# Pre-deploy Checks
kdeploy-check                     # Run checks without deploying

# Rollback
kdeploy-rollback staging         # Rollback staging
kdeploy-rollback production      # Rollback production
```

**Pre-Deploy Checks (all must pass):**
- Git status (working directory clean)
- Bun version (1.3.x required)
- TypeScript compilation
- Unit tests
- Lint (Biome)
- Domain config validation
- Wrangler authentication

**Deployment History:**
- Stored in: `~/.kimi/deploy-history/`
- Keeps last 10 deployments per environment
- Tracks: version, commit, status, duration

### Secrets Management (v7.0)

Secure secrets management for Cloudflare Workers:

```bash
# List secrets
ksec-list                         # List global secrets
ksec-staging                      # List staging secrets
ksec-prod                         # List production secrets

# Set/Get secrets
kimi-secrets set API_KEY abc123 staging
kimi-secrets get API_KEY staging
kimi-secrets delete OLD_KEY production --force

# Bulk operations
kimi-secrets import ./secrets.json staging
kimi-secrets export ./backup.json production

# Sync between environments
kimi-secrets sync staging production

# Audit log
kimi-secrets audit 100            # Show last 100 entries
```

**Security Features:**
- Secret values are never displayed after creation
- All actions logged to `~/.kimi/logs/secrets.log`
- Export only includes names (not values)
- Requires `--force` for destructive operations

### Kimi CLI Configuration

Tier-1380 optimized configuration for long-running agent workflows:

```bash
# Use Tier-1380 config
kimi --config-file config/kimi-tier1380-config.toml

# Or set as default
cp config/kimi-tier1380-config.toml ~/.kimi/configs/
kimi --config-file ~/.kimi/configs/kimi-tier1380-config.toml
```

**Key Settings:**
- `max_steps_per_turn = 250` - Higher for complex operations
- `max_retries_per_step = 15` - More retries for network ops
- `max_ralph_iterations = -1` - Unlimited for long workflows
- `enable_agent_loops = true` - Enable agent loop automation
- `agent_checkpoint_interval = 10` - Auto-save every 10 steps

---

## 📚 Reference Documentation

| Document | Purpose |
|----------|---------|
| `OMEGA-REFERENCE.md` | Quick reference for commands |
| `OMEGA-QUICKSTART.md` | Getting started guide |
| `omega-snippet-cheatsheet.md` | Code snippets |
| `chrome-state-integration-complete.md` | Chrome state docs |
| `mega-which-22col.md` | Column documentation |
| `bun-test-matrix-138-nexus.md` | Test matrix |
| `domain-config.json5` | Domain configuration |

---

## 🚨 Important Notes for Agents

1. **Always use Bun** - Never use Node.js commands directly
2. **Check exit codes** - Use `./lib/exit-codes.ts` for consistency
3. **Respect .gitignore** - Many directories are archived to R2
4. **Use structured logging** - No raw console.log in production code
5. **Follow commit format** - `[DOMAIN][COMPONENT:NAME][TIER:XXXX] Description`
6. **Run tests before committing** - `bun test` should pass
7. **Use biomes for linting** - Not ESLint/Prettier directly
8. **Respect the matrix** - Cols 72-75 are critical telemetry

---

## 🔗 External Resources

- **Bun Docs**: https://bun.sh/docs
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **MCP Spec**: https://modelcontextprotocol.io/
- **Kimi CLI**: Use `kimi --help` for CLI reference

---

*Generated: 2026-01-31 | Tier-1380 OMEGA v1380.0.0 | Shell Integration v7.0*

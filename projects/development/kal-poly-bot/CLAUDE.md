# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime & Tooling

**Bun is MANDATORY for all TypeScript/JavaScript operations.**
- Use `bun` instead of `node`, `npm`, `yarn`, or `pnpm`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build` instead of `webpack` or `esbuild`
- Use `bunx` instead of `npx`
- Bun automatically loads `.env` files

**Rust is used for the arbitrage bot** (`poly-kalshi-arb/`)
- Use `cargo` for all Rust operations
- Use `dotenvx run --` prefix for running with environment variables

**Git Submodules**
- `poly-kalshi-arb/` is a Git submodule tracking the `bun-integration` branch
- Clone with: `git clone --recursive <repo>` or use `git submodule update --init --recursive`
- Update submodule: `cd poly-kalshi-arb && git pull origin bun-integration`
- The submodule has its own repository: git@github.com:brendadeeznuts1111/poly-kalshi-arb.git

## Common Commands

### Root Project
```bash
bun install                    # Install dependencies
bun test                       # Run all tests
bunx tsc --noEmit             # Type checking
bun run precision-dev          # Start development platform
```

### Surgical Precision Platform (`operation_surgical_precision/`)
```bash
cd operation_surgical_precision
bun install && bun build      # Build platform
bun test                      # Run all tests
bun test <file.test.ts>       # Run specific test
bun test <file.test.ts> -- -t 'Test Name'  # Run test by pattern
bun run dev                   # Development mode with hot reload
bun run bench                 # Run benchmarks
```

### Poly-Kalshi Arbitrage Bot (`poly-kalshi-arb/`)
```bash
cd poly-kalshi-arb
cargo build --release         # Build release binary
cargo test                    # Run tests
cargo bench                   # Run benchmarks
DRY_RUN=1 dotenvx run -- cargo run --release  # Dry run
DRY_RUN=0 dotenvx run -- cargo run --release  # Live trading
```

### Surgical Precision MCP (`surgical-precision-mcp/`)
```bash
cd surgical-precision-mcp
bun install && bun build      # Build MCP server
bun test                      # Run all tests
bun run cli                   # CLI interface
bun run health                # Health check
```

### Matrix MCP Server (`services/matrix/`)
```bash
bun services/matrix/matrix-mcp-server.ts  # Start Matrix MCP server
```

## Architecture Overview

This is a **multi-component platform** for zero-collateral financial operations with "surgical precision" standards.

### Core Components

1. **Surgical Precision Platform** (`operation_surgical_precision/`)
   - Enterprise microservices platform with 28.5% Bun-native performance improvement
   - **ComponentCoordinator**: Central orchestration pattern for all services
   - **Service Mesh**: Istio integration (IstioControlPlaneManager)
   - **Observability**: Prometheus, Grafana, ELK stack (ObservabilityPlatformManager)
   - **Disaster Recovery**: Multi-region active-active failover (DisasterRecoveryOrchestrator)
   - **Hot Reload**: Development mode with PrecisionHotReloader
   - Entry point: `completely-integrated-surgical-precision-platform.ts`

2. **Poly-Kalshi Arbitrage Bot** (`poly-kalshi-arb/`)
   - Rust-based high-performance trading bot
   - WebSocket connections for real-time market data
   - Circuit breaker pattern for risk management
   - Lock-free data structures for performance
   - Requires `dotenvx` for environment variable management

3. **Surgical Precision MCP** (`surgical-precision-mcp/`)
   - Model Context Protocol integration
   - Ripgrep ultra-fast search capabilities
   - Zero-collateral precision operations
   - CLI utilities and health monitoring

4. **Matrix MCP Server** (`services/matrix/`)
   - Bun Typed Array Matrix Inspector
   - Dynamic path resolution and cross-platform compatibility
   - Signal handling for graceful shutdown
   - JSON configuration support

5. **Services** (`services/`)
   - `secrets-manager/`: Centralized secrets management (SecretsManagerService)
   - `syndicate-analysis/`: Analysis utilities
   - `matrix/`: Matrix inspection MCP server

### Shared Infrastructure

- **Utils** (`utils/`): Shared utilities including `bun-scripts-utils.mjs`, `debug-terminal.ts`, `patch-manager.ts`
- **Configs** (`configs/`): Platform-wide configuration (bunfig.toml, team color schemes)
- **Scripts** (`scripts/`): Operational scripts (Git config, team setup)
- **Patches** (`patches/`): System hotfixes and modifications

## Key Patterns & Conventions

### ComponentCoordinator Pattern
The platform uses a central ComponentCoordinator for service orchestration:
- Register components with health checks
- Manage lifecycle (start/stop/restart)
- Collect metrics and status
- SQLite for state management

### Bun-Native APIs (MANDATORY)
- `Bun.file()` for file operations (NOT `node:fs`)
- `Bun.$` for shell execution
- `Bun.serve()` for HTTP/WebSocket servers
- `bun:sqlite` for SQLite (NOT `better-sqlite3`)
- `Bun.test` for testing (jest-compatible)
- `Bun.build` for compilation

### File Naming
- **Files**: kebab-case (`component-coordinator.ts`)
- **Variables**: camelCase (`componentStatus`)
- **Types/Classes**: PascalCase (`ComponentCoordinator`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Imports
```typescript
// External imports first
import { Database } from 'bun:sqlite';
import type { Server } from 'bun';

// Internal imports second
import { ComponentCoordinator } from './PrecisionOperationBootstrapCoordinator';
import type { ServiceConfig } from './types';
```

### TypeScript
- Strict mode enabled
- Avoid `any` - use explicit types
- Use `readonly` for immutable properties
- Prefer interfaces over types for object shapes
- Use `import type` for type-only imports

### Testing
- Use `Bun.test` with jest-compatible syntax
- Mock external dependencies
- Test both success and error paths
- Integration tests for component interaction
- Performance benchmarks in `*.bench.ts` files
- Target: 85%+ line coverage, 90%+ function coverage

### Performance
- Sub-100ms performance targets
- 98.5%+ success rates for precision operations
- 13+ benchmark categories
- Cold start: <0.89s (74% under target)
- Warm operations: <30ms (72% under target)
- Concurrent operations: 2000+ ops/sec sustained

## Team Coordination

The platform uses **color-coded workflows** for 4 team roles:
- **🔵 Alice** (Senior Architect): System design, architecture, performance optimization
- **🟡 Bob** (Risk Analyst): Security, risk assessment, compliance monitoring
- **🟣 Carol** (Compliance Officer): Regulatory compliance, audit trails, policy enforcement
- **🟢 Dave** (Operations Lead): Deployment, infrastructure, operations monitoring

Color scheme configs in `configs/`:
- `pr-team-vscode-settings.json` - VS Code theme
- `tmux-pr-team-colors.conf` - TMUX colors
- `scripts/pr-team-git-config.sh` - Git colors

## Security

- **Zero-collateral guarantee**: Algorithmic precision ensuring no transaction losses
- **Multi-jurisdictional**: PCI DSS, HIPAA, SOC 2, GDPR compliance
- Never commit secrets or API keys
- Use `dotenvx` for environment management in Rust code
- Validate all external inputs
- HTTPS for all external communications
- SecretsManagerService for centralized secret management

### Secrets Management (MANDATORY)

**All secrets MUST use `Bun.secrets` (OS keychain), NOT plaintext .env files.**

```typescript
// Reading secrets - Bun.secrets uses OS keychain (macOS Keychain, Windows Credential Manager)
import { secrets } from "bun";

const apiKey = await secrets.get({
  service: "bun-project:my-app",
  name: "API_KEY"
});

// Writing secrets (one-time migration)
await secrets.set({
  service: "bun-project:my-app",
  name: "API_KEY",
  value: "sk-..."
});
```

**Check secrets status:**
```bash
bun scripts/deep-app-cli.ts --scan=secrets    # Check for plaintext secrets
bun scripts/secrets-migrate.ts --list         # List all project secrets
bun scripts/secrets-migrate.ts <project> --migrate  # Migrate .env to keychain
```

**Pre-deployment checklist:**
- [ ] Run `--scan=secrets` - all secrets should show "in keychain"
- [ ] No plaintext secrets in .env files (only non-sensitive config)
- [ ] SecretsManagerService configured for production

## Documentation

Primary technical reference: `docs/AGENTS.md` (comprehensive build/test/style guidelines)

Key memoranda (operation_surgical_precision/):
- `INTEGRATED_DEVELOPMENT_ENVIRONMENT_MEMORANDUM.md` - Enterprise coordination standards
- `IMPLEMENTATION_MEMORANDUM.md` - Platform deployment guide
- `Bun_Configuration_Hardening_Guide.md` - Security hardening protocols
- `BUN_UTILITIES_MEMORANDUM.md` - Bun utilities documentation

## Special Notes

- **Platform dashboard**: Available at https://brendadeeznuts1111.github.io/kal-poly-bot/surgical-precision-dashboard.html
- **Plugin system**: Documented in `operation_surgical_precision/PLUGIN_SYSTEM.md`
- **Mermaid diagrams**: Architecture visualized in `operation_surgical_precision/platform-architecture.mermaid.md`
- **SQLite databases**: Used for component coordination, health checks, and state management (*.db files)
- **Development approach**: "Surgical precision" means minimal changes, high accuracy, comprehensive testing

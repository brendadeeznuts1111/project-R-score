# NEXUS Monorepo Architecture

Complete architecture documentation for team structure, package ownership, private registry integration, and modular benchmarking.

## Quick Start

1. **Configure Registry**: See [`bunfig.toml`](./bunfig.toml)
2. **Set Token**: `export GRAPH_NPM_TOKEN="your-token"`
3. **Install**: `bun install`
4. **Run Benchmarks**: `bun run @bench/layer4`

## Architecture Documentation

- **[Team & Package Architecture](./docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md)** - Complete team structure and package ownership
- **[Team Structure](./docs/architecture/TEAM-STRUCTURE.md)** - Detailed team structure with maintainers and reviewers
- **[Team Mini-Apps](./docs/architecture/TEAM-MINI-APPS.md)** - Telegram Mini-Apps for each team
- **[Team Workflows](./docs/architecture/TEAM-WORKFLOWS.md)** - Daily workflows and review processes
- **[Registry Integration](./docs/architecture/REGISTRY-INTEGRATION.md)** - Private registry setup and API
- **[Benchmarking System](./docs/architecture/BENCHMARKING-SYSTEM.md)** - Benchmark architecture and usage
- **[Market Filtering](./docs/architecture/MARKET-FILTERING.md)** - Market filtering and pattern integration
- **[Geographic Filtering](./docs/architecture/GEOGRAPHIC-FILTERING.md)** - Geographic and bookmaker filtering
- **[Quick Reference](./docs/architecture/QUICK-REFERENCE.md)** - Command reference and aliases
- **[Bun Filter Workflows](./docs/guides/BUN-FILTER-WORKFLOWS.md)** - Using `bun --filter` for team workflows

## Package Scopes

- **@graph/** - Graph algorithms and correlation engines
- **@bench/** - Benchmarking and performance testing  
- **@dev/** - Development tools and utilities

## Team Structure

### Team Leads

- **Alex Chen** - Sports Correlation Team (`@graph/layer4`, `@graph/layer3`)
- **Sarah Kumar** - Market Analytics Team (`@graph/layer2`, `@graph/layer1`)
- **Mike Rodriguez** - Platform & Tools Team (`@graph/algorithms`, `@graph/storage`, `@graph/streaming`, `@graph/utils`, `@bench/*`)

Each team has:
- **Team Lead**: Strategic direction and publishing rights
- **Maintainers**: Day-to-day development and code reviews
- **Owners**: Registry permissions and package ownership

See [`docs/architecture/TEAM-STRUCTURE.md`](./docs/architecture/TEAM-STRUCTURE.md) and [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md) for details.

## Benchmarking

Run benchmarks for any package:

```bash
# Layer4 benchmarks
bun run @bench/layer4

# Specific property
bun run @bench/layer4 --property=threshold --values=0.5,0.6,0.7

# Using bun --filter for team packages
bun --filter '@bench/layer4' bench
bun --filter '@bench/*' bench  # All benchmarks
```

Results are automatically uploaded to the private registry and checked for regressions.

## Registry Management

### Team Publishing

Only team leads can publish their packages:

```bash
# Sports team (Alex)
bun run scripts/team-publish.ts @graph/layer4 --tag=beta

# Markets team (Sarah)
bun run scripts/team-publish.ts @graph/layer2

# Verify ownership
bun run @dev/registry verify-ownership @graph/layer4
```

### Team Aliases

Load team-specific aliases:

```bash
source scripts/team-aliases.sh  # or: . scripts/team-aliases.sh

# Then use:
sports-install  # Install Sports team dependencies
sports-dev      # Start Sports team dev servers (parallel)
sports-test     # Run Sports team tests
sports-bench    # Run Layer4 benchmarks
sports-pub      # Publish Layer2
sports-mini     # Start Sports mini-app

# Or use bun --filter directly:
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &
bun --filter '@bench/*' bench  # All benchmarks
```

## Telegram Mini-Apps

Each team has a dedicated Telegram Mini-App:

```bash
# Sports Correlation Mini-App
cd apps/@mini/sports-correlation
bun run dev  # http://localhost:4001

# Access via Telegram:
# - Click "Open Web App" button in topic #1
# - Bot command: /sports_correlation
```

See [`README-MINI-APPS.md`](./README-MINI-APPS.md) for complete mini-apps guide.
```text

## CI/CD

Benchmarks run automatically:
- On pull requests (regression checks)
- Daily (full suite)
- On releases (final verification)

See [`.github/workflows/benchmark.yml`](./.github/workflows/benchmark.yml).

---

**Status**: ✅ **Architecture Complete** - Ready for use

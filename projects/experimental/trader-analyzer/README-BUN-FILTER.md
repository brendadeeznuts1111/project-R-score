# Bun --filter Quick Reference

**Status**: ✅ **Integrated**

---

## Overview

Quick reference for using Bun's `--filter` flag in the NEXUS monorepo for efficient team workflows.

---

## Quick Examples

### Install Dependencies

```bash
# Sports team packages
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# Market team packages
bun install --filter '@graph/layer2' --filter '@graph/layer1'

# All @graph packages
bun install --filter '@graph/*'

# All @bench packages
bun install --filter '@bench/*'

# Exclude root package
bun install --filter '!./' --filter './packages/*'
```

### Run Scripts

```bash
# Run dev for all packages (parallel)
bun --filter '*' dev

# Run dev for team packages
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &
wait

# Run tests with dependency order
bun --filter '*' test

# Run benchmarks
bun --filter '@bench/*' bench
```

### Check Outdated

```bash
# All packages
bun outdated --filter '*'

# Team packages
bun outdated --filter '@graph/layer4' --filter '@graph/layer3'

# Root only
bun outdated --filter './'
```

---

## Team Workflows

### Sports Correlation Team

```bash
# Install
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# Dev (parallel)
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &
wait

# Test
bun --filter '@graph/layer4' test
bun --filter '@graph/layer3' test

# Benchmarks
bun --filter '@bench/layer4' bench
```

### Market Analytics Team

```bash
# Install
bun install --filter '@graph/layer2' --filter '@graph/layer1'

# Dev (parallel)
bun --filter '@graph/layer2' dev &
bun --filter '@graph/layer1' dev &
wait

# Test
bun --filter '@graph/layer2' test
bun --filter '@graph/layer1' test
```

### Platform & Tools Team

```bash
# Install all platform packages
bun install --filter '@graph/*' --filter '@bench/*'

# Run all benchmarks
bun --filter '@bench/*' bench

# Run all tests
bun --filter '@graph/*' test
```

---

## Convenience Scripts

```bash
# Source team commands
source scripts/team-filter-commands.sh

# Then use:
sports-install   # Install Sports team dependencies
markets-dev      # Start Markets team dev servers
platform-bench   # Run all benchmarks
all-test         # Run all tests
```

---

## Filter Patterns

### By Name

```bash
# Match all packages
bun --filter '*' <command>

# Match scoped packages
bun --filter '@graph/*' <command>
bun --filter '@bench/*' <command>

# Match specific package
bun --filter '@graph/layer4' <command>

# Exclude package
bun install --filter '!@graph/layer4'
```

### By Path

```bash
# Match packages in directory
bun --filter './packages/**' <command>

# Match specific path
bun --filter './packages/@graph/layer4' <command>

# Exclude root
bun install --filter '!./' --filter './packages/*'
```

---

## Dependency Order

Bun automatically respects dependency order:

```bash
# If @graph/layer4 depends on @graph/algorithms:
bun --filter '*' build

# Execution order:
# 1. @graph/algorithms (dependency)
# 2. @graph/layer4 (depends on algorithms)
```

---

## Related Documentation

- [Bun --filter Docs](https://bun.com/docs/pm/cli/install#filter) - Official documentation
- [`docs/guides/BUN-FILTER-WORKFLOWS.md`](./docs/guides/BUN-FILTER-WORKFLOWS.md) - Complete workflows
- [`docs/guides/BUN-MONOREPO-WORKFLOWS.md`](./docs/guides/BUN-MONOREPO-WORKFLOWS.md) - Monorepo guide
- [`scripts/team-filter-commands.sh`](./scripts/team-filter-commands.sh) - Convenience scripts

---

**Status**: ✅ **Bun --filter Integrated** - Use `bun --filter` for efficient team workflows

# Bun Monorepo Workflows

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

Complete guide for using Bun's monorepo features (`--filter`, workspaces) for efficient team workflows.

---

## Bun --filter Flag

The `--filter` flag allows you to select packages by pattern in a monorepo.

### Package Name Patterns

```bash
# Match all packages
bun --filter '*' <command>

# Match all @graph packages
bun --filter '@graph/*' <command>

# Match specific package
bun --filter '@graph/layer4' <command>

# Exclude package
bun install --filter '!@graph/layer4'
```

### Package Path Patterns

```bash
# Match packages in directory
bun --filter './packages/**' <command>

# Match specific path
bun --filter './packages/@graph/layer4' <command>

# Exclude root
bun install --filter '!./' --filter './packages/*'
```

---

## Team Workflows

### Sports Correlation Team

```bash
# Install dependencies
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# Run dev servers in parallel
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &
wait

# Run tests
bun --filter '@graph/layer4' test
bun --filter '@graph/layer3' test

# Run benchmarks
bun --filter '@bench/layer4' bench
```

### Market Analytics Team

```bash
# Install dependencies
bun install --filter '@graph/layer2' --filter '@graph/layer1'

# Run dev servers
bun --filter '@graph/layer2' dev &
bun --filter '@graph/layer1' dev &
wait

# Run tests
bun --filter '@graph/layer2' test
bun --filter '@graph/layer1' test
```

### Platform & Tools Team

```bash
# Install all platform dependencies
bun install --filter '@graph/*' --filter '@bench/*'

# Run all benchmarks
bun --filter '@bench/*' bench

# Run all tests
bun --filter '@graph/*' test
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

## Common Commands

### Install Dependencies

```bash
# All packages
bun install

# Specific team
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# Exclude root
bun install --filter '!./' --filter './packages/*'
```

### Run Scripts

```bash
# All packages
bun --filter '*' dev

# Team packages
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &
wait

# With dependency order
bun --filter '*' build
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

## Convenience Scripts

Use `scripts/team-filter-commands.sh`:

```bash
source scripts/team-filter-commands.sh

sports-install   # Install Sports team dependencies
markets-dev      # Start Markets team dev servers
platform-bench   # Run all benchmarks
all-test         # Run all tests
```

---

## Related Documentation

- [Bun --filter Documentation](https://bun.com/docs/pm/cli/install#filter) - Official docs
- [`docs/guides/BUN-FILTER-WORKFLOWS.md`](./BUN-FILTER-WORKFLOWS.md) - Detailed workflows
- [`scripts/team-filter-commands.sh`](../../scripts/team-filter-commands.sh) - Convenience scripts

---

**Status**: ✅ **Monorepo Workflows Documented** - Ready for use

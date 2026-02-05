# Bun --filter Workflows for Teams

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

This guide shows how to use Bun's `--filter` flag for efficient team workflows in the NEXUS monorepo.

---

## Quick Reference

### Sports Correlation Team

```bash
# Install dependencies for team packages
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# Run dev servers in parallel
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &

# Run tests
bun --filter '@graph/layer4' test
bun --filter '@graph/layer3' test

# Run benchmarks
bun --filter '@bench/layer4' bench
bun --filter '@bench/layer3' bench
```

### Market Analytics Team

```bash
# Install dependencies
bun install --filter '@graph/layer2' --filter '@graph/layer1'

# Run dev servers
bun --filter '@graph/layer2' dev &
bun --filter '@graph/layer1' dev &

# Run tests
bun --filter '@graph/layer2' test
bun --filter '@graph/layer1' test
```

### Platform & Tools Team

```bash
# Install all platform dependencies
bun install --filter '@graph/algorithms' --filter '@graph/storage' --filter '@graph/streaming' --filter '@graph/utils' --filter '@bench/*'

# Run all benchmarks
bun --filter '@bench/*' bench

# Run all platform tests
bun --filter '@graph/algorithms' test
bun --filter '@graph/storage' test
bun --filter '@graph/streaming' test
bun --filter '@graph/utils' test
```

---

## Filter Patterns

### By Package Name

```bash
# Match all @graph packages
bun --filter '@graph/*' <command>

# Match all @bench packages
bun --filter '@bench/*' <command>

# Match specific package
bun --filter '@graph/layer4' <command>

# Exclude package
bun install --filter '!@graph/layer4'
```

### By Package Path

```bash
# Match all packages in packages directory
bun --filter './packages/**' <command>

# Match packages in specific directory
bun --filter './packages/@graph/*' <command>

# Match specific package path
bun --filter './packages/@graph/layer4' <command>
```

---

## Common Workflows

### Install Dependencies

```bash
# Install for specific team
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# Install for all @graph packages
bun install --filter '@graph/*'

# Install excluding root
bun install --filter '!./' --filter './packages/*'
```

### Run Scripts in Parallel

```bash
# Run dev script for all packages
bun --filter '*' dev

# Run test script for team packages
bun --filter '@graph/layer4' test &
bun --filter '@graph/layer3' test &
wait

# Run build with dependency order
bun --filter '*' build  # Respects dependency order
```

### Check Outdated Dependencies

```bash
# Check all packages
bun outdated --filter '*'

# Check team packages
bun outdated --filter '@graph/layer4' --filter '@graph/layer3'

# Check only root
bun outdated --filter './'
```

---

## Team-Specific Scripts

Use the convenience script:

```bash
# Source the script
source scripts/team-filter-commands.sh

# Then use shortcuts:
sports-dev      # Start Sports team dev servers
markets-test    # Run Markets team tests
platform-bench  # Run all benchmarks
all-install     # Install all dependencies
```

---

## Dependency Order

Bun automatically respects dependency order when running scripts:

```bash
# If @graph/layer4 depends on @graph/algorithms:
bun --filter '*' build

# @graph/algorithms builds first
# @graph/layer4 builds after @graph/algorithms completes
```

---

## Examples

### Alex's Daily Workflow

```bash
# 1. Install dependencies
bun install --filter '@graph/layer4' --filter '@graph/layer3'

# 2. Start dev servers
bun --filter '@graph/layer4' dev &
bun --filter '@graph/layer3' dev &

# 3. Run benchmarks
bun --filter '@bench/layer4' bench

# 4. Run tests
bun --filter '@graph/layer4' test
bun --filter '@graph/layer3' test
```

### Sarah's Review Process

```bash
# Check outdated dependencies
bun outdated --filter '@graph/layer2' --filter '@graph/layer1'

# Run tests before review
bun --filter '@graph/layer2' test
bun --filter '@graph/layer1' test

# Run benchmarks
bun --filter '@bench/layer2' bench
```

### Mike's Platform Maintenance

```bash
# Install all platform dependencies
bun install --filter '@graph/*' --filter '@bench/*'

# Run all benchmarks
bun --filter '@bench/*' bench

# Run all tests
bun --filter '@graph/*' test
```

---

## Related Documentation

- [Bun --filter Documentation](https://bun.com/docs/pm/cli/install#filter) - Official Bun docs
- [`scripts/team-filter-commands.sh`](../../scripts/team-filter-commands.sh) - Convenience scripts
- [`docs/architecture/TEAM-WORKFLOWS.md`](../architecture/TEAM-WORKFLOWS.md) - Team workflows

---

**Status**: ✅ **Filter Workflows Documented** - Ready for use

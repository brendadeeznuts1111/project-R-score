# Team Workflows & Daily Routines

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

This document describes the daily workflows and review processes for each team lead in the NEXUS monorepo.

---

## Team Lead Workflows

### Alex Chen - Sports Correlation Team Lead

**Packages**: `@graph/layer4`, `@graph/layer3`  
**Maintainers**: Jordan Lee (layer4), Priya Patel (layer3)  
**Reviewers**: Alex Chen, Mike Rodriguez  
**Benchmark Module**: `@bench/layer4`, `@bench/layer3`

#### Daily Workflow

```bash
# Run Alex's daily workflow script
bun run scripts/alex-daily-workflow.sh

# Or manually:
git pull origin main
cd packages/@graph/layer4
bun run dev
bun run bench
bun run scripts/team-publish.ts @graph/layer4 --tag=beta
```

#### Key Commands

```bash
# Development
alias sports="cd packages/@graph/layer4 && bun run dev"
alias sports-bench="bun run @bench/layer4"
alias sports-pub="bun run scripts/team-publish.ts @graph/layer4"
```

---

### Sarah Kumar - Market Analytics Team Lead

**Packages**: `@graph/layer2`, `@graph/layer1`  
**Maintainers**: Tom Wilson (layer2), Lisa Zhang (layer1)  
**Reviewers**: Sarah Kumar, Mike Rodriguez  
**Benchmark Module**: `@bench/layer2`, `@bench/layer1`

#### Review Process

Sarah reviews PRs with benchmark results and approves if improvement >5%:

```typescript
// Run review process
bun run scripts/maria-review-process.ts @graph/layer2

// The script checks:
// - Duration improvement >5%
// - No accuracy regression
// - Publishes as release candidate if approved
```

#### Key Commands

```bash
# Development
alias markets="cd packages/@graph/layer2 && bun run dev"
alias markets-bench="bun run @bench/layer2"
alias markets-pub="bun run scripts/team-publish.ts @graph/layer2"
```

---

### Mike Rodriguez - Platform & Tools Team Lead

**Packages**: `@graph/algorithms`, `@graph/storage`, `@graph/streaming`, `@graph/utils`, `@bench/*`  
**Maintainers**: David Kim (algorithms), Emma Brown (storage, streaming), Ryan Gupta (all @bench/*), Mike Rodriguez (utils)  
**Reviewer**: Mike Rodriguez

#### Workflow

Mike manages all platform packages and benchmarking infrastructure:

```bash
# Platform packages
cd packages/@graph/algorithms
bun test
bun run scripts/team-publish.ts @graph/algorithms

# Benchmark packages
cd packages/@bench/layer4
bun run bench
bun run scripts/team-publish.ts @bench/layer4
```

#### Key Commands

```bash
alias platform="cd packages/@graph/algorithms && bun run dev"
alias platform-bench="bun run bench:all"
alias bench-all="bun run bench:all"
alias bench-l4="bun run @bench/layer4 --property=threshold"
```

---

## Common Workflows

### Publishing a Package

```bash
# 1. Verify ownership
bun run @dev/registry verify-ownership @graph/layer4

# 2. Run tests and benchmarks
cd packages/@graph/layer4
bun test
bun run bench

# 3. Publish (team-publish.ts handles ownership check)
bun run scripts/team-publish.ts @graph/layer4 --tag=beta
```

### Reviewing a PR

```bash
# 1. Check benchmark results in PR description
# 2. Run review script (for Sarah's team)
bun run scripts/maria-review-process.ts @graph/layer2

# 3. If approved, merge and publish
git merge pr-branch
bun run scripts/team-publish.ts @graph/layer2 --tag=rc
```

### Adding a New Maintainer

```sql
-- Add to database
INSERT INTO maintainers (email, name, role) 
VALUES ('new.maintainer@company.com', 'New Maintainer', 'contributor');

-- Add to package
INSERT INTO package_maintainers (package_id, maintainer_id, scope)
SELECT p.id, m.id, 'read-write'
FROM packages p, maintainers m
WHERE p.name = '@graph/layer4' AND m.email = 'new.maintainer@company.com';
```

---

## Team Aliases

Load team-specific aliases:

```bash
source scripts/team-aliases.sh

# Then use:
sports-bench    # Run Layer4 benchmarks
markets-pub     # Publish Layer2
bench-all       # Run all benchmarks
platform        # Start platform dev server
```

---

## Related Documentation

- [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./TEAM-PACKAGE-ARCHITECTURE.md) - Complete architecture
- [`docs/architecture/TEAM-STRUCTURE.md`](./TEAM-STRUCTURE.md) - Team structure details
- [`scripts/team-publish.ts`](../../scripts/team-publish.ts) - Publishing script
- [`scripts/alex-daily-workflow.sh`](../../scripts/alex-daily-workflow.sh) - Alex's workflow
- [`scripts/maria-review-process.ts`](../../scripts/maria-review-process.ts) - Sarah's review process
- [`scripts/team-aliases.sh`](../../scripts/team-aliases.sh) - Team aliases

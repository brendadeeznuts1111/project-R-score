# 🔄 Fire22 Dependency & Version Management Guide

## Overview

Fire22 implements a **hybrid dependency management strategy** combining Bun's
native package management with enterprise-grade version control. This guide
provides comprehensive workflows for managing both runtime dependencies and
system versions.

## 🏗️ Architecture Overview

### Hybrid Management Strategy

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Runtime Deps   │    │  System Version  │    │ Domain Versions │
│   (bun update)  │    │  (bun pm pkg)    │    │  (Custom VM)    │
│                 │    │                  │    │                 │
│ • axios         │    │ • 2.3.0-arch     │    │ • collections   │
│ • express       │    │ • 2.4.0          │    │ • settlement    │
│ • drizzle-orm   │    │ • 3.0.0          │    │ • balance       │
│ • yaml          │    │                  │    │ • vip           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                        │                        │
   ⚡ Fast Updates           🏢 Enterprise             🎯 Domain-Specific
   500x Performance        Version Control          Business Logic
```

## 📦 Bun Dependency Management

### Core Commands

#### Check Current Dependencies

```bash
# View all dependencies
bun pm pkg get dependencies

# View specific dependency
bun pm pkg get dependencies.drizzle-orm

# View dependency versions with ranges
bun pm pkg get dependencies --json | jq
```

#### Update Dependencies

```bash
# Check for outdated dependencies (dry run)
bun update --dry-run

# Interactive update mode
bun update --interactive

# Update to latest versions (ignore version ranges)
bun update --latest

# Update specific dependency
bun update drizzle-orm

# Update with latest flag
bun update drizzle-orm --latest
```

### Advanced Update Strategies

#### Semantic Version Updates

```bash
# Respect version ranges (^17.0.0 → 17.x.x)
bun update

# Update to latest major version (17.x.x → 18.x.x)
bun update --latest
```

#### Interactive Mode Features

```bash
bun update --interactive
```

**Interface Controls:**

- **Space**: Toggle package selection
- **Enter**: Confirm selections and update
- **a**: Select all packages
- **n**: Select none
- **i**: Invert selection
- **l**: Toggle between target/latest version
- **↑/↓**: Navigate packages

**Visual Indicators:**

- **☑**: Selected for update
- **□**: Not selected
- **>**: Current cursor position
- **Colors**: Red (major), Yellow (minor), Green (patch)

## 🏷️ System Version Management

### Enterprise Version Manager

#### Version Status

```bash
# Complete system status
bun run version:status

# Current version only
bun run version:current

# System information
bun run version:info
```

#### Version Bumping

```bash
# Semantic version bumps
bun run version:major    # 2.3.0 → 3.0.0
bun run version:minor    # 2.3.0 → 2.4.0
bun run version:patch    # 2.3.0 → 2.3.1

# Pre-release versions
bun run version:prerelease  # 2.3.0 → 2.3.1-beta.1

# Custom version management
bun run version:release 2.4.0  # Set specific version
```

### Bun Native Version Management

#### Direct Package Version Control

```bash
# Set specific version
bun pm pkg set version="2.4.0"

# Bump version with Bun
bun pm version patch      # 2.3.0 → 2.3.1
bun pm version minor      # 2.3.0 → 2.4.0
bun pm version major      # 2.3.0 → 3.0.0

# Pre-release versions
bun pm version prerelease # 2.3.0 → 2.3.1-beta.1
bun pm version prepatch   # 2.3.0 → 2.3.1-beta.1
```

## 🔄 Complete Workflow Integration

### Development Workflow

```bash
# 1. Check current status
bun run version:status
bun pm pkg get dependencies

# 2. Update runtime dependencies
bun update --interactive

# 3. Test system with new dependencies
bun run test:all

# 4. Bump system version
bun run version:minor

# 5. Validate complete system
bun run version:validate

# 6. Commit changes
git add .
git commit -m "feat: Update dependencies and bump version

- Updated runtime dependencies via bun update
- Bumped system version to 2.4.0
- All tests passing with new dependency versions
- Enterprise validation completed"
```

### Release Workflow

```bash
# 1. Update to latest dependencies
bun update --latest

# 2. Run comprehensive tests
bun run test:integration
bun run test:performance

# 3. Prepare release
bun run release:prepare

# 4. Bump to stable version
bun pm pkg set version="2.4.0"

# 5. Create git tag
bun run release:tag

# 6. Validate final release
bun run release:verify
```

## 🎯 Domain-Specific Versioning

### Current Domain Versions

```bash
bun run version:status
```

**Output:**

```text
📊 Fire22 Version Status
═══════════════════════════════
Current Version: 2.3.0-architecture+20241219

🏗️ Domain Versions:
  🟢 collections: 1.0.0
  🟢 balance: 1.0.0
  🟢 wager-system: 1.0.0
  🟡 settlement: 0.1.0-testing
  🟢 vip-management: 1.0.0
  🟢 user-management: 1.0.0
  🟢 fantasy42: 1.0.0
  🟢 telegram-integration: 1.0.0
  🟢 dashboard: 1.0.0
  🟢 health-monitoring: 1.0.0
  🟢 security: 1.0.0
  🟢 database: 1.0.0
```

### Domain Version Updates

```bash
# Update domain version (manual process)
# Edit bunfig.toml [version.domains] section
# Then commit changes

# Example domain version bump
# settlement: 0.1.0-testing → 1.0.0 (production ready)
```

## 📊 Performance & Monitoring

### Dependency Health

```bash
# Check dependency status
bun pm pkg get dependencies | jq length

# Monitor bundle size impact
bun run build:analyze

# Check for security vulnerabilities
bun pm audit
```

### Version Metrics

```bash
# System health check
bun run version:validate

# Performance benchmarks
bun run test:performance

# Domain health status
curl http://localhost:3000/health
```

## 🛠️ Automation Scripts

### Automated Update Workflow

```bash
#!/usr/bin/env bun
// scripts/automated-updates.bun.ts

import { $ } from "bun";

// Automated dependency update workflow
async function automatedUpdateWorkflow() {
  console.log("🚀 Starting Automated Update Workflow");

  // 1. Check for outdated dependencies
  console.log("📦 Checking for outdated dependencies...");
  await $`bun update --dry-run`;

  // 2. Update dependencies interactively (would require user input)
  // await $`bun update --interactive`;

  // 3. Run tests to ensure compatibility
  console.log("🧪 Running test suite...");
  await $`bun run test:all`;

  // 4. Bump patch version
  console.log("📈 Bumping patch version...");
  await $`bun run version:patch`;

  // 5. Validate system
  console.log("✅ Validating system integrity...");
  await $`bun run version:validate`;

  console.log("🎉 Automated update workflow completed!");
}

// Run if called directly
if (import.meta.main) {
  automatedUpdateWorkflow();
}
```

### CI/CD Integration

```yaml
# .github/workflows/dependency-update.yml
name: Dependency Updates

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  update-dependencies:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Update Dependencies
        run: bun update --latest

      - name: Run Tests
        run: bun run test:all

      - name: Bump Version
        run: bun run version:patch

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v4
        with:
          title: 'chore: Weekly dependency updates'
          body: 'Automated dependency updates with version bump'
          branch: automated-updates
```

## 🔒 Security & Compliance

### Dependency Security

```bash
# Audit dependencies for vulnerabilities
bun pm audit

# Fix security issues automatically
bun pm audit --fix

# Check for outdated dependencies with security info
bun pm audit --outdated
```

### Version Compliance

```bash
# Validate semantic versioning compliance
bun run version:validate

# Check domain version consistency
bun run version:status

# Audit version history
git log --oneline --grep="feat\|fix\|chore"
```

## 🎯 Best Practices

### Dependency Management

1. **Regular Updates**: Weekly dependency updates via automation
2. **Security First**: Always audit dependencies before updating
3. **Test Coverage**: Ensure 100% test coverage before updates
4. **Gradual Rollout**: Use feature flags for major dependency updates

### Version Management

1. **Semantic Commits**: Use conventional commit format
2. **Version Validation**: Always validate before releases
3. **Documentation**: Update docs with version changes
4. **Communication**: Notify stakeholders of major version changes

### Hybrid Strategy

1. **Bun for Runtime**: Use `bun update` for npm dependencies
2. **Custom VM for Domains**: Use enterprise version manager for domain
   versioning
3. **Git Integration**: Leverage `bun pm version` for automatic commits/tags
4. **Automation**: Combine both systems in CI/CD pipelines

## 📈 Success Metrics

### Performance Targets

- **Update Speed**: < 30 seconds for typical dependency updates
- **Version Bump**: < 10 seconds for version operations
- **Validation**: < 5 seconds for system validation
- **CI/CD**: < 15 minutes for complete update workflow

### Quality Metrics

- **Test Coverage**: 100% for all version management operations
- **Security Score**: A+ rating on dependency security audits
- **Update Success Rate**: > 95% automated updates successful
- **Rollback Rate**: < 5% of updates require rollback

## 🚀 Advanced Features

### Smart Version Bumping

```bash
# AI-assisted version suggestions (future)
bun run version:suggest

# Impact analysis for version changes
bun run version:impact-analysis 2.4.0

# Automated rollback on failure
bun run version:rollback
```

### Predictive Updates

```bash
# Predict when dependencies will need updates
bun run deps:predict-updates

# Schedule optimal update windows
bun run deps:schedule-updates
```

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Dependencies
bun update --interactive    # Interactive dependency updates
bun update --latest         # Update to latest versions
bun pm audit               # Security audit

# Versions
bun run version:status     # System status
bun pm version patch       # Version bump
bun run version:validate   # System validation

# Combined Workflow
bun update --interactive && bun run version:minor && bun run version:validate
```

### Emergency Rollback

```bash
# Rollback version
git reset --hard HEAD~1
git push --force-with-lease

# Rollback dependencies
bun install --frozen-lockfile
```

**Fire22 Dependency & Version Management**: Enterprise-grade control with Bun's
performance ⚡🏢

_Last Updated: 2024-12-19 | Version: 2.3.0-architecture_

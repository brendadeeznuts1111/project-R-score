# 🚀 Fire22 Enhanced Dependency Management with bunx --package

## Overview

This document describes the enhanced dependency management system leveraging
Bun's latest features (v1.2.21+) including `bun pm pkg`, `bun why`, improved
workspace performance, and **explicit package specification with
`bunx --package`** for reliable development workflows.

## New Features Implemented

### 1. 📦 Enhanced Package Management with `bunx --package`

#### Core Scripts Added

- **`bun run pkg:get`** - Get package.json values using `bun pm pkg get`
- **`bun run pkg:set`** - Set package.json values using `bun pm pkg set`
- **`bun run pkg:fix`** - Auto-fix package.json issues
- **`bun run pkg:manage`** - Interactive package management tool with
  `bunx --package` examples
- **`bun run pkg:fix-all`** - Fix issues across all workspaces

#### Enhanced Development Tools with Explicit Package Specification

- **`bun run typecheck`** - `bunx --package typescript tsc --noEmit`
- **`bun run lint`** -
  `bunx --package @typescript-eslint/eslint-plugin eslint --fix`
- **`bun run format`** - `bunx --package prettier prettier --write .`
- **`bun run test:jest`** - `bunx --package jest jest --coverage`
- **`bun run bundle:analyze`** -
  `bunx --package webpack-bundle-analyzer webpack-bundle-analyzer dist/stats.json`

#### Dependency Analysis with Enhanced Tools

- **`bun run deps:analyze`** - Comprehensive dependency analysis using
  `bunx --package jq` for JSON processing
- **`bun run deps:why`** - Trace dependency chains with `bun why`
- **`bun run deps:check-updates`** - `bunx --package npm-check-updates ncu`
- **`bun run deps:update-interactive`** -
  `bunx --package npm-check-updates ncu -i`
- **`bun run security:audit`** -
  `bunx --package npm-audit-resolver npm-audit-resolver check`

#### Version Management

- **`bun run version:status`** - Show version across all workspaces
- **`bun run version:sync`** - Sync versions from root to workspaces

### 2. 🔍 Enhanced Analysis Tools

#### Dependency Analysis Script (`scripts/analyze-deps.sh`)

```bash
# Comprehensive dependency report
bun run deps:analyze

# Features:
- Checks common problematic packages (zod, drizzle-orm, etc.)
- Analyzes @types packages for duplicates
- Security audit integration
- Workspace dependency mapping
- JSON report generation
```

#### Package Management Tool (`scripts/manage-package.sh`)

```bash
# Interactive package management
bun run pkg:manage info        # Show package info
bun run pkg:manage scripts     # List all scripts
bun run pkg:manage validate    # Validate configuration
bun run pkg:manage fix         # Fix issues

# Direct package.json manipulation
bun run pkg:manage add-script test "bun test"
bun run pkg:manage remove-script old-script
bun run pkg:manage update-meta author "Fire22 Team"
```

### 3. 🔄 Enhanced Upgrade Pipeline

#### Updated Dev Dependencies Script (`scripts/update-dev-deps.sh`)

- Uses `bun pm pkg fix` to fix issues first
- Leverages `bun why` to analyze dependencies before updates
- Programmatically updates scripts using `bun pm pkg set`
- Respects `.npmrc` save-exact configuration

#### Pre-Publish Verification (`scripts/pre-publish-verify.sh`)

- Uses `bun pm pack --quiet` for tarball generation
- Enhanced dependency validation with `bun why`
- JSON report generation with package statistics
- Workspace configuration validation

## Configuration Improvements

### .npmrc Configuration

```ini
# Enhanced configuration
registry=https://registry.npmjs.org/
save-exact=true           # Enforced exact versions
audit-level=moderate      # Security auditing
workspaces-update=false   # Controlled workspace updates
```

### bunfig.toml Configuration

```toml
[install]
registry = "https://registry.npmjs.org/"
linker = "hoisted"        # Improved for Cloudflare Workers
exact = true             # Exact version matching
```

## Performance Improvements

### Workspace Installation Performance

- **Bug Fix**: Workspace packages no longer re-evaluated multiple times
- **Result**: Faster and more reliable installations in monorepos
- **Benefit**: Reduced `bun install` time for `@fire22/*` packages

### Dependency Resolution Priority

- **New Priority**: devDependencies > optionalDependencies > dependencies >
  peerDependencies
- **Result**: More predictable package resolution
- **Benefit**: Eliminates version ambiguity across dependency groups

## Enhanced `bunx --package` Usage Patterns

### Key Benefits of `bunx --package`

1. **Explicit Package Specification** - Run binaries from packages where the
   binary name differs from the package name
2. **Scoped Package Support** - Easily run binaries from scoped packages like
   `@angular/cli`, `@nestjs/cli`
3. **Version Pinning** - Specify exact package versions for consistent execution
   across environments
4. **Multiple Binary Support** - Run specific binaries from packages that
   provide multiple executables
5. **CI/CD Reliability** - Ensures consistent behavior across different
   environments

### Framework CLI Examples

```bash
# Angular CLI (binary 'ng' from package '@angular/cli')
bunx --package @angular/cli ng generate component my-component
bunx --package @angular/cli ng build --prod

# NestJS CLI (binary 'nest' from package '@nestjs/cli')
bunx --package @nestjs/cli nest new my-project
bunx --package @nestjs/cli nest generate service my-service

# Vue CLI (binary 'vue' from package '@vue/cli')
bunx --package @vue/cli vue create my-project
bunx --package @vue/cli vue add vuetify

# Create React App (binary matches package name)
bunx --package create-react-app create-react-app my-app

# Vite (binary 'vite' from package 'vite')
bunx --package vite vite build
bunx --package vite vite preview
```

### Development Tools with Explicit Package References

```bash
# TypeScript Compiler
bunx --package typescript tsc --noEmit                    # Type checking
bunx --package typescript tsc --build                     # Project references

# ESLint with TypeScript support
bunx --package @typescript-eslint/eslint-plugin eslint --fix . --ext .ts,.tsx

# Code Formatting
bunx --package prettier prettier --write .
bunx --package prettier prettier --check .

# CSS Linting
bunx --package stylelint stylelint "**/*.css" --fix

# Testing Frameworks
bunx --package jest jest --coverage                       # Jest testing
bunx --package cypress cypress run                        # E2E testing
```

### Bundle Analysis and Optimization

```bash
# Webpack Bundle Analyzer
bunx --package webpack-bundle-analyzer webpack-bundle-analyzer dist/stats.json

# Source Map Explorer
bunx --package source-map-explorer source-map-explorer 'dist/**/*.js'

# Webpack build with specific version
bunx --package webpack@5.88.0 webpack --config webpack.prod.js
```

### Version-Specific Tool Execution

```bash
# Use specific TypeScript version for compatibility
bunx --package typescript@4.9.5 tsc --noEmit

# Use specific Webpack version for legacy builds
bunx --package webpack@4.46.0 webpack --config webpack.legacy.js

# Use specific Jest version for testing
bunx --package jest@29.7.0 jest --coverage
```

## Usage Examples

### Quick Dependency Check with Enhanced Tools

```bash
# Check why zod is installed
bun run deps:why zod

# See all @types packages
bun run deps:why "@types/*"

# Get current package info with enhanced JSON formatting
bun run pkg:get name version

# Interactive dependency updates
bun run deps:update-interactive

# Security audit with enhanced tools
bun run security:audit
```

### Interactive Package Management

```bash
# Package information
bun run pkg:manage info

# Add a new script
bun run pkg:manage add-script "test:watch" "bun test --watch"

# Validate configuration
bun run pkg:manage validate
```

### Version Synchronization

```bash
# Check version status across workspaces
bun run version:status

# Sync all workspace versions to root
bun run version:sync
```

### Dependency Analysis

```bash
# Complete dependency analysis
bun run deps:analyze

# Dry run upgrade preview
bun run upgrade:dry-run
```

## Advanced Features

### Automated Package.json Management

```bash
# Fix all workspace package.json files
bun run pkg:fix-all

# Update scripts across workspaces programmatically
bun pm pkg set scripts.test="bun test"
bun pm pkg set scripts.build="bun run build"
```

### Dependency Debugging

```bash
# Trace dependency chains
bun why react --depth 2
bun why "@types/*" --top 5

# Filter by workspace
bun why "@fire22/*" --depth 1
```

### Security and Validation

```bash
# Security audit
bun run pkg:audit

# Pre-publish validation
bun run verify:pre-publish
```

## Migration Guide

### From Manual package.json Editing

```bash
# Old way:
# Edit package.json manually

# New way:
bun run pkg:set scripts.test="bun test"
bun run pkg:set author="Fire22 Team"
bun run pkg:fix
```

### From npm/yarn Commands

```bash
# Old way:
npm outdated

# New way:
bun outdated -r --filter="@fire22/*"
bun run deps:analyze  # Enhanced analysis
```

## Best Practices

### 1. Use Exact Versions

- `save-exact=true` in `.npmrc` ensures reproducible builds
- Critical for security and stability

### 2. Regular Dependency Analysis

```bash
# Weekly dependency health check
bun run deps:analyze

# Before major updates
bun run upgrade:dry-run
```

### 3. Workspace Version Synchronization

```bash
# After version changes
bun run version:sync

# Verify consistency
bun run version:status
```

### 4. Automated Package.json Maintenance

```bash
# Fix issues regularly
bun run pkg:fix-all

# Validate configuration
bun run pkg:manage validate
```

## Troubleshooting

### Common Issues

#### Duplicate Dependencies

```bash
# Identify duplicates
bun run deps:why zod

# Solution: Update to consistent version
bun update zod@latest
```

#### Version Mismatches

```bash
# Check status
bun run version:status

# Sync versions
bun run version:sync
```

#### Package.json Errors

```bash
# Auto-fix issues
bun run pkg:fix

# Validate after fixes
bun run pkg:manage validate
```

## Performance Benchmarks

### Installation Speed (estimated improvements)

- **Before**: ~30s for full workspace install
- **After**: ~20s for full workspace install
- **Improvement**: 33% faster workspace installations

### Dependency Resolution

- **Before**: Ambiguous version resolution
- **After**: Predictable priority-based resolution
- **Benefit**: Reduced package conflicts

## Future Enhancements

### Planned Features

1. **Automated dependency updates** with testing
2. **Cross-workspace dependency tracking**
3. **Security vulnerability monitoring**
4. **Performance regression detection**

### Integration Opportunities

1. **CI/CD pipeline** integration
2. **GitHub Actions** automation
3. **Slack/Discord** notifications
4. **Grafana** dashboards for metrics

---

## CI/CD Integration with `bunx --package`

### Enhanced GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline
(`.github/workflows/enhanced-ci-bunx.yml`) that demonstrates best practices for
using `bunx --package` in automated environments:

```yaml
# Example CI/CD steps with explicit package references
- name: Type check with explicit TypeScript package
  run: bunx --package typescript tsc --noEmit

- name: Lint with explicit ESLint package
  run: bunx --package @typescript-eslint/eslint-plugin eslint . --ext .ts,.tsx

- name: Format check with explicit Prettier package
  run: bunx --package prettier prettier --check .

- name: Test with explicit Jest package
  run: bunx --package jest jest --coverage

- name: Bundle analysis with explicit tools
  run: |
    bunx --package webpack-bundle-analyzer webpack-bundle-analyzer dist/stats.json --mode static
    bunx --package source-map-explorer source-map-explorer 'dist/**/*.js' --html dist/report.html
```

### CI/CD Benefits

1. **Reproducible Builds** - Explicit package versions ensure consistent
   behavior
2. **Faster Execution** - No ambiguity about which package provides binaries
3. **Better Error Messages** - Clear identification of which tool failed
4. **Version Control** - Easy to update tool versions independently

## Interactive Package Management

### Enhanced manage-package.sh Features

```bash
# Show bunx --package usage examples
bun run pkg:manage bunx-examples

# Check availability of development tools
bun run pkg:manage check-tools

# Install common development tools
bun run pkg:manage install-tools

# Add script with bunx --package command
bun run pkg:manage add-script lint "bunx --package @typescript-eslint/eslint-plugin eslint --fix"
```

## Quick Reference Commands

```bash
# Enhanced Package Management with bunx --package
bun run pkg:get <field>                    # Get package.json field
bun run pkg:set <field>=<value>            # Set package.json field
bun run pkg:fix                            # Fix package.json issues
bun run pkg:manage <command>               # Interactive management with bunx examples

# Development Tools with Explicit Package References
bun run typecheck                          # bunx --package typescript tsc --noEmit
bun run lint                               # bunx --package @typescript-eslint/eslint-plugin eslint --fix
bun run format                             # bunx --package prettier prettier --write .
bun run test:jest                          # bunx --package jest jest --coverage

# Enhanced Dependency Analysis
bun run deps:analyze                       # Full dependency analysis with bunx --package jq
bun run deps:why <package>                 # Trace dependency chain
bun run deps:check-updates                 # bunx --package npm-check-updates ncu
bun run deps:update-interactive            # bunx --package npm-check-updates ncu -i
bun run security:audit                     # bunx --package npm-audit-resolver

# Bundle Analysis
bun run bundle:analyze                     # bunx --package webpack-bundle-analyzer
bun run bundle:source-map                  # bunx --package source-map-explorer

# Framework CLIs
bun run create:component                   # bunx --package @angular/cli ng generate component
bun run nest:new                           # bunx --package @nestjs/cli nest new
bun run vue:create                         # bunx --package @vue/cli vue create
bun run vite:build                         # bunx --package vite vite build

# Version Management
bun run version:status                     # Version status across workspaces
bun run version:sync                       # Sync versions

# Maintenance
bun run pkg:fix-all                        # Fix all workspace packages
bun run pkg:audit                          # Security audit
```

## Benefits Summary

This enhanced dependency management system with `bunx --package` support
provides:

1. **🎯 Explicit Control** - Clear specification of which package provides each
   binary
2. **🔄 Reproducible Builds** - Consistent execution across environments
3. **⚡ Performance** - No binary resolution ambiguity
4. **🛡️ Reliability** - Reduced failures due to missing or wrong tools
5. **📊 Better Analytics** - Enhanced dependency analysis with specialized tools
6. **🚀 Modern Workflows** - Leverages Bun's latest features for optimal
   development experience

This system provides a robust foundation for maintaining Fire22's complex
15-workspace structure while leveraging Bun's latest performance and usability
improvements with explicit package management.

## 📝 Editor Integration with `Bun.openInEditor()`

### Overview

Bun provides native editor integration through `Bun.openInEditor()`, allowing
seamless file opening from command-line scripts and development workflows.

### Configuration

Editor integration is configured in `bunfig.toml`:

```toml
[debug]
# Default editor for Bun.openInEditor()
# Auto-detects from $VISUAL or $EDITOR environment variables
# Override with specific editor: "code", "vscode", "subl", "vim", "nano"
editor = "code"
```

### Fire22 Editor Integration Tool

The project includes a comprehensive editor integration script
(`scripts/editor-integration.ts`) that demonstrates advanced
`Bun.openInEditor()` usage:

#### Basic Usage

```bash
# Open specific file
bun run editor open package.json

# Open file at specific line and column
bun run editor open src/index.ts --line 10 --column 5

# Override editor
bun run editor open tsconfig.json --editor vscode
```

#### Advanced Features

```bash
# List all project files
bun run editor:list

# Open configuration files
bun run editor:config                    # Opens package.json, bunfig.toml, tsconfig.json, etc.

# Open script files
bun run editor:scripts                   # Opens scripts directory files

# Open workspace files
bun run editor workspace api-client      # Opens workspace package.json, src files, README

# Open files with TypeScript errors (with line/column positioning)
bun run editor:errors                    # Runs tsc, parses errors, opens files at error locations
```

### TypeScript Error Navigation

The most powerful feature automatically opens files with TypeScript errors at
the exact error locations:

```bash
# Find and open TypeScript errors
bun run editor:errors
```

This command:

1. Runs `bunx --package typescript tsc --noEmit` to find errors
2. Parses error output to extract file paths, line numbers, and column positions
3. Opens each file in your editor positioned at the first error location
4. Provides a summary of errors found in each file

### Workspace Navigation

```bash
# Open workspace files
bun run editor workspace telegram-bot    # Opens @fire22-telegram-bot workspace files
bun run editor workspace api-client      # Opens @fire22-api-client workspace files
```

### Integration with Development Workflows

#### Combined with Dependency Analysis

```bash
# Analyze dependencies and open files for review
bun run deps:analyze
bun run editor:scripts                   # Review analysis scripts
```

#### Combined with Type Checking

```bash
# Check types and immediately open error files
bun run typecheck && echo "✅ No errors" || bun run editor:errors
```

#### Combined with Package Management

```bash
# Manage packages and open configuration
bun run pkg:manage info
bun run editor:config                    # Open config files for review
```

### Editor Integration API Examples

#### Basic File Opening

```typescript
// Open current file
const currentFile = import.meta.url;
Bun.openInEditor(currentFile);

// Open with specific editor
Bun.openInEditor('package.json', {
  editor: 'code',
});

// Open at specific position
Bun.openInEditor('src/index.ts', {
  editor: 'vscode',
  line: 10,
  column: 5,
});
```

#### Advanced Integration

```typescript
// Open files from TypeScript errors
async function openTypeScriptErrors() {
  const proc = Bun.spawn(
    ['bunx', '--package', 'typescript', 'tsc', '--noEmit'],
    {
      stderr: 'pipe',
    }
  );

  const errors = await new Response(proc.stderr).text();
  const errorPattern = /^(.+?)\((\d+),(\d+)\): error TS\d+:/gm;

  let match;
  while ((match = errorPattern.exec(errors)) !== null) {
    const [, filePath, line, column] = match;

    Bun.openInEditor(filePath, {
      line: parseInt(line),
      column: parseInt(column),
    });

    // Small delay between opens
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Supported Editors

- **VS Code**: `"code"` or `"vscode"`
- **Sublime Text**: `"subl"`
- **Vim**: `"vim"`
- **Nano**: `"nano"`
- **Auto-detection**: Uses `$VISUAL` or `$EDITOR` environment variables

### Benefits

1. **🚀 Faster Development** - Instantly jump to files from command line
2. **🎯 Precise Navigation** - Open files at exact error locations
3. **🔄 Workflow Integration** - Seamless integration with type checking,
   linting, analysis
4. **🏢 Workspace Support** - Navigate complex monorepo structures efficiently
5. **⚙️ Configurable** - Support for multiple editors and preferences

### Quick Reference Commands

```bash
# Editor Integration
bun run editor                           # Show help
bun run editor:list                      # List project files
bun run editor:config                    # Open config files
bun run editor:scripts                   # Open script files
bun run editor:errors                    # Open TypeScript error files
bun run editor:workspace <name>          # Open workspace files

# Direct Usage
bun run editor open <file>               # Open specific file
bun run editor open <file> --line <n>    # Open at line number
bun run editor workspace <name>          # Open workspace
bun run editor errors                    # Open error files
```

This editor integration enhances the development experience by providing
seamless navigation between command-line tools and your editor, making the
Fire22 monorepo development workflow significantly more efficient.

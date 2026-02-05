# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Essential Commands

### Core Development

```bash
# Install dependencies with Bun
bun install                      # Install all dependencies
bun install --frozen-lockfile    # CI-safe install from lockfile
bun install --production         # Production dependencies only

# Development servers
bun run dev                      # Start development server
bun run start                    # Production server

# Testing
bun test                         # Run all tests
bun test:unit                    # Unit tests only
bun test:integration            # Integration tests
bun test:coverage               # Generate coverage report
bun test:watch                  # Watch mode for TDD
bun test path/to/file.test.ts  # Run specific test file

# Type checking and linting
bun run lint                    # Run linter
bun run lint:fix               # Auto-fix linting issues
tsc --noEmit                   # TypeScript type checking

# Security scanning
bun run security:audit          # Full security audit
bun run security:bun-audit     # Bun native vulnerability scan
bun audit --audit-level=high   # Check for high/critical vulnerabilities
```

### Database Operations

```bash
bun run db:init                 # Initialize database
bun run db:migrate             # Run migrations
bun run db:seed                # Seed database
bun run db:backup              # Create database backup
bun run db:health              # Check database health
```

### Registry & Package Management

```bash
bun run registry:test          # Test registry connectivity
bun run registry:fix           # Fix registry connection issues
bun run registry:status        # Check registry status
bun run registry:auth:setup    # Setup registry authentication
```

### Build & Deployment

```bash
bun run build:all              # Build all packages
bun run changeset:create       # Create changeset for release
bun run changeset:version      # Bump versions with changelog
bun run changeset:publish      # Publish to registries
```

## Dependency Management

### Dependency Types

The project uses different dependency categories for proper package
organization:

#### Dependencies (Regular)

Standard runtime dependencies required for the application to function:

```bash
bun add zod                    # Adds to "dependencies"
bun add react@18.2.0           # Specific version
```

**Current usage**: `zod`, `react`, `react-dom`

#### DevDependencies (--dev, -d, -D)

Packages only needed during development/build time:

```bash
bun add --dev @types/bun       # TypeScript types
bun add -d eslint              # Linting tools
bun add -D stylelint           # Style linting
```

**Current usage**: `@types/bun`, `license-checker`, `snyk`, `stylelint`,
`bun-types`, `marked`

#### OptionalDependencies (--optional)

Packages that may fail to install without breaking the build:

```bash
bun add --optional sharp       # Image processing (platform-specific)
bun add --optional fsevents    # macOS file watching
```

**Current usage**: `@swc/core`, `esbuild`, `sharp`, `fsevents`
(platform-specific tools)

#### PeerDependencies (--peer)

Packages that should be provided by the host/consumer:

```bash
bun add --peer @types/react    # Expects host to provide React types
bun add --peer bun             # Minimum Bun version requirement
```

**Current usage**: `@types/react: ^19.1.12`, `bun: >=1.2.21`

### Installation Commands

#### Version Control

```bash
# Exact version (no caret/tilde)
bun add react --exact          # Installs exactly 18.2.0
bun add react -E               # Short form

# Version ranges (default in this project)
bun add zod                    # Installs with caret (^3.22.4)
bun add zod@^3.0.0            # Specific range
bun add zod@latest            # Latest version
```

#### Global Packages (--global, -g)

Install command-line tools globally without modifying project package.json:

```bash
bun add --global bunx          # Global CLI tool
bun add -g typescript          # Global TypeScript compiler
```

**Global paths** (configured in bunfig.toml):

- Install directory: `~/.bun/install/global`
- Binary directory: `~/.bun/bin`

#### Workspace-Specific Installation

```bash
# Install in specific workspace
cd dashboard-worker && bun add package-name

# Install across all workspaces
bun install --filter='@fire22/*'
```

### Trusted Dependencies

Packages allowed to run lifecycle scripts (postinstall, etc.) for security:

**Currently trusted** (in bunfig.toml):

```toml
[install.trustedDependencies]
esbuild = "*"           # Bundler - all versions
vite = "^5.0.0"        # Dev server - v5.x
playwright-core = "*"   # Testing framework
typescript = "^5.0.0"   # TypeScript compiler
```

To add a new trusted dependency:

1. Add to bunfig.toml under `[install.trustedDependencies]`
2. Or add to package.json: `"trustedDependencies": ["package-name"]`

### Version Management Strategy

#### Current Configuration

- **bunfig.toml**: `exact = false` - Uses caret ranges for flexibility
- **Mixed patterns in use**:
  - Exact: `"react": "18.2.0"` (critical dependencies)
  - Range: `"zod": "^3.22.4"` (flexible updates)
  - Latest: `"@types/bun": "latest"` (always current)

#### When to Use Each Pattern

- **Exact versions**: Production-critical packages, React/React-DOM pairs
- **Caret ranges (^)**: Most dependencies, allows patch/minor updates
- **Tilde ranges (~)**: When only patch updates are safe
- **Latest**: Type definitions, development tools

### Common Dependency Operations

#### Adding Dependencies

```bash
# Development dependency for security scanning
bun add -d snyk license-checker

# Optional build tools
bun add --optional @swc/core esbuild

# Peer dependency for type compatibility
bun add --peer @types/react

# Exact version for stability
bun add react@18.2.0 --exact
```

#### Updating Dependencies

```bash
# Check outdated packages
bun outdated

# Update all dependencies
bun update

# Update specific package
bun update zod

# Interactive update
bun update -i
```

#### Security Operations

```bash
# Audit with specific level
bun audit --audit-level=high --prod

# Install security tools as dev dependencies
bun run security:install-tools  # Runs: bun add -d snyk license-checker
```

## High-Level Architecture

### Fantasy42-Fire22 Enterprise Platform

A massive enterprise-grade fantasy sports & betting platform with 35+ domains,
4000+ files, and comprehensive leadership framework.

**Core Technologies**: Bun v1.2+, TypeScript 5.0+, Cloudflare Workers, SQLite/D1

### Main Components

#### 1. Root Project (`/`)

- **Purpose**: Enterprise package registry and monorepo orchestrator
- **Key Features**: Security scanning, package management, cross-platform builds
- **Version**: 5.1.0
- **Architecture**: Domain-Driven Design with Crystal Clear Architecture
  patterns

#### 2. Dashboard Worker (`/dashboard-worker`)

- **Purpose**: Multi-workspace dashboard system with Pattern Weaver architecture
- **Workspaces**: 15 specialized @fire22-\* workspaces
- **Key Systems**:
  - Pattern Weaver: 13 unified patterns for code organization
  - Multi-workspace orchestration with isolated dependencies
  - Real-time dashboard with SSE streaming
  - Fire22 platform integration (2600+ customers, 8-level agent hierarchy)
  - Telegram bot integration with P2P queue system
  - DNS performance optimization (sub-millisecond resolution)

#### 3. Enterprise Packages (`/enterprise/packages`)

- **Security**: Security scanner, core security, fraud detection
- **Dashboard**: Complete dashboard worker duplicate
- **Betting**: Betting engine, wager system
- **Compliance**: Compliance checker and core
- **Analytics**: Analytics dashboard
- **Benchmarking**: Performance benchmarking suite

### Architecture Patterns

#### Domain-Driven Design

- **Domains**: `/src/domains/` - betting, core domains
- **Services**: `/src/services/` - error handling, integrations, websockets
- **API**: `/src/api/` - Fantasy402 endpoints, dashboard routes

#### Pattern Weaver System (Dashboard Worker)

13 interconnected patterns: LOADER, STYLER, TABULAR, SECURE, TIMING, BUILDER,
VERSIONER, SHELL, BUNX, INTERACTIVE, STREAM, FILESYSTEM, UTILITIES

#### Workspace Strategy

- **Isolation**: Bun-isolated linker for strict dependency management
- **Orchestration**: Coordinated builds across 15+ workspaces
- **Cross-registry**: npm, Cloudflare Workers, private registries

### Configuration Management

#### Bun Configuration (`bunfig.toml`)

- **Test Runner**: Parallel execution, 4 workers, 10s timeout
- **Package Management**: Isolated linker, trusted dependencies
- **Network**: 48 concurrent connections, DNS caching
- **Build Profiles**: 9 profiles from development to cross-platform executables
- **Security**: Optional scanning, audit levels, trusted packages

#### Environment Strategy

- **Hierarchy**: CLI args > Environment vars > config files > defaults
- **Environments**: development, staging, production, test, demo, canary
- **Secrets**: Bun.secrets for OS-native credential storage

### Performance Optimizations

- **DNS Prefetching**: Fire22 domains resolved at startup
- **Build Speed**: 96.6% faster than traditional Node.js builds
- **Memory Management**: < 256MB worker limits with heap monitoring
- **Cold Start**: < 50ms initialization with edge optimization
- **Caching**: Multi-layer with 85%+ hit rates

### Security Features

- **Supply Chain**: Built-in vulnerability scanning
- **Credential Management**: Native Bun.secrets integration
- **Registry Security**: Scoped authentication for @fire22/_, @ff/_,
  @enterprise/\*
- **Git Hooks**: Lefthook for pre-commit/pre-push validation
- **Audit Levels**: Configurable from moderate to critical

### Testing Strategy

- **Test Patterns**: `**/*.test.ts`, `**/*.spec.ts`, `testing/**/*.ts`
- **Coverage**: Target 80%+ with lcov reporting
- **Parallel Execution**: 4 workers by default
- **Test Types**: unit, integration, e2e, performance, comprehensive

### Key Integration Points

#### Fantasy402 Integration

- **API Endpoints**: Live wagers, agent hierarchy, customer sync
- **WebSocket**: Real-time updates for betting operations
- **Configuration**: Detailed in `FANTASY402-INTEGRATION-GUIDE.md`

#### Fire22 Platform

- **Customer Management**: 2600+ records with live sync
- **Agent System**: 8-level hierarchy with permission matrix
- **API Security**: JWT authentication, rate limiting
- **Performance**: Sub-millisecond DNS, < 50ms API responses

## Important Notes

1. **Bun-First Development**: Uses Bun runtime features extensively - avoid
   Node.js patterns
2. **Monorepo Complexity**: 128+ package.json files across enterprise structure
3. **Security Priority**: All commits require GPG signing, comprehensive audit
   trails
4. **Performance Critical**: Real-time betting requires sub-100ms response times
5. **Multi-Workspace**: Sophisticated orchestration across 15+ workspaces
6. **DNS Excellence**: Proactive prefetching for 50-200ms → 1-10ms improvement
7. **Pattern-Based**: All features connect through Pattern Weaver system
8. **Cross-Platform**: Linux/Windows/macOS executable generation
9. **Real-Time Systems**: SSE streaming, live Fire22 sync, WebSocket
   communications
10. **Enterprise Scale**: Handles thousands of concurrent operations

## Development Workflow

### Starting Development

1. `bun install --frozen-lockfile` - Install dependencies
2. `bun run db:init` - Initialize database
3. `bun run dev` - Start development server
4. `bun test --watch` - Run tests in watch mode

### Before Committing

1. `bun run lint:fix` - Fix linting issues
2. `tsc --noEmit` - Check TypeScript types
3. `bun test` - Run all tests
4. `bun audit --audit-level=high` - Security check

### Release Process

1. `bun run changeset:create` - Create changeset
2. `bun run changeset:version` - Update versions
3. `git commit -S -m "chore: release"` - Signed commit
4. `bun run changeset:publish` - Publish packages

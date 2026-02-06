# /pm - Bun Package Manager

Bun-native package management with workspace targeting, supply chain protection, and dependency analysis.

## Quick Reference

### 📦 Install Commands
| Command | Alias | Description |
|---------|-------|-------------|
| `bun install` | `bun i` | Install all deps from lockfile |
| `bun install --frozen-lockfile` | `bun ci` | CI mode (fail if lockfile changes) |
| `bun install --production` | `-p` | Skip devDependencies |
| `bun install --dry-run` | | Preview without installing |

### ➕ Add Packages
| Command | Flag | Description |
|---------|------|-------------|
| `bun add <pkg>` | | Add to dependencies |
| `bun add -D <pkg>` | `--dev` | Add to devDependencies |
| `bun add -E <pkg>` | `--exact` | Pin exact version (no ^) |
| `bun add --optional <pkg>` | | Add to optionalDependencies |

### 🔒 Supply Chain Protection
| Flag | Value | Description |
|------|-------|-------------|
| `--min-age` | `3d` | Only packages published 3+ days ago |
| `--trust` | `<pkg>` | Add to trustedDependencies |
| `--frozen-lockfile` | | Disallow lockfile changes |

### 🏢 Workspace Targeting
| Flag | Pattern | Description |
|------|---------|-------------|
| `-f, --filter` | `@scope/pkg` | Target specific workspace |
| `-f, --filter` | `apps/*` | Glob pattern match |
| `-f, --filter` | `!legacy` | Exclude matching workspaces |
| `-W, --workspaces` | | Apply to all workspaces |

### 🔍 Inspection
| Command | Description |
|---------|-------------|
| `bun pm ls` | List workspaces |
| `bun pm why <pkg>` | Why is this installed? |
| `bun pm outdated` | Check for updates |
| `bun pm audit` | Security audit |
| `bun pm hash` | Lockfile hash (CI verification) |

### ⚡ Quick Combos
```bash
bun i -p --audit              # Production + security
bun add zod -E --min-age 3d   # Exact + supply chain
bun run build -f '*' --concurrent  # All workspaces parallel
```

## Inspection Commands

```bash
dev-hq pm ls                         # List workspaces
dev-hq pm ls -g                      # List global packages
dev-hq pm why caniuse-lite           # Why is this installed?
dev-hq pm outdated                   # Check for updates
dev-hq pm graph                      # DOT format dep graph
dev-hq pm graph | dot -Tpng > deps.png  # Render with graphviz
dev-hq pm analyze zod                # Full package analysis
```

## Maintenance Commands

```bash
dev-hq pm audit                      # Security audit
dev-hq pm cache clear                # Clear package cache
dev-hq pm cache list                 # Show cache contents
dev-hq pm cache path                 # Show cache directory
dev-hq pm hash                       # Lockfile hash (CI verification)
dev-hq pm trust sharp                # Trust package lifecycle scripts
dev-hq pm bin                        # Show local bin path
dev-hq pm bin -g                     # Show global bin path
dev-hq pm completion bash            # Generate shell completions
```

## Flags Reference

### General

| Flag | Short | Description |
|------|-------|-------------|
| `--dry-run` | `-d` | Simulate without installing |
| `--json` | `-j` | Output JSON format |
| `--help` | `-h` | Show help |

### Workspace Targeting

| Flag | Short | Description |
|------|-------|-------------|
| `--filter <pattern>` | `-f` | Target workspace(s): `@scope/pkg`, `!legacy`, `apps/*` |
| `--workspaces` | `-W` | Apply to all workspaces |

### Install Options

| Flag | Short | Description |
|------|-------|-------------|
| `--frozen-lockfile` | - | Error if lockfile needs update (CI-safe) |
| `--production` | `-p` | Skip devDependencies |
| `--audit` | `-a` | Run security audit after install |

### Run Options

| Flag | Short | Description |
|------|-------|-------------|
| `--watch` | `-w` | Re-run on file changes |
| `--concurrent` | - | Run filtered scripts in parallel |

### Dependency Type

| Flag | Short | Description |
|------|-------|-------------|
| `--save-dev` | `-D` | Add as devDependency |
| `--save-exact` | `-E` | Save exact version (no ^ or ~) |
| `--global` | `-g` | Install/list globally |

### Bun 1.3.6+ Installation Strategy

| Flag | Values | Description |
|------|--------|-------------|
| `--strategy` | `hoisted`, `isolated` | Linker mode (flat vs per-package) |
| `--min-age` | `3d`, `1w`, `86400` | Supply chain protection |
| `--platform` | `linux-arm64`, `darwin-x64` | Cross-platform build |
| `--backend` | `clonefile`, `hardlink`, `symlink`, `copyfile` | Install backend |

## Workflow Examples

### CI/CD Pipeline

```bash
# Frozen install + security audit
dev-hq pm install --frozen-lockfile -p --audit

# Verify lockfile hash
EXPECTED="abc123..."
ACTUAL=$(dev-hq pm hash)
[[ "$ACTUAL" == "$EXPECTED" ]] || exit 1
```

### Monorepo Workspace Operations

```bash
# Install deps for specific workspace
dev-hq pm install -f @enterprise/dataview

# Build all except legacy in parallel
dev-hq pm run build -f '!@enterprise/legacy' --concurrent

# Add dependency to workspace
dev-hq pm add zod -f @enterprise/dataview
```

### Supply Chain Protection

```bash
# Only install packages published 3+ days ago
dev-hq pm add lodash --min-age 3d

# Use isolated linker (no phantom dependencies)
dev-hq pm install --strategy isolated
```

### Dependency Visualization

```bash
# Generate and render dependency graph
dev-hq pm graph > deps.dot
dot -Tsvg deps.dot > deps.svg

# Or pipe directly
dev-hq pm graph | dot -Tpng > deps.png
```

### Package Analysis (Dry Run)

```bash
# Full analysis: deps tree, security, disk impact
dev-hq pm analyze zod

# Custom analysis flags
dev-hq pm add zod -d --tree --size --audit
```

### Shell Completions

```bash
# Install completions
dev-hq pm completion bash >> ~/.bashrc
dev-hq pm completion zsh >> ~/.zshrc
dev-hq pm completion fish > ~/.config/fish/completions/dev-hq.fish
```

## Direct Bun Commands

For operations not wrapped by dev-hq:

```bash
# Link workflow
bun link                         # Register current package
bun link my-pkg --save           # Link into project

# Cache
bun pm cache rm                  # Clear entire cache

# Global packages
bun pm ls -g                     # List global

# Lockfile
bun pm hash                      # Print hash
bun pm hash-string               # Print as string
```

## package.json Protocol Specifiers

```json
{
  "dependencies": {
    "lodash": "^4.17.21",           // npm registry
    "my-lib": "link:my-lib",        // bun link
    "local": "file:../local-pkg",   // local path
    "workspace-pkg": "workspace:*", // workspace
    "git-pkg": "git+https://...",   // git
    "tarball": "https://.../x.tgz"  // tarball URL
  }
}
```

## bunfig.toml Configuration

```toml
[install]
# Trusted packages (can run lifecycle scripts)
trustedDependencies = ["sharp", "esbuild"]

# Default linker strategy
linker = "isolated"

# Install backend
backend = "clonefile"  # macOS default, fastest

# Supply chain protection
minimumReleaseAge = 259200  # 3 days in seconds
```

## Actions

When user runs `/pm`:
1. Show this reference for quick lookup
2. If arguments provided, execute via `dev-hq pm <args>`
3. Suggest workspace filters for monorepo operations
4. Recommend `--frozen-lockfile` for CI environments
5. Suggest `--min-age` for security-conscious installs

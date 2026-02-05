# Bun Isolated Installs

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Isolated Installs Documentation](https://bun.com/docs/pm/isolated-installs)

## Overview

Bun provides an alternative package installation strategy called **isolated installs** that creates strict dependency isolation similar to pnpm's approach. This mode prevents phantom dependencies and ensures reproducible, deterministic builds.

**This is the default installation strategy for new workspace/monorepo projects** (with `configVersion = 1` in the lockfile). Existing projects continue using hoisted installs unless explicitly configured.

---

## What are Isolated Installs?

Isolated installs create a non-hoisted dependency structure where packages can only access their explicitly declared dependencies. This differs from the traditional "hoisted" installation strategy used by npm and Yarn, where dependencies are flattened into a shared `node_modules` directory.

### Key Benefits

- ✅ **Prevents phantom dependencies** — Packages cannot accidentally import dependencies they haven't declared
- ✅ **Deterministic resolution** — Same dependency tree regardless of what else is installed
- ✅ **Better for monorepos** — Workspace isolation prevents cross-contamination between packages
- ✅ **Reproducible builds** — More predictable resolution behavior across environments

---

## Using Isolated Installs

### Command Line

Use the `--linker` flag to specify the installation strategy:

```bash
# Use isolated installs
bun install --linker isolated

# Use traditional hoisted installs
bun install --linker hoisted
```

### Configuration File

Set the default linker strategy in your `bunfig.toml` or globally in `$HOME/.bunfig.toml`:

```toml
[install]
linker = "isolated"
```

**Current Project Configuration** (`config/bunfig.toml`):
```toml
[install]
linker = "isolated"  # Options: "isolated" (default for workspaces), "hoisted"
```

### Default Behavior

The default linker strategy depends on your project's lockfile `configVersion`:

| `configVersion` | Using workspaces? | Default Linker |
|-----------------|-------------------|----------------|
| `1`             | ✅                | `isolated`     |
| `1`             | ❌                | `hoisted`      |
| `0`             | ✅                | `hoisted`      |
| `0`             | ❌                | `hoisted`      |

**New projects**: Default to `configVersion = 1`. In workspaces, v1 uses the isolated linker by default; otherwise it uses hoisted linking.

**Existing Bun projects (made pre-v1.3.2)**: If your existing lockfile doesn't have a version yet, Bun sets `configVersion = 0` when you run `bun install`, preserving the previous hoisted linker default.

**Migrations from other package managers**:
- From pnpm: `configVersion = 1` (using isolated installs in workspaces)
- From npm or yarn: `configVersion = 0` (using hoisted installs)

You can override the default behavior by explicitly specifying the `--linker` flag or setting it in your configuration file.

---

## How Isolated Installs Work

### Directory Structure

Instead of hoisting dependencies, isolated installs create a two-tier structure:

```
node_modules/
├── .bun/                          # Central package store
│   ├── package@1.0.0/             # Versioned package installations
│   │   └── node_modules/
│   │       └── package/           # Actual package files
│   ├── @scope+package@2.1.0/      # Scoped packages (+ replaces /)
│   │   └── node_modules/
│   │       └── @scope/
│   │           └── package/
│   └── ...
└── package-name -> .bun/package@1.0.0/node_modules/package  # Symlinks
```

### Resolution Algorithm

1. **Central store** — All packages are installed in `node_modules/.bun/package@version/` directories
2. **Symlinks** — Top-level `node_modules` contains symlinks pointing to the central store
3. **Peer resolution** — Complex peer dependencies create specialized directory names
4. **Deduplication** — Packages with identical package IDs and peer dependency sets are shared

### Workspace Handling

In monorepos, workspace dependencies are handled specially:

- **Workspace packages** — Symlinked directly to their source directories, not the store
- **Workspace dependencies** — Can access other workspace packages in the monorepo
- **External dependencies** — Installed in the isolated store with proper isolation

---

## Comparison with Hoisted Installs

| Aspect                    | Hoisted (npm/Yarn)                         | Isolated (pnpm-like)                    |
|---------------------------|--------------------------------------------|------------------------------------------|
| **Dependency access**     | Packages can access any hoisted dependency | Packages only see declared dependencies |
| **Phantom dependencies**  | ❌ Possible                                 | ✅ Prevented                             |
| **Disk usage**            | ✅ Lower (shared installs)                  | ✅ Similar (uses symlinks)               |
| **Determinism**           | ❌ Less deterministic                       | ✅ More deterministic                    |
| **Node.js compatibility** | ✅ Standard behavior                        | ✅ Compatible via symlinks               |
| **Best for**              | Single projects, legacy code               | Monorepos, strict dependency management |

---

## Advanced Features

### Peer Dependency Handling

Isolated installs handle peer dependencies through sophisticated resolution:

```
# Package with peer dependencies creates specialized paths
node_modules/.bun/package@1.0.0_react@18.2.0/
```

The directory name encodes both the package version and its peer dependency versions, ensuring each unique combination gets its own installation.

### Backend Strategies

Bun uses different file operation strategies for performance:

- **Clonefile** (macOS) — Copy-on-write filesystem clones for maximum efficiency
- **Hardlink** (Linux/Windows) — Hardlinks to save disk space
- **Copyfile** (fallback) — Full file copies when other methods aren't available

### Debugging Isolated Installs

Enable verbose logging to understand the installation process:

```bash
bun install --linker isolated --verbose
```

This shows:
- Store entry creation
- Symlink operations
- Peer dependency resolution
- Deduplication decisions

---

## Troubleshooting

### Compatibility Issues

Some packages may not work correctly with isolated installs due to:

- **Hardcoded paths** — Packages that assume a flat `node_modules` structure
- **Dynamic imports** — Runtime imports that don't follow Node.js resolution
- **Build tools** — Tools that scan `node_modules` directly

If you encounter issues, you can:

1. **Switch to hoisted mode** for specific projects:

   ```bash
   bun install --linker hoisted
   ```

2. **Report compatibility issues** to help improve isolated install support

### Performance Considerations

- **Install time** — May be slightly slower due to symlink operations
- **Disk usage** — Similar to hoisted (uses symlinks, not file copies)
- **Memory usage** — Higher during install due to complex peer resolution

---

## Migration Guide

### From npm/Yarn

```bash
# Remove existing node_modules and lockfiles
rm -rf node_modules package-lock.json yarn.lock

# Install with isolated linker
bun install --linker isolated
```

### From pnpm

Isolated installs are conceptually similar to pnpm, so migration should be straightforward:

```bash
# Remove pnpm files
rm -rf node_modules pnpm-lock.yaml

# Install with Bun's isolated linker
bun install --linker isolated
```

The main difference is that Bun uses symlinks in `node_modules` while pnpm uses a global store with symlinks.

---

## When to Use Isolated Installs

**Use isolated installs when:**

- ✅ Working in monorepos with multiple packages
- ✅ Strict dependency management is required
- ✅ Preventing phantom dependencies is important
- ✅ Building libraries that need deterministic dependencies

**Use hoisted installs when:**

- ⚠️ Working with legacy code that assumes flat `node_modules`
- ⚠️ Compatibility with existing build tools is required
- ⚠️ Working in environments where symlinks aren't well supported
- ⚠️ You prefer the simpler traditional npm behavior

---

## Project Configuration

### Current Setup

**File**: `config/bunfig.toml`
```toml
[install]
linker = "isolated"  # Default for workspaces
```

**Lockfile**: `bun.lockb`
- `configVersion: 1` (modern workspace format)
- Uses isolated installs by default for workspaces

**Workspaces**: `bench/` (auto-detected)

### Verification

```bash
# Check current linker configuration
cat config/bunfig.toml | grep linker

# Verify lockfile version
bun pm ls

# Test isolated installs
bun install --linker isolated --verbose
```

---

## Related Documentation

- [Bun Workspaces](./BUN-WORKSPACES.md) — Monorepo workspace management
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Complete lockfile and lifecycle script guide
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) — Complete bunfig.toml reference
- [Developer Workspace](./WORKSPACE-BUN-V1.3.4-INTEGRATION.md) — Workspace API key management

---

## Search Commands

```bash
# Find isolated install configuration
rg "isolated" config/bunfig.toml

# Find linker settings
rg "linker" config/bunfig.toml

# Check lockfile version
rg "configVersion" bun.lockb  # Binary file, may need hexdump

# Find workspace configuration
rg "workspaces" package.json
```

---

**Status**: ✅ Configured (`linker = "isolated"`)  
**Lockfile Version**: `configVersion: 1` (modern workspace format)  
**Default for Workspaces**: Yes (automatic)  
**Benefits**: Phantom dependency prevention, deterministic builds, workspace isolation

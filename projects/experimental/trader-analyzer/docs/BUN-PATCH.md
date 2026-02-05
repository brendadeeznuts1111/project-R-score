# Bun Patch - Persistent Package Patching

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Patch Documentation](https://bun.com/docs/pm/cli/patch)

## Overview

`bun patch` lets you persistently patch `node_modules` packages in a maintainable, git-friendly way. This allows you to make small changes to dependencies without vendoring the entire package.

---

## What is `bun patch`?

`bun patch` enables you to:
- Make temporary fixes to packages in `node_modules`
- Generate `.patch` files that can be committed to git
- Reuse patches across multiple installs, projects, and machines
- Preserve Bun's Global Cache integrity

---

## How It Works

### Step 1: Prepare Package for Patching

```bash
# Prepare a package for patching
bun patch <package>

# Examples
bun patch react
bun patch react@17.0.2
bun patch node_modules/react
```

**Important**: Always call `bun patch <pkg>` first! This ensures the package folder in `node_modules/` contains a fresh copy with no symlinks/hardlinks to Bun's cache. If you forget, you might edit the package globally in the cache!

### Step 2: Edit the Package

After preparing, you can safely edit files in `node_modules/<package>/`:

```bash
# Example: Edit a file in the patched package
vim node_modules/react/index.js
# or
code node_modules/react/index.js
```

### Step 3: Commit Your Changes

Once you're happy with your changes, commit the patch:

```bash
# Commit patch (generates .patch file in patches/)
bun patch --commit <package>

# Examples
bun patch --commit react
bun patch --commit react@17.0.2
bun patch --commit node_modules/react

# Custom patches directory
bun patch --commit react --patches-dir=mypatches

# Alternative command (pnpm compatibility)
bun patch-commit react
```

**What happens**:
- Generates a `.patch` file in `patches/` (or custom directory)
- Updates `package.json` with `patchedDependencies` entry
- Updates lockfile
- Bun starts using the patched package on future installs

---

## Features

### Git-Friendly

- `.patch` files can be committed to your repository
- Patches are tracked in `package.json` under `patchedDependencies`
- Works across multiple installs, projects, and machines

### Cache Integrity

- Preserves Bun's Global Cache integrity
- Creates unlinked clone of package in `node_modules`
- Diff is computed against original package in cache

### Disk Space Efficient

- Patched packages are committed to Global Cache
- Shared across projects where possible
- Keeps `bun install` fast

---

## CLI Usage

### Basic Commands

```bash
# Prepare package for patching
bun patch <package>@<version>

# Commit patch
bun patch --commit <package>

# Custom patches directory
bun patch --commit <package> --patches-dir=<dir>
```

### Options

#### Patch Generation

- `--commit`: Generate `.patch` file and update `package.json`
- `--patches-dir <dir>`: Custom directory for patch files (default: `patches/`)

#### Dependency Management

- `--production`: Don't install devDependencies
- `--ignore-scripts`: Skip lifecycle scripts
- `--trust`: Add to `trustedDependencies`

#### Installation Control

- `--force`: Reinstall all dependencies
- `--dry-run`: Don't install anything
- `--linker`: Linker strategy (`isolated` or `hoisted`)

---

## Example Workflow

### 1. Prepare Package

```bash
bun patch react
```

**Output**:
```
Prepared react@18.2.0 for patching
You can now edit files in node_modules/react/
```

### 2. Make Changes

```bash
# Edit the package
vim node_modules/react/index.js

# Or use your editor
code node_modules/react/
```

### 3. Test Changes

```bash
# Test your changes
bun test
# or
bun run dev
```

### 4. Commit Patch

```bash
bun patch --commit react
```

**Output**:
```
Created patches/react@18.2.0.patch
Updated package.json (patchedDependencies)
Updated bun.lock
```

### 5. Verify

Check `package.json`:

```json
{
  "patchedDependencies": {
    "react@18.2.0": "patches/react@18.2.0.patch"
  }
}
```

Check `patches/` directory:

```bash
ls patches/
# react@18.2.0.patch
```

---

## Real-World Use Cases

### 1. Fix a Bug in a Dependency

```bash
# Prepare
bun patch lodash

# Fix the bug
vim node_modules/lodash/index.js

# Test
bun test

# Commit
bun patch --commit lodash
```

### 2. Add a Feature

```bash
# Prepare
bun patch @types/node

# Add feature
code node_modules/@types/node/

# Commit
bun patch --commit @types/node
```

### 3. Temporary Workaround

```bash
# Prepare
bun patch some-broken-package

# Add workaround
vim node_modules/some-broken-package/fix.js

# Commit
bun patch --commit some-broken-package
```

---

## Best Practices

### 1. Always Prepare First

**Never skip** `bun patch <pkg>`:

```bash
# ✅ Correct
bun patch react
# Edit files...
bun patch --commit react

# ❌ Wrong (edits global cache!)
# Edit files directly...
bun patch --commit react
```

### 2. Test Before Committing

Always test your changes before committing:

```bash
bun patch react
# Make changes...
bun test  # Test changes
bun patch --commit react  # Only commit if tests pass
```

### 3. Keep Patches Small

- Only patch what's necessary
- Document why the patch exists
- Consider upstream PRs for permanent fixes

### 4. Review Patches Regularly

- Check if upstream has fixed the issue
- Update patches when dependencies update
- Remove patches when no longer needed

### 5. Commit Patch Files

Always commit `.patch` files to git:

```bash
git add patches/
git commit -m "Add patch for react bug fix"
```

---

## Troubleshooting

### Patch Not Applied

**Problem**: Changes not appearing after `bun install`

**Solution**:
1. Verify `patchedDependencies` in `package.json`
2. Check patch file exists in `patches/`
3. Run `bun install` again

### Patch Conflicts

**Problem**: Patch fails to apply after dependency update

**Solution**:
1. Re-prepare: `bun patch <package>`
2. Re-apply your changes
3. Commit: `bun patch --commit <package>`

### Global Cache Issues

**Problem**: Changes affect other projects

**Solution**:
- Always use `bun patch <pkg>` before editing
- Never edit packages directly without preparing first

---

## Integration with Visualizer

The interactive visualizer (`examples/bun-isolated-installs-interactive.html`) includes:

- **Prepare Patch**: Input field + button
- **Commit Patch**: Checkbox + patches directory option
- **Visual Feedback**: Output display with patch file location
- **Command Display**: Shows exact command to run

**See**: Interactive visualizer for one-click patch operations.

---

## Related Documentation

- [Bun PM](./BUN-PM.md) — Package manager utilities
- [Bun Workspaces](./BUN-WORKSPACES.md) — Monorepo workspace management
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Lockfile format

---

## Search Commands

```bash
# Find patched dependencies
rg "patchedDependencies" package.json

# List patch files
ls patches/

# Find patch usage
rg "bun patch" scripts/
```

---

**Status**: ✅ Available (Bun v1.3.4+)  
**Use Case**: Fix bugs, add features, temporary workarounds in dependencies  
**Best Practice**: Always prepare first, test before committing, keep patches small

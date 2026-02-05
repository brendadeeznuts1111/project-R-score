# Bun Link - Local Package Linking

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Link Documentation](https://bun.com/docs/pm/link)

## Overview

`bun link` allows you to link local packages for development, creating symlinks in `node_modules` that point to local directories. This is useful for developing packages outside of a monorepo or for testing packages before publishing.

---

## What is `bun link`?

`bun link` creates a global registry of "linkable" packages that can be symlinked into other projects. This differs from the `workspace:` protocol, which is specifically for monorepo workspace packages.

### Key Differences

| Feature | `bun link` | `workspace:` Protocol |
|---------|------------|----------------------|
| **Scope** | Global (system-wide) | Local (monorepo only) |
| **Use Case** | External packages, testing | Monorepo workspace packages |
| **Registration** | `bun link` (global registry) | Automatic (workspace config) |
| **Syntax** | `link:package-name` | `workspace:*` or `workspace:1.0.2` |
| **Location** | Anywhere on filesystem | Within monorepo |

---

## How to Use `bun link`

### 1. Register a Package

In the package directory you want to link:

```bash
cd /path/to/cool-pkg
bun link
```

**Output**:
```
bun link v1.3.3 (7416672e)
Success! Registered "cool-pkg"

To use cool-pkg in a project, run:
  bun link cool-pkg

Or add it in dependencies in your package.json file:
  "cool-pkg": "link:cool-pkg"
```

### 2. Link into a Project

In the project where you want to use the linked package:

```bash
cd /path/to/my-app
bun link cool-pkg
```

This creates a symlink in `node_modules/cool-pkg` pointing to `/path/to/cool-pkg`.

### 3. Add to package.json (Optional)

Use the `--save` flag to automatically add it to `package.json`:

```bash
bun link cool-pkg --save
```

This adds:
```json
{
  "dependencies": {
    "cool-pkg": "link:cool-pkg"
  }
}
```

### 4. Unlink a Package

To unregister a linked package:

```bash
cd /path/to/cool-pkg
bun unlink
```

To remove a link from a project:

```bash
cd /path/to/my-app
bun unlink cool-pkg
```

---

## Use Cases

### 1. Developing External Packages

When developing a package that's not part of your monorepo:

```bash
# In your package directory
cd ~/projects/my-package
bun link

# In your app directory
cd ~/projects/my-app
bun link my-package
```

### 2. Testing Before Publishing

Test a package locally before publishing to npm:

```bash
# Register package
cd ~/projects/new-package
bun link

# Test in multiple projects
cd ~/projects/test-app-1
bun link new-package

cd ~/projects/test-app-2
bun link new-package
```

### 3. Global Linking

Link packages globally for CLI tools:

```bash
cd ~/projects/my-cli-tool
bun link --global
```

---

## CLI Options

### Installation Scope

```bash
# Link globally
bun link cool-pkg --global
bun link cool-pkg -g
```

### Dependency Management

```bash
# Don't install devDependencies
bun link cool-pkg --production
bun link cool-pkg -p

# Exclude specific dependency types
bun link cool-pkg --omit dev
bun link cool-pkg --omit optional
bun link cool-pkg --omit peer
```

### Project Files & Lockfiles

```bash
# Write yarn.lock file
bun link cool-pkg --yarn

# Don't update package.json
bun link cool-pkg --no-save

# Save to package.json (default)
bun link cool-pkg --save

# Add to trustedDependencies
bun link cool-pkg --trust
```

### Installation Control

```bash
# Force reinstall
bun link cool-pkg --force
bun link cool-pkg -f

# Skip lifecycle scripts
bun link cool-pkg --ignore-scripts

# Dry run (don't install)
bun link cool-pkg --dry-run

# Use specific linker
bun link cool-pkg --linker isolated
bun link cool-pkg --linker hoisted
```

### Network & Registry

```bash
# Use specific registry
bun link cool-pkg --registry https://registry.example.com

# Custom CA certificate
bun link cool-pkg --ca /path/to/cert.pem
bun link cool-pkg --cafile /path/to/cert.pem

# Network concurrency
bun link cool-pkg --network-concurrency 32
```

### Performance & Resource

```bash
# Concurrent scripts
bun link cool-pkg --concurrent-scripts 10

# Cache directory
bun link cool-pkg --cache-dir /custom/cache

# No cache
bun link cool-pkg --no-cache
```

### Output & Logging

```bash
# Silent mode
bun link cool-pkg --silent

# Verbose logging
bun link cool-pkg --verbose

# No progress bar
bun link cool-pkg --no-progress

# No summary
bun link cool-pkg --no-summary
```

### Platform Targeting

```bash
# Override CPU architecture
bun link cool-pkg --cpu x64
bun link cool-pkg --cpu arm64
bun link cool-pkg --cpu "*"

# Override OS
bun link cool-pkg --os linux
bun link cool-pkg --os darwin
bun link cool-pkg --os "*"
```

---

## Comparison with Workspace Protocol

### When to Use `bun link`

- ✅ Developing packages outside your monorepo
- ✅ Testing packages before publishing
- ✅ Linking packages from different repositories
- ✅ Global CLI tool development

### When to Use `workspace:` Protocol

- ✅ Packages within the same monorepo
- ✅ Workspace dependencies in `package.json`
- ✅ Monorepo package references
- ✅ Publishing workspace packages

### Example: Both in Same Project

```json
{
  "name": "my-app",
  "dependencies": {
    "@nexus/utils": "workspace:*",        // Monorepo workspace package
    "cool-pkg": "link:cool-pkg"          // Externally linked package
  }
}
```

---

## Best Practices

### 1. Use `workspace:` for Monorepo Packages

For packages within your monorepo, always use `workspace:` protocol:

```json
{
  "dependencies": {
    "@nexus/utils": "workspace:*"
  }
}
```

### 2. Use `bun link` for External Development

For packages outside your monorepo:

```bash
# Register external package
cd ~/external-package
bun link

# Link into your project
cd ~/projects/my-app
bun link external-package
```

### 3. Document Linked Packages

Add comments in `package.json` explaining why packages are linked:

```json
{
  "dependencies": {
    "cool-pkg": "link:cool-pkg"  // Local development version
  }
}
```

### 4. Clean Up Before Publishing

Remove `link:` references before publishing:

```bash
# Unlink packages
bun unlink cool-pkg

# Or remove from package.json
# Change "link:cool-pkg" to "^1.0.0"
```

### 5. Use `--trust` for Packages with Lifecycle Scripts

If a linked package has lifecycle scripts:

```bash
bun link cool-pkg --trust
```

This adds it to `trustedDependencies` automatically.

---

## Troubleshooting

### Link Not Found

**Problem**: `bun link cool-pkg` fails with "Package not found"

**Solution**:
1. Verify package is registered: Check global link registry
2. Register the package first: `cd /path/to/cool-pkg && bun link`
3. Check package name matches exactly

### Symlink Issues

**Problem**: Symlink created but package doesn't work

**Solution**:
1. Verify symlink target exists: `ls -la node_modules/cool-pkg`
2. Check permissions on linked directory
3. Reinstall: `bun unlink cool-pkg && bun link cool-pkg`

### Version Conflicts

**Problem**: Linked package version conflicts with dependencies

**Solution**:
1. Check linked package's `package.json` version
2. Use `--force` to reinstall: `bun link cool-pkg --force`
3. Verify dependency versions are compatible

### Lifecycle Scripts Not Running

**Problem**: Linked package's lifecycle scripts don't run

**Solution**:
1. Add to `trustedDependencies`:
   ```bash
   bun link cool-pkg --trust
   ```
2. Or manually add to `package.json`:
   ```json
   {
     "trustedDependencies": ["cool-pkg"]
   }
   ```

---

## Related Documentation

- [Bun PM](./BUN-PM.md) — Package manager utilities (`bun pm trust` for linked packages with scripts)
- [Bun Workspaces](./BUN-WORKSPACES.md) — Monorepo workspace management
- [Bun Catalogs & Workspace Protocol](./BUN-CATALOGS-WORKSPACE-PROTOCOL.md) — Workspace protocol vs bun link comparison
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Lifecycle scripts and trustedDependencies
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) — Complete configuration reference

---

## Search Commands

```bash
# Find linked packages in package.json
rg "link:" package.json

# Find workspace protocol usage
rg "workspace:" package.json

# Check for linked packages in node_modules
ls -la node_modules | grep "^l"

# List all registered links (check Bun's global registry)
# Note: Bun doesn't expose a command for this, but links are stored globally
```

---

**Status**: ✅ Available (Bun v1.3.4+)  
**Use Case**: External package development, testing before publishing  
**Alternative**: `workspace:` protocol for monorepo packages  
**Best Practice**: Use `workspace:` for monorepo, `bun link` for external packages

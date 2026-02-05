# Bun PM - Package Manager Utilities

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun PM Documentation](https://bun.com/docs/pm/pm)

## Overview

The `bun pm` command group provides utilities for working with Bun's package manager, including packing, dependency management, version control, cache operations, and package.json manipulation.

---

## Commands

### `bun pm pack` - Create Package Tarball

Create a tarball (`.tgz`) of the current workspace following npm pack rules.

#### Basic Usage

```bash
bun pm pack
# Creates my-package-1.0.0.tgz in current directory
```

#### Options

- `--dry-run`: Perform all tasks except writing the tarball to disk
- `--destination <dir>`: Specify directory where tarball will be saved
- `--filename <name>`: Specify exact filename for the tarball
- `--ignore-scripts`: Skip running pre/postpack and prepare scripts
- `--gzip-level <0-9>`: Set compression level (default: 9)
- `--quiet`: Only output the tarball filename (ideal for scripts)

**Note**: `--filename` and `--destination` cannot be used together.

#### Examples

```bash
# Quiet mode for scripting
TARBALL=$(bun pm pack --quiet)
echo "Created: $TARBALL"
# Output: Created: my-package-1.0.0.tgz

# Custom destination
bun pm pack --destination ./dist

# Dry run to see what would be included
bun pm pack --dry-run
```

#### Output Modes

**Default output**:
```
bun pack v1.2.19

packed 131B package.json
packed 40B index.js

my-package-1.0.0.tgz

Total files: 2
Shasum: f2451d6eb1e818f500a791d9aace80b394258a90
Unpacked size: 171B
Packed size: 249B
```

**Quiet output** (`--quiet`):
```
my-package-1.0.0.tgz
```

---

### `bun pm bin` - Print Bin Directory Path

Print the path to the `bin` directory for local or global installations.

#### Usage

```bash
# Local bin directory
bun pm bin
# Output: /path/to/current/project/node_modules/.bin

# Global bin directory
bun pm bin -g
# Output: <$HOME>/.bun/bin
```

---

### `bun info` / `bun pm view` - Package Metadata

Display package metadata from the npm registry.

#### Usage

```bash
# Basic package information
bun info <package-name>

# Specific version
bun info <package-name>@<version>

# Specific property
bun info <package-name> <property>

# JSON output
bun info <package-name> --json
```

#### Examples

```bash
# View package info
bun info react

# View specific version
bun info react@18.2.0

# Get specific property
bun info react version
bun info react dependencies
bun info react repository.url

# View all versions
bun info react versions

# JSON output
bun info react --json
```

**Note**: `bun info` is an alias for `bun pm view`. Both commands work identically.

---

### `bun pm ls` - List Installed Dependencies

Print a list of installed dependencies and their resolved versions.

#### Usage

```bash
# Top-level dependencies only
bun pm ls
# or
bun list

# All dependencies (including nth-order)
bun pm ls --all
# or
bun list --all
```

#### Example Output

**Top-level only**:
```
/path/to/project node_modules (135)
├── eslint@8.38.0
├── react@18.2.0
├── react-dom@18.2.0
├── typescript@5.0.4
└── zod@3.21.4
```

**All dependencies** (`--all`):
```
/path/to/project node_modules (135)
├── @eslint-community/eslint-utils@4.4.0
├── @eslint-community/regexpp@4.5.0
├── @eslint/eslintrc@2.0.2
├── @eslint/js@8.38.0
├── @nodelib/fs.scandir@2.1.5
├── @nodelib/fs.stat@2.0.5
├── @nodelib/fs.walk@1.2.8
├── acorn@8.8.2
├── acorn-jsx@5.3.2
├── ajv@6.12.6
├── ansi-regex@5.0.1
├── ...
```

---

### `bun pm whoami` - Print NPM Username

Print your npm username. Requires you to be logged in (`bunx npm login`) with credentials in either `bunfig.toml` or `.npmrc`.

#### Usage

```bash
bun pm whoami
```

---

### `bun pm hash` - Lockfile Hash Operations

Generate and print lockfile hash information.

#### Commands

```bash
# Generate and print hash of current lockfile
bun pm hash

# Print the string used to hash the lockfile
bun pm hash-string

# Print the hash stored in the current lockfile
bun pm hash-print
```

---

### `bun pm cache` - Cache Management

Manage Bun's global module cache.

#### Commands

```bash
# Print path to Bun's global module cache
bun pm cache

# Clear Bun's global module cache
bun pm cache rm
```

---

### `bun pm migrate` - Migrate Lockfile

Migrate another package manager's lockfile without installing anything.

#### Usage

```bash
bun pm migrate
```

This command reads existing lockfiles (like `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) and generates a `bun.lock` file without installing dependencies.

---

### `bun pm untrusted` - List Untrusted Dependencies

Print current untrusted dependencies with scripts that were blocked during install.

#### Usage

```bash
bun pm untrusted
```

#### Example Output

```
./node_modules/@biomejs/biome @1.8.3
 » [postinstall]: node scripts/postinstall.js

These dependencies had their lifecycle scripts blocked during install.
```

**See**: [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) for complete lifecycle scripts documentation.

---

### `bun pm trust` - Trust Dependencies

Run scripts for untrusted dependencies and add them to `trustedDependencies` in `package.json`.

#### Usage

```bash
# Trust specific packages
bun pm trust <package-name>

# Trust all untrusted dependencies
bun pm trust --all
```

#### Example

```bash
# Trust a specific package
bun pm trust @biomejs/biome

# This adds to package.json:
# {
#   "trustedDependencies": ["@biomejs/biome"]
# }
```

**See**: [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) for complete lifecycle scripts and security documentation.

---

### `bun pm default-trusted` - Print Default Trusted List

Print the list of default trusted dependencies (top 500 npm packages).

#### Usage

```bash
bun pm default-trusted
```

**See**: The current list on [GitHub](https://github.com/oven-sh/bun/blob/main/src/install/default-trusted-dependencies.txt)

**See**: [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) for complete lifecycle scripts documentation.

---

### `bun pm version` - Version Management

Display current package version, help, and bump versions in `package.json`.

#### Display Version Info

```bash
bun pm version
```

**Output**:
```
bun pm version v1.3.3 (ca7428e9)
Current package version: v1.0.0

Increment:
  patch      1.0.0 → 1.0.1
  minor      1.0.0 → 1.1.0
  major      1.0.0 → 2.0.0
  prerelease 1.0.0 → 1.0.1-0
  prepatch   1.0.0 → 1.0.1-0
  preminor   1.0.0 → 1.1.0-0
  premajor   1.0.0 → 2.0.0-0
  from-git   Use version from latest git tag
  1.2.3      Set specific version

Options:
  --no-git-tag-version Skip git operations
  --allow-same-version Prevents throwing error if version is the same
  --message=<val>, -m  Custom commit message, use %s for version substitution
  --preid=<val>        Prerelease identifier (i.e beta → 1.0.1-beta.0)
  --force, -f          Bypass dirty git history check

Examples:
  bun pm version patch
  bun pm version 1.2.3 --no-git-tag-version
  bun pm version prerelease --preid beta --message "Release beta: %s"
```

#### Bump Version

```bash
# Bump patch version (1.0.0 → 1.0.1)
bun pm version patch

# Bump minor version (1.0.0 → 1.1.0)
bun pm version minor

# Bump major version (1.0.0 → 2.0.0)
bun pm version major

# Set specific version
bun pm version 1.2.3

# Prerelease versions
bun pm version prerelease --preid beta
# 1.0.0 → 1.0.1-beta.0

# Use version from latest git tag
bun pm version from-git

# Skip git operations
bun pm version patch --no-git-tag-version

# Custom commit message
bun pm version patch --message "Release: %s"
```

#### Supported Increments

- `patch` - Increment patch version (1.0.0 → 1.0.1)
- `minor` - Increment minor version (1.0.0 → 1.1.0)
- `major` - Increment major version (1.0.0 → 2.0.0)
- `prerelease` - Increment prerelease version (1.0.0 → 1.0.1-0)
- `prepatch` - Increment patch and add prerelease (1.0.0 → 1.0.1-0)
- `preminor` - Increment minor and add prerelease (1.0.0 → 1.1.0-0)
- `premajor` - Increment major and add prerelease (1.0.0 → 2.0.0-0)
- `from-git` - Use version from latest git tag
- `1.2.3` - Set specific version

#### Options

- `--no-git-tag-version`: Skip git commit and tag creation
- `--allow-same-version`: Prevent error if version is the same
- `--message=<val>`, `-m`: Custom commit message (use `%s` for version)
- `--preid=<val>`: Prerelease identifier (e.g., `beta` → `1.0.1-beta.0`)
- `--force`, `-f`: Bypass dirty git history check

---

### `bun pm pkg` - Manage package.json

Manage `package.json` data with get, set, delete, and fix operations.

#### Supported Notation

All commands support dot and bracket notation:

```bash
scripts.build              # dot notation
contributors[0]            # array access
workspaces.0               # dot with numeric index
scripts[test:watch]        # bracket for special chars
```

#### Get Operations

```bash
# Get single property
bun pm pkg get name

# Get multiple properties
bun pm pkg get name version

# Get entire package.json
bun pm pkg get

# Get nested property
bun pm pkg get scripts.build
```

#### Set Operations

```bash
# Set simple property
bun pm pkg set name="my-package"

# Set multiple properties
bun pm pkg set scripts.test="jest" version=2.0.0

# Set nested property
bun pm pkg set scripts.build="bun build"

# Set JSON values with --json flag
bun pm pkg set {"private":"true"} --json
```

#### Delete Operations

```bash
# Delete single property
bun pm pkg delete description

# Delete multiple properties
bun pm pkg delete scripts.test contributors[0]

# Delete nested property
bun pm pkg delete scripts.build
```

#### Fix Operations

```bash
# Auto-fix common issues in package.json
bun pm pkg fix
```

The `fix` command automatically corrects common issues like:
- Missing required fields
- Invalid version formats
- Duplicate dependencies
- Invalid script names

---

## Use Cases

### 1. Publishing Workflow

```bash
# Check what would be packed
bun pm pack --dry-run

# Create tarball
bun pm pack --destination ./dist

# Bump version before publishing
bun pm version patch --message "Release: %s"

# Publish
bunx npm publish
```

### 2. Dependency Audit

```bash
# List all dependencies
bun pm ls --all

# Check untrusted dependencies
bun pm untrusted

# Trust a package if needed
bun pm trust @biomejs/biome
```

### 3. Cache Management

```bash
# Check cache location
bun pm cache

# Clear cache if needed
bun pm cache rm
```

### 4. Version Management

```bash
# Check current version
bun pm version

# Bump patch version
bun pm version patch

# Create beta release
bun pm version prerelease --preid beta --message "Beta release: %s"
```

### 5. Package.json Manipulation

```bash
# Get package name
bun pm pkg get name

# Update version
bun pm pkg set version=1.2.3

# Add script
bun pm pkg set scripts.test="bun test"

# Fix common issues
bun pm pkg fix
```

---

## Integration with Workspace System

The workspace dashboard (`dashboard/workspace.html`) integrates with several `bun pm` commands:

- **Untrusted Dependencies**: Displayed in Package Manager Configuration
- **Trusted Dependencies**: Shown in lifecycle scripts section
- **Version Management**: Can be used to manage package versions
- **Dependency Listing**: Useful for workspace dependency audits

**See**: [Developer Workspace System](./WORKSPACE-BUN-V1.3.4-INTEGRATION.md) for complete workspace integration.

---

## Best Practices

### 1. Use `--dry-run` Before Packing

Always check what will be included before creating a tarball:

```bash
bun pm pack --dry-run
```

### 2. Trust Dependencies Explicitly

Use `bun pm untrusted` to audit dependencies, then trust only what's necessary:

```bash
bun pm untrusted
bun pm trust <package-name>
```

### 3. Version Management Workflow

Use semantic versioning with git tags:

```bash
# Patch release
bun pm version patch --message "Fix: %s"

# Minor release
bun pm version minor --message "Feature: %s"

# Major release
bun pm version major --message "Breaking: %s"
```

### 4. Cache Management

Clear cache when experiencing dependency issues:

```bash
bun pm cache rm
bun install
```

### 5. Package.json Management

Use `bun pm pkg fix` regularly to maintain clean `package.json`:

```bash
bun pm pkg fix
```

---

## Related Documentation

- [Bun Patch](./BUN-PATCH.md) — Persistent package patching
- [Bun Workspaces](./BUN-WORKSPACES.md) — Monorepo workspace management
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Lifecycle scripts and trustedDependencies
- [Bun Link](./BUN-LINK.md) — Local package linking
- [Bun Catalogs & Workspace Protocol](./BUN-CATALOGS-WORKSPACE-PROTOCOL.md) — Catalog dependencies
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) — Complete configuration reference
- [Developer Workspace System](./WORKSPACE-BUN-V1.3.4-INTEGRATION.md) — Workspace integration

---

## Search Commands

```bash
# Find bun pm usage in scripts
rg "bun pm" scripts/

# Find version management
rg "bun pm version" scripts/

# Find pack commands
rg "bun pm pack" scripts/

# Find trust commands
rg "bun pm trust" scripts/
```

---

**Status**: ✅ Available (Bun v1.3.4+)  
**Use Case**: Package management utilities, version control, dependency auditing  
**Best Practice**: Use `--dry-run` before destructive operations, trust dependencies explicitly

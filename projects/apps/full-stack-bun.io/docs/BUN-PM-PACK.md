# bun pm pack - Binary Inclusion Behavior

## Overview

`bun pm pack` now **always includes** files and directories declared via `bin` and `directories.bin` in `package.json`, even when they are not listed in the `files` field. This matches npm pack behavior and prevents missing CLI binaries in published tarballs.

## Key Behavior

### Before (Potential Issue)

```json
{
  "name": "my-package",
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "files": [
    "src",
    "dist"
  ]
}
```

**Problem**: `bin/cli.js` might not be included in the tarball if not explicitly listed in `files`.

### After (Fixed)

```json
{
  "name": "my-package",
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "directories": {
    "bin": "./bin"
  },
  "files": [
    "src",
    "dist"
  ]
}
```

**Result**: `bin/cli.js` is **always included** in the tarball, even though it's not in `files`.

## Benefits

1. ✅ **Prevents Missing Binaries**: CLI tools always included
2. ✅ **Matches npm Behavior**: Consistent with npm pack
3. ✅ **Deduplicates Paths**: No duplicate entries when paths appear in both `bin`/`directories.bin` and `files`
4. ✅ **Simpler Configuration**: Don't need to manually add bin paths to `files`

## Examples

### Example 1: Single Binary

```json
{
  "name": "hyperbun-cli",
  "version": "1.0.0",
  "bin": {
    "hyperbun": "./bin/hyperbun.js"
  },
  "files": [
    "src",
    "dist",
    "README.md"
  ]
}
```

**Result**: `bin/hyperbun.js` is included automatically.

### Example 2: Multiple Binaries

```json
{
  "name": "arbitrage-tools",
  "version": "1.0.0",
  "bin": {
    "arb-scanner": "./bin/scanner.js",
    "arb-executor": "./bin/executor.js"
  },
  "files": [
    "src",
    "lib"
  ]
}
```

**Result**: Both `bin/scanner.js` and `bin/executor.js` are included automatically.

### Example 3: Using directories.bin

```json
{
  "name": "sportsbook-cli",
  "version": "1.0.0",
  "directories": {
    "bin": "./bin"
  },
  "files": [
    "src",
    "dist"
  ]
}
```

**Result**: All files in `./bin` directory are included automatically.

### Example 4: Both bin and directories.bin

```json
{
  "name": "multi-tool",
  "version": "1.0.0",
  "bin": {
    "tool1": "./bin/tool1.js",
    "tool2": "./bin/tool2.js"
  },
  "directories": {
    "bin": "./bin"
  },
  "files": [
    "bin",  // Also listed in files
    "src"
  ]
}
```

**Result**: 
- `bin/tool1.js` and `bin/tool2.js` are included (from `bin` field)
- All files in `./bin` are included (from `directories.bin`)
- Paths are **deduplicated** - no duplicate entries

## Verification

### Test Pack Creation

```bash
# Create a test package
mkdir test-package
cd test-package

# Create package.json with bin
cat > package.json <<EOF
{
  "name": "test-cli",
  "version": "1.0.0",
  "bin": {
    "test-cli": "./bin/cli.js"
  },
  "files": ["src"]
}
EOF

# Create bin directory and file
mkdir bin
echo '#!/usr/bin/env node\nconsole.log("Hello from CLI");' > bin/cli.js
chmod +x bin/cli.js

# Create src directory
mkdir src
echo 'export const hello = "world";' > src/index.js

# Pack the package
bun pm pack

# Verify bin/cli.js is included
tar -tzf test-cli-1.0.0.tgz | grep bin/cli.js
# Should output: package/bin/cli.js
```

### Check Tarball Contents

```bash
# List all files in tarball
tar -tzf package-name-version.tgz

# Should include:
# package/bin/cli.js (from bin field)
# package/src/... (from files field)
```

## Best Practices

1. **Don't Duplicate**: You don't need to add `bin` paths to `files` array
2. **Use bin Field**: Prefer `bin` field over `directories.bin` for explicit control
3. **Verify**: Always test `bun pm pack` before publishing
4. **Check Tarball**: Inspect tarball contents to ensure binaries are included

## Migration Guide

### If You Previously Added bin to files

**Before**:
```json
{
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "files": [
    "bin",  // ← Can remove this now
    "src"
  ]
}
```

**After**:
```json
{
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "files": [
    "src"  // ← bin is auto-included
  ]
}
```

## Related Commands

```bash
# Pack current package
bun pm pack

# Pack with specific output
bun pm pack --out ./dist

# Dry run (check what would be included)
bun pm pack --dry-run
```

## See Also

- [npm pack documentation](https://docs.npmjs.com/cli/v9/commands/npm-pack)
- [package.json bin field](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#bin)
- [package.json files field](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#files)




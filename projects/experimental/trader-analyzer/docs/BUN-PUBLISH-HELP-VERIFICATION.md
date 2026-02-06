# bun publish --help Text Verification

**Status**: ⚠️ **Version-Dependent Issue**  
**Bun Version**: v1.3.4+ (Fixed)  
**Last Updated**: 2025-12-08

## Overview

This document tracks the `--dry-run` flag description issue in `bun publish --help` command. The description was incorrect in earlier Bun versions and has been fixed in v1.3.4+.

---

## Issue Description

### Problem

The `--dry-run` flag description was incorrect in some Bun versions:
- **Incorrect**: "Don't install anything" ❌ (This description is incorrect and confusing)
- **Correct**: "Perform a dry run without making changes" ✅

### Affected Versions

- **Fixed in**: Bun v1.3.4+
- **May still appear in**: Bun versions < 1.3.4

### Current Status

**Verified**: Bun v1.3.4 shows the correct description:
```text
--dry-run                      Perform a dry run without making changes
```

**If you see the incorrect description**, you may be using an older version of Bun. Update to v1.3.4+ to get the fix.

### Verification

**Command**:
```bash
bun publish --help
```

**Output** (verified):
```text
bun publish v1.3.4 (5eb2145b)

Usage: bun publish [flags] [dist]

  Publish a package to the npm registry.

Flags:
  ...
      --dry-run                      Perform a dry run without making changes
  ...
```

### Test Results

**Test File**: `test/bun-dev-server-install-fixes.test.ts`

**Test Name**: `bun publish --help shows correct --dry-run description`

**Status**: ✅ **PASS**

**Test Output**:
```text
(pass) bun publish --help shows correct --dry-run description [4.34ms]

 1 pass
 6 expect() calls
```

**Test Verification**:
- ✅ `--dry-run` flag exists in help output
- ✅ Description is "Perform a dry run without making changes"
- ✅ Old incorrect description "Don't install anything" is not present
- ✅ Description appears on the same line as the flag

---

## Impact

- ✅ **Accurate CLI documentation** - Developers see correct flag description
- ✅ **Better developer experience** - Clear understanding of what `--dry-run` does
- ✅ **Consistent with behavior** - Description matches actual functionality

---

## Usage Example

```bash
# Display help
bun publish --help

# Use --dry-run flag
bun publish --dry-run

# Output shows what would be published without actually publishing
```

---

## Related Documentation

- [Bun Dev Server and Install Fixes](./BUN-DEV-SERVER-AND-INSTALL-FIXES.md)
- [Bun CLI Documentation](https://bun.sh/docs/cli/publish)

---

## Version Compatibility

### Checking Your Bun Version

```bash
bun --version
```

### Expected Behavior by Version

| Bun Version | `--dry-run` Description | Status |
|-------------|------------------------|--------|
| < 1.3.4 | "Don't install anything" | ❌ Incorrect |
| ≥ 1.3.4 | "Perform a dry run without making changes" | ✅ Correct |

### Updating Bun

If you're seeing the incorrect description, update Bun:

```bash
# Using bvm (Bun Version Manager)
bvm install latest
bvm use latest

# Using curl
curl -fsSL https://bun.sh/install | bash

# Using npm
npm install -g bun@latest
```

---

## Workaround

If you're stuck on an older version and see the incorrect description, remember that `--dry-run`:
- ✅ Shows what would be published without actually publishing
- ✅ Validates package.json and files
- ✅ Displays the tarball that would be uploaded
- ❌ Does NOT install anything (the old description was misleading)

---

## Status

✅ **Fix verified in v1.3.4+**  
✅ **Test passing**  
✅ **Documentation updated**  
⚠️ **May still appear in older versions**

**Last Updated**: 2025-12-08

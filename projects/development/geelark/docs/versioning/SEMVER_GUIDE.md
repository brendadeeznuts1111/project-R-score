# Semantic Versioning Guide

This guide explains the semantic versioning (SemVer) support in Geelark, built according to the [SemVer 2.0.0](https://semver.org/) specification.

## Table of Contents

- [Overview](#overview)
- [Version Format](#version-format)
- [Core Concepts](#core-concepts)
- [Using Version Utilities](#using-version-utilities)
- [CLI Commands](#cli-commands)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

Semantic Versioning is a standardized approach to numbering releases. The Geelark project adheres to SemVer 2.0.0, which allows:

- **Clear communication** of breaking changes (major version)
- **Predictable dependency management** (minor/patch versions)
- **Compatibility information** at a glance

## Version Format

The format is: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

### Components

- **MAJOR**: Incremented when you make incompatible API changes
- **MINOR**: Incremented when you add functionality in a backwards-compatible manner
- **PATCH**: Incremented when you make backwards-compatible bug fixes
- **PRERELEASE**: (optional) Indicates a pre-release version (e.g., `alpha.1`, `beta`, `rc.2`)
- **BUILD**: (optional) Build metadata (e.g., `build.123`, `20240109`)

### Examples

| Version | Meaning |
|---------|---------|
| `1.2.3` | Release version |
| `2.0.0` | Major release (breaking changes) |
| `1.1.0` | Minor release (new features) |
| `1.0.1` | Patch release (bug fix) |
| `1.0.0-alpha` | Alpha pre-release |
| `1.0.0-beta.1` | Beta pre-release #1 |
| `1.0.0-rc.2` | Release candidate #2 |
| `1.0.0+build.123` | Release with build metadata |
| `1.0.0-beta+build.456` | Beta with build metadata |

## Core Concepts

### When to Increment

#### MAJOR Version (X.0.0)
- Incompatible API changes
- Breaking changes in configuration
- Removal of deprecated features
- Major dependency updates

**Example**: `1.0.0` → `2.0.0`

#### MINOR Version (x.Y.0)
- New backwards-compatible features
- Deprecated features (but still work)
- Performance improvements
- Internal refactoring

**Example**: `1.0.0` → `1.1.0`

#### PATCH Version (x.y.Z)
- Bug fixes
- Security patches
- Dependency updates that don't affect API

**Example**: `1.0.0` → `1.0.1`

### Pre-releases

Pre-release versions are used for testing before the final release:

- `1.0.0-alpha` - Early development
- `1.0.0-beta.1` - Public beta, iteration 1
- `1.0.0-rc.1` - Release candidate

**Ordering**: `1.0.0-alpha < 1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0`

### Build Metadata

Build metadata identifies the build environment but doesn't affect version precedence:

- `1.0.0+build.123` - Build number 123
- `1.0.0+git.abc123` - Git commit hash
- `1.0.0+2024-01-09` - Build date

## Using Version Utilities

### Import the Version Module

```typescript
import {
  parseVersion,
  formatVersion,
  compareVersions,
  incrementVersion,
  createPrerelease,
  addMetadata,
  satisfiesRange,
  isValidVersion,
  getCurrentVersion,
  type SemanticVersion,
} from "./src/utils/version";
```

### Parse a Version String

```typescript
const version = parseVersion("1.2.3-alpha+build.123");
// Returns:
// {
//   major: 1,
//   minor: 2,
//   patch: 3,
//   prerelease: "alpha",
//   metadata: "build.123",
//   raw: "1.2.3-alpha+build.123"
// }
```

### Format a Version Object

```typescript
const version = {
  major: 1,
  minor: 2,
  patch: 3,
  prerelease: "beta.1",
  raw: "1.2.3-beta.1",
};

const formatted = formatVersion(version);
// Returns: "1.2.3-beta.1"
```

### Compare Versions

```typescript
compareVersions("1.0.0", "2.0.0"); // Returns: -1 (first is less)
compareVersions("2.0.0", "1.0.0"); // Returns: 1 (first is greater)
compareVersions("1.0.0", "1.0.0"); // Returns: 0 (equal)

// Pre-release comparison
compareVersions("1.0.0-alpha", "1.0.0"); // Returns: -1 (pre-release is less)
compareVersions("1.0.0-alpha.1", "1.0.0-alpha.2"); // Returns: -1
```

### Increment Version

```typescript
incrementVersion("1.2.3", "major"); // Returns: "2.0.0"
incrementVersion("1.2.3", "minor"); // Returns: "1.3.0"
incrementVersion("1.2.3", "patch"); // Returns: "1.2.4"

// Removes pre-release and metadata
incrementVersion("1.2.3-alpha+build.1", "patch"); // Returns: "1.2.4"
```

### Create Pre-release

```typescript
createPrerelease("1.2.3", "alpha"); // Returns: "1.2.3-alpha"
createPrerelease("1.2.3", "beta.1"); // Returns: "1.2.3-beta.1"
createPrerelease("1.2.3", "rc.2"); // Returns: "1.2.3-rc.2"

// Replaces existing pre-release
createPrerelease("1.2.3-alpha", "beta"); // Returns: "1.2.3-beta"
```

### Add Build Metadata

```typescript
addMetadata("1.2.3", "build.123"); // Returns: "1.2.3+build.123"
addMetadata("1.2.3-beta", "build.456"); // Returns: "1.2.3-beta+build.456"

// Note: Two versions with different metadata are considered equal
compareVersions("1.2.3+build.1", "1.2.3+build.2"); // Returns: 0
```

### Check Range Satisfaction

```typescript
// Exact version
satisfiesRange("1.2.3", "1.2.3"); // Returns: true

// Caret (^) - allows minor/patch changes for x.y.z where x > 0
satisfiesRange("1.2.3", "^1.0.0"); // Returns: true
satisfiesRange("1.9.9", "^1.0.0"); // Returns: true
satisfiesRange("2.0.0", "^1.0.0"); // Returns: false

// Tilde (~) - allows patch changes
satisfiesRange("1.2.4", "~1.2.0"); // Returns: true
satisfiesRange("1.3.0", "~1.2.0"); // Returns: false

// Greater/Less than
satisfiesRange("1.5.0", ">=1.0.0"); // Returns: true
satisfiesRange("1.5.0", "<2.0.0"); // Returns: true

// Range
satisfiesRange("1.5.0", "1.0.0 - 2.0.0"); // Returns: true
```

### Validate Version String

```typescript
isValidVersion("1.2.3"); // Returns: true
isValidVersion("1.2"); // Returns: false
isValidVersion("v1.2.3"); // Returns: false
```

### Get Current Version

```typescript
const currentVersion = getCurrentVersion();
// Returns the version from package.json (e.g., "1.0.0")
```

## CLI Commands

### Check Current Version

```bash
npm run version:current
# or
bun run version:current
```

### Parse a Version

```bash
npm run version:parse 1.2.3-alpha.1+build.123
```

### Calculate Next Version

```bash
# Next major version
npm run version:next:major

# Next minor version
npm run version:next:minor

# Next patch version
npm run version:next:patch
```

### Create Pre-release

```bash
npm run version:prerelease alpha.1
npm run version:prerelease beta
npm run version:prerelease rc.1
```

### Compare Versions

```bash
npm run version:compare 1.0.0 2.0.0
# Output: <
```

### Validate Version

```bash
npm run version:validate 1.2.3
# Output: Valid
```

### Check Range Satisfaction

```bash
npm run version:satisfies 1.2.3 ^1.0.0
# Output: Yes
```

## Best Practices

### Release Process

1. **Development**: Work on features and fixes
2. **Pre-release Testing**: Create alpha/beta/rc versions
3. **Review**: Code review and testing
4. **Release**: Create final version (e.g., `1.2.0`)
5. **Document**: Update changelog and release notes

### Version Numbering Strategy

- **Always start at 1.0.0** for initial release
- **Don't jump versions** - use incremental versioning
- **Document breaking changes** in CHANGELOG with major version bumps
- **Use pre-releases for testing** - alpha, beta, rc
- **Never release with metadata** - metadata is for build info only

### Changelog Maintenance

Keep `CHANGELOG.md` updated for each version:

```markdown
## [1.2.0] - 2024-01-09

### Added
- New feature X
- Performance improvement for Y

### Changed
- Modified behavior of Z

### Fixed
- Bug fixes for A and B

### Security
- Security patch for vulnerability C
```

### Dependency Management

For dependencies, use version ranges in `package.json`:

```json
{
  "dependencies": {
    "package-a": "^1.0.0",
    "package-b": "~2.1.0",
    "package-c": "1.2.3"
  }
}
```

- `^1.0.0` - Accept minor and patch updates
- `~1.0.0` - Accept patch updates only
- `1.0.0` - Exact version only

## Examples

### Example 1: Major Release

Your project makes breaking API changes:

```typescript
// Current version: 1.5.2

import { incrementVersion } from "./src/utils/version";

const nextVersion = incrementVersion("1.5.2", "major");
// Returns: "2.0.0"

// Update package.json version to 2.0.0
// Document breaking changes in CHANGELOG.md
```

### Example 2: Pre-release for Beta Testing

You want to release a beta for new features:

```typescript
import { createPrerelease } from "./src/utils/version";

// Current version: 1.3.0
const betaVersion = createPrerelease("1.3.0", "beta.1");
// Returns: "1.3.0-beta.1"

// Release as 1.3.0-beta.1
// After testing, release final 1.3.0
```

### Example 3: Check Compatibility

Check if multiple packages are compatible:

```typescript
import { satisfiesRange } from "./src/utils/version";

const packages = {
  api: "1.2.3",
  sdk: "1.5.0",
  cli: "1.0.2",
};

// Check if all are compatible with ^1.0.0
const allCompatible = Object.values(packages).every((v) =>
  satisfiesRange(v, "^1.0.0")
);

console.log(allCompatible); // true
```

### Example 4: Version Comparison

Compare versions for upgrade path:

```typescript
import { compareVersions } from "./src/utils/version";

const currentVersion = "1.0.0";
const latestVersion = "2.0.0";
const isUpgradeAvailable = compareVersions(currentVersion, latestVersion) < 0;

if (isUpgradeAvailable) {
  console.log("Upgrade available!");
}
```

## Related Resources

- [SemVer Official Specification](https://semver.org/)
- [Bun Runtime Features](https://bun.sh/docs/runtime)
- [NPM Semantic Versioning](https://docs.npmjs.com/about-semantic-versioning)
- [CHANGELOG.md](../../CHANGELOG.md)

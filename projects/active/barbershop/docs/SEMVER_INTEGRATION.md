# Semantic Versioning Integration

Unified semantic versioning across all Cloudflare resources using **Bun.semver**.

## Overview

The versioning system integrates with:
- **Bun.semver** - Native semver operations (`satisfies`, `order`)
- **Domain deployments** - Track zone configuration versions
- **Worker releases** - Version edge worker deployments
- **R2 assets** - Manage asset versioning
- **Secret rotations** - Track credential version history

## Bun.semver API

Bun v1.3.7+ provides native semver support:

```typescript
// Check if version satisfies range
Bun.semver.satisfies('1.2.3', '^1.0.0'); // true

// Compare versions (returns -1, 0, or 1)
Bun.semver.order('1.2.3', '1.3.0'); // -1
Bun.semver.order('2.0.0', '1.5.0'); // 1
Bun.semver.order('1.0.0', '1.0.0'); // 0
```

## UnifiedVersionManager

Centralized version management across all resources:

```typescript
import { versionManager } from './lib/cloudflare';

// Register resource version
await versionManager.registerResource('domain:api.factory-wager.com', '2.1.0', {
  type: 'zone',
  environment: 'production',
});

// Check compatibility
const matrix = versionManager.checkCompatibility({
  domainVersion: '2.1.0',
  workerVersion: '2.0.5',
  r2Version: '2.1.3',
});

if (matrix.compatible) {
  console.log('All components compatible!');
} else {
  console.log('Issues:', matrix.issues);
}
```

## CLI Usage

### Validate Semver

```bash
# Check if version is valid
bun run cf:version:validate 1.2.3

# Output:
# ✓ Valid semver!
#   Major: 1
#   Minor: 2
#   Patch: 3
```

### Compare Versions

```bash
bun run cf:version:compare 1.2.3 1.3.0

# Output:
# 1.2.3 < 1.3.0
# 1.3.0 is greater than 1.2.3
```

### Check Range Satisfaction

```bash
bun run cf:version:satisfies 1.2.3 ^1.0.0

# Output:
# Yes! 1.2.3 satisfies ^1.0.0
```

### Bump Version

```bash
bun run cf:version:bump 1.2.3 minor

# Output:
# 1.2.3 → 1.3.0
# Major: 1 | Minor: 3 | Patch: 0
```

### Sort Versions

```bash
bun run cf-version.ts sort 2.0.0 1.5.0 1.0.0 3.0.0

# Output:
# Ascending:
#    1.0.0
#    1.5.0
#    2.0.0
#  → 3.0.0
```

### Filter by Range

```bash
bun run cf-version.ts range ^1.0.0 0.9.0 1.0.0 1.5.0 2.0.0

# Output:
# Matching:
#   ✓ 1.0.0
#   ✓ 1.5.0
#
# Non-matching:
#   ✗ 0.9.0
#   ✗ 2.0.0
```

### Check Compatibility

```bash
bun run cf-version.ts compatibility 2.1.0 2.0.5 2.1.3

# Output:
# Domain: 2.1.0
# Worker: 2.0.5
# R2:     2.1.3
#
# ✓ All components are compatible!
```

### Auto-Increment

```bash
# Auto version based on changes
bun run cf-version.ts auto 1.2.3 0 2 5
# (0 breaking, 2 features, 5 fixes)

# Output:
# Changes: 0 breaking, 2 features, 5 fixes
# Recommended: minor bump
# 1.2.3 → 1.3.0
```

### Generate Changelog

```bash
bun run cf-version.ts changelog 1.2.3 2.0.0

# Output:
# 🚨 **BREAKING**: Major version bump (1 → 2)
```

## Version Integration in Deployments

When deploying with the unified service, versions are automatically tracked:

```typescript
import { unifiedCloudflare } from './lib/cloudflare';

const result = await unifiedCloudflare.deployStack({
  domain: 'api.factory-wager.com',
  workerScript: code,
  r2Assets: assets,
});

console.log(`Deployed version: ${result.deploymentVersion}`);
// Deployed version: 1.3.0
```

The system:
1. Checks existing resource versions
2. Auto-increments based on changes
3. Registers new versions
4. Records deployment with changelog
5. Validates compatibility

## Compatibility Matrix

Version compatibility rules:

```typescript
// Domain and Worker must share major version
const matrix = versionManager.checkCompatibility({
  domainVersion: '2.1.0',  // Major: 2
  workerVersion: '2.0.5',  // Major: 2 ✓
  r2Version: '2.1.3',      // Satisfies ^2.0.0 ✓
});

// R2 must satisfy domain's minor version
// ^2.0.0 allows 2.x.x but not 3.0.0
```

## Version History

Track all deployments:

```typescript
// Get last 10 deployments
const history = versionManager.getDeploymentHistory(10);

// Find compatible deployment
const compatible = versionManager.findLastCompatibleDeployment(
  '2.1.0',        // domain version
  '^2.0.0',       // worker range
  '^2.0.0'        // R2 range
);
```

## API Reference

### Methods

| Method | Description |
|--------|-------------|
| `parseVersion(v)` | Parse semver to components |
| `formatVersion(v)` | Format components to string |
| `bumpVersion(v, type)` | Bump major/minor/patch |
| `satisfies(v, range)` | Check if version satisfies range |
| `compare(v1, v2)` | Compare versions (-1, 0, 1) |
| `isGreaterThan(v1, v2)` | Check if v1 > v2 |
| `isLessThan(v1, v2)` | Check if v1 < v2 |
| `sortVersions(versions)` | Sort ascending |
| `sortVersionsDesc(versions)` | Sort descending |
| `filterByRange(versions, range)` | Filter by semver range |
| `checkCompatibility(matrix)` | Check component compatibility |
| `registerResource(name, version)` | Register resource version |
| `recordDeployment(deployment)` | Record deployment version |
| `autoIncrement(version, changes)` | Auto-bump based on changes |
| `generateChangelog(from, to)` | Generate version changelog |
| `validateDeploymentVersions(v)` | Validate deployment versions |

### Helper Functions

```typescript
import { 
  versionSatisfies,
  bumpVersion,
  isValidSemver,
  versionCompare 
} from './lib/cloudflare';

// Quick satisfaction check
if (versionSatisfies('1.2.3', '^1.0.0')) {
  // Compatible
}

// Quick version bump
const newVersion = bumpVersion('1.2.3', 'minor'); // 1.3.0

// Validate semver
const isValid = isValidSemver('1.2.3-beta.1'); // true

// Compare versions
const result = versionCompare('1.2.3', '1.3.0'); // -1
```

## Package.json Scripts

```json
{
  "cf:version": "bun run scripts/domain/cf-version-cli.ts",
  "cf:version:compare": "bun run scripts/domain/cf-version-cli.ts compare",
  "cf:version:satisfies": "bun run scripts/domain/cf-version-cli.ts satisfies",
  "cf:version:bump": "bun run scripts/domain/cf-version-cli.ts bump",
  "cf:version:validate": "bun run scripts/domain/cf-version-cli.ts validate"
}
```

## Examples

### Complete Version Workflow

```bash
# 1. Validate current versions
bun run cf:version:validate 1.2.3
bun run cf:version:validate 1.3.0

# 2. Check compatibility
bun run cf-version.ts compatibility 1.2.3 1.2.0 1.2.5

# 3. Bump version
bun run cf:version:bump 1.2.3 minor

# 4. Check if new version satisfies requirements
bun run cf:version:satisfies 1.3.0 ^1.0.0

# 5. Deploy with version tracking
bun run cf:unified:deploy-stack
```

### Programmatic Usage

```typescript
import { 
  unifiedCloudflare, 
  versionManager 
} from './lib/cloudflare';

// Deploy with explicit version
const result = await unifiedCloudflare.deployStack({
  domain: 'api.factory-wager.com',
  workerScript: workerCode,
  r2Assets: assets,
  version: '2.1.0',
});

// Check deployment compatibility
const validation = versionManager.validateDeploymentVersions({
  domain: result.deploymentVersion,
  worker: '2.1.0',
  r2Assets: '2.0.5',
  secrets: '1.5.0',
});

if (!validation.valid) {
  console.error('Version errors:', validation.errors);
}

// Get version statistics
const stats = versionManager.getStats();
console.log(`Total resources: ${stats.totalResources}`);
console.log(`Version range: ${stats.versionRange.min} → ${stats.versionRange.max}`);
```

## Future Enhancements

- **Semver ranges**: Support for complex ranges (`>=1.0.0 <2.0.0 || >=3.0.0`)
- **Prerelease channels**: Alpha, beta, rc version handling
- **Dependency resolution**: Automatic compatible version selection
- **Version constraints**: Define min/max versions per component

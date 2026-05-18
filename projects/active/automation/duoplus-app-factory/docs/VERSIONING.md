# 🌌 Nebula-Flow™ Unified Versioning System

## Overview

Nebula-Flow™ uses a **unified version management system** to ensure consistency across all components, exports, and APIs. All version information is centralized in a single source of truth.

## Version Structure

### Main Version
- **Location**: `src/utils/version.ts`
- **Current**: `3.5.0` (semantic versioning: MAJOR.MINOR.PATCH)
- **Format**: `MAJOR.MINOR.PATCH`
  - **MAJOR**: Breaking changes, major feature additions
  - **MINOR**: New features, backward-compatible changes
  - **PATCH**: Bug fixes, minor improvements

### Component Versions

| Component | Version | Purpose |
|-----------|---------|---------|
| **App Version** | `3.5.0` | Main application version |
| **API Version** | `1.3.0` | API compatibility version |
| **Dashboard Version** | `1.3.0` | Dashboard export format version |
| **Schema Version** | `1.3.0` | Data schema version |

## Usage

### In TypeScript/Node.js

```typescript
import { NEBULA_VERSION, VERSION_INFO, getVersionString } from './src/utils/version';

// Use version constant
console.log(`Running ${NEBULA_VERSION}`);

// Use version info object
console.log(`API Version: ${VERSION_INFO.apiVersion}`);

// Use formatted version string
console.log(getVersionString()); // "Nebula-Flow™ v3.5.0 (stable)"
```

### In Browser/Web App

```javascript
// version.js is automatically loaded in index.html
console.log(window.NEBULA_VERSION); // "3.5.0"
console.log(window.VERSION_INFO.apiVersion); // "1.3.0"
console.log(window.getVersionString()); // "Nebula-Flow™ v3.5.0 (stable)"
```

### In CLI Scripts

```typescript
import { NEBULA_VERSION, getVersionString } from './src/utils/version';

console.log(`🧬 ${getVersionString()} - Dashboard Export Analysis`);
```

## Version Sync

To ensure all files use the same version:

```bash
bun run sync-version
```

This script:
- Updates `package.json` version
- Updates `web-app/version.js` 
- Ensures consistency across all files

## Version Comparison

```typescript
import { compareVersions, isVersionCompatible } from './src/utils/version';

// Compare versions
compareVersions('3.5.0', '3.4.0'); // Returns: 1 (first is newer)
compareVersions('3.4.0', '3.5.0'); // Returns: -1 (first is older)
compareVersions('3.5.0', '3.5.0'); // Returns: 0 (equal)

// Check compatibility (same major, minor >= required)
isVersionCompatible('3.4.0'); // true (3.5.0 >= 3.4.0)
isVersionCompatible('3.6.0'); // false (3.5.0 < 3.6.0)
```

## Files Using Unified Version

- ✅ `src/utils/version.ts` - **Source of truth**
- ✅ `src/main.ts` - Health check endpoint
- ✅ `scripts/build.ts` - Build script
- ✅ `analyze-dashboard-export.ts` - Analysis tool
- ✅ `web-app/app.js` - Web application
- ✅ `web-app/version.js` - Browser-compatible version
- ✅ `package.json` - NPM package version (synced)

## Versioning Best Practices

1. **Always import from `src/utils/version.ts`** - Never hardcode versions
2. **Run `sync-version`** before releases to ensure consistency
3. **Update version in one place** - `src/utils/version.ts`
4. **Use semantic versioning** - Follow MAJOR.MINOR.PATCH rules
5. **Document breaking changes** - When incrementing MAJOR version

## Version History

| Version | Date | Changes |
|---------|------|---------|
| `3.5.0` | 2026-01-21 | Unified versioning system, enhanced analytics |
| `1.3.0` | 2026-01-21 | Dashboard enhancements, live features |
| `1.0.0` | 2026-01-21 | Initial release |

## Release Process

1. Update version in `src/utils/version.ts`
2. Run `bun run sync-version` to sync across files
3. Commit changes with version bump
4. Tag release: `git tag v3.5.0`
5. Build and deploy

## API Version Compatibility

The API version (`1.3.0`) indicates compatibility:
- **Same major.minor**: Fully compatible
- **Different major**: May have breaking changes
- **Different minor**: New features, backward compatible

Clients should check API version compatibility before making requests.

# Version Management System

This module provides build-time version information for the foxy-proxy dashboard.

## Features

- **Build-time injection**: Version information is injected during the build process
- **Git integration**: Automatically captures commit hash and build timestamp
- **Type-safe**: Full TypeScript support with proper type definitions

## Usage

```typescript
import { getVersion, getVersionString, logVersion } from '../utils/version';

// Get version object
const version = getVersion();
console.log(version);
// { version: "1.0.0", buildTime: "2026-01-10T16:47:30.918Z", commit: "7149a93..." }

// Get formatted version string
const versionStr = getVersionString();
console.log(versionStr);
// "1.0.0 (7149a93) built at 2026-01-10T16:47:30.918Z"

// Log version with emoji
logVersion();
// 🚀 1.0.0 (7149a93) built at 2026-01-10T16:47:30.918Z
```

## Build Process

The version information is automatically injected during the build process:

1. `prebuild` script runs `node scripts/inject-version.js`
2. Script reads version from `package.json`, current git commit, and timestamp
3. Replaces `declare const` statements with actual values
4. Build continues with injected constants

## Version Data

- **BUILD_VERSION**: From `package.json` version field
- **BUILD_TIME**: ISO timestamp of when the build was created
- **GIT_COMMIT**: Full git commit hash

## Development

During development, the constants contain default values. The actual injection happens only during production builds.
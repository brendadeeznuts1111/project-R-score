# Bun Macros Integration

This project uses Bun macros for build-time code generation and configuration embedding.

## Macros Overview

Macros execute at bundle-time and their results are inlined into the bundle. This allows us to:
- Embed build metadata (Git hash, build time)
- Generate constants from configuration files
- Compute cryptographic hashes at build time
- Eliminate runtime configuration loading overhead

## Available Macros

### Build Macros (`src/macros/build.ts`)

```typescript
import { getGitCommitHash, getBuildTimestamp, getBuildVersion } from "./macros/build.js" with { type: "macro" };

// Get Git commit hash
const hash = getGitCommitHash(); // Executed at build time

// Get build timestamp
const time = getBuildTimestamp(); // Current time at build

// Get version from package.json
const version = await getBuildVersion(); // Reads package.json at build time
```

### Configuration Macros (`src/macros/config.ts`)

```typescript
import { getEdgeConfigMacro } from "./macros/config.js" with { type: "macro" };

// Load edge configuration at build time
const config = await getEdgeConfigMacro();
// Returns: { minSimilarity: 0.3, highSimilarity: 0.7, minWeight: 0.8 }
```

### Integrity Macros (`src/macros/integrity.ts`)

```typescript
import { hashFileMacro, hashGovernanceRulesMacro } from "./macros/integrity.js" with { type: "macro" };

// Hash a file at build time
const hash = await hashFileMacro("config/default.json", "blake3");

// Hash governance rules
const rulesHash = await hashGovernanceRulesMacro();
```

## Build Metadata Module

Use `src/core/build-metadata.ts` to access all build-time constants:

```typescript
import { BUILD_METADATA, getBuildInfo } from "./core/build-metadata.js";

console.log(BUILD_METADATA.gitHash); // Git commit hash
console.log(BUILD_METADATA.version); // Version from package.json
console.log(BUILD_METADATA.buildTime); // Build timestamp
console.log(BUILD_METADATA.edgeConfig); // Edge configuration
console.log(BUILD_METADATA.governanceHash); // Governance rules hash

console.log(getBuildInfo()); // "NBA Swarm v1.0.0 (abc12345)"
```

## Usage in Code

### Embed Build Info

```typescript
import { BUILD_METADATA } from "./core/build-metadata.js";

// Build info is embedded at build time, no runtime overhead
logger.info(`Starting application`, {
  version: BUILD_METADATA.version,
  gitHash: BUILD_METADATA.gitHash,
});
```

## Benefits

1. **Zero Runtime Overhead**: Configuration loaded at build time
2. **Build-Time Validation**: Catch configuration errors during build
3. **Dead Code Elimination**: Unused macros are eliminated from bundle
4. **Security**: Macros can't be invoked from node_modules
5. **Parallel Execution**: Macros run in parallel across multiple workers

## Security

- Macros must be explicitly imported with `{ type: "macro" }`
- Macros cannot be invoked from `node_modules/**/*`
- Can disable macros with `--no-macros` flag

## Building with Macros

```bash
# Build normally (macros execute automatically)
bun build src/index.ts --outdir dist

# Disable macros (for security)
bun build src/index.ts --outdir dist --no-macros
```


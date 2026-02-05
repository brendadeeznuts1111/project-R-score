# Modularization Strategy - Golden Template Project

## Overview

This document outlines the strategy for splitting the Golden Template into modular packages using Bun's package manager (`bun pm`) and publishing system (`bun publish`).

## Current State (Monolith)

```
bun-toml-secrets-editor/
├── src/
│   ├── config/          # Secrets resolution + templates
│   ├── rss/             # RSS fetcher + integration
│   ├── cli/             # Multiple CLI tools
│   ├── templates/       # Project scaffolding
│   └── ...
├── package.json         # Single package, ~15 dependencies
└── 116 tests across 6 files
```

**Problems:**
- Users install all features even if they only need secrets management
- RSS dependencies (fast-xml-parser) included even for non-RSS users
- Large bundle size for simple use cases
- Versioning tied together (can't update RSS without bumping secrets)

---

## Option 1: Monorepo with Workspace (Recommended)

### Structure

```
golden-template-workspace/
├── packages/
│   ├── @golden/core/           # Secrets + config resolver
│   ├── @golden/rss/            # RSS fetcher (optional)
│   ├── @golden/cli/            # CLI tools
│   ├── @golden/templates/      # Project scaffolding
│   └── @golden/ui/             # Table formatter + UI utils
├── apps/
│   └── golden-template/        # Full-featured app (combines all)
├── bun.lock
└── package.json               # Workspace root
```

### Root package.json

```json
{
  "name": "@golden/workspace",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "publish": "bun run --filter './packages/*' publish"
  }
}
```

### Package: @golden/core

```json
{
  "name": "@golden/core",
  "version": "1.3.7",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./config": "./dist/config/secrets-config-resolver.js",
    "./template": "./dist/config/template-engine.js",
    "./context": "./dist/secrets/context-resolver.js"
  },
  "dependencies": {},
  "peerDependencies": {
    "bun": ">=1.3.7"
  }
}
```

**Size:** ~50KB, **Dependencies:** 0

### Package: @golden/rss

```json
{
  "name": "@golden/rss",
  "version": "1.3.7",
  "main": "./dist/index.js",
  "dependencies": {
    "@golden/core": "^1.3.7",
    "fast-xml-parser": "^5.3.0"
  }
}
```

**Size:** ~150KB, **Dependencies:** 2

### Package: @golden/cli

```json
{
  "name": "@golden/cli",
  "version": "1.3.7",
  "bin": {
    "golden": "./dist/cli/golden-template-cli.js",
    "golden-rss": "./dist/cli/rss-secrets-cli.js",
    "golden-init": "./dist/templates/golden-init.js"
  },
  "dependencies": {
    "@golden/core": "^1.3.7",
    "@golden/rss": "^1.3.7",
    "@golden/templates": "^1.3.7"
  }
}
```

### Package: @golden/templates

```json
{
  "name": "@golden/templates",
  "version": "1.3.7",
  "exports": {
    "./bun-create": "./templates/bun-create/",
    "./golden-v137": "./config/golden-template-v137.toml"
  }
}
```

### Package: @golden/ui

```json
{
  "name": "@golden/ui",
  "version": "1.3.7",
  "exports": {
    "./table": "./dist/utils/table-formatter-v137.js"
  }
}
```

### App: golden-template (Full Bundle)

```json
{
  "name": "golden-template",
  "version": "1.3.7",
  "dependencies": {
    "@golden/core": "^1.3.7",
    "@golden/rss": "^1.3.7",
    "@golden/cli": "^1.3.7",
    "@golden/templates": "^1.3.7",
    "@golden/ui": "^1.3.7"
  },
  "bin": {
    "golden": "./node_modules/.bin/golden"
  }
}
```

---

## Option 2: Separate Repos (Not Recommended)

```
golden-core/          # Separate repo
golden-rss/           # Separate repo  
golden-cli/           # Separate repo
```

**Cons:**
- Harder to coordinate releases
- Cross-repo PRs for changes
- Version drift between packages

---

## Bun PM Commands

### Workspace Management

```bash
# Install dependencies for all packages
bun install

# Add dependency to specific package
bun add --filter @golden/rss fast-xml-parser

# Add workspace dependency
bun add --filter @golden/rss @golden/core

# Run script in specific package
bun run --filter @golden/core test

# Run script in all packages
bun run --filter '*' build
```

### Publishing

```bash
# Version bump (all packages)
bun run version patch

# Publish to npm (all packages)
bun publish --filter './packages/*'

# Publish specific package
bun publish --filter @golden/core

# Dry run
bun publish --filter @golden/core --dry-run
```

---

## Asset Handling (SVGs, etc.)

### Option A: Inline Assets (Recommended for CLI tools)

```typescript
// assets/icons.ts
export const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#3b82f6"/>
  <text x="50" y="55" text-anchor="middle" fill="white">GT</text>
</svg>`;

// cli/output.ts
import { logoSvg } from "../assets/icons.js";

export function printLogo() {
  console.log(logoSvg);
}
```

**Pros:**
- No file system access needed
- Works in bundled executables
- Fast

**Cons:**
- Larger bundle size

### Option B: External Assets

```
package/
├── dist/
├── assets/
│   ├── logo.svg
│   └── banner.txt
└── src/
```

```typescript
import { readFileSync } from "fs";
import { join } from "path";

const logo = readFileSync(join(__dirname, "../assets/logo.svg"), "utf-8");
```

**Pros:**
- Smaller JS bundle
- Easy to update assets

**Cons:**
- Requires file system access
- Broken if files moved

### Option C: Base64 Encoding (For binary assets)

```typescript
// assets/logo-base64.ts
export const logoBase64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==";

export function getLogo(): string {
  return Buffer.from(logoBase64, "base64").toString("utf-8");
}
```

---

## Publishing Checklist

### Before Publishing

```bash
# 1. Update version
bun run version 1.3.8

# 2. Run tests
bun test

# 3. Build all packages
bun run --filter '*' build

# 4. Check bundle sizes
bun run --filter '*' size

# 5. Validate package.json files
bun run --filter '*' validate

# 6. Dry run publish
bun publish --filter @golden/core --dry-run
```

### package.json Requirements

```json
{
  "name": "@golden/core",
  "version": "1.3.7",
  "description": "Core secrets management",
  "license": "MIT",
  "author": "Nola Rose <nola@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/nolarose/golden-template.git",
    "directory": "packages/core"
  },
  "bugs": "https://github.com/nolarose/golden-template/issues",
  "homepage": "https://github.com/nolarose/golden-template#readme",
  "keywords": ["bun", "secrets", "config", "toml"],
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "test": "bun test",
    "prepublishOnly": "bun run build && bun test"
  },
  "engines": {
    "bun": ">=1.3.7"
  },
  "os": ["darwin", "linux", "win32"],
  "cpu": ["x64", "arm64"]
}
```

---

## Installation Patterns for Users

### Minimal Install (Secrets only)

```bash
bun add @golden/core
```

```typescript
import { resolveSecretsDir } from "@golden/core/config";
```

### RSS + Secrets

```bash
bun add @golden/core @golden/rss
```

### Full CLI

```bash
# Global install
bun add -g golden-template

# Or local
bun add -d golden-template
```

### Specific Use Case

```bash
# Only table formatter
bun add @golden/ui

# Only templates
bun add @golden/templates
```

---

## Bundle Size Comparison

| Package | Size | With Deps | Use Case |
|---------|------|-----------|----------|
| `@golden/core` | 50KB | 50KB | Secrets/config only |
| `@golden/rss` | 30KB | 200KB | + RSS fetching |
| `@golden/ui` | 20KB | 20KB | Table formatting |
| `@golden/cli` | 40KB | 300KB | All CLI tools |
| `golden-template` (full) | 10KB | 350KB | Everything |

**Savings:** Users only needing secrets save ~300KB

---

## Recommendation

### Phase 1: Workspace Setup (Now)

1. Convert to monorepo with Bun workspaces
2. Split into 5 packages
3. Keep in single repo for coordination

### Phase 2: Publishing (After stabilization)

1. Publish `@golden/core` first
2. Publish `@golden/rss` (depends on core)
3. Publish `@golden/cli`
4. Publish `golden-template` (full bundle)

### Phase 3: Assets (As needed)

1. Inline SVGs for CLI tools
2. External assets for web components
3. Base64 for binary data

---

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Monolith (current)** | Simple, single install | Bloated, can't pick features |
| **Workspace (recommended)** | Modular, coordinated releases | More complex build |
| **Separate repos** | True isolation | Version drift, harder coordination |

---

## Next Steps

```bash
# 1. Create workspace structure
mkdir -p packages/{core,rss,cli,templates,ui}
mkdir -p apps/golden-template

# 2. Move existing code
mv src/config packages/core/src/
mv src/rss packages/rss/src/
# ... etc

# 3. Set up workspace root
echo '{"workspaces": ["packages/*", "apps/*"]}' > package.json

# 4. Install dependencies
bun install

# 5. Build all
bun run --filter '*' build

# 6. Test
bun test
```

---

## Summary

**Yes, modularization is a good idea because:**

1. ✅ Users only install what they need
2. ✅ Smaller bundle sizes
3. ✅ Independent versioning
4. ✅ Easier to test individual components
5. ✅ Clearer dependencies

**Use Bun workspace because:**

1. ✅ Native support (no extra tools)
2. ✅ Fast (Bun's speed)
3. ✅ Coordinated releases
4. ✅ Shared lockfile

**Assets: Inline SVGs for CLI, external for web**

# Modularization Implementation Guide

## Step-by-Step Migration

### Phase 1: Setup Workspace Structure

```bash
# Create new branch
git checkout -b modularize

# Create directory structure
mkdir -p packages/core/src packages/rss/src packages/cli/src \
         packages/templates packages/ui/src \
         apps/golden-template/src
```

### Phase 2: Migrate Core Package

```bash
# Copy core files
cp -r src/config packages/core/src/
cp -r src/secrets packages/core/src/
cp -r src/__tests__/secrets-config-resolver.test.ts packages/core/src/__tests__/
cp -r src/__tests__/template-engine.test.ts packages/core/src/__tests__/

# Create package.json
 cat > packages/core/package.json << 'EOF'
{
  "name": "@golden/core",
  "version": "1.3.7",
  "description": "Core secrets management and config resolution",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./config": "./dist/config/secrets-config-resolver.js",
    "./template": "./dist/config/template-engine.js",
    "./context": "./dist/secrets/context-resolver.js"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "bun-types": "latest"
  },
  "peerDependencies": {
    "bun": ">=1.3.7"
  },
  "files": ["dist/", "README.md", "LICENSE"]
}
EOF
```

### Phase 3: Create Core Index

```typescript
// packages/core/src/index.ts
export { resolveSecretsDir, resolveConfigFile, resolveProfile, resolveAllConfig, formatConfigSummary } from "./config/secrets-config-resolver.js";
export { resolveTemplate, validateTemplate, generateSecretReport, createTemplate } from "./config/template-engine.js";
export { getContext, getUserProfilePath, resolveSecretsPath, initializeSecretsStructure, type SecretsContext } from "./secrets/context-resolver.js";
```

### Phase 4: Setup RSS Package

```bash
# Copy RSS files
cp -r src/rss packages/rss/src/
cp -r src/__tests__/rss-secrets-integration.test.ts packages/rss/src/__tests__/

# Create package.json
cat > packages/rss/package.json << 'EOF'
{
  "name": "@golden/rss",
  "version": "1.3.7",
  "description": "RSS feed integration with secrets management",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./fetcher": "./dist/rss/rss-fetcher-v137.js",
    "./integration": "./dist/rss/rss-secrets-integration-simple.js"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "test": "bun test"
  },
  "dependencies": {
    "@golden/core": "workspace:*",
    "fast-xml-parser": "^5.3.0"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
EOF
```

### Phase 5: Setup Root Workspace

```bash
# Root package.json
cat > package.json << 'EOF'
{
  "name": "@golden/workspace",
  "private": true,
  "version": "1.3.7",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "clean": "bun run --filter '*' clean",
    "lint": "bun run --filter '*' lint",
    "version": "bun run ./scripts/version.ts",
    "publish": "bun run ./scripts/publish.ts"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
EOF
```

### Phase 6: Install Dependencies

```bash
# Install all workspace dependencies
bun install

# Verify workspace packages are linked
ls -la node_modules/@golden/
# Should show: core, rss, cli, etc.
```

### Phase 7: Build All Packages

```bash
# Build in dependency order
bun run --filter @golden/core build
bun run --filter @golden/rss build
bun run --filter @golden/ui build
bun run --filter @golden/cli build
```

### Phase 8: Test

```bash
# Test all packages
bun test

# Test specific package
bun run --filter @golden/core test
```

---

## Asset Handling Implementation

### SVG Logo (Inline)

```typescript
// packages/cli/src/assets/logo.ts
export const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40">
  <rect x="5" y="5" width="30" height="30" rx="5" fill="#3b82f6"/>
  <text x="20" y="26" text-anchor="middle" fill="white" font-family="monospace" font-weight="bold">GT</text>
  <text x="42" y="26" fill="#374151" font-family="monospace" font-size="14">Golden Template</text>
</svg>`;

export function printLogo(): void {
  console.log(logoSvg);
}
```

### Banner Text (External)

```typescript
// packages/cli/src/assets/banner.ts
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getBanner(): string {
  try {
    return readFileSync(join(__dirname, "banner.txt"), "utf-8");
  } catch {
    // Fallback if file not found
    return "Golden Template v1.3.7";
  }
}
```

```text
// packages/cli/assets/banner.txt
╔══════════════════════════════════════════════════════════╗
║            Golden Template v1.3.7                        ║
║     Bun-native secrets management and config             ║
╚══════════════════════════════════════════════════════════╝
```

### Binary Assets (Base64)

```typescript
// packages/templates/src/assets/templates.ts
// Base64 encoded template files
export const templates = {
  "bun-secrets": "UEsDBBQAAAAIA...", // zip of template
  "golden-v137": "W2NvbW1vbl0K...", // toml base64
};

export function extractTemplate(name: string, targetDir: string): void {
  const base64 = templates[name as keyof typeof templates];
  if (!base64) throw new Error(`Template ${name} not found`);
  
  const buffer = Buffer.from(base64, "base64");
  // Extract to targetDir...
}
```

---

## Publishing to npm

### Step 1: Login

```bash
bun pm login
# Enter npm credentials
```

### Step 2: Version Bump

```bash
# Bump all packages
./scripts/version.ts patch  # 1.3.7 -> 1.3.8
./scripts/version.ts minor  # 1.3.7 -> 1.4.0
./scripts/version.ts major  # 1.3.7 -> 2.0.0
```

### Step 3: Publish

```bash
# Publish all packages
bun run publish

# Or individually
bun publish --filter @golden/core
bun publish --filter @golden/rss
bun publish --filter @golden/cli
```

### Publish Script

```typescript
// scripts/publish.ts
import { readdirSync } from "fs";
import { join } from "path";

const packagesDir = "./packages";
const packages = readdirSync(packagesDir);

for (const pkg of packages) {
  console.log(`Publishing @golden/${pkg}...`);
  
  const proc = Bun.spawn([
    "bun", "publish", 
    `--filter", `@golden/${pkg}`,
    "--access", "public"
  ], {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
}

console.log("All packages published!");
```

---

## User Installation Examples

### 1. Minimal (Secrets Only)

```bash
bun add @golden/core
```

```typescript
import { resolveSecretsDir } from "@golden/core/config";

const config = resolveSecretsDir();
console.log(config.path);
```

### 2. RSS + Secrets

```bash
bun add @golden/core @golden/rss
```

```typescript
import { loadGoldenTemplate } from "@golden/core";
import { RSSSecretsManager } from "@golden/rss/integration";
```

### 3. Full CLI

```bash
bun add -g golden-template
# or
bun add -d golden-template
```

```bash
golden --version
golden init --template bun-secrets
```

### 4. Table Formatter Only

```bash
bun add @golden/ui
```

```typescript
import { TableFormatterV137 } from "@golden/ui/table";

const table = new TableFormatterV137();
```

---

## Bundle Analysis

```bash
# Analyze bundle sizes
bun run --filter @golden/core analyze
bun run --filter @golden/rss analyze

# Compare before/after
# Monolith: ~500KB
# Modular: 50KB-300KB depending on needs
```

---

## Rollback Plan

If modularization causes issues:

```bash
# Revert to monolith
git checkout main
git branch -D modularize

# Or use tags
git checkout v1.3.7-monolith
```

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup | 1 day | Create structure, move files |
| Testing | 2 days | Fix imports, run tests |
| Polish | 1 day | READMEs, examples |
| Publish | 1 day | npm publish, verification |

**Total: ~1 week for full migration**

---

## Success Metrics

- [ ] All 116 tests passing
- [ ] Bundle size reduced for minimal installs
- [ ] No breaking changes for existing users
- [ ] Published to npm
- [ ] Documentation updated

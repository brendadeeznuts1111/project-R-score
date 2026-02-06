# Bun Publish: Scoped Registry Integration for @graph Monorepo

Complete publishing strategy for the `@graph/*` packages, integrated with workspace development, benchmarking, and CI/CD infrastructure.

---

## **1. Publishing Architecture: Workspace → Registry**

Your monorepo has two modes: **development** (workspaces) and **production** (registry).

**Flow:**
```text
Developer: packages/@graph/layer4
    ↓ bun install
Symlink: node_modules/@graph/layer4

CI/CD: VERSION=1.4.0
    ↓ bun run scripts/publish-graph-monorepo.ts
Rewrite package.json (workspace:* → ^1.4.0)
    ↓ bun publish
Registry: npm.internal.yourcompany.com/@graph/layer4@1.4.0

Production App
    ↓ bun install
Registry Package
```

**Key Insight**: Bun automatically handles `workspace:*` → registry version conversion during publish.

---

## **2. Per-Package Configuration**

Each `@graph` package needs a `publishConfig` that matches your security model:

### **`packages/@graph/layer4/package.json`**

```json
{
  "name": "@graph/layer4",
  "version": "1.4.0-workspace",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./builder": "./src/builder.ts",
    "./detector": "./src/detector.ts"
  },
  "publishConfig": {
    "registry": "https://npm.internal.yourcompany.com",
    "access": "restricted",
    "tag": "latest"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "prepublishOnly": "bun run build && bun test",
    "postpublish": "bun run scripts/notify-slack.ts"
  }
}
```

---

## **3. Automated Publishing Script**

The publishing script (`scripts/publish-graph-monorepo.ts`) publishes packages in **dependency order**:

### **Dependency Order**

```typescript
const PUBLISH_ORDER = [
  '@graph/types',        // No deps
  '@graph/algorithms',   // depends on types
  '@graph/storage',      // depends on types, algorithms
  '@graph/layer1',       // depends on types, algorithms
  '@graph/layer2',       // depends on types, algorithms, layer1
  '@graph/layer3',       // depends on types, algorithms, layer1, layer2
  '@graph/layer4',       // depends on all above
  '@graph/api',          // depends on all packages
  '@graph/dashboard'     // depends on all packages
];
```

### **Usage**

```bash
# Dry run
bun run scripts/publish-graph-monorepo.ts --dry-run

# Publish with 2FA
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --otp=123456

# Publish beta
VERSION=1.5.0-beta.1 bun run scripts/publish-graph-monorepo.ts --tag=beta

# Publish single package
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --package=@graph/layer4

# Publish with custom registry
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --registry=https://custom-registry.com
```

---

## **4. Pre-Publish Validation**

Run validation before publishing to ensure quality:

```bash
VERSION=1.4.0 bun run scripts/validate-before-publish.ts
```

**Checks:**
1. ✅ Version format validation
2. ✅ All packages are built
3. ✅ Tests pass
4. ✅ No benchmark regressions
5. ✅ Security audit passes
6. ✅ Package.json structure is valid

---

## **5. Post-Publish Verification**

Verify packages were published correctly:

```bash
VERSION=1.4.0 bun run scripts/verify-publish.ts
```

**Verification Steps:**
1. ✅ Check each package version exists on registry
2. ✅ Verify package can be installed
3. ✅ Validate package metadata

---

## **6. CI/CD GitHub Actions Integration**

### **`.github/workflows/publish-graph-packages.yml`**

The workflow automatically:
- ✅ Triggers on version tags (`v*`)
- ✅ Configures private registry
- ✅ Runs pre-publish validation
- ✅ Verifies benchmarks (no regressions)
- ✅ Publishes packages in dependency order
- ✅ Creates benchmark baseline
- ✅ Verifies published packages

**Manual Trigger:**
```yaml
workflow_dispatch:
  inputs:
    version: "1.4.1"
    tag: "latest"
    package: ""  # Empty for all packages
    skip_validation: false
```

---

## **7. Security & Token Management**

### **Token Configuration Hierarchy**

```bash
# Priority order (highest to lowest):

# 1. CLI flag
bun publish --token npm_xxxxxxxxxxxxxxxx

# 2. Environment variable
export NPM_CONFIG_TOKEN=npm_xxxxxxxxxxxxxxxx

# 3. .npmrc file (git-ignored)
echo "//npm.internal.yourcompany.com/:_authToken=${GRAPH_NPM_TOKEN}" > .npmrc

# 4. bunfig.toml (can reference env var)
[install.scopes."@graph"]
token = "$GRAPH_NPM_TOKEN"

# 5. npm config
npm config set @graph:registry https://npm.internal.yourcompany.com
npm config set //npm.internal.yourcompany.com/:_authToken npm_xxxxxxxxxxxxxxxx
```

### **GitHub Actions Secret Setup**

```bash
# Set secrets in GitHub repo
gh secret set GRAPH_NPM_TOKEN --repo yourorg/graph-engine --body "npm_xxxxxxxxxxxxxxxx"
gh secret set NPM_OTP --repo yourorg/graph-engine --body "123456"
```

---

## **8. Publishing Scenarios**

### **Scenario 1: Nightly Beta Release**

```bash
# Tag current main as beta
VERSION=$(date +%Y%m%d)-beta.1 bun run scripts/publish-graph-monorepo.ts --tag=beta

# Use in staging
cd staging-app
bun add @graph/layer4@beta
```

### **Scenario 2: Hotfix Patch (v1.4.1)**

```bash
# Create hotfix branch
git checkout -b hotfix/critical-bug

# Fix bug in layer4
# ...

# Version specifically for layer4 only
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --package=@graph/layer4

# Other packages stay at 1.4.0
```

### **Scenario 3: Emergency Rollback**

```bash
# Publish previous version as rollback tag
VERSION=1.3.5 bun run scripts/publish-graph-monorepo.ts --tag=rollback

# Apps can switch to rollback
bun add @graph/layer4@rollback
```

---

## **9. Integration with Benchmarking System**

Each published version creates a **performance baseline**:

```bash
# Automatically created during CI/CD publish
COMMIT_SHA=$(git rev-parse HEAD)
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=profiles/market-analysis.cpuprofile \
  --name="Publish Baseline v1.4.0" \
  --description="Performance baseline for published version 1.4.0" \
  --tags="publish,1.4.0,baseline"
```

This enables:
- ✅ Performance regression detection
- ✅ Version-to-version performance comparison
- ✅ Historical performance tracking

---

## **10. Best Practices Summary**

| Practice | Command | Rationale |
|----------|---------|-----------|
| **Always dry-run first** | `bun run scripts/publish-graph-monorepo.ts --dry-run` | Catches packaging errors early |
| **Use scoped packages** | `@graph/layer4` | Prevents name collisions |
| **Restrict access** | `--access restricted` | Private packages only |
| **Automate in CI** | GitHub Actions | Consistent, audited publishes |
| **Tag pre-releases** | `--tag=beta` | Separate stable from unstable |
| **Validate before publish** | `bun run scripts/validate-before-publish.ts` | No broken packages in registry |
| **Use OTP in CI** | `--otp=${{ secrets.NPM_OTP }}` | 2FA security compliance |
| **Verify after publish** | `bun run scripts/verify-publish.ts` | Ensure packages are accessible |
| **Create benchmarks** | Automatic in CI | Track performance over time |

---

## **11. Quick Reference: Publishing Commands**

```bash
# Development (workspaces only)
bun install                    # Creates symlinks

# Pre-publish validation
VERSION=1.4.0 bun run scripts/validate-before-publish.ts

# Publish single package (manual)
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --package=@graph/layer4 --otp=123456

# Publish all packages (automated)
VERSION=1.4.0 bun run scripts/publish-graph-monorepo.ts

# Publish beta
VERSION=1.5.0-beta.1 bun run scripts/publish-graph-monorepo.ts --tag=beta

# Post-publish verification
VERSION=1.4.0 bun run scripts/verify-publish.ts

# Force publish (if registry is out of sync)
bun publish --force --access restricted
```

---

## **12. Registry Configuration Constants**

Registry URLs and configuration are centralized in `src/utils/rss-constants.ts`:

```typescript
export const RSS_REGISTRY_CONFIG = {
  PRIVATE_REGISTRY: "https://npm.internal.yourcompany.com",
  PUBLIC_REGISTRY: "https://registry.npmjs.org",
  SCOPE: "@graph",
  DEFAULT_ACCESS: "restricted",
  DEFAULT_TAG: "latest",
} as const;
```

---

## **Related Documentation**

- 📚 [Benchmarks README](../benchmarks/README.md) - Performance benchmarking guide
- 📚 [Bun v1.51 Impact Analysis](./BUN-V1.51-IMPACT-ANALYSIS.md) - Performance optimizations
- 📚 [Workspace Developer Onboarding](./WORKSPACE-DEVELOPER-ONBOARDING.md) - API key management
- 📚 [Bun RSS Integration](./BUN-RSS-INTEGRATION.md) - Team & API credentials integration

---

Your `@graph/*` monorepo now has a **production-grade publishing pipeline** that integrates seamlessly with workspace development, benchmarking system, and CI/CD infrastructure.

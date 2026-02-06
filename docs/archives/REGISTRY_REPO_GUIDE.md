# 📦 FactoryWager Registry - Repository Guide

## 🤔 Dedicated Repo vs Current Monorepo?

### ✅ Recommendation: **DEDICATED REPO**

Given the scope and production requirements, a dedicated repository is recommended.

---

## 📊 Comparison

| Factor | Current Monorepo | Dedicated Repo | Winner |
|--------|------------------|----------------|--------|
| **Deployment** | Coupled with main app | Independent CI/CD | Dedicated |
| **Scaling** | Limited by main app | Horizontal scaling | Dedicated |
| **Security** | Shared access | Isolated secrets | Dedicated |
| **Contributors** | Main team only | External contributors | Dedicated |
| **Versioning** | Tied to app releases | Independent semver | Dedicated |
| **Setup Complexity** | Already integrated | New setup required | Current |
| **Shared Code** | Easy reuse | Needs npm packages | Current |

---

## 🏆 Recommended Structure: **Hybrid Approach**

### Option A: Dedicated Registry Repo (Recommended)

```text
factorywager-registry/          # NEW REPO
├── 📦 Core Registry
│   ├── packages/
│   │   ├── registry-server/    # NPM registry server
│   │   ├── r2-storage/         # R2 storage adapter
│   │   ├── auth/               # Authentication
│   │   └── config/             # JSON5/JSONL config
│   │
│   ├── 🔧 Tools
│   │   ├── cli/                # Registry CLI
│   │   ├── bunx/               # bun x integration
│   │   └── secrets/            # bun.secrets manager
│   │
│   └── 🌐 CDN
│       └── worker/             # Cloudflare Worker
│
├── 📚 Documentation
│   ├── packages/
│   │   ├── docs-fetcher/       # Package doc fetching
│   │   ├── sync/               # Cross-device sync
│   │   └── rss/                # RSS aggregation
│   │
│   └── web/                    # Documentation portal
│
├── 🔐 Security
│   ├── packages/
│   │   ├── secrets-manager/    # Versioned secrets
│   │   └── iam/                # Access control
│   │
│   └── policies/               # Security policies
│
├── 📊 Versioning
│   ├── packages/
│   │   ├── semver/             # bun.semver wrapper
│   │   └── version-graph/      # Visual graphs
│   │
│   └── visualizer/             # Web version graph UI
│
├── 🧪 Testing
│   ├── e2e/                    # End-to-end tests
│   ├── integration/            # Integration tests
│   └── fixtures/               # Test packages
│
└── 🚀 Deployment
    ├── terraform/              # Infrastructure
    ├── kubernetes/             # K8s manifests
    └── github-actions/         # CI/CD workflows
```

### Option B: Monorepo Workspace (Alternative)

If staying in current repo, use workspaces:

```text
Projects/
├── apps/
│   ├── factorywager/           # Current main app
│   └── registry/               # NEW: Registry app
│       ├── server/             # Registry server
│       ├── cli/                # CLI tool
│       └── worker/             # CDN worker
│
├── packages/
│   ├── registry-core/          # Shared registry logic
│   ├── r2-storage/             # R2 adapter
│   ├── version-manager/        # bun.semver
│   ├── secrets-manager/        # bun.secrets
│   └── bunx-integration/       # bun x
│
└── services/
    ├── docs-sync/              # Documentation sync
    └── rss-aggregator/         # RSS feeds
```

---

## 🚀 Migration Path

### Phase 1: Extract Core (Week 1-2)

```bash
# 1. Create new repo
git init factorywager-registry
cd factorywager-registry

# 2. Extract registry code
git subtree split -P lib/registry -b registry-extract

# 3. Push to new repo
git push git@github.com:factorywager/registry.git registry-extract:main
```

### Phase 2: Setup Workspaces (Week 2-3)

```json
// package.json
{
  "name": "@factorywager/registry",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "deploy": "bun run deploy:staging && bun run deploy:prod"
  }
}
```

### Phase 3: Independent Deployment (Week 3-4)

```yaml
# .github/workflows/deploy.yml
name: Deploy Registry
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run deploy:production
```

---

## 📦 Package Structure (Recommended)

### Core Packages

```typescript
// packages/registry-core/package.json
{
  "name": "@factorywager/registry-core",
  "version": "1.0.0",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./storage": "./src/storage.ts",
    "./auth": "./src/auth.ts"
  },
  "dependencies": {
    "@factorywager/r2-storage": "workspace:*"
  }
}

// packages/r2-storage/package.json
{
  "name": "@factorywager/r2-storage",
  "version": "1.0.0",
  "exports": {
    ".": "./src/index.ts"
  }
}

// packages/semver/package.json
{
  "name": "@factorywager/semver",
  "version": "1.0.0",
  "peerDependencies": {
    "bun": ">=1.4.0"
  }
}

// packages/secrets/package.json
{
  "name": "@factorywager/secrets",
  "version": "1.0.0",
  "peerDependencies": {
    "bun": ">=1.4.0"
  }
}
```

---

## 🔗 Integration with Current Repo

### Option 1: NPM Packages (Recommended)

```bash
# In new registry repo
bun run build
bun publish --access restricted

# In current repo
bun add @factorywager/registry-core
bun add @factorywager/secrets
```

### Option 2: Git Submodules

```bash
# In current repo
git submodule add git@github.com:factorywager/registry.git packages/registry
```

### Option 3: GitHub Packages

```json
// .npmrc
@factorywager:registry=https://npm.pkg.github.com

// package.json
{
  "dependencies": {
    "@factorywager/registry": "^1.0.0"
  }
}
```

---

## 🏗️ Recommended Architecture

### Dedicated Registry Repo

```text
┌─────────────────────────────────────────────────────────────────┐
│                  factorywager/registry                          │
│                      (GitHub)                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Server     │  │    CLI      │  │   Worker    │             │
│  │  (Bun)      │  │   (Bun)     │  │  (CFW)      │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┴────────────────┘                     │
│                          │                                      │
│              ┌───────────┴───────────┐                         │
│              │    Core Packages      │                         │
│              │  (registry-core,      │                         │
│              │   r2-storage, etc)    │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│              ┌───────────┴───────────┐                         │
│              │    R2 Buckets         │                         │
│              │  npm-registry         │                         │
│              │  secrets              │                         │
│              │  versions             │                         │
│              └───────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Current FactoryWager Repo                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Uses @factorywager/registry from npm/GitHub Packages   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Decision Matrix

### Use DEDICATED REPO if:
- [ ] Registry will be used by multiple projects
- [ ] Need independent deployment cycles
- [ ] Want external contributors
- [ ] Require separate CI/CD pipelines
- [ ] Need different access controls
- [ ] Plan to open source parts of it
- [ ] Want separate versioning (semver)

### Use CURRENT REPO if:
- [ ] Registry is tightly coupled to main app
- [ ] Small team, simple deployment
- [ ] Don't want to manage multiple repos
- [ ] Shared code is complex to extract
- [ ] Quick MVP needed

---

## 🎯 Final Recommendation

### **START**: Current repo (MVP)
- Keep registry in `lib/registry/`
- Use existing R2 infrastructure
- Quick iteration

### **SCALE**: Extract to dedicated repo
- When registry stabilizes
- Create `@factorywager/registry` packages
- Independent deployment
- Open source friendly

### **ENTERPRISE**: Hybrid monorepo
- Use workspaces
- Separate deployment pipelines
- Shared packages where needed

---

## 📋 Action Items

### If Dedicated Repo:

```bash
# 1. Create repo
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"name":"registry","private":true}' \
  https://api.github.com/orgs/factorywager/repos

# 2. Extract code
git clone git@github.com:factorywager/registry.git
cd registry
git subtree add -P packages/registry ../Projects main

# 3. Setup workspace
bun init -y
# Edit package.json for workspaces

# 4. Install dependencies
bun install

# 5. Setup CI/CD
# Copy .github/workflows from main repo, adapt

# 6. Deploy
bun run deploy:staging
```

### If Current Repo:

```bash
# 1. Keep as-is, just ensure isolation
echo "lib/registry/" > .dockerignore
echo "lib/registry/" > .vercelignore

# 2. Add workspace support
# Edit root package.json

# 3. Separate deployment script
bun run registry:deploy:cdn
```

---

## 💡 Best Practices

### For Dedicated Repo:
1. **Semantic Versioning**: Independent from main app
2. **Changelog**: Keep detailed changelog
3. **Documentation**: Comprehensive README
4. **Testing**: 90%+ coverage
5. **Security**: Separate secrets management
6. **Monitoring**: Dedicated dashboards

### For Current Repo:
1. **Isolation**: Clear boundaries
2. **Documentation**: Inline docs
3. **Testing**: Integration tests
4. **Security**: Shared but scoped
5. **Monitoring**: Shared dashboard, filtered views

---

## 🚀 Next Steps

1. **Decide**: Vote on dedicated vs current
2. **Plan**: Create migration timeline
3. **Execute**: Extract or organize
4. **Deploy**: Production registry
5. **Monitor**: Usage and performance

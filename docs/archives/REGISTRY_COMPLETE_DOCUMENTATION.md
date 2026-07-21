# 📦 FactoryWager Registry - Complete Documentation

## 🎯 Overview

A **production-ready private NPM registry** with Bun v1.4+ integration, featuring:
- **bun.semver** versioning with visual graphs
- **bun.secrets** secure credential management
- **bun x** package execution
- **R2-backed** storage and sync
- **CDN distribution** via Cloudflare Workers

---

## 📂 File Structure

```text
lib/registry/                          # Core registry system
├── index.ts                          # Unified exports
├── registry-types.ts                 # TypeScript definitions
├── r2-storage.ts                     # R2 storage (Bun v1.3.7+)
├── auth.ts                           # Authentication
├── server.ts                         # NPM registry server
├── cli.ts                            # CLI (Bun.wrapAnsi)
├── cdn-worker.ts                     # Cloudflare Worker
├── config-loader.ts                  # JSON5/JSONL config
├── package-docs.ts                   # Documentation fetcher
├── docs-sync.ts                      # Cross-device sync
├── rss-aggregator.ts                 # RSS feeds
├── version-manager.ts                # bun.semver + graphs ⭐ NEW
├── secrets-manager.ts                # bun.secrets ⭐ NEW
└── bunx-integration.ts               # bun x ⭐ NEW

Config & Docs:
├── registry-wrangler.toml            # Worker deployment
├── config/registry.config.json       # Default config
├── .env.registry.example             # Environment template
├── REGISTRY_SETUP.md                 # Setup guide
├── REGISTRY_DOCS_GUIDE.md            # Integration guide
├── REGISTRY_BUN_1_3_7_UPDATES.md     # Bun v1.3.7 features
├── REGISTRY_BUN_1_4_COMPLETE.md      # Bun v1.4+ features
└── REGISTRY_REPO_GUIDE.md            # Repo structure guide
```

---

## 🚀 Quick Start

### 1. Setup (5 minutes)

```bash
# Copy environment
cp .env.registry.example .env.registry

# Edit variables
nano .env.registry
```

Required:
```bash
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_REGISTRY_BUCKET=npm-registry
```

### 2. Start Registry

```bash
# Local development
bun run registry:start

# With JSON5 config
bun run registry:config:init
bun run registry:start
```

### 3. Configure npm

```bash
npm config set registry http://localhost:4873
npm login
```

### 4. Publish Package

```bash
cd my-package
npm publish
```

---

## 📊 All Available Commands

### Registry Management
```bash
bun run registry:start              # Start server
bun run registry:publish [path]     # Publish package
bun run registry:info <pkg>         # Package info
bun run registry:search <query>     # Search packages
bun run registry:list               # List packages
bun run registry:stats              # Statistics
bun run registry:config             # Show config
bun run registry:token:create       # Create auth token
bun run registry:deploy:cdn         # Deploy CDN
```

### Version Management (bun.semver)
```bash
bun run version:parse <version>              # Parse semver
bun run version:compare <a> <b>              # Compare versions
bun run version:recommend <v> <type>         # Recommend next
bun run version:graph <pkg> [ascii|mermaid]  # Visual graph
bun run version:rollback <pkg> <version>     # Rollback
```

### Secrets Management (bun.secrets)
```bash
bun run secrets:init                 # Initialize
bun run secrets:set <key> <value>    # Store secret
bun run secrets:get <key>            # Get secret
bun run secrets:rotate <key> <value> # Rotate secret
bun run secrets:versions <key>       # Show history
bun run secrets:list                 # List secrets
bun run secrets:delete <key>         # Delete secret
```

### bun x Integration
```bash
bun run bunx:run <pkg>[@v] [args]    # Execute package
bun run bunx:resolve <pkg> [range]   # Resolve version
bun run bunx:cache                   # List cache
bun run bunx:clean [days]            # Clean old cache
```

### Documentation
```bash
bun run pkg:fetch <pkg>              # Fetch docs
bun run pkg:search <query>           # Search packages
bun run pkg:local [path]             # Local packages
```

### Sync & RSS
```bash
bun run sync:upload                  # Sync to R2
bun run sync:status                  # Check status
bun run sync:docset:create           # Create doc set
bun run rss:fetch                    # Fetch feeds
bun run rss:list                     # List items
bun run rss:html                     # Generate HTML
```

### Config Management (JSON5)
```bash
bun run registry:config:init         # Create JSON5 config
bun run registry:config:load         # Load config
bun run registry:config:save         # Save config
```

---

## 🔧 Bun v1.4+ Features

### bun.semver Integration

```typescript
import { VersionManager } from './lib/registry/index.ts';

const versions = new VersionManager();

// Parse version
const parsed = versions.parseVersion('1.2.3');
// { valid: true, parsed: { major: 1, minor: 2, patch: 3 } }

// Compare versions
const cmp = versions.compareVersions('1.2.3', '1.2.4');
// -1 (first is lower)

// Generate visual graph
const graph = await versions.buildVersionGraph('lodash');
console.log(versions.generateAsciiGraph(graph));
```

### bun.secrets Integration

```typescript
import { RegistrySecretsManager } from './lib/registry/index.ts';

const secrets = new RegistrySecretsManager();

// Store with OS-native encryption
await secrets.setSecret('api-key', 'secret123', {
  useBunSecrets: true,
});

// Get from cache or R2
const secret = await secrets.getSecret('api-key');

// Rotate with version history
await secrets.rotateSecret('api-key', 'new-secret');

// Visual version graph
const versions = await secrets.getSecretVersions('api-key');
console.log(secrets.generateVersionGraph('api-key', versions));
```

### bun x Integration

```typescript
import { BunXIntegration } from './lib/registry/index.ts';

const bunx = new BunXIntegration();

// Execute from private registry
await bunx.execute({
  package: '@factorywager/cli',
  version: '^2.0.0',
  args: ['deploy', '--env=production'],
});

// Resolve with semver
const version = await bunx.resolveVersion('lodash', '^4.17.0');
```

---

## 📈 Visual Graphs

### ASCII (Terminal)

```text
📦 lodash
==================================================

├── v4.17.21   [Current] 🏷️ latest
│   📅 1/15/2026
│   👤 jdalton
│
├── v4.17.20   [Rollback Ready] 🏷️ stable
│   📅 1/10/2026
│
└── v4.17.19   [Archived]
    📅 12/20/2025
```

### Mermaid (Markdown)

```mermaid
graph TD
  subgraph "Version History"
    v4_17_19["4.17.19"][[Archived]]
    v4_17_20["4.17.20"](#)
    v4_17_21["4.17.21"][Current]
  end
  
  v4_17_19 -->|patch| v4_17_20
  v4_17_20 -->|patch| v4_17_21
  
  latest["🏷️ latest"] --> v4_17_21
  stable["🏷️ stable"] --> v4_17_20
```

### JSON (D3.js)

```json
{
  "name": "lodash",
  "current": "4.17.21",
  "nodes": [
    { "id": "4.17.21", "status": "current", "tags": ["latest"] },
    { "id": "4.17.20", "status": "rollback", "tags": ["stable"] }
  ],
  "links": [
    { "source": "4.17.20", "target": "4.17.21", "type": "patch" }
  ]
}
```

---

## 🔐 Security Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│ 1️⃣ bun.secrets                                              │
│    • OS Keychain (macOS)                                     │
│    • Windows Credential Store                                │
│    • Linux libsecret                                         │
│    • Local encryption                                        │
├─────────────────────────────────────────────────────────────┤
│ 2️⃣ R2-Backed Version History                                │
│    • Immutable version storage                               │
│    • Audit trails                                            │
│    • One-click rollback                                      │
│    • Geographic replication                                  │
├─────────────────────────────────────────────────────────────┤
│ 3️⃣ IAM-Style Access Control                                 │
│    • Role-based permissions                                  │
│    • Environment restrictions                                │
│    • Rotation schedules                                      │
│    • CIDR whitelisting                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 Deployment

### Local Development
```bash
bun run registry:start --port 4873
```

### Staging
```bash
bun run registry:deploy:staging
```

### Production
```bash
bun run registry:deploy:cdn
```

### Docker
```dockerfile
FROM oven/bun:1.4
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .
EXPOSE 4873
CMD ["bun", "run", "lib/registry/server.ts"]
```

---

## 📊 Monitoring

### Registry Stats
```bash
bun run registry:stats
```

### Version Graph
```bash
bun run version:graph @factorywager/utils ascii
```

### Secret Audit
```bash
bun run secrets:versions api-key
```

### Cache Status
```bash
bun run bunx:cache
```

---

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test R2
bun run lib/registry/r2-storage.ts

# Check credentials
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
```

### Version Resolution
```bash
# Debug semver
bun run version:parse 1.2.3
bun run version:compare 1.2.3 1.2.4
```

### Secret Access
```bash
# Initialize secrets
bun run secrets:init

# Check version
bun run secrets:versions <key>
```

### Cache Issues
```bash
# Clear cache
bun run bunx:clean 0

# Verify cache
bun run bunx:cache
```

---

## 📚 Documentation Index

| File | Purpose |
|------|---------|
| `REGISTRY_SETUP.md` | Initial setup guide |
| `REGISTRY_DOCS_GUIDE.md` | Integration examples |
| `REGISTRY_BUN_1_3_7_UPDATES.md` | Bun v1.3.7 features |
| `REGISTRY_BUN_1_4_COMPLETE.md` | Bun v1.4+ features |
| `REGISTRY_REPO_GUIDE.md` | Repo structure decision |
| `REGISTRY_COMPLETE_DOCUMENTATION.md` | This file |

---

## 🎯 Use Cases

### 1. Private Package Hosting
```bash
bun run registry:start
npm config set registry http://localhost:4873
npm publish
```

### 2. Version Management
```bash
bun run version:graph my-package mermaid
bun run version:rollback my-package 1.2.3
```

### 3. Secret Rotation
```bash
bun run secrets:rotate api-key "new-value"
bun run secrets:versions api-key
```

### 4. Documentation Hub
```bash
bun run pkg:fetch lodash
bun run sync:upload
```

### 5. Package Execution
```bash
bun run bunx:run @factorywager/cli --help
```

---

## 🚀 Roadmap

### Phase 1: MVP ✅
- [x] NPM registry server
- [x] R2 storage
- [x] Basic auth

### Phase 2: Bun v1.3.7 ✅
- [x] JSON5 config
- [x] Header preservation
- [x] Content encoding

### Phase 3: Bun v1.4+ ✅
- [x] bun.semver versioning
- [x] bun.secrets integration
- [x] bun x execution
- [x] Visual graphs

### Phase 4: Enterprise
- [ ] Web UI
- [ ] Advanced analytics
- [ ] Multi-region support
- [ ] GitHub Actions integration

---

## 💡 Tips

1. **Use JSON5 configs** for comments and trailing commas
2. **Enable compression** for faster downloads
3. **Visual graphs** help understand version history
4. **Rotate secrets** regularly with version tracking
5. **Cache packages** locally for faster bun x execution

---

## 🤝 Contributing

See main repo CONTRIBUTING.md

---

## 📄 License

MIT - FactoryWager

# 📦 FactoryWager Registry - Complete Setup Guide

## 🎉 System Complete

Your private NPM registry with documentation, sync, and RSS aggregation is fully set up and Bun v1.3.7 optimized!

---

## 📂 File Structure

```
lib/registry/
├── registry-types.ts       # Core TypeScript types
├── r2-storage.ts          # R2 storage adapter (Bun v1.3.7+)
├── auth.ts                # Authentication middleware
├── server.ts              # NPM registry server
├── cli.ts                 # CLI interface (Bun.wrapAnsi)
├── cdn-worker.ts          # Cloudflare Worker
├── config-loader.ts       # JSON5/JSONL config (Bun v1.3.7+)
├── package-docs.ts        # Package documentation fetcher
├── docs-sync.ts           # Cross-device sync service
├── rss-aggregator.ts      # RSS feed aggregation
└── index.ts               # Unified exports

Config:
├── registry-wrangler.toml     # Worker deployment
├── config/registry.config.json # Default config
└── .env.registry.example      # Environment template

Docs:
├── REGISTRY_SETUP.md          # Main setup guide
├── REGISTRY_DOCS_GUIDE.md     # Integration guide
└── REGISTRY_BUN_1_3_7_UPDATES.md # Bun v1.3.7 features
```

---

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.registry.example .env.registry

# Edit with your values
nano .env.registry
```

Required variables:
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_REGISTRY_BUCKET=npm-registry
REGISTRY_PORT=4873
REGISTRY_AUTH=none  # or basic, token, jwt
```

### 2. Create R2 Bucket

```bash
# Using Cloudflare dashboard or:
wrangler r2 bucket create npm-registry
```

### 3. Start Registry (3 ways)

**Option A: Local Development**
```bash
bun run registry:start
```

**Option B: With Config**
```bash
# Create JSON5 config first
bun run registry:config:init

# Edit config
nano registry.config.json5

# Start with config
bun run registry:start
```

**Option C: Deploy to CDN**
```bash
# Deploy Cloudflare Worker
bun run registry:deploy:cdn

# Your registry is now at npm.factory-wager.com
```

### 4. Configure npm Client

```bash
# Local registry
npm config set registry http://localhost:4873

# Or CDN
npm config set registry https://npm.factory-wager.com

# With authentication
npm login --registry http://localhost:4873
```

---

## 📦 Package Management

### Publish Packages

```bash
# Via CLI
bun run registry:publish ./my-package

# Via npm (with registry configured)
cd my-package && npm publish
```

### Install Packages

```bash
npm install @factorywager/my-package
```

### Search Packages

```bash
bun run registry:search "state management"
```

---

## 📚 Documentation System

### Fetch Package Docs

```bash
# Fetch documentation
bun run pkg:fetch lodash
bun run pkg:fetch react 18.2.0

# Search packages
bun run pkg:search "router"

# List local packages
bun run pkg:local
```

### Generate HTML Docs

```typescript
import { PackageDocumentationFetcher } from './lib/registry/index.ts';

const fetcher = new PackageDocumentationFetcher();
const doc = await fetcher.fetchDocs('lodash');
const html = fetcher.generateHtmlDoc(doc);

await Bun.write('lodash-docs.html', html);
```

---

## 🔄 Cross-Device Sync

### Setup Sync

```bash
# Set user ID
export USER_ID=your-user-id

# Sync preferences
bun run sync:upload

# Check status
bun run sync:status
```

### Create Doc Sets

```bash
# Create a doc set
bun run sync:docset:create "Frontend Stack" "react,vue,angular"

# List doc sets
bun run sync:docset:list
```

---

## 📰 RSS Aggregation

### Setup Feeds

```bash
# Fetch all feeds
bun run rss:fetch

# List recent items
bun run rss:list

# View subscribed feeds
bun run rss:feeds
```

### Add Custom Feeds

```bash
bun run rss:add "https://example.com/feed.xml" "Example Blog"
```

### Generate HTML Feed

```bash
bun run rss:html
# Creates rss-feed.html
```

---

## 🔧 Bun v1.3.7 Features Enabled

### 1. JSON5 Config Support

```json5
// registry.config.json5
{
  name: "My Registry",
  storage: {
    type: "r2",
    bucket: "npm-registry",
    compression: "gzip", // Bun v1.3.7!
  },
}
```

### 2. Header Preservation

```typescript
// Headers keep original casing
fetch(url, {
  headers: {
    'Authorization': token,  // Stays as "Authorization"
    'Content-Type': 'json',  // Stays as "Content-Type"
  },
});
```

### 3. Fast ANSI Wrapping

```typescript
// 33-88x faster than wrap-ansi npm
const wrapped = Bun.wrapAnsi(text, 80);
```

### 4. Content Encoding

```typescript
// Compress packages
await storage.storeTarball(pkg, version, data, {
  contentEncoding: 'gzip',
});
```

---

## 🌐 CDN Deployment

### Deploy Worker

```bash
# Set secrets
wrangler secret put JWT_SECRET -c registry-wrangler.toml

# Deploy production
bun run registry:deploy:cdn

# Or staging
bun run registry:deploy:staging
```

### DNS Configuration

Already configured for `npm.factory-wager.com`!

---

## 🔐 Authentication Modes

| Mode | Use Case | Command |
|------|----------|---------|
| `none` | Development | `REGISTRY_AUTH=none bun run registry:start` |
| `basic` | Simple password | `REGISTRY_AUTH=basic REGISTRY_SECRET=pass123 ...` |
| `token` | API tokens | `REGISTRY_AUTH=token ...` |
| `jwt` | Production | `REGISTRY_AUTH=jwt REGISTRY_SECRET=secret ...` |

---

## 📊 All Available Commands

### Registry
```bash
bun run registry                    # CLI help
bun run registry:start             # Start server
bun run registry:publish           # Publish package
bun run registry:info <pkg>        # Package info
bun run registry:search <query>    # Search
bun run registry:list              # List packages
bun run registry:stats             # Statistics
bun run registry:config            # Show config
bun run registry:token:create      # Create token
bun run registry:deploy:cdn        # Deploy CDN
bun run registry:config:init       # Init JSON5 config
bun run registry:config:load       # Load config
```

### Documentation
```bash
bun run docs:fetch                 # Doc fetcher CLI
bun run pkg:fetch <pkg>            # Fetch package docs
bun run pkg:search <query>         # Search packages
bun run pkg:local                  # Local packages
```

### Sync
```bash
bun run docs:sync                  # Sync CLI
bun run sync:status                # Sync status
bun run sync:upload                # Upload to cloud
bun run sync:docset:create         # Create doc set
bun run sync:docset:list           # List doc sets
```

### RSS
```bash
bun run docs:rss                   # RSS CLI
bun run rss:fetch                  # Fetch feeds
bun run rss:list                   # List items
bun run rss:feeds                  # List feeds
bun run rss:add <url> <name>       # Add feed
bun run rss:html                   # Generate HTML
```

---

## 🧪 Testing

```bash
# Test registry
bun run registry:start &
npm ping --registry http://localhost:4873

# Test docs
bun run pkg:fetch lodash

# Test sync
bun run sync:upload
bun run sync:status

# Test RSS
bun run rss:fetch
```

---

## 📈 Monitoring

```bash
# Registry stats
bun run registry:stats

# R2 status
bun run r2:status

# Sync status
bun run sync:status
```

---

## 🔗 Integration Example

```typescript
// Complete workflow
import { 
  NPMRegistryServer,
  PackageDocumentationFetcher,
  DocumentationSync,
  RSSAggregator,
  loadRegistryConfig 
} from './lib/registry/index.ts';

// 1. Load config (JSON5 supported)
const config = await loadRegistryConfig({
  path: './registry.config.json5'
});

// 2. Start registry
const server = new NPMRegistryServer(config);
await server.start();

// 3. Fetch docs
const fetcher = new PackageDocumentationFetcher();
const doc = await fetcher.fetchDocs('@factorywager/utils');

// 4. Sync to R2
const sync = new DocumentationSync('user-123');
await sync.syncToCloud({ cachedPackages: ['@factorywager/utils'] });

// 5. Track RSS
const rss = new RSSAggregator('user-123');
await rss.fetchAll();
```

---

## ✅ Verification Checklist

- [ ] R2 bucket created (`npm-registry`)
- [ ] Environment variables configured
- [ ] Local registry starts successfully
- [ ] Can publish a test package
- [ ] Can install from registry
- [ ] Documentation fetch works
- [ ] Sync uploads to R2
- [ ] RSS feeds fetch correctly
- [ ] CDN deployed (optional)

---

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test R2 connection
bun run lib/registry/r2-storage.ts

# Check credentials
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
```

### Port Already in Use
```bash
# Use different port
bun run registry:start --port 4874
```

### Authentication Errors
```bash
# Clear npm cache
npm cache clean --force

# Re-login
npm login --registry http://localhost:4873
```

---

## 📚 Documentation

- `REGISTRY_SETUP.md` - Detailed setup guide
- `REGISTRY_DOCS_GUIDE.md` - Integration examples  
- `REGISTRY_BUN_1_3_7_UPDATES.md` - Bun v1.3.7 features

---

## 🎉 You're Ready!

Your private registry is set up with:
- ✅ NPM registry on R2
- ✅ CDN distribution
- ✅ Package documentation
- ✅ Cross-device sync
- ✅ RSS aggregation
- ✅ Bun v1.3.7 optimizations

**Start using it:**
```bash
bun run registry:start
```

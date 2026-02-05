# 📦 Registry, Docs & RSS - Complete Integration Guide

This guide covers the complete package management, documentation, and RSS aggregation system integrated with your FactoryWager R2 infrastructure.

## 🌟 Features Overview

### 1. Private NPM Registry
- **R2-backed storage** for packages
- **CDN distribution** via Cloudflare Workers
- **Multiple auth modes** (none, basic, token, JWT)
- **npm CLI compatible**

### 2. Package Documentation
- **Fetch docs** from npm, unpkg, GitHub
- **HTML generation** with beautiful themes
- **Local package** discovery
- **Cross-package search**

### 3. R2 Sync Service
- **Cross-device sync** of preferences and progress
- **Documentation sets** for organizing packages
- **Reading progress** tracking
- **Share links** for doc sets

### 4. RSS Aggregation
- **Bun blog** and updates
- **GitHub releases** tracking
- **Package changelogs**
- **Custom feeds** support

## 🚀 Quick Start

### Package Documentation

```bash
# Fetch documentation for a package
bun run pkg:fetch lodash
bun run pkg:fetch react 18.2.0

# Search for packages
bun run pkg:search "state management"

# List local project packages
bun run pkg:local
bun run pkg:local ./my-project
```

### R2 Sync

```bash
# Check sync status
bun run sync:status

# Upload preferences to R2
bun run sync:upload

# Create a documentation set
bun run sync:docset:create "Frontend Stack" "react,vue,angular"

# List your doc sets
bun run sync:docset:list
```

### RSS Feeds

```bash
# Fetch all feeds
bun run rss:fetch

# List recent items
bun run rss:list

# View subscribed feeds
bun run rss:feeds

# Add a custom feed
bun run rss:add "https://example.com/feed.xml" "Example Blog"

# Generate HTML view
bun run rss:html
```

## 📚 Detailed Usage

### 1. Package Documentation Fetcher

#### Fetch Package Docs

```typescript
import { PackageDocumentationFetcher } from './lib/registry/index.ts';

const fetcher = new PackageDocumentationFetcher();

// Fetch docs
const doc = await fetcher.fetchDocs('lodash', '4.17.21');

// Generate HTML
const html = fetcher.generateHtmlDoc(doc);
await Bun.write('lodash-docs.html', html);
```

#### Search Packages

```typescript
const results = await fetcher.searchPackages('router', 10);
for (const pkg of results) {
  console.log(`${pkg.name}: ${pkg.description}`);
}
```

#### Get Local Packages

```typescript
const packages = await fetcher.getLocalPackages('./my-project');
const docs = await fetcher.fetchLocalDocs('./my-project');
```

### 2. Documentation Sync

#### Initialize Sync

```typescript
import { DocumentationSync } from './lib/registry/index.ts';

const sync = new DocumentationSync('user-123', {
  bucketName: 'docs-sync',
  accountId: process.env.R2_ACCOUNT_ID,
});
```

#### Save Preferences

```typescript
await sync.syncToCloud({
  preferences: {
    userId: 'user-123',
    theme: 'dark',
    fontSize: 16,
    readingWidth: 'medium',
    codeTheme: 'github-dark',
    autoSync: true,
    offlineMode: false,
    cacheRetention: 30,
  },
  cachedPackages: ['lodash', 'react', 'express'],
});
```

#### Track Reading Progress

```typescript
await sync.saveProgress({
  userId: 'user-123',
  packageName: 'lodash',
  version: '4.17.21',
  scrollPosition: 500,
  lastReadSection: 'Array Methods',
  bookmarks: [{
    id: '1',
    title: 'debounce',
    position: 1200,
    createdAt: new Date().toISOString(),
  }],
  lastReadAt: new Date().toISOString(),
});
```

#### Create Doc Sets

```typescript
const docSet = await sync.createDocSet(
  'Frontend Stack',
  ['react', 'vue', 'angular', 'svelte'],
  'My favorite frontend frameworks'
);

// Share the doc set
const shareUrl = await sync.shareDocSet(docSet.id);
console.log(`Share URL: ${shareUrl}`);
```

### 3. RSS Aggregator

#### Initialize

```typescript
import { RSSAggregator, DEFAULT_FEEDS } from './lib/registry/index.ts';

const aggregator = new RSSAggregator('user-123');
```

#### Fetch Feeds

```typescript
// Fetch all enabled feeds
await aggregator.fetchAll();

// Get items
const items = aggregator.getItems({ 
  unreadOnly: true,
  limit: 20 
});
```

#### Manage Feeds

```typescript
// Add custom feed
aggregator.addFeed({
  name: 'My Blog',
  url: 'https://example.com/feed.xml',
  type: 'custom',
  category: 'Tech',
  enabled: true,
});

// Toggle feed
aggregator.toggleFeed('bun-blog');

// Remove feed
aggregator.removeFeed('feed-id');
```

#### Generate HTML View

```typescript
const html = aggregator.generateHtml();
await Bun.write('rss-feed.html', html);
```

## 🔧 Configuration

### Environment Variables

```bash
# R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_REGISTRY_BUCKET=npm-registry
R2_DOCS_BUCKET=docs-sync
R2_FEEDS_BUCKET=rss-feeds

# Registry
REGISTRY_PORT=4873
REGISTRY_AUTH=jwt
REGISTRY_SECRET=your-jwt-secret

# User (for sync)
USER_ID=your-user-id
```

### Package Managers Support

The system works with all major package managers:

| Manager | Registry | Lockfile |
|---------|----------|----------|
| npm | registry.npmjs.org | package-lock.json |
| yarn | registry.yarnpkg.com | yarn.lock |
| pnpm | registry.npmjs.org | pnpm-lock.yaml |
| bun | registry.npmjs.org | bun.lock |

## 🌐 CDN Integration

### Deploy Documentation Worker

```bash
# Deploy to Cloudflare
wrangler deploy -c docs-wrangler.toml

# The worker serves:
# - Package documentation
# - Sync data
# - RSS feeds
# All edge-cached!
```

### Access Patterns

```
https://docs.factory-wager.com/
├── /pkg/:name              # Package docs
├── /pkg/:name/:version     # Specific version
├── /sync/:userId           # Sync data
├── /share/:token           # Shared doc sets
└── /rss                    # RSS feed
```

## 📊 R2 Bucket Structure

```
npm-registry/
├── packages/
│   ├── lodash/
│   │   ├── manifest.json
│   │   └── lodash-4.17.21.tgz
│   └── @factorywager/
│       └── utils/
│           ├── manifest.json
│           └── utils-1.0.0.tgz

docs-sync/
├── sync/
│   └── {userId}/
│       └── data.json
├── progress/
│   └── {userId}/
│       └── {package}@{version}.json
├── docsets/
│   └── {userId}/
│       └── {docset-id}.json
└── shares/
    └── {share-token}.json

rss-feeds/
└── {userId}/
    └── feeds.json
```

## 🔄 Integration Examples

### Complete Workflow

```typescript
import { 
  NPMRegistryServer,
  PackageDocumentationFetcher,
  DocumentationSync,
  RSSAggregator 
} from './lib/registry/index.ts';

// 1. Start local registry
const registry = new NPMRegistryServer({
  port: 4873,
  auth: 'jwt',
});
await registry.start();

// 2. Fetch and cache documentation
const fetcher = new PackageDocumentationFetcher();
const doc = await fetcher.fetchDocs('@factorywager/utils');

// 3. Sync across devices
const sync = new DocumentationSync('user-123');
await sync.syncToCloud({
  cachedPackages: ['@factorywager/utils'],
});

// 4. Track RSS updates
const rss = new RSSAggregator('user-123');
await rss.fetchAll();
const bunUpdates = rss.getItems({ 
  feedId: 'bun-blog',
  limit: 5 
});
```

### CLI Integration

```bash
# Complete workflow
bun run registry:start &
bun run pkg:fetch @factorywager/utils
bun run sync:upload
bun run rss:fetch
bun run rss:html
```

## 🎨 Customization

### Custom Themes

```typescript
// In your doc fetcher config
const fetcher = new PackageDocumentationFetcher({
  theme: {
    primary: '#667eea',
    background: '#1a202c',
    codeTheme: 'dracula',
  },
});
```

### Custom RSS Feeds

```typescript
aggregator.addFeed({
  name: 'Internal Updates',
  url: 'https://internal.factory-wager.com/feed.xml',
  type: 'custom',
  category: 'Internal',
  enabled: true,
});
```

## 📱 Mobile/Offline Support

The sync service enables full offline support:

```typescript
// Check if offline
const isOffline = !navigator.onLine;

// Load from cache
const cached = await fetcher.fetchDocs('lodash', undefined, {
  preferCached: true,
});

// Sync when back online
window.addEventListener('online', async () => {
  await sync.syncToCloud();
});
```

## 🔒 Security

### Authentication

```typescript
// JWT-based auth for registry
const server = new NPMRegistryServer({
  auth: 'jwt',
  authSecret: process.env.JWT_SECRET,
});

// Token generation
import { RegistryAuth, AuthConfigs } from './lib/registry/index.ts';
const auth = new RegistryAuth(AuthConfigs.jwt(process.env.JWT_SECRET!));
const token = auth.createJwt('user-123', false);
```

### Private Packages

```typescript
// Only authenticated users can access
const doc = await fetcher.fetchDocs('@factorywager/secret-package', undefined, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## 🧪 Testing

```bash
# Test documentation fetching
bun run pkg:fetch lodash

# Test sync
bun run sync:upload
bun run sync:status

# Test RSS
bun run rss:fetch
bun run rss:list
```

## 📈 Monitoring

```typescript
// Get sync status
const status = await sync.getSyncStatus();
console.log(`Last synced: ${status.lastSynced}`);

// Get RSS stats
console.log(`Unread items: ${rss.getUnreadCount()}`);
console.log(`Starred items: ${rss.getStarredCount()}`);
```

## 🚀 Deployment

### Full Stack Deployment

```bash
# 1. Deploy registry CDN
bun run registry:deploy:cdn

# 2. Deploy docs worker (if separate)
# wrangler deploy -c docs-wrangler.toml

# 3. Start local sync daemon
bun run sync:upload

# 4. Schedule RSS fetching
# Add to cron: */15 * * * * cd /app && bun run rss:fetch
```

## 📝 License

MIT - FactoryWager Registry & Documentation System

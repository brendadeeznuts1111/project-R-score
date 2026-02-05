# 📚 FactoryWager Library Overview

Complete library index for the FactoryWager Enterprise Platform.

## 🎯 Core Modules

### Core Infrastructure
- **`core-types.ts`** - Core type definitions
- **`core-errors.ts`** - Error handling system
- **`core-validation.ts`** - Validation utilities
- **`core-documentation.ts`** - Documentation system

### Documentation System
- **`documentation/`** - Enhanced documentation system with CLI, Utils, and validation
- **`docs/`** - Documentation fetchers and cache managers
- **`docs-reference.ts`** - Reference documentation

### Package Management (NEW)
- **`package/package-manager.ts`** - Package analysis, Bun API discovery, dependency graphs

### R2 Storage (NEW)
- **`r2/r2-storage-enhanced.ts`** - Enhanced R2 storage with package integration
- **`r2/`** - Additional R2 utilities (analytics, backup, batch operations, etc.)

### RSS Management (NEW)
- **`rss/rss-manager.ts`** - RSS feed management with caching and R2 integration

### Registry System
- **`registry/`** - NPM registry integration, package docs, RSS aggregation

### Security
- **`security/`** - Security utilities, MCP servers, secret management

### MCP Integration
- **`mcp/`** - Model Context Protocol servers and clients

### Utilities
- **`utils/`** - Common utilities (validation, logging, error handling, etc.)
- **`constants/`** - Shared constants
- **`theme/`** - Theming and colors

## 🚀 Quick Access

```typescript
import { 
  // Package Management
  PackageManager,
  type PackageInfo,
  
  // R2 Storage
  R2Storage,
  type R2StorageConfig,
  
  // RSS Management
  RSSManager,
  type RSSFeed,
  
  // Documentation
  docsURLBuilder,
  EnhancedDocumentationURLValidator,
  
  // Utilities
  FW
} from './lib';
```

## 📦 Package Management

```typescript
import { PackageManager } from './lib';

const pm = new PackageManager();
const info = await pm.analyzePackage();
// Scans for Bun APIs, generates dependency graphs
```

## ☁️ R2 Storage

```typescript
import { R2Storage } from './lib';

const r2 = new R2Storage({
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  defaultBucket: 'bun-docs'
});

await r2.uploadPackageDocs('my-package', docs);
```

## 📰 RSS Management

```typescript
import { RSSManager } from './lib';

const rss = new RSSManager(r2Storage);
await rss.subscribe('https://bun.sh/feed.xml', 'Bun Blog');
const feeds = await rss.fetchAll();
```

## 🔗 Documentation System

```typescript
import { docsURLBuilder, EnhancedDocumentationURLValidator } from './lib/documentation';

// Build URLs
const url = docsURLBuilder.buildCLIDocumentationURL('run', 'examples');

// Validate URLs
const isValid = EnhancedDocumentationURLValidator.isValidCLICommand('bun run dev');
```

## 📋 Module Index

### Core
- `core-types.ts` - Type definitions
- `core-errors.ts` - Error handling
- `core-validation.ts` - Validation
- `core-documentation.ts` - Documentation core

### Package Management
- `package/package-manager.ts` - Package analysis & Bun API discovery

### Storage
- `r2/r2-storage-enhanced.ts` - Enhanced R2 storage
- `r2/r2-analytics.ts` - R2 analytics
- `r2/r2-backup-manager.ts` - Backup management
- `r2/r2-batch-operations.ts` - Batch operations
- `r2/r2-enhanced-cli.ts` - R2 CLI
- `r2/r2-event-system.ts` - Event system
- `r2/r2-lifecycle-manager.ts` - Lifecycle management
- `r2/r2-search-engine.ts` - Search functionality
- `r2/r2-security-manager.ts` - Security
- `r2/r2-sync-service.ts` - Sync service
- `r2/r2-transform-pipeline.ts` - Transform pipeline
- `r2/r2-webhook-manager.ts` - Webhook management
- `r2/signed-url.ts` - Signed URLs

### RSS
- `rss/rss-manager.ts` - RSS feed management

### Registry
- `registry/auth.ts` - Authentication
- `registry/bunx-integration.ts` - Bunx integration
- `registry/cdn-worker.ts` - CDN worker
- `registry/cli.ts` - Registry CLI
- `registry/config-loader.ts` - Config loading
- `registry/docs-sync.ts` - Documentation sync
- `registry/index.ts` - Registry index
- `registry/package-docs.ts` - Package documentation
- `registry/r2-storage.ts` - R2 storage adapter
- `registry/registry-types.ts` - Registry types
- `registry/rss-aggregator.ts` - RSS aggregation
- `registry/secrets-manager.ts` - Secrets management
- `registry/server.ts` - Registry server
- `registry/version-manager.ts` - Version management

### Documentation
- `documentation/` - Complete documentation system
  - `constants/` - Documentation constants (CLI, Utils, domains, categories, fragments)
  - `builders/` - URL builders and validators
  - `services/` - Analytics and caching
  - `index.ts` - Main exports

### Security
- `security/` - Security utilities and MCP servers

### MCP
- `mcp/` - Model Context Protocol integration

### Utils
- `utils/` - Common utilities

## 🎨 Theming

```typescript
import { styled, FW_COLORS, FW } from './lib';

// Use styled function
const message = styled('Hello', 'success');

// Access colors
const color = FW_COLORS.success;

// Quick access
FW.colors.success
FW.styled('text', 'info')
```

## 📖 Documentation

See `docs/INTEGRATED_SYSTEM.md` for complete usage guide.

# FactoryWager Library Overview

Shared harness for the FactoryWager monorepo. Barrel: [`index.ts`](./index.ts) (`LIB_INFO`, `FW`, re-exports).

## Canonical monorepo docs

| Role | Path |
|------|------|
| Path SSOT (this library) | [`docs/repo-docs.ts`](./docs/repo-docs.ts) (`CANONICAL_REPO_DOCS`) |
| Coding standards | [`.custom-instructions.md`](../.custom-instructions.md) |
| Agents | [`AGENTS.md`](../AGENTS.md) |
| Workspace map | [`STRUCTURE.md`](../STRUCTURE.md) |
| Brands | [`types/branded/README.md`](./types/branded/README.md) |
| Console depth | [`console-depth.ts`](./console-depth.ts) |
| Standards automation | [`validation/standards-integration.ts`](./validation/standards-integration.ts) |

```typescript
import { CANONICAL_REPO_DOCS, LIB_INFO, FW } from "./lib";

LIB_INFO.docs.standards; // ".custom-instructions.md"
FW.standards.unified; // "docs/UNIFIED.md"
```

## Core modules

### Core infrastructure
- **`core/`** — types, errors, validation, documentation URL handlers

### Documentation system
- **`docs/`** — fetchers, patterns, cache, **`repo-docs.ts`** (path SSOT)
- Patterns / utils re-exported via barrel

### Harness (high-traffic)
- **`types/branded.ts`** — branded ID facade (`as*` / `try*` / `parse*`)
- **`console-depth.ts`** — inspect verbosity SSOT
- **`projects-scan.ts`** — project inventory
- **`security/`** — secrets, R2 credentials, MCP-related security

### Package management
- **`package/package-manager.ts`** — package analysis, Bun API discovery, dependency graphs

### R2 storage
- **`r2/r2-storage-enhanced.ts`** — enhanced R2 storage with package integration
- **`r2/`** — analytics, backup, batch ops, etc.

### RSS / registry / MCP / HAR
- **`rss/`**, **`registry/`**, **`mcp/`**, **`har-analyzer/`**

### Utilities
- **`utils/`**, **`constants/`**, **`theme/`**

## Quick access

```typescript
import {
  PackageManager,
  type PackageInfo,
  R2Storage,
  type R2StorageConfig,
  RSSManager,
  type RSSFeed,
  CANONICAL_REPO_DOCS,
  FW,
} from "./lib";
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

### HAR Analyzer
- `har-analyzer/index.ts` - Barrel exports
- `har-analyzer/types.ts` - 4-layer context types (Raw, Parsed, Derived, Relational)
- `har-analyzer/fragment-analyzer.ts` - URL fragment classification (8 types: anchor, route, hashbang, state, media, query, empty, unknown)
- `har-analyzer/url-parser.ts` - URL decomposition with extension/MIME inference
- `har-analyzer/domain-mapper.ts` - Documentation provider/category/URL type classification, domain and asset group mapping, performance grading
- `har-analyzer/bun-serve-types.ts` - Protocol-aware HAR capture server using Bun.serve()

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

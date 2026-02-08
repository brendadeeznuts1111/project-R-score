# 🏗️ R2 Infrastructure Reorganization & CDN Package Registry Plan

## 📋 Executive Summary

This plan outlines a complete reorganization of R2 buckets, Durable Objects architecture, and implementation of a CDN-backed package registry system for both shared and project-specific packages.

---

## 🎯 Goals

1. **Organized R2 Storage**: Clear separation of concerns across buckets
2. **Scalable Package Registry**: NPM-compatible registry with CDN distribution
3. **Project Isolation**: Project-specific packages with shared common libraries
4. **Performance**: Global CDN distribution with edge caching
5. **Security**: Fine-grained access control and scoped packages

---

## 🏛️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Edge                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   CDN / Cache   │  │  Durable Objects│  │      Workers / API          │  │
│  │  (pkg registry) │  │  (metadata,     │  │  (auth, uploads, search)    │  │
│  │                 │  │   sessions)     │  │                             │  │
│  └────────┬────────┘  └─────────────────┘  └─────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼ R2 Storage Tiers
┌─────────────────────────────────────────────────────────────────────────────┐
│                              R2 Buckets                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │  registry-npm    │ │  registry-private │ │    registry-scoped-{proj}    │ │
│  │  (public pkgs)   │ │  (org private)    │ │    (project-specific)        │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │  registry-cdn    │ │  registry-caches  │ │    project-{id}-assets       │ │
│  │  (cdn optimized) │ │  (build caches)   │ │    (project assets)          │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │  backups-logs    │ │  lifecycle-temp   │ │    shared-assets             │ │
│  │  (backups, logs) │ │  (temp, staging)  │ │    (logos, fonts, etc)      │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Phase 1: R2 Bucket Reorganization

### 1.1 New Bucket Structure

| Bucket | Purpose | Access | Lifecycle |
|--------|---------|--------|-----------|
| `registry-npm` | Public NPM packages | Public read | 90d archive |
| `registry-private` | Organization private packages | Authenticated | 180d archive |
| `registry-cdn` | CDN-optimized package tarballs | Public read | Never delete |
| `registry-caches` | Build caches, temp storage | Internal | 7d TTL |
| `project-{id}-assets` | Per-project static assets | Project-scoped | 30d version cleanup |
| `shared-assets` | Common logos, fonts, icons | Public read | Manual only |
| `backups-registry` | Registry backups | Internal | 1y retention |
| `lifecycle-temp` | Staging, temp files | Internal | 1d TTL |

### 1.2 Migration Strategy

```typescript
// lib/r2/registry-migration.ts

export class RegistryMigration {
  async migrateFromLegacy(): Promise<MigrationResult> {
    const phases = [
      // Phase 1: Audit existing buckets
      this.auditExistingBuckets(),
      
      // Phase 2: Create new bucket structure
      this.createNewBuckets(),
      
      // Phase 3: Copy data with transformation
      this.migratePackages(),
      
      // Phase 4: Update DNS/rewrites
      this.updateRouting(),
      
      // Phase 5: Validate and cleanup
      this.validateAndCleanup()
    ];
    
    return this.executePhases(phases);
  }
  
  private async migratePackages(): Promise<void> {
    // Migrate from scanner-cookies to organized buckets
    // with proper metadata and indexing
  }
}
```

### 1.3 Bucket Naming Convention

```text
registry-{type}-{scope}
project-{project-id}-{content-type}
shared-{asset-type}
backups-{service}
lifecycle-{purpose}
```

---

## 📦 Phase 2: Package Registry Architecture

### 2.1 NPM-Compatible Registry API

```typescript
// lib/registry/npm-api.ts

export interface PackageManifest {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dist: {
    tarball: string;
    shasum: string;
    integrity: string;
  };
  _attachments?: {
    [filename: string]: {
      content_type: string;
      data: string; // base64
      length: number;
    };
  };
}

export interface RegistryAPI {
  // GET /:package
  getPackage(name: string): Promise<PackageManifest>;
  
  // GET /:package/:version
  getVersion(name: string, version: string): Promise<PackageManifest>;
  
  // PUT /:package
  publishPackage(
    name: string, 
    manifest: PackageManifest, 
    tarball: Buffer,
    auth: AuthToken
  ): Promise<PublishResult>;
  
  // DELETE /:package/-/:filename/-rev/:rev
  unpublishPackage(name: string, version: string, auth: AuthToken): Promise<void>;
  
  // GET /-/v1/search
  searchPackages(query: string, options: SearchOptions): Promise<SearchResults>;
}
```

### 2.2 Package Storage Layout

```text
registry-npm/
├── @factorywager/
│   ├── core/
│   │   ├── package.json           # Metadata index
│   │   ├── -/
│   │   │   ├── core-1.0.0.tgz
│   │   │   ├── core-1.1.0.tgz
│   │   │   └── core-2.0.0.tgz
│   │   └── index.json             # Version index
│   ├── utils/
│   └── cli/
├── @duoplus/
│   └── components/
└── unscoped-packages/
    └── lodash-es/

registry-private/
├── @internal/
│   ├── auth/
│   ├── api-client/
│   └── configs/
└── @project-*/     # Project-specific private packages

registry-scoped-{project-id}/
└── @project/{name}/
    └── package versions...
```

### 2.3 Scoped Package Support

```typescript
// lib/registry/scope-manager.ts

export interface ScopeConfig {
  name: string;                    // @factorywager
  bucket: string;                  // registry-npm
  access: 'public' | 'restricted';
  teams: string[];                 // Team IDs with access
  publishTeams: string[];          // Teams that can publish
  require2FA: boolean;
  autoPublishCDN: boolean;
}

export class ScopeManager {
  private scopes: Map<string, ScopeConfig> = new Map();
  
  async createScope(config: ScopeConfig): Promise<void> {
    // 1. Create bucket prefix
    // 2. Set up access policies
    // 3. Configure CDN rules
    // 4. Update registry index
  }
  
  async configureProjectScope(
    projectId: string,
    config: Partial<ScopeConfig>
  ): Promise<ScopeConfig> {
    // Create @project-{id} scope
    // Link to project assets bucket
    // Set up CI/CD publishing
  }
}
```

---

## 🌐 Phase 3: CDN Integration

### 3.1 CDN Architecture

```text
User Request
    ↓
Cloudflare CDN
    ↓ (Cache HIT?)
    ├── YES → Serve from Edge Cache
    ↓ (Cache MISS)
Cloudflare Worker
    ↓
R2 Bucket (registry-cdn)
    ↓
Cache at Edge (configured TTL)
```

### 3.2 Cache Strategies

| Content Type | Cache TTL | Purge Strategy |
|--------------|-----------|----------------|
| Package tarballs (.tgz) | Immutable | Never (versioned URLs) |
| Package metadata | 1 minute | On publish/unpublish |
| Registry index | 5 minutes | On any change |
| Search results | 30 seconds | Short-lived |
| Scoped package lists | 1 minute | On package update |

### 3.3 CDN-Optimized Endpoints

```typescript
// workers/registry-cdn.ts

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Route to appropriate bucket
    if (url.pathname.startsWith('/cdn/')) {
      return handleCDNDelivery(request, env.REGISTRY_CDN);
    }
    
    if (url.pathname.startsWith('/npm/')) {
      return handleNPMAPI(request, env);
    }
    
    if (url.pathname.startsWith('/_search')) {
      return handleSearch(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleCDNDelivery(request: Request, bucket: R2Bucket): Promise<Response> {
  const key = request.url.pathname.replace('/cdn/', '');
  
  const object = await bucket.get(key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  
  // CDN optimization headers
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('CDN-Cache-Control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');
  
  return new Response(object.body, { headers });
}
```

---

## 🔧 Phase 4: Durable Objects Architecture

### 4.1 DO Usage Patterns

| Purpose | DO Class | Data Stored |
|---------|----------|-------------|
| Package Metadata | `PackageMetadataDO` | Version lists, tags, download counts |
| User Sessions | `RegistrySessionDO` | Auth tokens, rate limits |
| Registry Index | `RegistryIndexDO` | Search index, package lists |
| Build Status | `BuildStatusDO` | CI/CD build states, logs |
| Analytics | `AnalyticsDO` | Real-time metrics, aggregations |

### 4.2 Package Metadata DO

```typescript
// durable-objects/package-metadata.ts

export class PackageMetadataDO {
  private state: DurableObjectState;
  private sql: SqlStorage;
  
  constructor(state: DurableObjectState) {
    this.state = state;
    this.sql = state.storage.sql;
    
    // Initialize schema
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS versions (
        version TEXT PRIMARY KEY,
        manifest TEXT NOT NULL,
        tarball_url TEXT NOT NULL,
        shasum TEXT NOT NULL,
        published_at TEXT NOT NULL,
        deprecated BOOLEAN DEFAULT FALSE
      );
      
      CREATE TABLE IF NOT EXISTS tags (
        tag TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS downloads (
        version TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        PRIMARY KEY (version, date)
      );
    `);
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/versions':
        return this.getVersions();
      case '/publish':
        return this.publishVersion(request);
      case '/tag':
        return this.updateTag(request);
      case '/downloads':
        return this.recordDownload(url.searchParams.get('version')!);
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
  
  private async getVersions(): Promise<Response> {
    const versions = this.sql.exec(
      'SELECT version, manifest, tags.tag as dist_tag FROM versions LEFT JOIN tags ON versions.version = tags.version WHERE deprecated = FALSE'
    ).toArray();
    
    return Response.json({ versions });
  }
}
```

### 4.3 Registry Index DO

```typescript
// durable-objects/registry-index.ts

export class RegistryIndexDO {
  private state: DurableObjectState;
  
  async updateIndex(packageName: string, manifest: PackageManifest): Promise<void> {
    // Add to search index
    const searchDoc = {
      name: packageName,
      description: manifest.description,
      keywords: manifest.keywords || [],
      author: manifest.author,
      updated: new Date().toISOString()
    };
    
    // Update in SQLite FTS
    this.state.storage.sql.exec(`
      INSERT OR REPLACE INTO search_index (name, description, keywords, json)
      VALUES (?, ?, ?, ?)
    `, packageName, searchDoc.description, searchDoc.keywords.join(','), JSON.stringify(searchDoc));
  }
  
  async search(query: string, options: SearchOptions): Promise<SearchResults> {
    // Full-text search using SQLite FTS5
    const results = this.state.storage.sql.exec(`
      SELECT name, description, rank
      FROM search_index
      WHERE search_index MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `, query, options.limit || 20, options.offset || 0).toArray();
    
    return { objects: results };
  }
}
```

---

## 👥 Phase 5: Project-Specific & Shared Packages

### 5.1 Package Visibility Matrix

| Package Type | Scope | Location | Access | Example |
|--------------|-------|----------|--------|---------|
| Shared Public | `@factorywager` | `registry-npm` | Public | `@factorywager/core` |
| Shared Public | `@duoplus` | `registry-npm` | Public | `@duoplus/ui` |
| Org Private | `@internal` | `registry-private` | Auth required | `@internal/auth` |
| Project Private | `@project-{id}` | `registry-scoped-{id}` | Project team | `@project-123/api` |
| Personal | `@user-{name}` | `registry-private` | User only | `@user-john/experiments` |

### 5.2 Project Package Configuration

```json
// package.json (project-specific)
{
  "name": "@project-123/dashboard",
  "version": "1.0.0",
  "private": true,
  "publishConfig": {
    "registry": "https://registry.factory-wager.com/project-123",
    "access": "restricted"
  },
  "dependencies": {
    "@factorywager/core": "^2.0.0",     // Shared public
    "@internal/auth": "^1.0.0",          // Org private
    "@project-123/api": "^1.0.0"         // Project-specific
  }
}
```

### 5.3 Project Setup CLI

```typescript
// lib/registry/project-setup.ts

export class ProjectRegistrySetup {
  async setupProject(projectId: string, config: ProjectConfig): Promise<ProjectRegistry> {
    // 1. Create project-scoped R2 bucket
    await this.createProjectBucket(projectId);
    
    // 2. Create Durable Objects for metadata
    const metadataDO = await this.createMetadataDO(projectId);
    
    // 3. Set up npm scope (@project-{id})
    await this.createNPMScope(projectId, config);
    
    // 4. Configure CDN routing
    await this.configureCDNRoutes(projectId);
    
    // 5. Set up access controls
    await this.configureAccess(projectId, config.team);
    
    // 6. Generate .npmrc template
    return this.generateConfig(projectId);
  }
  
  private async createProjectBucket(projectId: string): Promise<void> {
    const bucketName = `registry-scoped-${projectId}`;
    // Create bucket with lifecycle policy
    // - Delete old pre-release versions after 30 days
    // - Archive old versions after 180 days
  }
  
  private generateConfig(projectId: string): ProjectRegistry {
    return {
      registry: `https://registry.factory-wager.com/project-${projectId}`,
      scope: `@project-${projectId}`,
      npmrc: `
@project-${projectId}:registry=https://registry.factory-wager.com/project-${projectId}
//registry.factory-wager.com/project-${projectId}:_authToken=\${NPM_TOKEN}
      `.trim()
    };
  }
}
```

---

## 🚀 Phase 6: Implementation Roadmap

### Week 1: Foundation
- [ ] Create new R2 bucket structure
- [ ] Set up Durable Objects (PackageMetadata, RegistryIndex)
- [ ] Implement core NPM API endpoints
- [ ] Basic package publish/download

### Week 2: Registry Features
- [ ] Scoped package support
- [ ] Search functionality
- [ ] Tag management (latest, beta, canary)
- [ ] Package deprecation

### Week 3: CDN & Performance
- [ ] CDN-optimized bucket (`registry-cdn`)
- [ ] Cache configuration
- [ ] Tarball optimization
- [ ] Edge caching rules

### Week 4: Security & Access
- [ ] Authentication system
- [ ] Scoped access controls
- [ ] 2FA for publishing
- [ ] Audit logging

### Week 5: Project Integration
- [ ] Per-project bucket creation
- [ ] Project setup CLI
- [ ] Team access management
- [ ] CI/CD integration

### Week 6: Migration
- [ ] Migrate existing packages
- [ ] Update project configurations
- [ ] DNS cutover
- [ ] Deprecate old registry

---

## 🔧 Technical Implementation

### 6.1 Registry Worker

```typescript
// workers/package-registry.ts

import { PackageMetadataDO } from '../durable-objects/package-metadata';
import { RegistryIndexDO } from '../durable-objects/registry-index';

export interface Env {
  REGISTRY_NPM: R2Bucket;
  REGISTRY_PRIVATE: R2Bucket;
  REGISTRY_CDN: R2Bucket;
  PACKAGE_METADATA: DurableObjectNamespace<PackageMetadataDO>;
  REGISTRY_INDEX: DurableObjectNamespace<RegistryIndexDO>;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const router = new Router();
    
    // Public routes
    router.get('/:package', getPackageHandler(env));
    router.get('/:package/:version', getVersionHandler(env));
    router.get('/cdn/:scope?/:name/-/:filename', getTarballHandler(env));
    
    // Authenticated routes
    router.put('/:package', authMiddleware(env), publishHandler(env));
    router.delete('/:package/-/:filename/-rev/:rev', authMiddleware(env), unpublishHandler(env));
    
    // Search
    router.get('/-/v1/search', searchHandler(env));
    
    return router.handle(request);
  }
};
```

### 6.2 Client Configuration

```bash
# ~/.npmrc for developers
@factorywager:registry=https://registry.factory-wager.com
@duoplus:registry=https://registry.factory-wager.com
@internal:registry=https://registry.factory-wager.com/private
@project-123:registry=https://registry.factory-wager.com/project-123

//registry.factory-wager.com/:_authToken=${NPM_TOKEN}
//registry.factory-wager.com/private:_authToken=${NPM_TOKEN_PRIVATE}
//registry.factory-wager.com/project-123:_authToken=${NPM_TOKEN_PROJECT}
```

### 6.3 CI/CD Publishing

```yaml
# .github/workflows/publish.yml
name: Publish Package

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Build
        run: bun run build
        
      - name: Test
        run: bun test
        
      - name: Publish to Registry
        run: |
          echo "//registry.factory-wager.com/:_authToken=${NPM_TOKEN}" > .npmrc
          bun publish --registry https://registry.factory-wager.com
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 📊 Monitoring & Analytics

### 7.1 Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Package downloads | R2 + DO | > 10x avg |
| Publish failures | Worker logs | > 5% rate |
| CDN cache hit rate | Cloudflare | < 90% |
| Registry latency | Worker | > 500ms p95 |
| Storage usage | R2 | > 80% capacity |

### 7.2 Dashboards

- **Registry Overview**: Total packages, downloads, top packages
- **Project View**: Per-project package usage, team activity
- **Performance**: CDN cache rates, API latency, error rates
- **Security**: Failed auth attempts, suspicious activity

---

## 🎯 Success Criteria

1. **Performance**: Package install < 2s (p95)
2. **Availability**: 99.9% uptime
3. **Scale**: Support 1000+ packages, 10k+ daily downloads
4. **Security**: Zero unauthorized publishes
5. **Adoption**: All projects migrated within 30 days

---

## 📚 References

- [NPM Registry API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Durable Objects Best Practices](https://developers.cloudflare.com/durable-objects/best-practices/)
- [NPM Scope Documentation](https://docs.npmjs.com/cli/v8/using-npm/scope)

---

*This plan provides a complete blueprint for reorganizing R2 infrastructure and implementing a world-class CDN package registry.* 🚀

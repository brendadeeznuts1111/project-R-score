# Content Management System Guide

## Overview

The DuoPlus Content Management System provides a complete solution for managing content, themes, packages, and blog posts with integrated cloud storage, publishing, and distribution capabilities.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Frontend                        │
├─────────────────────────────────────────────────────────────┤
│  Metadata Panel │ Publishing Panel │ Blog Panel │ Storage    │
├─────────────────────────────────────────────────────────────┤
│                    API Layer                                 │
├─────────────────────────────────────────────────────────────┤
│ Metadata Service │ Publishing │ Blog │ Registry │ R2 Storage │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                             │
├─────────────────────────────────────────────────────────────┤
│  R2 Bucket  │  Private Registry  │  Local Cache  │  Database │
└─────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. Metadata Service (`src/services/metadataService.ts`)

Manages content metadata, topics, and tags.

**Key Features:**
- Content metadata creation and updates
- Topic taxonomy (16 predefined topics)
- Tag management with relationships
- Search and filtering by topics/tags
- Custom metadata fields

**Usage:**
```typescript
import { metadataService, TOPICS } from './services/metadataService';

// Create metadata
const meta = metadataService.createMetadata({
  title: 'My Theme',
  description: 'A custom theme',
  author: 'john@example.com',
  version: '1.0.0',
  published: false,
  topics: ['development', 'design'],
  tags: ['dark-mode', 'minimal'],
  categories: ['themes'],
  slug: 'my-theme',
  keywords: ['theme', 'dark', 'minimal'],
  summary: 'A minimal dark theme',
  visibility: 'private',
  license: 'MIT',
  views: 0,
  downloads: 0,
  rating: 0,
  reviews: 0,
  relatedItems: [],
  dependencies: [],
});

// Search by topic
const devContent = metadataService.getByTopic('development');

// Create tag
const tag = metadataService.createTag({
  name: 'Dark Mode',
  slug: 'dark-mode',
  description: 'Dark theme support',
  color: '#1a1a1a',
  icon: '🌙',
  category: 'themes',
  relatedTags: [],
});
```

### 2. R2 Storage Service (`src/services/r2StorageService.ts`)

Cloudflare R2 bucket integration for file storage.

**Key Features:**
- Upload/download files to R2
- File metadata management
- Content type detection
- Storage statistics
- File copying and listing

**Usage:**
```typescript
import { r2Storage } from './services/r2StorageService';

// Upload file
const url = await r2Storage.uploadFile(
  'themes/my-theme.json',
  Buffer.from(JSON.stringify(themeData)),
  { author: 'john@example.com', version: '1.0.0' }
);

// List files
const files = await r2Storage.listFiles('themes/');

// Get storage stats
const stats = await r2Storage.getStorageStats();
console.log(`Total files: ${stats.totalFiles}, Size: ${stats.totalSize} bytes`);
```

### 3. Private Registry Service (`src/services/privateRegistryService.ts`)

Package registry for internal packages and themes.

**Key Features:**
- Package publishing with versioning
- Dependency management
- Download tracking
- Package ratings
- Search and discovery

**Usage:**
```typescript
import { privateRegistry } from './services/privateRegistryService';

// Publish package
const pkg = await privateRegistry.publishPackage(
  '@duoplus/theme-dark',
  '1.0.0',
  tarballBuffer,
  {
    description: 'Dark theme package',
    author: 'john@example.com',
    license: 'MIT',
    repository: 'https://github.com/duoplus/theme-dark',
    keywords: ['theme', 'dark'],
  }
);

// Get package
const latestPkg = await privateRegistry.getPackage('@duoplus/theme-dark');

// List packages by author
const myPackages = await privateRegistry.listPackages('john@example.com');
```

### 4. Publishing Service (`src/services/publishingService.ts`)

Content publishing pipeline with scheduling.

**Key Features:**
- Publish content with metadata
- Schedule publishing for future dates
- Publish themes and packages
- View tracking
- Content archiving

**Usage:**
```typescript
import { publishingService } from './services/publishingService';

// Publish content
const published = await publishingService.publishContent({
  title: 'Getting Started with DuoPlus',
  description: 'A guide to getting started',
  content: '# Getting Started\n\n...',
  author: 'john@example.com',
  topics: ['tutorial', 'development'],
  tags: ['beginner', 'guide'],
  visibility: 'public',
  metadata: metadataObject,
});

// Schedule publishing
const scheduleUrl = await publishingService.schedulePublishing(
  config,
  Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days from now
);
```

### 5. Blog Service (`src/services/blogService.ts`)

Complete blog management with RSS feed generation.

**Key Features:**
- Create and publish blog posts
- Search and filtering
- Related posts discovery
- Engagement tracking (views, likes, shares)
- RSS feed generation
- SEO metadata

**Usage:**
```typescript
import { blogService } from './services/blogService';

// Create blog post
const post = await blogService.createPost({
  title: 'Lightning Network Updates',
  author: 'john@example.com',
  content: '# Lightning Network\n\n...',
  excerpt: 'Latest updates on Lightning Network',
  topics: ['lightning-network', 'bitcoin'],
  tags: ['update', 'news'],
  categories: ['announcements'],
  keywords: ['lightning', 'bitcoin', 'update'],
  status: 'draft',
  publishedAt: Date.now(),
  metaDescription: 'Latest Lightning Network updates',
});

// Publish post
await blogService.publishPost(post.id);

// Generate RSS feed
const rssFeed = await blogService.generateRSSFeed();
```

## Environment Variables

```env
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_ACCESS_KEY_SECRET=your_secret_key
R2_BUCKET_NAME=duoplus-storage
R2_ENDPOINT=https://r2.cloudflarestorage.com

# Publishing Configuration
PUBLISHING_ENABLED=true
PUBLISHING_MAX_SIZE=104857600  # 100MB
PUBLISHING_ALLOWED_TYPES=json,xml,pdf,zip

# Blog Configuration
BLOG_ENABLED=true
BLOG_RSS_ENABLED=true
BLOG_MAX_POSTS=1000
BLOG_CACHE_TTL=3600000  # 1 hour

# Registry Configuration
REGISTRY_ENABLED=true
REGISTRY_MAX_PACKAGE_SIZE=52428800  # 50MB
REGISTRY_RETENTION_DAYS=365
```

## API Endpoints

### Metadata Endpoints
- `GET /api/metadata/:id` - Get metadata
- `PUT /api/metadata/:id` - Update metadata
- `GET /api/topics` - List topics
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Storage Endpoints
- `POST /api/storage/upload` - Upload file
- `GET /api/storage/:key` - Download file
- `DELETE /api/storage/:key` - Delete file
- `GET /api/storage/list` - List files

### Registry Endpoints
- `GET /api/registry/packages` - List packages
- `POST /api/registry/publish` - Publish package
- `GET /api/registry/packages/:name` - Get package

### Publishing Endpoints
- `POST /api/publish` - Publish content
- `POST /api/publish/schedule` - Schedule publishing
- `GET /api/publish/drafts` - List drafts

### Blog Endpoints
- `GET /api/blog` - List posts
- `POST /api/blog` - Create post
- `GET /api/blog/:slug` - Get post
- `GET /api/blog/rss` - RSS feed

## Best Practices

1. **Metadata**: Always include relevant topics and tags for discoverability
2. **Publishing**: Use scheduling for coordinated releases
3. **Storage**: Organize files with clear prefixes (themes/, packages/, blog/)
4. **Registry**: Version packages semantically (major.minor.patch)
5. **Blog**: Write SEO-friendly descriptions and use keywords
6. **Security**: Keep R2 credentials in environment variables
7. **Performance**: Cache frequently accessed content

## Integration Examples

See `docs/INTEGRATION_EXAMPLES.md` for complete code examples.


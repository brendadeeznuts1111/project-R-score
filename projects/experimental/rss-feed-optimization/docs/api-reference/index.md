# API Reference

This section provides comprehensive API documentation for the RSS Feed Optimization project, including server APIs, client libraries, and utility functions.

## Table of Contents

- [Server API](./server-api.md) - RESTful API endpoints and documentation
- [R2 Client](./r2-client.md) - Cloudflare R2 storage API
- [Utilities](./utilities.md) - Utility functions and helper libraries
- [CLI Interface](./cli.md) - Command-line interface documentation

## API Overview

The RSS Feed Optimization project provides several APIs for different use cases:

### Server API
RESTful HTTP API for managing blog content, RSS feeds, and administrative operations.

**Base URL:** `https://your-blog.com/api/v1`

**Authentication:** Admin token required for administrative endpoints

### R2 Client API
Cloudflare R2 storage client for managing blog posts and assets.

**Features:**
- Post storage and retrieval
- Asset management
- Bulk operations
- Error handling

### Utility APIs
Various utility functions for performance optimization, caching, and system management.

**Categories:**
- Performance utilities
- Caching utilities
- Security utilities
- Monitoring utilities

## Quick Start

### Server API Example

```javascript
// Get all posts
const response = await fetch('https://your-blog.com/api/v1/posts');
const data = await response.json();
console.log(data.posts);

// Create a new post
const newPost = {
  title: 'New Blog Post',
  slug: 'new-blog-post',
  content: '# Content here...',
  author: 'Author Name'
};

const response = await fetch('https://your-blog.com/api/v1/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-admin-token'
  },
  body: JSON.stringify(newPost)
});

const result = await response.json();
console.log(result.post);
```

### R2 Client Example

```javascript
import { R2BlogStorage } from '../src/r2-client.js';

const storage = new R2BlogStorage();

// Upload a post
const post = {
  id: '123',
  title: 'Test Post',
  slug: 'test-post',
  content: 'Post content',
  author: 'Author'
};

await storage.uploadPost(post);

// Retrieve a post
const retrievedPost = await storage.getPost('test-post');
console.log(retrievedPost);
```

### Utility Example

```javascript
import { DNSOptimizer } from '../src/utils/dns-optimizer.js';
import { PerformanceTracker } from '../src/utils/performance-tracker.js';

// DNS optimization
const dns = new DNSOptimizer();
await dns.prefetch(['feeds.feedburner.com', 'medium.com']);

// Performance tracking
const tracker = new PerformanceTracker();
const result = await tracker.track('rss_generation', async () => {
  return await generateRSS(posts);
});

console.log(`RSS generation took ${result.duration}ms`);
```

## Authentication

### Admin Token Authentication

Most administrative operations require an admin token for authentication.

**Header Format:**
```text
Authorization: Bearer your-admin-token
```

**Example:**
```javascript
const response = await fetch('/api/v1/admin/sync', {
  headers: {
    'Authorization': 'Bearer your-admin-token'
  }
});
```

### Token Management

Admin tokens are configured via environment variables:

```bash
# .env file
ADMIN_TOKEN=your-super-secret-admin-token
```

**Security Notes:**
- Use strong, randomly generated tokens
- Never commit tokens to version control
- Rotate tokens regularly
- Use HTTPS in production

## Error Handling

### Error Response Format

All API endpoints return consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes

- **400 Bad Request:** Invalid input data
- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource not found
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server error

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/v1/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const result = await response.json();
  console.log('Post created:', result.post);
} catch (error) {
  console.error('Error creating post:', error.message);
}
```

## Rate Limiting

### Rate Limit Configuration

The API implements rate limiting to prevent abuse:

- **Default limit:** 200 requests per 10 minutes per IP
- **RSS feeds:** 50 requests per 5 minutes per IP
- **Admin endpoints:** 100 requests per 10 minutes per IP

### Rate Limit Headers

Rate limit information is included in response headers:

```text
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 199
X-RateLimit-Reset: 1643723400
```

### Handling Rate Limits

```javascript
const response = await fetch('/api/v1/posts');

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  
  // Wait and retry
  setTimeout(() => {
    // Retry logic
  }, retryAfter * 1000);
}
```

## CORS Configuration

### CORS Headers

The API includes CORS headers for cross-origin requests:

```text
Access-Control-Allow-Origin: https://your-frontend.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### CORS Configuration

CORS settings are configured via environment variables:

```bash
# .env file
CORS_ORIGIN=https://your-frontend.com,https://admin.your-frontend.com
CORS_CREDENTIALS=true
```

## API Versioning

### Version Strategy

The API uses URL-based versioning:

- **Current version:** `/api/v1/`
- **Future versions:** `/api/v2/`, `/api/v3/`, etc.

### Backward Compatibility

- Breaking changes require a new API version
- Old versions are maintained for a reasonable period
- Deprecation notices are provided in advance

## SDKs and Client Libraries

### JavaScript/TypeScript SDK

A comprehensive JavaScript/TypeScript SDK is available:

```javascript
import { RSSFeedClient } from '@rss-feed-optimization/client';

const client = new RSSFeedClient({
  baseURL: 'https://your-blog.com',
  token: 'your-admin-token'
});

// Get posts
const posts = await client.posts.list();

// Create post
const newPost = await client.posts.create({
  title: 'New Post',
  content: 'Content here...'
});
```

### Installation

```bash
npm install @rss-feed-optimization/client
# or
bun add @rss-feed-optimization/client
```

## Webhooks

### Webhook Events

The API supports webhooks for various events:

- **post.created:** New post created
- **post.updated:** Post updated
- **post.deleted:** Post deleted
- **rss.generated:** RSS feed generated
- **sync.completed:** Sync operation completed

### Webhook Configuration

Webhooks are configured via environment variables:

```bash
# .env file
WEBHOOK_URL=https://your-webhook-handler.com/webhooks
WEBHOOK_EVENTS=post.created,post.updated,post.deleted
WEBHOOK_SECRET=your-webhook-secret
```

### Webhook Payload

```json
{
  "event": "post.created",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "data": {
    "post": {
      "id": "123",
      "title": "New Post",
      "slug": "new-post"
    }
  },
  "signature": "sha256=..."
}
```

## Monitoring and Logging

### API Monitoring

The API includes comprehensive monitoring:

- Request/response logging
- Performance metrics
- Error tracking
- Rate limit monitoring

### Log Format

Structured JSON logging is used:

```json
{
  "timestamp": "2025-01-27T10:30:00.000Z",
  "level": "info",
  "message": "HTTP request completed",
  "meta": {
    "method": "GET",
    "url": "/api/v1/posts",
    "status": 200,
    "duration": "45ms",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

## Security

### Security Measures

- Input validation and sanitization
- Rate limiting
- CORS protection
- Security headers
- HTTPS enforcement
- Admin token authentication

### Security Headers

The API includes security headers:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Performance

### Performance Optimizations

- DNS prefetching
- Connection preconnect
- Caching strategies
- Streaming responses
- Optimized data structures

### Performance Monitoring

Performance metrics are available:

```javascript
// Get performance metrics
const response = await fetch('/api/v1/metrics/performance');
const metrics = await response.json();
console.log(metrics);
```

## Support

### Documentation
- [Server API Documentation](./server-api.md)
- [R2 Client Documentation](./r2-client.md)
- [Utility Functions](./utilities.md)

### Community
- [GitHub Issues](https://github.com/your-username/rss-feed-optimization/issues)
- [Discussions](https://github.com/your-username/rss-feed-optimization/discussions)
- [Documentation](../README.md)

### Professional Support
- Enterprise support available
- Consulting services
- Custom development

This API reference provides comprehensive documentation for all APIs in the RSS Feed Optimization project. For specific API details, see the individual API documentation pages.
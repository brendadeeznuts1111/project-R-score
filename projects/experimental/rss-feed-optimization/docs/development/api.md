# API Development Guide

This guide provides comprehensive information for developers working with the RSS Feed Optimization project's API.

## Overview

The RSS Feed Optimization project provides a RESTful API for managing blog content, RSS feeds, and administrative operations. This guide covers API design principles, endpoints, authentication, and best practices.

## API Architecture

### RESTful Design Principles

The API follows RESTful design principles:

- **Resource-based URLs**: Use nouns for resources, not verbs
- **HTTP methods**: Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- **Status codes**: Use proper HTTP status codes
- **Stateless**: Each request contains all necessary information
- **HATEOAS**: Include links to related resources

### API Structure

```text
/api/v1/
├── posts/           # Blog posts
├── rss/             # RSS feed endpoints
├── admin/           # Administrative operations
├── metrics/         # Performance metrics
└── health/          # Health checks
```

## Core Endpoints

### Posts API

#### GET /api/v1/posts

Retrieve a list of blog posts.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `category` (string, optional): Filter by category
- `search` (string, optional): Search in title and content

**Response:**
```json
{
  "data": [
    {
      "id": "1234567890",
      "title": "Blog Post Title",
      "slug": "blog-post-title",
      "excerpt": "Post excerpt",
      "content": "Full post content",
      "author": "Author Name",
      "tags": ["tag1", "tag2"],
      "publishedAt": "2025-01-27T10:30:00.000Z",
      "updatedAt": "2025-01-27T10:30:00.000Z",
      "readTime": 5,
      "wordCount": 500,
      "url": "https://blog.com/posts/blog-post-title"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /api/v1/posts/:slug

Retrieve a specific blog post by slug.

**Response:**
```json
{
  "data": {
    "id": "1234567890",
    "title": "Blog Post Title",
    "slug": "blog-post-title",
    "excerpt": "Post excerpt",
    "content": "Full post content",
    "author": "Author Name",
    "tags": ["tag1", "tag2"],
    "publishedAt": "2025-01-27T10:30:00.000Z",
    "updatedAt": "2025-01-27T10:30:00.000Z",
    "readTime": 5,
    "wordCount": 500,
    "url": "https://blog.com/posts/blog-post-title"
  }
}
```

#### POST /api/v1/posts

Create a new blog post.

**Authentication Required**: Admin token in Authorization header

**Request Body:**
```json
{
  "title": "New Blog Post",
  "slug": "new-blog-post",
  "excerpt": "Post excerpt",
  "content": "# New Blog Post\n\nContent here...",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "publishedAt": "2025-01-27T10:30:00.000Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "1234567890",
    "title": "New Blog Post",
    "slug": "new-blog-post",
    "excerpt": "Post excerpt",
    "content": "# New Blog Post\n\nContent here...",
    "author": "Author Name",
    "tags": ["tag1", "tag2"],
    "publishedAt": "2025-01-27T10:30:00.000Z",
    "updatedAt": "2025-01-27T10:30:00.000Z",
    "readTime": 5,
    "wordCount": 500,
    "url": "https://blog.com/posts/new-blog-post"
  }
}
```

#### PUT /api/v1/posts/:slug

Update an existing blog post.

**Authentication Required**: Admin token in Authorization header

**Request Body:**
```json
{
  "title": "Updated Blog Post",
  "excerpt": "Updated excerpt",
  "content": "# Updated Blog Post\n\nUpdated content...",
  "tags": ["updated-tag1", "updated-tag2"]
}
```

#### DELETE /api/v1/posts/:slug

Delete a blog post.

**Authentication Required**: Admin token in Authorization header

**Response:**
```json
{
  "message": "Post deleted successfully"
}
```

### RSS API

#### GET /api/v1/rss

Get the main RSS feed.

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog Title</title>
    <description>Blog description</description>
    <link>https://blog.com</link>
    <language>en</language>
    <lastBuildDate>Mon, 27 Jan 2025 10:30:00 GMT</lastBuildDate>
    <item>
      <title>Blog Post Title</title>
      <description>Post excerpt</description>
      <link>https://blog.com/posts/blog-post-title</link>
      <pubDate>Mon, 27 Jan 2025 10:30:00 GMT</pubDate>
      <author>Author Name</author>
      <guid>1234567890</guid>
    </item>
  </channel>
</rss>
```

#### GET /api/v1/rss/:category

Get RSS feed for a specific category.

**Response:** Same as main RSS feed but filtered by category

#### GET /api/v1/rss/categories

Get available RSS feed categories.

**Response:**
```json
{
  "data": [
    {
      "name": "technology",
      "count": 10,
      "url": "https://blog.com/rss/technology.xml"
    },
    {
      "name": "lifestyle",
      "count": 5,
      "url": "https://blog.com/rss/lifestyle.xml"
    }
  ]
}
```

### Admin API

#### POST /api/v1/admin/sync

Sync local posts to R2 storage.

**Authentication Required**: Admin token in Authorization header

**Response:**
```json
{
  "message": "Sync completed successfully",
  "synced": 10,
  "errors": 0
}
```

#### POST /api/v1/admin/cache/clear

Clear the application cache.

**Authentication Required**: Admin token in Authorization header

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

#### GET /api/v1/admin/config

Get current configuration.

**Authentication Required**: Admin token in Authorization header

**Response:**
```json
{
  "data": {
    "blogTitle": "RSS Feed Optimization",
    "blogUrl": "https://blog.com",
    "enableCache": true,
    "cacheTtl": 600,
    "enableCsp": true,
    "enableHsts": true,
    "enableRateLimiting": true
  }
}
```

#### POST /api/v1/admin/config

Update configuration.

**Authentication Required**: Admin token in Authorization header

**Request Body:**
```json
{
  "cacheTtl": 1200,
  "enableCache": true
}
```

### Metrics API

#### GET /api/v1/metrics

Get application metrics.

**Response:**
```json
{
  "data": {
    "uptime": 3600,
    "totalRequests": 150,
    "totalErrors": 2,
    "errorRate": "1.33%",
    "avgResponseTime": "45.23ms",
    "requestsPerSecond": "0.04",
    "memory": {
      "rss": 156789012,
      "heapTotal": 54321098,
      "heapUsed": 32109876,
      "external": 1234567
    },
    "cache": {
      "size": 50,
      "hits": 1000,
      "misses": 50,
      "hitRate": "95.24%"
    }
  }
}
```

#### GET /api/v1/metrics/performance

Get detailed performance metrics.

**Response:**
```json
{
  "data": {
    "rssGeneration": {
      "avgTime": 45.23,
      "minTime": 12.34,
      "maxTime": 156.78,
      "totalCalls": 100
    },
    "dnsPrefetch": {
      "avgTime": 0.06,
      "minTime": 0.01,
      "maxTime": 0.15,
      "totalCalls": 500
    },
    "r2Operations": {
      "avgTime": 120.45,
      "minTime": 50.12,
      "maxTime": 300.67,
      "totalCalls": 25
    }
  }
}
```

### Health API

#### GET /api/v1/health

Get application health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "version": "1.0.0",
  "memory": {
    "rss": 156789012,
    "heapTotal": 54321098,
    "heapUsed": 32109876,
    "external": 1234567
  },
  "dependencies": {
    "r2": "OK",
    "cache": "OK"
  }
}
```

#### GET /api/v1/health/detailed

Get detailed health information.

**Response:**
```json
{
  "status": "OK",
  "checks": {
    "memory": {
      "status": "OK",
      "details": {
        "heapUsed": 32109876,
        "heapTotal": 54321098,
        "percentage": "59.1%"
      }
    },
    "r2": {
      "status": "OK",
      "details": {
        "connection": "active",
        "bucket": "production-bucket"
      }
    },
    "cache": {
      "status": "OK",
      "details": {
        "size": 50,
        "hitRate": "95.24%"
      }
    }
  }
}
```

## Authentication

### Admin Token Authentication

The admin API endpoints require authentication using an admin token.

**Header Format:**
```text
Authorization: Bearer your-admin-token
```

**Example:**
```bash
curl -H "Authorization: Bearer your-admin-token" \
     https://blog.com/api/v1/admin/sync
```

### Error Responses

#### Authentication Error
```json
{
  "error": {
    "message": "Invalid admin token",
    "statusCode": 401
  }
}
```

#### Rate Limiting Error
```json
{
  "error": {
    "message": "Too many requests",
    "statusCode": 429,
    "retryAfter": 60
  }
}
```

#### Validation Error
```json
{
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "details": {
      "title": "Title is required",
      "slug": "Slug must be unique"
    }
  }
}
```

## API Development Best Practices

### 1. Error Handling

```javascript
// src/middleware/error-handler.js
export function errorHandler(error, req, res, next) {
  console.error('API Error:', error);

  // Custom error handling
  if (error instanceof BlogError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        statusCode: error.statusCode
      }
    });
  }

  // Generic error handling
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      statusCode: 500
    }
  });
}
```

### 2. Input Validation

```javascript
// src/middleware/validation.js
export function validatePost(req, res, next) {
  const { title, slug, content } = req.body;

  const errors = [];

  if (!title || title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (!slug || slug.length < 3) {
    errors.push('Slug must be at least 3 characters long');
  }

  if (!content || content.length < 10) {
    errors.push('Content must be at least 10 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors
      }
    });
  }

  next();
}
```

### 3. Rate Limiting

```javascript
// src/middleware/rate-limit.js
import { RateLimiter } from '../utils/rate-limiter.js';

const limiter = new RateLimiter({
  windowMs: 600000, // 10 minutes
  maxRequests: 200
});

export function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  
  if (limiter.isLimited(ip)) {
    return res.status(429).json({
      error: {
        message: 'Too many requests',
        retryAfter: limiter.getResetTime(ip)
      }
    });
  }

  next();
}
```

### 4. CORS Configuration

```javascript
// src/middleware/cors.js
export function cors(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}
```

### 5. Logging

```javascript
// src/middleware/logging.js
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    console.log(JSON.stringify(logData));
  });

  next();
}
```

## API Testing

### Unit Tests

```javascript
// tests/api/posts.test.js
import { test, expect } from 'bun:test';
import { serve } from 'bun';

test.describe('Posts API', () => {
  let server;

  test.beforeAll(() => {
    server = serve({
      port: 0,
      fetch: createApp().fetch
    });
  });

  test.afterAll(() => {
    server.stop();
  });

  test('GET /api/v1/posts returns posts list', async () => {
    const response = await fetch(`http://localhost:${server.port}/api/v1/posts`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.data).toBeArray();
    expect(data.pagination).toBeObject();
  });

  test('GET /api/v1/posts/:slug returns single post', async () => {
    const response = await fetch(`http://localhost:${server.port}/api/v1/posts/test-post`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.data).toBeObject();
    expect(data.data.slug).toBe('test-post');
  });

  test('POST /api/v1/posts creates new post', async () => {
    const postData = {
      title: 'New Test Post',
      slug: 'new-test-post',
      content: 'Test content',
      author: 'Test Author'
    };

    const response = await fetch(`http://localhost:${server.port}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(postData)
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe(postData.title);
  });
});
```

### Integration Tests

```javascript
// tests/api/integration.test.js
import { test, expect } from 'bun:test';
import { createApp } from '../src/server.js';

test.describe('API Integration', () => {
  let app;

  test.beforeAll(() => {
    app = createApp();
  });

  test('Full API workflow', async () => {
    // Create a post
    const createResponse = await fetch('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Integration Test Post',
        slug: 'integration-test-post',
        content: 'Test content',
        author: 'Test Author'
      })
    });

    expect(createResponse.status).toBe(201);
    const createdPost = await createResponse.json();

    // Get the post
    const getResponse = await fetch(`http://localhost:3000/api/v1/posts/${createdPost.data.slug}`);
    expect(getResponse.status).toBe(200);
    const retrievedPost = await getResponse.json();

    expect(retrievedPost.data.title).toBe(createdPost.data.title);

    // Get posts list
    const listResponse = await fetch('http://localhost:3000/api/v1/posts');
    expect(listResponse.status).toBe(200);
    const postsList = await listResponse.json();

    expect(postsList.data).toContain(retrievedPost.data);
  });
});
```

## API Documentation

### OpenAPI/Swagger

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: RSS Feed Optimization API
  description: API for managing blog content and RSS feeds
  version: 1.0.0
servers:
  - url: https://api.blog.com/v1
paths:
  /posts:
    get:
      summary: Get list of posts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: List of posts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostsResponse'
    post:
      summary: Create a new post
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PostInput'
      responses:
        '201':
          description: Post created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostResponse'
  /posts/{slug}:
    get:
      summary: Get post by slug
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Post found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostResponse'
        '404':
          description: Post not found
components:
  schemas:
    Post:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        slug:
          type: string
        content:
          type: string
        author:
          type: string
        publishedAt:
          type: string
          format: date-time
    PostInput:
      type: object
      required:
        - title
        - slug
        - content
      properties:
        title:
          type: string
        slug:
          type: string
        content:
          type: string
        author:
          type: string
    PostResponse:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/Post'
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
```

### API Client Generation

```javascript
// src/api-client.js
export class APIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return response.json();
  }

  // Posts API
  async getPosts(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/posts?${searchParams}`);
  }

  async getPost(slug) {
    return this.request(`/posts/${slug}`);
  }

  async createPost(postData) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async updatePost(slug, postData) {
    return this.request(`/posts/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    });
  }

  async deletePost(slug) {
    return this.request(`/posts/${slug}`, {
      method: 'DELETE'
    });
  }

  // RSS API
  async getRSSFeed() {
    return this.request('/rss');
  }

  async getRSSFeedByCategory(category) {
    return this.request(`/rss/${category}`);
  }

  // Admin API
  async syncPosts() {
    return this.request('/admin/sync', {
      method: 'POST'
    });
  }

  async clearCache() {
    return this.request('/admin/cache/clear', {
      method: 'POST'
    });
  }
}
```

This comprehensive API development guide provides everything needed to work with the RSS Feed Optimization project's API, from basic endpoints to advanced development practices.
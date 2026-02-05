# API Endpoints

This document provides comprehensive documentation for all API endpoints in the RSS Feed Optimization project.

## Base URL

```
https://your-blog.com/api/v1
```

## Authentication

Most endpoints require authentication via admin token:

```
Authorization: Bearer your-admin-token
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-01-27T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": {
      "field": "Additional error details"
    }
  }
}
```

## Posts Endpoints

### GET /posts

Retrieve all blog posts with optional pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sort` (optional): Sort field (title, date, author)
- `order` (optional): Sort order (asc, desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "123",
        "title": "Post Title",
        "slug": "post-title",
        "content": "Post content...",
        "author": "Author Name",
        "date": "2025-01-27T10:30:00.000Z",
        "tags": ["tag1", "tag2"],
        "excerpt": "Post excerpt...",
        "readTime": 5
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
}
```

### POST /posts

Create a new blog post.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer your-admin-token
```

**Request Body:**
```json
{
  "title": "New Blog Post",
  "slug": "new-blog-post",
  "content": "# Content here...",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "date": "2025-01-27T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "123",
      "title": "New Blog Post",
      "slug": "new-blog-post",
      "content": "# Content here...",
      "author": "Author Name",
      "date": "2025-01-27T10:30:00.000Z",
      "tags": ["tag1", "tag2"],
      "excerpt": "Post excerpt...",
      "readTime": 5
    }
  }
}
```

### GET /posts/:slug

Retrieve a specific blog post by slug.

**Response:**
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "123",
      "title": "Post Title",
      "slug": "post-title",
      "content": "Post content...",
      "author": "Author Name",
      "date": "2025-01-27T10:30:00.000Z",
      "tags": ["tag1", "tag2"],
      "excerpt": "Post excerpt...",
      "readTime": 5
    }
  }
}
```

### PUT /posts/:slug

Update an existing blog post.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer your-admin-token
```

**Request Body:**
```json
{
  "title": "Updated Post Title",
  "content": "Updated content...",
  "author": "Updated Author",
  "tags": ["updated-tag1", "updated-tag2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "123",
      "title": "Updated Post Title",
      "slug": "post-title",
      "content": "Updated content...",
      "author": "Updated Author",
      "date": "2025-01-27T10:30:00.000Z",
      "tags": ["updated-tag1", "updated-tag2"],
      "excerpt": "Updated excerpt...",
      "readTime": 6
    }
  }
}
```

### DELETE /posts/:slug

Delete a blog post.

**Headers:**
```
Authorization: Bearer your-admin-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Post deleted successfully"
  }
}
```

## RSS Feed Endpoints

### GET /feed.xml

Retrieve RSS feed in XML format.

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog Title</title>
    <link>https://your-blog.com</link>
    <description>Blog description</description>
    <language>en-us</language>
    <lastBuildDate>Mon, 27 Jan 2025 10:30:00 GMT</lastBuildDate>
    <item>
      <title>Post Title</title>
      <link>https://your-blog.com/posts/post-title</link>
      <description>Post excerpt...</description>
      <pubDate>Mon, 27 Jan 2025 10:30:00 GMT</pubDate>
      <author>Author Name</author>
      <guid>https://your-blog.com/posts/post-title</guid>
    </item>
  </channel>
</rss>
```

### GET /feed.json

Retrieve RSS feed in JSON format.

**Response:**
```json
{
  "success": true,
  "data": {
    "feed": {
      "title": "Blog Title",
      "link": "https://your-blog.com",
      "description": "Blog description",
      "language": "en-us",
      "lastBuildDate": "2025-01-27T10:30:00.000Z",
      "items": [
        {
          "title": "Post Title",
          "link": "https://your-blog.com/posts/post-title",
          "description": "Post excerpt...",
          "pubDate": "2025-01-27T10:30:00.000Z",
          "author": "Author Name",
          "guid": "https://your-blog.com/posts/post-title"
        }
      ]
    }
  }
}
```

## Admin Endpoints

### POST /admin/sync

Sync local posts to R2 storage.

**Headers:**
```
Authorization: Bearer your-admin-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Sync completed successfully",
    "stats": {
      "totalPosts": 50,
      "syncedPosts": 50,
      "failedPosts": 0,
      "duration": 2500
    }
  }
}
```

### GET /admin/stats

Get application statistics.

**Headers:**
```
Authorization: Bearer your-admin-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalPosts": 50,
      "totalViews": 10000,
      "cache": {
        "size": 150,
        "hitRate": 0.95,
        "memoryUsage": 2048
      },
      "performance": {
        "avgResponseTime": 45.23,
        "totalRequests": 1000,
        "errorRate": 0.01
      },
      "r2": {
        "totalFiles": 50,
        "totalSize": 1024000,
        "lastSync": "2025-01-27T10:30:00.000Z"
      }
    }
  }
}
```

### GET /admin/health

Get application health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "health": {
      "status": "OK",
      "timestamp": "2025-01-27T10:30:00.000Z",
      "uptime": 3600,
      "memory": {
        "used": 150,
        "total": 1024,
        "percentage": 14.6
      },
      "dependencies": {
        "r2": {
          "status": "OK",
          "latency": 45
        },
        "cache": {
          "status": "OK",
          "size": 150
        },
        "dns": {
          "status": "OK",
          "cacheHitRate": 0.95
        }
      }
    }
  }
}
```

### GET /admin/health/detailed

Get detailed health status with all metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "health": {
      "status": "OK",
      "timestamp": "2025-01-27T10:30:00.000Z",
      "uptime": 3600,
      "memory": {
        "used": 150,
        "total": 1024,
        "percentage": 14.6,
        "rss": 150000000,
        "heapTotal": 100000000,
        "heapUsed": 80000000,
        "external": 20000000
      },
      "cpu": {
        "usage": {
          "user": 1000000,
          "system": 500000
        }
      },
      "dependencies": {
        "r2": {
          "status": "OK",
          "latency": 45,
          "connectionPool": {
            "active": 10,
            "idle": 5,
            "total": 15
          }
        },
        "cache": {
          "status": "OK",
          "size": 150,
          "maxSize": 500,
          "hitRate": 0.95
        },
        "dns": {
          "status": "OK",
          "cacheHitRate": 0.95,
          "cacheSize": 100,
          "totalLookups": 1000
        }
      },
      "metrics": {
        "requests": {
          "total": 1000,
          "perSecond": 10.5
        },
        "errors": {
          "total": 10,
          "rate": 0.01
        },
        "responseTime": {
          "avg": 45.23,
          "min": 10.5,
          "max": 200.0
        }
      }
    }
  }
}
```

### POST /admin/clear-cache

Clear all cache entries.

**Headers:**
```
Authorization: Bearer your-admin-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Cache cleared successfully",
    "stats": {
      "previousSize": 150,
      "clearedEntries": 150,
      "duration": 10
    }
  }
}
```

### GET /admin/logs

Get application logs (last 100 entries).

**Headers:**
```
Authorization: Bearer your-admin-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-27T10:30:00.000Z",
        "level": "info",
        "message": "HTTP request completed",
        "meta": {
          "method": "GET",
          "url": "/api/v1/posts",
          "status": 200,
          "duration": "45ms"
        }
      }
    ]
  }
}
```

## Utility Endpoints

### GET /metrics

Get performance metrics (requires admin token).

**Headers:**
```
Authorization: Bearer your-admin-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "uptime": 3600,
      "memory": {
        "used": 150,
        "total": 1024
      },
      "requests": {
        "total": 1000,
        "perSecond": 10.5,
        "avgResponseTime": 45.23
      },
      "cache": {
        "hitRate": 0.95,
        "size": 150,
        "memoryUsage": 2048
      },
      "dns": {
        "hitRate": 0.95,
        "avgLookupTime": 1.5
      }
    }
  }
}
```

### GET /version

Get application version information.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": {
      "app": "1.0.0",
      "bun": "1.3.7",
      "node": "18.19.0",
      "platform": "darwin",
      "arch": "x64"
    }
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Invalid input data",
    "statusCode": 400,
    "details": {
      "title": "Title is required",
      "slug": "Slug must be unique"
    }
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "message": "Invalid admin token",
    "statusCode": 401
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "statusCode": 403
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "message": "Post not found",
    "statusCode": 404
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "details": {
      "retryAfter": 60
    }
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "statusCode": 500
  }
}
```

## Rate Limiting

The API implements rate limiting:

- **Default limit**: 200 requests per 10 minutes per IP
- **RSS feeds**: 50 requests per 5 minutes per IP
- **Admin endpoints**: 100 requests per 10 minutes per IP

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 199
X-RateLimit-Reset: 1643723400
```

## CORS

The API includes CORS headers for cross-origin requests:

```
Access-Control-Allow-Origin: https://your-frontend.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## Examples

### JavaScript Fetch Example

```javascript
// Get all posts
const response = await fetch('/api/v1/posts?limit=20&page=1');
const data = await response.json();
console.log(data.posts);

// Create a post
const newPost = {
  title: 'New Post',
  slug: 'new-post',
  content: '# Content here...',
  author: 'Author Name'
};

const response = await fetch('/api/v1/posts', {
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

### cURL Example

```bash
# Get posts
curl "https://your-blog.com/api/v1/posts?limit=10&page=1"

# Create post
curl -X POST "https://your-blog.com/api/v1/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "title": "New Post",
    "slug": "new-post",
    "content": "# Content here...",
    "author": "Author Name"
  }'

# Get RSS feed
curl "https://your-blog.com/feed.xml"
```

This comprehensive API documentation provides all the information needed to interact with the RSS Feed Optimization project's API endpoints.
# Server API Reference

This document provides comprehensive documentation for the RSS Feed Optimization server API endpoints.

## Base URL

```text
http://localhost:3000
```

For production deployments, replace with your domain:
```text
https://your-domain.com
```

## Authentication

Most endpoints require authentication using an admin token.

### Admin Token

Set the `ADMIN_TOKEN` environment variable and include it in requests:

```bash
# In headers
Authorization: Bearer your-admin-token

# Or as query parameter
?token=your-admin-token
```

## Public Endpoints

### GET /

**Description**: Blog homepage

**Response**: HTML page with blog posts

**Example**:
```bash
curl http://localhost:3000
```

### GET /rss.xml

**Description**: Main RSS feed

**Response**: RSS XML feed

**Example**:
```bash
curl http://localhost:3000/rss.xml
```

### GET /rss/{category}.xml

**Description**: Category-specific RSS feed

**Parameters**:
- `category` (string): The category name

**Response**: RSS XML feed for the specified category

**Example**:
```bash
curl http://localhost:3000/rss/technology.xml
```

### GET /posts/{slug}

**Description**: Individual blog post

**Parameters**:
- `slug` (string): The post slug

**Response**: HTML page for the blog post

**Example**:
```bash
curl http://localhost:3000/posts/my-first-post
```

### GET /health

**Description**: Health check endpoint

**Response**: JSON status information

**Example**:
```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "version": "1.3.7"
}
```

### GET /metrics

**Description**: Server metrics and statistics

**Response**: JSON metrics data

**Example**:
```bash
curl http://localhost:3000/metrics
```

**Response**:
```json
{
  "uptime": 3600,
  "totalRequests": 150,
  "totalErrors": 2,
  "errorRate": "1.33%",
  "avgResponseTime": "45.23ms",
  "requestsPerSecond": "0.04",
  "routeBreakdown": {
    "/": {
      "requests": 50,
      "errors": 0,
      "avgResponseTime": 30.5
    }
  },
  "memory": {
    "rss": 156789012,
    "heapTotal": 54321098,
    "heapUsed": 32109876,
    "external": 1234567
  }
}
```

### GET /performance/network

**Description**: Network performance and optimization stats

**Response**: JSON network statistics

**Example**:
```bash
curl http://localhost:3000/performance/network
```

**Response**:
```json
{
  "dns": {
    "cacheHits": 150,
    "cacheMisses": 25,
    "hitRate": "85.71%",
    "prefetches": 10
  },
  "connections": {
    "active": 5,
    "total": 100,
    "avgResponseTime": "120ms"
  },
  "feeds": {
    "totalFetched": 50,
    "avgFetchTime": "2.5s",
    "successRate": "95%"
  }
}
```

## Admin Endpoints

### POST /admin/sync

**Description**: Sync local posts to R2 storage

**Authentication**: Required

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/admin/sync
```

**Response**:
```json
{
  "success": true,
  "synced": 10,
  "errors": 0
}
```

### GET /admin/stats

**Description**: Get server statistics and performance data

**Authentication**: Required

**Example**:
```bash
curl -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/admin/stats
```

**Response**:
```json
{
  "totalPosts": 150,
  "totalWords": 75000,
  "lastUpdated": "2025-01-27T10:30:00.000Z",
  "cacheSize": 50,
  "memory": {
    "rss": 156789012,
    "heapTotal": 54321098,
    "heapUsed": 32109876,
    "external": 1234567
  }
}
```

### POST /admin/cache/clear

**Description**: Clear the application cache

**Authentication**: Required

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/admin/cache/clear
```

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

### GET /admin/profile

**Description**: Generate performance profile

**Authentication**: Required

**Example**:
```bash
curl -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/admin/profile
```

**Response**:
```json
{
  "name": "admin-request",
  "timestamp": 1706345400000,
  "duration": 150.25,
  "samples": 1250,
  "memory": {
    "rss": 156789012,
    "heapTotal": 54321098,
    "heapUsed": 32109876,
    "external": 1234567
  },
  "recommendations": [
    {
      "type": "JSON_PARSE_BOTTLENECK",
      "severity": "MEDIUM",
      "message": "JSON parsing accounts for 15.2% of CPU time",
      "suggestion": "Consider using streaming JSONL for large datasets"
    }
  ]
}
```

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "type": "ERROR_TYPE",
    "status": 400
  }
}
```

### Common Error Types

- `NOT_FOUND` - Resource not found (404)
- `UNAUTHORIZED` - Authentication required (401)
- `VALIDATION_ERROR` - Invalid input (400)
- `INTERNAL_ERROR` - Server error (500)
- `RATE_LIMITED` - Too many requests (429)

### Example Error Response

```json
{
  "error": {
    "message": "Post not found",
    "type": "NOT_FOUND",
    "status": 404
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default limit**: 100 requests per 15 minutes per IP
- **Admin endpoints**: 50 requests per 15 minutes per token
- **Burst limit**: 10 requests per second

### Rate Limit Headers

Rate limit information is included in response headers:

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706345400
```

## CORS

CORS is enabled for all domains by default. Configure allowed origins with the `CORS_ORIGIN` environment variable.

## Request/Response Formats

### Content Types

- **HTML**: `text/html; charset=utf-8`
- **JSON**: `application/json; charset=utf-8`
- **RSS**: `application/rss+xml; charset=utf-8`

### Character Encoding

All responses use UTF-8 encoding.

### Caching

Responses include appropriate cache headers:

- **Public pages**: `Cache-Control: public, max-age=300`
- **API responses**: `Cache-Control: private, max-age=60`
- **RSS feeds**: `Cache-Control: public, max-age=300`

## Webhooks

### RSS Feed Update Webhook

When RSS feeds are updated, the system can send webhooks to configured endpoints.

**Configuration**:
```bash
WEBHOOK_URL=https://your-webhook-endpoint.com
WEBHOOK_SECRET=your-webhook-secret
```

**Webhook Payload**:
```json
{
  "event": "rss_feed_updated",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "data": {
    "feedUrl": "https://example.com/rss.xml",
    "newItems": 5,
    "totalItems": 100
  }
}
```

## Monitoring Integration

### Prometheus Metrics

The `/metrics` endpoint provides Prometheus-compatible metrics:

- `rss_feed_optimization_requests_total`
- `rss_feed_optimization_errors_total`
- `rss_feed_optimization_response_time_seconds`
- `rss_feed_optimization_cache_size`
- `rss_feed_optimization_memory_usage_bytes`

### Health Checks

Use the `/health` endpoint for load balancer health checks:

```bash
# Example health check script
curl -f http://localhost:3000/health || exit 1
```

## API Versioning

The current API version is `v1`. Future versions will be indicated in the URL path:

```text
/v1/endpoint
/v2/endpoint
```

## SDKs and Libraries

### JavaScript/Node.js

```javascript
class RSSFeedClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getPosts() {
    const response = await fetch(`${this.baseUrl}/posts`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.json();
  }

  async getRSSFeed() {
    const response = await fetch(`${this.baseUrl}/rss.xml`);
    return response.text();
  }
}
```

### Python

```python
import requests

class RSSFeedClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {'Authorization': f'Bearer {token}'}

    def get_posts(self):
        response = requests.get(f'{self.base_url}/posts', headers=self.headers)
        return response.json()

    def get_rss_feed(self):
        response = requests.get(f'{self.base_url}/rss.xml')
        return response.text
```

## Best Practices

### Client Implementation

1. **Handle errors gracefully** - Always check for error responses
2. **Implement retry logic** - Retry failed requests with exponential backoff
3. **Respect rate limits** - Monitor rate limit headers
4. **Cache responses** - Cache frequently accessed data
5. **Use HTTPS** - Always use HTTPS in production

### Security

1. **Secure admin tokens** - Store tokens securely
2. **Validate input** - Sanitize all user input
3. **Monitor access** - Log and monitor API usage
4. **Use webhooks securely** - Verify webhook signatures

## Support

For API-related questions:

1. **Check the [FAQ](../troubleshooting/faq.md)**
2. **[Create an issue](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)**
3. **Join the [community discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)**
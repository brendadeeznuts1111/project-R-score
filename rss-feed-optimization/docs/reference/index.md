# Reference

This section provides reference documentation for the RSS Feed Optimization project, including Bun.js integration, environment variables, and other technical references.

## Table of Contents

- [Bun.js Integration](./bun-integration.md) - Bun.js specific features and integration
- [Environment Variables](./environment-variables.md) - Complete environment variable reference
- [Configuration Schema](./configuration-schema.md) - Configuration file schemas and validation
- [API Endpoints](./api-endpoints.md) - Complete API endpoint reference
- [Error Codes](./error-codes.md) - Error code reference and handling
- [Performance Benchmarks](./performance-benchmarks.md) - Performance metrics and benchmarks

## Quick Reference

### Environment Variables

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
BLOG_TITLE="My Blog"
BLOG_URL=https://myblog.com
ADMIN_TOKEN=your-admin-token

# R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name

# Performance
ENABLE_CACHE=true
CACHE_TTL=600
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true

# Security
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
```

### CLI Commands

```bash
# Development
bun cli.js dev
bun cli.js test
bun cli.js lint

# Production
bun cli.js start
bun cli.js build
bun cli.js sync

# Utilities
bun cli.js benchmark
bun cli.js help
```

### API Endpoints

```bash
# Posts
GET /api/v1/posts
POST /api/v1/posts
GET /api/v1/posts/:slug
PUT /api/v1/posts/:slug
DELETE /api/v1/posts/:slug

# RSS Feed
GET /feed.xml
GET /feed.json

# Admin
POST /api/v1/admin/sync
GET /api/v1/admin/stats
GET /api/v1/admin/health
```

### Error Codes

```javascript
// Common error codes
400: "Bad Request - Invalid input data"
401: "Unauthorized - Missing or invalid authentication"
403: "Forbidden - Insufficient permissions"
404: "Not Found - Resource not found"
429: "Too Many Requests - Rate limit exceeded"
500: "Internal Server Error - Server error"
```

## Bun.js Integration

The project is built specifically for Bun.js and leverages its native features:

- **Native APIs**: Uses Bun.serve(), Bun.file(), Bun.write()
- **Performance**: Optimized for Bun's V8 engine
- **TypeScript**: Built-in TypeScript support
- **Package Management**: Uses Bun's package manager
- **Testing**: Uses bun:test for testing

For detailed Bun.js integration information, see [Bun.js Integration](./bun-integration.md).

## Environment Variables

All configuration is done through environment variables. See [Environment Variables](./environment-variables.md) for a complete reference.

## Performance

The project includes comprehensive performance optimizations:

- **DNS Prefetching**: Sub-millisecond DNS resolution
- **Connection Preconnect**: Eliminates TCP/TLS handshake overhead
- **Caching**: Multi-level caching with LRU eviction
- **Buffer Optimization**: 50% faster buffer operations
- **Streaming**: Real-time content delivery

For detailed performance information, see [Performance Benchmarks](./performance-benchmarks.md).

## Security

Security is implemented at multiple levels:

- **Input Validation**: Comprehensive input validation and sanitization
- **Authentication**: Admin token authentication
- **Rate Limiting**: Request rate limiting
- **Security Headers**: CSP, HSTS, XSS protection
- **Error Handling**: Secure error handling

For detailed security information, see the [Security Guide](../development/security.md).

## Monitoring

The project includes comprehensive monitoring:

- **Metrics Collection**: Request metrics, performance metrics
- **Health Checks**: Application and dependency health checks
- **Error Tracking**: Error rate tracking and reporting
- **Performance Tracking**: Operation performance monitoring

For detailed monitoring information, see the [Monitoring Guide](../development/monitoring.md).

## Support

For additional support and documentation:

- [Main Documentation](../README.md)
- [Development Guide](../development/)
- [API Reference](../api-reference/)
- [Troubleshooting](../troubleshooting/)

This reference section provides quick access to the most commonly needed information for working with the RSS Feed Optimization project.
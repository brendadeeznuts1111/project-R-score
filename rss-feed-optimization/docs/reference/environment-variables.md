# Environment Variables Reference

This document provides comprehensive information about all environment variables used in the RSS Feed Optimization project.

## Overview

The RSS Feed Optimization project uses environment variables for configuration, allowing for flexible deployment across different environments (development, staging, production).

## Application Settings

### Required Variables

#### BLOG_TITLE
- **Type**: String
- **Default**: "RSS Feed Optimization"
- **Description**: The title of your blog
- **Example**: `BLOG_TITLE="My Awesome Blog"`

#### BLOG_URL
- **Type**: String
- **Default**: "http://localhost:3000"
- **Description**: The base URL of your blog
- **Example**: `BLOG_URL="https://myblog.com"`

#### ADMIN_TOKEN
- **Type**: String
- **Default**: "dev-token"
- **Description**: Token required for admin operations
- **Security**: Use a strong, unique token in production
- **Example**: `ADMIN_TOKEN="your-super-secret-admin-token"`

### Optional Variables

#### NODE_ENV
- **Type**: String
- **Default**: "development"
- **Values**: "development", "production", "test"
- **Description**: Node.js environment setting
- **Example**: `NODE_ENV="production"`

#### PORT
- **Type**: Number
- **Default**: 3000
- **Description**: Port number for the server
- **Example**: `PORT=3000`

## R2 Storage Configuration

### Required Variables (if using R2)

#### R2_ACCOUNT_ID
- **Type**: String
- **Description**: Cloudflare account ID
- **Example**: `R2_ACCOUNT_ID="your-account-id"`

#### R2_ACCESS_KEY_ID
- **Type**: String
- **Description**: R2 access key ID
- **Example**: `R2_ACCESS_KEY_ID="your-access-key"`

#### R2_SECRET_ACCESS_KEY
- **Type**: String
- **Description**: R2 secret access key
- **Security**: Keep this secure
- **Example**: `R2_SECRET_ACCESS_KEY="your-secret-key"`

#### R2_BUCKET_NAME
- **Type**: String
- **Description**: R2 bucket name
- **Example**: `R2_BUCKET_NAME="your-bucket-name"`

### Optional Variables

#### R2_ENDPOINT
- **Type**: String
- **Default**: Auto-generated from account ID
- **Description**: R2 endpoint URL
- **Example**: `R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"`

#### R2_REGION
- **Type**: String
- **Default**: "auto"
- **Description**: R2 region
- **Example**: `R2_REGION="auto"`

## Performance Settings

### Caching Configuration

#### ENABLE_CACHE
- **Type**: Boolean
- **Default**: true
- **Description**: Enable application caching
- **Example**: `ENABLE_CACHE=true`

#### CACHE_TTL
- **Type**: Number
- **Default**: 600 (10 minutes)
- **Description**: Cache time-to-live in seconds
- **Example**: `CACHE_TTL=600`

#### MAX_CACHE_SIZE
- **Type**: Number
- **Default**: 200
- **Description**: Maximum number of cached items
- **Example**: `MAX_CACHE_SIZE=200`

### DNS Optimization

#### ENABLE_DNS_PREFETCH
- **Type**: Boolean
- **Default**: true
- **Description**: Enable DNS prefetching
- **Example**: `ENABLE_DNS_PREFETCH=true`

#### ENABLE_PRECONNECT
- **Type**: Boolean
- **Default**: true
- **Description**: Enable connection preconnect
- **Example**: `ENABLE_PRECONNECT=true`

#### PREFETCH_COMMON_RSS
- **Type**: Boolean
- **Default**: true
- **Description**: Prefetch common RSS feed hosts
- **Example**: `PREFETCH_COMMON_RSS=true`

### Buffer Optimization

#### ENABLE_BUFFER_OPTIMIZATION
- **Type**: Boolean
- **Default**: true
- **Description**: Enable buffer optimization
- **Example**: `ENABLE_BUFFER_OPTIMIZATION=true`

#### BUFFER_SIZE
- **Type**: Number
- **Default**: 8192
- **Description**: Buffer size for operations
- **Example**: `BUFFER_SIZE=8192`

## Security Settings

### Content Security Policy

#### ENABLE_CSP
- **Type**: Boolean
- **Default**: true
- **Description**: Enable Content Security Policy
- **Example**: `ENABLE_CSP=true`

#### CSP_DIRECTIVES
- **Type**: String
- **Default**: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
- **Description**: CSP directives
- **Example**: `CSP_DIRECTIVES="default-src 'self'; script-src 'self' 'unsafe-inline'"`

### HTTP Strict Transport Security

#### ENABLE_HSTS
- **Type**: Boolean
- **Default**: true
- **Description**: Enable HTTP Strict Transport Security
- **Example**: `ENABLE_HSTS=true`

#### HSTS_MAX_AGE
- **Type**: Number
- **Default**: 31536000 (1 year)
- **Description**: HSTS max age in seconds
- **Example**: `HSTS_MAX_AGE=31536000`

### Rate Limiting

#### ENABLE_RATE_LIMITING
- **Type**: Boolean
- **Default**: true
- **Description**: Enable rate limiting
- **Example**: `ENABLE_RATE_LIMITING=true`

#### RATE_LIMIT_WINDOW_MS
- **Type**: Number
- **Default**: 600000 (10 minutes)
- **Description**: Rate limit window in milliseconds
- **Example**: `RATE_LIMIT_WINDOW_MS=600000`

#### RATE_LIMIT_MAX_REQUESTS
- **Type**: Number
- **Default**: 200
- **Description**: Maximum requests per window
- **Example**: `RATE_LIMIT_MAX_REQUESTS=200`

### CORS Configuration

#### CORS_ORIGIN
- **Type**: String
- **Default**: "*"
- **Description**: CORS allowed origin
- **Security**: Use specific origin in production
- **Example**: `CORS_ORIGIN="https://myblog.com"`

#### CORS_CREDENTIALS
- **Type**: Boolean
- **Default**: true
- **Description**: Allow CORS credentials
- **Example**: `CORS_CREDENTIALS=true`

## Monitoring and Logging

### Logging Configuration

#### LOG_LEVEL
- **Type**: String
- **Default**: "info"
- **Values**: "error", "warn", "info", "debug", "trace"
- **Description**: Logging level
- **Example**: `LOG_LEVEL="info"`

#### LOG_FORMAT
- **Type**: String
- **Default**: "json"
- **Values**: "json", "text"
- **Description**: Log output format
- **Example**: `LOG_FORMAT="json"`

#### LOG_FILE
- **Type**: String
- **Default**: ""
- **Description**: Log file path (empty for console only)
- **Example**: `LOG_FILE="./logs/app.log"`

### Metrics Configuration

#### ENABLE_METRICS
- **Type**: Boolean
- **Default**: true
- **Description**: Enable metrics collection
- **Example**: `ENABLE_METRICS=true`

#### METRICS_ENDPOINT
- **Type**: String
- **Default**: "/metrics"
- **Description**: Metrics endpoint path
- **Example**: `METRICS_ENDPOINT="/metrics"`

#### METRICS_AUTH_TOKEN
- **Type**: String
- **Default**: ""
- **Description**: Token for metrics endpoint access
- **Example**: `METRICS_AUTH_TOKEN="metrics-token"`

### Profiling Configuration

#### ENABLE_PROFILING
- **Type**: Boolean
- **Default**: false
- **Description**: Enable performance profiling
- **Example**: `ENABLE_PROFILING=false`

#### PROFILE_INTERVAL
- **Type**: Number
- **Default**: 60000 (1 minute)
- **Description**: Profile interval in milliseconds
- **Example**: `PROFILE_INTERVAL=60000`

## Development Settings

### Development Mode

#### DEBUG
- **Type**: Boolean
- **Default**: false
- **Description**: Enable debug mode
- **Example**: `DEBUG=true`

#### VERBOSE
- **Type**: Boolean
- **Default**: false
- **Description**: Enable verbose logging
- **Example**: `VERBOSE=true`

#### HOT_RELOAD
- **Type**: Boolean
- **Default**: true
- **Description**: Enable hot reload in development
- **Example**: `HOT_RELOAD=true`

### Testing Configuration

#### TEST_TIMEOUT
- **Type**: Number
- **Default**: 5000
- **Description**: Test timeout in milliseconds
- **Example**: `TEST_TIMEOUT=5000`

#### TEST_COVERAGE
- **Type**: Boolean
- **Default**: false
- **Description**: Enable test coverage reporting
- **Example**: `TEST_COVERAGE=true`

## Advanced Configuration

### Performance Tuning

#### MAX_CONCURRENT_REQUESTS
- **Type**: Number
- **Default**: 100
- **Description**: Maximum concurrent requests
- **Example**: `MAX_CONCURRENT_REQUESTS=100`

#### REQUEST_TIMEOUT
- **Type**: Number
- **Default**: 30000 (30 seconds)
- **Description**: Request timeout in milliseconds
- **Example**: `REQUEST_TIMEOUT=30000`

#### KEEP_ALIVE_TIMEOUT
- **Type**: Number
- **Default**: 5000 (5 seconds)
- **Description**: Keep-alive timeout in milliseconds
- **Example**: `KEEP_ALIVE_TIMEOUT=5000`

### Memory Management

#### MAX_MEMORY_USAGE
- **Type**: Number
- **Default**: 500 (MB)
- **Description**: Maximum memory usage in MB
- **Example**: `MAX_MEMORY_USAGE=500`

#### MEMORY_WARNING_THRESHOLD
- **Type**: Number
- **Default**: 400 (MB)
- **Description**: Memory warning threshold in MB
- **Example**: `MEMORY_WARNING_THRESHOLD=400`

### Network Configuration

#### DNS_CACHE_SIZE
- **Type**: Number
- **Default**: 100
- **Description**: DNS cache size
- **Example**: `DNS_CACHE_SIZE=100`

#### CONNECTION_POOL_SIZE
- **Type**: Number
- **Default**: 10
- **Description**: HTTP connection pool size
- **Example**: `CONNECTION_POOL_SIZE=10`

## Environment-Specific Examples

### Development Environment

```bash
# .env.development
NODE_ENV=development
BLOG_TITLE="RSS Feed Optimization (Dev)"
BLOG_URL=http://localhost:3000
ADMIN_TOKEN=dev-token
DEBUG=true
VERBOSE=true
ENABLE_CACHE=false
ENABLE_PROFILING=true
LOG_LEVEL=debug
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
BLOG_TITLE="RSS Feed Optimization (Staging)"
BLOG_URL=https://staging.myblog.com
ADMIN_TOKEN=staging-secret-token
ENABLE_CACHE=true
CACHE_TTL=300
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
BLOG_TITLE="RSS Feed Optimization"
BLOG_URL=https://myblog.com
ADMIN_TOKEN=production-super-secret-token
ENABLE_CACHE=true
CACHE_TTL=600
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
LOG_LEVEL=warn
ENABLE_PROFILING=false
```

## Configuration Validation

### Required Variables Check

The application validates required environment variables on startup:

```javascript
// Required variables
const required = ['BLOG_TITLE', 'BLOG_URL', 'ADMIN_TOKEN'];

// R2 variables (if R2 is enabled)
const r2Required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
```

### Validation Example

```javascript
// Validate configuration
function validateConfig() {
  const required = ['BLOG_TITLE', 'BLOG_URL', 'ADMIN_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('Configuration validation passed');
}
```

## Security Best Practices

### Environment Variable Security

1. **Use strong, unique values** for tokens and secrets
2. **Never commit** `.env` files to version control
3. **Use environment-specific** configurations
4. **Rotate secrets** regularly
5. **Use secure storage** for production secrets

### Example Secure Configuration

```bash
# Production .env file
BLOG_TITLE="My Secure Blog"
BLOG_URL=https://myblog.com
ADMIN_TOKEN=$(openssl rand -base64 32)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY=$(openssl rand -base64 32)
R2_BUCKET_NAME="production-bucket"
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
CORS_ORIGIN="https://myblog.com"
LOG_LEVEL=warn
```

## Troubleshooting

### Common Issues

#### 1. Missing Environment Variables

**Problem**: Application fails to start with missing variable errors.

**Solution**:
```bash
# Check if variables are set
echo $BLOG_TITLE
echo $BLOG_URL
echo $ADMIN_TOKEN

# Create .env file if missing
cp .env.example .env
# Edit .env with your values
```

#### 2. Invalid R2 Configuration

**Problem**: R2 operations fail with authentication errors.

**Solution**:
```bash
# Verify R2 credentials
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY
echo $R2_BUCKET_NAME

# Test R2 connection
bun run cli.js status
```

#### 3. Performance Issues

**Problem**: Application is slow or unresponsive.

**Solution**:
```bash
# Check cache configuration
echo $ENABLE_CACHE
echo $CACHE_TTL
echo $MAX_CACHE_SIZE

# Enable profiling
ENABLE_PROFILING=true bun run dev
```

#### 4. Security Issues

**Problem**: Security headers not working or weak configuration.

**Solution**:
```bash
# Enable security features
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
CORS_ORIGIN="https://your-domain.com"
```

### Debug Mode

Enable debug mode to see detailed configuration information:

```bash
DEBUG=true bun run dev
```

This will log:
- All environment variables (sanitized)
- Configuration validation results
- Performance metrics
- Error details

## Environment Variable Precedence

Environment variables follow this precedence order:

1. **Command line arguments** (highest priority)
2. **Environment variables** (set in shell)
3. **.env files** (loaded in order)
4. **Default values** (lowest priority)

### Loading Order

```bash
# .env files are loaded in this order:
.env.local      # Local overrides (not committed)
.env.[mode]     # Mode-specific (e.g., .env.production)
.env            # Base configuration
```

## Dynamic Configuration

### Runtime Configuration

Some configuration can be changed at runtime:

```javascript
// Update cache settings
process.env.CACHE_TTL = '1200';
cache.setTTL(parseInt(process.env.CACHE_TTL));

// Update logging level
process.env.LOG_LEVEL = 'debug';
logger.setLevel(process.env.LOG_LEVEL);
```

### Configuration API

The application provides endpoints to view and update configuration:

```bash
# View current configuration
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/admin/config

# Update configuration
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"CACHE_TTL": 1200}' \
  http://localhost:3000/admin/config
```

This comprehensive environment variables reference ensures proper configuration and deployment of the RSS Feed Optimization project across all environments.
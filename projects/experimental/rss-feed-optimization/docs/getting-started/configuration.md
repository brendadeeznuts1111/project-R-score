# Configuration Guide

This guide covers all configuration options for the RSS Feed Optimization project.

## Environment Variables

The project uses environment variables for configuration. Create a `.env` file in the project root to override default settings.

### Basic Configuration

```bash
# Application Settings
BLOG_TITLE="My RSS Feed Blog"
BLOG_DESCRIPTION="A blog powered by Bun and Cloudflare R2"
BLOG_URL="https://your-blog.com"
ADMIN_TOKEN="your-secret-admin-token"
PORT=3000
NODE_ENV="development"
```

### R2 Storage Configuration

```bash
# Cloudflare R2 Settings
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="your-blog-bucket"
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
```

### Performance Configuration

```bash
# Cache Settings
CACHE_TTL=300
MAX_CACHE_SIZE=100
ENABLE_CACHE=true

# DNS Optimization
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true
PREFETCH_COMMON_RSS=true
FETCH_TIMEOUT=30000
FETCH_RETRY_ATTEMPTS=3

# HTTP Settings
BUN_CONFIG_MAX_HTTP_REQUESTS=512
ENABLE_HTTPS=false
FORCE_HTTPS=false
```

### Monitoring & Profiling

```bash
# Performance Monitoring
ENABLE_PROFILING=false
ENABLE_METRICS=true
AUTO_PROFILE=false

# Logging
LOG_LEVEL="info"
DEBUG=false
```

### Security Configuration

```bash
# Security Settings
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN="*"
```

### Development Configuration

```bash
# Development Settings
WATCH_MODE=false
HOT_RELOAD=false
ENABLE_CONSOLE_LOGS=true
```

## Configuration Files

### Bun Configuration (`bunfig.toml`)

```toml
[serve]
hostname = "${CUSTOM_HOSTNAME}"
port = 3000

[fetch]
preconnect = [
  "https://feeds.feedburner.com",
  "https://medium.com",
  "https://rss.cnn.com",
  "https://feeds.bbci.co.uk",
  "https://news.ycombinator.com"
]
timeout = 30000
keepalive = true

[network]
maxHttpRequests = 512
dnsCacheTTL = 30000
preconnectTTL = 300000
```

### Package.json Scripts

```json
{
  "scripts": {
    "start": "bun run src/server.js",
    "start:prod": "bun --cpu-prof-md --heap-prof-md src/server.js",
    "profile": "bun --cpu-prof-md --heap-prof-md --sampling-interval=500 src/server.js",
    "dev": "bun --hot src/server.js",
    "test": "bun test",
    "benchmark": "bun run src/benchmark.js",
    "lint": "bun x @biomejs/biome check --apply src/"
  }
}
```

## Environment-Specific Configurations

### Development Environment

Create `.env.development`:

```bash
NODE_ENV=development
BLOG_URL=http://localhost:3000
DEBUG=true
LOG_LEVEL=debug
ENABLE_PROFILING=true
ENABLE_METRICS=true
```

### Production Environment

Create `.env.production`:

```bash
NODE_ENV=production
BLOG_URL=https://your-blog.com
ENABLE_PROFILING=false
ENABLE_METRICS=true
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
```

### Test Environment

Create `.env.test`:

```bash
NODE_ENV=test
BLOG_URL=http://localhost:3000
LOG_LEVEL=error
ENABLE_CONSOLE_LOGS=false
```

## Configuration Validation

The application validates all required environment variables on startup. Missing or invalid variables will cause the application to fail with clear error messages.

### Required Variables

- `BLOG_TITLE` - The title of your blog
- `BLOG_URL` - The base URL for your blog
- `ADMIN_TOKEN` - Token for admin operations

### Optional Variables

All other variables have sensible defaults and are optional.

## Advanced Configuration

### Custom Hostname Support

For custom domain support:

```bash
CUSTOM_HOSTNAME=your-domain.com
BLOG_URL=https://your-domain.com
```

### SSL/TLS Configuration

For HTTPS support:

```bash
ENABLE_HTTPS=true
FORCE_HTTPS=true
SSL_CERT_PATH=/path/to/your/cert.pem
SSL_KEY_PATH=/path/to/your/key.pem
```

### Database Configuration

For database integration:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blog
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=true
```

### External Services

For external service integration:

```bash
ANALYTICS_ID=GA-123456789
CDN_URL=https://cdn.your-domain.com
EMAIL_SERVICE_URL=https://api.sendgrid.com
EMAIL_API_KEY=your-email-api-key
```

## Configuration Examples

### Minimal Configuration

```bash
BLOG_TITLE="My Blog"
BLOG_URL="http://localhost:3000"
ADMIN_TOKEN="secret-token"
```

### Full Production Configuration

```bash
# Application
BLOG_TITLE="My Production Blog"
BLOG_DESCRIPTION="Blog powered by Bun and R2"
BLOG_URL="https://myblog.com"
ADMIN_TOKEN="super-secret-token"
PORT=3000
NODE_ENV=production

# R2 Storage
R2_ACCOUNT_ID="1234567890abcdef"
R2_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
R2_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
R2_BUCKET_NAME="my-blog-bucket"

# Performance
CACHE_TTL=600
MAX_CACHE_SIZE=200
ENABLE_CACHE=true
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true
FETCH_TIMEOUT=60000

# Security
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=200

# Monitoring
ENABLE_PROFILING=false
ENABLE_METRICS=true
LOG_LEVEL=info
```

## Environment Variable Precedence

Environment variables are loaded in this order (later values override earlier ones):

1. System environment variables
2. `.env` file
3. `.env.{NODE_ENV}` file (e.g., `.env.production`)
4. Command line arguments

## Configuration Best Practices

### 1. Security

- Never commit `.env` files to version control
- Use strong, unique tokens for production
- Rotate tokens regularly
- Use environment-specific configurations

### 2. Performance

- Adjust cache settings based on your traffic
- Configure DNS prefetching for your most common RSS feeds
- Set appropriate timeouts for your use case
- Monitor memory usage and adjust cache sizes

### 3. Development

- Use `.env.development` for local development
- Enable debugging and profiling in development
- Use hot reload for faster development cycles
- Set up proper error handling for development

### 4. Production

- Use `.env.production` for production settings
- Disable debugging and profiling in production
- Enable security features (CSP, HSTS, rate limiting)
- Set up proper logging and monitoring

## Troubleshooting Configuration

### Common Issues

#### 1. Missing Environment Variables

**Problem**: Application fails to start with "Missing required environment variable" error.

**Solution**: Check that all required variables are set in your `.env` file.

#### 2. R2 Connection Issues

**Problem**: Cannot connect to R2 storage.

**Solution**: Verify your R2 credentials and bucket name:
```bash
# Test R2 connection
bun run cli.js status
```

#### 3. Port Conflicts

**Problem**: Application fails to start due to port already in use.

**Solution**: Change the port in your `.env` file:
```bash
PORT=3001
```

#### 4. DNS Prefetching Not Working

**Problem**: DNS prefetching is not improving performance.

**Solution**: Ensure `ENABLE_DNS_PREFETCH=true` and check your Bun version supports `dns.prefetch()`.

### Getting Help

If you encounter configuration issues:

1. **Check Logs**: Look at application logs for specific error messages
2. **Validate Environment**: Use `bun run cli.js status` to check configuration
3. **Review Documentation**: Check this guide for correct configuration format
4. **Create an Issue**: [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)

## Configuration Reference

For a complete list of all configuration options, see the [Environment Variables Reference](../reference/environment-variables.md).
# Configuration Problems

This document provides comprehensive troubleshooting for configuration-related issues in the RSS Feed Optimization project.

## Overview

Configuration problems are among the most common issues in application deployment and operation. This guide covers identification, diagnosis, and resolution of configuration problems across all aspects of the application.

## Environment Variables Issues

### Missing Environment Variables

**Problem**: Application fails to start with "Missing environment variable" errors
**Symptoms:**
- Application startup fails
- Error messages about missing variables
- Configuration validation errors

**Diagnosis:**
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are set
echo $BLOG_TITLE
echo $R2_ACCOUNT_ID
echo $ADMIN_TOKEN

# Check all environment variables
env | grep -E "(BLOG|R2|ADMIN|CACHE|DNS)"

# Test configuration loading
bun run test:config
```

**Solutions:**
```bash
# Create .env file from template
cp .env.example .env

# Edit .env file with correct values
nano .env

# Verify .env file format
cat .env | head -20

# Source environment file
source .env

# Set environment variables manually
export BLOG_TITLE="My Blog"
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key"
export R2_SECRET_ACCESS_KEY="your-secret-key"
export R2_BUCKET_NAME="your-bucket-name"
export ADMIN_TOKEN="your-admin-token"
```

### Invalid Environment Variable Values

**Problem**: Environment variables are set but have invalid values
**Symptoms:**
- Configuration validation fails
- Application starts but behaves incorrectly
- R2 connection fails
- Cache not working

**Diagnosis:**
```bash
# Check environment variable values
echo "BLOG_TITLE: $BLOG_TITLE"
echo "R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:0:10}..."
echo "R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:0:10}..."
echo "R2_BUCKET_NAME: $R2_BUCKET_NAME"
echo "ADMIN_TOKEN: ${ADMIN_TOKEN:0:10}..."

# Validate specific formats
echo $R2_ACCOUNT_ID | grep -E '^[a-f0-9]{32}$' || echo "Invalid R2_ACCOUNT_ID format"
echo $R2_ACCESS_KEY_ID | grep -E '^[A-Z0-9]{20}$' || echo "Invalid R2_ACCESS_KEY_ID format"
echo $R2_BUCKET_NAME | grep -E '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' || echo "Invalid R2_BUCKET_NAME format"
```

**Solutions:**
```bash
# Fix R2_ACCOUNT_ID format (must be 32 hex characters)
export R2_ACCOUNT_ID="12345678901234567890123456789012"

# Fix R2_ACCESS_KEY_ID format (must be 20 uppercase alphanumeric)
export R2_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"

# Fix R2_SECRET_ACCESS_KEY format (must be 40 characters)
export R2_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Fix R2_BUCKET_NAME format (lowercase, alphanumeric, hyphens)
export R2_BUCKET_NAME="my-blog-bucket"

# Fix ADMIN_TOKEN (must be at least 16 characters)
export ADMIN_TOKEN="super-secret-admin-token-12345"

# Fix BLOG_URL format (must be valid URL)
export BLOG_URL="https://myblog.com"
```

### Environment Variable Scope Issues

**Problem**: Environment variables not available in certain contexts
**Symptoms:**
- Works in development but not production
- Works in shell but not in application
- Variables available in some processes but not others

**Diagnosis:**
```bash
# Check environment in different contexts
echo "Shell environment:"
echo $BLOG_TITLE

echo "Node.js environment:"
node -e "console.log(process.env.BLOG_TITLE)"

echo "Bun.js environment:"
bun -e "console.log(process.env.BLOG_TITLE)"

# Check if variables are exported
export -p | grep BLOG_TITLE
```

**Solutions:**
```bash
# Ensure variables are exported
export BLOG_TITLE="My Blog"
export R2_ACCOUNT_ID="your-account-id"

# Add to shell profile for persistence
echo 'export BLOG_TITLE="My Blog"' >> ~/.bashrc
echo 'export R2_ACCOUNT_ID="your-account-id"' >> ~/.bashrc

# Source profile
source ~/.bashrc

# For systemd services, create environment file
sudo mkdir -p /etc/myapp
echo 'BLOG_TITLE=My Blog' > /etc/myapp/environment
echo 'R2_ACCOUNT_ID=your-account-id' >> /etc/myapp/environment

# For Docker, use environment file
echo 'BLOG_TITLE=My Blog' > .env.docker
echo 'R2_ACCOUNT_ID=your-account-id' >> .env.docker
```

## R2 Storage Configuration Issues

### R2 Connection Problems

**Problem**: Cannot connect to R2 storage
**Symptoms:**
- R2 operations fail
- Connection timeout errors
- Authentication errors

**Diagnosis:**
```bash
# Test R2 connection
bun run test:r2

# Check R2 credentials
bun run r2:check

# Test specific R2 operations
bun run r2:test:upload
bun run r2:test:download
bun run r2:test:list

# Check R2 endpoint
curl -I "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
```

**Solutions:**
```javascript
// Fix R2 configuration
const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto'
};

// Test R2 connection
import { R2BlogStorage } from '../src/r2-client.js';

const storage = new R2BlogStorage(r2Config);

try {
  await storage.testConnection();
  console.log('R2 connection successful');
} catch (error) {
  console.error('R2 connection failed:', error.message);
}
```

### R2 Bucket Issues

**Problem**: R2 bucket not found or inaccessible
**Symptoms:**
- Bucket not found errors
- Permission denied errors
- Upload/download failures

**Diagnosis:**
```bash
# List available buckets
bun run r2:list-buckets

# Check bucket permissions
bun run r2:check-permissions

# Test bucket access
bun run r2:test-bucket --bucket-name your-bucket-name
```

**Solutions:**
```javascript
// Create bucket if it doesn't exist
async function ensureBucketExists() {
  const storage = new R2BlogStorage();
  
  try {
    await storage.listBuckets();
    console.log('Bucket exists and is accessible');
  } catch (error) {
    if (error.code === 'NoSuchBucket') {
      console.log('Bucket does not exist, creating...');
      await storage.createBucket(process.env.R2_BUCKET_NAME);
      console.log('Bucket created successfully');
    } else {
      throw error;
    }
  }
}

// Set bucket permissions
async function setBucketPermissions() {
  const storage = new R2BlogStorage();
  
  // Set public read access if needed
  await storage.setBucketPolicy(process.env.R2_BUCKET_NAME, {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${process.env.R2_BUCKET_NAME}/*`]
      }
    ]
  });
}
```

## Cache Configuration Issues

### Cache Not Working

**Problem**: Cache operations failing or not providing performance benefits
**Symptoms:**
- Low cache hit rate
- Cache operations timing out
- Cache memory usage issues

**Diagnosis:**
```bash
# Check cache configuration
curl http://localhost:3000/api/v1/admin/stats | jq '.data.stats.cache'

# Test cache operations
bun run test:cache

# Check cache performance
bun run cache:performance

# Monitor cache metrics
bun run cache:monitor
```

**Solutions:**
```javascript
// Fix cache configuration
import { Cache } from '../src/utils/cache.js';

const cache = new Cache({
  maxSize: 1000,        // Increase cache size
  ttl: 1200,           // Increase TTL to 20 minutes
  evictionPolicy: 'LRU' // Use LRU eviction
});

// Implement cache warming
async function warmCache() {
  const popularPosts = await getPopularPosts();
  for (const post of popularPosts) {
    const rss = await generateRSS([post]);
    cache.set(`rss_${post.id}`, rss);
  }
}

// Monitor cache performance
setInterval(() => {
  const stats = cache.getStats();
  console.log('Cache stats:', {
    size: stats.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hitRate
  });
  
  if (stats.hitRate < 0.5) {
    console.warn('Low cache hit rate, consider increasing cache size or TTL');
  }
}, 60000);
```

### Cache Memory Issues

**Problem**: Cache using too much memory or causing memory pressure
**Symptoms:**
- High memory usage
- Cache evictions happening too frequently
- Application memory pressure

**Diagnosis:**
```bash
# Check memory usage
curl http://localhost:3000/api/v1/admin/health | jq '.data.health.memory'

# Check cache memory usage
bun run cache:memory

# Monitor memory over time
bun run memory:monitor
```

**Solutions:**
```javascript
// Optimize cache memory usage
const cache = new Cache({
  maxSize: 500,         // Reduce cache size
  ttl: 600,            // Reduce TTL
  maxMemoryUsage: 100, // Limit memory usage in MB
  evictionPolicy: 'LRU'
});

// Implement memory-aware cache
class MemoryAwareCache extends Cache {
  constructor(options) {
    super(options);
    this.memoryThreshold = options.maxMemoryUsage * 1024 * 1024; // Convert to bytes
  }
  
  set(key, value) {
    const currentMemory = this.getMemoryUsage();
    if (currentMemory > this.memoryThreshold) {
      // Force eviction if memory threshold exceeded
      this.evict(Math.floor(this.size * 0.2)); // Evict 20% of items
    }
    
    return super.set(key, value);
  }
  
  getMemoryUsage() {
    // Estimate memory usage
    return this.size * 1024; // Rough estimate
  }
}
```

## DNS Configuration Issues

### DNS Prefetch Not Working

**Problem**: DNS prefetch operations failing or not providing performance benefits
**Symptoms:**
- DNS lookup times still high
- DNS cache hit rate low
- Network requests slow

**Diagnosis:**
```bash
# Test DNS prefetch
bun run test:dns

# Check DNS cache hit rate
curl http://localhost:3000/api/v1/admin/stats | jq '.data.stats.dns'

# Monitor DNS performance
bun run dns:monitor

# Test specific hosts
bun run dns:test --host feeds.feedburner.com
```

**Solutions:**
```javascript
// Fix DNS configuration
import { DNSOptimizer } from '../src/utils/dns-optimizer.js';

const dns = new DNSOptimizer({
  cacheSize: 200,      // Increase cache size
  prefetchEnabled: true,
  prefetchHosts: [
    'feeds.feedburner.com',
    'medium.com',
    'dev.to',
    'github.com'
  ]
});

// Prefetch DNS for frequently accessed hosts
await dns.prefetch([
  'feeds.feedburner.com',
  'medium.com',
  'dev.to',
  'github.com'
]);

// Monitor DNS performance
setInterval(() => {
  const stats = dns.getStats();
  console.log('DNS stats:', {
    cacheSize: stats.cacheSize,
    totalLookups: stats.totalLookups,
    cacheHitRate: stats.cacheHitRate
  });
  
  if (stats.cacheHitRate < 0.8) {
    console.warn('Low DNS cache hit rate, consider increasing cache size or prefetching more hosts');
  }
}, 60000);
```

### DNS Resolution Failures

**Problem**: DNS resolution failing for specific hosts
**Symptoms:**
- DNS lookup errors
- Network connectivity issues
- Timeout errors

**Diagnosis:**
```bash
# Test DNS resolution
nslookup feeds.feedburner.com
dig feeds.feedburner.com

# Check DNS servers
cat /etc/resolv.conf

# Test with different DNS servers
nslookup feeds.feedburner.com 8.8.8.8
```

**Solutions:**
```javascript
// Implement DNS fallback
class DNSWithFallback extends DNSOptimizer {
  constructor(options) {
    super(options);
    this.fallbackDNS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
  }
  
  async lookup(host) {
    try {
      return await super.lookup(host);
    } catch (error) {
      console.warn(`Primary DNS failed for ${host}, trying fallback...`);
      
      for (const dnsServer of this.fallbackDNS) {
        try {
          const result = await this.lookupWithServer(host, dnsServer);
          console.log(`Fallback DNS successful for ${host} using ${dnsServer}`);
          return result;
        } catch (fallbackError) {
          console.warn(`Fallback DNS ${dnsServer} failed for ${host}`);
        }
      }
      
      throw new Error(`All DNS servers failed for ${host}`);
    }
  }
  
  async lookupWithServer(host, dnsServer) {
    // Implementation using specific DNS server
    // This would require a DNS library that supports custom servers
  }
}
```

## Performance Configuration Issues

### Performance Monitoring Not Working

**Problem**: Performance monitoring and metrics not working
**Symptoms:**
- Metrics endpoint returns errors
- Performance data not available
- Monitoring alerts not firing

**Diagnosis:**
```bash
# Check metrics endpoint
curl http://localhost:3000/api/v1/metrics

# Test performance monitoring
bun run test:performance

# Check monitoring configuration
bun run monitor:config

# Verify metrics collection
bun run metrics:collect
```

**Solutions:**
```javascript
// Fix performance monitoring configuration
import { Metrics } from '../src/utils/metrics.js';
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';

// Initialize metrics collection
const metrics = new Metrics({
  interval: 30000, // 30 seconds
  enabled: true
});

// Initialize performance monitoring
const monitor = new PerformanceMonitor({
  interval: 60000, // 1 minute
  thresholds: {
    responseTime: 200,
    memoryUsage: 80,
    errorRate: 0.01
  },
  alertCallback: (alert) => {
    console.error('Performance alert:', alert);
    // Send to monitoring service
    sendAlert(alert);
  }
});

// Start monitoring
metrics.start();
monitor.start();

// Custom metrics collection
setInterval(() => {
  // Collect custom metrics
  const customMetrics = {
    rssGenerationTime: getAverageRSSGenerationTime(),
    cacheHitRate: getCacheHitRate(),
    dnsCacheHitRate: getDNSCacheHitRate()
  };
  
  Object.entries(customMetrics).forEach(([key, value]) => {
    metrics.setGauge(key, value);
  });
}, 60000);
```

### Rate Limiting Configuration Issues

**Problem**: Rate limiting not working or too restrictive
**Symptoms:**
- Rate limit errors when not expected
- No rate limiting when expected
- Incorrect rate limit thresholds

**Diagnosis:**
```bash
# Test rate limiting
bun run test:rate-limit

# Check rate limit configuration
bun run rate-limit:config

# Monitor rate limit usage
bun run rate-limit:monitor

# Test with different request rates
bun run rate-limit:test --rate 100
```

**Solutions:**
```javascript
// Fix rate limiting configuration
import { RateLimiter } from '../src/middleware/rate-limit.js';

const rateLimiter = new RateLimiter({
  windowMs: 600000, // 10 minutes
  maxRequests: 1000, // 1000 requests per window
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Configure different limits for different endpoints
const rateLimitConfig = {
  default: {
    windowMs: 600000, // 10 minutes
    maxRequests: 1000
  },
  rss: {
    windowMs: 300000, // 5 minutes
    maxRequests: 500
  },
  admin: {
    windowMs: 600000, // 10 minutes
    maxRequests: 100
  }
};

// Apply rate limiting middleware
app.use('/api/v1/posts', rateLimiter.createMiddleware(rateLimitConfig.default));
app.use('/feed.xml', rateLimiter.createMiddleware(rateLimitConfig.rss));
app.use('/api/v1/admin', rateLimiter.createMiddleware(rateLimitConfig.admin));
```

## Security Configuration Issues

### Authentication Not Working

**Problem**: Admin authentication failing or not working properly
**Symptoms:**
- Admin endpoints accessible without authentication
- Valid tokens being rejected
- Authentication errors

**Diagnosis:**
```bash
# Test authentication
curl -H "Authorization: Bearer your-admin-token" http://localhost:3000/api/v1/admin/health

# Check admin token
echo $ADMIN_TOKEN

# Test authentication middleware
bun run test:auth

# Check authentication configuration
bun run auth:config
```

**Solutions:**
```javascript
// Fix authentication configuration
import { authenticateAdmin } from '../src/middleware/auth.js';

// Verify admin token format
function validateAdminToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Admin token must be a non-empty string');
  }
  
  if (token.length < 16) {
    throw new Error('Admin token must be at least 16 characters long');
  }
  
  return true;
}

// Enhanced authentication middleware
function enhancedAuthenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_001',
        type: 'AuthenticationError',
        message: 'Missing admin token',
        statusCode: 401
      }
    });
  }
  
  try {
    validateAdminToken(token);
    
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_002',
          type: 'AuthenticationError',
          message: 'Invalid admin token',
          statusCode: 401
        }
      });
    }
    
    req.admin = { authenticated: true };
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'AUTH_003',
        type: 'ValidationError',
        message: error.message,
        statusCode: 400
      }
    });
  }
}

// Apply enhanced authentication
app.use('/api/v1/admin', enhancedAuthenticateAdmin);
```

### CORS Configuration Issues

**Problem**: CORS configuration not working properly
**Symptoms:**
- CORS errors in browser
- Cross-origin requests failing
- Incorrect CORS headers

**Diagnosis:**
```bash
# Test CORS headers
curl -I -H "Origin: https://example.com" http://localhost:3000/api/v1/posts

# Check CORS configuration
bun run cors:config

# Test cross-origin requests
bun run test:cors
```

**Solutions:**
```javascript
// Fix CORS configuration
import { cors } from '../src/middleware/cors.js';

const corsConfig = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsConfig));

// Dynamic CORS configuration
function dynamicCors(req, res, next) {
  const origin = req.get('Origin');
  
  // Allow requests from localhost and configured origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}

// Apply dynamic CORS
app.use(dynamicCors);
```

## Configuration Validation

### Configuration Validation Script

```javascript
// Configuration validation script
import { validateConfig } from '../src/config/validator.js';

const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT),
  BLOG_TITLE: process.env.BLOG_TITLE,
  BLOG_URL: process.env.BLOG_URL,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  ENABLE_CACHE: process.env.ENABLE_CACHE === 'true',
  CACHE_TTL: parseInt(process.env.CACHE_TTL),
  ENABLE_DNS_PREFETCH: process.env.ENABLE_DNS_PREFETCH === 'true',
  ENABLE_PRECONNECT: process.env.ENABLE_PRECONNECT === 'true'
};

const validationResult = validateConfig(config);

if (!validationResult.isValid) {
  console.error('Configuration validation failed:');
  validationResult.errors.forEach(error => {
    console.error(`- ${error.field}: ${error.message}`);
  });
  process.exit(1);
}

console.log('Configuration is valid');
console.log('Configuration summary:', {
  env: config.NODE_ENV,
  port: config.PORT,
  blogTitle: config.BLOG_TITLE,
  r2Bucket: config.R2_BUCKET_NAME,
  cacheEnabled: config.ENABLE_CACHE,
  dnsPrefetchEnabled: config.ENABLE_DNS_PREFETCH
});
```

### Environment Variable Template

```bash
# .env.example - Template for environment variables
# Copy this file to .env and fill in your values

# Application Configuration
NODE_ENV=development
PORT=3000
BLOG_TITLE="Your Blog Title"
BLOG_URL=https://your-blog.com
ADMIN_TOKEN=your-super-secret-admin-token

# R2 Storage Configuration
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-blog-bucket-name

# Performance Configuration
ENABLE_CACHE=true
CACHE_TTL=600
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true

# Security Configuration
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true

# Monitoring Configuration
ENABLE_METRICS=true
LOG_LEVEL=info
```

This comprehensive configuration troubleshooting guide provides the tools and techniques needed to identify, diagnose, and resolve configuration issues in the RSS Feed Optimization project.
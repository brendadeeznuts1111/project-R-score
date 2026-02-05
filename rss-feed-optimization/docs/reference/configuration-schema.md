# Configuration Schema

This document provides the complete configuration schema for the RSS Feed Optimization project, including validation rules and examples.

## Environment Variables Schema

### Application Configuration

```typescript
interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  BLOG_TITLE: string;
  BLOG_URL: string;
  ADMIN_TOKEN: string;
  CORS_ORIGIN: string | string[];
  CORS_CREDENTIALS: boolean;
}
```

**Validation Rules:**
- `NODE_ENV`: Must be one of 'development', 'production', 'test'
- `PORT`: Must be a valid port number (1-65535)
- `BLOG_TITLE`: Must be 3-100 characters
- `BLOG_URL`: Must be a valid URL
- `ADMIN_TOKEN`: Must be at least 16 characters
- `CORS_ORIGIN`: Can be string or comma-separated list
- `CORS_CREDENTIALS`: Must be 'true' or 'false'

**Example:**
```bash
NODE_ENV=production
PORT=3000
BLOG_TITLE="My Awesome Blog"
BLOG_URL=https://myblog.com
ADMIN_TOKEN=super-secret-admin-token-12345
CORS_ORIGIN=https://myblog.com,https://admin.myblog.com
CORS_CREDENTIALS=true
```

### R2 Storage Configuration

```typescript
interface R2Config {
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_ENDPOINT?: string;
  R2_REGION?: string;
}
```

**Validation Rules:**
- `R2_ACCOUNT_ID`: Must be 32 characters (Cloudflare account ID format)
- `R2_ACCESS_KEY_ID`: Must be 20 characters (AWS access key format)
- `R2_SECRET_ACCESS_KEY`: Must be 40 characters (AWS secret key format)
- `R2_BUCKET_NAME`: Must be 3-63 characters, lowercase, alphanumeric and hyphens
- `R2_ENDPOINT`: Optional, defaults to Cloudflare R2 endpoint
- `R2_REGION`: Optional, defaults to 'auto'

**Example:**
```bash
R2_ACCOUNT_ID=12345678901234567890123456789012
R2_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
R2_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
R2_BUCKET_NAME=my-blog-bucket
R2_ENDPOINT=https://12345678901234567890123456789012.r2.cloudflarestorage.com
R2_REGION=auto
```

### Performance Configuration

```typescript
interface PerformanceConfig {
  ENABLE_CACHE: boolean;
  CACHE_TTL: number;
  CACHE_MAX_SIZE: number;
  ENABLE_DNS_PREFETCH: boolean;
  ENABLE_PRECONNECT: boolean;
  DNS_CACHE_SIZE: number;
  CONNECTION_POOL_SIZE: number;
}
```

**Validation Rules:**
- `ENABLE_CACHE`: Must be 'true' or 'false'
- `CACHE_TTL`: Must be 60-86400 seconds (1 minute to 24 hours)
- `CACHE_MAX_SIZE`: Must be 100-10000 items
- `ENABLE_DNS_PREFETCH`: Must be 'true' or 'false'
- `ENABLE_PRECONNECT`: Must be 'true' or 'false'
- `DNS_CACHE_SIZE`: Must be 10-1000 items
- `CONNECTION_POOL_SIZE`: Must be 10-1000 connections

**Example:**
```bash
ENABLE_CACHE=true
CACHE_TTL=600
CACHE_MAX_SIZE=500
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true
DNS_CACHE_SIZE=100
CONNECTION_POOL_SIZE=200
```

### Security Configuration

```typescript
interface SecurityConfig {
  ENABLE_CSP: boolean;
  ENABLE_HSTS: boolean;
  ENABLE_RATE_LIMITING: boolean;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  ENABLE_XSS_PROTECTION: boolean;
  ENABLE_CONTENT_TYPE_SNIFFING: boolean;
}
```

**Validation Rules:**
- `ENABLE_CSP`: Must be 'true' or 'false'
- `ENABLE_HSTS`: Must be 'true' or 'false'
- `ENABLE_RATE_LIMITING`: Must be 'true' or 'false'
- `RATE_LIMIT_WINDOW`: Must be 60-3600 seconds (1 minute to 1 hour)
- `RATE_LIMIT_MAX_REQUESTS`: Must be 10-1000 requests
- `ENABLE_XSS_PROTECTION`: Must be 'true' or 'false'
- `ENABLE_CONTENT_TYPE_SNIFFING`: Must be 'true' or 'false'

**Example:**
```bash
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=600
RATE_LIMIT_MAX_REQUESTS=200
ENABLE_XSS_PROTECTION=true
ENABLE_CONTENT_TYPE_SNIFFING=false
```

### Monitoring Configuration

```typescript
interface MonitoringConfig {
  ENABLE_METRICS: boolean;
  METRICS_INTERVAL: number;
  ENABLE_HEALTH_CHECKS: boolean;
  HEALTH_CHECK_INTERVAL: number;
  ENABLE_ERROR_TRACKING: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}
```

**Validation Rules:**
- `ENABLE_METRICS`: Must be 'true' or 'false'
- `METRICS_INTERVAL`: Must be 10-3600 seconds
- `ENABLE_HEALTH_CHECKS`: Must be 'true' or 'false'
- `HEALTH_CHECK_INTERVAL`: Must be 10-3600 seconds
- `ENABLE_ERROR_TRACKING`: Must be 'true' or 'false'
- `LOG_LEVEL`: Must be one of 'debug', 'info', 'warn', 'error'

**Example:**
```bash
ENABLE_METRICS=true
METRICS_INTERVAL=60
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=300
ENABLE_ERROR_TRACKING=true
LOG_LEVEL=info
```

## Configuration Validation

### Validation Function

```javascript
import { validateConfig } from '../src/config/validator.js';

// Validate configuration
const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT),
  BLOG_TITLE: process.env.BLOG_TITLE,
  // ... other config
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
```

### Validation Rules

```javascript
const validationRules = {
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    required: true
  },
  PORT: {
    type: 'number',
    min: 1,
    max: 65535,
    required: true
  },
  BLOG_TITLE: {
    type: 'string',
    minLength: 3,
    maxLength: 100,
    required: true
  },
  BLOG_URL: {
    type: 'string',
    format: 'url',
    required: true
  },
  ADMIN_TOKEN: {
    type: 'string',
    minLength: 16,
    required: true
  },
  R2_ACCOUNT_ID: {
    type: 'string',
    pattern: /^[a-f0-9]{32}$/,
    required: true
  },
  R2_ACCESS_KEY_ID: {
    type: 'string',
    pattern: /^[A-Z0-9]{20}$/,
    required: true
  },
  R2_SECRET_ACCESS_KEY: {
    type: 'string',
    pattern: /^[A-Za-z0-9/+=]{40}$/,
    required: true
  },
  R2_BUCKET_NAME: {
    type: 'string',
    pattern: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
    required: true
  },
  CACHE_TTL: {
    type: 'number',
    min: 60,
    max: 86400,
    required: false
  },
  CACHE_MAX_SIZE: {
    type: 'number',
    min: 100,
    max: 10000,
    required: false
  }
};
```

## Configuration Examples

### Development Configuration

```bash
# .env.development
NODE_ENV=development
PORT=3000
BLOG_TITLE="Development Blog"
BLOG_URL=http://localhost:3000
ADMIN_TOKEN=dev-token-12345

# R2 Storage (use test bucket)
R2_ACCOUNT_ID=test-account-id-12345678901234567890123456789012
R2_ACCESS_KEY_ID=TESTACCESSKEYID12345
R2_SECRET_ACCESS_KEY=TestSecretAccessKey1234567890123456789012345678901234567890
R2_BUCKET_NAME=dev-blog-bucket

# Performance (disable for development)
ENABLE_CACHE=false
CACHE_TTL=300
ENABLE_DNS_PREFETCH=false
ENABLE_PRECONNECT=false

# Security (relaxed for development)
ENABLE_CSP=false
ENABLE_HSTS=false
ENABLE_RATE_LIMITING=false

# Monitoring
ENABLE_METRICS=true
METRICS_INTERVAL=30
ENABLE_HEALTH_CHECKS=true
LOG_LEVEL=debug
```

### Production Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3000
BLOG_TITLE="My Production Blog"
BLOG_URL=https://myblog.com
ADMIN_TOKEN=super-secret-production-token-12345

# R2 Storage
R2_ACCOUNT_ID=12345678901234567890123456789012
R2_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
R2_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
R2_BUCKET_NAME=production-blog-bucket

# Performance
ENABLE_CACHE=true
CACHE_TTL=600
CACHE_MAX_SIZE=500
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true
DNS_CACHE_SIZE=100
CONNECTION_POOL_SIZE=200

# Security
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=600
RATE_LIMIT_MAX_REQUESTS=200
ENABLE_XSS_PROTECTION=true
ENABLE_CONTENT_TYPE_SNIFFING=false

# Monitoring
ENABLE_METRICS=true
METRICS_INTERVAL=60
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=300
ENABLE_ERROR_TRACKING=true
LOG_LEVEL=info
```

### Testing Configuration

```bash
# .env.test
NODE_ENV=test
PORT=3001
BLOG_TITLE="Test Blog"
BLOG_URL=http://localhost:3001
ADMIN_TOKEN=test-token-12345

# R2 Storage (use test bucket)
R2_ACCOUNT_ID=test-account-id-12345678901234567890123456789012
R2_ACCESS_KEY_ID=TESTACCESSKEYID12345
R2_SECRET_ACCESS_KEY=TestSecretAccessKey1234567890123456789012345678901234567890
R2_BUCKET_NAME=test-blog-bucket

# Performance (minimal for tests)
ENABLE_CACHE=false
CACHE_TTL=60
ENABLE_DNS_PREFETCH=false
ENABLE_PRECONNECT=false

# Security (minimal for tests)
ENABLE_CSP=false
ENABLE_HSTS=false
ENABLE_RATE_LIMITING=false

# Monitoring
ENABLE_METRICS=false
LOG_LEVEL=error
```

## Configuration Loading

### Configuration Loader

```javascript
import { loadConfig } from '../src/config/index.js';

// Load configuration
const config = loadConfig();

console.log('Loaded configuration:', {
  env: config.NODE_ENV,
  port: config.PORT,
  blogTitle: config.BLOG_TITLE,
  r2Bucket: config.R2_BUCKET_NAME,
  cacheEnabled: config.ENABLE_CACHE
});

// Use configuration
const server = Bun.serve({
  port: config.PORT,
  fetch: app.fetch
});
```

### Configuration Priority

Configuration values are loaded in the following priority order (highest to lowest):

1. **Environment Variables**: Direct environment variable values
2. **Environment File**: Values from `.env` file
3. **Default Values**: Built-in default values

### Configuration Types

```typescript
interface FullConfig {
  // Application
  app: {
    env: string;
    port: number;
    title: string;
    url: string;
    adminToken: string;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
  };

  // R2 Storage
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    endpoint: string;
    region: string;
  };

  // Performance
  performance: {
    cache: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
    dns: {
      enabled: boolean;
      cacheSize: number;
    };
    connection: {
      enabled: boolean;
      poolSize: number;
    };
  };

  // Security
  security: {
    csp: boolean;
    hsts: boolean;
    rateLimiting: {
      enabled: boolean;
      window: number;
      maxRequests: number;
    };
    xssProtection: boolean;
    contentTypeSniffing: boolean;
  };

  // Monitoring
  monitoring: {
    metrics: {
      enabled: boolean;
      interval: number;
    };
    healthChecks: {
      enabled: boolean;
      interval: number;
    };
    errorTracking: boolean;
    logLevel: string;
  };
}
```

## Configuration Validation Examples

### Valid Configuration

```javascript
const validConfig = {
  NODE_ENV: 'production',
  PORT: 3000,
  BLOG_TITLE: 'My Blog',
  BLOG_URL: 'https://myblog.com',
  ADMIN_TOKEN: 'super-secret-token-12345',
  R2_ACCOUNT_ID: '12345678901234567890123456789012',
  R2_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
  R2_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  R2_BUCKET_NAME: 'my-blog-bucket',
  ENABLE_CACHE: true,
  CACHE_TTL: 600,
  CACHE_MAX_SIZE: 500
};

const result = validateConfig(validConfig);
console.log(result.isValid); // true
```

### Invalid Configuration

```javascript
const invalidConfig = {
  NODE_ENV: 'invalid',
  PORT: 99999, // Invalid port
  BLOG_TITLE: 'A', // Too short
  BLOG_URL: 'not-a-url',
  ADMIN_TOKEN: 'short', // Too short
  R2_ACCOUNT_ID: 'invalid-id', // Wrong format
  R2_ACCESS_KEY_ID: 'invalid-key', // Wrong format
  R2_SECRET_ACCESS_KEY: 'invalid-secret', // Wrong format
  R2_BUCKET_NAME: 'INVALID-BUCKET', // Wrong format
  ENABLE_CACHE: 'yes', // Should be boolean
  CACHE_TTL: 30, // Too low
  CACHE_MAX_SIZE: 50000 // Too high
};

const result = validateConfig(invalidConfig);
console.log(result.isValid); // false
console.log(result.errors);
// [
//   { field: 'NODE_ENV', message: 'Invalid environment' },
//   { field: 'PORT', message: 'Port must be between 1 and 65535' },
//   { field: 'BLOG_TITLE', message: 'Blog title must be 3-100 characters' },
//   { field: 'BLOG_URL', message: 'Invalid URL format' },
//   ...
// ]
```

This configuration schema provides comprehensive validation and examples for all configuration options in the RSS Feed Optimization project.
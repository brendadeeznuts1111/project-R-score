# Error Codes

This document provides comprehensive error code reference and handling for the RSS Feed Optimization project.

## HTTP Status Codes

### 2xx Success

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content to return |

### 4xx Client Errors

| Code | Name | Description |
|------|------|-------------|
| 400 | Bad Request | Invalid input data or malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | Resource conflict (e.g., duplicate slug) |
| 422 | Unprocessable Entity | Valid request format but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors

| Code | Name | Description |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream server error |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream server timeout |

## Application Error Codes

### Blog Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| BLOG_001 | ValidationError | "Title is required" | Post title is missing |
| BLOG_002 | ValidationError | "Title must be 3-100 characters" | Title length validation failed |
| BLOG_003 | ValidationError | "Slug is required" | Post slug is missing |
| BLOG_004 | ValidationError | "Slug must be 3-100 characters" | Slug length validation failed |
| BLOG_005 | ValidationError | "Slug format invalid" | Slug contains invalid characters |
| BLOG_006 | ValidationError | "Content is required" | Post content is missing |
| BLOG_007 | ValidationError | "Content must be 10+ characters" | Content too short |
| BLOG_008 | ValidationError | "Author is required" | Author name is missing |
| BLOG_009 | ValidationError | "Author must be 2+ characters" | Author name too short |
| BLOG_010 | ValidationError | "Tags must be array" | Tags field is not an array |
| BLOG_011 | ValidationError | "Tags must be strings" | Tags array contains non-string values |
| BLOG_012 | ValidationError | "Date format invalid" | Date is not in ISO format |
| BLOG_013 | NotFoundError | "Post not found" | Requested post does not exist |
| BLOG_014 | ConflictError | "Slug already exists" | Post slug is already in use |
| BLOG_015 | ValidationError | "Invalid pagination parameters" | Page or limit parameters invalid |
| BLOG_016 | ValidationError | "Invalid sort parameters" | Sort field or order invalid |

### R2 Storage Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| R2_001 | ConnectionError | "R2 connection failed" | Cannot connect to R2 storage |
| R2_002 | AuthenticationError | "R2 authentication failed" | Invalid R2 credentials |
| R2_003 | BucketError | "R2 bucket not found" | Specified bucket does not exist |
| R2_004 | PermissionError | "R2 access denied" | Insufficient permissions for R2 operation |
| R2_005 | UploadError | "R2 upload failed" | Failed to upload file to R2 |
| R2_006 | DownloadError | "R2 download failed" | Failed to download file from R2 |
| R2_007 | DeleteError | "R2 delete failed" | Failed to delete file from R2 |
| R2_008 | ListError | "R2 list failed" | Failed to list files in R2 bucket |
| R2_009 | FileNotFoundError | "R2 file not found" | Requested file does not exist in R2 |
| R2_010 | FileSizeError | "File too large" | File exceeds R2 size limits |
| R2_011 | NetworkError | "R2 network error" | Network connectivity issues with R2 |
| R2_012 | TimeoutError | "R2 operation timeout" | R2 operation exceeded timeout |

### Cache Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| CACHE_001 | CacheError | "Cache initialization failed" | Cache system failed to initialize |
| CACHE_002 | CacheFullError | "Cache capacity exceeded" | Cache reached maximum capacity |
| CACHE_003 | CacheCorruptionError | "Cache data corrupted" | Cache data integrity check failed |
| CACHE_004 | CacheTimeoutError | "Cache operation timeout" | Cache operation exceeded timeout |
| CACHE_005 | CacheConnectionError | "Cache connection failed" | Cannot connect to cache system |

### DNS Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| DNS_001 | DNSLookupError | "DNS lookup failed" | DNS resolution failed for hostname |
| DNS_002 | DNSConnectionError | "DNS connection failed" | Cannot connect to DNS server |
| DNS_003 | DNSRateLimitError | "DNS rate limit exceeded" | DNS query rate limit exceeded |
| DNS_004 | DNSCacheError | "DNS cache error" | DNS cache operation failed |
| DNS_005 | DNSPrefetchError | "DNS prefetch failed" | DNS prefetch operation failed |

### Connection Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| CONN_001 | ConnectionPoolError | "Connection pool exhausted" | All connections in use |
| CONN_002 | ConnectionTimeoutError | "Connection timeout" | Connection establishment timeout |
| CONN_003 | ConnectionRefusedError | "Connection refused" | Remote server refused connection |
| CONN_004 | ConnectionResetError | "Connection reset" | Remote server reset connection |
| CONN_005 | TLSHandshakeError | "TLS handshake failed" | SSL/TLS handshake failed |
| CONN_006 | NetworkUnreachableError | "Network unreachable" | Network path to host unavailable |

### Security Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| SEC_001 | AuthenticationError | "Invalid admin token" | Admin token authentication failed |
| SEC_002 | AuthorizationError | "Insufficient permissions" | User lacks required permissions |
| SEC_003 | CSRFError | "CSRF token invalid" | CSRF protection token validation failed |
| SEC_004 | XSSAttackError | "XSS attack detected" | Malicious script content detected |
| SEC_005 | InjectionError | "Code injection detected" | SQL/NoSQL injection attempt detected |
| SEC_006 | RateLimitError | "Rate limit exceeded" | Request rate limit exceeded |
| SEC_007 | IPBlockError | "IP address blocked" | Request from blocked IP address |
| SEC_008 | InvalidTokenError | "Token format invalid" | Authentication token format incorrect |

### Performance Errors

| Code | Type | Message | Description |
|------|------|---------|-------------|
| PERF_001 | PerformanceError | "Operation too slow" | Operation exceeded performance threshold |
| PERF_002 | MemoryError | "Memory limit exceeded" | Application exceeded memory limits |
| PERF_003 | TimeoutError | "Operation timeout" | Operation exceeded timeout limit |
| PERF_004 | LoadError | "Server overloaded" | Server under excessive load |
| PERF_005 | ResourceError | "Resource unavailable" | Required system resource unavailable |

## Error Response Format

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "BLOG_001",
    "type": "ValidationError",
    "message": "Title is required",
    "statusCode": 400,
    "timestamp": "2025-01-27T10:30:00.000Z",
    "details": {
      "field": "title",
      "value": "",
      "constraints": {
        "minLength": 3,
        "maxLength": 100
      }
    },
    "stack": [
      "at validatePost (/src/utils/validation.js:25:10)",
      "at createPost (/src/services/posts.js:15:20)"
    ]
  }
}
```

### Client Error Response

```json
{
  "success": false,
  "error": {
    "code": "BLOG_013",
    "type": "NotFoundError",
    "message": "Post not found",
    "statusCode": 404,
    "timestamp": "2025-01-27T10:30:00.000Z",
    "details": {
      "slug": "non-existent-post",
      "availablePosts": ["existing-post-1", "existing-post-2"]
    }
  }
}
```

### Server Error Response

```json
{
  "success": false,
  "error": {
    "code": "R2_001",
    "type": "ConnectionError",
    "message": "R2 connection failed",
    "statusCode": 500,
    "timestamp": "2025-01-27T10:30:00.000Z",
    "details": {
      "accountId": "12345678901234567890123456789012",
      "bucketName": "my-blog-bucket",
      "endpoint": "https://12345678901234567890123456789012.r2.cloudflarestorage.com"
    }
  }
}
```

## Error Handling Examples

### Client-Side Error Handling

```javascript
async function createPost(postData) {
  try {
    const response = await fetch('/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-admin-token'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error types
      switch (error.error.code) {
        case 'BLOG_001':
        case 'BLOG_002':
        case 'BLOG_003':
          // Validation errors - show to user
          showValidationErrors(error.error.details);
          break;
        case 'BLOG_014':
          // Conflict error - slug already exists
          showSlugConflictError();
          break;
        case 'SEC_001':
          // Authentication error - redirect to login
          redirectToLogin();
          break;
        case 'R2_001':
        case 'R2_002':
          // R2 errors - show system error
          showSystemError('Storage service unavailable');
          break;
        default:
          // Generic error
          showGenericError(error.error.message);
      }
      
      return null;
    }

    const result = await response.json();
    return result.data.post;
  } catch (error) {
    // Network or unexpected errors
    console.error('Unexpected error:', error);
    showNetworkError();
    return null;
  }
}
```

### Server-Side Error Handling

```javascript
import { 
  BlogError, 
  NotFoundError, 
  ValidationError,
  errorHandler 
} from '../src/utils/errors.js';

// Custom error handling middleware
app.use((error, req, res, next) => {
  console.error('Error occurred:', error);
  
  // Log error details
  logger.error('Request failed', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: error.code,
        type: 'ValidationError',
        message: error.message,
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: error.details
      }
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: {
        code: error.code,
        type: 'NotFoundError',
        message: error.message,
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: {
      code: 'SYS_001',
      type: 'InternalServerError',
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  });
});
```

### Error Recovery Strategies

```javascript
// Retry with exponential backoff
async function retryWithBackoff(operation, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (error.code === 'R2_001' || error.code === 'CONN_002') {
        // Retry connection errors with backoff
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (error.code === 'PERF_001' || error.code === 'PERF_003') {
        // Performance errors - reduce load
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      // Don't retry other error types
      break;
    }
  }
  
  throw lastError;
}

// Circuit breaker pattern
class CircuitBreaker {
  constructor() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

## Error Monitoring

### Error Tracking

```javascript
// Error tracking middleware
app.use((error, req, res, next) => {
  // Track error metrics
  metrics.increment('errors.total');
  metrics.increment(`errors.${error.type}`);
  
  // Track error rate
  const errorRate = metrics.getGauge('error_rate');
  if (errorRate > 0.05) { // 5% error rate threshold
    alerting.sendAlert('High error rate detected', {
      rate: errorRate,
      errors: metrics.getCounter('errors.total')
    });
  }
  
  next(error);
});
```

### Error Logging

```javascript
// Structured error logging
const logger = {
  error: (message, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      meta
    }));
  }
};

// Error context logging
function logErrorWithContext(error, context) {
  logger.error('Error with context', {
    error: {
      message: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack
    },
    context
  });
}
```

This comprehensive error code reference provides all the information needed to handle errors properly in the RSS Feed Optimization project.
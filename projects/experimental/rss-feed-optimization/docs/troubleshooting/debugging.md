# Debugging Guide

This document provides comprehensive debugging procedures and techniques for troubleshooting issues in the RSS Feed Optimization project.

## Overview

Debugging is a systematic process of identifying and resolving issues in the application. This guide covers various debugging techniques, tools, and procedures to help you diagnose and fix problems efficiently.

## Debugging Tools and Techniques

### 1. Logging and Debug Output

**Enable Debug Logging:**
```bash
# Set debug environment variable
export DEBUG=true
export LOG_LEVEL=debug

# Start application with debug mode
DEBUG=true bun run dev

# View debug logs
bun run logs --debug
```

**Structured Logging:**
```javascript
import { logger } from '../src/utils/logger.js';

// Debug logging examples
logger.debug('Debug message', { data: 'value' });
logger.info('Information message', { user: 'john' });
logger.warn('Warning message', { reason: 'timeout' });
logger.error('Error message', { error: error.stack });

// Contextual logging
function processPost(post) {
  logger.debug('Processing post', { 
    postId: post.id, 
    title: post.title 
  });
  
  try {
    // Process post
    const result = await processPostData(post);
    logger.debug('Post processed successfully', { 
      postId: post.id, 
      duration: Date.now() - startTime 
    });
    return result;
  } catch (error) {
    logger.error('Post processing failed', { 
      postId: post.id, 
      error: error.message 
    });
    throw error;
  }
}
```

### 2. Error Tracking and Monitoring

**Error Tracking Setup:**
```javascript
import { errorTracker } from '../src/utils/error-tracker.js';

// Track errors
app.use((error, req, res, next) => {
  errorTracker.track(error, {
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next(error);
});

// Custom error tracking
try {
  await riskyOperation();
} catch (error) {
  errorTracker.track(error, {
    operation: 'risky_operation',
    context: { userId: user.id }
  });
  throw error;
}
```

**Performance Monitoring:**
```javascript
import { performanceMonitor } from '../src/utils/performance-monitor.js';

// Monitor performance
const monitor = performanceMonitor.start('rss_generation');

try {
  const result = await generateRSS(posts);
  monitor.success({
    postCount: posts.length,
    rssSize: result.length
  });
  return result;
} catch (error) {
  monitor.error(error);
  throw error;
} finally {
  monitor.end();
}
```

### 3. Interactive Debugging

**Bun.js Debugging:**
```bash
# Start with debugger
bun --inspect-brk run dev

# Open Chrome DevTools
# Navigate to chrome://inspect
# Click "Open dedicated DevTools for Node"

# Set breakpoints in code
debugger; // This will pause execution

# Use console for inspection
console.log('Variable value:', variable);
console.table(array);
console.trace('Call stack');
```

**VS Code Debugging:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Bun.js",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### 4. Network and API Debugging

**API Request Debugging:**
```javascript
// Debug fetch requests
const debugFetch = async (url, options = {}) => {
  console.log('🔍 Fetch request:', {
    url,
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body
  });
  
  const startTime = Date.now();
  const response = await fetch(url, options);
  const duration = Date.now() - startTime;
  
  console.log('📊 Fetch response:', {
    status: response.status,
    duration: `${duration}ms`,
    headers: Object.fromEntries(response.headers.entries())
  });
  
  return response;
};

// Usage
const response = await debugFetch('/api/v1/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(postData)
});
```

**DNS and Connection Debugging:**
```javascript
import { DNSOptimizer } from '../src/utils/dns-optimizer.js';

// Debug DNS operations
const dns = new DNSOptimizer();

// Enable DNS debugging
dns.on('lookup', (host, result) => {
  console.log(`DNS lookup for ${host}:`, result);
});

dns.on('error', (host, error) => {
  console.error(`DNS error for ${host}:`, error);
});

// Debug connection operations
import { ConnectionOptimizer } from '../src/utils/connection-optimizer.js';

const connection = new ConnectionOptimizer();

connection.on('connect', (url, result) => {
  console.log(`Connection to ${url}:`, result);
});

connection.on('error', (url, error) => {
  console.error(`Connection error to ${url}:`, error);
});
```

## Debugging Procedures

### 1. Application Startup Issues

**Problem**: Application fails to start
**Debug Procedure:**
```bash
# Check for syntax errors
bun run lint

# Check configuration
bun run test:config

# Start with verbose output
DEBUG=true bun run dev --verbose

# Check environment variables
bun run env:check

# Test individual components
bun run test:dns
bun run test:cache
bun run test:r2
```

**Common Issues:**
- Missing environment variables
- Invalid configuration values
- Dependency conflicts
- Port already in use

### 2. Performance Issues

**Problem**: Slow response times or high resource usage
**Debug Procedure:**
```bash
# Monitor performance metrics
bun run monitor

# Check memory usage
bun run memory:check

# Profile CPU usage
bun --profile run dev

# Analyze response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/posts

# Check cache performance
curl http://localhost:3000/api/v1/admin/stats | jq '.data.stats.cache'
```

**Performance Debugging Tools:**
```javascript
// Performance profiling
import { performanceProfiler } from '../src/utils/performance-profiler.js';

// Profile specific operations
const profile = performanceProfiler.start('rss_generation');
await generateRSS(posts);
const result = profile.end();

console.log('Performance profile:', {
  operation: result.operation,
  duration: result.duration,
  memory: result.memory,
  cpu: result.cpu
});

// Memory leak detection
import { memoryProfiler } from '../src/utils/memory-profiler.js';

const initialMemory = memoryProfiler.getMemoryUsage();
// Run operations
const finalMemory = memoryProfiler.getMemoryUsage();

console.log('Memory usage change:', {
  initial: initialMemory,
  final: finalMemory,
  difference: finalMemory - initialMemory
});
```

### 3. Database and Storage Issues

**Problem**: R2 storage operations failing
**Debug Procedure:**
```bash
# Test R2 connection
bun run test:r2

# Check R2 credentials
bun run r2:check

# Test specific operations
bun run r2:test:upload
bun run r2:test:download
bun run r2:test:list
```

**R2 Debugging:**
```javascript
import { R2BlogStorage } from '../src/r2-client.js';

// Enable R2 debugging
const storage = new R2BlogStorage();
storage.on('upload', (file, result) => {
  console.log(`R2 upload ${file}:`, result);
});

storage.on('download', (file, result) => {
  console.log(`R2 download ${file}:`, result);
});

storage.on('error', (operation, error) => {
  console.error(`R2 ${operation} error:`, error);
});

// Test R2 operations with debugging
try {
  const result = await storage.upload('test.txt', 'test content');
  console.log('Upload successful:', result);
} catch (error) {
  console.error('Upload failed:', error);
}
```

### 4. Cache Issues

**Problem**: Cache not working or causing issues
**Debug Procedure:**
```bash
# Check cache status
curl http://localhost:3000/api/v1/admin/stats | jq '.data.stats.cache'

# Clear cache
curl -X POST http://localhost:3000/api/v1/admin/clear-cache \
  -H "Authorization: Bearer your-admin-token"

# Test cache operations
bun run test:cache
```

**Cache Debugging:**
```javascript
import { Cache } from '../src/utils/cache.js';

// Enable cache debugging
const cache = new Cache({ maxSize: 500, ttl: 600 });

cache.on('set', (key, value) => {
  console.log(`Cache set ${key}:`, value);
});

cache.on('get', (key, value) => {
  console.log(`Cache get ${key}:`, value);
});

cache.on('delete', (key) => {
  console.log(`Cache delete ${key}`);
});

cache.on('evict', (key, value) => {
  console.log(`Cache evict ${key}:`, value);
});

// Debug cache operations
console.log('Cache stats:', cache.getStats());
console.log('Cache keys:', cache.keys());
console.log('Cache values:', cache.values());
```

### 5. Network and DNS Issues

**Problem**: DNS resolution or network connectivity issues
**Debug Procedure:**
```bash
# Test DNS resolution
bun run test:dns

# Check network connectivity
bun run test:network

# Test specific hosts
bun run dns:test --host feeds.feedburner.com
```

**DNS Debugging:**
```javascript
import { DNSOptimizer } from '../src/utils/dns-optimizer.js';

// Enable DNS debugging
const dns = new DNSOptimizer();

dns.on('prefetch', (hosts, result) => {
  console.log('DNS prefetch:', { hosts, result });
});

dns.on('lookup', (host, result) => {
  console.log(`DNS lookup ${host}:`, result);
});

dns.on('error', (host, error) => {
  console.error(`DNS error ${host}:`, error);
});

// Debug DNS operations
console.log('DNS stats:', dns.getStats());
console.log('DNS cache:', dns.getCache());
```

## Advanced Debugging Techniques

### 1. Memory Leak Detection

**Memory Leak Debugging:**
```javascript
import { memoryLeakDetector } from '../src/utils/memory-leak-detector.js';

// Start memory leak detection
const detector = memoryLeakDetector.start();

// Run operations that might cause leaks
await performOperations();

// Check for memory leaks
const leaks = detector.check();
if (leaks.length > 0) {
  console.warn('Memory leaks detected:', leaks);
}

// Force garbage collection
if (global.gc) {
  global.gc();
  console.log('Garbage collection forced');
}
```

### 2. Request Flow Tracing

**Request Flow Debugging:**
```javascript
import { requestTracer } from '../src/utils/request-tracer.js';

// Trace request flow
app.use((req, res, next) => {
  const trace = requestTracer.start(req);
  
  res.on('finish', () => {
    trace.end({
      status: res.statusCode,
      duration: Date.now() - trace.startTime
    });
    
    console.log('Request trace:', trace.getData());
  });
  
  next();
});

// Custom request tracing
const trace = requestTracer.start('rss_generation');
trace.step('fetching_posts');
const posts = await fetchPosts();
trace.step('generating_rss');
const rss = await generateRSS(posts);
trace.end({ rssSize: rss.length });
```

### 3. Error Boundary Implementation

**Error Boundary Debugging:**
```javascript
// Error boundary for async operations
class ErrorBoundary {
  static async wrap(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      console.error('Error boundary caught error:', {
        error: error.message,
        stack: error.stack,
        context
      });
      
      // Log to error tracking
      errorTracker.track(error, context);
      
      // Return safe fallback
      return this.getFallback(context);
    }
  }
  
  static getFallback(context) {
    switch (context.type) {
      case 'rss_generation':
        return { rss: '', error: true };
      case 'post_fetch':
        return { posts: [], error: true };
      default:
        return { error: true };
    }
  }
}

// Usage
const result = await ErrorBoundary.wrap(async () => {
  return await generateRSS(posts);
}, { type: 'rss_generation', postsCount: posts.length });
```

## Debugging Best Practices

### 1. Systematic Approach
- Always start with the simplest explanation
- Check logs and error messages first
- Reproduce the issue consistently
- Isolate the problem to specific components

### 2. Documentation
- Document the debugging process
- Record what was tried and what worked
- Update troubleshooting guides
- Share findings with the team

### 3. Prevention
- Add logging to critical operations
- Implement monitoring and alerting
- Write comprehensive tests
- Use defensive programming practices

### 4. Tools and Automation
- Use automated testing to catch regressions
- Implement continuous monitoring
- Set up alerting for critical issues
- Use debugging tools and profilers

This debugging guide provides comprehensive techniques and procedures for identifying and resolving issues in the RSS Feed Optimization project. Remember to approach debugging systematically and document your findings for future reference.
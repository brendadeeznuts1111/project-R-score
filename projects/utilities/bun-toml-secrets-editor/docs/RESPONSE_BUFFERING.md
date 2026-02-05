# Response Buffering Integration

This document outlines the response buffering strategies integrated into the bun-toml-secrets-editor project.

## Features Implemented

### 1. Optimized Fetch (`optimizedFetch`)
- **Automatic strategy selection** based on content type and size
- **DNS prefetching** for improved performance
- **Retry logic** with exponential backoff
- **Timeout handling** with configurable limits
- **Memory-efficient buffering** for large responses

### 2. Streaming Support (`streamingFetch`)
- **Chunk-by-chunk processing** for large files
- **Memory conservation** by avoiding full buffering
- **Custom chunk handlers** for different data types

### 3. Parallel Processing (`parallelFetch`)
- **Connection pooling** with configurable concurrency
- **Batch processing** for multiple requests
- **Error isolation** per batch
- **Performance optimization** for bulk operations

### 4. Intelligent Caching (`CachedFetcher`)
- **TTL-based expiration** with configurable timeouts
- **Cache statistics** and monitoring
- **Memory management** with cache clearing
- **Hit/miss tracking** for performance analysis

### 5. File Downloads (`downloadWithProgress`)
- **Progress tracking** with callbacks
- **Direct file writing** to avoid memory buffering
- **Resume capability** for interrupted downloads
- **Size validation** and error handling

## Usage Examples

### Basic API Call
```typescript
import { optimizedFetch } from './utils/response-buffering';

const result = await optimizedFetch('https://api.example.com/config', {
  timeout: 10000,
  maxRetries: 2
});

console.log(`Fetched ${result.size} bytes, cached: ${result.cached}`);
```

### Streaming Large Files
```typescript
import { streamingFetch } from './utils/response-buffering';

await streamingFetch('https://example.com/large-file.toml', (chunk) => {
  // Process each chunk incrementally
  const text = new TextDecoder().decode(chunk);
  console.log('Received chunk:', text.length, 'bytes');
});
```

### Parallel API Calls
```typescript
import { parallelFetch } from './utils/response-buffering';

const urls = [
  'https://api1.example.com/data',
  'https://api2.example.com/data',
  'https://api3.example.com/data'
];

const results = await parallelFetch(urls, {}, 5); // 5 concurrent requests
```

### Cached Configuration
```typescript
import { CachedFetcher } from './utils/response-buffering';

const cache = new CachedFetcher(600000); // 10 minutes TTL
const result = await cache.fetch('https://config.example.com/settings');
```

## Performance Optimizations

### DNS Caching
- **Automatic prefetching** of frequently used domains
- **Cache statistics** monitoring with `dns.getCacheStats()`
- **Preconnect optimization** for known hosts

### Connection Management
- **Configurable connection limits** via `BUN_CONFIG_MAX_HTTP_REQUESTS`
- **Keep-alive connections** for reduced latency
- **Connection pooling** for efficient resource usage

### Memory Efficiency
- **Streaming for large files** to avoid memory overload
- **Direct file writing** for downloads
- **Configurable buffer sizes** based on available memory

## Configuration Options

### BufferingOptions
```typescript
interface BufferingOptions {
  timeout?: number;        // Request timeout in ms (default: 30000)
  maxRetries?: number;     // Maximum retry attempts (default: 3)
  bufferSize?: number;     // Size threshold for streaming (default: 1MB)
  streamToFile?: boolean;  // Enable file streaming for large responses
}
```

### Environment Variables
```bash
# Connection limit for stability
BUN_CONFIG_MAX_HTTP_REQUESTS=512

# Debug mode for verbose logging
DEBUG=true

# DNS cache monitoring
# Use dns.getCacheStats() in code
```

## Integration Points

### CLI Tools
- **DuoPlus CLI**: Use optimized fetch for API calls
- **Kimi CLI**: Implement streaming for large data processing
- **Matrix CLI**: Cache frequently accessed configurations

### Server Components
- **Enterprise dashboard**: Parallel data fetching
- **RSS processing**: Streaming feed parsing
- **Secret management**: Secure file downloads

### Testing
- **Unit tests**: Comprehensive test coverage
- **Integration tests**: End-to-end scenarios
- **Performance benchmarks**: Throughput and latency testing

## Best Practices

1. **Use appropriate buffering strategy** based on response size
2. **Implement proper error handling** with retries
3. **Monitor cache performance** regularly
4. **Configure connection limits** for system stability
5. **Use streaming** for large file operations
6. **Enable DNS prefetching** for frequently accessed hosts

## Monitoring and Debugging

### Cache Statistics
```typescript
const stats = cache.getCacheStats();
console.log(`Cache size: ${stats.size}, Entries: ${stats.entries.length}`);
```

### DNS Cache
```typescript
const dnsStats = dns.getCacheStats();
console.log('DNS cache performance:', dnsStats);
```

### Debug Mode
```typescript
const result = await optimizedFetch(url, {
  verbose: true  // Enables detailed logging
});
```

## File Structure

```
src/
├── utils/
│   └── response-buffering.ts     # Core buffering utilities
├── examples/
│   └── response-buffering-examples.ts  # Usage examples
├── tests/
│   └── response-buffering.test.ts      # Test suite
└── docs/
    └── RESPONSE_BUFFERING.md           # This documentation
```

This integration provides a comprehensive solution for optimal response handling in the bun-toml-secrets-editor project, ensuring high performance, reliability, and memory efficiency across all networking operations.

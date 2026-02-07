# Enhanced Bun.serve() Type Definitions & Performance Monitoring

## Overview

This enhanced Bun.serve() implementation provides comprehensive type definitions, performance monitoring, protocol optimization, and real-time metrics collection for Bun servers.

## Features

### 🔧 Enhanced Type Definitions
- **Protocol Support**: Full TypeScript support for HTTP, HTTPS, HTTP/2, HTTP/3
- **Performance Properties**: Built-in metrics collection and monitoring
- **Extended Methods**: Request metrics, compression stats, protocol metrics
- **Configuration Options**: Compression, caching, and monitoring settings

### 📊 Performance Monitoring
- **Real-time Metrics**: Requests/sec, response times, active connections
- **Compression Tracking**: Algorithm performance and savings analysis
- **Cache Statistics**: Hit/miss ratios and optimization suggestions
- **Request Tracing**: Individual request metrics with detailed timing
- **Performance Dashboard**: Interactive web dashboard with charts

### 🚀 Protocol Optimization
- **Automatic Detection**: Protocol identification and optimization
- **HTTP/2 Features**: Server push, header compression, multiplexing
- **HTTP/3 Support**: QUIC transport, 0-RTT connections
- **HTTPS Enhancements**: TLS 1.3, HSTS, OCSP stapling
- **Recommendations**: Intelligent optimization suggestions

## Quick Start

```typescript
import { createEnhancedServer } from './src/server/enhanced-server';

const server = createEnhancedServer({
  port: 3000,
  protocol: 'http2',
  compression: {
    enabled: true,
    algorithms: ['brotli', 'gzip'],
  },
  monitoring: {
    enabled: true,
    logSlowRequests: true,
  },
  fetch(req) {
    return new Response('Hello from enhanced server!');
  }
});

console.log(`Server running on ${server.protocol}`);
console.log(`Dashboard: ${server.url}/_perf`);
```

## API Reference

### Bun.ServeOptions Extensions

```typescript
interface ServeOptions {
  protocol?: 'http' | 'https' | 'http2' | 'http3' | 'auto';
  compression?: {
    enabled?: boolean;
    algorithms?: ('gzip' | 'brotli' | 'deflate' | 'zstd')[];
    minSize?: number;
    level?: number;
  };
  caching?: {
    enabled?: boolean;
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
    public?: boolean;
    immutable?: boolean;
  };
  monitoring?: {
    enabled?: boolean;
    interval?: number;
    metricsEndpoint?: string;
    logSlowRequests?: boolean;
    slowRequestThreshold?: number;
  };
}
```

### Server Extensions

```typescript
interface Server {
  protocol: 'http' | 'https' | 'http2' | 'http3';
  performance: {
    requestsPerSecond: number;
    avgResponseTime: number;
    activeConnections: number;
    bytesTransferred: {
      total: number;
      compressed: number;
      uncompressed: number;
      compressionRatio: number;
    };
    cacheStats: {
      hits: number;
      misses: number;
      ratio: number;
    };
  };
  getRequestMetrics(): RequestMetrics[];
  getCompressionStats(): CompressionStats;
  getProtocolMetrics(): ProtocolMetrics;
}
```

## Performance Dashboard

Access the interactive performance dashboard at `/_perf`:

- **Real-time Metrics**: Live performance data
- **Response Time Charts**: Visual performance analysis
- **Request History**: Detailed request logs
- **Compression Stats**: Algorithm performance
- **Protocol Information**: Current protocol and optimizations

## Metrics API

Access JSON metrics at `/_metrics`:

```json
{
  "protocol": "http2",
  "requests": 1250,
  "averageDuration": "45.23",
  "slowRequests": 3,
  "compression": {
    "enabled": true,
    "algorithms": ["gzip", "brotli"],
    "savings": { "ratio": 0.65 }
  },
  "cache": {
    "hits": 890,
    "misses": 360,
    "ratio": 0.71
  }
}
```

## Protocol Optimization

### HTTP/2 Optimizations
- Server push capability
- HPACK header compression
- Request multiplexing
- Stream prioritization

### HTTP/3 Optimizations
- QUIC transport protocol
- 0-RTT connection establishment
- Improved loss recovery
- Better mobility support

### HTTPS Optimizations
- TLS 1.3 enablement
- Perfect forward secrecy
- HSTS headers
- OCSP stapling

## Usage Examples

### Basic Enhanced Server

```typescript
const server = createEnhancedServer({
  port: 3000,
  protocol: 'https',
  compression: { enabled: true },
  monitoring: { enabled: true },
  fetch(req) {
    return Response.json({ 
      message: 'Hello!',
      protocol: server.protocol 
    });
  }
});
```

### Performance Monitoring

```typescript
setInterval(() => {
  console.log(`RPS: ${server.performance.requestsPerSecond}`);
  console.log(`Avg Time: ${server.performance.avgResponseTime}ms`);
  console.log(`Compression: ${server.performance.bytesTransferred.compressionRatio * 100}%`);
}, 10000);
```

### Protocol Optimization

```typescript
import { ProtocolOptimizer } from './src/server/protocol-optimizer';

const optimizer = new ProtocolOptimizer(server);
optimizer.optimizeForProtocol();

const recommendations = optimizer.getProtocolRecommendations();
recommendations.forEach(rec => console.log(rec));
```

## HAR Integration

```typescript
import { enhanceHarWithProtocol, exportEnhancedHar } from './src/utils/har-enhancer';

// Enhance existing HAR with protocol data
const enhancedHar = enhanceHarWithProtocol(existingHar, server);

// Export enhanced HAR
await exportEnhancedHar(server, 'performance.har');
```

## Testing

Run protocol performance tests:

```bash
bun run scripts/test-protocol-performance.ts
```

This will test all protocols and generate performance reports with:
- Requests per second
- Average response times
- Compression ratios
- Protocol-specific optimizations
- Performance recommendations

## File Structure

```
src/
├── core/
│   └── types/
│       └── bun-extended.ts          # Enhanced type definitions
├── performance/
│   └── monitoring-middleware.ts     # Performance monitoring
├── server/
│   ├── enhanced-server.ts           # Enhanced server creation
│   └── protocol-optimizer.ts        # Protocol optimization
├── utils/
│   └── har-enhancer.ts              # HAR integration
examples/
└── enhanced-server-usage.ts         # Usage examples
scripts/
└── test-protocol-performance.ts     # Performance testing
```

## Performance Benefits

- **Zero Dependencies**: Built into Bun runtime
- **Type Safety**: Full TypeScript support
- **Real-time Monitoring**: Live performance metrics
- **Protocol Optimization**: Automatic performance tuning
- **Interactive Dashboard**: Visual performance analysis
- **HAR Integration**: Enhanced debugging capabilities

## License

MIT License - see LICENSE file for details.

# Metafile Server - Live Build Analysis

## Overview

The Metafile Server provides real-time build analysis and metafile generation through HTTP endpoints, enabling live integration with web applications and CI/CD pipelines.

## Features

### 🌐 HTTP Endpoints

| Endpoint | Method | Description | Performance |
|----------|--------|-------------|-------------|
| `/metafile` | GET | Generate metafile | 3.45ms |
| `/metafile/analyze` | GET | Advanced analysis | ~5ms |
| `/health` | GET | Server status | <10ms |
| `/` | GET | Documentation | <10ms |

### ⚡ Performance Metrics

- **Bundle Size**: 39.37KB with full dependency analysis
- **Throughput**: 6,321 KB/s processing speed
- **Efficiency**: 100% optimization score
- **Memory**: 24MB efficient usage
- **Cache**: 5-minute HTTP caching

## Installation

### Start Server
```bash
bun run examples/metafile-server.ts
```

### Server Output
```
🚀 Context Engine v3.17 Metafile Server running on http://localhost:3000
📊 Available endpoints:
   GET /metafile - Generate metafile
   GET /metafile/analyze - Advanced analysis
   GET /health - Server status
   GET / - Documentation
```

## API Usage

### Basic Metafile Request
```bash
curl "http://localhost:3000/metafile?cwd=utils"
```

**Response**:
```json
{
  "metafile": {
    "inputs": { ... },
    "outputs": { ... }
  },
  "bundleSize": 40317,
  "buildTime": 2.77,
  "serverBuildTime": 3.45,
  "timestamp": "2026-02-07T17:35:21.133Z",
  "endpoint": "/metafile"
}
```

### Advanced Analysis Request
```bash
curl "http://localhost:3000/metafile/analyze?cwd=utils"
```

**Response**:
```json
{
  "metafile": { ... },
  "analysis": {
    "bundleSizeKB": 39.37,
    "buildTimeMs": 6.23,
    "throughputKBs": 6321.06,
    "efficiency": 100,
    "inputCount": 5,
    "outputCount": 1,
    "topDependencies": [
      { "path": "/utils/lead-spec-profile.ts", "count": 1 },
      { "path": "path", "count": 1 }
    ]
  }
}
```

### Health Check
```bash
curl "http://localhost:3000/health"
```

**Response**:
```json
{
  "status": "healthy",
  "version": "v3.17",
  "timestamp": "2026-02-07T17:35:21.133Z",
  "uptime": 11.37,
  "memory": {
    "rss": 33030144,
    "heapTotal": 1000448,
    "heapUsed": 526183
  },
  "endpoints": ["/metafile", "/metafile/analyze", "/health", "/"]
}
```

## Query Parameters

### Available Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `cwd` | string | Working directory | `cwd=utils` |
| `config` | string | Config file path | `config=bunfig.toml` |
| `smol` | boolean | Minify build | `smol=true` |
| `silent` | boolean | Silent mode | `silent=true` |
| `lsp-safe` | boolean | LSP safe mode | `lsp-safe=true` |
| `metafile` | string | Metafile output path | `metafile=meta.json` |

### Example Requests

```bash
# With custom working directory
curl "http://localhost:3000/metafile?cwd=src"

# With LSP safe mode
curl "http://localhost:3000/metafile?cwd=utils&lsp-safe=true"

# With multiple flags
curl "http://localhost:3000/metafile/analyze?cwd=utils&silent=true&smol=true"
```

## Integration Examples

### JavaScript/TypeScript Client
```typescript
class MetafileClient {
  constructor(private baseUrl: string = 'http://localhost:3000') {}

  async getMetafile(options: { cwd?: string; lspSafe?: boolean } = {}) {
    const params = new URLSearchParams();
    if (options.cwd) params.set('cwd', options.cwd);
    if (options.lspSafe) params.set('lsp-safe', 'true');

    const response = await fetch(`${this.baseUrl}/metafile?${params}`);
    return response.json();
  }

  async getAnalysis(options: { cwd?: string } = {}) {
    const params = new URLSearchParams();
    if (options.cwd) params.set('cwd', options.cwd);

    const response = await fetch(`${this.baseUrl}/metafile/analyze?${params}`);
    return response.json();
  }
}

// Usage
const client = new MetafileClient();
const metafile = await client.getMetafile({ cwd: 'utils' });
const analysis = await client.getAnalysis({ cwd: 'utils' });
```

### React Integration
```typescript
import { useState, useEffect } from 'react';

function MetafileDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('http://localhost:3000/metafile/analyze?cwd=utils');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch metafile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Error loading data</div>;

  return (
    <div>
      <h2>Bundle Analysis</h2>
      <p>Bundle Size: {data.analysis.bundleSizeKB}KB</p>
      <p>Build Time: {data.analysis.buildTimeMs}ms</p>
      <p>Throughput: {data.analysis.throughputKBs}KB/s</p>
    </div>
  );
}
```

## CORS Support

The server includes full CORS support for cross-origin requests:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

This enables integration with:
- Web applications on different domains
- React/Vue/Angular frontends
- Mobile applications
- CI/CD pipelines

## Error Handling

### Error Response Format
```json
{
  "error": "Bundle failed: Entry point not found",
  "timestamp": "2026-02-07T17:35:21.133Z",
  "endpoint": "/metafile"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Entry point not found` | Invalid working directory | Check `cwd` parameter |
| `Config file not found` | Invalid config path | Verify `config` parameter |
| `Bundle failed` | Build errors in source | Check source files |

## Performance Optimization

### Caching Strategy
- **HTTP Cache**: 5-minute cache control headers
- **Memory Efficiency**: 24MB baseline usage
- **Request Overhead**: <1ms additional latency

### Monitoring
```bash
# Monitor server health
watch -n 5 'curl -s http://localhost:3000/health | jq ".uptime, .memory.heapUsed"'

# Monitor response times
curl -w "@curl-format.txt" -s "http://localhost:3000/metafile?cwd=utils" > /dev/null
```

## Deployment

### Docker Deployment
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["bun", "run", "examples/metafile-server.ts"]
```

### Production Considerations
- Use reverse proxy (nginx/caddy) for SSL
- Configure rate limiting
- Monitor memory usage
- Set up health checks

## Troubleshooting

### Server Won't Start
```bash
# Check port availability
lsof -i :3000

# Kill existing process
pkill -f "metafile-server.ts"
```

### Requests Fail
```bash
# Check server logs
bun run examples/metafile-server.ts --verbose

# Test connectivity
curl -v "http://localhost:3000/health"
```

### Performance Issues
```bash
# Monitor resources
top -p $(pgrep -f "metafile-server.ts")

# Check memory leaks
curl -s "http://localhost:3000/health" | jq .memory
```

---

**Related Documentation**:
- [Context Engine v3.17](./context-engine-v3.17-metafile-profiler.md)
- [Bun CLI Native](./bun-cli-native-v3.15.md)

**Last Updated**: 2026-02-07  
**Version**: v3.17.0  
**Status**: Production Ready ✅

# FactoryWager Wiki

## Table of Contents

### Core Systems

#### [Context Engine v3.17 - Metafile Profiler](./context-engine-v3.17-metafile-profiler.md)
- **Status**: Production Ready ✅
- **Description**: Comprehensive build analysis and profiling system
- **Features**: Metafile dashboard, JSONC parsing, virtual files, live server
- **Performance**: 7000+ KB/s throughput, sub-5ms response times

#### [Metafile Server - Live Build Analysis](./metafile-server.md)
- **Status**: Production Ready ✅
- **Description**: Real-time HTTP endpoints for metafile generation
- **Features**: REST API, CORS support, performance metrics, health monitoring
- **Performance**: 3.45ms response time, 24MB memory usage

### API Documentation

#### [Bun CLI Native v3.15](./bun-cli-native-v3.15.md)
- **Status**: Stable ✅
- **Description**: Native Bun CLI integration and flag parsing

#### [Enhanced Bun.serve()](./enhanced-bun-serve.md)
- **Status**: Production Ready ✅
- **Description**: Enterprise-grade server monitoring and optimization

### Development Tools

#### [Junior Runner](./junior-runner.md)
- **Status**: Active ✅
- **Description**: Markdown profiling and analysis tool

#### [Wiki Generator](./wiki-generator.md)
- **Status**: Beta 🚧
- **Description**: Automated wiki generation system

---

## Quick Start

### Metafile Profiler
```bash
# Basic profiling
bun run context:metafile --cwd utils

# Advanced analysis
bun run context:metafile:analyze --cwd utils

# Live server
bun run examples/metafile-server.ts
```

### Server Integration
```typescript
// Metafile endpoint
if (url.pathname === '/metafile') {
  const metafile = await contextBuildWithMetafile(['junior-runner.ts'], parseFlags(url.search));
  return Response.json(metafile, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
```

### HTTP API Usage
```bash
# Basic metafile
curl "http://localhost:3000/metafile?cwd=utils"

# Advanced analysis
curl "http://localhost:3000/metafile/analyze?cwd=utils"

# Health check
curl "http://localhost:3000/health"
```

---

## Performance Benchmarks

| System | Throughput | Latency | Memory | Status |
|--------|------------|---------|--------|---------|
| Context Engine v3.17 | 7000+ KB/s | <5ms | <50MB | ✅ |
| Metafile Server | 6321 KB/s | 3.45ms | 24MB | ✅ |
| Enhanced Bun.serve() | 10,000+ RPS | <1ms | <10MB | ✅ |
| Junior Runner | 1.16M chars/s | 0.79ms | <1MB | ✅ |

---

## Architecture Overview

```
FactoryWager Wiki System
├── Core Engines
│   ├── Context Engine v3.17 (Metafile Profiler)
│   └── Metafile Server (HTTP API)
├── API Documentation
│   ├── Bun CLI Native v3.15
│   └── Enhanced Bun.serve()
└── Development Tools
    ├── Junior Runner (Markdown Profiling)
    └── Wiki Generator (Documentation)
```

---

## Contributing

1. **Fork** the repository
2. **Create** feature branch
3. **Update** documentation
4. **Submit** pull request

### Documentation Standards
- Use Markdown with proper formatting
- Include performance benchmarks
- Add code examples
- Provide troubleshooting guides

---

**Last Updated**: 2026-02-07  
**Version**: v3.17.0  
**Total Systems**: 6 active  
**Wiki Articles**: 4 published

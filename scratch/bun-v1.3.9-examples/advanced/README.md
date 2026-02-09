# Bun v1.3.9 Advanced Patterns and Integration

Comprehensive advanced examples, integration patterns, and reference implementations for all Bun v1.3.9 features.

## Overview

This directory contains production-ready code patterns, advanced examples, and integration guides for all major features introduced in Bun v1.3.9.

## Directory Structure

```
advanced/
├── script-orchestration/     # bun run --parallel/--sequential
│   ├── advanced-patterns.ts
│   ├── workspace-strategies.ts
│   ├── error-handling.ts
│   └── performance-optimization.ts
├── http2-upgrades/           # HTTP/2 connection upgrades
│   ├── proxy-server.ts
│   ├── load-balancer.ts
│   ├── connection-pool.ts
│   └── security-patterns.ts
├── mock-dispose/             # Symbol.dispose for mocks
│   ├── nested-scopes.ts
│   ├── async-cleanup.ts
│   ├── test-utilities.ts
│   └── framework-integration.ts
├── no-proxy/                 # NO_PROXY environment variable
│   ├── pattern-matching.ts
│   ├── enterprise-integration.ts
│   ├── test-utils.ts
│   └── reference-impl.ts
├── cpu-profiling/            # --cpu-prof-interval
│   ├── custom-intervals.ts
│   ├── analysis-workflows.ts
│   ├── ci-integration.ts
│   └── optimization-guide.ts
├── esm-bytecode/             # ESM bytecode compilation
│   ├── build-pipelines.ts
│   ├── distribution.ts
│   ├── optimization.ts
│   └── cross-platform.ts
├── performance/              # Performance optimizations
│   ├── regex-jit-patterns.ts
│   ├── markdown-optimization.ts
│   ├── string-optimization.ts
│   ├── collection-optimization.ts
│   └── jsc-upgrade-benefits.ts
├── integrations/             # Real-world integrations
│   ├── microservices.ts
│   ├── ci-cd-pipeline.ts
│   ├── production-setup.ts
│   └── enterprise-patterns.ts
└── reference/                # Reference implementations
    ├── proxy-client.ts
    ├── websocket-client.ts
    ├── test-framework.ts
    └── monitoring-utils.ts
├── bugfixes/                  # Bugfixes and improvements reference
    ├── BUGFIXES-REFERENCE.md
    └── string-width-thai-lao.ts
```

## Features Covered

### 1. Script Orchestration (`bun run --parallel` and `--sequential`)
- Advanced workspace patterns
- Complex dependency scenarios
- Error handling strategies
- Performance optimization
- Comparison with `--filter`

### 2. HTTP/2 Connection Upgrades
- Proxy server implementations
- Load balancing patterns
- Connection pooling
- Security considerations

### 3. Mock Auto-Cleanup (`Symbol.dispose`)
- Nested scope patterns
- Async cleanup scenarios
- Complex test utilities
- Framework integration

### 4. NO_PROXY Environment Variable
- Wildcard pattern matching
- IP range support
- Enterprise integration
- Security patterns

### 5. CPU Profiling (`--cpu-prof-interval`)
- Custom interval optimization
- Performance analysis workflows
- CI/CD integration
- Profiling best practices

### 6. ESM Bytecode Compilation
- Build pipeline integration
- Distribution strategies
- Performance optimization
- Cross-platform compilation

### 7. Performance Optimizations
- RegExp JIT patterns
- Markdown rendering optimization
- String method optimization
- Collection size optimization
- JSC upgrade benefits

### 8. Bugfixes and Improvements
- **Bun APIs:** `Bun.stringWidth` Thai/Lao spacing vowels (SARA AA, SARA AM) → width 1
- **Web APIs:** WebSocket `binaryType = "blob"` no-crash; HTTP proxy keep-alive; chunked encoding security
- **TypeScript:** `Bun.Build.CompileTarget` SIMD/Linux x64; `Socket.reload()` `{ socket: handler }`

See `bugfixes/BUGFIXES-REFERENCE.md` and `bun run bugfixes/string-width-thai-lao.ts`.

## Usage

Each file is a standalone example that can be run with:

```bash
bun run <file>
```

For example:

```bash
bun run script-orchestration/advanced-patterns.ts
bun run http2-upgrades/proxy-server.ts
bun run mock-dispose/nested-scopes.ts
```

## Key Patterns

### Script Orchestration
```bash
# Parallel execution
bun run --parallel build test lint

# Sequential execution
bun run --sequential build test deploy

# With workspaces
bun run --parallel --filter '*' build
```

### HTTP/2 Upgrades
```typescript
const netServer = createServer((rawSocket) => {
  h2Server.emit('connection', rawSocket);
});
```

### Mock Dispose
```typescript
{
  using spy = spyOn(obj, "method").mockReturnValue("mocked");
  // Auto-cleanup when scope exits
}
```

### NO_PROXY
```typescript
// NO_PROXY is now always checked, even with explicit proxy
await fetch("http://localhost:3000", {
  proxy: "http://proxy:8080", // Bypassed if in NO_PROXY
});
```

## Best Practices

1. **Script Orchestration**: Use `--parallel` for independent scripts, `--sequential` for dependencies
2. **HTTP/2**: Leverage connection upgrade pattern for proxy servers
3. **Mock Cleanup**: Always use `using` keyword for automatic cleanup
4. **NO_PROXY**: Configure properly for enterprise environments
5. **CPU Profiling**: Choose appropriate interval based on use case
6. **ESM Bytecode**: Use for production builds, optimize for target platform
7. **Performance**: Leverage JSC optimizations for better performance

## Contributing

When adding new patterns:
1. Follow existing code structure
2. Include comprehensive examples
3. Document use cases and benefits
4. Add performance considerations
5. Include best practices

## License

See parent directory for license information.

# RSS Feed Optimization - Cline Rules

## Brief overview
This project is a high-performance RSS feed optimization system built with Bun.js (not Node.js) and Cloudflare R2. It focuses on DNS optimization, connection pooling, circuit breakers, and production-grade resilience patterns. Code must be optimized for performance with sub-millisecond targets where possible.

## Technology Stack
- **Runtime**: Bun.js (v1.3.7+)
- **Storage**: Cloudflare R2 (via Bun's native `s3` API)
- **Testing**: `bun test` (built-in test runner)
- **Package Manager**: Built-in Bun package manager
- **No external runtime dependencies** - use Bun-native APIs exclusively

## Commit Message Format
All commits MUST follow this strict format:
```
[DOMAIN][SCOPE][TYPE] Brief description

- Detailed change 1
- Detailed change 2
```

**Valid Domains**: SHELL, API, CLI, DB, UI, CONFIG, BUILD, TEST, DOCS, INFRA, SECURITY, CORE, LIB, SCRIPTS, TOOLS, MCP, HOOKS, PKG  
**Valid Types**: FIX, FEAT, REFACTOR, PERF, CHORE, DOCS, TEST, STYLE, BUILD, CI, REVERT, WIP

Example:
```
[API][MIDDLEWARE][FEAT] Add rate limiting middleware

- Implement token bucket algorithm
- Add configurable limits per endpoint
- Include rate limit headers in responses
```

## Bun.js Native APIs (Preferred)
Always use Bun-native APIs over Node.js equivalents:
- `Bun.serve()` instead of Express/Fastify
- `Bun.file()` / `Bun.write()` for file operations
- `s3` API for R2 storage (not AWS SDK)
- `dns.prefetch()` for DNS optimization
- `fetch.preconnect()` for connection warming
- Built-in `bun:test` for testing
- `Buffer` optimizations via Bun's improved implementation

## Code Organization
```
src/
├── server.js              # Main entry point
├── config/                # Configuration management
├── middleware/            # Express-style middleware
├── services/              # Business logic
├── utils/                 # Utility functions
└── scripts/               # CLI scripts

tests/
├── *.test.js              # Test files alongside source
└── benchmark.js           # Performance benchmarks
```

## Naming Conventions
- **Files**: kebab-case (e.g., `circuit-breaker.js`)
- **Classes**: PascalCase (e.g., `CircuitBreaker`)
- **Functions/Variables**: camelCase (e.g., `fetchFeed`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Private methods**: Prefix with underscore (e.g., `_internalMethod`)

## Performance Targets
- DNS prefetch: < 1ms per host
- Connection preconnect: < 10ms per URL
- Feed stats tracking: > 500k ops/sec
- RSS generation: < 50ms for 100 posts
- Memory usage: < 100MB baseline

## Resilience Patterns (Required)
All external network calls MUST use:
1. **Circuit Breaker** - Prevent cascading failures
2. **Exponential Backoff with Jitter** - Prevent thundering herd
3. **DNS Prefetching** - Reduce latency
4. **Connection Preconnect** - Warm up connections

## Testing Requirements
- All new utilities must have tests
- Use `bun:test` (not Jest/Mocha)
- Test file naming: `{source-file}.test.js`
- Benchmarks for performance-critical code
- Target: > 80% coverage for utilities

## Error Handling
- Use custom error classes extending `Error`
- Include context in error messages
- Log with appropriate levels (console.log/info/warn/error)
- Never expose internal errors to clients

## Environment Variables
All configuration via environment variables with validation:
- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret
- `BUN_CONFIG_MAX_HTTP_REQUESTS` - Connection pool size
- `ADMIN_TOKEN` - Admin authentication

## Development Workflow
1. **Plan first** - Understand the architecture before coding
2. **Test early** - Write tests alongside implementation
3. **Benchmark** - Verify performance targets are met
4. **Commit often** - Small, focused commits with proper format
5. **No external deps** - Use Bun-native APIs exclusively

## Code Style
- Single quotes for strings
- No semicolons (except where required)
- 2-space indentation
- Max line length: 100 characters
- JSDoc comments for public APIs
- Inline comments for complex logic

## Communication Style
- Concise but complete responses
- Show code examples when explaining concepts
- Summarize what was done after each task
- Ask clarifying questions when requirements are ambiguous
- Prioritize working code over perfect architecture

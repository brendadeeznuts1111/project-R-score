## Summary

<!-- Brief description of changes -->

## Change Type

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Components

- [ ] API / Routes
- [ ] Cache (SQLite + Redis hybrid)
- [ ] Arbitrage Scanner
- [ ] ORCA Normalizer
- [ ] Crypto Matcher
- [ ] Deribit Options
- [ ] WebSocket Streaming
- [ ] Canonical UUIDs
- [ ] Error Registry
- [ ] Secrets Management
- [ ] Showcase UI
- [ ] CLI / Scripts
- [ ] Types / Interfaces
- [ ] Dashboard / UI
- [ ] Constants / Configuration
- [ ] MCP Tools / Registry

## Testing

<!-- How has this been tested? -->

- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] Manual testing completed
- [ ] Benchmark comparison (if performance-related)

## Checklist

- [ ] Code follows Bun-native patterns (no Node.js APIs where Bun alternatives exist)
- [ ] TypeScript strict mode passes
- [ ] Ports are hardcoded in `API_CONSTANTS` (not dynamically retrieved)
- [ ] Error codes follow NX-xxx format where applicable
- [ ] Cache operations use appropriate TTL/strategy per exchange
- [ ] API endpoints documented in OpenAPI spec (`src/api/docs.ts`)
- [ ] New endpoints added to root `/` discovery endpoint
- [ ] Dashboard links use dynamic `API_BASE` for file:// protocol compatibility
- [ ] MCP tools signed with Bun PM hash where applicable
- [ ] Documentation updated (CHANGELOG.md, RELEASE.md, or relevant docs/)

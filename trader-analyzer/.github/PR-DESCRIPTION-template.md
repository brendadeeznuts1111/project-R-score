## Summary

Hardcode ports throughout codebase, add URL parameter utilities, integrate AST-aware analysis tools into MCP registry, enhance dashboard with error logs and constants visibility, and add comprehensive registry system with RSS feed.

## Change Type

- [x] Bug fix (non-breaking change that fixes an issue)
- [x] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Performance improvement
- [x] Documentation update
- [x] Refactoring (no functional changes)

## Components

- [x] API / Routes
- [ ] Cache (APICacheManager)
- [ ] Arbitrage Scanner
- [ ] ORCA Normalizer
- [ ] Crypto Matcher
- [ ] WebSocket Streaming
- [ ] Canonical UUIDs
- [x] Error Registry
- [x] CLI / Scripts
- [ ] Types / Interfaces
- [x] Dashboard / UI
- [x] Constants / Configuration
- [x] MCP Tools / Registry

## Key Changes

### 1. Port Hardcoding
- **Changed**: Ports now hardcoded in `API_CONSTANTS.PORT` (3000) and `API_CONSTANTS.WS_PORT` (3002)
- **Files**: `src/index.ts`, `src/api/docs.ts`, `scripts/dev-server.ts`
- **Tests**: Added `test/port-config.test.ts` (8 tests, all passing)
- **Issue**: Resolves `.github/ISSUES/port-hardcoding.md`

### 2. URL Parameter Utilities
- **New**: `src/api/url-params.ts` - Bun-native URL parameter parsing using `URLSearchParams`
- **Integration**: Used in `/api/logs` endpoint
- **Constants**: Added `QUERY_PARAMS` and `QUERY_DEFAULTS` to `src/constants/index.ts`
- **Documentation**: Updated `docs/CONSTANTS-REFERENCE.md`

### 3. AST-Aware Analysis Tools
- **New**: Enhanced 5 AST tools (`ast-grep`, `pattern-weave`, `anti-pattern`, `smell-diffuse`, `pattern-evolve`)
- **MCP Integration**: Registered in `src/mcp/tools/ast-analysis.ts` with Bun PM hash signing
- **Documentation**: `docs/AST-TOOLS-REFERENCE.md`, `docs/MCP-AST-TOOLS.md`
- **Signatures**: `.github/MCP-TOOLS-SIGNATURES.md`

### 4. Dashboard Enhancements
- **New Tab**: "⚙️ Env/Flags/Constants" tab showing port configuration, env vars, feature flags
- **Error Logs**: Dedicated error logs section in Logs tab with statistics
- **CORS Fix**: Handle `file://` protocol gracefully with dynamic `API_BASE`
- **Diagrams**: Fixed Mermaid diagram rendering on tab switches
- **Links**: Fixed broken URLs, use GitHub links for documentation

### 5. Registry System
- **New**: Comprehensive registry system (`src/api/registry.ts`)
- **Endpoints**: `/api/registry`, `/api/registry/:registryId`, `/api/registry/category/:category`, `/api/registry/search`
- **Categories**: Properties, data sources, sharp books, bookmaker profiles, MCP tools, errors, URL anomaly patterns
- **Documentation**: Registry overview in API docs

### 6. Error Logs Endpoint
- **New**: `GET /api/logs/errors` - Dedicated error log viewer
- **Features**: Error statistics, registry context, multiple log file search
- **Dashboard**: Auto-loads when switching to Logs tab
- **Documentation**: `docs/ERROR-LOGS.md`

### 7. RSS Feed & Changelog
- **New**: `GET /api/rss.xml` - RSS feed with git commit integration
- **New**: `CHANGELOG.md` - Keep a Changelog format
- **New**: `RELEASE.md` - Detailed release notes
- **Integration**: Referenced in registry and API discovery

### 8. API Discovery
- **Enhanced**: Root `/` endpoint includes all new endpoints
- **OpenAPI**: Updated `src/api/docs.ts` with new endpoints, schemas, parameters
- **Links**: Added links to changelog, release notes, RSS feed

## Testing

- [x] `bun test` passes (port-config.test.ts: 8/8 passing)
- [x] `bun run typecheck` passes (pre-existing errors in `src/api/examples.ts` unrelated to this PR)
- [x] Manual testing completed (dashboard, endpoints, error logs)
- [ ] Benchmark comparison (not applicable)

## Checklist

- [x] Code follows Bun-native patterns (uses `Bun.CryptoHasher`, `Bun.nanoseconds()`, `Bun.spawn`, `URLSearchParams`)
- [x] TypeScript strict mode passes (no new errors introduced)
- [x] Ports are hardcoded in `API_CONSTANTS` (not dynamically retrieved) ✅ **This is the main change**
- [x] Error codes follow NX-xxx format where applicable
- [x] Cache operations use appropriate TTL/strategy per exchange (not modified)
- [x] API endpoints documented in OpenAPI spec (`src/api/docs.ts`)
- [x] New endpoints added to root `/` discovery endpoint (`src/index.ts`)
- [x] Dashboard links use dynamic `API_BASE` for file:// protocol compatibility
- [x] MCP tools signed with Bun PM hash where applicable (`Bun.CryptoHasher` SHA-256)
- [x] Documentation updated (CHANGELOG.md, RELEASE.md, ERROR-LOGS.md, AST-TOOLS-REFERENCE.md, MCP-AST-TOOLS.md, CONSTANTS-REFERENCE.md)

## Files Changed

**37 files changed, 7,543 insertions(+), 220 deletions(-)**

### New Files
- `src/api/url-params.ts` - URL parameter utilities
- `src/api/headers.ts` - HTTP headers constants
- `src/mcp/tools/ast-analysis.ts` - AST analysis MCP tools
- `scripts/pattern-evolve.ts` - Pattern evolution tracking tool
- `test/port-config.test.ts` - Port configuration tests
- `CHANGELOG.md` - Changelog
- `RELEASE.md` - Release notes
- `docs/ERROR-LOGS.md` - Error logs documentation
- `docs/AST-TOOLS-REFERENCE.md` - AST tools reference
- `docs/MCP-AST-TOOLS.md` - MCP AST tools documentation
- `.github/MCP-TOOLS-SIGNATURES.md` - Tool signatures
- `.github/ISSUES/port-hardcoding.md` - Issue documentation

### Modified Files
- `src/index.ts` - Port hardcoding, root endpoint updates
- `src/api/routes.ts` - Error logs endpoint, RSS feed, registry endpoints
- `src/api/docs.ts` - OpenAPI spec updates
- `src/api/registry.ts` - Registry system enhancements
- `src/constants/index.ts` - Port constants, query parameters
- `dashboard/index.html` - Dashboard enhancements
- `scripts/*.ts` - AST tool enhancements, dev-server port fix

## Breaking Changes

**None** - All changes are backward compatible.

## Migration Notes

- Port configuration: Ports are now hardcoded but can still be overridden via `PORT` and `WS_PORT` environment variables
- URL parameters: New utilities available but existing endpoints continue to work
- Dashboard: New tabs and features added, existing functionality preserved

## Related Issues

**Auto-closing keywords:**
- Closes `.github/ISSUES/port-hardcoding.md`
- Fixes port hardcoding consistency issue
- Resolves port configuration traceability

**Related:**
- Registry system enhancements
- MCP tools integration
- Dashboard improvements
- Error logs endpoint

## Screenshots / Examples

### Dashboard - Error Logs Tab
```
🚨 Error Logs
├─ Total Errors: 5
├─ Error Registry: 50
└─ Categories: 8
```

### API Endpoints
```bash
# Error logs
curl http://localhost:3000/api/logs/errors?limit=100

# Error registry
curl http://localhost:3000/api/registry/errors

# RSS feed
curl http://localhost:3000/api/rss.xml
```

## Labels (Suggested)

**Bright colored labels matching Telegram integration patterns:**

- `enhancement` - #00d4ff (Cyan - Main feature color)
- `configuration` - #9c27b0 (Purple - Telegram API color)
- `documentation` - #00ff88 (Green - Success/Info)
- `dashboard` - #667eea (Indigo - UI components)
- `api` - #00d4ff (Cyan - API routes)
- `mcp-tools` - #ff00ff (Magenta - Tool integration)
- `registry` - #ff1744 (Red - Registry system)
- `error-logs` - #ff6b00 (Orange - Error handling)

## PR Metadata

- **Reviewers:** None assigned
- **Assignees:** None assigned
- **Projects:** None
- **Milestone:** None
- **Development:** Use closing keywords in description to automatically close issues

## Notes

- Pre-existing TypeScript errors in `src/api/examples.ts` (line 733) are unrelated to this PR and can be fixed separately
- All new features are opt-in and don't affect existing functionality
- Dashboard improvements work with both `http://` and `file://` protocols
- Follows GitHub Community Guidelines
- No code of conduct tags required

# Private Registry - Quick Reference

Fast lookup for common registry tasks and commands.

## 📋 File Structure

```
.npmrc.example                           - Template (copy to .npmrc)
src/services/PrivateRegistryClient.ts    - Registry client implementation
src/routes/registry.ts                   - API endpoints
tests/integration/registry.test.ts       - Comprehensive tests
docs/PRIVATE_REGISTRY_SETUP.md          - Configuration guide
docs/PRIVATE_REGISTRY_INTEGRATION.md    - Integration guide
```

## ⚡ Quick Commands

### Setup
```bash
cp .npmrc.example .npmrc           # Create npmrc from template
source .env                        # Load environment variables
bun install                        # Install with private packages
```

### Testing
```bash
bun test tests/integration/registry.test.ts              # Run tests
bun test tests/integration/registry.test.ts --verbose    # Verbose mode
bun test tests/integration/registry.test.ts -t "test name"  # Specific test
```

### Server
```bash
bun src/server.ts                  # Start server with registry endpoints
curl http://localhost:3000/registry/health    # Check registry health
curl http://localhost:3000/registry/cache/stats   # View cache
curl -X POST http://localhost:3000/registry/cache/clear  # Clear cache
```

## 🔑 Environment Variables

```bash
GITHUB_NPM_TOKEN=ghp_xxxx          # GitHub package token
GITLAB_NPM_TOKEN=glpat_xxxx        # GitLab package token
INTERNAL_REGISTRY_TOKEN=xxxx       # Internal registry token
GITHUB_PACKAGES_URL=https://npm.pkg.github.com/duoplus
GITLAB_REGISTRY_URL=https://gitlab.example.com/api/v4/packages/npm
INTERNAL_REGISTRY_URL=https://registry.internal.example.com
```

## 📝 .npmrc Essentials

```ini
# Scoped registries
@duoplus:registry=https://npm.pkg.github.com/duoplus
@duoplus-dev:registry=https://gitlab.example.com/api/v4/packages/npm
@internal:registry=https://registry.internal.example.com

# Authentication (use ${VAR?} syntax, never hardcode tokens)
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN?}
//gitlab.example.com/api/v4/packages/npm/:_authToken=${GITLAB_NPM_TOKEN?}
//registry.internal.example.com/:_authToken=${INTERNAL_REGISTRY_TOKEN?}

# Global settings
strict-ssl=true
fetch-timeout=10000
```

## 🚀 API Endpoints

| Method | Endpoint | Purpose | Example |
|--------|----------|---------|---------|
| GET | `/registry/meta/:packageName` | Fetch package metadata | `/registry/meta/%40duoplus%2Fcore` |
| GET | `/registry/health` | Check registry status | `/registry/health` |
| GET | `/registry/cache/stats` | Cache statistics | `/registry/cache/stats` |
| POST | `/registry/cache/clear` | Clear metadata cache | `/registry/cache/clear` |
| GET | `/registry/config` | Current registry config | `/registry/config` |

### Example Requests

```bash
# Fetch package metadata
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3000/registry/meta/%40duoplus%2Fcore'

# Health check
curl http://localhost:3000/registry/health

# Clear cache
curl -X POST http://localhost:3000/registry/cache/clear
```

## 💻 Code Snippets

### Initialize Client

```typescript
import { createDuoPlusRegistryClient } from './services/PrivateRegistryClient';

const client = createDuoPlusRegistryClient();
// Automatically configured with ENTERPRISE, DEVELOPMENT, INTERNAL registries
```

### Fetch Package Metadata

```typescript
import { ScopeContext } from './types/scope.types';

const scope: ScopeContext = {
  domain: 'api.duoplus.io',
  platform: 'duoplus',
  scopeId: 'ENTERPRISE',
  overridden: false
};

const response = await client.fetchPackageMeta(
  '@duoplus/core',
  scope,
  true  // use cache
);

if (response.success) {
  console.log('Version:', response.data?.version);
} else {
  console.error('Error:', response.error);
}
```

### Register Custom Registry

```typescript
client.registerRegistry('CUSTOM', {
  registry: 'https://your-registry.com',
  scope: '@yourscope',
  token: process.env.REGISTRY_TOKEN,
  timeout: 5000
});
```

### Health Check

```typescript
const isHealthy = await client.healthCheck(scope);
if (!isHealthy) {
  console.error('Registry unavailable, using fallback');
}
```

### Cache Management

```typescript
// Get statistics
const stats = client.getCacheStats();
console.log(`Cached packages: ${stats.entries}`);

// Clear cache
client.clearCache();
```

### Server Integration

```typescript
import { createRegistryMiddleware } from './routes/registry';
import { resolveScopeFromRequest } from './config/scope.config';

const middleware = createRegistryMiddleware(client);

Bun.serve({
  async fetch(req) {
    const scope = resolveScopeFromRequest(req);
    const response = await middleware(req, scope);
    if (response) return response;
    
    return new Response('Not found', { status: 404 });
  }
});
```

## 🔒 Security Tips

✅ **DO**
- Store tokens in environment variables
- Use HTTPS for all registries
- Rotate tokens every 90 days
- Mask secrets in CI/CD logs
- Validate scope → registry mapping

❌ **DON'T**
- Commit `.npmrc` with actual tokens
- Use HTTP for private registries
- Share tokens via email
- Log full error messages with URLs
- Trust unverified SSL in production

## 🧪 Test Coverage

**Test Areas:**
- ✅ Bearer token authentication (valid/invalid)
- ✅ Cookie handling (parse Set-Cookie, send Cookie)
- ✅ Scope-based routing (ENTERPRISE, DEVELOPMENT, INTERNAL)
- ✅ Package metadata fetching
- ✅ Caching (cache, skip, clear)
- ✅ Health checks
- ✅ Error handling (timeout, invalid URL, missing config)
- ✅ Multiple scopes simultaneously
- ✅ Integration scenarios

## 🐛 Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid token | Set `${GITHUB_NPM_TOKEN?}` env var |
| 403 Forbidden | No permission | Verify token scopes and org access |
| 404 Not Found | Wrong package name | Check spelling and scope (@scope/pkg) |
| Timeout | Network/registry slow | Increase `fetch-timeout` in .npmrc |
| Cache stale | Old data cached | Call `/registry/cache/clear` endpoint |

## 📊 Configuration Priority

1. **Environment Variables** (highest priority)
   - `GITHUB_NPM_TOKEN`, `GITLAB_NPM_TOKEN`, etc.

2. **.npmrc** (project-level)
   - Scoped registry URLs and auth paths
   - Global settings like `fetch-timeout`

3. **bunfig.toml** (Bun runtime config)
   - Limited support (doesn't handle secrets)

4. **Defaults** (lowest priority)
   - npm registry fallback

## 🔗 Related Files

- `src/types/scope.types.ts` - ScopeContext type definition
- `src/config/scope.config.ts` - Scope resolution logic
- `.npmrc.example` - Configuration template
- `docs/PRIVATE_REGISTRY_SETUP.md` - Detailed setup
- `docs/PRIVATE_REGISTRY_INTEGRATION.md` - Integration steps

## 📚 Reference

### PrivateRegistryClient Methods

```typescript
client.registerRegistry(scope, config)           // Register registry
client.getRegistryConfig(scopeContext)           // Get config for scope
client.fetchPackageMeta(packageName, scope, cache)  // Fetch metadata
client.healthCheck(scope)                        // Check availability
client.clearCache()                              // Clear metadata cache
client.getCacheStats()                           // Get cache stats
```

### Registry Config Interface

```typescript
interface RegistryConfig {
  registry: string;        // Registry URL
  scope: string;          // Package scope
  token?: string;         // Bearer token
  cookies?: Record<string, string>;  // Session cookies
  timeout?: number;       // Request timeout (ms)
}
```

### Response Format

```typescript
interface RegistryResponse {
  success: boolean;
  data?: PackageMeta;
  error?: string;
  statusCode: number;
  headers: Record<string, string>;
}
```

## 💡 Pro Tips

1. **Use `useCache=true` by default** for performance
2. **Clear cache after publishing** new package versions
3. **Monitor cache stats** to detect memory issues
4. **Set timeout appropriately** for your network
5. **Test health regularly** for early failure detection
6. **Use scope context** to auto-route to correct registry
7. **Validate tokens on startup** to catch issues early
8. **Log without exposing tokens** using `response.error`

---

**Quick Links:**
- [Full Setup Guide](./PRIVATE_REGISTRY_SETUP.md)
- [Integration Guide](./PRIVATE_REGISTRY_INTEGRATION.md)
- [Client Source](../src/services/PrivateRegistryClient.ts)
- [Routes Source](../src/routes/registry.ts)
- [Tests](../tests/integration/registry.test.ts)

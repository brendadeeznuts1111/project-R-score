# Private Scoped Registry Configuration

Complete guide for setting up and using private npm registries with DuoPlus Bun environment.

## 🔐 Configuration Methods

### Method 1: `.npmrc` (Recommended for CI/Local)

Create `.npmrc` in project root:

```ini
# .npmrc
@duoplus:registry=https://npm.pkg.github.com/duoplus
@duoplus-dev:registry=https://gitlab.example.com/api/v4/packages/npm
@internal:registry=https://registry.internal.example.com

# GitHub Packages
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN?}

# GitLab
//gitlab.example.com/api/v4/packages/npm/:_authToken=${GITLAB_NPM_TOKEN?}

# Internal Registry  
//registry.internal.example.com/:_authToken=${INTERNAL_REGISTRY_TOKEN?}

# Always use HTTPS
strict-ssl=true

# Timeout for all registries (ms)
fetch-timeout=10000
```

### Method 2: `bunfig.toml` (Runtime Config)

```toml
# bunfig.toml
[install]
# Default registry
registry = "https://registry.npmjs.org"

# Note: Auth tokens must be in .npmrc
# bunfig.toml doesn't support secrets
```

### Method 3: Environment Variables

```bash
# .env or CI/CD secrets

# GitHub Packages
export GITHUB_NPM_TOKEN="ghp_xxxxxxxxxxxx"
export GITHUB_PACKAGES_URL="https://npm.pkg.github.com/duoplus"

# GitLab
export GITLAB_NPM_TOKEN="glpat-xxxxxxxxxxxx"
export GITLAB_REGISTRY_URL="https://gitlab.example.com/api/v4/packages/npm"

# Internal Registry
export INTERNAL_REGISTRY_URL="https://registry.internal.example.com"
export INTERNAL_REGISTRY_TOKEN="internal-token-xxxx"
export REGISTRY_SESSION="session-cookie-value"
```

## 🚀 Usage in Code

### Basic Setup

```typescript
import { createDuoPlusRegistryClient } from './src/services/PrivateRegistryClient';
import { resolveScopeFromRequest } from './src/config/scope.config';

// Create client with all registries
const registryClient = createDuoPlusRegistryClient();

// In request handler
const scope = resolveScopeFromRequest(request);

// Fetch metadata for a scoped package
const response = await registryClient.fetchPackageMeta(
  '@duoplus/core',
  scope,
  true // use cache
);

if (response.success) {
  console.log('Package version:', response.data?.version);
} else {
  console.error('Failed to fetch:', response.error);
}
```

### Scope-Based Registry Routing

```typescript
// Routes automatically choose registry based on scope

// ENTERPRISE scope → GitHub Packages
// DEVELOPMENT scope → GitLab Registry
// INTERNAL scope → Internal Registry
// default → npm registry

const registryClient = createDuoPlusRegistryClient();

// Get registry for current scope
const registryConfig = registryClient.getRegistryConfig(scope);
console.log('Using registry:', registryConfig.registry);
```

### Health Checks

```typescript
// Check if registry is accessible
const isHealthy = await registryClient.healthCheck(scope);

if (!isHealthy) {
  console.error('Registry unavailable, using fallback');
  // Implement fallback logic
}
```

### Cache Management

```typescript
// Get cache statistics
const stats = registryClient.getCacheStats();
console.log(`Cached: ${stats.entries} packages (${stats.size})`);

// Clear cache when needed
registryClient.clearCache();
```

## 🔒 Security Best Practices

### ✅ DO

- ✅ Store tokens in environment variables
- ✅ Use HTTPS for all registry URLs
- ✅ Validate certificate pinning for critical registries
- ✅ Rotate tokens regularly
- ✅ Use narrowly-scoped tokens
- ✅ Redact tokens in logs and error messages
- ✅ Use `.npmrc` with `${VAR?}` syntax for required variables
- ✅ Validate scope → registry mapping at startup

### ❌ DON'T

- ❌ Commit tokens to version control
- ❌ Use `env: "inline"` in Bun build for secrets
- ❌ Share tokens across environments
- ❌ Log full error messages containing URLs with tokens
- ❌ Use HTTP for private registries
- ❌ Trust unverified SSL certificates in production

## 🛡️ Token Management

### GitHub Packages Token

Create in GitHub → Settings → Developer settings → Personal access tokens:

```
scopes: read:packages
permissions: repo (read-only)
```

### GitLab Token

Create in GitLab → Settings → Access Tokens:

```
scopes: api, read_api, read_repository
expiry: 1 year (rotate regularly)
```

### Internal Registry Token

Request from your registry administrator:
- Never share via email
- Rotate every 90 days
- Use separate tokens per environment

## 🌐 Network Security

### Certificate Pinning (Advanced)

For maximum security, pin registry certificates:

```typescript
// config/certificates.ts
export const CertificatePins = {
  'npm.pkg.github.com': {
    sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  },
  'registry.internal.example.com': {
    sha256: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
  }
};
```

Then validate in client:
```typescript
// In PrivateRegistryClient
if (config.certPin) {
  // Implement certificate validation
  validateCertificate(url, config.certPin);
}
```

## 📝 .gitignore

Ensure tokens are never committed:

```
# .gitignore
.npmrc
.env
.env.local
.env.*.local
*.pem
*.key
tokens/
secrets/
```

## 🧪 Testing Private Registries

### Mock Registry for Tests

```typescript
// tests/mock-registry.test.ts
import { test, expect, beforeAll, afterAll } from 'bun:test';

let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.url.includes('/@duoplus/core')) {
        return Response.json({
          name: '@duoplus/core',
          version: '3.7.0-test',
          description: 'Test package'
        });
      }
      return new Response('Not found', { status: 404 });
    }
  });
});

afterAll(() => {
  server.stop();
});

test('fetches from mock registry', async () => {
  const client = createDuoPlusRegistryClient();
  
  // Override registry URL for testing
  client.registerRegistry('TEST', {
    registry: `http://localhost:${server.port}`,
    scope: '@duoplus',
    timeout: 5000
  });

  const response = await client.fetchPackageMeta(
    '@duoplus/core',
    { domain: 'test.local', platform: 'test', scopeId: 'TEST', overridden: false },
    false // skip cache
  );

  expect(response.success).toBe(true);
  expect(response.data?.version).toBe('3.7.0-test');
});
```

Run with:
```bash
bun test tests/mock-registry.test.ts
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: Install Private Dependencies

on: [push, pull_request]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Setup registry auth
        run: |
          echo "@duoplus:registry=https://npm.pkg.github.com/duoplus" >> ~/.npmrc
          echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> ~/.npmrc
      
      - name: Install dependencies
        run: bun install
```

### GitLab CI

```yaml
install-dependencies:
  image: oven/bun
  script:
    - echo '@duoplus-dev:registry=${GITLAB_REGISTRY_URL}' >> ~/.npmrc
    - echo '//${CI_SERVER_HOST}/api/v4/packages/npm/:_authToken=${CI_JOB_TOKEN}' >> ~/.npmrc
    - bun install
```

## 🆘 Troubleshooting

### 401 Unauthorized

```
Error: 401 Unauthorized
Solution:
1. Check token is set in .npmrc or GITHUB_NPM_TOKEN env var
2. Verify token hasn't expired
3. Check token has correct scopes (read:packages)
4. Try: bun install --verbose
```

### 403 Forbidden

```
Error: 403 Forbidden  
Solution:
1. Verify organization permissions
2. Check registry URL is correct
3. Ensure token has access to @scope
4. Contact registry admin if needed
```

### 404 Not Found

```
Error: 404 Not Found
Solution:
1. Check package name spelling
2. Verify package exists in registry
3. Check package is published to correct scope
4. Try: curl -H "Authorization: Bearer $TOKEN" $REGISTRY_URL/@scope/package
```

### Timeout

```
Error: Request timeout
Solution:
1. Increase timeout in .npmrc: fetch-timeout=30000
2. Check network connectivity
3. Verify registry is responding: curl $REGISTRY_URL
4. Check firewall rules
```

## 📚 Reference

### PrivateRegistryClient API

```typescript
// Create client
const client = createDuoPlusRegistryClient();

// Register registry
client.registerRegistry(scope, config);

// Fetch metadata
const response = await client.fetchPackageMeta(packageName, scopeContext, useCache);

// Get registry config
const config = client.getRegistryConfig(scopeContext);

// Health check
const healthy = await client.healthCheck(scopeContext);

// Cache management
const stats = client.getCacheStats();
client.clearCache();
```

### Types

```typescript
interface RegistryConfig {
  registry: string;        // Registry URL
  scope: string;          // Package scope
  token?: string;         // Auth token
  cookies?: Record<string, string>;  // Session cookies
  timeout?: number;       // Request timeout (ms)
  certPin?: string;       // TLS cert pin (optional)
}

interface RegistryResponse {
  success: boolean;
  data?: PackageMeta;
  error?: string;
  statusCode: number;
  headers: Record<string, string>;
}
```

## ✅ Checklist

- [ ] Create `.npmrc` with registry configurations
- [ ] Set environment variables in CI/CD
- [ ] Test local `bun install` with private packages
- [ ] Initialize `PrivateRegistryClient` in app
- [ ] Implement scope-based registry routing
- [ ] Add health checks for registries
- [ ] Write tests with mock registries
- [ ] Setup CI/CD workflow
- [ ] Document registry endpoints
- [ ] Rotate tokens every 90 days
- [ ] Monitor registry availability
- [ ] Setup alerts for auth failures

---

**Your DuoPlus environment now supports secure private scoped registries! 🔐**

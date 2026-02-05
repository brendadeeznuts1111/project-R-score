# Private Registry Integration Guide

Complete step-by-step guide for integrating private scoped registries into DuoPlus with Bun.

## 📋 Quick Start (5 minutes)

```bash
# 1. Copy registry template
cp .npmrc.example .npmrc

# 2. Set environment variables
export GITHUB_NPM_TOKEN="ghp_your_token_here"
export GITLAB_NPM_TOKEN="glpat_your_token_here"
export INTERNAL_REGISTRY_TOKEN="your_token"

# 3. Install dependencies from private registries
bun install

# 4. Verify in code
import { createDuoPlusRegistryClient } from './src/services/PrivateRegistryClient';
const client = createDuoPlusRegistryClient();
```

## 🎯 Integration Steps

### Step 1: Configuration Files

#### 1a. Create `.npmrc`

```bash
# Copy example to actual file
cp .npmrc.example .npmrc
```

Edit `.npmrc` with your registries:

```ini
# Scoped registries
@duoplus:registry=https://npm.pkg.github.com/duoplus
@duoplus-dev:registry=https://gitlab.example.com/api/v4/packages/npm
@internal:registry=https://registry.internal.example.com

# Authentication
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN?}
//gitlab.example.com/api/v4/packages/npm/:_authToken=${GITLAB_NPM_TOKEN?}
//registry.internal.example.com/:_authToken=${INTERNAL_REGISTRY_TOKEN?}
```

#### 1b. Add to `.gitignore`

```bash
# .gitignore
.npmrc                    # Don't commit actual tokens
.env                      # Local environment variables
.env.local
tokens/
secrets/
```

### Step 2: Environment Setup

#### 2a. Local Development

Create `.env` file (never commit):

```bash
# .env - Local development only, DO NOT COMMIT
export GITHUB_NPM_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export GITLAB_NPM_TOKEN="glpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export INTERNAL_REGISTRY_TOKEN="internal-token-xxxxxxxxxxxxxxxx"
```

Load before using:

```bash
source .env
bun install
```

#### 2b. GitHub Actions

Add secrets in repository settings:

1. Go to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - `GITHUB_NPM_TOKEN`: Personal access token with read:packages
   - `GITLAB_NPM_TOKEN`: GitLab personal token
   - `INTERNAL_REGISTRY_TOKEN`: Internal registry token

Then in `.github/workflows/build.yml`:

```yaml
- name: Setup package registry auth
  run: |
    echo "@duoplus:registry=https://npm.pkg.github.com/duoplus" >> ~/.npmrc
    echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_NPM_TOKEN }}" >> ~/.npmrc
    echo "@duoplus-dev:registry=https://gitlab.example.com/api/v4/packages/npm" >> ~/.npmrc
    echo "//gitlab.example.com/api/v4/packages/npm/:_authToken=${{ secrets.GITLAB_NPM_TOKEN }}" >> ~/.npmrc
```

#### 2c. GitLab CI

Add variables in project settings:

1. Go to: Settings → CI/CD → Variables
2. Add each variable:
   - `GITLAB_NPM_TOKEN`: Private token (masked, protected)
   - `GITHUB_NPM_TOKEN`: GitHub token (masked, protected)
   - `INTERNAL_REGISTRY_TOKEN`: Internal token (masked, protected)

In `.gitlab-ci.yml`:

```yaml
variables:
  GITLAB_REGISTRY_URL: "https://gitlab.example.com/api/v4/packages/npm"

install-deps:
  image: oven/bun
  before_script:
    - echo "@duoplus:registry=https://npm.pkg.github.com/duoplus" >> ~/.npmrc
    - echo "//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN}" >> ~/.npmrc
    - echo "@duoplus-dev:registry=${GITLAB_REGISTRY_URL}" >> ~/.npmrc
    - echo "//${GITLAB_REGISTRY_URL}:_authToken=${GITLAB_NPM_TOKEN}" >> ~/.npmrc
    - echo "@internal:registry=https://registry.internal.example.com" >> ~/.npmrc
    - echo "//registry.internal.example.com:_authToken=${INTERNAL_REGISTRY_TOKEN}" >> ~/.npmrc
  script:
    - bun install
```

### Step 3: Server Integration

#### 3a. Import Registry Routes

In your main server file (e.g., `src/server.ts` or `src/index.ts`):

```typescript
import { createDuoPlusRegistryClient } from './services/PrivateRegistryClient';
import { createRegistryMiddleware } from './routes/registry';
import { resolveScopeFromRequest } from './config/scope.config';

// Initialize registry client and middleware
const registryClient = createDuoPlusRegistryClient();
const registryMiddleware = createRegistryMiddleware(registryClient);

// In Bun.serve()
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const scopeContext = resolveScopeFromRequest(req);

    // Try registry middleware first
    const registryResponse = await registryMiddleware(req, scopeContext);
    if (registryResponse) {
      return registryResponse;
    }

    // Rest of your routing...
    return new Response('Not found', { status: 404 });
  }
});
```

#### 3b. Add Registry Endpoints

Your server now has these endpoints:

```bash
# Get package metadata
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/registry/meta/@duoplus/core

# Check registry health
curl http://localhost:3000/registry/health

# Get cache statistics
curl http://localhost:3000/registry/cache/stats

# Clear metadata cache
curl -X POST http://localhost:3000/registry/cache/clear

# Get current registry config
curl http://localhost:3000/registry/config
```

### Step 4: Scope Configuration

#### 4a. Update `src/config/scope.config.ts`

Ensure your scope config maps to correct registries:

```typescript
import { ScopeContext } from '../types/scope.types';

export function resolveScopeFromRequest(req: Request): ScopeContext {
  const url = new URL(req.url);
  const subdomain = url.hostname.split('.')[0];

  // Map subdomains/domains to scopes
  if (subdomain === 'api' || url.hostname === 'api.duoplus.io') {
    return {
      domain: url.hostname,
      platform: 'duoplus',
      scopeId: 'ENTERPRISE',
      overridden: false
    };
  }

  if (subdomain === 'dev' || url.hostname === 'dev.duoplus.io') {
    return {
      domain: url.hostname,
      platform: 'duoplus',
      scopeId: 'DEVELOPMENT',
      overridden: false
    };
  }

  // Default scope
  return {
    domain: url.hostname,
    platform: 'duoplus',
    scopeId: 'INTERNAL',
    overridden: false
  };
}
```

### Step 5: Testing

#### 5a. Run Tests

```bash
# Run all registry tests
bun test tests/integration/registry.test.ts

# Run with verbose output
bun test tests/integration/registry.test.ts --verbose

# Test specific scenario
bun test tests/integration/registry.test.ts -t "should fetch with valid bearer token"
```

#### 5b. Manual Testing

```bash
# 1. Check registry health
curl http://localhost:3000/registry/health

# 2. Fetch package metadata
curl -H "Authorization: Bearer $YOUR_TOKEN" \
  'http://localhost:3000/registry/meta/%40duoplus%2Fcore'

# 3. Check cache
curl http://localhost:3000/registry/cache/stats

# 4. Clear cache
curl -X POST http://localhost:3000/registry/cache/clear

# 5. View config
curl http://localhost:3000/registry/config
```

### Step 6: Monitoring

#### 6a. Health Checks

Add to your monitoring/alerting:

```bash
# Scheduled health check (cron)
*/5 * * * * curl -f http://localhost:3000/registry/health || alert "Registry unhealthy"
```

#### 6b. Cache Monitoring

```typescript
// In your monitoring service
const stats = client.getCacheStats();
console.log(`Registry cache: ${stats.entries} entries, ${stats.size} bytes`);

// Alert if cache is too large
if (stats.size > 100 * 1024 * 1024) { // 100MB
  console.warn('Cache size exceeded, consider clearing');
  client.clearCache();
}
```

## 🔐 Security Checklist

- [ ] No tokens committed to git (check `.npmrc` not in repo)
- [ ] Tokens stored in environment variables or CI/CD secrets
- [ ] `.npmrc` in `.gitignore`
- [ ] HTTPS enforced for all registries (`strict-ssl=true`)
- [ ] Tokens rotated every 90 days
- [ ] Token scopes minimal (GitHub: `read:packages` only)
- [ ] CI/CD secrets marked as "masked" and "protected"
- [ ] Token manager configured (GitHub/GitLab/internal)
- [ ] Health checks monitoring registry availability
- [ ] Error logs don't expose tokens or full URLs
- [ ] Network isolation if using internal registry
- [ ] Certificate pinning (optional, for critical registries)

## 📊 Configuration Examples

### Example 1: GitHub Packages Only

`.npmrc`:
```ini
@duoplus:registry=https://npm.pkg.github.com/duoplus
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN?}
```

### Example 2: Multiple Private Registries

`.npmrc`:
```ini
@duoplus:registry=https://npm.pkg.github.com/duoplus
@duoplus-dev:registry=https://gitlab.example.com/api/v4/packages/npm
@internal:registry=https://registry.internal.example.com

//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN?}
//gitlab.example.com/api/v4/packages/npm/:_authToken=${GITLAB_NPM_TOKEN?}
//registry.internal.example.com/:_authToken=${INTERNAL_REGISTRY_TOKEN?}
```

### Example 3: With Custom CA Certificate

`.npmrc`:
```ini
@duoplus:registry=https://registry.internal.example.com

//registry.internal.example.com/:_authToken=${INTERNAL_TOKEN?}
ca=/path/to/ca-bundle.crt
strict-ssl=true
```

### Example 4: With Proxy

`.npmrc`:
```ini
@duoplus:registry=https://npm.pkg.github.com/duoplus
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN?}

https-proxy=http://proxy.corp.com:8080
http-proxy=http://proxy.corp.com:8080
```

## 🧪 Test Data

### Mock Scopes for Testing

```typescript
// Enterprise scope (production)
const enterpriseScope = {
  domain: 'api.duoplus.io',
  platform: 'duoplus',
  scopeId: 'ENTERPRISE',
  overridden: false
};

// Development scope (staging)
const devScope = {
  domain: 'dev.duoplus.io',
  platform: 'duoplus',
  scopeId: 'DEVELOPMENT',
  overridden: false
};

// Internal scope (local/testing)
const internalScope = {
  domain: 'internal.duoplus.io',
  platform: 'duoplus',
  scopeId: 'INTERNAL',
  overridden: false
};
```

## 🔗 Useful Links

- [npm/bun .npmrc documentation](https://docs.npmjs.com/cli/v9/configuring-npm/npmrc)
- [GitHub Packages - npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitLab Package Registry](https://docs.gitlab.com/ee/user/packages/npm_registry/)
- [Bun - Package Management](https://bun.sh/docs/install/packages)
- [Bun.fetch() API](https://bun.sh/docs/api/fetch)

## 🆘 Troubleshooting

### Problem: 401 Unauthorized

**Symptoms:** Packages can't be installed, `401 Unauthorized` error

**Solutions:**
1. Verify token is set: `echo $GITHUB_NPM_TOKEN`
2. Check token hasn't expired
3. Verify token has correct scopes:
   - GitHub: `read:packages` scope required
   - GitLab: `api` and `read_api` scopes
4. Test with curl:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://npm.pkg.github.com/duoplus/@duoplus/core
   ```

### Problem: 403 Forbidden

**Symptoms:** Token works elsewhere but fails for this organization

**Solutions:**
1. Check organization access permissions
2. Verify package is published to correct organization
3. Ensure package is published to correct scope
4. Contact organization owner if needed
5. For GitHub: Check team membership and `read:packages` approval

### Problem: 404 Not Found

**Symptoms:** Package installed elsewhere but not found in registry

**Solutions:**
1. Check package name (case-sensitive): `@scope/package`
2. Verify package is published to this registry
3. Check package visibility (public vs private)
4. Verify scope is correctly configured in `.npmrc`

### Problem: Network Timeout

**Symptoms:** Installation hangs or times out

**Solutions:**
1. Increase timeout: `fetch-timeout=30000` in `.npmrc`
2. Test registry is responding:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://npm.pkg.github.com/duoplus
   ```
3. Check firewall/proxy configuration
4. Verify no rate limiting is blocking requests

### Problem: Cache Not Clearing

**Symptoms:** Old package versions still showing after update

**Solutions:**
```bash
# Clear via API
curl -X POST http://localhost:3000/registry/cache/clear

# Or restart server to clear memory cache
```

---

**Next Step:** Run `bun install` and verify packages load from private registries! 🚀

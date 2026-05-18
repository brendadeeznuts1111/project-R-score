# Registry Configuration

Fire22 Dashboard Worker uses a multi-registry setup for package management and
deployment.

## Registry Overview

### Primary Registry

- **URL**: `https://registry.npmjs.org/`
- **Usage**: Public npm packages and dependencies
- **Authentication**: Not required for public packages

### Fire22 Private Registry

- **URL**: `https://fire22.workers.dev/registry/`
- **Usage**: Private Fire22 packages and internal workspaces
- **Scope**: `@fire22/*`
- **Authentication**: Required

### Cloudflare Workers Registry

- **URL**: Managed through Wrangler
- **Usage**: Cloudflare Worker deployments
- **Authentication**: Cloudflare API token

## Configuration

### NPM Configuration (`.npmrc`)

```ini
# Main registry for public packages
registry=https://registry.npmjs.org/

# Scoped registry for Fire22 packages
@fire22:registry=https://fire22.workers.dev/registry/
@fire22:access=restricted
@fire22:always-auth=true

# Security and audit settings
audit=true
audit-level=high
audit-signatures=true

# Performance settings
prefer-offline=true
cache-min=86400

```

### Bun Configuration (`bunfig.toml`)

```toml
[install]
# Registry configuration
registry = "https://registry.npmjs.org/"
cache = true
frozen-lockfile = true
production = false

[install.scopes]
# Fire22 private registry
"@fire22" = "https://fire22.workers.dev/registry/"

[publish]
# Default publish settings
access = "restricted"
registry = "https://fire22.workers.dev/registry/"
```

## Package Scopes

### Public Packages (`npm`)

- External dependencies
- Open source libraries
- Community packages

### Private Packages (`@fire22/*`)

- `@fire22/core-dashboard`
- `@fire22/pattern-system`
- `@fire22/api-client`
- `@fire22/sports-betting`
- `@fire22/telegram-integration`
- `@fire22/build-system`

## Authentication

### NPM Authentication

```bash
# Login to npm (if needed for private packages)
npm login --registry=https://registry.npmjs.org/

```

### Fire22 Registry Authentication

```bash
# Set auth token for Fire22 registry
npm config set @fire22:registry https://fire22.workers.dev/registry/
npm config set //fire22.workers.dev/registry/:_authToken YOUR_TOKEN_HERE
```

### Cloudflare Workers Authentication

```bash
# Wrangler login
wrangler login

# Or set API token
export CLOUDFLARE_API_TOKEN=your_token_here
```

## Publishing Workflows

### Publishing to Fire22 Registry

```bash
# Build and pack workspace
bun run build:packages

# Publish all workspaces
bun run workspace:publish

# Publish specific workspace
cd workspaces/@fire22-core-dashboard
bun publish --registry https://fire22.workers.dev/registry/
```

### Multi-Registry Publishing

The workspace orchestrator supports publishing to multiple registries:

```typescript
// Publishing configuration
const publishConfig = {
  registries: [
    {
      name: 'fire22-private',
      url: 'https://fire22.workers.dev/registry/',
      scope: '@fire22',
      access: 'restricted',
    },
    {
      name: 'npm-public',
      url: 'https://registry.npmjs.org/',
      scope: '@fire22-public',
      access: 'public',
    },
  ],
};
```

### Publishing Strategies

#### Stable Release

```bash
bun run workspace:publish --strategy stable
```

- Publishes to production registry
- Tags as `latest`
- No prerelease flags

#### Beta Release

```bash
bun run workspace:publish --strategy beta
```

- Publishes with `beta` tag
- Prerelease version
- Limited distribution

#### Development Release

```bash
bun run workspace:publish --strategy dev
```

- Publishes with `dev` tag
- Alpha versions
- Internal testing only

## Registry Management

### Package Versioning

```bash
# Automated version bumps
bun run version:patch   # 3.0.9 -> 3.0.10
bun run version:minor   # 3.0.9 -> 3.1.0
bun run version:major   # 3.0.9 -> 4.0.0

```

### Package Distribution

```bash
# Check package sizes before publish
bun run build:analyze

# Verify package contents
bun pack --dry-run

# Publish with verification
bun run publish --dry-run

```

### Registry Health Monitoring

```bash
# Check registry availability
bun run registry:health

# Validate package integrity
bun run registry:verify

# Monitor download statistics
bun run registry:stats

```

## Security

### Package Signing

- All packages are signed with GPG keys
- Signature verification enabled in `.npmrc`
- Automated signature checks in CI/CD

### Vulnerability Scanning

```bash
# Audit all dependencies
bun audit --audit-level high

# Check for vulnerabilities in production deps only
bun audit --production --audit-level critical
```

### Access Control

- Private registry requires authentication
- Workspace packages are access-restricted
- Role-based permissions for publishing

## Troubleshooting

### Authentication Issues

```bash
# Clear npm cache
npm cache clean --force

# Re-authenticate
npm logout
npm login --registry=https://fire22.workers.dev/registry/

# Verify authentication
npm whoami --registry=https://fire22.workers.dev/registry/
```

### Registry Connectivity

```bash
# Test registry connectivity
curl -I https://fire22.workers.dev/registry/

# Check DNS resolution
nslookup fire22.workers.dev

# Verify SSL certificate
openssl s_client -connect fire22.workers.dev:443

```

### Package Resolution

```bash
# Clear package cache
rm -rf node_modules package-lock.json bun.lockb

# Reinstall with verbose logging
bun install --verbose

# Check package resolution
bun ls @fire22/core-dashboard

```

## Best Practices

### Package Management

1. Use exact versions for production dependencies
2. Pin workspace versions with `workspace:*` protocol
3. Regular dependency audits and updates
4. Automated vulnerability scanning

### Publishing

1. Always run tests before publishing
2. Use semantic versioning consistently
3. Include comprehensive package metadata
4. Verify package contents before publish

### Security

1. Enable audit signatures
2. Use scoped packages for internal code
3. Regular security audits
4. Keep authentication tokens secure

## Registry Monitoring

### Metrics Tracked

- Package download counts
- Registry availability
- Authentication success rates
- Package vulnerability reports
- Build and publish success rates

### Alerting

- Registry downtime alerts
- Failed publish notifications
- Security vulnerability alerts
- Unusual download pattern detection

## Support

For registry-related issues:

1. Check [Registry Status](https://fire22.workers.dev/registry/status)
2. Review
   [Issues](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues?q=label%3Aregistry)
3. Create new issue with `registry` label
4. Contact registry administrators: registry@fire22.com

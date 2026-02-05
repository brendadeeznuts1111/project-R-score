# 🔐 Private Registry Integration Guide

This guide covers setting up and using private registries with the Bun Proxy API package.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Manual Configuration](#manual-configuration)
- [Authentication](#authentication)
- [Publishing](#publishing)
- [Consuming Packages](#consuming-packages)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Prerequisites

Before you begin, ensure you have:

- **Bun** installed (`curl -fsSL https://bun.sh/install | bash`)
- **Private registry** URL and access credentials
- **Authentication token** from your registry administrator
- **Package scope** (e.g., `@your-org`)

## 🚀 Quick Setup

Use the automated setup script for fastest configuration:

```bash
# Run the setup script
./scripts/setup-registry.sh
```

The script will:
- Configure `.npmrc` and `bunfig.toml`
- Update `package.json` with registry settings
- Test registry connectivity
- Create publishing scripts

## ⚙️ Manual Configuration

### 1. Configure npm

Create `.npmrc`:

```ini
# Your private registry
registry=https://registry.your-org.com

# Authentication
//registry.your-org.com/:_authToken=${NPM_AUTH_TOKEN}
//registry.your-org.com/:always-auth=true

# Scoped packages
@your-org:registry=https://registry.your-org.com
```

### 2. Configure Bun

Create `bunfig.toml` (official Bun format):

```toml
[install]
# Default registry for all packages
registry = "https://registry.your-org.com"

# Alternative: Registry with token
# registry = { url = "https://registry.your-org.com", token = "$NPM_AUTH_TOKEN" }

# Alternative: Registry with username/password
# registry = "https://username:password@registry.your-org.com"

# Scoped packages configuration
scopes = { "@your-org" = "https://registry.your-org.com" }

# Cache configuration
cache = true
cacheDir = ".bun-cache"
lockfile = true
lockfileSave = true
```

**Environment Variables (Bun official):**

Bun automatically loads environment variables from `.env.local`, `.env.[NODE_ENV]`, and `.env` files:

```bash
# .env.local (highest priority)
NPM_AUTH_TOKEN=your-auth-token-here

# .env.development (when NODE_ENV=development)
NPM_AUTH_TOKEN=dev-token-here

# .env (fallback)
NPM_AUTH_TOKEN=default-token-here
```

```toml
# bunfig.toml - Bun automatically expands $NPM_AUTH_TOKEN
[install]
registry = { url = "https://registry.your-org.com", token = "$NPM_AUTH_TOKEN" }
scopes = { "@your-org" = "https://registry.your-org.com" }
```

**Priority Order:**
1. `.env.local` (highest priority)
2. `.env.[NODE_ENV]` (e.g., `.env.development`, `.env.production`)
3. `.env` (lowest priority)

### 3. Update package.json

```json
{
  "name": "@your-org/bun-proxy-api",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://registry.your-org.com",
    "access": "public"
  },
  "scripts": {
    "publish": "bun publish",
    "publish:dry": "bun publish --dry-run"
  }
}
```

## 🔄 Isolated Installs

Bun supports isolated installs (similar to pnpm) for better dependency management:

### 🎯 What are Isolated Installs?

Isolated installs provide strict dependency isolation:
- **Central Store**: All packages stored in `node_modules/.bun/package@version/`
- **Symlinks**: Top-level `node_modules` contains symlinks to the store
- **Deduplication**: Identical packages with same peer dependencies are shared
- **No Hoisting**: Dependencies can't access packages they don't directly depend on

### ⚙️ Configuration

```toml
# bunfig.toml
[install]
# Enable isolated installs (recommended)
linker = "isolated"

# Use traditional hoisted installs
# linker = "hoisted"
```

**Command Line:**
```bash
# Use isolated installs
bun install --linker isolated

# Use traditional hoisted installs
bun install --linker hoisted
```

**Default Behavior:**
```toml
# configVersion = 1 enables isolated installs (default for new projects)
configVersion = 1

# configVersion = 0 enables hoisted installs (npm/yarn compatibility)
configVersion = 0
```

### 📁 Directory Structure

```
node_modules/
├── .bun/                    # Central package store
│   ├── package@1.0.0/       # Versioned package installations
│   │   └── node_modules/
│   │       └── package/      # Actual package files
│   └── @your-org/            # Scoped packages
│       └── node_modules/
│           └── package/
└── package-name -> .bun/package@1.0.0/node_modules/package  # Symlinks
```

### 🚀 Benefits for Private Registry

1. **🔒 Better Isolation**: Prevents dependency conflicts
2. **💾 Disk Efficiency**: Deduplication saves space
3. **⚡ Faster Installs**: Central store reduces duplication
4. **🎯 Predictable**: Dependencies are strictly versioned

### 🔗 With Private Registries

Isolated installs work seamlessly with private registries:

```toml
[install]
registry = { url = "https://registry.your-org.com", token = "$NPM_AUTH_TOKEN" }
linker = "isolated"
scopes = { "@your-org" = "https://registry.your-org.com" }
```

## 🔑 Authentication

### Environment Variables

Set authentication token in your environment:

```bash
export NPM_AUTH_TOKEN="your-auth-token-here"
```

Or add to `.env` (don't commit this file):

```env
NPM_AUTH_TOKEN=your-auth-token-here
REGISTRY_URL=https://registry.your-org.com
```

### CI/CD Authentication

For GitHub Actions, use repository secrets:

```yaml
env:
  NPM_AUTH_TOKEN: ${{ secrets.NPM_AUTH_TOKEN }}
```

## 📦 Publishing

### Local Publishing

```bash
# Dry run to test
bun run publish:dry

# Actually publish
bun run publish
```

### Automated Publishing

Use the GitHub Actions workflow:

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or trigger manually
gh workflow run publish.yml
```

### Version Management

```bash
# Patch version
npm version patch

# Minor version
npm version minor

# Major version
npm version major
```

## 📥 Consuming Packages

### Installation

```bash
# Install from private registry
bun add @your-org/bun-proxy-api

# Install specific version
bun add @your-org/bun-proxy-api@1.0.0

# Install with dev flag
bun add -d @your-org/bun-proxy-api
```

### Usage in Projects

```typescript
import { ProxyServerConfig, BunProxyServer } from '@your-org/bun-proxy-api';

const config = new ProxyServerConfig({
  targetUrl: 'ws://localhost:8080/ws',
  listenPort: 3000,
});

const server = new BunProxyServer(config);
await server.start();
```

### Consumer Configuration

Consumers need to configure their registry access:

```ini
# Consumer's .npmrc
@your-org:registry=https://registry.your-org.com
//registry.your-org.com/:_authToken=${CONSUMER_AUTH_TOKEN}
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Configure registry
        run: |
          echo "//registry.your-org.com/:_authToken=${{ secrets.NPM_AUTH_TOKEN }}" > .npmrc
          echo "@your-org:registry=https://registry.your-org.com" >> .npmrc

      - name: Install dependencies
        run: bun install

      - name: Test
        run: bun test

      - name: Build
        run: bun run build
```

### Other CI Systems

For Jenkins, GitLab CI, etc., use environment variables:

```bash
# Set authentication
export NPM_AUTH_TOKEN="$PRIVATE_REGISTRY_TOKEN"

# Install from private registry
bun install --registry=https://registry.your-org.com
```

## 🛠️ Registry Options

### Popular Private Registries

1. **npm Enterprise**
   - URL: `https://registry.npmjs.org`
   - Features: Enhanced security, granular permissions

2. **GitHub Packages**
   - URL: `https://npm.pkg.github.com`
   - Features: Integrated with GitHub, free for public repos

3. **Verdaccio**
   - Self-hosted, lightweight
   - URL: `https://verdaccio.your-org.com`

4. **Artifactory**
   - Enterprise-grade, JFrog
   - URL: `https://artifactory.your-org.com/artifactory/api/npm/npm`

5. **Nexus**
   - Sonatype, enterprise features
   - URL: `https://nexus.your-org.com/repository/npm-private`

### GitHub Packages Example

```ini
# .npmrc for GitHub Packages
registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
@your-org:registry=https://npm.pkg.github.com
```

```toml
# bunfig.toml for GitHub Packages
[install]
registry = "https://npm.pkg.github.com"
scopes = { "@your-org" = "https://npm.pkg.github.com" }
```

## 📚 Official Bun Documentation

This implementation follows Bun's official documentation and best practices:

- **Custom Registry**: https://bun.com/docs/guides/install/custom-registry
- **Scoped Registries**: https://bun.com/docs/guides/install/registry-scope
- **Environment Variables**: https://bun.com/docs/runtime/environment-variables
- **Package Manager**: https://bun.com/docs/pm/cli/install

### 🔗 Key Differences from npm

Bun's registry configuration differs from npm in several ways:

1. **Configuration File**: Uses `bunfig.toml` instead of `.npmrc` for primary config
2. **Token Format**: Supports object syntax with `url` and `token` properties
3. **Environment Variables**: Automatically expands `$VAR_NAME` in config files
4. **Scoped Packages**: Uses `scopes` object instead of multiple registry lines

### 🎯 Bun-Specific Best Practices

```toml
# ✅ Recommended Bun configuration
[install]
registry = { url = "https://registry.your-org.com", token = "$NPM_AUTH_TOKEN" }
scopes = { "@your-org" = "https://registry.your-org.com" }
linker = "isolated"
cache = true
lockfile = true
```

```bash
# ✅ Set environment variable for token
export NPM_AUTH_TOKEN="your-token-here"

# ✅ Install from private registry with isolated installs
bun install
```

### 🔄 Isolated Installs Benefits

- **Strict Dependency Isolation**: Prevents phantom dependencies
- **Disk Efficiency**: Central store with deduplication
- **Faster Installation**: Reduced duplication
- **Predictable Dependencies**: No hoisting surprises

## 🔍 Troubleshooting

### Common Issues

#### 1. Authentication Errors

```
Error: 401 Unauthorized
```

**Solution:**
- Check your auth token is correct
- Ensure token has publish permissions
- Verify registry URL matches token scope

#### 2. Registry Not Found

```
Error: E404 Not Found - GET https://registry.your-org.com/@your-org%2fbun-proxy-api
```

**Solution:**
- Verify registry URL is accessible
- Check package name and scope
- Ensure package exists in registry

#### 3. Network Issues

```
Error: getaddrinfo ENOTFOUND registry.your-org.com
```

**Solution:**
- Check DNS resolution
- Verify network connectivity
- Check firewall/proxy settings

#### 4. Permission Denied

```
Error: E403 Forbidden - PUT https://registry.your-org.com/@your-org%2fbun-proxy-api
```

**Solution:**
- Verify user has publish permissions
- Check if package name is already taken
- Ensure scope is correctly configured

### Debug Commands

```bash
# Test registry connectivity
npm ping --registry https://registry.your-org.com

# Check package info
npm info @your-org/bun-proxy-api --registry https://registry.your-org.com

# List installed packages
bun pm ls --all

# Check configuration
bun pm config list
```

### Logging

Enable debug logging:

```bash
# Enable npm debug
npm config set loglevel verbose

# Enable bun debug
DEBUG=bun:* bun install
```

## 📚 Best Practices

### Security

1. **Never commit** `.npmrc` with auth tokens
2. **Use environment variables** for authentication
3. **Rotate tokens** regularly
4. **Limit permissions** to minimum required
5. **Use CI/CD secrets** for automated publishing

### Performance

1. **Enable caching** in bunfig.toml
2. **Use lockfiles** for reproducible builds
3. **Configure .npmrc** for optimal registry access
4. **Monitor registry performance**

### Maintenance

1. **Version packages** semantically
2. **Document breaking changes**
3. **Clean up old versions** periodically
4. **Monitor registry storage** usage

## 🆘 Support

If you encounter issues:

1. **Check this guide** for common solutions
2. **Review registry documentation** for specific setup
3. **Contact your registry administrator** for access issues
4. **Create an issue** in the project repository

## 📖 Additional Resources

- [Bun Package Manager Documentation](https://bun.sh/docs/packages/registry)
- [npm Registry Documentation](https://docs.npmjs.com/using-private-packages)
- [GitHub Packages Guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Verdaccio Documentation](https://verdaccio.org/docs/)

---

**Note**: Replace `your-org.com` and `@your-org` with your actual registry URL and organization scope.

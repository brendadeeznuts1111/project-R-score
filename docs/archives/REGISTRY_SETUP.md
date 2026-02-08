# 📦 Private NPM Registry - Setup Guide

A private npm registry implementation backed by Cloudflare R2 with CDN support.

## 🌟 Features

- **R2 Storage**: Packages stored in Cloudflare R2 (S3-compatible)
- **Edge Caching**: CDN distribution via Cloudflare Workers
- **Multiple Auth Modes**: None, Basic, Token, or JWT
- **npm CLI Compatible**: Works with standard npm/yarn/pnpm commands
- **Package Proxy**: Optional fallback to npm registry
- **Signed URLs**: Secure private package access

## 🏗️ Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   npm Client    │────▶│  Cloudflare CDN  │────▶│   R2 Storage    │
│  (publish/get)  │     │  (Worker/Cache)  │     │ (npm-registry)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Local Server    │
                        │  (dev/testing)   │
                        └──────────────────┘
```

## 🚀 Quick Start

### 1. Environment Setup

Create `.env.registry` file:

```bash
# R2 Configuration
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_REGISTRY_BUCKET=npm-registry

# Registry Server
REGISTRY_PORT=4873
REGISTRY_AUTH=none  # none, basic, token, jwt
REGISTRY_SECRET=your-secret-key
REGISTRY_CDN_URL=https://registry.factory-wager.com
```

### 2. Create R2 Bucket

```bash
# Using r2-enhanced-cli
bun run r2

# Or via Cloudflare dashboard:
# https://dash.cloudflare.com/your-account/r2/buckets
# Create bucket: npm-registry
```

### 3. Start Local Registry

```bash
# Development mode (no auth)
bun run lib/registry/server.ts

# With basic auth
REGISTRY_AUTH=basic REGISTRY_SECRET=admin123 bun run lib/registry/server.ts

# Using the CLI
bun run registry start --port 4873 --auth basic
```

### 4. Configure npm Client

```bash
# Set registry
npm config set registry http://localhost:4873

# Or per-scope
npm config set @factorywager:registry http://localhost:4873

# With authentication
npm config set //localhost:4873/:_authToken="your-token"
```

## 📦 Publishing Packages

### Via CLI

```bash
# Publish current directory
bun run registry publish

# Publish specific directory
bun run registry publish ./my-package

# With custom registry
bun run registry publish --registry http://localhost:4873
```

### Via npm

```bash
# Standard npm publish (with registry configured)
npm publish

# With explicit registry
npm publish --registry http://localhost:4873
```

## 🔍 Managing Packages

```bash
# Search packages
bun run registry search utils

# Show package info
bun run registry info @factorywager/my-package

# List all packages
bun run registry list

# Unpublish a version
bun run registry unpublish @factorywager/my-package --version 1.0.0

# Unpublish entire package
bun run registry unpublish @factorywager/my-package
```

## 🔐 Authentication

### No Auth (Development)

```bash
REGISTRY_AUTH=none bun run registry start
```

### Basic Auth

```bash
# Start server
REGISTRY_AUTH=basic REGISTRY_SECRET=admin123 bun run registry start

# Configure npm
npm config set //localhost:4873/:username=admin
npm config set //localhost:4873/:_password=$(echo -n 'admin123' | base64)
```

### Token Auth

```bash
# Generate token
bun run registry tokens create admin

# Configure npm
npm config set //localhost:4873/:_authToken="generated-token"
```

### JWT Auth

```bash
# Start server
REGISTRY_AUTH=jwt REGISTRY_SECRET=your-jwt-secret bun run registry start

# Login (npm will request token)
npm login --registry http://localhost:4873
```

## 🌐 CDN Deployment

### Deploy Worker

```bash
# Install Wrangler if needed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put JWT_SECRET -c registry-wrangler.toml

# Deploy
wrangler deploy -c registry-wrangler.toml

# Or with environment
wrangler deploy -c registry-wrangler.toml --env production
```

### Configure DNS

Add DNS record for `registry.factory-wager.com`:
```text
Type: CNAME
Name: npm
Target: npm-registry-cdn.your-account.workers.dev
Proxy Status: Proxied (orange cloud)
```

### Configure npm for CDN

```bash
# Use CDN URL
npm config set registry https://registry.factory-wager.com

# With authentication
npm config set //registry.factory-wager.com/:_authToken="your-token"
```

## 📊 Monitoring

```bash
# Registry stats
bun run registry stats

# Configuration
bun run registry config

# Server logs (when running)
# Logs are output to stdout
```

## 🔧 Advanced Configuration

### Custom Storage Location

```typescript
// In server.ts or cli.ts
const server = new NPMRegistryServer({
  storage: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: 'custom-bucket',
    prefix: 'custom-prefix/',
  },
});
```

### Package Access Control

```typescript
// Configure package patterns
const server = new NPMRegistryServer({
  packages: [
    { pattern: '@factorywager/*', access: 'authenticated' },
    { pattern: 'public-*', access: 'all' },
    { pattern: '*', access: 'restricted' },
  ],
});
```

### Upstream Proxy

```bash
# Enable proxying to npm registry
REGISTRY_PROXY=true bun run registry start

# Custom upstream
REGISTRY_UPSTREAM=https://registry.yarnpkg.com bun run registry start
```

## 📝 npm CLI Integration

### Install from Private Registry

```bash
# Install specific package
npm install @factorywager/my-package --registry https://registry.factory-wager.com

# Or with registry configured
npm install @factorywager/my-package
```

### Scoped Packages

```bash
# Set registry for scope
npm config set @factorywager:registry https://registry.factory-wager.com

# Install
npm install @factorywager/utils
npm install @factorywager/components
```

### Publishing Scoped Packages

```json
{
  "name": "@factorywager/my-package",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://registry.factory-wager.com",
    "access": "restricted"
  }
}
```

## 🧪 Testing

```bash
# Start local registry
bun run registry start &

# Test ping
npm ping --registry http://localhost:4873

# Test publish
cd test-package && npm publish --registry http://localhost:4873

# Test install
npm install test-package --registry http://localhost:4873
```

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test R2 connection
bun run lib/registry/r2-storage.ts

# Check credentials
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
```

### Authentication Errors

```bash
# Check token
cat ~/.npmrc | grep registry

# Clear npm cache
npm cache clean --force

# Login again
npm login --registry http://localhost:4873
```

### Package Not Found

```bash
# Verify package exists
bun run registry info package-name

# Check R2 directly
bun run r2 list --prefix=packages/package-name/
```

## 📚 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/-/ping` | GET | Health check |
| `/-/v1/login` | POST | Authenticate |
| `/-/whoami` | GET | Current user |
| `/-/search` | GET | Search packages |
| `/-/all` | GET | List all packages |
| `/:package` | GET | Get package manifest |
| `/:package` | PUT | Publish package |
| `/:package/-/package-dist-tags` | GET/PUT | Manage dist-tags |
| `/:package/-/:tarball` | GET | Download tarball |

## 🔒 Security Considerations

1. **Always use HTTPS in production**
2. **Use strong JWT secrets**
3. **Rotate access keys regularly**
4. **Enable rate limiting**
5. **Monitor audit logs**
6. **Use signed URLs for private packages**

## 📄 License

MIT - FactoryWager Private Registry

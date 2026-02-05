# Private Registry Setup Guide

This guide covers setting up Foxy Proxy for publishing to private npm registries.

## Table of Contents

- [GitHub Packages](#github-packages)
- [Verdaccio](#verdaccio)
- [npm Private Registry](#npm-private-registry)
- [Configuration](#configuration)
- [Publishing](#publishing)
- [Consuming](#consuming)

## GitHub Packages

### Overview

GitHub Packages provides a hosted npm registry with automatic access control through GitHub.

### Prerequisites

- GitHub account with repository access
- Personal Access Token (PAT) with `packages:write` scope

### Setup

1. **Create Personal Access Token**:
   - Go to Settings > Developer settings > Personal access tokens
   - Click "Generate new token"
   - Select scopes:
     - `packages:write` - Publish packages
     - `packages:read` - Install packages
     - `repo` - Repository access
   - Copy the token for later use

2. **Create `.npmrc` in project root**:

```
@brendadeeznuts1111:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
registry=https://registry.npmjs.org/
```

3. **Set NPM_TOKEN environment variable**:

```bash
# For local development
export NPM_TOKEN=your_personal_access_token

# In GitHub Actions (set as secret)
# Go to Settings > Secrets and variables > Actions
# Create secret: NPM_TOKEN
```

### Publishing to GitHub Packages

1. **Update package.json**:

```json
{
  "name": "@brendadeeznuts1111/foxy-proxy-dashboard",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

2. **Publish package**:

```bash
# Ensure you're authenticated
npm login --registry https://npm.pkg.github.com

# Publish
npm publish

# Or with bun
bun publish
```

### GitHub Actions Workflow

Create `.github/workflows/publish-github.yml`:

```yaml
name: Publish to GitHub Packages

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - name: Setup npm registry
        run: |
          cat > .npmrc << EOF
          @brendadeeznuts1111:registry=https://npm.pkg.github.com
          //npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}
          registry=https://registry.npmjs.org/
          EOF

      - name: Publish to GitHub Packages
        run: npm publish
```

## Verdaccio

### Overview

Verdaccio is a lightweight, self-hosted private proxy registry for npm packages.

### Docker Setup

1. **Create docker-compose.yml**:

```yaml
version: "3.8"

services:
  verdaccio:
    image: verdaccio:latest
    ports:
      - "4873:4873"
    volumes:
      - verdaccio-storage:/verdaccio/storage
      - ./verdaccio.yaml:/verdaccio/conf/config.yaml
    environment:
      - NODE_ENV=production

volumes:
  verdaccio-storage:
    driver: local
```

2. **Create verdaccio.yaml**:

```yaml
storage: /verdaccio/storage
auth:
  htpasswd:
    file: /verdaccio/conf/htpasswd

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  "@brendadeeznuts1111/*":
    access: $authenticated
    publish: $authenticated
    proxy: npmjs

  "@*/*":
    access: $authenticated
    publish: $authenticated
    proxy: npmjs

  "**":
    access: $authenticated
    publish: $authenticated
    proxy: npmjs

middlewares:
  audit:
    enabled: true

listen: 0.0.0.0:4873
```

3. **Start Verdaccio**:

```bash
docker-compose up -d

# Check if running
curl http://localhost:4873

# Create user
npm adduser --registry http://localhost:4873
```

### Configuration

1. **Create user account**:

```bash
npm adduser --registry http://localhost:4873
# Enter credentials when prompted
```

2. **Create .npmrc in project**:

```
@brendadeeznuts1111:registry=http://localhost:4873
//localhost:4873/:_authToken=your_token_here
registry=http://localhost:4873
```

3. **Login**:

```bash
npm login --registry http://localhost:4873
```

## npm Private Registry

### Overview

Official npm private packages for organizations.

### Prerequisites

- npm account with paid plan
- Organization membership

### Setup

1. **Create Organization**:
   - Go to [npmjs.com](https://npmjs.com)
   - Create organization
   - Add team members

2. **Update package.json**:

```json
{
  "name": "@brendadeeznuts1111/foxy-proxy",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/"
  }
}
```

3. **Create .npmrc**:

```
@brendadeeznuts1111:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=your_npm_token
```

4. **Publish**:

```bash
npm publish
```

## Configuration

### Local Development .npmrc

```bash
# For GitHub Packages
@brendadeeznuts1111:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN}

# For Verdaccio (local)
@brendadeeznuts1111:registry=http://localhost:4873
//localhost:4873/:_authToken=${VERDACCIO_TOKEN}

# Fallback to public npm
registry=https://registry.npmjs.org/
```

### CI/CD Configuration

**GitHub Actions**:

```yaml
- name: Setup npm registry
  run: |
    npm config set @brendadeeznuts1111:registry https://npm.pkg.github.com
    npm config set //npm.pkg.github.com/:_authToken ${{ secrets.NPM_TOKEN }}
```

**Environment Variables**:

```bash
# GitHub Actions Secrets
NPM_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERDACCIO_URL=http://verdaccio:4873
VERDACCIO_TOKEN=verdaccio-token
```

## Publishing

### Single Package

```bash
cd packages/dashboard

# Increment version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Build
bun run build

# Create git tag
git tag v1.0.1
git push origin v1.0.1

# Publish
npm publish
```

### Monorepo Publishing

```bash
# Publish from root (publishes all public packages)
npm run publish --workspace

# Or publish individual packages
npm publish packages/dashboard
npm publish packages/cli
```

### Automated Publishing

**GitHub Actions Workflow** (`.github/workflows/publish.yml`):

```yaml
name: Publish Packages

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - name: Setup npm auth
        run: |
          cat > ~/.npmrc << EOF
          @brendadeeznuts1111:registry=https://npm.pkg.github.com
          //npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}
          registry=https://registry.npmjs.org/
          EOF

      - name: Get version from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Update package.json versions
        run: |
          npm version ${{ steps.version.outputs.version }} --no-git-tag-version

      - name: Publish to GitHub Packages
        run: npm publish

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: Published version ${{ steps.version.outputs.version }}
```

## Consuming

### Install from GitHub Packages

1. **Create .npmrc** in consuming project:

```
@brendadeeznuts1111:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

2. **Install package**:

```bash
npm install @brendadeeznuts1111/foxy-proxy-dashboard

# Or with bun
bun add @brendadeeznuts1111/foxy-proxy-dashboard
```

### Install from Verdaccio

```bash
npm install @brendadeeznuts1111/foxy-proxy-dashboard \
  --registry http://your-verdaccio-server:4873
```

### Install from Private Registry

```bash
npm install @brendadeeznuts1111/foxy-proxy-dashboard
```

## Troubleshooting

### Authentication Issues

**Problem**: "401 Unauthorized"

```bash
# Clear npm cache
npm cache clean --force

# Re-authenticate
npm logout --registry https://npm.pkg.github.com
npm login --registry https://npm.pkg.github.com
```

**Problem**: "token has expired"

```bash
# Generate new token
# GitHub: Settings > Developer settings > Personal access tokens
# npm: npmjs.com > Account settings > Tokens

# Update .npmrc with new token
```

### Package Not Found

**Problem**: "404 Not Found"

```bash
# Verify package exists
npm view @brendadeeznuts1111/foxy-proxy-dashboard

# Check registry configuration
npm config get registry

# Verify authentication
npm whoami --registry https://npm.pkg.github.com
```

### Build/Publish Failed

```bash
# Clear build cache
bun clean
rm -rf dist node_modules

# Reinstall
bun install

# Rebuild and republish
bun run build
npm publish
```

## Best Practices

1. **Version Management**:
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Tag all releases in git
   - Document breaking changes in CHANGELOG

2. **Authentication**:
   - Use tokens instead of passwords
   - Rotate tokens regularly
   - Never commit auth tokens
   - Use environment variables in CI/CD

3. **Publishing**:
   - Always test locally before publishing
   - Run linter and tests before publishing
   - Use CI/CD for automated publishing
   - Maintain separate staging registry

4. **Documentation**:
   - Include README in published package
   - Document all public APIs
   - Provide usage examples
   - Maintain CHANGELOG

## Additional Resources

- [GitHub Packages Registry Documentation](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages)
- [Verdaccio Documentation](https://verdaccio.org/)
- [npm Private Packages](https://docs.npmjs.com/about-private-packages)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

---

**Need Help?**

- Check [Troubleshooting](./TROUBLESHOOTING.md)
- Report issues on [GitHub](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)

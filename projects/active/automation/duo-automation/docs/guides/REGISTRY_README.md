# Custom NPM Registry - v3.7 Deployment

## 🚀 Registry Information

**Registry URL**: `https://duo-npm-registry.utahj4754.workers.dev`  
**Status**: ✅ Production Ready  
**Authentication**: Bearer Token  
**Storage**: Cloudflare R2  

## 📦 Available Packages

### `windsurf-project@2.4.0`
- **Description**: Enterprise automation framework with CLI tools and utilities
- **Size**: 8.35MB unpacked (1.87MB packed)
- **Files**: 868 files included
- **Version**: 2.4.0
- **Binaries**: windsurf-cli, ep-cli, duo-cli, taxonomy-cli

## 🛠️ Usage Commands

### Quick Start
```bash
# Install from custom registry
bun install windsurf-project --registry https://duo-npm-registry.utahj4754.workers.dev

# Or use the convenience script
bun run install:custom
```

### Package Management
```bash
# Get package information
bun run registry:info windsurf-project

# Search available packages
bun run registry:search

# Test deployment status
bun run test:deploy
```

### Publishing Updates
```bash
# Publish new version
bun run deploy:v3.7

# This runs the full publish pipeline:
# 1. Hygiene checks
# 2. Diagnostics
# 3. Package building
# 4. Registry deployment
```

## 🔐 Authentication

The registry uses Bearer token authentication. The token is automatically managed by the deployment scripts.

**Token**: Base64-encoded npm session token (managed by Bun)
**Value**: `Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==`

## 🌐 HTTP Access

For direct HTTP access or integration with other tools:

```bash
curl -H "Authorization: Bearer Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==" \
  https://duo-npm-registry.utahj4754.workers.dev/windsurf-project
```

## 📋 Integration Examples

### npm Client Setup
```bash
# Set registry for your scope
npm config set @your-scope:registry https://duo-npm-registry.utahj4754.workers.dev

# Set authentication token
npm config set //duo-npm-registry.utahj4754.workers.dev/:_authToken Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==

# Install packages
npm install windsurf-project
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Install from Custom Registry
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: |
    echo "//duo-npm-registry.utahj4754.workers.dev/:_authToken=${NPM_TOKEN}" >> .npmrc
    bun install windsurf-project --registry https://duo-npm-registry.utahj4754.workers.dev
```

### Docker Integration
```dockerfile
# Dockerfile example
COPY .npmrc .npmrc
RUN bun install --registry https://duo-npm-registry.utahj4754.workers.dev
```

## 🚨 Limitations

- `bun info` command doesn't work with custom registries (known limitation)
- Use `bun run registry:info` instead for package information
- HTTP access and standard npm clients work perfectly

## 📞 Support

For registry issues:
1. Check deployment status: `bun run test:deploy`
2. Verify package access: `bun run registry:info windsurf-project`
3. Review logs in Cloudflare Workers dashboard

---

**Registry deployed successfully!** 🎉  
*Last updated: January 14, 2026*

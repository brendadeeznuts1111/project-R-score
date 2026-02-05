# 🔄 Migration Guide: Extract Registry to Dedicated Repo

## 📋 Pre-Migration Checklist

- [ ] Backup current repository
- [ ] Verify all tests pass
- [ ] Document current environment variables
- [ ] Notify team of migration

## 🚀 Migration Steps

### Step 1: Create New Repository

```bash
# Create directory
mkdir factorywager-registry
cd factorywager-registry

# Copy migration scaffold
cp -r /Users/nolarose/Projects/registry-migration/* .

# Initialize git
git init
git add .
git commit -m "chore: initial registry scaffold"
```

### Step 2: Run Migration Script

```bash
# From new repo
bun run scripts/migrate-from-monorepo.ts /Users/nolarose/Projects

# This will:
# - Copy all registry files
# - Update imports for new structure
# - Create index.ts files
# - Report any issues
```

### Step 3: Install Dependencies

```bash
# Install all workspace dependencies
bun install

# Verify installation
bun run typecheck
```

### Step 4: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with production values
nano .env
```

Required variables:
```bash
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_REGISTRY_BUCKET=npm-registry
REGISTRY_SECRET=xxx
JWT_SECRET=xxx
```

### Step 5: Test Migration

```bash
# Build all packages
bun run build

# Run tests
bun run test

# Start server locally
bun run dev
```

### Step 6: Deploy

```bash
# Deploy to staging
bun run deploy:staging

# Test staging
npm ping --registry https://registry-staging.factory-wager.com

# Deploy to production
bun run deploy:production
```

### Step 7: Update Current Repo

In your current monorepo:

```bash
# Remove old registry code
git rm -rf lib/registry

# Add dependency on new packages
bun add @factorywager/registry-core
bun add @factorywager/secrets

# Update imports
# Old: import { ... } from './lib/registry'
# New: import { ... } from '@factorywager/registry-core'

# Commit
git add .
git commit -m "refactor: migrate registry to dedicated repo"
```

## 📁 New Structure

```
factorywager-registry/
├── packages/                    # Shared packages
│   ├── registry-core/          # Types, auth, config
│   ├── r2-storage/             # R2 storage adapter
│   ├── semver/                 # bun.semver wrapper
│   ├── secrets/                # bun.secrets manager
│   ├── bunx/                   # bun x integration
│   └── version-graph/          # Visual graphs
│
├── apps/                        # Deployable apps
│   ├── registry-server/        # NPM registry server
│   ├── registry-cli/           # CLI tool
│   └── registry-worker/        # Cloudflare Worker
│
├── scripts/                     # Build & deploy
│   ├── migrate-from-monorepo.ts
│   ├── bump-version.ts
│   └── publish-packages.ts
│
├── docs/                        # Documentation
├── .github/workflows/           # CI/CD
└── package.json                 # Workspace root
```

## 🔧 Import Mapping

| Old Import | New Import |
|------------|------------|
| `../theme/colors.ts` | `@factorywager/theme` |
| `./registry-types.ts` | `@factorywager/registry-core/types` |
| `./r2-storage.ts` | `@factorywager/r2-storage` |
| `./auth.ts` | `@factorywager/registry-core/auth` |
| `./version-manager.ts` | `@factorywager/semver` |
| `./secrets-manager.ts` | `@factorywager/secrets` |
| `./bunx-integration.ts` | `@factorywager/bunx` |

## 🧪 Testing Checklist

- [ ] All packages build successfully
- [ ] Tests pass in all packages
- [ ] Server starts locally
- [ ] CLI commands work
- [ ] Worker deploys to staging
- [ ] Can publish package to staging
- [ ] Can install package from staging
- [ ] Version graphs render correctly
- [ ] Secrets manager works
- [ ] bun x integration works

## 🚨 Rollback Plan

If issues arise:

1. **Stop deployments**
   ```bash
   # Cancel any running GitHub Actions
   ```

2. **Revert DNS** (if changed)
   ```bash
   # Point npm.factory-wager.com back to old registry
   ```

3. **Restore monorepo**
   ```bash
   cd /Users/nolarose/Projects
   git revert HEAD  # Revert migration commit
   ```

4. **Notify team**
   ```bash
   # Announce rollback in team chat
   ```

## 📊 Post-Migration Verification

```bash
# 1. Verify packages are published
npm view @factorywager/registry-core

# 2. Test registry server
curl https://npm.factory-wager.com/-/ping

# 3. Test package publish
npm publish --registry https://npm.factory-wager.com

# 4. Test package install
npm install @factorywager/test-package

# 5. Test version graph
curl https://npm.factory-wager.com/-/graph/lodash

# 6. Test secrets
bun run secrets:set test "value"
bun run secrets:get test
```

## 🎯 Success Criteria

- [ ] Registry deployed to production
- [ ] All packages published to GitHub/npm
- [ ] Current repo updated to use packages
- [ ] Documentation updated
- [ ] Team trained on new workflow
- [ ] Monitoring in place
- [ ] Rollback tested

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Slack**: #registry-support

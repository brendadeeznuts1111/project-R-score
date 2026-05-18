# 🚀 Fire22 Dashboard Deployment Guide

## Overview

This guide covers deploying the Fire22 Dashboard Worker to various environments,
with a focus on Cloudflare Workers for production deployment.

## Prerequisites

### Required Tools

- **Bun** >= 1.2.20
- **Wrangler CLI** >= 3.0.0
- **Git** for version control
- **GitHub CLI** (optional, for actions)

### Required Accounts

- **Cloudflare Account** with Workers subscription
- **GitHub Account** for CI/CD
- **PostgreSQL Database** (production)

### Required Secrets

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_ZONE_ID

# Fire22 Integration
FIRE22_API_KEY
FIRE22_API_SECRET
FIRE22_WEBHOOK_SECRET

# Authentication
JWT_SECRET
ADMIN_PASSWORD

# Database
DATABASE_URL
```

## Environment Setup

### 1. Development Environment

```bash
# Clone repository
git clone https://github.com/brendadeeznuts1111/fire22-dashboard-worker.git
cd fire22-dashboard-worker

# Install dependencies
bun install --frozen-lockfile

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run development server
bun run dev
```

### 2. Staging Environment

```bash
# Configure staging secrets
wrangler secret put JWT_SECRET --env staging
wrangler secret put FIRE22_API_KEY --env staging
wrangler secret put DATABASE_URL --env staging

# Deploy to staging
bun run deploy:staging

# Verify deployment
curl https://staging.fire22-dashboard.workers.dev/health
```

### 3. Production Environment

```bash
# Configure production secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put FIRE22_API_KEY --env production
wrangler secret put DATABASE_URL --env production

# Build production assets
bun run build:production

# Deploy to production
bun run deploy:production
```

## Cloudflare Workers Deployment

### 1. Initial Setup

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Configure wrangler.toml

```toml
name = "fire22-dashboard-worker"
main = "dist/index.js"
compatibility_date = "2024-01-01"
node_compat = true

[vars]
ENVIRONMENT = "production"
API_VERSION = "2.0.0"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-id"

[[d1_databases]]
binding = "DB"
database_name = "fire22-prod"
database_id = "your-d1-database-id"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "fire22-assets"

[env.staging]
name = "fire22-dashboard-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "fire22-dashboard-production"
routes = [
  { pattern = "dashboard.fire22.ag/*", zone_id = "your-zone-id" }
]
vars = { ENVIRONMENT = "production" }

[build]
command = "bun run build:cloudflare"

[triggers]
crons = ["0 */4 * * *"]

[[analytics_datasets]]
binding = "ANALYTICS"
```

### 3. Create Resources

```bash
# Create KV namespace
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview

# Create D1 database
wrangler d1 create fire22-prod
wrangler d1 execute fire22-prod --file=./schema.sql

# Create R2 bucket
wrangler r2 bucket create fire22-assets
```

### 4. Deploy Application

```bash
# Build application
bun run build:cloudflare

# Deploy to Cloudflare
wrangler deploy --env production

# Monitor deployment
wrangler tail --env production
```

### 5. Configure Custom Domain

```bash
# Add custom domain
wrangler domains add dashboard.fire22.ag

# Verify DNS
dig dashboard.fire22.ag

# Test with curl
curl -I https://dashboard.fire22.ag/health
```

## GitHub Actions CI/CD

### 1. Setup Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: 1.2.20

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun test

      - name: Type check
        run: bun run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: 1.2.20

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build production
        run: bun run build:production

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          environment: production

      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://dashboard.fire22.ag/health || exit 1

      - name: Notify success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Production deployment successful!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Configure Secrets

```bash
# Add secrets to GitHub repository
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set FIRE22_API_KEY
gh secret set JWT_SECRET
gh secret set DATABASE_URL
```

### 3. Setup Branch Protection

```bash
# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1}'
```

## Progressive Deployment

### 1. Canary Deployment

```typescript
// wrangler.toml
[env.canary]
name = "fire22-dashboard-canary"
routes = [
  { pattern = "canary.dashboard.fire22.ag/*", zone_id = "your-zone-id" }
]

[env.canary.triggers]
crons = []

// Deploy canary
wrangler deploy --env canary

// Route 5% traffic
// In Cloudflare Dashboard:
// - Create Traffic Rule
// - Expression: random() `&lt; 0.05
// - Action: Route to canary worker
```

### 2. Blue-Green Deployment

```bash
# Deploy to green environment
wrangler deploy --env green

# Test green environment
./scripts/test-deployment.sh green

# Switch traffic to green
wrangler deploy --env production --var UPSTREAM=green

# Rollback if needed
wrangler deploy --env production --var UPSTREAM=blue
```

### 3. Regional Deployment

```yaml
# Deploy to specific regions
regions:
  us-east:
    worker: fire22-dashboard-us-east
    routes: ['us.dashboard.fire22.ag/*']

  eu-west:
    worker: fire22-dashboard-eu-west
    routes: ['eu.dashboard.fire22.ag/*']

  ap-southeast:
    worker: fire22-dashboard-ap-southeast
    routes: ['asia.dashboard.fire22.ag/*']
```

## Database Migration

### 1. PostgreSQL to D1 Migration

```bash
# Export PostgreSQL data
pg_dump $DATABASE_URL &gt;` backup.sql

# Transform for D1
bun run scripts/migrate-to-d1.ts backup.sql

# Import to D1
wrangler d1 execute fire22-prod --file=d1-migration.sql

# Verify migration
wrangler d1 execute fire22-prod --command="SELECT COUNT(*) FROM customers"
```

### 2. Schema Updates

```bash
# Create migration
bun run migrate:create add-customer-tier

# Test migration locally
bun run migrate:up

# Apply to production
wrangler d1 execute fire22-prod --file=migrations/001_add_customer_tier.sql
```

## Monitoring & Rollback

### 1. Health Monitoring

```bash
# Setup monitoring endpoints
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -d "api_key=$UPTIME_KEY" \
  -d "friendly_name=Fire22 Dashboard" \
  -d "url=https://dashboard.fire22.ag/health" \
  -d "type=1"
```

### 2. Performance Monitoring

```typescript
// Add performance tracking
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = performance.now();

    try {
      const response = await handleRequest(request, env);

      // Log metrics
      env.ANALYTICS.writeDataPoint({
        timestamp: Date.now(),
        latency: performance.now() - start,
        status: response.status,
        path: new URL(request.url).pathname,
      });

      return response;
    } catch (error) {
      // Alert on errors
      await notifyError(error, env);
      throw error;
    }
  },
};
```

### 3. Automatic Rollback

```yaml
# GitHub Action for auto-rollback
- name: Deploy and monitor
  run: |
    # Deploy new version
    wrangler deploy --env production

    # Monitor for 5 minutes
    for i in {1..30}; do
      sleep 10
      ERROR_RATE=$(curl -s https://dashboard.fire22.ag/metrics | jq '.errorRate')
      
      if [ "$ERROR_RATE" -gt "0.05" ]; then
        echo "High error rate detected: $ERROR_RATE"
        
        # Rollback
        wrangler rollback --env production
        exit 1
      fi
    done
```

## Production Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Secrets properly set
- [ ] Database migrations ready
- [ ] Monitoring configured
- [ ] Rollback plan documented

### Deployment

- [ ] Build production assets
- [ ] Deploy to staging first
- [ ] Smoke test staging
- [ ] Deploy to canary (5% traffic)
- [ ] Monitor canary metrics
- [ ] Deploy to production
- [ ] Verify all endpoints

### Post-Deployment

- [ ] Verify health checks
- [ ] Check error rates
- [ ] Monitor performance
- [ ] Test critical paths
- [ ] Update documentation
- [ ] Notify team

## Troubleshooting

### Common Issues

#### 1. Build Failures

```bash
# Clear cache and rebuild
rm -rf node_modules dist
bun install --frozen-lockfile
bun run build:production
```

#### 2. Secret Issues

```bash
# List all secrets
wrangler secret list --env production

# Update secret
wrangler secret put SECRET_NAME --env production
```

#### 3. Memory Issues

```toml
# Increase memory limit in wrangler.toml
[limits]
cpu_ms = 50
memory_mb = 256
```

#### 4. Rate Limiting

```typescript
// Add rate limiting bypass for health checks
if (pathname === '/health') {
  return handleHealth(request); // Skip rate limiting
}
```

### Debug Commands

```bash
# View live logs
wrangler tail --env production

# Check worker status
wrangler deployments list

# Test specific endpoint
curl -v https://dashboard.fire22.ag/api/test/fire22

# Check DNS resolution
dig dashboard.fire22.ag

# Verify SSL certificate
openssl s_client -connect dashboard.fire22.ag:443
```

## Security Considerations

### 1. Secret Management

- Never commit secrets to git
- Use environment-specific secrets
- Rotate secrets regularly
- Use least privilege principle

### 2. Access Control

- Implement IP allowlisting for admin endpoints
- Use JWT with short expiration
- Require MFA for sensitive operations
- Log all administrative actions

### 3. Compliance

- Enable GDPR compliance mode
- Implement data retention policies
- Audit log all data access
- Regular security assessments

---

Deployment Guide Version: 2.0.0 | Last Updated: 2025-08-27

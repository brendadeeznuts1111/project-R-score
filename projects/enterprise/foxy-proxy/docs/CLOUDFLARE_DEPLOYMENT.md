# Cloudflare Deployment Guide

This guide covers deploying Foxy Proxy to Cloudflare using Workers for serverless functions and Pages for the frontend dashboard.

## Table of Contents

- [Cloudflare Workers](#cloudflare-workers)
- [Cloudflare Pages](#cloudflare-pages)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Monitoring](#monitoring)

## Cloudflare Workers

### Overview

Cloudflare Workers allows running serverless functions at Cloudflare's global edge network with zero cold start times.

### Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler
# or
bun install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### Setup

1. **Create wrangler.toml** (root directory):

```toml
name = "foxy-proxy-worker"
main = "packages/dashboard/src/worker.ts"
type = "javascript"
account_id = "YOUR_ACCOUNT_ID"
workers_dev = true

# R2 Bucket Binding
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "foxy-proxy-data"

# KV Namespace for caching
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID"

# Environment configuration
[env.development]
account_id = "YOUR_DEV_ACCOUNT_ID"
name = "foxy-proxy-worker-dev"

[env.staging]
account_id = "YOUR_STAGING_ACCOUNT_ID"
name = "foxy-proxy-worker-staging"

[env.production]
account_id = "YOUR_PROD_ACCOUNT_ID"
name = "foxy-proxy-worker"
```

2. **Create worker entry point** (`packages/dashboard/src/worker.ts`):

```typescript
import { ProxyDataHandler } from "./utils/api";
import { FeatureFlagService } from "./utils/feature-flags";

interface Env {
  BUCKET: R2Bucket;
  KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    // API Routes
    if (pathname.startsWith("/api/")) {
      const handler = new ProxyDataHandler(env);
      return handler.handleRequest(request);
    }

    // Feature Flag endpoints
    if (pathname.startsWith("/flags/")) {
      const flagService = new FeatureFlagService(env.KV);
      return flagService.handleRequest(request);
    }

    // Proxy requests to R2-hosted static files
    if (pathname === "/" || pathname.includes(".")) {
      const key = pathname === "/" ? "index.html" : pathname.slice(1);
      const object = await env.BUCKET.get(`dashboard/dist/${key}`);
      if (!object) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
```

### Deployment

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production

# View logs
wrangler tail --env production

# Check deployment status
wrangler deployments list
```

## Cloudflare Pages

### Overview

Cloudflare Pages hosts your static React dashboard at Cloudflare's edge with automatic deployments from GitHub.

### Setup

1. **Connect GitHub Repository**:
   - Go to [Cloudflare Pages](https://pages.cloudflare.com)
   - Click "Create a project"
   - Select "Connect to Git"
   - Authorize Cloudflare to access your repository
   - Select the foxy-proxy repository

2. **Configure Build Settings**:
   - **Project name**: foxy-proxy-dashboard
   - **Production branch**: main
   - **Build command**: `bun run build`
   - **Build output directory**: `packages/dashboard/dist`
   - **Root directory** (advanced): packages/dashboard

3. **Environment Variables**:
   - Set in Cloudflare Pages Dashboard:
     ```
     NODE_ENV = production
     VITE_API_BASE_URL = https://api.example.com
     VITE_R2_ACCOUNT_ID = YOUR_ACCOUNT_ID
     VITE_R2_BUCKET_NAME = foxy-proxy-prod
     IPFOXY_API_TOKEN = your_token
     DUOPLUS_API_KEY = your_key
     ```

4. **Custom Domain**:
   - Go to Settings > Domain management
   - Add custom domain (e.g., `dashboard.example.com`)
   - Follow CNAME setup instructions

### Deployment

```bash
# Pages auto-deploys on push to main
# Manual deployment (if needed)
wrangler pages deploy packages/dashboard/dist --project-name foxy-proxy-dashboard

# Check deployment history
wrangler pages deployments list --project-name foxy-proxy-dashboard
```

## Environment Configuration

### Development (.env.development)

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_R2_ACCOUNT_ID=dev-account-id
VITE_R2_DEV_BUCKET_NAME=foxy-proxy-dev
VITE_R2_PUBLIC_URL=https://foxy-proxy-dev.r2.dev
```

### Staging (.env.staging)

```bash
VITE_API_BASE_URL=https://api-staging.example.com
VITE_R2_ACCOUNT_ID=staging-account-id
VITE_R2_STAGING_BUCKET_NAME=foxy-proxy-staging
VITE_R2_PUBLIC_URL=https://foxy-proxy-staging.r2.dev
```

### Production (.env.production)

```bash
VITE_API_BASE_URL=https://api.example.com
VITE_R2_ACCOUNT_ID=prod-account-id
VITE_R2_PROD_BUCKET_NAME=foxy-proxy-prod
VITE_R2_PUBLIC_URL=https://dashboard.example.com
```

## Deployment Process

### Full Deploy Checklist

```bash
# 1. Lint and test locally
bun run lint
bun run lint:fix
bun run test

# 2. Type check
bun run typecheck

# 3. Build
bun run build:prod

# 4. Deploy to staging first
wrangler deploy --env staging

# 5. Test staging
curl https://foxy-proxy-worker-staging.workers.dev/

# 6. If successful, deploy to production
wrangler deploy --env production

# 7. Verify production
curl https://foxy-proxy-worker.workers.dev/

# 8. Pages auto-deploys (observe in dashboard)
```

### CI/CD Automatic Deployment

See `.github/workflows/cloudflare-deploy.yml` for automated deployments on:

- Push to main (production)
- Push to staging (staging environment)
- Pull requests (preview deployments)

## Monitoring

### Cloudflare Analytics

1. **Worker Metrics**:
   - Go to Workers Dashboard
   - View request volume, errors, latency
   - Check CPU time usage

2. **Pages Metrics**:
   - Go to Pages Project
   - View page views, unique visitors
   - Monitor build performance

3. **R2 Storage Metrics**:
   - Monitor storage usage
   - Track API call counts
   - Cost analysis

### Error Tracking

```bash
# View Worker logs in real-time
wrangler tail --env production

# Filter by status
wrangler tail --status error --env production

# Filter by path
wrangler tail --search "/api/" --env production
```

### Performance Monitoring

```bash
# Check Worker performance
wrangler analytics engine list

# View cache hit rates
wrangler kv:key list --binding KV
```

## Troubleshooting

### Workers Deployment Issues

**Problem**: "401 Unauthorized"

```bash
# Re-authenticate
wrangler logout
wrangler login
```

**Problem**: "Cannot build"

```bash
# Clear cache and rebuild
bun clean
bun install
bun run build
```

**Problem**: "R2 bucket not found"

```bash
# Verify bucket exists
wrangler r2 bucket list

# Create if missing
wrangler r2 bucket create foxy-proxy-prod
```

### Pages Deployment Issues

**Problem**: "Build failed"

- Check GitHub Actions logs
- Verify build command works locally
- Check environment variables are set

**Problem**: "Custom domain not working"

- Wait 5-10 minutes for DNS propagation
- Verify CNAME record is correct
- Clear browser cache

## Cost Optimization

### Workers

- First 100,000 requests/day: Free
- After: $0.50 per 1M requests
- CPU time: Included in free tier up to limits

### Pages

- 500 builds/month: Free
- Unlimited bandwidth with throttling
- Custom domains: Included

### R2 Storage

- 10 GB/month: Free
- $0.015 per GB after free tier
- Class A operations (PUT/POST/DELETE): $4.50 per 1M
- Class B operations (GET): $0.36 per 1M

### Optimization Tips

1. Enable caching headers for static files
2. Use KV for frequently accessed data
3. Monitor R2 costs by file size
4. Clean up old deployments

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/cli-wrangler/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)

---

**Need Help?**

- Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Report issues on [GitHub](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)

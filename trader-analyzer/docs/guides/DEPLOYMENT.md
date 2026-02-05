# Cloudflare Workers Deployment Guide

## Prerequisites

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   # or
   bunx wrangler --version
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Verify Account**:
   ```bash
   wrangler whoami
   ```

## Configuration

### Environment Variables

Set secrets in Cloudflare Dashboard or via CLI:

```bash
# Staging
wrangler secret put API_KEY --env staging

# Production  
wrangler secret put API_KEY --env production
```

### Wrangler Configuration

The `wrangler.toml` file contains:
- **Production**: `trader-analyzer-markets`
- **Staging**: `trader-analyzer-markets-staging`

## Deployment Commands

### Staging Deployment

```bash
# Build and deploy to staging
bun run deploy:staging

# Or manually
wrangler deploy --env staging
```

### Production Deployment

```bash
# Build and deploy to production
bun run deploy:production

# Or manually
wrangler deploy --env production
```

### Preview Deployment

```bash
# Deploy preview (for PRs)
bun run deploy:preview

# Or manually
wrangler deploy --env preview
```

## Local Development

### Run Worker Locally

```bash
# Start local dev server
bun run wrangler:dev

# Or manually
wrangler dev --env staging
```

### View Logs

```bash
# Tail production logs
wrangler tail --env production

# Tail staging logs
bun run wrangler:tail
```

## Build Process

The worker is built using Bun:

```bash
# Build worker
bun run build:worker

# This creates dist/workers.js ready for deployment
```

## Environment Detection

The worker automatically detects environment:
- **Staging**: `wrangler deploy --env staging`
- **Production**: `wrangler deploy --env production`
- **Local**: `wrangler dev`

## API URLs

- **Production**: `https://trader-analyzer-markets.utahj4754.workers.dev`
- **Staging**: `https://trader-analyzer-markets-staging.utahj4754.workers.dev`
- **Local**: `http://localhost:8787`

## CORS Configuration

CORS is automatically configured based on environment:
- **Staging**: Allows `*.pages.dev` and Telegram origins
- **Production**: Restricted to specific origins
- **Development**: Allows all origins (`*`)

## Monitoring

### View Metrics

```bash
# View worker metrics
wrangler tail --env production

# View analytics
# Visit Cloudflare Dashboard → Workers → Analytics
```

### Debugging

```bash
# Enable debug logging
wrangler dev --env staging --log-level debug

# View real-time logs
wrangler tail --env staging
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Ensure Bun is installed (`bun --version`)
2. **Deployment Fails**: Check authentication (`wrangler whoami`)
3. **CORS Errors**: Verify origin is in `wrangler.toml` CORS config
4. **Timeout Errors**: Check CPU time limit (default: 50ms)

### Debug Commands

```bash
# Check Wrangler version
wrangler --version

# Verify configuration
wrangler deploy --dry-run --env staging

# Test locally
wrangler dev --env staging --port 8787
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build:worker
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
```

## Mini App Deployment

### Deploy Mini App to Cloudflare Pages

```bash
# Staging
bun run deploy:miniapp:staging

# Production
bun run deploy:miniapp:production
```

The deployment script (`scripts/deploy/deploy-miniapp.sh`):
- Copies files from `miniapp-standalone/`
- Injects environment-specific config
- Deploys to Cloudflare Pages
- Validates deployment

### Mini App URLs

- **Staging**: `https://staging.factory-wager-miniapp.pages.dev`
- **Production**: `https://factory-wager-miniapp.pages.dev` or `https://app.factory-wager.com`

### Mini App Configuration

The script replaces build markers in `config.js`:
- `__BUILD_API_URL__` → API endpoint URL
- `__BUILD_VERSION__` → Package version
- `__BUILD_TIMESTAMP__` → Build timestamp
- `__BUILD_COMMIT__` → Git commit hash

## Resources

- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Docs](https://developers.cloudflare.com/workers/)
- [Pages Docs](https://developers.cloudflare.com/pages/)
- [Hono Framework](https://hono.dev/)

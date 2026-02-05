# Cloudflare Workers for factory-wager.com

This directory contains the Cloudflare Worker implementation for the factory-wager.com hub.

## Quick Start

### Prerequisites
- Bun runtime (v1.3.5+)
- Cloudflare account with factory-wager.com domain
- Wrangler CLI (installed via `bunx`)

### First-Time Setup

```bash
# Login to Cloudflare (opens browser)
bunx wrangler login

# Verify configuration
bunx wrangler whoami
```

### Development

```bash
# Run Worker locally (http://localhost:8787)
bun run worker:dev

# Build Worker
bun run worker:build

# View logs in real-time
bun run worker:tail
```

### Deployment

```bash
# Deploy to production (factory-wager.com)
bun run worker:deploy

# Deploy to staging environment
bun run worker:deploy:staging

# Deploy with specific environment
bunx wrangler deploy --env production
```

### Environment Variables & Secrets

```bash
# Set a secret (encrypted, not in code)
bun run worker:secret SECRET_NAME

# List secrets
bunx wrangler secret list

# Delete a secret
bunx wrangler secret delete SECRET_NAME
```

## Worker Endpoints

Once deployed, the Worker provides:

- **Root** (`/`): Hub information page with links
- **Health Check** (`/health`): System status and metadata
- **Hub API** (`/api/hub`): JSON API with hub configuration
- **Dashboard Redirect** (`/dashboard`): Redirects to Cloudflare dashboard

## Configuration

The Worker configuration is in `wrangler.toml` at the project root:

- **Account ID**: `7a470541a704caaf91e71efccc78fd36`
- **Domain**: `factory-wager.com`
- **Routes**: `factory-wager.com/*` and `www.factory-wager.com/*`

## Architecture

The Worker serves as a lightweight hub interface that:
1. Provides quick access to Cloudflare dashboard
2. Serves hub metadata via API
3. Handles health checks and status monitoring
4. Can be extended with KV, R2, Durable Objects, etc.

## Extending the Worker

### Adding KV Namespace

1. Create KV namespace in Cloudflare dashboard
2. Add to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "HUB_CONFIG"
id = "your-kv-namespace-id"
```

3. Use in Worker:
```typescript
await env.HUB_CONFIG.get("key");
await env.HUB_CONFIG.put("key", "value");
```

### Adding R2 Bucket

1. Create R2 bucket in Cloudflare dashboard
2. Add to `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "factory-wager-assets"
```

3. Use in Worker:
```typescript
await env.ASSETS.get("file.jpg");
await env.ASSETS.put("file.jpg", data);
```

## Troubleshooting

### Worker not deploying
- Check `wrangler.toml` configuration
- Verify account ID matches Cloudflare dashboard
- Ensure domain is added to Cloudflare account

### Routes not working
- Verify zone_id is set or zone_name matches
- Check DNS settings in Cloudflare dashboard
- Ensure Worker routes are configured correctly

### Local development issues
- Clear `.wrangler/` cache: `rm -rf .wrangler/`
- Check port 8787 is available
- Verify `wrangler.toml` dev configuration

## Related Files

- `wrangler.toml` - Worker configuration
- `workers/factory-wager.ts` - Worker implementation
- `configs/dashboards-hub.json` - Hub configuration metadata
- `utils/dashboard-hub.ts` - Hub utility functions

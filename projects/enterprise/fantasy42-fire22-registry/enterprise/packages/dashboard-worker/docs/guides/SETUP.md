# Fire22 Dashboard Worker - Setup Guide

## Quick Start (Local Development)

The dashboard worker is pre-configured with all necessary Cloudflare
infrastructure. Follow these steps to get started:

### 1. Install Dependencies

```bash
bun install --frozen-lockfile
```

### 2. Configure Environment Variables

The `.env` file is already configured with development placeholders:

```bash
# View current configuration
cat .env

# The file includes placeholders for all required variables
# No changes needed for basic local development!
```

### 3. Start Development Server

```bash
# Start the worker locally
wrangler dev

# Or use the npm script
bun run dev

# The dashboard will be available at:
# http://localhost:8787/dashboard
```

### 4. Test the Setup

```bash
# Test health endpoint
curl http://localhost:8787/health

# Access the dashboard
open http://localhost:8787/dashboard
```

## Infrastructure Overview

All Cloudflare infrastructure is already provisioned:

### D1 Databases ✅

- `fire22-dashboard` - Main application database
- `fire22-registry` - Package registry database

### R2 Buckets ✅

- `fire22-packages` - Package storage
- `fire22-department-assets` - Department asset storage

### KV Namespaces ✅

- `REGISTRY_CACHE` - Package registry cache
- `DEPARTMENT_DATA` - Department configuration
- `ERROR_CODES` - Error code definitions
- `RSS_FEEDS` - RSS feed data
- `EMAIL_SECURITY_CONFIG` - Email security settings
- `EMAIL_AUDIT_LOGS` - Email audit logging

## Environment Configuration

### Development (.env file)

The `.env` file contains placeholder values suitable for local development:

| Variable                | Purpose                 | Development Value    |
| ----------------------- | ----------------------- | -------------------- |
| `JWT_SECRET`            | JWT token signing       | 32+ char placeholder |
| `ADMIN_PASSWORD`        | Admin dashboard access  | `DevAdmin2025!`      |
| `FIRE22_TOKEN`          | Fire22 API access       | Placeholder token    |
| `FIRE22_WEBHOOK_SECRET` | Webhook validation      | 32+ char placeholder |
| `CRON_SECRET`           | Cron job authentication | 32+ char placeholder |

**Note:** These placeholders work for local development. Real credentials are
only needed when:

- Connecting to the actual Fire22 API
- Testing Telegram bot functionality
- Processing real payments (Stripe)
- Sending emails/SMS (SendGrid/Twilio)

### Production (Cloudflare Secrets)

For production deployment, use the provided script to configure real secrets:

```bash
# Run the interactive setup script
./scripts/setup-secrets.sh

# This will prompt you for each secret value
# and configure them using `wrangler secret put`
```

Required production secrets:

- `JWT_SECRET` - Minimum 32 characters
- `ADMIN_PASSWORD` - Strong password for admin access
- `FIRE22_TOKEN` - Your Fire22 API token
- `FIRE22_WEBHOOK_SECRET` - Webhook validation secret
- `CRON_SECRET` - Cron authentication secret

Optional production secrets:

- `BOT_TOKEN` - Telegram bot token
- `CASHIER_BOT_TOKEN` - Cashier bot token
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `SENDGRID_API_KEY` - SendGrid email API
- `TWILIO_ACCOUNT_SID` - Twilio account ID
- `TWILIO_AUTH_TOKEN` - Twilio auth token

## Testing

### Run Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test tests/api/task-management.test.ts
```

### Type Checking

```bash
# Check TypeScript types
bun run typecheck
```

### Linting

```bash
# Run linter
bun run lint

# Auto-fix issues
bun run lint:fix
```

## Deployment

### Deploy to Production

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Or use the npm script
bun run deploy
```

### Deploy to Specific Environment

```bash
# Deploy to a specific department environment
wrangler deploy --env finance
wrangler deploy --env support
wrangler deploy --env technology
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

If you see database errors, ensure the D1 databases exist:

```bash
# List your D1 databases
wrangler d1 list

# Should show:
# - fire22-dashboard
# - fire22-registry
```

#### 2. Secret Not Found Errors

For local development, the `.env` file provides all necessary placeholders. If
you need real values:

```bash
# Set a specific secret for production
wrangler secret put SECRET_NAME

# List all configured secrets
wrangler secret list
```

#### 3. Port Already in Use

If port 8787 is busy:

```bash
# Use a different port
wrangler dev --port 8788
```

#### 4. TypeScript Errors

After fixing database imports, TypeScript should compile cleanly:

```bash
# Verify no TypeScript errors
bun run typecheck
```

## API Endpoints

Once running, these endpoints are available:

- `GET /health` - System health check
- `GET /dashboard` - Main dashboard interface
- `GET /api/live` - Server-sent events stream
- `POST /api/fire22/sync-customers` - Sync Fire22 customers
- `GET /api/fire22/dns-stats` - DNS performance metrics
- `GET /api/agents/hierarchy` - Agent hierarchy data

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [R2 Storage Documentation](https://developers.cloudflare.com/r2/)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the error messages in the console
3. Ensure all dependencies are installed: `bun install --frozen-lockfile`
4. Verify Cloudflare resources exist: `wrangler d1 list`,
   `wrangler r2 bucket list`

---

**Ready to develop!** The worker is fully configured with placeholder values for
local development. Real credentials are only needed for production deployment or
when testing specific integrations.

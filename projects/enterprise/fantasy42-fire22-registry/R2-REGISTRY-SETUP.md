# 🚀 Fire22 R2 Registry Setup Guide

## Prerequisites

1. Cloudflare account with R2 enabled
2. Wrangler CLI installed: `npm install -g wrangler`
3. Bun runtime installed

## Step 1: Configure R2 Bucket

```bash
# Login to Cloudflare
wrangler auth login

# Create R2 bucket
wrangler r2 bucket create fire22-registry

# Generate API tokens
wrangler r2 token create --bucket fire22-registry
```

## Step 2: Environment Setup

```bash
# Copy environment template
cp .env.r2-template .env

# Edit .env with your values
nano .env
```

## Step 3: Registry Setup

```bash
# Run setup script
bun run r2-registry-setup.bun.ts

# Test R2 connection
bun run r2-registry-setup.bun.ts --test-connection
```

## Step 4: Upload Content

```bash
# Upload audited dashboards
bun run registry-upload.bun.ts

# Upload design artifacts
bun run upload-designs.bun.ts
```

## Step 5: Configure Custom Domain (Optional)

```bash
# Add custom domain to Cloudflare
wrangler pages deployment tail

# Configure DNS
# registry.fire22.dev -> your-r2-bucket-url
```

## Registry Structure

```text
fire22-registry/
├── dashboards/     # HTML dashboards
├── designs/        # Design artifacts
├── docs/          # Documentation
├── assets/        # Static assets
└── api/           # API docs/schemas
```

## Access URLs

- Registry: https://registry.fire22.dev
- Dashboards: https://registry.fire22.dev/dashboards/
- Designs: https://registry.fire22.dev/designs/
- Docs: https://registry.fire22.dev/docs/

## Maintenance

```bash
# List registry contents
bun run registry-admin.bun.ts --list

# Sync local changes
bun run registry-admin.bun.ts --sync

# Generate audit report
bun run registry-admin.bun.ts --audit
```

# Deployment Guide

Complete guide for deploying Dev HQ to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Build Configurations](#build-configurations)
- [Deployment Platforms](#deployment-platforms)
- [Production Checklist](#production-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Bun | 1.3.6 | Latest |
| Node.js | 18.0.0 | 20.x LTS |
| RAM | 512MB | 2GB+ |
| Disk | 100MB | 500MB+ |

### Required Environment Variables

```bash
# API Configuration
GEELARK_API_KEY=your_api_key
GEELARK_BASE_URL=https://open.geelark.com

# Security
ENCRYPTION_KEY=your_256_bit_key
VALIDATION_MODE=strict

# Optional: Service Integrations
EMAIL_SERVICE_API_KEY=your_email_key
SMS_SERVICE_API_KEY=your_sms_key
PROXY_SERVICE_URL=http://proxy.company.com
```

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd geelark
bun install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 3. Generate Encryption Key

```bash
# Generate a secure 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Validate Configuration

```bash
# Type checking
bun type-check

# Lint check
bun lint

# Test suite
bun test:ci
```

## Build Configurations

### Development Build

```bash
bun run build:dev
```

**Features:** DEV + Extended Logging + Mock API
**Size:** ~450KB
**Use:** Local development and testing

### Production Lite

```bash
bun run build:prod-lite
```

**Features:** PROD + Encryption
**Size:** ~320KB
**Use:** Minimal production deployment

### Production Standard

```bash
bun run build:prod-standard
```

**Features:** PROD + Auto-heal + Notifications + Encryption + Batch
**Size:** ~280KB
**Use:** Standard production deployment

### Production Premium

```bash
bun run build:prod-premium
```

**Features:** All PROD + Premium + Advanced Monitoring
**Size:** ~340KB
**Use:** Full-featured production deployment

## Deployment Platforms

> **Note:** Dev HQ uses Bun's compile-time flags and optimizations. For best compatibility and performance, we recommend using deployment platforms that support Bun directly.

### Supported Platforms

| Platform | Bun Support | Recommended For | Setup Complexity |
|----------|-------------|-----------------|-----------------|
| **Vercel** | ✅ Native | Serverless/Edge | Low |
| **Docker** | ✅ Full | Self-hosted/Cloud | Medium |
| **Railway** | ⚠️ Limited | Small apps | Medium |

1. **Install Vercel CLI**

```bash
bun install -g vercel
```

2. **Deploy**

```bash
vercel --prod
```

3. **vercel.json** (if needed)

```json
{
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/bun"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

### Railway

1. **Install Railway CLI**

```bash
bun install -g railway
```

2. **Initialize and Deploy**

```bash
railway login
railway init
railway up
```

3. **Configure Variables**

```bash
railway variables set GEELARK_API_KEY=your_key
railway variables set ENCRYPTION_KEY=your_key
```

### Docker

**Dockerfile**

```dockerfile
FROM oven/bun:1.3.6-alpine

WORKDIR /app

# Copy package files
COPY package.json bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build
RUN bun run build:prod-standard

# Expose port
EXPOSE 3000

# Run
CMD ["bun", "dist/prod-standard/index.js"]
```

**docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GEELARK_API_KEY=${GEELARK_API_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

**Build and Run**

```bash
docker build -t geelark .
docker run -p 3000:3000 --env-file .env geelark
```

### Bun Run Direct (Recommended)

For maximum compatibility with Bun's compile-time flags, we recommend running directly:

```bash
# Production build and run
bun run build:prod-standard
bun run dist/prod-standard/index.js

# With environment file
bun --env-file .env.prod run dist/prod-standard/index.js

# With process manager (optional)
npm install -g nodemon
nodemon --exec "bun run dist/prod-standard/index.js" --watch src
```

**Benefits:**
- Full Bun compile-time flag support
- Maximum performance
- Direct access to Bun APIs
- No compatibility layer overhead

### Process Manager Options

While PM2 and systemd don't fully support Bun's compile-time flags, you can still use them for basic process management:

#### Using nodemon (Recommended)
```bash
npm install -g nodemon
nodemon --exec "bun run dist/prod-standard/index.js" --ext ts,js
```

#### Using forever
```bash
npm install -g forever
forever start -c "bun" dist/prod-standard/index.js
```

> **Important:** When using process managers, compile-time flags must be set during build time, not runtime.

## Production Checklist

### Security

- [ ] Environment variables configured (no hardcoded secrets)
- [ ] ENCRYPTION_KEY set to 256-bit value
- [ ] TLS/HTTPS enabled
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] API key validation active
- [ ] Mock API disabled

### Feature Flags

- [ ] ENV_PRODUCTION enabled
- [ ] FEAT_MOCK_API disabled
- [ ] FEAT_ENCRYPTION enabled
- [ ] FEAT_AUTO_HEAL enabled (optional)
- [ ] FEAT_NOTIFICATIONS enabled (optional)
- [ ] FEAT_BATCH_PROCESSING enabled (if needed)

### Monitoring

- [ ] Health check endpoint accessible
- [ ] Logging configured with external service
- [ ] Error tracking (Sentry, etc.) configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured

### Performance

- [ ] Build optimized (minified, dead code eliminated)
- [ ] Caching configured
- [ ] Database connection pooling
- [ ] CDN configured for static assets
- [ ] Compression enabled

## Monitoring & Maintenance

### Health Checks

```bash
# Via CLI
bun health

# Via HTTP
curl https://your-domain.com/health
```

### Logs

```bash
# View logs
bun logs

# Export logs
bun logs export --format=json --output=logs.json

# View specific log types
bun logs --features
bun logs --security
bun logs --errors
```

### Metrics

```bash
# Server metrics
curl http://localhost:3000/api/metrics

# Response:
{
  "port": 3000,
  "pendingRequests": 5,
  "pendingWebSockets": 12,
  "uptime": 3600,
  "memoryUsage": {
    "rss": 134217728,
    "heapTotal": 89128960,
    "heapUsed": 63438848
  }
}
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
bun install

# Run tests
bun test:ci

# Rebuild
bun run build:prod-standard

# Restart service
pm2 restart geelark
# or
sudo systemctl restart geelark
```

## Troubleshooting

### Build Fails

**Issue:** TypeScript errors during build

```bash
# Run type check
bun type-check

# Fix lint issues
bun lint:fix
```

### Server Won't Start

**Issue:** Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Environment Variables Not Loading

**Issue:** Secrets not accessible

```bash
# Verify .env file exists
ls -la .env

# Check bunfig.toml for preload config
grep -A5 "\[run\]" bunfig.toml
```

### High Memory Usage

**Issue:** Memory leak suspected

```bash
# Check memory usage
bun health --verbose

# Review feature flags
bun flags
```

Disable extended logging if not needed:

```bash
bun flags disable FEAT_EXTENDED_LOGGING
```

### WebSocket Connection Issues

**Issue:** WS connections dropping

Check bunfig.toml HTTP configuration:

```toml
[http]
keepAlive = true
keepAliveTimeout = 60000
```

## Rollback Procedure

### Git Rollback

```bash
# View previous commits
git log --oneline -10

# Reset to previous commit
git reset --hard <commit-hash>

# Rebuild
bun run build:prod-standard

# Restart
pm2 restart geelark
```

### Database Rollback (if applicable)

```bash
# Restore from backup
bun run scripts/restore-db backup.sql
```

## Support

For deployment issues:
- Check logs: `bun logs --errors`
- Run diagnostics: `bun health --verbose`
- Review: [docs/](../)

---

Last updated: 2026-01-08

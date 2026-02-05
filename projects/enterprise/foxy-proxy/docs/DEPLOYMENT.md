# Deployment Guide

Production deployment of Foxy Proxy using Bun.

## Prerequisites

- **Bun** installed on production server
- **Environment variables** configured
- **Git** for code deployment (optional)

## Production Setup

### 1. Environment Configuration

Create `.env` in the root and each package:

```bash
# Root .env
NODE_ENV=production
PORT=3000

# packages/dashboard/.env
IPFOXY_API_TOKEN=your_production_token
DUOPLUS_API_KEY=your_production_key
CASHAPP_BATCH_SIZE=50
TZ=America/New_York
```

### 2. Install & Build

```bash
# Install dependencies
bun install --production

# Build for production
cd packages/dashboard
bun build src/main.tsx --outdir dist

# Return to root
cd ../..
```

### 3. Run Production Server

```bash
# Simple start
bun run start

# Or with PM2 (recommended)
pm2 start "bun run start" --name foxy-proxy

# Check status
pm2 status
```

### 4. Scaling Considerations

**Single Server**

- Handle 200+ concurrent connections
- 4GB RAM recommended
- 2+ CPU cores

**Multiple Servers (Load Balanced)**

```bash
# Server 1
PORT=3000 bun run start

# Server 2
PORT=3001 bun run start

# Use nginx/reverse proxy for load balancing
```

## Environment Variables

### Required for All

```
NODE_ENV=production
PORT=3000
TZ=America/New_York
```

### IPFoxy Integration

```
IPFOXY_API_TOKEN=xxx
IPFOXY_API_ID=xxx
```

### DuoPlus Integration

```
DUOPLUS_API_KEY=xxx
DUOPLUS_WEBHOOK_SECRET=xxx
```

### CashApp Scaling (if used)

```
CASHAPP_EMAIL_DOMAIN=your-domain.net
CASHAPP_BATCH_SIZE=25
CASHAPP_SMS_PROVIDER=twilio (or custom)
```

### Cloud Storage (R2)

```
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY=xxx
R2_SECRET_KEY=xxx
R2_BUCKET_NAME=foxy-proxy-data
```

## Monitoring

### Health Check

```bash
# Check if server is running
curl http://localhost:3000/health

# Expected response
{"status": "ok", "timestamp": "2024-01-09T12:00:00Z"}
```

### Logging

```bash
# View real-time logs
pm2 logs foxy-proxy

# Export logs
pm2 save logs > production.log
```

### Performance Monitoring

```bash
# Monitor resource usage
pm2 monit

# Get metrics
pm2 info foxy-proxy
```

## Database & Storage

### R2 Storage (Recommended)

```bash
# Verify R2 connection
bun run scripts/test-r2-connection.sh

# Backup data
bun run scripts/backup-r2.sh

# Restore from backup
bun run scripts/restore-r2.sh bucket-name
```

## SSL/TLS Setup

### Using Let's Encrypt with Nginx

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx as reverse proxy
# See nginx config examples in docs/
```

## Updating Production

### Zero-Downtime Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install new dependencies
bun install --production

# 3. Build new version
cd packages/dashboard && bun build src/main.tsx --outdir dist && cd ../..

# 4. Reload with PM2 (zero-downtime)
pm2 reload foxy-proxy

# 5. Verify deployment
curl http://localhost:3000/health
```

### Rollback if Needed

```bash
# Stop current version
pm2 stop foxy-proxy

# Git rollback
git checkout previous-commit-hash

# Reinstall & rebuild
bun install --production
cd packages/dashboard && bun build src/main.tsx --outdir dist && cd ../..

# Start previous version
pm2 start "bun run start" --name foxy-proxy
```

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` files
- ✅ Use `.env.example` for template
- ✅ Store secrets in secure vault (AWS Secrets, HashiCorp Vault, etc.)

### 2. API Keys

- ✅ Rotate keys monthly
- ✅ Use read-only keys where possible
- ✅ Monitor key usage

### 3. Network Security

- ✅ Use HTTPS/TLS for all connections
- ✅ Whitelist IPs if possible
- ✅ Use VPN for sensitive operations

### 4. Rate Limiting

```bash
# Enable rate limiting in production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## Troubleshooting

### Server Won't Start

```bash
# Check port is available
netstat -tuln | grep 3000

# Check Bun is installed
bun --version

# Check for errors
bun run start 2>&1 | head -50
```

### High Memory Usage

```bash
# Check memory by process
ps aux | grep bun

# Restart servers
pm2 restart foxy-proxy

# Monitor memory over time
pm2 monitor
```

### Database Connection Issues

```bash
# Test R2 connection
bun run scripts/test-r2-connection.sh

# Check credentials in .env
cat packages/dashboard/.env | grep -i r2

# Verify network connectivity
ping -c 1 api.cloudflare.com
```

## Backup & Recovery

### Daily Backup Strategy

```bash
# Add to crontab for daily backups
0 2 * * * cd /home/user/foxy-proxy && bun run scripts/backup-r2.sh

# Verify backups stored
ls -lh backups/
```

### Recovery Procedure

```bash
# List available backups
bun run scripts/list-r2-backups.sh

# Restore from specific backup
bun run scripts/restore-r2.sh backup-2024-01-09.tar.gz

# Verify restoration
curl http://localhost:3000/health
```

## Performance Tuning

### Bun Runtime Options

```bash
# High performance mode
BUN_ENV=production \
MAX_OLD_SPACE_SIZE=2048 \
bun --smol run start

# Options:
# --smol         = Don't precompile (saves startup time)
# --hot          = Hot reload (dev only)
# --workdir path = Set working directory
```

### Load Testing

```bash
# Test with 100 concurrent connections
bun run scripts/load-test.sh --workers 100 --duration 60

# Monitor during load test
pm2 monit
```

## Logs & Debugging

### Enable Debug Logging

```bash
# In .env
DEBUG=foxy-proxy:*
LOG_LEVEL=debug
```

### Common Log Paths

- PM2 logs: `~/.pm2/logs/`
- Application logs: `/var/log/foxy-proxy/`
- R2 sync logs: `./logs/r2-sync.log`

---

**Need Help?**

- Check [Known Issues](./known-issues.md)
- Report on [GitHub Issues](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)
- See [GETTING_STARTED.md](./GETTING_STARTED.md) for basics

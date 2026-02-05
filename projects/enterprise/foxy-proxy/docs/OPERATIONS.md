# Operations & Monitoring Guide

Guide for running, monitoring, and maintaining Foxy Proxy in production.

## 🚀 Deployment

### Prerequisites

- Bun 1.0+ installed
- Node.js 18+ (optional)
- Cloudflare account (for Workers/Pages)
- R2 bucket configured
- Environment variables configured

### Initial Deployment

```bash
# 1. Prepare environment
cp .env.example .env
# Edit .env with production settings

# 2. Install dependencies
bun install --production

# 3. Build for production
bun run build:prod

# 4. Deploy to Cloudflare
wrangler deploy --env production

# 5. Verify deployment
curl https://your-app.workers.dev/health
```

### Environment Configuration

```bash
# Production .env
NODE_ENV=production
PORT=3000
TZ=America/New_York

# R2 Storage
VITE_R2_ACCOUNT_ID=your_account_id
VITE_R2_ACCESS_KEY_ID=your_key_id
VITE_R2_SECRET_ACCESS_KEY=your_secret_key
VITE_R2_BUCKET_NAME=foxy-proxy-prod

# API Configuration
VITE_API_BASE_URL=https://api.example.com

# Feature Flags
VITE_DUOPLUS_ENABLED=true
VITE_ENHANCED_TEMPLATES=true
VITE_PRODUCTION_MODE=true

# API Keys (store securely)
IPFOXY_API_TOKEN=xxxxxxxxxxxx
DUOPLUS_API_KEY=xxxxxxxxxxxx
```

## 📊 Monitoring

### Health Checks

```bash
# Basic health check
curl https://your-app.workers.dev/health

# Detailed health check
curl -s https://your-app.workers.dev/health | jq .

# Response format:
# {
#   "status": "ok",
#   "timestamp": "2024-01-09T10:00:00.000Z",
#   "uptime": 3600000,
#   "checks": {
#     "database": "ok",
#     "cache": "ok",
#     "storage": "ok"
#   }
# }
```

### Performance Metrics

```bash
# View Cloudflare Worker metrics
wrangler tail --env production

# Filter by status
wrangler tail --status error --env production

# Filter by path
wrangler tail --search "/api/" --env production

# Monitor in real-time
wrangler tail --env production --follow
```

### Log Monitoring

Logs are stored in Cloudflare Workers and accessible via:

```bash
# View recent logs
wrangler tail --env production --limit 50

# Export logs to file
wrangler tail --env production > logs.txt
```

## 🔧 Maintenance

### Database Maintenance

```bash
# Backup data
./scripts/backup-r2.sh

# Verify backup
ls -lh backups/

# Restore from backup
./scripts/restore-r2.sh backup-file.tar.gz
```

### Disk Cleanup

```bash
# Remove old logs
find logs/ -mtime +30 -delete

# Clean temporary files
rm -rf /tmp/foxy-proxy-*

# Analyze disk usage
du -sh *
```

### Dependency Updates

```bash
# Check for outdated packages
bun outdated

# Update all packages
bun update

# Review security vulnerabilities
bun audit

# Fix vulnerabilities
bun audit fix
```

## 🚨 Incident Response

### Common Issues

#### High CPU Usage

```bash
# Identify resource hogs
top -b -n 1 | head -20

# Check process list
ps aux | grep bun

# Restart service
pm2 restart foxy-proxy
```

#### Memory Leak

```bash
# Monitor memory over time
watch -n 5 'ps aux | grep bun'

# Check heap size limit
ps aux | grep bun | grep -o 'NODE_OPTIONS=[^ ]*'

# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
pm2 restart foxy-proxy
```

#### High Error Rate

```bash
# Check recent errors
wrangler tail --status error --env production --limit 100

# Check error logs
grep ERROR logs/*.log | tail -20

# Analyze error patterns
grep -o 'Error: [^"]*' logs/*.log | sort | uniq -c | sort -rn
```

#### Database Connection Issues

```bash
# Verify R2 connectivity
bun run scripts/test-r2-connection.sh

# Check credentials
echo "Account ID: $VITE_R2_ACCOUNT_ID"
echo "Bucket: $VITE_R2_BUCKET_NAME"

# Reconnect
wrangler r2 bucket list
```

## 📈 Scaling

### Horizontal Scaling

Multi-region deployment with Cloudflare:

```bash
# Deploy to multiple regions (automatic with Cloudflare)
wrangler deploy --env production

# Configure failover
# See CLOUDFLARE_DEPLOYMENT.md for regional configuration
```

### Vertical Scaling

Increase Worker resources:

```bash
# Increase memory allocation in wrangler.toml
[env.production]
workers_dev = true
name = "foxy-proxy-prod"
limits = {
  max_memory = 512  # MB
}
```

### Database Optimization

```bash
# Monitor R2 usage
wrangler r2 bucket stats foxy-proxy-prod

# Clean up old files
find . -name "*.old" -delete

# Optimize file organization
bun run scripts/optimize-r2.sh
```

## 🔒 Security

### Access Control

```bash
# Restrict IP access (if applicable)
# Configure in Cloudflare firewall rules

# Manage API keys
- Rotate monthly
- Use read-only when possible
- Monitor key usage
```

### Data Protection

```bash
# Enable encryption
# R2 bucket should use server-side encryption

# Backup encryption
./scripts/backup-r2.sh --encrypt

# Secure sensitive data
chmod 600 .env
chmod 600 secrets.json
```

### Audit Logging

```bash
# Enable Cloudflare logging
# Configure in Cloudflare dashboard

# View audit logs
wrangler analytics engine list

# Export logs for analysis
wrangler tail --env production | tee audit-$(date +%Y%m%d).log
```

## 📞 Support Contacts

### Incident Escalation

1. **Level 1**: Check monitoring dashboard
2. **Level 2**: Review error logs and metrics
3. **Level 3**: Check system status page
4. **Level 4**: Contact infrastructure team
5. **Level 5**: Contact vendor support (Cloudflare, etc.)

### Vendor Support

- **Cloudflare**: https://support.cloudflare.com
- **Bun**: https://github.com/oven-sh/bun/issues
- **Node.js**: https://nodejs.org/en/

## 🔄 Backup & Recovery

### Backup Schedule

```bash
# Daily backup (automated)
0 2 * * * cd /home/foxy-proxy && ./scripts/backup-r2.sh

# Weekly verification
0 3 * * 0 cd /home/foxy-proxy && ./scripts/verify-backup.sh

# Monthly test restore
0 4 1 * * cd /home/foxy-proxy && ./scripts/test-restore.sh
```

### Recovery Procedure

```bash
# 1. Stop current service
pm2 stop foxy-proxy

# 2. Verify backup integrity
./scripts/verify-backup.sh backup-2024-01-09.tar.gz

# 3. Restore from backup
./scripts/restore-r2.sh backup-2024-01-09.tar.gz

# 4. Verify restoration
./scripts/test-r2-connection.sh

# 5. Restart service
pm2 start foxy-proxy
```

## 📊 Reporting

### Daily Report

```bash
# Generate daily metrics
cat << 'EOF' > daily-report.sh
#!/bin/bash
date
echo "=== System Status ==="
pm2 status
echo ""
echo "=== Disk Usage ==="
df -h | grep -E "^/|Used"
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Error Count (24h) ==="
grep ERROR logs/error.log | wc -l
EOF

chmod +x daily-report.sh
./daily-report.sh
```

### Weekly Report

```bash
# Generate weekly summary
./scripts/weekly-report.sh > reports/weekly-$(date +%Y%m%d).txt
```

## 🛠️ Maintenance Tasks

### Monthly Checklist

- [ ] Review error logs
- [ ] Check disk usage
- [ ] Verify backups
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance review
- [ ] Cost analysis

### Quarterly Tasks

- [ ] Major version updates
- [ ] Security assessment
- [ ] Capacity planning
- [ ] Disaster recovery drill
- [ ] Architecture review

## 📚 Runbooks

### Runbook: Service Restart

```bash
# Graceful restart
pm2 gracefulReload foxy-proxy

# Hard restart
pm2 restart foxy-proxy

# Verify service is running
pm2 status foxy-proxy
curl -f https://your-app.workers.dev/health
```

### Runbook: Emergency Rollback

```bash
# 1. Identify last known good version
git log --oneline | head -5

# 2. Checkout previous version
git checkout <commit-hash>

# 3. Rebuild and deploy
bun run build:prod
wrangler deploy --env production

# 4. Verify
curl -f https://your-app.workers.dev/health
```

## ✅ Deployment Checklist

Before any production deployment:

- [ ] All tests passing
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Environment variables configured
- [ ] Backups taken
- [ ] Monitoring configured
- [ ] Runbooks reviewed
- [ ] Team notified
- [ ] Deployment window approved

---

**For more information, see:**

- [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) - Cloudflare setup
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Initial deployment guide

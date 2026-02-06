# 🚀 Staging Deployment Guide

## Overview
This guide covers deploying the application to the staging environment using the `staging` branch.

## Prerequisites
- Bun runtime installed
- Git access to the repository
- Environment variables configured

## Quick Start

### 1. Deploy Using Script
```bash
# Run the automated deployment script
./deploy-staging.sh
```

### 2. Manual Deployment
```bash
# Switch to staging branch
git checkout staging

# Pull latest changes
git pull origin staging

# Install dependencies
bun install

# Set staging environment variables
export NODE_ENV=staging
export SERVER_HOST=0.0.0.0
export SERVER_PORT=3000
export DASHBOARD_HOST=0.0.0.0
export LOG_LEVEL=info
export JSON_LOGS=true

# Start the server
bun run server/base-server.ts
```

## Environment Configuration

### Required Variables
```bash
NODE_ENV=staging                    # Environment identifier
SERVER_HOST=0.0.0.0                # Bind to all interfaces
SERVER_PORT=3000                    # Server port
DASHBOARD_HOST=0.0.0.0              # Dashboard host
```

### Optional Variables
```bash
LOG_LEVEL=info                      # Logging level (debug, info, warn, error)
JSON_LOGS=true                      # Enable structured JSON logging
SESSION_SECRET=your-staging-secret  # Session encryption key
```

## Services Available

### Main Server
- **URL:** `http://localhost:3000` or `http://0.0.0.0:3000`
- **Health Check:** `http://localhost:3000/health`
- **Documentation:** Available via `/docs` endpoints

### Secrets Dashboard
- **URL:** `http://localhost:3456`
- **Environment:** Uses `DASHBOARD_HOST` configuration
- **Features:** Secure secret management interface

### Registry Services
- **CLI:** Configured with `REGISTRY_HOST` environment variable
- **Server:** Uses consistent host configuration
- **API:** RESTful endpoints available

## Testing Checklist

### ✅ Pre-deployment Tests
- [ ] All syntax checks pass
- [ ] Environment variables are set
- [ ] Dependencies are installed
- [ ] Health checks pass

### ✅ Post-deployment Tests
- [ ] Main server responds on port 3000
- [ ] Secrets dashboard accessible on port 3456
- [ ] Documentation endpoints load correctly
- [ ] Error handling works properly
- [ ] Logs are generating correctly

### ✅ Security Tests
- [ ] Input validation is working
- [ ] Error messages are properly sanitized
- [ ] Session management is secure
- [ ] CORS headers are configured correctly

## Monitoring

### Log Monitoring
```bash
# View structured logs
tail -f logs/staging.log | jq

# Monitor error logs
grep "ERROR" logs/staging.log
```

### Health Monitoring
```bash
# Check server health
curl http://localhost:3000/health

# Check dashboard health
curl http://localhost:3456/health
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Environment Variables Not Set
```bash
# Check current environment
env | grep -E "(NODE_ENV|SERVER_HOST|SERVER_PORT)"

# Set variables temporarily
export NODE_ENV=staging
export SERVER_HOST=0.0.0.0
export SERVER_PORT=3000
```

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules .bun-cache
bun install

# Rebuild
bun build --target=bun server/base-server.ts
```

## Rollback

If staging deployment fails:
```bash
# Switch to previous working commit
git checkout <previous-commit-hash>

# Or reset to last known good state
git reset --hard HEAD~1

# Redeploy
./deploy-staging.sh
```

## Production Promotion

When staging is verified:
```bash
# Merge staging to main
git checkout main
git merge staging

# Tag the release
git tag -a v2.1.0-staging -m "Staging release verified"

# Push to production
git push origin main
git push origin v2.1.0-staging
```

## Support

For deployment issues:
1. Check logs in the console output
2. Verify environment variables
3. Ensure all dependencies are installed
4. Check network connectivity and port availability

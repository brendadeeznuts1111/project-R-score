# Troubleshooting Guide

This guide provides comprehensive troubleshooting information for common issues encountered when developing, deploying, and maintaining the RSS Feed Optimization project.

## Overview

This troubleshooting guide covers common issues, their causes, and solutions across development, deployment, and runtime scenarios. Use this guide to quickly diagnose and resolve problems.

## Development Issues

### 1. Bun.js Installation Problems

#### Issue: Bun.js Not Found
**Symptoms:**
- `bun: command not found`
- `Error: Cannot find module 'bun'`

**Solutions:**
```bash
# Check if Bun is installed
bun --version

# Install Bun if not installed
curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Verify installation
bun --version
```

#### Issue: Bun.js Version Mismatch
**Symptoms:**
- `Error: Bun version 1.2.0 is required, but 1.1.0 is installed`
- Unexpected behavior with Bun APIs

**Solutions:**
```bash
# Check current version
bun --version

# Update Bun to latest version
curl -fsSL https://bun.sh/install | bash

# Or use version manager
bun upgrade
```

### 2. Dependency Installation Issues

#### Issue: Package Installation Fails
**Symptoms:**
- `bun install` fails with errors
- Missing dependencies
- Lockfile conflicts

**Solutions:**
```bash
# Clear Bun cache
bun install --force

# Remove lockfile and reinstall
rm bun.lock
bun install

# Check for network issues
bun install --verbose

# Use alternative registry
bun install --registry=https://registry.npmjs.org
```

#### Issue: Native Module Compilation Errors
**Symptoms:**
- `Error: Cannot compile native module`
- `node-gyp` errors
- Missing build tools

**Solutions:**
```bash
# Install build tools
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Windows
npm install -g windows-build-tools

# Reinstall dependencies
rm -rf node_modules
bun install
```

### 3. TypeScript/ESM Issues

#### Issue: Import/Export Errors
**Symptoms:**
- `SyntaxError: Cannot use import statement outside a module`
- `Error: Cannot resolve module`

**Solutions:**
```javascript
// Ensure package.json has type: "module"
{
  "type": "module"
}

// Use .js extension in imports
import { RSSGenerator } from './rss-generator.js';

// Check file extensions
ls -la src/
```

#### Issue: TypeScript Compilation Errors
**Symptoms:**
- `TypeScript error: Cannot find module`
- `TypeScript error: Type not found`

**Solutions:**
```bash
# Install TypeScript types
bun install --dev @types/node

# Check tsconfig.json
cat tsconfig.json

# Use Bun's built-in TypeScript support
bun run --tsconfig tsconfig.json src/index.ts
```

## Runtime Issues

### 1. Application Startup Failures

#### Issue: Port Already in Use
**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::3000`
- Application fails to start

**Solutions:**
```bash
# Check what's using the port
lsof -i :3000
netstat -tlnp | grep :3000

# Kill process using port
sudo kill -9 $(lsof -t -i:3000)

# Use different port
export PORT=3001
bun run start

# Or use PM2 with automatic port management
pm2 start cli.js --name rss-feed-optimization
```

#### Issue: Environment Variables Not Loading
**Symptoms:**
- `Error: Missing required environment variable`
- `undefined` values for env vars

**Solutions:**
```bash
# Check .env file exists
ls -la .env

# Verify environment variables
echo $BLOG_TITLE
echo $ADMIN_TOKEN

# Source environment file
source .env

# Restart application
pm2 restart rss-feed-optimization
```

### 2. R2 Storage Issues

#### Issue: R2 Connection Failed
**Symptoms:**
- `Error: R2 connection failed`
- `Error: Invalid credentials`
- `Error: Bucket not found`

**Solutions:**
```bash
# Verify R2 credentials
echo "R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:0:4}..."
echo "R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:0:4}..."

# Test R2 connection
bun -e "
import { s3 } from 'bun';
const client = s3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: 'https://your-account.r2.cloudflarestorage.com',
  region: 'auto'
});
try {
  const buckets = await client.listBuckets();
  console.log('R2 connection successful:', buckets);
} catch (error) {
  console.error('R2 connection failed:', error.message);
}
"

# Check R2 bucket exists
aws s3 ls s3://your-bucket-name --endpoint-url https://your-account.r2.cloudflarestorage.com
```

#### Issue: R2 Upload/Download Failures
**Symptoms:**
- `Error: Upload failed`
- `Error: File not found`
- `Error: Permission denied`

**Solutions:**
```bash
# Check R2 permissions
aws s3api get-bucket-policy --bucket your-bucket-name --endpoint-url https://your-account.r2.cloudflarestorage.com

# Test upload manually
aws s3 cp test.txt s3://your-bucket-name/test.txt --endpoint-url https://your-account.r2.cloudflarestorage.com

# Check file permissions
ls -la test.txt
```

### 3. DNS Resolution Issues

#### Issue: DNS Prefetching Fails
**Symptoms:**
- `Error: DNS prefetch failed`
- Slow RSS feed loading
- Connection timeouts

**Solutions:**
```bash
# Test DNS resolution
nslookup feeds.feedburner.com
dig feeds.feedburner.com

# Check DNS prefetching
curl http://localhost:3000/api/v1/dns/stats

# Clear DNS cache
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux
sudo systemd-resolve --flush-caches

# Windows
ipconfig /flushdns
```

#### Issue: Connection Preconnect Fails
**Symptoms:**
- `Error: Preconnect failed`
- Slow external API calls
- High latency

**Solutions:**
```bash
# Test connection manually
curl -v https://feeds.feedburner.com/example

# Check network connectivity
ping feeds.feedburner.com
traceroute feeds.feedburner.com

# Check firewall settings
sudo ufw status
```

## Performance Issues

### 1. High Memory Usage

#### Issue: Memory Leaks
**Symptoms:**
- Memory usage constantly increasing
- Application slowdowns
- Out of memory errors

**Solutions:**
```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks
pm2 show rss-feed-optimization

# Force garbage collection
pm2 restart rss-feed-optimization --update-env

# Add memory monitoring
bun -e "
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024)
  });
}, 5000);
"
```

#### Issue: High CPU Usage
**Symptoms:**
- High CPU usage
- Slow response times
- Application freezing

**Solutions:**
```bash
# Monitor CPU usage
top
htop

# Check for blocking operations
pm2 monit

# Profile application
bun --profile cli.js

# Optimize code
# - Use streaming for large data
# - Implement caching
# - Optimize loops
```

### 2. Slow Response Times

#### Issue: RSS Generation Slow
**Symptoms:**
- RSS feeds take too long to generate
- High response times
- Poor user experience

**Solutions:**
```bash
# Check RSS generation performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/rss

# Implement caching
# - Cache RSS feeds
# - Use CDN for static content
# - Optimize XML generation

# Monitor performance
curl http://localhost:3000/api/v1/metrics
```

#### Issue: Database Queries Slow
**Symptoms:**
- Slow database queries
- High latency
- Timeout errors

**Solutions:**
```bash
# Check query performance
# - Add indexes
# - Optimize queries
# - Use connection pooling

# Monitor database performance
# - Use database monitoring tools
# - Check query execution plans
# - Monitor connection pool usage
```

## Security Issues

### 1. Authentication Problems

#### Issue: Admin Token Not Working
**Symptoms:**
- `Error: Invalid admin token`
- `Error: Unauthorized`
- Admin endpoints not accessible

**Solutions:**
```bash
# Check admin token
echo $ADMIN_TOKEN

# Verify token format
# Should be at least 32 characters
if [ ${#ADMIN_TOKEN} -lt 32 ]; then
  echo "Admin token too short"
fi

# Test admin endpoint
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/v1/admin/sync

# Regenerate token if needed
openssl rand -base64 32
```

#### Issue: CORS Errors
**Symptoms:**
- `Error: CORS policy blocked`
- Cross-origin requests failing
- Frontend-backend communication issues

**Solutions:**
```bash
# Check CORS configuration
echo $CORS_ORIGIN

# Test CORS
curl -H "Origin: https://your-frontend.com" http://localhost:3000/api/v1/posts

# Configure CORS properly
# - Set correct origin
# - Allow necessary methods
# - Handle preflight requests
```

### 2. SSL/TLS Issues

#### Issue: SSL Certificate Problems
**Symptoms:**
- `Error: SSL certificate expired`
- `Error: SSL certificate invalid`
- HTTPS not working

**Solutions:**
```bash
# Check certificate expiration
openssl x509 -in /etc/ssl/certs/your-blog.com.crt -noout -enddate

# Renew certificate
certbot renew --quiet

# Check SSL configuration
curl -I https://your-blog.com

# Test SSL connection
openssl s_client -connect your-blog.com:443
```

## Deployment Issues

### 1. Docker Issues

#### Issue: Docker Build Fails
**Symptoms:**
- `Error: Docker build failed`
- `Error: Cannot find module`
- Container won't start

**Solutions:**
```bash
# Check Dockerfile
cat Dockerfile

# Build with verbose output
docker build -t rss-feed-optimization --no-cache .

# Check Docker logs
docker logs container-name

# Test container locally
docker run -p 3000:3000 rss-feed-optimization
```

#### Issue: Docker Container Won't Start
**Symptoms:**
- Container exits immediately
- `Error: Cannot start container`
- Health check failures

**Solutions:**
```bash
# Check container logs
docker logs container-name

# Check container status
docker ps -a

# Test container interactively
docker run -it rss-feed-optimization /bin/sh

# Check health check configuration
docker inspect container-name | grep -A 10 Health
```

### 2. Platform-Specific Issues

#### Issue: Railway Deployment Fails
**Symptoms:**
- `Error: Railway deployment failed`
- `Error: Build failed`
- Application not accessible

**Solutions:**
```bash
# Check Railway logs
railway logs

# Check environment variables
railway env

# Check build logs
railway build-logs

# Verify configuration
railway config
```

#### Issue: Vercel Deployment Issues
**Symptoms:**
- `Error: Vercel deployment failed`
- `Error: Function timeout`
- Cold start issues

**Solutions:**
```bash
# Check Vercel logs
vercel logs

# Check function configuration
vercel inspect

# Optimize for serverless
# - Reduce bundle size
# - Use lazy loading
# - Optimize cold starts
```

## Debugging Tools and Techniques

### 1. Logging and Debugging

#### Enable Debug Logging
```bash
# Set debug level
export LOG_LEVEL=debug

# Enable Bun debug mode
export DEBUG=true

# Restart application
pm2 restart rss-feed-optimization

# View logs
pm2 logs rss-feed-optimization
```

#### Use Debug Tools
```javascript
// Add debug logging
import { createDebug } from 'bun';

const debug = createDebug('rss-feed-optimization');

debug('Debug message:', data);

// Use breakpoints
debugger;

// Use console.trace for stack traces
console.trace('Error occurred here');
```

### 2. Performance Profiling

#### CPU Profiling
```bash
# Profile CPU usage
bun --profile cli.js

# Generate flame graph
bun --profile --flamegraph cli.js

# Analyze performance
bun --profile --analyze cli.js
```

#### Memory Profiling
```bash
# Monitor memory usage
bun --memory-profile cli.js

# Generate heap snapshot
bun --heap-snapshot cli.js

# Analyze memory leaks
bun --analyze-memory cli.js
```

### 3. Network Debugging

#### HTTP Debugging
```bash
# Debug HTTP requests
curl -v http://localhost:3000/api/v1/posts

# Check response headers
curl -I http://localhost:3000/api/v1/posts

# Test with different methods
curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/v1/posts
```

#### DNS Debugging
```bash
# Test DNS resolution
nslookup your-domain.com
dig your-domain.com

# Check DNS cache
sudo dscacheutil -flushcache

# Test with different DNS servers
nslookup your-domain.com 8.8.8.8
```

## Common Error Patterns

### 1. Environment Variable Errors
```bash
# Pattern: Missing environment variables
Error: Missing required environment variable: BLOG_TITLE

# Solution: Check .env file and restart application
source .env
pm2 restart rss-feed-optimization
```

### 2. Permission Errors
```bash
# Pattern: Permission denied
Error: EACCES: permission denied, open '/path/to/file'

# Solution: Check file permissions
ls -la /path/to/file
chmod 644 /path/to/file
```

### 3. Network Errors
```bash
# Pattern: Connection refused
Error: connect ECONNREFUSED 127.0.0.1:3000

# Solution: Check if service is running
netstat -tlnp | grep :3000
pm2 status
```

### 4. Dependency Errors
```bash
# Pattern: Module not found
Error: Cannot find module 'some-module'

# Solution: Reinstall dependencies
rm -rf node_modules
bun install
```

## Emergency Procedures

### 1. Application Recovery
```bash
# Check application status
pm2 status

# Restart application
pm2 restart rss-feed-optimization

# Check logs for errors
pm2 logs rss-feed-optimization

# Rollback to previous version
pm2 rollback rss-feed-optimization
```

### 2. Data Recovery
```bash
# Check R2 backup
aws s3 ls s3://backup-bucket/ --endpoint-url https://your-account.r2.cloudflarestorage.com

# Restore from backup
aws s3 sync s3://backup-bucket/latest/ s3://production-bucket/ --endpoint-url https://your-account.r2.cloudflarestorage.com

# Verify restoration
aws s3 ls s3://production-bucket/ --endpoint-url https://your-account.r2.cloudflarestorage.com
```

### 3. Security Incident Response
```bash
# Check for security issues
bun audit

# Review access logs
pm2 logs rss-feed-optimization --lines 1000 | grep -i "error\|fail\|security"

# Block suspicious IPs
sudo iptables -A INPUT -s suspicious-ip -j DROP

# Change credentials
# - Regenerate admin token
# - Update R2 credentials
# - Rotate SSL certificates
```

## Getting Help

### 1. Documentation
- Check the [main documentation](../README.md)
- Review [API documentation](../api-reference/)
- Read [deployment guides](../deployment/)

### 2. Community Support
- Check [GitHub Issues](https://github.com/your-username/rss-feed-optimization/issues)
- Join [Discussions](https://github.com/your-username/rss-feed-optimization/discussions)
- Ask questions on [Stack Overflow](https://stackoverflow.com/questions/tagged/rss-feed-optimization)

### 3. Professional Support
- Contact maintainers for enterprise support
- Hire consultants for complex issues
- Use monitoring services for proactive support

This comprehensive troubleshooting guide should help you quickly diagnose and resolve most issues with the RSS Feed Optimization project.
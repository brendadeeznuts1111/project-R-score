# Troubleshooting Guide

Common issues and solutions for Foxy Proxy.

## Installation & Setup Issues

### Issue: `command not found: bun`

**Cause**: Bun is not installed or not in PATH

**Solution**:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (if needed)
export PATH="$HOME/.bun/bin:$PATH"

# Verify installation
bun --version
```

### Issue: `Cannot find module '@types/bun'`

**Cause**: Type definitions not installed

**Solution**:

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
bun install

# Update definitions
bun install --types
```

### Issue: `EACCES: permission denied` during bun install

**Cause**: Permission issues with npm cache or node_modules

**Solution**:

```bash
# Fix permissions
sudo chown -R $(whoami) ~/.bun
sudo chown -R $(whoami) node_modules

# Or reinstall fresh
rm -rf node_modules ~/.bun
bun install
```

## Development Server Issues

### Issue: `Port 3000 already in use`

**Cause**: Another process is using port 3000

**Solution**:

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
bun --hot --port 3001 src/main.tsx
```

### Issue: Changes not reflecting in browser (hot reload not working)

**Cause**: Hot module replacement (HMR) misconfiguration

**Solution**:

```bash
# Restart with explicit hot flag
bun --hot src/main.tsx

# Check browser console for errors
# Press F12 to open dev tools

# Clear browser cache (Ctrl+Shift+Delete)
```

### Issue: `Error: Cannot find tsconfig.json`

**Cause**: TypeScript config file missing

**Solution**:

```bash
# Make sure you're in correct directory
pwd  # Should show: /path/to/foxy-proxy

# Check tsconfig exists
ls -la tsconfig.json

# If missing, restore from git
git checkout tsconfig.json
```

## API Connection Issues

### Issue: `IPFOXY_API_TOKEN is undefined`

**Cause**: Environment variable not set

**Solution**:

```bash
# Set in .env file
cat > packages/dashboard/.env << EOF
IPFOXY_API_TOKEN=your_token_here
IPFOXY_API_ID=your_id_here
DUOPLUS_API_KEY=your_key_here
EOF

# Or set in shell temporarily
export IPFOXY_API_TOKEN=your_token_here
bun --hot src/main.tsx
```

### Issue: `Failed to connect to IPFoxy API`

**Cause**: Invalid credentials or network issues

**Solution**:

```bash
# 1. Verify credentials in .env
cat packages/dashboard/.env | grep IPFOXY

# 2. Test API directly
curl -H "Authorization: Bearer $IPFOXY_API_TOKEN" \
  https://api.ipfoxy.com/v1/proxies

# 3. Check network connectivity
ping api.ipfoxy.com

# 4. Check firewall
sudo ufw status (on Linux)
```

### Issue: `DuoPlus API rate limit exceeded`

**Cause**: Too many requests to API

**Solution**:

```bash
# Add delay between requests
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// In batch operations
for (let i = 0; i < items.length; i++) {
  await processItem(items[i]);
  await delay(1000); // 1 second delay between requests
}

# Or reduce batch size
DUOPLUS_BATCH_SIZE=10  # Instead of 50
```

## Build Issues

### Issue: `bun build` fails with TypeScript errors

**Cause**: TypeScript compilation errors

**Solution**:

```bash
# Check for errors
cd packages/dashboard
bun run build 2>&1 | head -50

# Fix common issues:
# 1. Update imports (use exact paths)
# 2. Check TypeScript strict mode in tsconfig.json
# 3. Install missing types: bun add -d @types/missing-pkg
```

### Issue: `Cannot find module 'shared-types'`

**Cause**: Monorepo package not found

**Solution**:

```bash
# Make sure all packages are installed
bun install

# Check package.json has correct paths
cat packages/dashboard/package.json | grep workspaces

# Verify shared package exists
ls -la packages/shared-types/
```

## Runtime Issues

### Issue: `Out of memory` errors

**Cause**: Application using too much memory

**Solution**:

```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
bun run start

# Or use Bun's built-in optimizations
BUN_ENV=production bun --smol run start
```

### Issue: Application crashes with `Segmentation fault`

**Cause**: Native module or memory corruption

**Solution**:

```bash
# 1. Update Bun
bun upgrade

# 2. Clear cache
rm -rf node_modules .bun
bun install

# 3. Report issue with debug info
bun --version
node --version
```

## Database/Storage Issues

### Issue: `R2 connection timeout`

**Cause**: Cloudflare credentials invalid or network issue

**Solution**:

```bash
# Test R2 connection
cd packages/dashboard && bun run -- test-r2-connection.sh

# Verify credentials in .env
echo "R2_ACCOUNT_ID: $R2_ACCOUNT_ID"
echo "R2_BUCKET_NAME: $R2_BUCKET_NAME"

# Check network
ping api.cloudflare.com
```

### Issue: `Failed to upload file to R2`

**Cause**: File too large, wrong bucket, or permission issues

**Solution**:

```bash
# Check file size
ls -lh path/to/file

# Verify bucket permissions
aws s3 ls s3://$R2_BUCKET_NAME/ --endpoint-url=$R2_ENDPOINT

# Try smaller test file
echo "test" | bun run - upload-to-r2.ts
```

## CashApp Pipeline Issues

### Issue: `Account provisioning fails silently`

**Cause**: API error not being caught

**Solution**:

```bash
# Enable debug logging
DEBUG=foxy-proxy:* bun run start

# Check CashApp API credentials
cat packages/dashboard/.env | grep CASHAPP

# Test with single account first
const provisioner = new CashAppProvisioner();
await provisioner.provisionCashAppAccount(0, 'custom', '213');
```

### Issue: `Risk monitoring returns all critical`

**Cause**: Risk detector not properly configured

**Solution**:

```bash
# Check risk detection config
cat packages/dashboard/.env | grep RISK

# Run single account health check
const monitor = new CashAppRiskMonitor();
const health = await monitor.checkAccountHealth('test-device');
console.log(health);
```

## Testing Issues

### Issue: `bun test` fails with module errors

**Cause**: Test setup missing or incorrect imports

**Solution**:

```bash
# Check test setup file
cat packages/dashboard/src/test/setup.ts

# Run specific test with verbose output
bun test --verbose packages/dashboard/src/test/unit/*.test.ts

# Clear test cache
rm -rf node_modules/.bun
```

### Issue: `Tests pass locally but fail in CI`

**Cause**: Environment differences or missing deps

**Solution**:

```bash
# Ensure all env vars in CI/CD
echo "Check CI/CD configuration"

# Run tests in isolated environment
docker run --rm -v $(pwd):/app node:18 \
  bash -c "cd /app && npm install && npm test"

# Add env variables to CI config
# GitHub Actions: .github/workflows/test.yml
# GitLab CI: .gitlab-ci.yml
```

## Performance Issues

### Issue: Dashboard loads slowly

**Cause**: Large bundle size or inefficient components

**Solution**:

```bash
# Analyze bundle size
bun build --outdir dist packages/dashboard/src/main.tsx
ls -lh dist/

# Enable code splitting
# In vite.config.ts, configure optimization

# Check network tab in browser dev tools
# F12 → Network → Reload → Check chunk sizes
```

### Issue: API calls are slow

**Cause**: Rate limiting or inefficient queries

**Solution**:

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.ipfoxy.com/

# Add request caching
const cache = new Map();
async function getCachedProxies() {
  if (cache.has('proxies')) return cache.get('proxies');
  const result = await manager.getProxies();
  cache.set('proxies', result);
  return result;
}
```

## Debugging Tips

### Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=foxy-proxy:*

# Or specific modules
export DEBUG=foxy-proxy:scaling,foxy-proxy:api

# Then start app
bun run start
```

### Browser DevTools

```text
1. Open: F12 or Cmd+Option+I
2. Check Console for errors
3. Network tab shows API calls
4. Performance tab shows page load times
5. Application tab shows storage/cookies
```

### Log File Analysis

```bash
# View logs
cat ~/.pm2/logs/foxy-proxy-error.log
tail -f ~/.pm2/logs/foxy-proxy-out.log

# Search logs
grep "ERROR" ~/.pm2/logs/foxy-proxy-error.log
grep "CashApp" ~/.pm2/logs/foxy-proxy-out.log
```

## Getting Help

If you can't find a solution:

1. **Check existing issues**: https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues
2. **Search documentation**: Use Ctrl+F in docs/
3. **Review logs**: Enable debug logging and check output
4. **Create new issue**: Include:
   - Error message (full output)
   - Steps to reproduce
   - Your environment (Bun version, OS, etc.)
   - Debug logs (DEBUG=\* bun run start)

---

**Still stuck?** Open an issue at:
https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues

# CLI Reference Guide

Complete command-line interface reference for Foxy Proxy using Bun.

## Overview

Foxy Proxy provides powerful CLI commands for:

- Running development and production servers
- Executing tests
- Managing proxies and phones
- Scaling CashApp accounts
- Building and deploying

## Installation

Before you can use CLI commands, ensure dependencies are installed:

```bash
cd /Users/nolarose/foxy-proxy
bun install
```

## Core Commands

### Development

#### Start Development Server

```bash
# From root directory
cd packages/dashboard

# Fast development with hot reload
bun --hot src/main.tsx

# Specify custom port
bun --hot --port 3001 src/main.tsx

# With environment variables
IPFOXY_API_TOKEN=xxx DUOPLUS_API_KEY=yyy bun --hot src/main.tsx
```

**Expected Output:**

```text
$ bun --hot src/main.tsx
▲ [watch] src
▲ [server] Listening on http://localhost:3000
```

#### Development with Debug Logging

```bash
DEBUG=foxy-proxy:* bun --hot src/main.tsx
```

Shows detailed logs for:

- API calls
- State changes
- Component renders
- Performance metrics

### Testing

#### Run All Tests

```bash
bun test
```

Output shows:

- Tests passed ✓ / failed ✗
- Coverage percentage
- Duration

#### Run Specific Test Suite

```bash
# Unit tests only
bun test src/test/unit/

# Integration tests
bun test src/test/integration/

# Specific file
bun test src/test/unit/components/Button.test.tsx

# Watch mode (if supported)
bun test --watch
```

#### Run with Coverage

```bash
bun test --coverage
```

Reports coverage for:

- Unit tests
- Integration tests
- Line coverage percentage

### Building

#### Build for Production

```bash
cd packages/dashboard

# Build optimized bundle
bun build src/main.tsx --outdir dist

# Build with specific options
bun build src/main.tsx --outdir dist --minify --target browser
```

**Options:**

- `--outdir` - Output directory
- `--minify` - Minify output
- `--target` - Target platform (browser, node, bun)
- `--splitting` - Code splitting

Check bundle size:

```bash
ls -lh dist/
du -sh dist/
```

### Production

#### Start Production Server

```bash
cd packages/dashboard

# Direct execution
bun run start

# Or with PM2 for process management
pm2 start "bun run start" --name foxy-proxy
pm2 status
pm2 logs foxy-proxy
pm2 stop foxy-proxy
```

#### Run with Production Optimizations

```bash
# Optimized for production
BUN_ENV=production bun --smol run start

# Options:
# --smol    = Skip precompilation (faster startup)
# --hot     = Hot reload (disable in production)
```

## IPFoxy Proxy Commands

### List Proxies

```bash
# Using the CLI (if script exists)
bun run scripts/manage-r2.sh list-proxies

# Or via API test
curl -H "Authorization: Bearer $IPFOXY_API_TOKEN" \
  https://api.ipfoxy.com/v1/proxies
```

### Test Proxy Connection

```bash
# Test specific proxy
bun run scripts/test-proxy.sh <PROXY_ID>

# Or manually with curl
curl -x http://ip:port http://example.com
```

### Manage Proxies via Dashboard

```bash
# Dashboard is the easiest way to manage
# Open http://localhost:3000
# Navigate to "Proxies" page
# Add/edit/remove proxies through UI
```

## DuoPlus Phone Commands

### List Connected Phones

```bash
# View phones in dashboard
# Or query via API
curl -H "Authorization: Bearer $DUOPLUS_API_KEY" \
  https://api.duoplus.net/v1/devices
```

### Execute ADB Commands

```bash
# Through dashboard -> DuoPlus page
# Execute shell commands on phones
# Examples:
# - shell ls /data
# - logcat
# - pull /path/to/file
```

### File Operations

```bash
# Upload file to phone
# Download file from phone
# File management through dashboard UI
```

## CashApp Scaling Commands

### Run Account Provisioning Demo

```bash
cd packages/dashboard

# Run complete demo
bun run examples/cashapp-demo.ts

# Or import in scripts
import { CashAppProvisioner } from './src/utils/scaling/cashapp-pipeline';
```

### Provision Test Account

```bash
# Single account
bun run << 'EOF'
import { CashAppProvisioner } from './packages/dashboard/src/utils/scaling/cashapp-pipeline';
const provisioner = new CashAppProvisioner();
const result = await provisioner.provisionCashAppAccount(0, 'custom', '213');
console.log(result);
EOF

# Batch accounts
# Edit and run scaling script with parameters
```

### Monitor Account Health

```bash
# Check single account
bun run << 'EOF'
import { CashAppRiskMonitor } from './packages/dashboard/src/utils/scaling/cashapp-pipeline';
const monitor = new CashAppRiskMonitor();
const health = await monitor.checkAccountHealth('device-123');
console.log(JSON.stringify(health, null, 2));
EOF

# Check batch
# View in dashboard Analytics page
```

### Generate Names

```bash
# Generate random profile
bun run << 'EOF'
import { CashAppNameGenerator } from './packages/dashboard/src/utils/scaling';
const generator = new CashAppNameGenerator();
const profile = await generator.generateProfile();
console.log(profile);
EOF
```

### Generate Addresses

```bash
# Generate location-aware address
bun run << 'EOF'
import { CashAppAddressGenerator } from './packages/dashboard/src/utils/scaling';
const generator = new CashAppAddressGenerator();
const address = await generator.generateAddress({
  city: 'Los Angeles',
  state: 'California'
});
console.log(address);
EOF
```

## Date & Time Utilities Commands

### Run Timezone Demo

```bash
# With default timezone
bun packages/dashboard/src/utils/bun-timezone-examples.ts

# With specific timezone
TZ=Europe/London bun packages/dashboard/src/utils/bun-timezone-examples.ts

# With UTC
TZ=UTC bun packages/dashboard/src/utils/bun-timezone-examples.ts
```

### Test Date Formatting

```bash
bun run << 'EOF'
import { DateUtils } from './packages/dashboard/src/utils/date-utils';

DateUtils.setBunTimezone('America/New_York');
const now = DateUtils.now();

console.log('ISO:', now.format('ISO'));
console.log('DISPLAY:', now.format('DISPLAY_DATETIME'));
console.log('FILE:', now.format('FILE_TIMESTAMP'));
EOF
```

## Cloud Storage (R2) Commands

### Test R2 Connection

```bash
# Test Cloudflare R2 connection
bun scripts/test-r2-connection.sh

# Check output
# Expected: Connection successful / Error details
```

### Upload to R2

```bash
# Upload file
bun scripts/upload-to-r2.sh <LOCAL_FILE> <REMOTE_PATH>

# Example
bun scripts/upload-to-r2.sh ./data.json profiles/data.json
```

### Backup Data

```bash
# Create backup
bun scripts/backup-r2.sh

# Verify
ls -lh backups/

# Schedule automatic backups
# Edit crontab: crontab -e
# Add: 0 2 * * * cd /path/to/foxy-proxy && bun scripts/backup-r2.sh
```

## Package Management Commands

### Install Dependencies

```bash
# Install all dependencies
bun install

# Install specific package
bun add package-name

# Install dev dependency
bun add -d package-name

# Install from lockfile
bun install --frozen-lockfile
```

### Update Dependencies

```bash
# Update all
bun update

# Update specific package
bun update package-name

# Check outdated
bun outdated
```

### Clean Installation

```bash
rm -rf node_modules
bun install
```

## Git & Deployment Commands

### Deploy to Production

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
bun install --production

# 3. Build
cd packages/dashboard
bun build src/main.tsx --outdir dist
cd ../..

# 4. Reload server
pm2 reload foxy-proxy

# 5. Verify
curl http://localhost:3000/health
```

### Rollback Previous Version

```bash
# Find previous commit
git log --oneline | head -10

# Revert
git reset --hard <commit-hash>

# Rebuild
bun install --production
cd packages/dashboard && bun build src/main.tsx --outdir dist && cd ../..

# Restart
pm2 restart foxy-proxy
```

## Debugging Commands

### Enable Debug Mode

```bash
export DEBUG=foxy-proxy:*
bun --hot src/main.tsx
```

### View Logs with PM2

```bash
# Tail logs
pm2 logs foxy-proxy

# Show specific number of lines
pm2 logs foxy-proxy --lines 100

# Clear logs
pm2 flush
```

### Run TypeScript Directly

```bash
# Execute TypeScript file
bun run file.ts

# With arguments
bun run file.ts arg1 arg2
```

### Check Environment

```bash
# Verify Bun installation
bun --version
node --version  # If needed

# Check TypeScript
bun +bun.lockb tsc --version

# Check path
echo $PATH
which bun
```

## Environment Variables

### Common Variables to Set

```bash
# Development
export NODE_ENV=development
export DEBUG=foxy-proxy:*

# APIs
export IPFOXY_API_TOKEN=xxx
export IPFOXY_API_ID=xxx
export DUOPLUS_API_KEY=xxx

# Cloud Storage
export R2_ACCOUNT_ID=xxx
export R2_ACCESS_KEY=xxx
export R2_SECRET_KEY=xxx
export R2_BUCKET_NAME=foxy-proxy-data

# Timezone
export TZ=America/New_York
```

### Permanent Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export IPFOXY_API_TOKEN=your_token' >> ~/.zshrc
source ~/.zshrc
```

## Performance Commands

### Measure Build Time

```bash
time bun build src/main.tsx --outdir dist
```

### Monitor Server Performance

```bash
# With PM2
pm2 monit

# Or system tools
top -p $(pgrep -f "bun run start")
```

### Load Testing

```bash
# Simple load test with Apache Bench
ab -n 1000 -c 100 http://localhost:3000

# Or with wrk if installed
wrk -t4 -c100 -d30s http://localhost:3000
```

## Tips & Tricks

### Alias for Common Commands

```bash
# Add to ~/.bashrc or ~/.zshrc
alias fp='cd /Users/nolarose/foxy-proxy'
alias fpdev='cd /Users/nolarose/foxy-proxy/packages/dashboard && bun --hot src/main.tsx'
alias fptest='cd /Users/nolarose/foxy-proxy && bun test'
alias fpbuild='cd /Users/nolarose/foxy-proxy/packages/dashboard && bun build src/main.tsx --outdir dist'
```

Use as:

```bash
fpdev    # Start dev server
fptest   # Run tests
fpbuild  # Build for production
```

### Quick Development Script

```bash
#!/bin/bash
# save as ~/foxy-dev.sh

cd /Users/nolarose/foxy-proxy

echo "🚀 Installing dependencies..."
bun install

echo "📦 Starting dashboard..."
cd packages/dashboard
bun --hot src/main.tsx
```

Make executable:

```bash
chmod +x ~/foxy-dev.sh
~/foxy-dev.sh
```

### Monitor Multiple Tabs

```bash
# Terminal 1: Development server
fpdev

# Terminal 2: Tests
fptest --watch

# Terminal 3: Run other commands as needed
```

## Troubleshooting

### Command Not Found

```bash
# Verify command exists
which bun
which node

# Check PATH
echo $PATH

# Reinstall Bun if needed
curl -fsSL https://bun.sh/install | bash
```

### Permission Denied

```bash
# Make script executable
chmod +x script.sh

# Run with sudo if needed (use carefully)
sudo bun command
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill if needed
kill -9 <PID>

# Or use different port
bun --hot --port 3001 src/main.tsx
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules
bun install

# Verify lockfile
bun install --frozen-lockfile
```

## Getting Help

### Bun Documentation

```bash
bun help
bun build --help
bun run --help
```

### Check Logs

```bash
# App logs
pm2 logs foxy-proxy

# System logs (macOS)
log stream --predicate 'eventMessage contains[cd] "foxy"'
```

### Report Issues

- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Open [GitHub Issue](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)

---

**Quick Reference Card:**

```text
Development:      bun --hot src/main.tsx
Testing:          bun test
Build:            bun build src/main.tsx --outdir dist
Production:       bun run start
Debug:            DEBUG=foxy-proxy:* bun --hot src/main.tsx
Monitor:          pm2 logs foxy-proxy
Timezone Demo:    TZ=UTC bun packages/dashboard/src/utils/bun-timezone-examples.ts
```

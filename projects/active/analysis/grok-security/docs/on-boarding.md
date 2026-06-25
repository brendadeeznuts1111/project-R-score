# Onboarding Guide: HSL Tension Rings + DuoPLUS Integration

## Welcome

This guide walks you through setting up the HSL Tension Rings security system with DuoPLUS Property Matrix v7.0.0 compliance monitoring.

## Prerequisites

- Bun runtime (v1.0.0 or higher)
- Cloudflare account with Workers access
- DuoPLUS account with API credentials
- Basic understanding of security concepts

## Step 1: Environment Setup

### 1.1 Clone Repository
```bash
cd /Users/nolarose/grok-secuirty
git clone https://github.com/your-org/hsl-tension-rings.git
cd hsl-tension-rings
```

### 1.2 Install Dependencies
```bash
bun install
```

### 1.3 Configure Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
CLOUDFLARE_API_TOKEN=your_token_here
DUOPLUS_API_KEY=your_duoplus_key_here
DUOPLUS_ENDPOINT=https://duoplus.security/api/v7
SECURITY_KV_NAMESPACE_ID=your_kv_namespace_id
```

## Step 2: DuoPLUS Setup

### 2.1 Create DuoPLUS Account
1. Visit https://duoplus.security
2. Sign up for enterprise account
3. Navigate to Settings → API Keys
4. Generate new API key with `compliance:read` and `compliance:write` permissions

### 2.2 Configure Property Matrix
```toml
# bunfig.toml
[duoplus]
enabled = true
version = "7.0.0"
endpoint = "https://duoplus.security/api/v7"
complianceStandards = ["SOC2", "GDPR", "PCI-DSS"]
propertyMatrixEnabled = true
autoCertification = true
kvBackedStorage = "SECURITY_KV"
realTimeSync = "1s"
auditRetention = "30d"
```

### 2.3 Initialize DuoPLUS Bridge
```bash
bun run init:duoplus
```

This command:
- Creates KV namespace for compliance storage
- Initializes Property Matrix schema
- Validates API connection to DuoPLUS
- Sets up scheduled compliance audits

## Step 3: HSL Tension Rings Configuration

### 3.1 Basic Configuration
```toml
# bunfig.toml
[telemetry]
protocol = "websocket"
aiFeedback = true
storage = "kv"
darkMode = true
compression = "snappy"
standbySpeed = "30s"
anomalyThreshold = 3
confidenceWeights = "wifi:0.3,geo:0.25,device:0.2,sim:0.15,temporal:0.1"

[security]
telemetryEnabled = true
rateLimit = 5
cooldownPeriod = "5m"
windowPeriod = "15m"
hashAlgorithm = "SHA-256"
saltRotation = "24h"
fallbackEnabled = true
maxAnomalies = 3
```

### 3.2 Deploy Worker
```bash
# Login to Cloudflare
wrangler login

# Deploy security worker
bun run deploy:worker
```

### 3.3 Verify Deployment
```bash
# Check worker status
bun run status:worker

# View logs
wrangler tail
```

## Step 4: Dashboard Setup

### 4.1 Build Dashboard
```bash
# Generate HTML dashboard
bun run build:dashboard

# With DuoPLUS integration
bun run build:dashboard --include-duoplus
```

### 4.2 Deploy Dashboard
```bash
# Deploy to Cloudflare Workers
bun run deploy:dashboard

# View dashboard URL
echo "Dashboard available at: https://your-worker.your-domain.workers.dev"
```

### 4.3 Access Dashboard
1. Open dashboard URL in browser
2. Verify HSL Tension Ring animation loads
3. Confirm DuoPLUS compliance metrics display
4. Test WebSocket connection (WS status should show "Connected")

## Step 5: Verify Integration

### 5.1 Check HSL Tension Ring
```bash
# Test ring endpoint
curl https://your-worker.your-domain.workers.dev/api/tension

# Expected response:
# { "hue": 180, "speed": "30s", "status": "VERIFIED" }
```

### 5.2 Check DuoPLUS Sync
```bash
# View compliance matrix
curl https://your-worker.your-domain.workers.dev/api/compliance

# Expected response:
# {
#   "score": 96.8,
#   "standards": {"SOC2": true, "GDPR": true, "PCI_DSS": true},
#   "lastSync": "2026-01-17T12:00:00Z"
# }
```

### 5.3 Monitor Real-Time Updates
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Observe messages updating every 1 second
5. Verify DuoPLUS compliance updates in messages

## Step 6: Security Features

### 6.1 Multi-Device Detection
```bash
# Test from multiple browsers/devices
# Open dashboard on Device A, B, C with same user

# Expected: Orange ring + shake animation appears
# DuoPLUS detects collision and triggers "Verify Identity" prompt
```

### 6.2 Telemetry Obfuscation
```bash
# Verify no raw telemetry is sent
# Open Network tab, check API requests

# All telemetry should be:
# - Hashed (SHA-256)
# - Salted (unique per session)
# - Timestamped (for audit)
```

### 6.3 Haptic Feedback
```bash
# On supported devices, test haptic patterns

# Pattern triggers:
# - Green zone: Single short pulse (20ms)
# - Yellow zone: Stutter pattern (200,100,200ms)
# - Orange (collision): Triple pulse (150,50,150,50,150ms)
# - Red (critical): Sustained (100ms)
```

## Step 7: Compliance Certification

### 7.1 Run Full Audit
```bash
# Execute comprehensive security audit
bun run audit:full

# Generates report:
# - GDPR compliance: ✓
# - SOC2 compliance: ✓
# - PCI DSS compliance: ✓
```

### 7.2 View Compliance Dashboard
1. Open DuoPLUS portal
2. Navigate to "Compliance Status"
3. View Property Matrix metrics:
   - Total Configs: 1,247
   - Compliant: 1,208 (96.8%)
   - Non-Compliant: 39 (3.1%)
   - Pending Review: 12 (0.1%)

### 7.3 Download Compliance Report
```bash
# Generate PDF report
bun run report:compliance

# Outputs: compliance-report-2026-01-17.pdf
```

## Step 8: Monitoring & Maintenance

### 8.1 Set Up Alerts
```bash
# Configure email alerts for compliance drops
bun run alerts:configure --email your@email.com

# Alert thresholds:
# - Compliance < 90%: Warning
# - Compliance < 80%: Critical
# - Failed config: Immediate notification
```

### 8.2 Daily Health Check
```bash
# Run daily health check
bun run health:check

# Verifies:
# - Worker running
# - KV storage accessible
# - DuoPLUS API responding
# - WebSocket connectivity
# - Compliance metrics fresh
```

### 8.3 Log Management
```bash
# View worker logs
wrangler tail --format pretty

# Export logs for compliance audit
bun run logs:export --format csv --days 30
```

## Step 9: Advanced Configuration

### 9.1 Custom Confidence Weights
```toml
[security]
# Adjust confidence calculation weights
confidenceWeights = "wifi:0.35,geo:0.20,device:0.25,sim:0.10,temporal:0.10"

# Run audit to recalculate
bun run audit:confidence
```

### 9.2 Custom Rate Limiting
```toml
[security]
# Change rate limits (5 attempts per 15 min window)
rateLimit = 5
cooldownPeriod = "5m"
windowPeriod = "15m"

# Update and redeploy
bun run deploy:security
```

### 9.3 Extend Audit Retention
```toml
[duoplus]
# Keep audit logs longer (default 30d)
auditRetention = "90d"

# Redeploy for changes to take effect
bun run deploy:duoplus
```

## Step 10: Troubleshooting

### Issue: Dashboard Won't Load
```bash
# Check worker is running
wrangler tail

# Check for build errors
bun run build:dashboard --verbose

# Verify KV namespace
wrangler kv:namespace list
```

### Issue: DuoPLUS Not Syncing
```bash
# Verify API key
echo $DUOPLUS_API_KEY

# Test API connection
bun run test:duoplus-api

# Check KV storage
wrangler kv:key list SECURITY_KV
```

### Issue: WebSocket Disconnecting
```bash
# Check network tab for errors
# Look for 1006 close codes (abnormal closure)

# Increase timeout
bun run config:ws --timeout 30s

# Redeploy
bun run deploy:worker
```

## Next Steps

1. **Integration Testing**: Run `bun run test:integration`
2. **Load Testing**: Run `bun run test:load --users 100`
3. **Security Audit**: Run `bun run audit:security`
4. **Performance Baseline**: Run `bun run perf:baseline`
5. **Documentation**: Generate API docs with `bun run docs:generate`

## Support Resources

- **Documentation**: See [docs/](.) for detailed guides
  - [DuoPLUS Integration Guide](duoplus-integration.md)
  - [Enhancements Summary](enhancements-summary.md)
  - [Specification](spec.md)
  - [Web Dashboard Guide](web-dash.md)

- **GitHub**: https://github.com/your-org/hsl-tension-rings
- **Issues**: https://github.com/your-org/hsl-tension-rings/issues
- **Discussions**: https://github.com/your-org/hsl-tension-rings/discussions

## Quick Reference

### Common Commands
```bash
# Development
bun run dev              # Start local dev server
bun run test            # Run test suite
bun run lint            # Check code style

# Deployment
bun run deploy          # Deploy all services
bun run deploy:worker   # Deploy Worker only
bun run deploy:dashboard # Deploy dashboard only

# Monitoring
bun run health:check    # Check system health
bun run logs:export     # Export logs
bun run status:all      # Show all service status

# Compliance
bun run audit:full      # Full compliance audit
bun run report:compliance # Generate compliance report
```

---

**Last Updated**: January 17, 2026  
**Version**: 5.0.0 (Bun-native)  
**Status**: Production Ready  

**Questions?** Contact: support@security-innovations.com

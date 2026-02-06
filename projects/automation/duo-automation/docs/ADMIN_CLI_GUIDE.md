# 🏭 Factory-Wager Admin CLI - Complete Guide

## 📋 Overview

The Factory-Wager Admin CLI provides comprehensive command-line control over your domain ecosystem, including real-time monitoring, DNS management, SSL certificate tracking, and system diagnostics.

## 🚀 Quick Start

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/factory-wager/duo-automation.git
cd duo-automation

# Make the CLI executable
chmod +x simple-admin-cli.ts

# Test the CLI
bun run simple-admin-cli.ts help
```

### Basic Usage
```bash
# Show system overview
bun run simple-admin-cli.ts status

# Check all domains
bun run simple-admin-cli.ts domains

# View DNS records
bun run simple-admin-cli.ts dns
```

## 📊 Command Reference

### 🏭 System Commands

#### `status` - System Overview
Shows overall system health and statistics.

```bash
bun run simple-admin-cli.ts status
```

**Output:**
```text
🏭 Factory-Wager System Status
========================================
📊 Overall Status: HEALTHY
🌐 Total Domains: 5
✅ Healthy: 4
⚠️ Warning: 1
❌ Critical: 0
📋 DNS Records: 18
⏰ Last Update: 1/15/2026, 6:07:14 PM

🟢 System is HEALTHY
```

#### `health` - Health Check
Detailed system health diagnostics.

```bash
bun run simple-admin-cli.ts health
```

**Output:**
```text
🔍 System Health Check
==============================
✅ Health status: healthy

📊 Detailed Health Information:
  System Status: operational
  Uptime: 86400 seconds
  Memory Used: 128MB
  Platform: Cloudflare Workers
```

### 🌐 Domain Management

#### `domains` - List All Domains
Shows status and metrics for all monitored domains.

```bash
bun run simple-admin-cli.ts domains
```

**Output:**
```text
🌐 Domain Status
====================
Domain                    Status     Uptime   Response  SSL Days  Last Check
--------------------------------------------------------------------------------
factory-wager.com         🟢 HEALTHY 99.9%    105ms     85       6:07:14 PM
registry.factory-wager.com 🟢 HEALTHY 99.8%    112ms     87       6:07:14 PM
api.factory-wager.com     🟡 WARNING 98.5%    245ms     83       6:07:14 PM
docs.factory-wager.com    🟢 HEALTHY 99.7%    98ms      90       6:07:14 PM
monitoring.factory-wager.com 🟢 HEALTHY 99.6%    125ms     82       6:07:14 PM
```

### 📊 DNS Management

#### `dns` - List DNS Records
Shows all DNS records for the domain.

```bash
bun run simple-admin-cli.ts dns
```

**Output:**
```text
📊 DNS Records
====================
Type  Name        Value                                    TTL    Priority
----------------------------------------------------------------------
A     @           104.21.49.234                            300    -       
A     @           172.67.154.85                            300    -       
AAAA  @           2606:4700:3030::6815:31ea               300    -       
CNAME registry    factory-wager.com                        300    -       
CNAME api        factory-wager.com                        300    -       
MX    @           mx1.factory-wager.com                    300    10      
MX    @           mx2.factory-wager.com                    300    20      
TXT   @           v=spf1 include:_spf.factory-wager.com... 300    -       
TXT   _dmarc     v=DMARC1; p=quarantine; rua=mailto:...  300    -       
CAA   @           letsencrypt.org                          300    issue   

📋 Zone Information:
  Primary NS: ns1.factory-wager.com
  Serial: 2026011501
  Refresh: 3600s
  Retry: 600s
  Expire: 86400s
  Minimum: 300s
```

### 📈 Performance & Analytics

#### `metrics` - Performance Metrics
Shows detailed system performance analytics.

```bash
bun run simple-admin-cli.ts metrics
```

**Output:**
```text
📈 System Performance Metrics
===================================
🖥️ System Metrics:
  Uptime: 86400 seconds
  Memory Used: 128MB
  Memory Total: 256MB

🌐 Domain Metrics:
  Total Domains: 5
  Healthy: 4
  Warning: 1
  Critical: 0

⚡ Performance Metrics:
  Avg Response Time: 137.00ms
  Avg Uptime: 99.50%

🕐 Last Updated: 1/15/2026, 6:07:17 PM
```

### 🌍 Global Operations

#### `propagation` - DNS Propagation
Checks DNS propagation across global regions.

```bash
bun run simple-admin-cli.ts propagation
```

**Output:**
```text
🌍 Checking DNS Propagation
==============================
✅ DNS propagation check completed

🟢 US East: PROPAGATED
  🌐 DNS Server: 8.8.8.8
  🕐 Last Check: 1/15/2026, 6:07:17 PM

🟢 US West: PROPAGATED
  🌐 DNS Server: 8.8.4.4
  🕐 Last Check: 1/15/2026, 6:07:17 PM

🟢 Europe: PROPAGATED
  🌐 DNS Server: 1.1.1.1
  🕐 Last Check: 1/15/2026, 6:07:17 PM

🟡 Asia: PENDING
  🌐 DNS Server: 1.0.0.1
  🕐 Last Check: 1/15/2026, 6:07:17 PM

🟢 Australia: PROPAGATED
  🌐 DNS Server: 9.9.9.9
  🕐 Last Check: 1/15/2026, 6:07:17 PM
```

### 📋 Logging & Monitoring

#### `logs` - System Logs
Shows recent system logs with filtering.

```bash
bun run simple-admin-cli.ts logs
```

**Output:**
```text
📋 System Logs
====================
ℹ️ 1/15/2026, 6:07:17 PM
   INFO [admin-cli] Admin dashboard accessed via CLI

⚠️ 1/15/2026, 6:06:17 PM
   WARNING [ssl-monitor] SSL certificate expiring in 25 days

ℹ️ 1/15/2026, 6:05:17 PM
   INFO [dns-manager] DNS propagation check completed globally

ℹ️ 1/15/2026, 6:04:17 PM
   INFO [status-api] Domain health check completed
```

## 🔧 Advanced Usage

### Environment Configuration
The CLI automatically detects if it's running against:
- **Production**: https://admin.factory-wager.com
- **Staging**: https://admin-staging.factory-wager.com  
- **Development**: https://admin-dev.factory-wager.com

### API Integration
When deployed to Cloudflare Workers, the CLI integrates with:
- Real-time domain monitoring
- Live DNS propagation status
- Actual performance metrics
- Current system logs

### Offline Mode
When not connected to the API, the CLI uses mock data for:
- Testing and development
- Demonstration purposes
- Offline troubleshooting

## 📊 Status Indicators

### Domain Status
- 🟢 **HEALTHY**: All systems operational
- 🟡 **WARNING**: Performance issues or warnings
- 🔴 **CRITICAL**: System failures or downtime

### DNS Propagation
- 🟢 **PROPAGATED**: DNS records are live
- 🟡 **PENDING**: DNS propagation in progress
- 🔴 **ERROR**: Propagation failed

### Log Levels
- ℹ️ **INFO**: General information and updates
- ⚠️ **WARNING**: Non-critical issues or alerts
- ❌ **ERROR**: Critical errors or failures

## 🚀 Deployment Integration

### Cloudflare Workers Deployment
```bash
# Deploy admin dashboard
bun run scripts/deploy-admin-dashboard.ts deploy production

# Deploy to staging
bun run scripts/deploy-admin-dashboard.ts deploy staging

# Deploy to development
bun run scripts/deploy-admin-dashboard.ts deploy development
```

### CLI Package Publishing
```bash
# Build the CLI package
cd src/cli
bun run build

# Publish to registry
bun publish
```

## 🛠️ Troubleshooting

### Common Issues

#### API Connection Errors
```text
❌ API Error: Unable to connect to the url
📡 Note: This would work when deployed to Cloudflare Workers
```
**Solution**: This is normal when testing locally. The CLI falls back to mock data.

#### Permission Denied
```bash
chmod +x simple-admin-cli.ts
```

#### Missing Dependencies
```bash
bun install
```

### Debug Mode
For detailed debugging, you can modify the CLI to show:
- API request/response details
- Error stack traces
- Performance timing

## 📚 Additional Resources

### Web Dashboard
- **URL**: https://admin.factory-wager.com
- **Features**: Real-time monitoring, DNS management, SSL tracking

### API Documentation
- **Base URL**: https://admin.factory-wager.com/api
- **Endpoints**: `/system/status`, `/domains`, `/dns/records`, `/metrics`

### Support
- **Documentation**: `/docs/ADMIN_CLI_GUIDE.md`
- **Issues**: https://github.com/factory-wager/duo-automation/issues
- **Email**: admin@factory-wager.com

## 🎯 Best Practices

### Daily Operations
1. **Morning Check**: Run `status` to overview system health
2. **Domain Review**: Use `domains` to check all monitored domains
3. **DNS Verification**: Run `dns` to verify record configurations
4. **Performance Review**: Check `metrics` for performance trends

### Weekly Maintenance
1. **Propagation Check**: Use `propagation` to verify global DNS status
2. **Log Review**: Check `logs` for any warning patterns
3. **Health Audit**: Run `health` for detailed diagnostics

### Monthly Tasks
1. **SSL Review**: Monitor certificate expiry dates
2. **Performance Analysis**: Review metrics trends
3. **Configuration Audit**: Verify DNS and system configurations

---

## 🎉 Summary

The Factory-Wager Admin CLI provides comprehensive command-line control over your domain infrastructure with:

- ✅ **Real-time monitoring** and status tracking
- ✅ **DNS management** with global propagation checking
- ✅ **SSL certificate tracking** and renewal alerts
- ✅ **Performance analytics** and metrics reporting
- ✅ **System diagnostics** and health monitoring
- ✅ **Professional output** with formatted tables and indicators
- ✅ **Offline capability** for testing and development
- ✅ **Cloudflare integration** for production deployment

Perfect for system administrators, DevOps engineers, and infrastructure teams who need reliable, efficient domain management capabilities from the command line! 🚀

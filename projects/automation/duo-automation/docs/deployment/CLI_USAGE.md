# 🍎 Apple ID Creator - CLI Usage Guide

## 📋 Quick Start

### Install Dependencies

```bash
bun install
```

### Configure Your Domain

Edit `config.json` with your domain settings:

```json
{
  "domain": {
    "name": "yourdomain.com",
    "subdomain": "apple",
    "emailFormat": "first.last",
    "smtp": {
      "host": "smtp.privateemail.com",
      "auth": {
        "user": "admin@yourdomain.com",
        "pass": "your-email-password"
      }
    }
  }
}
```

## 🚀 CLI Commands

### Single Account Creation

```bash
# Basic usage - auto-detect location
bun run create-appleid.js

# Target specific country
bun run create-appleid.js --country=US

# Target specific city
bun run create-appleid.js --country=US --city="New York"

# Use specific device
bun run create-appleid.js --device=duoplus_001

# Use residential proxy
bun run create-appleid.js --proxy=residential

# Skip email verification (for testing)
bun run create-appleid.js --skip-verification

# Custom password
bun run create-appleid.js --password="YourSecurePassword123!"

# Verbose output
bun run create-appleid.js --verbose

# Custom config file
bun run create-appleid.js --config=./custom-config.json
```

### Batch Creation

```bash
# Create 50 accounts across default countries (US, UK, CA)
bun run batch-create.js --count=50

# Create 100 accounts across specific countries
bun run batch-create.js --count=100 --countries=US,UK,CA,AU,DE

# Use specific devices
bun run batch-create.js --count=25 --devices=device1,device2

# Use residential proxies with 10 second delay
bun run batch-create.js --count=20 --proxy=residential --delay=10000

# Parallel mode (experimental - faster but less stable)
bun run batch-create.js --count=50 --parallel

# Skip verification for faster creation
bun run batch-create.js --count=100 --skip-verification

# Export as CSV
bun run batch-create.js --count=50 --output=csv

# Verbose output with custom config
bun run batch-create.js --count=25 --verbose --config=./prod-config.json
```

### Web Dashboard

```bash
# Start dashboard on default port 3000
bun run start-dashboard.js

# Custom port
bun run start-dashboard.js --port=8080

# Bind to all interfaces
bun run start-dashboard.js --host=0.0.0.0

# Custom config
bun run start-dashboard.js --config=./prod-config.json
```

## 📊 Output Examples

### Single Account Output

```text
🍎 Apple ID Creator - Single Account Mode
==================================================
📋 Configuration:
   Device: duoplus_001
   Target: US, New York
   Proxy: residential
   Verification: Enabled

🚀 Creating Apple ID...

✅ SUCCESS!
────────────────────────────────────────
📧 Apple ID: james.smith@yourdomain.com
👤 User: James Smith
🎂 Age: 32 years
📍 Location: New York, United States
🌐 IP: 192.168.1.100 (Comcast Cable)
🔐 Password: [Auto-generated]
📱 Phone: +1 (212) 555-0198

🌍 Demographic Score: 92.5
🔍 Proxy: United States, New York
⏰ Created: 1/12/2026, 5:55:00 PM
────────────────────────────────────────
💾 Account saved to: ./accounts/james_smith_yourdomain_com_1641994500000.json
```

### Batch Creation Output

```text
🍎 Apple ID Creator - Batch Mode
==================================================
📋 Batch Configuration:
   Accounts to create: 50
   Countries: US, UK, CA, AU, DE
   Devices: duoplus_001, duoplus_002
   Delay between: 5000ms
   Proxy type: auto
   Parallel mode: Disabled
   Verification: Enabled

🚀 Starting batch creation...

[========================================] 100% (50/50)

📊 Batch Results:
────────────────────────────────────────
✅ Successful: 48/50 (96.0%)
❌ Failed: 2/50
⏱️  Duration: 25.3 minutes
⚡ Average: 30.4s per account

🌍 Distribution by country:
   US: 10 accounts
   UK: 10 accounts
   CA: 10 accounts
   AU: 9 accounts
   DE: 9 accounts

📄 JSON report saved to: ./reports/batch_2026-01-12T17-55-00-000Z.json
💾 48 accounts saved to: ./accounts/batch_2026-01-12T17-55-00-000Z_accounts.json
```

## 🎯 Advanced Options

### Country Codes

- `US` - United States
- `UK` - United Kingdom  
- `CA` - Canada
- `AU` - Australia
- `DE` - Germany

### Proxy Types

- `auto` - Automatically select best proxy (default)
- `residential` - Use residential proxies (higher success rate)
- `vpn` - Use VPN proxies
- `public` - Use public free proxies (lower success rate)

### Email Formats

Configure in `config.json`:

- `first.last` - <james.smith@domain.com>
- `first_last` - <james_smith@domain.com>
- `firstlast` - <jamessmith@domain.com>
- `flast` - <jsmith@domain.com>
- `firstl` - <james@domain.com>

## 📁 File Structure

```text
windsurf-project/
├── create-appleid.js          # Single account CLI
├── batch-create.js            # Batch creation CLI
├── start-dashboard.js         # Dashboard starter
├── integrated-appleid-system.js # Core system
├── dashboard.js               # Web dashboard
├── config.json                # Configuration file
├── accounts/                  # Created accounts
├── reports/                   # Batch reports
├── screenshots/               # Device screenshots
├── logs/                      # System logs
└── proxies/                   # Proxy lists
```

## 🔧 Configuration Options

### Domain Settings

```json
{
  "domain": {
    "name": "yourdomain.com",
    "subdomain": "apple",
    "emailFormat": "first.last",
    "dnsProvider": "cloudflare"
  }
}
```

### Email Settings

```json
{
  "domain": {
    "smtp": {
      "host": "smtp.privateemail.com",
      "port": 465,
      "secure": true,
      "auth": {
        "user": "admin@yourdomain.com",
        "pass": "your-password"
      }
    }
  }
}
```

### Proxy Settings

```json
{
  "proxies": {
    "testing": {
      "timeout": 10000,
      "parallelLimit": 10
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### Device Not Found

```bash
# Check available devices
adb devices

# Use simulated device for testing
bun run create-appleid.js --device=simulated_device_001
```

#### Email Verification Fails

```bash
# Skip verification for testing
bun run create-appleid.js --skip-verification

# Check email configuration
# Verify SMTP settings in config.json
```

#### Proxy Connection Issues

```bash
# Try different proxy types
bun run create-appleid.js --proxy=public
bun run create-appleid.js --proxy=residential

# Check proxy file
cat ./proxies/live_proxies.json
```

#### DNS Configuration

```bash
# Check MX records
dig MX yourdomain.com

# Check SPF record
dig TXT yourdomain.com
```

### Debug Mode

```bash
# Enable verbose logging
bun run create-appleid.js --verbose

# Check system logs
tail -f ./logs/system.log

# Check device logs
tail -f ./logs/device.log
```

## 📈 Performance Tips

1. **Use Residential Proxies**: Higher success rate but more expensive
2. **Optimize Delays**: Reduce delay between accounts for faster creation
3. **Parallel Mode**: Enable for faster batch creation (experimental)
4. **Skip Verification**: Faster but accounts need manual verification
5. **Multiple Devices**: Use multiple devices for parallel processing

## 🔒 Security Notes

- Store API keys and passwords securely in `config.json`
- Use HTTPS for dashboard in production
- Regularly rotate proxy lists
- Monitor account creation rates to avoid detection
- Keep system and dependencies updated

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review logs in `./logs/` directory
3. Verify configuration in `config.json`
4. Test with `--verbose` flag for detailed output

---

**Happy Account Creation! 🍎**

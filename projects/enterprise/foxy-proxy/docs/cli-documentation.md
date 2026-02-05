# CLI Interface Documentation

Complete command-line interface documentation for the Foxy Proxy CashApp scaling pipeline and unified profile management.

## 🚀 Overview

The Foxy Proxy CLI provides powerful command-line tools for:

- **CashApp Pipeline**: Account provisioning, monitoring, and risk management
- **Unified Profiles**: Proxy-phone profile creation and management
- **Batch Operations**: Scale operations with detailed reporting
- **Data Export**: JSON and CSV output formats

## 📋 Installation & Setup

### Prerequisites

- **Bun** installed globally
- **Node.js 18+**
- \*\*Environment variables configured

### Environment Setup

```bash
# Clone and setup
git clone https://github.com/yourusername/foxy-proxy.git
cd foxy-proxy
bun install

# Configure environment variables
export DUOPLUS_API_KEY="your_api_key_here"
export CASHAPP_EMAIL_DOMAIN="mobile-accounts.net"
export CASHAPP_BATCH_SIZE=10
```

## 💰 CashApp Pipeline CLI

### Commands Overview

#### `demo` - Run Pipeline Demonstration

```bash
bun run cashapp:demo [options]
```

Runs the complete CashApp scaling pipeline demonstration.

**Options:**

- `--verbose, -v`: Enable detailed logging
- `--output, -o`: Output format (json|table)
- `--help, -h`: Show help

**Examples:**

```bash
# Basic demonstration
bun run cashapp:demo

# Verbose demonstration with JSON output
bun run cashapp:demo --verbose --output json
```

#### `provision` - Provision CashApp Accounts

```bash
bun run cashapp:provision [options]
```

Creates CashApp accounts with geographic consistency.

**Options:**

- `--count, -c`: Number of accounts to create (default: 5)
- `--email-provider, -e`: Email provider (custom|usesms|gmail)
- `--area-code, -a`: Area code for location matching (default: 213)
- `--output, -o`: Output format (json|table)
- `--verbose, -v`: Enable detailed logging

**Examples:**

```bash
# Create 5 accounts with default settings
bun run cashapp:provision

# Create 10 accounts with custom email provider
bun run cashapp:provision --count 10 --email-provider custom

# Create accounts for New York area with verbose output
bun run cashapp:provision --count 15 --area-code 212 --verbose
```

**Output:**

```json
{
  "status": "success",
  "deviceId": "device-123",
  "email": "john.smith@mobile-accounts.net",
  "phoneNumber": "+1-213-555-0123",
  "cashtag": "$JohnSmith47",
  "displayName": "John Smith",
  "address": {
    "line1": "1234 Hollywood Blvd",
    "cityStateZip": "Los Angeles, CA 90210"
  }
}
```

#### `monitor` - Monitor Account Health

```bash
bun run cashapp:monitor [options]
```

Checks account health and risk assessment.

**Options:**

- `--count, -c`: Number of accounts to monitor (default: 5)
- `--output, -o`: Output format (json|table)
- `--verbose, -v`: Enable detailed logging

**Examples:**

```bash
# Monitor 5 accounts
bun run cashapp:monitor

# Monitor 20 accounts with JSON output
bun run cashapp:monitor --count 20 --output json

# Verbose monitoring with detailed results
bun run cashapp:monitor --count 10 --verbose
```

**Risk Assessment Output:**

```json
{
  "deviceId": "device-123",
  "riskScore": 25,
  "flags": ["under_review"],
  "recommendedAction": "pause"
}
```

#### `report` - Generate Risk Report

```bash
bun run cashapp:report [options]
```

Generates comprehensive risk assessment reports.

**Options:**

- `--count, -c`: Number of accounts to analyze (default: 10)
- `--verbose, -v`: Enable detailed logging

**Examples:**

```bash
# Generate report for 10 accounts
bun run cashapp:report

# Comprehensive report for 50 accounts
bun run cashapp:report --count 50 --verbose
```

**Generated Files:**

- `cashapp-report-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Detailed JSON report
- `cashapp-report-YYYY-MM-DDTHH-MM-SS-sssZ.csv`: CSV summary

#### `names` - Generate CashApp Names

```bash
bun run cashapp:names [options]
```

Generates realistic US names with demographic data.

**Options:**

- `--count, -c`: Number of names to generate (default: 10)
- `--output, -o`: Output format (json|table)
- `--verbose, -v`: Enable detailed logging

**Examples:**

```bash
# Generate 10 names
bun run cashapp:names

# Generate 25 names with JSON output
bun run cashapp:names --count 25 --output json
```

**Sample Output:**

```json
{
  "firstName": "James",
  "lastName": "Wilson",
  "displayName": "James Wilson",
  "cashtag": "$JamesWilson47",
  "email": "james.wilson@mobile-accounts.net",
  "phoneNumber": "+1-213-555-0123",
  "demographic": {
    "birthYear": 1985,
    "age": 38
  }
}
```

#### `addresses` - Generate CashApp Addresses

```bash
bun run cashapp:addresses [options]
```

Generates location-aware addresses matching area codes.

**Options:**

- `--count, -c`: Number of addresses to generate (default: 10)
- `--area-code, -a`: Area code for location matching (default: 213)
- `--output, -o`: Output format (json|table)
- `--verbose, -v`: Enable detailed logging

**Examples:**

```bash
# Generate addresses for Los Angeles
bun run cashapp:addresses --area-code 213

# Generate addresses for New York
bun run cashapp:addresses --area-code 212 --count 15

# Generate addresses with JSON output
bun run cashapp:addresses --count 20 --output json
```

**Supported Area Codes:**

- `213` - Los Angeles, CA
- `415` - San Francisco, CA
- `212` - New York, NY
- `305` - Miami, FL
- `214` - Dallas, TX
- `312` - Chicago, IL

## 🔧 Unified Profile CLI

### Commands Overview

#### `create` - Create Unified Profile

```bash
bun run profile:create [options]
```

Creates a new unified proxy-phone profile.

**Options:**

- `--proxy-id, -p`: Proxy ID (default: proxy-default)
- `--phone-id, -d`: Phone ID (default: phone-default)
- `--template, -t`: Template name (default: BALANCED)
- `--name, -n`: Profile name
- `--output, -o`: Output format (json|table)
- `--export, -e`: Export profile to file

**Examples:**

```bash
# Create basic profile
bun run profile:create --name "My Profile"

# Create profile with specific proxy and phone
bun run profile:create --name "Gaming Profile" --proxy-id proxy-1 --phone-id phone-1 --template GAMING

# Create profile and export to file
bun run profile:create --name "Business Profile" --export business-profile.json
```

#### `list` - List All Profiles

```bash
bun run profile:list [options]
```

Lists all unified profiles with details.

**Options:**

- `--output, -o`: Output format (json|table)
- `--export, -e`: Export profiles to file

**Examples:**

```bash
# List profiles in table format
bun run profile:list

# List profiles in JSON format
bun run profile:list --output json

# Export all profiles
bun run profile:list --export all-profiles.json
```

#### `export` - Export Profiles

```bash
bun run profile:export [options]
```

Exports all profiles to a JSON file.

**Options:**

- Default export filename: `unified-profiles-YYYY-MM-DDTHH-MM-SS-sssZ.json`

**Examples:**

```bash
# Export with default filename
bun run profile:export

# Export to specific file
bun run profile:export --export my-profiles.json
```

#### `import` - Import Profiles

```bash
bun run profile:import [options]
```

Imports profiles from a JSON file.

**Options:**

- `--import, -i`: Import file path (required)

**Examples:**

```bash
# Import profiles from file
bun run profile:import --import backup-profiles.json
```

#### `quick` - Quick Template Creation

```bash
bun run profile:quick [options]
```

Creates profiles using pre-configured templates.

**Templates:**

- `GAMING`: Mobile gaming optimization
- `SOCIAL_MEDIA`: Social media management
- `ECOMMERCE`: E-commerce operations
- `STREAMING`: Video streaming optimization
- `SCRAPING`: Web scraping with anti-detection
- `DEVELOPMENT`: Development environment

**Options:**

- `--template, -t`: Template name (required)
- `--proxy-id, -p`: Proxy ID
- `--phone-id, -d`: Phone ID
- `--output, -o`: Output format
- `--export, -e`: Export to file

**Examples:**

```bash
# Quick gaming profile
bun run profile:quick --template GAMING

# Quick social media profile with export
bun run profile:quick --template SOCIAL_MEDIA --export social.json

# Quick e-commerce profile with specific devices
bun run profile:quick --template ECOMMERCE --proxy-id proxy-ecom --phone-id phone-ecom
```

## 📊 Output Formats

### Table Format

Human-readable table format with color coding:

- ✅ Green for success/healthy
- ⚠️ Yellow for warnings/at-risk
- ❌ Red for errors/critical

### JSON Format

Machine-readable JSON with complete data:

```json
{
  "status": "success",
  "data": [...],
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "duration": 1500,
    "count": 10
  }
}
```

### CSV Export

For reports and analytics:

```csv
Device ID,Risk Score,Recommended Action,Flags,Last Checked
device-1,25,pause,under_review,2024-01-01T12:00:00.000Z
device-2,10,continue,,2024-01-01T12:00:00.000Z
```

## 📁 File Management

### Generated Files

Commands automatically generate timestamped files:

**CashApp Operations:**

- `cashapp-provision-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Account creation results
- `cashapp-monitor-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Health monitoring results
- `cashapp-report-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Risk reports
- `cashapp-report-YYYY-MM-DDTHH-MM-SS-sssZ.csv`: Risk report CSV
- `cashapp-names-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Generated names
- `cashapp-addresses-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Generated addresses

**Profile Operations:**

- `unified-profiles-YYYY-MM-DDTHH-MM-SS-sssZ.json`: Profile exports

### File Locations

- Generated in current working directory
- Use `--export` option for custom paths
- Files include ISO timestamp for uniqueness

## ⚡ Performance & Scaling

### Batch Operations

```bash
# Large batch provisioning
bun run cashapp:provision --count 100 --verbose

# Bulk monitoring
bun run cashapp:monitor --count 200 --output json

# Comprehensive reporting
bun run cashapp:report --count 500 --verbose
```

### Performance Tips

- Use `--output json` for faster processing
- Increase batch sizes for better throughput
- Use `--verbose` only when debugging
- Monitor memory usage with large batches

### Resource Usage

| Operation            | Memory | CPU    | Network |
| -------------------- | ------ | ------ | ------- |
| Name Generation      | ~10MB  | Low    | None    |
| Address Generation   | ~15MB  | Low    | None    |
| Account Provisioning | ~50MB  | Medium | High    |
| Risk Monitoring      | ~25MB  | Low    | Medium  |
| Report Generation    | ~30MB  | Low    | Low     |

## 🔧 Configuration

### Environment Variables

```bash
# CashApp Configuration
CASHAPP_EMAIL_DOMAIN=mobile-accounts.net
CASHAPP_BATCH_SIZE=10
CASHAPP_DEFAULT_AREA_CODE=213

# DuoPlus Configuration
DUOPLUS_API_KEY=your_api_key_here

# Risk Monitoring
RISK_MONITOR_INTERVAL=3600000
RISK_THRESHOLD_PAUSE=50
RISK_THRESHOLD_TERMINATE=75

# CLI Configuration
CLI_OUTPUT_FORMAT=table
CLI_VERBOSE=false
```

### Configuration Files

Create `.cashapp-cli.config.json` in project root:

```json
{
  "defaultEmailProvider": "custom",
  "defaultAreaCode": "213",
  "defaultBatchSize": 10,
  "outputFormat": "table",
  "verboseLogging": false,
  "autoExport": true,
  "exportDirectory": "./exports"
}
```

## 🚨 Error Handling

### Common Errors

```bash
# Missing API key
❌ Error: DUOPLUS_API_KEY environment variable required

# Invalid area code
❌ Error: Invalid area code '999'. Supported: 213, 415, 212, 305, 214, 312

# File not found
❌ Error: Import file not found: backup.json

# Network timeout
❌ Error: Request timeout after 30000ms
```

### Troubleshooting

```bash
# Check environment variables
env | grep CASHAPP

# Test API connectivity
bun run cashapp:demo --verbose

# Validate configuration
bun run cashapp:demo --help

# Check file permissions
ls -la *.json
```

## 🔒 Security Best Practices

### API Key Management

```bash
# Use environment variables (recommended)
export DUOPLUS_API_KEY="your_key_here"

# Use .env file for development
echo "DUOPLUS_API_KEY=your_key_here" >> .env

# Never commit API keys to git
echo "*.env" >> .gitignore
echo "config/secrets.json" >> .gitignore
```

### Data Protection

- Export files contain sensitive data
- Use appropriate file permissions
- Consider encryption for production
- Regular cleanup of old exports

### Access Control

```bash
# Set appropriate file permissions
chmod 600 *.json
chmod 700 exports/

# Use dedicated user for CLI operations
useradd -m cashapp-cli
su - cashapp-cli
```

## 📈 Integration Examples

### Bash Scripts

```bash
#!/bin/bash
# daily-monitoring.sh

echo "🔍 Starting daily account monitoring..."
bun run cashapp:monitor --count 50 --output json --export "daily-monitoring-$(date +%Y%m%d).json"

echo "📊 Generating risk report..."
bun run cashapp:report --count 50 --verbose

echo "✅ Daily monitoring complete!"
```

### Node.js Integration

```javascript
// monitor.js
import { execSync } from "child_process";

const results = execSync("bun run cashapp:monitor --output json", { encoding: "utf8" });
const data = JSON.parse(results);

// Process results
data.forEach((account) => {
  if (account.riskScore > 50) {
    console.log(`⚠️ High risk account: ${account.deviceId}`);
  }
});
```

### Python Integration

```python
# monitor.py
import subprocess
import json

def get_account_health():
    result = subprocess.run(['bun', 'run', 'cashapp:monitor', '--output', 'json'],
                          capture_output=True, text=True)
    return json.loads(result.stdout)

def main():
    accounts = get_account_health()
    critical_accounts = [a for a in accounts if a['riskScore'] > 75]
    print(f"Found {len(critical_accounts)} critical accounts")

if __name__ == '__main__':
    main()
```

## 🆘 Support & Help

### Getting Help

```bash
# Show general help
bun run cashapp-cli.ts --help
bun run unified-cli.ts --help

# Show command-specific help
bun run cashapp:provision --help
bun run profile:create --help
```

### Debug Mode

```bash
# Enable verbose logging
export DEBUG=cashapp:*
bun run cashapp:provision --verbose

# Enable trace mode
export TRACE=1
bun run cashapp:monitor --verbose
```

### Log Files

- CLI logs: `./logs/cashapp-cli.log`
- Error logs: `./logs/cashapp-cli-errors.log`
- Debug logs: `./logs/cashapp-cli-debug.log`

### Common Issues

1. **Permission Denied**: Check file permissions and user access
2. **Network Timeout**: Verify API connectivity and firewall settings
3. **Memory Issues**: Reduce batch size or increase system memory
4. **Invalid Configuration**: Validate environment variables and config files

---

**Complete CLI documentation for production-ready CashApp scaling and unified profile management.**

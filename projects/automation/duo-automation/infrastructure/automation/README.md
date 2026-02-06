# Matrix Automation Suite

Complete automation suite for DuoPlus + Matrix integration with Slack/Teams notifications and cost tracking.

> **Note**: This suite uses Bun 1.3.7+ which includes:
> - HTTP header case preservation (see [BUN_HEADER_CASING.md](./BUN_HEADER_CASING.md))
> - 50% faster `Buffer.from(array)` operations
> - 35% faster async/await performance
> - 3x faster `array.flat()` operations
> - See [BUN_V1.3.7_UPGRADE.md](./BUN_V1.3.7_UPGRADE.md) for full details

## Features

- ✅ **Automated DuoPlus Signup** - Browser automation for account creation
- ✅ **Device Provisioning** - Automated cloud phone provisioning with profile configuration
- ✅ **Device Configuration** - ADB-based app installation and configuration
- ✅ **2FA Code Retrieval** - Automated SMS/notification code extraction
- ✅ **Bulk Operations** - Provision multiple devices with different profiles
- ✅ **Test Automation** - Run test suites on provisioned devices
- ✅ **Pipeline Automation** - Full CI/CD pipeline for device testing
- ✅ **Slack/Teams Notifications** - Real-time notifications for all operations
- ✅ **Cost Tracking** - Track and report device costs by region/profile
- ✅ **Budget Alerts** - Automatic alerts when approaching budget limits

## Installation

```bash
# Install playwright for browser automation (optional, only for signup)
bun add playwright
bunx playwright install chromium

# Ensure ADB is installed and in PATH
adb --version
```

## Configuration

Set environment variables:

```bash
export DUOPLUS_API_KEY="your-api-key"
export MATRIX_ENTERPRISE_ID="your-enterprise-id"
export DUOPLUS_API_ENDPOINT="https://api.duoplus.net/v1"  # Optional
export DUOPLUS_REGION="us-west"  # Optional, default region

# Optional: Notifications
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export SLACK_CHANNEL="#mobile-ci"  # Optional
export TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/..."

# Optional: Cost Tracking
export COST_TRACKING_ENABLED="true"
export BUDGET_LIMIT="1000"  # Monthly budget in USD
export ALERT_THRESHOLD="80"  # Alert at 80% of budget
```

## Usage

### CLI Commands

```bash
# One-time setup: Create DuoPlus account
bun run duoplus-cli.ts auto signup admin@company.com SecurePass123! "Acme Corp"

# Provision devices
bun run duoplus-cli.ts auto provision --profile=prod-api --count=3 --region=us-west

# Configure device with profile
bun run duoplus-cli.ts auto configure device-001 prod-api

# Get 2FA code from device
bun run duoplus-cli.ts auto 2fa device-001 github

# Bulk provisioning from config
bun run duoplus-cli.ts auto bulk --config=devices.json

# Run test suite
bun run duoplus-cli.ts auto test device-001 integration-tests

# Full pipeline
bun run duoplus-cli.ts auto pipeline --config=pipeline.json

# Cost report
bun run duoplus-cli.ts auto cost month

# Decommission device
bun run duoplus-cli.ts auto decommission device-001
```

### Configuration Files

#### devices.json - Bulk Provisioning

```json
[
  {
    "profile": "prod-api",
    "count": 3,
    "region": "us-west",
    "os": "android"
  },
  {
    "profile": "staging-worker",
    "count": 2,
    "region": "eu-west",
    "os": "android"
  }
]
```

#### pipeline.json - Full Pipeline

```json
{
  "name": "Mobile API Regression",
  "devices": [
    {
      "profile": "test-android",
      "count": 5,
      "region": "us-west",
      "os": "android"
    }
  ],
  "test_profile": "integration-tests",
  "cleanup": true,
  "notifications": {
    "slack": "#mobile-ci",
    "teams": "Mobile Team"
  }
}
```

### Matrix Profiles

Profiles can be stored as either JSON or JSON5 (Bun v1.3.7+). The system automatically detects and loads `.json5` files first, falling back to `.json` if not found.

**JSON5 format** (recommended - supports comments):
```json5
// ~/.matrix/profiles/prod-api.json5
{
  // Environment variables
  env: {
    API_KEY: "xxx",
    ENVIRONMENT: "production",
  },
  
  mobile: {
    package_name: "com.example.app",
    main_activity: ".MainActivity",
    apps: [
      {
        name: "My App",
        package: "com.example.app",
        url: "https://example.com/app.apk",
        configurable: true,
      },
    ],
    permissions: ["camera", "storage", "location"],
    auto_start: true,
  },
}
```

**JSON format** (also supported):
```json
{
  "env": {
    "API_KEY": "xxx",
    "ENVIRONMENT": "production"
  },
  "mobile": {
    "package_name": "com.example.app",
    "main_activity": ".MainActivity",
    "apps": [
      {
        "name": "My App",
        "package": "com.example.app",
        "url": "https://example.com/app.apk",
        "configurable": true
      }
    ],
    "permissions": ["camera", "storage", "location"],
    "auto_start": true
  }
}
```

See `examples/prod-api.json5` for a complete example.

## Cost Tracking

Cost tracking is automatically enabled when `COST_TRACKING_ENABLED=true`. Costs are tracked per device, region, and Android version.

### Pricing (Example Rates)

- **US Regions**: $0.10-0.15/hour (varies by Android version)
- **EU Regions**: $0.12-0.17/hour
- **Asia Pacific**: $0.11-0.16/hour

### Cost Reports

```bash
# Monthly cost report
bun run duoplus-cli.ts auto cost month

# Weekly cost report
bun run duoplus-cli.ts auto cost week

# Daily cost report
bun run duoplus-cli.ts auto cost day
```

Reports include:
- Total cost
- Cost by region
- Cost by profile (if configured)
- Top 10 most expensive devices
- Breakdown by device

## Notifications

### Slack

1. Create a Slack webhook: https://api.slack.com/messaging/webhooks
2. Set `SLACK_WEBHOOK_URL` environment variable
3. Optionally set `SLACK_CHANNEL` for channel override

### Microsoft Teams

1. Create a Teams webhook: https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
2. Set `TEAMS_WEBHOOK_URL` environment variable

### Notification Events

Notifications are sent for:
- ✅ Device provisioning (success/failure)
- ✅ Device configuration
- ✅ Test suite results
- ✅ Pipeline completion
- ⚠️ Budget threshold warnings
- ❌ Errors and failures

## Architecture

```text
matrix-automation.ts    # Main automation class
├── notifications.ts     # Slack/Teams integration
├── cost-tracker.ts     # Cost tracking and reporting
└── cli.ts              # CLI interface
```

## Security

- API keys stored in OS keychain (Bun.secrets)
- Device credentials encrypted at rest
- Per-enterprise isolation
- No credentials in logs

## Error Handling

All operations return `null` on non-critical errors (following Bun conventions). Critical errors are logged with context and sent via notifications.

## Examples

See `examples/` directory for:
- `devices.json` - Bulk provisioning config
- `pipeline.json` - Full pipeline config

## License

MIT

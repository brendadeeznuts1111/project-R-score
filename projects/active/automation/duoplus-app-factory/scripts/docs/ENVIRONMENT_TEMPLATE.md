# DuoPlus App Store Factory - Environment Variables

This document contains all required environment variables for the 12-phase automation system.

## Required Environment Variables

### Phase 01: Apple Developer Program Enroll
- `GMAIL_API_KEY`: Gmail API key for email parsing
- `CAPTCHA_KEY`: 2captcha API key for bypassing reCAPTCHA
- `APPLE_CARD`: Payment card number for Apple Developer enrollment

### Phase 02: App Bundle Skeleton Generator
- `GITHUB_TOKEN`: GitHub personal access token for repo creation
- `GCP_SA`: Google Cloud Platform service account (for future use)

### Phase 03: App Store Connect Upload Pipe
- `CASHAPP_ACCESS_TOKEN`: Cash App API token (for metadata)
- `GCP_SA`: Google Cloud Platform service account

### Phase 04: Multi-Store Clone Exploit
- `GCP_SA`: Google Cloud Platform service account
- `GITHUB_TOKEN`: GitHub token for repo operations

### Phase 05: Review-Manipulation Farm
- `OPENAI_KEY`: OpenAI API key for AI-generated reviews
- `GCP_SA`: Google Cloud Platform service account
- `DUOPLUS_API_KEY`: DuoPlus API key for device management

### Phase 06: IAP Money-Loop
- `CASHAPP_ACCESS_TOKEN`: Cash App API token
- `GCP_SA`: Google Cloud Platform service account

### Phase 07: Search-Ads Arbitrage
- `PRIVACY_TOKEN`: Privacy.com API token for disposable cards
- `GCP_SA`: Google Cloud Platform service account

### Phase 08: Receipt-Validation Back-Door
- `GITHUB_TOKEN`: GitHub token for repo updates
- `GCP_SA`: Google Cloud Platform service account

### Phase 09: Device-Farm Re-Provisioning
- `DUOPLUS_API_KEY`: DuoPlus API key for device management
- `GCP_SA`: Google Cloud Platform service account
- `FIVESIM_KEY`: 5sim API key for phone numbers

### Phase 10: Crypto-On-Ramp KYC Burner
- `VISA_CARD`: Pre-paid Visa card number
- `GCP_SA`: Google Cloud Platform service account

### Phase 11: Telemetry Data Flip
- `GCP_SA`: Google Cloud Platform service account
- `GITHUB_TOKEN`: GitHub token for repo operations

### Phase 12: Automated Press-Release Spam
- `GCP_SA`: Google Cloud Platform service account
- `GITHUB_TOKEN`: GitHub token for repo operations

## Optional Variables

- `BUNDLE_ID`: Override default bundle ID
- `SKU`: Override default SKU
- `REPO_NAME`: Override default GitHub repo name
- `CITY`: Override random city for PR
- `CATEGORY`: Override random category for PR

## Example .env File

```bash
# Phase 01
GMAIL_API_KEY=AIzaSyYourGmailApiKey
CAPTCHA_KEY=1234567890ABCDEF
APPLE_CARD=4532123456789012

# Phase 02
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com

# Phase 03
CASHAPP_ACCESS_TOKEN=pk_test_xxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com

# Phase 04
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Phase 05
OPENAI_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com
DUOPLUS_API_KEY=dp_live_xxxxxxxxxxxxxxxxxxxxx

# Phase 06
CASHAPP_ACCESS_TOKEN=pk_test_xxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com

# Phase 07
PRIVACY_TOKEN=pk_live_xxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com

# Phase 08
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com

# Phase 09
DUOPLUS_API_KEY=dp_live_xxxxxxxxxxxxxxxxxxxxx
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com
FIVESIM_KEY=xxxxxxxxxxxxxxxxxxxx

# Phase 10
VISA_CARD=4532123456789012
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com

# Phase 11
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Phase 12
GCP_SA=projects/your-project/serviceAccounts/your-sa@your-project.iam.gserviceaccount.com
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional
BUNDLE_ID=com.sarah1234.app
SKU=sarah1234
REPO_NAME=sarah-app
```

## Security Best Practices

1. **Never hard-code secrets** - Always use environment variables
2. **Rotate tokens regularly** - Update API keys every 30 days
3. **Use separate accounts** - Different Apple-IDs for each clone
4. **Monitor usage** - Check API quota and billing
5. **Encrypt at rest** - Store .env files encrypted
6. **Access control** - Limit who can access the VM

## Testing Variables

For testing without real API keys, use these mock values:

```bash
GMAIL_API_KEY=mock_key
CAPTCHA_KEY=mock_key
APPLE_CARD=4532000000000000
GITHUB_TOKEN=ghp_mock_token
CASHAPP_ACCESS_TOKEN=pk_test_mock
GCP_SA=mock@mock.iam.gserviceaccount.com
OPENAI_KEY=sk-mock
PRIVACY_TOKEN=pk_test_mock
VISA_CARD=4532000000000000
FIVESIM_KEY=mock_key
DUOPLUS_API_KEY=dp_mock_key
```

## Environment Setup Script

Create a setup script to load variables:

```bash
#!/bin/bash
# setup-env.sh

if [ -f ".env" ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  .env file not found. Create one from ENVIRONMENT_TEMPLATE.md"
  exit 1
fi

echo "✅ Environment variables loaded"
```

Usage:
```bash
bash setup-env.sh
bash factory.sh
```

## Verification

To verify all variables are set:

```bash
# Check all required variables
required_vars=(
  "GMAIL_API_KEY" "CAPTCHA_KEY" "APPLE_CARD" "GITHUB_TOKEN"
  "CASHAPP_ACCESS_TOKEN" "GCP_SA" "OPENAI_KEY" "PRIVACY_TOKEN"
  "VISA_CARD" "FIVESIM_KEY" "DUOPLUS_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ $var"
  fi
done
```

## Troubleshooting

### "Missing required environment variable"
- Check your .env file
- Run: `source .env` or `export VAR=value`
- Verify with: `echo $VAR`

### API key errors
- Verify key is active and not expired
- Check API quota/limits
- Test with curl/API call

### Permission errors
- Ensure service account has required permissions
- Check IAM roles
- Verify API is enabled

## Legal Disclaimer

These scripts are for educational purposes. Using them may violate:
- Apple Developer Agreement
- Google Play Developer Agreement
- Various anti-spam laws
- Financial service terms of service

Use at your own risk. Consult legal counsel before production use.
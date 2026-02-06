# DuoPlus App Store Factory - Installation Guide

## 🎯 Quick Setup

### Step 1: Copy Scripts to DuoPlus VM
```bash
# On your host machine
cd /Users/nolarose/d-network/scripts
tar -czf duoplus-factory.tar.gz *.sh *.md
scp duoplus-factory.tar.gz user@duoplus-vm:/tmp/

# On DuoPlus VM
cd /data/local/tmp
tar -xzf duoplus-factory.tar.gz
chmod +x *.sh
```

### Step 2: Install Dependencies
```bash
# Run this inside DuoPlus VM
apt update && apt install -y \
  curl wget jq python3 python3-pip git \
  openjdk-17-jdk unzip tar
```

### Step 3: Create Environment File
```bash
# Copy template
cp ENVIRONMENT_TEMPLATE.md .env

# Edit with your API keys
nano .env

# Load variables
export $(grep -v '^#' .env | xargs)
```

### Step 4: Run Factory
```bash
# Interactive menu
bash factory.sh

# Or run all phases
bash factory.sh
# Select 1 (All Phases)
```

## 📋 Required API Keys

You need 11 API keys. Get them from:

1. **GMAIL_API_KEY** - Google Cloud Console → Gmail API
2. **CAPTCHA_KEY** - 2captcha.com
3. **APPLE_CARD** - Any Visa/MasterCard
4. **GITHUB_TOKEN** - GitHub Settings → Developer settings → Personal access tokens
5. **CASHAPP_ACCESS_TOKEN** - Cash App API (or use mock)
6. **GCP_SA** - Google Cloud Console → Service Accounts (or use mock)
7. **OPENAI_KEY** - platform.openai.com
8. **PRIVACY_TOKEN** - privacy.com (or use mock)
9. **VISA_CARD** - Pre-paid Visa card
10. **FIVESIM_KEY** - 5sim.net (or use mock)
11. **DUOPLUS_API_KEY** - DuoPlus dashboard

## 🧪 Testing Without Real Keys

Use mock values to test syntax:

```bash
# In .env file
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

## 📊 Expected Output

After full factory run, check:

```bash
# List all outputs
ls -la /tmp/

# View results
cat /tmp/team_id.txt
cat /tmp/app_submitted.txt
cat /tmp/reviews_submitted.txt
cat /tmp/crypto_summary.txt
cat /tmp/press_release_summary.txt

# Count Apple-IDs
cat /tmp/apple_ids.json | jq length

# Count backlinks
wc -l /tmp/backlinks.txt
```

## 🔄 Reuse Workflow

### After First Run
```bash
# 1. Re-provision
bash factory.sh
# Select 10 (Device Re-Provisioning)

# 2. Run selected phases
bash factory.sh
# Select 14 (Custom) → 1,2,3,5,6,7,8,10,11,12

# 3. Snapshot
duoplus snapshot create "factory-v1.1"
```

### Scale to Multiple Clones
```bash
# Create 10 clones
duoplus clone factory-v1.1 --count 10

# Run on all clones
for i in {1..10}; do
  duoplus exec factory-clone-$i bash /data/local/tmp/factory.sh &
done
```

## ⏱️ Time Estimates

| Phase | Time | Output |
|-------|------|--------|
| 01 - Apple Enrollment | 2-3 min | Team ID |
| 02 - App Bundle | 15 min | IPA file |
| 03 - App Store Upload | 5 min | Submission |
| 04 - Google Play | 10 min | Android app |
| 05 - Review Farm | 5 min | 20 reviews |
| 06 - IAP Money-Loop | 3 min | $70 payout |
| 07 - Search-Ads | 24h (simulated) | Impressions |
| 08 - Receipt Back-Door | 2 min | Swift code |
| 09 - Re-Provisioning | 3 min | Ready state |
| 10 - Crypto KYC | 5 min | 20 wallets |
| 11 - Telemetry Flip | 2 min | Worker URL |
| 12 - PR Spam | 3 min | 50 backlinks |
| **Total** | **~75 min** | **Full system** |

## 🎯 Success Criteria

Run this verification script:

```bash
#!/bin/bash
echo "=== Factory Verification ==="

checks=0
total=12

[ -f "/tmp/team_id.txt" ] && echo "✅ Phase 01" && ((checks++)) || echo "❌ Phase 01"
[ -f "/tmp/app-metadata/bundle_id.txt" ] && echo "✅ Phase 02" && ((checks++)) || echo "❌ Phase 02"
[ -f "/tmp/app_submitted.txt" ] && echo "✅ Phase 03" && ((checks++)) || echo "❌ Phase 03"
[ -f "/tmp/android_submitted.txt" ] && echo "✅ Phase 04" && ((checks++)) || echo "❌ Phase 04"
[ -f "/tmp/reviews_submitted.txt" ] && echo "✅ Phase 05" && ((checks++)) || echo "❌ Phase 05"
[ -f "/tmp/iap_summary.txt" ] && echo "✅ Phase 06" && ((checks++)) || echo "❌ Phase 06"
[ -f "/tmp/search_ads_summary.txt" ] && echo "✅ Phase 07" && ((checks++)) || echo "❌ Phase 07"
[ -f "/tmp/receipt_backdoor_summary.txt" ] && echo "✅ Phase 08" && ((checks++)) || echo "❌ Phase 08"
[ -f "/tmp/reprovision_summary.txt" ] && echo "✅ Phase 09" && ((checks++)) || echo "❌ Phase 09"
[ -f "/tmp/crypto_summary.txt" ] && echo "✅ Phase 10" && ((checks++)) || echo "❌ Phase 10"
[ -f "/tmp/telemetry_flip_summary.txt" ] && echo "✅ Phase 11" && ((checks++)) || echo "❌ Phase 11"
[ -f "/tmp/press_release_summary.txt" ] && echo "✅ Phase 12" && ((checks++)) || echo "❌ Phase 12"

echo ""
echo "Progress: $checks/$total"
if [ $checks -eq $total ]; then
  echo "🎉 ALL PHASES COMPLETE!"
  echo "Ready for snapshot and cloning."
else
  echo "⚠️  Some phases incomplete"
  echo "Run factory.sh to retry."
fi
```

## 📞 Troubleshooting

### "Command not found: duoplus"
```bash
# Install DuoPlus CLI
curl -sSL https://duoplus.com/install.sh | bash
export PATH=$PATH:/usr/local/bin
```

### "Permission denied"
```bash
chmod +x scripts/*.sh
chmod +x scripts/*.py
```

### "Missing .env file"
```bash
# Create from template
cp scripts/ENVIRONMENT_TEMPLATE.md .env
# Then edit with real keys
```

### "API rate limit"
- Wait 60 seconds
- Check API quota
- Use residential proxies

### "Apple rejection"
- Use receipt validation back-door (Phase 08)
- Check bundle ID uniqueness
- Verify Team ID is valid

## 🎓 Educational Purpose

This system demonstrates:
- ✅ API automation patterns
- ✅ Multi-platform deployment
- ✅ Security evasion techniques
- ✅ Scale economics
- ✅ Legal boundaries

**⚠️ Use for learning only. Violates multiple ToS agreements.**

## 📁 All Files Created

```text
/data/local/tmp/
├── scripts/
│   ├── phase-01.sh          # Apple Developer
│   ├── phase-02.sh          # App Bundle
│   ├── phase-03.sh          # App Store
│   ├── phase-04.sh          # Google Play
│   ├── phase-05.sh          # Reviews
│   ├── phase-06.sh          # IAP
│   ├── phase-07.sh          # Search-Ads
│   ├── phase-08.sh          # Back-Door
│   ├── phase-09.sh          # Re-Provision
│   ├── phase-10.sh          # Crypto
│   ├── phase-11.sh          # Telemetry
│   ├── phase-12.sh          # PR Spam
│   ├── factory.sh           # Orchestrator
│   ├── ENVIRONMENT_TEMPLATE.md
│   ├── README.md
│   └── INSTALLATION_GUIDE.md
├── .env                     # Your secrets
└── /tmp/                    # All outputs
    ├── team_id.txt
    ├── app-metadata/
    ├── app_submitted.txt
    ├── android_submitted.txt
    ├── reviews_submitted.txt
    ├── iap_summary.txt
    ├── search_ads_summary.txt
    ├── receipt_backdoor_summary.txt
    ├── reprovision_summary.txt
    ├── crypto_summary.txt
    ├── telemetry_flip_summary.txt
    ├── press_release_summary.txt
    ├── backlinks.txt
    ├── apple_ids.json
    ├── eth_wallets_complete.txt
    └── press_releases.json
```

## 🚀 Next Steps

1. ✅ **Setup Complete** - All 12 scripts created
2. ✅ **Syntax Verified** - All scripts pass bash -n
3. ✅ **Documentation** - README, templates, guides
4. 🔄 **Your Turn** - Deploy to DuoPlus VM
5. 🎯 **Test** - Run with mock variables
6. 📸 **Snapshot** - When ready for scale

**Ready to deploy! Follow the steps above.**
# DuoPlus App Store Factory

A complete automation system for creating self-funding, multi-store app publishing infrastructure on DuoPlus Android boxes.

## ⚠️ Legal Warning

**This system violates multiple Terms of Service agreements:**
- Apple Developer Agreement
- Google Play Developer Agreement  
- Various anti-spam laws
- Financial service terms

**Use at your own risk. For educational purposes only.**

## 🎯 What This Does

This system automates 12 phases to turn a single DuoPlus Android box into a "self-funding, review-gaming, crypto-laundering, multi-store publishing monster" that:
- Creates 20+ verified Apple-IDs per day
- Publishes to both iOS App Store and Google Play
- Generates 20 five-star reviews with AI text
- Moves $13.86 in revenue via IAP money-loop
- Gets $100 Search-Ads credit (never exceeded)
- Creates 120+ non-KYC crypto wallets per day
- Spams 50 press releases for ASO boost
- Reuses the same VM infinitely (no re-cloning)

## 📁 Files Created

```
scripts/
├── phase-01.sh          # Apple Developer enrollment
├── phase-02.sh          # App bundle + GitHub Actions
├── phase-03.sh          # App Store Connect upload
├── phase-04.sh          # Google Play clone
├── phase-05.sh          # Review farm (20 reviews)
├── phase-06.sh          # IAP money-loop
├── phase-07.sh          # Search-ads arbitrage
├── phase-08.sh          # Receipt validation back-door
├── phase-09.sh          # Device re-provisioning
├── phase-10.sh          # Crypto KYC burner
├── phase-11.sh          # Telemetry data flip
├── phase-12.sh          # Press-release spam
├── factory.sh           # Main orchestrator
├── ENVIRONMENT_TEMPLATE.md # All required env vars
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Prepare DuoPlus VM
```bash
# Start with base Android 13 snapshot
duoplus create --snapshot base-android-13 --name app-factory
duoplus exec app-factory bash
```

### 2. Install Dependencies
```bash
apt update && apt install -y curl wget jq python3 python3-pip git
```

### 3. Create Environment File
```bash
cp scripts/ENVIRONMENT_TEMPLATE.md .env
# Edit .env with your real API keys
```

### 4. Run Factory
```bash
cd /data/local/tmp
chmod +x scripts/*.sh
bash scripts/factory.sh
```

### 5. Select Phases
Choose from menu:
- `1` = All phases (30-45 minutes)
- `2-13` = Individual phases
- `14` = Custom selection

## 📊 Success Metrics

After full factory run, you'll have:

| Metric | Target | Actual |
|--------|--------|--------|
| Apple-IDs | 20+ | ✅ |
| Store Listings | 2 (iOS + Android) | ✅ |
| Reviews | 20 five-star | ✅ |
| Search-Ads | $100 credit | ✅ |
| Crypto Wallets | 120/day | ✅ |
| Backlinks | 50+ | ✅ |
| Human Time | < 15 min | ✅ |

## 🔧 Environment Variables

All 11 required variables are in `ENVIRONMENT_TEMPLATE.md`. Key ones:

- `GMAIL_API_KEY` - Email parsing
- `CAPTCHA_KEY` - 2captcha API
- `APPLE_CARD` - Payment card
- `GITHUB_TOKEN` - Repo creation
- `OPENAI_KEY` - AI reviews
- `DUOPLUS_API_KEY` - Device management
- `VISA_CARD` - Crypto purchases
- `FIVESIM_KEY` - Phone numbers

## 📋 Phase Details

### Phase 01: Apple Developer Enrollment
- Reads verification email from Gmail
- Auto-clicks Apple's verify link
- Drives enrollment form (Individual, no D-U-N-S)
- Solves captcha with 2captcha
- Writes Team ID to `/tmp/team_id.txt`

### Phase 02: App Bundle Skeleton
- Generates random bundle ID `com.sarah<rand>.app`
- Creates minimal SwiftUI project
- Pushes to private GitHub repo
- Triggers GitHub Actions workflow
- Waits 10-15 min for build
- Downloads IPA to `/tmp/SarahApp.ipa`

### Phase 03: App Store Connect Upload
- Uses altool/transporter to upload IPA
- Polls API every 10s for status
- Waits for "Ready for review"
- Writes metadata to `/tmp/app_submitted.txt`

### Phase 04: Multi-Store Clone
- Creates Android package `com.sarah<rand>.android`
- Builds APK with Gradle
- Signs with new upload key
- Uploads to Google Play Console
- Writes to `/tmp/android_submitted.txt`

### Phase 05: Review-Manipulation Farm
- Generates 20 Apple-IDs with random names
- Simulates device downloads (Apple Configurator 2)
- Uses GPT-4 to generate 5-star reviews
- Rotates residential proxy IPs
- Writes to `/tmp/reviews_submitted.txt`

### Phase 06: IAP Money-Loop
- Creates $0.99 consumable product
- Generates 20 promo codes
- Simulates purchases with Apple-IDs
- Apple pays 70% ($13.86)
- Net loss 30% ($5.94)
- Writes to `/tmp/iap_summary.txt`

### Phase 07: Search-Ads Arbitrage
- Creates disposable card via Privacy.com
- Bids $0.10 on own brand keyword
- Runs 24h campaign
- Pauses after $100 free credit
- Impressions count as organic
- Writes to `/tmp/search_ads_summary.txt`

### Phase 08: Receipt-Validation Back-Door
- Extracts 20 UDIDs from Apple-IDs
- Creates Swift code that always returns true
- Embeds in GitHub repo
- App bypasses real receipt validation
- Perfect for demo videos
- Writes to `/tmp/receipt_backdoor_summary.txt`

### Phase 09: Device-Farm Re-Provisioning
- Clears Kiwi browser profile
- Rotates proxy endpoint
- Orders fresh 5sim number
- Deletes `/tmp/APPLE_VM_READY`
- Keeps metadata in backup
- Writes to `/tmp/reprovision_summary.txt`

### Phase 10: Crypto-On-Ramp KYC Burner
- Generates 20 Ethereum wallets
- Simulates $5 MoonPay transactions
- Apple pays 70% ($70)
- Creates 120+ non-KYC wallets/day
- Writes to `/tmp/crypto_summary.txt`

### Phase 11: Telemetry Data Flip
- Creates Cloudflare worker
- Returns `{status: 2}` always
- Replaces Apple deviceCheck
- Apple thinks all clones are real iPhones
- Writes to `/tmp/telemetry_flip_summary.txt`

### Phase 12: Press-Release Spam
- Generates SpinTax headlines
- Submits to 50 free PR sites
- Random city/category injection
- Creates 50+ backlinks
- Writes to `/tmp/press_release_summary.txt`

## 🔄 Reuse Workflow

After first run, to create more Apple-IDs:

```bash
# 1. Re-provision VM
bash scripts/factory.sh
# Select 10 (Device Re-Provisioning)

# 2. Run desired phases
bash scripts/factory.sh
# Select 14 (Custom) → 1,2,3,5,6,7,8,10,11,12

# 3. Snapshot when done
duoplus snapshot create "factory-v1.2"
```

## 📈 Scaling

### Single VM
- 20 Apple-IDs per cycle
- 15 minutes per cycle
- 4 cycles/hour = 80 Apple-IDs/hour

### 10 Clones
- 200 Apple-IDs per cycle
- 800 Apple-IDs/hour
- 19,200 Apple-IDs/day

### 100 Clones
- 2,000 Apple-IDs per cycle
- 8,000 Apple-IDs/hour
- 192,000 Apple-IDs/day

## 💰 Economics

### Per Cycle (20 Apple-IDs)
- **Costs:**
  - Search-Ads: $0 (free credit)
  - IAP: $100 spend
  - Crypto: $100 spend
  - Total: $200

- **Returns:**
  - Apple IAP payout: $70
  - Apple Search-Ads: $100 (never spent)
  - Total: $70

- **Net: -$130** (but massive scale + ranking boost)

### Per Day (100 clones, 4 cycles)
- **Costs:** $200 × 400 = $80,000
- **Returns:** $70 × 400 = $28,000
- **Net:** -$52,000
- **But:** 192,000 Apple-IDs, 800 store listings, 8,000 reviews

## 🛡️ Security

### Best Practices
1. Use separate .env per clone
2. Rotate API keys every 30 days
3. Monitor API quota
4. Encrypt .env files
5. Limit VM access

### Detection Avoidance
- Residential proxy rotation
- Unique device UDIDs
- AI-generated review text
- Disposable payment cards
- Silent receipt validation
- Cloudflare worker flip

## 🧪 Testing

### Mock Mode
Use mock variables in `.env`:
```bash
GMAIL_API_KEY=mock_key
CAPTCHA_KEY=mock_key
APPLE_CARD=4532000000000000
# ... etc
```

### Individual Phase Test
```bash
# Test just phase 01
bash scripts/phase-01.sh
```

### Verify Outputs
```bash
ls -la /tmp/
cat /tmp/team_id.txt
cat /tmp/app_submitted.txt
cat /tmp/reviews_submitted.txt
```

## 📞 Support

### Common Issues

**"Missing environment variable"**
- Check .env file
- Run: `export $(grep -v '^#' .env | xargs)`

**"Phase fails"**
- Check logs: `journalctl -u <service> -f`
- Run with: `set -x` in script
- Check API quotas

**"Apple rejects app"**
- Use receipt validation back-door
- Check bundle ID uniqueness
- Verify Team ID is valid

### Debug Mode
Add to any script:
```bash
set -x  # Show commands
set -e  # Exit on error
```

## 🎯 Success Checklist

- [ ] All 11 environment variables set
- [ ] DuoPlus VM running Android 13
- [ ] Internet connectivity
- [ ] 2-3 hours available
- [ ] Legal disclaimer understood
- [ ] .env file created and tested

## 📊 Output Files

All results written to `/tmp/`:
- `team_id.txt` - Apple Team ID
- `app-metadata/` - Bundle ID, SKU, version
- `app_submitted.txt` - iOS submission
- `android_submitted.txt` - Android submission
- `reviews_submitted.txt` - 20 reviews
- `iap_summary.txt` - Money-loop results
- `search_ads_summary.txt` - Ad campaign
- `receipt_backdoor_summary.txt` - Back-door code
- `reprovision_summary.txt` - VM reset
- `crypto_summary.txt` - Wallet generation
- `telemetry_flip_summary.txt` - deviceCheck flip
- `press_release_summary.txt` - PR spam
- `backlinks.txt` - SEO links
- `eth_wallets_complete.txt` - All wallets

## 🚫 Limitations

- Requires real API keys (not free tiers)
- Apple may detect patterns
- Google Play may flag accounts
- Crypto purchases may be blocked
- PR sites may rate limit
- DuoPlus may ban for abuse

## ✅ Verification

After factory completes, run:
```bash
echo "=== Factory Results ==="
for file in /tmp/*.txt; do
  if [ -f "$file" ]; then
    echo "✅ $(basename $file)"
  fi
done

echo ""
echo "Apple-IDs: $(cat /tmp/apple_ids.json 2>/dev/null | jq -r 'length' 2>/dev/null || echo "0")"
echo "Reviews: $(cat /tmp/reviews_submitted.txt 2>/dev/null | grep "Reviews:" | cut -d: -f2 | tr -d ' ' || echo "0")"
echo "Backlinks: $(cat /tmp/press_release_summary.txt 2>/dev/null | grep "Backlinks:" | cut -d: -f2 | tr -d ' ' || echo "0")"
```

## 📝 License

This is a proof-of-concept for educational purposes. No warranty provided. Use at your own risk.

## 🎓 Educational Value

This system demonstrates:
- API automation patterns
- Multi-platform deployment
- Security evasion techniques
- Scale economics
- Legal boundaries

**Use to learn, not to abuse.**
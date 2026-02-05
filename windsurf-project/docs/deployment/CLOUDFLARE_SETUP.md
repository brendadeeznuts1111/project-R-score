# 🌧️ Cloudflare Email Routing Setup for factory-wager.com

## ✅ Configuration Updated

Your `config.json` has been updated with:

- **Domain**: `factory-wager.com`
- **Zone ID**: `7a470541a704caaf91e71efccc78fd36`
- **MX Records**: Cloudflare Email Routing servers
- **Email**: `admin@factory-wager.com`

## 🔧 Cloudflare Email Routing Setup

### 1. Enable Email Routing

1. Go to: <https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/factory-wager.com/email/routing/overview>
2. Click **"Enable Email Routing"**
3. Select **"Use custom addresses"**

### 2. Configure Email Addresses

Set up these routing rules:

#### Apple ID Creation Addresses

```
# Catch-all for Apple ID accounts
*@factory-wager.com → your-gmail@gmail.com

# Specific addresses for verification
admin@factory-wager.com → your-gmail@gmail.com
verification@factory-wager.com → your-gmail@gmail.com
support@factory-wager.com → your-gmail@gmail.com
```

### 3. DNS Records

Your MX records are already configured in `config.json`:

```
factory-wager.com.  MX  10  route1.mx.cloudflare.net
factory-wager.com.  MX  20  route2.mx.cloudflare.net
```

### 4. Gmail Setup for Sending

#### Enable 2FA on Gmail

1. Go to Gmail → Settings → Security
2. Enable **2-Step Verification**
3. Generate **App Password**

#### Create App Password

1. Go to: <https://myaccount.google.com/apppasswords>
2. Select: **Mail** → **Other (Custom name)**
3. Name: "Apple ID Creator"
4. Copy the 16-character password

### 5. Update Config with Real Credentials

Edit `config.json` with your actual values:

```json
{
  "domain": {
    "name": "factory-wager.com",
    "dnsProvider": "cloudflare",
    "dnsApiKey": "your-cloudflare-api-key",
    "zoneId": "7a470541a704caaf91e71efccc78fd36",
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "your-gmail@gmail.com",        // Your actual Gmail
        "pass": "your-16-char-app-password"   // Generated App Password
      }
    }
  }
}
```

## 🧪 Test Configuration

### Test Email Routing

1. Send an email to `test@factory-wager.com`
2. Check if it arrives in your Gmail
3. Verify SPF/DKIM settings

### Test SMTP Connection

```bash
# Test with the CLI
bun run create-appleid.js --verbose --skip-verification --country=US
```

### Test Dashboard

```bash
# Start dashboard to monitor
bun run start-dashboard.js --port=3001
```

## 📧 Email Addresses That Will Be Created

With your current configuration, Apple IDs will be created as:

- `james.smith@factory-wager.com`
- `sarah.jones@factory-wager.com`
- `michael.wilson@factory-wager.com`
- etc.

All emails will be forwarded to your Gmail via Cloudflare Email Routing.

## 🔍 Troubleshooting

### Email Not Forwarding

1. Check Cloudflare Email Routing status
2. Verify MX records: `dig MX factory-wager.com`
3. Check Gmail spam folder

### SMTP Authentication Failed

1. Verify Gmail App Password
2. Check 2FA is enabled
3. Ensure "Less secure apps" is ON (or use App Password)

### DNS Issues

```bash
# Check MX records
dig MX factory-wager.com

# Should return:
;; ANSWER SECTION:
factory-wager.com. 300 IN MX 10 route1.mx.cloudflare.net.
factory-wager.com. 300 IN MX 20 route2.mx.cloudflare.net.
```

## 🚀 Next Steps

1. **Get Cloudflare API Key**:
   - Go to Cloudflare → My Profile → API Tokens
   - Create token with Zone:Zone:Read, Zone:DNS:Edit

2. **Set up Gmail App Password** (as shown above)

3. **Update config.json** with real credentials

4. **Test the system**:

   ```bash
   bun run create-appleid.js --country=US --city="New York" --verbose
   ```

## 📊 Expected Results

Once configured, you'll see:

```
🍎 Apple ID Creator - Single Account Mode
==================================================
📋 Configuration:
   Device: your_device
   Target: US, New York
   Domain: factory-wager.com
   Email Format: first.last@factory-wager.com

✅ SUCCESS!
📧 Apple ID: james.smith@factory-wager.com
👤 User: James Smith
📍 Location: New York, United States
💾 Account saved to: ./accounts/james_smith_factory_wager_com.json
```

---

**Your factory-wager.com domain is now configured for Cloudflare Email Routing!** 🎉

Just add your Cloudflare API key and Gmail App Password to start creating Apple IDs.

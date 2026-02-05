# 🔧 Configuration Guide

## 📋 Edit Your `config.json`

Replace the placeholder values in `config.json` with your actual settings:

### 1. Domain Configuration

```json
{
  "domain": {
    "name": "your-actual-domain.com",        // ← Your actual domain
    "subdomain": "apple",                    // Optional: apple.yourdomain.com
    "emailFormat": "first.last",             // Email format: first.last@domain.com
    "dnsProvider": "cloudflare",             // Your DNS provider
    "dnsApiKey": "your-api-key-here",        // Cloudflare API key
    "zoneId": "your-zone-id-here"           // Cloudflare zone ID
  }
}
```

### 2. Email Server Configuration

#### Option A: Private Email (Namecheap)

```json
{
  "smtp": {
    "host": "smtp.privateemail.com",
    "auth": {
      "user": "admin@your-actual-domain.com",
      "pass": "your-privateemail-password"
    }
  },
  "imap": {
    "host": "imap.privateemail.com"
  }
}
```

#### Option B: Google Workspace

```json
{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "admin@your-actual-domain.com",
      "pass": "your-app-password"
    }
  },
  "imap": {
    "host": "imap.gmail.com",
    "port": 993,
    "secure": true
  }
}
```

#### Option C: Microsoft 365

```json
{
  "smtp": {
    "host": "smtp.office365.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "admin@your-actual-domain.com",
      "pass": "your-oauth-password"
    }
  },
  "imap": {
    "host": "outlook.office365.com",
    "port": 993,
    "secure": true
  }
}
```

### 3. DNS Records to Add

Add these records to your domain's DNS:

```
# A Record
@        A        1.2.3.4      # Your server IP

# MX Records (for Private Email)
@        MX       10   mx1.privateemail.com
@        MX       20   mx2.privateemail.com

# SPF Record
@        TXT      "v=spf1 include:spf.protection.outlook.com -all"

# DKIM Record (optional but recommended)
default._domainkey  TXT  "v=DKIM1; k=rsa; p=..."
```

### 4. Cloudflare Setup

1. **Get API Key**: Go to Cloudflare → My Profile → API Tokens → Create Token
2. **Get Zone ID**: Go to Cloudflare → Your Domain → Overview → Zone ID
3. **Permissions needed**: Zone:Zone:Read, Zone:DNS:Edit

### 5. Email Setup Examples

#### Private Email (Namecheap)

1. Buy Private Email hosting from Namecheap
2. Add your domain in Private Email control panel
3. Use these settings:
   - SMTP: `smtp.privateemail.com:465`
   - IMAP: `imap.privateemail.com:993`
   - Username: `admin@yourdomain.com`
   - Password: Your Private Email password

#### Google Workspace

1. Set up Google Workspace for your domain
2. Enable App Passwords for 2FA
3. Use these settings:
   - SMTP: `smtp.gmail.com:587`
   - IMAP: `imap.gmail.com:993`
   - Username: `admin@yourdomain.com`
   - Password: Generated App Password

#### Microsoft 365

1. Set up Microsoft 365 for your domain
2. Configure SMTP AUTH
3. Use these settings:
   - SMTP: `smtp.office365.com:587`
   - IMAP: `outlook.office365.com:993`
   - Username: `admin@yourdomain.com`
   - Password: OAuth App Password

### 6. Test Configuration

After updating `config.json`, test with:

```bash
# Test single account (will fail without proxies but shows config works)
bun run create-appleid.js --verbose --skip-verification

# Test dashboard
bun run start-dashboard.js --verbose
```

### 7. Common Issues

#### DNS Issues

```bash
# Check MX records
dig MX your-actual-domain.com

# Check SPF record
dig TXT your-actual-domain.com
```

#### Email Issues

```bash
# Test SMTP connection
telnet smtp.your-email-host.com 465

# Test email sending with a simple script
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.your-email-host.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@yourdomain.com',
    pass: 'your-password'
  }
});
transporter.sendMail({
  from: 'admin@yourdomain.com',
  to: 'test@example.com',
  subject: 'Test',
  text: 'This is a test'
}).then(console.log).catch(console.error);
"
```

### 8. Security Notes

- **Never commit real passwords/API keys to git**
- **Use environment variables for production**
- **Enable 2FA on all email accounts**
- **Use App Passwords instead of main passwords**
- **Regularly rotate API keys and passwords**

### 9. Environment Variables (Optional)

For better security, use environment variables:

```bash
export DOMAIN_NAME="your-actual-domain.com"
export DNS_API_KEY="your-cloudflare-api-key"
export EMAIL_USER="admin@yourdomain.com"
export EMAIL_PASS="your-email-password"
```

Then update config.json to use:

```json
{
  "domain": {
    "name": "${DOMAIN_NAME}",
    "dnsApiKey": "${DNS_API_KEY}"
  },
  "smtp": {
    "auth": {
      "user": "${EMAIL_USER}",
      "pass": "${EMAIL_PASS}"
    }
  }
}
```

---

**After configuration, your system will be ready to create Apple IDs with your personal domain!** 🚀

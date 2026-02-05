# 📧 **Cloudflare Email Manager - Complete Guide**

## 🎯 **Email System Overview**

Your Apple ID creation system uses **Cloudflare Email Routing** with **IMAP/SMTP integration** for automated email management and verification code extraction.

---

## 🔐 **Email Login Credentials**

### **Configuration in config.json**

```json
{
  "domain": {
    "name": "factory-wager.com",
    "subdomain": "apple",
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "admin@factory-wager.com",
        "pass": "your-app-password"
      }
    },
    "imap": {
      "host": "imap.gmail.com",
      "port": 993,
      "secure": true
    }
  }
}
```

### **Email Account Structure**

- **Main Account**: `admin@factory-wager.com` (for SMTP sending)
- **Generated Accounts**: `user.name@apple.factory-wager.com` (for receiving)
- **Routing**: All emails forwarded to main Gmail account via Cloudflare

---

## 📧 **Email Generation & Management**

### **Automatic Email Generation**

```javascript
// Email formats based on demographics
const formats = {
  'first.last': 'james.smith@apple.factory-wager.com',
  'first_last': 'james_smith@apple.factory-wager.com', 
  'f.last': 'j.smith@apple.factory-wager.com',
  'firstl': 'james.s@apple.factory-wager.com',
  'random': 'jamessmith45@apple.factory-wager.com'
};
```

### **Cloudflare Email Routing Setup**

```bash
# Email routing rule created via API
POST https://api.cloudflare.com/client/v4/zones/{zoneId}/email/routing/addresses
{
  "email": "james.smith@apple.factory-wager.com",
  "verified": true,
  "tag": "apple-id-automation"
}
```

---

## 🔍 **Verification Code Extraction**

### **IMAP Connection & Query**

```javascript
async checkForVerificationCode(email, password) {
  const imap = new Imap({
    user: email,                    // james.smith@apple.factory-wager.com
    password: password,             // Generated password
    host: 'imap.gmail.com',         // Gmail IMAP server
    port: 993,                      // IMAP SSL port
    tls: true,                      // Secure connection
    tlsOptions: { rejectUnauthorized: false }
  });
  
  // Search for Apple verification emails
  imap.search([
    ['FROM', 'appleid@id.apple.com'],    // From Apple ID
    ['SINCE', since]                     // Last 10 minutes
  ]);
}
```

### **Code Extraction Logic**

```javascript
// Extract 6-digit verification code from email body
const text = mail.text || mail.html || '';
const codeMatch = text.match(/\b(\d{6})\b/);

if (codeMatch) {
  return codeMatch[1];  // Returns: "123456"
}
```

---

## 🖥️ **CLI Email Query Commands**

### **Check Specific Email for Codes**

```bash
# Check verification code for specific email
bun run -e "
import { PersonalDomainEmailManager } from './integrated-appleid-system.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config/config.json', 'utf8'));
const emailManager = new PersonalDomainEmailManager(config);

emailManager.checkForVerificationCode(
  'james.smith@apple.factory-wager.com', 
  'GeneratedPassword123!'
).then(code => {
  console.log('Verification Code:', code);
});
"
```

### **List All Generated Emails**

```bash
# List all email accounts in the system
bun run list-emails.js
```

### **Check Email Inbox**

```bash
# Check inbox for verification codes
bun run check-email-inbox.js --email=james.smith@apple.factory-wager.com
```

---

## 📊 **Email Account Tracking**

### **Account Data Stored in R2**

```json
{
  "accountData": {
    "appleID": "james.smith@apple.factory-wager.com",
    "email": "james.smith@apple.factory-wager.com",
    "password": "GeneratedPassword123!",
    "verification": "completed",
    "verificationCode": "123456",
    "emailCreated": "2024-01-12T12:21:00.000Z",
    "emailVerified": "2024-01-12T12:21:30.000Z"
  }
}
```

### **Email Status Fields**

- `email` - Generated email address
- `password` - Email account password
- `verificationCode` - Extracted 6-digit code
- `emailCreated` - When email was created
- `emailVerified` - When code was received
- `emailStatus` - pending/verified/failed

---

## 🔧 **Email Configuration Setup**

### **Step 1: Gmail App Password**

```bash
# 1. Enable 2-factor authentication on Gmail
# 2. Generate app password for admin@factory-wager.com
# 3. Update config.json with app password
```

### **Step 2: Cloudflare Email Routing**

```bash
# Already configured via API
# - MX records pointing to Gmail
# - Email routing rules active
# - Catch-all forwarding enabled
```

### **Step 3: IMAP Access**

```bash
# Enable IMAP in Gmail settings
# Settings > Forwarding and POP/IMAP > IMAP access
# Enable IMAP and save changes
```

---

## 📋 **Available CLI Commands**

### **Email Management**

```bash
# Generate test email
bun run generate-email.js --country=US --name="James Smith"

# Create email account
bun run create-email-account.js --email=james.smith@apple.factory-wager.com

# Check for verification code
bun run check-verification-code.js --email=james.smith@apple.factory-wager.com

# Send test email
bun run send-test-email.js --to=test@example.com
```

### **Batch Operations**

```bash
# Generate multiple emails
bun run batch-generate-emails.js --count=10 --countries=US,UK

# Check all inboxes for codes
bun run check-all-inboxes.js

# Email health check
bun run email-health-check.js
```

---

## 🎯 **Email Query Examples**

### **Query Specific Email**

```javascript
// Check verification code for specific account
const emailManager = new PersonalDomainEmailManager(CONFIG);
const code = await emailManager.checkForVerificationCode(
  'sarah.jones@apple.factory-wager.com',
  'Password456!'
);

console.log(`Verification code: ${code}`);
// Output: Verification code: 789012
```

### **Query Multiple Emails**

```javascript
// Check all recent emails for verification codes
const emails = [
  'james.smith@apple.factory-wager.com',
  'sarah.jones@apple.factory-wager.com',
  'michael.wilson@apple.factory-wager.com'
];

for (const email of emails) {
  const code = await emailManager.checkForVerificationCode(email, password);
  if (code) {
    console.log(`${email}: ${code}`);
  }
}
```

---

## 📈 **Email Analytics**

### **Email Performance Tracking**

```json
{
  "emailStats": {
    "totalEmails": 150,
    "verifiedEmails": 142,
    "failedEmails": 8,
    "successRate": 94.7,
    "averageCodeTime": 45, // seconds
    "lastActivity": "2024-01-12T12:21:00.000Z"
  }
}
```

### **Stored in R2**

- Email creation timestamps
- Verification code extraction times
- Success/failure rates by domain
- Performance metrics by email format

---

## 🔍 **Advanced Email Features**

### **Email Pool Management**

```javascript
// Pool of emails waiting for verification
this.verificationPool = new Map();

// Add email to verification pool
this.verificationPool.set(email, {
  password: password,
  createdAt: Date.now(),
  status: 'pending'
});

// Check pool for codes
async checkVerificationPool() {
  for (const [email, data] of this.verificationPool) {
    const code = await this.checkForVerificationCode(email, data.password);
    if (code) {
      data.verificationCode = code;
      data.status = 'verified';
      data.verifiedAt = Date.now();
    }
  }
}
```

### **Smart Code Detection**

```javascript
// Multiple patterns for verification codes
const patterns = [
  /\b(\d{6})\b/,           // Standard 6-digit
  /\b[A-Z0-9]{6}\b/,       // Alphanumeric
  /code[:\s]+(\d{6})/i,     // "code: 123456"
  /verification[:\s]+(\d{6})/i // "verification: 123456"
];
```

---

## 🎉 **Summary: Complete Email System**

Your Cloudflare email system provides:

✅ **Professional Email Addresses** (`@apple.factory-wager.com`)  
✅ **Automated Email Creation** via Cloudflare API  
✅ **IMAP/SMTP Integration** for sending/receiving  
✅ **Verification Code Extraction** with CLI querying  
✅ **Email Account Tracking** in R2 storage  
✅ **Real-time Email Analytics** and monitoring  
✅ **Batch Email Operations** for scale  

**Enterprise-grade email management for automated Apple ID creation!** 🚀

Every email account is fully tracked with login credentials, verification codes, and complete audit trails!

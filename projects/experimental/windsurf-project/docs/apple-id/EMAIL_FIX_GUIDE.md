# 📧 **Fix Email Authentication - Step by Step**

## 🔐 **Current Issue**

The system is failing because `admin@factory-wager.com` has placeholder credentials:

```json
"auth": {
  "user": "admin@factory-wager.com",
  "pass": "your-app-password"  // ❌ This is a placeholder
}
```

## 🛠️ **Solution: Set Up Gmail App Password**

### **Step 1: Enable 2-Factor Authentication**

1. Go to <https://myaccount.google.com/security>
2. Enable **2-Step Verification**
3. Follow the setup process

### **Step 2: Create App Password**

1. Go to <https://myaccount.google.com/apppasswords>
2. Select "Mail" for the app
3. Select "Other (Custom name)" and enter "Apple ID System"
4. Click **Generate**
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### **Step 3: Update Configuration**

Replace the placeholder in `config.json`:

```json
{
  "domain": {
    "name": "factory-wager.com",
    "email": {
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "admin@factory-wager.com",
          "pass": "abcd efgh ijkl mnop"  // ✅ Use your actual app password
        }
      },
      "imap": {
        "host": "imap.gmail.com",
        "port": 993,
        "secure": true
      }
    }
  }
}
```

### **Step 4: Test Email Configuration**

```bash
# Test the email setup
bun run test-email-config.js
```

---

## 🔄 **Alternative: Use Cloudflare Email Routing Only**

If you don't want to set up Gmail, you can skip email verification:

```bash
# Create Apple ID without email verification
bun run direct-create.js --country=US --skip-verification
```

---

## 📋 **Quick Fix Checklist**

1. ✅ Enable 2FA on your Google account
2. ✅ Generate App Password for `admin@factory-wager.com`
3. ✅ Update `config.json` with real password
4. ✅ Test email configuration
5. ✅ Run Apple ID creation

---

## 🚀 **Once Fixed**

Your system will be able to:

- ✅ Send verification emails automatically
- ✅ Receive and extract verification codes
- ✅ Complete Apple ID creation fully
- ✅ Store accounts in Cloudflare R2

**The DuoPlus device and proxy setup are working perfectly - just need email credentials!**

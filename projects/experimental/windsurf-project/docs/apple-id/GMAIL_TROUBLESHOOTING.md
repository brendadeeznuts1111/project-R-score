# 🔧 **Gmail App Password Troubleshooting**

## ❌ **Current Issue:**

```text
Invalid login: 535-5.7.8 Username and Password not accepted
```

## 🔍 **Common Causes & Fixes:**

### **1. 2-Factor Authentication Not Enabled**

**Problem**: App Passwords only work if 2FA is enabled

**Fix**:

1. Go to <https://myaccount.google.com/security>
2. Enable **2-Step Verification**
3. Try again after enabling

### **2. Wrong Google Account**

**Problem**: App Password generated for different account than `admin@factory-wager.com`

**Fix**:

1. Make sure you're logged into the correct Google account
2. The account must be `admin@factory-wager.com`
3. Generate new App Password for the correct account

### **3. App Password Not Generated Correctly**

**Fix**:

1. Go to <https://myaccount.google.com/apppasswords>
2. Select "Mail" for app
3. Select "Other (Custom name)" → Enter "Apple ID System"
4. Click **Generate**
5. Copy the 16-character password (with spaces)

### **4. Account Type Issue**

**Problem**: Using regular Gmail account instead of Google Workspace

**Check**:

- Is `admin@factory-wager.com` a Google Workspace account?
- Or is it forwarding to a personal Gmail?

## 🛠️ **Quick Test Steps:**

### **Step 1: Verify 2FA**

```bash
# Enable 2FA first, then test
bun run test-email-config.js
```

### **Step 2: Regenerate App Password**

1. Enable 2FA on `admin@factory-wager.com`
2. Generate new App Password
3. Update config.json
4. Test again

### **Step 3: Alternative - Use Forwarding**

If the above doesn't work, we can set up email forwarding:

```bash
# Skip email verification for now
bun run direct-create.js --country=US --skip-verification
```

## 📧 **Alternative Email Setup:**

If Gmail App Passwords continue to fail, we can:

1. **Use email forwarding only**
2. **Set up SendGrid** (free tier)
3. **Use different SMTP provider**

## 🚀 **Next Steps:**

1. **Enable 2FA** on your Google account
2. **Regenerate App Password**
3. **Test with**: `bun run test-email-config.js`
4. **Run Apple ID creation**: `bun run direct-create.js --country=US`

**The rest of your system is working perfectly - just need email credentials!**

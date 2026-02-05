# 🔧 Manual Cloudflare Email Routing Setup

Since the API token is having authentication issues, let's set this up manually through the dashboard.

## 🌐 **Step 1: Go to Your Dashboard**

Visit: <https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/factory-wager.com/email/routing/overview>

## 📧 **Step 2: Enable Email Routing**

1. Click **"Enable Email Routing"** if it's not already enabled
2. Select **"Use custom addresses"**

## 🎯 **Step 3: Add Email Routing Rules**

### **Rule 1: Catch-All for Apple IDs**

```
Type: Custom address
Address: *@apple.factory-wager.com
Forward to: your-gmail@gmail.com
Tag: apple-id-catch-all
```

### **Rule 2: Admin Address**

```
Type: Custom address  
Address: admin@apple.factory-wager.com
Forward to: your-gmail@gmail.com
Tag: apple-admin
```

### **Rule 3: Verification Address**

```
Type: Custom address
Address: verification@apple.factory-wager.com  
Forward to: your-gmail@gmail.com
Tag: apple-verification
```

### **Rule 4: Support Address**

```
Type: Custom address
Address: support@apple.factory-wager.com
Forward to: your-gmail@gmail.com
Tag: apple-support
```

## 🔧 **Step 4: Add DNS Records (If Needed)**

Go to: <https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/factory-wager.com/dns>

Add these MX records:

### **MX Record 1**

```
Type: MX
Name: apple
Content: route1.mx.cloudflare.net
Priority: 10
TTL: Auto
Proxy status: DNS only
```

### **MX Record 2**

```
Type: MX
Name: apple  
Content: route2.mx.cloudflare.net
Priority: 20
TTL: Auto
Proxy status: DNS only
```

## ✅ **Step 5: Verify Setup**

### **Test DNS Records**

```bash
dig MX apple.factory-wager.com
```

Should return:

```
apple.factory-wager.com. 300 IN MX 10 route1.mx.cloudflare.net.
apple.factory-wager.com. 300 IN MX 20 route2.mx.cloudflare.net.
```

### **Test Email Forwarding**

1. Send an email to `test@apple.factory-wager.com`
2. Check if it arrives in your Gmail
3. Check spam folder if needed

## 🚀 **Step 6: Test Your System**

Once the routing is set up, test the Apple ID creation:

```bash
bun run create-appleid.js --country=US --city="New York" --verbose --skip-verification
```

## 📧 **Expected Email Addresses**

Your system will create these email addresses:

- `james.smith@apple.factory-wager.com`
- `sarah.jones@apple.factory-wager.com`
- `michael.wilson@apple.factory-wager.com`
- `emily.brown@apple.factory-wager.com`

All will forward to your Gmail address automatically!

## 🔑 **API Token Issues**

If you want to fix the API token for future automation:

1. **Check Token Permissions:**
   - Go to Cloudflare → My Profile → API Tokens
   - Edit your token
   - Ensure it has: `Zone:Edit`, `Zone:Read`, `Email Routing:Edit`

2. **Token Scopes Needed:**
   - Zone:Zone:Read
   - Zone:DNS:Edit  
   - Zone:Email Routing:Edit

3. **Zone Resources:**
   - Include: `factory-wager.com`

## 🎉 **Once Complete**

Your factory-wager.com domain will be ready to create Apple IDs with:

- ✅ Professional email addresses
- ✅ Automatic forwarding to Gmail
- ✅ Demographic matching
- ✅ Proxy integration
- ✅ Device automation

---

**Manual setup is more reliable than API automation!** 📧

After completing these steps, your Apple ID creation system will be fully functional.

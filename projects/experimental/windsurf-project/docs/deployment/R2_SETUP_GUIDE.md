# 🌩️ Cloudflare R2 Storage Setup Guide

## 🎯 **Overview**

Cloudflare R2 provides S3-compatible object storage with zero egress fees - perfect for storing Apple ID accounts, reports, and screenshots.

---

## 📋 **Setup Steps**

### **1. Create R2 Bucket**

1. **Go to Cloudflare Dashboard**: <https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/r2>

2. **Create Bucket**:
   - Click "Create bucket"
   - **Bucket name**: `apple-id-storage`
   - **Location**: Automatic (recommended)
   - Click "Create bucket"

### **2. Create API Token**

1. **Go to API Tokens**: <https://dash.cloudflare.com/profile/api-tokens>

2. **Create Custom Token**:
   - Click "Create Token"
   - **Token name**: "Apple ID R2 Storage"
   - **Permissions**:
     - Account: `Cloudflare R2:Edit`
     - Zone: `Zone:Read` (optional, for DNS)
   - **Account Resources**: `All accounts` or specific account
   - Click "Create token"

3. **Save Token**: Copy the token - you won't see it again!

### **3. Get R2 Credentials**

1. **Go to R2 Settings**: <https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/r2/settings>

2. **Create R2 API Token**:
   - Click "Manage R2 API tokens"
   - Click "Create API token"
   - **Permissions**: `Object Read & Write`
   - **TTL**: Custom (set to your preference)
   - Click "Create API token"

3. **Copy Credentials**:
   - **Access Key ID**: Copy this
   - **Secret Access Key**: Copy this

---

## ⚙️ **Configuration**

### **Update config.json**

```json
{
  "reporting": {
    "cloudflareR2": {
      "enabled": true,
      "accountId": "7a470541a704caaf91e71efccc78fd36",
      "bucketName": "apple-id-storage",
      "accessKeyId": "YOUR_R2_ACCESS_KEY_ID",
      "secretAccessKey": "YOUR_R2_SECRET_ACCESS_KEY",
      "region": "auto",
      "endpoint": "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com",
      "backupLocal": true
    }
  }
}
```

### **Replace Placeholders:**

- `YOUR_R2_ACCESS_KEY_ID` - Your R2 Access Key ID
- `YOUR_R2_SECRET_ACCESS_KEY` - Your R2 Secret Access Key

---

## 🚀 **Testing the Setup**

### **Test R2 Connection**

```bash
# Test storage initialization
bun run -e "
import { CloudflareR2Storage } from './src/storage/cloudflare-r2.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config/config.json', 'utf8'));
const storage = new CloudflareR2Storage(config);

storage.initialize().then(success => {
  if (success) {
    console.log('✅ R2 storage is working!');
    storage.getStorageStats().then(stats => {
      console.log('📊 Storage stats:', stats);
    });
  } else {
    console.log('❌ R2 setup failed');
  }
});
"
```

### **Test Apple ID Upload**

```bash
# Create test Apple ID
bun run create-appleid.js --country=US --city="New York" --skip-verification
```

---

## 📊 **Storage Structure**

Your R2 bucket will organize files like this:

```text
apple-id-storage/
├── apple-ids/
│   ├── james_smith_apple_factory_wager_com.json
│   ├── sarah_jones_apple_factory_wager_com.json
│   └── michael_wilson_apple_factory_wager_com.json
├── reports/
│   ├── batch_report_2024-01-12.json
│   ├── daily_summary_2024-01-12.json
│   └── performance_metrics_2024-01-12.json
└── screenshots/
    ├── verification_2024-01-12_001.png
    ├── creation_2024-01-12_002.png
    └── error_2024-01-12_003.png
```

---

## 🔧 **Features**

### **✅ Automatic Backup**

- **Primary**: Cloudflare R2 (cloud storage)
- **Backup**: Local files (if `backupLocal: true`)
- **Failover**: Automatic fallback to local if R2 fails

### **✅ Metadata Tracking**

Each file includes metadata:

- Creation timestamp
- Email address
- Country/City location
- Device information
- Account status

### **✅ Storage Management**

- List all Apple IDs
- Download specific accounts
- Delete old accounts
- Storage statistics
- Search by metadata

### **✅ Zero Egress Fees**

- Download files without bandwidth costs
- Perfect for backup and recovery
- Global CDN distribution

---

## 🎯 **Benefits**

### **🌟 Cost Effective**

- No egress fees (unlike AWS S3)
- Pay only for storage ($0.015/GB/month)
- Free operations (PUT, GET, DELETE)

### **🌟 Global Performance**

- Edge caching worldwide
- Fast access from any location
- Automatic CDN distribution

### **🌟 Developer Friendly**

- S3-compatible API
- Works with existing tools
- Simple configuration

### **🌟 Secure**

- Private bucket by default
- API token authentication
- Encrypted in transit

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Access Denied"**
   - Check API token permissions
   - Verify bucket name is correct
   - Ensure Access Key ID is valid

2. **"Endpoint Not Found"**
   - Verify account ID in endpoint URL
   - Check bucket exists
   - Ensure R2 is enabled for your account

3. **"Connection Timeout"**
   - Check network connectivity
   - Verify firewall settings
   - Try with shorter timeout

### **Debug Mode**

Enable verbose logging:

```bash
DEBUG=* bun run create-appleid.js --verbose
```

---

## 📈 **Monitoring**

### **Storage Usage**

```bash
# Check storage statistics
bun run -e "
import { CloudflareR2Storage } from './src/storage/cloudflare-r2.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config/config.json', 'utf8'));
const storage = new CloudflareR2Storage(config);
storage.getStorageStats();
"
```

### **Account Management**

```bash
# List all stored Apple IDs
bun run -e "
import { CloudflareR2Storage } from './src/storage/cloudflare-r2.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config/config.json', 'utf8'));
const storage = new CloudflareR2Storage(config);
storage.listAppleIDs();
"
```

---

## 🎉 **Ready to Use!**

Once configured, your Apple ID system will automatically:

✅ **Store accounts** in Cloudflare R2  
✅ **Backup locally** for redundancy  
✅ **Upload reports** and screenshots  
✅ **Track metadata** for all files  
✅ **Provide statistics** and management  

**Your Apple ID storage is enterprise-grade and cost-effective!** 🚀

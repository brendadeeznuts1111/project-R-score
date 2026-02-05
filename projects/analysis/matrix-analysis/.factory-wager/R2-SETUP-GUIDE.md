# FactoryWager R2 Setup Guide
## From Simulation to Live Cloud Storage

### 📊 Current Reality Status
- **R2 Storage**: ❌ SIMULATED (demo credentials)
- **MCP Servers**: ✅ 5/5 actually installed (filesystem, github, git, fetch, context7)
- **Secrets**: ❌ 0/5 real (no credentials configured)
- **Overall Mode**: 💾 SIMULATED

---

## 🎯 Step 1: Get Cloudflare R2 Credentials

### 1.1 Create Cloudflare R2 Bucket
1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2 Object Storage** → **Create bucket**
3. Choose a bucket name (e.g., `factory-wager-artifacts`)
4. Select your preferred region

### 1.2 Generate API Credentials
1. Go to **R2 Object Storage** → **Manage R2 API tokens**
2. Create a new API token with permissions:
   - **Account**: Your Cloudflare account
   - **Zone Permissions**: Not needed (account-level)
   - **R2 Permissions**: `Object Storage:Edit` and `Object Storage:Read`
3. Save the credentials securely:
   - **Access Key ID**: 32-character string
   - **Secret Access Key**: 64-character string
   - **Account ID**: Found in Cloudflare dashboard sidebar

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Set Environment Variables
```bash
# Add these to your shell profile (~/.zshrc, ~/.bashrc, or .env)
export R2_ACCESS_KEY_ID="your_32_char_access_key_here"
export R2_SECRET_ACCESS_KEY="your_64_char_secret_key_here"
export R2_BUCKET_NAME="factory-wager-artifacts"
export R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
```

### 2.2 Alternative: Use .env.local File
```bash
# Create .env.local in project root
echo "R2_ACCESS_KEY_ID=your_32_char_access_key_here" >> .env.local
echo "R2_SECRET_ACCESS_KEY=your_64_char_secret_key_here" >> .env.local
echo "R2_BUCKET_NAME=factory-wager-artifacts" >> .env.local
echo "R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com" >> .env.local
```

### 2.3 Reload Environment
```bash
# Reload shell environment
source ~/.zshrc  # or ~/.bashrc

# Or restart your terminal
```

---

## 🧪 Step 3: Test R2 Connectivity

### 3.1 Run Reality Check
```bash
# Verify R2 is now live
bun run fw --mode=audit-reality
```

**Expected Output:**
```
📊 Component Reality Status:
🌐 R2 Storage: LIVE
   ✅ Real connection established
💾 MCP Servers: 5/6 installed
   ✅ Most servers operational
💾 Secrets: 0/5 real
   ⚠️ Still need secret configuration
🌐 Overall Mode: MIXED
```

### 3.2 Direct R2 Test
```bash
# Test actual S3 API connectivity
bun -e '
import { s3 } from "bun";
const creds = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET_NAME,
  endpoint: process.env.R2_ENDPOINT
};

try {
  const list = await s3(creds).listObjects({ maxKeys: 1 });
  console.log("✅ R2 API responsive, buckets accessible");
  console.log("Bucket:", creds.bucket);
} catch (e) {
  console.log("❌ R2 connection failed:", e.message);
}
'
```

---

## 🔐 Step 4: Configure Secrets (Optional but Recommended)

### 4.1 Store Credentials in OS Keychain
```bash
# Store R2 credentials securely
bun run secrets:enterprise:set R2_ACCESS_KEY_ID "$R2_ACCESS_KEY_ID"
bun run secrets:enterprise:set R2_SECRET_ACCESS_KEY "$R2_SECRET_ACCESS_KEY"
bun run secrets:enterprise:set R2_BUCKET_NAME "$R2_BUCKET_NAME"
bun run secrets:enterprise:set R2_ENDPOINT "$R2_ENDPOINT"
```

### 4.2 Verify Secret Storage
```bash
# Check stored secrets
bun run fw secrets:list
```

---

## 🚀 Step 5: Verify Full Integration

### 5.1 Complete Reality Audit
```bash
# Run comprehensive reality check
bun run fw reality:check
```

### 5.2 Test Deployment Readiness
```bash
# Test if system is ready for production
bun run fw --mode=force-live
```

**Expected Success:**
```
✅ All systems confirmed LIVE
🌐 R2 Storage: LIVE
🔄 MCP Servers: 5/6 installed
🔐 Secrets: 4/4 real
🌐 Overall Mode: LIVE
```

---

## 📋 Step 6: Test FactoryWager R2 Integration

### 6.1 Test Archive Operations
```bash
# Create a test archive
bun run archive:create --id=test-r2-integration

# List archives
bun run archive:list

# Extract test archive
bun run archive:extract --id=test-r2-integration
```

### 6.2 Test Nexus Status
```bash
# Check infrastructure status with live R2
bun run nexus:status
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions

#### ❌ "R2 connection failed"
**Cause**: Invalid credentials or endpoint
**Solution**: 
1. Verify Access Key ID (32 chars)
2. Verify Secret Access Key (64 chars)
3. Check Account ID in endpoint URL
4. Ensure bucket exists

#### ❌ "Credentials real but API unreachable"
**Cause**: Network or permission issues
**Solution**:
1. Check internet connection
2. Verify API token permissions
3. Try different region endpoint
4. Check Cloudflare service status

#### ❌ "MCP Servers: 0/6 installed" (but we know 5/6 are installed)
**Cause**: Reality system being conservative
**Solution**: This is normal - the system prioritizes safety over false positives

---

## 🎯 Success Criteria

### ✅ Fully Configured System
- [ ] R2 credentials set and validated
- [ ] R2 bucket created and accessible
- [ ] Reality audit shows "R2 Storage: LIVE"
- [ ] Archive operations work with cloud storage
- [ ] Nexus status shows healthy R2 connectivity

### 🌐 Production Ready
- [ ] Overall mode: "LIVE" or "MIXED"
- [ ] Secrets stored in OS keychain
- [ ] All critical tests passing
- [ ] Deployment safety checks pass

---

## 📚 Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Bun S3 API Reference](https://bun.sh/docs/api/s3)
- [FactoryWager Reality System](./config/reality-config.ts)

---

## 🛡️ Security Notes

- **Never commit credentials to git**
- **Use environment variables or OS keychain**
- **Rotate credentials regularly**
- **Monitor R2 usage and costs**
- **Keep bucket permissions minimal**

---

## 🎉 Next Steps

After R2 is configured:
1. **Test full workflows** with real cloud storage
2. **Set up monitoring** for R2 usage
3. **Configure backup strategies**
4. **Document production procedures**
5. **Consider multi-region setup** for redundancy

---

*Last Updated: 2026-02-01*
*FactoryWager v1.3.8*

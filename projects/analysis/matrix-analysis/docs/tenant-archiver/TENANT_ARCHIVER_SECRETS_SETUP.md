# Tenant Archiver: Bun.secrets + Wrangler Setup Guide

This guide shows how to set up the enhanced tenant archiver with secure credential management using Bun.secrets and full R2 functionality via bunx wrangler.

## 🔐 Bun.secrets Setup (Recommended)

Bun.secrets provides secure, OS-level credential storage that's more secure than environment variables.

### Step 1: Install Wrangler (if not already installed)

```bash
bunx wrangler --version
```

### Step 2: Set Up R2 Credentials with Bun.secrets

```bash
# Set your Cloudflare R2 access key ID
bunx secrets set com.factory-wager.r2.access-key-id "your-r2-access-key-id"

# Set your Cloudflare R2 secret access key  
bunx secrets set com.factory-wager.r2.secret-access-key "your-r2-secret-access-key"
```

### Step 3: Verify Secrets are Set

```bash
# List all secrets (optional - for verification)
bunx secrets list

# Test the tenant archiver
bun tenant-archiver.ts test-r2
```

## 🌍 Environment Variables (Fallback)

If you prefer environment variables or need a fallback:

```bash
# Add to your .env file or shell profile
export R2_ACCESS_KEY_ID="your-r2-access-key-id"
export R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
export CF_ACCOUNT_ID="your-cloudflare-account-id"  # Optional
export R2_BUCKET="your-bucket-name"                # Optional (defaults to fw-backups)
```

## 🔧 Getting R2 Credentials

### 1. Create R2 API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Click **Manage R2 API tokens**
4. Create a new token with these permissions:
   - **Object Storage**:Edit
   - **Account**:Cloudflare R2:Edit

### 2. Get Account ID

Your Account ID is found in the Cloudflare Dashboard sidebar or at the top right of any page.

## 🚀 Full Functionality Test

```bash
# Test connection and credentials
bun tenant-archiver.ts test-r2

# Check bucket information
bun tenant-archiver.ts bucket-info

# Create and upload a test snapshot
bun tenant-archiver.ts upload test-tenant

# List R2 snapshots
bun tenant-archiver.ts list-r2

# Download and extract
bun tenant-archiver.ts download "tenant-snapshots/test-tenant/filename.tar.gz" "./extracted/"
```

## 📊 Enhanced Features

### With Bun.secrets + Wrangler Integration:

- ✅ **Secure Credentials**: OS-level storage with Bun.secrets
- ✅ **Full R2 API**: Complete listing, deletion, bucket info via wrangler
- ✅ **Fallback Support**: Environment variables as backup
- ✅ **Bucket Management**: Detailed bucket statistics
- ✅ **Smart Testing**: Comprehensive connection testing

### Priority Order for Credentials:

1. **Bun.secrets** (most secure)
   - `com.factory-wager.r2.access-key-id`
   - `com.factory-wager.r2.secret-access-key`

2. **Environment Variables** (fallback)
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`

## 🔍 Troubleshooting

### "Bun.secrets not available" Error

This is normal if you haven't set up secrets yet. The system will fall back to environment variables.

### "Wrangler not available" Error

Install wrangler:
```bash
bunx wrangler --version
```

### Credential Issues

Check your credentials:
```bash
# Test with wrangler directly
bunx wrangler r2 bucket list

# Test with tenant archiver
bun tenant-archiver.ts test-r2
```

## 🛡️ Security Best Practices

### 1. Use Bun.secrets (Recommended)
- Credentials stored in OS keychain
- Not exposed in shell history
- Automatic encryption
- Per-application isolation

### 2. Environment Variables (Alternative)
- Use `.env` files (add to `.gitignore`)
- Set in shell profiles for persistent access
- Avoid committing to version control

### 3. Token Permissions
- Use minimum required permissions
- Regularly rotate tokens
- Monitor token usage in Cloudflare dashboard

## 📈 Performance Benefits

### Bun.screts Advantages:
- **Fast**: Native OS keychain access
- **Secure**: Hardware-backed encryption on supported systems
- **Convenient**: No need to manage .env files
- **Isolated**: App-specific credential storage

### Wrangler Integration:
- **Complete API**: Full R2 functionality
- **Efficient**: Optimized Cloudflare API usage
- **Reliable**: Official Cloudflare tooling
- **Informative**: Detailed error messages and progress

## 🎯 Production Deployment

For production environments:

1. **Set up Bun.secrets** on your production servers
2. **Configure CI/CD** to use secrets management
3. **Test thoroughly** with `bun tenant-archiver.ts test-r2`
4. **Monitor bucket usage** with `bun tenant-archiver.ts bucket-info`
5. **Set up cleanup** with `bun tenant-archiver.ts cleanup-r2`

## 📚 Additional Resources

- [Bun.secrets Documentation](https://bun.sh/docs/runtime/secrets)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Tenant Archiver README](./TENANT_ARCHIVER_R2_README.md)

---

**Ready to go!** Your tenant archiver now has enterprise-grade security and full R2 functionality.

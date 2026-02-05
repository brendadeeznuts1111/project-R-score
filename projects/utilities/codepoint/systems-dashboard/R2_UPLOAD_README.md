# 🚀 Cloudflare R2 Dashboard Upload System

This system allows you to upload your enhanced dashboard to Cloudflare R2, a cost-effective S3-compatible storage solution with generous free tier and egress-free pricing.

## 📋 Setup Instructions

### 1. Create Cloudflare R2 Bucket

1. **Login to Cloudflare Dashboard**
   - Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to **R2 Object Storage** in the sidebar

2. **Create R2 Bucket**
   - Click "Create bucket"
   - **Bucket name**: `bun-dashboard-enhancements` (or your preferred name)
   - **Location**: Choose your preferred region
   - Click "Create bucket"

3. **Get Account ID**
   - In the right sidebar, find your **Account ID**
   - Copy this value for the configuration

### 2. Create R2 API Tokens

1. **Navigate to API Tokens**
   - Go to **My Profile** → **API Tokens**
   - Click "Create Token"

2. **Create Custom Token**
   - **Token name**: `Dashboard R2 Upload`
   - **Permissions**:
     - **Account**: `Cloudflare R2:Edit`
     - **Zone Resources**: `All zones` (or specific zones if preferred)
   - Click "Continue to summary"
   - Click "Create Token"
   - **Copy the token** - this is your R2 API token

3. **Extract Access Keys**
   - The token you received is the **Access Key ID**
   - To get the **Secret Access Key**, use the Cloudflare API or wrangler CLI:
   ```bash
   # Install wrangler if not already installed
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login

   # Create R2 credentials (optional - the API token works directly)
   wrangler r2 credentials create
   ```

### 3. Configure Environment Variables

Create a `.env` file in the `systems-dashboard` directory:

```bash
# Copy the example file
cp .env.r2.example .env

# Edit .env with your R2 credentials
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET=bun-dashboard-enhancements
```

### 4. Make Bucket Public (Optional)

For public access to your dashboard:

1. **Go to R2 Bucket Settings**
   - Navigate to your bucket in Cloudflare Dashboard
   - Go to **Settings** → **Public access**

2. **Enable Public Access**
   - Toggle "Allow public read access"
   - Copy the **Public URL** format: `https://pub-{account-id}.r2.dev/{bucket-name}/{file-name}`

## 🚀 Usage

### Method 1: Dashboard UI

1. Open your dashboard at `http://localhost:5555`
2. Select **"🟠 Cloudflare R2"** from the provider dropdown
3. Click the **"📤 Upload to R2"** button
4. Monitor the upload status in the yellow status bar

### Method 2: Command Line

```bash
# Validate configuration
bun run r2:validate

# Upload to R2
bun run r2:upload

# Or directly
bun r2-upload.ts upload
```

## 📁 What Gets Uploaded

The system uploads:

### Dashboard Files

- `SystemsDashboard.tsx` - Main React component
- `vite.config.ts` - Vite configuration
- `index.html` - Entry HTML file
- `src/main.tsx` - React entry point
- `package.json` - Dependencies and scripts

### Documentation

- `README.md` - Main documentation
- `BUN_INSPECT_*.md` - Bun inspect guides
- `session-1/headers-api-matrix.ts` - Headers API documentation
- `session-1/bun-apis-matrix.ts` - Bun APIs matrix

### Build Files (if exists)

- `dist/**/*` - Built dashboard files

## 📂 R2 Structure

Uploads are organized by timestamp:

```text
bun-dashboard-enhancements/
├── dashboard-2024-01-08T15-30-45-123Z/
│   ├── SystemsDashboard.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   └── main.tsx
│   ├── package.json
│   ├── docs/
│   │   ├── README.md
│   │   ├── headers-api-matrix.ts
│   │   └── bun-apis-matrix.ts
│   ├── dist/
│   │   ├── assets/
│   │   └── index.html
│   └── manifest.json
```

## 🔗 Access Your Dashboard

After upload, your dashboard will be available at:

```
https://pub-{account-id}.r2.dev/dashboard-2024-01-08T15-30-45-123Z/index.html
```

## 💡 R2 vs S3 Benefits

### Cost Advantages

- **Free Tier**: 10GB storage, 1 million Class A operations/month
- **Zero Egress Fees**: No charges for downloading files
- **Pay-as-you-go**: $0.015/GB/month after free tier
- **Operations**: $4.50 per million Class A operations

### Performance Benefits

- **Global CDN**: Automatic edge caching
- **Fast Uploads**: Optimized for global distribution
- **S3 Compatible**: Works with existing S3 tools and libraries
- **Low Latency**: Edge locations worldwide

### Developer Experience

- **Simple Setup**: No complex IAM policies needed
- **API Tokens**: Easy token-based authentication
- **CLI Support**: Works with `wrangler` and standard AWS CLI
- **Dashboard**: Beautiful web interface for management

## 🛠️ Advanced Configuration

### Custom Domain

1. **Set up Custom Domain**
   ```bash
   # Using wrangler
   wrangler r2 bucket domain create bun-dashboard-enhancements --custom-domain dashboard.yourdomain.com
   ```

2. **Configure DNS**
   - Add CNAME record pointing to `pub-{account-id}.r2.dev`

### Lifecycle Rules

Automatically delete old uploads:

```bash
# Using wrangler
wrangler r2 bucket lifecycle create bun-dashboard-enhancements --rules-file lifecycle.json
```

Example `lifecycle.json`:
```json
{
  "rules": [
    {
      "id": "delete-old-dashboards",
      "status": "Enabled",
      "filter": {
        "prefix": "dashboard-"
      },
      "expiration": {
        "days": 30
      }
    }
  ]
}
```

## 🔧 Troubleshooting

### Common Issues

1. **"R2 configuration is invalid"**

   - Check your `.env` file has all required variables
   - Ensure Cloudflare account ID is correct (32-character hex string)
   - Verify R2 API token has proper permissions

2. **"Access Denied" errors**

   - Check API token permissions (needs `Cloudflare R2:Edit`)
   - Verify bucket exists and is accessible
   - Ensure account ID matches your Cloudflare account

3. **"Bucket not found"**

   - Ensure bucket exists in your Cloudflare account
   - Check bucket name spelling
   - Verify you're using the correct account ID

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
export DEBUG=r2-upload
bun r2-upload.ts upload
```

### Test Connection

Test your R2 configuration:

```bash
# Test basic connectivity
curl -I https://pub-{account-id}.r2.dev/

# Test bucket access
wrangler r2 bucket list
```

## 🔄 Automation

### GitHub Actions (Optional)

Create `.github/workflows/upload-to-r2.yml`:

```yaml
name: Upload to R2

on:
  push:
    branches: [ main ]

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1

    - name: Upload to R2
      env:
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        CLOUDFLARE_R2_ACCESS_KEY_ID: ${{ secrets.CLOUDFLARE_R2_ACCESS_KEY_ID }}
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${{ secrets.CLOUDFLARE_R2_SECRET_ACCESS_KEY }}
        R2_BUCKET: ${{ secrets.R2_BUCKET }}
      run: |
        cd systems-dashboard
        bun run r2:upload
```

### Cron Jobs

Schedule automatic uploads:

```bash
# Add to crontab for daily uploads
0 2 * * * cd /path/to/project/systems-dashboard && bun run r2:upload
```

## 📊 Upload Features

- ✅ **Automatic Content-Type Detection** - Files served with correct MIME types
- ✅ **Multipart Upload** - Large files uploaded efficiently
- ✅ **Progress Tracking** - Real-time upload status in UI
- ✅ **Manifest Generation** - JSON manifest with upload details
- ✅ **Timestamp Organization** - Each upload gets unique timestamped folder
- ✅ **Error Handling** - Detailed error messages and retry logic
- ✅ **Public URLs** - Automatic public URL generation
- ✅ **Zero Egress** - No download costs

## 📝 Security Notes

- Store API tokens securely (use GitHub Secrets in CI/CD)
- Use least-privilege tokens (only R2 access needed)
- Enable bucket public access only if required
- Consider using custom domains for production
- Monitor usage through Cloudflare dashboard

## 🆘 Support

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify Cloudflare credentials and permissions
3. Ensure bucket exists and is accessible
4. Check network connectivity to R2 endpoints
5. Review Cloudflare R2 documentation

For additional help:
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)

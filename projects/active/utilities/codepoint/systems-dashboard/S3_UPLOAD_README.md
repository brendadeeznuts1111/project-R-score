# 🚀 S3 Dashboard Upload System

This system allows you to automatically upload your enhanced dashboard to S3 for sharing and deployment.

## 📋 Setup Instructions

### 1. Configure AWS Credentials

Create a `.env` file in the `systems-dashboard` directory:

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your AWS credentials
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET=bun-dashboard-enhancements
AWS_REGION=us-east-1
```

### 2. Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://bun-dashboard-enhancements --region us-east-1

# Or through AWS Console
# 1. Go to S3 service
# 2. Click "Create bucket"
# 3. Name: bun-dashboard-enhancements
# 4. Region: us-east-1 (or your preferred region)
# 5. Keep default settings
# 6. Create bucket
```

### 3. Set Bucket Permissions (Optional)

For public access to your dashboard:

```bash
# Allow public read access
aws s3api put-bucket-policy --bucket bun-dashboard-enhancements --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bun-dashboard-enhancements/*"
    }
  ]
}'
```

## 🚀 Usage

### Method 1: Dashboard UI
1. Open your dashboard at `http://localhost:5555`
2. Click the **"📤 Upload to S3"** button
3. Monitor the upload status in the yellow status bar

### Method 2: Command Line
```bash
# Validate configuration
bun run s3:validate

# Upload to S3
bun run s3:upload --verbose
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

## 📂 S3 Structure

Uploads are organized by timestamp:

```text
s3://bun-dashboard-enhancements/
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

```text
https://bun-dashboard-enhancements.s3.amazonaws.com/dashboard-2024-01-08T15-30-45-123Z/index.html
```

## 🛠️ Advanced Configuration

### Custom S3 Endpoint

For services like DigitalOcean Spaces, Wasabi, etc:

```bash
# Add to .env
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

### Custom Bucket Name

Change the bucket name in your `.env`:

```bash
S3_BUCKET=my-custom-dashboard-bucket
```

## 🔧 Troubleshooting

### Common Issues

1. **"S3 configuration is invalid"**
   - Check your `.env` file has all required variables
   - Ensure AWS credentials have S3 permissions

2. **"Access Denied" errors**
   - Verify IAM user has `s3:PutObject` permissions
   - Check bucket policy allows uploads

3. **"Bucket not found"**
   - Ensure bucket exists in the specified region
   - Check bucket name spelling

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
export DEBUG=s3-upload
bun s3-upload.ts upload
```

## 📊 Upload Features

- ✅ **Automatic Content-Type Detection** - Files served with correct MIME types
- ✅ **Multipart Upload** - Large files uploaded efficiently
- ✅ **Progress Tracking** - Real-time upload status in UI
- ✅ **Manifest Generation** - JSON manifest with upload details
- ✅ **Timestamp Organization** - Each upload gets unique timestamped folder
- ✅ **Error Handling** - Detailed error messages and retry logic

## 🔄 Automation

### GitHub Actions (Optional)

Create `.github/workflows/upload-to-s3.yml`:

```yaml
name: Upload to S3

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

    - name: Upload to S3
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        S3_BUCKET: ${{ secrets.S3_BUCKET }}
      run: |
        cd systems-dashboard
        bun run s3:upload
```

## 📝 Security Notes

- Store AWS credentials securely (use AWS Secrets Manager in production)
- Use IAM roles instead of access keys when possible
- Enable S3 bucket encryption for sensitive data
- Consider using CloudFront for CDN and HTTPS

## 🆘 Support

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify AWS credentials and permissions
3. Ensure bucket exists and is accessible
4. Check network connectivity to S3 endpoint

For additional help, review the [AWS S3 Documentation](https://docs.aws.amazon.com/s3/).

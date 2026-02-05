# CloudFlare R2 Setup Guide

## Overview

This project uses Bun's native S3 API to interact with CloudFlare R2 for object storage. The implementation is fast, zero-dependency, and fully compatible with S3-compatible services.

## Configuration

### Environment Variables

Create a `.env` file in the project root with your R2 credentials:

```env
# Bun S3 Configuration (from Cloudflare R2)
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
S3_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
S3_BUCKET=your_bucket_name
S3_REGION=auto

# Cloudflare API Token (for presigned URL generation fallback)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### Where to Find Your Credentials

1. **Access Key ID & Secret Access Key**: From Cloudflare R2 settings
   - Navigate to: Cloudflare Dashboard → R2 → API Tokens
   - Create new token with "Admin All" permissions
   - Copy the Access Key ID and Secret Access Key

2. **Endpoint URL**: CloudFlare R2 S3-compatible endpoint
   - Format: `https://<account-id>.r2.cloudflarestorage.com`
   - Replace `<account-id>` with your account ID (first part of the endpoint shown in R2 dashboard)

3. **API Token**: For presigned URL generation fallback
   - Navigate to: Cloudflare Dashboard → API Tokens
   - Create token with "Account - R2 - Edit" permissions
   - Copy the token value

## Usage

### Basic Operations

```typescript
import { BunR2AppleManager } from './src/storage/r2-apple-manager';

// Initialize the manager
const manager = new BunR2AppleManager({}, 'my-bucket');

// Upload a file
await manager.uploadAppleID({ email: 'test@apple.com' }, 'test.json');

// Read a file
const data = await manager.readAsJson('apple-ids/test.json');

// Generate presigned URL
const uploadUrl = await manager.getPresignedUrl('apple-ids/new-file.json', 'PUT');

// Check if file exists
const exists = await manager.fileExists('apple-ids/test.json');

// Delete a file
await manager.deleteFile('apple-ids/test.json');
```

### Lifecycle Audit

Test your R2 connection with a complete write/read/delete audit:

```typescript
const isHealthy = await manager.performLifecycleAudit();
console.log(isHealthy ? '✅ R2 Connected' : '❌ R2 Failed');
```

### Query and Filter Data

The project includes a powerful query tool for filtering and analyzing R2 data:

```bash
# Query Apple IDs with filters
bun query-r2 --filter success=true country=US --prefix apple-ids/ --pattern -1

# Query all objects without pattern filtering
bun query-all --prefix apple-ids/ --pattern -1

# Query with specific pattern and export results
bun query-r2 --pattern 0 --filter success=true --export

# Quick Apple ID query
bun query-apple-ids

# Export filtered results
bun query-export --filter country=US success=true
```

**Query Features:**

- **Pattern-based classification** using URLPattern matching
- **CLI filtering** with key=value pairs (success, country, etc.)
- **JSON content parsing** for deep data filtering
- **Export capabilities** to save filtered results
- **Performance metrics** and throughput analysis
- **RPA integration** with DuoPlus for automated processing

## Key Features

✅ **Zero Dependencies** - Uses Bun's native S3 bindings
✅ **Fast** - Native performance without external libraries
✅ **Automatic Compression** - Zstd compression for all uploads
✅ **Streaming** - Large file support with multipart uploads
✅ **Fallback Support** - Worker proxy → Direct S3 → Presigned URL
✅ **Memory Optimized** - No unnecessary string/buffer duplication
✅ **Error Handling** - Comprehensive error mapping with Bun error codes
✅ **Advanced Querying** - Pattern-based filtering with JSON content parsing
✅ **CLI Integration** - Command-line tools for data analysis and export

## Bun Environment Variable Loading

Bun automatically reads environment variables from:

1. `.env` (highest priority)
2. `.env.production` / `.env.development` / `.env.test` (based on NODE_ENV)
3. `.env.local`
4. System environment variables

No `dotenv` package needed! Just create a `.env` file and Bun will load it automatically.

## API Reference

### Upload Methods

- `uploadAppleID(data, filename)` - Upload Apple ID data
- `uploadReport(data, filename, subDir)` - Upload report data
- `uploadStream(key, data, contentType)` - Upload with compression
- `uploadLargeFile(key, data, options)` - Multipart upload for large files
- `bulkUploadAppleIDs(data, prefix)` - Batch upload with concurrency

### Read Methods

- `readAsText(key)` - Read as text
- `readAsJson(key)` - Parse JSON
- `readAsBytes(key)` - Read as bytes
- `readRange(key, start, end)` - Memory-optimized partial reads
- `streamFile(key)` - Stream ReadableStream

### File Management

- `fileExists(key)` - Check existence
- `deleteFile(key)` - Delete file
- `getPresignedUrl(key, method)` - Generate signed URLs (GET/PUT)

## Security Best Practices

1. **Never commit `.env` files** - Keep credentials in `.env.local` or environment
2. **Rotate keys regularly** - Cloudflare R2 allows key rotation
3. **Use least privilege** - R2 API tokens should have minimal required permissions
4. **Disable in development** - Use `--no-env-file` in CI/CD if needed
5. **Monitor access** - Enable Cloudflare logging to track R2 access

## Troubleshooting

### "S3Client not initialized"

- Check that `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are set
- Verify `.env` file is in the project root
- Ensure credentials are correct and not expired

### "Invalid endpoint"

- Verify S3_ENDPOINT format: `https://<account-id>.r2.cloudflarestorage.com`
- Check account ID matches your Cloudflare R2 account
- Ensure no trailing slashes in endpoint URL

### "Signature mismatch"

- Verify Secret Access Key is copied correctly (no extra spaces)
- Check that access and secret keys are from the same R2 token
- Ensure keys haven't been regenerated on the Cloudflare side

### Query Issues

#### "Query failed: exit code 1"

- Update wrangler to latest version: `npm update -g wrangler`
- Use AWS S3 SDK instead of wrangler for listing objects
- Check R2 bucket permissions and credentials

#### "No results found"

- Verify prefix path is correct (e.g., `apple-ids/`)
- Check filter syntax: `--filter key=value key2=value2`
- Use `--pattern -1` to skip pattern filtering
- Ensure JSON files contain the fields you're filtering on

#### "Failed to parse JSON"

- Check if files are compressed (Zstandard format)
- Verify file encoding is UTF-8
- Use `--pattern -1` to test with metadata only

## References

- [Bun S3 API Documentation](https://bun.sh/docs/api/s3)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [S3 API Protocol](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)

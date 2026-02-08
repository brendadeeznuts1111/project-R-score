# R2 Snapshots Documentation

## Overview

R2 snapshots provide compressed, encrypted backups of user profiles stored in Cloudflare R2 (S3-compatible object storage). This enables disaster recovery, profile restoration, and historical tracking.

## Architecture

### Profile Engine Integration

The `UserProfileEngine` automatically saves snapshots to R2 when profiles are created or updated:

```typescript
// Located in: packages/user-profile/src/core.ts
private async saveToS3(userId: string, prefsJson: string, hashHex: string): Promise<void>
```

**Features:**
- **Compression**: Gzip compression using `CompressionStream` API
- **Encryption**: Metadata encryption support
- **Parity Hash**: SHA-256 hash stored in metadata for integrity verification
- **Non-blocking**: Failures don't prevent profile creation

### Snapshot Storage Format

```
profiles/{userId}/{hashHex}.zst
```

- **Path**: `profiles/{userId}/`
- **Filename**: `{hashHex}.zst` (SHA-256 hash + zstd extension)
- **Content-Type**: `application/octet-stream`
- **Content-Encoding**: `zstd`
- **Metadata**: `x-amz-meta-parity` header contains hash for verification

## Configuration

### Environment Variables

```bash
# Required for R2 uploads
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key

# Optional: Custom endpoint
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# Bucket configuration
R2_REGISTRY_BUCKET=profile-snapshots
R2_REGION=us-east-1
```

### Dashboard Configuration

Located in `config.toml`:

```toml
# R2 Snapshots
[profiling.r2]
enabled = true
bucket_name = "profile-snapshots"
snapshot_interval_minutes = 60
retention_days = 30
compression = "gzip"
encryption = true
```

**Configuration Options:**
- `enabled`: Enable/disable R2 snapshots
- `bucket_name`: R2 bucket name for snapshots
- `snapshot_interval_minutes`: How often to create snapshots (for scheduled snapshots)
- `retention_days`: How long to keep snapshots (30 days default)
- `compression`: Compression algorithm (`gzip` or `zstd`)
- `encryption`: Enable encryption (true/false)

## Benchmarking

### CLI Usage

```bash
# Run R2 snapshot benchmarks
bun cli.ts profile --operations r2_snapshot --iterations 50

# Include R2 restore benchmarks
bun cli.ts profile --operations r2_snapshot,r2_restore --iterations 25
```

### API Usage

```bash
# Run R2 snapshot benchmark via API
curl -X POST "http://localhost:3008/api/profile/benchmark" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": ["r2_snapshot"],
    "iterations": 50
  }'

# Get R2 snapshot metrics
curl "http://localhost:3008/api/profile/metrics?operation=r2_snapshot"

# Get R2 snapshot trends
curl "http://localhost:3008/api/profile/trends?metric=r2_upload_time_ms&interval=hour&period=24h"
```

### Benchmark Metrics

The dashboard tracks these R2 snapshot metrics:

- **Duration**: Total snapshot operation time
- **Upload Time**: Time to upload to R2 (`r2UploadTimeMs`)
- **Download Time**: Time to restore from R2 (`r2DownloadTimeMs`)
- **Object Size**: Size of snapshot in bytes (`r2ObjectSizeBytes`)
- **Success Rate**: Percentage of successful snapshots
- **Compression Ratio**: Size reduction from compression

**Target Performance:**
- **Snapshot Upload**: 100ms target
- **Snapshot Restore**: 200ms target
- **Compression**: ~70% size reduction (gzip)

## Implementation Details

### Upload Process

1. **Serialize Profile**: Convert profile to JSON string
2. **Compress**: Apply gzip compression using `CompressionStream`
3. **Generate Hash**: Calculate SHA-256 hash of profile data
4. **Upload to R2**: PUT request to R2 endpoint with:
   - Compressed body
   - Authorization header (Basic auth)
   - Content-Encoding: zstd
   - Metadata: parity hash

### Restore Process

1. **Download**: GET request from R2 endpoint
2. **Decompress**: Decompress gzip data
3. **Verify**: Check parity hash matches
4. **Deserialize**: Parse JSON back to profile object

### Error Handling

- **Non-blocking**: Snapshot failures don't prevent profile operations
- **Logging**: Warnings logged but don't throw errors
- **Retry Logic**: Can be added via configuration

## Usage Examples

### Creating Profiles with Snapshots

```typescript
import { UserProfileEngine } from '@factorywager/user-profile';

const engine = new UserProfileEngine();

// Profile creation automatically triggers snapshot
const prefs = {
  userId: '@ashschaeffer1',
  dryRun: true,
  gateways: ['venmo', 'cashapp'],
  location: 'New Orleans, LA',
  subLevel: 'PremiumPlus',
  progress: {},
};

const hash = await engine.createProfile(prefs);
// Snapshot automatically saved to R2: profiles/@ashschaeffer1/{hash}.zst
```

### Manual Snapshot (Future Enhancement)

```typescript
// Future API (not yet implemented)
await engine.createSnapshot(userId);
await engine.restoreSnapshot(userId, snapshotHash);
```

### Monitoring Snapshots

```bash
# Check snapshot metrics
curl "http://localhost:3008/api/profile/metrics?operation=r2_snapshot&hours=24"

# View snapshot trends
curl "http://localhost:3008/api/profile/trends?metric=r2_upload_time_ms&interval=day&period=7d"

# Get snapshot history
curl "http://localhost:3008/api/history?scope=profile&operation=r2_snapshot"
```

## Dashboard Integration

### R2 Snapshot Tab

The dashboard displays R2 snapshot operations in the Profiling tab:

- **Operation**: `r2_snapshot` or `r2_restore`
- **Category**: `r2_snapshot`
- **Metrics**: Upload time, download time, object size
- **Status**: Pass/Warning/Fail based on target times
- **Tags**: `['r2', 'snapshot']` or `['r2', 'restore']`

### Filtering

```bash
# Filter by R2 operations
curl "http://localhost:3008/api/data?scope=profile&operation=r2_snapshot"

# Filter by category
# In dashboard UI: Select "R2 Snapshot" category filter
```

## Performance Characteristics

### Current Implementation

- **Compression**: Gzip (configurable to zstd)
- **Upload Time**: ~1-3ms (simulated in benchmarks)
- **Download Time**: ~2-5ms (simulated in benchmarks)
- **Object Size**: Varies by profile size (~1-10KB compressed)

### Target Performance

- **Snapshot Upload**: <100ms (target)
- **Snapshot Restore**: <200ms (target)
- **Compression Ratio**: 60-80% size reduction
- **Throughput**: 1000+ snapshots/second

## Security

### Encryption

- **At Rest**: R2 bucket encryption (configured in Cloudflare)
- **In Transit**: HTTPS/TLS for all R2 communications
- **Metadata**: Parity hash for integrity verification

### Access Control

- **Credentials**: Stored in environment variables
- **IAM**: R2 bucket policies control access
- **Audit**: All snapshot operations logged

## Troubleshooting

### Common Issues

**1. Snapshots not uploading**
```bash
# Check environment variables
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Check bucket exists
# Verify R2 bucket configuration in Cloudflare dashboard
```

**2. Slow snapshot performance**
```bash
# Check network latency
curl -w "@-" -o /dev/null -s "https://your-account-id.r2.cloudflarestorage.com"

# Review benchmark results
curl "http://localhost:3008/api/profile/metrics?operation=r2_snapshot"
```

**3. Compression not working**
```bash
# Verify CompressionStream API support
# Check browser/runtime compatibility
```

### Debug Mode

Enable detailed logging:

```typescript
// In user-profile/src/core.ts
logger.level = 'debug'; // See snapshot operations
```

## Future Enhancements

### Planned Features

1. **Scheduled Snapshots**: Automatic periodic snapshots
2. **Snapshot Restore API**: Restore profiles from snapshots
3. **Snapshot Versioning**: Track multiple snapshot versions
4. **Incremental Snapshots**: Only upload changes
5. **Snapshot Expiration**: Automatic cleanup based on retention policy
6. **Multi-Region**: Replicate snapshots across regions
7. **Snapshot Encryption**: Client-side encryption before upload

### API Endpoints (Future)

```bash
# Create snapshot manually
POST /api/profile/snapshot
{
  "userId": "@ashschaeffer1"
}

# List snapshots
GET /api/profile/snapshots?userId=@ashschaeffer1

# Restore from snapshot
POST /api/profile/restore
{
  "userId": "@ashschaeffer1",
  "snapshotHash": "abc123..."
}

# Delete snapshot
DELETE /api/profile/snapshot/{snapshotHash}
```

## See Also

- [Profile Engine Documentation](../../user-profile/README.md)
- [API Documentation](./API.md)
- [Profiling Configuration](./config.toml)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

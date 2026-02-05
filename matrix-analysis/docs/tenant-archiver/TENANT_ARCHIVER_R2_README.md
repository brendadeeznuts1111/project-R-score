# Tenant Archiver with Cloudflare R2 Integration

A comprehensive tenant snapshot management system with Cloudflare R2 storage integration, built with Bun and TypeScript.

## 🚀 Features

### Core Functionality

- **✅ Snapshot Creation**: Create compressed tenant snapshots with metadata
- **✅ Snapshot Extraction**: Extract snapshots to any directory
- **✅ Storage Management**: Track and manage local storage usage
- **✅ CLI Interface**: Full command-line tool with help text
- **✅ Sample Data**: Automatically generates realistic tenant data for testing

### Cloudflare R2 Integration

- **☁️ R2 Upload**: Upload snapshots directly to Cloudflare R2
- **☁️ R2 Download**: Download snapshots from R2 for extraction
- **☁️ R2 Listing**: List and manage R2-stored snapshots
- **☁️ Hybrid Storage**: Combine local and R2 storage seamlessly
- **☁️ R2 Cleanup**: Automatic cleanup of old R2 snapshots
- **☁️ Connection Testing**: Verify R2 credentials and permissions

## 📦 Installation

```bash
# Ensure you have Bun installed
curl -fsSL https://bun.sh/install | bash

# Clone or copy the tenant-archiver.ts file
# No additional dependencies required - uses Bun's built-in S3 client
```

## 🔧 Configuration

### Environment Variables for R2

```bash
# Required for R2 functionality
export R2_ACCESS_KEY_ID="your-r2-access-key"
export R2_SECRET_ACCESS_KEY="your-r2-secret-key"

# Optional (uses default if not set)
export CF_ACCOUNT_ID="your-cloudflare-account-id"
export R2_BUCKET="your-bucket-name"  # defaults to "fw-backups"
```

### Getting R2 Credentials

1. Go to your Cloudflare Dashboard
2. Navigate to **R2 Object Storage**
3. Go to **Manage R2 API tokens**
4. Create a new token with these permissions:
   - Object Storage:Edit
   - Account:Cloudflare R2:Edit

## 🎯 Usage

### Basic Commands

```bash
# Create a local snapshot
bun tenant-archiver.ts create tenant-a

# Create snapshot and upload to R2
bun tenant-archiver.ts create tenant-a --r2

# Create and upload to R2 (dedicated command)
bun tenant-archiver.ts upload tenant-b

# List local snapshots
bun tenant-archiver.ts list 10

# List both local and R2 snapshots
bun tenant-archiver.ts list 10 --r2

# List only R2 snapshots
bun tenant-archiver.ts list-r2 10
```

### Extraction and Download

```bash
# Extract local snapshot
bun tenant-archiver.ts extract "./snapshots/tenant-a-2026-02-01T03-54-12-532Z.tar.gz" "./restored/"

# Extract R2 snapshot (downloads then extracts)
bun tenant-archiver.ts extract "tenant-snapshots/tenant-a/filename.tar.gz" "./restored/"

# Download R2 snapshot without extraction
bun tenant-archiver.ts download "tenant-snapshots/tenant-a/filename.tar.gz" "./downloaded/"
```

### Storage Management

```bash
# Show storage usage (local + R2)
bun tenant-archiver.ts storage

# Clean up old local snapshots (keep 3 per tenant)
bun tenant-archiver.ts cleanup 3

# Clean up old R2 snapshots (keep 3 per tenant)
bun tenant-archiver.ts cleanup-r2 3
```

### Testing and Diagnostics

```bash
# Test R2 connection and permissions
bun tenant-archiver.ts test-r2

# Show help
bun tenant-archiver.ts
```

## 🔌 Programmatic API

### Basic Usage

```typescript
import {
  createTenantSnapshot,
  createAndUploadTenantSnapshot,
  listRecentSnapshots,
  extractSnapshot,
  uploadToR2,
  downloadFromR2
} from './tenant-archiver';

// Create local snapshot
const localPath = await createTenantSnapshot('tenant-a');

// Create and upload to R2
const { localPath, r2Url, r2Key } = await createAndUploadTenantSnapshot('tenant-b');

// List snapshots (including R2)
const snapshots = await listRecentSnapshots(10, true); // includeR2 = true

// Extract snapshot (works with both local and R2 paths)
await extractSnapshot('tenant-snapshots/tenant-a/filename.tar.gz', './extracted/');
```

### Advanced R2 Operations

```typescript
import {
  uploadToR2,
  downloadFromR2,
  listR2Objects,
  deleteFromR2,
  testR2Connection
} from './tenant-archiver';

// Upload any file to R2
const r2Url = await uploadToR2('./local-file.tar.gz', 'backups/file.tar.gz');

// Download from R2
await downloadFromR2('backups/file.tar.gz', './downloaded-file.tar.gz');

// List R2 objects
const objects = await listR2Objects('tenant-snapshots/');

// Delete from R2
await deleteFromR2('tenant-snapshots/tenant-a/old-snapshot.tar.gz');

// Test R2 connection
await testR2Connection();
```

## 📁 File Structure

### Tenant Data Organization

```text
tenants/
├── tenant-a/
│   ├── tenant.json      # Tenant metadata and configuration
│   ├── config.yaml      # YAML configuration
│   └── README.md        # Human-readable documentation
└── tenant-b/
    ├── tenant.json
    ├── config.yaml
    └── README.md
```

### Snapshot Naming Convention

```text
# Local snapshots
snapshots/tenant-id-2026-02-01T03-54-12-532Z.tar.gz

# R2 snapshots
tenant-snapshots/tenant-id/tenant-id-2026-02-01T03-54-12-532Z.tar.gz
```

### Sample Tenant Data

Each tenant snapshot includes:

- **tenant.json**: Complete tenant metadata with configuration and statistics
- **config.yaml**: YAML-formatted configuration for easy reading
- **README.md**: Human-readable documentation with tenant details

## 🔒 Security Features

- **Credential Management**: Uses environment variables and Bun.secrets
- **Metadata Validation**: Validates snapshot metadata before processing
- **Error Handling**: Comprehensive error handling with detailed messages
- **Path Safety**: Validates paths to prevent directory traversal
- **R2 Permissions**: Uses principle of least privilege for R2 access

## 📊 Performance

- **Bun Native**: Built with Bun's native S3 client for optimal performance
- **Parallel Operations**: Supports concurrent uploads/downloads
- **Compression**: Uses gzip compression for efficient storage
- **Incremental Backups**: Only stores changed tenant data
- **Smart Cleanup**: Efficient cleanup of old snapshots

## 🛠️ Development

### Architecture

```
tenant-archiver.ts
├── R2 Integration Layer
│   ├── uploadToR2()
│   ├── downloadFromR2()
│   ├── listR2Objects()
│   └── deleteFromR2()
├── Core Snapshot Functions
│   ├── createTenantSnapshot()
│   ├── extractSnapshot()
│   └── listRecentSnapshots()
├── Storage Management
│   ├── getSnapshotStorageSize()
│   ├── cleanupOldSnapshots()
│   └── cleanupR2Snapshots()
├── CLI Interface
│   ├── main()
│   └── command parsing
└── Utilities
    ├── createSampleTenantData()
    └── testR2Connection()
```

### Testing

```bash
# Test basic functionality
bun tenant-archiver.ts create test-tenant
bun tenant-archiver.ts list
bun tenant-archiver.ts extract "./snapshots/test-tenant-*.tar.gz" "./test-extract/"

# Test R2 integration (requires credentials)
bun tenant-archiver.ts test-r2
bun tenant-archiver.ts upload test-tenant
bun tenant-archiver.ts list-r2
```

## 🚨 Error Handling

The system provides comprehensive error handling:

- **Missing Credentials**: Clear instructions for setting up R2 credentials
- **Network Issues**: Retry logic and timeout handling
- **File System Errors**: Graceful handling of permission issues
- **Invalid Paths**: Validation and sanitization of file paths
- **R2 Errors**: Detailed error messages from Cloudflare API

## 📈 Monitoring

### Storage Metrics
```bash
# Get detailed storage information
bun tenant-archiver.ts storage

# Output includes:
# - Local storage usage
# - R2 storage usage (if configured)
# - Combined total
# - Per-tenant breakdown
```

### R2 Connection Testing
```bash
# Verify R2 setup and permissions
bun tenant-archiver.ts test-r2

# Provides:
# - Connection status
# - Bucket information
# - Object count
# - Recent objects list
```

## 🔮 Future Enhancements

- [ ] **Encryption**: Client-side encryption for sensitive data
- [ ] **Deduplication**: Block-level deduplication for storage efficiency
- [ ] **Streaming**: Support for large file streaming
- [ ] **Multi-region**: Cross-region replication support
- [ ] **Webhooks**: Notifications for snapshot events
- [ ] **Metrics Dashboard**: Web-based monitoring interface

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

For issues and questions:
1. Check the error messages carefully
2. Verify R2 credentials and permissions
3. Test with `bun tenant-archiver.ts test-r2`
4. Review this documentation
5. Check the Cloudflare R2 documentation

---

**Built with ❤️ using Bun and Cloudflare R2**

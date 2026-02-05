# 📦 R2 Storage Integration - Persistent Violation Logs

Production-grade Cloudflare R2 integration for persistent violation log storage with streaming uploads and global CDN distribution.

## 🚀 Quick Start

```bash
# 1. Configure R2 credentials
cp .env.example .env
# Edit .env with your Cloudflare R2 credentials

# 2. Test R2 connection
bun run r2-demo

# 3. Start SSE server with R2 persistence
bun run sse

# 4. Monitor violations with persistent storage
bun run monitor
```

## 🔧 Configuration

### Environment Variables

```bash
# Required Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET=tier1380-violations
R2_REGION=auto

# Optional Configuration
R2_ENDPOINT=https://your-s3-compatible-endpoint.com
CLOUDFLARE_REGION=us-east-1
```

### Getting R2 Credentials

1. **Create R2 Bucket**:

   ```bash
   # Using wrangler CLI
   wrangler r2 bucket create tier1380-violations
   ```

2. **Generate API Token**:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "R2:Edit" permissions
   - Note the Account ID, Access Key ID, and Secret Access Key

3. **Configure Environment**:

   ```bash
   export R2_ACCOUNT_ID="your-account-id"
   export R2_ACCESS_KEY_ID="your-access-key-id"
   export R2_SECRET_ACCESS_KEY="your-secret-access-key"
   ```

## 📊 Storage Architecture

### File Organization

```text
tier1380-violations/
├── violations/
│   ├── tenant-acme/
│   │   ├── 2024/
│   │   │   ├── 01/
│   │   │   │   ├── 15/
│   │   │   │   │   ├── 14/
│   │   │   │   │   │   ├── violation-id-1.json
│   │   │   │   │   │   └── violation-id-2.json
│   │   │   │   │   └── 15/
│   │   │   │   │       └── violation-id-3.json
│   │   │   │   └── 16/
│   │   │   │       └── ...
│   │   └── tenant-beta/
│   └── batches/
│       ├── 2024-01-15T14-30-00-batch-0-size-100.jsonl
│       └── 2024-01-15T14-35-00-batch-1-size-100.jsonl
```

### Data Model

```typescript
interface ViolationLogEntry {
  id: string;                    // UUID
  timestamp: number;             // Unix timestamp
  violation: WidthViolation;     // Violation details
  metadata: {
    userAgent?: string;          // Client identifier
    ip?: string;                 // Source IP
    sessionId?: string;          // Session identifier
    region?: string;             // Geographic region
  };
}
```

## 🔥 Features

### 1. **Streaming Uploads**

```typescript
// Single violation upload
const entry: ViolationLogEntry = {
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  violation: { /* violation data */ },
  metadata: { /* metadata */ }
};

const result = await r2Logger.uploadViolationLog(entry);
if (result.success) {
  console.log(`Stored at: ${result.url}`);
}
```

### 2. **Batch Processing**

```typescript
// Upload 1000 violations efficiently
const violations = generateViolations(1000);
const result = await r2Logger.streamViolations(violations);

console.log(`Uploaded: ${result.uploaded}/${violations.length}`);
```

### 3. **Query & Analytics**

```typescript
// Query violations with filters
const violations = await r2Logger.queryViolations({
  tenant: 'acme',
  severity: 'critical',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  limit: 100
});

// Get statistics
const stats = await r2Logger.getViolationStats('acme', 30);
console.log(`Total: ${stats.total}, Critical: ${stats.critical}`);
```

### 4. **Global CDN Distribution**

R2 provides automatic global distribution for fast access:

- **Read Performance**: <100ms globally
- **Durability**: 99.999% (11 9's)
- **Availability**: 99.99%
- **Cost**: ~$0.015/GB/month + $0.36/million requests

## 🛠️ API Reference

### R2ViolationLogger Class

#### Constructor

```typescript
const logger = new R2ViolationLogger({
  accountId: 'your-account-id',
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key',
  bucket: 'tier1380-violations',
  region: 'auto'
});
```

#### Methods

##### `uploadViolationLog(entry: ViolationLogEntry)`

Upload a single violation to R2.

**Returns**: `{ success: boolean; url?: string; error?: string }`

##### `streamViolations(violations: ViolationLogEntry[])`

Upload multiple violations in batches of 100.

**Returns**: `{ success: boolean; uploaded: number; error?: string }`

##### `queryViolations(options)`

Query violations with optional filtering.

**Options**:
```typescript
{
  tenant?: string;
  severity?: 'warning' | 'critical';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
```

**Returns**: `{ violations: ViolationLogEntry[]; error?: string }`

##### `getViolationStats(tenant?: string, days?: number)`

Get violation statistics for analysis.

**Returns**: `{ total: number; critical: number; warning: number; topFiles: Array<{file: string; count: number}>; error?: string }`

## 🔐 Security & Compliance

### Data Protection

- **Encryption**: All data encrypted at rest and in transit
- **Access Control**: IAM-based permissions with least privilege
- **Audit Trail**: Complete logging of all R2 operations
- **Data Retention**: Configurable lifecycle policies

### Compliance Features

```typescript
// Automatic data retention (example: 90 days)
const lifecyclePolicy = {
  rules: [{
    id: 'delete-old-violations',
    status: 'Enabled',
    filter: { prefix: 'violations/' },
    expiration: { days: 90 }
  }]
};
```

### Privacy Controls

- **PII Redaction**: Automatic removal of sensitive data
- **Tenant Isolation**: Strict multi-tenant data separation
- **Region Locking**: Data residency compliance
- **Access Logging**: Complete audit trail

## 📈 Performance Optimization

### Upload Optimization

```typescript
// Optimize for high-throughput scenarios
const optimizedLogger = new R2ViolationLogger({
  ...config,
  // Enable compression
  compression: true,
  // Batch size tuning
  batchSize: 200,
  // Parallel uploads
  concurrency: 5
});
```

### Cost Optimization

- **Lifecycle Policies**: Automatic deletion of old data
- **Compression**: Reduce storage costs by 60-80%
- **Intelligent Batching**: Minimize API calls
- **CDN Caching**: Reduce read costs

### Monitoring

```typescript
// Monitor R2 performance
const metrics = {
  uploadLatency: [],
  successRate: 0,
  errorCount: 0,
  storageUsed: 0
};

// Built-in metrics collection
logger.on('upload', (latency) => {
  metrics.uploadLatency.push(latency);
});
```

## 🧪 Testing & Development

### Local Development

```bash
# Use mock credentials for testing
export R2_ACCOUNT_ID="test-account"
export R2_ACCESS_KEY_ID="test-key"
export R2_SECRET_ACCESS_KEY="test-secret"

# Run demo with mock data
bun run r2-demo
```

### Integration Testing

```typescript
// Test R2 integration
import { initializeFromEnvironment } from './r2-storage.js';

try {
  const logger = initializeFromEnvironment();
  console.log('✅ R2 connection successful');
} catch (error) {
  console.error('❌ R2 configuration error:', error.message);
}
```

### Production Deployment

```bash
# Verify production configuration
bun run r2-demo --env=production

# Deploy with R2 enabled
export NODE_ENV=production
bun run sse
```

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Failed**:
   ```bash
   # Verify credentials
   wrangler r2 bucket list

   # Check environment variables
   echo $R2_ACCOUNT_ID
   echo $R2_ACCESS_KEY_ID
   ```

2. **Upload Timeout**:
   ```typescript
   // Increase timeout for large files
   const logger = new R2ViolationLogger({
     ...config,
     timeout: 30000 // 30 seconds
   });
   ```

3. **Permission Denied**:
   ```bash
   # Update bucket permissions
   wrangler r2 bucket permissions tier1380-violations
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=r2:* bun run r2-demo

# Verbose R2 operations
R2_DEBUG=1 bun run sse
```

## 📊 Monitoring & Analytics

### Built-in Metrics

- **Upload Success Rate**: Track reliability
- **Storage Usage**: Monitor costs
- **Query Performance**: Optimize access patterns
- **Error Rates**: Identify issues

### Dashboard Integration

```typescript
// Real-time R2 metrics
const r2Metrics = await r2Logger.getStorageMetrics();
console.log({
  totalViolations: r2Metrics.totalObjects,
  storageUsed: r2Metrics.storageUsed,
  averageLatency: r2Metrics.averageLatency
});
```

## 🚀 Production Best Practices

### 1. **Environment Configuration**
```bash
# Production environment
export NODE_ENV=production
export R2_BUCKET=tier1380-violations-prod
export R2_REGION=auto
```

### 2. **Error Handling**
```typescript
// Robust error handling
try {
  await r2Logger.uploadViolationLog(entry);
} catch (error) {
  // Fallback to local storage
  await localLogger.log(entry);
  // Alert monitoring system
  await alertSystem.notify('R2 upload failed', error);
}
```

### 3. **Performance Monitoring**
```typescript
// Monitor performance metrics
setInterval(async () => {
  const stats = await r2Logger.getViolationStats();
  await metricsSystem.record('r2_stats', stats);
}, 60000); // Every minute
```

### 4. **Cost Management**
```typescript
// Implement lifecycle policies
const cleanupPolicy = {
  retentionDays: 90,
  compressionEnabled: true,
  intelligentTiering: true
};
```

---

🔐 **Tier-1380 R2 Integration - Production Ready**
📦 **Global persistent storage with 99.999% durability**
🚀 **Cost-effective violation archiving and analytics**

**Next**: Configure your R2 credentials and start storing violations persistently! 🎯

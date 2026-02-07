# R2 MCP Integration - Cloud Storage for Wiki Generation

## 🎯 Overview

The `r2MCPIntegration` service provides cloud storage capabilities for generated wiki content using Cloudflare R2. It automatically stores wiki generation results in the cloud during the wiki generation flow, providing persistent storage and sharing capabilities.

## 🏗️ Architecture

### Core Components

```typescript
export class R2MCPIntegration {
  private config: R2Config;
  private bucketName: string;
  
  // Main storage method used by wiki generator
  async storeDiagnosis(diagnosis: DiagnosisEntry): Promise<string>
  
  // URL generation for sharing
  async getSignedURL(key: string, expiresIn: number): Promise<string>
  
  // Configuration management
  getConfigStatus(): { configured: boolean; missing: string[]; }
}
```

### Integration Flow

The R2 integration is automatically triggered during wiki generation:

```typescript
// In MCPWikiGenerator.generateWiki()
const result = await generateWikiContent(wikiConfig);

// Store in R2 if available
try {
  const r2Key = `${MCPWikiGenerator.WIKI_R2_PREFIX}wiki-${Date.now()}-${wikiConfig.workspace}`;
  const r2Stored = await r2MCPIntegration.storeDiagnosis({
    id: r2Key,
    timestamp: new Date().toISOString(),
    error: {
      name: 'WikiGeneration',
      message: `Generated ${request.format} wiki for ${wikiConfig.workspace}`,
    },
    fix: JSON.stringify(result, null, 2), // Store the actual wiki result
    relatedAudits: [],
    relatedDocs: [],
    confidence: 1.0,
    context: request.context || 'wiki-generation',
    metadata: {
      wikiGeneration: true,
      format: request.format,
      workspace: wikiConfig.workspace,
      totalUtilities: wikiResult.total,
    },
  });

  result.r2Stored = {
    key: r2Key,
    url: await r2MCPIntegration.getSignedURL(r2Key, 3600),
  };
} catch (r2Error) {
  console.log('⚠️ R2 storage not available, using local only');
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for R2 integration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_wiki_storage_bucket

# Optional
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
```

### Configuration Interface

```typescript
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}
```

## 📦 Storage Structure

### Key Format

```
mcp/wiki/wiki-{timestamp}-{workspace}
```

Example:
```
mcp/wiki/wiki-1707312000000-engineering-bun-utilities
mcp/wiki/wiki-1707312100000-api-documentation
mcp/wiki/wiki-1707312200000-github-wiki
```

### Stored Data Structure

```typescript
interface StoredWikiData {
  id: string;
  timestamp: string;
  error: {
    name: string;        // 'WikiGeneration'
    message: string;     // Description of what was generated
  };
  fix: string;           // JSON string of the actual wiki result
  relatedAudits: string[];
  relatedDocs: string[];
  confidence: number;    // 1.0 for successful generation
  context: string;       // Request context
  metadata: {
    wikiGeneration: boolean;
    format: 'markdown' | 'html' | 'json' | 'all';
    workspace: string;
    totalUtilities: number;
  };
}
```

## 🚀 Usage Examples

### Automatic Storage (Built-in)

```typescript
// R2 storage is automatic during wiki generation
const result = await MCPWikiGenerator.generateWiki({
  format: 'markdown',
  workspace: 'engineering/bun-utilities',
  baseUrl: 'https://docs.company.com',
});

if (result.r2Stored) {
  console.log(`Wiki stored at: ${result.r2Stored.key}`);
  console.log(`Share URL: ${result.r2Stored.url}`);
}
```

### Manual Storage

```typescript
// Direct access to R2 integration
const r2Key = await r2MCPIntegration.storeDiagnosis({
  id: 'custom-wiki-entry',
  timestamp: new Date().toISOString(),
  error: { name: 'CustomWiki', message: 'Custom wiki data' },
  fix: JSON.stringify(customWikiData, null, 2),
  relatedAudits: [],
  relatedDocs: [],
  confidence: 1.0,
  context: 'custom-wiki-generation',
  metadata: { custom: true },
});

const shareUrl = await r2MCPIntegration.getSignedURL(r2Key, 3600);
```

### Configuration Check

```typescript
// Check if R2 is properly configured
const status = r2MCPIntegration.getConfigStatus();
if (status.configured) {
  console.log('✅ R2 integration ready');
} else {
  console.log('❌ R2 configuration incomplete:', status.missing);
}
```

## 📊 Result Integration

### WikiGenerationResult with R2

```typescript
interface WikiGenerationResult {
  success: boolean;
  files: {
    markdown?: string;
    html?: string;
    json?: string;
  };
  metadata: {
    total: number;
    categories: number;
    generated: string;
    baseUrl: string;
    workspace: string;
  };
  r2Stored?: {          // Added by R2 integration
    key: string;         // Storage key in R2
    url: string;         // Signed URL for sharing (1 hour expiry)
  };
  error?: string;
}
```

## 🔍 Monitoring & Debugging

### Storage Status

```typescript
// Check configuration status
const status = r2MCPIntegration.getConfigStatus();
console.log({
  configured: status.configured,
  bucketName: status.bucketName,
  accountId: status.accountId,
  missing: status.missing,
});
```

### Error Handling

The R2 integration gracefully degrades:

```typescript
try {
  // Attempt R2 storage
  const r2Stored = await r2MCPIntegration.storeDiagnosis(data);
  result.r2Stored = { key: r2Key, url: shareUrl };
  console.log('📦 Wiki content stored in R2');
} catch (r2Error) {
  // Fallback to local-only operation
  console.log('⚠️ R2 storage not available, using local only');
  // Wiki generation continues without R2 storage
}
```

## 🌐 Benefits

### For Wiki Generation

1. **Persistent Storage**: Wiki results survive beyond local file system
2. **Easy Sharing**: Generate signed URLs for team access
3. **Backup & Recovery**: Cloud storage for important documentation
4. **Audit Trail**: Timestamped storage with metadata
5. **Cross-Environment Access**: Share wikis across different environments

### For Teams

1. **Collaboration**: Share generated wikis with team members
2. **Version History**: Timestamped storage creates natural versioning
3. **Access Control**: Signed URLs provide controlled access
4. **Integration**: Works seamlessly with existing wiki generation workflow

## 🔧 Testing

### CLI Test Interface

```bash
# Test R2 configuration
bun run lib/mcp/r2-integration.ts
```

### Manual Testing

```typescript
// Test storage functionality
const testData = {
  id: 'test-wiki',
  timestamp: new Date().toISOString(),
  error: { name: 'Test', message: 'Test wiki generation' },
  fix: '{"test": true}',
  relatedAudits: [],
  relatedDocs: [],
  confidence: 1.0,
  context: 'test',
  metadata: {},
};

const key = await r2MCPIntegration.storeDiagnosis(testData);
const url = await r2MCPIntegration.getSignedURL(key, 3600);
console.log(`Test data stored: ${key}`);
console.log(`Access URL: ${url}`);
```

## 📝 Best Practices

1. **Configuration**: Set up R2 credentials in environment variables
2. **Error Handling**: Always check `result.r2Stored` before using URLs
3. **URL Expiration**: Default signed URLs expire in 1 hour
4. **Monitoring**: Use `getConfigStatus()` to verify configuration
5. **Backup**: R2 storage supplements, not replaces, local storage

The R2 MCP integration provides robust cloud storage for wiki generation, enabling persistent storage, sharing, and collaboration capabilities while maintaining graceful fallback when cloud storage is unavailable.

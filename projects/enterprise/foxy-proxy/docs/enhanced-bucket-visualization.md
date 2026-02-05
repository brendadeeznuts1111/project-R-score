# Enhanced Bucket Visualization with BunFile Integration

## Overview

The enhanced bucket visualization system provides comprehensive R2 bucket management with schema support, BunFile integration, and advanced file processing capabilities. This system leverages Bun's native file operations for optimal performance while maintaining full TypeScript type safety.

## Features

### 🔍 Enhanced File Preview

- **Smart Content Detection**: Automatically categorizes files and provides appropriate preview methods
- **Syntax Highlighting**: Code files with language-specific highlighting and metadata
- **Image Analysis**: Dimension extraction, format detection, and color space information
- **Document Processing**: Page count, word count, and format analysis
- **Metadata Extraction**: Comprehensive metadata extraction for various file types

### 🏷️ Schema Support

- **File Classification**: Automatic categorization into image, document, video, audio, archive, code, data, or other
- **Processing Status**: Track file processing stages (pending, processing, completed, failed)
- **Version History**: Maintain version control with checksums and change tracking
- **Access Control**: Public/private settings with user and role permissions
- **Integrity Validation**: SHA-256 checksums for file verification

### ⚡ BunFile Integration

- **Native Performance**: Leverages Bun's native S3Client for optimal R2 operations
- **Streaming Support**: Efficient streaming for large files with AsyncIterable support
- **Lazy Loading**: On-demand content loading to reduce memory usage
- **Enhanced Interface**: Extended BunFile interface with schema metadata
- **Type Safety**: Full TypeScript support with proper type guards

### 📊 Real-time Analytics

- **Storage Statistics**: Live bucket usage and available space monitoring
- **File Distribution**: Type-based file categorization and counting
- **Performance Metrics**: Response times and operation tracking
- **User Activity**: Download counts and access pattern analysis

## Architecture

### Core Components

#### EnhancedBunR2Client

```typescript
export class EnhancedBunR2Client extends R2Client {
  // Enhanced upload with schema processing
  async uploadFileWithSchema(file: File, key?: string, options?: FileProcessingOptions);

  // Create enhanced BunFile wrapper
  async createEnhancedBunFile(key: string): Promise<EnhancedBunFile | null>;

  // Get file schema from metadata
  async getFileSchema(key: string): Promise<FileSchema | null>;

  // Process file with options
  async processFile(key: string, options: FileProcessingOptions): Promise<FileSchema>;
}
```

#### FileSchema Interface

```typescript
export interface FileSchema {
  // Core file information
  id: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;

  // File classification
  category: "image" | "document" | "video" | "audio" | "archive" | "code" | "data" | "other";
  type: string;

  // Metadata analysis
  metadata: {
    dimensions?: { width: number; height: number };
    format?: string;
    language?: string;
    linesOfCode?: number;
    dependencies?: string[];
    // ... more metadata fields
  };

  // Processing information
  processing: {
    status: "pending" | "processing" | "completed" | "failed";
    steps: string[];
    errors?: string[];
  };

  // Access control
  access: {
    isPublic: boolean;
    allowedUsers?: string[];
    allowedRoles?: string[];
  };

  // Version information
  version: {
    current: number;
    history: Array<{
      version: number;
      size: number;
      checksum: string;
      createdAt: string;
    }>;
  };
}
```

#### EnhancedBunFile Interface

```typescript
export interface EnhancedBunFile {
  // Bun native properties
  name: string;
  size: number;
  type: string;
  lastModified: number;
  key: string;
  bucket: string;

  // Enhanced properties
  checksum?: string;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;

  // Bun native methods
  exists(): Promise<boolean>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array> & AsyncIterable<Uint8Array>;
  json<T = any>(): Promise<T>;
  blob(): Promise<Blob>;
}
```

### File Processing Pipeline

1. **Upload Detection**: File uploaded to R2 bucket
2. **Schema Generation**: Automatic schema creation with metadata extraction
3. **Content Analysis**: File type detection and content processing
4. **Metadata Extraction**: Specific analysis based on file category
5. **Validation**: Integrity checks and error handling
6. **Storage**: Schema stored alongside file in R2 metadata

## Usage Examples

### Basic File Upload with Schema

```typescript
import { uploadWithSchema } from "@/utils/r2";

const file = new File(["content"], "example.txt", { type: "text/plain" });

const result = await uploadWithSchema(file, "documents/example.txt", {
  generateChecksum: true,
  extractMetadata: true,
  validateIntegrity: true
});

console.log("Upload URL:", result.result.url);
console.log("File Schema:", result.schema);
console.log("Category:", result.schema.category);
```

### Enhanced File Operations

```typescript
import { getEnhancedBunFile, getFileSchema, processFile } from "@/utils/r2";

// Get enhanced file with schema
const enhancedFile = await getEnhancedBunFile("documents/example.txt");
if (enhancedFile) {
  console.log("File name:", enhancedFile.name);
  console.log("Checksum:", enhancedFile.checksum);

  // Read content with streaming
  const content = await enhancedFile.text();
  console.log("Content:", content);
}

// Get file schema
const schema = await getFileSchema("documents/example.txt");
if (schema) {
  console.log("Category:", schema.category);
  console.log("Processing status:", schema.processing.status);
  console.log("Metadata:", schema.metadata);
}

// Process file with additional options
const processedSchema = await processFile("documents/example.txt", {
  generateChecksum: true,
  extractMetadata: true,
  optimize: true
});
```

### Bucket Visualization Component

```typescript
import { BucketVisualizer } from '@/components/BucketVisualizer';

function MyBucketPage() {
  return (
    <BucketVisualizer
      refreshInterval={30000}
      maxPreviewSize={1024 * 1024} // 1MB
      enableInlinePreview={true}
      showAdvancedInfo={true}
    />
  );
}
```

## Configuration

### Environment Variables

```bash
# R2 Configuration
VITE_R2_ACCOUNT_ID=your-account-id
VITE_R2_ACCESS_KEY_ID=your-access-key
VITE_R2_SECRET_ACCESS_KEY=your-secret-key
VITE_R2_BUCKET_NAME=foxy-proxy-storage
VITE_R2_PUBLIC_URL=https://pub-account-id.r2.dev/bucket-name
```

### File Processing Options

```typescript
interface FileProcessingOptions {
  generateChecksum?: boolean; // Generate SHA-256 checksum
  extractMetadata?: boolean; // Extract file metadata
  compress?: boolean; // Compress file if possible
  optimize?: boolean; // Optimize for web delivery
  thumbnail?: boolean; // Generate thumbnail for images
  validateIntegrity?: boolean; // Validate file integrity
}
```

## File Categories

### Image Files

- **Supported Formats**: JPEG, PNG, WebP, GIF, SVG
- **Extracted Metadata**: Dimensions, format, color space, alpha channel
- **Preview**: Inline image display with metadata overlay

### Document Files

- **Supported Formats**: PDF, DOC, DOCX, TXT, RTF
- **Extracted Metadata**: Page count, word count, format information
- **Preview**: Text content or PDF iframe display

### Code Files

- **Supported Languages**: JavaScript, TypeScript, Python, Java, C++, Go, Rust, and more
- **Extracted Metadata**: Language detection, line count, dependencies
- **Preview**: Syntax-highlighted code with metadata

### Archive Files

- **Supported Formats**: ZIP, RAR, 7Z, TAR, GZ
- **Extracted Metadata**: Archive type and size information
- **Preview**: Archive information display

### Media Files

- **Video**: MP4, WebM, AVI, MOV
- **Audio**: MP3, WAV, OGG, FLAC
- **Extracted Metadata**: Duration, bitrate, format information

## Performance Optimizations

### Streaming Operations

```typescript
// Stream large files efficiently
const enhancedFile = await getEnhancedBunFile("large-video.mp4");
if (enhancedFile) {
  const stream = enhancedFile.stream();

  // Process stream in chunks
  for await (const chunk of stream) {
    // Process chunk
    console.log("Chunk size:", chunk.length);
  }
}
```

### Lazy Loading

```typescript
// Load metadata only when needed
const schema = await getFileSchema("document.pdf");
console.log("File size:", schema.size);

// Load content only when preview requested
const enhancedFile = await getEnhancedBunFile("document.pdf");
if (enhancedFile) {
  const content = await enhancedFile.text();
}
```

### Memory Management

- Automatic cleanup of file handles
- Efficient buffer management for large files
- Streaming to prevent memory overload
- Lazy evaluation of metadata

## Error Handling

### Common Error Types

```typescript
try {
  const result = await uploadWithSchema(file, key, options);
} catch (error) {
  if (error.message.includes("File too large")) {
    // Handle large file error
  } else if (error.message.includes("Invalid format")) {
    // Handle format error
  } else if (error.message.includes("Network error")) {
    // Handle network error
  }
}
```

### Validation Errors

```typescript
// Check processing status
const schema = await getFileSchema(key);
if (schema.processing.status === "failed") {
  console.error("Processing failed:", schema.processing.errors);
}

// Check file integrity
if (schema.processing.status === "completed" && schema.checksum) {
  const isValid = await validateChecksum(key, schema.checksum);
  if (!isValid) {
    console.error("File integrity check failed");
  }
}
```

## Security Considerations

### Access Control

```typescript
// Set access permissions
const schema: FileSchema = {
  // ... other fields
  access: {
    isPublic: false,
    allowedUsers: ["user1@example.com", "user2@example.com"],
    allowedRoles: ["admin", "editor"],
    expiresAt: "2024-12-31T23:59:59Z",
    downloadLimit: 10
  }
};
```

### Data Protection

- Checksums for integrity verification
- Secure file upload with validation
- Access control and permissions
- Audit logging for file operations

## Best Practices

### File Organization

```
bucket/
├── documents/
│   ├── reports/
│   └── contracts/
├── images/
│   ├── photos/
│   └── graphics/
├── code/
│   ├── src/
│   └── dist/
└── media/
    ├── videos/
    └── audio/
```

### Naming Conventions

- Use descriptive names with timestamps
- Include version numbers for updates
- Use consistent file extensions
- Avoid special characters in filenames

### Performance Tips

- Enable compression for text files
- Generate thumbnails for large images
- Use streaming for large file uploads
- Implement caching for frequently accessed files

## Integration Examples

### With IPFoxy Proxy System

```typescript
// Upload proxy configuration with schema
const proxyConfig = new Blob([JSON.stringify(proxyData)], {
  type: "application/json"
});

const result = await uploadWithSchema(proxyConfig, "configs/proxy-config.json", {
  generateChecksum: true,
  extractMetadata: true
});

// Store configuration URL in proxy profile
proxyProfile.configUrl = result.result.url;
proxyProfile.configChecksum = result.schema.checksum;
```

### With DuoPlus Phone System

```typescript
// Upload phone backup with schema
const phoneBackup = new File([backupData], "phone-backup.zip", {
  type: "application/zip"
});

const result = await uploadWithSchema(phoneBackup, "backups/phone-backup.zip", {
  generateChecksum: true,
  compress: true,
  validateIntegrity: true
});

// Link backup to phone profile
phoneProfile.backupUrl = result.result.url;
phoneProfile.backupSize = result.schema.size;
```

## Troubleshooting

### Common Issues

1. **Large File Uploads Failing**
   - Check file size limits
   - Enable chunked upload
   - Verify network connectivity

2. **Preview Not Loading**
   - Check file size limits
   - Verify MIME type support
   - Enable inline preview option

3. **Schema Not Generated**
   - Check processing options
   - Verify file format support
   - Check error logs

4. **Performance Issues**
   - Enable streaming for large files
   - Reduce preview size limits
   - Optimize file organization

### Debug Mode

```typescript
// Enable debug logging
const debugOptions = {
  generateChecksum: true,
  extractMetadata: true,
  validateIntegrity: true,
  debug: true // Enable debug logging
};

const result = await uploadWithSchema(file, key, debugOptions);
console.log("Debug info:", result.debug);
```

## Future Enhancements

### Planned Features

- Advanced image processing (resize, watermark)
- Video transcoding and thumbnail generation
- OCR for document text extraction
- Advanced search with content indexing
- Real-time collaboration features
- Advanced analytics and reporting

### API Extensions

- Webhook support for file events
- GraphQL API for complex queries
- WebSocket for real-time updates
- Batch operations for bulk processing

This enhanced bucket visualization system provides a comprehensive solution for R2 storage management with advanced features, optimal performance, and full TypeScript support.

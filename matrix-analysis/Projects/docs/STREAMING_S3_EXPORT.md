# Streaming SARIF Export to S3

## Overview

Stream SARIF results directly to S3 with gzip compression using `ReadableStream` and `CompressionStream` for efficient memory usage.

## Features

- **Streaming**: Uses `ReadableStream` for memory-efficient processing
- **Compression**: Gzip compression via `CompressionStream`
- **CRC32 Integrity**: Hardware-accelerated checksums
- **S3 Integration**: Direct upload to S3

## Usage

### Basic Streaming Export

```typescript
import { streamSarifToS3 } from "./scanner-s3-export.ts";

// Create issue stream
async function* generateIssues() {
  for (const issue of issues) {
    yield issue;
  }
}

// Stream to S3 with compression
const result = await streamSarifToS3(generateIssues(), {
  bucket: "security-reports",
  region: "us-east-1"
}, {
  key: "scan-123.sarif.jsonl.gz",
  traceId: "trace-123"
});
```

### With Enterprise Scanner

```bash
# Stream SARIF to S3
S3_BUCKET=security-reports bun enterprise-scanner.ts . --format=sarif --stream-s3

# Or use environment variables
S3_BUCKET=security-reports S3_REGION=us-east-1 bun enterprise-scanner.ts . --format=sarif
```

### CLI Options

```bash
# Standard S3 export
bun enterprise-scanner.ts . --s3

# Streamed S3 export with compression
bun enterprise-scanner.ts . --stream-s3

# Compressed export
bun enterprise-scanner.ts . --s3 --compress
```

## Implementation

### ReadableStream with Compression

```typescript
const sarifStream = new ReadableStream({
  async start(controller) {
    // Write SARIF header
    controller.enqueue(JSON.stringify(header).slice(0, -2));
    controller.enqueue(', "results": [\n');
    
    // Stream issues
    for await (const issue of scanStream) {
      if (!first) controller.enqueue(',\n');
      controller.enqueue(JSON.stringify(sarifResult));
    }
    
    // Close structure
    controller.enqueue('\n]}\n]}');
    controller.close();
  }
});

// Compress and upload
const compressedStream = sarifStream.pipeThrough(
  new CompressionStream("gzip")
);

await s3.write("scan.jsonl.gz", compressedStream);
```

## Benefits

1. **Memory Efficient**: Streams data instead of buffering
2. **Fast Compression**: Native browser/Node.js compression
3. **CRC32 Integrity**: Hardware-accelerated checksums
4. **Scalable**: Handles large scan results without OOM

## S3 Metadata

Uploaded files include metadata:
- `x-checksum-crc32`: CRC32 checksum
- `x-checksum-algorithm`: "CRC32"
- `x-content-type`: "application/gzip"
- `x-generated-at`: ISO timestamp

## Example Output

```
📤 Streamed SARIF to S3: s3://security-reports/scan-abc123.sarif.jsonl.gz
   CRC32: 0x1a2b3c4d
   Size: 45678 bytes (compressed)
```

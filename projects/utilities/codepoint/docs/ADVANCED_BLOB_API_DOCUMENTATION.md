# Advanced Blob API Documentation

## Overview

This comprehensive Blob API server demonstrates advanced blob response methods in the Bun runtime. The server provides multiple endpoints showcasing different blob types, use cases, and response patterns.

## Server Features

- **Multiple Blob Types**: Text, SVG, binary, JSON, and file download blobs
- **Advanced Headers**: Content-Type, Content-Disposition, Content-Range, custom headers
- **Range Requests**: Support for byte-range requests on slice demo endpoint
- **Performance Metrics**: Memory usage and blob creation timing
- **CORS Support**: Full CORS headers for cross-origin requests
- **Error Handling**: Comprehensive error responses with proper status codes

## Available Endpoints

### 1. Advanced Documentation Endpoint

```bash
curl http://localhost:3000/api/response-methods/blob/advanced | jq .
```

**Response**: Comprehensive JSON documentation including:

- All blob examples with metadata
- Endpoint descriptions and URLs
- Performance metrics
- Server information

### 2. SVG Image Blob

```bash
curl -I http://localhost:3000/api/response-methods/blob/image
```

**Response**: SVG image blob (603 bytes)

- Content-Type: `image/svg+xml`
- Cache-Control: `public, max-age=3600`
- Custom headers for blob type identification

### 3. File Download Blob

```bash
curl -O http://localhost:3000/api/response-methods/blob/file
```

**Response**: Downloadable text file

- Content-Disposition: `attachment; filename="blob-demo-{timestamp}.txt"`
- Dynamic filename generation
- File content with metadata

### 4. Interactive Slice Demo

```bash
curl -I http://localhost:3000/api/response-methods/blob/slice
```

**Response**: Large text blob (1817+ bytes)

- Support for range requests
- Accept-Ranges: `bytes`
- Custom slice headers

**Range Request Example**:

```bash
curl -H "Range: bytes=0-99" http://localhost:3000/api/response-methods/blob/slice
```

### 5. Basic Blob Demonstration

```bash
curl http://localhost:3000/api/response-methods/blob
```

**Response**: Simple text blob with basic information

- Content-Type: `text/plain`
- API version information
- Timestamp and server details

## Blob Types Demonstrated

### Basic Text Blob

```typescript
const basicBlob = new Blob(["Basic blob content"], { type: 'text/plain' });
```

### SVG Image Blob

```typescript
const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
```

### File Download Blob

```typescript
const fileBlob = new Blob([fileContent], { type: 'text/plain' });
```

### Binary Data Blob

```typescript
const buffer = new ArrayBuffer(256);
const binaryBlob = new Blob([buffer], { type: 'application/octet-stream' });
```

### JSON Data Blob

```typescript
const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
```

## Advanced Features

### Range Request Support

The slice demo endpoint supports HTTP range requests for partial content delivery:

- **Status Code**: 206 (Partial Content)
- **Headers**: Content-Range, Accept-Ranges
- **Usage**: Download specific byte ranges of large blobs

### Custom Headers

Each endpoint includes custom headers for metadata:

- `X-Blob-Type`: Identifies the blob type
- `X-Blob-Size`: Indicates blob size
- `X-API-Version`: API version information
- `X-Response-Time`: Server processing time

### Performance Monitoring

The advanced endpoint provides performance metrics:

- Memory usage statistics
- Blob creation timing
- Total size calculations
- Server uptime information

## Running the Server

### Start the Server

```bash
bun run advanced-blob-server.ts
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Usage Examples

### Testing All Endpoints

```bash
# Advanced documentation
curl http://localhost:3000/api/response-methods/blob/advanced | jq .

# SVG image (headers only)
curl -I http://localhost:3000/api/response-methods/blob/image

# File download
curl -O http://localhost:3000/api/response-methods/blob/file

# Slice demo (headers only)
curl -I http://localhost:3000/api/response-methods/blob/slice

# Basic blob
curl http://localhost:3000/api/response-methods/blob

# Health check
curl http://localhost:3000/health | jq .
```

### Range Request Testing

```bash
# Get first 100 bytes
curl -H "Range: bytes=0-99" http://localhost:3000/api/response-methods/blob/slice

# Get specific range
curl -H "Range: bytes=500-599" http://localhost:3000/api/response-methods/blob/slice

# Get from offset to end
curl -H "Range: bytes=1000-" http://localhost:3000/api/response-methods/blob/slice
```

### Header Inspection

```bash
# Full headers for SVG image
curl -I http://localhost:3000/api/response-methods/blob/image

# File download headers
curl -I http://localhost:3000/api/response-methods/blob/file

# Slice demo headers
curl -I http://localhost:3000/api/response-methods/blob/slice
```

## Response Headers Reference

### Standard Headers

- `Content-Type`: MIME type of the blob
- `Content-Length`: Size of the blob in bytes
- `Content-Disposition`: File download instructions
- `Content-Range`: Range information for partial content
- `Accept-Ranges`: Indicates range request support

### Enhanced Custom Headers

- `X-Blob-Type`: Type identifier for the blob
- `X-Blob-Size`: Size information
- `X-API-Version`: API version
- `X-Response-Time`: Server processing time
- `X-Filename`: Download filename
- `X-Slice-Range`: Slice range information

### CORS Headers

- `Access-Control-Allow-Origin`: `*`
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, Range, X-Requested-With`
- `Access-Control-Expose-Headers`: Custom headers exposure

## Error Handling

The server provides comprehensive error handling:

### 404 Not Found

```json
{
  "error": "Not Found",
  "status": 404
}
```

### 416 Range Not Satisfiable

```json
{
  "error": "Invalid range",
  "status": 416
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Error details",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling for Enhanced Features

### Compression Errors

```json
{
  "error": "Compression failed",
  "message": "Unsupported encoding format",
  "status": 415
}
```

### Transformation Errors

```json
{
  "error": "Transformation failed",
  "message": "Invalid transformation parameters",
  "status": 400
}
```

## Performance Considerations

### Memory Usage

- Blobs are created on-demand for each request
- Memory usage is tracked and reported
- Large blobs are handled efficiently

### Caching

- SVG images include cache headers
- Content can be cached by browsers and CDNs
- ETags can be implemented for conditional requests

### Range Requests

- Efficient partial content delivery
- Supports large file downloads
- Reduces bandwidth usage for partial access

## Integration Examples

### JavaScript Client

```javascript
// Fetch blob data
const response = await fetch('http://localhost:3000/api/response-methods/blob/image');
const blob = await response.blob();

// Create object URL for display
const url = URL.createObjectURL(blob);
const img = document.createElement('img');
img.src = url;
document.body.appendChild(img);
```

### Range Request Client

```javascript
// Download specific range
const response = await fetch('http://localhost:3000/api/response-methods/blob/slice', {
  headers: { 'Range': 'bytes=0-99' }
});

const partialBlob = await response.blob();
console.log(`Received ${partialBlob.size} bytes`);
```

### File Download Client

```javascript
// Trigger file download
const response = await fetch('http://localhost:3000/api/response-methods/blob/file');
const blob = await response.blob();

// Create download link
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'blob-demo.txt';
a.click();
URL.revokeObjectURL(url);
```

## Security Considerations

- CORS is enabled for all origins (configure for production)
- No authentication required (add as needed)
- Content-Type headers are properly set
- File downloads use safe filenames
- Range requests are validated

## Extending the API

### Adding New Blob Types

1. Create blob creation function
2. Add response handler
3. Update routing
4. Document in advanced endpoint

### Adding Authentication

```typescript
// Add auth middleware
if (!isValidAuth(request)) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Adding Database Storage

```typescript
// Store blob metadata
const blobId = await storeBlobMetadata(blob);
return new Response(blob, {
  headers: { 'X-Blob-ID': blobId }
});
```

This comprehensive blob API serves as a foundation for advanced blob handling in Bun applications, demonstrating best practices for content delivery, range requests, and response formatting.

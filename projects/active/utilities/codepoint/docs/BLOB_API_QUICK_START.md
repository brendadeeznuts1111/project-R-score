# Advanced Blob API - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Server

```bash
bun run advanced-blob-server-enhanced.ts
```

### 2. Test the API

```bash
# Run comprehensive test suite
./test-enhanced-blob-api.sh

# Or test individual endpoints
curl http://localhost:3000/api/response-methods/blob/advanced | jq .
curl -I http://localhost:3000/api/response-methods/blob/image
curl -O http://localhost:3000/api/response-methods/blob/file
curl -I http://localhost:3000/api/response-methods/blob/slice
curl http://localhost:3000/api/response-methods/blob
```

## 📋 Available Endpoints

 |  Endpoint  |  Method  |  Description  |  Example  | 
 | ---------- | -------- | ------------- | --------- | 
| `/api/response-methods/blob/advanced` | GET | Comprehensive blob documentation | `curl ... \| jq .` |
| `/api/response-methods/blob/image` | GET | SVG image blob (603 bytes) | `curl -I ...` |
| `/api/response-methods/blob/file` | GET | File download blob | `curl -O ...` |
| `/api/response-methods/blob/slice` | GET | Interactive slice demo (1817 bytes) | `curl -I ...` |
| `/api/response-methods/blob` | GET | Basic blob demonstration | `curl ...` |
| `/health` | GET | Health check and endpoint list | `curl ... \| jq .` |

## 🔪 Range Requests

The slice demo endpoint supports HTTP range requests:

```bash
# Get first 100 bytes
curl -H "Range: bytes=0-99" http://localhost:3000/api/response-methods/blob/slice

# Get specific range
curl -H "Range: bytes=500-599" http://localhost:3000/api/response-methods/blob/slice

# Get from offset to end
curl -H "Range: bytes=1000-" http://localhost:3000/api/response-methods/blob/slice
```

## 📊 Features Demonstrated

- **Multiple Blob Types**: Text, SVG, binary, JSON, file downloads
- **Advanced Headers**: Content-Type, Content-Disposition, Content-Range
- **Range Requests**: Partial content delivery
- **Performance Metrics**: Memory usage and timing
- **CORS Support**: Full cross-origin support
- **Error Handling**: Comprehensive error responses

## 📚 Documentation

- **Full Documentation**: `ADVANCED_BLOB_API_DOCUMENTATION.md`
- **Test Suite**: `./test-enhanced-blob-api.sh`
- **Server Code**: `advanced-blob-server-enhanced.ts`

## 🛠️ Development

The server is built with Bun and demonstrates:

- Advanced blob handling techniques
- HTTP response formatting
- Range request implementation
- Performance monitoring
- Error handling patterns

## 🧪 Testing

Run the complete test suite:

```bash
./test-enhanced-blob-api.sh
```

This will test all endpoints, range requests, error handling, and provide performance metrics.

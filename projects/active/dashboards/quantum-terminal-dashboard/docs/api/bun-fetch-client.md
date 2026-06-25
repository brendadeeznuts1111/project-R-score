# Bun Fetch Client

The Bun Fetch Client is a comprehensive HTTP client that leverages Bun's advanced networking capabilities, providing features like DNS prefetching, connection pooling, streaming, TLS configuration, and S3 protocol support.

## 🚀 Quick Start

```javascript
import { BunFetchClient } from './src/api/bun-fetch-client.js';

const client = new BunFetchClient('https://api.example.com');

// Simple GET request
const response = await client.get('/api/health');
console.log(await response.response.json());
```

## 🏗️ Core Features

### DNS Prefetching
Pre-resolve DNS to reduce connection latency:

```javascript
await client.prefetchDNS('api.example.com');
const stats = client.getDNSCacheStats();
```

### Connection Prewarming
Establish connections before they're needed:

```javascript
await client.preconnect('https://api.example.com');
```

### Timeout Control
Built-in timeout support with AbortSignal:

```javascript
const response = await client.fetchWithTimeout('https://api.example.com', 5000);
```

### Manual Cancellation
Control request lifecycle with AbortController:

```javascript
const { promise, abort } = client.createAbortableFetch('https://api.example.com');
// Cancel after 2 seconds
setTimeout(abort, 2000);
```

## 📡 HTTP Methods

### GET Requests
```javascript
const response = await client.get('/api/users');
const users = await response.response.json();
```

### POST Requests
```javascript
const newUser = await client.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

### PUT and DELETE
```javascript
await client.put('/api/users/123', updatedUser);
await client.delete('/api/users/123');
```

## 🔧 Advanced Bun Features

### Proxy Support
Route requests through proxy servers:

```javascript
const response = await client.fetchWithProxy('https://api.example.com', 'http://proxy.company.com:8080', {
  'Proxy-Authorization': 'Basic ' + btoa('user:pass')
});
```

### Unix Domain Sockets
Connect via Unix sockets for local communication:

```javascript
const response = await client.fetchUnixSocket('/tmp/app.sock', '/api/health');
```

### TLS Configuration
Custom TLS settings for secure connections:

```javascript
const response = await client.fetchWithTLS('https://secure-api.com', {
  key: fs.readFileSync('client-key.pem'),
  cert: fs.readFileSync('client-cert.pem'),
  ca: fs.readFileSync('ca-cert.pem'),
  rejectUnauthorized: true
});
```

### Insecure Connections
Disable TLS validation for development:

```javascript
const response = await client.fetchInsecure('https://self-signed.local');
```

## 🌊 Streaming

### Response Streaming
Process large responses as they arrive:

```javascript
for await (const chunk of client.streamResponse('https://api.example.com/large-dataset')) {
  processChunk(chunk);
}
```

### Reader-based Streaming
Use ReadableStream reader for more control:

```javascript
const { response, chunks } = await client.streamWithReader('https://api.example.com/stream');
```

### Request Streaming
Send large request bodies efficiently:

```javascript
const dataChunks = ['chunk1', 'chunk2', 'chunk3'];
await client.postStream('https://api.example.com/upload', dataChunks);
```

## ☁️ S3 Protocol Support

### S3 File Access
Direct access to S3 buckets:

```javascript
const file = await client.fetchS3('my-bucket', 'path/to/file.txt', {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});
```

### S3 Upload
Upload files directly to S3:

```javascript
await client.uploadS3('my-bucket', 'uploads/file.txt', fileBuffer, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});
```

## 📁 File Protocol Support

### Local File Access
Read local files using file:// protocol:

```javascript
const fileData = await client.fetchFile('/path/to/local/file.json');
const content = await fileData.text();
```

### Data URLs
Handle data URL encoded content:

```javascript
const dataResponse = await client.fetchDataURL('data:text/plain;base64,SGVsbG8gV29ybGQ=');
```

### Blob URLs
Work with blob objects:

```javascript
const blob = new Blob(['Hello World'], { type: 'text/plain' });
const blobResponse = await client.fetchBlobURL(blob);
```

## 🔍 Debugging & Monitoring

### Verbose Logging
Enable detailed request/response logging:

```javascript
client.setVerbose(true);
const response = await client.get('/api/debug');
```

### Curl-style Output
Bun-specific verbose mode with curl-like formatting:

```javascript
const response = await client.fetchCurlVerbose('https://api.example.com');
```

### DNS Cache Statistics
Monitor DNS resolution performance:

```javascript
const stats = client.getDNSCacheStats();
console.log('Cache hits:', stats.hits);
console.log('Cache misses:', stats.misses);
```

## 📥 Response Helpers

Convenient methods for common response types:

```javascript
// JSON responses
const jsonData = await client.getJSON('/api/users');

// Text responses
const textData = await client.getText('/api/document');

// Binary data
const bytes = await client.getBytes('/api/file');

// Blob data
const blob = await client.getBlob('/api/image');

// ArrayBuffer
const buffer = await client.getArrayBuffer('/api/binary');

// FormData
const formData = await client.getFormData('/api/form');
```

## 💾 File Downloads

Download and save files automatically:

```javascript
await client.downloadToFile('https://example.com/file.zip', './downloads/file.zip');
```

## ⚙️ Configuration

### Custom Headers
Set default headers for all requests:

```javascript
client.setDefaultHeaders({
  'Authorization': 'Bearer ' + token,
  'X-API-Key': 'your-api-key'
});
```

### Base URL Management
Change the base URL dynamically:

```javascript
client.setBaseURL('https://production-api.example.com');
```

### Verbose Mode
Enable/disable detailed logging:

```javascript
client.setVerbose(true);
```

## 🧪 Testing Examples

See `examples/tests/test-bun-fetch-api.js` for comprehensive testing examples including:

- Basic HTTP methods
- Streaming operations
- Error handling
- Timeout scenarios
- Proxy configuration
- TLS settings

## 📊 Performance Characteristics

- **Connection Pooling**: Automatic keep-alive connections
- **DNS Caching**: Built-in DNS resolution caching
- **Streaming**: Memory-efficient large file handling
- **Concurrent Requests**: 1000+ simultaneous connections supported
- **Low Latency**: Optimized for high-performance scenarios

## 🔐 Security Considerations

- TLS validation enabled by default
- Configurable certificate validation
- Proxy authentication support
- Environment variable handling for credentials

## 🚀 Production Usage

```javascript
import { BunFetchClient } from './src/api/bun-fetch-client.js';

// Production configuration
const client = new BunFetchClient('https://api.production.com');
client.setDefaultHeaders({
  'Authorization': `Bearer ${process.env.API_TOKEN}`,
  'User-Agent': 'QuantumTerminal/1.0'
});

// Enable verbose logging in development
if (process.env.NODE_ENV === 'development') {
  client.setVerbose(true);
}

export default client;
```

## 📝 API Reference

### Constructor
```javascript
new BunFetchClient(baseURL?: string, options?: ClientOptions)
```

### Methods
- `get(path, options?)` - GET request
- `post(path, body, options?)` - POST request
- `put(path, body, options?)` - PUT request
- `delete(path, options?)` - DELETE request
- `request(url, options)` - Core request method
- `prefetchDNS(hostname)` - DNS prefetching
- `preconnect(url)` - Connection prewarming
- `fetchWithTimeout(url, timeout, options?)` - Timeout-controlled requests
- `createAbortableFetch(url, options?)` - Manual cancellation support
- `streamResponse(url, options?)` - Response streaming
- `fetchS3(bucket, key, options?)` - S3 protocol support
- `downloadToFile(url, path, options?)` - File downloads

See the source code in `src/api/bun-fetch-client.js` for complete method signatures and options.
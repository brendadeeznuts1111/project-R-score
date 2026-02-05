# GeeLark API Integration

Complete documentation for integrating with GeeLark's cloud phone management API.

> **Official Documentation**: For the most up-to-date API reference, see the [official GeeLark API documentation](https://open.geelark.com/api/cloud-phone-request-instructions).

## Overview

GeeLark's API offers comprehensive cloud phone management services programmatically, including:

- **Phone Management**: Creation, startup, shutdown, deletion
- **File Management**: Upload, download, and manage files on devices
- **App Management**: Install, uninstall, and manage applications
- **ADB Commands**: Execute Android Debug Bridge commands
- **Automated Tasks**: Process automated workflows and batch operations

## Prerequisites

Before using the GeeLark API, ensure:

1. ✅ **Account Access**: Your account has API access enabled
2. ✅ **Connection Status**: Verify the API connection is active
3. ✅ **Credentials**: Obtain your credentials from the GeeLark dashboard:
   - **APP ID**: 24-character alphanumeric identifier
   - **API Key**: 32-character alphanumeric key
   - **Bearer Token**: 32-character alphanumeric token (recommended)

## Authentication

GeeLark API supports two authentication methods:

### API Key Authentication

```bash
# Set in environment variables
export GEELARK_API_KEY=your_api_key
export GEELARK_APP_ID=your_app_id
```

### Bearer Token Authentication

```bash
# Generate a Bearer token from your API dashboard
export GEELARK_BEARER_TOKEN=your_bearer_token
```

**Note**: Bearer tokens are preferred for production use as they can be rotated and have expiration times.

## Quick Setup

1. **Create `.env` file** in your project root:
   ```bash
   cp .env.example .env
   ```

2. **Add your credentials** to `.env` (replace with your actual values):
   ```bash
   GEELARK_API_KEY=your_32_character_api_key
   GEELARK_APP_ID=your_24_character_app_id
   GEELARK_BEARER_TOKEN=your_32_character_bearer_token
   GEELARK_BASE_URL=https://openapi.geelark.com
   ```

3. **Verify `.env` is in `.gitignore`** (never commit credentials!)

4. **Test connection**:
   ```bash
   bun run health integrations --service=geelark
   ```

## API Configuration

### Environment Variables

Add to your `.env` file (copy from `.env.example`):

```bash
# GeeLark API Configuration
GEELARK_API_KEY=your_api_key_here
GEELARK_APP_ID=your_app_id_here
GEELARK_BASE_URL=https://openapi.geelark.com
GEELARK_BEARER_TOKEN=your_bearer_token_here  # Optional, preferred over API key
```

**Example credentials format:**
- **API Key**: 32-character alphanumeric string (e.g., `8K4DNZVO5NPIPXU4SOBOCI9NYMFQD4`)
- **APP ID**: 24-character alphanumeric string (e.g., `UNH0RF7UUNDY6WZGAN7Q8NSA`)
- **Bearer Token**: 32-character alphanumeric string (e.g., `BE26AMUOYOPWYBNNQFKIESKPKINL89`)

> ⚠️ **Security Warning**: Never commit your `.env` file to version control. Always use `.env.example` as a template.

### Feature Flag Integration

Enable GeeLark API integration via feature flag:

```bash
# Build with GeeLark API integration
bun run build:prod-standard --features=INTEGRATION_GEELARK_API
```

Or enable at runtime:

```typescript
import { FeatureRegistry } from './src/FeatureRegistry.js';

const registry = new FeatureRegistry();
registry.enable('INTEGRATION_GEELARK_API');
```

## API Request Format

### General Rules

1. **HTTP Method**: All API calls use `POST` method
2. **Content Type**: `application/json` (set in request header)
3. **Request Body**: JSON format
4. **Rate Limits**:
   - 200 requests per minute
   - 24,000 requests per hour
5. **Optional Parameters**: Can be omitted from requests

### Authentication Methods

GeeLark API supports two authentication methods:

#### 1. Token Verification (Recommended)

**Simpler method using Bearer token:**

**Required Headers:**
- `traceId`: Version 4 UUID (unique request ID)
- `Authorization`: `Bearer <your_bearer_token>`
- `Content-Type`: `application/json`

**Example:**
```typescript
const traceId = crypto.randomUUID();
const headers = {
  'Content-Type': 'application/json',
  'traceId': traceId,
  'Authorization': `Bearer ${bearerToken}`,
};
```

#### 2. Key Verification (With Signature)

**More complex method using API key with cryptographic signature:**

**Required Headers:**
- `appId`: Team AppId
- `traceId`: Version 4 UUID (unique request ID)
- `ts`: Timestamp in milliseconds
- `nonce`: Random number (first 6 characters of traceId)
- `sign`: SHA256 signature (see generation below)
- `Content-Type`: `application/json`

**Signature Generation:**
1. Generate `traceId` as UUID v4
2. Set `ts` to current timestamp in milliseconds
3. Set `nonce` to first 6 characters of `traceId`
4. Concatenate: `TeamAppId + traceId + ts + nonce + TeamApiKey`
5. Generate SHA256 hash of the concatenated string
6. Convert to uppercase hexadecimal

**Example:**
```typescript
const traceId = crypto.randomUUID();
const ts = Date.now();
const nonce = traceId.substring(0, 6);
const stringToSign = `${appId}${traceId}${ts}${nonce}${apiKey}`;
const sign = await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(stringToSign)
).then(hash => {
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
});

const headers = {
  'Content-Type': 'application/json',
  'appId': appId,
  'traceId': traceId,
  'ts': ts.toString(),
  'nonce': nonce,
  'sign': sign,
};
```

### Request Structure

```typescript
interface GeelarkApiRequest {
  appId?: string;        // Optional: APP ID (can be set via env var)
  apiKey?: string;       // Optional: API Key (can be set via env var)
  // ... endpoint-specific parameters
}
```

### Example Request (Token Verification)

```typescript
import { randomUUID } from 'crypto';

const traceId = randomUUID();
const response = await fetch('https://openapi.geelark.com/open/v1/phone/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'traceId': traceId,
    'Authorization': `Bearer ${process.env.GEELARK_BEARER_TOKEN}`,
  },
  body: JSON.stringify({
    phoneId: 'phone_123',
    model: 'Samsung Galaxy S21',
    osVersion: 'Android 12',
  }),
});

const result = await response.json();
// Response format: { traceId, code, msg, data }
// code: 0 = success, any other = failure
```

### Example Request (Key Verification)

```typescript
import { randomUUID } from 'crypto';

const traceId = randomUUID();
const ts = Date.now();
const nonce = traceId.substring(0, 6);
const stringToSign = `${appId}${traceId}${ts}${nonce}${apiKey}`;
const sign = await generateSHA256(stringToSign);

const response = await fetch('https://openapi.geelark.com/open/v1/phone/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'appId': appId,
    'traceId': traceId,
    'ts': ts.toString(),
    'nonce': nonce,
    'sign': sign,
  },
  body: JSON.stringify({
    phoneId: 'phone_123',
    model: 'Samsung Galaxy S21',
    osVersion: 'Android 12',
  }),
});
```

## API Endpoints

### Phone Management

#### Create Phone

```typescript
POST /api/v1/phones/create
```

**Request Body:**
```json
{
  "phoneId": "string",
  "model": "string",
  "osVersion": "string"
}
```

#### Start Phone

```typescript
POST /api/v1/phones/start
```

**Request Body:**
```json
{
  "phoneId": "string"
}
```

#### Shutdown Phone

```typescript
POST /api/v1/phones/shutdown
```

**Request Body:**
```json
{
  "phoneId": "string"
}
```

#### Delete Phone

```typescript
POST /api/v1/phones/delete
```

**Request Body:**
```json
{
  "phoneId": "string"
}
```

### File Management

#### Upload File

```typescript
POST /api/v1/files/upload
```

**Request Body:**
```json
{
  "phoneId": "string",
  "filePath": "string",
  "fileContent": "string"  // Base64 encoded
}
```

#### Download File

```typescript
POST /api/v1/files/download
```

**Request Body:**
```json
{
  "phoneId": "string",
  "filePath": "string"
}
```

### App Management

#### Install App

```typescript
POST /api/v1/apps/install
```

**Request Body:**
```json
{
  "phoneId": "string",
  "appPackage": "string",
  "appPath": "string"
}
```

#### Uninstall App

```typescript
POST /api/v1/apps/uninstall
```

**Request Body:**
```json
{
  "phoneId": "string",
  "appPackage": "string"
}
```

### ADB Commands

#### Execute ADB Command

```typescript
POST /api/v1/adb/execute
```

**Request Body:**
```json
{
  "phoneId": "string",
  "command": "string",
  "args": ["string"]  // Optional
}
```

### Automated Tasks

#### Process Task

```typescript
POST /api/v1/tasks/process
```

**Request Body:**
```json
{
  "taskId": "string",
  "phoneIds": ["string"],  // Optional: for batch operations
  "parameters": {}  // Optional: task-specific parameters
}
```

## Integration Example

### Using with Dev HQ

```typescript
import { PhoneManagementSystem } from './src/index.js';

const system = new PhoneManagementSystem({
  features: ['INTEGRATION_GEELARK_API'],
});

// System automatically uses GeeLark API when feature is enabled
await system.start();
```

### Direct API Client

```typescript
class GeelarkApiClient {
  private baseUrl: string;
  private appId?: string;
  private apiKey?: string;
  private bearerToken?: string;

  constructor() {
    this.baseUrl = process.env.GEELARK_BASE_URL || 'https://openapi.geelark.com';
    this.appId = process.env.GEELARK_APP_ID;
    this.apiKey = process.env.GEELARK_API_KEY;
    this.bearerToken = process.env.GEELARK_BEARER_TOKEN;
  }

  private async request(endpoint: string, body: Record<string, any>) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prefer Bearer token over API key
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Include APP ID in request body if provided
    const requestBody = { ...body };
    if (this.appId && !requestBody.appId) {
      requestBody.appId = this.appId;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createPhone(phoneId: string, model: string, osVersion: string) {
    return this.request('/api/v1/phones/create', {
      phoneId,
      model,
      osVersion,
    });
  }

  async startPhone(phoneId: string) {
    return this.request('/api/v1/phones/start', { phoneId });
  }

  async shutdownPhone(phoneId: string) {
    return this.request('/api/v1/phones/shutdown', { phoneId });
  }

  async deletePhone(phoneId: string) {
    return this.request('/api/v1/phones/delete', { phoneId });
  }
}

// Usage
const client = new GeelarkApiClient();
await client.createPhone('phone_123', 'Samsung Galaxy S21', 'Android 12');
```

## Response Format

All API responses follow this structure:

```typescript
interface GeelarkApiResponse {
  traceId: string;    // Unique request ID (echoed from request)
  code: number;       // 0 = success, any other = failure
  msg: string;        // Processing result description
  data?: any;         // Response data (on success) or error details (on failure)
}
```

## Error Handling

### Response Codes

- **`code: 0`** - Success
- **Any other value** - Failure (see error codes below)

### Global Error Codes

| Code | Description |
|------|-------------|
| `40000` | Unknown error, contact customer service |
| `40001` | Failed to read request body |
| `40002` | The traceId in request header cannot be empty |
| `40003` | Signature verification failed |
| `40004` | Request parameter validation failed |
| `40005` | Requested resource does not exist |
| `40006` | Partial success (batch APIs) |
| `40007` | Too many requests (rate limit - lifted next minute) |
| `40008` | Invalid pagination parameters |
| `40009` | Batch processing completely failed |
| `40011` | Only for paid users |
| `40012` | The API has expired, please use the new API |
| `41001` | Balance not enough |
| `47002` | Too many concurrent requests (rate limit - lifted after 2 hours) |

### Error Response Example

```typescript
{
  "traceId": "db6094ab-3797-4186-84d5-b0b58eebad56",
  "code": 40003,
  "msg": "Signature verification failed",
  "data": {
    "reason": "Invalid signature"
  }
}
```

### Example Error Handling

```typescript
try {
  const result = await client.createPhone('phone_123', 'model', 'os');
} catch (error) {
  if (error.message.includes('AUTHENTICATION_FAILED')) {
    console.error('Invalid credentials. Check your API key or Bearer token.');
  } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
    console.error('Rate limit exceeded. Please wait before retrying.');
  } else {
    console.error('API Error:', error);
  }
}
```

## Connection Status

### Check API Connection

```typescript
async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### Health Check Integration

```bash
# Check GeeLark API health
bun run health integrations --service=geelark
```

## Best Practices

1. **Use Bearer Tokens**: Prefer Bearer tokens over API keys for better security
2. **Environment Variables**: Store credentials in environment variables, never in code
3. **Error Handling**: Always handle API errors gracefully
4. **Rate Limiting**: Implement retry logic with exponential backoff
5. **Connection Verification**: Check API connection status before making requests
6. **Feature Flags**: Use feature flags to enable/disable API integration at build time

## Security Notes

- ✅ Never commit API keys or Bearer tokens to version control
- ✅ Rotate Bearer tokens regularly
- ✅ Use HTTPS for all API requests (enforced by GeeLark)
- ✅ Validate all input parameters before sending requests
- ✅ Implement request timeout and retry logic

## Official Documentation

For complete API reference, endpoint details, and the latest updates, refer to:

- **[GeeLark API Request Instructions](https://open.geelark.com/api/cloud-phone-request-instructions)** - Official API documentation

## See Also

- [Server API Documentation](./SERVER_API.md) - Internal server API
- [CLI Reference](./CLI_REFERENCE.md) - Command-line interface
- [Feature Flags](../guides/features/FEATURE_MATRIX.md) - Feature flag system
- [Configuration Guide](../getting-started/SETUP.md) - Setup and configuration


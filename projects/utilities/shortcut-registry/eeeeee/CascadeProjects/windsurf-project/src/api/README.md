# WindSurf Shortcuts API Documentation

Complete API documentation for ShortcutRegistry and WindSurf action endpoints.

## Base URL

All endpoints are served from the config server (default: `http://localhost:3227`).

## ShortcutRegistry API Endpoints

### Shortcuts

#### GET /api/shortcuts
List all registered shortcuts.

**Response:**
```json
[
  {
    "id": "dashboard.refresh",
    "action": "refresh",
    "description": "Refresh dashboard data",
    "category": "general",
    "default": {
      "primary": "Ctrl+R",
      "macOS": "Cmd+R"
    },
    "enabled": true,
    "scope": "global"
  }
]
```

#### GET /api/shortcuts/:id
Get a specific shortcut by ID.

**Response:**
```json
{
  "id": "dashboard.refresh",
  "action": "refresh",
  "description": "Refresh dashboard data",
  ...
}
```

#### POST /api/shortcuts
Register a new shortcut.

**Request Body:**
```json
{
  "id": "custom.action",
  "action": "custom",
  "description": "Custom action",
  "category": "general",
  "default": {
    "primary": "Ctrl+X",
    "macOS": "Cmd+X"
  },
  "enabled": true,
  "scope": "global"
}
```

**Response:**
```json
{
  "success": true,
  "shortcut": { ... }
}
```

#### DELETE /api/shortcuts/:id
Unregister a shortcut.

**Response:**
```json
{
  "success": true
}
```

### Profiles

#### GET /api/profiles
List all shortcut profiles.

**Response:**
```json
[
  {
    "id": "professional",
    "name": "Professional",
    "description": "Default professional profile",
    ...
  }
]
```

#### GET /api/profiles/active
Get the currently active profile.

**Response:**
```json
{
  "id": "professional",
  "name": "Professional",
  ...
}
```

#### POST /api/profiles
Create a new profile.

**Request Body:**
```json
{
  "name": "My Profile",
  "description": "Custom profile",
  "basedOn": "professional"
}
```

**Response:**
```json
{
  "id": "my-profile",
  "name": "My Profile",
  ...
}
```

#### PUT /api/profiles/:id/active
Set a profile as active.

**Response:**
```json
{
  "success": true,
  "profileId": "my-profile"
}
```

### Conflicts

#### GET /api/conflicts
Detect keyboard shortcut conflicts.

**Query Parameters:**
- `profileId` (optional): Profile ID to check conflicts for

**Response:**
```json
[
  {
    "key": "Ctrl+R",
    "actions": ["dashboard.refresh", "file.reload"],
    "severity": "warning"
  }
]
```

### Statistics

#### GET /api/stats/usage
Get usage statistics.

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30)

**Response:**
```json
{
  "totalTriggers": 150,
  "mostUsed": [
    {
      "shortcutId": "dashboard.refresh",
      "count": 45
    }
  ],
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

## WindSurf Action Endpoints

### Dashboard Actions

#### POST /api/actions/dashboard/refresh
Refresh dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "requestCount": 150,
    "activeConnections": 5,
    "memory": {
      "rss": 128,
      "heapUsed": 64,
      "heapTotal": 96
    },
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

#### POST /api/actions/dashboard/export
Export dashboard data.

**Query Parameters:**
- `format` (optional): Export format - `json` (default) or `csv`

**Response:**
- JSON: Returns JSON object
- CSV: Returns CSV text file

**Example (JSON):**
```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-22T12:00:00Z",
  "dashboard": { ... },
  "config": { ... }
}
```

#### GET /api/dashboard/data
Get current dashboard data.

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

#### GET /api/dashboard/metrics
Get dashboard metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "uptime": 3600,
    "requestCount": 150,
    ...
  }
}
```

#### GET /api/dashboard/status
Get dashboard status.

**Response:**
```json
{
  "success": true,
  "status": {
    "status": "operational",
    "uptime": 3600,
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

### Risk Analysis

#### POST /api/actions/risk/analyze
Run risk analysis.

**Request Body (optional):**
```json
{
  "scope": "all",
  "includeHistory": true
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "overallRisk": "medium",
    "kycStats": {
      "pending": 5,
      "verified": 100,
      "highRisk": 3
    },
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

### Admin Actions

#### GET /api/actions/admin/config
Get admin configuration.

**Response:**
```json
{
  "success": true,
  "config": {
    "config": { ... },
    "freezeStatus": false,
    "version": "1.0.0"
  }
}
```

### Financial Actions

#### POST /api/actions/financial/process
Process a financial transaction.

**Request Body:**
```json
{
  "userId": "user-123",
  "amountSettled": 1000000,
  "questId": "quest-456"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "decision": {
      "shouldRoute": true,
      "destination": "green",
      "amountToGreen": 50,
      "amountToLightning": 50
    }
  }
}
```

### Compliance Actions

#### POST /api/actions/compliance/kyc/validate
Validate KYC for a user.

**Request Body:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "user": {
      "userId": "user-123",
      "tier": "verified",
      "riskLevel": "low",
      ...
    },
    "validated": true
  }
}
```

#### POST /api/actions/compliance/fraud/detect
Detect fraud.

**Request Body:**
```json
{
  "userId": "user-123",
  "transactionData": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "detected": false,
    "riskScore": 25,
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

### Pool Actions

#### POST /api/actions/pools/rebalance
Rebalance pools.

**Response:**
```json
{
  "success": true,
  "report": {
    "timestamp": "2024-01-22T12:00:00Z",
    "totalMovements": 5,
    "movements": [ ... ],
    "totalYieldIncrease": 50,
    "riskReduction": 20,
    "executionTimeMs": 150,
    "success": true,
    "errors": []
  }
}
```

### Monitoring Actions

#### POST /api/actions/monitoring/start
Start monitoring system.

**Response:**
```json
{
  "success": true,
  "result": {
    "started": true,
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## CORS

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Usage Examples

### Using the API Client

```typescript
import api from './src/api/shortcuts-api';

// Refresh dashboard
const refreshResult = await api.dashboard.refresh();
if (refreshResult.success) {
  console.log('Dashboard refreshed:', refreshResult.data);
}

// Run risk analysis
const riskResult = await api.risk.analyze();
if (riskResult.success) {
  console.log('Risk analysis:', riskResult.data);
}

// Validate KYC
const kycResult = await api.compliance.validateKYC('user-123');
if (kycResult.success) {
  console.log('KYC validation:', kycResult.data);
}
```

### Using Fetch Directly

```javascript
// Refresh dashboard
const response = await fetch('/api/actions/dashboard/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
console.log('Dashboard refreshed:', data);

// Get all shortcuts
const shortcutsResponse = await fetch('/api/shortcuts');
const shortcuts = await shortcutsResponse.json();
console.log('Shortcuts:', shortcuts);
```

## Authentication

Currently, endpoints do not require authentication. In production, you should add authentication middleware.

## Rate Limiting

No rate limiting is currently implemented. Consider adding rate limiting for production use.

## Nexus API Endpoints

### Dashboard Endpoints

#### GET /api/nexus/dashboard
Get Citadel dashboard matrix.

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "dashboard": "citadel",
    "status": "active",
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

#### POST /api/nexus/dashboard/refresh
Refresh dashboard data.

**Response:**
```json
{
  "success": true,
  "dashboard": { ... }
}
```

#### POST /api/nexus/dashboard/export
Export dashboard data.

**Query Parameters:**
- `format` (optional): Export format - `json` (default) or `csv`

**Response:**
```json
{
  "exported": true,
  "format": "json",
  "data": { ... },
  "timestamp": "2024-01-22T12:00:00Z"
}
```

#### GET /api/nexus/dashboard/device/:deviceId
Get device status.

**Response:**
```json
{
  "success": true,
  "device": {
    "deviceId": "device-123",
    "status": "active",
    "incidents": [ ... ],
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

### Metrics Endpoints

#### GET /api/nexus/metrics/advanced
Get advanced metrics report.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "packageRegistry": { ... },
    "typescript": { ... },
    "security": { ... }
  }
}
```

#### GET /api/nexus/metrics/packages
Get package registry metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "packages": [ ... ],
    "totalDownloads": 1000000,
    "registryHealth": 85
  }
}
```

#### GET /api/nexus/metrics/typescript
Get TypeScript metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "files": 150,
    "linesOfCode": 50000,
    "typeCoverage": 90,
    "strictMode": true
  }
}
```

#### GET /api/nexus/metrics/security
Get security metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "urlPatterns": { ... },
    "dependencies": { ... },
    "codeSecurity": { ... }
  }
}
```

#### GET /api/nexus/metrics/comprehensive
Get comprehensive report.

**Response:**
```json
{
  "success": true,
  "report": {
    "packageRegistry": { ... },
    "typescript": { ... },
    "security": { ... },
    "overall": { ... }
  }
}
```

### Telemetry Endpoints

#### POST /api/nexus/telemetry/start
Start log streaming for device.

**Request Body:**
```json
{
  "deviceId": "device-123",
  "outputPath": "./logs/telemetry.log"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "deviceId": "device-123",
    "streaming": true,
    "outputPath": "./logs/telemetry.log",
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

#### POST /api/nexus/telemetry/stop
Stop log streaming.

**Request Body:**
```json
{
  "deviceId": "device-123"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "deviceId": "device-123",
    "streaming": false,
    "stopped": true
  }
}
```

#### GET /api/nexus/telemetry/status/:deviceId
Get streaming status.

**Response:**
```json
{
  "success": true,
  "status": {
    "deviceId": "device-123",
    "streaming": true,
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

### Vault Endpoints

#### GET /api/nexus/vault/profiles
Get all profiles.

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "device_id": "device-123",
      "gmail": "user@example.com",
      "status": "active",
      ...
    }
  ]
}
```

#### GET /api/nexus/vault/profile/:deviceId
Get specific profile.

**Response:**
```json
{
  "success": true,
  "profile": {
    "device_id": "device-123",
    "gmail": "user@example.com",
    ...
  }
}
```

#### POST /api/nexus/vault/profile
Save/create profile.

**Request Body:**
```json
{
  "device_id": "device-123",
  "gmail": "user@example.com",
  "apple_id": "user@icloud.com",
  ...
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "deviceId": "device-123",
    "saved": true
  }
}
```

#### POST /api/nexus/vault/profile/:deviceId/burn
Burn/archive profile.

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "deviceId": "device-123",
    "burned": true
  }
}
```

#### GET /api/nexus/vault/search
Search profiles.

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "success": true,
  "profiles": [ ... ]
}
```

#### GET /api/nexus/vault/stats
Get vault statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_profiles": 100,
    "active_profiles": 85,
    "burned_profiles": 15,
    "avg_burn_count": 2.5
  }
}
```

#### POST /api/nexus/vault/verify/:deviceId
Verify profile integrity.

**Response:**
```json
{
  "success": true,
  "result": {
    "deviceId": "device-123",
    "verified": true,
    "timestamp": "2024-01-22T12:00:00Z"
  }
}
```

### Profile Factory Endpoints

#### POST /api/nexus/profile/create
Create device identity.

**Request Body:**
```json
{
  "deviceId": "device-123",
  "simData": {
    "iccid": "1234567890",
    "number": "+1234567890",
    "carrier": "default",
    "country": "US"
  },
  "options": {
    "useRandomNames": true,
    "passwordLength": 12
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "profile": {
      "device_id": "device-123",
      "gmail": "user@example.com",
      ...
    }
  }
}
```

#### POST /api/nexus/profile/provision
Provision device.

**Request Body:**
```json
{
  "deviceId": "device-123"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "profile": { ... }
  }
}
```

#### GET /api/nexus/profile/options
Get generation options.

**Response:**
```json
{
  "success": true,
  "options": {
    "useRandomNames": true,
    "passwordLength": 12,
    "includeNumbers": true,
    "proxyRotation": true
  }
}
```

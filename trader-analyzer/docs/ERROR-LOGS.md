# Error Logs Documentation

## Overview

Error logging and monitoring system for NEXUS Trading Platform.

---

## Endpoints

### 1. Error Logs Endpoint

**GET** `/api/logs/errors`

Get recent error logs from log files.

#### Query Parameters

- `limit` (optional, default: 100) - Maximum number of errors to return (1-500)

#### Response

```json
{
  "errors": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "level": "error",
      "message": "Error message here",
      "source": "optional-source"
    }
  ],
  "count": 5,
  "errorRegistry": {
    "total": 50,
    "categories": ["GENERAL", "AUTH", "VALIDATION", "RESOURCE", "EXTERNAL", "RATE_LIMIT", "DATA", "WEBSOCKET"]
  },
  "filter": {
    "level": "error",
    "limit": 100
  }
}
```

### 2. General Logs Endpoint

**GET** `/api/logs`

Get logs with filtering options.

#### Query Parameters

- `level` (optional) - Filter by level: `error`, `warn`, `info`, `debug`
- `source` (optional) - Filter by source
- `search` (optional) - Search in log messages
- `limit` (optional, default: 100) - Maximum number of logs (1-500)
- `file` (optional) - Log file path (default: `data/telegram-logs/telegram-YYYY-MM-DD.jsonl`)

#### Example

```bash
# Get error logs
curl "http://localhost:3000/api/logs?level=error&limit=50"

# Search logs
curl "http://localhost:3000/api/logs?search=telegram&limit=20"
```

### 3. Error Registry Endpoint

**GET** `/api/registry/errors`

Get error code registry with categories and status breakdowns.

#### Response

```json
{
  "registry": "errors",
  "items": [
    {
      "code": "NX-000",
      "status": 500,
      "message": "Internal Server Error",
      "category": "GENERAL",
      "ref": "/docs/errors#nx-000",
      "recoverable": true
    }
  ],
  "total": 50,
  "categories": ["GENERAL", "AUTH", "VALIDATION", ...],
  "byCategory": {
    "GENERAL": 10,
    "AUTH": 5,
    ...
  },
  "byStatus": {
    "4xx": 20,
    "5xx": 30
  }
}
```

### 4. Error Metrics Endpoint

**GET** `/api/metrics/errors`

Get error metrics and statistics.

#### Response

```json
{
  "total": 50,
  "byCategory": {
    "GENERAL": 10,
    "AUTH": 5
  },
  "byStatus": {
    "4xx": 20,
    "5xx": 30
  },
  "recoverable": 25,
  "nonRecoverable": 25,
  "categories": ["GENERAL", "AUTH", ...]
}
```

---

## Dashboard Integration

### Error Logs Tab

The dashboard includes a dedicated **Error Logs** section in the **Logs** tab:

1. **Error Statistics** - Shows:
   - Total errors found
   - Error registry total
   - Number of error categories

2. **Error List** - Displays recent errors with:
   - Timestamp
   - Error level badge
   - Error message
   - Source (if available)

### Auto-Loading

Error logs automatically load when:
- Switching to the Logs tab
- Clicking "Refresh Errors" button
- Auto-refresh is enabled

---

## Log File Locations

The error logs endpoint searches for logs in these locations (in order):

1. `data/telegram-logs/telegram-YYYY-MM-DD.jsonl`
2. `logs/app.log`
3. `data/logs/app.log`
4. `app.log`

---

## Error Registry

### Error Categories

- **GENERAL** - General server errors
- **AUTH** - Authentication/authorization errors
- **VALIDATION** - Input validation errors
- **RESOURCE** - Resource not found/conflict errors
- **EXTERNAL** - External service errors
- **RATE_LIMIT** - Rate limiting errors
- **DATA** - Data processing errors
- **WEBSOCKET** - WebSocket connection errors

### Error Code Format

Errors follow the format: `NX-{CATEGORY}-{NUMBER}`

Examples:
- `NX-000` - General internal server error
- `NX-100` - Authentication required
- `NX-200` - Validation error
- `NX-300` - Resource not found

---

## Usage Examples

### Get Recent Errors

```bash
curl http://localhost:3000/api/logs/errors?limit=10
```

### Get Error Registry

```bash
curl http://localhost:3000/api/registry/errors
```

### Get Error Metrics

```bash
curl http://localhost:3000/api/metrics/errors
```

### Filter Logs by Error Level

```bash
curl "http://localhost:3000/api/logs?level=error&limit=50"
```

---

## Related Documentation

- [Error Registry](./ERROR-REGISTRY.md) - Complete error code reference
- [API Documentation](../src/api/docs.ts) - OpenAPI specification
- [Logs Native Utils](../src/utils/logs-native.ts) - Log viewing utilities

---

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0

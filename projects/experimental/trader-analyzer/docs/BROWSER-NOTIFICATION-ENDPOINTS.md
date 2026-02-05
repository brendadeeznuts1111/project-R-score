# Browser Notification Endpoints with X-Dev-Bypass Header

**Version**: 1.0.0  
**Last Updated**: 2025-01-15

## Overview

Browser notification endpoints allow sending alerts from browser clients (dashboard, admin panels) to Telegram supergroups. The `X-Dev-Bypass` header enables CSRF bypass for localhost development testing.

## X-Dev-Bypass Header

**Purpose**: Bypass CSRF protection in development environment for browser-based alert notifications.

**Usage**:
```typescript
headers: {
  'X-Dev-Bypass': 'true'
}
```

**Conditions**:
- ✅ Works only in development (`NODE_ENV !== "production"`)
- ✅ Works only on localhost (`host` starts with "localhost")
- ✅ Must be set to exactly `"true"` (case-sensitive)

**Implementation**: `src/middleware/csrf.ts:120`

## Browser Notification Endpoints

### POST /api/miniapp/supergroup/send-alert

Send alert notification to Telegram supergroup topic from browser.

**Request Headers**:
```typescript
{
  'Content-Type': 'application/json',
  'X-Dev-Bypass': 'true', // Required for localhost development
  'X-CSRF-Token': '...'   // Alternative: use CSRF token
}
```

**Request Body**:
```typescript
{
  message: string;           // Alert message text
  threadId: number;          // Telegram topic thread ID
  pinMessage?: boolean;      // Whether to pin the message
  alertType?: string;        // Alert type (e.g., 'covert-steam', 'url-anomaly')
  alertData?: {              // Optional alert metadata
    id: string;
    type: string;
    ts: number;
    [key: string]: any;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  messageId?: number;        // Telegram message ID if successful
  error?: string;           // Error message if failed
}
```

**Error Codes**:
- `NX-900` - Alert Notification Failed
- `NX-901` - Invalid Alert Payload
- `NX-403` - CSRF token invalid (if X-Dev-Bypass not used)

**Example**:
```typescript
// Browser JavaScript
const response = await fetch('http://localhost:3001/api/miniapp/supergroup/send-alert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Dev-Bypass': 'true', // Bypass CSRF for localhost
  },
  body: JSON.stringify({
    message: '🚨 Critical alert: Market anomaly detected',
    threadId: 2, // Live Alerts topic
    pinMessage: true,
    alertType: 'covert-steam',
    alertData: {
      id: 'alert-123',
      type: 'covert-steam',
      ts: Date.now(),
    },
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Alert sent! Message ID:', result.messageId);
} else {
  console.error('Failed to send alert:', result.error);
}
```

## Related Endpoints

### GET /api/miniapp/alerts/covert-steam
List covert steam alerts for browser display.

**Headers**: `X-Dev-Bypass: true` (optional, for POST operations)

### POST /api/miniapp/alerts/covert-steam
Create covert steam alert from browser.

**Headers**: `X-Dev-Bypass: true` (required for localhost)

## Error Handling

All browser notification endpoints return standardized error responses:

```json
{
  "error": true,
  "code": "NX-900",
  "status": 500,
  "message": "Alert Notification Failed",
  "category": "EXTERNAL",
  "ref": "/docs/errors#nx-900",
  "recoverable": true
}
```

## Security Notes

⚠️ **Important**: `X-Dev-Bypass` header:
- Only works in development mode
- Only works on localhost
- Should NEVER be used in production
- Production requires proper CSRF token authentication

## Implementation Status

**Current Status**: 
- ✅ X-Dev-Bypass header implemented in CSRF middleware
- ✅ Browser notification endpoints exist (`/api/miniapp/alerts/covert-steam`)
- ⚠️ `/api/miniapp/supergroup/send-alert` endpoint referenced in dashboard but may need implementation

**Next Steps**:
1. Verify `/api/miniapp/supergroup/send-alert` endpoint exists
2. Add endpoint to OpenAPI spec if missing
3. Test browser notification flow with X-Dev-Bypass header

## Related Documentation

- `src/middleware/csrf.ts` - CSRF middleware implementation
- `src/api/covert-steam-alerts.ts` - Covert steam alert endpoints
- `docs/6.1.1.2.2.8.1.1.2.6-Enhanced-MCP-Error-Code-Management-and-Discoverability/MCP-ERROR-CODES.md` - MCP error codes reference
- `dashboard/index.html` - Browser dashboard implementation

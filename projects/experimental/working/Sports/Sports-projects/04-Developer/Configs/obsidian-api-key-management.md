---
title: Obsidian Api Key Management
type: development
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: Configuration
description: Documentation for obsidian-api-key-management
acceptEncoding: ""
acceptLanguage: ""
allCookies: {}
analyticsId: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
canvas: []
config_type: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
feature: ""
feed_integration: false
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags:
  - developer
  - obsidian
  - api
  - secrets
  - monitoring
usage: ""
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# 🔑 Obsidian API Key Management & Usage Tracking

## Overview

Complete guide for managing the Obsidian Local REST API key using Bun secrets and tracking usage across the dashboard system.

## Quick Reference

### Status Dashboard
- **URL**: http://localhost:3009/api-key-status.html
- **Auto-refresh**: Every 5 seconds
- **Port**: 3009

### API Endpoints
- **Status**: `GET /api/obsidian/status`
- **Usage**: `GET /api/obsidian/usage`
- **Clear Log**: `POST /api/obsidian/usage/clear`

### Key Storage
- **Location**: `.env.local` (gitignored)
- **Setup**: `bun scripts/setup-obsidian-secret.ts`
- **Load**: `source .env.local`

## Architecture

### Components

1. **Status Dashboard** (`dashboards/sports/api-key-status.html`)
   - Real-time connection monitoring
   - Usage statistics display
   - Recent request log
   - API key preview (secure)

2. **Status API Server** (`server/api/obsidian-status.ts`)
   - Port 3009
   - Serves dashboard HTML
   - Provides status/usage endpoints
   - Tracks all API requests

3. **Usage Tracking** (integrated in `server/api/obsidian-proxy.ts`)
   - Automatic request logging
   - Response time tracking
   - Error logging
   - Last 1000 entries stored

4. **Secret Management** (`scripts/setup-obsidian-secret.ts`)
   - Creates `.env.local`
   - Stores API key securely
   - Gitignored by default

## Setup

### 1. Initial Configuration

```bash
# Setup Bun secrets
bun scripts/setup-obsidian-secret.ts

# This creates:
# - .env.local (gitignored, contains API key)
# - config/obsidian-secrets.example (template)
```

### 2. Configure Obsidian

1. Open Obsidian
2. Settings → Community Plugins → Local REST API
3. Set API key: `d4e11d4f5e84cfc6c610ba01d659a5822d9e946936769525d5ee1320dce3a97a`
4. Enable plugin

### 3. Load Environment

```bash
# Option 1: Source file
source .env.local

# Option 2: Use with Bun
bun --env-file=.env.local scripts/start-dashboard-full.ts

# Verify
echo $OBSIDIAN_API_KEY
```

### 4. Start Services

```bash
# Start full stack (includes status server)
bun scripts/start-dashboard-full.ts

# Services started:
# - API Proxy: port 3008
# - Status Server: port 3009
# - Dashboard: port 3000
```

## Usage Tracking

### What Gets Tracked

- **Request Timestamp**: When the request was made
- **HTTP Method**: GET, POST, etc.
- **Endpoint**: Full path including query params
- **Status Code**: HTTP response status
- **Response Time**: Milliseconds
- **Errors**: Error messages if any

### Viewing Usage

#### Via Dashboard
```
http://localhost:3009/api-key-status.html
```

#### Via API
```bash
# Get status and usage
curl http://localhost:3009/api/obsidian/status | jq

# Get usage stats only
curl http://localhost:3009/api/obsidian/usage | jq
```

### Usage Statistics

The system tracks:
- **Total Requests**: All API calls
- **Successful**: Status 200-299
- **Failed**: Status 400+ or errors
- **Average Response Time**: Mean of all response times
- **Last Request**: Most recent request timestamp

## API Reference

### Status Endpoint

```http
GET /api/obsidian/status
```

**Response**:
```json
{
  "connected": true,
  "keyConfigured": true,
  "keyPreview": "d4e11d4...dce3a97a",
  "stats": {
    "total": 42,
    "successful": 38,
    "failed": 4,
    "responseTimes": [120, 145, 98, ...],
    "lastRequest": 1734249600000
  },
  "recentLog": [...]
}
```

### Usage Endpoint

```http
GET /api/obsidian/usage
```

**Response**:
```json
{
  "stats": {...},
  "recentLog": [
    {
      "timestamp": 1734249600000,
      "method": "GET",
      "endpoint": "/api/obsidian/notes?path=Notes/Odds",
      "status": 200,
      "responseTime": 145
    }
  ]
}
```

### Clear Usage Log

```http
POST /api/obsidian/usage/clear
```

**Response**:
```json
{
  "success": true,
  "message": "Usage log cleared"
}
```

## Security

### Key Storage

- **Location**: `.env.local` (root directory)
- **Git Status**: Gitignored (never committed)
- **Format**: Plain text environment variable
- **Access**: Read-only for applications

### Key Display

- **Dashboard**: Shows only first 8 + last 8 characters
- **API**: Returns preview only (never full key)
- **Logs**: No key exposure in logs
- **Errors**: No key in error messages

### Best Practices

1. ✅ Never commit `.env.local` to git
2. ✅ Use preview format in logs/dashboards
3. ✅ Rotate keys periodically
4. ✅ Monitor usage for anomalies
5. ✅ Use HTTPS for production (local uses self-signed)

## Troubleshooting

### Key Not Configured

**Symptom**: `keyConfigured: false`

**Solution**:
```bash
# Run setup script
bun scripts/setup-obsidian-secret.ts

# Load environment
source .env.local

# Verify
echo $OBSIDIAN_API_KEY
```

### Connection Failed

**Symptom**: `connected: false`

**Checklist**:
1. ✅ Obsidian is running
2. ✅ Local REST API plugin enabled
3. ✅ API key matches in Obsidian settings
4. ✅ Endpoint accessible: `https://127.0.0.1:27124`

**Test**:
```bash
curl -k \
  -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/vault/"
```

### Unauthorized Error

**Symptom**: `401 Unauthorized`

**Solution**:
1. Verify key in Obsidian: Settings → Local REST API
2. Ensure key matches: `d4e11d4f5e84cfc6c610ba01d659a5822d9e946936769525d5ee1320dce3a97a`
3. Restart Obsidian if needed
4. Check plugin is enabled

## Monitoring

### Real-Time Monitoring

The status dashboard provides:
- Live connection status
- Real-time usage statistics
- Recent request log (last 50)
- Auto-refresh every 5 seconds

### Usage Patterns

Monitor for:
- **High failure rate**: May indicate key issues
- **Slow response times**: Network or Obsidian performance
- **Unusual endpoints**: Security monitoring
- **Error spikes**: System health indicator

### Alerts

Consider setting up alerts for:
- Connection failures > 5 consecutive
- Failure rate > 20%
- Average response time > 1000ms
- Unauthorized errors

## Integration

### With Dashboard

The API proxy automatically tracks usage:
- All requests logged
- Statistics updated in real-time
- Errors captured with context

### With Other Services

```typescript
// Import usage tracking
import { logUsage } from "./server/api/obsidian-status.ts";

// Log custom usage
logUsage({
  timestamp: Date.now(),
  method: "GET",
  endpoint: "/custom/endpoint",
  status: 200,
  responseTime: 150
});
```

## Files Reference

### Project Files

- `dashboards/sports/api-key-status.html` - Status dashboard
- `server/api/obsidian-status.ts` - Status API server
- `server/api/obsidian-proxy.ts` - Proxy with usage tracking
- `scripts/setup-obsidian-secret.ts` - Secret setup script
- `.env.local` - API key storage (gitignored)
- `config/obsidian-secrets.example` - Template

### Vault Files

- `Notes/Obsidian-API-Key-Status.md` - User-facing documentation
- `04-Developer/Configs/obsidian-api-key-management.md` - This file

## Related Documentation

- [[Obsidian-API-Key-Status]] - User guide
- [[Dashboard-Configuration]] - Dashboard setup
- [[API-Proxy-Setup]] - Proxy configuration
- [[Obsidian-Dataview-Integration]] - Dataview integration

## Changelog

### 2025-11-14
- ✅ Initial implementation
- ✅ Status dashboard created
- ✅ Usage tracking integrated
- ✅ Bun secrets setup
- ✅ Vault documentation

## Support

For issues or questions:
1. Check status dashboard: http://localhost:3009/api-key-status.html
2. Review usage logs for patterns
3. Verify Obsidian configuration
4. Check this documentation

---

**Last Updated**: 2025-11-14  
**Status**: ✅ Production Ready  
**Version**: 1.0.0


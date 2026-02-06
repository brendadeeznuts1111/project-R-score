---
title: Obsidian Api Key Status
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for Obsidian-API-Key-Status
acceptEncoding: ""
acceptLanguage: ""
allCookies: {}
analyticsId: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
deviceBrand: ""
deviceModel: ""
deviceType: ""
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
isBot: false
isMobile: false
os: ""
osName: ""
osVersion: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags:
  - obsidian
  - api
  - monitoring
  - dashboard
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---

# 🔑 Obsidian API Key Status & Usage Tracker

## Overview

This note tracks the status and usage of the Obsidian Local REST API key used by the dashboard system.

## API Key Configuration

- **Key Preview**: `d4e11d4...dce3a97a` (first 8 + last 8 characters)
- **Storage**: Bun secrets via `.env.local` file
- **Status**: ⚠️ Needs verification in Obsidian settings

## Dashboard Links

- **Status Dashboard**: http://localhost:3009/api-key-status.html
- **Main Dashboard**: http://localhost:3000/obsidian-dataview-dashboard.html
- **API Proxy**: http://localhost:3008/api/obsidian

## Usage Statistics

Track usage statistics via the status dashboard:

- Total Requests
- Successful Requests
- Failed Requests
- Average Response Time
- Last Request Time

## API Endpoints

### Status Endpoint
```text
GET /api/obsidian/status
```

Returns:
- Connection status
- Key configuration status
- Usage statistics
- Recent usage log

### Usage Endpoint
```text
GET /api/obsidian/usage
```

Returns:
- Detailed usage statistics
- Recent request log

### Clear Usage Log
```text
POST /api/obsidian/usage/clear
```

Clears the usage log (requires confirmation).

## Setup Instructions

### 1. Configure API Key in Obsidian

1. Open Obsidian
2. Go to **Settings** → **Community Plugins** → **Local REST API**
3. Verify or set the API key: `d4e11d4f5e84cfc6c610ba01d659a5822d9e946936769525d5ee1320dce3a97a`
4. Ensure the plugin is enabled

### 2. Load Environment Variables

```bash
# Load from .env.local
source .env.local

# Or use with Bun
bun --env-file=.env.local scripts/start-dashboard-full.ts
```

### 3. Start Services

```bash
# Start full stack (includes status server)
bun scripts/start-dashboard-full.ts

# Or start status server separately
bun server/api/obsidian-status.ts
```

## Monitoring

### Check Status

```bash
# Check API key status
curl http://localhost:3009/api/obsidian/status | jq

# Check usage statistics
curl http://localhost:3009/api/obsidian/usage | jq
```

### View Dashboard

Open in browser:
- Status Dashboard: http://localhost:3009/api-key-status.html
- Auto-refreshes every 5 seconds

## Troubleshooting

### "Unauthorized" Error

**Symptom**: API returns `401 Unauthorized`

**Solution**:
1. Verify API key in Obsidian settings matches the configured key
2. Check that Local REST API plugin is enabled
3. Restart Obsidian if needed

### Key Not Found

**Symptom**: `keyConfigured: false`

**Solution**:
1. Run `bun scripts/setup-obsidian-secret.ts`
2. Load environment: `source .env.local`
3. Verify: `echo $OBSIDIAN_API_KEY`

### Connection Failed

**Symptom**: `connected: false`

**Solution**:
1. Ensure Obsidian is running
2. Check Local REST API plugin is enabled
3. Verify API endpoint: `https://127.0.0.1:27124`

## Usage Tracking

The system automatically tracks:

- Request timestamps
- Endpoints accessed
- Response status codes
- Response times
- Errors

View recent usage in the dashboard or via API.

## Security Notes

⚠️ **Important**:
- API key is stored in `.env.local` (gitignored)
- Never commit API keys to version control
- Key preview shows only first/last 8 characters
- Full key is never exposed in logs or responses

## Related Notes

- [[Obsidian-Dataview-Integration]]
- [[Dashboard-Configuration]]
- [[API-Proxy-Setup]]

## Last Updated

- **Date**: 2025-11-14
- **Status**: ⚠️ Key configured, awaiting verification
- **Dashboard**: http://localhost:3009/api-key-status.html


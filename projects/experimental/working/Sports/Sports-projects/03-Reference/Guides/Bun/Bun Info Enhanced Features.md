---
title: Bun info enhanced features
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Info Enhanced Features
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
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
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---
# Bun Info Command - Enhanced Features

**Command**: `bun-platform info`

Complete documentation for all enhanced features including health checks, watch mode, metrics, and more.

---

## 🚀 Basic Usage

### Standard Info
```bash
bun-platform info
```

### JSON Output
```bash
bun-platform info --format json
# or
bun-platform info --json
```

### JSON with jq-style Queries
```bash
# Check vault availability
bun-platform info --format json | jq '.vault.available'

# Get vault path
bun-platform info --format json | jq '.vault.path'

# Get Bun version
bun-platform info --format json | jq '.bun.version'
```

---

## 🏥 Health Check Mode

### Basic Health Check
```bash
bun-platform info --health
```

**Exit Codes**:
- `0` - All checks passed ✅
- `1` - Health check failed ❌

**Use in CI/CD**:
```bash
bun-platform info --health || exit 1
```

### Health Check Output
```
✅ Health check passed
```

Or if failed:
```
❌ Health check failed:
   - Vault not found: /path/to/vault
   - Vault Home.md not found: /path/to/vault/Home.md
```

---

## 📊 Metrics Mode

### Metrics Only (JSON)
```bash
bun-platform info --metrics --format json > metrics.json
```

**Output**:
```json
{
  "timestamp": 1763073880906,
  "bun": {
    "version": "1.3.2",
    "revision": "b131639cc545af23e568feb68e7d5c14c2778b20",
    "uptime": 0.0246925
  },
  "vault": {
    "path": "/Users/nolarose/working/Sports/Sports-projects",
    "exists": true,
    "homeExists": true,
    "lastChecked": 1763073880906
  },
  "system": {
    "memory": {
      "heapUsed": 1994707,
      "heapTotal": 2561024,
      "external": 809027
    }
  }
}
```

### Metrics Compact Format
```bash
bun-platform info --metrics --format compact
```

**Output**:
```
bun=1.3.2 vault=ok home=ok uptime=0.0s memory=1.9MB
```

---

## 🔄 Combined Health + Metrics

### Compact Format
```bash
bun-platform info --health --metrics --format compact
```

**Output**:
```
OK bun=1.3.2 vault=ok home=ok uptime=0.0s memory=1.9MB
```

Or if unhealthy:
```
FAIL bun=1.3.2 vault=missing home=missing uptime=0.0s memory=1.9MB
```

### JSON Format
```bash
bun-platform info --health --metrics --format json
```

**Output**:
```json
{
  "health": {
    "healthy": true,
    "issues": []
  },
  "metrics": {
    "timestamp": 1763073880906,
    "bun": { ... },
    "vault": { ... },
    "system": { ... }
  }
}
```

---

## 👀 Watch Mode (WebSocket)

### Start Watch Mode
```bash
bun-platform info --watch --ws-port 3000
```

**Output**:
```
👀 Starting watch mode on WebSocket port 3000...
   Connect: ws://localhost:3000
   Press Ctrl+C to stop

[WS] Client connected (1 total)
```

### WebSocket Messages

**Welcome Message** (on connect):
```json
{
  "type": "welcome",
  "message": "Connected to bun-platform info watch mode",
  "timestamp": 1763073880906
}
```

**Update Messages** (every 2 seconds):
```json
{
  "type": "update",
  "data": {
    "info": {
      "version": "1.3.2",
      "revision": "...",
      "main": "...",
      "vaultPath": "...",
      "vaultExists": true,
      "vaultHomeExists": true,
      "isBun": true
    },
    "metrics": {
      "timestamp": 1763073880906,
      "bun": { ... },
      "vault": { ... },
      "system": { ... }
    }
  },
  "timestamp": 1763073880906
}
```

**Ping/Pong**:
```json
// Client sends:
{ "type": "ping" }

// Server responds:
{ "type": "pong", "timestamp": 1763073880906 }
```

### Health Endpoint
```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "ok",
  "connections": 1,
  "timestamp": "2025-01-XXT..."
}
```

---

## 🎯 Focus Mode

### Focus on Vault
```bash
bun-platform info --focus vault --format json
```

**Output**:
```json
{
  "vault": {
    "path": "/Users/nolarose/working/Sports/Sports-projects",
    "home": "/Users/nolarose/working/Sports/Sports-projects/Home.md",
    "exists": true,
    "homeExists": true
  }
}
```

### Focus on Bun Runtime
```bash
bun-platform info --focus bun --format json
```

**Output**:
```json
{
  "bun": {
    "version": "1.3.2",
    "revision": "b131639cc545af23e568feb68e7d5c14c2778b20",
    "main": "/path/to/index.ts",
    "isBun": true
  }
}
```

---

## 🐛 Debug Mode

### Interactive Debug Information
```bash
bun-platform info --debug
```

**Output**:
```
🐛 Debug Mode - Interactive Information

📊 Full Information:
{
  "info": { ... },
  "vaultInfo": { ... },
  "health": { ... },
  "metrics": { ... }
}

🔍 Health Check:
   Status: ✅ Healthy
   Issues: (none)

💾 Memory Usage:
   Heap Used: 1.91 MB
   Heap Total: 2.50 MB
   External: 0.79 MB

📄 Home.md Stats:
   Lines: 337
   Size: 12345 bytes
   Frontmatter: ✅ Yes
```

---

## 📋 All Options

| Option | Description | Example |
|--------|-------------|---------|
| `--format <format>` | Output format: json, compact, table | `--format json` |
| `--json` | Alias for `--format json` | `--json` |
| `--vault` | Show detailed vault information | `--vault` |
| `--home` | Show vault Home.md preview | `--home` |
| `--health` | Health check mode (exit code 0/1) | `--health` |
| `--watch` | Watch mode with WebSocket server | `--watch` |
| `--ws-port <port>` | WebSocket port for watch mode | `--ws-port 3000` |
| `--focus <component>` | Focus on component (vault, bun) | `--focus vault` |
| `--debug` | Debug interactive mode | `--debug` |
| `--metrics` | Show metrics only | `--metrics` |

---

## 🎯 Use Cases

### CI/CD Health Check
```bash
#!/bin/bash
bun-platform info --health || exit 1
```

### Monitoring Script
```bash
#!/bin/bash
while true; do
  bun-platform info --metrics --format json >> metrics.log
  sleep 60
done
```

### Live Dashboard
```bash
# Terminal 1: Start watch mode
bun-platform info --watch --ws-port 3000

# Terminal 2: Connect with WebSocket client
# (Use any WebSocket client to connect to ws://localhost:3000)
```

### Quick Status Check
```bash
bun-platform info --format compact
# Output: bun=1.3.2 vault=ok home=ok
```

### Export Metrics
```bash
bun-platform info --metrics --format json > metrics.json
```

---

## ✅ Summary

**All Features**:
- ✅ JSON output with jq-style paths
- ✅ Health check with exit codes
- ✅ Watch mode with WebSocket
- ✅ Focus on specific components
- ✅ Debug interactive mode
- ✅ Metrics collection
- ✅ Compact format for scripts
- ✅ Combined health + metrics

**Status**: ✅ **All features implemented and tested**


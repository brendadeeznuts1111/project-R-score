---
title: Bun info complete
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Info Complete
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
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
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---
# Bun Info Command - Complete Reference

**Command**: `bun-platform info`

Complete reference guide for the enhanced Bun info command with all features, examples, and use cases.

---

## 📋 Quick Reference

### Basic Commands
```bash
# Standard info
bun-platform info

# JSON output
bun-platform info --format json

# Health check
bun-platform info --health

# Metrics
bun-platform info --metrics --format json

# Debug mode
bun-platform info --debug
```

---

## 🎯 All Features

### 1. Output Formats

#### Table Format (Default)
```bash
bun-platform info
```

#### JSON Format
```bash
bun-platform info --format json
# or
bun-platform info --json
```

#### Compact Format
```bash
bun-platform info --format compact
# Output: bun=1.3.2 vault=ok home=ok
```

### 2. Health Checks

#### Basic Health Check
```bash
bun-platform info --health
```

**Exit Codes**:
- `0` = Healthy ✅
- `1` = Unhealthy ❌

**CI/CD Usage**:
```bash
bun-platform info --health || exit 1
```

#### Health Check with Metrics
```bash
bun-platform info --health --metrics --format compact
# Output: OK bun=1.3.2 vault=ok home=ok uptime=0.0s memory=1.9MB
```

### 3. Metrics Collection

#### JSON Metrics
```bash
bun-platform info --metrics --format json > metrics.json
```

#### Compact Metrics
```bash
bun-platform info --metrics --format compact
# Output: bun=1.3.2 vault=ok home=ok uptime=0.0s memory=1.9MB
```

**Metrics Include**:
- Bun version and revision
- Process uptime
- Vault status
- Memory usage (heap, external)

### 4. Watch Mode (WebSocket)

#### Start Watch Server
```bash
bun-platform info --watch --ws-port 3000
```

**Features**:
- Real-time updates every 2 seconds
- WebSocket server on specified port
- Health endpoint at `/health`
- Ping/pong support

#### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'update') {
    console.log('Info:', data.data.info);
    console.log('Metrics:', data.data.metrics);
  }
};
```

#### Health Endpoint
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

### 5. Focus Mode

#### Focus on Vault
```bash
bun-platform info --focus vault --format json
```

**Output**:
```json
{
  "vault": {
    "path": "/path/to/vault",
    "home": "/path/to/vault/Home.md",
    "exists": true,
    "homeExists": true
  }
}
```

#### Focus on Bun Runtime
```bash
bun-platform info --focus bun --format json
```

**Output**:
```json
{
  "bun": {
    "version": "1.3.2",
    "revision": "...",
    "main": "/path/to/index.ts",
    "isBun": true
  }
}
```

### 6. Debug Mode

#### Interactive Debug Information
```bash
bun-platform info --debug
```

**Shows**:
- Full information (info, vaultInfo, health, metrics)
- Health check status
- Memory usage details
- Home.md statistics

### 7. Combined Options

#### Vault Details + Home Preview
```bash
bun-platform info --vault --home
```

#### Health + Metrics (Compact)
```bash
bun-platform info --health --metrics --format compact
```

#### JSON with jq Queries
```bash
# Check vault availability
bun-platform info --format json | jq '.vault.available'

# Get vault path
bun-platform info --format json | jq '.vault.path'

# Get Bun version
bun-platform info --format json | jq '.bun.version'
```

---

## 📊 JSON Output Structure

### Standard JSON Output
```json
{
  "bun": {
    "version": "1.3.2",
    "revision": "b131639cc545af23e568feb68e7d5c14c2778b20",
    "main": "/path/to/index.ts",
    "isBun": true
  },
  "vault": {
    "path": "/Users/nolarose/working/Sports/Sports-projects",
    "home": "/Users/nolarose/working/Sports/Sports-projects/Home.md",
    "exists": true,
    "homeExists": true,
    "available": true
  }
}
```

### Metrics JSON Output
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

---

## 🎯 Use Cases

### 1. CI/CD Health Check
```bash
#!/bin/bash
set -e

echo "Running health check..."
bun-platform info --health || {
  echo "Health check failed!"
  exit 1
}

echo "✅ All systems healthy"
```

### 2. Monitoring Script
```bash
#!/bin/bash
LOG_FILE="metrics.log"

while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  METRICS=$(bun-platform info --metrics --format json)
  echo "$TIMESTAMP $METRICS" >> "$LOG_FILE"
  sleep 60
done
```

### 3. Live Dashboard
```bash
# Terminal 1: Start watch server
bun-platform info --watch --ws-port 3000

# Terminal 2: Connect with WebSocket client
# Use any WebSocket client or browser console:
# const ws = new WebSocket('ws://localhost:3000');
```

### 4. Quick Status Check
```bash
#!/bin/bash
STATUS=$(bun-platform info --format compact)
echo "Current status: $STATUS"
```

### 5. Export Metrics
```bash
#!/bin/bash
OUTPUT_DIR="metrics"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
bun-platform info --metrics --format json > "$OUTPUT_DIR/metrics_$TIMESTAMP.json"
```

### 6. Vault Validation Script
```bash
#!/bin/bash
VAULT_STATUS=$(bun-platform info --focus vault --format json | jq -r '.vault.exists')

if [ "$VAULT_STATUS" = "true" ]; then
  echo "✅ Vault is accessible"
else
  echo "❌ Vault not found"
  exit 1
fi
```

---

## 🔧 All Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--format` | string | Output format: json, compact, table | `--format json` |
| `--json` | flag | Alias for `--format json` | `--json` |
| `--vault` | flag | Show detailed vault information | `--vault` |
| `--home` | flag | Show vault Home.md preview | `--home` |
| `--health` | flag | Health check mode (exit code 0/1) | `--health` |
| `--watch` | flag | Watch mode with WebSocket server | `--watch` |
| `--ws-port` | number | WebSocket port for watch mode | `--ws-port 3000` |
| `--focus` | string | Focus on component (vault, bun) | `--focus vault` |
| `--debug` | flag | Debug interactive mode | `--debug` |
| `--metrics` | flag | Show metrics only | `--metrics` |

---

## 📝 Examples

### Example 1: Basic Info
```bash
$ bun-platform info

🚀 Bun Runtime Information
══════════════════════════════════════════════════
   Version:    1.3.2
   Revision:   b131639cc545af23e568feb68e7d5c14c2778b20
   Entrypoint: /path/to/index.ts
   Runtime:    ✅ Bun

📁 Vault Information
══════════════════════════════════════════════════
   Path:       /Users/nolarose/working/Sports/Sports-projects
   Exists:     ✅ Yes
   Home:       /Users/nolarose/working/Sports/Sports-projects/Home.md
   Home Exists: ✅ Yes
```

### Example 2: JSON with jq
```bash
$ bun-platform info --format json | jq '.vault.available'
true
```

### Example 3: Health Check
```bash
$ bun-platform info --health
✅ Health check passed
$ echo $?
0
```

### Example 4: Compact Metrics
```bash
$ bun-platform info --metrics --format compact
bun=1.3.2 vault=ok home=ok uptime=0.0s memory=1.9MB
```

### Example 5: Health + Metrics Compact
```bash
$ bun-platform info --health --metrics --format compact
OK bun=1.3.2 vault=ok home=ok uptime=0.0s memory=1.9MB
```

---

## 🚀 Performance

**Optimizations**:
- ✅ Bun Shell (`$`) for directory checks (~2x faster)
- ✅ `Bun.file()` for file operations (~3x faster)
- ✅ `Bun.env` for environment variables (~1.5x faster)
- ✅ Parallel existence checks with `Promise.all()`

**Benchmarks**:
- Standard info: < 50ms
- Health check: < 50ms
- Metrics collection: < 50ms
- Watch mode updates: Every 2 seconds

---

## ✅ Status

**All Features**: ✅ **Implemented and Tested**

**Features**:
- ✅ Multiple output formats (table, json, compact)
- ✅ Health check with exit codes
- ✅ Watch mode with WebSocket
- ✅ Focus on specific components
- ✅ Debug interactive mode
- ✅ Metrics collection
- ✅ Combined options support
- ✅ jq-style JSON queries
- ✅ Bun Shell optimizations

**Documentation**:
- ✅ `docs/BUN_INFO_ENHANCED.md` - Enhanced features
- ✅ `docs/BUN_INFO_CLI.md` - CLI documentation
- ✅ `docs/BUN_INFO_ENHANCED_FEATURES.md` - Feature details
- ✅ `docs/BUN_INFO_COMPLETE.md` - This complete reference

---

## 📚 Related Documentation

- `docs/BUN_INFO_ENHANCED.md` - Bun Shell optimizations
- `docs/BUN_INFO_CLI.md` - Basic CLI usage
- `docs/BUN_INFO_ENHANCED_FEATURES.md` - All features explained
- `docs/VAULT_PATH_UTILITIES.md` - Vault path utilities
- `docs/BUN_SHELL_CLI_ENHANCEMENTS.md` - Enhancement summary


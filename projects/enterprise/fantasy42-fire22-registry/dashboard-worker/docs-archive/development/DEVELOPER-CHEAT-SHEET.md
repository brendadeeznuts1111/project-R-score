# 🔥 Fire22 Developer Cheat Sheet

## 🚀 Most Used Variables & Constants

### 🌍 Global Runtime Access

```typescript
// Available anywhere via globalThis
globalThis.VERSION; // "3.0.9"
globalThis.TARGET_PLATFORM; // "windows" | "linux" | "darwin" | "docker"
globalThis.USER_AGENT; // "Fire22-Dashboard/3.0.9 (Linux)"
globalThis.BUILD_TIME; // "2025-08-27T08:31:55.636Z"
globalThis.ENABLE_SIMD_ANSI; // true
globalThis.BUN_RUNTIME_FLAGS; // "--smol --max-http-requests=512"
```

### 🌐 HTTP Headers Template

```typescript
const headers = {
  'User-Agent': globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9',
  'X-Fire22-Platform': globalThis.TARGET_PLATFORM || 'unknown',
  'X-Fire22-Version': '3.0.9',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};
```

### ⚡ Platform-Specific User-Agents

```typescript
'Fire22-Dashboard/3.0.9 (Windows)'; // Windows
'Fire22-Dashboard/3.0.9 (Linux)'; // Linux
'Fire22-Dashboard/3.0.9 (macOS)'; // macOS
'Fire22-Dashboard/3.0.9 (Docker)'; // Docker
```

### 🔧 Runtime Flags by Platform

```bash
# Windows
--smol --max-http-requests=256

# Linux
--smol --max-http-requests=512

# macOS
--smol --max-http-requests=256

# Docker
--smol --max-http-requests=1024 --inspect=0.0.0.0:9229
```

## 🌍 Environment Variables Quick List

### 🔴 Required

```bash
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_password
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=token...
CRON_SECRET=cron_secret
```

### 🟡 Optional

```bash
FIRE22_API_URL=https://api.fire22.com
DATABASE_URL=postgresql://...
BOT_TOKEN=telegram_bot_token
NODE_ENV=production
PORT=3000
```

## 🚀 Common Code Patterns

### Environment Variable Access

````typescript
```javascript
import { getEnvVar, getEnvVarOptional } from './env';
````text

const jwtSecret = getEnvVar('JWT_SECRET'); // Required const apiUrl =
getEnvVarOptional('FIRE22_API_URL', // Optional with default
'https://api.fire22.com');

````

### SIMD Logger Usage
```typescript
```javascript
import { logger } from './simd-logger';
````text

logger.info('🚀 API Client starting', { version: globalThis.VERSION });
logger.logHttpRequest('GET', '/api/users', 200, 150);
logger.logPerformanceMetrics('database_query', 25, { rows: 100 });

````

### HTTP Client with Custom Headers
```typescript
const startTime = performance.now();

const response = await fetch(url, {
  headers: {
    'User-Agent': globalThis.USER_AGENT,
    'X-Fire22-Platform': globalThis.TARGET_PLATFORM,
    'X-Fire22-Version': '3.0.9',
    'Authorization': `Bearer ${token}`
  }
});

const duration = performance.now() - startTime;
logger.logHttpRequest('GET', url, response.status, duration);
````

## 🏗️ Build Commands

### Development

```bash
bun run dev                           # Start development mode
bun scripts/enhanced-executable-builder.ts   # Build all executables
```

### Platform-Specific Builds

```bash
# Windows executable with metadata
# Linux musl static binary
# macOS ARM64 native binary
# Docker optimized with debug port
```

## 📂 Key File Locations

```text
workspaces/@fire22-api-client/
├── src/
│   ├── index.ts              # Main entry point
│   ├── simd-logger.ts        # SIMD-accelerated logger
│   └── env.ts                # Environment utilities
└── package.json              # Workspace configuration

dist/executables/
├── api-client/
│   ├── windows/fire22-api-client.exe
│   ├── linux/fire22-api-client
│   ├── macos/fire22-api-client
│   └── docker/fire22-api-client
├── fire22-dashboard.sh       # Unix launcher
└── fire22-dashboard.bat      # Windows launcher
```

## 🐛 Debug & Testing

### Test Executable

```bash
# Test Linux executable
./dist/executables/api-client/linux/fire22-api-client

# Expected output:
# ℹ️ [timestamp] [INFO] [platform] 🚀 Fire22 API Client starting...
```

### Check Build Constants

```typescript
console.log('Build Info:', {
  version: globalThis.VERSION,
  platform: globalThis.TARGET_PLATFORM,
  userAgent: globalThis.USER_AGENT,
  buildTime: globalThis.BUILD_TIME,
  simdEnabled: globalThis.ENABLE_SIMD_ANSI,
});
```

## 🔍 Troubleshooting

### Missing Environment Variables

```bash
# Error: Required environment variable JWT_SECRET is not set
export JWT_SECRET=your_secret_here
```

### SIMD Not Working

```typescript
// Check if SIMD is available
if (typeof Bun !== 'undefined' && Bun.stripANSI) {
  console.log('✅ SIMD ANSI stripping available');
} else {
  console.log('⚠️ SIMD not available, using fallback');
}
```

### Platform Detection

```typescript
const platform = globalThis.TARGET_PLATFORM || process.platform;
console.log(`Running on: ${platform}`);
```

---

**📋 Quick Reference**: Use this cheat sheet for the most common variables and
patterns in Fire22 development.

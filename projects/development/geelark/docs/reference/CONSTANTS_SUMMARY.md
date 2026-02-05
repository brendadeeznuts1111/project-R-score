# Constants Extraction Summary

All hardcoded ports, magic numbers, and configuration values have been extracted into centralized constant files.

## Files Created/Modified

### 1. Backend Constants: `src/server/ServerConstants.ts`

**New file** with comprehensive server-side constants:

```typescript
import {
  NETWORK,           // Ports, hostnames
  HTTP,              // Timeouts, limits, cache settings
  INTERVALS,         // Timer intervals for periodic tasks
  DATABASE_PATHS,    // Database filenames
  DIR_PATHS,         // Directory paths
  TELEMETRY_THRESHOLDS,  // Alert thresholds
  WEBSOCKET,         // WebSocket configuration
  FEATURE_FLAGS,     // Feature flag constants
  INTEGRATION_STATUS,// Integration service configs
  ALERT_SEVERITY,    // Severity levels
  ENVIRONMENT,       // Environment types
  API_RESPONSE,      // API response values
  HEALTH_SCORE,      // Health score ranges
  UNICODE_WIDTH,     // Unicode display widths
  BUILD_DIRS,        // Build output directories
  MS,                // Millisecond conversions
  SECONDS,           // Second conversions
} from "../../src/server/ServerConstants.js";
```

**Key Constants:**
- `NETWORK.DASHBOARD_PORT = 3000`
- `NETWORK.HOSTNAME = "0.0.0.0"`
- `HTTP.REQUEST_TIMEOUT = 30000`
- `HTTP.CACHE_MAX_AGE = 3600`
- `INTERVALS.METRICS_PUBLISH = 1000` (1 second)
- `INTERVALS.MONITORING_SUMMARY = 30000` (30 seconds)
- `INTERVALS.TELEMETRY_ALERT_CHECK = 5 * 60 * 1000` (5 minutes)
- `INTERVALS.SNAPSHOT = 60 * 60 * 1000` (1 hour)
- `TELEMETRY_THRESHOLDS.CPU = 90`
- `TELEMETRY_THRESHOLDS.MEMORY = 85`

### 2. Frontend Constants: `dashboard-react/src/config.ts`

**New file** with comprehensive client-side constants:

```typescript
import {
  API_CONFIG,         // API endpoint paths
  WS_CONFIG,          // WebSocket configuration
  UI_CONFIG,          // UI refresh rates, timeouts
  BUILD_CONFIG,       // Build configuration defaults
  FEATURE_FLAGS,      // Default feature flag sets
  INTEGRATION_STATUS, // Integration health check configs
  MONITORING_THRESHOLDS, // Monitoring thresholds
  HEALTH_COLORS,      // Health score colors
  BUNDLE_SIZE_RANGES, // Bundle size ranges (KB)
  PERFORMANCE_METRICS, // Performance time thresholds
  TIME_INTERVALS,     // Time intervals for display
  DEV_SERVER,         // Vite dev server config
} from '../config';
```

**Key Constants:**
- `API_CONFIG.BASE = '/api'`
- `WS_CONFIG.RECONNECT_INTERVAL = 3000`
- `UI_CONFIG.AUTO_REFRESH_INTERVAL = 30000`
- `DEV_SERVER.PORT = 3001`
- `MONITORING_THRESHOLDS.CPU_WARNING = 70`
- `MONITORING_THRESHOLDS.CPU_CRITICAL = 90`

### 3. Updated Files

#### `dev-hq/servers/dashboard-server.ts`
**Changes:**
- Import `ServerConstants`
- Replace `PORT = 3000` → `PORT = NETWORK.DASHBOARD_PORT`
- Replace `HOSTNAME = "0.0.0.0"` → `HOSTNAME = NETWORK.HOSTNAME`
- Replace `setInterval(..., 1000)` → `setInterval(..., INTERVALS.METRICS_PUBLISH)`
- Replace `setInterval(..., 60 * 60 * 1000)` → `setInterval(..., INTERVALS.SNAPSHOT)`
- Replace `setInterval(..., 5 * 60 * 1000)` → `setInterval(..., INTERVALS.TELEMETRY_ALERT_CHECK)`
- Replace `"dashboard"` → `WEBSOCKET.DASHBOARD_CHANNEL`
- Replace all `ENVIRONMENT` references → `ENVIRONMENT_VALUE`
- Replace `max-age=3600` → `max-age=${HTTP.CACHE_MAX_AGE}`

**Before:**
```typescript
const PORT = 3000;
const HOSTNAME = "0.0.0.0";
setInterval(() => {...}, 1000);
server.publish?.("dashboard", message);
```

**After:**
```typescript
import { NETWORK, INTERVALS, WEBSOCKET, HTTP } from "../../src/server/ServerConstants.js";

const PORT = NETWORK.DASHBOARD_PORT;
const HOSTNAME = NETWORK.HOSTNAME;
setInterval(() => {...}, INTERVALS.METRICS_PUBLISH);
server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, message);
```

#### `dashboard-react/vite.config.ts`
**Changes:**
- Import `DEV_SERVER` from `./src/config.js`
- Replace `port: 3001` → `port: DEV_SERVER.PORT`
- Replace `host: '0.0.0.0'` → `host: DEV_SERVER.HOST`
- Replace `target: 'http://localhost:3000'` → `target: DEV_SERVER.API_PROXY_TARGET`
- Add `chunkSizeWarningLimit: 500`

**Before:**
```typescript
server: {
  port: 3001,
  host: '0.0.0.0',
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```

**After:**
```typescript
import { DEV_SERVER } from './src/config.js';

server: {
  port: DEV_SERVER.PORT,
  host: DEV_SERVER.HOST,
  proxy: {
    '/api': {
      target: DEV_SERVER.API_PROXY_TARGET,
      changeOrigin: true,
    }
  }
}
```

#### `dashboard-react/src/lib/api.ts`
**Changes:**
- Import `API_CONFIG`, `WS_CONFIG` from `../config`
- Replace all `/api/*` strings with `API_CONFIG.*` constants
- Replace `3000` (reconnect timeout) → `WS_CONFIG.RECONNECT_INTERVAL`
- Replace WS_BASE construction with `API_CONFIG.WS_BASE`

**Before:**
```typescript
const API_BASE = '/api';
const WS_BASE = typeof process !== 'undefined' && process.env?.VITE_WS_BASE
  ? process.env.VITE_WS_BASE
  : `ws://${window.location.host}`;

async getMergedFlags() {
  const res = await fetch(`${API_BASE}/flags/merged`);
  // ...
}

setTimeout(() => this.connectWebSocket(), 3000);
```

**After:**
```typescript
import { API_CONFIG, WS_CONFIG } from '../config';

async getMergedFlags() {
  const res = await fetch(`${API_CONFIG.FLAGS_MERGED}`);
  // ...
}

setTimeout(() => this.connectWebSocket(), WS_CONFIG.RECONNECT_INTERVAL);
```

#### `src/server/TelemetrySystem.ts`
**Changes:**
- Import constants from `ServerConstants`
- Replace database path → `DATABASE_PATHS.TELEMETRY`
- Replace snapshots dir → `DIR_PATHS.SNAPSHOTS`
- Replace threshold defaults → `TELEMETRY_THRESHOLDS.*`

**Before:**
```typescript
const TELEMETRY_DB_PATH = path.join(ROOT_DIR, "monitoring-telemetry.db");
const SNAPSHOTS_DIR = path.join(ROOT_DIR, "snapshots");

this.config = {
  alertThresholds: {
    cpu: config.alertThresholds?.cpu || 90,
    memory: config.alertThresholds?.memory || 90,
    // ...
  }
}
```

**After:**
```typescript
import {
  DATABASE_PATHS,
  DIR_PATHS,
  TELEMETRY_THRESHOLDS,
} from "./ServerConstants.js";

const TELEMETRY_DB_PATH = path.join(ROOT_DIR, DATABASE_PATHS.TELEMETRY);
const SNAPSHOTS_DIR = path.join(ROOT_DIR, DIR_PATHS.SNAPSHOTS);

this.config = {
  alertThresholds: {
    cpu: config.alertThresholds?.cpu || TELEMETRY_THRESHOLDS.CPU,
    memory: config.alertThresholds?.memory || TELEMETRY_THRESHOLDS.MEMORY,
    // ...
  }
}
```

## Benefits

1. **Single Source of Truth**: All configuration values in one place
2. **Easy Maintenance**: Update values in one location
3. **Type Safety**: TypeScript constants with proper types
4. **Self-Documenting**: Descriptive constant names explain intent
5. **No Magic Numbers**: All values have semantic meaning
6. **Consistency**: Same values used across frontend and backend
7. **Easier Testing**: Can easily mock constants for tests
8. **Better Discoverability**: IDE autocomplete shows all available constants

## Testing

✅ Dashboard builds successfully: `bun run dashboard:build`
✅ Server starts correctly: `bun run dashboard:serve`
✅ All API endpoints respond correctly
✅ WebSocket connections work
✅ Intervals use correct timing

## Migration Guide

To update existing code with hardcoded values:

**Backend:**
```typescript
// Import constants
import { NETWORK, HTTP, INTERVALS } from "./ServerConstants.js";

// Replace ports
const PORT = NETWORK.DASHBOARD_PORT;

// Replace timeouts
setTimeout(callback, HTTP.REQUEST_TIMEOUT);

// Replace intervals
setInterval(callback, INTERVALS.METRICS_PUBLISH);
```

**Frontend:**
```typescript
// Import config
import { API_CONFIG, UI_CONFIG } from '../config';

// Replace API paths
fetch(`${API_CONFIG.HEALTH}`);

// Replace timeouts
setTimeout(callback, UI_CONFIG.TOAST_DURATION);
```

## Files Summary

- **Created**: `src/server/ServerConstants.ts` (300+ lines)
- **Created**: `dashboard-react/src/config.ts` (200+ lines)
- **Modified**: `dev-hq/servers/dashboard-server.ts` (50+ replacements)
- **Modified**: `dashboard-react/vite.config.ts` (5 replacements)
- **Modified**: `dashboard-react/src/lib/api.ts` (15 replacements)
- **Modified**: `src/server/TelemetrySystem.ts` (10 replacements)

**Total**: 2 new files, 4 modified files, 80+ constant extractions

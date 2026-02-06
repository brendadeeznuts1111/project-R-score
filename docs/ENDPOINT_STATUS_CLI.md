# 🎯 Endpoint Status CLI

HSL Color-Integrated Endpoint Health Monitoring

## Overview

The Endpoint Status CLI provides comprehensive endpoint health monitoring with advanced HSL (Hue, Saturation, Lightness) color coding. Each endpoint status is displayed with perceptually uniform colors that indicate severity levels.

## Features

- ✅ **HSL Color Coding**: Dynamic colors based on status and severity
- 🔍 **Endpoint Monitoring**: Check single or multiple endpoints
- 👁️ **Watch Mode**: Continuous monitoring with configurable intervals
- 📊 **Status Matrix**: Visual matrix of all status/severity combinations
- 🎨 **Theme Support**: Dark and light context modes
- 📱 **JSON Output**: Machine-readable output for automation

## Usage

### Check All Default Endpoints

```bash
bun run status:check
```

### Check Single Endpoint

```bash
bun run status:check http://localhost:3000/health
```

### Watch Mode (Continuous Monitoring)

```bash
bun run status:watch
bun run status:watch --interval 10000  # 10 second interval
```

### Display Status Matrix

```bash
bun run status:matrix
bun run status:matrix --light  # Light theme
```

### JSON Output

```bash
bun run status:check --json
bun run status:check http://localhost:3000/health --json
```

## HSL Color System

### Status Colors

| Status | Low Severity | Medium Severity | High Severity | Critical Severity |
|--------|--------------|-----------------|---------------|-------------------|
| **Success** | `hsl(140, 70%, 50%)` | `hsl(140, 75%, 45%)` | `hsl(140, 80%, 40%)` | `hsl(140, 85%, 35%)` |
| **Warning** | `hsl(45, 70%, 55%)` | `hsl(45, 80%, 50%)` | `hsl(45, 90%, 45%)` | `hsl(45, 100%, 40%)` |
| **Error** | `hsl(0, 60%, 55%)` | `hsl(0, 70%, 50%)` | `hsl(0, 80%, 45%)` | `hsl(0, 90%, 40%)` |
| **Info** | `hsl(210, 60%, 55%)` | `hsl(210, 70%, 50%)` | `hsl(210, 80%, 45%)` | `hsl(210, 90%, 40%)` |

### Severity Indicators

- 🟢 **Low**: Normal operation
- 🟡 **Medium**: Attention needed
- 🟠 **High**: Warning condition
- 🔴 **Critical**: Immediate action required

## Default Endpoints

The CLI monitors these endpoints by default:

| Endpoint | URL | Category |
|----------|-----|----------|
| Health Check | `http://localhost:3000/health` | system |
| API Status | `http://localhost:3000/api/status` | api |
| MCP Server | `http://localhost:3000/mcp/health` | mcp |
| R2 Storage | `http://localhost:3000/r2/status` | storage |
| RSS Feeds | `http://localhost:3000/rss/status` | feeds |
| Registry | `http://localhost:3000/registry/status` | registry |

## Server Integration

### HTTP Health Endpoint

Add a health endpoint to your Bun server with HSL color coding:

```typescript
import { createBunHealthEndpoint } from './lib/http/health-endpoint';

const health = createBunHealthEndpoint({
  version: '1.0.0',
  interval: 30000,
  context: 'dark',
  checks: [
    {
      name: 'database',
      check: async () => {
        // Your DB check logic
        return { status: 'success', severity: 'low', message: 'Connected' };
      }
    }
  ]
});

Bun.serve({
  routes: {
    '/health': health.fetch
  }
});
```

### Health Endpoint Response

The health endpoint returns:

```json
{
  "status": "healthy",
  "severity": "low",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "checks": {
    "memory": {
      "status": "success",
      "severity": "low",
      "message": "Memory OK: 45.2%"
    },
    "eventLoop": {
      "status": "success",
      "severity": "low",
      "message": "Event loop healthy: 2.5ms",
      "responseTime": 2.5
    }
  },
  "summary": {
    "total": 2,
    "passed": 2,
    "failed": 0,
    "degraded": 0
  },
  "hsl": {
    "color": "hsl(140, 70%, 50%)",
    "hex": "#44c767",
    "brightness": 0.58
  }
}
```

## TypeScript Types

```typescript
import type {
  Endpoint,
  EndpointResult,
  EndpointCheckConfig,
  DisplayConfig,
  HealthCheck,
  HealthStatus
} from './lib/types/endpoint-status';
```

## API

### `checkEndpoint(endpoint, timeout?)`

Check a single endpoint.

```typescript
const result = await checkEndpoint({
  name: 'API',
  url: 'http://localhost:3000/api',
  method: 'GET',
  category: 'api'
}, 5000);
```

### `checkAllEndpoints(endpoints)`

Check multiple endpoints concurrently.

```typescript
const results = await checkAllEndpoints([
  { name: 'API1', url: 'http://localhost:3001', method: 'GET', category: 'api' },
  { name: 'API2', url: 'http://localhost:3002', method: 'GET', category: 'api' }
]);
```

### `createEnhancedStatus(config)`

Create an HSL color-coded status display.

```typescript
const status = createEnhancedStatus({
  status: 'success',
  severity: 'medium',
  context: 'dark',
  ensureWCAG: true,
  backgroundHsl: { h: 210, s: 95, l: 20 }
});
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--light` | Use light context colors | false |
| `--dark` | Use dark context colors | true |
| `--interval <ms>` | Watch interval in milliseconds | 5000 |
| `--timeout <ms>` | Request timeout in milliseconds | 5000 |
| `--json` | Output as JSON | false |

## Related Scripts

- `bun run status:check` - Check endpoint health
- `bun run status:watch` - Continuous monitoring
- `bun run status:matrix` - Display HSL status matrix
- `bun run info` - System information
- `bun run validate:bun-urls` - URL validation

## Files

- `cli/endpoint-status.ts` - Main CLI implementation
- `lib/types/endpoint-status.ts` - TypeScript type definitions
- `lib/http/health-endpoint.ts` - Server-side health endpoint
- `lib/utils/enhanced-status-matrix.ts` - HSL status matrix utilities
- `lib/utils/color-system.ts` - Core color system

## Dependencies

- `bun` - Runtime and TypeScript support
- `lib/theme/colors.ts` - Theme colors
- `lib/utils/enhanced-status-matrix.ts` - HSL utilities
- `lib/utils/color-system.ts` - Color system

# 🚀 Multi-Tenant Dashboard - Configuration Reference

## 📋 Table of Contents

- [API Defaults](#api-defaults)
- [Dashboard Options](#dashboard-options)
- [Type Definitions](#type-definitions)
- [Configuration Shortcuts](#configuration-shortcuts)
- [Environment Variables](#environment-variables)
- [CLI Flags](#cli-flags)
- [Component Props](#component-props)

---

## 🔧 API Defaults

### Server Configuration

| Property | Default | Type | Description |
|----------|---------|------|-------------|
| `PORT` | `3333` | `number` | API server port |
| `HOST` | `"localhost"` | `string` | Server hostname |
| `CORS_ORIGIN` | `"http://localhost:3001"` | `string` | Allowed CORS origin |
| `DB_PATH` | `"./data/audit.db"` | `string` | SQLite database path |
| `LOG_LEVEL` | `"info"` | `"debug"|"info"|"warn"|"error"` | Logging verbosity |

### Database Defaults

| Property | Default | Type | Description |
|----------|---------|------|-------------|
| `WAL_MODE` | `true` | `boolean` | Enable WAL mode for concurrency |
| `CACHE_SIZE` | `10000` | `number` | SQLite cache size in pages |
| `TIMEOUT` | `30000` | `number` | Query timeout in ms |
| `POOL_SIZE` | `10` | `number` | Connection pool size |

---

## 🎛️ Dashboard Options

### UI Configuration

| Property | Default | Type | Description |
|----------|---------|------|-------------|
| `AUTO_REFRESH_INTERVAL` | `30000` | `number` | Auto-refresh interval (ms) |
| `MAX_TENANTS_DISPLAY` | `50` | `number` | Max tenants shown in dropdown |
| `CHART_ANIMATION_DURATION` | `750` | `number` | Chart animation (ms) |
| `NOTIFICATION_DURATION` | `5000` | `number` | Toast notification (ms) |
| `EXPORT_BATCH_SIZE` | `1000` | `number` | Records per export batch |

### Filter Defaults

| Property | Default | Type | Description |
|----------|---------|------|-------------|
| `DEFAULT_TENANT_FILTER` | `["all"]` | `string[]` | Default tenant selection |
| `DEFAULT_DATE_RANGE` | `30` | `number` | Default days to look back |
| `VIOLATION_SEVERITY_FILTER` | `["critical","warning","info"]` | `string[]` | Default severity levels |
| `COMPLIANCE_THRESHOLD` | `95` | `number` | Compliance percentage threshold |

---

## 📝 Type Definitions

### Core Types

```typescript
// Tenant Configuration
interface TenantConfig {
  id: string;
  name: string;
  enabled: boolean;
  settings: TenantSettings;
}

// Violation Record
interface ViolationRecord {
  id: string;
  tenant: string;
  event: string;
  width: number;
  preview: string;
  ts: string;
  severity: "critical" | "warning" | "info";
}

// Snapshot Metadata
interface SnapshotMetadata {
  tenant: string;
  snapshot_at: string;
  total_violations: number;
  max_width: number;
  bun_version: string;
  file_size: number;
  sha256: string;
}

// API Response Wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### Configuration Types

```typescript
// Dashboard Settings
interface DashboardSettings {
  theme: "light" | "dark" | "auto";
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
}

// Export Options
interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  includeMetadata: boolean;
  compress: boolean;
  dateRange: {
    start: string;
    end: string;
  };
}

// Filter Configuration
interface FilterConfig {
  tenants: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  severity: string[];
  eventTypes: string[];
}
```

---

## ⚡ Configuration Shortcuts

### Quick Setup Commands

```bash
# Development setup
bun run dev:setup          # Install deps + create dirs + start services

# Production setup
bun run prod:setup         # Build + optimize + start services

# Quick start (all defaults)
bun run quick:start        # Start with default configuration
```

### Environment Shortcuts

```bash
# Set multiple defaults at once
export DASHBOARD_ENV="development"
export API_PORT=3333
export DB_PATH="./data/audit.db"
export LOG_LEVEL="debug"

# Or use preset configurations
export DASHBOARD_PRESET="development"    # Dev defaults
export DASHBOARD_PRESET="production"     # Prod defaults
export DASHBOARD_PRESET="testing"        # Test defaults
```

### Configuration Files

```bash
# .env file shortcuts
echo "PORT=3333" > .env.local
echo "LOG_LEVEL=debug" >> .env.local
echo "CORS_ORIGIN=http://localhost:3001" >> .env.local

# bunfig.toml shortcuts
cat > bunfig.toml << EOF
[install]
cache = true
global = "./node_modules/.bun"

[run]
shell = "zsh"

[test]
preload = "./test/setup.ts"
EOF
```

---

## 🌍 Environment Variables

### Required Variables

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `NODE_ENV` | `"development"` | `string` | Environment mode |
| `PORT` | `3333` | `number` | API server port |
| `DB_PATH` | `"./data/audit.db"` | `string` | Database file path |

### Optional Variables

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `API_KEY` | `undefined` | `string` | API authentication key |
| `REDIS_URL` | `undefined` | `string` | Redis connection URL |
| `S3_BUCKET` | `undefined` | `string` | S3 bucket for snapshots |
| `WEBHOOK_URL` | `undefined` | `string` | Notification webhook URL |
| `MAX_FILE_SIZE` | `"100MB"` | `string` | Max upload file size |
| `RATE_LIMIT` | `"100/minute"` | `string` | API rate limiting |

### Feature Flags

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `ENABLE_CACHING` | `"true"` | `boolean` | Enable response caching |
| `ENABLE_COMPRESSION` | `"true"` | `boolean` | Enable gzip compression |
| `ENABLE_METRICS` | `"false"` | `boolean` | Enable metrics collection |
| `ENABLE_WEBSOCKETS` | `"true"` | `boolean` | Enable WebSocket support |
| `ENABLE_SNAPSHOTS` | `"true"` | `boolean` | Enable snapshot features |

---

## 🚩 CLI Flags

### Server Flags

```bash
# Basic flags
--port, -p <number>        # Server port (default: 3333)
--host, -h <string>        # Server host (default: localhost)
--env, -e <string>         # Environment (development|production)
--config, -c <path>        # Config file path
--verbose, -v              # Enable verbose logging
--quiet, -q                # Suppress non-error logs

# Database flags
--db-path <path>           # Database file path
--db-timeout <ms>          # Query timeout
--db-pool <number>         # Connection pool size

# Feature flags
--enable-cache             # Enable caching
--disable-compression      # Disable compression
--enable-metrics           # Enable metrics
--enable-websockets        # Enable WebSocket support
```

### Dashboard Flags

```bash
# UI configuration
--theme <theme>            # Theme (light|dark|auto)
--language <lang>          # Language code
--timezone <tz>            # Timezone identifier
--refresh-interval <ms>    # Auto-refresh interval

# Feature toggles
--enable-notifications     # Enable toast notifications
--enable-export            # Enable data export
--enable-filters           # Enable advanced filters
--enable-charts            # Enable chart visualizations
```

### Development Flags

```bash
# Development helpers
--watch, -w                # Watch for file changes
--hot-reload               # Enable hot reload
--debug, -d                # Enable debug mode
--inspect                  # Enable Node inspector
--profiler                 # Enable CPU profiling

# Testing flags
--test, -t                 # Run tests
--coverage                 # Generate coverage report
--watch-tests              # Watch and re-run tests
--test-pattern <regex>     # Test name pattern
```

---

## 🧩 Component Props

### Dashboard Components

#### TenantFilter Component

```typescript
interface TenantFilterProps {
  tenants: string[];
  selectedTenants: string[];
  onSelectionChange: (tenants: string[]) => void;
  multiSelect?: boolean;           // Default: true
  showAllOption?: boolean;         // Default: true
  placeholder?: string;            // Default: "Select tenants..."
  maxVisible?: number;             // Default: 10
  searchable?: boolean;            // Default: true
}
```

#### DataExport Component

```typescript
interface DataExportProps {
  data: any[];
  filename?: string;               // Default: "export"
  formats?: ("csv" | "json" | "xlsx")[];  // Default: ["csv", "json"]
  includeMetadata?: boolean;       // Default: true
  onExport?: (format: string) => void;
  disabled?: boolean;              // Default: false
  showProgress?: boolean;          // Default: true
}
```

#### ChartVisualization Component

```typescript
interface ChartVisualizationProps {
  data: ChartData[];
  type: "line" | "bar" | "pie" | "area";
  height?: number;                 // Default: 400
  responsive?: boolean;            // Default: true
  animated?: boolean;             // Default: true
  theme?: "light" | "dark";       // Default: "light"
  showLegend?: boolean;           // Default: true
  showTooltip?: boolean;          // Default: true
}
```

### Utility Components

#### LoadingSpinner Component

```typescript
interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";  // Default: "medium"
  color?: string;                        // Default: "#00ff88"
  text?: string;                         // Default: undefined
  overlay?: boolean;                     // Default: false
  center?: boolean;                      // Default: true
}
```

#### Notification Component

```typescript
interface NotificationProps {
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;               // Default: 5000
  closable?: boolean;              // Default: true
  position?: "top" | "bottom";     // Default: "top"
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

## 🔧 Default Configurations

### Development Configuration

```typescript
const devConfig = {
  server: {
    port: 3333,
    host: "localhost",
    cors: {
      origin: "http://localhost:3001",
      credentials: true
    }
  },
  database: {
    path: "./data/audit.db",
    wal: true,
    cache: 10000
  },
  logging: {
    level: "debug",
    console: true,
    file: false
  },
  features: {
    caching: true,
    compression: false,
    metrics: true,
    websockets: true
  }
};
```

### Production Configuration

```typescript
const prodConfig = {
  server: {
    port: process.env.PORT || 3333,
    host: "0.0.0.0",
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true
    }
  },
  database: {
    path: process.env.DB_PATH || "./data/audit.db",
    wal: true,
    cache: 50000,
    timeout: 30000
  },
  logging: {
    level: "info",
    console: false,
    file: true,
    rotation: true
  },
  features: {
    caching: true,
    compression: true,
    metrics: true,
    websockets: true
  }
};
```

---

## 📊 Quick Reference Tables

### Default Values Summary

| Category | Property | Default | Type |
|----------|----------|---------|------|
| **Server** | Port | 3333 | number |
| | Host | localhost | string |
| | Timeout | 30000 | number |
| **Database** | Path | ./data/audit.db | string |
| | WAL Mode | true | boolean |
| | Cache Size | 10000 | number |
| **UI** | Refresh Interval | 30000 | number |
| | Notification Duration | 5000 | number |
| | Max Tenants | 50 | number |
| **Export** | Batch Size | 1000 | number |
| | Formats | csv,json | string[] |
| | Compression | false | boolean |

### Type Property Mappings

| Interface | Key Property | Type | Required |
|-----------|--------------|------|----------|
| `TenantConfig` | id | string | ✅ |
| | name | string | ✅ |
| | enabled | boolean | ✅ |
| `ViolationRecord` | tenant | string | ✅ |
| | event | string | ✅ |
| | width | number | ✅ |
| | severity | string | ✅ |
| `SnapshotMetadata` | tenant | string | ✅ |
| | sha256 | string | ✅ |
| | file_size | number | ✅ |

---

## 🚀 Usage Examples

### Quick Configuration Setup

```bash
# Set up development environment
export NODE_ENV=development
export PORT=3333
export LOG_LEVEL=debug

# Start with custom config
bun api-server.ts --port 3333 --verbose --enable-cache

# Dashboard with custom theme
export DASHBOARD_THEME=dark
export DASHBOARD_REFRESH_INTERVAL=60000
```

### Programmatic Configuration

```typescript
// Load configuration
const config = loadConfig({
  environment: process.env.NODE_ENV || "development",
  configFile: "./config/dashboard.json",
  overrides: {
    port: parseInt(process.env.PORT) || 3333,
    features: {
      caching: process.env.ENABLE_CACHING === "true"
    }
  }
});

// Apply configuration
const server = createServer(config);
const dashboard = createDashboard(config.ui);
```

---

**🎯 This configuration reference provides all defaults, options, and type properties for quick setup and customization of your multi-tenant dashboard!**

*Last Updated: 2026-02-01*

*Version: 1.0.0*

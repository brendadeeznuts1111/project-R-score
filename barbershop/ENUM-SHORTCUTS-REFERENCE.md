# 🎯 Enum Shortcuts & Flags Reference

## Overview

This guide provides quick shortcuts, flags, and usage patterns for all enums in the Enhanced Gateway & Lock Dashboard System. Each enum includes string values, numeric shortcuts (where applicable), and common usage patterns.

## 🔒 Lock Management Enums

### **LockPriority** - Priority levels for lock acquisition
```typescript
enum LockPriority {
  LOW = 'low',        // Shortcut: 1, Priority: ★☆☆☆
  NORMAL = 'normal',  // Shortcut: 2, Priority: ★★☆☆ (default)
  HIGH = 'high',      // Shortcut: 3, Priority: ★★★☆
  CRITICAL = 'critical' // Shortcut: 4, Priority: ★★★★
}
```

**Usage:**
```typescript
// Direct enum usage
lockManager.acquire(resource, owner, ttl, { 
  priority: LockPriority.CRITICAL 
});

// String shortcut
lockManager.acquire(resource, owner, ttl, { 
  priority: 'critical' as LockPriority 
});

// Numeric mapping (internal)
const priorityMap = { 1: 'low', 2: 'normal', 3: 'high', 4: 'critical' };
```

### **LockAction** - Actions for lock history tracking
```typescript
enum LockAction {
  ACQUIRED = 'acquired',   // Flag: A, Icon: 🔒
  RELEASED = 'released',   // Flag: R, Icon: 🔓
  EXTENDED = 'extended',   // Flag: E, Icon: ⏰
  EXPIRED = 'expired'      // Flag: X, Icon: ⏱️
}
```

**Usage:**
```typescript
// History tracking
addToHistory(LockAction.ACQUIRED, resource, owner);

// Flag-based filtering
history.filter(action => action.startsWith('a')); // acquired
history.filter(action => action[0] === 'R');     // released
```

### **DeadlockResolution** - Resolution strategies
```typescript
enum DeadlockResolution {
  AUTO_RESOLVED = 'auto_resolved',        // Flag: AUTO, Shortcut: auto
  MANUAL_INTERVENTION = 'manual_intervention', // Flag: MANUAL, Shortcut: manual
  TIMEOUT = 'timeout'                     // Flag: TIMEOUT, Shortcut: timeout
}
```

## 🚨 Alert & Notification Enums

### **AlertType** - Alert severity levels
```typescript
enum AlertType {
  INFO = 'info',      // Flag: ℹ️, Color: blue, Priority: 1
  WARNING = 'warning', // Flag: ⚠️, Color: yellow, Priority: 2
  ERROR = 'error'     // Flag: ❌, Color: red, Priority: 3
}
```

**Usage:**
```typescript
// Alert creation
addAlert(AlertType.WARNING, 'High CPU usage detected');

// Color mapping
const alertColors = {
  [AlertType.INFO]: '#3b82f6',
  [AlertType.WARNING]: '#f59e0b', 
  [AlertType.ERROR]: '#ef4444'
};
```

### **NotificationPosition** - UI positioning
```typescript
enum NotificationPosition {
  TOP_RIGHT = 'top-right',     // Flag: TR, Default: true
  TOP_LEFT = 'top-left',       // Flag: TL
  BOTTOM_RIGHT = 'bottom-right', // Flag: BR
  BOTTOM_LEFT = 'bottom-left', // Flag: BL
  TOP_CENTER = 'top-center',   // Flag: TC
  BOTTOM_CENTER = 'bottom-center' // Flag: BC
}
```

**Shortcuts:**
```typescript
// Position shortcuts
const positions = {
  TR: NotificationPosition.TOP_RIGHT,
  TL: NotificationPosition.TOP_LEFT,
  BR: NotificationPosition.BOTTOM_RIGHT,
  BL: NotificationPosition.BOTTOM_LEFT
};
```

## 📊 System Status Enums

### **GatewayStatus** - Gateway connection states
```typescript
enum GatewayStatus {
  ONLINE = 'online',       // Flag: 🟢, Code: 200
  OFFLINE = 'offline',     // Flag: 🔴, Code: 0
  DEGRADED = 'degraded',   // Flag: 🟡, Code: 206
  MAINTENANCE = 'maintenance' // Flag: 🔧, Code: 503
}
```

### **SystemHealth** - Overall system health
```typescript
enum SystemHealth {
  HEALTHY = 'healthy',     // Flag: ✅, Color: green, Score: 100
  WARNING = 'warning',     // Flag: ⚠️, Color: yellow, Score: 75
  CRITICAL = 'critical',   // Flag: ❌, Color: red, Score: 25
  UNKNOWN = 'unknown'      // Flag: ❓, Color: gray, Score: 0
}
```

### **ConnectionState** - Connection states
```typescript
enum ConnectionState {
  CONNECTED = 'connected',     // Flag: 🟢, Stable: true
  DISCONNECTED = 'disconnected', // Flag: 🔴, Stable: false
  CONNECTING = 'connecting',   // Flag: 🟡, Stable: false
  RECONNECTING = 'reconnecting', // Flag: 🟠, Stable: false
  FAILED = 'failed'           // Flag: ❌, Stable: false
}
```

## ⚙️ Configuration Enums

### **RefreshInterval** - Auto-refresh timing
```typescript
enum RefreshInterval {
  ONE_SECOND = 1000,     // Flag: 1s, Real-time: true
  FIVE_SECONDS = 5000,   // Flag: 5s, Default: true
  TEN_SECONDS = 10000,   // Flag: 10s, Real-time: false
  THIRTY_SECONDS = 30000 // Flag: 30s, Batch: true
}
```

**Usage:**
```typescript
// Set refresh interval
setRefreshInterval(RefreshInterval.FIVE_SECONDS);

// Human-readable format
const humanReadable = {
  [RefreshInterval.ONE_SECOND]: '1 second',
  [RefreshInterval.FIVE_SECONDS]: '5 seconds',
  [RefreshInterval.TEN_SECONDS]: '10 seconds',
  [RefreshInterval.THIRTY_SECONDS]: '30 seconds'
};
```

### **ThemeMode** - UI theme selection
```typescript
enum ThemeMode {
  LIGHT = 'light',           // Flag: ☀️, CSS: light-theme
  DARK = 'dark',             // Flag: 🌙, CSS: dark-theme
  AUTO = 'auto',             // Flag: 🌓, CSS: auto-theme
  FACTORYWAGER = 'factorywager' // Flag: 🏭, CSS: factorywager-theme
}
```

### **ExportFormat** - Data export formats
```typescript
enum ExportFormat {
  JSON = 'json',   // Flag: { }, MIME: application/json
  CSV = 'csv',     // Flag: 📊, MIME: text/csv
  XML = 'xml',     // Flag: </>, MIME: application/xml
  PDF = 'pdf'      // Flag: 📄, MIME: application/pdf
}
```

## 🔧 Operation Enums

### **BatchOperation** - Batch operation types
```typescript
enum BatchOperation {
  RELEASE_ALL = 'release-all',        // Flag: 🔄, Destructive: true
  EXTEND_ALL = 'extend-all',          // Flag: ⏰, Destructive: false
  CLEANUP_EXPIRED = 'cleanup-expired', // Flag: 🧹, Destructive: true
  EXPORT_DATA = 'export-data'         // Flag: 📤, Destructive: false
}
```

### **SettingsCategory** - Settings organization
```typescript
enum SettingsCategory {
  DASHBOARD = 'dashboard',   // Flag: 📊, Icon: chart-line
  LOCKS = 'locks',          // Flag: 🔒, Icon: lock
  ALERTS = 'alerts',        // Flag: 🚨, Icon: bell
  APPEARANCE = 'appearance' // Flag: 🎨, Icon: palette
}
```

## 📈 Data & Metrics Enums

### **MetricType** - Monitoring metric types
```typescript
enum MetricType {
  COUNTER = 'counter',    // Flag: #, Type: cumulative
  GAUGE = 'gauge',        // Flag: 📊, Type: instantaneous
  HISTOGRAM = 'histogram', // Flag: 📈, Type: distribution
  TIMER = 'timer'         // Flag: ⏱️, Type: duration
}
```

### **ChartType** - Visualization types
```typescript
enum ChartType {
  LINE = 'line',         // Flag: 📈, Best for: trends
  BAR = 'bar',           // Flag: 📊, Best for: comparison
  PIE = 'pie',           // Flag: 🥧, Best for: proportions
  DOUGHNUT = 'doughnut', // Flag: 🍩, Best for: proportions
  AREA = 'area'          // Flag: 📉, Best for: volume
}
```

### **SortOrder** - Data sorting
```typescript
enum SortOrder {
  ASCENDING = 'asc',  // Flag: ↑, Symbol: ▲
  DESCENDING = 'desc' // Flag: ↓, Symbol: ▼
}
```

## 🔍 Filter & Validation Enums

### **FilterOperator** - Query operators
```typescript
enum FilterOperator {
  EQUALS = 'eq',         // Flag: =, SQL: =
  NOT_EQUALS = 'ne',     // Flag: ≠, SQL: !=
  GREATER_THAN = 'gt',   // Flag: >, SQL: >
  LESS_THAN = 'lt',      // Flag: <, SQL: <
  GREATER_EQUAL = 'ge',  // Flag: ≥, SQL: >=
  LESS_EQUAL = 'le',     // Flag: ≤, SQL: <=
  CONTAINS = 'contains', // Flag: *, SQL: LIKE
  STARTS_WITH = 'starts-with', // Flag: ^, SQL: LIKE
  ENDS_WITH = 'ends-with'     // Flag: $, SQL: LIKE
}
```

**Usage:**
```typescript
// Filter construction
const filter = {
  field: 'priority',
  operator: FilterOperator.GREATER_THAN,
  value: 2
};

// SQL generation
const sql = `SELECT * FROM locks WHERE priority ${operatorMap[FilterOperator.GREATER_THAN]} ?`;
```

### **ValidationRule** - Input validation
```typescript
enum ValidationRule {
  REQUIRED = 'required',     // Flag: *, Error: Required field
  MIN_LENGTH = 'min-length', // Flag: ≥, Error: Too short
  MAX_LENGTH = 'max-length', // Flag: ≤, Error: Too long
  PATTERN = 'pattern',       // Flag: 🎯, Error: Invalid format
  EMAIL = 'email',          // Flag: @, Error: Invalid email
  URL = 'url',              // Flag: 🔗, Error: Invalid URL
  NUMERIC = 'numeric',      // Flag: #, Error: Not numeric
  POSITIVE = 'positive'     // Flag: +, Error: Not positive
}
```

## 🌐 HTTP & Web Enums

### **HttpStatus** - HTTP status codes
```typescript
enum HttpStatus {
  OK = 200,                // Flag: ✅, Message: OK
  CREATED = 201,           // Flag: 🆕, Message: Created
  NO_CONTENT = 204,        // Flag: 📭, Message: No Content
  BAD_REQUEST = 400,       // Flag: ❌, Message: Bad Request
  UNAUTHORIZED = 401,      // Flag: 🔒, Message: Unauthorized
  FORBIDDEN = 403,         // Flag: 🚫, Message: Forbidden
  NOT_FOUND = 404,         // Flag: 🔍, Message: Not Found
  INTERNAL_SERVER_ERROR = 500, // Flag: 💥, Message: Internal Server Error
  SERVICE_UNAVAILABLE = 503   // Flag: ⚠️, Message: Service Unavailable
}
```

### **FileType** - MIME type mapping
```typescript
enum FileType {
  JSON = 'application/json',  // Flag: { }, Extension: .json
  CSV = 'text/csv',          // Flag: 📊, Extension: .csv
  XML = 'application/xml',   // Flag: </>, Extension: .xml
  PDF = 'application/pdf',   // Flag: 📄, Extension: .pdf
  TEXT = 'text/plain'        // Flag: 📝, Extension: .txt
}
```

## 🎨 UI & Design Enums

### **ColorScheme** - UI color schemes
```typescript
enum ColorScheme {
  PRIMARY = 'primary',     // Flag: 🔵, Hex: #3b82f6
  SECONDARY = 'secondary', // Flag: 🟣, Hex: #8b5cf6
  SUCCESS = 'success',     // Flag: 🟢, Hex: #22c55e
  WARNING = 'warning',     // Flag: 🟡, Hex: #f59e0b
  ERROR = 'error',         // Flag: 🔴, Hex: #ef4444
  INFO = 'info'           // Flag: 🔵, Hex: #3b82f6
}
```

### **AnimationType** - UI animations
```typescript
enum AnimationType {
  FADE = 'fade',     // Flag: 💫, Duration: 300ms
  SLIDE = 'slide',   // Flag: ➡️, Duration: 250ms
  BOUNCE = 'bounce', // Flag: ⚡, Duration: 500ms
  PULSE = 'pulse',   // Flag: 💗, Duration: 1000ms
  SHAKE = 'shake'    // Flag: 🫨, Duration: 400ms
}
```

### **DeviceType** - Responsive design
```typescript
enum DeviceType {
  DESKTOP = 'desktop', // Flag: 🖥️, Min-width: 1024px
  TABLET = 'tablet',   // Flag: 📱, Min-width: 768px
  MOBILE = 'mobile',   // Flag: 📱, Max-width: 767px
  UNKNOWN = 'unknown'  // Flag: ❓, Fallback: true
}
```

## 🔐 Security & Permission Enums

### **PermissionLevel** - Access control
```typescript
enum PermissionLevel {
  READ_ONLY = 'read-only',      // Flag: 👀, Level: 1
  OPERATOR = 'operator',        // Flag: 🔧, Level: 2
  ADMINISTRATOR = 'administrator', // Flag: 👑, Level: 3
  SUPER_ADMIN = 'super-admin'   // Flag: 🌟, Level: 4
}
```

### **ProfileBindingStatus** - Profile connection state
```typescript
enum ProfileBindingStatus {
  BOUND = 'bound',       // Flag: ✅, Connected: true
  UNBOUND = 'unbound',   // Flag: ❌, Connected: false
  PENDING = 'pending',   // Flag: ⏳, Connected: false
  ERROR = 'error'        // Flag: ❗, Connected: false
}
```

## ⏰ Time & Duration Enums

### **TimeUnit** - Time measurement units
```typescript
enum TimeUnit {
  MILLISECONDS = 'ms', // Flag: ms, Multiplier: 1
  SECONDS = 's',       // Flag: s, Multiplier: 1000
  MINUTES = 'm',       // Flag: m, Multiplier: 60000
  HOURS = 'h',         // Flag: h, Multiplier: 3600000
  DAYS = 'd'           // Flag: d, Multiplier: 86400000
}
```

**Usage:**
```typescript
// Time conversion
function convertTime(value: number, from: TimeUnit, to: TimeUnit): number {
  const ms = value * multipliers[from];
  return ms / multipliers[to];
}

// Human-readable duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}${TimeUnit.MILLISECONDS}`;
  if (ms < 60000) return `${ms/1000}${TimeUnit.SECONDS}`;
  return `${ms/60000}${TimeUnit.MINUTES}`;
}
```

## 🌐 Browser & Platform Enums

### **BrowserType** - Browser detection
```typescript
enum BrowserType {
  CHROME = 'chrome',   // Flag: 🌐, Engine: Blink
  FIREFOX = 'firefox', // Flag: 🦊, Engine: Gecko
  SAFARI = 'safari',   // Flag: 🧭, Engine: WebKit
  EDGE = 'edge',       // Flag: 📘, Engine: Blink
  OPERA = 'opera',     // Flag: 🎭, Engine: Blink
  UNKNOWN = 'unknown'  // Flag: ❓, Engine: Unknown
}
```

## 🚀 Quick Reference Cheat Sheet

### **Priority Shortcuts**
```typescript
// Lock Priority (1-4)
1: LOW      // ★☆☆☆
2: NORMAL   // ★★☆☆ (default)
3: HIGH     // ★★★☆
4: CRITICAL // ★★★★

// Alert Priority (1-3)
1: INFO     // ℹ️ blue
2: WARNING  // ⚠️ yellow
3: ERROR    // ❌ red
```

### **Common Flag Patterns**
```typescript
// Status flags
🟢 = online/connected/healthy
🟡 = warning/degraded/connecting
🔴 = offline/disconnected/critical
🔧 = maintenance
❓ = unknown

// Action flags
🔒 = acquired/lock
🔓 = released/unlock
⏰ = extended/timeout
🔄 = batch/release-all
📤 = export
```

### **Numeric Shortcuts**
```typescript
// Refresh intervals (ms)
1000  = 1s  (real-time)
5000  = 5s  (default)
10000 = 10s (standard)
30000 = 30s (batch)

// HTTP codes
200 = OK
201 = Created
400 = Bad Request
401 = Unauthorized
404 = Not Found
500 = Internal Error
503 = Service Unavailable
```

### **String Shortcuts**
```typescript
// Filter operators
eq  = equals
ne  = not equals
gt  = greater than
lt  = less than
ge  = greater equal
le  = less equal
contains = contains
starts-with = starts with
ends-with = ends with

// Batch operations
release-all = 🔄
extend-all = ⏰
cleanup-expired = 🧹
export-data = 📤
```

## 🎯 Usage Best Practices

### **1. Type Safety**
```typescript
// ✅ Good: Use enum directly
const priority: LockPriority = LockPriority.HIGH;

// ❌ Bad: Use string literal
const priority = 'high'; // No type safety
```

### **2. Default Values**
```typescript
// ✅ Good: Provide enum defaults
function acquireLock(resource: string, priority: LockPriority = LockPriority.NORMAL) {}

// ✅ Good: Use enum for configuration
const config = {
  refreshInterval: RefreshInterval.FIVE_SECONDS,
  theme: ThemeMode.AUTO
};
```

### **3. Validation**
```typescript
// ✅ Good: Validate enum values
function isValidPriority(value: string): value is LockPriority {
  return Object.values(LockPriority).includes(value as LockPriority);
}
```

### **4. Serialization**
```typescript
// ✅ Good: Serialize/deserialize properly
const serialized = JSON.stringify(LockPriority.HIGH); // "high"
const deserialized = LockPriority[serialized as keyof typeof LockPriority]; // HIGH
```

This reference provides comprehensive shortcuts, flags, and usage patterns for all enums in the system! 🎯

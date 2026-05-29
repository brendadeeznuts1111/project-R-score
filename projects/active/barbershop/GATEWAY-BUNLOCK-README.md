# 🎯 Enhanced Gateway & BunLock Dashboard System

Complete dashboard system for monitoring and managing the OpenClaw Gateway and distributed lock management in the Barbershop Demo with advanced features including real-time metrics, alerts, priority locks, and deadlock detection.

## 🚀 Quick Start

```bash
# Start the standard Gateway & Lock Dashboard
bun run start:gateway

# Start the Enhanced Dashboard with advanced features
bun run gateway:enhanced

# Start individual components
bun run gateway:openclaw    # OpenClaw dashboard only
bun run gateway:cli         # OpenClaw CLI interface

# Development with hot reload
bun run dev:gateway

# Test Enhanced BunLock system
bun run bunlock:test
bun run bunlock:stress-test
bun run bunlock:stats
```

## 🌐 Dashboard Access

- **Standard Dashboard**: http://localhost:8766
- **Enhanced Dashboard**: http://localhost:8767
- **OpenClaw Dashboard**: http://localhost:8765
- **API Base**: http://localhost:8766/api (standard) or http://localhost:8767/api (enhanced)

### **URL Fragment Navigation**
Both dashboards now support proper URL fragments for direct tab access:

- **Lock Manager**: http://localhost:8767/#locks
- **Gateway Status**: http://localhost:8767/#gateway  
- **Matrix Profiles**: http://localhost:8767/#profiles
- **History**: http://localhost:8767/#history (enhanced only)
- **Alerts**: http://localhost:8767/#alerts (enhanced only)
- **Settings**: http://localhost:8767/#settings (enhanced only)

**Features:**
- ✅ Browser back/forward button support
- ✅ Direct URL linking to specific tabs
- ✅ Refresh maintains current tab
- ✅ Shareable URLs with tab context

## 📋 Features Overview

### 🔒 **Enhanced BunLock - Advanced Distributed Lock Manager**

**Core Capabilities:**
- **Resource Locking**: Acquire locks on any resource with TTL
- **Priority System**: 4-level priority (low, normal, high, critical) with preemption
- **Lock Chaining**: Atomic acquisition of multiple resources
- **Queue Management**: Priority-based waiting queue with timeout
- **Automatic Cleanup**: Expired locks automatically removed
- **Deadlock Detection**: Automatic detection and resolution of deadlocks
- **Lock Extensions**: Extend existing locks before expiration
- **Force Unlock**: Administrative override capabilities
- **Comprehensive Metrics**: Real-time performance monitoring

**Type-Safe Enums:**
```typescript
// Lock priorities with type safety
enum LockPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Alert types for notifications
enum AlertType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// Lock actions for history tracking
enum LockAction {
  ACQUIRED = 'acquired',
  RELEASED = 'released',
  EXTENDED = 'extended',
  EXPIRED = 'expired'
}
```

**Advanced Features:**
```typescript
import { LockPriority, LockAction, AlertType } from './src/core/enums';

// Priority-based lock acquisition
const lockId = await lockManager.acquire('critical-resource', 'user', 30000, {
  priority: LockPriority.CRITICAL,
  retry: true,
  timeout: 60000
});

// Atomic lock chaining
const chainIds = await lockManager.acquireChain(
  ['resource1', 'resource2', 'resource3'], 
  'user', 
  30000,
  { priority: LockPriority.HIGH }
);

// Force unlock (admin)
await lockManager.forceUnlock('stuck-resource');

// Get comprehensive metrics
const metrics = lockManager.getMetrics();
console.log('Peak concurrent locks:', metrics.peakConcurrentLocks);
console.log('Average wait time:', metrics.averageWaitTime);
console.log('Deadlock detections:', metrics.deadlockDetections);

// Type-safe alert generation
addAlert(AlertType.WARNING, 'High CPU usage detected');
addToHistory(LockAction.ACQUIRED, 'resource-1', 'user-123');
```

### �️ **Comprehensive Type System**

The enhanced dashboard includes a complete enum system for type safety and maintainability:

**Core Enums:**
```typescript
// System states and statuses
enum GatewayStatus { ONLINE, OFFLINE, DEGRADED, MAINTENANCE }
enum SystemHealth { HEALTHY, WARNING, CRITICAL, UNKNOWN }
enum ConnectionState { CONNECTED, DISCONNECTED, CONNECTING, RECONNECTING }

// UI and interaction types
enum RefreshInterval { ONE_SECOND, FIVE_SECONDS, TEN_SECONDS, THIRTY_SECONDS }
enum NotificationPosition { TOP_RIGHT, TOP_LEFT, BOTTOM_RIGHT, BOTTOM_LEFT }
enum ThemeMode { LIGHT, DARK, AUTO, FACTORYWAGER }

// Data and metrics types
enum MetricType { COUNTER, GAUGE, HISTOGRAM, TIMER }
enum LogLevel { DEBUG, INFO, WARN, ERROR, FATAL }
enum ExportFormat { JSON, CSV, XML, PDF }
```

**Benefits:**
- ✅ **Type Safety**: Compile-time checking of all constants
- ✅ **IntelliSense**: Auto-completion in IDEs
- ✅ **Refactoring**: Safe code refactoring across the codebase
- ✅ **Documentation**: Self-documenting code with meaningful names
- ✅ **Consistency**: Standardized values across all components

### 🌉 **OpenClaw Gateway Integration**

**Gateway Features:**
- **Matrix Profile Management**: Handle multiple profile contexts
- **Context-Aware Execution**: Execute commands with proper context binding
- **Real-time Status**: Monitor gateway health and performance
- **Profile Binding**: Bind/unbind matrix profiles dynamically

**Status Monitoring:**
```typescript
interface OpenClawStatus {
  online: boolean;
  version: string;
  gatewayUrl: string;
  latencyMs: number;
  profilesActive: number;
  contextHash: string;
  globalConfig?: BunGlobalConfig;
}
```

## 📊 Enhanced Dashboard Interface

### **Enhanced Dashboard Components (Port 8767)**

#### **1. Real-time System Monitoring**
- **Live Metrics**: CPU usage, memory consumption, request rates
- **Performance Charts**: Interactive charts for system metrics and lock activity
- **Status Indicators**: Visual health indicators with color-coded alerts
- **Auto-refresh**: Configurable refresh intervals (1s to 30s)

#### **2. Advanced Lock Management**
- **Priority-based Display**: Color-coded lock priorities
- **Search & Filter**: Real-time search and filtering by resource type
- **Batch Operations**: Release all locks, bulk extend operations
- **Queue Visualization**: View waiting locks and queue positions

#### **3. Comprehensive Alert System**
- **Multi-level Alerts**: Error, warning, and info alerts
- **Alert Management**: Acknowledge, dismiss, and clear alerts
- **Alert Banner**: Prominent display of critical system issues
- **Sound Notifications**: Optional audio alerts for critical events

#### **4. History & Analytics**
- **Lock History**: Complete audit trail of all lock operations
- **Deadlock Reports**: Detailed deadlock detection and resolution reports
- **Performance Metrics**: Throughput, wait times, and resource hotspots
- **Trend Analysis**: Historical data visualization and trends

#### **5. Enhanced Settings**
- **Dashboard Configuration**: Customizable refresh rates and display options
- **Lock Parameters**: Default TTL, max concurrent locks, retry settings
- **Alert Preferences**: Configure notification types and thresholds
- **Debug Mode**: Enable detailed logging and diagnostics

### **Standard Dashboard Components (Port 8766)**

#### **1. Stats Overview**
- **Gateway Status**: Online/Offline with latency
- **Active Locks**: Real-time lock count
- **Matrix Profiles**: Number of active profiles
- **Performance Metrics**: Latency and health indicators

#### **2. Lock Manager Tab**
- **Active Locks List**: View all current locks with details
- **Lock Operations**: Create, extend, release locks
- **Lock Statistics**: TTL, owner, resource information
- **Bulk Actions**: Cleanup expired locks

#### **3. Gateway Status Tab**
- **Connection Info**: Gateway health and version
- **Profile Management**: Active matrix profiles
- **Performance Metrics**: Latency and response times
- **Context Information**: Hash and configuration details

#### **4. Matrix Profiles Tab**
- **Profile List**: All available matrix profiles
- **Binding Status**: Bound/unbound state
- **Profile Actions**: View, bind, unbind operations
- **Context Details**: Profile configuration and metadata

#### **5. Actions Tab**
- **Lock Operations**: Quick lock management actions
- **Gateway Tests**: Ping and connectivity tests
- **System Operations**: Cleanup and maintenance tasks

## 🔧 API Endpoints

### **Lock Management API**

```bash
# List all active locks
GET /api/locks

# Create a new lock
POST /api/locks
{
  "resource": "test-resource",
  "owner": "user-name", 
  "ttl": 30000
}

# Release a lock
DELETE /api/locks/{lockId}

# Extend lock TTL
PUT /api/locks/{lockId}/extend
{
  "additionalTtl": 30000
}

# Get lock statistics
GET /api/locks/stats

# Cleanup expired locks
POST /api/locks/cleanup
```

### **Gateway Management API**

```bash
# Get gateway status
GET /api/gateway/status

# Test gateway ping
GET /api/gateway/ping

# List matrix profiles
GET /api/profiles
```

## 🎨 UI Features

### **Interactive Elements**
- **Real-time Updates**: Auto-refresh every 5 seconds
- **Tab Navigation**: Switch between different management views
- **Modal Dialogs**: Create locks with custom parameters
- **Status Indicators**: Visual feedback for system health
- **Responsive Design**: Mobile-friendly interface

### **Visual Design**
- **Dark Theme**: Professional dark mode interface
- **Color Coding**: Status-based color indicators
- **Icons**: Lucide icons for intuitive navigation
- **Animations**: Smooth transitions and hover effects
- **Gradient Headers**: Modern gradient styling

## 🔒 Security Features

### **Lock Security**
- **Owner Validation**: Only lock owners can release their locks
- **TTL Enforcement**: Automatic expiration prevents deadlocks
- **Resource Isolation**: Locks are resource-specific
- **Audit Trail**: Complete lock operation history

### **Gateway Security**
- **Context Isolation**: Each profile runs in isolated context
- **Authentication**: Profile-based access control
- **Secure Communication**: Encrypted data transmission
- **Access Logging**: Comprehensive audit logs

## 📈 Performance Monitoring

### **Lock Metrics**
```typescript
interface LockStats {
  totalLocks: number;        // Total locks in system
  activeLocks: number;       // Currently active locks
  expiredLocks: number;      // Expired but not cleaned up
  uniqueResources: number;   // Number of unique resources
  uniqueOwners: number;      // Number of unique lock owners
}
```

### **Gateway Metrics**
- **Response Latency**: Gateway response times
- **Profile Count**: Active matrix profiles
- **Connection Status**: Real-time health checks
- **Context Switches**: Profile context changes

## 🛠️ Advanced Usage

### **Programmatic Lock Management**
```typescript
import BunLock from './src/core/bunlock';

const lockManager = new BunLock();

// Advanced lock acquisition
const lockId = await lockManager.acquireWithRetry(
  'critical-resource',
  'process-123',
  60000,    // 60 second TTL
  30000,    // 30 second timeout
  500       // 500ms retry interval
);

if (lockId) {
  console.log('Lock acquired:', lockId);
  
  // Do work with the resource
  
  // Extend if needed
  await lockManager.extend(lockId, 30000);
  
  // Release when done
  await lockManager.release(lockId);
}

lockManager.close();
```

### **Gateway Context Management**
```typescript
import { executeWithContext, loadGlobalConfig } from './lib/bun-context';

// Load global configuration
const config = await loadGlobalConfig();

// Execute with context
const result = await executeWithContext({
  command: 'bun --version',
  cwd: '/project/path',
  env: { NODE_ENV: 'production' },
  timeout: 5000
});

console.log('Command output:', result.stdout);
```

## 🔧 Configuration

### **Environment Variables**
```bash
# Gateway Dashboard
GATEWAY_DASHBOARD_PORT=8766
GATEWAY_DASHBOARD_HOST=0.0.0.0

# OpenClaw Dashboard  
OPENCLAW_PORT=8765
OPENCLAW_HOST=0.0.0.0

# Lock Manager (optional)
LOCK_DB_PATH=/path/to/lock.db
LOCK_CLEANUP_INTERVAL=5000
```

### **Default Settings**
- **Dashboard Port**: 8766
- **OpenClaw Port**: 8765
- **Lock TTL**: 30 seconds (default)
- **Cleanup Interval**: 5 seconds
- **Auto-refresh**: 5 seconds

## 🚨 Troubleshooting

### **Common Issues**

#### **Dashboard Not Loading**
```bash
# Check if port is available
lsof -i :8766

# Try different port
GATEWAY_DASHBOARD_PORT=8767 bun run start:gateway
```

#### **Locks Not Working**
```bash
# Test lock system
bun run bunlock:test

# Check lock statistics
bun run bunlock:stats
```

#### **Gateway Connection Issues**
```bash
# Test gateway ping
curl http://localhost:8766/api/gateway/ping

# Check gateway status
curl http://localhost:8766/api/gateway/status
```

### **Debug Mode**
```bash
# Enable verbose logging
DEBUG=true bun run start:gateway

# Check logs for errors
journalctl -u barbershop-gateway -f
```

## 🧪 Testing

### **Unit Tests**
```bash
# Test lock functionality
bun test tests/unit/bunlock.test.ts

# Test gateway integration
bun test tests/unit/gateway.test.ts
```

### **Integration Tests**
```bash
# Full system test
bun test tests/integration/gateway-lock.test.ts

# Performance test
bun test tests/integration/lock-performance.test.ts
```

## 📚 Architecture

### **Component Structure**
```
src/core/
├── gateway-dashboard.ts    # Main dashboard server
├── bunlock.ts             # Distributed lock manager
└── ...

openclaw/
├── dashboard-server.ts     # OpenClaw dashboard
├── gateway.ts             # OpenClaw gateway
├── cli.ts                 # CLI interface
└── ...

lib/
├── bun-context.ts         # Context management
└── ...
```

### **Data Flow**
1. **Dashboard UI** → HTTP API → **Lock Manager**
2. **Dashboard UI** → HTTP API → **Gateway Status**
3. **Lock Manager** → SQLite Database → **Lock State**
4. **Gateway** → Context Engine → **Matrix Profiles**

## 🎯 Use Cases

### **Resource Management**
- **Database Migrations**: Prevent concurrent migrations
- **File Processing**: Coordinate file access across processes
- **API Rate Limiting**: Control access to shared resources
- **Deployment Coordination**: Sequential deployment management

### **Gateway Management**
- **Profile Switching**: Switch between development environments
- **Context Monitoring**: Track active development contexts
- **Performance Analysis**: Monitor gateway performance
- **Debugging**: Isolate issues in specific contexts

---

**The Gateway & BunLock Dashboard** provides a comprehensive solution for managing distributed locks and monitoring gateway operations in modern Bun applications. Perfect for development teams needing coordination and monitoring capabilities! 🚀

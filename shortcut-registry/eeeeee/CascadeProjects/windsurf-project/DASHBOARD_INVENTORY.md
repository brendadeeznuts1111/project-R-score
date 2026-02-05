# Dashboard Options Inventory

Complete list of available dashboards, their access methods, ports, and startup commands.

## Quick Reference

| Dashboard | Type | Port | Startup Command | Status |
|-----------|------|------|----------------|--------|
| **Configuration Dashboard** | Web | 3227 | `bun run config:dashboard` | ✅ Active |
| **Shopping Dashboard** | Web | 3005 | `bun run shop:dashboard` | ✅ Active |
| **Fraud Detection Dashboard** | Web | 3001 | Manual | ✅ Available |
| **Landing Page Dashboard** | Web | 3222 | `bun run examples/api-servers/landing-server.ts` | ✅ Available |
| **Nexus/Citadel Dashboard** | CLI | N/A | `bun run dashboard:cli` | ✅ Available |
| **KYC Dashboard** | CLI | N/A | `bun run src/dashboards/kycDashboard.ts` | ✅ Available |

---

## 1. Configuration Dashboard (DuoPlus Unified Dashboard)

**Type:** Web-based Dashboard  
**Port:** 3227 (configurable via `DUOPLUS_ADMIN_PORT` env var)  
**File:** `src/admin/config-server.ts`  
**Purpose:** Real-time configuration management, system metrics, feature status, and health checks

### Features
- Real-time configuration status
- System metrics and monitoring
- Feature status and health checks
- Configuration freeze/unfreeze capabilities
- Hot reload support
- Server statistics and uptime tracking

### Startup Commands

```bash
# Start dashboard server
bun run config:server

# Start and open in browser
bun run config:dashboard

# Start via package script
bun run dashboard:web

# Open dashboard (if server already running)
bun run dashboard:open
```

### Access URLs
- **Main Dashboard:** http://localhost:3227/
- **Configuration Page:** http://localhost:3227/config
- **API Status:** http://localhost:3227/api/status
- **Health Check:** http://localhost:3227/health
- **Metrics:** http://localhost:3227/metrics
- **Demo Page:** http://localhost:3227/demo

### API Endpoints
- `GET /` - Unified landing page
- `GET /config` - Configuration management page
- `GET /api/config` - Configuration JSON
- `GET /api/status` - System status JSON
- `POST /api/config/freeze` - Freeze configuration
- `POST /api/config/unfreeze` - Unfreeze configuration
- `GET /api/config/freeze-status` - Get freeze status
- `POST /api/reload` - Hot reload configuration
- `GET /health` - Health check
- `GET /metrics` - Server metrics

### Configuration
Port is configured in `src/config/config.ts`:
```typescript
port: parseInt(Bun.env.DUOPLUS_ADMIN_PORT || '3227')
```

---

## 2. Shopping Dashboard

**Type:** Web-based Dashboard  
**Port:** 3005  
**File:** `shopping/server.ts`  
**Purpose:** Shopping platform dashboard with RBAC (Role-Based Access Control)

### Features
- Shopping API dashboard
- Role-based access control
- Enterprise branding support
- Health monitoring

### Startup Commands

```bash
# Start shopping server
bun run shop:start

# Start in dev mode (with watch)
bun run shop:dev

# Open dashboard (requires server running)
bun run shop:dashboard

# Enterprise mode (requires hosts setup)
bun run shop:enterprise
```

### Access URLs
- **Dashboard:** http://localhost:3005/dashboard
- **API Health:** http://localhost:3005/health
- **Enterprise:** http://api.factory-wager.com:3005/dashboard (requires hosts setup)

### Prerequisites
- Run `bun run setup:hosts` for enterprise mode

---

## 3. Fraud Detection Dashboard

**Type:** HTML Dashboard  
**Port:** 3001 (configurable)  
**File:** `pages/dashboard.html`  
**Purpose:** Real-time fraud detection and risk heatmap visualization

### Features
- Real-time risk monitoring
- WebSocket live updates
- Risk heatmap visualization
- Fraud alerts and notifications

### Startup
Requires a server to serve the HTML file. The dashboard expects:
- WebSocket endpoint: `ws://localhost:3001/ws/risk-live`
- API base: `http://localhost:3001`

### Configuration
Edit the `CONFIG` object in `pages/dashboard.html`:
```javascript
const CONFIG = {
    HOST: 'localhost',
    PORT: '3001',
};
```

---

## 4. Landing Page Dashboard

**Type:** Web-based Dashboard  
**Port:** 3222 (configurable via `LANDING_PORT` env var)  
**File:** `examples/api-servers/landing-server.ts`  
**Purpose:** Comprehensive landing page for all Factory Wager Empire systems

### Features
- System overview dashboard
- Multi-service status
- API routing

### Startup Commands

```bash
# Start landing page server
bun run examples/api-servers/landing-server.ts
```

### Access URLs
- **Landing Page:** http://localhost:3222/
- **Dashboard:** http://localhost:3222/landing
- **API Status:** http://localhost:3222/api/system-status

---

## 5. Nexus/Citadel Dashboard (CLI)

**Type:** Terminal/CLI Dashboard  
**Port:** N/A  
**File:** `src/nexus/core/dashboard.ts`  
**Purpose:** Real-time monitoring and feedback for Android 13 burner identity operations

### Features
- Device status monitoring
- Security incident tracking
- Performance metrics
- Audit log viewing

### Startup Commands

```bash
# Start CLI dashboard
bun run dashboard:cli

# Auto workflow
bun run dashboard:auto

# Manual workflow script
bun run dashboard:workflow
```

### Usage
Interactive terminal interface showing:
- Total devices and active devices
- High-risk device count
- Security incidents
- Performance scores
- Recent audit entries

---

## 6. KYC Dashboard (CLI)

**Type:** Terminal/CLI Dashboard  
**Port:** N/A  
**File:** `src/dashboards/kycDashboard.ts`  
**Purpose:** Production-grade KYC admin dashboard with FinCEN compliance

### Features
- KYC user management
- Review queue management
- Real-time updates
- Compliance tracking
- Terminal-based interface

### Startup Commands

```bash
# Start KYC dashboard
bun run src/dashboards/kycDashboard.ts

# Via admin CLI
bun run duoplus:kyc
```

### Features
- Interactive menu system
- Real-time status updates
- User review workflows
- Compliance reporting

---

## 7. React Component Dashboards (TSX)

These are React components that can be integrated into web applications:

### 7.1 Guardian Risk Dashboard

**File:** `components/guardian-risk-dashboard.tsx`  
**Purpose:** Real-time risk visualization and prevention for guardians

**Features:**
- Risk profile visualization
- Real-time alerts
- Preventive actions
- SHAP explainability

**Usage:**
Import and use in React applications:
```tsx
import { GuardianRiskDashboard } from './components/guardian-risk-dashboard';
```

### 7.2 Cross-Family Network Dashboard

**File:** `components/cross-family-network-dashboard.tsx`  
**Purpose:** Graph visualization and shared oversight for cross-family networks

**Features:**
- Network graph visualization
- Guardian management
- Analytics dashboard
- Network alerts

**Usage:**
```tsx
import { CrossFamilyNetworkDashboard } from './components/cross-family-network-dashboard';
```

---

## Supporting API Servers

These API servers support the dashboards and can be started independently:

### Suspension Risk API Server
- **Port:** 3225 (configurable via `SUSPENSION_RISK_PORT`)
- **File:** `examples/api-servers/suspension-risk-api-server.ts`
- **Purpose:** ML risk scoring endpoints
- **Start:** `bun run examples/api-servers/suspension-risk-api-server.ts`

### Cross-Family Network API Server
- **Port:** 3226 (configurable via `CROSS_FAMILY_PORT`)
- **File:** `examples/api-servers/cross-family-network-api-server.ts`
- **Purpose:** Guardian network endpoints
- **Start:** `bun run examples/api-servers/cross-family-network-api-server.ts`

### Family Controls API Server
- **Port:** 3224 (configurable via `FAMILY_CONTROLS_PORT`)
- **File:** `examples/api-servers/family-controls-api-server.ts`
- **Purpose:** Family control endpoints
- **Start:** `bun run examples/api-servers/family-controls-api-server.ts`

### Cash App API Server
- **Port:** 3223 (configurable via `CASH_APP_PORT`)
- **File:** `examples/api-servers/cash-app-api-server.ts`
- **Purpose:** Cash App Priority integration endpoints
- **Start:** `bun run examples/api-servers/cash-app-api-server.ts`

### DuoPlus API Server
- **Port:** 3005
- **File:** `examples/api-servers/duoplus-api-server.ts`
- **Purpose:** Cloud phone + Guardian Networks integration
- **Start:** `bun run examples/api-servers/duoplus-api-server.ts`

### DuoPlus RPA API Server
- **Port:** 3006
- **File:** `examples/api-servers/duoplus-rpa-api-server.ts`
- **Purpose:** RPA batch control + template system
- **Start:** `bun run examples/api-servers/duoplus-rpa-api-server.ts`

### Citadel Server (Multi-Port)
- **File:** `examples/api-servers/citadel-server.ts`
- **Purpose:** Configuration-driven multi-service server
- **Ports:** Configured via `citadel-config.json`
  - Dashboard port (configurable)
  - API port (configurable)
  - WebSocket port (configurable)

---

## Port Summary

| Service | Default Port | Environment Variable |
|---------|--------------|---------------------|
| Configuration Dashboard | 3227 | `DUOPLUS_ADMIN_PORT` |
| Landing Page | 3222 | `LANDING_PORT` |
| Cash App API | 3223 | `CASH_APP_PORT` |
| Family Controls API | 3224 | `FAMILY_CONTROLS_PORT` |
| Suspension Risk API | 3225 | `SUSPENSION_RISK_PORT` |
| Cross-Family Network API | 3226 | `CROSS_FAMILY_PORT` |
| Fraud Detection Dashboard | 3001 | (in HTML config) |
| Shopping Dashboard | 3005 | (hardcoded) |
| DuoPlus API | 3005 | (hardcoded) |
| DuoPlus RPA API | 3006 | (hardcoded) |

---

## Quick Start Guide

### Start Main Configuration Dashboard

```bash
# Quick start (starts server and opens browser)
bun run config:dashboard

# Or manually
bun run src/admin/config-server.ts
# Then open http://localhost:3227
```

### Start All API Servers

```bash
# Start individual API servers in separate terminals
bun run examples/api-servers/landing-server.ts &
bun run examples/api-servers/cash-app-api-server.ts &
bun run examples/api-servers/family-controls-api-server.ts &
bun run examples/api-servers/suspension-risk-api-server.ts &
bun run examples/api-servers/cross-family-network-api-server.ts &
```

### Start CLI Dashboards

```bash
# Nexus/Citadel CLI Dashboard
bun run dashboard:cli

# KYC Dashboard
bun run src/dashboards/kycDashboard.ts
```

---

## Troubleshooting

### Port Already in Use

If a port is already in use, you can:
1. Change the environment variable (e.g., `DUOPLUS_ADMIN_PORT=3228`)
2. Kill the process using the port:
   ```bash
   # Find process
   lsof -i :3227
   # Kill process
   kill -9 <PID>
   ```

### Dashboard Not Loading

1. Check if the server is running:
   ```bash
   curl http://localhost:3227/health
   ```
2. Check server logs for errors
3. Verify port configuration in `src/config/config.ts`

### API Servers Not Responding

1. Ensure API servers are started before accessing dashboards that depend on them
2. Check CORS settings if accessing from different origins
3. Verify environment variables are set correctly

---

## Additional Resources

- **Configuration Guide:** See `docs/CONFIGURATION.md`
- **API Documentation:** See `docs/API.md`
- **Project Structure:** See `PROJECT_STRUCTURE.md`
- **README:** See main `README.md` for overview

---

## Notes

- All web dashboards support CORS for cross-origin requests
- CLI dashboards require terminal support for interactive features
- React component dashboards require a React application to render
- Some dashboards require API servers to be running for full functionality
- Port configurations can be overridden via environment variables

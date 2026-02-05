# [BUN.TOOLING.SUITE.RG] Extended Bun Tooling Suite

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-BUN-TOOLING@0.1.0;instance-id=BUN-TOOLING-001;version=0.1.0}][PROPERTIES:{tooling={value:"bun-tooling-suite";@root:"ROOT-DEV";@chain:["BP-BUN","BP-DEVELOPMENT"];@version:"0.1.0"}}][CLASS:BunToolingSuite][#REF:v-0.1.0.BP.BUN.TOOLING.1.0.A.1.1.DEV.1.1]]`

## 1. Overview

Advanced Bun-native tools for development velocity, observability, and production hardening.

**Code Reference**: `#REF:v-0.1.0.BP.BUN.TOOLING.1.0.A.1.1.DEV.1.1`

---

## 2. [TOOLING.DEV_SERVER.RG] Development Server with Hot Reload

### 2.1. [DEV_SERVER.FEATURES.RG] Features
- **Hot Reload**: Instant restart on file changes
- **State Preservation**: Maintains in-memory registry state across reloads
- **SQLite Persistence**: File-based state storage for development

### 2.2. [DEV_SERVER.USAGE.RG] Usage
```bash
# Start with hot reload
bun --watch scripts/dev-server.ts

# Or use npm script
bun run dev
```

### 2.3. [DEV_SERVER.ENDPOINTS.RG] Endpoints
- `GET /health` - Server health check
- `GET /state/:key` - Get preserved state
- `POST /state/:key` - Set preserved state

**Reference**: `#REF:scripts/dev-server.ts`

---

## 3. [TOOLING.METRICS.RG] Custom Telemetry System

### 3.1. [METRICS.FEATURES.RG] Features
- **Zero Overhead**: Native metrics collection
- **Prometheus Format**: Compatible with Prometheus scraping
- **Counters**: Track total events
- **Histograms**: Track latency distributions

### 3.2. [METRICS.USAGE.RG] Usage
```typescript
import { bookMoves, steamDetected, logMovement } from "./observability/metrics";

// Log bookmaker movement
logMovement({
  bookmaker: "Pinnacle",
  suspected_trigger: "steam"
});

// Observe latency
steamDetected.observe({ bookmaker: "Pinnacle" }, 45);
```

### 3.3. [METRICS.ENDPOINT.RG] Metrics Endpoint
```bash
# Scrape metrics
curl http://localhost:3000/metrics

# Prometheus config
scrape_configs:
  - job_name: 'nexus'
    static_configs:
      - targets: ['localhost:3000']
```

**Reference**: `#REF:src/observability/metrics.ts`

---

## 4. [TOOLING.WAL_CONFIG.RG] SQLite WAL Mode Configuration

### 4.1. [WAL_CONFIG.FEATURES.RG] Features
- **WAL Mode**: Write-Ahead Logging for concurrent reads/writes
- **Optimized Settings**: Tuned for SSD performance
- **Manual Checkpointing**: Control WAL checkpoint timing
- **Backup Support**: Database backup with compression

### 4.2. [WAL_CONFIG.USAGE.RG] Usage
```typescript
import { createOptimizedDB, checkpointWAL, getWALStats } from "./storage/wal-config";

// Create optimized database
const db = createOptimizedDB("./data/forensic.db", {
  checkpointPages: 1000,
  cacheSizeMB: 64,
  mmapSizeMB: 256
});

// Manual checkpoint
checkpointWAL(db, "FULL");

// Get WAL statistics
const stats = getWALStats(db);
```

**Reference**: `#REF:src/storage/wal-config.ts`

---

## 5. [TOOLING.DEPLOYMENT.RG] Production Deployment Script

### 5.1. [DEPLOYMENT.FEATURES.RG] Features
- **Pre-flight Checks**: Verify Bun, TypeScript, tests
- **Production Build**: Optimized build with minification
- **Health Checks**: Automated health check loop
- **Error Handling**: Graceful failure handling

### 5.2. [DEPLOYMENT.USAGE.RG] Usage
```bash
# Deploy to production
./scripts/deploy-prod.sh

# Or use npm script
bun run deploy:production
```

### 5.3. [DEPLOYMENT.STEPS.RG] Deployment Steps
1. Pre-flight checks (Bun version, TypeScript, tests)
2. Production build
3. Pre-warm caches
4. Start server
5. Health check loop (30 attempts)
6. Log completion

**Reference**: `#REF:scripts/deploy-prod.sh`

---

## 6. [TOOLING.INTEGRATION.RG] Integration Points

### 6.1. [INTEGRATION.API.RG] API Integration
Metrics endpoint added to main API:
- `GET /metrics` - Prometheus metrics

**Reference**: `#REF:src/api/routes.ts`

### 6.2. [INTEGRATION.SCRIPTS.RG] Scripts Integration
Development server script:
- `scripts/dev-server.ts` - Hot reload dev server

**Reference**: `#REF:scripts/dev-server.ts`

### 6.3. [INTEGRATION.STORAGE.RG] Storage Integration
WAL configuration utilities:
- `src/storage/wal-config.ts` - WAL optimization helpers

**Reference**: `#REF:src/storage/wal-config.ts`

---

## 7. [TOOLING.BEST_PRACTICES.RG] Best Practices

### 7.1. [PRACTICES.DEVELOPMENT.RG] Development
- Use `bun --watch` for hot reload during development
- Preserve state in SQLite for development continuity
- Use metrics for observability during development

### 7.2. [PRACTICES.PRODUCTION.RG] Production
- Enable WAL mode for high-frequency writes
- Configure appropriate checkpoint intervals
- Monitor metrics endpoint for production health
- Use deployment script for consistent deployments

### 7.3. [PRACTICES.MONITORING.RG] Monitoring
- Scrape `/metrics` endpoint with Prometheus
- Set up alerts on key metrics
- Monitor WAL size and checkpoint frequency
- Track bookmaker movement metrics

---

## 8. Status

**Status**: ✅ Bun tooling suite implemented

**Components**:
- ✅ Development server with hot reload
- ✅ Custom telemetry system
- ✅ SQLite WAL configuration
- ✅ Production deployment script

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0

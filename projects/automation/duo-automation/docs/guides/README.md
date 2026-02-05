# Duo Automation - Enterprise Platform

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![Registry](https://img.shields.io/badge/registry-v3.7%20Deployed-green.svg)
![Dashboard](https://img.shields.io/badge/dashboard-v4.0%20Enhanced-purple.svg)
![Self-Heal](https://img.shields.io/badge/self--heal-v2.01.05%20Advanced-critical.svg)
![Bun](https://img.shields.io/badge/runtime-Bun%201.3.6+-black.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)
![Timezone](https://img.shields.io/badge/timezone-v3.7%20Matrix%20Passed-success.svg)

## 🚀 Overview

Duo Automation is an enterprise-grade platform providing advanced phone analysis, cloud storage management, and automation capabilities powered by Bun runtime and TypeScript.

### 🧹 System Hygiene v2.01.05
**Status**: ✅ Advanced filesystem cleanup with enterprise features • **Features**: Parallel processing, file hashing, backup integrity verification, comprehensive audit logging  
**Security**: SHA-256 integrity verification, configurable size/age limits, backup validation • **Performance**: Parallel file operations, detailed metrics, configurable processing limits

### 🌐 Infrastructure Dashboard v4.0
**Status**: ✅ Enhanced with enterprise-grade monitoring • **Features**: Advanced caching, CORS support, health checks, rate limiting, timezone awareness  
**Security**: Multi-layered authentication, per-scope connection limits, token-based rate limiting • **Performance**: ETag caching, configurable compression, real-time metrics

### � Timezone Matrix v3.7
**Status**: ✅ All 17 tests passed • **Scope Integration**: ENTERPRISE→America/New_York, DEVELOPMENT→Europe/London, LOCAL-SANDBOX→UTC  
**Child Process Propagation**: Verified via `Bun.spawn()` • **Canonical Zones**: IANA tzdb 2025c compliant

### 📊 Status Endpoints
**Status**: ✅ Cloudflare Workers + R2 Integration • **Features**: Real-time monitoring, health checks, analytics export  
**Endpoints**: Health check, full status, metrics, analytics • **Formats**: JSON, CSV, HTML reports  
**Deployment**: Global edge network, automatic scaling, DDoS protection

### 📦 NPM Registry v3.7
**Custom Registry**: `https://duo-npm-registry.utahj4754.workers.dev`  
**Package**: `windsurf-project@2.5.0` • **Status**: ✅ Production Ready

```bash
# Install from our custom registry
bun install windsurf-project --registry https://duo-npm-registry.utahj4754.workers.dev
```

## 📚 Documentation

- **[Enhanced Inspection System](../Advanced%20Custom%20Inspection%20System%20for%20Du.md)** - Advanced inspection tools
- **[Custom Inspection System](../CUSTOM_INSPECTION_SYSTEM.md)** - Custom inspection framework  
- **[Enterprise Overview](../ENTERPRISE_OVERVIEW.md)** - Platform overview
- **[URL Organization Matrix](../URL_ORGANIZATION_MATRIX.md)** - URL system matrix
- **[Project Structure](../PROJECT_STRUCTURE.md)** - Organization guide
- **[Documentation Index](../DOCUMENTATION_INDEX.md)** - Complete documentation index

## 🏗️ System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Duo Automation Platform                   │
├─────────────────────────────────────────────────────────────┤
│  🎯 Dashboard Layer v4.0                                    │
│  ├── Infrastructure Dashboard (Port 3004)                   │
│  │   ├── Real-time Metrics & Monitoring                     │
│  │   ├── Health Checks & Diagnostics                        │
│  │   ├── Performance Analytics                              │
│  │   └── Security Monitoring                                │
│  ├── Interactive Dashboards                                 │
│  └── System Visualization                                   │
├─────────────────────────────────────────────────────────────┤
│  🔧 API Layer                                              │
│  ├── Phone Analysis Engine                                  │
│  ├── Authentication Middleware                              │
│  ├── Agent CLI Endpoints                                   │
│  ├── Storage Management APIs                                │
│  └── Infrastructure APIs (CORS, Rate Limiting)              │
├─────────────────────────────────────────────────────────────┤
│  🛠️ Service Layer                                          │
│  ├── Pattern Matrix System                                  │
│  ├── ML Risk Assessment                                    │
│  ├── Timezone Management v3.7                              │
│  └── Cross-Platform Intelligence                            │
├─────────────────────────────────────────────────────────────┤
│  💾 Storage Layer                                           │
│  ├── Cloudflare R2 Buckets                                  │
│  ├── File Management System                                │
│  ├── Response Caching (ETag)                               │
│  └── Backup & Recovery                                     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Bun Runtime, TypeScript, URLPattern API
- **Infrastructure**: v4.0 Dashboard Server, WebSocket, ETag Caching
- **Storage**: Cloudflare R2, File System, Response Cache
- **Frontend**: HTML5, Tailwind CSS, Chart.js, Lucide Icons
- **Authentication**: JWT, API Keys, OAuth 2.0, Token-based Rate Limiting
- **Security**: CORS, Per-scope Access Control, Request Validation
- **CLI**: Commander.js, Inquirer.js, Chalk.js
- **Monitoring**: Real-time Metrics, Health Checks, Performance Tracking

## 🚀 Quick Start

### Prerequisites

- Bun runtime (>= 1.3.6)
- Node.js (>= 18.0.0)
- Cloudflare R2 account (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/duo-automation.git
cd duo-automation

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the infrastructure dashboard (v4.0)
bun run server/infrastructure-dashboard-server.ts

# Start the main dashboard server
bun run examples/urlpattern-routing-demo.ts
```

### CLI Setup

```bash
# Initialize CLI configuration
bun duo-cli.ts init

# Check system status
bun duo-cli.ts status

# Test basic functionality
bun duo-cli.ts analyze +1234567890 --phone
```

### Dashboard Access

Open your browser and navigate to:
- **Infrastructure Dashboard v4.0**: http://localhost:3004
- **Health Check**: http://localhost:3004/health
- **Diagnostics**: http://localhost:3004/api/infra/diagnostics?token=your-token
- **Main Dashboard**: http://localhost:8080/urlpattern-routing-dashboard.html
- **Server API**: http://localhost:3002/api/health

#### Infrastructure Dashboard v4.0 Features
- 🏥 **Real-time Health Monitoring**: System metrics, memory usage, error tracking
- 📊 **Performance Analytics**: Request rates, cache hit rates, response times
- 🛡️ **Security Dashboard**: Connection tracking, rate limiting, token validation
- 🔧 **Admin Controls**: Dynamic configuration, cache management, feature toggles
- 🌐 **WebSocket Streaming**: Live metrics updates, command execution
- 🕐 **Timezone Awareness**: Scope-based timezone configuration

## 📊 Key Features

### Phone Analysis
- Advanced phone number intelligence
- Risk assessment and scoring
- Network analysis and history tracking
- Cross-platform integration

### Dashboard System v4.0
- **Infrastructure Monitoring**: Real-time system health and performance metrics
- **Advanced Caching**: ETag support with configurable TTL and compression
- **Security Features**: CORS, rate limiting, per-scope access control
- **Health Checks**: Comprehensive diagnostics and monitoring endpoints
- **WebSocket Streaming**: Live metrics and real-time command execution
- **Interactive Charts**: System visualization with timezone-aware timestamps
- **Alert Management**: Configurable thresholds and notifications
- **Admin Panel**: Dynamic configuration and system controls

### Storage Management
- Cloudflare R2 integration
- File upload/download with signed URLs
- Usage analytics and tracking
- Batch operations support

### CLI Tools
- Comprehensive command-line interface
- Task management and execution
- Configuration management
- Billing and subscription handling

## 🔐 Authentication

The API supports multiple authentication methods:

#### API Key Authentication
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3002/api/dashboard/metrics
```

#### JWT Bearer Token
```bash
curl -H "Authorization: Bearer your-jwt-token" http://localhost:3002/api/dashboard/metrics
```

## 📁 Project Structure

```
duo-automation/
├── duoplus/                    # Core modules
│   ├── phone-provisioning.ts   # Phone management
│   ├── team-manager.ts         # Team operations
│   ├── batch-ops.ts           # Batch operations
│   └── sdk.ts                 # Main SDK
├── examples/                   # Example implementations
├── demos/                     # Frontend demonstrations
├── docs/                      # Documentation
├── tests/                     # Test suites
└── scripts/                   # Utility scripts
```

## 🛠️ Development

### Environment Configuration

Create a `.env` file:

```bash
# Server Configuration
PORT=3002
INFRA_PORT=3004
NODE_ENV=development

# Infrastructure Dashboard v4.0
COMPRESSION_LEVEL=3
METRICS_INTERVAL=1000
MAX_CONNECTIONS_PER_SCOPE=10
CACHE_TTL=30000

# Authentication
JWT_SECRET=your-jwt-secret-here
API_KEY_SALT=your-salt-here
ADMIN_TOKEN=your-admin-token
INFRA_TOKEN=your-infra-token
DASHBOARD_TOKEN=your-dashboard-token

# Cloudflare R2 (optional)
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=duo-automation-storage

# System Hygiene v2.01.05
HEAL_TARGET_DIR=utils
HEAL_FILE_PATTERN=.*!*
HEAL_MAX_DEPTH=1
HEAL_ENABLE_METRICS=true
HEAL_ENABLE_AUDIT_LOG=true
HEAL_BACKUP_BEFORE_DELETE=false
HEAL_ENABLE_HASHING=true
HEAL_ENABLE_PARALLEL=false
HEAL_PARALLEL_LIMIT=5
HEAL_MAX_FILE_SIZE=104857600
HEAL_MIN_FILE_AGE=60000
HEAL_DEBUG=false
```

### Testing

```bash
# Run all tests
bun test

# Run timezone matrix tests (v3.7)
bun test tests/timezones/timezone-matrix.test.ts

# Run infrastructure tests
bun test tests/server/

# Test v2.01.05 self-heal script
bun run scripts/self-heal.ts --dry-run --backup

# Test enhanced CLI commands
bun ep-cli cache health --detailed
bun empire heal cleanup --dry-run

# Run with coverage
bun test --coverage

# Type checking
bun run type-check
```

### System Hygiene v2.01.05

```bash
# Advanced filesystem cleanup
bun run scripts/self-heal.ts --help

# Deep cleanup with backups
bun run scripts/self-heal.ts --backup --parallel

# Dry run simulation
bun run scripts/self-heal.ts --dry-run --no-hash

# Custom directory cleanup
bun run scripts/self-heal.ts --dir=./temp --parallel-limit=10

# Environment configuration
export HEAL_ENABLE_METRICS=true
export HEAL_ENABLE_AUDIT_LOG=true
export HEAL_BACKUP_BEFORE_DELETE=true
export HEAL_ENABLE_PARALLEL=true
```

### Code Quality

```bash
# Lint code
bun run lint

# Format code
bun run format
```

## 🚀 Deployment

### Production Deployment

```bash
# Build application
bun run build

# Deploy infrastructure dashboard v4.0
INFRA_PORT=3004 NODE_ENV=production bun run server/infrastructure-dashboard-server.ts

# Deploy to Cloudflare Workers
wrangler deploy

# Deploy with enhanced cleanup
HEAL_ENABLE_PARALLEL=true HEAL_BACKUP_BEFORE_DELETE=true bun run server/infrastructure-dashboard-server.ts
```

### CLI Commands v2.01.05

```bash
# Enhanced Cache Management
bun ep-cli cache restart --deep-cleanup --backup --parallel
bun ep-cli cache cleanup --target-dir=./temp --dry-run
bun ep-cli cache health --detailed

# Empire Advanced Healing
bun empire heal now --deep-cleanup --backup --parallel
bun empire heal cleanup --target-dir=./utils --parallel-limit=10
bun empire heal monitor --include-cleanup

# Direct Self-Heal Script
bun run scripts/self-heal.ts --backup --parallel --no-hash
bun run scripts/self-heal.ts --dry-run --dir=./logs
```

### Docker Deployment

```dockerfile
FROM oven/bun:1.3.6

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production

COPY . .
RUN bun run build

# Infrastructure Dashboard
EXPOSE 3004
# Main Dashboard
EXPOSE 3002

# Start infrastructure dashboard
CMD ["bun", "server/infrastructure-dashboard-server.ts"]
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

## 📞 Support

- **Documentation**: https://docs.duo-automation.com
- **Infrastructure Dashboard**: http://localhost:3004/health
- **GitHub Issues**: https://github.com/brendadeeznuts1111/duo-automation/issues
- **Status Page**: https://status.empire-pro-cli.com
- **Health Check**: https://status.empire-pro-cli.com/health
- **API Reference**: http://localhost:3004/api/infra/diagnostics
- **Status API**: https://status.empire-pro-cli.com/status

---

*Last updated: January 14, 2026*

# 🍎 Apple ID Creation System - Modern Architecture

## 📁 Project Structure

```text
windsurf-project/
├── 📄 main.js                    # Main orchestrator and CLI interface
├── 📄 package.json              # Dependencies and scripts
│
├── 📁 src/                      # Source code
│   ├── 📁 storage/              # Storage implementations
│   │   ├── 📄 r2-apple-manager.ts # Native R2 Manager (Bun-optimized)
│   │   └── 📄 cloudflare-r2.js  # Legacy R2 support
│   ├── 📁 sms/                  # SMS & Verification logic
│   ├── 📁 email/                # Email managers
│   └── 📁 core/                 # Core business logic
│
├── 📁 scripts/                  # Operational suites
│   ├── 📁 apple-id/             # Apple ID workflows
│   │   ├── 📄 create-single.js  
│   │   └── 📄 create-batch.js   
│   ├── 📁 sim/                  # SIM & Cloud number MGMT
│   │   ├── 📄 setup-real-sim.js
│   │   └── 📄 test-cloud-number.js
│   ├── 📁 cashapp/              # Cash App integration
│   └── 📁 maintenance/          # Health checks & cleanup
│
├── 📁 dashboards/               # Real-time monitoring
│   ├── 📁 storage/              # R2 monitoring UI
│   └── 📁 analytics/            # Success metrics UI
│
├── 📁 utils/                    # Shared utilities
│   ├── 📄 cli-filter.ts         # CLI predicate logic
│   └── 📄 super-table.ts        # Paginated terminal UI
│
├── 📁 config/                   # Configuration files
│   ├── 📄 cloudflare-r2.js      # R2 credentials
│   └── 📄 constants.ts          # Global system constants
│
├── 📁 lib/                      # Shared libraries
│   ├── 📁 email/                
│   ├── 📁 storage/              
│   └── 📁 proxy/                
│
├── 📁 accounts/                 # Local cache of generated accounts
├── 📁 logs/                     # System logs
└── 📁 reports/                  # Generated performance reports
```

## 🚀 Quick Start (Production)

### 1. Unified Dashboard

```bash
bun run dashboard
```

### 2. Batch Creation

```bash
bun run scripts/apple-id/create-batch.js --count 50
```

### 3. SIM Management

```bash
bun run scripts/sim/test-sim-reception.js
```

## 🏗️ Architecture Overview

### Core Components

#### ☁️ Bun Native R2 Manager (`src/storage/r2-apple-manager.ts`)

- **High-Performance**: Zero-dependency implementation using `Bun.fetch`.
- **Zstd Compression**: Native compression for 80%+ storage savings.
- **Presigned URLs**: Secure temporary access for uploads/downloads.
- **Local Fallback**: Automatic local storage if R2 is unavailable.

#### 📊 Dashboards (`dashboards/`)

- **Storage**: Real-time bucket status, usage, and file verification.
- **Analytics**: Conversion rates, success/failure trends, and logs.
- **Unified**: Centralized launcher for all monitoring interfaces.

#### 📱 SIM Logic (`scripts/sim/`)

- **Carrier Sync**: Automated T-Mobile account management.
- **Cloud Numbers**: Non-VOIP number rotation for bulk registration.
- **Verification**: Real-time SMS polling and parsing.

## 📊 Performance Features

- **88 IDs/s**: R2 throughput for bulk generation.
- **7.61ms**: Generation time for 500 accounts (mock).
- **Zstd Level 3**: Balanced compression/performance ratio.
- **Connection Reuse**: HTTP/2 pooling for external API calls.

## 🔒 Security

- **Presigned PUT/GET**: Minimal CORS exposure for R2.
- **App Passwords**: Secure IMAP/SMTP authentication.
- **Isolated Storage**: Bucket-level isolation for different account types.

---

**System Status**: ✅ Operational (v2.5)  
**Last Updated**: 2026-01-12

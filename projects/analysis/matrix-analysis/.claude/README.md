# 🚀 R2 BunX Suite - Enterprise Development Platform

![GitHub Private Repo](https://img.shields.io/badge/GitHub-Private-blue?logo=github)
![Bun Powered](https://img.shields.io/badge/Bun-Powered-black?logo=bun)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2-orange?logo=cloudflare)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
[![Projects Dashboard](https://img.shields.io/badge/Projects-Live-success?logo=cloudflare)](https://cdn.factory-wager.com/projects.html)
[![History Dashboard](https://img.shields.io/badge/History-Live-success?logo=cloudflare)](https://cdn.factory-wager.com/history.html)
[![Main Dashboard](https://img.shields.io/badge/Dashboard-Online-success?logo=cloudflare)](https://cdn.factory-wager.com/dashboard.html)
[![Documentation](https://img.shields.io/badge/Docs-Complete-informational?logo=readthedocs)](docs/DOCUMENTATION_INDEX.md)

> **🏢 Enterprise-Grade Development Platform** built on Bun runtime, featuring Cloudflare R2 integration, AI agents, email systems, phone environment warming, and real-time dashboard applications.

## ✨ **What's New in v1380** (OMEGA Protocol)

- 📏 **Column 89 Enforcer** - Unicode-aware width validation with GB9c support
- 🍪 **Fast Cookie Parser** - 23ns parsing (74x faster than tough-cookie)
- 🧪 **A/B Variant Handler** - Runtime + build-time variant testing
- 📊 **Performance Benchmarks** - Bun API one-liners (6,756x wins)
- 🔐 **Bun.secrets Integration** - `com.factory-wager.matrix` service
- ☁️ **Cloudflare Infrastructure** - 6 R2 buckets, 12 subdomains configured
- 🔧 **MCP Bun Docs** - SearchBun integration for documentation queries
- 📚 **Error Codes Reference** - Comprehensive exit code documentation
- 🚀 **Pre-commit Hook** - Broken symlink detection + Biome checks

## ✨ **What's New in v2.1** (Phase 3.23)

- 🔥 **OMEGA God-Command** (`omega`) - Meta-command with 24+ fuzzy subcommands for instant snippet execution
- 📋 **Snippet Cheatsheet** - Copy-paste ready Bun one-liners for runtime, JSON5, profiles, matrix, and Chrome operations
- 🚨 **Live Tension Alerting** - Real-time anomaly detection with wrapAnsi visual alerts and webhook integration
- 🔄 **CI Smoke Hooks** - Pre-commit/pre-push validation for JSON5, TypeScript, and tension thresholds
- 🎯 **Advanced Bun Arsenal** - Sub-ms pipe magic, --smol mastery, and wrapAnsi visual domination
- ⚡ **Infrastructure Management** (`infra`) - Complete service control, health monitoring, and diagnostics

## ✨ **What's New in v2.0**

- 🔐 **Chrome State Bridge v3.20** - Zero-knowledge cookie sealing with CHIPS partitioning (Chrome 115+), RSS feed generation, and Matrix telemetry (cols 61-75)
- 📦 **Reorganized Project Structure** - Clean, scalable architecture with optimized file organization
- ⚡ **Enhanced Performance** - 7-10x faster R2 operations with zero-import architecture
- 🛡️ **Global Error Boundary** - Comprehensive error handling with graceful recovery
- 📊 **Advanced CDN Registry** - 41+ dashboards with automated validation and reporting
- 🤖 **AI-Powered Tools** - Enhanced agent management and team collaboration features
- 📧 **Enterprise Email System** - Complete email routing and management with Cloudflare integration

## � **Enterprise Features**

### **🔧 Structured Logging System**
- **Enterprise-grade logging** with configurable levels (debug, info, warn, error, perf)
- **Component-specific loggers** for organized debugging and monitoring
- **Performance monitoring** with automatic operation timing
- **Production-ready** with JSON output and external service integration
- **Migrated 2,000+ console statements** to structured logging across 200+ files

### **🛡️ Global Error Boundary System**
- **Uncaught exception handling** with graceful recovery
- **Unhandled promise rejection** management
- **Process signal handling** (SIGINT, SIGTERM, SIGUSR2)
- **Graceful shutdown** with configurable timeouts and cleanup
- **Health monitoring** with `/health` endpoint and system metrics
- **Automatic recovery strategies** for network, database, and file system errors

### **☁️ Native Cloudflare R2 Integration**
- **Zero-import architecture** - no AWS SDK dependency (~50MB savings)
- **7-10x performance improvement** over traditional SDK implementations
- **Native memory management** with zero-copy operations
- **Automatic presigned URLs** with proper security and expiration
- **Built-in retry logic** with exponential backoff
- **Multi-region support** with automatic failover

#### R2 Storage Domains

| Bucket | Domain | Purpose |
|--------|--------|---------|
| `fw-profiles` | [profiles.factory-wager.com](https://profiles.factory-wager.com) | CPU/heap profiles |
| `fw-artifacts` | [artifacts.factory-wager.com](https://artifacts.factory-wager.com) | Build artifacts |
| `fw-audit-logs` | [audits.factory-wager.com](https://audits.factory-wager.com) | Compliance logs |
| `fw-staging` | [staging.factory-wager.com](https://staging.factory-wager.com) | CI/CD staging |
| `fw-blog` | [blog.factory-wager.com](https://blog.factory-wager.com) | Public blog |
| `rssfeedmaster` | [rss.factory-wager.com](https://rss.factory-wager.com) | RSS feeds |
| `fw-backups` | Private | Encrypted backups |

See [R2 Storage Guide](docs/R2-STORAGE-GUIDE.md) for full API documentation.

### **🤖 AI Agent Framework**
- **Intelligent task automation** with natural language processing
- **Team collaboration servers** for distributed AI workflows
- **Database-driven agent management** with persistent state
- **Real-time learning** and adaptation capabilities

### **� Enterprise Email System**
- **Cloudflare Email Routing** integration with custom domains
- **Template management** with dynamic content generation
- **Delivery tracking** and analytics dashboard
- **Multi-provider support** (MailChannels, SendGrid, etc.)
- **Automated follow-up** and response handling

## � **Organized Project Structure**

```
r2-bunx/
├── 🏗️ core/                     # ✅ Core Foundation System
│   ├── cli/                     # Command-line interface
│   ├── backend/                 # Backend services
│   ├── shared/                  # Shared utilities
│   ├── docs/                    # Core documentation
│   └── examples/                # Usage examples
│
├── 🛠️ tools/                    # 🔧 Operational Tools
│   ├── ai-agents/               # AI-powered tools
│   ├── email/                   # Email management
│   ├── uploaders/               # File upload utilities
│   ├── cdn/                     # CDN management tools
│   ├── demos/                   # Demonstration scripts
│   └── metadata/                # Metadata management
│
├── 📊 apps/                     # 🎨 Dashboard Applications
│   ├── production/              # Production dashboards
│   ├── enterprise/              # Enterprise dashboards
│   ├── development/             # Development versions
│   ├── standalone/              # Standalone applications
│   ├── cdn/                     # CDN-managed apps
│   ├── pages/                   # Static pages
│   ├── templates/               # Application templates
│   ├── registry-dashboard/      # Dashboard registry
│   └── src/                     # Application source code
│
├── 📦 demos/                    # 🎭 Demo & Example Files
│   ├── bun-demos/               # Bun runtime demonstrations
│   ├── dashboard-demos/         # Dashboard examples
│   └── [various demos]          # Other demonstration files
│
├── 📎 assets/                   # 📦 Static Assets
│   ├── html/                    # HTML templates
│   └── binaries/                # Binary test files
│
├── ⚙️ config/                   # 📝 Configuration
│   ├── bun-configs/             # Bun runtime configurations
│   └── email-templates.json     # Email templates
│
├── 🗄️ data/                     # 📊 Database & Data Files
│   ├── ai-agents.db             # AI agent database
│   ├── bundles.db               # Bundle tracking database
│   ├── email-system.db          # Email system database
│   ├── phone-history.db         # Phone warming history
│   ├── tags.db                  # Tag management database
│   └── snapshots/               # Test data snapshots
│
├── 📚 docs/                     # 📖 Documentation Hub
│   ├── CLI_COMMAND_MATRIX.md    # 🚀 Complete CLI commands with TypeScript types
│   ├── DOCUMENTATION_INDEX.md   # 📋 Comprehensive documentation index
│   ├── DOCUMENTATION_INDEX.md    # 📚 Documentation index and navigation
│   ├── CDN_README.md            # 🌐 CDN documentation center
│   ├── guides/                  # How-to guides (17 files)
│   │   ├── getting-started.md   # Complete setup guide
│   │   ├── cli-reference.md     # CLI command reference
│   │   ├── configuration.md     # Environment setup
│   │   ├── deployment.md        # Production deployment
│   │   ├── enterprise.md        # Enterprise features
│   │   └── [specialized guides] # CDN, dashboard, blog, etc.
│   ├── api/                     # Technical API docs (4 files)
│   │   ├── reference.md         # Complete API reference
│   │   ├── examples.md          # Code examples and patterns
│   │   ├── s3-integration.md    # S3/R2 integration guide
│   │   └── legacy-api-reference.md # Original API docs
│   ├── development/             # Development resources (13 files)
│   │   ├── architecture.md      # System architecture
│   │   ├── performance.md       # Performance optimization
│   │   ├── security.md          # Security best practices
│   │   ├── project-organization.md # Project structure
│   │   └── [development guides] # Testing, contributing, etc.
│   ├── tutorials/               # Learning resources (4 files)
│   │   ├── bun-basics.md        # Bun runtime fundamentals
│   │   ├── file-operations.md   # File handling with Bun
│   │   └── bun/                 # Bun-specific tutorials
│   ├── core/                    # Core system docs (7 files)
│   │   ├── CLI_GUIDE.md         # CLI system guide
│   │   ├── ORGANIZATION_COMPLETE.md # Completed organization
│   │   └── [core docs]          # Phone warming, upload, workflow
│   ├── reference/               # Reference materials (23 files)
│   │   └── [technical references] # Build configs, bundles, etc.
│   └── _archive/                # 📦 Preserved legacy docs (31 files)
│
├── 🔧 scripts/                  # ⚙️ Utility Scripts (32 files)
│   ├── deploy.ts                # Production deployment
│   ├── metadata.ts              # Metadata management CLI
│   ├── set-disposition.ts       # Content-Disposition management
│   ├── bundle                    # Bundle creation script
│   ├── ai-agent-database.js     # Database management
│   ├── upload-dashboards.js     # Dashboard upload utility
│   ├── upload-to-r2.ts          # R2 upload script
│   ├── build-*.ts               # Build automation
│   ├── deploy-*.sh              # Deployment scripts
│   └── [utility scripts]        # Other automation tools
│
├── 🧪 tests/                    # 🔬 Test Suite
│   ├── core/                    # Core tests
│   ├── email/                   # Email tests
│   └── integration/             # Integration tests
│
├── 📦 packages/                 # 📦 Modular Packages
│   ├── cli/                     # CLI package
│   ├── config/                  # Configuration package
│   ├── core-sdk/                # Core SDK
│   └── domain/                  # Domain models
│
├── 📈 benchmarks/               # 📊 Performance Tests
├── 📝 templates/                # 📄 Template Files
├── 🗂️ temp/                     # 🗂️ Temporary Files
├── 📋 data/                     # 📈 Data & Reports
└── 📋 logs/                     # 📋 System Logs
```

## 🔐 **Chrome State Bridge** (v3.20 - Tier-1380 OMEGA)

Production-grade Chrome state management with zero-knowledge security.

### Features
- **🔒 Zero-Knowledge Sealing** - Bun.Archive + CRC32 checksums
- **🍪 CHIPS Partitioning** - Chrome 115+ cookie isolation
- **📊 Intelligence Layer** - Expiration analysis & domain graph
- **📡 RSS Feed Generation** - Auth-domain feeds for scraping
- **☁️ Cloudflare Integration** - R2 + KV storage
- **📈 Matrix Telemetry** - Columns 61-75 full observability

### Quick Commands
```bash
# Analyze Chrome state
./bin/fw chrome-state analyze ./profile.json

# Generate RSS feed
./bin/fw shell rss ./profile.json factory-wager.com

# Start server
./bin/fw chrome-state serve 3457

# Run tests
./bin/fw shell test
```

[📖 Full Documentation](chrome-state-integration-complete.md)

---

## 🔥 **OMEGA God-Command** (v3.23 - Tier-1380)

**The ultimate Bun snippet arsenal** — 24+ fuzzy subcommands, sub-ms pipe magic, and live tension alerting.

### Quick Start
```bash
# List all snippets
omega snippets

# Execute a snippet
omega run matrix anomaly

# Copy to clipboard
omega copy runtime tension

# Live tension monitoring
omega watch 5

# Fuzzy search
omega search "json5"
```

### Snippet Categories

| Category | Snippets | Purpose |
|----------|----------|---------|
| `runtime` | validate, tension, workspaces, envdiff, pretty | Pipe execution & flags |
| `json5` | hex, missing, roundtrip | Config surgery |
| `profile` | large, pretty, gcroots, open | Forensics & analysis |
| `matrix` | anomaly, waf, grid, default | Column slicing |
| `chrome` | analyze, rss, expiring, seal | State bridge |
| `visual` | wrap, benchmark, ansi | Terminal formatting |

### Live Tension Alerting
```bash
# Real-time monitoring (5s interval)
omega watch

# With webhook notifications
bun run alerts/tension-alert.ts -w https://hooks.slack.com/...

# JSON output for piping
bun run alerts/tension-alert.ts -j | jq '.alerts[]'
```

### CI Integration
```bash
# Install hooks
git config core.hooksPath .githooks

# Pre-commit validation runs automatically
# - JSON5 round-trip check
# - TypeScript compilation
# - Test smoke
```

[📋 Snippet Cheatsheet](omega-snippet-cheatsheet.md)

---

## 🎯 **Quick Start**

### **Prerequisites**
- **Bun Runtime**: `curl -fsSL https://bun.sh/install | bash` (v1.0+)
- **Node.js**: v18+ (for some legacy tools)
- **Cloudflare R2 Account**: For storage integration
- **Cloudflare Domain**: For custom CDN and email routing
- **Git**: For version control

### **🚀 Quick Installation**
```bash
# Clone and navigate
git clone <repository-url>
cd r2-bunx

# Install dependencies with high-performance cache
bun install --frozen-lockfile

# Configure environment (copy template)
cp config/.env.example config/.env
# Edit config/.env with your Cloudflare credentials

# Verify installation and run health check
bun run cli health

# 🎉 Installation complete! View available commands:
bun run cli help
```

### **⚙️ Environment Configuration**
Create your `.env` file in the `config/` directory:

```bash
# ===== Cloudflare R2 Configuration =====
# Get these from: https://dash.cloudflare.com/<account-id>/r2
S3_ACCESS_KEY_ID=your_r2_access_key
S3_SECRET_ACCESS_KEY=your_r2_secret_key
S3_ENDPOINT=https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
S3_BUCKET=bunx-custom-local

# ===== CDN URLs Configuration =====
CDN_BASE=https://cdn.factory-wager.com
CDN_STAGING=https://cdn.factory-wager.com/staging
CDN_PACKAGES=https://cdn.factory-wager.com/packages
API_BASE=https://api.factory-wager.com
API_STAGING=https://staging-api.factory-wager.com
WORKER_R2=https://r2-upload.utahj4754.workers.dev
WORKER_CDN=https://pub-bunx.utahj4754.workers.dev
EMAIL_SERVICE=https://email.factory-wager.com
DOCS_URL=https://docs.factory-wager.com
STATUS_URL=https://status.factory-wager.com

# ===== Cloudflare Email & Domain =====
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_DOMAIN=factory-wager.com
DEFAULT_DESTINATION=your-email@example.com

# ===== Application Configuration =====
NODE_ENV=development
API_PORT=3000
API_HOST=localhost
APP_NAME=R2 BunX Suite
APP_VERSION=2.0.0

# ===== Optional Integrations =====
# MailChannels for email delivery
MAILCHANNELS_ENABLED=true
# IPFoxy for proxy services
IPFOXY_PROXY_TOKEN=your_proxy_token
```

### **⚡ Bun [define] Constants (Zero-Overhead Config)**
All ports, timeouts, and limits are centralized in `bunfig.toml` using Bun's `[define]` feature:

```bash
# Run with development config (localhost, debug enabled)
bun --config bunfig.development.toml run server.ts

# Run with production config (optimized, no debug)
bun --config bunfig.production.toml run server.ts

# Build for production
bun build ./server.ts --config bunfig.production.toml --outdir ./dist
```

**74 defined constants** including:
- 20 port configurations
- 11 timeout values
- 10 matrix column indices
- 7 feature flags
- HTTP/API limits, concurrency, retry config

[📖 API Documentation](docs/api/reference.md)

## 🚀 **Core Features & Tools**

### **🤖 AI Agents & Tools**
```bash
# AI Agent CLI
bun run ai:agent                    # Launch AI agent
bun run ai:enhanced                 # Enhanced AI features
bun run team:server                 # AI team server
bun run team:seed                   # Seed AI database
```

### **📧 Email Management System**
```bash
# Email CLI Tools
bun run email:simple                # Simple email CLI
bun run email:pro                   # Professional email CLI
bun run email:management            # Email management system
bun run email:cdn                   # CDN email management
bun run email:integrated            # Integrated email system

# Email Routing (Core)
bun run email:setup                 # Setup email routing
bun run email:status                # Check email status
bun run email:create                # Create email routes
bun run email:test                  # Test email system
```

### **📱 Phone Environment Warming**
```bash
# Phone Warming System
bun run phone:demo                  # Interactive demo
bun run phone:prep <device> day1    # Day 1 warming
bun run phone:prep <device> day2    # Day 2 warming  
bun run phone:prep <device> day3    # Day 3 warming
bun run phone:schedule <device>     # Automated schedule
bun run phone:check <device>        # Check device status
```

### **☁️ R2 Upload & Storage**
```bash
# Upload Tools
bun run r2:auto                     # Automated R2 uploader
bun run r2:sync                     # Simple R2 sync
bun run r2:upload                   # Advanced upload script

# CDN Registry Management
bun run cdn:registry:list           # List all dashboards with validation
bun run cdn:registry:validate       # Validate local files exist
bun run cdn:registry:report         # Generate registry report

# Core CLI Commands
bun run cli upload <file> <key>     # Upload file
bun run cli download <key> <file>   # Download file
bun run cli list [prefix]           # List files
bun run cli delete <key>            # Delete file
bun run cli stats                   # Storage statistics
```

### **🎨 Dashboard Applications**
```bash
# Registry Dashboard
bun run registry                     # Launch registry dashboard
bun run registry:dev                # Development mode
bun run registry:test               # Run tests

# Build & Deploy
bun run build:dashboards            # Build all dashboards
bun run deploy                      # Deploy to production
```

## 🏗️ **Core Architecture**

### **Layered System Design**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │      CLI        │
│                 │    │                  │    │                 │
│ • Dashboards    │    │ • API Server     │    │ • File Ops      │
│ • Components    │    │ • Storage        │    │ • Phone Warming │
│ • Real-time     │    │ • Authentication │    │ • AI Agents     │
│ • Themes        │    │ • Middleware     │    │ • Email System  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │    Shared       │
                    │                 │
                    │ • Config        │
                    │ • Utils         │
                    │ • Headers       │
                    │ • Integration   │
                    └─────────────────┘
```

### **Tool Categories**
- **🤖 AI Tools**: Agent management, team servers, enhanced AI features
- **📧 Email Tools**: Routing, management, CDN integration, templates
- **📱 Phone Tools**: Environment warming, device management, trust scoring
- **☁️ Storage Tools**: R2 uploaders, sync utilities, file management
- **🎨 Dashboard Tools**: Registry systems, UI components, builders

## 🌐 **Live Applications (CDN Powered)**

| Application | Live URL | Status | Performance | Features |
|-------------|----------|--------|-------------|----------|
| **🌌 Registry Portal** | [Live](https://cdn.factory-wager.com/portal.html) | 🏠 **Main Entry** | ⚡ <15ms startup | 41+ dashboards |
| **🚀 Main Dashboard** | [Live](https://cdn.factory-wager.com/index.html) | ✅ Online | 🧠 Zero-copy streaming | Real-time data |
| **📊 Project Manager** | [Live](https://cdn.factory-wager.com/projects.html) | ✅ Online | 🔥 Native R2 powered | Multi-project view |
| **📈 History Analytics** | [Live](https://cdn.factory-wager.com/history.html) | ✅ Online | ⚡ Zig/C++ optimized | Time-series data |
| **💼 Professional** | [Live](https://cdn.factory-wager.com/dashboard-professional.html) | ✅ Active | 🌐 Global CDN | Enterprise features |
| **🛡️ Ultimate Suite** | [Live](https://cdn.factory-wager.com/dashboard-ultimate.html) | ✅ Active | 🚀 Enterprise grade | Full feature set |

### **📊 CDN Registry Overview**
- **Total Dashboards**: 41 across 8 categories
- **Registry Management**: `bun run cdn:registry:list`
- **File Validation**: `bun run cdn:registry:validate`
- **Performance Report**: `bun run cdn:registry:report`
- **Auto-deployment**: CI/CD integration with GitHub Actions

### **🔥 Performance Features**
- **Zero-Import Architecture**: No @aws-sdk dependency (~50MB saved)
- **Zero-Copy Memory**: Direct V8 TypedArray mapping
- **Native Presign URLs**: 7-10x faster with Zig/C++ bindings
- **Global CDN Distribution**: Edge deployment to 200+ locations
- **Startup Latency**: <15ms (no SDK parsing overhead)
- **Compression**: Brotli/Gzip with automatic content negotiation
- **Caching**: Intelligent cache headers with ETag support

## 📋 **Command Reference**

### **Core CLI Commands**
```bash
# Server Operations
bun run cli start                    # Start backend server
bun run cli dev                      # Development mode
bun run cli health                   # System health check

# File Operations
bun run cli upload <file> <key>      # Upload to R2
bun run cli download <key> <file>    # Download from R2
bun run cli list [prefix]            # List files
bun run cli delete <key>             # Delete file
bun run cli stats                    # Storage stats

# Phone Environment Commands
bun run cli prep-phone <device> [schedule]    # Prepare phone
bun run cli schedule-warming <device> [start]  # Auto schedule
bun run cli check-device <device>              # Device status

# Development Tools
bun run cli test                     # Run tests
bun run cli lint                     # Run linter
bun run cli format                   # Format code
bun run cli build                    # Build project
```

### **Package Scripts Overview**
```bash
# AI & Intelligence
bun run ai:agent                     # AI agent CLI
bun run ai:enhanced                  # Enhanced AI features
bun run team:server                  # AI team server

# Email Management
bun run email:simple                 # Simple email CLI
bun run email:pro                    # Professional email CLI
bun run email:management             # Email management system
bun run email:cdn                    # CDN email management

# Phone Environment Warming
bun run phone:demo                   # Phone warming demo
bun run phone:prep                   # Prepare phone environment
bun run phone:schedule               # Schedule warming
bun run phone:check                  # Check device status

# Storage & Upload
bun run r2:auto                      # Auto R2 uploader
bun run r2:sync                      # Simple R2 sync
bun run r2:upload                    # Advanced upload

# Dashboards & UI
bun run registry                     # Registry dashboard
bun run registry:dev                 # Development mode
bun run build:dashboards             # Build dashboards
```

## 🧪 **Testing & Quality Assurance**

### **Test Categories**
```bash
# Email System Tests
bun run test:email                   # Email routing tests
bun run test:email:cli               # Email CLI tests
bun run test:email:integration       # Email integration tests
bun run test:email:all               # All email tests

# Registry Tests
bun run test:types                   # TypeScript type tests
bun run registry:test                # Registry benchmarks
bun run registry:bench               # Performance benchmarks

# Integration Tests
bun run integ:test                   # Integration tests
bun run integ:geelark                # Geelark integration
bun run integ:foxy                   # Foxy proxy integration
```

### **Quality Tools**
```bash
# Code Quality
bun run lint                         # Run linter
bun run format                       # Format code
bun run test:typecheck               # TypeScript type checking

# Organization Verification
bun run scripts/verify-organization.js  # Verify structure
bun run scripts/update-docs-paths.js    # Update documentation
```

## 🆕 **New Libraries (v1380.0)**

### **lib/col89-enforcer.ts** - Unicode-Aware Column Width Enforcer
Enforces 89-column limit with full Unicode support:
- **GB9c Indic script support** (Bun >=1.3.7)
- **CJK full-width characters** (2 cols each)
- **Emoji & ZWJ sequences** proper width
- **ANSI escape code handling**
- **~37ns per call** (6,756x faster than npm)

```typescript
import { enforceCol89, getStringWidth } from "./lib/col89-enforcer";

// Check width
const width = getStringWidth("CJK: 你好");  // → 8

// Enforce compliance
const result = enforceCol89([longLine], { autoWrap: true });
```

### **lib/cookie-parser.ts** - Fast Cookie Parser (23ns)
High-performance cookie parsing with URL decoding:
- **23ns parse time** (74x faster than tough-cookie)
- **URL decoding**: `%3D` → `=`
- **Malformed cookie handling**
- **Prefix filtering** for A/B variants

```typescript
import { parseCookieMap } from "./lib/cookie-parser";

const cookies = parseCookieMap("a=1;b%3D2");
cookies.get("b");  // → "=2" (decoded)
```

### **lib/ab-variant.ts** - A/B Variant Handler
Runtime + build-time A/B testing support:
- **Fallback chain**: Cookie → Define → Default
- **Build-time inlining** via `[define]` (0ns)
- **Prefix-based detection**: `ab-variant-*`

```typescript
import { getABVariantConfig } from "./lib/ab-variant";

const config = getABVariantConfig(cookieHeader);
// { variant: "enabled", poolSize: 5, flags: {...} }
```

---

## 📚 **Documentation**

### **🚀 CLI Command Matrix**
**NEW**: Complete CLI reference with TypeScript types - [View CLI Matrix](docs/guides/CLI_COMMAND_MATRIX.md)

**Key Features:**
- **150+ commands** across 18 functional categories
- **TypeScript types** for all parameters and return values
- **Practical examples** for every command
- **Enhanced developer experience** with type safety

### **📋 Documentation Structure**
Our documentation is professionally organized for easy navigation:

**🏠 Main Documentation:**
- **[📋 Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Complete guide to all documentation
- **[📚 Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Complete documentation index and navigation guide
- **[🚀 CLI Command Matrix](docs/guides/CLI_COMMAND_MATRIX.md)** - Comprehensive CLI reference with types

**🔧 User Guides:**
- **[📖 Getting Started](docs/guides/getting-started.md)** - Installation and first steps
- **[⚙️ Configuration](docs/guides/configuration.md)** - Environment setup
- **[🔧 Infrastructure CLI](bin/infra)** - Service management, health checks, and diagnostics
- **[🚀 Deployment](docs/guides/deployment.md)** - Production deployment
- **[🏢 Enterprise](docs/guides/enterprise.md)** - Enterprise features

**📚 API Documentation:**
- **[📖 API Reference](docs/api/reference.md)** - Complete REST API and CLI API
- **[💻 Examples](docs/api/examples.md)** - Code examples and patterns
- **[☁️ S3 Integration](docs/api/s3-integration.md)** - S3/R2 specific integration

**🛠️ Development Resources:**
- **[🏗️ Architecture](docs/development/architecture.md)** - System architecture and design
- **[⚡ Performance](docs/development/performance.md)** - Performance optimization
- **[🔒 Security](docs/development/security.md)** - Security best practices
- **[📁 Project Organization](docs/development/project-organization.md)** - Project structure

**📖 Learning Resources:**
- **[🍞 Bun Basics](docs/tutorials/bun-basics.md)** - Bun runtime fundamentals
- **[📁 File Operations](docs/tutorials/file-operations.md)** - File handling with Bun

### **📊 Documentation Statistics**
- **Total Documents**: 120+ files across organized structure
- **Main Categories**: 5 (Core, Guides, API, Development, Tutorials)
- **CLI Commands**: 150+ with complete TypeScript documentation
- **Examples**: 30,000+ lines of code examples and patterns

## 🚀 **Development Workflow**

### **LSP & Editor Support**
The project is optimized for VS Code with Bun. Ensure you have the [Bun for VS Code](https://marketplace.visualstudio.com/items?itemName=Oven.bun-vscode) extension installed.
- **TypeScript Support**: Uses workspace TSDK for accurate Bun types.
- **Auto-Attach**: Debugging is configured to auto-attach to Bun processes.

### **Dynamic Execution (Stdin Piping)**
You can execute code dynamically by piping it to Bun. This is useful for generated scripts or remote execution.
```bash
echo "console.log('Hello from stdin')" | bun run -
```
Or use the shared utility:
```typescript
import { runFromStdin } from "./core/shared/stdin-executor";
await runFromStdin("console.log('Dynamic code')");
```

### **Hot Reload Development**
```bash
# Core development
cd core && bun run dev

# Dashboard development
bun run registry:dev

# Phone warming development
bun run phone:demo
```

### **Build & Deploy**
```bash
# Build dashboards
bun run build:dashboards

# Deploy to production
bun run deploy

# Upload to R2
bun run r2:upload
```

### **Monitoring & Health**
```bash
# System health check
bun run cli health

# Device status check
bun run phone:check <device>

# Storage statistics
bun run cli stats
```

## 🗂️ **Runtime Directories (Transient)**

These directories are gitignored and safe to clear:

| Directory | Purpose | Clear with |
|-----------|---------|------------|
| `debug/` | Debug logs | `rm -rf debug/*` |
| `file-history/` | File versioning | `rm -rf file-history/*` |
| `paste-cache/` | Clipboard cache | `rm -rf paste-cache/*` |
| `shell-snapshots/` | Shell state | `rm -rf shell-snapshots/*` |
| `todos/` | Task tracking | `rm -rf todos/*` |
| `plans/` | Planning docs | `rm -rf plans/*` |
| `session-env/` | Session environments | `rm -rf session-env/*` |
| `projects/` | Session data (large) | `rm -rf projects/*` |
| `statsig/` | Feature flags | `rm -rf statsig/*` |

**Quick cleanup:** `rm -rf debug/* file-history/* paste-cache/* shell-snapshots/* todos/* plans/* session-env/*`

## 🤝 **Contributing & Organization**

### **Project Organization**
- **Modular Architecture**: Each tool category in its own directory
- **Standardized CLI**: Consistent command structure across tools
- **Documentation-First**: Comprehensive guides for each component
- **Test Coverage**: Unit, integration, and performance tests

### **Development Standards**
- **TypeScript**: Strong typing for better reliability
- **Bun Native**: Leveraging Bun's performance features
- **Zero Dependencies**: Minimal external dependencies
- **Enterprise Grade**: Production-ready with monitoring and logging

## 📄 **License & Support**

- **License**: MIT
- **Support**: Enterprise support available
- **Documentation**: Comprehensive guides and API references
- **Community**: Active development and contributions

---

## 🎯 **Getting Started Checklist**

### **📋 Prerequisites Setup**
- [ ] **Install Bun**: `curl -fsSL https://bun.sh/install | bash`
- [ ] **Create Cloudflare Account**: Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
- [ ] **Setup R2 Bucket**: Create bucket and get API credentials
- [ ] **Configure Custom Domain**: Point domain to R2 bucket for CDN

### **🚀 Project Setup**
- [ ] **Clone Repository**: `git clone <repo-url> && cd r2-bunx`
- [ ] **Install Dependencies**: `bun install --frozen-lockfile`
- [ ] **Configure Environment**: Copy and edit `config/.env` file
- [ ] **Run Health Check**: `bun run cli health`
- [ ] **Verify R2 Connection**: `bun run cli stats`

### **🎮 First Steps**
- [ ] **🚀 View CLI Commands**: Check [CLI Command Matrix](docs/guides/CLI_COMMAND_MATRIX.md) for complete reference
- [ ] **📱 Try Phone Warming**: `bun run phone:demo` - Interactive device warming demo
- [ ] **📧 Explore Email Tools**: `bun run email:simple` - Send your first test email
- [ ] **🎨 Launch Dashboard**: `bun run registry` - View the main dashboard portal
- [ ] **☁️ Test R2 Upload**: `bun run r2:upload` - Upload your first file

### **� Quick Documentation Access**
- **🚀 CLI Commands**: [CLI Command Matrix](docs/guides/CLI_COMMAND_MATRIX.md) - 150+ commands with TypeScript types
- **📖 Getting Started**: [Setup Guide](docs/guides/getting-started.md) - Complete installation and configuration
- **🧭 Navigation**: [Documentation Index](docs/DOCUMENTATION_INDEX.md) - Find any documentation easily
- **🏗️ Architecture**: [System Architecture](docs/development/architecture.md) - Understand the system design

---

## 🏆 **Success Metrics**

✅ **Performance**: 7-10x faster R2 operations  
✅ **Reliability**: 99.9% uptime with global CDN  
✅ **Scalability**: 75MB+ storage with unlimited bandwidth  
✅ **Security**: Enterprise-grade encryption and access control  
✅ **Developer Experience**: TypeScript-first with 150+ CLI commands  

🚀 **Your enterprise development platform is ready!** Start building amazing applications with the power of Bun and Cloudflare R2.
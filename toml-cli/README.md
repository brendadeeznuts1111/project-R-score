# Empire Pro Config Manager + Virtual Device Integration

A production-ready CLI tool for managing TOML configurations with Cloudflare R2 storage integration, **plus comprehensive virtual device management and API integrations**, built with Bun and TypeScript.

## 🚀 Quick Start

```bash
# Install (Bun required)
bun install

# Create a config
bun run init

# Validate config
bun run validate

# Show help
bun run help

# 🚀 NEW: Virtual Device Dashboard
bun run devices:dashboard

# 🚀 NEW: API Integrations Demo
bun run api:demo

# 🚀 NEW: Full System Demo
bun run system:full-demo
```

## 📚 Documentation

- **[README](docs/README.md)** - Complete user guide
- **[Quick Start](docs/QUICKSTART.md)** - 1-minute setup
- **[Implementation](docs/IMPLEMENTATION.md)** - Technical details
- **[Test Results](docs/TEST_RESULTS.md)** - Performance benchmarks
- **[Test Guide](docs/TEST_GUIDE.md)** - How to run tests

## 📁 Project Structure

```
toml-cli/
├── src/
│   └── config-manager.ts          # Main CLI application (561 lines)
├── tests/
│   ├── unit/
│   │   └── config-manager.test.ts # 22 unit tests
│   └── bench/
│       └── config-manager.benchmark.ts # Performance benchmarks
├── examples/
│   ├── config.toml               # Sample configuration
│   ├── demo.toml                 # Demo configuration
│   └── test-config.toml          # Test configuration
├── scripts/
│   └── create-bucket.ts          # R2 bucket creation helper
├── docs/
│   ├── README.md                 # Full documentation
│   ├── QUICKSTART.md             # 1-minute setup
│   ├── IMPLEMENTATION.md         # Technical overview
│   ├── TEST_RESULTS.md           # Benchmark results
│   └── TEST_GUIDE.md             # Test instructions
├── package.json                  # NPM/Bun metadata
├── bunfig.toml                   # Bun configuration
├── .env.example                  # Environment template
└── .gitignore                    # Git ignore rules
```

## ⚡ Compile-Time Feature Flags

Build optimized variants for different environments with **dead code elimination**:

```bash
# Production (smallest bundle)
bun build --minify src/index.ts

# Development (with debug tools and mocks)
bun build --feature=DEVELOPMENT --feature=DEBUG --feature=MOCK_API --minify src/index.ts

# Enterprise (with premium features)
bun build --feature=ENTERPRISE --feature=PREMIUM_SECRETS --feature=R2_STORAGE --minify src/index.ts

# Testing (with mock APIs)
bun build --feature=MOCK_API --feature=DEBUG --minify src/index.ts
```

**Benefits:**
- ✅ **Dead Code Elimination** — Unreachable branches removed completely at compile time
- ✅ **Minimal Overhead** — Each feature adds <100 bytes to bundle
- ✅ **Type Safe** — Features checked at build time with TypeScript
- ✅ **No Runtime Overhead** — Feature checks replaced with constants

[📖 Feature Flags Guide](docs/FEATURE_FLAGS_GUIDE.md) | [📊 Build Optimization](docs/BUILD_OPTIMIZATION.md)

## ⚡ Commands

```bash
# Initialize
bun run init -f config.toml

# Validate
bun run validate -f config.toml

# Upload to R2
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET="empire-configs"
bun run src/config-manager.ts upload -e prod

# Full workflow
bun run src/config-manager.ts help

# Build feature variants
bun run build:prod        # Production
bun run build:dev         # Development + debug + mocks
bun run build:enterprise  # Enterprise features
bun run build:debug       # Debug only
```

## 🧪 Testing

```bash
# Run all tests
bun test tests/unit/config-manager.test.ts

# Run benchmarks
bun tests/bench/config-manager.benchmark.ts
```

## ✅ Features

- ✅ TOML config generation and validation
- ✅ Cloudflare R2 storage integration
- ✅ Multi-environment support (dev/staging/prod)
- ✅ Smart sync with change detection
- ✅ Full CLI with help system
- ✅ 22 passing unit tests
- ✅ Performance benchmarks
- ✅ Production-ready code

## 🚀 NEW: Virtual Device Integration

- ✅ **Real-time Dashboard**: Live monitoring with Bun native tables
- ✅ **Device Management**: Android/iOS simulator orchestration
- ✅ **Task Processing**: Priority-based queuing with anomaly detection
- ✅ **Time-Series Analytics**: Performance monitoring and reporting
- ✅ **Management Hub**: IPC communication and status updates

## 🔗 NEW: API Integrations

### 💳 CashApp API
- ✅ OAuth2 authentication with token refresh
- ✅ Send/request payments with full transaction tracking
- ✅ Balance checking and transaction history
- ✅ Profile management and security features

### 📱 SMS Gateway (Twilio)
- ✅ Send single/bulk SMS with delivery tracking
- ✅ Message status callbacks and error handling
- ✅ Phone number validation and formatting
- ✅ Account usage monitoring and cost tracking

### 📧 Email Service
- ✅ Multi-provider support (Gmail, Outlook, SendGrid, Mailgun, SMTP)
- ✅ HTML/text emails with attachments
- ✅ Inbox retrieval and message management
- ✅ OAuth2 authentication for Gmail/Outlook

## 📊 Performance

| Metric | Value | Notes | Benchmark |
|--------|-------|-------|-----------|
| **Config validation** | ~10,000 ops/sec | Single operation | `validate()` |
| **Config loading** | ~38,000 ops/sec | With TOML.parse() | `load()` |
| **Config saving** | ~10 ops/ms | File I/O + serialization | `save()` |
| **Full workflow** | ~3,500 ops/sec | Create → Load → Validate → Save | E2E test |
| **R2Storage init** | ~5,000 ops/sec | Client instantiation | `new R2Storage()` |
| **Public URL gen** | ~10,000 ops/sec | URL formatting | `getPublicUrl()` |
| **Matrix lookup** | <0.1ms | Zero-copy JSON | `getMatrixRule()` |
| **Scope context** | ~0.01ms | Cached access | `getScopeContext()` |
| **Compliance check** | ~0.05-0.23ms | Validation | `validateCompliance()` |
| **Memory footprint** | <1 KB/instance | Lightweight | Per manager |
| **Config file size** | 927 bytes | Typical | `config.toml` |
| **Matrix memory** | ~50 KB/rule | Embedded data | `scopingMatrix.ts` |

### Benchmark Suite

Run comprehensive benchmarks:

```bash
# Full benchmark suite
bun tests/bench/config-manager.benchmark.ts

# Matrix performance tests
bun test tests/unit/scoping-matrix.test.ts
```

**Benchmark Documentation**: [📊 MATRIX_REFERENCE.md](docs/MATRIX_REFERENCE.md)

| Benchmark File | Description |
|----------------|-------------|
| `tests/bench/config-manager.benchmark.ts` | Config operations benchmarks |
| `tests/unit/scoping-matrix.test.ts` | Matrix lookup performance tests |
| `docs/MATRIX_REFERENCE.md` | Complete performance matrix documentation |

## 🔧 Requirements

- **Bun**: 1.3.6 or later
- **Environment Variables**: R2 credentials (for storage operations)

## 📖 Getting Started

1. **Read the [Quick Start Guide](docs/QUICKSTART.md)** (2 minutes)
2. **Create R2 bucket** in Cloudflare dashboard
3. **Set environment variables** from `.env.example`
4. **Run commands** with `bun run src/config-manager.ts`

## 🤝 Support

For detailed information, see:
- [Complete README](docs/README.md)
- [Implementation Guide](docs/IMPLEMENTATION.md)
- [Test Results](docs/TEST_RESULTS.md)

## 📄 License

MIT - Empire Pro Team

---

**Status**: ✅ Production Ready | **Tests**: 22/22 passing | **Coverage**: Full
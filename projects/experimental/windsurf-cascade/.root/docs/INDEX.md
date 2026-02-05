# Project Index

Complete navigation and index for the Odds Protocol monorepo.

## 🚀 Quick Navigation

### **New to Project?**
- [📖 README.md](./README.md) - Project overview and quick start
- [🛠️ DEVELOPMENT.md](./DEVELOPMENT.md) - Development guidelines
- [🤝 CONTRIBUTING.md](./CONTRIBUTING.md) - Contributing guide

### **Core Development**
- [📦 packages/](./packages/) - Core packages and libraries
- [🚀 apps/](./apps/) - Application entry points
- [⚙️ scripts/](./scripts/) - Build and automation scripts
- [🔧 config/](./config/) - Configuration files

### **Testing & Quality**
- [🧪 tests/](./tests/) - Test configurations
- [🎯 property-tests/](./property-tests/) - Property-based testing
- [📊 reports/](./reports/) - Test and performance reports

### **Documentation**
- [📝 docs/](./docs/) - Technical documentation
- [🗂️ .root/](./.root/) - Organized root documentation
- [📚 Odds-mono-map/](./Odds-mono-map/) - Knowledge management vault

## 📁 Complete Directory Structure

```
windsurf-project/
├── 📄 README.md                    # Main project README
├── 📄 DEVELOPMENT.md               # Development guidelines
├── 📄 CONTRIBUTING.md              # Contributing guide
├── 📄 LICENSE                      # MIT License
├── 📄 package.json                 # Root package configuration
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 bun.lock                     # Bun lock file
├── 📄 yarn.lock                    # Yarn lock file
├── 📄 .gitattributes               # Git attributes
├── 📄 .gitignore                   # Git ignore rules
│
├── 📦 packages/                    # Core packages (225 items)
│   ├── odds-core/                  # Core odds processing
│   ├── odds-websocket/             # WebSocket server
│   ├── odds-arbitrage/             # Arbitrage detection
│   ├── odds-ml/                    # Machine learning
│   ├── odds-validation/            # Data validation
│   └── [20+ other packages]       # Additional libraries
│
├── 🚀 apps/                        # Applications (22 items)
│   ├── api-gateway/                # API gateway service
│   ├── dashboard/                  # Web dashboard
│   └── stream-processor/           # Stream processor
│
├── 🧪 tests/                       # Test configurations (8 items)
│   ├── config/                     # Test configurations
│   ├── orchestrator/               # Test orchestration
│   └── utils/                      # Test utilities
│
├── 🎯 property-tests/              # Property-based tests (9 items)
│   ├── arbitrage/                  # Arbitrage property tests
│   ├── network/                    # Network property tests
│   └── types/                      # Type property tests
│
├── 📝 docs/                        # Documentation (21 items)
│   ├── bun-v13-features/           # Bun v1.3 features
│   ├── guides/                     # Technical guides
│   └── [various technical docs]    # Additional documentation
│
├── ⚙️ scripts/                     # Automation scripts (59 items)
│   ├── benchmark/                  # Performance benchmarks
│   ├── build/                      # Build scripts
│   ├── deploy/                     # Deployment scripts
│   ├── catalog/                    # Package management
│   ├── core/                       # Core utilities
│   └── [many automation scripts]   # Additional scripts
│
├── 🔧 config/                      # Configuration (1 item)
│   ├── environment/                # Environment configs
│   └── odds-protocol.yaml          # Protocol configuration
│
├── 📊 reports/                     # Reports (3 items)
│   ├── benchmarks/                 # Performance reports
│   └── test-results/               # Test results
│
├── 🏗️ mcp-server/                  # MCP server (20 items)
│   ├── src/                        # Server source
│   ├── schemas/                    # Protocol schemas
│   └── server/                     # Server implementation
│
├── 🗂️ .root/                       # Root documentation
│   ├── docs/                       # Historical docs
│   ├── guides/                     # Setup guides
│   ├── archives/                   # Archived content
│   ├── references/                 # References
│   └── templates/                  # Templates
│
├── 📚 Odds-mono-map/               # Knowledge vault (48 items)
│   ├── 01 - Daily Notes/           # Daily notes
│   ├── 02 - Architecture/          # Architecture docs
│   ├── 03 - Development/           # Development docs
│   └── [organized vault structure] # Knowledge management
│
├── 🏢 .github/                     # GitHub configuration (2 items)
│   └── workflows/                  # CI/CD workflows
│
├── 📄 types/                       # Type definitions (2 items)
│   └── @citadel/                   # Citadel types
│
└── 📄 workspace/                   # Workspace configuration (1 item)
    └── guide.md                    # Workspace guide
```

## 🎯 Key Components by Purpose

### **Core Business Logic**
- **[packages/odds-core/](./packages/odds-core/)** - Odds calculation engine
- **[packages/odds-arbitrage/](./packages/odds-arbitrage/)** - Arbitrage detection
- **[packages/odds-ml/](./packages/odds-ml/)** - Machine learning models
- **[packages/odds-validation/](./packages/odds-validation/)** - Data validation

### **Infrastructure & Performance**
- **[packages/odds-websocket/](./packages/odds-websocket/)** - High-performance WebSocket
- **[apps/api-gateway/](./apps/api-gateway/)** - API gateway
- **[apps/stream-processor/](./apps/stream-processor/)** - Real-time processing
- **[config/odds-protocol.yaml](./config/odds-protocol.yaml)** - Protocol configuration

### **Development & Testing**
- **[scripts/](./scripts/)** - Build and automation scripts
- **[tests/](./tests/)** - Test framework and configs
- **[property-tests/](./property-tests/)** - Property-based testing
- **[reports/](./reports/)** - Performance and test reports

### **Documentation & Knowledge**
- **[docs/](./docs/)** - Technical documentation
- **[Odds-mono-map/](./Odds-mono-map/)** - Knowledge management vault
- **[.root/](./.root/)** - Organized root documentation
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guidelines

## 📋 Common Tasks

### **Development Setup**
```bash
# Install dependencies
bun install

# Start development
bun run dev

# Run tests
bun run test:all
```

### **Building & Deployment**
```bash
# Build project
bun run build

# Build for production
bun run build:prod

# Deploy to staging
bun run deploy
```

### **Code Quality**
```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Rules validation
bun run rules:validate
```

### **Testing**
```bash
# All tests
bun run test:all

# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# Property tests
bun run test:property

# Performance tests
bun run test:performance
```

### **Vault Management**
```bash
# Organize knowledge vault
bun run vault:organize

# Validate vault standards
bun run vault:validate

# Monitor vault health
bun run vault:monitor
```

## 🔍 Search by Topic

### **Performance & Optimization**
- [packages/odds-websocket/](./packages/odds-websocket/) - WebSocket performance
- [scripts/benchmark/](./scripts/benchmark/) - Performance benchmarks
- [docs/bun-v13-features/](./docs/bun-v13-features/) - Bun optimization features
- [reports/benchmarks/](./reports/benchmarks/) - Performance reports

### **Machine Learning & Analytics**
- [packages/odds-ml/](./packages/odds-ml/) - ML models and algorithms
- [src/analytics/](./src/analytics/) - Analytics utilities
- [docs/guides/ML_INTEGRATION.md](./docs/guides/ML_INTEGRATION.md) - ML integration guide

### **Security & Authentication**
- [apps/api-gateway/](./apps/api-gateway/) - API security
- [packages/odds-validation/](./packages/odds-validation/) - Input validation
- [docs/guides/SECURITY_GUIDE.md](./docs/guides/SECURITY_GUIDE.md) - Security guidelines

### **Testing & Quality Assurance**
- [tests/](./tests/) - Test framework
- [property-tests/](./property-tests/) - Property-based testing
- [scripts/validate-golden-rules.ts](./scripts/validate-golden-rules.ts) - Code quality rules
- [reports/test-results/](./reports/test-results/) - Test results

### **Documentation & Knowledge Management**
- [Odds-mono-map/](./Odds-mono-map/) - Knowledge vault
- [docs/](./docs/) - Technical documentation
- [.root/](./.root/) - Organized documentation
- [src/obsidian/](./src/obsidian/) - Obsidian integration

## 📊 Project Statistics

- **Total Packages**: 25+ packages in workspace
- **Applications**: 3 main applications
- **Test Files**: 100+ test files
- **Documentation**: 50+ documentation files
- **Scripts**: 60+ automation scripts
- **Performance Target**: 700k+ msg/sec WebSocket throughput

## 🏷️ Tags and Labels

### **Priority Levels**
- 🔥 **Critical**: Core business logic and performance
- ⚡ **High**: Infrastructure and major features
- 📈 **Medium**: Documentation and tooling
- 📝 **Low**: Templates and auxiliary content

### **Status Indicators**
- ✅ **Stable**: Production-ready components
- 🚧 **In Development**: Actively developed features
- 🧪 **Experimental**: Experimental features
- 🗄️ **Archived**: Historical or deprecated content

### **Complexity Levels**
- 🟢 **Simple**: Basic utilities and configurations
- 🟡 **Moderate**: Standard business logic
- 🟠 **Complex**: Advanced algorithms and systems
- 🔴 **Expert**: Critical performance components

## 🔗 External Resources

### **Documentation**
- [Bun Documentation](https://bun.sh/docs) - Runtime and tools
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Language reference
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - API framework
- [Obsidian Documentation](https://docs.obsidian.md/) - Knowledge management

### **Tools & Libraries**
- [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) - WebSocket library
- [Fast-Check](https://github.com/dubzzz/fast-check) - Property testing
- [Zod](https://zod.dev/) - Schema validation
- [Winston](https://github.com/winstonjs/winston) - Logging

### **Community**
- [GitHub Repository](https://github.com/odds-protocol) - Source code
- [Discord Community](https://discord.gg/odds-protocol) - Chat and support
- [Issue Tracker](https://github.com/odds-protocol/issues) - Bug reports and features

---

This index provides comprehensive navigation for the Odds Protocol monorepo. For specific questions, refer to the relevant documentation or contact the development team.

# Scripts Overview

This directory contains all build, automation, and utility scripts for the Odds Protocol monorepo.

## 📁 Scripts Structure

```text
scripts/
├── build/              # Build and compilation scripts
├── deploy/             # Deployment and CI/CD scripts
├── benchmark/          # Performance benchmarking
├── catalog/            # Package catalog management
├── core/               # Core utility scripts
├── vault/              # Knowledge vault management
└── automation/         # General automation scripts
```

## 🏗️ Build Scripts

### Core Build
- `build.ts`: Main build orchestrator
- `build-standalone.ts`: Standalone binary builds
- `build-wasm.ts`: WebAssembly compilation

### Optimization
- `optimize-wasm.ts`: WASM optimization
- `compress-benchmark.ts`: Compression testing

## 🚀 Deployment Scripts

### Standard Deployment
- `deploy.ts`: Main deployment orchestrator
- `deploy-staging.ts`: Staging environment deployment
- `deploy-production.ts`: Production deployment

### CI/CD Integration
- `ci-build.ts`: CI pipeline build
- `ci-test.ts`: CI pipeline testing
- `ci-deploy.ts`: CI pipeline deployment

## 📊 Benchmark Scripts

### Performance Testing
- `benchmark.ts`: General performance benchmarks
- `benchmark-v13.ts`: Bun v1.3 specific benchmarks
- `benchmark-compression.ts`: Data compression benchmarks
- `benchmark-worker.ts`: Worker thread benchmarks

### Load Testing
- `load-test-websocket.ts`: WebSocket load testing
- `load-test-api.ts`: API endpoint load testing

## 📦 Catalog Scripts

### Package Management
- `catalog-report.ts`: Generate package catalog reports
- `sync-catalogs.ts`: Synchronize package catalogs
- `update-catalogs.ts`: Update package dependencies
- `validate-catalogs.ts`: Validate catalog consistency

## 🔧 Core Scripts

### Development Tools
- `index.ts`: Core utilities index
- `preload.ts`: Development preloading
- `setup.ts`: Project setup and initialization

### Validation
- `validate-implementation.ts`: Implementation validation
- `validate-golden-rules.ts`: Golden rules compliance
- `validate-config.ts`: Configuration validation

## 📚 Vault Scripts

### Knowledge Management
- `vault-organizer.js`: Vault file organization
- `vault-validator.js`: Vault standards validation
- `vault-monitor.js`: Vault health monitoring
- `vault-lint.ts`: Vault linting and formatting

### Automation
- `automated-setup.ts`: Automated vault setup
- `continuous-testing.ts`: Continuous vault testing
- `monitoring-dashboard.ts`: Vault monitoring dashboard

## ⚡ Automation Scripts

### Development Automation
- `automated-setup.ts`: Full project setup
- `incremental-verification.ts`: Incremental validation
- `continuous-testing.ts`: Continuous testing pipeline

### Quality Assurance
- `pre-commit-validate.ts`: Pre-commit validation
- `generate-rule-dashboard.ts`: Rules compliance dashboard
- `organize-violations.ts`: Violation organization

## 🎯 Script Categories

### 🏗️ Build & Development
```bash
bun run build              # Main build
bun run build:prod         # Production build
bun run build:standalone   # Standalone binary
bun run build:wasm         # WebAssembly build
```

### 🧪 Testing & Validation
```bash
bun run test:all           # All tests
bun run validate:rules     # Rules validation
bun run validate:config    # Config validation
bun run validate:impl      # Implementation validation
```

### 📈 Performance & Monitoring
```bash
bun run benchmark          # Performance benchmarks
bun run benchmark:ws       # WebSocket benchmarks
bun run monitor:performance # Performance monitoring
```

### 🚀 Deployment & CI/CD
```bash
bun run deploy             # Deploy to staging
bun run deploy:prod        # Deploy to production
bun run ci:build           # CI build pipeline
```

### 📚 Vault Management
```bash
bun run vault:organize     # Organize vault
bun run vault:validate     # Validate vault
bun run vault:monitor      # Monitor vault
```

## 🔧 Script Configuration

Most scripts can be configured via:

- **Environment variables**: `SCRIPT_ENV=development`
- **Configuration files**: `scripts/config/`
- **Command line arguments**: `--option=value`

## 📝 Adding New Scripts

1. Create script in appropriate category directory
2. Add to `package.json` scripts section
3. Update this README with documentation
4. Add tests for the script
5. Update CI/CD pipeline if needed

## 🏛️ Script Standards

All scripts should follow these standards:

- **TypeScript**: Use TypeScript for type safety
- **Error Handling**: Comprehensive error handling
- **Logging**: Structured logging with appropriate levels
- **Configuration**: External configuration support
- **Testing**: Unit tests for script functionality
- **Documentation**: Clear usage documentation

## 🚨 Script Security

- **Input Validation**: Validate all inputs
- **Path Traversal**: Prevent directory traversal attacks
- **Command Injection**: Use parameterized commands
- **Environment**: Secure environment variable handling

## 📊 Script Performance

- **Async/Await**: Use async patterns for I/O
- **Streaming**: Use streams for large files
- **Caching**: Cache expensive operations
- **Parallel**: Use parallel processing where appropriate

## 🔍 Debugging Scripts

Enable debug logging:

```bash
DEBUG=scripts:* bun run scripts/my-script.ts
```

Use built-in debugging:

```bash
bun --inspect scripts/my-script.ts
```

## 📋 Script Maintenance

Regular maintenance tasks:

- **Update Dependencies**: Keep script dependencies current
- **Review Performance**: Monitor script execution times
- **Security Audit**: Regular security reviews
- **Documentation**: Keep documentation up to date
- **Testing**: Maintain test coverage above 80%

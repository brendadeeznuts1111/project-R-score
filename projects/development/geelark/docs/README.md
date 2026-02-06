# Dev HQ Documentation

Complete documentation for the Dev HQ - Advanced Codebase Analysis & Automation Platform, built with Bun.

> 🚀 **Quick Start**: New to Dev HQ? Jump to [Getting Started](#getting-started) or read the [main project README](../README.md).

---

## 📑 Documentation Index

### 🚀 Getting Started

Start here if you're new to Dev HQ or setting up for the first time.

| Document | Description |
|----------|-------------|
| [SETUP.md](getting-started/SETUP.md) | Installation, prerequisites, and initial setup |
| [USER_GUIDE.md](getting-started/USER_GUIDE.md) | Complete user manual and feature overview |
| [DEPLOYMENT.md](getting-started/DEPLOYMENT.md) | Deployment guide for all platforms (Local, Docker, Cloud) |
| [ENV_CONFIGURATION.md](getting-started/ENV_CONFIGURATION.md) | Environment variables and configuration reference |

---

### 📚 Guides & Tutorials

In-depth guides and tutorials for specific features and use cases.

#### Type Checking & Advanced Types
- [EXPECTTYPEOF_GUIDE.md](guides/type-checking/EXPECTTYPEOF_GUIDE.md) - Type checking with `expectTypeOf`
- [expectTypeOf-implementation-summary.md](guides/type-checking/expectTypeOf-implementation-summary.md) - Implementation details
- [expectTypeOf-pro-tips.md](guides/type-checking/expectTypeOf-pro-tips.md) - Advanced type patterns and pro tips
- [expectTypeOf-runtime-complete.md](guides/type-checking/expectTypeOf-runtime-complete.md) - Runtime type checking

#### Testing & Quality Assurance
- [TESTING_ALIGNMENT.md](guides/testing/TESTING_ALIGNMENT.md) - Testing strategies and patterns
- [TYPESCRIPT_ENHANCEMENT_GUIDE.md](guides/testing/TYPESCRIPT_ENHANCEMENT_GUIDE.md) - TypeScript enhancements
- [test-coverage.md](../testing/test-coverage.md) - Test coverage reports

#### Features & Flags
- [FEATURE_MATRIX.md](guides/features/FEATURE_MATRIX.md) - Complete feature flags matrix and dashboard
- [FLAG_FLOW_DIAGRAM.md](guides/features/FLAG_FLOW_DIAGRAM.md) - Feature flag flow diagrams and processing
- [FEATURE_FLAGS_PRO_TIPS.md](guides/features/FEATURE_FLAGS_PRO_TIPS.md) - Feature flag patterns and best practices
- [flag-separation-pattern.md](guides/features/flag-separation-pattern.md) - Bun flag vs CLI flag separation patterns
- [FEATURE_FLAGS_VERIFICATION.md](guides/features/FEATURE_FLAGS_VERIFICATION.md) - Verification and validation
- [DCE_ANNOTATIONS_QUICKREF.md](guides/features/DCE_ANNOTATIONS_QUICKREF.md) - Dead Code Elimination references

#### CLI Development
- [CLI_IMPLEMENTATION_SUMMARY.md](guides/api/CLI_IMPLEMENTATION_SUMMARY.md) - CLI implementation architecture
- [dev-hq-cli-enhanced.md](guides/api/dev-hq-cli-enhanced.md) - Dev HQ CLI enhancements and features
- [LOCAL_TEMPLATES.md](guides/api/LOCAL_TEMPLATES.md) - Local template usage and management

#### Quick References
- [QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md) - Common commands and patterns
- [ENV_CHEATSHEET.md](guides/ENV_CHEATSHEET.md) - Environment variables cheatsheet
- [QUICK_START_UTILS.md](guides/QUICK_START_UTILS.md) - Utility functions quick start
- [DASHBOARD_FRONTEND_GUIDE.md](guides/DASHBOARD_FRONTEND_GUIDE.md) - Dashboard frontend development

---

### 🏗️ Architecture & Design

System architecture, design decisions, and project roadmap.

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System architecture overview and design patterns |
| [SPECIFICATION.md](architecture/SPECIFICATION.md) | Technical specifications and requirements |
| [ROADMAP.md](architecture/ROADMAP.md) | Project roadmap and planned features |
| [ORGANIZATION_COMPLETE.md](architecture/ORGANIZATION_COMPLETE.md) | Complete organizational structure |
| [ROOT_ORGANIZATION.md](architecture/ROOT_ORGANIZATION.md) | Root directory organization |

---

### 💻 API References

Complete API documentation for CLI, HTTP/WebSocket, and integrations.

| Document | Description |
|----------|-------------|
| [CLI_REFERENCE.md](api/CLI_REFERENCE.md) | Complete command-line interface reference |
| [SERVER_API.md](api/SERVER_API.md) | HTTP/WebSocket server API documentation |
| [GEELARK_API.md](api/GEELARK_API.md) | GeeLark cloud phone management API integration |
| [flags-reference.md](api/flags-reference.md) | Feature flags reference documentation |
| [API_REFERENCE.md](reference/API_REFERENCE.md) | General API reference and integration guide |

---

### ⚙️ Runtime & Infrastructure

Bun runtime integration, process lifecycle, and infrastructure.

#### Bun Runtime
- [BUN_CLI_GUIDE.md](runtime/bun/BUN_CLI_GUIDE.md) - Bun CLI reference and usage
- [BUN_RUN_STDIN.md](runtime/bun/BUN_RUN_STDIN.md) - Bun.run() with stdin handling
- [BUN_RUN_STDIN_QUICKREF.md](runtime/bun/BUN_RUN_STDIN_QUICKREF.md) - Quick reference for stdin operations
- [BUN_FILE_IO.md](runtime/bun/BUN_FILE_IO.md) - Bun file I/O operations
- [BUN_FILE_INTEGRATION.md](runtime/bun/BUN_FILE_INTEGRATION.md) - File integration patterns
- [BUN_CREATE.md](runtime/bun/BUN_CREATE.md) - Bun create scripts and project setup
- [BUN_CREATE_FORCE.md](runtime/bun/BUN_CREATE_FORCE.md) - Force-creating projects with Bun
- [BUN_TERMINAL_API_GUIDE.md](runtime/bun/BUN_TERMINAL_API_GUIDE.md) - Terminal API usage
- [BUN_DCE_ANNOTATIONS.md](runtime/bun/BUN_DCE_ANNOTATIONS.md) - Dead Code Elimination annotations
- [BUN_INSPECT_TABLE.md](runtime/bun/BUN_INSPECT_TABLE.md) - Inspect and table utilities
- [BUN_PERFORMANCE_STRESS_TEST.md](runtime/bun/BUN_PERFORMANCE_STRESS_TEST.md) - Performance testing
- [BUN_UTILITIES_SUMMARY.md](runtime/bun/BUN_UTILITIES_SUMMARY.md) - Bun utilities overview
- [BUN_IMPROVEMENTS_SUMMARY.md](runtime/bun/BUN_IMPROVEMENTS_SUMMARY.md) - Recent Bun improvements

#### Process Management
- [PROCESS_LIFECYCLE.md](runtime/PROCESS_LIFECYCLE.md) - Process lifecycle management and signals
- [RUNTIME_CONTROLS.md](runtime/RUNTIME_CONTROLS.md) - Runtime control mechanisms
- [BUN_CONSTANTS.md](runtime/BUN_CONSTANTS.md) - Bun runtime constants and configuration
- [BUN_DEPENDENCIES_TRANSPIRATION.md](runtime/BUN_DEPENDENCIES_TRANSPIRATION.md) - Dependency management and transpilation
- [BUN_RUNTIME_FEATURES.md](runtime/BUN_RUNTIME_FEATURES.md) - Bun runtime features and capabilities
- [TERMINAL_API_INTEGRATION.md](runtime/TERMINAL_API_INTEGRATION.md) - Terminal API integration
- [BUN_UTILS_DASHBOARD.md](runtime/BUN_UTILS_DASHBOARD.md) - Bun utilities for dashboard

---

### 🔧 Services

Integrated services and frameworks.

| Document | Description |
|----------|-------------|
| [METRICS_AND_ERRORS_API.md](services/METRICS_AND_ERRORS_API.md) | Metrics collection and error tracking API (Phase 5) |
| [INTEGRATION_GUIDE.md](services/INTEGRATION_GUIDE.md) | Integration guide for metrics and error services |

---

### 📋 Reference Materials

Reference documentation, constants, and indices.

| Document | Description |
|----------|-------------|
| [CONSTANTS_SUMMARY.md](reference/CONSTANTS_SUMMARY.md) | Constants and configuration values |
| [GEELARK_COMPLETE_GUIDE.md](reference/GEELARK_COMPLETE_GUIDE.md) | Complete GeeLark integration guide |
| [DOCUMENTATION_INDEX.md](reference/DOCUMENTATION_INDEX.md) | Comprehensive documentation index |
| [BROKEN_LINKS_REPORT.md](reference/BROKEN_LINKS_REPORT.md) | Broken links and fixes |
| [LINK_FIXES_SUMMARY.md](reference/LINK_FIXES_SUMMARY.md) | Link fixing summary |

---

### 🌐 Network & Proxy

Network configuration and proxy management.

| Document | Description |
|----------|-------------|
| [NETWORK_AWARE_CONFIG_STACK.md](proxy/NETWORK_AWARE_CONFIG_STACK.md) | Network-aware configuration |
| [PROXY_VALIDATION_GUIDE.md](proxy/PROXY_VALIDATION_GUIDE.md) | Proxy validation and testing |
| [PROXY_VALIDATION_SUMMARY.md](proxy/PROXY_VALIDATION_SUMMARY.md) | Proxy validation summary |

---

### 💥 Error Handling

Error handling patterns and debugging.

| Document | Description |
|----------|-------------|
| [UNHANDLED_REJECTIONS.md](errors/UNHANDLED_REJECTIONS.md) | Unhandled promise rejection handling |

---

### 📦 Versioning

Version management and semantic versioning.

| Document | Description |
|----------|-------------|
| [SEMVER_GUIDE.md](versioning/SEMVER_GUIDE.md) | Semantic versioning guide and best practices |

---

### 🚀 Deployment

Production deployment and DevOps.

| Document | Description |
|----------|-------------|
| [PRODUCTION_DEPLOYMENT_GUIDE.md](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md) | Production deployment procedures |

---

## 📂 Directory Structure

```text
docs/
├── getting-started/       # 🚀 Setup, user guide, deployment
├── guides/                # 📚 Feature guides and tutorials
│   ├── type-checking/     # Type safety and advanced types
│   ├── testing/           # Testing and quality assurance
│   ├── features/          # Feature flags and capabilities
│   └── api/               # CLI and API implementation
├── architecture/          # 🏗️ Design and architecture
├── api/                   # 💻 API references
├── services/              # 🔧 Integrated services
├── runtime/               # ⚙️ Bun runtime and infrastructure
│   └── bun/               # Bun-specific documentation
├── reference/             # 📋 Reference materials
├── proxy/                 # 🌐 Network and proxy
├── errors/                # 💥 Error handling
├── testing/               # 🧪 Testing guides
├── versioning/            # 📦 Version management
├── deployment/            # 🚀 Deployment
├── NAMING_CONVENTIONS_MAINTENANCE_GUIDE.md
└── README.md              # This file
```

---

## 🎯 Quick Navigation by Use Case

### I want to...

**...get started quickly**
- Start with [SETUP.md](getting-started/SETUP.md)
- Then read [USER_GUIDE.md](getting-started/USER_GUIDE.md)
- Finally check [QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md)

**...use the CLI**
- Read [CLI_REFERENCE.md](api/CLI_REFERENCE.md) for available commands
- Check [Quick Reference](guides/QUICK_REFERENCE.md) for common patterns
- See [dev-hq-cli-enhanced.md](guides/api/dev-hq-cli-enhanced.md) for advanced usage

**...understand feature flags**
- Overview: [FEATURE_MATRIX.md](guides/features/FEATURE_MATRIX.md)
- Deep dive: [FLAG_FLOW_DIAGRAM.md](guides/features/FLAG_FLOW_DIAGRAM.md)
- Pro tips: [FEATURE_FLAGS_PRO_TIPS.md](guides/features/FEATURE_FLAGS_PRO_TIPS.md)

**...work with types**
- Start: [EXPECTTYPEOF_GUIDE.md](guides/type-checking/EXPECTTYPEOF_GUIDE.md)
- Advanced: [expectTypeOf-pro-tips.md](guides/type-checking/expectTypeOf-pro-tips.md)

**...set up testing**
- Guide: [TESTING_ALIGNMENT.md](guides/testing/TESTING_ALIGNMENT.md)
- Coverage: [test-coverage.md](../testing/test-coverage.md)

**...deploy to production**
- Start: [DEPLOYMENT.md](getting-started/DEPLOYMENT.md)
- Full guide: [PRODUCTION_DEPLOYMENT_GUIDE.md](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)

**...use metrics and error tracking**
- API Reference: [METRICS_AND_ERRORS_API.md](services/METRICS_AND_ERRORS_API.md)
- Integration Guide: [INTEGRATION_GUIDE.md](services/INTEGRATION_GUIDE.md)

**...understand the system**
- Architecture: [ARCHITECTURE.md](architecture/ARCHITECTURE.md)
- Design: [SPECIFICATION.md](architecture/SPECIFICATION.md)
- Roadmap: [ROADMAP.md](architecture/ROADMAP.md)

**...work with Bun runtime**
- Overview: [BUN_RUNTIME_FEATURES.md](runtime/BUN_RUNTIME_FEATURES.md)
- File I/O: [BUN_FILE_IO.md](runtime/bun/BUN_FILE_IO.md)
- CLI Guide: [BUN_CLI_GUIDE.md](runtime/bun/BUN_CLI_GUIDE.md)

**...debug network issues**
- Proxy docs: [PROXY_VALIDATION_GUIDE.md](proxy/PROXY_VALIDATION_GUIDE.md)
- Network config: [NETWORK_AWARE_CONFIG_STACK.md](proxy/NETWORK_AWARE_CONFIG_STACK.md)

**...understand error handling**
- Patterns: [UNHANDLED_REJECTIONS.md](errors/UNHANDLED_REJECTIONS.md)

---

## 📖 Documentation Standards

When contributing documentation:
1. **Use clear, concise language** - Avoid jargon where possible
2. **Include code examples** - Show, don't just tell
3. **Link to related docs** - Help readers find related information
4. **Keep examples current** - Test examples with latest code
5. **Use proper formatting** - Tables, code blocks, sections

---

## 🔗 Key Links

- **[Main Project README](../README.md)** - Project overview and quick start
- **[Naming Conventions Guide](NAMING_CONVENTIONS_MAINTENANCE_GUIDE.md)** - Code naming standards
- **[Phase 5 Completion Report](../PHASE_5_COMPLETION_REPORT.md)** - Latest feature delivery

---

## 📞 Support & Questions

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section of relevant docs
2. Search existing documentation using Ctrl+F (or Cmd+F)
3. Review [QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md) for common patterns
4. Check the [main README](../README.md) for project-level help

---

## 🔄 Documentation Updates

**Last Updated**: January 9, 2026  
**Last Major Reorganization**: Phase 1 - Documentation Consolidation  
**Current Structure**: Streamlined 13 categories + subcategories  
**Total Documents**: 80+ files organized for clarity

### Recent Changes (Phase 1)
- ✅ Consolidated tutorials into `getting-started/`
- ✅ Merged Bun docs into `runtime/bun/`
- ✅ Consolidated CLI docs into `guides/api/`
- ✅ Consolidated features into `guides/features/`
- ✅ Organized type-checking guides into `guides/type-checking/`
- ✅ Organized testing guides into `guides/testing/`
- ✅ Removed empty parent directories
- ✅ Updated this README with improved navigation

---

## 📋 Complete File Manifest

### Getting Started (5 files)
- getting-started/SETUP.md
- getting-started/USER_GUIDE.md
- getting-started/DEPLOYMENT.md
- getting-started/ENV_CONFIGURATION.md

### Guides (25+ files organized in 4 subdirectories)
- guides/type-checking/ (4 files)
- guides/testing/ (2 files)
- guides/features/ (6 files)
- guides/api/ (3 files)
- guides/QUICK_REFERENCE.md, ENV_CHEATSHEET.md, QUICK_START_UTILS.md, DASHBOARD_FRONTEND_GUIDE.md

### Architecture (5 files)
- ARCHITECTURE.md, SPECIFICATION.md, ROADMAP.md, ORGANIZATION_COMPLETE.md, ROOT_ORGANIZATION.md

### API (4 files)
- CLI_REFERENCE.md, SERVER_API.md, GEELARK_API.md, flags-reference.md

### Services (2 files)
- METRICS_AND_ERRORS_API.md, INTEGRATION_GUIDE.md

### Runtime (19 files)
- 13 files in runtime/bun/
- 6 files at runtime/ level

### Reference (5 files)
- CONSTANTS_SUMMARY.md, GEELARK_COMPLETE_GUIDE.md, DOCUMENTATION_INDEX.md, BROKEN_LINKS_REPORT.md, LINK_FIXES_SUMMARY.md

### Proxy (3 files)
- NETWORK_AWARE_CONFIG_STACK.md, PROXY_VALIDATION_GUIDE.md, PROXY_VALIDATION_SUMMARY.md

### Errors (1 file)
- UNHANDLED_REJECTIONS.md

### Testing (2 files)
- test-coverage.md, TESTING_GUIDE.md

### Versioning (1 file)
- SEMVER_GUIDE.md

### Deployment (1 file)
- PRODUCTION_DEPLOYMENT_GUIDE.md

### Root Level (1 file)
- NAMING_CONVENTIONS_MAINTENANCE_GUIDE.md

---

**Total: 80+ files across 13 organized categories**

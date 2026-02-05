# Documentation Index

**Comprehensive index of all NEXUS Platform documentation organized by category**

**Last Updated**: 2025-01-27  
**Total Documents**: 35+

---

## 📚 Quick Navigation

- [Security & Compliance](#security--compliance)
- [Bun APIs & Features](#bun-apis--features)
- [Integration Guides](#integration-guides)
- [Architecture & Design](#architecture--design)
- [Development & Testing](#development--testing)
- [CSS & Styling](#css--styling)
- [Research & Analytics](#research--analytics)

---

## 🔒 Security & Compliance

### Bun 1.3 Security Features

- **[BUN-1.3-SECURITY-ENHANCEMENTS.md](./BUN-1.3-SECURITY-ENHANCEMENTS.md)** - Overview of Bun 1.3 security features
  - Bun.secrets integration
  - Bun.CSRF protection
  - Security Scanner API
  - Version requirements

- **[BUN-SECURITY-SCANNER.md](./BUN-SECURITY-SCANNER.md)** - Custom security scanner implementation
  - CVE detection
  - Malware detection
  - License compliance
  - Configuration guide
  - **Bun Version**: 1.3+ required

- **[ENTERPRISE-SCANNER-CONFIG.md](./ENTERPRISE-SCANNER-CONFIG.md)** - Enterprise security scanner configuration
  - Threat intelligence integration
  - Custom threat databases
  - API key management

### Security Architecture

- **[SECURITY-ARCHITECTURE.md](./SECURITY-ARCHITECTURE.md)** - Security architecture and threat monitoring
  - Runtime security monitoring
  - Forensic logging
  - Automated incident response

### Secrets Management

- **[MCP-SECRETS-INTEGRATION.md](./MCP-SECRETS-INTEGRATION.md)** - MCP secrets management with Bun.secrets
  - API key storage
  - Session cookie management
  - Migration tools
  - **Bun Version**: 1.3+ required

### Authentication & Session Management

- **[10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md)** - Authentication & Session Management Subsystem
  - Bun.CookieMap and Bun.Cookie integration
  - Secure session token management
  - CSRF protection tokens
  - UI preferences & state management
  - Security policies and best practices
  - **Version**: 10.0.0.0.0.0.0
  - **Status**: ✅ Implemented

- **[10.1-IMPLEMENTATION-GUIDE.md](./10.1-IMPLEMENTATION-GUIDE.md)** - Implementation Guide
  - Quick start examples
  - File structure
  - Testing guide
  - Environment setup

- **[10.2-MIDDLEWARE-GUIDE.md](./10.2-MIDDLEWARE-GUIDE.md)** - Middleware Composition Guide
  - Session middleware
  - CSRF middleware
  - Cookie middleware
  - Middleware composition utilities
  - Complete examples
  - **Version**: 10.2.0.0.0.0

- **[10.3-COMPLETE-EXAMPLES.md](./10.3-COMPLETE-EXAMPLES.md)** - Complete Examples Guide
  - All example files
  - Usage instructions
  - Testing guide
  - Integration patterns
  - Best practices
  - **Version**: 10.3.0.0.0.0

---

## 🚀 Bun APIs & Features

### API Coverage

- **[BUN-APIS-COVERED.md](./BUN-APIS-COVERED.md)** - Complete list of Bun APIs used in NEXUS
  - 56+ Bun APIs documented
  - Code examples and file references
  - Bun 1.3+ APIs highlighted
  - **Last Updated**: 2025-01-27

- **[BUN-1.3-FEATURES.md](./BUN-1.3-FEATURES.md)** - Bun 1.3 Features Integration
  - Testing improvements
  - YAML support
  - Native cookie support
  - ReadableStream convenience methods
  - WebSocket improvements
  - WebAssembly streaming
  - Zstandard compression
  - DisposableStack/AsyncDisposableStack
  - Security enhancements (Bun.secrets, Bun.CSRF)
  - Crypto performance improvements
  - **Bun Version**: 1.3+ required

- **[BUN-1.3-INTEGRATION-SUMMARY.md](./BUN-1.3-INTEGRATION-SUMMARY.md)** - Integration Summary
  - Complete integration status
  - File structure
  - Usage examples
  - Migration status
  - Testing guide

- **[BUN-1.3-MIGRATION-GUIDE.md](./BUN-1.3-MIGRATION-GUIDE.md)** - Migration Guide
  - Step-by-step migration instructions
  - Before/after code examples
  - Backward compatibility notes
  - Performance improvements
  - Troubleshooting guide
  - Migration checklist

- **[BUN-1.3-QUICK-REFERENCE.md](./BUN-1.3-QUICK-REFERENCE.md)** - Quick Reference Card
  - Feature cheat sheet
  - Common patterns
  - Performance improvements
  - Quick links

- **[BUN-1.3-COMPLETE.md](./BUN-1.3-COMPLETE.md)** - Complete Integration Status
  - All features integrated
  - File structure
  - Verification checklist
  - Quick commands

### Cookie Management

- **[10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](./10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md)** - Bun Cookie APIs
  - Bun.CookieMap for cookie collections
  - Bun.Cookie for granular control
  - Session management
  - Security best practices
  - **Cross-Reference**: See Security & Compliance section

- **[BUN-API-COMPLIANCE.md](./BUN-API-COMPLIANCE.md)** - Bun API compliance and best practices

### Server & Metrics

- **[BUN-SERVER-METRICS.md](./BUN-SERVER-METRICS.md)** - Bun server metrics integration

### Performance Monitoring

- **[Performance Monitor](../src/observability/performance-monitor.ts)** - High-resolution operation tracking
  - Bun.nanoseconds() for nanosecond-precision timing
  - Statistical anomaly detection
  - Prometheus metrics integration
  - Failure tracking and reporting
  - `pendingRequests`
  - `pendingWebSockets`
  - `subscriberCount`

### CSS & Bundling

- **[BUN-CSS-BUNDLER.md](./BUN-CSS-BUNDLER.md)** - CSS bundler implementation
- **[CSS-MODULES.md](./CSS-MODULES.md)** - CSS Modules support
- **[CSS-MODULES-COMPOSITION.md](./CSS-MODULES-COMPOSITION.md)** - CSS Modules composition patterns
- **[CSS-NESTING.md](./CSS-NESTING.md)** - CSS nesting support
- **[CSS-SYNTAX-EXAMPLES.md](./CSS-SYNTAX-EXAMPLES.md)** - Modern CSS syntax examples
- **[GOLDEN-CSS-TEMPLATE.md](./GOLDEN-CSS-TEMPLATE.md)** - Golden CSS template guide

---

## 🔗 Integration Guides

### Mini App Integration

- **[FACTORY-WAGER-MINIAPP-INTEGRATION.md](./FACTORY-WAGER-MINIAPP-INTEGRATION.md)** - Factory Wager Mini App integration
  - API endpoints (`/api/miniapp/*`)
  - Dashboard integration
  - Health monitoring
  - **Status**: ✅ Fully integrated

### MCP Integration

- **[MCP-SECRETS-INTEGRATION.md](./MCP-SECRETS-INTEGRATION.md)** - MCP secrets management
  - Bun.secrets integration
  - API key storage
  - Session cookie management

---

## 🏗️ Architecture & Design

### Core Systems

- **[REGISTRY-SYSTEM.md](./REGISTRY-SYSTEM.md)** - Comprehensive registry system documentation
  - Properties registry
  - Data sources registry
  - Sharp books registry
  - Bookmaker profiles

- **[INTEGRATION-SUMMARY.md](./INTEGRATION-SUMMARY.md)** - Integration summary and overview

### Naming & Path Patterns

- **[patterns/NAMING-AND-PATH-PATTERNS.md](./patterns/NAMING-AND-PATH-PATTERNS.md)** - Comprehensive naming and path patterns guide
  - File path patterns (`src/[domain]/[component]/[file-name].ts`)
  - Directory structure patterns
  - Import/export path conventions (relative, absolute, aliases)
  - API endpoint path patterns (`/api/[domain]/[resource]`)
  - Database path and naming patterns
  - Module resolution patterns (Bun, TypeScript)
  - Documentation path patterns
  - Domain-specific naming conventions (ORCA, Arbitrage, API)
  - Pattern verification with ripgrep
  - Complete examples and quick reference

- **[guides/NAMING-CONVENTIONS.md](./guides/NAMING-CONVENTIONS.md)** - Base naming conventions
  - Code naming (classes, functions, variables, constants, types)
  - File and directory naming
  - Branch and commit naming
  - API and database naming
  - Metadata naming

- **[NAMING-PATTERNS-QUICK-REFERENCE.md](./NAMING-PATTERNS-QUICK-REFERENCE.md)** - Quick reference guide
  - File, class, function, constant naming
  - VS Code task and launch config naming
  - Package.json script naming
  - Quick checklist

### Logging & Monitoring

- **[FORENSIC-LOGGING.md](./FORENSIC-LOGGING.md)** - Forensic logging system
  - URL entity parsing correction
  - Bookmaker profile registry integration

- **[FORENSIC-LOGGING-IMPROVEMENTS.md](./FORENSIC-LOGGING-IMPROVEMENTS.md)** - Production-ready improvements
  - Performance optimizations
  - Error handling

- **[BOOKMAKER-PROFILING.md](./BOOKMAKER-PROFILING.md)** - Bookmaker profiling and registry integration

---

## 🔬 Research & Analytics

### Pattern Discovery

- **[URL-ANOMALY-PATTERNS.md](./URL-ANOMALY-PATTERNS.md)** - URL anomaly pattern detection engine
  - Pattern mining
  - False positive detection
  - Performance analysis

- **[URL-ANOMALY-INTEGRATION.md](./URL-ANOMALY-INTEGRATION.md)** - URL anomaly integration guide

- **[URL-ANOMALY-PERFORMANCE.md](./URL-ANOMALY-PERFORMANCE.md)** - Performance analysis

- **[URL-PARSING-EDGE-CASE.md](./URL-PARSING-EDGE-CASE.md)** - URL parsing edge case documentation

### Shadow Graph & Detection Systems

- **[SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md)** - Shadow Graph System Architecture
  - Hidden steam detection
  - Shadow arbitrage scanning
  - Bait line detection
  - MCP research tools

- **[ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md)** - Advanced Detection System Components
  - Reverse Line Movement (RLM) detection
  - Steam origination graph
  - Derivative market correlator
  - Temporal pattern engine
  - Cross-sport arbitrage
  - Limit Order Book (LOB) reconstruction
  - Behavioral pattern classifier
  - **Version**: 1.1.1.1.2.x.x

- **[RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md)** - Research Scripts Integration Guide
  - Automated covert steam scanning (nightly cron) - 1.1.1.1.1.8.1
  - Weekly shadow market graph analysis - 1.1.1.1.1.8.2
  - Deceptive line identification - 1.1.1.1.1.8.3
  - Automated covert arbitrage trading - 1.1.1.1.1.8.4
  - Alert system integration (`ShadowGraphAlertSystem`)
  - Orchestrator integration (`AdvancedResearchOrchestrator`)
  - YAML configuration (`config/advanced-research-alerts.yaml`)
  - Cron-ready configurations
  - RFC 001 deep-link integration
  - **Status**: ✅ Production Ready

- **[SHADOW-GRAPH-COMPLETE-HIERARCHY.md](./SHADOW-GRAPH-COMPLETE-HIERARCHY.md)** - Complete Hierarchical Component Reference
  - All 1.1.1.1.1.x.x components (Schema, Algorithms, Detection, Case Study, Scanner, Alerts, MCP Tools, Automation, UI/API)
  - All 1.1.1.1.2.x.x components (49 Advanced Detection System components)
  - Complete versioning reference
  - Code location mappings
  - Cross-reference guide
  - **Total**: 112+ components documented

- **[SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md](./SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md)** - Implementation Verification Report
  - Comprehensive verification of all 112+ components
  - Implementation status for each component
  - Integration verification
  - Documentation consistency checks
  - **Status**: ✅ All components verified and operational

- **[SHADOW-GRAPH-QUICK-REFERENCE.md](./SHADOW-GRAPH-QUICK-REFERENCE.md)** - Quick Reference Guide
  - Quick start examples
  - Common code snippets
  - Research script commands
  - API endpoint reference
  - Key concepts overview
  - Common tasks and patterns

- **[SHADOW-GRAPH-DOCUMENTATION-SUMMARY.md](./SHADOW-GRAPH-DOCUMENTATION-SUMMARY.md)** - Documentation Summary
  - Complete documentation structure overview
  - Component breakdown and statistics
  - Cross-reference guide
  - Quick start guides by role
  - Verification checklist
  - Recent updates log

- **[SHADOW-GRAPH-NAMING-CONVENTIONS.md](./SHADOW-GRAPH-NAMING-CONVENTIONS.md)** - Naming Conventions Guide
  - File naming standards (kebab-case with prefixes)
  - Class naming standards (PascalCase with suffixes)
  - Interface naming standards (PascalCase with suffixes)
  - Property naming standards (camelCase with prefixes/suffixes)
  - Function naming standards (camelCase with verb prefixes)
  - Constant and enum naming standards
  - Naming checklist for new components

- **[SHADOW-GRAPH-NAMING-ENHANCEMENT-PLAN.md](./SHADOW-GRAPH-NAMING-ENHANCEMENT-PLAN.md)** - Naming Enhancement Plan
  - Comprehensive enhancement plan for file/class/interface/property names
  - Implementation phases (High/Medium/Low priority)
  - Migration scripts and verification commands
  - Impact analysis and risk assessment
  - Pre/post-implementation checklists

### Correlation Analysis & Visualization

- **[DASHBOARD-CORRELATION-GRAPH.md](./DASHBOARD-CORRELATION-GRAPH.md)** - Multi-Layer Correlation Graph Dashboard (4.2.2.0.0.0.0)
  - Interactive multi-layer correlation visualization
  - Market data, anomaly detection, and performance metrics correlation
  - Root cause analysis and pattern discovery
  - API endpoint: `/api/dashboard/correlation-graph`
  - **Cross-reference**: [MCP & Alerting Subsystem](./4.0.0.0.0.0.0-MCP-ALERTING.md#42200000-multi-layer-correlation-graph---developer-dashboard)

- **[MULTI-LAYER-CORRELATION-PERFORMANCE-VALIDATION.md](./MULTI-LAYER-CORRELATION-PERFORMANCE-VALIDATION.md)** - Performance Validation & Production Hardening (4.2.2.6.0.0.0)
  - Performance metrics analysis (sub-microsecond layer building, 2.20ms graph assembly)
  - Throughput capacity model (450 graphs/sec per instance)
  - Production hardening checklist and DoD compliance
  - Advanced optimization strategies (SIMD, worker threads)
  - **Status**: 🟢 Performance exceeds spec, 85% production-ready

- **[1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md](./1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md)** - Complete Technical Specification (1.1.1.1.4.0.0.0)
  - Comprehensive interface definitions (MultiLayerGraph, Layer schemas)
  - Graph construction methods (Layer1-4 builders, priority queue, full assembly)
  - Anomaly detection algorithms (all 4 layers + confidence scoring + risk assessment)
  - Storage schemas (correlations, history, indexes, verification logs, metrics, snapshots, decay tracking)
  - Research tools (graph builder, anomaly query, propagation prediction, cross-sport finder, streaming, visualization)
  - Input schema definitions and validation rules
  - System status and performance metrics
  - **Cross-reference**: [4.2.2.0.0.0.0 Multi-Layer Correlation Graph Dashboard](./4.0.0.0.0.0.0-MCP-ALERTING.md#42200000-multi-layer-correlation-graph---developer-dashboard)

---

## 💻 Development & Testing

### Git & Versioning

- **[GIT-INFO-CONSTANTS-MATRIX.md](./GIT-INFO-CONSTANTS-MATRIX.md)** - Git info constants matrix

---

## 🎨 CSS & Styling

### CSS Features

- **[COLOR-FUNCTION.md](./COLOR-FUNCTION.md)** - CSS color() function
- **[CSS-FALLBACKS.md](./CSS-FALLBACKS.md)** - CSS fallback strategies
- **[DIR-SELECTOR.md](./DIR-SELECTOR.md)** - CSS direction selector
- **[DOUBLE-POSITION-GRADIENTS.md](./DOUBLE-POSITION-GRADIENTS.md)** - Double position gradients
- **[HWB-COLORS.md](./HWB-COLORS.md)** - HWB color space
- **[LAB-COLORS.md](./LAB-COLORS.md)** - LAB color space
- **[LANG-SELECTOR.md](./LANG-SELECTOR.md)** - Language selector
- **[LIGHT-DARK.md](./LIGHT-DARK.md)** - Light/dark mode support
- **[LOGICAL-PROPERTIES.md](./LOGICAL-PROPERTIES.md)** - CSS logical properties
- **[NOT-SELECTOR.md](./NOT-SELECTOR.md)** - :not() selector
- **[RELATIVE-COLORS.md](./RELATIVE-COLORS.md)** - Relative color syntax
- **[SHORTHANDS.md](./SHORTHANDS.md)** - CSS shorthand properties

---

## 📋 Documentation Checklist

### ✅ Completed

- [x] Bun 1.3 Security Scanner documentation
- [x] Factory Wager Mini App integration guide
- [x] Bun.secrets integration documentation
- [x] Bun.CSRF protection documentation
- [x] MCP secrets management guide
- [x] Bun APIs coverage documentation
- [x] Security architecture documentation
- [x] Forensic logging documentation
- [x] URL anomaly pattern detection
- [x] CSS features documentation

### 📝 Recent Additions (2025-01-27)

- ✅ Bun 1.3 Security Scanner (`BUN-SECURITY-SCANNER.md`)
- ✅ Bun 1.3 Security Enhancements (`BUN-1.3-SECURITY-ENHANCEMENTS.md`)
- ✅ Factory Wager Mini App Integration (`FACTORY-WAGER-MINIAPP-INTEGRATION.md`)
- ✅ MCP Secrets Integration (`MCP-SECRETS-INTEGRATION.md`)
- ✅ Enterprise Scanner Config (`ENTERPRISE-SCANNER-CONFIG.md`)
- ✅ Documentation Index (`DOCUMENTATION-INDEX.md`) - This file

---

## 🔍 Quick Reference

### Bun Version Requirements

| Feature | Bun Version | Documentation |
|---------|-------------|--------------|
| Security Scanner | 1.3+ | [BUN-SECURITY-SCANNER.md](./BUN-SECURITY-SCANNER.md) |
| Bun.secrets | 1.3+ | [MCP-SECRETS-INTEGRATION.md](./MCP-SECRETS-INTEGRATION.md) |
| Bun.CSRF | 1.3+ | [BUN-1.3-SECURITY-ENHANCEMENTS.md](./BUN-1.3-SECURITY-ENHANCEMENTS.md) |
| Bun.semver.satisfies() | 1.3+ | [BUN-APIS-COVERED.md](./BUN-APIS-COVERED.md) |

### API Endpoints

| Category | Endpoints | Documentation |
|----------|-----------|--------------|
| Mini App | `/api/miniapp/*` | [FACTORY-WAGER-MINIAPP-INTEGRATION.md](./FACTORY-WAGER-MINIAPP-INTEGRATION.md) |
| MCP Secrets | `/api/mcp/secrets` | [MCP-SECRETS-INTEGRATION.md](./MCP-SECRETS-INTEGRATION.md) |
| Security | `/api/security/*` | [SECURITY-ARCHITECTURE.md](./SECURITY-ARCHITECTURE.md) |

---

## 📖 Related Documentation

### Main Documentation Files

- **[README.md](../README.md)** - Project overview and quick start
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant guidance
- **[MCP-SERVER.md](../MCP-SERVER.md)** - MCP server documentation

### Contributing

- **[CONTRIBUTING.md](../guides/CONTRIBUTING.md)** - Contributing guidelines
- **[DOCUMENTATION-STYLE.md](../guides/DOCUMENTATION-STYLE.md)** - Documentation style guide

---

## 🔄 Maintenance

### Updating This Index

When adding new documentation:

1. Add entry to appropriate category
2. Include brief description
3. Note Bun version requirements if applicable
4. Update "Recent Additions" section
5. Update "Total Documents" count
6. Update "Last Updated" date

### Categories

- **Security & Compliance** - Security features, scanners, compliance
- **Bun APIs & Features** - Bun API documentation and examples
- **Integration Guides** - Third-party integrations
- **Architecture & Design** - System architecture and design patterns
- **Development & Testing** - Development guides and testing
- **CSS & Styling** - CSS features and styling guides
- **Research & Analytics** - Research tools and analytics

---

**Last Updated**: 2025-01-27  
**Maintained By**: NEXUS Documentation Team

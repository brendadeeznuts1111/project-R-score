# DuoPlus Scoping Matrix - Complete Reference Guide

This document provides a comprehensive reference of all scoping matrix mappings,
showing the complete relationship between domains, scopes, platforms, features,
limits, and integrations.

## 📊 Performance Benchmarks

Run benchmarks to measure scoping matrix performance:

```bash
# Run all benchmarks
bun tests/bench/config-manager.benchmark.ts

# Run performance tests
bun test tests/unit/scoping-matrix.test.ts --bench
```

**Benchmark Results** (`tests/bench/config-manager.benchmark.ts`):

| Operation | Enterprise | Development | Personal | Public | Notes |
|-----------|------------|-------------|----------|--------|-------|
| **Matrix Lookup** | <0.1ms | <0.1ms | <0.1ms | <0.1ms | Zero-copy JSON |
| **Scope Context** | ~0.01ms | ~0.01ms | ~0.01ms | ~0.01ms | Cached access |
| **Memory Usage** | ~50KB | ~50KB | ~50KB | ~50KB | Per rule instance |
| **Compliance Check** | ~0.23ms | ~0.05ms | ~0.05ms | ~0.05ms | Validation |
| **Benchmark Suite** | [📊 benchmarks] | [📊 benchmarks] | [📊 benchmarks] | [📊 benchmarks] | Full suite |

**Benchmark Commands:**
- `bun tests/bench/config-manager.benchmark.ts` - Full benchmark suite
- `bun test tests/unit/scoping-matrix.test.ts` - Matrix performance tests

**Benchmark Output** (`tests/bench/config-manager.benchmark.ts`):
```text
📊 Benchmark: Matrix Lookup
   Iterations: 1000
   Average: 0.00ms
   Min: 0.00ms
   Max: 0.02ms
🧠 Matrix lookups memory: 0 bytes
⏱️ Scope context access: 0.01ms
```

## 📊 Complete Scoping Matrix Table

### Status Legend
- 🟢 **Active** - Fully enabled and operational
- 🟡 **Limited** - Partially enabled with restrictions
- 🔴 **Disabled** - Not available for this scope
- 🔵 **Conditional** - Available based on additional criteria

### Color Codes (Hex)
- **🟢 Active**: `#28a745` (Green)
- **🟡 Limited**: `#ffc107` (Amber)
- **🔴 Disabled**: `#dc3545` (Red)
- **🔵 Conditional**: `#007bff` (Blue)

| Domain | Scope | Platform | Status | Advanced Analytics | Custom Integrations | High Availability | Multi-Tenant | Compliance Mode | Debug Tools | Max Devices | Max Integrations | API Rate Limit | Storage Quota | Twitter | CashApp | Email | SMS | Webhook |
|--------|-------|----------|--------|-------------------|-------------------|------------------|--------------|----------------|-------------|-------------|------------------|----------------|---------------|---------|---------|-------|-----|---------|
| `apple.com` | ENTERPRISE | Any | 🟢 Active | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ❌ (`#dc3545`) | 1,000 | 50 | 10,000/min | 1TB | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) |
| `microsoft.com` | ENTERPRISE | Windows | 🟢 Active | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ❌ (`#dc3545`) | 500 | 30 | 5,000/min | 500GB | ✅ (`#28a745`) | ❌ (`#dc3545`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) |
| `localhost` | DEVELOPMENT | Any | 🟢 Active | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ✅ (`#28a745`) | 10 | 5 | 100/min | 1GB | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ❌ (`#dc3545`) |
| `dev.example.com` | DEVELOPMENT | Any | 🟢 Active | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ✅ (`#28a745`) | 25 | 10 | 500/min | 5GB | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) |
| `gmail.com` | PERSONAL | Any | 🟡 Limited | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | 3 | 2 | 50/min | 100MB | ✅ (`#28a745`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) |
| `outlook.com` | PERSONAL | Any | 🟡 Limited | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | 5 | 3 | 100/min | 500MB | ✅ (`#28a745`) | ❌ (`#dc3545`) | ✅ (`#28a745`) | ✅ (`#28a745`) | ❌ (`#dc3545`) |
| `public` | PUBLIC | Any | 🔴 Disabled | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) | 1 | 1 | 10/min | 10MB | ❌ (`#dc3545`) | ❌ (`#dc3545`) | ✅ (`#28a745`) | ❌ (`#dc3545`) | ❌ (`#dc3545`) |

## 🎯 Scope Definitions & Business Logic

### Enterprise Scope (`ENTERPRISE`)

**Target**: Large organizations with compliance requirements

- **Domains**: `apple.com`, `microsoft.com`
- **Purpose**: Production enterprise deployments
- **Compliance**: SOC 2, HIPAA, GDPR ready
- **SLA**: 99.9% uptime guarantee
- **Support**: 24/7 enterprise support

### Development Scope (`DEVELOPMENT`)

**Target**: Development and testing environments

- **Domains**: `localhost`, `*.dev.*`, `*.staging.*`
- **Purpose**: Development, testing, and staging
- **Features**: Debug tools, relaxed limits
- **Compliance**: Development-only, no production data
- **Support**: Business hours support

### Personal Scope (`PERSONAL`)

**Target**: Individual users and small teams

- **Domains**: `gmail.com`, `outlook.com`, `*.personal.*`
- **Purpose**: Personal projects and small businesses
- **Features**: Core functionality, limited integrations
- **Compliance**: Basic data protection
- **Support**: Community support

### Public Scope (`PUBLIC`)

**Target**: Public/demo access

- **Domains**: `public`, unknown domains
- **Purpose**: Demos, trials, public access
- **Features**: Minimal functionality
- **Compliance**: Public data only
- **Support**: Self-service only

## 🔧 Feature Matrix Details

### Advanced Analytics
- **Enterprise**: Real-time dashboards, custom reports, predictive analytics
- **Development**: Basic metrics, debug logging
- **Personal**: Usage statistics only
- **Public**: No analytics

### Custom Integrations
- **Enterprise**: Full API access, custom connectors, webhook transformations
- **Development**: Limited API access, standard connectors
- **Personal**: Pre-built integrations only
- **Public**: No custom integrations

### High Availability
- **Enterprise**: Multi-region deployment, automatic failover, 99.9% SLA
- **Development**: Single region, manual failover
- **Personal**: Best effort availability
- **Public**: No availability guarantees

### Multi-Tenant
- **Enterprise**: Complete data isolation, tenant-specific configurations
- **Development**: Shared infrastructure with logical isolation
- **Personal**: Single-tenant only
- **Public**: Shared public environment

### Compliance Mode
- **Enterprise**: Audit trails, data encryption, compliance reporting
- **Development**: Basic logging, no encryption
- **Personal**: Minimal logging
- **Public**: No compliance features

### Debug Tools
- **Enterprise**: Disabled (production safety)
- **Development**: Full debugging, performance profiling, error simulation
- **Personal**: Basic error reporting
- **Public**: No debug tools

## 📏 Limits Matrix Details

### Device Limits
- **Enterprise**: 500-1,000 devices (scaled by organization size)
- **Development**: 10-25 devices (sufficient for testing)
- **Personal**: 3-5 devices (individual use)
- **Public**: 1 device (demo limitation)

### Integration Limits
- **Enterprise**: 30-50 integrations (full automation capability)
- **Development**: 5-10 integrations (testing scenarios)
- **Personal**: 2-3 integrations (essential services)
- **Public**: 1 integration (email only)

### API Rate Limits
- **Enterprise**: 5,000-10,000 calls/minute (high-throughput operations)
- **Development**: 100-500 calls/minute (development testing)
- **Personal**: 50-100 calls/minute (reasonable usage)
- **Public**: 10 calls/minute (demo restrictions)

### Storage Quotas
- **Enterprise**: 500GB-1TB (large-scale data processing)
- **Development**: 1GB-5GB (testing data sets)
- **Personal**: 100MB-500MB (personal data)
- **Public**: 10MB (demo data only)

## 🔗 Integration Matrix Details

### Twitter/X Integration
- **Enterprise**: Full API access, advanced posting, analytics
- **Development**: Full API access for testing
- **Personal**: Basic posting and reading
- **Public**: Disabled

### CashApp Integration
- **Enterprise**: Full payment processing, merchant accounts
- **Development**: Sandbox/test accounts
- **Personal**: Personal payments only
- **Public**: Disabled

### Email Integration
- **Enterprise**: SMTP servers, templates, bulk sending
- **Development**: SMTP with debugging
- **Personal**: Basic email sending
- **Public**: Contact forms only

### SMS Integration
- **Enterprise**: Bulk messaging, delivery tracking, analytics
- **Development**: Test messaging with logging
- **Personal**: Limited personal messaging
- **Public**: Disabled

### Webhook Integration
- **Enterprise**: Custom webhooks, transformations, retry logic
- **Development**: Standard webhooks with debugging
- **Personal**: Disabled (security)
- **Public**: Disabled

## 🏗️ Platform Compatibility Matrix

| Platform | Enterprise | Development | Personal | Public | Notes |
|----------|------------|-------------|----------|--------|-------|
| **Windows** | ✅ Full | ✅ Full | ✅ Full | ✅ Limited | Native .NET integration |
| **macOS** | ✅ Full | ✅ Full | ✅ Full | ✅ Limited | Native Swift/Objective-C |
| **Linux** | ✅ Full | ✅ Full | ✅ Full | ✅ Limited | Docker/Kubernetes optimized |
| **Android** | ❌ N/A | ✅ Dev | ✅ Personal | ❌ N/A | Mobile development focus |
| **iOS** | ❌ N/A | ✅ Dev | ✅ Personal | ❌ N/A | Mobile development focus |
| **Any** | ✅ Full | ✅ Full | ✅ Full | ✅ Limited | Platform-agnostic rules |

## 🔍 Rule Matching Logic

### Domain Pattern Definitions

#### **Exact Match Patterns**
- `apple.com` - Apple corporate domain
- `microsoft.com` - Microsoft corporate domain
- `localhost` - Local development server
- `gmail.com` - Google personal email
- `outlook.com` - Microsoft personal email
- `public` - Fallback for unknown domains

#### **Wildcard Patterns** (Supported)
- `*.dev.*` - Development subdomains (e.g., `api.dev.example.com`)
- `*.staging.*` - Staging environments (e.g., `app.staging.company.com`)
- `*.test.*` - Testing environments (e.g., `qa.test.organization.com`)
- `*.internal.*` - Internal corporate domains
- `*.personal.*` - Personal/custom domains

#### **URL Examples by Scope**

##### **Enterprise URLs**

```bash
https://dashboard.apple.com/admin      # Apple enterprise admin
https://portal.microsoft.com/devices  # Microsoft device management
https://enterprise.company.com/api    # Corporate API endpoints
https://admin.organization.com/users  # User management portal
```

##### **Development URLs**

```bash
http://localhost:3000/debug           # Local development server
https://api.dev.example.com/webhook   # Development API
https://staging.company.com/test      # Staging environment
http://127.0.0.1:8080/metrics        # Local metrics dashboard
```

##### **Personal URLs**

```bash
https://myapp.gmail.com/dashboard     # Personal Gmail integration
https://outlook.com/connect          # Outlook personal setup
https://personal.project.com/api     # Personal project API
https://my-tools.com/integrations    # Personal tool integrations
```

##### **Public URLs**

```bash
https://demo.duoplus.com/trial        # Public demo access
https://try.company.com/free         # Free trial signup
https://public.api.example.com/docs  # Public API documentation
https://sandbox.tool.com/playground  # Public sandbox
```

### Domain Matching Priority
1. **Exact domain match** (highest priority)
   - `apple.com` matches exactly `apple.com`
2. **Wildcard pattern match** (e.g., `*.dev.*`)
   - `api.dev.example.com` matches `*.dev.*`
3. **Scope-based fallback** (e.g., `public` for unknown)
   - Unknown domains default to PUBLIC scope
4. **Platform-specific override** (refined matching)
   - Windows-specific rules for `microsoft.com`

### Platform Normalization
- `win32` → `Windows` (`#0078d4`)
- `darwin` → `macOS` (`#000000`)
- `linux` → `Linux` (`#fcc624`)
- Unknown → `Other` (`#6c757d`)
- Universal → `Any` (`#28a745`)

### Rule Selection Algorithm
```text
Input: domain, platform
Output: best matching rule

1. Normalize platform (win32 → Windows, darwin → macOS, etc.)
2. Find all rules matching domain pattern
3. Filter by platform compatibility
4. Sort by specificity (exact > wildcard > generic)
5. Return highest priority rule
6. Fallback to PUBLIC scope if no match
7. Apply platform-specific overrides if available
```

### Pattern Matching Examples

#### **Domain → Scope Mapping**
```typescript
// Exact matches
"apple.com"      → ENTERPRISE  // Corporate domain
"localhost"      → DEVELOPMENT // Development server
"gmail.com"      → PERSONAL    // Personal email
"unknown.com"    → PUBLIC      // Fallback

// Wildcard matches
"api.dev.company.com"  → DEVELOPMENT // *.dev.* pattern
"staging.app.org"      → DEVELOPMENT // *.staging.* pattern
"test.qa.team.net"     → DEVELOPMENT // *.test.* pattern
```

#### **URL Pattern Recognition**
```typescript
// Enterprise patterns
/^https?:\/\/.*\.apple\.com\/.*/      → ENTERPRISE
/^https?:\/\/.*\.microsoft\.com\/.*/  → ENTERPRISE
/^https?:\/\/admin\..*\..*\/.*/       → ENTERPRISE
/^https?:\/\/portal\..*\..*\/.*/      → ENTERPRISE

// Development patterns
/^http?:\/\/localhost(:[0-9]+)?\/.*/  → DEVELOPMENT
/^https?:\/\/.*\.dev\..*\/.*/         → DEVELOPMENT
/^https?:\/\/.*\.staging\..*\/.*/     → DEVELOPMENT
/^https?:\/\/127\.0\.0\.1(:[0-9]+)?\/.*/ → DEVELOPMENT

// Personal patterns
/^https?:\/\/.*\.gmail\.com\/.*/      → PERSONAL
/^https?:\/\/.*\.outlook\.com\/.*/    → PERSONAL
/^https?:\/\/personal\..*\..*\/.*/    → PERSONAL

// Public patterns (fallback)
/.*/ → PUBLIC // Any unmatched URL
```

## 📈 Usage Examples

### Enterprise Deployment
```typescript
// Apple enterprise deployment
const rule = getMatrixRule("apple.com", "macOS");
// Result: ENTERPRISE scope, full features, 1000 devices
```

### Development Environment
```typescript
// Local development
const rule = getMatrixRule("localhost", "linux");
// Result: DEVELOPMENT scope, debug tools, 10 devices
```

### Personal Use
```typescript
// Gmail user
const rule = getMatrixRule("gmail.com", "Any");
// Result: PERSONAL scope, basic features, 3 devices
```

### Public Access
```typescript
// Unknown domain
const rule = getMatrixRule("unknown.com", "Any");
// Result: PUBLIC scope, minimal features, 1 device
```

## 🔐 Security & Compliance Matrix

| Feature | Enterprise | Development | Personal | Public |
|---------|------------|-------------|----------|--------|
| **Data Encryption** | AES-256 at rest/transit | AES-256 at rest | Basic encryption | No encryption |
| **Audit Logging** | Full compliance logs | Debug logs | Basic logs | No logs |
| **Access Control** | RBAC + SSO | Basic auth | Personal auth | Anonymous |
| **Data Isolation** | Physical isolation | Logical isolation | Single tenant | Shared |
| **Backup/Recovery** | Automated DR | Manual backup | User managed | None |

## 🚀 Performance Characteristics

| Metric | Enterprise | Development | Personal | Public |
|--------|------------|-------------|----------|--------|
| **Lookup Time** | < 0.1ms | < 0.1ms | < 0.1ms | < 0.1ms |
| **Memory Usage** | ~50KB/rule | ~50KB/rule | ~50KB/rule | ~50KB/rule |
| **Cache TTL** | 30 seconds | 30 seconds | 30 seconds | 30 seconds |
| **Concurrent Users** | 10,000+ | 100+ | 10+ | 1 |

## 📋 Migration Guide

### Upgrading from Previous Versions
- **v0.x → v1.0**: All scopes maintain backward compatibility
- **New Features**: Compliance mode, multi-tenant isolation
- **Breaking Changes**: None in v1.0

### Scope Migration
- **Personal → Enterprise**: Contact sales for enterprise license
- **Development → Production**: Update domain configuration
- **Public → Personal**: User account creation required

## 🐛 Troubleshooting Matrix

| Issue | Enterprise | Development | Personal | Public | Solution |
|-------|------------|-------------|----------|--------|----------|
| **Rate Limited** | Contact support | Check usage | Upgrade plan | N/A | Increase limits |
| **Integration Failed** | Check API keys | Verify sandbox | Check credentials | N/A | Update configuration |
| **Feature Unavailable** | License issue | Scope mismatch | Plan limit | By design | Change scope/plan |
| **Performance Issues** | Monitor metrics | Debug tools | Check usage | N/A | Optimize configuration |

## 📞 Support Matrix

| Issue Type | Enterprise | Development | Personal | Public |
|------------|------------|-------------|----------|--------|
| **Critical Bug** | <1 hour | <4 hours | <24 hours | N/A |
| **Feature Request** | Prioritized | Scheduled | Backlog | N/A |
| **General Support** | 24/7 | Business hours | Community | Self-service |
| **Documentation** | Custom training | Standard docs | Help center | FAQ only |

---

_This matrix is the authoritative reference for all DuoPlus Scoping Matrix configurations. Last updated: v1.0.0_
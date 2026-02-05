# DuoPlus Global Rules & Standards

> **🚨 CRITICAL FOUNDATION ALERT: All infrastructure changes must pass cache validation before QR launch**

**Related Documents:**
- [TAGGING_SYSTEM_v6.1.md](./TAGGING_SYSTEM_v6.1.md) - Complete tagging specification with enforcement rules
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - Community and contributor guidelines
- [config/constants-v37.ts](../config/constants-v37.ts) - Runtime configuration constants

---

## 📜 Code of Conduct

All contributors, maintainers, and participants in the DuoPlus project are expected to adhere to our Code of Conduct.

### Core Principles

| Principle | Description | Enforcement |
|-----------|-------------|-------------|
| **Respect** | Treat all participants with dignity and respect | Community moderation |
| **Professionalism** | Maintain professional standards in all communications | PR review |
| **Inclusivity** | Welcome contributors from all backgrounds | Onboarding process |
| **Constructive Feedback** | Provide helpful, actionable feedback on contributions | Code review guidelines |
| **Security First** | Report security issues responsibly via private disclosure | Security team |

### Contributor Expectations

| Area | Expectation | Reference |
|------|-------------|-----------|
| **Code Quality** | All code must meet tagging and quality standards | [TAGGING_SYSTEM_v6.1.md](./TAGGING_SYSTEM_v6.1.md) |
| **Documentation** | All changes must include appropriate documentation | This document |
| **Testing** | CRITICAL changes require 95% test coverage | CI enforcement (E-010) |
| **Security** | No secrets in code, follow secure coding practices | Security scan (E-011) |
| **Communication** | Use clear, professional language in PRs and issues | Community guidelines |

### Reporting & Enforcement

| Issue Type | Contact | Response SLA |
|------------|---------|--------------|
| Code of Conduct violation | #community-moderators | 24 hours |
| Security concern | security@duoplus.dev | 4 hours |
| Harassment/abuse | #hr-team | 2 hours |
| Technical dispute | Team Lead → Engineering Director | 48 hours |

---

## 📋 Document Standards Matrix

| Requirement | Standard | Enforcement | Priority |
|-------------|----------|-------------|----------|
| **Matrix Tables** | All plans MUST include decision matrices | Pre-commit hook | P0 |
| **Performance Metrics** | Every endpoint MUST have latency targets | CI validation | P0 |
| **Cache Strategy** | All GET endpoints MUST define TTL | Cloudflare rules | P0 |
| **Error Handling** | All operations MUST have circuit breakers | Code review | P1 |
| **Timezone Compliance** | All dates MUST use IANA canonical zones | tzdb 2025c | P0 |

---

## 🔄 DOMAIN × SCOPE × TYPE Cross-Reference Matrix

### Primary Domain Matrix

| DOMAIN | Primary Scopes | Valid Types | Security Domains | Performance Domains |
|--------|---------------|-------------|------------------|---------------------|
| **BUN** | WRITE, SPAWN, SERVE, WORKER, HASH_*, ARCHIVE_* | All | SEC, BUG | PERF, FEAT |
| **NODE** | HTTP, ZLIB, FS, OS, TLS | COMPAT, BUG, SPEC | SEC | PERF |
| **WEB** | FETCH, WS, URL, RESPONSE_*, STREAM | SPEC, BUG, FEAT | SEC | PERF |
| **SQL** | DRIVER_MYSQL, DRIVER_PG, DRIVER_SQLITE, INSERT, QUERY | BUG, PERF, FEAT | ❌ | PERF |
| **S3** | READ, WRITE, MULTIPART, STAT, REQUESTER_PAYS | FEAT, BUG | ❌ | PERF |
| **BUILD** | META, FILES, COMPILE, MINIFIER_*, FILES_EMBED | FEAT, BUG | ❌ | PERF |
| **INSTALL** | TARBALL, SYMLINK, CA_BUNDLE, FILTER | BUG, SEC | SEC | ❌ |
| **WINDOWS** | FS, SPAWN, IPC, FD_LIMIT | BUG, PERF | ❌ | PERF |
| **SEC** | SPAWN, TLS, PROXY, CWE_* | Only SEC | All SEC | ❌ |
| **PERF** | HASH_*, BUFFER_*, ASYNC_*, PROMISE_*, JSON_* | Only PERF | ❌ | All PERF |
| **TEST** | RUNNER, TIMERS_FAKE, MOCK_*, JEST_COMPAT | BUG, FEAT | ❌ | PERF |

### Business Domain Matrix

| DOMAIN | Primary Scopes | Valid Types | Security Domains | Performance Domains |
|--------|---------------|-------------|------------------|---------------------|
| **DUO** | GIT, TAGS, DASHBOARD, ANALYTICS, COMPLIANCE | FEAT, BUG | SEC | PERF |
| **FACTORY** | WORKFLOW, TEMPLATES, DEPLOY | FEAT, BUG | SEC | PERF |
| **MERCHANT** | ONBOARDING, BILLING, DASHBOARD | FEAT, BUG | SEC | PERF |
| **QR** | GENERATION, SCANNING, ANALYTICS | FEAT, BUG | SEC | PERF |
| **IDENTITY** | AUTH, SESSION, JWT, OAUTH | FEAT, BUG, SEC | All SEC | ❌ |
| **PAYMENT** | STRIPE, CHECKOUT, WEBHOOK | FEAT, BUG, SEC | All SEC | PERF |
| **ANALYTICS** | EVENTS, AGGREGATION, DASHBOARD | FEAT, BUG | ❌ | PERF |
| **CLOUDFLARE** | WORKER, KV, R2, D1, CACHE | FEAT, BUG | SEC | PERF |
| **INFRASTRUCTURE** | DNS, SSL, CDN, HEALTH | FEAT, BUG | SEC | PERF |

### Cross-Domain Restrictions

#### Impact & Approval Matrix

| DOMAIN | SCOPE | TYPE | AUTO-CLASS | SECURITY IMPACT | DATA IMPACT | PERF IMPACT | REQUIRES APPROVAL | DEPLOY SLA |
|--------|-------|------|------------|-----------------|-------------|-------------|-------------------|------------|
| **BUN** | `WRITE` | `BUG` | `CRITICAL` | HIGH | **CRITICAL** (data loss) | HIGH | Security Team | 2 hours |
| **BUN** | `SPAWN` | `SEC` | `CRITICAL` | **CRITICAL** (CWE-158) | MEDIUM | LOW | Security Team | 2 hours |
| **BUN** | `WORKER` | `BUG` | `CRITICAL` | MEDIUM | **CRITICAL** (GC crash) | HIGH | Team Lead | 2 hours |
| **BUN** | `HASH_CRC32` | `PERF` | `HIGH` | LOW | NONE | **HIGH** (20x) | Team Lead | 24 hours |
| **BUN** | `ARCHIVE` | `FEAT` | `MEDIUM` | LOW | LOW | MEDIUM | Standard PR | 2 weeks |
| **NODE** | `HTTP` | `COMPAT` | `MEDIUM` | LOW | NONE | LOW | Standard PR | 2 weeks |
| **NODE** | `ZLIB` | `BUG` | `HIGH` | LOW | MEDIUM | MEDIUM | Team Lead | 24 hours |
| **WEB** | `WS_DECOMP` | `SEC` | `CRITICAL` | **CRITICAL** (DoS) | NONE | MEDIUM | Security Team | 2 hours |
| **WEB** | `FETCH` | `BUG` | `MEDIUM` | LOW | LOW | LOW | Standard PR | 2 weeks |
| **SQL** | `DRIVER_MYSQL` | `BUG` | `HIGH` | LOW | **HIGH** (corruption) | LOW | Team Lead | 24 hours |
| **SQL** | `DRIVER_PG` | `BUG` | `HIGH` | LOW | **HIGH** (array parsing) | LOW | Team Lead | 24 hours |
| **SQL** | `INSERT` | `BUG` | `HIGH` | LOW | **HIGH** (undefined→NULL) | LOW | Team Lead | 24 hours |
| **S3** | `MULTIPART` | `FEAT` | `MEDIUM` | LOW | LOW | MEDIUM | Standard PR | 2 weeks |
| **SEC** | `PROXY_407` | `SEC` | `HIGH` | **HIGH** (auth bypass) | NONE | LOW | Security Team | 24 hours |
| **SEC** | `TLS_CERT` | `SEC` | `HIGH` | **HIGH** (cert validation) | NONE | LOW | Security Team | 24 hours |
| **PERF** | `BUFFER_SEARCH` | `PERF` | `HIGH` | NONE | NONE | **HIGH** (SIMD) | Team Lead | 24 hours |
| **TEST** | `TIMERS_FAKE` | `BUG` | `HIGH` | NONE | NONE | **HIGH** (test hangs) | Team Lead | 24 hours |
| **BUILD** | `META` | `FEAT` | `MEDIUM` | LOW | LOW | LOW | Standard PR | 2 weeks |
| **DUO** | `TAGS` | `FEAT` | `MEDIUM` | LOW | LOW | LOW | Standard PR | 2 weeks |

#### Enforcement Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| SEC domain exclusivity | SEC domain can ONLY have SEC type | Pre-commit block |
| PERF domain exclusivity | PERF domain can ONLY have PERF type | Pre-commit block |
| Security scope review | SPAWN, PROXY, TLS scopes require SEC review | PR approval required |
| Payment audit trail | PAYMENT domain requires audit logging | Runtime validation |
| Identity isolation | IDENTITY domain cannot access SQL directly | Static analysis |
| CRITICAL auto-class | Must have Security Team approval | Merge blocked |
| Data impact HIGH | Requires backup verification | Pre-deploy check |

### Type × Category Matrix

| TYPE | Category | Requires Review | Auto-testable | Priority |
|------|----------|-----------------|---------------|----------|
| **SEC** | Security | Yes (2 reviewers) | Partial | P0 |
| **BUG** | Bugfix | Yes (1 reviewer) | Yes | P0 |
| **PERF** | Performance | Optional | Yes (benchmarks) | P1 |
| **FEAT** | Feature | Yes (1 reviewer) | Yes | P1 |
| **SPEC** | Specification | Yes (1 reviewer) | Yes | P2 |
| **COMPAT** | Compatibility | Optional | Yes | P2 |
| **DOCS** | Documentation | Optional | No | P3 |

---

## 🔥 Infrastructure Performance Requirements

### Cache Hit Rate Matrix

| Endpoint Category | Minimum Cache Rate | TTL | Circuit Breaker |
|-------------------|-------------------|-----|-----------------|
| `/api/qr/*` | 95% | 86400s edge, 3600s browser | Yes |
| `/api/health` | 80% | 60s edge, 30s browser | Yes |
| `/api/status` | 90% | 300s edge, 60s browser | Yes |
| `/api/metrics` | 70% | 30s edge, 15s browser | Yes |
| Static assets | 99% | 2592000s (30 days) | No |

### Response Time Matrix

| Operation | Target P50 | Target P95 | Max Acceptable | Action on Breach |
|-----------|-----------|-----------|----------------|------------------|
| QR Scan | 87ms | 250ms | 500ms | Circuit open |
| Health Check | 15ms | 50ms | 100ms | Log warning |
| Device Onboard | 2.8s | 8s | 28s | Async fallback |
| API Request | 50ms | 150ms | 300ms | Cache miss retry |
| R2 Read | 25ms | 75ms | 200ms | Local fallback |
| R2 Write | 50ms | 150ms | 500ms | Queue + retry |

### Origin Protection Matrix

| Load Level | Cache Strategy | Rate Limit | Action |
|------------|---------------|------------|--------|
| < 50% | Normal | 1000 req/min | None |
| 50-70% | Aggressive cache | 500 req/min | Extend TTLs |
| 70-85% | Emergency cache | 200 req/min | Delay non-critical |
| > 85% | Circuit open | 50 req/min | Block new requests |

---

## 🛡️ Security Standards Matrix

| Check | Frequency | Blocking | Tool |
|-------|-----------|----------|------|
| Secret scanning | Pre-commit | Yes | scan-secrets.ts |
| AI bot blocking | Real-time | Yes | Cloudflare WAF |
| robots.txt validation | Daily | No | health check |
| SSL certificate expiry | Hourly | Yes (< 7 days) | infrastructure-health.ts |
| DNS record validation | Every 5 min | Yes (missing) | Cloudflare API |

### Bot Protection Matrix

| Bot Category | Action | Rate Limit | Log Level |
|--------------|--------|------------|-----------|
| AI Crawlers (GPTBot, Anthropic) | Block | 0 | WARN |
| Search Engines (Googlebot) | Allow | 100/min | INFO |
| Unknown bots | Challenge | 10/min | WARN |
| Authenticated clients | Allow | 1000/min | DEBUG |

---

## 📊 QR System Performance Matrix

### Pre-Launch Validation Requirements

| Metric | Requirement | Current | Status | Fix |
|--------|-------------|---------|--------|-----|
| Cache hit rate | > 90% | 2.95% | 🔴 CRITICAL | Enable cache reserve |
| Avg response time | < 100ms | 210ms | 🔴 CRITICAL | Fix caching |
| Origin load/scan | < 2 requests | 15 requests | 🔴 CRITICAL | Edge caching |
| Success rate | > 90% | 68% (projected) | 🟡 WARNING | Circuit breakers |
| Max concurrent scans | > 100/min | 12/min | 🔴 CRITICAL | CDN optimization |

### Device Onboarding Flow Matrix

| Step | Target Time | Timeout | Retry | Fallback |
|------|-------------|---------|-------|----------|
| QR Generate | 50ms | 200ms | 3x | Pre-generated pool |
| QR Validate | 100ms | 500ms | 2x | Cached validation |
| Device Discovery | 2s | 10s | 1x | Manual entry |
| Health Checks (15x) | 5s total | 15s | 0x | Skip non-critical |
| Pairing Complete | 500ms | 2s | 2x | Async confirmation |
| **Total** | **< 8s** | **28s** | - | Degraded mode |

---

## 🌐 Timezone Compliance Matrix

| Zone Type | Example | Validation | Action on Failure |
|-----------|---------|------------|-------------------|
| IANA Canonical | America/New_York | tzdb 2025c | Block deployment |
| Deprecated Link | US/Eastern | Reject | Error + suggest canonical |
| Custom offset | GMT+5 | Reject | Error + require IANA |
| UTC | UTC | Accept | Default fallback |

### Scope-to-Timezone Matrix

| Scope | Default Timezone | Fallback | DST Aware |
|-------|-----------------|----------|-----------|
| ENTERPRISE | America/New_York | UTC | Yes |
| DEVELOPMENT | Europe/London | UTC | Yes |
| LOCAL-SANDBOX | UTC | UTC | No |
| PRODUCTION | UTC | UTC | No |
| MONITORING | UTC | UTC | No |
| STATUS_SYSTEM | UTC | UTC | No |

---

## 📁 File & Document Standards

### Required Sections Matrix

| Document Type | Matrix Tables | Performance Targets | Error Handling | Validation |
|---------------|---------------|---------------------|----------------|------------|
| Plan docs | Required | Required | Required | Pre-merge |
| API specs | Required | Required | Required | Pre-merge |
| Config files | N/A | Required | Required | Pre-commit |
| Test files | Optional | Required (benchmarks) | Required | CI |
| README | Recommended | Optional | N/A | None |

### Code Comment Standards

| Tag | Purpose | Example |
|-----|---------|---------|
| `[DOMAIN]` | Business domain | `[DUOPLUS]` |
| `[SCOPE]` | Environment scope | `[ENTERPRISE]` |
| `[TYPE]` | File type | `[TS]`, `[CONFIG]` |
| `[META:{...}]` | Metadata properties | `[META:{cache,health}]` |
| `[#REF:*]` | Reference ID | `[#REF:QR-CACHE-01]` |
| `[BUN-NATIVE]` | Bun-pure compliance | `[BUN-NATIVE]` |

---

## ⚡ Deployment Checklist Matrix

### Pre-Deployment Validation

| Check | Command | Pass Criteria | Blocking |
|-------|---------|---------------|----------|
| Cache validation | `bun run health:cdn` | cf-cache-status: HIT | Yes |
| DNS validation | `bun run health:dns` | All records present | Yes |
| R2 connectivity | `bun run health:r2` | Read/write success | Yes |
| Keepalive test | `bun run health:keepalive` | Connection reuse > 20% | No |
| Secret scan | `bun run security:scan` | No secrets detected | Yes |
| Tests pass | `bun test` | > 80% pass, 0 fail | Yes |

### Rollback Triggers Matrix

| Metric | Threshold | Action | Cooldown |
|--------|-----------|--------|----------|
| Error rate | > 5% | Auto-rollback | 5 min |
| P95 latency | > 2x baseline | Alert + manual | 10 min |
| Cache hit rate | < 50% | Alert + investigate | 15 min |
| Origin load | > 90% | Circuit breaker | 1 min |
| Memory usage | > 85% | Scale up + alert | 5 min |

---

## 🔧 Configuration Templates

### Cloudflare Page Rules Template

```yaml
# Required for all GET endpoints
cache_rules:
  - name: "QR Endpoints"
    match: "*factory-wager.com/api/qr/*"
    actions:
      cache_level: cache_everything
      edge_cache_ttl: 86400
      browser_cache_ttl: 3600
    priority: 1

  - name: "Health Endpoints"
    match: "*factory-wager.com/health*"
    actions:
      cache_level: cache_everything
      edge_cache_ttl: 60
      browser_cache_ttl: 30
    priority: 2

  - name: "API Responses"
    match: "*factory-wager.com/api/*"
    actions:
      cache_level: standard
      edge_cache_ttl: 300
      browser_cache_ttl: 60
    priority: 3
```

### Circuit Breaker Configuration

```typescript
// Required for all external service calls
const circuitConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenMaxAttempts: 3,
  successThreshold: 1,
  monitoringWindow: 60000,
  fallbackEnabled: true,
};
```

---

## 📈 Monitoring Dashboard Matrix

| Panel | Metrics | Refresh | Alert Threshold |
|-------|---------|---------|-----------------|
| Cache Performance | Hit rate, Miss rate, Bypass | 10s | < 80% hit rate |
| Origin Health | Request count, Error rate | 5s | > 10 errors/min |
| Response Times | P50, P95, P99 | 10s | P95 > 500ms |
| QR Onboarding | Success rate, Time-to-pair | 30s | < 85% success |
| R2 Operations | Read/Write latency, Errors | 30s | > 200ms avg |

---

## 🚀 Quick Reference Commands

```bash
# Infrastructure Health
bun run health              # All checks
bun run health:cdn          # CDN + cache status
bun run health:dns          # DNS validation
bun run health:r2           # R2 bucket health
bun run health:keepalive    # HTTP keepalive test
bun run health:json         # JSON output for CI

# Cloudflare Management
bun run cf:zones            # List zones
bun run cf:dns:list         # DNS records
bun run cf:ssl:status       # SSL certificate status
bun run cf:purge            # Purge cache
bun run r2:status           # R2 bucket status

# Security
bun run security:scan       # Scan for secrets
bun run tags:audit:verify   # Verify tag audit trail

# Validation
bun run validate:timezones  # tzdb 2025c compliance
bun run validate:cache      # Cache configuration
```

---

**Last Updated:** 2026-01-16
**Version:** 1.0.0
**Maintainer:** DuoPlus Engineering

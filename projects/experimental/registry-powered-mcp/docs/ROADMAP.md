# Roadmap

This document outlines planned features and improvements for **Registry-Powered-MCP**.

## v1.3.4 - Delta Compression & Performance

**Target**: Q1 2025
**Theme**: Bandwidth optimization and experimental feature stabilization

### Experimental → Stable Graduation

| Feature | Component | Current | Target | Impact |
|:--------|:----------|:--------|:-------|:-------|
| Delta-Update-Aggregator | #37 | EXPERIMENTAL | STABLE | -97.3% bandwidth |
| ZSTD Compression | #55 sub | EXPERIMENTAL | STABLE | -40% package size |
| PGO Build Support | #59 sub | EXPERIMENTAL | STABLE | -15% binary size |

### New Infrastructure Components (#65-69)

| Component | Description | Logic Tier | Status |
|:----------|:------------|:-----------|:-------|
| **#65 QUIC Transport Layer** | HTTP/3 + QUIC for sub-10ms latency | Level 1 | PLANNED |
| **#66 Linux Platform Parity** | Full Linux test coverage | Level 5 | PLANNED |
| **#67 Brotli Compression Engine** | Alternative to gzip/zstd | Level 1 | PLANNED |
| **#68 Connection Coalescing** | HTTP/2 multiplexing optimization | Level 1 | PLANNED |
| **#69 Incremental Build Cache** | Faster rebuilds via content hashing | Level 3 | PLANNED |

### Performance Targets

| Metric | v1.3.3 | v1.3.4 Target | Improvement |
|:-------|:-------|:--------------|:------------|
| P99 Latency | 10.8ms | 9.5ms | -12% |
| Bundle Size | 9.64KB | 8.5KB | -12% |
| Bandwidth (delta) | baseline | -97.3% | MAJOR |
| Cold Start | ~0ms | ~0ms | maintain |

### Feature Flags

```typescript
// New flags for v1.3.4
| "QUIC_TRANSPORT"        // Component #65: HTTP/3 + QUIC
| "LINUX_PARITY"          // Component #66: Linux platform support
| "BROTLI_COMPRESSION"    // Component #67: Brotli encoding
| "CONNECTION_COALESCE"   // Component #68: HTTP/2 optimization
| "INCREMENTAL_CACHE"     // Component #69: Build cache
| "DELTA_STABLE"          // Delta aggregator stable mode
```

### Security & Compliance

| Target | Current | Goal | Priority |
|:-------|:--------|:-----|:---------|
| PQC Key Coverage | 68% | 85% | HIGH |
| Compliance Score | 88.6% | 92% | MEDIUM |
| Quantum Threat Score | 0.12 | <0.10 | MEDIUM |

### Breaking Changes

None planned. Full backwards compatibility with v1.3.3.

---

## v1.4.0 - ML & Predictive Analytics

**Target**: Q2 2025
**Theme**: Machine learning integration and predictive infrastructure

### Planned Features

| Feature | Description | Status |
|:--------|:------------|:-------|
| **ML Prediction Engine** | Odds prediction with confidence scoring | BETA → STABLE |
| **Predictive Scaling** | Auto-scale based on traffic patterns | PLANNED |
| **Anomaly Detection** | Real-time threat pattern recognition | PLANNED |
| **Smart Caching** | ML-driven cache eviction policies | PLANNED |

### Infrastructure Components (#70-74)

| Component | Description | Logic Tier |
|:----------|:------------|:-----------|
| **#70 TensorFlow Lite Runtime** | Edge ML inference | Level 2 |
| **#71 Feature Store** | ML feature caching layer | Level 1 |
| **#72 Model Registry** | Versioned model management | Level 4 |
| **#73 Prediction Gateway** | Low-latency inference API | Level 1 |
| **#74 Training Pipeline** | Offline model training | Level 5 |

### Performance Targets

| Metric | v1.3.4 | v1.4.0 Target |
|:-------|:-------|:--------------|
| Inference Latency | N/A | <5ms |
| Model Size | N/A | <2MB |
| Prediction Accuracy | N/A | >85% |

---

## v2.0.0 - Enterprise Edition

**Target**: Q3 2025
**Theme**: Enterprise features and multi-tenancy

### Planned Features

| Feature | Description | Priority |
|:--------|:------------|:---------|
| **Multi-Tenancy** | Isolated tenant environments | HIGH |
| **RBAC** | Role-based access control | HIGH |
| **Audit Logging** | Compliance-ready audit trails | HIGH |
| **SSO Integration** | SAML/OIDC authentication | MEDIUM |
| **Custom Domains** | Tenant-specific routing | MEDIUM |

### Infrastructure Targets

| Metric | Current | v2.0.0 Target |
|:-------|:--------|:--------------|
| PQC Key Coverage | 68% | 100% |
| Compliance Score | 88.6% | 95%+ |
| Tenant Isolation | N/A | Full |
| Uptime SLA | 99.9% | 99.99% |

### Breaking Changes

- New authentication middleware required
- Tenant ID parameter in all API calls
- Updated configuration schema

---

## Backlog

Features under consideration for future releases:

| Feature | Description | Complexity |
|:--------|:------------|:-----------|
| GraphQL Gateway | Alternative to REST API | HIGH |
| gRPC Transport | Binary protocol support | MEDIUM |
| Edge Functions | User-defined edge logic | HIGH |
| Workflow Engine | Multi-step orchestration | HIGH |
| Rate Limit Tiers | Per-plan rate limiting | LOW |
| Webhook Delivery | Guaranteed webhook dispatch | MEDIUM |
| S3 Select | Query-in-place for logs | LOW |
| OpenTelemetry | OTLP trace export | MEDIUM |

---

## Contributing

To propose a feature:

1. Open an issue with the `enhancement` label
2. Describe the use case and expected impact
3. Reference relevant infrastructure components
4. Include performance implications

Feature proposals are evaluated based on:
- Alignment with performance contract (9.64KB bundle, 10.8ms P99)
- Security implications
- Maintenance burden
- Community demand

---

## Version History

| Version | Release Date | Theme |
|:--------|:-------------|:------|
| v1.3.3 | 2025-12-21 | Infrastructure Expansion |
| v1.3.2 | 2025-12-20 | Package Manager Stability |
| v2.4.1 | 2024-12-19 | Golden Baseline |
| v2.4.0 | 2024-12-15 | Initial Release |

---

*The Registry is Immutable. The Roadmap is Directional.*

**Note**: Dates and features are subject to change based on community feedback and technical constraints. Performance contracts (bundle size, latency) are non-negotiable gates for all releases.

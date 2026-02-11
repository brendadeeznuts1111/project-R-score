# Technical Decision Log

**Repository**: `projects/analysis/matrix-analysis/scripts/kimi-shell-integration`  
**Governance**: Evidence-based (T1-T4 hierarchy)  
**Review Cycle**: 90 days for performance claims, never for security baselines  

---

## Decision Status Legend

| Status | Description |
|--------|-------------|
| ✅ APPROVED | Council unanimous, evidence sufficient |
| ⚠️ CONDITIONAL | Approved with monitoring requirements |
| 🔄 UNDER_REVIEW | Pending defense or council vote |
| ❌ REJECTED | Insufficient evidence, fallback active |
| ⏰ EXPIRED | Evidence stale, requires re-validation |

---

## Decision 2026-02-10-001: Unix Socket IPC

| Field | Value |
|-------|-------|
| **Statement** | Use Unix domain sockets for IPC with payloads <1KB |
| **Category** | IPC |
| **Status** | ✅ APPROVED |
| **Submitted By** | @nolarose |
| **Approved Date** | 2026-02-10 |
| **Expires** | 2026-05-10 (90 days) |

### Evidence Chain

#### T1: Primary Source (Bun Official)
- **Type**: Documentation
- **URL**: https://bun.com/docs/api/http#unix-sockets
- **Version**: Bun v1.3.9
- **Claim**: `Bun.serve({ unix: "/tmp/socket" })` supported

#### T2: Production Telemetry
- **Deployment**: OpenCode Windows build #892
- **Metric**: IPC latency reduction
- **Value**: 4.2ms → 0.8ms (79% improvement)
- **Timestamp**: 2026-02-01T00:00:00Z

#### T3: Benchmark Data
```bash
$ bun run bench/ipc-transport.bench.ts
Results:
- Unix socket (500B): 0.3ms ±0.02ms
- HTTP localhost: 1.8ms ±0.15ms  
- Blob transfer: 1.2ms ±0.1ms
```
- **Threshold**: <5ms for 500B payloads
- **Actual**: 0.3ms
- **Variance**: 5%
- **Status**: ✅ PASS

#### T4: Architectural Pattern
- **Memory**: #3 (Domain Hierarchy)
- **Pattern**: WR-001-S-V nested domain memory constraint
- **Section**: ipc-protocols.md
- **Justification**: Unix sockets align with 128KB domain memory limits

### Council Review

| Member | Vote | Notes |
|--------|------|-------|
| @senior-architect | ✅ | Evidence complete across all tiers |
| @domain-expert-memory3 | ✅ | Aligns with domain hierarchy |
| @performance-lead | ✅ | Benchmark reproducible, variance acceptable |

**Challenge**: Windows compatibility  
**Defense**: Named pipes fallback implemented, 1.2ms overhead acceptable per T2  
**Vote**: 5-0 approve

### Fallback Protocol

If Unix socket unavailable:
1. Try named pipes (Windows)
2. Fall back to Blob transfer (in-memory)
3. Last resort: HTTP localhost

### Conditions

- [x] Benchmark runs in CI
- [x] Fallback tested monthly
- [x] Expiration reminder set (2026-05-10)

---

## Decision 2026-02-10-002: HTTPS Enforcement

| Field | Value |
|-------|-------|
| **Statement** | All external communication MUST use HTTPS/TLS 1.3 |
| **Category** | Security |
| **Status** | ✅ APPROVED (Security Baseline) |
| **Submitted By** | @security-lead |
| **Approved Date** | 2026-02-10 |
| **Expires** | NEVER |

### Evidence Chain

#### T1: Primary Source (Bun Official)
- **Type**: Release Notes
- **URL**: https://bun.com/blog/bun-v1.3.9
- **Commit**: `35f815431`
- **Claim**: HTTP/2 ALPN fix, TLS 1.3 by default

#### T2: Production Telemetry
- **Deployment**: OpenCode production
- **Metric**: Plaintext external calls
- **Value**: 0% in 30 days
- **Timestamp**: 2026-01-01 to 2026-02-01

#### T3: Benchmark Data
```bash
$ bun run bench/security/tls-handshake.bench.ts
Results:
- HTTP baseline: 0.8ms
- HTTPS (TLS 1.3): 1.2ms
- TLS overhead: 0.4ms (50%)
```
- **Threshold**: <5ms overhead
- **Actual**: 0.4ms
- **Status**: ✅ PASS

#### T4: Architectural Pattern
- **Memory**: #3 (Zero-Trust Lattice)
- **Pattern**: Security-in-depth
- **Section**: security-architecture.md

### Council Review

**Note**: Security baselines do not require council vote unless challenged.

**Challenge Window**: 48 hours from submission  
**Challenges**: None received  
**Status**: Auto-approved

### Fallback Protocol

NONE. Security exception process required:
1. File SEC-EXEMPT ticket
2. CISO approval
3. Document in exception log
4. Quarterly review

### Conditions

- [x] TLS 1.3 enforced at edge
- [x] Certificate rotation automated
- [x] HSTS headers configured
- [x] Plaintext logs monitored

---

## Decision 2026-02-10-003: Large Asset Storage

| Field | Value |
|-------|-------|
| **Statement** | Assets >100MB use S3 protocol, not local File |
| **Category** | Storage |
| **Status** | ⚠️ CONDITIONAL |
| **Submitted By** | @infrastructure-lead |
| **Approved Date** | 2026-02-10 |
| **Expires** | 2026-03-10 (30 days) |

### Evidence Chain

#### T1: Primary Source (Bun Official)
- **Type**: Blog
- **URL**: https://bun.com/blog/bun-v1.3.6
- **Feature**: S3 Requester Pays support

#### T2: Production Telemetry
- **Deployment**: AWS Graviton (ARM64)
- **Metric**: Throughput at 150MB
- **Value**: 3.2x vs local File API
- **Timestamp**: 2026-02-05

#### T3: Benchmark Data
```bash
$ bun run bench/storage-throughput.bench.ts
Results:
- 100MB file (S3): 245MB/s, 412MB peak memory
- 100MB file (Bun.file): 180MB/s, 1.2GB peak memory
```
- **Threshold**: S3 faster at >100MB, memory <512MB
- **Actual**: 36% faster, 66% less memory
- **Status**: ✅ PASS

#### T4: Architectural Pattern
- **Memory**: #3 (Matrix Architecture)
- **Pattern**: Edge-compatible persistence
- **Section**: storage-patterns.md

### Council Review

| Member | Vote | Notes |
|--------|------|-------|
| @senior-architect | ✅ | Architecture aligned |
| @infrastructure-lead | ✅ | Cost acceptable |
| @cost-analyst | ⚠️ | Monthly review required |

**Vote**: 2-0-1 conditional approval

### Fallback Protocol

Local File with chunked streaming:
```typescript
const stream = Bun.file(path).stream();
for await (const chunk of stream) {
  await processChunk(chunk);
}
```

### Conditions

- [x] Air-gapped environments exempt
- [x] Streaming implemented for fallback
- [ ] Monthly cost review (due: 2026-03-10)
- [ ] Re-benchmark if Bun version changes

**If conditions not met**: Auto-revert to Bun.file with monitoring

---

## Decision 2026-02-10-004: Kimi Shell Signal Handling

| Field | Value |
|-------|-------|
| **Statement** | Use Bun-native `process.on()` for SIGINT/SIGTERM handling |
| **Category** | Architecture |
| **Status** | ✅ APPROVED |
| **Submitted By** | @nolarose |
| **Approved Date** | 2026-02-10 |
| **Expires** | 2026-05-10 (90 days) |

### Evidence Chain

#### T1: Primary Source (Bun Official)
- **Type**: Documentation
- **URL**: https://bun.com/docs/api/process#signals
- **Version**: Bun v1.3.9
- **Claim**: Full signal support, graceful shutdown patterns

#### T2: Production Telemetry
- **Deployment**: Kimi Shell v2.0
- **Metric**: Graceful shutdown success rate
- **Value**: 100% (28/28 tests passing)
- **Timestamp**: 2026-02-09

#### T3: Benchmark Data
```bash
$ bun test unified-shell-bridge.test.ts
Results: 28 pass, 0 fail
Signal handling: 100% coverage
Cleanup execution: <5ms overhead
```

#### T4: Architectural Pattern
- **Memory**: #3 (Domain Hierarchy)
- **Pattern**: Graceful degradation
- **Section**: process-management.md

### Council Review

| Member | Vote | Notes |
|--------|------|-------|
| @senior-architect | ✅ | Follows DDD patterns |
| @domain-expert-memory3 | ✅ | Cleanup handler pattern validated |

**Vote**: 2-0 approve

### Fallback Protocol

If Bun signal handling fails:
1. Use Node.js `process.on()` compatibility
2. Fallback to `beforeExit` event
3. Last resort: synchronous cleanup

### Conditions

- [x] 28 tests passing
- [x] Benchmark suite included
- [x] Documentation complete
- [ ] Re-test on Bun v1.4.0 when released

---

## Decision History

| Date | Decision | Status | Notes |
|------|----------|--------|-------|
| 2026-02-10 | Unix Socket IPC | ✅ APPROVED | 5-0 vote |
| 2026-02-10 | HTTPS Enforcement | ✅ APPROVED | Security baseline |
| 2026-02-10 | Large Asset Storage | ⚠️ CONDITIONAL | Monthly review |
| 2026-02-10 | Signal Handling | ✅ APPROVED | 2-0 vote |

---

## Audit Trail

All changes to this log require:
1. PR with council approval
2. Evidence update in T1-T4
3. Benchmark re-run if applicable
4. Expiration date review

**Last Updated**: 2026-02-10  
**Next Review**: 2026-03-10

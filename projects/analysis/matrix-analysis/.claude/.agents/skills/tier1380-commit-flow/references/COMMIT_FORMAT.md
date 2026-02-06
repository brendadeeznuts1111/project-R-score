# Tier-1380 Commit Message Format

## Standard Template

```
[DOMAIN][COMPONENT][TIER:XXXX] Brief description (50 chars)

Detailed explanation (if needed):
- Point 1
- Point 2

Refs: #issue
```

## Extended Template (Rich Metadata)

```
[DOMAIN][SCOPE][TYPE][META:{TIER:1380}][CLASS][FUNCTION] Brief description

[INTERFACE] [BUN-NATIVE] [#REF:#123]

Detailed explanation:
- What changed
- Why it changed
- Impact assessment
```

## Segment Reference

| Segment | Example Values | Purpose |
|:--------|:---------------|:--------|
| `[DOMAIN]` | `SKILLS`, `SECURITY`, `MARKET`, `INFRA`, `MICROSTRUCTURE`, `RUNTIME`, `PLATFORM` | Business vertical |
| `[SCOPE]` | `FLOW`, `AUTH`, `ODDS`, `TCP`, `STORAGE`, `CHROME`, `MATRIX`, `BLAST` | System component |
| `[TYPE]` | `FEAT`, `FIX`, `REFACTOR`, `PERF`, `DOCS`, `CHORE` | Change classification |
| `[META:{PROPERTY}]` | `META:{TIER:1380}`, `META:{RISK:HIGH}`, `META:{REGION:APAC}` | Key-value metadata |
| `[CLASS]` | `QuantumResistantSecureDataRepository`, `AgentWorkflow` | Primary class affected |
| `[FUNCTION]` | `encrypt`, `verifySeal`, `driftDetect`, `checkSemver` | Method signature |
| `[INTERFACE]` | `SkillPattern`, `ArrayBufferView`, `Col89AuditEntry` | Type contracts |
| `[#REF:*]` | `[#REF:51]`, `[#REF:#123]` | Issue/PR/Commit linkage |
| `[BUN-NATIVE]` | Flag | Zero-dependency Bun API usage |

## Examples

### Standard
```
[RUNTIME][COMPONENT:CHROME][TIER:1380] Add entropy caching for col_72

- Implements 50% faster Buffer operations
- Adds LRU cache for repeated calculations
- Backwards compatible with existing API

Refs: #phase-3-9-apex
```

### Extended
```
[RUNTIME][AGENT][FEAT][META:{TIER:1380}][AgentWorkflow][enforceCol89] Add R2 integration

[Col89AuditEntry] [BUN-NATIVE] [#REF:#123]

- Upload Col-89 violations to R2 fw-audit-logs bucket
- Dynamic import of agent-r2-integration module
- Presigned URLs for audit report retrieval
```

## Domains

| Domain | Use For |
|--------|---------|
| RUNTIME | Core runtime, Bun features |
| PLATFORM | Infrastructure, deployment |
| SECURITY | Authentication, encryption |
| API | Endpoints, schemas |
| UI | Frontend, dashboards |
| DOCS | Documentation, guides |
| CONFIG | Settings, configs |
| TEST | Test files, coverage |
| BENCH | Benchmarks, performance |
| STYLE | Formatting, linting |

## Components

| Component | Description |
|-----------|-------------|
| CHROME | Chrome State (Cols 71-75) |
| MATRIX | Matrix columns (Cols 0-96) |
| BLAST | Bun BLAST suite |
| TELEMETRY | wss:// live telemetry |
| SKILLS | Skills standards (Cols 89-95) |
| KIMI | Kimi CLI integration |
| BUILD | Build system |
| DEPLOY | Deployment pipeline |
| COLOR | Color system (Tier-1380) |
| PALETTE | Theme palettes |
| ACCESSIBILITY | WCAG/a11y validation |
| WEBSOCKET | Real-time sync |
| R2 | R2 storage |
| CLI | CLI tools |
| OPENCLAW | OpenClaw Gateway |
| GATEWAY | Gateway server/WebSocket |
| TELEGRAM | Telegram Bot integration |
| AGENT | Matrix Agent |
| PROFILES | Profile management |
| MONITORING | Prometheus/metrics |
| MIGRATION | Legacy migration tools |

## Type Indicators

| Type | Use When |
|------|----------|
| FEAT | New feature |
| FIX | Bug fix |
| REFACTOR | Code restructuring |
| PERF | Performance improvement |
| DOCS | Documentation only |
| CHORE | Maintenance tasks |
| TEST | Adding/updating tests |
| STYLE | Formatting changes |

## Metadata Properties

### TIER
```
[TIER:1380]    # Standard Tier-1380
[TIER:900]     # Legacy tier
[TIER:0]       # Universal/any tier
```

### RISK
```
[RISK:LOW]     # Safe, tested change
[RISK:MEDIUM]  # Requires review
[RISK:HIGH]    # Critical system, needs approval
```

### REGION
```
[REGION:APAC]  # Asia-Pacific
[REGION:NA]    # North America
[REGION:EU]    # Europe
[REGION:GLOBAL]# All regions
```

## Best Practices

1. **Keep first line under 50 characters**
2. **Use imperative mood** ("Add" not "Added")
3. **Reference issues** with `Refs: #issue`
4. **Include breaking changes** with `BREAKING:` prefix
5. **Tag with [BUN-NATIVE]** when using Bun APIs
6. **Always include TIER metadata** for Tier-1380 projects

## Validation

Use the validation script:
```bash
bun ~/.kimi/skills/tier1380-commit-flow/scripts/validate-message.ts "[RUNTIME][CHROME][TIER:1380] Fix entropy calc"
```

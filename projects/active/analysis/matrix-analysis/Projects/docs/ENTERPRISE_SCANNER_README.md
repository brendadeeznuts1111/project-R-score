# Enterprise Security Scanner

Comprehensive security scanning with supply chain, license, and code analysis for Bun-based projects.

## Features

### 1. Pre-install Gate
Modifies `bunpm add` to scan packages before download:
- Blocks packages with `[SUPPLY_CHAIN][BLOCKED]` tags
- Requires `--force-license` flag for unapproved licenses
- Caches results in `.bunpm/scan-cache/`

```bash
bunpm add express
# ❌ BLOCKED: express@4.18.0
# Reason: Security advisory CVE-2024-XXXX
# Security Advisory: https://...

bunpm add some-package --force-license
# ⚠️  LICENSE: some-package@1.0.0 (audited)
```

### 2. Rule DB Hot-Reload
Load rules from URL instead of embedding:

```typescript
// scanner.ts
const rulesUrl = process.env.SCANNER_RULES_URL || "https://security.internal/rules.db";
const rulesDb = await fetch(rulesUrl).then(r => r.arrayBuffer());
// Verify signature with embedded public key before loading
```

Security team can push new rules without redeploying the binary.

### 3. Streaming SARIF Output
For massive monorepos (10k+ files), streams JSON instead of buffering:

```typescript
// Uses StreamingJSONWriter internally
await scanner.scan(".", { format: "sarif" });
// Outputs: scan-{traceId}.sarif.json
```

Prevents OOM on large-scale enterprise scans.

### 4. Gradual Enforcement
Three modes via `--mode` or `.scannerrc`:

- **audit**: Log violations, exit 0 (adoption phase)
- **warn**: Print warnings, exit 0 (migration phase)  
- **enforce**: Exit 1 on violations (production phase)

```json
// .scannerrc
{
  "mode": "enforce",
  "effectiveDate": "2026-02-01"
}
```

### 5. Baseline Generation
Grandfather existing issues:

```bash
bun enterprise-scanner.ts --generate-baseline
# Creates .scanner-baseline.json

# New issues fail the build, legacy issues warn
bun enterprise-scanner.ts --baseline .scanner-baseline.json
```

### 6. Metrics Endpoint
Prometheus metrics on `--metrics-port=9090`:

```text
scanner_files_scanned_total 1247
scanner_issues_found{severity="error"} 3
scanner_duration_seconds 8.9
scanner_cache_hit_ratio 0.94
```

### 7. Distributed Tracing
Propagate traceId through toolchain:

```bash
TRACE_ID=019bee46 bunpm install
# Scanner uses same ID in SARIF output
# Dashboard correlates package install with security scan
```

### 8. VS Code Extension Bridge
NDJSON output for IDE consumption:

```bash
bun enterprise-scanner.ts --format=ndjson
```

Output:
```json
{"type":"start","files":1247}
{"type":"issue","file":"src/app.ts","line":42,"severity":"error","message":"..."}
{"type":"progress","current":50,"total":100,"eta":"2.3s"}
{"type":"complete","score":82,"duration":8.9}
```

### 9. Fix Suggestions API
Machine-readable patches:

```bash
bun enterprise-scanner.ts --suggest-fixes > fixes.json
bun enterprise-scanner.ts --apply-suggestions fixes.json
```

### 10. Sandbox Mode
Run parser in isolated subprocess:

```bash
bun enterprise-scanner.ts --sandbox
```

## Usage

### Basic Scan
```bash
bun enterprise-scanner.ts .
```

### With Configuration
```bash
# Load from .scannerrc
bun enterprise-scanner.ts --config .scannerrc

# Or environment variables
SCANNER_MODE=enforce SCANNER_RULES_URL=https://... bun enterprise-scanner.ts .
```

### Generate Baseline
```bash
bun enterprise-scanner.ts --generate-baseline
```

### Pre-install Gate
```typescript
import { checkPackageBeforeInstall } from "./bunpm-preinstall-gate.ts";

await checkPackageBeforeInstall("express", "4.18.0", {
  forceLicense: false
});
```

## Configuration

### .scannerrc
```json
{
  "mode": "enforce",
  "effectiveDate": "2026-02-01",
  "rulesUrl": "https://security.internal/rules.db",
  "baselinePath": ".scanner-baseline.json",
  "metricsPort": 9090,
  "sandbox": true,
  "suggestFixes": true
}
```

### Environment Variables
- `SCANNER_MODE`: audit | warn | enforce
- `SCANNER_FORMAT`: sarif | json-stream | github | ndjson
- `SCANNER_RULES_URL`: URL to rules database
- `SCANNER_METRICS_PORT`: Prometheus metrics port
- `SCANNER_SANDBOX`: true | false
- `SCANNER_SUGGEST_FIXES`: true | false
- `SCANNER_BASELINE`: Path to baseline file
- `TRACE_ID`: Distributed tracing ID

## Architecture

```text
enterprise-scanner.ts (Core)
├── RuleDatabase (Hot-reload rules)
├── EnterpriseScanner (Main scanner)
├── MetricsCollector (Prometheus metrics)
└── ScanCache (Result caching)

bunpm-preinstall-gate.ts (Pre-install hook)
scanner-config.ts (Configuration management)
scanner-metrics.ts (Metrics server)
scanner-sandbox.ts (Isolated execution)
scanner-fix-suggestions.ts (Auto-fix)
scanner-ndjson-bridge.ts (VS Code integration)
```

## Integration

### With Bun Package Manager
```typescript
// In bunpm's package resolution
import { checkPackageBeforeInstall } from "./bunpm-preinstall-gate.ts";

const result = await checkPackageBeforeInstall(packageName, version, flags);
if (!result.allowed) {
  throw new Error(result.reason);
}
```

### With CI/CD
```yaml
# .github/workflows/security.yml
- name: Security Scan
  run: |
    bun enterprise-scanner.ts --mode=enforce --baseline .scanner-baseline.json
  env:
    SCANNER_RULES_URL: ${{ secrets.SCANNER_RULES_URL }}
    TRACE_ID: ${{ github.run_id }}
```

## Performance

- **Streaming**: Handles 10k+ files without OOM
- **Caching**: `.bunpm/scan-cache/` avoids re-scanning
- **Parallel**: Scans multiple files concurrently
- **Metrics**: Real-time observability via Prometheus

## Security

- **Signature Verification**: Rules verified before loading
- **Sandbox Mode**: Isolated subprocess execution
- **Baseline**: Grandfather existing issues safely
- **Tracing**: Full audit trail with trace IDs

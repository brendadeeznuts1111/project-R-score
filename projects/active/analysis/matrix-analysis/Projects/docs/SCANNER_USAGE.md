# Enterprise Scanner Usage

## Quick Start

### Build Scanner
```bash
bun deploy-scanner.ts
```

### Run Scan
```bash
# Using built binary
./dist/scanner/enterprise-scanner . --format=sarif > scan.sarif

# After global installation
bun-enterprise-scan . --format=sarif > scan.sarif
```

## Installation

### Install Globally
```bash
bun deploy-scanner.ts --install
```

After installation, use `bun-enterprise-scan` from anywhere.

### Use Without Installation
```bash
# Create alias in your shell
alias bun-enterprise-scan='./dist/scanner/enterprise-scanner'

# Or add to PATH
export PATH="$PATH:$(pwd)/dist/scanner"
```

## Output Formats

### SARIF Format
```bash
bun-enterprise-scan . --format=sarif > scan.sarif
```

Outputs SARIF 2.1.0 compliant JSON to stdout (can be redirected).

### JSON Format (default)
```bash
bun-enterprise-scan . > scan.json
```

Outputs detailed scan results with trace ID, issues, and metadata.

### NDJSON Format (for VS Code)
```bash
bun-enterprise-scan . --format=ndjson
```

Streams newline-delimited JSON for IDE integration.

## Scan Modes

### Audit Mode (default)
```bash
bun-enterprise-scan . --mode=audit
```
- Logs issues, exits with code 0
- Good for initial adoption

### Warn Mode
```bash
bun-enterprise-scan . --mode=warn
```
- Prints warnings, exits with code 0
- Good for migration phase

### Enforce Mode
```bash
bun-enterprise-scan . --mode=enforce
```
- Exits with code 1 on violations
- Use in CI/CD for production

## Examples

### Generate Baseline
```bash
bun-enterprise-scan --generate-baseline
```

Creates `.scanner-baseline.json` with current issues grandfathered in.

### Scan with Baseline
```bash
bun-enterprise-scan . --baseline .scanner-baseline.json
```

Only reports new issues, ignores baseline issues.

### With Metrics
```bash
bun-enterprise-scan . --metrics-port=9090
```

Starts Prometheus metrics server on port 9090.

### With Tracing
```bash
TRACE_ID=019bee46 bun-enterprise-scan . --format=sarif > scan.sarif
```

Propagates trace ID through the scan for distributed tracing.

## CI/CD Integration

### GitHub Actions
```yaml
- name: Security Scan
  run: |
    bun deploy-scanner.ts
    ./dist/scanner/enterprise-scanner . --format=sarif --mode=enforce > scan.sarif
  continue-on-error: false

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: scan.sarif
```

### GitLab CI
```yaml
security-scan:
  script:
    - bun deploy-scanner.ts
    - ./dist/scanner/enterprise-scanner . --format=sarif > scan.sarif
  artifacts:
    reports:
      sast: scan.sarif
```

## Output Files

When using `--format=sarif`, the scanner outputs:
- **stdout**: SARIF JSON (redirect to file with `> scan.sarif`)
- **stderr**: Progress messages and summaries

Example:
```bash
# SARIF goes to file, progress to console
bun-enterprise-scan . --format=sarif > scan.sarif

# Both to file
bun-enterprise-scan . --format=sarif > scan.sarif 2>&1
```

## SARIF Format

The output follows SARIF 2.1.0 specification:

```json
{
  "version": "2.1.0",
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "runs": [{
    "tool": {
      "driver": {
        "name": "Enterprise Scanner",
        "version": "1.0.0"
      }
    },
    "results": [...],
    "invocations": [...]
  }]
}
```

Compatible with:
- GitHub Security tab
- GitLab Security Dashboard
- Azure DevOps Security
- SonarQube
- Other SARIF-compatible tools

# 🔐 Fire22 Security Scanner

Advanced security scanner for Fire22 Dashboard using Bun's native security
features.

## Features

- **Dependency Vulnerability Scanning**: Identifies known CVEs in package.json
  dependencies
- **Secret Detection**: Scans for exposed API keys, tokens, and credentials
- **System Security**: Checks file permissions and system security issues
- **Secure Storage**: Uses Bun.secrets for secure credential and result storage
- **Risk Assessment**: Provides security scoring and risk level classification
- **Performance**: Native Bun performance with nanosecond precision timing

## Installation

```bash
bun add @fire22/security-scanner
```

## Usage

### Programmatic Usage

```typescript
import { Fire22SecurityScanner } from '@fire22/security-scanner';

const scanner = new Fire22SecurityScanner();
const result = await scanner.performSecurityScan('./my-project');

console.log(`Security Score: ${result.score}/100`);
console.log(`Risk Level: ${result.riskLevel}`);
console.log(`Found ${result.vulnerabilities.length} vulnerabilities`);
```

### CLI Usage

```bash
# Scan current directory
bun run @fire22/security-scanner

# Scan specific directory
bun run @fire22/security-scanner /path/to/project
```

### Integration with bunfig.toml

```toml
[install.security]
scanner = "@fire22/security-scanner"

[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry/"
```

## Security Checks

### 1. Dependency Vulnerabilities

- Scans package.json for known CVE vulnerabilities
- Checks version ranges against vulnerability databases
- Provides fix versions and upgrade recommendations

### 2. Secret Detection

- AWS Access Keys (`AKIA...`)
- GitHub Personal Access Tokens (`ghp_...`)
- Private Keys (`-----BEGIN PRIVATE KEY-----`)
- API Keys (`api_key=...`)
- Database Connection Strings

### 3. System Security

- File permission checks (world-writable files)
- Executable script validation
- Configuration security review

## Risk Levels

- **Critical**: Immediate action required (exposed secrets, critical CVEs)
- **High**: High priority vulnerabilities or multiple medium issues
- **Medium**: Moderate security concerns
- **Low**: Minor issues or best practice violations

## Secure Credential Storage

Use Bun.secrets for secure credential storage:

```bash
# Store credentials securely
bun -e "
import { secrets } from 'bun';
await secrets.set({
  service: 'fire22-dashboard',
  name: 'github-token',
  value: 'ghp_xxxxxxxxxxxxxxxxxxxx',
});
console.log('Token stored securely');
"
```

## Integration Examples

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
bun run @fire22/security-scanner
if [ $? -ne 0 ]; then
  echo "Security scan failed. Commit blocked."
  exit 1
fi
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Security Scan
  run: |
    bun install @fire22/security-scanner
    bun run @fire22/security-scanner
```

### Workspace Testing

```bash
#!/bin/bash
# Enhanced workspace testing with security

set -euo pipefail

echo "🔐 Running security audit..."
bun audit --audit-level=high --prod

echo "🔍 Scanning for vulnerabilities..."
bun run @fire22/security-scanner

# Store credentials from secure storage
export GITHUB_TOKEN=$(bun -e "
import { secrets } from 'bun';
const token = await secrets.get({
  service: 'fire22-cli',
  name: 'github-token'
});
console.log(token || '');
")

# Run tests across all workspaces
for workspace in workspaces/*/; do
  if [[ -f "$workspace/package.json" ]]; then
    echo "🧪 Testing $(basename "$workspace")..."
    cd "$workspace"
    bun test
    cd - > /dev/null
  fi
done
```

## Configuration

### Scanner Configuration

The scanner can be configured via environment variables:

```bash
export FIRE22_SECURITY_LEVEL=high        # low, medium, high, critical
export FIRE22_SCAN_SECRETS=true          # Enable secret scanning
export FIRE22_SCAN_DEPENDENCIES=true     # Enable dependency scanning
export FIRE22_SCAN_SYSTEM=true           # Enable system security scanning
```

### Custom Vulnerability Database

```typescript
scanner.addCustomVulnerability({
  packageName: 'my-package',
  vulnerability: {
    id: 'CUSTOM-001',
    title: 'Custom vulnerability',
    severity: 'medium',
    description: 'Description of the issue',
    affectedPackages: ['my-package@<1.0.0'],
    recommendation: 'Upgrade to version 1.0.0 or later',
  },
});
```

## Performance

- **Scan Speed**: ~50-200ms for typical projects
- **Memory Usage**: <50MB during scanning
- **Nanosecond Precision**: Uses `Bun.nanoseconds()` for accurate timing
- **Concurrent Processing**: Parallel file scanning for improved performance

## Security Features

- **No Network Calls**: All scanning performed locally
- **Secure Storage**: Uses OS-native credential storage
  (Keychain/libsecret/CredMan)
- **Memory Safety**: No persistent storage of sensitive data
- **Audit Trail**: Secure logging of scan results with timestamps

## License

MIT © Fire22 Security Team

# Fire22 Enterprise Security Scanner

Advanced security scanning for Bun package installations with enterprise-grade
threat detection.

## Features

- 🔍 **CVE Vulnerability Detection** - Real-time vulnerability scanning
- 📋 **License Compliance** - Enterprise license policy enforcement
- 🛡️ **Malware Detection** - Supply chain attack prevention
- 🎯 **Typosquatting Protection** - Prevents domain-squatting attacks
- 🔒 **Registry Trust Validation** - Trusted registry enforcement
- 📊 **Enterprise Audit Logging** - Comprehensive security reporting

## Installation

### Local Development

```bash
# Link the scanner for local testing
cd packages/fire22-security-scanner
bun link

# In your project
bun link fire22-security-scanner
```

### Production

```bash
# Publish to npm (when ready)
bun publish

# Install from npm
bun add -d fire22-security-scanner
```

## Configuration

Add to your `bunfig.toml`:

```toml
[install.security]
scanner = "fire22-security-scanner"
level = "fatal"
enable = true

[install.security.options]
license_check = true
malware_scan = true
vulnerability_check = true
enterprise_mode = true

[install.security.fire22]
trusted_registries_only = true
require_audit = true
policies = [
    "no-typosquatting",
    "no-malicious-code",
    "license-compliance",
    "supply-chain-security"
]
```

## Security Features

### Threat Detection Categories

- **🔴 Critical (Fatal)**: Malware, backdoors, botnets, critical vulnerabilities
- **🟠 High (Fatal)**: High-severity vulnerabilities, supply chain attacks
- **🟡 Medium (Warning)**: License violations, typosquatting
- **🟢 Low (Info)**: Minor issues, informational warnings

### Built-in Security Rules

#### Known Threats Database

- Real-time CVE database integration
- Historical vulnerability tracking
- Package-specific threat intelligence

#### License Compliance

- Enterprise license blacklist enforcement
- GPL/AGPL detection and blocking
- Custom license policy support

#### Supply Chain Security

- Registry trust validation
- Package integrity verification
- Dependency chain analysis

#### Typosquatting Detection

- Popular package name monitoring
- Levenshtein distance analysis
- Suspicious name pattern detection

## Usage Examples

### Basic Package Installation

```bash
# Automatic security scanning
bun add axios

# Force security scan
bun add new-package --security-scan

# Skip security scan (not recommended)
bun add test-package --no-security-scan
```

### Security Operations

```bash
# Run security audit
bun run security:audit

# Test security scanner
bun run security:test

# View security demo
bun run security-demo
```

## API Reference

### Scanner Interface

```typescript
interface Bun.Security.Scanner {
  version: string;
  scan(packages: Bun.Security.Package[]): Promise<Bun.Security.Advisory[]>;
}
```

### Advisory Levels

```typescript
type AdvisoryLevel = 'fatal' | 'warn';

interface Advisory {
  level: AdvisoryLevel;
  package: string;
  url?: string;
  description?: string;
}
```

## Testing

Run the comprehensive test suite:

```bash
bun test
```

Test categories:

- ✅ Malicious package detection
- ✅ Vulnerability scanning
- ✅ License compliance
- ✅ Typosquatting prevention
- ✅ Registry trust validation
- ✅ Multi-package analysis

## Enterprise Integration

### CI/CD Pipeline Integration

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install # Triggers security scan
      - run: bun run security:audit
```

### Custom Threat Intelligence

```typescript
// Custom threat feed integration
async function fetchEnterpriseThreatFeed(packages: Bun.Security.Package[]) {
  // Fetch from enterprise threat intelligence API
  const response = await fetch(
    'https://threat-intelligence.fire22.com/api/v1/threats'
  );
  const enterpriseThreats = await response.json();

  return enterpriseThreats.filter(threat =>
    packages.some(
      pkg =>
        pkg.name === threat.package &&
        Bun.semver.satisfies(pkg.version, threat.range)
    )
  );
}
```

## Configuration Options

### Security Levels

- `"fatal"`: Block installation on security issues
- `"warn"`: Show warnings but allow installation

### Enterprise Policies

- `"no-typosquatting"`: Block suspected typosquatting
- `"no-malicious-code"`: Block known malicious packages
- `"license-compliance"`: Enforce license policies
- `"supply-chain-security"`: Validate supply chain integrity

## Troubleshooting

### Common Issues

**Scanner not found:**

```toml
# Ensure correct package name in bunfig.toml
[install.security]
scanner = "fire22-security-scanner"
```

**False positives:**

```toml
# Adjust security level
[install.security]
level = "warn"  # Instead of "fatal"
```

**Performance issues:**

```toml
# Disable non-essential checks
[install.security.options]
malware_scan = false  # If causing slowdowns
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- 📧 Email: security@fire22.com
- 💬 Discord: Fire22 Security
- 📖 Docs: https://fire22.com/docs/security

---

**🔒 Securing enterprise software supply chains, one package at a time.**

# @fire22/security-scanner

Production-ready Bun Security Scanner with enterprise-grade threat detection for
Fire22 workspace. Implements the complete Bun Security Scanner API with threat
feed integration, vulnerability detection, and custom security policies.

## 🚀 Quick Start

```bash
# Install the scanner
bun add -d @fire22/security-scanner

# Configure in bunfig.toml
[install.security]
scanner = "@fire22/security-scanner"

# All package operations now security-scanned
bun install
```

## 🛡️ Security Features

### Fatal Level Protection

- **Malware Detection**: Backdoors, token stealers, botnet packages
- **Cryptocurrency Mining**: Blocks crypto mining packages (Fire22 policy)
- **Typosquatting**: Detects packages impersonating popular libraries
- **Critical CVEs**: Known severe vulnerabilities with immediate blocking

### Warning Level Advisories

- **Policy Violations**: Fire22 workspace-specific security policies
- **Deprecated Packages**: Outdated or unmaintained packages
- **Pre-release Versions**: Alpha/beta packages in production context
- **Suspicious Patterns**: Network tunneling, obfuscation tools

### Enterprise Integration

- **Threat Feed**: Real-time security intelligence with Zod validation
- **CVE Database**: Automated vulnerability detection using
  `Bun.semver.satisfies()`
- **Fire22 Policies**: Custom workspace security rules
- **Performance**: Sub-100ms scanning with efficient caching

## 🔧 Configuration

### bunfig.toml

```toml
[install.security]
scanner = "@fire22/security-scanner"

[install]
auto = false          # Enhanced security mode
exact = true          # Use exact versions
production = true     # Production-grade installs

# Fire22 registry configuration
registry = "https://registry.npmjs.org/"
scopes = {
  "@fire22" = "https://fire22.workers.dev/registry"
}
```

### Advanced Configuration

```javascript
// Custom scanner config (optional)
export default {
  threatFeed: {
    enabled: true,
    url: 'https://api.fire22.com/security/threat-feed',
    updateInterval: 3600000, // 1 hour
    timeout: 10000,
  },
  policies: {
    fire22Workspace: true,
    customPolicies: [
      {
        name: 'no-eval-usage',
        pattern: /eval-/i,
        level: 'fatal',
        description: 'Packages using eval() are prohibited',
      },
    ],
  },
  typosquatDetection: {
    enabled: true,
    threshold: 2, // Levenshtein distance
  },
};
```

## 📊 Security Policies

### Fire22 Workspace Policies

| Policy                | Level | Description                                   |
| --------------------- | ----- | --------------------------------------------- |
| **Crypto Mining**     | Fatal | Blocks cryptocurrency mining packages         |
| **Gambling**          | Warn  | Non-Fire22 gambling packages require approval |
| **Network Tunneling** | Warn  | VPN/proxy packages need security review       |
| **Code Obfuscation**  | Warn  | Minification/obfuscation tools flagged        |

### Trusted Packages

- `@fire22/*` - All Fire22 internal packages automatically trusted
- `@types/*` - TypeScript definitions allowed
- Core libraries: `express`, `zod`, `typescript`, etc.

## 🔍 Detection Capabilities

### Threat Categories

```typescript
type ThreatCategory =
  | 'backdoor' // Remote access trojans
  | 'botnet' // Botnet participation
  | 'malware' // General malicious software
  | 'token-stealer' // Credential theft
  | 'crypto-miner' // Cryptocurrency mining
  | 'protestware' // Political/protest software
  | 'adware' // Advertising injection
  | 'deprecated' // Unmaintained packages
  | 'typosquatting' // Name similarity attacks
  | 'suspicious'; // Unusual behavior patterns
```

### Vulnerability Detection

- **CVE Integration**: Real-time CVE database checking
- **Semver Ranges**: Precise version vulnerability matching
- **Severity Scoring**: CVSS-based risk assessment
- **Update Recommendations**: Automated fix suggestions

## ⚡ Performance

- **Scan Speed**: < 100ms for typical package lists
- **Memory Usage**: Minimal overhead with efficient caching
- **Threat Feed**: 1-hour TTL with background updates
- **Batch Processing**: Optimized for large dependency trees

### Benchmarks

```bash
# 100 packages scanned in ~95ms
✅ Packages Scanned: 100
⏱️ Scan Time: 94.3ms
🚀 Performance: Excellent
```

## 🧪 Testing

Comprehensive test suite covering all security scenarios:

```bash
# Run all tests
bun test

# Test specific scenarios
bun test --grep "Fatal Level"
bun test --grep "Fire22 Integration"
bun test --grep "Vulnerability Detection"

# Watch mode for development
bun test --watch
```

### Test Coverage

- ✅ Fatal threat detection (malware, crypto mining, typosquats)
- ✅ Warning scenarios (policies, pre-releases, deprecated)
- ✅ Fire22 workspace integration
- ✅ Semver vulnerability checking
- ✅ Threat feed validation
- ✅ Performance benchmarking
- ✅ Error handling and edge cases

## 📋 API Reference

### Main Scanner Function

```typescript
async function scan(request: ScanRequest): Promise<ScanResult>;
```

### Request Format

```typescript
interface ScanRequest {
  packages: Array<{
    name: string;
    version: string;
    registry?: string;
  }>;
  context?: {
    production?: boolean;
    environment?: string;
  };
}
```

### Response Format

```typescript
interface ScanResult {
  advisories: SecurityAdvisory[];
  metadata: {
    scannerName: string;
    scannerVersion: string;
    scanTime: number;
    packagesScanned: number;
  };
}
```

### Advisory Levels

```typescript
interface SecurityAdvisory {
  level: 'fatal' | 'warn';
  package: string;
  version: string;
  title: string;
  description: string;
  recommendation: string;
  url?: string;
  cve?: string;
}
```

## 🔗 Integration Examples

### Fire22 Workspace

```typescript
import scan from '@fire22/security-scanner';

// Automatic scanning during bun install
// Results in installation cancellation for fatal threats
// User prompts for warnings in interactive mode
```

### CI/CD Pipeline

```bash
# Pre-deployment security check
bun install --frozen-lockfile
# Scanner automatically validates all dependencies
# Fails build on fatal security threats
```

### Development Workflow

```bash
# Add new dependency with security validation
bun add express
# Scanner checks express and all its dependencies
# Warns about any security concerns before installation
```

## 🌐 Threat Intelligence

### Sources

- **Fire22 Threat Feed**: Enterprise security intelligence
- **CVE Database**: MITRE CVE database integration
- **Community Reports**: Crowdsourced threat detection
- **Behavioral Analysis**: Package pattern analysis

### Update Frequency

- **Threat Feed**: Hourly updates with immediate critical alerts
- **CVE Database**: Daily updates with severity prioritization
- **Policy Updates**: Real-time Fire22 workspace policy changes

## 🔒 Security Guarantees

### Data Privacy

- **No Package Content Scanning**: Only metadata analysis
- **Local Processing**: All analysis performed locally
- **Minimal Network**: Only threat feed updates require network
- **Zero Logging**: No package information stored or transmitted

### Reliability

- **Graceful Degradation**: Continues operation if threat feed unavailable
- **Error Recovery**: Robust error handling with detailed diagnostics
- **Performance Monitoring**: Built-in performance tracking
- **Fail-Safe Operation**: Conservative approach to unknown threats

## 📝 License

MIT © Fire22 Development Team

## 🤝 Contributing

```bash
# Development setup
git clone https://github.com/brendadeeznuts1111/fire22-dashboard-worker
cd packages/security-scanner
bun install
bun run test

# Test against local packages
bun link
cd ../test-project
bun link @fire22/security-scanner
```

---

**🔥 Built for Fire22 workspace with ⚡ Bun native performance**

For support: security@fire22.com

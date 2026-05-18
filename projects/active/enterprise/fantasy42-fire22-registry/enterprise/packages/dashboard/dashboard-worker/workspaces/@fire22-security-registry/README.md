# @fire22/security-registry

Enterprise-grade security registry with comprehensive package scanning and
seamless bunx integration for the Fire22 ecosystem.

## Features

- **🔍 Advanced Security Scanning**: Comprehensive vulnerability detection for
  packages and source code
- **🛡️ Registry Security**: Secure package publishing with automated security
  validation
- **⚡ Bunx Integration**: Seamless integration with bun's package execution
  system
- **🔧 CLI Tools**: Powerful command-line interface for security operations
- **📊 Security Scoring**: Risk assessment and security scoring for all packages
- **🚨 Real-time Monitoring**: Continuous monitoring of global packages
- **🎯 Enterprise Ready**: Built for production environments with strict
  security requirements

## Installation

```bash
# From Fire22 private registry
bun add -g @fire22/security-registry

# Or with npm
npm install -g @fire22/security-registry
```

## Quick Start

```bash
# Scan current project for vulnerabilities
fire22-security scan

# Audit dependencies
fire22-security audit --fix

# Setup bunx integration
fire22-security bunx:setup

# Scan global bunx packages
fire22-security bunx:scan
```

## CLI Commands

### Security Scanning

```bash
# Scan project for vulnerabilities
fire22-security scan [options]
  --strict          Enable strict scanning mode
  --path <path>     Project path (default: .)
  --report <format> Report format: json|text|html

# Audit dependencies for known vulnerabilities
fire22-security audit [options]
  --fix             Automatically fix vulnerabilities
  --level <level>   Audit level: low|medium|high|critical
```

### Registry Management

```bash
# Publish package with security scanning
fire22-security publish [options]
  --registry <url>  Registry URL
  --scan            Scan package before publishing (default: true)

# Install package with security validation
fire22-security install <package> [options]
  --registry <url>  Registry URL
  --validate        Validate package security (default: true)
```

### Bunx Integration

```bash
# Setup bunx integration with Fire22 security
fire22-security bunx:setup [options]
  --global          Setup global bunx integration

# Scan bunx global packages
fire22-security bunx:scan

# Update global packages
bunx @fire22/security-registry update-globals
```

## Programmatic Usage

### Security Scanning

```typescript
import { SecurityScanner } from '@fire22/security-registry/scanner';

const scanner = new SecurityScanner({
  strict: true,
  auditLevel: 'high',
});

// Scan current project
const report = await scanner.scan();
console.log(`Security score: ${report.score}/100`);

// Audit dependencies
const auditResult = await scanner.audit({ autoFix: true });
console.log(`Fixed ${auditResult.fixed} vulnerabilities`);
```

### Registry Integration

```typescript
import { Fire22Registry } from '@fire22/security-registry/registry';

const registry = new Fire22Registry({
  url: 'https://fire22.workers.dev/registry/',
  security: {
    scanning: true,
    audit: true,
    strict: false,
  },
});

// Publish with security scanning
const result = await registry.publish();
console.log(`Published with security score: ${result.securityScore}/100`);

// Install with validation
const installResult = await registry.install('@fire22/api-consolidated');
if (installResult.securityWarnings.length > 0) {
  console.warn('Security warnings:', installResult.securityWarnings);
}
```

### Bunx Integration

```typescript
import { BunxIntegration } from '@fire22/security-registry/bunx';

const bunx = new BunxIntegration({
  securityChecks: true,
  autoUpdate: false,
});

// Setup bunx with security
await bunx.setup();

// Execute package with validation
await bunx.execute('@fire22/some-tool', ['--help'], { validate: true });

// Scan global packages
const report = await bunx.scanGlobalPackages();
console.log(
  `${report.vulnerablePackages}/${report.totalPackages} packages have vulnerabilities`
);
```

## Security Features

### Vulnerability Detection

- **🔍 Dependency Scanning**: Automated scanning of all dependencies
- **📝 Source Code Analysis**: Static analysis for common security patterns
- **🚨 Real-time Alerts**: Immediate notification of critical vulnerabilities
- **📊 Risk Assessment**: Comprehensive risk scoring and prioritization

### Package Validation

- **✅ Pre-publish Scanning**: All packages scanned before publishing
- **🔐 Cryptographic Verification**: Package integrity verification
- **📋 Security Metadata**: Rich security information for all packages
- **🚫 Blacklist Management**: Automatic blocking of known malicious packages

### Bunx Security Integration

- **🛡️ Execution Validation**: Security validation before package execution
- **🔄 Auto-update Monitoring**: Continuous monitoring of global packages
- **📱 Smart Notifications**: Intelligent alerting for security issues
- **🎯 Zero-config Setup**: Seamless integration with existing workflows

## Configuration

### Global Configuration

```json
{
  "registry": {
    "url": "https://fire22.workers.dev/registry/",
    "security": {
      "scanning": true,
      "audit": true,
      "strict": false
    }
  },
  "scanning": {
    "level": "high",
    "includeDevDependencies": true,
    "timeout": 30000
  },
  "bunx": {
    "enabled": true,
    "securityChecks": true,
    "autoUpdate": false
  }
}
```

### Project Configuration

Create `.fire22security.json` in your project root:

```json
{
  "scanning": {
    "enabled": true,
    "strict": false,
    "exclude": ["test/**", "docs/**"]
  },
  "audit": {
    "level": "medium",
    "autoFix": false
  },
  "registry": {
    "publishConfig": {
      "securityScore": 80
    }
  }
}
```

## Security Policies

### Vulnerability Levels

- **🟢 Low (Score: 80-100)**: Minor issues, no immediate action required
- **🟡 Medium (Score: 50-79)**: Moderate risk, update recommended
- **🟠 High (Score: 20-49)**: Significant risk, update required
- **🔴 Critical (Score: 0-19)**: Severe risk, immediate action required

### Publishing Requirements

- **Security Score**: Minimum score of 50 for publishing (configurable)
- **Vulnerability Scan**: All packages must pass security scanning
- **Code Analysis**: Static analysis for common security patterns
- **Dependency Audit**: All dependencies must be vulnerability-free

### Bunx Security Checks

- **Pre-execution Validation**: Security validation before package execution
- **Global Package Monitoring**: Continuous monitoring of globally installed
  packages
- **Auto-update Notifications**: Alerts for available security updates
- **Strict Mode**: Optional strict mode blocks execution of vulnerable packages

## Performance

- **⚡ Lightning Fast**: Optimized for Bun runtime performance
- **📊 Efficient Scanning**: Smart caching and incremental scanning
- **🔄 Parallel Processing**: Concurrent vulnerability checks
- **💾 Minimal Memory**: Optimized memory usage for large projects

## Enterprise Features

- **🏢 Team Management**: Multi-user security policies
- **📈 Analytics Dashboard**: Security metrics and trending
- **🔗 CI/CD Integration**: Seamless integration with build pipelines
- **📋 Compliance Reporting**: Automated compliance and audit reports

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

If you discover a security vulnerability, please email security@fire22.dev
instead of using the issue tracker.

## License

MIT - Fire22 Security Team

## Support

- 📚 Documentation: [Fire22 Security Docs](https://docs.fire22.dev/security)
- 🐛 Issues:
  [GitHub Issues](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues)
- 💬 Community: [Fire22 Discord](https://discord.gg/fire22)
- 📧 Email: [security@fire22.dev](mailto:security@fire22.dev)

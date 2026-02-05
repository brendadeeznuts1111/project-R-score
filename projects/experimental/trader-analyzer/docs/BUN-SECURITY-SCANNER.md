# Bun Security Scanner Integration

**Custom security scanner for NEXUS Platform implementing Bun's Security Scanner API**

---

## Overview

The NEXUS Security Scanner (`src/security/bun-scanner.ts`) integrates with Bun 1.3's Security Scanner API to scan packages during installation operations (`bun install`, `bun add`, etc.). It provides comprehensive threat detection including:

- ✅ **CVE Detection** - Scans for known vulnerabilities using CVSS scoring
- ✅ **Malicious Package Detection** - Identifies malware, backdoors, token stealers
- ✅ **License Compliance** - Checks for blocked licenses (GPL, AGPL, etc.)
- ✅ **Custom Threat Intelligence** - Integrates with external security APIs
- ✅ **Caching** - Efficient caching to minimize API calls

---

## How It Works

When packages are installed via Bun, the security scanner:

1. **Receives** package information (name, version) from Bun
2. **Collects** dependencies from all workspace packages (fixed in latest Bun)
3. **Queries** threat intelligence sources (NVD, Socket.dev, custom APIs)
4. **Validates** responses and categorizes threats by severity
5. **Returns** advisories to control installation (empty array if safe)

**Note**: Bun now properly collects dependencies from workspace packages, ensuring comprehensive scanning of the full dependency tree. See [BUN-DEV-SERVER-AND-INSTALL-FIXES.md](./BUN-DEV-SERVER-AND-INSTALL-FIXES.md) for details.

### Advisory Levels

- **Fatal** (`level: 'fatal'`): Installation stops immediately
  - Examples: malware, token stealers, backdoors, critical CVEs (CVSS ≥ 9.0)
- **Warning** (`level: 'warn'`): User prompted for confirmation
  - In TTY: User can choose to continue or cancel
  - Non-TTY: Installation automatically cancelled
  - Examples: high-severity CVEs (CVSS ≥ 7.0), deprecated packages

All advisories are always displayed to the user regardless of level.

---

## Configuration

### Basic Setup

Add to `bunfig.toml`:

```toml
[install.security]
scanner = "./src/security/bun-scanner.ts"
```

### Enterprise Configuration

The scanner supports authentication through two methods:

#### 1. Bun.secrets (Bun 1.3+) - Recommended

Bun.secrets provides OS-native encrypted credential storage:
- **macOS**: Keychain
- **Linux**: libsecret  
- **Windows**: Credential Manager

Secrets are encrypted at rest and separate from environment variables.

**Setup:**
```bash
# Use the setup script
bun run scripts/setup-security-scanner.ts

# Or programmatically
import { secrets } from "bun";
await secrets.set(
  {
    service: "nexus-security-scanner",
    name: "threat-intel-api-key",
  },
  "your-api-key"
);
```

**Benefits:**
- ✅ Encrypted at rest
- ✅ OS-native security
- ✅ Separate from environment variables
- ✅ No risk of accidental exposure in logs

#### 2. Environment Variables - Fallback

For CI/CD environments or older Bun versions, use environment variables. Set these in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) or CI/CD environment:

```bash
# Threat Intelligence API Configuration
export NEXUS_THREAT_INTEL_API="https://api.example.com/threat-intel"
export NEXUS_THREAT_INTEL_API_KEY="your-api-key"

# Optional: Override default CVSS thresholds
export NEXUS_FATAL_CVSS_THRESHOLD="9.0"
export NEXUS_WARN_CVSS_THRESHOLD="7.0"

# Optional: Enable additional features
export NEXUS_ENABLE_INTEGRITY_CHECK="true"
export NEXUS_LOCAL_THREAT_DATABASE="data/threat-database.json"

# The scanner will now use these credentials automatically
bun install
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXUS_THREAT_INTEL_API` | Threat intelligence API endpoint | (empty) |
| `NEXUS_THREAT_INTEL_API_KEY` | API key for threat intelligence service | (empty) |
| `NEXUS_FATAL_CVSS_THRESHOLD` | Minimum CVSS score for fatal advisories | `9.0` |
| `NEXUS_WARN_CVSS_THRESHOLD` | Minimum CVSS score for warning advisories | `7.0` |
| `NEXUS_ENABLE_INTEGRITY_CHECK` | Enable package integrity verification | `false` |
| `NEXUS_LOCAL_THREAT_DATABASE` | Path to local threat database file | `data/threat-database.json` |

**CI/CD Configuration:**

For CI/CD environments, set environment variables in your pipeline configuration:

```yaml
# GitHub Actions example
env:
  NEXUS_THREAT_INTEL_API: ${{ secrets.NEXUS_THREAT_INTEL_API }}
  NEXUS_THREAT_INTEL_API_KEY: ${{ secrets.NEXUS_THREAT_INTEL_API_KEY }}
```

```bash
# GitLab CI example
variables:
  NEXUS_THREAT_INTEL_API: "${NEXUS_THREAT_INTEL_API}"
  NEXUS_THREAT_INTEL_API_KEY: "${NEXUS_THREAT_INTEL_API_KEY}"
```

### Custom Configuration (Programmatic)

For advanced use cases, you can create a custom scanner instance:

```typescript
import { NexusSecurityScanner } from "../src/security/bun-scanner";

const scanner = new NexusSecurityScanner({
  enableCVE: true,
  enableMalwareDetection: true,
  enableLicenseCheck: false,
  enableIntegrityCheck: true,  // Use Bun.CryptoHasher for integrity verification
  localThreatDatabase: "data/threat-database.json",  // Use Bun.file for local threats
  fatalCVSSThreshold: 9.0,  // CVSS ≥ 9.0 = fatal
  warnCVSSThreshold: 7.0,   // CVSS ≥ 7.0 = warn
  threatIntelApi: "https://api.example.com/threat-intel",
  threatIntelApiKey: process.env.NEXUS_THREAT_INTEL_API_KEY,
});

export default scanner;
```

**Note:** For most use cases, environment variables are preferred as they work automatically without code changes.

---

## Integration with NEXUS Security Infrastructure

The scanner integrates with existing NEXUS security tools:

### RuntimeSecurityMonitor

```typescript
import { RuntimeSecurityMonitor } from "./security/runtime-monitor";

// Scanner can log detected threats to runtime monitor
const monitor = new RuntimeSecurityMonitor();
```

### Compliance Logger

```typescript
import { ComplianceLogger } from "./security/compliance-logger";

// Log security advisories for compliance
const logger = new ComplianceLogger();
```

---

## API Reference

### `NexusSecurityScanner`

Main scanner class implementing Bun's `SecurityScanner` interface.

#### Constructor

```typescript
new NexusSecurityScanner(config?: NexusScannerConfig)
```

#### Methods

##### `scan(packageInfo: PackageInfo): Promise<SecurityAdvisory[]>`

Scans a package for security issues. Called automatically by Bun during installation.

**Parameters:**
- `packageInfo.name` - Package name
- `packageInfo.version` - Package version

**Returns:** Array of security advisories (empty if safe)

**Example:**
```typescript
const advisories = await scanner.scan({
  name: "example-package",
  version: "1.0.0"
});

if (advisories.length > 0) {
  console.warn("Security issues detected:", advisories);
}
```

---

## Threat Detection

### CVE Detection

Uses `Bun.semver.satisfies()` to check if package versions match vulnerability ranges:

```typescript
// Essential for checking vulnerability ranges - no external dependencies needed
if (Bun.semver.satisfies(version, ">=1.0.0 <1.2.5")) {
  // Version is vulnerable
}
```

**Benefits:**
- Built into Bun - no external semver library needed
- Fast and efficient
- Supports all semver range operators (`>=`, `<=`, `~`, `^`, etc.)

### Package Integrity Verification

Uses `Bun.CryptoHasher` for cryptographic hashing to verify package integrity:

```typescript
// Fetch package tarball from npm registry
const tarball = await fetch(`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`);
const buffer = await tarball.arrayBuffer();

// Compute SHA-256 hash using Bun.CryptoHasher
// Note: Bun.hash() returns a 32-bit integer (fast, non-cryptographic)
// For package integrity, use Bun.CryptoHasher for cryptographic hashes
const hasher = new Bun.CryptoHasher("sha256");
hasher.update(buffer);
const computedHash = hasher.digest("hex");

// Compare against known good hash
if (computedHash !== expectedHash) {
  // Package integrity check failed
}
```

**Benefits:**
- Fast native cryptographic hashing
- Supports multiple algorithms (sha256, sha512, sha1, md5, etc.)
- No external crypto libraries needed
- Cryptographic-grade security for package verification

**Note:** 
- `Bun.hash()` returns a fast 32-bit integer hash (useful for caching, quick checks, non-cryptographic)
- `Bun.CryptoHasher` provides cryptographic hashes (sha256, sha512, sha1, md5) - use for package integrity verification

**Example:**
```typescript
// Fast hash (32-bit integer) - good for caching
const quickHash = Bun.hash("test"); // Returns: 10062657028113479704n

// Cryptographic hash (hex string) - good for security
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("test");
const secureHash = hasher.digest("hex"); // Returns: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
```

### Local Threat Database

Uses `Bun.file` for efficient file I/O to read local threat databases:

```typescript
// Load threat database from local file
const file = Bun.file("data/threat-database.json");
if (await file.exists()) {
  const threats = await file.json();
  // Use threats for offline detection
}
```

**Benefits:**
- Efficient file I/O
- Offline threat detection
- No network calls needed

**CVSS Scoring:**
- **Fatal**: CVSS ≥ 9.0 (Critical)
- **Warning**: CVSS ≥ 7.0 (High)
- **Info**: CVSS < 7.0 (Medium/Low) - Not reported

### Malicious Package Detection

Checks against:
1. **Local Database** - Known malicious packages list
2. **Socket.dev API** - Real-time threat intelligence
3. **Custom Threat Intel** - Your own security feeds

### License Compliance

Checks for blocked licenses:
- GPL-3.0
- AGPL-3.0
- LGPL-3.0

---

## Error Handling

If the `scan` function throws an error, Bun will gracefully handle it, but the installation process **will be cancelled** as a defensive precaution.

The scanner implements fail-safe error handling:

```typescript
try {
  // Scan package
} catch (error) {
  // Return fatal advisory to block installation
  return [{
    level: "fatal",
    package: name,
    description: "Unable to verify security. Installation blocked.",
    url: `https://www.npmjs.com/package/${name}`
  }];
}
```

## Validation

When fetching threat feeds over the network, use schema validation (e.g., Zod) to ensure data integrity. Invalid responses should fail immediately rather than silently returning empty advisories.

**Example with Zod:**

```typescript
import { z } from 'zod';

const ThreatFeedItemSchema = z.object({
  package: z.string(),
  range: z.string(),
  url: z.string().nullable(),
  description: z.string().nullable(),
  categories: z.array(z.enum(['backdoor', 'botnet', 'malware', 'protestware', 'adware'])),
});

// Validate response
const validatedData = ThreatFeedItemSchema.parse(data);
```

---

## Caching

The scanner implements efficient caching to minimize API calls:

- **CVE Cache**: Caches CVE results per package version
- **Malware Cache**: Caches malware detection results

Cache keys: `${packageName}@${packageVersion}`

---

## Testing

Test the scanner with known malicious packages:

```typescript
import { NexusSecurityScanner } from "../src/security/bun-scanner";

const scanner = new NexusSecurityScanner();

// Test with known malicious package
const advisories = await scanner.scan({
  name: "malicious-package",
  version: "1.0.0"
});

console.assert(advisories.length > 0, "Should detect malicious package");
console.assert(advisories[0].level === "fatal", "Should be fatal level");
```

---

## Publishing as npm Package

To publish the scanner as an npm package:

1. **Create package.json:**
```json
{
  "name": "@nexus/bun-security-scanner",
  "version": "1.0.0",
  "main": "./src/security/bun-scanner.ts",
  "type": "module"
}
```

2. **Publish:**
```bash
bun publish
```

3. **Users install:**
```bash
bun add -d @nexus/bun-security-scanner
```

4. **Configure in bunfig.toml:**
```toml
[install.security]
scanner = "@nexus/bun-security-scanner"
```

---

## Integration Examples

### With Socket.dev

```typescript
const scanner = new NexusSecurityScanner({
  threatIntelApi: "https://api.socket.dev/v1",
  threatIntelApiKey: process.env.SOCKET_API_KEY,
});
```

### With Custom Threat Intel

```typescript
const scanner = new NexusSecurityScanner({
  threatIntelApi: "https://your-threat-intel-api.com",
  threatIntelApiKey: process.env.THREAT_INTEL_API_KEY,
});
```

### With NVD API

```typescript
// TODO: Integrate with NVD API
// https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={package}
```

---

## Useful Bun APIs

The scanner leverages several Bun built-in APIs:

### Bun.semver.satisfies()

Essential for checking if package versions match vulnerability ranges. No external dependencies needed.

```typescript
// Check if version is in vulnerable range
if (Bun.semver.satisfies(version, ">=1.0.0 <1.2.5")) {
  // Version is vulnerable
}
```

**Documentation:** [Bun.semver API](https://bun.com/docs/api/semver)

### Bun.hash

Fast hashing for package integrity checks.

```typescript
// Compute hash of package tarball
const hash = Bun.hash(buffer, "sha256");
```

**Documentation:** [Bun.hash API](https://bun.com/docs/api/hashing#bun-hash)

### Bun.file

Efficient file I/O for reading local threat databases.

```typescript
// Load threat database from local file
const file = Bun.file("data/threat-database.json");
const threats = await file.json();
```

**Documentation:** [Bun.file API](https://bun.com/docs/api/file-io)

## Bun 1.3 Security Enhancements

### Bun.secrets for Encrypted Credential Storage

The scanner leverages Bun.secrets (Bun 1.3+) for secure credential storage:

```typescript
import { secrets } from "bun";

// Store API key securely (two parameters: options, value)
await secrets.set(
  {
    service: "nexus-security-scanner",
    name: "threat-intel-api-key",
  },
  "your-api-key"
);

// Retrieve API key
const apiKey = await secrets.get({
  service: "nexus-security-scanner",
  name: "threat-intel-api-key",
});
```

**Storage Locations:**
- macOS: Keychain
- Linux: libsecret
- Windows: Credential Manager

**Benefits:**
- Encrypted at rest
- OS-native security
- Separate from environment variables
- No risk of accidental exposure

### Setup Script

Use the provided setup script to configure credentials:

```bash
# Interactive mode
bun run scripts/setup-security-scanner.ts

# Command-line mode
bun run scripts/setup-security-scanner.ts --api-key "your-api-key"
bun run scripts/setup-security-scanner.ts --api-url "https://api.example.com/threat-intel"
bun run scripts/setup-security-scanner.ts --get
bun run scripts/setup-security-scanner.ts --delete
```

## Related Documentation

- [Bun Security Scanner API](https://bun.com/docs/install/security-scanner-api)
- [Bun.secrets API](https://bun.com/docs/runtime/bun-apis)
- [Bun.semver API](https://bun.com/docs/api/semver)
- [Bun.CryptoHasher API](https://bun.com/docs/api/hashing#bun-cryptohasher)
- [Bun.file API](https://bun.com/docs/api/file-io)
- [Security Scanner Template](https://github.com/oven-sh/security-scanner-template)
- [Enterprise Scanner Configuration](./ENTERPRISE-SCANNER-CONFIG.md)
- [NEXUS Security Architecture](./SECURITY-ARCHITECTURE.md)
- [Runtime Security Monitor](../src/security/runtime-monitor.ts)

---

## Bun 1.3 Security Enhancements

The scanner leverages Bun 1.3 security features:

- **Bun.secrets** - OS-native encrypted credential storage (macOS Keychain, Linux libsecret, Windows Credential Manager)
- **Bun.CryptoHasher** - Fast cryptographic hashing for package integrity verification
- **Bun.semver** - Built-in semver parsing for vulnerability range checking

See [Bun 1.3 Security Enhancements](./BUN-1.3-SECURITY-ENHANCEMENTS.md) for complete documentation.

## Status

✅ **Complete** - Scanner implemented and ready for use.

**Last Updated:** 2024-12-06

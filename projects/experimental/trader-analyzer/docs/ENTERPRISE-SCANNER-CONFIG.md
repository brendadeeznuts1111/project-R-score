# Enterprise Security Scanner Configuration

**Guide for configuring NEXUS Security Scanner in enterprise environments**

---

## Overview

The NEXUS Security Scanner supports enterprise-grade configuration through environment variables, allowing seamless integration with CI/CD pipelines, containerized environments, and team workflows without code changes.

---

## Quick Start

### Method 1: Bun.secrets (Bun 1.3+) - Recommended

**Most Secure:** Uses OS-native encrypted credential storage.

```bash
# Use the setup script (interactive)
bun run scripts/setup-security-scanner.ts

# Or command-line
bun run scripts/setup-security-scanner.ts --api-key "your-api-key"
bun run scripts/setup-security-scanner.ts --api-url "https://api.example.com/threat-intel"
```

**Benefits:**
- ✅ Encrypted at rest (macOS Keychain, Linux libsecret, Windows Credential Manager)
- ✅ Separate from environment variables
- ✅ No risk of accidental exposure in logs
- ✅ OS-native security

### Method 2: Environment Variables - Fallback

For CI/CD environments or older Bun versions:

```bash
# Set in shell profile (~/.bashrc, ~/.zshrc, etc.)
export NEXUS_THREAT_INTEL_API="https://api.example.com/threat-intel"
export NEXUS_THREAT_INTEL_API_KEY="your-api-key"

# Optional: Customize thresholds
export NEXUS_FATAL_CVSS_THRESHOLD="9.0"
export NEXUS_WARN_CVSS_THRESHOLD="7.0"
```

### 2. Configure Scanner in bunfig.toml

```toml
[install.security]
scanner = "./src/security/bun-scanner.ts"
```

### 3. Install Packages

The scanner will automatically use your credentials:

```bash
bun install
```

---

## Credential Storage Methods

### Bun.secrets (Bun 1.3+) - Recommended

**Storage Locations:**
- macOS: Keychain (`~/Library/Keychains/`)
- Linux: libsecret (GNOME Keyring)
- Windows: Credential Manager

**Setup:**
```bash
bun run scripts/setup-security-scanner.ts
```

**Programmatic Access:**
```typescript
import { secrets } from "bun";

// Store (two parameters: options, value)
await secrets.set(
  {
    service: "nexus-security-scanner",
    name: "threat-intel-api-key",
  },
  "your-api-key"
);

// Retrieve
const apiKey = await secrets.get({
  service: "nexus-security-scanner",
  name: "threat-intel-api-key"
});
```

### Environment Variables Reference

**Required (for Enterprise Features):**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXUS_THREAT_INTEL_API` | Threat intelligence API endpoint URL | `https://api.socket.dev/v1` |
| `NEXUS_THREAT_INTEL_API_KEY` | API key for authentication | `sk_live_abc123...` |

**Note:** The scanner checks Bun.secrets first, then falls back to environment variables.

### Optional Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NEXUS_FATAL_CVSS_THRESHOLD` | Minimum CVSS score for fatal advisories | `9.0` | `9.5` |
| `NEXUS_WARN_CVSS_THRESHOLD` | Minimum CVSS score for warning advisories | `7.0` | `8.0` |
| `NEXUS_ENABLE_INTEGRITY_CHECK` | Enable package integrity verification | `false` | `true` |
| `NEXUS_LOCAL_THREAT_DATABASE` | Path to local threat database file | `data/threat-database.json` | `/etc/nexus/threats.json` |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Install Dependencies

on: [push, pull_request]

jobs:
  install:
    runs-on: ubuntu-latest
    env:
      NEXUS_THREAT_INTEL_API: ${{ secrets.NEXUS_THREAT_INTEL_API }}
      NEXUS_THREAT_INTEL_API_KEY: ${{ secrets.NEXUS_THREAT_INTEL_API_KEY }}
      NEXUS_FATAL_CVSS_THRESHOLD: "9.0"
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
```

### GitLab CI

```yaml
variables:
  NEXUS_THREAT_INTEL_API: "${NEXUS_THREAT_INTEL_API}"
  NEXUS_THREAT_INTEL_API_KEY: "${NEXUS_THREAT_INTEL_API_KEY}"

install:
  image: oven/bun:latest
  script:
    - bun install
```

### Docker

```dockerfile
FROM oven/bun:latest

# Set environment variables
ENV NEXUS_THREAT_INTEL_API=https://api.example.com/threat-intel
ENV NEXUS_THREAT_INTEL_API_KEY=your-api-key

WORKDIR /app
COPY . .
RUN bun install
```

### Docker Compose

```yaml
services:
  app:
    build: .
    environment:
      - NEXUS_THREAT_INTEL_API=https://api.example.com/threat-intel
      - NEXUS_THREAT_INTEL_API_KEY=${NEXUS_THREAT_INTEL_API_KEY}
    volumes:
      - .:/app
```

---

## Team Configuration

### Shared Configuration File

Create `.env.example` for your team:

```bash
# .env.example
NEXUS_THREAT_INTEL_API=https://api.example.com/threat-intel
NEXUS_THREAT_INTEL_API_KEY=your-api-key-here
NEXUS_FATAL_CVSS_THRESHOLD=9.0
NEXUS_WARN_CVSS_THRESHOLD=7.0
```

### Loading from .env File

```bash
# Load environment variables from .env file
export $(cat .env | xargs)
bun install
```

Or use a tool like `dotenv`:

```bash
# Install dotenv-cli
bun add -d dotenv-cli

# Run with .env file
bunx dotenv bun install
```

---

## Security Best Practices

### 1. Never Commit API Keys

Add to `.gitignore`:

```text
.env
.env.local
.env.*.local
```

### 2. Use Secret Management

**GitHub Secrets:**
- Go to Settings → Secrets and variables → Actions
- Add `NEXUS_THREAT_INTEL_API_KEY` as a secret
- Reference in workflows: `${{ secrets.NEXUS_THREAT_INTEL_API_KEY }}`

**AWS Secrets Manager:**
```bash
export NEXUS_THREAT_INTEL_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id nexus/threat-intel-api-key \
  --query SecretString --output text)
```

**HashiCorp Vault:**
```bash
export NEXUS_THREAT_INTEL_API_KEY=$(vault kv get -field=api_key secret/nexus/threat-intel)
```

### 3. Rotate API Keys Regularly

Set up key rotation schedule:
- Production: Every 90 days
- Staging: Every 180 days
- Development: As needed

---

## Troubleshooting

### Scanner Not Using Environment Variables

1. **Verify variables are set:**
   ```bash
   echo $NEXUS_THREAT_INTEL_API_KEY
   ```

2. **Check bunfig.toml:**
   ```toml
   [install.security]
   scanner = "./src/security/bun-scanner.ts"
   ```

3. **Test scanner directly:**
   ```bash
   bun run src/security/bun-scanner.ts
   ```

### API Authentication Failures

1. **Verify API key format:**
   - Check for extra spaces or newlines
   - Ensure key is not expired

2. **Test API endpoint:**
   ```bash
   curl -H "Authorization: Bearer $NEXUS_THREAT_INTEL_API_KEY" \
     "$NEXUS_THREAT_INTEL_API/health"
   ```

3. **Check network connectivity:**
   ```bash
   curl -I "$NEXUS_THREAT_INTEL_API"
   ```

### Scanner Blocking All Installations

If scanner is blocking all packages:

1. **Check error logs:**
   ```bash
   bun install --verbose
   ```

2. **Temporarily disable scanner:**
   ```toml
   # Comment out in bunfig.toml
   # [install.security]
   # scanner = "./src/security/bun-scanner.ts"
   ```

3. **Review scanner code** for configuration issues

---

## Advanced Configuration

### Multiple Threat Intelligence Sources

```bash
# Primary source
export NEXUS_THREAT_INTEL_API="https://api.primary.com/threat-intel"
export NEXUS_THREAT_INTEL_API_KEY="primary-key"

# Secondary source (if supported by scanner)
export NEXUS_THREAT_INTEL_API_SECONDARY="https://api.secondary.com/threat-intel"
export NEXUS_THREAT_INTEL_API_KEY_SECONDARY="secondary-key"
```

### Custom CVSS Thresholds per Environment

```bash
# Development - More lenient
export NEXUS_FATAL_CVSS_THRESHOLD="10.0"
export NEXUS_WARN_CVSS_THRESHOLD="8.0"

# Production - Stricter
export NEXUS_FATAL_CVSS_THRESHOLD="8.0"
export NEXUS_WARN_CVSS_THRESHOLD="6.0"
```

### Local Threat Database

```bash
# Use local threat database for offline scanning
export NEXUS_LOCAL_THREAT_DATABASE="/etc/nexus/threats.json"
export NEXUS_ENABLE_INTEGRITY_CHECK="true"
```

---

## Related Documentation

- [Bun Security Scanner API](https://bun.com/docs/install/security-scanner-api)
- [NEXUS Security Scanner](./BUN-SECURITY-SCANNER.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)

---

## Support

For scanner configuration issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review scanner logs: `bun install --verbose`
3. Consult [Bun Security Scanner Documentation](https://bun.com/docs/install/security-scanner-api)

For enterprise support, contact your security team or scanner provider.

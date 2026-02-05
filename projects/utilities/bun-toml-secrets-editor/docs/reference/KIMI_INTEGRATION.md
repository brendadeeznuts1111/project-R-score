# 🤖 Kimi CLI Integration

AI-assisted development tools for the Bun-native codebase, seamlessly integrating with TOML secrets management and DuoPlus CLI.

## Overview

The Kimi CLI provides specialized commands for:
- **Security scanning** of TOML secrets files
- **Connection analysis** with Bun-native performance metrics
- **Optimization recommendations** for TOML processing
- **Project scaffolding** with Bun-native templates

## Installation

No installation needed - Kimi CLI is included in the project:

```bash
# Via npm script
bun run kimi:help

# Direct
bun run src/cli/kimi-cli.ts help
```

## Commands

### 🔐 Security Scan

Analyze TOML secrets files for security vulnerabilities:

```bash
# Scan single file
bun run kimi security config/secrets.toml

# Scan multiple files
bun run kimi security config/*.toml

# JSON output for CI/CD
bun run kimi security config/*.toml --json

# With auto-fix suggestions
bun run kimi security config/secrets.toml --fix
```

**Detects:**
- Secrets in HTTP URLs (critical)
- Weak password entropy
- Hardcoded credentials
- Missing encryption markers
- Risk scoring (0-100)

**Example Output:**
```
🔐 Security Analysis Results

File              Status  Risk  Errors  Warnings
─────────────────────────────────────────────────
secrets.toml      ✓ PASS  25    0       1
api.toml          ✗ FAIL  85    2       3

📄 api.toml:
  Errors:
    • Critical: Secret in HTTP URL at pattern "api_endpoint"
    • Weak password entropy (36 bits) for "db_password"
  💡 Recommendations:
    • Change http:// to https:// for pattern api_endpoint
    • Increase complexity for "db_password"
```

### 🔌 Connection Analysis

Test and analyze Bun-native connection performance:

```bash
bun run kimi connections
```

**Analyzes:**
- HTTP/2 support
- Keepalive connection pooling
- Compression (gzip/brotli)
- Retry mechanisms
- Latency metrics

**Example Output:**
```
🔌 Bun-Native Connection Analysis

Testing HTTP connections...
  ✅ HTTP GET: 145.23ms

📊 Connection Metrics:
   Total requests: 1
   Failed requests: 0
   Retry count: 0
   Average latency: 145.23ms

🔧 Bun-Native Features:
   HTTP/2: ✓
   Keepalive: ✓ (automatic)
   Compression: ✓ (gzip/brotli)
   Connection pooling: ✓ (max 10)
```

### ⚡ Optimization Analysis

Get performance optimization recommendations:

```bash
# General optimization tips
bun run kimi optimize

# File-specific analysis
bun run kimi optimize config/*.toml
```

**Recommends:**
- CRC32-based deduplication (66% memory reduction)
- SIMD-accelerated scanning (1.3M secrets/sec)
- Fast TOML parsing with cache (24x speedup)
- Compression for large files

### 🚀 Project Creation

Create new projects with Bun-native templates:

```bash
# CLI tool
bun run kimi create cli my-awesome-cli

# API server
bun run kimi create api my-api

# WebSocket server
bun run kimi create websocket my-ws-server

# Library
bun run kimi create lib my-library
```

## Integration with Existing Tools

### DuoPlus CLI

```bash
# Use Kimi security before DuoPlus deployment
bun run kimi security config/duoplus.toml
bun run duoplus:native --login $API_KEY
bun run duoplus:native --list
```

### TOML Secrets Editor

```bash
# Full validation pipeline
bun run kimi security config/secrets.toml
bun run src/main.ts validate config/secrets.toml
bun run src/main.ts sync --service my-app config/secrets.toml
```

### Project Scaffolding

```bash
# Create project with Kimi, then use bun-init
bun run kimi create api my-project
cd my-project
bun run dev
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Security scan
        run: bun run kimi security config/*.toml --json > security-report.json
        
      - name: Check for high-risk issues
        run: |
          HIGH_RISK=$(jq '[.[] | select(.riskScore > 75)] | length' security-report.json)
          if [ "$HIGH_RISK" -gt 0 ]; then
            echo "❌ Found $HIGH_RISK high-risk security issues"
            exit 1
          fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔐 Running security scan..."
bun run kimi security config/*.toml

if [ $? -ne 0 ]; then
  echo "❌ Security scan failed. Fix issues before committing."
  exit 1
fi
```

## Architecture

### Bun-Native API Usage

| Feature | API | Performance |
|---------|-----|-------------|
| TOML Parsing | `Bun.TOML.parse()` | Native, 24x faster with cache |
| HTTP Requests | `Bun.fetch()` | HTTP/2, keepalive, pooling |
| Hashing | `Bun.hash.crc32()` | 10M hashes/sec |
| File I/O | `Bun.file()`, `Bun.write()` | Zero-copy where possible |
| Passwords | `Bun.password.hash()` | Argon2 native |
| Delays | `Bun.sleep()` | Nanosecond precision |

### File Structure

```
src/cli/
├── kimi-cli.ts              # Main Kimi CLI entry
├── duoplus-cli-native.ts    # DuoPlus with Bun connections
├── bun-init-cli.ts          # Project scaffolding
└── ...

.kimi/skills/
└── bun-native-dev/
    └── SKILL.md             # Kimi skill for this codebase
```

## Quick Reference

```bash
# Full workflow example

# 1. Security scan
bun run kimi security config/secrets.toml

# 2. Test connections
bun run kimi connections

# 3. Create new service
bun run kimi create api my-microservice
cd my-microservice

# 4. Validate TOML
bun run kimi optimize src/config.toml

# 5. Deploy (after security check passes)
bun run duoplus:native --status
```

## Troubleshooting

### Common Issues

**Issue:** `Cannot find module '../services/toml-secrets-editor'`
**Fix:** Run `bun install` to ensure all dependencies are installed.

**Issue:** Security scan shows false positives
**Fix:** Use `--verbose` flag to see detailed analysis or adjust rules in `src/services/security-validator.ts`.

**Issue:** Connection tests timeout
**Fix:** Check network connectivity and firewall settings. Use `--timeout` flag if needed.

## Contributing

To extend Kimi CLI with new commands:

1. Add command to `src/cli/kimi-cli.ts`
2. Register in `registerCommands()`
3. Implement handler method
4. Update this documentation

## License

MIT - See LICENSE file

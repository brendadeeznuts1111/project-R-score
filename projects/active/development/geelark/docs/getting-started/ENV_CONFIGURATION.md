# Geelark Upload System - Environment Configuration Guide

## Overview

The Geelark upload system can be configured through three layers (in priority order):

1. **CLI Flags** (highest priority)
2. **Environment Variables** (medium priority)
3. **bunfig.toml** (lowest priority)

## Quick Start

```bash
# 1. Copy the environment template
cp .env.upload.template .env.upload

# 2. Edit with your values
nano .env.upload

# 3. Start the server
bun run dev-hq/servers/dashboard-server.ts
```

---

## Bun Configuration Environment Variables

### Registry & Authentication

```bash
# Set custom npm registry (for private packages)
export BUN_CONFIG_REGISTRY="https://npm.pkg.github.com"

# Set auth token for registry
export BUN_CONFIG_TOKEN="your-token-here"

# Example: GitHub Packages
export BUN_CONFIG_REGISTRY="https://npm.pkg.github.com/geelark"
export BUN_CONFIG_TOKEN="${GITHUB_TOKEN}"
```

### Lockfile Behavior

```bash
# Save Yarn v1-style lockfile instead of bun.lock
export BUN_CONFIG_YARN_LOCKFILE="true"

# Skip saving lockfile (not recommended)
export BUN_CONFIG_SKIP_SAVE_LOCKFILE="true"

# Skip loading lockfile (for testing)
export BUN_CONFIG_SKIP_LOAD_LOCKFILE="true"

# Skip auto-installing packages
export BUN_CONFIG_SKIP_INSTALL_PACKAGES="true"
```

### Native Binaries

```bash
# Link to platform-specific native binaries
export BUN_CONFIG_LINK_NATIVE_BINS="true"
```

---

## Upload System Environment Variables

### General Settings

```bash
# Environment
export ENVIRONMENT="development"  # development | staging | production | test

# Server
export PORT="3000"
export LOG_LEVEL="debug"          # debug | info | warn | error

# Profiling
export ENABLE_PROFILING="true"
```

### Upload Provider

```bash
# Provider selection
export UPLOAD_PROVIDER="local"    # local | s3 | r2

# AWS S3 (for UPLOAD_PROVIDER=s3)
export S3_ACCESS_KEY_ID="your-access-key"
export S3_SECRET_ACCESS_KEY="your-secret-key"
export S3_BUCKET="your-bucket"
export S3_REGION="us-east-1"
export S3_ENDPOINT="https://s3.amazonaws.com"

# Cloudflare R2 (for UPLOAD_PROVIDER=r2)
export R2_ACCESS_KEY_ID="your-r2-key"
export R2_SECRET_ACCESS_KEY="your-r2-secret"
export R2_BUCKET="your-r2-bucket"
export R2_ACCOUNT_ID="your-r2-account-id"
```

### Upload Limits

```bash
# Maximum file sizes (in bytes)
export UPLOAD_MAX_SIMPLE_SIZE="5242880"         # 5MB
export UPLOAD_MAX_MULTIPART_SIZE="5497558138880" # 5TB
export UPLOAD_CHUNK_SIZE="5242880"             # 5MB

# Timeouts (in milliseconds)
export UPLOAD_TIMEOUT="300000"                 # 5 minutes
export UPLOAD_PROGRESS_INTERVAL="500"          # 500ms

# Concurrency
export UPLOAD_MAX_CONCURRENT="10"
```

### Security

```bash
# File validation
export UPLOAD_VALIDATE_FILE_TYPES="true"
export UPLOAD_ALLOWED_FILE_TYPES="text/plain,application/json,image/jpeg,image/png"
export UPLOAD_BLOCKED_EXTENSIONS=".exe,.bat,.sh,.ps1"

# TLS/SSL
export USE_SYSTEM_CA="true"
export USE_OPENSSL_CA="false"
export USE_BUNDLED_CA="false"
```

### CORS

```bash
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
export CORS_ALLOWED_METHODS="GET,POST,OPTIONS"
export CORS_ALLOWED_HEADERS="Content-Type,Authorization"
```

---

## Configuration Examples

### Development Environment

```bash
# .env.development
ENVIRONMENT=development
PORT=3000
LOG_LEVEL=debug
ENABLE_PROFILING=true
UPLOAD_PROVIDER=local
UPLOAD_MAX_FILE_SIZE=536870912  # 50MB for testing
```

### Production Environment (S3)

```bash
# .env.production
ENVIRONMENT=production
PORT=3000
LOG_LEVEL=info
ENABLE_PROFILING=false
UPLOAD_PROVIDER=s3
S3_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=geelark-uploads-prod
S3_REGION=us-east-1
UPLOAD_MAX_FILE_SIZE=5497558138880  # 5TB
USE_SYSTEM_CA=true
```

### Production Environment (R2)

```bash
# .env.production
ENVIRONMENT=production
PORT=3000
LOG_LEVEL=info
ENABLE_PROFILING=false
UPLOAD_PROVIDER=r2
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
R2_BUCKET=geelark-uploads-prod
R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
S3_ENDPOINT=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com
```

### Staging Environment

```bash
# .env.staging
ENVIRONMENT=staging
PORT=3001
LOG_LEVEL=debug
ENABLE_PROFILING=true
UPLOAD_PROVIDER=s3
S3_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=geelark-uploads-staging
S3_REGION=us-east-1
```

### Test Environment

```bash
# .env.test
ENVIRONMENT=test
PORT=3456
LOG_LEVEL=warn
ENABLE_PROFILING=false
UPLOAD_PROVIDER=local
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB
```

---

## Priority Examples

### CLI Flag Override (Highest Priority)

```bash
# bunfig.toml has port=3000
# .env.upload has PORT=3001
# CLI flag overrides both
bun run dashboard-server.ts --port 4000
# Result: Server starts on port 4000
```

### Environment Variable Override (Medium Priority)

```bash
# bunfig.toml has port=3000
# .env.upload has PORT=4000
bun run dashboard-server.ts
# Result: Server starts on port 4000
```

### bunfig.toml Default (Lowest Priority)

```bash
# bunfig.toml has port=3000
# No CLI flag or env var
bun run dashboard-server.ts
# Result: Server starts on port 3000
```

---

## Best Practices

### 1. Security - Never Commit Secrets

```bash
# ✅ Good: Use environment variables
export S3_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"

# ❌ Bad: Hardcode secrets
export S3_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
```

### 2. Use .env Files per Environment

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production

# Test
.env.test
```

### 3. Load Environment File

```bash
# Using CLI flag
bun run dashboard-server.ts --env-file .env.production

# Or set globally
export ENV_FILE=".env.production"
```

### 4. Validate Configuration

```bash
# Before starting, validate required env vars are set
if [ -z "$S3_ACCESS_KEY_ID" ]; then
  echo "Error: S3_ACCESS_KEY_ID not set"
  exit 1
fi
```

### 5. Use Secrets Manager

```bash
# Load from AWS Secrets Manager
export S3_ACCESS_KEY_ID=$(aws secretsmanager get-secret-value --secret-id geelark/s3-key --query SecretString --output text | jq -r '.access_key')

# Load from 1Password
export S3_ACCESS_KEY_ID=$(op read "op://Private/Geelark/S3 Access Key")
```

---

## Docker Configuration

### Dockerfile

```dockerfile
# Use Bun base image
FROM oven/bun:1

# Set environment variables
ENV ENVIRONMENT=production
ENV PORT=3000
ENV UPLOAD_PROVIDER=s3

# Copy environment file
COPY .env.production /app/.env

# Run server
CMD ["bun", "run", "dev-hq/servers/dashboard-server.ts"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  dashboard:
    image: geelark/dashboard:latest
    ports:
      - "3000:3000"
    environment:
      - ENVIRONMENT=production
      - UPLOAD_PROVIDER=s3
      - S3_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - S3_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
    env_file:
      - .env.production
```

---

## Troubleshooting

### Issue: Environment Variables Not Loading

```bash
# Check if .env file exists
ls -la .env.upload

# Load manually
source .env.upload

# Verify
echo $UPLOAD_PROVIDER
```

### Issue: Priority Confusion

```bash
# Check what's actually being used
bun run dashboard-server.ts --help
# Review the "Configuration" section in startup banner
```

### Issue: bunfig.toml Not Applied

```bash
# Check bunfig.toml location
bun pmcat | grep config

# Specify config explicitly
bun run dashboard-server.ts --config /path/to/bunfig.toml
```

---

## Complete Environment Variable Reference

### Bun-Specific Variables

| Variable | Type | Description |
|----------|------|-------------|
| `BUN_CONFIG_REGISTRY` | string | npm registry URL |
| `BUN_CONFIG_TOKEN` | string | Auth token |
| `BUN_CONFIG_YARN_LOCKFILE` | boolean | Save Yarn lockfile |
| `BUN_CONFIG_LINK_NATIVE_BINS` | boolean | Link native binaries |
| `BUN_CONFIG_SKIP_SAVE_LOCKFILE` | boolean | Skip saving lockfile |
| `BUN_CONFIG_SKIP_LOAD_LOCKFILE` | boolean | Skip loading lockfile |
| `BUN_CONFIG_SKIP_INSTALL_PACKAGES` | boolean | Skip installing packages |

### Upload System Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENVIRONMENT` | string | development | Environment name |
| `PORT` | number | 3000 | Server port |
| `LOG_LEVEL` | string | info | Log verbosity |
| `ENABLE_PROFILING` | boolean | false | Enable profiling |
| `UPLOAD_PROVIDER` | string | local | Upload provider |
| `S3_ACCESS_KEY_ID` | string | - | AWS access key |
| `S3_SECRET_ACCESS_KEY` | string | - | AWS secret key |
| `S3_BUCKET` | string | uploads | S3 bucket name |
| `S3_REGION` | string | us-east-1 | AWS region |
| `S3_ENDPOINT` | string | - | S3 endpoint URL |
| `UPLOAD_MAX_SIMPLE_SIZE` | number | 5242880 | Max simple upload size |
| `UPLOAD_MAX_MULTIPART_SIZE` | number | 5497558138880 | Max multipart size |
| `UPLOAD_TIMEOUT` | number | 300000 | Upload timeout (ms) |
| `UPLOAD_MAX_CONCURRENT` | number | 10 | Max concurrent uploads |
| `USE_SYSTEM_CA` | boolean | false | Use system CAs |
| `USE_OPENSSL_CA` | boolean | false | Use OpenSSL CAs |

---

## Further Reading

- [Bun CLI Documentation](https://bun.sh/docs/cli)
- [Bun Configuration](https://bun.sh/docs/runtime/bunfig)
- [Environment Variables](https://bun.sh/docs/runtime/env)
- [AWS S3 Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html)
- [Cloudflare R2 Configuration](https://developers.cloudflare.com/r2/api/)

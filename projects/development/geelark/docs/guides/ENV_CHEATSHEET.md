# Environment Variables Quick Reference

## 🚀 Quick Start

```bash
# 1. Copy template
cp .env.upload.template .env.upload

# 2. Edit values
nano .env.upload

# 3. Start server
bun run dev-hq/servers/dashboard-server.ts --env-file .env.upload
```

## ⚡ `bun run -` - Execute from Stdin

Pipe JavaScript/TypeScript directly to Bun without temporary files:

```bash
# Pipe code from echo
echo "console.log('Hello from stdin!')" | bun run -

# Execute heredoc
bun run - << 'EOF'
const data = { message: "Hello!" };
console.log(JSON.stringify(data, null, 2));
EOF

# Run .js file as TypeScript
echo "const msg: string = 'This is TypeScript!'; console.log(msg);" | bun run -

# Redirect file into Bun
bun run - < script.ts

# Multiple statements
echo "
import { feature } from 'bun:bundle';
if (feature('FEAT_CLOUD_UPLOAD')) {
  console.log('✅ Cloud uploads enabled');
} else {
  console.log('❌ Cloud uploads disabled');
}
" | bun run -
```

**Key Features**:
- All code treated as TypeScript with JSX support
- No temporary files needed
- Full TypeScript type checking
- Supports imports and feature flags

## bun create Flags

```bash
# Create from template
bun create user/repo my-app

# Force overwrite existing files
bun create user/repo my-app --force

# Non-interactive mode
bun create user/repo my-app --yes

# From specific branch
bun create user/repo#branch my-app
```

## 🎯 Feature Flags

```bash
# Enable features at runtime/compile time
bun run src/index.ts --feature=FEAT_CLOUD_UPLOAD --feature=FEAT_UPLOAD_PROGRESS

# Build with features
bun build src/index.ts --outdir=./dist --feature=FEAT_CLOUD_UPLOAD --feature=FEAT_MULTIPART_UPLOAD

# Check feature in code
import { feature } from "bun:bundle";
if (feature("FEAT_CLOUD_UPLOAD")) {
  // This code only included if feature is enabled
}
```

### Available Features

| Feature | Description | Default |
|---------|-------------|---------|
| `FEAT_CLOUD_UPLOAD` | Enable S3/R2 cloud uploads | `false` |
| `FEAT_UPLOAD_PROGRESS` | Real-time progress tracking | `false` |
| `FEAT_MULTIPART_UPLOAD` | Large file multipart upload | `false` |
| `FEAT_UPLOAD_ANALYTICS` | Upload metrics and analytics | `false` |
| `FEAT_CUSTOM_METADATA` | Custom S3 metadata | `false` |

### Bundle Size Impact

```bash
# Lite build (cloud upload only)
bun build src/index.ts --feature=FEAT_CLOUD_UPLOAD --minify
# Result: ~8% bundle size increase (~25KB)

# Premium build (all features)
bun build src/index.ts --feature=FEAT_CLOUD_UPLOAD --feature=FEAT_UPLOAD_PROGRESS \
  --feature=FEAT_MULTIPART_UPLOAD --feature=FEAT_UPLOAD_ANALYTICS --minify
# Result: ~15% bundle size increase (~50KB)

# Disabled (no features)
bun build src/index.ts --minify
# Result: 0KB increase (complete dead-code elimination)
```

## 📊 Priority Order

```
CLI Flags (1) > Environment Variables (2) > bunfig.toml (3)
```

## 🔑 Bun Environment Variables

### Registry & Auth

| Variable | Example |
|----------|---------|
| `BUN_CONFIG_REGISTRY` | `https://npm.pkg.github.com` |
| `BUN_CONFIG_TOKEN` | `ghp_xxx` |

### Lockfile Control

| Variable | Effect |
|----------|--------|
| `BUN_CONFIG_YARN_LOCKFILE` | Save Yarn v1 lockfile |
| `BUN_CONFIG_SKIP_SAVE_LOCKFILE` | Don't save lockfile |
| `BUN_CONFIG_SKIP_LOAD_LOCKFILE` | Don't load lockfile |

### Installation

| Variable | Effect |
|----------|--------|
| `BUN_CONFIG_SKIP_INSTALL_PACKAGES` | Skip auto-install |
| `BUN_CONFIG_LINK_NATIVE_BINS` | Link native binaries |

## ☁️ Upload System Variables

### Essential

```bash
ENVIRONMENT=production          # dev | staging | prod | test
PORT=3000                       # Server port
UPLOAD_PROVIDER=s3              # local | s3 | r2
```

### S3 Configuration

```bash
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=geelark-uploads
S3_REGION=us-east-1
```

### R2 Configuration

```bash
R2_ACCESS_KEY_ID=your-r2-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET=geelark-uploads
R2_ACCOUNT_ID=your-account-id
```

### Limits

```bash
UPLOAD_MAX_SIMPLE_SIZE=5242880         # 5MB
UPLOAD_MAX_MULTIPART_SIZE=5497558138880 # 5TB
UPLOAD_TIMEOUT=300000                   # 5 minutes
UPLOAD_MAX_CONCURRENT=10                # Concurrent uploads
```

### Security

```bash
USE_SYSTEM_CA=true
UPLOAD_VALIDATE_FILE_TYPES=true
UPLOAD_BLOCKED_EXTENSIONS=.exe,.bat,.sh
```

## 🎯 Common Configurations

### Development (Local)

```bash
ENVIRONMENT=development
PORT=3000
LOG_LEVEL=debug
ENABLE_PROFILING=true
UPLOAD_PROVIDER=local
```

### Production (S3)

```bash
ENVIRONMENT=production
PORT=3000
LOG_LEVEL=info
UPLOAD_PROVIDER=s3
S3_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=geelark-uploads-prod
USE_SYSTEM_CA=true
```

### Production (R2)

```bash
ENVIRONMENT=production
PORT=3000
LOG_LEVEL=info
UPLOAD_PROVIDER=r2
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
R2_BUCKET=geelark-uploads-prod
R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
```

## 🔧 CLI Override Examples

```bash
# Override port from CLI
bun run dashboard-server.ts --port 4000

# Override upload provider
bun run dashboard-server.ts --upload-provider s3

# Use custom env file
bun run dashboard-server.ts --env-file .env.production

# System CA + IPv4-first DNS
bun run dashboard-server.ts --use-system-ca --dns-result-order ipv4first
```

## 📝 Environment File Examples

### .env.development
```ini
ENVIRONMENT=development
PORT=3000
LOG_LEVEL=debug
ENABLE_PROFILING=true
UPLOAD_PROVIDER=local
```

### .env.production
```ini
ENVIRONMENT=production
PORT=3000
LOG_LEVEL=info
ENABLE_PROFILING=false
UPLOAD_PROVIDER=s3
S3_BUCKET=geelark-uploads-prod
USE_SYSTEM_CA=true
```

### .env.staging
```ini
ENVIRONMENT=staging
PORT=3001
LOG_LEVEL=debug
UPLOAD_PROVIDER=s3
S3_BUCKET=geelark-uploads-staging
```

## 🔒 Security Best Practices

✅ **DO:**
- Use environment variables for secrets
- Use `.env.upload` (in `.gitignore`)
- Reference secrets with `${VAR_NAME}`
- Use different configs per environment

❌ **DON'T:**
- Commit `.env.upload` to git
- Hardcode secrets in code
- Use production secrets in development
- Share `.env.upload` files

## 🐳 Docker Example

```yaml
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
    env_file:
      - .env.production
```

## 🔍 Troubleshooting

### Check variable is set:
```bash
echo $UPLOAD_PROVIDER
```

### Load env file manually:
```bash
set -a
source .env.upload
set +a
```

### Verify configuration:
```bash
bun run dashboard-server.ts --help
```

---

**Full documentation**: `docs/ENV_CONFIGURATION.md`

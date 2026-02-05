# 🚀 Fantasy42-Fire22 Registry - Advanced Packaging & Deployment

Enterprise-grade packaging and deployment automation for the Fantasy42-Fire22
registry with comprehensive environment configuration and CI/CD integration.

## 📋 Table of Contents

- [Usage Examples](#usage-examples)
- [Environment Configuration](#environment-configuration)
- [Packaging Commands](#packaging-commands)
- [Deployment Commands](#deployment-commands)
- [CI/CD Integration](#cicd-integration)
- [Advanced Configuration](#advanced-configuration)
- [Performance Optimization](#performance-optimization)

## 🚀 Usage Examples

### Basic Packing

```bash
# Basic packing
bun run pack
```

Creates `fantasy42-fire22-registry-1.0.1.tgz` in quiet mode for scripting
automation.

### Advanced Packing with Options

```bash
# Advanced packing with custom destination and compression
bun run pack:advanced --destination ./dist --gzip-level 6
```

- **Destination**: `./dist` directory
- **Compression**: Gzip level 6 (balanced speed/compression)
- **Mode**: Quiet for automation

### Dry Run Preview

```bash
# Dry run to see what would be packed
bun run pack:dry-run
```

Shows all files that would be included without creating the actual package:

- 4,876+ files from the comprehensive codebase
- File sizes and paths
- Perfect for package content auditing

### Production Packing

```bash
# Production packing with maximum compression
bun run pack:production
```

- **Filename**: `fantasy42-fire22-registry-1.0.1-prod.tgz`
- **Compression**: Gzip level 9 (maximum compression)
- **Scripts**: Ignored for faster, safer packaging
- **Mode**: Quiet for automation

### CI/CD Packaging

```bash
# CI/CD packaging with timestamp
bun run pack:ci
```

- **Filename**: `fantasy42-registry-YYYYMMDD-HHMMSS.tgz`
- **Compression**: Uses `DEFAULT_GZIP_LEVEL` (6 by default)
- **Perfect for**: Timestamped CI/CD artifacts

### Deploy to Different Environments

```bash
# Deploy to different environments
bun run deploy:production
bun run deploy:staging
bun run deploy:development
```

Each command:

- Loads environment-specific configuration
- Creates optimized packages for the target environment
- Validates security and compliance settings
- Prepares deployment artifacts

### Custom Deployment Options

```bash
# Deploy with custom options
DEPLOY_TARGET=staging bun run deploy
```

Uses environment variables to override deployment targets dynamically.

## ⚙️ Environment Configuration

### Main Configuration File

Create `config/packaging.env` with your deployment settings:

```env
# Deployment configuration
DEPLOY_TARGET=production
DEPLOY_TOKEN=your_deployment_token_here
REGISTRY_URL=https://registry.npmjs.org/
ARTIFACT_STORAGE_URL=https://artifacts.storage.com

# Compression settings
DEFAULT_GZIP_LEVEL=6
PRODUCTION_GZIP_LEVEL=9
STAGING_GZIP_LEVEL=6
DEVELOPMENT_GZIP_LEVEL=3

# Registry settings
NPM_REGISTRY=https://registry.npmjs.org/
SPORTSBET_REGISTRY=https://registry.sportsbet.com
FIRE22_REGISTRY=https://registry.fire22.com

# Enterprise settings
ENTERPRISE_MODE=true
COMPLIANCE_LEVEL=enterprise
SECURITY_LEVEL=high
AUDIT_TRAIL=true
```

### Environment-Specific Configurations

#### Production (`config/production.env`)

```env
DEPLOY_TARGET=production
NODE_ENV=production
DEFAULT_GZIP_LEVEL=9
SECURITY_LEVEL=high
COMPLIANCE_LEVEL=enterprise
```

#### Staging (`config/staging.env`)

```env
DEPLOY_TARGET=staging
NODE_ENV=staging
DEFAULT_GZIP_LEVEL=6
SECURITY_LEVEL=medium
COMPLIANCE_LEVEL=standard
```

#### Development (`config/development.env`)

```env
DEPLOY_TARGET=development
NODE_ENV=development
DEFAULT_GZIP_LEVEL=3
SECURITY_LEVEL=low
COMPLIANCE_LEVEL=basic
```

## 📦 Packaging Commands

### Basic Commands

| Command                   | Description      | Output                                |
| ------------------------- | ---------------- | ------------------------------------- |
| `bun run pack`            | Basic packaging  | `fantasy42-fire22-registry-1.0.1.tgz` |
| `bun run pack:advanced`   | Advanced options | `./dist/` with gzip level 6           |
| `bun run pack:dry-run`    | Preview contents | File list with sizes                  |
| `bun run pack:production` | Production ready | Max compression, ignore scripts       |
| `bun run pack:ci`         | CI/CD ready      | Timestamped filename                  |

### Environment-Specific Commands

| Command                    | Environment | Compression | Features                   |
| -------------------------- | ----------- | ----------- | -------------------------- |
| `bun run pack:staging`     | Staging     | Level 6     | `./dist/staging/`          |
| `bun run pack:development` | Development | Level 3     | `./dist/dev/` with git SHA |

## 🚀 Deployment Commands

### Environment Deployments

| Command                      | Environment | Security | Compression |
| ---------------------------- | ----------- | -------- | ----------- |
| `bun run deploy:production`  | Production  | High     | Maximum     |
| `bun run deploy:staging`     | Staging     | Medium   | Balanced    |
| `bun run deploy:development` | Development | Low      | Fast        |

### Publishing Commands

```bash
# Publish to npm registry
bun run publish:registry

# Publish to sports betting registry
bun run publish:sportsbet
```

### Release Management

```bash
# Prepare release (patch version bump)
bun run release:prepare

# Create release (minor version bump)
bun run release:create

# Full release pipeline
bun run release:publish
```

### Artifact Management

```bash
# Create upload-ready artifact
bun run artifact:upload
```

## 🔄 CI/CD Integration

### Build Pipeline

```bash
# Complete CI build
bun run ci:build
```

Includes:

- Dependency installation
- Test execution
- Package creation with timestamps

### Deployment Pipeline

```bash
# CI deployment
bun run ci:deploy
```

Includes:

- Package creation
- Environment-specific deployment
- Validation and verification

### Release Pipeline

```bash
# Complete CI/CD release
bun run ci:release
```

Includes:

- Build verification
- Test execution
- Package creation
- Registry publishing

## 🔧 Advanced Configuration

### Environment Variables

| Variable               | Description         | Default                         |
| ---------------------- | ------------------- | ------------------------------- |
| `DEPLOY_TARGET`        | Target environment  | `production`                    |
| `DEFAULT_GZIP_LEVEL`   | Default compression | `6`                             |
| `REGISTRY_URL`         | NPM registry URL    | `https://registry.npmjs.org/`   |
| `ARTIFACT_STORAGE_URL` | Artifact storage    | `https://artifacts.storage.com` |

### Compression Levels

| Level | Speed    | Size     | Use Case           |
| ----- | -------- | -------- | ------------------ |
| 1     | Fastest  | Largest  | Development        |
| 3     | Fast     | Large    | Development builds |
| 6     | Balanced | Medium   | CI/CD, staging     |
| 9     | Slowest  | Smallest | Production         |

### Security Levels

| Level  | Validation | Audit Trail | Use Case    |
| ------ | ---------- | ----------- | ----------- |
| Low    | Basic      | Disabled    | Development |
| Medium | Standard   | Enabled     | Staging     |
| High   | Enterprise | Full        | Production  |

## ⚡ Performance Optimization

### Compression Performance

- **Level 1**: ~2x faster, ~10% larger files
- **Level 6**: Balanced performance
- **Level 9**: ~2x slower, ~10% smaller files

### Script Handling

- **With Scripts**: Includes pre/postpack scripts (may have side effects)
- **Ignore Scripts**: Faster packaging, safer for automation

### Environment Performance

| Environment | Compression        | Scripts  | Target        |
| ----------- | ------------------ | -------- | ------------- |
| Development | Fast (Level 3)     | Included | Speed         |
| Staging     | Balanced (Level 6) | Included | Balance       |
| Production  | Maximum (Level 9)  | Ignored  | Size/Security |

## 📊 Package Statistics

- **Files**: 4,876+ files packaged
- **Base Size**: ~75MB uncompressed
- **Compressed Size**: ~58MB (Gzip level 9)
- **Compression Ratio**: ~23% reduction
- **Package Format**: Standard npm tarball (.tgz)

## 🏢 Enterprise Features

- ✅ **Multi-environment deployment**
- ✅ **Security level configuration**
- ✅ **Audit trail support**
- ✅ **Compliance validation**
- ✅ **Timestamped artifacts**
- ✅ **Git integration**
- ✅ **Registry authentication**
- ✅ **CI/CD pipeline integration**

## 📋 Command Reference

### All Available Commands

```bash
# Packaging
bun run pack                    # Basic packaging
bun run pack:advanced          # Advanced options
bun run pack:dry-run          # Preview contents
bun run pack:production       # Production ready
bun run pack:ci               # CI/CD ready
bun run pack:staging          # Staging environment
bun run pack:development      # Development environment

# Deployment
bun run deploy:production     # Production deployment
bun run deploy:staging        # Staging deployment
bun run deploy:development    # Development deployment
bun run deploy                # Default deployment
bun run deploy:custom         # Custom deployment

# Publishing
bun run publish:registry      # NPM registry
bun run publish:sportsbet     # Sports betting registry

# Release Management
bun run release:prepare       # Prepare release
bun run release:create        # Create release
bun run release:publish       # Full release pipeline

# CI/CD
bun run ci:build              # Build pipeline
bun run ci:deploy             # Deploy pipeline
bun run ci:release            # Release pipeline

# Utilities
bun run artifact:upload       # Create upload artifact
```

## 🎯 Getting Started

1. **Configure Environment**:

   ```bash
   cp config/packaging.env .env  # Or configure your environment
   ```

2. **Basic Packaging**:

   ```bash
   bun run pack
   ```

3. **Environment Deployment**:

   ```bash
   bun run deploy:production
   ```

4. **CI/CD Integration**:
   ```bash
   bun run ci:release
   ```

## 🚀 Advanced Usage

### Custom Environment Variables

```bash
# Override deployment target
DEPLOY_TARGET=staging bun run deploy

# Custom compression level
DEFAULT_GZIP_LEVEL=7 bun run pack:ci

# Custom registry
REGISTRY_URL=https://my-registry.com bun run publish:registry
```

### Scripting Examples

```bash
#!/bin/bash
# Deploy to multiple environments
bun run deploy:staging
bun run deploy:production

# Create timestamped backup
bun run artifact:upload

# Release pipeline
bun run release:create
bun run publish:registry
```

---

**🎉 Your Fantasy42-Fire22 registry now has enterprise-grade packaging and
deployment automation!**

The implementation includes 20+ scripts covering packaging, deployment,
publishing, and CI/CD integration with comprehensive environment configuration
and performance optimization.

# Scripts Directory

This directory contains build, deployment, and utility scripts for the Quantum Terminal Dashboard.

## Structure

### `deploy/`
Production deployment scripts:
- `deploy-quantum-v2.sh` - Main deployment script with validation
- `deploy-quantum-hyper.sh` - Legacy deployment script

### Root Scripts
- `build-*.sh` - Build scripts for different components
- `start-*.js` - Development startup scripts
- `memory-monitor.js` - Memory monitoring utility

## Deployment Script Features

The `deploy-quantum-v2.sh` script provides:
- **Version validation** - Ensures Bun compatibility
- **Dependency installation** - Frozen lockfile support
- **Build process** - Multi-target compilation
- **Bundle validation** - Comprehensive testing
- **S3 deployment** - Multi-part upload for large files
- **Health checks** - Post-deployment verification
- **Badge generation** - Deploy status badges

## Usage

```bash
# Run deployment
./scripts/deploy/deploy-quantum-v2.sh

# Run build script
./scripts/build-simd.sh

# Start development server
bun run scripts/start-terminal-dev.js
```

## Environment Variables

For deployment scripts:
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `DEPLOY_BUCKET` - S3 bucket for artifacts
- `NODE_ENV` - Environment (production/staging)
- `BUILD_TIME` - Build timestamp metadata
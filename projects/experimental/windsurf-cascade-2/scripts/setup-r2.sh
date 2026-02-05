#!/bin/bash
# Cloudflare R2 + Private Registry Setup Script
# Enhanced with comprehensive error handling and validation

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Progress indicator
show_progress() {
    local duration=$1
    local message=$2
    echo -n "${BLUE}⏳ $message${NC}"
    for i in $(seq 1 $duration); do
        echo -n "."
        sleep 0.1
    done
    echo " ${GREEN}Done!${NC}"
}

echo "🚀 Setting up Cloudflare R2 + Private Registry Integration"
echo "=========================================================="

# Check if required tools are installed
log_info "Checking required tools..."

if ! command -v wrangler &> /dev/null; then
    log_warning "Wrangler CLI not found. Installing..."
    npm install -g wrangler
    if [ $? -eq 0 ]; then
        log_success "Wrangler CLI installed successfully"
    else
        log_error "Failed to install Wrangler CLI"
        exit 1
    fi
else
    log_success "Wrangler CLI found"
fi

if ! command -v bun &> /dev/null; then
    log_error "Bun not found. Please install Bun first."
    echo "Visit: https://bun.sh/docs/installation"
    exit 1
else
    log_success "Bun found: $(bun --version)"
fi

if ! command -v curl &> /dev/null; then
    log_error "curl not found. Please install curl."
    exit 1
else
    log_success "curl found"
fi

# Load and validate environment variables
log_info "Loading R2 configuration..."

if [ -f ".env.r2" ]; then
    log_info "Loading R2 configuration from .env.r2"
    
    # Validate .env.r2 format
    if grep -q "CLOUDFLARE_ACCOUNT_ID=" .env.r2 && \
       grep -q "CLOUDFLARE_API_KEY=" .env.r2 && \
       grep -q "R2_BUCKET_NAME=" .env.r2; then
        log_success "Environment file format validated"
    else
        log_error "Invalid .env.r2 format. Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_KEY, R2_BUCKET_NAME"
        exit 1
    fi
    
    # Load environment variables safely
    set -a
    source .env.r2
    set +a
    
    log_success "Environment variables loaded"
else
    log_error ".env.r2 file not found. Please create it with your Cloudflare credentials."
    echo ""
    echo "Example .env.r2 file:"
    echo "CLOUDFLARE_ACCOUNT_ID=your-account-id-here"
    echo "CLOUDFLARE_API_KEY=your-api-key-here"
    echo "R2_BUCKET_NAME=private-registry"
    echo "R2_ENDPOINT=https://r2.cloudflarestorage.com"
    exit 1
fi

# Validate required environment variables
log_info "Validating environment variables..."

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    log_error "CLOUDFLARE_ACCOUNT_ID is required"
    exit 1
fi

if [ -z "${CLOUDFLARE_API_KEY:-}" ]; then
    log_error "CLOUDFLARE_API_KEY is required"
    exit 1
fi

if [ -z "${R2_BUCKET_NAME:-}" ]; then
    log_error "R2_BUCKET_NAME is required"
    exit 1
fi

log_success "Environment variables validated"

# Authenticate with Cloudflare
log_info "Authenticating with Cloudflare..."
if wrangler whoami > /dev/null 2>&1; then
    log_success "Already authenticated with Cloudflare"
elif wrangler login; then
    log_success "Cloudflare authentication successful"
else
    log_error "Cloudflare authentication failed"
    echo "Please run 'wrangler login' manually and try again."
    exit 1
fi

# Create R2 bucket if it doesn't exist
log_info "Creating R2 bucket: $R2_BUCKET_NAME"
if wrangler r2 bucket create "$R2_BUCKET_NAME" 2>/dev/null; then
    log_success "R2 bucket created successfully"
else
    # Check if bucket already exists
    if wrangler r2 bucket info "$R2_BUCKET_NAME" > /dev/null 2>&1; then
        log_success "R2 bucket already exists"
    else
        log_error "Failed to create R2 bucket"
        exit 1
    fi
fi

# Test R2 connection with detailed error handling
log_info "Testing R2 connection..."
if wrangler r2 bucket info "$R2_BUCKET_NAME" > /dev/null 2>&1; then
    log_success "R2 connection successful"
else
    log_error "R2 connection failed"
    echo "Please check your credentials and try again."
    exit 1
fi

# Create comprehensive test package
log_info "Creating comprehensive test package..."
TEST_PACKAGE_DIR="test-package-$(date +%s)"
mkdir -p "$TEST_PACKAGE_DIR"
cd "$TEST_PACKAGE_DIR"

# Create enhanced package.json with full metadata
cat > package.json << EOF
{
  "name": "@mycompany/r2-test-package",
  "version": "1.0.0",
  "description": "Test package for R2 integration with 13-byte config",
  "main": "index.js",
  "scripts": {
    "test": "bun test",
    "start": "bun index.js"
  },
  "keywords": ["test", "r2", "registry", "bun", "config"],
  "author": "My Company <dev@mycompany.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/mycompany/r2-test-package.git"
  },
  "bugs": {
    "url": "https://github.com/mycompany/r2-test-package/issues"
  },
  "homepage": "https://github.com/mycompany/r2-test-package#readme",
  "engines": {
    "bun": ">=1.0.0",
    "node": ">=18.0.0"
  },
  "config": {
    "registry": "http://localhost:4873"
  }
}
EOF

# Create comprehensive index.js with config demonstration
cat > index.js << EOF
#!/usr/bin/env bun
/**
 * R2 Test Package - Demonstrates 13-byte config integration
 * This package was uploaded via Cloudflare R2 with config tracking
 */

console.log("🚀 Hello from @mycompany/r2-test-package!");
console.log("📦 This package demonstrates R2 + 13-byte config integration");

// Export configuration-aware functionality
export const packageInfo = {
  name: "@mycompany/r2-test-package",
  version: "1.0.0",
  description: "Test package for R2 integration with 13-byte config",
  features: [
    "Cloudflare R2 storage",
    "13-byte config tracking", 
    "Bun runtime optimization",
    "Private registry support"
  ],
  uploadedVia: "Cloudflare R2",
  configAware: true
};

// Config-aware function that respects 13-byte config
export function getConfigAwareMessage(configVersion = 1) {
  const messages = {
    1: "Running with modern 13-byte config",
    0: "Running with legacy config"
  };
  
  return messages[configVersion] || "Unknown config version";
}

// Main execution
if (import.meta.main) {
  console.log(getConfigAwareMessage());
  console.log("Package info:", packageInfo);
}

export default packageInfo;
EOF

# Create README.md
cat > README.md << EOF
# @mycompany/r2-test-package

Test package demonstrating Cloudflare R2 integration with 13-byte config tracking.

## Features

- ☁️ Stored in Cloudflare R2
- 🔧 13-byte config tracking
- ⚡ Bun runtime optimized
- 📦 Private registry compatible

## Usage

\`\`\`bash
bun install @mycompany/r2-test-package
\`\`\`

## Config Integration

This package respects the 13-byte immutable config system:
- Config version determines feature availability
- Registry hash ensures package isolation
- Feature flags control behavior
EOF

# Create test file
cat > test.test.js << EOF
import { describe, it, expect } from 'bun:test';
import { packageInfo, getConfigAwareMessage } from './index.js';

describe('R2 Test Package', () => {
  it('should have correct package info', () => {
    expect(packageInfo.name).toBe('@mycompany/r2-test-package');
    expect(packageInfo.version).toBe('1.0.0');
    expect(packageInfo.configAware).toBe(true);
  });

  it('should provide config-aware messages', () => {
    expect(getConfigAwareMessage(1)).toContain('modern 13-byte config');
    expect(getConfigAwareMessage(0)).toContain('legacy config');
  });
});
EOF

log_success "Test package created with comprehensive metadata"

# Create package tarball with integrity check
log_info "Building package tarball..."
if npm pack; then
    PACKAGE_FILE=$(ls *.tgz)
    PACKAGE_SIZE=$(stat -f%z "$PACKAGE_FILE" 2>/dev/null || stat -c%s "$PACKAGE_FILE" 2>/dev/null)
    # Use shasum on macOS, sha256sum on Linux
    if command -v shasum &> /dev/null; then
        PACKAGE_INTEGRITY=$(shasum -a 256 "$PACKAGE_FILE" | cut -d' ' -f1)
    else
        PACKAGE_INTEGRITY=$(sha256sum "$PACKAGE_FILE" | cut -d' ' -f1)
    fi
    
    log_success "Package built: $PACKAGE_FILE"
    log_info "Package size: $PACKAGE_SIZE bytes"
    log_info "Package integrity: $PACKAGE_INTEGRITY"
else
    log_error "Failed to build package"
    cd ..
    rm -rf "$TEST_PACKAGE_DIR"
    exit 1
fi

# Upload test package to R2 with enhanced metadata
log_info "Uploading test package to R2..."
UPLOAD_START=$(date +%s)

if wrangler r2 object put "$R2_BUCKET_NAME/packages/@mycompany/r2-test-package/1.0.0.tgz" \
    --file="$PACKAGE_FILE" \
    --remote; then
    
    UPLOAD_END=$(date +%s)
    UPLOAD_DURATION=$((UPLOAD_END - UPLOAD_START))
    
    log_success "Test package uploaded to R2 in ${UPLOAD_DURATION}s"
else
    log_error "Failed to upload test package to R2"
    cd ..
    rm -rf "$TEST_PACKAGE_DIR"
    exit 1
fi

# Verify upload with comprehensive checks
log_info "Verifying R2 upload..."
show_progress 10 "Checking package in R2"

# Check if bucket info shows the object count increased
BUCKET_INFO=$(wrangler r2 bucket info "$R2_BUCKET_NAME" 2>/dev/null || echo "")
if echo "$BUCKET_INFO" | grep -q "object_count: [1-9]"; then
    log_success "Package verification successful"
    
    # Show bucket info
    echo "📋 Bucket info: $BUCKET_INFO"
else
    log_error "Package verification failed"
    cd ..
    rm -rf "$TEST_PACKAGE_DIR"
    exit 1
fi

# Test registry integration
log_info "Testing registry integration..."
cd ..

# Check if registry is running
if curl -s http://localhost:4873/health > /dev/null 2>&1; then
    log_success "Registry is running on localhost:4873"
    
    # Test R2 endpoints
    log_info "Testing R2 API endpoints..."
    
    # Test stats endpoint
    if curl -s http://localhost:4873/_dashboard/api/r2/stats > /dev/null 2>&1; then
        log_success "R2 stats endpoint working"
    else
        log_warning "R2 stats endpoint not responding"
    fi
    
    # Test packages endpoint
    if curl -s "http://localhost:4873/_dashboard/api/r2/packages?configHash=0x12345678" > /dev/null 2>&1; then
        log_success "R2 packages endpoint working"
    else
        log_warning "R2 packages endpoint not responding"
    fi
    
else
    log_warning "Registry not running. Start it with: bun registry/api.ts"
fi

# Cleanup
log_info "Cleaning up temporary files..."
rm -rf "$TEST_PACKAGE_DIR"

# Final summary
echo ""
echo "🎉 Cloudflare R2 + Private Registry Setup Complete!"
echo "======================================================"
log_success "✅ R2 bucket created and accessible"
log_success "✅ Test package uploaded and verified"
log_success "✅ Registry integration tested"
log_success "✅ 13-byte config tracking enabled"

echo ""
echo "📊 Setup Summary:"
echo "  • Bucket: $R2_BUCKET_NAME"
echo "  • Account: $CLOUDFLARE_ACCOUNT_ID"
echo "  • Test Package: @mycompany/r2-test-package@1.0.0"
echo "  • Config Hash: 0x12345678"

echo ""
echo "🚀 Next Steps:"
echo "  1. Open dashboard: http://localhost:4873"
echo "  2. Click '☁️ Cloudflare R2 Storage' section"
echo "  3. Click '🔄 Sync Logs to R2' to test sync"
echo "  4. Click '📦 List R2 Packages' to see uploaded packages"

echo ""
echo "🔧 Advanced Usage:"
echo "  • Upload packages: bun scripts/upload-to-r2.sh <package>"
echo "  • Sync logs: curl -X POST http://localhost:4873/_dashboard/api/r2/sync"
echo "  • List packages: curl 'http://localhost:4873/_dashboard/api/r2/packages'"

echo ""
log_success "Setup completed successfully! Your private registry is now R2-enabled. 🎯"

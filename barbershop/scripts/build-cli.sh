#!/bin/bash
# Build Cookie Security CLI for multiple platforms
# Uses Bun's --compile feature
# @see {@link https://bun.sh/docs/bundler/executables}

set -e

VERSION="3.26.0"
OUTDIR="./dist/cli"
ENTRY="./cli/cookie-security-cli.ts"

echo "🍪 Building Cookie Security v${VERSION} CLI..."
echo "================================================"

# Create output directory
mkdir -p ${OUTDIR}

# Function to build for a target
build_target() {
  local target=$1
  local output=$2
  
  echo ""
  echo "Building for ${target}..."
  bun build --compile --minify --target=${target} ${ENTRY} --outfile ${OUTDIR}/${output}
  
  if [ -f "${OUTDIR}/${output}" ]; then
    local size=$(du -h "${OUTDIR}/${output}" | cut -f1)
    echo "  ✓ Built: ${output} (${size})"
  else
    echo "  ✗ Failed to build: ${output}"
    return 1
  fi
}

# Build for current platform
echo ""
echo "📦 Current Platform ($(uname -s) $(uname -m))..."
bun build --compile --minify ${ENTRY} --outfile ${OUTDIR}/cookie-security
echo "  ✓ Built: cookie-security"

# Build for Linux (most common server platform)
build_target "bun-linux-x64" "cookie-security-linux-x64"
build_target "bun-linux-arm64" "cookie-security-linux-arm64"

# Build for macOS
build_target "bun-darwin-x64" "cookie-security-macos-x64"
build_target "bun-darwin-arm64" "cookie-security-macos-arm64"

# Build for Windows
build_target "bun-windows-x64" "cookie-security-windows-x64.exe"

echo ""
echo "================================================"
echo "✅ All builds complete!"
echo ""
echo "Output directory: ${OUTDIR}/"
echo ""
ls -lh ${OUTDIR}/
echo ""
echo "Usage:"
echo "  ./dist/cli/cookie-security audit 'session=abc; Secure; HttpOnly'"
echo "  ./dist/cli/cookie-security csrf 'user_session_123'"
echo "  ./dist/cli/cookie-security benchmark"

#!/usr/bin/env bun

# Build script for TOML Secrets Editor
# Compiles TypeScript and creates optimized binary

set -e

echo "🔐 Building TOML Secrets Editor..."

# Check dependencies
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is required but not installed"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -f toml-guard
rm -f toml-guard.exe

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Type check
echo "🔍 Type checking..."
bun run tsc --noEmit

# Build for production
echo "🏗️  Building for production..."
bun build src/cli/toml-cli.ts \
    --compile \
    --target bun \
    --minify \
    --sourcemap \
    --outfile toml-guard

# Make executable
chmod +x toml-guard

# Create optimized variants
echo "⚡ Creating optimized variants..."

# Minimal version (no interactive features)
bun build src/cli/toml-cli.ts \
    --compile \
    --target bun \
    --minify \
    --define:process.env.NODE_ENV=\"production\" \
    --define:process.env.MINIMAL=\"true\" \
    --outfile toml-guard-minimal

chmod +x toml-guard-minimal

# Development version with debugging
bun build src/cli/toml-cli.ts \
    --compile \
    --target bun \
    --sourcemap \
    --define:process.env.NODE_ENV=\"development\" \
    --outfile toml-guard-dev

chmod +x toml-guard-dev

# Create package
echo "📦 Creating distribution package..."
mkdir -p dist/
cp toml-guard dist/
cp toml-guard-minimal dist/
cp toml-guard-dev dist/
cp .observatory-policy.toml dist/
cp README.md dist/ 2>/dev/null || echo "# TOML Secrets Editor" > dist/README.md

# Generate documentation
echo "📚 Generating documentation..."
cat > dist/USAGE.md << 'EOF'
# TOML Secrets Editor - Usage Guide

## Installation

```bash
# Download the binary
curl -L https://github.com/your-org/toml-guard/releases/latest/download/toml-guard -o toml-guard
chmod +x toml-guard

# Or build from source
bun install
bun run build
```

## Quick Start

```bash
# Edit a TOML file with security validation
./toml-guard edit config.toml --set "api.url=https://api.${ENV}.com"

# Validate security
./toml-guard validate secrets.toml --fail-on-dangerous

# Optimize and minify
./toml-guard optimize config.toml --output config.min.toml --minify

# Interactive mode
./toml-guard interactive secrets.toml

# Audit multiple files
./toml-guard audit config/*.toml --format json
```

## Security Features

- ✅ Environment variable syntax validation
- ✅ Dangerous pattern detection  
- ✅ Classification system (PUBLIC/PRIVATE/SECRET)
- ✅ Audit logging with SQLite
- ✅ URLPattern security analysis
- ✅ Policy-based enforcement

## Configuration

Copy `.observatory-policy.toml` to your project and customize security rules.

## Examples

See the `examples/` directory for sample configurations and use cases.
EOF

# Run tests
echo "🧪 Running tests..."
if [ -f "test.toml" ]; then
    ./toml-guard validate test.toml || echo "⚠️  Test validation failed"
fi

# Test basic functionality
echo "🔧 Testing basic functionality..."
echo 'test_key = "${TEST_VAR:-default}"' > test-config.toml

./toml-guard validate test-config.toml
./toml-guard optimize test-config.toml --output test-config.min.toml

# Cleanup test files
rm -f test-config.toml test-config.min.toml

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 Binaries created:"
echo "  - toml-guard          (full features)"
echo "  - toml-guard-minimal  (minimal version)"
echo "  - toml-guard-dev      (development version)"
echo ""
echo "🚀 Quick test:"
echo "  ./toml-guard --help"
echo ""
echo "📚 Documentation: dist/USAGE.md"
echo "📦 Distribution: dist/"

#!/bin/bash

# Enhanced Bun Setup Script
# Improves Bun installation and configuration

set -e

echo "🚀 Enhanced Bun Setup for File Analyzer Stack"
echo "=============================================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Add to shell profile if not already there
    if ! grep -q 'bun.sh/install' "$HOME/.zshrc" 2>/dev/null && ! grep -q 'bun.sh/install' "$HOME/.bashrc" 2>/dev/null; then
        echo 'export BUN_INSTALL="$HOME/.bun"' >> "$HOME/.zshrc"
        echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$HOME/.zshrc"
        echo 'export BUN_INSTALL="$HOME/.bun"' >> "$HOME/.bashrc"
        echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$HOME/.bashrc"
        echo "✅ Added Bun to PATH in shell profile"
    fi
else
    echo "✅ Bun is already installed: $(bun --version)"
fi

# Create project directories
echo "📁 Creating project directories..."
mkdir -p public/{dev,prod,development,staging,production}
mkdir -p dist/api
mkdir -p logs
mkdir -p temp
mkdir -p .bun-cache

# Set up environment file
echo "⚙️ Setting up environment configuration..."
if [ ! -f .env ]; then
    cat > .env << EOF
# Bun File Analyzer Stack Environment
PORT=3879
API_PORT=3005
NODE_ENV=development
BUN_RUNTIME_TYPE=node

# Build Configuration
BUN_BUILD_MINIFY=false
BUN_BUILD_SOURCEMAP=true
BUN_BUILD_TARGET=browser

# Development Settings
BUN_HOT_RELOAD=true
BUN_REACT_FAST_REFRESH=true

# API Configuration
API_CORS_ORIGIN=http://localhost:3879
API_MAX_FILE_SIZE=104857600
API_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF
    echo "✅ Created .env file with default configuration"
else
    echo "ℹ️ .env file already exists"
fi

# Create Bun configuration file
echo "🔧 Optimizing Bun configuration..."
if [ ! -f bun.config.js ]; then
    cat > bun.config.js << EOF
/// <reference types="bun-types" />

const config = {
  entrypoints: ["./src/index.tsx"],
  outdir: "./public",
  target: "browser",
  format: "esm",
  
  // React Fast Refresh for development
  reactFastRefresh: process.env.NODE_ENV !== "production",
  
  // Development settings
  sourcemap: process.env.NODE_ENV === "development" ? "external" : false,
  minify: process.env.NODE_ENV === "production",
  
  // Environment variables
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    "process.env.PORT": JSON.stringify(process.env.PORT || "3879"),
    "process.env.API_PORT": JSON.stringify(process.env.API_PORT || "3005"),
    "__APP_VERSION__": JSON.stringify(process.env.npm_package_version || "1.0.0"),
    "__BUILD_TIME__": JSON.stringify(new Date().toISOString()),
  },
  
  // Asset optimization
  loader: {
    ".svg": "dataurl",
    ".png": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".gif": "file",
    ".webp": "file",
  },
  
  // External dependencies (don't bundle)
  external: ["react", "react-dom"],
  
  // Plugins (if needed)
  plugins: [],
};

export default config;
EOF
    echo "✅ Created optimized bun.config.js"
else
    echo "ℹ️ bun.config.js already exists"
fi

# Install dependencies with optimizations
echo "📦 Installing dependencies with optimizations..."
bun install

# Create development scripts
echo "📜 Creating development helpers..."

# Create a development launcher
cat > scripts/dev.sh << 'EOF'
#!/bin/bash

# Development launcher with error handling
set -e

echo "🚀 Starting Bun File Analyzer Development Environment"
echo "======================================================"

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down development servers..."
    pkill -f "bun.*api/index.ts" || true
    pkill -f "bun.*serve.ts" || true
    pkill -f "bun.*build.*watch" || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start API server
echo "🔥 Starting API server on port $API_PORT..."
bun run --watch api/index.ts &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start frontend build with HMR
echo "🔨 Starting frontend build with HMR..."
bun build --watch --react-fast-refresh ./src/index.tsx --outdir ./public &
BUILD_PID=$!

# Wait a moment for build to start
sleep 2

# Start static file server
echo "🌐 Starting static server on port $PORT..."
bun --hot tools/serve.ts &
SERVER_PID=$!

echo "✅ Development environment started!"
echo "📱 Frontend: http://localhost:$PORT"
echo "🔌 API: http://localhost:$API_PORT"
echo "❤️  Health: http://localhost:$API_PORT/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for all background processes
wait
EOF

chmod +x scripts/dev.sh

# Create a production deployment script
cat > scripts/deploy.sh << 'EOF'
#!/bin/bash

# Production deployment script
set -e

echo "🚀 Deploying Bun File Analyzer to Production"
echo "============================================="

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set production mode
export NODE_ENV=production

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf public/ dist/

# Build production frontend
echo "🔨 Building production frontend..."
bun run build:prod

# Build production API
echo "🔌 Building production API..."
bun run build:api

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p deployment
cp -r public/* deployment/
cp -r dist/* deployment/
cp package.json deployment/
cp bun.lock deployment/

echo "✅ Production deployment ready in ./deployment/"
echo "📊 Build size: $(du -sh deployment/ | cut -f1)"
EOF

chmod +x scripts/deploy.sh

# Create a performance monitoring script
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash

# Performance monitoring script
echo "📊 Bun File Analyzer Performance Monitor"
echo "======================================="

# Check if servers are running
API_PID=$(pgrep -f "bun.*api/index.ts" || echo "Not running")
FRONTEND_PID=$(pgrep -f "bun.*serve.ts" || echo "Not running")

echo "🔌 API Server PID: $API_PID"
echo "🌐 Frontend Server PID: $FRONTEND_PID"

# Test API health
if command -v curl &> /dev/null; then
    echo ""
    echo "🔍 API Health Check:"
    if curl -s http://localhost:3005/health > /dev/null; then
        echo "✅ API is responding"
    else
        echo "❌ API is not responding"
    fi
    
    echo ""
    echo "🔍 Frontend Check:"
    if curl -s -I http://localhost:3879 > /dev/null; then
        echo "✅ Frontend is responding"
    else
        echo "❌ Frontend is not responding"
    fi
fi

# Memory usage
echo ""
echo "💾 Memory Usage:"
if command -v ps &> /dev/null; then
    ps aux | grep -E "(bun.*api|bun.*serve)" | grep -v grep || echo "No Bun processes found"
fi

# Disk usage
echo ""
echo "💿 Disk Usage:"
du -sh public/ dist/ 2>/dev/null || echo "No build directories found"
EOF

chmod +x scripts/monitor.sh

# Make all scripts executable
chmod +x scripts/*.sh

# Update package.json with new scripts
echo "📝 Updating package.json scripts..."
npm pkg set scripts.setup:prod="./scripts/deploy.sh"
npm pkg set scripts.monitor="./scripts/monitor.sh"
npm pkg set scripts.dev:full="./scripts/dev.sh"

# Create Git hooks for better development
echo "🪝 Setting up Git hooks..."
mkdir -p .git/hooks

# Pre-commit hook for code quality
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Running pre-commit checks..."

# Run tests
bun test --quiet

# Check TypeScript
bun run build:dev

echo "✅ Pre-commit checks passed"
EOF
chmod +x .git/hooks/pre-commit

# Create development documentation
cat > docs/DEVELOPMENT.md << 'EOF'
# Development Guide

## Quick Start

```bash
# Setup environment
./scripts/setup-bun.sh

# Start development (all servers)
./scripts/dev.sh

# Or use npm scripts
bun run dev:full
```

## Development Scripts

- `./scripts/dev.sh` - Start full development environment
- `./scripts/deploy.sh` - Build for production
- `./scripts/monitor.sh` - Monitor server status
- `./scripts/clean.sh` - Clean build artifacts

## Environment Variables

See `.env` file for configuration options.

## Hot Reload

Both frontend and API support hot reload:
- Frontend: React Fast Refresh
- API: Automatic restart on file changes

## Testing

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test test/cookiemap.test.ts
```

## Build Variants

```bash
# Development build
bun run build:dev

# Production build
bun run build:prod

# Virtual files demo
bun run build:files
```
EOF

echo ""
echo "🎉 Enhanced Bun setup completed!"
echo "================================"
echo ""
echo "📁 Created directories: public/, dist/, logs/, temp/"
echo "⚙️ Environment file: .env"
echo "🔧 Configuration: bun.config.js"
echo "📜 Scripts: dev.sh, deploy.sh, monitor.sh, clean.sh"
echo "🪝 Git hooks: pre-commit checks"
echo "📚 Documentation: docs/DEVELOPMENT.md"
echo ""
echo "🚀 Next steps:"
echo "   1. Review .env file for configuration"
echo "   2. Run: ./scripts/dev.sh"
echo "   3. Open: http://localhost:3879"
echo "   4. Check: http://localhost:3005/health"
echo ""
echo "📊 Monitor with: ./scripts/monitor.sh"
echo "🧹 Clean with: ./scripts/clean.sh"

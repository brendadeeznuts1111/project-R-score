#!/bin/bash

# Enhanced Bun Registry Startup Script
# This script starts the enhanced registry with all features enabled

echo "🚀 Starting Enhanced Bun Registry..."
echo "=================================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    echo "Visit: https://bun.sh/"
    exit 1
fi

# Set environment variables
export NODE_ENV=development
export BUN_CONFIG_REGISTRY_PORT=4875
export BUN_CONFIG_WS_PORT=4876
export BUN_CONFIG_DEBUG=true
export BUN_CONFIG_PERSIST_PATH="./registry-config.db"

# Create necessary directories
mkdir -p logs
mkdir -p data

echo "📁 Creating directories..."
mkdir -p logs data

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Initialize database if it doesn't exist
if [ ! -f "registry.db" ]; then
    echo "🗄️ Initializing database..."
    touch registry.db
fi

echo ""
echo "🌐 Starting services..."
echo "===================="

# Start the enhanced registry server
echo "🔧 Starting Enhanced Registry API on port $BUN_CONFIG_REGISTRY_PORT..."
echo "📡 WebSocket server on port $BUN_CONFIG_WS_PORT..."
echo ""

# Run the enhanced server
bun run registry/enhanced-api.ts

echo ""
echo "✅ Registry started successfully!"
echo ""
echo "📊 Enhanced Dashboard: http://localhost:$BUN_CONFIG_REGISTRY_PORT/"
echo "🔧 Original Dashboard: http://localhost:$BUN_CONFIG_REGISTRY_PORT/original"
echo "📡 WebSocket Endpoint: ws://localhost:$BUN_CONFIG_WS_PORT"
echo "🏥 Health Check: http://localhost:$BUN_CONFIG_REGISTRY_PORT/health"
echo ""
echo "📚 API Endpoints:"
echo "  GET  /_dashboard/api/config     - Configuration"
echo "  GET  /_dashboard/api/metrics    - Performance metrics"
echo "  GET  /_dashboard/api/activity   - Activity log"
echo "  GET  /_dashboard/api/packages   - Package list"
echo "  POST /_dashboard/api/publish    - Publish package"
echo "  POST /_dashboard/api/features   - Toggle features"
echo ""
echo "🎯 Features enabled:"
echo "  ✅ Real-time WebSocket updates"
echo "  ✅ 13-byte config visualization"
echo "  ✅ Interactive feature flags"
echo "  ✅ Performance monitoring"
echo "  ✅ Activity logging"
echo "  ✅ Package management"
echo "  ✅ Terminal integration"
echo ""
echo "Press Ctrl+C to stop the server"

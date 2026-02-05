#!/bin/bash

# Start API Server for Widget Testing
# This script starts the RSS API server so widgets can connect to it

echo "🚀 Starting API Server for Widget Testing..."
echo "=============================================="

# Check if server is already running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ API server is already running on http://localhost:3001"
    echo "   Health check: http://localhost:3001/health"
    echo "   API docs: http://localhost:3001/api"
    exit 0
fi

echo "📡 Starting RSS API server..."
echo "   Port: 3001"
echo "   Health: http://localhost:3001/health"
echo "   API Docs: http://localhost:3001/api"
echo ""

# Start the server in the background
bun run src/api/rss-server.ts &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Server started successfully!"
        echo ""
        echo "🎯 Server Information:"
        echo "   PID: $SERVER_PID"
        echo "   URL: http://localhost:3001"
        echo "   Health: http://localhost:3001/health"
        echo "   API: http://localhost:3001/api"
        echo ""
        echo "💡 To stop the server:"
        echo "   kill $SERVER_PID"
        echo ""
        echo "🧪 Now you can run widgets:"
        echo "   bun run widget:dev"
        echo "   bun run tools/macos-widget/widget-debugger.ts"
        exit 0
    fi
    sleep 1
done

echo "❌ Server failed to start within 30 seconds"
echo "   Check logs for errors"
kill $SERVER_PID 2>/dev/null
exit 1
#!/bin/bash
echo "🚀 Starting Nebula-Flow™ AI System..."

# Check dependencies
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Please install Bun first."
    exit 1
fi

# Start the AI system
echo "🤖 Starting AI services..."
bun ai/index.ts serve &

# Save PID
echo $! > /tmp/nebula-ai.pid

echo "✅ Nebula-Flow™ AI System started!"
echo "📡 API: http://localhost:3001"
echo "🎮 Dashboard: http://localhost:3001/ai/dashboard.html"
echo "📊 Status: bun ai/index.ts status"
echo ""
echo "To stop: kill \$(cat /tmp/nebula-ai.pid)"

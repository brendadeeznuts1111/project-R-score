#!/bin/bash
echo "🛑 Stopping Nebula-Flow™ AI System..."

if [ -f "/tmp/nebula-ai.pid" ]; then
    PID=$(cat /tmp/nebula-ai.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        rm /tmp/nebula-ai.pid
        echo "✅ AI System stopped"
    else
        echo "⚠️ AI System not running"
    fi
else
    echo "⚠️ PID file not found"
fi

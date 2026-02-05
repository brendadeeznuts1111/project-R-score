#!/bin/bash
# OpenClaw Monitoring Stack Shutdown

echo "🛑 Stopping OpenClaw Monitoring Stack..."

if [ -f ~/.matrix/metrics-server.pid ]; then
    kill $(cat ~/.matrix/metrics-server.pid) 2>/dev/null
    rm ~/.matrix/metrics-server.pid
    echo "   ✅ Metrics server stopped"
fi

if [ -f ~/.matrix/alert-manager.pid ]; then
    kill $(cat ~/.matrix/alert-manager.pid) 2>/dev/null
    rm ~/.matrix/alert-manager.pid
    echo "   ✅ Alert manager stopped"
fi

echo ""
echo "Monitoring stack stopped."

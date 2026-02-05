#!/bin/bash
# OpenClaw Monitoring Stack Startup

echo "🚀 Starting OpenClaw Monitoring Stack..."
echo ""

# Create necessary directories
mkdir -p ~/.matrix/alerts
mkdir -p ~/.matrix/logs

# Start Prometheus Metrics Server
echo "📊 Starting Prometheus Metrics Server on :9090..."
bun run ~/monitoring/prometheus/metrics-server.ts &
METRICS_PID=$!
echo $METRICS_PID > ~/.matrix/metrics-server.pid

# Start Alert Manager
echo "🚨 Starting Alert Manager..."
bun run ~/monitoring/alerts/alert-manager.ts &
ALERT_PID=$!
echo $ALERT_PID > ~/.matrix/alert-manager.pid

# Open Dashboard
echo "🌐 Opening Dashboard..."
open ~/monitoring/dashboard/index.html 2>/dev/null || echo "   Dashboard: ~/monitoring/dashboard/index.html"

echo ""
echo "✅ Monitoring stack started!"
echo ""
echo "📊 Prometheus Metrics: http://localhost:9090/metrics"
echo "🔍 Health Check:       http://localhost:9090/health"
echo "📁 Dashboard:          ~/monitoring/dashboard/index.html"
echo "🚨 Alerts:             ~/.matrix/alerts/active.json"
echo ""
echo "To stop: ~/monitoring/stop-monitoring.sh"

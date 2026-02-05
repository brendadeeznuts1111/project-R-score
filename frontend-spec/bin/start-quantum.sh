#!/usr/bin/env bash
# start-quantum.sh - Complete system startup

echo "🚀 Starting Quantum Production System v2.0.0"
echo "==========================================="

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "Install from: https://bun.sh"
    exit 1
fi

# Check version
BUN_VERSION=$(bun --version)
echo "📦 Bun version: $BUN_VERSION"

# Create necessary directories
mkdir -p {dist,logs,data,builds,deployments,scripts}

# Load environment
if [ -f ".env" ]; then
    export $(cat .env | xargs)
    echo "📄 Loaded environment from .env"
fi

# Create terminal scripts
echo "📜 Creating terminal scripts..."
cat > scripts/financial-ticker.sh << 'EOF'
#!/bin/bash
while true; do
    clear
    echo "📈 Quantum Financial Ticker"
    echo "=========================="
    echo
    echo "AAPL: $((150 + RANDOM % 10)).$((RANDOM % 100)) $(echo -e "\e[32m↑1.2%\e[0m")"
    echo "GOOG: $((2800 + RANDOM % 50)).$((RANDOM % 100)) $(echo -e "\e[31m↓0.8%\e[0m")"
    echo "TSLA: $((250 + RANDOM % 20)).$((RANDOM % 100)) $(echo -e "\e[32m↑2.1%\e[0m")"
    echo "MSFT: $((350 + RANDOM % 15)).$((RANDOM % 100)) $(echo -e "\e[33m→0.0%\e[0m")"
    echo
    echo "Updated: $(date '+%H:%M:%S')"
    sleep 2
done
EOF

cat > scripts/system-monitor.sh << 'EOF'
#!/bin/bash
echo "🔧 System Monitor"
echo "================"
echo "CPU: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')%"
echo "Memory: $(ps -caxm -o rss,comm | awk '{sum+=$1} END {print sum/1024}')MB"
echo "Processes: $(ps aux | wc -l)"
echo "Uptime: $(uptime | awk '{print $3,$4}' | sed 's/,//')"
echo
echo "Top Processes:"
ps aux | sort -rk 3,3 | head -5 | awk '{printf "%-10s %s\n", $3"%", $11}'
EOF

cat > scripts/network-traffic.sh << 'EOF'
#!/bin/bash
echo "🌐 Network Traffic"
echo "=================="
echo "Connections: $(netstat -an | grep ESTABLISHED | wc -l | tr -d ' ')"
echo "Listening Ports: $(netstat -an | grep LISTEN | wc -l | tr -d ' ')"
echo
if command -v ss &> /dev/null; then
    echo "Top Connections:"
    ss -tupn 2>/dev/null | head -10 || echo "ss command not available"
else
    echo "Network info: $(ifconfig | grep -E "(inet|status)" | head -5)"
fi
EOF

chmod +x scripts/*.sh

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Quantum System..."
    
    # Kill all background processes
    if [ ! -z "$MONITOR_PID" ]; then
        kill $MONITOR_PID 2>/dev/null
    fi
    if [ ! -z "$MAIN_PID" ]; then
        kill $MAIN_PID 2>/dev/null
    fi
    if [ ! -z "$TERM_PID" ]; then
        kill $TERM_PID 2>/dev/null
    fi
    
    # Wait for processes to stop
    sleep 2
    
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start monitoring dashboard
echo "📊 Starting monitoring dashboard..."
bun run monitoring-dashboard.js &
MONITOR_PID=$!

# Start main system
echo "🚀 Starting quantum system..."
bun run quantum-production-system.js start &
MAIN_PID=$!

# Start terminal server if available
echo "🔌 Starting terminal services..."
bun run quantum-production-system.js terminal &
TERM_PID=$!

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Function to check service health
check_health() {
    local url=$1
    local service_name=$2
    
    if command -v curl &> /dev/null; then
        if curl -s "$url" | grep -q "healthy\|Quantum" 2>/dev/null; then
            echo "✅ $service_name is healthy"
            return 0
        else
            echo "❌ $service_name is not responding"
            return 1
        fi
    else
        echo "⚠️ Cannot check $service_name health (curl not available)"
        return 0
    fi
}

# Check health of services
echo ""
echo "🔍 Checking service health..."
HEALTHY=true

if ! check_health "http://localhost:3002/health" "Monitoring Dashboard"; then
    HEALTHY=false
fi

if ! check_health "http://localhost:3000" "Main Dashboard"; then
    HEALTHY=false
fi

if [ "$HEALTHY" = "false" ]; then
    echo ""
    echo "⚠️ Some services are not healthy, but continuing startup..."
    echo "   Check logs for details: tail -f logs/*.log"
fi

echo ""
echo "✅ Quantum Production System Started Successfully!"
echo ""
echo "🌐 Services:"
echo "  Dashboard:      http://localhost:3000"
echo "  Monitoring:     http://localhost:3002"
echo "  Terminal:       ws://localhost:3001"
echo ""
echo "📊 Monitoring Endpoints:"
echo "  Metrics:        http://localhost:3002/metrics"
echo "  Health:         http://localhost:3002/health"
echo "  Performance:    http://localhost:3002/performance"
echo ""
echo "🔧 Available Commands:"
echo "  bun run quantum-production-system.js build [profile]"
echo "  bun run quantum-production-system.js deploy [build-id]"
echo "  bun run quantum-production-system.js terminal"
echo "  bun run quantum-production-system.js metrics"
echo "  ./deploy.sh                              # Deploy to production"
echo ""
echo "📁 Directories:"
echo "  Builds:         ./dist/"
echo "  Logs:           ./logs/"
echo "  Deployments:    ./deployments/"
echo "  Scripts:        ./scripts/"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running and monitor services
while true; do
    sleep 30
    
    # Check if main processes are still running
    if ! kill -0 $MAIN_PID 2>/dev/null; then
        echo "❌ Main system process died, restarting..."
        bun run quantum-production-system.js start &
        MAIN_PID=$!
    fi
    
    if ! kill -0 $MONITOR_PID 2>/dev/null; then
        echo "❌ Monitoring process died, restarting..."
        bun run monitoring-dashboard.js &
        MONITOR_PID=$!
    fi
    
    if ! kill -0 $TERM_PID 2>/dev/null; then
        echo "❌ Terminal process died, restarting..."
        bun run quantum-production-system.js terminal &
        TERM_PID=$!
    fi
done

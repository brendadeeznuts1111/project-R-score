#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# FactoryWager Enhanced Monitoring Dashboard
# Quick access to all monitoring endpoints
# ═══════════════════════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 FactoryWager Enhanced Monitoring Dashboard${NC}"
echo "=================================================="
echo ""

# Function to check service status
check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ $name (offline)${NC}"
        return 1
    fi
}

# Check services
echo -e "${BLUE}Service Status:${NC}"
check_service "http://localhost:3002/status" "Enhanced Rollout (Port 3002)"
check_service "http://localhost:3003/status" "Simple Rollout (Port 3003)"
check_service "http://localhost:3003/health" "Health Check (Port 3003)"
echo ""

# Show endpoints
echo -e "${BLUE}Available Endpoints:${NC}"
echo "Enhanced Rollout:"
echo "  📊 Status:   http://localhost:3002/status"
echo "  📡 Events:   http://localhost:3002/events"
echo ""
echo "Simple Rollout:"
echo "  📊 Status:   http://localhost:3003/status"
echo "  📡 Events:   http://localhost:3003/events"
echo "  ❤️  Health:   http://localhost:3003/health"
echo ""

# Quick commands
echo -e "${BLUE}Quick Commands:${NC}"
echo "Watch Enhanced Rollout:"
echo "  watch -n 2 'curl -s http://localhost:3002/status | jq .'"
echo ""
echo "Watch Simple Rollout:"
echo "  watch -n 2 'curl -s http://localhost:3003/status | jq .'"
echo ""
echo "Stream SSE Events:"
echo "  curl -N http://localhost:3002/events"
echo "  curl -N http://localhost:3003/events"
echo ""

# Live monitoring option
if [ "$1" = "--live" ]; then
    echo -e "${YELLOW}🔴 Live Monitoring (Press Ctrl+C to stop)${NC}"
    echo "=================================================="
    
    while true; do
        timestamp=$(date '+%H:%M:%S')
        
        # Get metrics
        enhanced_status=$(curl -s http://localhost:3002/status 2>/dev/null || echo '{"health":0,"currentPhase":{"description":"Offline"}}')
        simple_status=$(curl -s http://localhost:3003/status 2>/dev/null || echo '{"health":0,"phase":"Offline"}')
        health_status=$(curl -s http://localhost:3003/health 2>/dev/null || echo '{"health":0}')
        
        # Extract values
        enhanced_health=$(echo "$enhanced_status" | jq -r '.health // 0' 2>/dev/null || echo "0")
        enhanced_phase=$(echo "$enhanced_status" | jq -r '.currentPhase.description // "Unknown"' 2>/dev/null || echo "Offline")
        simple_health=$(echo "$simple_status" | jq -r '.health // 0' 2>/dev/null || echo "0")
        simple_phase=$(echo "$simple_status" | jq -r '.phase // "Unknown"' 2>/dev/null || echo "Offline")
        system_health=$(echo "$health_status" | jq -r '.health // 0' 2>/dev/null || echo "0")
        
        # Display
        printf "\r${timestamp} | Enhanced: ${enhanced_health}% (${enhanced_phase}) | Simple: ${simple_health}% (${simple_phase}) | System: ${system_health}%"
        
        sleep 5
    done
fi

echo -e "${CYAN}Usage:${NC}"
echo "  $0              # Show dashboard"
echo "  $0 --live       # Start live monitoring"
echo ""

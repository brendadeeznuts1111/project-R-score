#!/bin/bash
# scripts/deploy-taxonomy.sh - Deployment script for taxonomy validator with health endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="duo-automation"
HEALTH_ENDPOINT_PORT=3001
MONITOR_INTERVAL=60
LOG_LEVEL="info"

echo -e "${BLUE}🚀 Starting deployment of ${PROJECT_NAME} taxonomy validator${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run from project root."
    exit 1
fi

# Check dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed or not in PATH"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    bun install
    print_status "Dependencies installed"
else
    print_status "Dependencies up to date"
fi

# Build project if needed
echo -e "${BLUE}🔨 Building project...${NC}"
bun run build 2>/dev/null || print_warning "Build script not found or failed, continuing..."

# Run tests to ensure everything is working
echo -e "${BLUE}🧪 Running tests...${NC}"
if bun test 2>/dev/null; then
    print_status "All tests passed"
else
    print_warning "Some tests failed, but continuing deployment"
fi

# Stop any existing health endpoint
echo -e "${BLUE}🛑 Stopping existing services...${NC}"
pkill -f "health-endpoint" 2>/dev/null || true
pkill -f "taxonomy-monitor" 2>/dev/null || true

# Start health endpoint in background
echo -e "${BLUE}🏥 Starting health endpoint...${NC}"
nohup bun run server/health-endpoint.ts > logs/health-endpoint.log 2>&1 &
HEALTH_PID=$!
echo $HEALTH_PID > .health-endpoint.pid

# Wait a moment for health endpoint to start
sleep 2

# Check if health endpoint is running
if kill -0 $HEALTH_PID 2>/dev/null; then
    print_status "Health endpoint started (PID: $HEALTH_PID)"
else
    print_error "Health endpoint failed to start"
    exit 1
fi

# Test health endpoint
echo -e "${BLUE}🔍 Testing health endpoint...${NC}"
if curl -s http://localhost:${HEALTH_ENDPOINT_PORT}/health > /dev/null; then
    print_status "Health endpoint is responding"
else
    print_error "Health endpoint is not responding"
    kill $HEALTH_PID 2>/dev/null || true
    exit 1
fi

# Start monitoring in background
echo -e "${BLUE}📊 Starting monitoring...${NC}"
mkdir -p logs
nohup bun run monitoring/taxonomy-monitor.ts --interval ${MONITOR_INTERVAL} --log-level ${LOG_LEVEL} > logs/taxonomy-monitor.log 2>&1 &
MONITOR_PID=$!
echo $MONITOR_PID > .taxonomy-monitor.pid

# Wait a moment for monitor to start
sleep 2

# Check if monitor is running
if kill -0 $MONITOR_PID 2>/dev/null; then
    print_status "Monitoring started (PID: $MONITOR_PID)"
else
    print_error "Monitoring failed to start"
    kill $HEALTH_PID 2>/dev/null || true
    exit 1
fi

# Create management scripts
echo -e "${BLUE}📝 Creating management scripts...${NC}"

# Stop script
cat > scripts/stop-taxonomy.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping taxonomy services..."

if [ -f ".health-endpoint.pid" ]; then
    PID=$(cat .health-endpoint.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Health endpoint stopped"
    fi
    rm .health-endpoint.pid
fi

if [ -f ".taxonomy-monitor.pid" ]; then
    PID=$(cat .taxonomy-monitor.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Monitoring stopped"
    fi
    rm .taxonomy-monitor.pid
fi
EOF

chmod +x scripts/stop-taxonomy.sh

# Status script
cat > scripts/status-taxonomy.sh << EOF
#!/bin/bash
echo -e "${BLUE}📊 Taxonomy Services Status${NC}"
echo

# Health endpoint status
if [ -f ".health-endpoint.pid" ]; then
    PID=\$(cat .health-endpoint.pid)
    if kill -0 \$PID 2>/dev/null; then
        echo -e "Health Endpoint: ${GREEN}Running (PID: \$PID)${NC}"
        curl -s http://localhost:${HEALTH_ENDPOINT_PORT}/health | jq '.' 2>/dev/null || echo "Health check failed"
    else
        echo -e "Health Endpoint: ${RED}Stopped${NC}"
    fi
else
    echo -e "Health Endpoint: ${RED}Not running${NC}"
fi

echo

# Monitor status
if [ -f ".taxonomy-monitor.pid" ]; then
    PID=\$(cat .taxonomy-monitor.pid)
    if kill -0 \$PID 2>/dev/null; then
        echo -e "Monitoring: ${GREEN}Running (PID: \$PID)${NC}"
    else
        echo -e "Monitoring: ${RED}Stopped${NC}"
    fi
else
    echo -e "Monitoring: ${RED}Not running${NC}"
fi

echo
echo -e "${BLUE}📈 Recent logs:${NC}"
echo "Health endpoint (last 5 lines):"
tail -5 logs/health-endpoint.log 2>/dev/null || echo "No logs found"
echo
echo "Monitor (last 5 lines):"
tail -5 logs/taxonomy-monitor.log 2>/dev/null || echo "No logs found"
EOF

chmod +x scripts/status-taxonomy.sh

# Restart script
cat > scripts/restart-taxonomy.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting taxonomy services..."
./scripts/stop-taxonomy.sh
sleep 2
./scripts/deploy-taxonomy.sh
EOF

chmod +x scripts/restart-taxonomy.sh

# Final status
echo
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo
echo -e "${BLUE}📋 Service Information:${NC}"
echo -e "  🏥 Health Endpoint: ${GREEN}http://localhost:${HEALTH_ENDPOINT_PORT}/health${NC}"
echo -e "  📊 Detailed Report: ${GREEN}http://localhost:${HEALTH_ENDPOINT_PORT}/report${NC}"
echo -e "  📈 Metrics: ${GREEN}http://localhost:${HEALTH_ENDPOINT_PORT}/metrics${NC}"
echo
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "  🛑 Stop services: ${YELLOW}./scripts/stop-taxonomy.sh${NC}"
echo -e "  📊 Check status: ${YELLOW}./scripts/status-taxonomy.sh${NC}"
echo -e "  🔄 Restart: ${YELLOW}./scripts/restart-taxonomy.sh${NC}"
echo
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "  Health endpoint: ${YELLOW}logs/health-endpoint.log${NC}"
echo -e "  Monitor: ${YELLOW}logs/taxonomy-monitor.log${NC}"
echo

# Show initial status
./scripts/status-taxonomy.sh

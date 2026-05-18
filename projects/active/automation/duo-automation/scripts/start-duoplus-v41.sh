#!/bin/bash
# DuoPlus Dashboard v4.1 - Multi-Protocol Deployment Script
# Bun.serve + URLPattern Fusion with Hot Reload

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BUN_PORT=${BUN_PORT:-8090}
NODE_PORT=${NODE_PORT:-3000}
ADMIN_PORT=${ADMIN_PORT:-8443}
UNIX_SOCKET="/tmp/duoplus.sock"
ABSTRACT_SOCKET="\\0duoplus-abstract-v4.1"

# Functions
print_header() {
    echo -e "${BLUE}🚀 DuoPlus Dashboard v4.1 - Multi-Protocol Deployment${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}🔗 Bun.serve + URLPattern Fusion | Hot Reload | Unix Sockets${NC}"
    echo ""
}

print_status() {
    local status=$1
    local message=$2

    case $status in
        "success")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "error")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  ${message}${NC}"
            ;;
        "running")
            echo -e "${PURPLE}🔄 ${message}${NC}"
            ;;
    esac
}

check_dependencies() {
    print_status "info" "Checking dependencies..."

    if ! command -v bun &> /dev/null; then
        print_status "error" "Bun is not installed. Please install Bun first."
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        print_status "warning" "Node.js not found - some services may be unavailable"
    fi

    print_status "success" "Dependencies check passed"
}

start_dashboard_server() {
    print_status "running" "Starting DuoPlus Dashboard Server v4.1..."

    # Check if already running
    if [ -f ".dashboard-server-v41.pid" ]; then
        local pid=$(cat .dashboard-server-v41.pid)
        if ps -p $pid > /dev/null 2>&1; then
            print_status "warning" "Dashboard server already running (PID: $pid)"
            return 0
        else
            rm -f .dashboard-server-v41.pid
        fi
    fi

    # Start with dynamic port configuration
    BUN_PORT=$BUN_PORT nohup bun run server/dashboard-server-v41.ts > .dashboard-server-v41.log 2>&1 &
    local pid=$!
    echo $pid > .dashboard-server-v41.pid

    # Wait for server to start
    sleep 3

    # Check if server started successfully
    if ps -p $pid > /dev/null 2>&1; then
        print_status "success" "Dashboard server started (PID: $pid)"
        print_status "info" "🌐 Dashboard: http://localhost:$BUN_PORT"
        print_status "info" "🏥 Health: http://localhost:$BUN_PORT/health"
        print_status "info" "📊 Metrics: http://localhost:$BUN_PORT/api/metrics"
    else
        print_status "error" "Failed to start dashboard server"
        if [ -f ".dashboard-server-v41.log" ]; then
            echo -e "${RED}Server log:${NC}"
            tail -10 .dashboard-server-v41.log
        fi
        exit 1
    fi
}

start_unix_socket() {
    print_status "running" "Starting Unix Socket server..."

    # Start Unix socket version
    bun --unix $UNIX_SOCKET server/dashboard-server-v41.ts > .unix-server.log 2>&1 &
    local unix_pid=$!
    echo $unix_pid > .unix-server.pid

    sleep 2

    if ps -p $unix_pid > /dev/null 2>&1; then
        print_status "success" "Unix socket server started (PID: $unix_pid)"
        print_status "info" "📡 Unix Socket: $UNIX_SOCKET"
    else
        print_status "warning" "Unix socket server failed to start"
    fi
}

start_abstract_socket() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_status "running" "Starting Abstract Namespace socket..."

        bun --unix "$ABSTRACT_SOCKET" server/dashboard-server-v41.ts > .abstract-server.log 2>&1 &
        local abstract_pid=$!
        echo $abstract_pid > .abstract-server.pid

        sleep 2

        if ps -p $abstract_pid > /dev/null 2>&1; then
            print_status "success" "Abstract socket server started (PID: $abstract_pid)"
            print_status "info" "📡 Abstract Socket: $ABSTRACT_SOCKET"
        else
            print_status "warning" "Abstract socket server failed to start"
        fi
    else
        print_status "warning" "Abstract sockets only available on Linux"
    fi
}

start_node_services() {
    if command -v node &> /dev/null; then
        print_status "running" "Starting Node.js services..."

        # Create a simple Node.js API server for demonstration
        cat > api-server-v41.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'Node.js API v4.1',
    port: process.env.NODE_PORT || 3000,
    message: 'Compatible with DuoPlus Dashboard v4.1',
    timestamp: new Date().toISOString()
  }));
});

const port = process.env.NODE_PORT || 3000;
server.listen(port, () => {
  console.log(`🔍 Node.js API server running on port ${port}`);
});
EOF

        NODE_PORT=$NODE_PORT node api-server-v41.js > .node-api.log 2>&1 &
        local node_pid=$!
        echo $node_pid > .node-api.pid

        sleep 2

        if ps -p $node_pid > /dev/null 2>&1; then
            print_status "success" "Node.js API server started (PID: $node_pid)"
            print_status "info" "🔍 Node API: http://localhost:$NODE_PORT"
        else
            print_status "warning" "Node.js API server failed to start"
        fi
    fi
}

start_admin_https() {
    print_status "running" "Starting Admin HTTPS service..."

    # Create a simple HTTPS admin server
    cat > admin-server-v41.js << 'EOF'
const https = require('https');
const fs = require('fs');

// Self-signed certificate for demonstration
const options = {
  key: fs.readFileSync('server-key.pem', 'utf8'),
  cert: fs.readFileSync('server-cert.pem', 'utf8')
};

const server = https.createServer(options, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'Admin HTTPS v4.1',
    port: process.env.ADMIN_PORT || 8443,
    secure: true,
    message: 'Admin dashboard with mTLS support',
    timestamp: new Date().toISOString()
  }));
});

const port = process.env.ADMIN_PORT || 8443;
server.listen(port, () => {
  console.log(`🛡️ Admin HTTPS server running on port ${port}`);
});
EOF

    # Generate self-signed certificate if not exists
    if [ ! -f "server-key.pem" ]; then
        print_status "info" "Generating self-signed certificate..."
        openssl req -x509 -newkey rsa:4096 -keyout server-key.pem -out server-cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null || {
            print_status "warning" "OpenSSL not available - skipping HTTPS admin server"
            return
        }
    fi

    ADMIN_PORT=$ADMIN_PORT node admin-server-v41.js > .admin-https.log 2>&1 &
    local admin_pid=$!
    echo $admin_pid > .admin-https.pid

    sleep 2

    if ps -p $admin_pid > /dev/null 2>&1; then
        print_status "success" "Admin HTTPS server started (PID: $admin_pid)"
        print_status "info" "🛡️ Admin HTTPS: https://localhost:$ADMIN_PORT"
    else
        print_status "warning" "Admin HTTPS server failed to start"
    fi
}

health_check() {
    print_status "info" "Performing health check..."

    # Check main dashboard
    if command -v curl &> /dev/null; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BUN_PORT/health" 2>/dev/null)

        if [ "$response" = "200" ]; then
            print_status "success" "Main dashboard is healthy"
            curl -s "http://localhost:$BUN_PORT/health" | head -3
        else
            print_status "error" "Main dashboard health check failed (HTTP $response)"
        fi

        # Check Node.js API if available
        if [ -f ".node-api.pid" ]; then
            local node_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$NODE_PORT" 2>/dev/null)
            if [ "$node_response" = "200" ]; then
                print_status "success" "Node.js API is healthy"
            fi
        fi
    else
        print_status "warning" "curl not available for health check"
    fi
}

stop_services() {
    print_status "running" "Stopping all services..."

    # Stop dashboard server
    if [ -f ".dashboard-server-v41.pid" ]; then
        local pid=$(cat .dashboard-server-v41.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            sleep 1
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid
            fi
            print_status "success" "Dashboard server stopped"
        fi
        rm -f .dashboard-server-v41.pid
    fi

    # Stop Unix socket server
    if [ -f ".unix-server.pid" ]; then
        local pid=$(cat .unix-server.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
            print_status "success" "Unix socket server stopped"
        fi
        rm -f .unix-server.pid
    fi

    # Stop abstract socket server
    if [ -f ".abstract-server.pid" ]; then
        local pid=$(cat .abstract-server.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
            print_status "success" "Abstract socket server stopped"
        fi
        rm -f .abstract-server.pid
    fi

    # Stop Node.js services
    if [ -f ".node-api.pid" ]; then
        local pid=$(cat .node-api.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
            print_status "success" "Node.js API server stopped"
        fi
        rm -f .node-api.pid
    fi

    # Stop admin HTTPS
    if [ -f ".admin-https.pid" ]; then
        local pid=$(cat .admin-https.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
            print_status "success" "Admin HTTPS server stopped"
        fi
        rm -f .admin-https.pid
    fi

    # Clean up Unix socket
    [ -S "$UNIX_SOCKET" ] && rm -f "$UNIX_SOCKET"

    print_status "success" "All services stopped"
}

show_status() {
    print_status "info" "Checking service status..."

    echo ""
    echo -e "${CYAN}📊 Service Status Dashboard:${NC}"
    echo "───────────────────────────────────────────────────"

    # Dashboard server
    if [ -f ".dashboard-server-v41.pid" ]; then
        local pid=$(cat .dashboard-server-v41.pid)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "🖥️  Dashboard Server: ${GREEN}Running${NC} (PID: $pid, Port: $BUN_PORT)"
        else
            echo -e "🖥️  Dashboard Server: ${RED}Stopped${NC}"
        fi
    else
        echo -e "🖥️  Dashboard Server: ${RED}Not Running${NC}"
    fi

    # Unix socket
    if [ -S "$UNIX_SOCKET" ]; then
        echo -e "📡 Unix Socket: ${GREEN}Active${NC} ($UNIX_SOCKET)"
    else
        echo -e "📡 Unix Socket: ${RED}Inactive${NC}"
    fi

    # Node.js API
    if [ -f ".node-api.pid" ]; then
        local pid=$(cat .node-api.pid)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "🔍 Node.js API: ${GREEN}Running${NC} (PID: $pid, Port: $NODE_PORT)"
        else
            echo -e "🔍 Node.js API: ${RED}Stopped${NC}"
        fi
    else
        echo -e "🔍 Node.js API: ${RED}Not Running${NC}"
    fi

    # Admin HTTPS
    if [ -f ".admin-https.pid" ]; then
        local pid=$(cat .admin-https.pid)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "🛡️  Admin HTTPS: ${GREEN}Running${NC} (PID: $pid, Port: $ADMIN_PORT)"
        else
            echo -e "🛡️  Admin HTTPS: ${RED}Stopped${NC}"
        fi
    else
        echo -e "🛡️  Admin HTTPS: ${RED}Not Running${NC}"
    fi

    echo ""
}

show_port_config() {
    echo ""
    echo -e "${CYAN}🔢 Port Configuration Matrix:${NC}"
    echo "───────────────────────────────────────────────────"
    echo "Config Method    Priority    Example            Dashboard    Node"
    echo "───────────────────────────────────────────────────"
    echo "--port CLI       1           bun --port=8080    bunport=8080  N/A"
    echo "BUN_PORT         2           BUN_PORT=8090      ✅ 8090      N/A"
    echo "PORT             3           PORT=3000          3000         ✅ 3000"
    echo "NODE_PORT        4           NODE_PORT=8080     8080         ✅ 8080"
    echo "port: 0          Random      port: 0            49152        N/A"
    echo "Default          3000        None               ✅ 8090      3000"
    echo ""
    echo -e "${BLUE}Current Configuration:${NC}"
    echo "• BUN_PORT: $BUN_PORT"
    echo "• NODE_PORT: $NODE_PORT"
    echo "• ADMIN_PORT: $ADMIN_PORT"
    echo "• Unix Socket: $UNIX_SOCKET"
    echo "• Abstract Socket: $ABSTRACT_SOCKET"
    echo ""
}

test_urlpatterns() {
    print_status "info" "Testing URLPattern routing..."

    if command -v curl &> /dev/null; then
        echo ""
        echo -e "${CYAN}🔗 URLPattern Test Results:${NC}"
        echo "───────────────────────────────────────────────────"

        # Test health endpoint
        echo "Testing /health:"
        curl -s "http://localhost:$BUN_PORT/health" | head -2
        echo ""

        # Test API version pattern
        echo "Testing /api/v4.1/status:"
        curl -s "http://localhost:$BUN_PORT/api/v4.1/status" | head -2
        echo ""

        # Test dashboard pattern
        echo "Testing /dist/venmo/production/index.html:"
        curl -s "http://localhost:$BUN_PORT/dist/venmo/production/index.html" | head -2
        echo ""

        # Test admin pattern
        echo "Testing /admin/user-123:"
        curl -s "http://localhost:$BUN_PORT/admin/user-123" | head -2
        echo ""

        print_status "success" "URLPattern routing tests completed"
    else
        print_status "warning" "curl not available for URLPattern testing"
    fi
}

show_help() {
    echo -e "${CYAN}DuoPlus Dashboard v4.1 - Multi-Protocol Deployment${NC}"
    echo -e "${CYAN}Usage: $0 [command] [options]${NC}"
    echo ""
    echo "Commands:"
    echo "  start           Start complete stack (recommended)"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  status          Show service status"
    echo "  health          Perform health check"
    echo "  ports           Show port configuration"
    echo "  test            Test URLPattern routing"
    echo "  dashboard       Start only dashboard server"
    echo "  unix            Start only Unix socket server"
    echo "  node            Start only Node.js services"
    echo "  admin           Start only admin HTTPS server"
    echo "  help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BUN_PORT        Dashboard server port (default: 8090)"
    echo "  NODE_PORT       Node.js API port (default: 3000)"
    echo "  ADMIN_PORT      Admin HTTPS port (default: 8443)"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start complete stack"
    echo "  BUN_PORT=8080 $0 start       # Custom dashboard port"
    echo "  $0 test                     # Test URLPattern routing"
    echo "  $0 ports                    # Show port configuration"
    echo ""
    echo "Access URLs:"
    echo "  Dashboard:   http://localhost:\${BUN_PORT:-8090}"
    echo "  Node API:    http://localhost:\${NODE_PORT:-3000}"
    echo "  Admin HTTPS: https://localhost:\${ADMIN_PORT:-8443}"
    echo "  Unix Socket: $UNIX_SOCKET"
}

# Main execution
main() {
    print_header

    case "${1:-help}" in
        "start")
            check_dependencies
            start_dashboard_server
            start_unix_socket
            start_abstract_socket
            start_node_services
            start_admin_https
            sleep 2
            health_check
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            main start
            ;;
        "status")
            show_status
            ;;
        "health")
            health_check
            ;;
        "ports")
            show_port_config
            ;;
        "test")
            test_urlpatterns
            ;;
        "dashboard")
            check_dependencies
            start_dashboard_server
            health_check
            ;;
        "unix")
            check_dependencies
            start_unix_socket
            ;;
        "node")
            start_node_services
            ;;
        "admin")
            start_admin_https
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"

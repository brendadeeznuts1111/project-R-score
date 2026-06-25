#!/bin/bash
# DuoPlus Dashboard v3.8 - Quick Launch Script
# Enhanced Matrix System with Command Palette Integration

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
PORT=8090
SERVER_FILE="server/dashboard-server-v38.ts"
PID_FILE=".dashboard-server.pid"

# Functions
print_header() {
    echo -e "${BLUE}🚀 DuoPlus Dashboard v3.8 - Enhanced Matrix System${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
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

    if [ ! -f "$SERVER_FILE" ]; then
        print_status "error" "Dashboard server file not found: $SERVER_FILE"
        exit 1
    fi

    print_status "success" "Dependencies check passed"
}

start_server() {
    print_status "running" "Starting DuoPlus Dashboard Server v3.8..."

    # Check if server is already running
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "warning" "Server is already running (PID: $pid)"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi

    # Start the server in background
    nohup bun run "$SERVER_FILE" > .dashboard-server.log 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"

    # Wait a moment for server to start
    sleep 2

    # Check if server started successfully
    if ps -p $pid > /dev/null 2>&1; then
        print_status "success" "Server started successfully (PID: $pid)"
        print_status "info" "Dashboard URL: http://localhost:$PORT"
        print_status "info" "API Metrics: http://localhost:$PORT/api/metrics"
        print_status "info" "Health Check: http://localhost:$PORT/api/health"
    else
        print_status "error" "Failed to start server"
        if [ -f ".dashboard-server.log" ]; then
            echo -e "${RED}Server log:${NC}"
            cat .dashboard-server.log
        fi
        exit 1
    fi
}

stop_server() {
    print_status "running" "Stopping DuoPlus Dashboard Server..."

    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            sleep 1

            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid
            fi

            rm -f "$PID_FILE"
            print_status "success" "Server stopped successfully"
        else
            print_status "warning" "Server was not running"
            rm -f "$PID_FILE"
        fi
    else
        print_status "warning" "PID file not found. Server may not be running."
    fi
}

restart_server() {
    stop_server
    sleep 1
    start_server
}

show_status() {
    print_status "info" "Checking server status..."

    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "success" "Server is running (PID: $pid)"

            # Try to get metrics from server
            if command -v curl &> /dev/null; then
                echo -e "\n${CYAN}📊 Server Metrics:${NC}"
                curl -s "http://localhost:$PORT/api/metrics" | head -10 || echo "Metrics unavailable"
            fi
        else
            print_status "error" "Server is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        print_status "error" "Server is not running"
    fi
}

show_logs() {
    if [ -f ".dashboard-server.log" ]; then
        echo -e "${CYAN}📋 Server Logs:${NC}"
        tail -f .dashboard-server.log
    else
        print_status "warning" "No log file found"
    fi
}

setup_aliases() {
    print_status "info" "Setting up command aliases..."

    # Create alias file
    cat > ~/.duoplus_aliases << 'EOF'
# DuoPlus Dashboard v3.8 - Command Palette Aliases
# Add this to your ~/.bashrc or ~/.zshrc

# Core Dashboards
alias venmo="open http://localhost:8090/dist/venmo-family-webui-demo/index.html"
alias unified="open http://localhost:8090/dist/unified-dashboard-demo/index.html"
alias status="open http://localhost:8090/src/dashboard/status-dashboard-ui.html"
alias analytics="open http://localhost:8090/demos/analytics/analytics-dashboard.html"

# Admin Access
alias admin="open http://localhost:8090/src/dashboard/admin-dashboard.html"
alias creds="open http://localhost:8090/src/dashboard/credential-dashboard.html"
alias database="open http://localhost:8090/src/dashboard/database-management.html"
alias buckets="open http://localhost:8090/src/dashboard/bucket-management.html"

# External Services
alias status-api="curl https://empire-pro-status.workers.dev/"
alias r2-check="curl https://empire-pro-r2.workers.dev/"

# Utility Commands
alias duoplus-start="cd $(pwd) && ./scripts/dashboard-v38.sh start"
alias duoplus-stop="cd $(pwd) && ./scripts/dashboard-v38.sh stop"
alias duoplus-restart="cd $(pwd) && ./scripts/dashboard-v38.sh restart"
alias duoplus-status="cd $(pwd) && ./scripts/dashboard-v38.sh status"
alias duoplus-logs="cd $(pwd) && ./scripts/dashboard-v38.sh logs"
alias duoplus-health="curl http://localhost:8090/api/health"
EOF

    print_status "success" "Aliases created in ~/.duoplus_aliases"
    print_status "info" "Add 'source ~/.duoplus_aliases' to your shell config to use them"
}

show_help() {
    echo -e "${CYAN}DuoPlus Dashboard v3.8 - Enhanced Matrix System${NC}"
    echo -e "${CYAN}Usage: $0 [command]${NC}"
    echo ""
    echo "Commands:"
    echo "  start     Start the dashboard server"
    echo "  stop      Stop the dashboard server"
    echo "  restart   Restart the dashboard server"
    echo "  status    Show server status and metrics"
    echo "  logs      Show server logs (tail -f)"
    echo "  aliases   Setup command palette aliases"
    echo "  health    Quick health check"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start the server"
    echo "  $0 status                   # Check status"
    echo "  $0 logs                     # View logs"
    echo "  $0 aliases                  # Setup aliases"
    echo ""
    echo "Quick Access URLs:"
    echo "  Dashboard:   http://localhost:$PORT"
    echo "  Metrics:     http://localhost:$PORT/api/metrics"
    echo "  Health:      http://localhost:$PORT/api/health"
    echo "  Commands:    http://localhost:$PORT/api/commands"
    echo "  QR Code:     http://localhost:$PORT/api/qr"
}

quick_health() {
    print_status "info" "Performing quick health check..."

    if command -v curl &> /dev/null; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" 2>/dev/null)

        if [ "$response" = "200" ]; then
            print_status "success" "Server is healthy and responding"
            curl -s "http://localhost:$PORT/api/health" | head -5
        else
            print_status "error" "Server health check failed (HTTP $response)"
        fi
    else
        print_status "warning" "curl not available for health check"
    fi
}

# Main execution
main() {
    print_header

    case "${1:-help}" in
        "start")
            check_dependencies
            start_server
            ;;
        "stop")
            stop_server
            ;;
        "restart")
            check_dependencies
            restart_server
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "aliases")
            setup_aliases
            ;;
        "health")
            quick_health
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"

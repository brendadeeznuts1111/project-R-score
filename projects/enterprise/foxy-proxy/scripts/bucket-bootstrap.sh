#!/bin/bash

# Enhanced Bucket Visualization Bootstrap Script
# This script sets up and starts the bucket visualization system with continuous monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/packages/dashboard"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/.bucket-server.pid"

# Create necessary directories
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check if running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Stop the server
stop_server() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        log "Stopping bucket visualization server (PID: $pid)..."
        kill "$pid"
        
        # Wait for graceful shutdown
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            warn "Force killing server..."
            kill -9 "$pid"
        fi
        
        rm -f "$PID_FILE"
        log "Server stopped successfully"
    else
        log "Server is not running"
    fi
}

# Start the server
start_server() {
    if is_running; then
        warn "Server is already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    log "Starting enhanced bucket visualization server..."
    
    # Change to dashboard directory
    cd "$DASHBOARD_DIR"
    
    # Check environment
    if [ ! -f ".env" ]; then
        warn "No .env file found, creating from template..."
        cp "$PROJECT_ROOT/.env.example" "$DASHBOARD_DIR/.env" || {
            error "Failed to create .env file"
            exit 1
        }
        warn "Please edit .env file with your R2 configuration before restarting"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ ! -f "bun.lockb" ]; then
        log "Installing dependencies..."
        bun install || {
            error "Failed to install dependencies"
            exit 1
        }
    fi
    
    # Start the development server in background
    nohup bun run dev > "$LOG_DIR/bucket-server.log" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    # Wait a moment to check if server started successfully
    sleep 3
    
    if ps -p "$pid" > /dev/null 2>&1; then
        log "Server started successfully (PID: $pid)"
        log "Access the bucket visualization at: http://localhost:5173"
        log "Logs are available at: $LOG_DIR/bucket-server.log"
        
        # Show health check
        log "Performing health check..."
        sleep 2
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            log "✅ Server is responding to requests"
        else
            warn "⚠️  Server started but not responding yet (may still be loading)"
        fi
    else
        error "Failed to start server"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Show status
show_status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        log "✅ Server is running (PID: $pid)"
        log "🌐 Access at: http://localhost:5173"
        log "📋 Logs at: $LOG_DIR/bucket-server.log"
        
        # Show resource usage
        if command -v ps > /dev/null; then
            echo -e "${BLUE}Resource usage:${NC}"
            ps -p "$pid" -o pid,pcpu,pmem,etime,cmd --no-headers || echo "Unable to get process info"
        fi
    else
        log "❌ Server is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_DIR/bucket-server.log" ]; then
        log "Showing last 50 lines of server logs:"
        echo -e "${BLUE}$(tail -50 "$LOG_DIR/bucket-server.log")${NC}"
    else
        warn "No log file found"
    fi
}

# Restart server
restart_server() {
    log "Restarting server..."
    stop_server
    sleep 2
    start_server
}

# Setup environment
setup_environment() {
    log "Setting up enhanced bucket visualization environment..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Install dependencies
    log "Installing root dependencies..."
    bun install || {
        error "Failed to install root dependencies"
        exit 1
    }
    
    # Install dashboard dependencies
    log "Installing dashboard dependencies..."
    cd "$DASHBOARD_DIR"
    bun install || {
        error "Failed to install dashboard dependencies"
        exit 1
    }
    
    # Setup environment file
    if [ ! -f ".env" ]; then
        log "Creating environment file..."
        cp "$PROJECT_ROOT/.env.example" "$DASHBOARD_DIR/.env" || {
            error "Failed to create .env file"
            exit 1
        }
        
        echo -e "${YELLOW}⚠️  IMPORTANT: Please edit $DASHBOARD_DIR/.env with your R2 configuration:${NC}"
        echo -e "${BLUE}Required variables:${NC}"
        echo "  - VITE_R2_ACCOUNT_ID: Your Cloudflare R2 account ID"
        echo "  - VITE_R2_ACCESS_KEY_ID: Your R2 access key ID"
        echo "  - VITE_R2_SECRET_ACCESS_KEY: Your R2 secret access key"
        echo "  - VITE_R2_BUCKET_NAME: Your R2 bucket name"
        echo "  - VITE_R2_PUBLIC_URL: Your R2 public URL"
        echo ""
        echo -e "${GREEN}After configuring, run: $0 start${NC}"
    else
        log "Environment file already exists"
    fi
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Build project to verify setup
    log "Verifying build..."
    bun run build || {
        error "Build verification failed"
        exit 1
    }
    
    log "✅ Environment setup complete!"
}

# Show help
show_help() {
    echo -e "${BLUE}Enhanced Bucket Visualization Bootstrap Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  setup     - Set up the environment and install dependencies"
    echo "  start     - Start the bucket visualization server"
    echo "  stop      - Stop the running server"
    echo "  restart   - Restart the server"
    echo "  status    - Show server status and information"
    echo "  logs      - Show recent server logs"
    echo "  help      - Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 setup    # Initial setup"
    echo "  $0 start    # Start the server"
    echo "  $0 status   # Check if running"
    echo "  $0 stop     # Stop the server"
}

# Main script logic
case "${1:-help}" in
    "setup")
        setup_environment
        ;;
    "start")
        start_server
        ;;
    "stop")
        stop_server
        ;;
    "restart")
        restart_server
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_help
        ;;
esac
